import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editvalorcambio',
  templateUrl: './editvalorcambio.component.html',
  styleUrls: ['./editvalorcambio.component.css']
})
export class EditvalorcambioComponent implements OnInit {
  public valorcambioForm!: FormGroup;
  public codmoneFlag: boolean = false;
  public desvalorFlag: boolean = false;
  public vcambioFlag: boolean = false;
  public currentValorCambio: any = null;
  private id_valor: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadValorCambioData();
  }

  initForm(): void {
    this.valorcambioForm = this.fb.group({
      codmone: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,2}$/)
      ])),
      desvalor: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(30)
      ])),
      fecdesde: new FormControl('', Validators.required),
      fechasta: new FormControl(''),
      vcambio: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/)
      ])),
      id_valor: new FormControl('')
    });

    this.monitorFormChanges();
  }

  loadValorCambioData(): void {
    this.route.queryParams.subscribe(params => {
      console.log(params);
      if (params['valorCambio']) {
        try {
          const valorcambioData = JSON.parse(params['valorCambio']);
          this.id_valor = valorcambioData.id_valor;
          console.log(this.id_valor);
          this.currentValorCambio = valorcambioData;
          this.valorcambioForm.patchValue({
            codmone: this.currentValorCambio.codmone,
            desvalor: this.currentValorCambio.desvalor.trim(),
            fecdesde: this.formatDate(this.currentValorCambio.fecdesde),
            fechasta: this.formatDate(this.currentValorCambio.fechasta),
            vcambio: this.currentValorCambio.vcambio,
            id_valor: this.id_valor
          });
        } catch (error) {
          console.error('Error parsing valor cambio data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información del valor de cambio',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (this.valorcambioForm.valid) {
      const valorcambioData = {
        id_valor: this.id_valor,
        codmone: this.valorcambioForm.value.codmone,
        desvalor: this.valorcambioForm.value.desvalor,
        fecdesde: this.valorcambioForm.value.fecdesde,
        fechasta: this.valorcambioForm.value.fechasta,
        vcambio: this.valorcambioForm.value.vcambio
      };

      this.subirdata.updateValorCambio(valorcambioData).subscribe((response: any) => {
        Swal.fire({
          title: 'Actualizando...',
          timer: 300,
          didOpen: () => {
            Swal.showLoading();
          }
        }).then((result) => {
          if (result.dismiss === Swal.DismissReason.timer) {
            Swal.fire({
              title: '¡Éxito!',
              text: 'El valor de cambio se actualizó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            console.log('Valor de cambio actualizado correctamente');
            this.router.navigate(['components/valorcambio']);
          }
        });
      }, error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el valor de cambio',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
    } else {
      this.markFormGroupTouched(this.valorcambioForm);
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
    this.router.navigate(['components/valorcambio']);
  }

  monitorFormChanges(): void {
    Object.keys(this.valorcambioForm.controls).forEach(field => {
      const control = this.valorcambioForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codmoneFlag = this.valorcambioForm.controls['codmone'].invalid;
        this.desvalorFlag = this.valorcambioForm.controls['desvalor'].invalid;
        this.vcambioFlag = this.valorcambioForm.controls['vcambio'].invalid;
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
