-- =====================================================
-- CORRECCIÓN DEL JSON EN LA FUNCIÓN POSTGRESQL
-- =====================================================

-- Eliminar función existente
DROP FUNCTION IF EXISTS update_conflista_con_recalculo(integer, integer, boolean, numeric, numeric, numeric, numeric, numeric, numeric, boolean, integer, boolean, character varying, date, boolean, boolean);

-- Crear función con JSON corregido (sin saltos de línea)
CREATE OR REPLACE FUNCTION update_conflista_con_recalculo(
    p_id_conflista INTEGER,
    p_listap INTEGER,
    p_activa BOOLEAN,
    p_precosto21 NUMERIC,
    p_precosto105 NUMERIC,
    p_pordcto NUMERIC,
    p_margen NUMERIC,
    p_preciof21 NUMERIC,
    p_preciof105 NUMERIC,
    p_rmargen BOOLEAN,
    p_tipomone INTEGER,
    p_actprov BOOLEAN,
    p_cod_marca CHARACTER VARYING,
    p_fecha DATE,
    p_recalcular_21 BOOLEAN DEFAULT FALSE,
    p_recalcular_105 BOOLEAN DEFAULT FALSE
) RETURNS TEXT AS '
DECLARE
    v_productos_actualizados_21 INTEGER := 0;
    v_productos_actualizados_105 INTEGER := 0;
    v_campo_precio TEXT;
    v_factor21 NUMERIC;
    v_factor105 NUMERIC;
    v_count_check INTEGER;
    v_affected_rows INTEGER;
BEGIN
    -- Validar que la conflista existe
    SELECT COUNT(*) INTO v_count_check FROM conf_lista WHERE id_conflista = p_id_conflista;
    IF v_count_check = 0 THEN
        RETURN ''{"error":true,"mensaje":"La conflista no existe"}'';
    END IF;

    -- Validar lista de precios
    IF p_listap NOT IN (1, 2, 3, 4) THEN
        RETURN ''{"error":true,"mensaje":"Lista de precios invalida"}'';
    END IF;

    v_campo_precio := ''prefi'' || p_listap;

    -- Actualizar conf_lista
    UPDATE conf_lista SET
        listap = p_listap,
        activa = p_activa,
        precosto21 = p_precosto21,
        precosto105 = p_precosto105,
        pordcto = p_pordcto,
        margen = p_margen,
        preciof21 = p_preciof21,
        preciof105 = p_preciof105,
        rmargen = p_rmargen,
        tipomone = p_tipomone,
        actprov = p_actprov,
        cod_marca = p_cod_marca,
        fecha = p_fecha
    WHERE id_conflista = p_id_conflista;

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    -- Recalcular IVA 21% si es necesario
    IF p_recalcular_21 THEN
        v_factor21 := 1 + (p_preciof21 / 100);

        IF v_campo_precio = ''prefi1'' THEN
            UPDATE artsucursal SET prefi1 = precon * v_factor21
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 21.00)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        ELSIF v_campo_precio = ''prefi2'' THEN
            UPDATE artsucursal SET prefi2 = precon * v_factor21
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 21.00)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        ELSIF v_campo_precio = ''prefi3'' THEN
            UPDATE artsucursal SET prefi3 = precon * v_factor21
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 21.00)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        ELSIF v_campo_precio = ''prefi4'' THEN
            UPDATE artsucursal SET prefi4 = precon * v_factor21
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 21.00)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        END IF;

        GET DIAGNOSTICS v_productos_actualizados_21 = ROW_COUNT;
    END IF;

    -- Recalcular IVA 10.5% si es necesario
    IF p_recalcular_105 THEN
        v_factor105 := 1 + (p_preciof105 / 100);

        IF v_campo_precio = ''prefi1'' THEN
            UPDATE artsucursal SET prefi1 = precon * v_factor105
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 10.50)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        ELSIF v_campo_precio = ''prefi2'' THEN
            UPDATE artsucursal SET prefi2 = precon * v_factor105
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 10.50)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        ELSIF v_campo_precio = ''prefi3'' THEN
            UPDATE artsucursal SET prefi3 = precon * v_factor105
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 10.50)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        ELSIF v_campo_precio = ''prefi4'' THEN
            UPDATE artsucursal SET prefi4 = precon * v_factor105
            WHERE cod_iva IN (SELECT cod_iva FROM artiva WHERE ROUND(alicuota1,2) = 10.50)
              AND tipo_moneda = p_tipomone AND idart = 0 AND precon > 0;
        END IF;

        GET DIAGNOSTICS v_productos_actualizados_105 = ROW_COUNT;
    END IF;

    -- Retornar resultado JSON en una sola línea (SIN saltos de línea)
    RETURN ''{"error":false,"mensaje":"Operacion completada en PostgreSQL","resultados":{"conflista_actualizada":'' ||
           CASE WHEN v_affected_rows > 0 THEN ''true'' ELSE ''false'' END ||
           '',"productos_actualizados_21":'' || v_productos_actualizados_21 ||
           '',"productos_actualizados_105":'' || v_productos_actualizados_105 ||
           ''},"debug":{"motor_transaccional":"PostgreSQL nativo","atomicidad_garantizada":true}}'';

EXCEPTION WHEN OTHERS THEN
    RETURN ''{"error":true,"mensaje":"Error en PostgreSQL: '' || SQLERRM ||
           ''","debug":{"rollback_automatico":true}}'';
END;
' LANGUAGE plpgsql;

-- Prueba para verificar que el JSON es válido
SELECT update_conflista_con_recalculo(
    1, 1, true, 100.00, 80.00, 10.00, 15.00, 16.00, 11.00, 
    false, 1, false, '1', CURRENT_DATE, false, false
) as resultado;