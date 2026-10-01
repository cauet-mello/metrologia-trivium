ALTER TABLE public.registros ADD COLUMN atraso boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.registros.atraso IS 'Indica que o ferrolho foi inserido fora do horario de medicao (atraso).';