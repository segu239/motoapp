<?php
// =====================================================================
// CORRECCIÓN PARA EL ERROR DE PREVIEW - PricePreview_post()
// Reemplazar en Carga.php líneas 2160-2167 con esta versión corregida
// =====================================================================

public function PricePreview_post()
{
    try {
        $data = $this->post();
        
        // Validar datos requeridos
        if (!isset($data['tipo_modificacion']) || !isset($data['porcentaje'])) {
            $this->response([
                'error' => true,
                'mensaje' => 'Faltan parámetros requeridos: tipo_modificacion, porcentaje'
            ], 400);
            return;
        }
        
        // CORRECCIÓN: Preparar parámetros con manejo seguro de valores NULL
        $marca = isset($data['marca']) && !empty($data['marca']) ? $data['marca'] : null;
        
        // Para campos numéricos: solo convertir si existe y no está vacío
        $cd_proveedor = null;
        if (isset($data['cd_proveedor']) && $data['cd_proveedor'] !== '' && $data['cd_proveedor'] !== null) {
            $cd_proveedor = intval($data['cd_proveedor']);
        }
        
        $rubro = isset($data['rubro']) && !empty($data['rubro']) ? $data['rubro'] : null;
        
        $cod_iva = null;
        if (isset($data['cod_iva']) && $data['cod_iva'] !== '' && $data['cod_iva'] !== null) {
            $cod_iva = intval($data['cod_iva']);
        }
        
        $tipo_modificacion = $data['tipo_modificacion'];
        
        // Porcentaje siempre debe tener un valor válido
        $porcentaje = floatval($data['porcentaje']);
        
        $sucursal = isset($data['sucursal']) && $data['sucursal'] !== '' ? intval($data['sucursal']) : 1;
        
        // Debug temporal para verificar parámetros
        error_log("Parámetros para PostgreSQL: marca=" . var_export($marca, true) . 
                  ", cd_proveedor=" . var_export($cd_proveedor, true) . 
                  ", rubro=" . var_export($rubro, true) . 
                  ", cod_iva=" . var_export($cod_iva, true) . 
                  ", tipo=" . var_export($tipo_modificacion, true) . 
                  ", porcentaje=" . var_export($porcentaje, true) . 
                  ", sucursal=" . var_export($sucursal, true));
        
        // Llamar a la función PostgreSQL
        $sql = "SELECT preview_cambios_precios(?, ?, ?, ?, ?, ?, ?) as result";
        $params = array($marca, $cd_proveedor, $rubro, $cod_iva, $tipo_modificacion, $porcentaje, $sucursal);
        
        $query = $this->db->query($sql, $params);
        
        if ($query && $query->num_rows() > 0) {
            $row = $query->row();
            $result = $row->result;
            
            // El resultado ya viene como JSON de PostgreSQL
            $this->response([
                'error' => false,
                'result' => $result
            ]);
        } else {
            $this->response([
                'error' => true,
                'mensaje' => 'No se pudo generar el preview de cambios'
            ], 500);
        }
        
    } catch (Exception $e) {
        error_log("Error en PricePreview_post: " . $e->getMessage());
        $this->response([
            'error' => true,
            'mensaje' => 'Error interno: ' . $e->getMessage()
        ], 500);
    }
}

// =====================================================================
// ENDPOINTS ORIGINALES PARA SISTEMA DE CAMBIO MASIVO DE PRECIOS
// Agregar estos métodos al archivo Carga.php existente
// =====================================================================

/**
 * Obtener opciones de filtros para cambio masivo de precios
 * GET: /Carga/PriceFilterOptions
 */
public function PriceFilterOptions_get()
{
    try {
        // Obtener sucursal del parámetro
        $sucursal = $this->get('sucursal') ? intval($this->get('sucursal')) : 1;
        
        // Llamar función PostgreSQL
        $sql = "SELECT get_price_filter_options(?) as result";
        $query = $this->db->query($sql, array($sucursal));
        
        if ($query && $query->num_rows() > 0) {
            $result = $query->row();
            $data = json_decode($result->result, true);
            
            if ($data && isset($data['success']) && $data['success']) {
                // Obtener listas detalladas para cada filtro
                $marcas = $this->getPriceFilterMarcas($data['cod_deposito']);
                $proveedores = $this->getPriceFilterProveedores($data['cod_deposito']);
                $rubros = $this->getPriceFilterRubros($data['cod_deposito']);
                $tipos_iva = $this->getPriceFilterTiposIva();
                
                $respuesta = array(
                    "error" => false,
                    "mensaje" => "Opciones de filtros obtenidas correctamente",
                    "data" => array(
                        "marcas" => $marcas,
                        "proveedores" => $proveedores, 
                        "rubros" => $rubros,
                        "tipos_iva" => $tipos_iva,
                        "cod_deposito" => $data['cod_deposito'],
                        "total_productos" => $data['total_productos']
                    )
                );
            } else {
                throw new Exception($data['error'] ?? 'Error obteniendo opciones de filtros');
            }
        } else {
            throw new Exception('Error ejecutando función de base de datos');
        }
        
    } catch (Exception $e) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error obteniendo opciones de filtros: " . $e->getMessage()
        );
    }
    
    $this->response($respuesta);
}

/**
 * Preview de cambios masivos de precios
 * GET: /Carga/PricePreview
 */
public function PricePreview_get()
{
    try {
        // Obtener parámetros
        $marca = $this->get('marca');
        $proveedor = $this->get('proveedor') ? intval($this->get('proveedor')) : null;
        $rubro = $this->get('rubro');
        $cod_iva = $this->get('cod_iva') ? intval($this->get('cod_iva')) : null;
        $tipo_cambio = $this->get('tipo_cambio') ?: 'costo';
        $porcentaje = $this->get('porcentaje') ? floatval($this->get('porcentaje')) : 0;
        $sucursal = $this->get('sucursal') ? intval($this->get('sucursal')) : 1;
        $limite = $this->get('limite') ? intval($this->get('limite')) : 50;
        
        // Validar parámetros
        if ($porcentaje < -100 || $porcentaje > 1000) {
            throw new Exception('Porcentaje fuera de rango válido (-100% a +1000%)');
        }
        
        if (!in_array($tipo_cambio, ['costo', 'final'])) {
            throw new Exception('Tipo de cambio debe ser "costo" o "final"');
        }
        
        // Llamar función PostgreSQL
        $sql = "SELECT preview_price_changes(?, ?, ?, ?, ?, ?, ?, ?) as result";
        $params = array(
            $marca, $proveedor, $rubro, $cod_iva, 
            $tipo_cambio, $porcentaje, $sucursal, $limite
        );
        
        $query = $this->db->query($sql, $params);
        
        if ($query && $query->num_rows() > 0) {
            $result = $query->row();
            $data = json_decode($result->result, true);
            
            if ($data && isset($data['success']) && $data['success']) {
                $respuesta = array(
                    "error" => false,
                    "mensaje" => "Preview generado correctamente",
                    "data" => $data
                );
            } else {
                throw new Exception($data['error'] ?? 'Error generando preview');
            }
        } else {
            throw new Exception('Error ejecutando función de preview');
        }
        
    } catch (Exception $e) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error en preview: " . $e->getMessage()
        );
    }
    
    $this->response($respuesta);
}

/**
 * Aplicar cambios masivos de precios
 * POST: /Descarga/PriceUpdate (va en Descarga.php porque modifica datos)
 */
public function PriceUpdate_post()
{
    try {
        // Obtener datos del POST
        $input = json_decode($this->input->raw_input_stream, true);
        
        if (!$input) {
            throw new Exception('Datos JSON inválidos');
        }
        
        $marca = isset($input['marca']) ? $input['marca'] : null;
        $proveedor = isset($input['proveedor']) ? intval($input['proveedor']) : null;
        $rubro = isset($input['rubro']) ? $input['rubro'] : null;
        $cod_iva = isset($input['cod_iva']) ? intval($input['cod_iva']) : null;
        $tipo_cambio = isset($input['tipo_cambio']) ? $input['tipo_cambio'] : 'costo';
        $porcentaje = isset($input['porcentaje']) ? floatval($input['porcentaje']) : 0;
        $sucursal = isset($input['sucursal']) ? intval($input['sucursal']) : 1;
        $usuario = isset($input['usuario']) ? $input['usuario'] : 'sistema';
        
        // Validar parámetros
        if ($porcentaje < -100 || $porcentaje > 1000) {
            throw new Exception('Porcentaje fuera de rango válido (-100% a +1000%)');
        }
        
        if (!in_array($tipo_cambio, ['costo', 'final'])) {
            throw new Exception('Tipo de cambio debe ser "costo" o "final"');
        }
        
        // Validar que al menos un filtro esté presente
        if (empty($marca) && empty($proveedor) && empty($rubro) && empty($cod_iva)) {
            throw new Exception('Debe especificar al menos un filtro (marca, proveedor, rubro o tipo IVA)');
        }
        
        // Llamar función PostgreSQL para aplicar cambios
        $sql = "SELECT apply_price_changes(?, ?, ?, ?, ?, ?, ?, ?) as result";
        $params = array(
            $marca, $proveedor, $rubro, $cod_iva, 
            $tipo_cambio, $porcentaje, $sucursal, $usuario
        );
        
        $query = $this->db->query($sql, $params);
        
        if ($query && $query->num_rows() > 0) {
            $result = $query->row();
            $data = json_decode($result->result, true);
            
            if ($data && isset($data['error']) && $data['error'] === false) {
                $respuesta = array(
                    "error" => false,
                    "mensaje" => $data['mensaje'],
                    "data" => $data
                );
                
                // Log de la operación para auditoría
                log_message('info', "Cambio masivo de precios - Usuario: $usuario, Tipo: $tipo_cambio, Porcentaje: $porcentaje%, Registros: " . $data['registros_modificados']);
                
            } else {
                throw new Exception($data['mensaje'] ?? 'Error aplicando cambios de precios');
            }
        } else {
            throw new Exception('Error ejecutando función de actualización');
        }
        
    } catch (Exception $e) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error aplicando cambios: " . $e->getMessage()
        );
        
        // Log del error
        log_message('error', "Error en cambio masivo de precios: " . $e->getMessage());
    }
    
    $this->response($respuesta);
}

// =====================================================================
// MÉTODOS AUXILIARES PRIVADOS
// =====================================================================

/**
 * Obtener marcas disponibles para filtros
 */
private function getPriceFilterMarcas($cod_deposito)
{
    $sql = "SELECT DISTINCT marca as value, marca as label 
            FROM artsucursal 
            WHERE cod_deposito = ? AND marca IS NOT NULL AND marca != '' 
            ORDER BY marca";
    
    $query = $this->db->query($sql, array($cod_deposito));
    return $query ? $query->result_array() : array();
}

/**
 * Obtener proveedores disponibles para filtros  
 */
private function getPriceFilterProveedores($cod_deposito)
{
    $sql = "SELECT DISTINCT cd_proveedor as value, 
            CONCAT('Proveedor ', cd_proveedor) as label 
            FROM artsucursal 
            WHERE cod_deposito = ? AND cd_proveedor IS NOT NULL 
            ORDER BY cd_proveedor";
    
    $query = $this->db->query($sql, array($cod_deposito));
    return $query ? $query->result_array() : array();
}

/**
 * Obtener rubros disponibles para filtros
 */
private function getPriceFilterRubros($cod_deposito)
{
    $sql = "SELECT DISTINCT rubro as value, rubro as label 
            FROM artsucursal 
            WHERE cod_deposito = ? AND rubro IS NOT NULL AND rubro != '' 
            ORDER BY rubro";
    
    $query = $this->db->query($sql, array($cod_deposito));
    return $query ? $query->result_array() : array();
}

/**
 * Obtener tipos de IVA disponibles para filtros
 */
private function getPriceFilterTiposIva()
{
    $sql = "SELECT cod_iva as value, 
            CONCAT(TRIM(descripcion), ' (', alicuota1, '%)') as label 
            FROM artiva 
            WHERE cod_iva IS NOT NULL 
            ORDER BY cod_iva";
    
    $query = $this->db->query($sql);
    return $query ? $query->result_array() : array();
}

?>

<!-- 
=====================================================================
INSTRUCCIONES PARA IMPLEMENTAR:

1. Agregar los métodos PriceFilterOptions_get() y PricePreview_get() 
   al archivo Carga.php existente

2. Agregar el método PriceUpdate_post() al archivo Descarga.php 
   (porque modifica datos)

3. Agregar los métodos privados auxiliares al final del archivo 
   correspondiente

4. Las URLs resultantes serán:
   - GET  /Carga/PriceFilterOptions
   - GET  /Carga/PricePreview  
   - POST /Descarga/PriceUpdate

5. Registrar estas URLs en el archivo ini.ts del frontend
=====================================================================
-->