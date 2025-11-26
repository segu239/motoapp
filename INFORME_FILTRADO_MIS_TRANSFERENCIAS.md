# INFORME: Filtrado de "Altas" en Mis Transferencias

**Fecha:** 17 de noviembre de 2025
**Componente Afectado:** `/mis-transferencias`
**Problema:** El componente muestra TODAS las transferencias incluyendo las "altas" recién creadas

---

## 📋 RESUMEN EJECUTIVO

El componente `mis-transferencias` actualmente **NO filtra** las transferencias por estado, mostrando todos los registros de la tabla `pedidoitem` donde la sucursal actual es el origen (`sucursald`). Esto incluye transferencias recién creadas ("altas") que deberían mostrarse únicamente en los componentes especializados de alta (`pedir-stock` y `ofrecer-stock`).

---

## 🔍 ANÁLISIS DETALLADO

### Componente: `/mis-transferencias`

**Ubicación:** `src/app/components/mis-transferencias/mis-transferencias.component.ts`

**Función de carga actual (líneas 85-122):**
```typescript
cargarMisTransferencias(): void {
    this.loading = true;

    // Obtener transferencias donde MI sucursal es el ORIGEN (sucursald)
    this._cargardata.obtenerPedidoItemPorSucursal(this.sucursalActual.toString())
      .subscribe({
        next: (response: any) => {
          console.log('Mis transferencias recibidas:', response);

          if (response && response.mensaje) {
            // ❌ PROBLEMA: NO HAY FILTRO POR ESTADO
            this.transferencias = response.mensaje.map((t: any) => ({
              ...t,
              tipo_transferencia_display: this.getTipoDisplay(t),
              estado_display: t.estado?.trim(),
              // ... otros campos
            }));
          }
        }
      });
}
```

**Problema identificado:**
- ❌ **NO aplica filtro por estado**
- ❌ Muestra transferencias recién creadas (estado "Solicitado" u "Ofrecido")
- ❌ Duplica funcionalidad con los componentes de alta

### Estados de Transferencias

| Estado | Descripción | Componente que debería mostrarlo |
|--------|-------------|----------------------------------|
| **Solicitado** | Transferencia PULL recién creada | `pedir-stock` (alta) |
| **Ofrecido** | Transferencia PUSH recién creada | `ofrecer-stock` (alta) |
| **Aceptado** | Transferencia aceptada, pendiente confirmación | `mis-transferencias` ✅ |
| **Recibido** | Transferencia completada | `mis-transferencias` ✅ |
| **Rechazado** | Transferencia rechazada | `mis-transferencias` ✅ |
| **Cancelado** | Transferencia cancelada | `mis-transferencias` ✅ |

---

## 📊 COMPARACIÓN CON OTROS COMPONENTES

### ✅ Componentes que filtran CORRECTAMENTE:

#### 1. **transferencias-pendientes** (líneas 79-82)
```typescript
// Filtrar solo las que están pendientes (Solicitado u Ofrecido)
this.transferencias = response.mensaje.filter((t: any) =>
  t.estado?.trim() === 'Solicitado' || t.estado?.trim() === 'Ofrecido'
);
```
**Propósito:** Mostrar transferencias RECIBIDAS (donde MI sucursal es destino) que requieren aceptación/rechazo.

#### 2. **stockpedido** (Legacy - línea 140)
```typescript
this.pedidoItem = data.mensaje.filter((item: any) =>
  item.estado.trim() === 'Solicitado' || item.estado.trim() === 'Solicitado-E'
);
```
**Propósito:** Mostrar solicitudes pendientes (componente legacy del sistema v1).

#### 3. **stockrecibo** (Legacy - líneas 135-137)
```typescript
this.pedidoItem = data.mensaje.filter((item: any) => {
  const estado = item.estado.trim();
  return estado === 'Enviado' || estado === 'Recibido';
});
```
**Propósito:** Mostrar envíos y recepciones (componente legacy del sistema v1).

### ❌ Componente CON PROBLEMA:

#### **mis-transferencias**
- NO aplica ningún filtro por estado
- Muestra TODAS las transferencias creadas por MI sucursal
- Incluye "altas" que ya están en `pedir-stock` y `ofrecer-stock`

---

## 🎯 PROPÓSITO DE CADA COMPONENTE

### Sistema V2 (Actual - Nuevo):

| Componente | Propósito | Filtro Actual | ¿Correcto? |
|------------|-----------|---------------|------------|
| **pedir-stock** | ALTA: Crear solicitudes PULL | N/A (es formulario de alta) | ✅ |
| **ofrecer-stock** | ALTA: Crear ofertas PUSH | N/A (es formulario de alta) | ✅ |
| **transferencias-pendientes** | Ver transferencias RECIBIDAS pendientes | `Solicitado` o `Ofrecido` | ✅ |
| **mis-transferencias** | Ver transferencias ENVIADAS | ❌ NINGUNO | ❌ **INCORRECTO** |

### Sistema V1 (Legacy):

| Componente | Propósito | Filtro Actual | ¿Correcto? |
|------------|-----------|---------------|------------|
| **stockpedido** | Ver solicitudes pendientes | `Solicitado` o `Solicitado-E` | ✅ |
| **stockrecibo** | Ver envíos y recepciones | `Enviado` o `Recibido` | ✅ |

---

## ✅ SOLUCIÓN RECOMENDADA

### Opción 1: Filtrar estados POST-ACEPTACIÓN (Recomendada)

**Objetivo:** Mostrar solo transferencias que ya fueron procesadas, excluyendo las "altas".

**Modificación en `mis-transferencias.component.ts` (línea 95):**

```typescript
if (response && response.mensaje) {
  // ✅ SOLUCIÓN: Filtrar estados post-aceptación
  this.transferencias = response.mensaje
    .filter((t: any) => {
      const estado = t.estado?.trim();
      // Excluir estados de "alta" (recién creados)
      return estado !== 'Solicitado' && estado !== 'Ofrecido';
    })
    .map((t: any) => ({
      ...t,
      tipo_transferencia_display: this.getTipoDisplay(t),
      estado_display: t.estado?.trim(),
      fecha_aceptacion: t.fecha_aceptacion || null,
      fecha_confirmacion: t.fecha_confirmacion || null,
      usuario_aceptacion: t.usuario_aceptacion || null,
      usuario_confirmacion: t.usuario_confirmacion || null
    }));
}
```

**Estados que se mostrarán:**
- ✅ `Aceptado` - Transferencias aceptadas pendientes de confirmación
- ✅ `Recibido` - Transferencias completadas
- ✅ `Rechazado` - Transferencias rechazadas
- ✅ `Cancelado` - Transferencias canceladas

**Estados que se ocultarán:**
- ❌ `Solicitado` - Transferencias PULL recién creadas (se ven en `pedir-stock`)
- ❌ `Ofrecido` - Transferencias PUSH recién creadas (se ven en `ofrecer-stock`)

---

### Opción 2: Filtrar solo estados FINALIZADOS (Alternativa)

Si solo se desean ver transferencias completadas:

```typescript
if (response && response.mensaje) {
  // Mostrar solo transferencias finalizadas
  this.transferencias = response.mensaje
    .filter((t: any) => {
      const estado = t.estado?.trim();
      return estado === 'Recibido' || estado === 'Rechazado' || estado === 'Cancelado';
    })
    .map((t: any) => ({
      // ... mismo mapeo
    }));
}
```

---

## 📝 PLAN DE IMPLEMENTACIÓN

### Paso 1: Modificar el componente

**Archivo:** `src/app/components/mis-transferencias/mis-transferencias.component.ts`

**Cambio:**
```typescript
// ANTES (línea 95)
this.transferencias = response.mensaje.map((t: any) => ({

// DESPUÉS (línea 95)
this.transferencias = response.mensaje
  .filter((t: any) => {
    const estado = t.estado?.trim();
    return estado !== 'Solicitado' && estado !== 'Ofrecido';
  })
  .map((t: any) => ({
```

### Paso 2: Actualizar el filtro de estados

**Archivo:** `src/app/components/mis-transferencias/mis-transferencias.component.ts` (línea 66)

**Cambio:**
```typescript
// ANTES
this.estadosFiltro = [
  { label: 'Todas', value: 'Todas' },
  { label: 'Solicitado', value: 'Solicitado' },    // ← ELIMINAR
  { label: 'Ofrecido', value: 'Ofrecido' },        // ← ELIMINAR
  { label: 'Aceptado', value: 'Aceptado' },
  { label: 'Recibido', value: 'Recibido' },
  { label: 'Rechazado', value: 'Rechazado' },
  { label: 'Cancelado', value: 'Cancelado' }
];

// DESPUÉS
this.estadosFiltro = [
  { label: 'Todas', value: 'Todas' },
  { label: 'Aceptado', value: 'Aceptado' },
  { label: 'Recibido', value: 'Recibido' },
  { label: 'Rechazado', value: 'Rechazado' },
  { label: 'Cancelado', value: 'Cancelado' }
];
```

### Paso 3: Pruebas

1. **Crear una nueva solicitud** en `/pedir-stock`
   - ✅ Debe aparecer en componentes de alta
   - ❌ NO debe aparecer en `/mis-transferencias`

2. **Crear una nueva oferta** en `/ofrecer-stock`
   - ✅ Debe aparecer en componentes de alta
   - ❌ NO debe aparecer en `/mis-transferencias`

3. **Aceptar una transferencia** en `/transferencias-pendientes`
   - ✅ Debe aparecer en `/mis-transferencias` con estado "Aceptado"

4. **Verificar estados finales**
   - ✅ Recibido, Rechazado, Cancelado deben aparecer en `/mis-transferencias`

---

## 🚨 IMPACTO DE NO IMPLEMENTAR

Si no se implementa esta solución:

1. **Confusión de usuarios:** Verán las mismas transferencias en múltiples pantallas
2. **Duplicación de información:** Las "altas" aparecen en 2 lugares diferentes
3. **Posibles errores de operación:** Usuario puede intentar cancelar desde el lugar incorrecto
4. **Inconsistencia con el diseño:** Los componentes de alta pierden su propósito

---

## ✅ VERIFICACIÓN POST-IMPLEMENTACIÓN

Después de aplicar los cambios, verificar:

- [ ] `/mis-transferencias` NO muestra transferencias en estado "Solicitado"
- [ ] `/mis-transferencias` NO muestra transferencias en estado "Ofrecido"
- [ ] `/mis-transferencias` SÍ muestra transferencias en estado "Aceptado"
- [ ] `/mis-transferencias` SÍ muestra transferencias en estado "Recibido"
- [ ] `/mis-transferencias` SÍ muestra transferencias en estado "Rechazado"
- [ ] `/mis-transferencias` SÍ muestra transferencias en estado "Cancelado"
- [ ] Los filtros de estado funcionan correctamente
- [ ] No hay errores en consola

---

## 📌 CONCLUSIÓN

El componente `/mis-transferencias` requiere un filtro por estado para excluir las transferencias recién creadas ("altas"), que ya tienen sus propios componentes especializados (`pedir-stock` y `ofrecer-stock`). La solución recomendada es **Opción 1**, que excluye los estados "Solicitado" y "Ofrecido", manteniendo así la separación clara entre componentes de alta y componentes de gestión/seguimiento.

---

**Archivos a modificar:**
- `src/app/components/mis-transferencias/mis-transferencias.component.ts`

**Líneas específicas:**
- Línea 95: Agregar filtro
- Línea 66-74: Actualizar lista de filtros de estados
