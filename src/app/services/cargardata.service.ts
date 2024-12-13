import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {HttpClient,HttpHeaders} from "@angular/common/http";
import {UrlPedidoItemyCabIdEnvio,UrlPedidoItemPorSucursalh,UrlPedidoItemPorSucursal,UrlStockPorSucursal,UrlPedidoItemyCab,UrlPedidoItemyCabId, UrlpedidosucNombreTarj, UrlcabecerasucNombreTarj, UrlreciboxComprobante, UrlpedidoxComprobante, Urlarconmov,Urlartsucursal,Urltarjcredito,Urlclisucx, Urlvendedores, Urlpedidox, Urlcabecerax,Urlcabecerasuc, UrlcabeceraLastId,UrlPagoCabecera} from '../config/ini'
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
 
  pedidox(cod_sucursal:string)
  {
    return this.http.post(Urlpedidox,{
      "sucursal": cod_sucursal
    })
  }

  pedidoxComprobante(cod_sucursal:string, comprobante:any)
  {
    return this.http.post(UrlpedidoxComprobante,{
      "sucursal": cod_sucursal,
      "comprobante": comprobante
    })
  }
  pedidosucNombreTarj(cod_sucursal:string) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(UrlpedidosucNombreTarj,{
      "sucursal": cod_sucursal
    }) 
  }
  reciboxComprobante(cod_sucursal:string, comprobante:any)
  {
    return this.http.post(UrlreciboxComprobante,{
      "sucursal": cod_sucursal,
      "comprobante": comprobante
    })
  }
  // cabeceras por sucursal 
  cabecerasucNombreTarj(cod_sucursal:string) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(UrlcabecerasucNombreTarj,{
      "sucursal": cod_sucursal
    }) 
  }
// cabeceras por sucursal
  cabecerasuc(cod_sucursal:string) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(Urlcabecerasuc,{
      "sucursal": cod_sucursal
    }) 
  }  
// cabeceras por cliente
  cabecerax(cod_sucursal:string, cliente:any) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(Urlcabecerax,{
      "sucursal": cod_sucursal,
      "cliente": cliente
    }) 
  }

  lastIdnum(cod_sucursal:string) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(UrlcabeceraLastId,{
      "sucursal": cod_sucursal
    
    }) 
  }

  pagoCabecera(cod_sucursal:string, pagoCC:any) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(UrlPagoCabecera,{
      "sucursal": cod_sucursal,
      "pagoCC": pagoCC
    }) 
  }

  crearPedidoStock(pedidoItem:any, pedidoscb: any)
  {
   return this.http.post(UrlPedidoItemyCab,{
   
     "pedidoItem": pedidoItem,
     "pedidoscb": pedidoscb
  
  
 });
 }

  crearPedidoStockId(id_num:any,pedidoItem:any, pedidoscb: any)
   {
    return this.http.post(UrlPedidoItemyCabId,{
      "id_num": id_num,
      "pedidoItem": pedidoItem,
      "pedidoscb": pedidoscb
   
   
  });
  }

  crearPedidoStockIdEnvio(id_num:any,pedidoItem:any, pedidoscb: any)
  {
   return this.http.post(UrlPedidoItemyCabIdEnvio,{
     "id_num": id_num,
     "pedidoItem": pedidoItem,
     "pedidoscb": pedidoscb
   });
  }

  obtenerStockPorSucursal(sucursal: string) {
    return this.http.post(UrlStockPorSucursal, { 
      "sucursal": sucursal });
  }

  obtenerPedidoItemPorSucursal(sucursal: string) {
    return this.http.post(UrlPedidoItemPorSucursal, { 
      "sucursal": sucursal });
  }

  obtenerPedidoItemPorSucursalh(sucursal: string) {
    return this.http.post(UrlPedidoItemPorSucursalh, { 
      "sucursal": sucursal });
  }
}
