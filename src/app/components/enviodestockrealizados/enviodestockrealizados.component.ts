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
    public totalGeneralPrecio: number = 0;  // ← RENOMBRADO (antes totalGeneralCosto)
    public totalGeneralCosto: number = 0;   // ← NUEVO (para precio de costo)

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
            { field: 'precio_convertido', header: 'Precio Unit.' },            // ← MODIFICADO: Ahora muestra precio convertido
            { field: 'precio_total_convertido', header: 'Precio Total' },      // ← MODIFICADO
            { field: 'precostosi_convertido', header: 'Precio Costo' },        // ← MODIFICADO: Ahora muestra precio costo convertido        // ← NUEVO
            { field: 'costo_total_convertido', header: 'Total Precio Costo' }, // ← MODIFICADO // ← NUEVO (reutiliza nombre)
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
            this.pedidoItem = data.mensaje.filter((item: any) => {
              const estado = item.estado.trim();
              // FIX 17-Nov-2025: 'Enviado' NO EXISTE en sistema V2
              // Mostrar envíos Aceptados (pendientes confirmación) y Recibidos (completados)
              return estado === 'Aceptado' || estado === 'Recibido';
            });

            // NUEVO: Procesar items de pedido
            this.procesarItemsPedido();

            console.log('EnvioStockRealizados - Items filtrados:', this.pedidoItem);
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

// ===========================================================================
// GETTERS ESPECÍFICOS PARA SELECCIÓN MÚLTIPLE
// ===========================================================================

/**
 * Obtiene el precio total (venta) de TODOS los items seleccionados
 * (selección múltiple con checkboxes)
 */
get precioTotalSeleccionados(): number {
  return this.totalizadoresService.calcularTotalSeleccionadosPorCampo(
    this.selectedPedidoItem,
    'precio_total_convertido'  // ← MODIFICADO
  );
}
/**
 * Obtiene el costo total de TODOS los items seleccionados
 * (selección múltiple con checkboxes)
 */
get costoTotalSeleccionados(): number {
  return this.totalizadoresService.calcularTotalSeleccionadosPorCampo(
    this.selectedPedidoItem,
    'costo_total_convertido'  // ← MODIFICADO
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
