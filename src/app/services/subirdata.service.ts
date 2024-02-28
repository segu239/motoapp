import { Injectable } from '@angular/core';
import {HttpClient,HttpHeaders} from "@angular/common/http";
import {UpdateArtsucxappWebManagedPHP,UpdateArtsucxappWeb,Urlclisucxapp, Urlpedidossucxapp,Urlarticulossucxapp, Urlmixto,UpdateClisucxappWeb,UrlclisucxappWeb,UrleliminarCliente} from '../config/ini';


@Injectable({
  providedIn: 'root'
})
export class SubirdataService {

  constructor(private http:HttpClient) { }

  editarStockArtSucx(idart:number,suc:number, op:string)
  {
    return this.http.post(UpdateArtsucxappWeb,
    {
        "idart": idart,
        "exi": suc,
        "op": op,//"+", "-"

    });
  }

  editarStockArtSucxManagedPHP(result:any, suc:number)
  {
    return this.http.post(UpdateArtsucxappWebManagedPHP,
    {
        "result": result,
        "exi": suc

    });
  }

  editarDatosClientes(data:any,id:any)
  {
    return this.http.post(UpdateClisucxappWeb,
    {
        "clientes": data,
        "id_vend": id

    });
  }
  subirDatosClientes(data:any,id:any)
  {
    return this.http.post(UrlclisucxappWeb,
    {
        "clientes": data,
        "id_vend": id

    });
  }

  subirDatosPedidos(data:any,id:any)
  {
    console.log(data);
    console.log(id);
    return this.http.post(Urlpedidossucxapp,
    {
        "pedidos": data,
        "id_vend": id

    });
  }

  subirDatosArticulos(data:any,id:any)
  {
    return this.http.post(Urlarticulossucxapp,
    {
        "articulos": data,
        "id_vend": id

    });
  }

  subirDatosMixto(data:any,id:any)
  {
    return this.http.post(Urlmixto,
    {
        "mixto": data,
        "id_vend": id

    });
  }

  eliminarCliente(data:any,id:any)
  {
    return this.http.post(UrleliminarCliente,
    {
        "clientes": data,
        "id_vend": id

    });
  }
}
