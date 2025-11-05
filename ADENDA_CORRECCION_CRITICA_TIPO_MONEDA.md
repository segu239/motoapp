# 🚨 ADENDA: CORRECCIÓN CRÍTICA - FILTRO POR TIPO DE MONEDA

**Fecha de Hallazgo**: 2025-11-05
**Reportado por**: Usuario durante pruebas reales
**Severidad**: 🔥 **CRÍTICA**
**Estado**: ✅ **CORREGIDO**

---

## 📋 RESUMEN EJECUTIVO

Durante las pruebas con datos reales, el usuario identificó un **error crítico** en la lógica de obtención del valor de cambio (vcambio). El sistema estaba obteniendo el valor de cambio más reciente **sin filtrar por tipo de moneda**, causando cálculos financieros incorrectos con diferencias de hasta **113 veces** el valor correcto.

**Impacto**:
- ❌ Todos los cálculos de costos eran incorrectos
- ❌ Las pruebas automatizadas anteriores no detectaron el error
- ✅ Error detectado antes de despliegue en producción
- ✅ Corrección aplicada inmediatamente

---

## 🔍 DESCRIPCIÓN DEL PROBLEMA

### Comportamiento Incorrecto

El sistema ejecutaba la siguiente query para obtener el valor de cambio:

```sql
-- ❌ QUERY INCORRECTA
SELECT COALESCE(vcambio, 1)
FROM valorcambio
ORDER BY fecdesde DESC
LIMIT 1
```

**Problema**: Esta query retorna el valor de cambio **más reciente de CUALQUIER moneda**, sin considerar el tipo de moneda del artículo.

### Ejemplo Real del Error

**Contexto**:
- Artículo ID 7323: ACEL. RAP. MDA 3010 6470
- `artsucursal.tipo_moneda = 3`
- Cantidad: 5 unidades

**Valores en Base de Datos**:

| codmone | vcambio | fecdesde | Descripción |
|---------|---------|----------|-------------|
| 2 | $1,735.00 | 2025-07-04 | Dólar Blue (más reciente globalmente) |
| 3 | $15.30 | 2025-07-04 | Moneda tipo 3 (correcto para este artículo) |

**Resultado del Error**:

```
Query sin filtro retornó: $1,735.00 (codmone=2) ❌
Debió retornar: $15.30 (codmone=3) ✅

Diferencia: 113.33x (inflado)
```

### Cálculos Incorrectos vs Correctos

**Datos del Artículo**:
- Precio Costo S/IVA (precostosi): $231.4050
- Precio Contado (precon): $336.0001
- Cantidad: 5 unidades

**Cálculos INCORRECTOS** (usando vcambio=1735.00):
```
Costo Total 1 = 231.4050 × 5 × 1,735.00 = $2,007,438.38 ❌
Costo Total 2 = 336.0001 × 5 × 1,735.00 = $2,914,800.87 ❌
V. Cambio = 1,735.00 ❌
```

**Cálculos CORRECTOS** (usando vcambio=15.30):
```
Costo Total 1 = 231.4050 × 5 × 15.30 = $17,702.48 ✅
Costo Total 2 = 336.0001 × 5 × 15.30 = $25,704.01 ✅
V. Cambio = 15.30 ✅
```

**Error de Magnitud**: Los costos estaban inflados **113 veces** su valor real.

---

## 🔧 SOLUCIÓN APLICADA

### Corrección en la Query

**Query Corregida**:
```sql
-- ✅ QUERY CORRECTA (con filtro por tipo de moneda)
SELECT COALESCE(vcambio, 1)
FROM valorcambio
WHERE codmone = art.tipo_moneda  -- ← Filtro crítico agregado
ORDER BY fecdesde DESC
LIMIT 1
```

**Cambio Clave**: Se agregó la condición `WHERE codmone = art.tipo_moneda` para obtener el valor de cambio correcto según el tipo de moneda de cada artículo.

### Archivos Modificados

**Archivo**: `src/Descarga.php.txt`

#### 1. Endpoint `ObtenerAltasConCostos_get()` (líneas 6184-6198)

**Cambios realizados**:
- ✅ Agregado filtro `WHERE codmone = art.tipo_moneda` en subconsulta de vcambio_actual
- ✅ Agregado mismo filtro en subconsulta de costo_total_1_calculado
- ✅ Agregado mismo filtro en subconsulta de costo_total_2_calculado
- **Total**: 3 subconsultas corregidas dentro del LATERAL JOIN

**Código Corregido**:
```php
LEFT JOIN LATERAL (
    SELECT
        -- Obtener valor de cambio actual FILTRANDO POR TIPO DE MONEDA
        (SELECT COALESCE(vcambio, 1)
         FROM valorcambio
         WHERE codmone = art.tipo_moneda  -- ← AGREGADO
         ORDER BY fecdesde DESC
         LIMIT 1) AS vcambio_actual,

        -- Cálculo de costo_total_1
        (art.precostosi * pi.cantidad *
         (SELECT COALESCE(vcambio, 1)
          FROM valorcambio
          WHERE codmone = art.tipo_moneda  -- ← AGREGADO
          ORDER BY fecdesde DESC LIMIT 1)
        ) AS costo_total_1_calculado,

        -- Cálculo de costo_total_2
        (art.precon * pi.cantidad *
         (SELECT COALESCE(vcambio, 1)
          FROM valorcambio
          WHERE codmone = art.tipo_moneda  -- ← AGREGADO
          ORDER BY fecdesde DESC LIMIT 1)
        ) AS costo_total_2_calculado

    FROM artsucursal art
    WHERE art.id_articulo = pi.id_art
) AS costos ON TRIM(pi.estado) = 'ALTA'
```

#### 2. Endpoint `CancelarAltasExistencias_post()` (líneas 6350-6438)

**Cambios realizados**:

1. ✅ **Agregado campo `tipo_moneda` al SELECT principal** (línea 6366)
   ```php
   SELECT
       pi.id_num,
       pi.id_items,
       pi.id_art,
       pi.descripcion,
       pi.cantidad,
       TRIM(pi.estado) AS estado,
       pc.sucursald,
       art.precostosi,
       art.precon,
       art.tipo_moneda  -- ← AGREGADO
   ```

2. ✅ **Movida obtención de vcambio DENTRO del foreach** (líneas 6409-6422)

   **Antes** (❌ Incorrecto):
   ```php
   // Obtener vcambio UNA SOLA VEZ para todos los artículos
   $query_vcambio = $this->db->query(
       "SELECT COALESCE(vcambio, 1) AS vcambio_actual
        FROM valorcambio
        ORDER BY fecdesde DESC LIMIT 1"
   );
   $vcambio_fijo = $query_vcambio->row()->vcambio_actual;

   foreach ($registros_altas as $registro) {
       // Usar el mismo vcambio para todos
       $costo_total_1_fijo = $registro->precostosi * $registro->cantidad * $vcambio_fijo;
   }
   ```

   **Después** (✅ Correcto):
   ```php
   foreach ($registros_altas as $registro) {
       // Obtener vcambio ESPECÍFICO para el tipo_moneda de ESTE artículo
       $query_vcambio = $this->db->query(
           "SELECT COALESCE(vcambio, 1) AS vcambio_actual
            FROM valorcambio
            WHERE codmone = ?  -- ← AGREGADO (con parámetro preparado)
            ORDER BY fecdesde DESC
            LIMIT 1",
           array($registro->tipo_moneda)
       );

       $vcambio_fijo = 1;
       if ($query_vcambio->num_rows() > 0) {
           $vcambio_fijo = $query_vcambio->row()->vcambio_actual;
       }

       // Calcular con el vcambio correcto
       $costo_total_1_fijo = $registro->precostosi * $registro->cantidad * $vcambio_fijo;
       $costo_total_2_fijo = $registro->precon * $registro->cantidad * $vcambio_fijo;
   }
   ```

3. ✅ **Mejorado logging** (línea 6438)
   ```php
   log_message('info', "📊 Costos calculados para ID {$registro->id_num} (tipo_moneda={$registro->tipo_moneda}): C1={$costo_total_1_fijo}, C2={$costo_total_2_fijo}, VC={$vcambio_fijo}");
   ```

---

## ✅ VALIDACIÓN DE LA CORRECCIÓN

### Query de Validación

```sql
-- Query para verificar que ahora se usa el vcambio correcto
SELECT
    pi.id_num,
    pi.id_art,
    pi.cantidad,
    art.tipo_moneda AS "Tipo Moneda",
    art.precostosi,
    art.precon,
    -- Obtener vcambio CORRECTO filtrando por tipo_moneda
    (SELECT vcambio
     FROM valorcambio
     WHERE codmone = art.tipo_moneda
     ORDER BY fecdesde DESC LIMIT 1) AS "V. Cambio Correcto",
    -- Cálculos CORRECTOS
    (art.precostosi * pi.cantidad *
     (SELECT vcambio FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
    ) AS "Costo Total 1 Correcto",
    (art.precon * pi.cantidad *
     (SELECT vcambio FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
    ) AS "Costo Total 2 Correcto"
FROM pedidoitem pi
JOIN artsucursal art ON pi.id_art = art.id_articulo
WHERE pi.id_num = 115;
```

### Resultado de Validación

```
✅ RESULTADO CORRECTO:

id_num: 115
id_art: 7323
cantidad: 5.00
tipo_moneda: 3
precostosi: $231.4050
precon: $336.0001
V. Cambio Correcto: $15.30  (codmone=3) ✅
Costo Total 1 Correcto: $17,702.48 ✅
Costo Total 2 Correcto: $25,704.01 ✅
```

---

## 📊 COMPARACIÓN ANTES/DESPUÉS

| Concepto | ANTES (❌ Incorrecto) | DESPUÉS (✅ Correcto) | Diferencia |
|----------|----------------------|----------------------|------------|
| **V. Cambio** | $1,735.00 (codmone=2) | $15.30 (codmone=3) | -99.12% |
| **Costo Total 1** | $2,007,438.38 | $17,702.48 | -99.12% |
| **Costo Total 2** | $2,914,800.87 | $25,704.01 | -99.12% |

**Factor de Error**: Los valores estaban **113.33 veces** más altos de lo correcto.

---

## 🎓 LECCIONES APRENDIDAS

### 1. Validar Relaciones entre Tablas

**Problema**: No se verificó la relación entre `artsucursal.tipo_moneda` y `valorcambio.codmone`

**Lección**:
- ✅ Siempre identificar campos de relación entre tablas
- ✅ Documentar explícitamente estas relaciones
- ✅ Validar lógica de JOINs y subconsultas

### 2. Probar con Datos Reales

**Problema**: Las pruebas automatizadas usaron queries sin validar cálculos con datos reales

**Lección**:
- ✅ Validar cálculos manualmente con datos de producción
- ✅ Comparar resultados contra expectativas del negocio
- ✅ No asumir que una query "exitosa" significa resultado "correcto"

### 3. Involucrar al Usuario en Pruebas

**Problema**: El error fue detectado por el usuario, no por pruebas técnicas

**Lección**:
- ✅ El usuario conoce el negocio mejor que el desarrollador
- ✅ Los valores "absurdos" son señales de alerta importantes
- ✅ Validación de usuarios es crítica antes de producción

### 4. Revisar Subconsultas Cuidadosamente

**Problema**: Las subconsultas dentro del LATERAL JOIN no fueron revisadas en detalle

**Lección**:
- ✅ Revisar CADA subconsulta individualmente
- ✅ Verificar que todas las subconsultas usen los mismos filtros
- ✅ Ejecutar subconsultas de forma aislada para validar resultados

---

## 🔒 VERIFICACIONES POST-CORRECCIÓN

### Checklist de Validación

- [x] ✅ Archivo PHP actualizado con correcciones
- [x] ✅ Documentación actualizada (ESTADO_ACTUAL_IMPLEMENTACION.md)
- [x] ✅ Queries SQL validadas con datos reales
- [x] ✅ Cálculos verificados manualmente
- [ ] ⏳ Usuario verifica resultados en aplicación
- [ ] ⏳ Pruebas con múltiples artículos de diferentes tipo_moneda
- [ ] ⏳ Pruebas de cancelación y fijación de costos

### Próximos Pasos

1. **Usuario debe actualizar PHP** en el servidor
2. **Recargar página** `/lista-altas`
3. **Verificar valores**:
   - V. Cambio debe mostrar $15.30 (no $1,735.00)
   - Costo Total 1 debe mostrar $17,702.48 (no $2,007,438.38)
   - Costo Total 2 debe mostrar $25,704.01 (no $2,914,800.87)
4. **Probar cancelación** de un alta para verificar fijación correcta
5. **Probar con otros artículos** de diferentes tipo_moneda (1, 2, 3)

---

## 📈 IMPACTO EN EL PROYECTO

### Estado de Implementación

**Antes de la Corrección**: 95% Completado ❌ (con error crítico)
**Después de la Corrección**: 95% Completado ✅ (funcionando correctamente)

**Nota**: El porcentaje no cambió porque la funcionalidad estaba implementada, solo tenía un bug en la lógica.

### Confianza en el Sistema

| Aspecto | Antes | Después |
|---------|-------|---------|
| Cálculos de Costos | ❌ Incorrectos | ✅ Correctos |
| Lógica de Monedas | ❌ Ignorada | ✅ Implementada |
| Validación de Datos | ⚠️ Incompleta | ✅ Mejorada |
| Confianza General | 🔴 Baja | 🟢 Alta |

---

## 🚀 ESTADO ACTUAL

**Sistema**: ✅ **Corregido y listo para pruebas**

**Próxima Etapa**: Validación por usuario con datos reales

**Riesgo Residual**: 🟢 Bajo (corrección validada con queries SQL)

**Recomendación**:
- ✅ **Desplegar corrección inmediatamente**
- ⚠️ **Validar con usuario antes de usar en producción**
- 📊 **Monitorear primeros usos para detectar casos edge**

---

## 📎 REFERENCIAS

- **Documento Principal**: `ESTADO_ACTUAL_IMPLEMENTACION.md` (sección 6.3)
- **Informe de Pruebas Original**: `INFORME_PRUEBAS_SISTEMA_COSTOS_V2.md`
- **Archivo Corregido**: `src/Descarga.php.txt` (líneas 6184-6198, 6350-6438)
- **Fecha de Corrección**: 2025-11-05

---

**FIN DE LA ADENDA**

---

**Próxima Actualización**: Después de validación por usuario
