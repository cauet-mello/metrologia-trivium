ALTER TABLE public.registros ADD COLUMN fila text;
COMMENT ON COLUMN public.registros.fila IS 'Fila escolhida manualmente pelo inspetor (Zeiss 1/Zeiss 2); null = automatica pelo status';