import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newarticulo',
  templateUrl: './newarticulo.component.html',
  styleUrls: ['./newarticulo.component.css']
})
export class NewarticuloComponent {
  public nuevoarticuloForm!: FormGroup;
  public nomartFlag: boolean = false;
  public cd_barraFlag: boolean = false;
  public rubros: any;
  public marcas: any;
  public tiposIva: any;
  public proveedores: any;

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder,
    private cargardata: CargardataService
  ) {
    this.cargarForm();
    this.monitorFormChanges();
    this.cargarRubros();
    this.cargarMarcas();
    this.cargarTiposIva();
    this.cargarProveedores();
  }

  cargarRubros() {
    this.cargardata.getRubro().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.rubros = response.mensaje;
          console.log('Rubros cargados:', this.rubros);
        } else {
          console.error('Error loading rubros:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarMarcas() {
    this.cargardata.getMarca().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.marcas = response.mensaje;
        } else {
          console.error('Error loading marcas:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarTiposIva() {
    this.cargardata.getArtIva().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposIva = response.mensaje;
        } else {
          console.error('Error loading tipos IVA:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarProveedores() {
    this.cargardata.getProveedor().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.proveedores = response.mensaje;
        } else {
          console.error('Error loading proveedores:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarForm() {
    this.nuevoarticuloForm = this.fb.group({
      nomart: new FormControl('', Validators.compose([
        Validators.required,
        Validators.maxLength(80)
      ])),
      marca: new FormControl('', Validators.required),
      cd_articulo: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,6}$/) // Patrón para aceptar hasta 6 dígitos numéricos
      ])),
      cod_deposito: new FormControl(0, Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,2}$/) // Patrón para aceptar hasta 2 dígitos numéricos
      ])),
      precon: new FormControl(0, Validators.required),
      prefi1: new FormControl(0),
      prefi2: new FormControl(0),
      prefi3: new FormControl(0),
      prefi4: new FormControl(0),
      exi1: new FormControl(0),
      exi2: new FormControl(0),
      exi3: new FormControl(0),
      exi4: new FormControl(0),
      exi5: new FormControl(0),
      stkmin1: new FormControl(0),
      stkmax1: new FormControl(0),
      stkprep1: new FormControl(0),
      stkmin2: new FormControl(0),
      stkmax2: new FormControl(0),
      stkprep2: new FormControl(0),
      stkmin3: new FormControl(0),
      stkmax3: new FormControl(0),
      stkprep3: new FormControl(0),
      stkmin4: new FormControl(0),
      stkmax4: new FormControl(0),
      stkprep4: new FormControl(0),
      stkmin5: new FormControl(0),
      stkmax5: new FormControl(0),
      stkprep5: new FormControl(0),
      //cd_articulo: new FormControl(0),
      cd_proveedor: new FormControl(''),
      cd_barra: new FormControl('', Validators.compose([
        Validators.maxLength(13)
      ])),
      idart: new FormControl(0),
      estado: new FormControl('AC', Validators.required),
      rubro: new FormControl('', Validators.required),
      articulo: new FormControl(0),
      cod_iva: new FormControl('', Validators.required),
      prebsiva: new FormControl(0),
      precostosi: new FormControl(0),
      margen: new FormControl(0),
      descuento: new FormControl(0),
     // cod_deposito: new FormControl(0),
      tipo_moneda: new FormControl(1)
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      console.log(form.value);
      this.subirdata.subirDatosArticulo(form.value).subscribe({
        next: (data: any) => {
          Swal.fire({
            title: 'Guardando...',
            timer: 300,
            didOpen: () => {
              Swal.showLoading()
            }
          }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
              Swal.fire({
                title: '¡Éxito!',
                text: 'El artículo se ha guardado correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              this.router.navigate(['components/articulo']);
            }
          });
        },
        error: (error) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo guardar el artículo',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error saving articulo:', error);
        }
      });
    } else {
      this.monitorFormChanges();
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
    Object.keys(this.nuevoarticuloForm.controls).forEach(field => {
      const control = this.nuevoarticuloForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        this.nomartFlag = this.nuevoarticuloForm.controls['nomart'].invalid;
        this.cd_barraFlag = this.nuevoarticuloForm.controls['cd_barra'].invalid;
      });
    });
  }
}
