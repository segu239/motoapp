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
    prebsiva?:number;     // Precio base sin IVA
    precostosi?:number;   // Precio costo sin IVA
    descuento?:number;    // Porcentaje de descuento
    margen?:number;       // Porcentaje de margen
    cod_proveedor?:number; // Código de proveedor
    articulo?:number;     // Código de artículo interno
    cod_iva?:number;      // Código de IVA
    cd_proveedor?:number; // Código de proveedor alternativo
    rubro?:string;        // Rubro del artículo
    estado?:string;       // Estado del artículo
    cd_articulo?:number;  // Código de artículo
    cd_barra?:string;     // Código de barras
    cod_deposito?:number; // Código de depósito
    _precioConversionSospechosa?: boolean; // Flag para marcar precios con conversión sospechosa
}