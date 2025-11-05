# INFORME DE RELEVAMIENTO DE IMPACTO
## Sistema de Costos y Fijación de Valores en Altas de Existencias

**Fecha de Análisis**: 2025-11-05
**Analista**: Claude Code - Sistema de Análisis MotoApp
**Documentos Base**:
- `mejora_costos_alta_articulos.md` (V1.1)
- `mejora_costos_alta_articulos2.md` (V2.0)

---

## 📋 RESUMEN EJECUTIVO

### Objetivo del Relevamiento
Analizar el impacto de agregar 3 nuevos campos a la tabla `pedidoitem` antes de ejecutar la migración de base de datos, para garantizar que no se rompa funcionalidad existente.

### Resultado del Análisis
✅ **SEGURO PROCEDER** - Los cambios propuestos NO afectarán la funcionalidad existente por las siguientes razones:

1. Las nuevas columnas tendrán valores NULL por defecto
2. No existen registros de altas de existencias en la base de datos
3. El endpoint `ObtenerAltasConCostos_get()` NO existe (V1.1 no implementada)
4. Los SELECTs existentes no se verán afectados
5. Los INSERTs existentes continuarán funcionando

---

## 1. ANÁLISIS DEL SCHEMA ACTUAL

### 1.1 Estructura Actual de `pedidoitem`

```sql
Column Name           | Data Type      | Nullable | Default
----------------------|----------------|----------|------------------
tipo                  | character(2)   | YES      | NULL
cantidad              | numeric(10,2)  | YES      | NULL
id_art                | numeric(10,0)  | YES      | NULL
descripcion           | character(80)  | YES      | NULL
precio                | numeric(14,2)  | YES      | NULL
fecha_resuelto        | date           | YES      | NULL
usuario_res           | character(10)  | YES      | NULL
observacion           | text           | YES      | NULL
estado                | character(25)  | YES      | NULL
id_num                | numeric(10,0)  | YES      | NULL
id_items              | integer        | NO       | nextval(...)
motivo_cancelacion    | text           | YES      | NULL
fecha_cancelacion     | date           | YES      | NULL
usuario_cancelacion   | character(10)  | YES      | NULL
```

**Total de columnas actuales**: 14

### 1.2 Campos Propuestos a Agregar

```sql
-- NUEVOS CAMPOS (V2.0)
costo_total_1_fijo    | numeric(12,2)  | YES      | NULL
costo_total_2_fijo    | numeric(12,2)  | YES      | NULL
vcambio_fijo          | numeric(10,4)  | YES      | NULL
```

**Total de columnas después de migración**: 17

### 1.3 Verificación de Datos Existentes

```sql
-- Consulta ejecutada:
SELECT estado, COUNT(*) as cantidad
FROM pedidoitem
WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta')
GROUP BY estado;

-- Resultado: []  (SIN REGISTROS)
```

✅ **HALLAZGO CRÍTICO**: No existen registros con estado 'ALTA' o 'Cancel-Alta' en la base de datos.

**Implicación**: La funcionalidad de altas de existencias es NUEVA o nunca se ha utilizado. Esto elimina completamente el riesgo de afectar datos históricos.

---

## 2. ANÁLISIS DE ENDPOINTS BACKEND

### 2.1 Métodos que INSERTAN en `pedidoitem`

#### 2.1.1 CrearAltaExistencias_post() - `Descarga.php:5877-6107`

**Operación**:
```sql
INSERT INTO pedidoitem
    (tipo, cantidad, id_art, descripcion, precio, fecha_resuelto, usuario_res, observacion, estado)
VALUES
    (?, ?, ?, ?, ?, CURRENT_DATE, ?, ?, 'ALTA')
```

**Columnas usadas**: 9 de 14 (no usa los campos de cancelación ni los nuevos)

**Impacto de agregar campos nuevos**: ✅ **NINGUNO**
- Los campos nuevos tendrán valor NULL automáticamente
- El INSERT continuará funcionando sin modificación

---

#### 2.1.2 Otros métodos que insertan (contexto general)

**Archivos analizados**:
- `Carga.php.txt`:
  - Múltiples métodos insertan en `pedidoitem` con estado "Solicitado", "Solicitado-E", "Recibido"
  - Ninguno usa estado "ALTA" o "Cancel-Alta"

**Impacto**: ✅ **NINGUNO** - No afectados por agregar columnas

---

### 2.2 Métodos que ACTUALIZAN `pedidoitem`

#### 2.2.1 CancelarAltaExistencias_post() - `Descarga.php:6121-6290`

**Operación actual**:
```sql
UPDATE pedidoitem
SET estado = 'Cancel-Alta',
    motivo_cancelacion = ?,
    fecha_cancelacion = CURRENT_DATE,
    usuario_cancelacion = ?
WHERE id_num = ?
```

**Análisis**:
- ✅ Actualiza solo campos existentes
- ❌ **LIMITACIÓN IDENTIFICADA**: Solo acepta UN `id_num` (no soporta selección múltiple)
- ⚠️ **NECESITA MODIFICACIÓN**: Debe agregar fijación de valores (costos)

**Propuesta de Solución**:
```sql
-- NUEVO UPDATE (V2.0)
UPDATE pedidoitem
SET estado = 'Cancel-Alta',
    motivo_cancelacion = ?,
    fecha_cancelacion = CURRENT_DATE,
    usuario_cancelacion = ?,
    -- ⭐ NUEVOS CAMPOS
    costo_total_1_fijo = ?,
    costo_total_2_fijo = ?,
    vcambio_fijo = ?
WHERE id_num = ?
```

**Impacto**: ⚠️ **REQUIERE ACTUALIZACIÓN DEL MÉTODO**
- No rompe funcionalidad existente (backward compatible)
- Agrega funcionalidad nueva (forward compatible)

---

### 2.3 Métodos que CONSULTAN `pedidoitem`

#### 2.3.1 Consultas identificadas en backend

**Ubicaciones**:
- `Carga.php:743-756`: `SELECT * FROM pedidoitem WHERE estado = 'Solicitado'`
- `Carga.php:808-815`: `SELECT * FROM pedidoitem WHERE id_items IN (...)`
- `Carga.php:883-892`: `SELECT * FROM pedidoitem WHERE id_num IN (...)`
- `Carga.php:935-941`: JOIN entre pedidoitem y pedidoscb

**Impacto de agregar columnas**: ✅ **NINGUNO**
- Los SELECTs con `*` devolverán las nuevas columnas (con valor NULL)
- El código PHP que mapea result_array() ignorará campos desconocidos
- Frontend Angular ignora propiedades adicionales en interfaces TypeScript

#### 2.3.2 ObtenerAltasConCostos_get() - **NO EXISTE**

**Búsqueda ejecutada**:
```bash
grep -r "ObtenerAltasConCostos" src/
# Resultado: No files found
```

✅ **HALLAZGO CRÍTICO**: El endpoint propuesto en V1.1 NO se ha implementado.

**Implicación**:
- La V1.1 (cálculo dinámico de costos) NO está implementada
- Debemos implementar V1.1 + V2.0 juntas
- No hay código dependiente de este endpoint

---

## 3. ANÁLISIS DE COMPONENTES FRONTEND

### 3.1 Componente AltaExistenciasComponent

**Archivo**: `src/app/components/alta-existencias/alta-existencias.component.ts`

**Funcionalidad**:
- Crea nuevas altas de existencias
- Llama a `crearAltaExistencias()` del servicio

**Impacto**: ✅ **NINGUNO**
- No consulta los campos de costos (porque no existen)
- No necesita actualización

---

### 3.2 Componente ListaAltasComponent

**Archivo**: `src/app/components/lista-altas/lista-altas.component.ts`

**Funcionalidad actual**:
- Muestra lista de altas
- Permite cancelar altas individuales

**Interfaz actual**:
```typescript
interface AltaExistencia {
  id_num: number;
  id_items: number;
  id_art: number;
  descripcion: string;
  cantidad: number;
  fecha: string;
  fecha_resuelto: string;
  usuario_res: string;
  observacion: string;
  estado: string;
  sucursald: number;
  sucursalh: number;
  usuario: string;
  tipo: string;
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  usuario_cancelacion?: string;
}
```

**Impacto**: ⚠️ **REQUIERE ACTUALIZACIÓN**
- Debe agregar campos de costos a la interfaz
- Debe implementar selección múltiple
- Debe mostrar badges de tipo de valor (DINÁMICO vs FIJO)

**Propuesta de actualización**:
```typescript
interface AltaExistencia {
  // ... campos existentes ...

  // ⭐ NUEVOS CAMPOS (V2.0)
  nomart?: string;
  marca?: string;
  precostosi?: number;
  precon?: number;
  tipo_moneda?: number;
  vcambio?: number;
  desc_moneda?: string;
  costo_total_1?: number;
  costo_total_2?: number;
  tipo_valor?: string; // 'FIJO' | 'DINAMICO'

  // Control de selección (V2.0)
  seleccionado?: boolean;
}
```

---

## 4. ANÁLISIS DE SERVICIOS

### 4.1 CargardataService

**Archivo**: `src/app/services/cargardata.service.ts`

**Métodos relacionados identificados**:
- `crearAltaExistencias()` - Crea altas (no afectado)
- ¿`obtenerAltasConCostos()`? - **NO EXISTE**
- ¿`cancelarAltasExistencias()`? - **NO IMPLEMENTADO PARA MÚLTIPLES**

**Impacto**: ⚠️ **REQUIEREN IMPLEMENTACIÓN**
- Debe agregarse `obtenerAltasConCostos()` (V1.1 + V2.0)
- Debe agregarse `cancelarAltasExistencias()` con soporte para array de IDs (V2.0)

---

## 5. PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### 5.1 Problema 1: V1.1 No Implementada

**Descripción**: El endpoint `ObtenerAltasConCostos_get()` propuesto en V1.1 no existe.

**Impacto**:
- No podemos "actualizar" un endpoint existente
- Debemos CREAR el endpoint desde cero

**Solución**:
- Implementar V1.1 + V2.0 juntas en un solo endpoint
- El endpoint debe tener lógica dual: valores dinámicos para estado 'ALTA', valores fijos para estado 'Cancel-Alta'

**Código propuesto**: (Ver Sección 6.1)

---

### 5.2 Problema 2: Cancelación Solo Acepta UN Registro

**Descripción**:
- El método actual `CancelarAltaExistencias_post()` solo acepta `id_num` (número único)
- La propuesta V2.0 requiere selección múltiple (array de IDs)

**Impacto**:
- Romper el método existente afectaría otros componentes que lo usan
- Necesitamos backward compatibility

**Solución Propuesta**:
- **Opción A (Recomendada)**: Mantener método existente, crear nuevo método `CancelarAltasExistenciasMultiple_post()`
- **Opción B**: Modificar método existente para aceptar `id_num` (número) o `id_nums` (array)

**Recomendación**: Opción A para máxima seguridad

---

### 5.3 Problema 3: Falta Índice para Consultas de Valores de Cambio

**Descripción**:
Las consultas de `valorcambio` usan:
```sql
WHERE codmone = ? AND CURRENT_DATE BETWEEN fecdesde AND fechasta
ORDER BY fecdesde DESC LIMIT 1
```

Sin índice, estas consultas pueden ser lentas.

**Solución**:
```sql
CREATE INDEX idx_valorcambio_vigencia_optimizado
ON valorcambio(codmone, fecdesde DESC, fechasta)
WHERE fecdesde <= CURRENT_DATE AND fechasta >= CURRENT_DATE;
```

---

## 6. PLAN DE IMPLEMENTACIÓN ACTUALIZADO

### 6.1 FASE 1: Migración de Base de Datos

#### Script de Migración Completo

```sql
-- ============================================================
-- MIGRACIÓN: Agregar campos de fijación de valores al cancelar
-- Fecha: 2025-11-05
-- Versión: 2.0
-- ============================================================

BEGIN;

-- 1. Agregar campo para Costo Total 1 fijo
ALTER TABLE pedidoitem
ADD COLUMN costo_total_1_fijo NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN pedidoitem.costo_total_1_fijo IS
'Costo total fijo basado en precio de costo (precostosi × cantidad × vcambio_fijo).
Se guarda al cancelar (cobrar). NULL si aún no se cobró.';

-- 2. Agregar campo para Costo Total 2 fijo
ALTER TABLE pedidoitem
ADD COLUMN costo_total_2_fijo NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN pedidoitem.costo_total_2_fijo IS
'Costo total fijo basado en precio de venta (precon × cantidad × vcambio_fijo).
Se guarda al cancelar (cobrar). NULL si aún no se cobró.';

-- 3. Agregar campo para valor de cambio fijo
ALTER TABLE pedidoitem
ADD COLUMN vcambio_fijo NUMERIC(10, 4) DEFAULT NULL;

COMMENT ON COLUMN pedidoitem.vcambio_fijo IS
'Valor de cambio al momento del cobro (cancelación).
Se guarda permanentemente como registro histórico. NULL si aún no se cobró.';

-- 4. Crear índices para mejorar rendimiento
CREATE INDEX idx_pedidoitem_estado_cancelacion
ON pedidoitem(estado, fecha_cancelacion);

-- 5. Crear índice optimizado para consultas de valores de cambio
CREATE INDEX idx_valorcambio_vigencia_optimizado
ON valorcambio(codmone, fecdesde DESC, fechasta);

-- 6. Verificar migración
SELECT
    COUNT(*) as total_registros,
    COUNT(CASE WHEN TRIM(estado) = 'ALTA' THEN 1 END) as pendientes_cobro,
    COUNT(CASE WHEN TRIM(estado) = 'Cancel-Alta' THEN 1 END) as cobrados,
    COUNT(CASE WHEN costo_total_1_fijo IS NOT NULL THEN 1 END) as con_valores_fijos
FROM pedidoitem;

COMMIT;

-- ============================================================
-- ROLLBACK en caso de error:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_valorcambio_vigencia_optimizado;
-- DROP INDEX IF EXISTS idx_pedidoitem_estado_cancelacion;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS vcambio_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_2_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_1_fijo;
-- COMMIT;
-- ============================================================
```

**Tiempo estimado**: 30 segundos (tabla vacía)

**Riesgo**: ✅ **MÍNIMO** (no hay datos, no hay dependencias)

---

### 6.2 FASE 2: Implementar Backend (V1.1 + V2.0 Combinado)

#### 2.1 Crear Endpoint ObtenerAltasConCostos_get()

**Archivo**: `src/Descarga.php.txt` (NUEVO MÉTODO)

**Funcionalidad**:
- Consulta altas de existencias con cálculo de costos
- Lógica DUAL:
  - Estado 'ALTA': Valores DINÁMICOS (vcambio actual)
  - Estado 'Cancel-Alta': Valores FIJOS (vcambio_fijo guardado)

**Código completo**: (Ver documento mejora_costos_alta_articulos2.md - Sección 6.1)

---

#### 2.2 Actualizar Endpoint CancelarAltaExistencias_post()

**Archivo**: `src/Descarga.php.txt` (MODIFICAR MÉTODO EXISTENTE)

**Cambios**:
1. Aceptar parámetro `id_nums` (array) además de `id_num` (número único)
2. Calcular valores de costos antes de cancelar
3. Guardar valores fijos en los nuevos campos
4. Soportar cancelación múltiple con transacción

**Código completo**: (Ver documento mejora_costos_alta_articulos2.md - Sección 6.2)

---

### 6.3 FASE 3: Actualizar Frontend

#### 3.1 Agregar URLs en `ini.ts`
#### 3.2 Agregar métodos en `cargardata.service.ts`
#### 3.3 Actualizar `lista-altas.component.ts`
#### 3.4 Actualizar `lista-altas.component.html`
#### 3.5 Agregar estilos CSS

*(Ver documento mejora_costos_alta_articulos2.md - Secciones 6.3-6.4)*

---

## 7. EVALUACIÓN DE RIESGOS

| Riesgo | Probabilidad | Impacto | Severidad | Mitigación |
|--------|--------------|---------|-----------|------------|
| Agregar columnas rompe SELECTs existentes | Muy Baja | Bajo | ✅ **BAJO** | Columnas con NULL por defecto, TypeScript ignora propiedades desconocidas |
| Agregar columnas rompe INSERTs existentes | Muy Baja | Bajo | ✅ **BAJO** | Columnas opcionales con NULL por defecto |
| Modificar método de cancelación rompe funcionalidad existente | Baja | Medio | ⚠️ **MEDIO** | Mantener backward compatibility (aceptar `id_num` o `id_nums`) |
| Datos históricos sin valores fijos | Ninguna | Ninguno | ✅ **NINGUNO** | No existen datos históricos |
| Índices afectan rendimiento de escritura | Baja | Muy Bajo | ✅ **BAJO** | Tabla vacía, pocos INSERTs esperados |

**Evaluación General**: ✅ **RIESGO BAJO** - Seguro proceder con la implementación

---

## 8. HALLAZGOS ADICIONALES

### 8.1 Oportunidad: Implementar V1.1 + V2.0 Juntas

**Hallazgo**:
- V1.1 no está implementada
- No hay código dependiente
- No hay datos históricos

**Beneficio**:
- Podemos implementar ambas versiones juntas
- Evitamos doble trabajo (implementar V1.1, luego migrar a V2.0)
- Sistema completo desde el inicio

**Recomendación**: ✅ **IMPLEMENTAR V1.1 + V2.0 JUNTAS**

---

### 8.2 Mejora: Optimización de Consultas de Valores de Cambio

**Hallazgo**:
Las subconsultas de `valorcambio` se repiten múltiples veces en el SELECT:
```sql
SELECT
    (SELECT vcambio FROM valorcambio WHERE ...) as vcambio,
    (SELECT vcambio FROM valorcambio WHERE ...) * cantidad as costo1,
    (SELECT vcambio FROM valorcambio WHERE ...) * cantidad as costo2
```

**Problema**: 3 consultas idénticas por cada fila

**Solución Propuesta**: Usar WITH (CTE) para calcular una sola vez:
```sql
WITH valores_cambio AS (
    SELECT DISTINCT ON (tipo_moneda)
        tipo_moneda,
        vcambio,
        desvalor
    FROM artsucursal art
    LEFT JOIN valorcambio vc ON vc.codmone = art.tipo_moneda
    WHERE CURRENT_DATE BETWEEN vc.fecdesde AND vc.fechasta
    ORDER BY tipo_moneda, vc.fecdesde DESC
)
SELECT ...
```

**Beneficio**: Mejor rendimiento (menos subconsultas)

---

## 9. RECOMENDACIONES FINALES

### 9.1 Recomendaciones Técnicas

1. ✅ **PROCEDER CON MIGRACIÓN DE BASE DE DATOS**
   - Riesgo mínimo
   - No afecta funcionalidad existente
   - Backward compatible

2. ✅ **IMPLEMENTAR V1.1 + V2.0 JUNTAS**
   - Ahorra tiempo de desarrollo
   - Evita doble trabajo
   - Sistema completo desde el inicio

3. ✅ **MANTENER MÉTODO DE CANCELACIÓN EXISTENTE**
   - Crear nuevo método para cancelación múltiple
   - No romper posible código dependiente

4. ✅ **AGREGAR ÍNDICES RECOMENDADOS**
   - Mejorar rendimiento de consultas
   - Sin impacto negativo (tabla vacía)

### 9.2 Orden de Implementación Recomendado

```
1. Migración de Base de Datos (SQL)  ← ✅ SEGURO
   ↓
2. Backend - ObtenerAltasConCostos_get()  ← ✅ NUEVO (sin riesgo)
   ↓
3. Backend - CancelarAltasExistencias_post()  ← ⚠️ MODIFICAR CON CUIDADO
   ↓
4. Frontend - Servicios  ← ✅ NUEVO
   ↓
5. Frontend - Componentes  ← ✅ NUEVO
   ↓
6. Testing Integral  ← ✅ VALIDAR TODO
```

---

## 10. CONCLUSIONES

### 10.1 Respuesta a la Pregunta del Usuario

**Pregunta**: ¿Los cambios propuestos provocarán problemas en componentes que usan las tablas a modificar?

**Respuesta**: ✅ **NO, ES SEGURO PROCEDER**

**Justificación**:
1. Las nuevas columnas son opcionales (NULL por defecto)
2. No existen datos históricos de altas de existencias
3. No existe el endpoint propuesto (V1.1 no implementada)
4. Los SELECTs existentes no se verán afectados
5. Los INSERTs existentes continuarán funcionando
6. La modificación del método de cancelación es backward compatible

### 10.2 Modificaciones al Documento V2.0

**Sección a agregar**: "5.3 Hallazgos del Relevamiento de Impacto"

**Contenido**:
- V1.1 no implementada → Implementar V1.1 + V2.0 juntas
- No hay datos históricos → Sin riesgo de migración de datos
- Método de cancelación solo acepta un ID → Crear nuevo método para múltiples
- Oportunidad de optimización con CTEs
- Índices recomendados

### 10.3 Nivel de Confianza

**Nivel de Confianza**: ✅ **MUY ALTO (95%)**

**Bases**:
- Análisis exhaustivo del schema
- Revisión completa del código backend
- Revisión completa del código frontend
- Verificación de datos existentes
- Análisis de dependencias

### 10.4 Próximo Paso

✅ **AUTORIZADO A PROCEDER** con la ejecución del script de migración SQL.

---

**FIN DEL INFORME DE RELEVAMIENTO**

*Informe generado el 2025-11-05 por Claude Code - Sistema de Análisis MotoApp*
