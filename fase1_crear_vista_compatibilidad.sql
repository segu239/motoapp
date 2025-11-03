-- ============================================================================
-- FASE 1: CREAR VISTA DE COMPATIBILIDAD
-- ============================================================================
-- Archivo: fase1_crear_vista_compatibilidad.sql
-- Fecha: 21 de Octubre de 2025
-- Propósito: Crear vista que simula caja_movi_detalle para compatibilidad
-- ============================================================================

-- Crear vista de compatibilidad
CREATE OR REPLACE VIEW v_caja_movi_detalle_legacy AS
-- Movimientos nuevos (post-implementación)
-- Cada movimiento genera un "detalle" sintético con porcentaje 100%
SELECT
    (1000000 + cm.id_movimiento) AS id_detalle, -- ID sintético para evitar colisiones
    cm.id_movimiento,
    tc.cod_tarj::integer AS cod_tarj,
    cm.importe_mov AS importe_detalle,
    100.00 AS porcentaje,
    cm.fecha_mov AS fecha_registro,
    'NUEVO' AS origen
FROM caja_movi cm
LEFT JOIN tarjcredito tc ON cm.codigo_mov = tc.idcp_ingreso
WHERE cm.tipo_comprobante IS NOT NULL
  AND cm.fecha_mov >= '2025-10-21' -- Fecha de implementación

UNION ALL

-- Movimientos históricos (pre-implementación)
-- Datos reales de la tabla caja_movi_detalle
SELECT
    id_detalle,
    id_movimiento,
    cod_tarj,
    importe_detalle,
    porcentaje,
    fecha_registro,
    'HISTORICO' AS origen
FROM caja_movi_detalle
WHERE fecha_registro < '2025-10-21'; -- Fecha de implementación

-- Agregar comentario a la vista
COMMENT ON VIEW v_caja_movi_detalle_legacy IS
'Vista de compatibilidad para caja_movi_detalle.
Simula detalles para movimientos nuevos (post 2025-10-21) e incluye datos históricos.
Usar esta vista en lugar de caja_movi_detalle para reportes.';

-- Verificar que la vista funciona
SELECT COUNT(*) AS total_detalles FROM v_caja_movi_detalle_legacy;

-- Ver ejemplo de datos nuevos vs históricos
SELECT
    origen,
    COUNT(*) AS cantidad
FROM v_caja_movi_detalle_legacy
GROUP BY origen;

-- ============================================================================
-- PRUEBAS DE VERIFICACIÓN
-- ============================================================================

-- Prueba 1: Comparar movimiento nuevo (FC 9090)
SELECT * FROM v_caja_movi_detalle_legacy
WHERE id_movimiento IN (299, 300)
ORDER BY id_movimiento;

-- Prueba 2: Verificar movimiento histórico (FC 888)
SELECT * FROM v_caja_movi_detalle_legacy
WHERE id_movimiento = 298
ORDER BY id_detalle;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
