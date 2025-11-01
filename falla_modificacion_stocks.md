# INFORME: Falla en Modificación de Stocks - MOV.STOCK

**Fecha**: 2025-10-31
**Sistema**: MOV.STOCK - Sistema de Movimientos de Stock
**Archivo Afectado**: `Descarga.php`
**Función Afectada**: `PedidoItemyCabIdEnvio_post()`

---

## RESUMEN EJECUTIVO

Se identificó un bug crítico en la función de **envío directo de stock** (`PedidoItemyCabIdEnvio_post`). La función registra correctamente el movimiento en la base de datos pero **NO actualiza los stocks** en la tabla `artsucursal`. Esto causa una inconsistencia grave: el sistema registra movimientos de stock que no se reflejan en el inventario real.

---

## CONTEXTO

### Flujos del Sistema MOV.STOCK

El sistema tiene dos flujos principales para transferir stock entre sucursales:

1. **Flujo Completo (Pedido → Envío → Recepción)**:
   - Sucursal A solicita stock → `PedidoItemyCab_post()`
   - Sucursal B procesa la solicitud y envía → `PedidoItemyCabId_post()`
   - Sucursal A recibe el stock → **AQUÍ se actualizan los stocks**
   - Estado: "Solicitado" → "Solicitado-E" → "Enviado" → "Recibido"

2. **Flujo Directo (Envío sin Solicitud Previa)**:
   - Sucursal B envía stock directamente a Sucursal A → `PedidoItemyCabIdEnvio_post()`
   - **PROBLEMA**: Los stocks NO se actualizan
   - Estado: "Enviado" (directo)

---

## ANÁLISIS TÉCNICO

### Prueba Realizada

```
Usuario: luis
Artículo: ACEL. RAP. MDA 3010 6470 (id_articulo = 7323)
Cantidad: 1 unidad
Sucursal Origen (envía): Valle Viejo (value=2, exi3)
Sucursal Destino (recibe): Casa Central (value=1, exi2)
```

**Resultado Esperado**:
- exi3 (Valle Viejo): 5 → 4 (resta 1)
- exi2 (Casa Central): -81 → -80 (suma 1)

**Resultado Real**:
- exi3 (Valle Viejo): 5 (sin cambio) ❌
- exi2 (Casa Central): -81 (sin cambio) ❌

**Registro en Base de Datos**:
```sql
-- pedidoscb (id_num = 55)
sucursald=2 (Valle Viejo - destino)
sucursalh=1 (Casa Central - origen)
estado='Enviado'

-- pedidoitem (id_items = 67)
id_art=7323 ✓ (correcto)
cantidad=1.00
estado='Enviado'
```

---

## CÓDIGO PROBLEMÁTICO

### Función: `PedidoItemyCabIdEnvio_post()` (Líneas 1809-1962)

```php
public function PedidoItemyCabIdEnvio_post() {
    // ... código de validación ...

    // ✓ Valida que id_art sea válido (líneas 1821-1832)
    if ($pedidoItem['id_art'] == 0) {
        // rechaza
    }

    // ✓ Valida stock disponible (líneas 1834-1887)
    $sucursal_origen = $pedidoscb['sucursald']; // ❌ ERROR AQUÍ
    $sql_check_stock = "SELECT $campo_stock_origen FROM artsucursal WHERE id_articulo = ?";
    if ($stock_actual < $pedidoItem['cantidad']) {
        // rechaza
    }

    // ✓ Crea registros en pedidoitem (líneas 1890-1904)
    INSERT INTO pedidoitem...

    // ✓ Crea registros en pedidoscb (líneas 1906-1920)
    INSERT INTO pedidoscb...

    // ✓ Actualiza estados (líneas 1925-1933)
    UPDATE pedidoitem SET estado = 'Solicitado-E'...
    UPDATE pedidoscb SET estado = 'Solicitado-E'...

    // ❌ FALTA: UPDATE de stocks en artsucursal
    // NO HAY CÓDIGO PARA ACTUALIZAR LOS STOCKS

    $this->db->trans_complete();
}
```

---

## ERRORES IDENTIFICADOS

### Error #1: Variable Mal Asignada (Línea 1853)

```php
// INCORRECTO:
$sucursal_origen = $pedidoscb['sucursald']; // Sucursal que envía

// CORRECTO:
$sucursal_origen = $pedidoscb['sucursalh']; // Sucursal que envía
```

**Explicación**:
- `sucursald` = Sucursal DESTINO (la que recibe)
- `sucursalh` = Sucursal ORIGEN (la que envía)

El comentario dice "Sucursal que envía" pero usa el campo incorrecto.

### Error #2: Falta Actualización de Stocks

La función **NO contiene código** para actualizar los stocks en `artsucursal`. Después de las líneas 1925-1933 (actualización de estados), debería existir código similar al de `PedidoItemyCabId_post()`:

```php
// CÓDIGO FALTANTE EN PedidoItemyCabIdEnvio_post():

// Actualizar stock en sucursal DESTINO (SUMA)
$sucursal_destino = $pedidoscb['sucursald'];
$campo_stock_destino = $mapeo_sucursal_exi[$sucursal_destino];

$sql_update_destino = "UPDATE artsucursal
                       SET $campo_stock_destino = $campo_stock_destino + ?
                       WHERE id_articulo = ?";
$this->db->query($sql_update_destino, [$pedidoItem['cantidad'], $pedidoItem['id_art']]);

// Actualizar stock en sucursal ORIGEN (RESTA)
$sucursal_origen = $pedidoscb['sucursalh'];
$campo_stock_origen = $mapeo_sucursal_exi[$sucursal_origen];

$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?
                      AND $campo_stock_origen >= ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art'],
    $pedidoItem['cantidad']
]);

// Verificar que la actualización fue exitosa
if ($this->db->affected_rows() === 0) {
    $this->db->trans_rollback();
    // error: stock insuficiente
}
```

---

## COMPARACIÓN: Función que SÍ Funciona

### `PedidoItemyCabId_post()` (Recibir pedido) - Líneas 1723-1778

Esta función **SÍ actualiza correctamente los stocks**:

```php
// Línea 1738: Identifica sucursal DESTINO correctamente
$sucursal_destino = $pedidoscb['sucursald'];

// Líneas 1743-1749: SUMA stock al destino
$sql_update_destino = "UPDATE artsucursal
                       SET $campo_stock_destino = $campo_stock_destino + ?
                       WHERE id_articulo = ?";

// Línea 1752: Identifica sucursal ORIGEN correctamente
$sucursal_origen = $pedidoscb['sucursalh'];

// Líneas 1757-1765: RESTA stock del origen
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?
                      AND $campo_stock_origen >= ?";

// Líneas 1767-1777: Valida que el UPDATE fue exitoso
if ($this->db->affected_rows() === 0) {
    $this->db->trans_rollback();
}
```

---

## IMPACTO DEL BUG

### Consecuencias Actuales

1. **Inconsistencia de Inventario**:
   - El sistema registra movimientos que no existen en el stock real
   - Imposible confiar en los reportes de stock

2. **Pedidos Fantasma**:
   - Se crean pedidos "Enviados" sin respaldo en inventario
   - Stock físico no coincide con stock en sistema

3. **Problemas Operativos**:
   - Sucursales reportan envíos que no se reflejan en stock
   - Imposibilidad de rastrear stock real por sucursal

### Registros Afectados

```sql
-- Consulta de pedidos con este problema:
SELECT COUNT(*) FROM pedidoitem
WHERE estado = 'Enviado'
AND id_art > 0
AND NOT EXISTS (
    SELECT 1 FROM pedidoitem p2
    WHERE p2.id_num = pedidoitem.id_num
    AND p2.estado = 'Recibido'
);
-- Resultado: Todos los envíos directos tienen este problema
```

---

## SOLUCIÓN REQUERIDA

### Paso 1: Corregir Variable (Línea 1853)

```php
// ANTES:
$sucursal_origen = $pedidoscb['sucursald']; // Sucursal que envía

// DESPUÉS:
$sucursal_origen = $pedidoscb['sucursalh']; // Sucursal que envía
```

### Paso 2: Agregar Actualización de Stocks

**Ubicación**: Después de las actualizaciones de estado (después de línea 1933), antes del `trans_complete()` (línea 1935).

**Código a insertar**:

```php
// ============================================================================
// ACTUALIZACIÓN AUTOMÁTICA DE STOCK EN ENVÍO DIRECTO
// ============================================================================
// Actualizar stock en sucursal DESTINO (la que recibe - SUMA stock)
$sucursal_destino = $pedidoscb['sucursald'];
$campo_stock_destino = isset($mapeo_sucursal_exi[$sucursal_destino])
    ? $mapeo_sucursal_exi[$sucursal_destino]
    : 'exi' . $sucursal_destino; // Fallback por seguridad

$sql_update_destino = "UPDATE artsucursal
                       SET $campo_stock_destino = $campo_stock_destino + ?
                       WHERE id_articulo = ?";
$this->db->query($sql_update_destino, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art']
]);

// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
// Nota: Ya tenemos $campo_stock_origen definido en líneas 1854-1856
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?
                      AND $campo_stock_origen >= ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art'],
    $pedidoItem['cantidad']  // Validar que haya stock suficiente
]);

// Verificar que la actualización de stock origen fue exitosa
if ($this->db->affected_rows() === 0) {
    // Si no se actualizó ninguna fila, es porque no hay stock suficiente
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: Stock insuficiente en sucursal origen para completar el envío. El stock pudo haber cambiado desde la validación inicial."
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
// ============================================================================
```

### Paso 3: Mover Definición de `$mapeo_sucursal_exi`

El array de mapeo está definido en línea 1845, pero será necesario también para las UPDATE queries. Debe permanecer donde está (antes de la validación de stock) para que esté disponible cuando se necesite.

---

## VALIDACIÓN POST-CORRECCIÓN

### Prueba 1: Envío Directo Simple

```
1. Enviar 1 unidad de artículo 7323
2. Origen: Valle Viejo (value=2, exi3=5)
3. Destino: Casa Central (value=1, exi2=-81)

Resultado esperado:
- exi3: 5 → 4 ✓
- exi2: -81 → -80 ✓
- pedidoitem.estado = 'Enviado' ✓
- pedidoscb.estado = 'Enviado' ✓
```

### Prueba 2: Validación de Stock Insuficiente

```
1. Intentar enviar 10 unidades de artículo 7323
2. Origen: Valle Viejo (exi3=4, después de Prueba 1)

Resultado esperado:
- Error: "Stock insuficiente" ✓
- Rollback de transacción ✓
- No se crea registro en BD ✓
```

### Prueba 3: Flujo Completo vs Flujo Directo

```
Ejecutar ambos flujos y verificar que los stocks finales sean iguales:

Flujo Completo:
1. Solicitar → Enviar → Recibir
2. Verificar stocks finales

Flujo Directo:
1. Enviar directamente
2. Verificar stocks finales

Los stocks deben ser idénticos en ambos casos ✓
```

---

## RECOMENDACIONES

### Inmediatas

1. ✅ **Aplicar correcciones** en `Descarga.php`
2. ✅ **Subir al servidor** inmediatamente
3. ✅ **Probar en producción** con artículo de prueba
4. ⚠️ **Documentar envíos directos** realizados antes de la corrección
5. ⚠️ **Revisar stocks manualmente** para pedidos con `estado='Enviado'` sin posterior `estado='Recibido'`

### A Mediano Plazo

1. **Auditoría de Stocks**:
   - Comparar stock físico vs stock en sistema
   - Ajustar discrepancias encontradas

2. **Logs de Auditoría**:
   - Agregar tabla de log para todos los cambios de stock
   - Registrar: fecha, usuario, artículo, sucursal, cantidad anterior, cantidad nueva, motivo

3. **Testing Automatizado**:
   - Crear suite de tests para validar ambos flujos
   - Tests de integración para verificar consistencia de stocks

4. **Monitoreo**:
   - Alertas cuando stock sea negativo sin causa justificada
   - Dashboard de movimientos de stock en tiempo real

---

## CONCLUSIÓN

El bug en `PedidoItemyCabIdEnvio_post()` causa que los envíos directos de stock se registren en la base de datos pero no actualicen el inventario. La solución requiere:

1. Corregir la asignación de `$sucursal_origen` (usa el campo incorrecto)
2. Agregar código para actualizar stocks en `artsucursal` (actualmente faltante)
3. Validar que las UPDATE queries sean exitosas (prevenir condiciones de carrera)

**Prioridad**: CRÍTICA
**Tiempo estimado de corrección**: 15 minutos
**Impacto de la corrección**: ALTO (resuelve inconsistencias de inventario)

---

**Documento generado**: 2025-10-31
**Archivo**: `Descarga.php` (líneas 1809-1962)
**Función**: `PedidoItemyCabIdEnvio_post()`
