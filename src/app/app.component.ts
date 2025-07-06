import { Component, OnInit } from '@angular/core';

declare function init_plugins();
declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'motoapp';

  constructor() {}

  ngOnInit() {
    console.log("APP COMPONENTS");
    init_plugins();
    
    // ELIMINADO: Ya no necesario - el filtrado se maneja automáticamente en backend
    // El backend aplica automáticamente el filtro cod_deposito=2 para sucursal=5
  }
}
