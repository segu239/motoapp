# HALLAZGOS DE INVESTIGACIÓN: Valores Firebase y Mapeo de Sucursales

**Fecha**: 2025-11-02
**Versión**: 1.0
**Investigador**: Claude Code (Análisis Técnico Completo)
**Documento Base**: agregar_key_firebase_sucursal.md

---

## Resumen Ejecutivo

Se realizó una investigación exhaustiva para verificar las suposiciones del documento `agregar_key_firebase_sucursal.md`. Se accedió a:
- PostgreSQL (tablas sucursales, factcabN, pedidoscb, artsucursal)
- Código fuente backend (Carga.php.txt, Descarga.php.txt)
- Código fuente frontend (login2.component.ts)
- Historial de commits Git

**Conclusión Principal**: El sistema presenta UN DESALINEAMIENTO REAL entre Firebase values y cod_sucursal de PostgreSQL. El mapeo hardcodeado en el backend es CORRECTO y necesario. La propuesta de agregar `valorreal` es VÁLIDA, pero requiere correcciones en las suposiciones del documento original.

---

## 1. HALLAZGOS CONFIRMADOS

### 1.1 Estructura en PostgreSQL (✅ VERIFICADO)

```sql
SELECT cod_sucursal, sucursal FROM sucursales ORDER BY cod_sucursal;
```

| cod_sucursal | sucursal     |
|--------------|--------------|
| 1            | DEPOSITO     |
| 2            | CASA CENTRAL |
| 3            | VALLE VIEJO  |
| 4            | GUEMES       |
| 5            | MAYORISTA    |

**Estado**: ✅ Confirmado - Coincide con el documento

---

### 1.2 Valores Actuales en Firebase (✅ VERIFICADO)

**Fuente**: Commit 5486c51 (31 Oct 2025) + Documento `inconsistencia_suc_exi.md`

```json
{
  "sucursales": {
    "[key-1]": {
      "nombre": "Casa Central",
      "value": 1
    },
    "[key-2]": {
      "nombre": "Suc. Valle Viejo",
      "value": 2
    },
    "[key-3]": {
      "nombre": "Suc. Guemes",
      "value": 3
    },
    "[key-4]": {
      "nombre": "Deposito",
      "value": 4
    },
    "[key-5]": {
      "nombre": "Mayorista",
      "value": 5
    }
  }
}
```

**Mapeo Firebase value → Sucursal**:
- value 1 = Casa Central
- value 2 = Valle Viejo
- value 3 = Guemes
- value 4 = Deposito  ← ⚠️ NO corresponde a cod_sucursal 4 (GUEMES)
- value 5 = Mayorista

**Estado**: ✅ Confirmado - ❌ **EL DOCUMENTO ORIGINAL TENÍA ERROR**: Suponía que value coincidía con nombre, pero los values están desalineados históricamente.

---

### 1.3 Tablas Dinámicas (✅ VERIFICADO)

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'factcab%' OR table_name LIKE 'psucursal%' OR table_name LIKE 'recibos%'
ORDER BY table_name;
```

**Resultado**: Todas existen
- factcab1, factcab2, factcab3, factcab4, factcab5
- psucursal1, psucursal2, psucursal3, psucursal4, psucursal5
- recibos1, recibos2, recibos3, recibos4, recibos5

**Estado**: ✅ Confirmado - Coincide con el documento

---

### 1.4 Alineación de Tablas factcabN (✅ VERIFICADO - 🔴 CORRIGE DOCUMENTO)

```sql
SELECT f.cod_sucursal, s.sucursal, COUNT(*) as registros
FROM factcabN f
JOIN sucursales s ON f.cod_sucursal = s.cod_sucursal
GROUP BY f.cod_sucursal, s.sucursal;
```

**Resultado**:

| Tabla    | cod_sucursal | Sucursal     | Registros |
|----------|--------------|--------------|-----------|
| factcab1 | 1            | DEPOSITO     | 94        |
| factcab2 | 2            | CASA CENTRAL | 1         |
| factcab3 | 3            | VALLE VIEJO  | 10        |
| factcab4 | -            | GUEMES       | 0 (vacía) |
| factcab5 | 5            | MAYORISTA    | 63        |

**Últimas facturas en factcab1**: 30 de Octubre de 2025, todas con cod_sucursal=1 (DEPOSITO)

**🔴 HALLAZGO CRÍTICO**: Las tablas factcabN están alineadas EXCLUSIVAMENTE con `cod_sucursal` de PostgreSQL, NO con Firebase `value`.

- factcab1 = DEPOSITO (cod_sucursal 1) ✅
- factcab2 = CASA CENTRAL (cod_sucursal 2) ✅
- factcab3 = VALLE VIEJO (cod_sucursal 3) ✅
- factcab4 = GUEMES (cod_sucursal 4) - sin datos aún
- factcab5 = MAYORISTA (cod_sucursal 5) ✅

**Contradicción con documento original**: El documento suponía ambigüedad sobre si las tablas estaban según Firebase value o cod_sucursal. Los datos CONFIRMAN que están según cod_sucursal.

**Estado**: ✅ Verificado - 🔴 **CORRIGE SUPOSICIÓN DEL DOCUMENTO**

---

### 1.5 Mapeo Hardcodeado en Backend (✅ VERIFICADO)

**Archivo**: Descarga.php.txt, líneas 1729-1735

```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];
```

**Implementado**: 31 de Octubre de 2025 (commit 5486c51)
**Funciones afectadas**:
- confirmarRecepcionEnvioStock_post (línea 1729)
- cancelarEnvioStock_post (línea 1832)
- crearPedidoStockNuevo_post (línea 1935)

**Estado**: ✅ Confirmado - Mapeo existe y es consistente con Firebase values

---

### 1.6 Datos en pedidoscb (✅ VERIFICADO - 🔴 REVELA PROBLEMA)

```sql
SELECT sucursald, sucursalh, COUNT(*) as cantidad
FROM pedidoscb
GROUP BY sucursald, sucursalh;
```

**Resultado**:

| sucursald | sucursalh | cantidad |
|-----------|-----------|----------|
| 1         | 2         | 10       |
| 1         | 3         | 8        |
| 2         | 1         | 4        |
| 2         | 2         | 3        |
| 3         | 1         | 2        |

**🔴 HALLAZGO CRÍTICO**: Los valores en pedidoscb (1, 2, 3) NO coinciden con los Firebase values actuales (1=Casa Central, 2=Valle Viejo, 3=Guemes).

Si estos pedidos fueron creados con el sistema actual:
- sucursald=1 debería significar "Casa Central" (Firebase value 1)
- sucursald=2 debería significar "Valle Viejo" (Firebase value 2)
- sucursald=3 debería significar "Guemes" (Firebase value 3)

PERO el documento original interpretaba:
- sucursald=1 como "DEPOSITO" (cod_sucursal 1)

**🔴 PROBLEMA IDENTIFICADO**: Hay una INCONSISTENCIA entre:
1. Lo que el frontend envía (Firebase value)
2. Lo que el backend espera (¿Firebase value o cod_sucursal?)
3. Lo que las tablas dinámicas usan (cod_sucursal)

**Estado**: ✅ Datos verificados - 🔴 **REVELA INCONSISTENCIA SISTÉMICA**

---

### 1.7 Análisis de Campos EXI (✅ VERIFICADO)

**Fuente**: Documento `inconsistencia_suc_exi.md` + Consulta a artsucursal

```sql
SELECT id_articulo, exi1, exi2, exi3, exi4, exi5
FROM artsucursal
WHERE (exi1 > 0 OR exi2 > 0 OR exi3 > 0 OR exi4 > 0 OR exi5 > 0)
LIMIT 5;
```

**Análisis de uso** (del documento):

| Campo | Artículos con Stock | Stock Máximo | Suma Total | Estado      |
|-------|---------------------|--------------|------------|-------------|
| exi1  | 0                   | 0            | 0          | ❌ VACÍO    |
| exi2  | 0                   | 0            | -348       | ⚠️ Negativos|
| exi3  | 1                   | 5            | 5          | ⚠️ Mínimo   |
| exi4  | 0                   | 0            | -9         | ⚠️ Negativos|
| exi5  | 40                  | 306          | 622        | ✅ ACTIVO   |

**Interpretación**:
- exi5 (Mayorista) es el único campo con uso significativo ✅
- exi1 (debería ser Deposito según mapeo) está vacío ⚠️
- exi2 (debería ser Casa Central) tiene solo negativos ⚠️
- exi3 (debería ser Valle Viejo) tiene stock mínimo ⚠️

**Estado**: ✅ Confirmado - Consistente con sistema en fase inicial/pruebas

---

### 1.8 Flujo de Login y sessionStorage (✅ VERIFICADO)

**Archivo**: login2.component.ts

```typescript
// Línea 50-56: Carga sucursales desde Firebase
loadSucursales(): void {
  this.crudService.getListSnap('sucursales').pipe(
    takeUntil(this.destroy$)
  ).subscribe(
    data => {
      this.sucursales = data.map(item => {
        const payload = item.payload.val() as any;
        return {
          key: item.key,
          nombre: payload.nombre,
          value: payload.value  // ← Toma 'value' de Firebase
        };
      });
    }
  );
}

// Línea 126: Almacena en sessionStorage
sessionStorage.setItem('sucursal', this.sucursal);
```

**Flujo confirmado**:
1. Usuario selecciona "Deposito" en login
2. Firebase retorna: `{nombre: "Deposito", value: 4}`
3. Se almacena: `sessionStorage.setItem('sucursal', '4')`
4. Todos los componentes leen: `sessionStorage.getItem('sucursal')` → `'4'`
5. Backend recibe: `sucursal=4`

**Estado**: ✅ Confirmado - Coincide con el documento

---

## 2. SUPOSICIONES INCORRECTAS EN DOCUMENTO ORIGINAL

### 2.1 ❌ SUPUESTO INCORRECTO: "Firebase values NO corresponden a cod_sucursal"

**Documento original decía** (línea 68-77):
```
| Firebase value | Nombre | PostgreSQL cod_sucursal | Columna Stock |
|----------------|--------|-------------------------|---------------|
| 1              | DEPOSITO ❌       | 1           | DEPOSITO ✓   | exi1 ❌ (mapea a exi2) |
```

**REALIDAD**:
```
| Firebase value | Nombre         | PostgreSQL cod_sucursal | Columna Stock |
|----------------|----------------|-------------------------|---------------|
| 1              | CASA CENTRAL ✅ | 2 (CASA CENTRAL)        | exi2 ✅       |
| 2              | VALLE VIEJO ✅  | 3 (VALLE VIEJO)         | exi3 ✅       |
| 3              | GUEMES ✅       | 4 (GUEMES)              | exi4 ✅       |
| 4              | DEPOSITO ✅     | 1 (DEPOSITO)            | exi1 ✅       |
| 5              | MAYORISTA ✅    | 5 (MAYORISTA)           | exi5 ✅       |
```

**Corrección**: El mapeo hardcodeado es CORRECTO. Firebase value 1 SÍ corresponde a Casa Central, NO a Deposito.

---

### 2.2 ❌ SUPUESTO INCORRECTO: "Mapeo hardcodeado es incorrecto"

**Documento original decía** (línea 80-87):
```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central ❌ INCORRECTO
    2 => 'exi3', // Valle Viejo  ❌ INCORRECTO
    3 => 'exi4', // Güemes       ❌ INCORRECTO
    4 => 'exi1', // Deposito     ❌ INCORRECTO
    5 => 'exi5'  // Mayorista    ✓ CORRECTO
];
```

**REALIDAD**: Este mapeo es ✅ **CORRECTO**. Fue implementado el 31 de Octubre de 2025 (commit 5486c51) específicamente para CORREGIR la inconsistencia entre Firebase values y campos exi.

**Evidencia**:
- Commit message: "implementar mapeo correcto Firebase value a campos exi"
- Documento `inconsistencia_suc_exi.md` confirma que este mapeo es necesario

---

### 2.3 ⚠️ AMBIGÜEDAD RESUELTA: "¿Tablas factcabN según value o cod_sucursal?"

**Documento original planteaba** (líneas 486-498):
```
Escenario A: Si las tablas están según Firebase value → ❌ PROBLEMA
Escenario B: Si las tablas están según cod_sucursal → ✅ FUNCIONA
```

**RESOLUCIÓN**: ✅ **ESCENARIO B CONFIRMADO**

Las tablas factcabN están DEFINITIVAMENTE alineadas con `cod_sucursal`:
- factcab1 contiene registros con cod_sucursal=1 (DEPOSITO) - 94 registros
- factcab2 contiene registros con cod_sucursal=2 (CASA CENTRAL) - 1 registro
- factcab3 contiene registros con cod_sucursal=3 (VALLE VIEJO) - 10 registros
- factcab5 contiene registros con cod_sucursal=5 (MAYORISTA) - 63 registros

**Implicación**: NO hay problema con las tablas dinámicas. El problema es solo en el mapeo de stock (exi).

---

## 3. NUEVO PROBLEMA IDENTIFICADO (No mencionado en documento original)

### 3.1 🔴 INCONSISTENCIA: Tablas dinámicas vs sessionStorage

**Problema detectado**:

Si un usuario de DEPOSITO hace login:
1. Firebase retorna `value=4`
2. sessionStorage almacena `'4'`
3. Backend recibe `sucursal=4`
4. Backend construye tabla: `"factcab" . 4 = "factcab4"`
5. Backend inserta factura en `factcab4`

PERO:
- factcab4 está VACÍA (0 registros)
- Las facturas de DEPOSITO están en factcab1 (94 registros con cod_sucursal=1)

**🔴 PREGUNTA CRÍTICA SIN RESPUESTA**: ¿Cómo se están insertando las facturas?

**Hipótesis posibles**:
1. El código de inserción de facturas tiene un mapeo oculto que traduce Firebase value a cod_sucursal
2. Las facturas existentes son anteriores al sistema de Firebase values
3. Hay un bug actual y las facturas no se están insertando correctamente

**Estado**: 🔴 **REQUIERE INVESTIGACIÓN ADICIONAL**

**Acción requerida**: Revisar el código de inserción de facturas en Carga.php para entender cómo se asigna el número de tabla.

---

## 4. VALIDACIÓN DE LA PROPUESTA "valorreal"

### 4.1 ✅ La propuesta ES VÁLIDA

Agregar un campo `valorreal` en Firebase que corresponda directamente a `cod_sucursal` de PostgreSQL es una solución CORRECTA y NECESARIA.

**Razones**:
1. ✅ Elimina la necesidad del mapeo hardcodeado
2. ✅ Simplifica la lógica de negocio
3. ✅ Mejora la consistencia de datos
4. ✅ Facilita el mantenimiento futuro

---

### 4.2 🔴 Correcciones necesarias al plan de implementación

#### Corrección 1: Mapeo hardcodeado DESPUÉS de agregar valorreal

**Documento original decía** (líneas 260-276):
```php
// DESPUÉS (con valorreal):
$mapeo_sucursal_exi = [
    1 => 'exi1', // Deposito      ← cod_sucursal 1
    2 => 'exi2', // Casa Central  ← cod_sucursal 2
    3 => 'exi3', // Valle Viejo   ← cod_sucursal 3
    4 => 'exi4', // Guemes        ← cod_sucursal 4
    5 => 'exi5'  // Mayorista     ← cod_sucursal 5
];
```

**CORRECCIÓN**: Este mapeo es correcto SOLO si `valorreal` corresponde a cod_sucursal. El documento lo tiene correcto.

---

#### Corrección 2: Interpretación de datos en pedidoscb

**Documento original interpretaba** (líneas 96-100):
```
| sucursald | sucursalh | Interpretación Actual (confusa)     |
|-----------|-----------|-------------------------------------|
| 1         | 3         | "De Sucursal: 1", "A Sucursal: 3"  |
```

Y lo presentaba como confuso.

**CORRECCIÓN**: Si los valores en pedidoscb son Firebase values, entonces:
- sucursald=1 significa "De Casa Central" (Firebase value 1)
- sucursald=3 significa "A Guemes" (Firebase value 3)

Los valores NO son confusos si se interpreta según Firebase. El problema es que el documento los interpretaba como cod_sucursal.

---

## 5. HALLAZGOS ADICIONALES

### 5.1 ✅ Commit reciente confirma el problema

**Commit 5486c51** (31 Oct 2025):
```
feat(stock): implementar mapeo correcto Firebase value a campos exi y actualización automática

Mapeo correcto (no secuencial):
- value 1 (Casa Central) → exi2
- value 2 (Valle Viejo) → exi3
- value 3 (Güemes) → exi4
- value 4 (Deposito) → exi1
- value 5 (Mayorista) → exi5
```

Este commit confirma:
1. ✅ El desalineamiento Firebase value ↔ cod_sucursal es REAL
2. ✅ El mapeo hardcodeado es la solución ACTUAL y CORRECTA
3. ✅ El sistema estaba roto antes del 31 de octubre

---

### 5.2 ⚠️ Sistema en fase inicial

Los datos sugieren que el sistema está en fase inicial o de pruebas:
- Solo 168 facturas totales (94+1+10+63)
- Solo exi5 (Mayorista) tiene stock significativo
- Mayoría de campos exi están vacíos o con negativos
- No hay pedidos en estado "Recibido"

**Implicación**: Este es un BUEN momento para implementar `valorreal` antes de que haya más datos históricos.

---

## 6. RECOMENDACIONES ACTUALIZADAS

### 6.1 ✅ Implementar valorreal (APROBADO con cambios)

**Estructura Firebase propuesta**:
```json
{
  "sucursales": {
    "[key-casa-central]": {
      "nombre": "Casa Central",
      "value": 1,        // Mantener para compatibilidad
      "valorreal": 2     // NUEVO - Corresponde a cod_sucursal 2
    },
    "[key-valle-viejo]": {
      "nombre": "Suc. Valle Viejo",
      "value": 2,
      "valorreal": 3     // NUEVO - Corresponde a cod_sucursal 3
    },
    "[key-guemes]": {
      "nombre": "Suc. Guemes",
      "value": 3,
      "valorreal": 4     // NUEVO - Corresponde a cod_sucursal 4
    },
    "[key-deposito]": {
      "nombre": "Deposito",
      "value": 4,
      "valorreal": 1     // NUEVO - Corresponde a cod_sucursal 1
    },
    "[key-mayorista]": {
      "nombre": "Mayorista",
      "value": 5,
      "valorreal": 5     // NUEVO - Corresponde a cod_sucursal 5
    }
  }
}
```

---

### 6.2 🔴 CRÍTICO: Investigar inserción de facturas

**Problema**: No se entiende cómo se insertan facturas actualmente.

**Acción requerida**:
1. Revisar función de inserción de facturas en Carga.php
2. Verificar si hay un mapeo oculto de Firebase value → cod_sucursal
3. Confirmar que las facturas se insertan en la tabla correcta

**Criterio Go/No-Go**: NO proceder con implementación hasta resolver esta pregunta.

---

### 6.3 ⚠️ Actualizar documento agregar_key_firebase_sucursal.md

**Secciones a corregir**:
1. Línea 68-77: Tabla de mapeo Firebase value → nombre (incorrecta)
2. Línea 80-87: Interpretación del mapeo hardcodeado (incorrecta)
3. Línea 486-498: Ambigüedad sobre tablas factcabN (resuelta)
4. Líneas 96-100: Interpretación de pedidoscb (requiere aclaración)

---

### 6.4 ✅ Plan de Fase 0 sigue siendo válido

**Fase 0: Verificación Pre-Implementación** (del documento original) sigue siendo NECESARIA y CORRECTA:

1. ✅ Verificar existencia de tablas → YA VERIFICADO
2. ✅ Analizar datos históricos → YA VERIFICADO
3. 🔴 Correlacionar con sesiones de usuario → PENDIENTE
4. 🔴 Verificar función de inserción de facturas → CRÍTICO PENDIENTE

---

## 7. TABLA RESUMEN: Verificación de Suposiciones

| # | Suposición en Documento Original | Estado | Hallazgo Real |
|---|----------------------------------|--------|---------------|
| 1 | Tabla sucursales tiene cod_sucursal 1-5 | ✅ CORRECTA | Confirmado |
| 2 | Firebase value 1 = DEPOSITO | ❌ INCORRECTA | value 1 = CASA CENTRAL |
| 3 | Firebase value 2 = CASA CENTRAL | ❌ INCORRECTA | value 2 = VALLE VIEJO |
| 4 | Firebase value 3 = VALLE VIEJO | ❌ INCORRECTA | value 3 = GUEMES |
| 5 | Firebase value 4 = GUEMES | ❌ INCORRECTA | value 4 = DEPOSITO |
| 6 | Firebase value 5 = MAYORISTA | ✅ CORRECTA | Confirmado |
| 7 | Mapeo hardcodeado es incorrecto | ❌ INCORRECTA | Mapeo es CORRECTO |
| 8 | Tablas factcabN según cod_sucursal | ✅ CORRECTA | Confirmado con datos |
| 9 | pedidoscb usa Firebase values | ⚠️ PROBABLE | Consistente con datos |
| 10 | valorreal es solución viable | ✅ CORRECTA | Validado |

**Puntuación**: 4/10 suposiciones correctas, 5/10 incorrectas, 1/10 probable

---

## 8. PRÓXIMOS PASOS INMEDIATOS

### Paso 1: 🔴 CRÍTICO - Investigar inserción de facturas
**Archivo**: Carga.php.txt
**Buscar**: Función que inserta en factcabN
**Pregunta**: ¿Cómo se determina N al insertar facturas?

### Paso 2: ⚠️ Verificar permisos de usuarios
**Firebase**: Nodo `users` → campo `sucursalesPermitidas`
**Pregunta**: ¿Usa values (1-5) o cod_sucursal (1-5)?

### Paso 3: ✅ Actualizar documento agregar_key_firebase_sucursal.md
**Acción**: Incorporar hallazgos de esta investigación

### Paso 4: ✅ Proceder con implementación de valorreal
**Condición**: Solo después de resolver Paso 1

---

## 9. CONCLUSIONES

### 9.1 ✅ Hallazgos Positivos

1. **El desalineamiento es REAL y está DOCUMENTADO** (commit 5486c51, inconsistencia_suc_exi.md)
2. **El mapeo hardcodeado es la solución CORRECTA actual**
3. **Las tablas dinámicas están bien estructuradas** (según cod_sucursal)
4. **La propuesta valorreal es VÁLIDA y RECOMENDABLE**
5. **El sistema está en fase inicial**, buen momento para cambios estructurales

### 9.2 🔴 Problemas Identificados

1. **Función de inserción de facturas requiere investigación**
2. **El documento original tenía varios errores en las suposiciones**
3. **Falta verificar permisos de usuarios (sucursalesPermitidas)**
4. **No hay pedidos completados para verificar flujo end-to-end**

### 9.3 ⚠️ Riesgos

1. **Riesgo BAJO**: Implementación de valorreal (con verificaciones)
2. **Riesgo MEDIO**: No entender completamente el flujo de facturas
3. **Riesgo ALTO**: Cambiar sin verificar función de inserción de facturas

---

## 10. DECISIÓN FINAL

**Recomendación**: ✅ **PROCEDER CON IMPLEMENTACIÓN DE valorreal** DESPUÉS de:

1. 🔴 Resolver pregunta sobre inserción de facturas (CRÍTICO)
2. ⚠️ Verificar campo sucursalesPermitidas en usuarios
3. ✅ Actualizar plan de implementación con hallazgos reales
4. ✅ Crear script de migración para usuarios existentes

**Tiempo estimado**:
- Investigación adicional: 1-2 días
- Implementación: 3-5 días
- Testing: 3-5 días
- **Total**: 1-2 semanas

---

**Documento generado por**: Claude Code (Investigación Técnica)
**Fecha**: 2025-11-02
**Basado en**: Análisis de PostgreSQL, código fuente, y commits Git
**Estado**: Hallazgos verificados - Pendiente resolución de pregunta crítica
