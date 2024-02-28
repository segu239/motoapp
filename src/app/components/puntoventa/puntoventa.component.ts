import { Component,OnInit ,ViewChild} from '@angular/core';
import { Table } from 'primeng/table';
import { CargardataService } from '../../services/cargardata.service';
import {Cliente} from '../../interfaces/cliente';
import {ActivatedRoute, Router} from '@angular/router';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { first, take } from 'rxjs/operators'
//import { DataTableDirective } from 'angular-datatables';
// import { Subject } from 'rxjs';
// declare var jQuery:any;
// declare var $:any;


@Component({
  selector: 'app-puntoventa',
  templateUrl: './puntoventa.component.html',
  styleUrls: ['./puntoventa.component.css']
})
export class PuntoventaComponent implements OnInit {
 // dtOptions: { [key: string]: any } = {}; // explicitly typed as a string index signature//dtOptions: DataTables.Settings = {};
 //dtOptions: DataTables.Settings = {};
 //dtTrigger: Subject<any> = new Subject<any>();

public clientes:Cliente[];
public clienteElejido:Cliente;

  constructor(private _cargardata:CargardataService, private _router:Router) { }
  ngOnInit(): void {
    let sucursal:string= localStorage.getItem('sucursal');
    this._cargardata.clisucx(sucursal).pipe(take(1)).subscribe((resp:any)=>{
      console.log(resp);
     this.clientes=resp.mensaje;
        
      }, (err)=>{console.log(err);});

  }
  selectCliente(cliente)
  {

    console.log(cliente);
    this._router.navigate(['components/condicionventa'], { queryParams: {cliente:JSON.stringify(cliente)} });
  }
  editCliente(cliente)
  {
    console.log(cliente);
    //this._router.navigate(['editcliente', {cliente:cliente}]);
    this._router.navigate(['components/editcliente'], { queryParams: {cliente:JSON.stringify(cliente)} });
  }
  /* exportPdf() {
    import('jspdf').then((jsPDF) => {
        import('jspdf-autotable').then((x) => {
            const doc = new jsPDF.default('p', 'px', 'a4');
            (doc as any).autoTable(this.exportColumns, this.products);
            doc.save('products.pdf');
        });
    });
} */

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
}
