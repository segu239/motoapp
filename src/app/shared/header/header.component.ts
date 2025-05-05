import { Component, OnInit } from '@angular/core';
import { CarritoService } from 'src/app/services/carrito.service';
import { DialogService } from 'primeng/dynamicdialog';
import { GrillaComponent } from 'src/app/components/grilla/grilla.component'; // Asegúrate de que la ruta sea correcta
import { CrudService } from 'src/app/services/crud.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  providers: [DialogService]
})
export class HeaderComponent implements OnInit {
public sucursal: string = '';
public cantidad: number = 0;
public sucursalNombre: string = '';


constructor(
  private dialogService: DialogService, 
  private carritoService: CarritoService,
  private _crud: CrudService
) {
  this.sucursal = sessionStorage.getItem('sucursal');
  this.cargarNombreSucursal();
}

ngOnInit(): void {
  this.carritoService.carritoObservable.subscribe((items: any[]) => {
    this.cantidad = items.length;
    console.log(items);
  });
}

cargarNombreSucursal() {
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
        console.warn('No se encontró la sucursal con ID:', this.sucursal);
        this.sucursalNombre = 'Sucursal ' + this.sucursal;
      }
    },
    error => {
      console.error('Error al cargar sucursales:', error);
      // En caso de error, usar valores hardcoded como fallback
      if (this.sucursal == '1') {
        this.sucursalNombre = 'Casa Central';
      }
      else if (this.sucursal == '2') {
        this.sucursalNombre = 'Suc. Valle Viejo';
      }
      else if (this.sucursal == '3') {
        this.sucursalNombre = 'Suc. Guemes';
      }
      else if (this.sucursal == '4') {
        this.sucursalNombre = 'Deposito';
      } else {
        this.sucursalNombre = 'Sucursal ' + this.sucursal;
      }
    }
  );
}

openGrilla() {
  this.dialogService.open(GrillaComponent, {
    header: 'Grilla',
    width: '70%'
  });
}
  }


