-- ============================================================================
-- SCRIPT DE OPTIMIZACIÓN: ÍNDICES PARA PREVENCIÓN DE DUPLICADOS
-- ============================================================================
-- Proyecto: MotoApp
-- Módulo: Gestión de Stock - Pedidos entre Sucursales
-- Fecha: 2025-01-06
-- Propósito: Crear índices para optimizar las consultas de validación de estado
--            y mejorar el rendimiento del bloqueo pesimista (SELECT FOR UPDATE)
-- ============================================================================

-- IMPORTANTE: Ejecutar este script ANTES de poner en producción los cambios
-- del backend. Los índices mejoran el rendimiento de las validaciones.

-- ============================================================================
-- ÍNDICE 1: Búsqueda por estado para operaciones de recepción
-- ============================================================================
-- Optimiza: SELECT ... FROM pedidoitem WHERE estado = 'Solicitado-E'
-- Uso: Componente stockpedido - Lista de pedidos pendientes de recibir
-- Impacto: Mejora velocidad de carga de la grilla de recepción

CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado_lookup
ON pedidoitem(estado)
WHERE estado IN ('Solicitado', 'Solicitado-E', 'Recibido', 'Enviado');

-- Verificar creación
\d+ pedidoitem


-- ============================================================================
-- ÍNDICE 2: Búsqueda por estado para operaciones de recepción (compuesto)
-- ============================================================================
-- Optimiza: SELECT ... FROM pedidoitem WHERE estado = 'Solicitado-E' AND sucursalh = X
-- Uso: Consultas filtradas por sucursal destino
-- Impacto: Reduce tiempo de respuesta en sucursales con alto volumen

CREATE INDEX IF NOT EXISTS idx_pedidoitem_recepcion_lookup
ON pedidoitem(estado, sucursalh)
WHERE estado = 'Solicitado-E';


-- ============================================================================
-- ÍNDICE 3: Búsqueda por estado para operaciones de envío (compuesto)
-- ============================================================================
-- Optimiza: SELECT ... FROM pedidoitem WHERE estado = 'Solicitado' AND sucursald = X
-- Uso: Consultas filtradas por sucursal origen
-- Impacto: Reduce tiempo de respuesta en sucursales con alto volumen

CREATE INDEX IF NOT EXISTS idx_pedidoitem_envio_lookup
ON pedidoitem(estado, sucursald)
WHERE estado = 'Solicitado';


-- ============================================================================
-- ÍNDICE 4: Bloqueo pesimista optimizado (CRÍTICO PARA PREVENCIÓN DE DUPLICADOS)
-- ============================================================================
-- Optimiza: SELECT ... FROM pedidoitem WHERE id_num = X FOR UPDATE NOWAIT
-- Uso: Validación de estado antes de actualizar (backend)
-- Impacto: CRÍTICO - Acelera el bloqueo pesimista para prevenir race conditions

CREATE INDEX IF NOT EXISTS idx_pedidoitem_id_num_estado
ON pedidoitem(id_num, estado);


-- ============================================================================
-- ANÁLISIS DE ÍNDICES CREADOS
-- ============================================================================

-- Listar todos los índices de la tabla pedidoitem
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pedidoitem'
ORDER BY indexname;


-- ============================================================================
-- ESTADÍSTICAS DE TAMAÑO DE ÍNDICES
-- ============================================================================

SELECT
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS number_of_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'pedidoitem'
ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================================
-- ANÁLISIS DE RENDIMIENTO (Ejecutar DESPUÉS de crear los índices)
-- ============================================================================

-- Actualizar estadísticas de la tabla
ANALYZE pedidoitem;

-- Verificar plan de ejecución para consulta de recepción
EXPLAIN ANALYZE
SELECT id_num, estado, cantidad, id_art
FROM pedidoitem
WHERE id_num = 1234
FOR UPDATE NOWAIT;

-- Verificar plan de ejecución para lista de recepción
EXPLAIN ANALYZE
SELECT *
FROM pedidoitem
WHERE estado = 'Solicitado-E' AND sucursalh = '2';

-- Verificar plan de ejecución para lista de envío
EXPLAIN ANALYZE
SELECT *
FROM pedidoitem
WHERE estado = 'Solicitado' AND sucursald = '4';


-- ============================================================================
-- ROLLBACK: SCRIPT PARA ELIMINAR ÍNDICES (Solo si es necesario)
-- ============================================================================

-- ADVERTENCIA: Solo ejecutar si necesitas revertir los cambios

/*
DROP INDEX IF EXISTS idx_pedidoitem_estado_lookup;
DROP INDEX IF EXISTS idx_pedidoitem_recepcion_lookup;
DROP INDEX IF EXISTS idx_pedidoitem_envio_lookup;
DROP INDEX IF EXISTS idx_pedidoitem_id_num_estado;
*/


-- ============================================================================
-- MANTENIMIENTO RECOMENDADO
-- ============================================================================

-- Ejecutar VACUUM y ANALYZE periódicamente (mensualmente recomendado)
-- VACUUM ANALYZE pedidoitem;

-- Verificar índices sin uso después de 30 días de producción
/*
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'pedidoitem'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
*/


-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

-- 1. Tiempo estimado de creación de índices:
--    - Base de datos pequeña (<10,000 registros): < 1 segundo
--    - Base de datos mediana (10,000-100,000): 1-5 segundos
--    - Base de datos grande (>100,000): 5-30 segundos

-- 2. Impacto en INSERT/UPDATE:
--    - Mínimo: Los índices parciales (con WHERE) solo se actualizan cuando
--      el registro cumple la condición, reduciendo overhead

-- 3. Espacio en disco estimado:
--    - Cada índice: ~100KB por cada 10,000 registros
--    - Total esperado: <1MB para bases de datos típicas

-- 4. Recomendaciones:
--    - Ejecutar durante ventana de mantenimiento (baja carga)
--    - Hacer backup ANTES de crear índices
--    - Monitorear rendimiento los primeros 7 días

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
