import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Cajamovi } from '../../interfaces/cajamovi';
import { ReporteDataService } from '../../services/reporte-data.service';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReporteSummary {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  cantidadMovimientos: number;
  movimientosPorTipo: { [key: string]: number };
  movimientosPorCaja: { [key: string]: { cantidad: number; importe: number } };
  movimientosPorConcepto: { [key: string]: { cantidad: number; importe: number } };
  movimientosPorFecha: { [key: string]: number };
}

@Component({
  selector: 'app-reporte',
  templateUrl: './reporte.component.html',
  styleUrls: ['./reporte.component.css']
})
export class ReporteComponent implements OnInit {
  @ViewChild('reportContent') reportContent!: ElementRef;
  
  public movimientos: Cajamovi[] = [];
  public summary: ReporteSummary = {
    totalIngresos: 0,
    totalEgresos: 0,
    balance: 0,
    cantidadMovimientos: 0,
    movimientosPorTipo: {},
    movimientosPorCaja: {},
    movimientosPorConcepto: {},
    movimientosPorFecha: {}
  };
  
  public fechaReporte: Date = new Date();
  public mostrarGraficos: boolean = false;
  public cargandoGraficos: boolean = false;
  public usarGraficosSimples: boolean = true; // Usar visualización simple por defecto
  public graficosCargados: {
    tipo: boolean;
    caja: boolean;
    concepto: boolean;
    tendencia: boolean;
  } = {
    tipo: false,
    caja: false,
    concepto: false,
    tendencia: false
  };
  
  // Datos para los gráficos de PrimeNG
  public dataTipo: any = null;
  public dataCaja: any = null;
  public dataConcepto: any = null;
  public dataTendencia: any = null;
  public dataPrueba: any = null;
  
  // Opciones para los gráficos
  public optionsTipo: any = {};
  public optionsCaja: any = {};
  public optionsConcepto: any = {};
  public optionsTendencia: any = {};

  constructor(
    private router: Router,
    private reporteDataService: ReporteDataService
  ) {
    // Chart.js auto registra todos los componentes necesarios
  }

  ngOnInit(): void {
    console.log('ReporteComponent - ngOnInit');
    this.loadReportData();
  }

  loadReportData(): void {
    console.log('ReporteComponent - loadReportData');
    
    // Primero intentar obtener los datos del servicio
    const dataFromService = this.reporteDataService.getReporteData();
    console.log('Datos del servicio:', dataFromService);
    
    if (dataFromService && dataFromService.length > 0) {
      this.movimientos = dataFromService;
      console.log('Usando datos del servicio');
    } else {
      // Si no hay datos en el servicio, intentar con sessionStorage
      const reportData = sessionStorage.getItem('reporteData');
      console.log('Datos en sessionStorage:', reportData);
      
      if (!reportData) {
        console.log('No hay datos disponibles, redirigiendo a cajamovi');
        this.router.navigate(['components/cajamovi']);
        return;
      }
      
      try {
        this.movimientos = JSON.parse(reportData);
        console.log('Movimientos parseados desde sessionStorage:', this.movimientos);
      } catch (error) {
        console.error('Error al parsear los datos del reporte:', error);
        this.router.navigate(['components/cajamovi']);
        return;
      }
    }
    
    this.calculateSummary();
    
    // Limpiar los datos
    this.reporteDataService.clearReporteData();
    sessionStorage.removeItem('reporteData');
    
    // Los gráficos se crearán solo si el usuario los solicita
    
    // Configurar las opciones de los gráficos
    this.configurarOpcionesGraficos();
  }

  calculateSummary(): void {
    this.summary.cantidadMovimientos = this.movimientos.length;
    
    // Log para debugging
    console.log('Movimientos recibidos:', this.movimientos);
    
    this.movimientos.forEach(mov => {
      const importe = Number(mov.importe_mov) || 0;
      
      // Log para ver el tipo de movimiento
      console.log('Tipo movimiento:', mov.tipo_movi, 'Importe:', importe);
      
      // Calcular totales según tipo de movimiento
      // Verificar diferentes posibles valores para tipo_movi
      const tipoUpper = mov.tipo_movi ? mov.tipo_movi.toUpperCase() : '';
      
      if (tipoUpper === 'I' || tipoUpper === 'INGRESO' || 
          tipoUpper === 'IN' || tipoUpper === 'C' || tipoUpper === 'CREDITO') {
        this.summary.totalIngresos += Math.abs(importe);
      } else if (tipoUpper === 'E' || tipoUpper === 'EGRESO' || 
                 tipoUpper === 'OUT' || tipoUpper === 'D' || tipoUpper === 'DEBITO' ||
                 tipoUpper === 'S' || tipoUpper === 'SALIDA') {
        this.summary.totalEgresos += Math.abs(importe);
      } else if (importe > 0) {
        // Si no hay tipo definido pero el importe es positivo, considerarlo ingreso
        this.summary.totalIngresos += importe;
      } else if (importe < 0) {
        // Si el importe es negativo, considerarlo egreso
        this.summary.totalEgresos += Math.abs(importe);
      }
      
      // Contar movimientos por tipo
      const tipo = mov.tipo_movi || 'Sin tipo';
      this.summary.movimientosPorTipo[tipo] = (this.summary.movimientosPorTipo[tipo] || 0) + 1;
      
      // Determinar si es ingreso o egreso para los totalizadores
      let importeParaTotalizador = importe;
      if (tipoUpper === 'E' || tipoUpper === 'EGRESO' || 
          tipoUpper === 'OUT' || tipoUpper === 'D' || tipoUpper === 'DEBITO' ||
          tipoUpper === 'S' || tipoUpper === 'SALIDA') {
        importeParaTotalizador = -Math.abs(importe);
      } else if (tipoUpper === 'I' || tipoUpper === 'INGRESO' || 
                 tipoUpper === 'IN' || tipoUpper === 'C' || tipoUpper === 'CREDITO') {
        importeParaTotalizador = Math.abs(importe);
      }
      
      // Agrupar por caja
      const caja = mov.descripcion_caja || 'Sin caja';
      if (!this.summary.movimientosPorCaja[caja]) {
        this.summary.movimientosPorCaja[caja] = { cantidad: 0, importe: 0 };
      }
      this.summary.movimientosPorCaja[caja].cantidad++;
      this.summary.movimientosPorCaja[caja].importe += importeParaTotalizador;
      
      // Agrupar por concepto
      const concepto = mov.descripcion_concepto || 'Sin concepto';
      if (!this.summary.movimientosPorConcepto[concepto]) {
        this.summary.movimientosPorConcepto[concepto] = { cantidad: 0, importe: 0 };
      }
      this.summary.movimientosPorConcepto[concepto].cantidad++;
      this.summary.movimientosPorConcepto[concepto].importe += importeParaTotalizador;
      
      // Agrupar por fecha
      const fecha = this.formatDate(mov.fecha_mov);
      this.summary.movimientosPorFecha[fecha] = (this.summary.movimientosPorFecha[fecha] || 0) + importe;
    });
    
    this.summary.balance = this.summary.totalIngresos - this.summary.totalEgresos;
    
    // Log del resumen final
    console.log('Resumen calculado:', {
      totalIngresos: this.summary.totalIngresos,
      totalEgresos: this.summary.totalEgresos,
      balance: this.summary.balance
    });
  }

  formatDate(date: any): string {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES');
  }

  configurarOpcionesGraficos(): void {
    console.log('[DEBUG] Configurando opciones de gráficos...');
    
    try {
      this.optionsTipo = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Distribución por Tipo de Movimiento'
          }
        }
      };
    
      this.optionsCaja = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Movimientos por Caja (Top 10)'
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true
          }
        }
      };
    
      this.optionsConcepto = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          title: {
            display: true,
            text: 'Top 10 Conceptos por Importe'
          }
        }
      };
    
      this.optionsTendencia = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          },
          title: {
            display: true,
            text: 'Tendencia de Movimientos por Fecha'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      };
      
      console.log('[DEBUG] Opciones configuradas exitosamente');
    } catch (error) {
      console.error('[DEBUG] Error al configurar opciones:', error);
    }
  }
  
  createCharts(): void {
    console.log('[DEBUG] Iniciando creación de gráficos con PrimeNG');
    this.cargandoGraficos = true;
    
    // Crear gráficos uno por uno con delays para evitar congelamiento
    this.crearGraficoSecuencial();
  }
  
  crearGraficoSecuencial(): void {
    console.log('[DEBUG] Creando gráficos secuencialmente...');
    
    // Gráfico 1: Tipo
    setTimeout(() => {
      console.log('[DEBUG] Creando gráfico de tipo...');
      try {
        this.createTipoChart();
        this.graficosCargados.tipo = true;
        console.log('[DEBUG] Gráfico de tipo creado');
        
        // Gráfico 2: Caja
        setTimeout(() => {
          console.log('[DEBUG] Creando gráfico de caja...');
          try {
            this.createCajaChart();
            this.graficosCargados.caja = true;
            console.log('[DEBUG] Gráfico de caja creado');
            
            // Gráfico 3: Concepto
            setTimeout(() => {
              console.log('[DEBUG] Creando gráfico de concepto...');
              try {
                this.createConceptoChart();
                this.graficosCargados.concepto = true;
                console.log('[DEBUG] Gráfico de concepto creado');
                
                // Gráfico 4: Tendencia
                setTimeout(() => {
                  console.log('[DEBUG] Creando gráfico de tendencia...');
                  try {
                    this.createTendenciaChart();
                    this.graficosCargados.tendencia = true;
                    console.log('[DEBUG] Gráfico de tendencia creado');
                    this.cargandoGraficos = false;
                    console.log('[DEBUG] Todos los gráficos creados exitosamente');
                  } catch (error) {
                    console.error('[DEBUG] Error en gráfico de tendencia:', error);
                    this.handleChartError(error);
                  }
                }, 100);
              } catch (error) {
                console.error('[DEBUG] Error en gráfico de concepto:', error);
                this.handleChartError(error);
              }
            }, 100);
          } catch (error) {
            console.error('[DEBUG] Error en gráfico de caja:', error);
            this.handleChartError(error);
          }
        }, 100);
      } catch (error) {
        console.error('[DEBUG] Error en gráfico de tipo:', error);
        this.handleChartError(error);
      }
    }, 100);
  }
  
  handleChartError(error: any): void {
    console.error('[DEBUG] Error al crear gráfico:', error);
    this.cargandoGraficos = false;
    this.mostrarGraficos = false;
    alert('Error al crear los gráficos. Revise la consola para más detalles.');
  }

  createTipoChart(): void {
    try {
      console.log('[DEBUG] Iniciando createTipoChart...');
      console.log('[DEBUG] summary.movimientosPorTipo:', this.summary.movimientosPorTipo);
      
      const labels = Object.keys(this.summary.movimientosPorTipo);
      const data = Object.values(this.summary.movimientosPorTipo);
      
      console.log('[DEBUG] Datos para gráfico de tipo:', { labels, data });
      
      if (labels.length === 0) {
        console.warn('[DEBUG] No hay datos para el gráfico de tipo');
        this.dataTipo = null;
        return;
      }
      
      this.dataTipo = {
        labels: [...labels], // Clonar array
        datasets: [
          {
            data: [...data], // Clonar array
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ].slice(0, labels.length), // Solo usar los colores necesarios
            hoverBackgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ].slice(0, labels.length)
          }
        ]
      };
      
      console.log('[DEBUG] dataTipo creado:', this.dataTipo);
    } catch (error) {
      console.error('[DEBUG] Error en createTipoChart:', error);
      throw error;
    }
  }

  createCajaChart(): void {
    try {
      console.log('[DEBUG] Iniciando createCajaChart...');
      console.log('[DEBUG] summary.movimientosPorCaja:', this.summary.movimientosPorCaja);
      
      const cajas = Object.entries(this.summary.movimientosPorCaja)
        .sort((a, b) => Math.abs(b[1].importe) - Math.abs(a[1].importe))
        .slice(0, 10);
      
      const labels = cajas.map(c => c[0]);
      const importes = cajas.map(c => c[1].importe);
      
      console.log('[DEBUG] Datos para gráfico de caja:', { labels, importes });
      
      if (labels.length === 0) {
        console.warn('[DEBUG] No hay datos para el gráfico de caja');
        this.dataCaja = null;
        return;
      }
      
      this.dataCaja = {
        labels: [...labels],
        datasets: [
          {
            label: 'Importe Total',
            backgroundColor: '#36A2EB',
            borderColor: '#2e90d1',
            data: [...importes]
          }
        ]
      };
      
      console.log('[DEBUG] dataCaja creado:', this.dataCaja);
    } catch (error) {
      console.error('[DEBUG] Error en createCajaChart:', error);
      throw error;
    }
  }

  createConceptoChart(): void {
    try {
      console.log('[DEBUG] Iniciando createConceptoChart...');
      console.log('[DEBUG] summary.movimientosPorConcepto:', this.summary.movimientosPorConcepto);
      
      const conceptos = Object.entries(this.summary.movimientosPorConcepto)
        .sort((a, b) => Math.abs(b[1].importe) - Math.abs(a[1].importe))
        .slice(0, 10);
      
      const labels = conceptos.map(c => c[0]);
      const data = conceptos.map(c => Math.abs(c[1].importe));
      
      console.log('[DEBUG] Datos para gráfico de concepto:', { labels, data });
      
      if (labels.length === 0) {
        console.warn('[DEBUG] No hay datos para el gráfico de concepto');
        this.dataConcepto = null;
        return;
      }
      
      const colors = [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40',
        '#C45850',
        '#96CEB4',
        '#DDA0DD',
        '#F0E68C'
      ];
      
      this.dataConcepto = {
        labels: [...labels],
        datasets: [
          {
            data: [...data],
            backgroundColor: colors.slice(0, labels.length),
            hoverBackgroundColor: colors.slice(0, labels.length)
          }
        ]
      };
      
      console.log('[DEBUG] dataConcepto creado:', this.dataConcepto);
    } catch (error) {
      console.error('[DEBUG] Error en createConceptoChart:', error);
      throw error;
    }
  }

  createTendenciaChart(): void {
    try {
      console.log('[DEBUG] Iniciando createTendenciaChart...');
      console.log('[DEBUG] summary.movimientosPorFecha:', this.summary.movimientosPorFecha);
      
      let fechasOrdenadas = Object.keys(this.summary.movimientosPorFecha).sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });
      
      // Si hay más de 30 fechas, tomar solo las últimas 30
      if (fechasOrdenadas.length > 30) {
        fechasOrdenadas = fechasOrdenadas.slice(-30);
      }
      
      const data = fechasOrdenadas.map(fecha => this.summary.movimientosPorFecha[fecha]);
      
      console.log('[DEBUG] Datos para gráfico de tendencia:', { fechasOrdenadas, data });
      
      if (fechasOrdenadas.length === 0) {
        console.warn('[DEBUG] No hay datos para el gráfico de tendencia');
        this.dataTendencia = null;
        return;
      }
      
      this.dataTendencia = {
        labels: [...fechasOrdenadas],
        datasets: [
          {
            label: 'Importe por Fecha',
            data: [...data],
            fill: false,
            borderColor: '#4BC0C0',
            tension: 0.1
          }
        ]
      };
      
      console.log('[DEBUG] dataTendencia creado:', this.dataTendencia);
    } catch (error) {
      console.error('[DEBUG] Error en createTendenciaChart:', error);
      throw error;
    }
  }

  exportPDF(): void {
    const element = this.reportContent.nativeElement;
    
    html2canvas(element).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 208;
      const pageHeight = 295;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('reporte_movimientos_' + new Date().getTime() + '.pdf');
    });
  }

  exportExcel(): void {
    import('xlsx').then((xlsx) => {
      // Hoja 1: Resumen General
      const resumenData = [
        { 'Tipo': 'Total Ingresos', 'Importe': this.summary.totalIngresos },
        { 'Tipo': 'Total Egresos', 'Importe': this.summary.totalEgresos },
        { 'Tipo': 'Balance', 'Importe': this.summary.balance },
        { 'Tipo': 'Cantidad de Movimientos', 'Importe': this.summary.cantidadMovimientos }
      ];
      const wsResumen = xlsx.utils.json_to_sheet(resumenData);

      // Hoja 2: Detalle de Movimientos
      const movimientosData = this.movimientos.map(mov => ({
        'Fecha': this.formatDate(mov.fecha_mov),
        'Concepto': mov.descripcion_concepto || '-',
        'Caja': mov.descripcion_caja || '-',
        'Tipo': mov.tipo_movi,
        'Descripción': mov.descripcion_mov,
        'Importe': Number(mov.importe_mov) || 0
      }));
      const wsMovimientos = xlsx.utils.json_to_sheet(movimientosData);

      // Hoja 3: Totales por Caja
      const totalesCaja = this.getTotalesPorCaja();
      const wsCaja = xlsx.utils.json_to_sheet(totalesCaja);

      // Hoja 4: Totales por Concepto
      const totalesConcepto = this.getTotalesPorConcepto();
      const wsConcepto = xlsx.utils.json_to_sheet(totalesConcepto);

      // Crear el libro de trabajo con todas las hojas
      const wb = {
        Sheets: {
          'Resumen': wsResumen,
          'Movimientos': wsMovimientos,
          'Totales por Caja': wsCaja,
          'Totales por Concepto': wsConcepto
        },
        SheetNames: ['Resumen', 'Movimientos', 'Totales por Caja', 'Totales por Concepto']
      };

      const excelBuffer: any = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'reporte_movimientos_completo');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    FileSaver.saveAs(data, fileName + '_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  print(): void {
    window.print();
  }

  volver(): void {
    this.router.navigate(['components/cajamovi']);
  }

  getTotalesPorCaja(): any[] {
    return Object.entries(this.summary.movimientosPorCaja)
      .map(([caja, datos]) => ({
        caja: caja,
        cantidad: datos.cantidad,
        importe: datos.importe
      }))
      .sort((a, b) => b.importe - a.importe);
  }

  getTotalesPorConcepto(): any[] {
    return Object.entries(this.summary.movimientosPorConcepto)
      .map(([concepto, datos]) => ({
        concepto: concepto,
        cantidad: datos.cantidad,
        importe: datos.importe
      }))
      .sort((a, b) => b.importe - a.importe);
  }
  
  toggleGraficos(): void {
    console.log('[DEBUG] toggleGraficos llamado. Estado actual:', this.mostrarGraficos);
    
    this.mostrarGraficos = !this.mostrarGraficos;
    
    // Si usamos gráficos simples, no necesitamos crear los gráficos de PrimeNG
    if (this.mostrarGraficos && !this.usarGraficosSimples) {
      if (!this.mostrarGraficos) {
        // Resetear datos de gráficos antes de mostrar
        this.dataTipo = null;
        this.dataCaja = null;
        this.dataConcepto = null;
        this.dataTendencia = null;
        this.graficosCargados = {
          tipo: false,
          caja: false,
          concepto: false,
          tendencia: false
        };
      }
      
      console.log('[DEBUG] Mostrando gráficos PrimeNG...');
      // Crear gráficos con un pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        try {
          this.createCharts();
        } catch (error) {
          console.error('[DEBUG] Error al crear los gráficos:', error);
          alert('Error al crear los gráficos. Por favor, intente nuevamente.');
          this.mostrarGraficos = false;
        }
      }, 200);
    } else {
      console.log('[DEBUG] Usando visualización simple');
    }
  }
  
  // Métodos para visualización simple
  getDistribucionTipo(): any[] {
    const total = this.summary.cantidadMovimientos;
    return Object.entries(this.summary.movimientosPorTipo)
      .map(([tipo, cantidad]) => ({
        tipo: tipo,
        cantidad: cantidad,
        porcentaje: total > 0 ? ((cantidad / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }
  
  getTop5Cajas(): any[] {
    return this.getTotalesPorCaja().slice(0, 5);
  }
  
  getTop5Conceptos(): any[] {
    return this.getTotalesPorConcepto().slice(0, 5);
  }
  
  getUltimos7Dias(): any[] {
    const fechasOrdenadas = Object.keys(this.summary.movimientosPorFecha)
      .sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime(); // Orden descendente
      })
      .slice(0, 7);
    
    return fechasOrdenadas.map(fecha => ({
      fecha: fecha,
      importe: this.summary.movimientosPorFecha[fecha]
    }));
  }
  
  probarGraficoSimple(): void {
    console.log('[DEBUG] Probando gráfico simple de PrimeNG...');
    
    // Datos de prueba muy simples
    this.dataPrueba = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          data: [300, 50, 100],
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56"
          ],
          hoverBackgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56"
          ]
        }
      ]
    };
    
    console.log('[DEBUG] Datos de prueba creados:', this.dataPrueba);
  }
}
