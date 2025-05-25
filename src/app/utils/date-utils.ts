/**
 * Utilidades para el manejo consistente de fechas en la aplicación
 */

/**
 * Extrae una fecha en formato dd/mm/yyyy desde diferentes formatos de entrada
 */
export function extractDateString(dateStr: any): string {
  if (!dateStr) return '';
  
  // Si viene en formato ISO (2025-05-22T00:00:00.000Z)
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  // Si viene en formato YYYY-MM-DD
  else if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  // Si ya viene en formato DD/MM/YYYY
  else if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateStr;
  }
  // Si es un objeto Date
  else if (dateStr instanceof Date) {
    const day = String(dateStr.getDate()).padStart(2, '0');
    const month = String(dateStr.getMonth() + 1).padStart(2, '0');
    const year = dateStr.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  return '';
}

/**
 * Crea objetos Date evitando problemas de timezone
 * Siempre crea la fecha al mediodía para evitar cambios de día por timezone
 */
export function createDateFromString(dateStr: any): Date | null {
  if (!dateStr) return null;
  
  // Si es un objeto Date, devolverlo normalizado
  if (dateStr instanceof Date) {
    const normalized = new Date(dateStr);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }
  
  // Si viene en formato ISO con timezone
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const date = new Date(dateStr.split('T')[0] + 'T12:00:00');
    return date;
  }
  
  // Si viene en formato YYYY-MM-DD
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(dateStr + 'T12:00:00');
    return date;
  }
  
  // Si viene en formato DD/MM/YYYY
  if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    return date;
  }
  
  return null;
}

/**
 * Formatea una fecha para enviar al servidor en formato YYYY-MM-DD
 */
export function formatDateForServer(fecha: Date | null): string | null {
  if (!fecha) return null;
  
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

/**
 * Compara dos fechas ignorando la hora
 */
export function compareDatesOnly(date1: Date, date2: Date): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  return d1.getTime() - d2.getTime();
}

/**
 * Obtiene la fecha de hoy normalizada (sin hora)
 */
export function getTodayNormalized(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Valida si una fecha string está en formato correcto
 */
export function isValidDateString(dateStr: string, format: 'DD/MM/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'): boolean {
  if (!dateStr) return false;
  
  if (format === 'DD/MM/YYYY') {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
  } else {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }
}