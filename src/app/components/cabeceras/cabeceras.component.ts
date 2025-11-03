import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Cabecera } from '../../interfaces/cabecera';
import { Recibo } from 'src/app/interfaces/recibo';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { Cliente } from '../../interfaces/cliente';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { first, take, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2'; // Import SweetAlert2
import { Subject } from 'rxjs';
import { CrudService } from 'src/app/services/crud.service';
import { formatDate } from '@angular/common';
import { MotomatchBotService } from 'src/app/services/motomatch-bot.service';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Text } from '@angular/compiler';
import { TarjCredito } from 'src/app/interfaces/tarjcredito';
import { NumeroPalabrasService } from '../../services/numero-palabras.service';
import { getEmpresaConfig } from '../../config/empresa-config';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
@Component({
  selector: 'app-cabeceras',
  templateUrl: './cabeceras.component.html',
  styleUrls: ['./cabeceras.component.css']
})
export class CabecerasComponent implements OnDestroy {
  public cabeceras: Cabecera[];
  public cabeceraElejida: Cabecera;
  public clienteFromCuentaCorriente: any;
  public selectedCabeceras: Cabecera[] = [];
  public selectedCabecerasIniciales: any;
  public totalSum: number = null;
  public totalGeneralSaldos: number = 0;
  public importe: number = null;
  public tipo: TarjCredito[] = [];
  filteredTipo: TarjCredito[] = [];
  public tipoVal: string = 'Condicion de Venta';
  public codTarj: string = '';
  public listaPrecio: string = '';
  public activaDatos: number;
  public interes: number = 0;
  public bonificacion: number = 0;
  public interesType: string = 'P';      // P = Porcentaje, I = Importe
  public bonificacionType: string = 'P'; // P = Porcentaje, I = Importe
  public tarjeta = {
    Titular: '',
    Dni: 0,
    Numero: 0,
    Autorizacion: 0
  };
  public cheque = {
    Banco: '',
    Ncuenta: 0,
    Ncheque: 0,
    Nombre: '',
    Plaza: '',
    ImporteImputar: 0,
    ImporteCheque: 0,
    FechaCheque: null
  };
  searchText: string;
  public opcionesPagoFlag: boolean = true;
  public numerocomprobantecabecera: number;
  public FechaCalend: any;
  public inputOPFlag: boolean = true;
  public puntoVenta_flag: boolean = true;
  public letras_flag: boolean = true;
  public letras: any = ["A", "B", "C"];
  public letraValue: string = "A";
  public tipoDoc: string = "FC";
  
  // Condiciones de venta específicas para PR
  public condicionesPR: any[] = [
    {
      cod_tarj: "12",
      tarjeta: "EFECTIVO AJUSTE", 
      idcp_ingreso: "77"
    },
    {
      cod_tarj: "1112", 
      tarjeta: "TRANSFERENCIA AJUSTE",
      idcp_ingreso: "80"
    }
  ];
  public puntoventa: number = 0;
  public vendedores: any[] = [];
  public vendedoresV: any;
  private myRegex = new RegExp('^[0-9]+$');
  public numerocomprobante: string;
  public cliente: any;
  public sucursal: string = '';
  public usuario: any;
  public fecha_recibo: any;
  public recibos: Recibo[] = [];
  public numerocomprobanterecibo: number;
  public currentSaldoArray: any[] = [];
  public letraSelectedFormCabecera: any;
  public puntoventaSelectedFormCabecera: any;
  public cabecerasFiltered: any[] = [];
  public sucursalNombre: string = '';
  public numero_fac: number;
  private destroy$ = new Subject<void>();

  constructor(
    private bot: MotomatchBotService, 
    private _crud: CrudService, 
    private activatedRoute: ActivatedRoute, 
    private _cargardata: CargardataService, 
    private _router: Router, 
    private cdr: ChangeDetectorRef,
    private numeroPalabrasService: NumeroPalabrasService
  ) {
    this.getNombreSucursal();
  }
  ngOnInit(): void {
    this.clienteFromCuentaCorriente = this.activatedRoute.snapshot.queryParamMap.get('cliente');
    this.clienteFromCuentaCorriente = JSON.parse(this.clienteFromCuentaCorriente);
    console.log('🔍 DEPURACIÓN - Cliente seleccionado:', this.clienteFromCuentaCorriente);
    console.log('🔍 DEPURACIÓN - ID del cliente:', this.clienteFromCuentaCorriente.idcli);
    
    let sucursal: string = sessionStorage.getItem('sucursal');
    console.log('🔍 DEPURACIÓN - Sucursal:', sucursal);
    console.log('🔍 DEPURACIÓN - Consultando tabla: factcab' + sucursal);
    
    this._cargardata.cabecerax(sucursal, this.clienteFromCuentaCorriente.idcli).pipe(take(1)).subscribe((resp: any) => {
      console.log('🔍 DEPURACIÓN - Respuesta de cabecerax:', resp);
      console.log('🔍 DEPURACIÓN - Cantidad de registros:', resp.mensaje ? resp.mensaje.length : 0);
      
      if (resp.mensaje && resp.mensaje.length > 0) {
        console.log('🔍 DEPURACIÓN - Primer registro encontrado:', resp.mensaje[0]);
      } else {
        console.warn('⚠️ Sin registros de cuenta corriente para cliente ID:', this.clienteFromCuentaCorriente.idcli);
        console.log('🔍 DEPURACIÓN - Verificar si el cliente tiene facturas con saldo != 0 en factcab' + sucursal);
      }
      
      this.cabeceras = resp.mensaje;
      this.calcularTotalGeneralSaldos();
    }, (err) => { 
      console.error('❌ ERROR en cabecerax:', err);
    });
    //cargo opciones de pago------------------------------
    this._cargardata.tarjcredito().pipe(take(1)).subscribe((resp: any) => {
      this.tipo = resp.mensaje;
      console.log(this.tipo);
      this.filterByDay();
    });
    //-----------------------------------------------------
    // get vendedores -------------------------------------
    this.getVendedores();
    //-----------------------------------------------------
    //get clientes-----------------------------------------
    const clienteData = sessionStorage.getItem('datoscliente');
    if (clienteData) {
      try {
        this.cliente = JSON.parse(clienteData);
      } catch (error) {
        console.error('Error al parsear datos del cliente:', error);
        this.cliente = this.clienteFromCuentaCorriente;
      }
    } else {
      this.cliente = this.clienteFromCuentaCorriente;
    }
    //-----------------------------------------------------
    //get sucursal-----------------------------------------
    this.sucursal = sessionStorage.getItem('sucursal');
    //-----------------------------------------------------
    //get usuario-----------------------------------------
    this.usuario = sessionStorage.getItem('sddggasdf');
    //-----------------------------------------------------
  }
  getNombreSucursal() {
    this.sucursal = sessionStorage.getItem('sucursal');
    
    this._crud.getListSnap('sucursales').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      data => {
        const sucursales = data.map(item => {
          const payload = item.payload.val() as any;
          return {
            nombre: payload.nombre,
            value: payload.value
          };
        });
        
        // Buscar la sucursal correspondiente en los datos cargados
        const sucursalEncontrada = sucursales.find(suc => suc.value.toString() === this.sucursal);
        if (sucursalEncontrada) {
          this.sucursalNombre = sucursalEncontrada.nombre;
        } else {
          // Guardar ID de sucursal para debugging
          console.warn('No se encontró la sucursal con ID:', this.sucursal);
          this.sucursalNombre = 'Sucursal ' + this.sucursal;
        }
      },
      error => {
        console.error('Error al cargar sucursales:', error);
        this.showNotification('Error al cargar las sucursales');
        
        // En caso de error, usamos un valor genérico como fallback
        this.sucursalNombre = 'Sucursal ' + this.sucursal;
      }
    );
  }
  filterByDay() {
    const dayOfWeek = new Date().getDay(); // Domingo - 0, Lunes - 1, ..., Sábado - 6
    const dayFieldMap = {
      0: 'd1', // Domingo
      1: 'd2', // Lunes
      2: 'd3', // Martes
      3: 'd4', // Miércoles
      4: 'd5', // Jueves
      5: 'd6', // Viernes
      6: 'd7'  // Sábado
    };
    const dayField = dayFieldMap[dayOfWeek];
    this.filteredTipo = this.tipo.filter(item => item[dayField] === '1');
  }
  onSelectionChange(event: any) {
    console.log('Selección cambió:', event);
    
    // Verificar que todos los documentos sean del mismo tipo
    if (event.length > 0) {
      const primerTipo = event[0].tipo;
      
      // Validar que todos los documentos seleccionados sean del mismo tipo
      const tiposDistintos = event.some(item => item.tipo !== primerTipo);
      
      if (tiposDistintos) {
        // Mostrar alerta y revertir selección
        Swal.fire({
          icon: 'warning',
          title: 'Selección inválida',
          text: 'No se pueden mezclar documentos de diferentes tipos (FC y PR)',
          confirmButtonText: 'Entendido'
        });
        
        // Revertir a la selección anterior usando setTimeout para que ocurra después del ciclo de Angular
        setTimeout(() => {
          this.selectedCabeceras = [...(this.selectedCabecerasIniciales || [])];
          // Forzar detección de cambios para actualizar la UI
          this.cdr.detectChanges();
          // Recalcular total con la selección revertida
          this.calculateTotalSum(this.selectedCabeceras);
        }, 0);
        return;
      }
      
      // Ordenar por fecha
      this.selectedCabeceras = event.sort((a: any, b: any) => {
        const dateA = new Date(a.emitido);
        const dateB = new Date(b.emitido);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Configurar tipo de pago según el tipo de documento
      if (primerTipo === 'PR') {
        this.tipoVal = "EFECTIVO AJUSTE";
        this.opcionesPagoFlag = true; // Mostrar dropdown de métodos de pago para PR
        this.codTarj = "12"; // Código de EFECTIVO AJUSTE por defecto
      } else if (primerTipo === 'FC') {
        this.tipoVal = "Condicion de Venta";
        this.opcionesPagoFlag = true; // Mostrar dropdown de métodos de pago
        this.codTarj = ""; // Limpiar selección
      }
      
      // Configurar datos de cabecera
      if (this.selectedCabeceras.length > 0) {
        this.letraSelectedFormCabecera = this.selectedCabeceras[0].letra;
        this.puntoventaSelectedFormCabecera = this.selectedCabeceras[0].puntoventa;
      }
      
      // Guardar selección actual como válida para futuras comparaciones
      this.selectedCabecerasIniciales = [...this.selectedCabeceras];
    } else {
      // Si no hay selección, restablecer valores por defecto
      this.selectedCabeceras = [];
      this.tipoVal = "Condicion de Venta";
      this.opcionesPagoFlag = true;
      this.codTarj = "";
      this.selectedCabecerasIniciales = [];
    }
    
    // Actualizar tipoDoc basado en la selección
    this.tipoDoc = event.length > 0 ? event[0].tipo : "FC";
    
    // Calcular total
    this.calculateTotalSum(this.selectedCabeceras);
  }
  evaluateEventTypes(event: any[]): boolean {
    // Recorre cada objeto en el array event
    for (const item of event) {
      console.log(item);
      console.log(item.tipo);
      // Verifica si la propiedad tipo es diferente de "FC", "ND", "NC"
      if (item.tipo == 'PR') {
        // Para PR: habilitar dropdown con dos opciones, EFECTIVO AJUSTE por defecto
        this.tipoVal = "EFECTIVO AJUSTE";
        this.opcionesPagoFlag = true; // Habilitar dropdown
        this.codTarj = "12"; // EFECTIVO AJUSTE por defecto
        return false;
      } else if (item.tipo == 'NV') {
        // Para NV: mantener comportamiento original (solo EFECTIVO)
        this.tipoVal = "EFECTIVO";
        this.opcionesPagoFlag = false;
        this.codTarj = "11";
        return false;
      }
    }
    // Si todos los elementos cumplen la condición, devuelve verdadero
    return true;
  }
  calculateTotalSum(selectedCabeceras: any[]) {
    this.totalSum = parseFloat(selectedCabeceras.reduce((sum, cabecera) => sum + parseFloat(cabecera.saldo.toString()), 0).toFixed(2));
  }
  
  calcularTotalGeneralSaldos() {
    if (this.cabeceras && this.cabeceras.length > 0) {
      this.totalGeneralSaldos = parseFloat(this.cabeceras.reduce((sum, cabecera) => sum + parseFloat(cabecera.saldo.toString()), 0).toFixed(2));
    }
  }

  // ✅ NUEVA FUNCIÓN PARA RECARGAR CABECERAS DESPUÉS DEL PAGO
  recargarCabeceras() {
    console.log('🔄 Recargando cabeceras después del pago...');
    let sucursal: string = sessionStorage.getItem('sucursal');
    
    this._cargardata.cabecerax(sucursal, this.clienteFromCuentaCorriente.idcli).pipe(take(1)).subscribe((resp: any) => {
      console.log('🔄 Cabeceras recargadas:', resp);
      
      if (resp.mensaje) {
        this.cabeceras = resp.mensaje;
        // ✅ RECALCULAR EL TOTAL GENERAL DE SALDOS CON LOS NUEVOS DATOS
        this.calcularTotalGeneralSaldos();
        console.log('✅ Total de saldos actualizado:', this.totalGeneralSaldos);
      } else {
        console.warn('⚠️ Sin registros después del pago');
        this.cabeceras = [];
        this.totalGeneralSaldos = 0;
      }
    }, (err) => { 
      console.error('❌ ERROR al recargar cabeceras:', err);
    });
  }
  // New function to handle the payment
  pago() {
    console.log(this.tipoVal);
    
    // Validar que haya documentos seleccionados
    if (this.selectedCabeceras.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debe seleccionar al menos un documento para pagar',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    
    if (this.totalSum <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El total a pagar debe ser mayor a 0',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    if (!this.importe || this.importe <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El importe ingresado debe ser mayor a 0',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    if (this.importe > this.totalSum) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El importe ingresado es mayor que el saldo total.',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    
    // Validar método de pago solo para FC cuando no se ha seleccionado
    if (this.selectedCabeceras[0].tipo === 'FC' && this.tipoVal == 'Condicion de Venta') {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debe seleccionar un método de pago',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    
    // Confirmación antes de procesar el pago
    Swal.fire({
      title: 'Confirmar Pago',
      text: `¿Está seguro de procesar el pago de $${this.importe}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, procesar pago',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.generarSalida();
      }
    });
  }
  async generarSalida() {
    if (this.pendientes()) { // si estan completos los campos necesarios 
      try {
        // ✅ CAPTURAR TODAS LAS VARIABLES AL INICIO ANTES DE CUALQUIER PROCESAMIENTO
        const importeOriginal = this.importe;
        const codTarjOriginal = this.codTarj;
        const tipoValOriginal = this.tipoVal; // ✅ NUEVO: Capturar nombre del método de pago
        const usuarioEmail = sessionStorage.getItem('emailOp') || this.usuario;

        // ✅ VALIDAR ANTES DE CONTINUAR
        if (!importeOriginal || importeOriginal <= 0) {
          throw new Error('El importe debe ser mayor a 0');
        }

        console.log('Datos capturados para caja_movi:', {
          importe: importeOriginal,
          codTarj: codTarjOriginal,
          usuario: usuarioEmail
        });

        // ✅ VALIDACIÓN ADICIONAL DE FORMA DE PAGO
        if (!codTarjOriginal) {
          console.warn('⚠️ No se ha seleccionado forma de pago - algunos campos serán NULL');
        }

        await this.getNumeroComprobanteCabecera();
        await this.getNumeroComprobanteRecibo();
        const cabeceras = await this.ajuste(this.selectedCabeceras);
        // Extracted filtering logic into a separate function
        await this.filterCabeceras(cabeceras);
        await this.idAso();
        const psucursal = await this.generacionPagoPsucursal();
        const cabecera = await this.generacionReciboCabeceras();
        const recibo = await this.generacionRecibo(this.selectedCabecerasIniciales);

        // ✅ GENERAR CAJA_MOVI CON VALORES ORIGINALES CAPTURADOS
        const caja_movi = await this.crearCajaMoviPago(importeOriginal, codTarjOriginal, usuarioEmail);

        let pagoCC = {
          cabeceras: this.cabecerasFiltered,//cabeceras, // aca tengo un array con las cabeceras seleccionadas y los saldos ajustados
          psucursal: psucursal, // aca tengo el objeto psucursal
          cabecera: cabecera, // aca tengo el objeto cabecera
          recibo: recibo, // aca tengo el objeto recibo
          caja_movi: caja_movi,  // ✅ NUEVO: Incluir caja_movi
          tipoPago: tipoValOriginal  // ✅ NUEVO: Incluir método de pago utilizado
        };
        this.envioDatos(pagoCC);
      } catch (error) {
        console.error('Error al generar los datos de pago:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al procesar el pago',
          text: 'Hubo un problema al procesar el pago. Por favor, inténtelo nuevamente.',
          confirmButtonText: 'Entendido'
        });
      }
    }
  }
  // Define the filtering function
  async filterCabeceras(cabeceras) {
    // esto es para que no se envie si no se paga nada de una cabecera
    this.cabecerasFiltered = [];
    cabeceras.forEach(cabecera => {
      if (Number(cabecera.saldo) !== Number(cabecera.basico) + Number(cabecera.iva1)) {
        this.cabecerasFiltered.push(cabecera);
      }
    });
    console.log(this.cabecerasFiltered);
  }
  envioDatos(pagoCC: any) {
    console.log(pagoCC);
    this._cargardata.pagoCabecera(this.sucursal, pagoCC).pipe(take(1)).subscribe((resp: any) => {
      console.log(resp);
      if (resp.mensaje == "Operación exitosa") {
        this.generarReciboImpreso(pagoCC);
        
        // ✅ RECARGAR CABECERAS DESDE EL SERVIDOR
        this.recargarCabeceras();
        
        // Limpiar el campo de importe
        this.importe = null;
        
        // ✅ LIMPIAR CAMPOS DE BONIFICACIÓN E INTERESES
        this.bonificacion = 0;
        this.interes = 0;
        this.bonificacionType = 'P';
        this.interesType = 'P';
        
        // ✅ LIMPIAR SELECCIÓN DE CABECERAS
        this.selectedCabeceras = [];
        this.totalSum = null;
        
        Swal.fire({
          icon: 'success',
          title: 'Pago realizado',
        });
        this.incrementarNumeroComprobanteRecibo();
      }
      else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se ha podido realizar el pago.',
        });
      }
    }
      , (err) => { console.log(err); });
  }
  async generacionReciboCabeceras() {
    let fecha = new Date();
    let fechaFormateada = fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    this.fecha_recibo = fechaFormateada;
    let year = fecha.getFullYear();
    let month = fecha.getMonth() + 1;
    let formattedMonth = month < 10 ? '0' + month : month;
    let numero_int;
    if (this.cabecerasFiltered.length > 1) {
      numero_int = 99999999;
      this.numero_fac = 99999999;
    } else {
      numero_int = this.cabecerasFiltered.length === 1 ? this.cabecerasFiltered[0].numero_int : null;
      this.numero_fac = this.cabecerasFiltered.length === 1 ? this.cabecerasFiltered[0].numero_fac : null;
    }
    console.log(numero_int);
    console.log(this.numerocomprobantecabecera + 1);
    //zona de correccion de fallas de tipos de datos
    if (this.cliente && this.cliente.idcli == "") {
      this.cliente.idcli = 0;
    }
    if (this.cliente && this.cliente.cod_iva == "") {
      this.cliente.cod_iva = 0;
    }
    if (this.cliente && this.cliente.cuit == "") {
      this.cliente.cuit = 0;
    }
    if (this.codTarj == "") {
      this.codTarj = "0";
    }
    let cabecera = { // estos son los recibos cabecra
      tipo: "RC",
      numero_int: this.numerocomprobanterecibo,//this.numerocomprobantecabecera + 1,
      puntoventa: Number(this.puntoventaSelectedFormCabecera),//this.puntoventa,
      letra: this.letraSelectedFormCabecera,//this.letraValue,
      numero_fac: this.numero_fac,
      atipo: this.tipoDoc,
      anumero_com: numero_int,
      cliente: Number(this.cliente.idcli),
      cod_sucursal: Number(this.sucursal),
      emitido: fechaFormateada,
      vencimiento: fechaFormateada,
      exento: 0,
      basico: parseFloat((this.importe / 1.21).toFixed(2)),//parseFloat((this.suma/1.21).toFixed(2)),//this.suma/1.21,
      iva1: parseFloat((this.importe - this.importe / 1.21).toFixed(2)),//parseFloat((this.suma - this.suma/1.21).toFixed(2)),
      iva2: 0,
      iva3: 0,
      bonifica: this.bonificacion,
      bonifica_tipo: this.bonificacionType,
      interes: this.interes,
      interes_tipo: this.interesType,
      saldo: 0,//this.suma,
      dorigen: false,
      cod_condvta: this.codTarj,
      cod_iva: Number(this.cliente.cod_iva),
      cod_vendedor: this.vendedoresV,//// aca hay que ver si se agrega un campo para elegir el nombre del vendedor
      anulado: false,
      cuit: Number(this.cliente.cuit),
      usuario: sessionStorage.getItem('emailOp') ? sessionStorage.getItem('emailOp').substring(0, 12) : (() => {
        Swal.fire({
          icon: 'error',
          title: 'Error de sesión',
          text: 'No se encontró información del usuario logueado. Por favor, inicie sesión nuevamente.',
          confirmButtonText: 'Entendido'
        });
        throw new Error('Usuario no encontrado en sessionStorage');
      })(), // Limitado a 12 caracteres para evitar error PostgreSQL
      turno: 0,
      pfiscal: `${year}${formattedMonth}`,
      mperc: 0,
      imp_int: 0,
      fec_proceso: this.FechaCalend = formatDate(this.FechaCalend, 'dd/MM/yy', 'en-US'),//this.FechaCalend,//fecha de cierre con caja puede ser otro dia   ?
      fec_ultpago: null,
      estado: "",
      id_aso: 0,
    }
    console.log(cabecera);
    return cabecera;
  }
  async getNumeroComprobanteCabecera() {
    let numero = await this._cargardata.lastIdnum(this.sucursal).pipe(take(1)).toPromise();
    console.log('NUMERO SECUENCIAL:' + JSON.stringify(numero));
    this.numerocomprobantecabecera = Number(numero['mensaje']);
  }
  async getNumeroComprobanteRecibo() {
    let numero = await this._crud.getNumeroSecuencial('recibo').pipe(take(1)).toPromise();
    console.log('NUMERO SECUENCIAL:' + numero);
    this.numerocomprobanterecibo = numero;
  }
  async incrementarNumeroComprobanteRecibo() {
    this._crud.incrementarNumeroSecuencial('recibo', this.numerocomprobanterecibo + 1).then(() => {
      console.log('Numero secuencial incrementado');
      this.numerocomprobanterecibo = 0;
    });
  }
  async generacionPagoPsucursal() {
    let date = new Date();
    let fecha = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    let hora = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    let emailOp = sessionStorage.getItem('emailOp');
    console.log(Number(this.numerocomprobantecabecera) + 1);
    let codtarj: number = 0;
    if (this.codTarj == "") {
      codtarj = 0;
    }
    else {
      codtarj = Number(this.codTarj);
    }
    let numero_int;
    if (this.cabecerasFiltered.length > 1) {
      numero_int = 99999999;
    } else {
      numero_int = this.cabecerasFiltered.length === 1 ? this.cabecerasFiltered[0].numero_int : null;
    }
    console.log(numero_int);
    let psucursal1 = {
      idart: 0,//nada
      cantidad: 0,//nada
      precio: 0,//nada
      idcli: this.clienteFromCuentaCorriente.idcli,
      idven: this.vendedoresV,//this.clienteFromCuentaCorriente.cod_ven,
      fecha: fecha,
      hora: hora,
      tipoprecio: "",//nada
      cod_tar: codtarj,//this.codTarj,//si es necesario
      titulartar: this.tarjeta.Titular,//si es necesario
      numerotar: this.tarjeta.Numero,//si es necesario
      cod_mov: 0,
      suc_destino: 0,
      nomart: "RECIBO DE PAGO",
      nautotar: this.tarjeta.Autorizacion,
      dni_tar: this.tarjeta.Dni,
      banco: this.cheque.Banco,
      ncuenta: this.cheque.Ncuenta,
      ncheque: this.cheque.Ncheque,
      nombre: this.cheque.Nombre,
      plaza: this.cheque.Plaza,
      importeimputar: this.cheque.ImporteImputar,
      importecheque: this.cheque.ImporteCheque,
      fechacheque: this.cheque.FechaCheque,
      emailop: emailOp,
      tipodoc: "RC",
      puntoventa: Number(this.puntoventaSelectedFormCabecera),
      numerocomprobante: numero_int,
      estado: "",
      id_num: this.numerocomprobantecabecera + 1// 0// este es el serial de la cabecera
    };
    console.log(psucursal1);
    return psucursal1;
  }
  async generacionRecibo(selectedCabecerasIniciales: any[]) {
    let remainingImporte = this.importe;
    selectedCabecerasIniciales.forEach((cabeceraInicial, index) => {
      let importe = 0;
      let saldo = 0;
      console.log("currentsaldoIndex:" + this.currentSaldoArray[index]);
      if (this.currentSaldoArray[index] <= this.importe) {
        importe = this.currentSaldoArray[index];
        saldo = 0;
      } else {
        importe = this.importe;
        saldo = this.currentSaldoArray[index] - this.importe;
      }
      // Restar el importe pagado del importe restante
      this.importe -= importe;
      console.log("currentsaldo:" + this.currentSaldoArray);
      let numero_fac_cabecera: number = 0
      if (this.tipoDoc != "FC") {
        numero_fac_cabecera = 0;
      }
      else {
        numero_fac_cabecera = Number(this.numero_fac);
      }
      console.log(this.FechaCalend);
      let recibo: Recibo = {
        recibo: this.numerocomprobanterecibo, //generado con el serial desde firebase
        c_tipo: 'RC',//fijo
        c_numero: numero_fac_cabecera,//numero factura de la cabecera fijo para el array
        c_cuota: 0,//fijo
        fecha: this.fecha_recibo,//fecha de la cabecera fijo para el array
        importe: importe,//Number(selectedCabecerasIniciales[index].saldo) - selectedCabeceras[index].saldo,// ---> este es el importe pagado de cada cabecera seleccionada
        usuario: sessionStorage.getItem('emailOp') ? sessionStorage.getItem('emailOp').substring(0, 10) : (() => {
          Swal.fire({
            icon: 'error',
            title: 'Error de sesión',
            text: 'No se encontró información del usuario logueado. Por favor, inicie sesión nuevamente.',
            confirmButtonText: 'Entendido'
          });
          throw new Error('Usuario no encontrado en sessionStorage');
        })(), // Limitado a 10 caracteres para tabla recibos
        observacion: 0,//fijo
        cod_lugar: '1',//fijo
        sesion: 0,//fijo
        c_tipf: this.letraSelectedFormCabecera,//this.letraValue, //letra de la cabecera fijo para el array
        c_puntoventa: Number(this.puntoventaSelectedFormCabecera),//this.puntoventa,// punto de venta de la cabecera fijo para el array
        recibo_asoc: cabeceraInicial.id_num,// this.numerocomprobantecabecera + 1,// 0,//fijo
        recibo_saldo: saldo,//cabeceraActual.saldo,//---> el saldo para cada array 
        cod_sucursal: Number(this.sucursal), //fijo para el array
        fec_proceso: this.FechaCalend,//this.FechaCalend,//fecha de cierre con caja puede ser otro dia   ?
        bonifica: this.bonificacion,
        bonifica_tipo: this.bonificacionType,
        interes: this.interes,
        interes_tipo: this.interesType,
        id_fac: this.numerocomprobantecabecera + 1// fijo para el array
      };
      if (recibo.importe > 0) {
        this.recibos.push(recibo);
      }
    });
    console.log(this.recibos);
    return this.recibos;
  }
  calculoImporteRecibo(cabecera: any, remainingImporte: number) {
    let importe = 0;
    const saldoCabecera = parseFloat(cabecera.saldo.toString());
    if (remainingImporte >= saldoCabecera) {
      importe = saldoCabecera;
    } else {
      importe = remainingImporte;
    }
    return importe;
  }
  ajuste(selectedCabeceras: any[]) {
    this.currentSaldoArray = [];
    // Verificar si el importe es menor que el totalSum
    if (this.importe < this.totalSum) {
      let remainingImporte = this.importe;
      console.log("remainig importe:" + remainingImporte);
      // Iterar sobre las cabeceras seleccionadas y ajustar sus saldos
      selectedCabeceras.forEach(cabecera => {
        if (remainingImporte <= 0) return;
        const currentSaldo = parseFloat(cabecera.saldo.toString());
        if (currentSaldo <= remainingImporte) {
          cabecera.saldo = 0;
          remainingImporte = parseFloat((remainingImporte - currentSaldo).toFixed(2));
        } else {
          cabecera.saldo = parseFloat((currentSaldo - remainingImporte).toFixed(2));
          remainingImporte = 0;
        }
        this.currentSaldoArray.push(currentSaldo);
        console.log("currentsaldo:" + this.currentSaldoArray);
      });
      // Devolver el array de cabeceras seleccionadas con los saldos actualizados
      console.log(selectedCabeceras);
      return selectedCabeceras;
    } else {
      // Si el importe no es menor que el totalSum, devolver un mensaje o manejar la situación como se prefiera
      console.error('El importe es mayor o igual al totalSum, ajuste no realizado.');
      return [];
    }
  }
  async idAso() {
    this.cabecerasFiltered.forEach(cabecera => {
      cabecera.id_aso = this.numerocomprobantecabecera + 1; // con esto modifico el id_aso de cada cabecera seleccionada
      cabecera.anumero_com = this.numerocomprobanterecibo;
      cabecera.atipo = "RC";
    });
  }
  validarImporte(nuevoValor: number) {
    if (nuevoValor > this.totalSum) {
      this.importe = this.totalSum;
    }
  }
  selectTipo(item: any) {
    console.log(item);
    this.tipoVal = item.tarjeta; // Almacena el centro seleccionado
    this.codTarj = item.cod_tarj;
    this.listaPrecio = item.listaprecio;
    this.activaDatos = item.activadatos;
    if (this.activaDatos == 1) {
      this.abrirFormularioTarj();
      // aca se llama a la funcion que muestra los prefijos
    }
    else if (this.activaDatos == 2) {
      this.abrirFormularioCheque();
      // aca se llama a la funcion que muestra los prefijos
    }
  }
  abrirFormularioTarj() {
    // Estilos CSS personalizados
    const styles = `
      <style>
        /* Container styling */
        .tarjeta-form {
          padding: 0 15px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        /* Card styling */
        .tarjeta-card {
          background-color: #fcfcfc;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        /* Header styling */
        .tarjeta-header {
          background-color: #d1ecf1;
          color: #0c5460;
          padding: 15px;
          font-weight: 600;
          border-bottom: 1px solid #bee5eb;
          display: flex;
          align-items: center;
        }
        
        .tarjeta-header i {
          margin-right: 10px;
        }
        
        /* Form section styling */
        .tarjeta-section {
          padding: 20px;
        }
        
        .form-row {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }
        
        .form-group {
          flex: 1;
          min-width: 250px;
          padding: 0 10px;
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #555;
          font-size: 14px;
        }
        
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        .form-control:focus {
          border-color: #80bdff;
          outline: 0;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        /* Input styling by type */
        input[type="number"].form-control {
          border-left: 3px solid #28a745;
        }
        
        input[type="text"].form-control {
          border-left: 3px solid #007bff;
        }
        
        /* Credit card input styling */
        .card-input {
          border-left: 3px solid #17a2b8 !important;
          font-weight: 600;
        }
        
        /* Subtitle styling */
        .section-title {
          font-size: 16px;
          color: #343a40;
          margin: 15px 0;
          padding-left: 10px;
          border-left: 4px solid #17a2b8;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .form-group {
            flex: 100%;
          }
        }
      </style>
    `;

    Swal.fire({
      title: '',
      width: 800,
      html: styles + `
        <div class="tarjeta-form">
          <div class="tarjeta-card">
            <div class="tarjeta-header">
              <i class="fa fa-credit-card"></i> Información de la Tarjeta
            </div>
            <div class="tarjeta-section">
              <h4 class="section-title">Datos del Titular</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="titular"><i class="fa fa-user"></i> Nombre del Titular</label>
                  <input type="text" id="titular" class="form-control" placeholder="Ingrese el nombre completo">
                </div>
                <div class="form-group">
                  <label for="dni"><i class="fa fa-id-card"></i> DNI</label>
                  <input type="number" id="dni" class="form-control" placeholder="Ingrese el DNI">
                </div>
              </div>
              
              <h4 class="section-title">Datos de la Tarjeta</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="numero"><i class="fa fa-credit-card"></i> Número de Tarjeta</label>
                  <input type="number" id="numero" class="form-control card-input" placeholder="Ingrese los 16 dígitos">
                </div>
                <div class="form-group">
                  <label for="autorizacion"><i class="fa fa-key"></i> Código de Autorización</label>
                  <input type="number" id="autorizacion" class="form-control card-input" placeholder="Ingrese el código de 3 dígitos">
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#17a2b8',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#dc3545',
      focusConfirm: false,
      preConfirm: () => {
        const titular = (<HTMLInputElement>document.getElementById('titular')).value;
        const dni = (<HTMLInputElement>document.getElementById('dni')).value;
        const numero = (<HTMLInputElement>document.getElementById('numero')).value;
        const autorizacion = (<HTMLInputElement>document.getElementById('autorizacion')).value;
        
        if (!titular || !dni || !numero || !autorizacion) {
          Swal.showValidationMessage(`Por favor complete todos los campos requeridos`);
          return false;
        }
        
        let reNumero = new RegExp("^[0-9]{16}$");
        let reDni = new RegExp("^[0-9]{8}$");
        let reTitular = new RegExp("^[a-zA-Z ]{1,40}$");
        let reAutorizacion = new RegExp("^[0-9]{3}$");
        
        if (!reTitular.test(titular)) {
          Swal.showValidationMessage(`El titular no es válido. Debe contener solo letras y espacios.`);
          return false;
        }
        if (!reDni.test(dni)) {
          Swal.showValidationMessage(`El DNI no es válido. Debe contener exactamente 8 dígitos.`);
          return false;
        }
        if (!reNumero.test(numero)) {
          Swal.showValidationMessage(`El número de tarjeta no es válido. Debe contener exactamente 16 dígitos.`);
          return false;
        }
        if (!reAutorizacion.test(autorizacion)) {
          Swal.showValidationMessage(`El código de autorización no es válido. Debe contener exactamente 3 dígitos.`);
          return false;
        }
        
        return { titular, dni, numero, autorizacion };
      }
    }).then((result) => {
      if (result.value) {
        this.tarjeta.Titular = result.value.titular;
        this.tarjeta.Dni = result.value.dni;
        this.tarjeta.Numero = result.value.numero;
        this.tarjeta.Autorizacion = result.value.autorizacion;
        
        // Confirmación visual
        Swal.fire({
          icon: 'success',
          title: 'Datos guardados',
          text: 'Los datos de la tarjeta han sido registrados correctamente',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }
  abrirFormularioCheque() {
    // Estilos CSS personalizados para cheques
    const styles = `
      <style>
        /* Container styling */
        .cheque-form {
          padding: 0 15px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        /* Card styling */
        .cheque-card {
          background-color: #fcfcfc;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        /* Header styling */
        .cheque-header {
          background-color: #cce5ff;
          color: #004085;
          padding: 15px;
          font-weight: 600;
          border-bottom: 1px solid #b8daff;
          display: flex;
          align-items: center;
        }
        
        .cheque-header i {
          margin-right: 10px;
        }
        
        /* Form section styling */
        .cheque-section {
          padding: 20px;
        }
        
        .form-row {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }
        
        .form-group {
          flex: 1;
          min-width: 250px;
          padding: 0 10px;
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #555;
          font-size: 14px;
        }
        
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        .form-control:focus {
          border-color: #80bdff;
          outline: 0;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        /* Input styling by type */
        input[type="number"].form-control,
        input[type="date"].form-control {
          border-left: 3px solid #28a745;
        }
        
        input[type="text"].form-control {
          border-left: 3px solid #007bff;
        }
        
        /* Money inputs styling */
        .money-input {
          border-left: 3px solid #dc3545 !important;
          font-weight: 600;
        }
        
        /* Subtitle styling */
        .section-title {
          font-size: 16px;
          color: #343a40;
          margin: 15px 0;
          padding-left: 10px;
          border-left: 4px solid #007bff;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .form-group {
            flex: 100%;
          }
        }
      </style>
    `;

    Swal.fire({
      title: '',
      width: 800,
      html: styles + `
        <div class="cheque-form">
          <div class="cheque-card">
            <div class="cheque-header">
              <i class="fa fa-money-check-alt"></i> Información del Cheque
            </div>
            <div class="cheque-section">
              <h4 class="section-title">Datos del Banco</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="banco"><i class="fa fa-university"></i> Banco</label>
                  <input type="text" id="banco" class="form-control" placeholder="Nombre del banco">
                </div>
                <div class="form-group">
                  <label for="ncuenta"><i class="fa fa-credit-card"></i> Número de Cuenta</label>
                  <input type="number" id="ncuenta" class="form-control" placeholder="Ingrese el número de cuenta">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="ncheque"><i class="fa fa-file-invoice-dollar"></i> Número de Cheque</label>
                  <input type="number" id="ncheque" class="form-control" placeholder="Ingrese el número de cheque">
                </div>
                <div class="form-group">
                  <label for="plaza"><i class="fa fa-map-marker-alt"></i> Plaza</label>
                  <input type="text" id="plaza" class="form-control" placeholder="Ingrese la plaza">
                </div>
              </div>
              
              <h4 class="section-title">Datos del Titular</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="nombre"><i class="fa fa-user"></i> Nombre del Titular</label>
                  <input type="text" id="nombre" class="form-control" placeholder="Nombre completo del titular">
                </div>
                <div class="form-group">
                  <label for="fechacheque"><i class="fa fa-calendar"></i> Fecha del Cheque</label>
                  <input type="date" id="fechacheque" class="form-control">
                </div>
              </div>
              
              <h4 class="section-title">Importes</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="importeimputar"><i class="fa fa-dollar-sign"></i> Importe a Imputar</label>
                  <input type="number" id="importeimputar" class="form-control money-input" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group">
                  <label for="importecheque"><i class="fa fa-money-bill"></i> Importe del Cheque</label>
                  <input type="number" id="importecheque" class="form-control money-input" placeholder="0.00" step="0.01">
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#007bff',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#dc3545',
      focusConfirm: false,
      preConfirm: () => {
        const banco = (<HTMLInputElement>document.getElementById('banco')).value;
        const ncuenta = (<HTMLInputElement>document.getElementById('ncuenta')).value;
        const ncheque = (<HTMLInputElement>document.getElementById('ncheque')).value;
        const nombre = (<HTMLInputElement>document.getElementById('nombre')).value;
        const plaza = (<HTMLInputElement>document.getElementById('plaza')).value;
        const importeimputar = (<HTMLInputElement>document.getElementById('importeimputar')).value;
        const importecheque = (<HTMLInputElement>document.getElementById('importecheque')).value;
        const fechacheque = (<HTMLInputElement>document.getElementById('fechacheque')).value;

        if (!banco || !ncuenta || !ncheque || !nombre || !plaza || !importeimputar || !importecheque || !fechacheque) {
          Swal.showValidationMessage(`Por favor complete todos los campos requeridos`);
          return false;
        }
        
        let reBanco = new RegExp("^[a-zA-Z ]{1,40}$");
        let reNcuenta = new RegExp("^[0-9]{1,40}$");
        let reNcheque = new RegExp("^[0-9]{1,40}$");
        let reNombre = new RegExp("^[a-zA-Z ]{1,40}$");
        let rePlaza = new RegExp("^[a-zA-Z ]{1,40}$");
        let reImporteImputar = new RegExp("^[0-9]+(\\.[0-9]{1,2})?$");
        let reImporteCheque = new RegExp("^[0-9]+(\\.[0-9]{1,2})?$");
        
        if (!reBanco.test(banco)) {
          Swal.showValidationMessage(`El nombre del banco no es válido. Debe contener solo letras y espacios.`);
          return false;
        }
        if (!reNcuenta.test(ncuenta)) {
          Swal.showValidationMessage(`El número de cuenta no es válido. Debe contener solo dígitos.`);
          return false;
        }
        if (!reNcheque.test(ncheque)) {
          Swal.showValidationMessage(`El número de cheque no es válido. Debe contener solo dígitos.`);
          return false;
        }
        if (!reNombre.test(nombre)) {
          Swal.showValidationMessage(`El nombre no es válido. Debe contener solo letras y espacios.`);
          return false;
        }
        if (!rePlaza.test(plaza)) {
          Swal.showValidationMessage(`La plaza no es válida. Debe contener solo letras y espacios.`);
          return false;
        }
        if (!reImporteImputar.test(importeimputar)) {
          Swal.showValidationMessage(`El importe a imputar no es válido. Debe ser un número válido.`);
          return false;
        }
        if (!reImporteCheque.test(importecheque)) {
          Swal.showValidationMessage(`El importe del cheque no es válido. Debe ser un número válido.`);
          return false;
        }
        
        return { banco, ncuenta, ncheque, nombre, plaza, importeimputar, importecheque, fechacheque };
      }
    }).then((result) => {
      if (result.value) {
        this.cheque.Banco = result.value.banco;
        this.cheque.Ncuenta = result.value.ncuenta;
        this.cheque.Ncheque = result.value.ncheque;
        this.cheque.Nombre = result.value.nombre;
        this.cheque.Plaza = result.value.plaza;
        this.cheque.ImporteImputar = result.value.importeimputar;
        this.cheque.ImporteCheque = result.value.importecheque;
        this.cheque.FechaCheque = result.value.fechacheque;
        console.log('Cheque guardado:', this.cheque);
        
        // Confirmación visual
        Swal.fire({
          icon: 'success',
          title: 'Datos guardados',
          text: 'Los datos del cheque han sido registrados correctamente',
          timer: 1500,
          showConfirmButton: false
        });
      }
    }).catch((error) => {
      this.showNotification('Error al guardar el cheque');
    });
  }
  pendientes() {
    let missingFields = [];
    if (this.tipoDoc == "FC") {
      if (!this.FechaCalend) {
        missingFields.push('Fecha');
      }
      if (!this.vendedoresV) {
        missingFields.push('Vendedor');
      }
    } else if (this.tipoDoc == "PR") {
      // Validaciones específicas para presupuestos (PR)
      if (!this.FechaCalend) {
        missingFields.push('Fecha');
      }
      if (!this.vendedoresV) {
        missingFields.push('Vendedor');
      }
    }
    if (missingFields.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error..',
        text: 'Faltan datos!',
        footer: 'Completar: ' + missingFields.join(', ')
      })
      return false;
    }
    else {
      return true;
    }
  }

  getOperacionTexto(): string {
    if (this.selectedCabeceras.length === 0) {
      return 'Seleccione documentos';
    }
    
    const primerTipo = this.selectedCabeceras[0].tipo;
    return primerTipo === 'FC' ? 'FACTURA' : 'PRESUPUESTO';
  }

  tipoDocChange(event) {
    console.log(event.target.value);
    this.tipoDoc = event.target.value;
    if (this.tipoDoc == "FC") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = true;
      this.letras_flag = true;
    }
    else if (this.tipoDoc == "NC") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "NV") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "ND") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "PR") {
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = true;
    }
    else if (this.tipoDoc == "CS") {
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      this.puntoventa = 0;
      this.letras_flag = false;
    }
  }
  getVendedores() {
    this._cargardata.vendedores().subscribe((res: any) => {
      this.vendedores = res.mensaje;
      console.log(this.vendedores);
    })
  }
  validateValue(value: string): boolean {
    return this.myRegex.test(value);
  }
  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.cabeceras);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'documentos');
    });
  }
  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  // Método auxiliar para calcular el importe con bonificaciones e intereses para caja_movi
  private calcularImporteMovConBonificacionesIntereses(importeBase: number): number {
    let importeFinal = importeBase;
    
    // Aplicar bonificaciones (favorable al cliente - se resta del importe que debe pagar)
    if (this.bonificacion && this.bonificacion > 0) {
      if (this.bonificacionType === 'P') {
        // Si es porcentaje, calcular el valor monetario y restar
        importeFinal -= (this.bonificacion * importeBase) / 100;
      } else {
        // Si es importe directo, restar
        importeFinal -= this.bonificacion;
      }
    }
    
    // Aplicar intereses (cargo adicional - se suma como recargo)
    if (this.interes && this.interes > 0) {
      if (this.interesType === 'P') {
        // Si es porcentaje, calcular el valor monetario
        importeFinal += (this.interes * importeBase) / 100;
      } else {
        // Si es importe directo
        importeFinal += this.interes;
      }
    }
    
    // Log para debug y verificación
    console.log('🧮 CÁLCULO IMPORTE CAJA_MOVI:', {
      importeBase: importeBase,
      bonificacion: this.bonificacion,
      bonificacionType: this.bonificacionType,
      descuentoPorBonificacion: this.bonificacion ? (this.bonificacionType === 'P' ? (this.bonificacion * importeBase) / 100 : this.bonificacion) : 0,
      interes: this.interes,
      interesType: this.interesType,
      recargoPorInteres: this.interes ? (this.interesType === 'P' ? (this.interes * importeBase) / 100 : this.interes) : 0,
      importeFinal: parseFloat(importeFinal.toFixed(2))
    });
    
    return parseFloat(importeFinal.toFixed(2));
  }

  // Nuevo método para crear caja_movi para pagos de cabeceras
  crearCajaMoviPago(importePago: number, codTarjPago: string, usuarioPago: string): Promise<any> {
    // ✅ CORREGIDO: Usar fecha argentina en lugar de UTC
    const fechaArgentina = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires'
    });
    const fechaFormateada = fechaArgentina;

    // Función auxiliar para limitar valores numéricos (igual que carrito)
    const limitNumericValue = (value: any, limit: number) => {
      if (value === null || value === undefined || value === '') return null;
      const numValue = parseInt(value);
      return !isNaN(numValue) ? Math.min(numValue, limit) : null;
    };

    // ✅ CORREGIDO: Buscar información de tarjeta usando parámetro
    let tarjetaInfo: any = null;
    if (codTarjPago) {
      // Para PR, buscar en condicionesPR; para FC, buscar en tipo
      if (this.selectedCabeceras[0].tipo === 'PR') {
        tarjetaInfo = this.condicionesPR.find(t => t.cod_tarj.toString() === codTarjPago.toString());
      } else {
        tarjetaInfo = this.tipo.find(t => t.cod_tarj.toString() === codTarjPago.toString());
      }
    }

    // Obtener id_caja de forma asíncrona (IGUAL que en carrito)
    const obtenerIdCaja = new Promise<number | null>((resolve) => {
      if (tarjetaInfo && tarjetaInfo.idcp_ingreso) {
        this._cargardata.getIdCajaFromConcepto(tarjetaInfo.idcp_ingreso).pipe(take(1)).subscribe(
          (response: any) => {
            if (response && response.mensaje && response.mensaje.length > 0) {
              const idCaja = response.mensaje[0].id_caja;
              console.log(`ID de caja obtenido: ${idCaja} para concepto: ${tarjetaInfo.idcp_ingreso}`);
              resolve(idCaja);
            } else {
              console.error('No se pudo obtener id_caja para concepto:', tarjetaInfo.idcp_ingreso);
              resolve(null);
            }
          },
          error => {
            console.error('Error al obtener id_caja:', error);
            resolve(null);
          }
        );
      } else {
        resolve(null);
      }
    });

    return obtenerIdCaja.then(idCajaObtenido => {
      const cajaMovi = {
        sucursal: limitNumericValue(this.sucursal, 999999),
        codigo_mov: tarjetaInfo ? limitNumericValue(tarjetaInfo.idcp_ingreso, 9999999999) : null,
        num_operacion: 0, // Se asignará en backend con id_num
        fecha_mov: fechaFormateada,
        importe_mov: this.calcularImporteMovConBonificacionesIntereses(importePago), // ✅ CORREGIDO: Incluir bonificaciones e intereses
        descripcion_mov: '', // Se generará automáticamente en backend
        fecha_emibco: this.cheque.FechaCheque || null,
        banco: limitNumericValue(this.cheque.Banco, 9999999999),
        num_cheque: limitNumericValue(this.cheque.Ncheque, 9999999999),
        cuenta_mov: limitNumericValue(this.cheque.Ncuenta, 999999),
        cliente: limitNumericValue(this.cliente.idcli, 9999999999),
        proveedor: null,
        plaza_cheque: this.cheque.Plaza || null,
        codigo_mbco: null,
        desc_bancaria: null,
        filler: null,
        fecha_cobro_bco: null,
        fecha_vto_bco: null,
        tipo_movi: 'A',
        caja: idCajaObtenido,
        letra: this.letraSelectedFormCabecera || null,
        punto_venta: limitNumericValue(this.puntoventaSelectedFormCabecera, 9999),
        tipo_comprobante: 'RC',
        numero_comprobante: limitNumericValue(this.numerocomprobantecabecera + 1, 99999999),
        marca_cerrado: 0,
        usuario: usuarioPago || 'usuario_desconocido',
        fecha_proceso: fechaFormateada
      };

      return cajaMovi;
    });
  }

  generarReciboImpreso(pagoCC: any) {
    // Calcular la suma de los importes de todos los recibos
    const totalImporte = pagoCC.recibo.reduce((sum, recibo) => sum + recibo.importe, 0);

    // Obtener bonificación e interés del primer recibo (todos deberían tener los mismos valores)
    const primerRecibo = pagoCC.recibo[0];
    const bonificacionRecibo = primerRecibo.bonifica || 0;
    const bonificacionTipo = primerRecibo.bonifica_tipo || 'P';
    const interesRecibo = primerRecibo.interes || 0;
    const interesTipo = primerRecibo.interes_tipo || 'P';

    // ✅ NUEVO: Crear estructura de subtotales por tipo de pago
    const tipoPago = pagoCC.tipoPago || 'Método de Pago';
    const subtotalesTipoPago = [{
      tipoPago: tipoPago,
      subtotal: totalImporte
    }];

    // ✅ NUEVO: Validar si hay subtotales para mostrar desglose
    const mostrarDesgloseTipoPago = subtotalesTipoPago && subtotalesTipoPago.length > 0;
    console.log('📄 PDF Recibo - Desglose por tipo de pago:', mostrarDesgloseTipoPago);
    console.log('📄 PDF Recibo - Método de pago:', tipoPago);
    console.log('📄 PDF Recibo - Total importe:', totalImporte);
    const clienteDataRec = sessionStorage.getItem('datoscliente');
    let cliente = null;
    if (clienteDataRec) {
      try {
        cliente = JSON.parse(clienteDataRec);
      } catch (error) {
        console.error('Error al parsear datos del cliente para recibo:', error);
        cliente = this.clienteFromCuentaCorriente;
      }
    } else {
      cliente = this.clienteFromCuentaCorriente;
    }
    console.log(cliente);
    console.log(pagoCC);
    let numeroenPlabras = this.numeroAPalabras(totalImporte);
    let fechaActual = new Date();
    let fechaFormateada = fechaActual.toISOString().split('T')[0];
    console.log(fechaFormateada);
    const tableBody = pagoCC.cabeceras.map(item => {
      const basico = parseFloat(item.basico);
      const iva1 = parseFloat(item.iva1);
      return [
        item.tipo,
        item.letra,
        item.anumero_com,
        item.cod_sucursal,
        item.emitido,
        (basico + iva1).toFixed(2),
        item.saldo
      ];
    });
    console.log(tableBody);
    
    // Obtener configuración de empresa según sucursal
    const empresaConfig = getEmpresaConfig();
    
    // Definir el contenido del documento
    const documentDefinition = {
      background: {
        canvas: [
          {
            type: 'rect',
            x: 10, // Posición X del recuadro
            y: 10, // Posición Y del recuadro
            w: 580, // Ancho del recuadro
            h: 750, // Alto del recuadro
            r: 3, // Radio de las esquinas (para redondearlas)
            lineWidth: 1, // Grosor de la línea
            lineColor: '#000000', // Color de la línea (ejemplo: azul)
            fillColor: '#000000', // Color de relleno (ejemplo: gris claro)
          },
        ],
      },
      content: [
        // Logo o texto según configuración
        ...(empresaConfig.logo ? [
          {
            image: empresaConfig.logo,
            width: 100,
            margin: [0, 0, 80, 0],
          }
        ] : [
          {
            text: empresaConfig.texto,
            fontSize: 24,
            bold: true,
            margin: [0, 20, 80, 20],
            style: 'mayorista'
          }
        ]),
        {
          columns: [
            {
              text: [
                { text: empresaConfig.direccion + '\n' },
                { text: empresaConfig.ciudad + '\n' },
                { text: this.sucursalNombre + '\n' },
                { text: empresaConfig.telefono + '\n' },
                { text: empresaConfig.email },
              ],
              fontSize: 10,
              margin: [10, 0, 0, 0],
            },
            {
              text: [
                { canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 100, r: 3, lineWidth: 2, lineColor: '#000000' }], text: 'X' + '\n', style: { fontSize: 40 }, margin: [10, 5, 0, 0] },//{ text: this.letraValue + '\n', style: { border: '2px solid black', fontSize: 60 }  }, // Asegúrate de que 'this.letra' represente la letra seleccionada en el campo 'letra'
                { text: 'RECIBO\n' },
              ],
              alignment: 'center',
              fontSize: 12,
            },
            {
              text: [
                { text: 'RECIBO' + '\n' },
                { text: 'N° 0000 -' + pagoCC.recibo[0].recibo + '\n', alignment: 'right' },
                { text: 'Punto de venta: ' + pagoCC.recibo[0].c_puntoventa + '\n' },
              ],
              alignment: 'right',
              fontSize: 10,
            },
          ],
        },
        {
          text: 'Fecha: ' + pagoCC.recibo[0].fecha + '\n',
          alignment: 'right',
          margin: [25, 0, 5, 30],
          fontSize: 10,
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc' // Color gris claro para la línea
            }
          ],
          margin: [0, 0, 30, 0] // Agregar un margen inferior a la línea
        },
        {
          columns: [
            {
              text: [
                { text: 'Recibimos de: ', bold: true },
                { text: cliente.nombre + '\n' },
                { text: 'Direccion: ' + cliente.direccion + '\n' },
                { text: 'DNI: ' + cliente.dni + '\n' },
                { text: 'CUIT: ' + cliente.cuit + '\n' },
                { text: 'Condicion de Venta: ' + cliente.tipoiva + '\n' },
              ],
              fontSize: 10,
              margin: [0, 10, 0, 10],
            },
          ],
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 380, y2: 0,
              lineWidth: 2,
              lineColor: '#cccccc' // Color gris claro para la línea
            }
          ],
          margin: [0, 0, 30, 20] // Agregar un margen inferior a la línea
        },
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: [
                    { text: 'La Cantidad de Pesos:          ' + numeroenPlabras + '\n', },
                    { text: '\n' },
                    { text: 'Retenciones:          CERO CON CERO CENTAVOS' + '\n', },
                    { text: '\n' },
                    { text: 'Neto a Cobrar:          ' + numeroenPlabras + '          $' + totalImporte + '\n', },
                    { text: '\n' },
                  ],
                  style: 'total',
                  alignment: 'left',
                  margin: [0, 10, 0, 10],
                }
              ]
            ]
          },
          layout: {
            hLineWidth: function (i, node) {
              return (i === 0 || i === node.table.body.length) ? 1 : 0;
            },
            vLineWidth: function (i, node) {
              return (i === 0 || i === node.table.widths.length) ? 1 : 0;
            },
            hLineColor: function (i, node) {
              return '#000000';
            },
            vLineColor: function (i, node) {
              return '#000000';
            },
          }
        },
        // ... Aquí puedes seguir añadiendo más elementos al documento ...
        {
          style: 'tableExample',
          text: 'Aplicacion del Pago' + '\n',
          alignment: 'center',
          bold: true,
          table: {
            widths: ['*', '*', '*', '*', '*', '*', '*'],
            body: [
              ['Tipo', 'Letra', 'Comprobante', 'Sucursal', 'Emitido', 'Importe', 'Saldo'],
              ...tableBody,
            ],
            alignment: 'center',
            bold: true,
          },
          margin: [0, 0, 0, 30],
        },
        // Sección de bonificaciones e intereses (similar a historialventas2)
        ...(bonificacionRecibo && bonificacionRecibo > 0 ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['BONIFICACIÓN (' + (bonificacionTipo === 'P' ? 'Porcentaje' : 'Importe') + '):', 
                bonificacionTipo === 'P' 
                  ? bonificacionRecibo + '% ($' + ((bonificacionRecibo * totalImporte) / 100).toFixed(2) + ')'
                  : '$' + bonificacionRecibo.toFixed(2)],
            ],
            bold: false,
            fontSize: 10,
          },
          margin: [0, 5, 0, 0]
        }] : []),
        ...(interesRecibo && interesRecibo > 0 ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['INTERÉS (' + (interesTipo === 'P' ? 'Porcentaje' : 'Importe') + '):', 
                interesTipo === 'P' 
                  ? interesRecibo + '% ($' + ((interesRecibo * totalImporte) / 100).toFixed(2) + ')'
                  : '$' + interesRecibo.toFixed(2)],
            ],
            bold: false,
            fontSize: 10,
          },
          margin: [0, 5, 0, 0]
        }] : []),
        // ✅ NUEVO: Tabla de subtotales por tipo de pago
        ...(mostrarDesgloseTipoPago ? [{
          text: '\nDETALLE POR MÉTODO DE PAGO:',
          style: 'subheader',
          margin: [0, 10, 0, 5],
          fontSize: 10,
          bold: true
        }] : []),
        ...(mostrarDesgloseTipoPago ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['Método de Pago', 'Subtotal'],
              ...subtotalesTipoPago.map(item => [
                item.tipoPago,
                '$' + item.subtotal.toFixed(2)
              ])
            ],
            bold: false,
          },
          margin: [0, 0, 0, 10]
        }] : []),
        {
          style: 'tableExample',
          table: {
            widths: ['*'],
            body: [
              ['TOTAL APLICADO: $' + this.calcularTotalEfectivoEnPDF(totalImporte, bonificacionRecibo, bonificacionTipo, interesRecibo, interesTipo).toFixed(2)],
            ],
            bold: true,
            fontSize: 16,
          },
          margin: [0, 0, 0, 30], // Añade un margen inferior
        },
        {
          text: 'Recibí conforme: \n \n, Firma: \n',
          style: 'total',
          alignment: 'left',
          margin: [0, 10, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 10,
          bold: true,
          margin: [2, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 5],
          fontSize: 8,
        },
        total: {
          bold: true,
          fontSize: 8,
          margin: [0, 10, 0, 0],
        },
        mayorista: {
          bold: true,
          fontSize: 24,
          alignment: 'left',
          color: '#000000',
        },
      },
      defaultStyle: {
      },
    };
    Swal.close();
    pdfMake.createPdf(documentDefinition).download(this.sucursalNombre + '_RECIBO_' + fechaFormateada + '.pdf');
    pdfMake.createPdf(documentDefinition).getBlob((blob) => {
      this.bot.sendToTelegram(blob, this.sucursalNombre + '_' + pagoCC.recibo[0].recibo + '_RECIBO_' + fechaFormateada + '.pdf');
    }, (error: any) => {
      console.error(error);
    });
  }

  // Calcular total efectivo para recibo de cabeceras (importe + intereses + bonificaciones)
  private calcularTotalEfectivoEnPDF(totalImporte: number, bonificacionRecibo: number, bonificacionTipo: string, interesRecibo: number, interesTipo: string): number {
    let totalEfectivo = totalImporte;
    
    // Sumar bonificaciones (descuentos que se aplican a favor del cliente)
    if (bonificacionRecibo && bonificacionRecibo > 0) {
      if (bonificacionTipo === 'P') {
        // Si es porcentaje, calcular el valor monetario
        totalEfectivo += (bonificacionRecibo * totalImporte) / 100;
      } else {
        // Si es importe directo
        totalEfectivo += bonificacionRecibo;
      }
    }
    
    // Sumar intereses (cargos adicionales)
    if (interesRecibo && interesRecibo > 0) {
      if (interesTipo === 'P') {
        // Si es porcentaje, calcular el valor monetario
        totalEfectivo += (interesRecibo * totalImporte) / 100;
      } else {
        // Si es importe directo
        totalEfectivo += interesRecibo;
      }
    }
    
    return totalEfectivo;
  }

  numeroAPalabras(num: number): string {
    return this.numeroPalabrasService.numeroAPalabras(num);
  }
  showNotification(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Aceptar'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
