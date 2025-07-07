import { Component, AfterViewInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newarticulo',
  templateUrl: './newarticulo.component.html',
  styleUrls: ['./newarticulo.component.css']
})
export class NewarticuloComponent implements AfterViewInit {
  public nuevoarticuloForm!: FormGroup;
  public nomartFlag: boolean = false;
  public cd_barraFlag: boolean = false;
  public cd_articuloFlag: boolean = false;
  public cod_depositoFlag: boolean = false;
  public marcaFlag: boolean = false;
  public rubroFlag: boolean = false;
  public articuloFlag: boolean = false;
  public cod_ivaFlag: boolean = false;
  public preconFlag: boolean = false;
  public estadoFlag: boolean = false;
  public rubros: any;
  public marcas: any;
  public tiposIva: any;
  public proveedores: any;
  public tiposMoneda: any;
  private calculando: boolean = false;
  public confLista: any;
  private ivaAnterior: string = ''; // Para rastrear el IVA anterior
  private valoresCambio: any; // Para almacenar los valores de cambio (solo informativo)
  private monedaSeleccionada: any = 1; // Por defecto, pesos argentinos (código 1)
  public infoTasaCambio: string = ''; // Información sobre la tasa de cambio para mostrar en la UI (solo informativo)
  public mensajeCambioMoneda: string = ''; // Mensaje para indicar que se reiniciaron los precios
  private enviandoFormulario: boolean = false; // Bandera para controlar envíos duplicados

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder,
    private cargardata: CargardataService
  ) {
    this.cargarForm();
    this.monitorFormChanges();
    this.cargarRubros();
    this.cargarMarcas();
    this.cargarTiposIva();
    this.cargarProveedores();
    this.cargarTiposMoneda();
    this.cargarValoresCambio();
    this.cargarConfLista();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.inicializarCalculos();
    }, 500);
  }

  cargarConfLista() {
    this.cargardata.getConflista().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.confLista = response.mensaje;
          console.log('Conf lista cargada:', this.confLista);
        } else {
          console.error('Error loading conf_lista:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarRubros() {
    this.cargardata.getRubro().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.rubros = response.mensaje;
          console.log('Rubros cargados:', this.rubros);
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
          console.error('Error loading tipos de moneda:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarValoresCambio() {
    this.cargardata.getValorCambio().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.valoresCambio = response.mensaje;
          console.log('Valores de cambio cargados:', this.valoresCambio);
          // Actualizar la tasa de cambio con el valor actual
          this.actualizarTasaCambio();
        } else {
          console.error('Error loading valores de cambio:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarForm() {
    this.nuevoarticuloForm = this.fb.group({
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
      precon: new FormControl(0, Validators.required),
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
      estado: new FormControl('AC', Validators.required),
      rubro: new FormControl('', Validators.required),
      articulo: new FormControl(0, Validators.compose([Validators.required,Validators.pattern(/^[0-9]{1,4}$/)])),
      cod_iva: new FormControl('', Validators.required),
      prebsiva: new FormControl(0),
      precostosi: new FormControl(0),
      margen: new FormControl(0),
      descuento: new FormControl(0),
      tipo_moneda: new FormControl(1)
    });
  }

  guardar(form: FormGroup) {
    // Evitar envíos duplicados
    if (this.enviandoFormulario) {
      console.log('Envío ignorado: formulario ya en proceso de guardado');
      return;
    }
    
    if (form.valid) {
      this.enviandoFormulario = true; // Activar la bandera de envío
      console.log(form.value);
      this.subirdata.subirDatosArticulo(form.value).subscribe({
        next: (data: any) => {
          Swal.fire({
            title: 'Guardando...',
            timer: 300,
            didOpen: () => {
              Swal.showLoading()
            }
          }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
              Swal.fire({
                title: '¡Éxito!',
                text: 'El artículo se ha guardado correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              // Reiniciar bandera de envío antes de salir de la pantalla
              this.enviandoFormulario = false;
              this.router.navigate(['components/articulo']);
            }
          });
        },
        error: (error) => {
          this.enviandoFormulario = false; // Restaurar la bandera en caso de error
          Swal.fire({
            title: 'Error',
            text: 'No se pudo guardar el artículo',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error saving articulo:', error);
        }
      });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(form.controls).forEach(key => {
        const control = form.get(key);
        control?.markAsTouched();
        control?.markAsDirty();
      });
      
      // Actualizar todas las banderas de validación
      this.nomartFlag = this.nuevoarticuloForm.controls['nomart'].invalid;
      this.cd_barraFlag = this.nuevoarticuloForm.controls['cd_barra'].invalid;
      this.cd_articuloFlag = this.nuevoarticuloForm.controls['cd_articulo'].invalid;
      this.cod_depositoFlag = this.nuevoarticuloForm.controls['cod_deposito'].invalid;
      this.marcaFlag = this.nuevoarticuloForm.controls['marca'].invalid;
      this.rubroFlag = this.nuevoarticuloForm.controls['rubro'].invalid;
      this.articuloFlag = this.nuevoarticuloForm.controls['articulo'].invalid;
      this.cod_ivaFlag = this.nuevoarticuloForm.controls['cod_iva'].invalid;
      this.preconFlag = this.nuevoarticuloForm.controls['precon'].invalid;
      this.estadoFlag = this.nuevoarticuloForm.controls['estado'].invalid;
      
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos inválidos o vacíos',
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'OK',
      });
      
      // Mostrar en la consola los campos con errores para depuración
      console.log('Campos con errores:');
      Object.keys(form.controls).forEach(key => {
        const controlErrors = form.get(key)?.errors;
        if (controlErrors) {
          console.log(`Campo ${key} - Errores:`, controlErrors);
        }
      });
    }
  }

  monitorFormChanges() {
    // Monitorear cambios en campos críticos para la validación visual
    Object.keys(this.nuevoarticuloForm.controls).forEach(field => {
      const control = this.nuevoarticuloForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        this.nomartFlag = this.nuevoarticuloForm.controls['nomart'].invalid;
        this.cd_barraFlag = this.nuevoarticuloForm.controls['cd_barra'].invalid;
        this.cd_articuloFlag = this.nuevoarticuloForm.controls['cd_articulo'].invalid;
        this.cod_depositoFlag = this.nuevoarticuloForm.controls['cod_deposito'].invalid;
        this.marcaFlag = this.nuevoarticuloForm.controls['marca'].invalid;
        this.rubroFlag = this.nuevoarticuloForm.controls['rubro'].invalid;
        this.articuloFlag = this.nuevoarticuloForm.controls['articulo'].invalid;
        this.cod_ivaFlag = this.nuevoarticuloForm.controls['cod_iva'].invalid;
        this.preconFlag = this.nuevoarticuloForm.controls['precon'].invalid;
        this.estadoFlag = this.nuevoarticuloForm.controls['estado'].invalid;
      });
    });

    // Monitoreo específico para cada campo crítico
    this.nuevoarticuloForm.get('articulo')?.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      this.articuloFlag = this.nuevoarticuloForm.controls['articulo'].invalid;
    });

    this.nuevoarticuloForm.get('cod_deposito')?.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      this.cod_depositoFlag = this.nuevoarticuloForm.controls['cod_deposito'].invalid;
    });

    // Monitorear cambios específicos en campos de precios
    this.nuevoarticuloForm.get('precon')?.valueChanges.pipe(debounceTime(500)).subscribe(value => {
      if (!this.calculando && value) {
        this.calcularPreciosSinIva();
      }
    });

    this.nuevoarticuloForm.get('cod_iva')?.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      if (!this.calculando && value) {
        this.manejarCambioIva();
      }
    });
    
    // Monitorear cambios en idart (modo precios manual)
    this.nuevoarticuloForm.get('idart')?.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      console.log('Modo precios manual:', value === 1 ? 'Activado' : 'Desactivado');
      if (value === 1) {
        // Si idart es 1 (modo manual), establecer todos los precios de lista a 0
        this.nuevoarticuloForm.get('prefi1')?.setValue('0.00');
        this.nuevoarticuloForm.get('prefi2')?.setValue('0.00');
        this.nuevoarticuloForm.get('prefi3')?.setValue('0.00');
        this.nuevoarticuloForm.get('prefi4')?.setValue('0.00');
      } else if (value === 0) {
        // Si idart es 0 (modo automático), recalcular los precios de lista
        this.calcularPreciosLista();
      }
    });
    
    // Monitorear cambios en el tipo de moneda
    this.nuevoarticuloForm.get('tipo_moneda')?.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      if (value) {
        console.log('Cambio de tipo de moneda detectado:', value);
        const monedaAnterior = this.monedaSeleccionada;
        this.monedaSeleccionada = value;
        
        // Solo actualizamos información de tasa, sin afectar los cálculos
        this.actualizarTasaCambio();
        
        // Reiniciar campos de precios a valores por defecto
        this.nuevoarticuloForm.get('precostosi')?.setValue('0.00');
        this.nuevoarticuloForm.get('prebsiva')?.setValue('0.00');
        this.nuevoarticuloForm.get('precon')?.setValue('0.00');
        this.nuevoarticuloForm.get('margen')?.setValue('0.00');
        this.nuevoarticuloForm.get('descuento')?.setValue('0.00');
        this.nuevoarticuloForm.get('prefi1')?.setValue('0.00');
        this.nuevoarticuloForm.get('prefi2')?.setValue('0.00');
        this.nuevoarticuloForm.get('prefi3')?.setValue('0.00');
        this.nuevoarticuloForm.get('prefi4')?.setValue('0.00');
        
        // Mostrar mensaje de valores reiniciados
        this.mensajeCambioMoneda = 'Se han reiniciado los precios por cambio de moneda';
        setTimeout(() => {
          this.mensajeCambioMoneda = '';
        }, 5000); // El mensaje desaparecerá después de 5 segundos
        
        console.log('Campos de precios reiniciados por cambio de moneda');
      }
    });
  }

  inicializarCalculos() {
    setTimeout(() => {
      if (this.tiposIva && this.tiposIva.length > 0) {
        console.log('Tipos de IVA disponibles:', this.tiposIva.map((iva: any) => 
          `${iva.cod_iva}: ${iva.descripcion} (${iva.alicuota1}%)`
        ));
        
        // Buscar el IVA del 21% o usar el primero disponible
        const codIva = this.nuevoarticuloForm.get('cod_iva')?.value;
        if (!codIva) {
          // Buscar el IVA del 21%
          const iva21 = this.tiposIva.find((iva: any) => parseFloat(iva.alicuota1) === 21);
          if (iva21) {
            console.log('Estableciendo IVA del 21%:', iva21.cod_iva, iva21.descripcion);
            this.nuevoarticuloForm.get('cod_iva')?.setValue(iva21.cod_iva);
            this.ivaAnterior = iva21.cod_iva; // Guarda el IVA inicial
          } else if (this.tiposIva.length > 0) {
            // Si no hay IVA del 21%, usar el primero de la lista
            console.log('No se encontró IVA del 21%, usando el primero:', 
              this.tiposIva[0].cod_iva, this.tiposIva[0].descripcion);
            this.nuevoarticuloForm.get('cod_iva')?.setValue(this.tiposIva[0].cod_iva);
            this.ivaAnterior = this.tiposIva[0].cod_iva; // Guarda el IVA inicial
          }
        } else {
          console.log('Ya hay un IVA seleccionado:', codIva);
          this.ivaAnterior = codIva; // Guarda el IVA inicial
        }
        
        const precon = parseFloat(this.nuevoarticuloForm.get('precon')?.value) || 0;
        if (precon === 0) {
          this.nuevoarticuloForm.get('precostosi')?.setValue('0.00');
          this.nuevoarticuloForm.get('descuento')?.setValue('0.00');
          this.nuevoarticuloForm.get('margen')?.setValue('0.00');
          this.nuevoarticuloForm.get('prebsiva')?.setValue('0.00');
          this.nuevoarticuloForm.get('precon')?.setValue('0.00');
        } else {
          this.calcularPreciosSinIva();
        }
      } else {
        // Si aún no hay datos de IVA, reintentamos
        console.log('Esperando datos de IVA...');
        this.inicializarCalculos();
      }
    }, 500);
  }

  calcularPreciosSinIva() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      console.log('Cálculo iniciado desde el precio final (precon)');
      const precon = parseFloat(this.nuevoarticuloForm.get('precon')?.value) || 0;
      const codIva = this.nuevoarticuloForm.get('cod_iva')?.value;
      const margenPorcentaje = parseFloat(this.nuevoarticuloForm.get('margen')?.value) || 0;
      const descuentoPorcentaje = parseFloat(this.nuevoarticuloForm.get('descuento')?.value) || 0;
      
      console.log('Precio final ingresado:', precon);
      
      // Obtener el porcentaje de IVA
      let porcentajeIva = this.obtenerPorcentajeIva(codIva);
      
      // Calcular precio base sin IVA (desde el precio final)
      let precioBase = 0;
      if (porcentajeIva > 0) {
        precioBase = precon / (1 + (porcentajeIva / 100));
      } else {
        precioBase = precon;
      }
      
      console.log('Precio base sin IVA calculado:', precioBase);
      this.nuevoarticuloForm.get('prebsiva')?.setValue(precioBase.toFixed(4));
      
      // Si tenemos descuento y margen, calculamos el precio sin IVA (costo)
      if (margenPorcentaje > 0 || descuentoPorcentaje > 0) {
        // Primero revertimos el margen
        const precioSinMargen = precioBase / (1 + (margenPorcentaje / 100));
        
        // Luego revertimos el descuento
        let precioSinIva = 0;
        if (descuentoPorcentaje < 100) {
          precioSinIva = precioSinMargen / (1 - (descuentoPorcentaje / 100));
        } else {
          precioSinIva = precioBase; // Si el descuento es 100% o más, usamos el precio base
        }
        
        console.log('Precio sin IVA (costo) calculado:', precioSinIva);
        this.nuevoarticuloForm.get('precostosi')?.setValue(precioSinIva.toFixed(4));
      } else {
        // Si no hay margen ni descuento, el precio sin IVA es igual al precio base
        this.nuevoarticuloForm.get('precostosi')?.setValue(precioBase.toFixed(4));
      }
      
      // Calcular precios de lista
      this.calcularPreciosLista();
      
      // Actualizar el IVA anterior
      this.ivaAnterior = codIva;
    } finally {
      setTimeout(() => {
        this.calculando = false;
      }, 100);
    }
  }

  calcularDesdePrecoSinIva() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      console.log('Cálculo iniciado desde el precio sin IVA (costo)');
      const precioSinIva = parseFloat(this.nuevoarticuloForm.get('precostosi')?.value) || 0;
      const codIva = this.nuevoarticuloForm.get('cod_iva')?.value;
      const margenPorcentaje = parseFloat(this.nuevoarticuloForm.get('margen')?.value) || 0;
      const descuentoPorcentaje = parseFloat(this.nuevoarticuloForm.get('descuento')?.value) || 0;
      
      console.log('Precio sin IVA ingresado:', precioSinIva);
      console.log('Descuento (%):', descuentoPorcentaje);
      console.log('Margen (%):', margenPorcentaje);
      
      // Obtener el porcentaje de IVA
      let porcentajeIva = this.obtenerPorcentajeIva(codIva);
      
      // Aplicar descuento
      const descuentoValor = precioSinIva * (descuentoPorcentaje / 100);
      const precioNeto = precioSinIva - descuentoValor;
      
      console.log('Precio neto después del descuento:', precioNeto);
      
      // Aplicar margen
      const margenValor = precioNeto * (margenPorcentaje / 100);
      const precioBase = precioNeto + margenValor;
      
      console.log('Precio base calculado:', precioBase);
      
      // Actualizar precio base sin IVA
      this.nuevoarticuloForm.get('prebsiva')?.setValue(precioBase.toFixed(4));
      
      // Calcular precio final con IVA
      const precioFinal = precioBase * (1 + (porcentajeIva / 100));
      console.log('Precio final con IVA:', precioFinal);
      
      // Actualizar precio final
      this.nuevoarticuloForm.get('precon')?.setValue(precioFinal.toFixed(4));
      
      // Calcular precios de lista
      this.calcularPreciosLista();
    } finally {
      setTimeout(() => {
        this.calculando = false;
      }, 100);
    }
  }

  private calcularPrecioBaseInterno() {
    const precioSinIva = parseFloat(this.nuevoarticuloForm.get('precostosi')?.value) || 0;
    const descuentoPorcentaje = parseFloat(this.nuevoarticuloForm.get('descuento')?.value) || 0;
    const margenPorcentaje = parseFloat(this.nuevoarticuloForm.get('margen')?.value) || 0;
    
    console.log('calcularPrecioBaseInterno - Valores iniciales:');
    console.log('Precio sin IVA:', precioSinIva);
    console.log('Descuento (%):', descuentoPorcentaje);
    console.log('Margen (%):', margenPorcentaje);
    
    // Aplicar descuento
    const descuentoValor = precioSinIva * (descuentoPorcentaje / 100);
    const precioNeto = precioSinIva - descuentoValor;
    
    console.log('Precio neto después del descuento:', precioNeto);
    
    // Aplicar margen
    const margenValor = precioNeto * (margenPorcentaje / 100);
    const precioBase = precioNeto + margenValor;
    
    console.log('Precio base final:', precioBase);
    
    // Solo actualizamos el precio base, NO el precio sin IVA
    this.nuevoarticuloForm.get('prebsiva')?.setValue(precioBase.toFixed(4));
    
    // Calculamos el precio final
    this.calcularPrecioFinalInterno();
  }

  private calcularPrecioFinalInterno() {
    const precioBase = parseFloat(this.nuevoarticuloForm.get('prebsiva')?.value) || 0;
    const codIva = this.nuevoarticuloForm.get('cod_iva')?.value;
    
    // Obtener el porcentaje de IVA
    let porcentajeIva = this.obtenerPorcentajeIva(codIva);
    
    // Calcular precioFinal
    const precioFinal = precioBase * (1 + (porcentajeIva / 100));
    
    // Actualizar precon
    this.nuevoarticuloForm.get('precon')?.setValue(precioFinal.toFixed(4));
    
    // Calcular precios de lista
    this.calcularPreciosLista();
  }

  calcularPrecioBase() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      console.log('Inicio cálculo de precio base por cambio en descuento/margen');
      this.calcularPrecioBaseInterno();
    } finally {
      setTimeout(() => {
        this.calculando = false;
      }, 100);
    }
  }

  calcularMargen() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      const precioBase = parseFloat(this.nuevoarticuloForm.get('prebsiva')?.value) || 0;
      const precioSinIva = parseFloat(this.nuevoarticuloForm.get('precostosi')?.value) || 0;
      const descuentoPorcentaje = parseFloat(this.nuevoarticuloForm.get('descuento')?.value) || 0;
      
      // Aplicar descuento sobre el precio sin IVA
      const descuentoValor = precioSinIva * (descuentoPorcentaje / 100);
      const precioNeto = precioSinIva - descuentoValor;
      
      if (precioNeto === 0) {
        this.nuevoarticuloForm.get('margen')?.setValue('0.00');
        return;
      }
      
      // Calcular el margen basado en la diferencia entre el precio base y el precio neto
      const margenPorcentaje = ((precioBase - precioNeto) / precioNeto) * 100;
      
      this.nuevoarticuloForm.get('margen')?.setValue(margenPorcentaje.toFixed(4));
      
      this.calcularPrecioFinalInterno();
    } finally {
      setTimeout(() => {
        this.calculando = false;
      }, 100);
    }
  }
  
  calcularPrecioFinal() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      this.calcularPrecioFinalInterno();
    } finally {
      setTimeout(() => {
        this.calculando = false;
      }, 100);
    }
  }

  // Método especial para manejar cambios en el select de IVA
  manejarCambioIva() {
    if (this.calculando) return;
    this.calculando = true;
    
    try {
      const codIva = this.nuevoarticuloForm.get('cod_iva')?.value;
      const codIvaAnterior = this.ivaAnterior;
      const precioBase = parseFloat(this.nuevoarticuloForm.get('prebsiva')?.value) || 0;
      
      console.log('Cambio de IVA detectado');
      console.log('Código IVA anterior:', codIvaAnterior);
      console.log('Código IVA actual:', codIva);
      console.log('Precio base sin IVA actual:', precioBase);
      
      // Si no hay precio base, no hay nada que calcular
      if (precioBase <= 0) {
        this.ivaAnterior = codIva;
        console.log('No hay precio base válido para calcular');
        return;
      }
      
      // Obtener el porcentaje del IVA actual
      const porcentajeIva = this.obtenerPorcentajeIva(codIva);
      console.log('Porcentaje IVA a aplicar:', porcentajeIva);
      
      // Calcular el nuevo precio final con el nuevo IVA
      const nuevoFinal = precioBase * (1 + (porcentajeIva / 100));
      console.log('Nuevo precio final calculado:', nuevoFinal.toFixed(4));
      
      // Actualizar el precio final
      this.nuevoarticuloForm.get('precon')?.setValue(nuevoFinal.toFixed(4));
      
      // Actualizar precios de lista con el nuevo precio final
      this.calcularPreciosLista();
      
      // Actualizar IVA anterior
      this.ivaAnterior = codIva;
    } finally {
      setTimeout(() => {
        this.calculando = false;
      }, 100);
    }
  }

  // Método auxiliar para obtener el porcentaje de IVA
  private obtenerPorcentajeIva(codIva: string): number {
    let porcentajeIva = 21; // Valor por defecto
    
    // Si es EXENTO (código 5 según la imagen), retornar 0%
    if (codIva === '5') {
      console.log(`IVA seleccionado: ${codIva}, EXENTO - Alícuota: 0%`);
      return 0;
    }
    
    if (codIva && this.tiposIva) {
      const tipoIva = this.tiposIva.find((iva: any) => iva.cod_iva === codIva);
      if (tipoIva) {
        // Verificar la descripción para EXENTO
        if (tipoIva.descripcion && tipoIva.descripcion.toUpperCase().includes('EXENTO')) {
          console.log(`IVA seleccionado: ${codIva}, EXENTO por descripción - Alícuota: 0%`);
          return 0;
        }
        
        // Usar el campo alicuota1
        porcentajeIva = parseFloat(tipoIva.alicuota1) || 21;
        
        // Si la alícuota es 0 o muy pequeña, podría ser EXENTO
        if (porcentajeIva <= 0.01) {
          console.log(`IVA seleccionado: ${codIva}, alícuota 0 - Posiblemente EXENTO`);
          return 0;
        }
        
        console.log(`IVA seleccionado: ${codIva}, Alícuota: ${porcentajeIva}%`);
      }
    }
    return porcentajeIva;
  }

  calcularPreciosLista() {
    // Si idart es 1, los precios son manuales y no se calculan
    const idartRaw = this.nuevoarticuloForm.get('idart')?.value;
    const idartValue = this.normalizarIdart(idartRaw);
    
    if (idartValue === 1) {
      console.log('Precios lista manual activado: no se calculan precios automáticamente');
      return;
    }
    
    if (!this.confLista || this.confLista.length === 0) {
      console.log('confLista no disponible aún');
      return;
    }
    
    const precon = parseFloat(this.nuevoarticuloForm.get('precon')?.value) || 0;
    const codIva = this.nuevoarticuloForm.get('cod_iva')?.value;
    const tipoMoneda = parseInt(this.nuevoarticuloForm.get('tipo_moneda')?.value) || 1;
    
    if (precon <= 0) {
      console.log('Precio final es 0 o negativo, no se calculan precios de lista');
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
      this.nuevoarticuloForm.get('prefi1')?.setValue(valorPrefi1.toFixed(4));
      console.log(`Lista 1: Porcentaje=${porcentaje}%, Precio=${valorPrefi1.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 1 con la moneda seleccionada');
      this.nuevoarticuloForm.get('prefi1')?.setValue('0.00');
    }
    
    // Calcular prefi2
    if (lista2) {
      const porcentaje = usarPreciof21 ? 
                          parseFloat(lista2.preciof21) : 
                          parseFloat(lista2.preciof105);
      const valorPrefi2 = precon + (precon * porcentaje / 100);
      this.nuevoarticuloForm.get('prefi2')?.setValue(valorPrefi2.toFixed(4));
      console.log(`Lista 2: Porcentaje=${porcentaje}%, Precio=${valorPrefi2.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 2 con la moneda seleccionada');
      this.nuevoarticuloForm.get('prefi2')?.setValue('0.00');
    }
    
    // Calcular prefi3
    if (lista3) {
      const porcentaje = usarPreciof21 ? 
                          parseFloat(lista3.preciof21) : 
                          parseFloat(lista3.preciof105);
      const valorPrefi3 = precon + (precon * porcentaje / 100);
      this.nuevoarticuloForm.get('prefi3')?.setValue(valorPrefi3.toFixed(4));
      console.log(`Lista 3: Porcentaje=${porcentaje}%, Precio=${valorPrefi3.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 3 con la moneda seleccionada');
      this.nuevoarticuloForm.get('prefi3')?.setValue('0.00');
    }
    
    // Calcular prefi4
    if (lista4) {
      const porcentaje = usarPreciof21 ? 
                          parseFloat(lista4.preciof21) : 
                          parseFloat(lista4.preciof105);
      const valorPrefi4 = precon + (precon * porcentaje / 100);
      this.nuevoarticuloForm.get('prefi4')?.setValue(valorPrefi4.toFixed(4));
      console.log(`Lista 4: Porcentaje=${porcentaje}%, Precio=${valorPrefi4.toFixed(4)}`);
    } else {
      console.log('No se encontró configuración para Lista 4 con la moneda seleccionada');
      this.nuevoarticuloForm.get('prefi4')?.setValue('0.00');
    }
  }

  // Obtiene la tasa de cambio actual para la moneda seleccionada (solo informativo)
  actualizarTasaCambio() {
    if (!this.valoresCambio || this.valoresCambio.length === 0) {
      console.log('No hay valores de cambio disponibles');
      this.infoTasaCambio = '';
      return;
    }
    
    const codMone = parseInt(this.nuevoarticuloForm.get('tipo_moneda')?.value) || 1;
    this.monedaSeleccionada = codMone;
    
    // Si es peso argentino (usualmente código 1), no mostramos tasa
    if (codMone === 1) {
      console.log('Moneda seleccionada: Peso argentino');
      this.infoTasaCambio = '';
      return;
    }
    
    // Buscar el valor de cambio más reciente para esta moneda (solo informativo)
    const fechaActual = new Date();
    let valorCambioEncontrado = null;
    
    // Filtrar por código de moneda y verificar que la fecha actual esté dentro del rango de vigencia
    const valoresFiltrados = this.valoresCambio.filter((vc: any) => {
      return parseInt(vc.codmone) === codMone && 
             new Date(vc.fecdesde) <= fechaActual && 
             new Date(vc.fechasta) >= fechaActual;
    });
    
    if (valoresFiltrados.length > 0) {
      // Ordenar por fecha de inicio descendente para obtener el más reciente
      valoresFiltrados.sort((a: any, b: any) => {
        return new Date(b.fecdesde).getTime() - new Date(a.fecdesde).getTime();
      });
      
      valorCambioEncontrado = valoresFiltrados[0];
    }
    
    if (valorCambioEncontrado) {
      const tasaCambioInfo = parseFloat(valorCambioEncontrado.vcambio) || 1;
      // Encontrar la descripción de la moneda para mostrar información más amigable
      const monedaInfo = this.tiposMoneda?.find((m: any) => parseInt(m.cod_mone) === codMone);
      const nombreMoneda = monedaInfo ? monedaInfo.moneda : `Moneda ${codMone}`;
      
      this.infoTasaCambio = `Referencia: 1 ${nombreMoneda} = ${tasaCambioInfo.toFixed(4)} pesos`;
      console.log(`Moneda seleccionada: ${codMone}, tasa de cambio referencial: ${tasaCambioInfo}`);
    } else {
      console.log(`No se encontró valor de cambio vigente para la moneda ${codMone}`);
      this.infoTasaCambio = 'Información: No hay una tasa de cambio referencial vigente para esta moneda';
    }
  }

  convertirAPesos(valor: number): number {
    // Mantenemos este método pero lo dejamos como paso directo sin conversión 
    // por si hay alguna parte del código que aún lo use
    return valor;
  }

  convertirDesdeMonedaSeleccionada(valorEnPesos: number): number {
    // Mantenemos este método pero lo dejamos como paso directo sin conversión
    // por si hay alguna parte del código que aún lo use
    return valorEnPesos;
  }

  // Método que maneja el cambio en el checkbox de Precios Lista Manual
  manejarCambioManual(event: any) {
    const isChecked = event.target.checked;
    console.log('Precios lista manual:', isChecked ? 'Activado' : 'Desactivado');
    
    // Actualizar idart según el estado del checkbox (1 si está activado, 0 si no)
    this.nuevoarticuloForm.get('idart')?.setValue(isChecked ? 1 : 0);
  }
  
  // Método auxiliar para normalizar el valor de idart (utilizado internamente)
  private normalizarIdart(valor: any): number {
    // Si el valor es exactamente 1 (como número o string), devuelve 1, si no, 0
    return (valor === 1 || valor === '1') ? 1 : 0;
  }
}
