import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CargardataService } from 'src/app/services/cargardata.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-grilla',
  templateUrl: './grilla.component.html',
  styleUrls: ['./grilla.component.css']
})
export class GrillaComponent {
  productos: any[] = [];

  constructor(
    private cargarDataService: CargardataService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {}

  ngOnInit(): void {
    
    this.cargarDataService.artsucursal().subscribe((data:any) => {
      console.log(data);
      this.productos = data.mensaje;
    }, (error) => {
      this.showNotification('Error al cargar los productos');
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
