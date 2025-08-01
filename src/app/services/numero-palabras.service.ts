import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NumeroPalabrasService {

  constructor() { }

  /**
   * Convierte un número a su representación en palabras
   * @param num Número a convertir
   * @returns String con el número en palabras (ej: "MIL CON CERO CENTAVOS")
   */
  numeroAPalabras(num: number): string {
    const unidades = ['CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    
    // Formatear a máximo 2 decimales y separar
    const numeroFormateado = parseFloat(num.toFixed(2));
    const parteEntera = Math.floor(numeroFormateado);
    const parteDecimal = Math.round((numeroFormateado - parteEntera) * 100);
    
    const convertirEntero = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return unidades[n];
      if (n < 20) return especiales[n - 10];
      if (n < 100) {
        if (n % 10 === 0) return decenas[Math.floor(n / 10)];
        return decenas[Math.floor(n / 10)] + ' Y ' + unidades[n % 10];
      }
      if (n < 1000) {
        const c = Math.floor(n / 100);
        const resto = n % 100;
        if (resto === 0) return centenas[c];
        if (c === 1 && resto < 100) return 'CIENTO ' + convertirEntero(resto);
        return centenas[c] + ' ' + convertirEntero(resto);
      }
      if (n < 10000) {
        const miles = Math.floor(n / 1000);
        const resto = n % 1000;
        if (resto === 0) return unidades[miles] + ' MIL';
        return unidades[miles] + ' MIL ' + convertirEntero(resto);
      }
      if (n < 1000000) {
        const miles = Math.floor(n / 1000);
        const resto = n % 1000;
        if (resto === 0) return convertirEntero(miles) + ' MIL';
        return convertirEntero(miles) + ' MIL ' + convertirEntero(resto);
      }
      if (n < 1000000000) {
        const miles = Math.floor(n / 1000000);
        const resto = n % 1000000;
        if (resto === 0) return convertirEntero(miles) + ' MILLÓN';
        return convertirEntero(miles) + ' MILLÓN ' + convertirEntero(resto);
      }
      return 'Número fuera de rango';
    };
    
    let resultado = parteEntera === 0 ? 'CERO' : convertirEntero(parteEntera);
    
    if (parteDecimal > 0) {
      const centavosTexto = convertirEntero(parteDecimal);
      resultado += ' CON ' + centavosTexto + (parteDecimal === 1 ? ' CENTAVO' : ' CENTAVOS');
    } else {
      resultado += ' CON CERO CENTAVOS';
    }
    
    return resultado;
  }

  /**
   * Versión simplificada que devuelve solo el número en palabras con "pesos"
   * @param num Número a convertir
   * @returns String con el número en palabras seguido de "pesos" (ej: "mil pesos")
   */
  numeroAPalabrasSimple(num: number): string {
    const numeroEnPalabras = this.numeroAPalabras(num);
    // Remover "CON CERO CENTAVOS" y convertir a minúsculas
    return numeroEnPalabras.replace(' CON CERO CENTAVOS', '').toLowerCase() + ' pesos';
  }
}