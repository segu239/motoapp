import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { FormGroup, FormControl } from '@angular/forms';

import Swal from 'sweetalert2';

interface Conflista {
  listap: number;
  activa: boolean;
  precosto21: number;
  precosto105: number;
  pordcto: number;
  margen: number;
  preciof21: number;
  preciof105: number;
  rmargen: boolean;
  tipomone: number;
  actprov: boolean;
  cod_marca: string;
  fecha: Date;
  id_conflista: number;
}

@Component({
  selector: 'app-conflista',
  templateUrl: './conflista.component.html',
  styleUrls: ['./conflista.component.css']
})
export class ConflistaComponent {
  
  public conflistas: Conflista[] = [];
  
  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService
  ) {
    this.loadConflistas();
  }

  loadConflistas() {
    this.cargardataService.getConflista().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.conflistas = response.mensaje;
        } else {
          console.error('Error loading conflistas:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  editConflista(conflista: Conflista) {
    // Navigate to edit page with conflista data
    console.log(conflista);
    this.router.navigate(['components/editconflista'], {
      queryParams: {
        conflista: JSON.stringify(conflista)
      }
    });
  }

  confirmDelete(conflista: Conflista) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la conflista "${conflista.listap}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteConflista(conflista);
      }
    });
  }

  deleteConflista(conflista: Conflista) {
    this.subirdataService.eliminarConflista(conflista.id_conflista).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'La conflista se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadConflistas(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'La conflista no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting conflista:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'La conflista no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.conflistas);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'conflistas');
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
