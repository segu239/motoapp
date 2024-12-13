export interface Pedidoscb {
    id_num: number;
    tipo: string;
    numero: number;
    sucursald: number; // He renombrado 'sucursalds' para mayor claridad y convenciones de nomenclatura en JS/TS
    sucursalh: number; // Se mantiene 'sucursalh', asumiendo que es un identificador distinto
    fecha: Date | null;  // Se usa Date | null para permitir fechas nulas
    usuario: string | null; // Se usa string | null para permitir usuarios nulos
    observacion: string | null; // Se usa string | null para permitir observaciones nulas
    estado: string;
    id_aso: number;
  }