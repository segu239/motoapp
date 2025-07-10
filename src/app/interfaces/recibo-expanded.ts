export interface ReciboExpanded {
  recibo: number;
  c_tipo: string;
  c_numero: number;
  c_cuota: number;
  fecha: string;
  importe: number;
  usuario: string;
  observacion: number;
  cod_lugar: string;
  sesion: number;
  c_tipf: string;
  c_puntoventa: number;
  recibo_asoc: number;
  recibo_saldo: number;
  cod_sucursal: number;
  fec_proceso: string;
  bonifica: number;
  interes: number;
  id_fac: number;
  productos?: PsucursalExpanded[];
}

export interface PsucursalExpanded {
  idart: number;
  cantidad: number;
  precio: number;
  idcli: number;
  idven: number;
  fecha: string;
  hora: string;
  tipoprecio: string;
  cod_tar: number;
  tarjeta?: string;
  titulartar: string;
  numerotar: number;
  cod_mov: number;
  suc_destino: number;
  nomart: string;
  nautotar: number;
  dni_tar: number;
  banco: string;
  ncuenta: number;
  ncheque: number;
  nombre: string;
  plaza: string;
  importeimputar: number;
  importecheque: number;
  fechacheque: string;
  emailop: string;
  tipodoc: string;
  puntoventa: number;
  numerocomprobante: number;
  estado: string;
  id_num: number;
}

export interface VentaExpandida {
  recibos: ReciboExpanded[];
}