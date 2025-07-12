import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editconflista',
  templateUrl: './editconflista.component.html',
  styleUrls: ['./editconflista.component.css']
})
export class EditconflistaComponent implements OnInit {
  public conflistaForm!: FormGroup;
  public listapFlag: boolean = false;
  public currentConflista: any = null;
  private id_conflista: number = 0;
  public tiposMoneda: any[] = [];
  public marcas: any[] = [];
  private originalPreciof21: number = 0;
  private originalPreciof105: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm(); // Initialize form first
    this.cargarTiposMoneda();
    this.cargarMarcas();
    this.loadConflistaData(); // Load data after form is initialized
  }

  cargarTiposMoneda() {
    this.cargardata.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados:', this.tiposMoneda);
        } else {
          console.error('Error loading tipos de moneda:', response.mensaje);
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
          // Trim the values in the marcas array
          this.marcas = response.mensaje.map((marca: any) => {
            return {
              ...marca,
              cod_marca: marca.cod_marca.trim(),
              marca: marca.marca.trim()
            };
          });
          
          console.log('Marcas cargadas (trimmed):', this.marcas);
          
          // Debug marca values if currentConflista is already loaded
          if (this.currentConflista && this.currentConflista.cod_marca) {
            const trimmedCodMarca = this.currentConflista.cod_marca.trim();
            console.log('Current cod_marca (trimmed):', trimmedCodMarca);
            console.log('Marca matching trimmed cod_marca:', 
              this.marcas.find(m => m.cod_marca === trimmedCodMarca));
          }
        } else {
          console.error('Error loading marcas:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  initForm(): void {
    this.conflistaForm = this.fb.group({
      listap: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,4}$/)
      ])),
      activa: new FormControl(false),
      precosto21: new FormControl(0, Validators.required),
      precosto105: new FormControl(0, Validators.required),
      pordcto: new FormControl(0, Validators.required),
      margen: new FormControl(0, Validators.required),
      preciof21: new FormControl(0, Validators.required),
      preciof105: new FormControl(0, Validators.required),
      rmargen: new FormControl(false),
      tipomone: new FormControl('', Validators.required),
      actprov: new FormControl(false),
      cod_marca: new FormControl('', Validators.required),
      fecha: new FormControl('', Validators.required)
    });

    this.monitorFormChanges();
  }

  loadConflistaData(): void {
    this.route.queryParams.subscribe(params => {
      console.log('Query params:', params);
      if (params['conflista']) {
        try {
          const conflistaData = JSON.parse(params['conflista']);
          this.id_conflista = conflistaData.id_conflista;
          console.log('ID Conflista:', this.id_conflista);
          this.currentConflista = conflistaData;
          // Guardar valores originales
          this.originalPreciof21 = conflistaData.preciof21;
          this.originalPreciof105 = conflistaData.preciof105;
          
          console.log('Current Conflista Data:', this.currentConflista);
          console.log('Raw activa value from backend:', this.currentConflista.activa);
          console.log('Raw rmargen value from backend:', this.currentConflista.rmargen);
          console.log('Raw actprov value from backend:', this.currentConflista.actprov);
          
          // Transform date to YYYY-MM-DD
          const fechaStr = this.currentConflista.fecha ? 
            new Date(this.currentConflista.fecha).toISOString().split('T')[0] : 
            '';
          
          // Fix: Convert string values to boolean values - handle 't' as true
          const activaValue = this.currentConflista.activa === 't' || 
                             this.currentConflista.activa === 'Si' || 
                             this.currentConflista.activa === true;
          const rmargenValue = this.currentConflista.rmargen === 't' || 
                              this.currentConflista.rmargen === 'Si' || 
                              this.currentConflista.rmargen === true;
          const actprovValue = this.currentConflista.actprov === 't' || 
                              this.currentConflista.actprov === 'Si' || 
                              this.currentConflista.actprov === true;
          
          console.log('Converted boolean values:', { activaValue, rmargenValue, actprovValue });
          
          // Use setTimeout to ensure the form controls are ready
          setTimeout(() => {
            console.log('Form before patch:', this.conflistaForm.value);
            
            // Set each form control value individually
            this.conflistaForm.get('listap')?.setValue(this.currentConflista.listap);
            this.conflistaForm.get('activa')?.setValue(activaValue);
            this.conflistaForm.get('precosto21')?.setValue(this.currentConflista.precosto21);
            this.conflistaForm.get('precosto105')?.setValue(this.currentConflista.precosto105);
            this.conflistaForm.get('pordcto')?.setValue(this.currentConflista.pordcto);
            this.conflistaForm.get('margen')?.setValue(this.currentConflista.margen);
            this.conflistaForm.get('preciof21')?.setValue(this.currentConflista.preciof21);
            this.conflistaForm.get('preciof105')?.setValue(this.currentConflista.preciof105);
            this.conflistaForm.get('rmargen')?.setValue(rmargenValue);
            this.conflistaForm.get('tipomone')?.setValue(this.currentConflista.tipomone);
            this.conflistaForm.get('tipomone')?.disable();
            this.conflistaForm.get('actprov')?.setValue(actprovValue);
            this.conflistaForm.get('cod_marca')?.setValue(this.currentConflista.cod_marca ? this.currentConflista.cod_marca.trim() : '');
            this.conflistaForm.get('fecha')?.setValue(fechaStr);
            
            console.log('Form values after individual sets:', this.conflistaForm.value);
            console.log('Form control activa value:', this.conflistaForm.get('activa')?.value);
            console.log('Form control rmargen value:', this.conflistaForm.get('rmargen')?.value);
            console.log('Form control actprov value:', this.conflistaForm.get('actprov')?.value);
            console.log('Form control cod_marca value:', this.conflistaForm.get('cod_marca')?.value);
            
            // Force change detection
            setTimeout(() => {
              console.log('Form values after change detection:', this.conflistaForm.value);
            }, 100);
          }, 0);
        } catch (error) {
          console.error('Error parsing conflista data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información de la conflista',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.conflistaForm.valid) {
      // ===================================================
      // SISTEMA DE DEBUG MEJORADO - FRONTEND
      // ===================================================
      const debugInfo = {
        timestamp_inicio: new Date().toISOString(),
        timestamp_fin: '',
        form_data: {},
        validaciones: {},
        request_data: {},
        response_data: {},
        errores: []
      };

      const formValues = this.conflistaForm.getRawValue();
      debugInfo.form_data = JSON.parse(JSON.stringify(formValues));

      // ===================================================
      // VALIDACIONES FRONTEND
      // ===================================================
      const validacionFrontend = this.validarDatosFrontend(formValues);
      debugInfo.validaciones = validacionFrontend;

      if (!validacionFrontend.valido) {
        console.error('❌ VALIDACIÓN FRONTEND FALLIDA:', validacionFrontend.errores);
        Swal.fire({
          title: 'Error de Validación',
          text: 'Errores encontrados: ' + validacionFrontend.errores.join(', '),
          icon: 'error',
          confirmButtonText: 'OK'
        });
        return;
      }

      // ===================================================
      // PREPARACIÓN DE DATOS PARA BACKEND
      // ===================================================
      const preciof21Num = Number(formValues.preciof21);
      const preciof105Num = Number(formValues.preciof105);
      const originalPreciof21Num = Number(this.originalPreciof21);
      const originalPreciof105Num = Number(this.originalPreciof105);

      const preciof21Changed = preciof21Num !== originalPreciof21Num;
      const preciof105Changed = preciof105Num !== originalPreciof105Num;

      const conflistaData = {
        id_conflista: this.id_conflista,
        listap: formValues.listap,
        activa: formValues.activa ? 't' : 'f',
        precosto21: Number(formValues.precosto21),
        precosto105: Number(formValues.precosto105),
        pordcto: Number(formValues.pordcto),
        margen: Number(formValues.margen),
        preciof21: preciof21Num,
        preciof105: preciof105Num,
        rmargen: formValues.rmargen ? 't' : 'f',
        tipomone: formValues.tipomone || (this.currentConflista?.tipomone || '1'),
        actprov: formValues.actprov ? 't' : 'f',
        cod_marca: formValues.cod_marca,
        fecha: formValues.fecha,
        recalcular_21: preciof21Changed,
        recalcular_105: preciof105Changed
      };

      debugInfo.request_data = JSON.parse(JSON.stringify(conflistaData));

      // ===================================================
      // DEBUG CONSOLE DETALLADO
      // ===================================================
      console.group('🔍 DEBUG CONFLISTA - FRONTEND');
      console.log('📋 Datos del formulario:', debugInfo.form_data);
      console.log('✅ Validaciones:', debugInfo.validaciones);
      console.log('📤 Datos a enviar:', debugInfo.request_data);
      console.log('🔄 Cambios detectados:', {
        preciof21_changed: preciof21Changed,
        preciof105_changed: preciof105Changed,
        precio21_anterior: originalPreciof21Num,
        precio21_nuevo: preciof21Num,
        precio105_anterior: originalPreciof105Num,
        precio105_nuevo: preciof105Num
      });
      console.groupEnd();

      // ===================================================
      // ENVÍO AL BACKEND CON MANEJO DE ERRORES MEJORADO
      // ===================================================
      this.subirdata.updateConflista(conflistaData).subscribe({
        next: (response: any) => {
          debugInfo.response_data = response;
          debugInfo.timestamp_fin = new Date().toISOString();

          // ===================================================
          // ANÁLISIS DE RESPUESTA DETALLADO
          // ===================================================
          console.group('📨 RESPUESTA DEL BACKEND');
          console.log('🕒 Timestamp:', debugInfo.timestamp_fin);
          console.log('📋 Respuesta completa:', response);

          if (response.error) {
            console.error('❌ ERROR EN BACKEND:', response.mensaje);
            if (response.debug) {
              console.group('🔍 DEBUG BACKEND');
              console.log('📥 Datos recibidos:', response.debug.datos_recibidos);
              console.log('✅ Validaciones:', response.debug.validaciones);
              console.log('🔄 Operaciones:', response.debug.operaciones);
              console.log('⚠️ Warnings:', response.debug.warnings);
              console.log('❌ Errores:', response.debug.errores);
              if (response.debug.rollback_ejecutado) {
                console.warn('🔄 ROLLBACK EJECUTADO - Todos los cambios fueron revertidos');
              }
              console.groupEnd();
            }

            this.mostrarErrorDetallado(response, debugInfo);
            return;
          }

          // ===================================================
          // ÉXITO - MOSTRAR RESULTADOS
          // ===================================================
          if (response.resultados) {
            console.group('📊 RESULTADOS');
            console.log('✅ Conflista actualizada:', response.resultados.conflista_actualizada);
            console.log('📈 Productos IVA 21% actualizados:', response.resultados.productos_actualizados_21);
            console.log('📈 Productos IVA 10.5% actualizados:', response.resultados.productos_actualizados_105);
            
            // Mostrar información adicional de PostgreSQL
            if (response.resultados.productos_candidatos_21 !== undefined) {
              console.log('🎯 Productos candidatos IVA 21%:', response.resultados.productos_candidatos_21);
            }
            if (response.resultados.productos_candidatos_105 !== undefined) {
              console.log('🎯 Productos candidatos IVA 10.5%:', response.resultados.productos_candidatos_105);
            }
            console.groupEnd();

            if (response.debug && response.debug.warnings && response.debug.warnings.length > 0) {
              console.group('⚠️ WARNINGS');
              response.debug.warnings.forEach((warning: any, index: number) => {
                console.warn(`${index + 1}. ${warning}`);
              });
              console.groupEnd();
            }
            
            // Mostrar información específica de PostgreSQL
            if (response.debug && response.debug.motor_transaccional) {
              console.group('🐘 INFORMACIÓN POSTGRESQL');
              console.log('🔧 Motor transaccional:', response.debug.motor_transaccional);
              console.log('⚡ Duración total:', response.debug.duracion_total_ms + 'ms');
              console.log('🛡️ Atomicidad garantizada:', response.debug.atomicidad_garantizada);
              if (response.debug.operaciones) {
                console.log('📋 Operaciones ejecutadas:', response.debug.operaciones.length);
              }
              console.groupEnd();
            }
          }

          console.groupEnd();

          // Mostrar éxito con detalles
          this.mostrarExitoDetallado(response, debugInfo);
        },
        error: (error) => {
          debugInfo.errores.push({
            tipo: 'http_error',
            mensaje: error.message,
            status: error.status,
            error_completo: error
          });

          console.group('💥 ERROR HTTP');
          console.error('Status:', error.status);
          console.error('Mensaje:', error.message);
          console.error('Error completo:', error);
          console.error('Debug Info:', debugInfo);
          console.groupEnd();

          this.mostrarErrorHttp(error, debugInfo);
        }
      });
    } else {
      console.group('❌ FORMULARIO INVÁLIDO');
      console.log('Errores del formulario:', this.getFormErrors());
      console.groupEnd();

      this.markFormGroupTouched(this.conflistaForm);
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
    this.router.navigate(['components/conflista']);
  }

  monitorFormChanges(): void {
    Object.keys(this.conflistaForm.controls).forEach(field => {
      const control = this.conflistaForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.listapFlag = this.conflistaForm.controls['listap'].invalid;
      });
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ===================================================
  // FUNCIONES DE VALIDACIÓN FRONTEND
  // ===================================================
  private validarDatosFrontend(formValues: any): any {
    const resultado = {
      valido: true,
      errores: [],
      warnings: []
    };

    // Validar listap
    const listasValidas = ['1', '2', '3', '4'];
    if (!listasValidas.includes(formValues.listap)) {
      resultado.errores.push(`Lista de precios inválida: ${formValues.listap}`);
      resultado.valido = false;
    }

    // Validar precios
    const preciof21 = Number(formValues.preciof21);
    const preciof105 = Number(formValues.preciof105);

    if (isNaN(preciof21)) {
      resultado.errores.push('Precio F21 debe ser numérico');
      resultado.valido = false;
    } else if (preciof21 < -100 || preciof21 > 1000) {
      resultado.warnings.push(`Precio F21 fuera de rango típico: ${preciof21}%`);
    }

    if (isNaN(preciof105)) {
      resultado.errores.push('Precio F105 debe ser numérico');
      resultado.valido = false;
    } else if (preciof105 < -100 || preciof105 > 1000) {
      resultado.warnings.push(`Precio F105 fuera de rango típico: ${preciof105}%`);
    }

    // Validar ID conflista
    if (!this.id_conflista || this.id_conflista <= 0) {
      resultado.errores.push('ID de conflista inválido');
      resultado.valido = false;
    }

    return resultado;
  }

  // ===================================================
  // FUNCIONES DE DISPLAY DE ERRORES
  // ===================================================
  private mostrarErrorDetallado(response: any, debugInfo: any): void {
    let mensajeError = response.mensaje || 'Error desconocido';
    let detallesTecnicos = '';

    if (response.debug) {
      if (response.debug.errores && response.debug.errores.length > 0) {
        detallesTecnicos = '\n\nDetalles técnicos:\n';
        response.debug.errores.forEach((error: any, index: number) => {
          if (typeof error === 'string') {
            detallesTecnicos += `${index + 1}. ${error}\n`;
          } else {
            detallesTecnicos += `${index + 1}. ${error.mensaje || JSON.stringify(error)}\n`;
          }
        });
      }

      if (response.debug.rollback_ejecutado) {
        mensajeError += '\n\n⚠️ IMPORTANTE: Se ejecutó un rollback automático. Todos los cambios fueron revertidos para mantener la consistencia de los datos.';
      }
    }

    Swal.fire({
      title: 'Error al Actualizar Conflista',
      text: mensajeError + detallesTecnicos,
      icon: 'error',
      confirmButtonText: 'OK',
      footer: 'Revise la consola del navegador para más detalles técnicos'
    });
  }

  private mostrarExitoDetallado(response: any, debugInfo: any): void {
    let mensaje = 'La conflista se actualizó correctamente';
    let detalles = '';

    if (response.resultados) {
      const r = response.resultados;
      detalles = `\n\nResultados:\n`;
      detalles += `• Conflista actualizada: ${r.conflista_actualizada ? 'Sí' : 'No'}\n`;
      detalles += `• Productos IVA 21% actualizados: ${r.productos_actualizados_21}\n`;
      detalles += `• Productos IVA 10.5% actualizados: ${r.productos_actualizados_105}`;
    }

    let warnings = '';
    if (response.debug && response.debug.warnings && response.debug.warnings.length > 0) {
      warnings = '\n\nAdvertencias:\n';
      response.debug.warnings.forEach((warning: any, index: number) => {
        warnings += `${index + 1}. ${warning}\n`;
      });
    }

    Swal.fire({
      title: '¡Éxito!',
      text: mensaje + detalles + warnings,
      icon: warnings ? 'warning' : 'success',
      confirmButtonText: 'Aceptar',
      footer: warnings ? 'Hay advertencias - revise la consola para más detalles' : undefined
    }).then(() => {
      this.router.navigate(['components/conflista']);
    });
  }

  private mostrarErrorHttp(error: any, debugInfo: any): void {
    let mensajeError = 'Error de comunicación con el servidor';

    if (error.status === 0) {
      mensajeError = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    } else if (error.status >= 500) {
      mensajeError = 'Error interno del servidor. Contacte al administrador.';
    } else if (error.status >= 400) {
      mensajeError = 'Error en los datos enviados. Revise la información.';
    }

    Swal.fire({
      title: 'Error de Conexión',
      text: `${mensajeError}\n\nCódigo de error: ${error.status}\nDetalle: ${error.message}`,
      icon: 'error',
      confirmButtonText: 'OK',
      footer: 'Revise la consola del navegador para más detalles'
    });
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.conflistaForm.controls).forEach(key => {
      const control = this.conflistaForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }
}
