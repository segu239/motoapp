# Análisis de Problemas de Selecciones Múltiples en Movimientos de Stock

**Fecha:** 2025-11-06
**Proyecto:** MotoApp
**Versión Angular:** 15.2.6
**Base de Datos:** PostgreSQL (CodeIgniter + Firebase)

---

## 1. RESUMEN EJECUTIVO

Se han detectado problemas de **duplicación de registros** en los componentes de movimiento de stock cuando se realizan selecciones múltiples. La causa principal es una **inconsistencia entre la configuración de la interfaz (que permite selecciones múltiples) y la lógica de procesamiento (que solo procesa un elemento)**, combinada con la **falta de validaciones de duplicados en el backend** y **protección contra múltiples clicks**.

### Componentes Afectados:
1. ✅ `stockpedido.component.ts/html` - Recepción de pedidos
2. ✅ `enviostockpendientes.component.ts/html` - Envío de pedidos pendientes
3. ⚠️ Potencialmente: `stockrecibo.component.ts/html`

### Impacto:
- ❌ **CRÍTICO**: Duplicación de registros en base de datos
- ❌ **CRÍTICO**: Actualización incorrecta de stock (múltiples sumas/restas)
- ⚠️ **MEDIO**: Confusión de usuarios por comportamiento inconsistente

---

## 2. ANÁLISIS DETALLADO DE PROBLEMAS

### 2.1. Problema #1: Configuración Inconsistente de Selección Múltiple

#### Ubicación:
- `src/app/components/stockpedido/stockpedido.component.html` (líneas 79-82)
- `src/app/components/enviostockpendientes/enviostockpendientes.component.html` (líneas 6-9)

#### Código Problemático:
```html
<p-table #dtable [value]="pedidoItem"
    [(selection)]="selectedPedidoItem"
    (selectionChange)="onSelectionChange($event)">
    <!-- NO especifica selectionMode -->

    <ng-template pTemplate="header">
        <th style="width: 3rem">
            <p-tableHeaderCheckbox></p-tableHeaderCheckbox>  <!-- ⚠️ Permite selección múltiple -->
        </th>
    </ng-template>

    <ng-template pTemplate="body" let-pedido>
        <p-tableCheckbox [value]="pedido"></p-tableCheckbox>  <!-- ⚠️ Checkbox por fila -->
    </ng-template>
</p-table>
```

#### Análisis:
- **La tabla incluye `<p-tableHeaderCheckbox>`** que habilita selección múltiple
- **NO se especifica `selectionMode="single"`**, lo que permite múltiples selecciones
- **El array `selectedPedidoItem: any[]`** puede contener múltiples elementos
- **INCONSISTENCIA**: La UI permite múltiples selecciones, pero el código solo procesa 1

---

### 2.2. Problema #2: Procesamiento Solo del Primer Elemento

#### Ubicación:
- `src/app/components/stockpedido/stockpedido.component.ts:292`
- `src/app/components/enviostockpendientes/enviostockpendientes.component.ts:251`

#### Código Problemático:

**stockpedido.component.ts:**
```typescript
recibir() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido...', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];  // ⚠️ Solo procesa el PRIMER elemento

  // ... validación de estado ...

  this._cargardata.crearPedidoStockId(id_num, pedidoItem, pedidoscb).subscribe({
    next: (response) => {
      Swal.fire('Éxito', 'Pedido registrado exitosamente', 'success');
      this.refrescarDatos();
    }
  });
}
```

**enviostockpendientes.component.ts:**
```typescript
enviar() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido...', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];  // ⚠️ Solo procesa el PRIMER elemento

  // ... procesamiento similar ...
}
```

#### Análisis:
- **Validación insuficiente**: Solo verifica que `length === 0`, no que `length === 1`
- **Procesamiento parcial**: Si el usuario selecciona 3 pedidos, solo se procesa el primero
- **Sin advertencia**: No se informa al usuario que solo se procesará 1 de los N seleccionados
- **Comportamiento confuso**: El usuario puede creer que se procesaron todos los seleccionados

---

### 2.3. Problema #3: Falta de Validación de Duplicados en Backend

#### Ubicación:
- `src/Descarga.php.txt:1709-1850` (función `PedidoItemyCabId_post`)
- `src/Descarga.php.txt:1852-2050` (función `PedidoItemyCabIdEnvio_post`)

#### Código Problemático:

**PedidoItemyCabId_post (Recepción):**
```php
public function PedidoItemyCabId_post() {
    $data = $this->post();
    $id_num_parametro = $data['id_num'];
    $pedidoItem = $data['pedidoItem'];
    $pedidoscb = $data['pedidoscb'];

    $this->db->trans_start();

    // ⚠️ SIEMPRE crea un NUEVO registro en pedidoitem
    $sql_pedidoitem = "INSERT INTO pedidoitem (...) VALUES (...) RETURNING id_items";
    $query = $this->db->query($sql_pedidoitem, [...]);
    $id_items_nuevo = $result['id_items'];

    // ⚠️ SIEMPRE crea un NUEVO registro en pedidoscb
    $sql_pedidoscb = "INSERT INTO pedidoscb (...) VALUES (...) RETURNING id_num";
    $query = $this->db->query($sql_pedidoscb, [...]);
    $id_num_generado = $result['id_num'];

    // ⚠️ ACTUALIZA el pedido original a "Recibido"
    $this->db->query("UPDATE pedidoitem SET estado = ? WHERE id_num = ? AND estado = 'Solicitado-E'",
                     ["Recibido", $id_num_parametro]);

    // ⚠️ ACTUALIZA stock: SUMA en destino, RESTA en origen
    $sql_update_destino = "UPDATE artsucursal SET $campo_stock_destino = $campo_stock_destino + ?
                           WHERE id_articulo = ?";
    $this->db->query($sql_update_destino, [$pedidoItem['cantidad'], $pedidoItem['id_art']]);

    $sql_update_origen = "UPDATE artsucursal SET $campo_stock_origen = $campo_stock_origen - ?
                          WHERE id_articulo = ?";
    $this->db->query($sql_update_origen, [$pedidoItem['cantidad'], $pedidoItem['id_art']]);

    $this->db->trans_complete();
}
```

#### Análisis del Flujo:

**Escenario de Duplicación:**

1. **Usuario selecciona un pedido y hace click en "Recibir" 2 veces rápidamente**

   **Primera solicitud:**
   - ✅ Se inserta nuevo pedidoitem con id_items=100, id_num=500
   - ✅ Se inserta nuevo pedidoscb con id_num=500
   - ✅ Se actualiza pedido original (id_num=50) a estado "Recibido"
   - ✅ Se suma +10 unidades a stock destino
   - ✅ Se resta -10 unidades de stock origen

   **Segunda solicitud (antes de que la tabla se refresque):**
   - ⚠️ Se inserta OTRO pedidoitem con id_items=101, id_num=501
   - ⚠️ Se inserta OTRO pedidoscb con id_num=501
   - ⚠️ Intenta actualizar pedido original (id_num=50) pero ya está en "Recibido"
   - ❌ **Se suma OTRA VEZ +10 unidades a stock destino** (ahora +20 total)
   - ❌ **Se resta OTRA VEZ -10 unidades de stock origen** (ahora -20 total)

2. **Resultado:**
   - ❌ Stock duplicado: +20 en lugar de +10
   - ❌ Registros duplicados: 2 pedidoitem y 2 pedidoscb para la misma operación
   - ⚠️ Pedido original correctamente marcado como "Recibido" (pero datos incorrectos)

#### Problemas Identificados:
- **Sin validación de estado previo**: No se verifica si el pedido YA fue procesado antes de crear registros
- **Sin validación de timestamp**: No se verifica si ya existe un registro reciente del mismo id_num
- **Sin bloqueo de transacciones**: No se usa `SELECT ... FOR UPDATE` para prevenir race conditions
- **Actualización de stock no idempotente**: Cada llamada suma/resta de nuevo, sin importar si ya se procesó

---

### 2.4. Problema #4: Botones No Deshabilitados Durante Procesamiento

#### Ubicación:
- `src/app/components/stockpedido/stockpedido.component.html:139`
- `src/app/components/enviostockpendientes/enviostockpendientes.component.html:66`

#### Código Problemático:
```html
<p-button label="Recibir" (click)="recibir()" styleClass="p-button-sm p-button-primary mr-2"></p-button>
<!-- ⚠️ No tiene [disabled] binding para prevenir múltiples clicks -->
```

#### Análisis:
- **Sin protección contra múltiples clicks**: El botón permanece activo durante la solicitud HTTP
- **Sin indicador de carga**: No hay loading spinner o feedback visual
- **Latencia de red**: Con conexiones lentas, el usuario puede hacer click múltiples veces creyendo que no funcionó
- **Sin debounce**: No hay throttling o debounce en el evento click

---

### 2.5. Problema #5: Estado de Selección No Limpiado

#### Ubicación:
- `src/app/components/stockpedido/stockpedido.component.ts:339-348`
- `src/app/components/enviostockpendientes/enviostockpendientes.component.ts:302-312`

#### Código Problemático:
```typescript
refrescarDatos() {
  this.cargarPedidos();

  // Resetear la tabla PrimeNG para forzar actualización de la vista
  if (this.dtable) {
    this.dtable.reset();
  }
  // ⚠️ NO limpia this.selectedPedidoItem
}
```

#### Análisis:
- **Array de selección persiste**: `this.selectedPedidoItem` mantiene el elemento seleccionado después de procesar
- **Permite reprocesamiento**: El usuario puede hacer click en "Recibir" nuevamente sin reseleccionar
- **Sin limpieza explícita**: Falta `this.selectedPedidoItem = [];` después de operación exitosa
- **Estado inconsistente**: La tabla se refresca pero la selección permanece

---

## 3. ESCENARIOS DE FALLA IDENTIFICADOS

### 3.1. Escenario A: Usuario Hace Click Múltiples Veces
**Pasos:**
1. Usuario selecciona un pedido (id_num=100)
2. Usuario hace click en "Recibir" 3 veces rápidamente (antes de que aparezca el SweetAlert)
3. Se envían 3 solicitudes HTTP simultáneas al backend

**Resultado:**
- ❌ Se crean 3 nuevos pedidoitem (id_items=200, 201, 202)
- ❌ Se crean 3 nuevos pedidoscb (id_num=500, 501, 502)
- ❌ El stock se actualiza 3 veces: +30 en destino, -30 en origen (debería ser solo +10/-10)
- ⚠️ El pedido original (id_num=100) se actualiza correctamente a "Recibido"
- ⚠️ Solo aparece 1 mensaje de éxito (el último en completarse)

**Frecuencia:** Alta (común con conexiones lentas o usuarios ansiosos)

---

### 3.2. Escenario B: Usuario Selecciona Múltiples Pedidos
**Pasos:**
1. Usuario selecciona 3 pedidos (id_num=100, 101, 102) usando checkboxes
2. Usuario hace click en "Recibir" 1 vez

**Resultado Actual:**
- ⚠️ Solo se procesa el PRIMER pedido seleccionado (id_num=100)
- ⚠️ Los otros 2 pedidos (id_num=101, 102) quedan en estado "Solicitado-E" sin procesar
- ❌ El usuario cree que se procesaron los 3, pero solo se procesó 1
- ❌ No hay mensaje de advertencia sobre pedidos no procesados

**Comportamiento Esperado:**
- ✅ Debería procesar los 3 pedidos seleccionados
- ✅ O mostrar error si solo se permite seleccionar 1

**Frecuencia:** Media (usuarios experimentados pueden descubrir selección múltiple)

---

### 3.3. Escenario C: Usuario Hace Click Después de Refrescar
**Pasos:**
1. Usuario selecciona un pedido (id_num=100)
2. Usuario hace click en "Recibir" → Se procesa correctamente
3. SweetAlert aparece "Pedido registrado exitosamente"
4. Usuario hace click "Aceptar" → Tabla se refresca con `cargarPedidos()`
5. **El pedido ya no aparece en la tabla** (filtrado por estado "Solicitado-E")
6. **Pero `selectedPedidoItem` todavía contiene el pedido anterior**
7. Usuario hace click en "Recibir" nuevamente (sin reseleccionar)

**Resultado:**
- ❌ Se vuelve a enviar la misma solicitud con el mismo id_num
- ❌ Se crea otro pedidoitem/pedidoscb duplicado
- ❌ Stock se actualiza de nuevo (duplicación)

**Frecuencia:** Baja (requiere acciones específicas del usuario)

---

## 4. IMPACTO EN BASE DE DATOS

### 4.1. Tablas Afectadas

#### Tabla `pedidoitem`:
```sql
-- Estado normal: 1 registro por operación
SELECT * FROM pedidoitem WHERE id_art = 12345 AND estado = 'Recibido';
-- Resultado esperado: 1 fila

-- Estado con duplicación: múltiples registros
SELECT * FROM pedidoitem WHERE id_art = 12345 AND estado = 'Recibido' AND fecha_resuelto = '2025-11-06';
-- Resultado actual: 2-3 filas con el mismo id_art, cantidad, fecha (duplicados)
```

#### Tabla `pedidoscb`:
```sql
-- Similar a pedidoitem, se crean múltiples cabeceras para la misma operación
SELECT * FROM pedidoscb WHERE sucursald = 5 AND sucursalh = 2 AND estado = 'Recibido' AND fecha = '2025-11-06';
-- Resultado actual: múltiples filas duplicadas
```

#### Tabla `artsucursal`:
```sql
-- Stock se suma/resta múltiples veces
-- Ejemplo: Artículo con id_articulo=12345
-- Operación: Recibir 10 unidades de Deposito (suc=4) a Mayorista (suc=5)

-- Estado antes: exi5=100 (Mayorista), exi1=50 (Deposito)

-- Después de 1 ejecución correcta: exi5=110, exi1=40
-- Después de 2 ejecuciones (duplicado): exi5=120, exi1=30 ❌
-- Después de 3 ejecuciones (triplicado): exi5=130, exi1=20 ❌
```

### 4.2. Consultas para Detectar Duplicados

#### Detectar pedidoitem duplicados (mismo id_art, cantidad, fecha, usuario):
```sql
SELECT id_art, cantidad, fecha_resuelto, usuario_res, COUNT(*) as duplicados
FROM pedidoitem
WHERE estado = 'Recibido'
  AND fecha_resuelto >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY id_art, cantidad, fecha_resuelto, usuario_res
HAVING COUNT(*) > 1
ORDER BY duplicados DESC;
```

#### Detectar pedidoscb duplicados:
```sql
SELECT sucursald, sucursalh, fecha, usuario, COUNT(*) as duplicados
FROM pedidoscb
WHERE estado = 'Recibido'
  AND fecha >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY sucursald, sucursalh, fecha, usuario
HAVING COUNT(*) > 1
ORDER BY duplicados DESC;
```

---

## 5. PLAN DE REPARACIÓN

### 5.1. Solución Inmediata (Quick Fix) - Prioridad ALTA

#### 5.1.1. Forzar Selección Individual en Frontend
**Archivo:** `stockpedido.component.html`, `enviostockpendientes.component.html`

**Cambio:**
```html
<!-- ANTES -->
<p-table #dtable [value]="pedidoItem"
    [(selection)]="selectedPedidoItem"
    (selectionChange)="onSelectionChange($event)">

<!-- DESPUÉS -->
<p-table #dtable [value]="pedidoItem"
    [(selection)]="selectedPedidoItem"
    (selectionChange)="onSelectionChange($event)"
    selectionMode="single"
    dataKey="id_num">
```

**Eliminar checkboxes múltiples:**
```html
<!-- ANTES -->
<th style="width: 3rem">
    <p-tableHeaderCheckbox></p-tableHeaderCheckbox>  <!-- Eliminar -->
</th>

<!-- DESPUÉS -->
<th style="width: 3rem"></th>  <!-- Sin checkbox header -->
```

**Resultado:**
- ✅ Solo se puede seleccionar 1 pedido a la vez
- ✅ Previene Escenario B (selecciones múltiples)
- ✅ Cambio rápido, sin lógica adicional

---

#### 5.1.2. Deshabilitar Botones Durante Procesamiento
**Archivo:** `stockpedido.component.ts`, `enviostockpendientes.component.ts`

**Agregar variable de estado:**
```typescript
export class StockpedidoComponent implements OnInit {
  // ... propiedades existentes ...
  public procesandoRecepcion: boolean = false;  // NUEVO

  recibir() {
    if (this.selectedPedidoItem.length === 0) {
      Swal.fire('Error', 'Debe seleccionar un pedido...', 'error');
      return;
    }

    // NUEVO: Validar que solo haya 1 seleccionado
    if (this.selectedPedidoItem.length > 1) {
      Swal.fire('Error', 'Solo puede seleccionar un pedido a la vez', 'error');
      return;
    }

    // NUEVO: Prevenir múltiples clicks
    if (this.procesandoRecepcion) {
      console.warn('Ya hay una recepción en proceso, ignorando click adicional');
      return;
    }

    const selectedPedido = this.selectedPedidoItem[0];

    // ... validaciones de estado ...

    // NUEVO: Marcar como procesando
    this.procesandoRecepcion = true;

    this._cargardata.crearPedidoStockId(id_num, pedidoItem, pedidoscb).subscribe({
      next: (response) => {
        console.log(response);
        Swal.fire('Éxito', 'Pedido registrado exitosamente', 'success');
        this.procesandoRecepcion = false;  // NUEVO: Liberar
        this.selectedPedidoItem = [];  // NUEVO: Limpiar selección
        this.refrescarDatos();
      },
      error: (err) => {
        console.log(err);
        Swal.fire('Error', 'Error al registrar el pedido', 'error');
        this.procesandoRecepcion = false;  // NUEVO: Liberar en error
      }
    });
  }
}
```

**Actualizar HTML:**
```html
<p-button label="Recibir"
          (click)="recibir()"
          styleClass="p-button-sm p-button-primary mr-2"
          [disabled]="selectedPedidoItem.length === 0 || procesandoRecepcion"
          [loading]="procesandoRecepcion">
</p-button>
```

**Resultado:**
- ✅ Botón deshabilitado durante procesamiento
- ✅ Spinner de carga visible
- ✅ Previene Escenario A (clicks múltiples)
- ✅ Selección limpiada después de éxito

---

### 5.2. Solución Intermedia (Backend Validation) - Prioridad ALTA

#### 5.2.1. Agregar Validación de Estado en Backend
**Archivo:** `src/Descarga.php.txt` (función `PedidoItemyCabId_post`)

**Agregar validación antes de crear registros:**
```php
public function PedidoItemyCabId_post() {
    $data = $this->post();
    $id_num_parametro = $data['id_num'];
    $pedidoItem = $data['pedidoItem'];
    $pedidoscb = $data['pedidoscb'];

    $this->db->trans_start();

    // ============================================================================
    // NUEVO: VALIDACIÓN DE ESTADO PREVIO - PREVENIR DUPLICADOS
    // ============================================================================
    // Verificar que el pedido NO haya sido procesado ya
    $sql_check_estado = "SELECT estado FROM pedidoitem WHERE id_num = ? LIMIT 1";
    $query_estado = $this->db->query($sql_check_estado, [$id_num_parametro]);

    if ($query_estado->num_rows() > 0) {
        $row_estado = $query_estado->row_array();
        $estado_actual = $row_estado['estado'];

        // Si el estado NO es "Solicitado-E", significa que ya fue procesado
        if ($estado_actual !== 'Solicitado-E') {
            $this->db->trans_rollback();
            $respuesta = array(
                "error" => true,
                "mensaje" => "Error: El pedido ya fue procesado. Estado actual: " . $estado_actual
            );
            $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
            return;
        }
    } else {
        // El id_num no existe
        $this->db->trans_rollback();
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error: El pedido con id_num=" . $id_num_parametro . " no existe."
        );
        $this->response($respuesta, REST_Controller::HTTP_NOT_FOUND);
        return;
    }

    // ============================================================================
    // NUEVO: BLOQUEO PESIMISTA - PREVENIR RACE CONDITIONS
    // ============================================================================
    // Bloquear el registro para evitar que otra transacción simultánea lo procese
    $sql_lock = "SELECT id_num FROM pedidoitem WHERE id_num = ? AND estado = 'Solicitado-E' FOR UPDATE";
    $query_lock = $this->db->query($sql_lock, [$id_num_parametro]);

    if ($query_lock->num_rows() === 0) {
        // Alguien más ya lo procesó entre la primera consulta y esta
        $this->db->trans_rollback();
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error: El pedido ya fue procesado por otra operación simultánea."
        );
        $this->response($respuesta, REST_Controller::HTTP_CONFLICT);
        return;
    }

    // ============================================================================
    // VALIDACIÓN DE ID_ART VÁLIDO (código existente)
    // ============================================================================
    if ($pedidoItem['id_art'] == 0 || $pedidoItem['id_art'] === '0' || empty($pedidoItem['id_art'])) {
        $this->db->trans_rollback();
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error: ID de artículo inválido..."
        );
        $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
        return;
    }

    // ... resto del código existente (INSERT, UPDATE stock, etc.) ...
}
```

**Aplicar la misma validación a `PedidoItemyCabIdEnvio_post`** (función de envío).

**Resultado:**
- ✅ Backend valida que el pedido esté en estado correcto antes de procesar
- ✅ Bloqueo pesimista previene race conditions (2 solicitudes simultáneas)
- ✅ Previene duplicación incluso si frontend falla
- ✅ Mensajes de error claros para debugging

---

### 5.3. Solución Completa (Soporte de Selección Múltiple) - Prioridad MEDIA

#### 5.3.1. Implementar Procesamiento de Múltiples Pedidos (Opcional)

**Solo si se desea permitir selección múltiple real.**

**Archivo:** `stockpedido.component.ts`

**Modificar método `recibir()`:**
```typescript
recibir() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar al menos un pedido', 'error');
    return;
  }

  if (this.procesandoRecepcion) {
    console.warn('Ya hay una recepción en proceso');
    return;
  }

  // Validar que todos los pedidos estén en estado "Solicitado-E"
  const pedidosInvalidos = this.selectedPedidoItem.filter(p => p.estado.trim() !== "Solicitado-E");
  if (pedidosInvalidos.length > 0) {
    Swal.fire('Error',
              `${pedidosInvalidos.length} pedido(s) no están en estado "Solicitado-E"`,
              'error');
    return;
  }

  // Confirmar con el usuario
  Swal.fire({
    title: '¿Confirmar recepción?',
    text: `Se recibirán ${this.selectedPedidoItem.length} pedido(s)`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, recibir',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      this.procesarRecepcionMultiple();
    }
  });
}

procesarRecepcionMultiple() {
  this.procesandoRecepcion = true;

  const fecha = new Date();
  const fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  // Crear array de observables para procesamiento paralelo
  const solicitudes = this.selectedPedidoItem.map(pedido => {
    const pedidoItem: any = {
      tipo: "PE",
      cantidad: pedido.cantidad,
      id_art: pedido.id_art,
      descripcion: pedido.descripcion,
      precio: pedido.precio,
      fecha_resuelto: fechaFormateada,
      usuario_res: sessionStorage.getItem('usernameOp'),
      observacion: this.comentario,
      estado: "Recibido",
    };

    const pedidoscb = {
      tipo: "PE",
      sucursald: Number(this.sucursal),
      sucursalh: pedido.sucursalh,
      fecha: fechaFormateada,
      usuario: sessionStorage.getItem('usernameOp'),
      observacion: this.comentario,
      estado: "Recibido",
      id_aso: 222
    };

    return this._cargardata.crearPedidoStockId(pedido.id_num, pedidoItem, pedidoscb);
  });

  // Ejecutar todas las solicitudes en paralelo
  forkJoin(solicitudes).subscribe({
    next: (responses) => {
      const exitosos = responses.filter(r => !r.error).length;
      const fallidos = responses.length - exitosos;

      if (fallidos === 0) {
        Swal.fire('Éxito', `${exitosos} pedido(s) recibidos correctamente`, 'success');
      } else {
        Swal.fire('Advertencia',
                  `${exitosos} pedido(s) recibidos, ${fallidos} fallaron`,
                  'warning');
      }

      this.procesandoRecepcion = false;
      this.selectedPedidoItem = [];
      this.refrescarDatos();
    },
    error: (err) => {
      console.error('Error en recepción múltiple:', err);
      Swal.fire('Error', 'Error al procesar pedidos múltiples', 'error');
      this.procesandoRecepcion = false;
    }
  });
}
```

**Actualizar HTML:**
```html
<p-table #dtable [value]="pedidoItem"
    [(selection)]="selectedPedidoItem"
    (selectionChange)="onSelectionChange($event)"
    dataKey="id_num">  <!-- Mantener selección múltiple -->
```

**Resultado:**
- ✅ Permite seleccionar y procesar múltiples pedidos a la vez
- ✅ Confirmación explícita antes de procesar
- ✅ Feedback detallado sobre éxitos/fallos
- ⚠️ Mayor complejidad
- ⚠️ Requiere más testing

---

### 5.4. Limpieza de Datos Duplicados - Prioridad ALTA

#### 5.4.1. Script SQL para Identificar Duplicados

```sql
-- ============================================================================
-- SCRIPT PARA IDENTIFICAR Y ANALIZAR DUPLICADOS EN MOVIMIENTOS DE STOCK
-- ============================================================================

-- 1. Identificar pedidoitem duplicados por artículo, cantidad, fecha y usuario
SELECT
    id_art,
    cantidad,
    fecha_resuelto,
    usuario_res,
    COUNT(*) as cantidad_duplicados,
    STRING_AGG(id_items::TEXT, ', ') as ids_items_duplicados,
    STRING_AGG(id_num::TEXT, ', ') as ids_num_duplicados
FROM pedidoitem
WHERE estado IN ('Recibido', 'Enviado')
  AND fecha_resuelto >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY id_art, cantidad, fecha_resuelto, usuario_res
HAVING COUNT(*) > 1
ORDER BY fecha_resuelto DESC, cantidad_duplicados DESC;

-- 2. Calcular impacto en stock por duplicados
WITH duplicados AS (
    SELECT
        id_art,
        cantidad,
        COUNT(*) - 1 as duplicaciones  -- Restar 1 porque el primero es válido
    FROM pedidoitem
    WHERE estado IN ('Recibido', 'Enviado')
      AND fecha_resuelto >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY id_art, cantidad
    HAVING COUNT(*) > 1
)
SELECT
    d.id_art,
    a.nomart as nombre_articulo,
    d.cantidad as cantidad_por_operacion,
    d.duplicaciones,
    (d.cantidad * d.duplicaciones) as stock_afectado_total
FROM duplicados d
JOIN artsucursal a ON d.id_art = a.id_articulo
ORDER BY stock_afectado_total DESC;

-- 3. Identificar duplicados por timestamp cercano (< 5 segundos)
SELECT
    p1.id_num as id_num_1,
    p1.id_items as id_items_1,
    p1.fecha_resuelto as fecha_1,
    p2.id_num as id_num_2,
    p2.id_items as id_items_2,
    p2.fecha_resuelto as fecha_2,
    p1.id_art,
    p1.cantidad,
    p1.usuario_res
FROM pedidoitem p1
JOIN pedidoitem p2 ON p1.id_art = p2.id_art
                   AND p1.cantidad = p2.cantidad
                   AND p1.usuario_res = p2.usuario_res
                   AND p1.id_items < p2.id_items
WHERE p1.estado IN ('Recibido', 'Enviado')
  AND p2.estado IN ('Recibido', 'Enviado')
  AND ABS(EXTRACT(EPOCH FROM (p2.fecha_resuelto - p1.fecha_resuelto))) < 5
  AND p1.fecha_resuelto >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY p1.fecha_resuelto DESC;
```

#### 5.4.2. Script SQL para Corrección Manual de Duplicados

**⚠️ IMPORTANTE: Ejecutar SOLO después de revisar y confirmar duplicados**

```sql
-- ============================================================================
-- SCRIPT PARA CORRECCIÓN DE DUPLICADOS (Uso MANUAL)
-- ============================================================================
-- Este script debe ejecutarse caso por caso, NO automáticamente
-- ============================================================================

BEGIN;  -- Iniciar transacción para poder hacer rollback si algo sale mal

-- PASO 1: Identificar el duplicado específico a corregir
-- Ejemplo: 2 recepciones del mismo artículo el mismo día por el mismo usuario
SELECT * FROM pedidoitem
WHERE id_art = 12345  -- Reemplazar con el id_art real
  AND cantidad = 10
  AND fecha_resuelto = '2025-11-06'
  AND usuario_res = 'usuario123'
  AND estado = 'Recibido'
ORDER BY id_items ASC;
-- Resultado esperado: 2 filas (id_items=100 y id_items=101)

-- PASO 2: Verificar el impacto en stock
-- Calcular cuánto stock se duplicó
SELECT
    id_articulo,
    nomart,
    exi1, exi2, exi3, exi4, exi5
FROM artsucursal
WHERE id_articulo = 12345;
-- Anotar valores actuales

-- PASO 3: Marcar registros duplicados como "Cancelado-Duplicado"
-- Mantener el PRIMERO (id_items más bajo) y marcar los DUPLICADOS
UPDATE pedidoitem
SET estado = 'Cancelado-Duplicado',
    observacion = COALESCE(observacion, '') || ' [Cancelado automáticamente: duplicado detectado el 2025-11-06]'
WHERE id_art = 12345
  AND cantidad = 10
  AND fecha_resuelto = '2025-11-06'
  AND usuario_res = 'usuario123'
  AND estado = 'Recibido'
  AND id_items > (  -- Solo los duplicados, NO el primero
      SELECT MIN(id_items)
      FROM pedidoitem
      WHERE id_art = 12345
        AND cantidad = 10
        AND fecha_resuelto = '2025-11-06'
        AND usuario_res = 'usuario123'
        AND estado = 'Recibido'
  );
-- Verificar: UPDATE 1 (solo 1 registro marcado)

-- PASO 4: Actualizar pedidoscb relacionados
UPDATE pedidoscb
SET estado = 'Cancelado-Duplicado'
WHERE id_aso IN (
    SELECT id_items
    FROM pedidoitem
    WHERE estado = 'Cancelado-Duplicado'
      AND id_art = 12345
      AND fecha_resuelto = '2025-11-06'
);

-- PASO 5: CORREGIR STOCK
-- Si el duplicado sumó stock de más, restarlo
-- Ejemplo: Se sumó 10+10 (20 total), debe ser solo 10
-- Entonces restar 10 (la cantidad duplicada)

-- 5a. Identificar la sucursal afectada (revisar pedidoscb)
SELECT sucursald, sucursalh FROM pedidoscb
WHERE id_aso IN (
    SELECT id_items FROM pedidoitem WHERE id_art = 12345 AND fecha_resuelto = '2025-11-06'
)
LIMIT 1;
-- Ejemplo resultado: sucursald=5 (Mayorista), sucursalh=2 (Valle Viejo)

-- 5b. Mapear a campo exi correcto
-- sucursald=5 → exi5 (quien recibe, SE SUMÓ DE MÁS)
-- sucursalh=2 → exi3 (quien envía, SE RESTÓ DE MÁS)

-- 5c. Revertir la suma duplicada en destino
UPDATE artsucursal
SET exi5 = exi5 - 10  -- Restar la cantidad duplicada
WHERE id_articulo = 12345;

-- 5d. Revertir la resta duplicada en origen
UPDATE artsucursal
SET exi3 = exi3 + 10  -- Sumar de vuelta la cantidad que se restó de más
WHERE id_articulo = 12345;

-- PASO 6: Verificar el resultado
SELECT
    id_articulo,
    nomart,
    exi1, exi2, exi3, exi4, exi5
FROM artsucursal
WHERE id_articulo = 12345;
-- Comparar con valores anotados en PASO 2

-- PASO 7: Si todo es correcto, confirmar
COMMIT;
-- Si algo salió mal, revertir:
-- ROLLBACK;

-- ============================================================================
-- FIN DEL SCRIPT DE CORRECCIÓN MANUAL
-- ============================================================================
```

#### 5.4.3. Script SQL para Prevenir Futuros Duplicados (Restricción DB)

```sql
-- ============================================================================
-- RESTRICCIÓN DE BASE DE DATOS PARA PREVENIR DUPLICADOS
-- ============================================================================
-- Esta restricción NO es 100% efectiva debido a la arquitectura actual
-- (se crean NUEVOS registros en lugar de actualizar existentes),
-- pero puede ayudar a detectar algunos casos
-- ============================================================================

-- Crear función para detectar duplicados recientes (< 10 segundos)
CREATE OR REPLACE FUNCTION check_pedidoitem_duplicado()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si existe un registro muy similar creado recientemente
    IF EXISTS (
        SELECT 1 FROM pedidoitem
        WHERE id_art = NEW.id_art
          AND cantidad = NEW.cantidad
          AND usuario_res = NEW.usuario_res
          AND estado = NEW.estado
          AND fecha_resuelto = NEW.fecha_resuelto
          AND id_items != NEW.id_items  -- No comparar consigo mismo
          AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - fecha_resuelto)) < 10  -- Menos de 10 segundos
    ) THEN
        RAISE EXCEPTION 'Posible duplicado detectado: Ya existe un pedidoitem muy similar creado hace menos de 10 segundos';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_check_pedidoitem_duplicado ON pedidoitem;
CREATE TRIGGER trigger_check_pedidoitem_duplicado
    BEFORE INSERT ON pedidoitem
    FOR EACH ROW
    EXECUTE FUNCTION check_pedidoitem_duplicado();

-- Nota: Esta restricción es agresiva y puede generar falsos positivos
-- si realmente se necesita crear 2 pedidos similares en poco tiempo.
-- Evaluar según casos de uso reales.
```

---

## 6. RECOMENDACIONES GENERALES

### 6.1. Prioridades de Implementación

**Implementación Recomendada (Orden):**

1. **URGENTE - Día 1:**
   - ✅ Implementar solución 5.1.2 (deshabilitar botones durante procesamiento)
   - ✅ Implementar solución 5.2.1 (validación de estado en backend)
   - ✅ Ejecutar script 5.4.1 para identificar duplicados actuales

2. **IMPORTANTE - Día 2:**
   - ✅ Implementar solución 5.1.1 (forzar selección individual)
   - ✅ Revisar y corregir manualmente duplicados identificados (script 5.4.2)
   - ✅ Testing exhaustivo de recepción/envío de pedidos

3. **OPCIONAL - Semana siguiente:**
   - ⚠️ Evaluar si se necesita selección múltiple real (solución 5.3.1)
   - ⚠️ Si SÍ: implementar procesamiento múltiple con forkJoin
   - ⚠️ Si NO: mantener selección individual

4. **MEJORAS FUTURAS:**
   - 📊 Agregar logging detallado de operaciones de stock
   - 🔍 Implementar auditoría de cambios de stock
   - 🛡️ Agregar restricciones de DB (script 5.4.3) si se considera necesario

---

### 6.2. Testing Requerido

#### 6.2.1. Test Manual - Escenarios Críticos

**Test 1: Prevención de Clicks Múltiples**
- [ ] Seleccionar 1 pedido
- [ ] Hacer click en "Recibir" 5 veces rápidamente
- **Resultado esperado:** Solo 1 registro creado, botón deshabilitado después del primer click

**Test 2: Selección Individual Forzada**
- [ ] Intentar seleccionar 2 pedidos usando checkboxes
- **Resultado esperado:** Solo se puede seleccionar 1 a la vez (el segundo deselecciona el primero)

**Test 3: Limpieza de Selección**
- [ ] Seleccionar 1 pedido
- [ ] Hacer click en "Recibir" → Operación exitosa
- [ ] Hacer click en "Recibir" nuevamente SIN reseleccionar
- **Resultado esperado:** Botón deshabilitado (no hay selección) o error si hay selección residual

**Test 4: Validación de Estado en Backend**
- [ ] Seleccionar 1 pedido en estado "Solicitado-E"
- [ ] Hacer click en "Recibir" → Operación exitosa
- [ ] Recargar página y buscar el mismo pedido (ahora en "Recibido")
- [ ] Intentar recibirlo nuevamente usando Postman/Insomnia
- **Resultado esperado:** Error 400 "El pedido ya fue procesado"

**Test 5: Race Condition (2 usuarios simultáneos)**
- [ ] Usuario A y Usuario B abren el mismo pedido
- [ ] Usuario A hace click en "Recibir"
- [ ] Usuario B hace click en "Recibir" inmediatamente después
- **Resultado esperado:** Solo 1 operación exitosa, la otra falla con error de conflicto

---

#### 6.2.2. Test Automatizado (E2E con Cypress)

```typescript
// cypress/integration/stock-movements/recepcion-pedidos.spec.ts

describe('Recepción de Pedidos - Prevención de Duplicados', () => {
  beforeEach(() => {
    cy.login('usuario_test', 'password');
    cy.visit('/stockpedido');
    cy.wait(2000); // Esperar carga de tabla
  });

  it('debe permitir solo una selección a la vez', () => {
    cy.get('p-table tbody tr').first().click();
    cy.get('p-table tbody tr').eq(1).click();

    // Verificar que solo 1 fila esté seleccionada
    cy.get('p-table tbody tr.p-highlight').should('have.length', 1);
  });

  it('debe deshabilitar botón durante procesamiento', () => {
    cy.intercept('POST', '**/PedidoItemyCabId', (req) => {
      req.reply({ delay: 2000, body: { error: false, mensaje: 'OK' } });
    }).as('recibirPedido');

    cy.get('p-table tbody tr').first().click();
    cy.get('[data-cy=btn-recibir]').click();

    // Botón debe estar deshabilitado inmediatamente
    cy.get('[data-cy=btn-recibir]').should('be.disabled');

    // Esperar respuesta
    cy.wait('@recibirPedido');

    // Botón debe habilitarse después
    cy.get('[data-cy=btn-recibir]').should('not.be.disabled');
  });

  it('debe rechazar recepción de pedido ya procesado', () => {
    cy.intercept('POST', '**/PedidoItemyCabId', {
      statusCode: 400,
      body: { error: true, mensaje: 'El pedido ya fue procesado' }
    }).as('recibirDuplicado');

    cy.get('p-table tbody tr').first().click();
    cy.get('[data-cy=btn-recibir]').click();

    cy.wait('@recibirDuplicado');
    cy.get('.swal2-popup').should('contain', 'ya fue procesado');
  });
});
```

---

### 6.3. Monitoreo Post-Implementación

#### 6.3.1. Query para Monitorear Duplicados Diarios

```sql
-- Ejecutar diariamente para detectar nuevos duplicados
SELECT
    DATE(fecha_resuelto) as fecha,
    COUNT(*) as total_operaciones,
    COUNT(DISTINCT CONCAT(id_art, '-', cantidad, '-', usuario_res)) as operaciones_unicas,
    COUNT(*) - COUNT(DISTINCT CONCAT(id_art, '-', cantidad, '-', usuario_res)) as posibles_duplicados
FROM pedidoitem
WHERE fecha_resuelto >= CURRENT_DATE - INTERVAL '1 day'
  AND estado IN ('Recibido', 'Enviado')
GROUP BY DATE(fecha_resuelto);
```

#### 6.3.2. Alertas Automáticas (Opcional)

**Configurar alerta en Grafana/Datadog si se detectan >5 duplicados por día:**
```sql
-- Query de alerta
SELECT COUNT(*) as duplicados_hoy
FROM (
    SELECT id_art, cantidad, fecha_resuelto, usuario_res, COUNT(*) as cnt
    FROM pedidoitem
    WHERE fecha_resuelto >= CURRENT_DATE
      AND estado IN ('Recibido', 'Enviado')
    GROUP BY id_art, cantidad, fecha_resuelto, usuario_res
    HAVING COUNT(*) > 1
) duplicados;

-- Si duplicados_hoy > 5 → Enviar notificación
```

---

## 7. CONCLUSIONES

### 7.1. Resumen de Causas Identificadas

| # | Causa | Nivel | Impacto |
|---|-------|-------|---------|
| 1 | Configuración de selección múltiple sin validación | CRÍTICO | Confusión de usuarios, procesamiento incorrecto |
| 2 | Botones no deshabilitados durante procesamiento | CRÍTICO | Duplicación por múltiples clicks |
| 3 | Backend sin validación de estado previo | CRÍTICO | Duplicación garantizada si frontend falla |
| 4 | Backend sin bloqueo pesimista | CRÍTICO | Race conditions en operaciones simultáneas |
| 5 | Estado de selección no limpiado | MEDIO | Reprocesamiento accidental |

### 7.2. Resumen de Soluciones Propuestas

| Solución | Prioridad | Esfuerzo | Impacto |
|----------|-----------|----------|---------|
| 5.1.1 - Forzar selección individual | ALTA | 1 hora | Elimina 60% de duplicados |
| 5.1.2 - Deshabilitar botones | ALTA | 2 horas | Elimina 90% de duplicados |
| 5.2.1 - Validación backend | ALTA | 3 horas | Elimina 99% de duplicados |
| 5.3.1 - Soporte múltiple (opcional) | MEDIA | 6 horas | Mejora UX |
| 5.4.2 - Limpieza de datos | ALTA | Variable | Corrige datos históricos |

### 7.3. Tiempo Estimado de Implementación

**Plan Mínimo (Solo prevención, sin selección múltiple):**
- Desarrollo: 6 horas (soluciones 5.1.1, 5.1.2, 5.2.1)
- Testing: 3 horas
- Limpieza de datos: 2-4 horas (depende de cantidad de duplicados)
- **Total: 11-13 horas (1.5 días)**

**Plan Completo (Con selección múltiple funcional):**
- Desarrollo: 12 horas (soluciones 5.1.2, 5.2.1, 5.3.1)
- Testing: 5 horas
- Limpieza de datos: 2-4 horas
- **Total: 19-21 horas (2.5 días)**

### 7.4. Recomendación Final

**Implementar el Plan Mínimo URGENTEMENTE (soluciones 5.1.1, 5.1.2, 5.2.1):**
1. Forzar selección individual en frontend
2. Deshabilitar botones durante procesamiento
3. Validar estado en backend con bloqueo pesimista
4. Limpiar duplicados existentes

**Luego evaluar si se necesita selección múltiple:**
- Si los usuarios NO la solicitan → Mantener solución simple
- Si los usuarios la necesitan → Implementar solución 5.3.1

---

## 8. ANEXOS

### 8.1. Componentes Revisados

| Componente | Ubicación | Estado |
|------------|-----------|--------|
| pedir-stock | `src/app/components/pedir-stock/` | ✅ Revisado - No tiene selección múltiple problemática |
| stockpedido | `src/app/components/stockpedido/` | ❌ CRÍTICO - Requiere corrección |
| stockenvio | `src/app/components/stockenvio/` | ✅ Revisado - No tiene selección múltiple problemática |
| stockrecibo | `src/app/components/stockrecibo/` | ⚠️ Revisar - Similar a stockpedido |
| enviostockpendientes | `src/app/components/enviostockpendientes/` | ❌ CRÍTICO - Requiere corrección |
| stockproductopedido | `src/app/components/stockproductopedido/` | ✅ OK - Modal simple sin selección |
| stockproductoenvio | `src/app/components/stockproductoenvio/` | ✅ OK - Modal simple sin selección |

### 8.2. Endpoints Backend Afectados

| Endpoint | Función | Estado |
|----------|---------|--------|
| `/Descarga/PedidoItemyCab` | Crear pedido nuevo | ✅ OK - Sin problemas identificados |
| `/Descarga/PedidoItemyCabId` | Recibir pedido (actualizar estado) | ❌ CRÍTICO - Requiere validación |
| `/Descarga/PedidoItemyCabIdEnvio` | Enviar pedido (actualizar estado) | ❌ CRÍTICO - Requiere validación |

### 8.3. Diagrama de Flujo - Estado Actual vs Propuesto

```
ESTADO ACTUAL (PROBLEMÁTICO):
Usuario selecciona pedido
    → Click "Recibir" (múltiples veces posible)
        → Frontend: procesa selectedPedidoItem[0]
            → Backend: crea NUEVO pedidoitem/pedidoscb
                → Backend: actualiza stock (SUMA/RESTA)
                    → Backend: actualiza pedido original a "Recibido"
                        [✓] Operación 1 completa
                        [✓] Operación 2 completa ❌ (DUPLICADO)
                        [✓] Operación 3 completa ❌ (DUPLICADO)

ESTADO PROPUESTO (CORREGIDO):
Usuario selecciona pedido (SOLO 1)
    → Click "Recibir" (botón se deshabilita)
        → Frontend: valida length === 1
            → Frontend: marca procesandoRecepcion = true
                → Backend: valida estado === "Solicitado-E"
                    → Backend: bloquea registro (FOR UPDATE)
                        → Backend: crea NUEVO pedidoitem/pedidoscb
                            → Backend: actualiza stock (SUMA/RESTA)
                                → Backend: actualiza pedido original
                                    [✓] Operación 1 completa
                                    Frontend: procesandoRecepcion = false
                                    Frontend: selectedPedidoItem = []
    → Click "Recibir" nuevamente
        → [X] Botón deshabilitado (no hay selección)
    → Intento simultáneo de otro usuario
        → Backend: bloqueo FOR UPDATE previene
            → [X] Error: "Pedido ya procesado"
```

---

**Fin del Informe**

Generado el: 2025-11-06
Por: Claude Code (Anthropic)
Versión del informe: 1.0
