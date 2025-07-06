import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { 
  Urlartsucursal,
  UrlValorCambio,
  UrlTipoMoneda,
  UrlConflista
} from '../config/ini';

@Injectable({
  providedIn: 'root'
})
export class StockPaginadosService {
  private paginaActualSubject = new BehaviorSubject<number>(1);
  private totalPaginasSubject = new BehaviorSubject<number>(0);
  private productosSubject = new BehaviorSubject<any[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  private totalItemsSubject = new BehaviorSubject<number>(0);
  private terminoBusquedaSubject = new BehaviorSubject<string>('');
  private tamañoPagina = 50; // Igual que artículos

  // Observables públicos
  public paginaActual$ = this.paginaActualSubject.asObservable();
  public totalPaginas$ = this.totalPaginasSubject.asObservable();
  public productos$ = this.productosSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public totalItems$ = this.totalItemsSubject.asObservable();
  public terminoBusqueda$ = this.terminoBusquedaSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {}

  // ELIMINADO: Método completo ya no necesario

  // Cargar una página específica de productos
  cargarPagina(pagina: number): Observable<any> {
    this.cargandoSubject.next(true);
    this.paginaActualSubject.next(pagina);
    // Limpiar término de búsqueda cuando se carga una página normal
    this.terminoBusquedaSubject.next('');
    
    // Construir URL con parámetros de paginación
    const params = new URLSearchParams({
      page: pagina.toString(),
      limit: this.tamañoPagina.toString()
    });
    
    // NUEVO: Incluir parámetro de sucursal para filtrado automático en backend
    const sucursal = sessionStorage.getItem('sucursal');
    if (sucursal) {
      params.append('sucursal', sucursal);
      console.log('StockPaginados: Enviando sucursal al backend:', sucursal);
    }
    
    // ELIMINADO: Filtros por defecto ya no necesarios - se aplican automáticamente en backend
    
    const urlConPaginacion = `${Urlartsucursal}?${params.toString()}`;
    
    return this.http.get<any>(urlConPaginacion).pipe(
      tap(response => {
        if (response && !response.error && response.mensaje) {
          // Si la respuesta tiene formato paginado
          if (response.mensaje.data) {
            this.productosSubject.next(this.processProductosData(response.mensaje.data));
            this.totalItemsSubject.next(response.mensaje.total);
            this.totalPaginasSubject.next(response.mensaje.total_pages);
          } else {
            // Formato sin paginación (compatibilidad)
            const productos = this.processProductosData(response.mensaje);
            this.productosSubject.next(productos);
            this.totalItemsSubject.next(productos.length);
            this.totalPaginasSubject.next(1);
          }
        } else {
          this.productosSubject.next([]);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al cargar productos:', error);
        this.cargandoSubject.next(false);
        this.productosSubject.next([]);
        return throwError(error);
      })
    );
  }


  // Buscar productos con paginación en backend
  buscarProductos(termino: string, pagina: number = 1): Observable<any> {
    this.cargandoSubject.next(true);
    this.terminoBusquedaSubject.next(termino);
    
    // Si no hay término, resetear y cargar página normal
    if (!termino || termino.trim() === '') {
      this.terminoBusquedaSubject.next('');
      return this.cargarPagina(pagina);
    }
    
    // Construir URL con parámetros de búsqueda
    const params = new URLSearchParams({
      search: termino,
      page: pagina.toString(),
      limit: this.tamañoPagina.toString()
    });
    
    // NUEVO: Incluir parámetro de sucursal para filtrado automático en backend
    const sucursal = sessionStorage.getItem('sucursal');
    if (sucursal) {
      params.append('sucursal', sucursal);
      console.log('StockPaginados (búsqueda): Enviando sucursal al backend:', sucursal);
    }
    
    const urlConBusqueda = `${Urlartsucursal}?${params.toString()}`;
    
    return this.http.get<any>(urlConBusqueda).pipe(
      tap(response => {
        console.log('Respuesta de búsqueda:', response);
        
        if (response && !response.error && response.mensaje) {
          // Si la respuesta tiene formato paginado
          if (response.mensaje.data !== undefined) {
            const productos = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.productosSubject.next(this.processProductosData(productos));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(pagina);
          } else {
            // Formato sin paginación o sin resultados
            const productos = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.productosSubject.next(this.processProductosData(productos));
            this.totalItemsSubject.next(productos.length);
            this.totalPaginasSubject.next(productos.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          // No hay resultados
          this.productosSubject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
          this.paginaActualSubject.next(1);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al buscar productos:', error);
        this.cargandoSubject.next(false);
        this.productosSubject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Buscar productos (mantener para compatibilidad)
  buscar(termino: string, pagina: number = 1): Observable<any> {
    return this.buscarProductos(termino, pagina);
  }

  // Procesar y normalizar datos de productos
  private processProductosData(productos: any[]): any[] {
    if (!productos || !Array.isArray(productos)) {
      return [];
    }
    
    return productos.map(item => ({
      ...item,
      // Normalizar campos de nombres
      nomart: item.nomart || item.nombre || '',
      cd_articulo: item.cd_articulo || item.codigo || '',
      cd_barra: item.cd_barra || item.codigobarra || '',
      marca: item.marca || '',
      rubro: item.rubro || '',
      
      // Normalizar precios como números
      precon: parseFloat(this.parseFloat(item.precon).toFixed(4)),
      prefi1: parseFloat(this.parseFloat(item.prefi1).toFixed(4)),
      prefi2: parseFloat(this.parseFloat(item.prefi2).toFixed(4)),
      prefi3: parseFloat(this.parseFloat(item.prefi3).toFixed(4)),
      prefi4: parseFloat(this.parseFloat(item.prefi4).toFixed(4)),
      
      // Normalizar existencias como números
      exi1: this.parseFloat(item.exi1),
      exi2: this.parseFloat(item.exi2),
      exi3: this.parseFloat(item.exi3),
      exi4: this.parseFloat(item.exi4),
      exi5: this.parseFloat(item.exi5),
      
      estado: item.estado || ''
    }));
  }

  // Navegar a la página siguiente
  paginaSiguiente(): void {
    const paginaActual = this.paginaActualSubject.value;
    const totalPaginas = this.totalPaginasSubject.value;

    if (paginaActual < totalPaginas) {
      this.cargarPagina(paginaActual + 1).subscribe();
    }
  }

  // Navegar a la página anterior
  paginaAnterior(): void {
    const paginaActual = this.paginaActualSubject.value;

    if (paginaActual > 1) {
      this.cargarPagina(paginaActual - 1).subscribe();
    }
  }

  // Ir a una página específica
  irAPagina(pagina: number): void {
    const totalPaginas = this.totalPaginasSubject.value;

    if (pagina >= 1 && pagina <= totalPaginas) {
      const terminoBusqueda = this.terminoBusquedaSubject.value;
      if (terminoBusqueda) {
        this.buscar(terminoBusqueda, pagina).subscribe();
      } else {
        this.cargarPagina(pagina).subscribe();
      }
    }
  }

  // Cargar valores de cambio
  getValoresCambio(): Observable<any[]> {
    return this.http.get<any>(UrlValorCambio).pipe(
      catchError(error => {
        console.error('Error al cargar valores de cambio:', error);
        return throwError(error);
      })
    );
  }

  // Cargar tipos de moneda
  getTiposMoneda(): Observable<any[]> {
    return this.http.get<any>(UrlTipoMoneda).pipe(
      catchError(error => {
        console.error('Error al cargar tipos de moneda:', error);
        return throwError(error);
      })
    );
  }

  // Cargar configuración de lista
  getConfLista(): Observable<any[]> {
    return this.http.get<any>(UrlConflista).pipe(
      catchError(error => {
        console.error('Error al cargar configuración de lista:', error);
        return throwError(error);
      })
    );
  }

  // Métodos de compatibilidad
  getProductos(): any[] {
    return this.productosSubject.value;
  }

  estaCargando(): boolean {
    return this.cargandoSubject.value;
  }

  getPaginaActual(): number {
    return this.paginaActualSubject.value;
  }

  getTotalPaginas(): number {
    return this.totalPaginasSubject.value;
  }

  getTotalItems(): number {
    return this.totalItemsSubject.value;
  }

  setTamañoPagina(tamaño: number): void {
    this.tamañoPagina = tamaño;
    this.cargarPagina(1).subscribe();
  }

  // NUEVO: Cargar página con filtros completos para lazy loading
  cargarPaginaConFiltros(
    page: number,
    limit: number,
    sortField?: string,
    sortOrder: number = 1,
    filters: any = {}
  ): Observable<any> {
    this.cargandoSubject.next(true);
    
    // Solo usar filtros del usuario (los filtros automáticos se aplican en backend)
    const combinedFilters = filters;
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // NUEVO: Incluir parámetro de sucursal para filtrado automático en backend
    const sucursal = sessionStorage.getItem('sucursal');
    if (sucursal) {
      params.append('sucursal', sucursal);
      console.log('StockPaginados (lazy loading): Enviando sucursal al backend:', sucursal);
    }
    
    // Agregar ordenamiento
    if (sortField) {
      params.append('sortField', sortField);
      params.append('sortOrder', sortOrder.toString());
    }
    
    // Enviar filtros combinados tal como vienen de PrimeNG (el backend los procesará)
    if (combinedFilters && Object.keys(combinedFilters).length > 0) {
      params.append('filters', JSON.stringify(combinedFilters));
    }
    
    const urlCompleta = `${Urlartsucursal}?${params.toString()}`;
    console.log('StockPaginados: URL con filtros completos:', urlCompleta);
    console.log('StockPaginados: Filtros aplicados:', combinedFilters);
    
    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        console.log('Stock: Respuesta lazy loading:', response);
        
        if (response && !response.error && response.mensaje) {
          // Formato paginado del backend
          if (response.mensaje.data !== undefined) {
            const productos = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.productosSubject.next(this.processProductosData(productos));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(page);
          } else {
            // Formato sin paginación
            const productos = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.productosSubject.next(this.processProductosData(productos));
            this.totalItemsSubject.next(productos.length);
            this.totalPaginasSubject.next(productos.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.productosSubject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Stock: Error en lazy loading:', error);
        this.cargandoSubject.next(false);
        this.productosSubject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Limpiar término de búsqueda
  limpiarTerminoBusqueda(): void {
    this.terminoBusquedaSubject.next('');
  }

  // Limpiar datos
  limpiarCache(): void {
    this.productosSubject.next([]);
    this.terminoBusquedaSubject.next('');
    this.paginaActualSubject.next(1);
    this.totalPaginasSubject.next(0);
    this.totalItemsSubject.next(0);
    console.log('Stock: Datos limpiados');
  }

  private parseFloat(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  }
}