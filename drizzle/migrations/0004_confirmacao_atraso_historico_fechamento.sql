ALTER TABLE public.registros ADD COLUMN atraso_confirmado boolean NOT NULL DEFAULT false;
ALTER TABLE public.registros ADD COLUMN atraso_confirmado_em timestamptz;
ALTER TABLE public.alteracoes ADD COLUMN observacoes text;
ALTER TABLE public.alteracoes ADD COLUMN status_anterior text;
ALTER TABLE public.alteracoes ADD COLUMN status_novo text;

CREATE OR REPLACE FUNCTION public.lancamento_em_atraso(p_celula integer, p_hora timestamptz DEFAULT now()) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH escala AS (SELECT valor FROM public.configuracoes WHERE chave = 'escala_ativa'), janelas AS (
 SELECT (extract(hour FROM inicio)::int * 60 + extract(minute FROM inicio)::int - 10 + 1440) % 1440 AS inicio_min,
 ((extract(hour FROM fim)::int * 60 + extract(minute FROM fim)::int - extract(hour FROM inicio)::int * 60 - extract(minute FROM inicio)::int + 1440) % 1440) + 20 AS duracao
 FROM public.escala_horarios WHERE escala = (SELECT valor FROM escala) AND p_celula = ANY(celulas)
), horario AS (SELECT extract(hour FROM (p_hora AT TIME ZONE 'America/Sao_Paulo'))::int * 60 + extract(minute FROM (p_hora AT TIME ZONE 'America/Sao_Paulo'))::int AS minuto)
SELECT EXISTS (SELECT 1 FROM janelas) AND NOT EXISTS (SELECT 1 FROM janelas, horario WHERE ((minuto - inicio_min + 1440) % 1440) <= duracao);
$$;
REVOKE ALL ON FUNCTION public.lancamento_em_atraso(integer,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lancamento_em_atraso(integer,timestamptz) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.marcar_atraso_automatico() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.hora_entrada := clock_timestamp();
 IF public.lancamento_em_atraso(NEW.celula, NEW.hora_entrada) THEN
  IF NOT NEW.atraso_confirmado THEN RAISE EXCEPTION 'Confirme o lançamento fora do horário de medição.'; END IF;
  NEW.atraso := true;
  NEW.atraso_confirmado_em := NEW.hora_entrada;
 ELSE
  NEW.atraso_confirmado := false;
  NEW.atraso_confirmado_em := NULL;
 END IF;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auditar_confirmacao_atraso() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.atraso_confirmado THEN
 INSERT INTO public.alteracoes (registro_id, inspetor, perfil, tipo, anterior, novo, created_at, status_novo)
 VALUES (NEW.id, NEW.operador, 'Operador', 'Lançamento em atraso confirmado', NULL, 'Lançamento fora do horário confirmado pelo operador', NEW.atraso_confirmado_em, 'Em aberto · ' || NEW.status);
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER registros_auditar_atraso AFTER INSERT ON public.registros FOR EACH ROW EXECUTE FUNCTION public.auditar_confirmacao_atraso();

CREATE OR REPLACE FUNCTION public.lancar_ferrolho(p_dados jsonb, p_confirmado boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo_id bigint; cel integer;
BEGIN
 cel := (p_dados->>'celula')::integer;
 IF NOT EXISTS (SELECT 1 FROM public.celulas WHERE numero = cel AND ativo) OR
 NOT EXISTS (SELECT 1 FROM public.operadores WHERE nome = p_dados->>'operador' AND ativo) OR
 NOT EXISTS (SELECT 1 FROM public.modelos WHERE nome = p_dados->>'modelo' AND codigo = (p_dados->>'modelo_codigo')::integer AND ativo) OR
 NOT EXISTS (SELECT 1 FROM public.turnos WHERE nome = p_dados->>'turno') OR
 NOT EXISTS (SELECT 1 FROM public.status_opcoes WHERE nome = p_dados->>'status') OR
 coalesce(p_dados->>'operacao','') = '' OR
 EXISTS (SELECT 1 FROM unnest(string_to_array(p_dados->>'operacao',' / ')) op WHERE NOT EXISTS (SELECT 1 FROM public.operacoes WHERE nome = op))
 THEN RAISE EXCEPTION 'Dados inválidos. Revise os campos selecionados.'; END IF;
 IF public.lancamento_em_atraso(cel, clock_timestamp()) AND NOT p_confirmado THEN RETURN jsonb_build_object('confirmacaoNecessaria', true); END IF;
 INSERT INTO public.registros(modelo,modelo_codigo,turno,operacao,celula,operador,status,atraso_confirmado)
 VALUES(p_dados->>'modelo',(p_dados->>'modelo_codigo')::integer,p_dados->>'turno',p_dados->>'operacao',cel,p_dados->>'operador',p_dados->>'status',p_confirmado) RETURNING id INTO novo_id;
 RETURN jsonb_build_object('confirmacaoNecessaria', false, 'id', novo_id);
END;
$$;
REVOKE ALL ON FUNCTION public.lancar_ferrolho(jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lancar_ferrolho(jsonb,boolean) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fechar_ferrolho(p_id bigint, p_inspetor text, p_observacoes text DEFAULT '', p_atraso boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE reg public.registros%ROWTYPE; fechamento timestamptz := clock_timestamp(); obs text := nullif(trim(p_observacoes),'');
BEGIN
 SELECT * INTO reg FROM public.registros WHERE id = p_id FOR UPDATE;
 IF NOT FOUND OR reg.hora_saida IS NOT NULL THEN RAISE EXCEPTION 'Registro não encontrado ou já fechado. Atualize a lista.'; END IF;
 UPDATE public.registros SET hora_saida = fechamento, observacoes = obs, atraso = reg.atraso OR p_atraso WHERE id = p_id;
 INSERT INTO public.alteracoes(registro_id,inspetor,perfil,tipo,anterior,novo,created_at,observacoes,status_anterior,status_novo)
 VALUES(p_id,p_inspetor,'Inspetor','Fechamento',NULL,CASE WHEN p_atraso THEN 'Atraso manual' ELSE NULL END,fechamento,obs,'Em aberto · ' || reg.status,'Fechado · ' || reg.status);
END;
$$;
REVOKE ALL ON FUNCTION public.fechar_ferrolho(bigint,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_ferrolho(bigint,text,text,boolean) TO service_role;

UPDATE public.alteracoes a SET observacoes = r.observacoes FROM public.registros r WHERE a.tipo = 'Fechamento' AND a.registro_id = r.id AND r.hora_saida IS NOT NULL AND r.observacoes IS NOT NULL;
COMMENT ON COLUMN public.alteracoes.observacoes IS 'Observação preservada no momento do fechamento; históricos anteriores recuperados do registro original quando disponíveis.';