import { Component,OnInit } from '@angular/core';
//agregar importacion de router para navegacion
import { Router } from '@angular/router';
import { CarritoService } from 'src/app/services/carrito.service';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { CargardataService } from 'src/app/services/cargardata.service';
import Swal from 'sweetalert2';
import { first, take } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { set } from '@angular/fire/database';
import { MotomatchBotService } from 'src/app/services/motomatch-bot.service';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { formatDate } from '@angular/common';
import { TarjCredito } from 'src/app/interfaces/tarjcredito';
interface Cliente {
  nombre: string;
  direccion: string;
  dni: string;
  cuit: string;
  tipoiva: string;
}

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent {
  ref: DynamicDialogRef | undefined;
  public FechaCalend: any;
  public itemsEnCarrito: any[] = [];
  public tarjetas: TarjCredito[] = [];
  public suma: number = 0;
  public tipoDoc: string = "FC";
  public numerocomprobante: string;
  public numerocomprobanteImpresion: string;
  public puntoventa: number = 3;
  private myRegex = new RegExp('^[0-9]+$');
  public sucursal: string = '';
  public sucursalNombre: string = '';
  private indiceTipoDoc: string;
  public inputOPFlag: boolean = true;
  public puntoVenta_flag: boolean = true;
  public letras_flag: boolean = true;
  public letras: any = ["A", "B", "C"];
  public letraValue: string = "A";
  public vendedores: any[] = [];
  public vendedoresV: any;
  public cliente: any;
  public usuario: any;
  itemsConTipoPago: any[] = [];
  constructor(private _cargardata: CargardataService, private bot: MotomatchBotService, private _crud: CrudService, private _subirdata: SubirdataService, private _carrito: CarritoService, private router: Router) {
    this.FechaCalend = new Date();
    this.getItemsCarrito();
    this.calculoTotal();
    this.getNombreSucursal();
    this.getVendedores();
    this.usuario = sessionStorage.getItem('usernameOp')
    this.cliente = JSON.parse(sessionStorage.getItem('datoscliente'));
    this.initLetraValue();
  }
  ngOnInit() {
    this.cargarTarjetas();
  }
  cargarTarjetas() {
    this._cargardata.tarjcredito().subscribe((data: any) => {
      this.tarjetas = data.mensaje;
      console.log('Tarjetas obtenidas:', this.tarjetas);
     // this.agregarTipoPago();
     this.actualizarItemsConTipoPago();
      console.log('Items en carrito después de agregar tipoPago:', this.itemsEnCarrito);
    });
  }
 /*  agregarTipoPago() {
    const tarjetaMap = new Map();
    this.tarjetas.forEach(tarjeta => {
      tarjetaMap.set(tarjeta.cod_tarj, tarjeta.tarjeta);
    });
    console.log('Mapa de tarjetas:', tarjetaMap);
    this.itemsEnCarrito = this.itemsEnCarrito.map(item => {
      const tipoPago = tarjetaMap.get(item.cod_tar);
    console.log(`Item: ${item.cod_tar}, TipoPago: ${tipoPago}`);
      return {
        ...item,
        tipoPago: tarjetaMap.get(item.cod_tar.toString())
      };
    });
  } */
    actualizarItemsConTipoPago() {
      const tarjetaMap = new Map();
      this.tarjetas.forEach(tarjeta => {
        tarjetaMap.set(tarjeta.cod_tarj, tarjeta.tarjeta);
      });
  
      console.log('Mapa de tarjetas:', tarjetaMap);
  
      this.itemsConTipoPago = this.itemsEnCarrito.map(item => {
        const tipoPago = tarjetaMap.get(item.cod_tar.toString());
        console.log(`Item: ${item.cod_tar}, TipoPago: ${tipoPago}`);
        return {
          ...item,
          tipoPago: tipoPago
        };
      });
    }
  getItemsCarrito() {
    let items = sessionStorage.getItem('carrito');
    if (items) {
      this.itemsEnCarrito = JSON.parse(items);
    }
  }
  getVendedores() {
    this._cargardata.vendedores().subscribe((res: any) => {
      this.vendedores = res.mensaje;
      console.log(this.vendedores);
    })
  }
  getNombreSucursal() {
    this.sucursal = sessionStorage.getItem('sucursal');
    console.log(this.sucursal);

    this._crud.getListSnap('sucursales').subscribe(
      data => {
        const sucursales = data.map(item => {
          const payload = item.payload.val() as any;
          return {
            nombre: payload.nombre,
            value: payload.value
          };
        });
        
        // Buscar la sucursal correspondiente en los datos cargados
        const sucursalEncontrada = sucursales.find(suc => suc.value.toString() === this.sucursal);
        if (sucursalEncontrada) {
          this.sucursalNombre = sucursalEncontrada.nombre;
        } else {
          // Guardar ID de sucursal para debugging
          console.warn('No se encontró la sucursal con ID:', this.sucursal);
          this.sucursalNombre = 'Sucursal ' + this.sucursal;
        }
      },
      error => {
        console.error('Error al cargar sucursales:', error);
        this.showNotification('Error al cargar las sucursales');
        
        // En caso de error, usamos un valor genérico como fallback
        this.sucursalNombre = 'Sucursal ' + this.sucursal;
      }
    );
  }

  initLetraValue() {
    if (this.cliente.cod_iva == 2)//consumidor final
    { this.letraValue = "B"; }
    else if (this.cliente.cod_iva == 1)//excento
    {
      this.letraValue = "A";
    }
    else if (this.cliente.cod_iva == 3)//monotributo
    {
      this.letraValue = "A";
    }
    else {
      this.letraValue = "B";
    }
  }

  tipoDocChange(event) {
    console.log(event.target.value);
    this.tipoDoc = event.target.value;
    if (this.tipoDoc == "FC") {
      this.inputOPFlag = true;
      // se cambio esto para sacar el punto de venta y ponerle el valor de la sucursal----
      this.puntoVenta_flag = false;//this.puntoVenta_flag = true;
      //se agregó esto para que el punto de venta sea igual a la sucursal-------------------
      this.puntoventa = parseInt(this.sucursal);
      //console.log('PUNTO DE VENTA:' + this.puntoventa);
      this.letras_flag = true;
    }
    else if (this.tipoDoc == "NC") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "NV") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "ND") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "PR") {
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "CS") {
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
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
        sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
        this._carrito.actualizarCarrito(); // es para refrescar el numero del carrito del header
        this.calculoTotal();
      }
    })
  }

  calculoTotal() {
    this.suma = 0;
    for (let item of this.itemsEnCarrito) {
      this.suma += item.precio * item.cantidad;
    }
  }
  async finalizar() {
    if (this.itemsEnCarrito.length > 0) {//hacer si 
      console.log(this.puntoventa);
      if (this.pendientes()) {
        Swal.fire({
          title: 'Enviando...',
          allowOutsideClick: false,
        });
        this.indiceTipoDoc = "";
        console.log('TIPO DOC:' + this.tipoDoc);
        console.log('PUNTO VENTA:' + this.puntoventa);
        if (this.tipoDoc == undefined || this.tipoDoc == "" || this.puntoventa == undefined)//if (this.tipoDoc == undefined || this.tipoDoc == "" || this.numerocomprobante == undefined || this.numerocomprobante == "" || this.puntoventa == undefined || this.puntoventa == "") 
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
          if (this.tipoDoc == "ND") {
            this.indiceTipoDoc = "notadebito";
            this.numerocomprobante = this.numerocomprobante; //numero.toString();
          }
          else if (this.tipoDoc == "FC") {
            this.indiceTipoDoc = "factura";
            this.numerocomprobante = this.numerocomprobante; //numero.toString();
          }
          else if (this.tipoDoc == "NC") {
            this.indiceTipoDoc = "notacredito";
            this.numerocomprobante = this.numerocomprobante;//numero.toString();
          }
          else if (this.tipoDoc == "NV") {
            this.indiceTipoDoc = "devolucion";

            this.numerocomprobante = this.numerocomprobante;//numero.toString();
          }
          else if (this.tipoDoc == "PR") {
            this.indiceTipoDoc = "presupuesto";
            let numero = await this._crud.getNumeroSecuencial('presupuesto').pipe(take(1)).toPromise();
            console.log('NUMERO SECUENCIAL:' + numero);
            this.numerocomprobante = numero.toString();
          }
          else if (this.tipoDoc == "CS") {
            this.indiceTipoDoc = "consulta";
            let numero = await this._crud.getNumeroSecuencial('consulta').pipe(take(1)).toPromise();
            console.log('NUMERO SECUENCIAL:' + numero);
            this.numerocomprobante = numero.toString();
          }
          let emailOp = sessionStorage.getItem('emailOp');
          let result = this.itemsEnCarrito.map(obj => {
            // Crear una copia del objeto original sin el campo id_articulo
            const { id_articulo, ...objSinIdArticulo } = obj;
            
            return {
              ...objSinIdArticulo,
              emailop: emailOp,
              tipodoc: this.tipoDoc,
              puntoventa: this.puntoventa,
              numerocomprobante: this.numerocomprobante,
              estado: "NP",
              idven: this.vendedoresV,
              // Asignar al campo idart de psucursal3 el campo id_articulo de artsucursal
              idart: id_articulo || obj.idart
            };
          });
          this.numerocomprobanteImpresion = this.numerocomprobante;
          sessionStorage.setItem('carrito', JSON.stringify(result));
          console.log(result);
          let sucursal = sessionStorage.getItem('sucursal');
          // Mapeado de sucursal a exi - Lo mantenemos hasta que se pueda cambiar en la base de datos
          let exi = 0;
          // Usando un objeto de mapeo en lugar de condicionales
          const mappedValues = {
            "2": 3,  // Suc. Valle Viejo
            "3": 4,  // Suc. Guemes
            "4": 1   // Deposito
          };
          
          // Usamos el objeto de mapeo, con fallback a 0 si no existe
          exi = mappedValues[sucursal] || 0;
          this._subirdata.editarStockArtSucxManagedPHP(result, exi).pipe(take(1)).subscribe((data: any) => {
            console.log(data);
          });
          this.agregarPedido(result, sucursal);
        }
      }
    }
    else {
      Swal.fire({
        icon: 'error',
        title: 'Error..',
        text: 'No hay items en el carrito!',
        footer: 'Agregue items al carrito'
      })
    }
  }
  cabecera(fecha: any, fechasinformato: any) {
    let year = fechasinformato.getFullYear();
    let month = fechasinformato.getMonth() + 1;
    let formattedMonth = month < 10 ? '0' + month : month;
    let numero_fac: number = 0
    if (this.tipoDoc != "FC") {
      numero_fac = 0;
    }
    else {
      numero_fac = Number(this.numerocomprobante);
      // Limitar número de factura al máximo permitido
      if (numero_fac > 999999) {
        numero_fac = 999999;
      }
    }
    
    // Función auxiliar para limitar valores numéricos
    const limitNumericValue = (value: any, limit: number) => {
      if (value === null || value === undefined || value === '') return null;
      const numValue = parseInt(value);
      return !isNaN(numValue) ? Math.min(numValue, limit) : null;
    };
    
    let codvent = this.getCodVta();
    let saldo = this.sumarCuentaCorriente();
    
    // Asegurarse de que cliente.idcli no exceda el límite
    let clienteId = this.cliente.idcli;
    if (clienteId && parseInt(clienteId) > 999999) {
      clienteId = '999999';
    }
    
    let cabecera = {
      tipo: this.tipoDoc,
      numero_int: limitNumericValue(this.numerocomprobante, 999999),
      puntoventa: limitNumericValue(this.puntoventa, 9999),
      letra: this.letraValue,
      numero_fac: numero_fac,
      atipo: this.tipoDoc,
      anumero_com: numero_fac,
      cliente: clienteId,
      cod_sucursal: limitNumericValue(this.sucursal, 999999),
      emitido: fecha,
      vencimiento: fecha,
      exento: 0,
      basico: parseFloat((this.suma / 1.21).toFixed(2)),//this.suma/1.21,
      iva1: parseFloat((this.suma - this.suma / 1.21).toFixed(2)),
      iva2: 0,
      iva3: 0,
      bonifica: 0,
      interes: 0,
      saldo: saldo,//this.suma,
      dorigen: true,
      cod_condvta: limitNumericValue(codvent, 999),
      cod_iva: limitNumericValue(this.cliente.cod_iva, 999),
      cod_vendedor: limitNumericValue(this.vendedoresV, 999),//// aca hay que ver si se agrega un campo para elegir el nombre del vendedor
      anulado: false,
      cuit: this.cliente.cuit,
      usuario: this.usuario,//este es el que se logea?
      turno: 0,
      pfiscal: `${year}${formattedMonth}`,
      mperc: 0,
      imp_int: 0,
      fec_proceso: formatDate(this.FechaCalend, 'dd/MM/yy', 'en-US'),//fecha de cierre con caja puede ser otro dia   ?
      fec_ultpago: null,
      estado: "",
      id_aso: 0,
      //id_num:1,
    }
    console.log(cabecera);
    return cabecera;
  }
  sumarCuentaCorriente(): number {
    console.log(this.itemsEnCarrito);
    let acumulado = 0;
    for (let item of this.itemsEnCarrito) {
      console.log(item);
      if (item.cod_tar === 111) {
        acumulado += item.precio * item.cantidad; // Asumiendo que cada item tiene un campo 'valor' que queremos sumar
      }
    }
    return acumulado;
  }

  getCodVta() {
    if (this.itemsEnCarrito.length === 0) {
      return 99;
    }
    const firstCodTar = this.itemsEnCarrito[0].cod_tar;
    for (let item of this.itemsEnCarrito) {
      if (item.cod_tar !== firstCodTar) {
        return 99;
      }
    }
    return firstCodTar;
  }

  agregarProductos() {
    window.history.back();
  }
  validateValue(value: string): boolean {
    return this.myRegex.test(value);
  }
  agregarPedido(pedido: any, sucursal: any) {
    let fecha = new Date();
    let fechaFormateada = fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    let cabecera = this.cabecera(fechaFormateada, fecha);
    
    // Crear objeto caja_movi basado en los datos del pedido
    let caja_movi = this.crearCajaMovi(pedido, cabecera, fecha);
    
    this._subirdata.subirDatosPedidos(pedido, cabecera, sucursal, caja_movi).pipe(take(1)).subscribe((data: any) => {
      console.log(data.mensaje);
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
        footer: 'Se envio el pedido a la sucursal ' + sessionStorage.getItem('sucursal')
      })
      this.itemsEnCarrito = [];
      this.itemsConTipoPago = [];
      sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
      this._carrito.actualizarCarrito(); // es para refrescar el numero del carrito del header
      this.calculoTotal();
    }
    );
  }
  pendientes() {
    let missingFields = [];
    if (this.tipoDoc == "FC") {
      if (!this.FechaCalend) {
        missingFields.push('Fecha');
      }
      if (!this.vendedoresV) {
        missingFields.push('Vendedor');
      }
      if (!this.puntoventa) {
        missingFields.push('Punto de venta');
      }
      if (!this.numerocomprobante) {
        missingFields.push('Numero de Comprobante');
      }
    }
    else if (this.tipoDoc == "NC" || this.tipoDoc == "ND" || this.tipoDoc == "NV") {
      if (!this.numerocomprobante) {
        missingFields.push('Número de comprobante');
      }
      if (!this.vendedoresV) {
        missingFields.push('Vendedor');
      }
    }
    else if (this.tipoDoc == "PR" || this.tipoDoc == "CS") {
      if (!this.vendedoresV) {
        missingFields.push('Vendedor');
      }
    }
    if (missingFields.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error..',
        text: 'Faltan datos!',
        footer: 'Completar: ' + missingFields.join(', ')
      })
      return false;
    }
    else {
      return true;
    }
    // Resto del código...
  }
  //-----------------------------------
  imprimir(items: any, numerocomprobante: string, fecha: any, total: any) {
    //let cliente = JSON.parse(sessionStorage.getItem('datoscliente'));
let cliente: Cliente;

try {
  const datosCliente = sessionStorage.getItem('datoscliente');
  if (datosCliente) {
    cliente = JSON.parse(datosCliente);
  } else {
    cliente = {
      nombre: '',
      direccion: '',
      dni: '',
      cuit: '',
      tipoiva: ''
    };
  }
} catch (error) {
 this.showNotification('Error al leer cliente'); // console.error('Error parsing datoscliente from sessionStorage', error);
  cliente = {
    nombre: '',
    direccion: '',
    dni: '',
    cuit: '',
    tipoiva: ''
  };
}
    let titulo: string = "";
    if (this.tipoDoc == "FC") {
      titulo = "FACTURA";
    }
    else if (this.tipoDoc == "NC") {
      titulo = "NOTA DE CREDITO";
    }
    else if (this.tipoDoc == "NV") {
      titulo = "DEVOLUCION";
    }
    else if (this.tipoDoc == "ND") {
      titulo = "NOTA DE DEBITO";
    }
    else if (this.tipoDoc == "PR") {
      titulo = "PRESUPUESTO";
    }
    else if (this.tipoDoc == "CS") {
      titulo = "CONSULTA";
    }
    let fechaActual = new Date();
    let fechaFormateada = fechaActual.toISOString().split('T')[0];
    console.log(fechaFormateada);
    const tableBody = items.map(item => [item.cantidad, item.nomart, item.precio, item.cantidad * item.precio]);
    // Definir el contenido del documento
    const documentDefinition = {
      background: {
        canvas: [
          {
            type: 'rect',
            x: 10, // Posición X del recuadro
            y: 10, // Posición Y del recuadro
            w: 580, // Ancho del recuadro
            h: 750, // Alto del recuadro
            r: 3, // Radio de las esquinas (para redondearlas)
            lineWidth: 1, // Grosor de la línea
            lineColor: '#000000', // Color de la línea (ejemplo: azul)
            fillColor: '#000000', // Color de relleno (ejemplo: gris claro)
          },
        ],
      },
      content: [
        {
          image: "data:image/jpeg;base64,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",
          width: 100,
          margin: [0, 0, 80, 0], // izquierda, superior,derecha , inferior
        },
        {
          columns: [
            {
              text: [
                { text: 'Vicario Segura 587\n' },
                { text: 'Capital - Catamarca\n' },
                { text: this.sucursalNombre + '\n' },
                { text: '3834-4172012\n' },
                { text: 'motomatch01@gmail.com' },
              ],
              fontSize: 10,
              margin: [10, 0, 0, 0],
            },
            {
              text: [
                { canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 100, r: 3, lineWidth: 2, lineColor: '#000000' }], text: this.letraValue + '\n', style: { fontSize: 40 }, margin: [10, 5, 0, 0] },//{ text: this.letraValue + '\n', style: { border: '2px solid black', fontSize: 60 }  }, // Asegúrate de que 'this.letra' represente la letra seleccionada en el campo 'letra'
                { text: 'DOCUMENTO\n' },
                { text: 'NO VALIDO\n' },
                { text: 'COMO FACTURA' }
              ],
              alignment: 'center',
              fontSize: 12,
            },
            {
              text: [
                { text: titulo + '\n' },
                { text: 'N° 0000 -' + numerocomprobante + '\n', alignment: 'right' },
                { text: 'Punto de venta: ' + this.puntoventa + '\n' },
              ],
              alignment: 'right',
              fontSize: 10,
            },
          ],
        },
        {
          text: 'Fecha: ' + fecha,
          alignment: 'right',
          margin: [25, 0, 5, 30],
          fontSize: 10,
        },
        //separador 
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc' // Color gris claro para la línea
            }
          ],
          margin: [0, 0, 30, 0] // Agregar un margen inferior a la línea
        },
        {
          columns: [
            {
              text: [
                { text: 'Sres: ' + cliente.nombre + '\n' },
                { text: 'Direccion: ' + cliente.direccion + '\n' },
                { text: 'DNI: ' + cliente.dni + '\n' },
                { text: 'CUIT: ' + cliente.cuit + '\n' },
                { text: 'Condicion de Venta: ' + cliente.tipoiva + '\n' },
              ],
              fontSize: 10,
              margin: [0, 10, 0, 10],
            },
          ],
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc' // Color gris claro para la línea
            }
          ],
          margin: [0, 0, 30, 20] // Agregar un margen inferior a la línea
        },
        // ... Aquí puedes seguir añadiendo más elementos al documento ...
        {
          style: 'tableExample',
          table: {
            widths: ['10%', '60%', '15%', '15%'],
            body: [
              ['Cant./Lts.', 'DETALLE', 'P.Unitario', 'Total'],
              ...tableBody,
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
      ],
      styles: {
        header: {
          fontSize: 10,
          bold: true,
          margin: [2, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 5],
          fontSize: 8,
        },
        total: {
          bold: true,
          fontSize: 8,
          margin: [0, 10, 0, 0],
        },
      },
      defaultStyle: {
      },
    };
    // cerrar el loading 
    Swal.close();
    // Crear el PDF
    pdfMake.createPdf(documentDefinition).download(this.sucursalNombre + '_' + titulo + '_' + fechaFormateada + '.pdf');
    pdfMake.createPdf(documentDefinition).getBlob((blob) => {
      this.bot.sendToTelegram(blob, this.sucursalNombre + '_' + this.numerocomprobanteImpresion + '_' + titulo + '_' + fechaFormateada + '.pdf');
    }, (error: any) => {
      console.error(error);
    });
  }

  showNotification(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Aceptar'
    });
  }
  
  // Método para crear el objeto caja_movi a partir de los datos del pedido
  crearCajaMovi(pedido: any, cabecera: any, fecha: Date): any {
    // Buscamos un artículo del pedido para obtener la información relevante
    if (!pedido || pedido.length === 0) {
      return null;
    }

    // Tomamos el primer item del pedido para base
    const primerItem = pedido[0];
    
    // Buscamos la información de tarjeta asociada a este pedido
    let tarjetaInfo: any = null;
    if (primerItem.cod_tar) {
      tarjetaInfo = this.tarjetas.find(t => t.cod_tarj.toString() === primerItem.cod_tar.toString());
    }
    
    // Asegurarse de que fecha sea un objeto Date válido
    const fechaObj = fecha instanceof Date ? fecha : new Date();
    
    // Formatear la fecha en formato YYYY-MM-DD
    const fechaFormateada = fechaObj.toISOString().split('T')[0];
    
    // Función auxiliar para limitar valores numéricos
    const limitNumericValue = (value: any, limit: number) => {
      if (value === null || value === undefined || value === '') return null;
      const numValue = parseInt(value);
      return !isNaN(numValue) ? Math.min(numValue, limit) : null;
    };
    
    // Crear el objeto caja_movi con los campos solicitados
    const cajaMovi = {
      sucursal: limitNumericValue(this.sucursal, 999999),
      codigo_mov: tarjetaInfo ? limitNumericValue(tarjetaInfo.idcp_ingreso, 9999999999) : null,
      num_operacion: 0, // Se asignará en el backend cuando se genere el id_num
      fecha_mov: fechaFormateada,
      importe_mov: this.suma,
      descripcion_mov: primerItem.nomart || '',
      fecha_emibco: primerItem.fechacheque || null,
      banco: limitNumericValue(primerItem.codigobanco, 9999999999),
      num_cheque: limitNumericValue(primerItem.ncheque, 9999999999),
      cuenta_mov: limitNumericValue(primerItem.ncuenta, 999999),
      cliente: limitNumericValue(primerItem.idcli || cabecera.cliente, 9999999999),
      proveedor: null, // Siempre null como indicado
      plaza_cheque: primerItem.plaza || '',
      codigo_mbco: null, // Siempre null como indicado
      desc_bancaria: null, // Siempre null como indicado
      filler: null, // Siempre null como indicado
      fecha_cobro_bco: null, // Siempre null como indicado
      fecha_vto_bco: null, // Siempre null como indicado
      tipo_movi: 'A',
      caja: null, // Siempre null como indicado
      letra: cabecera.letra || '',
      punto_venta: limitNumericValue(this.puntoventa, 9999),
      tipo_comprobante: primerItem.tipodoc || this.tipoDoc,
      numero_comprobante: limitNumericValue(this.numerocomprobante, 99999999),
      marca_cerrado: null,
      usuario: primerItem.emailop || sessionStorage.getItem('emailOp') || '',
      fecha_proceso: fechaFormateada
    };
    
    return cajaMovi;
  }
}
