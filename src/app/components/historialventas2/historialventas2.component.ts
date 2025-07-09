import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { HistorialVentas2PaginadosService } from '../../services/historial-ventas2-paginados.service';
import { Subscription } from 'rxjs';
import { LazyLoadEvent } from 'primeng/api';
import { HistorialVenta2 } from '../../interfaces/historial-venta2';
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

  // Lazy loading de datos
  loadDataLazy(event: LazyLoadEvent): void {
    console.log('Lazy load event:', event);
    
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

    console.log('Cargando datos con parámetros:', {
      idCliente: this.idCliente,
      page,
      limit,
      sortField,
      sortOrder,
      filters: processedFilters
    });

    // Cargar datos del servicio
    this.historialVentas2Service.cargarHistorialVentas2(
      this.idCliente,
      page,
      limit,
      sortField,
      sortOrder,
      processedFilters
    ).subscribe({
      next: (response) => {
        console.log('Datos cargados exitosamente');
      },
      error: (error) => {
        console.error('Error al cargar historial de ventas2:', error);
        this.showNotification('Error al cargar el historial de ventas', 'error');
      }
    });
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

  // Función para el botón de recibo (sin funcionalidad por ahora)
  verRecibo(): void {
    if (!this.ventaSeleccionada) {
      this.showNotification('Por favor seleccione una venta primero', 'warning');
      return;
    }

    console.log('Ver recibo para:', this.ventaSeleccionada);
    
    // Mostrar loading
    Swal.fire({
      title: 'Cargando información del recibo...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Obtener datos completos del recibo
    this.historialVentas2Service.obtenerDatosRecibo2(this.ventaSeleccionada.id || 0).subscribe({
      next: (response: any) => {
        console.log('Respuesta datos del recibo2:', response);
        
        if (response && !response.error && response.data) {
          this.mostrarModalRecibo(response.data);
        } else {
          this.showNotification('No se encontraron datos del recibo', 'warning');
        }
      },
      error: (error) => {
        console.error('Error al obtener datos del recibo2:', error);
        this.showNotification('Error al obtener datos del recibo', 'error');
      }
    });
  }

  // Mostrar modal con información completa del recibo
  private mostrarModalRecibo(datosRecibo: any): void {
    const formatearFecha = (fecha: string) => {
      if (!fecha) return 'Sin fecha';
      return new Date(fecha).toLocaleDateString('es-ES');
    };

    const formatearImporte = (importe: number) => {
      if (importe === null || importe === undefined) return 'Sin importe';
      return new Intl.NumberFormat('es-ES', { 
        style: 'currency', 
        currency: 'ARS' 
      }).format(importe);
    };

    Swal.fire({
      title: 'Información del Recibo',
      html: `
        <div class="text-left" style="max-height: 400px; overflow-y: auto;">
          <div class="mb-3">
            <h5 class="text-primary">📋 Información de la Factura</h5>
            <p><strong>ID:</strong> ${datosRecibo.id}</p>
            <p><strong>Sucursal:</strong> ${datosRecibo.sucursal}</p>
            <p><strong>Tipo:</strong> ${datosRecibo.tipo}</p>
            <p><strong>Punto de Venta:</strong> ${datosRecibo.puntoventa}</p>
            <p><strong>Letra:</strong> ${datosRecibo.letra}</p>
            <p><strong>Número de Factura:</strong> ${datosRecibo.numero_fac}</p>
            <p><strong>Fecha de Emisión:</strong> ${formatearFecha(datosRecibo.emitido)}</p>
            <p><strong>Fecha de Vencimiento:</strong> ${formatearFecha(datosRecibo.vencimiento)}</p>
            <p><strong>Usuario:</strong> ${datosRecibo.usuario || 'Sin definir'}</p>
          </div>

          <div class="mb-3">
            <h5 class="text-success">💰 Información Financiera</h5>
            <p><strong>Exento:</strong> ${formatearImporte(datosRecibo.excento)}</p>
            <p><strong>Básico:</strong> ${formatearImporte(datosRecibo.basico)}</p>
            <p><strong>IVA 1:</strong> ${formatearImporte(datosRecibo.iva1)}</p>
            <p><strong>IVA 2:</strong> ${formatearImporte(datosRecibo.iva2)}</p>
            <p><strong>IVA 3:</strong> ${formatearImporte(datosRecibo.iva3)}</p>
            <p><strong>Importe Total:</strong> ${formatearImporte(datosRecibo.importe_total)}</p>
            <p><strong>Saldo:</strong> ${formatearImporte(datosRecibo.saldo)}</p>
          </div>

        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: '700px',
      customClass: {
        popup: 'swal2-popup-large'
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