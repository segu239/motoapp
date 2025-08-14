-- ===================================================================
-- CORRECCIÓN DE LA FUNCIÓN preview_cambios_precios()
-- Este script corrige el cálculo de precios para incluir el margen correctamente
-- Sintaxis EXACTA compatible con PostgreSQL 9.4 (como update_precios_masivo_atomico)
-- ===================================================================

CREATE OR REPLACE FUNCTION preview_cambios_precios(
    p_marca TEXT DEFAULT NULL,
    p_cd_proveedor INTEGER DEFAULT NULL,
    p_rubro TEXT DEFAULT NULL,
    p_cod_iva INTEGER DEFAULT NULL,
    p_tipo_modificacion TEXT DEFAULT 'costo',
    p_porcentaje NUMERIC DEFAULT 0,
    p_sucursal INTEGER DEFAULT 1
) RETURNS TEXT AS '
DECLARE
    v_dep INTEGER;
    v_cnt INTEGER;
    v_cnt_prev INTEGER := 0;
    v_prod TEXT;
    v_res TEXT;
    rec RECORD;
    primer BOOLEAN := true;
    
    -- Precios actuales
    p_costo_actual NUMERIC;
    p_final_actual NUMERIC;
    
    -- Precios nuevos
    p_costo_nuevo NUMERIC;
    p_final_nuevo NUMERIC;
    p_prebsiva_nuevo NUMERIC;  -- ✅ NUEVO: Para cálculo con margen
    
    -- Variables para cálculo de variación (del campo que se modifica)
    p_act_modificado NUMERIC;  -- Precio actual del campo que se modifica
    p_nvo_modificado NUMERIC;  -- Precio nuevo del campo que se modifica
    
    aliq_iva NUMERIC;
    margen_producto NUMERIC;  -- ✅ NUEVO: Para obtener el margen
    vari NUMERIC;
    vari_pct NUMERIC;
    sum_vari NUMERIC := 0;
    prom_vari NUMERIC := 0;
BEGIN
    -- Validar que el porcentaje no sea 0
    IF p_porcentaje = 0 THEN
        RETURN ''{\"success\":false,\"message\":\"Debe especificar un porcentaje de modificación diferente de 0\"}'';
    END IF;

    -- Determinar depósito según sucursal (1=principal, 2=sucursal 5)
    v_dep := CASE WHEN p_sucursal = 5 THEN 2 ELSE 1 END;

    -- Contar productos que cumplen filtros aplicados
    SELECT COUNT(*) INTO v_cnt
    FROM artsucursal a
    WHERE a.cod_deposito = v_dep
      AND (p_marca IS NULL OR TRIM(a.marca) = TRIM(p_marca))
      AND (p_cd_proveedor IS NULL OR a.cd_proveedor = p_cd_proveedor)
      AND (p_rubro IS NULL OR TRIM(a.rubro) = TRIM(p_rubro))
      AND (p_cod_iva IS NULL OR a.cod_iva = p_cod_iva);

    -- ===== CONSTRUIR LISTA DE PRODUCTOS (LIMITADO A 50 PARA UI) =====
    v_prod := ''['';
    
    FOR rec IN 
        SELECT a.cd_articulo, a.nomart, a.marca, a.rubro,
               a.precostosi, a.precon, a.cod_iva, a.margen,  -- ✅ INCLUIR margen
               COALESCE(iva.alicuota1, 21) as alicuota1
        FROM artsucursal a
        LEFT JOIN artiva iva ON a.cod_iva = iva.cod_iva
        WHERE a.cod_deposito = v_dep
          AND (p_marca IS NULL OR TRIM(a.marca) = TRIM(p_marca))
          AND (p_cd_proveedor IS NULL OR a.cd_proveedor = p_cd_proveedor)
          AND (p_rubro IS NULL OR TRIM(a.rubro) = TRIM(p_rubro))
          AND (p_cod_iva IS NULL OR a.cod_iva = p_cod_iva)
        ORDER BY a.nomart
        LIMIT 50
    LOOP
        -- PASO 1: Obtener precios actuales Y margen
        p_costo_actual := COALESCE(rec.precostosi, 0);
        p_final_actual := COALESCE(rec.precon, 0);
        margen_producto := COALESCE(rec.margen, 0);  -- ✅ NUEVO
        
        -- Obtener alícuota de IVA
        aliq_iva := COALESCE(rec.alicuota1, 21);

        -- PASO 2: Calcular precios nuevos según tipo de modificación
        IF p_tipo_modificacion = ''costo'' THEN
            -- ✅ MODIFICA PRECIO DE COSTO → recalcula precio final CON MARGEN
            p_costo_nuevo := p_costo_actual * (1 + p_porcentaje / 100.0);
            -- ✅ NUEVO: Calcular prebsiva con margen
            p_prebsiva_nuevo := p_costo_nuevo * (1 + margen_producto / 100.0);
            -- ✅ NUEVO: Calcular precio final con IVA desde prebsiva
            p_final_nuevo := p_prebsiva_nuevo * (1 + aliq_iva / 100.0);
            
            -- Para variación, usar el campo que se está modificando (costo)
            p_act_modificado := p_costo_actual;
            p_nvo_modificado := p_costo_nuevo;
        ELSE
            -- MODIFICA PRECIO FINAL → recalcula precio de costo
            p_final_nuevo := p_final_actual * (1 + p_porcentaje / 100.0);
            -- ✅ CORREGIR: Calcular costo considerando margen e IVA
            p_prebsiva_nuevo := p_final_nuevo / (1 + aliq_iva / 100.0);
            p_costo_nuevo := p_prebsiva_nuevo / (1 + margen_producto / 100.0);
            
            -- Para variación, usar el campo que se está modificando (final)
            p_act_modificado := p_final_actual;
            p_nvo_modificado := p_final_nuevo;
        END IF;

        -- PASO 3: Validar todos los valores calculados
        IF p_costo_nuevo IS NULL THEN p_costo_nuevo := 0; END IF;
        IF p_final_nuevo IS NULL THEN p_final_nuevo := 0; END IF;
        IF p_act_modificado IS NULL THEN p_act_modificado := 0; END IF;
        IF p_nvo_modificado IS NULL THEN p_nvo_modificado := 0; END IF;

        -- PASO 4: Calcular variación del campo modificado
        vari := p_nvo_modificado - p_act_modificado;
        IF p_act_modificado > 0 THEN
            vari_pct := (vari / p_act_modificado) * 100.0;
        ELSE
            vari_pct := 0;
        END IF;

        -- Validar variaciones
        IF vari IS NULL THEN vari := 0; END IF;
        IF vari_pct IS NULL THEN vari_pct := 0; END IF;

        -- Acumular para cálculo de promedios
        sum_vari := sum_vari + vari_pct;

        -- PASO 5: Construir objeto JSON con todos los precios
        IF primer THEN
            primer := false;
        ELSE
            v_prod := v_prod || '','';
        END IF;
        
        v_prod := v_prod || ''{\"cd_articulo\":\"'' || COALESCE(rec.cd_articulo::text, '''') || ''\",'' ||
            ''\"nomart\":\"'' || REPLACE(COALESCE(rec.nomart, ''''), ''"'', ''\\\"'') || ''\",'' ||
            ''\"marca\":\"'' || COALESCE(rec.marca, '''') || ''\",'' ||
            ''\"rubro\":\"'' || COALESCE(rec.rubro, '''') || ''\",'' ||
            ''\"precio_costo_actual\":'' || COALESCE(ROUND(p_costo_actual, 2)::text, ''0'') || '','' ||
            ''\"precio_costo_nuevo\":'' || COALESCE(ROUND(p_costo_nuevo, 2)::text, ''0'') || '','' ||
            ''\"precio_final_actual\":'' || COALESCE(ROUND(p_final_actual, 2)::text, ''0'') || '','' ||
            ''\"precio_final_nuevo\":'' || COALESCE(ROUND(p_final_nuevo, 2)::text, ''0'') || '','' ||
            ''\"precio_actual\":'' || COALESCE(ROUND(p_act_modificado, 2)::text, ''0'') || '','' ||
            ''\"precio_nuevo\":'' || COALESCE(ROUND(p_nvo_modificado, 2)::text, ''0'') || '','' ||
            ''\"variacion\":'' || COALESCE(ROUND(vari, 2)::text, ''0'') || '','' ||
            ''\"variacion_porcentaje\":'' || COALESCE(ROUND(vari_pct, 2)::text, ''0'') || '','' ||
            ''\"cod_iva\":'' || COALESCE(rec.cod_iva::text, ''0'') || '','' ||
            ''\"alicuota_iva\":'' || COALESCE(aliq_iva::text, ''21'') || '','' ||
            ''\"margen\":'' || COALESCE(margen_producto::text, ''0'') || '','' ||
            ''\"stock_total\":0,'' ||
            ''\"impacto_inventario\":0'' ||
            ''}'';
        
        v_cnt_prev := v_cnt_prev + 1;
    END LOOP;
    v_prod := v_prod || '']'';

    -- Calcular promedio de variación
    IF v_cnt_prev > 0 THEN
        prom_vari := sum_vari / v_cnt_prev;
    END IF;

    -- Validar prom_vari
    IF prom_vari IS NULL THEN
        prom_vari := 0;
    END IF;

    -- ===== CONSTRUIR RESPUESTA JSON FINAL =====
    v_res := ''{'';
    v_res := v_res || ''\"success\":true,'';
    v_res := v_res || ''\"total_registros\":'' || COALESCE(v_cnt::text, ''0'') || '','';           
    v_res := v_res || ''\"registros_preview\":'' || COALESCE(v_cnt_prev::text, ''0'') || '','';    
    v_res := v_res || ''\"tipo_cambio\":\"'' || COALESCE(p_tipo_modificacion, ''costo'') || ''\",'' ;
    v_res := v_res || ''\"porcentaje_aplicado\":'' || COALESCE(p_porcentaje::text, ''0'') || '','';
    v_res := v_res || ''\"cod_deposito\":'' || COALESCE(v_dep::text, ''1'') || '','';              
    v_res := v_res || ''\"promedio_variacion\":'' || COALESCE(ROUND(prom_vari, 2)::text, ''0'') || '','';
    v_res := v_res || ''\"productos\":'' || v_prod;                        
    v_res := v_res || ''}'';

    RETURN v_res;

EXCEPTION
    WHEN OTHERS THEN
        -- Manejo seguro de errores con información detallada para debugging
        RETURN ''{\"success\":false,\"error\":\"Error en preview: '' || REPLACE(SQLERRM, ''"'', ''\\\"'') || ''\",\"codigo_error\":\"'' || SQLSTATE || ''\"}'';
END;
' LANGUAGE plpgsql;

-- ===================================================================
-- COMENTARIOS DE LOS CAMBIOS REALIZADOS:
-- ===================================================================
-- ✅ AGREGADO: Variable margen_producto para leer el margen de cada artículo
-- ✅ AGREGADO: Variable p_prebsiva_nuevo para cálculo correcto del precio básico
-- ✅ MODIFICADO: Lógica para tipo_modificacion = 'costo' ahora incluye margen
-- ✅ MODIFICADO: Lógica para tipo_modificacion = 'final' ahora considera margen en reversa
-- ✅ AGREGADO: Campo margen en el JSON de respuesta para debugging
-- ✅ CORREGIDO: Secuencia de cálculo: costo → prebsiva (con margen) → precio final (con IVA)
-- ✅ SINTAXIS: Usa comillas simples escapadas como en update_precios_masivo_atomico
-- ✅ CORREGIDO: Eliminados todos los patrones de escape múltiple que causaban errores
-- ===================================================================