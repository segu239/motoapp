# INFORME: Agregar Campo "valorreal" en Firebase Sucursales

**Fecha**: 2025-11-02
**Versión**: 1.0
**Tipo de Cambio**: Mejora - Corrección de Mapeo
**Criticidad**: 🟡 MEDIA - Requiere cambios coordinados pero NO rompe funcionalidad existente
**Autor**: Análisis Técnico MotoApp

---

## Resumen Ejecutivo

**Problema Reportado**: Los valores mostrados en las columnas "De Sucursal" y "A Sucursal" en las tablas de movimiento de stock muestran números que no son intuitivos para los usuarios, debido a un desalineamiento histórico entre los valores de Firebase y los códigos de sucursal en PostgreSQL.

**Solución Propuesta**: Agregar un nuevo campo `valorreal` en la estructura de Firebase que corresponda EXACTAMENTE a los códigos `cod_sucursal` de PostgreSQL, manteniendo el campo `value` existente para compatibilidad.

**Veredicto**: ✅ **VIABLE Y RECOMENDADO** con actualización del mapeo hardcodeado en backend.

---

## 1. Diagnóstico del Problema Actual

### 1.1 Situación Actual

**Firebase Realtime Database** (nodo `sucursales`):
```json
{
  "sucursales": {
    "[key-1]": {
      "nombre": "DEPOSITO",
      "value": 1  // ❌ NO corresponde a cod_sucursal
    },
    "[key-2]": {
      "nombre": "CASA CENTRAL",
      "value": 2  // ❌ NO corresponde a cod_sucursal
    },
    "[key-3]": {
      "nombre": "VALLE VIEJO",
      "value": 3  // ❌ NO corresponde a cod_sucursal
    },
    "[key-4]": {
      "nombre": "GUEMES",
      "value": 4  // ❌ NO corresponde a cod_sucursal
    },
    "[key-5]": {
      "nombre": "MAYORISTA",
      "value": 5  // ✓ SÍ corresponde a cod_sucursal
    }
  }
}
```

**PostgreSQL** (tabla `sucursales`):
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

### 1.2 El Desalineamiento

**Mapeo Incorrecto Actual** (según comentario en `Descarga.php:1727-1735`):

| Firebase value | Nombre (Firebase) | PostgreSQL cod_sucursal | Nombre (PostgreSQL) | Columna Stock |
|----------------|-------------------|-------------------------|---------------------|---------------|
| 1              | DEPOSITO ❌       | 1                       | DEPOSITO ✓          | exi1 ❌ (mapea a exi2) |
| 2              | CASA CENTRAL ❌   | 2                       | CASA CENTRAL ✓      | exi2 ❌ (mapea a exi3) |
| 3              | VALLE VIEJO ❌    | 3                       | VALLE VIEJO ✓       | exi3 ❌ (mapea a exi4) |
| 4              | GUEMES ❌         | 4                       | GUEMES ✓            | exi4 ❌ (mapea a exi1) |
| 5              | MAYORISTA ✓       | 5                       | MAYORISTA ✓         | exi5 ✓                 |

**Mapeo Hardcodeado en Backend** (`Descarga.php:1729-1735`):
```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central ❌ INCORRECTO
    2 => 'exi3', // Valle Viejo  ❌ INCORRECTO
    3 => 'exi4', // Güemes       ❌ INCORRECTO
    4 => 'exi1', // Deposito     ❌ INCORRECTO
    5 => 'exi5'  // Mayorista    ✓ CORRECTO
];
```

### 1.3 Evidencia del Problema

**Ejemplo Real de tabla `pedidoscb`**:
```sql
SELECT sucursald, sucursalh FROM pedidoscb ORDER BY id_num DESC LIMIT 3;
```

| sucursald | sucursalh | Interpretación Actual (confusa)           | Interpretación Correcta Deseada |
|-----------|-----------|-------------------------------------------|---------------------------------|
| 1         | 3         | "De Sucursal: 1", "A Sucursal: 3"        | "De DEPOSITO A VALLE VIEJO"     |
| 3         | 1         | "De Sucursal: 3", "A Sucursal: 1"        | "De VALLE VIEJO A DEPOSITO"     |
| 1         | 2         | "De Sucursal: 1", "A Sucursal: 2"        | "De DEPOSITO A CASA CENTRAL"    |

**Impacto en Usuario**:
- ❌ Ve números en lugar de nombres
- ❌ Los números no son intuitivos
- ❌ Requiere consultar tabla de referencia constantemente
- ❌ Alto riesgo de error operativo

---

## 2. Propuesta de Solución

### 2.1 Estructura Propuesta en Firebase

Agregar campo `valorreal` que corresponda EXACTAMENTE a `cod_sucursal` de PostgreSQL:

```json
{
  "sucursales": {
    "[key-1]": {
      "nombre": "DEPOSITO",
      "value": 1,        // ← Mantener (backward compatibility)
      "valorreal": 1     // ← NUEVO - Coincide con cod_sucursal 1
    },
    "[key-2]": {
      "nombre": "CASA CENTRAL",
      "value": 2,        // ← Mantener
      "valorreal": 2     // ← NUEVO - Coincide con cod_sucursal 2
    },
    "[key-3]": {
      "nombre": "VALLE VIEJO",
      "value": 3,        // ← Mantener
      "valorreal": 3     // ← NUEVO - Coincide con cod_sucursal 3
    },
    "[key-4]": {
      "nombre": "GUEMES",
      "value": 4,        // ← Mantener
      "valorreal": 4     // ← NUEVO - Coincide con cod_sucursal 4
    },
    "[key-5]": {
      "nombre": "MAYORISTA",
      "value": 5,        // ← Mantener
      "valorreal": 5     // ← NUEVO - Coincide con cod_sucursal 5
    }
  }
}
```

### 2.2 Cambio en Login Component

**Archivo**: `login2.component.ts`

**ANTES** (línea 126):
```typescript
sessionStorage.setItem('sucursal', this.sucursal);
```

**DESPUÉS**:
```typescript
// this.sucursal ahora contiene payload.valorreal en lugar de payload.value
sessionStorage.setItem('sucursal', this.sucursal);
```

**Cambio en método `loadSucursales()`** (líneas 45-64):

**ANTES**:
```typescript
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
          value: payload.value  // ← Usa 'value' incorrecto
        };
      });
    },
    // ...
  );
}
```

**DESPUÉS**:
```typescript
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
          value: payload.valorreal || payload.value  // ← Usa 'valorreal', fallback a 'value'
        };
      });
    },
    // ...
  );
}
```

**Ventaja del fallback**: Si `valorreal` no existe (por ejemplo, durante migración gradual), usa `value` como antes.

---

## 3. Análisis de Impacto por Capa

### 3.1 Capa de Presentación (Angular)

#### Archivos Afectados: 1 archivo (login)

**Login2Component** (`login2.component.ts`):
- **Línea 50**: Cambiar mapeo de `value` a `valorreal`
- **Impacto**: ✅ MÍNIMO - 1 línea de código
- **Riesgo**: 🟢 BAJO - Cambio aislado

**Todos los demás componentes** (65+ ubicaciones):
- **Cambio requerido**: ❌ NINGUNO
- **Motivo**: Todos leen de `sessionStorage.getItem('sucursal')`, el valor simplemente cambia
- **Riesgo**: 🟢 BAJO - Transparente para componentes

**Ejemplo - CarritoComponent**:
```typescript
// Línea 240 - NO requiere cambios
this.sucursal = sessionStorage.getItem('sucursal');
// Antes recibía: '1' (value incorrecto de Firebase)
// Ahora recibirá: '1' (valorreal correcto = cod_sucursal)
// ✓ Funciona igual
```

**Ejemplo - StockPedidoComponent**:
```typescript
// Línea 72 - NO requiere cambios
this.sucursal = Number(sessionStorage.getItem('sucursal'));
// ✓ Funciona igual con valorreal
```

---

### 3.2 Capa Backend (PHP/CodeIgniter)

#### Archivos Afectados: 2 archivos (crítico)

**CRÍTICO**: El mapeo hardcodeado DEBE actualizarse.

**Descarga.php** - Cambios en 3 funciones:

##### Función 1: `confirmarRecepcionEnvioStock_post()` (Líneas 1729-1755)

**ANTES**:
```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central ← Firebase value 1
    2 => 'exi3', // Valle Viejo  ← Firebase value 2
    3 => 'exi4', // Güemes       ← Firebase value 3
    4 => 'exi1', // Deposito     ← Firebase value 4
    5 => 'exi5'  // Mayorista    ← Firebase value 5
];
```

**DESPUÉS** (con valorreal):
```php
// MAPEO ACTUALIZADO PARA USAR valorreal (= cod_sucursal)
// valorreal corresponde directamente a cod_sucursal de PostgreSQL
$mapeo_sucursal_exi = [
    1 => 'exi1', // Deposito      ← cod_sucursal 1
    2 => 'exi2', // Casa Central  ← cod_sucursal 2
    3 => 'exi3', // Valle Viejo   ← cod_sucursal 3
    4 => 'exi4', // Guemes        ← cod_sucursal 4
    5 => 'exi5'  // Mayorista     ← cod_sucursal 5
];
```

**Comentario actualizado**:
```php
// ============================================================================
// MAPEO DE valorreal (= cod_sucursal) A CAMPOS EXI
// valorreal de Firebase corresponde directamente a cod_sucursal de PostgreSQL.
// Este mapeo ahora es 1:1 (simplificado tras migración de 2025-11):
// ============================================================================
```

##### Función 2: `cancelarEnvioStock_post()` (Líneas 1832-1856)

**Cambio**: Actualizar el mismo mapeo con el código nuevo (igual que función 1).

##### Función 3: `crearPedidoStockNuevo_post()` (Líneas 1930-1950)

**Cambio**: Actualizar el mismo mapeo con el código nuevo (igual que función 1).

---

#### Verificación de Consistencia

**Tablas dinámicas** (psucursalN, factcabN, recibosN):
- **Cambio requerido**: ❌ NINGUNO
- **Motivo**: Estas tablas ya usan cod_sucursal correctamente
- **Ejemplo**: `psucursal1` siempre fue para cod_sucursal 1 (DEPOSITO)

**Consultas SQL**:
```php
// ANTES (con Firebase value 4 = DEPOSITO)
$tabla = 'psucursal' . 4;  // 'psucursal4'
$query = $this->db->get($tabla);

// DESPUÉS (con valorreal 1 = DEPOSITO = cod_sucursal 1)
$tabla = 'psucursal' . 1;  // 'psucursal1'
$query = $this->db->get($tabla);
```

**⚠️ MOMENTO DE REFLEXIÓN**:

¿Las tablas `psucursal1`, `psucursal2`, etc. están correctamente alineadas con los códigos de sucursal?

Déjame verificar analizando la lógica del sistema...

**Análisis**:
- En `pedidoscb`, los valores `sucursald` y `sucursalh` almacenan códigos que provienen del sessionStorage
- Si actualmente sessionStorage tiene value=4 para DEPOSITO, entonces pedidoscb tiene sucursald=4
- Backend NO construye tablas dinámicas con estos valores en movimientos de stock
- Backend SÍ construye tablas dinámicas en ventas: `factcab` + sucursal

**Conclusión**: El cambio afecta:
1. ✅ **Movimientos de stock**: Mapeo hardcodeado (se actualiza)
2. ⚠️ **Consultas factcabN**: ¿Se construyen con el valor de sessionStorage?

Déjame verificar esto...

---

### 3.3 Impacto en Tablas Dinámicas Facturas/Recibos

**Análisis de `Carga.php`** (construcciones de tablas):

```php
// Línea 313
$tabla = "factcab" . $sucursal;

// Línea 352
$tabla = "factcab" . $sucursal;

// Línea 395
$tabla = "psucursal" . $sucursal;
```

**Pregunta crítica**: ¿Qué valor tiene `$sucursal` en estas funciones?

**Respuesta**: Viene de `$data["sucursal"]`, que proviene del POST del frontend, que proviene de sessionStorage.

**Escenario ACTUAL**:
- Usuario DEPOSITO → Firebase value=4 → sessionStorage='4'
- Frontend envía sucursal=4 al backend
- Backend construye: `factcab4`
- ✓ Tabla existe (asumiendo que las tablas fueron creadas según Firebase values)

**Escenario con valorreal**:
- Usuario DEPOSITO → Firebase valorreal=1 → sessionStorage='1'
- Frontend envía sucursal=1 al backend
- Backend construye: `factcab1`
- ⚠️ **¿Tabla existe?**

**MOMENTO CRÍTICO**: Necesito verificar si las tablas `factcab1`, `factcab2`, etc. existen y a qué sucursales corresponden.

---

### 3.4 Verificación de Tablas en PostgreSQL

**Tablas que deben existir**:
```
factcab1, factcab2, factcab3, factcab4, factcab5
psucursal1, psucursal2, psucursal3, psucursal4, psucursal5
recibos1, recibos2, recibos3, recibos4, recibos5
```

**Pregunta**: ¿Estas tablas están alineadas con cod_sucursal o con Firebase value?

**Evidencia de `pedidoscb`**:
```sql
-- Datos reales de pedidoscb muestran:
sucursald=1, sucursalh=3  → "De sucursal 1 a sucursal 3"
sucursald=3, sucursalh=1  → "De sucursal 3 a sucursal 1"
```

Estos valores (1, 3) coinciden con **cod_sucursal de PostgreSQL**, NO con Firebase values.

**Conclusión**: Las tablas en PostgreSQL están nombradas según **cod_sucursal**, no según Firebase values.

Por lo tanto:
- `factcab1` = Facturas de DEPOSITO (cod_sucursal 1)
- `factcab2` = Facturas de CASA CENTRAL (cod_sucursal 2)
- etc.

**Implicación**: Si cambiamos a `valorreal` (que = cod_sucursal), ¡todo funcionará MEJOR!

---

## 4. Análisis de Riesgo Detallado

### 4.1 ¿Qué pasa si el usuario DEPOSITO usa valorreal=1?

**Flujo completo con valorreal**:

#### Paso 1: Login
```typescript
Usuario selecciona: "DEPOSITO"
Firebase retorna: {nombre: "DEPOSITO", value: 4, valorreal: 1}
Login2Component mapea: payload.valorreal = 1
sessionStorage.setItem('sucursal', '1')
```

#### Paso 2: Consultar Stock
```typescript
// articulos-paginados.service.ts
const sucursal = sessionStorage.getItem('sucursal'); // '1'
params.append('sucursal', sucursal); // sucursal=1

// Backend recibe sucursal=1
// Interpreta correctamente: 1 = DEPOSITO (cod_sucursal)
```

#### Paso 3: Crear Pedido de Stock
```typescript
// stockproductopedido.component.ts
this.sucursal = sessionStorage.getItem('sucursal'); // '1'

// Envía al backend: sucursald=1, sucursalh=3
// Backend inserta en pedidoscb:
INSERT INTO pedidoscb (sucursald, sucursalh, ...) VALUES (1, 3, ...)
```

✅ **CORRECTO**: Ahora los valores son consistentes con cod_sucursal.

#### Paso 4: Confirmar Recepción
```php
// Backend - Descarga.php::confirmarRecepcionEnvioStock_post()
$sucursal_destino = $pedidoscb['sucursald']; // 1
$campo_stock = $mapeo_sucursal_exi[1]; // 'exi1' (CON NUEVO MAPEO)

UPDATE artsucursal SET exi1 = exi1 + cantidad WHERE id_articulo = ?
```

✅ **CORRECTO**: Actualiza la columna correcta (exi1 para DEPOSITO).

#### Paso 5: Crear Venta
```php
// Backend - Carga.php::facturasCab_post()
$sucursal = $data["sucursal"]; // 1
$tabla = "factcab" . $sucursal; // 'factcab1'

$this->db->insert('factcab1', $datos_factura);
```

✅ **CORRECTO**: Inserta en la tabla de DEPOSITO.

#### Paso 6: Visualización
```typescript
// stockpedido.component.html
// Muestra: sucursald=1, sucursalh=3
// Usuario ve: "De Sucursal: 1", "A Sucursal: 3"
```

✅ **MEJOR**: Ahora los números son consistentes con cod_sucursal (1=DEPOSITO, 3=VALLE VIEJO).

---

### 4.2 Comparación: Sistema Actual vs Con valorreal

| Operación | Sistema Actual (value incorrecto) | Con valorreal | Mejora |
|-----------|-----------------------------------|---------------|--------|
| **Login** | sessionStorage='4' (DEPOSITO según Firebase) | sessionStorage='1' (DEPOSITO según PostgreSQL) | ✅ Consistente |
| **Consultar Stock** | Filtro por sucursal=4 | Filtro por sucursal=1 | ✅ Más claro |
| **Pedido Stock** | sucursald=4, sucursalh=2 | sucursald=1, sucursalh=2 | ✅ Consistente con PostgreSQL |
| **Actualizar Stock** | Mapeo: 4→exi1 | Mapeo: 1→exi1 | ✅ Más intuitivo |
| **Insertar Venta** | factcab4 | factcab1 | ⚠️ **REQUIERE VERIFICACIÓN** |
| **Visualización** | Números inconsistentes | Números consistentes | ✅ Mejor UX |

---

### 4.3 RIESGO CRÍTICO IDENTIFICADO: Tablas de Facturas

**Pregunta final**: ¿Las tablas `factcabN` están nombradas según Firebase value o según cod_sucursal?

**Escenario A**: Si las tablas están según Firebase value:
- factcab1 = Casa Central (Firebase value 1)
- factcab4 = Deposito (Firebase value 4)
- ❌ **PROBLEMA**: Con valorreal, intentaría insertar en factcab1 para DEPOSITO, pero factcab1 es de Casa Central

**Escenario B**: Si las tablas están según cod_sucursal:
- factcab1 = Deposito (cod_sucursal 1)
- factcab2 = Casa Central (cod_sucursal 2)
- ✅ **FUNCIONA**: Con valorreal, inserta correctamente en factcab1 para DEPOSITO

**Determinación**: Según la evidencia de `pedidoscb` que usa valores alineados con cod_sucursal, y asumiendo que el sistema fue diseñado consistentemente, las tablas factcabN deberían estar según **cod_sucursal**.

**Recomendación**: **Verificar en producción** antes de implementar.

---

## 5. Plan de Implementación Recomendado

### 5.1 Fase 0: Verificación Pre-Implementación (CRÍTICA)

**Objetivo**: Confirmar que las tablas dinámicas están alineadas con cod_sucursal.

**Tareas**:

1. **Verificar existencia de tablas**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name LIKE 'factcab%' OR table_name LIKE 'psucursal%' OR table_name LIKE 'recibos%'
   ORDER BY table_name;
   ```

2. **Analizar datos históricos**:
   ```sql
   -- Ver qué sucursal ha estado usando cada tabla factcab
   SELECT
       'factcab1' as tabla,
       cod_sucursal,
       COUNT(*) as registros
   FROM factcab1
   GROUP BY cod_sucursal;

   -- Repetir para factcab2, factcab3, factcab4, factcab5
   ```

3. **Correlacionar con sesiones de usuario**:
   - Identificar qué usuario de qué sucursal ha creado registros en cada tabla
   - Verificar consistencia

**Criterio de Go/No-Go**:
- ✅ **GO**: Si factcab1 contiene registros con cod_sucursal=1 (DEPOSITO)
- ❌ **NO-GO**: Si factcab1 contiene registros con cod_sucursal de otra sucursal

---

### 5.2 Fase 1: Preparación (Semana 1)

**Tareas**:

1. **Agregar campo `valorreal` a Firebase** (sin usar aún):
   ```json
   {
     "sucursales": {
       "[key-deposito]": {
         "nombre": "DEPOSITO",
         "value": 1,      // Mantener
         "valorreal": 1   // Agregar
       },
       // ... resto de sucursales
     }
   }
   ```

2. **Crear documento de mapeo de referencia**:
   ```markdown
   # Mapeo Sucursales - Referencia Rápida

   | Nombre       | Firebase value (legacy) | valorreal (nuevo) | cod_sucursal (PostgreSQL) |
   |--------------|-------------------------|-------------------|---------------------------|
   | DEPOSITO     | 1                       | 1                 | 1                         |
   | CASA CENTRAL | 2                       | 2                 | 2                         |
   | VALLE VIEJO  | 3                       | 3                 | 3                         |
   | GUEMES       | 4                       | 4                 | 4                         |
   | MAYORISTA    | 5                       | 5                 | 5                         |
   ```

3. **Backup completo**:
   - Firebase Realtime Database
   - PostgreSQL (todas las tablas)
   - sessionStorage state (documentar valores actuales)

---

### 5.3 Fase 2: Actualización de Backend (Semana 2)

**Archivo**: `Descarga.php`

**Cambio 1**: Actualizar mapeo en `confirmarRecepcionEnvioStock_post()` (líneas 1729-1735):

```php
// ANTES
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];

// DESPUÉS
// ============================================================================
// MAPEO ACTUALIZADO (2025-11-02)
// Tras migración a 'valorreal', el mapeo ahora es 1:1 con cod_sucursal
// ============================================================================
$mapeo_sucursal_exi = [
    1 => 'exi1', // Deposito      (cod_sucursal 1)
    2 => 'exi2', // Casa Central  (cod_sucursal 2)
    3 => 'exi3', // Valle Viejo   (cod_sucursal 3)
    4 => 'exi4', // Guemes        (cod_sucursal 4)
    5 => 'exi5'  // Mayorista     (cod_sucursal 5)
];
// NOTA: Este mapeo es redundante y podría simplificarse a:
// $campo_stock = 'exi' . $sucursal;
// Pero se mantiene por claridad y para facilitar rollback si es necesario.
// ============================================================================
```

**Cambio 2**: Repetir en `cancelarEnvioStock_post()` (líneas 1832-1856)

**Cambio 3**: Repetir en `crearPedidoStockNuevo_post()` (líneas 1930-1950)

**Testing**:
- Test unitario para cada mapeo
- Test de integración para flujo completo de movimiento de stock

---

### 5.4 Fase 3: Actualización de Frontend (Semana 2)

**Archivo**: `login2.component.ts`

**Cambio**: Modificar método `loadSucursales()` (línea 50):

```typescript
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
          // Priorizar valorreal sobre value para nuevo mapeo
          value: payload.valorreal !== undefined ? payload.valorreal : payload.value
        };
      });
    },
    error => {
      console.error('Error al cargar sucursales:', error);
      this.showError('Error al cargar las sucursales');
    }
  );
}
```

**Ventaja del código**:
- Usa `valorreal` si existe
- Fallback a `value` si no existe (compatibilidad durante migración)
- Permite rollback sin romper funcionalidad

---

### 5.5 Fase 4: Testing en Ambiente de Desarrollo (Semana 3)

**Casos de prueba**:

1. **Login con cada sucursal**:
   - ✅ Verificar que sessionStorage tenga el valorreal correcto
   - ✅ Verificar que se muestren las sucursales correctamente

2. **Consulta de stock**:
   - ✅ Verificar que se consulte la sucursal correcta
   - ✅ Verificar que los filtros funcionen

3. **Crear pedido de stock**:
   - ✅ Crear pedido de DEPOSITO (valorreal=1) a CASA CENTRAL (valorreal=2)
   - ✅ Verificar que en pedidoscb se guarde: sucursald=1, sucursalh=2
   - ✅ Verificar visualización en tabla: "De Sucursal: 1", "A Sucursal: 2"

4. **Confirmar recepción**:
   - ✅ Confirmar recepción del pedido
   - ✅ Verificar que stock se actualice en columna correcta (exi1 para DEPOSITO)
   - ✅ Verificar que stock se reste de columna correcta (exi2 para CASA CENTRAL)

5. **Crear venta**:
   - ✅ Crear venta en DEPOSITO (valorreal=1)
   - ✅ Verificar que se inserte en factcab1
   - ✅ Verificar número de comprobante correcto

6. **Generar reporte**:
   - ✅ Generar reporte de ventas de DEPOSITO
   - ✅ Verificar que consulte factcab1 correctamente

**Métricas de éxito**:
- 100% de casos de prueba pasados
- 0 errores SQL
- Datos consistentes en PostgreSQL
- UX mejorado (números consistentes)

---

### 5.6 Fase 5: Deploy a Producción (Semana 4)

**Pre-requisitos**:
- ✅ Fase 0 completada (verificación de tablas)
- ✅ Todos los tests pasados en desarrollo
- ✅ Backup completo realizado
- ✅ Plan de rollback definido

**Ventana de mantenimiento**: Opcional (cambio es compatible)

**Pasos de deploy**:

1. **Actualizar Firebase** (5 minutos):
   ```
   - Agregar campo 'valorreal' a cada sucursal
   - Verificar que valores sean correctos
   ```

2. **Deploy Backend** (10 minutos):
   ```
   - Subir Descarga.php actualizado
   - Verificar que se cargue correctamente
   ```

3. **Deploy Frontend** (15 minutos):
   ```
   - Build de Angular: ng build --prod
   - Deploy de build
   - Verificar que cargue correctamente
   ```

4. **Smoke Tests** (30 minutos):
   ```
   - Login con cada sucursal
   - Crear pedido de prueba
   - Confirmar recepción de prueba
   - Crear venta de prueba
   - Generar reporte de prueba
   ```

5. **Monitoreo** (24 horas):
   ```
   - Revisar logs de errores
   - Monitorear consultas SQL
   - Verificar tickets de soporte
   ```

---

### 5.7 Fase 6: Rollback Plan (Si es necesario)

**Triggers para rollback**:
- Errores SQL en producción
- Datos inconsistentes detectados
- Usuarios reportan problemas críticos

**Pasos de rollback** (15 minutos):

1. **Revertir Frontend**:
   ```typescript
   // En loadSucursales(), cambiar:
   value: payload.value  // Volver a usar 'value'
   ```

2. **Revertir Backend**:
   ```php
   // Restaurar mapeo anterior:
   $mapeo_sucursal_exi = [
       1 => 'exi2',
       2 => 'exi3',
       3 => 'exi4',
       4 => 'exi1',
       5 => 'exi5'
   ];
   ```

3. **Firebase**:
   ```
   - Campo 'valorreal' puede permanecer
   - No afecta si no se usa
   ```

4. **Verificar**:
   ```
   - Login funcional
   - Operaciones normales restauradas
   ```

**Ventaja del diseño**: Rollback rápido y seguro gracias al fallback implementado.

---

## 6. Ventajas de la Solución

### 6.1 Beneficios Técnicos

1. **Consistencia de Datos** ✅
   - Valores en sessionStorage coinciden con cod_sucursal de PostgreSQL
   - Elimina confusión en interpretación de números

2. **Simplicidad del Mapeo** ✅
   - Mapeo puede simplificarse a 1:1 en el futuro
   - Reduce complejidad del código

3. **Mejor Debugging** ✅
   - Logs más claros (sucursal=1 siempre es DEPOSITO)
   - Facilita troubleshooting

4. **Escalabilidad** ✅
   - Agregar nuevas sucursales es más intuitivo
   - No requiere mapeos complejos

### 6.2 Beneficios para Usuarios

1. **Claridad** ✅
   - Números en tablas son consistentes con sistema
   - Reduce errores operativos

2. **Confianza** ✅
   - Usuarios confían en que los datos son correctos
   - Menos necesidad de validación manual

3. **Eficiencia** ✅
   - Menos tiempo buscando qué significa cada número
   - Operaciones más rápidas

### 6.3 Beneficios para Mantenimiento

1. **Documentación** ✅
   - Sistema más fácil de documentar
   - Onboarding de nuevos desarrolladores más rápido

2. **Testing** ✅
   - Tests más claros y fáciles de escribir
   - Menos casos edge

3. **Futuras Mejoras** ✅
   - Base sólida para agregar nombres en tablas
   - Facilita migración a UI más user-friendly

---

## 7. Riesgos y Mitigaciones

### 7.1 Riesgo 1: Tablas factcab Incorrectas

**Descripción**: Si las tablas factcabN están nombradas según Firebase value en lugar de cod_sucursal, el cambio rompería las ventas.

**Probabilidad**: 🟡 BAJA (evidencia sugiere que están según cod_sucursal)

**Impacto**: 🔴 CRÍTICO (ventas no se guardarían correctamente)

**Mitigación**:
- ✅ Verificación obligatoria en Fase 0
- ✅ Criterio Go/No-Go basado en verificación
- ✅ Testing exhaustivo en desarrollo
- ✅ Rollback plan preparado

---

### 7.2 Riesgo 2: Usuarios con Sesión Activa

**Descripción**: Usuarios con sessionStorage='4' (value anterior) seguirán operando con ese valor hasta que hagan logout/login.

**Probabilidad**: 🟢 ALTA (esperado durante transición)

**Impacto**: 🟡 BAJO (sistema sigue funcionando con value legacy)

**Mitigación**:
- ✅ Backend soporta ambos valores durante transición
- ✅ Mapeo hardcodeado mantiene compatibilidad
- ✅ Comunicar a usuarios que hagan logout/login después del deploy
- ✅ Forzar logout automático en próximo acceso (opcional)

---

### 7.3 Riesgo 3: Permisos de Usuario

**Descripción**: Si `sucursalesPermitidas` en Firebase sigue usando `value` en lugar de `valorreal`, la validación fallaría.

**Probabilidad**: 🟢 ALTA (hay que actualizar permisos)

**Impacto**: 🔴 CRÍTICO (usuarios no podrían ingresar)

**Mitigación**:
- ✅ Actualizar `sucursalesPermitidas` de todos los usuarios en Firebase
- ✅ Antes: `sucursalesPermitidas: [1, 3, 5]` (usando value)
- ✅ Después: `sucursalesPermitidas: [1, 3, 5]` (usando valorreal) - SIN CAMBIO si coinciden
- ✅ Script de migración para actualizar si values eran diferentes

**Verificación necesaria**:
```typescript
// En login2.component.ts línea 118
const sucursalValue = parseInt(this.sucursal, 10);
if (!user.sucursalesPermitidas.includes(sucursalValue)) {
  this.showError('No tiene acceso a la sucursal seleccionada');
  return;
}
```

Si `sucursalesPermitidas` sigue usando el value legacy, este check fallaría.

**Solución**:
1. Verificar estructura de `sucursalesPermitidas` en Firebase
2. Si usa values, actualizar a valorreal (o mantener value=valorreal para consistencia)
3. Añadir script de migración de usuarios

---

### 7.4 Riesgo 4: Datos Históricos

**Descripción**: Datos históricos en pedidoscb, factcab tienen valores según sistema anterior.

**Probabilidad**: 🟢 ALTA (datos históricos existen)

**Impacto**: 🟢 MÍNIMO (solo afecta visualización histórica)

**Mitigación**:
- ✅ Datos históricos NO requieren migración
- ✅ Interpretación es consistente (si factcab1 siempre fue DEPOSITO, sigue siendo DEPOSITO)
- ✅ Reportes históricos funcionan igual

---

## 8. Alternativas Consideradas

### 8.1 Alternativa A: No hacer nada

**Pros**:
- Sin riesgo de romper sistema
- Sin esfuerzo de desarrollo

**Cons**:
- Problema de UX persiste
- Confusión continúa
- Deuda técnica aumenta

**Veredicto**: ❌ NO RECOMENDADO

---

### 8.2 Alternativa B: Mostrar nombres en lugar de números (Frontend)

**Descripción**: Crear un pipe o servicio en Angular que convierta números a nombres en la tabla.

**Pros**:
- No requiere cambios en backend
- No toca Firebase
- Riesgo muy bajo

**Cons**:
- No resuelve inconsistencia de fondo
- Aumenta complejidad del frontend
- Cada tabla necesita el pipe
- Logs y debugging siguen siendo confusos

**Veredicto**: 🟡 VIABLE como solución temporal

**Implementación**:
```typescript
// sucursal-nombre.pipe.ts
@Pipe({name: 'sucursalNombre'})
export class SucursalNombrePipe implements PipeTransform {
  private mapeo = {
    1: 'DEPOSITO',
    2: 'CASA CENTRAL',
    3: 'VALLE VIEJO',
    4: 'GUEMES',
    5: 'MAYORISTA'
  };

  transform(value: number): string {
    return this.mapeo[value] || `Sucursal ${value}`;
  }
}

// En HTML:
{{pedido.sucursald | sucursalNombre}} → "DEPOSITO"
{{pedido.sucursalh | sucursalNombre}} → "CASA CENTRAL"
```

---

### 8.3 Alternativa C: Migrar a estructura normalizada (completa)

**Descripción**: Eliminar tablas dinámicas (factcabN) y unificar en una tabla con columna sucursal.

**Pros**:
- Sistema más normalizado
- Escalable
- Mejor práctica de BD

**Cons**:
- Requiere migración masiva de datos
- Alto riesgo
- Downtime significativo
- Esfuerzo de desarrollo: 3-6 meses

**Veredicto**: 🔴 NO VIABLE a corto plazo, considerar para roadmap futuro

---

## 9. Recomendación Final

### 9.1 Veredicto

✅ **IMPLEMENTAR la solución propuesta** (agregar `valorreal`) con las siguientes condiciones:

1. **Completar Fase 0** (verificación de tablas) ANTES de proceder
2. **Actualizar mapeo hardcodeado** en backend (CRÍTICO)
3. **Actualizar permisos de usuarios** si es necesario
4. **Testing exhaustivo** en desarrollo

### 9.2 Justificación

**A favor**:
- ✅ Resuelve problema de raíz (consistencia de datos)
- ✅ Impacto de código es mínimo (1 archivo frontend, 1 archivo backend)
- ✅ Mejora significativa de UX
- ✅ Base sólida para mejoras futuras
- ✅ Rollback es rápido y seguro

**En contra**:
- ⚠️ Requiere verificación de tablas (mitigado con Fase 0)
- ⚠️ Requiere actualización de permisos de usuarios (mitigado con script)
- ⚠️ Cambio en lógica crítica de movimientos de stock (mitigado con testing)

**Balance**: Beneficios superan riesgos, especialmente con plan de mitigación robusto.

---

### 9.3 Orden de Prioridad

**Opción Recomendada**:
1. **Implementar valorreal** (solución propuesta) - 4 semanas
   - Resuelve problema de fondo
   - Esfuerzo moderado
   - Riesgo controlado

**Alternativa a corto plazo** (mientras se prepara implementación):
2. **Implementar pipe de visualización** - 3 días
   - Mejora UX inmediatamente
   - Riesgo cero
   - No resuelve inconsistencia de fondo

**No recomendado**:
3. No hacer nada
4. Migración completa a estructura normalizada (solo para roadmap futuro)

---

## 10. Checklist de Implementación

### Pre-Implementación

- [ ] Verificar estructura de tablas factcabN, psucursalN, recibosN
- [ ] Verificar alineamiento de tablas con cod_sucursal
- [ ] Verificar estructura de sucursalesPermitidas en usuarios
- [ ] Crear backup completo de Firebase y PostgreSQL
- [ ] Documentar valores actuales en producción
- [ ] Definir ventana de mantenimiento (si aplica)
- [ ] Comunicar cambio a usuarios

### Cambios en Código

- [ ] Agregar campo 'valorreal' a Firebase (todas las sucursales)
- [ ] Actualizar login2.component.ts (método loadSucursales)
- [ ] Actualizar Descarga.php (3 funciones con mapeo hardcodeado)
- [ ] Actualizar permisos de usuarios (si necesario)
- [ ] Agregar comentarios explicativos en código

### Testing

- [ ] Test: Login con cada sucursal
- [ ] Test: Consulta de stock por sucursal
- [ ] Test: Crear pedido de stock
- [ ] Test: Confirmar recepción de pedido
- [ ] Test: Cancelar envío de pedido
- [ ] Test: Crear venta
- [ ] Test: Generar reporte
- [ ] Test: Validación de permisos
- [ ] Test de regresión: Funcionalidades existentes

### Deploy

- [ ] Actualizar Firebase (agregar valorreal)
- [ ] Deploy Backend (Descarga.php)
- [ ] Deploy Frontend (build de Angular)
- [ ] Smoke tests en producción
- [ ] Monitoreo de logs (primeras 24 horas)

### Post-Implementación

- [ ] Verificar que usuarios puedan hacer login
- [ ] Verificar operaciones de stock
- [ ] Verificar creación de ventas
- [ ] Verificar reportes
- [ ] Recolectar feedback de usuarios
- [ ] Documentar lecciones aprendidas

---

## 11. Conclusión

La propuesta de agregar el campo `valorreal` en Firebase es **VIABLE, SEGURA Y RECOMENDADA**, siempre que:

1. Se verifique la alineación de tablas en Fase 0
2. Se actualice el mapeo hardcodeado en backend
3. Se realice testing exhaustivo antes de deploy a producción

Esta solución:
- ✅ Resuelve el problema reportado de visualización confusa
- ✅ Mejora la consistencia de datos en todo el sistema
- ✅ Tiene un impacto de código mínimo (2 archivos)
- ✅ Permite rollback rápido si es necesario
- ✅ Establece base sólida para mejoras futuras

**Siguiente paso**: Ejecutar Fase 0 (verificación de tablas) para obtener Go/No-Go definitivo.

---

**Fin del Informe**

*Documento generado por: Análisis Técnico MotoApp*
*Fecha: 2025-11-02*
*Versión: 1.0*
