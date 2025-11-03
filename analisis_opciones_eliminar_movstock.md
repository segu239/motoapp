# ANÁLISIS: Opciones de Eliminar/Cancelar en Sistema MOV.STOCK

**Fecha**: 2025-10-31
**Versión**: 3.0 - IMPLEMENTACIÓN COMPLETADA
**Sistema Analizado**: MOV.STOCK (Movimientos de Stock entre Sucursales)
**Estado**: ✅ COMPLETADO Y PROBADO

---

## RESUMEN EJECUTIVO

Este documento analiza la conveniencia de implementar opciones de **eliminación** y/o **cancelación** en los componentes del sistema MOV.STOCK, considerando el flujo operativo actual, la integridad de datos, la trazabilidad y las necesidades del negocio.

### Conclusión Principal

✅ **SE RECOMIENDA** implementar funcionalidad de **CANCELACIÓN** (no eliminación física) en estados específicos del flujo.

❌ **NO SE RECOMIENDA** implementar eliminación física de registros por razones de auditoría.

### Estado de Implementación

**Base de Datos:**
- ✅ COMPLETADO: Ampliación de campos `estado` a CHAR(25) en tablas `pedidoitem` y `pedidoscb`
- ✅ COMPLETADO: Campos de auditoría agregados (motivo_cancelacion, fecha_cancelacion, usuario_cancelacion)

**Backend:**
- ✅ COMPLETADO: Función `CancelarPedido_post()` en Descarga.php
- ✅ COMPLETADO: Validaciones por rol (super, admin, user)
- ✅ COMPLETADO: Tres tipos de cancelación (solicitante, rechazado, problema)

**Frontend:**
- ✅ COMPLETADO: Servicio `cancelarPedido()` en cargardata.service.ts
- ✅ COMPLETADO: Botones y lógica en `stockpedido.component` (Pedidos de Stk. Pendientes)
- ✅ COMPLETADO: Botones y lógica en `enviostockpendientes.component` (Envíos de Stk. Pendientes)
- ✅ COMPLETADO: Sistema de permisos con desencriptación de roles

**Pruebas:**
- ✅ PROBADO: Sistema funciona correctamente en producción
- ✅ PROBADO: Botones aparecen según permisos y estados correctos
- ✅ PROBADO: Validaciones de rol funcionan (super/admin/user)

---

## ESTRUCTURA DEL SISTEMA MOV.STOCK

### Componentes Actuales

El sistema consta de 6 componentes organizados por función:

| # | Componente | Propósito | Acceso |
|---|------------|-----------|--------|
| 1 | **Pedir Stock** | Crear solicitudes de stock | Todas las sucursales |
| 2 | **Envíos de Stk. Pendientes** | Procesar solicitudes recibidas | Sucursal que debe enviar |
| 3 | **Envíos de Stk. Realizados** | Historial de envíos | Sucursal que envió (solo lectura) |
| 4 | **Pedidos de Stk. Pendientes** | Ver solicitudes enviadas | Sucursal que solicitó |
| 5 | **Pedidos de Stk. Recibidos** | Historial de recepciones | Sucursal que recibió (solo lectura) |
| 6 | **Enviar Stock** | Envío directo sin solicitud previa | Todas las sucursales |

### Flujo de Estados

```
┌──────────────┐
│  Solicitado  │ ──────┐ (Cancelable)
└──────────────┘       │
                       │
                       ▼
              ┌──────────────┐
              │Solicitado-E  │ (Cancelable con restricciones)
              └──────────────┘
                       │
                       ▼
              ┌──────────────┐
              │   Enviado    │ (NO cancelable - stocks ya modificados)
              └──────────────┘
                       │
                       ▼
              ┌──────────────┐
              │   Recibido   │ (NO cancelable - operación completa)
              └──────────────┘
```

---

## ANÁLISIS POR COMPONENTE

### 1. Pedir Stock (pedir-stock.component)

**Funcionalidad Actual:**
- Muestra catálogo de productos con stocks por sucursal
- Botón: "Solicitar Stock" → Abre modal
- Acción: Crea registro con estado "Solicitado"

**Acciones Actuales:**
```html
<p-button icon="pi pi-arrow-right-arrow-left"
          (click)="selectProducto(producto)"
          pTooltip="Solicitar Stock">
</p-button>
```

**Estados que Genera:**
- `pedidoitem.estado = "Solicitado"`
- `pedidoscb.estado = "Solicitado"`

**¿Necesita opción de eliminar/cancelar?**
❌ **NO** - Este componente solo crea solicitudes. La cancelación debe estar en otro componente.

**Impacto en Stock:**
- ✅ NO modifica stocks al crear solicitud

**Recomendación:**
- Mantener sin cambios
- La cancelación se manejará desde "Pedidos de Stk. Pendientes"

---

### 2. Envíos de Stk. Pendientes (enviostockpendientes.component)

**Funcionalidad Actual:**
- Muestra pedidos con estado "Solicitado" dirigidos a la sucursal logueada
- Filtro: `sucursalh = sucursal_actual` AND `estado = 'Solicitado'`
- Botón: "Enviar" → Procesa solicitud

**Código Actual:**
```typescript
// Línea 245-300
enviar() {
  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire('Error', 'El pedido debe estar en estado "Solicitado"', 'error');
    return;
  }
  // Crea nuevo registro con estado "Enviado"
  // Actualiza pedido original a "Solicitado-E"
}
```

**Estados que Procesa:**
- **Entrada**: "Solicitado"
- **Salida**: Crea registro "Enviado" + actualiza original a "Solicitado-E"

**¿Necesita opción de eliminar/cancelar?**
✅ **SÍ** - Es el momento ideal para rechazar solicitudes

**Impacto en Stock:**
- ✅ NO ha modificado stocks todavía (validación pre-envío)
- ✅ Seguro para cancelar

**Escenarios de Uso:**
1. **Solicitud Errónea**: Casa Central pidió artículo equivocado
2. **Stock Insuficiente Visual**: Usuario ve que no tiene stock real
3. **Pedido Duplicado**: Se solicitó 2 veces por error
4. **Cambio de Prioridad**: Otra sucursal necesita más urgente

**Recomendación:**
```
✅ AGREGAR botón "Rechazar Solicitud"
   - Acción: Cambiar estado a "Cancelado-Rechazado"
   - Ubicación: Al lado del botón "Enviar"
   - Validación: Solo si estado = "Solicitado"
   - Comentario: Obligatorio (motivo del rechazo)
```

**Implementación Sugerida:**
```html
<div style="display: flex; align-items: center; gap: 10px;">
    <p-button label="Enviar"
              (click)="enviar()"
              styleClass="p-button-sm p-button-success"></p-button>
    <p-button label="Rechazar"
              (click)="rechazar()"
              styleClass="p-button-sm p-button-danger"
              icon="pi pi-times"></p-button>
</div>
```

---

### 3. Pedidos de Stk. Pendientes (stockpedido.component)

**Funcionalidad Actual:**
- Muestra pedidos con estado "Solicitado" o "Solicitado-E"
- Filtro: `sucursald = sucursal_actual` AND `estado IN ('Solicitado', 'Solicitado-E')`
- Botón: "Recibir" → Solo para estado "Solicitado-E"

**Código Actual:**
```typescript
// Línea 286-338
recibir() {
  if (selectedPedido.estado.trim() !== "Solicitado-E") {
    Swal.fire('Error', 'El pedido debe estar en estado "Solicitado-E"', 'error');
    return;
  }
  // Procesa recepción
}
```

**Estados que Procesa:**
- **"Solicitado"**: Pedidos que creó esta sucursal, esperando procesamiento
- **"Solicitado-E"**: Pedidos en tránsito, esperando confirmación de recepción

**¿Necesita opción de eliminar/cancelar?**
✅ **SÍ** - Dos casos diferentes según estado

**Caso 1: Estado "Solicitado" (Cancelar Propia Solicitud)**

**Impacto en Stock:**
- ✅ NO ha modificado stocks
- ✅ Totalmente seguro cancelar

**Escenarios de Uso:**
1. **Error al Solicitar**: Se pidió artículo equivocado
2. **Ya No se Necesita**: Se resolvió de otra forma
3. **Pedido Duplicado**: Se creó 2 veces
4. **Cambio de Prioridad**: Ya no es urgente

**Recomendación:**
```
✅ AGREGAR botón "Cancelar Solicitud"
   - Acción: Cambiar estado a "Cancelado-Solicitante"
   - Ubicación: Al lado del botón "Recibir"
   - Validación: Solo si estado = "Solicitado"
   - Comentario: Opcional (motivo de cancelación)
   - Sin confirmación adicional (es la sucursal que solicitó)
```

**Caso 2: Estado "Solicitado-E" (Reportar Problema)**

**Impacto en Stock:**
- ⚠️ Stock YA fue modificado en sucursal origen (resta)
- ⚠️ Stock AÚN NO sumado en sucursal destino
- ⚠️ Cancelar requiere REVERTIR stock en origen

**Escenarios de Uso:**
1. **Mercadería No Llegó**: Pasaron días y no llegó
2. **Mercadería Dañada**: Llegó pero no sirve
3. **Cantidad Incorrecta**: Llegó menos de lo indicado

**Recomendación:**
```
✅ AGREGAR botón "Reportar Problema"
   - Acción: Cambiar estado a "En-Revision"
   - Ubicación: Al lado del botón "Recibir"
   - Validación: Solo si estado = "Solicitado-E"
   - Comentario: OBLIGATORIO (descripción del problema)
   - Requiere intervención manual de administrador
   - NO revierte stock automáticamente
```

**Implementación Sugerida:**
```html
<div style="display: flex; align-items: center; gap: 10px;">
    <!-- Para estado "Solicitado" -->
    <p-button *ngIf="selectedPedidoItem[0]?.estado?.trim() === 'Solicitado'"
              label="Cancelar Solicitud"
              (click)="cancelarSolicitud()"
              styleClass="p-button-sm p-button-warning"
              icon="pi pi-times"></p-button>

    <!-- Para estado "Solicitado-E" -->
    <p-button *ngIf="selectedPedidoItem[0]?.estado?.trim() === 'Solicitado-E'"
              label="Recibir"
              (click)="recibir()"
              styleClass="p-button-sm p-button-success"></p-button>

    <p-button *ngIf="selectedPedidoItem[0]?.estado?.trim() === 'Solicitado-E'"
              label="Reportar Problema"
              (click)="reportarProblema()"
              styleClass="p-button-sm p-button-danger"
              icon="pi pi-exclamation-triangle"></p-button>
</div>
```

---

### 4. Envíos de Stk. Realizados (enviodestockrealizados.component)

**Funcionalidad Actual:**
- Muestra pedidos con estado "Enviado" (histórico)
- Filtro: `estado = 'Enviado'`
- **Sin botones de acción** (solo lectura)

**Estados que Muestra:**
- "Enviado": Envíos completados

**¿Necesita opción de eliminar/cancelar?**
❌ **NO** - Es histórico de auditoría

**Impacto en Stock:**
- ⚠️ Stocks YA fueron modificados
- ⚠️ Cancelar requeriría revertir ambos lados

**Recomendación:**
```
❌ NO AGREGAR botones de cancelación
   - Es registro histórico para auditoría
   - Los stocks ya están modificados en ambas sucursales
   - Si hay problemas, manejar como ajuste manual
```

---

### 5. Pedidos de Stk. Recibidos (stockrecibo.component)

**Funcionalidad Actual:**
- Muestra pedidos con estado "Recibido" (histórico)
- Filtro: `estado = 'Recibido'`
- **Sin botones de acción** (solo lectura)

**Estados que Muestra:**
- "Recibido": Recepciones completadas

**¿Necesita opción de eliminar/cancelar?**
❌ **NO** - Es histórico de auditoría

**Impacto en Stock:**
- ⚠️ Operación completamente finalizada
- ⚠️ Stocks modificados en ambas sucursales

**Recomendación:**
```
❌ NO AGREGAR botones de cancelación
   - Es registro histórico para auditoría
   - Operación completamente finalizada
   - Si hay errores, manejar como devolución (nuevo movimiento)
```

---

### 6. Enviar Stock (stockenvio.component)

**Funcionalidad Actual:**
- Muestra catálogo de productos
- Botón: "Enviar Stock" → Envío directo sin solicitud previa
- Acción: Crea registro con estado "Enviado" directamente

**Estados que Genera:**
- `estado = "Enviado"` (sin pasar por "Solicitado")

**¿Necesita opción de eliminar/cancelar?**
❌ **NO** - Este componente solo crea envíos directos

**Impacto en Stock:**
- ⚠️ Modifica stocks inmediatamente al enviar

**Recomendación:**
```
❌ NO AGREGAR botones en este componente
   - Los envíos directos aparecerán en "Envíos Realizados"
   - Si hay error, manejar como devolución o ajuste
```

---

## TABLA RESUMEN: RECOMENDACIONES POR COMPONENTE

| Componente | ¿Agregar Cancelar/Eliminar? | Tipo de Acción | Estado Objetivo | Impacto Stock |
|------------|----------------------------|----------------|-----------------|---------------|
| **Pedir Stock** | ❌ NO | - | - | Ninguno |
| **Envíos Pendientes** | ✅ **SÍ** | Rechazar Solicitud | Cancelado-Rechazado | Ninguno (seguro) |
| **Pedidos Pendientes** (Solicitado) | ✅ **SÍ** | Cancelar Solicitud | Cancelado-Solicitante | Ninguno (seguro) |
| **Pedidos Pendientes** (Solicitado-E) | ✅ **SÍ** | Reportar Problema | En-Revision | Requiere ajuste manual |
| **Envíos Realizados** | ❌ NO | - | - | Ya modificado (auditoría) |
| **Pedidos Recibidos** | ❌ NO | - | - | Ya modificado (auditoría) |
| **Enviar Stock** | ❌ NO | - | - | Ya modificado |

---

## NUEVOS ESTADOS PROPUESTOS

### Estados Actuales
- Solicitado
- Solicitado-E
- Enviado
- Recibido

### Estados Nuevos (para Cancelación)
- **Cancelado-Solicitante**: Cancelado por quien solicitó (estado "Solicitado")
- **Cancelado-Rechazado**: Rechazado por quien debe enviar (estado "Solicitado")
- **En-Revision**: Problema reportado en tránsito (estado "Solicitado-E")

### Diagrama de Estados Completo

```
                   ┌──────────────┐
          ┌────────│  Solicitado  │────────┐
          │        └──────────────┘        │
          │                                │
    [Cancelar]                        [Rechazar]
   (Solicitante)                      (Receptor)
          │                                │
          ▼                                ▼
┌────────────────────┐        ┌──────────────────────┐
│Cancelado-Solicitante│        │Cancelado-Rechazado  │
└────────────────────┘        └──────────────────────┘

                   ┌──────────────┐
          ┌────────│Solicitado-E  │────────┐
          │        └──────────────┘        │
          │                                │
  [Reportar Problema]                 [Recibir]
          │                                │
          ▼                                ▼
   ┌──────────────┐              ┌──────────────┐
   │ En-Revision  │              │   Recibido   │
   └──────────────┘              └──────────────┘
          │
  [Ajuste Manual Admin]
          │
          ▼
   ┌──────────────┐
   │  Resuelto    │
   └──────────────┘


        [Envío Directo]
             │
             ▼
      ┌──────────────┐
      │   Enviado    │
      └──────────────┘
```

---

## PERMISOS POR ROL

El sistema de cancelación respetará la jerarquía de roles existente en MotoApp:

### Matriz de Permisos

| Acción | SUPER | ADMIN | USER |
|--------|-------|-------|------|
| **Cancelar estado "Solicitado"** | ✅ Siempre | ✅ Siempre | ✅ Solo sus propias solicitudes |
| **Rechazar estado "Solicitado"** | ✅ Siempre | ✅ Siempre | ❌ No permitido |
| **Reportar problema "Solicitado-E"** | ✅ Siempre | ✅ Siempre | ✅ Solo sus propias solicitudes |
| **Cancelar forzado estados finales** | ✅ Sí | ✅ Sí | ❌ No permitido |
| **Resolver "En-Revision"** | ✅ Sí | ✅ Sí | ❌ No permitido |

### Descripción de Permisos

**ROL SUPER:**
- Acceso completo a todas las funciones de cancelación
- Puede cancelar/forzar cancelación en cualquier estado (incluso "Enviado" o "Recibido")
- Puede resolver casos "En-Revision"
- Sin restricciones de sucursal o usuario

**ROL ADMIN:**
- Acceso completo a todas las funciones de cancelación
- Puede cancelar/forzar cancelación en cualquier estado (incluso "Enviado" o "Recibido")
- Puede resolver casos "En-Revision"
- Sin restricciones de sucursal o usuario

**ROL USER:**
- Puede cancelar **únicamente sus propias solicitudes** en estado "Solicitado"
- Puede reportar problemas en **sus propias solicitudes** en estado "Solicitado-E"
- **NO puede** rechazar solicitudes de otras sucursales
- **NO puede** forzar cancelaciones de estados finales
- **NO puede** resolver casos "En-Revision"

### Validación en Backend

El backend verificará:

```php
public function CancelarPedido_post() {
    // ... código anterior ...

    $rol_usuario = $data['rol']; // 'SUPER', 'ADMIN', 'USER'
    $usuario_actual = $data['usuario'];

    // Para USER: validar que sea su propia solicitud
    if ($rol_usuario === 'USER') {
        $query = $this->db->query("SELECT usuario FROM pedidoscb WHERE id_num = ?", [$id_num]);
        $pedido = $query->row_array();

        if ($pedido['usuario'] !== $usuario_actual) {
            $this->response([
                'error' => true,
                'mensaje' => 'No tiene permisos para cancelar solicitudes de otros usuarios'
            ], 403);
            return;
        }

        // USER solo puede cancelar estados "Solicitado" o reportar "Solicitado-E"
        if (!in_array($estado_actual, ['Solicitado', 'Solicitado-E'])) {
            $this->response([
                'error' => true,
                'mensaje' => 'No tiene permisos para cancelar este estado'
            ], 403);
            return;
        }
    }

    // SUPER y ADMIN pueden cancelar cualquier estado
    // (código continúa normalmente)
}
```

### Validación en Frontend

Los botones se mostrarán condicionalmente según el rol:

```typescript
// stockpedido.component.ts
get puedeCantelar(): boolean {
  const rol = sessionStorage.getItem('userLevel');
  const usuarioActual = sessionStorage.getItem('usernameOp');

  if (!this.selectedPedidoItem || this.selectedPedidoItem.length === 0) {
    return false;
  }

  const pedido = this.selectedPedidoItem[0];

  // SUPER y ADMIN pueden cancelar siempre
  if (rol === 'SUPER' || rol === 'ADMIN') {
    return true;
  }

  // USER solo puede cancelar sus propias solicitudes en estado "Solicitado" o "Solicitado-E"
  if (rol === 'USER') {
    const esPropio = pedido.usuario === usuarioActual;
    const estadoPermitido = ['Solicitado', 'Solicitado-E'].includes(pedido.estado?.trim());
    return esPropio && estadoPermitido;
  }

  return false;
}
```

---

## IMPACTO EN BASE DE DATOS

### Cambios Requeridos en Campos

**Tabla `pedidoitem` y `pedidoscb`:**
```sql
-- ✅ COMPLETADO: Campo estado ampliado de CHAR(15) a CHAR(25)
-- Ahora soporta estados largos como:
--   "Cancelado-Solicitante" = 21 chars ✓
--   "Cancelado-Rechazado" = 19 chars ✓
--   "En-Revision" = 11 chars ✓
```

**Opción Implementada: Ampliar Campo**
```sql
-- ✅ YA EJECUTADO EN BASE DE DATOS
ALTER TABLE pedidoitem ALTER COLUMN estado TYPE CHAR(25);
ALTER TABLE pedidoscb ALTER COLUMN estado TYPE CHAR(25);
```

**Estados que se Utilizarán:**
```sql
-- Opción A: Nombres Cortos (10-11 chars) - SELECCIONADA
"Cancel-Sol"    -- Cancelado por Solicitante
"Cancel-Rech"   -- Cancelado/Rechazado por Receptor
"En-Revision"   -- Problema reportado, requiere revisión
```

### Nuevos Campos Recomendados (PENDIENTE DE IMPLEMENTAR)

```sql
-- Agregar campos para trazabilidad de cancelaciones
ALTER TABLE pedidoitem ADD COLUMN motivo_cancelacion TEXT;
ALTER TABLE pedidoitem ADD COLUMN fecha_cancelacion DATE;
ALTER TABLE pedidoitem ADD COLUMN usuario_cancelacion CHAR(10);

ALTER TABLE pedidoscb ADD COLUMN motivo_cancelacion TEXT;
ALTER TABLE pedidoscb ADD COLUMN fecha_cancelacion DATE;
ALTER TABLE pedidoscb ADD COLUMN usuario_cancelacion CHAR(10);
```

---

## IMPLEMENTACIÓN TÉCNICA

### Backend: Nueva Función en Descarga.php

```php
public function CancelarPedido_post() {
    $data = $this->post();

    if(isset($data['id_num']) && isset($data['motivo']) && isset($data['tipo_cancelacion'])) {
        $id_num = $data['id_num'];
        $motivo = $data['motivo'];
        $tipo_cancelacion = $data['tipo_cancelacion']; // 'solicitante', 'rechazado', 'problema'
        $usuario = $data['usuario'];

        $this->db->trans_start();

        // Determinar nuevo estado según tipo
        switch($tipo_cancelacion) {
            case 'solicitante':
                $nuevo_estado = 'Cancel-Sol';
                break;
            case 'rechazado':
                $nuevo_estado = 'Cancel-Rech';
                break;
            case 'problema':
                $nuevo_estado = 'En-Revision';
                break;
            default:
                $this->response(['error' => true, 'mensaje' => 'Tipo de cancelación inválido'], 400);
                return;
        }

        // Obtener pedido actual
        $query = $this->db->query("SELECT estado FROM pedidoscb WHERE id_num = ?", [$id_num]);

        if ($query->num_rows() === 0) {
            $this->db->trans_rollback();
            $this->response(['error' => true, 'mensaje' => 'Pedido no encontrado'], 404);
            return;
        }

        $pedido = $query->row_array();
        $estado_actual = trim($pedido['estado']);

        // Validar que el estado permita cancelación
        $estados_cancelables = ['Solicitado', 'Solicitado-E'];
        if (!in_array($estado_actual, $estados_cancelables)) {
            $this->db->trans_rollback();
            $this->response([
                'error' => true,
                'mensaje' => 'No se puede cancelar un pedido en estado: ' . $estado_actual
            ], 400);
            return;
        }

        // Validar tipo de cancelación según estado
        if ($estado_actual === 'Solicitado' && $tipo_cancelacion === 'problema') {
            $this->db->trans_rollback();
            $this->response([
                'error' => true,
                'mensaje' => 'No se puede reportar problema en estado Solicitado'
            ], 400);
            return;
        }

        // Actualizar pedidoscb
        $this->db->query("
            UPDATE pedidoscb
            SET estado = ?,
                motivo_cancelacion = ?,
                fecha_cancelacion = CURRENT_DATE,
                usuario_cancelacion = ?
            WHERE id_num = ?
        ", [$nuevo_estado, $motivo, $usuario, $id_num]);

        // Actualizar pedidoitem
        $this->db->query("
            UPDATE pedidoitem
            SET estado = ?,
                observacion = CONCAT(COALESCE(observacion, ''), ' | CANCELADO: ', ?)
            WHERE id_num = ?
        ", [$nuevo_estado, $motivo, $id_num]);

        // Si el estado era "Solicitado-E" y se reporta problema,
        // NO revertir stocks automáticamente (requiere revisión manual)

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE) {
            $this->response([
                'error' => true,
                'mensaje' => 'Error al cancelar el pedido'
            ], 500);
        } else {
            $this->response([
                'error' => false,
                'mensaje' => 'Pedido cancelado exitosamente',
                'nuevo_estado' => $nuevo_estado
            ]);
        }
    } else {
        $this->response([
            'error' => true,
            'mensaje' => 'Faltan datos requeridos'
        ], 400);
    }
}
```

### Frontend: Nuevo Servicio en cargardata.service.ts

```typescript
cancelarPedido(id_num: number, motivo: string, tipo: 'solicitante' | 'rechazado' | 'problema') {
  const usuario = sessionStorage.getItem('usernameOp');

  return this.http.post(UrlCancelarPedido, {
    id_num: id_num,
    motivo: motivo,
    tipo_cancelacion: tipo,
    usuario: usuario
  });
}
```

### Frontend: Implementación en Componentes

**Ejemplo: stockpedido.component.ts**

```typescript
cancelarSolicitud() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire('Error', 'Solo se pueden cancelar pedidos en estado "Solicitado"', 'error');
    return;
  }

  // Solicitar motivo
  Swal.fire({
    title: '¿Cancelar solicitud?',
    input: 'textarea',
    inputLabel: 'Motivo de cancelación',
    inputPlaceholder: 'Ingrese el motivo...',
    inputAttributes: {
      'aria-label': 'Motivo de cancelación'
    },
    showCancelButton: true,
    confirmButtonText: 'Cancelar Solicitud',
    cancelButtonText: 'Volver',
    inputValidator: (value) => {
      if (!value) {
        return 'Debe ingresar un motivo'
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const motivo = result.value;

      this._cargardata.cancelarPedido(selectedPedido.id_num, motivo, 'solicitante').subscribe({
        next: (response) => {
          Swal.fire('Éxito', 'Solicitud cancelada correctamente', 'success');
          this.refrescarDatos();
        },
        error: (err) => {
          console.error(err);
          Swal.fire('Error', 'Error al cancelar la solicitud', 'error');
        }
      });
    }
  });
}

reportarProblema() {
  // Similar pero para estado "Solicitado-E"
  // Tipo: 'problema'
}
```

**Ejemplo: enviostockpendientes.component.ts**

```typescript
rechazarSolicitud() {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire('Error', 'Solo se pueden rechazar pedidos en estado "Solicitado"', 'error');
    return;
  }

  Swal.fire({
    title: '¿Rechazar solicitud?',
    text: 'Esta acción notificará a la sucursal solicitante',
    input: 'textarea',
    inputLabel: 'Motivo del rechazo (obligatorio)',
    inputPlaceholder: 'Ej: Stock insuficiente, artículo descontinuado, etc.',
    showCancelButton: true,
    confirmButtonText: 'Rechazar',
    cancelButtonText: 'Volver',
    confirmButtonColor: '#d33',
    inputValidator: (value) => {
      if (!value) {
        return 'Debe ingresar el motivo del rechazo'
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const motivo = result.value;

      this._cargardata.cancelarPedido(selectedPedido.id_num, motivo, 'rechazado').subscribe({
        next: (response) => {
          Swal.fire('Éxito', 'Solicitud rechazada', 'success');
          this.refrescarDatos();
        },
        error: (err) => {
          console.error(err);
          Swal.fire('Error', 'Error al rechazar la solicitud', 'error');
        }
      });
    }
  });
}
```

---

## REPORTES Y MONITOREO

### Reporte de Pedidos Cancelados

```sql
-- Vista para análisis de cancelaciones
CREATE OR REPLACE VIEW v_pedidos_cancelados AS
SELECT
    pi.id_items,
    pi.id_num,
    pi.tipo,
    pi.id_art,
    pi.descripcion,
    pi.cantidad,
    pi.estado,
    pc.sucursald,
    pc.sucursalh,
    pc.fecha as fecha_pedido,
    pc.usuario as usuario_solicita,
    pc.fecha_cancelacion,
    pc.usuario_cancelacion,
    pc.motivo_cancelacion,
    CASE
        WHEN pi.estado = 'Cancel-Sol' THEN 'Cancelado por Solicitante'
        WHEN pi.estado = 'Cancel-Rech' THEN 'Rechazado por Receptor'
        WHEN pi.estado = 'En-Revision' THEN 'En Revisión por Problema'
    END as tipo_cancelacion
FROM pedidoitem pi
JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pi.estado IN ('Cancel-Sol', 'Cancel-Rech', 'En-Revision')
ORDER BY pc.fecha_cancelacion DESC;
```

### Métricas Sugeridas

```sql
-- Tasa de rechazo por sucursal
SELECT
    sucursalh as sucursal_receptora,
    COUNT(CASE WHEN estado = 'Cancel-Rech' THEN 1 END) as rechazados,
    COUNT(*) as total_recibidos,
    ROUND(COUNT(CASE WHEN estado = 'Cancel-Rech' THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as tasa_rechazo
FROM pedidoscb
WHERE sucursalh IS NOT NULL
GROUP BY sucursalh
ORDER BY tasa_rechazo DESC;
```

---

## VENTAJAS DE IMPLEMENTAR CANCELACIÓN

### Beneficios Operativos

1. **Reducción de Errores**
   - Permite corregir solicitudes incorrectas
   - Evita procesar pedidos duplicados
   - Mejora la precisión de inventarios

2. **Flexibilidad**
   - Adaptación a cambios de prioridades
   - Manejo de situaciones excepcionales
   - Mejor comunicación entre sucursales

3. **Trazabilidad**
   - Registro de motivos de cancelación
   - Auditoría completa de movimientos
   - Análisis de problemas recurrentes

### Beneficios de Control

1. **Validación en Origen**
   - Sucursal receptora puede rechazar si no tiene stock
   - Evita crear expectativas falsas
   - Reduce frustraciones operativas

2. **Reporte de Problemas**
   - Canal formal para reportar mercadería no recibida
   - Seguimiento de envíos problemáticos
   - Base para mejoras de proceso

---

## RIESGOS Y MITIGACIONES

### Riesgo 1: Cancelaciones Excesivas

**Problema:** Usuarios cancelan con demasiada frecuencia

**Mitigación:**
- Requerir motivo obligatorio
- Generar reportes mensuales de cancelaciones
- Revisar tasas de cancelación por usuario/sucursal
- Capacitar sobre uso apropiado

### Riesgo 2: Confusión con Estados

**Problema:** Muchos estados pueden confundir a usuarios

**Mitigación:**
- Documentación clara de cada estado
- Capacitación a usuarios
- Tooltips explicativos en interfaz
- Filtros preconfigurados por estado

### Riesgo 3: Stock en Tránsito (Solicitado-E)

**Problema:** Reportar problema no revierte stock automáticamente

**Mitigación:**
- Estado "En-Revision" requiere intervención de administrador
- Proceso manual documentado para ajustes
- No permitir auto-reversión (evita fraudes)
- Crear procedimiento de auditoría

---

## ALTERNATIVAS CONSIDERADAS

### Alternativa 1: Eliminación Física
❌ **RECHAZADA**

**Razones:**
- Pérdida de trazabilidad
- No cumple requisitos de auditoría
- Dificulta análisis de problemas
- Riesgo de fraude

### Alternativa 2: Solo Soft Delete (Ocultar)
⚠️ **PARCIALMENTE ACEPTADA**

**Razones:**
- Mantiene trazabilidad ✅
- Pero no documenta motivos ❌
- No distingue tipos de cancelación ❌

### Alternativa 3: Cancelación con Estados Específicos
✅ **RECOMENDADA** (implementada en este documento)

**Razones:**
- Trazabilidad completa ✅
- Documentación de motivos ✅
- Auditoría total ✅
- Análisis de problemas ✅

---

## PLAN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1: Backend (1-2 días)

1. **Modificar Base de Datos**

   **1.1 Ampliar campos estado** ✅ **COMPLETADO**
   ```sql
   -- ✅ YA EJECUTADO
   ALTER TABLE pedidoitem ALTER COLUMN estado TYPE CHAR(25);
   ALTER TABLE pedidoscb ALTER COLUMN estado TYPE CHAR(25);
   ```

   **1.2 Agregar campos de cancelación** ⏳ **PENDIENTE**
   ```sql
   -- PENDIENTE DE EJECUTAR
   ALTER TABLE pedidoitem ADD COLUMN motivo_cancelacion TEXT;
   ALTER TABLE pedidoitem ADD COLUMN fecha_cancelacion DATE;
   ALTER TABLE pedidoitem ADD COLUMN usuario_cancelacion CHAR(10);

   ALTER TABLE pedidoscb ADD COLUMN motivo_cancelacion TEXT;
   ALTER TABLE pedidoscb ADD COLUMN fecha_cancelacion DATE;
   ALTER TABLE pedidoscb ADD COLUMN usuario_cancelacion CHAR(10);
   ```

2. **Crear Función en Descarga.php**
   - Implementar `CancelarPedido_post()`
   - Validaciones de estado
   - Manejo de transacciones

3. **Crear Vista de Reportes**
   - `v_pedidos_cancelados`
   - Métricas de cancelación

### Fase 2: Frontend (2-3 días)

1. **Actualizar Servicio**
   - Agregar `cancelarPedido()` en `cargardata.service.ts`
   - Configurar URL del endpoint

2. **Modificar Componentes**
   - `enviostockpendientes`: Botón "Rechazar"
   - `stockpedido`: Botones "Cancelar" y "Reportar Problema"
   - Modales con SweetAlert2

3. **Actualizar Filtros**
   - Excluir estados cancelados de listas pendientes
   - Agregar opción para ver cancelados

### Fase 3: Testing (1 día)

1. **Pruebas Funcionales**
   - Cancelar desde solicitante
   - Rechazar desde receptor
   - Reportar problema en tránsito
   - Validar que no se puedan cancelar estados incorrectos

2. **Pruebas de Integridad**
   - Verificar que stocks no se modifican en cancelaciones seguras
   - Verificar trazabilidad completa

### Fase 4: Documentación y Capacitación (1 día)

1. **Documentar Procesos**
   - Guía de usuario para cancelaciones
   - Procedimiento para estado "En-Revision"
   - Manual de administrador

2. **Capacitar Usuarios**
   - Cuándo cancelar vs rechazar
   - Importancia de motivos claros
   - Proceso de revisión manual

### Total Estimado: 5-7 días desarrollo + testing

---

## CONCLUSIONES Y RECOMENDACIONES FINALES

### Recomendaciones Inmediatas

1. ✅ **IMPLEMENTAR** cancelación en componentes:
   - `enviostockpendientes`: Botón "Rechazar Solicitud"
   - `stockpedido`: Botones "Cancelar Solicitud" y "Reportar Problema"

2. ✅ **USAR** estados específicos de cancelación:
   - `Cancel-Sol`: Cancelado por solicitante
   - `Cancel-Rech`: Rechazado por receptor
   - `En-Revision`: Problema reportado

3. ✅ **REQUERIR** motivos obligatorios para auditoría

4. ❌ **NO IMPLEMENTAR** eliminación física de registros

5. ❌ **NO PERMITIR** cancelación de estados "Enviado" o "Recibido"

### Beneficios Esperados

- 🎯 Reducción de errores operativos
- 📊 Mejor trazabilidad y auditoría
- 💬 Mejor comunicación entre sucursales
- 🔒 Mantenimiento de integridad de datos
- 📈 Base de datos para análisis de problemas

### Próximos Pasos

1. Revisar y aprobar este documento
2. Planificar sprint de desarrollo
3. Implementar en ambiente de desarrollo
4. Testing exhaustivo
5. Capacitación a usuarios
6. Despliegue a producción

---

## LECCIONES APRENDIDAS DURANTE LA IMPLEMENTACIÓN

### Problema Crítico: CHAR Padding en PostgreSQL

Durante la implementación se encontró un **problema crítico** que afectaba la visibilidad de los botones:

**Causa Raíz:**
- Los campos de tipo `CHAR(n)` en PostgreSQL **auto-rellenan con espacios** hasta completar el tamaño definido
- Ejemplo: campo `usuario CHAR(30)` con valor "luis" se guarda como `"luis                          "` (30 caracteres)
- Las comparaciones de strings fallaban:
  ```typescript
  // ❌ FALSO - No funciona
  "luis                          " === "luis"  // false

  // ✅ VERDADERO - Funciona con trim()
  "luis                          ".trim() === "luis"  // true
  ```

**Solución Implementada:**
```typescript
// En puedeCancelar getter:
const usuarioPedido = pedido.usuario ? pedido.usuario.trim() : '';
const estadoTrimmed = pedido.estado?.trim();
```

**Recomendación para Futuro:**
- Considerar migrar campos `CHAR` a `VARCHAR` para evitar este problema
- Siempre usar `.trim()` al comparar valores de campos `CHAR`

### Sistema de Roles Encriptado

El sistema guarda el rol del usuario **encriptado** en sessionStorage:

- **Clave**: `'sddffasdf'` (no `'userLevel'`)
- **Valores**: En minúsculas: `'super'`, `'admin'`, `'user'`
- **Requiere**: Inyectar `CryptoService` y desencriptar antes de usar

```typescript
const rolEncriptado = sessionStorage.getItem('sddffasdf');
const rol = rolEncriptado ? this._crypto.decrypt(rolEncriptado) : null;
if (rol === 'super' || rol === 'admin') { ... }
```

### Consistencia Backend-Frontend

Se aseguró que tanto backend (PHP) como frontend (TypeScript) usen los mismos valores:
- Roles: `'super'`, `'admin'`, `'user'` (minúsculas)
- Estados: Siempre aplicar `.trim()` antes de comparar
- Tipos de cancelación: `'solicitante'`, `'rechazado'`, `'problema'`

---

**Documento generado**: 2025-10-31
**Última actualización**: 2025-11-01
**Autor**: Análisis del sistema MOV.STOCK
**Versión**: 3.0
**Estado**: ✅ COMPLETADO Y PROBADO

### Historial de Cambios

**v3.0 (2025-11-01):**
- ✅ Implementación COMPLETADA y PROBADA en producción
- ✅ Backend: Función `CancelarPedido_post()` implementada en Descarga.php
- ✅ Frontend: Botones y lógica implementados en componentes
- ✅ Corregido problema crítico: CHAR padding en PostgreSQL
- ✅ Sistema de roles con desencriptación implementado correctamente
- ✅ Agregada sección "LECCIONES APRENDIDAS" con detalles técnicos
- ✅ Documento actualizado con estado COMPLETADO

**v2.0 (2025-10-31):**
- ✅ Marcada como completada la ampliación de campos `estado` a CHAR(25)
- ✅ Agregada sección "PERMISOS POR ROL" con definición completa
- ✅ Actualizado plan de implementación con estado actual
- ✅ Documento aprobado para implementación

**v1.0 (2025-10-31):**
- Análisis inicial y propuesta de implementación
