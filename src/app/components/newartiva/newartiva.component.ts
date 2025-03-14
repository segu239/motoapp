import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newartiva',
  templateUrl: './newartiva.component.html',
  styleUrls: ['./newartiva.component.css']
})
export class NewartivaComponent {
  public nuevoivaForm!: FormGroup;
  public codIvaFlag: boolean = false;
  public descripcionFlag: boolean = false;
  public tipoAli1Flag: boolean = false;
  public alicuota1Flag: boolean = false;

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder
  ) {
    this.cargarForm();
    this.monitorFormChanges();
  }

  cargarForm() {
    this.nuevoivaForm = this.fb.group({
      cod_iva: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{0,2}$/)
      ])),
      descripcion: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,30}$/)
      ])),
      desde: new FormControl(new Date()),
      hasta: new FormControl(null),
      tipo_ali_1: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,10}$/)
      ])),
      alicuota1: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.min(0)
      ])),
      tipo_ali_2: new FormControl(''),
      alicuota2: new FormControl(0),
      tipo_ali_3: new FormControl(''),
      alicuota3: new FormControl(0),
      cuit: new FormControl(false)
    });
  }

  guardar(form: FormGroup) {
    // Format dates to YYYY-MM-DD format
    const formatDate = (date: any): string => {
      if (!date) return '';
      const dateObj = new Date(date);
      return dateObj.getFullYear() + '-' + 
             String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
             String(dateObj.getDate()).padStart(2, '0');
    };
    if (form.valid) {
      let nuevoIva = {
        "cod_iva": form.value.cod_iva,
        "descripcion": form.value.descripcion,
        "desde": formatDate(form.value.desde),
        "hasta": formatDate(form.value.hasta),
        "tipo_ali_1": form.value.tipo_ali_1,
        "alicuota1": form.value.alicuota1,
        "tipo_ali_2": form.value.tipo_ali_2,
        "alicuota2": form.value.alicuota2,
        "tipo_ali_3": form.value.tipo_ali_3,
        "alicuota3": form.value.alicuota3,
        "cuit": form.value.cuit
      }
      console.log(nuevoIva);
      this.subirdata.subirDatosArtIva(nuevoIva).subscribe((data: any) => {
        console.log(nuevoIva);
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
    Object.keys(this.nuevoivaForm.controls).forEach(field => {
      const control = this.nuevoivaForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codIvaFlag = this.nuevoivaForm.controls['cod_iva'].invalid;
        this.descripcionFlag = this.nuevoivaForm.controls['descripcion'].invalid;
        this.tipoAli1Flag = this.nuevoivaForm.controls['tipo_ali_1'].invalid;
        this.alicuota1Flag = this.nuevoivaForm.controls['alicuota1'].invalid;
      });
    });
  }
}
