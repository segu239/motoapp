import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newrubro',
  templateUrl: './newrubro.component.html',
  styleUrls: ['./newrubro.component.css']
})
export class NewrubroComponent {
  public nuevorubroForm!: FormGroup;
  public codigoFlag: boolean = false;
  public rubroFlag: boolean = false;
  public numeradorFlag: boolean = false;

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder
  ) {
    this.cargarForm();
    this.monitorFormChanges();
  }

  cargarForm() {
    this.nuevorubroForm = this.fb.group({
      codigo: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ]{1,4}$/)
      ])),
      rubro: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,30}$/)
      ])),
      numerador: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,4}$/)
      ])),
      modiprecio: new FormControl(0, Validators.required),
      modidescri: new FormControl(0, Validators.required),
      cod_depo: new FormControl(0, Validators.required),
      mustuni: new FormControl(0, Validators.required),
      // id_rubro: new FormControl(0)
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      let nuevoRubro = {
        "cod_rubro": form.value.codigo,
        "rubro": form.value.rubro,
        "numerador": form.value.numerador,
        "modiprecio": form.value.modiprecio,
        "modidescri": form.value.modidescri,
        "cod_depo": form.value.cod_depo,
        "mustuni": form.value.mustuni,
        // "id_rubro": form.value.id_rubro
      }

      this.subirdata.subirDatosRubro(nuevoRubro).subscribe((data: any) => {
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
        })
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
    Object.keys(this.nuevorubroForm.controls).forEach(field => {
      const control = this.nuevorubroForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codigoFlag = this.nuevorubroForm.controls['codigo'].invalid;
        this.rubroFlag = this.nuevorubroForm.controls['rubro'].invalid;
        this.numeradorFlag = this.nuevorubroForm.controls['numerador'].invalid;
      });
    });
  }
}
