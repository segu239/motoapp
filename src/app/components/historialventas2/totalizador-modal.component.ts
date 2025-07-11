import { Component, OnInit } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { TotalizadorGeneral } from '../../interfaces/totalizador-historial';

@Component({
  selector: 'app-totalizador-modal',
  template: `
    <div class="totalizador-modal">
      <!-- Información del cliente -->
      <div class="alert alert-info mb-3" *ngIf="clienteInfo">
        <div class="row">
          <div class="col-md-6">
            <strong>Cliente:</strong> {{ clienteInfo.nombre }}
          </div>
          <div class="col-md-6">
            <strong>Período:</strong> {{ rangoFechas }}
          </div>
        </div>
      </div>

      <!-- Botón de exportar -->
      <div class="d-flex justify-content-end mb-3">
        <p-button 
          label="Exportar a Excel"
          icon="pi pi-file-excel"
          (click)="exportarTotalizador()"
          styleClass="p-button-success p-button-sm">
        </p-button>
      </div>

      <!-- Resumen General -->
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card bg-light">
            <div class="card-body">
              <h6 class="card-title text-primary">
                <i class="pi pi-chart-line me-2"></i>
                Resumen General
              </h6>
              <div class="row">
                <div class="col-md-3">
                  <div class="d-flex align-items-center mb-2">
                    <i class="pi pi-file me-2 text-info"></i>
                    <div>
                      <strong>Total Registros:</strong><br>
                      <span class="fs-5 fw-bold text-info">{{ totalizador.totalRegistros }}</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="d-flex align-items-center mb-2">
                    <i class="pi pi-dollar me-2 text-success"></i>
                    <div>
                      <strong>Total Importe:</strong><br>
                      <span class="fs-5 fw-bold text-success">{{ formatearMoneda(totalizador.totalImporte) }}</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="d-flex align-items-center mb-2">
                    <i class="pi pi-wallet me-2 text-warning"></i>
                    <div>
                      <strong>Total Saldo:</strong><br>
                      <span class="fs-5 fw-bold text-warning">{{ formatearMoneda(totalizador.totalSaldo) }}</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="d-flex align-items-center mb-2">
                    <i class="pi pi-percentage me-2 text-danger"></i>
                    <div>
                      <strong>% Saldo/Importe:</strong><br>
                      <span class="fs-5 fw-bold text-danger">{{ formatearPorcentaje(totalizador.totalImporte > 0 ? (totalizador.totalSaldo / totalizador.totalImporte) * 100 : 0) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Acordeón mejorado con Bootstrap -->
      <div class="accordion custom-accordion" id="totalizadorModalAccordion">
        <!-- Tipos de Pago -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="tiposPagoModalHeading">
            <button class="accordion-button custom-accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#tiposPagoModalCollapse" aria-expanded="true" aria-controls="tiposPagoModalCollapse">
              <i class="pi pi-credit-card me-2"></i>
              <span class="fw-semibold">Tipos de Pago</span>
              <span class="badge bg-info ms-2">{{ totalizador.tiposPago.length }}</span>
            </button>
          </h2>
          <div id="tiposPagoModalCollapse" class="accordion-collapse collapse show" aria-labelledby="tiposPagoModalHeading" data-bs-parent="#totalizadorModalAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table table-striped table-hover custom-table">
                  <thead class="table-dark">
                    <tr>
                      <th>Tipo de Pago</th>
                      <th>Código</th>
                      <th>Cantidad</th>
                      <th>Total Importe</th>
                      <th>Porcentaje</th>
                      <th>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let tipoPago of totalizador.tiposPago">
                      <td>
                        <span class="badge bg-info">{{ tipoPago.tipoPago }}</span>
                      </td>
                      <td>{{ tipoPago.cod_tar }}</td>
                      <td>{{ tipoPago.cantidad }}</td>
                      <td>{{ formatearMoneda(tipoPago.totalImporte) }}</td>
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="progress me-2 custom-progress">
                            <div class="progress-bar" [style.width.%]="tipoPago.porcentaje">
                            </div>
                          </div>
                          <span class="text-sm">{{ formatearPorcentaje(tipoPago.porcentaje) }}</span>
                        </div>
                      </td>
                      <td>{{ formatearMoneda(tipoPago.cantidad > 0 ? tipoPago.totalImporte / tipoPago.cantidad : 0) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tipos de Documento -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="tiposDocumentoModalHeading">
            <button class="accordion-button collapsed custom-accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#tiposDocumentoModalCollapse" aria-expanded="false" aria-controls="tiposDocumentoModalCollapse">
              <i class="pi pi-file me-2"></i>
              <span class="fw-semibold">Tipos de Documento</span>
              <span class="badge bg-success ms-2">{{ totalizador.tiposDocumento.length }}</span>
            </button>
          </h2>
          <div id="tiposDocumentoModalCollapse" class="accordion-collapse collapse" aria-labelledby="tiposDocumentoModalHeading" data-bs-parent="#totalizadorModalAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table table-striped table-hover custom-table">
                  <thead class="table-dark">
                    <tr>
                      <th>Tipo Documento</th>
                      <th>Cantidad</th>
                      <th>Total Importe</th>
                      <th>Total Saldo</th>
                      <th>Porcentaje</th>
                      <th>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let tipoDoc of totalizador.tiposDocumento">
                      <td>
                        <span class="badge bg-success">{{ tipoDoc.tipo }}</span>
                      </td>
                      <td>{{ tipoDoc.cantidad }}</td>
                      <td>{{ formatearMoneda(tipoDoc.totalImporte) }}</td>
                      <td>{{ formatearMoneda(tipoDoc.totalSaldo) }}</td>
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="progress me-2 custom-progress">
                            <div class="progress-bar bg-success" [style.width.%]="tipoDoc.porcentaje">
                            </div>
                          </div>
                          <span class="text-sm">{{ formatearPorcentaje(tipoDoc.porcentaje) }}</span>
                        </div>
                      </td>
                      <td>{{ formatearMoneda(tipoDoc.cantidad > 0 ? tipoDoc.totalImporte / tipoDoc.cantidad : 0) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sucursales -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="sucursalesModalHeading">
            <button class="accordion-button collapsed custom-accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#sucursalesModalCollapse" aria-expanded="false" aria-controls="sucursalesModalCollapse">
              <i class="pi pi-building me-2"></i>
              <span class="fw-semibold">Sucursales</span>
              <span class="badge bg-warning ms-2">{{ totalizador.sucursales.length }}</span>
            </button>
          </h2>
          <div id="sucursalesModalCollapse" class="accordion-collapse collapse" aria-labelledby="sucursalesModalHeading" data-bs-parent="#totalizadorModalAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table table-striped table-hover custom-table">
                  <thead class="table-dark">
                    <tr>
                      <th>Sucursal</th>
                      <th>Cantidad</th>
                      <th>Total Importe</th>
                      <th>Total Saldo</th>
                      <th>Porcentaje</th>
                      <th>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let sucursal of totalizador.sucursales">
                      <td>
                        <span class="badge bg-warning text-dark">{{ sucursal.sucursal }}</span>
                      </td>
                      <td>{{ sucursal.cantidad }}</td>
                      <td>{{ formatearMoneda(sucursal.totalImporte) }}</td>
                      <td>{{ formatearMoneda(sucursal.totalSaldo) }}</td>
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="progress me-2 custom-progress">
                            <div class="progress-bar bg-warning" [style.width.%]="sucursal.porcentaje">
                            </div>
                          </div>
                          <span class="text-sm">{{ formatearPorcentaje(sucursal.porcentaje) }}</span>
                        </div>
                      </td>
                      <td>{{ formatearMoneda(sucursal.cantidad > 0 ? sucursal.totalImporte / sucursal.cantidad : 0) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Estadísticas -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="estadisticasModalHeading">
            <button class="accordion-button collapsed custom-accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#estadisticasModalCollapse" aria-expanded="false" aria-controls="estadisticasModalCollapse">
              <i class="pi pi-chart-bar me-2"></i>
              <span class="fw-semibold">Estadísticas Detalladas</span>
            </button>
          </h2>
          <div id="estadisticasModalCollapse" class="accordion-collapse collapse" aria-labelledby="estadisticasModalHeading" data-bs-parent="#totalizadorModalAccordion">
            <div class="accordion-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title">Promedios</h6>
                      <div class="row">
                        <div class="col-12 mb-3">
                          <div class="d-flex align-items-center">
                            <i class="pi pi-chart-line me-2 text-primary"></i>
                            <div>
                              <small class="text-muted">Promedio Importe</small><br>
                              <strong>{{ formatearMoneda(totalizador.estadisticas.promedioImporte) }}</strong>
                            </div>
                          </div>
                        </div>
                        <div class="col-12 mb-3">
                          <div class="d-flex align-items-center">
                            <i class="pi pi-wallet me-2 text-warning"></i>
                            <div>
                              <small class="text-muted">Promedio Saldo</small><br>
                              <strong>{{ formatearMoneda(totalizador.estadisticas.promedioSaldo) }}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title">Extremos</h6>
                      <div class="row">
                        <div class="col-12 mb-3">
                          <div class="d-flex align-items-center">
                            <i class="pi pi-arrow-up me-2 text-success"></i>
                            <div>
                              <small class="text-muted">Venta Más Alta</small><br>
                              <strong>{{ formatearMoneda(totalizador.estadisticas.ventaMasAlta) }}</strong>
                            </div>
                          </div>
                        </div>
                        <div class="col-12 mb-3">
                          <div class="d-flex align-items-center">
                            <i class="pi pi-arrow-down me-2 text-danger"></i>
                            <div>
                              <small class="text-muted">Venta Más Baja</small><br>
                              <strong>{{ formatearMoneda(totalizador.estadisticas.ventaMasBaja) }}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row mt-3">
                <div class="col-md-12">
                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title">Información Temporal</h6>
                      <div class="row">
                        <div class="col-md-6">
                          <div class="d-flex align-items-center mb-3">
                            <i class="pi pi-calendar me-2 text-info"></i>
                            <div>
                              <small class="text-muted">Primera Venta</small><br>
                              <strong>{{ totalizador.estadisticas.fechaPrimeraVenta | date:'dd/MM/yyyy' }}</strong>
                            </div>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="d-flex align-items-center mb-3">
                            <i class="pi pi-calendar me-2 text-info"></i>
                            <div>
                              <small class="text-muted">Última Venta</small><br>
                              <strong>{{ totalizador.estadisticas.fechaUltimaVenta | date:'dd/MM/yyyy' }}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .totalizador-modal {
      max-height: 75vh;
      overflow-y: auto;
    }
    
    .table-responsive {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .card {
      margin-bottom: 1rem;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .fw-semibold {
      font-weight: 600;
    }
    
    .text-sm {
      font-size: 0.875rem;
    }
    
    /* Estilo mejorado para el acordeón */
    .custom-accordion .accordion-item {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .custom-accordion-button {
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
      border-radius: 8px 8px 0 0;
      background-color: #f8f9fa;
      border: none;
      font-weight: 600;
    }
    
    .custom-accordion-button:not(.collapsed) {
      background-color: #e9ecef;
      border-bottom: 2px solid #007bff;
    }
    
    .custom-accordion-button:focus {
      box-shadow: 0 0 0 0.25rem rgba(0,123,255,0.25);
    }
    
    /* Mejorar las tablas */
    .custom-table {
      font-size: 0.875rem;
      margin-bottom: 0;
    }
    
    .custom-table th {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      background-color: #212529;
      border-bottom: 2px solid #dee2e6;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .custom-table td {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      vertical-align: middle;
    }
    
    /* Mejorar las barras de progreso */
    .custom-progress {
      height: 20px;
      width: 100px;
      border-radius: 10px;
      background-color: #e9ecef;
      overflow: hidden;
    }
    
    .custom-progress .progress-bar {
      border-radius: 10px;
      background: linear-gradient(45deg, #007bff, #0056b3);
      transition: width 0.3s ease;
    }
    
    .custom-progress .progress-bar.bg-success {
      background: linear-gradient(45deg, #28a745, #1e7e34);
    }
    
    .custom-progress .progress-bar.bg-warning {
      background: linear-gradient(45deg, #ffc107, #e0a800);
    }
    
    /* Mejorar los badges */
    .badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }
    
    /* Espaciado mejorado */
    .d-flex.align-items-center {
      gap: 0.5rem;
    }
    
    /* Botón de exportar mejorado */
    .p-button-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 6px;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .totalizador-modal {
        max-height: 80vh;
      }
      
      .table-responsive {
        max-height: 300px;
      }
      
      .custom-accordion-button {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
      }
      
      .custom-table {
        font-size: 0.8rem;
      }
      
      .custom-progress {
        width: 80px;
      }
    }
  `]
})
export class TotalizadorModalComponent implements OnInit {
  totalizador: TotalizadorGeneral;
  rangoFechas: string;
  clienteInfo: any;
  private exportarTotalizadorCallback: () => void;

  constructor(
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig
  ) {}

  ngOnInit(): void {
    this.totalizador = this.config.data.totalizador;
    this.rangoFechas = this.config.data.rangoFechas;
    this.clienteInfo = this.config.data.clienteInfo;
    this.exportarTotalizadorCallback = this.config.data.exportarTotalizador;
    
    // Debug para verificar datos
    console.log('Totalizador en modal:', this.totalizador);
    console.log('Tipos de documento:', this.totalizador.tiposDocumento);
    console.log('Sucursales:', this.totalizador.sucursales);
    console.log('Tipos de pago:', this.totalizador.tiposPago);
  }

  // Formatear moneda
  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(valor);
  }

  // Formatear porcentaje
  formatearPorcentaje(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }

  // Exportar totalizador
  exportarTotalizador(): void {
    if (this.exportarTotalizadorCallback) {
      this.exportarTotalizadorCallback();
    }
  }

  // Cerrar modal
  cerrar(): void {
    this.ref.close();
  }
}