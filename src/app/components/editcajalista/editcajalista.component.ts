import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service'; // Asegúrate que la ruta sea correcta
import { CargardataService } from '../../services/cargardata.service'; // Asegúrate que la ruta sea correcta
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {formatDate} from '@angular/common'; // Importar formatDate

@Component({
  selector: 'app-editcajalista',
  templateUrl: './editcajalista.component.html',
  styleUrls: ['./editcajalista.component.css'] // Asegúrate que la ruta sea correcta
})
export class EditCajaListaComponent implements OnInit {
  public cajaListaForm!: FormGroup;
  public descripcionFlag: boolean = false;
  // Otras flags si son necesarias
  public currentCajaLista: any = null;
  private id_caja: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService, // Mantener por consistencia
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCajaListaData();
  }

  initForm(): void {
    this.cajaListaForm = this.fb.group({
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

    this.monitorFormChanges();
  }

  loadCajaListaData(): void {
    this.route.queryParams.subscribe(params => {
      if (params['cajaLista']) {
        try {
          const cajaListaData = JSON.parse(params['cajaLista']);
          this.id_caja = cajaListaData.id_caja;
          this.currentCajaLista = cajaListaData;

          // Formatear fecha para el input type="date" (YYYY-MM-DD)
           const formattedDate = this.currentCajaLista.fecha_cierre
            ? formatDate(this.currentCajaLista.fecha_cierre, 'yyyy-MM-dd', 'en-US')
            : '';


          this.cajaListaForm.patchValue({
            descripcion: this.currentCajaLista.descripcion.trim(),
            fecha_cierre: formattedDate, // Usar fecha formateada
            especial: this.currentCajaLista.especial, // Asumiendo que ya es número
            fija: this.currentCajaLista.fija // Asumiendo que ya es número
          });
        } catch (error) {
          console.error('Error parsing caja lista data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información de la caja lista',
            icon: 'error',
            confirmButtonText: 'OK'
          });
           this.router.navigate(['components/cajalista']); // Volver a la lista si hay error
        }
      } else {
         this.router.navigate(['components/cajalista']); // Volver si no hay datos
      }
    });
  }

  onSubmit(): void {
    if (this.cajaListaForm.valid) {
      const cajaListaData = {
        id_caja: this.id_caja,
        descripcion: this.cajaListaForm.value.descripcion,
        fecha_cierre: this.cajaListaForm.value.fecha_cierre,
        especial: this.cajaListaForm.value.especial,
        fija: this.cajaListaForm.value.fija
      };

      this.subirdata.updateCajaLista(cajaListaData).subscribe((response: any) => {
        Swal.fire({
          title: 'Actualizando...',
          timer: 300,
          didOpen: () => {
            Swal.showLoading();
          }
        }).then((result) => {
          if (result.dismiss === Swal.DismissReason.timer) {
             if (!response.error) {
                 Swal.fire({
                  title: '¡Éxito!',
                  text: 'La caja lista se actualizó correctamente',
                  icon: 'success',
                  confirmButtonText: 'Aceptar'
                });
                console.log('Caja lista actualizada correctamente');
                this.router.navigate(['components/cajalista']);
             } else {
                 Swal.fire({
                    title: 'Error',
                    text: 'No se pudo actualizar la caja lista: ' + response.mensaje,
                    icon: 'error',
                    confirmButtonText: 'OK'
                    });
             }
          }
        });
      }, error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la caja lista',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        console.error('Error updating caja lista:', error);
      });
    } else {
      this.markFormGroupTouched(this.cajaListaForm);
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
    this.router.navigate(['components/cajalista']);
  }

  monitorFormChanges(): void {
    Object.keys(this.cajaListaForm.controls).forEach(field => {
      const control = this.cajaListaForm.get(field);
      control?.valueChanges.pipe(debounceTime(500)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
         this.descripcionFlag = this.cajaListaForm.controls['descripcion'].invalid && this.cajaListaForm.controls['descripcion'].touched;
         // Añadir más flags si se necesita
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
