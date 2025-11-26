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
  selector: 'app-mis-transferencias',
  templateUrl: './mis-transferencias.component.html',
  styleUrls: ['./mis-transferencias.component.css'],
  providers: [MessageService]
})
export class MisTransferenciasComponent implements OnInit {
  @ViewChild('dtable') dtable: Table;

  cols: Column[];
  _selectedColumns: Column[];

  public transferencias: any[] = [];
  public transferenciaSeleccionada: any = null;
  public sucursalActual: number;
  public usuarioActual: string;

  // Modal de cancelación
  public displayModalCancelacion: boolean = false;
  public motivoCancelacion: string = '';

  // Filtros
  public estadosFiltro: any[] = [];
  public estadoSeleccionado: string = 'Todas';

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
      { field: 'sucursald', header: 'Origen' },
      { field: 'sucursalh', header: 'Destino' },
      { field: 'fecha', header: 'Fecha Creación' },
      { field: 'fecha_aceptacion', header: 'F. Aceptación' },
      { field: 'fecha_confirmacion', header: 'F. Confirmación' },
      { field: 'usuario', header: 'Usuario' },
      { field: 'descripcion', header: 'Descripción' },
      { field: 'cantidad', header: 'Cantidad' },
      { field: 'observacion', header: 'Observación' }
    ];
    this._selectedColumns = this.cols;

    // Obtener sucursal y usuario del sessionStorage
    this.sucursalActual = Number(sessionStorage.getItem('sucursal'));
    this.usuarioActual = sessionStorage.getItem('user') || 'admin';

    // Estados para filtro
    this.estadosFiltro = [
      { label: 'Todas', value: 'Todas' },
      { label: 'Solicitado', value: 'Solicitado' },
      { label: 'Ofrecido', value: 'Ofrecido' },
      { label: 'Aceptado', value: 'Aceptado' },
      { label: 'Recibido', value: 'Recibido' },
      { label: 'Rechazado', value: 'Rechazado' },
      { label: 'Cancelado', value: 'Cancelado' }
    ];
  }

  ngOnInit(): void {
    this.cargarMisTransferencias();
  }

  /**
   * Carga las transferencias creadas por MI sucursal
   * (donde MI sucursal es el origen)
   */
  cargarMisTransferencias(): void {
    this.loading = true;

    // Obtener transferencias donde MI sucursal es el ORIGEN (sucursald)
    this._cargardata.obtenerPedidoItemPorSucursal(this.sucursalActual.toString())
      .subscribe({
        next: (response: any) => {
          console.log('Mis transferencias recibidas:', response);

          if (response && response.mensaje) {
            // Filtrar estados de "Altas de Existencias" (NO son transferencias)
            this.transferencias = response.mensaje
              .filter((t: any) => {
                const estado = t.estado?.trim();
                // Excluir ALTA y Cancel-Alta (tienen su propio componente /lista-altas)
                return estado !== 'ALTA' && estado !== 'Cancel-Alta';
              })
              .map((t: any) => ({
                ...t,
                tipo_transferencia_display: this.getTipoDisplay(t),
                estado_display: t.estado?.trim(),
                fecha_aceptacion: t.fecha_aceptacion || null,
                fecha_confirmacion: t.fecha_confirmacion || null,
                usuario_aceptacion: t.usuario_aceptacion || null,
                usuario_confirmacion: t.usuario_confirmacion || null
              }));

            console.log('Transferencias procesadas (sin ALTAs):', this.transferencias);
          } else {
            this.transferencias = [];
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar mis transferencias:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar mis transferencias'
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
    } else {
      return '📦 Transferencia';
    }
  }

  /**
   * Cancela una transferencia en estado Solicitado u Ofrecido
   */
  cancelar(transferencia: any): void {
    const estadoTrim = transferencia.estado?.trim();

    if (estadoTrim !== 'Solicitado' && estadoTrim !== 'Ofrecido') {
      Swal.fire({
        title: 'No se puede cancelar',
        text: `Solo se pueden cancelar transferencias en estado "Solicitado" u "Ofrecido". Estado actual: ${estadoTrim}`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.transferenciaSeleccionada = transferencia;
    this.motivoCancelacion = '';
    this.displayModalCancelacion = true;
  }

  /**
   * Confirma la cancelación con el motivo ingresado
   */
  confirmarCancelacion(): void {
    if (!this.motivoCancelacion || this.motivoCancelacion.trim().length < 10) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'El motivo de cancelación debe tener al menos 10 caracteres'
      });
      return;
    }

    this.loading = true;
    this.displayModalCancelacion = false;

    const fechaCancelacion = new Date();

    this._cargardata.cancelarPedidoStock(
      this.transferenciaSeleccionada.id_num,
      this.usuarioActual,
      this.motivoCancelacion,
      fechaCancelacion
    ).subscribe({
      next: (response: any) => {
        console.log('Transferencia cancelada:', response);

        Swal.fire({
          title: 'Transferencia Cancelada',
          text: response.mensaje,
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Limpiar y recargar
        this.transferenciaSeleccionada = null;
        this.motivoCancelacion = '';
        this.cargarMisTransferencias();
      },
      error: (error) => {
        console.error('Error al cancelar transferencia:', error);

        Swal.fire({
          title: 'Error',
          text: error.error?.mensaje || 'Error al cancelar la transferencia',
          icon: 'error',
          confirmButtonText: 'OK'
        });

        this.loading = false;
      }
    });
  }

  /**
   * Cancela el modal de cancelación
   */
  cancelarModalCancelacion(): void {
    this.displayModalCancelacion = false;
    this.transferenciaSeleccionada = null;
    this.motivoCancelacion = '';
  }

  /**
   * Confirma la recepción de una transferencia PULL en estado Aceptado
   */
  confirmarRecepcion(transferencia: any): void {
    const estadoTrim = transferencia.estado?.trim();

    if (estadoTrim !== 'Aceptado') {
      Swal.fire({
        title: 'No se puede confirmar',
        text: `Solo se pueden confirmar recepciones de transferencias en estado "Aceptado". Estado actual: ${estadoTrim}`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    Swal.fire({
      title: '¿Confirmar recepción?',
      html: `
        <p><strong>Artículo:</strong> ${transferencia.descripcion}</p>
        <p><strong>Cantidad:</strong> ${transferencia.cantidad}</p>
        <p><strong>Origen:</strong> ${this.getNombreSucursal(transferencia.sucursalh)}</p>
        <br>
        <p>⚠️ Esto marcará la transferencia como completada.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: '✅ Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;

        this._cargardata.confirmarRecepcion(
          transferencia.id_num,
          this.usuarioActual
        ).subscribe({
          next: (response: any) => {
            console.log('Recepción confirmada:', response);

            Swal.fire({
              title: '¡Recepción Confirmada!',
              text: response.mensaje,
              icon: 'success',
              confirmButtonText: 'OK'
            });

            this.cargarMisTransferencias();
          },
          error: (error) => {
            console.error('Error al confirmar recepción:', error);

            Swal.fire({
              title: 'Error',
              text: error.error?.mensaje || 'Error al confirmar recepción',
              icon: 'error',
              confirmButtonText: 'OK'
            });

            this.loading = false;
          }
        });
      }
    });
  }

  /**
   * Confirma el envío de una transferencia PUSH en estado Aceptado
   */
  confirmarEnvio(transferencia: any): void {
    const estadoTrim = transferencia.estado?.trim();

    if (estadoTrim !== 'Aceptado') {
      Swal.fire({
        title: 'No se puede confirmar',
        text: `Solo se pueden confirmar envíos de transferencias en estado "Aceptado". Estado actual: ${estadoTrim}`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    Swal.fire({
      title: '¿Confirmar envío?',
      html: `
        <p><strong>Artículo:</strong> ${transferencia.descripcion}</p>
        <p><strong>Cantidad:</strong> ${transferencia.cantidad}</p>
        <p><strong>Destino:</strong> ${this.getNombreSucursal(transferencia.sucursalh)}</p>
        <br>
        <p>⚠️ Esto marcará la transferencia como completada.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: '✅ Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;

        this._cargardata.confirmarEnvio(
          transferencia.id_num,
          this.usuarioActual
        ).subscribe({
          next: (response: any) => {
            console.log('Envío confirmado:', response);

            Swal.fire({
              title: '¡Envío Confirmado!',
              text: response.mensaje,
              icon: 'success',
              confirmButtonText: 'OK'
            });

            this.cargarMisTransferencias();
          },
          error: (error) => {
            console.error('Error al confirmar envío:', error);

            Swal.fire({
              title: 'Error',
              text: error.error?.mensaje || 'Error al confirmar envío',
              icon: 'error',
              confirmButtonText: 'OK'
            });

            this.loading = false;
          }
        });
      }
    });
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
      case 'Aceptado':
        return 'success';
      case 'Recibido':
        return 'primary';
      case 'Rechazado':
        return 'danger';
      case 'Cancelado':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /**
   * Determina si debe mostrar botón de cancelar
   */
  puedeCancel(transferencia: any): boolean {
    const estadoTrim = transferencia.estado?.trim();
    return estadoTrim === 'Solicitado' || estadoTrim === 'Ofrecido';
  }

  /**
   * Determina si debe mostrar botón de confirmar
   */
  puedeConfirmar(transferencia: any): boolean {
    const estadoTrim = transferencia.estado?.trim();
    return estadoTrim === 'Aceptado';
  }

  /**
   * Determina el texto del botón de confirmación según el tipo
   */
  getTextoConfirmacion(transferencia: any): string {
    if (transferencia.tipo_transferencia === 'PULL') {
      return 'Confirmar Recepción';
    } else if (transferencia.tipo_transferencia === 'PUSH') {
      return 'Confirmar Envío';
    } else {
      return 'Confirmar';
    }
  }

  /**
   * Maneja la confirmación según el tipo de transferencia
   */
  confirmar(transferencia: any): void {
    if (transferencia.tipo_transferencia === 'PULL') {
      this.confirmarRecepcion(transferencia);
    } else if (transferencia.tipo_transferencia === 'PUSH') {
      this.confirmarEnvio(transferencia);
    }
  }
}
