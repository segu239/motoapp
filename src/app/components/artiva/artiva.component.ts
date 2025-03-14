import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import Swal from 'sweetalert2';
import { DatePipe } from '@angular/common';


interface IVA {
  cod_iva: number;
  descripcion: string;
  desde: any;
  hasta: any;
  tipo_ali_1: string;
  alicuota1: number;
  tipo_ali_2: string;
  alicuota2: number;
  tipo_ali_3: string;
  alicuota3: number;
  cuit: boolean;
  id_ariva: number;
}

@Component({
  selector: 'app-artiva',
  templateUrl: './artiva.component.html',
  styleUrls: ['./artiva.component.css'],
  providers: [DatePipe]
})
export class ArtivaComponent implements OnInit {
  
  public ivas: IVA[] = [];
  
  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.loadIvas();
  }

  formatDate(date: any): string {
    if (!date) return '-';
    
    // Special case for empty dates or placeholder dates
    if (date === '0000-00-00' || date === '9999-12-31') {
      return '-';
    }
    
    // Try to convert to Date if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
      return this.datePipe.transform(dateObj, 'dd/MM/yyyy') || '-';
    }
    return '-';
  }

  loadIvas() {
    this.cargardataService.getArtIva().subscribe({
      next: (response: any) => {
        if (!response.error) {
          // Map the API response fields to match our interface
          this.ivas = response.mensaje.map((item: any) => {
            return {
              cod_iva: item.cod_iva,
              descripcion: item.descripcion, // Note: API returns "descripcio" not "descripcion"
              desde: item.desde,       // Map "desde" to "desde_date"
              hasta: item.hasta,       // Map "hasta" to "hasta_date"
              tipo_ali_1: item.tipo_ali_1,
              alicuota1: item.alicuota1,
              tipo_ali_2: item.tipo_ali_2,
              alicuota2: item.alicuota2,
              tipo_ali_3: item.tipo_ali_3,
              alicuota3: item.alicuota3,
              cuit: item.cuit === 't',      // Convert 't'/'f' to boolean
              id_ariva: item.id_ariva
            };
          });
          
          console.log('Mapped IVA data:', this.ivas);
        } else {
          console.error('Error loading IVAs:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  editIva(iva: IVA) {
    // Navigate to edit page with IVA data
    console.log(iva);
    this.router.navigate(['components/editartiva'], {
      queryParams: {
        iva: JSON.stringify(iva)
      }
    });
  }

  confirmDelete(iva: IVA) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el IVA "${iva.descripcion}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteIva(iva);
      }
    });
  }

  deleteIva(iva: IVA) {
    this.subirdataService.eliminarArtIva(iva.id_ariva).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El IVA se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadIvas(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'El IVA no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting IVA:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'El IVA no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.ivas);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'ivas');
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