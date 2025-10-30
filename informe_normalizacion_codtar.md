# Informe: Normalización de cod_tar a String

## 📋 Resumen Ejecutivo

**Problema**: El dropdown de tipo de pago no muestra el valor inicial correcto debido a un desajuste de tipos entre `item.cod_tar` (number) y `tarjetas[].cod_tarj` (string).

**Causa Raíz**:
- PostgreSQL retorna `cod_tarj` como string (por ser tipo numeric serializado en JSON)
- sessionStorage parsea algunos valores a number al guardar/recuperar
- PrimeNG dropdown requiere coincidencia exacta de tipos (===) para ngModel binding

**Solución Propuesta**: Normalizar `cod_tar` a string en todo el componente

---

## 🔍 Análisis de Impacto

### 1. Estado Actual del Tipo de Datos

#### En Base de Datos (PostgreSQL):
```sql
cod_tarj: numeric → Se serializa como string en JSON
listaprecio: numeric → Se serializa como string en JSON
activadatos: numeric → Se serializa como string en JSON
```

#### En Frontend Actual:
```typescript
// Al cargar desde BD (tarjetas[])
cod_tarj: "11" (string)

// Al cargar desde sessionStorage (items[])
cod_tar: 11 (number) ← INCONSISTENCIA
```

### 2. Lugares Donde se Usa `cod_tar`

#### ✅ Lugares que YA manejan ambos tipos (SAFE):

**Líneas 746-748, 775-777, 814-816, 843-845**: Validaciones que convierten a number
```typescript
const codTarNum = typeof item.cod_tar === 'string'
  ? parseInt(item.cod_tar, 10)
  : item.cod_tar;
```

**Línea 1117**: getCodVta() → Se pasa a limitNumericValue() que hace parseInt()
```typescript
cod_condvta: limitNumericValue(codvent, 999)
// limitNumericValue hace parseInt() internamente
```

**Línea 1225**: Comparación entre items del mismo tipo
```typescript
if (item.cod_tar !== firstCodTar)  // Compara mismo origen, OK
```

**Línea 1891**: Comparación con toString() en ambos lados
```typescript
t.cod_tarj.toString() === primerItem.cod_tar.toString()  // OK
```

**Línea 1993**: Usa comparación loose (==)
```typescript
t => t.cod_tarj == nuevoCodTar  // Funciona con == (no ===)
```

**Línea 2262**: Comparación con toString() en ambos lados
```typescript
t.cod_tarj.toString() === item.cod_tar.toString()  // OK
```

#### ⚠️ Lugares que FALLARÁN con normalización a string:

**Línea 1212**: Comparación estricta con número 111 (CUENTA CORRIENTE)
```typescript
if (item.cod_tar === 111) {  // ❌ Fallará si cod_tar es "111" (string)
  acumulado += parseFloat((item.precio * item.cantidad).toFixed(2));
}
```

**Líneas 779, 847**: Búsqueda en tarjetas (ya tiene bug actual)
```typescript
// Convierte cod_tar a number pero cod_tarj es string
const codTarNum = parseInt(item.cod_tar, 10);
const tarjeta = this.tarjetas.find(t => t.cod_tarj === codTarNum);
// ❌ "11" !== 11 → No encuentra
```

### 3. Modificaciones Necesarias

#### Ya realizada ✅:
```typescript
// carrito.component.ts línea 186-193
getItemsCarrito() {
  // ... código existente ...
  this.itemsEnCarrito = this.itemsEnCarrito.map(item => {
    if (item.cod_tar !== undefined && item.cod_tar !== null) {
      item.cod_tar = String(item.cod_tar);  // ✅ Normalizar a string
    }
    return item;
  });
}
```

#### Pendientes de realizar:

**1. Línea 1212 - sumarCuentaCorriente()**:
```typescript
// ANTES:
if (item.cod_tar === 111) {

// DESPUÉS:
if (item.cod_tar === '111' || item.cod_tar === 111) {
// O mejor aún:
if (String(item.cod_tar) === '111') {
```

**2. Línea 779 - validarMetodosPagoPresupuesto()**:
```typescript
// ANTES:
const tarjeta = this.tarjetas.find(t => t.cod_tarj === codTarNum);

// DESPUÉS:
const tarjeta = this.tarjetas.find(t => String(t.cod_tarj) === String(item.cod_tar));
```

**3. Línea 847 - validarMetodosPagoFactura()**:
```typescript
// ANTES:
const tarjeta = this.tarjetas.find(t => t.cod_tarj === codTarNum);

// DESPUÉS:
const tarjeta = this.tarjetas.find(t => String(t.cod_tarj) === String(item.cod_tar));
```

**4. Línea 2060 - onTipoPagoChange()**:
```typescript
// ANTES:
item.cod_tar = nuevoCodTar;

// DESPUÉS:
item.cod_tar = String(nuevoCodTar);
```

---

## ✅ Ventajas de Normalizar a String

1. **Consistencia**: Un solo tipo de dato en todo el componente
2. **Compatibilidad con Backend**: PostgreSQL numeric se serializa como string
3. **Fix PrimeNG Dropdown**: Resolverá el problema de binding inicial
4. **Menos conversiones**: No necesitar parseInt() en múltiples lugares

---

## ⚠️ Riesgos Identificados

### Riesgo BAJO ✅
- La mayoría del código ya maneja ambos tipos con conversiones
- Backend recibe y procesa correctamente tanto string como number (JSON.parse lo maneja)
- Las comparaciones críticas ya usan toString() o ==

### Único Punto Crítico ⚠️
- **Línea 1212**: Suma de cuenta corriente (cod_tar === 111)
- **Impacto**: Si no se corrige, no sumará correctamente los items de cuenta corriente
- **Solución**: Cambiar a comparación flexible o convertir a string

---

## 🎯 Plan de Implementación

### Fase 1: Correcciones Obligatorias (CRÍTICAS)
1. ✅ Normalizar en getItemsCarrito() - **YA REALIZADO**
2. ⚠️ Corregir línea 1212 (sumarCuentaCorriente)
3. ⚠️ Corregir línea 779 (validarMetodosPagoPresupuesto)
4. ⚠️ Corregir línea 847 (validarMetodosPagoFactura)
5. ⚠️ Asegurar string en línea 2060 (onTipoPagoChange)

### Fase 2: Testing
1. Probar agregado de items (efectivo, tarjetas, transferencias)
2. Probar cambio de tipo de pago en dropdown
3. Probar revertir items en modo consulta
4. Probar cálculo de cuenta corriente (cliente con cod_tar = 111)
5. Probar validaciones de presupuesto y factura
6. Probar finalización de venta con diferentes métodos de pago

---

## 📝 Conclusión

**La normalización a string es SEGURA** siempre que se realicen las 5 correcciones identificadas.

El código actual ya tiene inconsistencias de tipos (algunas partes asumen number, otras string), por lo que esta normalización en realidad **MEJORA** la consistencia del código.

**Recomendación**: ✅ PROCEDER con las correcciones restantes.

---

## 🔧 Código de las Correcciones

### Corrección 1: sumarCuentaCorriente (línea 1212)
```typescript
// Cambiar de:
if (item.cod_tar === 111) {

// A:
if (String(item.cod_tar) === '111') {
```

### Corrección 2: validarMetodosPagoPresupuesto (línea 779)
```typescript
// Cambiar de:
const tarjeta = this.tarjetas.find(t => t.cod_tarj === codTarNum);

// A:
const tarjeta = this.tarjetas.find(t => String(t.cod_tarj) === String(item.cod_tar));
```

### Corrección 3: validarMetodosPagoFactura (línea 847)
```typescript
// Cambiar de:
const tarjeta = this.tarjetas.find(t => t.cod_tarj === codTarNum);

// A:
const tarjeta = this.tarjetas.find(t => String(t.cod_tarj) === String(item.cod_tar));
```

### Corrección 4: onTipoPagoChange (línea 2060)
```typescript
// Cambiar de:
item.cod_tar = nuevoCodTar;

// A:
item.cod_tar = String(nuevoCodTar);
```

---

**Fecha**: 2025-10-25
**Autor**: Claude Code
**Estado**: Pendiente de aprobación para implementar correcciones restantes
