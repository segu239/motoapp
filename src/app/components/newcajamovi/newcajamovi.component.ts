import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newcajamovi',
  templateUrl: './newcajamovi.component.html',
  styleUrls: ['./newcajamovi.component.css']
})
export class NewCajamoviComponent {
  public cajamoviForm!: FormGroup;
  public loading: boolean = false;
  public sucursal: number = 0;
  public conceptos: any[] = [];
  public bancos: any[] = [];
  public clientes: any[] = []; // Array para almacenar la lista de clientes
  public proveedores: any[] = []; // Nueva propiedad para almacenar la lista de proveedores
  public cajas: any[] = []; // Array para almacenar las cajas

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private fb: FormBuilder,
    private cargardata: CargardataService
  ) {
    // Obtener la sucursal del sessionStorage
    const sucursalStr = sessionStorage.getItem('sucursal');
    if (sucursalStr) {
      this.sucursal = parseInt(sucursalStr, 10);
    }
    this.cargarForm();
    this.loadConceptos();
    this.loadBancos();
    this.loadClientes(); // Cargar los clientes al inicializar el componente
    this.loadProveedores(); // Cargar los proveedores al inicializar el componente
    this.loadCajas(); // Cargar las cajas al inicializar el componente
  }

  cargarForm() {
    this.cajamoviForm = this.fb.group({
      codigo_mov: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      num_operacion: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      fecha_mov: new FormControl('', Validators.required),
      importe_mov: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^-?\d{1,13}(\.\d{1,2})?$/)])),
      descripcion_mov: new FormControl('', Validators.compose([Validators.required, Validators.maxLength(80)])),
      fecha_emibco: new FormControl(null),
      banco: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      num_cheque: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      cuenta_mov: new FormControl(null, Validators.pattern(/^[0-9]{1,6}$/)),
      cliente: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      proveedor: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      plaza_cheque: new FormControl('', Validators.maxLength(30)),
      codigo_mbco: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      desc_bancaria: new FormControl('', Validators.maxLength(80)),
      marca_cerrado: new FormControl(0, Validators.compose([Validators.required, Validators.pattern(/^[01]$/)])),
      fecha_cobro_bco: new FormControl(null),
      fecha_vto_bco: new FormControl(null),
      tipo_movi: new FormControl('', Validators.compose([Validators.required, Validators.maxLength(1)])),
      caja: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      letra: new FormControl('', Validators.maxLength(1)),
      punto_venta: new FormControl(null, Validators.pattern(/^[0-9]{1,4}$/)),
      tipo_comprobante: new FormControl('', Validators.maxLength(2)),
      numero_comprobante: new FormControl(null, Validators.pattern(/^[0-9]{1,8}$/)),
      fecha_proceso: new FormControl(null)
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      this.loading = true;
      // Crear el objeto directamente desde el form value
      const nuevoCajamovi = { ...form.value };
      
      // Agregar la sucursal desde sessionStorage
      nuevoCajamovi.sucursal = this.sucursal;
      
      // Convertir campos vacíos a null para la base de datos
      for (const key in nuevoCajamovi) {
        if (nuevoCajamovi[key] === '') {
          nuevoCajamovi[key] = null;
        }
        // Asegurarse que las fechas vacías sean null
        if (key.startsWith('fecha_') && !nuevoCajamovi[key]) {
          nuevoCajamovi[key] = null;
        }
      }

      this.subirdata.subirDatosCajamovi(nuevoCajamovi).subscribe({
        next: (response: any) => {
          this.loading = false;
          if (!response.error) {
            Swal.fire({
              title: '¡Éxito!',
              text: 'El movimiento se guardó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.router.navigate(['components/cajamovi']);
            });
          } else {
            this.showErrorMessage('No se pudo guardar el movimiento');
            console.error('Error en la respuesta del servidor:', response.mensaje);
          }
        },
        error: (error) => {
          this.loading = false;
          this.showErrorMessage('No se pudo guardar el movimiento');
          console.error('Error en la llamada al API:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.cajamoviForm);
      this.showErrorMessage('Verifique los datos ingresados, hay campos inválidos o vacíos');
    }
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['components/cajamovi']);
  }

  private showErrorMessage(message: string): void {
    Swal.fire({
      title: '¡Error!',
      text: message,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }

  loadConceptos() {
    this.cargardata.getCajaconcepto().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.conceptos = response.mensaje;
        } else {
          console.error('Error loading conceptos:', response.mensaje);
          this.showErrorMessage('No se pudieron cargar los conceptos de caja');
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
        this.showErrorMessage('Error en la conexión con el servidor');
      }
    });
  }

  loadBancos() {
    this.cargardata.getBancos().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.bancos = response.mensaje;
        } else {
          console.error('Error loading bancos:', response.mensaje);
          this.showErrorMessage('No se pudieron cargar los bancos');
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
        this.showErrorMessage('Error en la conexión con el servidor');
      }
    });
  }

  loadClientes() {
    const sucursalStr = sessionStorage.getItem('sucursal');
    if (sucursalStr) {
      this.cargardata.clisucx(sucursalStr).subscribe({
        next: (response: any) => {
          if (!response.error) {
            this.clientes = response.mensaje;
          } else {
            console.error('Error loading clientes:', response.mensaje);
            this.showErrorMessage('No se pudieron cargar los clientes');
          }
        },
        error: (error) => {
          console.error('Error in API call:', error);
          this.showErrorMessage('Error en la conexión con el servidor');
        }
      });
    }
  }

  loadProveedores() {
    this.cargardata.getProveedor().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.proveedores = response.mensaje;
        } else {
          console.error('Error loading proveedores:', response.mensaje);
          this.showErrorMessage('No se pudieron cargar los proveedores');
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
        this.showErrorMessage('Error en la conexión con el servidor');
      }
    });
  }

  loadCajas() {
    // Utilizamos getCajaconcepto() ya que parece contener los datos de las cajas
    this.cargardata.getCajaconcepto().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.cajas = response.mensaje;
        } else {
          console.error('Error loading cajas:', response.mensaje);
          this.showErrorMessage('No se pudieron cargar las cajas');
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
        this.showErrorMessage('Error en la conexión con el servidor');
      }
    });
  }
}
