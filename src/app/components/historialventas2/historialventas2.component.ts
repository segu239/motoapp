import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { HistorialVentas2PaginadosService } from '../../services/historial-ventas2-paginados.service';
import { Subscription } from 'rxjs';
import { LazyLoadEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { HistorialVenta2 } from '../../interfaces/historial-venta2';
import { VentaExpandida } from '../../interfaces/recibo-expanded';
import { TotalizadorGeneral, TotalizadorTipoPago, TotalizadorPorTipo, TotalizadorPorSucursal } from '../../interfaces/totalizador-historial';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { HistorialPdfService } from '../../services/historial-pdf.service';
import { CargardataService } from '../../services/cargardata.service';
import { CrudService } from '../../services/crud.service';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TotalizadorModalComponent } from './totalizador-modal.component';
import { User } from '../../interfaces/user';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { NumeroPalabrasService } from '../../services/numero-palabras.service';
import { getEmpresaConfig } from '../../config/empresa-config';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-historialventas2',
  templateUrl: './historialventas2.component.html',
  styleUrls: ['./historialventas2.component.css']
})
export class Historialventas2Component implements OnInit, OnDestroy {

  @ViewChild('dtable') dtable!: Table;
  
  public historialVentas2: HistorialVenta2[] = [];
  public clienteInfo: any = null;
  public idCliente: number = 0;
  public loading: boolean = false;
  
  // Variable para almacenar la venta seleccionada
  public ventaSeleccionada: HistorialVenta2 | null = null;
  
  // Variables para expansión de filas
  public expandedRows: { [key: string]: VentaExpandida } = {};
  public loadingExpanded: { [key: string]: boolean } = {};
  
  // Variables para filtro de fechas
  public fechaDesde: Date | null = null;
  public fechaHasta: Date | null = null;
  public consultaRealizada: boolean = false;
  
  // Variables para paginación
  public totalRegistros: number = 0;
  public rows: number = 50;
  public first: number = 0;
  
  // Variables para columnas
  public cols: Column[] = [];
  public selectedColumns: Column[] = [];
  
  // Variables para totalizador
  public totalizador: TotalizadorGeneral | null = null;
  public tarjetasMap: Map<number, string> = new Map();
  public calculandoTotalizador: boolean = false;
  private totalizadorDialogRef: DynamicDialogRef | undefined;
  
  // Variables para vista global
  public vistaGlobal: boolean = false;
  public mostrarToggleGlobal: boolean = false;
  public currentUser: User | null = null;
  
  // Mapeo de usuarios ID -> nombre
  private usuariosMap: Map<string, string> = new Map();
  
  // Subscripciones
  private subscriptions: Subscription[] = [];
  private datosSubscription: Subscription | null = null;

  constructor(
    private historialVentas2Service: HistorialVentas2PaginadosService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private pdfGeneratorService: PdfGeneratorService,
    private historialPdfService: HistorialPdfService,
    private cargardataService: CargardataService,
    private crudService: CrudService,
    private dialogService: DialogService,
    private authService: AuthService,
    private numeroPalabrasService: NumeroPalabrasService
  ) {
    this.initializeColumns();
  }

  ngOnInit(): void {
    // Obtener usuario actual y verificar permisos
    this.subscriptions.push(
      this.authService.user$.subscribe(user => {
        this.currentUser = user;
        // Mostrar toggle solo para ADMIN y SUPER
        this.mostrarToggleGlobal = user ? (user.nivel === 'admin' || user.nivel === 'super') : false;
        
        console.log('Usuario actual:', user);
        console.log('Nivel del usuario:', user?.nivel);
        console.log('Mostrar toggle global:', this.mostrarToggleGlobal);
        
        this.cdr.detectChanges();
      })
    );

    // Obtener parámetros de la ruta
    this.route.queryParams.subscribe(params => {
      if (params['cliente']) {
        try {
          this.clienteInfo = JSON.parse(params['cliente']);
          this.idCliente = this.clienteInfo.idcli;
          console.log('Cliente recibido:', this.clienteInfo);
        } catch (error) {
          console.error('Error al parsear cliente:', error);
          this.showNotification('Error al procesar información del cliente', 'error');
          this.router.navigate(['components/puntoventa']);
        }
      } else {
        this.showNotification('No se recibió información del cliente', 'error');
        this.router.navigate(['components/puntoventa']);
      }
    });

    // Suscribirse a los observables del servicio SOLO para estado de carga
    this.subscriptions.push(
      this.historialVentas2Service.cargando$.subscribe(loading => {
        this.loading = loading;
        this.cdr.detectChanges();
      })
    );

    // Inicializar fechas por defecto (último mes)
    this.inicializarFechasPorDefecto();
    
    // Limpiar cualquier dato previo del servicio
    this.limpiarDatosServicio();
    
    // Cargar tarjetas para el totalizador
    this.cargarTarjetas();
    
    // Cargar usuarios para el mapeo
    this.cargarUsuarios();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.totalizadorDialogRef) {
      this.totalizadorDialogRef.close();
    }
  }

  private initializeColumns(): void {
    this.cols = [
      { field: 'sucursal', header: 'Sucursal' },
      { field: 'tipo', header: 'Tipo' },
      { field: 'puntoventa', header: 'Punto Venta' },
      { field: 'letra', header: 'Letra' },
      { field: 'numero_int', header: 'Número Int.' },
      { field: 'numero_fac', header: 'Número Fac.' },
      { field: 'emitido', header: 'Emitido' },
      { field: 'vencimiento', header: 'Vencimiento' },
      { field: 'importe', header: 'Importe' },
      { field: 'saldo', header: 'Saldo' },
      { field: 'usuario', header: 'Usuario' }
    ];

    // Seleccionar columnas por defecto
    this.selectedColumns = [...this.cols];
  }

  // Inicializar fechas por defecto (último mes)
  private inicializarFechasPorDefecto(): void {
    const hoy = new Date();
    this.fechaHasta = new Date(hoy);
    
    // Fecha desde: hace 30 días
    this.fechaDesde = new Date(hoy);
    this.fechaDesde.setDate(hoy.getDate() - 30);
  }

  // Limpiar datos del servicio al inicializar
  private limpiarDatosServicio(): void {
    this.historialVentas2 = [];
    this.totalRegistros = 0;
    this.consultaRealizada = false;
    this.cdr.detectChanges();
  }

  // Suscribirse a los datos del servicio después de hacer consulta
  private suscribirseADatos(): void {
    // Si ya hay una suscripción, no crear otra
    if (this.datosSubscription && !this.datosSubscription.closed) {
      return;
    }
    
    console.log('Suscribiéndose a los observables de datos...');
    
    // Crear nueva suscripción compuesta
    this.datosSubscription = new Subscription();
    
    this.datosSubscription.add(
      this.historialVentas2Service.historialVentas2$.subscribe(ventas => {
        console.log('Datos recibidos del servicio:', ventas);
        this.historialVentas2 = ventas;
        this.cdr.detectChanges();
      })
    );
    
    this.datosSubscription.add(
      this.historialVentas2Service.totalItems$.subscribe(total => {
        console.log('Total items recibidos:', total);
        this.totalRegistros = total;
        this.cdr.detectChanges();
      })
    );
    
    // Agregar a subscriptions para limpieza
    this.subscriptions.push(this.datosSubscription);
  }

  // Consultar historial con rango de fechas
  consultarHistorial(): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      this.showNotification('Debe seleccionar ambas fechas para consultar', 'warning');
      return;
    }

    if (this.fechaDesde > this.fechaHasta) {
      this.showNotification('La fecha desde no puede ser mayor que la fecha hasta', 'warning');
      return;
    }

    if (this.idCliente === 0) {
      this.showNotification('ID de cliente no disponible', 'error');
      return;
    }

    // Marcar que se realizó una consulta
    this.consultaRealizada = true;
    
    // Resetear paginación pero preservar filtros
    this.first = 0;

    // Suscribirse a los datos SOLO después de hacer la consulta
    this.suscribirseADatos();

    // Realizar consulta con rango de fechas según la vista
    // Obtener filtros actuales si existen
    const filtrosActuales = this.dtable?.filters || {};
    
    if (this.vistaGlobal) {
      this.cargarDatosGlobalesConFechas(1, this.rows, undefined, 1, filtrosActuales);
    } else {
      this.cargarDatosConFechas(1, this.rows, undefined, 1, filtrosActuales);
    }
  }

  // Cargar datos con rango de fechas
  private cargarDatosConFechas(page: number, limit: number, sortField?: string, sortOrder: number = 1, filters: any = {}): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      return;
    }

    console.log('Cargando datos con rango de fechas:', {
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      idCliente: this.idCliente,
      page,
      limit
    });

    this.historialVentas2Service.cargarHistorialVentas2ConFechas(
      this.idCliente,
      this.fechaDesde,
      this.fechaHasta,
      page,
      limit,
      sortField,
      sortOrder,
      filters
    ).subscribe({
      next: (response) => {
        console.log('Datos cargados exitosamente con fechas');
      },
      error: (error) => {
        console.error('Error al cargar historial de ventas2 con fechas:', error);
        this.showNotification('Error al cargar el historial de ventas', 'error');
      }
    });
  }

  // Cargar datos GLOBALES con rango de fechas (solo ADMIN/SUPER)
  private cargarDatosGlobalesConFechas(page: number, limit: number, sortField?: string, sortOrder: number = 1, filters: any = {}): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      return;
    }

    if (!this.currentUser || (this.currentUser.nivel !== 'admin' && this.currentUser.nivel !== 'super')) {
      this.showNotification('No tiene permisos para acceder a la vista global', 'error');
      return;
    }

    console.log('Cargando datos GLOBALES con rango de fechas:', {
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      idCliente: this.idCliente,
      page,
      limit,
      userRole: this.currentUser.nivel
    });

    this.historialVentas2Service.cargarHistorialVentasGlobal(
      this.idCliente,
      this.currentUser.nivel,
      this.fechaDesde,
      this.fechaHasta,
      page,
      limit,
      sortField,
      sortOrder,
      filters
    ).subscribe({
      next: (response) => {
        console.log('Datos GLOBALES cargados exitosamente con fechas');
      },
      error: (error) => {
        console.error('Error al cargar historial de ventas2 GLOBAL con fechas:', error);
        this.showNotification('Error al cargar el historial de ventas global', 'error');
      }
    });
  }

  // Cambiar a vista local
  cambiarVistaLocal(): void {
    if (this.vistaGlobal) {
      this.vistaGlobal = false;
      this.limpiarDatosYNotificar('LOCAL (sucursal actual)');
    }
  }

  // Cambiar a vista global
  cambiarVistaGlobal(): void {
    if (!this.currentUser || (this.currentUser.nivel !== 'admin' && this.currentUser.nivel !== 'super')) {
      this.showNotification('No tiene permisos para acceder a la vista global', 'error');
      return;
    }

    if (!this.vistaGlobal) {
      this.vistaGlobal = true;
      this.limpiarDatosYNotificar('GLOBAL (todas las sucursales)');
    }
  }

  // Método auxiliar para limpiar datos y notificar
  private limpiarDatosYNotificar(vista: string): void {
    // Limpiar datos actuales
    this.consultaRealizada = false;
    this.first = 0;
    this.historialVentas2 = [];
    this.totalRegistros = 0;
    
    // Limpiar filtros de la tabla
    if (this.dtable) {
      this.dtable.clear();
    }
    
    // Mostrar notificación del cambio
    this.showNotification(`Vista cambiada a: ${vista}`, 'info');
    
    console.log('Vista cambiada:', this.vistaGlobal ? 'GLOBAL' : 'LOCAL');
    this.cdr.detectChanges();
  }

  // Toggle entre vista local y global (método legacy mantenido por compatibilidad)
  toggleVistaGlobal(): void {
    if (!this.currentUser || (this.currentUser.nivel !== 'admin' && this.currentUser.nivel !== 'super')) {
      this.showNotification('No tiene permisos para acceder a la vista global', 'error');
      return;
    }

    this.vistaGlobal = !this.vistaGlobal;
    
    // Limpiar datos actuales
    this.consultaRealizada = false;
    this.first = 0;
    
    // Mostrar notificación del cambio
    const vista = this.vistaGlobal ? 'GLOBAL (todas las sucursales)' : 'LOCAL (sucursal actual)';
    this.showNotification(`Vista cambiada a: ${vista}`, 'info');
    
    console.log('Vista cambiada:', this.vistaGlobal ? 'GLOBAL' : 'LOCAL');
  }

  // Lazy loading de datos (solo si ya se realizó una consulta)
  loadDataLazy(event: LazyLoadEvent): void {
    console.log('Lazy load event completo:', event);
    console.log('Filtros del event:', event.filters);
    
    if (!this.consultaRealizada) {
      console.log('No se ha realizado consulta inicial - Los filtros estarán disponibles después de consultar');
      // No mostrar notificación para evitar spam, solo log
      return;
    }
    
    if (this.idCliente === 0) {
      console.log('ID Cliente no disponible aún');
      return;
    }

    const page = Math.floor((event.first || 0) / (event.rows || this.rows)) + 1;
    const limit = event.rows || this.rows;
    
    // Obtener campo de ordenamiento y dirección
    let sortField = '';
    let sortOrder = 1;
    
    if (event.sortField) {
      sortField = event.sortField;
      sortOrder = event.sortOrder || 1;
    }

    // Procesar filtros mejorado con más debugging
    const filters = event.filters || {};
    const processedFilters: any = {};
    
    console.log('Filtros originales:', filters);
    console.log('Claves de filtros:', Object.keys(filters));
    
    Object.keys(filters).forEach(key => {
      const filter = filters[key];
      console.log(`Filtro ${key}:`, filter);
      
      // PrimeNG envía filtros como arrays, tomar el primer elemento
      let filterValue = null;
      let matchMode = 'contains';
      
      if (Array.isArray(filter) && filter.length > 0) {
        const firstFilter = filter[0];
        filterValue = firstFilter.value;
        matchMode = firstFilter.matchMode || 'contains';
      } else if (filter && typeof filter === 'object') {
        // Formato directo (fallback)
        filterValue = filter.value;
        matchMode = filter.matchMode || 'contains';
      }
      
      console.log(`Filtro ${key} - Valor: ${filterValue}, MatchMode: ${matchMode}`);
      
      if (filterValue !== null && filterValue !== undefined && filterValue !== '') {
        processedFilters[key] = {
          value: filterValue,
          matchMode: matchMode
        };
        console.log(`Filtro ${key} procesado:`, processedFilters[key]);
      }
    });

    console.log('Filtros procesados finales:', processedFilters);
    console.log('Cantidad de filtros:', Object.keys(processedFilters).length);

    // Cargar datos con fechas si están disponibles
    if (this.vistaGlobal) {
      this.cargarDatosGlobalesConFechas(page, limit, sortField, sortOrder, processedFilters);
    } else {
      this.cargarDatosConFechas(page, limit, sortField, sortOrder, processedFilters);
    }
  }

  // Verificar si una columna está visible
  isColumnVisible(field: string): boolean {
    return this.selectedColumns.some(col => col.field === field);
  }

  // Manejar cambio de selección de columnas
  onColumnSelectionChange(): void {
    // Forzar detección de cambios cuando se modifican las columnas
    this.cdr.detectChanges();
  }

  // Calcular valor monetario de un porcentaje
  calcularValorPorcentaje(porcentaje: number | undefined, importe: number | undefined): number {
    if (!porcentaje || !importe || porcentaje === 0 || importe === 0) {
      return 0;
    }
    return (porcentaje * importe) / 100;
  }

  // Forzar actualización
  forceRefresh(): void {
    if (this.idCliente === 0) {
      this.showNotification('ID de cliente no disponible', 'error');
      return;
    }

    this.historialVentas2Service.cargarHistorialVentas2(this.idCliente, 1, this.rows).subscribe({
      next: () => {
        this.showNotification('Datos actualizados correctamente', 'success');
        this.first = 0; // Resetear a la primera página
      },
      error: (error) => {
        console.error('Error al actualizar datos:', error);
        this.showNotification('Error al actualizar los datos', 'error');
      }
    });
  }

  // Exportar a Excel
  exportExcel(): void {
    if (this.historialVentas2.length === 0) {
      this.showNotification('No hay datos para exportar', 'warning');
      return;
    }

    import('xlsx').then((xlsx) => {
      // Preparar datos para exportación (solo columnas visibles)
      const dataToExport = this.historialVentas2.map(venta => {
        const exportRow: any = {};
        
        this.selectedColumns.forEach(col => {
          let value = venta[col.field as keyof HistorialVenta2];
          
          // Formatear valores específicos
          if ((col.field === 'emitido' || col.field === 'vencimiento') && value) {
            exportRow[col.header] = new Date(value.toString()).toLocaleDateString('es-ES');
          } else if (col.field === 'importe' && value) {
            exportRow[col.header] = parseFloat(value.toString()).toFixed(2);
          } else if (col.field === 'saldo' && value) {
            exportRow[col.header] = parseFloat(value.toString()).toFixed(2);
          } else if (col.field === 'numero_int' && value) {
            exportRow[col.header] = parseInt(value.toString());
          } else {
            exportRow[col.header] = value || '';
          }
        });
        
        return exportRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(dataToExport);
      const workbook = { 
        Sheets: { 'Historial de Ventas2': worksheet }, 
        SheetNames: ['Historial de Ventas2'] 
      };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      this.saveAsExcelFile(excelBuffer, 'historial-ventas2');
      this.showNotification('Archivo Excel generado correctamente', 'success');
    }).catch((error) => {
      console.error('Error al generar Excel:', error);
      this.showNotification('Error al generar el archivo Excel', 'error');
    });
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    const clienteName = this.clienteInfo?.nombre || 'cliente';
    FileSaver.saveAs(data, `${fileName}_${clienteName}_${new Date().getTime()}${EXCEL_EXTENSION}`);
  }

  // Manejar selección de fila
  onRowSelect(event: any): void {
    console.log('Venta seleccionada:', event.data);
    this.ventaSeleccionada = event.data;
  }

  // Expandir/contraer fila
  toggleRowExpansion(venta: HistorialVenta2): void {
    const key = `${venta.id}`;
    
    if (this.expandedRows[key]) {
      // Si ya está expandida, contraer
      delete this.expandedRows[key];
    } else {
      // Si no está expandida, expandir y cargar datos
      this.loadExpandedData(venta);
    }
  }

  // Cargar datos expandidos para una venta
  private loadExpandedData(venta: HistorialVenta2): void {
    const key = `${venta.id}`;
    
    if (!venta.id) {
      this.showNotification('ID de factura no válido', 'error');
      return;
    }
    
    this.loadingExpanded[key] = true;
    
    // UNA SOLA LLAMADA AL SERVICIO
    this.historialVentas2Service.obtenerDatosExpandidos(venta.id, venta.sucursal).subscribe({
      next: (response: any) => {
        console.log('Datos expandidos recibidos:', response);
        
        if (response && !response.error && response.data) {
          this.expandedRows[key] = {
            recibos: response.data.recibos || [],
            historialPagos: response.data.historialPagos || [],
            totalPagado: response.data.totalPagado || 0
          };
        } else {
          this.expandedRows[key] = {
            recibos: [],
            historialPagos: [],
            totalPagado: 0
          };
        }
        
        this.loadingExpanded[key] = false;
      },
      error: (error) => {
        console.error('Error al cargar datos expandidos:', error);
        this.showNotification('Error al cargar datos detallados', 'error');
        this.expandedRows[key] = {
          recibos: [],
          historialPagos: [],
          totalPagado: 0
        };
        this.loadingExpanded[key] = false;
      }
    });
  }

  // Verificar si una fila está expandida
  isRowExpanded(venta: HistorialVenta2): boolean {
    const key = `${venta.id}`;
    return !!this.expandedRows[key];
  }

  // Verificar si una fila está cargando
  isRowLoading(venta: HistorialVenta2): boolean {
    const key = `${venta.id}`;
    return !!this.loadingExpanded[key];
  }

  // Obtener datos expandidos de una venta
  getExpandedData(venta: HistorialVenta2): VentaExpandida | null {
    const key = `${venta.id}`;
    return this.expandedRows[key] || null;
  }

  // Obtener la factura original (el primer recibo de tipo FC)
  getFacturaOriginal(expandedData: VentaExpandida): any | null {
    if (!expandedData || !expandedData.recibos || expandedData.recibos.length === 0) {
      return null;
    }
    
    // Buscar el recibo original (tipo FC o el de mayor importe)
    const facturaOriginal = expandedData.recibos.find(recibo => 
      recibo.c_tipo === 'FC' || recibo.importe === Math.max(...expandedData.recibos.map(r => r.importe))
    );
    
    return facturaOriginal || expandedData.recibos[0];
  }

  // Obtener solo los pagos realizados (excluyendo la factura original)
  getPagosRealizados(expandedData: VentaExpandida): any[] | null {
    if (!expandedData || !expandedData.recibos || expandedData.recibos.length === 0) {
      return null;
    }
    
    // Filtrar solo los recibos de tipo RC (pagos) y excluir la factura original
    // La factura original se identifica porque importe === recibo_saldo (es la creación de la deuda)
    const recibos = expandedData.recibos.filter(recibo => 
      recibo.c_tipo === 'RC' && 
      recibo.importe !== recibo.recibo_saldo
    );
    
    if (recibos.length === 0) {
      return null;
    }
    
    // Ordenar todos los recibos cronológicamente (solo pagos reales)
    return recibos.sort((a, b) => {
      // 1° Ordenar por fecha
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      
      if (fechaA !== fechaB) {
        return fechaA - fechaB; // Cronológico ascendente
      }
      
      // 2° Si misma fecha, ordenar por número de recibo
      return a.recibo - b.recibo;
    });
  }

  // Calcular total de bonificaciones de pagos reales
  calcularTotalBonificacion(expandedData: VentaExpandida): number {
    const pagosReales = this.getPagosRealizados(expandedData);
    if (!pagosReales || pagosReales.length === 0) {
      return 0;
    }

    return pagosReales.reduce((total, pago) => {
      if (!pago.bonifica || pago.bonifica <= 0) {
        return total;
      }
      
      // Si es porcentaje, calcular el valor monetario
      if (pago.bonifica_tipo === 'P') {
        return total + this.calcularValorPorcentaje(pago.bonifica, pago.importe);
      } else {
        // Si es importe directo
        return total + parseFloat(pago.bonifica);
      }
    }, 0);
  }

  // Calcular total de intereses de pagos reales
  calcularTotalInteres(expandedData: VentaExpandida): number {
    const pagosReales = this.getPagosRealizados(expandedData);
    if (!pagosReales || pagosReales.length === 0) {
      return 0;
    }

    return pagosReales.reduce((total, pago) => {
      if (!pago.interes || pago.interes <= 0) {
        return total;
      }
      
      // Si es porcentaje, calcular el valor monetario
      if (pago.interes_tipo === 'P') {
        return total + this.calcularValorPorcentaje(pago.interes, pago.importe);
      } else {
        // Si es importe directo
        return total + parseFloat(pago.interes);
      }
    }, 0);
  }

  // Generar PDF específico de la factura original
  async generarPDFFactura(venta: HistorialVenta2): Promise<void> {
    try {
      Swal.fire({
        title: 'Generando PDF de Factura...',
        text: 'Generando documento de la factura original',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const expandedData = this.getExpandedData(venta);
      const facturaOriginal = this.getFacturaOriginal(expandedData!);
      
      if (!facturaOriginal || !facturaOriginal.productos) {
        throw new Error('No se encontraron datos de la factura original');
      }

      // Usar el servicio de PDF existente para generar la factura
      await this.historialPdfService.generarPDFHistorialCompleto(venta);

      Swal.close();
      this.showNotification('PDF de factura generado exitosamente', 'success');

    } catch (error) {
      console.error('Error al generar PDF de factura:', error);
      Swal.close();
      this.showNotification('Error al generar el PDF de factura: ' + error.message, 'error');
    }
  }


  // Generar PDF del recibo seleccionado
  async generarPDF(venta: HistorialVenta2): Promise<void> {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Por favor espere mientras se prepara el documento',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Usar el nuevo servicio para generar PDF con datos completos
      await this.historialPdfService.generarPDFHistorialCompleto(venta);

      Swal.close();
      this.showNotification('PDF generado exitosamente', 'success');

    } catch (error) {
      console.error('Error al generar PDF:', error);
      Swal.close();
      this.showNotification('Error al generar el PDF: ' + error.message, 'error');
    }
  }

  // Método legacy mantenido para compatibilidad
  async generarPDFLegacy(venta: HistorialVenta2): Promise<void> {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Por favor espere mientras se prepara el documento',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Obtener datos expandidos de la venta
      const ventaExpandida = this.expandedRows[venta.id!];
      if (!ventaExpandida || !ventaExpandida.recibos || ventaExpandida.recibos.length === 0) {
        throw new Error('No hay datos expandidos para generar el PDF');
      }

      // Obtener información del cliente
      const cliente = await this.obtenerDatosCliente(venta.cliente!);
      
      // Obtener nombre de sucursal
      const sucursalNombre = await this.obtenerNombreSucursal(venta.sucursal);

      // Preparar datos para cada recibo
      for (const recibo of ventaExpandida.recibos) {
        if (!recibo.productos || recibo.productos.length === 0) {
          continue;
        }

        // Preparar items del PDF
        const items = recibo.productos.map(producto => ({
          cantidad: producto.cantidad,
          nomart: producto.nomart,
          precio: producto.precio
        }));

        // Calcular total del recibo
        const totalRecibo = recibo.productos.reduce((sum, prod) => 
          sum + (prod.cantidad * prod.precio), 0);

        // Preparar datos del PDF
        const datosPDF = {
          items: items,
          numerocomprobante: venta.numero_fac.toString(),
          fecha: venta.emitido,
          total: totalRecibo,
          cliente: cliente,
          tipoDoc: venta.tipo,
          puntoventa: venta.puntoventa,
          letraValue: venta.letra,
          sucursalNombre: sucursalNombre
        };

        // Generar PDF
        await this.pdfGeneratorService.generarPDFRecibo(datosPDF);
      }

      Swal.close();
      this.showNotification('PDF generado exitosamente', 'success');

    } catch (error) {
      console.error('Error al generar PDF:', error);
      Swal.close();
      this.showNotification('Error al generar el PDF: ' + error.message, 'error');
    }
  }

  // Obtener datos del cliente
  private async obtenerDatosCliente(idCliente: number): Promise<any> {
    return new Promise((resolve, reject) => {
      // Usar el método existente clisucx para obtener datos del cliente
      // Necesitamos la sucursal para este método
      const sucursal = sessionStorage.getItem('sucursal') || '1';
      
      this.cargardataService.clisucx(sucursal).pipe(take(1)).subscribe({
        next: (response: any) => {
          if (response && response.mensaje && response.mensaje.length > 0) {
            // Buscar el cliente específico por ID
            const clienteData = response.mensaje.find((cliente: any) => cliente.idcli === idCliente);
            
            if (clienteData) {
              resolve({
                nombre: clienteData.nombre || 'Cliente',
                direccion: clienteData.direccion || 'Sin dirección',
                dni: clienteData.dni || 'Sin DNI',
                cuit: clienteData.cuit || 'Sin CUIT',
                tipoiva: clienteData.tipoiva || 'Consumidor Final'
              });
            } else {
              resolve({
                nombre: 'Cliente',
                direccion: 'Sin dirección',
                dni: 'Sin DNI',
                cuit: 'Sin CUIT',
                tipoiva: 'Consumidor Final'
              });
            }
          } else {
            resolve({
              nombre: 'Cliente',
              direccion: 'Sin dirección',
              dni: 'Sin DNI',
              cuit: 'Sin CUIT',
              tipoiva: 'Consumidor Final'
            });
          }
        },
        error: (error) => {
          console.error('Error al obtener cliente:', error);
          resolve({
            nombre: 'Cliente',
            direccion: 'Sin dirección',
            dni: 'Sin DNI',
            cuit: 'Sin CUIT',
            tipoiva: 'Consumidor Final'
          });
        }
      });
    });
  }

  // Obtener nombre de sucursal
  private async obtenerNombreSucursal(codigoSucursal: string): Promise<string> {
    return new Promise((resolve) => {
      this.crudService.getListSnap('sucursales').pipe(take(1)).subscribe({
        next: (data) => {
          const sucursales = data.map(item => {
            const payload = item.payload.val() as any;
            return {
              nombre: payload.nombre,
              value: payload.value
            };
          });
          
          const sucursalEncontrada = sucursales.find(suc => suc.value.toString() === codigoSucursal);
          resolve(sucursalEncontrada ? sucursalEncontrada.nombre : `Sucursal ${codigoSucursal}`);
        },
        error: (error) => {
          console.error('Error al obtener sucursales:', error);
          resolve(`Sucursal ${codigoSucursal}`);
        }
      });
    });
  }

  // Cargar tarjetas para el totalizador
  private cargarTarjetas(): void {
    this.subscriptions.push(
      this.cargardataService.tarjcredito().subscribe({
        next: (response: any) => {
          if (response && response.mensaje) {
            this.tarjetasMap.clear();
            response.mensaje.forEach((tarjeta: any) => {
              this.tarjetasMap.set(tarjeta.cod_tarj, tarjeta.tarjeta);
            });
            console.log('Tarjetas cargadas para totalizador:', this.tarjetasMap);
          }
        },
        error: (error) => {
          console.error('Error al cargar tarjetas:', error);
        }
      })
    );
  }

  // Cargar usuarios para el mapeo ID -> nombre
  private cargarUsuarios(): void {
    this.subscriptions.push(
      this.crudService.getListSnap('usuarios/cliente').subscribe({
        next: (data) => {
          this.usuariosMap.clear();
          data.forEach(item => {
            const usuario = item.payload.val() as any;
            const uid = item.key;
            if (uid && usuario) {
              // Mapear tanto por UID como por username si existe
              const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
              this.usuariosMap.set(uid, nombreCompleto);
              
              // También mapear por username si existe
              if (usuario.username) {
                this.usuariosMap.set(usuario.username, nombreCompleto);
              }
            }
          });
          console.log('Usuarios cargados para mapeo:', this.usuariosMap);
        },
        error: (error) => {
          console.error('Error al cargar usuarios:', error);
        }
      })
    );
  }

  // Obtener nombre del usuario por ID
  public obtenerNombreUsuario(usuarioId: string): string {
    if (!usuarioId) {
      return 'Usuario desconocido';
    }
    
    // Limpiar espacios en blanco del campo usuario
    const usuarioLimpio = usuarioId.trim();
    
    if (!usuarioLimpio) {
      return 'Usuario desconocido';
    }
    
    // Si parece ser un nombre (no solo números), devolverlo directamente
    if (!/^\d+$/.test(usuarioLimpio)) {
      return usuarioLimpio;
    }
    
    // Si es un ID numérico, intentar mapeo
    return this.usuariosMap.get(usuarioLimpio) || `Usuario ${usuarioLimpio}`;
  }

  // Calcular saldo pendiente después de un pago específico
  public calcularSaldoDespuesPago(pago: any, venta: HistorialVenta2, expandedData: any): number {
    if (!expandedData.historialPagos || !pago) {
      return venta.importe;
    }
    
    // Ordenar pagos por fecha ascendente para procesarlos en orden cronológico
    const pagosOrdenados = [...expandedData.historialPagos].sort((a, b) => {
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });
    
    // Encontrar el índice del pago actual
    const indicePagoActual = pagosOrdenados.findIndex(p => 
      p.recibo === pago.recibo && 
      p.fecha === pago.fecha && 
      p.importe === pago.importe
    );
    
    if (indicePagoActual === -1) {
      return venta.importe;
    }
    
    // Calcular total pagado hasta este pago (inclusive)
    let totalPagadoHastaPago = 0;
    for (let i = 0; i <= indicePagoActual; i++) {
      totalPagadoHastaPago += parseFloat(pagosOrdenados[i].importe) || 0;
    }
    
    // Retornar saldo pendiente después de este pago
    return venta.importe - totalPagadoHastaPago;
  }

  // Calcular totalizador
  public calcularTotalizador(): void {
    if (!this.historialVentas2 || this.historialVentas2.length === 0) {
      this.totalizador = null;
      return;
    }

    this.calculandoTotalizador = true;
    // Necesitamos obtener todos los datos expandidos de todas las ventas para calcular tipos de pago
    this.calcularTotalizadorConDatosCompletos();
  }

  // Calcular totalizador con datos completos
  private calcularTotalizadorConDatosCompletos(): void {
    const tiposDocumentoMap = new Map<string, TotalizadorPorTipo>();
    const sucursalesMap = new Map<string, TotalizadorPorSucursal>();

    let totalImporte = 0;
    let totalSaldo = 0;
    let ventaMasAlta = 0;
    let ventaMasBaja = Number.MAX_VALUE;
    let fechaUltima = '';
    let fechaPrimera = '';

    // Procesamos cada venta para datos básicos
    this.historialVentas2.forEach(venta => {
      const importe = venta.importe || 0;
      const saldo = venta.saldo || 0;
      
      totalImporte += importe;
      totalSaldo += saldo;
      
      // Estadísticas
      if (importe > ventaMasAlta) ventaMasAlta = importe;
      if (importe < ventaMasBaja) ventaMasBaja = importe;
      
      // Fechas
      if (!fechaPrimera || venta.emitido < fechaPrimera) fechaPrimera = venta.emitido;
      if (!fechaUltima || venta.emitido > fechaUltima) fechaUltima = venta.emitido;

      // Agrupación por tipo de documento
      if (!tiposDocumentoMap.has(venta.tipo)) {
        tiposDocumentoMap.set(venta.tipo, {
          tipo: venta.tipo,
          cantidad: 0,
          totalImporte: 0,
          totalSaldo: 0,
          porcentaje: 0
        });
      }
      const tipoDoc = tiposDocumentoMap.get(venta.tipo)!;
      tipoDoc.cantidad++;
      tipoDoc.totalImporte += importe;
      tipoDoc.totalSaldo += saldo;

      // Agrupación por sucursal
      if (!sucursalesMap.has(venta.sucursal)) {
        sucursalesMap.set(venta.sucursal, {
          sucursal: venta.sucursal,
          cantidad: 0,
          totalImporte: 0,
          totalSaldo: 0,
          porcentaje: 0
        });
      }
      const sucursal = sucursalesMap.get(venta.sucursal)!;
      sucursal.cantidad++;
      sucursal.totalImporte += importe;
      sucursal.totalSaldo += saldo;
    });

    // Calcular porcentajes
    tiposDocumentoMap.forEach(tipo => {
      tipo.porcentaje = totalImporte > 0 ? (tipo.totalImporte / totalImporte) * 100 : 0;
    });

    sucursalesMap.forEach(sucursal => {
      sucursal.porcentaje = totalImporte > 0 ? (sucursal.totalImporte / totalImporte) * 100 : 0;
    });

    // Para tipos de pago, necesitamos cargar todos los datos expandidos
    this.obtenerTiposPagoTotales().then(tiposPago => {
      // Crear el objeto totalizador
      this.totalizador = {
        totalRegistros: this.historialVentas2.length,
        totalImporte,
        totalSaldo,
        rangoFechas: this.obtenerRangoFechas(),
        tiposPago: tiposPago,
        tiposDocumento: Array.from(tiposDocumentoMap.values()).sort((a, b) => b.totalImporte - a.totalImporte),
        sucursales: Array.from(sucursalesMap.values()).sort((a, b) => b.totalImporte - a.totalImporte),
        estadisticas: {
          promedioImporte: this.historialVentas2.length > 0 ? totalImporte / this.historialVentas2.length : 0,
          promedioSaldo: this.historialVentas2.length > 0 ? totalSaldo / this.historialVentas2.length : 0,
          ventaMasAlta,
          ventaMasBaja: ventaMasBaja === Number.MAX_VALUE ? 0 : ventaMasBaja,
          fechaUltimaVenta: fechaUltima,
          fechaPrimeraVenta: fechaPrimera
        }
      };

      this.calculandoTotalizador = false;
      console.log('Totalizador calculado:', this.totalizador);
      // Mostrar modal una vez calculado
      this.mostrarModalTotalizador();
    }).catch(error => {
      console.error('Error al calcular totalizador:', error);
      this.calculandoTotalizador = false;
      this.showNotification('Error al calcular totalizador', 'error');
    });
  }

  // Obtener tipos de pago totales de todos los registros
  private async obtenerTiposPagoTotales(): Promise<TotalizadorTipoPago[]> {
    const tiposPagoMap = new Map<number, TotalizadorTipoPago>();
    const promesas: Promise<any>[] = [];

    // Cargar datos expandidos para todas las ventas
    this.historialVentas2.forEach(venta => {
      if (venta.id) {
        const promesa = this.historialVentas2Service.obtenerDatosExpandidos(venta.id, venta.sucursal).toPromise()
          .then((response: any) => {
            if (response && !response.error && response.data && response.data.recibos) {
              response.data.recibos.forEach((recibo: any) => {
                if (recibo.productos) {
                  recibo.productos.forEach((producto: any) => {
                    const codTar = producto.cod_tar || 0;
                    const nombreTarjeta = this.tarjetasMap.get(codTar) || `Tipo ${codTar}`;
                    
                    if (!tiposPagoMap.has(codTar)) {
                      tiposPagoMap.set(codTar, {
                        cod_tar: codTar,
                        tipoPago: nombreTarjeta,
                        cantidad: 0,
                        totalImporte: 0,
                        totalSaldo: 0,
                        porcentaje: 0
                      });
                    }
                    const tipoPago = tiposPagoMap.get(codTar)!;
                    tipoPago.cantidad++;
                    tipoPago.totalImporte += producto.cantidad * producto.precio;
                  });
                }
              });
            }
          })
          .catch(error => {
            console.error('Error al obtener datos expandidos para venta:', venta.id, error);
          });
        promesas.push(promesa);
      }
    });

    try {
      // Esperar a que todas las promesas se resuelvan
      await Promise.all(promesas);

      // Calcular porcentajes
      const totalTiposPago = Array.from(tiposPagoMap.values()).reduce((sum, tipo) => sum + tipo.totalImporte, 0);
      tiposPagoMap.forEach(tipo => {
        tipo.porcentaje = totalTiposPago > 0 ? (tipo.totalImporte / totalTiposPago) * 100 : 0;
      });

      return Array.from(tiposPagoMap.values()).sort((a, b) => b.totalImporte - a.totalImporte);
    } catch (error) {
      console.error('Error al obtener tipos de pago totales:', error);
      return [];
    }
  }

  // Obtener rango de fechas
  private obtenerRangoFechas(): string {
    if (!this.fechaDesde || !this.fechaHasta) return '';
    
    const desde = this.fechaDesde.toLocaleDateString('es-ES');
    const hasta = this.fechaHasta.toLocaleDateString('es-ES');
    return `${desde} - ${hasta}`;
  }

  // Abrir modal del totalizador
  public abrirTotalizador(): void {
    this.calcularTotalizador();
  }

  // Mostrar modal del totalizador
  private mostrarModalTotalizador(): void {
    this.totalizadorDialogRef = this.dialogService.open(TotalizadorModalComponent, {
      header: 'Totalizador de Ventas',
      width: '90%',
      height: '80%',
      maximizable: true,
      data: {
        totalizador: this.totalizador,
        rangoFechas: this.obtenerRangoFechas(),
        clienteInfo: this.clienteInfo,
        exportarTotalizador: () => this.exportarTotalizadorExcel()
      }
    });
  }

  // Formatear moneda
  public formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(valor);
  }

  // Formatear porcentaje
  public formatearPorcentaje(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }

  // Exportar totalizador a Excel
  public exportarTotalizadorExcel(): void {
    if (!this.totalizador) {
      this.showNotification('No hay datos del totalizador para exportar', 'warning');
      return;
    }

    import('xlsx').then((xlsx) => {
      const workbook = xlsx.utils.book_new();

      // Hoja 1: Resumen General
      const resumenData = [
        ['Resumen General del Totalizador'],
        [''],
        ['Total Registros', this.totalizador.totalRegistros],
        ['Total Importe', this.totalizador.totalImporte],
        ['Total Saldo', this.totalizador.totalSaldo],
        ['Rango de Fechas', this.totalizador.rangoFechas],
        [''],
        ['Estadísticas'],
        ['Promedio Importe', this.totalizador.estadisticas.promedioImporte],
        ['Promedio Saldo', this.totalizador.estadisticas.promedioSaldo],
        ['Venta Más Alta', this.totalizador.estadisticas.ventaMasAlta],
        ['Venta Más Baja', this.totalizador.estadisticas.ventaMasBaja],
        ['Primera Venta', this.totalizador.estadisticas.fechaPrimeraVenta],
        ['Última Venta', this.totalizador.estadisticas.fechaUltimaVenta]
      ];
      const resumenSheet = xlsx.utils.aoa_to_sheet(resumenData);
      xlsx.utils.book_append_sheet(workbook, resumenSheet, 'Resumen General');

      // Hoja 2: Tipos de Pago
      const tiposPagoData = [
        ['Tipo de Pago', 'Código', 'Cantidad', 'Total Importe', 'Total Saldo', 'Porcentaje'],
        ...this.totalizador.tiposPago.map(tp => [
          tp.tipoPago,
          tp.cod_tar,
          tp.cantidad,
          tp.totalImporte,
          tp.totalSaldo,
          tp.porcentaje
        ])
      ];
      const tiposPagoSheet = xlsx.utils.aoa_to_sheet(tiposPagoData);
      xlsx.utils.book_append_sheet(workbook, tiposPagoSheet, 'Tipos de Pago');

      // Hoja 3: Tipos de Documento
      const tiposDocData = [
        ['Tipo Documento', 'Cantidad', 'Total Importe', 'Total Saldo', 'Porcentaje'],
        ...this.totalizador.tiposDocumento.map(td => [
          td.tipo,
          td.cantidad,
          td.totalImporte,
          td.totalSaldo,
          td.porcentaje
        ])
      ];
      const tiposDocSheet = xlsx.utils.aoa_to_sheet(tiposDocData);
      xlsx.utils.book_append_sheet(workbook, tiposDocSheet, 'Tipos de Documento');

      // Hoja 4: Sucursales
      const sucursalesData = [
        ['Sucursal', 'Cantidad', 'Total Importe', 'Total Saldo', 'Porcentaje'],
        ...this.totalizador.sucursales.map(s => [
          s.sucursal,
          s.cantidad,
          s.totalImporte,
          s.totalSaldo,
          s.porcentaje
        ])
      ];
      const sucursalesSheet = xlsx.utils.aoa_to_sheet(sucursalesData);
      xlsx.utils.book_append_sheet(workbook, sucursalesSheet, 'Sucursales');

      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'totalizador-historial-ventas');
      this.showNotification('Totalizador exportado exitosamente', 'success');
    }).catch((error) => {
      console.error('Error al generar Excel del totalizador:', error);
      this.showNotification('Error al generar el archivo Excel del totalizador', 'error');
    });
  }

  // Generar recibo PDF para un pago parcial
  async generarReciboPago(pago: any, venta: HistorialVenta2): Promise<void> {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Generando recibo...',
        text: 'Por favor espere mientras se prepara el documento',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Obtener datos adicionales necesarios
      const cliente = await this.obtenerDatosClienteCorregido(venta.cliente!);
      const sucursalNombre = await this.obtenerNombreSucursal(venta.sucursal);
      
      // Obtener datos expandidos para calcular saldo
      const ventaExpandida = this.getExpandedData(venta);
      const saldoPendiente = ventaExpandida ? this.calcularSaldoDespuesPago(pago, venta, ventaExpandida) : venta.importe;

      // Identificar si es deuda original
      // La deuda original tiene importe = saldo (no reduce la deuda)
      const esDeudaOriginal = pago.importe === pago.recibo_saldo;
      
      // Debug para verificar la lógica
      console.log('Debug recibo:', {
        recibo: pago.recibo,
        importe: pago.importe,
        recibo_saldo: pago.recibo_saldo,
        esDeudaOriginal: esDeudaOriginal
      });

      // Preparar datos para el recibo
      const datosRecibo = {
        numeroRecibo: pago.recibo,
        fecha: pago.fecha,
        importe: esDeudaOriginal ? 0 : pago.importe, // Si es deuda original, importe pagado = 0
        cliente: cliente,
        sucursalNombre: sucursalNombre,
        usuario: pago.usuario,
        puntoVenta: pago.c_puntoventa,
        tipoDocumento: pago.c_tipo,
        numeroFactura: pago.c_numero,
        saldoPendiente: saldoPendiente,
        importeOriginal: venta.importe,
        // Agregar bonificaciones e intereses del pago
        bonifica: pago.bonifica || 0,
        bonifica_tipo: pago.bonifica_tipo || 'P',
        interes: pago.interes || 0,
        interes_tipo: pago.interes_tipo || 'P'
      };

      // Generar PDF
      await this.generarPDFReciboPago(datosRecibo);

      Swal.close();
      this.showNotification('Recibo generado exitosamente', 'success');

    } catch (error) {
      console.error('Error al generar recibo:', error);
      Swal.close();
      this.showNotification('Error al generar el recibo: ' + error.message, 'error');
    }
  }

  // Calcular total efectivo para recibo (importe + intereses + bonificaciones)
  private calcularTotalEfectivoRecibo(datos: any): number {
    let totalEfectivo = parseFloat(datos.importe) || 0;
    
    // Sumar bonificaciones (descuentos a favor del cliente)
    if (datos.bonifica && datos.bonifica > 0) {
      if (datos.bonifica_tipo === 'P') {
        // Si es porcentaje, calcular el valor monetario
        totalEfectivo += this.calcularValorPorcentaje(datos.bonifica, datos.importe);
      } else {
        // Si es importe directo
        totalEfectivo += parseFloat(datos.bonifica);
      }
    }
    
    // Sumar intereses (cargos adicionales)
    if (datos.interes && datos.interes > 0) {
      if (datos.interes_tipo === 'P') {
        // Si es porcentaje, calcular el valor monetario
        totalEfectivo += this.calcularValorPorcentaje(datos.interes, datos.importe);
      } else {
        // Si es importe directo
        totalEfectivo += parseFloat(datos.interes);
      }
    }
    
    return totalEfectivo;
  }

  // Generar PDF del recibo usando pdfMake con la misma estética del carrito
  private async generarPDFReciboPago(datos: any): Promise<void> {
    // Usar imports estáticos ya configurados al inicio del archivo

    // Calcular total efectivo (importe + intereses - bonificaciones)
    const totalEfectivo = this.calcularTotalEfectivoRecibo(datos);
    
    // Convertir número a palabras (función simplificada)
    const numeroEnPalabras = this.convertirNumeroAPalabras(datos.importe);

    // Obtener configuración de empresa según sucursal
    const empresaConfig = getEmpresaConfig();

    // Definir estructura del documento con la misma estética del carrito
    const documentDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      background: {
        canvas: [
          {
            type: 'rect',
            x: 10,
            y: 10,
            w: 580,
            h: 750,
            r: 3,
            lineWidth: 1,
            lineColor: '#000000',
            fillColor: 'transparent',
          },
        ],
      },
      content: [
        // Logo o texto según configuración
        ...(empresaConfig.logo ? [
          {
            image: empresaConfig.logo,
            width: 100,
            margin: [0, 0, 80, 0],
          }
        ] : [
          {
            text: empresaConfig.texto,
            fontSize: 24,
            bold: true,
            margin: [0, 20, 80, 20],
            style: 'mayorista'
          }
        ]),
        {
          columns: [
            {
              text: [
                { text: empresaConfig.direccion + '\n' },
                { text: empresaConfig.ciudad + '\n' },
                { text: datos.sucursalNombre + '\n' },
                { text: empresaConfig.telefono + '\n' },
                { text: empresaConfig.email },
              ],
              fontSize: 10,
              margin: [10, 0, 0, 0],
            },
            {
              text: [
                { canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 100, r: 3, lineWidth: 2, lineColor: '#000000' }], text: 'R\n', style: { fontSize: 40 }, margin: [10, 5, 0, 0] },
                { text: 'RECIBO\n' },
                { text: 'DOCUMENTO\n' },
                { text: 'INTERNO' }
              ],
              alignment: 'center',
              fontSize: 12,
            },
            {
              text: [
                { text: 'RECIBO DE PAGO\n' },
                { text: 'N° 0000 -' + datos.numeroRecibo + '\n', alignment: 'right' },
                { text: 'Punto de venta: ' + datos.puntoVenta + '\n' },
              ],
              alignment: 'right',
              fontSize: 10,
            },
          ],
        },
        {
          text: 'Fecha: ' + new Date(datos.fecha).toLocaleDateString('es-ES'),
          alignment: 'right',
          margin: [25, 0, 5, 30],
          fontSize: 10,
        },
        
        // Separador
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc'
            }
          ],
          margin: [0, 0, 30, 0]
        },
        
        // Información del cliente
        {
          columns: [
            {
              text: [
                { text: 'Sres: ' + datos.cliente.nombre + '\n' },
                { text: 'Direccion: ' + datos.cliente.direccion + '\n' },
                { text: 'DNI: ' + datos.cliente.dni + '\n' },
                { text: 'CUIT: ' + datos.cliente.cuit + '\n' },
                { text: 'Condicion de Venta: ' + datos.cliente.tipoiva + '\n' },
              ],
              fontSize: 10,
              margin: [0, 10, 0, 10],
            },
          ],
        },
        
        // Separador
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc'
            }
          ],
          margin: [0, 0, 30, 20]
        },
        
        // Detalle del pago
        {
          style: 'tableExample',
          table: {
            widths: ['25%', '75%'],
            body: [
              ['Concepto', 'Detalle'],
              ['Pago parcial', `Factura Nº ${datos.numeroFactura}`],
              ['Importe Original', `$ ${parseFloat(datos.importeOriginal).toFixed(2)}`],
              ['Importe Pagado', `$ ${parseFloat(datos.importe).toFixed(2)}`],
              ['Saldo Pendiente', `$ ${parseFloat(datos.saldoPendiente).toFixed(2)}`],
              ['En letras', numeroEnPalabras],
              ['Usuario', this.obtenerNombreUsuario(datos.usuario)],
              ['Punto de Venta', datos.puntoVenta.toString()]
            ],
            bold: true,
          },
        },
        
        // Información Financiera Adicional - BONIFICACIONES E INTERESES
        ...(datos.bonifica && datos.bonifica > 0 ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['BONIFICACIÓN (' + (datos.bonifica_tipo === 'P' ? 'Porcentaje' : 'Importe') + '):', 
                datos.bonifica_tipo === 'P' 
                  ? datos.bonifica + '% ($' + this.calcularValorPorcentaje(datos.bonifica, datos.importe).toFixed(2) + ')'
                  : '$' + parseFloat(datos.bonifica).toFixed(2)],
            ],
            bold: false,
            fontSize: 10,
          },
          margin: [0, 5, 0, 0]
        }] : []),
        ...(datos.interes && datos.interes > 0 ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['INTERÉS (' + (datos.interes_tipo === 'P' ? 'Porcentaje' : 'Importe') + '):', 
                datos.interes_tipo === 'P' 
                  ? datos.interes + '% ($' + this.calcularValorPorcentaje(datos.interes, datos.importe).toFixed(2) + ')'
                  : '$' + parseFloat(datos.interes).toFixed(2)],
            ],
            bold: false,
            fontSize: 10,
          },
          margin: [0, 5, 0, 0]
        }] : []),
        
        // Total
        {
          style: 'tableExample',
          table: {
            widths: ['*'],
            body: [
              ['TOTAL $' + totalEfectivo.toFixed(2)],
            ],
            bold: true,
            fontSize: 16,
          },
        },
        
        // Firma
        {
          columns: [
            {
              width: '50%',
              text: [
                { text: '\n\n\n' },
                { text: '________________________', alignment: 'center' },
                { text: '\nFirma del Cliente', alignment: 'center', fontSize: 10 }
              ]
            },
            {
              width: '50%',
              text: [
                { text: '\n\n\n' },
                { text: '________________________', alignment: 'center' },
                { text: '\nFirma Autorizada', alignment: 'center', fontSize: 10 }
              ]
            }
          ],
          margin: [0, 30, 0, 0]
        }
      ],
      styles: {
        header: {
          fontSize: 10,
          bold: true,
          margin: [2, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 5],
          fontSize: 8,
        },
        total: {
          bold: true,
          fontSize: 8,
          margin: [0, 10, 0, 0],
        },
        mayorista: {
          bold: true,
          fontSize: 24,
          alignment: 'left',
          color: '#000000',
        },
      },
      defaultStyle: {
      },
    };

    // Generar y descargar PDF
    const fechaFormateada = new Date(datos.fecha).toLocaleDateString('es-ES').replace(/\//g, '-');
    const fileName = `${datos.sucursalNombre}_RECIBO_${datos.numeroRecibo}_${fechaFormateada}.pdf`;
    pdfMake.createPdf(documentDefinition).download(fileName);
  }

  // Convertir número a palabras usando el servicio compartido
  private convertirNumeroAPalabras(numero: any): string {
    const num = parseFloat(numero);
    return this.numeroPalabrasService.numeroAPalabrasSimple(num);
  }

  // Función corregida para obtener datos del cliente usando ClienteCompletoPDF
  private async obtenerDatosClienteCorregido(idCliente: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const sucursal = sessionStorage.getItem('sucursal') || '1';
      
      console.log('🔍 Obteniendo cliente con ClienteCompletoPDF:', { idCliente, sucursal });
      
      this.historialPdfService.getClienteCompletoPDF(sucursal, idCliente).pipe(take(1)).subscribe({
        next: (response: any) => {
          console.log('📋 Respuesta ClienteCompletePDF:', response);
          
          if (response && !response.error && response.data) {
            const clienteData = response.data;
            const datosProcessados = {
              nombre: (clienteData.nombre && clienteData.nombre.trim()) || 'Cliente',
              direccion: (clienteData.direccion && clienteData.direccion.trim()) || 'Sin dirección',  
              dni: (clienteData.dni && clienteData.dni !== '0' && clienteData.dni.trim()) || 'Sin DNI',
              cuit: (clienteData.cuit && clienteData.cuit !== '0' && clienteData.cuit.trim()) || 'Sin CUIT',
              tipoiva: (clienteData.tipoiva && clienteData.tipoiva.trim()) || 'Consumidor Final'
            };
            
            console.log('✅ Datos cliente procesados:', datosProcessados);
            resolve(datosProcessados);
          } else {
            console.warn('❌ Error o datos vacíos en ClienteCompletePDF:', response);
            // Fallback al método anterior
            this.obtenerDatosClienteFallback(idCliente, sucursal, resolve);
          }
        },
        error: (error) => {
          console.error('💥 Error ClienteCompletePDF, usando fallback:', error);
          // Fallback al método anterior
          this.obtenerDatosClienteFallback(idCliente, sucursal, resolve);
        }
      });
    });
  }

  // Método fallback usando clisucx (método anterior)
  private obtenerDatosClienteFallback(idCliente: number, sucursal: string, resolve: Function): void {
    console.log('🔄 Usando método fallback clisucx');
    
    this.cargardataService.clisucx(sucursal).pipe(take(1)).subscribe({
      next: (response: any) => {
        console.log('📋 Respuesta clisucx:', response?.mensaje?.length || 0, 'clientes');
        
        if (response && response.mensaje && response.mensaje.length > 0) {
          // Búsqueda flexible por tipo de datos
          const clienteData = response.mensaje.find((cliente: any) => {
            return cliente.idcli == idCliente || 
                   cliente.idcli === idCliente.toString() || 
                   parseInt(cliente.idcli) === parseInt(idCliente.toString());
          });
          
          if (clienteData) {
            console.log('✅ Cliente encontrado en fallback:', clienteData);
            resolve({
              nombre: (clienteData.nombre && clienteData.nombre.trim()) || 'Cliente',
              direccion: (clienteData.direccion && clienteData.direccion.trim()) || 'Sin dirección',
              dni: (clienteData.dni && clienteData.dni !== '0' && clienteData.dni.trim()) || 'Sin DNI', 
              cuit: (clienteData.cuit && clienteData.cuit !== '0' && clienteData.cuit.trim()) || 'Sin CUIT',
              tipoiva: (clienteData.tipoiva && clienteData.tipoiva.trim()) || 'Consumidor Final'
            });
          } else {
            console.warn('❌ Cliente no encontrado en fallback');
            resolve({
              nombre: 'Cliente',
              direccion: 'Sin dirección', 
              dni: 'Sin DNI',
              cuit: 'Sin CUIT',
              tipoiva: 'Consumidor Final'
            });
          }
        } else {
          console.warn('📭 Sin datos en fallback');
          resolve({
            nombre: 'Cliente',
            direccion: 'Sin dirección',
            dni: 'Sin DNI', 
            cuit: 'Sin CUIT',
            tipoiva: 'Consumidor Final'
          });
        }
      },
      error: (error) => {
        console.error('💥 Error en fallback:', error);
        resolve({
          nombre: 'Cliente',
          direccion: 'Sin dirección',
          dni: 'Sin DNI',
          cuit: 'Sin CUIT', 
          tipoiva: 'Consumidor Final'
        });
      }
    });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const iconMap: Record<string, any> = {
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };

    Swal.fire({
      icon: iconMap[type] as any,
      title: type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Aviso',
      text: message,
      confirmButtonText: 'Aceptar',
      timer: type === 'success' ? 3000 : undefined,
      timerProgressBar: type === 'success'
    });
  }
}