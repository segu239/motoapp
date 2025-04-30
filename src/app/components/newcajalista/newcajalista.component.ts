import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service'; // Asegúrate que la ruta sea correcta
import { CargardataService } from '../../services/cargardata.service'; // Asegúrate que la ruta sea correcta
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newcajalista',
  templateUrl: './newcajalista.component.html',
  styleUrls: ['./newcajalista.component.css'] // Asegúrate que la ruta sea correcta
})
export class NewCajaListaComponent {
  public nuevaCajaListaForm!: FormGroup;
  public descripcionFlag: boolean = false;
  // No se necesitan otras flags específicas como en el ejemplo de rubro

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private fb: FormBuilder,
    private cargardata: CargardataService // Aunque no se usa para cargar datos aquí, se mantiene por consistencia si es necesario en futuro
  ) {
    this.cargarForm();
    this.monitorFormChanges();
  }

  cargarForm() {
    this.nuevaCajaListaForm = this.fb.group({
      descripcion: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(80)
      ])),
      fecha_cierre: new FormControl('', Validators.required),
      especial: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[01]$/)
      ])),
      fija: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[01]$/)
      ]))
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      let nuevaCajaLista = {
        "descripcion": form.value.descripcion,
        "fecha_cierre": form.value.fecha_cierre,
        "especial": form.value.especial,
        "fija": form.value.fija,
      }

      this.subirdata.subirDatosCajaLista(nuevaCajaLista).subscribe((data: any) => {
        console.log(data);
        Swal.fire({
          title: 'Guardando...',
          timer: 300,
          didOpen: () => {
            Swal.showLoading()
          }
        }).then((result) => {
          if (result.dismiss === Swal.DismissReason.timer) {
            console.log('I was closed by the timer')
            this.router.navigate(['components/cajalista']); // Navegar a la lista
            // window.history.back(); // Alternativa si prefieres volver a la página anterior
          }
        })
      }, (error) => {
          console.error('Error saving caja lista:', error);
           Swal.fire({
            title: '¡Error!',
            text: 'No se pudo guardar la caja lista',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
      });
    } else {
      this.monitorFormChanges(); // Re-evaluar flags por si acaso
      console.log(form.errors);
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos inválidos o vacíos',
        icon: 'error',
        showCancelButton: false, // No tiene sentido el cancel en este caso
        confirmButtonColor: '#3085d6',
        // cancelButtonColor: '#d33', // No necesario
        confirmButtonText: 'OK',
      });

      // Marcar todos los campos como tocados para mostrar errores
      Object.values(this.nuevaCajaListaForm.controls).forEach(control => {
            control.markAsTouched();
      });
    }
  }

  monitorFormChanges() {
    // Monitorea cambios para actualizar flags si es necesario (menos relevante aquí que en rubro)
    Object.keys(this.nuevaCajaListaForm.controls).forEach(field => {
      const control = this.nuevaCajaListaForm.get(field);
      control?.valueChanges.pipe(debounceTime(500)).subscribe(value => { // Reducido el debounce
        console.log(`El campo ${field} cambió a: `, value);
        this.descripcionFlag = this.nuevaCajaListaForm.controls['descripcion'].invalid && this.nuevaCajaListaForm.controls['descripcion'].touched;
        // Podrías añadir más flags si necesitas feedback visual específico
      });
    });
  }
}
