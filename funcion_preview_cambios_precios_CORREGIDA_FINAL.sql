-- =====================================================================
-- FUNCIÓN PREVIEW CAMBIOS PRECIOS - VERSIÓN CORREGIDA FINAL
-- SOLUCIONA EL ERROR: "la sintaxis de entrada no es válida para el tipo numeric"
-- FECHA: 11 de Agosto de 2025 - CORRECCIÓN DEFINITIVA
-- =====================================================================

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
    p_act NUMERIC;
    p_nvo NUMERIC;
    aliq_iva NUMERIC;
    vari NUMERIC;
    vari_pct NUMERIC;
    sum_vari NUMERIC := 0;
    prom_vari NUMERIC := 0;
BEGIN
    -- Determinar depósito según sucursal (1=principal, 2=sucursal 5)
    v_dep := CASE WHEN p_sucursal = 5 THEN 2 ELSE 1 END;

    -- Contar productos que cumplen filtros aplicados
    SELECT COUNT(*) INTO v_cnt
    FROM artsucursal a
    WHERE a.cod_deposito = v_dep
      AND (p_marca IS NULL OR a.marca = p_marca)
      AND (p_cd_proveedor IS NULL OR a.cd_proveedor = p_cd_proveedor)
      AND (p_rubro IS NULL OR a.rubro = p_rubro)
      AND (p_cod_iva IS NULL OR a.cod_iva = p_cod_iva);

    -- ===== CONSTRUIR LISTA DE PRODUCTOS (LIMITADO A 50 PARA UI) =====
    v_prod := ''['';
    
    FOR rec IN 
        SELECT a.cd_articulo, a.nomart, a.marca, a.rubro,
               a.precostosi, a.precon, a.cod_iva,
               COALESCE(iva.alicuota1, 21) as alicuota1
        FROM artsucursal a
        LEFT JOIN artiva iva ON a.cod_iva = iva.cod_iva
        WHERE a.cod_deposito = v_dep
          AND (p_marca IS NULL OR a.marca = p_marca)
          AND (p_cd_proveedor IS NULL OR a.cd_proveedor = p_cd_proveedor)
          AND (p_rubro IS NULL OR a.rubro = p_rubro)
          AND (p_cod_iva IS NULL OR a.cod_iva = p_cod_iva)
        ORDER BY a.nomart
        LIMIT 50
    LOOP
        -- CORRECCIÓN 1: Asegurar que todos los valores numéricos sean válidos
        -- Determinar precio base según tipo de modificación
        IF p_tipo_modificacion = ''costo'' THEN
            p_act := COALESCE(rec.precostosi, 0);  -- Modificar precio de costo
        ELSE
            p_act := COALESCE(rec.precon, 0);      -- Modificar precio final
        END IF;

        -- CORRECCIÓN 2: Validar que p_act no sea NULL antes de usar en cálculos
        IF p_act IS NULL THEN
            p_act := 0;
        END IF;

        -- Obtener alícuota de IVA para cálculos (ya viene con COALESCE desde el SELECT)
        aliq_iva := rec.alicuota1;

        -- CORRECCIÓN 3: Validar aliq_iva
        IF aliq_iva IS NULL THEN
            aliq_iva := 21;  -- Valor por defecto
        END IF;

        -- Aplicar porcentaje y calcular precio nuevo
        IF p_tipo_modificacion = ''costo'' THEN
            -- CASO: Modificar precio de costo → calcular precio final con IVA
            p_nvo := p_act * (1 + p_porcentaje / 100.0);           -- Nuevo costo
            p_nvo := p_nvo * (1 + aliq_iva / 100.0);               -- Agregar IVA
        ELSE
            -- CASO: Modificar precio final directamente
            p_nvo := p_act * (1 + p_porcentaje / 100.0);
        END IF;

        -- CORRECCIÓN 4: Validar p_nvo antes de usar en cálculos
        IF p_nvo IS NULL THEN
            p_nvo := 0;
        END IF;

        -- Calcular métricas de variación
        vari := p_nvo - p_act;                                      -- Variación absoluta
        IF p_act > 0 THEN
            vari_pct := (vari / p_act) * 100.0;                    -- Variación porcentual
        ELSE
            vari_pct := 0;
        END IF;

        -- CORRECCIÓN 5: Validar todas las variables antes de usar
        IF vari IS NULL THEN vari := 0; END IF;
        IF vari_pct IS NULL THEN vari_pct := 0; END IF;

        -- Acumular para cálculo de promedios
        sum_vari := sum_vari + vari_pct;

        -- CORRECCIÓN 6: Construir objeto JSON con COALESCE en todos los campos numéricos
        IF primer THEN
            primer := false;
        ELSE
            v_prod := v_prod || '','';
        END IF;
        
        v_prod := v_prod || ''{'' ||
            ''"cd_articulo":"'' || COALESCE(rec.cd_articulo::text, '''') || ''",'' ||
            ''"nomart":"'' || REPLACE(COALESCE(rec.nomart, ''''), ''"'', ''\\"'') || ''",'' ||
            ''"marca":"'' || COALESCE(rec.marca, '''') || ''",'' ||
            ''"rubro":"'' || COALESCE(rec.rubro, '''') || ''",'' ||
            ''"precio_actual":'' || COALESCE(p_act::text, ''0'') || '','' ||
            ''"precio_nuevo":'' || COALESCE(ROUND(p_nvo, 2)::text, ''0'') || '','' ||
            ''"variacion":'' || COALESCE(ROUND(vari, 2)::text, ''0'') || '','' ||
            ''"variacion_porcentaje":'' || COALESCE(ROUND(vari_pct, 2)::text, ''0'') || '','' ||
            ''"cod_iva":'' || COALESCE(rec.cod_iva::text, ''0'') || '','' ||
            ''"alicuota_iva":'' || COALESCE(aliq_iva::text, ''21'') ||
            ''}'';
        
        v_cnt_prev := v_cnt_prev + 1;
    END LOOP;
    v_prod := v_prod || '']'';

    -- Calcular promedio de variación
    IF v_cnt_prev > 0 THEN
        prom_vari := sum_vari / v_cnt_prev;
    END IF;

    -- CORRECCIÓN 7: Validar prom_vari antes de usar
    IF prom_vari IS NULL THEN
        prom_vari := 0;
    END IF;

    -- ===== CONSTRUIR RESPUESTA JSON FINAL CON COALESCE =====
    v_res := ''{'';
    v_res := v_res || ''"success":true,'';
    v_res := v_res || ''"total_registros":'' || COALESCE(v_cnt::text, ''0'') || '','';           
    v_res := v_res || ''"registros_preview":'' || COALESCE(v_cnt_prev::text, ''0'') || '','';    
    v_res := v_res || ''"tipo_cambio":"'' || COALESCE(p_tipo_modificacion, ''costo'') || ''",''; 
    v_res := v_res || ''"porcentaje_aplicado":'' || COALESCE(p_porcentaje::text, ''0'') || '',''; 
    v_res := v_res || ''"cod_deposito":'' || COALESCE(v_dep::text, ''1'') || '','';              
    v_res := v_res || ''"promedio_variacion":'' || COALESCE(ROUND(prom_vari, 2)::text, ''0'') || '',''; 
    v_res := v_res || ''"productos":'' || v_prod;                        
    v_res := v_res || ''}'';

    RETURN v_res;

EXCEPTION WHEN OTHERS THEN
    -- Manejo seguro de errores con información detallada para debugging
    RETURN ''{"success":false,"error":"Error en preview: '' || REPLACE(SQLERRM, ''"'', ''\\"'') || ''","codigo_error":"'' || SQLSTATE || ''"}'';
END;
' LANGUAGE plpgsql;

-- =====================================================================
-- EJEMPLO DE PRUEBA:
-- =====================================================================
-- SELECT preview_cambios_precios('OSAKA', NULL, NULL, NULL, 'costo', 0, 1);
-- =====================================================================

-- =====================================================================  
-- CAMBIOS REALIZADOS PARA CORREGIR EL ERROR:
-- =====================================================================
-- 1. Agregado COALESCE y validaciones NULL en todas las variables numéricas
-- 2. Validación explícita de p_act, p_nvo, vari, vari_pct antes de usar
-- 3. Conversión explícita ::text en concatenaciones JSON
-- 4. COALESCE en todos los campos del JSON final 
-- 5. Valores por defecto seguros para evitar NULL en cálculos
-- 6. Información de debugging mejorada en EXCEPTION
-- 7. Manejo robusto de divisiones por cero y valores inválidos
-- =====================================================================