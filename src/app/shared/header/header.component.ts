import { Component, OnInit } from '@angular/core';
import { CarritoService } from 'src/app/services/carrito.service';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
public sucursal: string = '';
public cantidad: number = 0;
public sucursalNombre: string = '';


constructor(private carritoService: CarritoService) {
  this.sucursal = localStorage.getItem('sucursal');
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
  }
  
}

ngOnInit(): void {
  this.carritoService.carritoObservable.subscribe((items: any[]) => {
    this.cantidad = items.length;
    console.log(items);
  });
}
  }


