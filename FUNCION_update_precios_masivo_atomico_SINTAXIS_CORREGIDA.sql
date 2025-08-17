-- =====================================================
-- FUNCIÓN CORREGIDA SINTAXIS: update_precios_masivo_atomico
-- FECHA: 16 de Agosto de 2025
-- CORRECCIÓN CRÍTICA: Sintaxis SQL corregida para prefi1-4
-- PROBLEMA RESUELTO: Errores de sintaxis en subconsultas
-- VERSIÓN: SINTAXIS_CORREGIDA_20250816
-- =====================================================

CREATE OR REPLACE FUNCTION update_precios_masivo_atomico(
    p_marca TEXT DEFAULT NULL,
    p_cd_proveedor INTEGER DEFAULT NULL,
    p_rubro TEXT DEFAULT NULL,
    p_cod_iva INTEGER DEFAULT NULL,
    p_tipo_modificacion TEXT DEFAULT 'costo',
    p_porcentaje NUMERIC DEFAULT 0,
    p_sucursal INTEGER DEFAULT 1,
    p_usuario TEXT DEFAULT 'SYSTEM'
) RETURNS TEXT AS '
DECLARE
    v_dep INTEGER;
    v_cnt INTEGER := 0;
    v_cnt_prefi_actualizados INTEGER := 0;
    v_id_act INTEGER;
    v_res TEXT;
    rec RECORD;
    p_act NUMERIC;
    p_nvo_costo NUMERIC;
    p_nvo_final NUMERIC;
    p_nvo_prebsiva NUMERIC;
    aliq_iva NUMERIC;
    margen_producto NUMERIC;
    v_id_marca_real INTEGER := NULL;
    v_id_proveedor_real INTEGER := NULL;
    v_id_rubro_real INTEGER := NULL;
    v_tipo_real TEXT;
    v_error_msg TEXT := '''';
    v_articulos_modificados INTEGER[] := ''{}'';
    v_tipos_moneda_modificados INTEGER[] := ''{}'';
BEGIN
    -- ===== VALIDACIONES BÁSICAS =====
    IF p_porcentaje = 0 THEN
        RETURN ''{"success":false,"message":"El porcentaje no puede ser 0"}'';
    END IF;
    
    -- EXTRAER TIPO REAL DE LA DESCRIPCIÓN
    v_tipo_real := CASE 
        WHEN UPPER(COALESCE(p_tipo_modificacion, '''')) LIKE ''%COSTO%'' THEN ''costo''
        WHEN UPPER(COALESCE(p_tipo_modificacion, '''')) LIKE ''%FINAL%'' THEN ''final''
        ELSE ''costo''
    END;

    -- Determinar depósito según sucursal
    v_dep := CASE WHEN p_sucursal = 5 THEN 2 ELSE 1 END;

    -- ===== BUSCAR IDs REALES PARA AUDITORÍA =====
    IF p_marca IS NOT NULL THEN
        SELECT id_marca INTO v_id_marca_real
        FROM marcas 
        WHERE TRIM(marca) = TRIM(p_marca)
        LIMIT 1;
    END IF;
    
    IF p_rubro IS NOT NULL THEN
        SELECT id_rubro INTO v_id_rubro_real
        FROM rubros 
        WHERE TRIM(cod_rubro) = TRIM(p_rubro)
        LIMIT 1;
    END IF;
    
    IF p_cd_proveedor IS NOT NULL THEN
        SELECT id_prov INTO v_id_proveedor_real
        FROM proveedores 
        WHERE id_prov = p_cd_proveedor;
    END IF;

    -- ===== REGISTRO DE AUDITORÍA EN CACTUALIZA =====
    INSERT INTO cactualiza (
        listap, tipo, porcentaje_21, precio_costo, precio_venta,
        fecha, usuario, id_moneda, id_proveedor, id_marca, id_rubro
    ) VALUES (
        1,
        COALESCE(p_tipo_modificacion, ''costo'') || '' + prefi1-4 [SINTAXIS CORREGIDA]'',
        COALESCE(ROUND(COALESCE(p_porcentaje, 0), 2), 0),
        CASE WHEN v_tipo_real = ''costo'' THEN 1 ELSE 0 END,
        CASE WHEN v_tipo_real = ''final'' THEN 1 ELSE 0 END,
        NOW(), COALESCE(p_usuario, ''SYSTEM''), 1,
        v_id_proveedor_real, v_id_marca_real, v_id_rubro_real
    );

    v_id_act := currval(''cactualiza_id_act_seq'');

    -- ===== PROCESAMIENTO MASIVO CON MARGEN =====
    FOR rec IN 
        SELECT 
            id_articulo, cd_articulo, TRIM(nomart) as nomart, TRIM(marca) as marca,
            COALESCE(precostosi, 0) as precostosi,
            COALESCE(precon, 0) as precon,
            COALESCE(prebsiva, 0) as prebsiva,
            COALESCE(margen, 0) as margen,
            cod_iva,
            COALESCE(tipo_moneda, 1)::INTEGER as tipo_moneda
        FROM artsucursal 
        WHERE cod_deposito = v_dep
        AND (p_marca IS NULL OR TRIM(marca) = TRIM(p_marca))
        AND (p_cd_proveedor IS NULL OR cd_proveedor::text = p_cd_proveedor::text)
        AND (p_rubro IS NULL OR TRIM(rubro) = TRIM(p_rubro))
        AND (p_cod_iva IS NULL OR cod_iva = p_cod_iva)
    LOOP
        -- OBTENER MARGEN DEL PRODUCTO
        margen_producto := COALESCE(rec.margen, 0);
        
        -- Obtener alícuota de IVA
        SELECT COALESCE(alicuota1, 21) INTO aliq_iva
        FROM artiva 
        WHERE cod_iva = rec.cod_iva 
        LIMIT 1;
        
        IF aliq_iva IS NULL THEN aliq_iva := 21; END IF;

        -- CALCULAR NUEVOS PRECIOS CON MARGEN
        IF v_tipo_real = ''costo'' THEN
            -- MODIFICA PRECIO DE COSTO → recalcula precio final CON MARGEN
            p_act := rec.precostosi;
            p_nvo_costo := p_act * (1 + COALESCE(p_porcentaje, 0) / 100.0);
            -- Calcular prebsiva con margen individual
            p_nvo_prebsiva := p_nvo_costo * (1 + margen_producto / 100.0);
            -- Calcular precio final con IVA desde prebsiva
            p_nvo_final := p_nvo_prebsiva * (1 + aliq_iva / 100.0);
        ELSE
            -- MODIFICA PRECIO FINAL → recalcula precio de costo considerando margen
            p_act := rec.precon;
            p_nvo_final := p_act * (1 + COALESCE(p_porcentaje, 0) / 100.0);
            -- Calcular prebsiva y costo considerando margen e IVA
            p_nvo_prebsiva := p_nvo_final / (1 + aliq_iva / 100.0);
            p_nvo_costo := p_nvo_prebsiva / (1 + margen_producto / 100.0);
        END IF;

        -- Validaciones NULL
        IF p_nvo_costo IS NULL THEN p_nvo_costo := 0; END IF;
        IF p_nvo_final IS NULL THEN p_nvo_final := 0; END IF;
        IF p_nvo_prebsiva IS NULL THEN p_nvo_prebsiva := 0; END IF;

        -- ===== REGISTRO DETALLADO EN DACTUALIZA =====
        INSERT INTO dactualiza (
            id_act, id_articulo, articulo, nombre, pcosto, precio, pfinal,
            pcoston, precion, pfinaln, fecha
        ) VALUES (
            v_id_act, rec.id_articulo, COALESCE(rec.cd_articulo, 0),
            COALESCE(rec.nomart, ''''), COALESCE(rec.precostosi, 0),
            COALESCE(rec.precon, 0), COALESCE(rec.precon, 0),
            COALESCE(p_nvo_costo, 0), COALESCE(p_nvo_final, 0),
            COALESCE(p_nvo_final, 0), NOW()
        );

        -- ===== ACTUALIZAR PRECIOS BÁSICOS EN ARTSUCURSAL =====
        UPDATE artsucursal SET 
            precostosi = COALESCE(ROUND(COALESCE(p_nvo_costo, 0), 2), 0),
            precon = COALESCE(ROUND(COALESCE(p_nvo_final, 0), 2), 0),
            prebsiva = COALESCE(ROUND(COALESCE(p_nvo_prebsiva, 0), 2), 0)
        WHERE id_articulo = rec.id_articulo;

        -- ===== RECALCULAR PREFI1 USANDO CONFIGURACIÓN DE CONF_LISTA =====
        UPDATE artsucursal a SET 
            prefi1 = CASE 
                WHEN EXISTS (SELECT 1 FROM conf_lista WHERE listap = 1 AND activa = true AND tipomone = a.tipo_moneda) 
                THEN ROUND(a.precon * (1 + (
                    SELECT CASE WHEN ai.alicuota1 = 21.00 THEN cl.preciof21 ELSE cl.preciof105 END / 100.0
                    FROM conf_lista cl, artiva ai 
                    WHERE cl.listap = 1 AND cl.activa = true AND cl.tipomone = a.tipo_moneda 
                    AND ai.cod_iva = a.cod_iva
                    LIMIT 1
                )), 2)
                ELSE a.prefi1 
            END
        WHERE a.id_articulo = rec.id_articulo;

        -- ===== RECALCULAR PREFI2 USANDO CONFIGURACIÓN DE CONF_LISTA =====
        UPDATE artsucursal a SET 
            prefi2 = CASE 
                WHEN EXISTS (SELECT 1 FROM conf_lista WHERE listap = 2 AND activa = true AND tipomone = a.tipo_moneda) 
                THEN ROUND(a.precon * (1 + (
                    SELECT CASE WHEN ai.alicuota1 = 21.00 THEN cl.preciof21 ELSE cl.preciof105 END / 100.0
                    FROM conf_lista cl, artiva ai 
                    WHERE cl.listap = 2 AND cl.activa = true AND cl.tipomone = a.tipo_moneda 
                    AND ai.cod_iva = a.cod_iva
                    LIMIT 1
                )), 2)
                ELSE a.prefi2 
            END
        WHERE a.id_articulo = rec.id_articulo;

        -- ===== RECALCULAR PREFI3 USANDO CONFIGURACIÓN DE CONF_LISTA =====
        UPDATE artsucursal a SET 
            prefi3 = CASE 
                WHEN EXISTS (SELECT 1 FROM conf_lista WHERE listap = 3 AND activa = true AND tipomone = a.tipo_moneda) 
                THEN ROUND(a.precon * (1 + (
                    SELECT CASE WHEN ai.alicuota1 = 21.00 THEN cl.preciof21 ELSE cl.preciof105 END / 100.0
                    FROM conf_lista cl, artiva ai 
                    WHERE cl.listap = 3 AND cl.activa = true AND cl.tipomone = a.tipo_moneda 
                    AND ai.cod_iva = a.cod_iva
                    LIMIT 1
                )), 2)
                ELSE a.prefi3 
            END
        WHERE a.id_articulo = rec.id_articulo;

        -- ===== RECALCULAR PREFI4 USANDO CONFIGURACIÓN DE CONF_LISTA =====
        UPDATE artsucursal a SET 
            prefi4 = CASE 
                WHEN EXISTS (SELECT 1 FROM conf_lista WHERE listap = 4 AND activa = true AND tipomone = a.tipo_moneda) 
                THEN ROUND(a.precon * (1 + (
                    SELECT CASE WHEN ai.alicuota1 = 21.00 THEN cl.preciof21 ELSE cl.preciof105 END / 100.0
                    FROM conf_lista cl, artiva ai 
                    WHERE cl.listap = 4 AND cl.activa = true AND cl.tipomone = a.tipo_moneda 
                    AND ai.cod_iva = a.cod_iva
                    LIMIT 1
                )), 2)
                ELSE a.prefi4 
            END
        WHERE a.id_articulo = rec.id_articulo;

        GET DIAGNOSTICS v_cnt_prefi_actualizados = ROW_COUNT;

        -- REGISTRAR ARTÍCULO Y TIPO DE MONEDA MODIFICADO
        v_articulos_modificados := array_append(v_articulos_modificados, rec.id_articulo);
        IF NOT (rec.tipo_moneda = ANY(v_tipos_moneda_modificados)) THEN
            v_tipos_moneda_modificados := array_append(v_tipos_moneda_modificados, rec.tipo_moneda);
        END IF;
        v_cnt := v_cnt + 1;
    END LOOP;

    -- ===== ELIMINADA SECCIÓN DE MODIFICACIÓN DE CONF_LISTA =====
    -- ✅ CORRECTO: conf_lista mantiene sus valores como política de precios

    -- ===== VALIDACIÓN FINAL =====
    IF v_cnt = 0 THEN
        RAISE EXCEPTION ''No se encontraron productos que coincidan con los filtros'';
    END IF;

    -- ===== RESPUESTA EXITOSA =====
    v_res := ''{"success":true,"message":"Actualización atómica SINTAXIS CORREGIDA completada","registros_modificados":'' || v_cnt || 
             '',"prefi_actualizados":'' || v_cnt_prefi_actualizados || '',"id_actualizacion":'' || v_id_act || 
             '',"tipo_modificacion":"'' || v_tipo_real || ''","porcentaje_aplicado":'' || COALESCE(p_porcentaje, 0) || 
             '',"con_margen_corregido":true,"prebsiva_actualizada":true,"prefi1_4_recalculados":true,"conf_lista_preservada":true,"sintaxis_sql_corregida":true,"version":"SINTAXIS_CORREGIDA_20250816","timestamp":"'' || NOW() || ''"}'';

    RETURN v_res;

EXCEPTION WHEN OTHERS THEN
    RETURN ''{"success":false,"message":"Error: '' || REPLACE(SQLERRM, ''"'', ''\\\"'') || ''","rollback_completo":true}'';
END;
' LANGUAGE plpgsql;

-- =====================================================
-- CORRECCIONES DE SINTAXIS IMPLEMENTADAS:
-- 
-- 1. ✅ SEPARACIÓN DE UPDATES PREFI1-4:
--    - Cada prefi se actualiza en un UPDATE independiente
--    - Evita conflictos de variables en subconsultas
-- 
-- 2. ✅ SINTAXIS SQL CORREGIDA:
--    - FROM conf_lista cl, artiva ai (JOIN implícito correcto)
--    - Variables cl y ai bien definidas en el scope
--    - CASE WHEN dentro de SELECT funcionalmente correcto
-- 
-- 3. ✅ LÓGICA PRESERVADA:
--    - Usa preciof21 para alicuota1 = 21.00
--    - Usa preciof105 para alicuota1 = 10.50  
--    - Mantiene conf_lista inalterada
-- 
-- 4. ✅ FÓRMULA CORRECTA:
--    - prefi[X] = precon * (1 + porcentaje_conf_lista / 100)
--    - Redondeo a 2 decimales
-- 
-- PRUEBA ESPERADA - ARTÍCULO 9805 (+10%):
-- - Si precon pasa de $8.35 a $9.185:
-- - prefi1: $9.185 * (1 + (-16.50/100)) = $7.67
-- - prefi2: $9.185 * (1 + (5.50/100)) = $9.69  
-- - prefi3: $9.185 * (1 + (-33.00/100)) = $6.15
-- =====================================================