import { Component } from '@angular/core';
//agregar importacion de router para navegacion
import { Router } from '@angular/router';
import { CarritoService } from 'src/app/services/carrito.service';
import { SubirdataService } from 'src/app/services/subirdata.service';
import Swal from 'sweetalert2';
import { first, take } from 'rxjs/operators';
import {CrudService} from '../../services/crud.service';
import { set } from '@angular/fire/database';

import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent {
  public itemsEnCarrito: any[] = [];
  public suma: number = 0;
  public tipoDoc: string;
  public numerocomprobante: string;
  public puntoventa: string;
  private myRegex = new RegExp('^[0-9]+$');

  private indiceTipoDoc: string ;

  public inputOPFlag: boolean = true;

  // Asignar fuentes a pdfMake

  constructor(private _crud: CrudService,private _subirdata: SubirdataService, private _carrito: CarritoService, private router: Router) {
    let items = localStorage.getItem('carrito');
    if (items) {
      this.itemsEnCarrito = JSON.parse(items);
    }

    this.puntoventa = localStorage.getItem('sucursal');
    //calcular la suma de los precios
    this.calculoTotal();

    /* this._crud.getNumeroSecuencial('presupuesto').subscribe(numero => {
      console.log('NUMERO SECUENCIAL:' + numero);
    }); */

  }
  tipoDocChange(event) {
    // event.target.value contains the value of the selected option
    console.log(event.target.value);
    this.tipoDoc = event.target.value;
    if (this.tipoDoc == "FC" || this.tipoDoc == "NC" || this.tipoDoc == "ND" ) {
      this.inputOPFlag = true;
    }
    else{
      this.inputOPFlag = false;
    }
    
    // Call your function here
}
  eliminarItem(item: any) {
    //agregar un sweet alert para confirmar la eliminacion
    Swal.fire({
      title: 'Estas seguro?',
      text: "Vas a eliminar un item del carrito!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',

      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {

        Swal.fire(
          'Eliminado!',
          'El item fue eliminado.',
          'success'
        )

        let index = this.itemsEnCarrito.indexOf(item);
        this.itemsEnCarrito.splice(index, 1);
        localStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
        this._carrito.actualizarCarrito(); // es para refrescar el numero del carrito del header

        this.calculoTotal();
      }
    })



  }

  /*  calculoTotal()
   {
     this.suma=0;
     for(let item of this.itemsEnCarrito)
     {
       
       this.suma += item.precio;
     }
   } */
  calculoTotal() {
    this.suma = 0;
    for (let item of this.itemsEnCarrito) {
      this.suma += item.precio * item.cantidad;
    }
  }
  async finalizar() 
  {
    this.indiceTipoDoc = "";
    if (this.tipoDoc == undefined || this.tipoDoc == "" ||  this.puntoventa == undefined || this.puntoventa == "")//if (this.tipoDoc == undefined || this.tipoDoc == "" || this.numerocomprobante == undefined || this.numerocomprobante == "" || this.puntoventa == undefined || this.puntoventa == "") 
    {
      Swal.fire({
        icon: 'error',
        title: 'Error..',
        text: 'Faltan datos!',
        footer: 'Completar todos los campos'
      })
      return;
    }
    else {

      if (this.tipoDoc == "FC" || this.tipoDoc == "NC" || this.tipoDoc == "ND" ) {
        //this.numerocomprobante = "";
      }
      else if (this.tipoDoc == "PR") {
        this.indiceTipoDoc = "presupuesto";
        let numero = await this._crud.getNumeroSecuencial('presupuesto').pipe(take(1)).toPromise();
  console.log('NUMERO SECUENCIAL:' + numero);
  this.numerocomprobante = numero.toString();
       /*  this._crud.getNumeroSecuencial('presupuesto').pipe(take(1)).subscribe(numero => {
          console.log('NUMERO SECUENCIAL:' + numero);
          this.numerocomprobante = numero.toString();
          this._crud.incrementarNumeroSecuencial('presupuesto', numero + 1).then(() => {
            console.log('Numero secuencial incrementado');
          });
        }); */
      }
      
      
      else if (this.tipoDoc == "CS") {
        this.indiceTipoDoc = "consulta";
        let numero = await this._crud.getNumeroSecuencial('consulta').pipe(take(1)).toPromise();
  console.log('NUMERO SECUENCIAL:' + numero);
  this.numerocomprobante = numero.toString();
       /*  this._crud.getNumeroSecuencial('consulta').pipe(take(1)).subscribe(numero => {
          console.log('NUMERO SECUENCIAL:' + numero);
          this.numerocomprobante = numero.toString();
          this._crud.incrementarNumeroSecuencial('consulta', numero + 1).then(() => {
            console.log('Numero secuencial incrementado');
          });
        }); */
      
      }
      

      let emailOp = localStorage.getItem('emailOp');
      let result = this.itemsEnCarrito.map(obj => {
        return {
          ...obj,
          emailop: emailOp,
          tipodoc: this.tipoDoc,
          puntoventa: this.puntoventa,
          numerocomprobante: this.numerocomprobante,
          estado: "NP"
        };
      });

      localStorage.setItem('carrito', JSON.stringify(result));
      console.log(result);

   /*    let op = "";
      if (this.tipoDoc == "FC" || this.tipoDoc == "NC" || this.tipoDoc == "PR" || this.tipoDoc == "MI-") {
        op = "-";
      }
      else {
        op = "+";
      } */
      let sucursal = localStorage.getItem('sucursal');

      let exi = 0;  // ESTO LO HAGO POR QUE NO HAY CORRESPONDENCIA ENTRE EXI Y SUCURSAL
      if (sucursal == "2") 
      {
        exi = 3;
      }
      else if (sucursal == "3")
      {
        exi = 4;
      }
      else if (sucursal == "4")
      {
        exi = 1;
      }

     
     // for (let item of result) // result es itemsEnCarrito con los datos de la factura
      //{
        this._subirdata.editarStockArtSucxManagedPHP(result, exi).pipe(take(1)).subscribe((data: any) => {
          console.log(data);
        });
      //}
      
     
        this.agregarPedido(result, sucursal);
      
      
    }

  }
 
  /* pendientes() {
    if (this.tipoDoc == undefined || this.tipoDoc == "" || this.numerocomprobante == undefined || this.numerocomprobante == "" || this.puntoventa == undefined || this.puntoventa == "") 
    {
      Swal.fire({
        icon: 'error',
        title: 'Error..',
        text: 'Faltan datos!',
        footer: 'Completar todos los campos'
      })
      return;
    }
    else 
    {
      let emailOp = localStorage.getItem('emailOp');
      let result = this.itemsEnCarrito.map(obj => {
        return {
          ...obj,
          emailop: emailOp,
          tipodoc: this.tipoDoc,
          numerocomprobante: this.numerocomprobante,
          puntoventa: this.puntoventa,
          estado: "NP"
        };
      });

      let carritoPendientes = localStorage.getItem('carritoPendientes');
      if (carritoPendientes) {
        let carritoPendientesArray = JSON.parse(carritoPendientes);
        carritoPendientesArray.push(...result);
        localStorage.setItem('carritoPendientes', JSON.stringify(carritoPendientesArray));
      } else {
        localStorage.setItem('carritoPendientes', JSON.stringify(result));
      }

      let op = "";
      if (this.tipoDoc == "FC" || this.tipoDoc == "NC" || this.tipoDoc == "PR" || this.tipoDoc == "MI-") {
        op = "-";
      }
      else {
        op = "+";
      }

      let sucursal = localStorage.getItem('sucursal');
      let sucursalPendientes = localStorage.getItem('sucursalPendientes');
      if (sucursalPendientes) {
        let sucursalPendientesArray = JSON.parse(sucursalPendientes);
        sucursalPendientesArray.push(sucursal);
        localStorage.setItem('sucursalPendientes', JSON.stringify(sucursalPendientesArray));
      } else {
        localStorage.setItem('sucursalPendientes', sucursal);
      }

      let opPendientes = localStorage.getItem('opPendientes');
      if (opPendientes) {
        let opPendientesArray = JSON.parse(opPendientes);
        opPendientesArray.push(op);
        localStorage.setItem('opPendientes', JSON.stringify(opPendientesArray));
      } else {
        localStorage.setItem('opPendientes', op);
      }

      this.itemsEnCarrito = [];
        localStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
        this._carrito.actualizarCarrito(); // es para refrescar el numero del carrito del header
        this.calculoTotal();
    }
  } */

  agregarProductos() {
    //this.guardar();
    window.history.back();
    //volver a la pagina de  productos usando el router
    //this.router.navigate(['components/condicionventa']);

  }
  validateValue(value: string): boolean {
    return this.myRegex.test(value);
  }
  agregarPedido(pedido: any, sucursal: any) {
    this._subirdata.subirDatosPedidos(pedido, sucursal).pipe(take(1)).subscribe((data: any) => {
      console.log(data.mensaje);
      if (data.mensaje == this.itemsEnCarrito.length) {
        //preguntar si desea imprimir el pedido
      /*   Swal.fire({
          title: 'Imprimir Pedido?',
          text: "Desea imprimir el pedido?",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Si, imprimir!'
        }).then((result) => {
          if (result.isConfirmed) {
            //imprimir el pedido
            this.imprimir(this.itemsEnCarrito, this.numerocomprobante, new Date(), this.suma);
          }
        }) */
        let fecha = new Date();
        let fechaFormateada = fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
        });
        
        this.imprimir(this.itemsEnCarrito, this.numerocomprobante, fechaFormateada, this.suma);

        //actualizar indices
        if (this.indiceTipoDoc != "") {
          this._crud.incrementarNumeroSecuencial(this.indiceTipoDoc, parseInt(this.numerocomprobante) + 1).then(() => {
            console.log('Numero secuencial incrementado');
            this.numerocomprobante = "";
          });
        }
        Swal.fire({
          icon: 'success',
          title: 'Pedido enviado',
          text: 'El pedido se envio correctamente!',
          footer: 'Se envio el pedido a la sucursal ' + localStorage.getItem('sucursal')
        })
        

        this.itemsEnCarrito = [];
        localStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
        this._carrito.actualizarCarrito(); // es para refrescar el numero del carrito del header
        this.calculoTotal();
      }
      else {
        /*  Swal.fire({
           icon: 'error',
           title: 'Error..',
           text: 'No se pudo enviar el pedido!. Puede intentar nuevamente o guardar el pedido en la lista de pedidos pendientes',
           footer: 'Intentelo de nuevo',
           showConfirmButton: true,
           confirmButtonText: 'Guardar Pendientes',
           showCancelButton: true,
           cancelButtonText: 'Intentar Nuevamente'
         }).then((result) => {
           if (result.isConfirmed) {
             // Aquí puedes poner el código que se ejecutará cuando el usuario haga clic en 'Aceptar'
             console.log('El usuario hizo clic en "Aceptar"');
           }
         }) */
        Swal.fire({
          icon: 'error',
          title: 'Error..',
          text: 'No se pudo enviar el pedido!',
          footer: 'Intentelo de nuevo'
        })
      }
    }
    );
  }

  imprimir(items: any, numerocomprobante: string, fecha:any, total:any) {


const tableBody = items.map(item => [item.cantidad, item.nomart, item.precio, item.cantidad* item.precio]);   
    // Definir el contenido del documento
const documentDefinition = {
  content: [
 /*    {
      text: 'MOTOMATCH',
      style: 'header',
    }, */
    {
      image: "assets/images/HACKLAB-TELEMETRY.png",
      width: 150,
      height: 50,
      margin: [5, 20, 0, 0],
    },
/*     {
      image:"assets/images/HACKLAB-TELEMETRY.png",
    }, */
    {
      columns: [
        {
          text: [
            { text: 'Vicario Segura 587\n' },
            { text: 'CAPITAL - CATAMARCA\n' },
            { text: '3834-4172012' }
          ],
          
        },
        {
          text: [
            { text: 'Documento\n' },
            { text: 'no valido\n' },
            { text: 'como factura' }
          ],
          alignment: 'center',
        },
        {
          text: [
            { text: 'PRESUPUESTO\n' },
            { text: 'N° 0000 -' + numerocomprobante, alignment: 'right' },
            // { text: 'N° 0000 - 00005033', alignment: 'right' },
          ],
          alignment: 'right',
        },
      ],
    },
    {
      text: 'Fecha: ' + fecha,
      alignment: 'right',
      margin: [35, 0, 15, 15],
    },
    // ... Aquí puedes seguir añadiendo más elementos al documento ...
    {
      style: 'tableExample',
      table: {
        widths: ['10%','60%','15%','15%'],//['*', '*', '*', '*'],
        body: [
          ['Cant./Lts.', 'DETALLE', 'P.Unitario', 'Total'],
          ...tableBody,//['1.000', 'ACRL.RAP.UNIVERSAL ALUMINIO SDG 10810', '6007.00', '6007.00'],
          // ... Añade más filas según sea necesario ...
         
        ],
        bold: true,
      },
    },
    {
      style: 'tableExample',
      table: {
        widths: ['*'],
        body: [
         
          
          ['TOTAL $' + total],
         
          // ... Añade más filas según sea necesario ...
        ],
        bold: true,
        fontSize: 16,
      },
    },
    /* {
      text: 'TOTAL $ 6007.00',
      style: 'total',
      alignment: 'right',
    }, */
  ],
  styles: {
    header: {
      fontSize: 18,
      bold: true,
      margin: [5, 0, 5, 10],
    },
    tableExample: {
      margin: [10, 5, 0, 15],
    },
    total: {
      bold: true,
      fontSize: 12,
      margin: [0, 10, 0, 0],
    },
  },
  defaultStyle: {
    // ...
  },
};

// Crear el PDF
pdfMake.createPdf(documentDefinition).download('presupuesto.pdf');
  }
}
