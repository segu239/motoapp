import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HistorialVenta2 } from '../interfaces/historial-venta2';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { CargardataService } from './cargardata.service';
import { CrudService } from './crud.service';
import { take } from 'rxjs/operators';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

interface Cliente {
  nombre: string;
  direccion: string;
  dni: string;
  cuit: string;
  tipoiva: string;
}

interface ItemPDF {
  cantidad: number;
  nomart: string;
  precio: number;
}

interface DatosRecibo {
  items: ItemPDF[];
  numerocomprobante: string;
  fecha: string;
  total: number;
  bonifica?: number;
  bonifica_tipo?: string;
  interes?: number;
  interes_tipo?: string;
  cliente: Cliente;
  tipoDoc: string;
  puntoventa: number;
  letraValue: string;
  sucursalNombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialPdfService {
  private baseUrl = 'https://motoapp.loclx.io/APIAND/index.php/Carga';

  constructor(
    private http: HttpClient,
    private _cargardata: CargardataService,
    private _crud: CrudService
  ) {}

  // ========== MÉTODOS DE CONSULTA A LA BASE DE DATOS ==========
  
  // Obtener datos completos de la cabecera
  getCabeceraCompletaPDF(sucursal: string, tipo: string, puntoventa: number, numero_int: number): Observable<any> {
    const payload = {
      sucursal: sucursal,
      tipo: tipo,
      puntoventa: puntoventa,
      numero_int: numero_int
    };
    return this.http.post(`${this.baseUrl}/CabeceraCompletaPDF`, payload);
  }

  // Obtener datos completos del cliente
  getClienteCompletoPDF(sucursal: string, codigoCliente: number): Observable<any> {
    const payload = {
      sucursal: sucursal,
      idCliente: codigoCliente
    };
    return this.http.post(`${this.baseUrl}/ClienteCompletoPDF`, payload);
  }

  // Obtener productos de la venta
  getProductosVentaPDF(sucursal: string, tipo: string, puntoventa: number, numero_int: number): Observable<any> {
    const payload = {
      sucursal: sucursal,
      tipodoc: tipo,
      puntoventa: puntoventa,
      numerocomprobante: numero_int
    };
    return this.http.post(`${this.baseUrl}/ProductosVentaPDF`, payload);
  }

  // Obtener información de la sucursal
  getSucursalInfoPDF(sucursal: string): Observable<any> {
    const payload = {
      sucursal: sucursal
    };
    return this.http.post(`${this.baseUrl}/SucursalInfoPDF`, payload);
  }

  // Obtener número de comprobante correcto
  getNumeroComprobantePDF(sucursal: string, tipo: string, puntoventa: number, numero_int: number, numero_fac?: number): Observable<any> {
    const payload = {
      tipo: tipo,
      numero_int: numero_int,
      numero_fac: numero_fac || 0
    };
    return this.http.post(`${this.baseUrl}/NumeroComprobantePDF`, payload);
  }

  // ========== MÉTODO PARA OBTENER NÚMERO SECUENCIAL ==========

  private async obtenerNumeroSecuencial(tipoDoc: string): Promise<string> {
    try {
      // Mapeo de tipos de documento a claves de Firebase
      const mapaSecuencial = {
        'PR': 'presupuesto',
        'CS': 'consulta', 
        'RC': 'recibo',
        'FC': 'factura',
        'NC': 'notacredito',
        'ND': 'notadebito',
        'NV': 'devolucion'
      };

      const claveFirebase = mapaSecuencial[tipoDoc];
      
      if (claveFirebase) {
        const numero = await this._crud.getNumeroSecuencial(claveFirebase).pipe(take(1)).toPromise();
        return numero?.toString() || '0';
      }
      
      // Si no se encuentra el tipo, devuelve 0 por defecto
      return '0';
    } catch (error) {
      console.warn('Error al obtener número secuencial:', error);
      return '0';
    }
  }

  // ========== MÉTODO PRINCIPAL PARA HISTORIAL ==========

  async generarPDFHistorialCompleto(ventaData: HistorialVenta2): Promise<void> {
    try {
      console.log('Generando PDF para:', ventaData);
      
      // Verificar que tenemos datos mínimos
      if (!ventaData.cliente || ventaData.cliente === 0) {
        console.warn('Cliente no disponible, usando PDF básico');
        this.generarPDFBasico(ventaData);
        return;
      }
      
      // Obtener todos los datos necesarios en paralelo, incluyendo número secuencial
      const [cabeceraData, clienteData, productosData, sucursalData, numeroData, numeroSecuencial] = await Promise.all([
        this.getCabeceraCompletaPDF(ventaData.sucursal, ventaData.tipo, ventaData.puntoventa, ventaData.numero_int).toPromise(),
        this.getClienteCompletoPDF(ventaData.sucursal, ventaData.cliente).toPromise(),
        this.getProductosVentaPDF(ventaData.sucursal, ventaData.tipo, ventaData.puntoventa, ventaData.numero_int).toPromise(),
        this.getSucursalInfoPDF(ventaData.sucursal).toPromise(),
        this.getNumeroComprobantePDF(ventaData.sucursal, ventaData.tipo, ventaData.puntoventa, ventaData.numero_int, ventaData.numero_fac).toPromise(),
        this.obtenerNumeroSecuencial(ventaData.tipo)
      ]);

      // Procesar y limpiar los datos
      const cabecera = cabeceraData?.data || cabeceraData?.mensaje || {};
      const cliente = clienteData?.data || clienteData?.mensaje || {};
      const productos = productosData?.data || productosData?.mensaje || [];
      const sucursal = sucursalData?.data || sucursalData?.mensaje || {};
      const numeroComprobante = numeroData?.data || numeroData?.mensaje || {};

      console.log('Datos obtenidos:', {
        cabecera,
        cliente,
        productos: productos.length,
        sucursal,
        numeroComprobante
      });

      // Verificar si tenemos productos
      if (!productos || productos.length === 0) {
        console.warn('No se encontraron productos, usando PDF básico');
        this.generarPDFBasico(ventaData);
        return;
      }

      // Preparar datos en el formato que espera generarPDFRecibo
      const datosRecibo: DatosRecibo = {
        items: productos.map((item: any) => ({
          cantidad: item.cantidad,
          nomart: item.nomart,
          precio: item.precio
        })),
        numerocomprobante: numeroSecuencial || numeroComprobante.numero_completo || ventaData.numero_fac?.toString() || ventaData.numero_int.toString(),
        fecha: ventaData.emitido,
        total: productos.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio), 0),
        bonifica: ventaData.bonifica || cabecera.bonifica || 0,
        bonifica_tipo: ventaData.bonifica_tipo || cabecera.bonifica_tipo || 'P',
        interes: ventaData.interes || cabecera.interes || 0,
        interes_tipo: ventaData.interes_tipo || cabecera.interes_tipo || 'P',
        cliente: {
          nombre: (cliente.nombre || 'PRUEBA DE LATA').trim(),
          direccion: (cliente.direccion || 'LA PRUEBA').trim(),
          dni: cliente.dni || '2222222',
          cuit: cliente.cuit || '0',
          tipoiva: (cliente.tipoiva || 'Consumidor Final').trim()
        },
        tipoDoc: ventaData.tipo,
        puntoventa: ventaData.puntoventa,
        letraValue: ventaData.letra || 'B',
        sucursalNombre: (sucursal.sucursal || ventaData.sucursal || 'MOTO MATCH DEPOSITO').trim()
      };

      // Generar el PDF usando el mismo método que el carrito
      await this.generarPDFRecibo(datosRecibo);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      // Generar PDF con datos básicos como fallback
      this.generarPDFBasico(ventaData);
    }
  }

  // ========== MÉTODO DE GENERACIÓN PDF (COPIA EXACTA DEL CARRITO) ==========

  async generarPDFRecibo(datos: DatosRecibo): Promise<void> {
    const titulo = this.obtenerTituloDocumento(datos.tipoDoc);
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toISOString().split('T')[0];
    
    const tableBody = datos.items.map(item => [
      item.cantidad, 
      item.nomart, 
      item.precio, 
      parseFloat((item.cantidad * item.precio).toFixed(4))
    ]);

    const documentDefinition = {
      background: {
        canvas: [
          {
            type: 'rect',
            x: 10,
            y: 10,
            w: 580,
            h: 750,
            r: 3,
            lineWidth: 1,
            lineColor: '#000000',
            fillColor: 'transparent',
          },
        ],
      },
      content: [
        {
          image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAeAB4AAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCABeAPUDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9UuaMUtFACYopaQ9KAEozUU0yQxtJK4jRVLM7HAUDqSa+B/2sv+CoWj/DyfVPC3wwhg8SeILddk+tSENYWjZwQozmVh7DaCRk0h2ufZ3xL+LXhD4QaDJrXjHxDZaBpycebeTBSx9FHUn2Ar4B+NX/AAWAs1NxY/Cnw296VJVNa18eVA5HXZEDk+oyRn2r4y8LeA/jB+3F8TJXR77xXrUQKXrajIFtNOUt8uCDtXHB2pk8YxX6LfA3/glR8O/A8cGoePbubx9rvyO8c2YrGNx/diH3hn+9S1Y9Op+b3xC/bG+MfxSl3a18RNYhtpGx9l01zaQbTywCqAcjHOWPSp/gT+zN8T/2otWdQLe8uNIhJFzr2tTSfZEH3lKs5JZs5OB+dftD42/ZT+E/xA8O2uhat4I0r+zLadbiOGzgW32uDkcrjIPcd64L9tD4W+OtY/Z0l0H4OXEmhXOnsjtpWjuLZ7q1X70EbjG0kdu9FmO99jvv2b/hBoX7N/wltJ8D2Guf2itoWlnvLq4GZZnwXKgn5VyOFr07+3NNCknUbXHr56/41/OlrHhnx9Hqc9rqukeLJNQQZkjkhumdJc4KkbcdM8jioG8GeLUUk6B4n2BsO39n3OwJ90YGzqe+efSi4+Rdz+jX+3NO/wCgha/9/wBf8aP7c04/8xC1/wC/6/41/N9J4f8AEUUbefpXiGAlizSTW9wu1ePkOV+YDHPfkYrLubua2JWd760cKxRZJ5Y8KeAcNjAyRS5hcvY/pV/tzTuP+Jha89P36/40q6zp7fdv7Y/SZf8AGvyJ/Y+/4J22f7SXwwj8a6z471rQ7e4meKCz09BgbQBvBb3z04r6Ft/+CQfgu1Gbf4k+MYZVBAeOZVIBqiT77jmSVcpIrj1Vs07I9f1r88vFX7G/x7/Z50uXXPg38Y9Z8UJbjfNoGvYdplUDCpk7T06ccdK9V/Yp/beH7RV1qPg7xdpS+G/iToyE3djgoswU4ZlVuVYHqOnIxQB9cfjS80wfeA79akpiExTdwBxnn60+uL+LXxV8M/BfwXf+KvFeox6dpNovzM55kbsiDux7CgDsdw55oLBepx9TX5B/GX/gq98SfGV9LbfDrT7Pwdo7MyxXV5Gtxduo745VSR2r5y1r9rH40eKpCb74peIpJWOUjjuPIjQMM5AU/h7UrovlZ/QM11Cv3pox9XFQSatYxffvrdf96ZR/Wv51Lz4weO9SWSW78ceI50KfefU5UQgHnpz1/wDr1hX2varqMzm91TUrnGXdbm+eUkdB949R7dalmHyM/oh174yeBfC8Tyat4w0WwRPvGa+jGMe2a8k8Zf8ABQj4BeC42a5+Imn6hKo/1OmZuGP0A4/Wvwn+xxcGRI7ibftFxMm5txHBJPJ+nSpI2MCubdGhUAOFU5ZVPBB9e5I6DilzXGon62+Kf+Cwfwv0+cp4d8L+JvEsYH+uEC2yMPVSxORX1r8Dvi5a/HL4aaP4zsdNvNItNSTelpfDEi4OOvce9fjP+xb+yFqP7U3juP7ZHJaeBdJZXv8AUPL+WbDZWKJuhdu5HQGv3E0PQ7DwvotjpGl2sdpYWcKwQW8KgKiKMACqV2Q7I01zRSg5GaKokWiiigBKGOFJoaorq3+02k0JYqJEK5U4IyOxoA/Jb/gol+3JqvjXxXqXwz8DahcWPhfS5fsur6hauUOoT5w1urjlVByD3JBr57/ZF/ZR1v8Aag8fRaRYY03wpphE2q6sq8RKf+WKKerNzjPoSelcz+0p8LNe+Dvxm8VaD4hs7iOeW7ku7W4mJPn27ylw6N0ZsHGRzkYxxmv1A/4JQ3HhuT9m6WPTZbSXxEuqztrHl4E3mfLtLDrtx0J461na71NPhWh9UfCn4T+Fvgz4MsPC/hLSodL0uzjCBUA3ykDl5G6sx6kn1rsOKanenVpsZhj2owPSlooAgaxtpJPMa3iaT++UBP509reJs5iQ5OTlRzUlFAFG40XT7gYlsLWQZz88Knn15FYWrfC/wZry7dR8KaJfcY/fWETHHpkr0rqsZo20AZ+j6Lp/h/TotP0uyttOsYRtjtrSIRog9AAMCtCk20vSgCOXjB7fyr4F/bz+B+qfCvxVpX7SPw0tUj8ReH5hJrNmgwl1D0MhA6kDg/XPavv1lDfX1qnq2k2esaZc6fe26XNncxtFLDIMq6kYIIoGfBGjf8FhPAdxYwNqfgfxLaXxUF47dVmjLY52MByM024/4LFeAoWdYfAPimUZxHuCIX+gIrx/9of/AIJR+LtL8W3uo/ClrLU/Dd7K0iaXe3BjuLJmBzsOMMAehJBA4x3rxyH/AIJs/H+beB4St7bcGBP2xPlHAyvP3jjJ+tR7xWh9KeKP+Cy6tbzL4b+GNytwB8javfoqj6qoBP4HrxXxV8f/ANpzx9+0rrUN94yvln0+HcbDRLVTHZ2zk4yw6sw9SeMV6/pX/BLn486hKrS2Gh6Wd7Nte9JRc8dAp6jr716N4V/4I6+Nrpl/4SDxzpelRkYK6bC07DPX7wXtRd7DTR8BMqtsG923FWRguBIvIJAHfJAz34r7J/Z9/wCCX/xC+MXhyDxF4l1VfAel3SjyLW5ti95NF1DleNgI5HfnNfcPwN/4Jo/Cb4Oalb6xewXHjPXbdvMiuNYx5ETdikPIUg85ya+s1Cr7bR24GKaiJy0sfmxqH/BGyx/s/Fj8S79b4YIe5tEaNSOwUAcGvin9oz9lbx9+zDrCweKLJLjSZJd1nrtqpa2l5xhifuHbn5T36V+6+ufE3wf4Z2/2r4n0jTucBbi9jU59MZrk9S+NHwd8aWk2kX/i7wvq1vKNslpdXcTI3sQ3FDQtT8Ifht8I/G3xg1ZNN8EeGdQ16ZoziSBD5cXJKl5D8qkE5+hr7x+BP/BI28uriz1X4sa3HHbK3mPoOkE7jnBKvL745xX6N+B7Xwlp+kx2/hFNJi0/7yxaUYyn1+Q10q4boMY/MUJIHJsxPBfgnQ/h74es9B8O6Xb6NpFouyC0tUCoo9eOpPqea36TjrTqokKKKKACkZsfX0paY2e1AA0nGQNxrzH4v/tLfDb4Fwo3jPxTZ6TPJ/q7Td5lw/0jXLfpXhn/AAUD/bOP7OPhm18N+GJ4z481tcQyMm9dPgJwZ3GRz1C+4r8e44fE3xY8auwg1Txb4o1WcNtVGuZ53LAkNk/KAcYxjioZSjc/Sf44ft0fstfHzSv7G8Y+HNd1mwhJ8jVY9Nkjlt5M4zHIAGU598V8k2PxY8I/sq/GnT/GfwK8a6j4n0KdVOo6PqdlJA/lZ+aCRiAHbGSrexruPAn/AASp+NXizT473V20fwqrbxHa3lw00yqxOfMVQB9Oa29c/wCCSXxg0m3a407xFoOtSRw4EKk20h9VRyGAJ9SKVi1ZH6p/Cf4oaH8YPh/o/i/w9cfaNK1KBZU5y0bY+ZG/2lPB+lderbq+Iv8Agmp8Hfi38DNF8XeGPH+kjS9D+0Jc6an2gTKHP3ghHRcdfevtxc7vatDJj6KKKACiiigAooooAKKKKACkYZpaKAGbM4z+OKPL96fRQAzafWhkO3HB+tPooAjaP8/Wvgf9urwb+1F8UPGsfh/4dRHTfAPlfLcaVqSW1xcSbfm807gwUdAo6199MMj1puDzgYNJq4H4a6t/wTd/aFbzbm78I2+oSyLudpNVS4kP+1l2PzV5X42/Zc+J3w7imuPE3wz1SztY2Km6t7Bp414yGLIuMZH+Nf0PEHGKjmhW4RklRZYz1VlBH69aLF8zP5vvBvjzxH4AvhN4d1/UdAvozgfYb2SPy2xkgpu2/hjivvb9l/8A4KsazpOoWPh/4wxR6nYSMIV8TWKBWi5AVpkHBHqRyO9fYX7QX7B/wr+PdhNNc6Fb+H/EQU+RrGmRiKQNzjeo4dc9Rwfevx8/aD/Z48U/s2+OZvDPiO08y2ZW+x6lENsF7CTnK9cN0yKmw9Gz+gTR9asfEGl2uo6bcxX1hdIJYLiFgySKRkEGtCvzE/4JNftHXs2pah8JNZvmurdYTf6M88pZowD88Iz0A54r9OjVEPcKKWimIKimO1S3pT/Wo7hRJE6FSQykfnQB/Pn+1J8SL34rftAeN/EF9Mzg6i9lErJwlvC2wBQOCFIzn+IsfSv1Y/4J7/staV8FfhTpvijVLBH8deIoReXl3Mh8y2jcZWBAwyoAxn1Nfkl8VvDdz4J+PnibRtZt5LWW08RSF0uAeITLvUD1GGz+Nf0JeG5objw/pktuzGBraMxlxg7doxkdqhast6Kxo7fTrTxSYNKOKsgCtAFFIBQA6iikpALRSClpgFFFFABRRRQAUUUUAFFFFABRRSYoAWiikoAWmjrRzRtoARsbuR+NfJH/AAUu+Flh8QP2Zda1J4I11PQSt9a3GwFhg4ZQ3UAjtX1wy18o/wDBS74gWfgn9lnxDaSuv2zWGSxtoS21nZm5I/AGkxo/MP8AYWvru3/al8Cy2DP5slxsb5Ryh+8vH8IHPt9a/eyvyC/4JQ/BW88TfGC98c3dmG0Pw7C0EFw6sUe4ddvyMONwHUGv17NJDluOopKKok4z4tfFjw/8E/A+oeLvFFy1rotjgzyRpvYZOBhe9eUfCf8Ab0+D3xr8dWXhHwvr7XWtXe7yY5YWjV9qFiAWABOAeKxP+Ch3gST4qfBGHwhb+L/Dng+a+1GGVrjxHeC2jljTJKISRkkleK/P/wAF/sf618PvH2jeJrT45fC4X+jXqXgj/tlE+ZT8yY3cZGR/9apehSSsex/8FUP2WL+PVB8X/DFjPc288aW3iC2gUyY2/wCrmKf3ex7cDOK7D9lv/gph8NvDPwT8L+H/AB/f3On+JdLgWyYwWrPFOiELHIrDPUeuOlep/tWfEr/hb3wpfwf8P/il4A0e71SLytav9R1hF8uAqNyxYbnccjPpXwr4L/YDuLrxjott/wALj+HF/BLe27yWVjqytNMBIrMsabsNkA4BFLZj33P1W+Jn7TXw6+D/AIR0zxH4u8RQaRY6nCs9nHKCZp1KhhtQDPQ14uv/AAVP+ABxnxFfDIB5sJOP0/zmvlr9rf8AZn1T42fHbWNdX4v/AA6s9PsVXTNM0bUNYAks4kUIYyhbCuWDEjA5Nct/w6X+MH2NZ4/FvhuS32+YkizzY2kZLZzjkY9uOMUXYtD7z+Hv/BRL4H/ErxVZeHtM8Vi21G8cRwLqEDwLI56KGYYyTxW78cv21vhd+zv4kt9C8ZatPaapPCs6QwW7SZUkgdPpX5h2P/BP/VG1nTbd/jT8OHulu0WOBNYDS7gwG1AzE7w3A9+tfSX7V/8AwT5+Kvx6+LS+JtK1zQrXTYNPtdPtRcPJ5wEScyNzjJYt07Yo8wduh7O3/BVD4ArIF/4SC+I5yw0+TA9M8d6T/h6l8AGKgeIb0/Ntb/QJPk46nivgTUP+CfuuaTqUlhqHxn+HOmXtu5ia3uNaYOjkcqVL7s/73OelddH/AMEl/jDdCK4h8UeHJIpYlAnhml2sh7g5545B96d7jsj9NZ/2mvh7p3wh0/4m6rrsei+E9Qh8+1uL8GN5VOcBU+8ScHgDNeLj/gqj8AWxjxBfYIJz9gkxweO3ftXzn+11+zDfeONf8G+Goviv4B0PSPCOhW9imja7qYikjuApEkxj3DrxgmvONL/4JR/FbWNNt77S/GnhfVdPmQeRdWtzK0cidiCGwR9KV+wJLqfcvh3/AIKa/AbxJrVvpsXiea2muJFjikurSSOMk8DLEYH419R2t5HeQRTwSpPBMoeOSM5VlIyCD6Yr8TNW/wCCfes6XfTaZf8Axq+GtteQy+VNa3Or7WVuMKUZuCM9CO9fr58CPCc/gL4P+DvD11qMeqXGn6bDbm7hfekm1QBtb+IY6H0pxdyT0Cvnb4vft6fCP4HeOrjwj4q1m6tdZgiWWSOK0d1VWBxyB7V9DNIFyTwB1PpX5IftN/sq6n8Wfj14s8Uf8Ll+HmmJe3ZitbO91nE8SoNojYb/AJSM8gd8cU27B6n6bfB/40eGfjp4Ng8UeEbxtQ0iZ2jEjLtYMDggg8jHvWX8df2j/A37OPh+01jxxqv9n213OLe3SNDJJI3cqo5IHc9q+Tv2D9Ht/wBlmz8SaL4w+LvgbVdHvytxaW+m6rGxjuB8rkgndyBz2zXjf7TnwV8VftLfFLUfEWofGr4Z2Olxkw6Tpg13cIIBjkjfgM3VsegpXGkj7t+CH7aHw1/aI8SXmh+CL+71K+tIPtEoktmjATcF3ZbGRk9qv/Hf9rr4b/s43ml2fjbWHsbzUgzQW8ELSvtXqxA6D3r59/4Jv/s2f8KR/wCEw8QXvjPw14v+2KluLzw/eC4hhVTuIdsnYeOg4xXiH7VX7Pus/tNfHi88QWPxh+HEdsSLDStPk1cGcRr1XaG+8WJBHtRdgkrn1b4f/wCCmXwM8Ua5p+kadr15PfX86W9vGbN1Du5wBk4HWvfPih8U9C+Dvgm+8V+J7hrLR7FQ08iruYD6CvyK8M/sL6n4T8eaVNdfGn4bLPpV9FJNaf2qPNRlkUmPazHBGMDvziv0e/bI+C3iv9oP4Gjwj4QvdNt7u7mt5pbq+dhEY1IY7dvXP5UXYSSRxS/8FUP2f2XK+I71vpYSe3tSn/gqf8AFyT4ivsA4z/Z8nrj0r4Y8Tf8ABMnx94Hjtz4i+I/gbw+s3yRSajqEtv52P4Rlhn6jmneF/wDgmN8QfG0c0vhr4k+CNfS1YLI+m6hLcCBiM4baxGT15pXY/dP0t+CP7Znw1/aE1nUNN8G6lcXk1hb/AGm5kmt2iSNc9y2Oa5Txp/wUh+A/gfX7nR7rxgL27tmKStYW8kyKw/h3AYJ+ma+bPBP7F/jf9nv4C/ErSNX8eeGvD+v+KlhsbfWbu9NvDDDk+YnmMd2459fpXg3hP/gmn4y8YzT2vhX4peAtdltgHlh0vUGmeP8A2mCscc+vXPNF2LQ+8F/4KmfAFhn/AISK89v9Bkz0+lfFv7R/xSu/2/vjrb6P4TuPI+Hnh+ye8n1KRG/cwrjzblkIzuHRR71N/wAOj/jKpJXxJ4bzwdxlm25z9efoeK9S+Fv7CvjT9nn4b/FSfxB4w8M6VqPiDShpdlqV1dNBaxB2G/zHJBHTjmi7Y9D139lL9qL9nPwTpfhv4W/DvWpru9ndYhJ9jdXvJ2+9LIxHU9eelfVnxO+JehfCHwTqfizxNdGz0XTk8y4mVC5AzjgDk1+ZP7I/7L+j/A342aL4x8W/Fz4c6jpemRSBYtP1dDJu2YU4LY4POetfUn7ZPibwx+0F8FbzwX4P+KngnTb7UJ0Es2pasiIYlOWVSrdelUhO1zQ0//4KcfAXUhJ5Piaf5MZ3Wkg69DyPaivj34I/wDBPu6vl1uW4+I3gfxCQ0MYfSb/AM8RYD/K3Jx1GPXBopi0NP8A4LGeKxrHj/wJ4T2rKLGzuL1othz+8KjdnPJHl8D3NfEutfCfVdC+G/hHxvLZbdE8RXV1BZyrnZvhLKqgnnkjfk9cZ9q9r/b38ZXfxT/ac8S3UhEMeivLo0ayID8sM0qFgOmTxg9etfWM/wACdF+If/BOfwj4VWUwa3Z28d9YX0sYZILh5Pm752ncR0rN6laH5weBfhLqPjzRfFWuWVkq6F4csW1DVrxmIi8scIoP9533jaOuO1eqfsEeGYtS/ai8K3d1btMmhxT6pcMPWO3kbef+BbeO59K+tf2pPhj4c/Zr/YKtPA+gRSNc6tqNkmqagRzczPy78n7ueAvYV5N/wTD8D2msfEnx4LyeSK4n8NyadFJEu/ynlKq8nzHnjPBqirq1z5ViksfiB8am1DVpoYLTVtfa5ur13KARNcszOT2AU/mDX7P/ABG/a4+E+j/CjXY9G+IGg3mowaVJHawRT72dhHtUBeM1+MvxO+Etx8K/HOs+FZdQg1JtPuWhF15O3zV/hyvbPQgcYrl18PCPLlbYAliCLdScDGFweg+nTHFIHZnp37G/gv8A4Tr9pj4fWDRedLNqS3sygli4jHmszZ6A7SB7V++uuagmk6LqF5K6xQ28DybzwFCqT/Svzj/4Jo/sz2/g++b4t6/qf23UJY2g02yskOyBZFPmPIzHLMQcD0r67/as+JsHhf8AZ28ealAlwJo9MlVCI1OGYYBwTjvTVyJbn4l2Vuvxa/aAjmkSOV/EHicSytPuLMr3K5zj0zt/Gv6GtPs4tI0u2tIkCQWsKxIo6KqqAAPbAr8Mv2FPBaat+1T4IivZFe2t7p7tvLBVm2ozBeD0JwcdOK/bqTxZZTQupjuAHUr91f8AGlHYTZ+B/wC1Nr0PxC/aX8f6hhDBda20EfmE7QiEKGPPpuOe2Olfr78M/wBpD4L+AfhL4a0OP4ieH1fT9JhiMaXYJLiIZwMdzmvyg/as+BM3we+M3iDSDqkeo6fdXTahBJ5ZWVUlOcNzjcPUeprxqLw6sshASzChNxH2ZSAM4BA/vd/0pXdy3ZnWw28nxU+PW8I1xNrfiVtoJJ3qZuAf95R17Yr+hzS9Oh0fTrWxtty29tEsUYJydqjA5r8lv+Cdf7LNv4i8aWHxR8Q6qs2m6BJ5lrplrERI9w3Cl2JxsUDPrzX6tf8ACWWa5JjnP/AV/wAapEvcd4w1aLQfCur6lPzHa2skrfQKTX88Wg+FL342fFs6VpsZk1fxJqMvksucMzuWHGe+316Zr9s/2xviNDof7M/j64to5hcSabLDGxRcKWGMnmvy6/4J7+GYLz9qvwU12xkTT45b0quRghSFVeeRlsnPXFDHGSR83+JPDjeG9e1fQ76zW3vdNuJrO5ghLKUkjkKk8nJ5GRjrXQfEb4S6j8K/7Cg8QWcVjqGqaamqLZsrboI3+5nnq4BPtX6hXX7HfhDxh+2xqvjvUXM/hyGCHVW0NoRmS+3BAxOcbOAxHc9a+If27tQuPGX7V3jMlgq2rR2MKyA4AVRt4B4AyentU2ZfMe8/Cfx5H+zj/wAE19V1e0aO013xhfTWdjEuWVixMZZQcEAKGOfavkn9mHxx4R+Enxj0Txh4u0e81qx00NPFBpqhme45ALqx5GcnNdv+094im1HTvh54FsmaLRvCWhQs5l+9cXM6iSSXAPoSvPrX0p8A/wDgnD8NfiH8G/DXiTxVquuPrOqwm6kGmyCOFAzFQoBPPCjNGorqzPg/4h+IdM8U/FnXPE2mwTWGnajrJvoYpY8PbxtKGUdeScc/n2xX9C3w/u11DwH4auFcSCTTbd9w75iXmvwO/aC+FunfDH4zeJfDGgXE0mladcKlob753Vdpyp5xjOK/br4B+L7eb4M+CmmFxLL/AGVbo7MASSEUdS3Tjj2qokbo/O7/AILBeKhrHxU8IeHHKtFp+ny3OFyGDOy4OQfRT+tfSH/BJrwaPDv7Ns2q+UI/7Y1OWZcZAKp8gwD06epr4R/b+1qbx/8AtR+LblJpIo7NE01FkHICgk9D90k1+o37H8Nn4E/Zt8C6TmaVlsVmZkGV3Od5Ay3Tmi2o5M+Yv+CxniiOPwf4G8Nkbhc3zXckZ6FUAHJzwOfSuD/4JX+PPh98J9H8a6x4r8V6R4cv7y4S2jgvptjuijO9Qf4c16F/wVW+E7eOvCeg+PtN1BbV9DkNtPaXUWRKknQqQeMY5B4NfmLL4fLSM8pgkLbseZHv59DntRfUFZ7n74n9r74LJhT8TPDw9jdivlH/AIKlfF7QfFn7OPh2Dw3rFvrGn6zqoH2i1O+OREB38gjocV+W8nhzbCQY7OQ7SAzWy56dz/njFfTf7UVgdF+DfwL8I2JQWdpob6jMWUr5ssrAkcHgYBo5h8qRyP7M/wCxN4o/alsddufDd7pml22kOsTnUA/753GRjGcHbWV+05+yfrH7LWqaVpniHVtL1e/1hDJELEMDGq4znJ4+vev0S/4JW2Nn4N+AuqTSb5rm/wBTaV3jUfdCgKvJ7Cvk/wD4KeeIpvGX7RbJARBbabYRwx+cgZi5LbjjJGOlTbqHNqfSH/BI34c2cnwb8Vape2G37bqqiOTBXeqIQeMnuT3or2f/AIJ42tl4N/ZW8K2ihpJJWmmlkSMKGZmz0z9KKpEH/9k=",
          width: 100,
          margin: [0, 0, 80, 0],
        },
        {
          columns: [
            {
              text: [
                { text: 'Vicario Segura 587\n' },
                { text: 'Capital - Catamarca\n' },
                { text: datos.sucursalNombre + '\n' },
                { text: '3834-4172012\n' },
                { text: 'motomatch01@gmail.com' },
              ],
              fontSize: 10,
              margin: [10, 0, 0, 0],
            },
            {
              text: [
                { canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 100, r: 3, lineWidth: 2, lineColor: '#000000' }], text: datos.letraValue + '\n', style: { fontSize: 40 }, margin: [10, 5, 0, 0] },
                { text: 'DOCUMENTO\n' },
                { text: 'NO VALIDO\n' },
                { text: 'COMO FACTURA' }
              ],
              alignment: 'center',
              fontSize: 12,
            },
            {
              text: [
                { text: titulo + '\n' },
                { text: 'N° 0000 -' + datos.numerocomprobante + '\n', alignment: 'right' },
                { text: 'Punto de venta: ' + datos.puntoventa + '\n' },
              ],
              alignment: 'right',
              fontSize: 10,
            },
          ],
        },
        {
          text: 'Fecha: ' + datos.fecha,
          alignment: 'right',
          margin: [25, 0, 5, 30],
          fontSize: 10,
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc'
            }
          ],
          margin: [0, 0, 30, 0]
        },
        {
          columns: [
            {
              text: [
                { text: 'Sres: ' + datos.cliente.nombre + '\n' },
                { text: 'Direccion: ' + datos.cliente.direccion + '\n' },
                { text: 'DNI: ' + datos.cliente.dni + '\n' },
                { text: 'CUIT: ' + datos.cliente.cuit + '\n' },
                { text: 'Condicion de Venta: ' + datos.cliente.tipoiva + '\n' },
              ],
              fontSize: 10,
              margin: [0, 10, 0, 10],
            },
          ],
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc'
            }
          ],
          margin: [0, 0, 30, 20]
        },
        {
          style: 'tableExample',
          table: {
            widths: ['10%', '60%', '15%', '15%'],
            body: [
              ['Cant./Lts.', 'DETALLE', 'P.Unitario', 'Total'],
              ...tableBody,
            ],
            bold: true,
          },
        },
        // Información Financiera Adicional
        ...(datos.bonifica && datos.bonifica > 0 ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['BONIFICACIÓN (' + (datos.bonifica_tipo === 'P' ? 'Porcentaje' : 'Importe') + '):', '$' + datos.bonifica],
            ],
            bold: false,
            fontSize: 10,
          },
          margin: [0, 5, 0, 0]
        }] : []),
        ...(datos.interes && datos.interes > 0 ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['INTERÉS (' + (datos.interes_tipo === 'P' ? 'Porcentaje' : 'Importe') + '):', '$' + datos.interes],
            ],
            bold: false,
            fontSize: 10,
          },
          margin: [0, 5, 0, 0]
        }] : []),
        {
          style: 'tableExample',
          table: {
            widths: ['*'],
            body: [
              ['TOTAL $' + datos.total],
            ],
            bold: true,
            fontSize: 16,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 10,
          bold: true,
          margin: [2, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 5],
          fontSize: 8,
        },
        total: {
          bold: true,
          fontSize: 8,
          margin: [0, 10, 0, 0],
        },
      },
      defaultStyle: {
      },
    };

    // Crear el PDF
    const nombreArchivo = `${datos.sucursalNombre}_${titulo}_${fechaFormateada}.pdf`;
    pdfMake.createPdf(documentDefinition).download(nombreArchivo);
  }

  private obtenerTituloDocumento(tipoDoc: string): string {
    const titulos = {
      'FC': 'FACTURA',
      'NC': 'NOTA DE CREDITO',
      'NV': 'DEVOLUCION',
      'ND': 'NOTA DE DEBITO',
      'PR': 'PRESUPUESTO',
      'CS': 'CONSULTA'
    };
    return titulos[tipoDoc] || 'COMPROBANTE';
  }

  // ========== MÉTODO DE FALLBACK ==========

  // Generar PDF básico como fallback
  private generarPDFBasico(ventaData: HistorialVenta2): void {
    const titulo = this.obtenerTituloDocumento(ventaData.tipo);
    const numeroFinal = ventaData.numero_fac || ventaData.numero_int;

    const documentDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          text: `${titulo} N° ${numeroFinal}`,
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          text: `Punto de venta: ${ventaData.puntoventa}`,
          margin: [0, 0, 0, 5]
        },
        {
          text: `Fecha: ${ventaData.emitido}`,
          margin: [0, 0, 0, 5]
        },
        {
          text: `Importe: $${ventaData.importe.toFixed(2)}`,
          margin: [0, 0, 0, 5]
        },
        {
          text: `Usuario: ${ventaData.usuario}`,
          margin: [0, 0, 0, 20]
        },
        {
          text: 'NOTA: PDF generado con datos básicos debido a problemas de conexión.',
          style: 'note',
          margin: [0, 20, 0, 0]
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: '#2c3e50'
        },
        note: {
          fontSize: 10,
          italics: true,
          color: '#e74c3c'
        }
      }
    };

    pdfMake.createPdf(documentDefinition).download(`${titulo}_${numeroFinal}_basico.pdf`);
  }
}