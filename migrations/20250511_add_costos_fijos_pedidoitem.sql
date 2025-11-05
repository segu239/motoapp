-- ============================================================================
-- MIGRACIÓN: Agregar campos de costos fijos a pedidoitem
-- ============================================================================
-- Versión: 2.1
-- Fecha: 2025-05-11
-- Autor: Sistema MotoApp
-- Descripción: Agrega campos para almacenar valores fijos de costos y tipo
--              de cambio al momento de cancelar altas de existencias
--
-- IMPACTO: BAJO
-- - No hay registros existentes con estado 'ALTA' o 'Cancel-Alta'
-- - Columnas NULL por defecto (backward compatible)
-- - No afecta SELECTs ni INSERTs existentes
-- ============================================================================

BEGIN;

-- Verificación previa: Contar registros que serían afectados
SELECT
    'Verificación previa' AS paso,
    COUNT(*) AS registros_afectados,
    'Deben ser 0 para proceder sin riesgo' AS nota
FROM pedidoitem
WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta');

-- ============================================================================
-- PASO 1: Agregar columnas de costos fijos
-- ============================================================================

-- Campo para costo total 1 fijado (al momento de cancelación)
ALTER TABLE pedidoitem
ADD COLUMN IF NOT EXISTS costo_total_1_fijo NUMERIC(12, 2) NULL;

-- Campo para costo total 2 fijado (al momento de cancelación)
ALTER TABLE pedidoitem
ADD COLUMN IF NOT EXISTS costo_total_2_fijo NUMERIC(12, 2) NULL;

-- Campo para valor de cambio fijado (al momento de cancelación)
ALTER TABLE pedidoitem
ADD COLUMN IF NOT EXISTS vcambio_fijo NUMERIC(10, 4) NULL;

-- ============================================================================
-- PASO 2: Agregar comentarios a las columnas
-- ============================================================================

COMMENT ON COLUMN pedidoitem.costo_total_1_fijo IS
'Costo total 1 fijado al momento de cancelación. NULL para estado ALTA (cálculo dinámico)';

COMMENT ON COLUMN pedidoitem.costo_total_2_fijo IS
'Costo total 2 fijado al momento de cancelación. NULL para estado ALTA (cálculo dinámico)';

COMMENT ON COLUMN pedidoitem.vcambio_fijo IS
'Valor de cambio fijado al momento de cancelación. NULL para estado ALTA (cálculo dinámico)';

-- ============================================================================
-- PASO 3: Crear índices para mejorar performance de consultas
-- ============================================================================

-- Índice para consultas que filtran por estado (ALTA vs Cancel-Alta)
CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado_trim
ON pedidoitem (TRIM(estado))
WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta');

-- Índice compuesto para consultas de altas por sucursal
CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado_sucursal
ON pedidoitem (sucursald, TRIM(estado))
WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta');

-- ============================================================================
-- PASO 4: Verificación posterior
-- ============================================================================

-- Verificar que las columnas fueron creadas correctamente
SELECT
    'Verificación posterior' AS paso,
    column_name,
    data_type,
    character_maximum_length,
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
    'Índices creados' AS paso,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pedidoitem'
  AND indexname LIKE 'idx_pedidoitem_%'
ORDER BY indexname;

COMMIT;

-- ============================================================================
-- ROLLBACK (en caso de error)
-- ============================================================================
-- Si necesitas revertir esta migración, ejecuta:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_pedidoitem_estado_trim;
-- DROP INDEX IF EXISTS idx_pedidoitem_estado_sucursal;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_1_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_2_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS vcambio_fijo;
-- COMMIT;
-- ============================================================================

-- FIN DE MIGRACIÓN
