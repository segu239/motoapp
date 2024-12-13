export interface PedidoItem {
    id_items: number;
    tipo: string;
    cantidad: number;
    id_art: number;
    descripcion: string;
    precio: number;
    fecha_resuelto: Date | null;
    usuario_res: string | null;
    observacion: string | null;
    estado: string;
    id_num: number;
  }