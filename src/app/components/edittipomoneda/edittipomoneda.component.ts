import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

interface TipoMoneda {
  cod_mone: number;
  moneda: string;
  simbolo: string;
  id_moneda: number;
}

@Component({
  selector: 'app-edittipomoneda',
  templateUrl: './edittipomoneda.component.html',
  styleUrls: ['./edittipomoneda.component.css']
})
export class EdittipomonedaComponent implements OnInit {
  tipoMonedaForm: FormGroup;
  currentTipoMoneda: TipoMoneda | null = null;
  public codMonedaFlag: boolean = false;
  public monedaFlag: boolean = false;
  public simboloFlag: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subirdataService: SubirdataService
  ) {
    this.tipoMonedaForm = new FormGroup({
      cod_mone: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[0-9]{1,3}$/)
      ]),
      moneda: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,30}$/)
      ]),
      simbolo: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ$€£¥]{1,5}$/)
      ]),
      id_moneda: new FormControl('')
    });
    
    this.monitorFormChanges();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tipoMoneda']) {
        this.currentTipoMoneda = JSON.parse(params['tipoMoneda']);
        this.tipoMonedaForm.patchValue(this.currentTipoMoneda);
      }
    });
  }

  onSubmit() {
    if (this.tipoMonedaForm.valid) {
      const tipoMonedaData = this.tipoMonedaForm.value;
      if (this.currentTipoMoneda?.id_moneda) {
        // Update existing tipo moneda
        this.subirdataService.updateTipoMoneda(tipoMonedaData).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Éxito!',
              text: 'El tipo de moneda se actualizó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            console.log('Tipo de moneda updated successfully');
            this.router.navigate(['components/tipomoneda']);
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'Ocurrió un error al actualizar el tipo de moneda',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
            console.error('Error updating tipo de moneda:', error);
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.tipoMonedaForm);
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos inválidos o vacíos',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  }

  onCancel() {
    this.router.navigate(['components/tipomoneda']);
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

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
