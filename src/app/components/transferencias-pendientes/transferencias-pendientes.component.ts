import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { MessageService } from 'primeng/api';
import Swal from 'sweetalert2';
import { formatDate } from '@angular/common';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-transferencias-pendientes',
  templateUrl: './transferencias-pendientes.component.html',
  styleUrls: ['./transferencias-pendientes.component.css'],
  providers: [MessageService]
})
export class TransferenciasPendientesComponent implements OnInit {
  @ViewChild('dtable') dtable: Table;

  cols: Column[];
  _selectedColumns: Column[];

  public transferencias: any[] = [];
  public transferenciaSeleccionada: any = null;
  public sucursalActual: number;
  public usuarioActual: string;

  // Modal de rechazo
  public displayModalRechazo: boolean = false;
  public motivoRechazo: string = '';

  // Loading
  public loading: boolean = false;

  constructor(
    private _cargardata: CargardataService,
    private messageService: MessageService
  ) {
    this.cols = [
      { field: 'id_num', header: 'ID' },
      { field: 'tipo_transferencia', header: 'Tipo' },
      { field: 'estado', header: 'Estado' },
      { field: 'sucursald', header: 'Suc. Origen' },
      { field: 'sucursalh', header: 'Suc. Destino' },
      { field: 'fecha', header: 'Fecha' },
      { field: 'usuario', header: 'Usuario' },
      { field: 'cantidad_items', header: 'Items' },
      { field: 'descripcion', header: 'Descripción' },
      { field: 'cantidad', header: 'Cantidad' },
      { field: 'observacion', header: 'Observación' }
    ];
    this._selectedColumns = this.cols;

    // Obtener sucursal y usuario del sessionStorage
    this.sucursalActual = Number(sessionStorage.getItem('sucursal'));
    this.usuarioActual = sessionStorage.getItem('user') || 'admin';
  }

  ngOnInit(): void {
    this.cargarTransferencias();
  }

  /**
   * Carga las transferencias pendientes de aceptación para MI sucursal
   * (donde MI sucursal es el destino)
   */
  cargarTransferencias(): void {
    this.loading = true;

    // Obtener transferencias donde MI sucursal es el DESTINO (sucursalh)
    this._cargardata.obtenerPedidoItemPorSucursalh(this.sucursalActual.toString())
      .subscribe({
        next: (response: any) => {
          console.log('Transferencias recibidas:', response);

          if (response && response.mensaje) {
            // Filtrar solo las que están pendientes (Solicitado u Ofrecido)
            this.transferencias = response.mensaje.filter((t: any) =>
              t.estado?.trim() === 'Solicitado' || t.estado?.trim() === 'Ofrecido'
            );

            // Agregar información adicional
            this.transferencias = this.transferencias.map(t => ({
              ...t,
              tipo_transferencia_display: this.getTipoDisplay(t),
              estado_display: t.estado?.trim()
            }));

            console.log('Transferencias filtradas:', this.transferencias);
          } else {
            this.transferencias = [];
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar transferencias:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar transferencias pendientes'
          });
          this.loading = false;
        }
      });
  }

  /**
   * Determina el tipo de transferencia para mostrar
   */
  getTipoDisplay(transferencia: any): string {
    if (transferencia.tipo_transferencia === 'PULL') {
      return '🔽 Solicitud';
    } else if (transferencia.tipo_transferencia === 'PUSH') {
      return '🔼 Oferta';
    } else if (transferencia.estado?.trim() === 'Solicitado') {
      return '📥 Solicitud (Legacy)';
    } else {
      return '📦 Transferencia';
    }
  }

  /**
   * Acepta una transferencia pendiente
   * ESTE ES EL MOMENTO EN QUE SE MUEVE EL STOCK
   */
  aceptar(transferencia: any): void {
    const tipoDisplay = this.getTipoDisplay(transferencia);

    Swal.fire({
      title: '¿Aceptar transferencia?',
      html: `
        <p><strong>Tipo:</strong> ${tipoDisplay}</p>
        <p><strong>Artículo:</strong> ${transferencia.descripcion}</p>
        <p><strong>Cantidad:</strong> ${transferencia.cantidad}</p>
        <p><strong>Sucursal Origen:</strong> ${this.getNombreSucursal(transferencia.sucursald)}</p>
        <p><strong>Sucursal Destino:</strong> ${this.getNombreSucursal(transferencia.sucursalh)}</p>
        <br>
        <p class="text-warning">⚠️ Al aceptar, el stock se moverá inmediatamente.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: '✅ Sí, aceptar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.confirmarAceptacion(transferencia);
      }
    });
  }

  /**
   * Confirma la aceptación y llama al backend
   */
  private confirmarAceptacion(transferencia: any): void {
    this.loading = true;

    this._cargardata.aceptarTransferencia(
      transferencia.id_num,
      this.usuarioActual
    ).subscribe({
      next: (response: any) => {
        console.log('Transferencia aceptada:', response);

        Swal.fire({
          title: '¡Transferencia Aceptada!',
          html: `
            <p>${response.mensaje}</p>
            <p><strong>Stock movido correctamente</strong></p>
            <p>Origen: Suc. ${response.sucursal_origen}</p>
            <p>Destino: Suc. ${response.sucursal_destino}</p>
          `,
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Recargar lista
        this.cargarTransferencias();
      },
      error: (error) => {
        console.error('Error al aceptar transferencia:', error);

        Swal.fire({
          title: 'Error',
          text: error.error?.mensaje || 'Error al aceptar la transferencia',
          icon: 'error',
          confirmButtonText: 'OK'
        });

        this.loading = false;
      }
    });
  }

  /**
   * Rechaza una transferencia pendiente
   * NO mueve stock, solo registra el rechazo
   */
  rechazar(transferencia: any): void {
    this.transferenciaSeleccionada = transferencia;
    this.motivoRechazo = '';
    this.displayModalRechazo = true;
  }

  /**
   * Confirma el rechazo con el motivo ingresado
   */
  confirmarRechazo(): void {
    if (!this.motivoRechazo || this.motivoRechazo.trim().length < 5) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'El motivo del rechazo debe tener al menos 5 caracteres'
      });
      return;
    }

    this.loading = true;
    this.displayModalRechazo = false;

    this._cargardata.rechazarTransferencia(
      this.transferenciaSeleccionada.id_num,
      this.usuarioActual,
      this.motivoRechazo
    ).subscribe({
      next: (response: any) => {
        console.log('Transferencia rechazada:', response);

        Swal.fire({
          title: 'Transferencia Rechazada',
          text: response.mensaje,
          icon: 'info',
          confirmButtonText: 'OK'
        });

        // Limpiar y recargar
        this.transferenciaSeleccionada = null;
        this.motivoRechazo = '';
        this.cargarTransferencias();
      },
      error: (error) => {
        console.error('Error al rechazar transferencia:', error);

        Swal.fire({
          title: 'Error',
          text: error.error?.mensaje || 'Error al rechazar la transferencia',
          icon: 'error',
          confirmButtonText: 'OK'
        });

        this.loading = false;
      }
    });
  }

  /**
   * Cancela el modal de rechazo
   */
  cancelarRechazo(): void {
    this.displayModalRechazo = false;
    this.transferenciaSeleccionada = null;
    this.motivoRechazo = '';
  }

  /**
   * Obtiene el nombre de la sucursal
   */
  getNombreSucursal(id: number): string {
    const sucursales: any = {
      1: 'Casa Central',
      2: 'Valle Viejo',
      3: 'Güemes',
      4: 'Depósito',
      5: 'Mayorista'
    };
    return sucursales[id] || `Sucursal ${id}`;
  }

  /**
   * Obtiene la clase CSS según el estado
   */
  getSeverity(estado: string): string {
    const estadoTrim = estado?.trim();
    switch (estadoTrim) {
      case 'Solicitado':
        return 'warning';
      case 'Ofrecido':
        return 'info';
      default:
        return 'secondary';
    }
  }
}
