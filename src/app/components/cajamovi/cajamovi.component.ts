import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../interfaces/user';
import Swal from 'sweetalert2';

// Exportar la interfaz para que pueda ser importada por otros componentes
export interface Cajamovi {
  sucursal: number;
  codigo_mov: number;
  num_operacion: number;
  fecha_mov: Date;
  importe_mov: number;
  descripcion_mov: string;
  fecha_emibco: Date | null;
  banco: number | null;
  num_cheque: number | null;
  cuenta_mov: number | null;
  cliente: number | null;
  proveedor: number | null;
  plaza_cheque: string | null;
  codigo_mbco: number | null;
  desc_bancaria: string | null;
  marca_cerrado: number;
  fecha_cobro_bco: Date | null;
  fecha_vto_bco: Date | null;
  tipo_movi: string;
  caja: number;
  letra: string | null;
  punto_venta: number | null;
  tipo_comprobante: string | null;
  numero_comprobante: number | null;
  fecha_proceso: Date | null;
  id_movimiento: number;
}

@Component({
  selector: 'app-cajamovi',
  templateUrl: './cajamovi.component.html',
  styleUrls: ['./cajamovi.component.css']
})
export class CajamoviComponent {

  public cajamovis: Cajamovi[] = [];
  public loading: boolean = false;
  public currentUser: User | null = null;

  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService,
    private authService: AuthService
  ) {
    this.loadCajamovis();
    this.loadCurrentUser();
  }

  loadCajamovis() {
    this.loading = true;
    this.cargardataService.getCajamovi().subscribe({
      next: (response: any) => {
        this.loading = false;
        if (!response.error) {
          this.cajamovis = response.mensaje;
        } else {
          console.error('Error loading cajamovis:', response.mensaje);
          this.showErrorMessage('Error al cargar los movimientos de caja');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error in API call:', error);
        this.showErrorMessage('Error de conexión al servidor');
      }
    });
  }

  loadCurrentUser() {
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  canEditOrDelete(cajamovi: Cajamovi): boolean {
    if (!this.currentUser) {
      console.log('No hay usuario actual');
      return false;
    }
    
    console.log('Usuario actual:', this.currentUser.nivel);
    
    // Si el usuario es admin o super, puede editar/eliminar cualquier movimiento
    if (this.currentUser.nivel === 'admin' || this.currentUser.nivel === 'super') {
      console.log('Usuario es admin/super, puede editar');
      return true;
    }
    
    // Para otros usuarios, verificar si la fecha es anterior al día actual
    let fechaMovimiento: Date;
    
    if (typeof cajamovi.fecha_mov === 'string') {
      // Si es string en formato YYYY-MM-DD, parsear correctamente para evitar problemas de zona horaria
      const partes = (cajamovi.fecha_mov as string).split('-');
      fechaMovimiento = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    } else {
      fechaMovimiento = new Date(cajamovi.fecha_mov as Date);
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaMovimiento.setHours(0, 0, 0, 0);
    
    console.log('Fecha movimiento corregida:', fechaMovimiento);
    console.log('Fecha hoy:', hoy);
    console.log('Puede editar:', fechaMovimiento >= hoy);
    
    // Solo puede editar/eliminar si la fecha es de hoy o posterior
    return fechaMovimiento >= hoy;
  }

  editCajamovi(cajamovi: Cajamovi) {
    if (!this.canEditOrDelete(cajamovi)) {
      this.showErrorMessage('No tiene permisos para editar movimientos de fechas anteriores al día actual');
      return;
    }
    
    try {
      // Navigate to edit page with cajamovi data
      this.router.navigate(['components/editcajamovi'], {
        queryParams: {
          cajamovi: JSON.stringify(cajamovi)
        }
      });
    } catch (error) {
      console.error('Error navigating to edit:', error);
      this.showErrorMessage('Error al intentar editar el movimiento');
    }
  }

  confirmDelete(cajamovi: Cajamovi) {
    if (!this.canEditOrDelete(cajamovi)) {
      this.showErrorMessage('No tiene permisos para eliminar movimientos de fechas anteriores al día actual');
      return;
    }
    
    // Verificar restricciones de eliminación según tipo_movi
    if (cajamovi.tipo_movi === 'A') {
      this.showErrorMessage('No se pueden eliminar movimientos de tipo "A"');
      return;
    }
    
    if (cajamovi.tipo_movi !== 'M' && cajamovi.tipo_movi !== '') {
      // Si el tipo no es 'M' ni vacío, confirmar si desean eliminarlo
      Swal.fire({
        title: 'Confirmación especial',
        text: `Este movimiento no es de tipo "M". ¿Está seguro que desea eliminar "${cajamovi.descripcion_mov}" (ID: ${cajamovi.id_movimiento})?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.deleteCajamovi(cajamovi);
        }
      });
      return;
    }
    
    // Confirmación normal para tipo 'M'
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el movimiento "${cajamovi.descripcion_mov}" (ID: ${cajamovi.id_movimiento})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteCajamovi(cajamovi);
      }
    });
  }

  deleteCajamovi(cajamovi: Cajamovi) {
    this.loading = true;
    this.subirdataService.eliminarCajamovi(cajamovi.id_movimiento).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El movimiento se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadCajamovis(); // Reload the table after deletion
        } else {
          this.showErrorMessage('El movimiento no se pudo eliminar');
          console.error('Error deleting cajamovi:', response.mensaje);
        }
      },
      error: (error) => {
        this.loading = false;
        this.showErrorMessage('El movimiento no se pudo eliminar');
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    if (this.cajamovis.length === 0) {
      this.showErrorMessage('No hay datos para exportar');
      return;
    }

    try {
      import('xlsx').then((xlsx) => {
        const worksheet = xlsx.utils.json_to_sheet(this.cajamovis);
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, 'cajamovis');
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.showErrorMessage('Error al exportar a Excel');
    }
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  private showErrorMessage(message: string): void {
    Swal.fire({
      title: '¡Error!',
      text: message,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }
}
