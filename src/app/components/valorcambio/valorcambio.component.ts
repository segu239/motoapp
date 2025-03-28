import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import Swal from 'sweetalert2';

interface ValorCambio {
  codmone: number;
  desvalor: string;
  fecdesde: Date;
  fechasta: Date;
  vcambio: number;
  id_valor: number;
}

@Component({
  selector: 'app-valorcambio',
  templateUrl: './valorcambio.component.html',
  styleUrls: ['./valorcambio.component.css']
})
export class ValorcambioComponent {
  
  public valoresCambio: ValorCambio[] = [];

  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService
  ) {
    this.loadValoresCambio();
  }

  loadValoresCambio() {
    this.cargardataService.getValorCambio().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.valoresCambio = response.mensaje;
        } else {
          console.error('Error loading valores de cambio:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  editValorCambio(valorCambio: ValorCambio) {
    // Navigate to edit page with valor cambio data
    this.router.navigate(['components/editvalorcambio'], {
      queryParams: {
        valorCambio: JSON.stringify(valorCambio)
      }
    });
  }

  confirmDelete(valorCambio: ValorCambio) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el valor de cambio "${valorCambio.desvalor}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteValorCambio(valorCambio);
      }
    });
  }

  deleteValorCambio(valorCambio: ValorCambio) {
    this.subirdataService.eliminarValorCambio(valorCambio.id_valor).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El valor de cambio se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadValoresCambio(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'El valor de cambio no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting valor cambio:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'El valor de cambio no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.valoresCambio);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'valores_cambio');
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
