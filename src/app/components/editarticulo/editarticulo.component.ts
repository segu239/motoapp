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
  private id_articulo: number = 0;
  // Lista de campos editables e inmodificables
  private camposEditables = [
    'nomart', 'marca', 'cd_articulo', 'cod_deposito', 'rubro', 'cd_barra',
    'exi1', 'exi2', 'exi3', 'exi4', 'exi5',
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
    this.cargarRubros();
    this.cargarMarcas();
    this.cargarTiposIva();
    this.cargarProveedores();
    this.cargarTiposMoneda();
    this.loadArticuloData();
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

  loadArticuloData(): void {
    this.route.queryParams.subscribe(params => {
      if (params['articulo']) {
        try {
          const articuloData = JSON.parse(params['articulo']);
          console.log('Articulo data:', articuloData);
          this.id_articulo = articuloData.id_articulo;
          this.currentArticulo = articuloData;
          
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
            idart: this.currentArticulo.idart,
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

          // Actualizar el formulario con los valores
          this.articuloForm.patchValue(formValues, {emitEvent: false});
          
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
      // Limitar a dos decimales todos los valores de entrada
      const precon = Math.round(parseFloat(this.articuloForm.get('precon')?.value || 0) * 100) / 100;
      const codIva = this.articuloForm.get('cod_iva')?.value;
      const margenPorcentaje = Math.round(parseFloat(this.articuloForm.get('margen')?.value || 0) * 100) / 100;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 100) / 100;
      
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
        precioBase = Math.round(precioBase * 100) / 100; // Redondear a 2 decimales
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
          this.articuloForm.get('precostosi')?.setValue(Math.round(precioSinIva * 100) / 100, {emitEvent: false});
        } else {
          console.log('Precio costo calculado (sin descuento):', precioSinMargen);
          this.articuloForm.get('precostosi')?.setValue(Math.round(precioSinMargen * 100) / 100, {emitEvent: false});
        }
      } else {
        // Si no hay margen, solo revertimos el descuento si existe
        if (descuentoPorcentaje > 0 && descuentoPorcentaje < 100) {
          const precioSinIva = precioBase / (1 - (descuentoPorcentaje / 100));
          console.log('Precio costo calculado (solo descuento revertido):', precioSinIva);
          this.articuloForm.get('precostosi')?.setValue(Math.round(precioSinIva * 100) / 100, {emitEvent: false});
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
      // Limitar a dos decimales todos los valores de entrada
      const precioSinIva = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 100) / 100;
      const codIva = this.articuloForm.get('cod_iva')?.value;
      const margenPorcentaje = Math.round(parseFloat(this.articuloForm.get('margen')?.value || 0) * 100) / 100;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 100) / 100;
      
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
        precioConDescuento = Math.round(precioConDescuento * 100) / 100;
        console.log('Precio con descuento aplicado:', precioConDescuento);
      }
      
      // Aplicar margen al precio con descuento
      let precioBase = precioConDescuento;
      if (margenPorcentaje > 0) {
        precioBase = precioConDescuento * (1 + (margenPorcentaje / 100));
        precioBase = Math.round(precioBase * 100) / 100;
        console.log('Precio base con margen aplicado:', precioBase);
      }
      
      console.log('Precio base sin IVA calculado:', precioBase);
      this.articuloForm.get('prebsiva')?.setValue(precioBase, {emitEvent: false});
      
      // Aplicar IVA para obtener el precio final
      let precioFinal = precioBase;
      if (porcentajeIva > 0) {
        precioFinal = precioBase * (1 + (porcentajeIva / 100));
        precioFinal = Math.round(precioFinal * 100) / 100;
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
      const precioBase = Math.round(parseFloat(this.articuloForm.get('prebsiva')?.value || 0) * 100) / 100;
      const precioSinIva = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 100) / 100;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 100) / 100;
      
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
      this.articuloForm.get('margen')?.setValue(Math.round(margenCalculado * 100) / 100, {emitEvent: false});
      
      // Recalcular precio final
      this.calcularPrecioFinal();
    } finally {
      this.calculando = false;
    }
  }
  
  calcularPrecioBase() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      const precioSinIva = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 100) / 100;
      const margenPorcentaje = Math.round(parseFloat(this.articuloForm.get('margen')?.value || 0) * 100) / 100;
      const descuentoPorcentaje = Math.round(parseFloat(this.articuloForm.get('descuento')?.value || 0) * 100) / 100;
      
      console.log('CALCULAR PRECIO BASE | Precio Costo:', precioSinIva);
      
      // Verificar si el precio costo es 0
      if (precioSinIva <= 0) {
        this.articuloForm.get('prebsiva')?.setValue(0, {emitEvent: false});
        this.articuloForm.get('precon')?.setValue(0, {emitEvent: false});
        this.calcularPreciosLista();
        return;
      }
      
      // Aplicar descuento al precio costo
      let precioConDescuento = precioSinIva;
      if (descuentoPorcentaje > 0) {
        precioConDescuento = precioSinIva * (1 - (descuentoPorcentaje / 100));
      }
      
      // Aplicar margen al precio con descuento
      let precioBase = precioConDescuento;
      if (margenPorcentaje > 0) {
        precioBase = precioConDescuento * (1 + (margenPorcentaje / 100));
      }
      
      console.log('Precio base calculado:', precioBase);
      this.articuloForm.get('prebsiva')?.setValue(Math.round(precioBase * 100) / 100, {emitEvent: false});
      
      // Recalcular precio final
      this.calcularPrecioFinal();
    } finally {
      this.calculando = false;
    }
  }
  
  calcularPrecioFinal() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      const precioBase = Math.round(parseFloat(this.articuloForm.get('prebsiva')?.value || 0) * 100) / 100;
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
      this.articuloForm.get('precon')?.setValue(Math.round(precioFinal * 100) / 100, {emitEvent: false});
      
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
      const precioBase = Math.round(parseFloat(this.articuloForm.get('prebsiva')?.value || 0) * 100) / 100;
      console.log('Precio base actual para recálculo:', precioBase);
      
      if (precioBase <= 0) {
        console.log('No hay precio base para recalcular, abortando');
        return;
      }
      
      // Obtener el porcentaje de IVA
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      console.log('Nuevo porcentaje de IVA a aplicar:', porcentajeIva + '%');
      
      // Calcular el nuevo precio final con el nuevo IVA
      const precioFinal = Math.round(precioBase * (1 + (porcentajeIva / 100)) * 100) / 100;
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
    let porcentajeIva = 21; // Valor por defecto
    
    // Si es EXENTO (código 5 según la imagen), retornar 0%
    if (codIva === '5') {
      console.log(`IVA seleccionado: ${codIva}, EXENTO - Alícuota: 0%`);
      return 0;
    }
    
    if (codIva && this.tiposIva) {
      // Imprimir todos los tipos de IVA para debug
      console.log('Tipos de IVA disponibles:', this.tiposIva);
      
      const tipoIva = this.tiposIva.find((iva: any) => iva.cod_iva === codIva);
      if (tipoIva) {
        console.log('Tipo IVA encontrado completo:', tipoIva);
        
        // Verificar la descripción para EXENTO
        if (tipoIva.descripcion && tipoIva.descripcion.toUpperCase().includes('EXENTO')) {
          console.log(`IVA seleccionado: ${codIva}, EXENTO por descripción - Alícuota: 0%`);
          return 0;
        }
        
        // Verificar explícitamente si es 10.5%
        if (tipoIva.descripcion && tipoIva.descripcion.includes('10,5')) {
          console.log(`IVA seleccionado: ${codIva}, identificado como 10.5% por descripción`);
          return 10.5;
        }
        
        // Usar el campo alicuota1 o porcentaje, asegurando que se procesen como números
        if (tipoIva.alicuota1 !== undefined) {
          // Convertir posibles formatos con coma a punto
          const alicuotaStr = String(tipoIva.alicuota1).replace(',', '.');
          porcentajeIva = parseFloat(alicuotaStr) || 21;
          console.log(`Porcentaje IVA desde alicuota1: ${alicuotaStr} -> ${porcentajeIva}`);
        } else if (tipoIva.porcentaje !== undefined) {
          // Convertir posibles formatos con coma a punto
          const porcentajeStr = String(tipoIva.porcentaje).replace(',', '.');
          porcentajeIva = parseFloat(porcentajeStr) || 21;
          console.log(`Porcentaje IVA desde porcentaje: ${porcentajeStr} -> ${porcentajeIva}`);
        }
        
        // Si la alícuota es 0 o muy pequeña, podría ser EXENTO
        if (porcentajeIva <= 0.01) {
          console.log(`IVA seleccionado: ${codIva}, alícuota 0 - Posiblemente EXENTO`);
          return 0;
        }
        
        console.log(`IVA seleccionado: ${codIva}, Alícuota final: ${porcentajeIva}%`);
      } else {
        console.log(`Tipo de IVA no encontrado para el código: ${codIva}, usando valor por defecto: ${porcentajeIva}%`);
      }
    } else {
      console.log("No hay tiposIva cargados o no se proporcionó codIva, usando valor por defecto:", porcentajeIva);
    }
    
    return porcentajeIva;
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
    const precostosi = Math.round(parseFloat(this.articuloForm.get('precostosi')?.value || 0) * 100) / 100;
    if (precostosi > 0) {
      console.log('Forzando cálculos completos desde precio costo');
      this.calcularDesdePrecoSinIva();
    } else {
      // Si no hay precio costo pero hay precio final, calcular desde el precio final
      const precon = Math.round(parseFloat(this.articuloForm.get('precon')?.value || 0) * 100) / 100;
      if (precon > 0) {
        console.log('Forzando cálculos completos desde precio final');
        this.calcularPreciosSinIva();
      }
    }
  }
  
  calcularPreciosLista(): void {
    const precon = Math.round(parseFloat(this.articuloForm.get('precon')?.value || 0) * 100) / 100;
    
    if (precon <= 0) {
      this.articuloForm.get('prefi1')?.setValue(0, {emitEvent: false});
      this.articuloForm.get('prefi2')?.setValue(0, {emitEvent: false});
      this.articuloForm.get('prefi3')?.setValue(0, {emitEvent: false});
      this.articuloForm.get('prefi4')?.setValue(0, {emitEvent: false});
      return;
    }
    
    // Calcular los precios de lista con los porcentajes fijos
    const prefi1 = Math.round(precon * 0.95 * 100) / 100;
    const prefi2 = Math.round(precon * 0.90 * 100) / 100;
    const prefi3 = Math.round(precon * 0.85 * 100) / 100;
    const prefi4 = Math.round(precon * 0.80 * 100) / 100;
    
    this.articuloForm.get('prefi1')?.setValue(prefi1, {emitEvent: false});
    this.articuloForm.get('prefi2')?.setValue(prefi2, {emitEvent: false});
    this.articuloForm.get('prefi3')?.setValue(prefi3, {emitEvent: false});
    this.articuloForm.get('prefi4')?.setValue(prefi4, {emitEvent: false});
  }
}
