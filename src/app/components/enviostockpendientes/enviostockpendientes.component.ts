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
  public selectedPedidoItem: any[] = [];//public selectedPedidoItem: PedidoItem[] = [];
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

  public cantidad:number;
  public comentario: string ='sin comentario';

  constructor(public dialogService: DialogService, private filterService: FilterService, private _crud: CrudService, private activatedRoute: ActivatedRoute, private _cargardata: CargardataService, private _router: Router) {
    this.cols = [
      { field: 'tipo', header: 'Tipo' },
      { field: 'cantidad', header: 'Cantidad' },
      { field: 'id_art', header: 'Articulo' },
      { field: 'descripcion', header: 'Descripcion' },
      { field: 'precio', header: 'Precio' },
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
    console.log(event);
    console.log(this.selectedPedidoItem);
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
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido y especificar la cantidad', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

  if (selectedPedido.estado.trim() !== "Solicitado") {
    Swal.fire('Error', 'El pedido debe estar en estado "Solicitado" para poder enviarlo', 'error');
    return;
  }

  const fecha = new Date();
  const fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  const id_num = selectedPedido.id_num;
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
    estado: "Enviado",
    //id_num: 456
  };

  const pedidoscb = {
    //id_num: 123,
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

  this._cargardata.crearPedidoStockIdEnvio(id_num,pedidoItem, pedidoscb).subscribe({
    next: (response) => {
      console.log(response);
      Swal.fire('Éxito', 'Envio registrado exitosamente', 'success');
      this.refrescarDatos(); // Llama a la función para refrescar los datos
    },
    error: (err) => {
      console.log(err);
      Swal.fire('Error', 'Error al registrar el envio', 'error');
    }
  });
}

// Función para refrescar los datos
refrescarDatos() {
  // Implementa la lógica para refrescar los datos aquí
  // Por ejemplo, puedes volver a cargar los pedidos desde el servidor
  this.cargarPedidos();

}

/**
 * Cancela un pedido pendiente de envío
 * Solo permite cancelar pedidos en estado "Solicitado"
 */
cancelarEnvio() {
  // Validar que se haya seleccionado un pedido
  if (this.selectedPedidoItem.length === 0) {
    Swal.fire('Error', 'Debe seleccionar un pedido para cancelar', 'error');
    return;
  }

  const selectedPedido = this.selectedPedidoItem[0];

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

}

 
