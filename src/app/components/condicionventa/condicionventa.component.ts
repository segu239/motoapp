import { Component } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { Producto } from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FilterPipe } from 'src/app/pipes/filter.pipe';
import { filter } from 'rxjs/operators';
import { first, take } from 'rxjs/operators';
//importar componente calculoproducto
import { CalculoproductoComponent } from '../calculoproducto/calculoproducto.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChangeDetectorRef } from '@angular/core';

// Definir la interfaz Column para la selección de columnas
interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-condicionventa',
  templateUrl: './condicionventa.component.html',
  styleUrls: ['./condicionventa.component.css'],
  providers: [DialogService]
})
export class CondicionventaComponent {
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
  public tarjeta = {
    Titular: '',
    Dni: '',
    Numero: '',
    Autorizacion: ''
  };
  public cheque = {
    Banco: '',
    Ncuenta: '',
    Ncheque: '',
    Nombre: '',
    Plaza: '',
    ImporteImputar: '',
    ImporteCheque: '',
    FechaCheque: ''
  };
  public productos: Producto[];
  public productoElejido: Producto;
  public clienteFrompuntoVenta: any;
  public tarjetaFlag: boolean = false;
  public chequeFlag: boolean = false;
  public previousUrl: string = "";
  filteredTipo: any[] = [];
  
  // Nuevas propiedades para manejar los valores de cambio
  public valoresCambio: any[] = [];
  public tiposMoneda: any[] = [];

  // Añadir nuevas propiedades para la selección de columnas
  cols: Column[];
  _selectedColumns: Column[];

  constructor(public dialogService: DialogService, private cdr: ChangeDetectorRef, private router: Router, private activatedRoute: ActivatedRoute, private _cargardata: CargardataService) {
    this.clienteFrompuntoVenta = this.activatedRoute.snapshot.queryParamMap.get('cliente');
    this.clienteFrompuntoVenta = JSON.parse(this.clienteFrompuntoVenta);
    this._cargardata.tarjcredito().pipe(take(1)).subscribe((resp: any) => {
      this.tipo = resp.mensaje;//.tarjeta;
      console.log(this.tipo);
      this.filterByDay();
    });
    
    // Obtener los valores de cambio
    this._cargardata.getValorCambio().pipe(take(1)).subscribe((resp: any) => {
      this.valoresCambio = resp.mensaje;
      console.log('Valores de cambio:', this.valoresCambio);
    });
    
    // Obtener los tipos de moneda
    this._cargardata.getTipoMoneda().pipe(take(1)).subscribe((resp: any) => {
      this.tiposMoneda = resp.mensaje;
      console.log('Tipos de moneda:', this.tiposMoneda);
    });

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
      { field: 'exi5', header: 'Stock 5' },
      { field: 'cd_articulo', header: 'Código' },
      { field: 'cd_barra', header: 'Código Barra' },
      { field: 'rubro', header: 'Rubro' },
      { field: 'estado', header: 'Estado' },
    ];
    
    // Definir las columnas seleccionadas por defecto
    this._selectedColumns = [
      this.cols[0], // nomart
      this.cols[1], // marca
      this.cols[2], // precon
      this.cols[7], // exi1
      this.cols[8], // exi2
      this.cols[9], // exi3
      this.cols[10], // exi4
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

  filterByDay() {
    const dayOfWeek = new Date().getDay(); // Domingo - 0, Lunes - 1, ..., Sábado - 6
    const dayFieldMap = {
      0: 'd1', // Domingo
      1: 'd2', // Lunes
      2: 'd3', // Martes
      3: 'd4', // Miércoles
      4: 'd5', // Jueves
      5: 'd6', // Viernes
      6: 'd7'  // Sábado
    };
    const dayField = dayFieldMap[dayOfWeek];
    this.filteredTipo = this.tipo.filter(item => item[dayField] === '1');
  }

  ngOnDestroy() {
    if (this.ref) {
      this.ref.close();
    }
  }

  ngOnInit() {

  }

  selectTipo(item: any) {
    console.log(item);
    //esto son datos de la tabla tarjcredito
    this.tipoVal = item.tarjeta; // Almacena el centro seleccionado
    this.codTarj = item.cod_tarj;
    this.listaPrecio = item.listaprecio;
    this.activaDatos = item.activadatos;
    this.listaPrecioF(); // aca se llama a la funcion que muestra los prefijos
    if (this.activaDatos == 1) {
      this.abrirFormularioTarj();
      // aca se llama a la funcion que muestra los prefijos
    }
    else if (this.activaDatos == 2) {
      this.abrirFormularioCheque();
      // aca se llama a la funcion que muestra los prefijos
    }
    else {
      this._cargardata.artsucursal().pipe(take(1)).subscribe((resp: any) => {
        console.log(resp.mensaje);
        
        // Convertir a array y aplicar el cálculo de precios según tipo de moneda y valor de cambio
        let productos = [...resp.mensaje];
        
        // Procesar cada producto para ajustar el precio según su tipo de moneda
        productos.forEach(producto => {
          // Verificar si el producto tiene un tipo de moneda
          if (producto.tipo_moneda) {
            // Buscar el valor de cambio correspondiente al tipo de moneda
            const valorCambio = this.valoresCambio.find(vc => vc.codmone === producto.tipo_moneda);
            
            if (valorCambio && valorCambio.vcambio) {
              // Aplicar el multiplicador a todos los precios
              producto.precon = producto.precon * parseFloat(valorCambio.vcambio);
              producto.prefi1 = producto.prefi1 * parseFloat(valorCambio.vcambio);
              producto.prefi2 = producto.prefi2 * parseFloat(valorCambio.vcambio);
              producto.prefi3 = producto.prefi3 * parseFloat(valorCambio.vcambio);
              producto.prefi4 = producto.prefi4 * parseFloat(valorCambio.vcambio);
            }
          }
        });
        
        this.productos = productos;
        // Forzar la detección de cambios
        this.cdr.detectChanges();
      });
    }
  }
  abrirFormularioTarj() {
    Swal.fire({
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
    });
  }

  abrirFormularioCheque() {
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
  }

  listaPrecioF() {
    // Se eliminan los seteos individuales de prefijos
    // y se trabaja ahora con la selección de columnas directamente
    console.log(this.listaPrecio);

    // Actualizar el arreglo de columnas seleccionadas según la lista de precios
    if (this.listaPrecio === '0') {
      // Precio 0 (precon)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'precon' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '1') {
      // Precio 1 (prefi1)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi1' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '2') {
      // Precio 2 (prefi2)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi2' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '3') {
      // Precio 3 (prefi3)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi3' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '4') {
      // Precio 4 (prefi4)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi4' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    
    // Mantener los flags para compatibilidad con código existente
    this.prefi0 = this.listaPrecio === '0';
    this.prefi1 = this.listaPrecio === '1';
    this.prefi2 = this.listaPrecio === '2';
    this.prefi3 = this.listaPrecio === '3';
    this.prefi4 = this.listaPrecio === '4';
  }
  selectProducto(producto) {
    let datoscondicionventa: any =
    {
      producto: producto,
      cliente: this.clienteFrompuntoVenta,
      tarjeta: this.tarjeta,
      cheque: this.cheque,
      tipoVal: this.tipoVal,
      codTarj: this.codTarj,
      listaPrecio: this.listaPrecio,
    };
    this.ref = this.dialogService.open(CalculoproductoComponent, {
      header: 'Producto',
      width: '70%',
      data:
      {
        producto: producto,
        cliente: this.clienteFrompuntoVenta,
        tarjeta: this.tarjeta,
        cheque: this.cheque,
        tipoVal: this.tipoVal,
        codTarj: this.codTarj,
        listaPrecio: this.listaPrecio,
      },
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true
    });
  }
  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.productos);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'products');
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
