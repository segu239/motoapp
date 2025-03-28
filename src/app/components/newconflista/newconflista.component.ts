import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newconflista',
  templateUrl: './newconflista.component.html',
  styleUrls: ['./newconflista.component.css']
})
export class NewconflistaComponent {
  public nuevoconflistaForm!: FormGroup;
  public listapFlag: boolean = false;
  public tiposMoneda: any[] = [];
  public marcas: any[] = [];

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder,
    private cargardata: CargardataService
  ) {
    this.cargarForm();
    this.monitorFormChanges();
    this.cargarTiposMoneda();
    this.cargarMarcas();
  }

  cargarTiposMoneda() {
    this.cargardata.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados:', this.tiposMoneda);
        } else {
          console.error('Error loading tipos de moneda:', response.mensaje);
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
          console.log('Marcas cargadas:', this.marcas);
        } else {
          console.error('Error loading marcas:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarForm() {
    this.nuevoconflistaForm = this.fb.group({
      listap: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,4}$/)
      ])),
      activa: new FormControl(false),
      precosto21: new FormControl(0, Validators.required),
      precosto105: new FormControl(0, Validators.required),
      pordcto: new FormControl(0, Validators.required),
      margen: new FormControl(0, Validators.required),
      preciof21: new FormControl(0, Validators.required),
      preciof105: new FormControl(0, Validators.required),
      rmargen: new FormControl(false),
      tipomone: new FormControl('', Validators.required),
      actprov: new FormControl(false),
      cod_marca: new FormControl('', Validators.required),
      fecha: new FormControl(new Date().toISOString().split('T')[0], Validators.required)
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      let nuevaConflista = {
        "listap": form.value.listap,
        "activa": form.value.activa,
        "precosto21": form.value.precosto21,
        "precosto105": form.value.precosto105,
        "pordcto": form.value.pordcto,
        "margen": form.value.margen,
        "preciof21": form.value.preciof21,
        "preciof105": form.value.preciof105,
        "rmargen": form.value.rmargen,
        "tipomone": form.value.tipomone,
        "actprov": form.value.actprov,
        "cod_marca": form.value.cod_marca,
        "fecha": form.value.fecha
      };
      
      console.log(nuevaConflista);
      this.subirdata.subirDatosConflista(nuevaConflista).subscribe((data: any) => {
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
    Object.keys(this.nuevoconflistaForm.controls).forEach(field => {
      const control = this.nuevoconflistaForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.listapFlag = this.nuevoconflistaForm.controls['listap'].invalid;
      });
    });
  }
}
