-- ============================================================================
-- FASE 2: DESACTIVAR TRIGGER
-- ============================================================================
-- Archivo: fase2_desactivar_trigger.sql
-- Fecha: 21 de Octubre de 2025
-- Propósito: Desactivar trigger de validación (sin eliminar)
-- ============================================================================

-- Desactivar trigger (no eliminar todavía)
ALTER TABLE caja_movi_detalle
DISABLE TRIGGER trg_validar_suma_detalles_deferred;

-- Agregar comentario a la tabla indicando que está en proceso de depreciación
COMMENT ON TABLE caja_movi_detalle IS
'⚠️ DEPRECATED - Tabla en proceso de eliminación.
Fecha inicio depreciación: 2025-10-21
NO insertar nuevos registros.
Ver eliminacion_caja_movi_detalle.md para más información.
Usar vista v_caja_movi_detalle_legacy para compatibilidad.';

-- Verificación: Mostrar estado del trigger
SELECT
    tgname AS nombre_trigger,
    tgenabled AS estado_codigo,
    CASE tgenabled
        WHEN 'O' THEN '✅ ACTIVO (Origin)'
        WHEN 'D' THEN '⚠️ DESACTIVADO (Disabled)'
        WHEN 'R' THEN '✅ REPLICA'
        WHEN 'A' THEN '✅ ALWAYS'
        ELSE '❓ DESCONOCIDO'
    END AS estado_descripcion,
    tgrelid::regclass AS tabla
FROM pg_trigger
WHERE tgname = 'trg_validar_suma_detalles_deferred';

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- El trigger debe mostrar: tgenabled = 'D' (Disabled)
-- ============================================================================

-- ============================================================================
-- ROLLBACK (Si es necesario)
-- ============================================================================
-- Para reactivar el trigger en caso de rollback:
-- ALTER TABLE caja_movi_detalle ENABLE TRIGGER trg_validar_suma_detalles_deferred;
-- ============================================================================
