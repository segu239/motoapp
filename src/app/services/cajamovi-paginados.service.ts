import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { UrlCajamoviPaginado, UrlCajamoviPorIds } from '../config/ini';

@Injectable({
  providedIn: 'root'
})
export class CajamoviPaginadosService {
  private paginaActualSubject = new BehaviorSubject<number>(1);
  private totalPaginasSubject = new BehaviorSubject<number>(0);
  private cajamovisSubject = new BehaviorSubject<any[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  private totalItemsSubject = new BehaviorSubject<number>(0);
  private tamañoPagina = 100; // 100 registros por página para cajamovi
  
  // Estado de filtros actuales
  private filtrosActuales = {
    sucursal: null as number | null,
    fechaDesde: null as Date | null,
    fechaHasta: null as Date | null
  };

  // Observables públicos
  public paginaActual$ = this.paginaActualSubject.asObservable();
  public totalPaginas$ = this.totalPaginasSubject.asObservable();
  public cajamovis$ = this.cajamovisSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public totalItems$ = this.totalItemsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Cargar una página específica con filtros
  cargarPagina(
    pagina: number, 
    sucursal: number | null = null,
    fechaDesde: Date | null = null,
    fechaHasta: Date | null = null
  ): Observable<any> {
    this.cargandoSubject.next(true);
    
    // Actualizar filtros actuales para mantener sincronización
    this.filtrosActuales = {
      sucursal: sucursal,
      fechaDesde: fechaDesde,
      fechaHasta: fechaHasta
    };
    
    // Formatear fechas para enviar al servidor
    const fechaDesdeStr = fechaDesde ? this.formatearFecha(fechaDesde) : null;
    const fechaHastaStr = fechaHasta ? this.formatearFecha(fechaHasta) : null;
    
    const params = {
      pagina: pagina,
      porPagina: this.tamañoPagina,
      sucursal: sucursal,
      fechaDesde: fechaDesdeStr,
      fechaHasta: fechaHastaStr
    };
    
    return this.http.post<any>(UrlCajamoviPaginado, params).pipe(
      tap(respuesta => {
        if (!respuesta.error && respuesta.mensaje) {
          this.cajamovisSubject.next(respuesta.mensaje);
          
          if (respuesta.metadatos) {
            this.totalPaginasSubject.next(respuesta.metadatos.total_paginas);
            this.totalItemsSubject.next(respuesta.metadatos.total_registros);
            this.paginaActualSubject.next(respuesta.metadatos.pagina_actual);
          }
        } else {
          console.error('Error en respuesta de API:', respuesta);
          this.cajamovisSubject.next([]);
        }
        this.cargandoSubject.next(false);
      }),
      catchError(error => {
        console.error('Error al cargar página de movimientos:', error);
        this.cargandoSubject.next(false);
        this.cajamovisSubject.next([]);
        return throwError(error);
      })
    );
  }

  // Navegar a la página siguiente
  paginaSiguiente(
    sucursal: number | null = null,
    fechaDesde: Date | null = null,
    fechaHasta: Date | null = null
  ): void {
    const paginaActual = this.paginaActualSubject.value;
    const totalPaginas = this.totalPaginasSubject.value;

    if (paginaActual < totalPaginas) {
      // Usar filtros actuales si no se proporcionan nuevos
      this.cargarPagina(
        paginaActual + 1, 
        sucursal ?? this.filtrosActuales.sucursal,
        fechaDesde ?? this.filtrosActuales.fechaDesde,
        fechaHasta ?? this.filtrosActuales.fechaHasta
      ).subscribe();
    }
  }

  // Navegar a la página anterior
  paginaAnterior(
    sucursal: number | null = null,
    fechaDesde: Date | null = null,
    fechaHasta: Date | null = null
  ): void {
    const paginaActual = this.paginaActualSubject.value;

    if (paginaActual > 1) {
      // Usar filtros actuales si no se proporcionan nuevos
      this.cargarPagina(
        paginaActual - 1,
        sucursal ?? this.filtrosActuales.sucursal,
        fechaDesde ?? this.filtrosActuales.fechaDesde,
        fechaHasta ?? this.filtrosActuales.fechaHasta
      ).subscribe();
    }
  }

  // Ir a una página específica
  irAPagina(
    pagina: number,
    sucursal: number | null = null,
    fechaDesde: Date | null = null,
    fechaHasta: Date | null = null
  ): void {
    const totalPaginas = this.totalPaginasSubject.value;

    if (pagina >= 1 && pagina <= totalPaginas) {
      // Usar filtros actuales si no se proporcionan nuevos
      this.cargarPagina(
        pagina,
        sucursal ?? this.filtrosActuales.sucursal,
        fechaDesde ?? this.filtrosActuales.fechaDesde,
        fechaHasta ?? this.filtrosActuales.fechaHasta
      ).subscribe();
    }
  }

  // Obtener movimientos actuales
  getCajamovis(): any[] {
    return this.cajamovisSubject.value;
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
    // No recargar automáticamente aquí, dejar que el componente lo maneje
  }
  
  // Obtener el tamaño de página actual
  getTamañoPagina(): number {
    return this.tamañoPagina;
  }
  
  // Obtener los filtros actuales
  getFiltrosActuales(): { sucursal: number | null, fechaDesde: Date | null, fechaHasta: Date | null } {
    return { ...this.filtrosActuales };
  }
  
  // Resetear filtros y volver a la primera página
  resetearFiltros(): void {
    this.filtrosActuales = {
      sucursal: null,
      fechaDesde: null,
      fechaHasta: null
    };
    this.paginaActualSubject.next(1);
  }

  // Formatear fecha para enviar al servidor
  private formatearFecha(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }
  
  // Cargar items específicos por sus IDs
  cargarItemsPorIds(ids: number[]): Observable<any> {
    if (!ids || ids.length === 0) {
      return throwError(() => new Error('No se proporcionaron IDs'));
    }
    
    // Crear el objeto de parámetros para enviar al servidor
    const params = {
      ids: ids,
      // Incluir la sucursal actual si es necesario para validación de permisos
      sucursal: this.filtrosActuales.sucursal
    };
    
    // Usar el endpoint correcto para cargar por IDs
    return this.http.post(UrlCajamoviPorIds, params).pipe(
      tap(() => console.log(`Cargando ${ids.length} items por IDs del servidor`)),
      catchError(error => {
        console.error('Error al cargar items por IDs:', error);
        return throwError(() => error);
      })
    );
  }
}