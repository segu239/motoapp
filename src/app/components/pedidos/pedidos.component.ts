import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CargardataService } from 'src/app/services/cargardata.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pedidos',
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.css']
})
export class PedidosComponent implements OnInit{
  pedidos: any[] = [];

  constructor(
    private cargarDataService: CargardataService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {}

  ngOnInit(): void {
    const { cod_sucursal, comprobante } = this.config.data;
    this.cargarDataService.pedidoxComprobante(cod_sucursal, comprobante).subscribe((data:any) => {
      console.log(data);
      this.pedidos = data.mensaje;
    }, (error) => {
      this.showNotification('Error al cargar los pedidos');
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
}
