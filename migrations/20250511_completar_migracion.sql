-- ============================================================================
-- SCRIPT COMPLEMENTARIO: Completar migración de costos fijos
-- ============================================================================
-- Este script completa la migración que fue interrumpida por el error del
-- índice idx_pedidoitem_estado_sucursal
--
-- EJECUTAR SOLO SI YA SE EJECUTÓ EL SCRIPT PRINCIPAL Y FALLÓ EN LOS ÍNDICES
-- ============================================================================

BEGIN;

-- ============================================================================
-- Crear el índice en id_num para mejorar JOINs con pedidoscb
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'pedidoitem'
          AND indexname = 'idx_pedidoitem_id_num'
    ) THEN
        CREATE INDEX idx_pedidoitem_id_num
        ON pedidoitem (id_num);
        RAISE NOTICE 'Índice idx_pedidoitem_id_num creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_id_num ya existe, omitiendo...';
    END IF;
END $$;

-- ============================================================================
-- Verificaciones
-- ============================================================================

-- Verificar que las columnas fueron creadas correctamente
SELECT
    'Verificación - Columnas' AS paso,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pedidoitem'
  AND column_name IN ('costo_total_1_fijo', 'costo_total_2_fijo', 'vcambio_fijo')
ORDER BY column_name;

-- Verificar índices creados
SELECT
    'Verificación - Índices' AS paso,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pedidoitem'
  AND indexname LIKE 'idx_pedidoitem_%'
ORDER BY indexname;

-- Verificar comentarios agregados
SELECT
    'Verificación - Comentarios' AS paso,
    column_name,
    col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) AS column_comment
FROM information_schema.columns
WHERE table_name = 'pedidoitem'
  AND column_name IN ('costo_total_1_fijo', 'costo_total_2_fijo', 'vcambio_fijo')
ORDER BY column_name;

COMMIT;

-- FIN DEL SCRIPT
