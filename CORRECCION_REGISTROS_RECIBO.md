# CORRECCIÓN DE REGISTROS EN RECIBO PDF

**Fecha:** 2025-12-03
**Componente:** cabeceras.component.ts
**Función:** generarReciboImpreso()

---

## PROBLEMA

Los valores mostrados en el PDF del recibo están **invertidos**:

| Campo en PDF | Muestra Actualmente | Debería Mostrar |
|--------------|---------------------|-----------------|
| La Cantidad de Pesos (letras) | Importe bruto ($4,000) | Pago efectivo ($3,200) |
| Neto a Cobrar | Importe bruto ($4,000) | Pago efectivo ($3,200) |
| TOTAL APLICADO | Pago efectivo ($3,200) | Importe bruto ($4,000) |

### Ejemplo con datos reales

**Operación:** Pago de $4,000 con 20% de bonificación

| Concepto | Valor |
|----------|-------|
| Importe bruto (se aplica a la deuda) | $4,000 |
| Bonificación (20%) | -$800 |
| **Pago efectivo (lo que paga el cliente)** | **$3,200** |

**Lo correcto en el PDF:**
- "La Cantidad de Pesos: TRES MIL DOSCIENTOS" → $3,200 (lo que paga)
- "Neto a Cobrar: $3,200" → lo que paga
- "TOTAL APLICADO: $4,000" → lo que se descuenta de la deuda

---

## UBICACIÓN DEL CÓDIGO

**Archivo:** `src/app/components/cabeceras/cabeceras.component.ts`
**Función:** `generarReciboImpreso()` (línea 1499)

### Variables actuales

```typescript
// Línea 1501 - totalImporte = suma de importes de recibos (importe bruto)
const totalImporte = pagoCC.recibo.reduce((sum, recibo) => sum + recibo.importe, 0);

// Línea 1537 - numeroenPlabras usa totalImporte (INCORRECTO)
let numeroenPlabras = this.numeroAPalabras(totalImporte);
```

### Uso actual en el PDF

```typescript
// Líneas 1678-1682 - Usan totalImporte (importe bruto) - INCORRECTO
{ text: 'La Cantidad de Pesos:          ' + numeroenPlabras + '\n', },
{ text: 'Neto a Cobrar:          ' + numeroenPlabras + '          $' + totalImporte + '\n', },

// Línea 1783 - Usa calcularTotalEfectivoEnPDF (pago efectivo) - INCORRECTO
['TOTAL APLICADO: $' + this.calcularTotalEfectivoEnPDF(totalImporte, bonificacionRecibo, bonificacionTipo, interesRecibo, interesTipo).toFixed(2)],
```

---

## PLAN DE CORRECCIÓN

### Paso 1: Crear variable para pago efectivo

Después de la línea 1501, agregar cálculo del pago efectivo:

```typescript
const totalImporte = pagoCC.recibo.reduce((sum, recibo) => sum + recibo.importe, 0);

// NUEVO: Calcular el pago efectivo (con bonificación/interés aplicados)
const pagoEfectivo = this.calcularTotalEfectivoEnPDF(totalImporte, bonificacionRecibo, bonificacionTipo, interesRecibo, interesTipo);
```

### Paso 2: Actualizar numeroenPlabras

Cambiar línea 1537 para usar el pago efectivo:

**ANTES:**
```typescript
let numeroenPlabras = this.numeroAPalabras(totalImporte);
```

**DESPUÉS:**
```typescript
let numeroenPlabras = this.numeroAPalabras(pagoEfectivo);
```

### Paso 3: Actualizar "Neto a Cobrar"

Cambiar línea 1682 para mostrar el pago efectivo:

**ANTES:**
```typescript
{ text: 'Neto a Cobrar:          ' + numeroenPlabras + '          $' + totalImporte + '\n', },
```

**DESPUÉS:**
```typescript
{ text: 'Neto a Cobrar:          ' + numeroenPlabras + '          $' + pagoEfectivo.toFixed(2) + '\n', },
```

### Paso 4: Actualizar "TOTAL APLICADO"

Cambiar línea 1783 para mostrar el importe bruto (lo aplicado a la deuda):

**ANTES:**
```typescript
['TOTAL APLICADO: $' + this.calcularTotalEfectivoEnPDF(totalImporte, bonificacionRecibo, bonificacionTipo, interesRecibo, interesTipo).toFixed(2)],
```

**DESPUÉS:**
```typescript
['TOTAL APLICADO: $' + totalImporte.toFixed(2)],
```

---

## RESUMEN DE CAMBIOS

| Línea | Cambio |
|-------|--------|
| ~1509 | Agregar: `const pagoEfectivo = this.calcularTotalEfectivoEnPDF(...)` |
| 1537 | Cambiar: `numeroAPalabras(totalImporte)` → `numeroAPalabras(pagoEfectivo)` |
| 1682 | Cambiar: `$' + totalImporte` → `$' + pagoEfectivo.toFixed(2)` |
| 1783 | Cambiar: `calcularTotalEfectivoEnPDF(...)` → `totalImporte.toFixed(2)` |

---

## RESULTADO ESPERADO

Después de la corrección, el PDF mostrará:

```
La Cantidad de Pesos:    TRES MIL DOSCIENTOS CON CERO CENTAVOS
Retenciones:             CERO CON CERO CENTAVOS
Neto a Cobrar:           TRES MIL DOSCIENTOS CON CERO CENTAVOS    $3200.00

BONIFICACIÓN (Porcentaje):                                        20% ($800.00)

TOTAL APLICADO: $4000.00
```

Donde:
- **$3,200** = Lo que el cliente paga en efectivo
- **$4,000** = Lo que se descuenta de su deuda

---

*Documento generado el 2025-12-03*
