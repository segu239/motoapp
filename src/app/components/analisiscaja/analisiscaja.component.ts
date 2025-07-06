import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Cabecera } from '../../interfaces/cabecera';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { Cliente } from '../../interfaces/cliente';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { first, take, catchError, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs'; // Importar catchError
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
  selector: 'app-analisiscaja',
  templateUrl: './analisiscaja.component.html',
  styleUrls: ['./analisiscaja.component.css'],
  providers: [FilterService, DialogService, CalendarModule]
})
export class AnalisiscajaComponent implements OnInit, OnDestroy {
  @ViewChild('dtable') dtable: Table;
  cols: Column[];
  _selectedColumns: Column[];
  public cabeceraElejida: Cabecera;
  public selectedCabeceras: Cabecera[] = [];
  sucursal: SelectItem[];
  option2: SelectItem[];
  option3: SelectItem[];
  option4: SelectItem[];
  selectedSucursal: any;
  public cabeceras: any;
  public clientes: Cliente[];
  totalSaldosSeleccionados: number = 0;
  totalesSeleccionados: number = 0;
  dateRange: Date[];
 /*  dateRange: Date[];
  filters: any = {}; // Variable para controlar los filtros */
  private destroy$ = new Subject<void>();

  constructor(public dialogService: DialogService, private filterService: FilterService, private _crud: CrudService, private activatedRoute: ActivatedRoute, private _cargardata: CargardataService, private _router: Router) {
    this.cols = [
      { field: 'tipo', header: 'Tipo' },
      { field: 'letra', header: 'Letra' },
      { field: 'numero_fac', header: 'N° Factura' },
      { field: 'nombrecliente', header: 'Cliente' },
      { field: 'emitido', header: 'Emitido' },
      { field: 'vencimiento', header: 'Vencimiento' },
      { field: 'tarjeta', header: 'Tipo Pago' },
      { field: 'basico', header: 'Basico' },
      { field: 'iva1', header: 'IVA' },
      { field: 'total', header: 'Total' },
      { field: 'bonifica', header: 'Bonifica' },
      { field: 'interes', header: 'Interes' },
      { field: 'saldo', header: 'Saldo' }
    ];
    this._selectedColumns = this.cols;
    this.getClientes();
    this.sucursal = [];
    this.loadSucursales();
  }
  ngOnInit(): void {
    console.log(this.sucursal);
    this.filterService.register('dateRange', (value: any, filter: Date[]): boolean => {
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
    });
  }
  
  loadSucursales(): void {
    this._crud.getListSnap('sucursales').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      data => {
        this.sucursal = data.map(item => {
          const payload = item.payload.val() as any;
          return {
            label: payload.nombre,
            value: payload.value
          };
        });
      },
      error => {
        console.error('Error al cargar sucursales:', error);
        this.showNotification('Error al cargar las sucursales');
      }
    );
  }
  onDateSelect() {
    if (this.dateRange && this.dateRange.length === 2) {
      this.dtable.filter(this.dateRange, 'emitido', 'dateRange');
    } else {
      this.dtable.filter(null, 'emitido', 'dateRange');
    }
  }
  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }
  set selectedColumns(val: Column[]) {
    // Restore original order
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }
  showPedidosDialog(sucursal: string, comprobante: string) {
    this.dialogService.open(PedidosComponent, {
      data: {
        cod_sucursal: sucursal,
        comprobante: comprobante
      },
      header: 'Pedidos',
      width: '70%'
    });
  }
  
  showRecibosDialog(sucursal: string, comprobante: string) {
    this.dialogService.open(RecibosComponent, {
      data: {
        cod_sucursal: sucursal,
        comprobante: comprobante
      },
      header: 'Recibos',
      width: '70%'
    });
  }
  getClientes() {
    //let sucursal: string = sessionStorage.getItem('sucursal');
    let sucursal: string = sessionStorage.getItem('sucursal');
    if (!sucursal) {
    console.error('Sucursal no encontrada en sessionStorage');
    // Mostrar notificación al usuario
    this.showNotification('Sucursal no encontrada. Por favor, inténtalo nuevamente.');
    return;
  }
    this._cargardata.clisucx(sucursal).pipe(
      take(1),
      catchError(err => {
        console.error('Error al obtener clientes:', err); // Registra el error
        // Muestra un mensaje al usuario
        // Puedes usar una librería como SweetAlert2 o un componente personalizado 
        // para una mejor experiencia.
        this.showNotification('Hubo un error al obtener los clientes. Por favor, inténtalo nuevamente.'); 
        return of([]); // Devuelve un array vacío para evitar errores en la asignación
      })
    ).subscribe((resp: any) => {
      if (resp && resp.mensaje) {
        this.clientes = resp.mensaje;
      } else {
        console.error('Respuesta inesperada al obtener clientes:', resp);
        this.showNotification('Hubo un error al procesar la respuesta de los clientes.');
      }
    });
  }
/*   getClientes() {
    let sucursal: string = sessionStorage.getItem('sucursal');
    this._cargardata.clisucx(sucursal).pipe(take(1)).subscribe((resp: any) => {
      console.log(resp);
      this.clientes = resp.mensaje;
    }, (err) => { console.log(err); });
  } */

  integrarNombreClienteaCabecera() {
    // Iterar sobre this.cabeceras y agregar el campo nombre
    this.cabeceras.forEach(cabecera => {
      const cliente = this.clientes.find(cli => cli.idcli === cabecera.cliente);
      console.log(cliente);
      if (cliente) {
        cabecera.nombrecliente = cliente.nombre;
      }
    });
  }

  
  onSucursalChange(event: any) {
    this.selectedSucursal = event.value;
    console.log(this.selectedSucursal);
    this._cargardata.cabecerasucNombreTarj(this.selectedSucursal).subscribe((data: any) => {
     /*  console.log(data);
      this.cabeceras = data.mensaje; */
      console.log(data.mensaje);
      this.cabeceras = data.mensaje.map(cabecera => ({
        ...cabecera,
        total: parseInt(cabecera.basico) + parseInt(cabecera.iva1), // Calcula el campo total
        //emitido: new Date(cabecera.emitido) // Convierte a Date
      }));
      this.integrarNombreClienteaCabecera();
  
    });
  }
  onSelectionChange(event: any) {
    console.log(event);
    this.calcularTotalSaldosSeleccionados();
    this.calcularTotalesSeleccionados();
  }
  consultaRecibo() {
    this.showRecibosDialog(this.selectedSucursal, this.selectedCabeceras[0].anumero_com.toString());
  }
  consultaPedidos() {
   
    this.showPedidosDialog(this.selectedSucursal, this.selectedCabeceras[0].numero_int.toString());
  }
  calcularTotalSaldosSeleccionados() {
    console.log(this.selectedCabeceras);
    this.totalSaldosSeleccionados = this.selectedCabeceras
      .reduce((sum, cabecera) => sum + Number(cabecera.saldo), 0); // Suma los saldos
  }
  calcularTotalesSeleccionados() {
    console.log(this.selectedCabeceras);
    this.totalesSeleccionados = this.selectedCabeceras
      .reduce((sum, cabecera:any) => sum + cabecera.total, 0); // Suma los saldos
  }
  showNotification(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Aceptar'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
