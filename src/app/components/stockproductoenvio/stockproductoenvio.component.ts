import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { CarritoService } from 'src/app/services/carrito.service';
import { PedidoItem } from 'src/app/interfaces/pedidoItem';
import { Pedidoscb } from 'src/app/interfaces/pedidoscb';
import { CargardataService } from 'src/app/services/cargardata.service';
import { CrudService } from 'src/app/services/crud.service';

@Component({
  selector: 'app-stockproductoenvio',
  templateUrl: './stockproductoenvio.component.html',
  styleUrls: ['./stockproductoenvio.component.css']
})
export class StockproductoenvioComponent implements OnInit {
  sucursales = [];
tipos = ["PE","M-","M+"];
selectedSucursal: number;
  public producto: any;
  public cantidad: number;
  public comentario: string;
  public usuario: string;
  public sucursal: string;
  constructor(
    private cargardata: CargardataService, 
    private _carrito: CarritoService, 
    private router: Router, 
    public ref: DynamicDialogRef,
    private _crud: CrudService,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig
  ) {
    this.producto = this.config.data.producto;
    console.log("producto:" + JSON.stringify(this.producto));
    this.usuario = sessionStorage.getItem('usernameOp')
    this.sucursal = sessionStorage.getItem('sucursal')
  }

  ngOnInit() {
    this.cargarSucursales();
  }

  cargarSucursales() {
    this._crud.getListSnap('sucursales').subscribe(
      data => {
        this.sucursales = data.map(item => {
          const payload = item.payload.val() as any;
          return {
            label: payload.nombre,
            value: parseInt(payload.value)
          };
        });
      },
      error => {
        console.error('Error al cargar sucursales:', error);
        // Valores por defecto en caso de error
        this.sucursales = [
          { label: 'Suc. Valle Viejo', value: 2 },
          { label: 'Suc. Guemes', value: 3 },
          { label: 'Deposito', value: 4 }
        ];
      }
    );
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
        estado: "Enviado",
        id_num: 456
       /*  id: 123,
        producto: this.producto,
        cantidad: this.cantidad */

      };
      const pedidoscb:any ={//const pedidoscb: Pedidoscb = {
        id_num: 123,//auto generado
        tipo: "PE",
        //numero: 456,//--autoincremental
        sucursald: Number(this.sucursal),
        sucursalh: this.selectedSucursal,
        fecha: fechaFormateada,
        usuario: this.usuario,
        observacion: this.comentario,
        estado: "Enviado",
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
