import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-newproveedor',
  templateUrl: './newproveedor.component.html',
  styleUrls: ['./newproveedor.component.css']
})
export class NewproveedorComponent {
  public nuevoproveedorForm!: FormGroup;
  public codProvFlag: boolean = false;
  public nombreFlag: boolean = false;
  public direccionFlag: boolean = false;
  public telefonoFlag: boolean = false;
  public cuitFlag: boolean = false;
  public emailFlag: boolean = false;

  constructor(
    private subirdata: SubirdataService, 
    private router: Router, 
    private fb: FormBuilder
  ) {
    this.cargarForm();
    this.monitorFormChanges();
  }
  onSelectionIvaChange(event: any) {
    const selectedValue = event.target.value;
    console.log("Código IVA seleccionado:", selectedValue);
    
    // If "Consumidor Final" is selected, set CUIT to 0
    if (selectedValue === "2") {
      this.nuevoproveedorForm.controls['cuit'].setValue(0);
    } else {
      // For other IVA types, clear the CUIT field
      this.nuevoproveedorForm.controls['cuit'].setValue("");
    }
  }

  cargarForm() {
    this.nuevoproveedorForm = this.fb.group({
      cod_prov: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,6}$/)
      ])),
      nombre: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{1,40}$/)
      ])),
      direccion: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s\.°ªº]{1,40}$/)
      ])),
      codpos: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9\/-_]{0,8}$/)
      ])),
      localidad: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{0,35}$/)
      ])),
      telefono: new FormControl('', Validators.compose([
        Validators.pattern(/^[0-9\-\(\)\s]{0,40}$/)
      ])),
      cuit: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{11}$/)
      ])),
      contacto: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{0,40}$/)
      ])),
      rubro: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ\s]{0,30}$/)
      ])),
     /*  cod_iva: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,2}$/)
      ])), */
      cod_iva: new FormControl('4', Validators.compose([
        Validators.required
      ])),
      ganancias: new FormControl(0, Validators.compose([
        Validators.pattern(/^[0-9]{0,15}$/)
      ])),
      ingbrutos: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9\/-_]{0,15}$/)
      ])),
      email: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ])),
      www: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9\/-_.:]{0,40}$/)
      ])),
      cta_proveedores: new FormControl('', Validators.compose([
        Validators.pattern(/^[a-zA-Z0-9\/-_]{0,8}$/)
      ])),
      fec_proceso: new FormControl(new Date())
    });
  }

  guardar(form: FormGroup) {
    if (form.valid) {
      // Format date to YYYY-MM-DD format
      const formatDate = (date: any): string => {
        if (!date) return '';
        const dateObj = new Date(date);
        return dateObj.getFullYear() + '-' + 
               String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
               String(dateObj.getDate()).padStart(2, '0');
      };

      let nuevoProveedor = {
        "cod_prov": form.value.cod_prov,
        "nombre": form.value.nombre,
        "direccion": form.value.direccion,
        "codpos": form.value.codpos,
        "localidad": form.value.localidad,
        "telefono": form.value.telefono,
        "cuit": form.value.cuit,
        "contacto": form.value.contacto,
        "rubro": form.value.rubro,
        "cod_iva": form.value.cod_iva,
        "ganancias": form.value.ganancias,
        "ingbrutos": form.value.ingbrutos,
        "email": form.value.email,
        "www": form.value.www,
        "cta_proveedores": form.value.cta_proveedores,
        "fec_proceso": formatDate(form.value.fec_proceso)
      }

      this.subirdata.subirDatosProveedor(nuevoProveedor).subscribe((data: any) => {
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
    Object.keys(this.nuevoproveedorForm.controls).forEach(field => {
      const control = this.nuevoproveedorForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.codProvFlag = this.nuevoproveedorForm.controls['cod_prov'].invalid;
        this.nombreFlag = this.nuevoproveedorForm.controls['nombre'].invalid;
        this.direccionFlag = this.nuevoproveedorForm.controls['direccion'].invalid;
        this.telefonoFlag = this.nuevoproveedorForm.controls['telefono'].invalid;
        this.cuitFlag = this.nuevoproveedorForm.controls['cuit'].invalid;
        this.emailFlag = this.nuevoproveedorForm.controls['email'].invalid;
      });
    });
  }
}
