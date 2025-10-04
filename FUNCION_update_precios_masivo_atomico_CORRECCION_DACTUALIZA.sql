-- =====================================================
-- FUNCIÓN CORREGIDA: update_precios_masivo_atomico
-- FECHA: 18 de Agosto de 2025
-- CORRECCIÓN CRÍTICA: Campos precio y precion en tabla dactualiza
-- PROBLEMA RESUELTO: 
--   - Campo 'precio' debe mostrar presbsiva (precio básico sin IVA)
--   - Campo 'precion' debe mostrar precon * margen
-- VERSIÓN: CORRECCION_DACTUALIZA_20250818
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
    -- ✅ NUEVAS VARIABLES PARA CÁLCULO CORREGIDO
    v_precion_actual NUMERIC;
    v_precion_nuevo NUMERIC;
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
        COALESCE(p_tipo_modificacion, ''costo'') || '' [DACTUALIZA CORREGIDO]'',
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

        -- ✅ CÁLCULO CORREGIDO PARA PRECION
        -- precion = precon * margen (actual y nuevo)
        v_precion_actual := COALESCE(rec.precon, 0) * (1 + margen_producto / 100.0);
        v_precion_nuevo := COALESCE(p_nvo_final, 0) * (1 + margen_producto / 100.0);

        -- ===== REGISTRO DETALLADO EN DACTUALIZA CON CORRECCIÓN =====
        INSERT INTO dactualiza (
            id_act, id_articulo, articulo, nombre, pcosto, precio, pfinal,
            pcoston, precion, pfinaln, fecha
        ) VALUES (
            v_id_act, 
            rec.id_articulo, 
            COALESCE(rec.cd_articulo, 0),
            COALESCE(rec.nomart, ''''), 
            COALESCE(rec.precostosi, 0),
            -- ✅ CORRECCIÓN 1: Campo ''precio'' debe mostrar prebsiva (precio básico sin IVA)
            COALESCE(rec.prebsiva, 0), 
            COALESCE(rec.precon, 0),
            COALESCE(p_nvo_costo, 0), 
            -- ✅ CORRECCIÓN 2: Campo ''precion'' debe mostrar precon * margen
            COALESCE(v_precion_nuevo, 0),
            COALESCE(p_nvo_final, 0), 
            NOW()
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

        v_cnt := v_cnt + 1;
        v_cnt_prefi_actualizados := v_cnt_prefi_actualizados + 1;
        
        -- Agregar artículo a la lista de modificados
        v_articulos_modificados := v_articulos_modificados || rec.id_articulo::INTEGER;
        
        -- Agregar tipo de moneda si no está ya en la lista
        IF NOT (rec.tipo_moneda = ANY(v_tipos_moneda_modificados)) THEN
            v_tipos_moneda_modificados := v_tipos_moneda_modificados || rec.tipo_moneda::INTEGER;
        END IF;
    END LOOP;

    -- ===== RESULTADO FINAL =====
    v_res := ''{"success":true,"message":"Actualización masiva completada correctamente","productos_modificados":'' || v_cnt || 
              '',"prefi_actualizados":'' || v_cnt_prefi_actualizados || 
              '',"auditoria_id":'' || v_id_act || 
              '',"tipos_moneda_afectados":'' || array_length(v_tipos_moneda_modificados, 1) || 
              '',"dactualiza_corregido":true}'';
              
    RETURN v_res;

EXCEPTION
    WHEN OTHERS THEN
        v_error_msg := SQLERRM;
        RETURN ''{"success":false,"message":"Error en actualización masiva: '' || replace(v_error_msg, ''"'', ''\"'') || ''"}'';
END;
' LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS DE LA CORRECCIÓN:
-- =====================================================
-- 
-- ANTES (INCORRECTO):
-- precio = rec.precon (precio contado final)
-- precion = p_nvo_final (precio final nuevo)
--
-- DESPUÉS (CORREGIDO):
-- precio = rec.prebsiva (precio básico sin IVA) 
-- precion = precon * margen (precio contado con margen aplicado)
--
-- =====================================================