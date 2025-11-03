# 🧪 PLAN COMPLETO: BASE DE PRUEBAS AISLADA - MOTOAPP

## 📋 ÍNDICE

1. [Introducción y Objetivos](#introducción-y-objetivos)
2. [Arquitectura del Ambiente de Pruebas](#arquitectura-del-ambiente-de-pruebas)
3. [Componentes del Sistema](#componentes-del-sistema)
4. [FASE 1: Base de Datos PostgreSQL](#fase-1-base-de-datos-postgresql)
5. [FASE 2: Backend PHP (CodeIgniter)](#fase-2-backend-php-codeigniter)
6. [FASE 3: Frontend Angular](#fase-3-frontend-angular)
7. [FASE 4: Procedimientos de Prueba](#fase-4-procedimientos-de-prueba)
8. [FASE 5: Limpieza y Mantenimiento](#fase-5-limpieza-y-mantenimiento)
9. [FASE 6: Rollback y Contingencia](#fase-6-rollback-y-contingencia)
10. [Checklist de Implementación](#checklist-de-implementación)

---

## 📖 INTRODUCCIÓN Y OBJETIVOS

### Objetivo Principal
Crear un ambiente de pruebas completamente aislado que permita realizar pruebas de funcionalidad sin afectar los datos de producción de MotoApp.

### Alcance
- **Base de datos:** Tablas de prueba independientes
- **Backend:** Archivos PHP separados (CargaTest.php, DescargaTest.php)
- **Frontend:** Configuración para seleccionar ambiente (producción/pruebas)
- **Datos:** Subset de 100 artículos de sucursal 1 + clientes de prueba

### Principios de Diseño
1. ✅ **Aislamiento Total:** Cero impacto en producción
2. ✅ **Reversibilidad:** Fácil de crear y eliminar
3. ✅ **Identificación Clara:** Sucursal 99 = Pruebas
4. ✅ **Sin Modificar Producción:** Archivos PHP separados
5. ✅ **Datos Realistas:** Subset de datos reales

---

## 🏗️ ARQUITECTURA DEL AMBIENTE DE PRUEBAS

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    AMBIENTE DE PRODUCCIÓN                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  factcab1    │  │  factcab2    │  │  factcab3-5  │          │
│  │  psucursal1  │  │  psucursal2  │  │  psucursal3-5│          │
│  │  recibos1    │  │  recibos2    │  │  recibos3-5  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │            artsucursal (COMPARTIDA)                 │        │
│  │  exi1 | exi2 | exi3 | exi4 | exi5                  │        │
│  │  Stock de todas las sucursales en columnas         │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  caja_movi (COMPARTIDA)                             │        │
│  │  clisuc (COMPARTIDA)                                │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘

                            ↓ AISLAMIENTO TOTAL ↓

┌─────────────────────────────────────────────────────────────────┐
│              AMBIENTE DE PRUEBAS (SUCURSAL 99)                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              test_factcab99                         │        │
│  │              test_psucursal99                       │        │
│  │              test_recibos99                         │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         test_artsucursal (AISLADA)                  │        │
│  │  Copia de 100 artículos de sucursal 1              │        │
│  │  exi1 | exi2 | exi3 | exi4 | exi5                  │        │
│  │  Stock independiente para pruebas                   │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  test_caja_movi (AISLADA)                           │        │
│  │  Clientes de prueba en clisuc (IDs negativos)       │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
PRODUCCIÓN:
Angular → Carga.php/Descarga.php → factcab1, artsucursal (exi1)

PRUEBAS:
Angular → CargaTest.php/DescargaTest.php → test_factcab99, test_artsucursal (exi99)
```

---

## 🔧 COMPONENTES DEL SISTEMA

### Base de Datos (PostgreSQL)

| Tabla Producción | Tabla Prueba | Descripción |
|---|---|---|
| factcab1 | test_factcab99 | Facturas/Comprobantes |
| psucursal1 | test_psucursal99 | Detalles de ventas |
| recibos1 | test_recibos99 | Recibos de pago |
| artsucursal | test_artsucursal | Artículos y stock |
| caja_movi | test_caja_movi | Movimientos de caja |
| clisuc | clisuc (IDs < 0) | Clientes (compartida con marcadores) |

### Backend PHP (CodeIgniter)

| Archivo Producción | Archivo Prueba | Ruta |
|---|---|---|
| Carga.php | CargaTest.php | APIAND/controllers/CargaTest.php |
| Descarga.php | DescargaTest.php | APIAND/controllers/DescargaTest.php |

### Frontend Angular

| Componente | Modificación |
|---|---|
| src/app/config/ini.ts | Agregar URLs de prueba |
| src/app/services/*.service.ts | Agregar métodos para ambiente test |
| Componentes UI | Toggle para seleccionar ambiente |

---

## 📊 FASE 1: BASE DE DATOS POSTGRESQL

### 1.1 Script de Creación Completo

**Archivo:** `scripts/01_crear_ambiente_pruebas.sql`

```sql
-- ============================================================================
-- SCRIPT: Creación de Ambiente de Pruebas - MotoApp
-- Fecha: 2025-01-10
-- Descripción: Crea todas las tablas necesarias para pruebas (Sucursal 99)
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 1: CREAR TABLAS DE PRUEBA PARA SUCURSAL 99
-- ────────────────────────────────────────────────────────────────────────────

-- Tabla de facturas/comprobantes
CREATE TABLE test_factcab99 (LIKE factcab1 INCLUDING ALL);
COMMENT ON TABLE test_factcab99 IS 'Tabla de facturas para pruebas - Sucursal 99';

-- Tabla de detalles de ventas/pedidos
CREATE TABLE test_psucursal99 (LIKE psucursal1 INCLUDING ALL);
COMMENT ON TABLE test_psucursal99 IS 'Tabla de detalles de ventas para pruebas - Sucursal 99';

-- Tabla de recibos
CREATE TABLE test_recibos99 (LIKE recibos1 INCLUDING ALL);
COMMENT ON TABLE test_recibos99 IS 'Tabla de recibos para pruebas - Sucursal 99';

-- Tabla de movimientos de caja
CREATE TABLE test_caja_movi (LIKE caja_movi INCLUDING ALL);
COMMENT ON TABLE test_caja_movi IS 'Tabla de movimientos de caja para pruebas';

-- ────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 2: CREAR TABLA DE ARTÍCULOS DE PRUEBA (CRÍTICO)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE test_artsucursal (LIKE artsucursal INCLUDING ALL);
COMMENT ON TABLE test_artsucursal IS 'Tabla de artículos aislada para pruebas';

-- ────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 3: POBLAR TABLA DE ARTÍCULOS (100 artículos de sucursal 1)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO test_artsucursal
SELECT * FROM artsucursal
WHERE estado = 'A'           -- Solo artículos activos
  AND exi1 > 0               -- Con stock en sucursal 1
  AND cd_deposito IS NOT NULL
ORDER BY id_articulo
LIMIT 100;

-- Agregar columna exi99 para sucursal de prueba
ALTER TABLE test_artsucursal ADD COLUMN IF NOT EXISTS exi99 NUMERIC DEFAULT 10;
ALTER TABLE test_artsucursal ADD COLUMN IF NOT EXISTS stkmin99 NUMERIC DEFAULT 5;
ALTER TABLE test_artsucursal ADD COLUMN IF NOT EXISTS stkmax99 NUMERIC DEFAULT 50;
ALTER TABLE test_artsucursal ADD COLUMN IF NOT EXISTS stkprep99 NUMERIC DEFAULT 5;

-- Resetear stocks a valores de prueba conocidos
UPDATE test_artsucursal
SET exi1 = 10,
    exi2 = 10,
    exi3 = 10,
    exi4 = 10,
    exi5 = 10,
    exi99 = 10,
    stkmin99 = 5,
    stkmax99 = 50,
    stkprep99 = 5;

-- ────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 4: CREAR CLIENTES DE PRUEBA
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO clisuc (
    cliente, nombre, direccion, dni, cuit,
    cod_iva, tipoiva, estado, n_sucursal, id_suc,
    fecha, hora
) VALUES
    (-9999, 'TEST - Cliente Prueba A', 'Calle Test 123', 11111111, 20111111119,
     1, 'CONSUMIDOR FINAL', 'A', 99, 99,
     CURRENT_DATE, TO_CHAR(CURRENT_TIME, 'HH24:MI:SS')),
    (-9998, 'TEST - Cliente Prueba B', 'Calle Test 456', 22222222, 20222222229,
     1, 'CONSUMIDOR FINAL', 'A', 99, 99,
     CURRENT_DATE, TO_CHAR(CURRENT_TIME, 'HH24:MI:SS')),
    (-9997, 'TEST - Cliente Prueba C', 'Calle Test 789', 33333333, 20333333339,
     2, 'RESPONSABLE INSCRIPTO', 'A', 99, 99,
     CURRENT_DATE, TO_CHAR(CURRENT_TIME, 'HH24:MI:SS')),
    (-9996, 'TEST - Cliente Mayorista', 'Avenida Test 1000', 44444444, 20444444449,
     2, 'RESPONSABLE INSCRIPTO', 'A', 99, 99,
     CURRENT_DATE, TO_CHAR(CURRENT_TIME, 'HH24:MI:SS'));

-- ────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 5: CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_test_artsucursal_idart ON test_artsucursal(idart);
CREATE INDEX IF NOT EXISTS idx_test_artsucursal_cd_articulo ON test_artsucursal(cd_articulo);
CREATE INDEX IF NOT EXISTS idx_test_artsucursal_estado ON test_artsucursal(estado);

CREATE INDEX IF NOT EXISTS idx_test_factcab99_cliente ON test_factcab99(cliente);
CREATE INDEX IF NOT EXISTS idx_test_factcab99_emitido ON test_factcab99(emitido);

CREATE INDEX IF NOT EXISTS idx_test_psucursal99_idart ON test_psucursal99(idart);
CREATE INDEX IF NOT EXISTS idx_test_psucursal99_fecha ON test_psucursal99(fecha);

-- ────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 6: CREAR VISTA DE MONITOREO
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_monitoreo_pruebas AS
SELECT
    'test_factcab99' as tabla,
    COUNT(*) as total_registros,
    MAX(emitido) as ultima_operacion,
    SUM(basico + iva1 + iva2 + iva3) as total_ventas
FROM test_factcab99
UNION ALL
SELECT
    'test_psucursal99',
    COUNT(*),
    MAX(fecha),
    SUM(cantidad * precio)
FROM test_psucursal99
UNION ALL
SELECT
    'test_recibos99',
    COUNT(*),
    MAX(fecha),
    SUM(importe)
FROM test_recibos99
UNION ALL
SELECT
    'test_caja_movi',
    COUNT(*),
    MAX(fecha_mov),
    SUM(importe_mov)
FROM test_caja_movi
UNION ALL
SELECT
    'test_artsucursal',
    COUNT(*),
    NULL,
    SUM(exi99)
FROM test_artsucursal;

COMMENT ON VIEW v_monitoreo_pruebas IS 'Vista para monitorear actividad en ambiente de pruebas';

-- ────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 7: VERIFICACIÓN DE CREACIÓN
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_count_factcab INTEGER;
    v_count_psucursal INTEGER;
    v_count_recibos INTEGER;
    v_count_artsucursal INTEGER;
    v_count_clientes INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_factcab FROM test_factcab99;
    SELECT COUNT(*) INTO v_count_psucursal FROM test_psucursal99;
    SELECT COUNT(*) INTO v_count_recibos FROM test_recibos99;
    SELECT COUNT(*) INTO v_count_artsucursal FROM test_artsucursal;
    SELECT COUNT(*) INTO v_count_clientes FROM clisuc WHERE cliente < 0;

    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ AMBIENTE DE PRUEBAS CREADO EXITOSAMENTE';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE 'test_factcab99:    % registros', v_count_factcab;
    RAISE NOTICE 'test_psucursal99:  % registros', v_count_psucursal;
    RAISE NOTICE 'test_recibos99:    % registros', v_count_recibos;
    RAISE NOTICE 'test_artsucursal:  % registros', v_count_artsucursal;
    RAISE NOTICE 'Clientes prueba:   % registros', v_count_clientes;
    RAISE NOTICE '════════════════════════════════════════════════════════';

    IF v_count_artsucursal < 100 THEN
        RAISE WARNING 'Se esperaban 100 artículos pero se crearon %', v_count_artsucursal;
    END IF;

    IF v_count_clientes < 4 THEN
        RAISE WARNING 'Se esperaban 4 clientes de prueba pero se crearon %', v_count_clientes;
    END IF;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- SCRIPT FINALIZADO
-- Para consultar el estado: SELECT * FROM v_monitoreo_pruebas;
-- ════════════════════════════════════════════════════════════════════════════
```

### 1.2 Script de Verificación

**Archivo:** `scripts/02_verificar_ambiente_pruebas.sql`

```sql
-- ============================================================================
-- SCRIPT: Verificación de Ambiente de Pruebas
-- ============================================================================

-- Verificar existencia de tablas
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as tamaño
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE 'test_%'
ORDER BY tablename;

-- Verificar cantidad de registros
SELECT * FROM v_monitoreo_pruebas ORDER BY tabla;

-- Verificar artículos de prueba
SELECT
    COUNT(*) as total_articulos,
    COUNT(DISTINCT marca) as total_marcas,
    COUNT(DISTINCT rubro) as total_rubros,
    AVG(exi99) as promedio_stock_99,
    MIN(exi99) as stock_minimo,
    MAX(exi99) as stock_maximo
FROM test_artsucursal;

-- Verificar clientes de prueba
SELECT
    cliente,
    nombre,
    n_sucursal,
    estado
FROM clisuc
WHERE cliente < 0
ORDER BY cliente DESC;

-- Verificar columna exi99
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'test_artsucursal'
    AND column_name LIKE 'exi%'
ORDER BY column_name;
```

---

## 💻 FASE 2: BACKEND PHP (CODEIGNITER)

### 2.1 Estructura de Archivos

```
APIAND/
├── controllers/
│   ├── Carga.php              (PRODUCCIÓN - NO TOCAR)
│   ├── Descarga.php           (PRODUCCIÓN - NO TOCAR)
│   ├── CargaTest.php          ✅ NUEVO
│   └── DescargaTest.php       ✅ NUEVO
├── config/
│   └── routes.php             (agregar rutas test)
└── libraries/
    └── REST_Controller.php    (existente)
```

### 2.2 Archivo CargaTest.php

**Archivo:** `APIAND/controllers/CargaTest.php`

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once(APPPATH.'/libraries/REST_Controller.php');
use Restserver\libraries\REST_Controller;

/**
 * CargaTest Controller
 *
 * Controlador para operaciones de LECTURA en ambiente de pruebas
 * Sucursal 99 - Totalmente aislado de producción
 *
 * @version 1.0.0
 * @date 2025-01-10
 */
class CargaTest extends REST_Controller {

    public function __construct()
    {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: PUT, GET, POST, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Content-Length, Accept-Encoding");

        parent::__construct();
        $this->load->database();

        // Log de acceso a ambiente de pruebas
        log_message('info', '🧪 CargaTest: Acceso a controlador de pruebas');
    }

    /**
     * Obtiene artículos del ambiente de pruebas
     * Similar a Artsucursal_get() pero usa test_artsucursal
     */
    public function ArtsucursalTest_get()
    {
        // Parámetros de paginación
        $search = $this->get('search');
        $page = $this->get('page') ? intval($this->get('page')) : 1;
        $limit = $this->get('limit') ? intval($this->get('limit')) : 50;
        $offset = ($page - 1) * $limit;

        // Ordenamiento
        $sortField = $this->get('sortField');
        $sortOrder = $this->get('sortOrder') ? intval($this->get('sortOrder')) : 1;

        // Filtros
        $columnFilters = $this->get('filters');
        $filters = array();
        if (!empty($columnFilters)) {
            $filters = json_decode($columnFilters, true);
        }

        // ✅ DIFERENCIA CLAVE: Usar tabla de pruebas
        $this->db->from('test_artsucursal');

        // Aplicar filtros de búsqueda
        if (!empty($search)) {
            $search_escaped = $this->db->escape_like_str($search);

            $where = "(
                nomart ILIKE '%{$search_escaped}%' OR
                CAST(cd_articulo AS TEXT) ILIKE '%{$search_escaped}%' OR
                cd_barra ILIKE '%{$search_escaped}%' OR
                marca ILIKE '%{$search_escaped}%' OR
                rubro ILIKE '%{$search_escaped}%'
            )";

            $this->db->where($where);
        }

        // Ordenamiento
        if (!empty($sortField)) {
            $direction = ($sortOrder === 1) ? 'ASC' : 'DESC';
            $this->db->order_by($sortField, $direction);
        } else {
            $this->db->order_by('nomart', 'ASC');
        }

        // Contar total
        $total_query = clone $this->db;
        $total = $total_query->count_all_results();

        // Aplicar paginación
        $this->db->limit($limit, $offset);

        // Ejecutar consulta
        $query = $this->db->get();
        $resp = $query->result_array();

        if (isset($resp)){
            $respuesta = array(
                "error" => false,
                "mensaje" => array(
                    "data" => $resp,
                    "total" => $total,
                    "page" => $page,
                    "limit" => $limit,
                    "total_pages" => ceil($total / $limit),
                    "ambiente" => "PRUEBAS", // ✅ Identificador
                    "sucursal" => 99
                )
            );
            $this->response($respuesta);
        }
        else
        {
            $respuesta = array(
                "error" => true,
                "mensaje" => "Error al obtener artículos de prueba"
            );
            $this->response($respuesta);
        }
    }

    /**
     * Obtiene clientes de prueba (IDs negativos)
     */
    public function ClisucTest_get()
    {
        $search = $this->get('search');

        $this->db->from('clisuc');
        $this->db->where('cliente <', 0); // ✅ Solo clientes de prueba
        $this->db->where('n_sucursal', 99); // ✅ Sucursal 99

        if (!empty($search)) {
            $search_escaped = $this->db->escape_like_str($search);
            $this->db->where("nombre ILIKE '%{$search_escaped}%'");
        }

        $query = $this->db->get();
        $resp = $query->result_array();

        $respuesta = array(
            "error" => false,
            "mensaje" => $resp,
            "ambiente" => "PRUEBAS",
            "total_clientes" => count($resp)
        );

        $this->response($respuesta);
    }

    /**
     * Obtiene facturas de prueba
     */
    public function FacturasTest_get()
    {
        $this->db->from('test_factcab99');
        $this->db->order_by('emitido', 'DESC');
        $this->db->limit(100);

        $query = $this->db->get();
        $resp = $query->result_array();

        $respuesta = array(
            "error" => false,
            "mensaje" => $resp,
            "ambiente" => "PRUEBAS",
            "sucursal" => 99
        );

        $this->response($respuesta);
    }

    /**
     * Obtiene estado del ambiente de pruebas
     */
    public function EstadoAmbienteTest_get()
    {
        $query = $this->db->query("SELECT * FROM v_monitoreo_pruebas ORDER BY tabla");
        $monitoreo = $query->result_array();

        // Obtener información adicional
        $query_articulos = $this->db->query("
            SELECT
                COUNT(*) as total,
                COUNT(DISTINCT marca) as marcas,
                COUNT(DISTINCT rubro) as rubros,
                ROUND(AVG(exi99), 2) as stock_promedio
            FROM test_artsucursal
        ");
        $info_articulos = $query_articulos->row_array();

        $respuesta = array(
            "error" => false,
            "ambiente" => "PRUEBAS",
            "sucursal" => 99,
            "monitoreo" => $monitoreo,
            "articulos" => $info_articulos,
            "fecha_consulta" => date('Y-m-d H:i:s')
        );

        $this->response($respuesta);
    }
}
```

### 2.3 Archivo DescargaTest.php (Parte 1/3)

**Archivo:** `APIAND/controllers/DescargaTest.php`

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once(APPPATH.'/libraries/REST_Controller.php');
use Restserver\libraries\REST_Controller;

/**
 * DescargaTest Controller
 *
 * Controlador para operaciones de ESCRITURA en ambiente de pruebas
 * Sucursal 99 - Totalmente aislado de producción
 *
 * IMPORTANTE: Este controlador modifica SOLO tablas test_*
 *
 * @version 1.0.0
 * @date 2025-01-10
 */
class DescargaTest extends REST_Controller {

    // Constantes para identificar ambiente
    const AMBIENTE = 'PRUEBAS';
    const SUCURSAL_TEST = 99;

    public function __construct()
    {
        header("Access-Control-Allow-Origin:*");
        header("Access-Control-Allow-Methods:PUT, GET, POST, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers:Content-Type, Content-Length, Accept-Encoding");

        parent::__construct();
        $this->load->database();

        // Log de acceso a ambiente de pruebas
        log_message('info', '🧪 DescargaTest: Acceso a controlador de pruebas');
    }

    /**
     * Helper: Obtener nombre de tabla de pruebas
     */
    private function getTestTable($base_name, $sucursal = null)
    {
        // Tablas sin sucursal
        if ($base_name === 'artsucursal' || $base_name === 'caja_movi') {
            return 'test_' . $base_name;
        }

        // Tablas con sucursal (siempre usar 99)
        $suc = $sucursal ? $sucursal : self::SUCURSAL_TEST;
        return 'test_' . $base_name . $suc;
    }

    /**
     * Inserta pedido completo en ambiente de pruebas
     * Equivalente a PedidossucxappCompleto_post() de Descarga.php
     */
    public function PedidoCompletoTest_post()
    {
        $data = $this->post();

        if (isset($data) && count($data) > 0) {
            $pedidos = isset($data["pedidos"]) ? $data["pedidos"] : null;
            $cabecera = isset($data["cabecera"]) ? $data["cabecera"] : null;
            $caja_movi = isset($data["caja_movi"]) ? $data["caja_movi"] : null;

            if ($pedidos && $cabecera) {
                // ✅ Usar tablas de prueba
                $tabla_psucursal = $this->getTestTable('psucursal');
                $tabla_factcab = $this->getTestTable('factcab');
                $tabla_artsucursal = $this->getTestTable('artsucursal');
                $tabla_caja_movi = $this->getTestTable('caja_movi');

                log_message('info', "🧪 Insertando pedido en: {$tabla_factcab}, {$tabla_psucursal}");

                $this->db->trans_start();

                $contador_exitosas = 0;

                // 1. Insertar detalles en psucursal
                foreach ($pedidos as $pedido) {
                    // Validar datos numéricos
                    if (isset($pedido['cantidad'])) {
                        $pedido['cantidad'] = floatval($pedido['cantidad']);
                    }
                    if (isset($pedido['precio'])) {
                        $pedido['precio'] = floatval($pedido['precio']);
                    }

                    $insert_result = $this->db->insert($tabla_psucursal, $pedido);

                    if ($insert_result) {
                        $contador_exitosas++;

                        // ✅ Actualizar stock en test_artsucursal
                        if (isset($pedido['idart']) && isset($pedido['cantidad'])) {
                            $this->db->set('exi99', 'exi99 - ' . floatval($pedido['cantidad']), FALSE);
                            $this->db->where('idart', $pedido['idart']);
                            $this->db->update($tabla_artsucursal);
                        }
                    } else {
                        log_message('error', '🧪 Error al insertar pedido en ' . $tabla_psucursal);
                        $this->db->trans_rollback();
                        $this->response(array(
                            "error" => true,
                            "mensaje" => "Error al insertar pedido, transacción revertida"
                        ), REST_Controller::HTTP_INTERNAL_ERROR);
                        return;
                    }
                }

                // 2. Insertar cabecera en factcab
                $insert_cabecera = $this->db->insert($tabla_factcab, $cabecera);

                if (!$insert_cabecera) {
                    log_message('error', '🧪 Error al insertar cabecera en ' . $tabla_factcab);
                    $this->db->trans_rollback();
                    $this->response(array(
                        "error" => true,
                        "mensaje" => "Error al insertar cabecera"
                    ), REST_Controller::HTTP_INTERNAL_ERROR);
                    return;
                }

                $id_num_cabecera = $this->db->insert_id();

                // 3. Insertar movimiento de caja (opcional)
                if ($caja_movi) {
                    try {
                        $caja_movi['num_operacion'] = $id_num_cabecera;
                        $caja_movi['sucursal'] = self::SUCURSAL_TEST;
                        $this->db->insert($tabla_caja_movi, $caja_movi);

                        log_message('info', '🧪 Movimiento de caja insertado en ' . $tabla_caja_movi);
                    } catch (Exception $e) {
                        log_message('error', '🧪 Error al insertar caja_movi: ' . $e->getMessage());
                        // No hacer rollback, permitir continuar
                    }
                }

                $this->db->trans_complete();

                if ($this->db->trans_status() === FALSE) {
                    $this->response(array(
                        "error" => true,
                        "mensaje" => "Error en la transacción"
                    ), REST_Controller::HTTP_INTERNAL_ERROR);
                } else {
                    $respuesta = array(
                        "error" => false,
                        "mensaje" => "Pedido de prueba insertado exitosamente",
                        "detalles_insertados" => $contador_exitosas,
                        "id_factura" => $id_num_cabecera,
                        "ambiente" => self::AMBIENTE,
                        "sucursal" => self::SUCURSAL_TEST
                    );
                    $this->response($respuesta, REST_Controller::HTTP_CREATED);
                }
            } else {
                $this->response(array(
                    "error" => true,
                    "mensaje" => "Faltan datos: pedidos o cabecera"
                ), REST_Controller::HTTP_BAD_REQUEST);
            }
        } else {
            $this->response(array(
                "error" => true,
                "mensaje" => "No se recibieron datos en el POST"
            ), REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Actualiza stock en ambiente de pruebas
     * Equivalente a UpdateArtsucxapp_post()
     */
    public function UpdateStockTest_post()
    {
        $data = $this->post();

        if(isset($data) AND count($data)>0){
            $idart = $data['idart'];
            $op = $data["op"]; // '+' o '-'
            $cantidad = isset($data['cantidad']) ? intval($data['cantidad']) : 1;

            // ✅ Usar tabla de pruebas y columna exi99
            $tabla = $this->getTestTable('artsucursal');
            $campo = 'exi99';  // ✅ Siempre usar exi99 para pruebas

            if(isset($idart)){
                if($op === '+')
                {
                    $this->db->set($campo, "$campo + $cantidad", FALSE);
                }
                else if ($op === '-')
                {
                    $this->db->set($campo, "$campo - $cantidad", FALSE);
                }

                $this->db->where('idart', $idart);
                $this->db->update($tabla);
                $rows = $this->db->affected_rows();

                log_message('info', "🧪 Stock actualizado: idart={$idart}, op={$op}, cantidad={$cantidad}");

                $respuesta=array(
                    "error"=>false,
                    "mensaje"=>$rows,
                    "tabla"=>$tabla,
                    "campo"=>$campo,
                    "ambiente" => self::AMBIENTE
                );
                $this->response($respuesta);
            }
            else{
                $respuesta=array(
                    "error"=>true,
                    "mensaje"=>"No se especificó el artículo"
                );
                $this->response($respuesta,REST_Controller::HTTP_BAD_REQUEST);
            }
        }
        else{
            $respuesta=array(
                "error"=>true,
                "mensaje"=>"Faltan datos en el POST"
            );
            $this->response($respuesta,REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Inserta o actualiza cliente de prueba
     */
    public function ClienteTest_post()
    {
        $data = $this->post();

        if(isset($data) AND count($data)>0){
            $cliente_data = $data['cliente'];

            // ✅ Forzar ID negativo y sucursal 99
            if (!isset($cliente_data['cliente']) || $cliente_data['cliente'] >= 0) {
                $cliente_data['cliente'] = -1 * abs($cliente_data['cliente']);
            }

            $cliente_data['n_sucursal'] = self::SUCURSAL_TEST;
            $cliente_data['id_suc'] = self::SUCURSAL_TEST;

            // Verificar si existe
            $id_cli = $cliente_data['cliente'];
            $this->db->where('cliente', $id_cli);
            $query = $this->db->get('clisuc');

            if($query->num_rows() > 0) {
                // Actualizar
                $this->db->where('cliente', $id_cli);
                $this->db->update('clisuc', $cliente_data);
                $mensaje = "Cliente de prueba actualizado";
            } else {
                // Insertar
                $this->db->insert('clisuc', $cliente_data);
                $mensaje = "Cliente de prueba creado";
            }

            $rows = $this->db->affected_rows();

            $respuesta = array(
                "error" => false,
                "mensaje" => $mensaje,
                "registros_afectados" => $rows,
                "cliente_id" => $id_cli,
                "ambiente" => self::AMBIENTE
            );

            $this->response($respuesta, REST_Controller::HTTP_OK);
        }
        else{
            $respuesta = array(
                "error" => true,
                "mensaje" => "Faltan datos del cliente"
            );
            $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Resetea el ambiente de pruebas (limpieza)
     */
    public function ResetearAmbienteTest_post()
    {
        $data = $this->post();

        // ✅ Seguridad: Requerir confirmación
        if (!isset($data['confirmar']) || $data['confirmar'] !== 'SI_ESTOY_SEGURO') {
            $this->response(array(
                "error" => true,
                "mensaje" => "Se requiere confirmación explícita para resetear"
            ), REST_Controller::HTTP_BAD_REQUEST);
            return;
        }

        try {
            $this->db->trans_start();

            // Truncar tablas
            $this->db->query("TRUNCATE test_factcab99, test_psucursal99, test_recibos99, test_caja_movi");

            // Resetear stocks
            $this->db->query("UPDATE test_artsucursal SET exi99 = 10, stkprep99 = 5");

            $this->db->trans_complete();

            if ($this->db->trans_status() === FALSE) {
                throw new Exception("Error al resetear ambiente");
            }

            log_message('info', '🧪 Ambiente de pruebas reseteado');

            $this->response(array(
                "error" => false,
                "mensaje" => "Ambiente de pruebas reseteado exitosamente",
                "ambiente" => self::AMBIENTE
            ), REST_Controller::HTTP_OK);

        } catch (Exception $e) {
            log_message('error', '🧪 Error al resetear: ' . $e->getMessage());

            $this->response(array(
                "error" => true,
                "mensaje" => "Error al resetear ambiente: " . $e->getMessage()
            ), REST_Controller::HTTP_INTERNAL_ERROR);
        }
    }
}
```

### 2.4 Configuración de Rutas

**Archivo:** `APIAND/config/routes.php`

```php
// Agregar al final del archivo de rutas

// ============================================================================
// RUTAS PARA AMBIENTE DE PRUEBAS
// ============================================================================

// Rutas de lectura (CargaTest)
$route['CargaTest/ArtsucursalTest'] = 'CargaTest/ArtsucursalTest_get';
$route['CargaTest/ClisucTest'] = 'CargaTest/ClisucTest_get';
$route['CargaTest/FacturasTest'] = 'CargaTest/FacturasTest_get';
$route['CargaTest/EstadoAmbienteTest'] = 'CargaTest/EstadoAmbienteTest_get';

// Rutas de escritura (DescargaTest)
$route['DescargaTest/PedidoCompletoTest'] = 'DescargaTest/PedidoCompletoTest_post';
$route['DescargaTest/UpdateStockTest'] = 'DescargaTest/UpdateStockTest_post';
$route['DescargaTest/ClienteTest'] = 'DescargaTest/ClienteTest_post';
$route['DescargaTest/ResetearAmbienteTest'] = 'DescargaTest/ResetearAmbienteTest_post';
```

---

## 🎨 FASE 3: FRONTEND ANGULAR

### 3.1 Configuración de URLs de Prueba

**Archivo:** `src/app/config/ini.ts`

```typescript
// ════════════════════════════════════════════════════════════════════════════
// URLS AMBIENTE DE PRODUCCIÓN (existentes - no modificar)
// ════════════════════════════════════════════════════════════════════════════
export const Urllogin="https://motoapp.loclx.io/APIAND/index.php/Login";
export const Urlartsucursal= "https://motoapp.loclx.io/APIAND/index.php/Carga/Artsucursal";
export const UrlclisucxappWeb= "https://motoapp.loclx.io/APIAND/index.php/Descarga/ClisucxappWeb";
// ... (resto de URLs existentes)

// ════════════════════════════════════════════════════════════════════════════
// URLS AMBIENTE DE PRUEBAS (NUEVO) - Sucursal 99
// ════════════════════════════════════════════════════════════════════════════

// Lectura (CargaTest)
export const UrlArtsucursalTest = "https://motoapp.loclx.io/APIAND/index.php/CargaTest/ArtsucursalTest";
export const UrlClisucTest = "https://motoapp.loclx.io/APIAND/index.php/CargaTest/ClisucTest";
export const UrlFacturasTest = "https://motoapp.loclx.io/APIAND/index.php/CargaTest/FacturasTest";
export const UrlEstadoAmbienteTest = "https://motoapp.loclx.io/APIAND/index.php/CargaTest/EstadoAmbienteTest";

// Escritura (DescargaTest)
export const UrlPedidoCompletoTest = "https://motoapp.loclx.io/APIAND/index.php/DescargaTest/PedidoCompletoTest";
export const UrlUpdateStockTest = "https://motoapp.loclx.io/APIAND/index.php/DescargaTest/UpdateStockTest";
export const UrlClienteTest = "https://motoapp.loclx.io/APIAND/index.php/DescargaTest/ClienteTest";
export const UrlResetearAmbienteTest = "https://motoapp.loclx.io/APIAND/index.php/DescargaTest/ResetearAmbienteTest";

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE AMBIENTE
// ════════════════════════════════════════════════════════════════════════════
export const AMBIENTE_PRODUCCION = 'produccion';
export const AMBIENTE_PRUEBAS = 'pruebas';
```

### 3.2 Servicio de Ambiente

**Archivo (NUEVO):** `src/app/services/ambiente.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Ambiente = 'produccion' | 'pruebas';

@Injectable({
  providedIn: 'root'
})
export class AmbienteService {

  private ambienteActual = new BehaviorSubject<Ambiente>('produccion');
  public ambiente$: Observable<Ambiente> = this.ambienteActual.asObservable();

  constructor() {
    // Cargar ambiente guardado
    const ambienteGuardado = localStorage.getItem('ambiente_motoapp') as Ambiente;
    if (ambienteGuardado) {
      this.ambienteActual.next(ambienteGuardado);
    }
  }

  getAmbiente(): Ambiente {
    return this.ambienteActual.value;
  }

  setAmbiente(ambiente: Ambiente): void {
    this.ambienteActual.next(ambiente);
    localStorage.setItem('ambiente_motoapp', ambiente);
    console.log(`🎯 Ambiente cambiado a: ${ambiente.toUpperCase()}`);
  }

  esPruebas(): boolean {
    return this.ambienteActual.value === 'pruebas';
  }

  esProduccion(): boolean {
    return this.ambienteActual.value === 'produccion';
  }

  toggleAmbiente(): Ambiente {
    const nuevoAmbiente: Ambiente = this.esPruebas() ? 'produccion' : 'pruebas';
    this.setAmbiente(nuevoAmbiente);
    return nuevoAmbiente;
  }
}
```

### 3.3 Modificar Servicio de Carga de Datos

**Archivo:** `src/app/services/cargardata.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AmbienteService } from './ambiente.service';

// Importar URLs
import {
  // Producción
  Urlartsucursal,
  UrlclisucxappWeb,
  UrlpedidossucxappCompleto,
  UpdateArtsucxappWeb,

  // Pruebas
  UrlArtsucursalTest,
  UrlClisucTest,
  UrlPedidoCompletoTest,
  UrlUpdateStockTest
} from '../config/ini';

@Injectable({
  providedIn: 'root'
})
export class CargardataService {

  constructor(
    private http: HttpClient,
    private ambienteService: AmbienteService
  ) { }

  /**
   * Obtener artículos según ambiente activo
   */
  getArticulos(params: any): Observable<any> {
    const url = this.ambienteService.esPruebas()
      ? UrlArtsucursalTest
      : Urlartsucursal;

    return this.http.get(url, { params });
  }

  /**
   * Obtener clientes según ambiente activo
   */
  getClientes(params: any): Observable<any> {
    const url = this.ambienteService.esPruebas()
      ? UrlClisucTest
      : UrlclisucxappWeb;

    return this.http.get(url, { params });
  }

  /**
   * Insertar pedido completo según ambiente activo
   */
  insertarPedidoCompleto(pedidoData: any): Observable<any> {
    const url = this.ambienteService.esPruebas()
      ? UrlPedidoCompletoTest
      : UrlpedidossucxappCompleto;

    // Agregar identificador de ambiente
    const payload = {
      ...pedidoData,
      ambiente: this.ambienteService.getAmbiente()
    };

    return this.http.post(url, payload);
  }

  /**
   * Actualizar stock según ambiente activo
   */
  actualizarStock(data: any): Observable<any> {
    const url = this.ambienteService.esPruebas()
      ? UrlUpdateStockTest
      : UpdateArtsucxappWeb;

    return this.http.post(url, data);
  }

  /**
   * Resetear ambiente de pruebas
   * SOLO disponible en ambiente de pruebas
   */
  resetearAmbientePruebas(): Observable<any> {
    if (!this.ambienteService.esPruebas()) {
      throw new Error('Reseteo solo disponible en ambiente de pruebas');
    }

    return this.http.post(UrlResetearAmbienteTest, {
      confirmar: 'SI_ESTOY_SEGURO'
    });
  }
}
```

### 3.4 Componente Selector de Ambiente

**Archivo (NUEVO):** `src/app/shared/ambiente-selector/ambiente-selector.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { AmbienteService, Ambiente } from '../../services/ambiente.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ambiente-selector',
  template: `
    <div class="ambiente-selector">
      <p-toggleButton
        [(ngModel)]="esPruebas"
        (onChange)="cambiarAmbiente()"
        onLabel="🧪 MODO PRUEBAS"
        offLabel="✅ MODO PRODUCCIÓN"
        onIcon="pi pi-flask"
        offIcon="pi pi-check-circle"
        [style]="{'width':'220px'}"
        [styleClass]="esPruebas ? 'p-button-warning' : 'p-button-success'">
      </p-toggleButton>

      <p-message
        *ngIf="esPruebas"
        severity="warn"
        [text]="mensajeAmbiente"
        [style]="{'margin-left': '10px'}">
      </p-message>

      <button
        *ngIf="esPruebas"
        pButton
        type="button"
        label="Resetear Ambiente"
        icon="pi pi-refresh"
        class="p-button-sm p-button-danger"
        (click)="confirmarReseteo()"
        [style]="{'margin-left': '10px'}">
      </button>
    </div>
  `,
  styles: [`
    .ambiente-selector {
      display: flex;
      align-items: center;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 15px;
    }

    ::ng-deep .p-togglebutton.p-button-warning {
      animation: pulso 2s ease-in-out infinite;
    }

    @keyframes pulso {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `]
})
export class AmbienteSelectorComponent implements OnInit {

  esPruebas: boolean = false;
  mensajeAmbiente: string = '';

  constructor(
    private ambienteService: AmbienteService,
    private cargardataService: CargardataService
  ) {}

  ngOnInit(): void {
    this.esPruebas = this.ambienteService.esPruebas();
    this.actualizarMensaje();

    // Suscribirse a cambios de ambiente
    this.ambienteService.ambiente$.subscribe(ambiente => {
      this.esPruebas = ambiente === 'pruebas';
      this.actualizarMensaje();
    });
  }

  cambiarAmbiente(): void {
    const nuevoAmbiente = this.esPruebas ? 'pruebas' : 'produccion';

    Swal.fire({
      title: '¿Cambiar ambiente?',
      html: `
        <div style="text-align: left;">
          <p>Vas a cambiar al ambiente:</p>
          <h3 style="color: ${this.esPruebas ? '#ff9800' : '#4caf50'};">
            ${this.esPruebas ? '🧪 PRUEBAS' : '✅ PRODUCCIÓN'}
          </h3>
          <p><strong>Todas las operaciones se realizarán en este ambiente.</strong></p>
          ${this.esPruebas ? '<p style="color: #ff5722;">⚠️ Los datos de prueba son temporales</p>' : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: this.esPruebas ? '#ff9800' : '#4caf50'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ambienteService.setAmbiente(nuevoAmbiente);

        Swal.fire({
          title: 'Ambiente cambiado',
          text: `Ahora estás en ${nuevoAmbiente.toUpperCase()}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // Revertir toggle
        this.esPruebas = !this.esPruebas;
      }
    });
  }

  confirmarReseteo(): void {
    Swal.fire({
      title: '⚠️ Resetear Ambiente de Pruebas',
      html: `
        <div style="text-align: left;">
          <p>Esta acción eliminará:</p>
          <ul>
            <li>✗ Todas las facturas de prueba</li>
            <li>✗ Todos los pedidos de prueba</li>
            <li>✗ Todos los recibos de prueba</li>
            <li>✗ Movimientos de caja de prueba</li>
          </ul>
          <p style="color: #4caf50;">✓ Los stocks se resetearán a 10 unidades</p>
          <p><strong>Los datos de producción NO se verán afectados</strong></p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.resetearAmbiente();
      }
    });
  }

  private resetearAmbiente(): void {
    Swal.fire({
      title: 'Reseteando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.cargardataService.resetearAmbientePruebas().subscribe({
      next: (response) => {
        Swal.fire({
          title: '✅ Ambiente reseteado',
          text: 'El ambiente de pruebas ha sido limpiado exitosamente',
          icon: 'success'
        });
      },
      error: (error) => {
        console.error('Error al resetear:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo resetear el ambiente de pruebas',
          icon: 'error'
        });
      }
    });
  }

  private actualizarMensaje(): void {
    this.mensajeAmbiente = this.esPruebas
      ? '⚠️ Operando en SUCURSAL 99 (Pruebas)'
      : '✅ Operando en ambiente de producción';
  }
}
```

### 3.5 Integrar Selector en Componentes

**Ejemplo:** `src/app/components/puntoventa/puntoventa.component.html`

```html
<!-- Agregar al inicio del componente -->
<app-ambiente-selector></app-ambiente-selector>

<!-- Resto del contenido existente -->
<div class="grid">
  <!-- ... contenido existente ... -->
</div>
```

---

## ✅ FASE 4: PROCEDIMIENTOS DE PRUEBA

### 4.1 Prueba de Conectividad

**Script:** `scripts/03_prueba_conectividad.sql`

```sql
-- Verificar que las tablas existen y están accesibles
\dt test_*

-- Probar SELECT en cada tabla
SELECT 'test_artsucursal' as tabla, COUNT(*) as registros FROM test_artsucursal;
SELECT 'test_factcab99' as tabla, COUNT(*) as registros FROM test_factcab99;
SELECT 'test_psucursal99' as tabla, COUNT(*) as registros FROM test_psucursal99;
SELECT 'test_recibos99' as tabla, COUNT(*) as registros FROM test_recibos99;
SELECT 'test_caja_movi' as tabla, COUNT(*) as registros FROM test_caja_movi;

-- Verificar vista de monitoreo
SELECT * FROM v_monitoreo_pruebas;
```

### 4.2 Prueba de Inserción Manual

```sql
-- Insertar un pedido de prueba manualmente
BEGIN;

-- 1. Insertar en psucursal
INSERT INTO test_psucursal99 (
    idart, cantidad, precio, idcli, fecha, hora, nomart
) VALUES (
    (SELECT idart FROM test_artsucursal LIMIT 1),
    2,
    150.50,
    -9999,
    CURRENT_DATE,
    TO_CHAR(CURRENT_TIME, 'HH24:MI:SS'),
    'Producto de Prueba'
);

-- 2. Insertar en factcab
INSERT INTO test_factcab99 (
    tipo, numero_fac, cliente, emitido, basico, iva1, estado
) VALUES (
    'FC', 1, -9999, CURRENT_DATE, 150.50, 31.61, 'A'
);

-- 3. Actualizar stock
UPDATE test_artsucursal
SET exi99 = exi99 - 2
WHERE idart = (SELECT idart FROM test_artsucursal LIMIT 1);

COMMIT;

-- Verificar
SELECT * FROM v_monitoreo_pruebas;
```

### 4.3 Prueba desde Postman

**Endpoint:** POST `https://motoapp.loclx.io/APIAND/index.php/DescargaTest/PedidoCompletoTest`

**Body (JSON):**
```json
{
  "pedidos": [
    {
      "idart": 1,
      "cantidad": 2,
      "precio": 150.50,
      "idcli": -9999,
      "fecha": "2025-01-10",
      "hora": "14:30:00",
      "nomart": "Producto Test"
    }
  ],
  "cabecera": {
    "tipo": "FC",
    "numero_fac": 1,
    "cliente": -9999,
    "emitido": "2025-01-10",
    "basico": 150.50,
    "iva1": 31.61,
    "estado": "A"
  },
  "caja_movi": {
    "codigo_mov": 1,
    "fecha_mov": "2025-01-10",
    "importe_mov": 182.11,
    "descripcion_mov": "Venta de prueba"
  }
}
```

**Respuesta Esperada:**
```json
{
  "error": false,
  "mensaje": "Pedido de prueba insertado exitosamente",
  "detalles_insertados": 1,
  "id_factura": 1,
  "ambiente": "PRUEBAS",
  "sucursal": 99
}
```

### 4.4 Prueba desde Angular

1. Activar el toggle "🧪 MODO PRUEBAS"
2. Ir al componente de Punto de Venta
3. Crear una venta normal
4. Verificar que aparece en el ambiente de pruebas
5. Verificar en base de datos:

```sql
SELECT * FROM test_factcab99 ORDER BY emitido DESC LIMIT 5;
SELECT * FROM test_psucursal99 ORDER BY fecha DESC LIMIT 10;
SELECT exi99 FROM test_artsucursal WHERE idart IN (
    SELECT DISTINCT idart FROM test_psucursal99
);
```

---

## 🧹 FASE 5: LIMPIEZA Y MANTENIMIENTO

### 5.1 Script de Limpieza Rápida

**Archivo:** `scripts/04_limpiar_ambiente_pruebas.sql`

```sql
-- ============================================================================
-- SCRIPT: Limpieza Rápida del Ambiente de Pruebas
-- ============================================================================

BEGIN;

-- Truncar todas las tablas de transacciones
TRUNCATE test_factcab99, test_psucursal99, test_recibos99, test_caja_movi CASCADE;

-- Resetear stocks a valores iniciales
UPDATE test_artsucursal
SET exi99 = 10,
    stkprep99 = 5;

-- Verificar limpieza
SELECT * FROM v_monitoreo_pruebas;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '✅ AMBIENTE DE PRUEBAS LIMPIADO';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE 'Stocks reseteados a 10 unidades';
    RAISE NOTICE 'Transacciones eliminadas';
    RAISE NOTICE '═══════════════════════════════════════════';
END $$;

COMMIT;
```

### 5.2 Script de Limpieza Completa (Eliminar Todo)

**Archivo:** `scripts/05_eliminar_ambiente_pruebas.sql`

```sql
-- ============================================================================
-- SCRIPT: Eliminación Completa del Ambiente de Pruebas
-- PRECAUCIÓN: Esto elimina todas las tablas de prueba
-- ============================================================================

BEGIN;

-- Eliminar vista de monitoreo
DROP VIEW IF EXISTS v_monitoreo_pruebas CASCADE;

-- Eliminar tablas de prueba
DROP TABLE IF EXISTS test_factcab99 CASCADE;
DROP TABLE IF EXISTS test_psucursal99 CASCADE;
DROP TABLE IF EXISTS test_recibos99 CASCADE;
DROP TABLE IF EXISTS test_caja_movi CASCADE;
DROP TABLE IF EXISTS test_artsucursal CASCADE;

-- Eliminar clientes de prueba
DELETE FROM clisuc WHERE cliente < 0;

-- Verificar eliminación
SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE 'test_%';

-- Si no hay resultados, todo se eliminó correctamente

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- NOTA: Para recrear el ambiente, ejecutar nuevamente 01_crear_ambiente_pruebas.sql
-- ════════════════════════════════════════════════════════════════════════════
```

### 5.3 Mantenimiento Periódico Automatizado

**Script:** `scripts/06_mantenimiento_automatizado.sql`

```sql
-- ============================================================================
-- SCRIPT: Mantenimiento Automatizado (ejecutar semanalmente)
-- ============================================================================

BEGIN;

-- 1. Respaldar datos antes de limpiar (opcional)
CREATE TABLE IF NOT EXISTS historico_pruebas AS
SELECT
    CURRENT_DATE as fecha_backup,
    'factcab' as tabla,
    COUNT(*) as registros_eliminados,
    SUM(basico + iva1) as total_ventas
FROM test_factcab99;

-- 2. Limpiar transacciones antiguas (más de 7 días)
DELETE FROM test_factcab99 WHERE emitido < CURRENT_DATE - INTERVAL '7 days';
DELETE FROM test_psucursal99 WHERE fecha < CURRENT_DATE - INTERVAL '7 days';
DELETE FROM test_recibos99 WHERE fecha < CURRENT_DATE - INTERVAL '7 days';
DELETE FROM test_caja_movi WHERE fecha_mov < CURRENT_DATE - INTERVAL '7 days';

-- 3. Resetear stocks bajos
UPDATE test_artsucursal
SET exi99 = 10
WHERE exi99 < 3;

-- 4. Análisis de uso
SELECT
    'Facturas procesadas última semana' as metrica,
    COUNT(*) as valor
FROM test_factcab99
WHERE emitido >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT
    'Artículos más vendidos',
    COUNT(DISTINCT idart)
FROM test_psucursal99
WHERE fecha >= CURRENT_DATE - INTERVAL '7 days';

-- 5. Log del mantenimiento
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '✅ MANTENIMIENTO AUTOMATIZADO COMPLETADO';
    RAISE NOTICE 'Fecha: %', CURRENT_DATE;
    RAISE NOTICE '═══════════════════════════════════════════';
END $$;

COMMIT;
```

---

## 🔄 FASE 6: ROLLBACK Y CONTINGENCIA

### 6.1 Plan de Rollback Completo

**Escenario:** El ambiente de pruebas causó problemas

```sql
-- ============================================================================
-- ROLLBACK PLAN: Eliminación Segura del Ambiente de Pruebas
-- ============================================================================

-- PASO 1: Verificar que NO hay dependencias con producción
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE confrelid IN (
    'test_factcab99'::regclass,
    'test_psucursal99'::regclass,
    'test_artsucursal'::regclass
);

-- Si devuelve resultados, HAY DEPENDENCIAS (investigar)
-- Si NO devuelve resultados, es seguro continuar

-- PASO 2: Crear backup de producción (por si acaso)
CREATE TABLE backup_produccion_factcab1 AS SELECT * FROM factcab1;
CREATE TABLE backup_produccion_artsucursal AS SELECT * FROM artsucursal;

-- PASO 3: Eliminar ambiente de pruebas
DROP TABLE IF EXISTS test_factcab99 CASCADE;
DROP TABLE IF EXISTS test_psucursal99 CASCADE;
DROP TABLE IF EXISTS test_recibos99 CASCADE;
DROP TABLE IF EXISTS test_caja_movi CASCADE;
DROP TABLE IF EXISTS test_artsucursal CASCADE;
DROP VIEW IF EXISTS v_monitoreo_pruebas CASCADE;

-- PASO 4: Eliminar clientes de prueba
DELETE FROM clisuc WHERE cliente < 0;

-- PASO 5: Eliminar archivos PHP de prueba
-- (MANUAL - en el servidor)
-- rm APIAND/controllers/CargaTest.php
-- rm APIAND/controllers/DescargaTest.php

-- PASO 6: Revertir cambios en routes.php
-- (MANUAL - comentar o eliminar rutas de prueba)

-- PASO 7: Verificar estado de producción
SELECT COUNT(*) as facturas_produccion FROM factcab1;
SELECT COUNT(*) as articulos_produccion FROM artsucursal;

-- PASO 8: Eliminar backups temporales (después de verificar)
-- DROP TABLE backup_produccion_factcab1;
-- DROP TABLE backup_produccion_artsucursal;
```

### 6.2 Verificación Post-Rollback

```sql
-- Verificar que NO quedan tablas de prueba
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'test_%';

-- Debe devolver 0 filas

-- Verificar que NO quedan clientes de prueba
SELECT COUNT(*) FROM clisuc WHERE cliente < 0;

-- Debe devolver 0

-- Verificar integridad de producción
SELECT 'factcab1' as tabla, COUNT(*) FROM factcab1
UNION ALL
SELECT 'artsucursal', COUNT(*) FROM artsucursal;

-- Los números deben coincidir con antes del rollback
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### Pre-Implementación
- [ ] **Backup completo de base de datos**
  ```bash
  pg_dump -h localhost -U postgres motoapp > backup_motoapp_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Backup de archivos PHP existentes**
  ```bash
  cp -r APIAND/controllers APIAND/controllers_backup_$(date +%Y%m%d_%H%M%S)
  ```
- [ ] **Crear rama Git para cambios**
  ```bash
  git checkout -b feature/ambiente-pruebas
  ```
- [ ] **Documento de rollback impreso/accesible**

### Implementación Base de Datos (Orden Estricto)
1. [ ] Ejecutar `01_crear_ambiente_pruebas.sql`
2. [ ] Ejecutar `02_verificar_ambiente_pruebas.sql`
3. [ ] Verificar 100 artículos en test_artsucursal
4. [ ] Verificar 4 clientes de prueba creados
5. [ ] Verificar vista v_monitoreo_pruebas funciona
6. [ ] Ejecutar `03_prueba_conectividad.sql`
7. [ ] Hacer prueba de inserción manual (Sección 4.2)
8. [ ] Verificar que producción NO fue afectada:
   ```sql
   SELECT COUNT(*) FROM factcab1; -- Debe ser igual que antes
   SELECT COUNT(*) FROM artsucursal; -- Debe ser igual que antes
   ```

### Implementación Backend PHP (Orden Estricto)
1. [ ] Crear archivo `APIAND/controllers/CargaTest.php`
2. [ ] Copiar código completo de la sección 2.2
3. [ ] Verificar sintaxis PHP:
   ```bash
   php -l APIAND/controllers/CargaTest.php
   ```
4. [ ] Crear archivo `APIAND/controllers/DescargaTest.php`
5. [ ] Copiar código completo de la sección 2.3
6. [ ] Verificar sintaxis PHP:
   ```bash
   php -l APIAND/controllers/DescargaTest.php
   ```
7. [ ] Modificar `APIAND/config/routes.php` (Sección 2.4)
8. [ ] Reiniciar servidor web/PHP-FPM
9. [ ] Probar endpoint con Postman (Sección 4.3):
   - [ ] POST DescargaTest/PedidoCompletoTest
   - [ ] GET CargaTest/ArtsucursalTest
   - [ ] GET CargaTest/EstadoAmbienteTest
10. [ ] Verificar logs del servidor (no debe haber errores)

### Implementación Frontend Angular
1. [ ] Crear servicio `ambiente.service.ts` (Sección 3.2)
2. [ ] Modificar `src/app/config/ini.ts` (Sección 3.1)
3. [ ] Modificar `cargardata.service.ts` (Sección 3.3)
4. [ ] Crear componente `ambiente-selector` (Sección 3.4)
5. [ ] Agregar componente al módulo principal
6. [ ] Integrar selector en componentes clave (Sección 3.5):
   - [ ] Punto de Venta
   - [ ] Artículos
   - [ ] Clientes
7. [ ] Compilar aplicación:
   ```bash
   npx ng build
   ```
8. [ ] Verificar que no hay errores de compilación
9. [ ] Probar en desarrollo:
   ```bash
   npx ng serve --port 4230
   ```

### Testing Integral (Orden de Pruebas)
1. [ ] **Prueba 1: Selector de Ambiente**
   - [ ] Abrir aplicación Angular
   - [ ] Verificar que aparece toggle de ambiente
   - [ ] Cambiar a MODO PRUEBAS
   - [ ] Verificar mensaje de advertencia aparece
   - [ ] Cambiar a MODO PRODUCCIÓN
   - [ ] Verificar mensaje desaparece

2. [ ] **Prueba 2: Lectura de Artículos**
   - [ ] Modo PRUEBAS: Listar artículos
   - [ ] Verificar que muestra 100 artículos
   - [ ] Verificar que dice "AMBIENTE: PRUEBAS"
   - [ ] Modo PRODUCCIÓN: Listar artículos
   - [ ] Verificar que muestra 5,408 artículos
   - [ ] Verificar que NO dice "PRUEBAS"

3. [ ] **Prueba 3: Crear Venta en Pruebas**
   - [ ] Activar MODO PRUEBAS
   - [ ] Ir a Punto de Venta
   - [ ] Seleccionar cliente de prueba (TEST -)
   - [ ] Agregar artículos al carrito
   - [ ] Procesar venta
   - [ ] Verificar mensaje de éxito
   - [ ] Consultar en base de datos:
     ```sql
     SELECT * FROM test_factcab99 ORDER BY emitido DESC LIMIT 1;
     SELECT * FROM test_psucursal99 ORDER BY fecha DESC LIMIT 5;
     ```
   - [ ] Verificar que producción NO fue afectada:
     ```sql
     SELECT COUNT(*) FROM factcab1; -- NO debe haber aumentado
     ```

4. [ ] **Prueba 4: Actualización de Stock**
   - [ ] Modo PRUEBAS activo
   - [ ] Verificar stock inicial:
     ```sql
     SELECT idart, exi99 FROM test_artsucursal WHERE idart = X;
     ```
   - [ ] Crear venta con 3 unidades
   - [ ] Verificar stock actualizado:
     ```sql
     SELECT idart, exi99 FROM test_artsucursal WHERE idart = X;
     -- Debe ser: stock_inicial - 3
     ```
   - [ ] Verificar producción intacta:
     ```sql
     SELECT exi1 FROM artsucursal WHERE idart = X;
     -- NO debe haber cambiado
     ```

5. [ ] **Prueba 5: Reseteo de Ambiente**
   - [ ] Crear varias ventas en MODO PRUEBAS
   - [ ] Verificar registros:
     ```sql
     SELECT COUNT(*) FROM test_factcab99; -- > 0
     ```
   - [ ] Click en "Resetear Ambiente"
   - [ ] Confirmar reseteo
   - [ ] Verificar limpieza:
     ```sql
     SELECT COUNT(*) FROM test_factcab99; -- Debe ser 0
     SELECT exi99 FROM test_artsucursal LIMIT 5; -- Todos en 10
     ```

6. [ ] **Prueba 6: Cambio entre Ambientes**
   - [ ] Crear venta en MODO PRODUCCIÓN
   - [ ] Cambiar a MODO PRUEBAS
   - [ ] Crear venta en MODO PRUEBAS
   - [ ] Verificar separación:
     ```sql
     SELECT COUNT(*) as produccion FROM factcab1;
     SELECT COUNT(*) as pruebas FROM test_factcab99;
     -- Deben ser diferentes
     ```

7. [ ] **Prueba 7: Persistencia de Ambiente**
   - [ ] Activar MODO PRUEBAS
   - [ ] Cerrar aplicación Angular
   - [ ] Reabrir aplicación
   - [ ] Verificar que sigue en MODO PRUEBAS

### Post-Implementación
1. [ ] **Documentación**
   - [ ] Crear manual de usuario para ambiente de pruebas
   - [ ] Documentar URLs de endpoints de prueba
   - [ ] Crear guía de limpieza/mantenimiento

2. [ ] **Git**
   ```bash
   git add .
   git commit -m "feat: Implementar ambiente de pruebas completo (Sucursal 99)"
   git push origin feature/ambiente-pruebas
   ```

3. [ ] **Capacitación**
   - [ ] Entrenar usuarios en uso del toggle
   - [ ] Explicar diferencias entre ambientes
   - [ ] Mostrar cómo resetear ambiente

4. [ ] **Monitoreo**
   - [ ] Configurar revisión semanal de:
     ```sql
     SELECT * FROM v_monitoreo_pruebas;
     ```
   - [ ] Programar limpieza automática (Sección 5.3)

### Verificación Final
- [ ] Producción funciona normalmente
- [ ] Pruebas funcionan correctamente
- [ ] No hay cross-contamination entre ambientes
- [ ] Logs del servidor limpios (sin errores)
- [ ] Performance no degradada
- [ ] Usuarios pueden cambiar entre ambientes
- [ ] Reseteo funciona correctamente
- [ ] Backups disponibles y verificados

---

## 🎯 RESUMEN EJECUTIVO

### Componentes Creados

**Base de Datos:**
- 5 tablas nuevas (test_factcab99, test_psucursal99, test_recibos99, test_caja_movi, test_artsucursal)
- 1 vista de monitoreo (v_monitoreo_pruebas)
- 100 artículos de prueba
- 4 clientes de prueba

**Backend:**
- 2 archivos PHP nuevos (CargaTest.php, DescargaTest.php)
- 8 endpoints nuevos
- Modificación de routes.php

**Frontend:**
- 1 servicio nuevo (ambiente.service.ts)
- 1 componente nuevo (ambiente-selector)
- Modificaciones en servicios existentes
- URLs de prueba en configuración

### Tiempo Estimado de Implementación

| Fase | Tiempo | Complejidad |
|---|---|---|
| Base de Datos | 30 min | Baja |
| Backend PHP | 1 hora | Media |
| Frontend Angular | 1.5 horas | Media |
| Testing Integral | 1 hora | Alta |
| **TOTAL** | **4 horas** | **Media-Alta** |

### Recursos Necesarios

- Acceso a PostgreSQL
- Acceso SSH al servidor (para PHP)
- Acceso al código fuente Angular
- Acceso a Git
- Herramienta de pruebas (Postman/curl)

### Ventajas del Sistema

1. ✅ **Cero Impacto en Producción**
   - Tablas completamente separadas
   - Archivos PHP independientes
   - Stock aislado

2. ✅ **Fácil de Usar**
   - Toggle simple en UI
   - Cambio instantáneo de ambiente
   - Mensajes claros de ambiente activo

3. ✅ **Reversible**
   - Scripts de limpieza disponibles
   - Rollback completo documentado
   - Sin modificar producción

4. ✅ **Escalable**
   - Fácil agregar más sucursales de prueba
   - Estructura replicable
   - Bien documentado

5. ✅ **Mantenible**
   - Scripts de mantenimiento automatizado
   - Vista de monitoreo integrada
   - Logs detallados

### Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Error en script SQL | Baja | Alto | Backups obligatorios antes de ejecutar |
| Cross-contamination | Muy baja | Crítico | Nombres de tabla claramente diferentes (test_*) |
| Confusión de usuarios | Media | Bajo | UI con indicadores claros de ambiente |
| Pérdida de datos de prueba | Alta | Bajo | Datos de prueba son desechables |
| Archivos PHP con errores | Baja | Medio | Validación de sintaxis obligatoria |

---

## 📞 SOPORTE Y CONTACTO

### En Caso de Problemas

1. **Verificar logs:**
   ```bash
   # Logs de PHP
   tail -f /var/log/apache2/error.log

   # Logs de PostgreSQL
   tail -f /var/log/postgresql/postgresql-XX-main.log
   ```

2. **Verificar estado de base de datos:**
   ```sql
   SELECT * FROM v_monitoreo_pruebas;
   ```

3. **Rollback de emergencia:**
   - Ejecutar script de la Sección 6.1
   - Restaurar backup de base de datos
   - Eliminar archivos PHP de prueba

### Información del Sistema

- **Versión de Plan:** 1.0.0
- **Fecha de Creación:** 2025-01-10
- **Última Actualización:** 2025-01-10
- **Ambiente:** Producción + Pruebas (Sucursal 99)

---

## ✅ CONCLUSIÓN

Este plan proporciona una solución completa y segura para implementar un ambiente de pruebas totalmente aislado en MotoApp. La arquitectura garantiza:

1. **Seguridad:** Cero impacto en datos de producción
2. **Usabilidad:** Interface simple para usuarios
3. **Mantenibilidad:** Scripts automatizados de limpieza
4. **Reversibilidad:** Rollback completo documentado

**El sistema está listo para implementación siguiendo el checklist proporcionado.**

---

**FIN DEL DOCUMENTO**
