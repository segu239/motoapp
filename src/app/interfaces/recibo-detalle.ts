export interface ReciboDetalle {
  // Datos de la venta (psucursal)
  id_num: number;
  numerocomprobante: number;
  puntoventa: number;
  fecha_venta: string;
  hora: string;
  nomart: string;
  precio: number;
  cantidad: number;
  tipodoc: string;
  idcli: number;
  idven: number;
  cod_tar: number;
  estado: string;
  descripcion_tarjeta: string;
  
  // Datos del recibo (recibos)
  recibo: number;
  c_tipo: string;
  c_cuota: number;
  fecha_recibo: string;
  importe: number;
  usuario: string;
  observacion: number;
  cod_lugar: string;
  sesion: number;
  c_tipf: string;
  recibo_saldo: number;
  cod_sucursal: number;
  fec_proceso: string;
  bonifica: number;
  interes: number;
  recibo_asoc: number;
}