# PLAN DE IMPLEMENTACIÓN DETALLADO - SOLUCIÓN 1
## Mover Actualización de Stock a la Confirmación

**Fecha:** 17 de noviembre de 2025
**Objetivo:** Mover la actualización del stock desde la aceptación a la confirmación
**Impacto:** CRÍTICO - Cambios en lógica de negocio
**Tiempo Estimado:** 3-4 horas (incluyendo testing completo)

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual vs Estado Deseado](#estado-actual-vs-estado-deseado)
3. [Archivos a Modificar](#archivos-a-modificar)
4. [Modificaciones Detalladas](#modificaciones-detalladas)
5. [Plan de Migración de Datos](#plan-de-migración-de-datos)
6. [Plan de Testing](#plan-de-testing)
7. [Procedimiento de Rollback](#procedimiento-de-rollback)
8. [Checklist de Implementación](#checklist-de-implementación)

---

## 🎯 RESUMEN EJECUTIVO

### Problema
El stock se mueve en el momento de **Aceptar** la transferencia, antes de que se confirme físicamente la recepción/envío.

### Solución
Mover la lógica de actualización de stock a los métodos de **Confirmación** (ConfirmarRecepcion y ConfirmarEnvio).

### Impacto
- ✅ Stock se moverá solo cuando se confirme la transferencia
- ✅ Estado "Aceptado" ya no modificará stock
- ✅ Mayor precisión en inventario
- ⚠️ Requiere handling de datos existentes en estado "Aceptado"

---

## 📊 ESTADO ACTUAL VS ESTADO DESEADO

### FLUJO ACTUAL (Incorrecto)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREAR TRANSFERENCIA                                         │
│    Estado: "Solicitado" o "Ofrecido"                          │
│    Stock: Sin cambios                                          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ACEPTAR TRANSFERENCIA (AceptarTransferencia_post)          │
│    Estado: "Aceptado"                                          │
│    ❌ Stock: SE MUEVE AQUÍ (DEMASIADO TEMPRANO)              │
│       - Resta de sucursal origen                              │
│       - Suma en sucursal destino                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CONFIRMAR (ConfirmarRecepcion/ConfirmarEnvio)              │
│    Estado: "Recibido"                                          │
│    Stock: Sin cambios (ya se movió antes)                     │
└─────────────────────────────────────────────────────────────────┘
```

### FLUJO DESEADO (Correcto)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREAR TRANSFERENCIA                                         │
│    Estado: "Solicitado" o "Ofrecido"                          │
│    Stock: Sin cambios                                          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ACEPTAR TRANSFERENCIA (AceptarTransferencia_post)          │
│    Estado: "Aceptado"                                          │
│    ✅ Stock: SIN CAMBIOS                                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CONFIRMAR (ConfirmarRecepcion/ConfirmarEnvio)              │
│    Estado: "Recibido"                                          │
│    ✅ Stock: SE MUEVE AQUÍ (MOMENTO CORRECTO)                 │
│       - Resta de sucursal origen                              │
│       - Suma en sucursal destino                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 ARCHIVOS A MODIFICAR

| Archivo | Función | Líneas a Modificar | Tipo de Cambio |
|---------|---------|-------------------|----------------|
| `src/Descarga.php.txt` | `AceptarTransferencia_post()` | 7122-7161 | ❌ Eliminar bloque de stock |
| `src/Descarga.php.txt` | `ConfirmarRecepcion_post()` | Después de 7438 | ✅ Agregar bloque de stock |
| `src/Descarga.php.txt` | `ConfirmarEnvio_post()` | Después de 7570 | ✅ Agregar bloque de stock |

---

## 🔧 MODIFICACIONES DETALLADAS

### MODIFICACIÓN 1: AceptarTransferencia_post()

**Archivo:** `src/Descarga.php.txt`
**Función:** `public function AceptarTransferencia_post()`
**Líneas:** 7122-7161

#### ❌ CÓDIGO A ELIMINAR

Comentar o eliminar el siguiente bloque:

```php
// ====================================================================
// MOVER STOCK PARA CADA ARTÍCULO
// ====================================================================
// ❌ COMENTADO 17-Nov-2025: Stock se moverá en confirmación, no en aceptación
/*
foreach ($items as $item) {
    $id_art = $item->id_art;
    $cantidad = $item->cantidad;

    // Obtener stock actual
    $sql_stock = "SELECT {$campo_origen}, {$campo_destino} FROM artsucursal WHERE id_articulo = ?";
    $query_stock = $this->db->query($sql_stock, [$id_art]);

    if ($query_stock->num_rows() == 0) {
        throw new Exception("Artículo {$id_art} no encontrado en artsucursal");
    }

    $stock_actual = $query_stock->row();
    $stock_origen_actual = $stock_actual->$campo_origen;
    $stock_destino_actual = $stock_actual->$campo_destino;

    // DESHABILITADO: Validar stock suficiente en origen
    // [código de validación...]

    // Actualizar stock
    $sql_update_stock = "
        UPDATE artsucursal
        SET
            {$campo_origen} = {$campo_origen} - ?,
            {$campo_destino} = {$campo_destino} + ?
        WHERE id_articulo = ?
    ";

    $this->db->query($sql_update_stock, [$cantidad, $cantidad, $id_art]);

    log_message('info', "✅ Stock movido: Art {$id_art}, Cantidad: {$cantidad}, Origen: {$stock_origen_actual} → " . ($stock_origen_actual - $cantidad) . ", Destino: {$stock_destino_actual} → " . ($stock_destino_actual + $cantidad));
}
*/
// FIN BLOQUE COMENTADO
```

#### ✅ RESULTADO ESPERADO

Después de esta modificación, la función solo:
1. Valida el estado ("Solicitado" o "Ofrecido")
2. Actualiza el estado a "Aceptado"
3. **NO toca el stock**

---

### MODIFICACIÓN 2: ConfirmarRecepcion_post()

**Archivo:** `src/Descarga.php.txt`
**Función:** `public function ConfirmarRecepcion_post()`
**Ubicación:** Después de línea 7438 (antes de actualizar estado)

#### ✅ CÓDIGO A AGREGAR

Insertar el siguiente bloque **ANTES** de la actualización de estado:

```php
// ====================================================================
// OBTENER DATOS PARA MOVER STOCK
// ====================================================================
// NUEVO 17-Nov-2025: Mover stock AQUÍ, no en aceptación

$sql_pedido = "
    SELECT
        pi.id_art,
        pi.cantidad,
        pi.descripcion,
        pi.tipo_transferencia,
        pc.sucursald,
        pc.sucursalh
    FROM pedidoitem pi
    INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
    WHERE pi.id_num = ?
      AND pi.tipo = 'PE'
";

$query = $this->db->query($sql_pedido, [$id_num]);

if ($query->num_rows() == 0) {
    throw new Exception("No se encontraron items para la transferencia {$id_num}");
}

$items = $query->result();

// ====================================================================
// DETERMINAR DIRECCIÓN DEL MOVIMIENTO
// ====================================================================

$tipo_transferencia = $items[0]->tipo_transferencia;
$sucursald = $items[0]->sucursald;
$sucursalh = $items[0]->sucursalh;

// PULL: Stock se mueve sucursalh → sucursald (quien solicita recibe)
if ($tipo_transferencia === 'PULL') {
    $sucursal_origen = $sucursalh;  // Quien envía el stock
    $sucursal_destino = $sucursald; // Quien recibe el stock
    $tipo_flujo = 'PULL';
} else {
    // PUSH: Stock se mueve sucursald → sucursalh (quien ofrece envía)
    $sucursal_origen = $sucursald;  // Quien envía el stock
    $sucursal_destino = $sucursalh; // Quien recibe el stock
    $tipo_flujo = 'PUSH';
}

// Mapeo sucursal → campo stock
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Depósito
    5 => 'exi5'  // Mayorista
];

if (!isset($mapeo_sucursal_exi[$sucursal_origen]) || !isset($mapeo_sucursal_exi[$sucursal_destino])) {
    throw new Exception("Sucursal no válida: origen={$sucursal_origen}, destino={$sucursal_destino}");
}

$campo_origen = $mapeo_sucursal_exi[$sucursal_origen];
$campo_destino = $mapeo_sucursal_exi[$sucursal_destino];

log_message('info', "📦 ConfirmarRecepcion - Moviendo stock: Flujo {$tipo_flujo}, Origen (Suc {$sucursal_origen}, {$campo_origen}) → Destino (Suc {$sucursal_destino}, {$campo_destino})");

// ====================================================================
// MOVER STOCK AQUÍ (AL CONFIRMAR RECEPCIÓN)
// ====================================================================

foreach ($items as $item) {
    $id_art = $item->id_art;
    $cantidad = $item->cantidad;

    // Obtener stock actual para logging
    $sql_stock = "SELECT {$campo_origen}, {$campo_destino} FROM artsucursal WHERE id_articulo = ?";
    $query_stock = $this->db->query($sql_stock, [$id_art]);

    if ($query_stock->num_rows() == 0) {
        throw new Exception("Artículo {$id_art} ('{$item->descripcion}') no encontrado en artsucursal");
    }

    $stock_actual = $query_stock->row();
    $stock_origen_antes = $stock_actual->$campo_origen;
    $stock_destino_antes = $stock_actual->$campo_destino;

    // ⚠️ OPCIONAL: Validar stock suficiente (actualmente deshabilitado)
    // Descomentar si se desea validar stock disponible
    /*
    if ($stock_origen_antes < $cantidad) {
        throw new Exception(
            "Stock insuficiente para '{$item->descripcion}'. " .
            "Disponible en {$campo_origen}: {$stock_origen_antes}, Requerido: {$cantidad}"
        );
    }
    */

    // Actualizar stock
    $sql_update_stock = "
        UPDATE artsucursal
        SET
            {$campo_origen} = {$campo_origen} - ?,
            {$campo_destino} = {$campo_destino} + ?
        WHERE id_articulo = ?
    ";

    $this->db->query($sql_update_stock, [$cantidad, $cantidad, $id_art]);

    $stock_origen_despues = $stock_origen_antes - $cantidad;
    $stock_destino_despues = $stock_destino_antes + $cantidad;

    log_message('info', "✅ ConfirmarRecepcion - Stock movido: Art {$id_art} ('{$item->descripcion}'), Cantidad: {$cantidad}, Origen {$campo_origen}: {$stock_origen_antes} → {$stock_origen_despues}, Destino {$campo_destino}: {$stock_destino_antes} → {$stock_destino_despues}");
}

log_message('info', "✅✅ ConfirmarRecepcion - Stock movido exitosamente para {$items->num_rows()} artículos");

// ====================================================================
// ACTUALIZAR ESTADO A "Recibido" (código existente continúa aquí)
// ====================================================================
```

---

### MODIFICACIÓN 3: ConfirmarEnvio_post()

**Archivo:** `src/Descarga.php.txt`
**Función:** `public function ConfirmarEnvio_post()`
**Ubicación:** Después de línea 7570 (antes de actualizar estado)

#### ✅ CÓDIGO A AGREGAR

**IDÉNTICO** al código de ConfirmarRecepcion_post(), solo cambia el nombre en los logs:

```php
// ====================================================================
// OBTENER DATOS PARA MOVER STOCK
// ====================================================================
// NUEVO 17-Nov-2025: Mover stock AQUÍ, no en aceptación

$sql_pedido = "
    SELECT
        pi.id_art,
        pi.cantidad,
        pi.descripcion,
        pi.tipo_transferencia,
        pc.sucursald,
        pc.sucursalh
    FROM pedidoitem pi
    INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
    WHERE pi.id_num = ?
      AND pi.tipo = 'PE'
";

$query = $this->db->query($sql_pedido, [$id_num]);

if ($query->num_rows() == 0) {
    throw new Exception("No se encontraron items para la transferencia {$id_num}");
}

$items = $query->result();

// ====================================================================
// DETERMINAR DIRECCIÓN DEL MOVIMIENTO
// ====================================================================

$tipo_transferencia = $items[0]->tipo_transferencia;
$sucursald = $items[0]->sucursald;
$sucursalh = $items[0]->sucursalh;

// PULL: Stock se mueve sucursalh → sucursald
if ($tipo_transferencia === 'PULL') {
    $sucursal_origen = $sucursalh;
    $sucursal_destino = $sucursald;
    $tipo_flujo = 'PULL';
} else {
    // PUSH: Stock se mueve sucursald → sucursalh
    $sucursal_origen = $sucursald;
    $sucursal_destino = $sucursalh;
    $tipo_flujo = 'PUSH';
}

// Mapeo sucursal → campo stock
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Depósito
    5 => 'exi5'  // Mayorista
];

if (!isset($mapeo_sucursal_exi[$sucursal_origen]) || !isset($mapeo_sucursal_exi[$sucursal_destino])) {
    throw new Exception("Sucursal no válida: origen={$sucursal_origen}, destino={$sucursal_destino}");
}

$campo_origen = $mapeo_sucursal_exi[$sucursal_origen];
$campo_destino = $mapeo_sucursal_exi[$sucursal_destino];

log_message('info', "📦 ConfirmarEnvio - Moviendo stock: Flujo {$tipo_flujo}, Origen (Suc {$sucursal_origen}, {$campo_origen}) → Destino (Suc {$sucursal_destino}, {$campo_destino})");

// ====================================================================
// MOVER STOCK AQUÍ (AL CONFIRMAR ENVÍO)
// ====================================================================

foreach ($items as $item) {
    $id_art = $item->id_art;
    $cantidad = $item->cantidad;

    // Obtener stock actual para logging
    $sql_stock = "SELECT {$campo_origen}, {$campo_destino} FROM artsucursal WHERE id_articulo = ?";
    $query_stock = $this->db->query($sql_stock, [$id_art]);

    if ($query_stock->num_rows() == 0) {
        throw new Exception("Artículo {$id_art} ('{$item->descripcion}') no encontrado en artsucursal");
    }

    $stock_actual = $query_stock->row();
    $stock_origen_antes = $stock_actual->$campo_origen;
    $stock_destino_antes = $stock_actual->$campo_destino;

    // ⚠️ OPCIONAL: Validar stock suficiente (actualmente deshabilitado)
    /*
    if ($stock_origen_antes < $cantidad) {
        throw new Exception(
            "Stock insuficiente para '{$item->descripcion}'. " .
            "Disponible en {$campo_origen}: {$stock_origen_antes}, Requerido: {$cantidad}"
        );
    }
    */

    // Actualizar stock
    $sql_update_stock = "
        UPDATE artsucursal
        SET
            {$campo_origen} = {$campo_origen} - ?,
            {$campo_destino} = {$campo_destino} + ?
        WHERE id_articulo = ?
    ";

    $this->db->query($sql_update_stock, [$cantidad, $cantidad, $id_art]);

    $stock_origen_despues = $stock_origen_antes - $cantidad;
    $stock_destino_despues = $stock_destino_antes + $cantidad;

    log_message('info', "✅ ConfirmarEnvio - Stock movido: Art {$id_art} ('{$item->descripcion}'), Cantidad: {$cantidad}, Origen {$campo_origen}: {$stock_origen_antes} → {$stock_origen_despues}, Destino {$campo_destino}: {$stock_destino_antes} → {$stock_destino_despues}");
}

log_message('info', "✅✅ ConfirmarEnvio - Stock movido exitosamente para todos los artículos");

// ====================================================================
// ACTUALIZAR ESTADO A "Recibido" (código existente continúa aquí)
// ====================================================================
```

---

## 🔄 PLAN DE MIGRACIÓN DE DATOS

### Problema con Datos Existentes

La transferencia **ID: 749** ya está en estado "Aceptado" y **el stock ya se movió**.

**Query para identificar:**
```sql
SELECT id_num, estado, tipo_transferencia, id_art, cantidad,
       fecha_aceptacion, fecha_confirmacion
FROM pedidoitem
WHERE TRIM(estado) = 'Aceptado'
  AND tipo_transferencia IS NOT NULL;
```

### Opciones de Migración

#### OPCIÓN A: No hacer nada (Recomendada para testing)

**Ventajas:**
- Simple
- Sin riesgo
- Permite testing inmediato

**Desventajas:**
- Transferencia ID 749 no se puede confirmar sin duplicar movimiento de stock

**Acción:**
- Cancelar manualmente la transferencia ID 749 antes de implementar
- O aceptar que esa transferencia quedará en limbo

#### OPCIÓN B: Revertir stock de transferencias en "Aceptado"

**Solo si hay muchas transferencias en "Aceptado" que deben completarse**

**Query para revertir:**
```sql
-- ⚠️ EJECUTAR CON CUIDADO - SOLO SI ES NECESARIO
BEGIN;

-- Ver qué se va a revertir
SELECT
    pi.id_num,
    pi.id_art,
    pi.cantidad,
    pc.sucursald,
    pc.sucursalh,
    pi.tipo_transferencia
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) = 'Aceptado'
  AND pi.tipo_transferencia IS NOT NULL;

-- Si todo está OK, ejecutar UPDATE manualmente para cada artículo
-- NO EJECUTAR ESTO AUTOMÁTICAMENTE

ROLLBACK; -- Por seguridad, hacer rollback hasta revisar manualmente
```

**⚠️ NO RECOMENDADO** a menos que haya múltiples transferencias afectadas.

---

## 🧪 PLAN DE TESTING DETALLADO

### FASE 1: Testing en Desarrollo/Staging

#### Test 1: Verificar Stock Inicial

**Objetivo:** Documentar el stock actual antes de cualquier cambio

```sql
-- Guardar stock inicial del artículo de prueba
SELECT
    id_articulo,
    nomart,
    exi1 as stock_deposito,
    exi2 as stock_casa_central,
    exi3 as stock_valle_viejo,
    exi4 as stock_guemes,
    exi5 as stock_mayorista
FROM artsucursal
WHERE id_articulo = 7323; -- Artículo de prueba
```

**Resultado esperado:** Documentar valores actuales

---

#### Test 2: Flujo PULL Completo (Solicitud de Stock)

**Escenario:** Sucursal 4 (Depósito) solicita 5 unidades a Sucursal 1 (Casa Central)

**Paso 1: Crear Solicitud**
- Usuario en /pedir-stock (Sucursal 4)
- Selecciona artículo 7323
- Cantidad: 5
- Sucursal destino: Casa Central (1)

**Paso 2: Verificar Estado Post-Creación**
```sql
SELECT id_num, estado, tipo_transferencia, sucursald, sucursalh, cantidad
FROM pedidoitem
ORDER BY id_num DESC LIMIT 1;
```
**Esperado:** `estado = 'Solicitado'`, `tipo_transferencia = 'PULL'`

**Paso 3: Verificar Stock NO cambió**
```sql
SELECT exi1, exi2 FROM artsucursal WHERE id_articulo = 7323;
```
**Esperado:** Stock igual a valores iniciales

**Paso 4: Aceptar Transferencia**
- Usuario en /transferencias-pendientes (Sucursal 1)
- Click en "Aceptar"

**Paso 5: Verificar Estado Post-Aceptación**
```sql
SELECT estado, fecha_aceptacion, usuario_aceptacion
FROM pedidoitem
WHERE id_num = [ID_TRANSFERENCIA];
```
**Esperado:** `estado = 'Aceptado'`, fecha y usuario registrados

**Paso 6: ✅ VERIFICAR STOCK NO CAMBIÓ (CLAVE)**
```sql
SELECT exi1, exi2 FROM artsucursal WHERE id_articulo = 7323;
```
**Esperado:** Stock sigue igual (NO se movió en aceptación)

**Paso 7: Confirmar Recepción**
- Usuario en /mis-transferencias (Sucursal 4)
- Click en "Confirmar Recepción"

**Paso 8: Verificar Estado Post-Confirmación**
```sql
SELECT estado, fecha_confirmacion, usuario_confirmacion
FROM pedidoitem
WHERE id_num = [ID_TRANSFERENCIA];
```
**Esperado:** `estado = 'Recibido'`

**Paso 9: ✅ VERIFICAR STOCK SÍ CAMBIÓ (CLAVE)**
```sql
SELECT exi1, exi2 FROM artsucursal WHERE id_articulo = 7323;
```
**Esperado:**
- `exi2` (Casa Central) = stock_inicial - 5
- `exi1` (Depósito) = stock_inicial + 5

---

#### Test 3: Flujo PUSH Completo (Oferta de Stock)

**Escenario:** Sucursal 1 (Casa Central) ofrece 3 unidades a Sucursal 2 (Valle Viejo)

**Paso 1: Crear Oferta**
- Usuario en /ofrecer-stock (Sucursal 1)
- Selecciona artículo 7323
- Cantidad: 3
- Sucursal destino: Valle Viejo (2)

**Paso 2: Verificar Estado**
```sql
SELECT id_num, estado, tipo_transferencia, sucursald, sucursalh
FROM pedidoitem
ORDER BY id_num DESC LIMIT 1;
```
**Esperado:** `estado = 'Ofrecido'`, `tipo_transferencia = 'PUSH'`

**Paso 3: Verificar Stock NO cambió**
```sql
SELECT exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;
```
**Esperado:** Stock sin cambios

**Paso 4: Aceptar Oferta**
- Usuario en /transferencias-pendientes (Sucursal 2)
- Click en "Aceptar"

**Paso 5: ✅ VERIFICAR STOCK NO CAMBIÓ**
```sql
SELECT exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;
```
**Esperado:** Stock sigue igual

**Paso 6: Confirmar Envío**
- Usuario en /mis-transferencias (Sucursal 1)
- Click en "Confirmar Envío"

**Paso 7: ✅ VERIFICAR STOCK SÍ CAMBIÓ**
```sql
SELECT exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;
```
**Esperado:**
- `exi2` (Casa Central) = stock_inicial - 3
- `exi3` (Valle Viejo) = stock_inicial + 3

---

#### Test 4: Validación de Estados

**Objetivo:** Verificar que no se pueda confirmar sin aceptar primero

**Paso 1: Crear transferencia en estado "Solicitado"**

**Paso 2: Intentar confirmar sin aceptar**
```
POST /api/Descarga/ConfirmarRecepcion
{ "id_num": [ID], "usuario": "test" }
```

**Esperado:** Error "Solo se pueden confirmar recepciones de transferencias en estado 'Aceptado'"

---

#### Test 5: Logs del Backend

**Objetivo:** Verificar que los logs muestran el movimiento correcto

**Comando:**
```bash
tail -f /var/log/php/error.log | grep "Stock movido"
```

**Esperado en logs:**
```
✅ ConfirmarRecepcion - Stock movido: Art 7323 ('ACEL. RAP. MDA'),
   Cantidad: 5, Origen exi2: 100 → 95, Destino exi1: 50 → 55
```

---

### FASE 2: Testing de Regresión

#### Test 6: Rechazar Transferencia

**Objetivo:** Verificar que rechazar sigue sin mover stock

**Pasos:**
1. Crear transferencia
2. Rechazar (sin aceptar)
3. Verificar stock no cambió

---

#### Test 7: Cancelar Transferencia

**Objetivo:** Verificar que cancelar sigue sin mover stock

**Pasos:**
1. Crear transferencia
2. Cancelar
3. Verificar stock no cambió

---

## 🔙 PROCEDIMIENTO DE ROLLBACK

### Si algo sale mal durante la implementación

#### ROLLBACK Nivel 1: Git

```bash
# Ver cambios realizados
git diff src/Descarga.php.txt

# Revertir archivo a versión anterior
git checkout HEAD -- src/Descarga.php.txt

# O revertir commit completo
git revert [COMMIT_HASH]
```

---

#### ROLLBACK Nivel 2: Backup Manual

**ANTES de implementar, crear backup:**

```bash
# En el servidor
cp src/Descarga.php.txt src/Descarga.php.txt.backup_20251117
```

**Para restaurar:**
```bash
cp src/Descarga.php.txt.backup_20251117 src/Descarga.php.txt
```

---

#### ROLLBACK Nivel 3: Restaurar Stock Manualmente

**Si el stock se movió incorrectamente:**

```sql
-- Identificar la transferencia problemática
SELECT id_num, id_art, cantidad, sucursald, sucursalh, tipo_transferencia
FROM pedidoitem
WHERE id_num = [ID_PROBLEMA];

-- Calcular qué revertir (MANUAL, caso por caso)
-- Ejemplo: Si se movió 5 de exi2 a exi1, revertir:
UPDATE artsucursal
SET
    exi2 = exi2 + 5,  -- Devolver al origen
    exi1 = exi1 - 5   -- Quitar del destino
WHERE id_articulo = [ID_ART];
```

**⚠️ CRÍTICO:** Hacer esto SOLO si se confirma que hubo error

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### ANTES de Implementar

- [ ] Leer este documento completo
- [ ] Crear backup de `Descarga.php.txt`
- [ ] Documentar stock actual de artículos de prueba
- [ ] Identificar transferencias en estado "Aceptado" (si existen)
- [ ] Decidir estrategia para transferencias existentes
- [ ] Tener acceso a logs del backend
- [ ] Tener acceso a PostgreSQL para queries de verificación

---

### DURANTE la Implementación

- [ ] **MODIFICACIÓN 1:** Comentar bloque de stock en `AceptarTransferencia_post()`
- [ ] **MODIFICACIÓN 2:** Agregar bloque de stock en `ConfirmarRecepcion_post()`
- [ ] **MODIFICACIÓN 3:** Agregar bloque de stock en `ConfirmarEnvio_post()`
- [ ] Verificar sintaxis PHP (no errores)
- [ ] Reiniciar servidor web/PHP si es necesario
- [ ] Verificar que la aplicación carga sin errores

---

### TESTING

#### Test PULL (Solicitud)
- [ ] Crear solicitud → Verificar estado "Solicitado"
- [ ] Verificar stock NO cambió
- [ ] Aceptar solicitud → Verificar estado "Aceptado"
- [ ] **CRÍTICO:** Verificar stock NO cambió (debe quedar igual)
- [ ] Confirmar recepción → Verificar estado "Recibido"
- [ ] **CRÍTICO:** Verificar stock SÍ cambió (origen -, destino +)
- [ ] Verificar logs del backend

#### Test PUSH (Oferta)
- [ ] Crear oferta → Verificar estado "Ofrecido"
- [ ] Verificar stock NO cambió
- [ ] Aceptar oferta → Verificar estado "Aceptado"
- [ ] **CRÍTICO:** Verificar stock NO cambió
- [ ] Confirmar envío → Verificar estado "Recibido"
- [ ] **CRÍTICO:** Verificar stock SÍ cambió
- [ ] Verificar logs del backend

#### Tests de Validación
- [ ] Intentar confirmar sin aceptar → Debe fallar
- [ ] Rechazar transferencia → Stock no debe cambiar
- [ ] Cancelar transferencia → Stock no debe cambiar

---

### DESPUÉS de Implementar

- [ ] Documentar cambios realizados
- [ ] Actualizar documentación del sistema
- [ ] Notificar a usuarios del cambio de comportamiento
- [ ] Monitorear logs por 24 horas
- [ ] Verificar reportes de inventario
- [ ] Archivar backup si todo está OK (después de 1 semana)

---

## 📊 MÉTRICAS DE ÉXITO

### Criterios de Aceptación

✅ **Implementación exitosa SI:**

1. Aceptar transferencia NO mueve stock
2. Confirmar transferencia SÍ mueve stock
3. Stock origen disminuye correctamente
4. Stock destino aumenta correctamente
5. Todos los logs muestran información correcta
6. No hay errores en consola del navegador
7. No hay errores en logs del backend
8. Usuarios pueden completar flujo completo sin problemas

❌ **Rollback necesario SI:**

1. Stock se mueve en aceptación (no se corrigió el problema)
2. Stock NO se mueve en confirmación
3. Errores en actualización de stock
4. Errores de sintaxis PHP
5. Aplicación no carga
6. Cualquier comportamiento inesperado

---

## 📞 CONTACTO Y SOPORTE

### En caso de problemas durante implementación:

1. **Revisar logs del backend:** `/var/log/php/error.log`
2. **Revisar logs de PostgreSQL:** Buscar errores de queries
3. **Ejecutar rollback** según procedimiento
4. **Documentar el error** para análisis

---

## 📝 REGISTRO DE CAMBIOS

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-11-17 | 1.0 | Plan inicial completo |

---

## 🎯 CONCLUSIÓN

Este plan proporciona todos los detalles necesarios para implementar la SOLUCIÓN 1 de forma segura y controlada. Siguiendo cada paso del checklist, la implementación debería ser exitosa.

**Recuerda:**
- ⏱️ No apresurarse
- ✅ Verificar cada paso
- 📝 Documentar todo
- 🔙 Tener plan de rollback listo

**Tiempo estimado total:** 3-4 horas (incluyendo testing completo)

**¿Listo para implementar?** Sigue el checklist paso a paso.
