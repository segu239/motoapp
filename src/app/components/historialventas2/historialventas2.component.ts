import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { HistorialVentas2PaginadosService } from '../../services/historial-ventas2-paginados.service';
import { Subscription } from 'rxjs';
import { LazyLoadEvent } from 'primeng/api';
import { HistorialVenta2 } from '../../interfaces/historial-venta2';
import { VentaExpandida } from '../../interfaces/recibo-expanded';
import { TotalizadorGeneral, TotalizadorTipoPago, TotalizadorPorTipo, TotalizadorPorSucursal } from '../../interfaces/totalizador-historial';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { CargardataService } from '../../services/cargardata.service';
import { CrudService } from '../../services/crud.service';
import { take } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TotalizadorModalComponent } from './totalizador-modal.component';

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
  
  // Variables para totalizador
  public totalizador: TotalizadorGeneral | null = null;
  public tarjetasMap: Map<number, string> = new Map();
  public calculandoTotalizador: boolean = false;
  private totalizadorDialogRef: DynamicDialogRef | undefined;
  
  // Subscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private historialVentas2Service: HistorialVentas2PaginadosService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private pdfGeneratorService: PdfGeneratorService,
    private cargardataService: CargardataService,
    private crudService: CrudService,
    private dialogService: DialogService
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
    
    // Cargar tarjetas para el totalizador
    this.cargarTarjetas();
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
            recibos: response.data.recibos || []
          };
        } else {
          this.expandedRows[key] = {
            recibos: []
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
        const promesa = this.historialVentas2Service.obtenerDatosExpandidos(venta.id).toPromise()
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