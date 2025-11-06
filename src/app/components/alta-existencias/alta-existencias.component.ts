import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { StockPaginadosService } from '../../services/stock-paginados.service';
import { Producto } from '../../interfaces/producto';
import { PedidoItem } from '../../interfaces/pedidoItem';
import { Pedidoscb } from '../../interfaces/pedidoscb';
import Swal from 'sweetalert2';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { LazyLoadEvent } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';

// Definir la interfaz Column para la selección de columnas
interface Column {
  field: string;
  header: string;
}

// Interfaz para sucursales
interface Sucursal {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-alta-existencias',
  templateUrl: './alta-existencias.component.html',
  styleUrls: ['./alta-existencias.component.css']
})
export class AltaExistenciasComponent implements OnInit, OnDestroy {
  // Propiedades de productos
  public productos: Producto[] = [];
  public productoSeleccionado: Producto | null = null;
  public cargandoProductos: boolean = false;
  public loading: boolean = false;

  // Propiedades para la tabla lazy loading
  public first: number = 0;
  public rows: number = 25;
  public sortField: string | undefined;
  public sortOrder: number = 1;
  public filters: any = {};
  public totalRegistros: number = 0;

  // Configuración de columnas
  cols: Column[];
  _selectedColumns: Column[];

  // Datos del formulario de alta
  public cantidad: number = 0;
  public observacion: string = '';
  public sucursalSeleccionada: number = 1;
  public sucursales: Sucursal[] = [
    { id: 1, nombre: 'Casa Central' },
    { id: 2, nombre: 'Valle Viejo' },
    { id: 3, nombre: 'Güemes' },
    { id: 4, nombre: 'Depósito' },
    { id: 5, nombre: 'Mayorista' }
  ];

  // Usuario actual
  public usuario: string = '';

  // Flags de estado
  public guardando: boolean = false;

  private destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private _cargardata: CargardataService,
    private stockPaginadosService: StockPaginadosService
  ) {
    this.initializeComponent();

    // Definir columnas disponibles
    this.cols = [
      { field: 'nomart', header: 'Nombre' },
      { field: 'marca', header: 'Marca' },
      { field: 'cd_articulo', header: 'Código' },
      { field: 'cd_barra', header: 'Código Barra' },
      { field: 'exi1', header: 'Stock Dep' },
      { field: 'exi2', header: 'Stock CC' },
      { field: 'exi3', header: 'Stock VV' },
      { field: 'exi4', header: 'Stock GM' },
      { field: 'exi5', header: 'Stock MAY' }
    ];

    // Columnas seleccionadas por defecto
    this._selectedColumns = [
      this.cols[0], // nomart
      this.cols[1], // marca
      this.cols[2], // cd_articulo
      this.cols[4], // exi1 (Stock Dep)
      this.cols[5], // exi2 (Stock CC)
      this.cols[6], // exi3 (Stock VV)
      this.cols[7], // exi4 (Stock GM)
      this.cols[8]  // exi5 (Stock MAY)
    ];
  }

  // Getters y setters para las columnas seleccionadas
  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }

  set selectedColumns(val: Column[]) {
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }

  ngOnInit() {
    console.log('AltaExistenciasComponent inicializado');

    // Obtener usuario de sessionStorage (usando emailOp como otros componentes)
    this.usuario = sessionStorage.getItem('emailOp') || '';

    // Si no hay usuario, mostrar advertencia
    if (!this.usuario || this.usuario.trim() === '') {
      console.error('⚠️ ADVERTENCIA: No hay usuario en sessionStorage.emailOp');
    } else {
      console.log('✅ Usuario obtenido:', this.usuario);
    }

    this.restoreTableState();
    this.setupSubscriptions();
    this.cargarDatosIniciales();

    // Cargar primera página como respaldo
    setTimeout(() => {
      if (this.productos.length === 0 && !this.loading) {
        console.log('Cargando primera página manualmente como respaldo');
        this.loadDataLazy({
          first: this.first,
          rows: this.rows,
          sortField: this.sortField,
          sortOrder: this.sortOrder,
          filters: this.filters
        });
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.productos = [];
    this.productoSeleccionado = null;
    this.cantidad = 0;
    this.observacion = '';
  }

  private setupSubscriptions(): void {
    // Suscribirse a productos
    this.subscriptions.push(
      this.stockPaginadosService.productos$.subscribe(productos => {
        this.productos = productos;
        this.cdr.detectChanges();
      })
    );

    // Suscribirse a estado de carga
    this.subscriptions.push(
      this.stockPaginadosService.cargando$.subscribe(cargando => {
        this.cargandoProductos = cargando;
        this.loading = cargando;
      })
    );

    // Suscribirse a total de items
    this.subscriptions.push(
      this.stockPaginadosService.totalItems$.subscribe(total => {
        this.totalRegistros = total;
      })
    );
  }

  private cargarDatosIniciales(): void {
    this.stockPaginadosService.cargarPagina(1).subscribe(
      () => {},
      error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los productos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  // Método para lazy loading
  async loadDataLazy(event: LazyLoadEvent): Promise<void> {
    console.log('🔄 loadDataLazy - Evento recibido:', event);

    this.first = event.first || 0;
    this.rows = event.rows || 25;
    this.sortField = event.sortField;
    this.sortOrder = event.sortOrder || 1;
    this.filters = event.filters || {};

    this.saveTableState();

    const page = Math.floor(this.first / this.rows) + 1;

    console.log(`📄 Cargando página ${page}, first: ${this.first}, rows: ${this.rows}`);

    try {
      await this.loadServerData(page);
    } catch (error) {
      console.error('❌ Error en loadDataLazy:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al cargar datos: ' + (error.message || error),
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  private async loadServerData(page: number): Promise<void> {
    try {
      console.log(`🌐 Cargando página ${page} del servidor...`);

      const response = await this.stockPaginadosService.cargarPaginaConFiltros(
        page,
        this.rows,
        this.sortField,
        this.sortOrder,
        this.filters
      ).toPromise();

      console.log('✅ Respuesta recibida:', response);

      if (response && !response.error) {
        console.log(`✅ Datos cargados exitosamente`);
      } else {
        console.warn('⚠️ Respuesta con error o vacía:', response);
      }

    } catch (error) {
      console.error('❌ Error cargando datos del servidor:', error);
      throw error;
    }
  }

  isColumnVisible(field: string): boolean {
    return this._selectedColumns.some(col => col.field === field);
  }

  onColumnSelectionChange(): void {
    this.saveTableState();
    console.log('Columnas seleccionadas actualizadas:', this._selectedColumns);
  }

  getColumnCount(): number {
    return this._selectedColumns.length + 1; // +1 para la columna de acciones
  }

  private saveTableState(): void {
    try {
      const state = {
        first: this.first,
        rows: this.rows,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        filters: this.filters,
        selectedColumns: this._selectedColumns,
        timestamp: Date.now()
      };

      sessionStorage.setItem('alta_existencias_table_state', JSON.stringify(state));
      console.log('💾 Estado de tabla guardado:', state);
    } catch (error) {
      console.warn('Error guardando estado de la tabla:', error);
    }
  }

  private restoreTableState(): void {
    try {
      const savedState = sessionStorage.getItem('alta_existencias_table_state');

      if (savedState) {
        const state = JSON.parse(savedState);

        // Verificar que el estado no sea muy viejo (2 horas máximo)
        const isValidState = state.timestamp && (Date.now() - state.timestamp) < (2 * 60 * 60 * 1000);

        if (isValidState) {
          console.log('🔄 Restaurando estado de filtros y paginación:', state);

          this.first = state.first || 0;
          this.rows = state.rows || 25;
          this.sortField = state.sortField;
          this.sortOrder = state.sortOrder || 1;
          this.filters = state.filters || {};

          if (state.selectedColumns && Array.isArray(state.selectedColumns)) {
            this._selectedColumns = state.selectedColumns;
          }
        } else {
          console.log('⏰ Estado de tabla expirado, usando valores por defecto');
        }
      }
    } catch (error) {
      console.warn('Error restaurando estado de la tabla:', error);
    }
  }

  // ============================================================================
  // MÉTODOS PARA ALTA DE EXISTENCIAS
  // ============================================================================

  seleccionarProducto(producto: Producto): void {
    this.productoSeleccionado = producto;
    this.cantidad = 0;
    this.observacion = '';
    console.log('Producto seleccionado:', producto);
  }

  cancelarSeleccion(): void {
    this.productoSeleccionado = null;
    this.cantidad = 0;
    this.observacion = '';
  }

  validarFormulario(): { valido: boolean; mensaje: string } {
    if (!this.productoSeleccionado) {
      return { valido: false, mensaje: 'Debe seleccionar un producto' };
    }

    if (!this.cantidad || this.cantidad <= 0) {
      return { valido: false, mensaje: 'La cantidad debe ser mayor a 0' };
    }

    if (!this.observacion || this.observacion.trim().length < 10) {
      return { valido: false, mensaje: 'La observación debe tener al menos 10 caracteres explicando el motivo del alta' };
    }

    if (!this.sucursalSeleccionada) {
      return { valido: false, mensaje: 'Debe seleccionar una sucursal' };
    }

    return { valido: true, mensaje: '' };
  }

  confirmarAlta(): void {
    // Validar formulario
    const validacion = this.validarFormulario();
    if (!validacion.valido) {
      Swal.fire({
        title: 'Error de validación',
        text: validacion.mensaje,
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Validación adicional de ID de artículo
    if (!this.productoSeleccionado!.idart || this.productoSeleccionado!.idart === 0) {
      Swal.fire({
        title: 'Error de validación',
        text: 'El producto seleccionado no tiene un ID válido. Por favor, seleccione otro producto.',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      console.error('Producto sin ID válido:', this.productoSeleccionado);
      return;
    }

    // Obtener nombre de sucursal
    const nombreSucursal = this.sucursales.find(s => s.id === Number(this.sucursalSeleccionada))?.nombre || 'No encontrada';

    // Mostrar confirmación
    Swal.fire({
      title: '¿Confirmar alta de existencias?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Producto:</strong> ${this.productoSeleccionado!.nomart}</p>
          <p><strong>Código:</strong> ${this.productoSeleccionado!.idart}</p>
          <p><strong>Cantidad:</strong> ${this.cantidad}</p>
          <p><strong>Sucursal:</strong> ${nombreSucursal}</p>
          <p><strong>Observación:</strong> ${this.observacion}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.guardarAlta();
      }
    });
  }

  guardarAlta(): void {
    this.guardando = true;

    // Asegurarse de que id_art sea un número válido
    const idArticulo = Number(this.productoSeleccionado!.idart);

    if (!idArticulo || idArticulo === 0 || isNaN(idArticulo)) {
      console.error('ID de artículo inválido:', {
        idart: this.productoSeleccionado!.idart,
        idArticulo: idArticulo,
        producto: this.productoSeleccionado
      });

      this.guardando = false;
      Swal.fire({
        title: 'Error',
        text: 'El ID del artículo no es válido. Por favor, seleccione otro producto.',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Preparar datos de pedidoitem
    const pedidoItem: any = {
      tipo: 'PE',
      cantidad: this.cantidad,
      id_art: idArticulo, // Asegurar que sea número
      descripcion: this.productoSeleccionado!.nomart,
      precio: 0,
      usuario_res: this.usuario, // Email completo (BD ampliada a 50 caracteres)
      observacion: this.observacion.trim(),
      estado: 'ALTA'
    };

    // Preparar datos de pedidoscb
    const pedidoscb: any = {
      tipo: 'PE',
      sucursald: Number(this.sucursalSeleccionada), // Asegurar que sea número
      sucursalh: Number(this.sucursalSeleccionada), // Misma sucursal (sin transferencia)
      usuario: this.usuario, // Email completo (BD ampliada a 50 caracteres)
      observacion: this.observacion.trim(),
      estado: 'ALTA'
    };

    console.log('Enviando alta de existencias:', { pedidoItem, pedidoscb });
    console.log('ID Artículo validado:', idArticulo, 'Tipo:', typeof idArticulo);

    // Enviar al backend
    this._cargardata.crearAltaExistencias(pedidoItem, pedidoscb)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          this.guardando = false;

          if (response.error) {
            Swal.fire({
              title: 'Error',
              text: response.mensaje || 'Error al registrar alta de existencias',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          } else {
            // Obtener nombre de sucursal
            const nombreSucursal = this.sucursales.find(s => s.id === Number(response.sucursal || this.sucursalSeleccionada))?.nombre || 'Sucursal desconocida';

            Swal.fire({
              title: '¡Éxito!',
              html: `
                <div style="text-align: left; padding: 10px;">
                  <p>Alta de existencias registrada correctamente</p>
                  <p><strong>ID:</strong> ${response.id_num}</p>
                  <p><strong>Producto:</strong> ${this.productoSeleccionado!.nomart}</p>
                  <p><strong>Cantidad:</strong> ${response.cantidad || this.cantidad}</p>
                  <p><strong>Sucursal:</strong> ${nombreSucursal}</p>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              // Limpiar formulario
              this.cancelarSeleccion();
              // Recargar productos para ver stock actualizado
              this.loadServerData(Math.floor(this.first / this.rows) + 1);
            });
          }
        },
        error: (error) => {
          console.error('Error al guardar alta:', error);
          this.guardando = false;

          Swal.fire({
            title: 'Error',
            text: 'Error al comunicarse con el servidor: ' + (error.message || error),
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
  }
}
