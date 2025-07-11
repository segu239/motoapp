import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HistorialVenta2 } from '../interfaces/historial-venta2';
import { VentaExpandida } from '../interfaces/recibo-expanded';

@Injectable({
  providedIn: 'root'
})
export class HistorialVentas2PaginadosService {
  private paginaActualSubject = new BehaviorSubject<number>(1);
  private totalPaginasSubject = new BehaviorSubject<number>(0);
  private historialVentas2Subject = new BehaviorSubject<HistorialVenta2[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  private totalItemsSubject = new BehaviorSubject<number>(0);
  private terminoBusquedaSubject = new BehaviorSubject<string>('');
  private tamañoPagina = 50;

  // URLs del backend
  private urlHistorialVentas2 = "https://motoapp.loclx.io/APIAND/index.php/Descarga/historialventas2xcli";
  private urlHistorialVentas2Global = "https://motoapp.loclx.io/APIAND/index.php/Descarga/historialventas2global";
  private urlDatosRecibo2 = "https://motoapp.loclx.io/APIAND/index.php/Descarga/obtenerDatosRecibo2";
  private urlDatosExpandidos = "https://motoapp.loclx.io/APIAND/index.php/Descarga/obtenerDatosExpandidos";

  // Observables públicos
  public paginaActual$ = this.paginaActualSubject.asObservable();
  public totalPaginas$ = this.totalPaginasSubject.asObservable();
  public historialVentas2$ = this.historialVentas2Subject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public totalItems$ = this.totalItemsSubject.asObservable();
  public terminoBusqueda$ = this.terminoBusquedaSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Cargar historial de ventas con rango de fechas
  cargarHistorialVentas2ConFechas(
    idCliente: number,
    fechaDesde: Date,
    fechaHasta: Date,
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

    // Formatear fechas para el backend (YYYY-MM-DD)
    const fechaDesdeStr = this.formatDateForBackend(fechaDesde);
    const fechaHastaStr = this.formatDateForBackend(fechaHasta);

    const params = new URLSearchParams({
      sucursal: sucursal,
      idcli: idCliente.toString(),
      fecha_desde: fechaDesdeStr,
      fecha_hasta: fechaHastaStr,
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

    const urlCompleta = `${this.urlHistorialVentas2}?${params.toString()}`;
    console.log('HistorialVentas2Paginados: URL completa con fechas:', urlCompleta);

    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        console.log('Respuesta historial ventas2 con fechas:', response);
        
        if (response && !response.error && response.mensaje) {
          // Formato paginado del backend
          if (response.mensaje.data !== undefined) {
            const ventas = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(page);
          } else {
            // Formato sin paginación
            const ventas = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(ventas.length);
            this.totalPaginasSubject.next(ventas.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.historialVentas2Subject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al cargar historial de ventas2 con fechas:', error);
        this.cargandoSubject.next(false);
        this.historialVentas2Subject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Cargar historial de ventas con filtros y paginación (método original)
  cargarHistorialVentas2(
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

    const urlCompleta = `${this.urlHistorialVentas2}?${params.toString()}`;
    console.log('HistorialVentas2Paginados: URL completa:', urlCompleta);
    console.log('HistorialVentas2Paginados: Filtros aplicados:', filters);

    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        console.log('Respuesta historial ventas2:', response);
        
        if (response && !response.error && response.mensaje) {
          // Formato paginado del backend
          if (response.mensaje.data !== undefined) {
            const ventas = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(page);
          } else {
            // Formato sin paginación
            const ventas = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(ventas.length);
            this.totalPaginasSubject.next(ventas.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.historialVentas2Subject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al cargar historial de ventas2:', error);
        this.cargandoSubject.next(false);
        this.historialVentas2Subject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Buscar en historial de ventas2
  buscar(idCliente: number, termino: string, pagina: number = 1): Observable<any> {
    this.cargandoSubject.next(true);
    this.terminoBusquedaSubject.next(termino);

    // Si no hay término, resetear y cargar página normal
    if (!termino || termino.trim() === '') {
      this.terminoBusquedaSubject.next('');
      return this.cargarHistorialVentas2(idCliente, pagina);
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

    const urlConBusqueda = `${this.urlHistorialVentas2}?${params.toString()}`;

    return this.http.get<any>(urlConBusqueda).pipe(
      tap(response => {
        console.log('Respuesta de búsqueda historial ventas2:', response);

        if (response && !response.error && response.mensaje) {
          if (response.mensaje.data !== undefined) {
            const ventas = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(pagina);
          } else {
            const ventas = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(ventas.length);
            this.totalPaginasSubject.next(ventas.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.historialVentas2Subject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
          this.paginaActualSubject.next(1);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al buscar en historial de ventas2:', error);
        this.cargandoSubject.next(false);
        this.historialVentas2Subject.next([]);
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
      this.cargarHistorialVentas2(idCliente, paginaActual + 1).subscribe();
    }
  }

  // Navegar a la página anterior
  paginaAnterior(idCliente: number): void {
    const paginaActual = this.paginaActualSubject.value;

    if (paginaActual > 1) {
      this.cargarHistorialVentas2(idCliente, paginaActual - 1).subscribe();
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
        this.cargarHistorialVentas2(idCliente, pagina).subscribe();
      }
    }
  }

  // Obtener historial de ventas actual
  getHistorialVentas2(): HistorialVenta2[] {
    return this.historialVentas2Subject.value;
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
    this.cargarHistorialVentas2(idCliente, 1).subscribe();
  }

  // Limpiar término de búsqueda
  limpiarTerminoBusqueda(): void {
    this.terminoBusquedaSubject.next('');
  }

  // Obtener datos completos del recibo
  obtenerDatosRecibo2(id: number): Observable<any> {
    const sucursal = sessionStorage.getItem('sucursal');
    if (!sucursal) {
      console.error('No se encontró la sucursal en sessionStorage');
      return throwError('No se encontró la sucursal');
    }

    const params = new URLSearchParams({
      sucursal: sucursal,
      id: id.toString()
    });

    const urlCompleta = `${this.urlDatosRecibo2}?${params.toString()}`;
    console.log('HistorialVentas2Paginados: Obteniendo datos del recibo2:', urlCompleta);

    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        console.log('Respuesta datos del recibo2:', response);
      }),
      catchError(error => {
        console.error('Error al obtener datos del recibo2:', error);
        return throwError(error);
      })
    );
  }

  // Obtener datos expandidos (recibos y psucursal) para una factura
  obtenerDatosExpandidos(idFactura: number, sucursalFactura?: string): Observable<VentaExpandida> {
    // Usar la sucursal de la factura si se proporciona, sino usar la del sessionStorage
    let sucursal = sucursalFactura;
    if (!sucursal) {
      sucursal = sessionStorage.getItem('sucursal');
      if (!sucursal) {
        console.error('No se encontró la sucursal en sessionStorage');
        return throwError('No se encontró la sucursal');
      }
    }

    const params = new URLSearchParams({
      sucursal: sucursal,
      id_factura: idFactura.toString()
    });

    const urlCompleta = `${this.urlDatosExpandidos}?${params.toString()}`;
    console.log('HistorialVentas2Paginados: Obteniendo datos expandidos:', urlCompleta);
    console.log('Usando sucursal:', sucursal, 'para factura:', idFactura);

    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        console.log('Respuesta datos expandidos:', response);
      }),
      catchError(error => {
        console.error('Error al obtener datos expandidos:', error);
        return throwError(error);
      })
    );
  }

  // Cargar historial de ventas GLOBAL con rango de fechas (para ADMIN/SUPER)
  cargarHistorialVentasGlobal(
    idCliente: number,
    userRole: string,
    fechaDesde: Date,
    fechaHasta: Date,
    page: number = 1,
    limit: number = 50,
    sortField?: string,
    sortOrder: number = 1,
    filters: any = {}
  ): Observable<any> {
    this.cargandoSubject.next(true);
    
    // Validar rol en frontend también
    if (userRole !== 'admin' && userRole !== 'super') {
      console.error('Usuario no tiene permisos para vista global');
      this.cargandoSubject.next(false);
      return throwError('Usuario no tiene permisos para vista global');
    }

    // Formatear fechas para el backend (YYYY-MM-DD)
    const fechaDesdeStr = this.formatDateForBackend(fechaDesde);
    const fechaHastaStr = this.formatDateForBackend(fechaHasta);

    const params = new URLSearchParams({
      idcli: idCliente.toString(),
      user_role: userRole,
      fecha_desde: fechaDesdeStr,
      fecha_hasta: fechaHastaStr,
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

    const urlCompleta = `${this.urlHistorialVentas2Global}?${params.toString()}`;
    console.log('HistorialVentas2Paginados: URL completa GLOBAL:', urlCompleta);

    return this.http.get<any>(urlCompleta).pipe(
      tap(response => {
        console.log('Respuesta historial ventas2 GLOBAL:', response);
        
        if (response && !response.error && response.mensaje) {
          // Formato paginado del backend
          if (response.mensaje.data !== undefined) {
            const ventas = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(page);
            console.log('Sucursales consultadas:', response.mensaje.sucursales_consultadas);
          } else {
            // Formato sin paginación
            const ventas = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(ventas.length);
            this.totalPaginasSubject.next(ventas.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.historialVentas2Subject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al cargar historial de ventas2 GLOBAL:', error);
        this.cargandoSubject.next(false);
        this.historialVentas2Subject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Buscar en historial de ventas2 GLOBAL
  buscarGlobal(idCliente: number, userRole: string, termino: string, pagina: number = 1): Observable<any> {
    this.cargandoSubject.next(true);
    this.terminoBusquedaSubject.next(termino);

    // Validar rol en frontend también
    if (userRole !== 'admin' && userRole !== 'super') {
      console.error('Usuario no tiene permisos para vista global');
      this.cargandoSubject.next(false);
      return throwError('Usuario no tiene permisos para vista global');
    }

    // Si no hay término, resetear y cargar página normal global
    if (!termino || termino.trim() === '') {
      this.terminoBusquedaSubject.next('');
      // Para búsqueda global necesitamos fechas, así que retornamos error
      this.cargandoSubject.next(false);
      return throwError('Para vista global se requiere consulta con fechas');
    }

    const params = new URLSearchParams({
      idcli: idCliente.toString(),
      user_role: userRole,
      search: termino,
      page: pagina.toString(),
      limit: this.tamañoPagina.toString()
    });

    const urlConBusqueda = `${this.urlHistorialVentas2Global}?${params.toString()}`;

    return this.http.get<any>(urlConBusqueda).pipe(
      tap(response => {
        console.log('Respuesta de búsqueda historial ventas2 GLOBAL:', response);

        if (response && !response.error && response.mensaje) {
          if (response.mensaje.data !== undefined) {
            const ventas = Array.isArray(response.mensaje.data) ? response.mensaje.data : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(response.mensaje.total || 0);
            this.totalPaginasSubject.next(response.mensaje.total_pages || 0);
            this.paginaActualSubject.next(pagina);
          } else {
            const ventas = Array.isArray(response.mensaje) ? response.mensaje : [];
            this.historialVentas2Subject.next(this.processHistorialVentas2Data(ventas));
            this.totalItemsSubject.next(ventas.length);
            this.totalPaginasSubject.next(ventas.length > 0 ? 1 : 0);
            this.paginaActualSubject.next(1);
          }
        } else {
          this.historialVentas2Subject.next([]);
          this.totalItemsSubject.next(0);
          this.totalPaginasSubject.next(0);
          this.paginaActualSubject.next(1);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al buscar en historial de ventas2 GLOBAL:', error);
        this.cargandoSubject.next(false);
        this.historialVentas2Subject.next([]);
        this.totalItemsSubject.next(0);
        this.totalPaginasSubject.next(0);
        return throwError(error);
      })
    );
  }

  // Formatear fecha para el backend (YYYY-MM-DD)
  private formatDateForBackend(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Procesar datos de historial de ventas2
  private processHistorialVentas2Data(ventas: any[]): HistorialVenta2[] {
    if (!ventas || !Array.isArray(ventas)) {
      return [];
    }

    return ventas.map(item => {
      // Calcular importe como exento + basico + iva1 + iva2 + iva3
      const exento = parseFloat(item.exento) || 0;
      const basico = parseFloat(item.basico) || 0;
      const iva1 = parseFloat(item.iva1) || 0;
      const iva2 = parseFloat(item.iva2) || 0;
      const iva3 = parseFloat(item.iva3) || 0;
      const importe = exento + basico + iva1 + iva2 + iva3;

      return {
        sucursal: item.sucursal || '',
        tipo: item.tipo || '',
        puntoventa: parseInt(item.puntoventa) || 0,
        letra: item.letra || '',
        numero_fac: parseInt(item.numero_fac) || 0,
        emitido: item.emitido || '',
        vencimiento: item.vencimiento || '',
        importe: parseFloat(importe.toFixed(2)),
        saldo: parseFloat(item.saldo) || 0,
        usuario: item.usuario || '',
        // Campos auxiliares
        exento: exento,
        basico: basico,
        iva1: iva1,
        iva2: iva2,
        iva3: iva3,
        id: parseInt(item.id) || 0,
        cliente: parseInt(item.cliente) || 0
      };
    });
  }
}