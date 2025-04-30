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

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCajamoviData();
  }

  initForm(): void {
    this.cajamoviForm = this.fb.group({
      sucursal: new FormControl(null, Validators.compose([Validators.required, Validators.pattern(/^[0-9]{1,10}$/)])),
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

          this.cajamoviForm.patchValue(formattedData);

        } catch (error) {
          console.error('Error parsing cajamovi data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información del movimiento',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          this.router.navigate(['components/cajamovi']);
        }
      } else {
        // Si no vienen datos, redirigir o mostrar error
        console.error('No cajamovi data found in query params');
        Swal.fire({
          title: 'Error',
          text: 'No se encontró información del movimiento para editar.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        this.router.navigate(['components/cajamovi']);
      }
    });
  }

  onSubmit(): void {
    if (this.cajamoviForm.valid) {
      const cajamoviData = {
        id_movimiento: this.id_movimiento,
        ...this.cajamoviForm.value
      };

      // Asegurarse de que los campos opcionales vacíos se envíen como null
      for (const key in cajamoviData) {
        if (cajamoviData[key] === '') {
          cajamoviData[key] = null;
        }
      }

      this.subirdata.updateCajamovi(cajamoviData).subscribe({
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
                text: 'El movimiento se actualizó correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              this.router.navigate(['components/cajamovi']);
            }
          });
        },
        error: (error) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el movimiento',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          console.error('Error updating cajamovi:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.cajamoviForm);
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
    this.router.navigate(['components/cajamovi']);
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