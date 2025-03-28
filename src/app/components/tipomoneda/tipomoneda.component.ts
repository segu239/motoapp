import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import Swal from 'sweetalert2';

interface TipoMoneda {
  cod_mone: number;
  moneda: string;
  simbolo: string;
  id_moneda: number;
}

@Component({
  selector: 'app-tipomoneda',
  templateUrl: './tipomoneda.component.html',
  styleUrls: ['./tipomoneda.component.css']
})
export class TipomonedaComponent {
  
  public tiposMoneda: TipoMoneda[] = [];

  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService
  ) {
    this.loadTiposMoneda();
  }

  loadTiposMoneda() {
    this.cargardataService.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
        } else {
          console.error('Error loading tipos de moneda:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  editTipoMoneda(tipoMoneda: TipoMoneda) {
    // Navigate to edit page with tipo moneda data
    this.router.navigate(['components/edittipomoneda'], {
      queryParams: {
        tipoMoneda: JSON.stringify(tipoMoneda)
      }
    });
  }

  confirmDelete(tipoMoneda: TipoMoneda) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la moneda "${tipoMoneda.moneda}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteTipoMoneda(tipoMoneda);
      }
    });
  }

  deleteTipoMoneda(tipoMoneda: TipoMoneda) {
    this.subirdataService.eliminarTipoMoneda(tipoMoneda.id_moneda).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'La moneda se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadTiposMoneda(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'La moneda no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting tipo moneda:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'La moneda no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.tiposMoneda);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'tipos_moneda');
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
}
