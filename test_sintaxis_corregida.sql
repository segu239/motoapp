-- =====================================================
-- SCRIPT DE VALIDACIÓN: FUNCIÓN SINTAXIS CORREGIDA
-- FECHA: 16 de Agosto de 2025
-- PROPÓSITO: Validar sintaxis SQL correcta para prefi1-4
-- =====================================================

-- 1. VERIFICAR QUE LA FUNCIÓN SE PUEDE CREAR SIN ERRORES
\echo 'Creando función con sintaxis corregida...'
\i FUNCION_update_precios_masivo_atomico_SINTAXIS_CORREGIDA.sql

-- 2. VERIFICAR ESTADO ANTES (Artículo 9805)
\echo 'Estado ANTES del aumento:'
SELECT 
    'ANTES' as momento,
    id_articulo,
    ROUND(precostosi::numeric, 4) as precostosi,
    ROUND(precon::numeric, 4) as precon,
    ROUND(prefi1::numeric, 4) as prefi1,
    ROUND(prefi2::numeric, 4) as prefi2,
    ROUND(prefi3::numeric, 4) as prefi3,
    ROUND(prefi4::numeric, 4) as prefi4,
    tipo_moneda,
    cod_iva
FROM artsucursal 
WHERE id_articulo = 9805;

-- 3. VALIDAR CÁLCULOS MANUALES ESPERADOS ANTES
\echo 'Cálculos manuales esperados ANTES:'
WITH precios_base AS (
    SELECT 
        a.precon,
        a.tipo_moneda,
        a.cod_iva,
        ai.alicuota1
    FROM artsucursal a
    JOIN artiva ai ON a.cod_iva = ai.cod_iva
    WHERE a.id_articulo = 9805
),
configuracion AS (
    SELECT 
        cl.listap,
        cl.preciof21,
        cl.preciof105,
        pb.precon,
        pb.alicuota1
    FROM conf_lista cl
    CROSS JOIN precios_base pb
    WHERE cl.activa = true 
    AND cl.tipomone = pb.tipo_moneda
    ORDER BY cl.listap
)
SELECT 
    'CALCULO_MANUAL_ANTES' as validacion,
    listap,
    precon as precio_base,
    CASE WHEN alicuota1 = 21.00 THEN preciof21 ELSE preciof105 END as porcentaje,
    ROUND(precon * (1 + (CASE WHEN alicuota1 = 21.00 THEN preciof21 ELSE preciof105 END / 100.0)), 4) as prefi_esperado
FROM configuracion;

-- 4. EJECUTAR FUNCIÓN CON +5% PARA PRUEBA PEQUEÑA
\echo 'Ejecutando función con +5% al costo...'
SELECT update_precios_masivo_atomico(
    NULL,           -- p_marca
    NULL,           -- p_cd_proveedor  
    NULL,           -- p_rubro
    1,              -- p_cod_iva (solo IVA 21%)
    'costo',        -- p_tipo_modificacion
    5,              -- p_porcentaje (+5% para prueba)
    1,              -- p_sucursal
    'TEST_SINTAXIS' -- p_usuario
) as resultado_funcion;

-- 5. VERIFICAR ESTADO DESPUÉS
\echo 'Estado DESPUÉS del aumento:'
SELECT 
    'DESPUES' as momento,
    id_articulo,
    ROUND(precostosi::numeric, 4) as precostosi,
    ROUND(precon::numeric, 4) as precon,
    ROUND(prefi1::numeric, 4) as prefi1,
    ROUND(prefi2::numeric, 4) as prefi2,
    ROUND(prefi3::numeric, 4) as prefi3,
    ROUND(prefi4::numeric, 4) as prefi4,
    tipo_moneda,
    cod_iva
FROM artsucursal 
WHERE id_articulo = 9805;

-- 6. VALIDAR CÁLCULOS MANUALES DESPUÉS
\echo 'Cálculos manuales esperados DESPUÉS:'
WITH precios_base AS (
    SELECT 
        a.precon,
        a.tipo_moneda,
        a.cod_iva,
        ai.alicuota1
    FROM artsucursal a
    JOIN artiva ai ON a.cod_iva = ai.cod_iva
    WHERE a.id_articulo = 9805
),
configuracion AS (
    SELECT 
        cl.listap,
        cl.preciof21,
        cl.preciof105,
        pb.precon,
        pb.alicuota1
    FROM conf_lista cl
    CROSS JOIN precios_base pb
    WHERE cl.activa = true 
    AND cl.tipomone = pb.tipo_moneda
    ORDER BY cl.listap
)
SELECT 
    'CALCULO_MANUAL_DESPUES' as validacion,
    listap,
    precon as precio_base_nuevo,
    CASE WHEN alicuota1 = 21.00 THEN preciof21 ELSE preciof105 END as porcentaje,
    ROUND(precon * (1 + (CASE WHEN alicuota1 = 21.00 THEN preciof21 ELSE preciof105 END / 100.0)), 4) as prefi_esperado_nuevo
FROM configuracion;

-- 7. VERIFICAR QUE CONF_LISTA NO CAMBIÓ
\echo 'Verificando que conf_lista NO se modificó:'
SELECT 
    'CONF_LISTA_FINAL' as estado,
    id_conflista,
    listap,
    preciof21,
    preciof105,
    tipomone,
    activa,
    fecha
FROM conf_lista 
WHERE activa = true 
AND tipomone = 2
ORDER BY listap;

-- 8. CALCULAR INCREMENTOS REALES
\echo 'Incrementos reales calculados:'
WITH estados AS (
    SELECT 
        3.9500 as costo_antes,     -- Valor conocido antes
        8.3500 as precon_antes,    -- Valor conocido antes  
        6.9700 as prefi1_antes,    -- Valor conocido antes
        8.8100 as prefi2_antes,    -- Valor conocido antes
        5.5900 as prefi3_antes,    -- Valor conocido antes
        precostosi as costo_despues,
        precon as precon_despues,
        prefi1 as prefi1_despues,
        prefi2 as prefi2_despues,
        prefi3 as prefi3_despues
    FROM artsucursal 
    WHERE id_articulo = 9805
)
SELECT 
    'INCREMENTOS_REALES' as analisis,
    ROUND(((costo_despues / costo_antes - 1) * 100), 2) as incremento_costo_pct,
    ROUND(((precon_despues / precon_antes - 1) * 100), 2) as incremento_precon_pct,
    ROUND(((prefi1_despues / prefi1_antes - 1) * 100), 2) as incremento_prefi1_pct,
    ROUND(((prefi2_despues / prefi2_antes - 1) * 100), 2) as incremento_prefi2_pct,
    ROUND(((prefi3_despues / prefi3_antes - 1) * 100), 2) as incremento_prefi3_pct
FROM estados;

-- =====================================================
-- RESULTADOS ESPERADOS CON +5%:
-- 
-- ANTES:  precostosi=$3.95, precon=$8.35
-- DESPUÉS: precostosi=$4.1475 (+5%), precon≈$8.7675 (+5%)
-- 
-- PREFI ESPERADOS (usando conf_lista):
-- - prefi1: $8.7675 * 0.835 ≈ $7.32
-- - prefi2: $8.7675 * 1.055 ≈ $9.25  
-- - prefi3: $8.7675 * 0.67 ≈ $5.87
-- 
-- TODOS LOS INCREMENTOS DEBEN SER ≈5%
-- =====================================================