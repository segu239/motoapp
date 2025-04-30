import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
// No se necesita CargardataService aquí si no hay datos que cargar (como dropdowns)
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newcajaconcepto',
  templateUrl: './newcajaconcepto.component.html',
  styleUrls: ['./newcajaconcepto.component.css'] // Asumiendo que existe o se creará un archivo CSS
})
export class NewcajaconceptoComponent {
  public nuevocajaconceptoForm!: FormGroup;
  public descripcionFlag: boolean = false;
  public tipoConceptoFlag: boolean = false;
  public fijaFlag: boolean = false;
  public ingresoEgresoFlag: boolean = false;
  public idCajaFlag: boolean = false;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private fb: FormBuilder
    // private cargardata: CargardataService // No necesario aquí por ahora
  ) {
    this.cargarForm();
    this.monitorFormChanges();
  }

  cargarForm() {
    this.nuevocajaconceptoForm = this.fb.group({
      descripcion: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(80)
      ])),
      tipo_concepto: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(2)
      ])),
      fija: new FormControl(0, Validators.compose([ // Default a 0
        Validators.required,
        Validators.pattern(/^[01]$/) // Solo 0 o 1
      ])),
      ingreso_egreso: new FormControl(0, Validators.compose([ // Default a 0
        Validators.required,
        Validators.pattern(/^[01]$/) // Solo 0 o 1
      ])),
      id_caja: new FormControl(0, Validators.compose([ // Default a 0
        Validators.required,
        Validators.pattern(/^[0-9]{1,10}$/) // Numérico hasta 10 dígitos
      ]))
      // id_concepto es serial, no se incluye en el formulario de creación
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
        let nuevoCajaConcepto = {
          "descripcion": form.value.descripcion,
          "tipo_concepto": form.value.tipo_concepto,
          "fija": form.value.fija,
          "ingreso_egreso": form.value.ingreso_egreso,
          "id_caja": form.value.id_caja,
          // id_concepto es generado por la BD
        }
      console.log(nuevoCajaConcepto);
      this.subirdata.subirDatosCajaconcepto(nuevoCajaConcepto).subscribe({
        next: (data: any) => {
            console.log(data);
            Swal.fire({
            title: 'Guardando...',
            timer: 300, // Ajustar tiempo si es necesario
            didOpen: () => {
                Swal.showLoading()
            }
            }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
                 Swal.fire({
                    title: '¡Éxito!',
                    text: 'El concepto de caja se guardó correctamente',
                    icon: 'success',
                    confirmButtonText: 'Aceptar'
                  }).then(() => {
                     this.router.navigate(['components/cajaconcepto']); // Navegar de vuelta a la lista
                  });
            }
            })
        },
        error: (error) => {
            console.error('Error saving data:', error);
            Swal.fire({
                title: '¡Error!',
                text: 'No se pudo guardar el concepto de caja.',
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
        }
      });
    } else {
      this.markFormGroupTouched(form); // Marcar todos los campos como tocados para mostrar errores
      console.log(form.errors);
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos inválidos o vacíos',
        icon: 'error',
        // showCancelButton: true, // No necesario aquí según ejemplo 'new'
        confirmButtonColor: '#3085d6',
        // cancelButtonColor: '#d33', // No necesario
        confirmButtonText: 'OK',
      });
    }
  }

  monitorFormChanges() {
    Object.keys(this.nuevocajaconceptoForm.controls).forEach(field => {
      const control = this.nuevocajaconceptoForm.get(field);
      control?.valueChanges.pipe(debounceTime(500)).subscribe(value => { // Reducido debounceTime para mejor UX
        console.log(`El campo ${field} cambió a: `, value);
        this.descripcionFlag = this.nuevocajaconceptoForm.controls['descripcion'].invalid && this.nuevocajaconceptoForm.controls['descripcion'].touched;
        this.tipoConceptoFlag = this.nuevocajaconceptoForm.controls['tipo_concepto'].invalid && this.nuevocajaconceptoForm.controls['tipo_concepto'].touched;
        this.fijaFlag = this.nuevocajaconceptoForm.controls['fija'].invalid && this.nuevocajaconceptoForm.controls['fija'].touched;
        this.ingresoEgresoFlag = this.nuevocajaconceptoForm.controls['ingreso_egreso'].invalid && this.nuevocajaconceptoForm.controls['ingreso_egreso'].touched;
        this.idCajaFlag = this.nuevocajaconceptoForm.controls['id_caja'].invalid && this.nuevocajaconceptoForm.controls['id_caja'].touched;
      });
    });
  }

   markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
