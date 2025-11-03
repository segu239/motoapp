# Informe: Análisis de Opción de Eliminar/Cancelar en Movimientos de Stock

**Fecha:** 2025-11-03
**Autor:** Análisis del Sistema MotoApp

---

## Resumen Ejecutivo

Este informe analiza todos los componentes relacionados con movimientos de stock en MotoApp para identificar cuáles deberían tener la funcionalidad de eliminar/cancelar pero actualmente no la tienen.

**Hallazgo Principal:** Se identificaron **2 componentes** que requieren la funcionalidad de cancelar/eliminar operaciones de stock pendientes.

---

## Componentes Analizados

### 1. Envíos de Stock Pendientes (`enviostockpendientes`)

**Ubicación:** `src/app/components/enviostockpendientes/`

**Estado Actual:**
- ❌ **NO tiene opción de eliminar/cancelar**
- Muestra pedidos en estado "Solicitado" donde `sucursalh` coincide con la sucursal actual
- Solo tiene botón "Enviar" para confirmar el envío

**Funcionalidad Actual:**
```typescript
enviar() {
  // Cambia el estado de "Solicitado" a "Enviado"
  // Crea un nuevo registro en pedidoscb con estado "Enviado"
}
```

**Análisis:**
- **Estado de datos:** "Solicitado" (pendiente)
- **Acción disponible:** Enviar
- **Acción faltante:** Cancelar

**Recomendación:** ✅ **REQUIERE opción de cancelar**

**Justificación:**
- Los pedidos en estado "Solicitado" aún no han sido procesados
- Pueden existir errores en las solicitudes (cantidad incorrecta, artículo equivocado)
- La sucursal que recibió la solicitud debería poder cancelarla antes de enviar
- No afecta inventario hasta que se envía

**Casos de Uso:**
1. Se solicitó un artículo incorrecto
2. Se solicitó una cantidad errónea
3. La sucursal solicitante ya no necesita el stock
4. Duplicación de solicitudes

**Impacto de Implementación:** Medio
- Requiere método `cancelarEnvio()` en el componente
- Debe cambiar estado de "Solicitado" a "Cancelado"
- Requiere confirmación del usuario antes de cancelar

**Referencias de código:**
- Archivo: `enviostockpendientes.component.ts:245-300`
- Método relacionado: `enviar()`

---

### 2. Pedidos de Stock (`stockpedido`)

**Ubicación:** `src/app/components/stockpedido/`

**Estado Actual:**
- ❌ **NO tiene opción de eliminar/cancelar**
- Muestra pedidos en estado "Solicitado" o "Solicitado-E"
- Solo tiene botón "Recibir" (para estado "Solicitado-E")

**Funcionalidad Actual:**
```typescript
recibir() {
  // Solo funciona si estado === "Solicitado-E"
  // Cambia el estado de "Solicitado-E" a "Recibido"
}
```

**Análisis:**
- **Estado de datos:** "Solicitado" o "Solicitado-E" (pendiente/en proceso)
- **Acción disponible:** Recibir (solo para "Solicitado-E")
- **Acción faltante:** Cancelar

**Recomendación:** ✅ **REQUIERE opción de cancelar**

**Justificación:**
- Los pedidos en estado "Solicitado" son solicitudes propias que aún no han sido procesadas
- La sucursal que realizó la solicitud debería poder cancelarla
- Es una operación reversible antes de que sea enviada
- Mejora el control de flujo de trabajo

**Casos de Uso:**
1. Se solicitó por error
2. Ya no se necesita el stock
3. Se encontró el stock en otra ubicación
4. Error en cantidad o artículo
5. Solicitud duplicada

**Restricciones de Cancelación:**
- Solo debe permitirse cancelar pedidos en estado "Solicitado"
- NO debe permitirse cancelar pedidos en estado "Solicitado-E" (ya fueron enviados)
- Debe requerir confirmación del usuario

**Impacto de Implementación:** Medio
- Requiere método `cancelarPedido()` en el componente
- Debe validar que estado === "Solicitado" antes de cancelar
- Requiere confirmación del usuario
- Debe cambiar estado a "Cancelado"

**Referencias de código:**
- Archivo: `stockpedido.component.ts:286-343`
- Método relacionado: `recibir()`

---

### 3. Envíos de Stock Realizados (`enviodestockrealizados`)

**Ubicación:** `src/app/components/enviodestockrealizados/`

**Estado Actual:**
- ✅ **NO requiere opción de eliminar**
- Solo visualiza envíos completados
- Muestra pedidos en estado "Enviado"

**Análisis:**
- **Estado de datos:** "Enviado" (completado)
- **Tipo:** Componente de consulta/histórico
- **Acción disponible:** Ninguna (solo visualización)

**Recomendación:** ❌ **NO REQUIERE opción de eliminar**

**Justificación:**
- Son operaciones ya completadas
- El stock ya fue transferido
- Sirve como registro histórico y auditoría
- Eliminar afectaría la integridad de los registros históricos

**Referencias de código:**
- Archivo: `enviodestockrealizados.component.ts:80-92`

---

### 4. Stock Recibido (`stockrecibo`)

**Ubicación:** `src/app/components/stockrecibo/`

**Estado Actual:**
- ✅ **NO requiere opción de eliminar**
- Solo visualiza stock recibido
- Muestra pedidos en estado "Recibido"

**Análisis:**
- **Estado de datos:** "Recibido" (completado)
- **Tipo:** Componente de consulta/histórico
- **Acción disponible:** Ninguna (solo visualización)

**Recomendación:** ❌ **NO REQUIERE opción de eliminar**

**Justificación:**
- Son recepciones completadas
- El stock ya fue incorporado al inventario
- Sirve como registro de auditoría
- Eliminar comprometería la trazabilidad del inventario

**Referencias de código:**
- Archivo: `stockrecibo.component.ts:111-117`

---

### 5. Stock Envío - Creación (`stockenvio`)

**Ubicación:** `src/app/components/stockenvio/`

**Estado Actual:**
- ✅ **NO requiere opción de eliminar** (no aplica)
- Componente para crear nuevos envíos
- Abre modal `StockproductoenvioComponent`

**Análisis:**
- **Tipo:** Componente de selección de productos
- **Función:** Interfaz para iniciar envíos
- No gestiona registros existentes

**Recomendación:** ❌ **NO REQUIERE opción de eliminar**

**Justificación:**
- No muestra lista de envíos pendientes para cancelar
- Es un componente de creación, no de gestión
- La cancelación debe estar en `enviostockpendientes`

**Referencias de código:**
- Archivo: `stockenvio.component.ts:564-611`

---

### 6. Modal: Stock Producto Envío (`stockproductoenvio`)

**Ubicación:** `src/app/components/stockproductoenvio/`

**Estado Actual:**
- ✅ **NO requiere opción de eliminar** (no aplica)
- Modal para confirmar envío de un producto específico
- Crea registro con estado "Enviado" directamente

**Análisis:**
- **Tipo:** Modal de confirmación
- **Función:** Crear nuevo envío
- **Acción:** Botón "Comprar" (enviar)

**Recomendación:** ❌ **NO REQUIERE opción de eliminar**

**Justificación:**
- Es un modal de creación, no de gestión
- Si el usuario no quiere enviar, simplemente cierra el modal
- No hay nada que eliminar hasta que se confirma

**Referencias de código:**
- Archivo: `stockproductoenvio.component.ts:70-156`

---

### 7. Modal: Stock Producto Pedido (`stockproductopedido`)

**Ubicación:** `src/app/components/stockproductopedido/`

**Estado Actual:**
- ✅ **NO requiere opción de eliminar** (no aplica)
- Modal para crear solicitud de stock
- Crea registro con estado "Solicitado"

**Análisis:**
- **Tipo:** Modal de confirmación
- **Función:** Crear nueva solicitud
- **Acción:** Botón "Comprar" (solicitar)

**Recomendación:** ❌ **NO REQUIERE opción de eliminar**

**Justificación:**
- Es un modal de creación, no de gestión
- Si el usuario no quiere solicitar, cierra el modal
- La cancelación de solicitudes debe estar en `stockpedido`

**Referencias de código:**
- Archivo: `stockproductopedido.component.ts:78-164`

---

## Flujo de Estados de Movimientos de Stock

```
SOLICITUD DE STOCK (Sucursal A solicita a Sucursal B)
┌─────────────┐
│ Solicitado  │ ← Crear solicitud (stockproductopedido modal)
└──────┬──────┘
       │
       ├─→ [CANCELAR] ← ❌ FALTA: Opción en stockpedido
       │
       ↓
┌──────────────┐
│ Solicitado-E │ ← Envío confirmado (enviostockpendientes)
└──────┬───────┘
       │
       ↓
┌──────────┐
│ Recibido │ ← Recepción confirmada (stockpedido)
└──────────┘


ENVÍO DIRECTO (Sucursal A envía a Sucursal B sin solicitud previa)
┌──────────┐
│ Enviado  │ ← Crear envío directo (stockproductoenvio modal)
└──────────┘
```

---

## Resumen de Recomendaciones

### ✅ REQUIEREN Implementación de Cancelar/Eliminar

| # | Componente | Ruta | Prioridad | Complejidad |
|---|------------|------|-----------|-------------|
| 1 | **enviostockpendientes** | `/enviostockpendientes` | ALTA | Media |
| 2 | **stockpedido** | `/stockpedido` | ALTA | Media |

### ❌ NO REQUIEREN Implementación

| # | Componente | Motivo |
|---|------------|--------|
| 1 | enviodestockrealizados | Histórico - Operaciones completadas |
| 2 | stockrecibo | Histórico - Operaciones completadas |
| 3 | stockenvio | Componente de selección, no de gestión |
| 4 | stockproductoenvio | Modal de creación |
| 5 | stockproductopedido | Modal de creación |

---

## Propuesta de Implementación

### Para: `enviostockpendientes.component.ts`

```typescript
// Método a agregar
cancelarEnvio() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido para cancelar', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire('Error', 'Solo se pueden cancelar pedidos en estado "Solicitado"', 'error');
    return;
  }

  Swal.fire({
    title: '¿Está seguro?',
    text: '¿Desea cancelar este pedido de stock?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No'
  }).then((result) => {
    if (result.isConfirmed) {
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
        observacion: 'Cancelado por usuario',
        estado: "Cancelado",
      };

      const pedidoscb = {
        tipo: "PE",
        numero: 1,
        sucursald: Number(this.sucursal),
        sucursalh: selectedPedido.sucursald,
        fecha: fechaFormateada,
        usuario: sessionStorage.getItem('usernameOp'),
        observacion: 'Cancelado por usuario',
        estado: "Cancelado",
        id_aso: 222
      };

      this._cargardata.crearPedidoStockIdEnvio(id_num, pedidoItem, pedidoscb).subscribe({
        next: (response) => {
          console.log(response);
          Swal.fire('Éxito', 'Pedido cancelado exitosamente', 'success');
          this.refrescarDatos();
        },
        error: (err) => {
          console.log(err);
          Swal.fire('Error', 'Error al cancelar el pedido', 'error');
        }
      });
    }
  });
}
```

**HTML a agregar:**
```html
<p-button label="Cancelar"
          (click)="cancelarEnvio()"
          styleClass="p-button-sm p-button-danger mr-2">
</p-button>
```

---

### Para: `stockpedido.component.ts`

```typescript
// Método a agregar
cancelarPedido() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido para cancelar', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire('Error', 'Solo se pueden cancelar pedidos en estado "Solicitado"', 'error');
    return;
  }

  Swal.fire({
    title: '¿Está seguro?',
    text: '¿Desea cancelar esta solicitud de stock?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No'
  }).then((result) => {
    if (result.isConfirmed) {
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
        observacion: 'Cancelado por usuario',
        estado: "Cancelado",
      };

      const pedidoscb = {
        tipo: "PE",
        sucursald: Number(this.sucursal),
        sucursalh: selectedPedido.sucursalh,
        fecha: fechaFormateada,
        usuario: sessionStorage.getItem('usernameOp'),
        observacion: 'Cancelado por usuario',
        estado: "Cancelado",
        id_aso: 222
      };

      this._cargardata.crearPedidoStockId(id_num, pedidoItem, pedidoscb).subscribe({
        next: (response) => {
          console.log(response);
          Swal.fire('Éxito', 'Solicitud cancelada exitosamente', 'success');
          this.refrescarDatos();
        },
        error: (err) => {
          console.log(err);
          Swal.fire('Error', 'Error al cancelar la solicitud', 'error');
        }
      });
    }
  });
}
```

**HTML a agregar:**
```html
<p-button label="Cancelar"
          (click)="cancelarPedido()"
          styleClass="p-button-sm p-button-danger mr-2">
</p-button>
```

---

## Beneficios de la Implementación

### 1. Control de Errores
- Permite corregir solicitudes erróneas antes de que afecten el inventario
- Reduce movimientos innecesarios de stock

### 2. Flexibilidad Operativa
- Mejora la capacidad de respuesta ante cambios de necesidades
- Permite ajustar decisiones rápidamente

### 3. Integridad de Datos
- Evita registros duplicados
- Mantiene el histórico con estado "Cancelado" para auditoría

### 4. Experiencia de Usuario
- Interfaz más completa y profesional
- Mayor confianza al realizar operaciones

---

## Consideraciones Técnicas

### Base de Datos
- Se recomienda agregar el estado "Cancelado" a la tabla de movimientos de stock
- Los registros cancelados deben mantenerse para auditoría
- Considerar agregar campo `fecha_cancelacion` y `usuario_cancelacion`

### Validaciones
- Solo permitir cancelar si estado === "Solicitado"
- Requerir confirmación del usuario (SweetAlert2)
- Validar permisos de usuario si es necesario

### Auditoría
- Registrar quién y cuándo canceló cada operación
- Mantener histórico completo de estados

---

## Conclusión

El análisis identifica **2 componentes críticos** que requieren la implementación de funcionalidad de cancelar/eliminar:

1. ✅ **enviostockpendientes**: Para cancelar pedidos antes de enviarlos
2. ✅ **stockpedido**: Para cancelar solicitudes propias antes de que sean procesadas

Ambas implementaciones son de **prioridad ALTA** ya que mejoran significativamente el control operativo y la experiencia del usuario sin comprometer la integridad de los datos históricos.

---

**Próximos Pasos Recomendados:**
1. Implementar método `cancelarEnvio()` en `enviostockpendientes`
2. Implementar método `cancelarPedido()` en `stockpedido`
3. Agregar estado "Cancelado" en la base de datos
4. Realizar pruebas exhaustivas de validación
5. Documentar procedimiento de cancelación en manual de usuario
