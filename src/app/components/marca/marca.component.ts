import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-marca',
  templateUrl: './marca.component.html',
  styleUrls: ['./marca.component.css']
})
export class MarcaComponent implements OnInit {
  public marcas: any[] = [];
  public loading: boolean = true;

  constructor(
    private cargardata: CargardataService,
    private subirdata: SubirdataService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadMarcas();
  }

  loadMarcas(): void {
    this.loading = true;
    this.cargardata.getMarca().subscribe((data: any) => {
      console.log('Marcas:', data);
      this.marcas = data.mensaje;
      this.loading = false;
    }, error => {
      console.error('Error loading marcas:', error);
      this.loading = false;
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar las marcas',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  editMarca(marca: any): void {
    this.router.navigate(['/components/editmarca'], { 
      queryParams: { marca: JSON.stringify(marca) } 
    });
  }

  confirmDelete(marca: any): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: "Esta acción no se puede revertir",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteMarca(marca.id_marca);
      }
    });
  }

  deleteMarca(id_marca: number): void {
    this.subirdata.eliminarmarca(id_marca).subscribe(() => {
      Swal.fire(
        '¡Eliminado!',
        'La marca ha sido eliminada.',
        'success'
      );
      this.loadMarcas();
    }, error => {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo eliminar la marca',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  exportExcel(): void {
    import('xlsx').then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(this.marcas);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, "marcas");
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