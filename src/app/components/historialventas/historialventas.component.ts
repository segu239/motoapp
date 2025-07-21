import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { HistorialVentasPaginadosService } from '../../services/historial-ventas-paginados.service';
import { Subscription } from 'rxjs';
import { LazyLoadEvent } from 'primeng/api';
import { HistorialVenta } from '../../interfaces/historial-venta';
import { ReciboDetalle } from '../../interfaces/recibo-detalle';
import Swal from 'sweetalert2';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-historialventas',
  templateUrl: './historialventas.component.html',
  styleUrls: ['./historialventas.component.css']
})
export class HistorialventasComponent implements OnInit, OnDestroy {

  public historialVentas: HistorialVenta[] = [];
  public clienteInfo: any = null;
  public idCliente: number = 0;
  public loading: boolean = false;
  
  // Variable para almacenar la venta seleccionada
  public ventaSeleccionada: HistorialVenta | null = null;
  
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
    private historialVentasService: HistorialVentasPaginadosService,
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
      this.historialVentasService.historialVentas$.subscribe(ventas => {
        this.historialVentas = ventas;
        this.cdr.detectChanges();
      }),
      
      this.historialVentasService.cargando$.subscribe(loading => {
        this.loading = loading;
        this.cdr.detectChanges();
      }),
      
      this.historialVentasService.totalItems$.subscribe(total => {
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
      { field: 'tipodoc', header: 'Tipo Doc.' },
      { field: 'puntoventa', header: 'Punto Venta' },
      { field: 'idart', header: 'ID Art.' },
      { field: 'nomart', header: 'Nombre Artículo' },
      { field: 'fecha', header: 'Fecha' },
      { field: 'hora', header: 'Hora' },
      { field: 'cantidad', header: 'Cantidad' },
      { field: 'precio', header: 'Precio' },
      { field: 'descripcion_tarjeta', header: 'Forma de Pago' },
      { field: 'numerocomprobante', header: 'Nro. Comprobante' },
      { field: 'id_num', header: 'ID Num.' }
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
    this.historialVentasService.cargarHistorialVentas(
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
        console.error('Error al cargar historial de ventas:', error);
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

    this.historialVentasService.cargarHistorialVentas(this.idCliente, 1, this.rows).subscribe({
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
    if (this.historialVentas.length === 0) {
      this.showNotification('No hay datos para exportar', 'warning');
      return;
    }

    import('xlsx').then((xlsx) => {
      // Preparar datos para exportación (solo columnas visibles)
      const dataToExport = this.historialVentas.map(venta => {
        const exportRow: any = {};
        
        this.selectedColumns.forEach(col => {
          let value = venta[col.field as keyof HistorialVenta];
          
          // Formatear valores específicos
          if (col.field === 'fecha' && value) {
            exportRow[col.header] = new Date(value.toString()).toLocaleDateString('es-ES');
          } else if (col.field === 'precio' && value) {
            exportRow[col.header] = parseFloat(value.toString()).toFixed(4);
          } else if (col.field === 'cantidad' && value) {
            exportRow[col.header] = parseFloat(value.toString()).toFixed(2);
          } else if (col.field === 'descripcion_tarjeta') {
            exportRow[col.header] = value || 'Sin definir';
          } else {
            exportRow[col.header] = value || '';
          }
        });
        
        return exportRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(dataToExport);
      const workbook = { 
        Sheets: { 'Historial de Ventas': worksheet }, 
        SheetNames: ['Historial de Ventas'] 
      };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      this.saveAsExcelFile(excelBuffer, 'historial-ventas');
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

  // Función para el botón de información de recibos
  verInformacionRecibos(): void {
    if (!this.ventaSeleccionada) {
      this.showNotification('Por favor seleccione una venta primero', 'warning');
      return;
    }

    console.log('Ver información de recibos para:', this.ventaSeleccionada);
    
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
    this.historialVentasService.obtenerDatosRecibo(this.ventaSeleccionada.id_num).subscribe({
      next: (response: any) => {
        console.log('Respuesta datos del recibo:', response);
        
        if (response && !response.error && response.data) {
          this.mostrarModalRecibo(response.data);
        } else {
          this.showNotification('No se encontraron datos del recibo', 'warning');
        }
      },
      error: (error) => {
        console.error('Error al obtener datos del recibo:', error);
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
      title: 'Información Completa del Recibo',
      html: `
        <div class="text-left" style="max-height: 400px; overflow-y: auto;">
          <div class="mb-3">
            <h5 class="text-primary">📋 Información de la Venta</h5>
            <p><strong>ID Num:</strong> ${datosRecibo.id_num}</p>
            <p><strong>Número de Comprobante:</strong> ${datosRecibo.numerocomprobante}</p>
            <p><strong>Punto de Venta:</strong> ${datosRecibo.puntoventa}</p>
            <p><strong>Tipo de Documento:</strong> ${datosRecibo.tipodoc}</p>
            <p><strong>Fecha de Venta:</strong> ${formatearFecha(datosRecibo.fecha_venta)}</p>
            <p><strong>Hora:</strong> ${datosRecibo.hora}</p>
            <p><strong>Artículo:</strong> ${datosRecibo.nomart}</p>
            <p><strong>Cantidad:</strong> ${datosRecibo.cantidad}</p>
            <p><strong>Precio:</strong> ${formatearImporte(datosRecibo.precio)}</p>
            <p><strong>Forma de Pago:</strong> ${datosRecibo.descripcion_tarjeta || 'Sin definir'}</p>
          </div>

          ${datosRecibo.recibo ? `
          <div class="mb-3">
            <h5 class="text-success">🧾 Información del Recibo</h5>
            <p><strong>Número de Recibo:</strong> ${datosRecibo.recibo}</p>
            <p><strong>Tipo de Recibo:</strong> ${datosRecibo.c_tipo}</p>
            <p><strong>Fecha de Recibo:</strong> ${formatearFecha(datosRecibo.fecha_recibo)}</p>
            <p><strong>Importe del Recibo:</strong> ${formatearImporte(datosRecibo.importe)}</p>
            <p><strong>Saldo del Recibo:</strong> ${formatearImporte(datosRecibo.recibo_saldo)}</p>
            <p><strong>Usuario:</strong> ${datosRecibo.usuario || 'Sin definir'}</p>
            <p><strong>Sucursal:</strong> ${datosRecibo.cod_sucursal}</p>
            <p><strong>Fecha de Procesamiento:</strong> ${formatearFecha(datosRecibo.fec_proceso)}</p>
          </div>

          <div class="mb-3">
            <h5 class="text-warning">💰 Información Financiera</h5>
            <p><strong>Bonificación:</strong> ${formatearImporte(datosRecibo.bonifica)} (${datosRecibo.bonifica_tipo === 'P' ? 'Porcentaje' : 'Importe'})</p>
            <p><strong>Interés:</strong> ${formatearImporte(datosRecibo.interes)} (${datosRecibo.interes_tipo === 'P' ? 'Porcentaje' : 'Importe'})</p>
            <p><strong>Cuota:</strong> ${datosRecibo.c_cuota || 'Sin cuota'}</p>
            <p><strong>Tipo de Factura:</strong> ${datosRecibo.c_tipf}</p>
          </div>

          <div class="mb-3">
            <h5 class="text-info">🔧 Información Técnica</h5>
            <p><strong>Código de Lugar:</strong> ${datosRecibo.cod_lugar}</p>
            <p><strong>Sesión:</strong> ${datosRecibo.sesion}</p>
            <p><strong>Recibo Asociado:</strong> ${datosRecibo.recibo_asoc}</p>
            <p><strong>Observación:</strong> ${datosRecibo.observacion || 'Sin observaciones'}</p>
          </div>
          ` : `
          <div class="mb-3">
            <h5 class="text-danger">⚠️ Información del Recibo</h5>
            <p>No se encontró información de recibo asociada a esta venta.</p>
          </div>
          `}
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