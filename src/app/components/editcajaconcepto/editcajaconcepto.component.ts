import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editcajaconcepto',
  templateUrl: './editcajaconcepto.component.html',
  styleUrls: ['./editcajaconcepto.component.css'] // Asumiendo que existe o se creará
})
export class EditcajaconceptoComponent implements OnInit {
  public cajaconceptoForm!: FormGroup;
  public descripcionFlag: boolean = false;
  public tipoConceptoFlag: boolean = false;
  public fijaFlag: boolean = false;
  public ingresoEgresoFlag: boolean = false;
  public idCajaFlag: boolean = false;
  public currentCajaConcepto: any = null;
  private id_concepto: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCajaConceptoData();
    this.loadCajas();
  }

  // Lista de cajas para el select
  public cajas: any[] = [];

  initForm(): void {
    this.cajaconceptoForm = this.fb.group({
      descripcion: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(80)
      ])),
      tipo_concepto: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(2)
      ])),
      fija: new FormControl({value: 0, disabled: true}, Validators.compose([
        Validators.required,
        Validators.pattern(/^[01]$/)
      ])),
      ingreso_egreso: new FormControl({value: 0, disabled: true}, Validators.compose([
        Validators.required,
        Validators.pattern(/^[01]$/)
      ])),
      id_caja: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,10}$/)
      ]))
      // id_concepto no se edita directamente en el formulario, se usa para la actualización
    });

    this.monitorFormChanges();
  }

  loadCajaConceptoData(): void {
      this.route.queryParams.subscribe(params => {
        console.log(params);
        if (params['cajaconcepto']) {
          try {
            const cajaconceptoData = JSON.parse(params['cajaconcepto']);
            this.id_concepto = cajaconceptoData.id_concepto; // Guardar el ID
            console.log("ID Concepto:", this.id_concepto);
            this.currentCajaConcepto = cajaconceptoData;
            // Usar patchValue para llenar el formulario
            this.cajaconceptoForm.patchValue({
              descripcion: this.currentCajaConcepto.descripcion?.trim(), // Usar optional chaining y trim
              tipo_concepto: this.currentCajaConcepto.tipo_concepto?.trim(),
              fija: this.currentCajaConcepto.fija, // Asumiendo que ya es número
              ingreso_egreso: this.currentCajaConcepto.ingreso_egreso,
              id_caja: this.currentCajaConcepto.id_caja
            });
          } catch (error) {
            console.error('Error parsing cajaconcepto data:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo cargar la información del concepto de caja',
              icon: 'error',
              confirmButtonText: 'OK'
            }).then(() => this.router.navigate(['components/cajaconcepto'])); // Volver a la lista
          }
        } else {
             console.error('No cajaconcepto data found in query params');
             Swal.fire({
              title: 'Error',
              text: 'No se encontró información para editar.',
              icon: 'error',
              confirmButtonText: 'OK'
            }).then(() => this.router.navigate(['components/cajaconcepto'])); // Volver a la lista
        }
      });
    }

  loadCajas(): void {
    this.cargardata.getCajaLista().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.cajas = response.mensaje;
        } else {
          console.error('Error loading cajas:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error loading cajas:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.cajaconceptoForm.valid) {
      const cajaconceptoData = {
        id_concepto: this.id_concepto, // Incluir el ID para la actualización
        descripcion: this.cajaconceptoForm.value.descripcion,
        tipo_concepto: this.cajaconceptoForm.value.tipo_concepto,
        fija: this.cajaconceptoForm.controls['fija'].value,
        ingreso_egreso: this.cajaconceptoForm.controls['ingreso_egreso'].value,
        id_caja: this.cajaconceptoForm.value.id_caja
      };
      console.log("Updating with data:", cajaconceptoData);

      this.subirdata.updateCajaconcepto(cajaconceptoData).subscribe({
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
                  text: 'El concepto de caja se actualizó correctamente',
                  icon: 'success',
                  confirmButtonText: 'Aceptar'
                }).then(() => {
                     this.router.navigate(['components/cajaconcepto']); // Volver a la lista
                });
                console.log('Concepto de caja actualizado correctamente');
              }
            });
        }, error: (error) => {
            console.error('Error updating data:', error);
            Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el concepto de caja',
            icon: 'error',
            confirmButtonText: 'OK'
            });
        }
    });
    } else {
      this.markFormGroupTouched(this.cajaconceptoForm);
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
    this.router.navigate(['components/cajaconcepto']); // Ajustar ruta si es necesario
  }

  monitorFormChanges(): void {
    Object.keys(this.cajaconceptoForm.controls).forEach(field => {
      const control = this.cajaconceptoForm.get(field);
      control?.valueChanges.pipe(debounceTime(500)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
         this.descripcionFlag = this.cajaconceptoForm.controls['descripcion'].invalid && this.cajaconceptoForm.controls['descripcion'].touched;
        this.tipoConceptoFlag = this.cajaconceptoForm.controls['tipo_concepto'].invalid && this.cajaconceptoForm.controls['tipo_concepto'].touched;
        this.fijaFlag = this.cajaconceptoForm.controls['fija'].invalid && this.cajaconceptoForm.controls['fija'].touched;
        this.ingresoEgresoFlag = this.cajaconceptoForm.controls['ingreso_egreso'].invalid && this.cajaconceptoForm.controls['ingreso_egreso'].touched;
        this.idCajaFlag = this.cajaconceptoForm.controls['id_caja'].invalid && this.cajaconceptoForm.controls['id_caja'].touched;
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
