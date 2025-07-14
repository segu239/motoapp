export interface HistorialVenta2 {
  sucursal: string;
  tipo: string;
  puntoventa: number;
  letra: string;
  numero_int: number;
  numero_fac: number;
  emitido: string;
  vencimiento: string;
  importe: number; // calculado como exento + basico + iva1 + iva2 + iva3
  saldo: number;
  usuario: string;
  // Campos auxiliares para el cálculo del importe
  exento?: number;
  basico?: number;
  iva1?: number;
  iva2?: number;
  iva3?: number;
  // ID para operaciones
  id?: number;
  cliente?: number;
}