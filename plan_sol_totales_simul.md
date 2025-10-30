# Plan de Solución: Totales Temporales para Modo Consulta (Separación Real vs Simulación)

**Fecha**: 2025-10-25
**Versión**: 2.0 - REDISEÑADO
**Estado**: PENDIENTE IMPLEMENTACIÓN

---

## 📋 Descripción del Problema

### Síntomas Observados:

Cuando un item está en **Modo Consulta** (usuario cambió el tipo de pago para consultar otro precio):

1. ✅ El precio del item cambia correctamente en la vista
2. ❌ El **Total General** NO se actualiza con el nuevo precio temporal
3. ❌ Los **Subtotales por Tipo de Pago** NO muestran el nuevo método temporal

### Comportamiento Actual vs Deseado:

| Aspecto | Actual | Deseado |
|---------|--------|---------|
| Precio del item | ✅ Cambia | ✅ Cambia |
| Total General | ❌ No cambia | ✅ Debe mostrar simulación |
| Subtotales | ❌ No cambia | ✅ Debe mostrar simulación |
| Claridad | ❌ Confuso | ✅ Separar REAL vs TEMPORAL |

---

## 🎯 Nueva Estrategia: Separación Total Real vs Total Temporal

### Filosofía de Diseño:

En lugar de intentar modificar los totales reales (lo cual causa problemas de sincronización entre arrays), vamos a:

✅ **MANTENER** los totales actuales basados en valores ORIGINALES
✅ **AGREGAR** totales temporales basados en valores de CONSULTA
✅ **MOSTRAR AMBOS** para que el usuario vea la diferencia claramente

### Concepto Visual:

```
┌─────────────────────────────────────────────────────┐
│ TOTALES REALES (Datos Originales)                   │
├─────────────────────────────────────────────────────┤
│ Total: $13,784.75                                   │
│                                                     │
│ Subtotales por Tipo de Pago:                       │
│   • EFECTIVO: $4,483.24                            │
│   • TRANSFERENCIA EFECTIVO: $9,301.51             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ⚠️  SIMULACIÓN (Incluye Items en Consulta)         │
├─────────────────────────────────────────────────────┤
│ Total Temporal: $14,207.57                         │
│                                                     │
│ Subtotales Temporales:                             │
│   • EFECTIVO: $4,483.24                            │
│   • NARANJA 1 PAGO: $9,724.33  ← TEMPORAL          │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura de la Solución

### 1. Datos y Arrays

**Array Fuente (NO SE MODIFICA)**:
```typescript
itemsEnCarrito: any[] = [];  // Mantiene valores ORIGINALES siempre
```

**Array de Vista**:
```typescript
itemsConTipoPago: any[] = [];  // Puede tener valores TEMPORALES en consulta
```

### 2. Variables de Totales

**Totales Reales (EXISTENTES - NO MODIFICAR)**:
```typescript
suma: number = 0;  // Total basado en itemsEnCarrito (valores originales)
subtotalesPorTipoPago: Array<{tipoPago: string, subtotal: number}> = [];
```

**Totales Temporales (NUEVOS - AGREGAR)**:
```typescript
sumaTemporalSimulacion: number = 0;  // Total basado en itemsConTipoPago
subtotalesTemporalesSimulacion: Array<{tipoPago: string, subtotal: number}> = [];
hayItemsEnConsulta: boolean = false;  // Flag para mostrar/ocultar sección temporal
```

### 3. Funciones de Cálculo

**Función Existente (NO MODIFICAR)**:
```typescript
calculoTotal() {
  this.suma = 0;
  for (let item of this.itemsEnCarrito) {  // ← USA VALORES ORIGINALES
    this.suma += parseFloat((item.precio * item.cantidad).toFixed(2));
  }
  this.suma = parseFloat(this.suma.toFixed(2));

  if (this.tarjetas && this.tarjetas.length > 0) {
    this.subtotalesPorTipoPago = this.calcularSubtotalesPorTipoPago();
  }
}
```

**Función Nueva (AGREGAR)**:
```typescript
calcularTotalesTemporales() {
  // Solo calcular si hay items en consulta
  this.hayItemsEnConsulta = this.hayItemsSoloConsulta();

  if (!this.hayItemsEnConsulta) {
    // Si no hay items en consulta, usar valores reales
    this.sumaTemporalSimulacion = this.suma;
    this.subtotalesTemporalesSimulacion = [...this.subtotalesPorTipoPago];
    return;
  }

  // Calcular total temporal basado en itemsConTipoPago
  this.sumaTemporalSimulacion = 0;
  for (let item of this.itemsConTipoPago) {  // ← USA VALORES TEMPORALES
    this.sumaTemporalSimulacion += parseFloat((item.precio * item.cantidad).toFixed(2));
  }
  this.sumaTemporalSimulacion = parseFloat(this.sumaTemporalSimulacion.toFixed(2));

  // Calcular subtotales temporales
  this.subtotalesTemporalesSimulacion = this.calcularSubtotalesTemporales();
}

calcularSubtotalesTemporales(): Array<{tipoPago: string, subtotal: number}> {
  if (!this.tarjetas || this.tarjetas.length === 0) {
    return [];
  }

  const tarjetaMap = new Map<string, string>();
  this.tarjetas.forEach((t: TarjCredito) => {
    tarjetaMap.set(t.cod_tarj.toString(), t.tarjeta);
  });

  const subtotales = new Map<string, number>();

  for (let item of this.itemsConTipoPago) {  // ← USA itemsConTipoPago
    const tipoPago = tarjetaMap.get(item.cod_tar?.toString() || '') || 'Indefinido';
    const montoItem = parseFloat((item.precio * item.cantidad).toFixed(2));

    if (subtotales.has(tipoPago)) {
      subtotales.set(tipoPago, subtotales.get(tipoPago)! + montoItem);
    } else {
      subtotales.set(tipoPago, montoItem);
    }
  }

  return Array.from(subtotales.entries())
    .map(([tipoPago, subtotal]) => ({
      tipoPago,
      subtotal: parseFloat(subtotal.toFixed(2))
    }))
    .sort((a, b) => {
      if (a.tipoPago === 'Indefinido') return 1;
      if (b.tipoPago === 'Indefinido') return -1;
      return a.tipoPago.localeCompare(b.tipoPago);
    });
}
```

---

## 📝 Cambios en el Código

### 1. carrito.component.ts

#### Agregar Variables (después de línea ~70):

```typescript
// ════════════════════════════════════════════════════════════
// Totales Temporales para Modo Consulta
// ════════════════════════════════════════════════════════════
sumaTemporalSimulacion: number = 0;
subtotalesTemporalesSimulacion: Array<{tipoPago: string, subtotal: number}> = [];
hayItemsEnConsulta: boolean = false;
```

#### Modificar onTipoPagoChange() (agregar al final, antes de console.log de cierre):

```typescript
onTipoPagoChange(item: any, event: any): void {
  // ... código existente ...

  // Recalcular totales y actualizar sessionStorage
  this.calculoTotal();  // ← MANTENER (calcula totales reales)
  this.calcularTotalesTemporales();  // ← NUEVO (calcula totales temporales)
  this.actualizarSessionStorage();

  console.log('🔄 ════════════════════════════════════════════════════\n');
}
```

#### Modificar revertirItemAOriginal() (agregar después de calculoTotal()):

```typescript
revertirItemAOriginal(item: any): void {
  // ... código existente ...

  // Recalcular totales y actualizar sessionStorage
  this.calculoTotal();
  this.calcularTotalesTemporales();  // ← NUEVO
  this.actualizarSessionStorage();

  // ... resto del código ...
}
```

#### Modificar actualizarCantidad() (agregar después de calculoTotal()):

```typescript
actualizarCantidad(item: any, nuevaCantidad: number) {
  // ... código existente ...

  this.calculoTotal();
  this.calcularTotalesTemporales();  // ← NUEVO
  this.actualizarSessionStorage();
}
```

#### Modificar eliminarItem() (agregar después de calculoTotal()):

```typescript
eliminarItem(item: any) {
  // ... código existente ...

  this.calculoTotal();
  this.calcularTotalesTemporales();  // ← NUEVO
  this.actualizarSessionStorage();
}
```

---

### 2. carrito.component.html

#### Modificar sección de Total (después de línea ~87):

**ANTES**:
```html
<div class="total-summary">
    <div class="total-price">Total: ${{suma | currencyFormat}}</div>
</div>
```

**DESPUÉS**:
```html
<div class="total-summary">
    <div class="total-price">
        Total: ${{suma | currencyFormat}}
        <span *ngIf="hayItemsEnConsulta" class="badge badge-info ml-2"
              pTooltip="Total basado en métodos de pago originales">
            REAL
        </span>
    </div>
</div>

<!-- NUEVO: Total Temporal cuando hay items en consulta -->
<div class="total-summary-temporal" *ngIf="hayItemsEnConsulta">
    <div class="total-temporal-header">
        <i class="pi pi-calculator"></i>
        <span>Total Temporal (Simulación)</span>
    </div>
    <div class="total-price-temporal">
        ${{sumaTemporalSimulacion | currencyFormat}}
        <small class="text-muted d-block" style="font-size: 0.7rem; font-weight: 400;">
            Incluye precios de consulta
        </small>
    </div>
</div>
```

#### Modificar sección de Subtotales (después de línea ~90):

**DESPUÉS de la sección de subtotales existente, AGREGAR**:

```html
<!-- NUEVO: Subtotales Temporales cuando hay items en consulta -->
<div class="subtotales-section subtotales-temporales" *ngIf="hayItemsEnConsulta && subtotalesTemporalesSimulacion.length > 0">
    <div class="subtotales-header temporal-header">
        <h5 class="subtotales-title">
            <i class="pi pi-calculator"></i>
            Subtotales Temporales (Simulación)
        </h5>
        <small class="text-muted">Incluye items en modo consulta</small>
    </div>
    <div class="subtotales-list">
        <div class="subtotal-item subtotal-temporal"
             *ngFor="let subtotal of subtotalesTemporalesSimulacion"
             [ngClass]="{'indefinido': subtotal.tipoPago === 'Indefinido'}">
            <span class="subtotal-tipo">
                {{subtotal.tipoPago}}
                <!-- Marcar si es diferente del real -->
                <span *ngIf="esDiferenteDelReal(subtotal.tipoPago)"
                      class="badge badge-warning badge-xs ml-1">
                    SIMULADO
                </span>
            </span>
            <span class="subtotal-monto">${{subtotal.subtotal | currencyFormat}}</span>
        </div>
    </div>
</div>
```

---

### 3. carrito.component.css

#### Agregar Estilos para Totales Temporales:

```css
/* ════════════════════════════════════════════════════════════
   TOTALES TEMPORALES - SIMULACIÓN
   ════════════════════════════════════════════════════════════ */

/* Sección de Total Temporal */
.total-summary-temporal {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 15px 20px;
  margin-top: 15px;
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
}

.total-temporal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #856404;
  font-weight: 600;
  margin-bottom: 8px;
}

.total-temporal-header i {
  font-size: 1.1rem;
  color: #ff9800;
}

.total-price-temporal {
  font-size: 1.5rem;
  color: #f57c00;
  font-weight: 700;
  text-align: right;
}

/* Badge REAL en total */
.total-price .badge-info {
  font-size: 0.65rem;
  padding: 2px 6px;
  vertical-align: super;
}

/* Subtotales Temporales */
.subtotales-temporales {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: 2px solid #ffb300;
  margin-top: 20px;
}

.subtotales-temporales .temporal-header {
  border-bottom: 2px solid #ff9800;
}

.subtotales-temporales .subtotales-title {
  color: #e65100;
  display: flex;
  align-items: center;
  gap: 10px;
}

.subtotales-temporales .subtotales-title i {
  color: #ff9800;
}

.subtotal-temporal {
  background-color: #fffde7;
  border-left-color: #ff9800;
}

.subtotal-temporal:hover {
  background-color: #fff9c4;
}

.badge-xs {
  font-size: 0.65rem;
  padding: 2px 4px;
}

/* Responsive */
@media (max-width: 767px) {
  .total-price-temporal {
    font-size: 1.2rem;
  }

  .total-temporal-header {
    font-size: 0.8rem;
  }
}
```

---

## 🔧 Funciones Auxiliares

### Agregar en carrito.component.ts:

```typescript
/**
 * Verifica si un tipo de pago en simulación es diferente del real
 * Se usa para marcar con badge los tipos de pago que cambiaron
 */
esDiferenteDelReal(tipoPagoTemporal: string): boolean {
  // Buscar si existe en subtotales reales
  const existeEnReal = this.subtotalesPorTipoPago.some(
    st => st.tipoPago === tipoPagoTemporal
  );

  if (!existeEnReal) {
    return true;  // Es nuevo, no existía en real
  }

  // Verificar si el monto es diferente
  const subtotalReal = this.subtotalesPorTipoPago.find(
    st => st.tipoPago === tipoPagoTemporal
  );
  const subtotalTemporal = this.subtotalesTemporalesSimulacion.find(
    st => st.tipoPago === tipoPagoTemporal
  );

  if (subtotalReal && subtotalTemporal) {
    return subtotalReal.subtotal !== subtotalTemporal.subtotal;
  }

  return false;
}
```

---

## ✅ Ventajas de Esta Solución

### 1. Seguridad
✅ NO modifica `itemsEnCarrito` (fuente de verdad)
✅ NO afecta la lógica de guardado en sessionStorage
✅ NO interfiere con la finalización de venta

### 2. Claridad
✅ Usuario ve claramente qué es REAL y qué es SIMULACIÓN
✅ Puede comparar ambos valores fácilmente
✅ No hay confusión sobre qué se va a facturar

### 3. Mantenibilidad
✅ Código limpio y separado
✅ Fácil de testear
✅ No introduce bugs en código existente

### 4. Funcionalidad
✅ Muestra totales temporales solo cuando hay items en consulta
✅ Se actualiza automáticamente al cambiar tipos de pago
✅ Vuelve a ocultarse al revertir todos los items

---

## 🧪 Plan de Testing

### Test Case 1: Sin Items en Consulta
**Pasos**:
1. Agregar producto con EFECTIVO
2. Verificar que NO aparece sección "Total Temporal"
3. Verificar que solo se muestra el total real

**Resultado esperado**: ✅ Sin sección temporal

---

### Test Case 2: Item en Consulta
**Pasos**:
1. Agregar producto con TRANSFERENCIA EFECTIVO ($9,301.51)
2. Cambiar a NARANJA 1 PAGO ($9,724.33)
3. Verificar totales

**Resultado esperado**:
```
Total: $9,301.51 [REAL]

⚠️  SIMULACIÓN
Total Temporal: $9,724.33
Subtotales Temporales:
  • NARANJA 1 PAGO: $9,724.33 [SIMULADO]
```

---

### Test Case 3: Múltiples Items, Solo Uno en Consulta
**Pasos**:
1. Item A: EFECTIVO ($4,483.24) - SIN cambiar
2. Item B: TRANSFERENCIA → NARANJA ($9,301.51 → $9,724.33)

**Resultado esperado**:
```
Total: $13,784.75 [REAL]

⚠️  SIMULACIÓN
Total Temporal: $14,207.57
Subtotales Temporales:
  • EFECTIVO: $4,483.24
  • NARANJA 1 PAGO: $9,724.33 [SIMULADO]
```

---

### Test Case 4: Revertir Item
**Pasos**:
1. Tener item en consulta (sección temporal visible)
2. Hacer clic en "Revertir"
3. Verificar que sección temporal desaparece

**Resultado esperado**: ✅ Solo total real visible

---

## 📊 Checklist de Implementación

### Fase 1: Variables y Funciones
- [ ] Agregar variables `sumaTemporalSimulacion`, `subtotalesTemporalesSimulacion`, `hayItemsEnConsulta`
- [ ] Implementar `calcularTotalesTemporales()`
- [ ] Implementar `calcularSubtotalesTemporales()`
- [ ] Implementar `esDiferenteDelReal()`

### Fase 2: Integración en Funciones Existentes
- [ ] Agregar llamada en `onTipoPagoChange()`
- [ ] Agregar llamada en `revertirItemAOriginal()`
- [ ] Agregar llamada en `actualizarCantidad()`
- [ ] Agregar llamada en `eliminarItem()`

### Fase 3: HTML
- [ ] Modificar sección de Total (agregar badge REAL)
- [ ] Agregar sección de Total Temporal
- [ ] Agregar sección de Subtotales Temporales

### Fase 4: CSS
- [ ] Agregar estilos para `.total-summary-temporal`
- [ ] Agregar estilos para `.subtotales-temporales`
- [ ] Agregar estilos para badges

### Fase 5: Testing
- [ ] Test Case 1: Sin items en consulta
- [ ] Test Case 2: Item en consulta
- [ ] Test Case 3: Múltiples items
- [ ] Test Case 4: Revertir item
- [ ] Test Case 5: Cambiar cantidad de item en consulta
- [ ] Test Case 6: Eliminar item en consulta

---

## 🚀 Próximos Pasos

1. **Revisar y aprobar** este plan
2. **Implementar** las funciones en TypeScript
3. **Actualizar** el HTML
4. **Agregar** los estilos CSS
5. **Testing** exhaustivo
6. **Documentar** en plan_v4.0_F3.md

---

**Ventaja Principal**: Esta solución es **NO INVASIVA** - no toca la lógica existente de totales, solo agrega una capa paralela de visualización.
