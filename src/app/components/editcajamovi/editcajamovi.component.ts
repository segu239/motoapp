import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import Swal from 'sweetalert2';

// Definir la interfaz Cajamovi aquí para evitar problemas de importación circular
interface Cajamovi {
  sucursal: number;
  codigo_mov: number;
  num_operacion: number;
  fecha_mov: Date;
  importe_mov: number;
  descripcion_mov: string;
  fecha_emibco: Date | null;
  banco: number | null;
  num_cheque: number | null;
  cuenta_mov: number | null;
  cliente: number | null;
  proveedor: number | null;
  plaza_cheque: string | null;
  codigo_mbco: number | null;
  desc_bancaria: string | null;
  marca_cerrado: number;
  fecha_cobro_bco: Date | null;
  fecha_vto_bco: Date | null;
  tipo_movi: string;
  caja: number;
  letra: string | null;
  punto_venta: number | null;
  tipo_comprobante: string | null;
  numero_comprobante: number | null;
  fecha_proceso: Date | null;
  id_movimiento: number;
}

@Component({
  selector: 'app-editcajamovi',
  templateUrl: './editcajamovi.component.html',
  styleUrls: ['./editcajamovi.component.css']
})
export class EditCajamoviComponent implements OnInit {
  public cajamoviForm!: FormGroup;
  public currentCajamovi: Cajamovi | null = null;
  private id_movimiento: number = 0;
  public loading: boolean = false;
  public sucursal: number = 0;
  public conceptos: any[] = [];
  public bancos: any[] = [];
  public clientes: any[] = []; 
  public proveedores: any[] = []; 
  public cajas: any[] = [];
  public isClienteSelected: boolean = true;
  public conceptoSeleccionado: any = null;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    // Obtener la sucursal del sessionStorage
    const sucursalStr = sessionStorage.getItem('sucursal');
    if (sucursalStr) {
      this.sucursal = parseInt(sucursalStr, 10);
    }
    
    this.initForm();
    this.loadConceptos();
    this.loadBancos();
    this.loadClientes();
    this.loadProveedores();
    this.loadCajas();
    this.loadCajamoviData();
  }

  initForm(): void {
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
      fecha_proceso: new FormControl(null)
    });
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
    if (codigoMov) {
      // Buscar el concepto seleccionado en la lista de conceptos
      this.conceptoSeleccionado = this.conceptos.find(concepto => concepto.id_concepto == codigoMov);
    } else {
      this.conceptoSeleccionado = null;
    }
  }

  // Función mejorada para formatear fecha YYYY-MM-DD para input date
  formatDate(date: any): string | null {
    if (!date) return null;
    try {
      // Si ya es un string en formato ISO, extraer solo la parte de la fecha
      if (typeof date === 'string') {
        // Verificar si es una fecha ISO válida
        const d = new Date(date);
        if (isNaN(d.getTime())) {
          return null;
        }
        // Extraer solo la parte de la fecha (YYYY-MM-DD)
        return date.split('T')[0];
      }
      
      // Si es un objeto Date
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return null;
      }
      const month = ('0' + (d.getMonth() + 1)).slice(-2);
      const day = ('0' + d.getDate()).slice(-2);
      return `${d.getFullYear()}-${month}-${day}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return null;
    }
  }

  loadCajamoviData(): void {
    this.route.queryParams.subscribe(params => {
      if (params['cajamovi']) {
        try {
          // Parsear los datos del cajamovi desde los parámetros
          const cajamoviData = JSON.parse(params['cajamovi']);
          this.currentCajamovi = cajamoviData;
          this.id_movimiento = cajamoviData.id_movimiento;

          // Determinar si es cliente o proveedor
          this.isClienteSelected = cajamoviData.cliente !== null;

          // Formatear las fechas para el formulario
          const formattedData = { ...cajamoviData };
          
          // Formatear todas las fechas
          const dateFields = ['fecha_mov', 'fecha_emibco', 'fecha_cobro_bco', 'fecha_vto_bco', 'fecha_proceso'];
          dateFields.forEach(field => {
            if (formattedData[field]) {
              formattedData[field] = this.formatDate(formattedData[field]);
            }
          });

          // Asegurarse que los campos numéricos sean números
          Object.keys(formattedData).forEach(key => {
            // Asegurarse que los números sean números
            if (typeof this.cajamoviForm.controls[key]?.value === 'number') {
              formattedData[key] = parseFloat(formattedData[key]) || 0;
            }
            // Quitar espacios en blanco de strings
            if (typeof formattedData[key] === 'string') {
              formattedData[key] = formattedData[key].trim();
            }
          });

          // Aplicar valores al formulario
          this.cajamoviForm.patchValue(formattedData);

          // Configurar campos de cliente/proveedor según corresponda
          if (this.isClienteSelected) {
            this.cajamoviForm.get('cliente')?.enable();
            this.cajamoviForm.get('proveedor')?.disable();
          } else {
            this.cajamoviForm.get('proveedor')?.enable();
            this.cajamoviForm.get('cliente')?.disable();
          }

          // Buscar el concepto seleccionado
          this.onConceptoChange();

        } catch (error) {
          console.error('Error parsing cajamovi data:', error);
          this.showErrorMessage('No se pudo cargar la información del movimiento');
          this.router.navigate(['components/cajamovi']);
        }
      } else {
        // Si no vienen datos, redirigir o mostrar error
        console.error('No cajamovi data found in query params');
        this.showErrorMessage('No se encontró información del movimiento para editar.');
        this.router.navigate(['components/cajamovi']);
      }
    });
  }

  onSubmit(): void {
    if (this.cajamoviForm.valid) {
      this.loading = true;

      const cajamoviData = {
        id_movimiento: this.id_movimiento,
        ...this.cajamoviForm.value,
        // Incluir valores de los controles deshabilitados del formulario
        cliente: this.isClienteSelected ? this.cajamoviForm.get('cliente')?.value : null,
        proveedor: !this.isClienteSelected ? this.cajamoviForm.get('proveedor')?.value : null,
        // Usar sucursal desde sessionStorage
        sucursal: this.sucursal
      };
      
      // Aplicar factor de -1 si es un egreso (ingreso_egreso = 1)
      if (this.conceptoSeleccionado && this.conceptoSeleccionado.ingreso_egreso === '1' && cajamoviData.importe_mov !== null) {
        cajamoviData.importe_mov = Math.abs(parseFloat(cajamoviData.importe_mov)) * -1;
      } else if (cajamoviData.importe_mov !== null) {
        // Asegurar que el importe sea positivo para ingresos
        cajamoviData.importe_mov = Math.abs(parseFloat(cajamoviData.importe_mov));
      }
      
      // Agregar el usuario desde sessionStorage
      const emailOp = sessionStorage.getItem('emailOp');
      if (emailOp) {
        cajamoviData.usuario = emailOp;
      }

      // Convertir campos vacíos a null para la base de datos
      for (const key in cajamoviData) {
        if (cajamoviData[key] === '') {
          cajamoviData[key] = null;
        }
        // Asegurarse que las fechas vacías sean null
        if (key.startsWith('fecha_') && !cajamoviData[key]) {
          cajamoviData[key] = null;
        }
      }

      this.subirdata.updateCajamovi(cajamoviData).subscribe({
        next: (response: any) => {
          this.loading = false;
          if (!response.error) {
            Swal.fire({
              title: '¡Éxito!',
              text: 'El movimiento se actualizó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.router.navigate(['components/cajamovi']);
            });
          } else {
            this.showErrorMessage('No se pudo actualizar el movimiento');
            console.error('Error en la respuesta del servidor:', response.mensaje);
          }
        },
        error: (error) => {
          this.loading = false;
          this.showErrorMessage('No se pudo actualizar el movimiento');
          console.error('Error en la llamada al API:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.cajamoviForm);
      this.showErrorMessage('Verifique los datos ingresados, hay campos inválidos o vacíos');
    }
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

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
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