import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {HttpClient,HttpHeaders} from "@angular/common/http";
import {UrlBancos, UrlCajamovi, UrlCajamoviPorSucursal, UrlCajaconcepto, UrlCajaConceptoPorIdConcepto, UrlCajaLista, UrlArticulos,UrlArticuloById,UrlConflista,UrlValorCambio, UrlTipoMoneda,UrlRubroCompleto,UrlProveedor, UrlArtIva,UrlMarcaPorId,UrlMarca,UrlRubro,UrlRubroPorId,UrlRubroPrincipalPorId, UrlRubroPrincipal, UrlPedidoItemyCabIdEnvio,UrlPedidoItemPorSucursalh,UrlPedidoItemPorSucursal,UrlStockPorSucursal,UrlPedidoItemyCab,UrlPedidoItemyCabId, UrlpedidosucNombreTarj, UrlcabecerasucNombreTarj, UrlreciboxComprobante, UrlpedidoxComprobante, Urlarconmov,Urlartsucursal,Urltarjcredito,Urlclisucx, Urlvendedores, Urlpedidox, Urlcabecerax,Urlcabecerasuc, UrlcabeceraLastId,UrlPagoCabecera} from '../config/ini'
import { map } from "rxjs/operators";
import { TarjCredito } from '../interfaces/tarjcredito';

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
  tarjcredito(): Observable<any>
  {
    return this.http.get<{error: boolean, mensaje: TarjCredito[]}>(Urltarjcredito);
  }
  vendedores()
  {
    return this.http.get(Urlvendedores);
  }

  getRubroPrincipal() {
    return this.http.get(UrlRubroPrincipal);
  }

  getRubro() {
    return this.http.get(UrlRubro);
  }
  getRubroCompleto() {
    return this.http.get(UrlRubroCompleto);
  }
  getArtIva() {
    return this.http.get(UrlArtIva);
  } 
  getMarca() {
    return this.http.get(UrlMarca);
  }

  getProveedor() {
    return this.http.get(UrlProveedor);
  }
  getValorCambio() {
    return this.http.get(UrlValorCambio);
  }

  getTipoMoneda() {
    return this.http.get(UrlTipoMoneda);
  }
  
  getBancos() {
    return this.http.get(UrlBancos);
  }
  getConflista() {
    return this.http.get(UrlConflista);
  }
  getArticulos() {
    return this.http.get(UrlArticulos);
  }

  getCajaLista() {
    return this.http.get(UrlCajaLista);
  }
  getCajaconcepto() {
    return this.http.get(UrlCajaconcepto); // Asumiendo que esta URL devuelve todos los conceptos
  }
  
  getCajaconceptoPorId(id_concepto: number) {
    return this.http.post(UrlCajaConceptoPorIdConcepto, {
      "id_concepto": id_concepto
    });
  }

  getCajamovi() {
    return this.http.get(UrlCajamovi);
  }
  
  getCajamoviPorSucursal(sucursal: number | null) {
    if (sucursal === null) {
      // Si no se especifica sucursal, obtener todos los movimientos
      return this.http.get(UrlCajamovi);
    } else {
      // Si se especifica sucursal, filtrar por esa sucursal
      return this.http.post(UrlCajamoviPorSucursal, {
        "sucursal": sucursal
      });
    }
  }
  getArticuloById(id_articulo: number) {
    return this.http.post(UrlArticuloById, {
      "id_articulo": id_articulo
    });
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

  obtenerRubroPrincipalPorId(id_rubro_p:number) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(UrlRubroPrincipalPorId,{
      "id_rubro_p": id_rubro_p
    }) 
  }

  obtenerRubroPorId(id_rubro_p:number) // asi es como funcionaba con una tabla de cliente por sucursal
  {
    return this.http.post(UrlRubroPorId,{
      "id_rubro_p": id_rubro_p
    }) 
  }

  obtenerMarcaPorId(marca:number)
  {
    return this.http.post(UrlRubroPorId,{
      "id_marca": marca
    })
  }
  
  // Método para obtener el id_caja correspondiente a un id_concepto de la tabla caja_conceptos
  getIdCajaFromConcepto(id_concepto: number) {
    return this.http.post(UrlCajaConceptoPorIdConcepto, {
      "id_concepto": id_concepto
    });
  }
}
