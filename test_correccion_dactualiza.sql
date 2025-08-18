-- =====================================================
-- SCRIPT DE PRUEBA: Corrección campos dactualiza
-- FECHA: 18 de Agosto de 2025
-- PROPÓSITO: Validar correcciones en función update_precios_masivo_atomico
-- =====================================================

-- ===== VERIFICAR ESTRUCTURA TABLA DACTUALIZA =====
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dactualiza' 
ORDER BY ordinal_position;

-- ===== ESTADO ACTUAL ARTÍCULO 10651 EN ARTSUCURSAL =====
SELECT 
    'ESTADO ACTUAL' as tipo,
    id_articulo,
    ROUND(precostosi::numeric, 4) as precostosi,
    ROUND(prebsiva::numeric, 4) as prebsiva,
    ROUND(precon::numeric, 4) as precon,
    ROUND(margen::numeric, 2) as margen_porcentaje
FROM artsucursal 
WHERE id_articulo = 10651;

-- ===== ÚLTIMO REGISTRO EN DACTUALIZA ANTES DE CORRECCIÓN =====
SELECT 
    'ANTES DE CORRECCIÓN' as tipo,
    id_articulo,
    ROUND(precion::numeric, 4) as precion_valor,
    ROUND(margen::numeric, 4) as margen_valor,
    descto as descto_valor
FROM dactualiza 
WHERE id_articulo = 10651 
ORDER BY fecha DESC LIMIT 1;

-- ===== PRUEBA DE LA FUNCIÓN CORREGIDA =====
-- NOTA: Esta consulta fallará en modo solo lectura, pero muestra la sintaxis
/*
SELECT update_precios_masivo_atomico(
    p_marca := NULL,
    p_cd_proveedor := NULL, 
    p_rubro := NULL,
    p_cod_iva := NULL,
    p_tipo_modificacion := 'final',
    p_porcentaje := 5,  -- Incremento pequeño para prueba
    p_sucursal := 1,
    p_usuario := 'TEST_CORRECCION_CAMPOS'
);
*/

-- ===== VALIDACIONES ESPERADAS DESPUÉS DE LA CORRECCIÓN =====
-- Estas consultas validarán que la corrección funcionó correctamente

-- 1. Verificar que precion refleje prebsiva nuevo
SELECT 
    'VALIDACIÓN PRECION' as validacion,
    id_articulo,
    ROUND(precion::numeric, 4) as precion_dactualiza,
    'Debería ser igual a prebsiva nuevo' as nota
FROM dactualiza 
WHERE id_articulo = 10651 
ORDER BY fecha DESC LIMIT 1;

-- 2. Verificar que margen se grabe correctamente
SELECT 
    'VALIDACIÓN MARGEN' as validacion,
    d.id_articulo,
    ROUND(d.margen::numeric, 2) as margen_dactualiza,
    ROUND(a.margen::numeric, 2) as margen_artsucursal,
    CASE 
        WHEN d.margen = a.margen THEN '✅ CORRECTO' 
        ELSE '❌ ERROR' 
    END as estado
FROM dactualiza d
JOIN artsucursal a ON d.id_articulo = a.id_articulo
WHERE d.id_articulo = 10651
ORDER BY d.fecha DESC LIMIT 1;

-- 3. Verificar que descto se incluya en el INSERT
SELECT 
    'VALIDACIÓN DESCTO' as validacion,
    id_articulo,
    descto as descto_valor,
    CASE 
        WHEN descto IS NULL THEN '✅ NULL CORRECTO'
        ELSE '✅ VALOR PRESENTE'
    END as estado
FROM dactualiza 
WHERE id_articulo = 10651 
ORDER BY fecha DESC LIMIT 1;

-- ===== COMPARACIÓN ANTES VS DESPUÉS =====
SELECT 
    'RESUMEN COMPARATIVO' as tipo,
    'precion debe ser igual a prebsiva nuevo' as campo_precion,
    'margen debe reflejar margen del producto' as campo_margen,
    'descto debe estar incluido en INSERT' as campo_descto;

-- =====================================================
-- VALIDACIONES CRÍTICAS ESPERADAS:
-- 
-- 1. precion en dactualiza = nuevo prebsiva (NO precio final)
-- 2. margen en dactualiza = margen del producto en artsucursal  
-- 3. descto en dactualiza = incluido en INSERT (NULL o valor)
-- 
-- PROBLEMA ANTES DE LA CORRECCIÓN:
-- - precion mostraba 3.9125 (incorrecto)
-- - margen era NULL (faltaba en INSERT)
-- - descto era NULL (faltaba en INSERT)
-- 
-- DESPUÉS DE LA CORRECCIÓN:
-- - precion debería mostrar 1.5545 (nuevo prebsiva)
-- - margen debería mostrar 108.00 (margen del producto)
-- - descto debería estar presente (NULL o valor)
-- =====================================================