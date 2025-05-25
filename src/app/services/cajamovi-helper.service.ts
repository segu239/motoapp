import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Enums para tipos de movimiento
export enum TipoMovimiento {
  INGRESO = '0',
  EGRESO = '1'
}

// Enums para tipos de movimiento de caja
export enum TipoMovimientoCaja {
  APERTURA = 'A',
  MOVIMIENTO = 'M',
  CIERRE = 'C'
}

@Injectable({
  providedIn: 'root'
})
export class CajamoviHelperService {

  constructor() { }

  /**
   * Calcula el importe final según el tipo de concepto (ingreso/egreso)
   * @param importeAbsoluto Valor absoluto del importe
   * @param conceptoSeleccionado Objeto concepto con la propiedad ingreso_egreso
   * @returns Importe con el signo correcto
   */
  calcularImporteFinal(importeAbsoluto: number, conceptoSeleccionado: any): number {
    // Validar que el importe sea un número válido
    if (!this.esNumeroValidoParaMoneda(importeAbsoluto)) {
      console.error('Importe inválido o fuera de rango:', importeAbsoluto);
      return 0;
    }
    
    // Asegurar que trabajamos con un número positivo y con precisión de 2 decimales
    const importe = this.redondearMoneda(Math.abs(importeAbsoluto));
    
    if (!conceptoSeleccionado || conceptoSeleccionado.ingreso_egreso === undefined) {
      console.warn('Concepto no seleccionado o sin tipo definido, retornando valor absoluto');
      return importe;
    }
    
    // Normalizar el valor de ingreso_egreso a string para comparación consistente
    const tipoMovimiento = String(conceptoSeleccionado.ingreso_egreso);
    
    // Log para debugging
    console.log('Cálculo de importe:', {
      importeOriginal: importeAbsoluto,
      importeAbsoluto: importe,
      tipoMovimiento: tipoMovimiento,
      esEgreso: this.esEgreso(conceptoSeleccionado),
      esIngreso: this.esIngreso(conceptoSeleccionado)
    });
    
    // Aplicar signo según tipo
    if (this.esEgreso(conceptoSeleccionado)) {
      return this.redondearMoneda(importe * -1); // Egresos siempre negativos
    } else if (this.esIngreso(conceptoSeleccionado)) {
      return importe; // Ingresos siempre positivos (ya redondeado)
    }
    
    // Si no es ni ingreso ni egreso, mantener valor absoluto
    console.warn('Tipo de movimiento no reconocido:', tipoMovimiento);
    return importe;
  }
  
  /**
   * Determina si un concepto es de tipo egreso
   * @param concepto Objeto concepto con la propiedad ingreso_egreso
   * @returns true si es egreso
   */
  esEgreso(concepto: any): boolean {
    if (!concepto || concepto.ingreso_egreso === undefined) {
      return false;
    }
    const valor = String(concepto.ingreso_egreso);
    return valor === TipoMovimiento.EGRESO;
  }
  
  /**
   * Determina si un concepto es de tipo ingreso
   * @param concepto Objeto concepto con la propiedad ingreso_egreso
   * @returns true si es ingreso
   */
  esIngreso(concepto: any): boolean {
    if (!concepto || concepto.ingreso_egreso === undefined) {
      return false;
    }
    const valor = String(concepto.ingreso_egreso);
    return valor === TipoMovimiento.INGRESO;
  }
  
  /**
   * Validador personalizado para importes de caja
   * No permite valores 0 o negativos en el input (el signo se aplica según el tipo de movimiento)
   * @param minValue Valor mínimo permitido (por defecto 0.01)
   * @returns Función validadora
   */
  importeValidator(minValue: number = 0.01): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      // Si no hay valor, dejar que el validador required lo maneje
      if (value === null || value === undefined || value === '') {
        return null;
      }
      
      // Convertir a número
      const numValue = parseFloat(value);
      
      // Verificar si es un número válido
      if (isNaN(numValue)) {
        return { importeInvalido: { message: 'El importe debe ser un número válido' } };
      }
      
      // Verificar que sea mayor al mínimo
      if (numValue < minValue) {
        return { 
          importeMinimo: { 
            message: `El importe debe ser mayor a ${minValue}`,
            valorActual: numValue,
            valorMinimo: minValue
          } 
        };
      }
      
      // Verificar que no tenga más de 2 decimales
      const decimales = (numValue.toString().split('.')[1] || '').length;
      if (decimales > 2) {
        return { 
          importeDecimales: { 
            message: 'El importe no puede tener más de 2 decimales',
            decimalesActuales: decimales
          } 
        };
      }
      
      // Verificar que esté dentro del rango válido para moneda
      if (!this.esNumeroValidoParaMoneda(numValue)) {
        return { 
          importeMaximo: { 
            message: 'El importe es demasiado grande (máximo 13 dígitos)',
            valorMaximo: 9999999999999.99
          } 
        };
      }
      
      return null; // Válido
    };
  }
  
  /**
   * Formatea un importe para mostrar en la UI
   * @param importe Valor del importe
   * @param mostrarSigno Si debe mostrar el signo + para positivos
   * @returns String formateado
   */
  formatearImporte(importe: number, mostrarSigno: boolean = false): string {
    if (importe === null || importe === undefined || !this.esNumeroValidoParaMoneda(importe)) {
      return '0.00';
    }
    
    // Redondear antes de formatear para evitar problemas de precisión
    const importeRedondeado = this.redondearMoneda(importe);
    const formateado = Math.abs(importeRedondeado).toFixed(2);
    
    if (importeRedondeado < 0) {
      return `-${formateado}`;
    } else if (importeRedondeado > 0 && mostrarSigno) {
      return `+${formateado}`;
    }
    
    return formateado;
  }
  
  /**
   * Determina si un movimiento puede ser eliminado según su tipo
   * @param tipoMovi Tipo de movimiento
   * @returns true si puede ser eliminado
   */
  puedeEliminarMovimiento(tipoMovi: string): boolean {
    // No se pueden eliminar movimientos de apertura
    if (tipoMovi === TipoMovimientoCaja.APERTURA) {
      return false;
    }
    
    // Solo se pueden eliminar movimientos tipo 'M' o vacío de forma directa
    return tipoMovi === TipoMovimientoCaja.MOVIMIENTO || tipoMovi === '';
  }
  
  /**
   * Obtiene el mensaje de confirmación para eliminar según el tipo de movimiento
   * @param tipoMovi Tipo de movimiento
   * @returns Objeto con título y mensaje para la confirmación
   */
  getMensajeConfirmacionEliminacion(tipoMovi: string): { titulo: string, mensaje: string, requiereConfirmacionEspecial: boolean } {
    if (tipoMovi === TipoMovimientoCaja.APERTURA) {
      return {
        titulo: 'Operación no permitida',
        mensaje: 'No se pueden eliminar movimientos de apertura de caja',
        requiereConfirmacionEspecial: false
      };
    }
    
    if (tipoMovi !== TipoMovimientoCaja.MOVIMIENTO && tipoMovi !== '') {
      return {
        titulo: 'Confirmación especial',
        mensaje: `Este movimiento no es de tipo "M". ¿Está seguro que desea eliminarlo?`,
        requiereConfirmacionEspecial: true
      };
    }
    
    return {
      titulo: '¿Está seguro?',
      mensaje: '¿Desea eliminar este movimiento?',
      requiereConfirmacionEspecial: false
    };
  }

  /**
   * Valida si un número está dentro del rango seguro de JavaScript para cálculos monetarios
   * @param valor Número a validar
   * @returns true si es válido para operaciones monetarias
   */
  esNumeroValidoParaMoneda(valor: any): boolean {
    // Verificar que es un número
    if (typeof valor !== 'number' || isNaN(valor) || !isFinite(valor)) {
      return false;
    }
    
    // JavaScript puede representar con precisión enteros hasta 2^53 - 1
    // Para moneda, limitamos a 13 dígitos enteros + 2 decimales
    const MAX_VALOR_MONEDA = 9_999_999_999_999.99; // 13 dígitos + 2 decimales
    const MIN_VALOR_MONEDA = -9_999_999_999_999.99;
    
    return valor >= MIN_VALOR_MONEDA && valor <= MAX_VALOR_MONEDA;
  }

  /**
   * Redondea un valor monetario a 2 decimales usando técnica bancaria
   * @param valor Número a redondear
   * @returns Número redondeado a 2 decimales
   */
  redondearMoneda(valor: number): number {
    // Usar técnica de redondeo bancario para evitar errores de punto flotante
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  /**
   * Suma una lista de valores monetarios con precisión
   * @param valores Array de números a sumar
   * @returns Suma total redondeada a 2 decimales
   */
  sumarMontos(valores: number[]): number {
    // Sumar en centavos para evitar errores de punto flotante
    const sumaCentavos = valores.reduce((acc, valor) => {
      if (this.esNumeroValidoParaMoneda(valor)) {
        return acc + Math.round(valor * 100);
      }
      return acc;
    }, 0);
    
    // Convertir de vuelta a unidades monetarias
    return this.redondearMoneda(sumaCentavos / 100);
  }

  /**
   * Convierte un string a número validando que sea apropiado para moneda
   * @param valor String a convertir
   * @returns Número o null si no es válido
   */
  parseMoneda(valor: string | number): number | null {
    if (typeof valor === 'number') {
      return this.esNumeroValidoParaMoneda(valor) ? this.redondearMoneda(valor) : null;
    }
    
    // Limpiar string: remover espacios y cambiar comas por puntos
    const valorLimpio = String(valor).trim().replace(',', '.');
    
    // Intentar parsear
    const numero = parseFloat(valorLimpio);
    
    // Validar resultado
    if (!this.esNumeroValidoParaMoneda(numero)) {
      return null;
    }
    
    return this.redondearMoneda(numero);
  }
}