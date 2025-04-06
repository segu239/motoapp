import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

interface TipoMoneda {
  cod_mone: number;
  moneda: string;
  simbolo: string;
  id_moneda: number;
}

interface MonedaOption {
  codmone: number;
  desvalor: string;
}

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
  public monedaOptions: MonedaOption[] = [];
  public tiposMoneda: TipoMoneda[] = [];
  public valoresCambio: any[] = [];

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTiposMoneda();
    this.loadValorCambioData();
  }

  loadTiposMoneda(): void {
    this.cargardata.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados:', this.tiposMoneda);
          
          // Cargar todos los valores de cambio para obtener las descripciones
          this.loadAllValoresCambio();
        } else {
          console.error('Error loading tipos de moneda:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  loadAllValoresCambio(): void {
    this.cargardata.getValorCambio().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.valoresCambio = response.mensaje;
          
          // Crear opciones combinando la info de tipos de moneda y valores de cambio
          this.createMonedaOptions();
        } else {
          console.error('Error loading valores de cambio:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  createMonedaOptions(): void {
    // Crear un mapa para eliminar duplicados por codmone
    const monedaMap = new Map<number, MonedaOption>();
    
    // Mapear los tipos de moneda para mostrar correctamente
    this.tiposMoneda.forEach(moneda => {
      monedaMap.set(moneda.cod_mone, {
        codmone: moneda.cod_mone,
        desvalor: moneda.moneda // Usar moneda en lugar de desvalor
      });
    });
    
    // Convertir el mapa a un array
    this.monedaOptions = Array.from(monedaMap.values());
    console.log('Opciones de moneda:', this.monedaOptions);
    
    // Si ya tenemos los datos del valor de cambio, actualizar el formulario
    if (this.currentValorCambio) {
      this.updateFormValues(this.currentValorCambio);
    }
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
          
          // Al cargar los datos, esperar a que monedaOptions esté disponible
          if (this.monedaOptions.length > 0) {
            this.updateFormValues(valorcambioData);
          } else {
            // Si aún no están disponibles, esperar a que se carguen
            const checkInterval = setInterval(() => {
              if (this.monedaOptions.length > 0) {
                this.updateFormValues(valorcambioData);
                clearInterval(checkInterval);
              }
            }, 300);
            
            // Por seguridad, limpiar el intervalo después de 5 segundos
            setTimeout(() => {
              clearInterval(checkInterval);
              // Si después de 5 segundos no hay opciones, cargar los datos sin el dropdown
              if (this.monedaOptions.length === 0) {
                this.updateFormWithoutOptions(valorcambioData);
              }
            }, 5000);
          }
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

  updateFormValues(valorcambioData: any): void {
    // Actualizar el formulario con los valores del objeto recibido
    this.valorcambioForm.patchValue({
      codmone: valorcambioData.codmone,
      desvalor: valorcambioData.desvalor.trim(),
      fecdesde: this.formatDate(valorcambioData.fecdesde),
      fechasta: this.formatDate(valorcambioData.fechasta),
      vcambio: valorcambioData.vcambio,
      id_valor: this.id_valor
    });
  }

  updateFormWithoutOptions(valorcambioData: any): void {
    // Si no hay opciones en el dropdown, cargar los valores directamente
    this.valorcambioForm.patchValue({
      codmone: valorcambioData.codmone,
      desvalor: valorcambioData.desvalor.trim(),
      fecdesde: this.formatDate(valorcambioData.fecdesde),
      fechasta: this.formatDate(valorcambioData.fechasta),
      vcambio: valorcambioData.vcambio,
      id_valor: this.id_valor
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

  getMonedaName(codmone: number): string {
    // Buscar la moneda por su código y devolver la descripción
    const moneda = this.tiposMoneda.find(m => m.cod_mone === codmone);
    return moneda ? moneda.moneda : '';
  }
}
