import { Component, OnInit } from '@angular/core';
import { ArticulosPaginadosService } from './services/articulos-paginados.service';

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

  constructor(private articulosPaginadosService: ArticulosPaginadosService) {}

  ngOnInit() {
    console.log("APP COMPONENTS");
    init_plugins();
  }
}
