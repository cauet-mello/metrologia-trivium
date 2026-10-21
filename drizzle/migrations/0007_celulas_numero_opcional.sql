ALTER TABLE public.celulas ADD COLUMN IF NOT EXISTS numero_informado boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.celulas.numero_informado IS 'False para células cadastradas somente pelo nome; numero permanece uma referência interna, não um número de exibição.';
CREATE OR REPLACE FUNCTION public.atribuir_referencia_celula() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT NEW.numero_informado THEN
  IF nullif(trim(NEW.nome), '') IS NULL THEN RAISE EXCEPTION 'Informe o nome da célula quando não houver número.'; END IF;
  IF TG_OP = 'INSERT' THEN
   PERFORM pg_advisory_xact_lock(473852);
   SELECT LEAST(COALESCE(MIN(numero), 0), 0) - 1 INTO NEW.numero FROM public.celulas;
  ELSE
   NEW.numero := OLD.numero;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER celulas_referencia_interna BEFORE INSERT OR UPDATE ON public.celulas FOR EACH ROW EXECUTE FUNCTION public.atribuir_referencia_celula();