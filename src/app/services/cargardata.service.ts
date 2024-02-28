import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {HttpClient,HttpHeaders} from "@angular/common/http";
import {Urlarconmov,Urlartsucursal,Urltarjcredito,Urlclisucx, Urlvendedores} from '../config/ini'
import { map } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class CargardataService {

  constructor(private http:HttpClient) { }

  arconmov()
  {
    return this.http.get(Urlarconmov); //HTTP CLIENT DEVUELVE UN JSON POR DEFECTO, NO HACE FALTA UTILIZAR MAP

  }
  artsucursal()
  {
    return this.http.get(Urlartsucursal);
  }
  tarjcredito()
  {
    return this.http.get(Urltarjcredito);
  }
  vendedores()
  {
    return this.http.get(Urlvendedores);
  }
  clisucx(cod_sucursal:string) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(Urlclisucx,{
      "sucursal": cod_sucursal
    }) 
  }
 
}
