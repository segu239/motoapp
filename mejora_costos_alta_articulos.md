# INFORME DE MEJORA: Sistema de Costos en Alta de Existencias

**Fecha de Análisis**: 2025-11-04
**Versión del Documento**: 1.0
**Autor**: Sistema de Análisis MotoApp
**Estado**: Propuesta para Implementación

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis de la Situación Actual](#análisis-de-la-situación-actual)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Lógica de Negocio para Cálculo de Costos](#lógica-de-negocio-para-cálculo-de-costos)
5. [Casos de Uso y Escenarios](#casos-de-uso-y-escenarios)
6. [Problemas Identificados](#problemas-identificados)
7. [Arquitectura de la Solución](#arquitectura-de-la-solución)
8. [Plan de Implementación Detallado](#plan-de-implementación-detallado)
9. [Consideraciones Técnicas](#consideraciones-técnicas)
10. [Riesgos y Mitigación](#riesgos-y-mitigación)
11. [Cronograma Estimado](#cronograma-estimado)
12. [Métricas de Éxito](#métricas-de-éxito)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Objetivo de la Mejora

Implementar un sistema de cálculo dinámico de costos para las operaciones de alta de existencias, permitiendo a los usuarios visualizar en tiempo real:

1. **Costo Total 1**: Basado en precio de costo sin IVA (`precostosi`)
2. **Costo Total 2**: Basado en precio de venta (`precon`)
3. **Valor de cambio actual** utilizado en los cálculos
4. **Tipo de moneda** asociada al artículo

### 1.2 Justificación

Esta mejora es crítica para:
- **Control de Inventario**: Conocer el valor real de las existencias agregadas
- **Toma de Decisiones**: Evaluar el impacto económico de cada alta
- **Auditoría Financiera**: Rastrear el valor de las operaciones de inventario
- **Análisis de Rentabilidad**: Comparar costos vs precios de venta

### 1.3 Impacto Esperado

- ✅ Visibilidad completa del valor económico de las altas
- ✅ Cálculos automáticos y actualizados en tiempo real
- ✅ Mejor control de costos de inventario
- ✅ Información precisa para reportes financieros

---

## 2. ANÁLISIS DE LA SITUACIÓN ACTUAL

### 2.1 Estado Actual del Sistema

El sistema de alta de existencias actualmente:

**✅ Funcionalidades Implementadas:**
- Registro de altas de stock con cantidad y observación
- Actualización automática de stock en `artsucursal`
- Sistema de cancelación con reversión de stock
- Auditoría completa (usuario, fecha, motivo)
- Filtrado por sucursal y estado

**❌ Limitaciones Identificadas:**
- No se calcula ni muestra el costo de las operaciones
- No hay visibilidad del impacto económico de cada alta
- No se considera el tipo de moneda ni el valor de cambio
- Falta información para análisis financiero

### 2.2 Datos Disponibles en el Sistema

#### Tabla `pedidoitem` (altas registradas)
```
- id_items: ID único del alta
- id_num: ID de cabecera
- id_art: ID del artículo
- cantidad: Cantidad dada de alta
- descripcion: Nombre del artículo
- fecha_resuelto: Fecha de la operación
- usuario_res: Usuario que realizó el alta
- estado: 'ALTA' o 'Cancel-Alta'
```

#### Tabla `artsucursal` (información de artículos)
```
- id_articulo / idart: ID del artículo
- nomart: Nombre del artículo
- precostosi: Precio de costo sin IVA ⭐
- precon: Precio de venta ⭐
- tipo_moneda: Código de moneda (1, 2, 3) ⭐
- marca, rubro, estado, etc.
```

#### Tabla `valorcambio` (tipos de cambio)
```
- id_valor: ID único
- codmone: Código de moneda ⭐
- vcambio: Valor de cambio ⭐
- desvalor: Descripción
- fecdesde: Fecha desde (vigencia)
- fechasta: Fecha hasta (vigencia)
```

---

## 3. ESTRUCTURA DE BASE DE DATOS

### 3.1 Diagrama de Relaciones

```
┌─────────────────┐         ┌──────────────────┐
│   pedidoitem    │         │   artsucursal    │
├─────────────────┤         ├──────────────────┤
│ id_items    PK  │         │ id_articulo  PK  │
│ id_art      FK ─┼────────▶│ idart            │
│ cantidad        │         │ precostosi   ⭐  │
│ estado          │         │ precon       ⭐  │
│ ...             │         │ tipo_moneda  FK ─┼───┐
└─────────────────┘         └──────────────────┘   │
                                                    │
                                                    │
                            ┌──────────────────┐   │
                            │  valorcambio     │   │
                            ├──────────────────┤   │
                            │ id_valor     PK  │   │
                            │ codmone      ◀───┼───┘
                            │ vcambio      ⭐  │
                            │ fecdesde         │
                            │ fechasta         │
                            └──────────────────┘
```

### 3.2 Tipos de Moneda Identificados

Basado en el análisis de datos reales:

| codmone | Descripción        | vcambio Actual | Ejemplos de Uso              |
|---------|--------------------|----------------|------------------------------|
| 1       | Pesos Argentinos   | 1.00           | Moneda base (sin conversión) |
| 2       | Dólar (Tipo 1)     | 1735.00        | Artículos importados         |
| 3       | Dólar (Tipo 2)     | 15.30          | Artículos de otra región     |

**Nota**: Existen múltiples registros de `valorcambio` vigentes para la misma moneda debido a actualizaciones históricas.

### 3.3 Análisis de Datos de Ejemplo

**Ejemplo Real de Artículo:**
```sql
-- Artículo: AMA FLUIDO P/FRENOS x 100 cm³
id_articulo: 5434
nomart: "AMA FLUIDO P/FRENOS x 100 cmü  0066"
precostosi: 141.7521  (Precio costo sin IVA)
precon: 274.4320      (Precio de venta)
tipo_moneda: 3        (Dólar Tipo 2)

-- Valor de Cambio Vigente para tipo_moneda=3:
vcambio: 15.30

-- Si se dan de alta 4 unidades:
Costo Total 1 = 141.7521 * 4 * 15.30 = $8,675.03
Costo Total 2 = 274.4320 * 4 * 15.30 = $16,798.76
```

---

## 4. LÓGICA DE NEGOCIO PARA CÁLCULO DE COSTOS

### 4.1 Fórmulas de Cálculo

#### **Costo Total 1: Basado en Precio de Costo**
```
Costo Total 1 = precostosi × cantidad × vcambio

Donde:
- precostosi: Precio de costo sin IVA del artículo (de artsucursal)
- cantidad: Cantidad dada de alta (de pedidoitem)
- vcambio: Valor de cambio actual para el tipo de moneda (de valorcambio)
```

**Propósito**: Representa el **costo real** de la mercadería agregada al inventario.

---

#### **Costo Total 2: Basado en Precio de Venta**
```
Costo Total 2 = precon × cantidad × vcambio

Donde:
- precon: Precio de venta del artículo (de artsucursal)
- cantidad: Cantidad dada de alta (de pedidoitem)
- vcambio: Valor de cambio actual para el tipo de moneda (de valorcambio)
```

**Propósito**: Representa el **valor potencial de venta** de la mercadería agregada.

---

### 4.2 Algoritmo de Obtención de Valor de Cambio

**Problema**: Existen múltiples registros de `valorcambio` vigentes para la misma moneda.

**Solución Propuesta**:

```sql
-- Paso 1: Filtrar por tipo de moneda
WHERE codmone = [tipo_moneda del artículo]

-- Paso 2: Filtrar por vigencia
AND CURRENT_DATE BETWEEN fecdesde AND fechasta

-- Paso 3: Ordenar por fecha más reciente
ORDER BY fecdesde DESC

-- Paso 4: Tomar el primer resultado
LIMIT 1
```

**Consulta SQL Completa**:
```sql
SELECT vcambio, desvalor
FROM valorcambio
WHERE codmone = ?
  AND CURRENT_DATE BETWEEN fecdesde AND fechasta
ORDER BY fecdesde DESC
LIMIT 1;
```

---

### 4.2.1 ⭐ DECISIÓN APROBADA: Uso de Fecha Más Reciente

**CONFIRMACIÓN DEL USUARIO**: ✅ **Aprobado el 2025-11-04**

**Decisión**: Para resolver el problema de múltiples registros de `valorcambio` vigentes para la misma moneda, se utilizará **SIEMPRE el registro con la fecha de inicio (`fecdesde`) más reciente**.

#### **Justificación Detallada**:

1. **Lógica de Negocio**:
   - El valor de cambio se actualiza periódicamente cuando hay cambios en el mercado
   - La fecha más reciente representa la actualización más reciente del valor
   - Los registros antiguos permanecen por razones de auditoría e historial

2. **Ejemplo Real del Sistema**:
```sql
-- Situación actual en la base de datos para Dólar Tipo 1 (codmone=2):

ID  | codmone | vcambio   | fecdesde   | fechasta   | Decisión
----|---------|-----------|------------|------------|------------------
11  |    2    | 1735.00   | 2025-07-04 | 2025-12-31 | ✅ MÁS RECIENTE (USAR ESTE)
10  |    2    | 1575.00   | 2025-05-01 | 2025-12-31 | ❌ Anterior
6   |    2    | 2000.00   | 2025-04-01 | 2025-12-31 | ❌ Anterior
5   |    2    | 1089.00   | 2025-03-17 | 9999-12-31 | ❌ Más antiguo

Resultado: Se usará vcambio = 1735.00
```

3. **Algoritmo Implementado**:
```
PARA CADA tipo de moneda:
  1. Filtrar registros vigentes HOY (CURRENT_DATE BETWEEN fecdesde AND fechasta)
  2. Ordenar por fecdesde DESCENDENTE (del más nuevo al más viejo)
  3. Tomar el PRIMERO (LIMIT 1) = el más reciente
  4. Usar ese vcambio para los cálculos
```

4. **Ventajas de Este Enfoque**:
   - ✅ **Simplicidad**: Regla clara y fácil de entender
   - ✅ **Actualizado**: Siempre usa el valor más reciente del mercado
   - ✅ **Consistente**: Mismo criterio para todas las monedas
   - ✅ **Mantenible**: No requiere limpieza de datos históricos
   - ✅ **Auditable**: Registros antiguos quedan para trazabilidad

5. **Implicaciones**:
   - Los costos mostrados reflejan el valor de cambio **ACTUAL** (al momento de la consulta)
   - Si el valor de cambio cambió desde que se realizó el alta, se mostrará el nuevo valor
   - Esto es correcto para inventario: el valor del stock debe reflejar precios actuales
   - Para reportes históricos exactos, sería necesario guardar el vcambio en pedidoitem (ver nota)

#### **Nota para Futuras Mejoras**:

Si en el futuro se requiere precisión histórica absoluta (mostrar el vcambio que existía en la fecha del alta):

**Opción A - Almacenar vcambio histórico**:
```sql
ALTER TABLE pedidoitem
ADD COLUMN vcambio_historico NUMERIC;

-- Al crear el alta, guardar el vcambio usado en ese momento
INSERT INTO pedidoitem (..., vcambio_historico)
VALUES (..., [vcambio_vigente_hoy]);
```

**Opción B - Consulta con fecha histórica**:
```sql
-- Consultar vcambio vigente en la fecha del alta
SELECT vcambio
FROM valorcambio
WHERE codmone = ?
  AND fecha_alta BETWEEN fecdesde AND fechasta  -- Usar fecha del alta
ORDER BY fecdesde DESC
LIMIT 1;
```

**Decisión Actual**: No implementar estas opciones ahora. Usar **siempre el valor actual** es más simple y adecuado para el propósito de control de inventario.

---

### 4.3 Casos Especiales

#### **Caso 1: Artículo sin tipo_moneda**
```
SI tipo_moneda IS NULL O tipo_moneda = 0:
    vcambio = 1.00  (sin conversión)
    moneda = "Pesos Argentinos"
```

#### **Caso 2: No existe valor de cambio vigente**
```
SI no hay vcambio vigente para la moneda:
    vcambio = 1.00  (valor por defecto)
    moneda = "Sin definir"
    ADVERTENCIA: "Tipo de cambio no encontrado"
```

#### **Caso 3: Artículo sin precostosi o precon**
```
SI precostosi IS NULL:
    Costo Total 1 = 0.00

SI precon IS NULL:
    Costo Total 2 = 0.00
```

---

## 5. CASOS DE USO Y ESCENARIOS

### 5.1 Caso de Uso Principal

**UC-01: Visualizar Costos en Lista de Altas**

**Actor**: Usuario con permisos de gestión de inventario

**Precondiciones**:
- Existen altas de existencias registradas
- Los artículos tienen precios y tipo de moneda configurados
- Existen valores de cambio vigentes en el sistema

**Flujo Principal**:
1. Usuario accede a "Lista de Altas"
2. Sistema carga altas de la sucursal seleccionada
3. Para cada alta, sistema calcula:
   - Obtiene datos del artículo (precostosi, precon, tipo_moneda)
   - Consulta valor de cambio vigente para el tipo de moneda
   - Calcula Costo Total 1 = precostosi × cantidad × vcambio
   - Calcula Costo Total 2 = precon × cantidad × vcambio
4. Sistema muestra tabla con columnas adicionales:
   - Costo Total 1
   - Costo Total 2
   - Valor Cambio
   - Tipo Moneda
5. Sistema muestra totalizadores al final de la tabla

**Postcondiciones**:
- Usuario visualiza costos actualizados de todas las altas
- Totales son calculados dinámicamente

---

### 5.2 Escenarios de Prueba

#### **Escenario 1: Alta con Moneda Local (Pesos)**
```
Artículo: Aceite Motor 10W40
- precostosi: 5000.00
- precon: 8500.00
- tipo_moneda: 1 (Pesos)
- cantidad: 10 unidades

Valores de Cambio:
- vcambio: 1.00

Resultados Esperados:
- Costo Total 1: $50,000.00
- Costo Total 2: $85,000.00
- Valor Cambio: $1.00
- Tipo Moneda: "Pesos Argentinos"
```

#### **Escenario 2: Alta con Dólar Tipo 1**
```
Artículo: Cable Velocímetro Importado
- precostosi: 1.1736
- precon: 2.4140
- tipo_moneda: 2 (Dólar Tipo 1)
- cantidad: 5 unidades

Valores de Cambio:
- vcambio: 1735.00

Resultados Esperados:
- Costo Total 1: $10,181.37
- Costo Total 2: $20,941.45
- Valor Cambio: $1,735.00
- Tipo Moneda: "Dólar (Tipo 1)"
```

#### **Escenario 3: Alta con Dólar Tipo 2**
```
Artículo: AMA FLUIDO P/FRENOS
- precostosi: 141.7521
- precon: 274.4320
- tipo_moneda: 3 (Dólar Tipo 2)
- cantidad: 4 unidades

Valores de Cambio:
- vcambio: 15.30

Resultados Esperados:
- Costo Total 1: $8,675.03
- Costo Total 2: $16,798.76
- Valor Cambio: $15.30
- Tipo Moneda: "Dólar (Tipo 2)"
```

#### **Escenario 4: Alta Cancelada**
```
Estado: 'Cancel-Alta'

Comportamiento:
- Los costos SE MUESTRAN pero con indicador visual
- Se utiliza el vcambio vigente al momento de la consulta
- En reportes, estas altas NO se suman a los totales
```

---

## 6. PROBLEMAS IDENTIFICADOS

### 6.1 Problema 1: Múltiples Valores de Cambio Vigentes

**Descripción**: Existen múltiples registros en `valorcambio` con rangos de fechas superpuestos para la misma moneda.

**Ejemplo Real**:
```sql
-- Moneda 2 (Dólar Tipo 1) - Registros vigentes HOY:
1. vcambio: 1735.00, desde: 2025-07-04, hasta: 2025-12-31
2. vcambio: 2000.00, desde: 2025-04-01, hasta: 2025-12-31
3. vcambio: 1089.00, desde: 2025-03-17, hasta: 9999-12-31
4. vcambio: 1575.00, desde: 2025-04-04, hasta: 2025-12-31
5. vcambio: 1575.00, desde: 2025-05-01, hasta: 2025-12-31
```

**Impacto**: Ambigüedad en qué valor utilizar.

**Solución ✅ APROBADA**: Usar `ORDER BY fecdesde DESC LIMIT 1` para tomar el más reciente.

**Ver detalles completos**: Sección 4.2.1 "⭐ DECISIÓN APROBADA: Uso de Fecha Más Reciente"

---

### 6.2 Problema 2: Artículos sin Tipo de Moneda

**Descripción**: Algunos artículos pueden tener `tipo_moneda = NULL`.

**Solución**:
- Asumir `tipo_moneda = 1` (Pesos)
- `vcambio = 1.00`
- Registrar warning en logs

---

### 6.3 Problema 3: Precios en Cero o NULL

**Descripción**: Artículos pueden tener `precostosi = 0` o `NULL`.

**Impacto**: Costos calculados incorrectos.

**Solución**:
- Mostrar `$0.00` en la columna
- Agregar indicador visual (ícono de advertencia)
- No incluir en totalizadores si es apropiado

---

### 6.4 Problema 4: Cambios Históricos de Valores

**Descripción**: Los valores de cambio varían en el tiempo, pero las altas se registran con la fecha histórica.

**Pregunta Crítica**: ¿Usar el vcambio histórico (fecha del alta) o el actual (fecha de consulta)?

**Decisión ✅ APROBADA**: Usar **vcambio ACTUAL** (al momento de la consulta) porque:
- Es más simple de implementar
- Refleja el valor real del inventario HOY
- No requiere almacenar vcambio histórico en pedidoitem
- Adecuado para control de inventario y valoración actual

**Implicación**: Los costos mostrados siempre reflejan los valores de cambio vigentes al momento de la consulta, no los históricos del momento del alta.

**Alternativas futuras**: Si en el futuro se requiere precisión histórica absoluta, ver opciones en Sección 4.2.1 (Opción A: Almacenar vcambio_historico, Opción B: Consulta con fecha histórica).

**Ver justificación completa**: Sección 4.2.1 "⭐ DECISIÓN APROBADA: Uso de Fecha Más Reciente"

---

## 7. ARQUITECTURA DE LA SOLUCIÓN

### 7.1 Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ListaAltasComponent                                │    │
│  │  - Carga altas desde backend                        │    │
│  │  - Muestra tabla con costos calculados              │    │
│  │  - Totalizadores dinámicos                          │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   │ HTTP GET                                 │
│                   │ /ObtenerAltasConCostos?sucursal=X       │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (PHP/CodeIgniter)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Descarga::ObtenerAltasConCostos_get()             │    │
│  │                                                      │    │
│  │  1. Obtiene altas filtradas por sucursal/estado    │    │
│  │                                                      │    │
│  │  2. Para cada alta:                                 │    │
│  │     - JOIN con artsucursal (precios, tipo_moneda)  │    │
│  │     - JOIN con valorcambio (vcambio vigente)       │    │
│  │     - Calcula costo_total_1 y costo_total_2        │    │
│  │                                                      │    │
│  │  3. Retorna JSON con datos enriquecidos            │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   │ SQL Query                                │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (PostgreSQL)                │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ pedidoitem   │───▶│ artsucursal  │───▶│ valorcambio │  │
│  │              │    │              │    │             │  │
│  │ - id_art     │    │ - precostosi │    │ - vcambio   │  │
│  │ - cantidad   │    │ - precon     │    │ - codmone   │  │
│  │ - estado     │    │ - tipo_moneda│    │ - vigencia  │  │
│  └──────────────┘    └──────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Consulta SQL Optimizada

```sql
SELECT
    -- Datos de la alta
    pi.id_items,
    pi.id_num,
    pi.id_art,
    pi.descripcion,
    pi.cantidad,
    pi.fecha_resuelto,
    pi.usuario_res,
    pi.observacion,
    pi.estado,
    pc.sucursald,

    -- Datos del artículo
    art.precostosi,
    art.precon,
    art.tipo_moneda,
    art.nomart,
    art.marca,

    -- Valor de cambio vigente
    vc.vcambio,
    vc.desvalor AS desc_moneda,

    -- Cálculos de costos
    (art.precostosi * pi.cantidad * COALESCE(vc.vcambio, 1.0)) AS costo_total_1,
    (art.precon * pi.cantidad * COALESCE(vc.vcambio, 1.0)) AS costo_total_2,

    -- Metadatos de cancelación
    pi.motivo_cancelacion,
    pi.fecha_cancelacion,
    pi.usuario_cancelacion

FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
INNER JOIN artsucursal art ON pi.id_art = art.id_articulo

-- JOIN con valor de cambio (subconsulta para obtener el vigente más reciente)
LEFT JOIN LATERAL (
    SELECT vcambio, desvalor
    FROM valorcambio
    WHERE codmone = art.tipo_moneda
      AND CURRENT_DATE BETWEEN fecdesde AND fechasta
    ORDER BY fecdesde DESC
    LIMIT 1
) vc ON true

WHERE pc.sucursald = ?  -- Parámetro: sucursal
  AND pi.estado IN ('ALTA', 'Cancel-Alta')  -- Filtro de estados

ORDER BY pi.fecha_resuelto DESC, pi.id_items DESC;
```

**Ventajas de esta consulta**:
- ✅ Un solo viaje a la base de datos
- ✅ Cálculos realizados en SQL (más rápido)
- ✅ Manejo de valores NULL con COALESCE
- ✅ LATERAL JOIN para obtener el vcambio más reciente

---

### 7.3 Estructura de Respuesta JSON

```json
{
  "error": false,
  "mensaje": [
    {
      "id_items": 1234,
      "id_num": 5678,
      "id_art": 5434,
      "descripcion": "AMA FLUIDO P/FRENOS x 100 cm³",
      "cantidad": 4,
      "fecha_resuelto": "2025-11-04",
      "usuario_res": "usuario@example.com",
      "observacion": "Alta por recepción de mercadería proveedor XYZ",
      "estado": "ALTA",
      "sucursald": 1,

      "nomart": "AMA FLUIDO P/FRENOS x 100 cmü  0066",
      "marca": "AMA",
      "precostosi": 141.7521,
      "precon": 274.4320,
      "tipo_moneda": 3,

      "vcambio": 15.30,
      "desc_moneda": "VALOR DOLAR A FECHA DE HOY",

      "costo_total_1": 8675.03,
      "costo_total_2": 16798.76,

      "motivo_cancelacion": null,
      "fecha_cancelacion": null,
      "usuario_cancelacion": null
    }
  ],
  "totales": {
    "total_altas": 1,
    "total_costo_1": 8675.03,
    "total_costo_2": 16798.76,
    "total_canceladas": 0
  }
}
```

---

## 8. PLAN DE IMPLEMENTACIÓN DETALLADO

### 8.1 FASE 1: Backend - Endpoint con Costos

**Archivo**: `src/Descarga.php.txt`

#### **Paso 1.1: Crear nuevo método en Descarga.php**

```php
/**
 * Obtener Altas con Cálculo de Costos
 *
 * Retorna todas las altas de existencias con cálculos dinámicos de costos
 * basados en precostosi, precon y valores de cambio vigentes.
 *
 * @method GET
 * @param int sucursal - Sucursal a consultar (query param)
 * @param string estado - Estado a filtrar: 'ALTA', 'Cancel-Alta', 'TODAS' (opcional)
 * @return JSON - Altas con costos calculados
 */
public function ObtenerAltasConCostos_get() {
    // Obtener parámetros
    $sucursal = $this->get('sucursal');
    $estado_filtro = $this->get('estado') ?? 'TODAS';

    // Validar sucursal
    if (!$sucursal || !is_numeric($sucursal)) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "Parámetro 'sucursal' requerido y debe ser numérico"
        );
        $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
        return;
    }

    try {
        // Construir consulta SQL
        $sql = "
            SELECT
                -- Datos de la alta
                pi.id_items,
                pi.id_num,
                pi.id_art,
                pi.descripcion,
                pi.cantidad,
                pi.fecha_resuelto,
                pi.usuario_res,
                pi.observacion,
                TRIM(pi.estado) as estado,
                pc.sucursald,

                -- Datos del artículo
                art.precostosi,
                art.precon,
                art.tipo_moneda,
                TRIM(art.nomart) as nomart,
                TRIM(art.marca) as marca,

                -- Valor de cambio vigente (subconsulta)
                (
                    SELECT vcambio
                    FROM valorcambio
                    WHERE codmone = COALESCE(art.tipo_moneda, 1)
                      AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                    ORDER BY fecdesde DESC
                    LIMIT 1
                ) as vcambio,

                (
                    SELECT TRIM(desvalor)
                    FROM valorcambio
                    WHERE codmone = COALESCE(art.tipo_moneda, 1)
                      AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                    ORDER BY fecdesde DESC
                    LIMIT 1
                ) as desc_moneda,

                -- Cálculos de costos
                (
                    COALESCE(art.precostosi, 0) *
                    pi.cantidad *
                    COALESCE((
                        SELECT vcambio
                        FROM valorcambio
                        WHERE codmone = COALESCE(art.tipo_moneda, 1)
                          AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                        ORDER BY fecdesde DESC
                        LIMIT 1
                    ), 1.0)
                ) as costo_total_1,

                (
                    COALESCE(art.precon, 0) *
                    pi.cantidad *
                    COALESCE((
                        SELECT vcambio
                        FROM valorcambio
                        WHERE codmone = COALESCE(art.tipo_moneda, 1)
                          AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                        ORDER BY fecdesde DESC
                        LIMIT 1
                    ), 1.0)
                ) as costo_total_2,

                -- Metadatos de cancelación
                pi.motivo_cancelacion,
                pi.fecha_cancelacion,
                pi.usuario_cancelacion

            FROM pedidoitem pi
            INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
            LEFT JOIN artsucursal art ON pi.id_art = art.id_articulo

            WHERE pc.sucursald = ?
        ";

        // Agregar filtro de estado si no es 'TODAS'
        if ($estado_filtro !== 'TODAS') {
            $sql .= " AND TRIM(pi.estado) = ? ";
        }

        $sql .= " ORDER BY pi.fecha_resuelto DESC, pi.id_items DESC";

        // Ejecutar consulta
        $params = [$sucursal];
        if ($estado_filtro !== 'TODAS') {
            $params[] = $estado_filtro;
        }

        $query = $this->db->query($sql, $params);

        if ($query->num_rows() > 0) {
            $altas = $query->result_array();

            // Calcular totales
            $total_costo_1 = 0;
            $total_costo_2 = 0;
            $total_altas_activas = 0;
            $total_canceladas = 0;

            foreach ($altas as $alta) {
                if (trim($alta['estado']) === 'ALTA') {
                    $total_costo_1 += $alta['costo_total_1'];
                    $total_costo_2 += $alta['costo_total_2'];
                    $total_altas_activas++;
                } else if (trim($alta['estado']) === 'Cancel-Alta') {
                    $total_canceladas++;
                }
            }

            $respuesta = array(
                "error" => false,
                "mensaje" => $altas,
                "totales" => array(
                    "total_altas_activas" => $total_altas_activas,
                    "total_canceladas" => $total_canceladas,
                    "total_costo_1" => round($total_costo_1, 2),
                    "total_costo_2" => round($total_costo_2, 2)
                )
            );

            log_message('info', "✅ Altas con costos obtenidas: Sucursal={$sucursal}, Total={$query->num_rows()}");

        } else {
            $respuesta = array(
                "error" => false,
                "mensaje" => [],
                "totales" => array(
                    "total_altas_activas" => 0,
                    "total_canceladas" => 0,
                    "total_costo_1" => 0,
                    "total_costo_2" => 0
                )
            );
        }

        $this->response($respuesta, REST_Controller::HTTP_OK);

    } catch (Exception $e) {
        log_message('error', "❌ Error obteniendo altas con costos: " . $e->getMessage());

        $respuesta = array(
            "error" => true,
            "mensaje" => "Error al obtener altas: " . $e->getMessage()
        );

        $this->response($respuesta, REST_Controller::HTTP_INTERNAL_SERVER_ERROR);
    }
}
```

---

### 8.2 FASE 2: Frontend - Configuración

#### **Paso 2.1: Agregar URL en ini.ts**

**Archivo**: `src/app/config/ini.ts`

```typescript
// URLs para alta de existencias con costos
export const UrlAltasConCostos =
  "https://motoapp.loclx.io/APIAND/index.php/Descarga/ObtenerAltasConCostos";
```

---

#### **Paso 2.2: Agregar método en cargardata.service.ts**

**Archivo**: `src/app/services/cargardata.service.ts`

```typescript
import { UrlAltasConCostos } from '../config/ini';

/**
 * Obtener Altas con Cálculo de Costos
 * Obtiene todas las altas de existencias con costos calculados dinámicamente
 *
 * @param sucursal - Número de sucursal
 * @param estado - Estado a filtrar: 'ALTA', 'Cancel-Alta', 'TODAS' (opcional)
 * @returns Observable con las altas y costos calculados
 */
obtenerAltasConCostos(sucursal: number, estado: string = 'TODAS'): Observable<any> {
  const params = new HttpParams()
    .set('sucursal', sucursal.toString())
    .set('estado', estado);

  return this.http.get(UrlAltasConCostos, { params });
}
```

---

### 8.3 FASE 3: Frontend - Actualizar Componente

#### **Paso 3.1: Actualizar interfaz AltaExistencia**

**Archivo**: `src/app/components/lista-altas/lista-altas.component.ts`

```typescript
// Interfaz actualizada para alta de existencias con costos
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

  // Nuevos campos de costos
  nomart?: string;
  marca?: string;
  precostosi?: number;
  precon?: number;
  tipo_moneda?: number;
  vcambio?: number;
  desc_moneda?: string;
  costo_total_1?: number;
  costo_total_2?: number;

  // Cancelación
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  usuario_cancelacion?: string;
}

// Interfaz para totales
interface TotalesAltas {
  total_altas_activas: number;
  total_canceladas: number;
  total_costo_1: number;
  total_costo_2: number;
}
```

---

#### **Paso 3.2: Actualizar método cargarAltas()**

```typescript
// Variable para totales
public totales: TotalesAltas = {
  total_altas_activas: 0,
  total_canceladas: 0,
  total_costo_1: 0,
  total_costo_2: 0
};

cargarAltas(): void {
  this.cargando = true;

  const sucursal = this.sucursalFiltro || 1;

  // Usar el nuevo método con costos
  this._cargardata.obtenerAltasConCostos(sucursal, this.estadoFiltro)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        this.cargando = false;

        if (response.error) {
          Swal.fire({
            title: 'Error',
            text: response.mensaje || 'Error al cargar altas de existencias',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          this.altas = [];
          this.altasFiltradas = [];
        } else {
          this.altas = response.mensaje || [];
          this.totales = response.totales || this.totales;
          this.aplicarFiltros();
        }
      },
      error: (error) => {
        console.error('Error al cargar altas:', error);
        this.cargando = false;

        Swal.fire({
          title: 'Error',
          text: 'Error al comunicarse con el servidor: ' + (error.message || error),
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
}
```

---

#### **Paso 3.3: Agregar métodos de formato**

```typescript
// Formatear moneda
formatearMoneda(valor: number | undefined): string {
  if (valor === undefined || valor === null) {
    return '$0.00';
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

// Obtener descripción de tipo de moneda
getTipoMonedaDescripcion(codmone: number | undefined): string {
  if (!codmone) return 'Sin definir';

  const monedas: { [key: number]: string } = {
    1: 'Pesos Argentinos',
    2: 'Dólar (Tipo 1)',
    3: 'Dólar (Tipo 2)'
  };

  return monedas[codmone] || `Moneda ${codmone}`;
}
```

---

### 8.4 FASE 4: Frontend - Actualizar Template HTML

**Archivo**: `src/app/components/lista-altas/lista-altas.component.html`

```html
<!-- Tabla de altas con columnas adicionales de costos -->
<div class="table-responsive" *ngIf="!cargando && altasFiltradas.length > 0">
    <table class="table table-striped table-hover table-sm">
        <thead class="table-dark">
            <tr>
                <th>ID</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th class="text-end">Cantidad</th>
                <th>Sucursal</th>
                <th class="text-end">Costo Total 1<br><small>(Precio Costo)</small></th>
                <th class="text-end">Costo Total 2<br><small>(Precio Venta)</small></th>
                <th class="text-center">Valor Cambio</th>
                <th>Tipo Moneda</th>
                <th>Usuario</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <tr *ngFor="let alta of altasFiltradas"
                [class.table-success]="alta.estado?.trim() === 'ALTA'"
                [class.table-danger]="alta.estado?.trim() === 'Cancel-Alta'">
                <td>{{ alta.id_num }}</td>
                <td>
                    <span class="badge"
                        [class.badge-success]="alta.estado?.trim() === 'ALTA'"
                        [class.badge-danger]="alta.estado?.trim() === 'Cancel-Alta'">
                        {{ alta.estado }}
                    </span>
                </td>
                <td>{{ alta.fecha_resuelto || alta.fecha || 'N/A' }}</td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;"
                         [title]="alta.descripcion">
                        {{ alta.descripcion }}
                    </div>
                    <small class="text-muted">ID: {{ alta.id_art }}</small>
                </td>
                <td class="text-end">
                    <strong>{{ alta.cantidad }}</strong>
                </td>
                <td>{{ getNombreSucursal(alta.sucursald) }}</td>

                <!-- NUEVAS COLUMNAS DE COSTOS -->
                <td class="text-end">
                    <strong>{{ formatearMoneda(alta.costo_total_1) }}</strong>
                    <br>
                    <small class="text-muted">
                        {{ formatearMoneda(alta.precostosi) }} × {{ alta.cantidad }}
                    </small>
                </td>
                <td class="text-end">
                    <strong>{{ formatearMoneda(alta.costo_total_2) }}</strong>
                    <br>
                    <small class="text-muted">
                        {{ formatearMoneda(alta.precon) }} × {{ alta.cantidad }}
                    </small>
                </td>
                <td class="text-center">
                    <span class="badge badge-info">
                        {{ formatearMoneda(alta.vcambio || 1) }}
                    </span>
                </td>
                <td>
                    <small>{{ getTipoMonedaDescripcion(alta.tipo_moneda) }}</small>
                </td>

                <td>
                    <small>{{ alta.usuario_res || alta.usuario }}</small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            class="btn btn-info"
                            (click)="verDetalles(alta)"
                            [disabled]="cancelando"
                            title="Ver detalles">
                            <i class="fa fa-eye"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-danger"
                            (click)="confirmarCancelacion(alta)"
                            [disabled]="cancelando || alta.estado?.trim() !== 'ALTA'"
                            title="Cancelar alta"
                            *ngIf="alta.estado?.trim() === 'ALTA'">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        </tbody>

        <!-- FILA DE TOTALES -->
        <tfoot class="table-secondary">
            <tr>
                <td colspan="6" class="text-end"><strong>TOTALES (Solo Activas):</strong></td>
                <td class="text-end">
                    <strong class="text-primary">{{ formatearMoneda(totales.total_costo_1) }}</strong>
                </td>
                <td class="text-end">
                    <strong class="text-success">{{ formatearMoneda(totales.total_costo_2) }}</strong>
                </td>
                <td colspan="4"></td>
            </tr>
        </tfoot>
    </table>
</div>

<!-- Resumen actualizado -->
<div class="row mt-3" *ngIf="!cargando && altasFiltradas.length > 0">
    <div class="col-md-12">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">📊 Resumen de Costos</h5>
                <div class="row">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Altas Activas</h6>
                            <h3 class="text-success">{{ totales.total_altas_activas }}</h3>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Altas Canceladas</h6>
                            <h3 class="text-danger">{{ totales.total_canceladas }}</h3>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Costo Total 1<br><small>(Precio Costo)</small></h6>
                            <h3 class="text-primary">{{ formatearMoneda(totales.total_costo_1) }}</h3>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Costo Total 2<br><small>(Precio Venta)</small></h6>
                            <h3 class="text-success">{{ formatearMoneda(totales.total_costo_2) }}</h3>
                        </div>
                    </div>
                </div>

                <!-- Margen Potencial -->
                <div class="row mt-3">
                    <div class="col-md-12">
                        <div class="alert alert-info">
                            <strong>💰 Margen Potencial:</strong>
                            {{ formatearMoneda(totales.total_costo_2 - totales.total_costo_1) }}
                            <span class="ms-2">
                                ({{ ((totales.total_costo_2 - totales.total_costo_1) / totales.total_costo_1 * 100).toFixed(2) }}%)
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

---

### 8.5 FASE 5: Estilos CSS

**Archivo**: `src/app/components/lista-altas/lista-altas.component.css`

```css
/* Estilos para tabla de costos */
.table-sm th,
.table-sm td {
  padding: 0.5rem;
  font-size: 0.875rem;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tarjetas de estadísticas */
.stat-card {
  padding: 1rem;
  border-left: 4px solid #007bff;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
  text-align: center;
}

.stat-card h6 {
  margin-bottom: 0.5rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.stat-card h3 {
  margin-bottom: 0;
  font-weight: bold;
}

/* Badges personalizados */
.badge-info {
  background-color: #17a2b8;
  color: white;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

/* Resaltar totales */
tfoot tr {
  font-weight: bold;
  border-top: 2px solid #dee2e6;
}

/* Indicadores visuales */
.text-warning {
  color: #ffc107 !important;
}

.text-danger {
  color: #dc3545 !important;
}

.text-success {
  color: #28a745 !important;
}

.text-primary {
  color: #007bff !important;
}
```

---

## 9. CONSIDERACIONES TÉCNICAS

### 9.1 Rendimiento

#### **Optimizaciones Implementadas**:

1. **Cálculos en SQL**: Los costos se calculan en la base de datos, no en PHP o JavaScript
2. **Subconsultas Optimizadas**: Uso de subconsultas para obtener vcambio sin JOINs innecesarios
3. **Índices Recomendados**:
```sql
-- Índice para búsqueda de valores de cambio vigentes
CREATE INDEX idx_valorcambio_vigencia
ON valorcambio(codmone, fecdesde, fechasta);

-- Índice para búsqueda de artículos por ID
CREATE INDEX idx_artsucursal_id_articulo
ON artsucursal(id_articulo);

-- Índice para búsqueda de altas por sucursal y estado
CREATE INDEX idx_pedidoscb_sucursal_estado
ON pedidoscb(sucursald);

CREATE INDEX idx_pedidoitem_estado
ON pedidoitem(estado);
```

4. **Paginación**: Si la cantidad de altas crece, implementar paginación en el endpoint

---

### 9.2 Seguridad

1. **Validación de Entrada**: Validar parámetro `sucursal` en backend
2. **Permisos**: Verificar que el usuario tenga permisos para ver altas de esa sucursal
3. **SQL Injection**: Usar queries parametrizadas (ya implementado)
4. **XSS**: Angular escapa HTML automáticamente

---

### 9.3 Escalabilidad

**Posibles Mejoras Futuras**:

1. **Cache de Valores de Cambio**: Cachear vcambio vigentes por 1 hora
2. **Cálculo Asíncrono**: Para reportes grandes, calcular en background job
3. **Exportación Mejorada**: Agregar gráficos en Excel exportado
4. **Histórico de Costos**: Guardar vcambio en pedidoitem al momento del alta

---

### 9.4 Mantenibilidad

1. **Logging**: Registrar todas las consultas de costos para auditoría
2. **Documentación**: Documentar fórmulas de cálculo en código
3. **Tests**: Agregar tests unitarios para cálculos
4. **Versionado**: Versionar endpoint (`/v1/ObtenerAltasConCostos`)

---

## 10. RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Múltiples vcambio vigentes causan cálculos incorrectos | Alta | Alto | Usar `ORDER BY fecdesde DESC LIMIT 1` |
| Artículos sin tipo_moneda | Media | Medio | Asumir tipo_moneda=1, vcambio=1.0 |
| Precios en NULL o cero | Media | Bajo | Usar COALESCE, mostrar advertencia |
| Rendimiento en tablas grandes | Baja | Alto | Implementar índices, paginación |
| Cambios de moneda retroactivos | Baja | Medio | Documentar que se usa vcambio actual |

---

## 11. CRONOGRAMA ESTIMADO

| Fase | Tarea | Tiempo Estimado | Dependencias |
|------|-------|-----------------|--------------|
| 1 | Crear endpoint backend `ObtenerAltasConCostos_get()` | 2-3 horas | Ninguna |
| 2 | Agregar URL y servicio en Angular | 30 minutos | Fase 1 |
| 3 | Actualizar componente TypeScript | 1-2 horas | Fase 2 |
| 4 | Actualizar template HTML | 1-2 horas | Fase 3 |
| 5 | Agregar estilos CSS | 30 minutos | Fase 4 |
| 6 | Testing y ajustes | 2-3 horas | Fase 5 |
| 7 | Documentación final | 1 hora | Fase 6 |

**TOTAL ESTIMADO**: 8-12 horas de desarrollo

---

## 12. MÉTRICAS DE ÉXITO

### 12.1 Criterios de Aceptación

✅ **Funcionalidad**:
- [ ] Los costos se calculan correctamente según las fórmulas
- [ ] Se muestra el valor de cambio vigente actual
- [ ] Se identifica correctamente el tipo de moneda
- [ ] Los totales suman correctamente
- [ ] Las altas canceladas se excluyen de los totales

✅ **Rendimiento**:
- [ ] La consulta responde en < 2 segundos para 1000 registros
- [ ] No hay consultas N+1 (todo en un solo query)

✅ **Usabilidad**:
- [ ] Los costos se muestran con formato de moneda legible
- [ ] Los totalizadores son claros y visibles
- [ ] La exportación a Excel incluye las columnas de costos

✅ **Calidad**:
- [ ] No hay errores de compilación
- [ ] No hay warnings de TypeScript
- [ ] El código está documentado

---

## 13. ANEXOS

### 13.1 Glosario de Términos

| Término | Definición |
|---------|------------|
| `precostosi` | Precio de costo sin IVA del artículo |
| `precon` | Precio de venta del artículo |
| `tipo_moneda` | Código de moneda del artículo (1=Pesos, 2=Dólar Tipo 1, 3=Dólar Tipo 2) |
| `vcambio` | Valor de cambio vigente de la moneda |
| `codmone` | Código de moneda en tabla valorcambio |
| Costo Total 1 | `precostosi × cantidad × vcambio` |
| Costo Total 2 | `precon × cantidad × vcambio` |

### 13.2 Referencias

- Documento original: `ANALISIS_ALTA_EXISTENCIAS.md`
- Base de datos: PostgreSQL MotoApp
- Framework Frontend: Angular 15.2.6
- Framework Backend: CodeIgniter 3.x (PHP)

---

## 14. CONCLUSIONES

Este informe presenta un análisis completo y un plan de implementación detallado para agregar cálculo dinámico de costos al sistema de alta de existencias.

**Beneficios Clave**:
1. ✅ **Visibilidad Financiera**: Los usuarios podrán ver el impacto económico real de cada alta
2. ✅ **Toma de Decisiones Informada**: Datos precisos para evaluar inversión en inventario
3. ✅ **Auditoría Mejorada**: Trazabilidad completa del valor de las operaciones
4. ✅ **Análisis de Rentabilidad**: Comparación directa entre costo y precio de venta

**Decisiones Clave Aprobadas**:
- ✅ **Uso de Valor de Cambio Más Reciente**: Confirmado y aprobado el 2025-11-04
- ✅ **Cálculo Dinámico al Momento de Consulta**: Los costos reflejan valores actuales
- ✅ **Algoritmo `ORDER BY fecdesde DESC LIMIT 1`**: Para resolver múltiples vcambio vigentes

**Estado del Documento**: ✅ **REVISADO Y APROBADO**

**Siguiente Paso**: Proceder con la implementación siguiendo las fases detalladas (Sección 8).

**Tiempo Estimado de Implementación**: 8-12 horas

---

## 15. HISTORIAL DE REVISIONES

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2025-11-04 | Creación inicial del informe con análisis completo | Sistema de Análisis |
| 1.1 | 2025-11-04 | Agregada Sección 4.2.1 "Decisión Aprobada" sobre uso de fecha más reciente | Sistema de Análisis |
| 1.1 | 2025-11-04 | Actualizadas secciones 6.1 y 6.4 con referencias cruzadas | Sistema de Análisis |
| 1.1 | 2025-11-04 | Confirmación del usuario sobre decisión de fecha más reciente | Usuario + Sistema |

---

**FIN DEL INFORME**

*Este documento ha sido revisado y aprobado. Listo para implementación.*
