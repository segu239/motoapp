import { Component } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import {Producto} from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { ActivatedRoute, Router,NavigationEnd } from '@angular/router';

import { filter } from 'rxjs/operators';
import { first, take } from 'rxjs/operators';

//importar componente calculoproducto
import { CalculoproductoComponent } from '../calculoproducto/calculoproducto.component';

import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';


import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-condicionventa',
  templateUrl: './condicionventa.component.html',
  styleUrls: ['./condicionventa.component.css'],
  providers: [DialogService]
})
export class CondicionventaComponent {
  public tipoVal:string= 'Condicion de Venta';
  public codTarj:string= '';
  public listaPrecio:string='';
  public activaDatos:number;
  public tipo:any[]=[];

  ref: DynamicDialogRef | undefined;

  public prefi0:boolean=false;
  public prefi1:boolean=false;
  public prefi2:boolean=false;
  public prefi3:boolean=false;
  public prefi4:boolean=false;
  
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

  public productos:Producto[];
  public productoElejido:Producto;

  public clienteFrompuntoVenta: any;

  public tarjetaFlag:boolean = false;
  public chequeFlag:boolean = false;

  public previousUrl: string = "";



  //public selectedTipo: any;

  constructor (public dialogService: DialogService, private cdr: ChangeDetectorRef, private router: Router, private activatedRoute: ActivatedRoute, private _cargardata:CargardataService) {

  this.clienteFrompuntoVenta = this.activatedRoute.snapshot.queryParamMap.get('cliente');
  this.clienteFrompuntoVenta = JSON.parse(this.clienteFrompuntoVenta);

 
 // Verifica si hay un valor guardado en el almacenamiento local
/*  const lastSelectedValue = localStorage.getItem('lastSelectedValue');
 if (lastSelectedValue) {
   // Si hay un valor, establece ese valor como el valor seleccionado en tu lista desplegable
   this.selectedTipo = JSON.parse(lastSelectedValue);
 }
  this.tipo = JSON.parse(localStorage.getItem('tarjetas')); */

  this._cargardata.tarjcredito().pipe(take(1)).subscribe((resp:any)=>{
    //console.log(resp.mensaje);
    this.tipo = resp.mensaje;//.tarjeta;
    console.log(this.tipo);
  });
}
ngOnDestroy() {
  if (this.ref) {
      this.ref.close();
  }
}

ngOnInit() {
  /* this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe((event: NavigationEnd) => {
    console.log("event.url", event.url);
    if (this.previousUrl !== "") {
      // Aquí tienes la URL anterior
      console.log('URL anterior:', this.previousUrl);
      if(this.previousUrl == '/components/puntoventa')
      {
        this._cargardata.tarjcredito().pipe(take(1)).subscribe((resp:any)=>{
          console.log(resp.mensaje);
          this.tipo = resp.mensaje;//.tarjeta;
          console.log(this.tipo);
        });
      }
    }
    // Actualiza la URL anterior para la próxima navegación
    this.previousUrl = event.url;
  }); */
}

selectTipo(item: any) {
  // Guarda el valor seleccionado en el almacenamiento local
 // localStorage.setItem('lastSelectedValue', JSON.stringify(item));
  console.log(item);
  //esto son datos de la tabla tarjcredito
  this.tipoVal = item.tarjeta; // Almacena el centro seleccionado
  this.codTarj = item.cod_tarj;
  this.listaPrecio = item.listaprecio;
  this.activaDatos = item.activadatos;
  this.listaPrecioF(); // aca se llama a la funcion que muestra los prefijos
  

  if(this.activaDatos == 1)
  {
    this.abrirFormularioTarj();
    
   // aca se llama a la funcion que muestra los prefijos
  }
  else if(this.activaDatos == 2)
  {
    this.abrirFormularioCheque();
   // aca se llama a la funcion que muestra los prefijos
  }
  else
  {
    this._cargardata.artsucursal().pipe(take(1)).subscribe((resp:any)=>{
      console.log(resp.mensaje);
      //this.productos = resp.mensaje;
      this.productos = [...resp.mensaje];
      // Forzar la detección de cambios
      this.cdr.detectChanges();
    });
  }
  
 // localStorage.setItem('codTarj', this.codTarj);
}

/* abrirFormularioTarj() {
  Swal.fire({
    title: 'Ingrese los datos de la tarjeta',
    html:
      `<input type="text" id="titular" class="swal2-input" placeholder="Titular">
       <input type="text" id="dni" class="swal2-input" placeholder="DNI">
       <input type="text" id="numero" class="swal2-input" placeholder="Número">
       <input type="text" id="autorizacion" class="swal2-input" placeholder="Autorización">`,
    showCancelButton: true,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      this.tarjeta.Titular = (<HTMLInputElement>document.getElementById('titular')).value;
      this.tarjeta.Dni = (<HTMLInputElement>document.getElementById('dni')).value;
      this.tarjeta.Numero = (<HTMLInputElement>document.getElementById('numero')).value;
      this.tarjeta.Autorizacion = (<HTMLInputElement>document.getElementById('autorizacion')).value;
    }
  }).then((result) => {
    if (result.value) {
      console.log('Tarjeta guardada:', this.tarjeta);
    }
  });
} */

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
      //else 
      //{
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
      //else {
        return { titular, dni, numero, autorizacion }
      //}
      //}
      
      
      
    }
  }).then((result) => {
    if (result.value) {
      this.tarjeta.Titular = result.value.titular;
      this.tarjeta.Dni = result.value.dni;
      this.tarjeta.Numero = result.value.numero;
      this.tarjeta.Autorizacion = result.value.autorizacion;
      console.log('Tarjeta guardada:', this.tarjeta);
      this._cargardata.artsucursal().pipe(take(1)).subscribe((resp:any)=>{
        console.log(resp.mensaje);
        //this.productos = resp.mensaje;
        this.productos = [...resp.mensaje];
        // Forzar la detección de cambios
        this.cdr.detectChanges();
      }); 
    }
  });
}

/* abrirFormularioCheque() {
  Swal.fire({
    title: 'Ingrese los datos del Cheque',
    html: 
      `<input type="text" id="banco" class="swal2-input" placeholder="Banco">
       <input type="text" id="ncuenta" class="swal2-input" placeholder="N° Cuenta">
       <input type="text" id="ncheque" class="swal2-input" placeholder="N° Cheque">
       <input type="text" id="nombre" class="swal2-input" placeholder="Nombre">
       <input type="text" id="plaza" class="swal2-input" placeholder="Plaza">
       <input type="text" id="importeimputar" class="swal2-input" placeholder="Importe a Imputar">
       <input type="text" id="importecheque" class="swal2-input" placeholder="Importe del Cheque">
       <input type="text" id="fechacheque" class="swal2-input" placeholder="Fecha del Cheque">`,
    
    showCancelButton: true,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      this.cheque.Banco = (<HTMLInputElement>document.getElementById('banco')).value;
      this.cheque.Ncuenta = (<HTMLInputElement>document.getElementById('ncuenta')).value;
      this.cheque.Ncheque = (<HTMLInputElement>document.getElementById('ncheque')).value;
      this.cheque.Nombre = (<HTMLInputElement>document.getElementById('nombre')).value;
      this.cheque.Plaza = (<HTMLInputElement>document.getElementById('plaza')).value;
      this.cheque.ImporteImputar = (<HTMLInputElement>document.getElementById('importeimputar')).value;
      this.cheque.ImporteCheque = (<HTMLInputElement>document.getElementById('importecheque')).value;
      this.cheque.FechaCheque = (<HTMLInputElement>document.getElementById('fechacheque')).value;
     
      

    }
  }).then((result) => {
    if (result.value) {
      console.log('Cheque guardado:' , this.cheque);//console.log('Tarjeta guardada:', this.tarjeta);
    }
  });
} */

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
      /* this.cheque.Banco = (<HTMLInputElement>document.getElementById('banco')).value;
      this.cheque.Ncuenta = (<HTMLInputElement>document.getElementById('ncuenta')).value;
      this.cheque.Ncheque = (<HTMLInputElement>document.getElementById('ncheque')).value;
      this.cheque.Nombre = (<HTMLInputElement>document.getElementById('nombre')).value;
      this.cheque.Plaza = (<HTMLInputElement>document.getElementById('plaza')).value;
      this.cheque.ImporteImputar = (<HTMLInputElement>document.getElementById('importeimputar')).value;
      this.cheque.ImporteCheque = (<HTMLInputElement>document.getElementById('importecheque')).value;
      this.cheque.FechaCheque = (<HTMLInputElement>document.getElementById('fechacheque')).value; */
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
      //else 
      //{
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
      /* if (!reFechaCheque.test(fechacheque)) {
        Swal.showValidationMessage(`La fecha del cheque no es válida`);
     
      } */
      //else {
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
      console.log('Cheque guardado:' , this.cheque);//console.log('Tarjeta guardada:', this.tarjeta);
    
      this._cargardata.artsucursal().pipe(take(1)).subscribe((resp:any)=>{
        console.log(resp.mensaje);
        //this.productos = resp.mensaje;
        this.productos = [...resp.mensaje];
        // Forzar la detección de cambios
          this.cdr.detectChanges();
      }); 

    }
  });
}

listaPrecioF()
{
  if (this.listaPrecio == "0")
  {
    
    
    this.prefi0= true;
    this.prefi1=false;
    this.prefi2=false;
    this.prefi3=false;
    this.prefi4=false;
  }
  else if (this.listaPrecio == "1")
  {
    
    this.prefi0= false;
    this.prefi1=true;
    this.prefi2=false;
    this.prefi3=false;
    this.prefi4=false;
  }
  else if (this.listaPrecio == "2")
  {
    
    this.prefi0= false;
    this.prefi1=false;
    this.prefi2=true;
    this.prefi3=false;
    this.prefi4=false;
  }
  else if (this.listaPrecio == "3")
  {
    this.prefi0= false;
    this.prefi1=false;
    this.prefi2=false;
    this.prefi3=true;
    this.prefi4=false;
  }
  else if (this.listaPrecio == "4")
  {
    this.prefi0= false;
    this.prefi1=false;
    this.prefi2=false;
    this.prefi3=false;
    this.prefi4=true;
  }
}
selectProducto(producto)
{
  let datoscondicionventa:any=
  {
    producto: producto,
    cliente: this.clienteFrompuntoVenta,
    tarjeta: this.tarjeta,
    cheque: this.cheque,
    tipoVal: this.tipoVal,
    codTarj: this.codTarj,
    listaPrecio: this.listaPrecio,
    //activaDatos: this.activaDatos
  };
  //localStorage.setItem('datoscondicionventa', JSON.stringify(datoscondicionventa));
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
      //activaDatos: this.activaDatos 
    },
    contentStyle: { overflow: 'auto' },
    baseZIndex: 10000,
    maximizable: true
});

/* this.ref.onClose.subscribe((product: Product) => {
    if (product) {
        this.messageService.add({ severity: 'info', summary: 'Product Selected', detail: product.name });
    }
});

this.ref.onMaximize.subscribe((value) => {
    this.messageService.add({ severity: 'info', summary: 'Maximized', detail: `maximized: ${value.maximized}` });
}); */

  //console.log(producto);
  //this.router.navigate(['components/calculoproducto'], { queryParams: {producto:JSON.stringify(producto)} });
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
