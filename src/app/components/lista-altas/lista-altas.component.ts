import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Interfaz para alta de existencias (V2.0 - Con costos)
interface AltaExistencia {
  id_num: number;
  id_items: number;
  id_art: number;
  descripcion: string;
  cantidad: number;
  fecha: string;
  fecha_resuelto: string;
  usuario_res: string;
  observacion: string;
  estado: string;
  sucursald: number;
  sucursalh: number;
  usuario: string;
  tipo: string;
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  usuario_cancelacion?: string;
  // Campos de costos (V2.0)
  costo_total_1?: number;
  costo_total_2?: number;
  vcambio?: number;
  tipo_calculo?: string; // 'dinamico' o 'fijo'
  // Control de selección
  seleccionado?: boolean;
}

// Interfaz para sucursales
interface Sucursal {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-lista-altas',
  templateUrl: './lista-altas.component.html',
  styleUrls: ['./lista-altas.component.css']
})
export class ListaAltasComponent implements OnInit, OnDestroy {
  // Datos
  public altas: AltaExistencia[] = [];
  public altasFiltradas: AltaExistencia[] = [];
  public cargando: boolean = false;
  public cancelando: boolean = false;

  // Filtros
  public sucursalFiltro: number | null = null;
  public estadoFiltro: string = 'ALTA'; // Por defecto mostrar solo ALTA
  public sucursales: Sucursal[] = [
    { id: 0, nombre: 'Todas' },
    { id: 1, nombre: 'Casa Central' },
    { id: 2, nombre: 'Valle Viejo' },
    { id: 3, nombre: 'Güemes' },
    { id: 4, nombre: 'Depósito' },
    { id: 5, nombre: 'Mayorista' }
  ];

  public estados: string[] = ['ALTA', 'Cancel-Alta', 'Todas'];

  // Usuario actual
  public usuario: string = '';

  private destroy$ = new Subject<void>();

  constructor(private _cargardata: CargardataService) {}

  ngOnInit() {
    console.log('ListaAltasComponent inicializado');

    // Obtener usuario de sessionStorage
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.usuario = user.email || '';

    // Obtener sucursal del usuario
    const sucursalUsuario = user.sucursal || null;

    // Si el usuario tiene una sucursal específica, filtrar por ella
    if (sucursalUsuario) {
      this.sucursalFiltro = sucursalUsuario;
    }

    this.cargarAltas();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarAltas(): void {
    this.cargando = true;

    const sucursal = this.sucursalFiltro || 1; // Si no hay filtro, usar Casa Central por defecto

    // Usar el nuevo método con costos calculados
    this._cargardata.obtenerAltasConCostos(sucursal, undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          this.cargando = false;

          if (response.error) {
            Swal.fire({
              title: 'Error',
              text: response.mensaje || 'Error al cargar altas de existencias',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
            this.altas = [];
          } else {
            this.altas = response.mensaje || [];
            // Inicializar campo de selección en false
            this.altas.forEach(alta => alta.seleccionado = false);
            this.aplicarFiltros();
          }
        },
        error: (error) => {
          console.error('Error al cargar altas:', error);
          this.cargando = false;

          Swal.fire({
            title: 'Error',
            text: 'Error al comunicarse con el servidor: ' + (error.message || error),
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
  }

  aplicarFiltros(): void {
    let resultado = [...this.altas];

    // Filtrar por estado
    if (this.estadoFiltro && this.estadoFiltro !== 'Todas') {
      resultado = resultado.filter(alta =>
        alta.estado?.trim() === this.estadoFiltro
      );
    }

    this.altasFiltradas = resultado;
    console.log('Altas filtradas:', this.altasFiltradas.length);
  }

  onFiltroChange(): void {
    if (this.sucursalFiltro === 0) {
      this.sucursalFiltro = null;
    }
    this.cargarAltas();
  }

  onEstadoChange(): void {
    this.aplicarFiltros();
  }

  getNombreSucursal(id: number): string {
    const sucursal = this.sucursales.find(s => s.id === id);
    return sucursal ? sucursal.nombre : `Sucursal ${id}`;
  }

  verDetalles(alta: AltaExistencia): void {
    const cancelacionInfo = alta.motivo_cancelacion
      ? `
        <hr>
        <div class="mt-3">
          <h6 class="text-danger"><strong>Información de Cancelación:</strong></h6>
          <p><strong>Motivo:</strong> ${alta.motivo_cancelacion}</p>
          <p><strong>Fecha:</strong> ${alta.fecha_cancelacion || 'N/A'}</p>
          <p><strong>Usuario:</strong> ${alta.usuario_cancelacion || 'N/A'}</p>
        </div>
      `
      : '';

    Swal.fire({
      title: 'Detalles de Alta de Existencias',
      html: `
        <div style="text-align: left; padding: 10px;">
          <h6><strong>Información General:</strong></h6>
          <p><strong>ID:</strong> ${alta.id_num}</p>
          <p><strong>Estado:</strong> <span class="badge ${
            alta.estado?.trim() === 'ALTA' ? 'badge-success' : 'badge-danger'
          }">${alta.estado}</span></p>
          <p><strong>Fecha:</strong> ${alta.fecha || 'N/A'}</p>
          <p><strong>Fecha Resuelto:</strong> ${alta.fecha_resuelto || 'N/A'}</p>

          <hr>
          <h6><strong>Producto:</strong></h6>
          <p><strong>ID Artículo:</strong> ${alta.id_art}</p>
          <p><strong>Descripción:</strong> ${alta.descripcion}</p>
          <p><strong>Cantidad:</strong> ${alta.cantidad}</p>

          <hr>
          <h6><strong>Sucursal:</strong></h6>
          <p><strong>Sucursal:</strong> ${this.getNombreSucursal(alta.sucursald)}</p>

          <hr>
          <h6><strong>Usuario y Observación:</strong></h6>
          <p><strong>Usuario:</strong> ${alta.usuario_res || alta.usuario}</p>
          <p><strong>Observación:</strong> ${alta.observacion}</p>

          ${cancelacionInfo}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: '600px'
    });
  }

  confirmarCancelacion(alta: AltaExistencia): void {
    // Validar que el estado sea ALTA
    if (alta.estado?.trim() !== 'ALTA') {
      Swal.fire({
        title: 'Error',
        text: 'Solo se pueden cancelar registros con estado ALTA',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Solicitar motivo de cancelación
    Swal.fire({
      title: 'Cancelar Alta de Existencias',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>ID:</strong> ${alta.id_num}</p>
          <p><strong>Producto:</strong> ${alta.descripcion}</p>
          <p><strong>Cantidad:</strong> ${alta.cantidad}</p>
          <p><strong>Sucursal:</strong> ${this.getNombreSucursal(alta.sucursald)}</p>
          <hr>
          <label for="motivo-cancelacion" class="form-label">
            <strong>Motivo de Cancelación: <span class="text-danger">*</span></strong>
            <small class="text-muted">(mínimo 10 caracteres)</small>
          </label>
          <textarea
            id="motivo-cancelacion"
            class="swal2-textarea"
            placeholder="Explique detalladamente el motivo de la cancelación..."
            style="width: 100%; min-height: 100px;"></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar alta',
      cancelButtonText: 'No, volver',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      preConfirm: () => {
        const motivo = (document.getElementById('motivo-cancelacion') as HTMLTextAreaElement).value;

        if (!motivo || motivo.trim().length < 10) {
          Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
          return false;
        }

        return motivo.trim();
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.cancelarAlta(alta.id_num, result.value);
      }
    });
  }

  cancelarAlta(id_num: number, motivo: string): void {
    this.cancelando = true;

    console.log('Cancelando alta:', { id_num, motivo, usuario: this.usuario });

    this._cargardata.cancelarAltaExistencias(id_num, motivo, this.usuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          this.cancelando = false;

          if (response.error) {
            Swal.fire({
              title: 'Error',
              text: response.mensaje || 'Error al cancelar alta de existencias',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          } else {
            Swal.fire({
              title: '¡Éxito!',
              html: `
                <div style="text-align: left; padding: 10px;">
                  <p>Alta de existencias cancelada correctamente</p>
                  <p><strong>ID:</strong> ${response.id_num}</p>
                  <p><strong>Cantidad revertida:</strong> ${response.cantidad_revertida}</p>
                  <p><strong>Sucursal:</strong> ${this.getNombreSucursal(response.sucursal)}</p>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              // Recargar lista
              this.cargarAltas();
            });
          }
        },
        error: (error) => {
          console.error('Error al cancelar alta:', error);
          this.cancelando = false;

          Swal.fire({
            title: 'Error',
            text: 'Error al comunicarse con el servidor: ' + (error.message || error),
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
  }

  get cantidadActivas(): number {
    return this.altasFiltradas.filter(alta => alta.estado?.trim() === 'ALTA').length;
  }

  get cantidadCanceladas(): number {
    return this.altasFiltradas.filter(alta => alta.estado?.trim() === 'Cancel-Alta').length;
  }

  // ============================================================================
  // MÉTODOS PARA SELECCIÓN MÚLTIPLE (V2.0)
  // ============================================================================

  /**
   * Alterna la selección de una alta específica
   */
  toggleSeleccion(alta: AltaExistencia): void {
    alta.seleccionado = !alta.seleccionado;
  }

  /**
   * Selecciona o deselecciona todas las altas ACTIVAS (estado 'ALTA')
   */
  toggleSeleccionarTodas(event: any): void {
    const checked = event.target.checked;
    this.altasFiltradas
      .filter(alta => alta.estado?.trim() === 'ALTA')
      .forEach(alta => alta.seleccionado = checked);
  }

  /**
   * Obtiene las altas seleccionadas
   */
  get altasSeleccionadas(): AltaExistencia[] {
    return this.altasFiltradas.filter(alta => alta.seleccionado === true);
  }

  /**
   * Verifica si hay altas seleccionadas
   */
  get hayAltasSeleccionadas(): boolean {
    return this.altasSeleccionadas.length > 0;
  }

  /**
   * Verifica si todas las altas activas están seleccionadas
   */
  get todasSeleccionadas(): boolean {
    const altasActivas = this.altasFiltradas.filter(alta => alta.estado?.trim() === 'ALTA');
    if (altasActivas.length === 0) return false;
    return altasActivas.every(alta => alta.seleccionado === true);
  }

  /**
   * Confirmar cancelación múltiple de altas
   */
  confirmarCancelacionMultiple(): void {
    const seleccionadas = this.altasSeleccionadas;

    if (seleccionadas.length === 0) {
      Swal.fire({
        title: 'Atención',
        text: 'No hay altas seleccionadas para cancelar',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Validar que todas sean estado ALTA
    const invalidasEstado = seleccionadas.filter(alta => alta.estado?.trim() !== 'ALTA');
    if (invalidasEstado.length > 0) {
      Swal.fire({
        title: 'Error',
        text: `Hay ${invalidasEstado.length} registro(s) con estado inválido para cancelación`,
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Mostrar resumen de altas a cancelar
    const listaHtml = seleccionadas.map(alta => `
      <tr>
        <td><strong>${alta.id_num}</strong></td>
        <td>${alta.descripcion}</td>
        <td>${alta.cantidad}</td>
        <td>${this.getNombreSucursal(alta.sucursald)}</td>
      </tr>
    `).join('');

    Swal.fire({
      title: `Cancelar ${seleccionadas.length} Alta(s) de Existencias`,
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Registros seleccionados: ${seleccionadas.length}</strong></p>
          <div style="max-height: 300px; overflow-y: auto;">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Sucursal</th>
                </tr>
              </thead>
              <tbody>
                ${listaHtml}
              </tbody>
            </table>
          </div>
          <hr>
          <label for="motivo-cancelacion" class="form-label">
            <strong>Motivo de Cancelación: <span class="text-danger">*</span></strong>
            <small class="text-muted">(mínimo 10 caracteres)</small>
          </label>
          <textarea
            id="motivo-cancelacion"
            class="swal2-textarea"
            placeholder="Explique detalladamente el motivo de la cancelación múltiple..."
            style="width: 100%; min-height: 100px;"></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, cancelar ${seleccionadas.length} alta(s)`,
      cancelButtonText: 'No, volver',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      width: '700px',
      preConfirm: () => {
        const motivo = (document.getElementById('motivo-cancelacion') as HTMLTextAreaElement).value;

        if (!motivo || motivo.trim().length < 10) {
          Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
          return false;
        }

        return motivo.trim();
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const ids = seleccionadas.map(alta => alta.id_num);
        this.cancelarAltasMultiple(ids, result.value);
      }
    });
  }

  /**
   * Cancelar múltiples altas de existencias
   */
  cancelarAltasMultiple(id_nums: number[], motivo: string): void {
    this.cancelando = true;

    console.log('Cancelando altas múltiples:', { id_nums, motivo, usuario: this.usuario });

    this._cargardata.cancelarAltaExistencias(null, motivo, this.usuario, id_nums)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          this.cancelando = false;

          if (response.error) {
            Swal.fire({
              title: 'Error',
              text: response.mensaje || 'Error al cancelar altas de existencias',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          } else {
            // Construir resumen de cancelaciones
            const resultadosHtml = response.resultados.map((r: any) => `
              <tr>
                <td><strong>${r.id_num}</strong></td>
                <td>${r.cantidad_revertida}</td>
                <td>${this.getNombreSucursal(r.sucursal)}</td>
                <td>$${r.costo_total_1_fijo}</td>
              </tr>
            `).join('');

            Swal.fire({
              title: '¡Éxito!',
              html: `
                <div style="text-align: left; padding: 10px;">
                  <p><strong>Altas canceladas correctamente: ${response.total_registros}</strong></p>
                  <p>Total cantidad revertida: ${response.total_cantidad_revertida}</p>
                  <hr>
                  <div style="max-height: 300px; overflow-y: auto;">
                    <table class="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Cantidad</th>
                          <th>Sucursal</th>
                          <th>Costo Fijado</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${resultadosHtml}
                      </tbody>
                    </table>
                  </div>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'Aceptar',
              width: '700px'
            }).then(() => {
              // Recargar lista
              this.cargarAltas();
            });
          }
        },
        error: (error) => {
          console.error('Error al cancelar altas:', error);
          this.cancelando = false;

          Swal.fire({
            title: 'Error',
            text: 'Error al comunicarse con el servidor: ' + (error.message || error),
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
  }

  exportarExcel(): void {
    import('xlsx').then((xlsx) => {
      const datosExportar = this.altasFiltradas.map(alta => ({
        'ID': alta.id_num,
        'Estado': alta.estado,
        'Fecha': alta.fecha,
        'Producto': alta.descripcion,
        'Cantidad': alta.cantidad,
        'Sucursal': this.getNombreSucursal(alta.sucursald),
        'Usuario': alta.usuario_res || alta.usuario,
        'Observación': alta.observacion,
        'Motivo Cancelación': alta.motivo_cancelacion || '',
        'Fecha Cancelación': alta.fecha_cancelacion || '',
        'Usuario Cancelación': alta.usuario_cancelacion || ''
      }));

      const worksheet = xlsx.utils.json_to_sheet(datosExportar);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

      const data: Blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      });

      import('file-saver').then((FileSaver) => {
        FileSaver.saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
      });
    });
  }
}
