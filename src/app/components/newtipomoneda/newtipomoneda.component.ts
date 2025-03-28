import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-newtipomoneda',
  templateUrl: './newtipomoneda.component.html',
  styleUrls: ['./newtipomoneda.component.css']
})
export class NewtipomonedaComponent {
  public tipoMonedaForm!: FormGroup;
  public codMonedaFlag: boolean = false;
  public monedaFlag: boolean = false;
  public simboloFlag: boolean = false;

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder
  ) {
    this.cargarForm();
    this.monitorFormChanges();
  }

  cargarForm() {
    this.tipoMonedaForm = this.fb.group({
      cod_mone: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,3}$/)
      ])),
      moneda: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,30}$/)
      ])),
      simbolo: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ$€£¥]{1,5}$/)
      ]))
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      let nuevaTipoMoneda = {
        "cod_mone": form.value.cod_mone,
        "moneda": form.value.moneda,
        "simbolo": form.value.simbolo
      }

      this.subirdata.subirDatosTipoMoneda(nuevaTipoMoneda).subscribe({
        next: (data: any) => {
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
              window.history.back();
            }
          });
        },
        error: (error) => {
          Swal.fire({
            title: 'Error',
            text: 'Ocurrió un error al guardar el tipo de moneda',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error guardando tipo de moneda:', error);
        }
      });
    } else {
      this.monitorFormChanges();
      console.log(form.errors);
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos inválidos o vacíos',
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'OK',
      });

      for (const control in form.controls) {
        form.get(control)?.markAsTouched();
      }
    }
  }

  monitorFormChanges() {
    Object.keys(this.tipoMonedaForm.controls).forEach(field => {
      const control = this.tipoMonedaForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codMonedaFlag = this.tipoMonedaForm.controls['cod_mone'].invalid;
        this.monedaFlag = this.tipoMonedaForm.controls['moneda'].invalid;
        this.simboloFlag = this.tipoMonedaForm.controls['simbolo'].invalid;
      });
    });
  }

  onCancel() {
    this.router.navigate(['components/tipomoneda']);
  }
}
