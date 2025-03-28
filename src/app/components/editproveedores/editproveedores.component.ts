import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

interface Proveedor {
  cod_prov: number;
  nombre: string;
  direccion: string;
  codpos: string;
  localidad: string;
  telefono: string;
  cuit: number;
  contacto: string;
  rubro: string;
  cod_iva: number;
  ganancias: number;
  ingbrutos: string;
  email: string;
  www: string;
  cta_proveedores: string;
  fec_proceso: any;
  id_prov: number;
}

@Component({
  selector: 'app-editproveedores',
  templateUrl: './editproveedores.component.html',
  styleUrls: ['./editproveedores.component.css']
})
export class EditproveedoresComponent implements OnInit {
  public proveedorForm!: FormGroup;
  public nombreFlag: boolean = false;
  public direccionFlag: boolean = false;
  public localidadFlag: boolean = false;
  public telefonoFlag: boolean = false;
  public cuitFlag: boolean = false;
  public emailFlag: boolean = false;
  public currentProveedor: any = null;
  private id_prov: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProveedorData();
  }

  initForm(): void {
    this.proveedorForm = this.fb.group({
      cod_prov: new FormControl('', Validators.required),
      nombre: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\s.,ñÑ]{2,40}$/)
      ])),
      direccion: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\s.,°\-_/ñÑªº]{2,60}$/)
      ])),
      codpos: new FormControl('', Validators.pattern(/^[a-zA-Z0-9\-]{1,10}$/)),
      localidad: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\s.,ñÑ]{2,30}$/)
      ])),
      telefono: new FormControl('', Validators.pattern(/^[0-9\-+\s]{5,15}$/)),
      cuit: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{11}$/)
      ])),
      contacto: new FormControl('', Validators.pattern(/^[a-zA-Z0-9\s.,ñÑ]{0,40}$/)),
      rubro: new FormControl('', Validators.pattern(/^[a-zA-Z0-9\s.,ñÑ]{0,30}$/)),
      cod_iva: new FormControl(''),
      ganancias: new FormControl(''),
      ingbrutos: new FormControl('', Validators.pattern(/^[a-zA-Z0-9\-]{0,20}$/)),
      email: new FormControl('', Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
      www: new FormControl('', Validators.pattern(/^[a-zA-Z0-9\-_./:]{0,40}$/)),
      cta_proveedores: new FormControl('')
    });

    this.monitorFormChanges();
  }

  loadProveedorData(): void {
    this.route.queryParams.subscribe(params => {
      console.log(params);
      if (params['proveedor']) {
        try {
          const proveedorData = JSON.parse(params['proveedor']);
          this.id_prov = proveedorData.id_prov;
          console.log('ID Proveedor:', this.id_prov);
          this.currentProveedor = proveedorData;
          this.proveedorForm.patchValue({
            cod_prov: this.currentProveedor.cod_prov.trim(),
            nombre: this.currentProveedor.nombre.trim(),
            direccion: this.currentProveedor.direccion.trim(),
            codpos: this.currentProveedor.codpos.trim(),
            localidad: this.currentProveedor.localidad.trim(),
            telefono: this.currentProveedor.telefono.trim(),
            cuit: this.currentProveedor.cuit.trim(),
            contacto: this.currentProveedor.contacto.trim(),
            rubro: this.currentProveedor.rubro.trim(),
            cod_iva: this.currentProveedor.cod_iva.trim(),
            ganancias: this.currentProveedor.ganancias.trim(),
            ingbrutos: this.currentProveedor.ingbrutos.trim(),
            email: this.currentProveedor.email.trim(),
            www: this.currentProveedor.www.trim(),
            cta_proveedores: this.currentProveedor.cta_proveedores.trim()
          });
        } catch (error) {
          console.error('Error parsing proveedor data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información del proveedor',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.proveedorForm.valid) {
      const proveedorData = {
        id_prov: this.id_prov,
        cod_prov: this.proveedorForm.value.cod_prov,
        nombre: this.proveedorForm.value.nombre,
        direccion: this.proveedorForm.value.direccion,
        codpos: this.proveedorForm.value.codpos,
        localidad: this.proveedorForm.value.localidad,
        telefono: this.proveedorForm.value.telefono,
        cuit: this.proveedorForm.value.cuit,
        contacto: this.proveedorForm.value.contacto,
        rubro: this.proveedorForm.value.rubro,
        cod_iva: this.proveedorForm.value.cod_iva,
        ganancias: this.proveedorForm.value.ganancias,
        ingbrutos: this.proveedorForm.value.ingbrutos,
        email: this.proveedorForm.value.email,
        www: this.proveedorForm.value.www,
        cta_proveedores: this.proveedorForm.value.cta_proveedores,
        fec_proceso: new Date()
      };

      this.subirdata.editProveedor(proveedorData).subscribe({
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
                text: 'El proveedor se actualizó correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              console.log('Proveedor actualizado correctamente');
              this.router.navigate(['components/proveedores']);
            }
          });
        },
        error: (error) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el proveedor',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          console.error('Error updating proveedor:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.proveedorForm);
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
    this.router.navigate(['/components/proveedores']);
  }

  monitorFormChanges(): void {
    Object.keys(this.proveedorForm.controls).forEach(field => {
      const control = this.proveedorForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.nombreFlag = this.proveedorForm.controls['nombre'].invalid;
        this.direccionFlag = this.proveedorForm.controls['direccion'].invalid;
        this.localidadFlag = this.proveedorForm.controls['localidad'].invalid;
        this.telefonoFlag = this.proveedorForm.controls['telefono'].invalid;
        this.cuitFlag = this.proveedorForm.controls['cuit'].invalid;
        this.emailFlag = this.proveedorForm.controls['email'].invalid;
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
