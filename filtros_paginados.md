# Guía de Implementación: Tablas con Filtros Paginados

Esta guía establece el patrón estándar para implementar tablas con lazy loading, filtros por columna y paginación del servidor en el proyecto MotoApp.

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Pre-requisitos y Preparación](#pre-requisitos-y-preparación)
3. [Migración desde Componente Existente](#migración-desde-componente-existente)
4. [Backend (PHP/CodeIgniter)](#backend-phpcodeigniter)
5. [Service Angular](#service-angular)
6. [Componente Angular](#componente-angular)
7. [Template HTML](#template-html)
8. [Gestión de Estado vs Nuevas Columnas](#gestión-de-estado-vs-nuevas-columnas)
9. [Checklist de Implementación](#checklist-de-implementación)
10. [Troubleshooting](#troubleshooting)
11. [Casos de Estudio](#casos-de-estudio)

---

## 🏗️ Arquitectura General

### Flujo de Datos
```
Usuario aplica filtro → PrimeNG LazyLoadEvent → Service Angular → Backend PHP → Base de Datos → Respuesta JSON → Service → Componente → UI actualizada
```

### Principios Clave
- **Lazy Loading**: Solo cargar datos de la página actual
- **Server-side Filtering**: Todos los filtros se procesan en el backend
- **State Persistence**: Los filtros y estado de tabla se mantienen entre navegaciones
- **Columnas Estáticas**: Para mantener el estado de filtros en PrimeNG

---

## 📦 Pre-requisitos y Preparación

### Imports Necesarios

```typescript
import { LazyLoadEvent } from 'primeng/api';
import { Component, OnInit, OnDestroy } from '@angular/core';
```

### Service Requirements

- ✅ El service DEBE tener implementado `cargarPaginaConFiltros()`
- ✅ Verificar en: `ArticulosPaginadosService.ts:274-339`
- ✅ Backend endpoint debe soportar parámetros: `page`, `limit`, `sortField`, `sortOrder`, `filters`

### Crear Backup

```bash
# OBLIGATORIO antes de migrar
cp componente.component.ts componente.component.ts.backup
cp componente.component.html componente.component.html.backup
```

---

## 🔄 Migración desde Componente Existente

### ⚠️ IMPORTANTE: Esta sección es para componentes que YA tienen tabla y paginación manual

### 1. Identificar Puntos de Carga de Datos

Buscar todos los lugares donde se cargan datos:
```typescript
// Puntos típicos a actualizar:
- Constructor
- ngOnInit()  
- Formularios específicos (tarjeta, cheque, etc.)
- Métodos de refresh/reload
- Métodos de búsqueda
```

### 2. Marcar Métodos Obsoletos

```typescript
// ❌ MARCAR COMO OBSOLETO - No eliminar inmediatamente
public buscarProductos(termino: string): void {
  console.log('buscarProductos: Método obsoleto, usar filtros PrimeNG');
}

public paginaSiguiente(): void {
  console.log('paginaSiguiente: Método obsoleto, PrimeNG maneja paginación automáticamente');
}

public irAPagina(pagina: number): void {
  console.log('irAPagina: Método obsoleto, PrimeNG maneja paginación automáticamente');
}

private setupSearchDebounce(): void {
  console.log('setupSearchDebounce: Método obsoleto, lazy loading activo');
}
```

### 3. Patrón de Actualización de Cargas

```typescript
// ❌ ANTES - Paginación manual
this.articulosPaginadosService.cargarPagina(1).subscribe()

// ✅ DESPUÉS - Lazy loading
this.loadDataLazy({
  first: 0,
  rows: this.rows,
  sortField: this.sortField,
  sortOrder: this.sortOrder,
  filters: this.filters
}).then(() => {
  Swal.close();
}).catch(error => {
  console.error('Error:', error);
  Swal.close();
});
```

### 4. Actualizar Template HTML

```html
<!-- ❌ ELIMINAR: Paginación manual -->
<div class="pagination-container">
  <button (click)="paginaAnterior()">Anterior</button>
  <!-- ... más botones ... -->
</div>

<!-- ❌ ELIMINAR: Binding dinámico de columnas -->
[columns]="selectedColumns"

<!-- ❌ ELIMINAR: Búsqueda manual -->
<input [(ngModel)]="terminoBusqueda" (keyup.enter)="buscarProductos()">

<!-- ✅ AGREGAR: Lazy loading -->
[lazy]="true"
[paginator]="true" 
[totalRecords]="totalRegistros"
(onLazyLoad)="loadDataLazy($event)"
```

---

## 🔧 Backend (PHP/CodeIgniter)

### 1. Estructura del Endpoint

```php
public function TuTabla_get() {
    // 1. Obtener parámetros
    $page = $this->input->get('page', TRUE) ?: 1;
    $limit = $this->input->get('limit', TRUE) ?: 50;
    $sortField = $this->input->get('sortField', TRUE);
    $sortOrder = $this->input->get('sortOrder', TRUE) ?: 1;
    $filters = $this->input->get('filters', TRUE);
    $search = $this->input->get('search', TRUE);

    // 2. Validar parámetros
    $page = max(1, intval($page));
    $limit = min(100, max(1, intval($limit)));
    $offset = ($page - 1) * $limit;

    try {
        // 3. Construir consulta base
        $this->db->select('campo1, campo2, campo3, ...');
        $this->db->from('tu_tabla');
        
        // 4. Aplicar búsqueda global (opcional)
        if (!empty($search)) {
            $this->db->group_start();
            $this->db->like('campo1', $search);
            $this->db->or_like('campo2', $search);
            $this->db->group_end();
        }
        
        // 5. Aplicar filtros por columna
        if (!empty($filters)) {
            $this->applyColumnFilters($filters);
        }
        
        // 6. Contar registros totales (antes de paginación)
        $totalQuery = clone $this->db;
        $total = $totalQuery->count_all_results();
        
        // 7. Aplicar ordenamiento
        if ($sortField && $this->isValidField($sortField)) {
            $sortDirection = ($sortOrder == 1) ? 'ASC' : 'DESC';
            $this->db->order_by($sortField, $sortDirection);
        } else {
            $this->db->order_by('id', 'DESC'); // Orden por defecto
        }
        
        // 8. Aplicar paginación
        $this->db->limit($limit, $offset);
        
        // 9. Ejecutar consulta
        $query = $this->db->get();
        $data = $query->result_array();
        
        // 10. Calcular metadatos
        $totalPages = ceil($total / $limit);
        
        // 11. Respuesta estructurada
        $response = [
            'error' => false,
            'mensaje' => [
                'data' => $data,
                'total' => intval($total),
                'total_pages' => intval($totalPages),
                'current_page' => intval($page),
                'per_page' => intval($limit)
            ]
        ];
        
        $this->response($response, 200);
        
    } catch (Exception $e) {
        $this->response([
            'error' => true,
            'mensaje' => 'Error en el servidor: ' . $e->getMessage()
        ], 500);
    }
}
```

### 2. Método de Filtros por Columna

```php
private function applyColumnFilters($filtersJson) {
    try {
        $filters = json_decode($filtersJson, true);
        
        if (!is_array($filters)) {
            return;
        }
        
        foreach ($filters as $field => $filterArray) {
            if (!$this->isValidField($field) || !is_array($filterArray) || empty($filterArray)) {
                continue;
            }
            
            // PrimeNG envía filtros como array de objetos
            $firstFilter = $filterArray[0];
            
            if (!isset($firstFilter['value']) || $firstFilter['value'] === '' || $firstFilter['value'] === null) {
                continue;
            }
            
            $value = $firstFilter['value'];
            $matchMode = $firstFilter['matchMode'] ?? 'contains';
            
            // Aplicar filtro según el modo
            switch ($matchMode) {
                case 'equals':
                    $this->db->where($field, $value);
                    break;
                case 'contains':
                    $this->db->like($field, $value);
                    break;
                case 'startsWith':
                    $this->db->like($field, $value, 'after');
                    break;
                case 'endsWith':
                    $this->db->like($field, $value, 'before');
                    break;
                case 'lt':
                    $this->db->where($field . ' <', $value);
                    break;
                case 'lte':
                    $this->db->where($field . ' <=', $value);
                    break;
                case 'gt':
                    $this->db->where($field . ' >', $value);
                    break;
                case 'gte':
                    $this->db->where($field . ' >=', $value);
                    break;
                default:
                    $this->db->like($field, $value);
            }
        }
    } catch (Exception $e) {
        // Log error pero continuar
        log_message('error', 'Error aplicando filtros: ' . $e->getMessage());
    }
}
```

### 3. Validación de Campos

```php
private function isValidField($field) {
    // Lista de campos válidos para tu tabla
    $validFields = [
        'campo1',
        'campo2', 
        'campo3',
        'fecha_creacion',
        'estado',
        // ... todos los campos permitidos
    ];
    
    return in_array($field, $validFields);
}
```

---

## 📡 Service Angular

### 1. Estructura Base del Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TuTablaPaginadosService {
  private baseUrl = 'tu-url-base';
  
  // BehaviorSubjects para estado reactivo
  private itemsSubject = new BehaviorSubject<any[]>([]);
  private totalItemsSubject = new BehaviorSubject<number>(0);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  
  // Observables públicos
  public items$ = this.itemsSubject.asObservable();
  public totalItems$ = this.totalItemsSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  
  constructor(private http: HttpClient) {}
  
  // Método principal para lazy loading
  cargarPaginaConFiltros(
    page: number,
    limit: number,
    sortField?: string,
    sortOrder: number = 1,
    filters: any = {}
  ): Observable<any> {
    this.cargandoSubject.next(true);
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Agregar ordenamiento
    if (sortField) {
      params.append('sortField', sortField);
      params.append('sortOrder', sortOrder.toString());
    }
    
    // Agregar filtros
    if (filters && Object.keys(filters).length > 0) {
      params.append('filters', JSON.stringify(filters));
    }
    
    const urlCompleta = `${this.baseUrl}?${params.toString()}`;
    
    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        if (response && !response.error && response.mensaje) {
          const data = response.mensaje.data || [];
          this.itemsSubject.next(data);
          this.totalItemsSubject.next(response.mensaje.total || 0);
        } else {
          this.itemsSubject.next([]);
          this.totalItemsSubject.next(0);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error en lazy loading:', error);
        this.cargandoSubject.next(false);
        this.itemsSubject.next([]);
        this.totalItemsSubject.next(0);
        return throwError(error);
      })
    );
  }
}
```

---

## 🎨 Componente Angular

### 1. Propiedades del Componente

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { LazyLoadEvent } from 'primeng/api';
import { Subscription } from 'rxjs';

export class TuTablaComponent implements OnInit, OnDestroy {
  // Datos de la tabla
  items: any[] = [];
  totalRegistros: number = 0;
  loading: boolean = false;
  
  // Propiedades para lazy loading
  first: number = 0;
  rows: number = 50;
  sortField: string | undefined;
  sortOrder: number = 1;
  filters: any = {};
  
  // Configuración de columnas
  cols: Column[] = [
    { field: 'campo1', header: 'Campo 1' },
    { field: 'campo2', header: 'Campo 2' },
    // ... más columnas
  ];
  
  _selectedColumns: Column[] = [];
  
  private subscriptions: Subscription[] = [];
  
  constructor(private tuTablaService: TuTablaPaginadosService) {
    // Configurar columnas visibles por defecto
    this._selectedColumns = [
      this.cols[0], // campo1
      this.cols[1], // campo2
      // ... columnas visibles por defecto
    ];
  }
  
  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }
  
  set selectedColumns(val: Column[]) {
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }
}
```

### 2. Métodos Principales

```typescript
ngOnInit() {
  // Restaurar estado de tabla
  this.restoreTableState();
  
  // Suscribirse a cambios de datos
  this.subscriptions.push(
    this.tuTablaService.items$.subscribe(items => {
      this.items = items;
    }),
    this.tuTablaService.totalItems$.subscribe(total => {
      this.totalRegistros = total;
    }),
    this.tuTablaService.cargando$.subscribe(loading => {
      this.loading = loading;
    })
  );
  
  // Cargar datos iniciales
  setTimeout(() => {
    if (this.items.length === 0 && !this.loading) {
      this.loadDataLazy({
        first: this.first,
        rows: this.rows,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        filters: this.filters
      });
    }
  }, 1000);
}

async loadDataLazy(event: LazyLoadEvent): Promise<void> {
  console.log('🔄 loadDataLazy - Evento:', event);
  
  // Actualizar propiedades
  this.first = event.first || 0;
  this.rows = event.rows || 50;
  this.sortField = event.sortField;
  this.sortOrder = event.sortOrder || 1;
  this.filters = event.filters || {};
  
  // Guardar estado
  this.saveTableState();
  
  // Calcular página
  const page = Math.floor(this.first / this.rows) + 1;
  
  try {
    await this.tuTablaService.cargarPaginaConFiltros(
      page,
      this.rows,
      this.sortField,
      this.sortOrder,
      this.filters
    ).toPromise();
  } catch (error) {
    console.error('Error en loadDataLazy:', error);
  }
}

// Métodos de persistencia de estado
private saveTableState(): void {
  try {
    const state = {
      first: this.first,
      rows: this.rows,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
      filters: this.filters,
      selectedColumns: this._selectedColumns,
      timestamp: Date.now()
    };
    
    localStorage.setItem('tu_tabla_state', JSON.stringify(state));
  } catch (error) {
    console.warn('Error guardando estado:', error);
  }
}

private restoreTableState(): void {
  try {
    const savedState = localStorage.getItem('tu_tabla_state');
    
    if (savedState) {
      const state = JSON.parse(savedState);
      
      // Verificar que no sea muy viejo (2 horas)
      const isValid = state.timestamp && (Date.now() - state.timestamp) < (2 * 60 * 60 * 1000);
      
      if (isValid) {
        this.first = state.first || 0;
        this.rows = state.rows || 50;
        this.sortField = state.sortField;
        this.sortOrder = state.sortOrder || 1;
        this.filters = state.filters || {};
        
        if (state.selectedColumns) {
          this._selectedColumns = state.selectedColumns;
        }
      }
    }
  } catch (error) {
    console.warn('Error restaurando estado:', error);
  }
}

// Método para verificar visibilidad de columnas
isColumnVisible(field: string): boolean {
  return this._selectedColumns.some(col => col.field === field);
}

// Método para cambios en selección de columnas
onColumnSelectionChange(): void {
  this.saveTableState();
}

ngOnDestroy() {
  this.subscriptions.forEach(sub => sub.unsubscribe());
}
```

---

## 🎯 Template HTML

### Configuración de p-table

```html
<div class="card">
  <div class="card-body">
    <h4 class="card-title">Tu Tabla</h4>
    
    <!-- Loading indicator -->
    <div class="alert alert-warning mb-3" *ngIf="loading">
      <i class="fa fa-spinner fa-spin mr-2"></i> 
      Cargando datos, por favor espere...
    </div>
    
    <!-- Tabla con lazy loading -->
    <p-table 
      #dtable 
      [value]="items" 
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
      
      <!-- Caption con controles -->
      <ng-template pTemplate="caption">
        <div class="d-flex flex-row align-items-center">
          <!-- Selector de columnas -->
          <div class="columnas-container">
            <p-multiSelect 
              [options]="cols" 
              [(ngModel)]="selectedColumns" 
              optionLabel="header"
              selectedItemsLabel="{0} Columnas Seleccionadas" 
              placeholder="Elija Columnas"
              (onChange)="onColumnSelectionChange()">
            </p-multiSelect>
          </div>
          
          <!-- Botones adicionales -->
          <div class="ml-2">
            <p-button icon="pi pi-file-excel" (click)="exportExcel()"
              styleClass="p-button-success"></p-button>
          </div>
        </div>
      </ng-template>
      
      <!-- Header con filtros -->
      <ng-template pTemplate="header">
        <tr>
          <!-- Columnas estáticas con filtros -->
          <th *ngIf="isColumnVisible('campo1')" pSortableColumn="campo1">
            Campo 1
            <p-sortIcon field="campo1"></p-sortIcon>
            <p-columnFilter type="text" field="campo1" display="menu" matchMode="contains"></p-columnFilter>
          </th>
          
          <th *ngIf="isColumnVisible('campo2')" pSortableColumn="campo2">
            Campo 2
            <p-sortIcon field="campo2"></p-sortIcon>
            <p-columnFilter type="text" field="campo2" display="menu" matchMode="contains"></p-columnFilter>
          </th>
          
          <th *ngIf="isColumnVisible('numero')" pSortableColumn="numero">
            Número
            <p-sortIcon field="numero"></p-sortIcon>
            <p-columnFilter type="numeric" field="numero" display="menu" matchMode="equals"></p-columnFilter>
          </th>
          
          <!-- Más columnas... -->
          
          <th>Acciones</th>
        </tr>
      </ng-template>
      
      <!-- Body de la tabla -->
      <ng-template pTemplate="body" let-item>
        <tr>
          <td *ngIf="isColumnVisible('campo1')">{{ item.campo1 }}</td>
          <td *ngIf="isColumnVisible('campo2')">{{ item.campo2 }}</td>
          <td *ngIf="isColumnVisible('numero')">{{ item.numero }}</td>
          <!-- Más columnas... -->
          
          <td>
            <p-button icon="pi pi-pencil" styleClass="p-button-sm p-button-help"
              (click)="editItem(item)"></p-button>
            <p-button icon="pi pi-trash" styleClass="p-button-sm p-button-danger"
              (click)="deleteItem(item)"></p-button>
          </td>
        </tr>
      </ng-template>
      
      <!-- Empty message -->
      <ng-template pTemplate="emptymessage">
        <tr>
          <td [attr.colspan]="getColumnCount()" class="text-center p-4">
            <div *ngIf="loading">
              <i class="fa fa-spinner fa-spin fa-2x mb-2"></i>
              <p>Cargando datos...</p>
            </div>
            <div *ngIf="!loading">
              <i class="fa fa-database fa-2x mb-2"></i>
              <p>No se encontraron registros</p>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
  </div>
</div>
```

### Tipos de Filtros por Columna

```html
<!-- Filtro de texto -->
<p-columnFilter type="text" field="nombre" display="menu" matchMode="contains"></p-columnFilter>

<!-- Filtro numérico -->
<p-columnFilter type="numeric" field="precio" display="menu" matchMode="equals"></p-columnFilter>

<!-- Filtro de fecha -->
<p-columnFilter type="date" field="fecha" display="menu"></p-columnFilter>

<!-- Filtro booleano -->
<p-columnFilter type="boolean" field="activo" display="menu"></p-columnFilter>

<!-- Filtro personalizado -->
<p-columnFilter field="estado" matchMode="equals" display="menu">
  <ng-template pTemplate="filter" let-value let-filter="filterCallback">
    <p-dropdown [ngModel]="value" [options]="estadoOptions" 
      (onChange)="filter($event.value)" placeholder="Seleccionar">
    </p-dropdown>
  </ng-template>
</p-columnFilter>
```

---

## 💾 Gestión de Estado vs Nuevas Columnas

### ⚠️ Problema Frecuente: localStorage Override

Al agregar nuevas columnas a un componente existente, el estado guardado en `localStorage` puede no incluir las nuevas columnas, causando que no aparezcan por defecto.

### Síntomas:
- La nueva columna aparece en el selector pero no está seleccionada por defecto
- Los filtros funcionan pero la columna no es visible

### Solución Temporal (Durante Desarrollo):

```typescript
private restoreTableState(): void {
  try {
    const savedState = localStorage.getItem('tu_componente_table_state');
    
    if (savedState) {
      const state = JSON.parse(savedState);
      const isValidState = state.timestamp && (Date.now() - state.timestamp) < (2 * 60 * 60 * 1000);
      
      if (isValidState) {
        this.first = state.first || 0;
        this.rows = state.rows || 50;
        this.sortField = state.sortField;
        this.sortOrder = state.sortOrder || 1;
        this.filters = state.filters || {};
        
        // 🔧 TEMPORAL: No restaurar selectedColumns para nuevas columnas
        // if (state.selectedColumns && Array.isArray(state.selectedColumns)) {
        //   this._selectedColumns = state.selectedColumns;
        // }
        console.log('🔄 Usando columnas por defecto (incluye nuevas columnas)');
      }
    }
  } catch (error) {
    console.warn('Error restaurando estado de la tabla:', error);
  }
}
```

### Método de Reset Completo:

```typescript
// AGREGAR método para limpiar estado cuando sea necesario
public limpiarEstadoTabla(): void {
  localStorage.removeItem('tu_componente_table_state');
  // Resetear a valores por defecto que incluyen nuevas columnas
  this._selectedColumns = [
    this.cols[0], // columna1
    this.cols[1], // columna2
    // ... 
    this.cols[16], // nueva_columna
  ];
  console.log('✅ Estado de tabla limpiado, usando columnas por defecto actualizadas');
}
```

### Solución Productiva (Versionado de Estado):

```typescript
interface TableState {
  version: number; // ← AGREGAR versionado
  first: number;
  rows: number;
  selectedColumns: Column[];
  // ...
}

private restoreTableState(): void {
  const CURRENT_STATE_VERSION = 2; // ← Incrementar al agregar columnas
  
  if (savedState) {
    const state = JSON.parse(savedState);
    
    // Si la versión es antigua, usar defaults
    if (!state.version || state.version < CURRENT_STATE_VERSION) {
      console.log('🔄 Estado antiguo detectado, usando columnas por defecto actualizadas');
      return; // Usar defaults del constructor
    }
    
    // Restaurar solo si la versión es compatible
    this._selectedColumns = state.selectedColumns;
  }
}
```

### Comando Manual para Usuarios:

```javascript
// En consola del navegador para limpiar estado manualmente:
localStorage.removeItem('condicionventa_table_state');
location.reload();
```

---

## ✅ Checklist de Implementación

### Backend
- [ ] Endpoint recibe parámetros: `page`, `limit`, `sortField`, `sortOrder`, `filters`
- [ ] Método `applyColumnFilters()` implementado
- [ ] Método `isValidField()` para seguridad
- [ ] Respuesta con formato: `{ error: false, mensaje: { data: [], total: 0, total_pages: 0 } }`
- [ ] Manejo de errores con try/catch
- [ ] Validación de parámetros de entrada

### Service Angular
- [ ] BehaviorSubjects para estado reactivo
- [ ] Método `cargarPaginaConFiltros()` implementado
- [ ] Parámetros URL construidos correctamente
- [ ] Manejo de errores con `catchError`
- [ ] Transformación de respuesta a formato esperado

### Componente Angular
- [ ] Propiedades de lazy loading: `first`, `rows`, `sortField`, `sortOrder`, `filters`
- [ ] Método `loadDataLazy()` implementado
- [ ] Persistencia de estado: `saveTableState()` y `restoreTableState()`
- [ ] Método `isColumnVisible()` para columnas estáticas
- [ ] Suscripciones a BehaviorSubjects del service
- [ ] Limpieza de suscripciones en `ngOnDestroy`

### Template HTML
- [ ] `[lazy]="true"` en p-table
- [ ] `(onLazyLoad)="loadDataLazy($event)"` configurado
- [ ] `[totalRecords]` apunta a variable correcta
- [ ] Columnas estáticas con `*ngIf="isColumnVisible()"`
- [ ] Filtros por columna con `p-columnFilter`
- [ ] Sin `[columns]` binding dinámico
- [ ] Selector de columnas con `(onChange)="onColumnSelectionChange()"`

---

## 🔧 Troubleshooting

### Problema: Los filtros se pierden al cambiar página

**Causa**: Columnas dinámicas o falta de persistencia de estado.

**Solución**:
```typescript
// ❌ Incorrecto - Columnas dinámicas
<th *ngFor="let col of selectedColumns">

// ✅ Correcto - Columnas estáticas
<th *ngIf="isColumnVisible('campo1')">
```

### Problema: No se cargan datos iniciales

**Causa**: `lazyLoadOnInit` mal configurado.

**Solución**:
```html
<!-- Agregar timeout de respaldo -->
<p-table [lazyLoadOnInit]="true">
```

```typescript
// En ngOnInit
setTimeout(() => {
  if (this.items.length === 0 && !this.loading) {
    this.loadDataLazy({ first: 0, rows: this.rows });
  }
}, 1000);
```

### Problema: Error de formato en filtros del backend

**Causa**: Backend espera objeto, PrimeNG envía array.

**Solución**:
```php
// ✅ Correcto - Manejar array de filtros
$firstFilter = $filterArray[0];
$value = $firstFilter['value'];
```

### Problema: Pérdida de rendimiento

**Causa**: Consulta de conteo ineficiente.

**Solución**:
```php
// ✅ Usar clone para conteo
$totalQuery = clone $this->db;
$total = $totalQuery->count_all_results();
```

---

## 🎯 Resultado Final

Siguiendo esta guía obtendrás:

- ✅ **Lazy loading** completo con paginación del servidor
- ✅ **Filtros persistentes** que se mantienen entre páginas
- ✅ **Estado de tabla** guardado automáticamente
- ✅ **Rendimiento optimizado** para grandes volúmenes de datos
- ✅ **Código mantenible** siguiendo patrones establecidos

**¡Tu tabla funcionará exactamente como la tabla de artículos!** 🚀

---

## 📚 Casos de Estudio

### Caso 1: Migración de CondicionVenta (Completado)

**Contexto:** Componente con tabla existente, paginación manual, formularios específicos y conversión de monedas.

**Desafíos Encontrados:**
- ❌ Métodos obsoletos de búsqueda y paginación
- ❌ Múltiples puntos de carga de datos (formularios tarjeta/cheque)
- ❌ Estado persistente que no incluía nueva columna depósito
- ❌ Binding dinámico de columnas que rompía filtros

**Soluciones Aplicadas:**
- ✅ Marcado de métodos como obsoletos (no eliminación inmediata)
- ✅ Actualización de 3 puntos de carga: constructor, tarjeta, cheque
- ✅ Temporal disable de `selectedColumns` restoration
- ✅ Cambio a columnas estáticas con `*ngIf="isColumnVisible()"`

**Tiempo de Migración:** 4 horas
**Resultado:** ✅ Éxito total, todas las funcionalidades preservadas

### Caso 2: Migración de Artículos (Referencia)

**Contexto:** Componente base con implementación completa y exitosa.

**Funcionalidades Clave:**
- ✅ Lazy loading con persistencia de estado
- ✅ Filtros por columna con múltiples tipos (text, numeric, date)
- ✅ Conversión de monedas compleja
- ✅ Selector de columnas dinámico
- ✅ Exportación a Excel

**Patrón de Referencia:** `/src/app/components/articulos/`

### Lecciones Aprendidas

1. **Siempre usar componente de referencia:** La implementación en `articulos` fue fundamental para entender el patrón correcto.

2. **Backup obligatorio:** Los archivos `.backup` salvaron tiempo al poder comparar cambios.

3. **Estado vs nuevas columnas:** El problema de localStorage es común al agregar columnas.

4. **Migración gradual:** Marcar como obsoleto primero, eliminar después.

5. **Testing inmediato:** Verificar compilación después de cada cambio mayor.

### Recomendaciones Futuras

- 🔄 **Usar versionado de estado** para evitar problemas con localStorage
- 📋 **Documentar puntos de carga** específicos del componente antes de migrar
- 🧪 **Implementar tests automáticos** para verificar filtros
- 📊 **Monitorear performance** en tablas con muchos registros

---

## 🏆 Componentes Implementados

- ✅ **Artículos** - Referencia base (completado)
- ✅ **CondicionVenta** - Migración exitosa (completado)
- 🔄 **Próximos:** Cajamovi, Stock, Clientes, etc.

**¡Tu tabla funcionará exactamente como la tabla de artículos!** 🚀