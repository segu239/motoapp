export interface HistorialVenta {
  tipodoc: string;
  puntoventa: number;
  idart: number;
  nomart: string;
  fecha: string;
  hora: string;
  cantidad: number;
  precio: number;
  cod_tar: number;
  numerocomprobante: number;
  id_num: number;
  idcli: number;
  descripcion_tarjeta?: string;
}