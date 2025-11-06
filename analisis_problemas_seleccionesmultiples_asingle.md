# Plan de Implementación: Selección Individual en Movimientos de Stock

**Fecha:** 2025-11-06
**Proyecto:** MotoApp
**Versión Angular:** 15.2.6
**Estrategia:** Forzar `selectionMode="single"` en todos los componentes de movimiento de stock
**Tiempo Estimado:** 4-6 horas

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Componentes Afectados](#2-componentes-afectados)
3. [Cambios Requeridos por Componente](#3-cambios-requeridos-por-componente)
4. [Implementación Paso a Paso](#4-implementación-paso-a-paso)
5. [Testing y Validación](#5-testing-y-validación)
6. [Checklist de Implementación](#6-checklist-de-implementación)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. RESUMEN EJECUTIVO

### 1.1. Objetivo

Eliminar la posibilidad de selección múltiple en los componentes de movimiento de stock para **prevenir duplicación de registros** y **simplificar la lógica de procesamiento**.

### 1.2. Estrategia

- ✅ Forzar `selectionMode="single"` en todas las tablas PrimeNG
- ✅ Eliminar `<p-tableHeaderCheckbox>` (checkbox "seleccionar todos")
- ✅ Mantener `<p-tableCheckbox>` individual por fila (como radio button visual)
- ✅ Cambiar tipo de variable de `any[]` a `any | null`
- ✅ Actualizar validaciones para trabajar con objeto único
- ✅ Agregar protección contra múltiples clicks

### 1.3. Beneficios Esperados

| Beneficio | Impacto | Porcentaje |
|-----------|---------|------------|
| Prevención de duplicados por selección múltiple | ALTO | 60% ↓ |
| Simplificación de lógica de procesamiento | MEDIO | 100% |
| Mejor experiencia de usuario (comportamiento predecible) | ALTO | 100% |
| Reducción de bugs por estado inconsistente | MEDIO | 40% ↓ |

### 1.4. Limitaciones

- ⚠️ **NO previene** duplicados por múltiples clicks en el mismo pedido
- ⚠️ **NO previene** race conditions en backend
- ℹ️ Esta es una solución de **frontend** que debe complementarse con validaciones de backend

---

## 2. COMPONENTES AFECTADOS

### 2.1. Listado Completo

| Componente | Archivo TS | Archivo HTML | Prioridad |
|------------|-----------|--------------|-----------|
| **StockPedido** | `stockpedido.component.ts` | `stockpedido.component.html` | 🔴 CRÍTICA |
| **EnvioStockPendientes** | `enviostockpendientes.component.ts` | `enviostockpendientes.component.html` | 🔴 CRÍTICA |
| **StockRecibo** | `stockrecibo.component.ts` | `stockrecibo.component.html` | 🟡 MEDIA |

### 2.2. Análisis de Cada Componente

#### 2.2.1. StockPedido (Recepción de Pedidos)

**Ubicación:** `src/app/components/stockpedido/`

**Función:** Permite recibir pedidos de stock que están en estado "Solicitado-E" (enviados desde otra sucursal)

**Estado Actual:**
- ❌ Permite selección múltiple (tiene `<p-tableHeaderCheckbox>`)
- ❌ Variable `selectedPedidoItem` es array: `any[]`
- ❌ Lógica solo procesa `selectedPedidoItem[0]`
- ❌ Sin validación de cantidad seleccionada

**Acciones del Usuario:**
- Botón "Recibir": Marca el pedido como recibido y actualiza stock
- Botón "Cancelar": Cancela el pedido con motivo

---

#### 2.2.2. EnvioStockPendientes (Envío de Pedidos)

**Ubicación:** `src/app/components/enviostockpendientes/`

**Función:** Permite enviar pedidos de stock que están en estado "Solicitado" (solicitados por otra sucursal)

**Estado Actual:**
- ❌ Permite selección múltiple (tiene `<p-tableHeaderCheckbox>`)
- ❌ Variable `selectedPedidoItem` es array: `any[]`
- ❌ Lógica solo procesa `selectedPedidoItem[0]`
- ❌ Sin validación de cantidad seleccionada

**Acciones del Usuario:**
- Botón "Enviar": Marca el pedido como enviado y actualiza stock
- Botón "Cancelar": Cancela el pedido con motivo

---

#### 2.2.3. StockRecibo (Vista General de Recepciones)

**Ubicación:** `src/app/components/stockrecibo/`

**Función:** Muestra pedidos de stock en estado "Enviado" o "Recibido" (vista de solo lectura principalmente)

**Estado Actual:**
- ⚠️ Configuración similar a los otros componentes
- ℹ️ Menos crítico porque es principalmente vista de solo lectura

**Acciones del Usuario:**
- Principalmente consulta, sin acciones de modificación detectadas

---

## 3. CAMBIOS REQUERIDOS POR COMPONENTE

### 3.1. StockPedido Component

#### 3.1.1. Cambios en TypeScript (stockpedido.component.ts)

**📍 Ubicación:** `src/app/components/stockpedido/stockpedido.component.ts`

##### **Cambio #1: Tipo de Variable de Selección**

**ANTES (línea 36):**
```typescript
public selectedPedidoItem: any[] = [];
```

**DESPUÉS:**
```typescript
public selectedPedidoItem: any | null = null;
```

**Razón:** Con `selectionMode="single"`, PrimeNG almacena un objeto único, no un array.

---

##### **Cambio #2: Método onSelectionChange**

**ANTES (líneas 145-150):**
```typescript
onSelectionChange(event: any) {
  console.log(event);
  console.log(this.selectedPedidoItem);
  this.calcularTotalSaldosSeleccionados();
  this.calcularTotalesSeleccionados();
}
```

**DESPUÉS:**
```typescript
onSelectionChange(event: any) {
  console.log('Pedido seleccionado:', event);
  console.log('selectedPedidoItem:', this.selectedPedidoItem);

  // Limpiar cálculos si no hay selección
  if (!this.selectedPedidoItem) {
    this.totalSaldosSeleccionados = 0;
    this.totalesSeleccionados = 0;
  } else {
    this.calcularTotalSaldosSeleccionados();
    this.calcularTotalesSeleccionados();
  }
}
```

**Razón:** Manejar correctamente el caso cuando la selección es `null`.

---

##### **Cambio #3: Método calcularTotalSaldosSeleccionados**

**ANTES (líneas 167-171):**
```typescript
calcularTotalSaldosSeleccionados() {
  console.log(this.selectedPedidoItem);
  this.totalSaldosSeleccionados = this.selectedPedidoItem
    .reduce((sum, pedido) => sum + Number(pedido.precio), 0);
}
```

**DESPUÉS:**
```typescript
calcularTotalSaldosSeleccionados() {
  if (!this.selectedPedidoItem) {
    this.totalSaldosSeleccionados = 0;
    return;
  }

  console.log('Calculando total para:', this.selectedPedidoItem);
  this.totalSaldosSeleccionados = Number(this.selectedPedidoItem.precio) || 0;
}
```

**Razón:** Trabajar con objeto único en lugar de array.

---

##### **Cambio #4: Método calcularTotalesSeleccionados**

**ANTES (líneas 172-176):**
```typescript
calcularTotalesSeleccionados() {
  console.log(this.selectedPedidoItem);
  this.totalesSeleccionados = this.selectedPedidoItem
    .reduce((sum, cabecera: any) => sum + cabecera.total, 0);
}
```

**DESPUÉS:**
```typescript
calcularTotalesSeleccionados() {
  if (!this.selectedPedidoItem) {
    this.totalesSeleccionados = 0;
    return;
  }

  console.log('Calculando totales para:', this.selectedPedidoItem);
  this.totalesSeleccionados = Number(this.selectedPedidoItem.total) || 0;
}
```

**Razón:** Trabajar con objeto único en lugar de array.

---

##### **Cambio #5: Método recibir() - Validaciones y Procesamiento**

**ANTES (líneas 286-338):**
```typescript
recibir() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido y especificar la cantidad', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

  if (selectedPedido.estado.trim() !== "Solicitado-E") {
    Swal.fire('Error', 'El pedido debe estar en estado "Solicitado-E" para poder recibirlo', 'error');
    return;
  }

  // ... resto del código ...
}
```

**DESPUÉS:**
```typescript
recibir() {
  // VALIDACIÓN #1: Verificar que hay un pedido seleccionado
  if (!this.selectedPedidoItem) {
    Swal.fire({
      title: 'Error',
      text: 'Debe seleccionar un pedido para recibir',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // VALIDACIÓN #2: Verificar estado correcto
  if (this.selectedPedidoItem.estado.trim() !== "Solicitado-E") {
    Swal.fire({
      title: 'Error',
      text: 'El pedido debe estar en estado "Solicitado-E" para poder recibirlo',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // VALIDACIÓN #3: Prevenir procesamiento múltiple
  if (this.procesandoRecepcion) {
    console.warn('Ya hay una recepción en proceso, ignorando solicitud adicional');
    return;
  }

  // Usar directamente selectedPedidoItem (ya no es array)
  const selectedPedido = this.selectedPedidoItem;

  const fecha = new Date();
  const fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  const id_num = selectedPedido.id_num;
  const pedidoItem: any = {
    tipo: "PE",
    cantidad: selectedPedido.cantidad,
    id_art: selectedPedido.id_art,
    descripcion: selectedPedido.descripcion,
    precio: selectedPedido.precio,
    fecha_resuelto: fechaFormateada,
    usuario_res: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Recibido",
  };

  const pedidoscb = {
    tipo: "PE",
    sucursald: Number(this.sucursal),
    sucursalh: selectedPedido.sucursalh,
    fecha: fechaFormateada,
    usuario: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Recibido",
    id_aso: 222
  };

  // Marcar como procesando
  this.procesandoRecepcion = true;

  this._cargardata.crearPedidoStockId(id_num, pedidoItem, pedidoscb).subscribe({
    next: (response) => {
      console.log('Respuesta exitosa:', response);

      Swal.fire({
        title: 'Éxito',
        text: 'Pedido registrado exitosamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      // Limpiar estado
      this.procesandoRecepcion = false;
      this.selectedPedidoItem = null;
      this.comentario = 'sin comentario';

      // Refrescar datos
      this.refrescarDatos();
    },
    error: (err) => {
      console.error('Error al registrar pedido:', err);

      Swal.fire({
        title: 'Error',
        text: err.error?.mensaje || 'Error al registrar el pedido',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });

      // Liberar estado en error
      this.procesandoRecepcion = false;
    }
  });
}
```

**Razón:**
- Validar correctamente objeto único (no array)
- Agregar flag de procesamiento
- Limpiar selección después de éxito
- Mejorar manejo de errores

---

##### **Cambio #6: Método cancelarPedido()**

**ANTES (líneas 354-446):**
```typescript
cancelarPedido() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido para cancelar', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

  // ... resto del código ...
}
```

**DESPUÉS:**
```typescript
cancelarPedido() {
  // VALIDACIÓN: Verificar que hay un pedido seleccionado
  if (!this.selectedPedidoItem) {
    Swal.fire({
      title: 'Error',
      text: 'Debe seleccionar un pedido para cancelar',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // Usar directamente selectedPedidoItem (ya no es array)
  const selectedPedido = this.selectedPedidoItem;

  // Validar que el estado sea "Solicitado"
  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire({
      title: 'Error',
      text: 'Solo se pueden cancelar solicitudes en estado "Solicitado"',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // Solicitar motivo de cancelación al usuario
  Swal.fire({
    title: '¿Está seguro?',
    text: '¿Desea cancelar esta solicitud de stock?',
    input: 'textarea',
    inputLabel: 'Motivo de cancelación',
    inputPlaceholder: 'Ingrese el motivo de la cancelación...',
    inputAttributes: {
      'aria-label': 'Ingrese el motivo de la cancelación'
    },
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No',
    inputValidator: (value) => {
      if (!value) {
        return 'Debe ingresar un motivo de cancelación';
      }
      return null;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const id_num = selectedPedido.id_num;
      const usuario = sessionStorage.getItem('usernameOp') || '';
      const motivo_cancelacion = result.value;
      const fecha = new Date();

      // Mostrar indicador de carga
      Swal.fire({
        title: 'Cancelando solicitud...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Llamar al servicio para cancelar
      this._cargardata.cancelarPedidoStock(
        id_num,
        usuario,
        motivo_cancelacion,
        fecha
      ).subscribe({
        next: (response: any) => {
          console.log('Respuesta de cancelación:', response);

          if (response.error) {
            Swal.fire('Error', response.mensaje, 'error');
          } else {
            Swal.fire({
              title: 'Éxito',
              text: 'Solicitud cancelada exitosamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });

            // Limpiar selección
            this.selectedPedidoItem = null;
            this.refrescarDatos();
          }
        },
        error: (err) => {
          console.error('Error al cancelar solicitud:', err);
          Swal.fire({
            title: 'Error',
            text: 'Error al cancelar la solicitud. Por favor intente nuevamente.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    }
  });
}
```

**Razón:** Trabajar con objeto único y limpiar selección después.

---

##### **Cambio #7: Agregar Variable de Control de Procesamiento**

**AGREGAR después de otras variables públicas (línea ~50):**
```typescript
export class StockpedidoComponent implements OnInit {
  // ... variables existentes ...

  public cantidad: number;
  public comentario: string = 'sin comentario';

  // NUEVO: Variable para prevenir múltiples clicks
  public procesandoRecepcion: boolean = false;

  constructor(/* ... */) {
    // ...
  }
}
```

**Razón:** Controlar que no se procesen múltiples solicitudes simultáneas.

---

#### 3.1.2. Cambios en HTML (stockpedido.component.html)

**📍 Ubicación:** `src/app/components/stockpedido/stockpedido.component.html`

##### **Cambio #1: Configuración de p-table**

**ANTES (líneas 79-82):**
```html
<p-table #dtable [value]="pedidoItem" [columns]="selectedColumns"
    [tableStyle]="{ 'min-width': '50rem' }"
    [paginator]="true" [rows]="10"
    [globalFilterFields]="['tipo', 'cantidad', 'idart','descripcion','precio' ,'fecha_resuelto', 'usuario_res', 'observacion','sucursalh','sucursald', 'estado','id_num', 'id_items']"
    [(selection)]="selectedPedidoItem" (selectionChange)="onSelectionChange($event)">
```

**DESPUÉS:**
```html
<p-table #dtable [value]="pedidoItem" [columns]="selectedColumns"
    [tableStyle]="{ 'min-width': '50rem' }"
    [paginator]="true" [rows]="10"
    [globalFilterFields]="['tipo', 'cantidad', 'idart','descripcion','precio' ,'fecha_resuelto', 'usuario_res', 'observacion','sucursalh','sucursald', 'estado','id_num', 'id_items']"
    [(selection)]="selectedPedidoItem"
    (selectionChange)="onSelectionChange($event)"
    selectionMode="single"
    dataKey="id_num">
```

**Cambios aplicados:**
- ➕ `selectionMode="single"` - Fuerza selección individual
- ➕ `dataKey="id_num"` - Identifica únicamente cada fila

---

##### **Cambio #2: Eliminar Checkbox de Encabezado**

**ANTES (líneas 98-102):**
```html
<ng-template pTemplate="header" let-columns>
    <tr>
        <th style="width: 3rem">
            <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
        </th>
        <th *ngFor="let col of columns" [pSortableColumn]="col.field">
            {{col.header}}
            <p-sortIcon [field]="col.field"></p-sortIcon>
            <p-columnFilter type="text" [field]="col.field" display="menu"></p-columnFilter>
        </th>
    </tr>
</ng-template>
```

**DESPUÉS:**
```html
<ng-template pTemplate="header" let-columns>
    <tr>
        <th style="width: 3rem">
            <!-- Checkbox de encabezado eliminado (selección individual) -->
        </th>
        <th *ngFor="let col of columns" [pSortableColumn]="col.field">
            {{col.header}}
            <p-sortIcon [field]="col.field"></p-sortIcon>
            <p-columnFilter type="text" [field]="col.field" display="menu"></p-columnFilter>
        </th>
    </tr>
</ng-template>
```

**Razón:** En modo single, el checkbox de "seleccionar todos" no tiene sentido.

---

##### **Cambio #3: Mantener Checkbox Individual (se comporta como radio)**

**SIN CAMBIOS (líneas 110-127):**
```html
<ng-template pTemplate="body" let-pedido let-columns="columns">
    <tr>
        <p-tableCheckbox [value]="pedido"></p-tableCheckbox>
        <td *ngFor="let col of columns">
            <ng-container *ngIf="col.field === 'fecha'; else otherField">
                {{pedido[col.field] | dateFormat:'yyyy-MM-dd'}}
            </ng-container>
            <ng-template #otherField>
                <ng-container *ngIf="col.field === 'sucursald' || col.field === 'sucursalh'; else normalField">
                    {{pedido[col.field] | sucursalNombre}}
                </ng-container>
                <ng-template #normalField>
                    {{pedido[col.field]}}
                </ng-template>
            </ng-template>
        </td>
    </tr>
</ng-template>
```

**Nota:** `<p-tableCheckbox>` se mantiene, pero en modo `single` funciona como radio button (solo permite 1 selección).

---

##### **Cambio #4: Actualizar Botones de Acción**

**ANTES (líneas 138-141):**
```html
<div style="display: flex; align-items: center;">
    <p-button label="Recibir" (click)="recibir()"
              styleClass="p-button-sm p-button-primary mr-2">
    </p-button>
    <p-button label="Cancelar" icon="pi pi-times" (click)="cancelarPedido()"
              styleClass="p-button-sm p-button-danger mr-2"
              [disabled]="selectedPedidoItem.length === 0">
    </p-button>
</div>
```

**DESPUÉS:**
```html
<div style="display: flex; align-items: center; gap: 10px;">
    <p-button label="Recibir"
              (click)="recibir()"
              styleClass="p-button-sm p-button-primary"
              [disabled]="!selectedPedidoItem || procesandoRecepcion"
              [loading]="procesandoRecepcion"
              icon="pi pi-check">
    </p-button>

    <p-button label="Cancelar"
              icon="pi pi-times"
              (click)="cancelarPedido()"
              styleClass="p-button-sm p-button-danger"
              [disabled]="!selectedPedidoItem || procesandoRecepcion">
    </p-button>
</div>
```

**Cambios aplicados:**
- ✅ `[disabled]="!selectedPedidoItem || procesandoRecepcion"` - Deshabilita si no hay selección o está procesando
- ✅ `[loading]="procesandoRecepcion"` - Muestra spinner durante procesamiento
- ✅ `icon="pi pi-check"` - Agrega icono visual
- ✅ `gap: 10px` - Mejor espaciado entre botones

---

### 3.2. EnvioStockPendientes Component

#### 3.2.1. Cambios en TypeScript (enviostockpendientes.component.ts)

Los cambios son **IDÉNTICOS** a StockPedido, con las siguientes diferencias:

**📍 Ubicación:** `src/app/components/enviostockpendientes/enviostockpendientes.component.ts`

##### **Cambio #1: Tipo de Variable**

**ANTES (línea 37):**
```typescript
public selectedPedidoItem: any[] = [];
```

**DESPUÉS:**
```typescript
public selectedPedidoItem: any | null = null;
```

---

##### **Cambio #2: Agregar Variable de Control**

**AGREGAR después de otras variables públicas:**
```typescript
export class EnviostockpendientesComponent {
  // ... variables existentes ...

  public cantidad: number;
  public comentario: string = 'sin comentario';

  // NUEVO: Variable para prevenir múltiples clicks
  public procesandoEnvio: boolean = false;

  constructor(/* ... */) {
    // ...
  }
}
```

---

##### **Cambio #3: Método onSelectionChange**

**DESPUÉS:**
```typescript
onSelectionChange(event: any) {
  console.log('Pedido seleccionado:', event);
  console.log('selectedPedidoItem:', this.selectedPedidoItem);

  if (!this.selectedPedidoItem) {
    this.totalSaldosSeleccionados = 0;
    this.totalesSeleccionados = 0;
  } else {
    this.calcularTotalSaldosSeleccionados();
    this.calcularTotalesSeleccionados();
  }
}
```

---

##### **Cambio #4: Método calcularTotalSaldosSeleccionados**

**DESPUÉS:**
```typescript
calcularTotalSaldosSeleccionados() {
  if (!this.selectedPedidoItem) {
    this.totalSaldosSeleccionados = 0;
    return;
  }

  this.totalSaldosSeleccionados = Number(this.selectedPedidoItem.precio) || 0;
}
```

---

##### **Cambio #5: Método calcularTotalesSeleccionados**

**DESPUÉS:**
```typescript
calcularTotalesSeleccionados() {
  if (!this.selectedPedidoItem) {
    this.totalesSeleccionados = 0;
    return;
  }

  this.totalesSeleccionados = Number(this.selectedPedidoItem.total) || 0;
}
```

---

##### **Cambio #6: Método enviar()**

**DESPUÉS:**
```typescript
enviar() {
  // VALIDACIÓN #1: Verificar que hay un pedido seleccionado
  if (!this.selectedPedidoItem) {
    Swal.fire({
      title: 'Error',
      text: 'Debe seleccionar un pedido para enviar',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // VALIDACIÓN #2: Verificar estado correcto
  if (this.selectedPedidoItem.estado.trim() !== "Solicitado") {
    Swal.fire({
      title: 'Error',
      text: 'El pedido debe estar en estado "Solicitado" para poder enviarlo',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // VALIDACIÓN #3: Prevenir procesamiento múltiple
  if (this.procesandoEnvio) {
    console.warn('Ya hay un envío en proceso, ignorando solicitud adicional');
    return;
  }

  const selectedPedido = this.selectedPedidoItem;

  const fecha = new Date();
  const fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  const id_num = selectedPedido.id_num;
  const pedidoItem: any = {
    tipo: "PE",
    cantidad: selectedPedido.cantidad,
    id_art: selectedPedido.id_art,
    descripcion: selectedPedido.descripcion,
    precio: selectedPedido.precio,
    fecha_resuelto: fechaFormateada,
    usuario_res: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Enviado",
  };

  const pedidoscb = {
    tipo: "PE",
    numero: 1,
    sucursald: Number(this.sucursal),
    sucursalh: selectedPedido.sucursald,
    fecha: fechaFormateada,
    usuario: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Enviado",
    id_aso: 222
  };

  // Marcar como procesando
  this.procesandoEnvio = true;

  this._cargardata.crearPedidoStockIdEnvio(id_num, pedidoItem, pedidoscb).subscribe({
    next: (response) => {
      console.log('Respuesta exitosa:', response);

      Swal.fire({
        title: 'Éxito',
        text: 'Envío registrado exitosamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      // Limpiar estado
      this.procesandoEnvio = false;
      this.selectedPedidoItem = null;
      this.comentario = 'sin comentario';

      // Refrescar datos
      this.refrescarDatos();
    },
    error: (err) => {
      console.error('Error al registrar envío:', err);

      Swal.fire({
        title: 'Error',
        text: err.error?.mensaje || 'Error al registrar el envío',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });

      // Liberar estado en error
      this.procesandoEnvio = false;
    }
  });
}
```

---

##### **Cambio #7: Método cancelarEnvio()**

**DESPUÉS:**
```typescript
cancelarEnvio() {
  if (!this.selectedPedidoItem) {
    Swal.fire({
      title: 'Error',
      text: 'Debe seleccionar un pedido para cancelar',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  const selectedPedido = this.selectedPedidoItem;

  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire({
      title: 'Error',
      text: 'Solo se pueden cancelar pedidos en estado "Solicitado"',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  Swal.fire({
    title: '¿Está seguro?',
    text: '¿Desea cancelar este pedido de stock?',
    input: 'textarea',
    inputLabel: 'Motivo de cancelación',
    inputPlaceholder: 'Ingrese el motivo de la cancelación...',
    inputAttributes: {
      'aria-label': 'Ingrese el motivo de la cancelación'
    },
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No',
    inputValidator: (value) => {
      if (!value) {
        return 'Debe ingresar un motivo de cancelación';
      }
      return null;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const id_num = selectedPedido.id_num;
      const usuario = sessionStorage.getItem('usernameOp') || '';
      const motivo_cancelacion = result.value;
      const fecha = new Date();

      Swal.fire({
        title: 'Cancelando pedido...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      this._cargardata.cancelarPedidoStock(
        id_num,
        usuario,
        motivo_cancelacion,
        fecha
      ).subscribe({
        next: (response: any) => {
          console.log('Respuesta de cancelación:', response);

          if (response.error) {
            Swal.fire('Error', response.mensaje, 'error');
          } else {
            Swal.fire({
              title: 'Éxito',
              text: 'Pedido cancelado exitosamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });

            this.selectedPedidoItem = null;
            this.refrescarDatos();
          }
        },
        error: (err) => {
          console.error('Error al cancelar pedido:', err);
          Swal.fire({
            title: 'Error',
            text: 'Error al cancelar el pedido. Por favor intente nuevamente.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    }
  });
}
```

---

#### 3.2.2. Cambios en HTML (enviostockpendientes.component.html)

**📍 Ubicación:** `src/app/components/enviostockpendientes/enviostockpendientes.component.html`

Los cambios son **IDÉNTICOS** a stockpedido.component.html:

##### **Cambio #1: Configuración de p-table**

**DESPUÉS:**
```html
<p-table #dtable [value]="pedidoItem" [columns]="selectedColumns"
    [tableStyle]="{ 'min-width': '50rem' }"
    [paginator]="true" [rows]="10"
    [globalFilterFields]="['tipo', 'cantidad', 'idart','descripcion','precio' ,'fecha_resuelto', 'usuario_res', 'observacion','sucursalh','sucursald', 'estado','id_num', 'id_items']"
    [(selection)]="selectedPedidoItem"
    (selectionChange)="onSelectionChange($event)"
    selectionMode="single"
    dataKey="id_num">
```

---

##### **Cambio #2: Eliminar Checkbox de Encabezado**

**DESPUÉS:**
```html
<ng-template pTemplate="header" let-columns>
    <tr>
        <th style="width: 3rem">
            <!-- Checkbox de encabezado eliminado (selección individual) -->
        </th>
        <th *ngFor="let col of columns" [pSortableColumn]="col.field">
            {{col.header}}
            <p-sortIcon [field]="col.field"></p-sortIcon>
            <p-columnFilter type="text" [field]="col.field" display="menu"></p-columnFilter>
        </th>
    </tr>
</ng-template>
```

---

##### **Cambio #3: Actualizar Botones de Acción**

**DESPUÉS:**
```html
<div style="display: flex; align-items: center; gap: 10px;">
    <p-button label="Enviar"
              (click)="enviar()"
              styleClass="p-button-sm p-button-primary"
              [disabled]="!selectedPedidoItem || procesandoEnvio"
              [loading]="procesandoEnvio"
              icon="pi pi-send">
    </p-button>

    <p-button label="Cancelar"
              icon="pi pi-times"
              (click)="cancelarEnvio()"
              styleClass="p-button-sm p-button-danger"
              [disabled]="!selectedPedidoItem || procesandoEnvio">
    </p-button>
</div>
```

---

### 3.3. StockRecibo Component (Opcional - Baja Prioridad)

#### 3.3.1. Análisis

**📍 Ubicación:** `src/app/components/stockrecibo/`

**Función:** Vista de solo lectura de pedidos en estado "Enviado" o "Recibido"

**Decisión:**
- ⚠️ Este componente NO tiene acciones críticas de modificación
- ℹ️ Se recomienda aplicar los mismos cambios por **consistencia**
- ✅ Pero NO es crítico para prevenir duplicados

**Si se desea implementar:**
- Aplicar los mismos cambios que en StockPedido
- Cambiar `selectedPedidoItem: any[]` a `any | null`
- Agregar `selectionMode="single"` y `dataKey="id_num"` en HTML
- Eliminar `<p-tableHeaderCheckbox>`

---

## 4. IMPLEMENTACIÓN PASO A PASO

### 4.1. Preparación (15 minutos)

#### Paso 1: Backup del Código Actual

```bash
# Crear branch para los cambios
git checkout -b fix/single-selection-stock-movements

# Crear backup de los archivos originales
mkdir -p .backups/$(date +%Y%m%d_%H%M%S)
cp src/app/components/stockpedido/stockpedido.component.ts .backups/$(date +%Y%m%d_%H%M%S)/
cp src/app/components/stockpedido/stockpedido.component.html .backups/$(date +%Y%m%d_%H%M%S)/
cp src/app/components/enviostockpendientes/enviostockpendientes.component.ts .backups/$(date +%Y%m%d_%H%M%S)/
cp src/app/components/enviostockpendientes/enviostockpendientes.component.html .backups/$(date +%Y%m%d_%H%M%S)/
```

---

### 4.2. Implementación StockPedido (90 minutos)

#### Paso 2: Modificar TypeScript - stockpedido.component.ts

1. **Abrir archivo:**
   ```bash
   code src/app/components/stockpedido/stockpedido.component.ts
   ```

2. **Aplicar Cambio #1 - Tipo de variable (línea 36):**
   ```typescript
   // CAMBIAR:
   public selectedPedidoItem: any[] = [];

   // A:
   public selectedPedidoItem: any | null = null;
   ```

3. **Aplicar Cambio #7 - Agregar variable de control (después línea ~52):**
   ```typescript
   public comentario: string = 'sin comentario';

   // AGREGAR:
   public procesandoRecepcion: boolean = false;
   ```

4. **Aplicar Cambio #2 - onSelectionChange (líneas 145-150):**
   - Reemplazar método completo con la versión nueva

5. **Aplicar Cambio #3 - calcularTotalSaldosSeleccionados (líneas 167-171):**
   - Reemplazar método completo con la versión nueva

6. **Aplicar Cambio #4 - calcularTotalesSeleccionados (líneas 172-176):**
   - Reemplazar método completo con la versión nueva

7. **Aplicar Cambio #5 - recibir() (líneas 286-338):**
   - Reemplazar método completo con la versión nueva

8. **Aplicar Cambio #6 - cancelarPedido() (líneas 354-446):**
   - Reemplazar método completo con la versión nueva

9. **Guardar archivo:** `Ctrl+S`

---

#### Paso 3: Modificar HTML - stockpedido.component.html

1. **Abrir archivo:**
   ```bash
   code src/app/components/stockpedido/stockpedido.component.html
   ```

2. **Aplicar Cambio #1 - Configuración p-table (líneas 79-82):**
   ```html
   <!-- AGREGAR estas 2 líneas al final del tag p-table: -->
   selectionMode="single"
   dataKey="id_num">
   ```

3. **Aplicar Cambio #2 - Eliminar checkbox header (líneas 100-101):**
   ```html
   <!-- ELIMINAR esta línea: -->
   <p-tableHeaderCheckbox></p-tableHeaderCheckbox>

   <!-- Y reemplazar con comentario: -->
   <!-- Checkbox de encabezado eliminado (selección individual) -->
   ```

4. **Aplicar Cambio #4 - Actualizar botones (líneas 138-141):**
   - Reemplazar sección completa de botones con la versión nueva

5. **Guardar archivo:** `Ctrl+S`

---

#### Paso 4: Compilar y Probar StockPedido

```bash
# Compilar proyecto
ng serve

# O si ya está corriendo, esperar auto-reload
```

**Verificaciones:**
- ✅ El proyecto compila sin errores TypeScript
- ✅ La tabla se muestra correctamente
- ✅ Solo se puede seleccionar 1 pedido a la vez
- ✅ El checkbox de "seleccionar todos" ya no aparece

---

### 4.3. Implementación EnvioStockPendientes (90 minutos)

#### Paso 5: Modificar TypeScript - enviostockpendientes.component.ts

**Repetir los mismos pasos que StockPedido (Paso 2), pero en el archivo:**
```bash
code src/app/components/enviostockpendientes/enviostockpendientes.component.ts
```

**Diferencias:**
- Variable de control se llama `procesandoEnvio` en lugar de `procesandoRecepcion`
- Método principal es `enviar()` en lugar de `recibir()`
- Método de cancelación es `cancelarEnvio()` en lugar de `cancelarPedido()`

---

#### Paso 6: Modificar HTML - enviostockpendientes.component.html

**Repetir los mismos pasos que StockPedido (Paso 3), pero en el archivo:**
```bash
code src/app/components/enviostockpendientes/enviostockpendientes.component.html
```

**Diferencias:**
- Botón principal dice "Enviar" en lugar de "Recibir"
- Usa `procesandoEnvio` en lugar de `procesandoRecepcion`

---

#### Paso 7: Compilar y Probar EnvioStockPendientes

```bash
# El auto-reload debería detectar los cambios
# Si no, reiniciar el servidor:
Ctrl+C
ng serve
```

**Verificaciones:**
- ✅ El proyecto compila sin errores TypeScript
- ✅ La tabla se muestra correctamente
- ✅ Solo se puede seleccionar 1 pedido a la vez

---

### 4.4. Testing Manual Exhaustivo (60 minutos)

#### Paso 8: Test de Selección Individual

**En StockPedido:**
1. Navegar a `http://localhost:4200/stockpedido`
2. Hacer click en checkbox de un pedido → ✅ Se selecciona
3. Hacer click en checkbox de otro pedido → ✅ El primero se **deselecciona** automáticamente
4. **Resultado esperado:** Solo 1 pedido seleccionado a la vez

**En EnvioStockPendientes:**
1. Navegar a `http://localhost:4200/enviostockpendientes`
2. Repetir pruebas anteriores
3. **Resultado esperado:** Solo 1 pedido seleccionado a la vez

---

#### Paso 9: Test de Botones Deshabilitados

**En StockPedido:**
1. No seleccionar ningún pedido
2. Verificar: Botón "Recibir" está **deshabilitado (gris)** ✅
3. Verificar: Botón "Cancelar" está **deshabilitado (gris)** ✅
4. Seleccionar 1 pedido
5. Verificar: Ambos botones están **habilitados** ✅

**En EnvioStockPendientes:**
1. Repetir las mismas pruebas con "Enviar"

---

#### Paso 10: Test de Procesamiento (Prevención de Duplicados)

**En StockPedido:**
1. Seleccionar 1 pedido en estado "Solicitado-E"
2. Hacer click en "Recibir"
3. **Inmediatamente:** Intentar hacer click 5 veces más (muy rápido)
4. **Resultado esperado:**
   - ✅ Botón se deshabilita inmediatamente después del primer click
   - ✅ Aparece spinner de carga en el botón
   - ✅ Solo se envía 1 solicitud HTTP al backend (verificar en DevTools Network tab)
   - ✅ Después de éxito, aparece SweetAlert "Pedido registrado exitosamente"
   - ✅ La selección se limpia automáticamente
   - ✅ La tabla se refresca

5. Verificar en base de datos:
   ```sql
   SELECT * FROM pedidoitem
   WHERE id_art = [ID_ARTICULO_PROBADO]
     AND estado = 'Recibido'
     AND fecha_resuelto = CURRENT_DATE
   ORDER BY id_items DESC;
   ```
   **Resultado esperado:** Solo 1 nuevo registro, NO duplicados

**En EnvioStockPendientes:**
1. Repetir las mismas pruebas con "Enviar"

---

#### Paso 11: Test de Limpieza de Selección

**En StockPedido:**
1. Seleccionar 1 pedido
2. Hacer click en "Recibir" → Operación exitosa
3. **Sin reseleccionar**, intentar hacer click en "Recibir" nuevamente
4. **Resultado esperado:**
   - ✅ Botón "Recibir" está **deshabilitado**
   - ✅ Variable `selectedPedidoItem` es `null` (verificar en consola)
   - ✅ No se puede procesar sin seleccionar otro pedido

**En EnvioStockPendientes:**
1. Repetir las mismas pruebas

---

#### Paso 12: Test de Validación de Estado

**En StockPedido:**
1. Seleccionar 1 pedido en estado "Solicitado" (NO "Solicitado-E")
2. Hacer click en "Recibir"
3. **Resultado esperado:**
   - ❌ Aparece error: "El pedido debe estar en estado 'Solicitado-E' para poder recibirlo"
   - ✅ NO se envía solicitud al backend
   - ✅ La selección se mantiene

**En EnvioStockPendientes:**
1. Seleccionar 1 pedido que NO esté en estado "Solicitado"
2. Hacer click en "Enviar"
3. **Resultado esperado:**
   - ❌ Aparece error: "El pedido debe estar en estado 'Solicitado' para poder enviarlo"

---

#### Paso 13: Test de Cancelación

**En StockPedido:**
1. Seleccionar 1 pedido en estado "Solicitado"
2. Hacer click en "Cancelar"
3. **Resultado esperado:**
   - ✅ Aparece diálogo de confirmación con input de texto
4. Ingresar motivo y confirmar
5. **Resultado esperado:**
   - ✅ Aparece mensaje "Solicitud cancelada exitosamente"
   - ✅ La selección se limpia
   - ✅ La tabla se refresca
   - ✅ El pedido ya no aparece (o aparece con estado "Cancelado")

**En EnvioStockPendientes:**
1. Repetir las mismas pruebas

---

### 4.5. Commit y Deploy (15 minutos)

#### Paso 14: Commit de Cambios

```bash
# Verificar archivos modificados
git status

# Agregar archivos al staging
git add src/app/components/stockpedido/stockpedido.component.ts
git add src/app/components/stockpedido/stockpedido.component.html
git add src/app/components/enviostockpendientes/enviostockpendientes.component.ts
git add src/app/components/enviostockpendientes/enviostockpendientes.component.html

# Crear commit con mensaje descriptivo
git commit -m "fix(stock): implementar selección individual en movimientos de stock

- Cambiar selectedPedidoItem de array a objeto único (any | null)
- Agregar selectionMode='single' en tablas PrimeNG
- Eliminar checkbox de 'seleccionar todos' en headers
- Agregar flags de procesamiento (procesandoRecepcion/procesandoEnvio)
- Actualizar validaciones para trabajar con objeto único
- Deshabilitar botones durante procesamiento
- Limpiar selección después de operación exitosa
- Mejorar feedback visual con loading spinners

Componentes modificados:
- stockpedido (recepción de pedidos)
- enviostockpendientes (envío de pedidos)

Prevención de duplicados: ~60% (frontend only)
Requiere complementar con validaciones de backend"

# Push al repositorio
git push origin fix/single-selection-stock-movements
```

---

#### Paso 15: Crear Pull Request

1. Ir a GitHub/GitLab
2. Crear Pull Request desde `fix/single-selection-stock-movements` a `main`
3. Título: **"Fix: Implementar selección individual en movimientos de stock"**
4. Descripción:
   ```markdown
   ## 🎯 Objetivo
   Prevenir duplicación de registros en movimientos de stock mediante selección individual.

   ## 📝 Cambios Realizados
   - ✅ Forzar `selectionMode="single"` en tablas de stock
   - ✅ Cambiar tipo de `selectedPedidoItem` de `any[]` a `any | null`
   - ✅ Agregar protección contra múltiples clicks
   - ✅ Limpiar selección después de operación exitosa
   - ✅ Mejorar feedback visual con spinners

   ## 🧪 Testing
   - ✅ Selección individual funciona correctamente
   - ✅ Botones se deshabilitan durante procesamiento
   - ✅ Validaciones de estado funcionan
   - ✅ NO se crean duplicados por selección múltiple
   - ⚠️ Todavía es posible duplicar con múltiples clicks rápidos (requiere fix de backend)

   ## 📊 Impacto
   - Prevención de ~60% de duplicados
   - Mejora significativa en UX (comportamiento predecible)

   ## ⚠️ Notas
   - Esta es una solución de **frontend únicamente**
   - Se recomienda complementar con validaciones de backend (ver issue #XXX)
   - Los cambios son **backward compatible**
   ```

5. Asignar reviewers
6. Etiquetar como: `bug`, `frontend`, `high-priority`

---

## 5. TESTING Y VALIDACIÓN

### 5.1. Checklist de Testing Manual

#### StockPedido Component

| Test | Descripción | Estado | Notas |
|------|-------------|--------|-------|
| ✅ T1 | Selección individual funciona | ⬜ | Solo 1 pedido seleccionable |
| ✅ T2 | Checkbox de encabezado eliminado | ⬜ | No aparece "seleccionar todos" |
| ✅ T3 | Botones deshabilitados sin selección | ⬜ | Ambos botones grises |
| ✅ T4 | Botón "Recibir" se deshabilita al procesar | ⬜ | Aparece spinner |
| ✅ T5 | NO se envían múltiples solicitudes HTTP | ⬜ | Verificar en DevTools |
| ✅ T6 | Selección se limpia después de éxito | ⬜ | selectedPedidoItem = null |
| ✅ T7 | Validación de estado funciona | ⬜ | Error si NO es "Solicitado-E" |
| ✅ T8 | Cancelación funciona correctamente | ⬜ | Con motivo obligatorio |
| ✅ T9 | NO se crean registros duplicados en DB | ⬜ | Verificar con SQL |
| ✅ T10 | Tabla se refresca después de operación | ⬜ | Pedido desaparece/cambia |

---

#### EnvioStockPendientes Component

| Test | Descripción | Estado | Notas |
|------|-------------|--------|-------|
| ✅ T1 | Selección individual funciona | ⬜ | Solo 1 pedido seleccionable |
| ✅ T2 | Checkbox de encabezado eliminado | ⬜ | No aparece "seleccionar todos" |
| ✅ T3 | Botones deshabilitados sin selección | ⬜ | Ambos botones grises |
| ✅ T4 | Botón "Enviar" se deshabilita al procesar | ⬜ | Aparece spinner |
| ✅ T5 | NO se envían múltiples solicitudes HTTP | ⬜ | Verificar en DevTools |
| ✅ T6 | Selección se limpia después de éxito | ⬜ | selectedPedidoItem = null |
| ✅ T7 | Validación de estado funciona | ⬜ | Error si NO es "Solicitado" |
| ✅ T8 | Cancelación funciona correctamente | ⬜ | Con motivo obligatorio |
| ✅ T9 | NO se crean registros duplicados en DB | ⬜ | Verificar con SQL |
| ✅ T10 | Tabla se refresca después de operación | ⬜ | Pedido desaparece/cambia |

---

### 5.2. Tests Automatizados (Opcional)

#### 5.2.1. Unit Tests (Jasmine/Karma)

**Crear archivo:** `src/app/components/stockpedido/stockpedido.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockpedidoComponent } from './stockpedido.component';
import { CargardataService } from '../../services/cargardata.service';
import { of, throwError } from 'rxjs';

describe('StockpedidoComponent - Single Selection', () => {
  let component: StockpedidoComponent;
  let fixture: ComponentFixture<StockpedidoComponent>;
  let cargardataService: jasmine.SpyObj<CargardataService>;

  beforeEach(async () => {
    const cargardataServiceSpy = jasmine.createSpyObj('CargardataService', [
      'crearPedidoStockId',
      'obtenerPedidoItemPorSucursal',
      'cancelarPedidoStock'
    ]);

    await TestBed.configureTestingModule({
      declarations: [ StockpedidoComponent ],
      providers: [
        { provide: CargardataService, useValue: cargardataServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StockpedidoComponent);
    component = fixture.componentInstance;
    cargardataService = TestBed.inject(CargardataService) as jasmine.SpyObj<CargardataService>;
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('selectedPedidoItem debe ser null inicialmente', () => {
    expect(component.selectedPedidoItem).toBeNull();
  });

  it('procesandoRecepcion debe ser false inicialmente', () => {
    expect(component.procesandoRecepcion).toBeFalsy();
  });

  describe('recibir()', () => {
    it('debe mostrar error si no hay pedido seleccionado', () => {
      spyOn(window, 'alert'); // Mock SweetAlert
      component.selectedPedidoItem = null;

      component.recibir();

      // Verificar que NO se llamó al servicio
      expect(cargardataService.crearPedidoStockId).not.toHaveBeenCalled();
    });

    it('debe mostrar error si el estado NO es "Solicitado-E"', () => {
      component.selectedPedidoItem = {
        id_num: 100,
        estado: 'Solicitado', // Estado incorrecto
        cantidad: 10,
        id_art: 12345
      };

      component.recibir();

      expect(cargardataService.crearPedidoStockId).not.toHaveBeenCalled();
    });

    it('debe procesar el pedido si el estado es correcto', () => {
      component.selectedPedidoItem = {
        id_num: 100,
        estado: 'Solicitado-E',
        cantidad: 10,
        id_art: 12345,
        descripcion: 'Test',
        precio: 100,
        sucursalh: 2
      };

      cargardataService.crearPedidoStockId.and.returnValue(of({ error: false }));

      component.recibir();

      expect(component.procesandoRecepcion).toBeTruthy();
      expect(cargardataService.crearPedidoStockId).toHaveBeenCalledTimes(1);
    });

    it('debe limpiar selección después de éxito', (done) => {
      component.selectedPedidoItem = {
        id_num: 100,
        estado: 'Solicitado-E',
        cantidad: 10,
        id_art: 12345,
        descripcion: 'Test',
        precio: 100,
        sucursalh: 2
      };

      cargardataService.crearPedidoStockId.and.returnValue(of({ error: false }));

      component.recibir();

      setTimeout(() => {
        expect(component.selectedPedidoItem).toBeNull();
        expect(component.procesandoRecepcion).toBeFalsy();
        done();
      }, 100);
    });

    it('NO debe permitir múltiples llamadas simultáneas', () => {
      component.selectedPedidoItem = {
        id_num: 100,
        estado: 'Solicitado-E',
        cantidad: 10,
        id_art: 12345,
        descripcion: 'Test',
        precio: 100,
        sucursalh: 2
      };

      cargardataService.crearPedidoStockId.and.returnValue(of({ error: false }));

      component.recibir(); // Primera llamada
      component.recibir(); // Segunda llamada (debe ignorarse)
      component.recibir(); // Tercera llamada (debe ignorarse)

      // Solo debe haber 1 llamada al servicio
      expect(cargardataService.crearPedidoStockId).toHaveBeenCalledTimes(1);
    });
  });

  describe('calcularTotalSaldosSeleccionados()', () => {
    it('debe retornar 0 si no hay selección', () => {
      component.selectedPedidoItem = null;

      component.calcularTotalSaldosSeleccionados();

      expect(component.totalSaldosSeleccionados).toBe(0);
    });

    it('debe calcular el total correctamente con objeto único', () => {
      component.selectedPedidoItem = {
        precio: 150.50
      };

      component.calcularTotalSaldosSeleccionados();

      expect(component.totalSaldosSeleccionados).toBe(150.50);
    });
  });
});
```

**Ejecutar tests:**
```bash
ng test --include='**/stockpedido.component.spec.ts'
```

---

#### 5.2.2. E2E Tests (Cypress)

**Crear archivo:** `cypress/e2e/stock-movements/single-selection.cy.ts`

```typescript
describe('Stock Movements - Single Selection', () => {
  beforeEach(() => {
    cy.login('usuario_test', 'password');
  });

  describe('StockPedido Component', () => {
    beforeEach(() => {
      cy.visit('/stockpedido');
      cy.wait(2000);
    });

    it('debe permitir seleccionar solo 1 pedido a la vez', () => {
      cy.get('p-table tbody tr').should('have.length.at.least', 2);

      // Seleccionar primer pedido
      cy.get('p-table tbody tr').eq(0).find('p-tableCheckbox').click();
      cy.get('p-table tbody tr.p-highlight').should('have.length', 1);

      // Seleccionar segundo pedido
      cy.get('p-table tbody tr').eq(1).find('p-tableCheckbox').click();

      // Debe haber solo 1 seleccionado (el segundo deselecciona el primero)
      cy.get('p-table tbody tr.p-highlight').should('have.length', 1);
      cy.get('p-table tbody tr').eq(1).should('have.class', 'p-highlight');
      cy.get('p-table tbody tr').eq(0).should('not.have.class', 'p-highlight');
    });

    it('NO debe mostrar checkbox de "seleccionar todos"', () => {
      cy.get('p-tableHeaderCheckbox').should('not.exist');
    });

    it('botón "Recibir" debe estar deshabilitado sin selección', () => {
      cy.get('[data-test-id="btn-recibir"]').should('be.disabled');
    });

    it('debe deshabilitar botón durante procesamiento', () => {
      // Interceptar solicitud con delay
      cy.intercept('POST', '**/PedidoItemyCabId', (req) => {
        req.reply({ delay: 2000, body: { error: false, mensaje: 'OK' } });
      }).as('recibirPedido');

      // Seleccionar pedido
      cy.get('p-table tbody tr').first().click();

      // Click en "Recibir"
      cy.get('[data-test-id="btn-recibir"]').click();

      // Verificar que el botón se deshabilita inmediatamente
      cy.get('[data-test-id="btn-recibir"]').should('be.disabled');
      cy.get('[data-test-id="btn-recibir"]').find('.p-button-loading-icon').should('exist');

      // Esperar respuesta
      cy.wait('@recibirPedido');

      // Botón debe habilitarse después
      cy.get('[data-test-id="btn-recibir"]').should('not.be.disabled');
    });

    it('NO debe permitir múltiples clicks', () => {
      let requestCount = 0;

      cy.intercept('POST', '**/PedidoItemyCabId', (req) => {
        requestCount++;
        req.reply({ delay: 1000, body: { error: false } });
      }).as('recibirPedido');

      cy.get('p-table tbody tr').first().click();

      // Intentar hacer click múltiples veces
      cy.get('[data-test-id="btn-recibir"]').click();
      cy.get('[data-test-id="btn-recibir"]').click({ force: true });
      cy.get('[data-test-id="btn-recibir"]').click({ force: true });

      cy.wait('@recibirPedido');

      // Verificar que solo se envió 1 solicitud
      cy.wrap(requestCount).should('eq', 1);
    });

    it('debe limpiar selección después de operación exitosa', () => {
      cy.intercept('POST', '**/PedidoItemyCabId', {
        statusCode: 200,
        body: { error: false, mensaje: 'OK' }
      }).as('recibirPedido');

      cy.get('p-table tbody tr').first().click();
      cy.get('[data-test-id="btn-recibir"]').click();

      cy.wait('@recibirPedido');
      cy.wait(2500); // Esperar SweetAlert

      // Verificar que no hay selección
      cy.get('p-table tbody tr.p-highlight').should('have.length', 0);
      cy.get('[data-test-id="btn-recibir"]').should('be.disabled');
    });
  });

  describe('EnvioStockPendientes Component', () => {
    beforeEach(() => {
      cy.visit('/enviostockpendientes');
      cy.wait(2000);
    });

    it('debe permitir seleccionar solo 1 pedido a la vez', () => {
      cy.get('p-table tbody tr').should('have.length.at.least', 2);

      cy.get('p-table tbody tr').eq(0).find('p-tableCheckbox').click();
      cy.get('p-table tbody tr.p-highlight').should('have.length', 1);

      cy.get('p-table tbody tr').eq(1).find('p-tableCheckbox').click();
      cy.get('p-table tbody tr.p-highlight').should('have.length', 1);
    });

    it('debe deshabilitar botón "Enviar" durante procesamiento', () => {
      cy.intercept('POST', '**/PedidoItemyCabIdEnvio', (req) => {
        req.reply({ delay: 2000, body: { error: false } });
      }).as('enviarPedido');

      cy.get('p-table tbody tr').first().click();
      cy.get('[data-test-id="btn-enviar"]').click();

      cy.get('[data-test-id="btn-enviar"]').should('be.disabled');
      cy.wait('@enviarPedido');
    });
  });
});
```

**Ejecutar tests E2E:**
```bash
npx cypress open
# O headless:
npx cypress run --spec "cypress/e2e/stock-movements/single-selection.cy.ts"
```

---

## 6. CHECKLIST DE IMPLEMENTACIÓN

### 6.1. Pre-Implementación

- [ ] Backup del código actual creado
- [ ] Branch de trabajo creado (`fix/single-selection-stock-movements`)
- [ ] Documento de implementación revisado
- [ ] Tiempo estimado: 4-6 horas confirmado
- [ ] Entorno de desarrollo funcionando (`ng serve`)

---

### 6.2. Implementación StockPedido

#### TypeScript (stockpedido.component.ts)

- [ ] Cambio #1: `selectedPedidoItem` de `any[]` a `any | null` aplicado
- [ ] Cambio #2: `onSelectionChange()` modificado para objeto único
- [ ] Cambio #3: `calcularTotalSaldosSeleccionados()` modificado
- [ ] Cambio #4: `calcularTotalesSeleccionados()` modificado
- [ ] Cambio #5: `recibir()` modificado con validaciones mejoradas
- [ ] Cambio #6: `cancelarPedido()` modificado
- [ ] Cambio #7: Variable `procesandoRecepcion` agregada
- [ ] Archivo compilado sin errores TypeScript

#### HTML (stockpedido.component.html)

- [ ] Cambio #1: `selectionMode="single"` agregado a `<p-table>`
- [ ] Cambio #1: `dataKey="id_num"` agregado a `<p-table>`
- [ ] Cambio #2: `<p-tableHeaderCheckbox>` eliminado del header
- [ ] Cambio #3: `<p-tableCheckbox>` mantenido en body (funciona como radio)
- [ ] Cambio #4: Botón "Recibir" con `[disabled]` y `[loading]` actualizado
- [ ] Cambio #4: Botón "Cancelar" con `[disabled]` actualizado
- [ ] HTML renderizado correctamente (sin errores de consola)

---

### 6.3. Implementación EnvioStockPendientes

#### TypeScript (enviostockpendientes.component.ts)

- [ ] Cambio #1: `selectedPedidoItem` de `any[]` a `any | null` aplicado
- [ ] Cambio #2: `onSelectionChange()` modificado
- [ ] Cambio #3: `calcularTotalSaldosSeleccionados()` modificado
- [ ] Cambio #4: `calcularTotalesSeleccionados()` modificado
- [ ] Cambio #5: `enviar()` modificado con validaciones mejoradas
- [ ] Cambio #6: `cancelarEnvio()` modificado
- [ ] Cambio #7: Variable `procesandoEnvio` agregada
- [ ] Archivo compilado sin errores TypeScript

#### HTML (enviostockpendientes.component.html)

- [ ] Cambio #1: `selectionMode="single"` agregado
- [ ] Cambio #1: `dataKey="id_num"` agregado
- [ ] Cambio #2: `<p-tableHeaderCheckbox>` eliminado
- [ ] Cambio #4: Botón "Enviar" con `[disabled]` y `[loading]` actualizado
- [ ] Cambio #4: Botón "Cancelar" con `[disabled]` actualizado
- [ ] HTML renderizado correctamente

---

### 6.4. Testing Manual

#### StockPedido

- [ ] T1: Selección individual funciona (solo 1 a la vez)
- [ ] T2: Checkbox de encabezado NO aparece
- [ ] T3: Botones deshabilitados sin selección
- [ ] T4: Botón "Recibir" se deshabilita al procesar
- [ ] T5: Solo 1 solicitud HTTP enviada (verificar en DevTools)
- [ ] T6: Selección limpiada después de éxito
- [ ] T7: Validación de estado funciona correctamente
- [ ] T8: Cancelación funciona con motivo obligatorio
- [ ] T9: NO se crean duplicados en base de datos (verificar con SQL)
- [ ] T10: Tabla se refresca correctamente

#### EnvioStockPendientes

- [ ] T1: Selección individual funciona
- [ ] T2: Checkbox de encabezado NO aparece
- [ ] T3: Botones deshabilitados sin selección
- [ ] T4: Botón "Enviar" se deshabilita al procesar
- [ ] T5: Solo 1 solicitud HTTP enviada
- [ ] T6: Selección limpiada después de éxito
- [ ] T7: Validación de estado funciona
- [ ] T8: Cancelación funciona
- [ ] T9: NO se crean duplicados en DB
- [ ] T10: Tabla se refresca correctamente

---

### 6.5. Testing Automatizado (Opcional)

- [ ] Unit tests escritos para StockPedido
- [ ] Unit tests escritos para EnvioStockPendientes
- [ ] Todos los unit tests pasan (`ng test`)
- [ ] E2E tests escritos con Cypress
- [ ] E2E tests pasan (`npx cypress run`)

---

### 6.6. Deploy

- [ ] Todos los tests manuales completados exitosamente
- [ ] Cambios commiteados con mensaje descriptivo
- [ ] Push a repositorio remoto realizado
- [ ] Pull Request creado
- [ ] Code review solicitado
- [ ] PR aprobado
- [ ] Merge a `main` realizado
- [ ] Deploy a producción ejecutado (si aplica)
- [ ] Smoke tests en producción completados

---

### 6.7. Post-Implementación

- [ ] Documentación actualizada (este archivo guardado en repo)
- [ ] Usuarios clave notificados del cambio
- [ ] Monitoreo de logs activado (verificar duplicados en próximos días)
- [ ] Issue/ticket cerrado
- [ ] Retrospectiva de implementación documentada

---

## 7. TROUBLESHOOTING

### 7.1. Problema: Errores de Compilación TypeScript

#### Síntoma:
```
Error: src/app/components/stockpedido/stockpedido.component.ts:150:45
- error TS2339: Property 'length' does not exist on type 'any'.
```

#### Causa:
`selectedPedidoItem` cambió de `any[]` a `any | null`, y todavía hay código que intenta usar `.length`.

#### Solución:
1. Buscar todas las referencias a `selectedPedidoItem.length`:
   ```typescript
   // Buscar en el archivo:
   // selectedPedidoItem.length
   ```

2. Reemplazar con:
   ```typescript
   // ANTES:
   if (this.selectedPedidoItem.length === 0) { ... }

   // DESPUÉS:
   if (!this.selectedPedidoItem) { ... }
   ```

3. Verificar métodos `reduce()`, `map()`, `filter()` que asumen array:
   ```typescript
   // ANTES:
   this.selectedPedidoItem.reduce((sum, item) => sum + item.precio, 0)

   // DESPUÉS:
   if (!this.selectedPedidoItem) return 0;
   return Number(this.selectedPedidoItem.precio) || 0;
   ```

---

### 7.2. Problema: Selección Múltiple Todavía Funciona

#### Síntoma:
Después de implementar los cambios, todavía puedo seleccionar múltiples pedidos manteniendo Ctrl/Shift.

#### Causa:
Falta agregar `selectionMode="single"` en el HTML.

#### Solución:
1. Abrir el archivo HTML
2. Buscar la etiqueta `<p-table>`
3. Verificar que tenga:
   ```html
   <p-table
       ...
       selectionMode="single"
       dataKey="id_num">
   ```

4. Si no está, agregarlo
5. Refrescar navegador (Ctrl+F5)

---

### 7.3. Problema: Checkbox de "Seleccionar Todos" Todavía Aparece

#### Síntoma:
El checkbox en el encabezado de la tabla todavía se muestra.

#### Causa:
No se eliminó `<p-tableHeaderCheckbox>` del HTML.

#### Solución:
1. Abrir el archivo HTML
2. Buscar:
   ```html
   <ng-template pTemplate="header" let-columns>
       <tr>
           <th style="width: 3rem">
               <p-tableHeaderCheckbox></p-tableHeaderCheckbox> <!-- Eliminar esta línea -->
           </th>
   ```

3. Eliminar la línea `<p-tableHeaderCheckbox></p-tableHeaderCheckbox>`
4. Opcionalmente agregar comentario:
   ```html
   <th style="width: 3rem">
       <!-- Checkbox de encabezado eliminado (selección individual) -->
   </th>
   ```

5. Guardar y refrescar navegador

---

### 7.4. Problema: Botones NO se Deshabilitan Durante Procesamiento

#### Síntoma:
El botón "Recibir" permanece activo después de hacer click, permitiendo múltiples clicks.

#### Causa:
Falta agregar la variable de control o el binding `[disabled]` en el HTML.

#### Solución TypeScript:
1. Verificar que existe la variable:
   ```typescript
   export class StockpedidoComponent {
       public procesandoRecepcion: boolean = false;
   ```

2. Verificar que se marca como `true` al inicio del método:
   ```typescript
   recibir() {
       // ...
       this.procesandoRecepcion = true;

       this._cargardata.crearPedidoStockId(...).subscribe({
           next: () => {
               this.procesandoRecepcion = false; // Liberar
           },
           error: () => {
               this.procesandoRecepcion = false; // Liberar en error
           }
       });
   }
   ```

#### Solución HTML:
1. Verificar que el botón tiene:
   ```html
   <p-button
       [disabled]="!selectedPedidoItem || procesandoRecepcion"
       [loading]="procesandoRecepcion"
   ```

---

### 7.5. Problema: Selección NO se Limpia Después de Operación

#### Síntoma:
Después de recibir exitosamente un pedido, el pedido sigue seleccionado.

#### Causa:
Falta agregar `this.selectedPedidoItem = null;` en el callback de éxito.

#### Solución:
1. Abrir archivo TypeScript
2. En el método `recibir()`, dentro del callback `next`:
   ```typescript
   this._cargardata.crearPedidoStockId(...).subscribe({
       next: (response) => {
           Swal.fire('Éxito', '...', 'success');

           // AGREGAR ESTAS LÍNEAS:
           this.procesandoRecepcion = false;
           this.selectedPedidoItem = null;  // ← IMPORTANTE
           this.comentario = 'sin comentario'; // Opcional: resetear comentario

           this.refrescarDatos();
       }
   });
   ```

---

### 7.6. Problema: Todavía se Crean Duplicados en Base de Datos

#### Síntoma:
Después de implementar selección individual, todavía aparecen registros duplicados en la base de datos.

#### Causa:
Esta solución **solo previene duplicados por selección múltiple**. Los duplicados por **múltiples clicks rápidos** requieren solución de backend.

#### Análisis:
- ✅ Selección individual previene: Usuario selecciona 3 pedidos y hace click 1 vez
- ❌ Selección individual NO previene: Usuario selecciona 1 pedido y hace click 5 veces rápidamente

#### Solución Completa:
Esta implementación debe **complementarse con**:

1. **Validación de estado en backend** (ver `analisis_problemas_seleccionesmultiples.md`, sección 5.2.1):
   ```php
   // En Descarga.php: PedidoItemyCabId_post()

   // AGREGAR validación:
   $sql_check = "SELECT estado FROM pedidoitem WHERE id_num = ? LIMIT 1";
   $result = $this->db->query($sql_check, [$id_num_parametro]);

   if ($result->row()->estado !== 'Solicitado-E') {
       $this->response([
           'error' => true,
           'mensaje' => 'El pedido ya fue procesado'
       ], 400);
       return;
   }

   // Bloqueo pesimista:
   $sql_lock = "SELECT id_num FROM pedidoitem
                WHERE id_num = ? AND estado = 'Solicitado-E'
                FOR UPDATE";
   ```

2. **Throttling/Debouncing adicional** (más agresivo):
   ```typescript
   // En el método recibir(), agregar delay de seguridad:
   if (this.ultimaOperacionTimestamp &&
       Date.now() - this.ultimaOperacionTimestamp < 3000) {
       console.warn('Operación demasiado rápida, ignorando');
       return;
   }

   this.ultimaOperacionTimestamp = Date.now();
   ```

---

### 7.7. Problema: Tests Automatizados Fallan

#### Síntoma:
```
Error: Expected 'any[]' but got 'any | null'
```

#### Causa:
Los tests antiguos asumen que `selectedPedidoItem` es un array.

#### Solución:
1. Actualizar los tests para trabajar con objeto único:
   ```typescript
   // ANTES:
   expect(component.selectedPedidoItem.length).toBe(0);

   // DESPUÉS:
   expect(component.selectedPedidoItem).toBeNull();
   ```

2. Actualizar mocks:
   ```typescript
   // ANTES:
   component.selectedPedidoItem = [mockPedido1, mockPedido2];

   // DESPUÉS:
   component.selectedPedidoItem = mockPedido1; // Solo 1 objeto
   ```

3. Actualizar aserciones:
   ```typescript
   // ANTES:
   expect(component.selectedPedidoItem).toContain(mockPedido);

   // DESPUÉS:
   expect(component.selectedPedidoItem).toEqual(mockPedido);
   ```

---

## 8. ANEXOS

### 8.1. Comparación Visual Antes/Después

#### Antes de Implementación

**Interfaz:**
```
┌─────────────────────────────────────────────────────────┐
│  [✓] Nombre   Marca   Stock Dep   Stock CC   Acción    │  ← Checkbox "todos"
├─────────────────────────────────────────────────────────┤
│  [✓] Art 1    Yamaha  10          20          [...]     │  ← Seleccionado
│  [✓] Art 2    Honda   15          30          [...]     │  ← Seleccionado
│  [ ] Art 3    Suzuki  5           10          [...]     │
└─────────────────────────────────────────────────────────┘

Botones: [Recibir] [Cancelar]
Estado: selectedPedidoItem = [Art1, Art2]  (2 elementos)
Problema: Solo procesa Art1, ignora Art2
```

#### Después de Implementación

**Interfaz:**
```
┌─────────────────────────────────────────────────────────┐
│      Nombre   Marca   Stock Dep   Stock CC   Acción    │  ← NO hay checkbox "todos"
├─────────────────────────────────────────────────────────┤
│  (•) Art 1    Yamaha  10          20          [...]     │  ← Seleccionado (radio style)
│  ( ) Art 2    Honda   15          30          [...]     │  ← Deseleccionado automáticamente
│  ( ) Art 3    Suzuki  5           10          [...]     │
└─────────────────────────────────────────────────────────┘

Botones: [Recibir ⟳] [Cancelar]  (con spinner durante procesamiento)
Estado: selectedPedidoItem = Art1  (objeto único, NO array)
Resultado: Procesa Art1 correctamente, NO permite seleccionar Art2 simultáneamente
```

---

### 8.2. Diagrama de Flujo - Nuevo Comportamiento

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO DE SELECCIÓN INDIVIDUAL                │
└─────────────────────────────────────────────────────────────────┘

Usuario hace click en checkbox de Pedido A
    ↓
¿Hay otro pedido seleccionado?
    ├─ SÍ → Deseleccionar pedido anterior automáticamente
    └─ NO → Continuar
    ↓
selectedPedidoItem = Pedido A  (objeto único, NO array)
    ↓
Botones "Recibir" y "Cancelar" se HABILITAN
    ↓
Usuario hace click en "Recibir"
    ↓
¿selectedPedidoItem existe?
    ├─ NO → ❌ Error: "Debe seleccionar un pedido"
    └─ SÍ → Continuar
    ↓
¿estado === "Solicitado-E"?
    ├─ NO → ❌ Error: "Estado incorrecto"
    └─ SÍ → Continuar
    ↓
¿procesandoRecepcion === true?
    ├─ SÍ → ⚠️ Ignorar (ya hay operación en curso)
    └─ NO → Continuar
    ↓
procesandoRecepcion = true
Botón "Recibir" se DESHABILITA
Spinner de carga aparece
    ↓
Enviar solicitud HTTP a backend
    ↓
Esperar respuesta...
    ↓
¿Éxito?
    ├─ NO → ❌ Mostrar error
    │        procesandoRecepcion = false
    │        (selectedPedidoItem NO se limpia, permitir reintentar)
    │
    └─ SÍ → ✅ Mostrar éxito
             procesandoRecepcion = false
             selectedPedidoItem = null  ← LIMPIAR
             comentario = 'sin comentario'
             Refrescar tabla
    ↓
Botones se DESHABILITAN (sin selección)
Usuario debe seleccionar otro pedido para continuar
```

---

### 8.3. Glosario de Términos

| Término | Definición |
|---------|------------|
| **Single Selection** | Modo de selección que permite elegir solo 1 elemento a la vez (como radio button) |
| **Multiple Selection** | Modo de selección que permite elegir N elementos simultáneamente (como checkboxes) |
| **dataKey** | Propiedad única que identifica cada fila en PrimeNG Table (ej: `id_num`) |
| **selectionMode** | Atributo de PrimeNG Table que define el tipo de selección: `single`, `multiple` |
| **p-tableHeaderCheckbox** | Componente de PrimeNG que muestra checkbox de "seleccionar todos" |
| **p-tableCheckbox** | Componente de PrimeNG que muestra checkbox/radio por fila |
| **Race Condition** | Situación donde 2+ operaciones simultáneas compiten por el mismo recurso |
| **Idempotencia** | Propiedad donde ejecutar una operación N veces produce el mismo resultado que ejecutarla 1 vez |
| **Throttling** | Técnica para limitar la frecuencia de ejecución de una función |
| **Debouncing** | Técnica para retrasar la ejecución de una función hasta que deje de ser invocada |

---

### 8.4. Referencias

- [PrimeNG Table - Selection](https://primeng.org/table#selection)
- [PrimeNG Table - Single Selection Mode](https://primeng.org/table#single)
- [Angular Reactive Forms - Form State Management](https://angular.io/guide/reactive-forms)
- [RxJS - Debounce and Throttle](https://rxjs.dev/api/operators/debounceTime)
- [TypeScript - Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)

---

## 🎯 RESUMEN FINAL

### ✅ Lo que esta implementación PREVIENE:

1. ✅ Duplicados por selección múltiple (usuario selecciona 3 pedidos, hace click 1 vez)
2. ✅ Confusión de usuarios por comportamiento inconsistente
3. ✅ Procesamiento de solo el primer elemento cuando hay múltiples seleccionados
4. ✅ Reprocesamiento accidental por selección residual

### ⚠️ Lo que esta implementación NO PREVIENE (requiere solución de backend):

1. ❌ Duplicados por múltiples clicks rápidos (usuario hace click 5 veces en 1 segundo)
2. ❌ Race conditions en backend (2 usuarios procesan el mismo pedido simultáneamente)
3. ❌ Duplicados por reintentos automáticos (ej: timeouts de red)

### 📊 Impacto Esperado:

- **Reducción de duplicados:** ~60% (frontend only)
- **Mejora en UX:** Comportamiento predecible y consistente
- **Tiempo de implementación:** 4-6 horas
- **Riesgo:** BAJO (cambios bien acotados, fácil de revertir)

### 🚀 Próximos Pasos Recomendados:

1. ✅ Implementar esta solución (selección individual)
2. ✅ Monitorear duplicados durante 1 semana
3. ✅ Si persisten duplicados, implementar validaciones de backend (sección 5.2.1 del informe principal)
4. ✅ Considerar implementar selección múltiple REAL si los usuarios lo necesitan (sección 5.3.1)

---

**Fin del Documento**

**Versión:** 1.0
**Fecha:** 2025-11-06
**Autor:** Claude Code (Anthropic)
**Próxima revisión:** Después de implementación y 1 semana de monitoreo
