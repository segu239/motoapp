import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CargardataService } from 'src/app/services/cargardata.service';
import Swal from 'sweetalert2';

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
  selector: 'app-grilla',
  templateUrl: './grilla.component.html',
  styleUrls: ['./grilla.component.css']
})
export class GrillaComponent implements OnInit {
  productos: any[] = [];
  valoresCambio: ValorCambio[] = [];
  tiposMoneda: TipoMoneda[] = [];
  cargando: boolean = true;

  constructor(
    private cargarDataService: CargardataService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {}

  ngOnInit(): void {
    this.mostrarCargando();
    // Primero cargar los valores de cambio y monedas antes de cargar productos
    this.cargarValoresCambio();
  }

  mostrarCargando() {
    Swal.fire({
      title: 'Cargando productos',
      text: 'Por favor espere mientras se cargan los datos...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  cargarValoresCambio() {
    this.cargarDataService.getValorCambio().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.valoresCambio = response.mensaje;
          console.log('Valores de cambio cargados:', this.valoresCambio);
          // Una vez cargados los valores de cambio, cargar tipos de moneda
          this.cargarTiposMoneda();
        } else {
          Swal.close();
          this.cargando = false;
          console.error('Error loading valores de cambio:', response.mensaje);
          this.showNotification('Error al cargar valores de cambio');
        }
      },
      error: (error) => {
        Swal.close();
        this.cargando = false;
        console.error('Error in API call:', error);
        this.showNotification('Error al cargar valores de cambio');
      }
    });
  }

  cargarTiposMoneda() {
    this.cargarDataService.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados:', this.tiposMoneda);
          // Una vez cargados los tipos de moneda, cargamos los productos
          this.cargarProductos();
        } else {
          Swal.close();
          this.cargando = false;
          console.error('Error loading tipos de moneda:', response.mensaje);
          this.showNotification('Error al cargar tipos de moneda');
        }
      },
      error: (error) => {
        Swal.close();
        this.cargando = false;
        console.error('Error in API call:', error);
        this.showNotification('Error al cargar tipos de moneda');
      }
    });
  }

  cargarProductos() {
    this.cargarDataService.artsucursal().subscribe({
      next: (data: any) => {
        console.log(data);
        if (data && data.mensaje) {
          // Hacer una copia de los productos originales
          let productosConPrecios = [...data.mensaje];
          
          // Aplicar multiplicador de tipo de moneda a cada producto
          productosConPrecios = this.aplicarMultiplicadorPrecio(productosConPrecios);
          
          // Asignar los productos con precios actualizados
          this.productos = productosConPrecios;
        }
        Swal.close();
        this.cargando = false;
      },
      error: (error) => {
        Swal.close();
        this.cargando = false;
        console.error('Error in API call:', error);
        this.showNotification('Error al cargar los productos');
      }
    });
  }

  aplicarMultiplicadorPrecio(productos: any[]): any[] {
    if (!this.valoresCambio || this.valoresCambio.length === 0) {
      console.warn('No hay valores de cambio disponibles para aplicar a los precios');
      return productos;
    }

    return productos.map(producto => {
      // Crear una copia del producto para no modificar el original
      const productoCopy = { ...producto };
      
      // Verificar si el producto tiene tipo_moneda y es diferente de 1 (asumiendo que 1 es la moneda local)
      if (productoCopy.tipo_moneda && productoCopy.tipo_moneda !== 1) {
        // Buscar el valor de cambio correspondiente
        const valorCambio = this.obtenerValorCambio(productoCopy.tipo_moneda);
        
        // Si se encontró un valor de cambio válido y tiene un multiplicador
        if (valorCambio && valorCambio > 0) {
          // Aplicar el multiplicador a los precios
          productoCopy.precon = productoCopy.precon * valorCambio;
          productoCopy.prefi1 = productoCopy.prefi1 * valorCambio;
          productoCopy.prefi2 = productoCopy.prefi2 * valorCambio;
          if (productoCopy.prefi3) productoCopy.prefi3 = productoCopy.prefi3 * valorCambio;
          if (productoCopy.prefi4) productoCopy.prefi4 = productoCopy.prefi4 * valorCambio;
        }
      }
      
      return productoCopy;
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

  showNotification(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Aceptar'
    });
  }
}
