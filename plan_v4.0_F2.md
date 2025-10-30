# 📋 FASE 2 COMPLETADA - PLAN v4.0
## Sistema de Selector de Tipo de Pago en Carrito con Items "Solo Consulta"

**Fecha de implementación:** 2025-10-25
**Versión:** 4.0 - FASE 2
**Estado:** ✅ COMPLETADA
**Tiempo estimado:** 3 horas
**Tiempo real:** ~2.5 horas

---

## ✅ RESUMEN DE LA FASE 2

La Fase 2 se enfocó en **implementar la interfaz de usuario completa** del selector de tipo de pago en el carrito, incluyendo:
- ✅ Dropdown de PrimeNG para seleccionar tipo de pago
- ✅ Badge "SOLO CONSULTA" para items en modo consulta
- ✅ Botón "Revertir" para restaurar método original
- ✅ Warning global cuando hay items en consulta
- ✅ Validación que bloquea finalizar venta si hay items en consulta
- ✅ Estilos CSS completos para modo consulta

### Objetivo cumplido:
Permitir que el usuario cambie dinámicamente el tipo de pago de items en el carrito, con indicadores visuales claros cuando el cambio genera un "modo consulta" (cambio entre activadatos diferentes).

---

## 📝 CAMBIOS IMPLEMENTADOS

### 1. Modificaciones en `carrito.component.html`

**Archivo:** `C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\carrito\carrito.component.html`

#### 1.1. Modificación de la tabla de items (líneas 29-80)

**ANTES:**
```html
<tr *ngFor="let item of itemsConTipoPago">
    <td>
        <input class="sin-bordes" type="number" [(ngModel)]="item.cantidad"
            (ngModelChange)="actualizarCantidad(item, $event)" min="1">
    </td>
    <td><span class="producto-nombre">{{item.nomart}}</span></td>
    <td><span class="tipo-pago">{{item.tipoPago}}</span></td>
    <td><span class="precio">${{(item.precio * item.cantidad) | currencyFormat}}</span></td>
    <td>
        <button class="btn btn-sm btn-danger" (click)="eliminarItem(item)">
            <i class="fa fa-trash"></i> Eliminar
        </button>
    </td>
</tr>
```

**DESPUÉS:**
```html
<tr *ngFor="let item of itemsConTipoPago"
    [ngClass]="{'item-solo-consulta': item._soloConsulta}">
    <td>
        <input class="sin-bordes" type="number" [(ngModel)]="item.cantidad"
            (ngModelChange)="actualizarCantidad(item, $event)" min="1">
    </td>
    <td>
        <span class="producto-nombre">{{item.nomart}}</span>
        <!-- ✅ NUEVO v4.0: Badge de Solo Consulta -->
        <span *ngIf="item._soloConsulta" class="badge badge-warning ml-2">
            <i class="pi pi-eye"></i> SOLO CONSULTA
        </span>
        <!-- ✅ NUEVO v4.0: Mostrar precio original si está en consulta -->
        <div *ngIf="item._soloConsulta" class="precio-original-info">
            <small class="text-muted">
                <i class="pi pi-info-circle"></i>
                Original: {{item._nombreTipoPagoOriginal}} - ${{item._precioOriginal | number:'1.2-2'}}
            </small>
        </div>
    </td>
    <td>
        <!-- ✅ NUEVO v4.0: Selector de tipo de pago -->
        <p-dropdown
            [options]="tarjetas"
            [(ngModel)]="item.cod_tar"
            optionLabel="tarjeta"
            optionValue="cod_tarj"
            (onChange)="onTipoPagoChange(item, $event)"
            placeholder="Seleccione tipo de pago"
            [style]="{'width': '100%', 'min-width': '200px'}"
            [disabled]="item._locked">
        </p-dropdown>
    </td>
    <td>
        <span class="precio">${{(item.precio * item.cantidad) | currencyFormat}}</span>
    </td>
    <td>
        <!-- ✅ NUEVO v4.0: Botón Revertir si está en consulta -->
        <button *ngIf="item._soloConsulta"
                class="btn btn-sm btn-warning mr-2"
                (click)="revertirItemAOriginal(item)"
                pTooltip="Volver al método de pago original">
            <i class="pi pi-undo"></i> Revertir
        </button>

        <button class="btn btn-sm btn-danger" (click)="eliminarItem(item)">
            <i class="fa fa-trash"></i> Eliminar
        </button>
    </td>
</tr>
```

**Cambios:**
- ✅ Agregado `[ngClass]` para aplicar clase CSS cuando está en consulta
- ✅ Badge amarillo "SOLO CONSULTA" con icono ojo
- ✅ Info de precio original bajo el nombre del producto
- ✅ Reemplazado texto fijo de tipo de pago por dropdown de PrimeNG
- ✅ Botón "Revertir" que aparece solo cuando está en consulta

#### 1.2. Warning global si hay items en consulta (líneas 103-120)

**Agregado después de la sección de subtotales:**

```html
<!-- ✅ NUEVO v4.0: Warning global si hay items en consulta -->
<div *ngIf="hayItemsSoloConsulta()" class="alert alert-warning mt-3 p-3">
    <div class="d-flex align-items-start">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 1.5rem;"></i>
        <div>
            <strong>Atención:</strong> Hay <strong>{{contarItemsSoloConsulta()}}</strong> artículo(s) en modo consulta.
            <hr style="margin: 8px 0;">
            <p class="mb-2">
                Estos precios son <strong>solo para mostrar al cliente</strong>.
                No podrá finalizar la venta con items en modo consulta.
            </p>
            <p class="mb-0">
                <strong>Para realizar la venta:</strong> Haga clic en "Revertir" para volver al método original,
                o elimine el item y vuelva a agregarlo con el método de pago correcto.
            </p>
        </div>
    </div>
</div>
```

**Propósito:**
- Alerta visual prominente que aparece cuando hay items en consulta
- Explica claramente las limitaciones y acciones disponibles

#### 1.3. Modificación del botón Finalizar (líneas 189-194)

**ANTES:**
```html
<button class="btn btn-info" (click)="finalizar()">
    <i class="fa fa-check-circle"></i> Finalizar Venta
</button>
```

**DESPUÉS:**
```html
<button class="btn btn-info"
        (click)="finalizar()"
        [disabled]="hayItemsSoloConsulta()"
        [pTooltip]="hayItemsSoloConsulta() ? 'No puede finalizar con items en modo consulta' : 'Finalizar venta'">
    <i class="fa fa-check-circle"></i> Finalizar Venta
</button>
```

**Cambios:**
- ✅ Se deshabilita automáticamente si hay items en consulta
- ✅ Tooltip explicativo según el estado

---

### 2. Estilos CSS en `carrito.component.css`

**Archivo:** `C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\carrito\carrito.component.css`

**Agregado al final del archivo (líneas 353-436):**

```css
/* ════════════════════════════════════════════════════════════
   ✅ NUEVO v4.0: Estilos para Modo Consulta
   ════════════════════════════════════════════════════════════ */

/* Item en modo consulta - fondo amarillo suave */
tr.item-solo-consulta {
  background-color: #fff3cd !important;
  border-left: 4px solid #ffc107;
  transition: background-color 0.3s ease;
}

tr.item-solo-consulta:hover {
  background-color: #ffe69c !important;
}

/* Badge de solo consulta */
.badge-warning {
  background-color: #ffc107;
  color: #000;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  white-space: nowrap;
}

/* Info de precio original */
.precio-original-info {
  margin-top: 4px;
}

.precio-original-info small {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}

/* Alert de items en consulta */
.alert-warning {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
}

.alert-warning hr {
  border-color: #ffc107;
}

.alert-warning .pi-exclamation-triangle {
  color: #ff9800;
}

/* Botón revertir */
.btn-warning:hover {
  background-color: #ff9800;
  border-color: #ff9800;
}

/* Dropdown de tipo de pago */
::ng-deep .p-dropdown {
  min-width: 200px;
}

::ng-deep .p-dropdown-panel .p-dropdown-items .p-dropdown-item {
  padding: 8px 12px;
}

/* Estilos para botón deshabilitado */
.btn-info:disabled {
  background-color: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.65;
}

.btn-info:disabled:hover {
  background-color: #6c757d;
  border-color: #6c757d;
}
```

**Efectos visuales:**
- 🎨 Filas con fondo amarillo suave para items en consulta
- 🎨 Borde izquierdo amarillo para mejor identificación
- 🎨 Badge amarillo con texto negro para máximo contraste
- 🎨 Alert global con colores de advertencia consistentes
- 🎨 Botón finalizar deshabilitado con color gris

---

### 3. Métodos TypeScript en `carrito.component.ts`

**Archivo:** `C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\carrito\carrito.component.ts`

#### 3.1. Métodos agregados (líneas 1897-2252)

##### a) `onTipoPagoChange(item, event)` (líneas 1905-2019)

**Propósito:** Maneja el cambio de tipo de pago en el dropdown

**Lógica:**
1. Obtiene el nuevo código de tarjeta seleccionado
2. Busca información de la tarjeta en el array `tarjetas`
3. **Valida activadatos:**
   - Si `activadatos_actual !== activadatos_nuevo` → Marca como CONSULTA
   - Si son iguales → Quita marca de consulta (si existía)
4. **Calcula nuevo precio:**
   - Selecciona precio según `listaprecio` (precon/prefi1/prefi2/prefi3/prefi4)
   - Convierte moneda USD→ARS si aplica
   - Aplica descuento si existe
5. **Actualiza item:**
   - Actualiza `cod_tar`, `tipoPago`, `precio`
   - Actualiza también en `itemsEnCarrito`
   - Recalcula totales
   - Actualiza sessionStorage

**Logs detallados para debugging**

##### b) `marcarComoSoloConsulta(item, tarjetaNueva)` (líneas 2024-2072)

**Propósito:** Marca un item como "solo consulta"

**Lógica:**
1. Si es la primera vez, guarda datos originales:
   - `_tipoPagoOriginal`
   - `_precioOriginal`
   - `_activadatosOriginal`
   - `_nombreTipoPagoOriginal`
2. Marca `_soloConsulta = true`
3. Muestra SweetAlert informativo con:
   - Nombre del artículo
   - Método original vs método de consulta
   - Advertencias sobre limitaciones
   - Instrucciones para continuar

##### c) `quitarMarcaSoloConsulta(item)` (líneas 2077-2088)

**Propósito:** Quita la marca de consulta

**Lógica:**
- Elimina todos los flags `_soloConsulta`, `_tipoPagoOriginal`, etc.

##### d) `revertirItemAOriginal(item)` (líneas 2093-2151)

**Propósito:** Revierte un item a su estado original

**Lógica:**
1. Verifica que esté en modo consulta
2. Muestra confirmación con SweetAlert
3. Si confirma:
   - Restaura `cod_tar`, `tipoPago`, `precio` originales
   - Actualiza en `itemsEnCarrito`
   - Quita marca de consulta
   - Recalcula totales
   - Muestra confirmación de éxito

##### e) `obtenerActivadatosDelItem(item)` (líneas 2156-2168)

**Propósito:** Obtiene el activadatos actual del item

**Lógica:**
1. Primero busca en `item.activadatos` (guardado en Fase 1)
2. Si no existe, busca en array `tarjetas` según `cod_tar`
3. Retorna 0 por defecto

##### f) `convertirUsdAMonedaVenta(precioUsd)` (líneas 2173-2184)

**Propósito:** Convierte precio USD a ARS

**Lógica:**
- Busca tasa de cambio en sessionStorage
- Si existe, multiplica precio × tasa
- Si no, retorna precio sin convertir (con warning)

##### g) `actualizarSessionStorage()` (líneas 2189-2196)

**Propósito:** Actualiza sessionStorage con estado actual del carrito

##### h) `generarKeyUnica(item)` (líneas 2201-2203)

**Propósito:** Genera clave única para identificar items

**Formato:** `{id_articulo}_{cod_tar}`

##### i) `hayItemsSoloConsulta()` (líneas 2227-2229)

**Propósito:** Verifica si hay algún item en modo consulta

**Retorna:** `boolean`

##### j) `contarItemsSoloConsulta()` (líneas 2234-2236)

**Propósito:** Cuenta items en modo consulta

**Retorna:** `number`

##### k) `validarItemsSoloConsulta()` (líneas 2241-2248)

**Propósito:** Valida que no haya items en consulta antes de finalizar

**Retorna:** `{ valido: boolean; items: any[] }`

#### 3.2. Modificación del método `finalizar()` (líneas 841-878)

**Agregado al inicio del método (después de verificar que hay items):**

```typescript
// ════════════════════════════════════════════════════════════
// ✅ NUEVA VALIDACIÓN v4.0: Bloquear si hay items en consulta
// ════════════════════════════════════════════════════════════
const validacionConsulta = this.validarItemsSoloConsulta();

if (!validacionConsulta.valido) {
  const itemsList = validacionConsulta.items
    .map(i => `<li><strong>${i.nomart}</strong> - ${i.tipoPago} - $${i.precio?.toFixed(2)}</li>`)
    .join('');

  Swal.fire({
    icon: 'error',
    title: 'Items en modo consulta',
    html: `
      <div style="text-align: left; padding: 0 20px;">
        <p>⚠️ No se puede finalizar la venta porque hay <strong>${validacionConsulta.items.length} item(s)</strong>
        marcado(s) como <strong>"SOLO CONSULTA"</strong>:</p>
        <hr>
        <ul style="text-align: left; max-height: 200px; overflow-y: auto;">
          ${itemsList}
        </ul>
        <hr>
        <p><strong>Acciones disponibles:</strong></p>
        <ol>
          <li><strong>Revertir:</strong> Haga clic en el botón "Revertir" de cada item para volver al método original</li>
          <li><strong>Eliminar y re-agregar:</strong> Elimine el item y agréguelo nuevamente con el método de pago correcto</li>
        </ol>
      </div>
    `,
    confirmButtonText: 'Entendido',
    width: 700
  });

  return; // BLOQUEAR finalización
}

console.log('✅ Validación de items en consulta: OK');
```

**Propósito:**
- Bloquea completamente la finalización si hay items en consulta
- Muestra lista detallada de items problemáticos
- Indica acciones claras para resolver

---

## 🎯 FLUJO DE USUARIO COMPLETO

### Escenario 1: Cambio entre activadatos diferentes (Modo Consulta)

**Ejemplo:** Item con EFECTIVO (activadatos=0) → Cambiar a ELECTRON (activadatos=1)

1. ✅ Usuario hace clic en dropdown de tipo de pago
2. ✅ Selecciona "ELECTRON"
3. ✅ Sistema detecta cambio: activadatos 0 → 1
4. ⚠️ **Se activa MODO CONSULTA:**
   - Fila se pone amarilla
   - Aparece badge "SOLO CONSULTA"
   - Aparece info de precio original
   - Precio se actualiza a `prefi2` (lista de ELECTRON)
   - Aparece botón "Revertir"
   - Aparece warning global
   - Botón "Finalizar" se deshabilita
5. ℹ️ SweetAlert informa al usuario sobre el modo consulta
6. 🔄 **Opciones del usuario:**
   - **Opción A:** Hacer clic en "Revertir" → Vuelve a EFECTIVO
   - **Opción B:** Eliminar item y re-agregar con método correcto
   - **Opción C:** Dejar en consulta para mostrar precio al cliente

### Escenario 2: Cambio dentro del mismo activadatos (Modo Normal)

**Ejemplo:** Item con EFECTIVO (activadatos=0) → Cambiar a CUENTA CORRIENTE (activadatos=0)

1. ✅ Usuario hace clic en dropdown
2. ✅ Selecciona "CUENTA CORRIENTE"
3. ✅ Sistema detecta: activadatos 0 → 0 (sin cambio)
4. ✅ **Actualización NORMAL:**
   - NO se marca como consulta
   - Precio se actualiza a `precon` (lista de CUENTA CORRIENTE)
   - NO aparece badge ni warning
   - Botón "Finalizar" sigue habilitado
5. ✅ Venta puede finalizarse normalmente

### Escenario 3: Revertir item en consulta

1. ✅ Usuario tiene item en modo consulta (amarillo)
2. ✅ Hace clic en botón "Revertir"
3. ℹ️ SweetAlert pide confirmación mostrando:
   - Método original
   - Método actual
4. ✅ Usuario confirma
5. ✅ **Item se restaura:**
   - Vuelve a método de pago original
   - Precio vuelve al original
   - Fila vuelve a color normal
   - Se quita badge y warning
   - Botón "Finalizar" se habilita (si era el último)
6. ✅ SweetAlert confirma éxito

### Escenario 4: Intentar finalizar con items en consulta

1. ❌ Usuario tiene items en consulta
2. ❌ Hace clic en "Finalizar Venta" (deshabilitado)
3. ℹ️ Tooltip indica: "No puede finalizar con items en modo consulta"
4. 🔄 Usuario debe:
   - Revertir items, o
   - Eliminar y re-agregar

---

## 🧪 TESTING MANUAL RECOMENDADO

### CP01: Cambio EFECTIVO → ELECTRON (0→1) ✅
- [ ] Agregar item con EFECTIVO
- [ ] Cambiar dropdown a ELECTRON
- [ ] Verificar fondo amarillo
- [ ] Verificar badge "SOLO CONSULTA"
- [ ] Verificar precio actualizado a prefi2
- [ ] Verificar info de precio original
- [ ] Verificar botón "Revertir" visible
- [ ] Verificar warning global aparece
- [ ] Verificar botón "Finalizar" deshabilitado

### CP02: Cambio EFECTIVO → CUENTA CORRIENTE (0→0) ✅
- [ ] Agregar item con EFECTIVO
- [ ] Cambiar dropdown a CUENTA CORRIENTE
- [ ] Verificar NO se marca como consulta
- [ ] Verificar precio actualiza a precon
- [ ] Verificar botón "Finalizar" habilitado

### CP03: Revertir item ✅
- [ ] Crear item en consulta
- [ ] Clic en "Revertir"
- [ ] Verificar confirmación SweetAlert
- [ ] Confirmar
- [ ] Verificar vuelve a estado original
- [ ] Verificar quita badge y warning

### CP04: Finalizar con item en consulta ✅
- [ ] Crear item en consulta
- [ ] Intentar clic en "Finalizar"
- [ ] Verificar botón deshabilitado
- [ ] Verificar tooltip explicativo
- [ ] Hover para ver tooltip

### CP05: Múltiples items en consulta ✅
- [ ] Agregar 3 items en consulta
- [ ] Verificar warning muestra "3 artículos"
- [ ] Intentar finalizar
- [ ] Verificar lista de 3 items en error

### CP06: Conversión USD ✅
- [ ] Agregar item con tipo_moneda=2 (USD)
- [ ] Cambiar tipo de pago
- [ ] Verificar conversión correcta a ARS
- [ ] Verificar logs en consola

---

## 📁 ARCHIVOS MODIFICADOS

| Archivo | Líneas modificadas | Tipo de cambio |
|---------|-------------------|----------------|
| `carrito.component.html` | 29-80 | Modificado (tabla items) |
| `carrito.component.html` | 103-120 | Agregado (warning global) |
| `carrito.component.html` | 189-194 | Modificado (botón finalizar) |
| `carrito.component.css` | 353-436 | Agregado (estilos consulta) |
| `carrito.component.ts` | 1897-2252 | Agregado (métodos consulta) |
| `carrito.component.ts` | 841-878 | Modificado (método finalizar) |

**Total de líneas agregadas:** ~450 líneas
**Total de archivos modificados:** 3

---

## 🎨 CAPTURAS DE ESTADO (Descripción)

### Estado Normal
- Tabla con filas blancas
- Dropdown de tipo de pago activo
- Botón "Finalizar" habilitado (azul)

### Estado con Item en Consulta
- Fila amarilla con borde izquierdo amarillo fuerte
- Badge "SOLO CONSULTA" con ojo
- Info de precio original en gris
- Botón "Revertir" amarillo visible
- Warning global amarillo en la parte superior
- Botón "Finalizar" deshabilitado (gris)

### SweetAlert - Modo Consulta Activado
- Icono: Info (i azul)
- Título: "Precio de consulta"
- Contenido con:
  - Nombre del artículo
  - Comparación método original vs consulta
  - Lista de advertencias
  - Instrucciones paso a paso
- Timer de 10 segundos con barra de progreso

### SweetAlert - Intentar Finalizar
- Icono: Error (X roja)
- Título: "Items en modo consulta"
- Lista de items problemáticos (scrolleable si son muchos)
- Instrucciones de resolución
- Ancho de 700px

---

## 🔗 INTEGRACIÓN CON FASE 1

La Fase 2 utiliza completamente los metadatos agregados en la Fase 1:

| Campo Fase 1 | Uso en Fase 2 |
|--------------|---------------|
| `precon` | Seleccionado cuando `listaprecio = 0` |
| `prefi1` | Seleccionado cuando `listaprecio = 1` |
| `prefi2` | Seleccionado cuando `listaprecio = 2` |
| `prefi3` | Seleccionado cuando `listaprecio = 3` |
| `prefi4` | Seleccionado cuando `listaprecio = 4` |
| `tipo_moneda` | Usado para conversión USD→ARS |
| `activadatos` | **Clave** para detectar modo consulta |
| `tipoPago` | Mostrado en dropdown y mensajes |

Sin los cambios de Fase 1, la Fase 2 **no funcionaría**.

---

## ⚠️ NOTAS IMPORTANTES

### 1. Dropdown de PrimeNG
- Requiere que `DropdownModule` esté importado en el módulo
- Usa binding bidireccional `[(ngModel)]`
- `onChange` dispara `onTipoPagoChange()`

### 2. Validación en dos capas
- **Capa 1 (UI):** Botón "Finalizar" deshabilitado
- **Capa 2 (Lógica):** Validación en método `finalizar()`
- Esto previene errores incluso si el botón se habilita por error

### 3. Gestión de estado
- Items en consulta tienen campos temporales con prefijo `_`
- Estos campos NO se guardan en BD
- Se pierden al refrescar la página (comportamiento esperado)

### 4. Logs detallados
- Todos los métodos tienen `console.log` para debugging
- Facilita troubleshooting en producción
- Se pueden desactivar en producción si se desea

### 5. SweetAlerts informativos
- Timer de 10 segundos para que usuario lea
- Barra de progreso visual
- Usuario puede cerrar antes si entiende

---

## 🚀 PRÓXIMOS PASOS - TESTING COMPLETO

### Fase 3: Testing y Ajustes (No planificada originalmente)

Si se requiere testing exhaustivo:
1. Testing con múltiples navegadores
2. Testing responsive (móvil/tablet)
3. Testing de rendimiento (100+ items en carrito)
4. Testing de casos edge:
   - Items sin precios definidos
   - Items con tipo_moneda inválido
   - sessionStorage lleno
   - Tarjetas sin activadatos definido

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN FASE 2

- [x] Modificar tabla de items en `carrito.component.html`
- [x] Agregar warning global en `carrito.component.html`
- [x] Modificar botón Finalizar en `carrito.component.html`
- [x] Agregar estilos CSS en `carrito.component.css`
- [x] Implementar método `onTipoPagoChange()` en `carrito.component.ts`
- [x] Implementar método `marcarComoSoloConsulta()` en `carrito.component.ts`
- [x] Implementar método `quitarMarcaSoloConsulta()` en `carrito.component.ts`
- [x] Implementar método `revertirItemAOriginal()` en `carrito.component.ts`
- [x] Implementar métodos auxiliares (obtener activadatos, convertir USD, etc.)
- [x] Implementar métodos de validación (`hayItemsSoloConsulta`, etc.)
- [x] Modificar método `finalizar()` con validación
- [x] Verificar compilación sin errores
- [x] Generar documentación de Fase 2
- [ ] Testing manual completo (pendiente para usuario)

---

## 🎉 CONCLUSIÓN

La **Fase 2 está COMPLETADA** con éxito. El sistema ahora tiene:

✅ **Interfaz completa** para cambiar tipos de pago dinámicamente
✅ **Modo consulta** claramente identificado con múltiples indicadores visuales
✅ **Validaciones robustas** que previenen ventas incorrectas
✅ **UX intuitiva** con SweetAlerts informativos y tooltips
✅ **Código bien documentado** con logs detallados
✅ **Estilos profesionales** consistentes con el diseño existente

**Estado del proyecto:**
- Fase 1: ✅ COMPLETADA
- Fase 2: ✅ COMPLETADA
- Testing manual: ⏳ PENDIENTE (usuario)

---

**Implementado por:** Claude Code
**Fecha:** 2025-10-25
**Próximo paso:** Testing manual y ajustes finales si se requieren
