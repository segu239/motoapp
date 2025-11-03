import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { CarritoService } from '../../services/carrito.service';
import { Cliente } from '../../interfaces/cliente';
import { ActivatedRoute, Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { first, take } from 'rxjs/operators'
import Swal from 'sweetalert2';

@Component({
  selector: 'app-puntoventa',
  templateUrl: './puntoventa.component.html',
  styleUrls: ['./puntoventa.component.css']
})
export class PuntoventaComponent implements OnInit {

  public clientes: Cliente[] = [];
  public clienteElejido: Cliente;

  // ============================================
  // PROTECCIÓN: Cliente especial '109' no puede ser editado
  // Fecha: 2025-10-24
  // ============================================
  private readonly CLIENTE_NO_EDITABLE = '109';

  constructor(
    private _cargardata: CargardataService,
    private _router: Router,
    private _carritoService: CarritoService
  ) { }
  ngOnInit(): void {
    let sucursal: string = sessionStorage.getItem('sucursal');
    if (!sucursal) {
      this.showNotification('No se encontró la sucursal, porfavor cierre la sesión y vuelva a iniciar');
      return;
    }
    this._cargardata.clisucx(sucursal).pipe(take(1)).subscribe({
      next: (resp: any) => {
        console.log('Respuesta del servicio:', resp);
        if (resp && Array.isArray(resp.mensaje)) {
          this.clientes = resp.mensaje;
        } else {
          this.clientes = [];
          this.showNotification('No se encontraron clientes o el formato de respuesta no es válido');
        }
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.clientes = [];
        this.showNotification('Error al cargar los clientes');
      }
    });
  }
  selectCliente(cliente) {
    console.log('🔍 Cliente seleccionado:', cliente);

    // Verificar si hay items en el carrito
    const carritoData = sessionStorage.getItem('carrito');
    const itemsCarrito = carritoData ? JSON.parse(carritoData) : [];
    const cantidadItems = itemsCarrito.length;

    console.log(`📊 Items en carrito: ${cantidadItems}`);

    if (cantidadItems > 0) {
      // Si hay items, mostrar confirmación con opción de continuar
      this.confirmarNuevaVentaOContinuar(cliente, cantidadItems);
    } else {
      // Si no hay items, iniciar nueva venta directamente
      console.log('✅ Carrito vacío - Iniciando venta sin confirmación');
      this.iniciarNuevaVenta(cliente);
    }
  }
  editCliente(cliente) {
    console.log('🔧 Intentando editar cliente:', cliente);

    // PROTECCIÓN: No permitir editar cliente especial '109'
    if (cliente.cliente === this.CLIENTE_NO_EDITABLE) {
      Swal.fire({
        icon: 'error',
        title: 'Operación no permitida',
        html: `
          <div style="text-align: left; padding: 0 20px;">
            <p><strong>CONSUMIDOR FINAL</strong> es un cliente genérico del sistema.</p>
            <hr style="margin: 15px 0;">
            <p>🚫 No se permite editar este cliente especial</p>
            <p>💡 Este cliente se usa como placeholder para ventas sin cliente específico</p>
          </div>
        `,
        confirmButtonText: 'Entendido'
      });
      console.log('🚫 Edición bloqueada - Cliente 109 no puede modificarse');
      return;  // ← Abortar navegación
    }

    this._router.navigate(['components/editcliente'], { queryParams: { cliente: JSON.stringify(cliente) } });
  }
  verHistorialVentas(cliente) {
    console.log('Ver historial de ventas para cliente:', cliente);
    this._router.navigate(['components/historialventas2'], { queryParams: { cliente: JSON.stringify(cliente) } });
  }
  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.clientes);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'products');
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
  /**
   * Muestra diálogo con 3 opciones cuando hay items en el carrito
   * - Continuar compra actual
   * - Iniciar nueva venta
   * - Cancelar
   */
  private confirmarNuevaVentaOContinuar(cliente: any, cantidadItems: number): void {
    Swal.fire({
      title: '🛒 Carrito con Productos',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          <p>Actualmente hay <strong style="color: #3085d6;">${cantidadItems} producto(s)</strong> en el carrito.</p>
          <hr style="margin: 15px 0;">
          <p style="font-weight: bold; margin-bottom: 15px;">¿Qué desea hacer?</p>

          <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <p style="margin: 0; color: #1976d2;">
              <i class="fa fa-shopping-cart"></i> <strong>Continuar Compra Actual</strong>
            </p>
            <small style="color: #666;">Ir a Condición de Venta para completar la compra en curso</small>
          </div>

          <div style="background: #fff3e0; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <p style="margin: 0; color: #f57c00;">
              <i class="fa fa-plus-circle"></i> <strong>Iniciar Nueva Venta</strong>
            </p>
            <small style="color: #666;">Limpiar el carrito y comenzar una venta nueva con el cliente seleccionado</small>
          </div>

          <div style="background: #f5f5f5; padding: 12px; border-radius: 8px;">
            <p style="margin: 0; color: #666;">
              <i class="fa fa-times-circle"></i> <strong>Cancelar</strong>
            </p>
            <small style="color: #666;">Permanecer en la página actual sin hacer cambios</small>
          </div>
        </div>
      `,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '<i class="fa fa-shopping-cart"></i> Continuar Compra',
      denyButtonText: '<i class="fa fa-plus-circle"></i> Nueva Venta',
      cancelButtonText: '<i class="fa fa-times"></i> Cancelar',
      confirmButtonColor: '#3085d6',
      denyButtonColor: '#f57c00',
      cancelButtonColor: '#999',
      reverseButtons: true,
      focusConfirm: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Usuario eligió continuar compra actual
        console.log('✅ Usuario eligió continuar compra actual');

        // ✅ CORRECCIÓN CP-006: SIEMPRE guardar el cliente seleccionado en sessionStorage
        // Esto garantiza consistencia con/sin contexto previo
        sessionStorage.setItem('datoscliente', JSON.stringify(cliente));
        console.log('   ✓ Cliente guardado en sessionStorage:', cliente.nombre);

        // Navegar a condicionventa SIEMPRE con queryParams
        this._router.navigate(['components/condicionventa'], {
          queryParams: { cliente: JSON.stringify(cliente) }
        });
        console.log('   ✓ Navegando a condicionventa con queryParams');

      } else if (result.isDenied) {
        // Usuario eligió iniciar nueva venta
        console.log('🆕 Usuario eligió iniciar nueva venta');
        this.iniciarNuevaVenta(cliente);
        Swal.fire({
          icon: 'success',
          title: 'Nueva venta iniciada',
          text: 'El carrito anterior ha sido limpiado',
          timer: 1500,
          showConfirmButton: false
        });

      } else {
        // Usuario canceló
        console.log('❌ Usuario canceló - Permanece en la página actual');
      }
    });
  }

  /**
   * Limpia completamente el estado de la aplicación e inicia una nueva venta
   * Se ejecuta cuando el usuario selecciona un cliente desde puntoventa
   */
  private iniciarNuevaVenta(cliente: any): void {
    console.log('🧹 Iniciando nueva venta - Limpiando todo el estado');

    // 1. Limpiar carrito completamente
    this._carritoService.limpiarCarrito();
    console.log('   ✓ Carrito limpiado');

    // 2. Limpiar datos de condición de venta
    sessionStorage.removeItem('condicionVentaSeleccionada');
    console.log('   ✓ Condición de venta limpiada');

    // 3. Limpiar estado de tabla de condicionventa
    sessionStorage.removeItem('condicionventa_table_state');
    console.log('   ✓ Estado de tabla limpiado');

    // 4. Limpiar datos del cliente anterior
    sessionStorage.removeItem('datoscliente');
    console.log('   ✓ Datos de cliente anterior limpiados');

    console.log('✅ Estado limpiado completamente');

    // Navegar a condición de venta con el nuevo cliente
    this._router.navigate(['components/condicionventa'], {
      queryParams: { cliente: JSON.stringify(cliente) }
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
}
