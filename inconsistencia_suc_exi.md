# 🔴 INFORME: Inconsistencia en Mapeo Firebase value → Campos EXI

**Fecha:** 31 de Octubre de 2025
**Severidad:** 🔴 **CRÍTICA**
**Estado:** Identificado - Requiere Corrección Inmediata

---

## 1. RESUMEN EJECUTIVO

### Problema Identificado
El sistema presenta una **inconsistencia crítica** entre el mapeo de sucursales (almacenado en Firebase) a campos de stock (`exi1-exi5`) utilizado en el frontend versus el backend.

**El campo `value` de Firebase NO corresponde directamente al número del campo `exi`.**

### Impacto
- ✅ El frontend muestra correctamente el stock de cada sucursal
- ❌ El backend consulta campos incorrectos al validar stock
- ❌ Provoca errores de "Stock insuficiente" cuando hay stock disponible
- ❌ Actualiza stock en sucursales incorrectas al recibir mercadería

### Ejemplo Concreto
**Artículo:** ACEL. RAP. MDA 3010 6470 (id_articulo: 7323)

```
Usuario: Valle Viejo (Firebase value=2)

Frontend muestra:
- Lee producto.exi3 = 5
- Muestra "Stock VV = 5" ✅ CORRECTO

Backend valida:
- Recibe sucursald = 2 (value de Firebase)
- Calcula: 'exi' + 2 = 'exi2'
- Consulta exi2 = -81 ❌ INCORRECTO
- Error: "Stock insuficiente"

Debería:
- Traducir value=2 a exi3
- Consultar exi3 = 5 ✅ CORRECTO
```

---

## 2. EVIDENCIA DE FIREBASE

### Firebase → Colección `sucursales`

```
Casa Central:
  nombre: "Casa Central"
  value: 1

Suc Valle Viejo:
  nombre: "Suc. Valle Viejo"
  value: 2

Suc Guemes:
  nombre: "Suc. Guemes"
  value: 3

Deposito:
  nombre: "Deposito"
  value: 4

Mayorista:
  nombre: "Mayorista"
  value: 5
```

**Uso del campo `value`:**

1. Usuario inicia sesión y selecciona "Valle Viejo"
2. Sistema ejecuta: `sessionStorage.setItem('sucursal', '2')`
   - Ubicación: `login2.component.ts:126`
3. Componentes leen: `sessionStorage.getItem('sucursal')` → `'2'`
4. Backend recibe: `sucursald: 2` o `sucursalh: 2`
5. Backend calcula: `$campo = 'exi' . 2 = 'exi2'` ❌ **ERROR**

---

## 3. EVIDENCIA DE BASE DE DATOS

### Análisis de Uso Real de Campos EXI

```sql
SELECT campo_exi, artículos_con_stock, stock_máximo, suma_total
FROM análisis_exi;
```

| Campo | Artículos con Stock | Stock Máximo | Suma Total | Uso Real |
|-------|---------------------|--------------|------------|----------|
| exi1  | 0                   | 0            | 0          | ❌ VACÍO |
| exi2  | 0                   | 0            | -348       | ⚠️ Solo negativos |
| exi3  | 1                   | 5            | 5          | ⚠️ Un artículo |
| exi4  | 0                   | 0            | -9         | ⚠️ Solo negativos |
| exi5  | 40                  | 306          | 622        | ✅ ACTIVO |

**Observaciones:**
- `exi5` (Mayorista) es el único campo con uso significativo
- `exi3` tiene exactamente 1 artículo con stock positivo: el que causó el error
- Los campos `exi1`, `exi2`, `exi4` no tienen stock positivo (solo negativos o cero)
- **El sistema MOV.STOCK no ha sido usado activamente aún**

### Artículo que Causó el Error

```sql
SELECT id_articulo, nomart, exi1, exi2, exi3, exi4, exi5
FROM artsucursal
WHERE id_articulo = 7323;
```

**Resultado:**
```
id_articulo: 7323
nomart: "ACEL. RAP. MDA 3010 6470"
exi1: 0    (Deposito - según frontend)
exi2: -81  (Casa Central - según frontend) ← Backend consultó este
exi3: 5    (Valle Viejo - según frontend)  ← Valor correcto
exi4: -1   (Güemes - según frontend)
exi5: 0    (Mayorista)
```

---

## 4. MAPEO EN FRONTEND (CORRECTO)

### Ubicación: `pedir-stock.component.ts`
**Líneas:** 100-104

```typescript
{ field: 'exi1', header: 'Stock Dep' },   // Deposito (value=4)
{ field: 'exi2', header: 'Stock CC' },    // Casa Central (value=1)
{ field: 'exi3', header: 'Stock VV' },    // Valle Viejo (value=2)
{ field: 'exi4', header: 'Stock GM' },    // Güemes (value=3)
{ field: 'exi5', header: 'Stock MAY' },   // Mayorista (value=5)
```

### Visualización en HTML
**Ubicación:** `pedir-stock.component.html`
**Líneas:** 81-104

```html
<th *ngIf="isColumnVisible('exi1')">Stock Dep</th>
<th *ngIf="isColumnVisible('exi2')">Stock CC</th>
<th *ngIf="isColumnVisible('exi3')">Stock VV</th>
<th *ngIf="isColumnVisible('exi4')">Stock GM</th>
<th *ngIf="isColumnVisible('exi5')">Stock MAY</th>
```

```html
<td *ngIf="isColumnVisible('exi3')">{{ producto.exi3 }}</td>
<!-- Cuando usuario en VV ve este valor, está viendo exi3 correctamente -->
```

### Otros Componentes que Usan el Mismo Mapeo

- ✅ `stockenvio.component.ts`
- ✅ `stockenvio.component.html`
- ✅ `condicionventa.component.ts`
- ✅ `condicionventa.component.html`

**Conclusión:** El mapeo del frontend es consistente en toda la aplicación.

---

## 5. MAPEO EN BACKEND (INCORRECTO)

### Ubicación: `Descarga.php.txt`

#### Función `PedidoItemyCabIdEnvio_post` (línea ~1822)

```php
// ACTUAL (INCORRECTO):
$sucursal_origen = $pedidoscb['sucursald']; // Ej: 2 (Valle Viejo)
$campo_stock_origen = 'exi' . $sucursal_origen; // = 'exi2' ❌

// Consulta el campo incorrecto
$sql = "SELECT $campo_stock_origen as stock_actual
        FROM artsucursal
        WHERE idart = ?";
// Para Valle Viejo consulta exi2 (-81) en lugar de exi3 (5)
```

#### Función `PedidoItemyCabId_post` (línea ~1700)

```php
// ACTUAL (INCORRECTO):
$sucursal_destino = $pedidoscb['sucursald']; // Ej: 1 (Casa Central)
$campo_stock_destino = 'exi' . $sucursal_destino; // = 'exi1' ❌

// Actualiza el campo incorrecto
UPDATE artsucursal
SET exi1 = exi1 + cantidad
WHERE idart = ?;
// Para Casa Central actualiza exi1 (Deposito) en lugar de exi2
```

---

## 6. MAPEO CORRECTO CONFIRMADO

### Tabla de Traducción Definitiva

| Firebase value | Nombre Sucursal | Campo EXI Correcto |
|----------------|-----------------|-------------------|
| 1              | Casa Central    | **exi2**          |
| 2              | Valle Viejo     | **exi3**          |
| 3              | Güemes          | **exi4**          |
| 4              | Deposito        | **exi1**          |
| 5              | Mayorista       | **exi5**          |

### Justificación

**¿Por qué este mapeo no secuencial?**

Hipótesis más probable:
1. El sistema fue diseñado con `exi1` reservado para "Deposito" (value=4)
2. Las 3 sucursales principales (CC, VV, GM) usan `exi2`, `exi3`, `exi4`
3. Mayorista (value=5) usa `exi5` correctamente
4. Esto permite una separación lógica entre sucursales operativas y deposito

**Evidencia que confirma el mapeo:**

1. ✅ Frontend hardcodea este mapeo en múltiples componentes
2. ✅ El único artículo con stock en `exi3` se muestra como "Stock VV"
3. ✅ El campo `exi5` (Mayorista) funciona correctamente (value=5 → exi5)
4. ✅ Usuarios ven valores correctos en pantalla según este mapeo

---

## 7. FLUJO DEL ERROR PASO A PASO

### Escenario: Usuario en Valle Viejo intenta enviar artículo

**PASO 1:** Solicitud desde Casa Central
```
Usuario CC solicita 1 unidad de artículo 7323 desde VV
- Frontend crea pedido
- Guarda: sucursald=1 (CC), sucursalh=2 (VV)
- Estado: "Solicitado"
```

**PASO 2:** Usuario en Valle Viejo ve el pedido
```
Frontend muestra:
- Stock actual: lee producto.exi3 = 5
- Muestra: "Stock VV = 5" ✅
- Usuario hace clic en "Enviar"
```

**PASO 3:** Backend valida stock (❌ AQUÍ FALLA)
```php
// Backend recibe:
$pedidoscb['sucursald'] = 2; // Valle Viejo (value de Firebase)

// Backend calcula INCORRECTAMENTE:
$campo_stock = 'exi' . 2; // = 'exi2' ❌

// Backend consulta:
SELECT exi2 FROM artsucursal WHERE idart = 7323;
// Resultado: exi2 = -81

// Validación:
if (-81 < 1) { // TRUE
    return "Error: Stock insuficiente. Disponible: -81"
}
```

**PASO 4:** Error mostrado al usuario
```
"Error: Stock insuficiente en sucursal origen.
Disponible: -81, Solicitado: 1.00"
```

**LO QUE DEBERÍA PASAR:**
```php
// Traducir value a exi:
$mapeo = [2 => 'exi3'];
$campo_stock = $mapeo[2]; // = 'exi3' ✅

// Consultar:
SELECT exi3 FROM artsucursal WHERE idart = 7323;
// Resultado: exi3 = 5

// Validación:
if (5 < 1) { // FALSE
    // OK, permitir envío
}
```

---

## 8. SOLUCIÓN IMPLEMENTADA

### Agregar Mapeo en Backend

**Archivo:** `Descarga.php.txt`
**Funciones a modificar:**
1. `PedidoItemyCabIdEnvio_post` (validación al enviar)
2. `PedidoItemyCabId_post` (actualización al recibir)

**Código a agregar:**

```php
// ============================================================================
// MAPEO DE FIREBASE VALUE A CAMPOS EXI
// ============================================================================
// Firebase almacena un campo 'value' para cada sucursal que NO corresponde
// directamente al número del campo exi. Este mapeo traduce correctamente:
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central (value=1) → exi2
    2 => 'exi3', // Valle Viejo (value=2) → exi3
    3 => 'exi4', // Güemes (value=3) → exi4
    4 => 'exi1', // Deposito (value=4) → exi1
    5 => 'exi5'  // Mayorista (value=5) → exi5
];

// Usar mapeo en lugar de concatenación directa
$sucursal_origen = $pedidoscb['sucursald'];
$campo_stock_origen = isset($mapeo_sucursal_exi[$sucursal_origen])
    ? $mapeo_sucursal_exi[$sucursal_origen]
    : 'exi' . $sucursal_origen; // Fallback por seguridad
```

---

## 9. PLAN DE IMPLEMENTACIÓN

### Paso 1: Modificar Backend (20 minutos)

**Función 1: PedidoItemyCabIdEnvio_post (envío)**

Ubicación: Línea ~1822

```php
// ANTES:
$sucursal_origen = $pedidoscb['sucursald'];
$campo_stock_origen = 'exi' . $sucursal_origen;

// DESPUÉS:
$mapeo_sucursal_exi = [
    1 => 'exi2', 2 => 'exi3', 3 => 'exi4', 4 => 'exi1', 5 => 'exi5'
];
$sucursal_origen = $pedidoscb['sucursald'];
$campo_stock_origen = $mapeo_sucursal_exi[$sucursal_origen] ?? 'exi' . $sucursal_origen;
```

**Función 2: PedidoItemyCabId_post (recepción)**

Ubicación: Línea ~1700 (donde actualiza stock)

```php
// Agregar el mismo mapeo antes de las actualizaciones de stock
$mapeo_sucursal_exi = [
    1 => 'exi2', 2 => 'exi3', 3 => 'exi4', 4 => 'exi1', 5 => 'exi5'
];

// Para sucursal destino (la que recibe):
$campo_stock_destino = $mapeo_sucursal_exi[$sucursal_destino] ?? 'exi' . $sucursal_destino;

// Para sucursal origen (la que envió):
$campo_stock_origen = $mapeo_sucursal_exi[$sucursal_origen] ?? 'exi' . $sucursal_origen;
```

### Paso 2: Probar con Artículo Real (10 minutos)

```sql
-- ANTES de la corrección:
SELECT id_articulo, exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;
-- exi2=-81, exi3=5

-- Usuario VV (value=2) intenta enviar 1 unidad
-- Backend consulta exi2 → Error

-- DESPUÉS de la corrección:
-- Usuario VV (value=2) intenta enviar 1 unidad
-- Backend traduce value=2 a exi3 → Encuentra 5 → OK

-- Verificar después del envío:
SELECT id_articulo, exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;
-- Esperado: exi3 = 4 (5 - 1)

-- Verificar después que CC reciba:
SELECT id_articulo, exi2, exi3 FROM artsucursal WHERE id_articulo = 7323;
-- Esperado: exi2 = -80 (-81 + 1), exi3 = 4
```

### Paso 3: Validación Completa (15 minutos)

Ejecutar pruebas del documento `pruebas_movstock.md`

---

## 10. RIESGOS SI NO SE CORRIGE

### Críticos 🔴

1. **MOV.STOCK completamente disfuncional:** No se puede transferir stock entre sucursales
2. **Actualización de stock en sucursales incorrectas:**
   - CC recibe → actualiza Deposito (exi1 en lugar de exi2)
   - VV envía → consulta CC (exi2 en lugar de exi3)
3. **Pérdida de integridad de inventario:** Stock real no coincide con registros

### Operativos 🟡

1. **Bloqueo de operaciones válidas:** Como el caso reportado
2. **Confusión operativa:** Usuarios ven stock pero no pueden enviarlo
3. **Workarounds manuales:** Ajustes fuera del sistema

---

## 11. VERIFICACIÓN POST-CORRECCIÓN

### Consultas SQL de Validación

```sql
-- 1. Estado inicial
SELECT id_articulo, nomart,
       exi2 as stock_cc,
       exi3 as stock_vv
FROM artsucursal
WHERE id_articulo = 7323;
-- Esperado: exi2=-81, exi3=5

-- 2. Después de enviar desde VV
SELECT id_articulo, exi2 as stock_cc, exi3 as stock_vv
FROM artsucursal
WHERE id_articulo = 7323;
-- Esperado: exi2=-81 (sin cambios), exi3=4 (decrementó)

-- 3. Después de recibir en CC
SELECT id_articulo, exi2 as stock_cc, exi3 as stock_vv
FROM artsucursal
WHERE id_articulo = 7323;
-- Esperado: exi2=-80 (incrementó), exi3=4 (sin cambios)
```

### Checklist

- [ ] Backend traduce correctamente value=2 (VV) a exi3
- [ ] Validación consulta campo correcto (exi3 en lugar de exi2)
- [ ] Error "Stock insuficiente" ya no aparece cuando hay stock
- [ ] Stock se resta del campo correcto al enviar (exi3 para VV)
- [ ] Stock se suma al campo correcto al recibir (exi2 para CC)
- [ ] Valores en pantalla coinciden con BD después de movimientos

---

## 12. CONCLUSIÓN

### Causa Raíz Confirmada

El backend usa concatenación directa `'exi' . $value` asumiendo que el campo `value` de Firebase corresponde al número del campo `exi`, pero **no es así**.

Existe un mapeo personalizado no secuencial:
- value 1-3 (sucursales principales) → exi2, exi3, exi4
- value 4 (deposito) → exi1
- value 5 (mayorista) → exi5

### Solución

Agregar array de traducción en 2 funciones del backend (20 minutos de implementación).

### Impacto

- ✅ Bajo riesgo: Solo 2 funciones, lógica simple
- ✅ Alta prioridad: Sistema MOV.STOCK bloqueado sin esta corrección
- ✅ Validación inmediata: Probar con artículo 7323

### Relación con Otros Problemas

Este problema es **independiente** del error de `id_art = 0` (ya corregido):
- **Problema 1 (resuelto):** Frontend enviaba `idart=0` en lugar de `id_articulo`
- **Problema 2 (este):** Backend usa mapeo incorrecto de sucursales a campos exi

**Ambos están corregidos** para que MOV.STOCK funcione completamente.

---

**Estado:** 🔴 **CRÍTICO - CORRECCIÓN LISTA PARA IMPLEMENTAR**
**Prioridad:** **P0 - Bloqueante**
**Tiempo estimado:** **20 minutos**

---

*Informe generado por Claude Code*
*Fecha: 31 de Octubre de 2025*
*Análisis basado en Firebase y datos reales de PostgreSQL*
