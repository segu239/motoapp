export interface Cajamovi {
  sucursal: number;
  codigo_mov: number;
  num_operacion: number;
  fecha_mov: Date;
  importe_mov: number;
  descripcion_mov: string;
  fecha_emibco: Date | null;
  banco: number | null;
  num_cheque: number | null;
  cuenta_mov: number | null;
  cliente: number | null;
  proveedor: number | null;
  plaza_cheque: string | null;
  codigo_mbco: number | null;
  desc_bancaria: string | null;
  marca_cerrado: number;
  fecha_cobro_bco: Date | null;
  fecha_vto_bco: Date | null;
  tipo_movi: string;
  caja: number;
  letra: string | null;
  punto_venta: number | null;
  tipo_comprobante: string | null;
  numero_comprobante: number | null;
  fecha_proceso: Date | null;
  id_movimiento: number;
  descripcion_concepto?: string; // Campo agregado para la descripción del concepto
  descripcion_caja?: string; // Campo agregado para la descripción de la caja
  fecha_mov_string?: string; // Campo agregado para el filtro de fecha como string
}