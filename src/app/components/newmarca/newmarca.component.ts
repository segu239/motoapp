import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newmarca',
  templateUrl: './newmarca.component.html',
  styleUrls: ['./newmarca.component.css']
})
export class NewmarcaComponent {
  public nuevomarcaForm!: FormGroup;
  public codigoFlag: boolean = false;
  public marcaFlag: boolean = false;

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder
  ) {
    this.cargarForm();
    this.monitorFormChanges();
  }

  cargarForm() {
    this.nuevomarcaForm = this.fb.group({
      codigo: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ]{1,6}$/)
      ])),
      marca: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,30}$/)
      ]))
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      let nuevaMarca = {
        "cod_marca": form.value.codigo,
        "marca": form.value.marca
      }

      this.subirdata.subirDatosMarca(nuevaMarca).subscribe((data: any) => {
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

  monitorFormChanges(): void {
    Object.keys(this.nuevomarcaForm?.controls || {}).forEach(field => {
      const control = this.nuevomarcaForm?.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codigoFlag = this.nuevomarcaForm?.controls['codigo'].invalid;
        this.marcaFlag = this.nuevomarcaForm?.controls['marca'].invalid;
      });
    });
  }
}