CREATE TABLE public.operadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.operadores TO anon, authenticated;
GRANT ALL ON public.operadores TO service_role;
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operadores visiveis para todos" ON public.operadores FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo integer NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.modelos TO anon, authenticated;
GRANT ALL ON public.modelos TO service_role;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modelos visiveis para todos" ON public.modelos FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.celulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.celulas TO anon, authenticated;
GRANT ALL ON public.celulas TO service_role;
ALTER TABLE public.celulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Celulas visiveis para todos" ON public.celulas FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.registros (
  id bigserial PRIMARY KEY,
  modelo text NOT NULL,
  modelo_codigo integer,
  turno text NOT NULL,
  operacao text NOT NULL,
  celula integer NOT NULL,
  operador text NOT NULL,
  status text NOT NULL,
  hora_entrada timestamptz NOT NULL DEFAULT now(),
  hora_saida timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.registros TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.registros_id_seq TO anon, authenticated;
GRANT ALL ON public.registros TO service_role;
GRANT ALL ON SEQUENCE public.registros_id_seq TO service_role;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registros visiveis para todos" ON public.registros FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Qualquer um pode lancar registro" ON public.registros FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX registros_hora_saida_idx ON public.registros (hora_saida);
CREATE INDEX registros_hora_entrada_idx ON public.registros (hora_entrada DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.registros;