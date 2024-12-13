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
    interes: number;
    id_fac: number;
}