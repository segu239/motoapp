import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CargardataService } from 'src/app/services/cargardata.service';
@Component({
  selector: 'app-recibos',
  templateUrl: './recibos.component.html',
  styleUrls: ['./recibos.component.css']
})
export class RecibosComponent implements OnInit {
  recibos: any[] = [];
  errorMessage: string | null = null;
  constructor(
    private cargarDataService: CargardataService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) { }
  ngOnInit(): void {
    const { cod_sucursal, comprobante } = this.config.data;
    this.cargarDataService.reciboxComprobante(cod_sucursal, comprobante).subscribe(
      (data: any) => {
        if (data.error) {
          this.errorMessage = data.mensaje;
          console.error(this.errorMessage);
        } else {
          this.recibos = data.mensaje;
        }
      },
      (error) => {
        this.errorMessage = 'Ocurrió un error al cargar los datos.';
        console.error(this.errorMessage, error);
      }
    );
  }
}
