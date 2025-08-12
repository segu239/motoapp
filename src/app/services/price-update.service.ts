import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { 
  UrlPriceFilterOptions, 
  UrlPricePreview, 
  UrlPriceUpdate, 
  UrlPriceChangeHistory 
} from '../config/ini';

// Interfaces para tipado fuerte
export interface PriceFilterOptions {
  marcas: { value: string; label: string }[];
  proveedores: { value: number; label: string }[];
  rubros: { value: string; label: string }[];
  tipos_iva: { value: number; label: string }[];
  cod_deposito: number;
  total_productos: number;
}

export interface PreviewProduct {
  cd_articulo: number;
  nomart: string;
  marca: string;
  rubro: string;
  // Precios separados para mayor claridad
  precio_costo_actual: number;
  precio_costo_nuevo: number;
  precio_final_actual: number;
  precio_final_nuevo: number;
  // Mantener compatibilidad con campos existentes
  precio_actual: number;  // Campo del tipo que se está modificando
  precio_nuevo: number;   // Campo del tipo que se está modificando
  variacion: number;
  variacion_porcentaje: number;
  impacto_inventario: number;
  stock_total: number;
  cod_iva: number;
  alicuota_iva: number;
}

export interface PreviewRequest {
  marca?: string;
  cd_proveedor?: number;
  rubro?: string;
  cod_iva?: number;
  tipo_modificacion: 'costo' | 'final';
  porcentaje: number;
  sucursal?: number;
}

export interface PreviewResponse {
  success: boolean;
  message?: string;
  productos?: PreviewProduct[];
  total_registros: number;
  registros_preview: number;
  tipo_cambio: string;
  porcentaje_aplicado: number;
  cod_deposito: number;
}

export interface ApplyChangesRequest {
  marca?: string;
  cd_proveedor?: number;
  rubro?: string;
  cod_iva?: number;
  tipo_modificacion: 'costo' | 'final';
  porcentaje: number;
  sucursal?: number;
  observacion?: string;
}

export interface ApplyChangesResponse {
  success: boolean;
  message?: string;
  productos_modificados: number;
  auditoria_id?: string;
  error_details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PriceUpdateService {

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Obtener opciones de filtros para el formulario
   */
  getFilterOptions(): Observable<PriceFilterOptions> {
    const sucursal = sessionStorage.getItem('sucursal');
    
    if (!sucursal) {
      return throwError({
        message: 'No se encontró la sucursal en el almacenamiento local. Por favor, recargue la página.',
        code: 'SUCURSAL_NOT_FOUND'
      });
    }

    const params = { sucursal: sucursal.toString() };

    return this.http.get<any>(UrlPriceFilterOptions, { 
      params,
      headers: this.getHeaders() 
    }).pipe(
      map(response => this.parseFilterOptionsResponse(response)),
      catchError(error => this.handleError(error, 'Error al cargar opciones de filtros'))
    );
  }

  /**
   * Obtener preview de cambios de precios
   */
  getPreview(request: PreviewRequest): Observable<PreviewResponse> {
    // Validar que request tiene sucursal
    if (!request.sucursal) {
      return throwError({
        message: 'La sucursal es requerida para generar el preview de cambios',
        code: 'SUCURSAL_REQUIRED'
      });
    }
    
    // Limpiar parámetros nulos o vacíos
    const cleanRequest = this.cleanRequest(request);

    return this.http.post<any>(UrlPricePreview, cleanRequest, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.parsePreviewResponse(response)),
      catchError(error => this.handleError(error, 'Error al generar preview de cambios'))
    );
  }

  /**
   * Aplicar cambios masivos de precios
   */
  applyChanges(request: ApplyChangesRequest): Observable<ApplyChangesResponse> {
    // Validar que request tiene sucursal
    if (!request.sucursal) {
      return throwError({
        message: 'La sucursal es requerida para aplicar cambios masivos de precios',
        code: 'SUCURSAL_REQUIRED'
      });
    }
    
    // Limpiar parámetros nulos o vacíos
    const cleanRequest = this.cleanRequest(request);

    return this.http.post<any>(UrlPriceUpdate, cleanRequest, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.parseApplyResponse(response)),
      catchError(error => this.handleError(error, 'Error al aplicar cambios masivos'))
    );
  }

  /**
   * Obtener historial de cambios masivos (opcional, para auditoría)
   */
  getChangeHistory(limit: number = 50): Observable<any[]> {
    const params = { limit: limit.toString() };

    return this.http.get<any>(UrlPriceChangeHistory, { 
      params,
      headers: this.getHeaders() 
    }).pipe(
      map(response => response?.data || []),
      catchError(error => this.handleError(error, 'Error al cargar historial'))
    );
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Headers estándar para requests
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  /**
   * Limpiar request eliminando valores nulos/vacíos
   */
  private cleanRequest(request: any): any {
    const cleaned: any = {};
    
    Object.keys(request).forEach(key => {
      const value = request[key];
      
      // Para campos numéricos específicos, validar que tengan valor válido
      if (key === 'porcentaje') {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          cleaned[key] = numericValue;
        }
      } else if (key === 'cd_proveedor' || key === 'cod_iva' || key === 'sucursal') {
        const numericValue = parseInt(value);
        if (!isNaN(numericValue)) {
          cleaned[key] = numericValue;
        }
      } else if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    });

    return cleaned;
  }

  /**
   * Parsear respuesta de opciones de filtros
   */
  private parseFilterOptionsResponse(response: any): PriceFilterOptions {
    try {
      console.log('Response completa:', response); // Debug
      
      let data;
      
      // Manejar diferentes formatos de respuesta
      if (response?.result) {
        // Si result es string, parsearlo; si ya es objeto, usarlo directamente
        if (typeof response.result === 'string') {
          // Limpiar caracteres de escape dobles que vienen de PostgreSQL
          let cleanJson = response.result.replace(/\\"/g, '"');
          console.log('JSON limpio:', cleanJson); // Debug
          data = JSON.parse(cleanJson);
        } else {
          data = response.result;
        }
      } else {
        data = response;
      }
      
      console.log('Data parseada:', data); // Debug
      
      if (!data || data.error) {
        throw new Error(data?.mensaje || 'Respuesta inválida del servidor');
      }

      // Si los datos vienen en un formato diferente, adaptarlo
      return {
        marcas: data.marcas || [],
        proveedores: data.proveedores || [],
        rubros: data.rubros || [],
        tipos_iva: data.tipos_iva || [],
        cod_deposito: data.cod_deposito || 1,
        total_productos: data.total_productos || 0
      };
    } catch (error) {
      console.error('Error parsing filter options:', error);
      console.error('Raw response:', response);
      throw new Error('Error al procesar opciones de filtros');
    }
  }

  /**
   * Parsear respuesta del preview
   */
  private parsePreviewResponse(response: any): PreviewResponse {
    try {
      console.log('Preview response completa:', response); // Debug
      
      let data;
      
      // Manejar diferentes formatos de respuesta
      if (response?.result) {
        // Si result es string, parsearlo; si ya es objeto, usarlo directamente
        if (typeof response.result === 'string') {
          // Limpiar caracteres de escape dobles que vienen de PostgreSQL
          let cleanJson = response.result.replace(/\\"/g, '"');
          console.log('Preview JSON limpio:', cleanJson); // Debug
          data = JSON.parse(cleanJson);
        } else {
          data = response.result;
        }
      } else {
        data = response;
      }
      
      console.log('Preview data parseada:', data); // Debug
      
      if (!data) {
        throw new Error('Respuesta vacía del servidor');
      }

      return {
        success: data.success || false,
        message: data.message,
        productos: data.productos || [],
        total_registros: data.total_registros || 0,
        registros_preview: data.registros_preview || 0,
        tipo_cambio: data.tipo_cambio || '',
        porcentaje_aplicado: data.porcentaje_aplicado || 0,
        cod_deposito: data.cod_deposito || 1
      };
    } catch (error) {
      console.error('Error parsing preview response:', error);
      console.error('Raw preview response:', response);
      throw new Error('Error al procesar preview de cambios');
    }
  }

  /**
   * Parsear respuesta de aplicación de cambios
   */
  private parseApplyResponse(response: any): ApplyChangesResponse {
    try {
      console.log('Apply response completa:', response); // Debug
      
      let data;
      
      // Manejar diferentes formatos de respuesta
      if (response?.result) {
        // Si result es string, parsearlo; si ya es objeto, usarlo directamente
        if (typeof response.result === 'string') {
          // Limpiar caracteres de escape dobles que vienen de PostgreSQL
          let cleanJson = response.result.replace(/\\"/g, '"');
          console.log('Apply JSON limpio:', cleanJson); // Debug
          data = JSON.parse(cleanJson);
        } else {
          data = response.result;
        }
      } else {
        data = response;
      }
      
      console.log('Apply data parseada:', data); // Debug
      
      return {
        success: data?.success || false,
        message: data?.message,
        productos_modificados: data?.productos_modificados || 0,
        auditoria_id: data?.auditoria_id,
        error_details: data?.error_details
      };
    } catch (error) {
      console.error('Error parsing apply response:', error);
      console.error('Raw apply response:', response);
      throw new Error('Error al procesar respuesta de aplicación');
    }
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: any, contextMessage: string): Observable<never> {
    console.error(`${contextMessage}:`, error);
    
    let errorMessage: string;

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = 'Error en la solicitud. Verifique los datos enviados.';
    } else if (error.status >= 500) {
      errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
    } else {
      errorMessage = contextMessage;
    }

    return throwError({
      message: errorMessage,
      originalError: error,
      context: contextMessage
    });
  }
}