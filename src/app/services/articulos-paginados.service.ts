import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { 
  UrlArticulosPaginados, 
  UrlBuscarArticulos, 
  UrlBuscarArticulosTexto,
  UrlArticuloById,
  Urlartsucursal,
  UrlValorCambio,
  UrlTipoMoneda,
  UrlConflista
} from '../config/ini';

@Injectable({
  providedIn: 'root'
})
export class ArticulosPaginadosService {
  private paginaActualSubject = new BehaviorSubject<number>(1);
  private totalPaginasSubject = new BehaviorSubject<number>(0);
  private articulosSubject = new BehaviorSubject<any[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  private totalItemsSubject = new BehaviorSubject<number>(0);
  private terminoBusquedaSubject = new BehaviorSubject<string>('');
  private tamañoPagina = 50;

  // Observables públicos
  public paginaActual$ = this.paginaActualSubject.asObservable();
  public totalPaginas$ = this.totalPaginasSubject.asObservable();
  public articulos$ = this.articulosSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public totalItems$ = this.totalItemsSubject.asObservable();
  public terminoBusqueda$ = this.terminoBusquedaSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Cargar una página específica
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

    const urlConPaginacion = `${Urlartsucursal}?${params.toString()}`;

    return this.http.get<any>(urlConPaginacion).pipe(
      tap(response => {
        if (response && !response.error && response.mensaje) {
          // Si la respuesta tiene formato paginado
          if (response.mensaje.data) {
            this.articulosSubject.next(this.processProductosData(response.mensaje.data));
            this.totalItemsSubject.next(response.mensaje.total);
            this.totalPaginasSubject.next(response.mensaje.total_pages);
          } else {
            // Formato sin paginación (compatibilidad)
            const productos = this.processProductosData(response.mensaje);
            this.articulosSubject.next(productos);
            this.totalItemsSubject.next(productos.length);
            this.totalPaginasSubject.next(1);
          }
        } else {
          this.articulosSubject.next([]);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al cargar productos:', error);
        this.cargandoSubject.next(false);
        this.articulosSubject.next([]);
        return throwError(error);
      })
    );
  }

  // Buscar artículos
  buscar(termino: string, pagina: number = 1): Observable<any> {
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

    const urlConBusqueda = `${Urlartsucursal}?${params.toString()}`;

    return this.http.get<any>(urlConBusqueda).pipe(
      tap(response => {
        console.log('Respuesta de búsqueda:', response);

        if (response && !response.error && response.mensaje) {
          // Si la respuesta tiene formato paginado
          if (response.mensaje.data !== undefined) {
            const productos = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.articulosSubject.next(this.processProductosData(productos));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(pagina);
          } else {
            // Formato sin paginación o sin resultados
            const productos = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.articulosSubject.next(this.processProductosData(productos));
            this.totalItemsSubject.next(productos.length);
            this.totalPaginasSubject.next(productos.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          // No hay resultados
          this.articulosSubject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
          this.paginaActualSubject.next(1);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al buscar productos:', error);
        this.cargandoSubject.next(false);
        this.articulosSubject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Obtener un artículo específico
  obtenerArticulo(id: number): Observable<any> {
    // Using URL from ini.ts through import
    return this.http.post<any>(UrlArticuloById, { idArticulo: id }).pipe(
      catchError(error => {
        console.error(`Error al obtener artículo ID ${id}:`, error);
        return throwError(error);
      })
    );
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

  // Obtener artículos actuales
  getArticulos(): any[] {
    return this.articulosSubject.value;
  }

  // Obtener estado de carga
  estaCargando(): boolean {
    return this.cargandoSubject.value;
  }

  // Obtener la página actual
  getPaginaActual(): number {
    return this.paginaActualSubject.value;
  }

  // Obtener el total de páginas
  getTotalPaginas(): number {
    return this.totalPaginasSubject.value;
  }

  // Obtener el total de items
  getTotalItems(): number {
    return this.totalItemsSubject.value;
  }

  // Cambiar el tamaño de página
  setTamañoPagina(tamaño: number): void {
    this.tamañoPagina = tamaño;
    this.cargarPagina(1).subscribe();
  }

  // Compatibilidad temporal con sistemas antiguos que utilizan
  // el servicio articulos-cache.service.ts
  loadArticulosSucursal(): Observable<any[]> {
    this.cargandoSubject.next(true);
    return this.http.get<any>(Urlartsucursal).pipe(
      tap(response => {
        if (response && !response.error && response.mensaje) {
          this.articulosSubject.next(response.mensaje);
        } else {
          this.articulosSubject.next([]);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading articulos from API:', error);
        this.cargandoSubject.next(false);
        this.articulosSubject.next([]);
        return throwError(error);
      })
    );
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

  // Limpiar término de búsqueda
  limpiarTerminoBusqueda(): void {
    this.terminoBusquedaSubject.next('');
  }

  // Procesar datos de productos
  private processProductosData(productos: any[]): any[] {
    if (!productos || !Array.isArray(productos)) {
      return [];
    }

    return productos.map(item => ({
      ...item,
      // Asegurarse de que todos los campos necesarios existan
      nomart: item.nomart || item.nombre || '',
      cd_articulo: item.cd_articulo || item.codigo || '',
      cd_barra: item.cd_barra || item.codigobarra || '',
      marca: item.marca || '',
      rubro: item.rubro || '',
      precon: parseFloat(item.precon || '0'),
      prefi1: parseFloat(item.prefi1 || '0'),
      prefi2: parseFloat(item.prefi2 || '0'),
      prefi3: parseFloat(item.prefi3 || '0'),
      prefi4: parseFloat(item.prefi4 || '0'),
      exi1: parseFloat(item.exi1 || '0'),
      exi2: parseFloat(item.exi2 || '0'),
      exi3: parseFloat(item.exi3 || '0'),
      exi4: parseFloat(item.exi4 || '0'),
      exi5: parseFloat(item.exi5 || '0'),
      estado: item.estado || '',
      tipo_moneda: item.tipo_moneda || 1
    }));
  }
}