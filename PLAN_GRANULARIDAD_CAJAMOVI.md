# PLAN DE IMPLEMENTACIÓN: Granularidad de Cajamovi por Métodos de Pago

**Fecha:** 13 de Octubre de 2025
**Analista:** Claude AI
**Proyecto:** MotoApp
**Versión del Documento:** 1.0
**Estado:** PROPUESTA PARA REVISIÓN

---

## 📋 RESUMEN EJECUTIVO

### Objetivo
Implementar un sistema de registro granular de movimientos de caja que permita almacenar y visualizar el desglose de cada transacción por método de pago utilizado.

### Problema a Resolver
Actualmente, cuando un comprobante se paga con múltiples métodos (ej: $10,000 efectivo + $5,000 tarjeta), se registra UN SOLO movimiento en `caja_movi` con el total ($15,000), sin desglosar por método de pago.

### Beneficios Esperados
- ✅ Reportes precisos de ingresos por método de pago
- ✅ Auditoría completa de recaudación (efectivo vs tarjetas vs otros)
- ✅ Conciliación bancaria automatizada
- ✅ Análisis financiero detallado por forma de pago
- ✅ Trazabilidad completa de cada transacción

### Estimación de Esfuerzo
- **Esfuerzo Total:** 48-64 horas
- **Complejidad:** MEDIA-ALTA
- **Riesgo:** MEDIO (requiere cambios en DB, backend y frontend)

---

## 🎯 ALCANCE DEL PROYECTO

### Incluido en el Alcance ✅
1. Creación de nueva tabla `caja_movi_detalle` para desglose de pagos
2. Modificación de función PHP de inserción para generar registros granulares
3. Modificación de funciones PHP de consulta para retornar desglose
4. Actualización del componente Angular cajamovi para mostrar granularidad
5. Creación de vistas HTML para visualización del desglose
6. Scripts de migración y rollback
7. Plan de pruebas completo

### Fuera del Alcance ❌
1. Migración de datos históricos (se documenta pero no se implementa)
2. Reportes financieros avanzados (se implementan en fase posterior)
3. Modificación de PDFs (ya funcionan correctamente)
4. Cambios en el proceso de carrito/checkout (ya funciona correctamente)

---

## 🏗️ ARQUITECTURA DE LA SOLUCIÓN

### Opción Seleccionada: Nueva Tabla `caja_movi_detalle`

**Ventajas:**
- ✅ No rompe la estructura existente de `caja_movi`
- ✅ Mantiene compatibilidad hacia atrás
- ✅ Permite relación 1:N (un movimiento → múltiples detalles)
- ✅ Facilita consultas agregadas
- ✅ Auditoria completa sin pérdida de información

**Desventajas:**
- ⚠️ Aumenta la complejidad de consultas (requiere JOINs)
- ⚠️ Requiere sincronización entre ambas tablas

### Diagrama de Arquitectura

```
ANTES (Sistema Actual):
┌──────────────────────────────────┐
│       caja_movi                  │
│  ─────────────────────────────   │
│  id_movimiento: 123              │
│  importe_mov: $15,000 (TOTAL)    │
│  tipo_comprobante: PR            │
│  numero_comprobante: 146         │
└──────────────────────────────────┘

DESPUÉS (Con Granularidad):
┌──────────────────────────────────┐
│       caja_movi                  │
│  ─────────────────────────────   │
│  id_movimiento: 123              │
│  importe_mov: $15,000            │  ← Se mantiene total para compatibilidad
│  tipo_comprobante: PR            │
│  numero_comprobante: 146         │
└──────────────────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────────────────┐
│   caja_movi_detalle (NUEVA)      │
│  ─────────────────────────────   │
│  id_detalle: 1                   │
│  id_movimiento: 123 (FK)         │
│  cod_tarj: 11 (Efectivo)         │
│  importe_detalle: $10,000        │
│  ─────────────────────────────   │
│  id_detalle: 2                   │
│  id_movimiento: 123 (FK)         │
│  cod_tarj: 1 (Tarjeta Visa)      │
│  importe_detalle: $5,000         │
└──────────────────────────────────┘
```

---

## 📊 FASE 1: CAMBIOS EN BASE DE DATOS

### 1.1 Creación de Tabla `caja_movi_detalle`

```sql
-- Script: 001_crear_tabla_caja_movi_detalle.sql
-- Descripción: Tabla para almacenar desglose de movimientos por método de pago

CREATE TABLE IF NOT EXISTS caja_movi_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_movimiento INTEGER NOT NULL,
    cod_tarj INTEGER NOT NULL,
    importe_detalle NUMERIC(15,2) NOT NULL,
    porcentaje NUMERIC(5,2) DEFAULT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_caja_movi
        FOREIGN KEY (id_movimiento)
        REFERENCES caja_movi(id_movimiento)
        ON DELETE CASCADE,

    CONSTRAINT fk_tarjeta
        FOREIGN KEY (cod_tarj)
        REFERENCES tarjcredito(cod_tarj)
        ON DELETE RESTRICT,

    CONSTRAINT ck_importe_positivo
        CHECK (importe_detalle > 0),

    CONSTRAINT ck_porcentaje_valido
        CHECK (porcentaje IS NULL OR (porcentaje >= 0 AND porcentaje <= 100))
);

-- Índices para optimizar consultas
CREATE INDEX idx_caja_movi_detalle_movimiento
    ON caja_movi_detalle(id_movimiento);

CREATE INDEX idx_caja_movi_detalle_tarjeta
    ON caja_movi_detalle(cod_tarj);

CREATE INDEX idx_caja_movi_detalle_fecha
    ON caja_movi_detalle(fecha_registro);

-- Comentarios de documentación
COMMENT ON TABLE caja_movi_detalle IS
    'Desglose de movimientos de caja por método de pago. Relación 1:N con caja_movi';

COMMENT ON COLUMN caja_movi_detalle.id_detalle IS
    'PK autoincremental del detalle';

COMMENT ON COLUMN caja_movi_detalle.id_movimiento IS
    'FK a caja_movi. Movimiento padre al que pertenece este detalle';

COMMENT ON COLUMN caja_movi_detalle.cod_tarj IS
    'FK a tarjcredito. Método de pago utilizado';

COMMENT ON COLUMN caja_movi_detalle.importe_detalle IS
    'Importe pagado con este método de pago';

COMMENT ON COLUMN caja_movi_detalle.porcentaje IS
    'Porcentaje del total que representa este pago (opcional)';
```

### 1.2 Función de Validación de Integridad

```sql
-- Script: 002_validar_integridad_cajamovi.sql
-- Función para verificar que la suma de detalles = total del movimiento

CREATE OR REPLACE FUNCTION validar_suma_detalles_cajamovi()
RETURNS TRIGGER AS $$
DECLARE
    suma_detalles NUMERIC(15,2);
    total_movimiento NUMERIC(15,2);
    diferencia NUMERIC(15,2);
BEGIN
    -- Obtener suma de detalles para este movimiento
    SELECT COALESCE(SUM(importe_detalle), 0)
    INTO suma_detalles
    FROM caja_movi_detalle
    WHERE id_movimiento = NEW.id_movimiento;

    -- Obtener total del movimiento
    SELECT importe_mov
    INTO total_movimiento
    FROM caja_movi
    WHERE id_movimiento = NEW.id_movimiento;

    -- Calcular diferencia
    diferencia := ABS(suma_detalles - total_movimiento);

    -- Validar con tolerancia de $0.01 por redondeo
    IF diferencia > 0.01 THEN
        RAISE EXCEPTION
            'La suma de detalles ($%) no coincide con el total del movimiento ($%). Diferencia: $%',
            suma_detalles, total_movimiento, diferencia;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar DESPUÉS de cada insert/update
CREATE TRIGGER trg_validar_suma_detalles
AFTER INSERT OR UPDATE ON caja_movi_detalle
FOR EACH ROW
EXECUTE FUNCTION validar_suma_detalles_cajamovi();
```

### 1.3 Vista para Consultas Optimizadas

```sql
-- Script: 003_vista_cajamovi_con_desglose.sql
-- Vista que combina caja_movi con su desglose de métodos de pago

CREATE OR REPLACE VIEW v_cajamovi_con_desglose AS
SELECT
    cm.id_movimiento,
    cm.sucursal,
    cm.codigo_mov,
    cm.num_operacion,
    cm.fecha_mov,
    cm.importe_mov AS total_movimiento,
    cm.descripcion_mov,
    cm.tipo_movi,
    cm.caja,
    cm.tipo_comprobante,
    cm.numero_comprobante,
    cm.cliente,
    cm.usuario,

    -- Información del detalle
    cmd.id_detalle,
    cmd.cod_tarj,
    cmd.importe_detalle,
    cmd.porcentaje,

    -- Información de la tarjeta
    tc.tarjeta AS nombre_tarjeta,
    tc.id_forma_pago,

    -- Información del concepto
    cc.descripcion AS descripcion_concepto,

    -- Información de la caja
    cl.descripcion AS descripcion_caja

FROM caja_movi cm
LEFT JOIN caja_movi_detalle cmd ON cm.id_movimiento = cmd.id_movimiento
LEFT JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
LEFT JOIN caja_conceptos cc ON cm.codigo_mov = cc.id_concepto
LEFT JOIN caja_lista cl ON cm.caja = cl.id_caja;

COMMENT ON VIEW v_cajamovi_con_desglose IS
    'Vista combinada de movimientos de caja con su desglose por método de pago';
```

### 1.4 Script de Rollback

```sql
-- Script: 999_rollback_granularidad_cajamovi.sql
-- Rollback completo de cambios de granularidad

-- 1. Eliminar trigger
DROP TRIGGER IF EXISTS trg_validar_suma_detalles ON caja_movi_detalle;

-- 2. Eliminar función de validación
DROP FUNCTION IF EXISTS validar_suma_detalles_cajamovi();

-- 3. Eliminar vista
DROP VIEW IF EXISTS v_cajamovi_con_desglose;

-- 4. Eliminar tabla (CUIDADO: Esto elimina todos los datos)
DROP TABLE IF EXISTS caja_movi_detalle;
```

---

## 💻 FASE 2: MODIFICACIONES EN PHP BACKEND

### 2.1 Modificación de `Descarga.php` - Función de Inserción

**Archivo:** `src/Descarga.php.txt`
**Función:** `PedidossucxappCompleto_post()`
**Líneas a modificar:** 994-1089

#### Código Actual (Problemático):
```php
// Líneas 994-1054
if ($caja_movi) {
    $caja_movi['num_operacion'] = $id_num;
    $caja_movi['descripcion_mov'] = $this->generarDescripcionAutomatica($caja_movi);

    // ❌ PROBLEMA: Inserta UN SOLO registro con el total
    $this->db->insert('caja_movi', $caja_movi);
}
```

#### Código Propuesto (Con Granularidad):
```php
// Líneas 994-1089 - MODIFICADO
if ($caja_movi) {
    $caja_movi['num_operacion'] = $id_num;
    $caja_movi['descripcion_mov'] = $this->generarDescripcionAutomatica($caja_movi);

    // 1. Insertar el movimiento principal (con total)
    $this->db->insert('caja_movi', $caja_movi);
    $id_movimiento_insertado = $this->db->insert_id();

    // 2. Calcular subtotales por método de pago desde los productos
    $subtotales_por_metodo = $this->calcularSubtotalesPorMetodoPago(
        $productos_insertados, // Array de productos con sus cod_tar
        $caja_movi['importe_mov'] // Total del movimiento para validación
    );

    // 3. Insertar detalles por cada método de pago
    if (!empty($subtotales_por_metodo)) {
        foreach ($subtotales_por_metodo as $cod_tarj => $importe_detalle) {
            $detalle = array(
                'id_movimiento' => $id_movimiento_insertado,
                'cod_tarj' => $cod_tarj,
                'importe_detalle' => $importe_detalle,
                'porcentaje' => round(($importe_detalle / $caja_movi['importe_mov']) * 100, 2)
            );

            $this->db->insert('caja_movi_detalle', $detalle);
        }

        // Log para auditoría
        log_message('info', "Caja_movi granularidad: Movimiento {$id_movimiento_insertado} con " .
                    count($subtotales_por_metodo) . " métodos de pago");
    } else {
        // Log de advertencia si no se pudo calcular desglose
        log_message('warning', "Caja_movi: Movimiento {$id_movimiento_insertado} sin desglose de métodos de pago");
    }
}
```

### 2.2 Nueva Función Auxiliar: `calcularSubtotalesPorMetodoPago`

```php
/**
 * Calcula subtotales agrupados por método de pago desde array de productos
 *
 * @param array $productos Array de productos insertados con sus cod_tar
 * @param float $total_movimiento Total del movimiento para validación
 * @return array Array asociativo [cod_tarj => importe_detalle]
 */
private function calcularSubtotalesPorMetodoPago($productos, $total_movimiento) {
    $subtotales = array();

    if (empty($productos)) {
        log_message('error', 'calcularSubtotalesPorMetodoPago: Array de productos vacío');
        return $subtotales;
    }

    // Agrupar productos por cod_tar y sumar importes
    foreach ($productos as $producto) {
        $cod_tar = isset($producto['cod_tar']) ? $producto['cod_tar'] : null;

        // Validación defensiva
        if ($cod_tar === null || $cod_tar === '') {
            log_message('warning', 'Producto sin cod_tar encontrado en calcularSubtotalesPorMetodoPago');
            continue;
        }

        // Calcular importe del producto
        $cantidad = isset($producto['cantidad']) ? floatval($producto['cantidad']) : 0;
        $precio = isset($producto['precio']) ? floatval($producto['precio']) : 0;
        $importe_producto = $cantidad * $precio;

        // Acumular en el subtotal del método de pago
        if (!isset($subtotales[$cod_tar])) {
            $subtotales[$cod_tar] = 0;
        }
        $subtotales[$cod_tar] += $importe_producto;
    }

    // Validar que la suma de subtotales coincida con el total (tolerancia $0.01)
    $suma_subtotales = array_sum($subtotales);
    $diferencia = abs($suma_subtotales - $total_movimiento);

    if ($diferencia > 0.01) {
        log_message('error', "calcularSubtotalesPorMetodoPago: Diferencia detectada. " .
                    "Suma subtotales: {$suma_subtotales}, Total movimiento: {$total_movimiento}, " .
                    "Diferencia: {$diferencia}");

        // En caso de discrepancia significativa, retornar array vacío
        // Esto evita insertar datos inconsistentes
        return array();
    }

    // Redondear a 2 decimales
    foreach ($subtotales as $cod_tar => $importe) {
        $subtotales[$cod_tar] = round($importe, 2);
    }

    return $subtotales;
}
```

### 2.3 Modificación de `Carga.php` - Funciones de Consulta

**Archivo:** `src/Carga.php.txt`
**Función:** `Cajamovi_get()` y `CajamoviPaginado_post()`
**Líneas a modificar:** 1301-1449

#### Opción A: Retornar datos planos (recomendado para compatibilidad)

```php
/**
 * Obtener movimientos de caja con su desglose por método de pago
 * Retorna formato plano compatible con frontend existente
 */
public function Cajamovi_get() {
    // Consulta usando la vista creada
    $this->db->select('*');
    $this->db->from('v_cajamovi_con_desglose');

    // Aplicar filtros si existen (sucursal, fecha, etc.)
    if ($this->get('sucursal')) {
        $this->db->where('sucursal', $this->get('sucursal'));
    }

    $this->db->order_by('fecha_mov', 'DESC');
    $this->db->order_by('id_movimiento', 'DESC');
    $this->db->order_by('id_detalle', 'ASC');

    $query = $this->db->get();

    if ($query->num_rows() > 0) {
        $result = $query->result_array();

        $this->response([
            'status' => TRUE,
            'message' => 'Movimientos de caja obtenidos',
            'data' => $result,
            'granularidad' => true // Flag para indicar que tiene desglose
        ], REST_Controller::HTTP_OK);
    } else {
        $this->response([
            'status' => FALSE,
            'message' => 'No hay movimientos de caja',
            'data' => []
        ], REST_Controller::HTTP_NOT_FOUND);
    }
}
```

#### Opción B: Retornar datos anidados (más estructurado pero requiere cambios en frontend)

```php
/**
 * Obtener movimientos de caja con detalles anidados por método de pago
 * Retorna estructura jerárquica: movimiento -> [detalles]
 */
public function CajamoviConDesglose_get() {
    // 1. Obtener movimientos principales
    $this->db->select('cm.*, cc.descripcion as descripcion_concepto,
                       cl.descripcion as descripcion_caja');
    $this->db->from('caja_movi cm');
    $this->db->join('caja_conceptos cc', 'cm.codigo_mov = cc.id_concepto', 'left');
    $this->db->join('caja_lista cl', 'cm.caja = cl.id_caja', 'left');

    // Aplicar filtros
    if ($this->get('sucursal')) {
        $this->db->where('cm.sucursal', $this->get('sucursal'));
    }

    $this->db->order_by('cm.fecha_mov', 'DESC');
    $query = $this->db->get();

    if ($query->num_rows() > 0) {
        $movimientos = $query->result_array();

        // 2. Para cada movimiento, obtener sus detalles
        foreach ($movimientos as &$movimiento) {
            $this->db->select('cmd.*, tc.tarjeta as nombre_tarjeta');
            $this->db->from('caja_movi_detalle cmd');
            $this->db->join('tarjcredito tc', 'cmd.cod_tarj = tc.cod_tarj', 'left');
            $this->db->where('cmd.id_movimiento', $movimiento['id_movimiento']);
            $this->db->order_by('tc.tarjeta', 'ASC');

            $detalles_query = $this->db->get();
            $movimiento['detalles_pago'] = $detalles_query->result_array();
            $movimiento['tiene_desglose'] = ($detalles_query->num_rows() > 0);
        }

        $this->response([
            'status' => TRUE,
            'message' => 'Movimientos de caja con desglose obtenidos',
            'data' => $movimientos
        ], REST_Controller::HTTP_OK);
    } else {
        $this->response([
            'status' => FALSE,
            'message' => 'No hay movimientos de caja',
            'data' => []
        ], REST_Controller::HTTP_NOT_FOUND);
    }
}
```

---

## 🎨 FASE 3: ACTUALIZACIONES EN ANGULAR FRONTEND

### 3.1 Modificación de Interface `Cajamovi`

**Archivo:** `src/app/interfaces/cajamovi.ts`

```typescript
export interface Cajamovi {
  // Campos existentes (mantener)
  id_movimiento: number;
  sucursal: number;
  codigo_mov: number;
  num_operacion: number;
  fecha_mov: string;
  importe_mov: number;
  descripcion_mov: string;
  tipo_movi: string;
  caja: number;
  tipo_comprobante?: string;
  numero_comprobante?: number;
  cliente?: number;
  usuario?: string;
  descripcion_concepto?: string;
  descripcion_caja?: string;

  // NUEVOS CAMPOS para granularidad (Opción A - datos planos)
  id_detalle?: number;
  cod_tarj?: number;
  importe_detalle?: number;
  porcentaje?: number;
  nombre_tarjeta?: string;
  id_forma_pago?: number;
}

// Opción B - Interface para datos anidados
export interface CajamoviConDesglose extends Cajamovi {
  detalles_pago?: DetalleMetodoPago[];
  tiene_desglose?: boolean;
}

export interface DetalleMetodoPago {
  id_detalle: number;
  id_movimiento: number;
  cod_tarj: number;
  importe_detalle: number;
  porcentaje?: number;
  nombre_tarjeta: string;
  fecha_registro?: string;
}
```

### 3.2 Modificación del Componente TypeScript

**Archivo:** `src/app/components/cajamovi/cajamovi.component.ts`

#### Cambios en propiedades y métodos:

```typescript
export class CajamoviComponent implements OnInit {
  // Propiedades existentes
  public cajamovis: Cajamovi[] = [];
  public cajamovisFiltrados: Cajamovi[] = [];

  // NUEVAS propiedades para granularidad
  public mostrarDesglose: boolean = true; // Toggle para mostrar/ocultar desglose
  public cajamovisAgrupados: CajamoviAgrupado[] = []; // Datos procesados con desglose

  // ... resto de propiedades existentes ...

  ngOnInit(): void {
    this.loadCajamovis();
  }

  /**
   * Cargar movimientos de caja desde el servicio
   * MODIFICADO: Ahora procesa datos con granularidad
   */
  loadCajamovis() {
    this.loading = true;

    this.cajamoviService.getCajamovisPaginados(
      this.paginaActual,
      this.itemsPorPagina,
      this.filtros
    ).subscribe({
      next: (response: any) => {
        if (response.status && response.data) {
          // Verificar si viene con granularidad
          if (response.granularidad === true) {
            this.procesarCajamovisConDesglose(response.data);
          } else {
            this.procesarCajamovisSinDesglose(response.data);
          }

          this.totalRegistros = response.total || response.data.length;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar movimientos de caja:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar los movimientos de caja', 'error');
      }
    });
  }

  /**
   * NUEVA: Procesar datos con granularidad (formato plano de la vista)
   * Agrupa los registros por id_movimiento y organiza sus detalles
   */
  procesarCajamovisConDesglose(data: Cajamovi[]) {
    const agrupados = new Map<number, CajamoviAgrupado>();

    data.forEach(registro => {
      const idMov = registro.id_movimiento;

      if (!agrupados.has(idMov)) {
        // Primera vez que vemos este movimiento, crear el grupo
        agrupados.set(idMov, {
          movimiento: {
            id_movimiento: registro.id_movimiento,
            sucursal: registro.sucursal,
            codigo_mov: registro.codigo_mov,
            num_operacion: registro.num_operacion,
            fecha_mov: registro.fecha_mov,
            importe_mov: registro.importe_mov,
            descripcion_mov: registro.descripcion_mov,
            tipo_movi: registro.tipo_movi,
            caja: registro.caja,
            tipo_comprobante: registro.tipo_comprobante,
            numero_comprobante: registro.numero_comprobante,
            cliente: registro.cliente,
            usuario: registro.usuario,
            descripcion_concepto: registro.descripcion_concepto,
            descripcion_caja: registro.descripcion_caja
          },
          detalles: [],
          expandido: false // Para controlar acordeón en la vista
        });
      }

      // Agregar detalle si existe (puede ser null en registros sin desglose)
      if (registro.id_detalle && registro.cod_tarj) {
        agrupados.get(idMov)!.detalles.push({
          id_detalle: registro.id_detalle,
          id_movimiento: registro.id_movimiento,
          cod_tarj: registro.cod_tarj,
          importe_detalle: registro.importe_detalle!,
          porcentaje: registro.porcentaje,
          nombre_tarjeta: registro.nombre_tarjeta || 'Indefinido'
        });
      }
    });

    // Convertir Map a Array y ordenar detalles
    this.cajamovisAgrupados = Array.from(agrupados.values()).map(grupo => {
      // Ordenar detalles alfabéticamente por nombre_tarjeta
      grupo.detalles.sort((a, b) =>
        a.nombre_tarjeta.localeCompare(b.nombre_tarjeta)
      );
      return grupo;
    });

    console.log('📊 Cajamovi agrupados con desglose:', this.cajamovisAgrupados.length);
  }

  /**
   * Procesar datos sin granularidad (compatibilidad hacia atrás)
   */
  procesarCajamovisSinDesglose(data: Cajamovi[]) {
    this.cajamovis = data;
    this.cajamovisFiltrados = data;
    console.log('📋 Cajamovi sin desglose (formato clásico)');
  }

  /**
   * NUEVA: Toggle para expandir/contraer detalles de un movimiento
   */
  toggleDetalles(movimiento: CajamoviAgrupado) {
    movimiento.expandido = !movimiento.expandido;
  }

  /**
   * NUEVA: Calcular cantidad de métodos de pago de un movimiento
   */
  getCantidadMetodosPago(movimiento: CajamoviAgrupado): number {
    return movimiento.detalles.length;
  }

  /**
   * NUEVA: Validar que suma de detalles = total
   */
  validarSumaDetalles(movimiento: CajamoviAgrupado): boolean {
    if (movimiento.detalles.length === 0) return true;

    const sumaDetalles = movimiento.detalles.reduce(
      (sum, detalle) => sum + detalle.importe_detalle,
      0
    );

    const diferencia = Math.abs(sumaDetalles - movimiento.movimiento.importe_mov);
    return diferencia <= 0.01; // Tolerancia de $0.01
  }

  // ... resto de métodos existentes ...
}

/**
 * NUEVA Interface auxiliar para agrupar movimientos con sus detalles
 */
interface CajamoviAgrupado {
  movimiento: Cajamovi;
  detalles: DetalleMetodoPago[];
  expandido: boolean;
}
```

### 3.3 Modificación de la Vista HTML

**Archivo:** `src/app/components/cajamovi/cajamovi.component.html`

#### Opción de visualización: Tabla expandible con detalles

```html
<!-- Sección de controles (mantener existentes) -->
<div class="card">
  <div class="card-header">
    <h3>Movimientos de Caja</h3>

    <!-- NUEVO: Toggle para mostrar/ocultar desglose -->
    <div class="form-check form-switch">
      <input
        class="form-check-input"
        type="checkbox"
        id="toggleDesglose"
        [(ngModel)]="mostrarDesglose">
      <label class="form-check-label" for="toggleDesglose">
        Mostrar desglose por método de pago
      </label>
    </div>
  </div>

  <div class="card-body">
    <!-- TABLA PRINCIPAL CON GRANULARIDAD -->
    <p-table
      #dt
      [value]="cajamovisAgrupados"
      [rows]="itemsPorPagina"
      [paginator]="true"
      [loading]="loading"
      [scrollable]="true"
      scrollHeight="500px"
      styleClass="p-datatable-sm p-datatable-striped">

      <ng-template pTemplate="header">
        <tr>
          <th style="width: 50px">
            <!-- Columna para icono expandir/contraer -->
          </th>
          <th pSortableColumn="movimiento.sucursal">
            Sucursal <p-sortIcon field="movimiento.sucursal"></p-sortIcon>
          </th>
          <th>Concepto</th>
          <th pSortableColumn="movimiento.num_operacion">
            N° Operación <p-sortIcon field="movimiento.num_operacion"></p-sortIcon>
          </th>
          <th pSortableColumn="movimiento.fecha_mov">
            Fecha <p-sortIcon field="movimiento.fecha_mov"></p-sortIcon>
          </th>
          <th class="text-end">Importe Total</th>
          <th>Caja</th>
          <th>Descripción</th>
          <th style="width: 150px">
            Métodos de Pago
          </th>
          <th>Acciones</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-grupo let-expanded="expanded">
        <!-- FILA PRINCIPAL DEL MOVIMIENTO -->
        <tr>
          <!-- Botón expandir/contraer -->
          <td>
            <button
              type="button"
              pButton
              pRipple
              [pRowToggler]="grupo"
              class="p-button-text p-button-rounded p-button-plain"
              [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
              *ngIf="grupo.detalles.length > 0 && mostrarDesglose">
            </button>

            <!-- Indicador de sin desglose -->
            <span
              *ngIf="grupo.detalles.length === 0"
              class="text-muted"
              title="Sin desglose de métodos de pago">
              <i class="pi pi-minus"></i>
            </span>
          </td>

          <td>{{ grupo.movimiento.sucursal }}</td>
          <td>{{ grupo.movimiento.descripcion_concepto || '-' }}</td>
          <td>{{ grupo.movimiento.num_operacion }}</td>
          <td>{{ grupo.movimiento.fecha_mov | date:'dd/MM/yyyy' }}</td>
          <td class="text-end">
            <strong>{{ grupo.movimiento.importe_mov | currency:'$':'symbol':'1.2-2' }}</strong>

            <!-- Indicador de validación -->
            <span
              *ngIf="grupo.detalles.length > 0 && !validarSumaDetalles(grupo)"
              class="badge bg-warning ms-2"
              title="La suma de detalles no coincide con el total">
              <i class="pi pi-exclamation-triangle"></i>
            </span>
          </td>
          <td>{{ grupo.movimiento.descripcion_caja || '-' }}</td>
          <td>
            <small>{{ grupo.movimiento.descripcion_mov }}</small>
          </td>
          <td>
            <!-- Badge con cantidad de métodos de pago -->
            <span
              *ngIf="grupo.detalles.length > 0"
              class="badge"
              [ngClass]="{
                'bg-success': grupo.detalles.length === 1,
                'bg-info': grupo.detalles.length === 2,
                'bg-primary': grupo.detalles.length >= 3
              }">
              {{ grupo.detalles.length }}
              {{ grupo.detalles.length === 1 ? 'método' : 'métodos' }}
            </span>
            <span *ngIf="grupo.detalles.length === 0" class="text-muted">
              Sin desglose
            </span>
          </td>
          <td>
            <!-- Botones de acción existentes -->
            <button
              pButton
              icon="pi pi-pencil"
              class="p-button-sm p-button-text"
              (click)="editarMovimiento(grupo.movimiento)">
            </button>
          </td>
        </tr>

        <!-- FILA EXPANDIDA CON DETALLES (solo si mostrarDesglose = true) -->
        <tr *ngIf="mostrarDesglose">
          <td colspan="10" class="p-0">
            <div class="p-3 bg-light" *ngIf="expanded && grupo.detalles.length > 0">
              <h6 class="mb-3">
                <i class="pi pi-credit-card me-2"></i>
                Desglose por Método de Pago
              </h6>

              <table class="table table-sm table-bordered mb-0">
                <thead class="table-secondary">
                  <tr>
                    <th style="width: 50px">#</th>
                    <th>Método de Pago</th>
                    <th class="text-end" style="width: 150px">Importe</th>
                    <th class="text-end" style="width: 100px">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let detalle of grupo.detalles; let i = index">
                    <td>{{ i + 1 }}</td>
                    <td>
                      <i class="pi pi-money-bill me-2"
                         *ngIf="detalle.nombre_tarjeta?.toLowerCase().includes('efectivo')">
                      </i>
                      <i class="pi pi-credit-card me-2"
                         *ngIf="!detalle.nombre_tarjeta?.toLowerCase().includes('efectivo')">
                      </i>
                      <strong>{{ detalle.nombre_tarjeta }}</strong>
                    </td>
                    <td class="text-end">
                      {{ detalle.importe_detalle | currency:'$':'symbol':'1.2-2' }}
                    </td>
                    <td class="text-end">
                      <span class="badge bg-secondary">
                        {{ detalle.porcentaje | number:'1.2-2' }}%
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="table-secondary">
                  <tr>
                    <td colspan="2" class="text-end">
                      <strong>TOTAL:</strong>
                    </td>
                    <td class="text-end">
                      <strong>
                        {{ grupo.movimiento.importe_mov | currency:'$':'symbol':'1.2-2' }}
                      </strong>
                    </td>
                    <td class="text-end">
                      <strong>100.00%</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="10" class="text-center">
            No se encontraron movimientos de caja
          </td>
        </tr>
      </ng-template>
    </p-table>
  </div>
</div>
```

---

## 📅 FASE 4: PLAN DE IMPLEMENTACIÓN GRADUAL

### Cronograma Propuesto

```
SEMANA 1: Preparación y Base de Datos
├── Día 1-2: Crear scripts SQL (tabla, trigger, vista)
├── Día 3: Ejecutar scripts en ambiente de desarrollo
├── Día 4: Crear datos de prueba manualmente
└── Día 5: Validar integridad y constraints

SEMANA 2: Backend PHP
├── Día 1-2: Implementar calcularSubtotalesPorMetodoPago()
├── Día 3: Modificar PedidossucxappCompleto_post()
├── Día 4: Modificar funciones de consulta (Carga.php)
└── Día 5: Testing unitario de funciones PHP

SEMANA 3: Frontend Angular
├── Día 1: Actualizar interfaces TypeScript
├── Día 2-3: Modificar cajamovi.component.ts
├── Día 4-5: Actualizar vista HTML con tabla expandible

SEMANA 4: Testing y Ajustes
├── Día 1-2: Testing integrado (E2E)
├── Día 3: Corrección de bugs encontrados
├── Día 4: Testing de performance
└── Día 5: Preparación para producción

SEMANA 5: Despliegue y Monitoreo
├── Día 1: Despliegue en staging
├── Día 2-3: Testing en staging con usuarios piloto
├── Día 4: Despliegue en producción
└── Día 5: Monitoreo post-despliegue
```

### Estrategia de Despliegue: Blue-Green

1. **Mantener ambos sistemas funcionando en paralelo**
   - Sistema actual (sin granularidad) sigue funcionando
   - Sistema nuevo (con granularidad) se activa progresivamente

2. **Feature Flag para controlar activación**
   ```php
   // config/features.php
   define('CAJAMOVI_GRANULARIDAD_ENABLED', getenv('FEATURE_CAJAMOVI_GRANULARIDAD') === 'true');

   // En Descarga.php
   if (CAJAMOVI_GRANULARIDAD_ENABLED) {
       // Lógica nueva con granularidad
   } else {
       // Lógica antigua sin granularidad
   }
   ```

3. **Rollback inmediato si hay problemas**
   - Cambiar variable de entorno: `FEATURE_CAJAMOVI_GRANULARIDAD=false`
   - No requiere deploy de código

---

## 🧪 FASE 5: PLAN DE PRUEBAS

### 5.1 Pruebas Unitarias (Backend PHP)

```php
// tests/Descarga_test.php

class DescargatTest extends CIUnit_TestCase {

    public function testCalcularSubtotalesPorMetodoPago_MultiplesMetodos() {
        $productos = [
            ['cod_tar' => 11, 'cantidad' => 1, 'precio' => 10000], // Efectivo
            ['cod_tar' => 11, 'cantidad' => 1, 'precio' => 5000],  // Efectivo
            ['cod_tar' => 1, 'cantidad' => 1, 'precio' => 8000],   // Tarjeta
        ];

        $subtotales = $this->descarga->calcularSubtotalesPorMetodoPago($productos, 23000);

        $this->assertEquals(15000, $subtotales[11]); // Efectivo
        $this->assertEquals(8000, $subtotales[1]);   // Tarjeta
        $this->assertEquals(23000, array_sum($subtotales)); // Total
    }

    public function testCalcularSubtotalesPorMetodoPago_UnSoloMetodo() {
        $productos = [
            ['cod_tar' => 11, 'cantidad' => 2, 'precio' => 5000],
        ];

        $subtotales = $this->descarga->calcularSubtotalesPorMetodoPago($productos, 10000);

        $this->assertCount(1, $subtotales);
        $this->assertEquals(10000, $subtotales[11]);
    }

    public function testCalcularSubtotalesPorMetodoPago_DiferenciaSignificativa() {
        $productos = [
            ['cod_tar' => 11, 'cantidad' => 1, 'precio' => 5000],
        ];

        // Total esperado no coincide (5000 vs 10000)
        $subtotales = $this->descarga->calcularSubtotalesPorMetodoPago($productos, 10000);

        $this->assertEmpty($subtotales); // Debe retornar vacío por inconsistencia
    }
}
```

### 5.2 Pruebas de Integración (E2E)

#### Test Case 1: Venta con múltiples métodos de pago
```
Precondiciones:
- Sistema con granularidad activado
- Productos cargados en el sistema
- Tarjetas configuradas (Efectivo cod_tarj=11, Visa cod_tarj=1)

Pasos:
1. Agregar al carrito:
   - Producto A: $10,000 (Efectivo)
   - Producto B: $5,000 (Tarjeta Visa)
2. Finalizar compra
3. Verificar en base de datos:
   - caja_movi: 1 registro con total $15,000
   - caja_movi_detalle: 2 registros
     * cod_tarj=11, importe_detalle=$10,000
     * cod_tarj=1, importe_detalle=$5,000
4. Verificar en cajamovi component:
   - Tabla muestra el movimiento con badge "2 métodos"
   - Al expandir, se ven ambos detalles
   - Suma de detalles = Total

Resultado esperado: ✅ PASS
```

#### Test Case 2: Venta con un solo método de pago
```
Pasos:
1. Agregar al carrito productos solo con Efectivo
2. Finalizar compra por $20,000
3. Verificar:
   - caja_movi: 1 registro con $20,000
   - caja_movi_detalle: 1 registro cod_tarj=11, $20,000
4. En frontend: badge muestra "1 método"

Resultado esperado: ✅ PASS
```

#### Test Case 3: Validación de integridad (trigger)
```
Pasos:
1. Crear movimiento en caja_movi: $15,000
2. Intentar insertar detalles que NO suman $15,000:
   - Detalle 1: $10,000
   - Detalle 2: $4,000 (total $14,000)
3. Ejecutar INSERT del segundo detalle

Resultado esperado:
- ❌ Error del trigger: "La suma de detalles no coincide..."
- No se inserta el segundo detalle
```

### 5.3 Pruebas de Performance

```sql
-- Test: Consulta de movimientos con desglose (1000 registros)
EXPLAIN ANALYZE
SELECT * FROM v_cajamovi_con_desglose
WHERE fecha_mov BETWEEN '2025-01-01' AND '2025-12-31'
ORDER BY fecha_mov DESC
LIMIT 100;

-- Resultado esperado: < 500ms
```

### 5.4 Pruebas de Rollback

```
Escenario: Activar y desactivar feature flag

Pasos:
1. Sistema en producción con granularidad ACTIVADA
2. Generar 5 ventas con desglose
3. Verificar que todo funciona
4. DESACTIVAR feature flag (rollback)
5. Generar 5 ventas más (sin desglose)
6. Verificar:
   - Las 5 nuevas van solo a caja_movi (sin detalles)
   - Las 5 anteriores siguen teniendo detalles
   - Frontend muestra ambos tipos correctamente

Resultado esperado: ✅ Sistema funciona en ambos modos
```

---

## ⚠️ FASE 6: RIESGOS Y MITIGACIONES

### Riesgo 1: Inconsistencia entre caja_movi y caja_movi_detalle
**Probabilidad:** MEDIA
**Impacto:** ALTO
**Mitigación:**
- ✅ Trigger de validación en base de datos
- ✅ Validación en PHP antes de insert
- ✅ Transacciones para garantizar atomicidad
- ✅ Logs detallados de cualquier discrepancia

### Riesgo 2: Performance degradado en consultas
**Probabilidad:** BAJA
**Impacto:** MEDIO
**Mitigación:**
- ✅ Índices en caja_movi_detalle(id_movimiento)
- ✅ Vista pre-calculada v_cajamovi_con_desglose
- ✅ Paginación en frontend
- ✅ Cache de consultas frecuentes

### Riesgo 3: Productos sin cod_tar
**Probabilidad:** BAJA
**Impacto:** MEDIO
**Mitigación:**
- ✅ Validación defensiva en calcularSubtotalesPorMetodoPago()
- ✅ Logs de advertencia para productos sin cod_tar
- ✅ Script de auditoría pre-implementación

### Riesgo 4: Rollback deja datos inconsistentes
**Probabilidad:** BAJA
**Impacto:** BAJO
**Mitigación:**
- ✅ Feature flag permite rollback sin pérdida de datos
- ✅ Frontend compatible con ambos formatos
- ✅ caja_movi mantiene total para compatibilidad

### Riesgo 5: Datos históricos sin desglose
**Probabilidad:** ALTA (100%)
**Impacto:** BAJO
**Mitigación:**
- ✅ Frontend distingue registros con/sin desglose
- ✅ Badge "Sin desglose" para registros antiguos
- ✅ Reportes consideran ambos casos

---

## 📊 FASE 7: MÉTRICAS DE ÉXITO

### KPIs del Proyecto

1. **Integridad de Datos**
   - ✅ 100% de movimientos con desglose válido (suma = total)
   - ✅ 0 errores de validación de trigger

2. **Adopción**
   - ✅ 100% de ventas nuevas generan desglose granular
   - ✅ Frontend muestra desglose en todos los casos aplicables

3. **Performance**
   - ✅ Tiempo de consulta cajamovi < 500ms (con 1000 registros)
   - ✅ Tiempo de inserción movimiento < 100ms adicional

4. **Calidad**
   - ✅ 0 bugs críticos en producción
   - ✅ 0 inconsistencias reportadas por usuarios

5. **Reportes Financieros**
   - ✅ Capacidad de generar reporte "Ingresos por método de pago"
   - ✅ Conciliación bancaria automática funcional

---

## 📁 ENTREGABLES

### Documentos
- [x] INFORME_ANALISIS_CAJAMOVI_GRANULARIDAD.md (completado)
- [x] PLAN_GRANULARIDAD_CAJAMOVI.md (este documento)
- [ ] MANUAL_USUARIO_CAJAMOVI_DESGLOSE.md
- [ ] CHANGELOG_GRANULARIDAD.md

### Scripts SQL
- [ ] 001_crear_tabla_caja_movi_detalle.sql
- [ ] 002_validar_integridad_cajamovi.sql
- [ ] 003_vista_cajamovi_con_desglose.sql
- [ ] 999_rollback_granularidad_cajamovi.sql

### Código Backend
- [ ] Descarga.php (función PedidossucxappCompleto_post modificada)
- [ ] Descarga.php (función calcularSubtotalesPorMetodoPago nueva)
- [ ] Carga.php (función Cajamovi_get modificada)
- [ ] Carga.php (función CajamoviConDesglose_get nueva)

### Código Frontend
- [ ] src/app/interfaces/cajamovi.ts (actualizado)
- [ ] src/app/components/cajamovi/cajamovi.component.ts (modificado)
- [ ] src/app/components/cajamovi/cajamovi.component.html (modificado)
- [ ] src/app/components/cajamovi/cajamovi.component.css (estilos nuevos)

### Tests
- [ ] tests/Descarga_test.php (tests unitarios)
- [ ] tests/e2e/cajamovi_granularidad.spec.ts

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### Paso 1: Revisión y Aprobación (1-2 días)
- [ ] Revisar este plan con stakeholders
- [ ] Aprobar enfoque técnico
- [ ] Confirmar prioridad y timeline
- [ ] Asignar recursos (desarrolladores, DBAs, QA)

### Paso 2: Setup de Ambiente (1 día)
- [ ] Crear branch: `feature/cajamovi-granularidad`
- [ ] Configurar ambiente de desarrollo local
- [ ] Backup de base de datos de desarrollo
- [ ] Configurar feature flag en dev

### Paso 3: Implementación Base de Datos (2-3 días)
- [ ] Crear scripts SQL
- [ ] Ejecutar en ambiente de desarrollo
- [ ] Validar constraints y triggers
- [ ] Crear datos de prueba

### Paso 4: Implementación Backend (3-4 días)
- [ ] Implementar funciones PHP
- [ ] Tests unitarios
- [ ] Code review

### Paso 5: Implementación Frontend (3-4 días)
- [ ] Actualizar componente Angular
- [ ] Actualizar vista HTML
- [ ] Tests locales

### Paso 6: Testing Integrado (3-4 días)
- [ ] E2E testing
- [ ] Performance testing
- [ ] UAT con usuarios piloto

### Paso 7: Despliegue (2-3 días)
- [ ] Deploy a staging
- [ ] Validación final
- [ ] Deploy a producción con feature flag OFF
- [ ] Activar feature flag gradualmente
- [ ] Monitoreo 48 horas

---

## 📞 CONTACTOS Y RESPONSABLES

### Equipo del Proyecto
- **Product Owner:** [Nombre]
- **Tech Lead:** [Nombre]
- **Backend Developer:** [Nombre]
- **Frontend Developer:** [Nombre]
- **QA Engineer:** [Nombre]
- **DBA:** [Nombre]

### Canales de Comunicación
- **Slack:** #proyecto-cajamovi-granularidad
- **Jira:** Epic MOTO-XXX
- **Reuniones:** Dailies a las 10:00 AM

---

## 📚 REFERENCIAS

### Documentos Relacionados
- `INFORME_ANALISIS_CAJAMOVI_GRANULARIDAD.md` - Análisis del problema
- `plan_comprobante_tipopago.md` - Implementación de PDFs con desglose
- `pruebas_comprobantes_tipospago.md` - Plan de pruebas de PDFs

### Archivos del Sistema
- `src/app/components/cajamovi/cajamovi.component.ts` - Componente actual
- `src/Carga.php.txt` (líneas 1301-1449) - Funciones de consulta
- `src/Descarga.php.txt` (líneas 990-1089) - Función de inserción

### Tablas de Base de Datos
- `caja_movi` - Movimientos principales
- `caja_movi_detalle` - Desglose por método (NUEVA)
- `tarjcredito` - Métodos de pago
- `psucursal1-5` - Productos con cod_tar
- `factcab1-5` - Cabeceras de comprobantes

---

**FIN DEL PLAN DE IMPLEMENTACIÓN**

*Documento generado el 13 de Octubre de 2025*
*Versión 1.0 - Propuesta para revisión*
*Próxima actualización: Después de aprobación y ajustes*

---

## ANEXO A: Ejemplo de Flujo Completo

### Escenario Real: Venta de $15,000 (Efectivo + Tarjeta)

```
1. FRONTEND (Carrito Angular)
   ├── Cliente agrega:
   │   - Producto A: $6,000 (cod_tar=11, Efectivo)
   │   - Producto B: $4,000 (cod_tar=11, Efectivo)
   │   - Producto C: $3,000 (cod_tar=1, Visa)
   │   - Producto D: $2,000 (cod_tar=1, Visa)
   └── Total: $15,000

2. FRONTEND ENVÍA A BACKEND (POST)
   {
     "productos": [
       {"idart": 123, "cantidad": 1, "precio": 6000, "cod_tar": 11},
       {"idart": 456, "cantidad": 1, "precio": 4000, "cod_tar": 11},
       {"idart": 789, "cantidad": 1, "precio": 3000, "cod_tar": 1},
       {"idart": 101, "cantidad": 1, "precio": 2000, "cod_tar": 1}
     ],
     "caja_movi": {
       "importe_mov": 15000,
       "tipo_comprobante": "PR",
       ...
     }
   }

3. BACKEND PHP (Descarga.php)
   ├── PedidossucxappCompleto_post() recibe request
   ├── Inserta en factcab1 (id_num = 250)
   ├── Inserta 4 productos en psucursal1
   ├── Inserta en caja_movi (id_movimiento = 300, importe = 15000)
   ├── NUEVO: Calcula subtotales:
   │   └── calcularSubtotalesPorMetodoPago() retorna:
   │       {11: 10000, 1: 5000}
   ├── NUEVO: Inserta en caja_movi_detalle:
   │   - id_detalle=1, id_movimiento=300, cod_tarj=11, importe=10000
   │   - id_detalle=2, id_movimiento=300, cod_tarj=1, importe=5000
   └── COMMIT transaction

4. BASE DE DATOS (Estado Final)

   caja_movi:
   ┌────────────┬───────┬─────────────┬────────┐
   │id_movimien │sucursa│importe_mov  │tipo_com│
   ├────────────┼───────┼─────────────┼────────┤
   │    300     │   1   │   15000.00  │   PR   │
   └────────────┴───────┴─────────────┴────────┘

   caja_movi_detalle:
   ┌───────────┬────────────┬────────┬────────────────┐
   │id_detalle │id_movimien │cod_tarj│importe_detalle │
   ├───────────┼────────────┼────────┼────────────────┤
   │     1     │    300     │   11   │   10000.00     │
   │     2     │    300     │    1   │    5000.00     │
   └───────────┴────────────┴────────┴────────────────┘

5. FRONTEND (Cajamovi Component)
   ├── Carga movimientos desde API
   ├── procesarCajamovisConDesglose() agrupa:
   │   └── Movimiento 300 con 2 detalles
   ├── Tabla muestra:
   │   ┌──────────────────────────────────────────┐
   │   │ Movimiento 300 | $15,000 | [2 métodos]  │
   │   └──────────────────────────────────────────┘
   └── Al expandir:
       ┌─────────────────────────────────────────┐
       │ 1. Efectivo:      $10,000.00  (66.67%) │
       │ 2. Tarjeta Visa:  $ 5,000.00  (33.33%) │
       ├─────────────────────────────────────────┤
       │ TOTAL:            $15,000.00  (100%)    │
       └─────────────────────────────────────────┘
```

---

## ANEXO B: Consultas SQL Útiles

### Consulta 1: Movimientos con desglose incompleto
```sql
-- Detectar movimientos donde la suma de detalles no coincide con el total
SELECT
    cm.id_movimiento,
    cm.importe_mov AS total_movimiento,
    COALESCE(SUM(cmd.importe_detalle), 0) AS suma_detalles,
    ABS(cm.importe_mov - COALESCE(SUM(cmd.importe_detalle), 0)) AS diferencia
FROM caja_movi cm
LEFT JOIN caja_movi_detalle cmd ON cm.id_movimiento = cmd.id_movimiento
GROUP BY cm.id_movimiento, cm.importe_mov
HAVING ABS(cm.importe_mov - COALESCE(SUM(cmd.importe_detalle), 0)) > 0.01
ORDER BY diferencia DESC;
```

### Consulta 2: Reporte de ingresos por método de pago
```sql
-- Total recaudado por método de pago en un periodo
SELECT
    tc.tarjeta AS metodo_pago,
    COUNT(DISTINCT cmd.id_movimiento) AS cantidad_movimientos,
    COUNT(cmd.id_detalle) AS cantidad_transacciones,
    SUM(cmd.importe_detalle) AS total_recaudado,
    ROUND(AVG(cmd.importe_detalle), 2) AS ticket_promedio
FROM caja_movi_detalle cmd
INNER JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
INNER JOIN caja_movi cm ON cmd.id_movimiento = cm.id_movimiento
WHERE cm.fecha_mov BETWEEN '2025-10-01' AND '2025-10-31'
GROUP BY tc.tarjeta
ORDER BY total_recaudado DESC;
```

### Consulta 3: Movimientos sin desglose (históricos)
```sql
-- Identificar movimientos que no tienen detalles de pago
SELECT
    cm.id_movimiento,
    cm.fecha_mov,
    cm.importe_mov,
    cm.tipo_comprobante,
    cm.numero_comprobante
FROM caja_movi cm
LEFT JOIN caja_movi_detalle cmd ON cm.id_movimiento = cmd.id_movimiento
WHERE cmd.id_detalle IS NULL
AND cm.tipo_comprobante IS NOT NULL
ORDER BY cm.fecha_mov DESC;
```

### Consulta 4: Auditoría de conciliación bancaria
```sql
-- Comparar efectivo vs tarjetas en un periodo
WITH ingresos_por_tipo AS (
    SELECT
        CASE
            WHEN LOWER(tc.tarjeta) LIKE '%efectivo%' THEN 'Efectivo'
            WHEN LOWER(tc.tarjeta) LIKE '%tarjeta%' OR LOWER(tc.tarjeta) LIKE '%visa%'
                 OR LOWER(tc.tarjeta) LIKE '%master%' THEN 'Tarjetas'
            ELSE 'Otros'
        END AS tipo_pago,
        SUM(cmd.importe_detalle) AS total
    FROM caja_movi_detalle cmd
    INNER JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
    INNER JOIN caja_movi cm ON cmd.id_movimiento = cm.id_movimiento
    WHERE cm.fecha_mov = CURRENT_DATE
    GROUP BY tipo_pago
)
SELECT
    tipo_pago,
    total,
    ROUND((total / SUM(total) OVER ()) * 100, 2) AS porcentaje
FROM ingresos_por_tipo
ORDER BY total DESC;
```
