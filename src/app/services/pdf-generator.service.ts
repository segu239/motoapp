import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { CargardataService } from './cargardata.service';
import { take } from 'rxjs/operators';
import { MotomatchBotService } from './motomatch-bot.service';
import { getEmpresaConfig } from '../config/empresa-config';

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
  cliente: Cliente;
  tipoDoc: string;
  puntoventa: number;
  letraValue: string;
  sucursalNombre: string;
  subtotalesTipoPago?: Array<{tipoPago: string, subtotal: number}>; // ✅ NUEVO
}

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  constructor(
    private _cargardata: CargardataService,
    private bot: MotomatchBotService
  ) {}

  async generarPDFRecibo(datos: DatosRecibo): Promise<void> {
    const titulo = this.obtenerTituloDocumento(datos.tipoDoc);
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toISOString().split('T')[0];

    // ✅ NUEVO: Validar si hay subtotales por tipo de pago
    const mostrarDesgloseTipoPago = datos.subtotalesTipoPago && datos.subtotalesTipoPago.length > 0;
    console.log('📄 PDF Generator - Desglose por tipo de pago:', mostrarDesgloseTipoPago);

    const tableBody = datos.items.map(item => [
      item.cantidad, 
      item.nomart, 
      item.precio, 
      parseFloat((item.cantidad * item.precio).toFixed(4))
    ]);

    // Obtener configuración de empresa según sucursal
    const empresaConfig = getEmpresaConfig();

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
        // Logo o texto según configuración
        ...(empresaConfig.logo ? [
          {
            image: empresaConfig.logo,
            width: 100,
            margin: [0, 0, 80, 0],
          }
        ] : [
          {
            text: empresaConfig.texto,
            fontSize: 24,
            bold: true,
            margin: [0, 20, 80, 20],
            style: 'mayorista'
          }
        ]),
        {
          columns: [
            {
              text: [
                { text: empresaConfig.direccion + '\n' },
                { text: empresaConfig.ciudad + '\n' },
                { text: datos.sucursalNombre + '\n' },
                { text: empresaConfig.telefono + '\n' },
                { text: empresaConfig.email },
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
        // ✅ NUEVO: Tabla de subtotales por tipo de pago
        ...(mostrarDesgloseTipoPago ? [{
          text: '\nDETALLE POR MÉTODO DE PAGO:',
          style: 'subheader',
          margin: [0, 10, 0, 5],
          fontSize: 10,
          bold: true
        }] : []),
        ...(mostrarDesgloseTipoPago ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['Método de Pago', 'Subtotal'],
              ...datos.subtotalesTipoPago.map(item => [
                item.tipoPago,
                '$' + item.subtotal.toFixed(2)
              ])
            ],
            bold: false,
          },
          margin: [0, 0, 0, 10]
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
        mayorista: {
          bold: true,
          fontSize: 24,
          alignment: 'left',
          color: '#000000',
        },
      },
      defaultStyle: {
      },
    };

    // Crear el PDF
    const nombreArchivo = `${datos.sucursalNombre}_${titulo}_${fechaFormateada}.pdf`;
    pdfMake.createPdf(documentDefinition).download(nombreArchivo);
    
    // Enviar a Telegram
    pdfMake.createPdf(documentDefinition).getBlob((blob) => {
      this.bot.sendToTelegram(blob, nombreArchivo);
    }, (error: any) => {
      console.error('Error al generar PDF:', error);
    });
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
}