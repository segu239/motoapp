-- ============================================================================
-- MIGRACIÓN: Agregar campos de costos fijos a pedidoitem
-- ============================================================================
-- Versión: 2.1 - Compatible con PostgreSQL 9.4
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

-- Columna: costo_total_1_fijo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'pedidoitem'
          AND column_name = 'costo_total_1_fijo'
    ) THEN
        ALTER TABLE pedidoitem ADD COLUMN costo_total_1_fijo NUMERIC(12, 2) NULL;
        RAISE NOTICE 'Columna costo_total_1_fijo creada exitosamente';
    ELSE
        RAISE NOTICE 'Columna costo_total_1_fijo ya existe, omitiendo...';
    END IF;
END $$;

-- Columna: costo_total_2_fijo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'pedidoitem'
          AND column_name = 'costo_total_2_fijo'
    ) THEN
        ALTER TABLE pedidoitem ADD COLUMN costo_total_2_fijo NUMERIC(12, 2) NULL;
        RAISE NOTICE 'Columna costo_total_2_fijo creada exitosamente';
    ELSE
        RAISE NOTICE 'Columna costo_total_2_fijo ya existe, omitiendo...';
    END IF;
END $$;

-- Columna: vcambio_fijo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'pedidoitem'
          AND column_name = 'vcambio_fijo'
    ) THEN
        ALTER TABLE pedidoitem ADD COLUMN vcambio_fijo NUMERIC(10, 4) NULL;
        RAISE NOTICE 'Columna vcambio_fijo creada exitosamente';
    ELSE
        RAISE NOTICE 'Columna vcambio_fijo ya existe, omitiendo...';
    END IF;
END $$;

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

-- Índice: idx_pedidoitem_estado_trim
-- Este índice mejora el performance de consultas que filtran por estado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'pedidoitem'
          AND indexname = 'idx_pedidoitem_estado_trim'
    ) THEN
        CREATE INDEX idx_pedidoitem_estado_trim
        ON pedidoitem (TRIM(estado))
        WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta');
        RAISE NOTICE 'Índice idx_pedidoitem_estado_trim creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_estado_trim ya existe, omitiendo...';
    END IF;
END $$;

-- Índice: idx_pedidoitem_id_num
-- Este índice mejora el performance de JOINs con pedidoscb
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
-- PASO 4: Verificación posterior
-- ============================================================================

-- Verificar que las columnas fueron creadas correctamente
SELECT
    'Verificación posterior - Columnas' AS paso,
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
    'Verificación posterior - Índices' AS paso,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pedidoitem'
  AND indexname LIKE 'idx_pedidoitem_%'
ORDER BY indexname;

-- Verificar comentarios agregados
SELECT
    'Verificación posterior - Comentarios' AS paso,
    column_name,
    col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) AS column_comment
FROM information_schema.columns
WHERE table_name = 'pedidoitem'
  AND column_name IN ('costo_total_1_fijo', 'costo_total_2_fijo', 'vcambio_fijo')
ORDER BY column_name;

COMMIT;

-- ============================================================================
-- ROLLBACK (en caso de error)
-- ============================================================================
-- Si necesitas revertir esta migración, ejecuta:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_pedidoitem_estado_trim;
-- DROP INDEX IF EXISTS idx_pedidoitem_id_num;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_1_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_2_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS vcambio_fijo;
-- COMMIT;
--
-- NOTA: DROP IF EXISTS está disponible desde PostgreSQL 8.2+
-- ============================================================================

-- FIN DE MIGRACIÓN
