import { Component, OnInit, OnDestroy } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CargardataService } from 'src/app/services/cargardata.service';
import { ArticulosCacheService } from 'src/app/services/articulos-cache.service';
import { Subscription } from 'rxjs';
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
export class GrillaComponent implements OnInit, OnDestroy {
  productos: any[] = [];
  valoresCambio: ValorCambio[] = [];
  tiposMoneda: TipoMoneda[] = [];
  cargando: boolean = true;
  private subscriptions: Subscription[] = [];

  constructor(
    private cargarDataService: CargardataService,
    private articulosCacheService: ArticulosCacheService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {}

  ngOnInit(): void {
    console.log('GrillaComponent initialized');
    this.mostrarCargando();
    // Intentar cargar datos desde caché primero
    this.cargarDatosDesdeCache();
  }
  
  ngOnDestroy(): void {
    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  cargarDatosDesdeCache(): void {
    console.log('Intentando cargar datos desde caché para Grilla');
    
    // Obtener datos de caché
    const cachedValoresCambio = this.articulosCacheService.getValoresCambio();
    const cachedTiposMoneda = this.articulosCacheService.getTiposMoneda();
    const cachedArticulosSucursal = this.articulosCacheService.getArticulosSucursal();
    
    // Verificar si tenemos datos en caché
    if (cachedValoresCambio.length > 0 && 
        cachedTiposMoneda.length > 0 && 
        cachedArticulosSucursal.length > 0) {
        
      console.log('Datos completos encontrados en caché, usando caché para Grilla');
      this.valoresCambio = cachedValoresCambio;
      this.tiposMoneda = cachedTiposMoneda;
      
      // Usar artículos de sucursal desde la caché directamente
      let productosConPrecios = [...cachedArticulosSucursal];
      
      // Aplicar multiplicador de tipo de moneda a cada producto
      productosConPrecios = this.aplicarMultiplicadorPrecio(productosConPrecios);
      
      // Asignar los productos con precios actualizados
      this.productos = productosConPrecios;
      
      // Cerrar loading
      Swal.close();
      this.cargando = false;
      
    } else {
      console.log('No hay datos completos en caché, cargando desde API para Grilla');
      // Primero cargar los valores de cambio y monedas antes de cargar productos
      this.cargarValoresCambio();
    }
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
    console.log('Cargando valores de cambio desde API para Grilla');
    
    const subscription = this.cargarDataService.getValorCambio().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.valoresCambio = response.mensaje;
          console.log('Valores de cambio cargados para Grilla:', this.valoresCambio.length);
          
          // Guardar en caché para uso futuro
          this.articulosCacheService.clearAllCaches();
          
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
    
    this.subscriptions.push(subscription);
  }

  cargarTiposMoneda() {
    console.log('Cargando tipos de moneda desde API para Grilla');
    
    const subscription = this.cargarDataService.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados para Grilla:', this.tiposMoneda.length);
          
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
    
    this.subscriptions.push(subscription);
  }

  cargarProductos() {
    console.log('Cargando productos desde API para Grilla');
    
    // Verificar si tenemos artículos en caché primero
    const cachedArticulosSucursal = this.articulosCacheService.getArticulosSucursal();
    
    if (cachedArticulosSucursal.length > 0) {
      console.log(`Usando ${cachedArticulosSucursal.length} productos de la caché para Grilla`);
      
      // Hacer una copia de los productos originales
      let productosConPrecios = [...cachedArticulosSucursal];
      
      // Aplicar multiplicador de tipo de moneda a cada producto
      productosConPrecios = this.aplicarMultiplicadorPrecio(productosConPrecios);
      
      // Asignar los productos con precios actualizados
      this.productos = productosConPrecios;
      
      Swal.close();
      this.cargando = false;
      return;
    }
    
    // Si no hay caché, cargar desde API
    const subscription = this.articulosCacheService.loadArticulosSucursal().subscribe({
      next: (articulos: any[]) => {
        if (articulos && articulos.length > 0) {
          console.log(`Productos cargados para Grilla desde servicio de caché: ${articulos.length}`);
          
          // Hacer una copia de los productos originales
          let productosConPrecios = [...articulos];
          
          // Aplicar multiplicador de tipo de moneda a cada producto
          productosConPrecios = this.aplicarMultiplicadorPrecio(productosConPrecios);
          
          // Asignar los productos con precios actualizados
          this.productos = productosConPrecios;
        } else {
          console.warn('No se obtuvieron productos o respuesta vacía');
        }
        Swal.close();
        this.cargando = false;
      },
      error: (error) => {
        Swal.close();
        this.cargando = false;
        console.error('Error al cargar productos:', error);
        this.showNotification('Error al cargar los productos');
      }
    });
    
    this.subscriptions.push(subscription);
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
    
    // Filtrar todos los valores de cambio para esta moneda
    const valoresCambioMoneda = this.valoresCambio.filter(vc => vc.codmone === codMoneda);
    
    // Si no hay valores para esta moneda, devolver 1
    if (!valoresCambioMoneda || valoresCambioMoneda.length === 0) {
      return 1;
    }
    
    // Si hay múltiples valores para esta moneda, tomar el más reciente por fecha
    if (valoresCambioMoneda.length > 1) {
      // Ordenar por fecha descendente (más reciente primero)
      valoresCambioMoneda.sort((a, b) => {
        const fechaA = new Date(a.fecdesde);
        const fechaB = new Date(b.fecdesde);
        return fechaB.getTime() - fechaA.getTime();
      });
    }
    
    // Tomar el primer valor (el más reciente después de ordenar)
    const valorCambioSeleccionado = valoresCambioMoneda[0];
    
    // Devolver el valor de cambio o 1 si no está definido
    return valorCambioSeleccionado && valorCambioSeleccionado.vcambio ? 
      parseFloat(valorCambioSeleccionado.vcambio.toString()) : 1;
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
