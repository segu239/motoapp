import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Cajamovi } from '../../interfaces/cajamovi';
import { ReporteDataService } from '../../services/reporte-data.service';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChartConfiguration, ChartType } from 'chart.js';

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
  public usarGraficosSimples: boolean = true; // Por defecto usar tablas simples
  
  // Datos para los gráficos ng2-charts
  // Gráfico de Pie (Tipo)
  public pieChartLabels: string[] = [];
  public pieChartData: ChartConfiguration<'pie'>['data']['datasets'] = [];
  public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };
  
  // Gráfico de Barras (Caja)
  public barChartLabels: string[] = [];
  public barChartData: ChartConfiguration<'bar'>['data']['datasets'] = [];
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  
  // Gráfico Doughnut (Concepto)
  public doughnutChartLabels: string[] = [];
  public doughnutChartData: ChartConfiguration<'doughnut'>['data']['datasets'] = [];
  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right'
      }
    }
  };
  
  // Gráfico de Líneas (Tendencia)
  public lineChartLabels: string[] = [];
  public lineChartData: ChartConfiguration<'line'>['data']['datasets'] = [];
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  constructor(
    private router: Router,
    private reporteDataService: ReporteDataService
  ) {}

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
  }

  calculateSummary(): void {
    this.summary.cantidadMovimientos = this.movimientos.length;
    
    this.movimientos.forEach(mov => {
      const importe = Number(mov.importe_mov) || 0;
      const tipoUpper = mov.tipo_movi ? mov.tipo_movi.toUpperCase() : '';
      
      if (tipoUpper === 'I' || tipoUpper === 'INGRESO' || 
          tipoUpper === 'IN' || tipoUpper === 'C' || tipoUpper === 'CREDITO') {
        this.summary.totalIngresos += Math.abs(importe);
      } else if (tipoUpper === 'E' || tipoUpper === 'EGRESO' || 
                 tipoUpper === 'OUT' || tipoUpper === 'D' || tipoUpper === 'DEBITO' ||
                 tipoUpper === 'S' || tipoUpper === 'SALIDA') {
        this.summary.totalEgresos += Math.abs(importe);
      } else if (importe > 0) {
        this.summary.totalIngresos += importe;
      } else if (importe < 0) {
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
  }

  formatDate(date: any): string {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES');
  }

  toggleGraficos(): void {
    this.mostrarGraficos = !this.mostrarGraficos;
    
    if (this.mostrarGraficos && !this.usarGraficosSimples) {
      setTimeout(() => {
        this.createCharts();
      }, 100);
    }
  }

  cambiarModoVisualizacion(): void {
    this.usarGraficosSimples = !this.usarGraficosSimples;
    
    if (!this.usarGraficosSimples) {
      setTimeout(() => {
        this.createCharts();
      }, 100);
    }
  }

  createCharts(): void {
    console.log('[DEBUG] Iniciando creación de gráficos con ng2-charts');
    this.cargandoGraficos = true;
    
    try {
      this.createTipoChart();
      this.createCajaChart();
      this.createConceptoChart();
      this.createTendenciaChart();
      this.cargandoGraficos = false;
    } catch (error) {
      console.error('[DEBUG] Error al crear gráficos:', error);
      this.cargandoGraficos = false;
      this.usarGraficosSimples = true;
    }
  }

  createTipoChart(): void {
    const labels = Object.keys(this.summary.movimientosPorTipo);
    const data = Object.values(this.summary.movimientosPorTipo);
    
    if (labels.length === 0) return;
    
    this.pieChartLabels = labels;
    this.pieChartData = [{
      data: data,
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40'
      ]
    }];
  }

  createCajaChart(): void {
    const cajas = Object.entries(this.summary.movimientosPorCaja)
      .sort((a, b) => Math.abs(b[1].importe) - Math.abs(a[1].importe))
      .slice(0, 10);
    
    const labels = cajas.map(c => c[0]);
    const importes = cajas.map(c => c[1].importe);
    
    if (labels.length === 0) return;
    
    this.barChartLabels = labels;
    this.barChartData = [{
      data: importes,
      label: 'Importe Total',
      backgroundColor: '#36A2EB'
    }];
  }

  createConceptoChart(): void {
    const conceptos = Object.entries(this.summary.movimientosPorConcepto)
      .sort((a, b) => Math.abs(b[1].importe) - Math.abs(a[1].importe))
      .slice(0, 10);
    
    const labels = conceptos.map(c => c[0]);
    const data = conceptos.map(c => Math.abs(c[1].importe));
    
    if (labels.length === 0) return;
    
    this.doughnutChartLabels = labels;
    this.doughnutChartData = [{
      data: data,
      backgroundColor: [
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
      ]
    }];
  }

  createTendenciaChart(): void {
    let fechasOrdenadas = Object.keys(this.summary.movimientosPorFecha).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
    
    if (fechasOrdenadas.length > 30) {
      fechasOrdenadas = fechasOrdenadas.slice(-30);
    }
    
    const data = fechasOrdenadas.map(fecha => this.summary.movimientosPorFecha[fecha]);
    
    if (fechasOrdenadas.length === 0) return;
    
    this.lineChartLabels = fechasOrdenadas;
    this.lineChartData = [{
      data: data,
      label: 'Importe por Fecha',
      borderColor: '#4BC0C0',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }];
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
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 7);
    
    return fechasOrdenadas.map(fecha => ({
      fecha: fecha,
      importe: this.summary.movimientosPorFecha[fecha]
    }));
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

  exportPDF(): void {
    const element = this.reportContent.nativeElement;
    
    html2canvas(element).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Configuración de márgenes (en mm)
      const marginTop = 20;
      const marginBottom = 20;
      const marginLeft = 15;
      const marginRight = 15;
      
      // Dimensiones de la página A4 y área útil considerando márgenes
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgWidth = pageWidth - marginLeft - marginRight; // Ancho útil considerando márgenes
      const usableHeight = pageHeight - marginTop - marginBottom; // Alto útil considerando márgenes
      
      // Calcular la altura de la imagen manteniendo las proporciones
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = marginTop;

      // Primera página
      pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;

      // Páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = marginTop + (heightLeft - imgHeight);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
        heightLeft -= usableHeight;
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
}