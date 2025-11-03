# Plan de Análisis: Descuento de Stock en Envíos

## Fecha de Análisis
2025-11-03

## Problema Reportado
Se realizó un envío de stock de **Casa Central a Guemes** de **12 unidades** desde el componente `/stockenvio`. El envío se registró correctamente en la base de datos y es visible en el componente `/stockrecibo` en Guemes, **sin embargo los valores de existencias (exi) NO se ajustaron** al movimiento real de stock.

Adicionalmente, **NO hubo aviso** (mensaje de éxito ni de error) después de realizar el envío.

---

## 1. Flujo que NO Funciona: Envío Directo desde /stockenvio

### 1.1 Descripción del Flujo

**Componentes involucrados**:
1. `stockenvio.component.ts` - Lista de productos disponibles
2. `stockproductoenvio.component.ts` - Diálogo de envío

**Ubicación**: `src/app/components/stockenvio/` y `src/app/components/stockproductoenvio/`

### 1.2 Proceso Paso a Paso

#### Paso 1: Usuario selecciona producto
- **Componente**: `stockenvio.component.ts:561`
- Se abre diálogo `StockproductoenvioComponent`
- Muestra datos del producto seleccionado

#### Paso 2: Usuario ingresa datos de envío
- **Componente**: `stockproductoenvio.component.ts`
- Usuario selecciona:
  - Sucursal destino (dropdown)
  - Cantidad a enviar
  - Comentario (opcional)

#### Paso 3: Usuario confirma envío
- **Método**: `comprar()` línea 69
- **Servicio**: `crearPedidoStock()`  línea 119
- **URL Backend**: `UrlPedidoItemyCab`
- **Método Backend**: `PedidoItemyCab_post()` (Descarga.php.txt líneas 1568-1652)

### 1.3 Datos Enviados al Backend

```typescript
// stockproductoenvio.component.ts líneas 98-109
const pedidoscb = {
  id_num: 123,         // Se ignora en backend
  tipo: "PE",
  sucursald: Number(this.sucursal),      // Casa Central (1) - ORIGEN
  sucursalh: this.selectedSucursal,       // Guemes (3) - DESTINO
  fecha: fechaFormateada,
  usuario: this.usuario,
  observacion: this.comentario,
  estado: "Enviado",
  id_aso: 222
};
```

### 1.4 Backend: `PedidoItemyCab_post()`

**Ubicación**: `Descarga.php.txt` líneas 1568-1652

**Acciones que realiza**:
1. ✓ Inserta registro en tabla `pedidoitem` con estado "Enviado"
2. ✓ Inserta registro en tabla `pedidoscb` con estado "Enviado"
3. ✓ Relaciona ambos registros (id_num ↔ id_items)
4. ❌ **NO actualiza stock en `artsucursal`**

### 1.5 ❌ Problemas Identificados

#### Problema 1: NO actualiza stock
El método `PedidoItemyCab_post()` **NO contiene lógica** para actualizar las existencias (exi) en la tabla `artsucursal`. Solo crea registros en `pedidoitem` y `pedidoscb`.

**Evidencia**:
```php
// Descarga.php.txt líneas 1568-1652
// NO HAY código de actualización de stock
// Solo hay INSERT en pedidoitem y pedidoscb
```

#### Problema 2: NO muestra mensaje al usuario
El componente **NO implementa alertas** de éxito o error usando SweetAlert2.

**Evidencia**:
```typescript
// stockproductoenvio.component.ts líneas 119-128
this.cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe(
  response => {
    console.log('Pedido creado exitosamente', response); // Solo console.log
    this.ref.close(); // Cierra diálogo sin mensaje
  },
  error => {
    console.error('Error al crear el pedido', error); // Solo console.error
    // NO hay Swal.fire('Error', ...)
  }
);
```

---

## 2. Flujo que SÍ Funciona: Recibir Pedido Solicitado

### 2.1 Descripción del Flujo

**Componente involucrado**: `stockpedido.component.ts`

**Ubicación**: `src/app/components/stockpedido/`

### 2.2 Proceso Paso a Paso

#### Paso 1: Guemes solicita stock (estado inicial)
- Estado creado: "Solicitado"
- **NO se actualiza stock** en este paso

#### Paso 2: Casa Central envía stock
- Se usa componente `enviostockpendientes`
- **SÍ se actualiza stock** (si funcionara correctamente)
- Estado cambia a: "Solicitado-E"

#### Paso 3: Guemes confirma recepción
- **Componente**: `stockpedido.component.ts`
- **Método**: `recibir()` línea 289
- **Servicio**: `crearPedidoStockId()` línea 330
- **URL Backend**: `UrlPedidoItemyCabId`
- **Método Backend**: `PedidoItemyCabId_post()` (Descarga.php.txt líneas 1653-1795)

### 2.3 Backend: `PedidoItemyCabId_post()`

**Ubicación**: `Descarga.php.txt` líneas 1653-1795

**Acciones que realiza**:
1. ✓ Inserta nuevo registro en `pedidoitem` con estado "Recibido"
2. ✓ Inserta nuevo registro en `pedidoscb` con estado "Recibido"
3. ✓ Actualiza estado del pedido original a "Recibido"
4. ✓ **SÍ actualiza stock en `artsucursal`** (líneas 1723-1765)

### 2.4 ✓ Actualización de Stock Correcta

```php
// Descarga.php.txt líneas 1723-1765
// MAPEO DE SUCURSALES
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];

// SUMA stock en sucursal DESTINO (quien recibe)
$sucursal_destino = $pedidoscb['sucursald']; // Guemes (3) → exi4
UPDATE artsucursal SET exi4 = exi4 + 12 WHERE id_articulo = ?

// RESTA stock en sucursal ORIGEN (quien envía)
$sucursal_origen = $pedidoscb['sucursalh']; // Casa Central (1) → exi2
UPDATE artsucursal SET exi2 = exi2 - 12 WHERE id_articulo = ?
```

---

## 3. Comparación de Flujos

| Aspecto | Envío Directo (/stockenvio) | Recibir Pedido (/stockpedido) |
|---------|----------------------------|-------------------------------|
| **Componente** | stockproductoenvio | stockpedido |
| **Método Servicio** | crearPedidoStock() | crearPedidoStockId() |
| **Backend** | PedidoItemyCab_post() | PedidoItemyCabId_post() |
| **Actualiza Stock** | ❌ NO | ✓ SÍ |
| **Mensaje Usuario** | ❌ NO | ✓ SÍ |
| **Estado Final** | "Enviado" | "Recibido" |

---

## 4. Solución Propuesta

### Opción 1: Agregar Actualización de Stock a `PedidoItemyCab_post()` (Recomendado)

#### Ventajas
- Solución mínima y directa
- Mantiene la estructura actual
- El stock se actualiza inmediatamente al enviar
- Coherente con el comportamiento esperado

#### Implementación

**Archivo**: `Descarga.php.txt`

**Método**: `PedidoItemyCab_post()`

**Ubicación**: Después de línea 1624 (antes de `trans_complete()`)

**Código a agregar**:

```php
// ============================================================================
// ACTUALIZACIÓN AUTOMÁTICA DE STOCK EN ENVÍO DIRECTO
// ============================================================================
// MAPEO DE FIREBASE VALUE A CAMPOS EXI
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];

// En este flujo:
// - sucursald = ORIGEN (quien envía)
// - sucursalh = DESTINO (quien recibe)

// SUMA stock en sucursal DESTINO (la que recibe)
$sucursal_destino = $pedidoscb['sucursalh'];
$campo_stock_destino = isset($mapeo_sucursal_exi[$sucursal_destino])
    ? $mapeo_sucursal_exi[$sucursal_destino]
    : 'exi' . $sucursal_destino;

$sql_update_destino = "UPDATE artsucursal
                       SET $campo_stock_destino = $campo_stock_destino + ?
                       WHERE id_articulo = ?";
$this->db->query($sql_update_destino, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art']
]);

// RESTA stock en sucursal ORIGEN (la que envía)
$sucursal_origen = $pedidoscb['sucursald'];
$campo_stock_origen = isset($mapeo_sucursal_exi[$sucursal_origen])
    ? $mapeo_sucursal_exi[$sucursal_origen]
    : 'exi' . $sucursal_origen;

$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art']
]);
// ============================================================================
```

### Opción 2: Cambiar a usar `crearPedidoStockIdEnvio()` en lugar de `crearPedidoStock()`

#### Ventajas
- Reutiliza código existente que ya funciona
- Método `PedidoItemyCabIdEnvio_post()` ya tiene la lógica de stock

#### Desventajas
- Requiere modificar el componente frontend
- `crearPedidoStockIdEnvio()` espera parámetro `id_num` que no existe en envío directo

#### Implementación NO Recomendada
Esta opción es más compleja porque `PedidoItemyCabIdEnvio_post()` está diseñado para actualizar un pedido existente, no para crear uno nuevo.

---

## 5. Mejoras Adicionales

### 5.1 Agregar Mensajes de Usuario

**Archivo**: `src/app/components/stockproductoenvio/stockproductoenvio.component.ts`

**Ubicación**: Método `comprar()` línea 119

**Código actual**:
```typescript
this.cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe(
  response => {
    console.log('Pedido creado exitosamente', response);
    this.ref.close();
  },
  error => {
    console.error('Error al crear el pedido', error);
  }
);
```

**Código mejorado**:
```typescript
this.cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe({
  next: (response) => {
    console.log('Pedido creado exitosamente', response);
    Swal.fire({
      icon: 'success',
      title: 'Envío exitoso',
      text: `Se enviaron ${this.cantidad} unidades a ${this.getSucursalNombre(this.selectedSucursal)}`,
      confirmButtonText: 'Aceptar'
    }).then(() => {
      this.ref.close();
    });
  },
  error: (err) => {
    console.error('Error al crear el pedido', err);
    Swal.fire({
      icon: 'error',
      title: 'Error al enviar',
      text: err.error?.mensaje || 'No se pudo completar el envío de stock',
      confirmButtonText: 'Aceptar'
    });
  }
});
```

### 5.2 Validación de Stock Disponible (Opcional)

Agregar validación en `PedidoItemyCab_post()` para verificar que hay stock suficiente antes de enviar:

```php
// Después de línea 1590, antes de INSERT
// Consultar stock actual
$sucursal_origen = $pedidoscb['sucursald'];
$campo_stock_origen = isset($mapeo_sucursal_exi[$sucursal_origen])
    ? $mapeo_sucursal_exi[$sucursal_origen]
    : 'exi' . $sucursal_origen;

$sql_check_stock = "SELECT $campo_stock_origen as stock_actual
                    FROM artsucursal
                    WHERE id_articulo = ?";
$query_stock = $this->db->query($sql_check_stock, [$pedidoItem['id_art']]);

if ($query_stock->num_rows() > 0) {
    $row_stock = $query_stock->row_array();
    $stock_actual = $row_stock['stock_actual'];

    if ($stock_actual < $pedidoItem['cantidad']) {
        $this->db->trans_rollback();
        $respuesta = array(
            "error" => true,
            "mensaje" => "Stock insuficiente. Disponible: " . $stock_actual . ", Solicitado: " . $pedidoItem['cantidad']
        );
        $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
        return;
    }
}
```

**Nota**: Actualmente el sistema permite stock negativo según el código en `PedidoItemyCabIdEnvio_post()` líneas 1865-1878. Evaluar si esta validación es necesaria.

### 5.3 Logs de Auditoría

Agregar logging antes y después de actualizar stock para debugging:

```php
// Antes de actualizar destino
error_log("ENVIO DIRECTO - Actualizando stock DESTINO: Sucursal=$sucursal_destino, Campo=$campo_stock_destino, Cantidad=+" . $pedidoItem['cantidad'] . ", Artículo=" . $pedidoItem['id_art']);

// Después de actualizar destino
error_log("ENVIO DIRECTO - Stock DESTINO actualizado. Rows affected: " . $this->db->affected_rows());

// Antes de actualizar origen
error_log("ENVIO DIRECTO - Actualizando stock ORIGEN: Sucursal=$sucursal_origen, Campo=$campo_stock_origen, Cantidad=-" . $pedidoItem['cantidad'] . ", Artículo=" . $pedidoItem['id_art']);

// Después de actualizar origen
error_log("ENVIO DIRECTO - Stock ORIGEN actualizado. Rows affected: " . $this->db->affected_rows());
```

---

## 6. Plan de Implementación

### Fase 1: Corrección Backend (Prioridad Alta)

1. **Modificar `PedidoItemyCab_post()`**
   - Agregar lógica de actualización de stock (Opción 1)
   - Ubicación: Después de línea 1624, antes de `trans_complete()`
   - Agregar logs de auditoría
   - Tiempo estimado: 30 minutos

2. **Probar en desarrollo**
   - Crear caso de prueba: Enviar 10 unidades de Casa Central a Guemes
   - Verificar registros en `pedidoitem` y `pedidoscb`
   - Verificar actualización en `artsucursal` (exi2 y exi4)
   - Tiempo estimado: 15 minutos

### Fase 2: Mejora Frontend (Prioridad Media)

1. **Agregar mensajes de usuario en `stockproductoenvio.component.ts`**
   - Implementar Swal.fire para éxito y error
   - Tiempo estimado: 15 minutos

2. **Probar experiencia de usuario**
   - Enviar stock y verificar mensaje de confirmación
   - Provocar error y verificar mensaje de error
   - Tiempo estimado: 10 minutos

### Fase 3: Validación Opcional (Prioridad Baja)

1. **Agregar validación de stock disponible** (si se requiere)
   - Evaluar si se permite stock negativo
   - Implementar validación según decisión
   - Tiempo estimado: 20 minutos

### Fase 4: Testing y Despliegue

1. **Pruebas de regresión**
   - Verificar que flujos existentes siguen funcionando:
     - Pedir stock (stockpedido)
     - Enviar desde pendientes (enviostockpendientes)
     - Recibir stock (stockpedido - recibir())
   - Tiempo estimado: 30 minutos

2. **Desplegar en producción**
   - Backup de base de datos
   - Desplegar código PHP
   - Compilar y desplegar Angular
   - Monitorear logs
   - Tiempo estimado: 45 minutos

**Tiempo total estimado**: 2.5 - 3 horas

---

## 7. Queries de Diagnóstico

### 7.1 Verificar envío reciente sin actualización de stock

```sql
-- Ver últimos envíos directos (estado "Enviado")
SELECT
    pi.id_items,
    pi.id_num,
    pi.cantidad,
    pi.id_art,
    pi.descripcion,
    pi.estado,
    pi.fecha_resuelto,
    pc.sucursald AS origen,
    pc.sucursalh AS destino
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pi.estado = 'Enviado'
    AND pi.fecha_resuelto >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY pi.fecha_resuelto DESC
LIMIT 10;
```

### 7.2 Verificar stock actual de artículo específico

```sql
-- Reemplazar [ID_ARTICULO] con el id del artículo enviado
SELECT
    id_articulo,
    nomart,
    exi1 AS stock_deposito,
    exi2 AS stock_casa_central,
    exi3 AS stock_valle_viejo,
    exi4 AS stock_guemes,
    exi5 AS stock_mayorista
FROM artsucursal
WHERE id_articulo = [ID_ARTICULO];
```

### 7.3 Auditoría completa de movimientos recientes

```sql
-- Ver todos los movimientos de stock de los últimos 7 días
SELECT
    pi.fecha_resuelto AS fecha,
    pi.estado,
    pi.cantidad,
    pi.descripcion AS articulo,
    CASE pc.sucursald
        WHEN 1 THEN 'Casa Central'
        WHEN 2 THEN 'Valle Viejo'
        WHEN 3 THEN 'Guemes'
        WHEN 4 THEN 'Deposito'
        WHEN 5 THEN 'Mayorista'
    END AS origen,
    CASE pc.sucursalh
        WHEN 1 THEN 'Casa Central'
        WHEN 2 THEN 'Valle Viejo'
        WHEN 3 THEN 'Guemes'
        WHEN 4 THEN 'Deposito'
        WHEN 5 THEN 'Mayorista'
    END AS destino,
    pi.usuario_res AS usuario
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pi.fecha_resuelto >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY pi.fecha_resuelto DESC;
```

---

## 8. Resumen Ejecutivo

### Problema Principal
El método `PedidoItemyCab_post()` utilizado en el flujo de envío directo desde `/stockenvio` **NO actualiza las existencias (exi)** en la tabla `artsucursal`, a diferencia de otros flujos que sí lo hacen correctamente.

### Causa Raíz
**Falta de implementación**: El método backend simplemente no incluye el código necesario para actualizar stock. Los registros se crean en `pedidoitem` y `pedidoscb`, pero no se ejecutan los UPDATE en `artsucursal`.

### Solución Recomendada
Agregar la lógica de actualización de stock a `PedidoItemyCab_post()` siguiendo el mismo patrón exitoso usado en `PedidoItemyCabId_post()`.

### Impacto
- **Usuarios afectados**: Todos los usuarios que usan /stockenvio para enviar stock
- **Datos afectados**: Inventarios desactualizados en todas las sucursales
- **Riesgo**: Alto - puede causar ventas de productos sin stock o rechazo de ventas con stock disponible

### Beneficios de la Solución
- ✓ Stock siempre sincronizado con movimientos reales
- ✓ Mejora experiencia de usuario con mensajes claros
- ✓ Trazabilidad completa de movimientos
- ✓ Consistencia entre todos los flujos de stock

---

## 9. Referencias

### Archivos Frontend

- `src/app/components/stockenvio/stockenvio.component.ts` (línea 561)
- `src/app/components/stockproductoenvio/stockproductoenvio.component.ts` (líneas 69-129)
- `src/app/components/stockpedido/stockpedido.component.ts` (líneas 289-341)
- `src/app/services/cargardata.service.ts` (líneas 179-208)
- `src/app/config/ini.ts` (líneas 145-147)

### Archivos Backend

- `src/Descarga.php.txt`:
  - `PedidoItemyCab_post()` **(PROBLEMA)** (líneas 1568-1652)
  - `PedidoItemyCabId_post()` **(FUNCIONA)** (líneas 1653-1795)
  - `PedidoItemyCabIdEnvio_post()` **(FUNCIONA)** (líneas 1796-1986)

### Tablas de Base de Datos

- `artsucursal` (columnas: id_articulo, exi1, exi2, exi3, exi4, exi5)
- `pedidoitem` (estado: "Solicitado", "Solicitado-E", "Enviado", "Recibido")
- `pedidoscb` (sucursald, sucursalh)

### Mapeo de Sucursales a Columnas EXI

```
Sucursal 1 (Casa Central) → exi2
Sucursal 2 (Valle Viejo)  → exi3
Sucursal 3 (Güemes)       → exi4
Sucursal 4 (Deposito)     → exi1
Sucursal 5 (Mayorista)    → exi5
```

---

**Documento generado el**: 2025-11-03
**Analista**: Claude Code
**Estado**: Análisis Completo - Solución Identificada
**Prioridad**: Alta - Requiere implementación urgente
