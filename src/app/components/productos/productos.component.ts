import { Component } from '@angular/core';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent {
public estado: string; // variable para guardar el estado
constructor () {

}
// Función para abrir el modal
async openModal() {
  const { value } = await Swal.fire({
    title: 'Seleccione un estado',
    input: 'select',
    inputOptions: {
      // Supongamos que tienes los siguientes estados
      'estado1': 'Estado 1',
      'estado2': 'Estado 2',
      'estado3': 'Estado 3'
    },
    showCancelButton: true,
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancelar'
  })

  if (value) {
    this.estado = value;
    Swal.fire(`Has seleccionado: ${value}`)
  }
}

}
