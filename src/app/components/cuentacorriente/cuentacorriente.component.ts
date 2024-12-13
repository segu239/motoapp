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
  selector: 'app-cuentacorriente',
  templateUrl: './cuentacorriente.component.html',
  styleUrls: ['./cuentacorriente.component.css']
})
export class CuentacorrienteComponent {
  public clientes: Cliente[];
  public clienteElejido: Cliente;

  constructor(private _cargardata: CargardataService, private _router: Router) { }
  ngOnInit(): void {
    //let sucursal: string = localStorage.getItem('sucursal');
    const sucursal: string | null = localStorage.getItem('sucursal');
    if (sucursal) {
      this._cargardata.clisucx(sucursal).pipe(take(1)).subscribe((resp: any) => {
        console.log(resp);
        this.clientes = resp.mensaje;
      }, (err) => {
        console.log(err);
        this.showNotification('Error al cargar los clientes: ' + err.error.mensaje);
      });
    }
    else {
      this.showNotification('Sucursal no encontrada en localStorage');//console.log('Sucursal no encontrada en localStorage');
    }
  }
  selectCliente(cliente) {
    console.log(cliente);
    this._router.navigate(['components/cabeceras'], { queryParams: { cliente: JSON.stringify(cliente) } });
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