import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { StockPaginadosService } from '../../services/stock-paginados.service';
import { Producto } from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChangeDetectorRef } from '@angular/core';
import { LazyLoadEvent } from 'primeng/api';
import { Subject, forkJoin, Subscription } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, tap, takeUntil } from 'rxjs/operators';
import { StockproductoofertaComponent } from '../stockproductooferta/stockproductooferta.component';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-ofrecer-stock',
  templateUrl: './ofrecer-stock.component.html',
  styleUrls: ['./ofrecer-stock.component.css'],
  providers: [DialogService]
})
export class OfrecerStockComponent implements OnInit, OnDestroy {
  public productos: Producto[];
  public cargandoProductos: boolean = false;
  ref: DynamicDialogRef | undefined;

  // Propiedades para paginación
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  public terminoBusqueda = '';
  public loading = false;

  // Propiedades para lazy loading
  public first: number = 0;
  public rows: number = 50;
  public sortField: string | undefined;
  public sortOrder: number = 1;
  public filters: any = {};
  public totalRegistros: number = 0;

  // Configuración de columnas
  cols: Column[];
  _selectedColumns: Column[];

  // Datos adicionales
  public valoresCambio: any[] = [];
  public tiposMoneda: any[] = [];
  public confLista: any[] = [];

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    public dialogService: DialogService,
    private cdr: ChangeDetectorRef,
    private _cargardata: CargardataService,
    private stockPaginadosService: StockPaginadosService
  ) {
    this.initializeComponent();

    // Definir todas las columnas disponibles
    this.cols = [
      { field: 'nomart', header: 'Nombre' },
      { field: 'marca', header: 'Marca' },
      { field: 'precon', header: 'Precio 0' },
      { field: 'prefi1', header: 'Precio 1' },
      { field: 'prefi2', header: 'Precio 2' },
      { field: 'prefi3', header: 'Precio 3' },
      { field: 'prefi4', header: 'Precio 4' },
      { field: 'exi1', header: 'Stock Dep' },
      { field: 'exi2', header: 'Stock CC' },
      { field: 'exi3', header: 'Stock VV' },
      { field: 'exi4', header: 'Stock GM' },
      { field: 'exi5', header: 'Stock MAY' },
      { field: 'cd_articulo', header: 'Código' },
      { field: 'cd_barra', header: 'Código Barra' },
      { field: 'rubro', header: 'Rubro' },
      { field: 'estado', header: 'Estado' },
      { field: 'cod_deposito', header: 'Cód. Depósito' },
    ];

    // Columnas seleccionadas por defecto (enfoque en stock)
    this._selectedColumns = [
      this.cols[0], // nomart
      this.cols[1], // marca
      this.cols[7], // exi1 (Stock Dep)
      this.cols[8], // exi2 (Stock CC)
      this.cols[9], // exi3 (Stock VV)
      this.cols[10], // exi4 (Stock GM)
      this.cols[11], // exi5 (Stock MAY)
      this.cols[16], // cod_deposito
    ];
  }

  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }

  set selectedColumns(val: Column[]) {
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();

    if (this.ref) {
      this.ref.close();
    }
  }

  ngOnInit() {
    console.log('OfrecerStockComponent inicializado');

    this.restoreTableState();
    this.setupSubscriptions();
    this.cargarDatosIniciales();

    setTimeout(() => {
      if (this.productos.length === 0 && !this.loading) {
        console.log('Cargando primera página manualmente como respaldo');
        this.loadDataLazy({
          first: this.first,
          rows: this.rows,
          sortField: this.sortField,
          sortOrder: this.sortOrder,
          filters: this.filters
        });
      }
    }, 1000);
  }

  private initializeComponent(): void {
    this.productos = [];
  }

  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.stockPaginadosService.productos$.subscribe(productos => {
        this.productos = productos;
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.stockPaginadosService.cargando$.subscribe(cargando => {
        this.cargandoProductos = cargando;
        this.loading = cargando;
      })
    );

    this.subscriptions.push(
      this.stockPaginadosService.paginaActual$.subscribe(pagina => {
        this.paginaActual = pagina;
      })
    );

    this.subscriptions.push(
      this.stockPaginadosService.totalPaginas$.subscribe(total => {
        this.totalPaginas = total;
      })
    );

    this.subscriptions.push(
      this.stockPaginadosService.totalItems$.subscribe(total => {
        this.totalItems = total;
        this.totalRegistros = total;
      })
    );

    this.subscriptions.push(
      this.stockPaginadosService.terminoBusqueda$.subscribe(termino => {
        this.terminoBusqueda = termino;
      })
    );

    // Configurar búsqueda con debounce
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(termino => {
          this.terminoBusqueda = termino;
          this.cargandoProductos = true;
        }),
        switchMap(termino => {
          if (!termino || termino.trim() === '') {
            return this.stockPaginadosService.cargarPagina(1);
          }
          return this.stockPaginadosService.buscarProductos(termino, 1);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.cargandoProductos = false;
        },
        error: (error) => {
          console.error('Error en búsqueda:', error);
          this.cargandoProductos = false;
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los productos',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
  }

  private cargarDatosIniciales(): void {
    forkJoin({
      valoresCambio: this.stockPaginadosService.getValoresCambio(),
      tiposMoneda: this.stockPaginadosService.getTiposMoneda(),
      confLista: this.stockPaginadosService.getConfLista()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        if (data.valoresCambio && !data.valoresCambio['error']) {
          this.valoresCambio = data.valoresCambio['mensaje'];
        }
        if (data.tiposMoneda && !data.tiposMoneda['error']) {
          this.tiposMoneda = data.tiposMoneda['mensaje'];
        }
        if (data.confLista && !data.confLista['error']) {
          this.confLista = data.confLista['mensaje'];
        }
        console.log('Ofrecer Stock: Datos adicionales cargados');
      },
      error: (error) => {
        console.error('Ofrecer Stock: Error al cargar datos:', error);
      }
    });

    this.stockPaginadosService.cargarPagina(1).subscribe(
      () => {},
      error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los productos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  selectProducto(producto) {
    this.ref = this.dialogService.open(StockproductoofertaComponent, {
      header: 'Ofrecer Stock - ' + producto.nomart,
      width: '80%',
      style: {
        'max-width': '900px'
      },
      data: {
        producto: producto
      },
      contentStyle: {
        overflow: 'auto',
        padding: '0',
        borderRadius: '8px'
      },
      baseZIndex: 10000,
      maximizable: true,
      closeOnEscape: true,
      dismissableMask: true
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const productosParaExportar = this.productos;
      const worksheet = xlsx.utils.json_to_sheet(productosParaExportar);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'ofrecer_stock_products');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  async loadDataLazy(event: LazyLoadEvent): Promise<void> {
    console.log('🔄 loadDataLazy - Evento recibido:', event);

    this.first = event.first || 0;
    this.rows = event.rows || 50;
    this.sortField = event.sortField;
    this.sortOrder = event.sortOrder || 1;
    this.filters = event.filters || {};

    this.saveTableState();

    const page = Math.floor(this.first / this.rows) + 1;

    console.log(`📄 Cargando página ${page}, first: ${this.first}, rows: ${this.rows}`);

    try {
      await this.loadServerData(page);
    } catch (error) {
      console.error('❌ Error en loadDataLazy:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al cargar datos: ' + (error.message || error),
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  private async loadServerData(page: number): Promise<void> {
    try {
      console.log(`🌐 Cargando página ${page} del servidor...`);

      const response = await this.stockPaginadosService.cargarPaginaConFiltros(
        page,
        this.rows,
        this.sortField,
        this.sortOrder,
        this.filters
      ).toPromise();

      console.log('✅ Respuesta recibida:', response);

      if (response && !response.error) {
        console.log(`✅ Datos cargados exitosamente`);
      } else {
        console.warn('⚠️ Respuesta con error o vacía:', response);
      }

    } catch (error) {
      console.error('❌ Error cargando datos del servidor:', error);
      throw error;
    }
  }

  isColumnVisible(field: string): boolean {
    return this._selectedColumns.some(col => col.field === field);
  }

  onColumnSelectionChange(): void {
    this.saveTableState();
    console.log('Columnas seleccionadas actualizadas:', this._selectedColumns);
  }

  getColumnCount(): number {
    return this._selectedColumns.length + 1;
  }

  private saveTableState(): void {
    try {
      const state = {
        first: this.first,
        rows: this.rows,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        filters: this.filters,
        selectedColumns: this._selectedColumns,
        timestamp: Date.now()
      };

      sessionStorage.setItem('ofrecer_stock_table_state', JSON.stringify(state));
      console.log('💾 Estado de tabla guardado:', state);
    } catch (error) {
      console.warn('Error guardando estado de la tabla:', error);
    }
  }

  private restoreTableState(): void {
    try {
      const savedState = sessionStorage.getItem('ofrecer_stock_table_state');

      if (savedState) {
        const state = JSON.parse(savedState);

        const isValidState = state.timestamp && (Date.now() - state.timestamp) < (2 * 60 * 60 * 1000);

        if (isValidState) {
          console.log('🔄 Restaurando estado de filtros y paginación:', state);

          this.first = state.first || 0;
          this.rows = state.rows || 50;
          this.sortField = state.sortField;
          this.sortOrder = state.sortOrder || 1;
          this.filters = state.filters || {};

          if (state.selectedColumns && Array.isArray(state.selectedColumns)) {
            this._selectedColumns = state.selectedColumns;
          }
        } else {
          console.log('⏰ Estado de tabla expirado, usando valores por defecto');
        }
      }
    } catch (error) {
      console.warn('Error restaurando estado de la tabla:', error);
    }
  }

  public limpiarEstadoTabla(): void {
    sessionStorage.removeItem('ofrecer_stock_table_state');
    this._selectedColumns = [
      this.cols[0], // nomart
      this.cols[1], // marca
      this.cols[7], // exi1
      this.cols[8], // exi2
      this.cols[9], // exi3
      this.cols[10], // exi4
      this.cols[11], // exi5
      this.cols[16], // cod_deposito
    ];
    console.log('✅ Estado de tabla limpiado, usando columnas por defecto');
  }
}
