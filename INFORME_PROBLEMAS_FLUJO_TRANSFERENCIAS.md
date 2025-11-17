# INFORME CRÍTICO: Problemas en Flujo de Transferencias de Stock

**Fecha:** 17 de noviembre de 2025
**Análisis:** Sistema de transferencias V2
**Método:** Análisis profundo de PostgreSQL, Backend PHP y Componentes Angular

---

## 🚨 RESUMEN EJECUTIVO

Se identificaron **2 PROBLEMAS CRÍTICOS** en el sistema de transferencias de stock:

1. **PROBLEMA 1:** El stock se mueve ANTES de la confirmación (en el momento de aceptación)
2. **PROBLEMA 2:** Los componentes `/stockrecibo` y `/enviodestockrealizados` NO muestran registros porque buscan un estado inexistente

---

## 📊 DATOS DE LA BASE DE DATOS

### Movimientos Recientes (Últimos 3):

```sql
ID: 751 | Estado: Recibido  | Tipo: PULL | Aceptado: 2025-11-17 | Confirmado: 2025-11-17
ID: 750 | Estado: Rechazado | Tipo: PULL | Sin aceptación ni confirmación
ID: 749 | Estado: Aceptado  | Tipo: PULL | Aceptado: 2025-11-17 | Sin confirmación
```

### Estados Existentes en Transferencias V2:

| Estado | Cantidad | Descripción |
|--------|----------|-------------|
| Aceptado | 1 | Transferencia aceptada, stock YA movido |
| Recibido | 1 | Transferencia confirmada como recibida |
| Rechazado | 1 | Transferencia rechazada |

**⚠️ IMPORTANTE:** NO existe el estado "Enviado" en el sistema V2

---

## 🔴 PROBLEMA 1: Stock se mueve en momento incorrecto

### 📍 Ubicación del Problema

**Archivo:** `src/Descarga.php.txt`
**Función:** `AceptarTransferencia_post()`
**Líneas:** 7122-7161

### 🔍 Análisis Detallado

#### Flujo ACTUAL (Incorrecto):

```
1. Usuario en /transferencias-pendientes ve solicitud "Solicitado"
2. Usuario hace clic en "Aceptar"
3. Backend ejecuta AceptarTransferencia_post()
   ├─ 🔴 MUEVE EL STOCK INMEDIATAMENTE (líneas 7149-7158)
   │  UPDATE artsucursal
   │  SET exi_origen = exi_origen - cantidad,
   │      exi_destino = exi_destino + cantidad
   │
   └─ Cambia estado a "Aceptado" (línea 7172)
4. Usuario en /mis-transferencias hace clic en "Confirmar Recepción"
5. Backend ejecuta ConfirmarRecepcion_post()
   └─ Solo cambia estado a "Recibido" (línea 7448)
   └─ ❌ NO mueve stock (ya se movió antes)
```

#### Flujo ESPERADO (Correcto):

```
1. Usuario en /transferencias-pendientes ve solicitud "Solicitado"
2. Usuario hace clic en "Aceptar"
3. Backend ejecuta AceptarTransferencia_post()
   ├─ ✅ NO mueve stock todavía
   └─ Cambia estado a "Aceptado"
4. Usuario en /mis-transferencias hace clic en "Confirmar Recepción"
5. Backend ejecuta ConfirmarRecepcion_post()
   ├─ ✅ MUEVE EL STOCK AQUÍ
   │  UPDATE artsucursal
   │  SET exi_origen = exi_origen - cantidad,
   │      exi_destino = exi_destino + cantidad
   │
   └─ Cambia estado a "Recibido"
```

### 📋 Código Problemático

**Archivo:** `src/Descarga.php.txt` (líneas 7149-7158)

```php
// ❌ PROBLEMA: Esto se ejecuta en AceptarTransferencia (demasiado temprano)
$sql_update_stock = "
    UPDATE artsucursal
    SET
        {$campo_origen} = {$campo_origen} - ?,
        {$campo_destino} = {$campo_destino} + ?
    WHERE id_articulo = ?
";

$this->db->query($sql_update_stock, [$cantidad, $cantidad, $id_art]);
```

### ⚠️ Consecuencias del Problema

1. **Stock movido prematuramente:**
   - La mercadería aparece en destino ANTES de ser confirmada físicamente
   - Si hay un problema en el envío, el stock ya está descontado

2. **Inconsistencia de datos:**
   - Estado "Aceptado" implica que el stock YA se movió
   - La confirmación no tiene impacto real en el stock

3. **Riesgo operativo:**
   - Si la transferencia nunca se confirma, el stock queda movido incorrectamente
   - No hay reversión automática

---

## 🔴 PROBLEMA 2: Componentes NO muestran registros

### 📍 Ubicación del Problema

**Componentes afectados:**
1. `/stockrecibo` (stockrecibo.component.ts - línea 137)
2. `/enviodestockrealizados` (enviodestockrealizados.component.ts - línea 101)

### 🔍 Análisis Detallado

#### Problema en `/stockrecibo`

**Archivo:** `src/app/components/stockrecibo/stockrecibo.component.ts`

**Código problemático (líneas 135-137):**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) => {
  const estado = item.estado.trim();
  return estado === 'Enviado' || estado === 'Recibido'; // ❌ 'Enviado' NO EXISTE
});
```

**Estados que busca:**
- ❌ `'Enviado'` - NO EXISTE en sistema V2
- ✅ `'Recibido'` - SÍ EXISTE

**Resultado:** Solo muestra transferencias con estado "Recibido", NUNCA muestra las "Enviadas" porque no existen.

---

#### Problema en `/enviodestockrealizados`

**Archivo:** `src/app/components/enviodestockrealizados/enviodestockrealizados.component.ts`

**Código problemático (línea 101):**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) =>
  item.estado.trim() === 'Enviado'); // ❌ 'Enviado' NO EXISTE
```

**Estado que busca:**
- ❌ `'Enviado'` - NO EXISTE en sistema V2

**Resultado:** NUNCA muestra ningún registro porque el estado buscado no existe.

---

### 📊 Estados Reales vs Estados Buscados

| Componente | Estado Buscado | ¿Existe? | ¿Muestra datos? |
|------------|----------------|----------|-----------------|
| `stockrecibo` | `'Enviado'` | ❌ NO | ❌ NO |
| `stockrecibo` | `'Recibido'` | ✅ SÍ | ✅ SÍ (solo estos) |
| `enviodestockrealizados` | `'Enviado'` | ❌ NO | ❌ NO |

### 🗂️ Estados Reales del Sistema V2

```
Estados en pedidoitem (tipo_transferencia NOT NULL):
- Solicitado  (transferencia creada, pendiente de aceptación)
- Ofrecido    (oferta creada, pendiente de aceptación)
- Aceptado    (transferencia aceptada, stock YA movido)
- Recibido    (transferencia confirmada como recibida)
- Rechazado   (transferencia rechazada)
- Cancelado   (transferencia cancelada)
```

**⚠️ El estado "Enviado" NO EXISTE en el sistema V2**

---

## ✅ SOLUCIONES PROPUESTAS

### SOLUCIÓN 1: Mover actualización de stock a la confirmación

#### Objetivo
Mover el stock DESPUÉS de que se confirme la recepción, no al aceptar.

#### Cambios Necesarios

##### 1.1. Modificar `AceptarTransferencia_post()`

**Archivo:** `src/Descarga.php.txt` (líneas 7122-7161)

**CAMBIO:** Comentar/eliminar el bloque de actualización de stock

```php
// ====================================================================
// MOVER STOCK PARA CADA ARTÍCULO
// ====================================================================
// ❌ ELIMINAR ESTE BLOQUE COMPLETO (líneas 7125-7161)
/* COMENTADO: No mover stock aquí, se moverá en ConfirmarRecepcion/ConfirmarEnvio
foreach ($items as $item) {
    $id_art = $item->id_art;
    $cantidad = $item->cantidad;

    // ... código de actualización de stock ...
}
*/
```

##### 1.2. Modificar `ConfirmarRecepcion_post()`

**Archivo:** `src/Descarga.php.txt` (después de línea 7438)

**CAMBIO:** Agregar lógica de movimiento de stock

```php
// ====================================================================
// OBTENER DATOS PARA MOVER STOCK
// ====================================================================

$sql_pedido = "
    SELECT
        pi.id_art,
        pi.cantidad,
        pi.tipo_transferencia,
        pc.sucursald,
        pc.sucursalh
    FROM pedidoitem pi
    INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
    WHERE pi.id_num = ?
";

$query = $this->db->query($sql_pedido, [$id_num]);
$items = $query->result();

// Determinar dirección del movimiento
$tipo_transferencia = $items[0]->tipo_transferencia;
$sucursald = $items[0]->sucursald;
$sucursalh = $items[0]->sucursalh;

// PULL: Stock se mueve sucursalh → sucursald
if ($tipo_transferencia === 'PULL') {
    $sucursal_origen = $sucursalh;
    $sucursal_destino = $sucursald;
} else { // PUSH
    $sucursal_origen = $sucursald;
    $sucursal_destino = $sucursalh;
}

// Mapeo sucursal → campo stock
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Depósito
    5 => 'exi5'  // Mayorista
];

$campo_origen = $mapeo_sucursal_exi[$sucursal_origen];
$campo_destino = $mapeo_sucursal_exi[$sucursal_destino];

// ====================================================================
// MOVER STOCK AQUÍ (AL CONFIRMAR RECEPCIÓN)
// ====================================================================

foreach ($items as $item) {
    $id_art = $item->id_art;
    $cantidad = $item->cantidad;

    // Actualizar stock
    $sql_update_stock = "
        UPDATE artsucursal
        SET
            {$campo_origen} = {$campo_origen} - ?,
            {$campo_destino} = {$campo_destino} + ?
        WHERE id_articulo = ?
    ";

    $this->db->query($sql_update_stock, [$cantidad, $cantidad, $id_art]);

    log_message('info', "✅ Stock movido en CONFIRMACIÓN: Art {$id_art}, Cantidad: {$cantidad}");
}
```

##### 1.3. Modificar `ConfirmarEnvio_post()`

**Similar a ConfirmarRecepcion_post(), agregar la misma lógica de movimiento de stock.**

---

### SOLUCIÓN 2: Corregir filtros de componentes

#### Objetivo
Hacer que `/stockrecibo` y `/enviodestockrealizados` muestren los registros correctos según estados V2.

#### Cambios Necesarios

##### 2.1. Corregir `/stockrecibo`

**Archivo:** `src/app/components/stockrecibo/stockrecibo.component.ts` (línea 135-137)

**ANTES:**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) => {
  const estado = item.estado.trim();
  return estado === 'Enviado' || estado === 'Recibido'; // ❌
});
```

**DESPUÉS (Opción A - Mostrar Aceptadas y Recibidas):**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) => {
  const estado = item.estado.trim();
  // Mostrar transferencias aceptadas (pendientes de confirmación) y recibidas
  return estado === 'Aceptado' || estado === 'Recibido';
});
```

**DESPUÉS (Opción B - Solo Recibidas):**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) => {
  const estado = item.estado.trim();
  // Solo mostrar transferencias confirmadas como recibidas
  return estado === 'Recibido';
});
```

##### 2.2. Corregir `/enviodestockrealizados`

**Archivo:** `src/app/components/enviodestockrealizados/enviodestockrealizados.component.ts` (línea 101)

**ANTES:**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) =>
  item.estado.trim() === 'Enviado'); // ❌
```

**DESPUÉS (Opción A - Mostrar Aceptadas y Recibidas):**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) => {
  const estado = item.estado.trim();
  // Mostrar envíos aceptados (pendientes de confirmación) y recibidos
  return estado === 'Aceptado' || estado === 'Recibido';
});
```

**DESPUÉS (Opción B - Solo Recibidas):**
```typescript
this.pedidoItem = data.mensaje.filter((item: any) => {
  const estado = item.estado.trim();
  // Solo mostrar envíos confirmados como recibidos
  return estado === 'Recibido';
});
```

---

## 🎯 RECOMENDACIONES

### Prioridad ALTA (Crítico):

1. **SOLUCIÓN 2 primero** (Corregir filtros de componentes)
   - Impacto inmediato
   - Sin riesgo
   - Permite visualizar datos existentes
   - **Tiempo estimado:** 10 minutos

2. **SOLUCIÓN 1 después** (Mover actualización de stock)
   - Requiere testing exhaustivo
   - Cambio en lógica de negocio
   - **Tiempo estimado:** 2-4 horas (incluyendo pruebas)

### Orden de Implementación Recomendado:

```
1. Aplicar SOLUCIÓN 2 (Corregir filtros)
   └─ Verificar que los componentes muestran datos

2. Aplicar SOLUCIÓN 1 (Mover stock a confirmación)
   ├─ Modificar AceptarTransferencia_post()
   ├─ Modificar ConfirmarRecepcion_post()
   ├─ Modificar ConfirmarEnvio_post()
   └─ Probar exhaustivamente:
      ├─ Crear solicitud PULL
      ├─ Aceptar solicitud (verificar que NO se mueve stock)
      ├─ Confirmar recepción (verificar que SÍ se mueve stock)
      ├─ Crear oferta PUSH
      ├─ Aceptar oferta (verificar que NO se mueve stock)
      └─ Confirmar envío (verificar que SÍ se mueve stock)
```

---

## 📝 PLAN DE PRUEBAS

### Antes de implementar SOLUCIÓN 1:

1. **Consultar estado actual del stock:**
```sql
SELECT id_articulo, exi1, exi2, exi3, exi4, exi5
FROM artsucursal
WHERE id_articulo = 7323; -- Artículo de prueba
```

2. **Crear transferencia de prueba**
3. **Aceptar transferencia**
4. **Verificar que stock NO cambió** (con SOLUCIÓN 1 aplicada)
5. **Confirmar recepción**
6. **Verificar que stock SÍ cambió**

---

## 📊 IMPACTO DE LOS PROBLEMAS

### PROBLEMA 1: Stock movido prematuramente

**Impacto Operativo:**
- 🔴 ALTO - Afecta integridad de inventario
- Mercadería aparece disponible antes de recibirla
- Stock descontado aunque no se haya enviado

**Impacto en Datos:**
- Estado "Aceptado" ya tiene stock movido
- La confirmación no tiene efecto real

### PROBLEMA 2: Componentes vacíos

**Impacto Operativo:**
- 🟡 MEDIO - Afecta visibilidad de operaciones
- Usuarios no pueden ver envíos realizados
- Usuarios no pueden ver recepciones pendientes

**Impacto en UX:**
- Componentes aparecen siempre vacíos
- Genera confusión en usuarios

---

## ✅ CHECKLIST DE VERIFICACIÓN POST-IMPLEMENTACIÓN

### Después de SOLUCIÓN 2:

- [ ] `/stockrecibo` muestra transferencias con estado "Aceptado"
- [ ] `/stockrecibo` muestra transferencias con estado "Recibido"
- [ ] `/enviodestockrealizados` muestra transferencias con estado "Aceptado"
- [ ] `/enviodestockrealizados` muestra transferencias con estado "Recibido"
- [ ] No hay errores en consola del navegador

### Después de SOLUCIÓN 1:

- [ ] Aceptar transferencia NO mueve stock
- [ ] Estado cambia a "Aceptado" correctamente
- [ ] Confirmar recepción SÍ mueve stock
- [ ] Estado cambia a "Recibido" correctamente
- [ ] Stock origen se reduce correctamente
- [ ] Stock destino aumenta correctamente
- [ ] Logs del backend muestran movimiento en confirmación
- [ ] No se puede confirmar una transferencia que no está en "Aceptado"

---

## 📌 CONCLUSIONES

1. **El stock se está moviendo en el momento incorrecto** (al aceptar en lugar de al confirmar)
2. **Los componentes buscan un estado que no existe** ("Enviado" en lugar de "Aceptado"/"Recibido")
3. **Ambos problemas son solucionables** con los cambios propuestos
4. **La SOLUCIÓN 2 es de bajo riesgo** y se puede aplicar inmediatamente
5. **La SOLUCIÓN 1 requiere testing exhaustivo** antes de producción

---

**Archivos a modificar para SOLUCIÓN 1:**
- `src/Descarga.php.txt` (AceptarTransferencia_post)
- `src/Descarga.php.txt` (ConfirmarRecepcion_post)
- `src/Descarga.php.txt` (ConfirmarEnvio_post)

**Archivos a modificar para SOLUCIÓN 2:**
- `src/app/components/stockrecibo/stockrecibo.component.ts`
- `src/app/components/enviodestockrealizados/enviodestockrealizados.component.ts`
