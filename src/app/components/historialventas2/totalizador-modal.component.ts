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
          styleClass="p-button-success">
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

      <!-- Acordeón para diferentes vistas -->
      <div class="accordion" id="totalizadorModalAccordion">
        <!-- Tipos de Pago -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="tiposPagoModalHeading">
            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#tiposPagoModalCollapse" aria-expanded="true" aria-controls="tiposPagoModalCollapse">
              <i class="pi pi-credit-card me-2"></i>
              Tipos de Pago ({{ totalizador.tiposPago.length }})
            </button>
          </h2>
          <div id="tiposPagoModalCollapse" class="accordion-collapse collapse show" aria-labelledby="tiposPagoModalHeading" data-bs-parent="#totalizadorModalAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table table-striped table-hover">
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
                        <div class="progress" style="height: 20px;">
                          <div class="progress-bar" [style.width.%]="tipoPago.porcentaje">
                            {{ formatearPorcentaje(tipoPago.porcentaje) }}
                          </div>
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
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#tiposDocumentoModalCollapse" aria-expanded="false" aria-controls="tiposDocumentoModalCollapse">
              <i class="pi pi-file me-2"></i>
              Tipos de Documento ({{ totalizador.tiposDocumento.length }})
            </button>
          </h2>
          <div id="tiposDocumentoModalCollapse" class="accordion-collapse collapse" aria-labelledby="tiposDocumentoModalHeading" data-bs-parent="#totalizadorModalAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table table-striped table-hover">
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
                        <span class="badge bg-primary">{{ tipoDoc.tipo }}</span>
                      </td>
                      <td>{{ tipoDoc.cantidad }}</td>
                      <td>{{ formatearMoneda(tipoDoc.totalImporte) }}</td>
                      <td>{{ formatearMoneda(tipoDoc.totalSaldo) }}</td>
                      <td>
                        <div class="progress" style="height: 20px;">
                          <div class="progress-bar bg-success" [style.width.%]="tipoDoc.porcentaje">
                            {{ formatearPorcentaje(tipoDoc.porcentaje) }}
                          </div>
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
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sucursalesModalCollapse" aria-expanded="false" aria-controls="sucursalesModalCollapse">
              <i class="pi pi-building me-2"></i>
              Sucursales ({{ totalizador.sucursales.length }})
            </button>
          </h2>
          <div id="sucursalesModalCollapse" class="accordion-collapse collapse" aria-labelledby="sucursalesModalHeading" data-bs-parent="#totalizadorModalAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table table-striped table-hover">
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
                        <span class="badge bg-warning">{{ sucursal.sucursal }}</span>
                      </td>
                      <td>{{ sucursal.cantidad }}</td>
                      <td>{{ formatearMoneda(sucursal.totalImporte) }}</td>
                      <td>{{ formatearMoneda(sucursal.totalSaldo) }}</td>
                      <td>
                        <div class="progress" style="height: 20px;">
                          <div class="progress-bar bg-warning" [style.width.%]="sucursal.porcentaje">
                            {{ formatearPorcentaje(sucursal.porcentaje) }}
                          </div>
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
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#estadisticasModalCollapse" aria-expanded="false" aria-controls="estadisticasModalCollapse">
              <i class="pi pi-chart-bar me-2"></i>
              Estadísticas Detalladas
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
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .table-responsive {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .progress {
      position: relative;
    }
    
    .progress-bar {
      min-width: 30px;
      color: #000;
      text-align: center;
      line-height: 20px;
    }
    
    .card {
      margin-bottom: 1rem;
    }
    
    .accordion-button {
      font-weight: 600;
    }
    
    .badge {
      font-size: 0.85em;
    }
    
    .table th {
      position: sticky;
      top: 0;
      background-color: #212529;
      z-index: 10;
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