# DOCUMENTACIÓN: Eliminación de Restricciones de Stock Negativo

**Fecha**: 2025-10-31
**Versión**: 1.0
**Archivo Modificado**: `Descarga.php`
**Funciones Afectadas**: `PedidoItemyCabIdEnvio_post()`, `PedidoItemyCabId_post()`

---

## RESUMEN EJECUTIVO

Se eliminaron las validaciones que impedían realizar transferencias de stock cuando la sucursal origen tenía stock insuficiente o negativo. Ahora el sistema permite envíos incluso con stock negativo, reflejando correctamente las "deudas de stock" entre sucursales.

### Cambios Principales

1. **Validación inicial deshabilitada**: No se valida que `stock_actual >= cantidad_solicitada`
2. **Cláusula SQL modificada**: Eliminada condición `AND $campo_stock_origen >= ?`
3. **Verificación de affected_rows eliminada**: No se revierte transacción por stock insuficiente

---

## CONTEXTO Y PROBLEMA ORIGINAL

### Comportamiento Anterior

El sistema impedía enviar stock cuando:
- La sucursal origen tenía stock menor a la cantidad solicitada
- La sucursal origen tenía stock negativo

**Ejemplo de error:**
```
Sucursal: Casa Central
Stock actual (exi2): -80
Intento de envío: 1 unidad

Resultado: ❌ Error: "Stock insuficiente en sucursal origen.
                      Disponible: -80, Solicitado: 1.00"
```

### Validaciones Que Impedían el Envío

#### Validación 1: Verificación Inicial de Stock
```php
// Líneas 1878-1887 (ANTES)
if ($stock_actual < $pedidoItem['cantidad']) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: Stock insuficiente en sucursal origen.
                      Disponible: " . $stock_actual . ",
                      Solicitado: " . $pedidoItem['cantidad']
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
```

#### Validación 2: Cláusula SQL con Restricción
```php
// Líneas 1963-1965 (ANTES)
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?
                      AND $campo_stock_origen >= ?";  // ← Restricción
```

#### Validación 3: Verificación de Filas Afectadas
```php
// Líneas 1968-1978 (ANTES)
if ($this->db->affected_rows() === 0) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: Stock insuficiente en sucursal origen..."
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
```

---

## REQUERIMIENTO DEL NEGOCIO

### Necesidad Identificada

El sistema debe permitir transferencias de stock **independientemente del stock actual**, incluyendo escenarios con stock negativo. Esto permite:

1. **Reflejar deudas de stock**: Una sucursal con -80 que envía 1 unidad quedará con -81
2. **Flexibilidad operativa**: No bloquear operaciones por falta temporal de stock
3. **Trazabilidad completa**: Registrar todos los movimientos, incluso si generan stocks negativos

### Casos de Uso

#### Caso 1: Envío desde Sucursal con Stock Negativo
```
Situación inicial:
- Casa Central: -80 unidades (debe stock)
- Valle Viejo: 5 unidades

Operación: Casa Central envía 1 unidad a Valle Viejo

Resultado esperado:
- Casa Central: -80 - 1 = -81 unidades (deuda aumenta)
- Valle Viejo: 5 + 1 = 6 unidades (recibe normalmente)
```

#### Caso 2: Devolución de Stock
```
Situación inicial:
- Valle Viejo: 4 unidades
- Casa Central: -81 unidades (debe stock)

Operación: Valle Viejo envía 1 unidad a Casa Central (devolución)

Resultado esperado:
- Valle Viejo: 4 - 1 = 3 unidades
- Casa Central: -81 + 1 = -80 unidades (deuda disminuye)
```

---

## CAMBIOS IMPLEMENTADOS

### Función 1: `PedidoItemyCabIdEnvio_post()` (Envío Directo)

**Ubicación**: `Descarga.php`, líneas 1809-1997

#### Modificación A: Comentar Validación Inicial

**Líneas afectadas**: 1878-1891

**ANTES:**
```php
$row_stock = $query_stock->row_array();
$stock_actual = $row_stock['stock_actual'];

// Validar que hay stock suficiente para enviar
if ($stock_actual < $pedidoItem['cantidad']) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: Stock insuficiente en sucursal origen. Disponible: " . $stock_actual . ", Solicitado: " . $pedidoItem['cantidad']
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
// ============================================================================
```

**DESPUÉS:**
```php
$row_stock = $query_stock->row_array();
$stock_actual = $row_stock['stock_actual'];

// NOTA: Se permite enviar stock incluso con valores negativos
// El sistema debe permitir stocks negativos para reflejar deudas de stock
// Por ejemplo: Si sucursal tiene -80 y envía 1, quedará -81
/* VALIDACIÓN DESHABILITADA - Se permite stock negativo
if ($stock_actual < $pedidoItem['cantidad']) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: Stock insuficiente en sucursal origen. Disponible: " . $stock_actual . ", Solicitado: " . $pedidoItem['cantidad']
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
*/
// ============================================================================
```

**Razón del cambio**:
- Se mantiene el código original comentado para referencia histórica
- Se documenta claramente por qué se deshabilita la validación
- Se proporciona ejemplo del comportamiento esperado

#### Modificación B: Simplificar UPDATE de Stock Origen

**Líneas afectadas**: 1960-1969

**ANTES:**
```php
// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
// Nota: $sucursal_origen y $campo_stock_origen ya definidos en líneas 1853-1856
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
```

**DESPUÉS:**
```php
// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
// Nota: $sucursal_origen y $campo_stock_origen ya definidos en líneas 1853-1856
// IMPORTANTE: Se permite stock negativo, NO validamos si hay suficiente
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art']
]);
```

**Razón del cambio**:
- Eliminada cláusula `AND $campo_stock_origen >= ?` que impedía stock negativo
- Eliminado tercer parámetro del array (validación de stock)
- Eliminada verificación de `affected_rows()` que causaba rollback
- Código más simple y directo

---

### Función 2: `PedidoItemyCabId_post()` (Recibir Pedido)

**Ubicación**: `Descarga.php`, líneas 1653-1809

#### Modificación: Simplificar UPDATE de Stock Origen

**Líneas afectadas**: 1751-1765

**ANTES:**
```php
// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
$sucursal_origen = $pedidoscb['sucursalh'];
$campo_stock_origen = isset($mapeo_sucursal_exi[$sucursal_origen])
    ? $mapeo_sucursal_exi[$sucursal_origen]
    : 'exi' . $sucursal_origen; // Fallback por seguridad

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
        "mensaje" => "Error: Stock insuficiente en sucursal origen para completar la recepción."
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
```

**DESPUÉS:**
```php
// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
$sucursal_origen = $pedidoscb['sucursalh'];
$campo_stock_origen = isset($mapeo_sucursal_exi[$sucursal_origen])
    ? $mapeo_sucursal_exi[$sucursal_origen]
    : 'exi' . $sucursal_origen; // Fallback por seguridad

// IMPORTANTE: Se permite stock negativo, NO validamos si hay suficiente
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art']
]);
```

**Razón del cambio**: Consistencia con `PedidoItemyCabIdEnvio_post()`

---

## COMPARACIÓN: ANTES vs DESPUÉS

### Tabla Comparativa

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| **Validación inicial** | ✅ Sí (rechaza si stock < cantidad) | ❌ No (permite cualquier valor) |
| **Cláusula SQL** | `WHERE ... AND stock >= ?` | `WHERE ...` (sin restricción) |
| **Parámetros UPDATE** | 3 parámetros (cantidad, id_art, cantidad) | 2 parámetros (cantidad, id_art) |
| **Verificación affected_rows** | ✅ Sí (rollback si 0) | ❌ No (siempre continúa) |
| **Stock negativo permitido** | ❌ No | ✅ Sí |
| **Líneas de código** | ~50 líneas | ~20 líneas |

### Flujo de Ejecución

#### ANTES (Con Restricciones)

```
┌─────────────────────────────┐
│ 1. Validar id_art != 0      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 2. Consultar stock actual   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 3. Validar stock >= cantidad│ ← BLOQUEABA AQUÍ
│    SI NO: ❌ ERROR          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 4. Insertar pedidoitem      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 5. UPDATE con restricción   │ ← BLOQUEABA AQUÍ TAMBIÉN
│    AND stock >= ?           │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 6. Verificar affected_rows  │ ← ROLLBACK SI 0
│    SI = 0: ❌ ROLLBACK      │
└──────────┬──────────────────┘
           │
           ▼
         ✅ OK
```

#### DESPUÉS (Sin Restricciones)

```
┌─────────────────────────────┐
│ 1. Validar id_art != 0      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 2. Consultar stock actual   │ (solo para información)
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 3. Insertar pedidoitem      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 4. UPDATE sin restricción   │
│    (permite stock negativo) │
└──────────┬──────────────────┘
           │
           ▼
         ✅ OK
```

---

## IMPACTO DE LOS CAMBIOS

### Impacto Positivo

1. **Flexibilidad Operativa**
   - ✅ Permite transferencias en cualquier momento
   - ✅ No bloquea operaciones urgentes
   - ✅ Reduce fricción en el flujo de trabajo

2. **Mejor Trazabilidad**
   - ✅ Todos los movimientos quedan registrados
   - ✅ Se visualizan las "deudas" de stock entre sucursales
   - ✅ Facilita auditorías y reconciliaciones

3. **Simplificación del Código**
   - ✅ Menos líneas de código
   - ✅ Menos puntos de fallo
   - ✅ Lógica más directa

### Consideraciones Importantes

1. **Stock Negativo es Válido**
   - El sistema ahora interpreta stock negativo como "deuda de stock"
   - No es un error, es un estado válido del negocio

2. **Responsabilidad del Usuario**
   - Los usuarios deben entender que pueden crear stocks negativos
   - Se recomienda capacitación sobre el nuevo comportamiento

3. **Monitoreo de Stocks Negativos**
   - Implementar alertas o reportes de stocks negativos
   - Revisión periódica de sucursales con deudas de stock

---

## EJEMPLOS DE USO

### Ejemplo 1: Transferencia con Stock Negativo

**Estado Inicial:**
```sql
SELECT id_articulo, exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;

id_articulo | exi2  | exi3
------------|-------|-----
7323        | -80   | 4
```

**Operación:**
```
Casa Central (exi2 = -80) envía 1 unidad a Valle Viejo (exi3 = 4)

Datos enviados:
- sucursald = 1 (Casa Central - ORIGEN)
- sucursalh = 2 (Valle Viejo - DESTINO)
- cantidad = 1
```

**Resultado:**
```sql
SELECT id_articulo, exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;

id_articulo | exi2  | exi3
------------|-------|-----
7323        | -81   | 5
```

**Registro en BD:**
```sql
SELECT id_num, sucursald, sucursalh, estado FROM pedidoscb ORDER BY id_num DESC LIMIT 1;

id_num | sucursald | sucursalh | estado
-------|-----------|-----------|--------
59     | 1         | 2         | Enviado
```

### Ejemplo 2: Devolución que Reduce Deuda

**Estado Inicial:**
```sql
id_articulo | exi2  | exi3
------------|-------|-----
7323        | -81   | 5
```

**Operación:**
```
Valle Viejo (exi3 = 5) devuelve 1 unidad a Casa Central (exi2 = -81)

Datos enviados:
- sucursald = 2 (Valle Viejo - ORIGEN)
- sucursalh = 1 (Casa Central - DESTINO)
- cantidad = 1
```

**Resultado:**
```sql
id_articulo | exi2  | exi3
------------|-------|-----
7323        | -80   | 4
```

**Interpretación**: La deuda de Casa Central disminuyó de -81 a -80

### Ejemplo 3: Múltiples Transferencias

**Secuencia de operaciones:**

1. Casa Central (-80) → Valle Viejo (4): 1 unidad
   - Resultado: CC = -81, VV = 5

2. Casa Central (-81) → Güemes (0): 2 unidades
   - Resultado: CC = -83, GM = 2

3. Valle Viejo (5) → Casa Central (-83): 3 unidades
   - Resultado: VV = 2, CC = -80

4. Güemes (2) → Casa Central (-80): 2 unidades
   - Resultado: GM = 0, CC = -78

**Estado Final:**
```
Casa Central: -78 (debe 78 unidades netas)
Valle Viejo: 2 (tiene 2 unidades)
Güemes: 0 (stock neutral)
```

---

## VALIDACIONES QUE PERMANECEN

Aunque se eliminaron las validaciones de stock, **se mantienen otras validaciones críticas**:

### 1. Validación de Artículo Válido
```php
// Líneas 1821-1832
if ($pedidoItem['id_art'] == 0 || $pedidoItem['id_art'] === '0' || empty($pedidoItem['id_art'])) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: ID de artículo inválido (id_art = 0 o vacío)..."
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
```

### 2. Validación de Existencia en Catálogo
```php
// Líneas 1864-1873
if ($query_stock->num_rows() === 0) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: El artículo no existe en el catálogo."
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
```

### 3. Integridad de Transacción
```php
// Líneas 1974-1984
if ($this->db->trans_status() === FALSE) {
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error al crear el pedido y actualizar estados..."
    );
    $this->response($respuesta, REST_Controller::HTTP_INTERNAL_SERVER_ERROR);
}
```

---

## PRUEBAS RECOMENDADAS

### Test 1: Envío con Stock Negativo (Crítico)

**Precondiciones:**
```
- Artículo 7323 existe en artsucursal
- Casa Central (value=1, exi2) tiene stock = -80
- Valle Viejo (value=2, exi3) tiene stock = 4
```

**Pasos:**
1. Loguearse como Casa Central
2. Ir a "Envíos de Stk. Pendientes"
3. Seleccionar artículo 7323
4. Enviar 1 unidad a Valle Viejo

**Resultado Esperado:**
- ✅ Envío exitoso sin errores
- ✅ Casa Central exi2: -80 → -81
- ✅ Valle Viejo exi3: 4 → 5
- ✅ Registro en pedidoscb con estado "Enviado"

### Test 2: Envío con Stock Positivo (Regresión)

**Precondiciones:**
```
- Valle Viejo exi3 = 5 (positivo)
```

**Pasos:**
1. Loguearse como Valle Viejo
2. Enviar 1 unidad a Casa Central

**Resultado Esperado:**
- ✅ Envío exitoso
- ✅ Valle Viejo: 5 → 4
- ✅ Casa Central: -81 → -80

### Test 3: Envío con Stock Cero

**Precondiciones:**
```
- Deposito (value=4, exi1) tiene stock = 0
```

**Pasos:**
1. Loguearse como Deposito
2. Enviar 1 unidad a cualquier sucursal

**Resultado Esperado:**
- ✅ Envío exitoso
- ✅ Deposito: 0 → -1
- ✅ Destino: stock aumenta en 1

### Test 4: Validación de id_art = 0 (Debe Fallar)

**Pasos:**
1. Intentar enviar con id_art = 0

**Resultado Esperado:**
- ❌ Error: "ID de artículo inválido"
- ❌ No se crea registro
- ❌ No se modifican stocks

### Test 5: Artículo No Existe en Catálogo (Debe Fallar)

**Pasos:**
1. Intentar enviar artículo id_art = 99999 (no existe)

**Resultado Esperado:**
- ❌ Error: "El artículo no existe en el catálogo"
- ❌ No se crea registro

---

## RECOMENDACIONES OPERATIVAS

### 1. Capacitación a Usuarios

**Puntos clave a comunicar:**
- Stock negativo es ahora un estado válido y esperado
- Representa "deuda de stock" de una sucursal
- No es un error del sistema

**Ejemplo de mensaje:**
```
"Cuando veas stock -50 en una sucursal, significa que esa sucursal
debe 50 unidades. Esto puede ocurrir cuando se envía stock que aún
no ha sido recibido físicamente en esa ubicación."
```

### 2. Reportes y Alertas

**Implementar reportes de:**
- Sucursales con stock negativo (ordenadas por magnitud)
- Artículos con stock negativo en múltiples sucursales
- Tendencia histórica de stocks negativos

**Ejemplo de reporte:**
```sql
SELECT
    s.nombre as sucursal,
    a.nomart as articulo,
    CASE
        WHEN s.value = 1 THEN art.exi2
        WHEN s.value = 2 THEN art.exi3
        WHEN s.value = 3 THEN art.exi4
        WHEN s.value = 4 THEN art.exi1
        WHEN s.value = 5 THEN art.exi5
    END as stock_actual
FROM artsucursal art
CROSS JOIN sucursales s
WHERE (s.value = 1 AND art.exi2 < 0)
   OR (s.value = 2 AND art.exi3 < 0)
   OR (s.value = 3 AND art.exi4 < 0)
   OR (s.value = 4 AND art.exi1 < 0)
   OR (s.value = 5 AND art.exi5 < 0)
ORDER BY stock_actual ASC;
```

### 3. Procedimiento de Reconciliación

**Periodicidad recomendada**: Mensual

**Pasos:**
1. Generar reporte de stocks negativos
2. Verificar que correspondan a movimientos reales
3. Planificar reposiciones para equilibrar stocks
4. Documentar stocks negativos persistentes

### 4. Límites y Alertas

**Considerar implementar alertas cuando:**
- Stock negativo supera -100 unidades
- Stock negativo aumenta más de 20% en una semana
- Múltiples sucursales tienen el mismo artículo en negativo

---

## ARCHIVOS RELACIONADOS

### Documentación Técnica
- `SEMANTICA_SUCURSALES_ANALISIS.md`: Análisis de semántica de campos sucursald/sucursalh
- `falla_modificacion_stocks.md`: Análisis del bug de actualización de stocks
- `movstock.md`: Documentación completa del sistema MOV.STOCK
- `INFORME_IMPACTO_CAMBIOS.md`: Impacto de cambios anteriores

### Código Frontend
- `src/app/components/enviostockpendientes/enviostockpendientes.component.ts`
- `src/app/components/stockpedido/stockpedido.component.ts`
- `src/app/services/cargardata.service.ts`

### Código Backend
- `src/Descarga.php.txt` (versión local)
- `APIAND/index.php/Descarga/PedidoItemyCabIdEnvio` (endpoint)
- `APIAND/index.php/Descarga/PedidoItemyCabId` (endpoint)

---

## HISTORIAL DE CAMBIOS

| Fecha | Versión | Autor | Descripción |
|-------|---------|-------|-------------|
| 2025-10-31 | 1.0 | Claude | Creación del documento. Eliminación de validaciones de stock negativo en `PedidoItemyCabIdEnvio_post()` y `PedidoItemyCabId_post()` |

---

## ANEXO: CÓDIGO COMPLETO MODIFICADO

### Función `PedidoItemyCabIdEnvio_post()` - Sección Validación

**Líneas 1875-1892 (después de cambios):**
```php
$row_stock = $query_stock->row_array();
$stock_actual = $row_stock['stock_actual'];

// NOTA: Se permite enviar stock incluso con valores negativos
// El sistema debe permitir stocks negativos para reflejar deudas de stock
// Por ejemplo: Si sucursal tiene -80 y envía 1, quedará -81
/* VALIDACIÓN DESHABILITADA - Se permite stock negativo
if ($stock_actual < $pedidoItem['cantidad']) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: Stock insuficiente en sucursal origen. Disponible: " . $stock_actual . ", Solicitado: " . $pedidoItem['cantidad']
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
*/
// ============================================================================
```

### Función `PedidoItemyCabIdEnvio_post()` - Sección UPDATE

**Líneas 1960-1970 (después de cambios):**
```php
// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
// Nota: $sucursal_origen y $campo_stock_origen ya definidos en líneas 1853-1856
// IMPORTANTE: Se permite stock negativo, NO validamos si hay suficiente
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art']
]);
// ============================================================================
```

### Función `PedidoItemyCabId_post()` - Sección UPDATE

**Líneas 1751-1765 (después de cambios):**
```php
// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
$sucursal_origen = $pedidoscb['sucursalh'];
$campo_stock_origen = isset($mapeo_sucursal_exi[$sucursal_origen])
    ? $mapeo_sucursal_exi[$sucursal_origen]
    : 'exi' . $sucursal_origen; // Fallback por seguridad

// IMPORTANTE: Se permite stock negativo, NO validamos si hay suficiente
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art']
]);
// ============================================================================
```

---

## CONCLUSIÓN

La eliminación de las restricciones de stock negativo permite una operación más fluida del sistema MOV.STOCK, reflejando la realidad operativa de las sucursales. El sistema ahora:

✅ Permite transferencias sin restricciones de stock
✅ Documenta todas las operaciones incluyendo "deudas de stock"
✅ Mantiene integridad de datos con validaciones esenciales
✅ Simplifica el código reduciendo complejidad

**Próximos pasos recomendados:**
1. Subir `Descarga.php` al servidor de producción
2. Ejecutar suite de pruebas completa
3. Capacitar usuarios sobre stock negativo
4. Implementar reportes de monitoreo
5. Establecer procedimientos de reconciliación

---

**Documento generado**: 2025-10-31
**Última actualización**: 2025-10-31
**Estado**: Implementado - Pendiente deployment
