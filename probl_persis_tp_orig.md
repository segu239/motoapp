# 🔍 INFORME DE BUG - Persistencia de Tipo de Pago Original

**Fecha:** 2025-10-28
**Versión:** v4.0 - Sistema de Modo Consulta
**Componente afectado:** `carrito.component.ts`
**Severidad:** ⚠️ ALTA - Afecta experiencia de usuario y finalización de ventas
**Estado:** 🔴 NO RESUELTO

---

## 📋 RESUMEN EJECUTIVO

El botón "Revertir" del sistema de Modo Consulta presenta un bug crítico donde **pierde la referencia al tipo de pago ORIGINAL** después de múltiples cambios, comparando incorrectamente con el tipo de pago **ANTERIOR** en lugar del **PRIMERO**.

**Impacto:**
- ❌ Usuario no puede volver al tipo original simplemente seleccionándolo
- ❌ El sistema sigue marcando como "SOLO CONSULTA" aunque esté en el precio original
- ❌ Usuario no puede finalizar venta aunque esté en el tipo correcto
- ❌ Confusión: el botón "Revertir" aparece incluso cuando ya está en el tipo original

---

## 🎯 UBICACIÓN DEL BUG

**Archivo:** `src/app/components/carrito/carrito.component.ts`
**Método:** `onTipoPagoChange(item: any, event: any)`
**Líneas problemáticas:** 2122-2203

### Líneas específicas:
```typescript
// Línea 2122-2124 (PROBLEMÁTICO)
const codTarAnterior = itemOriginal.cod_tar;  // ← Usa el tipo ACTUAL, no el ORIGINAL
const tipoPagoAnterior = itemOriginal.tipoPago;
const precioAnterior = itemOriginal.precio;

// Línea 2160-2171 (USA las variables incorrectas)
const tarjetaAnterior = this.tarjetas.find(t => t.cod_tarj.toString() === codTarAnterior.toString());
const listaPrecioAnterior = tarjetaAnterior ? Number(tarjetaAnterior.listaprecio) : 0;

// Línea 2188-2203 (COMPARA con el tipo anterior, no con el original)
if (cambioActivadatos || cambioListaPrecios) {
  this.marcarComoSoloConsulta(item, tarjetaSeleccionada, codTarAnterior, tipoPagoAnterior, precioAnterior);
} else {
  this.quitarMarcaSoloConsulta(item);
}
```

---

## 🔴 ESCENARIO PROBLEMÁTICO - PASO A PASO

### **Caso de Uso: Usuario cambia múltiples veces entre tipos de pago**

```
PASO 1: Estado inicial
───────────────────────────────────────────────────────────────
Item: ACOPLE FIL-AIRE C/CARB H.CB 250
Tipo de pago: EFECTIVO
  ├─ cod_tar: "11"
  ├─ activadatos: 0
  ├─ listaprecio: 0
  ├─ precio: $9,108.75
  └─ _soloConsulta: undefined (sin consulta)

Estado interno:
  ├─ _tipoPagoOriginal: undefined
  ├─ _precioOriginal: undefined
  └─ _nombreTipoPagoOriginal: undefined


PASO 2: Usuario cambia a ELECTRON
───────────────────────────────────────────────────────────────
Acción: Selecciona ELECTRON en el dropdown

Ejecución de onTipoPagoChange():
  ├─ Línea 2122: codTarAnterior = "11" (EFECTIVO) ✓
  ├─ Línea 2160: tarjetaAnterior = {cod_tarj: "11", ...}
  ├─ Línea 2170: listaPrecioAnterior = 0
  ├─ Línea 2171: listaPrecioNueva = 1
  ├─ Línea 2182: cambioActivadatos = true (0→1)
  ├─ Línea 2185: cambioListaPrecios = true (0→1)
  └─ Línea 2199: marcarComoSoloConsulta(..., "11", "EFECTIVO", 9108.75)

Resultado:
Item ahora tiene:
  ├─ cod_tar: "1" (ELECTRON)
  ├─ precio: $10,475.06
  ├─ _soloConsulta: true ✓
  ├─ _tipoPagoOriginal: "11" ✓ (EFECTIVO guardado)
  ├─ _precioOriginal: 9108.75 ✓
  └─ _nombreTipoPagoOriginal: "EFECTIVO" ✓

✅ Badge "SOLO CONSULTA" visible
✅ Botón "Revertir" visible
✅ Total Temporal mostrado


PASO 3: Usuario cambia a VISA
───────────────────────────────────────────────────────────────
Acción: Selecciona VISA en el dropdown

Ejecución de onTipoPagoChange():
  ├─ Línea 2122: codTarAnterior = "1" (ELECTRON) ← ❌ DEBERÍA SER "11" (EFECTIVO)
  │              └─ Toma el tipo ACTUAL, no el ORIGINAL
  ├─ Línea 2160: tarjetaAnterior = {cod_tarj: "1", activadatos: 1, listaprecio: 1}
  ├─ Línea 2170: listaPrecioAnterior = 1 (de ELECTRON) ← ❌ DEBERÍA SER 0 (de EFECTIVO)
  ├─ Línea 2171: listaPrecioNueva = 2 (de VISA)
  ├─ Línea 2185: cambioListaPrecios = true (1→2) ← ❌ Compara ELECTRON vs VISA
  │              └─ DEBERÍA comparar: EFECTIVO (0) vs VISA (2)
  ├─ Línea 2199: marcarComoSoloConsulta(..., "1", "ELECTRON", 10475.06)
  │              └─ ❌ Intenta guardar ELECTRON como original (INCORRECTO)
  └─ Línea 2290: Como _soloConsulta YA es true, NO sobrescribe
                 └─ ✓ Por suerte, mantiene EFECTIVO (salvado por esta condición)

Resultado:
Item ahora tiene:
  ├─ cod_tar: "2" (VISA)
  ├─ precio: $11,522.57 (precio de VISA)
  ├─ _soloConsulta: true ✓
  ├─ _tipoPagoOriginal: "11" ✓ (EFECTIVO - mantenido por línea 2290)
  ├─ _precioOriginal: 9108.75 ✓ (EFECTIVO - mantenido)
  └─ _nombreTipoPagoOriginal: "EFECTIVO" ✓ (mantenido)

⚠️ Los datos originales se mantienen SOLO por la protección de línea 2290
⚠️ PERO: La comparación se hizo con ELECTRON, no con EFECTIVO


PASO 4: Usuario vuelve a EFECTIVO (tipo original)
───────────────────────────────────────────────────────────────
Acción: Selecciona EFECTIVO en el dropdown (volviendo al inicio)
Expectativa: Sistema debería detectar que es el original y quitar marca

Ejecución de onTipoPagoChange():
  ├─ Línea 2122: codTarAnterior = "2" (VISA) ← ❌ DEBERÍA SER "11" (EFECTIVO ORIGINAL)
  ├─ Línea 2160: tarjetaAnterior = {cod_tarj: "2", activadatos: 1, listaprecio: 2}
  ├─ Línea 2170: listaPrecioAnterior = 2 (de VISA) ← ❌ DEBERÍA COMPARAR CON "11" (original)
  ├─ Línea 2171: listaPrecioNueva = 0 (de EFECTIVO)
  ├─ Línea 2182: cambioActivadatos = true (1→0)
  │              └─ ❌ Compara VISA vs EFECTIVO, NO detecta que EFECTIVO es el original
  ├─ Línea 2185: cambioListaPrecios = true (2→0)
  │              └─ ❌ Compara lista 2 (VISA) vs lista 0 (EFECTIVO)
  │              └─ DEBERÍA detectar: lista 0 (original) vs lista 0 (nuevo) = SIN CAMBIO
  └─ Línea 2199: marcarComoSoloConsulta(..., "2", "VISA", precio_visa)
                 └─ ❌ Intenta marcar como consulta AUNQUE VOLVIÓ AL ORIGINAL

Resultado:
❌ Item sigue marcado como consulta aunque tiene:
  ├─ cod_tar: "11" (EFECTIVO - el original) ✓
  ├─ precio: $9,108.75 (el original) ✓
  ├─ _soloConsulta: true ← ❌ DEBERÍA SER false
  ├─ _tipoPagoOriginal: "11"
  ├─ _precioOriginal: 9108.75
  └─ _nombreTipoPagoOriginal: "EFECTIVO"

❌ Badge "SOLO CONSULTA" SIGUE visible (incorrecto)
❌ Botón "Revertir" SIGUE visible (incorrecto)
❌ Total Temporal SIGUE mostrado (incorrecto)
❌ Botón "Finalizar Venta" SIGUE deshabilitado (incorrecto)


PASO 5: Usuario hace clic en "Revertir"
───────────────────────────────────────────────────────────────
Acción: Usuario confundido hace clic en "Revertir"
Expectativa: Ya está en el tipo original, no debería hacer nada

Ejecución de revertirItemAOriginal():
  ├─ Línea 2386: codTarOriginal = "11" (EFECTIVO)
  ├─ Línea 2402: itemEnCarrito.cod_tar = "11"
  │              └─ ✓ Restaura a "11" (que ya tenía)
  ├─ Línea 2403: itemEnCarrito.tipoPago = "EFECTIVO"
  │              └─ ✓ Restaura a "EFECTIVO" (que ya tenía)
  ├─ Línea 2404: itemEnCarrito.precio = 9108.75
  │              └─ ✓ Restaura a 9108.75 (que ya tenía)
  └─ Línea 2407-2411: Limpia flags _soloConsulta, etc.

Resultado:
✓ Item vuelve al estado correcto
✓ Badge "SOLO CONSULTA" desaparece
✓ Botón "Revertir" desaparece
✓ Botón "Finalizar Venta" se habilita

🤦 PERO: Usuario tuvo que hacer un paso INNECESARIO
         porque el sistema no detectó que ya estaba en el original
```

---

## 💥 PROBLEMA RAÍZ - ANÁLISIS TÉCNICO

### **Comparación Incorrecta**

La lógica actual hace:
```
Tipo ANTERIOR (último cambio) ←→ Tipo NUEVO
```

La lógica DEBERÍA hacer:
```
┌─ Si item._soloConsulta = true:
│  └─ Tipo ORIGINAL (primero) ←→ Tipo NUEVO
│
└─ Si item._soloConsulta = false:
   └─ Tipo ACTUAL ←→ Tipo NUEVO
```

### **Variables Problemáticas**

```typescript
// LÍNEA 2122-2124 (ACTUAL - INCORRECTO)
const codTarAnterior = itemOriginal.cod_tar;  // ← Siempre usa el ACTUAL
const tipoPagoAnterior = itemOriginal.tipoPago;
const precioAnterior = itemOriginal.precio;

// LO QUE DEBERÍA SER:
const codTarParaComparar = item._soloConsulta
  ? item._tipoPagoOriginal      // ← Si está en consulta, usar ORIGINAL
  : itemOriginal.cod_tar;        // ← Si NO está en consulta, usar ACTUAL
```

### **Flujo de Datos Incorrecto**

```
┌─────────────────────────────────────────────────────────────┐
│ FLUJO ACTUAL (INCORRECTO)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  onTipoPagoChange() se ejecuta                              │
│  ├─ Lee: itemOriginal.cod_tar (tipo ACTUAL, no original)   │
│  ├─ Busca: tarjetaAnterior usando cod_tar ACTUAL           │
│  ├─ Compara: listaprecio ACTUAL vs NUEVO                   │
│  └─ Decisión: basada en comparación INCORRECTA             │
│                                                             │
│  Resultado:                                                 │
│  └─ NO detecta cuando vuelve al original                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FLUJO CORRECTO (PROPUESTO)                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  onTipoPagoChange() se ejecuta                              │
│  ├─ Verifica: ¿item._soloConsulta = true?                  │
│  │   ├─ SÍ: usar _tipoPagoOriginal para comparar          │
│  │   └─ NO: usar itemOriginal.cod_tar para comparar       │
│  ├─ Busca: tarjeta usando cod_tar CORRECTO                 │
│  ├─ Compara: listaprecio CORRECTO vs NUEVO                 │
│  └─ Decisión: basada en comparación CORRECTA               │
│                                                             │
│  Resultado:                                                 │
│  └─ ✓ Detecta cuando vuelve al original y quita marca      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ SOLUCIÓN PROPUESTA

### **Modificación del método `onTipoPagoChange()`**

**Archivo:** `src/app/components/carrito/carrito.component.ts`
**Líneas a modificar:** 2122-2203

#### **PASO 1: Determinar el tipo de referencia correcto**

Reemplazar líneas 2122-2124:

```typescript
// ════════════════════════════════════════════════════════════
// ❌ CÓDIGO ACTUAL (INCORRECTO)
// ════════════════════════════════════════════════════════════
const codTarAnterior = itemOriginal.cod_tar;
const tipoPagoAnterior = itemOriginal.tipoPago;
const precioAnterior = itemOriginal.precio;

// ════════════════════════════════════════════════════════════
// ✅ CÓDIGO PROPUESTO (CORRECTO)
// ════════════════════════════════════════════════════════════
// Si el item YA está en consulta, debemos comparar con el ORIGINAL
// Si NO está en consulta, comparamos con el ACTUAL (comportamiento normal)
const codTarParaComparar = item._soloConsulta
  ? item._tipoPagoOriginal
  : itemOriginal.cod_tar;

const tipoPagoParaComparar = item._soloConsulta
  ? item._nombreTipoPagoOriginal
  : itemOriginal.tipoPago;

const precioParaComparar = item._soloConsulta
  ? item._precioOriginal
  : itemOriginal.precio;

console.log(`🔍 Comparando con tipo de pago: ${item._soloConsulta ? 'ORIGINAL' : 'ANTERIOR'}`);
console.log(`   Tipo: ${tipoPagoParaComparar} (cod_tar: ${codTarParaComparar})`);
console.log(`   Precio: $${precioParaComparar}`);
```

#### **PASO 2: Buscar la tarjeta de referencia correcta**

Reemplazar líneas 2160-2171:

```typescript
// ════════════════════════════════════════════════════════════
// ❌ CÓDIGO ACTUAL (INCORRECTO)
// ════════════════════════════════════════════════════════════
const tarjetaAnterior = this.tarjetas.find(t => t.cod_tarj.toString() === codTarAnterior.toString());

if (!tarjetaAnterior) {
  console.warn(`⚠️ Tarjeta anterior no encontrada: ${codTarAnterior}`);
  console.warn('   Usando valores por defecto para comparación');
}

const listaPrecioAnterior = tarjetaAnterior ? Number(tarjetaAnterior.listaprecio) : 0;
const listaPrecioNueva = Number(tarjetaSeleccionada.listaprecio) || 0;

// ════════════════════════════════════════════════════════════
// ✅ CÓDIGO PROPUESTO (CORRECTO)
// ════════════════════════════════════════════════════════════
// Buscar tarjeta usando el cod_tar correcto (original o anterior)
const tarjetaParaComparar = this.tarjetas.find(t =>
  t.cod_tarj.toString() === codTarParaComparar.toString()
);

if (!tarjetaParaComparar) {
  console.warn(`⚠️ Tarjeta para comparar no encontrada: ${codTarParaComparar}`);
  console.warn(`   Item en consulta: ${item._soloConsulta ? 'SÍ' : 'NO'}`);
  console.warn('   Usando valores por defecto para comparación');
}

// Obtener lista de precios de referencia y nueva
const listaPrecioParaComparar = tarjetaParaComparar
  ? Number(tarjetaParaComparar.listaprecio)
  : 0;
const listaPrecioNueva = Number(tarjetaSeleccionada.listaprecio) || 0;
```

#### **PASO 3: Actualizar variables de activadatos**

Reemplazar líneas 2173-2179:

```typescript
// ════════════════════════════════════════════════════════════
// ❌ CÓDIGO ACTUAL (INCORRECTO)
// ════════════════════════════════════════════════════════════
const activadatosActual = tarjetaAnterior ? (tarjetaAnterior.activadatos || 0) : 0;
const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

console.log(`🔍 Comparación de cambio:`);
console.log(`   Lista precio: ${listaPrecioAnterior} → ${listaPrecioNueva}`);
console.log(`   Activadatos: ${activadatosActual} → ${activadatosNuevo} (cod_tar: ${codTarAnterior} → ${nuevoCodTar})`);

// ════════════════════════════════════════════════════════════
// ✅ CÓDIGO PROPUESTO (CORRECTO)
// ════════════════════════════════════════════════════════════
const activadatosParaComparar = tarjetaParaComparar
  ? (tarjetaParaComparar.activadatos || 0)
  : 0;
const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

console.log(`🔍 Comparación de cambio:`);
console.log(`   Comparando con: ${item._soloConsulta ? 'ORIGINAL' : 'ANTERIOR'}`);
console.log(`   Lista precio: ${listaPrecioParaComparar} → ${listaPrecioNueva}`);
console.log(`   Activadatos: ${activadatosParaComparar} → ${activadatosNuevo}`);
console.log(`   cod_tar: ${codTarParaComparar} → ${nuevoCodTar}`);
```

#### **PASO 4: Actualizar comparaciones**

Reemplazar líneas 2181-2185:

```typescript
// ════════════════════════════════════════════════════════════
// ❌ CÓDIGO ACTUAL (INCORRECTO)
// ════════════════════════════════════════════════════════════
const cambioActivadatos = activadatosActual !== activadatosNuevo;
const cambioListaPrecios = listaPrecioAnterior !== listaPrecioNueva;

// ════════════════════════════════════════════════════════════
// ✅ CÓDIGO PROPUESTO (CORRECTO)
// ════════════════════════════════════════════════════════════
// Comparar con el tipo de referencia correcto (original o anterior)
const cambioActivadatos = activadatosParaComparar !== activadatosNuevo;
const cambioListaPrecios = listaPrecioParaComparar !== listaPrecioNueva;
```

#### **PASO 5: Mejorar lógica de marcado/desmarcado**

Reemplazar líneas 2188-2203:

```typescript
// ════════════════════════════════════════════════════════════
// ❌ CÓDIGO ACTUAL (INCORRECTO)
// ════════════════════════════════════════════════════════════
if (cambioActivadatos || cambioListaPrecios) {
  const razones = [];
  if (cambioActivadatos) razones.push('cambio de activadatos');
  if (cambioListaPrecios) razones.push('cambio de lista de precios');
  const razon = razones.join(' y ');

  console.log(`⚠️ Modo Consulta activado por: ${razon}`);
  if (cambioListaPrecios) {
    console.log(`   Precio cambiará de lista ${listaPrecioAnterior} → ${listaPrecioNueva}`);
  }
  this.marcarComoSoloConsulta(item, tarjetaSeleccionada, codTarAnterior, tipoPagoAnterior, precioAnterior);
} else {
  console.log('✅ Sin cambios de precio → Quitar marca consulta');
  this.quitarMarcaSoloConsulta(item);
}

// ════════════════════════════════════════════════════════════
// ✅ CÓDIGO PROPUESTO (CORRECTO)
// ════════════════════════════════════════════════════════════
if (cambioActivadatos || cambioListaPrecios) {
  // Hay diferencia entre el tipo de referencia y el nuevo tipo

  if (item._soloConsulta) {
    // Ya está marcado como consulta
    // Solo mantenemos el estado, NO sobrescribimos los datos originales
    const razones = [];
    if (cambioActivadatos) razones.push('cambio de activadatos');
    if (cambioListaPrecios) razones.push('cambio de lista de precios');
    const razon = razones.join(' y ');

    console.log(`⚠️ Item ya en consulta, manteniendo datos originales`);
    console.log(`   Razón del cambio: ${razon}`);
    console.log(`   Original: ${tipoPagoParaComparar} (${codTarParaComparar}) - $${precioParaComparar}`);
    console.log(`   Nuevo: ${tarjetaSeleccionada.tarjeta} (${nuevoCodTar})`);

    // NO llamar a marcarComoSoloConsulta porque NO queremos sobrescribir
    // El item._soloConsulta ya es true y los datos originales están guardados

  } else {
    // Primera vez que se marca como consulta
    const razones = [];
    if (cambioActivadatos) razones.push('cambio de activadatos');
    if (cambioListaPrecios) razones.push('cambio de lista de precios');
    const razon = razones.join(' y ');

    console.log(`⚠️ Marcando como consulta por primera vez`);
    console.log(`   Razón: ${razon}`);
    if (cambioListaPrecios) {
      console.log(`   Precio cambiará de lista ${listaPrecioParaComparar} → ${listaPrecioNueva}`);
    }

    // Guardar el tipo ACTUAL REAL (antes de este cambio) como original
    const codTarActualReal = itemOriginal.cod_tar;
    const tipoPagoActualReal = itemOriginal.tipoPago;
    const precioActualReal = itemOriginal.precio;

    console.log(`💾 Guardando como original: ${tipoPagoActualReal} (${codTarActualReal}) - $${precioActualReal}`);

    this.marcarComoSoloConsulta(
      item,
      tarjetaSeleccionada,
      codTarActualReal,
      tipoPagoActualReal,
      precioActualReal
    );
  }

} else {
  // NO hay diferencia → el usuario volvió al tipo de referencia
  console.log(`✅ Sin diferencias detectadas → ${item._soloConsulta ? 'Volvió al tipo ORIGINAL' : 'Sin cambios'}`);
  console.log(`   Quitando marca de consulta`);
  this.quitarMarcaSoloConsulta(item);
}
```

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### **Escenario de prueba: EFECTIVO → ELECTRON → VISA → EFECTIVO**

| Paso | Acción | ANTES (con bug) | DESPUÉS (corregido) |
|------|--------|-----------------|---------------------|
| 1 | Item inicial: EFECTIVO | `_soloConsulta: false` | `_soloConsulta: false` |
| 2 | Cambia a ELECTRON | ✅ Marca consulta<br>✅ Guarda EFECTIVO como original | ✅ Marca consulta<br>✅ Guarda EFECTIVO como original |
| 3 | Cambia a VISA | ✅ Mantiene EFECTIVO como original<br>⚠️ Compara ELECTRON vs VISA | ✅ Mantiene EFECTIVO como original<br>✅ Compara EFECTIVO vs VISA |
| 4 | Vuelve a EFECTIVO | ❌ Sigue en consulta<br>❌ Compara VISA vs EFECTIVO<br>❌ Requiere "Revertir" | ✅ Quita marca de consulta<br>✅ Compara EFECTIVO vs EFECTIVO<br>✅ NO requiere "Revertir" |

---

## ✅ RESULTADO ESPERADO DESPUÉS DEL FIX

```
TEST CASE: Usuario hace múltiples cambios y vuelve al original
──────────────────────────────────────────────────────────────

1. EFECTIVO (inicial)
   └─ Estado: Normal, sin consulta ✓

2. Usuario → ELECTRON
   ├─ Sistema detecta cambio de activadatos y lista
   ├─ Marca como consulta
   ├─ Guarda EFECTIVO como original
   └─ Muestra badge "SOLO CONSULTA" ✓

3. Usuario → VISA
   ├─ Sistema compara EFECTIVO (original) vs VISA
   ├─ Detecta diferencia
   ├─ Mantiene EFECTIVO como original (NO sobrescribe)
   └─ Mantiene badge "SOLO CONSULTA" ✓

4. Usuario → ELECTRON (vuelta)
   ├─ Sistema compara EFECTIVO (original) vs ELECTRON
   ├─ Detecta diferencia
   ├─ Mantiene EFECTIVO como original
   └─ Mantiene badge "SOLO CONSULTA" ✓

5. Usuario → EFECTIVO (vuelta al original)
   ├─ Sistema compara EFECTIVO (original) vs EFECTIVO (nuevo)
   ├─ ✅ NO detecta diferencia
   ├─ ✅ Quita marca de consulta automáticamente
   ├─ ✅ Elimina badge "SOLO CONSULTA"
   ├─ ✅ Elimina botón "Revertir"
   └─ ✅ Habilita botón "Finalizar Venta"

✅ Usuario puede finalizar venta sin pasos adicionales
✅ NO necesita hacer clic en "Revertir"
✅ Experiencia de usuario mejorada
```

---

## 🧪 CASOS DE PRUEBA PARA VALIDACIÓN

### **Test Case 1: Cambio simple y vuelta**
```
Pasos:
1. Agregar item con EFECTIVO
2. Cambiar a ELECTRON
3. Volver a EFECTIVO

Resultado esperado:
✅ Item vuelve a estado normal sin marca de consulta
✅ Botón "Finalizar Venta" habilitado
```

### **Test Case 2: Múltiples cambios y vuelta**
```
Pasos:
1. Agregar item con EFECTIVO
2. Cambiar a ELECTRON
3. Cambiar a VISA
4. Cambiar a MASTERCARD
5. Volver a EFECTIVO

Resultado esperado:
✅ Item vuelve a estado normal sin marca de consulta
✅ Botón "Finalizar Venta" habilitado
```

### **Test Case 3: Cambios dentro mismo activadatos**
```
Pasos:
1. Agregar item con EFECTIVO (activadatos=0)
2. Cambiar a CUENTA CORRIENTE (activadatos=0)
3. Volver a EFECTIVO

Resultado esperado:
✅ Nunca marca como consulta (mismo activadatos)
✅ Precios se actualizan normalmente
```

### **Test Case 4: Cambios mixtos**
```
Pasos:
1. Agregar item con EFECTIVO (activadatos=0, lista=0)
2. Cambiar a TRANSFERENCIA EFECTIVO (activadatos=0, lista=0) → Sin consulta
3. Cambiar a ELECTRON (activadatos=1, lista=1) → Marca consulta
4. Cambiar a VISA (activadatos=1, lista=2) → Mantiene consulta
5. Volver a TRANSFERENCIA EFECTIVO → Quita consulta

Resultado esperado:
✅ Sistema detecta correctamente cuándo marcar/desmarcar
✅ Preserva tipo ORIGINAL, no el intermedio
```

---

## 📝 RESUMEN DE CAMBIOS

### **Archivos modificados:**
- `src/app/components/carrito/carrito.component.ts`

### **Métodos afectados:**
- `onTipoPagoChange()` (líneas 2122-2203)

### **Variables renombradas:**
- `codTarAnterior` → `codTarParaComparar`
- `tipoPagoAnterior` → `tipoPagoParaComparar`
- `precioAnterior` → `precioParaComparar`
- `tarjetaAnterior` → `tarjetaParaComparar`
- `listaPrecioAnterior` → `listaPrecioParaComparar`
- `activadatosActual` → `activadatosParaComparar`

### **Lógica nueva:**
- Determinar tipo de referencia basado en `item._soloConsulta`
- Comparar con ORIGINAL si está en consulta
- Comparar con ACTUAL si NO está en consulta
- NO sobrescribir datos originales en cambios subsiguientes
- Detectar automáticamente cuando vuelve al original

---

## 🎯 IMPACTO Y BENEFICIOS

### **Antes del fix:**
- ❌ Usuario confundido al ver "consulta" en tipo original
- ❌ Pasos innecesarios para finalizar venta
- ❌ Mala experiencia de usuario
- ❌ Potenciales ventas perdidas por fricción

### **Después del fix:**
- ✅ Sistema detecta inteligentemente cuando vuelve al original
- ✅ Eliminación automática de marca de consulta
- ✅ Flujo natural y esperado
- ✅ Menos fricción en el proceso de venta
- ✅ Mejor experiencia de usuario

---

## 📌 PRIORIDAD

**Severidad:** ⚠️ ALTA
**Impacto en usuario:** ALTO
**Frecuencia esperada:** MEDIA-ALTA (usuarios que comparan precios)
**Complejidad de fix:** MEDIA
**Tiempo estimado:** 2-3 horas (implementación + testing)

---

## 🏷️ TAGS

`#bug` `#carrito` `#modo-consulta` `#tipo-de-pago` `#revertir` `#v4.0` `#alta-prioridad` `#experiencia-usuario`

---

**Reportado por:** Claude Code (Análisis automatizado)
**Fecha de reporte:** 2025-10-28
**Versión afectada:** v4.0
**Estado:** Pendiente de implementación

---

## 📚 REFERENCIAS

- Documento de pruebas: `pruebas_automaticas.md`
- Plan v4.0: `plan_v4.0.md`
- Informe de implementación: `Informe_implementacion_simul_precios.md`
- Componente: `src/app/components/carrito/carrito.component.ts`

---

**FIN DEL INFORME**
