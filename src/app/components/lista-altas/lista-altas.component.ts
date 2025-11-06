import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LazyLoadEvent } from 'primeng/api';
import { SucursalNombrePipe } from '../../pipes/sucursal-nombre.pipe';

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
  // ============================================================================
  // PIPES
  // ============================================================================
  private sucursalPipe = new SucursalNombrePipe();

  // ============================================================================
  // DATOS (V3.0 - Con Lazy Loading)
  // ============================================================================
  public altas: AltaExistencia[] = [];
  public altasFiltradas: AltaExistencia[] = []; // Mantiene compatibilidad con métodos legacy
  public cargando: boolean = false;
  public cancelando: boolean = false;

  // ============================================================================
  // LAZY LOADING (V3.0 - PrimeNG DataTable)
  // ============================================================================
  public loading: boolean = false;          // Indicador de carga para PrimeNG
  public totalRecords: number = 0;          // Total de registros (con filtros aplicados)
  public first: number = 0;                 // Índice del primer registro de la página actual
  public rows: number = 50;                 // Registros por página
  public currentPage: number = 1;           // Página actual (1-based)

  // Ordenamiento
  public sortField: string = 'id_num';      // Campo de ordenamiento por defecto
  public sortOrder: number = -1;            // -1 = DESC, 1 = ASC

  // Filtros dinámicos (del DataTable de PrimeNG)
  public filters: { [key: string]: any } = {};
  public matchModes: { [key: string]: string } = {};

  // ============================================================================
  // FILTROS GLOBALES (Mantiene compatibilidad con filtros de encabezado)
  // ============================================================================
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

  // ============================================================================
  // STATE MANAGEMENT (V3.0)
  // ============================================================================
  private readonly STATE_KEY = 'lista-altas-state';
  private lastLazyLoadEvent: LazyLoadEvent | null = null;

  // ============================================================================
  // CONFIGURACIÓN DE COLUMNAS (V3.0)
  // ============================================================================
  public columnasVisibles: { [key: string]: boolean } = {
    id_num: true,
    estado: true,
    fecha: true,
    descripcion: true,
    cantidad: true,
    sucursald: true,
    usuario_res: true,
    costo_total_1: true,
    costo_total_2: true,
    tipo_calculo: true,
    acciones: true
  };

  // Usuario actual
  public usuario: string = '';

  private destroy$ = new Subject<void>();

  constructor(private _cargardata: CargardataService) {}

  ngOnInit() {
    console.log('ListaAltasComponent inicializado (V3.0 - Lazy Loading)');

    // Obtener usuario de sessionStorage
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.usuario = user.email || '';

    // Obtener sucursal del usuario
    const sucursalUsuario = user.sucursal || null;

    // Si el usuario tiene una sucursal específica, filtrar por ella
    if (sucursalUsuario) {
      this.sucursalFiltro = sucursalUsuario;
    }

    // Restaurar estado de sessionStorage (si existe)
    this.restoreState();

    // Nota: No se llama a cargarAltas() aquí porque será llamado automáticamente
    // por el evento onLazyLoad del p-table cuando se inicialice
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // STATE MANAGEMENT (V3.0)
  // ============================================================================

  /**
   * Restaurar estado guardado en sessionStorage
   */
  private restoreState(): void {
    try {
      const stateStr = sessionStorage.getItem(this.STATE_KEY);
      if (stateStr) {
        const state = JSON.parse(stateStr);

        // Restaurar paginación
        this.first = state.first || 0;
        this.rows = state.rows || 50;
        this.currentPage = state.currentPage || 1;

        // Restaurar ordenamiento
        this.sortField = state.sortField || 'id_num';
        this.sortOrder = state.sortOrder || -1;

        // Restaurar filtros dinámicos
        this.filters = state.filters || {};
        this.matchModes = state.matchModes || {};

        // Restaurar filtros globales
        if (state.sucursalFiltro !== undefined && state.sucursalFiltro !== null) {
          this.sucursalFiltro = state.sucursalFiltro;
        }
        if (state.estadoFiltro) {
          this.estadoFiltro = state.estadoFiltro;
        }

        // Restaurar visibilidad de columnas
        if (state.columnasVisibles) {
          this.columnasVisibles = state.columnasVisibles;
        }

        console.log('Estado restaurado:', state);
      }
    } catch (error) {
      console.error('Error al restaurar estado:', error);
    }
  }

  /**
   * Guardar estado actual en sessionStorage
   */
  private saveState(): void {
    try {
      const state = {
        first: this.first,
        rows: this.rows,
        currentPage: this.currentPage,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        filters: this.filters,
        matchModes: this.matchModes,
        sucursalFiltro: this.sucursalFiltro,
        estadoFiltro: this.estadoFiltro,
        columnasVisibles: this.columnasVisibles
      };

      sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
      console.log('Estado guardado:', state);
    } catch (error) {
      console.error('Error al guardar estado:', error);
    }
  }

  // ============================================================================
  // LAZY LOADING (V3.0)
  // ============================================================================

  /**
   * Event handler principal para Lazy Loading de PrimeNG
   * Se ejecuta cuando:
   * - El componente se inicializa
   * - El usuario cambia de página
   * - El usuario ordena una columna
   * - El usuario aplica un filtro
   */
  onLazyLoad(event: LazyLoadEvent): void {
    console.log('onLazyLoad evento:', event);

    // Guardar evento para referencia futura
    this.lastLazyLoadEvent = event;

    // Actualizar propiedades de paginación
    this.first = event.first || 0;
    this.rows = event.rows || 50;
    this.currentPage = Math.floor(this.first / this.rows) + 1;

    // Actualizar ordenamiento (si existe)
    if (event.sortField) {
      this.sortField = event.sortField;
      this.sortOrder = event.sortOrder || -1;
    }

    // Extraer filtros dinámicos (si existen)
    if (event.filters) {
      this.filters = {};
      this.matchModes = {};

      for (const field in event.filters) {
        const filterMeta = event.filters[field];
        if (Array.isArray(filterMeta) && filterMeta.length > 0) {
          // PrimeNG devuelve un array de FilterMetadata
          const firstFilter = filterMeta[0];
          if (firstFilter.value !== null && firstFilter.value !== undefined && firstFilter.value !== '') {
            this.filters[field] = firstFilter.value;
            this.matchModes[field] = firstFilter.matchMode || 'contains';
          }
        }
      }
    }

    // Guardar estado
    this.saveState();

    // Cargar datos con lazy loading
    this.loadAltas();
  }

  /**
   * Cargar altas con lazy loading (V3.0)
   * Utiliza el nuevo método paginado del servicio
   */
  loadAltas(): void {
    this.loading = true;
    this.cargando = true; // Mantiene compatibilidad con template legacy

    console.log('loadAltas - Parámetros:', {
      sucursal: this.sucursalFiltro,
      estado: this.estadoFiltro,
      page: this.currentPage,
      limit: this.rows,
      sortField: this.sortField,
      sortOrder: this.sortOrder === 1 ? 'ASC' : 'DESC',
      filters: this.filters,
      matchModes: this.matchModes
    });

    // Convertir sortOrder de PrimeNG (-1/1) a backend ('DESC'/'ASC')
    const sortOrderStr = this.sortOrder === 1 ? 'ASC' : 'DESC';

    this._cargardata.obtenerAltasConCostosPaginadas(
      this.sucursalFiltro || undefined,
      this.estadoFiltro !== 'Todas' ? this.estadoFiltro : undefined,
      this.currentPage,
      this.rows,
      this.sortField,
      sortOrderStr,
      this.filters,
      this.matchModes
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor (paginada):', response);
          this.loading = false;
          this.cargando = false;

          if (response.error) {
            Swal.fire({
              title: 'Error',
              text: response.mensaje || 'Error al cargar altas de existencias',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
            this.altas = [];
            this.altasFiltradas = [];
            this.totalRecords = 0;
          } else {
            // Nuevo formato: {data, total, page, limit, total_pages}
            this.altas = response.data || [];
            this.altasFiltradas = this.altas; // Para compatibilidad con métodos legacy
            this.totalRecords = response.total || 0;

            // Inicializar campo de selección en false
            this.altas.forEach(alta => alta.seleccionado = false);

            console.log(`Cargadas ${this.altas.length} altas de ${this.totalRecords} totales (Página ${response.page}/${response.total_pages})`);
          }
        },
        error: (error) => {
          console.error('Error al cargar altas:', error);
          this.loading = false;
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

  /**
   * Recargar datos (mantiene página actual)
   */
  recargarDatos(): void {
    if (this.lastLazyLoadEvent) {
      this.onLazyLoad(this.lastLazyLoadEvent);
    } else {
      this.loadAltas();
    }
  }

  /**
   * Refrescar datos (vuelve a la primera página)
   */
  refrescarDatos(): void {
    this.first = 0;
    this.currentPage = 1;
    this.loadAltas();
  }

  // ============================================================================
  // MÉTODO LEGACY (Mantiene compatibilidad con código existente)
  // ============================================================================

  /**
   * @deprecated Usar loadAltas() o onLazyLoad() en su lugar
   * Mantiene compatibilidad con botones y métodos que llaman a cargarAltas()
   * Redirige al nuevo sistema de lazy loading
   */
  cargarAltas(): void {
    console.log('cargarAltas (legacy) redirigiendo a refrescarDatos()');
    this.refrescarDatos();
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

  /**
   * Manejar cambio de filtro de sucursal (V3.0)
   */
  onFiltroChange(): void {
    if (this.sucursalFiltro === 0) {
      this.sucursalFiltro = null;
    }
    // Guardar estado y refrescar datos (vuelve a primera página)
    this.saveState();
    this.refrescarDatos();
  }

  /**
   * Manejar cambio de filtro de estado (V3.0)
   */
  onEstadoChange(): void {
    // Guardar estado y refrescar datos (vuelve a primera página)
    this.saveState();
    this.refrescarDatos();
  }

  getNombreSucursal(id: number): string {
    const sucursal = this.sucursales.find(s => s.id === id);
    return sucursal ? sucursal.nombre : `Sucursal ${id}`;
  }

  /**
   * Obtiene el usuario que procesó el alta, con fallback a valor por defecto
   * Maneja strings vacíos o con solo espacios (problema del tipo CHAR de PostgreSQL)
   */
  getUsuario(alta: AltaExistencia): string {
    const usuario = (alta.usuario_res || alta.usuario || '').trim();
    return usuario || 'Sin usuario';
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
          <p><strong>Sucursal:</strong> ${this.sucursalPipe.transform(alta.sucursald)}</p>

          <hr>
          <h6><strong>Usuario y Observación:</strong></h6>
          <p><strong>Usuario:</strong> ${this.getUsuario(alta)}</p>
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

      import('file-saver').then((module: any) => {
        const saveAs = module.default || module.saveAs || module;
        if (typeof saveAs === 'function') {
          saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
        } else if (typeof saveAs.saveAs === 'function') {
          saveAs.saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
        }
      });
    });
  }
}
