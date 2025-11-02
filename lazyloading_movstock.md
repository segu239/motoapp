# Plan de Implementación: Lazy Loading para Componentes MOV.STOCK

## Fecha de Creación
**Fecha:** 1 de Noviembre de 2025
**Versión:** 1.0
**Estado:** Plan de Implementación

---

## 1. RESUMEN EJECUTIVO

Este documento detalla el plan de implementación seguro para agregar lazy loading (carga bajo demanda) a los **4 componentes del sistema MOV.STOCK** que actualmente cargan todos los registros en memoria, lo cual puede causar problemas de rendimiento con alto volumen de datos.

### 1.1 Componentes Afectados

Los siguientes componentes requieren implementación de lazy loading:

| Componente | Archivo | Estado Funcional | Problema Actual |
|-----------|---------|-----------------|-----------------|
| **Pedidos de Stk. pendientes** | `stockpedido.component.ts:487` | ✅ Operativo | Carga todos los registros con estado `Solicitado` o `Solicitado-E` |
| **Pedidos de Stk. recibidos** | `stockrecibo.component.ts:226` | ✅ Solo lectura | Carga todos los registros con estado `Recibido` |
| **Envíos de Stk. pendientes** | `enviostockpendientes.component.ts:377` | ✅ Operativo | Carga todos los registros con estado `Solicitado` |
| **Envíos de Stk. realizados** | `enviodestockrealizados.component.ts:118` | ✅ Solo lectura | Carga todos los registros con estado `Enviado` |

### 1.2 Impacto Esperado

**Beneficios:**
- 📉 **Reducción de consumo de memoria**: De cargar 100-1000+ registros a solo 50 por página
- ⚡ **Mejora de tiempo de carga inicial**: De 2-5 segundos a < 1 segundo
- 🔍 **Filtrado server-side**: Búsquedas más eficientes
- 📊 **Escalabilidad**: Soporte para miles de registros sin degradación

**Riesgos Controlables:**
- ⚠️ Requiere modificaciones en backend (nuevos endpoints)
- ⚠️ Cambios en frontend (lógica de carga de datos)
- ⚠️ Testing exhaustivo para evitar regresiones

---

## 2. ANÁLISIS TÉCNICO DETALLADO

### 2.1 Componentes de Referencia CON Lazy Loading

Los siguientes componentes **ya implementan lazy loading correctamente** y servirán como plantilla:

#### 2.1.1 `pedir-stock.component.ts` ✅

**Ubicación:** `src/app/components/pedir-stock/pedir-stock.component.ts:775`

**Patrón Implementado:**
```typescript
// Propiedades para lazy loading
public first: number = 0;
public rows: number = 50;
public sortField: string | undefined;
public sortOrder: number = 1;
public filters: any = {};
public totalRegistros: number = 0;

// Método de carga lazy
async loadDataLazy(event: LazyLoadEvent): Promise<void> {
  this.first = event.first || 0;
  this.rows = event.rows || 50;
  this.sortField = event.sortField;
  this.sortOrder = event.sortOrder || 1;
  this.filters = event.filters || {};

  // Guardar estado
  this.saveTableState();

  // Calcular página
  const page = Math.floor(this.first / this.rows) + 1;

  // Cargar datos del servidor
  await this.loadServerData(page);
}

// Carga de datos del servidor
private async loadServerData(page: number): Promise<void> {
  const response = await this.stockPaginadosService.cargarPaginaConFiltros(
    page,
    this.rows,
    this.sortField,
    this.sortOrder,
    this.filters
  ).toPromise();
}
```

**Template HTML (pedir-stock.component.html):**
```html
<p-table #dtable [value]="productos"
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
```

**Servicio Utilizado:** `StockPaginadosService`
- Gestiona la comunicación con el endpoint backend
- Implementa caché de datos
- Maneja filtros y ordenamiento

**Endpoint Backend:** `Carga.php - Artsucursal_get()` (línea 40)
- ✅ Soporte de paginación con `page` y `rows`
- ✅ Filtros dinámicos por columna
- ✅ Ordenamiento server-side
- ✅ Búsqueda con ILIKE
- ✅ Retorna `total` de registros y `data` paginada

#### 2.1.2 `stockenvio.component.ts` ✅

**Ubicación:** `src/app/components/stockenvio/stockenvio.component.ts:719`

**Implementación:** Idéntica a `pedir-stock`
- Mismo patrón de lazy loading
- Mismo servicio `StockPaginadosService`
- Mismo endpoint backend

---

### 2.2 Componentes SIN Lazy Loading

#### 2.2.1 `stockpedido.component.ts` ❌

**Ubicación:** `src/app/components/stockpedido/stockpedido.component.ts:487`

**Método Actual de Carga:**
```typescript
cargarPedidos() {
  this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
    console.log(data);
    this.pedidoItem = data.mensaje.filter((item: any) =>
      item.estado.trim() === 'Solicitado' ||
      item.estado.trim() === 'Solicitado-E'
    );
    console.log(this.pedidoItem);
  });
}
```

**Endpoint Actual:** `Carga.php - PedidoItemsPorSucursal_post()` (línea 920)

**Consulta SQL Actual:**
```php
$this->db->select('pi.*, pc.sucursalh, pc.sucursald');
$this->db->from('pedidoitem AS pi');
$this->db->join('pedidoscb AS pc', 'pi.id_num = pc.id_num', 'inner');
$this->db->where('pc.sucursald', $sucursal);
$query = $this->db->get();
$resp = $query->result_array(); // ❌ Carga TODOS los registros
```

**Problemas Identificados:**
- ❌ No hay paginación - carga TODOS los registros
- ❌ Filtrado client-side (en Angular después de recibir todos los datos)
- ❌ No hay ordenamiento server-side
- ❌ Consumo de memoria innecesario

**Template HTML Actual:**
```html
<p-table #dtable [value]="pedidoItem"
    [paginator]="true"
    [rows]="10">
    <!-- ❌ lazy="false" por defecto -->
    <!-- ❌ Paginación solo visual (todos los datos ya están en memoria) -->
```

#### 2.2.2 `stockrecibo.component.ts` ❌

**Ubicación:** `src/app/components/stockrecibo/stockrecibo.component.ts:226`

**Método Actual de Carga:**
```typescript
cargarPedidos() {
  this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
    console.log(data);
    this.pedidoItem = data.mensaje.filter((item: any) =>
      item.estado.trim() === 'Recibido'
    );
    console.log(this.pedidoItem);
  });
}
```

**Endpoint Actual:** Mismo que `stockpedido` (`PedidoItemsPorSucursal_post`)

**Problemas:** Idénticos a `stockpedido`

**Característica Adicional:**
- Componente de solo lectura (sin acciones de modificación)
- Puede tener mayor volumen histórico de datos

#### 2.2.3 `enviostockpendientes.component.ts` ❌

**Ubicación:** `src/app/components/enviostockpendientes/enviostockpendientes.component.ts:377`

**Método Actual de Carga:**
```typescript
cargarPedidos() {
  this._cargardata.obtenerPedidoItemPorSucursalh(this.sucursal).subscribe((data: any) => {
    console.log(data);
    if (Array.isArray(data.mensaje)) {
      this.pedidoItem = data.mensaje.filter((item: any) =>
        item.estado.trim() === 'Solicitado' &&
        item.sucursalh.trim() === this.sucursal.toString()
      );
      console.log(this.pedidoItem);
    }
  });
}
```

**Endpoint Actual:** `Carga.php - PedidoItemsPorSucursalh_post()` (línea 965)

**Consulta SQL Actual:**
```php
$this->db->select('pi.*, pc.sucursalh, pc.sucursald');
$this->db->from('pedidoitem AS pi');
$this->db->join('pedidoscb AS pc', 'pi.id_num = pc.id_num', 'inner');
$this->db->where('pc.sucursalh', $sucursal); // Filtro por sucursalh
$query = $this->db->get();
$resp = $query->result_array(); // ❌ Carga TODOS los registros
```

**Problemas:** Idénticos a `stockpedido`

**Diferencia con `stockpedido`:**
- Usa endpoint diferente (`PedidoItemsPorSucursalh` vs `PedidoItemsPorSucursal`)
- Filtra por `sucursalh` en lugar de `sucursald`

#### 2.2.4 `enviodestockrealizados.component.ts` ❌

**Ubicación:** `src/app/components/enviodestockrealizados/enviodestockrealizados.component.ts:118`

**Método Actual de Carga:**
```typescript
cargarPedidos() {
  this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
    console.log(data);
    if (Array.isArray(data.mensaje)) {
      this.pedidoItem = data.mensaje.filter((item: any) =>
        item.estado.trim() === 'Enviado'
      );
      console.log(this.pedidoItem);
    }
  });
}
```

**Endpoint Actual:** Mismo que `stockpedido` (`PedidoItemsPorSucursal_post`)

**Problemas:** Idénticos a `stockpedido`

**Característica Adicional:**
- Componente de solo lectura
- Puede tener mayor volumen histórico de datos

---

## 3. PLAN DE IMPLEMENTACIÓN

### 3.1 Estrategia General

**Enfoque:** Implementación incremental y segura

**Principios:**
1. 🔄 **Un componente a la vez** - Minimizar riesgo de múltiples cambios simultáneos
2. 🧪 **Testing exhaustivo** - Probar cada componente antes de continuar
3. 📋 **Reutilizar patrones existentes** - Basarse en `pedir-stock` como referencia
4. 🔙 **Rollback fácil** - Mantener código original comentado durante implementación
5. 📊 **Monitoreo de rendimiento** - Medir mejoras con métricas concretas

---

### 3.2 FASE 1: Preparación del Backend

#### 3.2.1 Crear Nuevos Endpoints Paginados

**Archivo:** `/PBC/Carga.php.txt` (Backend)

**Endpoints a Crear:**

##### A) `PedidoItemsPorSucursalPaginado_post()`

**Propósito:** Reemplazar `PedidoItemsPorSucursal_post()` con soporte de paginación

**Ubicación sugerida:** Después de línea 963 en `Carga.php.txt`

**Código Propuesto:**
```php
/**
 * Obtiene items de pedido por sucursal CON PAGINACIÓN
 * Similar a Artsucursal_get() pero para pedidoitem
 */
public function PedidoItemsPorSucursalPaginado_post() {
    $data = $this->post();

    // Parámetros obligatorios
    $sucursal = isset($data["sucursal"]) ? $data["sucursal"] : null;
    $page = isset($data["page"]) ? (int)$data["page"] : 1;
    $rows = isset($data["rows"]) ? (int)$data["rows"] : 50;

    // Parámetros opcionales
    $sortField = isset($data["sortField"]) ? $data["sortField"] : 'id_items';
    $sortOrder = isset($data["sortOrder"]) ? (int)$data["sortOrder"] : -1; // -1 = DESC
    $filters = isset($data["filters"]) ? $data["filters"] : [];
    $estado = isset($data["estado"]) ? $data["estado"] : null; // Filtro opcional por estado

    if ($sucursal === null) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "El parámetro 'sucursal' es obligatorio."
        );
        $this->response($respuesta, 400);
        return;
    }

    try {
        // Configurar base query
        $this->db->select('pi.*, pc.sucursalh, pc.sucursald');
        $this->db->from('pedidoitem AS pi');
        $this->db->join('pedidoscb AS pc', 'pi.id_num = pc.id_num', 'inner');
        $this->db->where('pc.sucursald', $sucursal);

        // Aplicar filtro por estado si se especifica
        if ($estado !== null) {
            // Soportar múltiples estados separados por coma
            if (strpos($estado, ',') !== false) {
                $estados = explode(',', $estado);
                $this->db->where_in('pi.estado', $estados);
            } else {
                $this->db->where('pi.estado', $estado);
            }
        }

        // Aplicar filtros dinámicos (similar a Artsucursal_get)
        if (!empty($filters)) {
            foreach ($filters as $field => $filter) {
                if (isset($filter['value']) && $filter['value'] !== '') {
                    // Validar que el campo esté permitido
                    $allowedFields = ['tipo', 'descripcion', 'estado', 'usuario_res', 'observacion'];
                    if (in_array($field, $allowedFields)) {
                        $matchMode = isset($filter['matchMode']) ? $filter['matchMode'] : 'contains';

                        if ($matchMode === 'contains') {
                            $this->db->like($field, $filter['value'], 'both');
                        } elseif ($matchMode === 'equals') {
                            $this->db->where($field, $filter['value']);
                        } elseif ($matchMode === 'startsWith') {
                            $this->db->like($field, $filter['value'], 'after');
                        }
                    }
                }
            }
        }

        // Contar total de registros (ANTES de aplicar LIMIT)
        $total = $this->db->count_all_results('', false); // false = no resetear query

        // Aplicar ordenamiento
        $sortDirection = $sortOrder === -1 ? 'DESC' : 'ASC';
        $this->db->order_by($sortField, $sortDirection);

        // Aplicar paginación
        $offset = ($page - 1) * $rows;
        $this->db->limit($rows, $offset);

        // Ejecutar query
        $query = $this->db->get();
        $data = $query->result_array();

        $respuesta = array(
            "error" => false,
            "total" => $total,
            "data" => $data,
            "page" => $page,
            "rows" => $rows
        );

        $this->response($respuesta);

    } catch (Exception $e) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error en la base de datos: " . $e->getMessage()
        );
        $this->response($respuesta, 500);
    }
}
```

##### B) `PedidoItemsPorSucursalhPaginado_post()`

**Propósito:** Reemplazar `PedidoItemsPorSucursalh_post()` con soporte de paginación

**Ubicación sugerida:** Después de la función anterior

**Código Propuesto:**
```php
/**
 * Obtiene items de pedido por sucursalh (destino) CON PAGINACIÓN
 */
public function PedidoItemsPorSucursalhPaginado_post() {
    $data = $this->post();

    // Parámetros obligatorios
    $sucursal = isset($data["sucursal"]) ? $data["sucursal"] : null;
    $page = isset($data["page"]) ? (int)$data["page"] : 1;
    $rows = isset($data["rows"]) ? (int)$data["rows"] : 50;

    // Parámetros opcionales
    $sortField = isset($data["sortField"]) ? $data["sortField"] : 'id_items';
    $sortOrder = isset($data["sortOrder"]) ? (int)$data["sortOrder"] : -1;
    $filters = isset($data["filters"]) ? $data["filters"] : [];
    $estado = isset($data["estado"]) ? $data["estado"] : null;

    if ($sucursal === null) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "El parámetro 'sucursal' es obligatorio."
        );
        $this->response($respuesta, 400);
        return;
    }

    try {
        // Configurar base query (diferencia: filtro por sucursalh)
        $this->db->select('pi.*, pc.sucursalh, pc.sucursald');
        $this->db->from('pedidoitem AS pi');
        $this->db->join('pedidoscb AS pc', 'pi.id_num = pc.id_num', 'inner');
        $this->db->where('pc.sucursalh', $sucursal); // 👈 DIFERENCIA CLAVE

        // Aplicar filtro por estado si se especifica
        if ($estado !== null) {
            if (strpos($estado, ',') !== false) {
                $estados = explode(',', $estado);
                $this->db->where_in('pi.estado', $estados);
            } else {
                $this->db->where('pi.estado', $estado);
            }
        }

        // Aplicar filtros dinámicos
        if (!empty($filters)) {
            foreach ($filters as $field => $filter) {
                if (isset($filter['value']) && $filter['value'] !== '') {
                    $allowedFields = ['tipo', 'descripcion', 'estado', 'usuario_res', 'observacion'];
                    if (in_array($field, $allowedFields)) {
                        $matchMode = isset($filter['matchMode']) ? $filter['matchMode'] : 'contains';

                        if ($matchMode === 'contains') {
                            $this->db->like($field, $filter['value'], 'both');
                        } elseif ($matchMode === 'equals') {
                            $this->db->where($field, $filter['value']);
                        } elseif ($matchMode === 'startsWith') {
                            $this->db->like($field, $filter['value'], 'after');
                        }
                    }
                }
            }
        }

        // Contar total
        $total = $this->db->count_all_results('', false);

        // Ordenamiento
        $sortDirection = $sortOrder === -1 ? 'DESC' : 'ASC';
        $this->db->order_by($sortField, $sortDirection);

        // Paginación
        $offset = ($page - 1) * $rows;
        $this->db->limit($rows, $offset);

        // Ejecutar
        $query = $this->db->get();
        $data = $query->result_array();

        $respuesta = array(
            "error" => false,
            "total" => $total,
            "data" => $data,
            "page" => $page,
            "rows" => $rows
        );

        $this->response($respuesta);

    } catch (Exception $e) {
        $respuesta = array(
            "error" => true,
            "mensaje" => "Error en la base de datos: " . $e->getMessage()
        );
        $this->response($respuesta, 500);
    }
}
```

**URLs de Endpoints (configurar en `ini.ts`):**
```typescript
// Agregar en src/app/config/ini.ts
export const UrlPedidoItemsPorSucursalPaginado =
  'http://api.motoapp.com/Carga/PedidoItemsPorSucursalPaginado';

export const UrlPedidoItemsPorSucursalhPaginado =
  'http://api.motoapp.com/Carga/PedidoItemsPorSucursalhPaginado';
```

#### 3.2.2 Testing de Endpoints

**Herramientas sugeridas:**
- Postman o Insomnia
- Thunder Client (extensión de VS Code)

**Casos de Prueba:**

##### Test 1: Paginación básica
```json
POST /Carga/PedidoItemsPorSucursalPaginado
{
  "sucursal": 2,
  "page": 1,
  "rows": 50
}
```

**Resultado esperado:**
```json
{
  "error": false,
  "total": 150,
  "data": [/* 50 items */],
  "page": 1,
  "rows": 50
}
```

##### Test 2: Filtrado por estado
```json
POST /Carga/PedidoItemsPorSucursalPaginado
{
  "sucursal": 2,
  "page": 1,
  "rows": 50,
  "estado": "Solicitado,Solicitado-E"
}
```

##### Test 3: Ordenamiento
```json
POST /Carga/PedidoItemsPorSucursalPaginado
{
  "sucursal": 2,
  "page": 1,
  "rows": 50,
  "sortField": "fecha_resuelto",
  "sortOrder": -1
}
```

##### Test 4: Filtros dinámicos
```json
POST /Carga/PedidoItemsPorSucursalPaginado
{
  "sucursal": 2,
  "page": 1,
  "rows": 50,
  "filters": {
    "descripcion": {
      "value": "aceite",
      "matchMode": "contains"
    }
  }
}
```

---

### 3.3 FASE 2: Crear Servicio Paginado para Pedidos

#### 3.3.1 Crear `PedidosPaginadosService`

**Archivo:** `src/app/services/pedidos-paginados.service.ts` (NUEVO)

**Propósito:**
- Gestionar la comunicación con los nuevos endpoints paginados
- Implementar caché similar a `StockPaginadosService`
- Manejar estados de carga y errores

**Código Completo:**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  UrlPedidoItemsPorSucursalPaginado,
  UrlPedidoItemsPorSucursalhPaginado
} from '../config/ini';

/**
 * Servicio para gestionar la carga paginada de pedidos de stock
 * Basado en StockPaginadosService
 */
@Injectable({
  providedIn: 'root'
})
export class PedidosPaginadosService {

  // BehaviorSubjects para datos reactivos
  private pedidosSubject = new BehaviorSubject<any[]>([]);
  private totalRegistrosSubject = new BehaviorSubject<number>(0);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Observables públicos
  public pedidos$ = this.pedidosSubject.asObservable();
  public totalRegistros$ = this.totalRegistrosSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  // Cache de última consulta
  private ultimaConsulta: any = null;

  constructor(private http: HttpClient) {
    console.log('📦 PedidosPaginadosService inicializado');
  }

  /**
   * Carga página de pedidos filtrados por sucursal de origen (sucursald)
   * Usado por: stockpedido, stockrecibo, enviodestockrealizados
   */
  cargarPaginaPorSucursald(
    sucursal: number,
    page: number,
    rows: number,
    sortField?: string,
    sortOrder?: number,
    filters?: any,
    estado?: string
  ): Observable<any> {
    console.log(`📄 Cargando página ${page} de pedidos (sucursald=${sucursal})`);

    this.cargandoSubject.next(true);
    this.errorSubject.next(null);

    const body = {
      sucursal,
      page,
      rows,
      sortField: sortField || 'id_items',
      sortOrder: sortOrder || -1,
      filters: filters || {},
      estado: estado || null
    };

    // Guardar última consulta para refresh
    this.ultimaConsulta = { tipo: 'sucursald', ...body };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(UrlPedidoItemsPorSucursalPaginado, body, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Respuesta recibida:', response);

        if (response && !response.error) {
          this.pedidosSubject.next(response.data || []);
          this.totalRegistrosSubject.next(response.total || 0);
        } else {
          this.errorSubject.next(response.mensaje || 'Error desconocido');
          this.pedidosSubject.next([]);
          this.totalRegistrosSubject.next(0);
        }

        this.cargandoSubject.next(false);
      }),
      catchError((error) => {
        console.error('❌ Error en cargarPaginaPorSucursald:', error);
        this.errorSubject.next(error.message || 'Error de conexión');
        this.pedidosSubject.next([]);
        this.totalRegistrosSubject.next(0);
        this.cargandoSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Carga página de pedidos filtrados por sucursal destino (sucursalh)
   * Usado por: enviostockpendientes
   */
  cargarPaginaPorSucursalh(
    sucursal: number,
    page: number,
    rows: number,
    sortField?: string,
    sortOrder?: number,
    filters?: any,
    estado?: string
  ): Observable<any> {
    console.log(`📄 Cargando página ${page} de pedidos (sucursalh=${sucursal})`);

    this.cargandoSubject.next(true);
    this.errorSubject.next(null);

    const body = {
      sucursal,
      page,
      rows,
      sortField: sortField || 'id_items',
      sortOrder: sortOrder || -1,
      filters: filters || {},
      estado: estado || null
    };

    // Guardar última consulta para refresh
    this.ultimaConsulta = { tipo: 'sucursalh', ...body };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(UrlPedidoItemsPorSucursalhPaginado, body, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Respuesta recibida:', response);

        if (response && !response.error) {
          this.pedidosSubject.next(response.data || []);
          this.totalRegistrosSubject.next(response.total || 0);
        } else {
          this.errorSubject.next(response.mensaje || 'Error desconocido');
          this.pedidosSubject.next([]);
          this.totalRegistrosSubject.next(0);
        }

        this.cargandoSubject.next(false);
      }),
      catchError((error) => {
        console.error('❌ Error en cargarPaginaPorSucursalh:', error);
        this.errorSubject.next(error.message || 'Error de conexión');
        this.pedidosSubject.next([]);
        this.totalRegistrosSubject.next(0);
        this.cargandoSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresca la última consulta realizada
   * Útil después de crear/editar/eliminar un pedido
   */
  refrescarDatos(): Observable<any> {
    if (!this.ultimaConsulta) {
      console.warn('⚠️ No hay consulta previa para refrescar');
      return throwError(() => new Error('No hay consulta previa'));
    }

    console.log('🔄 Refrescando datos con última consulta:', this.ultimaConsulta);

    if (this.ultimaConsulta.tipo === 'sucursald') {
      return this.cargarPaginaPorSucursald(
        this.ultimaConsulta.sucursal,
        this.ultimaConsulta.page,
        this.ultimaConsulta.rows,
        this.ultimaConsulta.sortField,
        this.ultimaConsulta.sortOrder,
        this.ultimaConsulta.filters,
        this.ultimaConsulta.estado
      );
    } else {
      return this.cargarPaginaPorSucursalh(
        this.ultimaConsulta.sucursal,
        this.ultimaConsulta.page,
        this.ultimaConsulta.rows,
        this.ultimaConsulta.sortField,
        this.ultimaConsulta.sortOrder,
        this.ultimaConsulta.filters,
        this.ultimaConsulta.estado
      );
    }
  }

  /**
   * Limpia el estado del servicio
   */
  limpiar(): void {
    this.pedidosSubject.next([]);
    this.totalRegistrosSubject.next(0);
    this.cargandoSubject.next(false);
    this.errorSubject.next(null);
    this.ultimaConsulta = null;
  }
}
```

**Registrar en `app.module.ts`:**
```typescript
import { PedidosPaginadosService } from './services/pedidos-paginados.service';

@NgModule({
  // ...
  providers: [
    // ... otros servicios
    PedidosPaginadosService
  ]
})
```

---

### 3.4 FASE 3: Implementación en Componentes (UNO POR UNO)

#### 3.4.1 Componente 1: `stockpedido` (Pedidos de Stk. pendientes)

**Prioridad:** ALTA (componente operativo crítico)

**Archivo:** `src/app/components/stockpedido/stockpedido.component.ts`

##### Paso 1: Importaciones y Propiedades

**Agregar importaciones:**
```typescript
import { LazyLoadEvent } from 'primeng/api';
import { PedidosPaginadosService } from '../../services/pedidos-paginados.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
```

**Agregar propiedades al componente:**
```typescript
export class StockpedidoComponent implements OnInit, OnDestroy {
  // ... propiedades existentes ...

  // NUEVO: Propiedades para lazy loading
  public first: number = 0;
  public rows: number = 50;
  public sortField: string | undefined;
  public sortOrder: number = -1; // DESC por defecto
  public filters: any = {};
  public totalRegistros: number = 0;
  public loading: boolean = false;

  // NUEVO: Subject para cleanup
  private destroy$ = new Subject<void>();

  constructor(
    // ... inyecciones existentes ...
    private pedidosPaginadosService: PedidosPaginadosService // NUEVO
  ) {
    // ... código existente ...
  }
}
```

##### Paso 2: Implementar `OnDestroy`

```typescript
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.pedidosPaginadosService.limpiar();
}
```

##### Paso 3: Modificar `ngOnInit`

```typescript
ngOnInit(): void {
  console.log('StockpedidoComponent inicializado con lazy loading');
  console.log('Sucursal:', this.sucursal);

  // NUEVO: Suscribirse a los observables del servicio
  this.pedidosPaginadosService.pedidos$
    .pipe(takeUntil(this.destroy$))
    .subscribe((pedidos) => {
      this.pedidoItem = pedidos;
      console.log('📊 Pedidos actualizados:', this.pedidoItem.length);
    });

  this.pedidosPaginadosService.totalRegistros$
    .pipe(takeUntil(this.destroy$))
    .subscribe((total) => {
      this.totalRegistros = total;
      console.log('📈 Total registros:', this.totalRegistros);
    });

  this.pedidosPaginadosService.cargando$
    .pipe(takeUntil(this.destroy$))
    .subscribe((cargando) => {
      this.loading = cargando;
    });

  // Ya NO llamar a cargarPedidos() aquí
  // La carga se inicia automáticamente con [lazyLoadOnInit]="true" en el template
}
```

##### Paso 4: Agregar Método `loadDataLazy`

```typescript
/**
 * Maneja el evento de lazy loading de PrimeNG
 */
async loadDataLazy(event: LazyLoadEvent): Promise<void> {
  console.log('🔄 loadDataLazy - Evento recibido:', event);

  // Actualizar parámetros
  this.first = event.first || 0;
  this.rows = event.rows || 50;
  this.sortField = event.sortField;
  this.sortOrder = event.sortOrder || -1;
  this.filters = event.filters || {};

  // Calcular página
  const page = Math.floor(this.first / this.rows) + 1;

  console.log(`📄 Cargando página ${page}, first: ${this.first}, rows: ${this.rows}`);

  try {
    // Cargar datos con filtro de estado incluido
    await this.pedidosPaginadosService.cargarPaginaPorSucursald(
      this.sucursal,
      page,
      this.rows,
      this.sortField,
      this.sortOrder,
      this.filters,
      'Solicitado,Solicitado-E' // ⭐ Filtro de estados en backend
    ).toPromise();
  } catch (error) {
    console.error('❌ Error en loadDataLazy:', error);
    Swal.fire({
      title: 'Error',
      text: 'Error al cargar pedidos: ' + (error.message || error),
      icon: 'error'
    });
  }
}
```

##### Paso 5: Modificar Método `refrescarDatos`

```typescript
refrescarDatos() {
  console.log('🔄 Refrescando datos...');
  this.pedidosPaginadosService.refrescarDatos().subscribe({
    next: () => {
      console.log('✅ Datos refrescados');
    },
    error: (err) => {
      console.error('❌ Error al refrescar:', err);
    }
  });
}
```

##### Paso 6: Actualizar Template HTML

**Archivo:** `src/app/components/stockpedido/stockpedido.component.html`

**REEMPLAZAR:**
```html
<p-table #dtable [value]="pedidoItem"
    [tableStyle]="{ 'min-width': '50rem' }"
    [paginator]="true"
    [rows]="10"
    ...>
```

**POR:**
```html
<p-table #dtable [value]="pedidoItem"
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
    [filterDelay]="300"
    currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} pedidos"
    ...>
```

**AGREGAR indicador de carga:**
```html
<div class="card">
  <div class="card-body">
    <h4 class="card-title">Pedidos de Stock Pendientes</h4>

    <!-- Loading indicator -->
    <div class="alert alert-warning mb-3" *ngIf="loading">
      <i class="fa fa-spinner fa-spin mr-2"></i>
      Cargando pedidos, por favor espere...
    </div>

    <p-table #dtable ...>
    <!-- resto del template -->
```

##### Paso 7: Testing del Componente

**Casos de Prueba:**

1. ✅ **Carga inicial**
   - Verificar que carga primeros 50 registros
   - Verificar que muestra total correcto

2. ✅ **Paginación**
   - Cambiar de página
   - Verificar que carga nuevos datos

3. ✅ **Filtros**
   - Filtrar por descripción
   - Verificar que se aplican server-side

4. ✅ **Ordenamiento**
   - Ordenar por fecha
   - Verificar orden correcto

5. ✅ **Acciones**
   - Recibir pedido
   - Verificar que refresca datos correctamente

6. ✅ **Estados**
   - Verificar que solo muestra "Solicitado" y "Solicitado-E"

**Checklist de Validación:**
- [ ] Carga inicial < 1 segundo
- [ ] Total de registros correcto
- [ ] Paginación funciona
- [ ] Filtros se aplican
- [ ] Ordenamiento funciona
- [ ] Acciones (recibir, cancelar) funcionan
- [ ] Refresh después de acción funciona
- [ ] No hay errores en consola
- [ ] No hay regresiones visuales

---

#### 3.4.2 Componente 2: `stockrecibo` (Pedidos de Stk. recibidos)

**Prioridad:** MEDIA (solo lectura, menor criticidad)

**Implementación:** **IDÉNTICA** a `stockpedido` con las siguientes diferencias:

**Único cambio en `loadDataLazy`:**
```typescript
await this.pedidosPaginadosService.cargarPaginaPorSucursald(
  this.sucursal,
  page,
  this.rows,
  this.sortField,
  this.sortOrder,
  this.filters,
  'Recibido' // ⭐ Solo pedidos recibidos
).toPromise();
```

**Nota:** Como este componente es solo lectura (no tiene método `recibir()`), el testing es más simple.

---

#### 3.4.3 Componente 3: `enviostockpendientes` (Envíos de Stk. pendientes)

**Prioridad:** ALTA (componente operativo crítico)

**Implementación:** Similar a `stockpedido` pero usando el método `cargarPaginaPorSucursalh`

**Cambio principal en `loadDataLazy`:**
```typescript
await this.pedidosPaginadosService.cargarPaginaPorSucursalh(
  this.sucursal,
  page,
  this.rows,
  this.sortField,
  this.sortOrder,
  this.filters,
  'Solicitado' // ⭐ Solo pedidos solicitados (pendientes de envío)
).toPromise();
```

**Diferencia clave:** Usa `cargarPaginaPorSucursalh` (filtra por sucursalh) en lugar de `cargarPaginaPorSucursald`

---

#### 3.4.4 Componente 4: `enviodestockrealizados` (Envíos de Stk. realizados)

**Prioridad:** MEDIA (solo lectura)

**Implementación:** Idéntica a `stockrecibo` con filtro de estado diferente:

```typescript
await this.pedidosPaginadosService.cargarPaginaPorSucursald(
  this.sucursal,
  page,
  this.rows,
  this.sortField,
  this.sortOrder,
  this.filters,
  'Enviado' // ⭐ Solo pedidos enviados
).toPromise();
```

---

## 4. RIESGOS Y MITIGACIONES

### 4.1 Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Errores en endpoints nuevos** | Media | Alto | Testing exhaustivo con Postman antes de integrar frontend |
| **Regresión en funcionalidad existente** | Media | Alto | Implementar uno por uno, testing completo antes de continuar |
| **Incompatibilidad con PrimeNG** | Baja | Medio | Usar misma versión y patrón que `pedir-stock` |
| **Performance backend degradado** | Baja | Medio | Agregar índices en columnas filtradas si es necesario |
| **Pérdida de datos en transición** | Muy Baja | Crítico | Mantener endpoints originales durante pruebas, rollback fácil |

### 4.2 Plan de Rollback

**Si algo sale mal en cualquier fase:**

1. **Backend:**
   - Endpoints originales se mantienen intactos
   - Simplemente revertir URLs en `ini.ts`

2. **Frontend:**
   - Código original comentado durante implementación
   - Simplemente descomentar y eliminar código nuevo

3. **Base de Datos:**
   - No hay cambios en estructura de BD
   - No hay riesgo de pérdida de datos

**Estrategia de Branches Git:**
```bash
# Crear branch para cada componente
git checkout -b feature/lazy-loading-stockpedido
git checkout -b feature/lazy-loading-stockrecibo
git checkout -b feature/lazy-loading-enviostockpendientes
git checkout -b feature/lazy-loading-enviodestockrealizados
```

**Merge solo después de validación completa:**
```bash
git checkout main
git merge feature/lazy-loading-stockpedido
# Solo después de testing exitoso
```

---

## 5. CRONOGRAMA Y ESFUERZO ESTIMADO

### 5.1 Estimación por Fase

| Fase | Tarea | Esfuerzo | Responsable |
|------|-------|----------|-------------|
| **FASE 1** | Crear endpoints backend | 3-4 horas | Backend Dev |
| | Testing endpoints | 1-2 horas | Backend Dev |
| **FASE 2** | Crear servicio `PedidosPaginadosService` | 2-3 horas | Frontend Dev |
| | Testing servicio | 1 hora | Frontend Dev |
| **FASE 3.1** | Implementar lazy loading en `stockpedido` | 2-3 horas | Frontend Dev |
| | Testing `stockpedido` | 1-2 horas | QA/Dev |
| **FASE 3.2** | Implementar lazy loading en `stockrecibo` | 1-2 horas | Frontend Dev |
| | Testing `stockrecibo` | 1 hora | QA/Dev |
| **FASE 3.3** | Implementar lazy loading en `enviostockpendientes` | 2-3 horas | Frontend Dev |
| | Testing `enviostockpendientes` | 1-2 horas | QA/Dev |
| **FASE 3.4** | Implementar lazy loading en `enviodestockrealizados` | 1-2 horas | Frontend Dev |
| | Testing `enviodestockrealizados` | 1 hora | QA/Dev |
| **FASE 4** | Testing integración completa | 2-3 horas | QA |
| | Documentación final | 1 hora | Dev |

**Total Estimado:** 20-30 horas de desarrollo + testing

**Cronograma Sugerido (2 semanas):**

#### Semana 1:
- **Lunes-Martes:** FASE 1 (Backend)
- **Miércoles:** FASE 2 (Servicio)
- **Jueves-Viernes:** FASE 3.1 (`stockpedido`)

#### Semana 2:
- **Lunes:** FASE 3.2 (`stockrecibo`)
- **Martes:** FASE 3.3 (`enviostockpendientes`)
- **Miércoles:** FASE 3.4 (`enviodestockrealizados`)
- **Jueves:** FASE 4 (Testing integración)
- **Viernes:** Buffer para correcciones y documentación

---

## 6. MÉTRICAS DE ÉXITO

### 6.1 KPIs Técnicos

**Antes de Lazy Loading:**
- ⏱️ Tiempo de carga inicial: **2-5 segundos** (100+ registros)
- 💾 Consumo de memoria: **Alto** (todos los datos en cliente)
- 🔍 Búsqueda: **Client-side** (lenta con muchos datos)
- 📄 Escalabilidad: **Limitada** (< 1000 registros)

**Después de Lazy Loading (Objetivo):**
- ⏱️ Tiempo de carga inicial: **< 1 segundo** (50 registros por página)
- 💾 Consumo de memoria: **Bajo** (solo datos visibles)
- 🔍 Búsqueda: **Server-side** (rápida independiente del volumen)
- 📄 Escalabilidad: **Ilimitada** (10,000+ registros sin problema)

### 6.2 Validación de Éxito

**Criterios de Aceptación:**

✅ **Funcionalidad:**
- [ ] Todos los componentes cargan correctamente
- [ ] Paginación funciona en todos los componentes
- [ ] Filtros se aplican correctamente
- [ ] Ordenamiento funciona
- [ ] Acciones (recibir, enviar, etc.) funcionan
- [ ] Refresh después de acciones funciona

✅ **Performance:**
- [ ] Tiempo de carga inicial < 1 segundo
- [ ] Cambio de página < 500ms
- [ ] Aplicar filtro < 1 segundo
- [ ] Consumo de memoria reducido (verificar con DevTools)

✅ **Calidad:**
- [ ] No hay errores en consola
- [ ] No hay warnings de TypeScript
- [ ] No hay regresiones visuales
- [ ] Código siguiendo estándares del proyecto

✅ **UX:**
- [ ] Indicadores de carga visibles
- [ ] Mensajes de error claros
- [ ] Experiencia fluida sin "saltos" visuales

---

## 7. DOCUMENTACIÓN REQUERIDA

### 7.1 Documentación Técnica

**Actualizar los siguientes archivos:**

1. **CLAUDE.md** (este archivo)
   - Agregar sección sobre lazy loading en MOV.STOCK
   - Documentar nuevos servicios y endpoints

2. **movstock.md**
   - Marcar problema P4 como resuelto
   - Actualizar arquitectura del sistema
   - Agregar sección de servicios paginados

3. **README técnico** (si existe)
   - Documentar nuevos endpoints
   - Ejemplos de uso de `PedidosPaginadosService`

### 7.2 Comentarios en Código

**Ejemplo de comentarios requeridos:**

```typescript
/**
 * LAZY LOADING IMPLEMENTADO - 2025-11
 *
 * Este componente ahora usa PedidosPaginadosService para carga bajo demanda.
 *
 * CAMBIOS REALIZADOS:
 * - Agregado loadDataLazy() para manejar evento de PrimeNG
 * - Reemplazado cargarPedidos() directo por suscripción a servicio
 * - Template actualizado con [lazy]="true"
 *
 * ENDPOINTS UTILIZADOS:
 * - PedidoItemsPorSucursalPaginado_post (backend)
 *
 * NOTAS:
 * - Filtro de estado se aplica en backend ('Solicitado,Solicitado-E')
 * - Paginación: 50 registros por defecto
 */
```

---

## 8. ANEXOS

### 8.1 Comparativa de Arquitectura

#### Antes (Sin Lazy Loading)
```
┌─────────────────┐
│   Componente    │
│  stockpedido    │
└────────┬────────┘
         │
         │ obtenerPedidoItemPorSucursal()
         ▼
┌─────────────────┐
│ CargardataService│
└────────┬────────┘
         │
         │ HTTP POST
         ▼
┌─────────────────┐
│   Backend PHP   │
│ (sin paginación)│
└────────┬────────┘
         │
         │ SELECT * (todos los registros)
         ▼
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘

❌ Flujo de datos:
BD → Backend (100+ registros) → Frontend (100+ registros) → Filtro client-side
```

#### Después (Con Lazy Loading)
```
┌─────────────────┐
│   Componente    │
│  stockpedido    │
└────────┬────────┘
         │
         │ loadDataLazy(event)
         ▼
┌─────────────────────┐
│ PedidosPaginados    │
│    Service          │
│ (con caché)         │
└────────┬────────────┘
         │
         │ HTTP POST (page, rows, filters)
         ▼
┌─────────────────────┐
│   Backend PHP       │
│ (con paginación)    │
└────────┬────────────┘
         │
         │ SELECT con LIMIT/OFFSET + WHERE
         ▼
┌─────────────────────┐
│   PostgreSQL        │
└─────────────────────┘

✅ Flujo de datos:
BD → Backend (50 registros) → Frontend (50 registros) → Display directo
```

### 8.2 Checklist de Pre-Implementación

**Antes de comenzar, verificar:**

- [ ] **Respaldo de código actual**
  ```bash
  git checkout -b backup-before-lazy-loading
  git commit -m "Backup antes de implementar lazy loading"
  git push origin backup-before-lazy-loading
  ```

- [ ] **Entorno de desarrollo funcionando**
  ```bash
  ng serve # Debe compilar sin errores
  ```

- [ ] **Backend accesible**
  - Verificar que `http://api.motoapp.com` responde
  - Verificar acceso a base de datos

- [ ] **PrimeNG actualizado**
  ```bash
  npm list primeng
  # Verificar versión 15.4.1 o compatible
  ```

- [ ] **Crear branch de trabajo**
  ```bash
  git checkout -b feature/lazy-loading-movstock
  ```

---

## 9. CONTACTO Y SOPORTE

**Responsable de Implementación:**
- Ver asignación en sistema de tickets

**Documentación de Referencia:**
- PrimeNG Table: https://primeng.org/table
- Lazy Loading Guide: https://primeng.org/table#lazy
- Proyecto base: `/PP/src/app/components/pedir-stock/`

**Preguntas Frecuentes:**

**Q: ¿Podemos implementar todos los componentes a la vez?**
A: No recomendado. Implementar uno por uno reduce riesgos y facilita debugging.

**Q: ¿Qué pasa con los datos en caché?**
A: El servicio `PedidosPaginadosService` implementa caché automático que se invalida al refrescar.

**Q: ¿Necesitamos modificar la base de datos?**
A: No. Solo endpoints nuevos, sin cambios en estructura de BD.

**Q: ¿Qué hacer si un endpoint tarda mucho?**
A: Considerar agregar índices en columnas filtradas (`estado`, `sucursald`, `sucursalh`):
```sql
CREATE INDEX idx_pedidoitem_estado ON pedidoitem(estado);
CREATE INDEX idx_pedidoscb_sucursald ON pedidoscb(sucursald);
CREATE INDEX idx_pedidoscb_sucursalh ON pedidoscb(sucursalh);
```

---

## 10. APROBACIÓN Y SEGUIMIENTO

**Estado del Plan:** 📋 Pendiente de Aprobación

**Aprobaciones Requeridas:**
- [ ] Líder Técnico
- [ ] Product Owner
- [ ] QA Lead

**Tracking:**
- Issue/Ticket: `_____`
- Sprint: `_____`
- Fecha Inicio: `_____`
- Fecha Estimada Fin: `_____`

---

**Documento generado por:** Claude Code
**Basado en análisis de:** `movstock.md v1.1`
**Fecha de Creación:** 1 de Noviembre de 2025
**Versión:** 1.0
**Estado:** Plan de Implementación Completo
