export interface Recibo {
    recibo: number;
    c_tipo: string;
    c_numero: number;
    c_cuota: number;
    fecha?: Date;
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
    fec_proceso?: any;
    bonifica: number;
    bonifica_tipo: string;   // Campo requerido, no opcional
    interes: number;
    interes_tipo: string;    // Campo requerido, no opcional
    id_fac: number;
}