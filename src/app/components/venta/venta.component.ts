import { Component } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-venta',
  templateUrl: './venta.component.html',
  styleUrls: ['./venta.component.css']
})
export class VentaComponent {
public carritoString:string;
public carritoArray: any[] = [];  
constructor(private activatedRoute: ActivatedRoute)
{
  this.carritoString = this.activatedRoute.snapshot.queryParamMap.get('carrito');
  this.carritoArray = JSON.parse(this.carritoString);
  console.log(this.carritoArray);
}
}
