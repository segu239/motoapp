-- ============================================================================
-- FASE 4: LIMPIEZA DE BASE DE DATOS
-- ============================================================================
-- Archivo: fase4_limpieza_base_datos.sql
-- Fecha: 21 de Octubre de 2025
-- Propósito: Limpieza final - Eliminar trigger, funciones y renombrar tabla
-- ⚠️ ADVERTENCIA: Este script es IRREVERSIBLE. Asegúrate de tener backup.
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar trigger permanentemente
-- ============================================================================

DROP TRIGGER IF EXISTS trg_validar_suma_detalles_deferred ON caja_movi_detalle;

SELECT '✅ Trigger eliminado' AS paso_1;

-- ============================================================================
-- PASO 2: Eliminar función del trigger
-- ============================================================================

DROP FUNCTION IF EXISTS validar_suma_detalles_cajamovi();

SELECT '✅ Función de trigger eliminada' AS paso_2;

-- ============================================================================
-- PASO 3: Eliminar función de obtención de desglose
-- ============================================================================

DROP FUNCTION IF EXISTS obtener_desglose_movimiento(integer);

SELECT '✅ Función de desglose eliminada' AS paso_3;

-- ============================================================================
-- PASO 4: Renombrar tabla (NO ELIMINAR - mantener datos históricos)
-- ============================================================================

ALTER TABLE caja_movi_detalle RENAME TO caja_movi_detalle_deprecated;

SELECT '✅ Tabla renombrada a caja_movi_detalle_deprecated' AS paso_4;

-- ============================================================================
-- PASO 5: Agregar comentario descriptivo a tabla deprecated
-- ============================================================================

COMMENT ON TABLE caja_movi_detalle_deprecated IS
'⚠️ DEPRECATED: Tabla en desuso desde 2025-10-21.

PROPÓSITO HISTÓRICO:
- Mantener solo por datos históricos (ventas pre-implementación)
- NO insertar nuevos registros
- NO modificar registros existentes

USO ACTUAL:
- Para reportes históricos, usar vista: v_caja_movi_detalle_legacy
- Para movimientos nuevos, consultar directamente: caja_movi JOIN tarjcredito

DOCUMENTACIÓN:
Ver eliminacion_caja_movi_detalle.md para más información sobre:
- Razón de la depreciación
- Nueva arquitectura
- Plan de migración completo

ÚLTIMA INSERCIÓN VÁLIDA:
- Fecha: 2025-10-21
- Después de esta fecha, cualquier insert es incorrecto

SOPORTE:
- Contactar equipo de desarrollo si se necesita acceso a datos históricos
- No realizar operaciones DML en esta tabla';

SELECT '✅ Comentario agregado a tabla deprecated' AS paso_5;

-- ============================================================================
-- PASO 6: Eliminar índices innecesarios
-- ============================================================================

DROP INDEX IF EXISTS idx_caja_movi_detalle_movimiento;
DROP INDEX IF EXISTS idx_caja_movi_detalle_tarjeta;

SELECT '✅ Índices innecesarios eliminados' AS paso_6;

-- ============================================================================
-- PASO 7: Crear índice necesario en tarjcredito
-- ============================================================================

-- Este índice mejora el JOIN entre caja_movi y tarjcredito
-- Compatibilidad PostgreSQL 9.4: no soporta "IF NOT EXISTS" en CREATE INDEX
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'idx_tarjcredito_idcp_ingreso'
    ) THEN
        CREATE INDEX idx_tarjcredito_idcp_ingreso ON tarjcredito(idcp_ingreso);
    END IF;
END
$$;

SELECT '✅ Índice verificado/creado en tarjcredito(idcp_ingreso)' AS paso_7;

-- ============================================================================
-- VERIFICACIONES FINALES
-- ============================================================================

-- Verificación 1: Trigger eliminado
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✅ CORRECTO: Trigger eliminado'
        ELSE '❌ ERROR: Trigger aún existe'
    END AS verificacion_trigger
FROM pg_trigger
WHERE tgname = 'trg_validar_suma_detalles_deferred';

-- Verificación 2: Funciones eliminadas
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✅ CORRECTO: Funciones eliminadas'
        ELSE '❌ ERROR: Funciones aún existen'
    END AS verificacion_funciones
FROM pg_proc
WHERE proname IN ('validar_suma_detalles_cajamovi', 'obtener_desglose_movimiento');

-- Verificación 3: Tabla renombrada
SELECT
    CASE
        WHEN COUNT(*) = 1 THEN '✅ CORRECTO: Tabla renombrada'
        ELSE '❌ ERROR: Tabla no renombrada correctamente'
    END AS verificacion_tabla
FROM pg_tables
WHERE tablename = 'caja_movi_detalle_deprecated';

-- Verificación 4: Índice creado
SELECT
    CASE
        WHEN COUNT(*) >= 1 THEN '✅ CORRECTO: Índice creado'
        ELSE '❌ ERROR: Índice no existe'
    END AS verificacion_indice
FROM pg_indexes
WHERE indexname = 'idx_tarjcredito_idcp_ingreso';

-- Verificación 5: Vista legacy existe
SELECT
    CASE
        WHEN COUNT(*) = 1 THEN '✅ CORRECTO: Vista legacy existe'
        ELSE '❌ ERROR: Vista legacy no existe'
    END AS verificacion_vista
FROM pg_views
WHERE viewname = 'v_caja_movi_detalle_legacy';

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

SELECT
    'caja_movi_detalle_deprecated' AS tabla_historica,
    COUNT(*) AS registros_historicos,
    MAX(fecha_registro) AS ultima_insercion,
    CASE
        WHEN MAX(fecha_registro) < '2025-10-21' THEN '✅ Correcto - Sin inserts nuevos'
        ELSE '⚠️ ADVERTENCIA - Hay inserts después de la fecha límite'
    END AS validacion_fecha
FROM caja_movi_detalle_deprecated;

-- ============================================================================
-- CONSULTAS ÚTILES POST-LIMPIEZA
-- ============================================================================

-- Ver estructura simplificada (sin caja_movi_detalle)
SELECT
    cm.id_movimiento,
    cm.importe_mov,
    tc.tarjeta AS metodo_pago,
    cl.descripcion AS nombre_caja
FROM caja_movi cm
LEFT JOIN tarjcredito tc ON cm.codigo_mov = tc.idcp_ingreso
LEFT JOIN caja_lista cl ON cm.caja = cl.id_caja
WHERE cm.fecha_mov = CURRENT_DATE
ORDER BY cm.id_movimiento DESC
LIMIT 5;

-- ============================================================================
-- ROLLBACK (SOLO EN CASO DE EMERGENCIA)
-- ============================================================================
/*
-- Para revertir TODOS los cambios (solo si hay problemas críticos):

-- 1. Renombrar tabla de vuelta
ALTER TABLE caja_movi_detalle_deprecated RENAME TO caja_movi_detalle;

-- 2. Recrear trigger (ejecutar script original SOLUCION_DEFINITIVA_TRIGGER_DEFERRABLE.sql)
-- psql -U postgres -d motoapp -f SOLUCION_DEFINITIVA_TRIGGER_DEFERRABLE.sql

-- 3. Recrear función de desglose
CREATE OR REPLACE FUNCTION obtener_desglose_movimiento(p_id_movimiento integer)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'cod_tarj', cmd.cod_tarj,
            'nombre_tarjeta', tc.tarjeta,
            'importe_detalle', cmd.importe_detalle,
            'porcentaje', cmd.porcentaje
        )
    )
    INTO resultado
    FROM caja_movi_detalle cmd
    LEFT JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
    WHERE cmd.id_movimiento = p_id_movimiento;

    RETURN COALESCE(resultado, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- 4. Recrear índices
CREATE INDEX idx_caja_movi_detalle_movimiento ON caja_movi_detalle(id_movimiento);
CREATE INDEX idx_caja_movi_detalle_tarjeta ON caja_movi_detalle(cod_tarj);
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

SELECT '✅ FASE 4 COMPLETADA EXITOSAMENTE' AS resultado_final;
