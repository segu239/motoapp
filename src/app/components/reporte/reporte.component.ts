import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Cajamovi } from '../cajamovi/cajamovi.component';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Chart from 'chart.js/auto';

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
  
  public chartTipo: any;
  public chartCaja: any;
  public chartConcepto: any;
  public chartTendencia: any;
  
  public fechaReporte: Date = new Date();

  constructor(private router: Router) {
    // Chart.js auto registra todos los componentes necesarios
  }

  ngOnInit(): void {
    this.loadReportData();
  }

  loadReportData(): void {
    const reportData = sessionStorage.getItem('reporteData');
    if (!reportData) {
      this.router.navigate(['components/cajamovi']);
      return;
    }

    this.movimientos = JSON.parse(reportData);
    this.calculateSummary();
    
    // Limpiar los datos de sessionStorage
    sessionStorage.removeItem('reporteData');
    
    // Crear gráficos después de un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      this.createCharts();
    }, 100);
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
      
      // Agrupar por caja
      const caja = mov.descripcion_caja || 'Sin caja';
      if (!this.summary.movimientosPorCaja[caja]) {
        this.summary.movimientosPorCaja[caja] = { cantidad: 0, importe: 0 };
      }
      this.summary.movimientosPorCaja[caja].cantidad++;
      this.summary.movimientosPorCaja[caja].importe += importe;
      
      // Agrupar por concepto
      const concepto = mov.descripcion_concepto || 'Sin concepto';
      if (!this.summary.movimientosPorConcepto[concepto]) {
        this.summary.movimientosPorConcepto[concepto] = { cantidad: 0, importe: 0 };
      }
      this.summary.movimientosPorConcepto[concepto].cantidad++;
      this.summary.movimientosPorConcepto[concepto].importe += importe;
      
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

  createCharts(): void {
    this.createTipoChart();
    this.createCajaChart();
    this.createConceptoChart();
    this.createTendenciaChart();
  }

  createTipoChart(): void {
    const canvas = document.getElementById('chartTipo') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.chartTipo = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(this.summary.movimientosPorTipo),
        datasets: [{
          data: Object.values(this.summary.movimientosPorTipo),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Tipo de Movimiento'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  createCajaChart(): void {
    const canvas = document.getElementById('chartCaja') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = Object.keys(this.summary.movimientosPorCaja);
    const importes = labels.map(caja => this.summary.movimientosPorCaja[caja].importe);

    this.chartCaja = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Importe Total',
          data: importes,
          backgroundColor: '#36A2EB',
          borderColor: '#2e90d1',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Movimientos por Caja'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString('es-AR');
              }
            }
          }
        }
      }
    });
  }

  createConceptoChart(): void {
    const canvas = document.getElementById('chartConcepto') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tomar solo los top 10 conceptos por importe
    const conceptos = Object.entries(this.summary.movimientosPorConcepto)
      .sort((a, b) => b[1].importe - a[1].importe)
      .slice(0, 10);

    this.chartConcepto = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: conceptos.map(c => c[0]),
        datasets: [{
          data: conceptos.map(c => c[1].importe),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C45850',
            '#96CEB4',
            '#DDA0DD'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Conceptos por Importe'
          },
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  createTendenciaChart(): void {
    const canvas = document.getElementById('chartTendencia') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ordenar fechas
    const fechasOrdenadas = Object.keys(this.summary.movimientosPorFecha).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });

    this.chartTendencia = new Chart(ctx, {
      type: 'line',
      data: {
        labels: fechasOrdenadas,
        datasets: [{
          label: 'Importe por Fecha',
          data: fechasOrdenadas.map(fecha => this.summary.movimientosPorFecha[fecha]),
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Tendencia de Movimientos por Fecha'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString('es-AR');
              }
            }
          }
        }
      }
    });
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
      const ws = xlsx.utils.json_to_sheet(this.movimientos);
      const wb = { Sheets: { 'Movimientos': ws }, SheetNames: ['Movimientos'] };
      const excelBuffer: any = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'reporte_movimientos');
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
