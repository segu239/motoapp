import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { 
  PriceUpdateService, 
  PriceFilterOptions, 
  PreviewProduct, 
  PreviewRequest,
  ApplyChangesRequest 
} from '../../services/price-update.service';

// Interfaces movidas al servicio

interface IndicadorResumen {
  totalRegistros: number;
  impactoTotal: number;
  variacionPromedio: number;
  registrosPreview: number;
}

@Component({
  selector: 'app-cambioprecios',
  templateUrl: './cambioprecios.component.html',
  styleUrls: ['./cambioprecios.component.css']
})
export class CambioPreciosComponent implements OnInit, OnDestroy {

  // Formulario de filtros y configuración
  filtersForm: FormGroup;
  
  // Opciones para los filtros
  filterOptions: PriceFilterOptions | null = null;
  
  // Datos del preview
  productosPreview: PreviewProduct[] = [];
  indicadores: IndicadorResumen = {
    totalRegistros: 0,
    impactoTotal: 0,
    variacionPromedio: 0,
    registrosPreview: 0
  };
  
  // Estados de la UI
  loading = false;
  loadingPreview = false;
  loadingApply = false;
  
  // Opciones para selectores
  tiposModificacion = [
    { label: 'Precio de Costo', value: 'costo' },
    { label: 'Precio Final', value: 'final' }
  ];
  
  // Subscripciones
  private subscriptions: Subscription = new Subscription();
  
  constructor(
    private cdr: ChangeDetectorRef,
    private priceUpdateService: PriceUpdateService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Inicializar formulario de filtros
   */
  private initializeForm(): void {
    this.filtersForm = new FormGroup({
      marca: new FormControl(null),
      cd_proveedor: new FormControl(null),
      rubro: new FormControl(null),
      cod_iva: new FormControl(null),
      tipoModificacion: new FormControl('costo', [Validators.required]),
      porcentaje: new FormControl(0, [
        Validators.required,
        Validators.min(-100),
        Validators.max(1000)
      ])
    });
  }

  /**
   * Configurar suscripciones reactivas del formulario
   */
  private setupFormSubscriptions(): void {
    // Suscripción a cambios individuales de cada filtro para restricción de un solo filtro
    this.setupSingleFilterRestriction();

    // Suscripción a cambios en filtros para actualizar preview automáticamente
    const formSubscription = this.filtersForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        if (this.formValid()) {
          this.generatePreview();
        }
      });
    
    this.subscriptions.add(formSubscription);
  }

  /**
   * Configurar restricción de un solo filtro a la vez
   */
  private setupSingleFilterRestriction(): void {
    // Lista de campos de filtro
    const filterFields = ['marca', 'cd_proveedor', 'rubro', 'cod_iva'];
    
    filterFields.forEach(fieldName => {
      const fieldSubscription = this.filtersForm.get(fieldName)?.valueChanges.subscribe(value => {
        if (value !== null && value !== undefined && value !== '') {
          this.handleSingleFilterSelection(fieldName, value);
        }
      });
      
      if (fieldSubscription) {
        this.subscriptions.add(fieldSubscription);
      }
    });
  }

  /**
   * Manejar selección de un filtro único
   */
  private handleSingleFilterSelection(selectedField: string, selectedValue: any): void {
    const filterFields = ['marca', 'cd_proveedor', 'rubro', 'cod_iva'];
    const fieldLabels: { [key: string]: string } = {
      'marca': 'Marca',
      'cd_proveedor': 'Proveedor',
      'rubro': 'Rubro', 
      'cod_iva': 'Tipo de IVA'
    };

    // Verificar si ya hay otro filtro seleccionado
    let otherFiltersSelected: string[] = [];
    filterFields.forEach(fieldName => {
      if (fieldName !== selectedField) {
        const fieldValue = this.filtersForm.get(fieldName)?.value;
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          otherFiltersSelected.push(fieldLabels[fieldName]);
        }
      }
    });

    if (otherFiltersSelected.length > 0) {
      // Hay otros filtros seleccionados, mostrar alerta y limpiar otros
      Swal.fire({
        title: 'Solo un filtro por vez',
        html: `
          <div class="text-left">
            <p><strong>Has seleccionado:</strong> ${fieldLabels[selectedField]}</p>
            <p><strong>Filtros que serán limpiados:</strong> ${otherFiltersSelected.join(', ')}</p>
            <br>
            <p class="text-muted">Para evitar confusión, solo puedes usar un filtro a la vez.</p>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Continuar con ' + fieldLabels[selectedField],
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      }).then((result) => {
        if (result.isConfirmed) {
          // Limpiar otros filtros
          this.clearOtherFilters(selectedField);
        } else {
          // Revertir el cambio
          this.filtersForm.patchValue({ [selectedField]: null }, { emitEvent: false });
        }
      });
    }
  }

  /**
   * Limpiar otros filtros excepto el seleccionado
   */
  private clearOtherFilters(keepField: string): void {
    const filterFields = ['marca', 'cd_proveedor', 'rubro', 'cod_iva'];
    
    const clearValues: { [key: string]: null } = {};
    filterFields.forEach(fieldName => {
      if (fieldName !== keepField) {
        clearValues[fieldName] = null;
      }
    });

    // Actualizar sin emitir eventos para evitar bucles
    this.filtersForm.patchValue(clearValues, { emitEvent: false });
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  /**
   * Cargar opciones de filtros desde el backend
   */
  loadFilterOptions(): void {
    this.loading = true;
    
    const subscription = this.priceUpdateService.getFilterOptions().subscribe({
      next: (options) => {
        this.filterOptions = options;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando opciones de filtros:', error);
        this.loading = false;
        
        Swal.fire({
          title: 'Error',
          text: error.message || 'No se pudieron cargar las opciones de filtros',
          icon: 'error',
          confirmButtonText: 'Reintentar'
        }).then(() => {
          // Reintentar carga
          this.loadFilterOptions();
        });
      }
    });
    
    this.subscriptions.add(subscription);
  }

  /**
   * Generar preview de cambios
   */
  generatePreview(): void {
    if (!this.formValid()) {
      return;
    }
    
    this.loadingPreview = true;
    const formValue = this.filtersForm.value;
    
    // Crear request para el preview con validación de campos numéricos
    const previewRequest: PreviewRequest = {
      marca: formValue.marca || undefined,
      cd_proveedor: formValue.cd_proveedor || undefined,
      rubro: formValue.rubro || undefined,
      cod_iva: formValue.cod_iva || undefined,
      tipo_modificacion: formValue.tipoModificacion,
      porcentaje: parseFloat(formValue.porcentaje) || 0, // Asegurar que sea número
      sucursal: 1 // TODO: Obtener de contexto/usuario
    };
    
    const subscription = this.priceUpdateService.getPreview(previewRequest).subscribe({
      next: (response) => {
        this.processPreviewResponse(response);
        this.loadingPreview = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error generando preview:', error);
        this.loadingPreview = false;
        this.productosPreview = [];
        this.resetIndicadores();
        
        Swal.fire({
          title: 'Error',
          text: error.message || 'No se pudo generar el preview de cambios',
          icon: 'error'
        });
      }
    });
    
    this.subscriptions.add(subscription);
  }

  /**
   * Procesar respuesta del preview
   */
  private processPreviewResponse(response: any): void {
    if (response.success && response.productos) {
      // Post-procesar productos para agregar campos adicionales de precios
      this.productosPreview = this.enrichProductsWithPriceFields(response.productos, response.tipo_cambio);
      
      this.indicadores = {
        totalRegistros: response.total_registros,
        registrosPreview: response.registros_preview,
        variacionPromedio: response.porcentaje_aplicado,
        impactoTotal: this.calcularImpactoTotal(this.productosPreview)
      };
    } else {
      // Si no hay productos o no es exitoso
      this.productosPreview = [];
      this.resetIndicadores();
    }
  }

  /**
   * Enriquecer productos con campos adicionales de precios para la tabla
   * La función PostgreSQL ya nos da los datos base, solo necesitamos calcular los precios complementarios
   */
  private enrichProductsWithPriceFields(productos: any[], tipoModificacion: string): PreviewProduct[] {
    return productos.map(producto => {
      const alicuotaIva = parseFloat(producto.alicuota_iva) || 21;
      const precioActual = parseFloat(producto.precio_actual) || 0;
      const precioNuevo = parseFloat(producto.precio_nuevo) || 0;
      
      let precoCostoActual: number;
      let precoCostoNuevo: number;
      let precoFinalActual: number;
      let precoFinalNuevo: number;
      
      if (tipoModificacion === 'costo') {
        // El precio_actual y precio_nuevo son precios de costo
        precoCostoActual = precioActual;
        precoCostoNuevo = precioNuevo;
        // Calcular precios finales agregando IVA
        precoFinalActual = precoCostoActual * (1 + alicuotaIva / 100);
        precoFinalNuevo = precoCostoNuevo * (1 + alicuotaIva / 100);
      } else {
        // El precio_actual y precio_nuevo son precios finales
        precoFinalActual = precioActual;
        precoFinalNuevo = precioNuevo;
        // Calcular precios de costo quitando IVA
        precoCostoActual = precoFinalActual / (1 + alicuotaIva / 100);
        precoCostoNuevo = precoFinalNuevo / (1 + alicuotaIva / 100);
      }
      
      return {
        ...producto,
        // Campos adicionales para la nueva tabla
        precio_costo_actual: Math.round(precoCostoActual * 100) / 100,
        precio_costo_nuevo: Math.round(precoCostoNuevo * 100) / 100,
        precio_final_actual: Math.round(precoFinalActual * 100) / 100,
        precio_final_nuevo: Math.round(precoFinalNuevo * 100) / 100,
        // Mantener campos existentes para compatibilidad
        precio_actual: precioActual,
        precio_nuevo: precioNuevo,
        variacion: parseFloat(producto.variacion) || 0,
        variacion_porcentaje: parseFloat(producto.variacion_porcentaje) || 0,
        impacto_inventario: parseFloat(producto.impacto_inventario) || 0,
        stock_total: parseFloat(producto.stock_total) || 0,
        cod_iva: parseInt(producto.cod_iva) || 0,
        alicuota_iva: alicuotaIva
      };
    });
  }

  /**
   * Calcular impacto total
   */
  private calcularImpactoTotal(productos: PreviewProduct[]): number {
    return productos.reduce((total, producto) => total + producto.impacto_inventario, 0);
  }

  /**
   * Aplicar cambios de precios
   */
  applyChanges(): void {
    const activeFiltersCount = this.getActiveFiltersCount();
    
    if (activeFiltersCount === 0) {
      Swal.fire({
        title: 'Filtro Requerido',
        text: 'Debe seleccionar exactamente un filtro (Marca, Proveedor, Rubro o Tipo IVA) para aplicar cambios.',
        icon: 'warning'
      });
      return;
    }
    
    if (activeFiltersCount > 1) {
      const activeFilters = this.getActiveFilters();
      Swal.fire({
        title: 'Demasiados Filtros',
        html: `
          <div class="text-left">
            <p>Solo puede usar un filtro a la vez para evitar confusión.</p>
            <p><strong>Filtros activos:</strong> ${activeFilters.join(', ')}</p>
            <br>
            <p class="text-muted">Por favor, mantenga solo un filtro seleccionado.</p>
          </div>
        `,
        icon: 'warning'
      });
      return;
    }
    
    if (!this.filtersForm.valid) {
      Swal.fire('Error', 'Complete todos los campos requeridos correctamente', 'error');
      return;
    }

    if (this.indicadores.totalRegistros === 0) {
      Swal.fire('Error', 'No hay productos que cumplan con los filtros especificados', 'warning');
      return;
    }

    // Confirmación con detalles del cambio
    const formValue = this.filtersForm.value;
    const tipoTexto = formValue.tipoModificacion === 'costo' ? 'Precio de Costo' : 'Precio Final';
    const porcentajeTexto = formValue.porcentaje > 0 ? `+${formValue.porcentaje}%` : `${formValue.porcentaje}%`;

    Swal.fire({
      title: '¿Confirmar cambios masivos?',
      html: `
        <div class="text-left">
          <p><strong>Tipo:</strong> ${tipoTexto}</p>
          <p><strong>Variación:</strong> ${porcentajeTexto}</p>
          <p><strong>Productos afectados:</strong> ${this.indicadores.totalRegistros}</p>
          <p><strong>Impacto total:</strong> $${this.indicadores.impactoTotal.toLocaleString()}</p>
        </div>
        <div class="alert alert-warning mt-3">
          <small><i class="fa fa-warning"></i> Esta acción no se puede deshacer automáticamente</small>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Aplicar Cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeApplyChanges();
      }
    });
  }

  /**
   * Ejecutar aplicación de cambios
   */
  private executeApplyChanges(): void {
    this.loadingApply = true;
    const formValue = this.filtersForm.value;
    
    // Crear request para aplicar cambios
    const applyRequest: ApplyChangesRequest = {
      marca: formValue.marca || undefined,
      cd_proveedor: formValue.cd_proveedor || undefined,
      rubro: formValue.rubro || undefined,
      cod_iva: formValue.cod_iva || undefined,
      tipo_modificacion: formValue.tipoModificacion,
      porcentaje: parseFloat(formValue.porcentaje) || 0, // Asegurar que sea número
      sucursal: 1, // TODO: Obtener de contexto/usuario
      observacion: `Cambio masivo ${formValue.tipoModificacion} ${parseFloat(formValue.porcentaje) || 0}%`
    };
    
    const subscription = this.priceUpdateService.applyChanges(applyRequest).subscribe({
      next: (response) => {
        this.loadingApply = false;
        
        if (response.success) {
          Swal.fire({
            title: 'Cambios aplicados correctamente',
            html: `
              <div class="text-left">
                <p><strong>Productos modificados:</strong> ${response.productos_modificados}</p>
                ${response.auditoria_id ? `<p><strong>ID de auditoría:</strong> ${response.auditoria_id}</p>` : ''}
                <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          
          this.resetForm();
        } else {
          Swal.fire({
            title: 'Error al aplicar cambios',
            text: response.message || 'No se pudieron aplicar los cambios',
            icon: 'error'
          });
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error aplicando cambios:', error);
        this.loadingApply = false;
        
        Swal.fire({
          title: 'Error',
          text: error.message || 'No se pudieron aplicar los cambios masivos',
          icon: 'error'
        });
      }
    });
    
    this.subscriptions.add(subscription);
  }

  /**
   * Validar formulario - Debe tener exactamente UN filtro y porcentaje válido
   */
  formValid(): boolean {
    const formValue = this.filtersForm.value;
    const filterFields = ['marca', 'cd_proveedor', 'rubro', 'cod_iva'];
    
    // Contar filtros activos
    let activeFilters = 0;
    filterFields.forEach(field => {
      const value = formValue[field];
      if (value !== null && value !== undefined && value !== '') {
        activeFilters++;
      }
    });

    // Debe haber exactamente UN filtro activo y el formulario debe ser válido
    return this.filtersForm.valid && activeFilters === 1;
  }

  /**
   * Limpiar formulario
   */
  clearFilters(): void {
    this.filtersForm.patchValue({
      marca: null,
      cd_proveedor: null,
      rubro: null,
      cod_iva: null
    });
    
    this.productosPreview = [];
    this.resetIndicadores();
  }

  /**
   * Obtener cantidad de filtros activos
   */
  getActiveFiltersCount(): number {
    const formValue = this.filtersForm.value;
    const filterFields = ['marca', 'cd_proveedor', 'rubro', 'cod_iva'];
    
    let activeFilters = 0;
    filterFields.forEach(field => {
      const value = formValue[field];
      if (value !== null && value !== undefined && value !== '') {
        activeFilters++;
      }
    });

    return activeFilters;
  }

  /**
   * Obtener lista de filtros activos
   */
  getActiveFilters(): string[] {
    const formValue = this.filtersForm.value;
    const filterFields = ['marca', 'cd_proveedor', 'rubro', 'cod_iva'];
    const fieldLabels: { [key: string]: string } = {
      'marca': 'Marca',
      'cd_proveedor': 'Proveedor',
      'rubro': 'Rubro', 
      'cod_iva': 'Tipo de IVA'
    };

    const activeFilters: string[] = [];
    filterFields.forEach(field => {
      const value = formValue[field];
      if (value !== null && value !== undefined && value !== '') {
        activeFilters.push(fieldLabels[field]);
      }
    });

    return activeFilters;
  }

  /**
   * Reset completo del formulario
   */
  resetForm(): void {
    this.filtersForm.reset({
      tipoModificacion: 'costo',
      porcentaje: 0
    });
    
    this.productosPreview = [];
    this.resetIndicadores();
  }

  /**
   * Reset de indicadores
   */
  private resetIndicadores(): void {
    this.indicadores = {
      totalRegistros: 0,
      impactoTotal: 0,
      variacionPromedio: 0,
      registrosPreview: 0
    };
  }

}