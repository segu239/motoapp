import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-newrubroprincipal',
  templateUrl: './newrubroprincipal.component.html',
  styleUrls: ['./newrubroprincipal.component.css']
})
export class NewrubroprincipalComponent {
  public nuevorubroForm!: FormGroup;
  public codigoFlag: boolean;
  public rubroFlag: boolean;

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
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ]{1,2}$/)
      ])),
      rubro: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ]{1,30}$/)
      ]))
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      let nuevoRubro = {
        "cod_rubro": form.value.codigo,
        "rubro": form.value.rubro
      }

      this.subirdata.subirDatosRubroPrincipal(nuevoRubro).subscribe((data: any) => {
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
        form.get(control).markAsTouched();
      }
    }
  }

  monitorFormChanges() {
    Object.keys(this.nuevorubroForm.controls).forEach(field => {
      const control = this.nuevorubroForm.get(field);
      control.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codigoFlag = this.nuevorubroForm.controls['codigo'].invalid;
        this.rubroFlag = this.nuevorubroForm.controls['rubro'].invalid;
      });
    });
  }
}