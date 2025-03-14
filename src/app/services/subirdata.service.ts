import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { UrlSubirDatosProveedor,UrlEliminarProveedor, UrlSubirDatosArtIva,UrlUpdateMarca,UrlSubirDatosMarca,UrleliminarMarca,UrlUpdateRubro, UrleliminarRubro,UrlSubirDatosRubro,UrleliminarRubroPrincipal,UrlUpdateRubroPrincipal, UrlSubirDatosRubroPrincipal,UpdateArtsucxappWebManagedPHP, UpdateArtsucxappWeb, Urlclisucxapp, Urlpedidossucxapp, UrlpedidossucxappCompleto, Urlarticulossucxapp, Urlmixto, UpdateClisucxappWeb, UrlclisucxappWeb, UrleliminarCliente, UrlEliminarArtIva } from '../config/ini';

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

  eliminarArtIva(id: any) {
    return this.http.post(UrlEliminarArtIva,
      {
        "id_ariva": id
        

      });
  }

  eliminarmarca(id: any) {
    return this.http.post(UrleliminarMarca,
      {
        "id_marca": id
        

      });
  }

  eliminarproveedor(id: any) {
    return this.http.post(UrlEliminarProveedor,
      {
        "id_prov": id
        

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
  subirDatosMarca(marca: any){
    console.log(marca);
   
    return this.http.post(UrlSubirDatosMarca,
      {
        "cod_marca": marca.cod_marca,
        "marca": marca.marca

      });
  }
  subirDatosArtIva(artiva: any){
    console.log(artiva);
   
    return this.http.post(UrlSubirDatosArtIva,
      {
        "cod_iva": artiva.cod_iva,
        "descripcion": artiva.descripcion, // Note: API returns "descripcio" not "descripcion"
              "desde": artiva.desde,       // Map "desde" to "desde_date"
              "hasta": artiva.hasta,       // Map "hasta" to "hasta_date"
              "tipo_ali_1": artiva.tipo_ali_1,
              "alicuota1": artiva.alicuota1,
              "tipo_ali_2": artiva.tipo_ali_2,
              "alicuota2": artiva.alicuota2,
              "tipo_ali_3": artiva.tipo_ali_3,
              "alicuota3": artiva.alicuota3,
              "cuit": artiva.cuit === 't',      // Convert 't'/'f' to boolean
              

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

  subirDatosProveedor(proveedor: any){
    console.log(proveedor);
   
    return this.http.post(UrlSubirDatosProveedor, {
      "cod_prov": proveedor.cod_prov,
      "nombre": proveedor.nombre,
      "direccion": proveedor.direccion,
      "codpos": proveedor.codpos,
      "localidad": proveedor.localidad,
      "telefono": proveedor.telefono,
      "cuit": proveedor.cuit,
      "contacto": proveedor.contacto,
      "rubro": proveedor.rubro,
      "cod_iva": proveedor.cod_iva,
      "ganancias": proveedor.ganancias,
      "ingbrutos": proveedor.ingbrutos,
      "email": proveedor.email,
      "www": proveedor.www,
      "cta_proveedores": proveedor.cta_proveedores,
      "fec_proceso": proveedor.fec_proceso
      // id_prov is serial and will be auto-generated by the database
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

  updateMarca(marca: any) {
    return this.http.post(UrlUpdateMarca, {
      "id_marca": marca.id_marca,
      "cod_marca": marca.cod_marca,
      "marca": marca.marca,
    });
  }
}
