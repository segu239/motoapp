# CORRECCIÓN DE PROBLEMAS PDF - Parte 2

**Fecha:** 2025-12-03
**Componente:** cabeceras.component.ts
**Problema:** El PDF muestra importes incorrectos en pagos parciales

---

## RESUMEN DEL PROBLEMA

Cuando un usuario hace múltiples pagos en la misma sesión (sin recargar la página), el PDF muestra un **total incorrecto** que es la suma de TODOS los pagos realizados, en lugar de mostrar solo el pago actual.

### Ejemplo Real del Error

**Situación:**
- Cliente tiene un PR con saldo de $7,347.55
- Usuario hace un pago parcial de $2,000 con 10% de bonificación
- Pago efectivo esperado: $2,000 - $200 = $1,800

**Lo que pasó:**
| Concepto | Valor Correcto | Valor en PDF (Error) |
|----------|----------------|----------------------|
| Importe del pago | $2,000 | $7,212.20 |
| Bonificación 10% | $200 | $721.22 |
| Total aplicado | $1,800 | $6,490.98 |

**Nota:** El valor $7,212.20 viene de pagos anteriores acumulados en la sesión ($5,212.20) + el pago actual ($2,000).

---

## CAUSA RAÍZ

### Problema: Array `this.recibos` no se limpia

**Ubicación:** Línea 96 y función `generacionRecibo()` (líneas 679-739)

El array `this.recibos` se declara como propiedad de clase:
```typescript
public recibos: Recibo[] = [];  // Línea 96
```

Pero en la función `generacionRecibo()` se hace `push()` sin limpiar primero:
```typescript
async generacionRecibo(selectedCabecerasIniciales: any[]) {
  // ❌ NO HAY LIMPIEZA DE this.recibos
  let remainingImporte = this.importe;
  selectedCabecerasIniciales.forEach((cabeceraInicial, index) => {
    // ...
    this.recibos.push(recibo);  // Se acumulan los recibos
  });
  return this.recibos;  // Retorna TODOS los recibos acumulados
}
```

### Flujo del Error

```
SESIÓN DEL USUARIO:

1. Primer pago: $5,212.20
   → this.recibos = [{importe: 5212.20}]
   → PDF muestra: $5,212.20 ✅

2. Segundo pago: $2,000
   → this.recibos = [{importe: 5212.20}, {importe: 2000}]  ← ACUMULADO
   → PDF suma todo: $5,212.20 + $2,000 = $7,212.20 ❌
   → BD guarda solo: $2,000 ✅
```

---

## CORRECCIÓN

### Archivo: `src/app/components/cabeceras/cabeceras.component.ts`

### Línea 679 - Agregar limpieza del array

**Código ANTES:**
```typescript
async generacionRecibo(selectedCabecerasIniciales: any[]) {
  let remainingImporte = this.importe;
```

**Código DESPUÉS:**
```typescript
async generacionRecibo(selectedCabecerasIniciales: any[]) {
  this.recibos = [];  // Limpiar recibos anteriores
  let remainingImporte = this.importe;
```

---

## RESUMEN DE TODAS LAS CORRECCIONES (Parte 1 + Parte 2)

| # | Problema | Ubicación | Corrección |
|---|----------|-----------|------------|
| 1 | PDF sumaba bonificación en lugar de restarla | Línea 1838 | `+=` → `-=` |
| 2 | PDF sumaba bonificación en lugar de restarla | Línea 1841 | `+=` → `-=` |
| 3 | Pago exacto no actualizaba saldo | Línea 754 | `<` → `<=` |
| 4 | **NUEVO:** Recibos se acumulaban entre pagos | Línea 679 | Agregar `this.recibos = [];` |

---

## VERIFICACIÓN

Después de aplicar la corrección, el comportamiento será:

| Pago | Importe | Bonif | PDF muestra | BD guarda |
|------|---------|-------|-------------|-----------|
| 1º | $5,212.20 | 15% | $4,430.37 | $4,430.37 |
| 2º | $2,000 | 10% | $1,800 | $1,800 |
| 3º | $3,000 | 0% | $3,000 | $3,000 |

Cada pago mostrará SOLO su importe, no la suma acumulada.

---

*Documento generado el 2025-12-03*
*Complementario a CORRECCION_PROBLEMAS_PDF.md e IMPLEMENTACION_CORRECCION_PROBLEMAS_PDF.md*
