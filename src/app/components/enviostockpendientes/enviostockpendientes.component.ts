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
interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-enviostockpendientes',
  templateUrl: './enviostockpendientes.component.html',
  styleUrls: ['./enviostockpendientes.component.css']
})
export class EnviostockpendientesComponent {

  @ViewChild('dtable') dtable: Table;
  cols: Column[];
  _selectedColumns: Column[];
  public pedidoItemElejido: any;//public pedidoItemElejido: PedidoItem;
  public selectedPedidoItem: any | null = null; // CAMBIO: De any[] a any | null para selección única
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

  public comentario: string ='sin comentario';

  // NUEVAS PROPIEDADES: Protección contra duplicados
  private operacionEnProceso: boolean = false;
  private ultimaOperacionTimestamp: number = 0;
  private readonly TIEMPO_MINIMO_ENTRE_OPERACIONES = 2000; // 2 segundos

  // NUEVAS PROPIEDADES: Totalizadores
  public mostrarTotalizadores: boolean = true;
  public totalGeneralPrecio: number = 0;  // ← RENOMBRADO (antes totalGeneralCosto)
  public totalGeneralCosto: number = 0;   // ← NUEVO (para precio de costo)

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
      { field: 'sucursald', header: 'De Sucursal' },
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

    this.cargarPedidos();
   /*  this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {//this._cargardata.obtenerStockPorSucursal(this.sucursal).subscribe((data: any) => {
      console.log(data);
      this.pedidoItem = data.mensaje;
      console.log(this.pedidoItem);
    } ); */


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

 /*  cargarPedidos() {
    this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
      console.log(data);
      this.pedidoItem = data.mensaje.filter((item: any) => item.estado.trim() === 'Solicitado' && item.sucursalh.trim() === this.sucursal.toString());//this.pedidoItem = data.mensaje.filter((item: any) => item.estado.trim() === 'Solicitado');
      console.log(this.pedidoItem);
    });
  } */

    cargarPedidos() {
      this._cargardata.obtenerPedidoItemPorSucursalh(this.sucursal).subscribe((data: any) => {
        console.log(data);
        if (Array.isArray(data.mensaje)) {
          this.pedidoItem = data.mensaje.filter((item: any) =>
            item.estado.trim() === 'Solicitado' &&
            item.sucursalh.trim() === this.sucursal.toString()
          );

          // NUEVO: Procesar items de pedido (convierte valores y aplica conversión de moneda)
          this.procesarItemsPedido();

          console.log(this.pedidoItem);
        } else {
          console.error('Unexpected data format:', data);

        }
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
    console.log('Selección cambiada:', event);
    console.log('Pedido seleccionado:', this.selectedPedidoItem);
    // Ya no se necesitan cálculos de totales en selección única
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
    this.totalSaldosSeleccionados = this.selectedPedidoItem
      .reduce((sum, pedido) => sum + Number(pedido.precio), 0); // Suma los saldos
  }
  calcularTotalesSeleccionados() {
    console.log(this.selectedPedidoItem);
    this.totalesSeleccionados = this.selectedPedidoItem
      .reduce((sum, cabecera:any) => sum + cabecera.total, 0); // Suma los saldos
  }

  /* recibir()
  {
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido y especificar la cantidad', 'error');
    return;
}

const selectedPedido = this.selectedPedidoItem[0];
const fecha = new Date();
const fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

const pedidoItem: any = {
    //id_items: 1,
    tipo: "PE",
    cantidad: selectedPedido.cantidad,
    id_art: selectedPedido.id_art,
    descripcion: selectedPedido.descripcion,
    precio: selectedPedido.precio,
    fecha_resuelto: fechaFormateada,
    usuario_res: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Recibido",
    //id_num: 456
};

const pedidoscb = {
    //id_num: 123,
    tipo: "PE",
    numero: 1,
    sucursald: Number(this.sucursal),
    sucursalh: selectedPedido.sucursalh,
    fecha: fechaFormateada,
    usuario: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Recibido",
    id_aso: 222
};

this._cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe({
    next: (response) => {
        console.log(response);
        //Swal.fire('Éxito', 'Pedido registrado exitosamente', 'success');
    },
    error: (err) => {
      console.log(err);
        //Swal.fire('Error', 'Error al registrar el pedido', 'error');
    }
});
} */

enviar() {
  // VALIDACIÓN 1: Verificar que hay un pedido seleccionado
  if (!this.selectedPedidoItem) {
    Swal.fire({
      title: 'Error',
      text: 'Debe seleccionar un pedido para enviar',
      icon: 'error'
    });
    return;
  }

  // VALIDACIÓN 2: Verificar que no hay otra operación en proceso
  if (this.operacionEnProceso) {
    Swal.fire({
      title: 'Operación en proceso',
      text: 'Ya hay un envío en curso. Por favor espere.',
      icon: 'warning'
    });
    return;
  }

  // VALIDACIÓN 3: Throttling - Verificar tiempo mínimo entre operaciones
  const ahora = Date.now();
  if (this.ultimaOperacionTimestamp &&
      (ahora - this.ultimaOperacionTimestamp) < this.TIEMPO_MINIMO_ENTRE_OPERACIONES) {
    const tiempoRestante = Math.ceil(
      (this.TIEMPO_MINIMO_ENTRE_OPERACIONES - (ahora - this.ultimaOperacionTimestamp)) / 1000
    );
    Swal.fire({
      title: 'Demasiado rápido',
      text: `Por favor espere ${tiempoRestante} segundo(s) antes de realizar otra operación`,
      icon: 'warning',
      timer: 2000,
      showConfirmButton: false
    });
    return;
  }

  const selectedPedido = this.selectedPedidoItem;

  // VALIDACIÓN 4: Verificar estado correcto
  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire({
      title: 'Error',
      text: 'El pedido debe estar en estado "Solicitado" para poder enviarlo',
      icon: 'error'
    });
    return;
  }

  // Marcar operación en proceso
  this.operacionEnProceso = true;
  this.ultimaOperacionTimestamp = ahora;

  const fecha = new Date();
  const fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  const id_num = selectedPedido.id_num;
  const pedidoItem: any = {
    tipo: "PE",
    cantidad: selectedPedido.cantidad,
    id_art: selectedPedido.id_art,
    descripcion: selectedPedido.descripcion,
    precio: selectedPedido.precio,
    fecha_resuelto: fechaFormateada,
    usuario_res: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Enviado",
  };

  const pedidoscb = {
    tipo: "PE",
    numero: 1,
    sucursald: Number(this.sucursal),
    sucursalh: selectedPedido.sucursald,
    fecha: fechaFormateada,
    usuario: sessionStorage.getItem('usernameOp'),
    observacion: this.comentario,
    estado: "Enviado",
    id_aso: 222
  };

  // Mostrar indicador de carga
  Swal.fire({
    title: 'Procesando envío...',
    text: 'Por favor espere',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this._cargardata.crearPedidoStockIdEnvio(id_num, pedidoItem, pedidoscb).subscribe({
    next: (response) => {
      console.log('Respuesta exitosa:', response);
      this.operacionEnProceso = false;

      Swal.fire({
        title: 'Éxito',
        text: 'Envío registrado exitosamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      // Limpiar selección
      this.selectedPedidoItem = null;
      this.comentario = 'sin comentario';

      // Refrescar datos
      this.refrescarDatos();
    },
    error: (err) => {
      console.error('Error al enviar pedido:', err);
      this.operacionEnProceso = false;

      // MANEJO MEJORADO DE ERRORES
      if (err.status === 409) {
        // Error de conflicto - operación duplicada
        Swal.fire({
          title: 'Pedido ya procesado',
          text: err.error?.mensaje || 'Este pedido ya fue enviado anteriormente',
          icon: 'info'
        });

        // Refrescar para mostrar el estado actualizado
        this.selectedPedidoItem = null;
        this.refrescarDatos();
      } else if (err.status === 400) {
        // Error de validación
        Swal.fire({
          title: 'Error de validación',
          text: err.error?.mensaje || 'Los datos del pedido no son válidos',
          icon: 'error'
        });
      } else if (err.status === 404) {
        // Pedido no encontrado
        Swal.fire({
          title: 'Pedido no encontrado',
          text: 'El pedido seleccionado no existe o fue eliminado',
          icon: 'error'
        });
        this.selectedPedidoItem = null;
        this.refrescarDatos();
      } else {
        // Error genérico
        Swal.fire({
          title: 'Error',
          text: 'Error al registrar el envío. Por favor intente nuevamente.',
          icon: 'error'
        });
      }
    }
  });
}

// Función para refrescar los datos
refrescarDatos() {
  // Implementa la lógica para refrescar los datos aquí
  // Por ejemplo, puedes volver a cargar los pedidos desde el servidor
  this.cargarPedidos();

  // Resetear la tabla PrimeNG para forzar actualización de la vista
  if (this.dtable) {
    this.dtable.reset();
  }
}

/**
 * Cancela un pedido pendiente de envío
 * Solo permite cancelar pedidos en estado "Solicitado"
 */
cancelarEnvio() {
  // Validar que se haya seleccionado un pedido
  if (!this.selectedPedidoItem) {
    Swal.fire('Error', 'Debe seleccionar un pedido para cancelar', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem;

  // Validar que el estado sea "Solicitado"
  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire(
      'Error',
      'Solo se pueden cancelar pedidos en estado "Solicitado"',
      'error'
    );
    return;
  }

  // Solicitar motivo de cancelación al usuario
  Swal.fire({
    title: '¿Está seguro?',
    text: '¿Desea cancelar este pedido de stock?',
    input: 'textarea',
    inputLabel: 'Motivo de cancelación',
    inputPlaceholder: 'Ingrese el motivo de la cancelación...',
    inputAttributes: {
      'aria-label': 'Ingrese el motivo de la cancelación'
    },
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No',
    inputValidator: (value) => {
      if (!value) {
        return 'Debe ingresar un motivo de cancelación';
      }
      return null;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const id_num = selectedPedido.id_num;
      const usuario = sessionStorage.getItem('usernameOp') || '';
      const motivo_cancelacion = result.value;
      const fecha = new Date();

      // Mostrar indicador de carga
      Swal.fire({
        title: 'Cancelando pedido...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Llamar al servicio para cancelar
      this._cargardata.cancelarPedidoStock(
        id_num,
        usuario,
        motivo_cancelacion,
        fecha
      ).subscribe({
        next: (response: any) => {
          console.log('Respuesta de cancelación:', response);

          if (response.error) {
            Swal.fire('Error', response.mensaje, 'error');
          } else {
            Swal.fire({
              title: 'Éxito',
              text: 'Pedido cancelado exitosamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            // Limpiar selección
            this.selectedPedidoItem = null;
            this.refrescarDatos();
          }
        },
        error: (err) => {
          console.error('Error al cancelar pedido:', err);
          Swal.fire(
            'Error',
            'Error al cancelar el pedido. Por favor intente nuevamente.',
            'error'
          );
        }
      });
    }
  });
}

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
 */
onFilter(event: any): void {
  console.log('Tabla filtrada:', event);
  this.actualizarTotalGeneral();
}

/**
 * Obtiene el precio total (venta) del item actualmente seleccionado
 */
get precioTotalItemSeleccionado(): number {
  return this.totalizadoresService.obtenerCostoItemSeleccionadoPorCampo(
    this.selectedPedidoItem,
    'precio_total_convertido'  // ← MODIFICADO
  );
}

/**
 * Obtiene el costo total del item actualmente seleccionado
 */
get costoTotalItemSeleccionado(): number {
  return this.totalizadoresService.obtenerCostoItemSeleccionadoPorCampo(
    this.selectedPedidoItem,
    'costo_total_convertido'  // ← MODIFICADO
  );

}

 

}
