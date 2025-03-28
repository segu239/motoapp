import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import Swal from 'sweetalert2';
import { DatePipe } from '@angular/common';

interface Proveedor {
  cod_prov: number;
  nombre: string;
  direccion: string;
  codpos: string;
  localidad: string;
  telefono: string;
  cuit: number;
  contacto: string;
  rubro: string;
  cod_iva: number;
  ganancias: number;
  ingbrutos: string;
  email: string;
  www: string;
  cta_proveedores: string;
  fec_proceso: any;
  id_prov: number;
}

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.css'],
  providers: [DatePipe]
})
export class ProveedoresComponent implements OnInit {

  public proveedores: Proveedor[] = [];
  
  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.loadProveedores();
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

  loadProveedores() {
    this.cargardataService.getProveedor().subscribe({
      next: (response: any) => {
        if (!response.error) {
          // Map the API response fields to match our interface
          this.proveedores = response.mensaje.map((item: any) => {
            return {
              cod_prov: item.cod_prov,
              nombre: item.nombre,
              direccion: item.direccion,
              codpos: item.codpos,
              localidad: item.localidad,
              telefono: item.telefono,
              cuit: item.cuit,
              contacto: item.contacto,
              rubro: item.rubro,
              cod_iva: item.cod_iva,
              ganancias: item.ganancias,
              ingbrutos: item.ingbrutos,
              email: item.email,
              www: item.www,
              cta_proveedores: item.cta_proveedores,
              fec_proceso: item.fec_proceso,
              id_prov: item.id_prov
            };
          });
          
          console.log('Mapped Proveedores data:', this.proveedores);
        } else {
          console.error('Error loading Proveedores:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  editProveedor(proveedor: Proveedor) {
    // Navigate to edit page with Proveedor data
    console.log(proveedor);
    this.router.navigate(['components/editproveedores'], {
      queryParams: {
        proveedor: JSON.stringify(proveedor)
      }
    });
  }

  confirmDelete(proveedor: Proveedor) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el proveedor "${proveedor.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteProveedor(proveedor);
      }
    });
  }

  deleteProveedor(proveedor: Proveedor) {
    this.subirdataService.eliminarproveedor(proveedor.id_prov).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El proveedor se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadProveedores(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'El proveedor no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting proveedor:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'El proveedor no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.proveedores);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'proveedores');
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
