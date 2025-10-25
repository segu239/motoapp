import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, NgControl, FormsModule, ReactiveFormsModule, AbstractControl, ValidatorFn, AbstractControlOptions, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { debounceTime } from 'rxjs/operators';

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
  public accion: string = "";

  // ============================================
  // PROTECCIÓN: Cliente especial '109' no puede ser eliminado
  // Fecha: 2025-10-24
  // ============================================
  private readonly CLIENTE_NO_ELIMINABLE = '109';

  constructor(private subirdata: SubirdataService, private router: Router, private activatedRoute: ActivatedRoute, private fb: FormBuilder) {

    this.sucursal = sessionStorage.getItem('sucursal');
    this.clienteFrompuntoVenta = this.activatedRoute.snapshot.queryParamMap.get('cliente');
    this.clienteFrompuntoVenta = JSON.parse(this.clienteFrompuntoVenta);
    console.log(this.clienteFrompuntoVenta);
    this.inicializarForm();
    this.cargarDatosForm();
    this.monitorFormChanges();
  }
  ngOnInit(): void {
  }
  inicializarForm() {
    this.editarclienteForm = new FormGroup({
      nombre: new FormControl(''),
      cuit: new FormControl(''),
      dni: new FormControl(''),
      telefono: new FormControl(''),
      direccion: new FormControl(''),
      tipoiva: new FormControl(''),
      ingresos_br: new FormControl(''),
    });
 /*    this.editarclienteForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^([a-zA-Z0-9\sñÑ]{2,40}){1}$/)]], // Nombre debe tener mínimo 2 caracteres
      direccion: ['', [Validators.required, Validators.pattern(/^([a-zA-Z0-9°\.\-_\s,/ñÑªº]{2,60}){1}$/)]], // Dirección debe tener mínimo 2 caracteres
      cuit: ['', [Validators.required, Validators.pattern(/^(0|[0-9]{11})$/)]], // CUIT debe ser 11 dígitos
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]], // DNI debe ser 8 dígitos
      telefono: ['', [Validators.required, this.clienteFrompuntoVenta.telefono || 0, Validators.pattern(/^(0|[0-9]{5,15}){1}$/)]], // Teléfono entre 5 y 15 dígitos
      tipoiva: ['', Validators.required],
      ingresos_br: ['', Validators.required]
    }); */
  }
  cargarDatosForm() {
    // ========================================
    // NORMALIZACIÓN DE DATOS - SOLUCIÓN 1
    // ========================================

    // 1. NORMALIZAR TIPOIVA
    // Opciones válidas del select (deben coincidir EXACTAMENTE con el HTML)
    const opcionesIvaValidas = ["Excento", "Monotributo", "Consumidor Final", "Responsable Inscripto"];

    let tipoiva = this.clienteFrompuntoVenta.tipoiva;

    // Caso 1: valor nulo o indefinido -> valor por defecto
    if (tipoiva === null || tipoiva === undefined) {
      tipoiva = '';
      console.warn('[EditCliente] tipoiva es null/undefined, usando valor vacío');
    }
    // Caso 2: valor es string -> normalizar con trim
    else if (typeof tipoiva === 'string') {
      tipoiva = tipoiva.trim();
      console.log('[EditCliente] tipoiva original:', this.clienteFrompuntoVenta.tipoiva);
      console.log('[EditCliente] tipoiva normalizado:', tipoiva);

      // Validar que el valor esté en las opciones válidas
      if (!opcionesIvaValidas.includes(tipoiva)) {
        console.warn('[EditCliente] tipoiva no coincide con opciones válidas:', tipoiva);
        // No modificar el valor, dejarlo como está para debug
      }
    }
    // Caso 3: valor es numérico (cod_iva) -> convertir a texto
    else if (typeof tipoiva === 'number') {
      const ivaArray: string[] = ["", "Responsable Inscripto", "Consumidor Final", "Monotributo", "Excento"];
      tipoiva = ivaArray[tipoiva] || '';
      console.log('[EditCliente] tipoiva era numérico, convertido a:', tipoiva);
    }
    // Caso 4: tipo de dato inesperado
    else {
      console.error('[EditCliente] tipoiva tiene tipo inesperado:', typeof tipoiva, tipoiva);
      tipoiva = '';
    }

    // 2. NORMALIZAR INGRESOS_BR
    let ingresosBr = this.clienteFrompuntoVenta.ingresos_br;

    console.log('[EditCliente] ingresos_br original:', ingresosBr, 'tipo:', typeof ingresosBr);

    // Caso 1: valor es string -> normalizar a minúsculas
    if (typeof ingresosBr === 'string') {
      ingresosBr = ingresosBr.toLowerCase().trim();

      // Validar valores esperados
      if (ingresosBr !== 'si' && ingresosBr !== 'no') {
        console.warn('[EditCliente] ingresos_br string no válido:', ingresosBr, '-> usando "no"');
        ingresosBr = 'no';
      }
    }
    // Caso 2: valor numérico -> convertir a "si"/"no"
    else if (typeof ingresosBr === 'number') {
      ingresosBr = (ingresosBr === 1) ? 'si' : 'no';
      console.log('[EditCliente] ingresos_br numérico convertido a:', ingresosBr);
    }
    // Caso 3: valor booleano -> convertir a "si"/"no"
    else if (typeof ingresosBr === 'boolean') {
      ingresosBr = ingresosBr ? 'si' : 'no';
      console.log('[EditCliente] ingresos_br booleano convertido a:', ingresosBr);
    }
    // Caso 4: valor nulo, indefinido o vacío -> valor por defecto "no"
    else if (ingresosBr === null || ingresosBr === undefined || ingresosBr === '') {
      ingresosBr = 'no';
      console.log('[EditCliente] ingresos_br null/undefined/vacío -> usando "no"');
    }
    // Caso 5: tipo inesperado
    else {
      console.error('[EditCliente] ingresos_br tiene tipo inesperado:', typeof ingresosBr, ingresosBr);
      ingresosBr = 'no';
    }

    console.log('[EditCliente] ingresos_br normalizado:', ingresosBr);

    // 3. CREAR FORMULARIO CON VALORES NORMALIZADOS
    this.editarclienteForm = this.fb.group({
      nombre: new FormControl(this.clienteFrompuntoVenta.nombre.trim(), Validators.compose([Validators.required,
      Validators.pattern(/^([a-zA-Z0-9\sñÑ]{2,40}){1}$/)
      ])),
      cuit: new FormControl(this.clienteFrompuntoVenta.cuit, Validators.compose([Validators.required,
      Validators.pattern(/^(0|[0-9]{11})$/)
      ])),
      dni: new FormControl(this.clienteFrompuntoVenta.dni, Validators.compose([Validators.required,
      Validators.pattern(/^([0-9]{8}){1}$/)
      ])),
      telefono: new FormControl(this.clienteFrompuntoVenta.telefono || 0, Validators.compose([
        Validators.pattern(/^(0|[0-9]{5,15}){1}$/)
      ])),
      direccion: new FormControl(this.clienteFrompuntoVenta.direccion.trim(), Validators.compose([Validators.required,
      Validators.pattern(/^([a-zA-Z0-9°\.\-_\s,/ñÑªº]{2,60}){1}$/)
      ])),
      tipoiva: new FormControl(tipoiva),  // ✅ Valor normalizado
      ingresos_br: new FormControl(ingresosBr),  // ✅ Valor normalizado
    },);

    // Log final para verificación
    console.log('[EditCliente] Formulario cargado con valores:', {
      tipoiva: tipoiva,
      ingresos_br: ingresosBr
    });
  }
  onSelectionChange(event: any) {
    const selectedValue = event.target.value;
    console.log(selectedValue);
    if (selectedValue == "Consumidor Final") {
      this.editarclienteForm.controls['cuit'].setValue(0);
    }
    else {
      this.editarclienteForm.controls['cuit'].setValue("");
    }
    // Realiza acciones basadas en selectedValue
  }
  guardar(form: FormGroup) {
    if (form.valid)  // si el formulario es valido
    {
      let cod_iva = this.clienteFrompuntoVenta.cod_iva;
      console.log("TIPO IVA:" + form.value.tipoiva);
      if (form.value.tipoiva == "Excento") {
        cod_iva = 4;
      }
      else if (form.value.tipoiva == "Monotributo") {
        cod_iva = 3;
      }
      else if (form.value.tipoiva == "Responsable Inscripto") {
        cod_iva = 1;
      }
      else if (form.value.tipoiva == "Consumidor Final") {
        cod_iva = 2;
      }
      let date = new Date();
      let fecha = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();//let fecha= date.getDate() + "/"+ (date.getMonth()+ 1) + "/" +date.getFullYear();
      let hora = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
      let editadoCliente =
      {
        "cliente": parseInt(this.clienteFrompuntoVenta.cliente),
        "nombre": form.value.nombre,
        "direccion": form.value.direccion,
        "dni": parseInt(form.value.dni),
        "cuit": form.value.cuit,
        "cod_iva": cod_iva,//parseInt(this.clienteFrompuntoVenta.cod_iva),
        "cod_ven": parseInt(this.clienteFrompuntoVenta.cod_ven),
        "cod_zona": parseInt(this.clienteFrompuntoVenta.cod_zona),
        "tipoiva": form.value.tipoiva,//this.clienteFrompuntoVenta.tipoiva,// ""
        "vendedor": this.clienteFrompuntoVenta.vendedor,
        "zona": this.clienteFrompuntoVenta.zona,//"",
        "telefono": form.value.telefono,
        "estado": "editado",//"",
        "idcli": parseInt(this.clienteFrompuntoVenta.idcli),
        "id_cli": parseInt(this.clienteFrompuntoVenta.id_cli),
        "fecha": fecha,
        "hora": hora,
        "ingresos_br": form.value.ingresos_br,
        "n_sucursal": this.clienteFrompuntoVenta.n_sucursal,
        "id_suc": parseInt(this.clienteFrompuntoVenta.id_suc),
        "estado_act": this.clienteFrompuntoVenta.estado_act
      }
      console.log(editadoCliente);
      if (this.accion == "eliminar") {
        // PROTECCIÓN: No permitir eliminar cliente especial '109'
        if (this.clienteFrompuntoVenta.cliente === this.CLIENTE_NO_ELIMINABLE) {
          Swal.fire({
            icon: 'error',
            title: 'Operación no permitida',
            html: `
              <div style="text-align: left; padding: 0 20px;">
                <p><strong>CONSUMIDOR FINAL</strong> es un cliente genérico del sistema.</p>
                <hr style="margin: 15px 0;">
                <p>🚫 No se permite eliminar este cliente especial</p>
                <p>💡 Este cliente es necesario para el funcionamiento del sistema</p>
              </div>
            `,
            confirmButtonText: 'Entendido'
          });
          console.log('🚫 Eliminación bloqueada - Cliente 109 no puede eliminarse');
          return;  // ← Abortar operación
        }

        // Código original de eliminación
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
      else if (this.accion == "guardar") {
        if (editadoCliente.cuit == 0 && editadoCliente.tipoiva != "Consumidor Final") {
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
          });
        }
      }
    }
    else {
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