-- =====================================================
-- SCRIPT DE VALIDACIÓN: FUNCIÓN CORREGIDA PREFI1-4
-- FECHA: 16 de Agosto de 2025
-- PROPÓSITO: Validar que los prefi1-4 se calculan correctamente
-- =====================================================

-- 1. CREAR LA FUNCIÓN CORREGIDA
\i FUNCION_update_precios_masivo_atomico_CORREGIDA_PREFI.sql

-- 2. VERIFICAR ESTADO ANTES DE LA PRUEBA (Artículo 9805)
SELECT 
    'ANTES' as momento,
    id_articulo,
    cd_articulo,
    precostosi,
    prebsiva,
    precon,
    prefi1,
    prefi2,
    prefi3,
    prefi4,
    tipo_moneda,
    cod_iva
FROM artsucursal 
WHERE id_articulo = 9805;

-- 3. VERIFICAR CONFIGURACIÓN DE CONF_LISTA ACTUAL
SELECT 
    'CONF_LISTA_ANTES' as momento,
    id_conflista,
    listap,
    preciof21,
    preciof105,
    tipomone,
    activa
FROM conf_lista 
WHERE activa = true 
AND tipomone = (SELECT tipo_moneda FROM artsucursal WHERE id_articulo = 9805 LIMIT 1)
ORDER BY listap;

-- 4. EJECUTAR FUNCIÓN CORREGIDA (+10% al costo)
SELECT update_precios_masivo_atomico(
    NULL,           -- p_marca
    NULL,           -- p_cd_proveedor  
    NULL,           -- p_rubro
    NULL,           -- p_cod_iva
    'costo',        -- p_tipo_modificacion
    10,             -- p_porcentaje (+10%)
    1,              -- p_sucursal
    'TEST_PREFI'    -- p_usuario
) as resultado_funcion;

-- 5. VERIFICAR ESTADO DESPUÉS DE LA PRUEBA (Artículo 9805)
SELECT 
    'DESPUES' as momento,
    id_articulo,
    cd_articulo,
    precostosi,
    prebsiva,
    precon,
    prefi1,
    prefi2,
    prefi3,
    prefi4,
    tipo_moneda,
    cod_iva,
    -- CALCULAR INCREMENTOS REALES
    ROUND(((precostosi / LAG(precostosi) OVER (ORDER BY id_articulo) - 1) * 100), 2) as incremento_costo_real,
    ROUND(((precon / LAG(precon) OVER (ORDER BY id_articulo) - 1) * 100), 2) as incremento_precon_real,
    ROUND(((prefi1 / LAG(prefi1) OVER (ORDER BY id_articulo) - 1) * 100), 2) as incremento_prefi1_real,
    ROUND(((prefi2 / LAG(prefi2) OVER (ORDER BY id_articulo) - 1) * 100), 2) as incremento_prefi2_real,
    ROUND(((prefi3 / LAG(prefi3) OVER (ORDER BY id_articulo) - 1) * 100), 2) as incremento_prefi3_real
FROM artsucursal 
WHERE id_articulo = 9805;

-- 6. VERIFICAR QUE CONF_LISTA NO SE MODIFICÓ
SELECT 
    'CONF_LISTA_DESPUES' as momento,
    id_conflista,
    listap,
    preciof21,
    preciof105,
    tipomone,
    activa,
    fecha
FROM conf_lista 
WHERE activa = true 
AND tipomone = (SELECT tipo_moneda FROM artsucursal WHERE id_articulo = 9805 LIMIT 1)
ORDER BY listap;

-- 7. VALIDAR CÁLCULOS MANUALES ESPERADOS
WITH configuracion AS (
    SELECT 
        cl.listap,
        cl.preciof21,
        cl.preciof105,
        ai.alicuota1
    FROM conf_lista cl
    CROSS JOIN (SELECT alicuota1 FROM artiva WHERE cod_iva = (SELECT cod_iva FROM artsucursal WHERE id_articulo = 9805 LIMIT 1) LIMIT 1) ai
    WHERE cl.activa = true 
    AND cl.tipomone = (SELECT tipo_moneda FROM artsucursal WHERE id_articulo = 9805 LIMIT 1)
),
precios_actuales AS (
    SELECT precon FROM artsucursal WHERE id_articulo = 9805
)
SELECT 
    'CALCULO_MANUAL' as validacion,
    c.listap,
    pa.precon as precio_base,
    CASE 
        WHEN c.alicuota1 = 21.00 THEN c.preciof21 
        ELSE c.preciof105 
    END as porcentaje_aplicado,
    ROUND(pa.precon * (1 + (CASE 
        WHEN c.alicuota1 = 21.00 THEN c.preciof21 
        ELSE c.preciof105 
    END / 100.0)), 2) as prefi_esperado
FROM configuracion c
CROSS JOIN precios_actuales pa
ORDER BY c.listap;

-- 8. VERIFICAR AUDITORÍA
SELECT 
    'AUDITORIA' as tipo,
    id_act,
    tipo,
    porcentaje_21,
    fecha,
    usuario
FROM cactualiza 
WHERE usuario = 'TEST_PREFI'
ORDER BY id_act DESC 
LIMIT 1;

-- =====================================================
-- RESULTADOS ESPERADOS PARA ARTÍCULO 9805:
-- 
-- SI precostosi ANTES = $3.5868:
-- - precostosi DESPUÉS = $3.9455 (+10%)
-- - precon DESPUÉS = $8.3600 (+10% aproximadamente)
-- 
-- SI precon DESPUÉS = $8.3600 y conf_lista tiene:
-- - Lista 1: preciof21 = -16.50% → prefi1 = $8.36 * 0.835 = $6.9806
-- - Lista 2: preciof21 = 5.50% → prefi2 = $8.36 * 1.055 = $8.8198  
-- - Lista 3: preciof21 = -33.00% → prefi3 = $8.36 * 0.67 = $5.6012
-- 
-- IMPORTANTE: conf_lista NO debe cambiar sus valores originales
-- =====================================================