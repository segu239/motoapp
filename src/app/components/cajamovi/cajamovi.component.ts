import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../interfaces/user';
import Swal from 'sweetalert2';
import { PrimeNGConfig } from 'primeng/api';

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
  descripcion_concepto?: string; // Campo agregado para la descripción del concepto
  descripcion_caja?: string; // Campo agregado para la descripción de la caja
  fecha_mov_string?: string; // Campo agregado para el filtro de fecha como string
}

@Component({
  selector: 'app-cajamovi',
  templateUrl: './cajamovi.component.html',
  styleUrls: ['./cajamovi.component.css']
})
export class CajamoviComponent implements OnInit {

  public cajamovis: Cajamovi[] = [];
  public loading: boolean = false;
  public currentUser: User | null = null;
  public selectedCajamovis: Cajamovi[] = [];

  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService,
    private authService: AuthService,
    private primengConfig: PrimeNGConfig
  ) {
    this.loadCurrentUser();
  }

  ngOnInit() {
    this.primengConfig.setTranslation({
      startsWith: 'Comienza con',
      contains: 'Contiene',
      notContains: 'No contiene',
      endsWith: 'Termina con',
      equals: 'Igual a',
      notEquals: 'No igual a',
      noFilter: 'Sin filtro',
      lt: 'Menor que',
      lte: 'Menor o igual que',
      gt: 'Mayor que',
      gte: 'Mayor o igual que',
      is: 'Es',
      isNot: 'No es',
      before: 'Antes',
      after: 'Después',
      dateIs: 'Fecha es',
      dateIsNot: 'Fecha no es',
      dateBefore: 'Fecha antes de',
      dateAfter: 'Fecha después de',
      clear: 'Limpiar',
      apply: 'Aplicar',
      matchAll: 'Coincidir con todos',
      matchAny: 'Coincidir con cualquiera',
      addRule: 'Agregar regla',
      removeRule: 'Eliminar regla',
      accept: 'Sí',
      reject: 'No',
      choose: 'Elegir',
      upload: 'Subir',
      cancel: 'Cancelar',
      dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
      monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      dateFormat: 'dd/mm/yy',
      firstDayOfWeek: 1,
      today: 'Hoy',
      weekHeader: 'Sem',
      weak: 'Débil',
      medium: 'Medio',
      strong: 'Fuerte',
      passwordPrompt: 'Ingrese una contraseña',
      emptyMessage: 'No se encontraron resultados',
      emptyFilterMessage: 'No se encontraron resultados'
    });
  }

  loadCajamovis() {
    this.loading = true;
    
    // Determinar si se debe filtrar por sucursal
    let sucursalFiltro: number | null = null;
    
    if (this.currentUser && this.currentUser.nivel !== 'admin' && this.currentUser.nivel !== 'super') {
      // Si no es admin ni super, filtrar por la sucursal actual
      const sucursalStr = sessionStorage.getItem('sucursal');
      if (sucursalStr) {
        sucursalFiltro = parseInt(sucursalStr, 10);
      }
    }
    
    // Usar el método apropiado según el filtro
    this.cargardataService.getCajamoviPorSucursal(sucursalFiltro).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (!response.error) {
          // Convertir las fechas string a objetos Date para que funcione el filtro
          this.cajamovis = response.mensaje.map((cajamovi: any) => {
            // Función auxiliar para extraer fecha en formato dd/mm/yyyy
            const extractDateString = (dateStr: any): string => {
              if (!dateStr) return '';
              
              // Si viene en formato ISO (2025-05-22T00:00:00.000Z)
              if (dateStr.includes('T')) {
                const datePart = dateStr.split('T')[0];
                const [year, month, day] = datePart.split('-');
                return `${day}/${month}/${year}`;
              }
              // Si viene en formato YYYY-MM-DD
              else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = dateStr.split('-');
                return `${day}/${month}/${year}`;
              }
              // Si ya viene en formato DD/MM/YYYY
              else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                return dateStr;
              }
              
              return '';
            };
            
            // Función auxiliar para crear objetos Date evitando problemas de timezone
            const createDate = (dateStr: any): Date | null => {
              if (!dateStr) return null;
              
              if (dateStr.includes('T')) {
                return new Date(dateStr.split('T')[0] + 'T12:00:00');
              }
              
              return new Date(dateStr + 'T12:00:00');
            };
            
            return {
              ...cajamovi,
              fecha_mov: createDate(cajamovi.fecha_mov),
              fecha_emibco: createDate(cajamovi.fecha_emibco),
              fecha_cobro_bco: createDate(cajamovi.fecha_cobro_bco),
              fecha_vto_bco: createDate(cajamovi.fecha_vto_bco),
              fecha_proceso: createDate(cajamovi.fecha_proceso),
              fecha_mov_string: extractDateString(cajamovi.fecha_mov)
            };
          });
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
      // Cargar los movimientos después de obtener el usuario
      this.loadCajamovis();
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

  generarReporte() {
    if (!this.selectedCajamovis || this.selectedCajamovis.length === 0) {
      this.showErrorMessage('Por favor seleccione al menos un movimiento para generar el reporte');
      return;
    }

    // Guardar los datos seleccionados en sessionStorage para pasarlos al componente de reporte
    sessionStorage.setItem('reporteData', JSON.stringify(this.selectedCajamovis));
    
    // Navegar al componente de reporte
    this.router.navigate(['components/reporte']);
  }

}
