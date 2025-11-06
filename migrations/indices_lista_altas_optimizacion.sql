-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE LISTA DE ALTAS DE EXISTENCIAS
-- ============================================================================
-- Fecha: 2025-11-05
-- Propósito: Optimizar queries de paginación, filtros y ordenamiento
-- Componente: lista-altas
-- Endpoint: ObtenerAltasConCostos_get
-- ============================================================================

-- IMPORTANTE: Ejecutar estos índices en PostgreSQL para mejorar performance
-- de las consultas con paginación, filtros y ordenamiento.

-- ============================================================================
-- 1. ÍNDICES EN PEDIDOITEM
-- ============================================================================

-- Índice para filtrado por estado (WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta'))
-- CRÍTICO: Este índice mejora significativamente las queries principales
CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado
ON pedidoitem(estado);

-- Índice para JOIN con pedidoscb (INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num)
-- CRÍTICO: Acelera el JOIN principal
CREATE INDEX IF NOT EXISTS idx_pedidoitem_id_num
ON pedidoitem(id_num);

-- Índice para ordenamiento por descripción
-- ÚTIL: Cuando se ordena por descripción
CREATE INDEX IF NOT EXISTS idx_pedidoitem_descripcion
ON pedidoitem(descripcion);

-- Índice para ordenamiento por fecha_resuelto
-- ÚTIL: Cuando se ordena por fecha_resuelto
CREATE INDEX IF NOT EXISTS idx_pedidoitem_fecha_resuelto
ON pedidoitem(fecha_resuelto);

-- Índice para filtrado por usuario_res
-- ÚTIL: Cuando se filtra por usuario
CREATE INDEX IF NOT EXISTS idx_pedidoitem_usuario_res
ON pedidoitem(usuario_res);

-- Índice compuesto para estado + id_num
-- MUY ÚTIL: Combina filtrado por estado con ordenamiento por ID
CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado_id_num
ON pedidoitem(estado, id_num DESC);

-- ============================================================================
-- 2. ÍNDICES EN PEDIDOSCB
-- ============================================================================

-- Índice para JOIN con pedidoitem
-- CRÍTICO: Acelera el JOIN desde el lado de pedidoscb
CREATE INDEX IF NOT EXISTS idx_pedidoscb_id_num
ON pedidoscb(id_num);

-- Índice para filtrado por sucursal (WHERE pc.sucursald = ?)
-- MUY IMPORTANTE: Usado en casi todas las consultas
CREATE INDEX IF NOT EXISTS idx_pedidoscb_sucursald
ON pedidoscb(sucursald);

-- Índice para ordenamiento por fecha
-- ÚTIL: Cuando se ordena por fecha
CREATE INDEX IF NOT EXISTS idx_pedidoscb_fecha
ON pedidoscb(fecha);

-- Índice compuesto para sucursal + fecha
-- MUY ÚTIL: Combina filtrado por sucursal con ordenamiento por fecha
CREATE INDEX IF NOT EXISTS idx_pedidoscb_sucursald_fecha
ON pedidoscb(sucursald, fecha DESC);

-- ============================================================================
-- 3. ÍNDICES EN ARTSUCURSAL
-- ============================================================================

-- Índice para LATERAL JOIN (WHERE art.id_articulo = pi.id_art)
-- CRÍTICO: Optimiza el LATERAL JOIN para cálculo de costos dinámicos
CREATE INDEX IF NOT EXISTS idx_artsucursal_id_articulo
ON artsucursal(id_articulo);

-- ============================================================================
-- 4. ÍNDICES EN VALORCAMBIO
-- ============================================================================

-- Índice compuesto para búsqueda de valor de cambio actual
-- CRÍTICO: Optimiza la subquery que busca el valor de cambio más reciente
-- (SELECT COALESCE(vcambio, 1) FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
CREATE INDEX IF NOT EXISTS idx_valorcambio_codmone_fecdesde
ON valorcambio(codmone, fecdesde DESC);

-- ============================================================================
-- 5. VERIFICAR ÍNDICES CREADOS
-- ============================================================================

-- Query para verificar que todos los índices se crearon correctamente
-- Ejecutar después de crear los índices:

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

-- Actualizar estadísticas de las tablas después de crear índices
ANALYZE pedidoitem;
ANALYZE pedidoscb;
ANALYZE artsucursal;
ANALYZE valorcambio;

-- ============================================================================
-- 7. EXPLAIN ANALYZE DE QUERY TÍPICA
-- ============================================================================

-- Ejecutar EXPLAIN ANALYZE para verificar que los índices se están usando
-- Reemplazar los valores según sea necesario

EXPLAIN ANALYZE
SELECT
    pi.id_num,
    pi.id_items,
    pi.id_art,
    pi.descripcion,
    pi.cantidad,
    pc.fecha,
    pi.fecha_resuelto,
    pi.usuario_res,
    pi.observacion,
    TRIM(pi.estado) AS estado,
    pi.motivo_cancelacion,
    pi.fecha_cancelacion,
    pi.usuario_cancelacion,
    pc.sucursald,
    pc.sucursalh,
    pc.usuario,
    pc.tipo,

    -- Costos dinámicos vs fijos
    CASE
        WHEN TRIM(pi.estado) = 'ALTA' THEN costos.costo_total_1_calculado
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_1_fijo
        ELSE NULL
    END AS costo_total_1,

    CASE
        WHEN TRIM(pi.estado) = 'ALTA' THEN costos.costo_total_2_calculado
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_2_fijo
        ELSE NULL
    END AS costo_total_2,

    CASE
        WHEN TRIM(pi.estado) = 'ALTA' THEN costos.vcambio_actual
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.vcambio_fijo
        ELSE NULL
    END AS vcambio,

    CASE
        WHEN TRIM(pi.estado) = 'ALTA' THEN 'dinamico'
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN 'fijo'
        ELSE 'desconocido'
    END AS tipo_calculo,

    '$' AS simbolo_moneda

FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num

LEFT JOIN LATERAL (
    SELECT
        (SELECT COALESCE(vcambio, 1)
         FROM valorcambio
         WHERE codmone = art.tipo_moneda
         ORDER BY fecdesde DESC
         LIMIT 1) AS vcambio_actual,

        (art.precostosi * pi.cantidad *
         (SELECT COALESCE(vcambio, 1) FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
        ) AS costo_total_1_calculado,

        (art.precon * pi.cantidad *
         (SELECT COALESCE(vcambio, 1) FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
        ) AS costo_total_2_calculado

    FROM artsucursal art
    WHERE art.id_articulo = pi.id_art
) AS costos ON TRIM(pi.estado) = 'ALTA'

WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
    AND pc.sucursald = 1  -- Ejemplo: Sucursal Casa Central
ORDER BY pi.id_num DESC
LIMIT 50 OFFSET 0;

-- ============================================================================
-- 8. MONITOREO DE PERFORMANCE
-- ============================================================================

-- Query para monitorear las queries más lentas
-- (requiere extensión pg_stat_statements)

SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%pedidoitem%'
    AND query LIKE '%pedidoscb%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- ============================================================================
-- 9. TAMAÑO DE ÍNDICES
-- ============================================================================

-- Query para ver el tamaño de los índices creados
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('pedidoitem', 'pedidoscb', 'artsucursal', 'valorcambio')
    AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- 10. ROLLBACK (SI ES NECESARIO)
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
-- FIN DEL SCRIPT
-- ============================================================================

-- NOTAS IMPORTANTES:
--
-- 1. Los índices con IF NOT EXISTS no fallarán si ya existen
-- 2. Ejecutar ANALYZE después de crear índices para actualizar estadísticas
-- 3. Monitorear el tamaño de los índices (no deberían ser muy grandes)
-- 4. Si las queries son lentas aún después de crear índices, ejecutar EXPLAIN ANALYZE
-- 5. Los índices compuestos (ej: estado_id_num) son más eficientes que índices separados
-- 6. VACUUM ANALYZE puede ayudar a mejorar performance después de crear índices
--
-- PRIORIDAD DE CREACIÓN:
-- 1. CRÍTICOS (ejecutar primero): idx_pedidoitem_estado, idx_pedidoitem_id_num,
--    idx_pedidoscb_id_num, idx_pedidoscb_sucursald, idx_artsucursal_id_articulo,
--    idx_valorcambio_codmone_fecdesde
-- 2. MUY ÚTILES: idx_pedidoitem_estado_id_num, idx_pedidoscb_sucursald_fecha
-- 3. ÚTILES: El resto de los índices
--
-- ESTIMACIÓN DE MEJORA:
-- - Sin índices: Queries de 5-10 segundos con 10,000 registros
-- - Con índices: Queries de 100-500ms con 10,000 registros
-- - Mejora estimada: 10x-100x más rápido
