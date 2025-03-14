import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editrubro',
  templateUrl: './editrubro.component.html',
  styleUrls: ['./editrubro.component.css']
})
export class EditrubroComponent implements OnInit {
  public rubroForm!: FormGroup;
  public codigoFlag: boolean = false;
  public rubroFlag: boolean = false;
  public numeradorFlag: boolean = false;
  public currentRubro: any = null;
  private id_rubro: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadRubroData();
  }

  initForm(): void {
    this.rubroForm = this.fb.group({
      cod_rubro: new FormControl('', Validators.compose([
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
      mustuni: new FormControl(0, Validators.required)
    });

    this.monitorFormChanges();
  }



    loadRubroData(): void {
      this.route.queryParams.subscribe(params => {
        console.log(params);
        if (params['rubro']) {
          try {
            const rubroData = JSON.parse(params['rubro']);
            this.id_rubro = rubroData.id_rubro;
            console.log(this.id_rubro);
            this.currentRubro = rubroData;
            this.rubroForm.patchValue({
              cod_rubro: this.currentRubro.cod_rubro,
              rubro: this.currentRubro.rubro,
              numerador: this.currentRubro.numerador,
              modiprecio: this.currentRubro.modiprecio,
              modidescri: this.currentRubro.modidescri,
              cod_depo: this.currentRubro.cod_depo,
              mustuni: this.currentRubro.mustuni
            });
          } catch (error) {
            console.error('Error parsing rubro data:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo cargar la información del rubro',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          }
        }
      });
    }

  onSubmit(): void {
    if (this.rubroForm.valid) {
      const rubroData = {
        id_rubro: this.id_rubro,
        cod_rubro: this.rubroForm.value.cod_rubro,
        rubro: this.rubroForm.value.rubro,
        numerador: this.rubroForm.value.numerador,
        modiprecio: this.rubroForm.value.modiprecio,
        modidescri: this.rubroForm.value.modidescri,
        cod_depo: this.rubroForm.value.cod_depo,
        mustuni: this.rubroForm.value.mustuni
      };

      this.subirdata.updateRubro(rubroData).subscribe((response: any) => {
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
              text: 'El rubro se actualizó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            console.log('Rubro actualizado correctamente');
            this.router.navigate(['components/rubro']);
          }
        });
      }, error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el rubro',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
    } else {
      this.markFormGroupTouched(this.rubroForm);
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
    this.router.navigate(['/rubro']);
  }

  monitorFormChanges(): void {
    Object.keys(this.rubroForm.controls).forEach(field => {
      const control = this.rubroForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codigoFlag = this.rubroForm.controls['cod_rubro'].invalid;
        this.rubroFlag = this.rubroForm.controls['rubro'].invalid;
        this.numeradorFlag = this.rubroForm.controls['numerador'].invalid;
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
