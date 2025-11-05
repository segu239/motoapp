# INFORME DE MEJORA 2: Sistema de Fijación de Valores al Cancelar Altas de Existencias

**Fecha de Análisis**: 2025-11-04
**Versión del Documento**: 2.0
**Autor**: Sistema de Análisis MotoApp
**Estado**: Propuesta para Implementación
**Documento Base**: mejora_costos_alta_articulos.md (Versión 1.1)

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Contexto del Negocio](#contexto-del-negocio)
3. [Situación Actual](#situación-actual)
4. [Propuesta de Solución](#propuesta-de-solución)
5. [Análisis de Base de Datos](#análisis-de-base-de-datos)
6. [Plan de Implementación](#plan-de-implementación)
7. [Casos de Uso](#casos-de-uso)
8. [Anexos Técnicos](#anexos-técnicos)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Contexto del Negocio Real

**Escenario**: El dueño cedió una sucursal a otra persona y provee artículos a esa sucursal. Estos artículos se cobran DESPUÉS, no inmediatamente.

**Problema Actual**:
- Los valores de las altas se calculan dinámicamente con el tipo de cambio ACTUAL
- Esto es CORRECTO mientras NO se ha cobrado (deuda pendiente actualizada)
- Pero cuando se COBRA, no hay registro histórico del monto exacto cobrado

**Solución Propuesta**:
- Mantener valores DINÁMICOS para altas NO cobradas (estado "ALTA")
- Al CANCELAR el registro (=COBRAR), FIJAR los valores con el vcambio del día del cobro
- Los registros cancelados pasan a "Cancel-Alta" con valores FIJOS permanentes

### 1.2 Objetivo de la Mejora

Implementar un sistema de **fijación automática de valores al cancelar**, que:

1. **Calcula dinámicamente** los costos mientras el pago está pendiente
2. **Fija permanentemente** los costos al momento del cobro/cancelación
3. **Permite selección múltiple** para cancelar/cobrar varias altas a la vez
4. **Guarda historial exacto** de cuánto se cobró y a qué tipo de cambio

---

## 2. CONTEXTO DEL NEGOCIO

### 2.1 Flujo Operativo Real

```
┌──────────────────────────────────────────────────────────────────┐
│ DÍA 1: ALTA DE EXISTENCIAS                                      │
├──────────────────────────────────────────────────────────────────┤
│ El dueño provee 10 unidades de artículo X a la sucursal cedida  │
│                                                                  │
│ Registro en sistema:                                            │
│ - Estado: "ALTA"                                                │
│ - Artículo: Cable velocímetro (precostosi: $1.50 USD)          │
│ - Cantidad: 10 unidades                                         │
│ - Tipo moneda: 2 (Dólar)                                        │
│ - Valor cambio HOY: $1,735.00                                   │
│                                                                  │
│ ✅ Costo Total 1 (DINÁMICO): 1.50 × 10 × 1735 = $26,025.00     │
│ ✅ Costo Total 2 (DINÁMICO): 3.00 × 10 × 1735 = $52,050.00     │
│                                                                  │
│ INTERPRETACIÓN: "Se debe cobrar aproximadamente $26,025"       │
└──────────────────────────────────────────────────────────────────┘

                            ↓ (15 días después)

┌──────────────────────────────────────────────────────────────────┐
│ DÍA 15: CONSULTA DE DEUDA PENDIENTE                             │
├──────────────────────────────────────────────────────────────────┤
│ Usuario consulta las altas pendientes de cobro                  │
│                                                                  │
│ Sistema muestra:                                                │
│ - Estado: "ALTA" (aún NO cobrado)                              │
│ - Valor cambio HOY: $1,850.00 ⬆️ (subió)                        │
│                                                                  │
│ ✅ Costo Total 1 (RECALCULADO): 1.50 × 10 × 1850 = $27,750.00  │
│ ✅ Costo Total 2 (RECALCULADO): 3.00 × 10 × 1850 = $55,500.00  │
│                                                                  │
│ INTERPRETACIÓN: "Ahora se debe cobrar $27,750"                 │
│ ⚠️ IMPORTANTE: El valor cambió porque el dólar subió           │
└──────────────────────────────────────────────────────────────────┘

                            ↓ (15 días después)

┌──────────────────────────────────────────────────────────────────┐
│ DÍA 30: SE COBRA EL PAGO                                        │
├──────────────────────────────────────────────────────────────────┤
│ Usuario CANCELA el registro (= cobró el pago)                   │
│                                                                  │
│ Sistema al momento de cancelar:                                 │
│ - Valor cambio HOY: $1,900.00                                   │
│ - Calcula valores FINALES:                                      │
│   • Costo Total 1: 1.50 × 10 × 1900 = $28,500.00              │
│   • Costo Total 2: 3.00 × 10 × 1900 = $57,000.00              │
│                                                                  │
│ ✅ FIJA los valores permanentemente:                            │
│   UPDATE pedidoitem SET                                         │
│     estado = 'Cancel-Alta',                                     │
│     costo_total_1_fijo = 28500.00,                             │
│     costo_total_2_fijo = 57000.00,                             │
│     vcambio_fijo = 1900.00,                                    │
│     fecha_cancelacion = '2025-11-04',                          │
│     motivo_cancelacion = 'Cobro realizado'                     │
│                                                                  │
│ INTERPRETACIÓN: "Se cobró $28,500 al tipo de cambio $1,900"    │
└──────────────────────────────────────────────────────────────────┘

                            ↓ (cualquier día futuro)

┌──────────────────────────────────────────────────────────────────┐
│ DÍA 45+: CONSULTAS FUTURAS                                      │
├──────────────────────────────────────────────────────────────────┤
│ Usuario consulta historial de cobros                            │
│                                                                  │
│ Sistema muestra:                                                │
│ - Estado: "Cancel-Alta" (YA cobrado)                           │
│ - Valor cambio: $1,900.00 🔒 (FIJO al día del cobro)           │
│                                                                  │
│ ✅ Costo Total 1: $28,500.00 🔒 (NUNCA cambia)                  │
│ ✅ Costo Total 2: $57,000.00 🔒 (NUNCA cambia)                  │
│                                                                  │
│ INTERPRETACIÓN: "Se cobró $28,500" (registro histórico exacto) │
│ ⚠️ IMPORTANTE: Aunque el dólar hoy sea $2,000, el registro     │
│                muestra $1,900 porque ESE fue el valor cobrado   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Por Qué Valores Dinámicos Son CORRECTOS

**Para altas NO cobradas (estado "ALTA")**:

```
✅ VENTAJA: Refleja la deuda actualizada
✅ VENTAJA: El dueño sabe cuánto debe cobrar HOY
✅ VENTAJA: Si el dólar sube, el cobro será mayor (beneficia al proveedor)
✅ VENTAJA: Si el dólar baja, el cobro será menor (beneficia al cliente)
```

**Ejemplo Real**:

```
Alta del 01/11: 10 unidades @ $1.50 USD
- Dólar a $1,735 → Deuda: $26,025
- Dólar a $1,850 → Deuda: $27,750  ⬆️ (beneficia proveedor)
- Dólar a $1,620 → Deuda: $24,300  ⬇️ (beneficia cliente)

El cliente puede elegir cuándo pagar según le convenga.
```

### 2.3 Por Qué Fijación al Cancelar es NECESARIA

**Para altas cobradas (estado "Cancel-Alta")**:

```
✅ NECESIDAD: Registro histórico del monto exacto cobrado
✅ NECESIDAD: Auditoría y contabilidad precisa
✅ NECESIDAD: Saber a qué tipo de cambio se hizo el cobro
✅ NECESIDAD: Evitar que el histórico cambie retroactivamente
```

**Ejemplo Real**:

```
Cobro realizado el 30/11:
- Se cobró: $28,500 al tipo de cambio $1,900
- Registro fijo: "Se cobró $28,500 el 30/11"

Consulta el 15/12 (dólar a $2,100):
- Sistema muestra: $28,500 🔒 (NO $31,500)
- Razón: El cobro fue de $28,500, no de $31,500
```

---

## 3. SITUACIÓN ACTUAL

### 3.1 Implementación Existente (V1.1)

Según el documento `mejora_costos_alta_articulos.md`:

```sql
-- Cálculo SIEMPRE dinámico (correcto para NO cobrados)
SELECT
    pi.cantidad,
    art.precostosi,
    art.precon,
    art.tipo_moneda,

    -- Valor de cambio ACTUAL
    (SELECT vcambio
     FROM valorcambio
     WHERE codmone = art.tipo_moneda
       AND CURRENT_DATE BETWEEN fecdesde AND fechasta
     ORDER BY fecdesde DESC
     LIMIT 1) as vcambio,

    -- Costo Total 1 DINÁMICO
    art.precostosi * pi.cantidad * vcambio as costo_total_1,

    -- Costo Total 2 DINÁMICO
    art.precon * pi.cantidad * vcambio as costo_total_2

FROM pedidoitem pi
INNER JOIN artsucursal art ON pi.id_art = art.id_articulo
WHERE pi.estado = 'ALTA'
```

**✅ CORRECTO para**: Altas NO cobradas (deuda pendiente)
**❌ INCORRECTO para**: Altas cobradas (falta registro histórico)

### 3.2 Problema: Falta Registro Histórico de Cobros

```
❌ PROBLEMA ACTUAL:

Usuario cobra $28,500 el 30/11 (dólar a $1,900)

Consulta el 15/12 (dólar a $2,100):
Sistema muestra: $31,500 (INCORRECTO)

Auditor pregunta: "¿Cuánto se cobró el 30/11?"
Respuesta: "No lo sabemos, solo vemos el valor actual"
```

---

## 4. PROPUESTA DE SOLUCIÓN

### 4.1 Concepto: Fijación Automática al Cancelar

**Principio Fundamental**:

```
Al CANCELAR un alta (= cobrar el pago):
1. El sistema CALCULA los valores con el vcambio de HOY
2. GUARDA permanentemente esos valores en la BD
3. MARCA el registro como "Cancel-Alta"
4. NUNCA más recalcula esos valores
```

### 4.2 Lógica de Negocio

```
┌────────────────────────────────────────────────────────────┐
│ ESTADO: "ALTA" (No cobrado)                                │
│                                                            │
│ Valores: DINÁMICOS (se recalculan cada día)              │
│                                                            │
│ SELECT costo_total_1 = precostosi × cantidad × vcambio_HOY│
│ SELECT costo_total_2 = precon × cantidad × vcambio_HOY    │
│                                                            │
│ → Usuario ve la deuda ACTUALIZADA                         │
└────────────────────────────────────────────────────────────┘
                             ↓
                    [Usuario CANCELA = COBRA]
                             ↓
┌────────────────────────────────────────────────────────────┐
│ ESTADO: "Cancel-Alta" (Cobrado)                           │
│                                                            │
│ Valores: FIJOS (guardados permanentemente)                │
│                                                            │
│ UPDATE SET                                                 │
│   costo_total_1_fijo = [valor calculado al cancelar],    │
│   costo_total_2_fijo = [valor calculado al cancelar],    │
│   vcambio_fijo = [vcambio del día de cancelación],       │
│   fecha_cancelacion = CURRENT_DATE                         │
│                                                            │
│ → Usuario ve el monto EXACTO cobrado (histórico)          │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Flujo de Usuario: Cancelación con Selección Múltiple

```
┌──────────────────────────────────────────────────────────┐
│ PASO 1: Usuario ve lista de altas pendientes de cobro   │
│                                                          │
│  ☐ Alta #101 | 10 unid | $26,025 | ALTA | Dinámico    │
│  ☐ Alta #102 | 5 unid  | $8,500  | ALTA | Dinámico    │
│  ☐ Alta #103 | 20 unid | $52,050 | ALTA | Dinámico    │
│                                                          │
│  [Cancelar Seleccionados] (= Marcar como cobrado)       │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ PASO 2: Usuario selecciona altas a cobrar               │
│                                                          │
│  ☑ Alta #101 | 10 unid | $26,025 | ALTA              │
│  ☐ Alta #102 | 5 unid  | $8,500  | ALTA              │
│  ☑ Alta #103 | 20 unid | $52,050 | ALTA              │
│                                                          │
│  [Cancelar Seleccionados] ← CLICK                       │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ PASO 3: Sistema muestra confirmación de cobro           │
│                                                          │
│  ⚠️ ¿Confirmar cancelación (cobro) de 2 altas?          │
│                                                          │
│  Los valores se fijarán con el tipo de cambio de HOY.   │
│  Este será el registro histórico del cobro realizado.   │
│                                                          │
│  Totales a cobrar (al vcambio $1,735):                  │
│  - Costo Total 1: $78,075.00                            │
│  - Costo Total 2: $152,050.00                           │
│                                                          │
│  Ingrese motivo de cancelación:                         │
│  [Cobro realizado____________________]                  │
│                                                          │
│  [Volver]  [Confirmar Cancelación]  ← CLICK             │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ PASO 4: Sistema fija valores y cancela registros        │
│                                                          │
│  UPDATE pedidoitem SET                                   │
│    estado = 'Cancel-Alta',                              │
│    costo_total_1_fijo = 26025.00,                       │
│    costo_total_2_fijo = 52050.00,                       │
│    vcambio_fijo = 1735.00,                              │
│    fecha_cancelacion = '2025-11-04',                    │
│    usuario_cancelacion = 'usuario@example.com',         │
│    motivo_cancelacion = 'Cobro realizado'               │
│  WHERE id_items = 101;                                   │
│                                                          │
│  (Repite para id_items = 103)                           │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ PASO 5: Usuario ve registros cancelados (cobrados)      │
│                                                          │
│  🔒 Alta #101 | $26,025 | Cancel-Alta | FIJO 2025-11-04│
│  ☐  Alta #102 | $8,500  | ALTA | Dinámico              │
│  🔒 Alta #103 | $52,050 | Cancel-Alta | FIJO 2025-11-04│
│                                                          │
│  Los valores fijados (🔒) representan el cobro real     │
└──────────────────────────────────────────────────────────┘
```

---

## 5. ANÁLISIS DE BASE DE DATOS

### 5.1 Campos Existentes en `pedidoitem`

```sql
-- CAMPOS YA EXISTENTES (no requieren migración)
motivo_cancelacion     TEXT         ✅ Ya existe
fecha_cancelacion      DATE         ✅ Ya existe
usuario_cancelacion    CHARACTER    ✅ Ya existe
estado                 CHARACTER    ✅ Ya existe ('ALTA', 'Cancel-Alta')
```

### 5.2 Campos NUEVOS a Agregar

```sql
-- CAMPOS FALTANTES (requieren migración)
costo_total_1_fijo     NUMERIC(12, 2)  ❌ No existe - NECESARIO
costo_total_2_fijo     NUMERIC(12, 2)  ❌ No existe - NECESARIO
vcambio_fijo           NUMERIC(10, 4)  ❌ No existe - NECESARIO
```

### 5.3 Script de Migración

```sql
-- ============================================================
-- MIGRACIÓN: Agregar campos de fijación de valores al cancelar
-- Fecha: 2025-11-04
-- Descripción: Permite guardar valores históricos de cobros
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

-- 5. Verificar migración
SELECT
    COUNT(*) as total_registros,
    COUNT(CASE WHEN estado = 'ALTA' THEN 1 END) as pendientes_cobro,
    COUNT(CASE WHEN estado = 'Cancel-Alta' THEN 1 END) as cobrados,
    COUNT(CASE WHEN costo_total_1_fijo IS NOT NULL THEN 1 END) as con_valores_fijos
FROM pedidoitem;

COMMIT;

-- ============================================================
-- ROLLBACK en caso de error:
--
-- BEGIN;
-- ALTER TABLE pedidoitem DROP COLUMN costo_total_1_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN costo_total_2_fijo;
-- ALTER TABLE pedidoitem DROP COLUMN vcambio_fijo;
-- DROP INDEX IF EXISTS idx_pedidoitem_estado_cancelacion;
-- COMMIT;
-- ============================================================
```

---

## 6. PLAN DE IMPLEMENTACIÓN

### 6.1 FASE 1: Backend - Actualizar Endpoint de Consulta

**Archivo**: `src/Descarga.php.txt`

**Método**: `ObtenerAltasConCostos_get()`

```sql
SELECT
    -- Datos básicos
    pi.id_items,
    pi.id_num,
    pi.cantidad,
    TRIM(pi.estado) as estado,
    art.precostosi,
    art.precon,
    art.tipo_moneda,

    -- ⭐ NUEVO: Lógica dual (dinámico vs fijo)

    -- Si estado = 'Cancel-Alta' → usar valores FIJOS
    -- Si estado = 'ALTA' → calcular DINÁMICAMENTE

    CASE
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.vcambio_fijo
        ELSE (
            SELECT vcambio
            FROM valorcambio
            WHERE codmone = COALESCE(art.tipo_moneda, 1)
              AND CURRENT_DATE BETWEEN fecdesde AND fechasta
            ORDER BY fecdesde DESC
            LIMIT 1
        )
    END as vcambio,

    CASE
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_1_fijo
        ELSE (
            COALESCE(art.precostosi, 0) * pi.cantidad * (
                SELECT vcambio
                FROM valorcambio
                WHERE codmone = COALESCE(art.tipo_moneda, 1)
                  AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                ORDER BY fecdesde DESC
                LIMIT 1
            )
        )
    END as costo_total_1,

    CASE
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_2_fijo
        ELSE (
            COALESCE(art.precon, 0) * pi.cantidad * (
                SELECT vcambio
                FROM valorcambio
                WHERE codmone = COALESCE(art.tipo_moneda, 1)
                  AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                ORDER BY fecdesde DESC
                LIMIT 1
            )
        )
    END as costo_total_2,

    -- Indicador de tipo de valor
    CASE
        WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN 'FIJO'
        ELSE 'DINAMICO'
    END as tipo_valor,

    -- Datos de cancelación
    pi.fecha_cancelacion,
    pi.usuario_cancelacion,
    pi.motivo_cancelacion

FROM pedidoitem pi
INNER JOIN artsucursal art ON pi.id_art = art.id_articulo
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
ORDER BY
    CASE WHEN TRIM(pi.estado) = 'ALTA' THEN 0 ELSE 1 END,
    pi.fecha_resuelto DESC;
```

### 6.2 FASE 2: Backend - Actualizar Endpoint de Cancelación

**Archivo**: `src/Carga.php.txt`

**Método**: `CancelarAltasExistencias_post()`

```php
/**
 * Cancelar Altas de Existencias (Marcar como Cobrado)
 *
 * Cancela una o varias altas, fijando los valores calculados
 * con el tipo de cambio vigente al momento de la cancelación.
 *
 * @method POST
 * @param array id_items - Array de IDs de altas a cancelar
 * @param string motivo - Motivo de la cancelación
 * @param string usuario - Email del usuario que cancela
 * @return JSON - Resultado de la operación
 */
public function CancelarAltasExistencias_post() {
    try {
        // 1. Obtener datos del request
        $input = json_decode(file_get_contents('php://input'), true);

        $id_items = $input['id_items'] ?? [];
        $motivo = $input['motivo'] ?? 'Cobro realizado';
        $usuario = $input['usuario'] ?? 'sistema';

        if (empty($id_items)) {
            $this->response([
                "error" => true,
                "mensaje" => "Debe proporcionar al menos un ID de alta"
            ], REST_Controller::HTTP_BAD_REQUEST);
            return;
        }

        // 2. Iniciar transacción
        $this->db->trans_begin();

        $canceladas = 0;
        $fallidas = 0;
        $total_costo_1 = 0;
        $total_costo_2 = 0;
        $errores = [];

        foreach ($id_items as $id_item) {
            try {
                // 3. Verificar que existe y está en estado ALTA
                $sql_check = "
                    SELECT id_items, id_art, cantidad, estado
                    FROM pedidoitem
                    WHERE id_items = ?
                ";

                $query = $this->db->query($sql_check, [$id_item]);

                if ($query->num_rows() === 0) {
                    $errores[] = "Alta #$id_item no encontrada";
                    $fallidas++;
                    continue;
                }

                $registro = $query->row_array();

                if (trim($registro['estado']) !== 'ALTA') {
                    $errores[] = "Alta #$id_item no está en estado ALTA";
                    $fallidas++;
                    continue;
                }

                // 4. Calcular valores con vcambio ACTUAL (del día de la cancelación)
                $sql_calculos = "
                    SELECT
                        art.precostosi,
                        art.precon,
                        art.tipo_moneda,

                        -- Valor de cambio VIGENTE HOY (día del cobro)
                        (
                            SELECT vcambio
                            FROM valorcambio
                            WHERE codmone = COALESCE(art.tipo_moneda, 1)
                              AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                            ORDER BY fecdesde DESC
                            LIMIT 1
                        ) as vcambio_vigente,

                        -- Costo Total 1 (al vcambio de HOY)
                        (
                            COALESCE(art.precostosi, 0) * ? * COALESCE((
                                SELECT vcambio
                                FROM valorcambio
                                WHERE codmone = COALESCE(art.tipo_moneda, 1)
                                  AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                                ORDER BY fecdesde DESC
                                LIMIT 1
                            ), 1.0)
                        ) as costo_total_1_calc,

                        -- Costo Total 2 (al vcambio de HOY)
                        (
                            COALESCE(art.precon, 0) * ? * COALESCE((
                                SELECT vcambio
                                FROM valorcambio
                                WHERE codmone = COALESCE(art.tipo_moneda, 1)
                                  AND CURRENT_DATE BETWEEN fecdesde AND fechasta
                                ORDER BY fecdesde DESC
                                LIMIT 1
                            ), 1.0)
                        ) as costo_total_2_calc

                    FROM artsucursal art
                    WHERE art.id_articulo = ?
                ";

                $cantidad = $registro['cantidad'];
                $id_art = $registro['id_art'];

                $query_calc = $this->db->query($sql_calculos, [$cantidad, $cantidad, $id_art]);

                if ($query_calc->num_rows() === 0) {
                    $errores[] = "Artículo no encontrado para alta #$id_item";
                    $fallidas++;
                    continue;
                }

                $calculos = $query_calc->row_array();

                // 5. Cancelar y fijar valores
                $sql_update = "
                    UPDATE pedidoitem
                    SET
                        estado = 'Cancel-Alta',
                        costo_total_1_fijo = ?,
                        costo_total_2_fijo = ?,
                        vcambio_fijo = ?,
                        fecha_cancelacion = CURRENT_DATE,
                        usuario_cancelacion = ?,
                        motivo_cancelacion = ?
                    WHERE id_items = ?
                ";

                $this->db->query($sql_update, [
                    $calculos['costo_total_1_calc'],
                    $calculos['costo_total_2_calc'],
                    $calculos['vcambio_vigente'] ?? 1.0,
                    $usuario,
                    $motivo,
                    $id_item
                ]);

                $canceladas++;
                $total_costo_1 += $calculos['costo_total_1_calc'];
                $total_costo_2 += $calculos['costo_total_2_calc'];

                // 6. Log de auditoría
                log_message('info', "✅ Alta #$id_item cancelada (cobrada): C1={$calculos['costo_total_1_calc']}, C2={$calculos['costo_total_2_calc']}, VC={$calculos['vcambio_vigente']} por {$usuario}");

            } catch (Exception $e) {
                $errores[] = "Error al cancelar alta #$id_item: " . $e->getMessage();
                $fallidas++;
                log_message('error', "❌ Error cancelando alta #$id_item: " . $e->getMessage());
            }
        }

        // 7. Confirmar transacción
        if ($this->db->trans_status() === FALSE || $canceladas === 0) {
            $this->db->trans_rollback();

            $this->response([
                "error" => true,
                "mensaje" => "No se pudo cancelar ninguna alta",
                "errores" => $errores
            ], REST_Controller::HTTP_INTERNAL_SERVER_ERROR);
            return;
        }

        $this->db->trans_commit();

        // 8. Respuesta exitosa
        $this->response([
            "error" => false,
            "mensaje" => "$canceladas alta(s) cancelada(s) correctamente",
            "detalles" => [
                "canceladas" => $canceladas,
                "fallidas" => $fallidas,
                "total_costo_1" => round($total_costo_1, 2),
                "total_costo_2" => round($total_costo_2, 2),
                "errores" => $errores
            ]
        ], REST_Controller::HTTP_OK);

    } catch (Exception $e) {
        $this->db->trans_rollback();

        log_message('error', "❌ Error crítico en CancelarAltasExistencias: " . $e->getMessage());

        $this->response([
            "error" => true,
            "mensaje" => "Error al cancelar altas: " . $e->getMessage()
        ], REST_Controller::HTTP_INTERNAL_SERVER_ERROR);
    }
}
```

### 6.3 FASE 3: Frontend - Actualizar Componente TypeScript

**Archivo**: `src/app/components/lista-altas/lista-altas.component.ts`

```typescript
// Interfaz actualizada
interface AltaExistencia {
  id_items: number;
  cantidad: number;
  estado: string;

  // Costos
  costo_total_1?: number;
  costo_total_2?: number;
  vcambio?: number;

  // ⭐ NUEVO: Indicador de tipo de valor
  tipo_valor?: string; // 'FIJO' o 'DINAMICO'

  // Cancelación
  fecha_cancelacion?: string;
  usuario_cancelacion?: string;
  motivo_cancelacion?: string;

  // Control de selección
  seleccionado?: boolean;
}

// Método para cancelar altas seleccionadas
confirmarCancelacion(): void {
  if (!this.hayAltasSeleccionadas()) {
    Swal.fire({
      title: 'Sin Selección',
      text: 'Debe seleccionar al menos una alta para cancelar',
      icon: 'warning',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // Calcular totales de las altas a cancelar
  const altasACancelar = this.altasFiltradas.filter(a => a.seleccionado === true);
  const totalCosto1 = altasACancelar.reduce((sum, a) => sum + (a.costo_total_1 || 0), 0);
  const totalCosto2 = altasACancelar.reduce((sum, a) => sum + (a.costo_total_2 || 0), 0);

  // Mostrar confirmación con entrada de motivo
  Swal.fire({
    title: '¿Confirmar Cancelación (Cobro)?',
    html: `
      <div class="text-left">
        <p><strong>Está por cancelar ${altasACancelar.length} alta(s).</strong></p>
        <p class="text-info">
          ℹ️ Los valores se fijarán con el tipo de cambio de <strong>HOY</strong>.
          Esto registrará el monto exacto cobrado.
        </p>
        <hr>
        <p><strong>Totales a cobrar:</strong></p>
        <ul>
          <li><strong>Costo Total 1:</strong> ${this.formatearMoneda(totalCosto1)}</li>
          <li><strong>Costo Total 2:</strong> ${this.formatearMoneda(totalCosto2)}</li>
          <li><strong>Tipo de cambio HOY:</strong> ${this.formatearMoneda(altasACancelar[0]?.vcambio || 0)}</li>
        </ul>
        <hr>
        <p><strong>Motivo de cancelación:</strong></p>
      </div>
    `,
    input: 'text',
    inputValue: 'Cobro realizado',
    inputPlaceholder: 'Ej: Cobro realizado, Pago recibido, etc.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '✅ Confirmar Cancelación',
    cancelButtonText: '❌ Volver',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    width: '600px',
    preConfirm: (motivo) => {
      if (!motivo || motivo.trim() === '') {
        Swal.showValidationMessage('Debe ingresar un motivo de cancelación');
        return false;
      }
      return motivo;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      this.cancelarAltasSeleccionadas(result.value);
    }
  });
}

// Método para ejecutar cancelación
cancelarAltasSeleccionadas(motivo: string): void {
  this.cancelando = true;

  const usuario = this._auth.getEmailAuth() || 'sistema';

  this._cargardata.cancelarAltasExistencias(this.altasSeleccionadas, motivo, usuario)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('Respuesta cancelación:', response);
        this.cancelando = false;

        if (response.error) {
          Swal.fire({
            title: 'Error',
            html: `
              <p>${response.mensaje}</p>
              ${response.errores && response.errores.length > 0 ?
                '<ul>' + response.errores.map((e: string) => '<li>' + e + '</li>').join('') + '</ul>'
                : ''}
            `,
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        } else {
          Swal.fire({
            title: '✅ Cancelación Exitosa',
            html: `
              <p><strong>${response.mensaje}</strong></p>
              <hr>
              <p><strong>Resumen del cobro:</strong></p>
              <ul>
                <li>Canceladas: <strong class="text-success">${response.detalles.canceladas}</strong></li>
                <li>Fallidas: <strong class="text-danger">${response.detalles.fallidas}</strong></li>
                <li>Costo Total 1: <strong>${this.formatearMoneda(response.detalles.total_costo_1)}</strong></li>
                <li>Costo Total 2: <strong>${this.formatearMoneda(response.detalles.total_costo_2)}</strong></li>
              </ul>
              ${response.detalles.errores && response.detalles.errores.length > 0 ?
                '<hr><p class="text-warning"><strong>Advertencias:</strong></p><ul>' +
                response.detalles.errores.map((e: string) => '<li>' + e + '</li>').join('') +
                '</ul>'
                : ''}
              <hr>
              <p class="text-info">Los valores han sido fijados como registro histórico del cobro.</p>
            `,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            // Recargar lista
            this.cargarAltas();

            // Limpiar selección
            this.altasSeleccionadas = [];
            this.todasSeleccionadas = false;
          });
        }
      },
      error: (error) => {
        console.error('Error al cancelar altas:', error);
        this.cancelando = false;

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

### 6.4 FASE 4: Frontend - Actualizar Template HTML

**Archivo**: `src/app/components/lista-altas/lista-altas.component.html`

```html
<!-- Barra de acciones -->
<div class="row mb-3" *ngIf="!cargando && altasFiltradas.length > 0">
  <div class="col-md-12">
    <div class="card border-danger">
      <div class="card-body py-2">
        <div class="row align-items-center">
          <div class="col-md-6">
            <span class="text-muted">
              <strong>{{ altasSeleccionadas.length }}</strong> alta(s) seleccionada(s) para cancelar
            </span>
          </div>
          <div class="col-md-6 text-end">
            <button
              type="button"
              class="btn btn-danger btn-sm"
              (click)="confirmarCancelacion()"
              [disabled]="!hayAltasSeleccionadas() || cancelando"
              title="Cancelar altas seleccionadas (marcar como cobrado)">
              <i class="fa fa-times me-1"></i>
              <span *ngIf="!cancelando">Cancelar Seleccionados</span>
              <span *ngIf="cancelando">
                <i class="fa fa-spinner fa-spin"></i> Cancelando...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Tabla de altas -->
<div class="table-responsive" *ngIf="!cargando && altasFiltradas.length > 0">
  <table class="table table-striped table-hover table-sm">
    <thead class="table-dark">
      <tr>
        <!-- Columna de selección -->
        <th class="text-center" style="width: 50px;">
          <input
            type="checkbox"
            [checked]="todasSeleccionadas"
            (change)="toggleSeleccionarTodas()"
            title="Seleccionar todas las altas NO canceladas"
          />
        </th>

        <!-- Columna de tipo de valor -->
        <th class="text-center" style="width: 100px;">Tipo Valor</th>

        <th>ID</th>
        <th>Estado</th>
        <th>Fecha</th>
        <th>Producto</th>
        <th class="text-end">Cantidad</th>
        <th class="text-end">Costo Total 1<br><small>(Precio Costo)</small></th>
        <th class="text-end">Costo Total 2<br><small>(Precio Venta)</small></th>
        <th class="text-center">Valor Cambio</th>
        <th>Fecha Cancelación</th>
        <th>Usuario Cancelación</th>
        <th>Motivo</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let alta of altasFiltradas"
          [class.table-success]="alta.estado?.trim() === 'ALTA'"
          [class.table-secondary]="alta.estado?.trim() === 'Cancel-Alta'">

        <!-- Checkbox -->
        <td class="text-center">
          <input
            type="checkbox"
            [checked]="alta.seleccionado"
            [disabled]="alta.estado?.trim() !== 'ALTA'"
            (change)="toggleSeleccion(alta)"
            [title]="alta.estado?.trim() === 'ALTA' ? 'Seleccionar para cancelar' : 'Ya está cancelado'"
          />
        </td>

        <!-- Tipo de valor -->
        <td class="text-center">
          <span
            class="badge"
            [class.badge-warning]="alta.tipo_valor === 'DINAMICO'"
            [class.badge-success]="alta.tipo_valor === 'FIJO'"
            [title]="alta.tipo_valor === 'DINAMICO' ?
                      'Valor dinámico - Se actualiza con el tipo de cambio actual' :
                      'Valor fijo - Registro histórico del cobro'">
            <i [class.fa-sync-alt]="alta.tipo_valor === 'DINAMICO'"
               [class.fa-lock]="alta.tipo_valor === 'FIJO'"
               class="fa"></i>
            {{ alta.tipo_valor === 'DINAMICO' ? 'DINÁMICO' : 'FIJO' }}
          </span>
        </td>

        <td>{{ alta.id_num }}</td>
        <td>
          <span class="badge"
              [class.badge-success]="alta.estado?.trim() === 'ALTA'"
              [class.badge-secondary]="alta.estado?.trim() === 'Cancel-Alta'">
            {{ alta.estado }}
          </span>
        </td>
        <td>{{ alta.fecha_resuelto || alta.fecha || 'N/A' }}</td>
        <td>
          <div class="text-truncate" style="max-width: 200px;" [title]="alta.descripcion">
            {{ alta.descripcion }}
          </div>
          <small class="text-muted">ID: {{ alta.id_art }}</small>
        </td>
        <td class="text-end">
          <strong>{{ alta.cantidad }}</strong>
        </td>

        <!-- Costo Total 1 -->
        <td class="text-end">
          <strong>{{ formatearMoneda(alta.costo_total_1) }}</strong>
          <br>
          <small class="text-muted">
            {{ formatearMoneda(alta.precostosi) }} × {{ alta.cantidad }}
          </small>
          <br *ngIf="alta.tipo_valor === 'FIJO'">
          <small class="text-success" *ngIf="alta.tipo_valor === 'FIJO'">
            <i class="fa fa-lock"></i> Cobrado
          </small>
        </td>

        <!-- Costo Total 2 -->
        <td class="text-end">
          <strong>{{ formatearMoneda(alta.costo_total_2) }}</strong>
          <br>
          <small class="text-muted">
            {{ formatearMoneda(alta.precon) }} × {{ alta.cantidad }}
          </small>
          <br *ngIf="alta.tipo_valor === 'FIJO'">
          <small class="text-success" *ngIf="alta.tipo_valor === 'FIJO'">
            <i class="fa fa-lock"></i> Cobrado
          </small>
        </td>

        <!-- Valor Cambio -->
        <td class="text-center">
          <span
            class="badge"
            [class.badge-warning]="alta.tipo_valor === 'DINAMICO'"
            [class.badge-success]="alta.tipo_valor === 'FIJO'"
            [title]="alta.tipo_valor === 'DINAMICO' ?
                      'Tipo de cambio actual (se actualiza diariamente)' :
                      'Tipo de cambio al momento del cobro'">
            {{ formatearMoneda(alta.vcambio || 1) }}
          </span>
        </td>

        <td>{{ alta.fecha_cancelacion || '-' }}</td>
        <td>
          <small>{{ alta.usuario_cancelacion || '-' }}</small>
        </td>
        <td>
          <small>{{ alta.motivo_cancelacion || '-' }}</small>
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
              (click)="alta.seleccionado = true; actualizarAltasSeleccionadas(); confirmarCancelacion()"
              [disabled]="cancelando || alta.estado?.trim() !== 'ALTA'"
              *ngIf="alta.estado?.trim() === 'ALTA'"
              title="Cancelar alta (marcar como cobrado)">
              <i class="fa fa-times"></i>
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 7. CASOS DE USO

### 7.1 Caso de Uso 1: Alta Pendiente de Cobro (Valor Dinámico)

```
DADO: Alta #101 creada el 01/11
      - Artículo: Cable velocímetro
      - precostosi: $1.50 USD
      - cantidad: 10 unidades
      - tipo_moneda: 2 (Dólar)
      - estado: "ALTA" (NO cobrado aún)

CUANDO: Usuario consulta el 15/11

ENTONCES:
  Sistema obtiene vcambio vigente el 15/11: $1,850.00

  Sistema calcula DINÁMICAMENTE:
  - costo_total_1 = 1.50 × 10 × 1850 = $27,750.00
  - costo_total_2 = 3.00 × 10 × 1850 = $55,500.00

  Sistema muestra:
  - Costo Total 1: $27,750.00 ⚠️ DINÁMICO
  - Costo Total 2: $55,500.00 ⚠️ DINÁMICO
  - Valor Cambio: $1,850.00 (actual)
  - Tipo Valor: DINÁMICO

  Interpretación: "Se debe cobrar $27,750 si se cobra HOY"
```

### 7.2 Caso de Uso 2: Cancelación de Alta (Cobro)

```
DADO: Alta #101 en estado "ALTA"
      - vcambio vigente HOY (30/11): $1,900.00
      - Valores actuales (dinámicos):
        • costo_total_1: $28,500.00
        • costo_total_2: $57,000.00

CUANDO: Usuario selecciona Alta #101 y hace clic en "Cancelar Seleccionados"
        Ingresa motivo: "Cobro realizado"

ENTONCES:
  Sistema ejecuta:

  UPDATE pedidoitem SET
    estado = 'Cancel-Alta',
    costo_total_1_fijo = 28500.00,      -- ← Valor FIJADO
    costo_total_2_fijo = 57000.00,      -- ← Valor FIJADO
    vcambio_fijo = 1900.00,             -- ← Tipo cambio FIJADO
    fecha_cancelacion = '2025-11-30',
    usuario_cancelacion = 'usuario@example.com',
    motivo_cancelacion = 'Cobro realizado'
  WHERE id_items = 101;

  Sistema muestra mensaje:
  "1 alta cancelada correctamente
   Costo Total 1 cobrado: $28,500.00
   Costo Total 2 cobrado: $57,000.00
   Tipo de cambio: $1,900.00"
```

### 7.3 Caso de Uso 3: Consulta de Alta Cobrada (Valor Fijo)

```
DADO: Alta #101 cancelada el 30/11
      - costo_total_1_fijo: $28,500.00
      - costo_total_2_fijo: $57,000.00
      - vcambio_fijo: $1,900.00
      - estado: "Cancel-Alta"

CUANDO: Usuario consulta el 15/12 (dólar HOY: $2,100.00)

ENTONCES:
  Sistema NO recalcula, usa valores FIJOS:

  Sistema muestra:
  - Costo Total 1: $28,500.00 🔒 FIJO
  - Costo Total 2: $57,000.00 🔒 FIJO
  - Valor Cambio: $1,900.00 (al momento del cobro)
  - Tipo Valor: FIJO
  - Fecha Cancelación: 30/11/2025
  - Motivo: "Cobro realizado"

  Interpretación: "Se cobró $28,500 el 30/11"

  ⚠️ IMPORTANTE: Aunque el dólar HOY sea $2,100,
     el sistema muestra $1,900 porque ESE fue
     el valor al que se cobró.
```

### 7.4 Caso de Uso 4: Comparación Dinámico vs Fijo

```
ESCENARIO: Dos altas idénticas, una cobrada y otra pendiente

Alta #101 (COBRADA el 30/11, vcambio $1,900):
  - Costo Total 1: $28,500.00 🔒 FIJO
  - Tipo Valor: FIJO
  - Estado: Cancel-Alta

Alta #102 (PENDIENTE, vcambio HOY $2,100):
  - Costo Total 1: $31,500.00 ⚠️ DINÁMICO
  - Tipo Valor: DINÁMICO
  - Estado: ALTA

Diferencia: $3,000.00

Explicación:
- Alta #101: Se cobró a $1,900 (histórico)
- Alta #102: Se cobrará a $2,100 (si se cobra HOY)
```

---

## 8. ANEXOS TÉCNICOS

### 8.1 Comandos de Verificación de Base de Datos

```sql
-- 1. Verificar campos agregados
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pedidoitem'
  AND column_name IN (
    'costo_total_1_fijo',
    'costo_total_2_fijo',
    'vcambio_fijo'
  )
ORDER BY column_name;

-- 2. Contar registros por estado
SELECT
    estado,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN costo_total_1_fijo IS NOT NULL THEN 1 END) as con_valores_fijos
FROM pedidoitem
GROUP BY estado;

-- 3. Ver ejemplos de valores dinámicos vs fijos
SELECT
    id_items,
    estado,
    cantidad,

    -- Valores fijos (solo para Cancel-Alta)
    costo_total_1_fijo,
    costo_total_2_fijo,
    vcambio_fijo,

    -- Metadatos de cancelación
    fecha_cancelacion,
    motivo_cancelacion

FROM pedidoitem
WHERE estado IN ('ALTA', 'Cancel-Alta')
ORDER BY
    CASE WHEN estado = 'ALTA' THEN 0 ELSE 1 END,
    fecha_resuelto DESC
LIMIT 10;
```

### 8.2 Preguntas Frecuentes (FAQ)

**P1: ¿Por qué los valores cambian cada día si no se ha cobrado?**

**R**: Esto es CORRECTO y DESEADO. Los valores dinámicos reflejan la deuda pendiente actualizada al tipo de cambio actual. Esto permite que:
- El proveedor sepa cuánto debe cobrar HOY
- El cliente pueda elegir cuándo pagar según le convenga
- Ambas partes vean el valor justo según el mercado actual

**P2: ¿Cuándo se fijan los valores?**

**R**: Los valores se fijan AUTOMÁTICAMENTE cuando se CANCELA el registro (cuando se cobra/paga). El sistema guarda:
- El monto exacto cobrado (Costo Total 1 y 2)
- El tipo de cambio al que se cobró
- La fecha y el usuario que realizó el cobro
- El motivo de la cancelación

**P3: ¿Puedo "descancelar" un registro?**

**R**: En la versión actual (V2.0), NO. Una vez cancelado (cobrado), el registro queda como histórico permanente. Si se canceló por error, se debe:
1. Crear un nuevo alta manual con los valores correctos
2. Documentar el error en observaciones

**P4: ¿Los totales incluyen altas canceladas?**

**R**: Depende del filtro. Por defecto:
- "Pendientes": Solo muestra estado "ALTA" (NO cobradas)
- "Todas": Muestra "ALTA" y "Cancel-Alta"
- "Canceladas": Solo muestra "Cancel-Alta" (cobradas)

**P5: ¿Qué pasa con las altas existentes al implementar V2.0?**

**R**:
- Todas las altas existentes en estado "ALTA" → siguen siendo DINÁMICAS (correcto)
- Todas las altas existentes en estado "Cancel-Alta" → NO tienen valores fijos (los campos son NULL)
  - Esto es un problema si se cancelaron antes de V2.0
  - Solución: Se pueden recalcular manualmente con un script de migración de datos

---

## 9. CRONOGRAMA ESTIMADO

| Fase | Tarea | Tiempo | Responsable |
|------|-------|--------|-------------|
| 1 | Migración de Base de Datos | 30 min | DBA |
| 2 | Backend - Actualizar Consulta | 1 hora | Backend Dev |
| 3 | Backend - Actualizar Cancelación | 2 horas | Backend Dev |
| 4 | Frontend - Componente TS | 2 horas | Frontend Dev |
| 5 | Frontend - Template HTML | 1.5 horas | Frontend Dev |
| 6 | Testing Integral | 2 horas | QA |
| 7 | Documentación | 1 hora | Tech Writer |

**TOTAL ESTIMADO**: **10 horas de desarrollo**

---

## 10. HALLAZGOS DEL RELEVAMIENTO DE IMPACTO

**Fecha de Relevamiento**: 2025-11-05
**Ver Informe Completo**: `INFORME_RELEVAMIENTO_IMPACTO.md`

### 10.1 Resumen del Relevamiento

Se realizó un análisis exhaustivo del impacto de agregar las nuevas columnas a la tabla `pedidoitem` antes de ejecutar la migración. El relevamiento incluyó:

1. ✅ Análisis del schema actual de la tabla `pedidoitem`
2. ✅ Verificación de datos existentes en la base de datos
3. ✅ Revisión de todos los endpoints backend que usan `pedidoitem`
4. ✅ Análisis de componentes frontend que consumen estos datos
5. ✅ Identificación de dependencias y posibles conflictos

### 10.2 Hallazgos Críticos

#### Hallazgo 1: V1.1 NO Implementada ⚠️

**Descubrimiento**:
- El endpoint `ObtenerAltasConCostos_get()` propuesto en `mejora_costos_alta_articulos.md` (V1.1) **NO existe**
- No se ha implementado la funcionalidad de cálculo dinámico de costos

**Implicación**:
- ✅ **OPORTUNIDAD**: Podemos implementar V1.1 + V2.0 juntas en un solo desarrollo
- ✅ **BENEFICIO**: Evitamos doble trabajo y migraciones intermedias
- ✅ **RESULTADO**: Sistema completo desde el inicio

**Decisión**: Implementar ambas versiones juntas en el mismo ciclo de desarrollo

---

#### Hallazgo 2: No Existen Datos Históricos ✅

**Descubrimiento**:
```sql
SELECT estado, COUNT(*) FROM pedidoitem
WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta')
GROUP BY estado;
-- Resultado: [] (SIN REGISTROS)
```

**Implicación**:
- ✅ **CERO RIESGO** de afectar datos históricos
- ✅ **NO REQUIERE** migración de datos existentes
- ✅ **SEGURO** proceder con cambios de schema

**Conclusión**: La funcionalidad de altas de existencias es nueva o nunca se ha usado

---

#### Hallazgo 3: Método de Cancelación Solo Acepta UN Registro ⚠️

**Descubrimiento**:
El método actual `CancelarAltaExistencias_post()` en `Descarga.php`:
- Solo acepta `id_num` (número único)
- No soporta cancelación múltiple
- Revierte stock automáticamente

**Conflicto con V2.0**:
- La propuesta V2.0 requiere "selección múltiple"
- El documento propone cancelar varias altas a la vez

**Solución Adoptada**:
- Modificar el método existente para aceptar tanto `id_num` (número) como `id_nums` (array)
- Mantener backward compatibility
- Si se recibe `id_num`, convertirlo internamente a array de un elemento
- Procesar cancelaciones en bucle con transacción

```php
// Código propuesto
$id_nums = [];
if (isset($data['id_nums']) && is_array($data['id_nums'])) {
    $id_nums = $data['id_nums'];  // Selección múltiple
} elseif (isset($data['id_num'])) {
    $id_nums = [$data['id_num']];  // Cancelación individual (backward compatible)
}
```

---

#### Hallazgo 4: SELECTs con * No Se Verán Afectados ✅

**Análisis**:
Múltiples endpoints usan `SELECT * FROM pedidoitem`

**Impacto de agregar columnas**:
- ✅ PHP con `result_array()` ignora campos desconocidos
- ✅ TypeScript ignora propiedades adicionales en interfaces
- ✅ Las nuevas columnas tendrán valor NULL por defecto

**Conclusión**: Backward compatible, no rompe funcionalidad existente

---

#### Hallazgo 5: Oportunidad de Optimización de Consultas 💡

**Problema Identificado**:
La consulta propuesta repite subconsultas de `valorcambio`:
```sql
SELECT
    (SELECT vcambio FROM valorcambio WHERE ...) as vcambio,
    (SELECT vcambio FROM valorcambio WHERE ...) * cantidad as costo1,
    (SELECT vcambio FROM valorcambio WHERE ...) * cantidad as costo2
```

**Solución Sugerida**:
Usar WITH (CTE) o LATERAL JOIN para calcular una sola vez:
```sql
LEFT JOIN LATERAL (
    SELECT vcambio, desvalor
    FROM valorcambio
    WHERE codmone = art.tipo_moneda
      AND CURRENT_DATE BETWEEN fecdesde AND fechasta
    ORDER BY fecdesde DESC
    LIMIT 1
) vc ON true
```

**Beneficio**: Menos subconsultas, mejor rendimiento

---

### 10.3 Evaluación de Riesgos Actualizada

| Riesgo | Probabilidad | Impacto | Mitigación | Estado |
|--------|--------------|---------|------------|--------|
| Agregar columnas rompe SELECTs | Muy Baja | Bajo | NULL por defecto | ✅ MITIGADO |
| Agregar columnas rompe INSERTs | Muy Baja | Bajo | Columnas opcionales | ✅ MITIGADO |
| Modificar cancelación rompe código | Baja | Medio | Backward compatible | ✅ MITIGADO |
| Datos históricos sin valores fijos | Ninguna | Ninguno | No hay datos históricos | ✅ N/A |
| Rendimiento de subconsultas | Media | Medio | Usar LATERAL JOIN | ⚠️ OPTIMIZAR |

**Evaluación General**: ✅ **RIESGO BAJO** - Seguro proceder

---

### 10.4 Modificaciones al Plan de Implementación

Basado en los hallazgos, se ajusta el plan original:

#### Cambio 1: Implementar V1.1 + V2.0 Juntas

**Original**:
- Fase 1: Implementar V1.1 (cálculo dinámico)
- Fase 2: Implementar V2.0 (fijación de valores)

**Actualizado**:
- Fase Única: Implementar endpoint con lógica dual (dinámico + fijo) desde el inicio

#### Cambio 2: Modificar Método de Cancelación con Backward Compatibility

**Original**:
- Crear nuevo método `CancelarAltasExistenciasMultiple_post()`

**Actualizado**:
- Modificar método existente `CancelarAltaExistencias_post()` para aceptar ambos formatos
- Mantener compatibilidad con código existente

#### Cambio 3: Optimizar Consultas con LATERAL JOIN

**Agregado**:
- Usar LATERAL JOIN en vez de subconsultas repetidas
- Agregar índice optimizado para `valorcambio`

```sql
CREATE INDEX idx_valorcambio_vigencia_optimizado
ON valorcambio(codmone, fecdesde DESC, fechasta);
```

---

### 10.5 Conclusión del Relevamiento

✅ **AUTORIZADO A PROCEDER** con la implementación completa

**Bases de la autorización**:
1. No hay datos históricos que migrar
2. No hay dependencias con el endpoint propuesto (no existe)
3. Los cambios son backward compatible
4. Riesgo evaluado como BAJO
5. Oportunidad identificada de implementar V1.1 + V2.0 juntas

**Ver detalles completos**: `INFORME_RELEVAMIENTO_IMPACTO.md`

---

## 11. CONCLUSIONES

### 11.1 Resumen de la Mejora

Esta propuesta (V2.0) implementa un sistema de **fijación automática de valores al cancelar**, adaptado al caso de negocio real donde:

1. ✅ Las altas representan **deuda pendiente** que se cobra después
2. ✅ Los valores **dinámicos** son correctos mientras NO se cobró
3. ✅ Al **cancelar (cobrar)**, los valores se **fijan** como registro histórico
4. ✅ Los registros cancelados muestran el **monto exacto cobrado**

### 10.2 Beneficios Principales

1. **Valores Dinámicos Útiles**: Las altas pendientes muestran la deuda actualizada
2. **Registro Histórico Preciso**: Las altas cobradas muestran el monto exacto
3. **Auditoría Completa**: Se sabe cuánto se cobró y a qué tipo de cambio
4. **Flexibilidad**: El cliente elige cuándo pagar según le convenga

### 10.3 Próximos Pasos

1. **Aprobar documento**: Revisar y aprobar este informe
2. **Asignar recursos**: Asignar DBA, Backend Dev, Frontend Dev, QA
3. **Ejecutar migración**: Hacer backup y ejecutar script de BD
4. **Desarrollo**: Implementar cambios en backend y frontend
5. **Testing**: Validar todos los escenarios
6. **Despliegue**: Deploy a producción con monitoreo

---

**FIN DEL INFORME**

*Documento listo para revisión y aprobación del equipo de desarrollo.*

---

**Fecha de Generación**: 2025-11-04
**Última Actualización**: 2025-11-05 (Relevamiento de Impacto)
**Autor**: Sistema de Análisis MotoApp
**Versión**: 2.1 (Final con Relevamiento)
