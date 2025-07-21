export interface Cabecera {
    tipo?: string;
    numero_int?: number;
    puntoventa?: number;
    letra?: string;
    numero_fac?: number;
    atipo?: string;
    anumero_com?: number;
    cliente?: number;
    cod_sucursal?: string;
    emitido?: Date;
    vencimiento?: Date;
    exento?: number;
    basico?: number;
    iva1?: number;
    iva2?: number;
    iva3?: number;
    bonifica?: number;
    bonifica_tipo?: string;  // 'P' = Porcentaje, 'I' = Importe
    interes?: number;
    interes_tipo?: string;   // 'P' = Porcentaje, 'I' = Importe
    saldo?: number;
    dorigen?: boolean;
    cod_condvta?: number;
    cod_iva?: number;
    cod_vendedor?: number;
    anulado?: boolean;
    cuit?: number;
    usuario?: string;
    turno?: number;
    pfiscal?: number;
    mperc?: number;
    imp_int?: number;
    fec_proceso?: Date;
    fec_ultpago?: Date;
    estado?: string;
    id_aso?: number;
    id_num?: number;
}
