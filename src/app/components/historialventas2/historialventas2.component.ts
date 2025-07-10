import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { HistorialVentas2PaginadosService } from '../../services/historial-ventas2-paginados.service';
import { Subscription } from 'rxjs';
import { LazyLoadEvent } from 'primeng/api';
import { HistorialVenta2 } from '../../interfaces/historial-venta2';
import { VentaExpandida } from '../../interfaces/recibo-expanded';
import Swal from 'sweetalert2';

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
  
  // Subscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private historialVentas2Service: HistorialVentas2PaginadosService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeColumns();
  }

  ngOnInit(): void {
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

    // Suscribirse a los observables del servicio
    this.subscriptions.push(
      this.historialVentas2Service.historialVentas2$.subscribe(ventas => {
        this.historialVentas2 = ventas;
        this.cdr.detectChanges();
      }),
      
      this.historialVentas2Service.cargando$.subscribe(loading => {
        this.loading = loading;
        this.cdr.detectChanges();
      }),
      
      this.historialVentas2Service.totalItems$.subscribe(total => {
        this.totalRegistros = total;
        this.cdr.detectChanges();
      })
    );

    // Inicializar fechas por defecto (último mes)
    this.inicializarFechasPorDefecto();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeColumns(): void {
    this.cols = [
      { field: 'sucursal', header: 'Sucursal' },
      { field: 'tipo', header: 'Tipo' },
      { field: 'puntoventa', header: 'Punto Venta' },
      { field: 'letra', header: 'Letra' },
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
    
    // Resetear paginación
    this.first = 0;

    // Realizar consulta con rango de fechas
    this.cargarDatosConFechas(1, this.rows);
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

  // Lazy loading de datos (solo si ya se realizó una consulta)
  loadDataLazy(event: LazyLoadEvent): void {
    console.log('Lazy load event:', event);
    
    if (!this.consultaRealizada) {
      console.log('No se ha realizado consulta inicial');
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

    // Procesar filtros
    const filters = event.filters || {};
    const processedFilters: any = {};
    
    Object.keys(filters).forEach(key => {
      const filter = filters[key];
      if (filter && filter.value !== null && filter.value !== undefined && filter.value !== '') {
        processedFilters[key] = {
          value: filter.value,
          matchMode: filter.matchMode || 'contains'
        };
      }
    });

    // Cargar datos con fechas si están disponibles
    this.cargarDatosConFechas(page, limit, sortField, sortOrder, processedFilters);
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
    
    this.historialVentas2Service.obtenerDatosExpandidos(venta.id).subscribe({
      next: (response: any) => {
        console.log('Datos expandidos recibidos:', response);
        
        if (response && !response.error && response.data) {
          this.expandedRows[key] = {
            recibos: response.data.recibos || [],
            psucursal: response.data.psucursal || []
          };
        } else {
          this.expandedRows[key] = {
            recibos: [],
            psucursal: []
          };
        }
        
        this.loadingExpanded[key] = false;
      },
      error: (error) => {
        console.error('Error al cargar datos expandidos:', error);
        this.showNotification('Error al cargar datos detallados', 'error');
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