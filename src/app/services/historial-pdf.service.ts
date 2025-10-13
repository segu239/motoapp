import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { HistorialVenta2 } from '../interfaces/historial-venta2';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { CargardataService } from './cargardata.service';
import { CrudService } from './crud.service';
import { take } from 'rxjs/operators';
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
  bonifica?: number;
  bonifica_tipo?: string;
  interes?: number;
  interes_tipo?: string;
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

  // ========== MÉTODO PARA OBTENER NOMBRE DE SUCURSAL DESDE FIREBASE ==========
  
  private async obtenerNombreSucursalDesdeFirebase(sucursalValue: string): Promise<string> {
    try {
      // Obtener el ID numérico de la sucursal desde sessionStorage (como hace carrito)
      const sucursalId = sessionStorage.getItem('sucursal');
      console.log('🔍 Obteniendo nombre sucursal - sucursalValue:', sucursalValue, 'sucursalId:', sucursalId);

      return new Promise<string>((resolve, reject) => {
        const subscription = this._crud.getListSnap('sucursales').subscribe(
          data => {
            console.log('📋 Lista de sucursales desde Firebase:', data);
            
            // Buscar por ID numérico (como hace carrito) - acceder a .payload.val()
            const sucursalEncontrada = data.find(suc => {
              const sucursalData = suc.payload.val() as any;
              return sucursalData && sucursalData.value && sucursalData.value.toString() === sucursalId;
            });
            
            if (sucursalEncontrada) {
              const sucursalData = sucursalEncontrada.payload.val() as any;
              console.log('✅ Sucursal encontrada:', sucursalData);
              subscription.unsubscribe();
              resolve(sucursalData.nombre || 'SUCURSAL DESCONOCIDA');
            } else {
              console.warn('❌ No se encontró la sucursal con ID:', sucursalId);
              subscription.unsubscribe();
              resolve(sucursalValue || 'SUCURSAL NO DISPONIBLE');
            }
          },
          error => {
            console.error('❌ Error al obtener sucursales desde Firebase:', error);
            subscription.unsubscribe();
            resolve(sucursalValue || 'SUCURSAL NO DISPONIBLE');
          }
        );
        
        // Timeout de seguridad
        setTimeout(() => {
          subscription.unsubscribe();
          console.warn('⏰ Timeout obteniendo sucursal desde Firebase, usando fallback');
          resolve(sucursalValue || 'SUCURSAL NO DISPONIBLE');
        }, 5000);
      });
    } catch (error) {
      console.error('❌ Error en obtenerNombreSucursalDesdeFirebase:', error);
      return sucursalValue || 'SUCURSAL NO DISPONIBLE';
    }
  }

  // ========== MÉTODO PRINCIPAL PARA HISTORIAL ==========

  async generarPDFHistorialCompleto(ventaData: HistorialVenta2): Promise<void> {
    try {
      console.log('Generando PDF para:', ventaData);
      
      // Verificar que tenemos datos mínimos - continuar con valores por defecto
      if (!ventaData.cliente || ventaData.cliente === 0) {
        console.warn('Cliente no disponible, se usarán datos por defecto en el PDF');
        // No generar PDF básico, continuar con el flujo normal usando datos por defecto
      }

      // OBTENER NOMBRE DE SUCURSAL DESDE FIREBASE (como hace carrito)
      const nombreSucursalReal = await this.obtenerNombreSucursalDesdeFirebase(ventaData.sucursal);
      console.log('🔧 Nombre de sucursal obtenido desde Firebase:', nombreSucursalReal);

      // SOLUCIÓN: Usar el nuevo método con forkJoin en lugar de Promise.all
      const datosCompletos = await this.obtenerDatosSecuencial(ventaData);
      
      // Procesar y limpiar los datos
      const cabecera = datosCompletos.cabeceraData?.data || datosCompletos.cabeceraData?.mensaje || {};
      const cliente = datosCompletos.clienteData?.data || datosCompletos.clienteData?.mensaje || {};
      let productos = datosCompletos.productosData?.data || datosCompletos.productosData?.mensaje || [];
      const sucursal = datosCompletos.sucursalData?.data || datosCompletos.sucursalData?.mensaje || {};
      const numeroComprobante = datosCompletos.numeroData?.data || datosCompletos.numeroData?.mensaje || {};

      console.log('Datos obtenidos secuencialmente:', {
        cabecera,
        cliente,
        productos: productos.length,
        sucursal,
        numeroComprobante
      });

      // Log específico para bonificaciones e intereses
      console.log('Datos de bonificación e interés:', {
        ventaDataBonifica: ventaData.bonifica,
        ventaDataBonificaTipo: ventaData.bonifica_tipo,
        ventaDataInteres: ventaData.interes,
        ventaDataInteresTipo: ventaData.interes_tipo,
        cabeceraBonifica: cabecera.bonifica,
        cabeceraBonificaTipo: cabecera.bonifica_tipo,
        cabeceraInteres: cabecera.interes,
        cabeceraInteresTipo: cabecera.interes_tipo,
        finalBonifica: ventaData.bonifica || cabecera.bonifica || 0,
        finalInteres: ventaData.interes || cabecera.interes || 0
      });

      // Log específico para datos del cliente
      console.log('Datos del cliente recibidos:', {
        clienteRaw: cliente,
        clienteNombre: cliente.nombre,
        clienteDireccion: cliente.direccion,
        clienteDni: cliente.dni,
        clienteCuit: cliente.cuit,
        clienteTipoiva: cliente.tipoiva,
        ventaDataCliente: ventaData.cliente
      });

      // Log específico para datos de sucursal
      console.log('Datos de sucursal recibidos:', {
        sucursalRaw: sucursal,
        sucursalNombre: sucursal.sucursal,
        sucursalCompleta: sucursal,
        ventaDataSucursal: ventaData.sucursal,
        nombreFinal: (sucursal.sucursal || ventaData.sucursal || 'SUCURSAL NO DISPONIBLE').trim()
      });
      
      // DEBUGGING ESPECÍFICO PARA EL PROBLEMA DE SUCURSAL
      console.log('🔍 DEBUGGING SUCURSAL PROBLEM:');
      console.log('- ventaData.sucursal enviado al backend:', ventaData.sucursal);
      console.log('- Tipo de ventaData.sucursal:', typeof ventaData.sucursal);
      console.log('- Respuesta del backend sucursalData:', sucursal);
      console.log('- sucursal.sucursal recibida:', sucursal.sucursal);
      console.log('- Todas las propiedades de sucursal:', Object.keys(sucursal || {}));
      if (sucursal && Object.keys(sucursal).length > 0) {
        Object.entries(sucursal).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
      }

      // Log específico para número de comprobante
      console.log('Datos del número de comprobante:', {
        numeroSecuencial: datosCompletos.numeroSecuencial,
        numeroComprobante: numeroComprobante,
        numeroCompleto: numeroComprobante.numero_completo,
        ventaNumeroFac: ventaData.numero_fac,
        ventaNumeroInt: ventaData.numero_int,
        numeroFinal: datosCompletos.numeroSecuencial || numeroComprobante.numero_completo || ventaData.numero_fac?.toString() || ventaData.numero_int.toString()
      });

      // Verificar si tenemos productos - SOLO mostrar warning, no generar PDF básico
      // ya que ejecutaremos el PDF completo con los datos que tenemos
      if (!productos || productos.length === 0) {
        console.warn('No se encontraron productos desde el backend, usando datos por defecto');
        // En lugar de generar PDF básico, usar array vacío y continuar
        productos = [];
      }

      // ✅ NUEVO: Calcular subtotales por tipo de pago desde los productos
      let subtotalesTipoPago: Array<{tipoPago: string, subtotal: number}> = [];

      if (productos && productos.length > 0) {
        // Agrupar por tipo de pago
        const subtotalesMap = new Map<string, number>();

        productos.forEach((item: any) => {
          const tipoPago = item.nombre_tarjeta || item.tarjeta || item.tipoPago || 'Sin especificar';
          const montoItem = parseFloat((item.cantidad * item.precio).toFixed(2));

          if (subtotalesMap.has(tipoPago)) {
            subtotalesMap.set(tipoPago, subtotalesMap.get(tipoPago)! + montoItem);
          } else {
            subtotalesMap.set(tipoPago, montoItem);
          }
        });

        // Convertir a array y ordenar
        subtotalesTipoPago = Array.from(subtotalesMap.entries())
          .map(([tipoPago, subtotal]) => ({
            tipoPago,
            subtotal: parseFloat(subtotal.toFixed(2))
          }))
          .sort((a, b) => {
            if (a.tipoPago === 'Indefinido') return 1;
            if (b.tipoPago === 'Indefinido') return -1;
            return a.tipoPago.localeCompare(b.tipoPago);
          });

        console.log('📊 Subtotales calculados desde historial:', subtotalesTipoPago);
      }

      // Preparar datos en el formato que espera generarPDFRecibo
      const datosRecibo: DatosRecibo = {
        items: productos.map((item: any) => ({
          cantidad: item.cantidad,
          nomart: item.nomart,
          precio: item.precio
        })),
        numerocomprobante: datosCompletos.numeroSecuencial || numeroComprobante.numero_completo || ventaData.numero_fac?.toString() || ventaData.numero_int.toString(),
        fecha: ventaData.emitido,
        total: parseFloat(
          productos.reduce((sum: number, item: any) =>
            sum + (item.cantidad * item.precio), 0
          ).toFixed(2)
        ),
        bonifica: ventaData.bonifica || cabecera.bonifica || 0,
        bonifica_tipo: ventaData.bonifica_tipo || cabecera.bonifica_tipo || 'P',
        interes: ventaData.interes || cabecera.interes || 0,
        interes_tipo: ventaData.interes_tipo || cabecera.interes_tipo || 'P',
        cliente: {
          nombre: (cliente.nombre && cliente.nombre.trim()) || 'Cliente',
          direccion: (cliente.direccion && cliente.direccion.trim()) || 'Sin dirección',
          dni: (cliente.dni && cliente.dni !== '0') ? cliente.dni : 'Sin DNI',
          cuit: (cliente.cuit && cliente.cuit !== '0') ? cliente.cuit : 'Sin CUIT',
          tipoiva: (cliente.tipoiva && cliente.tipoiva.trim()) || 'Consumidor Final'
        },
        tipoDoc: ventaData.tipo,
        puntoventa: ventaData.puntoventa,
        letraValue: ventaData.letra || 'B',
        sucursalNombre: nombreSucursalReal, // Usar el nombre obtenido desde Firebase
        subtotalesTipoPago: subtotalesTipoPago // ✅ NUEVO
      };

      // Generar el PDF usando el mismo método que el carrito
      await this.generarPDFRecibo(datosRecibo);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      // SOLO mostrar error, no generar PDF básico para evitar conflictos de streams
      console.error('No se pudo generar el PDF completo. Detalles:', error.message || error);
      throw error; // Re-lanzar el error para que el componente lo maneje
    }
  }

  // ========== MÉTODO DE GENERACIÓN PDF (COPIA EXACTA DEL CARRITO) ==========

  async generarPDFRecibo(datos: DatosRecibo): Promise<void> {
    const titulo = this.obtenerTituloDocumento(datos.tipoDoc);
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toISOString().split('T')[0];

    // ✅ NUEVO: Validar si hay subtotales por tipo de pago
    const mostrarDesgloseTipoPago = datos.subtotalesTipoPago && datos.subtotalesTipoPago.length > 0;
    console.log('📊 Historial PDF - Desglose por tipo de pago:', mostrarDesgloseTipoPago);

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
                { text: (datos.sucursalNombre || 'Sucursal no especificada') + '\n' },
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
                { text: 'Sres: ' + (datos.cliente?.nombre || 'Cliente no especificado') + '\n' },
                { text: 'Direccion: ' + (datos.cliente?.direccion || 'No especificada') + '\n' },
                { text: 'DNI: ' + (datos.cliente?.dni || 'No especificado') + '\n' },
                { text: 'CUIT: ' + (datos.cliente?.cuit || 'No especificado') + '\n' },
                { text: 'Condicion de Venta: ' + (datos.cliente?.tipoiva || 'No especificada') + '\n' },
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
        // ✅ NUEVO: Desglose por tipo de pago
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
        // Información Financiera Adicional - SOLO PARA RECIBOS (RC)
        ...(datos.tipoDoc === 'RC' && datos.bonifica && datos.bonifica > 0 ? [{
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
        ...(datos.tipoDoc === 'RC' && datos.interes && datos.interes > 0 ? [{
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
    const nombreArchivo = `${datos.sucursalNombre || 'Sucursal'}_${titulo}_${fechaFormateada}.pdf`;
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

  // ========== MÉTODO MEJORADO PARA OBTENER DATOS SECUENCIALMENTE ==========
  
  private obtenerDatosSecuencial(ventaData: HistorialVenta2): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('Iniciando obtención de datos con forkJoin...');
      
      const fuentes$ = {
        cabeceraData: this.getCabeceraCompletaPDF(ventaData.sucursal, ventaData.tipo, ventaData.puntoventa, ventaData.numero_int)
          .pipe(
            timeout(10000), // 10 segundos timeout por llamada
            catchError(error => {
              console.warn('Error en cabecera, usando fallback:', error);
              return of({ error: true, data: {} });
            })
          ),
        clienteData: this.getClienteCompletoPDF(ventaData.sucursal, ventaData.cliente)
          .pipe(
            timeout(10000),
            catchError(error => {
              console.warn('Error en cliente, usando fallback:', error);
              return of({ error: true, data: {} });
            })
          ),
        productosData: this.getProductosVentaPDF(ventaData.sucursal, ventaData.tipo, ventaData.puntoventa, ventaData.numero_int)
          .pipe(
            timeout(10000),
            catchError(error => {
              console.warn('Error en productos, usando fallback:', error);
              return of({ error: true, data: [] });
            })
          ),
        sucursalData: this.getSucursalInfoPDF(ventaData.sucursal)
          .pipe(
            timeout(10000),
            catchError(error => {
              console.warn('Error en sucursal, usando fallback:', error);
              return of({ error: true, data: {} });
            })
          ),
        numeroData: this.getNumeroComprobantePDF(ventaData.sucursal, ventaData.tipo, ventaData.puntoventa, ventaData.numero_int, ventaData.numero_fac)
          .pipe(
            timeout(10000),
            catchError(error => {
              console.warn('Error en número, usando fallback:', error);
              return of({ error: true, data: {} });
            })
          )
      };

      const subscription = forkJoin(fuentes$).subscribe({
        next: async (resultados) => {
          console.log('Datos obtenidos exitosamente con forkJoin');
          
          // Agregar número secuencial (await para resolver la Promise)
          const numeroSecuencial = await this.obtenerNumeroSecuencial(ventaData.tipo);
          
          const datosCompletos = {
            ...resultados,
            numeroSecuencial
          };
          
          subscription.unsubscribe();
          resolve(datosCompletos);
        },
        error: (error) => {
          console.error('Error en forkJoin:', error);
          subscription.unsubscribe();
          reject(error);
        }
      });

      // Cleanup automático si la operación se cuelga (timeout de seguridad)
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('Timeout general de la operación de datos'));
      }, 35000); // 35 segundos total
    });
  }
}