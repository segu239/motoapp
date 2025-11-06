# Plan de Implementación: Migración Completa a PrimeNG DataTable con Lazy Loading

**Componente:** `lista-altas`
**Fecha:** 2025-11-05
**Alternativa:** 3 - Migración Completa (RECOMENDADO)
**Tiempo Estimado:** 10-15 horas

---

## 📋 RESUMEN EJECUTIVO

### Objetivo
Migrar el componente `lista-altas` desde una tabla HTML básica a PrimeNG DataTable con lazy loading, paginación del lado del servidor, filtros dinámicos, ordenamiento y persistencia de estado, siguiendo el patrón del componente `condicionventa`.

### Beneficios
- ✅ Performance mejorada (carga 50 vs 5000 registros)
- ✅ Filtros por columna (text, numeric, equals, contains)
- ✅ Ordenamiento dinámico por cualquier columna
- ✅ Paginación del lado del servidor
- ✅ Persistencia de estado (2 horas)
- ✅ Selector dinámico de columnas
- ✅ Escalabilidad (soporta >100,000 registros)

### Riesgos
- ⚠️ Cambio significativo en UI (requiere capacitación)
- ⚠️ Performance de queries SQL (requiere índices)
- ⚠️ Posible rotura temporal de funcionalidad

---

## 🎯 FASES DE IMPLEMENTACIÓN

### FASE 1: Preparación y Backup (30 min)

#### 1.1 Crear Backups
```bash
# Crear directorio de backups
mkdir -p .backups/lista-altas-migration

# Backup de archivos actuales
cp src/app/components/lista-altas/lista-altas.component.ts .backups/lista-altas-migration/
cp src/app/components/lista-altas/lista-altas.component.html .backups/lista-altas-migration/
cp src/app/components/lista-altas/lista-altas.component.css .backups/lista-altas-migration/
cp src/Descarga.php.txt .backups/lista-altas-migration/Descarga.php.backup.txt
```

#### 1.2 Verificar Dependencias
```bash
# Verificar PrimeNG instalado
npm list primeng

# Si no está instalado o versión antigua
npm install primeng@15.4.1 --save
npm install primeicons@6.0.1 --save
```

#### 1.3 Verificar Módulos en app.module.ts
```typescript
// Verificar que estén importados:
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';

// En imports array:
imports: [
  // ...
  TableModule,
  ButtonModule,
  MultiSelectModule,
  InputTextModule,
  // ...
]
```

---

### FASE 2: Backend - Modificar Endpoint (2-3 horas)

#### 2.1 Archivo a Modificar
**Ruta:** `src/Descarga.php.txt`
**Método:** `ObtenerAltasConCostos_get` (línea ~6122)

#### 2.2 Código Completo del Endpoint Modificado

```php
/**
 * Obtiene listado de altas de existencias con costos calculados
 *
 * VERSIÓN 2.0: Con soporte para paginación, ordenamiento y filtros dinámicos
 *
 * @method GET
 * @param int sucursal (opcional) - Filtrar por sucursal
 * @param string estado (opcional) - Filtrar por estado ('ALTA', 'Cancel-Alta', 'Todas')
 * @param int page (opcional, default: 1) - Número de página
 * @param int limit (opcional, default: 50) - Registros por página
 * @param string sortField (opcional) - Campo para ordenar
 * @param string sortOrder (opcional, default: ASC) - Dirección de ordenamiento (ASC/DESC)
 * @param array filter_* (opcional) - Filtros dinámicos por columna
 * @param array matchMode_* (opcional) - Modo de matching para filtros
 * @return JSON
 */
public function ObtenerAltasConCostos_get() {
    // ========================================================================
    // PARÁMETROS
    // ========================================================================

    // Filtros básicos
    $sucursal = $this->get('sucursal');
    $estado_filtro = $this->get('estado');

    // Paginación
    $page = $this->get('page') ?? 1;
    $limit = $this->get('limit') ?? 50;

    // Ordenamiento
    $sortField = $this->get('sortField');
    $sortOrder = $this->get('sortOrder') ?? 'ASC';

    // Validación
    $page = max(1, intval($page));
    $limit = max(1, min(500, intval($limit)));
    $sortOrder = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

    // ========================================================================
    // QUERY BASE
    // ========================================================================

    $sql = "
        SELECT
            pi.id_num,
            pi.id_items,
            pi.id_art,
            pi.descripcion,
            pi.cantidad,
            pc.fecha,
            pi.fecha_resuelto,
            pi.usuario_res,
            pi.observacion,
            TRIM(pi.estado) AS estado,
            pi.motivo_cancelacion,
            pi.fecha_cancelacion,
            pi.usuario_cancelacion,
            pc.sucursald,
            pc.sucursalh,
            pc.usuario,
            pc.tipo,

            -- Costos dinámicos vs fijos
            CASE
                WHEN TRIM(pi.estado) = 'ALTA' THEN costos.costo_total_1_calculado
                WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_1_fijo
                ELSE NULL
            END AS costo_total_1,

            CASE
                WHEN TRIM(pi.estado) = 'ALTA' THEN costos.costo_total_2_calculado
                WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.costo_total_2_fijo
                ELSE NULL
            END AS costo_total_2,

            CASE
                WHEN TRIM(pi.estado) = 'ALTA' THEN costos.vcambio_actual
                WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN pi.vcambio_fijo
                ELSE NULL
            END AS vcambio,

            CASE
                WHEN TRIM(pi.estado) = 'ALTA' THEN 'dinamico'
                WHEN TRIM(pi.estado) = 'Cancel-Alta' THEN 'fijo'
                ELSE 'desconocido'
            END AS tipo_calculo,

            '$' AS simbolo_moneda

        FROM pedidoitem pi
        INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num

        LEFT JOIN LATERAL (
            SELECT
                (SELECT COALESCE(vcambio, 1)
                 FROM valorcambio
                 WHERE codmone = art.tipo_moneda
                 ORDER BY fecdesde DESC
                 LIMIT 1) AS vcambio_actual,

                (art.precostosi * pi.cantidad *
                 (SELECT COALESCE(vcambio, 1) FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
                ) AS costo_total_1_calculado,

                (art.precon * pi.cantidad *
                 (SELECT COALESCE(vcambio, 1) FROM valorcambio WHERE codmone = art.tipo_moneda ORDER BY fecdesde DESC LIMIT 1)
                ) AS costo_total_2_calculado

            FROM artsucursal art
            WHERE art.id_articulo = pi.id_art
        ) AS costos ON TRIM(pi.estado) = 'ALTA'

        WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
    ";

    // ========================================================================
    // FILTROS BÁSICOS
    // ========================================================================

    if ($sucursal && $sucursal != 0) {
        $sql .= " AND pc.sucursald = " . intval($sucursal);
    }

    if ($estado_filtro && $estado_filtro !== 'Todas') {
        $sql .= " AND TRIM(pi.estado) = " . $this->db->escape($estado_filtro);
    }

    // ========================================================================
    // FILTROS DINÁMICOS
    // ========================================================================

    $validColumns = [
        'id_num' => 'pi.id_num',
        'id_art' => 'pi.id_art',
        'descripcion' => 'pi.descripcion',
        'cantidad' => 'pi.cantidad',
        'estado' => 'pi.estado',
        'sucursald' => 'pc.sucursald',
        'usuario_res' => 'pi.usuario_res',
        'observacion' => 'pi.observacion'
    ];

    foreach ($_GET as $key => $value) {
        if (strpos($key, 'filter_') === 0 && $value !== '' && $value !== null) {
            $field = substr($key, 7);

            if (!isset($validColumns[$field])) {
                continue;
            }

            $dbField = $validColumns[$field];
            $matchModeKey = 'matchMode_' . $field;
            $matchMode = $this->get($matchModeKey) ?? 'contains';

            switch ($matchMode) {
                case 'equals':
                    $sql .= " AND " . $dbField . " = " . $this->db->escape($value);
                    break;
                case 'contains':
                    $sql .= " AND " . $dbField . " ILIKE " . $this->db->escape('%' . $value . '%');
                    break;
                case 'startsWith':
                    $sql .= " AND " . $dbField . " ILIKE " . $this->db->escape($value . '%');
                    break;
                case 'endsWith':
                    $sql .= " AND " . $dbField . " ILIKE " . $this->db->escape('%' . $value);
                    break;
                default:
                    $sql .= " AND " . $dbField . " ILIKE " . $this->db->escape('%' . $value . '%');
            }
        }
    }

    // ========================================================================
    // CONTAR TOTAL (antes de paginación)
    // ========================================================================

    $countSql = "SELECT COUNT(*) as total FROM (" . $sql . ") AS count_query";
    $countQuery = $this->db->query($countSql);
    $totalRegistros = $countQuery->row()->total ?? 0;

    // ========================================================================
    // ORDENAMIENTO
    // ========================================================================

    $sortFieldMap = [
        'id_num' => 'pi.id_num',
        'id_art' => 'pi.id_art',
        'descripcion' => 'pi.descripcion',
        'cantidad' => 'pi.cantidad',
        'estado' => 'pi.estado',
        'fecha' => 'pc.fecha',
        'fecha_resuelto' => 'pi.fecha_resuelto',
        'sucursald' => 'pc.sucursald',
        'usuario_res' => 'pi.usuario_res',
        'observacion' => 'pi.observacion',
        'tipo_calculo' => 'tipo_calculo',
        'costo_total_1' => 'costo_total_1',
        'costo_total_2' => 'costo_total_2',
        'vcambio' => 'vcambio'
    ];

    if ($sortField && isset($sortFieldMap[$sortField])) {
        $sql .= " ORDER BY " . $sortFieldMap[$sortField] . " " . $sortOrder;
    } else {
        $sql .= " ORDER BY pi.id_num DESC";
    }

    // ========================================================================
    // PAGINACIÓN
    // ========================================================================

    $offset = ($page - 1) * $limit;
    $sql .= " LIMIT " . intval($limit) . " OFFSET " . intval($offset);

    // ========================================================================
    // EJECUTAR
    // ========================================================================

    $query = $this->db->query($sql);

    if (!$query) {
        $error = $this->db->error();
        $this->response([
            "error" => true,
            "mensaje" => "Error en consulta SQL",
            "detalle_error" => $error['message']
        ], REST_Controller::HTTP_INTERNAL_SERVER_ERROR);
        return;
    }

    $data = $query->result_array();

    // ========================================================================
    // RESPUESTA
    // ========================================================================

    $respuesta = [
        "error" => false,
        "data" => $data,
        "total" => $totalRegistros,
        "page" => $page,
        "limit" => $limit,
        "total_pages" => ceil($totalRegistros / $limit)
    ];

    $this->response($respuesta);
}
```

#### 2.3 Índices Recomendados en PostgreSQL

```sql
-- Ejecutar en la base de datos
CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado ON pedidoitem(estado);
CREATE INDEX IF NOT EXISTS idx_pedidoscb_sucursald ON pedidoscb(sucursald);
CREATE INDEX IF NOT EXISTS idx_pedidoitem_id_num ON pedidoitem(id_num);
CREATE INDEX IF NOT EXISTS idx_pedidoscb_id_num ON pedidoscb(id_num);
CREATE INDEX IF NOT EXISTS idx_artsucursal_id_articulo ON artsucursal(id_articulo);
CREATE INDEX IF NOT EXISTS idx_valorcambio_codmone_fecdesde ON valorcambio(codmone, fecdesde DESC);
```

#### 2.4 Testing del Endpoint

```bash
# Test 1: Paginación básica
curl "http://localhost/api/ObtenerAltasConCostos?page=1&limit=50"

# Test 2: Con ordenamiento
curl "http://localhost/api/ObtenerAltasConCostos?page=1&limit=50&sortField=id_num&sortOrder=DESC"

# Test 3: Con filtros
curl "http://localhost/api/ObtenerAltasConCostos?page=1&limit=50&filter_descripcion=ACEITE&matchMode_descripcion=contains"

# Test 4: Combinado
curl "http://localhost/api/ObtenerAltasConCostos?sucursal=1&estado=ALTA&page=1&limit=25&sortField=fecha&sortOrder=DESC&filter_estado=ALTA"
```

---

### FASE 3: Frontend - Servicio (1 hora)

#### 3.1 Archivo a Modificar
**Ruta:** `src/app/services/cargardata.service.ts`

#### 3.2 Agregar Método Nuevo

```typescript
/**
 * Obtener altas de existencias con paginación, ordenamiento y filtros
 *
 * @param sucursal - Filtro por sucursal (opcional)
 * @param estado - Filtro por estado (opcional)
 * @param page - Número de página
 * @param limit - Registros por página
 * @param sortField - Campo para ordenar (opcional)
 * @param sortOrder - Dirección del ordenamiento (ASC/DESC)
 * @param filters - Objeto con filtros dinámicos de PrimeNG
 * @returns Observable con respuesta {error, data, total, page, limit, total_pages}
 */
obtenerAltasConCostosPaginadas(
  sucursal?: number,
  estado?: string,
  page: number = 1,
  limit: number = 50,
  sortField?: string,
  sortOrder: 'ASC' | 'DESC' = 'ASC',
  filters?: any
): Observable<any> {
  let url = `${UrlObtenerAltasConCostos}?page=${page}&limit=${limit}`;

  // Filtros básicos
  if (sucursal !== undefined && sucursal !== null && sucursal !== 0) {
    url += `&sucursal=${sucursal}`;
  }

  if (estado && estado !== 'Todas') {
    url += `&estado=${encodeURIComponent(estado)}`;
  }

  // Ordenamiento
  if (sortField) {
    url += `&sortField=${sortField}&sortOrder=${sortOrder}`;
  }

  // Filtros dinámicos de PrimeNG
  if (filters) {
    Object.keys(filters).forEach(key => {
      const filter = filters[key];
      if (filter && filter.value !== null && filter.value !== undefined) {
        url += `&filter_${key}=${encodeURIComponent(filter.value)}`;

        if (filter.matchMode) {
          url += `&matchMode_${key}=${filter.matchMode}`;
        }
      }
    });
  }

  console.log('🔗 URL Final:', url);
  return this.http.get(url);
}
```

---

### FASE 4: Frontend - Componente TypeScript (3-4 horas)

#### 4.1 Archivo a Modificar
**Ruta:** `src/app/components/lista-altas/lista-altas.component.ts`

#### 4.2 Imports Necesarios

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LazyLoadEvent } from 'primeng/api'; // NUEVO
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

// Interfaz para columnas (NUEVA)
interface Column {
  field: string;
  header: string;
}

// Interfaz existente de AltaExistencia
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
  costo_total_1?: number;
  costo_total_2?: number;
  vcambio?: number;
  tipo_calculo?: string;
  seleccionado?: boolean;
}
```

#### 4.3 Propiedades Adicionales en la Clase

```typescript
export class ListaAltasComponent implements OnInit, OnDestroy {
  // Datos existentes
  public altas: AltaExistencia[] = [];
  public altasFiltradas: AltaExistencia[] = []; // Ya no se usa, mantener por compatibilidad
  public cargando: boolean = false;
  public cancelando: boolean = false;

  // NUEVAS: Paginación
  public rows: number = 50;
  public first: number = 0;
  public totalRegistros: number = 0;
  public sortField: string | undefined;
  public sortOrder: number = 1; // 1 = ASC, -1 = DESC
  public filters: any = {};

  // NUEVAS: Columnas
  public cols: Column[] = [
    { field: 'id_num', header: 'ID' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha', header: 'Fecha' },
    { field: 'descripcion', header: 'Producto' },
    { field: 'cantidad', header: 'Cantidad' },
    { field: 'costo_total_1', header: 'Costo Total 1' },
    { field: 'costo_total_2', header: 'Costo Total 2' },
    { field: 'vcambio', header: 'V. Cambio' },
    { field: 'tipo_calculo', header: 'Tipo Cálculo' },
    { field: 'sucursald', header: 'Sucursal' },
    { field: 'usuario_res', header: 'Usuario' },
    { field: 'observacion', header: 'Observación' }
  ];

  public _selectedColumns: Column[] = [];

  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }

  set selectedColumns(val: Column[]) {
    this._selectedColumns = this.cols.filter(col => val.includes(col));
    this.saveTableState();
  }

  // Filtros existentes
  public sucursalFiltro: number | null = null;
  public estadoFiltro: string = 'ALTA';
  public sucursales: Sucursal[] = [
    { id: 0, nombre: 'Todas' },
    { id: 1, nombre: 'Casa Central' },
    { id: 2, nombre: 'Valle Viejo' },
    { id: 3, nombre: 'Güemes' },
    { id: 4, nombre: 'Depósito' },
    { id: 5, nombre: 'Mayorista' }
  ];
  public estados: string[] = ['ALTA', 'Cancel-Alta', 'Todas'];
  public usuario: string = '';

  private destroy$ = new Subject<void>();

  constructor(private _cargardata: CargardataService) {}

  // ... resto de métodos
}
```

#### 4.4 Métodos Nuevos y Modificados

```typescript
/**
 * NUEVO: Inicialización con restauración de estado
 */
ngOnInit() {
  console.log('ListaAltasComponent inicializado');

  // Inicializar columnas seleccionadas por defecto
  this._selectedColumns = this.cols;

  // Obtener usuario
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  this.usuario = user.email || '';

  // Intentar restaurar estado previo
  const stateRestored = this.restoreTableState();

  if (stateRestored) {
    console.log('✅ Estado de tabla restaurado');
  } else {
    // Si no hay estado, usar sucursal del usuario
    const sucursalUsuario = user.sucursal || null;
    if (sucursalUsuario) {
      this.sucursalFiltro = sucursalUsuario;
    }
  }

  // NO llamar cargarAltas() - lazy loading lo hará automáticamente
}

/**
 * NUEVO: Manejador de eventos de lazy loading de PrimeNG
 */
loadDataLazy(event: LazyLoadEvent): void {
  console.log('🔄 Lazy Load Event:', event);

  this.first = event.first || 0;
  this.rows = event.rows || 50;
  this.sortField = event.sortField;
  this.sortOrder = event.sortOrder || 1;
  this.filters = event.filters || {};

  // Persistir estado
  this.saveTableState();

  // Calcular página actual
  const page = Math.floor(this.first / this.rows) + 1;

  // Cargar datos del servidor
  this.cargarAltasPaginadas(page);
}

/**
 * NUEVO: Cargar altas con paginación
 */
cargarAltasPaginadas(page: number): void {
  this.cargando = true;

  const sucursal = this.sucursalFiltro || 1;
  const sortOrderStr = this.sortOrder === -1 ? 'DESC' : 'ASC';

  this._cargardata.obtenerAltasConCostosPaginadas(
    sucursal,
    this.estadoFiltro,
    page,
    this.rows,
    this.sortField,
    sortOrderStr,
    this.filters
  )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('📦 Respuesta del servidor:', response);
        this.cargando = false;

        if (response.error) {
          Swal.fire({
            title: 'Error',
            text: response.mensaje || 'Error al cargar altas de existencias',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          this.altas = [];
          this.totalRegistros = 0;
        } else {
          this.altas = response.data || [];
          this.totalRegistros = response.total || 0;

          // Inicializar selección
          this.altas.forEach(alta => alta.seleccionado = false);

          console.log(`✅ Cargadas ${this.altas.length} altas de ${this.totalRegistros} totales`);
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar altas:', error);
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

/**
 * NUEVO: Verificar si una columna está visible
 */
isColumnVisible(field: string): boolean {
  return this._selectedColumns.some(col => col.field === field);
}

/**
 * NUEVO: Calcular cantidad de columnas visibles (para colspan en emptymessage)
 */
getColumnCount(): number {
  return this._selectedColumns.length + 2; // +2 por checkbox y acciones
}

/**
 * NUEVO: Guardar estado de tabla en sessionStorage
 */
saveTableState(): void {
  const state = {
    first: this.first,
    rows: this.rows,
    sortField: this.sortField,
    sortOrder: this.sortOrder,
    filters: this.filters,
    selectedColumns: this._selectedColumns,
    sucursalFiltro: this.sucursalFiltro,
    estadoFiltro: this.estadoFiltro,
    timestamp: new Date().getTime()
  };

  sessionStorage.setItem('lista_altas_table_state', JSON.stringify(state));
  console.log('💾 Estado guardado en sessionStorage');
}

/**
 * NUEVO: Restaurar estado de tabla desde sessionStorage
 */
restoreTableState(): boolean {
  const savedState = sessionStorage.getItem('lista_altas_table_state');

  if (!savedState) {
    return false;
  }

  try {
    const state = JSON.parse(savedState);

    // Validar antigüedad (2 horas)
    const now = new Date().getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    if (now - state.timestamp > twoHours) {
      console.log('⏰ Estado expirado (>2 horas)');
      sessionStorage.removeItem('lista_altas_table_state');
      return false;
    }

    // Restaurar valores
    this.first = state.first || 0;
    this.rows = state.rows || 50;
    this.sortField = state.sortField;
    this.sortOrder = state.sortOrder || 1;
    this.filters = state.filters || {};
    this.sucursalFiltro = state.sucursalFiltro;
    this.estadoFiltro = state.estadoFiltro || 'ALTA';

    if (state.selectedColumns && state.selectedColumns.length > 0) {
      this._selectedColumns = state.selectedColumns;
    } else {
      this._selectedColumns = this.cols;
    }

    return true;
  } catch (error) {
    console.error('Error al restaurar estado:', error);
    return false;
  }
}

/**
 * MODIFICADO: Actualizar al cambiar filtro de sucursal
 */
onFiltroChange(): void {
  if (this.sucursalFiltro === 0) {
    this.sucursalFiltro = null;
  }

  // Resetear paginación y recargar
  this.first = 0;
  this.saveTableState();

  // Forzar recarga (llamar directamente, no esperar lazy load)
  this.cargarAltasPaginadas(1);
}

/**
 * MODIFICADO: Actualizar al cambiar filtro de estado
 */
onEstadoChange(): void {
  // Resetear paginación y recargar
  this.first = 0;
  this.saveTableState();

  // Forzar recarga
  this.cargarAltasPaginadas(1);
}

/**
 * DEPRECADO: Ya no se usa con lazy loading
 */
aplicarFiltros(): void {
  // Mantener por compatibilidad temporal
  // El filtrado ahora lo hace el servidor
}

/**
 * MODIFICADO: Exportar Excel con datos filtrados
 */
exportarExcel(): void {
  // Verificar si hay datos
  if (this.altas.length === 0) {
    Swal.fire({
      title: 'Sin Datos',
      text: 'No hay datos para exportar',
      icon: 'warning',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  import('xlsx').then((xlsx) => {
    const datosExportar = this.altas.map(alta => ({
      'ID': alta.id_num,
      'Estado': alta.estado,
      'Fecha': alta.fecha_resuelto || alta.fecha,
      'Producto': alta.descripcion,
      'ID Artículo': alta.id_art,
      'Cantidad': alta.cantidad,
      'Costo Total 1': alta.costo_total_1 || '',
      'Costo Total 2': alta.costo_total_2 || '',
      'V. Cambio': alta.vcambio || '',
      'Tipo Cálculo': alta.tipo_calculo || '',
      'Sucursal': this.getNombreSucursal(alta.sucursald),
      'Usuario': alta.usuario_res || alta.usuario,
      'Observación': alta.observacion,
      'Motivo Cancelación': alta.motivo_cancelacion || '',
      'Fecha Cancelación': alta.fecha_cancelacion || '',
      'Usuario Cancelación': alta.usuario_cancelacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { 'Altas Existencias': worksheet }, SheetNames: ['Altas Existencias'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((FileSaver) => {
      const fileName = `altas_existencias_${new Date().getTime()}.xlsx`;
      FileSaver.saveAs(data, fileName);

      Swal.fire({
        title: 'Éxito',
        text: `Archivo ${fileName} descargado`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    });
  });
}

// Mantener todos los métodos existentes:
// - getNombreSucursal()
// - verDetalles()
// - confirmarCancelacion()
// - cancelarAlta()
// - toggleSeleccion()
// - toggleSeleccionarTodas()
// - confirmarCancelacionMultiple()
// - cancelarAltasMultiple()
// - getters: altasSeleccionadas, hayAltasSeleccionadas, todasSeleccionadas
// - getters: cantidadActivas, cantidadCanceladas
```

---

### FASE 5: Frontend - Componente HTML (2 horas)

#### 5.1 Archivo a Modificar
**Ruta:** `src/app/components/lista-altas/lista-altas.component.html`

#### 5.2 HTML Completo Reemplazar TODO el contenido:

```html
<div class="card">
    <div class="card-body">
        <h4 class="card-title">Lista de Altas de Existencias</h4>
        <p class="text-muted">Visualice y gestione las altas de existencias registradas</p>

        <!-- Filtros Superiores (Sucursal y Estado) -->
        <div class="row mb-3">
            <div class="col-md-4">
                <label for="filtro-sucursal" class="form-label"><strong>Filtrar por Sucursal:</strong></label>
                <select
                    id="filtro-sucursal"
                    class="form-control"
                    [(ngModel)]="sucursalFiltro"
                    (change)="onFiltroChange()"
                    [disabled]="cargando">
                    <option [value]="sucursal.id" *ngFor="let sucursal of sucursales">
                        {{ sucursal.nombre }}
                    </option>
                </select>
            </div>

            <div class="col-md-4">
                <label for="filtro-estado" class="form-label"><strong>Filtrar por Estado:</strong></label>
                <select
                    id="filtro-estado"
                    class="form-control"
                    [(ngModel)]="estadoFiltro"
                    (change)="onEstadoChange()"
                    [disabled]="cargando">
                    <option [value]="estado" *ngFor="let estado of estados">
                        {{ estado }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Botón de Cancelación Múltiple -->
        <div class="row mb-3" *ngIf="!cargando && altas.length > 0">
            <div class="col-md-12">
                <button
                    type="button"
                    class="btn btn-danger"
                    (click)="confirmarCancelacionMultiple()"
                    [disabled]="altasSeleccionadas.length === 0 || cancelando">
                    <i class="fa fa-times-circle mr-1"></i>
                    Cancelar Seleccionadas ({{ altasSeleccionadas.length }})
                </button>
                <small class="text-muted ms-3" *ngIf="altasSeleccionadas.length > 0">
                    Has seleccionado {{ altasSeleccionadas.length }} alta(s) para cancelar
                </small>
            </div>
        </div>

        <!-- Tabla PrimeNG con Lazy Loading -->
        <p-table
            #dtable
            [value]="altas"
            [tableStyle]="{ 'min-width': '50rem' }"
            [paginator]="true"
            [rows]="rows"
            [first]="first"
            [rowsPerPageOptions]="[25,50,100]"
            [totalRecords]="totalRegistros"
            [showCurrentPageReport]="true"
            [loading]="cargando"
            [lazy]="true"
            (onLazyLoad)="loadDataLazy($event)"
            [lazyLoadOnInit]="true"
            [filterDelay]="300"
            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros">

            <!-- Caption: Selector de Columnas y Botón Excel -->
            <ng-template pTemplate="caption">
                <div class="d-flex flex-row align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <!-- Selector de Columnas -->
                        <p-multiSelect
                            [options]="cols"
                            [(ngModel)]="selectedColumns"
                            optionLabel="header"
                            selectedItemsLabel="{0} Columnas Seleccionadas"
                            placeholder="Elija Columnas"
                            [style]="{'min-width': '250px'}">
                        </p-multiSelect>

                        <!-- Botón Excel -->
                        <p-button
                            icon="pi pi-file-excel"
                            (click)="exportarExcel()"
                            styleClass="p-button-success ml-2"
                            [disabled]="cargando || altas.length === 0"
                            label="Excel">
                        </p-button>
                    </div>

                    <!-- Resumen -->
                    <div class="text-muted">
                        <strong>Total:</strong> {{ totalRegistros }} registros |
                        <strong>Activas:</strong> <span class="text-success">{{ cantidadActivas }}</span> |
                        <strong>Canceladas:</strong> <span class="text-danger">{{ cantidadCanceladas }}</span>
                    </div>
                </div>
            </ng-template>

            <!-- Header: Filtros y Ordenamiento -->
            <ng-template pTemplate="header">
                <tr>
                    <!-- Checkbox para seleccionar todas -->
                    <th style="width: 50px;">
                        <input
                            type="checkbox"
                            class="form-check-input"
                            [checked]="todasSeleccionadas"
                            (change)="toggleSeleccionarTodas($event)"
                            [disabled]="cancelando"
                            title="Seleccionar todas las altas activas">
                    </th>

                    <!-- ID -->
                    <th *ngIf="isColumnVisible('id_num')" pSortableColumn="id_num" style="min-width: 80px;">
                        ID
                        <p-sortIcon field="id_num"></p-sortIcon>
                        <p-columnFilter type="numeric" field="id_num" display="menu" matchMode="equals"></p-columnFilter>
                    </th>

                    <!-- Estado -->
                    <th *ngIf="isColumnVisible('estado')" pSortableColumn="estado" style="min-width: 100px;">
                        Estado
                        <p-sortIcon field="estado"></p-sortIcon>
                        <p-columnFilter type="text" field="estado" display="menu" matchMode="equals"></p-columnFilter>
                    </th>

                    <!-- Fecha -->
                    <th *ngIf="isColumnVisible('fecha')" pSortableColumn="fecha" style="min-width: 120px;">
                        Fecha
                        <p-sortIcon field="fecha"></p-sortIcon>
                    </th>

                    <!-- Producto -->
                    <th *ngIf="isColumnVisible('descripcion')" pSortableColumn="descripcion" style="min-width: 250px;">
                        Producto
                        <p-sortIcon field="descripcion"></p-sortIcon>
                        <p-columnFilter type="text" field="descripcion" display="menu" matchMode="contains"></p-columnFilter>
                    </th>

                    <!-- Cantidad -->
                    <th *ngIf="isColumnVisible('cantidad')" pSortableColumn="cantidad" style="min-width: 100px;">
                        Cantidad
                        <p-sortIcon field="cantidad"></p-sortIcon>
                        <p-columnFilter type="numeric" field="cantidad" display="menu"></p-columnFilter>
                    </th>

                    <!-- Costo Total 1 -->
                    <th *ngIf="isColumnVisible('costo_total_1')" pSortableColumn="costo_total_1" style="min-width: 120px;">
                        Costo Total 1
                        <p-sortIcon field="costo_total_1"></p-sortIcon>
                    </th>

                    <!-- Costo Total 2 -->
                    <th *ngIf="isColumnVisible('costo_total_2')" pSortableColumn="costo_total_2" style="min-width: 120px;">
                        Costo Total 2
                        <p-sortIcon field="costo_total_2"></p-sortIcon>
                    </th>

                    <!-- V. Cambio -->
                    <th *ngIf="isColumnVisible('vcambio')" pSortableColumn="vcambio" style="min-width: 100px;">
                        V. Cambio
                        <p-sortIcon field="vcambio"></p-sortIcon>
                    </th>

                    <!-- Tipo Cálculo -->
                    <th *ngIf="isColumnVisible('tipo_calculo')" pSortableColumn="tipo_calculo" style="min-width: 120px;">
                        Tipo Cálculo
                        <p-sortIcon field="tipo_calculo"></p-sortIcon>
                    </th>

                    <!-- Sucursal -->
                    <th *ngIf="isColumnVisible('sucursald')" pSortableColumn="sucursald" style="min-width: 150px;">
                        Sucursal
                        <p-sortIcon field="sucursald"></p-sortIcon>
                    </th>

                    <!-- Usuario -->
                    <th *ngIf="isColumnVisible('usuario_res')" pSortableColumn="usuario_res" style="min-width: 150px;">
                        Usuario
                        <p-sortIcon field="usuario_res"></p-sortIcon>
                        <p-columnFilter type="text" field="usuario_res" display="menu" matchMode="contains"></p-columnFilter>
                    </th>

                    <!-- Observación -->
                    <th *ngIf="isColumnVisible('observacion')" pSortableColumn="observacion" style="min-width: 200px;">
                        Observación
                        <p-sortIcon field="observacion"></p-sortIcon>
                        <p-columnFilter type="text" field="observacion" display="menu" matchMode="contains"></p-columnFilter>
                    </th>

                    <!-- Acciones -->
                    <th style="width: 120px;">Acciones</th>
                </tr>
            </ng-template>

            <!-- Body: Datos -->
            <ng-template pTemplate="body" let-alta>
                <tr [class.table-success]="alta.estado?.trim() === 'ALTA'"
                    [class.table-danger]="alta.estado?.trim() === 'Cancel-Alta'"
                    [class.row-selected]="alta.seleccionado">

                    <!-- Checkbox -->
                    <td>
                        <input
                            type="checkbox"
                            class="form-check-input"
                            [(ngModel)]="alta.seleccionado"
                            (change)="toggleSeleccion(alta)"
                            [disabled]="cancelando || alta.estado?.trim() !== 'ALTA'"
                            *ngIf="alta.estado?.trim() === 'ALTA'">
                    </td>

                    <!-- ID -->
                    <td *ngIf="isColumnVisible('id_num')">{{ alta.id_num }}</td>

                    <!-- Estado -->
                    <td *ngIf="isColumnVisible('estado')">
                        <span class="badge"
                            [class.badge-success]="alta.estado?.trim() === 'ALTA'"
                            [class.badge-danger]="alta.estado?.trim() === 'Cancel-Alta'">
                            {{ alta.estado }}
                        </span>
                    </td>

                    <!-- Fecha -->
                    <td *ngIf="isColumnVisible('fecha')">{{ alta.fecha_resuelto || alta.fecha || 'N/A' }}</td>

                    <!-- Producto -->
                    <td *ngIf="isColumnVisible('descripcion')">
                        <div class="text-truncate" style="max-width: 250px;" [title]="alta.descripcion">
                            {{ alta.descripcion }}
                        </div>
                        <small class="text-muted">ID: {{ alta.id_art }}</small>
                    </td>

                    <!-- Cantidad -->
                    <td *ngIf="isColumnVisible('cantidad')">
                        <strong>{{ alta.cantidad }}</strong>
                    </td>

                    <!-- Costo Total 1 -->
                    <td *ngIf="isColumnVisible('costo_total_1')" class="text-end">
                        <span *ngIf="alta.costo_total_1 !== null && alta.costo_total_1 !== undefined">
                            {{ alta.costo_total_1 | currency:'ARS':'symbol-narrow':'1.2-2' }}
                        </span>
                        <span *ngIf="alta.costo_total_1 === null || alta.costo_total_1 === undefined" class="text-muted">
                            N/A
                        </span>
                    </td>

                    <!-- Costo Total 2 -->
                    <td *ngIf="isColumnVisible('costo_total_2')" class="text-end">
                        <span *ngIf="alta.costo_total_2 !== null && alta.costo_total_2 !== undefined">
                            {{ alta.costo_total_2 | currency:'ARS':'symbol-narrow':'1.2-2' }}
                        </span>
                        <span *ngIf="alta.costo_total_2 === null || alta.costo_total_2 === undefined" class="text-muted">
                            N/A
                        </span>
                    </td>

                    <!-- V. Cambio -->
                    <td *ngIf="isColumnVisible('vcambio')" class="text-end">
                        <span *ngIf="alta.vcambio !== null && alta.vcambio !== undefined">
                            {{ alta.vcambio | number:'1.2-4' }}
                        </span>
                        <span *ngIf="alta.vcambio === null || alta.vcambio === undefined" class="text-muted">
                            N/A
                        </span>
                    </td>

                    <!-- Tipo Cálculo -->
                    <td *ngIf="isColumnVisible('tipo_calculo')">
                        <span class="badge"
                            [class.bg-info]="alta.tipo_calculo === 'dinamico'"
                            [class.bg-secondary]="alta.tipo_calculo === 'fijo'"
                            *ngIf="alta.tipo_calculo">
                            <i class="fa"
                                [class.fa-refresh]="alta.tipo_calculo === 'dinamico'"
                                [class.fa-lock]="alta.tipo_calculo === 'fijo'"></i>
                            {{ alta.tipo_calculo === 'dinamico' ? 'Dinámico' : 'Fijo' }}
                        </span>
                        <span *ngIf="!alta.tipo_calculo" class="text-muted">N/A</span>
                    </td>

                    <!-- Sucursal -->
                    <td *ngIf="isColumnVisible('sucursald')">{{ getNombreSucursal(alta.sucursald) }}</td>

                    <!-- Usuario -->
                    <td *ngIf="isColumnVisible('usuario_res')">
                        <small>{{ alta.usuario_res || alta.usuario }}</small>
                    </td>

                    <!-- Observación -->
                    <td *ngIf="isColumnVisible('observacion')">
                        <div class="text-truncate" style="max-width: 200px;" [title]="alta.observacion">
                            {{ alta.observacion }}
                        </div>
                    </td>

                    <!-- Acciones -->
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
            </ng-template>

            <!-- Empty Message -->
            <ng-template pTemplate="emptymessage">
                <tr>
                    <td [attr.colspan]="getColumnCount()" class="text-center p-4">
                        <div *ngIf="cargando">
                            <i class="fa fa-spinner fa-spin fa-2x mb-2"></i>
                            <p>Cargando altas de existencias...</p>
                        </div>
                        <div *ngIf="!cargando">
                            <i class="fa fa-database fa-2x mb-2"></i>
                            <p>No se encontraron altas de existencias con los filtros seleccionados</p>
                        </div>
                    </td>
                </tr>
            </ng-template>
        </p-table>
    </div>
</div>
```

---

### FASE 6: Testing Completo (2-3 horas)

#### 6.1 Checklist de Testing

```
BACKEND:
[ ] Endpoint responde correctamente sin parámetros
[ ] Endpoint responde con page=1&limit=50
[ ] Endpoint responde con ordenamiento (sortField, sortOrder)
[ ] Endpoint responde con filtros (filter_*, matchMode_*)
[ ] Endpoint devuelve total correcto
[ ] Endpoint devuelve total_pages correcto
[ ] Performance: respuesta < 1 segundo con 5000 registros

FRONTEND - PAGINACIÓN:
[ ] Tabla se carga automáticamente al inicio
[ ] Paginador muestra números de página correctos
[ ] Cambiar a página 2 funciona
[ ] Cambiar a última página funciona
[ ] Cambiar rows per page (25, 50, 100) funciona
[ ] Total de registros es correcto

FRONTEND - ORDENAMIENTO:
[ ] Ordenar por ID ascendente
[ ] Ordenar por ID descendente
[ ] Ordenar por descripción ascendente
[ ] Ordenar por descripción descendente
[ ] Ordenar por fecha
[ ] Ordenar por cantidad
[ ] Ordenar por campos calculados (costo_total_1, tipo_calculo)

FRONTEND - FILTROS:
[ ] Filtro por descripción (contains) funciona
[ ] Filtro por ID (equals) funciona
[ ] Filtro por estado (equals) funciona
[ ] Filtro por usuario (contains) funciona
[ ] Múltiples filtros simultáneos funcionan
[ ] Limpiar filtros funciona

FRONTEND - SELECTOR DE COLUMNAS:
[ ] Ocultar columnas funciona
[ ] Mostrar columnas funciona
[ ] Selección se persiste en sessionStorage

FRONTEND - FILTROS SUPERIORES:
[ ] Cambiar sucursal resetea paginación y recarga
[ ] Cambiar estado resetea paginación y recarga

FRONTEND - PERSISTENCIA:
[ ] Aplicar filtros, navegar fuera, volver → filtros se restauran
[ ] Cambiar página, navegar fuera, volver → página se restaura
[ ] Cambiar ordenamiento, navegar fuera, volver → ordenamiento se restaura
[ ] Esperar >2 horas → estado expira correctamente

FRONTEND - EXCEL:
[ ] Exportar Excel sin filtros descarga archivo
[ ] Exportar Excel con filtros descarga datos filtrados
[ ] Archivo Excel contiene todas las columnas
[ ] Archivo Excel es legible

FRONTEND - SELECCIÓN MÚLTIPLE:
[ ] Checkbox individual funciona
[ ] Checkbox "seleccionar todas" funciona
[ ] Botón "Cancelar Seleccionadas" está habilitado cuando hay selección
[ ] Cancelación múltiple funciona correctamente

FRONTEND - UI/UX:
[ ] Loading indicator se muestra durante carga
[ ] Empty message se muestra cuando no hay datos
[ ] Mensajes de error se muestran correctamente
[ ] Botones se deshabilitan correctamente durante operaciones
[ ] Responsive: tabla se ve bien en móvil/tablet/desktop

PERFORMANCE:
[ ] Carga inicial < 1 segundo
[ ] Cambio de página < 500ms
[ ] Aplicación de filtro < 1 segundo
[ ] Ordenamiento < 500ms
[ ] Dataset de 10,000 registros: sin problemas
```

#### 6.2 Casos de Prueba Específicos

**Test 1: Carga Inicial**
```
1. Navegar a /lista-altas
2. Verificar que se muestre loading
3. Verificar que se carguen 50 registros (default)
4. Verificar que totalRegistros sea > 0
5. Verificar que paginador muestre páginas correctas
```

**Test 2: Paginación**
```
1. Hacer clic en página 2
2. Verificar que first = 50
3. Verificar que se carguen los siguientes 50 registros
4. Hacer clic en "100 por página"
5. Verificar que se recargue con 100 registros
```

**Test 3: Filtros**
```
1. Abrir filtro de "Descripción"
2. Ingresar "ACEITE"
3. Verificar que solo se muestren registros con "ACEITE"
4. Verificar que totalRegistros se actualice
5. Abrir filtro de "Estado"
6. Seleccionar "ALTA"
7. Verificar que filtros múltiples funcionen
```

**Test 4: Ordenamiento**
```
1. Hacer clic en header "ID"
2. Verificar que se ordene ascendente (números menores primero)
3. Hacer clic nuevamente
4. Verificar que se ordene descendente (números mayores primero)
```

**Test 5: Persistencia**
```
1. Aplicar filtro descripción = "ACEITE"
2. Ordenar por cantidad descendente
3. Ir a página 2
4. Navegar a /otra-ruta
5. Volver a /lista-altas
6. Verificar que filtro, ordenamiento y página se restauraron
```

---

### FASE 7: Optimización y Documentación (1 hora)

#### 7.1 Optimizaciones SQL

```sql
-- Verificar que los índices se crearon
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('pedidoitem', 'pedidoscb', 'artsucursal', 'valorcambio')
ORDER BY tablename, indexname;

-- EXPLAIN ANALYZE de la query
EXPLAIN ANALYZE
SELECT ... FROM pedidoitem pi ...
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
LIMIT 50 OFFSET 0;
```

#### 7.2 Ajustes de Performance

Si las queries son lentas (>1 segundo):

**Opción 1: Crear índices adicionales**
```sql
-- Índice para ordenamiento por descripción
CREATE INDEX idx_pedidoitem_descripcion ON pedidoitem(descripcion);

-- Índice para ordenamiento por fecha
CREATE INDEX idx_pedidoscb_fecha ON pedidoscb(fecha);

-- Índice para filtrado por usuario
CREATE INDEX idx_pedidoitem_usuario_res ON pedidoitem(usuario_res);
```

**Opción 2: Optimizar LATERAL JOIN**
```sql
-- Si el LATERAL JOIN es lento, considerar crear una vista materializada
CREATE MATERIALIZED VIEW mv_altas_con_costos AS
SELECT ... FROM pedidoitem pi ...;

-- Refresh periódico (cada hora)
CREATE OR REPLACE FUNCTION refresh_mv_altas_con_costos()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_altas_con_costos;
END;
$$ LANGUAGE plpgsql;
```

**Opción 3: Cachear valor de cambio actual**
```sql
-- Crear tabla auxiliar con último valor de cambio por moneda
CREATE TABLE ultimo_valor_cambio AS
SELECT DISTINCT ON (codmone)
    codmone,
    vcambio,
    fecdesde
FROM valorcambio
ORDER BY codmone, fecdesde DESC;

-- Crear índice
CREATE UNIQUE INDEX idx_ultimo_valor_cambio_codmone ON ultimo_valor_cambio(codmone);

-- Actualizar query para usar esta tabla
```

#### 7.3 Documentación

**Crear archivo:** `docs/LISTA_ALTAS_MIGRACION.md`

```markdown
# Migración de Lista Altas a PrimeNG DataTable

## Fecha
2025-11-05

## Cambios Realizados

### Backend
- Modificado `ObtenerAltasConCostos_get` para soportar paginación
- Agregado soporte para ordenamiento dinámico
- Agregado soporte para filtros dinámicos
- Índices creados en PostgreSQL

### Frontend
- Migrado de tabla HTML a PrimeNG DataTable
- Implementado lazy loading
- Implementado paginación del lado del servidor
- Implementado filtros por columna
- Implementado ordenamiento dinámico
- Implementado persistencia de estado
- Implementado selector de columnas

## Archivos Modificados
- `src/Descarga.php.txt` (línea 6122)
- `src/app/services/cargardata.service.ts`
- `src/app/components/lista-altas/lista-altas.component.ts`
- `src/app/components/lista-altas/lista-altas.component.html`
- `src/app/app.module.ts` (verificar imports)

## Performance
- Antes: Carga 5000 registros (2MB, 5-10s)
- Después: Carga 50 registros (20KB, 0.5-1s)

## Mantenimiento
- Backup en: `.backups/lista-altas-migration/`
- Logs de testing en: `docs/testing_lista_altas.log`
```

---

## ⚠️ CONSIDERACIONES CRÍTICAS

### 1. Rollback Plan

En caso de problemas, restaurar backups:

```bash
# Restaurar archivos frontend
cp .backups/lista-altas-migration/lista-altas.component.ts src/app/components/lista-altas/
cp .backups/lista-altas-migration/lista-altas.component.html src/app/components/lista-altas/
cp .backups/lista-altas-migration/lista-altas.component.css src/app/components/lista-altas/

# Restaurar backend (si es necesario)
cp .backups/lista-altas-migration/Descarga.php.backup.txt src/Descarga.php.txt

# Recompilar Angular
npm run build
```

### 2. Testing en Entorno de Desarrollo

**NUNCA aplicar directamente en producción**

1. Probar en ambiente local primero
2. Probar en ambiente de staging/QA
3. Realizar UAT (User Acceptance Testing)
4. Solo entonces aplicar en producción

### 3. Comunicación con Usuarios

Preparar comunicado:

```
Estimados Usuarios,

El día [FECHA] se implementará una mejora significativa en el módulo "Lista de Altas de Existencias".

MEJORAS:
- Filtros avanzados por columna
- Ordenamiento dinámico
- Paginación mejorada
- Mejor performance
- Exportar a Excel mejorado

CAMBIOS VISIBLES:
- Nueva interfaz de tabla
- Filtros en cada columna
- Selector de columnas visibles

CAPACITACIÓN:
Se adjunta video tutorial de 5 minutos sobre las nuevas funcionalidades.

Saludos,
Equipo de Desarrollo
```

### 4. Monitoreo Post-Implementación

```bash
# Monitorear logs de errores
tail -f /var/log/nginx/error.log | grep "ObtenerAltasConCostos"

# Monitorear queries lentas en PostgreSQL
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%pedidoitem%'
ORDER BY mean_exec_time DESC
LIMIT 10;

# Monitorear uso de memoria
free -h

# Monitorear uso de CPU
top -u www-data
```

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs a Medir

**Performance:**
- ✅ Tiempo de carga inicial < 1s (antes: 5-10s)
- ✅ Tiempo de cambio de página < 500ms
- ✅ Tiempo de aplicación de filtro < 1s

**Usabilidad:**
- ✅ Usuarios pueden filtrar por cualquier columna
- ✅ Usuarios pueden ordenar por cualquier columna
- ✅ Usuarios pueden personalizar columnas visibles
- ✅ Estado se persiste entre navegaciones

**Escalabilidad:**
- ✅ Soporta >10,000 registros sin degradación
- ✅ Queries SQL < 1s con índices
- ✅ Transferencia de datos reducida en 99%

---

## 🎯 CRONOGRAMA SUGERIDO

### Semana 1
- **Lunes:** Fase 1 (Preparación) + Fase 2 (Backend)
- **Martes:** Fase 2 (Testing Backend) + Fase 3 (Servicio)
- **Miércoles:** Fase 4 (Componente TypeScript)
- **Jueves:** Fase 5 (HTML)
- **Viernes:** Fase 6 (Testing completo)

### Semana 2
- **Lunes:** Fase 6 (Continuar testing) + Fase 7 (Optimización)
- **Martes:** Fase 7 (Documentación) + UAT
- **Miércoles:** Ajustes finales
- **Jueves:** Revisión de seguridad
- **Viernes:** Deploy a producción

---

## ✅ CHECKLIST FINAL ANTES DE DEPLOY

```
PRE-DEPLOY:
[ ] Todos los tests pasaron
[ ] Performance verificada (< 1s carga)
[ ] Backups creados
[ ] Documentación completada
[ ] UAT aprobado por usuarios
[ ] Rollback plan listo
[ ] Comunicado enviado a usuarios

DEPLOY:
[ ] Aplicar cambios en backend (Descarga.php)
[ ] Aplicar índices en base de datos
[ ] Verificar índices creados
[ ] Compilar frontend (npm run build)
[ ] Deploy de frontend
[ ] Verificar que aplicación carga
[ ] Smoke test: cargar lista-altas, verificar que funciona

POST-DEPLOY:
[ ] Monitorear logs de errores (15 min)
[ ] Monitorear queries SQL (15 min)
[ ] Verificar con usuarios que funciona
[ ] Documentar issues encontrados
[ ] Aplicar hotfixes si es necesario
```

---

## 📞 CONTACTO Y SOPORTE

**Durante la Implementación:**
- Desarrollador: [NOMBRE]
- Email: [EMAIL]
- Slack/Teams: [CANAL]

**Post-Implementación:**
- Reportar bugs: [SISTEMA DE TICKETS]
- Sugerencias: [EMAIL/FORMULARIO]

---

**Fin del Plan de Implementación**

*Versión: 1.0*
*Fecha: 2025-11-05*
*Alternativa: 3 - Migración Completa*
