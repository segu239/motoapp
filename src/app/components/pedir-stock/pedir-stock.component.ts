import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { StockPaginadosService } from '../../services/stock-paginados.service';
import { Producto } from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FilterPipe } from 'src/app/pipes/filter.pipe';
import { filter, takeUntil, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { first, take } from 'rxjs/operators';
import { Subject, forkJoin, of, Subscription } from 'rxjs';
import { StockproductopedidoComponent } from '../stockproductopedido/stockproductopedido.component'; 
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChangeDetectorRef } from '@angular/core';
import { LazyLoadEvent } from 'primeng/api';

// Definir la interfaz Column para la selección de columnas
interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-pedir-stock',
  templateUrl: './pedir-stock.component.html',
  styleUrls: ['./pedir-stock.component.css'],
  providers: [DialogService]
})
export class PedirStockComponent implements OnInit, OnDestroy {
  public tipoVal: string = 'Condicion de Venta';
  public codTarj: string = '';
  public listaPrecio: string = '';
  public activaDatos: number;
  public tipo: any[] = [];
  searchText: string;
  ref: DynamicDialogRef | undefined;
  public prefi0: boolean = false;
  public prefi1: boolean = false;
  public prefi2: boolean = false;
  public prefi3: boolean = false;
  public prefi4: boolean = false;

  public productos: Producto[];
  public productoElejido: Producto;
  public cargandoProductos: boolean = false;
  
  // Propiedades para paginación tradicional (compatibilidad)
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  public terminoBusqueda = '';
  public loading = false;
  
  // NUEVO: Propiedades para lazy loading
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

  public tarjetaFlag: boolean = false;
  public chequeFlag: boolean = false;
  public previousUrl: string = "";
  filteredTipo: any[] = [];
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private subscriptions: Subscription[] = [];
  
  constructor(
    public dialogService: DialogService, 
    private cdr: ChangeDetectorRef, 
    private router: Router, 
    private activatedRoute: ActivatedRoute, 
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
    
    // Definir las columnas seleccionadas por defecto (enfoque en stock)
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
 

  // Getters y setters para las columnas seleccionadas
  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }
  
  set selectedColumns(val: Column[]) {
    // Restaurar orden original
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }

  ngOnDestroy() {
    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.ref) {
      this.ref.close();
    }
  }

  ngOnInit() {
    console.log('PedirStockComponent inicializado');
    
    // NUEVO: Restaurar estado de tabla al inicializar
    this.restoreTableState();
    
    this.setupSubscriptions();
    this.cargarDatosIniciales();
    
    // NUEVO: Cargar primera página como respaldo si lazy loading no se activa
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

  // Inicializar componente
  private initializeComponent(): void {
    this.productos = [];
    this.searchText = '';
  }

  // Configurar suscripciones (siguiendo patrón de artículos)
  private setupSubscriptions(): void {
    // Suscribirse a productos
    this.subscriptions.push(
      this.stockPaginadosService.productos$.subscribe(productos => {
        this.productos = productos;
        this.cdr.detectChanges();
      })
    );

    // Suscribirse a estado de carga
    this.subscriptions.push(
      this.stockPaginadosService.cargando$.subscribe(cargando => {
        this.cargandoProductos = cargando;
        this.loading = cargando;
      })
    );

    // Suscribirse a paginación
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
        this.totalRegistros = total; // Para lazy loading
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
        debounceTime(300), // Esperar 300ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Ignorar si el valor no cambió
        tap(termino => {
          this.terminoBusqueda = termino;
          this.cargandoProductos = true;
        }),
        switchMap(termino => {
          // Si no hay término, cargar página normal
          if (!termino || termino.trim() === '') {
            return this.stockPaginadosService.cargarPagina(1);
          }
          // Si hay término, buscar en backend
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

  // Cargar datos iniciales (igual que artículos)
  private cargarDatosIniciales(): void {
    // Cargar datos adicionales
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
        console.log('Pedir Stock: Datos adicionales cargados');
      },
      error: (error) => {
        console.error('Pedir Stock: Error al cargar datos:', error);
      }
    });

    // Cargar primera página de productos
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

  // OBSOLETO: Métodos de paginación manual (reemplazados por lazy loading PrimeNG)
  irAPagina(pagina: number) {
    console.log('irAPagina: Método obsoleto, PrimeNG maneja paginación automáticamente');
  }
  
  paginaSiguiente() {
    console.log('paginaSiguiente: Método obsoleto, PrimeNG maneja paginación automáticamente');
  }
  
  paginaAnterior() {
    console.log('paginaAnterior: Método obsoleto, PrimeNG maneja paginación automáticamente');
  }

  // OBSOLETO: Método para manejar búsqueda desde el input (reemplazado por filtros PrimeNG)
  public onSearchInput(value: string): void {
    console.log('onSearchInput: Método obsoleto, usar filtros PrimeNG');
  }

  // OBSOLETO: Buscar productos (reemplazado por filtros PrimeNG)
  public buscarProductos(termino: string): void {
    console.log('buscarProductos: Método obsoleto, usar filtros PrimeNG');
  }
  
  // OBSOLETO: Limpiar búsqueda (reemplazado por filtros PrimeNG)
  public limpiarBusqueda(): void {
    console.log('limpiarBusqueda: Método obsoleto, usar clear en filtros PrimeNG');
  }
  
  // Método para mostrar el indicador de carga
  mostrarLoading() {
    Swal.fire({
      title: 'Cargando datos',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  // Obtener números de página visibles en la paginación
  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    const numerosPaginasVisibles = 10;
    const paginasACadaLado = Math.floor(numerosPaginasVisibles / 2);
    
    let inicio = Math.max(1, this.paginaActual - paginasACadaLado);
    let fin = Math.min(this.totalPaginas, inicio + numerosPaginasVisibles - 1);
    
    // Ajustar inicio si fin está al límite
    if (fin === this.totalPaginas) {
      inicio = Math.max(1, fin - numerosPaginasVisibles + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  selectTipo(item: any) {
    console.log(item);
    //esto son datos de la tabla tarjcredito
    this.tipoVal = item.tarjeta; // Almacena el centro seleccionado
    this.codTarj = item.cod_tarj;
    this.listaPrecio = item.listaprecio;
    this.activaDatos = item.activadatos;
    this.listaPrecioF(); // aca se llama a la funcion que muestra los prefijos

    // Los productos ya están paginados en memoria
    console.log('Pedir Stock: Tipo seleccionado, productos disponibles');
  }
  abrirFormularioTarj() {
   /*  Swal.fire({
      title: 'Ingrese los datos de la tarjeta',
      html: `<input type="text" id="titular" class="swal2-input" placeholder="Titular">
           <input type="number" id="dni" class="swal2-input" placeholder="DNI">
           <input type="number" id="numero" class="swal2-input" placeholder="Número Tarjeta">
           <input type="number" id="autorizacion" class="swal2-input" placeholder="Autorización">`,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const titular = (<HTMLInputElement>document.getElementById('titular')).value;
        const dni = (<HTMLInputElement>document.getElementById('dni')).value;
        const numero = (<HTMLInputElement>document.getElementById('numero')).value;
        const autorizacion = (<HTMLInputElement>document.getElementById('autorizacion')).value;
        if (!titular || !dni || !numero || !autorizacion) {
          Swal.showValidationMessage(`Por favor rellene todos los campos`);
          //return;
        }
        let reNumero = new RegExp("^[0-9]{16}$");
        let reDni = new RegExp("^[0-9]{8}$");
        let reTitular = new RegExp("^[a-zA-Z ]{1,40}$");
        let reAutorizacion = new RegExp("^[0-9]{3}$");
        if (!reNumero.test(numero)) {
          Swal.showValidationMessage(`El número de la tarjeta no es válido`);
          //return;
        }
        if (!reDni.test(dni)) {
          Swal.showValidationMessage(`El DNI no es válido`);
          //return;
        }
        if (!reTitular.test(titular)) {
          Swal.showValidationMessage(`El titular no es válido`);
          //return;
        }
        if (!reAutorizacion.test(autorizacion)) {
          Swal.showValidationMessage(`La autorización no es válida`);
          //return;
        }
        return { titular, dni, numero, autorizacion }
      }
    }).then((result) => {
      if (result.value) {
        this.tarjeta.Titular = result.value.titular;
        this.tarjeta.Dni = result.value.dni;
        this.tarjeta.Numero = result.value.numero;
        this.tarjeta.Autorizacion = result.value.autorizacion;
        console.log('Tarjeta guardada:', this.tarjeta);
        this._cargardata.artsucursal().pipe(take(1)).subscribe((resp: any) => {
          console.log(resp.mensaje);
          this.productos = [...resp.mensaje];
          // Forzar la detección de cambios
          this.cdr.detectChanges();
        });
      }
    }); */
  }

  /* abrirFormularioCheque() {
    Swal.fire({
      title: 'Ingrese los datos del Cheque',
      html:
        `<input type="text" id="banco" class="swal2-input" placeholder="Banco">
       <input type="number" id="ncuenta" class="swal2-input" placeholder="N° Cuenta">
       <input type="number" id="ncheque" class="swal2-input" placeholder="N° Cheque">
       <input type="text" id="nombre" class="swal2-input" placeholder="Nombre">
       <input type="text" id="plaza" class="swal2-input" placeholder="Plaza">
       <input type="number" id="importeimputar" class="swal2-input" placeholder="Importe a Imputar">
       <input type="number" id="importecheque" class="swal2-input" placeholder="Importe del Cheque">
       <input type="text" id="fechacheque" class="swal2-input" placeholder="Fecha del Cheque">`,
      didOpen: () => {
        // Cambiar el tipo de input a 'date' para activar el datepicker nativo
        document.getElementById('fechacheque').setAttribute('type', 'date');
      },
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const banco = (<HTMLInputElement>document.getElementById('banco')).value;
        const ncuenta = (<HTMLInputElement>document.getElementById('ncuenta')).value;
        const ncheque = (<HTMLInputElement>document.getElementById('ncheque')).value;
        const nombre = (<HTMLInputElement>document.getElementById('nombre')).value;
        const plaza = (<HTMLInputElement>document.getElementById('plaza')).value;
        const importeimputar = (<HTMLInputElement>document.getElementById('importeimputar')).value;
        const importecheque = (<HTMLInputElement>document.getElementById('importecheque')).value;
        const fechacheque = (<HTMLInputElement>document.getElementById('fechacheque')).value;
        if (!banco || !ncuenta || !ncheque || !nombre || !plaza || !importeimputar || !importecheque || !fechacheque) {
          Swal.showValidationMessage(`Por favor rellene todos los campos`);
          //return;
        }
        let reBanco = new RegExp("^[a-zA-Z ]{1,40}$");
        let reNcuenta = new RegExp("^[0-9]{1,40}$");
        let reNcheque = new RegExp("^[0-9]{1,40}$");
        let reNombre = new RegExp("^[a-zA-Z ]{1,40}$");
        let rePlaza = new RegExp("^[a-zA-Z ]{1,40}$");
        let reImporteImputar = new RegExp("^[0-9]{1,40}$");
        let reImporteCheque = new RegExp("^[0-9]{1,40}$");
        let reFechaCheque = new RegExp("^\\d{2}/\\d{2}/\\d{4}$");//("^[0-9]{1,40}$");

        if (!reBanco.test(banco)) {
          Swal.showValidationMessage(`El nombre del banco no es válido`);
          //return;
        }
        if (!reNcuenta.test(ncuenta)) {
          Swal.showValidationMessage(`El numero de cuenta no es válido`);
          //return;
        }
        if (!reNcheque.test(ncheque)) {
          Swal.showValidationMessage(`El numero de cheque no es válido`);
          //return;
        }
        if (!reNombre.test(nombre)) {
          Swal.showValidationMessage(`El nombre no es válido`);
          //return;
        }
        if (!rePlaza.test(plaza)) {
          Swal.showValidationMessage(`La plaza no es válida`);
          //return;
        }
        if (!reImporteImputar.test(importeimputar)) {
          Swal.showValidationMessage(`El importe a imputar no es válido`);
          //return;
        }
        if (!reImporteCheque.test(importecheque)) {
          Swal.showValidationMessage(`El importe del cheque no es válido`);
          //return;
        }
        return { banco, ncuenta, ncheque, nombre, plaza, importeimputar, importecheque, fechacheque }
      }
    }).then((result) => {
      if (result.value) {
        this.cheque.Banco = result.value.banco;
        this.cheque.Ncuenta = result.value.ncuenta;
        this.cheque.Ncheque = result.value.ncheque;
        this.cheque.Nombre = result.value.nombre;
        this.cheque.Plaza = result.value.plaza;
        this.cheque.ImporteImputar = result.value.importeimputar;
        this.cheque.ImporteCheque = result.value.importecheque;
        this.cheque.FechaCheque = result.value.fechacheque;
        console.log('Cheque guardado:', this.cheque);//console.log('Tarjeta guardada:', this.tarjeta);
        this._cargardata.artsucursal().pipe(take(1)).subscribe((resp: any) => {
          console.log(resp.mensaje);
          this.productos = [...resp.mensaje];
          this.cdr.detectChanges();
        });
      }
    });
  } */

  listaPrecioF() {
    if (this.listaPrecio == "0") {
      this.prefi0 = true;
      this.prefi1 = false;
      this.prefi2 = false;
      this.prefi3 = false;
      this.prefi4 = false;
    }
    else if (this.listaPrecio == "1") {
      this.prefi0 = false;
      this.prefi1 = true;
      this.prefi2 = false;
      this.prefi3 = false;
      this.prefi4 = false;
    }
    else if (this.listaPrecio == "2") {
      this.prefi0 = false;
      this.prefi1 = false;
      this.prefi2 = true;
      this.prefi3 = false;
      this.prefi4 = false;
    }
    else if (this.listaPrecio == "3") {
      this.prefi0 = false;
      this.prefi1 = false;
      this.prefi2 = false;
      this.prefi3 = true;
      this.prefi4 = false;
    }
    else if (this.listaPrecio == "4") {
      this.prefi0 = false;
      this.prefi1 = false;
      this.prefi2 = false;
      this.prefi3 = false;
      this.prefi4 = true;
    }
  }
  selectProducto(producto) {
    let datoscondicionventa: any =
    {
      producto: producto,
      //cliente: this.clienteFrompuntoVenta,
      //tarjeta: this.tarjeta,
      //cheque: this.cheque,
      tipoVal: this.tipoVal,
      codTarj: this.codTarj,
      listaPrecio: this.listaPrecio,
    };
    this.ref = this.dialogService.open(StockproductopedidoComponent, {
      header: 'Solicitud de Stock - ' + producto.nomart,
      width: '80%',
      style: { 
        'max-width': '900px' 
      },
      data: {
        producto: producto,
        //cliente: this.clienteFrompuntoVenta,
        // tarjeta: this.tarjeta,
        //cheque: this.cheque,
        //tipoVal: this.tipoVal,
        //codTarj: this.codTarj,
        //listaPrecio: this.listaPrecio,
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
      // Usar productos de la página actual
      const productosParaExportar = this.productos;
      const worksheet = xlsx.utils.json_to_sheet(productosParaExportar);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'pedir_stock_products');
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

  // NUEVO: Método para lazy loading con persistencia de estado (copiado de articulos)
  async loadDataLazy(event: LazyLoadEvent): Promise<void> {
    console.log('🔄 loadDataLazy - Evento recibido:', event);
    
    // Actualizar parámetros de paginación y filtros
    this.first = event.first || 0;
    this.rows = event.rows || 50;
    this.sortField = event.sortField;
    this.sortOrder = event.sortOrder || 1;
    this.filters = event.filters || {};
    
    // NUEVO: Guardar estado después de cada cambio
    this.saveTableState();
    
    // Calcular página basada en first
    const page = Math.floor(this.first / this.rows) + 1;
    
    console.log(`📄 Cargando página ${page}, first: ${this.first}, rows: ${this.rows}`);
    console.log('🔍 Filtros recibidos:', this.filters);
    console.log('📊 Ordenamiento:', this.sortField, this.sortOrder);
    
    try {
      // Cargar datos del servidor con los parámetros del lazy loading
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

  // NUEVO: Cargar datos del servidor con filtros y paginación (copiado de articulos)
  private async loadServerData(page: number): Promise<void> {
    try {
      console.log(`🌐 Cargando página ${page} del servidor...`);
      console.log('📋 Parámetros:', {
        page,
        rows: this.rows,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        filters: this.filters
      });
      
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
        // Los datos se actualizan automáticamente a través de las subscripciones
      } else {
        console.warn('⚠️ Respuesta con error o vacía:', response);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos del servidor:', error);
      throw error;
    }
  }

  // NUEVO: Método para verificar si una columna es visible (copiado de articulos)
  isColumnVisible(field: string): boolean {
    return this._selectedColumns.some(col => col.field === field);
  }

  // NUEVO: Método para manejar cambios en selección de columnas (copiado de articulos)
  onColumnSelectionChange(): void {
    // Guardar el estado cuando cambien las columnas seleccionadas
    this.saveTableState();
    console.log('Columnas seleccionadas actualizadas:', this._selectedColumns);
  }

  // NUEVO: Método para contar columnas visibles (para emptymessage)
  getColumnCount(): number {
    return this._selectedColumns.length + 1; // +1 para la columna de acciones
  }

  // NUEVO: Guardar estado de la tabla (copiado de articulos)
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

      sessionStorage.setItem('pedir_stock_table_state', JSON.stringify(state));
      console.log('💾 Estado de tabla guardado:', state);
    } catch (error) {
      console.warn('Error guardando estado de la tabla:', error);
    }
  }

  // NUEVO: Restaurar estado de la tabla (copiado de articulos)
  private restoreTableState(): void {
    try {
      const savedState = sessionStorage.getItem('pedir_stock_table_state');
      
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Verificar que el estado no sea muy viejo (2 horas máximo)
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

  // NUEVO: Método para limpiar estado guardado y usar defaults
  public limpiarEstadoTabla(): void {
    sessionStorage.removeItem('pedir_stock_table_state');
    // Resetear a valores por defecto
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
    console.log('✅ Estado de tabla limpiado, usando columnas por defecto con depósito');
  }
}
