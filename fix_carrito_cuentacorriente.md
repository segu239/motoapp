# Análisis: Falta de Simulación al Cambiar a CUENTA CORRIENTE en Carrito

**Fecha:** 2025-10-28
**Componente:** `carrito.component.ts`
**Problema:** No se activan avisos de simulación al cambiar de EFECTIVO a CUENTA CORRIENTE

---

## 📋 Resumen Ejecutivo

**Problema detectado:** Al cambiar un artículo de EFECTIVO a CUENTA CORRIENTE en el carrito, **no se activa el modo consulta ni los avisos de simulación**, incluso cuando hay cambios significativos de precio.

**Causa raíz:** El sistema solo detecta cambios cuando el campo `activadatos` es diferente. EFECTIVO y CUENTA CORRIENTE tienen ambos `activadatos = 0`, por lo que el sistema no detecta que el precio cambió.

**Impacto:** El usuario puede cambiar el tipo de pago sin advertencia del cambio de precio, lo que puede causar confusión o errores en la venta.

---

## 🔍 Análisis del Problema

### Sistema Actual de Detección de Cambios

El carrito implementa un sistema de "Modo Consulta" para alertar al usuario sobre cambios de precio. Este modo se activa en el método `onTipoPagoChange()`:

**Archivo:** `src/app/components/carrito/carrito.component.ts` (líneas 2148-2167)

```typescript
onTipoPagoChange(item: any, event: any): void {
  // ... código anterior ...

  // Buscar tarjeta ANTERIOR
  const tarjetaAnterior = this.tarjetas.find(t =>
    t.cod_tarj.toString() === codTarAnterior.toString()
  );
  const activadatosActual = tarjetaAnterior ? (tarjetaAnterior.activadatos || 0) : 0;
  const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

  console.log(`🔍 Activadatos: ${activadatosActual} → ${activadatosNuevo}`);

  // ❌ PROBLEMA: Solo se marca como consulta si activadatos cambia
  if (activadatosActual !== activadatosNuevo) {
    console.log('⚠️ Cambio detectado → Modo Consulta');
    this.marcarComoSoloConsulta(item, tarjetaSeleccionada, ...);
  } else {
    console.log('✅ Cambio dentro del mismo activadatos → Quitar marca consulta');
    this.quitarMarcaSoloConsulta(item);
  }

  // ... cálculo de precio ...
}
```

### ¿Por qué falla con EFECTIVO → CUENTA CORRIENTE?

**Tabla de configuración de tipos de pago:**

| Tipo de Pago | cod_tarj | activadatos | listaprecio | Campo de precio |
|--------------|----------|-------------|-------------|-----------------|
| EFECTIVO | 12 | 0 | 0 | precon |
| CUENTA CORRIENTE | 111 | 0 | 1 | prefi1 |
| TARJETA | 1 | 1 | 2 | prefi2 |
| CHEQUE | 11 | 2 | 1 | prefi1 |

**Escenario problemático:**

```
Usuario cambia: EFECTIVO → CUENTA CORRIENTE

Comparación actual:
  activadatosActual = 0 (EFECTIVO)
  activadatosNuevo = 0 (CUENTA CORRIENTE)

  activadatosActual !== activadatosNuevo → 0 !== 0 → FALSE ❌

Resultado:
  - NO se marca como consulta
  - NO se muestra aviso
  - El precio SÍ cambia: precon → prefi1
  - El usuario NO es advertido del cambio
```

**Cambio de precio sin advertencia:**

```typescript
// El código SÍ calcula el nuevo precio (líneas 2180-2190)
switch (listaPrecioNueva) {
  case 0: precioNuevo = item.precon || 0; break;
  case 1: precioNuevo = item.prefi1 || 0; break;  // ← CUENTA CORRIENTE usa este
  case 2: precioNuevo = item.prefi2 || 0; break;
  // ...
}

// Pero NO alerta al usuario porque activadatos no cambió
```

---

## 🎯 Matriz de Comportamiento Actual

| Desde | Hacia | activadatos cambia | listaprecio cambia | ¿Alerta? | ¿Debería alertar? |
|-------|-------|--------------------|--------------------|-----------|--------------------|
| EFECTIVO (0) | CUENTA CORRIENTE (0) | ❌ NO | ✅ SÍ (0→1) | ❌ NO | ✅ SÍ |
| EFECTIVO (0) | TARJETA (1) | ✅ SÍ | ✅ SÍ (0→2) | ✅ SÍ | ✅ SÍ |
| EFECTIVO (0) | CHEQUE (2) | ✅ SÍ | ✅ SÍ (0→1) | ✅ SÍ | ✅ SÍ |
| CUENTA CORRIENTE (0) | EFECTIVO (0) | ❌ NO | ✅ SÍ (1→0) | ❌ NO | ✅ SÍ |
| CUENTA CORRIENTE (0) | TARJETA (1) | ✅ SÍ | ✅ SÍ (1→2) | ✅ SÍ | ✅ SÍ |
| TARJETA (1) | CHEQUE (2) | ✅ SÍ | ❌ NO (2→1) | ✅ SÍ | ⚠️ Depende |

**❌ Casos problemáticos identificados:**
1. **EFECTIVO → CUENTA CORRIENTE**: Cambio de `precon` a `prefi1` SIN alerta
2. **CUENTA CORRIENTE → EFECTIVO**: Cambio de `prefi1` a `precon` SIN alerta

---

## 💡 Solución Propuesta

### Detectar cambios por Lista de Precios (en lugar de activadatos)

**Prioridad:** 🔴 ALTA
**Complejidad:** Media
**Impacto:** Resuelve TODOS los casos de cambio de precio

### Implementación

**Modificar método `onTipoPagoChange()`:**

**Ubicación:** `src/app/components/carrito/carrito.component.ts` (líneas 2148-2167)

**Código actual:**
```typescript
// ✅ FIX: Buscar tarjeta ANTERIOR usando codTarAnterior
const tarjetaAnterior = this.tarjetas.find(t =>
  t.cod_tarj.toString() === codTarAnterior.toString()
);
const activadatosActual = tarjetaAnterior ? (tarjetaAnterior.activadatos || 0) : 0;
const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

console.log(`🔍 Activadatos: ${activadatosActual} → ${activadatosNuevo}`);

// Si cambia entre diferentes activadatos → MODO CONSULTA
if (activadatosActual !== activadatosNuevo) {
  console.log('⚠️ Cambio detectado entre activadatos diferentes → Modo Consulta');
  this.marcarComoSoloConsulta(item, tarjetaSeleccionada, codTarAnterior, tipoPagoAnterior, precioAnterior);
} else {
  console.log('✅ Cambio dentro del mismo activadatos → Quitar marca consulta');
  this.quitarMarcaSoloConsulta(item);
}
```

**Código propuesto (REEMPLAZAR):**
```typescript
// ════════════════════════════════════════════════════════════
// ✅ NUEVA LÓGICA: Detectar cambio basado en LISTA DE PRECIOS
// Fecha: 2025-10-28
// Razón: activadatos no detecta cambios EFECTIVO ↔ CUENTA CORRIENTE
// ════════════════════════════════════════════════════════════

// Buscar tarjeta ANTERIOR
const tarjetaAnterior = this.tarjetas.find(t =>
  t.cod_tarj.toString() === codTarAnterior.toString()
);

// Obtener lista de precios anterior y nueva
const listaPrecioAnterior = tarjetaAnterior ?
  Number(tarjetaAnterior.listaprecio) : 0;
const listaPrecioNueva = Number(tarjetaSeleccionada.listaprecio) || 0;

// Obtener activadatos (mantener para logs)
const activadatosActual = tarjetaAnterior ?
  (tarjetaAnterior.activadatos || 0) : 0;
const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

console.log(`🔍 Comparación de cambio:`);
console.log(`   Lista precio: ${listaPrecioAnterior} → ${listaPrecioNueva}`);
console.log(`   Activadatos: ${activadatosActual} → ${activadatosNuevo}`);

// ✅ CRITERIO 1: Cambio de activadatos (lógica original - mantener)
const cambioActivadatos = activadatosActual !== activadatosNuevo;

// ✅ CRITERIO 2 (NUEVO): Cambio de lista de precios
const cambioListaPrecios = listaPrecioAnterior !== listaPrecioNueva;

// ✅ Marcar como consulta si CUALQUIERA de los dos criterios se cumple
if (cambioActivadatos || cambioListaPrecios) {
  const razon = cambioActivadatos ?
    'cambio de activadatos' :
    'cambio de lista de precios';
  console.log(`⚠️ Modo Consulta activado por: ${razon}`);
  console.log(`   Precio cambiará de lista ${listaPrecioAnterior} → ${listaPrecioNueva}`);

  this.marcarComoSoloConsulta(
    item,
    tarjetaSeleccionada,
    codTarAnterior,
    tipoPagoAnterior,
    precioAnterior
  );
} else {
  console.log('✅ Sin cambios de precio → Quitar marca consulta');
  this.quitarMarcaSoloConsulta(item);
}
```

---

## 🔄 Comportamiento Después del Fix

**Matriz de comportamiento MEJORADA:**

| Desde | Hacia | activadatos cambia | listaprecio cambia | ¿Alerta? |
|-------|-------|--------------------|--------------------|-----------|
| EFECTIVO (0) | CUENTA CORRIENTE (0) | ❌ NO | ✅ SÍ (0→1) | ✅ SÍ ⭐ |
| EFECTIVO (0) | TARJETA (1) | ✅ SÍ | ✅ SÍ (0→2) | ✅ SÍ |
| EFECTIVO (0) | CHEQUE (2) | ✅ SÍ | ✅ SÍ (0→1) | ✅ SÍ |
| CUENTA CORRIENTE (0) | EFECTIVO (0) | ❌ NO | ✅ SÍ (1→0) | ✅ SÍ ⭐ |
| CUENTA CORRIENTE (0) | TARJETA (1) | ✅ SÍ | ✅ SÍ (1→2) | ✅ SÍ |
| TARJETA (1) | CHEQUE (2) | ✅ SÍ | ❌ NO (2→1) | ✅ SÍ |

⭐ = Casos que ahora funcionarán correctamente con el fix

---

## ✅ Ventajas de esta Solución

1. **Precisión:** Detecta cambios de precio directamente, no indirectamente
2. **Cobertura completa:** Funciona para TODOS los cambios de tipo de pago
3. **Retrocompatibilidad:** Mantiene la lógica de `activadatos` como criterio adicional
4. **Sin efectos secundarios:** No afecta otros comportamientos del sistema
5. **Logs mejorados:** Informa exactamente qué causó el modo consulta
6. **Protección del usuario:** Evita cambios de precio sin advertencia

---

## 🔍 Testing Recomendado

### Test Case 1: EFECTIVO → CUENTA CORRIENTE (CRÍTICO)

```
DADO un artículo en el carrito con tipo de pago EFECTIVO
  Y el artículo tiene precon = $100 y prefi1 = $150

CUANDO el usuario cambia el tipo de pago a CUENTA CORRIENTE

ENTONCES debe mostrar alerta de "Precio de consulta"
  Y debe indicar "Precio original: EFECTIVO - $100"
  Y debe indicar "Precio de consulta: CUENTA CORRIENTE - $150"
  Y debe marcar item._soloConsulta = true
  Y debe mostrar total temporal diferente del total real
  Y NO debe permitir finalizar la venta
```

### Test Case 2: CUENTA CORRIENTE → EFECTIVO

```
DADO un artículo en el carrito con tipo de pago CUENTA CORRIENTE
  Y el artículo tiene precon = $100 y prefi1 = $150

CUANDO el usuario cambia el tipo de pago a EFECTIVO

ENTONCES debe mostrar alerta de "Precio de consulta"
  Y debe indicar "Precio original: CUENTA CORRIENTE - $150"
  Y debe indicar "Precio de consulta: EFECTIVO - $100"
  Y debe marcar item._soloConsulta = true
```

### Test Case 3: EFECTIVO → TARJETA (debe seguir funcionando)

```
DADO un artículo con EFECTIVO
CUANDO cambia a TARJETA
ENTONCES debe activar modo consulta (comportamiento actual debe mantenerse)
```

### Test Case 4: Cambio dentro de misma lista de precios (no debe alertar)

```
DADO dos tipos de pago con activadatos diferentes
  PERO con la misma listaprecio
CUANDO el usuario cambia entre ellos
ENTONCES SÍ debe alertar (por cambio de activadatos)

NOTA: Este caso es edge case - generalmente activadatos diferentes
implican listaprecio diferentes
```

---

## 📊 Ejemplo de Logs Esperados

### Antes del Fix (EFECTIVO → CUENTA CORRIENTE):
```
🔄 ════════════════════════════════════════════════════
📝 CAMBIO DE TIPO DE PAGO EN CARRITO
🔄 ════════════════════════════════════════════════════
Item: ACEITE MOBIL 10W40
cod_tar anterior (REAL): 12
cod_tar nuevo: 111
🔍 Activadatos: 0 → 0 (cod_tar: 12 → 111)
✅ Cambio dentro del mismo activadatos → Quitar marca consulta  ❌ INCORRECTO
💰 Precio base seleccionado (lista 1): $150
✅ Item actualizado
🔄 ════════════════════════════════════════════════════
```

### Después del Fix (EFECTIVO → CUENTA CORRIENTE):
```
🔄 ════════════════════════════════════════════════════
📝 CAMBIO DE TIPO DE PAGO EN CARRITO
🔄 ════════════════════════════════════════════════════
Item: ACEITE MOBIL 10W40
cod_tar anterior (REAL): 12
cod_tar nuevo: 111
🔍 Comparación de cambio:
   Lista precio: 0 → 1
   Activadatos: 0 → 0
⚠️ Modo Consulta activado por: cambio de lista de precios  ✅ CORRECTO
   Precio cambiará de lista 0 → 1
💰 Precio base seleccionado (lista 1): $150
⚠️ Marcando item como SOLO CONSULTA: ACEITE MOBIL 10W40
💾 Datos originales guardados:
   cod_tar_original: 12
   tipo: EFECTIVO
   precio: 100
✅ Item actualizado
🔄 ════════════════════════════════════════════════════
```

---

## 📝 Archivo Completo del Cambio

**Ubicación exacta:** `src/app/components/carrito/carrito.component.ts`
**Método:** `onTipoPagoChange()`
**Líneas a reemplazar:** 2148-2167

**Cambio completo:**

```typescript
// ANTES (líneas 2148-2167):
// ════════════════════════════════════════════════════════════
// ✅ VALIDACIÓN: Detectar cambio entre activadatos diferentes
// ════════════════════════════════════════════════════════════

// ✅ FIX: Buscar tarjeta ANTERIOR usando codTarAnterior
// NO usar obtenerActivadatosDelItem(item) porque item.cod_tar ya fue modificado por Angular
const tarjetaAnterior = this.tarjetas.find(t => t.cod_tarj.toString() === codTarAnterior.toString());
const activadatosActual = tarjetaAnterior ? (tarjetaAnterior.activadatos || 0) : 0;
const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

console.log(`🔍 Activadatos: ${activadatosActual} → ${activadatosNuevo} (cod_tar: ${codTarAnterior} → ${nuevoCodTar})`);

// Si cambia entre diferentes activadatos → MODO CONSULTA
if (activadatosActual !== activadatosNuevo) {
  console.log('⚠️ Cambio detectado entre activadatos diferentes → Modo Consulta');
  this.marcarComoSoloConsulta(item, tarjetaSeleccionada, codTarAnterior, tipoPagoAnterior, precioAnterior);
} else {
  console.log('✅ Cambio dentro del mismo activadatos → Quitar marca consulta');
  this.quitarMarcaSoloConsulta(item);
}
```

```typescript
// DESPUÉS (REEMPLAZAR líneas 2148-2167):
// ════════════════════════════════════════════════════════════
// ✅ VALIDACIÓN: Detectar cambio entre tipos de pago diferentes
// Fecha: 2025-10-28
// Fix: Detectar por lista de precios, no solo por activadatos
// Razón: EFECTIVO y CUENTA CORRIENTE tienen activadatos=0 pero
//        diferentes listas (0 vs 1), causando cambio de precio
//        sin alerta al usuario
// ════════════════════════════════════════════════════════════

// ✅ Buscar tarjeta ANTERIOR usando codTarAnterior
const tarjetaAnterior = this.tarjetas.find(t => t.cod_tarj.toString() === codTarAnterior.toString());

// Obtener lista de precios anterior y nueva
const listaPrecioAnterior = tarjetaAnterior ? Number(tarjetaAnterior.listaprecio) : 0;
const listaPrecioNueva = Number(tarjetaSeleccionada.listaprecio) || 0;

// Obtener activadatos (mantener para logs y como criterio adicional)
const activadatosActual = tarjetaAnterior ? (tarjetaAnterior.activadatos || 0) : 0;
const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

console.log(`🔍 Comparación de cambio:`);
console.log(`   Lista precio: ${listaPrecioAnterior} → ${listaPrecioNueva}`);
console.log(`   Activadatos: ${activadatosActual} → ${activadatosNuevo} (cod_tar: ${codTarAnterior} → ${nuevoCodTar})`);

// ✅ CRITERIO 1: Cambio de activadatos (lógica original - mantener)
const cambioActivadatos = activadatosActual !== activadatosNuevo;

// ✅ CRITERIO 2 (NUEVO): Cambio de lista de precios
const cambioListaPrecios = listaPrecioAnterior !== listaPrecioNueva;

// Marcar como consulta si CUALQUIERA de los dos criterios se cumple
if (cambioActivadatos || cambioListaPrecios) {
  const razon = cambioActivadatos ? 'cambio de activadatos' : 'cambio de lista de precios';
  console.log(`⚠️ Modo Consulta activado por: ${razon}`);
  if (cambioListaPrecios) {
    console.log(`   Precio cambiará de lista ${listaPrecioAnterior} → ${listaPrecioNueva}`);
  }
  this.marcarComoSoloConsulta(item, tarjetaSeleccionada, codTarAnterior, tipoPagoAnterior, precioAnterior);
} else {
  console.log('✅ Sin cambios de precio → Quitar marca consulta');
  this.quitarMarcaSoloConsulta(item);
}
```

---

## 🎯 Impacto del Cambio

### Usuarios beneficiados:
- ✅ Todos los usuarios que usan EFECTIVO y CUENTA CORRIENTE
- ✅ Usuarios que necesitan consultar precios antes de vender
- ✅ Vendedores que manejan múltiples listas de precios

### Regresiones potenciales:
- ❌ Ninguna (el cambio es aditivo, no modifica comportamiento existente)

### Comportamientos que NO cambian:
- ✅ Cambios que ya alertaban seguirán alertando
- ✅ Sistema de modo consulta mantiene su funcionamiento
- ✅ Cálculo de precios no se modifica
- ✅ Validaciones de tipos de pago no se afectan

---

## 📚 Referencias

**Archivos afectados:**
- `src/app/components/carrito/carrito.component.ts` (líneas 2148-2167)

**Métodos relacionados:**
- `onTipoPagoChange()` - Cambio principal
- `marcarComoSoloConsulta()` - Ya funciona correctamente
- `quitarMarcaSoloConsulta()` - Ya funciona correctamente
- `calcularTotalesTemporales()` - Ya funciona correctamente

**Documentos relacionados:**
- Sistema de modo consulta - Implementado en versión 4.0
- Totales temporales de simulación - Ya implementado

---

**Fin del Análisis**
