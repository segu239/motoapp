import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
//agregar importacion de router para navegacion
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { CarritoService } from 'src/app/services/carrito.service';
import { SubirdataService } from 'src/app/services/subirdata.service';
import { CargardataService } from 'src/app/services/cargardata.service';
import Swal from 'sweetalert2';
import { first, take, takeUntil } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { set } from '@angular/fire/database';
import { MotomatchBotService } from 'src/app/services/motomatch-bot.service';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { formatDate } from '@angular/common';
import { TarjCredito } from 'src/app/interfaces/tarjcredito';
import { getEmpresaConfig } from '../../config/empresa-config';
interface Cliente {
  nombre: string;
  direccion: string;
  dni: string;
  cuit: string;
  tipoiva: string;
}

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent implements OnDestroy {
  ref: DynamicDialogRef | undefined;
  public FechaCalend: any;
  public itemsEnCarrito: any[] = [];
  public tarjetas: TarjCredito[] = [];
  public suma: number = 0;
  public tipoDoc: string = "FC";
  public numerocomprobante: string;
  public numerocomprobanteImpresion: string;
  public puntoventa: number = 0; // Se asignará dinámicamente según la sucursal
  private myRegex = new RegExp('^[0-9]+$');
  public sucursal: string = '';
  public sucursalNombre: string = '';
  private indiceTipoDoc: string;
  public inputOPFlag: boolean = true;
  public puntoVenta_flag: boolean = true;
  public letras_flag: boolean = true;
  public letras: any = ["A", "B", "C"];
  public letraValue: string = "A";
  public vendedores: any[] = [];
  public vendedoresV: any;
  public cliente: any;
  public usuario: any;
  itemsConTipoPago: any[] = [];
  public subtotalesPorTipoPago: Array<{tipoPago: string, subtotal: number}> = [];
  public descuentoGlobal: number = 0;
  public subtotalBruto: number = 0;
  public totalNeto: number = 0;
  public subtotalesPorTipoPagoNetos: Array<{tipoPago: string, subtotal: number}> = [];

  // ════════════════════════════════════════════════════════════
  // Totales Temporales para Modo Consulta
  // ════════════════════════════════════════════════════════════
  public sumaTemporalSimulacion: number = 0;
  public subtotalesTemporalesSimulacion: Array<{tipoPago: string, subtotal: number}> = [];
  public hayItemsEnConsulta: boolean = false;

  // ====================================================================
  // RESTRICCIÓN DE PRESUPUESTOS: Solo EFECTIVO AJUSTE, TRANSFERENCIA AJUSTE y CUENTA CORRIENTE
  // Fecha: 2025-10-22
  // Ver: INFORME_RESTRICCION_PRESUPUESTOS_TIPOS_PAGO.md
  // FIX 2025-10-22: Corregido 12 → 112 (EFECTIVO AJUSTE)
  // ====================================================================
  private readonly PRESUPUESTO_COD_TARJ_PERMITIDOS: number[] = [112, 1112, 111];

  // ====================================================================
  // RESTRICCIÓN DE FACTURAS/NC/ND: NO se permite EFECTIVO AJUSTE ni TRANSFERENCIA AJUSTE
  // Fecha: 2025-10-22
  // Ver: INFORME_RESTRICCION_FACTURAS_TIPOS_PAGO.md
  // ====================================================================
  private readonly FACTURA_COD_TARJ_NO_PERMITIDOS: number[] = [112, 1112];
  private readonly TIPOS_DOC_VALIDAR_NO_AJUSTE: string[] = ['FC', 'NC', 'ND'];

  // ════════════════════════════════════════════════════════════
  // GESTIÓN DE SUBSCRIPTIONS - Patrón takeUntil
  // ════════════════════════════════════════════════════════════
  // Fecha implementación: 29/10/2025
  // Patrón: takeUntil con Subject destroy$
  // Beneficios:
  // - Auto-unsubscribe en ngOnDestroy
  // - Prevención de memory leaks
  // - Código más limpio y mantenible
  // Documentación: plan_memory_leaks.md
  // ════════════════════════════════════════════════════════════
  private destroy$ = new Subject<void>();

  private esItemConTarjetaCredito(item: any): boolean {
    const tarjeta = this.tarjetas.find(t => String(t.cod_tarj) === String(item.cod_tar));
    return !!tarjeta && Number(tarjeta.activadatos) === 1;
  }

  private async pedirCupon(): Promise<string | null> {
    const result = await Swal.fire({
      title: 'Numero de Cupon',
      html: `
        <p>Ingrese el numero de cupon de la operacion con tarjeta (4 a 6 digitos).</p>
        <input type="text" id="cupon" class="swal2-input" placeholder="Nro de cupon" inputmode="numeric" pattern="[0-9]*" maxlength="6">
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      allowEscapeKey: true,
      focusConfirm: false,
      preConfirm: () => {
        const value = (<HTMLInputElement>document.getElementById('cupon')).value;
        if (!/^[0-9]{4,6}$/.test(value)) {
          Swal.showValidationMessage('El cupon debe tener entre 4 y 6 digitos.');
          return false;
        }
        return value;
      }
    });

    return result.isConfirmed ? result.value : null;
  }

  constructor(
    private _cargardata: CargardataService,
    private bot: MotomatchBotService,
    private _crud: CrudService,
    private _subirdata: SubirdataService,
    private _carrito: CarritoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Verificar autenticación antes de inicializar
    if (!sessionStorage.getItem('usernameOp')) {
      this.router.navigate(['/login2']);
      return;
    }

    this.FechaCalend = new Date();
    this.getItemsCarrito();
    this.calculoTotal();
    this.getNombreSucursal();
    this.getVendedores();
    this.usuario = sessionStorage.getItem('usernameOp');
    this.initializePuntoVenta(); // Inicializar punto de venta según sucursal
    
    // Validación defensiva para datos del cliente
    const clienteData = sessionStorage.getItem('datoscliente');
    if (clienteData) {
      try {
        this.cliente = JSON.parse(clienteData);
        this.initLetraValue();
      } catch (error) {
        console.error('Error al parsear datos del cliente:', error);
        // Establecer cliente por defecto en lugar de redirigir
        this.cliente = { cod_iva: 2 }; // Consumidor final por defecto
        this.initLetraValue();
      }
    } else {
      // Si no hay datos del cliente, establecer valores por defecto
      this.cliente = { cod_iva: 2 }; // Consumidor final por defecto
      this.initLetraValue();
    }
  }
  ngOnInit() {
    this.cargarTarjetas();
  }
  cargarTarjetas() {
    this._cargardata.tarjcredito()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.tarjetas = data.mensaje;
        console.log('✅ Tarjetas obtenidas:', this.tarjetas);

        // 🔍 DEBUG: Verificar tipos de datos
        if (this.tarjetas && this.tarjetas.length > 0) {
          console.log('🔍 Primera tarjeta:', this.tarjetas[0]);
          console.log('🔍 cod_tarj:', this.tarjetas[0].cod_tarj, 'tipo:', typeof this.tarjetas[0].cod_tarj);
        }

       // this.agregarTipoPago();
       this.actualizarItemsConTipoPago();

       // Inicializar subtotales después de cargar tarjetas
       if (this.itemsEnCarrito.length > 0) {
         this.subtotalesPorTipoPago = this.calcularSubtotalesPorTipoPago();
         console.log('Subtotales inicializados:', this.subtotalesPorTipoPago);
       }

        console.log('Items en carrito después de agregar tipoPago:', this.itemsEnCarrito);
      });
  }
 /*  agregarTipoPago() {
    const tarjetaMap = new Map();
    this.tarjetas.forEach(tarjeta => {
      tarjetaMap.set(tarjeta.cod_tarj, tarjeta.tarjeta);
    });
    console.log('Mapa de tarjetas:', tarjetaMap);
    this.itemsEnCarrito = this.itemsEnCarrito.map(item => {
      const tipoPago = tarjetaMap.get(item.cod_tar);
    console.log(`Item: ${item.cod_tar}, TipoPago: ${tipoPago}`);
      return {
        ...item,
        tipoPago: tarjetaMap.get(item.cod_tar.toString())
      };
    });
  } */
    actualizarItemsConTipoPago() {
      const tarjetaMap = new Map();
      this.tarjetas.forEach(tarjeta => {
        tarjetaMap.set(tarjeta.cod_tarj, tarjeta.tarjeta);
      });
  
      console.log('Mapa de tarjetas:', tarjetaMap);
  
      this.itemsConTipoPago = this.itemsEnCarrito.map(item => {
        const tipoPago = tarjetaMap.get(item.cod_tar.toString());
        console.log(`Item: ${item.cod_tar}, TipoPago: ${tipoPago}`);
        return {
          ...item,
          tipoPago: tipoPago
        };
      });
    }
  getItemsCarrito() {
    const items = sessionStorage.getItem('carrito');
    if (items) {
      try {
        this.itemsEnCarrito = JSON.parse(items);
        // Validar que sea un array válido
        if (!Array.isArray(this.itemsEnCarrito)) {
          this.itemsEnCarrito = [];
        }

        // ✅ FIX: Normalizar cod_tar a string para que coincida con cod_tarj de tarjetas
        // PrimeNG dropdown requiere que el tipo de ngModel coincida exactamente con optionValue
        this.itemsEnCarrito = this.itemsEnCarrito.map(item => {
          if (item.cod_tar !== undefined && item.cod_tar !== null) {
            item.cod_tar = String(item.cod_tar);
          }
          return item;
        });

        // 🔍 DEBUG: Verificar tipos de datos de los items
        if (this.itemsEnCarrito.length > 0) {
          console.log('✅ Items cargados del carrito:', this.itemsEnCarrito.length);
          console.log('🔍 Primer item:', this.itemsEnCarrito[0]);
          console.log('🔍 cod_tar del item:', this.itemsEnCarrito[0].cod_tar, 'tipo:', typeof this.itemsEnCarrito[0].cod_tar);
        }

      } catch (error) {
        console.error('Error al parsear items del carrito:', error);
        this.itemsEnCarrito = [];
        sessionStorage.removeItem('carrito');
      }
    } else {
      this.itemsEnCarrito = [];
    }
  }
  getVendedores() {
    this._cargardata.vendedores()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.vendedores = res.mensaje;
        console.log(this.vendedores);
      });
  }
  getNombreSucursal() {
    this.sucursal = sessionStorage.getItem('sucursal');
    console.log(this.sucursal);

    this._crud.getListSnap('sucursales')
      .pipe(takeUntil(this.destroy$))
      .subscribe(
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

  initLetraValue() {
    if (!this.cliente) {
      this.letraValue = "B"; // Valor por defecto
      return;
    }
    
    if (this.cliente.cod_iva == 2)//consumidor final
    { this.letraValue = "B"; }
    else if (this.cliente.cod_iva == 1)//excento
    {
      this.letraValue = "A";
    }
    else if (this.cliente.cod_iva == 3)//monotributo
    {
      this.letraValue = "A";
    }
    else {
      this.letraValue = "B";
    }
  }

  /**
   * Inicializa el punto de venta con el número de sucursal actual
   * Se ejecuta al cargar el componente para asegurar consistencia
   */
  private initializePuntoVenta(): void {
    const sucursal = sessionStorage.getItem('sucursal');
    if (sucursal) {
      this.puntoventa = parseInt(sucursal);
      console.log('Punto de venta inicializado correctamente:', this.puntoventa, 'para sucursal:', sucursal);
    } else {
      console.warn('No se encontró sucursal en sessionStorage - usando puntoventa = 0');
      this.puntoventa = 0;
    }
  }

  tipoDocChange() {
    // ✅ Con [(ngModel)], this.tipoDoc ya tiene el nuevo valor automáticamente
    console.log('\n🔄 ════════════════════════════════════════════════════');
    console.log('📝 CAMBIO DE TIPO DE DOCUMENTO');
    console.log('🔄 ════════════════════════════════════════════════════');
    console.log('Nuevo valor de tipoDoc:', this.tipoDoc);
    console.log('Items ACTUALES en carrito:', this.itemsEnCarrito.length);
    this.itemsEnCarrito.forEach((item, i) => {
      console.log(`  Item ${i + 1}: ${item.nomart} - cod_tar: ${item.cod_tar}`);
    });
    console.log('🔄 ════════════════════════════════════════════════════\n');

    if (this.tipoDoc == "FC") {
      // ✅ VALIDACIÓN CAPA 1: Verificar que NO se use EFECTIVO/TRANSFERENCIA AJUSTE
      console.log('🔍 DEBUG CAPA 1 - Validando cambio a FC...');
      const validacion = this.validarMetodosPagoFactura();
      console.log('🔍 DEBUG CAPA 1 - Items con métodos prohibidos:', validacion.items.length);

      if (validacion.items.length > 0) {
        const metodosTexto = validacion.metodosNoPermitidos.join(', ');
        console.log('🔍 DEBUG CAPA 1 - BLOQUEANDO cambio a FC. Métodos prohibidos:', metodosTexto);

        setTimeout(() => {
          console.log('🔍 DEBUG CAPA 1 - Revirtiendo tipoDoc de "FC" a tipo anterior');
          this.tipoDoc = "PR"; // Revertir a presupuesto por defecto
          this.cdr.detectChanges();
          console.log('🔍 DEBUG CAPA 1 - tipoDoc después de revertir:', this.tipoDoc);
        }, 0);

        Swal.fire({
          icon: 'warning',
          title: 'Restricción de Facturas',
          html: `
            <p>Las facturas <strong>NO pueden</strong> generarse con los siguientes métodos de pago:</p>
            <ul style="text-align: left; margin: 10px 0;">
              <li><strong>EFECTIVO AJUSTE</strong></li>
              <li><strong>TRANSFERENCIA AJUSTE</strong></li>
            </ul>
            <p style="margin-top: 10px;">Actualmente hay <strong>${validacion.items.length} artículo(s)</strong> con métodos prohibidos:</p>
            <p style="color: #dc3545;"><em>${metodosTexto}</em></p>
          `,
          footer: 'Por favor, modifique los artículos del carrito para usar métodos de pago estándar.',
          confirmButtonText: 'Entendido'
        });

        return; // Detener ejecución
      }

      console.log('🔍 DEBUG CAPA 1 - Validación OK, permitiendo cambio a FC');

      this.inputOPFlag = true;
      // se cambio esto para sacar el punto de venta y ponerle el valor de la sucursal----
      this.puntoVenta_flag = false;//this.puntoVenta_flag = true;
      //se agregó esto para que el punto de venta sea igual a la sucursal-------------------
      // Asegurar que siempre use la sucursal actual de forma segura
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      console.log('PUNTO DE VENTA FC:', this.puntoventa);
      this.letras_flag = true;
    }
    else if (this.tipoDoc == "NC") {
      // ✅ VALIDACIÓN CAPA 1: Verificar que NO se use EFECTIVO/TRANSFERENCIA AJUSTE
      console.log('🔍 DEBUG CAPA 1 - Validando cambio a NC...');
      const validacion = this.validarMetodosPagoFactura();
      console.log('🔍 DEBUG CAPA 1 - Items con métodos prohibidos:', validacion.items.length);

      if (validacion.items.length > 0) {
        const metodosTexto = validacion.metodosNoPermitidos.join(', ');
        console.log('🔍 DEBUG CAPA 1 - BLOQUEANDO cambio a NC. Métodos prohibidos:', metodosTexto);

        setTimeout(() => {
          console.log('🔍 DEBUG CAPA 1 - Revirtiendo tipoDoc de "NC" a tipo anterior');
          this.tipoDoc = "PR";
          this.cdr.detectChanges();
          console.log('🔍 DEBUG CAPA 1 - tipoDoc después de revertir:', this.tipoDoc);
        }, 0);

        Swal.fire({
          icon: 'warning',
          title: 'Restricción de Notas de Crédito',
          html: `
            <p>Las notas de crédito <strong>NO pueden</strong> generarse con los siguientes métodos de pago:</p>
            <ul style="text-align: left; margin: 10px 0;">
              <li><strong>EFECTIVO AJUSTE</strong></li>
              <li><strong>TRANSFERENCIA AJUSTE</strong></li>
            </ul>
            <p style="margin-top: 10px;">Actualmente hay <strong>${validacion.items.length} artículo(s)</strong> con métodos prohibidos:</p>
            <p style="color: #dc3545;"><em>${metodosTexto}</em></p>
          `,
          footer: 'Por favor, modifique los artículos del carrito para usar métodos de pago estándar.',
          confirmButtonText: 'Entendido'
        });

        return; // Detener ejecución
      }

      console.log('🔍 DEBUG CAPA 1 - Validación OK, permitiendo cambio a NC');

      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      // Para notas de crédito, mantener el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "NV") {
      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      // Para notas de venta, mantener el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "ND") {
      // ✅ VALIDACIÓN CAPA 1: Verificar que NO se use EFECTIVO/TRANSFERENCIA AJUSTE
      console.log('🔍 DEBUG CAPA 1 - Validando cambio a ND...');
      const validacion = this.validarMetodosPagoFactura();
      console.log('🔍 DEBUG CAPA 1 - Items con métodos prohibidos:', validacion.items.length);

      if (validacion.items.length > 0) {
        const metodosTexto = validacion.metodosNoPermitidos.join(', ');
        console.log('🔍 DEBUG CAPA 1 - BLOQUEANDO cambio a ND. Métodos prohibidos:', metodosTexto);

        setTimeout(() => {
          console.log('🔍 DEBUG CAPA 1 - Revirtiendo tipoDoc de "ND" a tipo anterior');
          this.tipoDoc = "PR";
          this.cdr.detectChanges();
          console.log('🔍 DEBUG CAPA 1 - tipoDoc después de revertir:', this.tipoDoc);
        }, 0);

        Swal.fire({
          icon: 'warning',
          title: 'Restricción de Notas de Débito',
          html: `
            <p>Las notas de débito <strong>NO pueden</strong> generarse con los siguientes métodos de pago:</p>
            <ul style="text-align: left; margin: 10px 0;">
              <li><strong>EFECTIVO AJUSTE</strong></li>
              <li><strong>TRANSFERENCIA AJUSTE</strong></li>
            </ul>
            <p style="margin-top: 10px;">Actualmente hay <strong>${validacion.items.length} artículo(s)</strong> con métodos prohibidos:</p>
            <p style="color: #dc3545;"><em>${metodosTexto}</em></p>
          `,
          footer: 'Por favor, modifique los artículos del carrito para usar métodos de pago estándar.',
          confirmButtonText: 'Entendido'
        });

        return; // Detener ejecución
      }

      console.log('🔍 DEBUG CAPA 1 - Validación OK, permitiendo cambio a ND');

      this.inputOPFlag = true;
      this.puntoVenta_flag = false;
      // Para notas de débito, mantener el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "PR") {
      // ✅ VALIDACIÓN CAPA 1: Verificar métodos de pago permitidos para presupuestos
      console.log('🔍 DEBUG CAPA 1 - Validando cambio a PR...');
      const validacion = this.validarMetodosPagoPresupuesto();
      console.log('🔍 DEBUG CAPA 1 - Items no permitidos:', validacion.items.length);

      if (validacion.items.length > 0) {
        const metodosTexto = validacion.metodosNoPermitidos.join(', ');
        console.log('🔍 DEBUG CAPA 1 - BLOQUEANDO cambio a PR. Métodos problemáticos:', metodosTexto);

        // ✅ SOLUCIÓN: Usar setTimeout para revertir en el siguiente ciclo
        // Esto previene conflictos con el ciclo de detección de cambios de ngModel
        console.log('🔍 DEBUG CAPA 1 - BLOQUEANDO cambio a PR');

        setTimeout(() => {
          console.log('🔍 DEBUG CAPA 1 - Revirtiendo tipoDoc de "PR" a "FC"');
          this.tipoDoc = "FC";
          this.cdr.detectChanges();
          console.log('🔍 DEBUG CAPA 1 - tipoDoc después de revertir:', this.tipoDoc);
        }, 0);

        // Mostrar alerta
        Swal.fire({
          icon: 'warning',
          title: 'Restricción de Presupuestos',
          html: `
            <p>Los presupuestos <strong>SOLO</strong> pueden generarse con los siguientes métodos de pago:</p>
            <ul style="text-align: left; margin: 10px 0;">
              <li><strong>EFECTIVO AJUSTE</strong></li>
              <li><strong>TRANSFERENCIA AJUSTE</strong></li>
              <li><strong>CUENTA CORRIENTE</strong></li>
            </ul>
            <p style="margin-top: 10px;">Actualmente hay <strong>${validacion.items.length} artículo(s)</strong> con otros métodos de pago:</p>
            <p style="color: #dc3545;"><em>${metodosTexto}</em></p>
          `,
          footer: 'Por favor, modifique los artículos del carrito para usar solo los métodos permitidos.',
          confirmButtonText: 'Entendido'
        });

        return; // Detener ejecución
      }

      console.log('🔍 DEBUG CAPA 1 - Validación OK, permitiendo cambio a PR');

      // Si la validación pasa, configurar presupuesto normalmente
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      // Para presupuestos, también usar el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
    else if (this.tipoDoc == "CS") {
      this.inputOPFlag = false;
      this.puntoVenta_flag = false;
      // Para consultas, también usar el punto de venta de la sucursal
      this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
      this.letras_flag = false;
    }
  }
  eliminarItem(item: any) {
    // Validación defensiva: verificar que el item sea válido
    if (!item || !item.id_articulo) {
      console.error('Item inválido para eliminar:', item);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se puede eliminar este item. Datos inválidos.'
      });
      return;
    }

    // Confirmar eliminación
    Swal.fire({
      title: 'Estas seguro?',
      text: "Vas a eliminar un item del carrito!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // ✅ FIX: Usar findIndex con identificador compuesto (id_articulo + cod_tar)
          // Esto maneja correctamente el caso de productos duplicados con diferentes tipos de pago
          const index = this.itemsEnCarrito.findIndex(i =>
            i.id_articulo === item.id_articulo &&
            i.cod_tar === item.cod_tar
          );

          // Validar que el item fue encontrado
          if (index === -1) {
            console.error('Item no encontrado en carrito:', item);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo encontrar el item en el carrito.'
            });
            return;
          }

          // Eliminar el item del array
          this.itemsEnCarrito.splice(index, 1);

          // Guardar en sessionStorage con manejo de errores
          try {
            sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
          } catch (storageError) {
            console.error('Error al guardar en sessionStorage:', storageError);
            Swal.fire({
              icon: 'warning',
              title: 'Advertencia',
              text: 'El item se eliminó pero no se pudo guardar. Recargue la página.'
            });
          }

          // Actualizar el resto del sistema
          this._carrito.actualizarCarrito(); // Refrescar el número del carrito del header
          this.calculoTotal();
          this.actualizarItemsConTipoPago();  // ✅ FIX: Sincronizar ANTES de calcular totales temporales
          this.calcularTotalesTemporales();   // ← Ahora usa itemsConTipoPago actualizado

          // Confirmar eliminación exitosa
          Swal.fire('Eliminado!', 'El item fue eliminado.', 'success');

        } catch (error) {
          console.error('Error inesperado al eliminar item:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error inesperado. Recargue la página.'
          });
        }
      }
    });
  }

  calculoTotal() {
    this.suma = 0;
    for (let item of this.itemsEnCarrito) {
      // ✅ FIX: Si está en consulta, usar precio ORIGINAL para el total REAL
      const precioAUsar = item._soloConsulta ? item._precioOriginal : item.precio;
      this.suma += parseFloat((precioAUsar * item.cantidad).toFixed(2));
    }
    this.suma = parseFloat(this.suma.toFixed(2));
    this.subtotalBruto = this.suma;

    // Recalcular subtotales por tipo de pago si las tarjetas ya están cargadas
    if (this.tarjetas && this.tarjetas.length > 0) {
      this.subtotalesPorTipoPago = this.calcularSubtotalesPorTipoPago();
    }
    this.calcularResumenDescuentoGlobal();
  }

  /**
   * Actualiza la cantidad de un item en ambos arrays y sincroniza con sessionStorage
   * @param item - Item del carrito a actualizar
   * @param nuevaCantidad - Nueva cantidad del producto
   */
  actualizarCantidad(item: any, nuevaCantidad: number) {
    // Validar que la cantidad sea válida
    if (nuevaCantidad < 1) {
      nuevaCantidad = 1;
    }

    // Actualizar en itemsConTipoPago
    item.cantidad = nuevaCantidad;

    // ✅ FIX: Usar ÍNDICE para garantizar unicidad con items duplicados
    const itemIndex = this.itemsConTipoPago.indexOf(item);
    const itemEnCarrito = this.itemsEnCarrito[itemIndex];

    if (itemEnCarrito) {
      itemEnCarrito.cantidad = nuevaCantidad;
    } else {
      console.error('❌ ERROR: No se encontró item en itemsEnCarrito con índice:', itemIndex);
    }

    // Guardar en sessionStorage para mantener persistencia
    sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));

    // Recalcular total
    this.calculoTotal();
    this.calcularTotalesTemporales();  // ← NUEVO: Calcular totales temporales
  }

  /**
   * Convierte subtotales con nombres al formato esperado por el backend
   * @param subtotales Array con tipoPago (nombre) y subtotal
   * @returns Array con cod_tarj e importe_detalle para el backend
   */
  private formatearSubtotalesParaBackend(subtotales: Array<{tipoPago: string, subtotal: number}>): Array<{cod_tarj: number, importe_detalle: number}> {
    // Validación defensiva
    if (!subtotales || subtotales.length === 0 || !this.tarjetas || this.tarjetas.length === 0) {
      return [];
    }

    // Crear mapa inverso: nombre de tarjeta -> cod_tarj
    const nombreATarjetaMap = new Map<string, number>();
    this.tarjetas.forEach((t: TarjCredito) => {
      nombreATarjetaMap.set(t.tarjeta, t.cod_tarj);
    });

    // Convertir al formato del backend
    const subtotalesBackend: Array<{cod_tarj: number, importe_detalle: number}> = [];

    for (const subtotal of subtotales) {
      const cod_tarj = nombreATarjetaMap.get(subtotal.tipoPago);

      if (cod_tarj !== undefined) {
        subtotalesBackend.push({
          cod_tarj: cod_tarj,
          importe_detalle: parseFloat(subtotal.subtotal.toFixed(2))
        });
      } else {
        // 🔍 LOG DETALLADO para debugging
        console.error('❌ MAPEO FALLIDO - Detalles:', {
          tipoPago: subtotal.tipoPago,
          tipoPagoLength: subtotal.tipoPago.length,
          tipoPagoTrimmed: subtotal.tipoPago.trim(),
          tipoPagoBytes: Array.from(subtotal.tipoPago).map(c => c.charCodeAt(0)).join(','),
          subtotalImporte: subtotal.subtotal,
          tarjetasDisponibles: Array.from(nombreATarjetaMap.keys()),
          nombresSimilares: Array.from(nombreATarjetaMap.keys()).filter(k =>
            k.toLowerCase().includes(subtotal.tipoPago.toLowerCase().trim().substring(0, 5))
          )
        });
      }
    }

    return subtotalesBackend;
  }

  /**
   * Calcula subtotales agrupados por tipo de pago
   * @returns Array de objetos con tipoPago y subtotal ordenados alfabéticamente
   */
  calcularSubtotalesPorTipoPago(): Array<{tipoPago: string, subtotal: number}> {
    // Validación defensiva: verificar que el array de tarjetas esté cargado
    if (!this.tarjetas || this.tarjetas.length === 0) {
      console.warn('calcularSubtotalesPorTipoPago: Array de tarjetas vacío o no cargado');
      return [];
    }

    // Pre-computar mapa de tarjetas para optimización O(m+n) en lugar de O(n*m)
    const tarjetaMap = new Map<string, string>();
    this.tarjetas.forEach((t: TarjCredito) => {
      tarjetaMap.set(t.cod_tarj.toString(), t.tarjeta);
    });

    // Acumular subtotales por tipo de pago
    const subtotales = new Map<string, number>();

    for (let item of this.itemsEnCarrito) {
      // ✅ FIX: Si está en consulta, usar cod_tar y precio ORIGINALES
      const codTarAUsar = item._soloConsulta ? item._tipoPagoOriginal : item.cod_tar;
      const precioAUsar = item._soloConsulta ? item._precioOriginal : item.precio;

      // Resolver tipo de pago usando el mapa pre-computado
      const tipoPago = tarjetaMap.get(codTarAUsar?.toString() || '') || 'Indefinido';

      // Calcular monto del item (precio * cantidad) con precisión de 2 decimales
      const montoItem = parseFloat((precioAUsar * item.cantidad).toFixed(2));

      // Acumular en el subtotal correspondiente
      if (subtotales.has(tipoPago)) {
        subtotales.set(tipoPago, subtotales.get(tipoPago)! + montoItem);
      } else {
        subtotales.set(tipoPago, montoItem);
      }
    }

    // Convertir Map a Array y ordenar alfabéticamente (Indefinido al final)
    const resultado = Array.from(subtotales.entries())
      .map(([tipoPago, subtotal]) => ({
        tipoPago,
        subtotal: parseFloat(subtotal.toFixed(2))
      }))
      .sort((a, b) => {
        if (a.tipoPago === 'Indefinido') return 1;
        if (b.tipoPago === 'Indefinido') return -1;
        return a.tipoPago.localeCompare(b.tipoPago);
      });

    // Advertencia de rendimiento si hay demasiados tipos de pago
    if (resultado.length > 50) {
      console.warn(`Advertencia: ${resultado.length} tipos de pago diferentes detectados. Esto podría afectar el rendimiento de la interfaz.`);
    }

    return resultado;
  }

  private redondearImporte(valor: number): number {
    return parseFloat((Number(valor || 0)).toFixed(2));
  }

  calcularResumenDescuentoGlobal(): void {
    const descuento = this.redondearImporte(this.descuentoGlobal);
    this.descuentoGlobal = descuento < 0 ? 0 : descuento;
    this.totalNeto = this.redondearImporte(Math.max(this.subtotalBruto - this.descuentoGlobal, 0));
    this.subtotalesPorTipoPagoNetos = this.calcularSubtotalesNetosPorTipoPago(this.subtotalesPorTipoPago);
  }

  tieneCuentaCorrienteEnCarrito(): boolean {
    return this.itemsEnCarrito.some(item => String(item.cod_tar) === '111');
  }

  private tieneDescuentoGlobalActivo(): boolean {
    return this.redondearImporte(this.descuentoGlobal) > 0;
  }

  validarDescuentoGlobal(mostrarAlerta: boolean = true): boolean {
    this.calcularResumenDescuentoGlobal();

    if (!this.tieneDescuentoGlobalActivo()) {
      return true;
    }

    let mensaje = '';
    if (this.descuentoGlobal < 0) {
      mensaje = 'El descuento no puede ser menor a cero.';
    } else if (this.descuentoGlobal > this.subtotalBruto) {
      mensaje = 'El descuento no puede superar el subtotal bruto.';
    } else if (this.tieneCuentaCorrienteEnCarrito()) {
      mensaje = 'No se permite descuento global cuando interviene cuenta corriente.';
    } else if (this.tipoDoc === 'CS') {
      mensaje = 'El descuento global no esta habilitado para CS.';
    } else if (this.hayItemsSoloConsulta()) {
      mensaje = 'No se puede aplicar descuento global con items en modo consulta.';
    }

    if (mensaje) {
      if (mostrarAlerta) {
        Swal.fire({
          icon: 'error',
          title: 'Descuento global invalido',
          text: mensaje
        });
      }
      return false;
    }

    return true;
  }

  calcularSubtotalesNetosPorTipoPago(subtotales: Array<{tipoPago: string, subtotal: number}>): Array<{tipoPago: string, subtotal: number}> {
    if (!subtotales || subtotales.length === 0) {
      return [];
    }

    const descuento = this.redondearImporte(this.descuentoGlobal);
    if (descuento <= 0 || this.subtotalBruto <= 0) {
      return subtotales.map(item => ({
        tipoPago: item.tipoPago,
        subtotal: this.redondearImporte(item.subtotal)
      }));
    }

    let acumulado = 0;
    return subtotales.map((item, index) => {
      let neto: number;
      if (index === subtotales.length - 1) {
        neto = this.redondearImporte(this.totalNeto - acumulado);
      } else {
        const proporcion = item.subtotal / this.subtotalBruto;
        const descuentoItem = this.redondearImporte(descuento * proporcion);
        neto = this.redondearImporte(item.subtotal - descuentoItem);
        acumulado = this.redondearImporte(acumulado + neto);
      }

      return {
        tipoPago: item.tipoPago,
        subtotal: neto
      };
    });
  }

  buildDescuentoGlobalPayload(cabecera: any): any {
    if (!this.tieneDescuentoGlobalActivo()) {
      return null;
    }

    return {
      subtotal_bruto: this.subtotalBruto,
      descuento_monto: this.descuentoGlobal,
      total_neto: this.totalNeto,
      tipo_comprobante: this.tipoDoc,
      puntoventa: Number(this.puntoventa),
      numero_int: Number(this.numerocomprobante),
      numero_fac: cabecera && cabecera.numero_fac ? Number(cabecera.numero_fac) : undefined,
      origen: 'carrito',
      usuario: cabecera && cabecera.usuario ? cabecera.usuario : ''
    };
  }

  buildStockMovimientosPayload(): Array<{id_articulo: number, cantidad: number, sucursal: number}> {
    const sucursal = Number(sessionStorage.getItem('sucursal') || this.sucursal || 0);
    return this.itemsEnCarrito.map(item => ({
      id_articulo: Number(item.id_articulo),
      cantidad: Number(item.cantidad),
      sucursal
    }));
  }

  // ════════════════════════════════════════════════════════════
  // TOTALES TEMPORALES PARA MODO CONSULTA
  // ════════════════════════════════════════════════════════════

  /**
   * Calcula totales y subtotales temporales basados en itemsConTipoPago
   * Se muestran solo cuando hay items en modo consulta
   */
  calcularTotalesTemporales(): void {
    // Solo calcular si hay items en consulta
    this.hayItemsEnConsulta = this.hayItemsSoloConsulta();

    if (!this.hayItemsEnConsulta) {
      // Si no hay items en consulta, usar valores reales
      this.sumaTemporalSimulacion = this.suma;
      this.subtotalesTemporalesSimulacion = [...this.subtotalesPorTipoPago];
      return;
    }

    // ✅ FIX: Calcular total temporal con TODOS los items (muestra el total final si se confirman los cambios)
    this.sumaTemporalSimulacion = 0;
    for (let item of this.itemsConTipoPago) {
      this.sumaTemporalSimulacion += parseFloat((item.precio * item.cantidad).toFixed(2));
    }
    this.sumaTemporalSimulacion = parseFloat(this.sumaTemporalSimulacion.toFixed(2));

    // Calcular subtotales temporales
    this.subtotalesTemporalesSimulacion = this.calcularSubtotalesTemporales();
  }

  /**
   * Calcula subtotales por tipo de pago usando itemsConTipoPago (valores temporales)
   * Similar a calcularSubtotalesPorTipoPago() pero usa itemsConTipoPago en lugar de itemsEnCarrito
   */
  calcularSubtotalesTemporales(): Array<{tipoPago: string, subtotal: number}> {
    if (!this.tarjetas || this.tarjetas.length === 0) {
      console.warn('calcularSubtotalesTemporales: Array de tarjetas vacío o no cargado');
      return [];
    }

    // Pre-computar mapa de tarjetas
    const tarjetaMap = new Map<string, string>();
    this.tarjetas.forEach((t: TarjCredito) => {
      tarjetaMap.set(t.cod_tarj.toString(), t.tarjeta);
    });

    // Acumular subtotales por tipo de pago
    const subtotales = new Map<string, number>();

    for (let item of this.itemsConTipoPago) {
      // ✅ FIX: Solo incluir items en modo consulta
      if (!item._soloConsulta) {
        continue;  // Saltar items normales
      }

      // Resolver tipo de pago usando el mapa pre-computado
      const tipoPago = tarjetaMap.get(item.cod_tar?.toString() || '') || 'Indefinido';

      // Calcular monto del item (precio * cantidad)
      const montoItem = parseFloat((item.precio * item.cantidad).toFixed(2));

      // Acumular en el subtotal correspondiente
      if (subtotales.has(tipoPago)) {
        subtotales.set(tipoPago, subtotales.get(tipoPago)! + montoItem);
      } else {
        subtotales.set(tipoPago, montoItem);
      }
    }

    // Convertir Map a Array y ordenar
    return Array.from(subtotales.entries())
      .map(([tipoPago, subtotal]) => ({
        tipoPago,
        subtotal: parseFloat(subtotal.toFixed(2))
      }))
      .sort((a, b) => {
        if (a.tipoPago === 'Indefinido') return 1;
        if (b.tipoPago === 'Indefinido') return -1;
        return a.tipoPago.localeCompare(b.tipoPago);
      });
  }

  /**
   * Verifica si un tipo de pago en simulación es diferente del real
   * Se usa para marcar con badge los tipos de pago que cambiaron
   */
  esDiferenteDelReal(tipoPagoTemporal: string): boolean {
    // Buscar si existe en subtotales reales
    const existeEnReal = this.subtotalesPorTipoPago.some(
      st => st.tipoPago === tipoPagoTemporal
    );

    if (!existeEnReal) {
      return true;  // Es nuevo, no existía en real
    }

    // Verificar si el monto es diferente
    const subtotalReal = this.subtotalesPorTipoPago.find(
      st => st.tipoPago === tipoPagoTemporal
    );
    const subtotalTemporal = this.subtotalesTemporalesSimulacion.find(
      st => st.tipoPago === tipoPagoTemporal
    );

    if (subtotalReal && subtotalTemporal) {
      return subtotalReal.subtotal !== subtotalTemporal.subtotal;
    }

    return false;
  }

  /**
   * Valida que todos los items del carrito tengan métodos de pago permitidos para presupuestos
   * @returns Objeto con items no permitidos y nombres de métodos problemáticos
   */
  private validarMetodosPagoPresupuesto(): { items: any[], metodosNoPermitidos: string[] } {
    // 🔍 DEBUG: Log detallado de validación
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 VALIDACIÓN PRESUPUESTO - INICIO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 Total items en carrito:', this.itemsEnCarrito.length);
    console.log('✅ Códigos PERMITIDOS:', this.PRESUPUESTO_COD_TARJ_PERMITIDOS);

    // Log detallado de cada item
    this.itemsEnCarrito.forEach((item, index) => {
      console.log(`\n📦 Item ${index + 1}:`, {
        nombre: item.nomart,
        cod_tar_original: item.cod_tar,
        tipo_cod_tar: typeof item.cod_tar,
        cod_tar_convertido: typeof item.cod_tar === 'string' ? parseInt(item.cod_tar, 10) : item.cod_tar
      });
    });

    const itemsNoPermitidos = this.itemsEnCarrito.filter(item => {
      // ✅ FIX: Convertir cod_tar a number para comparación correcta
      // Soluciona bug donde "12" (string) !== 12 (number) causaba falsos positivos
      const codTarNum = typeof item.cod_tar === 'string'
        ? parseInt(item.cod_tar, 10)
        : item.cod_tar;

      const estaPermitido = this.PRESUPUESTO_COD_TARJ_PERMITIDOS.includes(codTarNum);

      console.log(`\n🔎 Validando item "${item.nomart}":`, {
        cod_tar: item.cod_tar,
        codTarNum: codTarNum,
        estaPermitido: estaPermitido
      });

      return !estaPermitido;
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 RESULTADO DE VALIDACIÓN:');
    console.log('❌ Items NO permitidos:', itemsNoPermitidos.length);

    if (itemsNoPermitidos.length > 0) {
      console.log('❌ Items problemáticos:', itemsNoPermitidos.map(i => i.nomart));
    } else {
      console.log('✅ TODOS los items están permitidos');
    }
    console.log('═══════════════════════════════════════════════════════\n');

    const metodosProblematicos = itemsNoPermitidos
      .map(item => {
        // ✅ FIX: Comparar ambos como string ya que cod_tarj y cod_tar están normalizados
        const tarjeta = this.tarjetas.find(t => String(t.cod_tarj) === String(item.cod_tar));
        return tarjeta ? tarjeta.tarjeta : `Código ${item.cod_tar}`;
      })
      .filter((v, i, a) => a.indexOf(v) === i); // Eliminar duplicados

    return {
      items: itemsNoPermitidos,
      metodosNoPermitidos: metodosProblematicos
    };
  }

  /**
   * Valida que ningún item del carrito use EFECTIVO AJUSTE o TRANSFERENCIA AJUSTE para FC/NC/ND
   * @returns Objeto con items no permitidos y nombres de métodos problemáticos
   */
  private validarMetodosPagoFactura(): { items: any[], metodosNoPermitidos: string[] } {
    // 🔍 DEBUG: Log detallado de validación
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 VALIDACIÓN FACTURA/NC/ND - INICIO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 Total items en carrito:', this.itemsEnCarrito.length);
    console.log('❌ Códigos NO PERMITIDOS:', this.FACTURA_COD_TARJ_NO_PERMITIDOS);

    // Log detallado de cada item
    this.itemsEnCarrito.forEach((item, index) => {
      console.log(`\n📦 Item ${index + 1}:`, {
        nombre: item.nomart,
        cod_tar_original: item.cod_tar,
        tipo_cod_tar: typeof item.cod_tar,
        cod_tar_convertido: typeof item.cod_tar === 'string' ? parseInt(item.cod_tar, 10) : item.cod_tar
      });
    });

    const itemsNoPermitidos = this.itemsEnCarrito.filter(item => {
      // ✅ Convertir cod_tar a number para comparación correcta
      const codTarNum = typeof item.cod_tar === 'string'
        ? parseInt(item.cod_tar, 10)
        : item.cod_tar;

      const estaProhibido = this.FACTURA_COD_TARJ_NO_PERMITIDOS.includes(codTarNum);

      console.log(`\n🔎 Validando item "${item.nomart}":`, {
        cod_tar: item.cod_tar,
        codTarNum: codTarNum,
        estaProhibido: estaProhibido
      });

      return estaProhibido;
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 RESULTADO DE VALIDACIÓN:');
    console.log('❌ Items NO permitidos:', itemsNoPermitidos.length);

    if (itemsNoPermitidos.length > 0) {
      console.log('❌ Items problemáticos:', itemsNoPermitidos.map(i => i.nomart));
    } else {
      console.log('✅ TODOS los items están permitidos');
    }
    console.log('═══════════════════════════════════════════════════════\n');

    const metodosProblematicos = itemsNoPermitidos
      .map(item => {
        // ✅ FIX: Comparar ambos como string ya que cod_tarj y cod_tar están normalizados
        const tarjeta = this.tarjetas.find(t => String(t.cod_tarj) === String(item.cod_tar));
        return tarjeta ? tarjeta.tarjeta : `Código ${item.cod_tar}`;
      })
      .filter((v, i, a) => a.indexOf(v) === i); // Eliminar duplicados

    return {
      items: itemsNoPermitidos,
      metodosNoPermitidos: metodosProblematicos
    };
  }

  async finalizar() {
    // 🔍 DEBUG LOG - Inicio de finalizar
    console.log('🔍 DEBUG finalizar() - tipoDoc:', this.tipoDoc);
    console.log('🔍 DEBUG finalizar() - items en carrito:', this.itemsEnCarrito.length);

    if (this.itemsEnCarrito.length > 0) {//hacer si

      // ════════════════════════════════════════════════════════════
      // ✅ NUEVA VALIDACIÓN v4.0: Bloquear si hay items en consulta
      // ════════════════════════════════════════════════════════════
      const validacionConsulta = this.validarItemsSoloConsulta();

      if (!validacionConsulta.valido) {
        const itemsList = validacionConsulta.items
          .map(i => `<li><strong>${i.nomart}</strong> - ${i.tipoPago} - $${i.precio?.toFixed(2)}</li>`)
          .join('');

        Swal.fire({
          icon: 'error',
          title: 'Items en modo consulta',
          html: `
            <div style="text-align: left; padding: 0 20px;">
              <p>⚠️ No se puede finalizar la venta porque hay <strong>${validacionConsulta.items.length} item(s)</strong>
              marcado(s) como <strong>"SOLO CONSULTA"</strong>:</p>
              <hr>
              <ul style="text-align: left; max-height: 200px; overflow-y: auto;">
                ${itemsList}
              </ul>
              <hr>
              <p><strong>Acciones disponibles:</strong></p>
              <ol>
                <li><strong>Revertir:</strong> Haga clic en el botón "Revertir" de cada item para volver al método original</li>
                <li><strong>Eliminar y re-agregar:</strong> Elimine el item y agréguelo nuevamente con el método de pago correcto</li>
              </ol>
            </div>
          `,
          confirmButtonText: 'Entendido',
          width: 700
        });

        return; // BLOQUEAR finalización
      }

      console.log('✅ Validación de items en consulta: OK');
      // ════════════════════════════════════════════════════════════

      if (!this.validarDescuentoGlobal(true)) {
        return;
      }

      // ✅ VALIDACIÓN CAPA 3 (FINAL): Presupuestos solo con métodos permitidos
      console.log('🔍 DEBUG - Verificando si es PR. tipoDoc === "PR"?', this.tipoDoc === "PR");

      if (this.tipoDoc === "PR") {
        console.log('🔍 DEBUG - ES PR, ejecutando validación...');
        const validacion = this.validarMetodosPagoPresupuesto();
        console.log('🔍 DEBUG - Resultado validación:', validacion);

        if (validacion.items.length > 0) {
          console.error('❌ VALIDACIÓN FINAL FALLIDA: Items con métodos no permitidos en PR:', validacion.items);

          Swal.fire({
            icon: 'error',
            title: 'No se puede generar el presupuesto',
            text: 'Los presupuestos solo pueden tener artículos con EFECTIVO AJUSTE, TRANSFERENCIA AJUSTE o CUENTA CORRIENTE como método de pago.',
            footer: `${validacion.items.length} artículo(s) tienen métodos de pago no permitidos.`,
            confirmButtonText: 'Aceptar'
          });
          return; // Detener procesamiento
        }

        // Log de validación exitosa
        console.log('✅ VALIDACIÓN PR: Todos los items tienen métodos de pago permitidos (cod_tar: 12, 1112 o 111)');
      }

      // ✅ VALIDACIÓN CAPA 3 (FINAL): Facturas/NC/ND NO pueden usar EFECTIVO/TRANSFERENCIA AJUSTE
      console.log('🔍 DEBUG - Verificando si es FC/NC/ND. tipoDoc:', this.tipoDoc);

      if (this.tipoDoc === "FC" || this.tipoDoc === "NC" || this.tipoDoc === "ND") {
        console.log('🔍 DEBUG - ES FC/NC/ND, ejecutando validación...');
        const validacion = this.validarMetodosPagoFactura();
        console.log('🔍 DEBUG - Resultado validación:', validacion);

        if (validacion.items.length > 0) {
          console.error('❌ VALIDACIÓN FINAL FALLIDA: Items con métodos prohibidos en FC/NC/ND:', validacion.items);

          const tipoDocNombre = this.tipoDoc === "FC" ? "factura" :
                               this.tipoDoc === "NC" ? "nota de crédito" : "nota de débito";

          Swal.fire({
            icon: 'error',
            title: `No se puede generar la ${tipoDocNombre}`,
            text: `Las ${tipoDocNombre}s NO pueden tener artículos con EFECTIVO AJUSTE o TRANSFERENCIA AJUSTE como método de pago.`,
            footer: `${validacion.items.length} artículo(s) tienen métodos de pago prohibidos.`,
            confirmButtonText: 'Aceptar'
          });
          return; // Detener procesamiento
        }

        // Log de validación exitosa
        console.log('✅ VALIDACIÓN FC/NC/ND: Ningún item usa EFECTIVO/TRANSFERENCIA AJUSTE');
      }

      console.log(this.puntoventa);
      if (this.pendientes()) {
        Swal.fire({
          title: 'Enviando...',
          allowOutsideClick: false,
        });
        this.indiceTipoDoc = "";
        console.log('TIPO DOC:' + this.tipoDoc);
        console.log('PUNTO VENTA:' + this.puntoventa);
        
        // Validación adicional: asegurar que puntoventa siempre coincida con sucursal
        const sucursalActual = parseInt(sessionStorage.getItem('sucursal') || '0');
        if (this.puntoventa !== sucursalActual) {
          console.warn('Corrigiendo puntoventa:', this.puntoventa, '-> ', sucursalActual);
          this.puntoventa = sucursalActual;
        }
        if (this.tipoDoc == undefined || this.tipoDoc == "" || this.puntoventa == undefined)//if (this.tipoDoc == undefined || this.tipoDoc == "" || this.numerocomprobante == undefined || this.numerocomprobante == "" || this.puntoventa == undefined || this.puntoventa == "") 
        {
          Swal.fire({
            icon: 'error',
            title: 'Error..',
            text: 'Faltan datos!',
            footer: 'Completar todos los campos'
          })
          return;
        }
        else {
          if (this.tipoDoc == "ND") {
            this.indiceTipoDoc = "notadebito";
            this.numerocomprobante = this.numerocomprobante; //numero.toString();
          }
          else if (this.tipoDoc == "FC") {
            this.indiceTipoDoc = "factura";
            this.numerocomprobante = this.numerocomprobante; //numero.toString();
          }
          else if (this.tipoDoc == "NC") {
            this.indiceTipoDoc = "notacredito";
            this.numerocomprobante = this.numerocomprobante;//numero.toString();
          }
          else if (this.tipoDoc == "NV") {
            this.indiceTipoDoc = "devolucion";

            this.numerocomprobante = this.numerocomprobante;//numero.toString();
          }
          else if (this.tipoDoc == "PR") {
            this.indiceTipoDoc = "presupuesto";
            let numero = await this._crud.getNumeroSecuencial('presupuesto').pipe(take(1)).toPromise();
            console.log('NUMERO SECUENCIAL:' + numero);
            this.numerocomprobante = numero.toString();
          }
          else if (this.tipoDoc == "CS") {
            this.indiceTipoDoc = "consulta";
            let numero = await this._crud.getNumeroSecuencial('consulta').pipe(take(1)).toPromise();
            console.log('NUMERO SECUENCIAL:' + numero);
            this.numerocomprobante = numero.toString();
          }
          let emailOp = sessionStorage.getItem('emailOp');
          const tieneTarjetaCredito = this.itemsEnCarrito.some(item => this.esItemConTarjetaCredito(item));
          let cupon: string | null = null;
          if (tieneTarjetaCredito) {
            cupon = await this.pedirCupon();
            if (!cupon) {
              Swal.close();
              return;
            }
          }
          // Crear datos para descuento de stock (con id_articulo)
          let stockData = this.itemsEnCarrito.map(obj => {
            return {
              id_articulo: obj.id_articulo,
              cantidad: obj.cantidad,
              tipodoc: this.tipoDoc
            };
          });

          // ✅ FIX v4.0: Whitelist de campos para psucursal
            let result = this.itemsEnCarrito.map(obj => {
              return {
                idart: obj.id_articulo || 0,
                cantidad: obj.cantidad,
                precio: obj.precio,
                nomart: obj.nomart,
                tipoprecio: obj.tipoprecio || '',
                cod_tar: obj.cod_tar,
                titulartar: obj.titulartar || null,
                numerotar: obj.numerotar || null,
                nautotar: this.esItemConTarjetaCredito(obj) ? Number(cupon) : null,
                dni_tar: obj.dni_tar || null,
                banco: obj.banco || null,
                ncuenta: obj.ncuenta || null,
                ncheque: obj.ncheque || null,
                nombre: obj.nombre || '',
                plaza: obj.plaza || '',
                importeimputar: obj.importeimputar || null,
                importecheque: obj.importecheque || null,
                fechacheque: obj.fechacheque || null,
                idcli: obj.idcli,
                idven: this.vendedoresV,
                fecha: obj.fecha || new Date().toISOString().split('T')[0],
                hora: obj.hora || new Date().toLocaleTimeString('es-ES'),
                cod_mov: obj.cod_mov || 0,
                suc_destino: obj.suc_destino || 0,
                emailop: emailOp,
                tipodoc: this.tipoDoc,
                puntoventa: this.puntoventa,
                numerocomprobante: this.numerocomprobante,
                estado: "NP",
                id_num: obj.id_num || null
              };
            });
          this.numerocomprobanteImpresion = this.numerocomprobante;
          sessionStorage.setItem('carrito', JSON.stringify(result));
          console.log(result);
          let sucursal = sessionStorage.getItem('sucursal');
          // Mapeado de sucursal a exi - Lo mantenemos hasta que se pueda cambiar en la base de datos
          let exi = 0;
          // Usando un objeto de mapeo en lugar de condicionales
        /*   const mappedValues = {
            "2": 3,  // Suc. Valle Viejo
            "3": 4,  // Suc. Guemes
            "4": 1   // Deposito
          }; */
           const mappedValues = {
    "1": 2,  // Casa Central → exi2
    "2": 3,  // Suc. Valle Viejo → exi3
    "3": 4,  // Suc. Guemes → exi4
    "4": 1,   // Deposito → exi1
    "5": 5,   // Mayorista → exi5
  };
          
          // Usamos el objeto de mapeo, con fallback a 0 si no existe
          exi = mappedValues[sucursal] || 0;
          if (this.tieneDescuentoGlobalActivo()) {
            const stockMovimientos = this.buildStockMovimientosPayload();
            this.agregarPedido(result, sucursal, stockMovimientos);
            return;
          }

          this._subirdata.editarStockArtSucxManagedPHP(stockData, exi).pipe(take(1)).subscribe({
            next: (data: any) => {
              console.log('Stock actualizado:', data);
              if (!data.error) {
                // Solo si el descuento fue exitoso, proceder con el pedido
                this.agregarPedido(result, sucursal);
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'No se pudo actualizar el stock: ' + data.mensaje
                });
              }
            },
            error: (error) => {
              console.error('Error al actualizar stock:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error de conexión al actualizar stock'
              });
            }
          });
        }
      }
    }
    else {
      Swal.fire({
        icon: 'error',
        title: 'Error..',
        text: 'No hay items en el carrito!',
        footer: 'Agregue items al carrito'
      })
    }
  }
  cabecera(fecha: any, fechasinformato: any) {
    let year = fechasinformato.getFullYear();
    let month = fechasinformato.getMonth() + 1;
    let formattedMonth = month < 10 ? '0' + month : month;
    let numero_fac: number = 0
    if (this.tipoDoc != "FC") {
      numero_fac = 0;
    }
    else {
      numero_fac = Number(this.numerocomprobante);
      // Limitar número de factura al máximo permitido
      if (numero_fac > 999999) {
        numero_fac = 999999;
      }
    }
    
    // Función auxiliar para limitar valores numéricos
    const limitNumericValue = (value: any, limit: number) => {
      if (value === null || value === undefined || value === '') return null;
      const numValue = parseInt(value);
      return !isNaN(numValue) ? Math.min(numValue, limit) : null;
    };
    
    let codvent = this.getCodVta();
    let saldo = this.tieneDescuentoGlobalActivo() ? 0 : this.sumarCuentaCorriente();
    
    // Asegurarse de que cliente.idcli no exceda el límite
    let clienteId;
    if (this.cliente && this.cliente.idcli) {
      clienteId = this.cliente.idcli;
      if (parseInt(clienteId) > 999999) {
        clienteId = '999999';
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Cliente no encontrado',
        text: 'Debe seleccionar un cliente antes de continuar. Diríjase a Artículos para seleccionar un cliente.',
        confirmButtonText: 'Entendido'
      });
      return void 0;
    }
    
    // Verificar datos del cliente antes de crear cabecera
    if (!this.cliente || !this.cliente.cod_iva) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos de cliente incompletos',
        text: 'Faltan datos del cliente. Diríjase a Artículos para seleccionar un cliente válido.',
        confirmButtonText: 'Ir a Artículos',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/articulos']);
        }
      });
      return void 0;
    }

    // MODIFICACIÓN CRÍTICA: Redondear suma ANTES de calcular IVA
    this.calcularResumenDescuentoGlobal();
    const totalRedondeado = this.tieneDescuentoGlobalActivo()
      ? parseFloat(this.totalNeto.toFixed(2))
      : parseFloat(this.suma.toFixed(2));

    let cabecera = {
      tipo: this.tipoDoc,
      numero_int: limitNumericValue(this.numerocomprobante, 999999),
      puntoventa: limitNumericValue(this.puntoventa, 9999),
      letra: this.letraValue,
      numero_fac: numero_fac,
      atipo: this.tipoDoc,
      anumero_com: numero_fac,
      cliente: clienteId,
      cod_sucursal: limitNumericValue(this.sucursal, 999999),
      emitido: fecha,
      vencimiento: fecha,
      exento: 0,
      basico: parseFloat((totalRedondeado / 1.21).toFixed(4)),//this.suma/1.21,
      iva1: parseFloat((totalRedondeado - totalRedondeado / 1.21).toFixed(4)),
      iva2: 0,
      iva3: 0,
      bonifica: 0,
      bonifica_tipo: 'P', // Por defecto porcentaje
      interes: 0,
      interes_tipo: 'P', // Por defecto porcentaje
      saldo: saldo,//this.suma,
      dorigen: true,
      cod_condvta: limitNumericValue(codvent, 999),
      cod_iva: limitNumericValue(this.cliente.cod_iva, 999),
      cod_vendedor: limitNumericValue(this.vendedoresV, 999),//// aca hay que ver si se agrega un campo para elegir el nombre del vendedor
      anulado: false,
      cuit: this.cliente.cuit,
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
      fec_proceso: formatDate(this.FechaCalend, 'dd/MM/yy', 'en-US'),//fecha de cierre con caja puede ser otro dia   ?
      fec_ultpago: null,
      estado: "",
      id_aso: 0,
      //id_num:1,
    }
    console.log(cabecera);
    return cabecera;
  }
  sumarCuentaCorriente(): number {
    console.log(this.itemsEnCarrito);
    let acumulado = 0;
    for (let item of this.itemsEnCarrito) {
      console.log(item);
      // ✅ FIX: Comparar como string ya que cod_tar está normalizado a string
      if (String(item.cod_tar) === '111') {
        acumulado += parseFloat((item.precio * item.cantidad).toFixed(2)); // Asumiendo que cada item tiene un campo 'valor' que queremos sumar
      }
    }
    return parseFloat(acumulado.toFixed(2));
  }

  getCodVta() {
    if (this.itemsEnCarrito.length === 0) {
      return 99;
    }
    const firstCodTar = this.itemsEnCarrito[0].cod_tar;
    for (let item of this.itemsEnCarrito) {
      if (item.cod_tar !== firstCodTar) {
        return 99;
      }
    }
    return firstCodTar;
  }

  /**
   * Navega de forma inteligente para agregar más productos
   * - Si hay cliente y condición de venta: va a condicionventa
   * - Si no hay contexto de compra: va a puntoventa para seleccionar cliente
   */
  agregarProductos() {
    console.log('🛒 Intentando agregar más productos...');

    // Verificar si hay contexto de compra en sessionStorage
    const datoscliente = sessionStorage.getItem('datoscliente');
    const condicionVenta = sessionStorage.getItem('condicionVentaSeleccionada');

    console.log('📊 Estado del contexto:');
    console.log('  - datoscliente:', datoscliente ? '✓ existe' : '✗ no existe');
    console.log('  - condicionVenta:', condicionVenta ? '✓ existe' : '✗ no existe');

    if (datoscliente && condicionVenta) {
      // ✅ CORRECTO: Pasar cliente en queryParams
      const cliente = JSON.parse(datoscliente);
      console.log('✅ Hay contexto de compra - Navegando a condicionventa con cliente:', cliente);
      this.router.navigate(['/components/condicionventa'], {
        queryParams: { cliente: JSON.stringify(cliente) }
      });
    } else {
      // No hay contexto completo → ir a seleccionar cliente primero
      console.log('⚠️  No hay contexto completo - Navegando a puntoventa');
      this.router.navigate(['/components/puntoventa']);
    }
  }
  validateValue(value: string): boolean {
    return this.myRegex.test(value);
  }
  agregarPedido(pedido: any, sucursal: any, stockMovimientos?: any[]) {
    let fecha = new Date();
    let fechaFormateada = fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // ✅ NUEVO: Recalcular subtotales justo antes de imprimir
    // Esto garantiza que las tarjetas estén cargadas (mitiga race condition)
    const subtotalesActualizados = (this.tarjetas && this.tarjetas.length > 0)
      ? this.calcularSubtotalesPorTipoPago()
      : [];

    // Advertencia si no se pudieron calcular subtotales
    if (subtotalesActualizados.length === 0 && this.itemsEnCarrito.length > 0) {
      console.warn('⚠️ ADVERTENCIA: No se pudieron calcular subtotales por tipo de pago. PDF sin desglose.');
    }

    let cabecera = this.cabecera(fechaFormateada, fecha);

    // ====================================================================
    // SOLUCIÓN MÚLTIPLES CAJAS: Crear array de movimientos (uno por método)
    // ====================================================================
    const subtotalesParaCaja = this.tieneDescuentoGlobalActivo()
      ? this.calcularSubtotalesNetosPorTipoPago(subtotalesActualizados)
      : subtotalesActualizados;
    const descuentoGlobalPayload = this.buildDescuentoGlobalPayload(cabecera);
    const cajaMoviPromise = this.crearCajasMovi(pedido, cabecera, fecha, subtotalesParaCaja);

    // Manejar la promesa para obtener el array de caja_movi
    if (cajaMoviPromise && cajaMoviPromise.then) {
      // Es una promesa, esperamos a que se resuelva
      cajaMoviPromise.then(movimientos_caja => {
        console.log('✅ Movimientos de caja creados:', movimientos_caja);
        console.log('📊 Cantidad de movimientos:', movimientos_caja.length);

        // ====================================================================
        // ⚠️ FASE 3: CÓDIGO COMENTADO - NO SE ENVÍAN SUBTOTALES AL BACKEND
        // ====================================================================
        // MOTIVO: El backend ya no inserta en caja_movi_detalle
        // Fecha: 2025-10-21
        // Ver: eliminacion_caja_movi_detalle.md
        // ====================================================================

        console.log('✅ FASE 3: Frontend actualizado - No se envían subtotales al backend');

        /*
        // ALTERNATIVA C: Formatear subtotales para enviar al backend
        // 🔍 LOGS DE DEPURACIÓN - INICIO
        console.log('🔍 ========== DEPURACIÓN SUBTOTALES ==========');
        console.log('1️⃣ Subtotales calculados:', JSON.stringify(subtotalesActualizados, null, 2));
        console.log('2️⃣ Tarjetas cargadas:', JSON.stringify(this.tarjetas, null, 2));
        console.log('3️⃣ Mapa de nombres → códigos:',
          this.tarjetas.map(t => ({
            nombre: t.tarjeta,
            cod: t.cod_tarj,
            length: t.tarjeta.length,
            hex: Array.from(t.tarjeta).map(c => c.charCodeAt(0).toString(16)).join(' ')
          }))
        );

        const subtotalesParaBackend = this.formatearSubtotalesParaBackend(subtotalesActualizados);

        console.log('4️⃣ Subtotales enviados al backend:', JSON.stringify(subtotalesParaBackend, null, 2));
        console.log('5️⃣ Validación de cantidad:',
          subtotalesActualizados.length === subtotalesParaBackend.length
            ? `✅ CORRECTO (${subtotalesParaBackend.length}/${subtotalesActualizados.length})`
            : `❌ ERROR: Se perdieron ${subtotalesActualizados.length - subtotalesParaBackend.length} subtotales`
        );

        // Validar suma total
        const sumaMapeada = subtotalesParaBackend.reduce((acc, sub) => acc + sub.importe_detalle, 0);
        const diferencia = Math.abs(sumaMapeada - this.suma);
        console.log('6️⃣ Validación de suma:',
          diferencia < 0.01
            ? `✅ CORRECTO (Suma mapeada: ${sumaMapeada.toFixed(2)}, Total: ${this.suma.toFixed(2)})`
            : `❌ ERROR: Diferencia de $${diferencia.toFixed(2)} (Suma: ${sumaMapeada.toFixed(2)}, Total: ${this.suma.toFixed(2)})`
        );
        console.log('🔍 ========== FIN DEPURACIÓN ==========');
        // 🔍 LOGS DE DEPURACIÓN - FIN

        console.log('📊 Subtotales formateados para backend:', subtotalesParaBackend);
        */

        // Enviar array de movimientos al backend (sin subtotales)
        this._subirdata.subirDatosPedidos(pedido, cabecera, sucursal, movimientos_caja, descuentoGlobalPayload, stockMovimientos).pipe(take(1)).subscribe({
        next: (data: any) => {
          if (data && data.error) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: data.mensaje || 'No se pudo guardar el pedido'
            });
            return;
          }
          console.log(data.mensaje);
          // ✅ LLAMADA ACTUALIZADA (pasar subtotales recalculados):
          this.imprimir(
            this.itemsEnCarrito,
            this.numerocomprobante,
            fechaFormateada,
            this.tieneDescuentoGlobalActivo() ? this.totalNeto : this.suma,
            subtotalesParaCaja,
            descuentoGlobalPayload
          );
          //actualizar indices
          if (this.indiceTipoDoc != "") {
            this._crud.incrementarNumeroSecuencial(this.indiceTipoDoc, parseInt(this.numerocomprobante) + 1).then(() => {
              console.log('Numero secuencial incrementado');
              this.numerocomprobante = "";
            });
          }
          Swal.fire({
            icon: 'success',
            title: 'Pedido enviado',
            text: 'El pedido se envio correctamente!',
            footer: 'Se envio el pedido a la sucursal ' + sessionStorage.getItem('sucursal')
          })
          this.itemsEnCarrito = [];
          this.itemsConTipoPago = [];
          this.descuentoGlobal = 0;
          sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
          this._carrito.actualizarCarrito(); // es para refrescar el numero del carrito del header
          this.calculoTotal();
        },
        error: (error) => {
          console.error('Error al enviar pedido:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error?.error?.mensaje || 'No se pudo guardar el pedido'
          });
        }
        });
      }).catch(error => {
        console.error('❌ Error al crear los movimientos de caja:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al crear los movimientos de caja. Por favor, inténtelo de nuevo.'
        });
      });
    } else {
      // Si no hay items en el carrito, movimientos_caja puede estar vacío
      console.warn('⚠️ No se pudieron crear los movimientos de caja');
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: 'No hay suficiente información para procesar el pedido.'
      });
    }
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
      if (!this.puntoventa) {
        missingFields.push('Punto de venta');
      }
      if (!this.numerocomprobante) {
        missingFields.push('Numero de Comprobante');
      }

      // ✅ VALIDACIÓN CAPA 2: Verificar que NO se use EFECTIVO/TRANSFERENCIA AJUSTE
      const validacion = this.validarMetodosPagoFactura();

      if (validacion.items.length > 0) {
        const listaArticulos = validacion.items
          .map(item => `"${item.nomart}"`)
          .join(', ');

        Swal.fire({
          icon: 'error',
          title: 'Error de Validación - Facturas',
          html: `
            <p>Las facturas <strong>NO pueden</strong> tener artículos con los siguientes métodos de pago:</p>
            <ul style="text-align: left; margin: 10px 0;">
              <li>EFECTIVO AJUSTE</li>
              <li>TRANSFERENCIA AJUSTE</li>
            </ul>
            <p style="margin-top: 10px;">Artículos con métodos prohibidos:</p>
            <p style="color: #dc3545; font-size: 12px;"><em>${listaArticulos}</em></p>
          `,
          footer: `Total de artículos afectados: ${validacion.items.length}`
        });
        return false;
      }
    }
    else if (this.tipoDoc == "NC" || this.tipoDoc == "ND" || this.tipoDoc == "NV") {
      if (!this.numerocomprobante) {
        missingFields.push('Número de comprobante');
      }
      if (!this.vendedoresV) {
        missingFields.push('Vendedor');
      }

      // ✅ VALIDACIÓN CAPA 2: Verificar que NO se use EFECTIVO/TRANSFERENCIA AJUSTE (solo para NC y ND)
      if (this.tipoDoc == "NC" || this.tipoDoc == "ND") {
        const validacion = this.validarMetodosPagoFactura();

        if (validacion.items.length > 0) {
          const listaArticulos = validacion.items
            .map(item => `"${item.nomart}"`)
            .join(', ');

          const tipoDocNombre = this.tipoDoc == "NC" ? "Notas de Crédito" : "Notas de Débito";

          Swal.fire({
            icon: 'error',
            title: `Error de Validación - ${tipoDocNombre}`,
            html: `
              <p>Las ${tipoDocNombre.toLowerCase()} <strong>NO pueden</strong> tener artículos con los siguientes métodos de pago:</p>
              <ul style="text-align: left; margin: 10px 0;">
                <li>EFECTIVO AJUSTE</li>
                <li>TRANSFERENCIA AJUSTE</li>
              </ul>
              <p style="margin-top: 10px;">Artículos con métodos prohibidos:</p>
              <p style="color: #dc3545; font-size: 12px;"><em>${listaArticulos}</em></p>
            `,
            footer: `Total de artículos afectados: ${validacion.items.length}`
          });
          return false;
        }
      }
    }
    else if (this.tipoDoc == "PR" || this.tipoDoc == "CS") {
      if (!this.vendedoresV) {
        missingFields.push('Vendedor');
      }

      // ✅ VALIDACIÓN CAPA 2: Verificar métodos de pago para presupuestos
      if (this.tipoDoc == "PR") {
        const validacion = this.validarMetodosPagoPresupuesto();

        if (validacion.items.length > 0) {
          const listaArticulos = validacion.items
            .map(item => `"${item.nomart}"`)
            .join(', ');

          Swal.fire({
            icon: 'error',
            title: 'Error de Validación - Presupuestos',
            html: `
              <p>Los presupuestos <strong>SOLO</strong> pueden tener artículos con los siguientes métodos de pago:</p>
              <ul style="text-align: left; margin: 10px 0;">
                <li>EFECTIVO AJUSTE</li>
                <li>TRANSFERENCIA AJUSTE</li>
                <li>CUENTA CORRIENTE</li>
              </ul>
              <p style="margin-top: 10px;">Artículos con métodos no permitidos:</p>
              <p style="color: #dc3545; font-size: 12px;"><em>${listaArticulos}</em></p>
            `,
            footer: `Total de artículos afectados: ${validacion.items.length}`
          });
          return false;
        }
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
    // Resto del código...
  }
  //-----------------------------------
  imprimir(
    items: any,
    numerocomprobante: string,
    fecha: any,
    total: any,
    subtotalesTipoPago?: Array<{tipoPago: string, subtotal: number}>,
    descuentoGlobalPayload?: any
  ) {
    //let cliente = JSON.parse(sessionStorage.getItem('datoscliente'));
let cliente: Cliente;

try {
  const datosCliente = sessionStorage.getItem('datoscliente');
  if (datosCliente) {
    cliente = JSON.parse(datosCliente);
  } else {
    cliente = {
      nombre: '',
      direccion: '',
      dni: '',
      cuit: '',
      tipoiva: ''
    };
  }
} catch (error) {
 this.showNotification('Error al leer cliente'); // console.error('Error parsing datoscliente from sessionStorage', error);
  cliente = {
    nombre: '',
    direccion: '',
    dni: '',
    cuit: '',
    tipoiva: ''
  };
}

    // ✅ NUEVO: Validar si se proporcionaron subtotales
    const mostrarDesgloseTipoPago = subtotalesTipoPago && subtotalesTipoPago.length > 0;
    console.log('🎯 Desglose por tipo de pago:', mostrarDesgloseTipoPago ? 'SÍ' : 'NO', subtotalesTipoPago);

    let titulo: string = "";
    if (this.tipoDoc == "FC") {
      titulo = "FACTURA";
    }
    else if (this.tipoDoc == "NC") {
      titulo = "NOTA DE CREDITO";
    }
    else if (this.tipoDoc == "NV") {
      titulo = "DEVOLUCION";
    }
    else if (this.tipoDoc == "ND") {
      titulo = "NOTA DE DEBITO";
    }
    else if (this.tipoDoc == "PR") {
      titulo = "PRESUPUESTO";
    }
    else if (this.tipoDoc == "CS") {
      titulo = "CONSULTA";
    }
    let fechaActual = new Date();
    let fechaFormateada = fechaActual.toISOString().split('T')[0];
    console.log(fechaFormateada);
    const tableBody = items.map(item => [item.cantidad, item.nomart, parseFloat(item.precio.toFixed(2)), parseFloat((item.cantidad * item.precio).toFixed(2))]);
    
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
            fillColor: 'transparent', // Color de relleno transparente
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
                { canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 100, r: 3, lineWidth: 2, lineColor: '#000000' }], text: this.letraValue + '\n', style: { fontSize: 40 }, margin: [10, 5, 0, 0] },//{ text: this.letraValue + '\n', style: { border: '2px solid black', fontSize: 60 }  }, // Asegúrate de que 'this.letra' represente la letra seleccionada en el campo 'letra'
                { text: 'DOCUMENTO\n' },
                { text: 'NO VALIDO\n' },
                { text: 'COMO FACTURA' }
              ],
              alignment: 'center',
              fontSize: 12,
            },
            {
              text: [
                { text: titulo + '\n' },
                { text: 'N° 0000 -' + numerocomprobante + '\n', alignment: 'right' },
                { text: 'Punto de venta: ' + this.puntoventa + '\n' },
              ],
              alignment: 'right',
              fontSize: 10,
            },
          ],
        },
        {
          text: 'Fecha: ' + fecha,
          alignment: 'right',
          margin: [25, 0, 5, 30],
          fontSize: 10,
        },
        //separador 
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
                { text: 'Sres: ' + cliente.nombre + '\n' },
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
        // ... Aquí puedes seguir añadiendo más elementos al documento ...
        {
          style: 'tableExample',
          table: {
            widths: ['10%', '60%', '15%', '15%'],
            body: [
              ['Cant./Lts.', 'DETALLE', 'P.Unitario', 'Total'],
              ...tableBody,
            ],
            bold: true,
          },
        },
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
                item.tipoPago.length > 50 ? item.tipoPago.substring(0, 47) + '...' : item.tipoPago,
                '$' + item.subtotal.toFixed(2)
              ])
            ],
            bold: false,
          },
          margin: [0, 0, 0, 10]
        }] : []),
        ...(descuentoGlobalPayload && Number(descuentoGlobalPayload.descuento_monto) > 0 ? [{
          style: 'tableExample',
          table: {
            widths: ['70%', '30%'],
            body: [
              ['Subtotal bruto', '$' + Number(descuentoGlobalPayload.subtotal_bruto).toFixed(2)],
              ['Descuento global', '$' + Number(descuentoGlobalPayload.descuento_monto).toFixed(2)],
              ['Total neto', '$' + Number(descuentoGlobalPayload.total_neto).toFixed(2)]
            ],
            bold: false,
          },
          margin: [0, 0, 0, 10]
        }] : []),
        // Tabla de TOTAL
        {
          style: 'tableExample',
          table: {
            widths: ['*'],
            body: [
              ['TOTAL $' + parseFloat(total.toFixed(2))],
              // ... Añade más filas según sea necesario ...
            ],
            bold: true,
            fontSize: 16,
          },
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
    // cerrar el loading 
    Swal.close();
    // Crear el PDF
    pdfMake.createPdf(documentDefinition).download(this.sucursalNombre + '_' + titulo + '_' + fechaFormateada + '.pdf');
    pdfMake.createPdf(documentDefinition).getBlob((blob) => {
      this.bot.sendToTelegram(blob, this.sucursalNombre + '_' + this.numerocomprobanteImpresion + '_' + titulo + '_' + fechaFormateada + '.pdf');
    }, (error: any) => {
      console.error(error);
    });
  }

  showNotification(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Aceptar'
    });
  }
  
  // ====================================================================
  // SOLUCIÓN MÚLTIPLES CAJAS: Crear un movimiento por cada método de pago
  // ====================================================================

  /**
   * Crea múltiples movimientos de caja, uno por cada método de pago
   * @param pedido Array de productos del pedido
   * @param cabecera Datos de la cabecera
   * @param fecha Fecha del pedido
   * @param subtotales Array de subtotales por tipo de pago
   * @returns Promise<Array> Array de objetos caja_movi
   */
  crearCajasMovi(pedido: any, cabecera: any, fecha: Date, subtotales: any[]): Promise<any[]> {
    // Validaciones
    if (!pedido || pedido.length === 0) {
      return Promise.resolve([]);
    }

    if (!subtotales || subtotales.length === 0) {
      console.warn('⚠️ No hay subtotales, creando movimiento único con comportamiento legacy');
      return this.crearCajaMoviLegacy(pedido, cabecera, fecha);
    }

    console.log(`🔧 Creando ${subtotales.length} movimientos de caja (uno por método de pago)`);

    // Tomamos el primer item del pedido para datos comunes
    const primerItem = pedido[0];

    // Asegurarse de que fecha sea un objeto Date válido
    const fechaObj = fecha instanceof Date ? fecha : new Date();
    const fechaFormateada = fechaObj.toISOString().split('T')[0];

    // Función auxiliar para limitar valores numéricos
    const limitNumericValue = (value: any, limit: number) => {
      if (value === null || value === undefined || value === '') return null;
      const numValue = parseInt(value);
      return !isNaN(numValue) ? Math.min(numValue, limit) : null;
    };

    // ✅ FIX: Determinar si es egreso (NC o NV) para usar idcp_egreso en lugar de idcp_ingreso
    const esEgreso = this.tipoDoc === 'NC' || this.tipoDoc === 'NV';
    console.log(`📋 Tipo de documento: ${this.tipoDoc} - Es egreso: ${esEgreso}`);

    // Crear promesas para cada movimiento
    const promesas = subtotales.map((subtotal, index) => {
      // Buscar información de la tarjeta para este método de pago
      const tarjetaInfo = this.tarjetas.find(t => t.tarjeta === subtotal.tipoPago);

      if (!tarjetaInfo) {
        console.error(`❌ No se encontró tarjeta para: ${subtotal.tipoPago}`);
        return Promise.resolve(null);
      }
      const itemMetodo = pedido.find(item => String(item.cod_tar) === String(tarjetaInfo.cod_tarj)) || primerItem;

      // ✅ FIX: Usar idcp_egreso para NC/NV, idcp_ingreso para el resto
      const idConcepto = esEgreso ? tarjetaInfo.idcp_egreso : tarjetaInfo.idcp_ingreso;
      console.log(`🔍 Método ${index + 1}/${subtotales.length}: ${subtotal.tipoPago} - $${subtotal.subtotal} (concepto: ${idConcepto}, egreso: ${esEgreso})`);

      // Obtener id_caja para este método de pago
      return this._cargardata.getIdCajaFromConcepto(idConcepto)
        .pipe(take(1))
        .toPromise()
        .then((response: any) => {
          if (response && response.mensaje && response.mensaje.length > 0) {
            const idCaja = response.mensaje[0].id_caja;

            console.log(`✅ Caja obtenida: ID ${idCaja} para ${subtotal.tipoPago} (concepto: ${idConcepto})`);

            // Crear el movimiento para este método de pago
            return {
              sucursal: limitNumericValue(this.sucursal, 999999),
              codigo_mov: limitNumericValue(idConcepto, 9999999999),
              num_operacion: 0, // Se asignará en el backend
              fecha_mov: fechaFormateada,
              importe_mov: esEgreso ? -Math.abs(subtotal.subtotal) : subtotal.subtotal, // ✅ Negativo para NC/NV (egresos)
              descripcion_mov: '', // Se generará automáticamente en el backend
              fecha_emibco: itemMetodo.fechacheque || null,
              banco: limitNumericValue(itemMetodo.codigobanco || itemMetodo.banco, 9999999999),
              num_cheque: limitNumericValue(itemMetodo.ncheque, 9999999999),
              cuenta_mov: limitNumericValue(itemMetodo.ncuenta, 999999),
              cliente: limitNumericValue(itemMetodo.idcli || cabecera.cliente, 9999999999),
              proveedor: null,
              plaza_cheque: itemMetodo.plaza || '',
              codigo_mbco: null,
              desc_bancaria: null,
              filler: null,
              fecha_cobro_bco: null,
              fecha_vto_bco: null,
              tipo_movi: 'A',
              caja: idCaja, // ✅ Caja específica de este método de pago
              letra: cabecera.letra || '',
              punto_venta: limitNumericValue(this.puntoventa, 9999),
              tipo_comprobante: primerItem.tipodoc || this.tipoDoc,
              numero_comprobante: limitNumericValue(this.numerocomprobante, 99999999),
              marca_cerrado: null,
              usuario: itemMetodo.emailop || sessionStorage.getItem('emailOp') || '',
              fecha_proceso: fechaFormateada
            };
          } else {
            console.error(`❌ No se pudo obtener id_caja para ${subtotal.tipoPago} (concepto: ${idConcepto})`);
            return null;
          }
        })
        .catch(error => {
          console.error(`❌ Error al obtener id_caja para ${subtotal.tipoPago}:`, error);
          return null;
        });
    });

    // Esperar todas las promesas y filtrar nulls
    return Promise.all(promesas).then(movimientos => {
      const movimientosValidos = movimientos.filter(m => m !== null);

      console.log(`✅ ${movimientosValidos.length} movimientos creados exitosamente`);

      if (movimientosValidos.length === 0) {
        console.error('❌ No se pudo crear ningún movimiento de caja');
      }

      return movimientosValidos;
    });
  }

  /**
   * Método legacy para compatibilidad hacia atrás (movimiento único)
   * Se usa cuando no hay subtotales o para ventas con un solo método de pago
   */
  crearCajaMoviLegacy(pedido: any, cabecera: any, fecha: Date): Promise<any[]> {
    const primerItem = pedido[0];
    let tarjetaInfo: any = null;

    if (primerItem.cod_tar) {
      tarjetaInfo = this.tarjetas.find(t => t.cod_tarj.toString() === primerItem.cod_tar.toString());
    }

    const fechaObj = fecha instanceof Date ? fecha : new Date();
    const fechaFormateada = fechaObj.toISOString().split('T')[0];

    const limitNumericValue = (value: any, limit: number) => {
      if (value === null || value === undefined || value === '') return null;
      const numValue = parseInt(value);
      return !isNaN(numValue) ? Math.min(numValue, limit) : null;
    };

    // ✅ FIX: Determinar si es egreso (NC o NV) para usar idcp_egreso en lugar de idcp_ingreso
    const esEgreso = this.tipoDoc === 'NC' || this.tipoDoc === 'NV';
    const idConcepto = tarjetaInfo ? (esEgreso ? tarjetaInfo.idcp_egreso : tarjetaInfo.idcp_ingreso) : null;
    console.log(`📋 [Legacy] Tipo de documento: ${this.tipoDoc} - Es egreso: ${esEgreso} - Concepto: ${idConcepto}`);

    const obtenerIdCaja = new Promise<number | null>((resolve) => {
      if (tarjetaInfo && idConcepto) {
        this._cargardata.getIdCajaFromConcepto(idConcepto).pipe(take(1)).subscribe(
          (response: any) => {
            if (response && response.mensaje && response.mensaje.length > 0) {
              resolve(response.mensaje[0].id_caja);
            } else {
              console.error('No se pudo obtener el id_caja');
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
        codigo_mov: idConcepto ? limitNumericValue(idConcepto, 9999999999) : null,
        num_operacion: 0,
        fecha_mov: fechaFormateada,
        importe_mov: esEgreso ? -Math.abs(this.tieneDescuentoGlobalActivo() ? this.totalNeto : this.suma) : (this.tieneDescuentoGlobalActivo() ? this.totalNeto : this.suma), // ✅ Negativo para NC/NV (egresos)
        descripcion_mov: '',
        fecha_emibco: primerItem.fechacheque || null,
        banco: limitNumericValue(primerItem.codigobanco, 9999999999),
        num_cheque: limitNumericValue(primerItem.ncheque, 9999999999),
        cuenta_mov: limitNumericValue(primerItem.ncuenta, 999999),
        cliente: limitNumericValue(primerItem.idcli || cabecera.cliente, 9999999999),
        proveedor: null,
        plaza_cheque: primerItem.plaza || '',
        codigo_mbco: null,
        desc_bancaria: null,
        filler: null,
        fecha_cobro_bco: null,
        fecha_vto_bco: null,
        tipo_movi: 'A',
        caja: idCajaObtenido,
        letra: cabecera.letra || '',
        punto_venta: limitNumericValue(this.puntoventa, 9999),
        tipo_comprobante: primerItem.tipodoc || this.tipoDoc,
        numero_comprobante: limitNumericValue(this.numerocomprobante, 99999999),
        marca_cerrado: null,
        usuario: primerItem.emailop || sessionStorage.getItem('emailOp') || '',
        fecha_proceso: fechaFormateada
      };

      // Retornar como array para mantener consistencia con crearCajasMovi
      return [cajaMovi];
    });
  }

  // ════════════════════════════════════════════════════════════
  // ✅ NUEVO v4.0: MÉTODOS PARA MODO CONSULTA
  // ════════════════════════════════════════════════════════════

  /**
   * Maneja el cambio de tipo de pago en el carrito
   * Implementa lógica de "Modo Consulta" para cambios entre activadatos diferentes
   */
  onTipoPagoChange(item: any, event: any): void {
    const nuevoCodTar = event.value;
    const itemKey = this.generarKeyUnica(item);

    // ✅ FIX v3: Usar ÍNDICE en lugar de búsqueda por id_articulo
    // Esto garantiza unicidad incluso con múltiples items del mismo producto
    // itemsConTipoPago e itemsEnCarrito tienen el mismo orden (generado con spread)
    const itemIndex = this.itemsConTipoPago.indexOf(item);
    const itemOriginal = this.itemsEnCarrito[itemIndex];

    if (!itemOriginal) {
      console.error('❌ ERROR: No se encontró item en itemsEnCarrito con índice:', itemIndex);
      return;
    }

    // ════════════════════════════════════════════════════════════
    // ✅ FIX v4.1: Determinar tipo de referencia correcto
    // Si el item YA está en consulta, debemos comparar con el ORIGINAL
    // Si NO está en consulta, comparamos con el ACTUAL (comportamiento normal)
    // Fecha: 2025-10-28
    // Razón: Bug reportado - botón Revertir pierde tipo original
    // ════════════════════════════════════════════════════════════
    const codTarParaComparar = item._soloConsulta
      ? item._tipoPagoOriginal
      : itemOriginal.cod_tar;

    const tipoPagoParaComparar = item._soloConsulta
      ? item._nombreTipoPagoOriginal
      : itemOriginal.tipoPago;

    const precioParaComparar = item._soloConsulta
      ? item._precioOriginal
      : itemOriginal.precio;

    console.log('\n🔄 ════════════════════════════════════════════════════');
    console.log('📝 CAMBIO DE TIPO DE PAGO EN CARRITO');
    console.log('🔄 ════════════════════════════════════════════════════');
    console.log('Item:', item.nomart);
    console.log(`🔍 Comparando con tipo de pago: ${item._soloConsulta ? 'ORIGINAL' : 'ANTERIOR'}`);
    console.log(`   Tipo: ${tipoPagoParaComparar} (cod_tar: ${codTarParaComparar})`);
    console.log(`   Precio: $${precioParaComparar}`);
    console.log('cod_tar nuevo:', nuevoCodTar);

    // Validar que el item no esté bloqueado
    if (item._locked) {
      this.mostrarAlertaItemBloqueado(item);
      this.revertirCambio(item, itemKey);
      return;
    }

    // Buscar información de la tarjeta nueva
    const tarjetaSeleccionada = this.tarjetas.find(t => t.cod_tarj == nuevoCodTar);
    if (!tarjetaSeleccionada) {
      console.error('❌ Tarjeta no encontrada:', nuevoCodTar);
      this.revertirCambio(item, itemKey);
      return;
    }

    // ════════════════════════════════════════════════════════════
    // ✅ VALIDACIÓN: Detectar cambio entre tipos de pago diferentes
    // Fecha: 2025-10-28
    // Fix: Detectar por lista de precios, no solo por activadatos
    // Razón: EFECTIVO y CUENTA CORRIENTE tienen activadatos=0 pero
    //        diferentes listas (0 vs 1), causando cambio de precio
    //        sin alerta al usuario
    // Mejoras aplicadas:
    //   - Mejora #2: Lógica de "razon" completa (muestra ambas razones)
    //   - Mejora #3: Validación de tarjetaAnterior con warning
    // ════════════════════════════════════════════════════════════

    // ✅ FIX v4.1: Buscar tarjeta usando el cod_tar correcto (original o anterior)
    const tarjetaParaComparar = this.tarjetas.find(t =>
      t.cod_tarj.toString() === codTarParaComparar.toString()
    );

    // ✅ Validar si la tarjeta de referencia existe
    if (!tarjetaParaComparar) {
      console.warn(`⚠️ Tarjeta para comparar no encontrada: ${codTarParaComparar}`);
      console.warn(`   Item en consulta: ${item._soloConsulta ? 'SÍ' : 'NO'}`);
      console.warn('   Usando valores por defecto para comparación');
    }

    // Obtener lista de precios de referencia y nueva
    const listaPrecioParaComparar = tarjetaParaComparar
      ? Number(tarjetaParaComparar.listaprecio)
      : 0;
    const listaPrecioNueva = Number(tarjetaSeleccionada.listaprecio) || 0;

    // Obtener activadatos de referencia y nuevo
    const activadatosParaComparar = tarjetaParaComparar
      ? (tarjetaParaComparar.activadatos || 0)
      : 0;
    const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;

    console.log(`🔍 Comparación de cambio:`);
    console.log(`   Comparando con: ${item._soloConsulta ? 'ORIGINAL' : 'ANTERIOR'}`);
    console.log(`   Lista precio: ${listaPrecioParaComparar} → ${listaPrecioNueva}`);
    console.log(`   Activadatos: ${activadatosParaComparar} → ${activadatosNuevo}`);
    console.log(`   cod_tar: ${codTarParaComparar} → ${nuevoCodTar}`);

    // ✅ FIX v4.1: CRITERIO 1 - Cambio de activadatos (comparar con referencia correcta)
    const cambioActivadatos = activadatosParaComparar !== activadatosNuevo;

    // ✅ FIX v4.1: CRITERIO 2 - Cambio de lista de precios (comparar con referencia correcta)
    const cambioListaPrecios = listaPrecioParaComparar !== listaPrecioNueva;

    // ════════════════════════════════════════════════════════════
    // ✅ FIX v4.2: CRITERIO 3 - Cambio de código de tarjeta
    // Fecha: 2025-10-29
    // Razón: Detectar cambios entre tipos de pago con mismo listaprecio/activadatos
    //        Ejemplos problemáticos sin este criterio:
    //        - NARANJA 1 PAGO (cod_tar=2) vs ELECTRON (cod_tar=1)
    //          Ambos: listaprecio=2, activadatos=1
    //        - EFECTIVO (cod_tar=11) vs EFECTIVO AJUSTE (cod_tar=112)
    //          Ambos: listaprecio=0, activadatos=0
    //        - CUENTA CORRIENTE (111) vs TRANSFERENCIA EFECTIVO (1111)
    //          Ambos: listaprecio=1, activadatos=0
    //        Total: 29 tipos de pago que pueden cambiar sin ser detectados
    //               23 tarjetas + 3 efectivo/transferencias + 3 cuenta corriente
    // Solución: Comparar directamente el código de tarjeta (cod_tar)
    // ════════════════════════════════════════════════════════════
    const cambioCodigoTarjeta = codTarParaComparar.toString() !== nuevoCodTar.toString();

    // ════════════════════════════════════════════════════════════
    // ✅ FIX v4.2: Lógica mejorada de marcado/desmarcado
    // Ahora detecta CUALQUIER cambio de tipo de pago, no solo por lista/activadatos
    // Distinguir entre marcar por primera vez vs mantener estado
    // ════════════════════════════════════════════════════════════
    if (cambioActivadatos || cambioListaPrecios || cambioCodigoTarjeta) {
      // Hay diferencia entre el tipo de referencia y el nuevo tipo

      if (item._soloConsulta) {
        // Ya está marcado como consulta
        // Solo mantenemos el estado, NO sobrescribimos los datos originales
        const razones = [];
        if (cambioActivadatos) razones.push('cambio de activadatos');
        if (cambioListaPrecios) razones.push('cambio de lista de precios');
        if (cambioCodigoTarjeta && !cambioActivadatos && !cambioListaPrecios) {
          razones.push('cambio de tipo de pago (mismo listaprecio/activadatos)');
        }
        const razon = razones.join(' y ');

        console.log(`⚠️ Item ya en consulta, manteniendo datos originales`);
        console.log(`   Razón del cambio: ${razon}`);
        console.log(`   Original: ${tipoPagoParaComparar} (${codTarParaComparar}) - $${precioParaComparar}`);
        console.log(`   Nuevo: ${tarjetaSeleccionada.tarjeta} (${nuevoCodTar})`);

        // NO llamar a marcarComoSoloConsulta porque NO queremos sobrescribir
        // El item._soloConsulta ya es true y los datos originales están guardados

      } else {
        // Primera vez que se marca como consulta
        const razones = [];
        if (cambioActivadatos) razones.push('cambio de activadatos');
        if (cambioListaPrecios) razones.push('cambio de lista de precios');
        if (cambioCodigoTarjeta && !cambioActivadatos && !cambioListaPrecios) {
          razones.push('cambio de tipo de pago (mismo listaprecio/activadatos)');
        }
        const razon = razones.join(' y ');

        console.log(`⚠️ Marcando como consulta por primera vez`);
        console.log(`   Razón: ${razon}`);
        if (cambioListaPrecios) {
          console.log(`   Precio cambiará de lista ${listaPrecioParaComparar} → ${listaPrecioNueva}`);
        }

        // Guardar el tipo ACTUAL REAL (antes de este cambio) como original
        const codTarActualReal = itemOriginal.cod_tar;
        const tipoPagoActualReal = itemOriginal.tipoPago;
        const precioActualReal = itemOriginal.precio;

        console.log(`💾 Guardando como original: ${tipoPagoActualReal} (${codTarActualReal}) - $${precioActualReal}`);

        this.marcarComoSoloConsulta(
          item,
          tarjetaSeleccionada,
          codTarActualReal,
          tipoPagoActualReal,
          precioActualReal
        );
      }

    } else {
      // NO hay diferencia → el usuario volvió al tipo de referencia
      console.log(`✅ Sin diferencias detectadas → ${item._soloConsulta ? 'Volvió al tipo ORIGINAL' : 'Sin cambios'}`);
      console.log(`   Quitando marca de consulta`);
      this.quitarMarcaSoloConsulta(item);
    }

    // ════════════════════════════════════════════════════════════
    // CÁLCULO DE PRECIO NUEVO
    // ════════════════════════════════════════════════════════════

    const tipoMonedaItem = item.tipo_moneda || 3; // Default ARS
    // Nota: listaPrecioNueva ya fue declarada arriba en la sección de validación

    let precioNuevo: number;

    // Seleccionar precio según lista
    switch (listaPrecioNueva) {
      case 0: precioNuevo = item.precon || 0; break;
      case 1: precioNuevo = item.prefi1 || 0; break;
      case 2: precioNuevo = item.prefi2 || 0; break;
      case 3: precioNuevo = item.prefi3 || 0; break;
      case 4: precioNuevo = item.prefi4 || 0; break;
      default:
        console.warn(`⚠️ listaprecio desconocido: ${listaPrecioNueva}, usando precio actual`);
        precioNuevo = item.precio;
    }

    console.log(`💰 Precio base seleccionado (lista ${listaPrecioNueva}): $${precioNuevo}`);

    // Convertir moneda si es necesario
    if (tipoMonedaItem === 2) { // USD
      precioNuevo = this.convertirUsdAMonedaVenta(precioNuevo);
      console.log(`💱 Precio convertido USD→ARS: $${precioNuevo}`);
    }

    // Aplicar descuento si existe
    if (item.descuento && item.descuento > 0) {
      const precioConDescuento = precioNuevo - (precioNuevo * item.descuento / 100);
      console.log(`🎯 Aplicando descuento ${item.descuento}%: $${precioNuevo} → $${precioConDescuento}`);
      precioNuevo = precioConDescuento;
    }

    // ════════════════════════════════════════════════════════════
    // ACTUALIZAR ITEM
    // ════════════════════════════════════════════════════════════

    // ✅ FIX: Asegurar que cod_tar siempre sea string para mantener consistencia
    item.cod_tar = String(nuevoCodTar);
    item.tipoPago = tarjetaSeleccionada.tarjeta;
    item.precio = parseFloat(precioNuevo.toFixed(2));

    console.log('✅ Item actualizado:', {
      nomart: item.nomart,
      cod_tar: item.cod_tar,
      tipoPago: item.tipoPago,
      precio: item.precio,
      soloConsulta: item._soloConsulta || false
    });

    // ✅ FIX v3: Usar itemOriginal que ya tenemos (mismo índice)
    // No necesitamos buscar nuevamente, ya lo tenemos desde línea 2090
    itemOriginal.cod_tar = item.cod_tar;
    itemOriginal.tipoPago = item.tipoPago;
    itemOriginal.precio = item.precio;
    itemOriginal._soloConsulta = item._soloConsulta;
    itemOriginal._tipoPagoOriginal = item._tipoPagoOriginal;
    itemOriginal._precioOriginal = item._precioOriginal;
    itemOriginal._activadatosOriginal = item._activadatosOriginal;
    itemOriginal._nombreTipoPagoOriginal = item._nombreTipoPagoOriginal;

    console.log('✅ itemsEnCarrito actualizado correctamente (índice:', itemIndex, '):', {
      _soloConsulta: itemOriginal._soloConsulta,
      cod_tar: itemOriginal.cod_tar,
      precio: itemOriginal.precio
    });

    // Recalcular totales y actualizar sessionStorage
    this.calculoTotal();
    this.calcularTotalesTemporales();  // ← NUEVO: Calcular totales temporales
    this.actualizarSessionStorage();

    console.log('🔄 ════════════════════════════════════════════════════\n');
  }

  /**
   * Marca un item como "solo consulta" y guarda sus datos originales
   */
  private marcarComoSoloConsulta(item: any, tarjetaNueva: any, codTarOriginal: any, tipoPagoOriginal: string, precioOriginal: number): void {
    console.log('⚠️ Marcando item como SOLO CONSULTA:', item.nomart);

    // Si ya estaba marcado, no guardar datos originales nuevamente
    if (!item._soloConsulta) {
      // ✅ Usar los valores pasados como parámetros (capturados ANTES del cambio)
      item._tipoPagoOriginal = codTarOriginal;
      item._precioOriginal = precioOriginal;
      item._activadatosOriginal = this.obtenerActivadatosDelItem(item);
      item._nombreTipoPagoOriginal = tipoPagoOriginal;
      console.log('💾 Datos originales guardados:', {
        cod_tar_original: item._tipoPagoOriginal,
        tipo: item._nombreTipoPagoOriginal,
        precio: item._precioOriginal,
        activadatos: item._activadatosOriginal
      });
    }

    item._soloConsulta = true;

    // Mostrar alerta informativa
    Swal.fire({
      icon: 'info',
      title: 'Precio de consulta',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          <p>✅ El precio se ha actualizado a <strong>modo consulta</strong>.</p>
          <hr>
          <p><strong>Artículo:</strong> ${item.nomart}</p>
          <p><strong>Método original:</strong> ${item._nombreTipoPagoOriginal} - $${item._precioOriginal?.toFixed(2)}</p>
          <p><strong>Método de consulta:</strong> ${tarjetaNueva.tarjeta} - $${item.precio?.toFixed(2)}</p>
          <hr>
          <p>⚠️ <strong>Importante:</strong></p>
          <ul>
            <li>Este precio es <strong>solo para mostrar al cliente</strong></li>
            <li><strong>NO podrá finalizar la venta</strong> con este item en consulta</li>
          </ul>
          <hr>
          <p><strong>Para realizar la venta:</strong></p>
          <ol>
            <li>Haga clic en "Revertir" para volver al método original, o</li>
            <li>Elimine el item y vuelva a agregarlo con el método de pago correcto</li>
          </ol>
        </div>
      `,
      confirmButtonText: 'Entendido',
      width: 650,
      timer: 10000,
      timerProgressBar: true
    });
  }

  /**
   * Quita la marca de "solo consulta" si el cambio es dentro del mismo activadatos
   */
  private quitarMarcaSoloConsulta(item: any): void {
    if (item._soloConsulta) {
      console.log('✅ Quitando marca de consulta de:', item.nomart);

      // Limpiar flags
      delete item._soloConsulta;
      delete item._tipoPagoOriginal;
      delete item._precioOriginal;
      delete item._activadatosOriginal;
      delete item._nombreTipoPagoOriginal;
    }
  }

  /**
   * Revierte un item a su estado original (antes de marcar como consulta)
   */
  revertirItemAOriginal(item: any): void {
    if (!item._soloConsulta) {
      Swal.fire({
        icon: 'info',
        title: 'Item normal',
        text: 'Este item no está en modo consulta.'
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Revertir a método original?',
      html: `
        <p>¿Desea volver al método de pago original?</p>
        <hr>
        <p><strong>Método original:</strong> ${item._nombreTipoPagoOriginal} - $${item._precioOriginal?.toFixed(2)}</p>
        <p><strong>Método actual:</strong> ${item.tipoPago} - $${item.precio?.toFixed(2)}</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, revertir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then(result => {
      if (result.isConfirmed) {
        console.log('🔄 Revirtiendo item a estado original:', item.nomart);

        // Restaurar valores originales
        const codTarOriginal = item._tipoPagoOriginal;
        const tipoPagoOriginal = item._nombreTipoPagoOriginal;
        const precioOriginal = item._precioOriginal;

        console.log('📝 Restaurando valores:', {
          cod_tar: codTarOriginal,
          tipoPago: tipoPagoOriginal,
          precio: precioOriginal
        });

        // ✅ FIX: Usar ÍNDICE para garantizar unicidad
        const itemIndex = this.itemsConTipoPago.indexOf(item);
        const itemEnCarrito = this.itemsEnCarrito[itemIndex];

        if (itemEnCarrito) {
          // ✅ FIX: Convertir a string para mantener consistencia con normalización
          itemEnCarrito.cod_tar = String(codTarOriginal);
          itemEnCarrito.tipoPago = tipoPagoOriginal;
          itemEnCarrito.precio = precioOriginal;

          // Limpiar flags en itemsEnCarrito
          delete itemEnCarrito._soloConsulta;
          delete itemEnCarrito._tipoPagoOriginal;
          delete itemEnCarrito._precioOriginal;
          delete itemEnCarrito._activadatosOriginal;
          delete itemEnCarrito._nombreTipoPagoOriginal;
        } else {
          console.error('❌ ERROR: No se encontró item en itemsEnCarrito con índice:', itemIndex);
        }

        // ✅ FIX: Regenerar itemsConTipoPago para que Angular detecte los cambios
        // Esto fuerza la actualización del dropdown
        this.actualizarItemsConTipoPago();

        // Recalcular totales y actualizar sessionStorage
        this.calculoTotal();
        this.calcularTotalesTemporales();  // ← NUEVO: Calcular totales temporales
        this.actualizarSessionStorage();

        // ✅ IMPORTANTE: Forzar detección de cambios en Angular
        this.cdr.detectChanges();

        Swal.fire({
          icon: 'success',
          title: 'Revertido',
          text: 'Item restaurado al método de pago original.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  }

  /**
   * Obtiene el activadatos del tipo de pago ACTUAL del item
   * ✅ FIX: SIEMPRE busca en tarjetas usando cod_tar actual
   * NO usa item.activadatos porque ese valor es estático y no cambia con cod_tar
   */
  private obtenerActivadatosDelItem(item: any): number {
    // ✅ SIEMPRE buscar en la lista de tarjetas usando el cod_tar ACTUAL
    const tarjetaActual = this.tarjetas.find(t =>
      t.cod_tarj.toString() === item.cod_tar.toString()
    );

    const activadatos = tarjetaActual ? (tarjetaActual.activadatos || 0) : 0;

    console.log(`🔍 obtenerActivadatosDelItem para ${item.nomart}:`, {
      cod_tar: item.cod_tar,
      tarjeta_encontrada: tarjetaActual?.tarjeta || 'NO ENCONTRADA',
      activadatos: activadatos
    });

    return activadatos;
  }

  /**
   * Convierte un precio de USD a la moneda de venta (probablemente ARS)
   */
  private convertirUsdAMonedaVenta(precioUsd: number): number {
    // Buscar en sessionStorage o en alguna variable global
    const tasaCambio = parseFloat(sessionStorage.getItem('tasaCambioUsd') || '0');

    if (tasaCambio > 0) {
      return precioUsd * tasaCambio;
    }

    // Si no hay tasa, retornar el mismo precio (fallback)
    console.warn('⚠️ No se encontró tasa de cambio USD, usando precio sin convertir');
    return precioUsd;
  }

  /**
   * Actualiza sessionStorage con el estado actual del carrito
   */
  private actualizarSessionStorage(): void {
    try {
      sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
      console.log('💾 SessionStorage actualizado');
    } catch (error) {
      console.error('❌ Error al actualizar sessionStorage:', error);
    }
  }

  /**
   * Genera una clave única para identificar un item
   */
  private generarKeyUnica(item: any): string {
    return `${item.id_articulo}_${item.cod_tar}`;
  }

  /**
   * Revierte un cambio no permitido en el dropdown
   */
  private revertirCambio(item: any, itemKey: string): void {
    console.log('⏪ Revertiendo cambio no permitido');
  }

  /**
   * Muestra alerta cuando se intenta modificar un item bloqueado
   */
  private mostrarAlertaItemBloqueado(item: any): void {
    Swal.fire({
      icon: 'error',
      title: 'Item bloqueado',
      text: 'Este item no puede modificar su tipo de pago.',
      footer: 'Si necesita cambiar el tipo de pago, elimine el item y vuelva a agregarlo.'
    });
  }

  /**
   * Verifica si hay items en modo consulta
   */
  hayItemsSoloConsulta(): boolean {
    return this.itemsEnCarrito.some(item => item._soloConsulta === true);
  }

  /**
   * Cuenta cuántos items están en modo consulta
   */
  contarItemsSoloConsulta(): number {
    return this.itemsEnCarrito.filter(item => item._soloConsulta === true).length;
  }

  /**
   * Valida que no haya items en modo consulta antes de finalizar
   */
  private validarItemsSoloConsulta(): { valido: boolean; items: any[] } {
    const itemsConsulta = this.itemsEnCarrito.filter(item => item._soloConsulta === true);

    return {
      valido: itemsConsulta.length === 0,
      items: itemsConsulta
    };
  }

  // ════════════════════════════════════════════════════════════
  // FIN DE MÉTODOS PARA MODO CONSULTA
  // ════════════════════════════════════════════════════════════

  ngOnDestroy(): void {
    // ✅ Completar el Subject destroy$ para liberar automáticamente todas las subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}
//
