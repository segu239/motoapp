export interface PedidoItem {
  // ============================================================================
  // CAMPOS EXISTENTES EN DB (tabla pedidoitem)
  // ============================================================================
  id_items: number;
  tipo: string;
  cantidad: number;
  id_art: number;
  descripcion: string;
  precio: number;             // ← Precio de VENTA unitario (SIN conversión)
  fecha_resuelto: Date | null;
  usuario_res: string | null;
  observacion: string | null;
  estado: string;
  id_num: number;

  // ============================================================================
  // CAMPOS QUE VIENEN DEL JOIN CON pedidoscb (via backend)
  // ============================================================================
  sucursald: number;
  sucursalh: number;

  // ============================================================================
  // CAMPOS PARA SISTEMA DE TRANSFERENCIAS BIDIRECCIONALES (v2.2)
  // ============================================================================
  tipo_transferencia?: string;      // ← 'PULL' | 'PUSH' | 'LEGACY' | null
  fecha_aceptacion?: Date | null;
  usuario_aceptacion?: string | null;
  fecha_rechazo?: Date | null;
  usuario_rechazo?: string | null;
  motivo_rechazo?: string | null;
  fecha_confirmacion?: Date | null;
  usuario_confirmacion?: string | null;

  // ============================================================================
  // CAMPOS PARA PRECIO DE COSTO Y MONEDA (v2.0 - Con conversión)
  // ============================================================================
  precostosi?: number;        // ← Precio de costo unitario ORIGINAL (SIN conversión)
  tipo_moneda?: number;       // ← NUEVO: Código de moneda del artículo
  vcambio?: number;           // ← NUEVO: Valor de cambio aplicado

  // ============================================================================
  // CAMPOS CALCULADOS CON CONVERSIÓN DE MONEDA (v2.0) - 4 CAMPOS
  // ============================================================================
  precio_convertido?: number;        // ← NUEVO: precio * vcambio (unitario convertido)
  precio_total_convertido?: number;  // ← NUEVO: cantidad * precio * vcambio (total convertido)
  precostosi_convertido?: number;    // ← NUEVO: precostosi * vcambio (unitario convertido)
  costo_total_convertido?: number;   // ← NUEVO: cantidad * precostosi * vcambio (total convertido)

  // ============================================================================
  // CAMPOS LEGACY (Mantener para compatibilidad - DEPRECATED)
  // ============================================================================
  precio_total?: number;      // ← DEPRECATED: Usar precio_total_convertido
  costo_total?: number;       // ← DEPRECATED: Usar costo_total_convertido
}