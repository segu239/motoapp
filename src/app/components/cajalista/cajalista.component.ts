import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service'; // Asegúrate que la ruta sea correcta
import { SubirdataService } from '../../services/subirdata.service'; // Asegúrate que la ruta sea correcta
import Swal from 'sweetalert2';

interface CajaLista {
  descripcion: string;
  fecha_cierre: string; // Se maneja como string para simplicidad, la base de datos es date
  especial: number;
  fija: number;
  id_caja: number;
}

@Component({
  selector: 'app-cajalista',
  templateUrl: './cajalista.component.html',
  styleUrls: ['./cajalista.component.css'] // Asegúrate que la ruta sea correcta
})
export class CajaListaComponent {

  public cajasListas: CajaLista[] = [];

  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService
  ) {
    this.loadCajasListas();
  }

  loadCajasListas() {
    this.cargardataService.getCajaLista().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.cajasListas = response.mensaje;
        } else {
          console.error('Error loading cajas listas:', response.mensaje);
          Swal.fire({
            title: '¡Error!',
            text: 'No se pudieron cargar las Cajas Listas',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
        Swal.fire({
          title: '¡Error!',
          text: 'Error en la conexión con el servidor',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  editCajaLista(cajaLista: CajaLista) {
    this.router.navigate(['components/editcajalista'], { // Asegúrate que la ruta sea correcta
      queryParams: {
        cajaLista: JSON.stringify(cajaLista)
      }
    });
  }

  confirmDelete(cajaLista: CajaLista) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la caja "${cajaLista.descripcion}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteCajaLista(cajaLista);
      }
    });
  }

  deleteCajaLista(cajaLista: CajaLista) {
    this.subirdataService.eliminarCajaLista(cajaLista.id_caja).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'La caja lista se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadCajasListas(); // Recargar la tabla
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'La caja lista no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting caja lista:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'La caja lista no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.cajasListas);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'cajaslistas');
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