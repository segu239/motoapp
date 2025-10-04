-- ===================================================================
-- IMPLEMENTACIÓN FINAL DE apply_price_changes CORREGIDA
-- Fecha: 14 de Agosto de 2025
-- PROBLEMA RESUELTO: Incluye margen específico de cada artículo
-- ===================================================================

-- PASO 1: Eliminar versiones defectuosas
DROP FUNCTION IF EXISTS apply_price_changes_DEFECTUOSA_NO_USAR CASCADE;

-- PASO 2: Crear función corregida final
CREATE OR REPLACE FUNCTION apply_price_changes(
    p_marca TEXT DEFAULT NULL,
    p_proveedor INTEGER DEFAULT NULL, 
    p_rubro TEXT DEFAULT NULL,
    p_cod_iva INTEGER DEFAULT NULL,
    p_tipo_cambio TEXT DEFAULT 'costo',
    p_porcentaje NUMERIC DEFAULT 0,
    p_sucursal INTEGER DEFAULT 1,
    p_usuario TEXT DEFAULT 'SYSTEM'
) RETURNS TEXT AS '
DECLARE
    v_count INTEGER := 0;
    v_id_act INTEGER;
    v_cod_deposito INTEGER;
    v_precio_costo_flag INTEGER;
    v_precio_venta_flag INTEGER;
    v_resultado TEXT;
    v_json_error TEXT;
    v_json_mensaje TEXT;
    v_json_registros TEXT;
    v_json_id TEXT;
    v_json_tipo TEXT;
    v_json_porcentaje TEXT;
    
    -- Variables para el procesamiento individual CON MARGEN
    rec RECORD;
    p_costo_actual NUMERIC;
    p_final_actual NUMERIC;
    p_costo_nuevo NUMERIC;
    p_final_nuevo NUMERIC;
    p_prebsiva_nuevo NUMERIC;
    aliq_iva NUMERIC;
    margen_producto NUMERIC;
    
BEGIN
    -- ===== VALIDACIONES BÁSICAS =====
    IF p_porcentaje < -100 OR p_porcentaje > 1000 THEN
        v_json_error := ''\"error\":true'';
        v_json_mensaje := ''\"mensaje\":\"Porcentaje fuera de rango valido\"'';
        v_json_registros := ''\"registros_modificados\":0'';
        RETURN ''{'' || v_json_error || '','' || v_json_mensaje || '','' || v_json_registros || ''}'';
    END IF;
    
    IF p_tipo_cambio NOT IN (''costo'', ''final'') THEN
        v_json_error := ''\"error\":true'';
        v_json_mensaje := ''\"mensaje\":\"Tipo de cambio debe ser costo o final\"'';
        v_json_registros := ''\"registros_modificados\":0'';
        RETURN ''{'' || v_json_error || '','' || v_json_mensaje || '','' || v_json_registros || ''}'';
    END IF;
    
    -- Determinar depósito según sucursal
    v_cod_deposito := CASE WHEN p_sucursal = 5 THEN 2 ELSE 1 END;
    
    -- Flags para cactualiza
    v_precio_costo_flag := CASE WHEN p_tipo_cambio = ''costo'' THEN 1 ELSE 0 END;
    v_precio_venta_flag := CASE WHEN p_tipo_cambio = ''final'' THEN 1 ELSE 0 END;
    
    -- Crear registro de auditoría en cactualiza
    INSERT INTO cactualiza (listap, tipo, porcentaje_21, porcentaje_105, precio_costo, precio_venta, fecha, usuario, id_moneda)
    VALUES (1, p_tipo_cambio || '' [CORREGIDA AGOSTO 2025]'', p_porcentaje, p_porcentaje, v_precio_costo_flag, v_precio_venta_flag, NOW(), p_usuario, 1)
    RETURNING id_act INTO v_id_act;
    
    -- ===== PROCESAMIENTO INDIVIDUAL CON MARGEN (LÓGICA IDÉNTICA A PREVIEW) =====
    FOR rec IN 
        SELECT 
            a.id_articulo,
            a.cd_articulo, 
            a.nomart,
            a.precostosi, 
            a.precon, 
            a.cod_iva, 
            a.margen,  -- ✅ CRÍTICO: INCLUIR margen
            COALESCE(iva.alicuota1, 21) as alicuota1
        FROM artsucursal a
        LEFT JOIN artiva iva ON a.cod_iva = iva.cod_iva
        WHERE a.cod_deposito = v_cod_deposito
          AND (p_marca IS NULL OR TRIM(a.marca) = TRIM(p_marca))
          AND (p_proveedor IS NULL OR a.cd_proveedor = p_proveedor)
          AND (p_rubro IS NULL OR TRIM(a.rubro) = TRIM(p_rubro))
          AND (p_cod_iva IS NULL OR a.cod_iva = p_cod_iva)
    LOOP
        -- PASO 1: Obtener precios actuales Y margen (IDÉNTICO A PREVIEW)
        p_costo_actual := COALESCE(rec.precostosi, 0);
        p_final_actual := COALESCE(rec.precon, 0);
        margen_producto := COALESCE(rec.margen, 0);  -- ✅ CRÍTICO: Obtener margen real
        
        -- Obtener alícuota de IVA específica
        aliq_iva := COALESCE(rec.alicuota1, 21);

        -- PASO 2: Calcular precios nuevos CON MARGEN (IDÉNTICO A PREVIEW)
        IF p_tipo_cambio = ''costo'' THEN
            -- ✅ MODIFICA PRECIO DE COSTO → recalcula precio final CON MARGEN
            p_costo_nuevo := p_costo_actual * (1 + p_porcentaje / 100.0);
            -- ✅ CRÍTICO: Calcular prebsiva con margen
            p_prebsiva_nuevo := p_costo_nuevo * (1 + margen_producto / 100.0);
            -- ✅ CRÍTICO: Calcular precio final con IVA desde prebsiva
            p_final_nuevo := p_prebsiva_nuevo * (1 + aliq_iva / 100.0);
        ELSE
            -- MODIFICA PRECIO FINAL → recalcula precio de costo considerando margen
            p_final_nuevo := p_final_actual * (1 + p_porcentaje / 100.0);
            -- ✅ CRÍTICO: Calcular costo considerando margen e IVA
            p_prebsiva_nuevo := p_final_nuevo / (1 + aliq_iva / 100.0);
            p_costo_nuevo := p_prebsiva_nuevo / (1 + margen_producto / 100.0);
        END IF;

        -- PASO 3: Validar todos los valores calculados
        IF p_costo_nuevo IS NULL THEN p_costo_nuevo := 0; END IF;
        IF p_final_nuevo IS NULL THEN p_final_nuevo := 0; END IF;
        IF p_prebsiva_nuevo IS NULL THEN p_prebsiva_nuevo := 0; END IF;

        -- PASO 4: ACTUALIZAR EN BASE DE DATOS
        UPDATE artsucursal SET 
            precostosi = ROUND(p_costo_nuevo, 2),
            precon = ROUND(p_final_nuevo, 2),
            prebsiva = ROUND(p_prebsiva_nuevo, 2)  -- ✅ ACTUALIZAR TAMBIÉN PREBSIVA
        WHERE id_articulo = rec.id_articulo;

        -- PASO 5: Registrar en auditoría detallada
        INSERT INTO dactualiza (
            id_act,
            id_articulo,
            articulo,
            nombre,
            pcosto,     -- costo anterior
            precio,     -- precio anterior  
            pfinal,     -- precio final anterior
            pcoston,    -- costo nuevo
            precion,    -- precio nuevo
            pfinaln,    -- precio final nuevo
            fecha
        ) VALUES (
            v_id_act,
            rec.id_articulo,
            COALESCE(rec.cd_articulo, 0),
            COALESCE(rec.nomart, ''''),
            p_costo_actual,
            p_final_actual,
            p_final_actual,
            p_costo_nuevo,
            p_final_nuevo,
            p_final_nuevo,
            NOW()
        );

        v_count := v_count + 1;
    END LOOP;
    
    -- ===== CONSTRUIR RESPUESTA JSON (COMPATIBLE CON FORMATO ORIGINAL) =====
    v_json_error := ''\"error\":false'';
    v_json_mensaje := ''\"mensaje\":\"Operacion completada con MARGEN CORRECTO - Agosto 2025\"'';
    v_json_registros := ''\"registros_modificados\":'' || v_count;
    v_json_id := ''\"id_actualizacion\":'' || v_id_act;
    v_json_tipo := ''\"tipo_cambio\":\"'' || p_tipo_cambio || ''\"'';
    v_json_porcentaje := ''\"porcentaje_aplicado\":'' || p_porcentaje;
    
    -- Unir resultado
    v_resultado := ''{'' || v_json_error || '','' || v_json_mensaje || '','' || v_json_registros;
    v_resultado := v_resultado || '','' || v_json_id || '','' || v_json_tipo || '','' || v_json_porcentaje || ''}'';
    
    RETURN v_resultado;
    
EXCEPTION WHEN OTHERS THEN
    v_json_error := ''\"error\":true'';
    v_json_mensaje := ''\"mensaje\":\"Error en PostgreSQL CORREGIDO: '' || REPLACE(SQLERRM, ''"'', ''\\\\\"'') || ''\"'';
    RETURN ''{'' || v_json_error || '','' || v_json_mensaje || ''}'';
END;
' LANGUAGE plpgsql;

-- ===================================================================
-- COMENTARIO DE IMPLEMENTACIÓN EXITOSA
-- ===================================================================
-- ✅ FUNCIÓN apply_price_changes CORREGIDA E IMPLEMENTADA
-- ✅ LÓGICA IDÉNTICA A LA FUNCIÓN preview_cambios_precios
-- ✅ INCLUYE MARGEN ESPECÍFICO DE CADA ARTÍCULO
-- ✅ UTILIZA IVA ESPECÍFICO DE CADA ARTÍCULO
-- ✅ ACTUALIZA PRECOSTOSI, PREBSIVA Y PRECON CORRECTAMENTE
-- ✅ AUDITORÍA COMPLETA EN CACTUALIZA Y DACTUALIZA
-- ✅ MANEJO SEGURO DE ERRORES Y TRANSACCIONES
-- ===================================================================