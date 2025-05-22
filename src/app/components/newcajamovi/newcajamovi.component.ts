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
  public isClienteSelected: boolean = true; // Por defecto se selecciona cliente
  public conceptoSeleccionado: any = null; // Para almacenar el concepto seleccionado
  public fechaMinima: string = ''; // Fecha mínima permitida para el input de fecha

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
    // Configurar fecha mínima (hoy)
    this.setFechaMinima();
    this.cargarForm();
    this.loadConceptos();
    this.loadBancos();
    this.loadClientes(); // Cargar los clientes al inicializar el componente
    this.loadProveedores(); // Cargar los proveedores al inicializar el componente
    this.loadCajas(); // Cargar las cajas al inicializar el componente
  }

  cargarForm() {
    // Obtener la fecha actual en formato DD/MM/YYYY usando zona horaria de Argentina
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    const fechaActual = argentinaTime.getDate().toString().padStart(2, '0') + '/' + 
                      (argentinaTime.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                      argentinaTime.getFullYear();

    this.cajamoviForm = this.fb.group({
      codigo_mov: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      num_operacion: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      fecha_mov: new FormControl('', Validators.required),
      importe_mov: new FormControl(null, Validators.compose([
        Validators.required, 
        Validators.pattern(/^\d{1,13}(\.\d{1,2})?$/),
        Validators.min(0)
      ])),
      descripcion_mov: new FormControl('', Validators.compose([Validators.required, Validators.maxLength(80)])),
      fecha_emibco: new FormControl(null),
      banco: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      num_cheque: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      cuenta_mov: new FormControl(null, Validators.pattern(/^[0-9]{1,6}$/)),
      cliente: new FormControl({value: null, disabled: false}, Validators.pattern(/^[0-9]{1,10}$/)),
      proveedor: new FormControl({value: null, disabled: true}, Validators.pattern(/^[0-9]{1,10}$/)),
      plaza_cheque: new FormControl('', Validators.maxLength(30)),
      codigo_mbco: new FormControl(null, Validators.pattern(/^[0-9]{1,10}$/)),
      desc_bancaria: new FormControl('', Validators.maxLength(80)),
      marca_cerrado: new FormControl(0, Validators.compose([Validators.required, Validators.pattern(/^[01]$/)])),
      fecha_cobro_bco: new FormControl(null),
      fecha_vto_bco: new FormControl(null),
      tipo_movi: new FormControl('M', Validators.compose([Validators.required, Validators.maxLength(1)])),
      caja: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      letra: new FormControl('', Validators.maxLength(1)),
      punto_venta: new FormControl(null, Validators.pattern(/^[0-9]{1,4}$/)),
      tipo_comprobante: new FormControl('', Validators.maxLength(2)),
      numero_comprobante: new FormControl(null, Validators.pattern(/^[0-9]{1,8}$/)),
      fecha_proceso: new FormControl(fechaActual)
    });
  }

  // Método para configurar la fecha mínima (hoy en Argentina UTC-3)
  setFechaMinima() {
    // Crear fecha actual en zona horaria de Argentina (UTC-3)
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    
    const year = argentinaTime.getFullYear();
    const month = (argentinaTime.getMonth() + 1).toString().padStart(2, '0');
    const day = argentinaTime.getDate().toString().padStart(2, '0');
    this.fechaMinima = `${year}-${month}-${day}`;
  }
  
  // Método para cambiar entre cliente y proveedor
  toggleClienteProveedor() {
    this.isClienteSelected = !this.isClienteSelected;
    
    if (this.isClienteSelected) {
      this.cajamoviForm.get('cliente')?.enable();
      this.cajamoviForm.get('proveedor')?.disable();
      this.cajamoviForm.get('proveedor')?.setValue(null);
    } else {
      this.cajamoviForm.get('proveedor')?.enable();
      this.cajamoviForm.get('cliente')?.disable();
      this.cajamoviForm.get('cliente')?.setValue(null);
    }
  }

  // Método para manejar el cambio de concepto seleccionado
  onConceptoChange() {
    const codigoMov = this.cajamoviForm.get('codigo_mov')?.value;
    console.log('onConceptoChange - código_mov:', codigoMov);
    console.log('conceptos disponibles:', this.conceptos);
    
    if (codigoMov) {
      // Buscar el concepto seleccionado en la lista de conceptos
      this.conceptoSeleccionado = this.conceptos.find(concepto => concepto.id_concepto == codigoMov);
      console.log('Concepto seleccionado:', this.conceptoSeleccionado);
      
      // Si no se encuentra el concepto en la lista, cargarlo específicamente
      if (!this.conceptoSeleccionado && this.conceptos.length > 0) {
        console.log('Concepto no encontrado en la lista, consultando específicamente');
        this.cargardata.getCajaconceptoPorId(codigoMov).subscribe({
          next: (response: any) => {
            if (!response.error && response.mensaje && response.mensaje.length > 0) {
              this.conceptoSeleccionado = response.mensaje[0];
              console.log('Concepto cargado específicamente:', this.conceptoSeleccionado);
            } else {
              console.error('No se pudo obtener el concepto específico:', response);
            }
          },
          error: (error) => {
            console.error('Error al obtener concepto específico:', error);
          }
        });
      }
    } else {
      this.conceptoSeleccionado = null;
      console.log('No hay concepto seleccionado');
    }
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      this.loading = true;
      // Crear el objeto directamente desde el form value y el rawValue (para obtener valores de controles deshabilitados)
      const nuevoCajamovi = {
        ...form.value,
        // Incluir valores de los controles deshabilitados del formulario
        cliente: this.isClienteSelected ? this.cajamoviForm.get('cliente')?.value : null,
        proveedor: !this.isClienteSelected ? this.cajamoviForm.get('proveedor')?.value : null
      };
      
      // Siempre aseguramos trabajar con números para el importe
      let importe = nuevoCajamovi.importe_mov !== null ? Math.abs(parseFloat(nuevoCajamovi.importe_mov)) : 0;
      
      console.log('Valor original del importe:', nuevoCajamovi.importe_mov);
      console.log('Valor del importe después de Math.abs():', importe);
      console.log('Tipo de concepto seleccionado:', this.conceptoSeleccionado ? this.conceptoSeleccionado.ingreso_egreso : 'ninguno');
      
      // VERIFICACIÓN DETALLADA DEL CONCEPTO
      console.log('VERIFICACIÓN DE CONCEPTO:');
      console.log('Código mov seleccionado:', nuevoCajamovi.codigo_mov);
      console.log('Concepto seleccionado completo:', this.conceptoSeleccionado);
      console.log('Tipo de concepto.ingreso_egreso:', this.conceptoSeleccionado ? typeof this.conceptoSeleccionado.ingreso_egreso : 'N/A');
      console.log('Valor de concepto.ingreso_egreso:', this.conceptoSeleccionado ? this.conceptoSeleccionado.ingreso_egreso : 'N/A');
      console.log('Comparación estricta con "1":', this.conceptoSeleccionado && this.conceptoSeleccionado.ingreso_egreso === '1');
      console.log('Comparación no estricta con "1":', this.conceptoSeleccionado && this.conceptoSeleccionado.ingreso_egreso == '1');
      
      // Aplicar factor de -1 si es un egreso (ingreso_egreso = 1)
      let esEgreso = false;
      if (this.conceptoSeleccionado) {
        // Comprobar si es egreso, tanto con comparación estricta como no estricta
        esEgreso = this.conceptoSeleccionado.ingreso_egreso === '1' || 
                  this.conceptoSeleccionado.ingreso_egreso === 1 ||
                  this.conceptoSeleccionado.ingreso_egreso == '1';
      }
      
      if (esEgreso) {
        // Para egresos, siempre debe ser negativo
        nuevoCajamovi.importe_mov = importe * -1;
        console.log('Aplicando signo negativo para egreso:', nuevoCajamovi.importe_mov);
      } else if (this.conceptoSeleccionado && (this.conceptoSeleccionado.ingreso_egreso === '0' || this.conceptoSeleccionado.ingreso_egreso == '0')) {
        // Para ingresos, siempre debe ser positivo
        nuevoCajamovi.importe_mov = importe;
        console.log('Manteniendo signo positivo para ingreso:', nuevoCajamovi.importe_mov);
      } else {
        // Si no hay concepto seleccionado, mantener el valor absoluto
        nuevoCajamovi.importe_mov = importe;
        console.log('Sin concepto seleccionado o tipo desconocido, usando valor absoluto:', nuevoCajamovi.importe_mov);
      }
      
      // Agregar la sucursal desde sessionStorage
      nuevoCajamovi.sucursal = this.sucursal;
      
      // Agregar el usuario desde sessionStorage
      const emailOp = sessionStorage.getItem('emailOp');
      if (emailOp) {
        nuevoCajamovi.usuario = emailOp;
      }
      
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

      console.log('Objeto final enviado al backend:', JSON.stringify(nuevoCajamovi));
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
          console.log('Conceptos cargados:', this.conceptos);
          
          // Después de cargar los conceptos, verificar el concepto actual
          const codigoMovActual = this.cajamoviForm.get('codigo_mov')?.value;
          if (codigoMovActual) {
            console.log('Recargando concepto actual después de cargar lista de conceptos');
            this.onConceptoChange();
          }
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
    // Utilizamos getCajaLista() para obtener datos de la tabla caja_lista
    this.cargardata.getCajaLista().subscribe({
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
