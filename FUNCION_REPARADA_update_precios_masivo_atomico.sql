-- =====================================================
-- FUNCIÓN REPARADA: update_precios_masivo_atomico
-- FECHA: 15 de Agosto de 2025
-- PROBLEMA SOLUCIONADO: Incluye cálculo de margen individual y actualización de prebsiva
-- COMPATIBILIDAD: PostgreSQL 9.4+
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
    v_cnt_conflistas INTEGER := 0;
    v_id_act INTEGER;
    v_res TEXT;
    rec RECORD;
    rec_conflista RECORD;
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
        COALESCE(p_tipo_modificacion, ''costo'') || '' + conflistas [REPARADA]'',
        COALESCE(ROUND(COALESCE(p_porcentaje, 0), 2), 0),
        CASE WHEN v_tipo_real = ''costo'' THEN 1 ELSE 0 END,
        CASE WHEN v_tipo_real = ''final'' THEN 1 ELSE 0 END,
        NOW(), COALESCE(p_usuario, ''SYSTEM''), 1,
        v_id_proveedor_real, v_id_marca_real, v_id_rubro_real
    );

    v_id_act := currval(''cactualiza_id_act_seq'');

    -- ===== PROCESAMIENTO MASIVO CON MARGEN (REPARADO) =====
    FOR rec IN 
        SELECT 
            id_articulo, cd_articulo, TRIM(nomart) as nomart, TRIM(marca) as marca,
            COALESCE(precostosi, 0) as precostosi,
            COALESCE(precon, 0) as precon,
            COALESCE(prebsiva, 0) as prebsiva,
            COALESCE(margen, 0) as margen,
            cod_iva
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

        -- CALCULAR NUEVOS PRECIOS CON MARGEN (LÓGICA IDÉNTICA A PREVIEW)
        IF v_tipo_real = ''costo'' THEN
            -- MODIFICA PRECIO DE COSTO → recalcula precio final CON MARGEN
            p_act := rec.precostosi;
            p_nvo_costo := p_act * (1 + COALESCE(p_porcentaje, 0) / 100.0);
            -- CRÍTICO: Calcular prebsiva con margen individual
            p_nvo_prebsiva := p_nvo_costo * (1 + margen_producto / 100.0);
            -- CRÍTICO: Calcular precio final con IVA desde prebsiva
            p_nvo_final := p_nvo_prebsiva * (1 + aliq_iva / 100.0);
        ELSE
            -- MODIFICA PRECIO FINAL → recalcula precio de costo considerando margen
            p_act := rec.precon;
            p_nvo_final := p_act * (1 + COALESCE(p_porcentaje, 0) / 100.0);
            -- CRÍTICO: Calcular prebsiva y costo considerando margen e IVA
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

        -- ACTUALIZAR PRECIOS EN ARTSUCURSAL (INCLUYENDO PREBSIVA)
        UPDATE artsucursal SET 
            precostosi = COALESCE(ROUND(COALESCE(p_nvo_costo, 0), 2), 0),
            precon = COALESCE(ROUND(COALESCE(p_nvo_final, 0), 2), 0),
            prebsiva = COALESCE(ROUND(COALESCE(p_nvo_prebsiva, 0), 2), 0)
        WHERE id_articulo = rec.id_articulo;

        -- REGISTRAR ARTÍCULO MODIFICADO PARA CONFLISTAS
        v_articulos_modificados := array_append(v_articulos_modificados, rec.id_articulo);
        v_cnt := v_cnt + 1;
    END LOOP;

    -- ===== PROCESAMIENTO DE CONFLISTAS =====
    FOR rec_conflista IN
        SELECT DISTINCT cl.id_conflista, cl.listap, cl.cod_marca, cl.precosto21, 
               cl.precosto105, cl.preciof21, cl.preciof105, cl.margen, cl.rmargen
        FROM conf_lista cl
        WHERE cl.activa = true
        AND (
            (p_marca IS NOT NULL AND TRIM(cl.cod_marca) = TRIM(p_marca))
            OR (p_marca IS NULL AND EXISTS (
                SELECT 1 FROM artsucursal a 
                WHERE TRIM(a.marca) = TRIM(cl.cod_marca)
                AND a.id_articulo = ANY(v_articulos_modificados)
            ))
        )
    LOOP
        IF rec_conflista.rmargen = true AND rec_conflista.margen > 0 THEN
            UPDATE conf_lista SET fecha = NOW(), preciof21 = rec_conflista.margen, preciof105 = rec_conflista.margen
            WHERE id_conflista = rec_conflista.id_conflista;
        ELSE
            UPDATE conf_lista SET fecha = NOW(),
                preciof21 = CASE WHEN rec_conflista.preciof21 != 0 THEN rec_conflista.preciof21 * (1 + COALESCE(p_porcentaje, 0) / 100.0) ELSE rec_conflista.preciof21 END,
                preciof105 = CASE WHEN rec_conflista.preciof105 != 0 THEN rec_conflista.preciof105 * (1 + COALESCE(p_porcentaje, 0) / 100.0) ELSE rec_conflista.preciof105 END
            WHERE id_conflista = rec_conflista.id_conflista;
        END IF;
        v_cnt_conflistas := v_cnt_conflistas + 1;
    END LOOP;

    -- ===== VALIDACIÓN FINAL =====
    IF v_cnt = 0 THEN
        RAISE EXCEPTION ''No se encontraron productos que coincidan con los filtros'';
    END IF;

    -- ===== RESPUESTA EXITOSA =====
    v_res := ''{"success":true,"message":"Actualización atómica REPARADA completada","registros_modificados":'' || v_cnt || 
             '',"conflistas_actualizadas":'' || v_cnt_conflistas || '',"id_actualizacion":'' || v_id_act || 
             '',"tipo_modificacion":"'' || v_tipo_real || ''","porcentaje_aplicado":'' || COALESCE(p_porcentaje, 0) || 
             '',"con_margen_reparado":true,"prebsiva_actualizada":true,"version":"REPARADA_20250815","timestamp":"'' || NOW() || ''"}'';

    RETURN v_res;

EXCEPTION WHEN OTHERS THEN
    RETURN ''{"success":false,"message":"Error: '' || REPLACE(SQLERRM, ''"'', ''\\\"'') || ''","rollback_completo":true}'';
END;
' LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS DE LA REPARACIÓN:
-- 
-- CAMBIOS CRÍTICOS IMPLEMENTADOS:
-- 1. ✅ Añadido campo 'margen' al SELECT principal
-- 2. ✅ Añadida variable margen_producto para cálculos
-- 3. ✅ Añadida variable p_nvo_prebsiva para prebsiva
-- 4. ✅ Lógica de cálculo corregida: Costo → Prebsiva (con margen) → Final (con IVA)
-- 5. ✅ UPDATE incluye actualización del campo prebsiva
-- 6. ✅ Sintaxis compatible con PostgreSQL 9.4
--
-- PROBLEMA RESUELTO:
-- - La función original ignoraba el margen individual de cada producto
-- - Calculaba precio final directamente desde costo con IVA fijo
-- - NO actualizaba el campo prebsiva
-- - Causaba inconsistencia con preview_cambios_precios()
--
-- RESULTADO:
-- - Ahora preview y apply producen resultados idénticos
-- - Respeta margen individual (incluyendo negativos como -10%)
-- - Actualiza correctamente prebsiva
-- - IVA se aplica sobre prebsiva, no sobre costo directo
-- =====================================================