-- ===================================================================
-- FUNCIÓN CORREGIDA: update_precios_masivo - CORRECCIÓN ID_PROVEEDOR
-- ===================================================================
-- Fecha: 13 de Agosto de 2025
-- Problema: El campo id_proveedor no se registra en cactualiza
-- Causa: Búsqueda por cod_prov cuando el frontend envía id_prov
-- Solución: Cambiar búsqueda de cod_prov a id_prov en línea 71
-- Sintaxis: Compatible con PostgreSQL 9.4 (comillas simples + escape)
-- ===================================================================

CREATE OR REPLACE FUNCTION update_precios_masivo(
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
    v_id_act INTEGER;
    v_res TEXT;
    rec RECORD;
    p_act NUMERIC;
    p_nvo_costo NUMERIC;
    p_nvo_final NUMERIC;
    aliq_iva NUMERIC;
    v_id_marca_real INTEGER := NULL;
    v_id_proveedor_real INTEGER := NULL;
    v_id_rubro_real INTEGER := NULL;
    v_tipo_real TEXT;  -- ✅ NUEVA VARIABLE PARA EXTRAER TIPO REAL
BEGIN
    -- ===== VALIDACIONES BÁSICAS =====
    IF p_porcentaje = 0 THEN
        RETURN ''{"success":false,"message":"El porcentaje no puede ser 0"}'';
    END IF;
    
    -- ✅ EXTRAER TIPO REAL DE LA DESCRIPCIÓN
    v_tipo_real := CASE 
        WHEN UPPER(COALESCE(p_tipo_modificacion, '''')) LIKE ''%COSTO%'' THEN ''costo''
        WHEN UPPER(COALESCE(p_tipo_modificacion, '''')) LIKE ''%FINAL%'' THEN ''final''
        ELSE ''costo''  -- Default
    END;

    -- Determinar depósito según sucursal (LÓGICA PROBADA)
    v_dep := CASE WHEN p_sucursal = 5 THEN 2 ELSE 1 END;

    -- ===== BUSCAR IDs REALES PARA AUDITORÍA =====
    -- Buscar ID real de marca si se especificó
    IF p_marca IS NOT NULL THEN
        SELECT id_marca INTO v_id_marca_real
        FROM marcas 
        WHERE TRIM(marca) = TRIM(p_marca)
        LIMIT 1;
    END IF;
    
    -- Buscar ID real de rubro si se especificó
    IF p_rubro IS NOT NULL THEN
        SELECT id_rubro INTO v_id_rubro_real
        FROM rubros 
        WHERE TRIM(cod_rubro) = TRIM(p_rubro)
        LIMIT 1;
    END IF;
    
    -- ✅ CORRECCIÓN: Buscar ID real de proveedor si se especificó
    -- CAMBIO CRÍTICO: cod_prov → id_prov
    IF p_cd_proveedor IS NOT NULL THEN
        SELECT id_prov INTO v_id_proveedor_real
        FROM proveedores 
        WHERE id_prov = p_cd_proveedor;  -- ✅ CORREGIDO: Ahora busca por id_prov
    END IF;

    -- ===== REGISTRO DE AUDITORÍA EN CACTUALIZA (CORREGIDO) =====
    INSERT INTO cactualiza (
        listap,
        tipo,
        porcentaje_21,
        precio_costo,                                                    -- ✅ CORREGIR
        precio_venta,                                                    -- ✅ CORREGIR
        fecha,
        usuario,
        id_moneda,
        id_proveedor,
        id_marca,
        id_rubro
    ) VALUES (
        1,  -- Lista de precios por defecto
        COALESCE(p_tipo_modificacion, ''costo''),                         -- Descripción completa
        COALESCE(ROUND(COALESCE(p_porcentaje, 0), 2), 0),
        CASE WHEN v_tipo_real = ''costo'' THEN 1 ELSE 0 END,             -- ✅ USA v_tipo_real
        CASE WHEN v_tipo_real = ''final'' THEN 1 ELSE 0 END,             -- ✅ USA v_tipo_real
        NOW(),
        COALESCE(p_usuario, ''SYSTEM''),
        1,  -- ID moneda por defecto
        v_id_proveedor_real,  -- ✅ AHORA DEBERÍA FUNCIONAR CORRECTAMENTE
        v_id_marca_real,
        v_id_rubro_real
    );

    -- Obtener ID de la actualización
    v_id_act := currval(''cactualiza_id_act_seq'');

    -- ===== PROCESAMIENTO MASIVO (USAR v_tipo_real) =====
    -- ✅ IMPORTANTE: También corregir aquí la búsqueda de proveedores
    FOR rec IN 
        SELECT 
            id_articulo,
            cd_articulo,
            TRIM(nomart) as nomart,
            COALESCE(precostosi, 0) as precostosi,
            COALESCE(precon, 0) as precon,
            cod_iva
        FROM artsucursal 
        WHERE cod_deposito = v_dep
        AND (p_marca IS NULL OR TRIM(marca) = TRIM(p_marca))
        AND (p_cd_proveedor IS NULL OR cd_proveedor = (
            SELECT cod_prov FROM proveedores WHERE id_prov = p_cd_proveedor LIMIT 1
        ))  -- ✅ CORREGIDO: Buscar cod_proveedor usando id_prov
        AND (p_rubro IS NULL OR TRIM(rubro) = TRIM(p_rubro))
        AND (p_cod_iva IS NULL OR cod_iva = p_cod_iva)
    LOOP
        -- Obtener alícuota de IVA (LÓGICA PROBADA)
        SELECT COALESCE(alicuota1, 21) INTO aliq_iva
        FROM artiva 
        WHERE cod_iva = rec.cod_iva 
        LIMIT 1;
        
        IF aliq_iva IS NULL THEN aliq_iva := 21; END IF;

        -- CALCULAR NUEVOS PRECIOS (USAR v_tipo_real)
        IF v_tipo_real = ''costo'' THEN                                      -- ✅ USA v_tipo_real
            -- Modificar precio de costo, recalcular precio final
            p_act := rec.precostosi;
            p_nvo_costo := p_act * (1 + COALESCE(p_porcentaje, 0) / 100.0);
            p_nvo_final := p_nvo_costo * (1 + aliq_iva / 100.0);
        ELSE
            -- Modificar precio final, recalcular precio de costo
            p_act := rec.precon;
            p_nvo_final := p_act * (1 + COALESCE(p_porcentaje, 0) / 100.0);
            p_nvo_costo := p_nvo_final / (1 + aliq_iva / 100.0);
        END IF;

        -- Validaciones NULL (TÉCNICA PROBADA)
        IF p_nvo_costo IS NULL THEN p_nvo_costo := 0; END IF;
        IF p_nvo_final IS NULL THEN p_nvo_final := 0; END IF;

        -- ===== REGISTRO DETALLADO EN DACTUALIZA CON id_articulo =====
        -- Registrar valores ANTES y DESPUÉS del cambio
        BEGIN
            INSERT INTO dactualiza (
                id_act,
                id_articulo,      -- ✅ CAMPO AGREGADO PARA TRAZABILIDAD
                articulo,
                nombre,
                pcosto,      -- Precio costo ANTERIOR
                precio,      -- Precio final ANTERIOR  
                pfinal,      -- Precio final ANTERIOR (duplicado para compatibilidad)
                pcoston,     -- Precio costo NUEVO
                precion,     -- Precio final NUEVO
                pfinaln,     -- Precio final NUEVO (duplicado para compatibilidad)
                fecha
            ) VALUES (
                v_id_act,
                rec.id_articulo,  -- ✅ REFERENCIA ÚNICA A ARTSUCURSAL
                COALESCE(rec.cd_articulo, 0),
                COALESCE(rec.nomart, ''''),
                COALESCE(rec.precostosi, 0),    -- Precio costo anterior
                COALESCE(rec.precon, 0),        -- Precio final anterior
                COALESCE(rec.precon, 0),        -- Precio final anterior (dup)
                COALESCE(p_nvo_costo, 0),       -- Precio costo nuevo
                COALESCE(p_nvo_final, 0),       -- Precio final nuevo
                COALESCE(p_nvo_final, 0),       -- Precio final nuevo (dup)
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                RETURN ''{"success":false,"message":"Error registrando auditoría producto '' || COALESCE(rec.cd_articulo::text, ''N/A'') || '': '' || REPLACE(SQLERRM, ''"'', ''\\"'') || ''"}'' ;
        END;

        -- ACTUALIZAR PRECIOS EN ARTSUCURSAL
        UPDATE artsucursal SET 
            precostosi = COALESCE(ROUND(COALESCE(p_nvo_costo, 0), 2), 0),
            precon = COALESCE(ROUND(COALESCE(p_nvo_final, 0), 2), 0)
        WHERE id_articulo = rec.id_articulo;

        v_cnt := v_cnt + 1;
    END LOOP;

    -- ===== VALIDACIÓN FINAL =====
    -- Verificar que se procesaron registros
    IF v_cnt = 0 THEN
        RETURN ''{"success":false,"message":"No se encontraron productos que coincidan con los filtros especificados","registros_modificados":0}'';
    END IF;

    -- ===== RESPUESTA EXITOSA =====
    -- Construir JSON de respuesta (USANDO SINTAXIS PROBADA)
    v_res := ''{'';
    v_res := v_res || ''"success":true,'';
    v_res := v_res || ''"message":"Actualización de precios completada exitosamente",'';
    v_res := v_res || ''"registros_modificados":'' || COALESCE(v_cnt::text, ''0'') || '','';           
    v_res := v_res || ''"id_actualizacion":'' || COALESCE(v_id_act::text, ''0'') || '','';
    v_res := v_res || ''"tipo_modificacion":"'' || COALESCE(v_tipo_real, ''costo'') || ''",'';  -- ✅ INCLUYE TIPO REAL
    v_res := v_res || ''"porcentaje_aplicado":'' || COALESCE(ROUND(COALESCE(p_porcentaje, 0), 2)::text, ''0'') || '',''; 
    v_res := v_res || ''"cod_deposito":'' || COALESCE(v_dep::text, ''1'') || '','';              
    v_res := v_res || ''"usuario":"'' || COALESCE(p_usuario, ''SYSTEM'') || ''",'';
    v_res := v_res || ''"timestamp":"'' || NOW()::text || ''"'';
    v_res := v_res || ''}'';

    RETURN v_res;

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback automático + mensaje de error detallado
        RETURN ''{"success":false,"message":"Error durante actualización masiva: '' || REPLACE(SQLERRM, ''"'', ''\\"'') || ''","sqlstate":"'' || SQLSTATE || ''","registros_procesados":'' || COALESCE(v_cnt, 0) || ''}'';
END;
' LANGUAGE plpgsql;

-- ===================================================================
-- COMENTARIOS SOBRE LA CORRECCIÓN ID_PROVEEDOR
-- ===================================================================
-- 1. ✅ LÍNEA 71: Cambiada búsqueda de "cod_prov = p_cd_proveedor" a "id_prov = p_cd_proveedor"
-- 2. ✅ LÍNEAS 113-115: Corregida también la búsqueda en el filtro de productos:
--    Antes: cd_proveedor = p_cd_proveedor (incorrecto)
--    Ahora: cd_proveedor = (SELECT cod_prov FROM proveedores WHERE id_prov = p_cd_proveedor)
-- 3. ✅ LÓGICA: El frontend envía id_prov=198 (INTERBIKE), función busca id_prov=198 → encuentra cod_prov="36"
-- 4. ✅ RESULTADO: v_id_proveedor_real = 198, se registra correctamente en cactualiza.id_proveedor
-- 5. ✅ COMPATIBILIDAD: Mantiene todas las correcciones anteriores (flags precio, usuario, etc.)
-- ===================================================================