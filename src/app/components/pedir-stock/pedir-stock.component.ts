import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { StockPaginadosService } from '../../services/stock-paginados.service';
import { Producto } from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FilterPipe } from 'src/app/pipes/filter.pipe';
import { filter, takeUntil } from 'rxjs/operators';
import { first, take } from 'rxjs/operators';
import { Subject, forkJoin } from 'rxjs';
//importar componente calculoproducto
//import { CalculoproductoComponent } from '../calculoproducto/calculoproducto.component';
import { StockproductopedidoComponent } from '../stockproductopedido/stockproductopedido.component'; 
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChangeDetectorRef } from '@angular/core';

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
  
  // Propiedades para paginación (igual que artículos)
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  public terminoBusqueda = '';
  
  // Datos adicionales
  public valoresCambio: any[] = [];
  public tiposMoneda: any[] = [];
  public confLista: any[] = [];

  public tarjetaFlag: boolean = false;
  public chequeFlag: boolean = false;
  public previousUrl: string = "";
  filteredTipo: any[] = [];
  
  private destroy$ = new Subject<void>();
  constructor(
    public dialogService: DialogService, 
    private cdr: ChangeDetectorRef, 
    private router: Router, 
    private activatedRoute: ActivatedRoute, 
    private _cargardata: CargardataService,
    private stockPaginadosService: StockPaginadosService
  ) {
    this.initializeComponent();
  }
 

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.ref) {
      this.ref.close();
    }
  }

  ngOnInit() {
    this.setupSubscriptions();
    this.cargarDatosIniciales();
  }

  // Inicializar componente
  private initializeComponent(): void {
    this.productos = [];
    this.searchText = '';
  }

  // Configurar suscripciones (igual que artículos)
  private setupSubscriptions(): void {
    // Suscribirse a productos
    this.stockPaginadosService.productos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(productos => {
        this.productos = productos;
        this.cdr.detectChanges();
      });

    // Suscribirse a estado de carga
    this.stockPaginadosService.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cargando => {
        this.cargandoProductos = cargando;
      });

    // Suscribirse a paginación
    this.stockPaginadosService.paginaActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pagina => {
        this.paginaActual = pagina;
      });

    this.stockPaginadosService.totalPaginas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(total => {
        this.totalPaginas = total;
      });

    this.stockPaginadosService.totalItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(total => {
        this.totalItems = total;
      });

    this.stockPaginadosService.terminoBusqueda$
      .pipe(takeUntil(this.destroy$))
      .subscribe(termino => {
        this.terminoBusqueda = termino;
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

  // Métodos de paginación sobrescritos para búsqueda local
  irAPagina(pagina: number) {
    if (this.terminoBusqueda && this.productosFiltrados.length > 0) {
      // Si estamos en modo búsqueda, paginar localmente
      if (pagina >= 1 && pagina <= this.totalPaginas) {
        this.paginaActual = pagina;
        this.paginarResultadosLocales();
      }
    } else {
      // Si no estamos en modo búsqueda, usar el servicio de paginación
      this.stockPaginadosService.irAPagina(pagina);
    }
  }
  
  paginaSiguiente() {
    if (this.terminoBusqueda && this.productosFiltrados.length > 0) {
      // Si estamos en modo búsqueda, paginar localmente
      if (this.paginaActual < this.totalPaginas) {
        this.paginaActual++;
        this.paginarResultadosLocales();
      }
    } else {
      // Si no estamos en modo búsqueda, usar el servicio de paginación
      this.stockPaginadosService.paginaSiguiente();
    }
  }
  
  paginaAnterior() {
    if (this.terminoBusqueda && this.productosFiltrados.length > 0) {
      // Si estamos en modo búsqueda, paginar localmente
      if (this.paginaActual > 1) {
        this.paginaActual--;
        this.paginarResultadosLocales();
      }
    } else {
      // Si no estamos en modo búsqueda, usar el servicio de paginación
      this.stockPaginadosService.paginaAnterior();
    }
  }

  // Variables para la búsqueda a nivel de cliente (igual que artículos)
  productosCompletos: any[] = [];
  productosFiltrados: any[] = [];

  // Buscar productos
  buscar() {
    if (!this.terminoBusqueda.trim()) {
      this.limpiarBusqueda();
      return;
    }
    
    // Si no tenemos todos los productos cargados, los cargamos primero
    if (this.productosCompletos.length === 0) {
      this.mostrarLoading();
      
      // Cargar todos los productos una sola vez
      this._cargardata.artsucursal().subscribe({
        next: (response: any) => {
          console.log('Respuesta de artsucursal para pedir stock:', response);
          
          // Verificar si la respuesta tiene el formato esperado
          let productos = [];
          
          if (response && Array.isArray(response)) {
            // Es un array directo
            productos = response;
          } else if (response && response.mensaje && Array.isArray(response.mensaje)) {
            // Tiene formato { mensaje: [...] }
            productos = response.mensaje;
          } else if (response && !response.error && response.mensaje) {
            // Otro formato posible
            productos = response.mensaje;
          }
          
          console.log('Productos extraídos para búsqueda:', productos.length);
          
          if (productos && productos.length > 0) {
            // Guardar la lista completa
            this.productosCompletos = [...productos];
            
            // Realizar la búsqueda local
            this.buscarLocal();
            
            Swal.close();
          } else {
            Swal.close();
            console.warn('No se obtuvieron productos o respuesta vacía');
            Swal.fire({
              title: 'Advertencia',
              text: 'No se pudieron cargar productos para buscar',
              icon: 'warning',
              confirmButtonText: 'Aceptar'
            });
          }
        },
        error: (error) => {
          Swal.close();
          console.error('Error al cargar productos:', error);
          Swal.fire({
            title: 'Error',
            text: 'Error al cargar productos para buscar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    } else {
      // Ya tenemos los productos, solo realizamos la búsqueda local
      this.buscarLocal();
    }
  }
  
  // Buscar productos (para compatibilidad con el HTML existente)
  public buscarProductos(termino: string): void {
    this.terminoBusqueda = termino;
    this.buscar();
  }
  
  // Realizar búsqueda local
  buscarLocal() {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    console.log('Buscando el término en pedir stock:', termino);
    console.log('En total productos para pedir stock:', this.productosCompletos.length);
    
    // Filtrar productos localmente
    this.productosFiltrados = this.productosCompletos.filter(producto => {
      // Primero verificamos si el producto tiene los campos necesarios
      if (!producto) return false;
      
      // Asegurar que todos los campos se conviertan a string para búsqueda segura
      const nombreArt = producto.nomart ? producto.nomart.toString().toLowerCase() : '';
      const marca = producto.marca ? producto.marca.toString().toLowerCase() : '';
      const codigo = producto.cd_articulo ? producto.cd_articulo.toString().toLowerCase() : '';
      const codigoBarra = producto.cd_barra ? producto.cd_barra.toString().toLowerCase() : '';
      const rubro = producto.rubro ? producto.rubro.toString().toLowerCase() : '';
      
      // Devolver true si alguno de los campos contiene el término de búsqueda
      return (
        nombreArt.includes(termino) || 
        marca.includes(termino) || 
        codigo.includes(termino) || 
        codigoBarra.includes(termino) || 
        rubro.includes(termino)
      );
    });
    
    console.log('Productos filtrados encontrados en pedir stock:', this.productosFiltrados.length);
    
    // Actualizar contadores de paginación para la UI
    this.totalItems = this.productosFiltrados.length;
    this.totalPaginas = Math.ceil(this.totalItems / 50); // 50 ítems por página por defecto
    this.paginaActual = 1;
    
    // Aplicar paginación a los resultados
    this.paginarResultadosLocales();
    
    // Si no hay resultados, mostrar un mensaje amigable
    if (this.productos.length === 0) {
      Swal.fire({
        title: 'Sin resultados',
        text: `No se encontraron productos que coincidan con "${this.terminoBusqueda}"`,
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
    }
  }
  
  // Paginar resultados localmente
  paginarResultadosLocales() {
    const inicio = (this.paginaActual - 1) * 50; // 50 ítems por página por defecto
    const fin = inicio + 50;
    
    // Obtener los productos para la página actual
    this.productos = this.productosFiltrados.slice(inicio, fin);
  }
  
  // Limpiar búsqueda
  public limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.productosFiltrados = [];
    
    // Volver a cargar la primera página desde el servicio
    this.stockPaginadosService.cargarPagina(1).subscribe();
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
      header: 'Producto',
      width: '70%',
      data:
      {
        producto: producto,
        //cliente: this.clienteFrompuntoVenta,
       // tarjeta: this.tarjeta,
        //cheque: this.cheque,
        //tipoVal: this.tipoVal,
        //codTarj: this.codTarj,
        //listaPrecio: this.listaPrecio,
      },
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true
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
}
