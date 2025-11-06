# Análisis de Falla en Cálculo de Costo Total 1 - Lista de Altas

**Fecha:** 2025-11-06
**Componente:** `/lista-altas`
**Módulo Backend:** `Descarga.php` - Funciones `ObtenerAltasConCostos_get` y `CancelarAltaExistencias_post`

---

## 1. Resumen Ejecutivo

Se ha realizado un análisis exhaustivo del sistema de cálculo de costos en el módulo de lista de altas, incluyendo:
- Revisión del componente Angular (`lista-altas.component.ts`)
- Análisis del backend PHP (`Descarga.php.txt`)
- Validación de datos directos en PostgreSQL

### Hallazgos Principales

**IMPORTANTE:** Tras el análisis completo, no se encontraron errores en la lógica de cálculo de costos. Los cálculos son matemáticamente correctos tanto para:
- Costos dinámicos (estado ALTA)
- Costos fijos (estado Cancel-Alta)
- Tanto para costo_total_1 como costo_total_2

Sin embargo, se identificaron **áreas de mejora en eficiencia y optimización** que podrían estar causando comportamientos inesperados bajo ciertas condiciones.

---

## 2. Problemas Reportados

El usuario reportó dos problemas específicos:

1. **Cancelación:** "Cuando se cancela un producto, el sistema no está multiplicando por el valor de cambio al costo1, pero sí lo hace con el costo2"

2. **Cálculo de Altas:** "En los cálculos de las altas, el costo total 1 calcula mal después del primer registro, pero el costo total 2 está bien"

---

## 3. Análisis Técnico Detallado

### 3.1. Función de Cancelación (`CancelarAltaExistencias_post`)

**Ubicación:** `Descarga.php.txt:6422-6711`

#### Código Actual (líneas 6554-6556):

```php
// Calcular costos fijos: costo * cantidad * vcambio (según tipo_moneda del artículo)
$costo_total_1_fijo = $registro->precostosi * $registro->cantidad * $vcambio_fijo;
$costo_total_2_fijo = $registro->precon * $registro->cantidad * $vcambio_fijo;
```

#### Análisis:

✅ **CORRECTO:** Ambos cálculos aplican idénticamente la multiplicación por `$vcambio_fijo`

**Prueba en Base de Datos:**

Registro ID 128 (Cancel-Alta):
- `precostosi`: 147.0248
- `cantidad`: 1000.00
- `vcambio_fijo`: 15.3000
- **Esperado:** 147.0248 × 1000 × 15.3 = 2,249,479.44
- **Real en DB:** 2,249,479.44 ✓

Registro ID 119 (Cancel-Alta):
- `precostosi`: 231.4050
- `cantidad`: 100.00
- `vcambio_fijo`: 15.3000
- **Esperado:** 231.4050 × 100 × 15.3 = 354,049.65
- **Real en DB:** 354,049.65 ✓

**Conclusión:** La función de cancelación calcula correctamente ambos costos.

---

### 3.2. Función de Obtención de Altas (`ObtenerAltasConCostos_get`)

**Ubicación:** `Descarga.php.txt:6138-6406`

#### Código Actual (líneas 6217-6234):

```sql
LEFT JOIN LATERAL (
    SELECT
        -- Obtener valor de cambio actual (más reciente) FILTRANDO POR TIPO DE MONEDA
        (SELECT COALESCE(vcambio, 1)
         FROM valorcambio
         WHERE codmone = art.tipo_moneda
         ORDER BY fecdesde DESC
         LIMIT 1) AS vcambio_actual,

        -- Cálculo de costo_total_1 = precostosi * cantidad * vcambio
        (art.precostosi * pi.cantidad *
         (SELECT COALESCE(vcambio, 1) FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
        ) AS costo_total_1_calculado,

        -- Cálculo de costo_total_2 = precon * cantidad * vcambio
        (art.precon * pi.cantidad *
         (SELECT COALESCE(vcambio, 1) FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
        ) AS costo_total_2_calculado

    FROM artsucursal art
    WHERE art.id_articulo = pi.id_art
) AS costos ON TRIM(pi.estado) = 'ALTA'
```

#### Análisis:

✅ **CORRECTO:** Ambos cálculos son estructuralmente idénticos

❗ **PROBLEMA IDENTIFICADO - INEFICIENCIA:** La subconsulta para obtener `vcambio` se ejecuta **3 veces**:
1. Una vez para `vcambio_actual` (línea 6220-6224)
2. Una vez para `costo_total_1_calculado` (línea 6228)
3. Una vez para `costo_total_2_calculado` (línea 6233)

**Prueba en Base de Datos:**

Registro ID 129 (ALTA):
- `precostosi`: 147.0248
- `cantidad`: 5.00
- `vcambio_actual`: 15.30
- **Esperado costo_total_1:** 147.0248 × 5 × 15.3 = 11,247.3972
- **Real en DB:** 11,247.3972 ✓

Registro ID 127 (ALTA):
- `precostosi`: 231.4050
- `cantidad`: 2000.00
- `vcambio_actual`: 15.30
- **Esperado costo_total_1:** 231.4050 × 2000 × 15.3 = 7,080,993.00
- **Real en DB:** 7,080,993.00 ✓

**Conclusión:** Los cálculos son matemáticamente correctos, pero hay margen de optimización.

---

## 4. Posibles Causas del Comportamiento Reportado

Aunque los cálculos son correctos, el usuario podría estar experimentando:

### 4.1. Problema de Rendimiento

La ejecución múltiple de la subconsulta de `vcambio` podría causar:
- Lentitud en la carga de datos
- Inconsistencias temporales si el valor de cambio se actualiza durante la consulta (muy poco probable pero teóricamente posible)
- Percepción de "error" si los datos tardan en cargar completamente

### 4.2. Problema de Caché en Frontend

El componente Angular no tiene problemas evidentes, pero:
- El navegador podría estar mostrando datos en caché
- Los pipes de Angular (`currency`) podrían estar formateando incorrectamente bajo ciertas condiciones

### 4.3. Problema de Visualización

Las columnas se muestran idénticamente en el HTML (líneas 359-377 de `lista-altas.component.html`):

```html
<!-- Columna: Costo Total 1 -->
<td *ngIf="columnasVisibles['costo_total_1']" style="text-align:right;">
    <span *ngIf="alta.costo_total_1 !== null && alta.costo_total_1 !== undefined">
        {{ alta.costo_total_1 | currency:'ARS':'symbol-narrow':'1.2-2' }}
    </span>
</td>

<!-- Columna: Costo Total 2 -->
<td *ngIf="columnasVisibles['costo_total_2']" style="text-align:right;">
    <span *ngIf="alta.costo_total_2 !== null && alta.costo_total_2 !== undefined">
        {{ alta.costo_total_2 | currency:'ARS':'symbol-narrow':'1.2-2' }}
    </span>
</td>
```

✅ Ambas columnas usan la misma lógica de visualización.

---

## 5. Plan de Reparación y Optimización

### 5.1. Optimización Prioritaria: Eliminar Consultas Redundantes

**Problema:** La subconsulta de `vcambio` se ejecuta 3 veces en el LATERAL JOIN

**Solución Recomendada:**

```sql
LEFT JOIN LATERAL (
    SELECT
        -- Obtener valor de cambio actual UNA SOLA VEZ
        COALESCE(
            (SELECT vcambio
             FROM valorcambio
             WHERE codmone = art.tipo_moneda
             ORDER BY fecdesde DESC
             LIMIT 1),
            1
        ) AS vcambio_actual,

        art.precostosi,
        art.precon

    FROM artsucursal art
    WHERE art.id_articulo = pi.id_art
) AS costos ON TRIM(pi.estado) = 'ALTA'
```

Y luego en el SELECT principal:

```sql
CASE
    WHEN TRIM(pi.estado) = 'ALTA' THEN (costos.precostosi * pi.cantidad * costos.vcambio_actual)
    WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_1_fijo
    ELSE NULL
END AS costo_total_1,

CASE
    WHEN TRIM(pi.estado) = 'ALTA' THEN (costos.precon * pi.cantidad * costos.vcambio_actual)
    WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_2_fijo
    ELSE NULL
END AS costo_total_2
```

**Beneficios:**
- ✅ Reduce consultas de 3 a 1 por registro
- ✅ Mejora significativa de rendimiento
- ✅ Elimina riesgo teórico de inconsistencias
- ✅ Mantiene lógica exacta

---

### 5.2. Verificación y Depuración

#### Paso 1: Agregar Logging Detallado

En `Descarga.php.txt`, en la función `CancelarAltaExistencias_post`, agregar:

```php
// Después de calcular los costos (línea 6557)
log_message('debug', "ID {$registro->id_num}: precostosi={$registro->precostosi}, precon={$registro->precon}, cantidad={$registro->cantidad}, vcambio={$vcambio_fijo}");
log_message('debug', "ID {$registro->id_num}: costo1={$costo_total_1_fijo}, costo2={$costo_total_2_fijo}");
```

#### Paso 2: Verificar Índices de Base de Datos

Ejecutar en PostgreSQL:

```sql
-- Verificar índice en valorcambio
CREATE INDEX IF NOT EXISTS idx_valorcambio_codmone_fecdesde
ON valorcambio(codmone, fecdesde DESC);

-- Verificar índice en pedidoitem
CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado
ON pedidoitem(estado);

-- Verificar índice en artsucursal
CREATE INDEX IF NOT EXISTS idx_artsucursal_tipo_moneda
ON artsucursal(tipo_moneda);
```

#### Paso 3: Agregar Validación en Frontend

En `lista-altas.component.ts`, agregar método de validación:

```typescript
private validarCostos(altas: AltaExistencia[]): void {
  altas.forEach(alta => {
    if (alta.estado?.trim() === 'ALTA' && alta.vcambio) {
      // Para debugging: calcular manualmente y comparar
      console.log(`ID ${alta.id_num}: costo1=${alta.costo_total_1}, costo2=${alta.costo_total_2}, vcambio=${alta.vcambio}`);
    }
  });
}
```

Y llamarlo después de recibir los datos (línea 328):

```typescript
this.altas = response.data || [];
this.validarCostos(this.altas); // Agregar esta línea
```

---

### 5.3. Pruebas de Regresión

Después de aplicar las optimizaciones:

1. **Prueba de Cancelación:**
   - Cancelar un alta con tipo_moneda = 2 (USD)
   - Cancelar un alta con tipo_moneda = 3 (€)
   - Verificar que ambos costos se guarden correctamente

2. **Prueba de Visualización:**
   - Filtrar por estado ALTA
   - Verificar que ambos costos se muestren correctamente
   - Cambiar de página y verificar consistencia

3. **Prueba de Rendimiento:**
   - Medir tiempo de carga antes y después
   - Verificar que la optimización mejore el rendimiento

---

## 6. Documentación de Datos de Prueba

### Registros Validados en Base de Datos:

| ID  | Estado       | Tipo Moneda | Cantidad | Costo1 (Real)    | Costo2 (Real)    | VCambio | Validación |
|-----|--------------|-------------|----------|------------------|------------------|---------|------------|
| 129 | ALTA         | 3 (€)       | 5.00     | 11,247.40        | 23,135.90        | 15.30   | ✓ Correcto |
| 128 | Cancel-Alta  | 3 (€)       | 1000.00  | 2,249,479.44     | 4,627,179.00     | 15.30   | ✓ Correcto |
| 127 | ALTA         | 3 (€)       | 2000.00  | 7,080,993.00     | 10,281,603.06    | 15.30   | ✓ Correcto |
| 124 | ALTA         | 2 (USD)     | 11.00    | 35,961.87        | 78,324.84        | 1735.00 | ✓ Correcto |
| 119 | Cancel-Alta  | 3 (€)       | 100.00   | 354,049.65       | 514,080.15       | 15.30   | ✓ Correcto |
| 118 | ALTA         | 2 (USD)     | 40.00    | 29,252.10        | 60,169.80        | 1735.00 | ✓ Correcto |

**Todos los registros validados muestran cálculos correctos para ambos costos.**

---

## 7. Conclusiones y Recomendaciones

### 7.1. Conclusiones

1. ✅ **No hay errores en la lógica de cálculo:** Los cálculos matemáticos son correctos tanto para costo_total_1 como costo_total_2
2. ✅ **Cancelación funciona correctamente:** Ambos costos se multiplican por vcambio_fijo
3. ✅ **Obtención de altas funciona correctamente:** Ambos costos se calculan con la misma fórmula
4. ❗ **Existe margen de optimización:** La consulta ejecuta subconsultas redundantes

### 7.2. Recomendaciones

**PRIORIDAD ALTA:**
1. Implementar la optimización de subconsultas (Sección 5.1)
2. Agregar índices de base de datos (Sección 5.2 - Paso 2)

**PRIORIDAD MEDIA:**
3. Implementar logging detallado para debugging futuro (Sección 5.2 - Paso 1)
4. Ejecutar pruebas de regresión completas (Sección 5.3)

**PRIORIDAD BAJA:**
5. Agregar validación en frontend para debugging (Sección 5.2 - Paso 3)

### 7.3. Próximos Pasos

Si el usuario continúa reportando el problema después de este análisis:

1. **Solicitar evidencia específica:**
   - Capturas de pantalla mostrando el problema
   - ID de registros específicos con valores incorrectos
   - Pasos exactos para reproducir el problema

2. **Verificar entorno:**
   - Versión de PostgreSQL
   - Versión de PHP/CodeIgniter
   - Versión de Angular
   - Estado de caché del navegador

3. **Ejecutar consultas directas:**
   - Comparar resultados del backend con frontend
   - Verificar que no haya transformaciones en el pipe de Angular

---

## 8. Referencias de Código

### Archivos Analizados:

1. **Frontend:**
   - `src/app/components/lista-altas/lista-altas.component.ts` (líneas 1-854)
   - `src/app/components/lista-altas/lista-altas.component.html` (líneas 1-480)
   - `src/app/services/cargardata.service.ts` (líneas 397-451)

2. **Backend:**
   - `src/Descarga.php.txt:6138-6406` (ObtenerAltasConCostos_get)
   - `src/Descarga.php.txt:6422-6711` (CancelarAltaExistencias_post)

### Consultas SQL Ejecutadas:

```sql
-- Consulta de validación básica
SELECT pi.id_num, pi.id_art, pi.cantidad, art.precostosi, art.precon,
       art.tipo_moneda, TRIM(pi.estado) AS estado,
       pi.costo_total_1_fijo, pi.costo_total_2_fijo, pi.vcambio_fijo,
       (SELECT vcambio FROM valorcambio WHERE codmone = art.tipo_moneda
        ORDER BY fecdesde DESC LIMIT 1) as vcambio_actual
FROM pedidoitem pi
JOIN artsucursal art ON pi.id_art = art.id_articulo
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
ORDER BY pi.id_num DESC LIMIT 10;

-- Consulta completa con LATERAL JOIN (tal como en el backend)
[Ver Sección 3.2 para consulta completa]
```

---

**Documento generado el:** 2025-11-06
**Autor:** Análisis automatizado por Claude Code
**Versión:** 1.0
