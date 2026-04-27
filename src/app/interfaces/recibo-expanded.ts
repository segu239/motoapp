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
  bonifica_tipo: string;
  interes: number;
  interes_tipo: string;
  id_fac: number;
  productos?: PsucursalExpanded[];
  descuento_global?: DescuentoGlobalHistorico | null;
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
  numerotar: number | string | null;
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
  historialPagos: PagoHistorial[];
  totalPagado: number;
  descuento_global?: DescuentoGlobalHistorico | null;
}

export interface PagoHistorial {
  recibo: number;
  c_tipo: string;
  c_numero: number;
  fecha: string;
  importe: number;
  usuario: string;
  c_puntoventa: number;
}

export interface DescuentoGlobalHistorico {
  cod_sucursal: number | string;
  cabecera_id_num: number | string;
  tipo_comprobante: string;
  numero_int: number | string;
  numero_fac?: number | string | null;
  puntoventa?: number | string | null;
  subtotal_bruto: number | string;
  descuento_monto: number | string;
  total_neto: number | string;
  origen?: string | null;
  usuario?: string | null;
}
