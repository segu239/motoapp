import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, NgControl, FormsModule, ReactiveFormsModule, AbstractControl, ValidatorFn, AbstractControlOptions, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { debounceTime, timeout } from 'rxjs/operators';
import { CargardataService } from 'src/app/services/cargardata.service';
import { first, take } from 'rxjs/operators';

@Component({
  selector: 'app-newcliente',
  templateUrl: './newcliente.component.html',
  styleUrls: ['./newcliente.component.css']
})
export class NewclienteComponent {
  public nuevoclienteForm!: FormGroup;
  public clienteFrompuntoVenta: any;
  public sucursal: any;
  public nombreFlag: boolean;
  public cuitFlag: boolean;
  public dniFlag: boolean;
  public telefonoFlag: boolean;
  public direccionFlag: boolean;
  public cod_ivaFlag: boolean;
  public vendedores: any[];
  public vendedor: any;
  public codigoVendedor: any;
  public nombreVendedor: any;

  constructor(private _cargardata: CargardataService, private subirdata: SubirdataService, private router: Router, private activatedRoute: ActivatedRoute, private fb: FormBuilder) {
    this.cargarForm();
    this.monitorFormChanges();
    this.cargarVendedor();
  }
  cargarForm() {
    this.nuevoclienteForm = this.fb.group({
      nombre: new FormControl('', Validators.compose([Validators.required,
      Validators.pattern(/^([a-zA-Z0-9\sñÑ]{2,40}){1}$/)
      ])),
      cuit: new FormControl('', Validators.compose([Validators.required,
      Validators.pattern(/^(0|[0-9]{11})$/)
      ])),

      dni: new FormControl('', Validators.compose([Validators.required,
      Validators.pattern(/^([0-9]{8}){1}$/)
      ])),
      telefono: new FormControl(0, Validators.compose([
        Validators.pattern(/^(0|[0-9]{5,15}){1}$/)
      ])),
      direccion: new FormControl('', Validators.compose([Validators.required,
      Validators.pattern(/^([a-zA-Z0-9°\.\-_\s,/ñÑªº]{2,60}){1}$/)
      ])),
      cod_iva: new FormControl('', Validators.required),
      ingresos_br: new FormControl('', Validators.required),
    },);
  }
  onSelectionVendedorChange(event: any) {
    this.codigoVendedor = this.vendedores[event.target.value].cod_ven;
    this.nombreVendedor = this.vendedores[event.target.value].vendedor;
  }

  onSelectionChange(event: any) {
    const selectedValue = event.target.value;
    console.log(selectedValue);
    if (selectedValue == "2") {
      this.nuevoclienteForm.controls['cuit'].setValue(0);
    }
    else {
      this.nuevoclienteForm.controls['cuit'].setValue("");
    }
    // Realiza acciones basadas en selectedValue
  }
  guardar(form: FormGroup) {
    if (form.valid)  // si el formulario es valido
    {
      const ivaArray: string[] = ["", "Responsable Inscripto", "Consumidor Final", "Monotributo", "Excento"];
      let indexnuevocli: number = Math.floor((Math.random() * 9999999) + 10000);//genera un numero entre 10000 y 9999999 incluidos
      let sucursal: any = localStorage.getItem('sucursal');
      let nuevoclirandom: number = Math.floor((Math.random() * 99999) + 10000);
      let date = new Date();
      let fecha = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();//let fecha= date.getDate() + "/"+ (date.getMonth()+ 1) + "/" +date.getFullYear();
      let hora = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
      let nuevoCliente =
      {
        "cliente": (sucursal * 100000) + nuevoclirandom,//parseInt(form.value.cliente)
        "nombre": form.value.nombre,
        "direccion": form.value.direccion,
        "dni": parseInt(form.value.dni),
        "cuit": form.value.cuit,
        "cod_iva": parseInt(form.value.cod_iva),
        "cod_ven": this.codigoVendedor,//this.vendedor.cod_ven,//parseInt(form.value.cod_ven),
        "cod_zona": sucursal,//parseInt(form.value.cod_zona),
        "tipoiva": ivaArray[form.value.cod_iva],// ""
        "vendedor": this.nombreVendedor,//this.vendedor.vendedor,
        "zona": "",//form.value.zona,//"",
        "telefono": form.value.telefono,
        "estado": "",//"",
        "idcli": indexnuevocli,//parseInt(form.value.idcli),
        "id_cli": indexnuevocli,//parseInt(form.value.id_cli),
        "fecha": fecha,
        "hora": hora,
        "ingresos_br": form.value.ingresos_br,
        "n_sucursal": sucursal,
        "id_suc": indexnuevocli,
        "estado_act": ""
      }
      if (nuevoCliente.cuit == 0 && nuevoCliente.tipoiva != "Consumidor Final") {
        Swal.fire({
          title: 'ERROR',
          text: 'Se requiere un cuit para este tipo de IVA',
          icon: 'error',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          cancelButtonText: 'Cancelar'
        });
      }
      else {
        console.log(nuevoCliente);
        this.subirdata.subirDatosClientes(nuevoCliente, sucursal).subscribe((data: any) => {
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
      }
    }
    else {
      this.monitorFormChanges();
      //mostrar en consola que input del formulario es invalido
      console.log(form.errors);
      console.log(form);
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos invalidos o vacios o con formato incorrecto',
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'OK',
      });
      console.log("invalido");
      // Marca los campos como tocados para que se muestren los errores
      for (const control in form.controls) {
        form.get(control).markAsTouched();
      }
    }
  }
  cargarVendedor() {
    this._cargardata.vendedores().pipe(take(1)).subscribe((resp: any) => {
      console.log(resp);
      this.vendedores = resp.mensaje;
    });
  }

  monitorFormChanges() {
    Object.keys(this.nuevoclienteForm.controls).forEach(field => {
      const control = this.nuevoclienteForm.get(field);
      control.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.nombreFlag = this.nuevoclienteForm.controls['nombre'].invalid;
        this.cuitFlag = this.nuevoclienteForm.controls['cuit'].invalid;
        this.dniFlag = this.nuevoclienteForm.controls['dni'].invalid;
        this.telefonoFlag = this.nuevoclienteForm.controls['telefono'].invalid;
        this.direccionFlag = this.nuevoclienteForm.controls['direccion'].invalid;
      });
    });
  }
}
