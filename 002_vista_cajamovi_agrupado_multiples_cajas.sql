-- ============================================================================
-- SCRIPT: Vista para Agrupar Movimientos de Caja Múltiples
-- Fecha: 21 de Octubre de 2025
-- Sistema: MotoApp - Solución Múltiples Cajas
-- Descripción: Crea vista para agrupar movimientos relacionados a una misma venta
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR VISTA PARA MOVIMIENTOS AGRUPADOS
-- ============================================================================

CREATE OR REPLACE VIEW v_cajamovi_agrupados AS
SELECT
    -- Identificadores de agrupación
    cm.tipo_comprobante,
    cm.numero_comprobante,
    cm.fecha_mov,
    cm.sucursal,
    cm.cliente,
    cm.usuario,

    -- Totales agrupados
    SUM(cm.importe_mov) AS importe_total,
    COUNT(cm.id_movimiento) AS cantidad_movimientos,

    -- Desglose de cajas (como JSON array)
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'id_movimiento', cm.id_movimiento,
            'id_caja', cm.caja,
            'descripcion_caja', cl.descripcion,
            'codigo_concepto', cm.codigo_mov,
            'descripcion_concepto', cc.descripcion,
            'importe', cm.importe_mov,
            'tipo_movi', cm.tipo_movi
        ) ORDER BY cm.id_movimiento
    ) AS desglose_cajas,

    -- Desglose de métodos de pago (consultando detalles)
    (
        SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'cod_tarj', cmd.cod_tarj,
                'nombre_tarjeta', tc.tarjeta,
                'importe_detalle', cmd.importe_detalle,
                'porcentaje', cmd.porcentaje
            ) ORDER BY cmd.id_detalle
        )
        FROM caja_movi_detalle cmd
        LEFT JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
        WHERE cmd.id_movimiento = MIN(cm.id_movimiento) -- Tomar detalles del primer movimiento
    ) AS desglose_metodos_pago,

    -- Campos adicionales para filtros
    cm.descripcion_mov,
    cm.tipo_movi,
    MIN(cm.id_movimiento) AS id_movimiento_principal,
    ARRAY_AGG(cm.id_movimiento ORDER BY cm.id_movimiento) AS ids_movimientos

FROM caja_movi cm
LEFT JOIN caja_lista cl ON cm.caja = cl.id_caja
LEFT JOIN caja_conceptos cc ON cm.codigo_mov = cc.id_concepto

-- Agrupar por venta (mismo comprobante + fecha + sucursal)
GROUP BY
    cm.tipo_comprobante,
    cm.numero_comprobante,
    cm.fecha_mov,
    cm.sucursal,
    cm.cliente,
    cm.usuario,
    cm.descripcion_mov,
    cm.tipo_movi

-- Solo agrupar si hay comprobante (ventas/operaciones reales)
HAVING cm.tipo_comprobante IS NOT NULL
   AND cm.numero_comprobante IS NOT NULL;

COMMENT ON VIEW v_cajamovi_agrupados IS
'Vista que agrupa movimientos de caja que pertenecen a la misma venta (mismo comprobante).
Muestra el total general y el desglose por caja. Útil para reportes y consultas de ventas con múltiples métodos de pago.';

-- ============================================================================
-- PASO 2: MEJORAR VISTA EXISTENTE (v_cajamovi_con_desglose)
-- ============================================================================

CREATE OR REPLACE VIEW v_cajamovi_con_desglose AS
SELECT
    -- Campos de caja_movi (movimiento principal)
    cm.id_movimiento,
    cm.sucursal,
    cm.codigo_mov,
    cm.num_operacion,
    cm.fecha_mov,
    cm.importe_mov AS total_movimiento,
    cm.descripcion_mov,
    cm.tipo_movi,
    cm.caja,
    cm.tipo_comprobante,
    cm.numero_comprobante,
    cm.cliente,
    cm.usuario,

    -- Campos de caja_movi_detalle (desglose por método de pago)
    cmd.id_detalle,
    cmd.cod_tarj,
    cmd.importe_detalle,
    cmd.porcentaje,
    cmd.fecha_registro AS fecha_detalle,

    -- Campos de tarjcredito (información del método de pago)
    tc.tarjeta AS nombre_tarjeta,
    tc.id_forma_pago,

    -- Campos de caja_conceptos (descripción del concepto)
    cc.descripcion AS descripcion_concepto,

    -- Campos de caja_lista (descripción de la caja)
    cl.descripcion AS descripcion_caja,

    -- ✅ NUEVO: Indicador si es parte de un grupo de movimientos
    CASE
        WHEN EXISTS (
            SELECT 1 FROM caja_movi cm2
            WHERE cm2.tipo_comprobante = cm.tipo_comprobante
              AND cm2.numero_comprobante = cm.numero_comprobante
              AND cm2.fecha_mov = cm.fecha_mov
              AND cm2.id_movimiento != cm.id_movimiento
        ) THEN TRUE
        ELSE FALSE
    END AS es_movimiento_agrupado,

    -- ✅ NUEVO: Cantidad de movimientos en el grupo
    (
        SELECT COUNT(*)
        FROM caja_movi cm3
        WHERE cm3.tipo_comprobante = cm.tipo_comprobante
          AND cm3.numero_comprobante = cm.numero_comprobante
          AND cm3.fecha_mov = cm.fecha_mov
    ) AS movimientos_en_grupo

FROM caja_movi cm
    -- LEFT JOIN para incluir movimientos sin detalles (compatibilidad hacia atrás)
    LEFT JOIN caja_movi_detalle cmd ON cm.id_movimiento = cmd.id_movimiento
    LEFT JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
    LEFT JOIN caja_conceptos cc ON cm.codigo_mov = cc.id_concepto
    LEFT JOIN caja_lista cl ON cm.caja = cl.id_caja;

COMMENT ON VIEW v_cajamovi_con_desglose IS
'Vista mejorada que combina movimientos de caja con sus detalles por método de pago.
Incluye nombres de tarjetas, conceptos y cajas. Compatible con movimientos antiguos sin desglose (LEFT JOIN).
✅ Mejorado: Incluye indicadores de agrupación para identificar ventas con múltiples cajas.';

-- ============================================================================
-- PASO 3: FUNCIÓN DE AYUDA PARA OBTENER MOVIMIENTOS RELACIONADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION obtener_movimientos_relacionados(p_id_movimiento INTEGER)
RETURNS TABLE (
    id_movimiento INTEGER,
    caja INTEGER,
    descripcion_caja TEXT,
    importe_mov NUMERIC,
    codigo_mov INTEGER,
    descripcion_concepto TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id_movimiento,
        cm.caja,
        cl.descripcion AS descripcion_caja,
        cm.importe_mov,
        cm.codigo_mov,
        cc.descripcion AS descripcion_concepto
    FROM caja_movi cm
    LEFT JOIN caja_lista cl ON cm.caja = cl.id_caja
    LEFT JOIN caja_conceptos cc ON cm.codigo_mov = cc.id_concepto
    WHERE cm.tipo_comprobante = (
            SELECT tipo_comprobante FROM caja_movi WHERE id_movimiento = p_id_movimiento
        )
      AND cm.numero_comprobante = (
            SELECT numero_comprobante FROM caja_movi WHERE id_movimiento = p_id_movimiento
        )
      AND cm.fecha_mov = (
            SELECT fecha_mov FROM caja_movi WHERE id_movimiento = p_id_movimiento
        )
    ORDER BY cm.id_movimiento;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_movimientos_relacionados(INTEGER) IS
'Retorna todos los movimientos de caja relacionados a un movimiento dado (mismo comprobante).
Útil para mostrar el desglose completo de cajas en una venta.';

-- ============================================================================
-- PASO 4: ÍNDICES PARA MEJORAR PERFORMANCE DE AGRUPACIÓN
-- ============================================================================

-- Índice compuesto para agrupar por comprobante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_comprobante'
    ) THEN
        CREATE INDEX idx_caja_movi_comprobante
        ON caja_movi(tipo_comprobante, numero_comprobante, fecha_mov);
        RAISE NOTICE '✓ Índice idx_caja_movi_comprobante creado';
    ELSE
        RAISE NOTICE '⚠ Índice idx_caja_movi_comprobante ya existe';
    END IF;
END $$;

-- Índice para búsqueda por caja
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_caja'
    ) THEN
        CREATE INDEX idx_caja_movi_caja
        ON caja_movi(caja);
        RAISE NOTICE '✓ Índice idx_caja_movi_caja creado';
    ELSE
        RAISE NOTICE '⚠ Índice idx_caja_movi_caja ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 5: EJEMPLOS DE CONSULTAS
-- ============================================================================

-- EJEMPLO 1: Ver resumen de ventas agrupadas por comprobante
/*
SELECT
    fecha_mov,
    tipo_comprobante || ' ' || numero_comprobante AS comprobante,
    importe_total,
    cantidad_movimientos AS cajas_afectadas,
    desglose_metodos_pago
FROM v_cajamovi_agrupados
WHERE fecha_mov >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY fecha_mov DESC, numero_comprobante DESC;
*/

-- EJEMPLO 2: Ver desglose de una venta específica
/*
SELECT * FROM v_cajamovi_agrupados
WHERE tipo_comprobante = 'FC'
  AND numero_comprobante = 3333;
*/

-- EJEMPLO 3: Ver todos los movimientos relacionados a un ID
/*
SELECT * FROM obtener_movimientos_relacionados(47);
*/

-- EJEMPLO 4: Reportes de caja - Ingresos por caja en un período
/*
SELECT
    cl.descripcion AS caja,
    COUNT(cm.id_movimiento) AS cantidad_movimientos,
    SUM(cm.importe_mov) AS total_ingresos
FROM caja_movi cm
LEFT JOIN caja_lista cl ON cm.caja = cl.id_caja
WHERE cm.tipo_movi = 'A' -- Solo ingresos
  AND cm.fecha_mov BETWEEN '2025-10-01' AND '2025-10-31'
GROUP BY cl.descripcion
ORDER BY total_ingresos DESC;
*/

-- EJEMPLO 5: Ventas con múltiples métodos de pago en el último mes
/*
SELECT
    fecha_mov,
    tipo_comprobante || ' ' || numero_comprobante AS comprobante,
    importe_total,
    cantidad_movimientos AS metodos_pago_usados,
    desglose_cajas
FROM v_cajamovi_agrupados
WHERE fecha_mov >= CURRENT_DATE - INTERVAL '30 days'
  AND cantidad_movimientos > 1
ORDER BY fecha_mov DESC;
*/

-- ============================================================================
-- PASO 6: VALIDACIÓN DE LA INSTALACIÓN
-- ============================================================================

DO $$
DECLARE
    vista_agrupados BOOLEAN;
    vista_desglose BOOLEAN;
    funcion BOOLEAN;
    indice_comprobante BOOLEAN;
    indice_caja BOOLEAN;
BEGIN
    -- Verificar vista agrupados
    SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'v_cajamovi_agrupados'
    ) INTO vista_agrupados;

    -- Verificar vista desglose
    SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'v_cajamovi_con_desglose'
    ) INTO vista_desglose;

    -- Verificar función
    SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'obtener_movimientos_relacionados'
    ) INTO funcion;

    -- Verificar índices
    SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_comprobante'
    ) INTO indice_comprobante;

    SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_caja'
    ) INTO indice_caja;

    -- Mostrar resultados
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VALIDACIÓN - Vistas y Funciones Múltiples Cajas';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Vista v_cajamovi_agrupados: %', CASE WHEN vista_agrupados THEN '✓ CREADA' ELSE '✗ ERROR' END;
    RAISE NOTICE 'Vista v_cajamovi_con_desglose: %', CASE WHEN vista_desglose THEN '✓ ACTUALIZADA' ELSE '✗ ERROR' END;
    RAISE NOTICE 'Función obtener_movimientos_relacionados: %', CASE WHEN funcion THEN '✓ CREADA' ELSE '✗ ERROR' END;
    RAISE NOTICE 'Índice idx_caja_movi_comprobante: %', CASE WHEN indice_comprobante THEN '✓ CREADO' ELSE '✗ ERROR' END;
    RAISE NOTICE 'Índice idx_caja_movi_caja: %', CASE WHEN indice_caja THEN '✓ CREADO' ELSE '✗ ERROR' END;
    RAISE NOTICE '==============================================';

    IF vista_agrupados AND vista_desglose AND funcion AND indice_comprobante AND indice_caja THEN
        RAISE NOTICE '✅ INSTALACIÓN EXITOSA';
        RAISE NOTICE '';
        RAISE NOTICE 'Puedes usar:';
        RAISE NOTICE '  - SELECT * FROM v_cajamovi_agrupados;';
        RAISE NOTICE '  - SELECT * FROM v_cajamovi_con_desglose;';
        RAISE NOTICE '  - SELECT * FROM obtener_movimientos_relacionados(ID);';
    ELSE
        RAISE WARNING '⚠️  INSTALACIÓN INCOMPLETA - Revisar errores';
    END IF;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
