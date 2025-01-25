import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { CalendarModule } from 'primeng/calendar';

interface Column {
    field: string;
    header: string;
}

@Component({
    selector: 'app-enviodestockrealizados',
    templateUrl: './enviodestockrealizados.component.html',
    styleUrls: ['./enviodestockrealizados.component.css'],
    providers: [FilterService, DialogService, CalendarModule]
})
export class EnviodestockrealizadosComponent implements OnInit {
    @ViewChild('dtable') dtable: Table;
    cols: Column[];
    _selectedColumns: Column[];
    public pedidoItemElejido: any;
    public selectedPedidoItem: any[] = [];
    sucursal: any;
    public pedidoItem: any[];
    totalSaldosSeleccionados: number = 0;
    totalesSeleccionados: number = 0;
    dateRange: Date[];


    constructor(public dialogService: DialogService, private filterService: FilterService, private _cargardata: CargardataService, private _router: Router) {
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
        this.sucursal = Number(localStorage.getItem('sucursal'));

    }
    ngOnInit(): void {
        console.log(this.sucursal);
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
        this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
          console.log(data);
          if (Array.isArray(data.mensaje)) {
            this.pedidoItem = data.mensaje.filter((item: any) => 
            item.estado.trim() === 'Enviado');
            console.log(this.pedidoItem);
          } else {
            console.error('Unexpected data format:', data);
           
          }
        });
      }

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
}
