import { Component, OnInit, OnDestroy } from '@angular/core';
//agregar importacion de router para navegacion
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
import { getEmpresaConfig } from '../../config/empresa-config';
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
export class CarritoComponent implements OnDestroy {
  ref: DynamicDialogRef | undefined;
  public FechaCalend: any;
  public itemsEnCarrito: any[] = [];
  public tarjetas: TarjCredito[] = [];
  public suma: number = 0;
  public tipoDoc: string = "FC";
  public numerocomprobante: string;
  public numerocomprobanteImpresion: string;
  public puntoventa: number = 0; // Se asignará dinámicamente según la sucursal
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
  
  private subscriptions: Subscription[] = [];
  constructor(private _cargardata: CargardataService, private bot: MotomatchBotService, private _crud: CrudService, private _subirdata: SubirdataService, private _carrito: CarritoService, private router: Router) {
    // Verificar autenticación antes de inicializar
    if (!sessionStorage.getItem('usernameOp')) {
      this.router.navigate(['/login2']);
      return;
    }

    this.FechaCalend = new Date();
    this.getItemsCarrito();
    this.calculoTotal();
    this.getNombreSucursal();
    this.getVendedores();
    this.usuario = sessionStorage.getItem('usernameOp');
    this.initializePuntoVenta(); // Inicializar punto de venta según sucursal
    
    // Validación defensiva para datos del cliente
    const clienteData = sessionStorage.getItem('datoscliente');
    if (clienteData) {
      try {
        this.cliente = JSON.parse(clienteData);
        this.initLetraValue();
      } catch (error) {
        console.error('Error al parsear datos del cliente:', error);
        // Establecer cliente por defecto en lugar de redirigir
        this.cliente = { cod_iva: 2 }; // Consumidor final por defecto
        this.initLetraValue();
      }
    } else {
      // Si no hay datos del cliente, establecer valores por defecto
      this.cliente = { cod_iva: 2 }; // Consumidor final por defecto
      this.initLetraValue();
    }
  }
  ngOnInit() {
    this.cargarTarjetas();
  }
  cargarTarjetas() {
    const tarjetasSubscription = this._cargardata.tarjcredito().subscribe((data: any) => {
      this.tarjetas = data.mensaje;
      console.log('Tarjetas obtenidas:', this.tarjetas);
     // this.agregarTipoPago();
     this.actualizarItemsConTipoPago();
      console.log('Items en carrito después de agregar tipoPago:', this.itemsEnCarrito);
    });
    this.subscriptions.push(tarjetasSubscription);
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
    const items = sessionStorage.getItem('carrito');
    if (items) {
      try {
        this.itemsEnCarrito = JSON.parse(items);
        // Validar que sea un array válido
        if (!Array.isArray(this.itemsEnCarrito)) {
          this.itemsEnCarrito = [];
        }
      } catch (error) {
        console.error('Error al parsear items del carrito:', error);
        this.itemsEnCarrito = [];
        sessionStorage.removeItem('carrito');
      }
    } else {
      this.itemsEnCarrito = [];
    }
  }
  getVendedores() {
    const vendedoresSubscription = this._cargardata.vendedores().subscribe((res: any) => {
      this.vendedores = res.mensaje;
      console.log(this.vendedores);
    });
    this.subscriptions.push(vendedoresSubscription);
  }
  getNombreSucursal() {
    this.sucursal = sessionStorage.getItem('sucursal');
    console.log(this.sucursal);

    const sucursalesSubscription = this._crud.getListSnap('sucursales').subscribe(
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
    this.subscriptions.push(sucursalesSubscription);
  }

  initLetraValue() {
    if (!this.cliente) {
      this.letraValue = "B"; // Valor por defecto
      return;
    }
    
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

  /**
   * Inicializa el punto de venta con el número de sucursal actual
   * Se ejecuta al cargar el componente para asegurar consistencia
   */
  private initializePuntoVenta(): void {
    const sucursal = sessionStorage.getItem('sucursal');
    if (sucursal) {
      this.puntoventa = parseInt(sucursal);
      console.log('Punto de venta inicializado correctamente:', this.puntoventa, 'para sucursal:', sucursal);
    } else {
      console.warn('No se encontró sucursal en sessionStorage - usando puntoventa = 0');
      this.puntoventa = 0;
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
      // Asegurar que siempre use la sucursal actual de forma segura
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      console.log('PUNTO DE VENTA FC:', this.puntoventa);
      this.letras_flag = true;
    }
    else if (this.tipoDoc == "NC") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      // Para notas de crédito, mantener el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "NV") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      // Para notas de venta, mantener el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "ND") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      // Para notas de débito, mantener el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "PR") {
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      // Para presupuestos, también usar el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "CS") {
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      // Para consultas, también usar el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
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
        this.actualizarItemsConTipoPago();
      }
    })
  }

  calculoTotal() {
    this.suma = 0;
    for (let item of this.itemsEnCarrito) {
      this.suma += parseFloat((item.precio * item.cantidad).toFixed(4));
    }
    this.suma = parseFloat(this.suma.toFixed(4));
  }

  /**
   * Actualiza la cantidad de un item en ambos arrays y sincroniza con sessionStorage
   * @param item - Item del carrito a actualizar
   * @param nuevaCantidad - Nueva cantidad del producto
   */
  actualizarCantidad(item: any, nuevaCantidad: number) {
    // Validar que la cantidad sea válida
    if (nuevaCantidad < 1) {
      nuevaCantidad = 1;
    }

    // Actualizar en itemsConTipoPago
    item.cantidad = nuevaCantidad;

    // Encontrar y actualizar el mismo item en itemsEnCarrito
    const itemEnCarrito = this.itemsEnCarrito.find(i => i.id_articulo === item.id_articulo);
    if (itemEnCarrito) {
      itemEnCarrito.cantidad = nuevaCantidad;
    }

    // Guardar en sessionStorage para mantener persistencia
    sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));

    // Recalcular total
    this.calculoTotal();
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
        
        // Validación adicional: asegurar que puntoventa siempre coincida con sucursal
        const sucursalActual = parseInt(sessionStorage.getItem('sucursal') || '0');
        if (this.puntoventa !== sucursalActual) {
          console.warn('Corrigiendo puntoventa:', this.puntoventa, '-> ', sucursalActual);
          this.puntoventa = sucursalActual;
        }
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
          // Crear datos para descuento de stock (con id_articulo)
          let stockData = this.itemsEnCarrito.map(obj => {
            return {
              id_articulo: obj.id_articulo,
              cantidad: obj.cantidad,
              tipodoc: this.tipoDoc
            };
          });

          // Crear datos para guardar en psucursal (sin id_articulo)
          let result = this.itemsEnCarrito.map(obj => {
            const { id_articulo, ...objSinIdArticulo } = obj;
            return {
              ...objSinIdArticulo,
              emailop: emailOp,
              tipodoc: this.tipoDoc,
              puntoventa: this.puntoventa,
              numerocomprobante: this.numerocomprobante,
              estado: "NP",
              idven: this.vendedoresV,
              idart: obj.id_articulo || 0 // Usar id_articulo en el campo idart para psucursal
            };
          });
          this.numerocomprobanteImpresion = this.numerocomprobante;
          sessionStorage.setItem('carrito', JSON.stringify(result));
          console.log(result);
          let sucursal = sessionStorage.getItem('sucursal');
          // Mapeado de sucursal a exi - Lo mantenemos hasta que se pueda cambiar en la base de datos
          let exi = 0;
          // Usando un objeto de mapeo en lugar de condicionales
        /*   const mappedValues = {
            "2": 3,  // Suc. Valle Viejo
            "3": 4,  // Suc. Guemes
            "4": 1   // Deposito
          }; */
           const mappedValues = {
    "1": 2,  // Casa Central → exi2
    "2": 3,  // Suc. Valle Viejo → exi3
    "3": 4,  // Suc. Guemes → exi4
    "4": 1,   // Deposito → exi1
    "5": 5,   // Mayorista → exi5
  };
          
          // Usamos el objeto de mapeo, con fallback a 0 si no existe
          exi = mappedValues[sucursal] || 0;
          this._subirdata.editarStockArtSucxManagedPHP(stockData, exi).pipe(take(1)).subscribe({
            next: (data: any) => {
              console.log('Stock actualizado:', data);
              if (!data.error) {
                // Solo si el descuento fue exitoso, proceder con el pedido
                this.agregarPedido(result, sucursal);
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'No se pudo actualizar el stock: ' + data.mensaje
                });
              }
            },
            error: (error) => {
              console.error('Error al actualizar stock:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error de conexión al actualizar stock'
              });
            }
          });
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
    let clienteId;
    if (this.cliente && this.cliente.idcli) {
      clienteId = this.cliente.idcli;
      if (parseInt(clienteId) > 999999) {
        clienteId = '999999';
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Cliente no encontrado',
        text: 'Debe seleccionar un cliente antes de continuar. Diríjase a Artículos para seleccionar un cliente.',
        confirmButtonText: 'Entendido'
      });
      return void 0;
    }
    
    // Verificar datos del cliente antes de crear cabecera
    if (!this.cliente || !this.cliente.cod_iva) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos de cliente incompletos',
        text: 'Faltan datos del cliente. Diríjase a Artículos para seleccionar un cliente válido.',
        confirmButtonText: 'Ir a Artículos',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/articulos']);
        }
      });
      return void 0;
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
      basico: parseFloat((this.suma / 1.21).toFixed(4)),//this.suma/1.21,
      iva1: parseFloat((this.suma - this.suma / 1.21).toFixed(4)),
      iva2: 0,
      iva3: 0,
      bonifica: 0,
      bonifica_tipo: 'P', // Por defecto porcentaje
      interes: 0,
      interes_tipo: 'P', // Por defecto porcentaje
      saldo: saldo,//this.suma,
      dorigen: true,
      cod_condvta: limitNumericValue(codvent, 999),
      cod_iva: limitNumericValue(this.cliente.cod_iva, 999),
      cod_vendedor: limitNumericValue(this.vendedoresV, 999),//// aca hay que ver si se agrega un campo para elegir el nombre del vendedor
      anulado: false,
      cuit: this.cliente.cuit,
      usuario: sessionStorage.getItem('emailOp') ? sessionStorage.getItem('emailOp').substring(0, 12) : (() => {
        Swal.fire({
          icon: 'error',
          title: 'Error de sesión',
          text: 'No se encontró información del usuario logueado. Por favor, inicie sesión nuevamente.',
          confirmButtonText: 'Entendido'
        });
        throw new Error('Usuario no encontrado en sessionStorage');
      })(), // Limitado a 12 caracteres para evitar error PostgreSQL
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
        acumulado += parseFloat((item.precio * item.cantidad).toFixed(4)); // Asumiendo que cada item tiene un campo 'valor' que queremos sumar
      }
    }
    return parseFloat(acumulado.toFixed(4));
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
    
    // Crear objeto caja_movi basado en los datos del pedido (ahora devuelve una promesa)
    const cajaMoviPromise = this.crearCajaMovi(pedido, cabecera, fecha);
    
    // Manejar la promesa para obtener el objeto caja_movi con el id_caja correcto
    if (cajaMoviPromise && cajaMoviPromise.then) {
      // Es una promesa, esperamos a que se resuelva
      cajaMoviPromise.then(caja_movi => {
        console.log('Objeto caja_movi creado:', caja_movi);
        
        // Una vez tenemos el caja_movi con el id_caja correcto, continuamos
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
        });
      }).catch(error => {
        console.error('Error al crear el objeto caja_movi:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al crear el objeto de caja. Por favor, inténtelo de nuevo.'
        });
      });
    } else {
      // Si no hay items en el carrito, caja_movi puede ser null
      console.warn('No se pudo crear el objeto caja_movi');
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: 'No hay suficiente información para procesar el pedido.'
      });
    }
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
    const tableBody = items.map(item => [item.cantidad, item.nomart, item.precio, parseFloat((item.cantidad * item.precio).toFixed(4))]);
    
    // Obtener configuración de empresa según sucursal
    const empresaConfig = getEmpresaConfig();
    
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
            fillColor: 'transparent', // Color de relleno transparente
          },
        ],
      },
      content: [
        // Logo o texto según configuración
        ...(empresaConfig.logo ? [
          {
            image: empresaConfig.logo,
            width: 100,
            margin: [0, 0, 80, 0],
          }
        ] : [
          {
            text: empresaConfig.texto,
            fontSize: 24,
            bold: true,
            margin: [0, 20, 80, 20],
            style: 'mayorista'
          }
        ]),
        {
          columns: [
            {
              text: [
                { text: empresaConfig.direccion + '\n' },
                { text: empresaConfig.ciudad + '\n' },
                { text: this.sucursalNombre + '\n' },
                { text: empresaConfig.telefono + '\n' },
                { text: empresaConfig.email },
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
        mayorista: {
          bold: true,
          fontSize: 24,
          alignment: 'left',
          color: '#000000',
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
    
    // Obtener el id_caja de caja_conceptos basado en el idcp_ingreso de la tarjeta
    let idCaja = null;
    
    // Creamos una promesa para obtener el id_caja de forma asíncrona pero esperando el resultado
    const obtenerIdCaja = new Promise<number | null>((resolve) => {
      if (tarjetaInfo && tarjetaInfo.idcp_ingreso) {
        this._cargardata.getIdCajaFromConcepto(tarjetaInfo.idcp_ingreso).pipe(take(1)).subscribe(
          (response: any) => {
            if (response && response.mensaje && response.mensaje.length > 0) {
              idCaja = response.mensaje[0].id_caja;
              console.log(`ID de caja obtenido: ${idCaja} para el concepto: ${tarjetaInfo.idcp_ingreso}`);
              resolve(idCaja);
            } else {
              console.error('No se pudo obtener el id_caja para el concepto:', tarjetaInfo.idcp_ingreso);
              resolve(null);
            }
          },
          error => {
            console.error('Error al obtener id_caja:', error);
            resolve(null);
          }
        );
      } else {
        resolve(null);
      }
    });
    
    // Esperar a que se resuelva la promesa antes de crear el objeto cajaMovi
    return obtenerIdCaja.then(idCajaObtenido => {
      // Crear el objeto caja_movi con los campos solicitados y el id_caja obtenido
      const cajaMovi = {
        sucursal: limitNumericValue(this.sucursal, 999999),
        codigo_mov: tarjetaInfo ? limitNumericValue(tarjetaInfo.idcp_ingreso, 9999999999) : null,
        num_operacion: 0, // Se asignará en el backend cuando se genere el id_num
        fecha_mov: fechaFormateada,
        importe_mov: this.suma,
        descripcion_mov: '', // Se generará automáticamente en el backend para tipo_movi='A'
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
        caja: idCajaObtenido, // Asignamos el id_caja obtenido de caja_conceptos
        letra: cabecera.letra || '',
        punto_venta: limitNumericValue(this.puntoventa, 9999),
        tipo_comprobante: primerItem.tipodoc || this.tipoDoc,
        numero_comprobante: limitNumericValue(this.numerocomprobante, 99999999),
        marca_cerrado: null,
        usuario: primerItem.emailop || sessionStorage.getItem('emailOp') || '',
        fecha_proceso: fechaFormateada
      };
      
      return cajaMovi;
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions = [];
  }
}
