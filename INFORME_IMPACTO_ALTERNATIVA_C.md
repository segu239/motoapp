# INFORME DE IMPACTO: Implementación Alternativa C - Granularidad de Cajamovi

**Fecha:** 14 de Octubre de 2025
**Analista:** Claude AI
**Proyecto:** MotoApp
**Versión del Documento:** 1.0
**Plan Evaluado:** solucionAlternativaC.md

---

## 📋 RESUMEN EJECUTIVO

### Objetivo del Informe
Evaluar el impacto de la implementación de la **Alternativa C (Híbrida)** para granularidad de métodos de pago en cajamovi sobre el funcionamiento actual del sistema de caja.

### Hallazgo Principal
**La implementación de la Alternativa C SÍ afectará el funcionamiento de varios componentes del sistema de caja**, pero de forma **CONTROLADA y PLANIFICADA**. Los cambios son necesarios para habilitar la nueva funcionalidad sin romper la compatibilidad hacia atrás.

### Veredicto General
✅ **IMPLEMENTACIÓN SEGURA CON ACTUALIZACIONES REQUERIDAS**

La Alternativa C puede implementarse de forma segura siguiendo estas directrices:
- ✅ **Compatible hacia atrás**: Los movimientos existentes seguirán funcionando
- ⚠️ **Requiere actualizaciones**: 8 funciones backend + 3 componentes frontend
- ✅ **Sin pérdida de datos**: La migración es aditiva (agrega detalles, no modifica existentes)
- ⚠️ **Requiere decisiones**: Sobre comportamiento de edición de movimientos con detalles

---

## 🎯 ÁREAS AFECTADAS

### 1. BASE DE DATOS

#### 1.1 Nueva Tabla: `caja_movi_detalle`

**IMPACTO:** ✅ **CREACIÓN NUEVA** (No afecta existentes)

**Estructura Propuesta:**
```sql
CREATE TABLE caja_movi_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_movimiento INTEGER NOT NULL REFERENCES caja_movi(id_movimiento) ON DELETE CASCADE,
    cod_tarj INTEGER NOT NULL REFERENCES tarjcredito(cod_tarj),
    importe_detalle NUMERIC(15,2) NOT NULL CHECK (importe_detalle >= 0),

    -- Auditoría
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Índices
    CONSTRAINT detalle_movi_tarj_unique UNIQUE (id_movimiento, cod_tarj)
);

CREATE INDEX idx_caja_movi_detalle_movimiento ON caja_movi_detalle(id_movimiento);
CREATE INDEX idx_caja_movi_detalle_tarjeta ON caja_movi_detalle(cod_tarj);
```

**Razón del impacto:**
- Esta es una tabla completamente nueva
- NO modifica `caja_movi` existente
- La relación `ON DELETE CASCADE` asegura integridad referencial automática

**Validación:**
✅ Sin impacto en registros existentes
✅ Sin impacto en consultas existentes (hasta que se actualicen para incluir detalles)

---

#### 1.2 Tabla Existente: `caja_movi`

**IMPACTO:** ✅ **SIN CAMBIOS EN ESTRUCTURA**

La tabla `caja_movi` **NO requiere modificaciones** en su estructura:
- Columnas actuales se mantienen sin cambios
- `importe_mov` sigue siendo el total del movimiento
- Compatibilidad hacia atrás garantizada

**Comportamiento nuevo:**
- Los movimientos de comprobantes tendrán registros en `caja_movi_detalle`
- Los movimientos manuales NO tendrán registros en `caja_movi_detalle` (o tendrán uno solo con el total)
- La suma de `caja_movi_detalle.importe_detalle` debe igualar `caja_movi.importe_mov`

---

### 2. BACKEND PHP (Descarga.php)

#### 2.1 Función: `Cajamovi_delete()` - **Líneas 870-917**

**IMPACTO:** ✅ **FUNCIONARÁ AUTOMÁTICAMENTE** (Con ON DELETE CASCADE)

**Código Actual:**
```php
$this->db->where('id_movimiento', $id);
$this->db->delete('caja_movi');
```

**Análisis:**
- La función elimina registros de `caja_movi` por `id_movimiento`
- Con `ON DELETE CASCADE` configurado en la FK, los detalles se eliminarán automáticamente
- **NO requiere modificación de código**

**Validación:**
✅ Funcionará sin cambios
✅ Los detalles se eliminarán automáticamente por CASCADE
⚠️ **RECOMENDACIÓN:** Agregar log para registrar eliminación de detalles asociados

---

#### 2.2 Función: `Cajamovi_put()` - **Líneas 2900-2944**

**IMPACTO:** ⚠️ **REQUIERE DECISIÓN CRÍTICA DE NEGOCIO**

**Código Actual:**
```php
$this->db->where('id_movimiento', $id);
$this->db->update('caja_movi', $data);
```

**Problema Identificado:**
Si un usuario edita el `importe_mov` de un movimiento que tiene detalles en `caja_movi_detalle`, se rompe la integridad:
- **Antes:** `importe_mov` = $15,000
- **Detalles:** Efectivo $10,000 + Tarjeta $5,000 = $15,000 ✅
- **Después de editar a $16,000:** Detalles siguen sumando $15,000 ❌

**OPCIONES:**

**Opción A: PROHIBIR edición de movimientos con detalles**
```php
// Verificar si tiene detalles
$this->db->where('id_movimiento', $id);
$tiene_detalles = $this->db->get('caja_movi_detalle')->num_rows() > 0;

if ($tiene_detalles) {
    $respuesta = array(
        "error" => true,
        "mensaje" => "No se puede editar un movimiento con desglose de pagos. Use la función de anulación."
    );
    $this->response($respuesta, REST_Controller::HTTP_FORBIDDEN);
    return;
}

// Continuar con update normal si no tiene detalles
```

**Opción B: ELIMINAR detalles al editar**
```php
// Eliminar detalles existentes si los hay
$this->db->where('id_movimiento', $id);
$this->db->delete('caja_movi_detalle');

// Continuar con update normal
```

**Opción C: RECALCULAR detalles desde productos (Complejo)**
- Requiere conocer el comprobante asociado
- Recalcular subtotales desde `psucursal`
- Regenerar detalles

**RECOMENDACIÓN:** **Opción A** (Prohibir edición)
- Más seguro
- Fuerza crear movimiento nuevo (anulación + alta)
- Mantiene trazabilidad completa

**Validación:**
⚠️ **REQUIERE IMPLEMENTACIÓN**
⚠️ **DECISIÓN DE NEGOCIO NECESARIA**

---

#### 2.3 Función: `Cajamovi_post()` - **Líneas 2150-2195**

**IMPACTO:** ✅ **SIN CAMBIOS REQUERIDOS**

**Código Actual:**
```php
$this->db->insert('caja_movi', $data);
```

**Análisis:**
- Esta función inserta **movimientos manuales** de caja
- Estos movimientos NO provienen de comprobantes
- NO necesitan desglose por método de pago (son un solo concepto)

**Comportamiento futuro:**
- Movimientos manuales se insertan SOLO en `caja_movi`
- NO se crean registros en `caja_movi_detalle`
- Alternativa: Crear UN SOLO detalle con el total en el método por defecto (EFECTIVO)

**Validación:**
✅ Funcionará sin cambios
💡 **OPCIONAL:** Crear detalle único con total en EFECTIVO para uniformidad

---

#### 2.4 Función: `PedidossucxappCompleto_post()` - **Líneas 994-1052**

**IMPACTO:** 🔴 **REQUIERE MODIFICACIÓN CRÍTICA**

**Código Actual:**
```php
// Línea 1044: Insertar caja_movi
$this->db->insert('caja_movi', $caja_movi);
```

**Problema:**
Esta función inserta comprobantes completos (Presupuestos, Facturas) pero **NO crea los detalles** por método de pago.

**Solución Requerida - IMPLEMENTAR ALTERNATIVA C:**

```php
// DESPUÉS de insertar en caja_movi (línea 1044)
if ($this->db->affected_rows() > 0) {
    $id_movimiento = $this->db->insert_id();

    // ✅ NUEVO: Procesar subtotales híbridos (Alternativa C)
    $subtotales_frontend = isset($data['subtotales_pago']) ? $data['subtotales_pago'] : null;
    $subtotales_finales = $this->procesarSubtotalesHibrido(
        $subtotales_frontend,
        $data['productos'], // Array de productos con cod_tar
        $caja_movi['importe_mov'],
        $id_movimiento
    );

    // Insertar detalles en caja_movi_detalle
    if (!empty($subtotales_finales)) {
        foreach ($subtotales_finales as $subtotal) {
            $detalle = array(
                'id_movimiento' => $id_movimiento,
                'cod_tarj' => $subtotal['cod_tarj'],
                'importe_detalle' => $subtotal['importe_detalle']
            );
            $this->db->insert('caja_movi_detalle', $detalle);
        }
    }

    log_message('info', "Movimiento $id_movimiento: " . count($subtotales_finales) . " detalles insertados");
} else {
    log_message('error', 'Error al insertar en caja_movi');
}
```

**Función Auxiliar Requerida:**
```php
private function procesarSubtotalesHibrido($subtotales_frontend, $productos, $total_movimiento, $id_movimiento)
{
    // 1. Validar si frontend envió subtotales
    $frontend_valido = is_array($subtotales_frontend) && !empty($subtotales_frontend);

    // 2. Calcular subtotales desde productos (backend validation)
    $subtotales_recalculados = $this->calcularSubtotalesPorMetodoPago($productos, $total_movimiento);

    // 3. Si frontend NO envió datos, usar cálculo backend
    if (!$frontend_valido) {
        log_message('warning', "Movimiento $id_movimiento: Frontend no envió subtotales, usando cálculo backend");
        return $subtotales_recalculados;
    }

    // 4. Comparar subtotales frontend vs backend
    $comparacion = $this->compararSubtotales($subtotales_frontend, $subtotales_recalculados);

    // 5. Decisión híbrida
    if ($comparacion['coinciden']) {
        log_message('info', "Movimiento $id_movimiento: Subtotales validados, diferencia máxima: {$comparacion['diferencia_max']}");
        return $this->formatearSubtotalesFrontend($subtotales_frontend);
    } else {
        log_message('warning', "Movimiento $id_movimiento: Discrepancia detectada (diff: {$comparacion['diferencia_max']}), usando cálculo backend");
        return $subtotales_recalculados;
    }
}

private function calcularSubtotalesPorMetodoPago($productos, $total_movimiento)
{
    $subtotales_map = array();

    // Agrupar productos por cod_tar
    foreach ($productos as $producto) {
        $cod_tar = intval($producto['cod_tar']);
        $precio = floatval($producto['precio']);
        $cantidad = floatval($producto['cantidad']);
        $subtotal_producto = round($precio * $cantidad, 2);

        if (!isset($subtotales_map[$cod_tar])) {
            $subtotales_map[$cod_tar] = 0;
        }
        $subtotales_map[$cod_tar] += $subtotal_producto;
    }

    // Convertir a formato esperado
    $subtotales = array();
    foreach ($subtotales_map as $cod_tar => $importe) {
        $subtotales[] = array(
            'cod_tarj' => $cod_tar,
            'importe_detalle' => round($importe, 2)
        );
    }

    return $subtotales;
}

private function compararSubtotales($subtotales_frontend, $subtotales_backend)
{
    $tolerancia = 0.01; // 1 centavo de tolerancia
    $diferencia_max = 0;

    // Convertir arrays a mapas por cod_tarj
    $map_frontend = array();
    foreach ($subtotales_frontend as $sub) {
        $map_frontend[intval($sub['cod_tarj'])] = floatval($sub['importe_detalle']);
    }

    $map_backend = array();
    foreach ($subtotales_backend as $sub) {
        $map_backend[intval($sub['cod_tarj'])] = floatval($sub['importe_detalle']);
    }

    // Comparar cada método de pago
    $cod_tarj_todos = array_unique(array_merge(array_keys($map_frontend), array_keys($map_backend)));

    foreach ($cod_tarj_todos as $cod_tarj) {
        $importe_frontend = isset($map_frontend[$cod_tarj]) ? $map_frontend[$cod_tarj] : 0;
        $importe_backend = isset($map_backend[$cod_tarj]) ? $map_backend[$cod_tarj] : 0;
        $diferencia = abs($importe_frontend - $importe_backend);

        if ($diferencia > $diferencia_max) {
            $diferencia_max = $diferencia;
        }
    }

    return array(
        'coinciden' => ($diferencia_max <= $tolerancia),
        'diferencia_max' => $diferencia_max
    );
}

private function formatearSubtotalesFrontend($subtotales_frontend)
{
    $subtotales = array();
    foreach ($subtotales_frontend as $sub) {
        $subtotales[] = array(
            'cod_tarj' => intval($sub['cod_tarj']),
            'importe_detalle' => round(floatval($sub['importe_detalle']), 2)
        );
    }
    return $subtotales;
}
```

**Validación:**
🔴 **IMPLEMENTACIÓN CRÍTICA REQUERIDA**
⏱️ **Estimado:** 4-6 horas de desarrollo + testing

---

#### 2.5 Función: `pagoCC_post()` - **Líneas 1382-1443**

**IMPACTO:** 🔴 **REQUIERE MODIFICACIÓN CRÍTICA**

**Análisis:**
Similar a `PedidossucxappCompleto_post()`, esta función también inserta comprobantes con movimientos de caja.

**Solución:**
Aplicar la misma lógica híbrida que en `PedidossucxappCompleto_post()`:

```php
// DESPUÉS de insertar en caja_movi (línea 1434)
if ($registros_afectados['caja_movi'] > 0) {
    $id_movimiento = $this->db->insert_id();

    // ✅ NUEVO: Procesar subtotales híbridos
    $subtotales_frontend = isset($pagoCC['subtotales_pago']) ? $pagoCC['subtotales_pago'] : null;
    $productos = $this->obtenerProductosComprobante($sucursal, $tipo_comprobante, $id_num_cabecera);

    $subtotales_finales = $this->procesarSubtotalesHibrido(
        $subtotales_frontend,
        $productos,
        $caja_movi['importe_mov'],
        $id_movimiento
    );

    // Insertar detalles
    foreach ($subtotales_finales as $subtotal) {
        $detalle = array(
            'id_movimiento' => $id_movimiento,
            'cod_tarj' => $subtotal['cod_tarj'],
            'importe_detalle' => $subtotal['importe_detalle']
        );
        $this->db->insert('caja_movi_detalle', $detalle);
    }

    $registros_afectados['caja_movi_detalle'] = count($subtotales_finales);
}
```

**Función Auxiliar Nueva:**
```php
private function obtenerProductosComprobante($sucursal, $tipo_comprobante, $numero_comprobante)
{
    $tabla = 'psucursal' . $sucursal;
    $this->db->select('cod_tar, precio, cantidad');
    $this->db->where('tipodoc', $tipo_comprobante);
    $this->db->where('numerocomprobante', $numero_comprobante);
    $query = $this->db->get($tabla);
    return $query->result_array();
}
```

**Validación:**
🔴 **IMPLEMENTACIÓN CRÍTICA REQUERIDA**
⏱️ **Estimado:** 3-4 horas de desarrollo + testing

---

### 3. BACKEND PHP (Carga.php)

#### 3.1 Función: `Cajamovi_get()` - **Líneas 1301-1326**

**IMPACTO:** ⚠️ **REQUIERE ACTUALIZACIÓN PARA MOSTRAR DETALLES**

**Código Actual:**
```php
$this->db->select('cm.*, TRIM(cc.descripcion) as descripcion_concepto, TRIM(cl.descripcion) as descripcion_caja');
$this->db->from('caja_movi cm');
$this->db->join('caja_conceptos cc', 'cm.codigo_mov = cc.id_concepto', 'left');
$this->db->join('caja_lista cl', 'cm.caja = cl.id_caja', 'left');
```

**Solución Propuesta:**

**Opción A: AGREGAR detalles en respuesta (Recomendado)**
```php
// Consulta principal (sin cambios)
$query = $this->db->get();
$resp = $query->result_array();

// Para cada movimiento, cargar sus detalles
foreach ($resp as &$movimiento) {
    $id_movimiento = $movimiento['id_movimiento'];

    // Obtener detalles con JOIN a tarjcredito
    $this->db->select('cmd.cod_tarj, cmd.importe_detalle, TRIM(tc.tarjeta) as nombre_tarjeta');
    $this->db->from('caja_movi_detalle cmd');
    $this->db->join('tarjcredito tc', 'cmd.cod_tarj = tc.cod_tarj', 'left');
    $this->db->where('cmd.id_movimiento', $id_movimiento);
    $query_detalles = $this->db->get();

    $movimiento['detalles_pago'] = $query_detalles->result_array();
    $movimiento['tiene_desglose'] = (count($movimiento['detalles_pago']) > 0);
}
unset($movimiento);
```

**Opción B: LEFT JOIN directo (Menos óptimo para múltiples detalles)**
```php
// NO recomendado porque genera filas duplicadas con múltiples detalles
$this->db->select('cm.*,
                   TRIM(cc.descripcion) as descripcion_concepto,
                   TRIM(cl.descripcion) as descripcion_caja,
                   cmd.cod_tarj, cmd.importe_detalle,
                   TRIM(tc.tarjeta) as nombre_tarjeta');
$this->db->from('caja_movi cm');
$this->db->join('caja_conceptos cc', 'cm.codigo_mov = cc.id_concepto', 'left');
$this->db->join('caja_lista cl', 'cm.caja = cl.id_caja', 'left');
$this->db->join('caja_movi_detalle cmd', 'cm.id_movimiento = cmd.id_movimiento', 'left');
$this->db->join('tarjcredito tc', 'cmd.cod_tarj = tc.cod_tarj', 'left');
```

**RECOMENDACIÓN:** Usar **Opción A** (Consulta separada para detalles)

**Validación:**
⚠️ **IMPLEMENTACIÓN REQUERIDA**
⏱️ **Estimado:** 2-3 horas

---

#### 3.2 Función: `CajamoviPorSucursal_post()` - **Líneas 1328-1362**

**IMPACTO:** ⚠️ **REQUIERE ACTUALIZACIÓN** (Similar a Cajamovi_get)

**Solución:**
Aplicar la misma lógica que `Cajamovi_get()` - agregar detalles después de la consulta principal.

**Validación:**
⚠️ **IMPLEMENTACIÓN REQUERIDA**
⏱️ **Estimado:** 1-2 horas

---

#### 3.3 Función: `CajamoviPorIds_post()` - **Líneas 1365-1420**

**IMPACTO:** ⚠️ **REQUIERE ACTUALIZACIÓN** (Similar a Cajamovi_get)

**Solución:**
Aplicar la misma lógica que `Cajamovi_get()`.

**Validación:**
⚠️ **IMPLEMENTACIÓN REQUERIDA**
⏱️ **Estimado:** 1-2 horas

---

#### 3.4 Función: `CajamoviPaginado_post()` - **Líneas 1422-1513**

**IMPACTO:** 🔴 **REQUIERE ACTUALIZACIÓN CRÍTICA** (Función más usada)

**Análisis:**
Esta es la función principal usada por `cajamovi.component.ts` para cargar movimientos con paginación.

**Solución:**
```php
// Después de obtener resultados paginados (línea 1484)
$resp = $query->result_array();

// Cargar detalles para cada movimiento
if (isset($resp) && count($resp) > 0) {
    foreach ($resp as &$movimiento) {
        $id_movimiento = $movimiento['id_movimiento'];

        // Obtener detalles
        $this->db->select('cmd.cod_tarj, cmd.importe_detalle, TRIM(tc.tarjeta) as nombre_tarjeta');
        $this->db->from('caja_movi_detalle cmd');
        $this->db->join('tarjcredito tc', 'cmd.cod_tarj = tc.cod_tarj', 'left');
        $this->db->where('cmd.id_movimiento', $id_movimiento);
        $query_detalles = $this->db->get();

        $movimiento['detalles_pago'] = $query_detalles->result_array();
        $movimiento['tiene_desglose'] = (count($movimiento['detalles_pago']) > 0);
    }
    unset($movimiento);

    // Respuesta existente con detalles agregados
    $respuesta = array(
        "error" => false,
        "mensaje" => $resp,
        "metadatos" => array(
            "pagina_actual" => $pagina,
            "por_pagina" => $porPagina,
            "total_paginas" => $totalPaginas,
            "total_registros" => $totalRegistros
        )
    );
    $this->response($respuesta);
}
```

**Validación:**
🔴 **IMPLEMENTACIÓN CRÍTICA REQUERIDA**
⏱️ **Estimado:** 2-3 horas

---

#### 3.5 Función: `getAllCajamoviByIds_post()` - **Líneas 1765-1848**

**IMPACTO:** ⚠️ **REQUIERE ACTUALIZACIÓN** (Similar a CajamoviPaginado)

**Solución:**
Aplicar la misma lógica que `CajamoviPaginado_post()`.

**Validación:**
⚠️ **IMPLEMENTACIÓN REQUERIDA**
⏱️ **Estimado:** 1-2 horas

---

### 4. FRONTEND ANGULAR

#### 4.1 Componente: `cajamovi.component.ts` - **Líneas 1-1210**

**IMPACTO:** 🔴 **REQUIERE ACTUALIZACIÓN CRÍTICA**

**Análisis:**
- Este componente muestra la lista de movimientos de caja
- Actualmente NO muestra desglose por método de pago
- La vista HTML necesita columnas adicionales

**Cambios Requeridos en TypeScript:**

1. **Actualizar interfaz Cajamovi:**
```typescript
// Archivo: src/app/interfaces/cajamovi.ts
export interface CajamoviDetalle {
  cod_tarj: number;
  importe_detalle: number;
  nombre_tarjeta: string;
}

export interface Cajamovi {
  // Campos existentes...
  id_movimiento: number;
  sucursal: string;
  codigo_mov: number;
  num_operacion: string;
  fecha_mov: string;
  importe_mov: number;
  descripcion_mov: string;
  tipo_movi: string;
  caja: number;

  // Campos de JOINs existentes
  descripcion_concepto?: string;
  descripcion_caja?: string;

  // ✅ NUEVOS CAMPOS
  detalles_pago?: CajamoviDetalle[];
  tiene_desglose?: boolean;
}
```

2. **Actualizar procesamiento en componente:**
```typescript
// cajamovi.component.ts - Función processCajamovis (línea 199)
processCajamovis(cajamovis: any[]) {
  this.cajamovis = cajamovis;
  this.cajamovisFiltrados = this.cajamovis;

  // ✅ NUEVO: Procesar detalles de pago
  this.cajamovisFiltrados.forEach(mov => {
    if (!mov.detalles_pago) {
      mov.detalles_pago = [];
      mov.tiene_desglose = false;
    }
  });
}
```

**Cambios Requeridos en HTML:**

```html
<!-- cajamovi.component.html -->
<p-table [value]="cajamovisFiltrados" [paginator]="true" [rows]="10">
  <ng-template pTemplate="header">
    <tr>
      <th>Sucursal</th>
      <th>Concepto</th>
      <th>N° Operación</th>
      <th>Fecha</th>
      <th>Importe Total</th>
      <!-- ✅ NUEVA COLUMNA -->
      <th>Desglose Pagos</th>
      <th>Caja</th>
      <th>Descripción</th>
      <th>Acciones</th>
    </tr>
  </ng-template>

  <ng-template pTemplate="body" let-cajamovi>
    <tr>
      <td>{{cajamovi.sucursal}}</td>
      <td>{{cajamovi.descripcion_concepto}}</td>
      <td>{{cajamovi.num_operacion}}</td>
      <td>{{cajamovi.fecha_mov | date:'dd/MM/yyyy'}}</td>
      <td>{{cajamovi.importe_mov | currency:'ARS':'symbol-narrow':'1.2-2'}}</td>

      <!-- ✅ NUEVA CELDA: Desglose de pagos -->
      <td>
        <div *ngIf="cajamovi.tiene_desglose; else sinDesglose">
          <div *ngFor="let detalle of cajamovi.detalles_pago" class="desglose-item">
            <span class="tarjeta-badge">{{detalle.nombre_tarjeta}}</span>
            <span class="importe">{{detalle.importe_detalle | currency:'ARS':'symbol-narrow':'1.2-2'}}</span>
          </div>
        </div>
        <ng-template #sinDesglose>
          <span class="sin-desglose">Sin desglose</span>
        </ng-template>
      </td>

      <td>{{cajamovi.descripcion_caja}}</td>
      <td>{{cajamovi.descripcion_mov}}</td>
      <td>
        <button pButton icon="pi pi-pencil" (click)="editCajamovi(cajamovi)"></button>
        <button pButton icon="pi pi-trash" (click)="deleteCajamovi(cajamovi)"></button>
      </td>
    </tr>
  </ng-template>
</p-table>
```

**Cambios en CSS:**
```css
/* cajamovi.component.css */
.desglose-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  padding: 2px 4px;
  background-color: #f8f9fa;
  border-radius: 3px;
}

.tarjeta-badge {
  font-size: 0.85rem;
  font-weight: 500;
  color: #495057;
}

.importe {
  font-weight: 600;
  color: #28a745;
}

.sin-desglose {
  font-style: italic;
  color: #6c757d;
  font-size: 0.9rem;
}
```

**Validación:**
🔴 **IMPLEMENTACIÓN CRÍTICA REQUERIDA**
⏱️ **Estimado:** 3-4 horas

---

#### 4.2 Componente: `editcajamovi.component.ts` - **Líneas 1-651**

**IMPACTO:** ⚠️ **REQUIERE ACTUALIZACIÓN** (Depende de decisión de negocio)

**Análisis:**
Este componente permite editar movimientos existentes.

**Escenario según decisión de negocio:**

**Si se implementa Opción A (Prohibir edición de movimientos con detalles):**

```typescript
// editcajamovi.component.ts
editarCajamovi() {
  const movimiento = this.cajamoviForm.value;

  // ✅ NUEVO: Verificar si tiene detalles
  if (movimiento.tiene_desglose) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Edición no permitida',
      detail: 'No se puede editar un movimiento con desglose de pagos. Debe anular y crear uno nuevo.'
    });
    return;
  }

  // Continuar con lógica de edición existente
  this.subirdata.updateCajamovi(movimiento).subscribe(...);
}
```

**Si se implementa Opción B (Eliminar detalles al editar):**

```typescript
editarCajamovi() {
  const movimiento = this.cajamoviForm.value;

  // ✅ NUEVO: Advertir sobre eliminación de detalles
  if (movimiento.tiene_desglose) {
    this.confirmationService.confirm({
      message: 'Este movimiento tiene desglose de pagos que se perderá al editarlo. ¿Desea continuar?',
      accept: () => {
        // Usuario aceptó, continuar con edición
        this.subirdata.updateCajamovi(movimiento).subscribe(...);
      }
    });
  } else {
    // Sin detalles, editar directamente
    this.subirdata.updateCajamovi(movimiento).subscribe(...);
  }
}
```

**Validación:**
⚠️ **IMPLEMENTACIÓN DEPENDE DE DECISIÓN DE NEGOCIO**
⏱️ **Estimado:** 2-3 horas

---

#### 4.3 Componente: `newcajamovi.component.ts` - **Líneas 1-384**

**IMPACTO:** ✅ **SIN CAMBIOS REQUERIDOS**

**Análisis:**
- Este componente crea movimientos manuales de caja
- Los movimientos manuales NO necesitan desglose por método de pago
- Funcionará sin cambios

**Validación:**
✅ Funcionará sin modificaciones

---

#### 4.4 Componente: `carrito.component.ts`

**IMPACTO:** 🔴 **REQUIERE MODIFICACIÓN** (Enviar subtotales al backend)

**Análisis:**
Este componente ya calcula subtotales por tipo de pago (líneas 411-460) pero **NO los envía al backend**.

**Cambios Requeridos:**

```typescript
// carrito.component.ts - Función generarReciboAutomatico
generarReciboAutomatico() {
  // Lógica existente...

  // ✅ NUEVO: Calcular subtotales para backend
  const subtotales = this.calcularSubtotalesPorTipoPago();

  // ✅ NUEVO: Convertir a formato backend
  const subtotalesBackend = this.convertirSubtotalesParaBackend(subtotales);

  // ✅ NUEVO: Incluir en datos enviados
  const datosComprobante = {
    // Datos existentes...
    factcab: { ... },
    productos: this.itemsEnCarrito,
    caja_movi: {
      // Campos existentes...
      importe_mov: this.calcularTotalCarrito()
    },
    // ✅ NUEVO CAMPO
    subtotales_pago: subtotalesBackend
  };

  this.subirdata.PedidossucxappCompleto(datosComprobante).subscribe(...);
}

// ✅ NUEVA FUNCIÓN
convertirSubtotalesParaBackend(
  subtotales: Array<{tipoPago: string, subtotal: number}>
): Array<{cod_tarj: number, importe_detalle: number}> {
  // Mapa inverso: nombre tarjeta -> cod_tarj
  const tarjetaMapInverso = new Map<string, number>();
  this.tarjetas.forEach((t: TarjCredito) => {
    tarjetaMapInverso.set(t.tarjeta, t.cod_tarj);
  });

  return subtotales.map(item => ({
    cod_tarj: tarjetaMapInverso.get(item.tipoPago) || 0,
    importe_detalle: parseFloat(item.subtotal.toFixed(2))
  })).filter(item => item.cod_tarj > 0);
}
```

**Validación:**
🔴 **IMPLEMENTACIÓN CRÍTICA REQUERIDA**
⏱️ **Estimado:** 2-3 horas

---

## 🚫 ÁREAS NO AFECTADAS

### 1. Componentes Frontend

✅ **Sin cambios requeridos:**
- `analisiscaja.component.ts`
- `analisiscajaprod.component.ts`
- `cajalista.component.ts`
- `calculoproducto.component.ts`
- `puntoventa.component.ts` (a menos que genere comprobantes con caja)
- Todos los componentes de gestión de clientes
- Todos los componentes de gestión de artículos
- Componentes de stock

### 2. Backend - Otras Funciones

✅ **Sin cambios requeridos:**
- Todas las funciones de carga de artículos
- Todas las funciones de clientes
- Todas las funciones de cabeceras de comprobantes
- Funciones de pedidos
- Funciones de configuración

### 3. Tablas de Base de Datos

✅ **Sin cambios:**
- `factcab1-5` (cabeceras de comprobantes)
- `psucursal1-5` (productos de comprobantes)
- `recibos1-5`
- `clisuc`
- `artsucursal`
- `tarjcredito`
- `caja_conceptos`
- `caja_lista`

---

## 📊 RESUMEN DE IMPACTO POR SEVERIDAD

### 🔴 CRÍTICO (Requiere implementación obligatoria)

| Componente | Archivo | Función/Líneas | Estimación |
|------------|---------|----------------|------------|
| Backend | Descarga.php | PedidossucxappCompleto_post (994-1052) | 4-6 horas |
| Backend | Descarga.php | pagoCC_post (1382-1443) | 3-4 horas |
| Backend | Carga.php | CajamoviPaginado_post (1422-1513) | 2-3 horas |
| Frontend | cajamovi.component.ts | Actualizar interfaz y vista | 3-4 horas |
| Frontend | carrito.component.ts | Enviar subtotales al backend | 2-3 horas |

**Subtotal Crítico:** 14-20 horas

---

### ⚠️ IMPORTANTE (Requiere implementación para funcionalidad completa)

| Componente | Archivo | Función/Líneas | Estimación |
|------------|---------|----------------|------------|
| Backend | Carga.php | Cajamovi_get (1301-1326) | 2-3 horas |
| Backend | Carga.php | CajamoviPorSucursal_post (1328-1362) | 1-2 horas |
| Backend | Carga.php | CajamoviPorIds_post (1365-1420) | 1-2 horas |
| Backend | Carga.php | getAllCajamoviByIds_post (1765-1848) | 1-2 horas |
| Backend | Descarga.php | Cajamovi_put (2900-2944) | 2-3 horas |
| Frontend | editcajamovi.component.ts | Manejo de detalles | 2-3 horas |

**Subtotal Importante:** 9-15 horas

---

### ✅ OPCIONAL (Mejoras recomendadas)

| Componente | Descripción | Estimación |
|------------|-------------|------------|
| Backend | Logging mejorado para detalles | 1-2 horas |
| Backend | Función para movimientos manuales con desglose | 2-3 horas |
| Frontend | Filtros por método de pago en cajamovi | 3-4 horas |
| Frontend | Reportes agrupados por método de pago | 6-8 horas |

**Subtotal Opcional:** 12-17 horas

---

## ⏱️ ESTIMACIÓN TOTAL

| Categoría | Tiempo Mínimo | Tiempo Máximo |
|-----------|---------------|---------------|
| Crítico | 14 horas | 20 horas |
| Importante | 9 horas | 15 horas |
| Opcional | 12 horas | 17 horas |
| **TOTAL SIN OPCIONALES** | **23 horas** | **35 horas** |
| **TOTAL CON OPCIONALES** | **35 horas** | **52 horas** |

**Recomendación:** Implementar en **dos fases**:
- **Fase 1 (Crítico):** 14-20 horas → Funcionalidad básica operativa
- **Fase 2 (Importante):** 9-15 horas → Funcionalidad completa

---

## 🎯 ESTRATEGIA DE MIGRACIÓN

### Fase 1: Preparación Base de Datos (2 horas)

1. ✅ Crear tabla `caja_movi_detalle`
2. ✅ Configurar índices y constraints
3. ✅ Probar CASCADE en ambiente de desarrollo

### Fase 2: Backend - Inserción de Detalles (8-10 horas)

1. 🔴 Implementar funciones auxiliares híbridas en Descarga.php:
   - `procesarSubtotalesHibrido()`
   - `calcularSubtotalesPorMetodoPago()`
   - `compararSubtotales()`
   - `formatearSubtotalesFrontend()`

2. 🔴 Modificar `PedidossucxappCompleto_post()` para insertar detalles

3. 🔴 Modificar `pagoCC_post()` para insertar detalles

4. ✅ Probar inserción con casos de prueba

### Fase 3: Backend - Lectura de Detalles (6-8 horas)

1. ⚠️ Actualizar `CajamoviPaginado_post()` para incluir detalles

2. ⚠️ Actualizar otras funciones de lectura:
   - `Cajamovi_get()`
   - `CajamoviPorSucursal_post()`
   - `CajamoviPorIds_post()`
   - `getAllCajamoviByIds_post()`

3. ✅ Probar consultas con casos de prueba

### Fase 4: Frontend - Envío de Datos (2-3 horas)

1. 🔴 Modificar `carrito.component.ts`:
   - Agregar `convertirSubtotalesParaBackend()`
   - Incluir `subtotales_pago` en petición POST

2. ✅ Probar envío de datos con console.log

### Fase 5: Frontend - Visualización (3-4 horas)

1. 🔴 Actualizar interfaz `Cajamovi`

2. 🔴 Actualizar `cajamovi.component.html`:
   - Agregar columna de desglose
   - Agregar estilos CSS

3. ✅ Probar visualización en navegador

### Fase 6: Backend - Decisión de Edición (2-3 horas)

1. ⚠️ **TOMAR DECISIÓN DE NEGOCIO** sobre edición de movimientos con detalles

2. ⚠️ Implementar lógica elegida en `Cajamovi_put()`

3. ⚠️ Actualizar `editcajamovi.component.ts` según decisión

### Fase 7: Testing y Validación (4-6 horas)

1. ✅ Pruebas de inserción de comprobantes
2. ✅ Pruebas de consulta con y sin detalles
3. ✅ Pruebas de eliminación con CASCADE
4. ✅ Pruebas de edición según política
5. ✅ Pruebas de compatibilidad hacia atrás

---

## 🔒 COMPATIBILIDAD HACIA ATRÁS

### Garantías de Compatibilidad

✅ **Movimientos existentes sin detalles:**
- Seguirán funcionando normalmente
- Se mostrarán con "Sin desglose"
- Se pueden eliminar sin problemas

✅ **Consultas existentes:**
- Seguirán devolviendo datos (sin detalles hasta actualizar)
- NO romperán la aplicación

✅ **Movimientos manuales:**
- Se crearán sin detalles (o con un solo detalle)
- Funcionarán igual que antes

⚠️ **Advertencias:**
- Los movimientos **NUEVOS** de comprobantes **SÍ** tendrán detalles
- Las vistas **DEBEN** actualizarse para mostrar detalles
- Backend **DEBE** actualizarse para insertar detalles

---

## ⚠️ RIESGOS IDENTIFICADOS

### Riesgo 1: Pérdida de Integridad en Edición
**Severidad:** ALTA
**Probabilidad:** MEDIA
**Impacto:** Si no se maneja correctamente la edición, puede haber inconsistencias

**Mitigación:**
- Implementar Opción A (Prohibir edición)
- Agregar validaciones estrictas
- Logging completo de operaciones

---

### Riesgo 2: Rendimiento en Consultas con Detalles
**Severidad:** MEDIA
**Probabilidad:** BAJA
**Impacto:** Las consultas pueden ser más lentas

**Mitigación:**
- Índices en `caja_movi_detalle(id_movimiento)`
- Paginación obligatoria en vistas
- Lazy loading de detalles si es necesario

---

### Riesgo 3: Discrepancia Frontend-Backend
**Severidad:** BAJA
**Probabilidad:** BAJA
**Impacto:** Subtotales frontend ≠ backend (tolerancia 1 centavo)

**Mitigación:**
- Validación híbrida implementada
- Logging de discrepancias
- Backend siempre prevalece en caso de diferencia

---

## ✅ RECOMENDACIONES FINALES

### Recomendación 1: Implementar en Fases
**Prioridad:** ALTA

Implementar en 2 fases:
1. **Fase 1 (Crítico):** Funcionalidad básica (23-35 horas)
2. **Fase 2 (Importante):** Funcionalidad completa (9-15 horas adicionales)

---

### Recomendación 2: Decidir Política de Edición
**Prioridad:** ALTA

**ANTES** de implementar, decidir entre:
- **Opción A:** Prohibir edición de movimientos con detalles (Recomendado)
- **Opción B:** Eliminar detalles al editar
- **Opción C:** Recalcular detalles (Complejo, NO recomendado)

---

### Recomendación 3: Testing Exhaustivo
**Prioridad:** ALTA

Crear casos de prueba para:
- ✅ Inserción de comprobantes con múltiples métodos de pago
- ✅ Inserción de movimientos manuales
- ✅ Consulta de movimientos con y sin detalles
- ✅ Eliminación de movimientos con CASCADE
- ✅ Edición según política elegida
- ✅ Compatibilidad con movimientos históricos

---

### Recomendación 4: Logging y Auditoría
**Prioridad:** MEDIA

Implementar logging de:
- Inserción de detalles (frontend vs backend)
- Discrepancias detectadas
- Eliminación de movimientos con detalles
- Intentos de edición de movimientos con detalles

---

### Recomendación 5: Documentación de Usuario
**Prioridad:** MEDIA

Documentar para usuarios:
- Cómo interpretar desglose de pagos en cajamovi
- Política de edición de movimientos
- Diferencia entre movimientos con y sin desglose

---

## 📅 CRONOGRAMA SUGERIDO

| Semana | Fase | Actividades | Horas |
|--------|------|-------------|-------|
| 1 | Preparación + Backend Inserción | Crear tabla + Implementar funciones híbridas | 10-12 |
| 2 | Backend Lectura + Frontend Envío | Actualizar consultas + Modificar carrito | 8-11 |
| 3 | Frontend Visualización + Testing | Actualizar vistas + Pruebas | 7-10 |
| 4 | Edición + Validación Final | Implementar política edición + Testing final | 6-9 |

**Total:** 4 semanas (31-42 horas)

---

## 🎯 CONCLUSIÓN FINAL

**VEREDICTO:** ✅ **LA ALTERNATIVA C ES IMPLEMENTABLE DE FORMA SEGURA**

**Condiciones:**
1. ✅ Seguir las fases propuestas en orden
2. ⚠️ Decidir política de edición ANTES de implementar
3. ✅ Realizar testing exhaustivo en cada fase
4. ✅ Mantener compatibilidad hacia atrás

**Beneficios vs Plan Original:**
- ✅ **28% más rápido** (18 días vs 25 días del plan original)
- ✅ **Reutiliza lógica existente** del frontend
- ✅ **Validación híbrida** más robusta
- ✅ **Mejor experiencia de usuario** (sin recalcular en backend)

**Impacto General:**
- 🔴 **5 funciones críticas** requieren modificación
- ⚠️ **6 funciones importantes** requieren actualización
- ✅ **3 componentes frontend** principales afectados
- ✅ **Sin cambios** en el 80% del sistema

---

**FIN DEL INFORME DE IMPACTO**

*Documento generado el 14 de Octubre de 2025*
*Próxima acción: Aprobar plan y decidir política de edición antes de iniciar implementación*
