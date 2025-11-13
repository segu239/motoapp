export interface PedidoItem {
  // ============================================================================
  // CAMPOS EXISTENTES EN DB (tabla pedidoitem)
  // ============================================================================
  id_items: number;
  tipo: string;
  cantidad: number;           // ← Para totalizadores
  id_art: number;
  descripcion: string;
  precio: number;             // ← Para totalizadores
  fecha_resuelto: Date | null;
  usuario_res: string | null;
  observacion: string | null;
  estado: string;
  id_num: number;

  // ============================================================================
  // CAMPOS QUE VIENEN DEL JOIN CON pedidoscb (via backend)
  // ============================================================================
  sucursald: number;          // ⚠️ Agregado - viene de JOIN
  sucursalh: number;          // ⚠️ Agregado - viene de JOIN

  // ============================================================================
  // NUEVOS CAMPOS PARA TOTALIZADORES (v2.1)
  // ============================================================================
  costo_total?: number;       // Calculado: cantidad * precio (redondeado a 2 decimales)
}