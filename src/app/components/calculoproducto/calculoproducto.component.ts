import { Component, Inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { CarritoService } from 'src/app/services/carrito.service';
@Component({
  selector: 'app-calculoproducto',
  templateUrl: './calculoproducto.component.html',
  styleUrls: ['./calculoproducto.component.css']
})
export class CalculoproductoComponent {
  public clienteFrompuntoVenta: any;

  public producto: any;
  public cliente: any;
  public tarjeta: any;
  public cheque: any;
  public tipoVal: any;
  public codTarj: any
  public listaPrecio: any;
  public tipoMoneda: string = '';

  public pedido: any = {
    'idart': 0,
    'id_articulo': 0, // Agregamos id_articulo para la tabla psucursal3
    'cantidad': 0,
    'precio': 0,
    'idcli': 0,
    'idven': 0,
    'fecha': "",
    'hora': "",
    'tipoprecio': "",
    'cod_tar': 0,
    'titulartar': "",
    'numerotar': 0,
    'cod_mov': 0,
    'suc_destino': 0,
    'nomart': "",
    'nautotar': 0,
    'dni_tar': 0,
    'banco': "",
    'ncuenta': 0,
    'ncheque': 0,
    'nombre': "",
    'plaza': "",
    'importeimputar': 0,
    'importecheque': 0,
    'fechacheque': '01/01/1900'
  };
  public precio: number;
  public precioTotal: number;
  public cantidad: number;
  public datafromcondicionventa: any;
  public tipoPrecioString: string = '';
  constructor(private _carrito: CarritoService, private router: Router, public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig) {
    console.log("constructor");
    this.producto = this.config.data.producto;
    this.cliente = this.config.data.cliente;
    this.tarjeta = this.config.data.tarjeta;
    this.cheque = this.config.data.cheque;
    this.tipoVal = this.config.data.tipoVal;
    this.codTarj = this.config.data.codTarj;
    this.listaPrecio = this.config.data.listaPrecio;

    console.log("producto:" + JSON.stringify(this.producto));
    console.log("cliente:" + JSON.stringify(this.cliente));
    console.log("tarjeta:" + JSON.stringify(this.tarjeta));
    console.log("cheque:" + JSON.stringify(this.cheque));
    console.log("tipoVal:" + JSON.stringify(this.tipoVal));
    console.log("codTarj:" + JSON.stringify(this.codTarj));
    console.log("listaPrecio:" + JSON.stringify(this.listaPrecio));

    if (this.producto.tipo_moneda) {
      this.tipoMoneda = this.producto.tipo_moneda;
    }

    // Inicializar cantidad con 1
    this.cantidad = 1;

    //case dependiente de this.listaPrecio en caso de 0 this.producto.precon , si es 1 this.producto.prefi1 , si es 2 this.producto.prefi2, si es 3 this.producto.prefi3, si es 4 this.producto.prefi4
    switch (this.listaPrecio) {
      case "0":
        this.tipoPrecioString = 'Precio de Contado';
        this.precio = this.producto.precon;
        break;
      case "1":
        this.tipoPrecioString = 'Precio de Lista';
        this.precio = this.producto.prefi1;
        break;
      case "2":
        this.tipoPrecioString = 'Precio de Tarjeta';
        this.precio = this.producto.prefi2;
        break;
      case "3":
        this.tipoPrecioString = 'Precio 3';
        this.precio = this.producto.prefi3;
        break;
      case "4":
        this.tipoPrecioString = 'Precio 4';
        this.precio = this.producto.prefi4;
        break;
    }
    
    // Calcular el precio total inicial con precisión de 4 decimales
    this.precioTotal = parseFloat((this.precio * this.cantidad).toFixed(4));
  }

  ngOnDestroy() {
    if (this.ref) {
      this.ref.close();
    }
  }

  calcularPrecioTotal(newValue: number) {
    console.log('Calculando precio total con cantidad:', newValue);
    // Asegurarnos de que la cantidad sea válida
    if (newValue === undefined || newValue === null || isNaN(newValue) || newValue <= 0) {
      newValue = 1; // Valor por defecto
      this.cantidad = 1;
    }
    
    // Calcular el precio total con precisión de 4 decimales
    this.precioTotal = parseFloat((this.precio * newValue).toFixed(4));
    console.log('Precio unitario:', this.precio, 'Cantidad:', newValue, 'Precio total:', this.precioTotal);
  }

  comprar(event: Event) {
    event.preventDefault();
    this.generarPedido();
    console.log(this.pedido);
    this._carrito.agregarItemCarritoJson('carrito', this.pedido);
    this.precioTotal = 0;
    this.cantidad = 0;
    this.ref.close();
  }

  generarPedido() {
    // esto es para que se muestre en la factura , presupuesto, etc el nombre del cliente
    sessionStorage.setItem('datoscliente', JSON.stringify(this.cliente));
    let date = new Date();
    let fecha = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    let hora = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    console.log("PRECIO:" + this.precio);
    //completar los datos del objeto pedido en base a los datos recibidos de la pagina anterior
    if (this.producto.idart != undefined) {
      this.pedido.idart = parseInt(this.producto.idart);
    }
    // Agregar campo id_articulo si está disponible
    if (this.producto.id_articulo != undefined) {
      this.pedido.id_articulo = parseInt(this.producto.id_articulo);
    } else if (this.producto.idart != undefined) {
      // Si no está disponible id_articulo, usamos idart como fallback
      this.pedido.id_articulo = parseInt(this.producto.idart);
    }
    if (this.producto.nomart != undefined) {
      this.pedido.nomart = this.producto.nomart;
    }
    this.pedido.cantidad = this.cantidad;
    this.pedido.precio = parseFloat(this.precio.toFixed(2));// ACA PUSE PRECIO Y NO precioTOTAL por el motivo de que en el carrito me va sumado

    // ════════════════════════════════════════════════════════════
    // ✅ NUEVO v4.0: Guardar TODOS los precios y metadatos
    // ════════════════════════════════════════════════════════════
    this.pedido.precon = this.producto.precon || 0;
    this.pedido.prefi1 = this.producto.prefi1 || 0;
    this.pedido.prefi2 = this.producto.prefi2 || 0;
    this.pedido.prefi3 = this.producto.prefi3 || 0;
    this.pedido.prefi4 = this.producto.prefi4 || 0;
    this.pedido.tipo_moneda = this.producto.tipo_moneda || 3; // Default ARS

    // Buscar activadatos de la tarjeta seleccionada
    // Nota: this.config.data.tarjeta puede contener info de la tarjeta
    const activadatos = this.obtenerActivadatosDeCondicionVenta();
    this.pedido.activadatos = activadatos;

    // Guardar nombre del tipo de pago para referencia
    this.pedido.tipoPago = this.obtenerNombreTipoPago();

    console.log('✅ Item agregado con metadatos completos:', {
      id_articulo: this.pedido.id_articulo,
      precio_seleccionado: this.pedido.precio,
      precios_disponibles: {
        precon: this.pedido.precon,
        prefi1: this.pedido.prefi1,
        prefi2: this.pedido.prefi2,
        prefi3: this.pedido.prefi3,
        prefi4: this.pedido.prefi4
      },
      tipo_moneda: this.pedido.tipo_moneda,
      activadatos: this.pedido.activadatos,
      cod_tar: this.pedido.cod_tar,
      tipoPago: this.pedido.tipoPago
    });
    // ════════════════════════════════════════════════════════════

    if (this.cliente.idcli != undefined) {
      this.pedido.idcli = parseInt(this.cliente.idcli);
    }
    if (this.cliente.idven != undefined) {
      this.pedido.idven = this.cliente.cod_ven;
    }
    if (this.cliente.fecha != undefined) {
      this.pedido.fecha = fecha;
    }
    if (this.cliente.hora != undefined) {
      this.pedido.hora = hora;
    }
    if (this.listaPrecio != undefined) {
      this.pedido.tipoprecio = this.listaPrecio;
    }
    if (this.codTarj != undefined) {
      this.pedido.cod_tar = parseInt(this.codTarj);
    }
    if (this.tarjeta.Titular != undefined) {
      this.pedido.titulartar = this.tarjeta.Titular;
    }
    if (this.tarjeta.Numero != undefined) {
      this.pedido.numerotar = parseInt(this.tarjeta.Numero);
    }
    if (this.tarjeta.Autorizacion != undefined) {
      this.pedido.nautotar = parseInt(this.tarjeta.Autorizacion);
    }
    if (this.tarjeta.Dni != undefined) {
      this.pedido.dni_tar = parseInt(this.tarjeta.Dni);
    }
    if (this.cheque.Banco != undefined) {
      this.pedido.banco = this.cheque.Banco;
    }
    if (this.cheque.Ncuenta != undefined) {
      this.pedido.ncuenta = parseInt(this.cheque.Ncuenta);
    }
    if (this.cheque.Ncheque != undefined) {
      this.pedido.ncheque = parseInt(this.cheque.Ncheque);
    }
    if (this.cheque.Nombre != undefined) {
      this.pedido.nombre = this.cheque.Nombre;
    }
    if (this.cheque.Plaza != undefined) {
      this.pedido.plaza = this.cheque.Plaza;
    }
    if (this.cheque.ImporteImputar != undefined) {
      this.pedido.importeimputar = parseInt(this.cheque.ImporteImputar);
    }
    if (this.cheque.ImporteCheque != undefined) {
      this.pedido.importecheque = parseInt(this.cheque.ImporteCheque);
    }
    console.log("FECHA CHEQUE:" + this.cheque.FechaCheque);
    if (this.cheque.FechaCheque != undefined && this.cheque.FechaCheque != "") {
      this.pedido.fechacheque = this.cheque.FechaCheque;
    }
    else {
      this.pedido.fechacheque = "1900-01-01";
    }
  }

  // ════════════════════════════════════════════════════════════
  // ✅ NUEVO v4.0: MÉTODOS AUXILIARES PARA METADATOS
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene el activadatos del tipo de pago seleccionado
   * Intentamos obtenerlo de sessionStorage donde se guarda la condición de venta
   */
  private obtenerActivadatosDeCondicionVenta(): number {
    try {
      const condicionVentaStr = sessionStorage.getItem('condicionVentaSeleccionada');
      if (condicionVentaStr) {
        const condicionVenta = JSON.parse(condicionVentaStr);
        // La condición de venta puede tener activadatos guardado
        if (condicionVenta.activadatos !== undefined && condicionVenta.activadatos !== null) {
          return condicionVenta.activadatos;
        }
      }
    } catch (error) {
      console.warn('No se pudo leer activadatos de sessionStorage:', error);
    }

    // Fallback: intentar inferir de los datos disponibles
    // Si tiene datos de tarjeta, probablemente es activadatos=1
    if (this.tarjeta && this.tarjeta.Titular) {
      return 1;
    }
    // Si tiene datos de cheque, probablemente es activadatos=2
    if (this.cheque && this.cheque.Banco) {
      return 2;
    }
    // Por defecto, sin datos adicionales
    return 0;
  }

  /**
   * Obtiene el nombre del tipo de pago actual
   */
  private obtenerNombreTipoPago(): string {
    try {
      const condicionVentaStr = sessionStorage.getItem('condicionVentaSeleccionada');
      if (condicionVentaStr) {
        const condicionVenta = JSON.parse(condicionVentaStr);
        if (condicionVenta.nombreTarjeta) {
          return condicionVenta.nombreTarjeta;
        }
      }
    } catch (error) {
      console.warn('No se pudo leer nombre de tipo de pago:', error);
    }

    // Fallback genérico
    return 'Sin especificar';
  }

  // ════════════════════════════════════════════════════════════
  // FIN DE MÉTODOS AUXILIARES
  // ════════════════════════════════════════════════════════════
}
