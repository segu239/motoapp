import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { UrlUpdateRubro, UrleliminarRubro,UrlSubirDatosRubro,UrleliminarRubroPrincipal,UrlUpdateRubroPrincipal, UrlSubirDatosRubroPrincipal,UpdateArtsucxappWebManagedPHP, UpdateArtsucxappWeb, Urlclisucxapp, Urlpedidossucxapp, UrlpedidossucxappCompleto, Urlarticulossucxapp, Urlmixto, UpdateClisucxappWeb, UrlclisucxappWeb, UrleliminarCliente } from '../config/ini';

@Injectable({
  providedIn: 'root'
})
export class SubirdataService {
  constructor(private http: HttpClient) { }
  editarStockArtSucx(idart: number, suc: number, op: string) {
    return this.http.post(UpdateArtsucxappWeb,
      {
        "idart": idart,
        "exi": suc,
        "op": op,//"+", "-"
      });
  }

  editarStockArtSucxManagedPHP(result: any, suc: number) {
    return this.http.post(UpdateArtsucxappWebManagedPHP,
      {
        "result": result,
        "exi": suc

      });
  }

  editarDatosClientes(data: any, id: any) {
    return this.http.post(UpdateClisucxappWeb,
      {
        "clientes": data,
        "id_vend": id
      });
  }
  subirDatosClientes(data: any, id: any) {
    return this.http.post(UrlclisucxappWeb,
      {
        "clientes": data,
        "id_vend": id
      });
  }
  subirDatosPedidos(data: any, cabecera: any, id: any) {
    console.log(data);
    console.log(id);
    return this.http.post(UrlpedidossucxappCompleto,
      {
        "pedidos": data,
        "cabecera": cabecera,
        "id_vend": id

      });
  }

  subirDatosArticulos(data: any, id: any) {
    return this.http.post(Urlarticulossucxapp,
      {
        "articulos": data,
        "id_vend": id

      });
  }

  subirDatosMixto(data: any, id: any) {
    return this.http.post(Urlmixto,
      {
        "mixto": data,
        "id_vend": id

      });
  }

  eliminarCliente(data: any, id: any) {
    return this.http.post(UrleliminarCliente,
      {
        "clientes": data,
        "id_vend": id

      });
  }

  eliminarRubroPrincipal(id: any) {
    return this.http.post(UrleliminarRubroPrincipal,
      {
        "id_rubro_p": id
        

      });
  }

  eliminarRubro(id: any) {
    return this.http.post(UrleliminarRubro,
      {
        "id_rubro": id
        

      });
  }
  subirDatosRubroPrincipal(rubroprincipal: any){
    console.log(rubroprincipal);
   
    return this.http.post(UrlSubirDatosRubroPrincipal,
      {
        "cod_rubro": rubroprincipal.cod_rubro,
        "rubro": rubroprincipal.rubro

      });
  }

 

  editarRubroPrincipal(id: any,rubro: any ) {
    return this.http.post(UrlUpdateRubroPrincipal,
      {
        "id_rubro_p": id,
        "rubro": rubro
      });
  }

  subirDatosRubro(rubro: any){
    console.log(rubro);
   
    return this.http.post(UrlSubirDatosRubro,
      {
        "cod_rubro": rubro.cod_rubro,
        "rubro": rubro.rubro,
        "numerador": rubro.numerador,
        "modiprecio": rubro.modiprecio,
        "modidescri": rubro.modidescri,
        "cod_depo": rubro.cod_depo,
        "mustuni": rubro.mustuni,
        

      });
  }

 
  
  updateRubro(rubro: any) {
    return this.http.post(UrlUpdateRubro, {
      "id_rubro": rubro.id_rubro,
      "cod_rubro": rubro.cod_rubro,
      "rubro": rubro.rubro,
      "numerador": rubro.numerador,
      "modiprecio": rubro.modiprecio,
      "modidescri": rubro.modidescri,
      "cod_depo": rubro.cod_depo,
      "mustuni": rubro.mustuni
    });
  }
}
