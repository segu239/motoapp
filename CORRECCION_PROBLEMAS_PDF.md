# INFORME COMPLETO DE INVESTIGACIÓN - Problema de Bonificación en Cabeceras

**Fecha:** 2025-12-03
**Cliente afectado:** SARATE GERARDO FABIAN (DNI: 18176072, idcli: 564949)
**Componente:** cabeceras.component.ts
**Sucursal:** 1

---

## RESUMEN EJECUTIVO

Se identificaron **DOS PROBLEMAS** que requieren corrección:

1. **PROBLEMA 1:** El PDF genera un TOTAL APLICADO incorrecto (suma la bonificación en lugar de restarla)
2. **PROBLEMA 2:** El saldo de la cuenta corriente NO se actualizó cuando el pago es exactamente igual al total

**NOTA:** En este sistema, "bonificación" y "descuento" son el mismo concepto. No existe un campo separado de "descuento".

---

## LÓGICA DE NEGOCIO CONFIRMADA

La lógica correcta del sistema es:

- El cliente tiene una deuda de $5,212.20
- Si paga con 15% de bonificación, paga efectivamente $4,430.37
- **PERO la deuda de $5,212.20 se cancela completamente** (el descuento es un beneficio, no una reducción de la deuda)

Por lo tanto:
- **Bonificación:** Reduce lo que el cliente paga en efectivo, pero NO reduce la deuda
- **Interés:** Aumenta lo que el cliente paga en efectivo, pero NO aumenta la deuda
- **El importe ingresado por el usuario** es lo que se descuenta de la cuenta corriente

---

## PROBLEMA 1: PDF genera TOTAL APLICADO incorrecto

### Ubicación
`src/app/components/cabeceras/cabeceras.component.ts` líneas 1830-1857

### Función afectada
`calcularTotalEfectivoEnPDF()`

### Descripción
Esta función calcula el total que se muestra en el PDF del recibo. Actualmente **SUMA** la bonificación cuando debería **RESTARLA**.

### Código erróneo actual

```typescript
// Línea 1834-1843 - INCORRECTO
// Sumar bonificaciones (descuentos que se aplican a favor del cliente)
if (bonificacionRecibo && bonificacionRecibo > 0) {
  if (bonificacionTipo === 'P') {
    // Si es porcentaje, calcular el valor monetario
    totalEfectivo += (bonificacionRecibo * totalImporte) / 100;  // ❌ SUMA
  } else {
    // Si es importe directo
    totalEfectivo += bonificacionRecibo;  // ❌ SUMA
  }
}
```

### Evidencia en imagen del comprobante

| Campo | Valor |
|-------|-------|
| Importe ingresado | $5,212.20 |
| Bonificación | 15% ($781.83) |
| Total mostrado | ~$5,994.03 |
| **Total correcto** | **$4,430.37** |

El sistema sumó: `5212.20 + 781.83 = $5,994.03`
Debería restar: `5212.20 - 781.83 = $4,430.37`

---

## PROBLEMA 2: El saldo de cuenta corriente NO se actualizó

### Evidencia en Base de Datos

#### Tabla `caja_movi` (SÍ se registró correctamente)
```
id_movimiento: 376
fecha_mov: 2025-12-03
importe_mov: $4,430.37  ← CORRECTO (con bonificación restada)
descripcion_mov: "RC 101 Rec. Nº 101"
cliente: 564949
tipo_comprobante: RC
```

#### Tabla `recibos1` (SÍ se registró correctamente)
```
recibo: 127
fecha: 2025-12-03
importe: $5,212.20
bonifica: 15.00
bonifica_tipo: P
recibo_asoc: 100  ← Asociado al PR 100
id_fac: 101
```

#### Tabla `factcab1` - AQUÍ ESTÁ EL PROBLEMA
```
PR id_num=100:
  - total: $5,212.20
  - saldo: $5,212.20  ← ❌ NO SE DESCONTÓ NADA (debería ser $0)
  - id_aso: 0
```

### Causa Raíz Identificada

El problema está en la función `ajuste()` en la línea 754:

```typescript
// Línea 751-778
ajuste(selectedCabeceras: any[]) {
  this.currentSaldoArray = [];
  // Verificar si el importe es menor que el totalSum
  if (this.importe < this.totalSum) {  // ❌ PROBLEMA: usa < en lugar de <=
    // ... ajusta saldos
    return selectedCabeceras;
  } else {
    // Si el importe NO es menor que el totalSum, retorna array vacío
    console.error('El importe es mayor o igual al totalSum, ajuste no realizado.');
    return [];  // ❌ NO SE AJUSTAN LOS SALDOS
  }
}
```

### Flujo del Error

1. Usuario ingresa importe: `$5,212.20`
2. Total de la factura seleccionada (`totalSum`): `$5,212.20`
3. Condición: `5212.20 < 5212.20` = **FALSE**
4. La función `ajuste()` retorna `[]` (array vacío)
5. `filterCabeceras([])` no filtra nada
6. `cabecerasFiltered` queda vacío
7. **El backend NO recibe cabeceras para actualizar el saldo**

### Consecuencia

- El recibo RC se crea correctamente
- El movimiento de caja se registra correctamente
- **PERO el saldo del documento original (PR) NO se actualiza**
- El cliente aparece con deuda cuando ya pagó

---

## ESTADO DE FUNCIONES RELACIONADAS

### Tabla de estado actual

| Función | Bonificación | Interés | Estado |
|---------|--------------|---------|--------|
| `calcularImporteMovConBonificacionesIntereses()` | ✅ RESTA (-=) | ✅ SUMA (+=) | **CORRECTO** |
| `calcularTotalEfectivoEnPDF()` | ❌ SUMA (+=) | ✅ SUMA (+=) | **ERROR en bonificación** |
| `ajuste()` | N/A | N/A | **ERROR en operador** |

### Función `calcularImporteMovConBonificacionesIntereses()` - YA CORREGIDA

**Ubicación:** Líneas 1374-1412
**Estado:** ✅ CORRECTO

```typescript
// Bonificación - CORRECTO (resta)
importeFinal -= (this.bonificacion * importeBase) / 100;  // ✅

// Interés - CORRECTO (suma)
importeFinal += (this.interes * importeBase) / 100;  // ✅
```

Esta función fue corregida en el commit `0204e51` del 6 de agosto de 2025.

---

## ANÁLISIS DEL FLUJO DE DATOS

```
Usuario ingresa: $5,212.20 con 15% bonificación
Total factura (deuda): $5,212.20

┌──────────────────────────────────────────────────────────────────────────────┐
│ FUNCIÓN                              │ OPERACIÓN         │ RESULTADO        │
├──────────────────────────────────────────────────────────────────────────────┤
│ ajuste()                                                                     │
│ (descuento de cuenta corriente)      │ Usa this.importe  │ ✅ $5,212.20     │
│                                      │ (importe bruto)   │ se cancela deuda │
├──────────────────────────────────────────────────────────────────────────────┤
│ calcularImporteMovConBonificacionesIntereses()                               │
│ (para caja_movi - dinero efectivo)   │ RESTA bonif (-)   │ ✅ $4,430.37     │
│                                      │ 5212.20 - 781.83  │ pago efectivo    │
├──────────────────────────────────────────────────────────────────────────────┤
│ calcularTotalEfectivoEnPDF()                                                 │
│ (para el PDF impreso)                │ SUMA bonif (+)    │ ❌ ~$5,994.03    │
│                                      │ 5212.20 + 781.83  │ INCORRECTO       │
└──────────────────────────────────────────────────────────────────────────────┘

PROBLEMA ADICIONAL:
┌──────────────────────────────────────────────────────────────────────────────┐
│ ajuste() - condición de ejecución                                            │
│ if (this.importe < this.totalSum)    │ 5212.20 < 5212.20 │ ❌ FALSE         │
│                                      │ = FALSE           │ No se ejecuta    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## CORRECCIONES NECESARIAS

### CORRECCIÓN 1: Función `calcularTotalEfectivoEnPDF()`

**Archivo:** `src/app/components/cabeceras/cabeceras.component.ts`
**Líneas:** 1838 y 1841

#### Código ANTES (incorrecto)

```typescript
// Sumar bonificaciones (descuentos que se aplican a favor del cliente)
if (bonificacionRecibo && bonificacionRecibo > 0) {
  if (bonificacionTipo === 'P') {
    totalEfectivo += (bonificacionRecibo * totalImporte) / 100;  // ❌ ERROR
  } else {
    totalEfectivo += bonificacionRecibo;  // ❌ ERROR
  }
}
```

#### Código DESPUÉS (corregido)

```typescript
// Restar bonificaciones (descuentos que se aplican a favor del cliente - REDUCEN el pago)
if (bonificacionRecibo && bonificacionRecibo > 0) {
  if (bonificacionTipo === 'P') {
    totalEfectivo -= (bonificacionRecibo * totalImporte) / 100;  // ✅ CORRECTO
  } else {
    totalEfectivo -= bonificacionRecibo;  // ✅ CORRECTO
  }
}
```

**NOTA:** El interés ya está correctamente implementado con `+=` (suma).

---

### CORRECCIÓN 2: Función `ajuste()`

**Archivo:** `src/app/components/cabeceras/cabeceras.component.ts`
**Línea:** 754

#### Código ANTES (incorrecto)

```typescript
if (this.importe < this.totalSum) {  // ❌ No incluye caso de pago exacto
```

#### Código DESPUÉS (corregido)

```typescript
if (this.importe <= this.totalSum) {  // ✅ Incluye caso de pago exacto
```

---

## RESUMEN DE CORRECCIONES

| # | Función | Línea | Cambio | Razón |
|---|---------|-------|--------|-------|
| 1 | `calcularTotalEfectivoEnPDF()` | 1838 | `+=` → `-=` | Bonificación debe restar |
| 2 | `calcularTotalEfectivoEnPDF()` | 1841 | `+=` → `-=` | Bonificación debe restar |
| 3 | `ajuste()` | 754 | `<` → `<=` | Incluir pago exacto |

---

## VERIFICACIÓN POST-CORRECCIÓN

Con estas correcciones, el sistema funcionará así:

| Escenario | Deuda | Bonif | Interés | Pago Efectivo | Saldo Final | PDF |
|-----------|-------|-------|---------|---------------|-------------|-----|
| Pago simple | $5,212 | 0% | 0% | $5,212.00 | $0.00 | ✅ $5,212.00 |
| Con bonificación | $5,212 | 15% | 0% | $4,430.37 | $0.00 | ✅ $4,430.37 |
| Con interés | $5,212 | 0% | 10% | $5,733.42 | $0.00 | ✅ $5,733.42 |
| Ambos | $5,212 | 15% | 10% | $4,951.59 | $0.00 | ✅ $4,951.59 |
| Pago parcial | $5,212 | 0% | 0% | $3,000.00 | $2,212.00 | ✅ $3,000.00 |

---

## DATOS PARA CORRECCIÓN MANUAL EN BD

Si se requiere corregir manualmente el caso del cliente SARATE:

```sql
-- Actualizar el saldo del PR 100 a 0 (ya fue pagado)
UPDATE factcab1
SET saldo = 0,
    id_aso = 101
WHERE id_num = 100;

-- Verificar
SELECT id_num, tipo, saldo, id_aso FROM factcab1 WHERE id_num IN (100, 101);
```

---

## ACCIONES REQUERIDAS

1. ✅ **Corregir** `calcularTotalEfectivoEnPDF()` - líneas 1838 y 1841
2. ✅ **Corregir** `ajuste()` - línea 754
3. ⚠️ **Corregir manualmente** el saldo del cliente SARATE en la BD (opcional)
4. ✅ **Probar** el flujo completo con los siguientes casos:
   - Pago exacto sin bonificación ni interés
   - Pago exacto con bonificación
   - Pago exacto con interés
   - Pago exacto con bonificación e interés
   - Pago parcial

---

## HISTORIAL DE COMMITS RELACIONADOS

| Commit | Fecha | Descripción |
|--------|-------|-------------|
| `0204e51` | 2025-08-06 | fix(cabeceras): Correct bonification calculation and enhance debug logging |
| `0087adb` | - | ahora funciona como se debe el cajamovi |
| `e731cb8` | - | se agrego al comprobante generado desde cabecera la bonificacion e interes |
| `3742447` | - | muchos cambios |

---

*Documento generado el 2025-12-03*
*Actualizado con lógica de negocio confirmada y análisis completo de bonificación e interés*
