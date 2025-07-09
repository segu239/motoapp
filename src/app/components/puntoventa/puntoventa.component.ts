import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import { Cliente } from '../../interfaces/cliente';
import { ActivatedRoute, Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { first, take } from 'rxjs/operators'
import Swal from 'sweetalert2';

@Component({
  selector: 'app-puntoventa',
  templateUrl: './puntoventa.component.html',
  styleUrls: ['./puntoventa.component.css']
})
export class PuntoventaComponent implements OnInit {

  public clientes: Cliente[] = [];
  public clienteElejido: Cliente;
  constructor(private _cargardata: CargardataService, private _router: Router) { }
  ngOnInit(): void {
    let sucursal: string = sessionStorage.getItem('sucursal');
    if (!sucursal) {
      this.showNotification('No se encontró la sucursal, porfavor cierre la sesión y vuelva a iniciar');
      return;
    }
    this._cargardata.clisucx(sucursal).pipe(take(1)).subscribe({
      next: (resp: any) => {
        console.log('Respuesta del servicio:', resp);
        if (resp && Array.isArray(resp.mensaje)) {
          this.clientes = resp.mensaje;
        } else {
          this.clientes = [];
          this.showNotification('No se encontraron clientes o el formato de respuesta no es válido');
        }
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.clientes = [];
        this.showNotification('Error al cargar los clientes');
      }
    });
  }
  selectCliente(cliente) {
    console.log(cliente);
    this._router.navigate(['components/condicionventa'], { queryParams: { cliente: JSON.stringify(cliente) } });
  }
  editCliente(cliente) {
    console.log(cliente);
    this._router.navigate(['components/editcliente'], { queryParams: { cliente: JSON.stringify(cliente) } });
  }
  verHistorialVentas(cliente) {
    console.log('Ver historial de ventas para cliente:', cliente);
    this._router.navigate(['components/historialventas2'], { queryParams: { cliente: JSON.stringify(cliente) } });
  }
  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.clientes);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'products');
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
  showNotification(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Aceptar'
    });
  }
}
