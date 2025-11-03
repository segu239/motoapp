# Problema REAL: Subtotales Temporales Muestran Todos los Items

## Fecha
2025-10-30

## Resumen del Problema

**Problema**: Los "Subtotales Temporales (Simulación)" muestran TODOS los tipos de pago con badge SIMULADO, cuando deberían mostrar SOLO los tipos de pago de items en modo consulta.

---

## 1. Evidencia del Problema (Del PDF)

### Items en Carrito:
1. **ACOPLE FIL-AIRE C/CARB H.C-90** - Badge "SOLO CONSULTA" - ELECTRON: $9,724.33 ✅ (EN CONSULTA)
2. **ACOPLE FIL-AIRE C/CARB Y.CRYPT** - NARANJA 1 PAGO: $736,274.84 ❌ (NO en consulta)
3. **ACRIL. FAR. TRAS. Z. SOL** - EFECTIVO: $886.79 ❌ (NO en consulta)

### Resultado Actual (Incorrecto):

**Total Temporal (Simulación)**: $746,885.96 ❌
- Suma: $9,724.33 + $736,274.84 + $886.79 = $746,885.96
- **Problema**: Incluye TODOS los items

**Subtotales Temporales (Simulación)**:
- EFECTIVO: $886.79 (badge SIMULADO) ❌ **No debería aparecer**
- ELECTRON: $9,724.33 (badge SIMULADO) ✅ Correcto
- NARANJA 1 PAGO: $736,274.84 (badge SIMULADO) ❌ **No debería aparecer**

### Resultado Esperado (Correcto):

**Total Temporal (Simulación)**: $9,724.33 ✅
- Solo el item en consulta

**Subtotales Temporales (Simulación)**:
- ELECTRON: $9,724.33 (badge SIMULADO) ✅ **Único que debe aparecer**

---

## 2. Causa Raíz

### Lógica Incorrecta en `calcularTotalesTemporales()` (línea 763)

**Código actual**:
```typescript
calcularTotalesTemporales(): void {
  this.hayItemsEnConsulta = this.hayItemsSoloConsulta();

  if (!this.hayItemsEnConsulta) {
    this.sumaTemporalSimulacion = this.suma;
    this.subtotalesTemporalesSimulacion = [...this.subtotalesPorTipoPago];
    return;
  }

  // ❌ PROBLEMA: Suma TODOS los items
  this.sumaTemporalSimulacion = 0;
  for (let item of this.itemsConTipoPago) {  // ← TODOS
    this.sumaTemporalSimulacion += parseFloat((item.precio * item.cantidad).toFixed(2));
  }

  // ❌ PROBLEMA: Usa TODOS los items
  this.subtotalesTemporalesSimulacion = this.calcularSubtotalesTemporales();
}
```

### Lógica Incorrecta en `calcularSubtotalesTemporales()` (línea 789)

**Código actual**:
```typescript
calcularSubtotalesTemporales(): Array<{tipoPago: string, subtotal: number}> {
  const subtotales = new Map<string, number>();

  // ❌ PROBLEMA: Itera sobre TODOS los items
  for (let item of this.itemsConTipoPago) {  // ← TODOS
    const tipoPago = tarjetaMap.get(item.cod_tar?.toString() || '') || 'Indefinido';
    const montoItem = parseFloat((item.precio * item.cantidad).toFixed(2));

    if (subtotales.has(tipoPago)) {
      subtotales.set(tipoPago, subtotales.get(tipoPago)! + montoItem);
    } else {
      subtotales.set(tipoPago, montoItem);
    }
  }

  return Array.from(subtotales.entries())...;
}
```

**Problema**: No filtra por `item._soloConsulta === true`

---

## 3. Solución

### Paso 1: Filtrar Solo Items en Consulta

**Modificar `calcularTotalesTemporales()`** (línea 774-779):

```typescript
// ✅ CORRECTO: Calcular solo con items en consulta
this.sumaTemporalSimulacion = 0;
for (let item of this.itemsConTipoPago) {
  // Solo sumar items que están en modo consulta
  if (item._soloConsulta) {
    this.sumaTemporalSimulacion += parseFloat((item.precio * item.cantidad).toFixed(2));
  }
}
this.sumaTemporalSimulacion = parseFloat(this.sumaTemporalSimulacion.toFixed(2));
```

### Paso 2: Modificar `calcularSubtotalesTemporales()`

**Opción A**: Filtrar en el método (línea 804-816):

```typescript
// ✅ CORRECTO: Solo items en consulta
for (let item of this.itemsConTipoPago) {
  // Solo incluir items que están en modo consulta
  if (!item._soloConsulta) {
    continue;  // Saltar items que no están en consulta
  }

  const tipoPago = tarjetaMap.get(item.cod_tar?.toString() || '') || 'Indefinido';
  const montoItem = parseFloat((item.precio * item.cantidad).toFixed(2));

  if (subtotales.has(tipoPago)) {
    subtotales.set(tipoPago, subtotales.get(tipoPago)! + montoItem);
  } else {
    subtotales.set(tipoPago, montoItem);
  }
}
```

### Paso 3: Actualizar Lógica del Badge

El método `esDiferenteDelReal()` ya no es necesario cambiar, porque:
- Si un tipo de pago NO aparece en subtotales reales → badge SIMULADO (correcto)
- Si un tipo de pago aparece con monto diferente → badge SIMULADO (correcto)

Pero ahora solo aparecerán tipos de pago de items en consulta, por lo que los badges estarán correctos.

---

## 4. Plan de Implementación

### Archivo: `carrito.component.ts`

#### Cambio #1: Líneas 774-779 (método `calcularTotalesTemporales`)

**De**:
```typescript
// Calcular total temporal basado en itemsConTipoPago (incluye valores temporales)
this.sumaTemporalSimulacion = 0;
for (let item of this.itemsConTipoPago) {
  this.sumaTemporalSimulacion += parseFloat((item.precio * item.cantidad).toFixed(2));
}
this.sumaTemporalSimulacion = parseFloat(this.sumaTemporalSimulacion.toFixed(2));
```

**A**:
```typescript
// ✅ FIX: Calcular total temporal SOLO con items en modo consulta
this.sumaTemporalSimulacion = 0;
for (let item of this.itemsConTipoPago) {
  if (item._soloConsulta) {  // ← Solo items en consulta
    this.sumaTemporalSimulacion += parseFloat((item.precio * item.cantidad).toFixed(2));
  }
}
this.sumaTemporalSimulacion = parseFloat(this.sumaTemporalSimulacion.toFixed(2));
```

#### Cambio #2: Líneas 804-816 (método `calcularSubtotalesTemporales`)

**De**:
```typescript
for (let item of this.itemsConTipoPago) {  // ← USA itemsConTipoPago
  // Resolver tipo de pago usando el mapa pre-computado
  const tipoPago = tarjetaMap.get(item.cod_tar?.toString() || '') || 'Indefinido';

  // Calcular monto del item (precio * cantidad)
  const montoItem = parseFloat((item.precio * item.cantidad).toFixed(2));

  // Acumular en el subtotal correspondiente
  if (subtotales.has(tipoPago)) {
    subtotales.set(tipoPago, subtotales.get(tipoPago)! + montoItem);
  } else {
    subtotales.set(tipoPago, montoItem);
  }
}
```

**A**:
```typescript
for (let item of this.itemsConTipoPago) {
  // ✅ FIX: Solo incluir items en modo consulta
  if (!item._soloConsulta) {
    continue;  // Saltar items normales
  }

  // Resolver tipo de pago usando el mapa pre-computado
  const tipoPago = tarjetaMap.get(item.cod_tar?.toString() || '') || 'Indefinido';

  // Calcular monto del item (precio * cantidad)
  const montoItem = parseFloat((item.precio * item.cantidad).toFixed(2));

  // Acumular en el subtotal correspondiente
  if (subtotales.has(tipoPago)) {
    subtotales.set(tipoPago, subtotales.get(tipoPago)! + montoItem);
  } else {
    subtotales.set(tipoPago, montoItem);
  }
}
```

---

## 5. Resultado Después del Fix

### Con el ejemplo del PDF:

**Items:**
1. ACOPLE C/CARB H.C-90 - ELECTRON: $9,724.33 ✅ `_soloConsulta = true`
2. ACOPLE Y.CRYPT - NARANJA 1 PAGO: $736,274.84 ❌ `_soloConsulta = false`
3. ACRIL. FAR. - EFECTIVO: $886.79 ❌ `_soloConsulta = false`

**Total Temporal (Simulación)**: $9,724.33 ✅
- Solo suma el item 1 que tiene `_soloConsulta = true`

**Subtotales Temporales (Simulación)**:
- ELECTRON: $9,724.33 (badge SIMULADO) ✅
- (Los demás NO aparecen porque no tienen items en consulta)

**Subtotales por Tipo de Pago (Real)**:
- EFECTIVO: $886.79 ✅
- NARANJA 1 PAGO: $745,999.17 ✅ (item 1 original + item 2)

---

## 6. Pruebas Requeridas

### Test 1: Un Item en Consulta
1. Agregar 3 artículos
2. Cambiar tipo de pago de 1 artículo (activar consulta)
3. ✅ Verificar: Total Temporal = Solo el item en consulta
4. ✅ Verificar: Subtotales Temporales = Solo el tipo de pago del item en consulta

### Test 2: Múltiples Items en Consulta (Mismo Tipo de Pago)
1. Agregar 2 artículos con EFECTIVO
2. Cambiar ambos a NARANJA 1 PAGO (ambos en consulta)
3. ✅ Verificar: Total Temporal = Suma de ambos items
4. ✅ Verificar: Subtotales Temporales = NARANJA 1 PAGO (suma de ambos)

### Test 3: Múltiples Items en Consulta (Diferentes Tipos de Pago)
1. Agregar 3 artículos
2. Cambiar 2 a tipos de pago diferentes (ambos en consulta)
3. ✅ Verificar: Total Temporal = Suma de los 2 items en consulta
4. ✅ Verificar: Subtotales Temporales = 2 tipos de pago (cada uno con badge)

### Test 4: Eliminar Item en Consulta
1. Tener 2 items: 1 normal, 1 en consulta
2. Eliminar el item en consulta
3. ✅ Verificar: Panel "Total Temporal" desaparece
4. ✅ Verificar: Subtotales Temporales vacíos o panel oculto

---

## 7. Conclusión

### Problema Identificado
✅ Los métodos `calcularTotalesTemporales()` y `calcularSubtotalesTemporales()` no filtran por `_soloConsulta`

### Solución
✅ Agregar filtro `if (item._soloConsulta)` en ambos métodos

### Complejidad
✅ Cambio simple: 2 líneas agregadas (un `if` en cada método)

### Riesgo
✅ Bajo - No afecta otros cálculos, solo filtra los datos mostrados

### Estado de Implementación
✅ **IMPLEMENTADO** - 2025-10-30
- Fix #1: `calcularTotalesTemporales()` línea 777 ✅
- Fix #2: `calcularSubtotalesTemporales()` línea 808-810 ✅

---

## 8. Pruebas Requeridas

Ahora es necesario realizar las pruebas manuales descritas en la sección 6 para verificar que:
1. Total Temporal muestra solo items en consulta
2. Subtotales Temporales muestran solo tipos de pago de items en consulta
3. Badges SIMULADO aparecen solo en tipos de pago de items en consulta
4. Items sin cambios NO aparecen en subtotales temporales

---

## Historial

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-10-30 | 1.0 | Documento creado con problema real identificado |
| 2025-10-30 | 1.1 | Fix implementado en carrito.component.ts |
