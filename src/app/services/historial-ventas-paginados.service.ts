import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HistorialVentasPaginadosService {
  private paginaActualSubject = new BehaviorSubject<number>(1);
  private totalPaginasSubject = new BehaviorSubject<number>(0);
  private historialVentasSubject = new BehaviorSubject<any[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  private totalItemsSubject = new BehaviorSubject<number>(0);
  private terminoBusquedaSubject = new BehaviorSubject<string>('');
  private tamañoPagina = 50;

  // URLs del backend
  private urlHistorialVentas = "https://motoapp.loclx.io/APIAND/index.php/Descarga/historialventasxsucxcli";

  // Observables públicos
  public paginaActual$ = this.paginaActualSubject.asObservable();
  public totalPaginas$ = this.totalPaginasSubject.asObservable();
  public historialVentas$ = this.historialVentasSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public totalItems$ = this.totalItemsSubject.asObservable();
  public terminoBusqueda$ = this.terminoBusquedaSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Cargar historial de ventas con filtros y paginación
  cargarHistorialVentas(
    idCliente: number,
    page: number = 1,
    limit: number = 50,
    sortField?: string,
    sortOrder: number = 1,
    filters: any = {}
  ): Observable<any> {
    this.cargandoSubject.next(true);
    
    const sucursal = sessionStorage.getItem('sucursal');
    if (!sucursal) {
      console.error('No se encontró la sucursal en sessionStorage');
      this.cargandoSubject.next(false);
      return throwError('No se encontró la sucursal');
    }

    const params = new URLSearchParams({
      sucursal: sucursal,
      idcli: idCliente.toString(),
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

    const urlCompleta = `${this.urlHistorialVentas}?${params.toString()}`;
    console.log('HistorialVentasPaginados: URL completa:', urlCompleta);
    console.log('HistorialVentasPaginados: Filtros aplicados:', filters);

    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        console.log('Respuesta historial ventas:', response);
        
        if (response && !response.error && response.mensaje) {
          // Formato paginado del backend
          if (response.mensaje.data !== undefined) {
            const ventas = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.historialVentasSubject.next(this.processHistorialVentasData(ventas));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(page);
          } else {
            // Formato sin paginación
            const ventas = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.historialVentasSubject.next(this.processHistorialVentasData(ventas));
            this.totalItemsSubject.next(ventas.length);
            this.totalPaginasSubject.next(ventas.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.historialVentasSubject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al cargar historial de ventas:', error);
        this.cargandoSubject.next(false);
        this.historialVentasSubject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Buscar en historial de ventas
  buscar(idCliente: number, termino: string, pagina: number = 1): Observable<any> {
    this.cargandoSubject.next(true);
    this.terminoBusquedaSubject.next(termino);

    // Si no hay término, resetear y cargar página normal
    if (!termino || termino.trim() === '') {
      this.terminoBusquedaSubject.next('');
      return this.cargarHistorialVentas(idCliente, pagina);
    }

    const sucursal = sessionStorage.getItem('sucursal');
    if (!sucursal) {
      console.error('No se encontró la sucursal en sessionStorage');
      this.cargandoSubject.next(false);
      return throwError('No se encontró la sucursal');
    }

    const params = new URLSearchParams({
      sucursal: sucursal,
      idcli: idCliente.toString(),
      search: termino,
      page: pagina.toString(),
      limit: this.tamañoPagina.toString()
    });

    const urlConBusqueda = `${this.urlHistorialVentas}?${params.toString()}`;

    return this.http.get<any>(urlConBusqueda).pipe(
      tap(response => {
        console.log('Respuesta de búsqueda historial ventas:', response);

        if (response && !response.error && response.mensaje) {
          if (response.mensaje.data !== undefined) {
            const ventas = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.historialVentasSubject.next(this.processHistorialVentasData(ventas));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(pagina);
          } else {
            const ventas = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.historialVentasSubject.next(this.processHistorialVentasData(ventas));
            this.totalItemsSubject.next(ventas.length);
            this.totalPaginasSubject.next(ventas.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.historialVentasSubject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
          this.paginaActualSubject.next(1);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al buscar en historial de ventas:', error);
        this.cargandoSubject.next(false);
        this.historialVentasSubject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Navegar a la página siguiente
  paginaSiguiente(idCliente: number): void {
    const paginaActual = this.paginaActualSubject.value;
    const totalPaginas = this.totalPaginasSubject.value;

    if (paginaActual < totalPaginas) {
      this.cargarHistorialVentas(idCliente, paginaActual + 1).subscribe();
    }
  }

  // Navegar a la página anterior
  paginaAnterior(idCliente: number): void {
    const paginaActual = this.paginaActualSubject.value;

    if (paginaActual > 1) {
      this.cargarHistorialVentas(idCliente, paginaActual - 1).subscribe();
    }
  }

  // Ir a una página específica
  irAPagina(idCliente: number, pagina: number): void {
    const totalPaginas = this.totalPaginasSubject.value;

    if (pagina >= 1 && pagina <= totalPaginas) {
      const terminoBusqueda = this.terminoBusquedaSubject.value;
      if (terminoBusqueda) {
        this.buscar(idCliente, terminoBusqueda, pagina).subscribe();
      } else {
        this.cargarHistorialVentas(idCliente, pagina).subscribe();
      }
    }
  }

  // Obtener historial de ventas actual
  getHistorialVentas(): any[] {
    return this.historialVentasSubject.value;
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
  setTamañoPagina(idCliente: number, tamaño: number): void {
    this.tamañoPagina = tamaño;
    this.cargarHistorialVentas(idCliente, 1).subscribe();
  }

  // Limpiar término de búsqueda
  limpiarTerminoBusqueda(): void {
    this.terminoBusquedaSubject.next('');
  }

  // Procesar datos de historial de ventas
  private processHistorialVentasData(ventas: any[]): any[] {
    if (!ventas || !Array.isArray(ventas)) {
      return [];
    }

    return ventas.map(item => ({
      ...item,
      // Asegurar que todos los campos necesarios existan
      tipodoc: item.tipodoc || '',
      puntoventa: parseInt(item.puntoventa) || 0,
      idart: parseInt(item.idart) || 0,
      nomart: item.nomart || '',
      fecha: item.fecha || '',
      hora: item.hora || '',
      cantidad: parseFloat(item.cantidad) || 0,
      precio: parseFloat(parseFloat(item.precio || '0').toFixed(4)),
      cod_tar: parseInt(item.cod_tar) || 0,
      numerocomprobante: parseInt(item.numerocomprobante) || 0,
      id_num: parseInt(item.id_num) || 0,
      idcli: parseInt(item.idcli) || 0,
      descripcion_tarjeta: item.descripcion_tarjeta || 'Sin definir'
    }));
  }
}