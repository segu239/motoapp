import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { FormGroup, FormControl } from '@angular/forms';

import Swal from 'sweetalert2';

interface Rubro {
  cod_rubro: string;
  rubro: string;
  numerador: number;
  modiprecio: number;
  modidescri: number;
  cod_depo: number;
  mustuni: number;
  id_rubro: number;
 
}
@Component({
  selector: 'app-rubro',
  templateUrl: './rubro.component.html',
  styleUrls: ['./rubro.component.css']
})
export class RubroComponent {
  
  public rubros: Rubro[] = [];
  
  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService
  ) {
    this.loadRubros();
  }

  loadRubros() {
    this.cargardataService.getRubro().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.rubros = response.mensaje;
        } else {
          console.error('Error loading rubros:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  editRubro(rubro: Rubro) {
    // Navigate to edit page with rubro data
    console.log(rubro);
    this.router.navigate(['components/editrubro'], {
      queryParams: {
        rubro: JSON.stringify(rubro)
      }
    });
  }

  confirmDelete(rubro: Rubro) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el rubro "${rubro.rubro}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteRubro(rubro);
      }
    });
  }

  deleteRubro(rubro: Rubro) {
    this.subirdataService.eliminarRubro(rubro.id_rubro).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El rubro se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadRubros(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'El rubro no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting rubro:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'El rubro no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.rubros);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'rubros');
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
