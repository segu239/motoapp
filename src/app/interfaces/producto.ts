export interface Producto {
    nomart?:string;
    marca?:string;
    precon?:number;
    prefi1?:number;
    prefi2?:number;
    prefi3?:number;
    prefi4?:number;
    exi1?:number;
    exi2?:number;
    exi3?:number;
    exi4?:number;
    exi5?:number;
    idart?:number;
    tipo_moneda?:number;  // Cambiado de string a number para corresponder con el tipo en la base de datos
    _precioConversionSospechosa?: boolean; // Flag para marcar precios con conversión sospechosa
}