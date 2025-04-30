import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import Swal from 'sweetalert2';

interface CajaConcepto {
  descripcion: string;
  tipo_concepto: string;
  fija: number;
  ingreso_egreso: number;
  id_caja: number;
  id_concepto: number;
}

@Component({
  selector: 'app-cajaconcepto',
  templateUrl: './cajaconcepto.component.html',
  styleUrls: ['./cajaconcepto.component.css'] // Asumiendo que existe o se creará un archivo CSS vacío o con estilos necesarios
})
export class CajaconceptoComponent {

  public cajaconceptos: CajaConcepto[] = [];

  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService
  ) {
    this.loadCajaconceptos();
  }

  loadCajaconceptos() {
    this.cargardataService.getCajaconcepto().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.cajaconceptos = response.mensaje;
        } else {
          console.error('Error loading cajaconceptos:', response.mensaje);
          Swal.fire({
            title: '¡Error!',
            text: 'No se pudieron cargar los conceptos de caja.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
        Swal.fire({
            title: '¡Error!',
            text: 'Error en la conexión con el servidor.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
      }
    });
  }

  editCajaconcepto(cajaconcepto: CajaConcepto) {
    // Navigate to edit page with cajaconcepto data
    console.log(cajaconcepto);
    this.router.navigate(['components/editcajaconcepto'], { // Ajustar ruta si es necesario
      queryParams: {
        cajaconcepto: JSON.stringify(cajaconcepto)
      }
    });
  }

  confirmDelete(cajaconcepto: CajaConcepto) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el concepto "${cajaconcepto.descripcion}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteCajaconcepto(cajaconcepto);
      }
    });
  }

  deleteCajaconcepto(cajaconcepto: CajaConcepto) {
    this.subirdataService.eliminarCajaconcepto(cajaconcepto.id_concepto).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El concepto de caja se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadCajaconceptos(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'El concepto de caja no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting cajaconcepto:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'El concepto de caja no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.cajaconceptos);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'cajaconceptos');
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
