import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TotalizadoresService {

  // ==========================================================================
  // CÁLCULOS DE COSTO INDIVIDUAL
  // ==========================================================================

  /**
   * Calcula el costo total de un item con precisión decimal
   * Redondea a 2 decimales para evitar errores de punto flotante
   */
  calcularCostoItem(cantidad: number | null, precio: number | null): number {
    if (cantidad == null || precio == null) {
      console.warn('Cantidad o precio nulo:', { cantidad, precio });
      return 0;
    }

    if (typeof cantidad !== 'number' || typeof precio !== 'number') {
      console.error('Tipo inválido:', { cantidad, precio });
      return 0;
    }

    // Redondeo a 2 decimales para precisión monetaria
    return Math.round((cantidad * precio) * 100) / 100;
  }

  // ==========================================================================
  // CÁLCULOS DE TOTALES GENERALES
  // ==========================================================================

  /**
   * Calcula el total general de un array de items
   * Usado para sumar TODOS los items (filtrados) de la tabla
   */
  calcularTotalGeneral(items: any[]): number {
    if (!Array.isArray(items)) {
      console.error('Items no es un array:', items);
      return 0;
    }

    return items.reduce((sum, item) => {
      const costo = item.costo_total || 0;
      return Math.round((sum + costo) * 100) / 100;
    }, 0);
  }

  // ==========================================================================
  // SELECCIÓN ÚNICA (radio buttons)
  // ==========================================================================

  /**
   * Obtiene el costo de un item seleccionado (selección única)
   * Usado por: stockpedido, enviostockpendientes, stockrecibo (si usa única)
   */
  obtenerCostoItemSeleccionado(item: any | null): number {
    return item?.costo_total || 0;
  }

  // ==========================================================================
  // SELECCIÓN MÚLTIPLE (checkboxes) - NUEVO v2.1
  // ==========================================================================

  /**
   * Calcula el total de items seleccionados (selección múltiple)
   * Usado por: enviodestockrealizados, stockrecibo (si usa múltiple)
   *
   * @param items Array de items seleccionados
   * @returns Suma total de costos de los items seleccionados
   */
  calcularTotalSeleccionados(items: any[]): number {
    if (!Array.isArray(items) || items.length === 0) {
      return 0;
    }

    return items.reduce((sum, item) => {
      const costo = item.costo_total || 0;
      return Math.round((sum + costo) * 100) / 100;
    }, 0);
  }

  /**
   * Obtiene la cantidad de items seleccionados
   * Útil para mostrar "X items seleccionados"
   */
  obtenerCantidadSeleccionados(items: any[]): number {
    return Array.isArray(items) ? items.length : 0;
  }

  /**
   * Calcula estadísticas de items seleccionados
   * Retorna objeto con total, promedio y cantidad
   */
  obtenerEstadisticasSeleccionados(items: any[]): {
    total: number;
    cantidad: number;
    promedio: number;
  } {
    const cantidad = this.obtenerCantidadSeleccionados(items);
    const total = this.calcularTotalSeleccionados(items);
    const promedio = cantidad > 0
      ? Math.round((total / cantidad) * 100) / 100
      : 0;

    return { total, cantidad, promedio };
  }
}
