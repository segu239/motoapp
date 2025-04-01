import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { FormGroup, FormControl } from '@angular/forms';

import Swal from 'sweetalert2';

interface Column {
  field: string;
  header: string;
}

interface Articulo {
  nomart: string;
  marca: string;
  precon: number;
  prefi1: number;
  prefi2: number;
  prefi3: number;
  prefi4: number;
  exi1: number;
  exi2: number;
  exi3: number;
  exi4: number;
  exi5: number;
  stkmin1: number;
  stkmax1: number;
  stkprep1: number;
  stkmin2: number;
  stkmax2: number;
  stkprep2: number;
  stkmin3: number;
  stkmax3: number;
  stkprep3: number;
  stkmin4: number;
  stkmax4: number;
  stkprep4: number;
  stkmin5: number;
  stkmax5: number;
  stkprep5: number;
  cd_articulo: number;
  cd_proveedor: number;
  cd_barra: string;
  idart: number;
  estado: string;
  rubro: string;
  articulo: number;
  cod_iva: number;
  prebsiva: number;
  precostosi: number;
  margen: number;
  descuento: number;
  cod_deposito: number;
  tipo_moneda: number;
  id_articulo: number;
}

interface ValorCambio {
  codmone: number;
  desvalor: string;
  fecdesde: Date;
  fechasta: Date;
  vcambio: number;
  id_valor: number;
}

interface TipoMoneda {
  cod_mone: number;
  moneda: string;
  simbolo: string;
  id_moneda: number;
}

@Component({
  selector: 'app-articulo',
  templateUrl: './articulos.component.html',
  styleUrls: ['./articulos.component.css']
})
export class ArticulosComponent {
  
  public articulos: Articulo[] = [];
  public valoresCambio: ValorCambio[] = [];
  public tiposMoneda: TipoMoneda[] = [];
  cols: Column[];
  _selectedColumns: Column[];
  
  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService
  ) {
    // Mostrar mensaje de carga
    this.mostrarCargando();
    
    // Cargamos primero los valores de cambio y tipos de moneda antes de cargar artículos
    this.cargarValoresCambio();
    
    this.cols = [
      { field: 'cd_articulo', header: 'Código' },
      { field: 'nomart', header: 'Nombre' },
      { field: 'marca', header: 'Marca' },
      { field: 'precon', header: 'Precio' },
      { field: 'prefi1', header: 'Precio 1' },
      { field: 'prefi2', header: 'Precio 2' },
      { field: 'prefi3', header: 'Precio 3' },
      { field: 'prefi4', header: 'Precio 4' },
      { field: 'exi1', header: 'Existencia 1' },
      { field: 'exi2', header: 'Existencia 2' },
      { field: 'exi3', header: 'Existencia 3' },
      { field: 'exi4', header: 'Existencia 4' },
      { field: 'exi5', header: 'Existencia 5' },
      { field: 'cd_barra', header: 'Código Barra' },
      { field: 'rubro', header: 'Rubro' },
      { field: 'estado', header: 'Estado' },
      { field: 'cd_proveedor', header: 'Proveedor' },
      { field: 'idart', header: 'ID Art' },
      { field: 'cod_iva', header: 'IVA' },
      { field: 'margen', header: 'Margen' },
      { field: 'descuento', header: 'Descuento' },
      { field: 'tipo_moneda', header: 'Tipo Moneda' }
    ];
    
    this._selectedColumns = [
      this.cols[0], // cd_articulo
      this.cols[1], // nomart
      this.cols[2], // marca
      this.cols[3], // precon
      this.cols[13], // cd_barra
      this.cols[14], // rubro
      this.cols[15]  // estado
    ];
  }

  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }
  
  set selectedColumns(val: Column[]) {
    // Restaurar orden original
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }

  mostrarCargando() {
    Swal.fire({
      title: 'Cargando artículos',
      text: 'Por favor espere mientras se cargan los datos...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  cargarValoresCambio() {
    this.cargardataService.getValorCambio().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.valoresCambio = response.mensaje;
          console.log('Valores de cambio cargados:', this.valoresCambio);
          // Una vez cargados los valores de cambio, cargar tipos de moneda
          this.cargarTiposMoneda();
        } else {
          Swal.close();
          console.error('Error loading valores de cambio:', response.mensaje);
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los valores de cambio',
            icon: 'error'
          });
        }
      },
      error: (error) => {
        Swal.close();
        console.error('Error in API call:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los valores de cambio',
          icon: 'error'
        });
      }
    });
  }

  cargarTiposMoneda() {
    this.cargardataService.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados:', this.tiposMoneda);
          // Una vez cargados los tipos de moneda, cargamos los artículos
          this.loadArticulos();
        } else {
          Swal.close();
          console.error('Error loading tipos de moneda:', response.mensaje);
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los tipos de moneda',
            icon: 'error'
          });
        }
      },
      error: (error) => {
        Swal.close();
        console.error('Error in API call:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los tipos de moneda',
          icon: 'error'
        });
      }
    });
  }

  loadArticulos() {
    this.cargardataService.getArticulos().subscribe({
      next: (response: any) => {
        if (!response.error) {
          // Hacer una copia de los artículos originales
          let articulosConPrecios = [...response.mensaje];
          
          // Aplicar multiplicador de tipo de moneda a cada artículo
          articulosConPrecios = this.aplicarMultiplicadorPrecio(articulosConPrecios);
          
          // Asignar los artículos con precios actualizados
          this.articulos = articulosConPrecios;
          
          // Cerrar el mensaje de carga
          Swal.close();
        } else {
          Swal.close();
          console.error('Error loading articulos:', response.mensaje);
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los artículos',
            icon: 'error'
          });
        }
      },
      error: (error) => {
        Swal.close();
        console.error('Error in API call:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los artículos',
          icon: 'error'
        });
      }
    });
  }

  aplicarMultiplicadorPrecio(articulos: Articulo[]): Articulo[] {
    if (!this.valoresCambio || this.valoresCambio.length === 0) {
      console.warn('No hay valores de cambio disponibles para aplicar a los precios');
      return articulos;
    }

    return articulos.map(articulo => {
      // Crear una copia del artículo para no modificar el original
      const articuloCopy = { ...articulo };
      
      // Verificar si el artículo tiene tipo_moneda y es diferente de 1 (asumiendo que 1 es la moneda local)
      if (articuloCopy.tipo_moneda && articuloCopy.tipo_moneda !== 1) {
        // Buscar el valor de cambio correspondiente
        const valorCambio = this.obtenerValorCambio(articuloCopy.tipo_moneda);
        
        // Si se encontró un valor de cambio válido y tiene un multiplicador
        if (valorCambio && valorCambio > 0) {
          // Aplicar el multiplicador a los precios
          articuloCopy.precon = articuloCopy.precon * valorCambio;
          articuloCopy.prefi1 = articuloCopy.prefi1 * valorCambio;
          articuloCopy.prefi2 = articuloCopy.prefi2 * valorCambio;
          articuloCopy.prefi3 = articuloCopy.prefi3 * valorCambio;
          articuloCopy.prefi4 = articuloCopy.prefi4 * valorCambio;
          articuloCopy.prebsiva = articuloCopy.prebsiva * valorCambio;
          articuloCopy.precostosi = articuloCopy.precostosi * valorCambio;
        }
      }
      
      return articuloCopy;
    });
  }

  obtenerValorCambio(codMoneda: number): number {
    // Si no hay valores de cambio, devolver 1 (sin cambio)
    if (!this.valoresCambio || this.valoresCambio.length === 0) {
      return 1;
    }
    
    // Buscar el valor de cambio para esta moneda
    const valorCambio = this.valoresCambio.find(vc => vc.codmone === codMoneda);
    
    // Si existe un valor de cambio, devolver su multiplicador, si no, devolver 1
    return valorCambio && valorCambio.vcambio ? parseFloat(valorCambio.vcambio.toString()) : 1;
  }

  editArticulo(articulo: Articulo) {
    // Navigate to edit page with articulo data
    this.router.navigate(['components/editarticulo'], {
      queryParams: {
        articulo: JSON.stringify(articulo)
      }
    });
  }

  confirmDelete(articulo: Articulo) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el artículo "${articulo.nomart}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteArticulo(articulo);
      }
    });
  }

  deleteArticulo(articulo: Articulo) {
    this.subirdataService.eliminarArticulo(articulo.id_articulo).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El artículo se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.loadArticulos(); // Reload the table after deletion
        } else {
          Swal.fire({
            title: '¡Error!',
            text: 'El artículo no se pudo eliminar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          console.error('Error deleting articulo:', response.mensaje);
        }
      },
      error: (error) => {
        Swal.fire({
          title: '¡Error!',
          text: 'El artículo no se pudo eliminar',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error in delete API call:', error);
      }
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.articulos);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'articulos');
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

  obtenerNombreMoneda(codMoneda: number): string {
    if (!codMoneda) return 'Peso';
    
    const moneda = this.tiposMoneda.find(m => m.cod_mone === codMoneda);
    return moneda ? moneda.moneda : `Moneda ${codMoneda}`;
  }

  obtenerSimboloMoneda(codMoneda: number): string {
    if (!codMoneda || codMoneda === 1) return '$';
    
    const moneda = this.tiposMoneda.find(m => m.cod_mone === codMoneda);
    return moneda && moneda.simbolo ? moneda.simbolo : '$';
  }
}
