import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { AuthService } from '../../services/auth.service';
import { CajamoviPaginadosService } from '../../services/cajamovi-paginados.service';
import { CajamoviHelperService } from '../../services/cajamovi-helper.service';
import { ReporteDataService } from '../../services/reporte-data.service';
import { User } from '../../interfaces/user';
import { Cajamovi } from '../../interfaces/cajamovi';
import { extractDateString, createDateFromString, getTodayNormalized, compareDatesOnly } from '../../utils/date-utils';
import Swal from 'sweetalert2';
import { PrimeNGConfig } from 'primeng/api';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cajamovi',
  templateUrl: './cajamovi.component.html',
  styleUrls: ['./cajamovi.component.css']
})
export class CajamoviComponent implements OnInit, AfterViewInit, OnDestroy {

  public cajamovis: Cajamovi[] = [];
  public cajamovisFiltrados: Cajamovi[] = [];
  public loading: boolean = false;
  public currentUser: User | null = null;
  public selectedCajamovis: Cajamovi[] = [];
  public fechaDesde: Date | null = null;
  public fechaHasta: Date | null = null;
  @ViewChild('dtable') dtable: any; // Referencia a la tabla para acceder a filtros
  private destroy$ = new Subject<void>(); // Para limpiar suscripciones
  private isNavigatingAway: boolean = false; // Flag para controlar limpieza de sessionStorage
  private filterTimeout: any = null; // Para manejar timeouts de filtros
  private exportTimeout: any = null; // Para manejar timeout de exportación

  // Propiedades para paginación
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  
  // Sucursal para filtrar
  private sucursalFiltro: number | null = null;
  
  // Estado de selección para manejar items huérfanos
  public seleccionCompleta: Set<number> = new Set(); // IDs de todos los items seleccionados
  private itemsVisiblesActuales: Set<number> = new Set(); // IDs de items visibles con filtros aplicados
  
  // Opciones de paginación
  public registrosPorPagina: number = 100;
  public opcionesRegistrosPorPagina = [
    { label: '10 registros', value: 10 },
    { label: '50 registros', value: 50 },
    { label: '100 registros', value: 100 },
    { label: '200 registros', value: 200 },
    { label: '500 registros', value: 500 },
    { label: '1000 registros', value: 1000 }
  ];
  
  // Indicador de rendimiento
  public showPerformanceIndicator: boolean = false; // Activar solo en desarrollo
  public performanceData = {
    registrosCargados: 0,
    registrosFiltrados: 0,
    memoriaUsada: '0',
    virtualScrollActivo: true
  };

  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService,
    private authService: AuthService,
    private primengConfig: PrimeNGConfig,
    private cajamoviPaginadosService: CajamoviPaginadosService,
    private cajamoviHelper: CajamoviHelperService,
    private reporteDataService: ReporteDataService
  ) {
    this.loadCurrentUser();
  }

  ngOnInit() {
    // Recuperar estado guardado si existe
    this.recuperarEstadoGuardado();
    
    // Inicializar el tamaño de página en el servicio
    this.cajamoviPaginadosService.setTamañoPagina(this.registrosPorPagina);
    
    // Limpiar sesiones antiguas del servicio de reporte
    this.reporteDataService.cleanupOldSessions();
    
    this.primengConfig.setTranslation({
      startsWith: 'Comienza con',
      contains: 'Contiene',
      notContains: 'No contiene',
      endsWith: 'Termina con',
      equals: 'Igual a',
      notEquals: 'No igual a',
      noFilter: 'Sin filtro',
      lt: 'Menor que',
      lte: 'Menor o igual que',
      gt: 'Mayor que',
      gte: 'Mayor o igual que',
      is: 'Es',
      isNot: 'No es',
      before: 'Antes',
      after: 'Después',
      dateIs: 'Fecha es',
      dateIsNot: 'Fecha no es',
      dateBefore: 'Fecha antes de',
      dateAfter: 'Fecha después de',
      clear: 'Limpiar',
      apply: 'Aplicar',
      matchAll: 'Coincidir con todos',
      matchAny: 'Coincidir con cualquiera',
      addRule: 'Agregar regla',
      removeRule: 'Eliminar regla',
      accept: 'Sí',
      reject: 'No',
      choose: 'Elegir',
      upload: 'Subir',
      cancel: 'Cancelar',
      dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
      monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      dateFormat: 'dd/mm/yy',
      firstDayOfWeek: 1,
      today: 'Hoy',
      weekHeader: 'Sem',
      weak: 'Débil',
      medium: 'Medio',
      strong: 'Fuerte',
      passwordPrompt: 'Ingrese una contraseña',
      emptyMessage: 'No se encontraron resultados',
      emptyFilterMessage: 'No se encontraron resultados'
    });
    
    // Subscribe to loading state
    this.cajamoviPaginadosService.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
      });
    
    // Subscribe to cajamovis
    this.cajamoviPaginadosService.cajamovis$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cajamovis => {
        this.processCajamovis(cajamovis);
      });
    
    // Subscribe to pagination data
    this.cajamoviPaginadosService.paginaActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pagina => {
        this.paginaActual = pagina;
      });
    
    this.cajamoviPaginadosService.totalPaginas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(total => {
        this.totalPaginas = total;
      });
    
    this.cajamoviPaginadosService.totalItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(total => {
        this.totalItems = total;
      });
  }
  
  ngAfterViewInit() {
    // La referencia a dtable ya está disponible aquí
  }

  loadCajamovis() {
    // Usar el servicio de paginación
    this.cajamoviPaginadosService.cargarPagina(
      this.paginaActual,
      this.sucursalFiltro,
      this.fechaDesde,
      this.fechaHasta
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Los datos se manejan a través de las subscripciones
      },
      error: (error) => {
        this.handleError('Error al cargar los movimientos de caja', error);
      }
    });
  }
  
  processCajamovis(cajamovis: any[]) {
    // Optimización: procesar solo los campos necesarios y evitar duplicación
    const totalItems = cajamovis.length;
    
    // Si hay muchos registros, mostrar indicador de procesamiento
    if (totalItems > 500) {
      console.log(`Procesando ${totalItems} registros...`);
    }
    
    // Guardar IDs de la página anterior antes de actualizar
    const idsAnteriores = new Set(this.cajamovis.map(item => item.id_movimiento));
    
    // Procesar datos in-place para evitar duplicación de memoria
    this.cajamovis = cajamovis;
    
    // Convertir fechas solo cuando sea necesario (lazy conversion)
    // En lugar de convertir todas las fechas de una vez, las convertimos on-demand
    this.cajamovis.forEach((cajamovi: any, index: number) => {
      // Solo procesar fecha_mov que es la más usada
      if (cajamovi.fecha_mov && typeof cajamovi.fecha_mov === 'string') {
        // Guardar la fecha string original para búsquedas
        cajamovi.fecha_mov_string = extractDateString(cajamovi.fecha_mov);
        // Convertir a Date para ordenamiento y filtros
        cajamovi.fecha_mov = createDateFromString(cajamovi.fecha_mov);
      }
      
      // Marcar las otras fechas para conversión lazy
      cajamovi._fechasConvertidas = false;
    });
    
    // No duplicar el array completo, usar referencia
    this.cajamovisFiltrados = this.cajamovis;
    
    // Actualizar los IDs visibles actuales
    this.actualizarItemsVisibles();
    
    // Sincronizar selección manteniendo el estado global
    this.sincronizarSeleccionConEstadoGlobal();
    
    // Actualizar indicador de rendimiento
    this.actualizarIndicadorRendimiento();
    
    if (totalItems > 500) {
      console.log('Procesamiento completado');
    }
  }
  
  /**
   * Convierte las fechas de un cajamovi de forma lazy
   */
  private convertirFechasLazy(cajamovi: any): void {
    if (!cajamovi._fechasConvertidas) {
      // Convertir las demás fechas solo cuando se necesiten
      if (cajamovi.fecha_emibco && typeof cajamovi.fecha_emibco === 'string') {
        cajamovi.fecha_emibco = createDateFromString(cajamovi.fecha_emibco);
      }
      if (cajamovi.fecha_cobro_bco && typeof cajamovi.fecha_cobro_bco === 'string') {
        cajamovi.fecha_cobro_bco = createDateFromString(cajamovi.fecha_cobro_bco);
      }
      if (cajamovi.fecha_vto_bco && typeof cajamovi.fecha_vto_bco === 'string') {
        cajamovi.fecha_vto_bco = createDateFromString(cajamovi.fecha_vto_bco);
      }
      if (cajamovi.fecha_proceso && typeof cajamovi.fecha_proceso === 'string') {
        cajamovi.fecha_proceso = createDateFromString(cajamovi.fecha_proceso);
      }
      cajamovi._fechasConvertidas = true;
    }
  }
  
  /**
   * Actualiza el conjunto de items visibles actualmente
   */
  private actualizarItemsVisibles(): void {
    this.itemsVisiblesActuales.clear();
    const datosVisibles = this.getFilteredData();
    datosVisibles.forEach(item => {
      if (item.id_movimiento) {
        this.itemsVisiblesActuales.add(item.id_movimiento);
      }
    });
  }
  
  /**
   * Sincroniza la selección manteniendo el estado global correcto
   */
  private sincronizarSeleccionConEstadoGlobal(): void {
    // Si no hay selección completa, limpiar todo
    if (this.seleccionCompleta.size === 0) {
      this.selectedCajamovis = [];
      return;
    }
    
    // Reconstruir selectedCajamovis basándose SOLO en items visibles y seleccionados
    this.selectedCajamovis = this.cajamovisFiltrados.filter(item => {
      return item.id_movimiento && 
             this.seleccionCompleta.has(item.id_movimiento) &&
             this.itemsVisiblesActuales.has(item.id_movimiento);
    });
    
    // Log para debugging
    if (this.seleccionCompleta.size > 0) {
      console.log(`Selección: ${this.seleccionCompleta.size} total, ${this.selectedCajamovis.length} en página actual`);
    }
  }

  loadCurrentUser() {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        
        // Determinar si se debe filtrar por sucursal
        if (this.currentUser && this.currentUser.nivel !== 'admin' && this.currentUser.nivel !== 'super') {
          // Si no es admin ni super, filtrar por la sucursal actual
          const sucursalStr = sessionStorage.getItem('sucursal');
          if (sucursalStr) {
            this.sucursalFiltro = parseInt(sucursalStr, 10);
          }
        } else {
          this.sucursalFiltro = null;
        }
        
        // Cargar los movimientos después de obtener el usuario
        this.loadCajamovis();
      });
  }

  canEditOrDelete(cajamovi: Cajamovi): boolean {
    if (!this.currentUser) {
      return false;
    }
    
    // Si el usuario es admin o super, puede editar/eliminar cualquier movimiento
    if (this.currentUser.nivel === 'admin' || this.currentUser.nivel === 'super') {
      return true;
    }
    
    // Para otros usuarios, verificar si la fecha es anterior al día actual
    const fechaMovimiento = createDateFromString(cajamovi.fecha_mov);
    if (!fechaMovimiento) {
      return false;
    }
    
    const hoy = getTodayNormalized();
    
    // Solo puede editar/eliminar si la fecha es de hoy o posterior
    return compareDatesOnly(fechaMovimiento, hoy) >= 0;
  }

  editCajamovi(cajamovi: Cajamovi) {
    if (!this.canEditOrDelete(cajamovi)) {
      this.showErrorMessage('No tiene permisos para editar movimientos de fechas anteriores al día actual');
      return;
    }
    
    try {
      // Marcar que estamos navegando intencionalmente
      this.isNavigatingAway = true;
      
      // Guardar el estado actual antes de navegar
      this.guardarEstadoActual();
      
      // Guardar datos en sessionStorage para evitar pasar datos sensibles por URL
      sessionStorage.setItem('cajamoviEdit', JSON.stringify(cajamovi));
      
      // Navegar a la página de edición
      this.router.navigate(['components/editcajamovi']).catch(error => {
        this.handleError('Error al navegar a la página de edición', error);
        sessionStorage.removeItem('cajamoviEdit');
        sessionStorage.removeItem('cajamoviState');
        this.isNavigatingAway = false;
      });
    } catch (error) {
      this.handleError('Error al intentar editar el movimiento', error);
      // Limpiar sessionStorage en caso de error
      sessionStorage.removeItem('cajamoviEdit');
      sessionStorage.removeItem('cajamoviState');
      this.isNavigatingAway = false;
    }
  }

  confirmDelete(cajamovi: Cajamovi) {
    if (!this.canEditOrDelete(cajamovi)) {
      this.showErrorMessage('No tiene permisos para eliminar movimientos de fechas anteriores al día actual');
      return;
    }
    
    // Usar el helper para obtener el mensaje de confirmación
    const confirmacion = this.cajamoviHelper.getMensajeConfirmacionEliminacion(cajamovi.tipo_movi);
    
    // Si no se puede eliminar el movimiento
    if (!this.cajamoviHelper.puedeEliminarMovimiento(cajamovi.tipo_movi)) {
      this.showErrorMessage(confirmacion.mensaje);
      return;
    }
    
    // Agregar detalles del movimiento al mensaje
    const mensajeDetallado = `${confirmacion.mensaje} "${cajamovi.descripcion_mov}" (ID: ${cajamovi.id_movimiento})`;
    
    Swal.fire({
      title: confirmacion.titulo,
      text: mensajeDetallado,
      icon: confirmacion.requiereConfirmacionEspecial ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteCajamovi(cajamovi);
      }
    });
  }

  deleteCajamovi(cajamovi: Cajamovi) {
    this.loading = true;
    this.subirdataService.eliminarCajamovi(cajamovi.id_movimiento).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El movimiento se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadCajamovis(); // Reload the table after deletion
        } else {
          this.handleError('El movimiento no se pudo eliminar', response.mensaje);
        }
      },
      error: (error) => {
        this.loading = false;
        this.handleError('El movimiento no se pudo eliminar', error);
      }
    });
  }

  exportExcel() {
    // Determinar qué datos exportar basado en los filtros activos
    let dataToExport = this.getFilteredData();
    
    if (!dataToExport || dataToExport.length === 0) {
      this.showErrorMessage('No hay datos para exportar');
      return;
    }

    // Mostrar indicador de carga para exportaciones grandes
    if (dataToExport.length > 1000) {
      this.loading = true;
      Swal.fire({
        title: 'Exportando datos...',
        text: `Procesando ${dataToExport.length} registros`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }

    // Usar setTimeout para no bloquear la UI
    this.exportTimeout = setTimeout(() => {
      try {
        import('xlsx').then((xlsx) => {
          // Preparar datos optimizados para exportación
          const datosOptimizados = this.prepararDatosParaExportacion(dataToExport);
          
          // Crear worksheet con opciones de rendimiento
          const worksheet = xlsx.utils.json_to_sheet(datosOptimizados, {
            dateNF: 'dd/mm/yyyy',
            cellDates: true
          });
          
          const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
          const excelBuffer: any = xlsx.write(workbook, { 
            bookType: 'xlsx', 
            type: 'array',
            compression: true // Comprimir para archivos grandes
          });
          
          this.saveAsExcelFile(excelBuffer, 'cajamovis');
          
          // Cerrar el indicador de carga
          if (dataToExport.length > 1000) {
            this.loading = false;
            Swal.close();
          }
        }).catch(error => {
          this.loading = false;
          Swal.close();
          console.error('Error importing xlsx library:', error);
          this.showErrorMessage('Error al cargar la librería de exportación');
        });
      } catch (error) {
        this.loading = false;
        Swal.close();
        console.error('Error exporting to Excel:', error);
        this.showErrorMessage('Error al exportar a Excel');
      }
    }, 100);
  }
  
  /**
   * Prepara los datos para exportación, convirtiendo fechas y optimizando el formato
   */
  private prepararDatosParaExportacion(datos: Cajamovi[]): any[] {
    return datos.map(item => {
      // Convertir fechas lazy si no están convertidas
      this.convertirFechasLazy(item);
      
      return {
        'Sucursal': item.sucursal,
        // 'Código': item.codigo_mov, // Campo comentado/oculto
        'Concepto': item.descripcion_concepto || '-',
        'N° Operación': item.num_operacion,
        'Fecha': item.fecha_mov,
        'Importe': item.importe_mov,
        'Caja': item.descripcion_caja || '-',
        'Descripción': item.descripcion_mov,
        'Tipo': item.tipo_movi,
        'ID': item.id_movimiento
      };
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  private showErrorMessage(message: string): void {
    Swal.fire({
      title: '¡Error!',
      text: message,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }
  
  /**
   * Manejo centralizado de errores
   */
  private handleError(message: string, error?: any): void {
    // Log del error solo en desarrollo
    if (error && !environment.production) {
      console.error(message, error);
    }
    
    // Mostrar mensaje al usuario
    this.showErrorMessage(message);
    
    // Resetear el estado de carga si es necesario
    if (this.loading) {
      this.loading = false;
    }
  }

  generarReporte() {
    console.log('=== INICIO generarReporte ===');
    console.log('Selección completa:', this.seleccionCompleta.size, 'items');
    
    if (this.seleccionCompleta.size === 0) {
      this.showErrorMessage('Por favor seleccione al menos un movimiento para generar el reporte');
      return;
    }

    // Mostrar indicador de carga si hay muchos items seleccionados
    if (this.seleccionCompleta.size > 100) {
      this.loading = true;
      Swal.fire({
        title: 'Preparando reporte...',
        text: `Recopilando ${this.seleccionCompleta.size} registros seleccionados`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }

    // Recopilar TODOS los items seleccionados de todas las páginas
    this.recopilarTodosLosItemsSeleccionados().then(itemsSeleccionados => {
      console.log('Items recopilados:', itemsSeleccionados.length);
      
      if (itemsSeleccionados.length === 0) {
        this.loading = false;
        Swal.close();
        this.showErrorMessage('No se pudieron recuperar los items seleccionados');
        return;
      }

      try {
        // Marcar que estamos navegando intencionalmente
        this.isNavigatingAway = true;
        
        // Guardar el estado actual antes de navegar
        this.guardarEstadoActual();
        
        // Guardar los datos usando el servicio
        console.log('Guardando datos en el servicio...');
        this.reporteDataService.setReporteData(itemsSeleccionados);
        
        // También guardar en sessionStorage como respaldo
        const dataToStore = JSON.stringify(itemsSeleccionados);
        sessionStorage.setItem('reporteData', dataToStore);
        
        // Cerrar indicador de carga
        this.loading = false;
        Swal.close();
        
        // Navegar al componente de reporte
        console.log('Navegando a /components/reporte...');
        this.router.navigate(['/components/reporte']).then(
          (success) => {
            console.log('Navegación exitosa:', success);
          },
          (error) => {
            console.error('Error en navegación:', error);
            this.handleError('Error al navegar al reporte', error);
            this.reporteDataService.clearReporteData();
            this.isNavigatingAway = false;
          }
        );
      } catch (error) {
        this.loading = false;
        Swal.close();
        console.error('Error en try-catch:', error);
        this.handleError('Error al generar el reporte', error);
        this.reporteDataService.clearReporteData();
        this.isNavigatingAway = false;
      }
    }).catch(error => {
      this.loading = false;
      Swal.close();
      this.handleError('Error al recopilar items seleccionados', error);
    });
    
    console.log('=== FIN generarReporte ===');
  }
  
  /**
   * Recopila todos los items seleccionados de todas las páginas
   */
  private async recopilarTodosLosItemsSeleccionados(): Promise<Cajamovi[]> {
    let itemsRecopilados: Cajamovi[] = [];
    const itemsEnMemoria = new Map<number, Cajamovi>();
    
    // Primero, recopilar todos los items que ya tenemos en memoria
    this.cajamovisFiltrados.forEach(item => {
      if (item.id_movimiento && this.seleccionCompleta.has(item.id_movimiento)) {
        itemsEnMemoria.set(item.id_movimiento, item);
        itemsRecopilados.push(item);
      }
    });
    
    // Determinar qué IDs faltan por cargar
    const idsFaltantes: number[] = [];
    this.seleccionCompleta.forEach(id => {
      if (!itemsEnMemoria.has(id)) {
        idsFaltantes.push(id);
      }
    });
    
    console.log(`Total seleccionados: ${this.seleccionCompleta.size}`);
    console.log(`Items en memoria: ${itemsRecopilados.length}, Items faltantes: ${idsFaltantes.length}`);
    
    // Si hay items faltantes, cargarlos del servidor
    if (idsFaltantes.length > 0) {
      try {
        // Mostrar indicador de carga si hay muchos items faltantes
        if (idsFaltantes.length > 50) {
          Swal.fire({
            title: 'Cargando datos adicionales...',
            text: `Recuperando ${idsFaltantes.length} registros adicionales`,
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });
        }
        
        // Cargar los items faltantes del servidor con timeout
        const response = await new Promise<any>((resolve, reject) => {
          // Timeout de 30 segundos para evitar que la Promise quede colgada
          const timeoutId = setTimeout(() => {
            reject(new Error('Timeout al cargar items del servidor'));
          }, 30000);
          
          this.cajamoviPaginadosService.cargarItemsPorIds(idsFaltantes)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (data) => {
                clearTimeout(timeoutId);
                resolve(data);
              },
              error: (err) => {
                clearTimeout(timeoutId);
                reject(err);
              }
            });
        });
        
        if (response && !response.error && response.mensaje) {
          // Procesar los items recibidos
          const itemsCargados = Array.isArray(response.mensaje) ? response.mensaje : [];
          
          itemsCargados.forEach((item: any) => {
            // Aplicar el mismo procesamiento de fechas que en processCajamovis
            if (item.fecha_mov && typeof item.fecha_mov === 'string') {
              item.fecha_mov_string = extractDateString(item.fecha_mov);
              item.fecha_mov = createDateFromString(item.fecha_mov);
            }
            item._fechasConvertidas = false;
            
            // Agregar a la colección de items recopilados SOLO si no está ya en memoria
            if (item.id_movimiento && 
                this.seleccionCompleta.has(item.id_movimiento) && 
                !itemsEnMemoria.has(item.id_movimiento)) {
              itemsRecopilados.push(item);
              // También agregarlo al mapa para evitar duplicados si hay múltiples respuestas
              itemsEnMemoria.set(item.id_movimiento, item);
            }
          });
          
          console.log(`Items cargados del servidor: ${itemsCargados.length}`);
        } else {
          console.error('Respuesta inválida del servidor:', response);
          throw new Error('No se pudieron cargar los items adicionales');
        }
        
        // Cerrar el indicador de carga si se mostró
        if (idsFaltantes.length > 50) {
          Swal.close();
        }
        
      } catch (error) {
        console.error('Error al cargar items faltantes:', error);
        Swal.close();
        
        // Mostrar advertencia al usuario
        const resultado = await Swal.fire({
          title: 'Advertencia',
          html: `
            <p>No se pudieron cargar todos los registros seleccionados.</p>
            <p>Se generará el reporte con ${itemsRecopilados.length} de ${this.seleccionCompleta.size} registros.</p>
            <p>¿Desea continuar?</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Continuar',
          cancelButtonText: 'Cancelar'
        });
        
        if (!resultado.isConfirmed) {
          throw new Error('Operación cancelada por el usuario');
        }
      }
    }
    
    // Verificar integridad de los datos
    const totalEsperado = this.seleccionCompleta.size;
    const totalRecopilado = itemsRecopilados.length;
    
    // Verificar que no hay duplicados
    const idsUnicos = new Set(itemsRecopilados.map(item => item.id_movimiento));
    if (idsUnicos.size !== totalRecopilado) {
      console.error(`ERROR: Hay duplicados! Items: ${totalRecopilado}, IDs únicos: ${idsUnicos.size}`);
      // Eliminar duplicados si los hay
      const itemsSinDuplicados = new Map<number, Cajamovi>();
      itemsRecopilados.forEach(item => {
        if (item.id_movimiento && !itemsSinDuplicados.has(item.id_movimiento)) {
          itemsSinDuplicados.set(item.id_movimiento, item);
        }
      });
      // Reemplazar el array con los items sin duplicados
      itemsRecopilados = Array.from(itemsSinDuplicados.values());
      console.log(`Items después de eliminar duplicados: ${itemsRecopilados.length}`);
    }
    
    if (totalRecopilado !== totalEsperado) {
      console.warn(`Advertencia: Se esperaban ${totalEsperado} items pero se recopilaron ${totalRecopilado}`);
    } else {
      console.log(`✓ Recopilación exitosa: ${totalRecopilado} items de ${totalEsperado} esperados`);
    }
    
    // Ordenar los items por fecha para el reporte
    itemsRecopilados.sort((a, b) => {
      const fechaA = a.fecha_mov instanceof Date ? a.fecha_mov.getTime() : 0;
      const fechaB = b.fecha_mov instanceof Date ? b.fecha_mov.getTime() : 0;
      return fechaB - fechaA; // Orden descendente (más reciente primero)
    });
    
    return itemsRecopilados;
  }

  aplicarFiltroFecha() {
    // Validar que fechaDesde no sea mayor que fechaHasta
    if (this.fechaDesde && this.fechaHasta && this.fechaDesde > this.fechaHasta) {
      this.showErrorMessage('La fecha desde no puede ser mayor que la fecha hasta');
      return;
    }

    // Al aplicar nuevos filtros de fecha, debemos:
    // 1. Volver a la primera página
    this.paginaActual = 1;
    
    // 2. Limpiar la selección actual ya que los items pueden cambiar
    this.limpiarSeleccion();
    
    // 3. Notificar al servicio que debe resetear su estado interno
    // y cargar la primera página con los nuevos filtros
    this.cajamoviPaginadosService.cargarPagina(
      1, // Siempre empezar desde la primera página con nuevos filtros
      this.sucursalFiltro,
      this.fechaDesde,
      this.fechaHasta
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Los datos se manejan a través de las subscripciones en ngOnInit
        console.log('Filtros de fecha aplicados correctamente');
      },
      error: (error) => {
        this.handleError('Error al aplicar filtros de fecha', error);
      }
    });
  }

  limpiarFiltrosFecha() {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.aplicarFiltroFecha();
  }
  
  /**
   * Limpia toda la selección (de todas las páginas)
   */
  limpiarSeleccion() {
    // Limpiar el Set de selección completa
    this.seleccionCompleta.clear();
    
    // Limpiar la selección visible
    this.selectedCajamovis = [];
    
    // Actualizar los items visibles
    this.actualizarItemsVisibles();
    
    console.log('Selección limpiada completamente');
  }

  onTableFilter(event: any) {
    // Este método se ejecuta cuando se aplica cualquier filtro en la tabla
    console.log('onTableFilter llamado:', event);
    
    // Limpiar timeout anterior si existe
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    
    // Sincronizar la selección después del filtrado
    // Usar setTimeout para asegurar que la tabla se actualice primero
    this.filterTimeout = setTimeout(() => {
      this.sincronizarSeleccion();
      this.actualizarIndicadorRendimiento(); // Actualizar indicador de rendimiento
      this.filterTimeout = null;
    }, 0);
  }

  /**
   * Obtiene los datos filtrados considerando tanto filtros de fecha como de columna
   * Optimizado para manejar grandes cantidades de datos
   */
  private getFilteredData(): Cajamovi[] {
    let datos: any[] = [];
    
    // Si la tabla tiene filtros de columna activos y hay resultados filtrados
    if (this.dtable && this.dtable.filteredValue !== undefined && this.dtable.filteredValue !== null) {
      // Verificar que filteredValue es un array con elementos
      if (Array.isArray(this.dtable.filteredValue)) {
        datos = this.dtable.filteredValue;
      }
    } else {
      // Si no hay filtros de columna activos, devolver los datos filtrados por fecha
      datos = this.cajamovisFiltrados || [];
    }
    
    // Límite de seguridad para evitar problemas de memoria
    const MAX_EXPORT_RECORDS = 10000;
    
    if (datos.length > MAX_EXPORT_RECORDS) {
      console.warn(`⚠️ Se exportarán solo los primeros ${MAX_EXPORT_RECORDS} de ${datos.length} registros para evitar problemas de memoria.`);
      console.warn('Para exportar todos los registros, considere filtrar por fecha o usar la exportación por lotes desde el servidor.');
      
      // Mostrar alerta al usuario
      Swal.fire({
        title: 'Límite de exportación',
        html: `<p>Se detectaron <strong>${datos.length.toLocaleString()}</strong> registros.</p>
               <p>Por seguridad, solo se exportarán los primeros <strong>${MAX_EXPORT_RECORDS.toLocaleString()}</strong> registros.</p>
               <p>Para exportar todos los datos, considere:</p>
               <ul style="text-align: left;">
                 <li>Filtrar por rango de fechas más específico</li>
                 <li>Usar filtros adicionales para reducir los resultados</li>
                 <li>Contactar al administrador para exportación masiva</li>
               </ul>`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      
      return datos.slice(0, MAX_EXPORT_RECORDS);
    }
    
    return datos;
  }
  
  // Método para actualizar el indicador de rendimiento
  private actualizarIndicadorRendimiento() {
    this.performanceData.registrosCargados = this.cajamovis.length;
    this.performanceData.registrosFiltrados = this.dtable?.filteredValue?.length || this.cajamovisFiltrados.length;
    
    // Obtener uso de memoria si está disponible
    if ('memory' in performance && (performance as any).memory) {
      const memoriaUsada = (performance as any).memory.usedJSHeapSize / 1048576;
      this.performanceData.memoriaUsada = memoriaUsada.toFixed(2);
    }
    
    // Verificar si el virtual scroll está activo
    this.performanceData.virtualScrollActivo = this.cajamovisFiltrados.length > 0;
  }
  
  // Métodos de paginación
  irAPagina(pagina: number) {
    this.cajamoviPaginadosService.irAPagina(
      pagina,
      this.sucursalFiltro,
      this.fechaDesde,
      this.fechaHasta
    );
  }
  
  paginaSiguiente() {
    this.cajamoviPaginadosService.paginaSiguiente(
      this.sucursalFiltro,
      this.fechaDesde,
      this.fechaHasta
    );
  }
  
  paginaAnterior() {
    this.cajamoviPaginadosService.paginaAnterior(
      this.sucursalFiltro,
      this.fechaDesde,
      this.fechaHasta
    );
  }
  
  // Obtener números de página visibles en la paginación
  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    const numerosPaginasVisibles = 10;
    const paginasACadaLado = Math.floor(numerosPaginasVisibles / 2);
    
    let inicio = Math.max(1, this.paginaActual - paginasACadaLado);
    let fin = Math.min(this.totalPaginas, inicio + numerosPaginasVisibles - 1);
    
    // Ajustar inicio si fin está al límite
    if (fin === this.totalPaginas) {
      inicio = Math.max(1, fin - numerosPaginasVisibles + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  /**
   * Sincroniza la selección actual con los datos disponibles
   * Mantiene el estado de selección completa y actualiza selectedCajamovis
   * Optimizado para grandes cantidades de datos
   */
  private sincronizarSeleccion() {
    // Actualizar los items visibles antes de sincronizar
    this.actualizarItemsVisibles();
    
    // Delegar al método que maneja el estado global
    this.sincronizarSeleccionConEstadoGlobal();
  }
  
  /**
   * Cambia el número de registros por página
   */
  onRegistrosPorPaginaChange(event: any) {
    console.log('Cambiando registros por página:', event);
    const nuevoTamaño = event.value;
    
    if (nuevoTamaño) {
      this.registrosPorPagina = nuevoTamaño;
      
      // Actualizar el tamaño en el servicio
      this.cajamoviPaginadosService.setTamañoPagina(nuevoTamaño);
      
      // NO limpiar selección - mantenerla entre cambios de tamaño de página
      // Solo se limpiará si el usuario lo hace manualmente
      
      // Volver a la primera página con el nuevo tamaño
      this.paginaActual = 1;
      
      // Recargar los datos con el nuevo tamaño
      this.cajamoviPaginadosService.cargarPagina(
        1,
        this.sucursalFiltro,
        this.fechaDesde,
        this.fechaHasta
      ).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          console.log('Datos recargados con nuevo tamaño de página:', nuevoTamaño);
          // La sincronización se hace automáticamente en processCajamovis
        },
        error: (error) => {
          this.handleError('Error al cambiar el tamaño de página', error);
        }
      });
    }
  }
  
  /**
   * Maneja los cambios en la selección de items
   * Se debe vincular este método al evento de cambio de selección de la tabla
   */
  onSelectionChange(event: any) {
    // El evento puede venir de diferentes formas dependiendo de la acción
    const nuevaSeleccion = event.value || event || [];
    
    // Actualizar selectedCajamovis con la nueva selección
    this.selectedCajamovis = Array.isArray(nuevaSeleccion) ? nuevaSeleccion : [nuevaSeleccion];
    
    // Crear un Set de IDs seleccionados actualmente en la página
    const idsSeleccionadosEnPagina = new Set(
      this.selectedCajamovis.map(item => item.id_movimiento).filter(id => id !== undefined)
    );
    
    // Actualizar seleccionCompleta basándose en la página actual
    // Solo actualizar los items que están actualmente visibles
    this.cajamovisFiltrados.forEach(item => {
      if (!item.id_movimiento) return;
      
      if (idsSeleccionadosEnPagina.has(item.id_movimiento)) {
        // Agregar a la selección global
        this.seleccionCompleta.add(item.id_movimiento);
      } else {
        // Solo eliminar de la selección global si el item está visible en esta página
        // Esto previene que se deseleccionen items de otras páginas
        if (this.itemsVisiblesActuales.has(item.id_movimiento)) {
          this.seleccionCompleta.delete(item.id_movimiento);
        }
      }
    });
    
    // Mostrar estado de selección
    const totalSeleccionados = this.seleccionCompleta.size;
    const seleccionadosEnPagina = this.selectedCajamovis.length;
    
    if (totalSeleccionados > seleccionadosEnPagina) {
      console.log(`Selección: ${seleccionadosEnPagina} en página actual, ${totalSeleccionados} en total (incluyendo otras páginas)`);
    }
  }

  /**
   * Guarda el estado actual del componente en sessionStorage
   */
  private guardarEstadoActual(): void {
    const estado = {
      paginaActual: this.paginaActual,
      registrosPorPagina: this.registrosPorPagina,
      fechaDesde: this.fechaDesde ? this.fechaDesde.toISOString() : null,
      fechaHasta: this.fechaHasta ? this.fechaHasta.toISOString() : null,
      seleccionCompleta: Array.from(this.seleccionCompleta),
      timestamp: new Date().getTime()
    };
    
    sessionStorage.setItem('cajamoviState', JSON.stringify(estado));
  }
  
  /**
   * Recupera el estado guardado desde sessionStorage
   */
  private recuperarEstadoGuardado(): void {
    const estadoGuardado = sessionStorage.getItem('cajamoviState');
    
    if (estadoGuardado) {
      try {
        const estado = JSON.parse(estadoGuardado);
        
        // Verificar que el estado no sea muy antiguo (máximo 30 minutos)
        const ahora = new Date().getTime();
        const tiempoTranscurrido = ahora - (estado.timestamp || 0);
        const treintaMinutos = 30 * 60 * 1000;
        
        if (tiempoTranscurrido < treintaMinutos) {
          // Restaurar el estado
          this.paginaActual = estado.paginaActual || 1;
          this.registrosPorPagina = estado.registrosPorPagina || 100;
          
          if (estado.fechaDesde) {
            this.fechaDesde = new Date(estado.fechaDesde);
          }
          
          if (estado.fechaHasta) {
            this.fechaHasta = new Date(estado.fechaHasta);
          }
          
          if (estado.seleccionCompleta && Array.isArray(estado.seleccionCompleta)) {
            this.seleccionCompleta = new Set(estado.seleccionCompleta);
          }
          
          console.log('Estado de paginación restaurado:', {
            pagina: this.paginaActual,
            registrosPorPagina: this.registrosPorPagina
          });
        } else {
          // El estado es muy antiguo, eliminarlo
          sessionStorage.removeItem('cajamoviState');
        }
      } catch (error) {
        console.error('Error al recuperar estado guardado:', error);
        sessionStorage.removeItem('cajamoviState');
      }
    }
  }

  ngOnDestroy() {
    // Limpiar timeout de filtros si existe
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
      this.filterTimeout = null;
    }
    
    // Limpiar timeout de exportación si existe
    if (this.exportTimeout) {
      clearTimeout(this.exportTimeout);
      this.exportTimeout = null;
    }
    
    // Limpiar datos del servicio de reporte para esta sesión
    this.reporteDataService.clearReporteData();
    
    // Completar el subject de destrucción ANTES de emitir
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar referencias a objetos grandes para liberar memoria
    this.cajamovis = [];
    this.cajamovisFiltrados = [];
    this.selectedCajamovis = [];
    
    // Limpiar Sets
    this.seleccionCompleta.clear();
    this.itemsVisiblesActuales.clear();
    
    // Limpiar referencias a componentes
    if (this.dtable) {
      // Limpiar cualquier estado interno de la tabla si es necesario
      if (this.dtable.filteredValue) {
        this.dtable.filteredValue = null;
      }
      this.dtable = null;
    }
    
    // Limpiar todas las referencias a objetos
    this.currentUser = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
    
    // Solo limpiar sessionStorage si NO estamos navegando intencionalmente
    if (!this.isNavigatingAway) {
      // Limpiar completamente el sessionStorage de datos temporales de cajamovi
      const keysToRemove = [
        'cajamoviEdit',
        'reporteData',
        'cajamoviFilters',
        'cajamoviSelection',
        'cajamoviState'
      ];
      
      keysToRemove.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.error('Error al limpiar sessionStorage:', e);
        }
      });
    }
    
    // Reset del flag
    this.isNavigatingAway = false;
    
    // NO anular las referencias a servicios inyectados
    // Angular se encarga de esto automáticamente
    // Anularlos puede causar problemas si otros componentes los usan
  }

}