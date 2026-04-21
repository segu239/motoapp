BEGIN;

ALTER TABLE public.psucursal1 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucursal2 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucursal3 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucursal4 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucursal5 ALTER COLUMN nautotar TYPE numeric(6,0);

ALTER TABLE public.psucutmp1 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucutmp2 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucutmp3 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucutmp4 ALTER COLUMN nautotar TYPE numeric(6,0);
ALTER TABLE public.psucutmp5 ALTER COLUMN nautotar TYPE numeric(6,0);

COMMIT;

-- Verificacion sugerida post-migracion:
-- SELECT table_name, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name = 'nautotar'
-- ORDER BY table_name;
