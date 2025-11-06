-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE LISTA DE ALTAS DE EXISTENCIAS
-- VERSIÓN POSTGRESQL 9.4
-- ============================================================================
-- Fecha: 2025-11-05
-- Propósito: Optimizar queries de paginación, filtros y ordenamiento
-- Componente: lista-altas
-- Endpoint: ObtenerAltasConCostos_get
-- Base de Datos: PostgreSQL 9.4
-- ============================================================================

-- IMPORTANTE: Este script es compatible con PostgreSQL 9.4
-- Usa bloques DO para verificar existencia antes de crear índices

-- ============================================================================
-- 1. ÍNDICES EN PEDIDOITEM
-- ============================================================================

-- Índice para filtrado por estado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoitem_estado'
    ) THEN
        CREATE INDEX idx_pedidoitem_estado ON pedidoitem(estado);
        RAISE NOTICE 'Índice idx_pedidoitem_estado creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_estado ya existe';
    END IF;
END$$;

-- Índice para JOIN con pedidoscb
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoitem_id_num'
    ) THEN
        CREATE INDEX idx_pedidoitem_id_num ON pedidoitem(id_num);
        RAISE NOTICE 'Índice idx_pedidoitem_id_num creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_id_num ya existe';
    END IF;
END$$;

-- Índice para ordenamiento por descripción
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoitem_descripcion'
    ) THEN
        CREATE INDEX idx_pedidoitem_descripcion ON pedidoitem(descripcion);
        RAISE NOTICE 'Índice idx_pedidoitem_descripcion creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_descripcion ya existe';
    END IF;
END$$;

-- Índice para ordenamiento por fecha_resuelto
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoitem_fecha_resuelto'
    ) THEN
        CREATE INDEX idx_pedidoitem_fecha_resuelto ON pedidoitem(fecha_resuelto);
        RAISE NOTICE 'Índice idx_pedidoitem_fecha_resuelto creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_fecha_resuelto ya existe';
    END IF;
END$$;

-- Índice para filtrado por usuario_res
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoitem_usuario_res'
    ) THEN
        CREATE INDEX idx_pedidoitem_usuario_res ON pedidoitem(usuario_res);
        RAISE NOTICE 'Índice idx_pedidoitem_usuario_res creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_usuario_res ya existe';
    END IF;
END$$;

-- Índice compuesto para estado + id_num
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoitem_estado_id_num'
    ) THEN
        CREATE INDEX idx_pedidoitem_estado_id_num ON pedidoitem(estado, id_num DESC);
        RAISE NOTICE 'Índice idx_pedidoitem_estado_id_num creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoitem_estado_id_num ya existe';
    END IF;
END$$;

-- ============================================================================
-- 2. ÍNDICES EN PEDIDOSCB
-- ============================================================================

-- Índice para JOIN con pedidoitem
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoscb_id_num'
    ) THEN
        CREATE INDEX idx_pedidoscb_id_num ON pedidoscb(id_num);
        RAISE NOTICE 'Índice idx_pedidoscb_id_num creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoscb_id_num ya existe';
    END IF;
END$$;

-- Índice para filtrado por sucursal
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoscb_sucursald'
    ) THEN
        CREATE INDEX idx_pedidoscb_sucursald ON pedidoscb(sucursald);
        RAISE NOTICE 'Índice idx_pedidoscb_sucursald creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoscb_sucursald ya existe';
    END IF;
END$$;

-- Índice para ordenamiento por fecha
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoscb_fecha'
    ) THEN
        CREATE INDEX idx_pedidoscb_fecha ON pedidoscb(fecha);
        RAISE NOTICE 'Índice idx_pedidoscb_fecha creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoscb_fecha ya existe';
    END IF;
END$$;

-- Índice compuesto para sucursal + fecha
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pedidoscb_sucursald_fecha'
    ) THEN
        CREATE INDEX idx_pedidoscb_sucursald_fecha ON pedidoscb(sucursald, fecha DESC);
        RAISE NOTICE 'Índice idx_pedidoscb_sucursald_fecha creado';
    ELSE
        RAISE NOTICE 'Índice idx_pedidoscb_sucursald_fecha ya existe';
    END IF;
END$$;

-- ============================================================================
-- 3. ÍNDICES EN ARTSUCURSAL
-- ============================================================================

-- Índice para LATERAL JOIN
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_artsucursal_id_articulo'
    ) THEN
        CREATE INDEX idx_artsucursal_id_articulo ON artsucursal(id_articulo);
        RAISE NOTICE 'Índice idx_artsucursal_id_articulo creado';
    ELSE
        RAISE NOTICE 'Índice idx_artsucursal_id_articulo ya existe';
    END IF;
END$$;

-- ============================================================================
-- 4. ÍNDICES EN VALORCAMBIO
-- ============================================================================

-- Índice compuesto para búsqueda de valor de cambio actual
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_valorcambio_codmone_fecdesde'
    ) THEN
        CREATE INDEX idx_valorcambio_codmone_fecdesde ON valorcambio(codmone, fecdesde DESC);
        RAISE NOTICE 'Índice idx_valorcambio_codmone_fecdesde creado';
    ELSE
        RAISE NOTICE 'Índice idx_valorcambio_codmone_fecdesde ya existe';
    END IF;
END$$;

-- ============================================================================
-- 5. VERIFICAR ÍNDICES CREADOS
-- ============================================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('pedidoitem', 'pedidoscb', 'artsucursal', 'valorcambio')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- 6. ESTADÍSTICAS Y ANÁLISIS
-- ============================================================================

ANALYZE pedidoitem;
ANALYZE pedidoscb;
ANALYZE artsucursal;
ANALYZE valorcambio;

-- ============================================================================
-- 7. RESUMEN DE ÍNDICES CREADOS
-- ============================================================================

DO $$
DECLARE
    total_indices INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_indices
    FROM pg_indexes
    WHERE tablename IN ('pedidoitem', 'pedidoscb', 'artsucursal', 'valorcambio')
        AND indexname LIKE 'idx_%';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE ÍNDICES';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de índices creados: %', total_indices;
    RAISE NOTICE '========================================';
END$$;

-- ============================================================================
-- 8. ROLLBACK (SI ES NECESARIO)
-- ============================================================================

-- Para eliminar todos los índices creados (EN CASO DE EMERGENCIA):
/*
DROP INDEX IF EXISTS idx_pedidoitem_estado;
DROP INDEX IF EXISTS idx_pedidoitem_id_num;
DROP INDEX IF EXISTS idx_pedidoitem_descripcion;
DROP INDEX IF EXISTS idx_pedidoitem_fecha_resuelto;
DROP INDEX IF EXISTS idx_pedidoitem_usuario_res;
DROP INDEX IF EXISTS idx_pedidoitem_estado_id_num;
DROP INDEX IF EXISTS idx_pedidoscb_id_num;
DROP INDEX IF EXISTS idx_pedidoscb_sucursald;
DROP INDEX IF EXISTS idx_pedidoscb_fecha;
DROP INDEX IF EXISTS idx_pedidoscb_sucursald_fecha;
DROP INDEX IF EXISTS idx_artsucursal_id_articulo;
DROP INDEX IF EXISTS idx_valorcambio_codmone_fecdesde;
*/

-- ============================================================================
-- NOTAS IMPORTANTES PARA POSTGRESQL 9.4
-- ============================================================================

-- 1. PostgreSQL 9.4 NO soporta "IF NOT EXISTS" en CREATE INDEX
-- 2. Este script usa bloques DO con verificación manual
-- 3. Es seguro ejecutar múltiples veces (no crea duplicados)
-- 4. Los mensajes RAISE NOTICE informan si el índice se creó o ya existía
-- 5. DROP INDEX IF EXISTS SÍ funciona en PostgreSQL 9.4 (para rollback)

-- ============================================================================
-- PRIORIDAD DE CREACIÓN
-- ============================================================================

-- CRÍTICOS (ejecutados primero en este script):
--   1. idx_pedidoitem_estado
--   2. idx_pedidoitem_id_num
--   3. idx_pedidoscb_id_num
--   4. idx_pedidoscb_sucursald
--   5. idx_artsucursal_id_articulo
--   6. idx_valorcambio_codmone_fecdesde

-- MUY ÚTILES:
--   7. idx_pedidoitem_estado_id_num
--   8. idx_pedidoscb_sucursald_fecha

-- ÚTILES:
--   9. idx_pedidoitem_descripcion
--  10. idx_pedidoitem_fecha_resuelto
--  11. idx_pedidoitem_usuario_res
--  12. idx_pedidoscb_fecha

-- ============================================================================
-- ESTIMACIÓN DE MEJORA
-- ============================================================================

-- Sin índices:
--   - 1,000 registros: 1-2 segundos
--   - 5,000 registros: 5-8 segundos
--   - 10,000 registros: 10-15 segundos

-- Con índices:
--   - 1,000 registros: 50-100ms
--   - 5,000 registros: 100-200ms
--   - 10,000 registros: 200-500ms

-- Mejora estimada: 10x-50x más rápido

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
