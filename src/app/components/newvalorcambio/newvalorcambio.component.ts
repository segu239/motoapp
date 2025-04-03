import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { CargardataService } from 'src/app/services/cargardata.service';
import { debounceTime } from 'rxjs/operators';

interface TipoMoneda {
  cod_mone: number;
  moneda: string;
  simbolo: string;
  id_moneda: number;
}

@Component({
  selector: 'app-newvalorcambio',
  templateUrl: './newvalorcambio.component.html',
  styleUrls: ['./newvalorcambio.component.css']
})
export class NewvalorcambioComponent {
  public valorCambioForm!: FormGroup;
  public codMoneFlag: boolean = false;
  public desValorFlag: boolean = false;
  public fecDesdeFlag: boolean = false;
  public fecHastaFlag: boolean = false;
  public vCambioFlag: boolean = false;
  public tiposMoneda: TipoMoneda[] = [];

  constructor(
    private subirdata: SubirdataService,
    private cargardataService: CargardataService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.cargarForm();
    this.monitorFormChanges();
    this.cargarTiposMoneda();
  }

  cargarTiposMoneda() {
    this.cargardataService.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
        } else {
          console.error('Error loading tipos de moneda:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarForm() {
    this.valorCambioForm = this.fb.group({
      codmone: new FormControl('', Validators.compose([
        Validators.required
      ])),
      desvalor: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,30}$/)
      ])),
      fecdesde: new FormControl('', Validators.required),
      fechasta: new FormControl('', Validators.required),
      vcambio: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/)
      ]))
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      // Format dates to YYYY-MM-DD format
      const formatDate = (date: any): string => {
        if (!date) return '';
        const dateObj = new Date(date);
        return dateObj.getFullYear() + '-' + 
               String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
               String(dateObj.getDate()).padStart(2, '0');
      };

      let nuevoValorCambio = {
        "codmone": Number(form.value.codmone),
        "desvalor": form.value.desvalor,
        "fecdesde": formatDate(form.value.fecdesde),
        "fechasta": formatDate(form.value.fechasta),
        "vcambio": form.value.vcambio
      }

      this.subirdata.subirDatosValorCambio(nuevoValorCambio).subscribe({
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
            text: 'Ocurrió un error al guardar el valor de cambio',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error guardando valor de cambio:', error);
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
    Object.keys(this.valorCambioForm.controls).forEach(field => {
      const control = this.valorCambioForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codMoneFlag = this.valorCambioForm.controls['codmone'].invalid;
        this.desValorFlag = this.valorCambioForm.controls['desvalor'].invalid;
        this.fecDesdeFlag = this.valorCambioForm.controls['fecdesde'].invalid;
        this.fecHastaFlag = this.valorCambioForm.controls['fechasta'].invalid;
        this.vCambioFlag = this.valorCambioForm.controls['vcambio'].invalid;
      });
    });
  }

  onCancel() {
    this.router.navigate(['components/valorcambio']);
  }
}
