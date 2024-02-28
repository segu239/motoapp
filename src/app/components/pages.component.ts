import { Component, OnInit } from '@angular/core';
//import { CargardataService } from '../services/cargardata.service';
//import { first, take } from 'rxjs/operators';
declare function init_plugins();

@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.css']
})
export class PagesComponent implements OnInit {

  constructor() 
  { 
  /*   this._cargardata.tarjcredito().pipe(take(1)).subscribe((resp:any)=>{
      console.log(resp.mensaje);
      localStorage.setItem('tarjetas', JSON.stringify(resp.mensaje));
      localStorage.setItem('lastSelectedValue', JSON.stringify({'tarjeta':'EFECTIVO'}));
    }); */
    
  }

  ngOnInit(){
    console.log("PAGES COMPONENTS");
    init_plugins();
  }

}
