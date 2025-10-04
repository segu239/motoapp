-- =====================================================================
-- FUNCIÓN DE OPCIONES DE FILTROS - VERSIÓN DEFINITIVA CORREGIDA
-- =====================================================================
CREATE OR REPLACE FUNCTION get_price_filter_options(
    p_sucursal INTEGER DEFAULT 1
) RETURNS TEXT AS '
DECLARE
    v_cod_deposito INTEGER;
    v_count INTEGER;
    v_marcas TEXT;
    v_proveedores TEXT;
    v_rubros TEXT;
    v_tipos_iva TEXT;
    v_resultado TEXT;
    rec RECORD;
    primera_marca BOOLEAN := true;
    primer_proveedor BOOLEAN := true;
    primer_rubro BOOLEAN := true;
    primer_tipo_iva BOOLEAN := true;
BEGIN
    -- Determinar depósito según sucursal
    v_cod_deposito := CASE WHEN p_sucursal = 5 THEN 2 ELSE 1 END;
    
    -- Contar productos en este depósito
    SELECT COUNT(*) INTO v_count FROM artsucursal WHERE cod_deposito = v_cod_deposito;
    
    -- ===== CONSTRUIR LISTA DE MARCAS =====
    v_marcas := ''['';
    FOR rec IN SELECT DISTINCT marca FROM artsucursal 
               WHERE cod_deposito = v_cod_deposito AND marca IS NOT NULL AND marca != ''''
               ORDER BY marca
    LOOP
        IF primera_marca THEN
            primera_marca := false;
        ELSE
            v_marcas := v_marcas || '','';
        END IF;
        v_marcas := v_marcas || ''{\"value\":\"'' || rec.marca || ''\",\"label\":\"'' || rec.marca || ''\"}'';
    END LOOP;
    v_marcas := v_marcas || '']'';
    
    -- ===== CONSTRUIR LISTA DE PROVEEDORES (CORREGIDO: JOIN con id_prov) =====
    v_proveedores := ''['';
    FOR rec IN SELECT DISTINCT a.cd_proveedor, p.nombre FROM artsucursal a
               LEFT JOIN proveedores p ON a.cd_proveedor = p.id_prov
               WHERE a.cod_deposito = v_cod_deposito AND a.cd_proveedor IS NOT NULL
               ORDER BY p.nombre NULLS LAST
    LOOP
        IF primer_proveedor THEN
            primer_proveedor := false;
        ELSE
            v_proveedores := v_proveedores || '','';
        END IF;
        v_proveedores := v_proveedores || ''{\"value\":'' || rec.cd_proveedor || '',\"label\":\"'' || COALESCE(TRIM(rec.nombre), ''Sin nombre ID '' || rec.cd_proveedor) || ''\"}'';
    END LOOP;
    v_proveedores := v_proveedores || '']'';
    
    -- ===== CONSTRUIR LISTA DE RUBROS =====
    v_rubros := ''['';
    FOR rec IN SELECT DISTINCT rubro FROM artsucursal 
               WHERE cod_deposito = v_cod_deposito AND rubro IS NOT NULL AND rubro != ''''
               ORDER BY rubro
    LOOP
        IF primer_rubro THEN
            primer_rubro := false;
        ELSE
            v_rubros := v_rubros || '','';
        END IF;
        v_rubros := v_rubros || ''{\"value\":\"'' || rec.rubro || ''\",\"label\":\"'' || rec.rubro || ''\"}'';
    END LOOP;
    v_rubros := v_rubros || '']'';
    
    -- ===== CONSTRUIR LISTA DE TIPOS IVA (TODOS LOS DISPONIBLES) =====
    v_tipos_iva := ''['';
    FOR rec IN SELECT cod_iva, descripcion, alicuota1 FROM artiva
               ORDER BY cod_iva
    LOOP
        IF primer_tipo_iva THEN
            primer_tipo_iva := false;
        ELSE
            v_tipos_iva := v_tipos_iva || '','';
        END IF;
        v_tipos_iva := v_tipos_iva || ''{\"value\":'' || rec.cod_iva || '',\"label\":\"'' || TRIM(rec.descripcion) || '' ('' || rec.alicuota1 || ''%)\"}'';
    END LOOP;
    v_tipos_iva := v_tipos_iva || '']'';
    
    -- ===== CONSTRUIR JSON FINAL =====
    v_resultado := ''{'';
    v_resultado := v_resultado || ''\"success\":true,'';
    v_resultado := v_resultado || ''\"cod_deposito\":'' || v_cod_deposito || '','';
    v_resultado := v_resultado || ''\"total_productos\":'' || v_count || '','';
    v_resultado := v_resultado || ''\"marcas\":'' || v_marcas || '','';
    v_resultado := v_resultado || ''\"proveedores\":'' || v_proveedores || '','';
    v_resultado := v_resultado || ''\"rubros\":'' || v_rubros || '','';
    v_resultado := v_resultado || ''\"tipos_iva\":'' || v_tipos_iva;
    v_resultado := v_resultado || ''}'';
    
    RETURN v_resultado;
    
EXCEPTION WHEN OTHERS THEN
    RETURN ''{\"success\":false,\"error\":\"Error obteniendo filtros: '' || SQLERRM || ''\"}'';
END;
' LANGUAGE plpgsql;