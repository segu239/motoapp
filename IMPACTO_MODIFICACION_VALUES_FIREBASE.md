# INFORME DE IMPACTO: Modificación de Valores "value" en Firebase Sucursales

**Fecha**: 2025-11-02
**Versión**: 1.0
**Criticidad**: 🔴 **CRÍTICA - NO MODIFICAR SIN MIGRACIÓN COMPLETA**
**Autor**: Análisis Técnico MotoApp

---

## ⚠️ ADVERTENCIA CRÍTICA

**NO MODIFICAR** los valores "value" del nodo `sucursales` en Firebase Realtime Database sin realizar una migración completa del sistema. Esto causaría **FALLO TOTAL** de múltiples funcionalidades críticas del negocio.

---

## Resumen Ejecutivo

Los valores "value" almacenados en Firebase para cada sucursal están **hardcodeados** en múltiples capas del sistema:

1. **Backend PHP**: Mapeos explícitos entre values y columnas de PostgreSQL
2. **Base de Datos PostgreSQL**: Nombres de tablas dinámicas basadas en estos valores
3. **Frontend Angular**: 65+ referencias en componentes y servicios
4. **Lógica de Negocio**: Control de stock, ventas, inventario y reportes

**Modificar estos valores rompería completamente:**
- ✗ Sistema de gestión de stock
- ✗ Procesamiento de ventas
- ✗ Movimientos de inventario entre sucursales
- ✗ Generación de reportes y PDFs
- ✗ Consultas de historial de ventas
- ✗ Sistema de caja y movimientos
- ✗ Pedidos entre sucursales

---

## 1. Mapeo Actual de Sucursales

### 1.1 Configuración en Firebase Realtime Database

```json
{
  "sucursales": {
    "[key-firebase-1]": {
      "nombre": "DEPOSITO",
      "value": 1
    },
    "[key-firebase-2]": {
      "nombre": "CASA CENTRAL",
      "value": 2
    },
    "[key-firebase-3]": {
      "nombre": "VALLE VIEJO",
      "value": 3
    },
    "[key-firebase-4]": {
      "nombre": "GUEMES",
      "value": 4
    },
    "[key-firebase-5]": {
      "nombre": "MAYORISTA",
      "value": 5
    }
  }
}
```

### 1.2 Correspondencia con PostgreSQL

| value (Firebase) | Nombre Sucursal | cod_sucursal (PostgreSQL) | Columna Stock | Tabla Pedidos | Tabla Facturas |
|------------------|-----------------|---------------------------|---------------|---------------|----------------|
| 1                | DEPOSITO        | 1                         | exi1          | psucursal1    | factcab1       |
| 2                | CASA CENTRAL    | 2                         | exi2          | psucursal2    | factcab2       |
| 3                | VALLE VIEJO     | 3                         | exi3          | psucursal3    | factcab3       |
| 4                | GUEMES          | 4                         | exi4          | psucursal4    | factcab4       |
| 5                | MAYORISTA       | 5                         | exi5          | psucursal5    | factcab5       |

---

## 2. Mapeo Crítico Hardcodeado en Backend

### 2.1 Mapeo Explícito en Descarga.php (Líneas 1729-1737)

```php
// Firebase almacena un campo 'value' para cada sucursal que NO corresponde
// exactamente con las columnas exi en artsucursal
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];
```

**⚠️ PROBLEMA CRÍTICO**: Este comentario indica un desajuste histórico, pero el mapeo está hardcodeado en múltiples funciones:

- **Líneas 1729-1755**: Función de recepción de stock
- **Líneas 1832-1856**: Función de cancelación de envío
- **Líneas 1930-1950**: Función de confirmación de recepción

### 2.2 Uso en Construcción de Nombres de Tablas Dinámicas

#### En Descarga.php:

```php
// Línea 934
$tabla = 'psucursal' . $id_vend;

// Línea 1199
$tabla = 'psucursal' . $id_vend;

// Línea 1459
$this->db->update('factcab' . $sucursal, array(...));

// Línea 1469
$this->db->insert('psucursal' . $sucursal, $pagoCC['psucursal']);

// Línea 1473
$this->db->insert('factcab' . $sucursal, $pagoCC['cabecera']);

// Línea 1479
$this->db->insert('recibos' . $sucursal, $recibo);

// Líneas 1743, 1758
UPDATE artsucursal SET {$campo_stock_destino} = ...
UPDATE artsucursal SET {$campo_stock_origen} = ...
```

#### En Carga.php:

```php
// Línea 313
$tabla = "factcab" . $sucursal;

// Línea 352
$tabla = "factcab" . $sucursal;

// Línea 395
$tabla = "psucursal" . $sucursal;

// Línea 436
$tabla = "factcab" . $sucursal;

// Línea 474
$tabla = "factcab" . $sucursal;

// Línea 547
$tabla = "psucursal" . $sucursal;

// Línea 573, 609, 646
$tabla = "psucursal" . $sucursal;

// Línea 694
$tabla = "recibos" . $sucursal;

// Línea 1996
$tabla = 'factcab' . $sucursal;

// Línea 2099
$tabla = 'psucursal' . $sucursal;
```

**Total: 26+ construcciones dinámicas de nombres de tablas en backend**

---

## 3. Impacto en Estructura de PostgreSQL

### 3.1 Tablas Dependientes del Valor de Sucursal

#### Tabla: `artsucursal` (Stock por Sucursal)

```sql
-- Columnas de existencia (stock)
exi1  NUMERIC  -- Mapea a value 4 (DEPOSITO) ⚠️ Desajuste
exi2  NUMERIC  -- Mapea a value 1 (CASA CENTRAL) ⚠️ Desajuste
exi3  NUMERIC  -- Mapea a value 2 (VALLE VIEJO) ⚠️ Desajuste
exi4  NUMERIC  -- Mapea a value 3 (GUEMES) ⚠️ Desajuste
exi5  NUMERIC  -- Mapea a value 5 (MAYORISTA) ✓ Correcto

-- Columnas de precios por sucursal
prefi1  NUMERIC  -- Precio sucursal 1
prefi2  NUMERIC  -- Precio sucursal 2
prefi3  NUMERIC  -- Precio sucursal 3
prefi4  NUMERIC  -- Precio sucursal 4

-- Columnas de stock mínimo/máximo por sucursal
stkmin1, stkmax1, stkprep1  -- Sucursal 1
stkmin2, stkmax2, stkprep2  -- Sucursal 2
stkmin3, stkmax3, stkprep3  -- Sucursal 3
stkmin4, stkmax4, stkprep4  -- Sucursal 4
stkmin5, stkmax5, stkprep5  -- Sucursal 5
```

#### Tablas Dinámicas por Sucursal:

**Pedidos**:
- `psucursal1` - Pedidos sucursal 1 (DEPOSITO según value de Firebase)
- `psucursal2` - Pedidos sucursal 2 (CASA CENTRAL según value de Firebase)
- `psucursal3` - Pedidos sucursal 3 (VALLE VIEJO según value de Firebase)
- `psucursal4` - Pedidos sucursal 4 (GUEMES según value de Firebase)
- `psucursal5` - Pedidos sucursal 5 (MAYORISTA según value de Firebase)

**Facturas/Cabeceras**:
- `factcab1` - Facturas sucursal 1
- `factcab2` - Facturas sucursal 2
- `factcab3` - Facturas sucursal 3
- `factcab4` - Facturas sucursal 4
- `factcab5` - Facturas sucursal 5

**Recibos**:
- `recibos1` - Recibos sucursal 1
- `recibos2` - Recibos sucursal 2
- `recibos3` - Recibos sucursal 3
- `recibos4` - Recibos sucursal 4
- `recibos5` - Recibos sucursal 5

### 3.2 Consultas SQL Afectadas

**Ejemplo de consulta típica en backend**:
```php
// Si value cambia de 1 a 10, intentaría buscar:
$tabla = 'psucursal' . $sucursal;  // Resultaría en 'psucursal10'
$query = $this->db->get($tabla);   // ❌ ERROR: Tabla no existe
```

**Actualización de stock**:
```php
// Con value = 1, busca en mapeo y obtiene 'exi2'
$campo_stock = $mapeo_sucursal_exi[1]; // 'exi2'
$sql = "UPDATE artsucursal SET {$campo_stock} = ..."; // UPDATE artsucursal SET exi2 = ...

// Si value cambia a 10:
$campo_stock = $mapeo_sucursal_exi[10]; // ❌ ERROR: undefined index
// Fallback: 'exi10'
$sql = "UPDATE artsucursal SET exi10 = ..."; // ❌ ERROR: Columna no existe
```

---

## 4. Impacto en Frontend Angular

### 4.1 Componentes Críticos Afectados

| Componente | Archivo | Líneas | Uso del Valor | Impacto |
|------------|---------|--------|---------------|---------|
| **Login2** | `login2.component.ts` | 126 | `sessionStorage.setItem('sucursal', this.sucursal)` | 🔴 Login fallaría: validación de permisos no encontraría match |
| **Carrito** | `carrito.component.ts` | 240, 301, 366, 411, etc. | `parseInt(sessionStorage.getItem('sucursal'))` | 🔴 Punto de venta incorrecto → facturas en tabla errónea |
| **StockPedido** | `stockpedido.component.ts` | 72 | `Number(sessionStorage.getItem('sucursal'))` | 🔴 Pedidos enviados a sucursal incorrecta |
| **StockRecibo** | `stockrecibo.component.ts` | 69 | `Number(sessionStorage.getItem('sucursal'))` | 🔴 Recepción de stock en sucursal incorrecta |
| **CajaMovi** | `cajamovi.component.ts` | 313 | `sessionStorage.getItem('sucursal')` | 🔴 Movimientos de caja en sucursal incorrecta |
| **HistorialVentas2** | `historialventas2.component.ts` | 877, 1712 | `sessionStorage.getItem('sucursal')` | 🔴 Reportes de ventas con datos incorrectos |
| **Cabeceras** | `cabeceras.component.ts` | 123, 167, 174, 328 | `sessionStorage.getItem('sucursal')` | 🔴 Consultas a tablas factcab incorrectas |
| **NewCliente** | `newcliente.component.ts` | 78 | `sessionStorage.getItem('sucursal')` | 🔴 Cliente asignado a sucursal incorrecta |
| **CambioPrecio** | `cambioprecios.component.ts` | 70, 340, 534 | `sessionStorage.getItem('sucursal')` | 🔴 Cambios de precio aplicados a columna incorrecta |
| **CuentaCorriente** | `cuentacorriente.component.ts` | 23, 34 | `sessionStorage.getItem('sucursal')` | 🔴 Consultas CC en sucursal incorrecta |
| **AnalisisCaja** | `analisiscaja.component.ts` | 153, 180 | `sessionStorage.getItem('sucursal')` | 🔴 Análisis con datos de sucursal incorrecta |
| **Grilla** | `grilla.component.ts` | 96-100 | `sessionStorage.getItem('sucursal')` | 🔴 Visualización de productos de sucursal incorrecta |
| **PuntoVenta** | `puntoventa.component.ts` | 34 | `sessionStorage.getItem('sucursal')` | 🔴 Punto de venta incorrecto |
| **EnvioStockPendientes** | `enviostockpendientes.component.ts` | 73 | `Number(sessionStorage.getItem('sucursal'))` | 🔴 Listado de envíos de sucursal incorrecta |
| **EnvioStockRealizados** | `enviodestockrealizados.component.ts` | 51 | `Number(sessionStorage.getItem('sucursal'))` | 🔴 Historial de envíos incorrecto |
| **StockProductoEnvio** | `stockproductoenvio.component.ts` | 35 | `sessionStorage.getItem('sucursal')` | 🔴 Envío desde sucursal incorrecta |
| **StockProductoPedido** | `stockproductopedido.component.ts` | 39 | `sessionStorage.getItem('sucursal')` | 🔴 Pedido a sucursal incorrecta |

**Total: 17 componentes críticos + 50+ puntos de fallo**

### 4.2 Servicios Críticos Afectados

| Servicio | Archivo | Líneas | Uso | Impacto |
|----------|---------|--------|-----|---------|
| **ArticulosPaginados** | `articulos-paginados.service.ts` | 56, 117, 316 | `params.append('sucursal', sucursal)` | 🔴 Productos de sucursal incorrecta |
| **StockPaginados** | `stock-paginados.service.ts` | 52, 111, 305 | `params.append('sucursal', sucursal)` | 🔴 Stock consultado de sucursal incorrecta |
| **HistorialVentas2Paginados** | `historial-ventas2-paginados.service.ts` | 49, 132, 210, 335, 365 | `sessionStorage.getItem('sucursal')` | 🔴 Historial de ventas incorrecto |
| **HistorialVentasPaginados** | `historial-ventas-paginados.service.ts` | 44, 122, 247 | `sessionStorage.getItem('sucursal')` | 🔴 Historial de ventas incorrecto |
| **HistorialPDF** | `historial-pdf.service.ts` | 144 | `sessionStorage.getItem('sucursal')` | 🔴 PDFs con datos de sucursal incorrecta |
| **PriceUpdate** | `price-update.service.ts` | 102 | `sessionStorage.getItem('sucursal')` | 🔴 Actualización de precios en columna incorrecta |

**Total: 6 servicios críticos afectados**

### 4.3 Otros Archivos Afectados

| Archivo | Ubicación | Uso | Impacto |
|---------|-----------|-----|---------|
| **EmpresaConfig** | `empresa-config.ts` | Línea 16 | Configuración de empresa por sucursal | 🔴 Datos de empresa incorrectos en documentos |
| **Header** | `header.component.ts` | Línea 27 | Mostrar nombre de sucursal | 🟡 Visual incorrecto (no crítico) |

---

## 5. Escenarios de Fallo Detallados

### 5.1 Escenario 1: Cambio de value de 1 a 10

**Acción**: Usuario modifica Firebase:
```json
{
  "nombre": "DEPOSITO",
  "value": 10  // ❌ Cambió de 1 a 10
}
```

**Consecuencias en cascada**:

1. **Login**:
   ```
   Usuario selecciona "DEPOSITO" → value = 10
   sessionStorage.setItem('sucursal', '10')
   Validación de permisos: user.sucursalesPermitidas = [1, 2, 3]
   10 no está en [1, 2, 3] → ❌ "No tiene acceso a la sucursal seleccionada"
   ```

2. **Backend - Construcción de Tabla**:
   ```php
   $sucursal = $_POST['sucursal']; // 10
   $tabla = 'psucursal' . $sucursal; // 'psucursal10'
   $query = $this->db->get($tabla); // ❌ ERROR: Table 'psucursal10' doesn't exist
   ```

3. **Backend - Mapeo de Stock**:
   ```php
   $mapeo_sucursal_exi = [
       1 => 'exi2',
       2 => 'exi3',
       3 => 'exi4',
       4 => 'exi1',
       5 => 'exi5'
   ];
   $campo_stock = $mapeo_sucursal_exi[10]; // ❌ ERROR: Undefined index: 10
   // Fallback: 'exi10'
   UPDATE artsucursal SET exi10 = ... // ❌ ERROR: Column 'exi10' doesn't exist
   ```

4. **Frontend - Servicios**:
   ```typescript
   const sucursal = sessionStorage.getItem('sucursal'); // '10'
   const url = `${Urlartsucursal}?sucursal=10`; // Backend falla
   // Resultado: No se cargan productos
   ```

**Funcionalidades rotas**:
- ❌ Login (si usuario no tiene value 10 en permisos)
- ❌ Consulta de productos
- ❌ Consulta de stock
- ❌ Pedidos entre sucursales
- ❌ Ventas (facturas se intentarían guardar en factcab10 inexistente)
- ❌ Movimientos de caja
- ❌ Generación de reportes
- ❌ Historial de ventas
- ❌ Recibos

---

### 5.2 Escenario 2: Intercambio de valores

**Acción**: Usuario intercambia values:
```json
[
  {"nombre": "DEPOSITO", "value": 2},      // Era 1
  {"nombre": "CASA CENTRAL", "value": 1}   // Era 2
]
```

**Consecuencias**:

1. **Confusión de Stock**:
   ```
   Usuario en DEPOSITO → selecciona DEPOSITO → value = 2
   Backend mapea: value 2 → exi3 (Valle Viejo)

   Consulta stock de DEPOSITO → Recibe stock de Valle Viejo
   Vende producto → Descuenta stock de Valle Viejo
   ```

2. **Confusión de Ventas**:
   ```
   Usuario vende en DEPOSITO → sessionStorage = '2'
   Backend: tabla = 'factcab2'
   Factura se guarda en factcab2 (que era de CASA CENTRAL)

   Reportes de DEPOSITO → Vacíos
   Reportes de CASA CENTRAL → Incluyen ventas de DEPOSITO
   ```

3. **Confusión de Pedidos**:
   ```
   DEPOSITO pide stock a CASA CENTRAL
   Pedido se registra con sucursald=2, sucursalh=1 (invertido)
   Sistema descuenta stock de la sucursal equivocada
   ```

**Funcionalidades afectadas**:
- ❌ **Integridad de stock**: Stock mezclado entre sucursales
- ❌ **Reportes financieros**: Ventas atribuidas a sucursal incorrecta
- ❌ **Auditoría**: Imposible rastrear operaciones reales
- ❌ **Control de inventario**: Datos completamente inconsistentes
- ❌ **Facturación**: Numeración de comprobantes mezclada

---

### 5.3 Escenario 3: Eliminación de un valor

**Acción**: Usuario elimina sucursal con value = 3 de Firebase:
```json
// Antes:
[
  {"nombre": "DEPOSITO", "value": 1},
  {"nombre": "CASA CENTRAL", "value": 2},
  {"nombre": "VALLE VIEJO", "value": 3},  // ← Se elimina
  {"nombre": "GUEMES", "value": 4},
  {"nombre": "MAYORISTA", "value": 5}
]

// Después:
[
  {"nombre": "DEPOSITO", "value": 1},
  {"nombre": "CASA CENTRAL", "value": 2},
  // VALLE VIEJO eliminado
  {"nombre": "GUEMES", "value": 4},
  {"nombre": "MAYORISTA", "value": 5}
]
```

**Consecuencias**:

1. **Login**:
   ```
   Dropdown de sucursales → No muestra VALLE VIEJO
   Usuario con permiso value=3 → No puede seleccionar su sucursal
   Usuario con sessionStorage='3' activo → Puede seguir operando pero:
   ```

2. **Búsqueda de nombre**:
   ```typescript
   // carrito.component.ts línea 256
   const sucursalEncontrada = sucursales.find(suc => suc.value.toString() === '3');
   if (!sucursalEncontrada) {
       this.sucursalNombre = 'Sucursal 3'; // Fallback genérico
   }
   // Usuario ve "Sucursal 3" en lugar de "VALLE VIEJO"
   ```

3. **Backend sigue funcionando**:
   ```php
   // Backend no depende de Firebase, usa valor directo
   $tabla = 'psucursal3'; // ✓ Tabla existe
   $campo_stock = 'exi4'; // ✓ Columna existe (según mapeo)
   // Operaciones siguen funcionando en PostgreSQL
   ```

**Funcionalidades afectadas**:
- ❌ **Login**: Usuarios de Valle Viejo no pueden ingresar
- 🟡 **Visualización**: Nombre de sucursal genérico ("Sucursal 3")
- ✓ **Backend**: Sigue funcionando para sesiones activas
- ❌ **Nuevas sesiones**: No se puede seleccionar Valle Viejo

---

## 6. Análisis de Dependencias por Capa

### 6.1 Capa de Presentación (Angular)

```
Firebase (sucursales/value)
    ↓
Login2Component.sucursal (string)
    ↓
sessionStorage.setItem('sucursal', value)
    ↓
[65+ ubicaciones leen sessionStorage.getItem('sucursal')]
    ↓
Parámetros HTTP a backend
```

**Puntos de fallo**: 65+ ubicaciones

### 6.2 Capa de Servicios (Angular)

```
sessionStorage.getItem('sucursal')
    ↓
HTTP Params: ?sucursal=X
    ↓
Backend REST API
```

**Servicios afectados**:
- ArticulosPaginadosService (3 métodos)
- StockPaginadosService (3 métodos)
- HistorialVentas2PaginadosService (5 métodos)
- HistorialVentasPaginadosService (3 métodos)
- HistorialPdfService (1 método)
- PriceUpdateService (1 método)

**Puntos de fallo**: 16+ métodos de servicios

### 6.3 Capa Backend (PHP/CodeIgniter)

```
$_GET['sucursal'] o $_POST['sucursal']
    ↓
Construcción dinámica de nombres de tablas
    ├─→ 'psucursal' . $sucursal
    ├─→ 'factcab' . $sucursal
    ├─→ 'recibos' . $sucursal
    └─→ Mapeo hardcodeado → 'exiN'
    ↓
Consultas SQL
```

**Archivos afectados**:
- Carga.php: 40+ referencias
- Descarga.php: 80+ referencias

**Puntos de fallo críticos**:
- 26+ construcciones dinámicas de tablas
- 3+ funciones con mapeo hardcodeado exi
- 15+ endpoints REST afectados

### 6.4 Capa de Datos (PostgreSQL)

```
Tablas con sufijo numérico:
├─ psucursal1, psucursal2, psucursal3, psucursal4, psucursal5
├─ factcab1, factcab2, factcab3, factcab4, factcab5
└─ recibos1, recibos2, recibos3, recibos4, recibos5

Tabla artsucursal con columnas:
├─ exi1, exi2, exi3, exi4, exi5 (stock)
├─ prefi1, prefi2, prefi3, prefi4 (precios)
└─ stkminN, stkmaxN, stkprepN (stock control)
```

**Restricción**: No se pueden crear nuevas tablas sin migración de esquema

---

## 7. Funcionalidades Críticas del Negocio Afectadas

### 7.1 Proceso de Venta (CRÍTICO)

**Flujo normal**:
1. Usuario selecciona productos → Consulta stock de sucursal X
2. Agrega al carrito → Valida disponibilidad en sucursal X
3. Procesa venta → Guarda en factcabX
4. Actualiza stock → Descuenta de exiN (según mapeo)
5. Genera comprobante → PDF con datos de sucursal X

**Si value cambia**:
- ✗ Consulta stock de sucursal incorrecta
- ✗ Guarda venta en tabla incorrecta
- ✗ Descuenta stock de sucursal incorrecta
- ✗ Comprobante con datos de sucursal incorrecta
- ✗ **RESULTADO**: Venta registrada en sucursal equivocada, stock desactualizado

**Impacto financiero**: ALTO - Pérdida de control de inventario y ventas

---

### 7.2 Movimiento de Stock entre Sucursales (CRÍTICO)

**Flujo normal**:
1. Sucursal A solicita producto a Sucursal B
2. Sistema crea pedido: sucursald=A, sucursalh=B
3. Backend usa mapeo para obtener campos: exiA, exiB
4. Al confirmar:
   - RESTA stock de exiA (sucursal origen)
   - SUMA stock en exiB (sucursal destino)

**Si value cambia**:
- ✗ Mapeo hardcodeado no encuentra value
- ✗ Fallback intenta usar exiN donde N no existe
- ✗ **SQL ERROR**: Column doesn't exist
- ✗ **RESULTADO**: Transacción falla, stock no se actualiza

**Código afectado**:
```php
// Descarga.php líneas 1729-1755
$mapeo_sucursal_exi = [
    1 => 'exi2',  // Si value 1 cambia, este mapeo falla
    2 => 'exi3',
    3 => 'exi4',
    4 => 'exi1',
    5 => 'exi5'
];

$sucursal_destino = $pedidoscb['sucursald']; // Valor modificado
$campo_stock_destino = $mapeo_sucursal_exi[$sucursal_destino]; // ❌ Undefined index
```

**Impacto operacional**: CRÍTICO - Imposibilidad de mover stock entre sucursales

---

### 7.3 Generación de Reportes (CRÍTICO)

**Reportes afectados**:

| Reporte | Fuente de Datos | Impacto |
|---------|-----------------|---------|
| Historial de Ventas | `factcabN` | ❌ Consulta tabla incorrecta → Datos vacíos o incorrectos |
| Análisis de Caja | `cajamovi` filtrado por sucursal | ❌ Movimientos de otra sucursal o vacío |
| Control de Stock | `artsucursal` columna exiN | ❌ Stock de otra sucursal |
| Cuenta Corriente | `psucursalN` | ❌ Pagos de otra sucursal |
| PDFs de Factura | Datos de sucursal | ❌ Información de otra sucursal |

**Impacto administrativo**: ALTO - Reportes gerenciales incorrectos

---

### 7.4 Punto de Venta (CRÍTICO)

**Componente**: CarritoComponent
**Líneas afectadas**: 240, 301, 306, 366, 411, 418, 462, 513, 520, 1105, 1198, 1526

**Funcionalidad**:
```typescript
// Inicializa punto de venta basado en sucursal
const sucursal = sessionStorage.getItem('sucursal'); // '1'
this.puntoventa = parseInt(sucursal);  // 1

// Si value cambia de 1 a 10:
this.puntoventa = 10; // ❌ Punto de venta inexistente
```

**Consecuencias**:
- ✗ Factura con puntoventa incorrecto
- ✗ Numeración de comprobantes mezclada
- ✗ Imposible facturar electrónicamente (AFIP rechaza puntoventa desconocido)

**Impacto legal**: ALTO - Incumplimiento de normativa fiscal

---

## 8. Análisis de Riesgo por Tipo de Modificación

### 8.1 Riesgo: Cambiar valores existentes (1→10)

| Aspecto | Riesgo | Probabilidad de Fallo | Impacto |
|---------|--------|----------------------|---------|
| Login | 🔴 CRÍTICO | 100% | Usuarios no pueden ingresar |
| Construcción de tablas | 🔴 CRÍTICO | 100% | Errores SQL (tabla no existe) |
| Mapeo de stock | 🔴 CRÍTICO | 100% | Errores SQL (columna no existe) |
| Validación de permisos | 🔴 CRÍTICO | 100% | Acceso denegado |
| Reportes | 🔴 CRÍTICO | 100% | Datos vacíos o incorrectos |

**Veredicto**: **INACEPTABLE** - Fallo total del sistema

---

### 8.2 Riesgo: Intercambiar valores (1↔2)

| Aspecto | Riesgo | Probabilidad de Fallo | Impacto |
|---------|--------|----------------------|---------|
| Login | 🟢 BAJO | 0% | Funciona (permisos se adaptan si se actualizan) |
| Construcción de tablas | 🟢 BAJO | 0% | Tablas existen |
| Mapeo de stock | 🔴 CRÍTICO | 100% | Stock mezclado entre sucursales |
| Integridad de datos | 🔴 CRÍTICO | 100% | Ventas en sucursal incorrecta |
| Reportes | 🔴 CRÍTICO | 100% | Datos incorrectos |

**Veredicto**: **INACEPTABLE** - Corrupción de datos silenciosa

---

### 8.3 Riesgo: Eliminar una sucursal de Firebase

| Aspecto | Riesgo | Probabilidad de Fallo | Impacto |
|---------|--------|----------------------|---------|
| Login | 🔴 CRÍTICO | 100% para esa sucursal | Usuarios no pueden seleccionar sucursal |
| Backend | 🟢 BAJO | 0% | Sigue funcionando con valor en sessionStorage |
| Visualización | 🟡 MEDIO | 100% | Nombre genérico ("Sucursal N") |
| Nuevas sesiones | 🔴 CRÍTICO | 100% | No se puede acceder a esa sucursal |

**Veredicto**: **MEDIO** - Operaciones existentes funcionan, nuevas sesiones bloqueadas

---

### 8.4 Riesgo: Agregar nueva sucursal con value 6

| Aspecto | Riesgo | Probabilidad de Fallo | Impacto |
|---------|--------|----------------------|---------|
| Login | 🟢 BAJO | 0% | Funciona si se agregan permisos |
| Construcción de tablas | 🔴 CRÍTICO | 100% | Tablas psucursal6, factcab6, recibos6 no existen |
| Mapeo de stock | 🔴 CRÍTICO | 100% | Campo exi6 no existe en artsucursal |
| Migración requerida | 🔴 CRÍTICO | 100% | Requiere crear tablas y columnas |

**Veredicto**: **INACEPTABLE sin migración** - Requiere cambios en esquema de BD

---

## 9. Diagrama de Impacto Visual

```
                    ┌─────────────────────────────────────┐
                    │  Firebase: sucursales/value         │
                    │  [1, 2, 3, 4, 5]                    │
                    └──────────────┬──────────────────────┘
                                   │
                    ❌ MODIFICACIÓN DE VALUE
                                   │
               ┌───────────────────┼───────────────────┐
               │                   │                   │
               ▼                   ▼                   ▼
        ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
        │   FRONTEND  │    │   BACKEND   │    │  PostgreSQL │
        │   Angular   │    │  PHP/CI     │    │             │
        └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
               │                   │                   │
    ┌──────────┴──────────┐       │        ┌──────────┴──────────┐
    │                     │       │        │                     │
    ▼                     ▼       │        ▼                     ▼
┌─────────┐         ┌─────────┐  │   ┌─────────┐          ┌─────────┐
│ Login   │         │ Carrito │  │   │ Tablas  │          │ Columnas│
│         │         │         │  │   │ Dinámicas│         │  exiN   │
│ ❌ Falla│         │ ❌ Falla│  │   │          │          │         │
│         │         │         │  │   │ ❌ No    │          │ ❌ No   │
│ Permiso │         │ PV      │  │   │   Existen│          │  Existe │
│ Negado  │         │Incorrecto│ │   │          │          │         │
└─────────┘         └─────────┘  │   └─────────┘          └─────────┘
     │                     │      │        │                     │
     │                     │      ▼        │                     │
     │                     │  ┌─────────┐  │                     │
     │                     │  │ Mapeo   │  │                     │
     │                     │  │ Hardcode│  │                     │
     │                     │  │         │  │                     │
     │                     │  │ ❌ Index│  │                     │
     │                     │  │ Not Found│ │                     │
     │                     │  └────┬────┘  │                     │
     │                     │       │       │                     │
     └──────────┬──────────┴───────┴───────┴─────────┬───────────┘
                │                                     │
                ▼                                     ▼
        ┌───────────────────────────────────────────────────┐
        │           FUNCIONALIDADES AFECTADAS                │
        │                                                    │
        │  ❌ Ventas                                         │
        │  ❌ Control de Stock                               │
        │  ❌ Movimientos entre Sucursales                   │
        │  ❌ Reportes Gerenciales                           │
        │  ❌ Facturación                                    │
        │  ❌ Punto de Venta                                 │
        │  ❌ Cuenta Corriente                               │
        │  ❌ Análisis de Caja                               │
        │  ❌ Generación de PDFs                             │
        │                                                    │
        └────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   IMPACTO EMPRESARIAL   │
                    │                         │
                    │  💰 Pérdida Financiera  │
                    │  📊 Datos Incorrectos   │
                    │  ⚖️  Riesgo Legal       │
                    │  👥 Pérdida de Clientes │
                    │  ⏰ Downtime del Sistema│
                    └─────────────────────────┘
```

---

## 10. Lista Completa de Componentes Afectados

### 10.1 Componentes de Frontend (17 archivos)

| # | Componente | Path | Líneas | Criticidad |
|---|------------|------|--------|------------|
| 1 | login2.component.ts | `src/app/components/auth/login2/` | 126 | 🔴 CRÍTICA |
| 2 | carrito.component.ts | `src/app/components/carrito/` | 240, 301, 366, 411, 418, 462, 513, 520, 1105, 1198, 1526 | 🔴 CRÍTICA |
| 3 | stockpedido.component.ts | `src/app/components/stockpedido/` | 72 | 🔴 CRÍTICA |
| 4 | stockrecibo.component.ts | `src/app/components/stockrecibo/` | 69 | 🔴 CRÍTICA |
| 5 | cajamovi.component.ts | `src/app/components/cajamovi/` | 313 | 🔴 CRÍTICA |
| 6 | historialventas2.component.ts | `src/app/components/historialventas2/` | 877, 1712 | 🔴 CRÍTICA |
| 7 | cabeceras.component.ts | `src/app/components/cabeceras/` | 123, 167, 174, 328 | 🔴 CRÍTICA |
| 8 | newcliente.component.ts | `src/app/components/newcliente/` | 78 | 🟡 MEDIA |
| 9 | editcliente.component.ts | `src/app/components/editcliente/` | 32 | 🟡 MEDIA |
| 10 | cambioprecios.component.ts | `src/app/components/cambioprecios/` | 70, 340, 534 | 🔴 CRÍTICA |
| 11 | cuentacorriente.component.ts | `src/app/components/cuentacorriente/` | 23, 34 | 🔴 CRÍTICA |
| 12 | analisiscaja.component.ts | `src/app/components/analisiscaja/` | 153, 180 | 🔴 CRÍTICA |
| 13 | analisiscajaprod.component.ts | `src/app/components/analisiscajaprod/` | 147, 174 | 🔴 CRÍTICA |
| 14 | grilla.component.ts | `src/app/components/grilla/` | 96-100 | 🟡 MEDIA |
| 15 | puntoventa.component.ts | `src/app/components/puntoventa/` | 34 | 🔴 CRÍTICA |
| 16 | enviostockpendientes.component.ts | `src/app/components/enviostockpendientes/` | 73 | 🔴 CRÍTICA |
| 17 | enviodestockrealizados.component.ts | `src/app/components/enviodestockrealizados/` | 51 | 🔴 CRÍTICA |

**Total referencias en componentes**: 50+

---

### 10.2 Servicios de Frontend (6 archivos)

| # | Servicio | Path | Líneas | Criticidad |
|---|----------|------|--------|------------|
| 1 | articulos-paginados.service.ts | `src/app/services/` | 56, 117, 316 | 🔴 CRÍTICA |
| 2 | stock-paginados.service.ts | `src/app/services/` | 52, 111, 305 | 🔴 CRÍTICA |
| 3 | historial-ventas2-paginados.service.ts | `src/app/services/` | 49, 132, 210, 335, 365 | 🔴 CRÍTICA |
| 4 | historial-ventas-paginados.service.ts | `src/app/services/` | 44, 122, 247 | 🔴 CRÍTICA |
| 5 | historial-pdf.service.ts | `src/app/services/` | 144 | 🔴 CRÍTICA |
| 6 | price-update.service.ts | `src/app/services/` | 102 | 🔴 CRÍTICA |

**Total métodos afectados**: 16+

---

### 10.3 Backend PHP (2 archivos principales)

| # | Archivo | Líneas Críticas | Referencias | Criticidad |
|---|---------|-----------------|-------------|------------|
| 1 | **Descarga.php** | 1729-1737 (mapeo hardcodeado)<br>1832-1856 (mapeo cancelación)<br>1930-1950 (mapeo confirmación) | 80+ | 🔴 CRÍTICA |
| 2 | **Carga.php** | 313, 352, 395, 436, 474, 547, 573, etc. | 40+ | 🔴 CRÍTICA |

**Funciones críticas en Descarga.php**:
- `pagoconCCcabeceras_post()` - Línea 1386
- `crearPedidoStockNuevo_post()` - Línea 1608
- `confirmarRecepcionEnvioStock_post()` - Línea 1695
- `cancelarEnvioStock_post()` - Línea 1895
- `insertarArticulobd_post()` - Línea 2053
- `nuevoMoviCaja_post()` - Línea 2406
- `actualizarPreciosGlobal_post()` - Línea 2569
- `updateArticulo_post()` - Línea 3418
- `obtenerCuentaCorrienteGET()` - Línea 3656
- `obtenerDetalleVentaConRecibo_get()` - Línea 3835
- `obtenerHistorialVentasCliente_get()` - Línea 3942
- `obtenerHistorialVentasGlobal_get()` - Línea 4141

**Funciones críticas en Carga.php**:
- `Artsucursal_get()` - Línea 41
- `facturasCabPorCliente_post()` - Línea 309
- `facturasCabPorNumeroComprobante_post()` - Línea 349
- `psucursalPorComprobante_post()` - Línea 392
- `facturasCab_post()` - Línea 432
- `cliente_post()` - Línea 503
- `psucursal_post()` - Línea 544
- `psucursalPorIdNum_post()` - Línea 570
- `getReciboPorComprobante_post()` - Línea 690
- `PedidoItemsPorSucursalh_post()` - Línea 787, 920, 965
- `CajamoviPorSucursal_post()` - Línea 1338
- `obtenerCabeceraPDF_post()` - Línea 1976
- `obtenerClienteCompletoPDF_post()` - Línea 2032
- `obtenerDetalleVentaPDF_post()` - Línea 2080
- `SucursalInfoPDF_post()` - Línea 2137

---

### 10.4 Tablas de PostgreSQL (15+ tablas)

| # | Tabla | Tipo | Dependencia del Value | Criticidad |
|---|-------|------|----------------------|------------|
| 1 | sucursales | Maestra | cod_sucursal = value | 🔴 CRÍTICA |
| 2 | artsucursal | Stock | Columnas exi1-5, prefi1-4, stkmin/max 1-5 | 🔴 CRÍTICA |
| 3 | psucursal1 | Pedidos | Sufijo = value 1 | 🔴 CRÍTICA |
| 4 | psucursal2 | Pedidos | Sufijo = value 2 | 🔴 CRÍTICA |
| 5 | psucursal3 | Pedidos | Sufijo = value 3 | 🔴 CRÍTICA |
| 6 | psucursal4 | Pedidos | Sufijo = value 4 | 🔴 CRÍTICA |
| 7 | psucursal5 | Pedidos | Sufijo = value 5 | 🔴 CRÍTICA |
| 8 | factcab1 | Facturas | Sufijo = value 1 | 🔴 CRÍTICA |
| 9 | factcab2 | Facturas | Sufijo = value 2 | 🔴 CRÍTICA |
| 10 | factcab3 | Facturas | Sufijo = value 3 | 🔴 CRÍTICA |
| 11 | factcab4 | Facturas | Sufijo = value 4 | 🔴 CRÍTICA |
| 12 | factcab5 | Facturas | Sufijo = value 5 | 🔴 CRÍTICA |
| 13 | recibos1 | Recibos | Sufijo = value 1 | 🔴 CRÍTICA |
| 14 | recibos2 | Recibos | Sufijo = value 2 | 🔴 CRÍTICA |
| 15 | recibos3 | Recibos | Sufijo = value 3 | 🔴 CRÍTICA |
| 16 | recibos4 | Recibos | Sufijo = value 4 | 🔴 CRÍTICA |
| 17 | recibos5 | Recibos | Sufijo = value 5 | 🔴 CRÍTICA |
| 18 | pedidoscb | Pedidos | Columnas sucursald, sucursalh = value | 🔴 CRÍTICA |
| 19 | pedidoitem | Items | Relacionado con pedidoscb | 🔴 CRÍTICA |
| 20 | cajamovi | Caja | Columna sucursal = value | 🔴 CRÍTICA |

---

## 11. Recomendaciones y Plan de Acción

### 11.1 Recomendaciones Inmediatas

1. **🚫 NO MODIFICAR** los valores "value" existentes en Firebase bajo ninguna circunstancia sin migración planificada

2. **🔒 Proteger Firebase**:
   - Implementar reglas de seguridad que impidan modificación de values
   - Crear backup automático antes de cualquier cambio
   - Documentar valores actuales como "VALORES INMUTABLES"

3. **📋 Documentación**:
   - Crear documento "VALORES_INMUTABLES_SUCURSALES.md"
   - Agregar comentarios de advertencia en código crítico
   - Actualizar manual de operaciones

---

### 11.2 Solución a Corto Plazo (1-2 semanas)

#### Opción A: Agregar Capa de Mapeo en Firebase

**Propuesta**: Agregar un campo adicional que permita separar el ID lógico del value físico:

```json
{
  "sucursales": {
    "[key-firebase]": {
      "nombre": "DEPOSITO",
      "value": 1,  // ← Mantener sin cambios (legacy)
      "id_logico": 1,  // ← Nuevo campo para lógica de negocio
      "cod_postgres": 1  // ← Mapeo explícito a PostgreSQL
    }
  }
}
```

**Ventajas**:
- ✓ No requiere modificar PostgreSQL
- ✓ Permite migración gradual
- ✓ Backward compatible

**Desventajas**:
- ✗ Código duplicado temporalmente
- ✗ Requiere actualizar 65+ ubicaciones gradualmente

---

### 11.3 Solución a Mediano Plazo (1-2 meses)

#### Opción B: Migración a Tabla de Mapeo Centralizada

**Propuesta**: Crear tabla de configuración en PostgreSQL que centralice los mapeos:

```sql
CREATE TABLE sucursal_config (
    id_firebase INTEGER PRIMARY KEY,  -- value de Firebase
    cod_sucursal INTEGER NOT NULL,    -- Código PostgreSQL
    nombre VARCHAR(50),
    columna_stock VARCHAR(10),         -- 'exi1', 'exi2', etc.
    columna_precio VARCHAR(10),        -- 'prefi1', 'prefi2', etc.
    tabla_pedidos VARCHAR(20),         -- 'psucursal1', etc.
    tabla_facturas VARCHAR(20),        -- 'factcab1', etc.
    tabla_recibos VARCHAR(20),         -- 'recibos1', etc.
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar mapeos actuales
INSERT INTO sucursal_config VALUES
(1, 1, 'DEPOSITO', 'exi2', 'prefi1', 'psucursal1', 'factcab1', 'recibos1', TRUE),
(2, 2, 'CASA CENTRAL', 'exi3', 'prefi2', 'psucursal2', 'factcab2', 'recibos2', TRUE),
(3, 3, 'VALLE VIEJO', 'exi4', 'prefi3', 'psucursal3', 'factcab3', 'recibos3', TRUE),
(4, 4, 'GUEMES', 'exi1', 'prefi4', 'psucursal4', 'factcab4', 'recibos4', TRUE),
(5, 5, 'MAYORISTA', 'exi5', 'prefi4', 'psucursal5', 'factcab5', 'recibos5', TRUE);
```

**Refactorización del Backend**:

```php
// ANTES (hardcodeado)
$mapeo_sucursal_exi = [
    1 => 'exi2',
    2 => 'exi3',
    3 => 'exi4',
    4 => 'exi1',
    5 => 'exi5'
];
$campo_stock = $mapeo_sucursal_exi[$sucursal];

// DESPUÉS (dinámico)
function obtenerConfigSucursal($id_firebase) {
    $query = $this->db->get_where('sucursal_config', ['id_firebase' => $id_firebase]);
    if ($query->num_rows() > 0) {
        return $query->row();
    }
    throw new Exception("Configuración no encontrada para sucursal: " . $id_firebase);
}

$config = obtenerConfigSucursal($sucursal);
$campo_stock = $config->columna_stock;
$tabla_pedidos = $config->tabla_pedidos;
```

**Ventajas**:
- ✓ Centralización de configuración
- ✓ Modificación sin cambiar código
- ✓ Permite agregar nuevas sucursales fácilmente
- ✓ Facilita auditoría y troubleshooting

**Desventajas**:
- ✗ Requiere refactorización significativa (40+ funciones)
- ✗ Riesgo de introducir bugs durante migración

---

### 11.4 Solución a Largo Plazo (3-6 meses)

#### Opción C: Reestructuración Completa del Esquema

**Propuesta**: Migrar a esquema normalizado que no dependa de sufijos numéricos:

```sql
-- Nueva estructura unificada
CREATE TABLE pedidos (
    id_pedido SERIAL PRIMARY KEY,
    id_sucursal INTEGER REFERENCES sucursales(cod_sucursal),
    fecha DATE,
    ...
);

CREATE TABLE facturas (
    id_factura SERIAL PRIMARY KEY,
    id_sucursal INTEGER REFERENCES sucursales(cod_sucursal),
    tipo VARCHAR(2),
    ...
);

CREATE TABLE stock (
    id_articulo INTEGER,
    id_sucursal INTEGER,
    existencia NUMERIC,
    precio NUMERIC,
    PRIMARY KEY (id_articulo, id_sucursal)
);
```

**Ventajas**:
- ✓ Esquema normalizado y escalable
- ✓ Fácil agregar nuevas sucursales
- ✓ Mejor integridad referencial
- ✓ Consultas más simples

**Desventajas**:
- ✗ Requiere migración masiva de datos
- ✗ Downtime significativo
- ✗ Refactorización completa de backend y frontend
- ✗ Alto costo de desarrollo

---

## 12. Plan de Migración (Si se requiere modificar)

### 12.1 Fase 1: Preparación (Semana 1)

**Acciones**:
1. ✅ Crear backup completo de Firebase y PostgreSQL
2. ✅ Documentar todos los mapeos actuales
3. ✅ Crear ambiente de pruebas idéntico a producción
4. ✅ Definir nuevos valores de sucursal (si aplica)
5. ✅ Crear matriz de mapeo old → new

**Entregables**:
- Backup verificado
- Documento de mapeo completo
- Ambiente de QA configurado

---

### 12.2 Fase 2: Actualización de Backend (Semana 2-3)

**Acciones**:
1. Crear tabla `sucursal_config` en PostgreSQL
2. Refactorizar funciones críticas en Descarga.php (12 funciones)
3. Refactorizar funciones críticas en Carga.php (14 funciones)
4. Crear función helper `obtenerConfigSucursal()`
5. Agregar tests unitarios para cada función refactorizada

**Archivos a modificar**:
- `/src/Descarga.php` (26 cambios)
- `/src/Carga.php` (20 cambios)

---

### 12.3 Fase 3: Actualización de Frontend (Semana 4)

**Acciones**:
1. Crear servicio centralizado `SucursalService`
2. Refactorizar 17 componentes para usar nuevo servicio
3. Actualizar 6 servicios paginados
4. Modificar Login2Component para nuevos values

**Archivos a modificar**:
- 17 componentes (50+ líneas)
- 6 servicios (16+ métodos)
- 1 servicio nuevo (SucursalService)

---

### 12.4 Fase 4: Actualización de Firebase y PostgreSQL (Semana 5)

**Acciones**:
1. Agregar campo `id_logico` a Firebase `sucursales`
2. Poblar `sucursal_config` en PostgreSQL
3. Actualizar permisos de usuarios (`sucursalesPermitidas`)
4. Validar mapeos con queries de prueba

---

### 12.5 Fase 5: Testing Exhaustivo (Semana 6-7)

**Casos de prueba**:
1. ✓ Login con cada sucursal
2. ✓ Consulta de productos por sucursal
3. ✓ Proceso de venta completo
4. ✓ Movimiento de stock entre sucursales
5. ✓ Generación de reportes
6. ✓ Análisis de caja
7. ✓ Generación de PDFs
8. ✓ Cuenta corriente
9. ✓ Cambio de precios
10. ✓ Pedidos entre sucursales

**Tests de regresión**:
- Testing manual en QA (40 horas)
- Testing automatizado (si existe suite)
- UAT con usuarios finales (20 horas)

---

### 12.6 Fase 6: Deploy a Producción (Semana 8)

**Plan de deploy**:
1. **Ventana de mantenimiento**: Sábado 02:00 AM - 06:00 AM
2. **Backup completo** antes de iniciar
3. **Deploy de cambios**:
   - PostgreSQL: Crear tabla `sucursal_config` (5 min)
   - Backend: Actualizar Carga.php y Descarga.php (10 min)
   - Frontend: Deploy de nueva versión Angular (15 min)
   - Firebase: Actualizar estructura de sucursales (5 min)
4. **Smoke tests** en producción (30 min)
5. **Rollback plan**: Restaurar desde backup si falla (30 min)

**Criterios de éxito**:
- ✓ Login funcional para todas las sucursales
- ✓ Venta de prueba exitosa
- ✓ Consulta de stock correcta
- ✓ Reportes generados correctamente

---

## 13. Estimación de Esfuerzo

### 13.1 Recursos Necesarios

| Rol | Horas | Costo Estimado |
|-----|-------|----------------|
| Backend Developer (PHP) | 80 horas | - |
| Frontend Developer (Angular) | 60 horas | - |
| QA Engineer | 40 horas | - |
| DBA | 20 horas | - |
| Project Manager | 20 horas | - |
| **Total** | **220 horas** | **~2 meses** |

### 13.2 Riesgos del Proyecto

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Bugs en refactorización | ALTA | CRÍTICO | Testing exhaustivo, code review |
| Downtime extendido | MEDIA | ALTO | Ensayar en QA, tener rollback plan |
| Datos inconsistentes | MEDIA | CRÍTICO | Validaciones adicionales, logs detallados |
| Resistencia de usuarios | BAJA | MEDIO | Capacitación, comunicación clara |

---

## 14. Conclusiones Finales

### 14.1 Veredicto Principal

**🔴 NO MODIFICAR** los valores "value" de Firebase sin realizar la migración completa descrita en este documento. El impacto es **CRÍTICO** y afectaría:

- ✗ 100% de funcionalidades de venta
- ✗ 100% de gestión de stock
- ✗ 100% de reportes gerenciales
- ✗ 100% de operaciones entre sucursales
- ✗ 100% de usuarios (imposibilidad de login o acceso incorrecto)

### 14.2 Alternativas sin Modificar Values

Si el objetivo es agregar información o mejorar la gestión de sucursales:

**Opción 1**: Agregar campos adicionales sin tocar `value`
```json
{
  "nombre": "DEPOSITO",
  "value": 1,  // ← NO TOCAR
  "direccion": "Calle X",  // ← Agregar información nueva
  "telefono": "123456",
  "responsable": "Juan Pérez"
}
```

**Opción 2**: Crear nodo paralelo de configuración
```json
{
  "sucursales": { ... },  // ← Mantener intacto
  "sucursales_config": {  // ← Nuevo nodo
    "1": {"zona": "norte", "horario": "9-18"},
    "2": {"zona": "sur", "horario": "8-20"}
  }
}
```

### 14.3 Impacto Empresarial de Modificación

| Categoría | Impacto | Consecuencias |
|-----------|---------|---------------|
| **Operacional** | 🔴 CRÍTICO | Sistema inoperable, pérdida de ventas |
| **Financiero** | 🔴 ALTO | Imposibilidad de facturar, pérdida de ingresos |
| **Legal** | 🔴 ALTO | Incumplimiento de normativa fiscal (AFIP) |
| **Reputacional** | 🔴 MEDIO | Insatisfacción de clientes por demoras |
| **Datos** | 🔴 CRÍTICO | Corrupción de datos históricos |

### 14.4 Recomendación Final

**Si NO es absolutamente necesario modificar los values**: **NO LO HAGA**.

**Si ES necesario**: Siga el plan de migración completo (8 semanas) con supervisión de:
- Desarrollador Backend Senior
- Desarrollador Frontend Senior
- DBA
- QA Lead
- Usuario clave de cada sucursal para UAT

---

## 15. Contactos y Responsables

**Documento elaborado por**: Análisis Técnico MotoApp
**Fecha**: 2025-11-02
**Próxima revisión**: Antes de cualquier modificación estructural

---

**⚠️ IMPORTANTE**: Este documento debe ser leído y aprobado por el equipo técnico completo antes de realizar CUALQUIER modificación relacionada con los valores de sucursal en Firebase.

---

**Fin del Informe**
