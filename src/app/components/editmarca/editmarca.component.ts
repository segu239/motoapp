import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editmarca',
  templateUrl: './editmarca.component.html',
  styleUrls: ['./editmarca.component.css']
})
export class EditmarcaComponent implements OnInit {
  public marcaForm!: FormGroup;
  public codigoFlag: boolean = false;
  public marcaFlag: boolean = false;
  public currentMarca: any = null;
  private id_marca: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMarcaData();
  }

  initForm(): void {
    this.marcaForm = this.fb.group({
      cod_marca: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ]{1,6}$/)
      ])),
      marca: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,30}$/)
      ]))
    });

    this.monitorFormChanges();
  }

  loadMarcaData(): void {
    this.route.queryParams.subscribe(params => {
      console.log(params);
      if (params['marca']) {
        try {
          const marcaData = JSON.parse(params['marca']);
          this.id_marca = marcaData.id_marca;
          console.log(this.id_marca);
          this.currentMarca = marcaData;
          this.marcaForm.patchValue({
            cod_marca: this.currentMarca.cod_marca.trim(),
            marca: this.currentMarca.marca.trim()
          });
        } catch (error) {
          console.error('Error parsing marca data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información de la marca',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.marcaForm.valid) {
      const marcaData = {
        id_marca: this.id_marca,
        cod_marca: this.marcaForm.value.cod_marca,
        marca: this.marcaForm.value.marca
      };

      this.subirdata.updateMarca(marcaData).subscribe((response: any) => {
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
              text: 'La marca se actualizó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            console.log('Marca actualizada correctamente');
            this.router.navigate(['components/marca']);
          }
        });
      }, error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la marca',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
    } else {
      this.markFormGroupTouched(this.marcaForm);
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
    this.router.navigate(['/components/marca']);
  }

  monitorFormChanges(): void {
    Object.keys(this.marcaForm.controls).forEach(field => {
      const control = this.marcaForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codigoFlag = this.marcaForm.controls['cod_marca'].invalid;
        this.marcaFlag = this.marcaForm.controls['marca'].invalid;
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
