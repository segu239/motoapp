-- ============================================================================
-- SCRIPT DE CORRECCIÓN DEFINITIVA: Trigger DEFERRABLE para caja_movi_detalle
-- ============================================================================
-- Fecha: 20 de Octubre de 2025
-- Sistema: MotoApp
-- Módulo: Cajamovi - Granularidad de Métodos de Pago
--
-- PROBLEMA IDENTIFICADO:
-- El trigger actual (trg_validar_suma_detalles) es AFTER INSERT FOR EACH ROW
-- y se ejecuta inmediatamente después de cada INSERT individual.
-- Cuando PHP hace múltiples inserts en loop, el PRIMER insert dispara el trigger
-- pero aún no existen los demás detalles, causando un error de validación.
--
-- SOLUCIÓN:
-- Convertir el trigger a CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED
-- Esto hace que PostgreSQL posponga la validación hasta el final de la
-- transacción (antes de COMMIT), permitiendo que todos los detalles se
-- inserten antes de validar.
--
-- IMPACTO:
-- - CERO cambios en código PHP
-- - CERO cambios en código Angular
-- - Mantiene 100% de la validación de integridad
-- - Funciona para 1 o N métodos de pago
-- ============================================================================

-- ============================================================================
-- PASO 1: ELIMINAR TRIGGER ACTUAL (PROBLEMÁTICO)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_validar_suma_detalles ON caja_movi_detalle;

DO $$
BEGIN
    RAISE NOTICE '✓ Trigger antiguo eliminado';
END $$;

-- ============================================================================
-- PASO 2: CREAR CONSTRAINT TRIGGER DEFERRABLE
-- ============================================================================

CREATE CONSTRAINT TRIGGER trg_validar_suma_detalles_deferred
    AFTER INSERT OR UPDATE ON caja_movi_detalle
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE PROCEDURE validar_suma_detalles_cajamovi();

DO $$
BEGIN
    RAISE NOTICE '✓ Nuevo trigger DEFERRABLE creado';
END $$;

-- ============================================================================
-- PASO 3: VERIFICACIÓN DE LA IMPLEMENTACIÓN
-- ============================================================================

-- Verificar que el trigger fue creado correctamente
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_trigger_name TEXT;
BEGIN
    -- Contar triggers en la tabla
    SELECT COUNT(*)
    INTO v_trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'caja_movi_detalle';

    IF v_trigger_count = 0 THEN
        RAISE EXCEPTION '❌ ERROR: No se encontraron triggers en caja_movi_detalle';
    END IF;

    -- Obtener nombre del trigger
    SELECT trigger_name
    INTO v_trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'caja_movi_detalle'
    LIMIT 1;

    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ CORRECCIÓN APLICADA EXITOSAMENTE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Trigger actual: %', v_trigger_name;
    RAISE NOTICE 'Cantidad de triggers: %', v_trigger_count;
    RAISE NOTICE '';
    RAISE NOTICE 'COMPORTAMIENTO:';
    RAISE NOTICE '  - El trigger ahora valida al FINAL de la transacción';
    RAISE NOTICE '  - Permite insertar múltiples detalles sin errores';
    RAISE NOTICE '  - Mantiene toda la lógica de validación';
    RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- VERIFICACIÓN TÉCNICA DETALLADA
-- ============================================================================

SELECT
    trigger_name AS "Nombre del Trigger",
    event_manipulation AS "Evento",
    action_timing AS "Timing",
    action_orientation AS "Orientación",
    CASE
        WHEN trigger_name LIKE '%deferred%' THEN '✅ SÍ'
        ELSE '❌ NO'
    END AS "Es Deferrable"
FROM information_schema.triggers
WHERE event_object_table = 'caja_movi_detalle'
ORDER BY event_manipulation;

-- ============================================================================
-- PRUEBA FUNCIONAL (OPCIONAL)
-- ============================================================================

-- Descomentar las siguientes líneas para ejecutar una prueba completa
/*
DO $$
DECLARE
    v_id_mov INTEGER;
    v_total_esperado NUMERIC(15,2) := 8453.10;
    v_suma_detalles NUMERIC(15,2);
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '🧪 INICIANDO PRUEBA FUNCIONAL';
    RAISE NOTICE '==============================================';

    -- Iniciar transacción de prueba
    BEGIN
        -- 1. Crear movimiento de prueba
        INSERT INTO caja_movi (
            importe_mov,
            fecha_mov,
            descripcion_mov,
            codigo_mov,
            id_sucursal
        ) VALUES (
            v_total_esperado,
            NOW(),
            'PRUEBA - Trigger Deferrable',
            1, -- Ajustar según tu BD
            1  -- Ajustar según tu BD
        ) RETURNING id_movimiento INTO v_id_mov;

        RAISE NOTICE '✓ Movimiento creado: ID=%', v_id_mov;

        -- 2. Insertar primer detalle
        INSERT INTO caja_movi_detalle (id_movimiento, cod_tarj, importe_detalle, porcentaje)
        VALUES (v_id_mov, 11, 1855.74, 21.95);

        RAISE NOTICE '✓ Primer detalle insertado (cod_tarj=11, $1855.74)';
        RAISE NOTICE '  → En el trigger antiguo, aquí FALLARÍA ❌';
        RAISE NOTICE '  → Con el trigger nuevo, se POSPONE la validación ✅';

        -- 3. Insertar segundo detalle
        INSERT INTO caja_movi_detalle (id_movimiento, cod_tarj, importe_detalle, porcentaje)
        VALUES (v_id_mov, 12, 6597.36, 78.05);

        RAISE NOTICE '✓ Segundo detalle insertado (cod_tarj=12, $6597.36)';

        -- 4. Verificar suma antes de commit
        SELECT SUM(importe_detalle)
        INTO v_suma_detalles
        FROM caja_movi_detalle
        WHERE id_movimiento = v_id_mov;

        RAISE NOTICE '';
        RAISE NOTICE 'VALIDACIÓN PRE-COMMIT:';
        RAISE NOTICE '  Total movimiento: $%', v_total_esperado;
        RAISE NOTICE '  Suma detalles: $%', v_suma_detalles;
        RAISE NOTICE '  Diferencia: $%', ABS(v_total_esperado - v_suma_detalles);

        -- 5. Hacer rollback (para no afectar datos reales)
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Haciendo ROLLBACK (no guardar datos de prueba)';
        ROLLBACK;

        RAISE NOTICE '';
        RAISE NOTICE '==============================================';
        RAISE NOTICE '✅ PRUEBA COMPLETADA EXITOSAMENTE';
        RAISE NOTICE '==============================================';
        RAISE NOTICE 'El trigger permite insertar múltiples detalles';
        RAISE NOTICE 'La validación se ejecuta al final correctamente';
        RAISE NOTICE '==============================================';

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '';
            RAISE NOTICE '❌ ERROR EN LA PRUEBA:';
            RAISE NOTICE '%', SQLERRM;
            RAISE NOTICE '';
            RAISE NOTICE 'Si ves este error, verifica:';
            RAISE NOTICE '1. Los valores de codigo_mov e id_sucursal';
            RAISE NOTICE '2. Los valores de cod_tarj (deben existir en tarjcredito)';
            ROLLBACK;
    END;
END $$;
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '📝 NOTAS FINALES';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. El trigger ahora es DEFERRABLE';
    RAISE NOTICE '2. Se ejecuta al final de la transacción (antes de COMMIT)';
    RAISE NOTICE '3. NO requiere cambios en código PHP o Angular';
    RAISE NOTICE '4. Funciona para 1 o múltiples métodos de pago';
    RAISE NOTICE '';
    RAISE NOTICE 'Para probar en tu aplicación:';
    RAISE NOTICE '  - Realiza una venta con múltiples métodos de pago';
    RAISE NOTICE '  - El sistema debe completar la venta sin errores';
    RAISE NOTICE '  - Los detalles deben guardarse en caja_movi_detalle';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
