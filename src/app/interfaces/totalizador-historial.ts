export interface TotalizadorTipoPago {
  cod_tar: number;
  tipoPago: string;
  cantidad: number;
  totalImporte: number;
  totalSaldo: number;
  porcentaje: number;
}

export interface TotalizadorPorTipo {
  tipo: string; // FC, NC, etc.
  cantidad: number;
  totalImporte: number;
  totalSaldo: number;
  porcentaje: number;
}

export interface TotalizadorPorSucursal {
  sucursal: string;
  cantidad: number;
  totalImporte: number;
  totalSaldo: number;
  porcentaje: number;
}

export interface TotalizadorGeneral {
  // Resumen general
  totalRegistros: number;
  totalImporte: number;
  totalSaldo: number;
  rangoFechas: string;
  
  // Desglose por tipo de pago
  tiposPago: TotalizadorTipoPago[];
  
  // Desglose por tipo de documento
  tiposDocumento: TotalizadorPorTipo[];
  
  // Desglose por sucursal
  sucursales: TotalizadorPorSucursal[];
  
  // Datos adicionales útiles
  estadisticas: {
    promedioImporte: number;
    promedioSaldo: number;
    ventaMasAlta: number;
    ventaMasBaja: number;
    fechaUltimaVenta: string;
    fechaPrimeraVenta: string;
  };
}