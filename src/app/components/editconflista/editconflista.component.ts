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
      // Uso getRawValue() en lugar de value para incluir campos deshabilitados
      const formValues = this.conflistaForm.getRawValue();
      
      // ==============================================
      // 🔍 DEBUG FRONTEND - VALIDACIÓN DE DATOS CRÍTICOS
      // ==============================================
      console.log('\n=== 🔍 DEBUG FRONTEND - INICIO VALIDACIÓN ===');
      console.log('📋 VALORES RAW DEL FORMULARIO:', formValues);
      
      // Validar campos críticos individualmente
      console.log('\n🎯 CAMPOS CRÍTICOS:');
      console.log('• listap - tipo:', typeof formValues.listap, '| valor:', formValues.listap, '| válido:', formValues.listap && ['1','2','3','4'].includes(formValues.listap));
      console.log('• tipomone - tipo:', typeof formValues.tipomone, '| valor:', formValues.tipomone, '| válido:', formValues.tipomone && !isNaN(Number(formValues.tipomone)));
      console.log('• id_conflista - tipo:', typeof this.id_conflista, '| valor:', this.id_conflista, '| válido:', this.id_conflista > 0);
      
      // Validar precios
      console.log('\n💰 PRECIOS ACTUALES:');
      console.log('• preciof21 - tipo:', typeof formValues.preciof21, '| valor:', formValues.preciof21);
      console.log('• preciof105 - tipo:', typeof formValues.preciof105, '| valor:', formValues.preciof105);
      
      console.log('\n💰 PRECIOS ORIGINALES:');
      console.log('• originalPreciof21 - tipo:', typeof this.originalPreciof21, '| valor:', this.originalPreciof21);
      console.log('• originalPreciof105 - tipo:', typeof this.originalPreciof105, '| valor:', this.originalPreciof105);
      
      // Convertir a número para asegurar que la comparación sea correcta
      const preciof21Num = Number(formValues.preciof21);
      const preciof105Num = Number(formValues.preciof105);
      const originalPreciof21Num = Number(this.originalPreciof21);
      const originalPreciof105Num = Number(this.originalPreciof105);
      
      // Verificar si se modificaron los precios usando los valores numéricos
      const preciof21Changed = preciof21Num !== originalPreciof21Num;
      const preciof105Changed = preciof105Num !== originalPreciof105Num;
      
      console.log('Comparación de precios:');
      console.log('preciof21 cambiado:', preciof21Changed, '(', preciof21Num, '!=', originalPreciof21Num, ')');
      console.log('preciof105 cambiado:', preciof105Changed, '(', preciof105Num, '!=', originalPreciof105Num, ')');
      
      const conflistaData = {
        id_conflista: this.id_conflista,
        listap: formValues.listap,
        // Convert boolean values back to 't'/'f' for the API
        activa: formValues.activa ? 't' : 'f',
        precosto21: Number(formValues.precosto21),
        precosto105: Number(formValues.precosto105),
        pordcto: Number(formValues.pordcto),
        margen: Number(formValues.margen),
        preciof21: preciof21Num,
        preciof105: preciof105Num,
        rmargen: formValues.rmargen ? 't' : 'f',
        // Asegurar que tipomone tenga un valor válido
        tipomone: formValues.tipomone || (this.currentConflista?.tipomone || '1'),
        actprov: formValues.actprov ? 't' : 'f',
        cod_marca: formValues.cod_marca,
        fecha: formValues.fecha,
        // Solo recalcular si se modificaron los precios
        recalcular_21: preciof21Changed,
        recalcular_105: preciof105Changed
      };

      // ==============================================
      // 🚀 DEBUG FRONTEND - OBJETO FINAL A ENVIAR
      // ==============================================
      console.log('\n=== 🚀 DEBUG FRONTEND - OBJETO FINAL ===');
      console.log('📦 conflistaData COMPLETO:', JSON.stringify(conflistaData, null, 2));
      
      // Validaciones finales críticas
      console.log('\n✅ VALIDACIONES FINALES:');
      console.log('• ¿id_conflista válido?', conflistaData.id_conflista > 0 ? '✅' : '❌', conflistaData.id_conflista);
      console.log('• ¿listap válido?', ['1','2','3','4'].includes(conflistaData.listap) ? '✅' : '❌', conflistaData.listap);
      console.log('• ¿tipomone válido?', conflistaData.tipomone && !isNaN(Number(conflistaData.tipomone)) ? '✅' : '❌', conflistaData.tipomone);
      console.log('• ¿recalcular_21?', conflistaData.recalcular_21 ? '✅ SÍ' : '❌ NO', conflistaData.recalcular_21);
      console.log('• ¿recalcular_105?', conflistaData.recalcular_105 ? '✅ SÍ' : '❌ NO', conflistaData.recalcular_105);
      console.log('• Campo precio esperado en backend: prefi' + conflistaData.listap);
      
      console.log('\n🌐 ENVIANDO AL BACKEND:', new Date().toISOString());
      console.log('===========================================\n');

      this.subirdata.updateConflista(conflistaData).subscribe(
        (response: any) => {
          // ==============================================
          // 📨 DEBUG FRONTEND - RESPUESTA DEL BACKEND
          // ==============================================
          console.log('\n=== 📨 DEBUG FRONTEND - RESPUESTA RECIBIDA ===');
          console.log('🕒 Timestamp respuesta:', new Date().toISOString());
          console.log('📋 RESPUESTA COMPLETA DEL BACKEND:', JSON.stringify(response, null, 2));
          
          if (response && response.resultados) {
            console.log('\n📊 RESULTADOS ESPECÍFICOS:');
            console.log('• Conflista actualizada:', response.resultados.conflista_actualizada ? '✅' : '❌');
            console.log('• Productos actualizados IVA 21%:', response.resultados.productos_actualizados_21 || 0);
            console.log('• Productos actualizados IVA 10.5%:', response.resultados.productos_actualizados_105 || 0);
          }
          
          console.log('\n🔄 DATOS QUE SE ENVIARON AL BACKEND:');
          console.log('• preciof21:', conflistaData.preciof21, '| recalcular_21:', conflistaData.recalcular_21);
          console.log('• preciof105:', conflistaData.preciof105, '| recalcular_105:', conflistaData.recalcular_105);
          console.log('• listap:', conflistaData.listap, '| tipomone:', conflistaData.tipomone);
          console.log('==========================================\n');
          
          Swal.fire({
            title: 'Actualizando...',
            timer: 300,
            didOpen: () => {
              Swal.showLoading();
            }
          }).then((result) => {
            console.log('result de Swal:', result);
            console.log('respuesta completa del servidor:', response);
            if (result.dismiss === Swal.DismissReason.timer) {
              Swal.fire({
                title: '¡Éxito!',
                text: 'La conflista se actualizó correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              console.log('Conflista actualizada correctamente');
              this.router.navigate(['components/conflista']);
            }
          });
        }, 
        error => {
          console.error('Error al actualizar conflista:', error);
          console.error('Detalle del error:', JSON.stringify(error));
          console.error('Valores que causaron el error - preciof21:', conflistaData.preciof21, 'preciof105:', conflistaData.preciof105);
          
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar la conflista. Detalles: ' + (error.error?.mensaje || error.message || 'Error desconocido'),
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      );
    } else {
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
}
