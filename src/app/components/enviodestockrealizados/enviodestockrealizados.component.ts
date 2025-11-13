import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { CalendarModule } from 'primeng/calendar';
import { TotalizadoresService } from '../../services/totalizadores.service';

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

    // NUEVAS PROPIEDADES: Totalizadores
    public mostrarTotalizadores: boolean = true;
    public totalGeneralCosto: number = 0;

    constructor(
      public dialogService: DialogService,
      private filterService: FilterService,
      private _cargardata: CargardataService,
      private _router: Router,
      private totalizadoresService: TotalizadoresService // ← NUEVO
    ) {
        this.cols = [
            { field: 'tipo', header: 'Tipo' },
            { field: 'cantidad', header: 'Cantidad' },
            { field: 'precio', header: 'Precio Unit.' },
            { field: 'costo_total', header: 'Costo Total' },  // ← NUEVA COLUMNA
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

            // NUEVO: Calcular costos totales
            this.calcularCostosTotales();

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

/**
 * Calcula el costo total para cada item (cantidad * precio)
 * Se ejecuta después de cargar los datos
 */
private calcularCostosTotales(): void {
  try {
    if (!this.pedidoItem) {
      console.warn('pedidoItem es null o undefined');
      return;
    }

    if (!Array.isArray(this.pedidoItem)) {
      console.error('pedidoItem no es un array:', typeof this.pedidoItem);
      return;
    }

    this.pedidoItem.forEach((item, index) => {
      try {
        // FIX: Convertir strings a números (PostgreSQL retorna NUMERIC como string)
        let cantidad = item.cantidad;
        let precio = item.precio;

        // Convertir cantidad si es string
        if (typeof cantidad === 'string') {
          cantidad = parseFloat(cantidad.replace(',', '.'));
        }

        // Convertir precio si es string
        if (typeof precio === 'string') {
          precio = parseFloat(precio.replace(',', '.'));
        }

        // Validar que la conversión fue exitosa
        if (isNaN(cantidad)) {
          console.warn(`Item ${index}: cantidad no es un número válido:`, item.cantidad);
          cantidad = 0;
        }
        if (isNaN(precio)) {
          console.warn(`Item ${index}: precio no es un número válido:`, item.precio);
          precio = 0;
        }

        item.costo_total = this.totalizadoresService.calcularCostoItem(
          cantidad,
          precio
        );
      } catch (error) {
        console.error(`Error al calcular costo del item ${index}:`, error, item);
        item.costo_total = 0;
      }
    });

    this.actualizarTotalGeneral();

  } catch (error) {
    console.error('Error crítico en calcularCostosTotales:', error);
    this.totalGeneralCosto = 0;
  }
}

/**
 * Actualiza el total general de TODOS los items filtrados
 */
private actualizarTotalGeneral(): void {
  try {
    this.totalGeneralCosto = this.totalizadoresService.calcularTotalGeneral(
      this.pedidoItem
    );
  } catch (error) {
    console.error('Error al actualizar total general:', error);
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

// ===========================================================================
// GETTERS ESPECÍFICOS PARA SELECCIÓN MÚLTIPLE
// ===========================================================================

/**
 * Obtiene el costo total de TODOS los items seleccionados
 * (selección múltiple con checkboxes)
 */
get costoTotalSeleccionados(): number {
  return this.totalizadoresService.calcularTotalSeleccionados(
    this.selectedPedidoItem
  );
}

/**
 * Obtiene la cantidad de items seleccionados
 */
get cantidadItemsSeleccionados(): number {
  return this.totalizadoresService.obtenerCantidadSeleccionados(
    this.selectedPedidoItem
  );
}

/**
 * Obtiene el costo promedio de los items seleccionados
 */
get costoPromedioSeleccionados(): number {
  const stats = this.totalizadoresService.obtenerEstadisticasSeleccionados(
    this.selectedPedidoItem
  );
  return stats.promedio;
}

}
