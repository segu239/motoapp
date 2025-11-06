import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {HttpClient,HttpHeaders} from "@angular/common/http";
import {UrlBancos, UrlCajamovi, UrlCajamoviPorSucursal, UrlCajaconcepto, UrlCajaConceptoPorIdConcepto, UrlCajaLista, UrlArticulos,UrlArticuloById,UrlConflista,UrlValorCambio, UrlTipoMoneda,UrlRubroCompleto,UrlProveedor, UrlArtIva,UrlMarcaPorId,UrlMarca,UrlRubro,UrlRubroPorId,UrlRubroPrincipalPorId, UrlRubroPrincipal, UrlPedidoItemyCabIdEnvio,UrlPedidoItemPorSucursalh,UrlPedidoItemPorSucursal,UrlStockPorSucursal,UrlPedidoItemyCab,UrlPedidoItemyCabId, UrlpedidosucNombreTarj, UrlcabecerasucNombreTarj, UrlreciboxComprobante, UrlpedidoxComprobante, Urlarconmov,Urlartsucursal,Urltarjcredito,Urlclisucx, Urlvendedores, Urlpedidox, Urlcabecerax,Urlcabecerasuc, UrlcabeceraLastId,UrlPagoCabecera, UrlCancelarPedidoStock, UrlAltaExistencias, UrlObtenerAltasConCostos, UrlCancelarAltaExistencias} from '../config/ini'
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

  /**
   * Cancela un pedido de stock
   * @param id_num ID del pedido a cancelar
   * @param usuario Usuario que cancela
   * @param motivo_cancelacion Motivo de la cancelación
   * @param fecha_cancelacion Fecha de cancelación (opcional)
   * @returns Observable con la respuesta del backend
   */
  cancelarPedidoStock(
    id_num: number,
    usuario: string,
    motivo_cancelacion: string,
    fecha_cancelacion?: Date
  ) {
    const payload: any = {
      id_num: id_num,
      usuario: usuario,
      motivo_cancelacion: motivo_cancelacion
    };

    if (fecha_cancelacion) {
      // Formatear fecha como YYYY-MM-DD
      const year = fecha_cancelacion.getFullYear();
      const month = String(fecha_cancelacion.getMonth() + 1).padStart(2, '0');
      const day = String(fecha_cancelacion.getDate()).padStart(2, '0');
      payload.fecha_cancelacion = `${year}-${month}-${day}`;
    }

    return this.http.post(UrlCancelarPedidoStock, payload);
  }

  // ============================================================================
  // MÉTODOS PARA ALTA DE EXISTENCIAS
  // ============================================================================

  /**
   * Crear Alta de Existencias
   * Registra un alta de existencias en una sucursal específica
   *
   * @param pedidoitem - Datos del item (cantidad, id_art, descripcion, etc.)
   * @param pedidoscb - Datos de cabecera (sucursal, usuario, observacion)
   * @returns Observable con la respuesta del backend
   */
  crearAltaExistencias(pedidoitem: any, pedidoscb: any): Observable<any> {
    const payload = {
      pedidoitem: pedidoitem,
      pedidoscb: pedidoscb
    };
    return this.http.post(UrlAltaExistencias, payload);
  }

  /**
   * Cancelar Alta de Existencias (V2.0 - Con fijación de valores y selección múltiple)
   * Cancela una o múltiples altas previamente registradas y revierte el stock automáticamente
   *
   * @param id_num - ID único de la cabecera del alta a cancelar (opcional si se proporciona id_nums)
   * @param id_nums - Array de IDs para cancelación múltiple (opcional si se proporciona id_num)
   * @param motivo - Motivo de la cancelación (mínimo 10 caracteres)
   * @param usuario - Usuario que cancela
   * @returns Observable con la respuesta del backend
   */
  cancelarAltaExistencias(id_num: number | null, motivo: string, usuario: string, id_nums?: number[]): Observable<any> {
    // Si se proporciona id_nums, usarlo; si no, usar id_num
    const payload: any = {
      motivo: motivo,
      usuario: usuario
    };

    if (id_nums && id_nums.length > 0) {
      payload.id_nums = id_nums;
    } else {
      payload.id_num = id_num;
    }

    return this.http.post(UrlCancelarAltaExistencias, payload);
  }

  /**
   * Obtener Altas de Existencias con Costos Calculados (V2.0)
   * Obtiene altas de existencias con costos calculados dinámicamente o fijos según estado
   *
   * Lógica dual:
   * - Estado 'ALTA': Costos dinámicos (recalculados con valores actuales)
   * - Estado 'Cancel-Alta': Costos fijos (valores guardados al momento de cancelación)
   *
   * @param sucursal - Número de sucursal (opcional, 0 para todas)
   * @param estado - Estado a filtrar: 'ALTA', 'Cancel-Alta' o 'Todas' (opcional)
   * @returns Observable con las altas y sus costos calculados
   */
  obtenerAltasConCostos(sucursal?: number, estado?: string): Observable<any> {
    let url = UrlObtenerAltasConCostos;
    const params: string[] = [];

    if (sucursal !== undefined && sucursal !== null && sucursal !== 0) {
      params.push(`sucursal=${sucursal}`);
    }

    if (estado && estado !== 'Todas') {
      params.push(`estado=${encodeURIComponent(estado)}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get(url);
  }

  /**
   * Obtener Altas por Sucursal (Método legacy - ahora usa obtenerAltasConCostos)
   * Mantiene compatibilidad con componentes existentes
   *
   * @param sucursal - Número de sucursal
   * @returns Observable con las altas de la sucursal
   */
  obtenerAltasPorSucursal(sucursal: number): Observable<any> {
    return this.obtenerAltasConCostos(sucursal, 'ALTA');
  }

  /**
   * Obtener Altas de Existencias con Paginación, Filtros y Ordenamiento (V3.0)
   *
   * Método mejorado con lazy loading, paginación del lado del servidor,
   * filtros dinámicos y ordenamiento por cualquier columna.
   *
   * Nueva respuesta del backend:
   * {
   *   error: false,
   *   data: [...],              // Array de altas
   *   total: 1500,              // Total de registros (con filtros aplicados, sin paginación)
   *   page: 1,                  // Página actual
   *   limit: 50,                // Registros por página
   *   total_pages: 30           // Total de páginas
   * }
   *
   * @param sucursal - Número de sucursal (opcional)
   * @param estado - Estado a filtrar: 'ALTA', 'Cancel-Alta' o 'Todas' (opcional)
   * @param page - Número de página (default: 1)
   * @param limit - Registros por página (default: 50)
   * @param sortField - Campo por el cual ordenar (ej: 'id_num', 'descripcion', 'fecha')
   * @param sortOrder - Orden: 'ASC' o 'DESC' (default: 'DESC')
   * @param filters - Objeto con filtros dinámicos { field: value, ... }
   * @param matchModes - Objeto con match modes { field: 'contains'|'equals'|'startsWith'|... }
   * @returns Observable con la respuesta paginada del backend
   */
  obtenerAltasConCostosPaginadas(
    sucursal?: number,
    estado?: string,
    page: number = 1,
    limit: number = 50,
    sortField: string = 'id_num',
    sortOrder: string = 'DESC',
    filters?: { [key: string]: any },
    matchModes?: { [key: string]: string }
  ): Observable<any> {
    let url = UrlObtenerAltasConCostos;
    const params: string[] = [];

    // Parámetros de sucursal y estado (compatibilidad con método anterior)
    if (sucursal !== undefined && sucursal !== null && sucursal !== 0) {
      params.push(`sucursal=${sucursal}`);
    }

    if (estado && estado !== 'Todas') {
      params.push(`estado=${encodeURIComponent(estado)}`);
    }

    // Parámetros de paginación
    params.push(`page=${page}`);
    params.push(`limit=${limit}`);

    // Parámetros de ordenamiento
    if (sortField) {
      params.push(`sortField=${encodeURIComponent(sortField)}`);
    }
    if (sortOrder) {
      params.push(`sortOrder=${sortOrder.toUpperCase()}`);
    }

    // Parámetros de filtros dinámicos
    if (filters) {
      for (const [field, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== '') {
          params.push(`filter_${field}=${encodeURIComponent(value)}`);

          // Match mode para este filtro
          if (matchModes && matchModes[field]) {
            params.push(`matchMode_${field}=${matchModes[field]}`);
          }
        }
      }
    }

    // Construir URL final
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get(url);
  }
}
