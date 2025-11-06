import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editarticulo',
  templateUrl: './editarticulo.component.html',
  styleUrls: ['./editarticulo.component.css']
})
export class EditarticuloComponent implements OnInit {
  public articuloForm!: FormGroup;
  public nomartFlag: boolean = false;
  public cd_barraFlag: boolean = false;
  public currentArticulo: any = null;
  public rubros: any;
  public marcas: any;
  public tiposIva: any;
  public proveedores: any;
  public tiposMoneda: any;
  public confLista: any;
  private id_articulo: number = 0;
  // Lista de campos editables e inmodificables
  private camposEditables = [
    'nomart', 'marca', 'cd_articulo', 'cod_deposito', 'rubro', 'cd_barra',
    // Las existencias (exi1-exi5) NO son editables, solo visualización
    'stkmin1', 'stkmin2', 'stkmin3', 'stkmin4', 'stkmin5',
    'stkmax1', 'stkmax2', 'stkmax3', 'stkmax4', 'stkmax5',
    'stkprep1', 'stkprep2', 'stkprep3', 'stkprep4', 'stkprep5',
    'estado', 'idart', 'cd_proveedor', 'articulo',
    // Campos de precios editables
    'precon', 'prefi1', 'prefi2', 'prefi3', 'prefi4',
    'cod_iva', 'prebsiva', 'precostosi', 'margen', 'descuento', 'tipo_moneda'
  ];
  
  // Variables para control de cálculos
  private calculando: boolean = false;
  private ivaAnterior: string = '';

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.route.queryParams.subscribe(params => {
      if (params['articulo']) {
        this.currentArticulo = JSON.parse(params['articulo']);
        this.id_articulo = this.currentArticulo.id_articulo;
        this.loadArticuloData();
      }
    });
    this.cargarRubros();
    this.cargarMarcas();
    this.cargarTiposIva();
    this.cargarProveedores();
    this.cargarTiposMoneda();
    this.cargarConfLista();
    this.setupFormListeners();
  }

  initForm(): void {
    this.articuloForm = this.fb.group({
      nomart: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(80)
      ])),
      marca: new FormControl('', Validators.required),
      cd_articulo: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,6}$/) // Patrón para aceptar hasta 6 dígitos numéricos
      ])),
      cod_deposito: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,2}$/) // Patrón para aceptar hasta 2 dígitos numéricos
      ])),
      // Habilitamos campos que estaban deshabilitados
      precon: new FormControl(0),
      prefi1: new FormControl(0),
      prefi2: new FormControl(0),
      prefi3: new FormControl(0),
      prefi4: new FormControl(0),
      exi1: new FormControl(0),
      exi2: new FormControl(0),
      exi3: new FormControl(0),
      exi4: new FormControl(0),
      exi5: new FormControl(0),
      stkmin1: new FormControl(0),
      stkmax1: new FormControl(0),
      stkprep1: new FormControl(0),
      stkmin2: new FormControl(0),
      stkmax2: new FormControl(0),
      stkprep2: new FormControl(0),
      stkmin3: new FormControl(0),
      stkmax3: new FormControl(0),
      stkprep3: new FormControl(0),
      stkmin4: new FormControl(0),
      stkmax4: new FormControl(0),
      stkprep4: new FormControl(0),
      stkmin5: new FormControl(0),
      stkmax5: new FormControl(0),
      stkprep5: new FormControl(0),
      cd_proveedor: new FormControl(''),
      cd_barra: new FormControl('', Validators.compose([
        Validators.maxLength(13)
      ])),
      idart: new FormControl(0),
      estado: new FormControl(''),
      rubro: new FormControl('', Validators.required),
      articulo: new FormControl(0),
      // Habilitamos campos adicionales
      cod_iva: new FormControl('', Validators.required),
      prebsiva: new FormControl(0),
      precostosi: new FormControl(0),
      margen: new FormControl(0),
      descuento: new FormControl(0),
      tipo_moneda: new FormControl(1)
    });
  }

  setupFormListeners(): void {
    // Monitorear validación
    this.articuloForm.get('nomart')?.valueChanges.subscribe(() => {
      this.nomartFlag = this.articuloForm.controls['nomart'].invalid;
    });
    
    this.articuloForm.get('cd_barra')?.valueChanges.subscribe(() => {
      this.cd_barraFlag = this.articuloForm.controls['cd_barra'].invalid;
    });

    // Monitorear cambios en margen y descuento para actualizar precio final
    this.articuloForm.get('margen')?.valueChanges.subscribe((value) => {
      // No verificamos calculando aquí para forzar el cálculo
      console.log('Valor de margen cambiado a:', value, 'forzando recálculo completo...');
      // Guardamos temporalmente el estado actual de calculando
      const calculandoTemp = this.calculando;
      // Forzamos calculando a false para permitir el cálculo
      this.calculando = false;
      // Calculamos el precio base, que a su vez calculará el precio final
      this.calcularPrecioBase();
      // Restauramos el estado previo de calculando
      this.calculando = calculandoTemp;
    });
    
    this.articuloForm.get('descuento')?.valueChanges.subscribe((value) => {
      // No verificamos calculando aquí para forzar el cálculo
      console.log('Valor de descuento cambiado a:', value, 'forzando recálculo completo...');
      // Guardamos temporalmente el estado actual de calculando
      const calculandoTemp = this.calculando;
      // Forzamos calculando a false para permitir el cálculo
      this.calculando = false;
      // Calculamos el precio base, que a su vez calculará el precio final
      this.calcularPrecioBase();
      // Restauramos el estado previo de calculando
      this.calculando = calculandoTemp;
    });
    
    // Monitorear cambios en precio costo sin IVA
    this.articuloForm.get('precostosi')?.valueChanges.subscribe(() => {
      if (!this.calculando) {
        console.log('Valor de precio costo cambiado, recalculando precios...');
        this.calcularDesdePrecoSinIva();
      }
    });
    
    // Monitorear cambios en el precio base sin IVA
    this.articuloForm.get('prebsiva')?.valueChanges.subscribe(() => {
      if (!this.calculando) {
        console.log('Valor de precio base cambiado, recalculando precios...');
        this.calcularPrecioFinal();
      }
    });
    
    // Monitorear cambios en precio final
    this.articuloForm.get('precon')?.valueChanges.subscribe(() => {
      if (!this.calculando) {
        console.log('Valor de precio final cambiado, recalculando precios...');
        this.calcularPreciosSinIva();
      }
    });
    
    // Monitorear cambios en IVA
    this.articuloForm.get('cod_iva')?.valueChanges.subscribe(() => {
      if (!this.calculando) {
        console.log('Valor de IVA cambiado, actualizando precios...');
        this.manejarCambioIva();
      }
    });

    // Monitorear tipo de moneda
    this.articuloForm.get('tipo_moneda')?.valueChanges.subscribe(() => {
      if (!this.calculando) {
        console.log('Tipo de moneda cambiado, recalculando precios de lista...');
        // Solo recalcular los precios de lista ya que la moneda no afecta los otros cálculos
        this.calcularPreciosLista();
      }
    });

    // Monitorear cambios en idart para habilitar/deshabilitar campos de precios lista
    this.articuloForm.get('idart')?.valueChanges.subscribe(value => {
      console.log('Modo precios manual:', value === 1 ? 'Activado' : 'Desactivado');
    });
  }

  cargarRubros() {
    this.cargardata.getRubro().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.rubros = response.mensaje;
        } else {
          console.error('Error loading rubros:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarMarcas() {
    this.cargardata.getMarca().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.marcas = response.mensaje;
        } else {
          console.error('Error loading marcas:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarTiposIva() {
    this.cargardata.getArtIva().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposIva = response.mensaje;
          console.log('Tipos de IVA cargados:', this.tiposIva);
          
          // Después de cargar los tipos de IVA, forzar el cálculo completo si ya se cargó el artículo
          if (this.currentArticulo) {
            setTimeout(() => {
              this.forzarCalculosCompletos();
            }, 300);
          }
        } else {
          console.error('Error loading tipos IVA:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarProveedores() {
    this.cargardata.getProveedor().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.proveedores = response.mensaje;
        } else {
          console.error('Error loading proveedores:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarTiposMoneda() {
    this.cargardata.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
        } else {
          console.error('Error loading tipos moneda:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarConfLista() {
    this.cargardata.getConflista().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.confLista = response.mensaje;
          console.log('Configuración de listas cargada:', this.confLista);
        } else {
          console.error('Error loading conf_lista:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  loadArticuloData(): void {
    this.route.queryParams.subscribe(params => {
      if (params['articulo']) {
        try {
          const articuloData = JSON.parse(params['articulo']);
          console.log('Articulo data:', articuloData);
          this.id_articulo = articuloData.id_articulo;
          this.currentArticulo = articuloData;
          
          // Verificar el valor de idart
          console.log('Valor original de idart:', this.currentArticulo.idart, 'Tipo:', typeof this.currentArticulo.idart);
          
          // Asegurarnos que idart sea un número (0 o 1)
          // Cualquier valor que no sea exactamente 1 se normaliza a 0
          let idartValue = 0;
          if (this.currentArticulo.idart === 1 || this.currentArticulo.idart === '1') {
            idartValue = 1;
          } else {
            // Si el valor no es 0 o 1, lo normalizamos a 0 (modo automático)
            console.log('Valor de idart diferente de 0 o 1 detectado, normalizando a 0');
          }
          console.log('Valor normalizado de idart:', idartValue);
          
          // Crear un objeto con todos los valores del artículo para patchValue
          const formValues: any = {
            nomart: this.currentArticulo.nomart ? this.currentArticulo.nomart.trim() : '',
            marca: this.currentArticulo.marca.trim(),
            cd_articulo: this.currentArticulo.cd_articulo,
            cod_deposito: this.currentArticulo.cod_deposito,
            precon: this.currentArticulo.precon,
            prefi1: this.currentArticulo.prefi1,
            prefi2: this.currentArticulo.prefi2,
            prefi3: this.currentArticulo.prefi3,
            prefi4: this.currentArticulo.prefi4,
            exi1: this.currentArticulo.exi1,
            exi2: this.currentArticulo.exi2,
            exi3: this.currentArticulo.exi3,
            exi4: this.currentArticulo.exi4,
            exi5: this.currentArticulo.exi5,
            stkmin1: this.currentArticulo.stkmin1,
            stkmax1: this.currentArticulo.stkmax1,
            stkprep1: this.currentArticulo.stkprep1,
            stkmin2: this.currentArticulo.stkmin2,
            stkmax2: this.currentArticulo.stkmax2,
            stkprep2: this.currentArticulo.stkprep2,
            stkmin3: this.currentArticulo.stkmin3,
            stkmax3: this.currentArticulo.stkmax3,
            stkprep3: this.currentArticulo.stkprep3,
            stkmin4: this.currentArticulo.stkmin4,
            stkmax4: this.currentArticulo.stkmax4,
            stkprep4: this.currentArticulo.stkprep4,
            stkmin5: this.currentArticulo.stkmin5,
            stkmax5: this.currentArticulo.stkmax5,
            stkprep5: this.currentArticulo.stkprep5,
            cd_proveedor: this.currentArticulo.cd_proveedor,
            cd_barra: this.currentArticulo.cd_barra ? this.currentArticulo.cd_barra.trim() : '',
            idart: idartValue,
            estado: this.currentArticulo.estado ? this.currentArticulo.estado.trim() : '',
            rubro: this.currentArticulo.rubro ? this.currentArticulo.rubro.trim() : '',
            articulo: this.currentArticulo.articulo,
            cod_iva: this.currentArticulo.cod_iva,
            prebsiva: this.currentArticulo.prebsiva,
            precostosi: this.currentArticulo.precostosi,
            margen: this.currentArticulo.margen,
            descuento: this.currentArticulo.descuento,
            tipo_moneda: this.currentArticulo.tipo_moneda
          };

          // Guardar el valor de IVA para cálculos posteriores
          this.ivaAnterior = this.currentArticulo.cod_iva;
          
          console.log('Valores iniciales cargados:', formValues);
          console.log('IVA cargado:', this.currentArticulo.cod_iva);
          console.log('Valor de idart en el formulario:', idartValue);

          // Actualizar el formulario con los valores
          this.articuloForm.patchValue(formValues);
          
          // Verificar que el valor se haya asignado correctamente
          setTimeout(() => {
            console.log('Valor actual de idart en el formulario después de patchValue:', 
              this.articuloForm.get('idart')?.value);
          }, 0);
          
          // Verificar si hay datos de IVA cargados
          if (this.tiposIva && this.tiposIva.length > 0) {
            // Si los tipos de IVA ya están cargados, proceder con el cálculo
            setTimeout(() => {
              this.forzarCalculosCompletos();
            }, 500);
          } else {
            console.log('Tipos de IVA aún no disponibles, el cálculo se realizará cuando estén cargados');
          }
        } catch (error) {
          console.error('Error parsing articulo data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información del artículo',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.articuloForm.valid) {
      // Obtener valores actuales del formulario (solo los editables)
      let formValues = this.articuloForm.getRawValue();
      
      // Crear objeto de datos a enviar al servidor
      // Incluir solo campos editables y conservar los valores originales para los no editables
      const articuloData: any = { id_articulo: this.id_articulo };
      
      // Añadir campos editables desde el formulario
      this.camposEditables.forEach(campo => {
        articuloData[campo] = formValues[campo];
      });
      
      // Añadir campos no editables desde el objeto original
      Object.keys(this.currentArticulo).forEach(key => {
        if (!this.camposEditables.includes(key) && key !== 'id_articulo') {
          articuloData[key] = this.currentArticulo[key];
        }
      });

      this.subirdata.updateArticulo(articuloData).subscribe({
        next: (response: any) => {
          Swal.fire({
            title: 'Actualizando...',
            timer: 300,
            didOpen: () => {
              Swal.showLoading();
            }
          }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
              Swal.fire({
                title: '¡Éxito!',
                text: 'El artículo se actualizó correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              this.router.navigate(['components/articulo']);
            }
          });
        },
        error: (error) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el artículo',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          console.error('Error updating articulo:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.articuloForm);
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos inválidos o vacíos',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['components/articulo']);
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // IMPLEMENTACIÓN DE LÓGICA DE CÁLCULO BIDIRECCIONAL
  
  calcularPreciosSinIva() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      // Limitar a cuatro decimales todos los valores de entrada
      const precon = Math.round(parseFloat(this.articuloForm.get('precon')?.value || 0) * 10000) / 10000;
      const codIva = this.articuloForm.get('cod_iva')?.value;
      const margenPorcentaje = Math.round(parseFloat(this.articuloForm.get('margen')?.value || 0) * 10000) / 10000;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 10000) / 10000;
      
      console.log('CALCULAR DESDE PRECIO FINAL: ', precon, '| Código IVA:', codIva);
      console.log('Descuento:', descuentoPorcentaje, '% | Margen:', margenPorcentaje, '%');
      
      // Verificar si el precio final es 0
      if (precon <= 0) {
        this.articuloForm.get('prebsiva')?.setValue(0, {emitEvent: false});
        this.articuloForm.get('precostosi')?.setValue(0, {emitEvent: false});
        this.calcularPreciosLista();
        return;
      }
      
      // Obtener el porcentaje de IVA
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      console.log('Porcentaje de IVA obtenido:', porcentajeIva, '%');
      
      // Calcular precio base sin IVA
      let precioBase = precon;
      if (porcentajeIva > 0) {
        precioBase = precon / (1 + (porcentajeIva / 100));
        precioBase = Math.round(precioBase * 10000) / 10000; // Redondear a 4 decimales
        console.log('Cálculo del precio base: ', precon, ' / (1 + (', porcentajeIva, '/ 100)) = ', precioBase);
      }
      
      console.log('Precio base sin IVA calculado:', precioBase);
      this.articuloForm.get('prebsiva')?.setValue(precioBase, {emitEvent: false});
      
      // Calcular precio costo sin IVA
      if (margenPorcentaje > 0) {
        // Revertir el margen: precio sin margen = precio base / (1 + margen/100)
        const precioSinMargen = precioBase / (1 + (margenPorcentaje / 100));
        console.log('Precio sin margen aplicado:', precioSinMargen);
        
        // Si hay descuento, revertirlo también
        if (descuentoPorcentaje > 0 && descuentoPorcentaje < 100) {
          // Revertir el descuento: precio original = precio con descuento / (1 - descuento/100)
          const precioSinIva = precioSinMargen / (1 - (descuentoPorcentaje / 100));
          console.log('Precio costo calculado (con descuento revertido):', precioSinIva);
          this.articuloForm.get('precostosi')?.setValue(Math.round(precioSinIva * 10000) / 10000, {emitEvent: false});
        } else {
          console.log('Precio costo calculado (sin descuento):', precioSinMargen);
          this.articuloForm.get('precostosi')?.setValue(Math.round(precioSinMargen * 10000) / 10000, {emitEvent: false});
        }
      } else {
        // Si no hay margen, solo revertimos el descuento si existe
        if (descuentoPorcentaje > 0 && descuentoPorcentaje < 100) {
          const precioSinIva = precioBase / (1 - (descuentoPorcentaje / 100));
          console.log('Precio costo calculado (solo descuento revertido):', precioSinIva);
          this.articuloForm.get('precostosi')?.setValue(Math.round(precioSinIva * 10000) / 10000, {emitEvent: false});
        } else {
          // Si no hay margen ni descuento, el precio base es igual al precio costo
          console.log('Precio costo = precio base (sin margen ni descuento):', precioBase);
          this.articuloForm.get('precostosi')?.setValue(precioBase, {emitEvent: false});
        }
      }
      
      // Calcular precios de lista
      this.calcularPreciosLista();
    } finally {
      this.calculando = false;
    }
  }
  
  calcularDesdePrecoSinIva() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      // Limitar a cuatro decimales todos los valores de entrada
      const precioSinIva = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 10000) / 10000;
      const codIva = this.articuloForm.get('cod_iva')?.value;
      const margenPorcentaje = Math.round(parseFloat(this.articuloForm.get('margen')?.value || 0) * 10000) / 10000;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 10000) / 10000;
      
      console.log('CALCULAR DESDE PRECIO COSTO: ', precioSinIva, '| Código IVA:', codIva);
      console.log('Descuento:', descuentoPorcentaje, '% | Margen:', margenPorcentaje, '%');
      
      // Verificar si el precio costo es 0
      if (precioSinIva <= 0) {
        this.articuloForm.get('prebsiva')?.setValue(0, {emitEvent: false});
        this.articuloForm.get('precon')?.setValue(0, {emitEvent: false});
        this.calcularPreciosLista();
        return;
      }
      
      // Obtener el porcentaje de IVA
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      console.log('Porcentaje de IVA obtenido:', porcentajeIva, '%');
      
      // Aplicar descuento al precio costo
      let precioConDescuento = precioSinIva;
      if (descuentoPorcentaje > 0) {
        precioConDescuento = precioSinIva * (1 - (descuentoPorcentaje / 100));
        precioConDescuento = Math.round(precioConDescuento * 10000) / 10000;
        console.log('Precio con descuento aplicado:', precioConDescuento);
      }
      
      // Aplicar margen al precio con descuento
      let precioBase = precioConDescuento;
      if (margenPorcentaje > 0) {
        precioBase = precioConDescuento * (1 + (margenPorcentaje / 100));
        precioBase = Math.round(precioBase * 10000) / 10000;
        console.log('Precio base con margen aplicado:', precioBase);
      }
      
      console.log('Precio base sin IVA calculado:', precioBase);
      this.articuloForm.get('prebsiva')?.setValue(precioBase, {emitEvent: false});
      
      // Aplicar IVA para obtener el precio final
      let precioFinal = precioBase;
      if (porcentajeIva > 0) {
        precioFinal = precioBase * (1 + (porcentajeIva / 100));
        precioFinal = Math.round(precioFinal * 10000) / 10000;
        console.log('Cálculo del precio final: ', precioBase, ' * (1 + (', porcentajeIva, '/ 100)) = ', precioFinal);
      } else {
        console.log('No se aplicó IVA porque el porcentaje es 0 o negativo');
      }
      
      console.log('Precio final calculado:', precioFinal);
      this.articuloForm.get('precon')?.setValue(precioFinal, {emitEvent: false});
      
      // Calcular precios de lista
      this.calcularPreciosLista();
    } finally {
      this.calculando = false;
    }
  }
  
  calcularMargen() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      const precioBase = Math.round(parseFloat(this.articuloForm.get('prebsiva')?.value || 0) * 10000) / 10000;
      const precioSinIva = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 10000) / 10000;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 10000) / 10000;
      
      console.log('CALCULAR MARGEN | Precio Base:', precioBase, '| Precio Costo:', precioSinIva);
      
      // Verificar si los precios son 0 para evitar divisiones por cero
      if (precioBase <= 0 || precioSinIva <= 0) {
        this.articuloForm.get('margen')?.setValue(0, {emitEvent: false});
        return;
      }
      
      // Aplicar descuento al precio costo
      let precioNeto = precioSinIva;
      if (descuentoPorcentaje > 0) {
        precioNeto = precioSinIva * (1 - (descuentoPorcentaje / 100));
      }
      
      // Margen = ((Precio Base - Precio Neto) / Precio Neto) * 100
      const margenCalculado = ((precioBase - precioNeto) / precioNeto) * 100;
      
      console.log('Margen calculado:', margenCalculado);
      this.articuloForm.get('margen')?.setValue(Math.round(margenCalculado * 10000) / 10000, {emitEvent: false});
      
      // Recalcular precio final
      this.calcularPrecioFinal();
    } finally {
      this.calculando = false;
    }
  }
  
  calcularPrecioBase() {
    console.log('Iniciando calcularPrecioBase...');
    // No usamos la bandera calculando para este método crítico
    // Esto asegura que siempre se ejecute aunque estemos en medio de otro cálculo
    
    try {
      const precioSinIva = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 10000) / 10000;
      const margenPorcentaje = Math.round(parseFloat(this.articuloForm.get('margen')?.value || 0) * 10000) / 10000;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 10000) / 10000;
      
      console.log('CALCULAR PRECIO BASE | Precio Costo:', precioSinIva);
      console.log('Margen:', margenPorcentaje, '% | Descuento:', descuentoPorcentaje, '%');
      
      // Verificar si el precio costo es 0
      if (precioSinIva <= 0) {
        console.log('Precio costo es 0 o negativo, estableciendo precios a 0');
        this.articuloForm.get('prebsiva')?.setValue(0, {emitEvent: false});
        this.articuloForm.get('precon')?.setValue(0, {emitEvent: false});
        this.calcularPreciosLista();
        return;
      }
      
      // Aplicar descuento al precio costo
      let precioConDescuento = precioSinIva;
      if (descuentoPorcentaje > 0) {
        precioConDescuento = precioSinIva * (1 - (descuentoPorcentaje / 100));
        precioConDescuento = Math.round(precioConDescuento * 10000) / 10000;
        console.log('Precio con descuento aplicado:', precioConDescuento);
      }
      
      // Aplicar margen al precio con descuento
      let precioBase = precioConDescuento;
      if (margenPorcentaje > 0) {
        precioBase = precioConDescuento * (1 + (margenPorcentaje / 100));
        precioBase = Math.round(precioBase * 10000) / 10000;
        console.log('Precio base con margen aplicado:', precioBase);
      }
      
      console.log('Precio base calculado final:', precioBase);
      this.articuloForm.get('prebsiva')?.setValue(precioBase, {emitEvent: false});
      
      // Ahora calculamos el precio final directamente aquí en lugar de llamar a otro método
      // Esto asegura que el cálculo completo se realiza sin interrupciones
      const codIva = this.articuloForm.get('cod_iva')?.value;
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      
      console.log('Aplicando IVA al precio base. Porcentaje:', porcentajeIva, '%');
      
      // Aplicar IVA para obtener el precio final
      let precioFinal = precioBase;
      if (porcentajeIva > 0) {
        precioFinal = precioBase * (1 + (porcentajeIva / 100));
        precioFinal = Math.round(precioFinal * 10000) / 10000;
        console.log('Cálculo del precio final: ', precioBase, ' * (1 + (', porcentajeIva, '/ 100)) = ', precioFinal);
      }
      
      console.log('Precio final calculado:', precioFinal);
      this.articuloForm.get('precon')?.setValue(precioFinal, {emitEvent: false});
      
      // Calcular precios de lista directamente
      this.calcularPreciosLista();
      
      console.log('Cálculo completo finalizado con éxito');
    } catch (error) {
      console.error('Error en calcularPrecioBase:', error);
    }
  }
  
  calcularPrecioFinal() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      const precioBase = Math.round(parseFloat(this.articuloForm.get('prebsiva')?.value || 0) * 10000) / 10000;
      const codIva = this.articuloForm.get('cod_iva')?.value;
      
      console.log('CALCULAR PRECIO FINAL | Precio Base:', precioBase, '| Código IVA:', codIva);
      
      // Verificar si el precio base es 0
      if (precioBase <= 0) {
        this.articuloForm.get('precon')?.setValue(0, {emitEvent: false});
        this.calcularPreciosLista();
        return;
      }
      
      // Obtener el porcentaje de IVA
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      console.log('Porcentaje de IVA obtenido:', porcentajeIva);
      
      // Aplicar IVA para obtener el precio final
      let precioFinal = precioBase;
      if (porcentajeIva > 0) {
        precioFinal = precioBase * (1 + (porcentajeIva / 100));
        console.log('Cálculo: ', precioBase, ' * (1 + (', porcentajeIva, '/ 100)) = ', precioFinal);
      } else {
        console.log('No se aplicó IVA porque el porcentaje es 0 o negativo');
      }
      
      console.log('Precio final calculado:', precioFinal);
      this.articuloForm.get('precon')?.setValue(Math.round(precioFinal * 10000) / 10000, {emitEvent: false});
      
      // Calcular precios de lista
      this.calcularPreciosLista();
    } finally {
      this.calculando = false;
    }
  }
  
  manejarCambioIva() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      console.log('===== CAMBIO DE IVA DETECTADO =====');
      const codIva = this.articuloForm.get('cod_iva')?.value;
      const codIvaAnterior = this.ivaAnterior;
      
      console.log('Código IVA anterior:', codIvaAnterior);
      console.log('Nuevo código de IVA:', codIva);
      
      if (codIva === codIvaAnterior) {
        console.log('El código de IVA no cambió realmente, no hay recálculo necesario');
        return;
      }
      
      // Guardar el nuevo valor como anterior para futuras comparaciones
      this.ivaAnterior = codIva;
      
      // Obtener el precio base actual
      const precioBase = Math.round(parseFloat(this.articuloForm.get('prebsiva')?.value || 0) * 10000) / 10000;
      console.log('Precio base actual para recálculo:', precioBase);
      
      if (precioBase <= 0) {
        console.log('No hay precio base para recalcular, abortando');
        return;
      }
      
      // Obtener el porcentaje de IVA
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      console.log('Nuevo porcentaje de IVA a aplicar:', porcentajeIva + '%');
      
      // Calcular el nuevo precio final con el nuevo IVA
      const precioFinal = Math.round(precioBase * (1 + (porcentajeIva / 100)) * 10000) / 10000;
      console.log('Recalculando precio final:', precioBase, '* (1 + ', porcentajeIva, '/100) =', precioFinal);
      
      // Actualizar el precio final en el formulario
      this.articuloForm.get('precon')?.setValue(precioFinal, {emitEvent: false});
      console.log('Precio final actualizado a:', precioFinal);
      
      // Recalcular los precios de lista
      this.calcularPreciosLista();
    } finally {
      this.calculando = false;
    }
  }
  
  private obtenerPorcentajeIva(codIva: string): number {
    if (!codIva) return 0;
    
    // Obtener el porcentaje de IVA según el código seleccionado
    // Buscamos en los tipos de IVA cargados
    if (!this.tiposIva || this.tiposIva.length === 0) {
      console.log('No hay tipos de IVA disponibles');
      return 0;
    }
    
    const tipoIva = this.tiposIva.find((iva: any) => iva.cod_iva === codIva);
    if (tipoIva) {
      // Algunos tipos de IVA comunes
      if (tipoIva.descripcion.includes('21')) return 21;
      if (tipoIva.descripcion.includes('10.5')) return 10.5;
      if (tipoIva.descripcion.toLowerCase().includes('exento')) return 0;
      
      // Para cualquier otro caso, intentar extraer un número de la descripción
      const match = tipoIva.descripcion.match(/(\d+(\.\d+)?)/);
      if (match) {
        return parseFloat(match[0]);
      }
    }
    
    console.log(`No se pudo determinar el porcentaje para el código de IVA: ${codIva}`);
    return 0;
  }
  
  forzarCalculosCompletos(): void {
    console.log('Forzando cálculos completos con datos actuales:');
    console.log('Precio Costo:', this.articuloForm.get('precostosi')?.value);
    console.log('Descuento:', this.articuloForm.get('descuento')?.value);
    console.log('Margen:', this.articuloForm.get('margen')?.value);
    console.log('Código IVA:', this.articuloForm.get('cod_iva')?.value);
    
    // Verificar si tenemos IVA cargado
    if (this.tiposIva && this.tiposIva.length > 0) {
      const codIva = this.articuloForm.get('cod_iva')?.value;
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      console.log('IVA a aplicar:', porcentajeIva + '%');
    } else {
      console.warn('No hay tipos de IVA cargados aún');
    }
    
    // Si hay un precio costo, calcular todo desde allí
    const precostosi = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 10000) / 10000;
    if (precostosi > 0) {
      console.log('Forzando cálculos completos desde precio costo');
      this.calcularDesdePrecoSinIva();
    } else {
      // Si no hay precio costo pero hay precio final, calcular desde el precio final
      const precon = Math.round(parseFloat(this.articuloForm.get('precon')?.value || 0) * 10000) / 10000;
      if (precon > 0) {
        console.log('Forzando cálculos completos desde precio final');
        this.calcularPreciosSinIva();
      }
    }
  }
  
  calcularPreciosLista(): void {
    // Si idart es 1, los precios son manuales y no se calculan
    const idartValue = this.articuloForm.get('idart')?.value;
    if (idartValue === 1) {
      console.log('Precios lista manual activado: no se calculan precios automáticamente');
      return;
    }
    
    if (!this.confLista || this.confLista.length === 0) {
      console.log('confLista no disponible, usando cálculo fijo alternativo');
      // Usar cálculo fijo como fallback
      const precon = Math.round(parseFloat(this.articuloForm.get('precon')?.value || 0) * 10000) / 10000;
      
      if (precon <= 0) {
        this.articuloForm.get('prefi1')?.setValue(0, {emitEvent: false});
        this.articuloForm.get('prefi2')?.setValue(0, {emitEvent: false});
        this.articuloForm.get('prefi3')?.setValue(0, {emitEvent: false});
        this.articuloForm.get('prefi4')?.setValue(0, {emitEvent: false});
        return;
      }
      
      // Cálculo alternativo (sin confLista)
      this.articuloForm.get('prefi1')?.setValue(precon * 1.05, {emitEvent: false});
      this.articuloForm.get('prefi2')?.setValue(precon * 1.10, {emitEvent: false});
      this.articuloForm.get('prefi3')?.setValue(precon * 1.15, {emitEvent: false});
      this.articuloForm.get('prefi4')?.setValue(precon * 1.20, {emitEvent: false});
      return;
    }
    
    const precon = parseFloat(this.articuloForm.get('precon')?.value || 0);
    const codIva = this.articuloForm.get('cod_iva')?.value;
    const tipoMoneda = parseInt(this.articuloForm.get('tipo_moneda')?.value) || 1;
    
    if (precon <= 0) {
      console.log('Precio final es 0 o negativo, no se calculan precios de lista');
      this.articuloForm.get('prefi1')?.setValue(0, {emitEvent: false});
      this.articuloForm.get('prefi2')?.setValue(0, {emitEvent: false});
      this.articuloForm.get('prefi3')?.setValue(0, {emitEvent: false});
      this.articuloForm.get('prefi4')?.setValue(0, {emitEvent: false});
      return;
    }
    
    // Verificar primero si es IVA EXENTO (código 5)
    let esExento = (codIva === '5');
    
    // Obtener el porcentaje de IVA
    const porcentajeIva = this.obtenerPorcentajeIva(codIva);
    console.log('calcularPreciosLista - Porcentaje IVA:', porcentajeIva);
    console.log('calcularPreciosLista - Tipo de Moneda:', tipoMoneda);
    
    // Si el porcentaje es 0, podría ser EXENTO
    if (porcentajeIva <= 0.01) {
      esExento = true;
      console.log('Tratando como EXENTO para cálculos de lista');
    }
    
    // Determinar qué columna de porcentaje usar según el IVA
    // Si es EXENTO se usa la columna para IVA 10.5%
    const usarPreciof21 = !esExento && (porcentajeIva === 21);
    console.log('Usando precios para IVA 21%:', usarPreciof21);
    
    // Buscar registros para cada lista considerando también el tipo de moneda
    const lista1 = this.confLista.find((item: any) => 
      parseInt(item.listap) === 1 && parseInt(item.tipomone) === tipoMoneda
    );
    const lista2 = this.confLista.find((item: any) => 
      parseInt(item.listap) === 2 && parseInt(item.tipomone) === tipoMoneda
    );
    const lista3 = this.confLista.find((item: any) => 
      parseInt(item.listap) === 3 && parseInt(item.tipomone) === tipoMoneda
    );
    const lista4 = this.confLista.find((item: any) => 
      parseInt(item.listap) === 4 && parseInt(item.tipomone) === tipoMoneda
    );
    
    console.log('Precio final para cálculos:', precon);
    console.log('Configuraciones encontradas según moneda:', 
      { lista1: !!lista1, lista2: !!lista2, lista3: !!lista3, lista4: !!lista4 });
    
    // Calcular prefi1
    if (lista1) {
      const porcentaje = usarPreciof21 ? 
                          parseFloat(lista1.preciof21) : 
                          parseFloat(lista1.preciof105);
      const valorPrefi1 = precon + (precon * porcentaje / 100);
      this.articuloForm.get('prefi1')?.setValue(Math.round(valorPrefi1 * 10000) / 10000, {emitEvent: false});
      console.log(`Lista 1: Porcentaje=${porcentaje}%, Precio=${valorPrefi1.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 1 con la moneda seleccionada');
      this.articuloForm.get('prefi1')?.setValue(0, {emitEvent: false});
    }
    
    // Calcular prefi2
    if (lista2) {
      const porcentaje = usarPreciof21 ? 
                          parseFloat(lista2.preciof21) : 
                          parseFloat(lista2.preciof105);
      const valorPrefi2 = precon + (precon * porcentaje / 100);
      this.articuloForm.get('prefi2')?.setValue(Math.round(valorPrefi2 * 10000) / 10000, {emitEvent: false});
      console.log(`Lista 2: Porcentaje=${porcentaje}%, Precio=${valorPrefi2.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 2 con la moneda seleccionada');
      this.articuloForm.get('prefi2')?.setValue(0, {emitEvent: false});
    }
    
    // Calcular prefi3
    if (lista3) {
      const porcentaje = usarPreciof21 ? 
                          parseFloat(lista3.preciof21) : 
                          parseFloat(lista3.preciof105);
      const valorPrefi3 = precon + (precon * porcentaje / 100);
      this.articuloForm.get('prefi3')?.setValue(Math.round(valorPrefi3 * 10000) / 10000, {emitEvent: false});
      console.log(`Lista 3: Porcentaje=${porcentaje}%, Precio=${valorPrefi3.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 3 con la moneda seleccionada');
      this.articuloForm.get('prefi3')?.setValue(0, {emitEvent: false});
    }
    
    // Calcular prefi4
    if (lista4) {
      const porcentaje = usarPreciof21 ? 
                          parseFloat(lista4.preciof21) : 
                          parseFloat(lista4.preciof105);
      const valorPrefi4 = precon + (precon * porcentaje / 100);
      this.articuloForm.get('prefi4')?.setValue(Math.round(valorPrefi4 * 10000) / 10000, {emitEvent: false});
      console.log(`Lista 4: Porcentaje=${porcentaje}%, Precio=${valorPrefi4.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 4 con la moneda seleccionada');
      this.articuloForm.get('prefi4')?.setValue(0, {emitEvent: false});
    }
  }

  // Método para manejar el cambio en el checkbox de precios manuales
  manejarCambioManual(isChecked: boolean): void {
    console.log('Precios lista manual:', isChecked ? 'Activado' : 'Desactivado');
    
    // Actualizar el valor de idart según el estado del checkbox
    this.articuloForm.get('idart')?.setValue(isChecked ? 1 : 0);
    
    if (isChecked) {
      // Si se activa el modo manual, mantener los valores actuales para edición manual
      console.log('Modo manual activado: se mantendrán los valores actuales para edición');
    } else {
      // Si se desactiva el modo manual, recalcular los precios automáticamente
      console.log('Modo manual desactivado: recalculando precios automáticamente');
      this.calcularPreciosLista();
    }
  }
}
