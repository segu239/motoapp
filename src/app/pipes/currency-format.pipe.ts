import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear valores numéricos a moneda con decimales controlados
 *
 * @description
 * Este pipe resuelve el problema de precisión de punto flotante en JavaScript
 * aplicando redondeo consistente a 2 decimales (configurable).
 *
 * @usage
 *   {{valor | currencyFormat}}           → 2 decimales (default)
 *   {{valor | currencyFormat:4}}         → 4 decimales
 *   {{valor | currencyFormat:0}}         → sin decimales
 *
 * @example
 *   Input: 25392.608500000002
 *   Output: "25392.61"
 *
 * @example
 *   Input: NaN
 *   Output: "0.00"
 *
 * @author Master System Architect
 * @date 2025-10-04
 * @version 1.0
 */
@Pipe({
  name: 'currencyFormat'
})
export class CurrencyFormatPipe implements PipeTransform {
  /**
   * Transforma un valor numérico a string con decimales controlados
   *
   * @param value - Valor a formatear (number o string)
   * @param decimals - Cantidad de decimales (default: 2)
   * @returns String formateado con decimales especificados
   *
   * @throws No lanza excepciones, retorna "0.00" en caso de error
   */
  transform(value: number | string, decimals: number = 2): string {
    // Convertir a número si es string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Validar que sea un número válido
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      console.warn(`CurrencyFormatPipe: Valor inválido recibido: ${value}`);
      return '0.00';
    }

    // Retornar con decimales especificados
    return numValue.toFixed(decimals);
  }
}
