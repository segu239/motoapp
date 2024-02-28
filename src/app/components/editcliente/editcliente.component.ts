import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, NgControl, FormsModule, ReactiveFormsModule, AbstractControl, ValidatorFn, AbstractControlOptions, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { debounceTime } from 'rxjs/operators';
/* export interface BooleanFn {
  (): boolean;
}
export function conditionalValidator(predicate: BooleanFn,
                              validator: ValidatorFn,
                              errorNamespace?: string): ValidatorFn {
  return (formControl => {
    if (!formControl.parent) {
      return null;
    }
    let error = null;
    if (predicate()) {
      error = validator(formControl);
    }
    if (errorNamespace && error) {
      const customError = {};
      customError[errorNamespace] = error;
      error = customError
    }
    return error;
  })
} */

@Component({
  selector: 'app-editcliente',
  templateUrl: './editcliente.component.html',
  styleUrls: ['./editcliente.component.css']
})
export class EditclienteComponent implements OnInit {
  public editarclienteForm!: FormGroup;


  public clienteFrompuntoVenta: any;
  public sucursal: any;

  public nombreFlag: boolean;
  public cuitFlag: boolean;
  public dniFlag: boolean;
  public telefonoFlag: boolean;
  public direccionFlag: boolean;

  public accion:string = "";

  constructor(private subirdata: SubirdataService, private router: Router, private activatedRoute: ActivatedRoute, private fb: FormBuilder) {

    this.sucursal = localStorage.getItem('sucursal');
    /*  this.editarclienteForm = new FormGroup({
       nombre:new FormControl(''),
       apellido:new FormControl(''), 
       cuit: new FormControl(''),
       dni: new FormControl(''),
       telefono:new FormControl(''),
      direccion: new FormControl(''),
   }); */

    //this.cargarDatosForm();

    //this.activatedRoute.params.subscribe((params:any) => {
    //console.log( params);
    //this.datoscliente= JSON.parse(params.datoscliente);
    //console.log(this.datoscliente["nombre"])
    //this.cargarDatosForm();

    //});
    //console.log(this.clienteFrompuntoVenta);
    //console.log(this.clienteFrompuntoVenta.nombre);

    this.clienteFrompuntoVenta = this.activatedRoute.snapshot.queryParamMap.get('cliente');
    this.clienteFrompuntoVenta = JSON.parse(this.clienteFrompuntoVenta);
    console.log(this.clienteFrompuntoVenta);
    this.inicializarForm();
    this.cargarDatosForm();
    this.monitorFormChanges();
    /*  this.activatedRoute.paramMap.subscribe(params => {
       this.clienteFrompuntoVenta = JSON.parse(params.get('_cliente'));
       console.log(this.clienteFrompuntoVenta);
     }); */
  }
  ngOnInit(): void {

  }
  inicializarForm() {
    this.editarclienteForm = new FormGroup({
      nombre: new FormControl(''),
      // apellido:new FormControl(''), 
      cuit: new FormControl(''),
      dni: new FormControl(''),
      telefono: new FormControl(''),
      direccion: new FormControl(''),
      tipoiva: new FormControl(''),
      ingresos_br: new FormControl(''),
    });
  }
  cargarDatosForm() {
    this.editarclienteForm = this.fb.group({
      nombre: new FormControl(this.clienteFrompuntoVenta.nombre.trim(), Validators.compose([Validators.required,
      Validators.pattern(/^([a-zA-Z0-9\sñÑ]{2,40}){1}$/)
      ])),

      /* cuit: new FormControl(parseInt(this.clienteFrompuntoVenta.cuit),Validators.compose([conditionalValidator(() => {
        if (this.editarclienteForm.get('cod_iva').value == "2")
        {
          return false;
        }
        else {return true;}
      },
                              Validators.required,
                              'illuminatiError'),
            Validators.pattern(/^([0-9]{11}){1}$/)
        ])), */

     /*  cuit: new FormControl(this.clienteFrompuntoVenta.cuit, Validators.compose([Validators.required,
      Validators.pattern(/^([0-9]{11}){1}$/)
      ])), */
      cuit: new FormControl(this.clienteFrompuntoVenta.cuit, Validators.compose([Validators.required,
        Validators.pattern(/^(0|[0-9]{11})$/)
      ])),

      dni: new FormControl(this.clienteFrompuntoVenta.dni, Validators.compose([Validators.required,
      Validators.pattern(/^([0-9]{8}){1}$/)
      ])),

     /*  telefono: new FormControl(this.clienteFrompuntoVenta.telefono, Validators.compose([Validators.required,
      Validators.pattern(/^([0-9]{5,15}){1}$/)
      ])), */

      telefono: new FormControl(this.clienteFrompuntoVenta.telefono || 0, Validators.compose([
        Validators.pattern(/^(0|[0-9]{5,15}){1}$/)
      ])),

      direccion: new FormControl(this.clienteFrompuntoVenta.direccion.trim(), Validators.compose([Validators.required,
      Validators.pattern(/^([a-zA-Z0-9°\.\-_\s,/ñÑªº]{2,60}){1}$/)
      ])),
      tipoiva: new FormControl(this.clienteFrompuntoVenta.tipoiva),
      ingresos_br: new FormControl(this.clienteFrompuntoVenta.ingresos_br),

      // cod_iva: new FormControl('',Validators.required),

    },);
    /* this.editarclienteForm.get('cod_iva').valueChanges
      .subscribe(value => {
          console.log(value);
      }); */
  }
 /*  eliminarCliente(form: FormGroup) {
    if (form.valid)  // si el formulario es valido
    {
      let editadoCliente =
      {
        
        "idcli": parseInt(this.clienteFrompuntoVenta.idcli),
        "id_cli": parseInt(this.clienteFrompuntoVenta.id_cli),
     
      }
      this.subirdata.eliminarCliente(editadoCliente, this.sucursal).subscribe((data: any) => {
        console.log(data);
      });
    }
    
  } */
  onSelectionChange(event: any) {
    const selectedValue = event.target.value;
    console.log(selectedValue);
    if (selectedValue == "Consumidor Final") {
      this.editarclienteForm.controls['cuit'].setValue(0);
      //this.editarclienteForm.controls['cuit'].disable();
    }
    else {
      this.editarclienteForm.controls['cuit'].setValue("");
      //this.editarclienteForm.controls['cuit'].enable();
    }
    // Realiza acciones basadas en selectedValue
  }

  guardar(form: FormGroup) 
  {
    if (form.valid)  // si el formulario es valido
    {

     let cod_iva = this.clienteFrompuntoVenta.cod_iva;
     console.log("TIPO IVA:" + form.value.tipoiva);
     if(form.value.tipoiva == "Excento")
     {
        cod_iva = 4;
     }
      else if(form.value.tipoiva == "Monotributo")
      {
        cod_iva = 3;
      }
      else if(form.value.tipoiva == "Responsable Inscripto")
      {
        cod_iva = 1;
      }
      else if(form.value.tipoiva == "Consumidor Final")
      {
        cod_iva = 2;
      }
    


      let date = new Date();
      let fecha = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();//let fecha= date.getDate() + "/"+ (date.getMonth()+ 1) + "/" +date.getFullYear();
      let hora = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

      let editadoCliente =
      {
        "cliente": parseInt(this.clienteFrompuntoVenta.cliente),
        "nombre": form.value.nombre,
        // "apellido": value.value.apellido,
        "direccion": form.value.direccion,
        "dni": parseInt(form.value.dni),
        "cuit": form.value.cuit,
        "cod_iva": cod_iva,//parseInt(this.clienteFrompuntoVenta.cod_iva),

        "cod_ven": parseInt(this.clienteFrompuntoVenta.cod_ven),
        "cod_zona": parseInt(this.clienteFrompuntoVenta.cod_zona),
        "tipoiva": form.value.tipoiva,//this.clienteFrompuntoVenta.tipoiva,// ""
        "vendedor": this.clienteFrompuntoVenta.vendedor,


        "zona":this.clienteFrompuntoVenta.zona,//"",
        "telefono": form.value.telefono,
        "estado": "editado",//"",
        "idcli": parseInt(this.clienteFrompuntoVenta.idcli),
        "id_cli": parseInt(this.clienteFrompuntoVenta.id_cli),
        "fecha": fecha,
        "hora": hora,
        "ingresos_br": form.value.ingresos_br,
        "n_sucursal":this.clienteFrompuntoVenta.n_sucursal,
        "id_suc":parseInt(this.clienteFrompuntoVenta.id_suc),
        "estado_act":this.clienteFrompuntoVenta.estado_act
      }

      console.log(editadoCliente);
      if(this.accion == "eliminar")
      {
        this.subirdata.eliminarCliente(editadoCliente, this.sucursal).subscribe((data: any) => {
          console.log(data);
          Swal.fire({
            title: 'Eliminando...',
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
      else if(this.accion == "guardar")
      {
        if(editadoCliente.cuit == 0 && editadoCliente.tipoiva != "Consumidor Final")
        {
          Swal.fire({
            title: 'ERROR',
            text: 'Se requiere un cuit para este tipo de IVA',
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            //confirmButtonText: 'OK',
            cancelButtonText: 'Cancelar'
          });
        }
        else
        {
        this.subirdata.editarDatosClientes(editadoCliente, this.sucursal).subscribe((data: any) => {
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
          /* setTimeout(() => {
            window.history.back(); //vuelvo atras// Aquí va el código que deseas ejecutar después de un cierto tiempo
          }, 1000); */
        });
        }
      }
      

      //window.history.back(); //vuelvo atras
    }
    else {


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
        //cancelButtonText: 'Cancelar'
      });
      console.log("invalido");
      // Marca los campos como tocados para que se muestren los errores
      for (const control in form.controls) {
        form.get(control).markAsTouched();
      }
    }

    
  }

  monitorFormChanges() {
    Object.keys(this.editarclienteForm.controls).forEach(field => {
      const control = this.editarclienteForm.get(field);
      control.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
  
        this.nombreFlag = this.editarclienteForm.controls['nombre'].invalid;
        this.cuitFlag = this.editarclienteForm.controls['cuit'].invalid;
        this.dniFlag = this.editarclienteForm.controls['dni'].invalid;
        this.telefonoFlag = this.editarclienteForm.controls['telefono'].invalid;
        this.direccionFlag = this.editarclienteForm.controls['direccion'].invalid;
      });
    });
  }
}