import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editarticulo',
  templateUrl: './editarticulo.component.html',
  styleUrls: ['./editarticulo.component.css']
})
export class EditarticuloComponent implements OnInit {
  public articuloForm!: FormGroup;
  public nomartFlag: boolean = false;
  public cd_barraFlag: boolean = false;
  public currentArticulo: any = null;
  public rubros: any;
  public marcas: any;
  public tiposIva: any;
  public proveedores: any;
  private id_articulo: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarRubros();
    this.cargarMarcas();
    this.cargarTiposIva();
    this.cargarProveedores();
    this.loadArticuloData();
  }

  initForm(): void {
    this.articuloForm = this.fb.group({
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
      estado: new FormControl('', Validators.required),
      rubro: new FormControl('', Validators.required),
      articulo: new FormControl(0),
      cod_iva: new FormControl('', Validators.required),
      prebsiva: new FormControl(0),
      precostosi: new FormControl(0),
      margen: new FormControl(0),
      descuento: new FormControl(0),
     // cod_deposito: new FormControl(0),
      tipo_moneda: new FormControl(0)
    });

    this.monitorFormChanges();
  }

  cargarRubros() {
    this.cargardata.getRubro().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.rubros = response.mensaje;
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

  loadArticuloData(): void {
    this.route.queryParams.subscribe(params => {
      if (params['articulo']) {
        try {
          const articuloData = JSON.parse(params['articulo']);
          console.log('Articulo data:', articuloData);
          this.id_articulo = articuloData.id_articulo;
          this.currentArticulo = articuloData;
          
          // Patch the form with the article data
          this.articuloForm.patchValue({
            nomart: this.currentArticulo.nomart ? this.currentArticulo.nomart.trim() : '',
            marca: this.currentArticulo.marca.trim(),
            cd_articulo: this.currentArticulo.cd_articulo,
          cod_deposito: this.currentArticulo.cod_deposito,
            precon: this.currentArticulo.precon,
            prefi1: this.currentArticulo.prefi1,
            prefi2: this.currentArticulo.prefi2,
            prefi3: this.currentArticulo.prefi3,
            prefi4: this.currentArticulo.prefi4,
            exi1: this.currentArticulo.exi1,
            exi2: this.currentArticulo.exi2,
            exi3: this.currentArticulo.exi3,
            exi4: this.currentArticulo.exi4,
            exi5: this.currentArticulo.exi5,
            stkmin1: this.currentArticulo.stkmin1,
            stkmax1: this.currentArticulo.stkmax1,
            stkprep1: this.currentArticulo.stkprep1,
            stkmin2: this.currentArticulo.stkmin2,
            stkmax2: this.currentArticulo.stkmax2,
            stkprep2: this.currentArticulo.stkprep2,
            stkmin3: this.currentArticulo.stkmin3,
            stkmax3: this.currentArticulo.stkmax3,
            stkprep3: this.currentArticulo.stkprep3,
            stkmin4: this.currentArticulo.stkmin4,
            stkmax4: this.currentArticulo.stkmax4,
            stkprep4: this.currentArticulo.stkprep4,
            stkmin5: this.currentArticulo.stkmin5,
            stkmax5: this.currentArticulo.stkmax5,
            stkprep5: this.currentArticulo.stkprep5,
            //cd_articulo: this.currentArticulo.cd_articulo,
            cd_proveedor: this.currentArticulo.cd_proveedor,
            cd_barra: this.currentArticulo.cd_barra ? this.currentArticulo.cd_barra.trim() : '',
            idart: this.currentArticulo.idart,
            estado: this.currentArticulo.estado ? this.currentArticulo.estado.trim() : '',
            rubro: this.currentArticulo.rubro ? this.currentArticulo.rubro.trim() : '',
            articulo: this.currentArticulo.articulo,
            cod_iva: this.currentArticulo.cod_iva,
            prebsiva: this.currentArticulo.prebsiva,
            precostosi: this.currentArticulo.precostosi,
            margen: this.currentArticulo.margen,
            descuento: this.currentArticulo.descuento,
            //cod_deposito: this.currentArticulo.cod_deposito,
            tipo_moneda: this.currentArticulo.tipo_moneda
          });
        } catch (error) {
          console.error('Error parsing articulo data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información del artículo',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.articuloForm.valid) {
      const articuloData = {
        ...this.articuloForm.value,
        id_articulo: this.id_articulo
      };

      this.subirdata.updateArticulo(articuloData).subscribe({
        next: (response: any) => {
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
                text: 'El artículo se actualizó correctamente',
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
            text: 'No se pudo actualizar el artículo',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          console.error('Error updating articulo:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.articuloForm);
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
    this.router.navigate(['components/articulo']);
  }

  monitorFormChanges(): void {
    Object.keys(this.articuloForm.controls).forEach(field => {
      const control = this.articuloForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        this.nomartFlag = this.articuloForm.controls['nomart'].invalid;
        this.cd_barraFlag = this.articuloForm.controls['cd_barra'].invalid;
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
