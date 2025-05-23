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

  // Cache de productos completos para búsqueda local
  private productosCompletos: any[] = [];
  private cacheCompleto = false;

  // Observables públicos
  public paginaActual$ = this.paginaActualSubject.asObservable();
  public totalPaginas$ = this.totalPaginasSubject.asObservable();
  public productos$ = this.productosSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public totalItems$ = this.totalItemsSubject.asObservable();
  public terminoBusqueda$ = this.terminoBusquedaSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Cargar una página específica de productos
  cargarPagina(pagina: number): Observable<any> {
    this.cargandoSubject.next(true);
    
    // Si es la primera vez, cargar todos los productos y paginar localmente
    if (!this.cacheCompleto) {
      return this.cargarTodosLosProductos().pipe(
        tap(() => {
          this.paginarLocalmente(pagina);
        })
      );
    } else {
      // Si ya tenemos cache, paginar localmente
      this.paginarLocalmente(pagina);
      this.cargandoSubject.next(false);
      return new Observable(observer => {
        observer.next({ mensaje: this.productosSubject.value });
        observer.complete();
      });
    }
  }

  // Cargar todos los productos una sola vez
  private cargarTodosLosProductos(): Observable<any> {
    return this.http.get<any>(Urlartsucursal).pipe(
      tap(response => {
        if (response && !response.error && response.mensaje) {
          this.productosCompletos = this.processProductosData(response.mensaje);
          this.cacheCompleto = true;
          
          // Calcular metadatos de paginación
          const totalProductos = this.productosCompletos.length;
          const totalPaginas = Math.ceil(totalProductos / this.tamañoPagina);
          
          this.totalItemsSubject.next(totalProductos);
          this.totalPaginasSubject.next(totalPaginas);
          
          console.log(`Stock: ${totalProductos} productos cargados en memoria`);
        } else {
          console.error('Error en respuesta de API:', response);
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

  // Paginar localmente los productos cargados
  private paginarLocalmente(pagina: number): void {
    const termino = this.terminoBusquedaSubject.value;
    let productosFiltrados = this.productosCompletos;

    // Aplicar filtro de búsqueda si existe
    if (termino && termino.trim() !== '') {
      const terminoLower = termino.toLowerCase();
      productosFiltrados = this.productosCompletos.filter(producto => 
        (producto.nomart && producto.nomart.toLowerCase().includes(terminoLower)) ||
        (producto.cd_articulo && producto.cd_articulo.toString().includes(terminoLower)) ||
        (producto.cd_barra && producto.cd_barra.toLowerCase().includes(terminoLower)) ||
        (producto.marca && producto.marca.toLowerCase().includes(terminoLower)) ||
        (producto.rubro && producto.rubro.toLowerCase().includes(terminoLower))
      );
    }

    // Calcular paginación
    const totalFiltrados = productosFiltrados.length;
    const totalPaginas = Math.ceil(totalFiltrados / this.tamañoPagina);
    const inicio = (pagina - 1) * this.tamañoPagina;
    const fin = inicio + this.tamañoPagina;
    
    const productosPagina = productosFiltrados.slice(inicio, fin);

    // Actualizar subjects
    this.productosSubject.next(productosPagina);
    this.paginaActualSubject.next(pagina);
    this.totalPaginasSubject.next(totalPaginas);
    this.totalItemsSubject.next(totalFiltrados);
  }

  // Buscar productos (filtra y pagina)
  buscar(termino: string, pagina: number = 1): Observable<any> {
    this.terminoBusquedaSubject.next(termino);
    
    if (!this.cacheCompleto) {
      // Si no hay cache, cargar primero
      return this.cargarTodosLosProductos().pipe(
        tap(() => {
          this.paginarLocalmente(pagina);
        })
      );
    } else {
      // Si hay cache, paginar directamente
      this.paginarLocalmente(pagina);
      return new Observable(observer => {
        observer.next({ mensaje: this.productosSubject.value });
        observer.complete();
      });
    }
  }

  // Procesar y normalizar datos de productos
  private processProductosData(productos: any[]): any[] {
    return productos.map(item => ({
      ...item,
      // Normalizar campos de nombres
      nomart: item.nomart || item.nombre || '',
      cd_articulo: item.cd_articulo || item.codigo || '',
      cd_barra: item.cd_barra || item.codigobarra || '',
      marca: item.marca || '',
      rubro: item.rubro || '',
      
      // Normalizar precios como números
      precon: this.parseFloat(item.precon),
      prefi1: this.parseFloat(item.prefi1),
      prefi2: this.parseFloat(item.prefi2),
      prefi3: this.parseFloat(item.prefi3),
      prefi4: this.parseFloat(item.prefi4),
      
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

  // Limpiar cache
  limpiarCache(): void {
    this.productosCompletos = [];
    this.cacheCompleto = false;
    this.productosSubject.next([]);
    console.log('Stock: Cache en memoria limpiado');
  }

  private parseFloat(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  }
}