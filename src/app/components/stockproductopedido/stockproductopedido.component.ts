import { Component, Inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { CarritoService } from 'src/app/services/carrito.service';
import { PedidoItem } from 'src/app/interfaces/pedidoItem';
import { Pedidoscb } from 'src/app/interfaces/pedidoscb';
import { CargardataService } from 'src/app/services/cargardata.service';


@Component({
  selector: 'app-stockproductopedido',
  templateUrl: './stockproductopedido.component.html',
  styleUrls: ['./stockproductopedido.component.css']
})
export class StockproductopedidoComponent {
  sucursales = [
    { label: 'Suc. Valle Viejo', value: 2 },
    { label: 'Suc. Guemes', value: 3 },
    { label: 'Deposito', value: 4 }
];
tipos = ["PE","M-","M+"];
selectedSucursal: number;
  public producto: any;
  public cantidad: number;
  public comentario: string;
  public usuario: string;
  public sucursal: string;
  constructor(private cargardata:CargardataService, private _carrito: CarritoService, private router: Router, public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig) {
      this.producto = this.config.data.producto;
      console.log("producto:" + JSON.stringify(this.producto));
      this.usuario = localStorage.getItem('usernameOp')
      this.sucursal = localStorage.getItem('sucursal')
    }
    ngOnDestroy() {
      if (this.ref) {
        this.ref.close();
      }
    }
    comprar(event: Event) {
      event.preventDefault();
      /* let fecha = new Date();
    let fechaFormateada = fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }); */
    let fecha = new Date();
  let fechaFormateada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());


      const pedidoItem: PedidoItem = {
        id_items: 1,  //es autogenerado
        tipo: "PE",
        cantidad: this.cantidad,
        id_art: this.producto.idart,
        descripcion: this.producto.nomart,
        precio: this.producto.precon,
        fecha_resuelto: fechaFormateada,
        usuario_res: this.usuario,
        observacion: this.comentario,
        estado: "Solicitado",
        id_num: 456 //autogenerado
       /*  id: 123,
        producto: this.producto,
        cantidad: this.cantidad */

      };
      const pedidoscb: Pedidoscb = {
        id_num: 123,//auto generado
        tipo: "PE",
        numero: 456,//--autoincremental
        sucursald: Number(this.sucursal),
        sucursalh: this.selectedSucursal,
        fecha: fechaFormateada,
        usuario: this.usuario,
        observacion: this.comentario,
        estado: "Solicitado",
        id_aso: 222
      };

      console.log(event);
     /*  this.generarPedido();
      console.log(this.pedido);
      this._carrito.agregarItemCarritoJson('carrito', this.pedido);
      this.precioTotal = 0;
      this.cantidad = 0;
      this.ref.close(); */

      this.cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe(
        response => {
          console.log('Pedido creado exitosamente', response);
          
          this.ref.close();
        },
        error => {
          console.error('Error al crear el pedido', error);
        }
      );
    }
}
