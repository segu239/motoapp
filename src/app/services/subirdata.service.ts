import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { UrlUpdateCajamovi,UrlEliminarCajamovi,UrlSubirDatosCajamovi,UrlUpdateCajaconcepto, UrlSubirDatosCajaconcepto,UrlEliminarCajaconcepto,UrlUpdateCajaLista, UrlSubirDatosCajaLista, UrlEliminarCajaLista, UrlUpdateArticulo,UrlEliminarArticulo,UrlSubirDatosArticulo,UrlUpdateConflista, UrlSubirDatosConflista, UrlEliminarConflista,UrlUpdateValorCambio,UrlUpdateTipoMoneda,UrlSubirDatosValorCambio,UrlEliminarValorCambio, UrlSubirDatosTipoMoneda,UrlEliminarTipoMoneda,UrlEditProveedor,UrlSubirDatosProveedor,UrlEliminarProveedor, UrlSubirDatosArtIva,UrlUpdateMarca,UrlSubirDatosMarca,UrleliminarMarca,UrlUpdateRubro, UrleliminarRubro,UrlSubirDatosRubro,UrleliminarRubroPrincipal,UrlUpdateRubroPrincipal, UrlSubirDatosRubroPrincipal,UpdateArtsucxappWebManagedPHP, UpdateArtsucxappWeb, Urlclisucxapp, Urlpedidossucxapp, UrlpedidossucxappCompleto, Urlarticulossucxapp, Urlmixto, UpdateClisucxappWeb, UrlclisucxappWeb, UrleliminarCliente, UrlEliminarArtIva } from '../config/ini';

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

  subirDatosTipoMoneda(data: any) {
    return this.http.post(UrlSubirDatosTipoMoneda,
      {
        "cod_mone": data.cod_mone,
        "moneda": data.moneda,
        "simbolo": data.simbolo,

      });
  }

  subirDatosValorCambio(data: any) {
    return this.http.post(UrlSubirDatosValorCambio,
      {
        "codmone": data.codmone,
        "desvalor": data.desvalor,
        "fecdesde": data.fecdesde,
        "fechasta": data.fechasta,
        "vcambio": data.vcambio,

      });
  }
  subirDatosArticulo(articulo: any) {
    return this.http.post(UrlSubirDatosArticulo, articulo);
  }

  subirDatosCajamovi(cajamovi: any) {
    // El backend espera un objeto con los datos del movimiento
    return this.http.post(UrlSubirDatosCajamovi, cajamovi);
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

  eliminarTipoMoneda(id: any) {
    return this.http.post(UrlEliminarTipoMoneda,
      {
        "id_moneda": id
        

      });
  }
  eliminarValorCambio(id: any) {
    return this.http.post(UrlEliminarValorCambio,
      {
        "id_valor": id
        

      });
  }

  eliminarConflista(id: any) {
    return this.http.post(UrlEliminarConflista,
      {
        "id_conflista": id
      });
  }

  eliminarArticulo(id: any) {
    return this.http.post(UrlEliminarArticulo, {
      "id_articulo": id
    });
  }

  eliminarCajaLista(id: any) {
    return this.http.post(UrlEliminarCajaLista,
      {
        "id_caja": id
      });
  }

  eliminarCajaconcepto(id: number) {
    console.log("Enviando a eliminar ID:", id);
   return this.http.post(UrlEliminarCajaconcepto,
     {
       "id_concepto": id
     });
 }

 eliminarCajamovi(id: number) {
  // El backend espera un objeto con la clave "id_movimiento"
  return this.http.post(UrlEliminarCajamovi, {
    "id_movimiento": id
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

  subirDatosCajaLista(cajaLista: any){
    console.log(cajaLista);
    // El backend espera directamente el objeto
    return this.http.post(UrlSubirDatosCajaLista, cajaLista);
  }

  subirDatosCajaconcepto(cajaconcepto: any){
    console.log("Enviando a guardar:", cajaconcepto);
    return this.http.post(UrlSubirDatosCajaconcepto,
      {
        "descripcion": cajaconcepto.descripcion,
        "tipo_concepto": cajaconcepto.tipo_concepto,
        "fija": cajaconcepto.fija,
        "ingreso_egreso": cajaconcepto.ingreso_egreso,
        "id_caja": cajaconcepto.id_caja
        // id_concepto es autoincremental en la BD
      });
  }
  
  editarRubroPrincipal(id: any,rubro: any ) {
    return this.http.post(UrlUpdateRubroPrincipal,
      {
        "id_rubro_p": id,
        "rubro": rubro
      });
  }

  editProveedor(proveedor: any) {
    return this.http.post(UrlEditProveedor, {
      "id_prov": proveedor.id_prov,
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
        "id_rubro_p": rubro.id_rubro_p,
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
  
  subirDatosConflista(conflista: any){
    console.log(conflista);
   
    return this.http.post(UrlSubirDatosConflista,
      {
        "listap": conflista.listap,
        "activa": conflista.activa,
        "precosto21": conflista.precosto21,
        "precosto105": conflista.precosto105,
        "pordcto": conflista.pordcto,
        "margen": conflista.margen,
        "preciof21": conflista.preciof21,
        "preciof105": conflista.preciof105,
        "rmargen": conflista.rmargen,
        "tipomone": conflista.tipomone,
        "actprov": conflista.actprov,
        "cod_marca": conflista.cod_marca,
        "fecha": conflista.fecha
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

  updateTipoMoneda(moneda: any) {
    return this.http.post(UrlUpdateTipoMoneda, {
      "cod_mone": moneda.cod_mone,
      "moneda": moneda.moneda,
      "simbolo": moneda.simbolo,
      "id_moneda": moneda.id_moneda,
    
    });
 
  }

  updateValorCambio(valorcambio: any) {
    return this.http.post(UrlUpdateValorCambio, {
      "codmone": valorcambio.codmone,
      "desvalor": valorcambio.desvalor,
      "fecdesde": valorcambio.fecdesde,
      "fechasta": valorcambio.fechasta,
      "vcambio": valorcambio.vcambio,
      "id_valor": valorcambio.id_valor,
    });
  }

  updateConflista(conflista: any) {
    return this.http.post(UrlUpdateConflista, {
      "id_conflista": conflista.id_conflista,
      "listap": conflista.listap,
      "activa": conflista.activa,
      "precosto21": conflista.precosto21,
      "precosto105": conflista.precosto105,
      "pordcto": conflista.pordcto,
      "margen": conflista.margen,
      "preciof21": conflista.preciof21,
      "preciof105": conflista.preciof105,
      "rmargen": conflista.rmargen,
      "tipomone": conflista.tipomone,
      "actprov": conflista.actprov,
      "cod_marca": conflista.cod_marca,
      "fecha": conflista.fecha,
      "recalcular_21": conflista.recalcular_21,
      "recalcular_105": conflista.recalcular_105
    });
  }
  updateArticulo(articulo: any) {
    return this.http.post(UrlUpdateArticulo, {
      "id_articulo": articulo.id_articulo,
      "nomart": articulo.nomart,
      "marca": articulo.marca,
      "precon": articulo.precon,
      "prefi1": articulo.prefi1,
      "prefi2": articulo.prefi2,
      "prefi3": articulo.prefi3,
      "prefi4": articulo.prefi4,
      "exi1": articulo.exi1,
      "exi2": articulo.exi2,
      "exi3": articulo.exi3,
      "exi4": articulo.exi4,
      "exi5": articulo.exi5,
      "stkmin1": articulo.stkmin1,
      "stkmax1": articulo.stkmax1,
      "stkprep1": articulo.stkprep1,
      "stkmin2": articulo.stkmin2,
      "stkmax2": articulo.stkmax2,
      "stkprep2": articulo.stkprep2,
      "stkmin3": articulo.stkmin3,
      "stkmax3": articulo.stkmax3,
      "stkprep3": articulo.stkprep3,
      "stkmin4": articulo.stkmin4,
      "stkmax4": articulo.stkmax4,
      "stkprep4": articulo.stkprep4,
      "stkmin5": articulo.stkmin5,
      "stkmax5": articulo.stkmax5,
      "stkprep5": articulo.stkprep5,
      "cd_articulo": articulo.cd_articulo,
      "cd_proveedor": articulo.cd_proveedor,
      "cd_barra": articulo.cd_barra,
      "idart": articulo.idart,
      "estado": articulo.estado,
      "rubro": articulo.rubro,
      "articulo": articulo.articulo,
      "cod_iva": articulo.cod_iva,
      "prebsiva": articulo.prebsiva,
      "precostosi": articulo.precostosi,
      "margen": articulo.margen,
      "descuento": articulo.descuento,
      "cod_deposito": articulo.cod_deposito,
      "tipo_moneda": articulo.tipo_moneda
    });
  }

  updateCajaLista(cajaLista: any) {
    // El backend espera directamente el objeto con id_caja
   return this.http.post(UrlUpdateCajaLista, cajaLista);
 }

 updateCajaconcepto(cajaconcepto: any) {
  console.log("Enviando a actualizar:", cajaconcepto);
  return this.http.post(UrlUpdateCajaconcepto, {
    "id_concepto": cajaconcepto.id_concepto, // Necesario para identificar el registro
    "descripcion": cajaconcepto.descripcion,
    "tipo_concepto": cajaconcepto.tipo_concepto,
    "fija": cajaconcepto.fija,
    "ingreso_egreso": cajaconcepto.ingreso_egreso,
    "id_caja": cajaconcepto.id_caja
  });
}

updateCajamovi(cajamovi: any) {
  // El backend espera el objeto completo incluyendo id_movimiento
  return this.http.post(UrlUpdateCajamovi, cajamovi);
}

}
