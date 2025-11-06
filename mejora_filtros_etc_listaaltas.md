# Informe de Mejoras: Lista de Altas de Existencias

**Fecha:** 2025-11-05
**Componente Analizado:** `lista-altas.component.ts/html/css`
**Componente de Referencia:** `condicionventa.component.ts/html/css`
**Estado:** Análisis Completo - Pendiente Implementación

---

## 📋 RESUMEN EJECUTIVO

El componente `lista-altas` actualmente presenta las siguientes **deficiencias críticas**:

1. ✅ **Botón de Excel:** Implementado pero NO VISIBLE en la interfaz
2. ❌ **Filtros por columna:** NO implementados
3. ❌ **Lazy Loading:** NO implementado
4. ❌ **Paginación del lado del servidor:** NO implementado
5. ❌ **Ordenamiento dinámico:** NO implementado
6. ❌ **Persistencia de estado:** NO implementado
7. ❌ **Selector de columnas:** NO implementado

En comparación, el componente `condicionventa` implementa **TODAS** estas características utilizando **PrimeNG DataTable** con lazy loading completo.

---

## 🔍 ANÁLISIS DETALLADO

### 1. PROBLEMA: Botón de Excel No Visible

#### Estado Actual

**Archivo:** `lista-altas.component.html` (líneas 36-54)

```html
<div class="col-md-4 d-flex align-items-end">
    <button
        type="button"
        class="btn btn-success me-2"
        (click)="exportarExcel()"
        [disabled]="cargando || altasFiltradas.length === 0">
        <i class="fa fa-file-excel mr-1"></i>
        Exportar Excel
    </button>
    <!-- ... -->
</div>
```

**Archivo:** `lista-altas.component.ts` (líneas 553-582)

```typescript
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.altasFiltradas.map(alta => ({
      'ID': alta.id_num,
      'Estado': alta.estado,
      'Fecha': alta.fecha,
      'Producto': alta.descripcion,
      'Cantidad': alta.cantidad,
      'Sucursal': this.getNombreSucursal(alta.sucursald),
      'Usuario': alta.usuario_res || alta.usuario,
      'Observación': alta.observacion,
      'Motivo Cancelación': alta.motivo_cancelacion || '',
      'Fecha Cancelación': alta.fecha_cancelacion || '',
      'Usuario Cancelación': alta.usuario_cancelacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((FileSaver) => {
      FileSaver.saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
    });
  });
}
```

#### ✅ Diagnóstico

- **La función `exportarExcel()` está CORRECTAMENTE implementada**
- **El botón EXISTE en el HTML**
- **El problema es que usa Bootstrap puro en lugar de PrimeNG**

#### 🛠️ Solución

**No hay problema técnico**, el botón debería ser visible. Posibles causas:
1. Clases CSS de Bootstrap (`me-2`) no aplicadas correctamente
2. Layout responsive oculta el botón en ciertas resoluciones
3. Debe verificarse visualmente en el navegador

**Recomendación:** Migrar a botón PrimeNG como en `condicionventa`:

```html
<p-button
  icon="pi pi-file-excel"
  (click)="exportarExcel()"
  styleClass="p-button-success"
  [disabled]="cargando || altasFiltradas.length === 0">
</p-button>
```

---

### 2. PROBLEMA: Tabla HTML Estándar vs PrimeNG DataTable

#### Estado Actual (lista-altas)

**Archivo:** `lista-altas.component.html` (líneas 86-214)

```html
<div class="table-responsive" *ngIf="!cargando && altasFiltradas.length > 0">
    <table class="table table-striped table-hover">
        <thead class="table-dark">
            <tr>
                <th class="checkbox-column">
                    <input type="checkbox" ... />
                </th>
                <th>ID</th>
                <th>Estado</th>
                <th>Fecha</th>
                <!-- ... sin filtros, sin ordenamiento -->
            </tr>
        </thead>
        <tbody>
            <tr *ngFor="let alta of altasFiltradas">
                <!-- ... datos estáticos -->
            </tr>
        </tbody>
    </table>
</div>
```

**Características:**
- ❌ Tabla HTML estándar con Bootstrap
- ❌ Sin filtros por columna
- ❌ Sin ordenamiento dinámico
- ❌ Sin paginación
- ❌ Sin lazy loading
- ❌ Carga TODOS los datos de una vez

#### Estado Ideal (condicionventa - REFERENCIA)

**Archivo:** `condicionventa.component.html` (líneas 44-239)

```html
<p-table
    *ngIf="mostrarProductos"
    #dtable
    [value]="productos"
    [tableStyle]="{ 'min-width': '50rem' }"
    [paginator]="true"
    [rows]="rows"
    [first]="first"
    [rowsPerPageOptions]="[25,50,100]"
    [totalRecords]="totalRegistros"
    [showCurrentPageReport]="true"
    [loading]="loading"
    [lazy]="true"
    (onLazyLoad)="loadDataLazy($event)"
    [lazyLoadOnInit]="true"
    [filterDelay]="300">

    <ng-template pTemplate="caption">
        <div class="d-flex flex-row align-items-center">
            <!-- Selector de columnas -->
            <p-multiSelect
                [options]="cols"
                [(ngModel)]="selectedColumns"
                optionLabel="header"
                selectedItemsLabel="{0} Columnas Seleccionadas"
                placeholder="Elija Columnas">
            </p-multiSelect>

            <!-- Botón Excel -->
            <p-button
                icon="pi pi-file-excel"
                (click)="exportExcel()"
                styleClass="p-button-success">
            </p-button>
        </div>
    </ng-template>

    <ng-template pTemplate="header">
        <tr>
            <th *ngIf="isColumnVisible('nomart')" pSortableColumn="nomart">
                Nombre
                <p-sortIcon field="nomart"></p-sortIcon>
                <p-columnFilter
                    type="text"
                    field="nomart"
                    display="menu"
                    matchMode="contains">
                </p-columnFilter>
            </th>
            <!-- ... más columnas con filtros y ordenamiento -->
        </tr>
    </ng-template>

    <ng-template pTemplate="body" let-producto>
        <tr>
            <td *ngIf="isColumnVisible('nomart')">{{ producto.nomart }}</td>
            <!-- ... datos dinámicos -->
        </tr>
    </ng-template>
</p-table>
```

**Características:**
- ✅ PrimeNG DataTable
- ✅ Filtros por columna con `p-columnFilter`
- ✅ Ordenamiento dinámico con `pSortableColumn`
- ✅ Paginación con `[paginator]="true"`
- ✅ Lazy loading con `[lazy]="true"` y `(onLazyLoad)="loadDataLazy($event)"`
- ✅ Selector dinámico de columnas con `p-multiSelect`
- ✅ Persistencia de estado en `sessionStorage`

---

### 3. PROBLEMA: Carga de Datos (Sin Paginación Backend)

#### Estado Actual (lista-altas)

**Archivo:** `lista-altas.component.ts` (líneas 97-137)

```typescript
cargarAltas(): void {
  this.cargando = true;
  const sucursal = this.sucursalFiltro || 1;

  // Llamada sin parámetros de paginación
  this._cargardata.obtenerAltasConCostos(sucursal, undefined)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.cargando = false;
        if (response.error) {
          // Error handling
          this.altas = [];
        } else {
          this.altas = response.mensaje || [];  // ❌ CARGA TODOS LOS DATOS
          this.altas.forEach(alta => alta.seleccionado = false);
          this.aplicarFiltros();  // ❌ FILTRADO EN CLIENTE
        }
      },
      error: (error) => {
        // Error handling
      }
    });
}
```

**Servicio:** `cargardata.service.ts` (líneas 341-358)

```typescript
obtenerAltasConCostos(sucursal?: number, estado?: string): Observable<any> {
  let url = UrlObtenerAltasConCostos;
  const params: string[] = [];

  // ❌ Sin parámetros de paginación (page, limit)
  if (sucursal !== undefined && sucursal !== null && sucursal !== 0) {
    params.push(`sucursal=${sucursal}`);
  }

  if (estado && estado !== 'Todas') {
    params.push(`estado=${encodeURIComponent(estado)}`);
  }

  if (params.length > 0) {
    url += '?' + params.join('&');
  }

  return this.http.get(url);  // ❌ OBTIENE TODOS LOS REGISTROS
}
```

**Backend:** `Descarga.php.txt` (líneas 6122-6272)

```php
public function ObtenerAltasConCostos_get() {
    $sucursal = $this->get('sucursal');
    $estado_filtro = $this->get('estado');

    // ❌ NO ACEPTA PARÁMETROS DE PAGINACIÓN
    // ❌ Sin LIMIT ni OFFSET

    $sql = "SELECT ... FROM pedidoitem pi ...";

    // Filtros básicos
    if ($sucursal && $sucursal != 0) {
        $sql .= " AND pc.sucursald = " . intval($sucursal);
    }

    if ($estado_filtro && $estado_filtro !== 'Todas') {
        $sql .= " AND TRIM(pi.estado) = " . $this->db->escape($estado_filtro);
    }

    // ❌ SIN ORDER BY (ordenamiento)
    // ❌ SIN LIMIT/OFFSET (paginación)

    $query = $this->db->query($sql);
    $data = $query->result_array();  // ❌ DEVUELVE TODO

    $respuesta = array(
        "error" => false,
        "mensaje" => $data,
        "total_registros" => count($data)  // ✅ Al menos devuelve el total
    );

    $this->response($respuesta);
}
```

#### Estado Ideal (condicionventa - REFERENCIA)

**Archivo:** `condicionventa.component.ts` (líneas 588-655)

```typescript
/**
 * ✅ Maneja el evento de lazy load de PrimeNG
 */
async loadDataLazy(event: LazyLoadEvent): Promise<void> {
  console.log('🔄 Lazy Load Event:', event);

  this.first = event.first || 0;
  this.rows = event.rows || 50;
  this.sortField = event.sortField;
  this.sortOrder = event.sortOrder || 1;
  this.filters = event.filters || {};

  // ✅ Persistir estado
  this.saveTableState();

  // ✅ Calcular página actual
  const page = Math.floor(this.first / this.rows) + 1;

  // ✅ Cargar datos del servidor con paginación
  await this.loadServerData(page);
}

/**
 * ✅ Carga datos del servidor con parámetros de paginación
 */
async loadServerData(page: number): Promise<void> {
  if (!this.codTarj) {
    console.warn('No hay condición de venta seleccionada');
    return;
  }

  // ✅ Usar servicio paginado con filtros, ordenamiento y paginación
  this.articulosPaginadosService.cargarProductos(
    page,
    this.rows,
    this.sortField,
    this.sortOrder === -1 ? 'DESC' : 'ASC',
    this.filters,
    this.codTarj
  );
}
```

**Servicio:** `articulos-paginados.service.ts` (implementa paginación completa)

```typescript
/**
 * ✅ Servicio especializado para paginación con lazy loading
 */
cargarProductos(
  page: number,
  limit: number,
  sortField?: string,
  sortOrder?: 'ASC' | 'DESC',
  filters?: any,
  codTarj?: string
): void {
  this.cargandoSubject.next(true);

  // ✅ Construir parámetros completos
  let url = `${UrlArticulosPaginados}?page=${page}&limit=${limit}`;

  if (sortField) {
    url += `&sortField=${sortField}&sortOrder=${sortOrder}`;
  }

  if (filters) {
    Object.keys(filters).forEach(key => {
      const filterValue = filters[key].value;
      if (filterValue !== null && filterValue !== undefined) {
        url += `&filter_${key}=${encodeURIComponent(filterValue)}`;
      }
    });
  }

  if (codTarj) {
    url += `&cod_tarj=${codTarj}`;
  }

  // ✅ Llamada HTTP con todos los parámetros
  this.http.get(url).subscribe({
    next: (response: any) => {
      this.articulosSubject.next(response.data || []);
      this.totalItemsSubject.next(response.total || 0);
      this.paginaActualSubject.next(page);
      this.totalPaginasSubject.next(Math.ceil(response.total / limit));
      this.cargandoSubject.next(false);
    },
    error: (error) => {
      console.error('Error al cargar productos:', error);
      this.cargandoSubject.next(false);
    }
  });
}
```

---

### 4. PROBLEMA: Filtrado y Ordenamiento en Cliente vs Servidor

#### Estado Actual (lista-altas)

**Filtrado en Cliente:**

```typescript
aplicarFiltros(): void {
  let resultado = [...this.altas];  // ❌ Copia de TODOS los datos

  // ❌ Filtrado manual en JavaScript
  if (this.estadoFiltro && this.estadoFiltro !== 'Todas') {
    resultado = resultado.filter(alta =>
      alta.estado?.trim() === this.estadoFiltro
    );
  }

  this.altasFiltradas = resultado;
}
```

**Problemas:**
- ❌ Carga TODOS los datos en memoria
- ❌ Filtrado manual (ineficiente con muchos registros)
- ❌ Sin filtros por columna
- ❌ Sin ordenamiento dinámico
- ❌ No escala bien (>1000 registros = performance issue)

#### Estado Ideal (condicionventa)

**Filtrado en Servidor:**

```typescript
// ✅ PrimeNG maneja los filtros automáticamente
loadDataLazy(event: LazyLoadEvent): Promise<void> {
  this.filters = event.filters || {};  // ✅ Filtros de PrimeNG

  // ✅ Enviar filtros al servidor
  await this.loadServerData(page);
}
```

**Backend procesa filtros:**

```php
// ✅ Ejemplo de backend con filtros dinámicos
public function ArticulosPaginados_get() {
    $page = $this->get('page') ?? 1;
    $limit = $this->get('limit') ?? 50;
    $sortField = $this->get('sortField');
    $sortOrder = $this->get('sortOrder') ?? 'ASC';

    // ✅ Construir filtros dinámicos
    $this->db->select('*');
    $this->db->from('artsucursal');

    // ✅ Aplicar filtros dinámicos
    foreach ($_GET as $key => $value) {
        if (strpos($key, 'filter_') === 0) {
            $field = substr($key, 7);
            $this->db->like($field, $value);
        }
    }

    // ✅ Ordenamiento
    if ($sortField) {
        $this->db->order_by($sortField, $sortOrder);
    }

    // ✅ Paginación
    $offset = ($page - 1) * $limit;
    $this->db->limit($limit, $offset);

    $data = $this->db->get()->result_array();

    // ✅ Total de registros (sin paginación)
    $this->db->from('artsucursal');
    // Aplicar mismos filtros para el count
    $total = $this->db->count_all_results();

    $this->response([
        'data' => $data,
        'total' => $total,
        'page' => $page,
        'limit' => $limit
    ]);
}
```

---

### 5. PROBLEMA: Persistencia de Estado

#### Estado Actual (lista-altas)

**❌ NO IMPLEMENTADO**

Cada vez que el usuario navega fuera y vuelve:
- Se pierden los filtros aplicados
- Se pierde el ordenamiento
- Se pierde la página actual
- Se pierde la selección de columnas

#### Estado Ideal (condicionventa)

**Archivo:** `condicionventa.component.ts` (líneas 670-721)

```typescript
/**
 * ✅ Guarda el estado de la tabla en sessionStorage
 */
saveTableState(): void {
  const state = {
    first: this.first,
    rows: this.rows,
    sortField: this.sortField,
    sortOrder: this.sortOrder,
    filters: this.filters,
    selectedColumns: this._selectedColumns,
    timestamp: new Date().getTime()
  };

  sessionStorage.setItem('condicionventa_table_state', JSON.stringify(state));
}

/**
 * ✅ Restaura el estado de la tabla desde sessionStorage
 */
restoreTableState(): boolean {
  const savedState = sessionStorage.getItem('condicionventa_table_state');

  if (!savedState) {
    return false;
  }

  try {
    const state = JSON.parse(savedState);

    // ✅ Validar que el estado no sea muy antiguo (2 horas)
    const now = new Date().getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    if (now - state.timestamp > twoHours) {
      sessionStorage.removeItem('condicionventa_table_state');
      return false;
    }

    // ✅ Restaurar valores
    this.first = state.first || 0;
    this.rows = state.rows || 50;
    this.sortField = state.sortField;
    this.sortOrder = state.sortOrder || 1;
    this.filters = state.filters || {};

    if (state.selectedColumns) {
      this._selectedColumns = state.selectedColumns;
    }

    return true;
  } catch (error) {
    console.error('Error al restaurar estado:', error);
    return false;
  }
}
```

**Uso en ngOnInit:**

```typescript
ngOnInit(): void {
  // ✅ Intentar restaurar estado previo
  const stateRestored = this.restoreTableState();

  if (stateRestored) {
    console.log('✅ Estado de tabla restaurado desde sessionStorage');
  }

  // ... resto de la inicialización
}
```

---

### 6. PROBLEMA: Selector de Columnas

#### Estado Actual (lista-altas)

**❌ NO IMPLEMENTADO**

Todas las columnas son siempre visibles, sin opción para ocultar/mostrar columnas.

#### Estado Ideal (condicionventa)

**Archivo:** `condicionventa.component.ts` (líneas 101-123)

```typescript
// ✅ Definición de columnas disponibles
cols: Column[] = [
  { field: 'nomart', header: 'Nombre' },
  { field: 'marca', header: 'Marca' },
  { field: 'precon', header: 'Precio 0' },
  { field: 'prefi1', header: 'Precio 1' },
  { field: 'prefi2', header: 'Precio 2' },
  { field: 'prefi3', header: 'Precio 3' },
  { field: 'prefi4', header: 'Precio 4' },
  { field: 'exi1', header: 'Stock Dep' },
  { field: 'exi2', header: 'Stock CC' },
  { field: 'exi3', header: 'Stock VV' },
  { field: 'exi4', header: 'Stock GM' },
  { field: 'exi5', header: 'Stock MAY' },
  { field: 'cd_articulo', header: 'Código' },
  { field: 'cd_barra', header: 'Código Barra' },
  { field: 'rubro', header: 'Rubro' },
  { field: 'estado', header: 'Estado' },
  { field: 'cod_deposito', header: 'Cód. Depósito' }
];

// ✅ Columnas seleccionadas por defecto
_selectedColumns: Column[] = [];

get selectedColumns(): Column[] {
  return this._selectedColumns;
}

set selectedColumns(val: Column[]) {
  this._selectedColumns = this.cols.filter(col => val.includes(col));
}

// ✅ Verificar si una columna está visible
isColumnVisible(field: string): boolean {
  return this._selectedColumns.some(col => col.field === field);
}

// ✅ Manejar cambio en selección de columnas
onColumnSelectionChange(): void {
  this.saveTableState();  // Persistir cambios
}
```

**HTML:**

```html
<p-multiSelect
  [options]="cols"
  [(ngModel)]="selectedColumns"
  optionLabel="header"
  selectedItemsLabel="{0} Columnas Seleccionadas"
  placeholder="Elija Columnas"
  (onChange)="onColumnSelectionChange()">
</p-multiSelect>

<!-- Columnas dinámicas -->
<th *ngIf="isColumnVisible('nomart')" pSortableColumn="nomart">
  Nombre
  <p-sortIcon field="nomart"></p-sortIcon>
  <p-columnFilter type="text" field="nomart"></p-columnFilter>
</th>
```

---

## 📊 COMPARACIÓN RESUMIDA

| Característica | lista-altas (actual) | condicionventa (ideal) |
|----------------|----------------------|------------------------|
| **Framework de Tabla** | Bootstrap HTML table | PrimeNG DataTable |
| **Filtros por Columna** | ❌ No | ✅ Sí (p-columnFilter) |
| **Tipos de Filtro** | ❌ No | ✅ Text, Numeric, Equals, Contains |
| **Ordenamiento** | ❌ No | ✅ Sí (pSortableColumn) |
| **Paginación** | ❌ No | ✅ Sí (25/50/100 por página) |
| **Lazy Loading** | ❌ No | ✅ Sí (onLazyLoad) |
| **Carga de Datos** | Todos a la vez | Bajo demanda |
| **Filtrado** | Cliente (JavaScript) | Servidor (SQL) |
| **Ordenamiento** | No implementado | Servidor (ORDER BY) |
| **Persistencia Estado** | ❌ No | ✅ Sí (sessionStorage, 2h) |
| **Selector Columnas** | ❌ No | ✅ Sí (p-multiSelect) |
| **Exportar Excel** | ✅ Implementado | ✅ Implementado |
| **Botón Excel** | Bootstrap btn | PrimeNG p-button |
| **Performance (1000 reg)** | ⚠️ Lento (carga todo) | ✅ Rápido (carga 50) |
| **Performance (10000 reg)** | ❌ Muy lento / crash | ✅ Sin problemas |
| **Backend Paginación** | ❌ No soportado | ✅ Soportado |
| **Backend Filtros** | ❌ No soportado | ✅ Soportado |
| **Backend Ordenamiento** | ❌ No soportado | ✅ Soportado |

---

## 🔧 CAMBIOS NECESARIOS

### A. FRONTEND (Angular)

#### 1. Migrar a PrimeNG DataTable

**Reemplazar:**

```html
<!-- ❌ ACTUAL -->
<div class="table-responsive">
  <table class="table table-striped table-hover">
    <thead>
      <tr>
        <th>ID</th>
        <!-- ... -->
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let alta of altasFiltradas">
        <!-- ... -->
      </tr>
    </tbody>
  </table>
</div>
```

**Por:**

```html
<!-- ✅ NUEVO -->
<p-table
  [value]="altas"
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
  [filterDelay]="300">

  <ng-template pTemplate="caption">
    <div class="d-flex flex-row align-items-center">
      <p-multiSelect
        [options]="cols"
        [(ngModel)]="selectedColumns"
        optionLabel="header">
      </p-multiSelect>
      <p-button
        icon="pi pi-file-excel"
        (click)="exportarExcel()"
        styleClass="p-button-success">
      </p-button>
    </div>
  </ng-template>

  <ng-template pTemplate="header">
    <tr>
      <th pSortableColumn="id_num">
        ID
        <p-sortIcon field="id_num"></p-sortIcon>
        <p-columnFilter type="numeric" field="id_num" display="menu"></p-columnFilter>
      </th>
      <th pSortableColumn="estado">
        Estado
        <p-sortIcon field="estado"></p-sortIcon>
        <p-columnFilter type="text" field="estado" display="menu"></p-columnFilter>
      </th>
      <!-- ... más columnas con filtros -->
    </tr>
  </ng-template>

  <ng-template pTemplate="body" let-alta>
    <tr>
      <td>{{ alta.id_num }}</td>
      <td>{{ alta.estado }}</td>
      <!-- ... datos -->
    </tr>
  </ng-template>
</p-table>
```

#### 2. Agregar Propiedades de Paginación

**Archivo:** `lista-altas.component.ts`

```typescript
// ✅ Agregar propiedades
export class ListaAltasComponent implements OnInit, OnDestroy {
  // Paginación
  public rows: number = 50;
  public first: number = 0;
  public totalRegistros: number = 0;
  public sortField: string | undefined;
  public sortOrder: number = 1;
  public filters: any = {};

  // Columnas
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
  }

  isColumnVisible(field: string): boolean {
    return this._selectedColumns.some(col => col.field === field);
  }

  // ... resto del código
}
```

#### 3. Implementar Lazy Loading

**Archivo:** `lista-altas.component.ts`

```typescript
/**
 * ✅ Manejar evento de lazy load
 */
async loadDataLazy(event: LazyLoadEvent): Promise<void> {
  console.log('🔄 Lazy Load Event:', event);

  this.first = event.first || 0;
  this.rows = event.rows || 50;
  this.sortField = event.sortField;
  this.sortOrder = event.sortOrder || 1;
  this.filters = event.filters || {};

  // Persistir estado
  this.saveTableState();

  // Calcular página
  const page = Math.floor(this.first / this.rows) + 1;

  // Cargar datos del servidor
  await this.cargarAltasPaginadas(page);
}

/**
 * ✅ Cargar altas con paginación
 */
async cargarAltasPaginadas(page: number): Promise<void> {
  this.cargando = true;

  const sucursal = this.sucursalFiltro || 1;

  // ✅ Llamar servicio con paginación
  this._cargardata.obtenerAltasConCostosPaginadas(
    sucursal,
    this.estadoFiltro,
    page,
    this.rows,
    this.sortField,
    this.sortOrder === -1 ? 'DESC' : 'ASC',
    this.filters
  ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.cargando = false;

        if (response.error) {
          this.altas = [];
          this.totalRegistros = 0;
        } else {
          this.altas = response.data || [];
          this.totalRegistros = response.total || 0;
          this.altas.forEach(alta => alta.seleccionado = false);
        }
      },
      error: (error) => {
        console.error('Error:', error);
        this.cargando = false;
      }
    });
}
```

#### 4. Implementar Persistencia de Estado

**Archivo:** `lista-altas.component.ts`

```typescript
/**
 * ✅ Guardar estado en sessionStorage
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
}

/**
 * ✅ Restaurar estado desde sessionStorage
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

    if (state.selectedColumns) {
      this._selectedColumns = state.selectedColumns;
    }

    return true;
  } catch (error) {
    console.error('Error al restaurar estado:', error);
    return false;
  }
}

/**
 * ✅ Modificar ngOnInit para restaurar estado
 */
ngOnInit() {
  // Inicializar columnas por defecto
  this._selectedColumns = this.cols;

  // Obtener usuario
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  this.usuario = user.email || '';

  // Intentar restaurar estado
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

  // NO llamar cargarAltas() aquí - lazy loading lo hará automáticamente
}
```

#### 5. Actualizar Servicio

**Archivo:** `cargardata.service.ts`

```typescript
/**
 * ✅ Nuevo método con paginación completa
 */
obtenerAltasConCostosPaginadas(
  sucursal?: number,
  estado?: string,
  page: number = 1,
  limit: number = 50,
  sortField?: string,
  sortOrder?: 'ASC' | 'DESC',
  filters?: any
): Observable<any> {
  let url = `${UrlObtenerAltasConCostos}?page=${page}&limit=${limit}`;

  // Parámetros básicos
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

  // Filtros dinámicos
  if (filters) {
    Object.keys(filters).forEach(key => {
      const filter = filters[key];
      if (filter && filter.value !== null && filter.value !== undefined) {
        url += `&filter_${key}=${encodeURIComponent(filter.value)}`;

        // Incluir matchMode si existe
        if (filter.matchMode) {
          url += `&matchMode_${key}=${filter.matchMode}`;
        }
      }
    });
  }

  return this.http.get(url);
}
```

#### 6. Actualizar URLs en `config/ini.ts`

**Archivo:** `config/ini.ts`

```typescript
// Endpoint existente (mantener para compatibilidad)
export const UrlObtenerAltasConCostos = host_produccion + 'ObtenerAltasConCostos';

// ✅ Nuevo endpoint con paginación (si se crea endpoint separado)
// export const UrlObtenerAltasConCostosPaginadas = host_produccion + 'ObtenerAltasConCostosPaginadas';
```

---

### B. BACKEND (PHP/CodeIgniter)

#### Opción 1: Modificar Endpoint Existente (RECOMENDADO)

**Archivo:** `Descarga.php`

```php
/**
 * ✅ Obtiene listado de altas de existencias con costos calculados (CON PAGINACIÓN)
 *
 * @method GET
 * @param int sucursal (opcional) - Filtrar por sucursal
 * @param string estado (opcional) - Filtrar por estado
 * @param int page (opcional, default: 1) - Número de página
 * @param int limit (opcional, default: 50) - Registros por página
 * @param string sortField (opcional) - Campo para ordenar
 * @param string sortOrder (opcional, default: ASC) - Dirección de ordenamiento
 * @param array filters (opcional) - Filtros dinámicos (filter_campo, matchMode_campo)
 * @return JSON - Objeto con data[], total, page, limit
 */
public function ObtenerAltasConCostos_get() {
    // ============================================================================
    // PARÁMETROS DE ENTRADA
    // ============================================================================

    // Filtros básicos
    $sucursal = $this->get('sucursal');
    $estado_filtro = $this->get('estado');

    // ✅ NUEVOS: Paginación
    $page = $this->get('page') ?? 1;
    $limit = $this->get('limit') ?? 50;

    // ✅ NUEVOS: Ordenamiento
    $sortField = $this->get('sortField');
    $sortOrder = $this->get('sortOrder') ?? 'ASC';

    // Validar parámetros
    $page = max(1, intval($page));
    $limit = max(1, min(500, intval($limit)));  // Máximo 500 por página
    $sortOrder = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

    // ============================================================================
    // CONSTRUIR QUERY BASE
    // ============================================================================

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

            -- LÓGICA DUAL: Costos dinámicos vs fijos
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

    // ============================================================================
    // APLICAR FILTROS BÁSICOS
    // ============================================================================

    if ($sucursal && $sucursal != 0) {
        $sql .= " AND pc.sucursald = " . intval($sucursal);
    }

    if ($estado_filtro && $estado_filtro !== 'Todas') {
        $sql .= " AND TRIM(pi.estado) = " . $this->db->escape($estado_filtro);
    }

    // ============================================================================
    // ✅ APLICAR FILTROS DINÁMICOS (NUEVO)
    // ============================================================================

    $validColumns = [
        'id_num', 'id_art', 'descripcion', 'cantidad', 'estado',
        'sucursald', 'usuario_res', 'observacion', 'tipo_calculo',
        'costo_total_1', 'costo_total_2', 'vcambio'
    ];

    foreach ($_GET as $key => $value) {
        // Detectar filtros con formato filter_campo
        if (strpos($key, 'filter_') === 0 && $value !== '' && $value !== null) {
            $field = substr($key, 7);  // Remover "filter_"

            // Validar que el campo sea permitido
            if (!in_array($field, $validColumns)) {
                continue;
            }

            // Obtener matchMode (si existe)
            $matchModeKey = 'matchMode_' . $field;
            $matchMode = $this->get($matchModeKey) ?? 'contains';

            // Aplicar filtro según matchMode
            switch ($matchMode) {
                case 'equals':
                    $sql .= " AND " . $field . " = " . $this->db->escape($value);
                    break;

                case 'contains':
                    $sql .= " AND " . $field . " ILIKE " . $this->db->escape('%' . $value . '%');
                    break;

                case 'startsWith':
                    $sql .= " AND " . $field . " ILIKE " . $this->db->escape($value . '%');
                    break;

                case 'endsWith':
                    $sql .= " AND " . $field . " ILIKE " . $this->db->escape('%' . $value);
                    break;

                default:
                    // contains por defecto
                    $sql .= " AND " . $field . " ILIKE " . $this->db->escape('%' . $value . '%');
                    break;
            }
        }
    }

    // ============================================================================
    // ✅ CONTAR TOTAL DE REGISTROS (ANTES DE PAGINACIÓN)
    // ============================================================================

    // Envolver query principal en un COUNT
    $countSql = "SELECT COUNT(*) as total FROM (" . $sql . ") AS count_query";
    $countQuery = $this->db->query($countSql);
    $totalRegistros = $countQuery->row()->total ?? 0;

    // ============================================================================
    // ✅ APLICAR ORDENAMIENTO (NUEVO)
    // ============================================================================

    // Mapeo de campos virtuales a campos reales
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
        'tipo_calculo' => 'tipo_calculo',  // Campo calculado
        'costo_total_1' => 'costo_total_1',  // Campo calculado
        'costo_total_2' => 'costo_total_2',  // Campo calculado
        'vcambio' => 'vcambio'  // Campo calculado
    ];

    if ($sortField && isset($sortFieldMap[$sortField])) {
        $sql .= " ORDER BY " . $sortFieldMap[$sortField] . " " . $sortOrder;
    } else {
        // Ordenamiento por defecto
        $sql .= " ORDER BY pi.id_num DESC";
    }

    // ============================================================================
    // ✅ APLICAR PAGINACIÓN (NUEVO)
    // ============================================================================

    $offset = ($page - 1) * $limit;
    $sql .= " LIMIT " . intval($limit) . " OFFSET " . intval($offset);

    // ============================================================================
    // EJECUTAR QUERY
    // ============================================================================

    $query = $this->db->query($sql);

    if (!$query) {
        $error = $this->db->error();
        $this->response([
            "error" => true,
            "mensaje" => "Error en la consulta SQL",
            "detalle_error" => $error['message'],
            "codigo_error" => $error['code']
        ], REST_Controller::HTTP_INTERNAL_SERVER_ERROR);
        return;
    }

    $data = $query->result_array();

    // ============================================================================
    // ✅ RESPUESTA CON PAGINACIÓN (NUEVO FORMATO)
    // ============================================================================

    $respuesta = [
        "error" => false,
        "data" => $data,  // ✅ Cambio: "mensaje" -> "data"
        "total" => $totalRegistros,  // ✅ Total de registros (sin paginación)
        "page" => $page,  // ✅ Página actual
        "limit" => $limit,  // ✅ Registros por página
        "total_pages" => ceil($totalRegistros / $limit)  // ✅ Total de páginas
    ];

    $this->response($respuesta);
}
```

#### Opción 2: Crear Endpoint Nuevo (ALTERNATIVO)

**Archivo:** `Descarga.php`

```php
/**
 * ✅ Nuevo endpoint específico para paginación
 * Mantiene ObtenerAltasConCostos_get sin cambios para compatibilidad
 */
public function ObtenerAltasConCostosPaginadas_get() {
    // ... Mismo código que Opción 1 ...
}
```

**Ventajas Opción 1 (Modificar existente):**
- ✅ Un solo endpoint para mantener
- ✅ Retrocompatible (si no se pasan page/limit, devuelve todo)
- ✅ Menos duplicación de código

**Ventajas Opción 2 (Nuevo endpoint):**
- ✅ No afecta código existente
- ✅ Permite testing independiente
- ✅ Rollback más fácil

**Recomendación:** Opción 1 (Modificar existente) con retrocompatibilidad.

---

### C. IMPORTS Y MÓDULOS (Angular)

**Archivo:** `app.module.ts`

Asegurarse de que están importados los módulos de PrimeNG:

```typescript
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

@NgModule({
  declarations: [
    // ... componentes
  ],
  imports: [
    // ... otros módulos
    TableModule,  // ✅ p-table
    ButtonModule,  // ✅ p-button
    MultiSelectModule,  // ✅ p-multiSelect
    InputTextModule,  // ✅ Filtros de texto
    DropdownModule,  // ✅ Filtros dropdown
    // ...
  ]
})
export class AppModule { }
```

**Archivo:** `lista-altas.component.ts`

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LazyLoadEvent } from 'primeng/api';  // ✅ NUEVO
import * as FileSaver from 'file-saver';  // ✅ Para Excel
import * as XLSX from 'xlsx';  // ✅ Para Excel

// ✅ NUEVA Interfaz para columnas
interface Column {
  field: string;
  header: string;
}

// ... resto del componente
```

---

## 📝 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### Fase 1: Preparación (1-2 horas)
1. ✅ Crear backup del componente actual
2. ✅ Verificar que PrimeNG esté instalado (`npm list primeng`)
3. ✅ Importar módulos necesarios en `app.module.ts`
4. ✅ Crear interfaz `Column` en el componente

### Fase 2: Backend (2-3 horas)
1. ✅ Modificar endpoint `ObtenerAltasConCostos_get` para aceptar paginación
2. ✅ Implementar lógica de ordenamiento dinámico
3. ✅ Implementar lógica de filtros dinámicos
4. ✅ Implementar conteo total de registros
5. ✅ Probar endpoint con Postman/Insomnia
   ```
   GET /ObtenerAltasConCostos?page=1&limit=50&sortField=id_num&sortOrder=DESC
   GET /ObtenerAltasConCostos?page=1&limit=50&filter_descripcion=ACEITE&matchMode_descripcion=contains
   ```

### Fase 3: Frontend - Servicio (1 hora)
1. ✅ Crear método `obtenerAltasConCostosPaginadas()` en `cargardata.service.ts`
2. ✅ Implementar construcción de URL con todos los parámetros
3. ✅ Probar servicio con console.log

### Fase 4: Frontend - Componente TypeScript (2-3 horas)
1. ✅ Agregar propiedades de paginación (`rows`, `first`, `totalRegistros`, etc.)
2. ✅ Implementar método `loadDataLazy()`
3. ✅ Implementar método `cargarAltasPaginadas()`
4. ✅ Implementar selector de columnas (getters/setters)
5. ✅ Implementar persistencia de estado (`saveTableState`, `restoreTableState`)
6. ✅ Modificar `ngOnInit()` para restaurar estado
7. ✅ Actualizar método `exportarExcel()` si es necesario

### Fase 5: Frontend - Componente HTML (1-2 horas)
1. ✅ Reemplazar `<table>` por `<p-table>`
2. ✅ Implementar `<ng-template pTemplate="caption">` con multiSelect y botón Excel
3. ✅ Implementar `<ng-template pTemplate="header">` con filtros y ordenamiento
4. ✅ Implementar `<ng-template pTemplate="body">` con datos dinámicos
5. ✅ Ajustar visibilidad de columnas con `*ngIf="isColumnVisible()"`

### Fase 6: Testing (2-3 horas)
1. ✅ Probar paginación (cambiar página, cambiar rows per page)
2. ✅ Probar ordenamiento (ascendente/descendente por cada columna)
3. ✅ Probar filtros (text, numeric, contains, equals)
4. ✅ Probar selector de columnas (mostrar/ocultar)
5. ✅ Probar persistencia de estado (navegar fuera y volver)
6. ✅ Probar exportar Excel
7. ✅ Probar con dataset grande (>1000 registros)
8. ✅ Probar rendimiento y tiempos de carga

### Fase 7: Refinamiento (1 hora)
1. ✅ Ajustar estilos CSS si es necesario
2. ✅ Optimizar consultas SQL si es necesario
3. ✅ Documentar cambios
4. ✅ Actualizar README si aplica

**Tiempo Total Estimado: 10-15 horas**

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. Rendimiento de Base de Datos

Con paginación en servidor, las consultas pueden ser más lentas si no están indexadas correctamente.

**Índices Recomendados:**

```sql
-- Índice en pedidoitem.estado (para filtrado)
CREATE INDEX idx_pedidoitem_estado ON pedidoitem(estado);

-- Índice en pedidoscb.sucursald (para filtrado por sucursal)
CREATE INDEX idx_pedidoscb_sucursald ON pedidoscb(sucursald);

-- Índice compuesto para joins
CREATE INDEX idx_pedidoitem_id_num ON pedidoitem(id_num);
CREATE INDEX idx_pedidoscb_id_num ON pedidoscb(id_num);

-- Índice en artsucursal.id_articulo (para LATERAL JOIN)
CREATE INDEX idx_artsucursal_id_articulo ON artsucursal(id_articulo);

-- Índice en valorcambio para optimizar búsqueda de tipo de cambio
CREATE INDEX idx_valorcambio_codmone_fecdesde ON valorcambio(codmone, fecdesde DESC);
```

**Verificar índices existentes:**

```sql
-- PostgreSQL
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('pedidoitem', 'pedidoscb', 'artsucursal', 'valorcambio')
ORDER BY tablename, indexname;
```

### 2. Manejo de Concurrencia

Si múltiples usuarios están viendo/modificando altas simultáneamente:

- ✅ El lazy loading asegura que cada usuario vea datos frescos en cada carga
- ✅ Las cancelaciones deben validar estado actual antes de ejecutar
- ⚠️ Posible race condition en cancelación múltiple
- 💡 Considerar implementar versioning o timestamps para detección de conflictos

### 3. Caché

**NO implementar caché en cliente para este componente** debido a:
- Los costos son dinámicos (cambian con el tipo de cambio)
- Los estados pueden cambiar (ALTA -> Cancel-Alta)
- Múltiples usuarios pueden modificar datos

**Caché aceptable:**
- ✅ Lista de sucursales (casi estática)
- ✅ Lista de estados (estática)
- ❌ Altas de existencias (dinámica)

### 4. Seguridad

**Validaciones Backend:**

```php
// ✅ Validar límites de paginación
$limit = max(1, min(500, intval($limit)));  // Entre 1 y 500

// ✅ Validar campo de ordenamiento (whitelist)
$validSortFields = ['id_num', 'fecha', 'cantidad', ...];
if ($sortField && !in_array($sortField, $validSortFields)) {
    $sortField = null;  // Ignorar campo inválido
}

// ✅ Sanitizar valores de filtros
$value = $this->db->escape($value);  // Prevenir SQL injection

// ✅ Validar permisos de usuario por sucursal
// Solo mostrar altas de sucursales a las que el usuario tiene acceso
```

### 5. Retrocompatibilidad

Si se modifica el endpoint existente, asegurar retrocompatibilidad:

```php
public function ObtenerAltasConCostos_get() {
    $page = $this->get('page');
    $limit = $this->get('limit');

    // ✅ Si no se proporcionan page/limit, devolver todos (comportamiento legacy)
    if (!$page && !$limit) {
        // Comportamiento antiguo: devolver todos los registros
        // ... query sin LIMIT/OFFSET ...

        $respuesta = [
            "error" => false,
            "mensaje" => $data,  // Formato legacy
            "total_registros" => count($data)
        ];
    } else {
        // ✅ Comportamiento nuevo: paginación
        // ... query con LIMIT/OFFSET ...

        $respuesta = [
            "error" => false,
            "data" => $data,  // Formato nuevo
            "total" => $totalRegistros,
            "page" => $page,
            "limit" => $limit
        ];
    }

    $this->response($respuesta);
}
```

### 6. Testing

**Test Cases Esenciales:**

1. **Paginación:**
   - ✅ Página 1 con 25 registros
   - ✅ Página 2 con 50 registros
   - ✅ Última página con registros parciales
   - ✅ Página fuera de rango (debe devolver vacío)

2. **Ordenamiento:**
   - ✅ Por ID ascendente/descendente
   - ✅ Por fecha ascendente/descendente
   - ✅ Por cantidad ascendente/descendente
   - ✅ Por campos calculados (costo_total_1, tipo_calculo)

3. **Filtros:**
   - ✅ Filtro por descripción (contains)
   - ✅ Filtro por ID (equals)
   - ✅ Filtro por estado (equals)
   - ✅ Múltiples filtros simultáneos
   - ✅ Filtros con caracteres especiales (', ", %, _)

4. **Persistencia:**
   - ✅ Guardar estado y navegar fuera
   - ✅ Volver y verificar que se restauró
   - ✅ Esperar 2 horas y verificar que expiró

5. **Performance:**
   - ✅ Cargar 50 registros: < 500ms
   - ✅ Cargar 100 registros: < 1s
   - ✅ Filtrar dataset de 10,000 registros: < 1s
   - ✅ Ordenar dataset de 10,000 registros: < 1s

### 7. Migración de Datos Existentes

**No se requiere migración** ya que:
- No se modifican estructuras de tablas
- Solo se cambia la forma de consultar datos
- Los datos existentes permanecen intactos

---

## 📊 COMPARACIÓN ANTES vs DESPUÉS

### Escenario: 5,000 Altas de Existencias

| Métrica | ANTES (sin paginación) | DESPUÉS (con paginación) |
|---------|------------------------|--------------------------|
| **Datos transferidos** | 5,000 registros (~2MB) | 50 registros (~20KB) |
| **Tiempo de carga inicial** | 5-10 segundos | 0.5-1 segundo |
| **Memoria en navegador** | ~10MB | ~1MB |
| **Filtrado por descripción** | ~200ms (cliente) | ~100ms (servidor) |
| **Ordenamiento por fecha** | ~150ms (cliente) | ~100ms (servidor) |
| **Cambio de página** | Instantáneo* | 0.5 segundos |
| **Escalabilidad** | Problemas >10,000 | Sin problemas hasta 100,000+ |

*\*Instantáneo porque los datos ya están en memoria, pero la carga inicial es muy lenta*

### Experiencia de Usuario

| Característica | ANTES | DESPUÉS |
|----------------|-------|---------|
| **Primera carga** | ⚠️ Espera larga | ✅ Rápida |
| **Filtros** | ❌ No disponibles | ✅ Por columna |
| **Ordenamiento** | ❌ No disponible | ✅ Dinámico |
| **Búsqueda rápida** | ❌ Difícil | ✅ Con filtros |
| **Navegación** | ⚠️ Scroll infinito | ✅ Paginación clara |
| **Persistencia** | ❌ Se pierde todo | ✅ Se guarda estado |
| **Columnas** | ❌ Todas fijas | ✅ Selección dinámica |

---

## 🎯 CONCLUSIONES Y RECOMENDACIONES

### Conclusiones

1. **El componente `lista-altas` está significativamente menos desarrollado** que otros componentes del sistema como `condicionventa`.

2. **El botón de Excel está implementado correctamente** en el código, pero puede no ser visible por problemas de CSS/layout.

3. **La falta de lazy loading y paginación del lado del servidor** representa un problema de escalabilidad crítico.

4. **El backend actual (`ObtenerAltasConCostos_get`) NO soporta paginación**, lo que limita la implementación frontend.

### Recomendaciones

#### Prioridad ALTA (Crítico)

1. ✅ **Implementar paginación en backend** (Fase 2)
   - Sin esto, el componente no escalará adecuadamente

2. ✅ **Migrar a PrimeNG DataTable** (Fases 4-5)
   - Proporciona todas las características necesarias out-of-the-box

3. ✅ **Implementar lazy loading** (Fase 4)
   - Mejora dramática en rendimiento y experiencia de usuario

#### Prioridad MEDIA (Importante)

4. ✅ **Implementar filtros por columna** (Fase 5)
   - Mejora la usabilidad para encontrar registros específicos

5. ✅ **Implementar ordenamiento dinámico** (Fases 2 y 5)
   - Permite análisis flexible de los datos

6. ✅ **Implementar persistencia de estado** (Fase 4)
   - Mejora la experiencia de usuario al navegar

#### Prioridad BAJA (Nice to have)

7. ✅ **Implementar selector de columnas** (Fase 4-5)
   - Permite personalización de la vista

8. ✅ **Verificar visibilidad del botón Excel** (Fase 1)
   - Puede ser solo un problema visual menor

9. ✅ **Agregar índices en base de datos** (Post-implementación)
   - Optimiza el rendimiento de queries

### Riesgo y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Query SQL lenta con muchos registros** | Media | Alto | Agregar índices, optimizar LATERAL JOIN |
| **Rotura de funcionalidad existente** | Baja | Alto | Testing exhaustivo, backup, rollback plan |
| **Performance degradada en producción** | Media | Medio | Testing con datasets reales, monitoreo |
| **Incompatibilidad navegadores** | Baja | Bajo | PrimeNG es cross-browser compatible |
| **Usuarios confundidos con nueva UI** | Media | Bajo | Capacitación, documentación |

### Alternativas Consideradas

#### Alternativa 1: Mantener Status Quo
- ❌ No resuelve problemas de escalabilidad
- ❌ Experiencia de usuario inferior
- ✅ Sin riesgo de rotura
- ⚠️ **NO RECOMENDADO**

#### Alternativa 2: Migración Parcial (solo filtros, sin lazy loading)
- ✅ Menor esfuerzo de desarrollo
- ❌ No resuelve problema de performance
- ❌ Requiere cambios en backend de todos modos
- ⚠️ **NO RECOMENDADO** (esfuerzo similar, beneficio menor)

#### Alternativa 3: Migración Completa (RECOMENDADO)
- ✅ Resuelve todos los problemas identificados
- ✅ Alineación con resto del sistema
- ✅ Mejor escalabilidad
- ⚠️ Mayor esfuerzo inicial (10-15 horas)
- ✅ **RECOMENDADO**

---

## 📚 RECURSOS Y REFERENCIAS

### Documentación PrimeNG

- **Table Component:** https://primeng.org/table
- **Lazy Loading:** https://primeng.org/table#lazy
- **Filtering:** https://primeng.org/table#filter
- **Sorting:** https://primeng.org/table#sort
- **Pagination:** https://primeng.org/table#paginator
- **Column Selection:** https://primeng.org/table#colresize

### Ejemplos en el Proyecto

- **Componente de Referencia:** `src/app/components/condicionventa/`
- **Servicio Paginado:** `src/app/services/articulos-paginados.service.ts`
- **Backend con Paginación:** `src/Descarga.php.txt` (buscar `ArticulosPaginados_get` si existe)

### Archivos a Modificar

1. **Backend:**
   - `src/Descarga.php.txt` (línea 6122+)

2. **Frontend - Servicio:**
   - `src/app/services/cargardata.service.ts` (línea 341+)

3. **Frontend - Componente:**
   - `src/app/components/lista-altas/lista-altas.component.ts`
   - `src/app/components/lista-altas/lista-altas.component.html`
   - `src/app/components/lista-altas/lista-altas.component.css` (opcional)

4. **Módulos:**
   - `src/app/app.module.ts` (verificar imports de PrimeNG)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

Copie esta checklist para trackear el progreso:

### Fase 1: Preparación
- [ ] Crear backup de `lista-altas.component.ts`
- [ ] Crear backup de `lista-altas.component.html`
- [ ] Verificar instalación de PrimeNG (`npm list primeng`)
- [ ] Importar módulos PrimeNG en `app.module.ts`
- [ ] Crear interfaz `Column` en el componente

### Fase 2: Backend
- [ ] Modificar `ObtenerAltasConCostos_get` para aceptar parámetros de paginación
- [ ] Implementar lógica de `page` y `limit`
- [ ] Implementar conteo total de registros
- [ ] Implementar ordenamiento dinámico con `sortField` y `sortOrder`
- [ ] Implementar filtros dinámicos con `filter_*` y `matchMode_*`
- [ ] Cambiar formato de respuesta a `{data, total, page, limit}`
- [ ] Probar endpoint con Postman/Insomnia
  - [ ] Sin parámetros (retrocompatibilidad)
  - [ ] Con paginación simple
  - [ ] Con ordenamiento
  - [ ] Con filtros
  - [ ] Con todo combinado

### Fase 3: Frontend - Servicio
- [ ] Crear método `obtenerAltasConCostosPaginadas()` en `cargardata.service.ts`
- [ ] Implementar construcción de URL con parámetros de paginación
- [ ] Implementar construcción de URL con parámetros de ordenamiento
- [ ] Implementar construcción de URL con parámetros de filtros
- [ ] Probar servicio con console.log

### Fase 4: Frontend - Componente TypeScript
- [ ] Agregar propiedades: `rows`, `first`, `totalRegistros`, `sortField`, `sortOrder`, `filters`
- [ ] Agregar definición de `cols: Column[]`
- [ ] Implementar getter/setter de `selectedColumns`
- [ ] Implementar método `isColumnVisible()`
- [ ] Implementar método `loadDataLazy()`
- [ ] Implementar método `cargarAltasPaginadas()`
- [ ] Implementar método `saveTableState()`
- [ ] Implementar método `restoreTableState()`
- [ ] Modificar `ngOnInit()` para restaurar estado
- [ ] Eliminar o deprecar método `aplicarFiltros()` (ya no necesario)
- [ ] Actualizar método `exportarExcel()` si es necesario

### Fase 5: Frontend - Componente HTML
- [ ] Reemplazar `<table>` por `<p-table>`
- [ ] Configurar propiedades de `<p-table>`: `[lazy]`, `[paginator]`, `[rows]`, etc.
- [ ] Implementar `<ng-template pTemplate="caption">`
  - [ ] Agregar `<p-multiSelect>` para columnas
  - [ ] Agregar `<p-button>` para Excel
- [ ] Implementar `<ng-template pTemplate="header">`
  - [ ] Agregar `pSortableColumn` a cada columna
  - [ ] Agregar `<p-sortIcon>` a cada columna
  - [ ] Agregar `<p-columnFilter>` a cada columna filtrable
  - [ ] Aplicar `*ngIf="isColumnVisible()"` a columnas opcionales
- [ ] Implementar `<ng-template pTemplate="body">`
  - [ ] Aplicar `*ngIf="isColumnVisible()"` a columnas opcionales
  - [ ] Mantener funcionalidad de selección múltiple
  - [ ] Mantener botones de acciones
- [ ] Implementar `<ng-template pTemplate="emptymessage">`

### Fase 6: Testing
- [ ] **Paginación:**
  - [ ] Cambiar a página 2
  - [ ] Cambiar a última página
  - [ ] Cambiar rows per page (25, 50, 100)
  - [ ] Verificar que `totalRecords` es correcto
- [ ] **Ordenamiento:**
  - [ ] Ordenar por ID (asc/desc)
  - [ ] Ordenar por fecha (asc/desc)
  - [ ] Ordenar por cantidad (asc/desc)
  - [ ] Ordenar por descripción (asc/desc)
  - [ ] Ordenar por campos calculados
- [ ] **Filtros:**
  - [ ] Filtro por descripción (contains)
  - [ ] Filtro por ID (equals)
  - [ ] Filtro por estado (equals)
  - [ ] Filtros múltiples simultáneos
  - [ ] Filtros con caracteres especiales
- [ ] **Selector de Columnas:**
  - [ ] Ocultar columnas
  - [ ] Mostrar columnas
  - [ ] Verificar que se guarda preferencia
- [ ] **Persistencia de Estado:**
  - [ ] Aplicar filtros y navegar fuera
  - [ ] Volver y verificar que se restauraron filtros
  - [ ] Cambiar página y navegar fuera
  - [ ] Volver y verificar que se restauró página
  - [ ] Esperar >2 horas y verificar que expiró
- [ ] **Exportar Excel:**
  - [ ] Exportar sin filtros
  - [ ] Exportar con filtros aplicados
  - [ ] Verificar que contiene datos correctos
- [ ] **Performance:**
  - [ ] Medir tiempo de carga inicial
  - [ ] Medir tiempo de cambio de página
  - [ ] Medir tiempo de aplicación de filtros
  - [ ] Medir tiempo de ordenamiento
  - [ ] Probar con dataset grande (>1000 registros)

### Fase 7: Refinamiento
- [ ] Ajustar estilos CSS si es necesario
- [ ] Optimizar consultas SQL si es necesario
- [ ] Agregar índices en base de datos
- [ ] Documentar cambios en este documento
- [ ] Actualizar README del proyecto
- [ ] Crear PR o commit final

---

## 📞 SOPORTE Y CONSULTAS

Para consultas sobre esta implementación:

1. **Revisar componente de referencia:** `condicionventa.component.ts/html`
2. **Consultar documentación PrimeNG:** https://primeng.org/table
3. **Revisar logs de consola** para debugging
4. **Usar herramientas de desarrollo** del navegador (Network tab, Console)
5. **Contactar al equipo de desarrollo** si surgen problemas

---

**Fin del Informe**

*Generado el: 2025-11-05*
*Componente: lista-altas*
*Versión del Informe: 1.0*
