CREATE TABLE public.inspetores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.inspetores TO service_role;
ALTER TABLE public.inspetores ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.alteracoes (
  id bigserial PRIMARY KEY,
  registro_id bigint,
  inspetor text NOT NULL,
  perfil text NOT NULL DEFAULT 'Inspetor',
  tipo text NOT NULL,
  anterior text,
  novo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.alteracoes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.alteracoes_id_seq TO service_role;
ALTER TABLE public.alteracoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.status_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.operacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.escala_horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala text NOT NULL,
  turno text NOT NULL,
  inicio time NOT NULL,
  fim time NOT NULL,
  celulas integer[] NOT NULL DEFAULT '{}'
);
CREATE TABLE public.configuracoes (
  chave text PRIMARY KEY,
  valor text
);

GRANT SELECT ON public.status_opcoes, public.operacoes, public.turnos, public.escala_horarios, public.configuracoes TO anon, authenticated;
GRANT ALL ON public.status_opcoes, public.operacoes, public.turnos, public.escala_horarios, public.configuracoes TO service_role;
ALTER TABLE public.status_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status visiveis" ON public.status_opcoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Operacoes visiveis" ON public.operacoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Turnos visiveis" ON public.turnos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Escalas visiveis" ON public.escala_horarios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Config visivel" ON public.configuracoes FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.marcar_atraso_automatico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  esc text;
  tm int;
  achou boolean;
  tem_celula boolean;
BEGIN
  SELECT valor INTO esc FROM public.configuracoes WHERE chave = 'escala_ativa';
  IF esc IS NULL OR esc = '' THEN RETURN NEW; END IF;
  SELECT EXISTS (SELECT 1 FROM public.escala_horarios WHERE escala = esc AND NEW.celula = ANY(celulas)) INTO tem_celula;
  IF NOT tem_celula THEN RETURN NEW; END IF;
  tm := extract(hour FROM (NEW.hora_entrada AT TIME ZONE 'America/Sao_Paulo'))::int * 60
      + extract(minute FROM (NEW.hora_entrada AT TIME ZONE 'America/Sao_Paulo'))::int;
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT (extract(hour FROM inicio)::int * 60 + extract(minute FROM inicio)::int - 10 + 1440) % 1440 AS s,
             (((extract(hour FROM fim)::int * 60 + extract(minute FROM fim)::int)
               - (extract(hour FROM inicio)::int * 60 + extract(minute FROM inicio)::int) + 1440) % 1440) + 20 AS dur
      FROM public.escala_horarios
      WHERE escala = esc AND NEW.celula = ANY(celulas)
    ) j
    WHERE ((tm - j.s + 1440) % 1440) <= j.dur
  ) INTO achou;
  IF NOT achou THEN NEW.atraso := true; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER registros_atraso_automatico
BEFORE INSERT ON public.registros
FOR EACH ROW EXECUTE FUNCTION public.marcar_atraso_automatico();