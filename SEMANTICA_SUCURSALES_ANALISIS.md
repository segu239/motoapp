# ANÁLISIS CRÍTICO: Semántica Inconsistente de sucursald/sucursalh

**Fecha**: 2025-10-31
**Prioridad**: CRÍTICA
**Impacto**: Sistema MOV.STOCK completamente inoperativo

---

## RESUMEN EJECUTIVO

El sistema MOV.STOCK tiene una **inconsistencia crítica** en la interpretación de los campos `sucursald` y `sucursalh` entre frontend y backend. Esta inconsistencia causa que las validaciones de stock consulten la sucursal incorrecta, generando errores cuando hay stock disponible.

---

## ANÁLISIS DE DATOS REALES

### Registros en Base de Datos (id_art=7323)

```
id_num | sucursald | sucursalh | estado       | usuario | quien_creo
-------|-----------|-----------|--------------|---------|-------------------
54     | 1         | 2         | Solicitado-E | luis    | Casa Central (1)
55     | 2         | 1         | Enviado      | luis    | Casa Central (1)
56     | 1         | 2         | Solicitado-E | luis    | Casa Central (1)
57     | 2         | 1         | Enviado      | luis    | Casa Central (1)
58     | 1         | 2         | Solicitado   | luis    | Casa Central (1)
```

### Stocks Actuales (artsucursal)

```
id_articulo | exi1 | exi2  | exi3 | exi4 | exi5
------------|------|-------|------|------|-----
7323        | 0    | -81   | 5    | -1   | 0
```

**Mapeo Firebase value → exi:**
- value 1 (Casa Central) → exi2 = -81
- value 2 (Valle Viejo) → exi3 = 5
- value 3 (Güemes) → exi4 = -1
- value 4 (Deposito) → exi1 = 0
- value 5 (Mayorista) → exi5 = 0

---

## FLUJO ACTUAL Y PROBLEMA

### Escenario de Prueba

1. **Casa Central (sucursal=1) solicita 1 unidad a Valle Viejo (sucursal=2)**
   - Stock Casa Central (exi2): -81
   - Stock Valle Viejo (exi3): 5
   - Se crea pedido id_num=58: `sucursald=1, sucursalh=2, estado='Solicitado'`

2. **Usuario se loguea en Valle Viejo para enviar el stock**
   - Valle Viejo tiene 5 unidades disponibles
   - Debería poder enviar 1 unidad

3. **Error recibido:**
   ```
   Error: Stock insuficiente en sucursal origen.
   Disponible: -81, Solicitado: 1.00
   ```

El error muestra **-81** (stock de Casa Central) en lugar de **5** (stock de Valle Viejo).

---

## ANÁLISIS DEL FRONTEND

### Componente: `enviostockpendientes.component.ts`

**Método `enviar()` (líneas 245-300):**

```typescript
const selectedPedido = this.selectedPedidoItem[0];
// selectedPedido original: {sucursald: 1, sucursalh: 2}

const pedidoscb = {
    sucursald: Number(this.sucursal),        // Valle Viejo = 2
    sucursalh: selectedPedido.sucursald,     // Casa Central = 1
    estado: "Enviado"
};

this._cargardata.crearPedidoStockIdEnvio(id_num, pedidoItem, pedidoscb);
```

**Interpretación del Frontend:**
- `sucursald = 2` = Valle Viejo = **ORIGEN** (quien envía)
- `sucursalh = 1` = Casa Central = **DESTINO** (quien recibe)

**Evidencia:** El frontend "invierte" los campos del pedido original:
- Original: sucursald=1, sucursalh=2
- Invertido: sucursald=2, sucursalh=1

---

## ANÁLISIS DEL BACKEND

### Función: `PedidoItemyCabIdEnvio_post()` (Descarga.php)

**Código Actual (con mi corrección errónea):**

```php
// Línea 1853 (CORREGIDA INCORRECTAMENTE):
$sucursal_origen = $pedidoscb['sucursalh']; // = 1 (Casa Central)

// Mapeo Firebase value → exi
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    // ...
];

// Línea 1854-1856:
$campo_stock_origen = $mapeo_sucursal_exi[$sucursal_origen]; // = 'exi2'

// Línea 1859-1862: Consulta stock
$sql_check_stock = "SELECT $campo_stock_origen as stock_actual
                    FROM artsucursal
                    WHERE id_articulo = ?";
// Consulta: SELECT exi2 FROM artsucursal WHERE id_articulo = 7323
// Resultado: -81 (Casa Central)
```

**Interpretación del Backend:**
- `sucursald` = **DESTINO** (quien recibe) - línea 1939
- `sucursalh` = **ORIGEN** (quien envía) - línea 1853 (mi corrección)

**Resultado:**
- Backend consulta stock de Casa Central (exi2 = -81)
- Debería consultar stock de Valle Viejo (exi3 = 5)

---

## COMPARACIÓN: Frontend vs Backend

| Campo      | Frontend Envía        | Backend Interpreta    | Resultado                           |
|------------|----------------------|----------------------|-------------------------------------|
| sucursald  | Valle Viejo (ORIGEN) | Valle Viejo (DESTINO)| Backend suma stock a quien envía ❌ |
| sucursalh  | Casa Central (DESTINO)| Casa Central (ORIGEN)| Backend resta stock a quien recibe ❌|

### Flujo Incorrecto Actual:

1. **Frontend envía:**
   - sucursald=2 (Valle Viejo envía)
   - sucursalh=1 (Casa Central recibe)

2. **Backend procesa:**
   - Consulta stock de sucursalh (Casa Central) = -81
   - Error: stock insuficiente

3. **Si continuara (sin error):**
   - SUMARÍA stock a sucursald (Valle Viejo) ← quien envía ❌
   - RESTARÍA stock a sucursalh (Casa Central) ← quien recibe ❌

---

## ANÁLISIS DE OTRAS FUNCIONES

### `PedidoItemyCabId_post()` (RECIBIR pedido)

```php
// Línea 1738: DESTINO
$sucursal_destino = $pedidoscb['sucursald'];

// Línea 1752: ORIGEN
$sucursal_origen = $pedidoscb['sucursalh'];

// Líneas 1743-1749: SUMA stock al DESTINO
UPDATE artsucursal SET $campo_stock_destino = $campo_stock_destino + ?

// Líneas 1757-1765: RESTA stock del ORIGEN
UPDATE artsucursal SET $campo_stock_origen = $campo_stock_origen - ?
```

**Interpretación:**
- sucursald = DESTINO
- sucursalh = ORIGEN

### Componente Frontend: `stockpedido.component.ts` (RECIBIR)

```typescript
const pedidoscb = {
    sucursald: Number(this.sucursal),        // Valle Viejo = 2
    sucursalh: selectedPedido.sucursalh,     // Valle Viejo = 2 ❌ ERROR
};
```

**Problema:** NO invierte los campos como debería.

---

## DOCUMENTACIÓN vs REALIDAD

### Según `movstock.md` (líneas 71-72):

```
sucursald (NUMERIC): Sucursal de origen (desde)
sucursalh (NUMERIC): Sucursal destino (hacia)
```

**Interpretación documentada:**
- sucursald = ORIGEN (desde)
- sucursalh = DESTINO (hacia)

### Según el Backend Real:

- sucursald = DESTINO
- sucursalh = ORIGEN

**¡LA DOCUMENTACIÓN ESTÁ INVERTIDA RESPECTO AL CÓDIGO!**

---

## ORIGEN DEL PROBLEMA

### Código Original (ANTES de mis correcciones):

```php
// Línea 1853 (ORIGINAL):
$sucursal_origen = $pedidoscb['sucursald']; // Sucursal que envía
```

**Este código ORIGINAL era CORRECTO para `PedidoItemyCabIdEnvio_post()`** porque:
- Frontend envía sucursald=Valle Viejo (ORIGEN real)
- Backend interpreta sucursald como quien envía
- ¡Coinciden!

### Mi Corrección (INCORRECTA):

```php
// Línea 1853 (MI CORRECCIÓN ERRÓNEA):
$sucursal_origen = $pedidoscb['sucursalh']; // Sucursal que envía (ORIGEN)
```

**Esta corrección está MAL** porque:
- Asumí que la semántica era igual en todas las funciones
- No verifiqué cómo el frontend enviaba los datos
- Seguí la interpretación de `PedidoItemyCabId_post()` sin verificar el contexto

---

## SEMÁNTICA REAL DEL SISTEMA

### En Solicitudes ("Solicitado"):

Creadas por el componente `pedir-stock`:

```typescript
sucursald: quien_solicita   (DESTINO - quien recibirá)
sucursalh: a_quien_solicita (ORIGEN - quien enviará)
```

**Ejemplo:**
- Casa Central solicita a Valle Viejo
- sucursald=1 (Casa Central - destino)
- sucursalh=2 (Valle Viejo - origen)

### En Envíos ("Enviado"):

Creadas por el componente `enviostockpendientes`:

```typescript
sucursald: quien_envia  (ORIGEN - quien envía)
sucursalh: quien_recibe (DESTINO - quien recibe)
```

**Ejemplo:**
- Valle Viejo envía a Casa Central
- sucursald=2 (Valle Viejo - origen)
- sucursalh=1 (Casa Central - destino)

### ¡LOS CAMPOS TIENEN SEMÁNTICA DIFERENTE SEGÚN EL TIPO DE OPERACIÓN!

---

## SOLUCIÓN CORRECTA

### Opción A: Mantener Semántica Variable (Menos Cambios)

**Ajustar solo el backend para manejar ambas semánticas:**

1. **`PedidoItemyCabIdEnvio_post()` (ENVIAR):**
   ```php
   // ORIGEN = quien envía = sucursald (no sucursalh)
   $sucursal_origen = $pedidoscb['sucursald'];  // RESTAURAR CÓDIGO ORIGINAL

   // DESTINO = quien recibe = sucursalh (no sucursald)
   $sucursal_destino = $pedidoscb['sucursalh']; // CAMBIAR DE sucursald
   ```

2. **`PedidoItemyCabId_post()` (RECIBIR):**
   ```php
   // Mantener como está:
   $sucursal_destino = $pedidoscb['sucursald']; // OK
   $sucursal_origen = $pedidoscb['sucursalh'];  // OK
   ```

**Ventajas:**
- Mínimos cambios
- Solo tocar backend
- No afecta datos existentes

**Desventajas:**
- Semántica inconsistente permanente
- Dificulta mantenimiento futuro
- Documentación seguirá siendo confusa

### Opción B: Estandarizar Semántica (Más Cambios, Más Robusto)

**Estandarizar que:**
- `sucursald` SIEMPRE = DESTINO (quien recibe)
- `sucursalh` SIEMPRE = ORIGEN (quien envía)

**Cambios requeridos:**

1. **Frontend `enviostockpendientes.component.ts`:**
   ```typescript
   // CAMBIAR líneas 280-281:
   const pedidoscb = {
       sucursald: selectedPedido.sucursald,     // DESTINO (no invertir)
       sucursalh: Number(this.sucursal),        // ORIGEN (Valle Viejo)
   };
   ```

2. **Frontend `stockpedido.component.ts`:**
   ```typescript
   // CAMBIAR línea 319:
   sucursalh: selectedPedido.sucursald,  // ORIGEN (en vez de sucursalh)
   ```

3. **Backend mantener como está** (con mi corrección en línea 1853).

**Ventajas:**
- Semántica consistente en TODO el sistema
- Código más mantenible
- Documentación clara

**Desventajas:**
- Requiere cambios en frontend
- Requiere recompilar y redesplegar
- Más testing necesario

---

## RECOMENDACIÓN

**Implementar Opción A inmediatamente** para resolver el problema actual:

1. Revertir mi corrección en línea 1853
2. Agregar actualización de stocks con semántica correcta
3. Probar exhaustivamente

**Después, planificar Opción B** para evitar futuros problemas.

---

## CAMBIOS NECESARIOS (Opción A)

### Archivo: `Descarga.php.txt`

#### Cambio 1: Revertir línea 1853

```php
// ANTES (mi corrección incorrecta):
$sucursal_origen = $pedidoscb['sucursalh']; // Sucursal que envía (ORIGEN)

// DESPUÉS (código original correcto):
$sucursal_origen = $pedidoscb['sucursald']; // Sucursal que envía (ORIGEN)
```

#### Cambio 2: Agregar variable sucursal_destino y actualizar código de actualización de stocks

```php
// Después de línea 1933, CAMBIAR todo el bloque de actualización:

// ============================================================================
// ACTUALIZACIÓN AUTOMÁTICA DE STOCK EN ENVÍO DIRECTO
// ============================================================================
// IMPORTANTE: En esta función, la semántica es DIFERENTE a PedidoItemyCabId_post:
// - sucursald = ORIGEN (quien envía)
// - sucursalh = DESTINO (quien recibe)

// Actualizar stock en sucursal DESTINO (la que recibe - SUMA stock)
$sucursal_destino = $pedidoscb['sucursalh']; // DESTINO en esta función
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

// Actualizar stock en sucursal ORIGEN (la que envía - RESTA stock)
// Nota: $sucursal_origen y $campo_stock_origen ya definidos en líneas 1853-1856
$sql_update_origen = "UPDATE artsucursal
                      SET $campo_stock_origen = $campo_stock_origen - ?
                      WHERE id_articulo = ?
                      AND $campo_stock_origen >= ?";
$this->db->query($sql_update_origen, [
    $pedidoItem['cantidad'],
    $pedidoItem['id_art'],
    $pedidoItem['cantidad']
]);

// Verificar que la actualización de stock origen fue exitosa
if ($this->db->affected_rows() === 0) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: Stock insuficiente en sucursal origen para completar el envío."
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
// ============================================================================
```

---

## PRUEBAS REQUERIDAS

### Test 1: Envío Directo (PedidoItemyCabIdEnvio_post)

```
Condiciones:
- Valle Viejo (sucursal=2) tiene 5 unidades (exi3=5)
- Casa Central (sucursal=1) tiene -81 unidades (exi2=-81)

Acción:
- Valle Viejo envía 1 unidad a Casa Central

Datos enviados:
- sucursald=2 (Valle Viejo - ORIGEN)
- sucursalh=1 (Casa Central - DESTINO)

Resultado esperado:
- ✓ Validación pasa (consulta exi3=5)
- ✓ Valle Viejo: exi3 = 5-1 = 4
- ✓ Casa Central: exi2 = -81+1 = -80
```

### Test 2: Recepción (PedidoItemyCabId_post)

```
Condiciones:
- Existe pedido "Solicitado-E" con sucursald=1, sucursalh=2

Acción:
- Casa Central recibe el pedido

Datos enviados:
- sucursald=1 (Casa Central - DESTINO)
- sucursalh=2 (Valle Viejo - ORIGEN)

Resultado esperado:
- ✓ Casa Central: exi2 += 1
- ✓ Valle Viejo: exi3 -= 1
```

---

## CONCLUSIÓN

El problema NO era la variable `sucursal_origen` en sí, sino la **asunción incorrecta de semántica consistente** entre diferentes funciones del backend. El sistema tiene dos interpretaciones diferentes de los mismos campos según el tipo de operación, lo cual es un **anti-patrón** pero es la realidad del código existente.

**La solución inmediata es adaptar el backend a la semántica real que usa el frontend**, no intentar forzar una semántica única sin cambiar el frontend también.

---

**Generado**: 2025-10-31
**Última actualización**: 2025-10-31
