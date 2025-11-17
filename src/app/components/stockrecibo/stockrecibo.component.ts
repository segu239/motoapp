import { Component, OnInit,ViewChild } from '@angular/core';
//import { Pedidoscb } from '../../interfaces/pedidoscb';
import { PedidoItem } from '../../interfaces/pedidoItem';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { Cliente } from '../../interfaces/cliente';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { first, take,catchError} from 'rxjs/operators';
import { of } from 'rxjs'; // Importar catchError
import Swal from 'sweetalert2'; // Import SweetAlert2
import { CrudService } from 'src/app/services/crud.service';
import { formatDate } from '@angular/common';
import { SelectItem } from 'primeng/api';
import { FilterService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { PedidosComponent } from '../pedidos/pedidos.component';
import { RecibosComponent } from '../recibos/recibos.component';
import { CalendarModule } from 'primeng/calendar';
import { TotalizadoresService } from '../../services/totalizadores.service';
import { SucursalNombrePipe } from '../../pipes/sucursal-nombre.pipe';
interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-stockrecibo',
  templateUrl: './stockrecibo.component.html',
  styleUrls: ['./stockrecibo.component.css']
})
export class StockreciboComponent {
  @ViewChild('dtable') dtable: Table;
  cols: Column[];
  _selectedColumns: Column[];
  public pedidoItemElejido: any;//public pedidoItemElejido: PedidoItem;
  public selectedPedidoItem: any | null = null; // ← Corregido: Selección única (consistente con HTML)
  //sucursal: SelectItem[];
  sucursal: any;
  option2: SelectItem[];
  option3: SelectItem[];
  option4: SelectItem[];
  selectedSucursal: any;
  //public cabeceras: any;
  public pedidoItem: any[];//public pedidoItem: PedidoItem[];
  //public clientes: Cliente[];
  totalSaldosSeleccionados: number = 0;
  totalesSeleccionados: number = 0;
  dateRange: Date[];

  // NUEVAS PROPIEDADES: Totalizadores
  public mostrarTotalizadores: boolean = true;
  public totalGeneralPrecio: number = 0;  // ← RENOMBRADO (antes totalGeneralCosto)
  public totalGeneralCosto: number = 0;   // ← NUEVO (para precio de costo)

  // Pipe para conversión de nombres de sucursales
  private sucursalPipe = new SucursalNombrePipe();

  constructor(
    public dialogService: DialogService,
    private filterService: FilterService,
    private _crud: CrudService,
    private activatedRoute: ActivatedRoute,
    private _cargardata: CargardataService,
    private _router: Router,
    private totalizadoresService: TotalizadoresService // ← NUEVO
  ) {
    this.cols = [
      { field: 'tipo', header: 'Tipo' },
      { field: 'cantidad', header: 'Cantidad' },
      { field: 'precio_convertido', header: 'Precio Unit.' },            // ← MODIFICADO: Ahora muestra precio convertido
      { field: 'precio_total_convertido', header: 'Precio Total' },      // ← MODIFICADO
      { field: 'precostosi_convertido', header: 'Precio Costo' },        // ← MODIFICADO: Ahora muestra precio costo convertido
      { field: 'costo_total_convertido', header: 'Total Precio Costo' }, // ← MODIFICADO
      { field: 'vcambio', header: 'Valor Cambio' },                      // ← NUEVO (opcional)
      { field: 'tipo_moneda', header: 'Moneda' },                        // ← NUEVO (opcional)
      { field: 'id_art', header: 'Articulo' },
      { field: 'descripcion', header: 'Descripcion' },
      { field: 'fecha_resuelto', header: 'Fecha' },
      { field: 'usuario_res', header: 'Usuario' },
      { field: 'observacion', header: 'Observacion' },
      { field: 'sucursalh', header: 'A Sucursal' },
      { field: 'estado', header: 'Estado' },
      { field: 'id_num', header: 'Id num.' },
      { field: 'id_items', header: 'Id items' },

    ];
    this._selectedColumns = this.cols;
    this.sucursal = Number(sessionStorage.getItem('sucursal'));
    /* this.sucursal = [
      { label: 'Suc. Valle Viejo', value: 2 },
      { label: 'Suc. Guemes', value: 3 },
      { label: 'Deposito', value: 4 }
    ]; */


  }

  ngOnInit(): void {
    console.log(this.sucursal);
    /* this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
      console.log(data);
      this.pedidoItem = data.mensaje;
      console.log(this.pedidoItem);
    } ); */

    this.cargarPedidos();

   /*  this.filterService.register('dateRange', (value: any, filter: Date[]): boolean => {
      if (filter === undefined || filter === null || filter.length === 0) {
        return true;
      }
  
      if (value === undefined || value === null) {
        return false;
      }
  
      const startDate = filter[0];
      const endDate = filter[1];
  
      if (startDate === null || endDate === null) {
        return true;
      }
  
      const cellDate = new Date(value);
  
      return cellDate >= startDate && cellDate <= endDate;
    }); */
  }

  cargarPedidos() {
    // CAMBIO: Usar obtenerPedidoItemPorSucursalh en lugar de obtenerPedidoItemPorSucursal
    // para filtrar correctamente por sucursalh (quien recibe) en lugar de sucursald (quien solicita)
    this._cargardata.obtenerPedidoItemPorSucursalh(this.sucursal).subscribe((data: any) => {
      console.log(data);
      // CAMBIO: Filtrar por múltiples estados y validar que data.mensaje es array
      if (Array.isArray(data.mensaje)) {
        this.pedidoItem = data.mensaje.filter((item: any) => {
          const estado = item.estado.trim();
          // FIX 17-Nov-2025: 'Enviado' NO EXISTE en sistema V2
          // Mostrar transferencias Aceptadas (pendientes confirmación) y Recibidas (completadas)
          return estado === 'Aceptado' || estado === 'Recibido';
        });

        // NUEVO: Procesar items de pedido (convierte valores y aplica conversión de moneda)
        this.procesarItemsPedido();

      } else {
        this.pedidoItem = [];
      }
      console.log('StockRecibo - Items filtrados:', this.pedidoItem);
    });
  }
/*   integrarNombreClienteaCabecera() {
    // Iterar sobre this.cabeceras y agregar el campo nombre
    this.cabeceras.forEach(cabecera => {
      const cliente = this.clientes.find(cli => cli.idcli === cabecera.cliente);
      console.log(cliente);
      if (cliente) {
        cabecera.nombrecliente = cliente.nombre;
      }
    });
  } */
/*   onDateSelect() {
    if (this.dateRange && this.dateRange.length === 2) {
      this.dtable.filter(this.dateRange, 'fecha_resuelto', 'dateRange');
    } else {
      this.dtable.filter(null, 'emitido', 'dateRange');
    }
  } */
  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }
  set selectedColumns(val: Column[]) {
    // Restore original order
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }
  onSelectionChange(event: any) {
    console.log(event);
    this.calcularTotalSaldosSeleccionados();
    this.calcularTotalesSeleccionados();
  }
  // onSucursalChange(event: any) {
  //   this.selectedSucursal = event.value;
  //   console.log(this.selectedSucursal);
  //   this._cargardata.cabecerasucNombreTarj(this.selectedSucursal).subscribe((data: any) => {
  //    /*  console.log(data);
  //     this.cabeceras = data.mensaje; */
  //     console.log(data.mensaje);
  //     this.cabeceras = data.mensaje.map(cabecera => ({
  //       ...cabecera,
  //       total: parseInt(cabecera.basico) + parseInt(cabecera.iva1), // Calcula el campo total
  //       //emitido: new Date(cabecera.emitido) // Convierte a Date
  //     }));
  //     this.integrarNombreClienteaCabecera();
  
  //   });
  // }
  calcularTotalSaldosSeleccionados() {
    console.log(this.selectedPedidoItem);
    // Ajustado para selección única
    this.totalSaldosSeleccionados = this.selectedPedidoItem
      ? Number(this.selectedPedidoItem.precio)
      : 0;
  }
  calcularTotalesSeleccionados() {
    console.log(this.selectedPedidoItem);
    // Ajustado para selección única
    this.totalesSeleccionados = this.selectedPedidoItem && this.selectedPedidoItem.total
      ? this.selectedPedidoItem.total
      : 0;
  }

/*   recibir()
  {
  if (this.selectedPedidoItem.length === 0 || !this.cantidad) {
    Swal.fire('Error', 'Debe seleccionar un pedido y especificar la cantidad', 'error');
    return;
}

const selectedPedido = this.selectedPedidoItem[0];
const fecha = new Date();
const fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

const pedidoItem: PedidoItem = {
    id_items: 1,
    tipo: "PE",
    cantidad: this.cantidad,
    id_art: selectedPedido.id_art,
    descripcion: selectedPedido.descripcion,
    precio: selectedPedido.precio,
    fecha_resuelto: fechaFormateada,
    usuario_res: sessionStorage.getItem('usernameOp'),
    observacion: '',
    estado: "Solicitado",
    id_num: 456
};

const pedidoscb = {
    id_num: 123,
    tipo: "PE",
    numero: 456,
    sucursald: Number(this.sucursal),
    sucursalh: this.selectedSucursal,
    fecha: fechaFormateada,
    usuario: sessionStorage.getItem('usernameOp'),
    observacion: '',
    estado: "Enviado",
    id_aso: 222
};

this._cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe(
    response => {
        Swal.fire('Éxito', 'Pedido registrado exitosamente', 'success');
    },
    error => {
        Swal.fire('Error', 'Error al registrar el pedido', 'error');
    }
);
} */

/**
 * Procesa los items de pedido
 * NOTA: Los totales convertidos YA vienen calculados del backend
 * Este método solo valida y formatea para consistencia
 */
private procesarItemsPedido(): void {
  try {
    if (!this.pedidoItem || !Array.isArray(this.pedidoItem)) {
      console.warn('pedidoItem inválido');
      return;
    }

    this.pedidoItem.forEach((item, index) => {
      try {
        // ========================================================================
        // CONVERSIÓN DE TIPOS (PostgreSQL retorna NUMERIC como string)
        // Procesar los 4 campos convertidos + vcambio
        // ========================================================================

        // 1. Precio unitario convertido
        if (typeof item.precio_convertido === 'string') {
          item.precio_convertido = parseFloat(
            item.precio_convertido.replace(',', '.')
          );
        }
        if (isNaN(item.precio_convertido)) {
          console.warn(`Item ${index}: precio_convertido inválido`);
          item.precio_convertido = 0;
        }

        // 2. Precio total convertido
        if (typeof item.precio_total_convertido === 'string') {
          item.precio_total_convertido = parseFloat(
            item.precio_total_convertido.replace(',', '.')
          );
        }
        if (isNaN(item.precio_total_convertido)) {
          console.warn(`Item ${index}: precio_total_convertido inválido`);
          item.precio_total_convertido = 0;
        }

        // 3. Precio costo unitario convertido
        if (typeof item.precostosi_convertido === 'string') {
          item.precostosi_convertido = parseFloat(
            item.precostosi_convertido.replace(',', '.')
          );
        }
        if (isNaN(item.precostosi_convertido)) {
          console.warn(`Item ${index}: precostosi_convertido inválido`);
          item.precostosi_convertido = 0;
        }

        // 4. Total precio costo convertido
        if (typeof item.costo_total_convertido === 'string') {
          item.costo_total_convertido = parseFloat(
            item.costo_total_convertido.replace(',', '.')
          );
        }
        if (isNaN(item.costo_total_convertido)) {
          console.warn(`Item ${index}: costo_total_convertido inválido`);
          item.costo_total_convertido = 0;
        }

        // 5. Valor de cambio
        if (typeof item.vcambio === 'string') {
          item.vcambio = parseFloat(item.vcambio.replace(',', '.'));
        }

        // Mantener campos legacy para compatibilidad (DEPRECATED)
        item.precio_total = item.precio_total_convertido;
        item.costo_total = item.costo_total_convertido;

      } catch (error) {
        console.error(`Error al procesar item ${index}:`, error, item);
        item.precio_convertido = 0;
        item.precio_total_convertido = 0;
        item.precostosi_convertido = 0;
        item.costo_total_convertido = 0;
        item.precio_total = 0;
        item.costo_total = 0;
      }
    });

    // Actualizar totales generales
    this.actualizarTotalGeneral();

  } catch (error) {
    console.error('Error crítico en procesarItemsPedido:', error);
    this.totalGeneralPrecio = 0;
    this.totalGeneralCosto = 0;
  }
}

/**
 * Actualiza el total general de TODOS los items filtrados
 * NOTA: PrimeNG pagina en el cliente, por lo que pedidoItem
 * contiene TODOS los registros, no solo los de la página visible
 */
private actualizarTotalGeneral(): void {
  try {
    // Total general de PRECIO DE VENTA (con conversión de moneda)
    this.totalGeneralPrecio = this.totalizadoresService.calcularTotalGeneralPorCampo(
      this.pedidoItem,
      'precio_total_convertido'  // ← MODIFICADO
    );

    // Total general de PRECIO DE COSTO (con conversión de moneda)
    this.totalGeneralCosto = this.totalizadoresService.calcularTotalGeneralPorCampo(
      this.pedidoItem,
      'costo_total_convertido'  // ← MODIFICADO
    );
  } catch (error) {
    console.error('Error al actualizar total general:', error);
    this.totalGeneralPrecio = 0;
    this.totalGeneralCosto = 0;
  }
}

/**
 * Handler para cuando el usuario filtra la tabla
 * PrimeNG emite este evento, recalculamos los totales
 */
onFilter(event: any): void {
  console.log('Tabla filtrada:', event);
  // Los totales se recalculan automáticamente porque
  // actualizarTotalGeneral() usa this.pedidoItem que ya está filtrado
  this.actualizarTotalGeneral();
}

/**
 * Obtiene el precio total (venta) del item actualmente seleccionado
 * (selección única con radio button)
 */
get precioTotalItemSeleccionado(): number {
  return this.totalizadoresService.obtenerCostoItemSeleccionadoPorCampo(
    this.selectedPedidoItem,
    'precio_total_convertido'  // ← MODIFICADO
  );
}

/**
 * Obtiene el costo total del item actualmente seleccionado
 * (selección única con radio button)
 */
get costoTotalItemSeleccionado(): number {
  return this.totalizadoresService.obtenerCostoItemSeleccionadoPorCampo(
    this.selectedPedidoItem,
    'costo_total_convertido'  // ← MODIFICADO
  );
}

/**
 * Exporta los datos de recibos de stock a Excel
 * Incluye todos los campos con conversión de moneda
 */
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.pedidoItem.map(item => ({
      // Identificadores
      'ID Num': item.id_num,
      'ID Items': item.id_items,

      // Tipo y Estado
      'Tipo': item.tipo,
      'Estado': item.estado,

      // Producto
      'ID Artículo': item.id_art,
      'Descripción': item.descripcion,
      'Cantidad': item.cantidad,

      // Precios con conversión de moneda
      'Precio Unit. Venta': this.formatearCosto(item.precio_convertido),
      'Precio Total Venta': this.formatearCosto(item.precio_total_convertido),
      'Precio Unit. Costo': this.formatearCosto(item.precostosi_convertido),
      'Total Precio Costo': this.formatearCosto(item.costo_total_convertido),

      // Conversión de moneda
      'Valor Cambio': this.formatearCosto(item.vcambio),
      'Tipo Moneda': item.tipo_moneda || 'N/A',

      // Ubicación
      'Sucursal Origen': this.sucursalPipe.transform(item.sucursald),
      'Sucursal Destino': this.sucursalPipe.transform(item.sucursalh),

      // Usuario y fechas
      'Fecha': item.fecha_resuelto || 'N/A',
      'Usuario': item.usuario_res || 'N/A',
      'Observación': item.observacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((module: any) => {
      const saveAs = module.default || module.saveAs || module;
      if (typeof saveAs === 'function') {
        saveAs(data, 'recibos_stock_' + new Date().getTime() + '.xlsx');
      } else if (typeof saveAs.saveAs === 'function') {
        saveAs.saveAs(data, 'recibos_stock_' + new Date().getTime() + '.xlsx');
      }
    });
  });
}

/**
 * Formatea un valor numérico para exportación a Excel
 * Retorna 'N/A' para valores nulos/undefined, números para valores válidos
 */
private formatearCosto(valor: number | undefined | null): string | number {
  if (valor === null || valor === undefined) {
    return 'N/A';
  }
  return valor;
}

}



  
