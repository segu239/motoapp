import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { CajamoviHelperService } from '../../services/cajamovi-helper.service';
import { Cajamovi } from '../../interfaces/cajamovi';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { formatDateForServer, createDateFromString } from '../../utils/date-utils';
import Swal from 'sweetalert2';

interface Cliente {
  cliente: number;
  nombre: string;
}

interface Proveedor {
  cod_prov: number;
  nombre: string;
}

@Component({
  selector: 'app-editcajamovi',
  templateUrl: './editcajamovi.component.html',
  styleUrls: ['./editcajamovi.component.css']
})
export class EditCajamoviComponent implements OnInit, OnDestroy {
  public cajamoviForm!: FormGroup;
  public currentCajamovi: Cajamovi | null = null;
  private id_movimiento: number = 0;
  public loading: boolean = false;
  public sucursal: number = 0;
  public conceptos: any[] = [];
  public bancos: any[] = [];
  public clientes: Cliente[] = []; 
  public proveedores: Proveedor[] = []; 
  public cajas: any[] = [];
  public isClienteSelected: boolean = true;
  public conceptoSeleccionado: any = null;
  private clienteId: number | null = null;
  private proveedorId: number | null = null;
  public fechaMinima: string = ''; // Fecha mínima permitida para el input de fecha
  private destroy$ = new Subject<void>(); // Para limpiar suscripciones

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
    private cajamoviHelper: CajamoviHelperService
  ) {}

  ngOnInit(): void {
    // Obtener la sucursal del sessionStorage
    const sucursalStr = sessionStorage.getItem('sucursal');
    if (sucursalStr) {
      this.sucursal = parseInt(sucursalStr, 10);
    }
    
    // Configurar fecha mínima (hoy en Argentina)
    this.setFechaMinima();
    this.initForm();
    this.loadConceptos();
    this.loadBancos();
    this.loadClientes();
    this.loadProveedores();
    this.loadCajas();
    this.loadCajamoviData();
    
    // Suscribirse a cambios en los campos cliente y proveedor
    this.setupFieldChangeListeners();
  }
  
  setupFieldChangeListeners(): void {
    // Actualizar clienteId cuando cambie el campo cliente
    this.cajamoviForm.get('cliente')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.clienteId = value;
        }
      });
    
    // Actualizar proveedorId cuando cambie el campo proveedor
    this.cajamoviForm.get('proveedor')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.proveedorId = value;
        }
      });
  }

  initForm(): void {
    this.cajamoviForm = this.fb.group({
      codigo_mov: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      num_operacion: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
      fecha_mov: new FormControl('', Validators.required),
      importe_mov: new FormControl(null, Validators.compose([
        Validators.required,
        this.cajamoviHelper.importeValidator(0.01)
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
      fecha_proceso: new FormControl(null)
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
    // Guardar los valores actuales antes de cambiar
    const clienteActual = this.cajamoviForm.get('cliente')?.value;
    const proveedorActual = this.cajamoviForm.get('proveedor')?.value;
    
    this.isClienteSelected = !this.isClienteSelected;
    
    // Los campos de cliente y proveedor siempre están deshabilitados en la UI,
    // pero internamente necesitamos habilitar/deshabilitar para gestionar el formulario correctamente
    if (this.isClienteSelected) {
      // Cambio a modo cliente - cliente está activo pero sigue siendo readonly en UI
      this.cajamoviForm.get('cliente')?.enable({ emitEvent: false });
      this.cajamoviForm.get('proveedor')?.disable({ emitEvent: false });
      
      // Si no hay cliente establecido pero había un cliente original, restaurarlo
      if (!clienteActual && this.clienteId) {
        this.cajamoviForm.get('cliente')?.setValue(this.clienteId, { emitEvent: false });
      }
    } else {
      // Cambio a modo proveedor - proveedor está activo pero sigue siendo readonly en UI
      this.cajamoviForm.get('proveedor')?.enable({ emitEvent: false });
      this.cajamoviForm.get('cliente')?.disable({ emitEvent: false });
      
      // Si no hay proveedor establecido pero había un proveedor original, restaurarlo
      if (!proveedorActual && this.proveedorId) {
        this.cajamoviForm.get('proveedor')?.setValue(this.proveedorId, { emitEvent: false });
      }
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
        this.cargardata.getCajaconceptoPorId(codigoMov).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
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

  // Función para formatear fecha en formato DD/MM/YYYY para mostrar en input readonly
  formatDateForDisplay(date: any): string {
    if (!date) return '';
    try {
      let d: Date;
      if (typeof date === 'string') {
        d = new Date(date);
      } else {
        d = new Date(date);
      }
      
      if (isNaN(d.getTime())) {
        return '';
      }
      
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date for display:', e);
      return '';
    }
  }

  // Método para verificar si un cliente existe en la lista
  public clienteExisteEnLista(): boolean {
    const clienteId = this.cajamoviForm.get('cliente')?.value;
    if (!clienteId) return false;
    return this.clientes.some(c => c.cliente === parseInt(clienteId));
  }

  // Método para verificar si un proveedor existe en la lista
  public proveedorExisteEnLista(): boolean {
    const proveedorId = this.cajamoviForm.get('proveedor')?.value;
    if (!proveedorId) return false;
    return this.proveedores.some(p => p.cod_prov === parseInt(proveedorId));
  }

  // Método para obtener el ID del cliente seleccionado
  public getClienteId(): string | null {
    return this.cajamoviForm.get('cliente')?.value;
  }

  // Método para obtener el ID del proveedor seleccionado
  public getProveedorId(): string | null {
    return this.cajamoviForm.get('proveedor')?.value;
  }
  
  // Método para obtener el nombre del cliente seleccionado
  public getNombreCliente(): string {
    const clienteId = this.cajamoviForm.get('cliente')?.value;
    if (!clienteId) return 'Sin cliente seleccionado';
    
    // Buscar el cliente en la lista
    const clienteEncontrado = this.clientes.find(c => c.cliente == clienteId);
    if (clienteEncontrado) {
      return clienteEncontrado.nombre;
    } else {
      // Si no se encuentra en la lista, mostrar el ID
      return `Cliente ID: ${clienteId}`;
    }
  }
  
  // Método para obtener el nombre del proveedor seleccionado
  public getNombreProveedor(): string {
    const proveedorId = this.cajamoviForm.get('proveedor')?.value;
    if (!proveedorId) return 'Sin proveedor seleccionado';
    
    // Buscar el proveedor en la lista
    const proveedorEncontrado = this.proveedores.find(p => p.cod_prov == proveedorId);
    if (proveedorEncontrado) {
      return proveedorEncontrado.nombre;
    } else {
      // Si no se encuentra en la lista, mostrar el ID
      return `Proveedor ID: ${proveedorId}`;
    }
  }

  // Método para verificar si debe mostrar el indicador de cliente
  public mostrarIndicadorCliente(): boolean {
    return this.isClienteSelected && 
           this.cajamoviForm.get('cliente')?.value && 
           !this.clienteExisteEnLista();
  }

  // Método para verificar si debe mostrar el indicador de proveedor
  public mostrarIndicadorProveedor(): boolean {
    return !this.isClienteSelected && 
           this.cajamoviForm.get('proveedor')?.value && 
           !this.proveedorExisteEnLista();
  }

  // Método para obtener el texto de marca cerrado
  public getMarcaCerradoTexto(): string {
    const valor = this.cajamoviForm.get('marca_cerrado')?.value;
    if (valor === 0 || valor === '0') {
      return 'ABIERTA';
    } else if (valor === 1 || valor === '1') {
      return 'CERRADA';
    }
    return valor ? valor.toString() : '';
  }

  loadCajamoviData(): void {
    // Intentar obtener los datos de sessionStorage
    const cajamoviStr = sessionStorage.getItem('cajamoviEdit');
    
    if (cajamoviStr) {
      try {
        // Parsear los datos del cajamovi desde sessionStorage
        const cajamoviData = JSON.parse(cajamoviStr);
        // Limpiar sessionStorage después de leer
        sessionStorage.removeItem('cajamoviEdit');
          this.currentCajamovi = cajamoviData;
          this.id_movimiento = cajamoviData.id_movimiento;

          // Determinar si es cliente o proveedor
          this.isClienteSelected = cajamoviData.cliente !== null;

          // Formatear las fechas para el formulario
          const formattedData = { ...cajamoviData };
          
          // Formatear fechas para inputs de tipo date
          const dateFields = ['fecha_mov', 'fecha_emibco', 'fecha_cobro_bco', 'fecha_vto_bco', 'fecha_proceso'];
          dateFields.forEach(field => {
            if (formattedData[field]) {
              formattedData[field] = this.formatDate(formattedData[field]);
            }
          });

          // Mostrar valor absoluto del importe_mov (sin signo) para mejorar la UX
          if (formattedData['importe_mov'] !== null && formattedData['importe_mov'] !== undefined) {
            formattedData['importe_mov'] = Math.abs(parseFloat(formattedData['importe_mov']));
          }

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

          // Guardar IDs para referencia
          this.clienteId = formattedData.cliente;
          this.proveedorId = formattedData.proveedor;

          // Configurar campos de cliente/proveedor según corresponda
          // Necesitamos manipular el estado interno del FormControl, aunque en la UI siempre serán readonly
          if (this.isClienteSelected) {
            this.cajamoviForm.get('cliente')?.enable({ emitEvent: false });
            this.cajamoviForm.get('proveedor')?.disable({ emitEvent: false });
          } else {
            this.cajamoviForm.get('proveedor')?.enable({ emitEvent: false });
            this.cajamoviForm.get('cliente')?.disable({ emitEvent: false });
          }

          // Buscar el concepto seleccionado
          this.onConceptoChange();

      } catch (error) {
        console.error('Error parsing cajamovi data:', error);
        this.showErrorMessage('No se pudo cargar la información del movimiento');
        this.router.navigate(['components/cajamovi']);
      }
    } else {
      // Si no hay datos en sessionStorage, redirigir
      console.error('No cajamovi data found in sessionStorage');
      this.showErrorMessage('No se encontró información del movimiento para editar.');
      this.router.navigate(['components/cajamovi']);
    }
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
      
      // Usar el servicio helper para calcular el importe final
      const importeOriginal = parseFloat(cajamoviData.importe_mov) || 0;
      cajamoviData.importe_mov = this.cajamoviHelper.calcularImporteFinal(importeOriginal, this.conceptoSeleccionado);
      
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
        // Formatear fechas para el servidor
        if (key.startsWith('fecha_') && cajamoviData[key]) {
          // Usar createDateFromString para manejar correctamente las fechas
          const fecha = createDateFromString(cajamoviData[key]);
          if (fecha) {
            cajamoviData[key] = formatDateForServer(fecha);
          } else {
            cajamoviData[key] = null;
          }
        } else if (key.startsWith('fecha_') && !cajamoviData[key]) {
          // Asegurarse que las fechas vacías sean null
          cajamoviData[key] = null;
        }
      }

      console.log('Objeto final enviado al backend:', JSON.stringify(cajamoviData));
      this.subirdata.updateCajamovi(cajamoviData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
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
    this.cargardata.getCajaconcepto().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
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
    this.cargardata.getBancos().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
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
      this.cargardata.clisucx(sucursalStr).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
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
    this.cargardata.getProveedor().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
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
    this.cargardata.getCajaLista().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
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

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar referencias a objetos grandes
    this.conceptos = [];
    this.bancos = [];
    this.clientes = [];
    this.proveedores = [];
    this.cajas = [];
    
    // Limpiar referencias a objetos
    this.currentCajamovi = null;
    this.conceptoSeleccionado = null;
    
    // Limpiar el formulario
    if (this.cajamoviForm) {
      this.cajamoviForm.reset();
    }
    
    // Limpiar sessionStorage de datos temporales
    sessionStorage.removeItem('cajamoviEdit');
    
    // Limpiar referencias a IDs
    this.clienteId = null;
    this.proveedorId = null;
  }
}