/* import { Component, OnInit, OnDestroy } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CargardataService } from 'src/app/services/cargardata.service';
import { ArticulosPaginadosService } from 'src/app/services/articulos-paginados.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

// Método auxiliar para PrimeNG
function $any(val: any): any {
  return val;
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
  
  // Propiedades para paginación
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  public terminoBusqueda = '';

  constructor(
    private cargarDataService: CargardataService,
    private articulosPaginadosService: ArticulosPaginadosService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {
    // Suscribirse a los observables del servicio de paginación
    this.subscriptions.push(
      this.articulosPaginadosService.cargando$.subscribe(loading => {
        this.cargando = loading;
      })
    );
    
    this.subscriptions.push(
      this.articulosPaginadosService.articulos$.subscribe(articulos => {
        // Aplicar el procesamiento necesario
        this.productos = this.aplicarMultiplicadorPrecio(articulos);
      })
    );
    
    this.subscriptions.push(
      this.articulosPaginadosService.paginaActual$.subscribe(pagina => {
        this.paginaActual = pagina;
      })
    );
    
    this.subscriptions.push(
      this.articulosPaginadosService.totalPaginas$.subscribe(total => {
        this.totalPaginas = total;
      })
    );
    
    this.subscriptions.push(
      this.articulosPaginadosService.totalItems$.subscribe(total => {
        this.totalItems = total;
      })
    );
    
    this.subscriptions.push(
      this.articulosPaginadosService.terminoBusqueda$.subscribe(termino => {
        this.terminoBusqueda = termino;
      })
    );
  }

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
    console.log('Cargando datos paginados para Grilla');
    
    // Cargar los valores de cambio y monedas
    this.cargarValoresCambio();
    
    // Cargar la primera página de productos paginados
    this.articulosPaginadosService.cargarPagina(1).subscribe(
      () => {
        Swal.close();
      },
      error => {
        console.error('Error al cargar productos paginados:', error);
        Swal.close();
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los productos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  mostrarCargando(): void {
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

  cargarValoresCambio(): void {
    console.log('Cargando valores de cambio desde API para Grilla');
    
    const subscription = this.cargarDataService.getValorCambio().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.valoresCambio = response.mensaje;
          console.log('Valores de cambio cargados para Grilla:', this.valoresCambio.length);
          
          // Ya no guardamos en caché
          
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

  cargarTiposMoneda(): void {
    console.log('Cargando tipos de moneda desde API para Grilla');
    
    const subscription = this.cargarDataService.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados para Grilla:', this.tiposMoneda.length);
          
          // No necesitamos cargar productos aquí, ya se están cargando con el servicio paginado
          Swal.close();
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
  
  // Los métodos de paginación están más abajo, implementados con lógica de filtrado local
  
  // Variables para la búsqueda a nivel de cliente
  productosCompletos: any[] = [];
  productosFiltrados: any[] = [];
  
  // Buscar artículos localmente
  buscar() {
    if (!this.terminoBusqueda.trim()) {
      this.limpiarBusqueda();
      return;
    }
    
    // Si no tenemos todos los productos cargados, los cargamos primero
    if (this.productosCompletos.length === 0) {
      this.mostrarCargando();
      
      // Cargar todos los productos una sola vez
      this.cargarDataService.artsucursal().subscribe({
        next: (response: any) => {
          console.log('Respuesta de artsucursal:', response);
          
          // Verificar si la respuesta tiene el formato esperado (puede variar)
          let articulos = [];
          
          if (response && Array.isArray(response)) {
            // Es un array directo
            articulos = response;
          } else if (response && response.mensaje && Array.isArray(response.mensaje)) {
            // Tiene formato { mensaje: [...] }
            articulos = response.mensaje;
          } else if (response && !response.error && response.mensaje) {
            // Otro formato posible
            articulos = response.mensaje;
          }
          
          console.log('Artículos extraídos:', articulos.length);
          
          if (articulos && articulos.length > 0) {
            // Guardar la lista completa
            this.productosCompletos = [...articulos];
            
            // Realizar la búsqueda local
            this.buscarLocal();
            
            Swal.close();
          } else {
            Swal.close();
            console.warn('No se obtuvieron productos o respuesta vacía');
            Swal.fire({
              title: 'Advertencia',
              text: 'No se pudieron cargar productos para buscar',
              icon: 'warning',
              confirmButtonText: 'Aceptar'
            });
          }
        },
        error: (error) => {
          Swal.close();
          console.error('Error al cargar productos:', error);
          Swal.fire({
            title: 'Error',
            text: 'Error al cargar productos para buscar',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    } else {
      // Ya tenemos los productos, solo realizamos la búsqueda local
      this.buscarLocal();
    }
  }
  
  // Realizar búsqueda local
  buscarLocal() {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    console.log('Buscando el término:', termino);
    console.log('En total productos:', this.productosCompletos.length);
    
    // Inspeccionar los primeros 5 productos para entender la estructura
    console.log('Muestra de productos:', this.productosCompletos.slice(0, 5));
    
    // Filtrar productos localmente
    this.productosFiltrados = this.productosCompletos.filter(producto => {
      // Primero verificamos si el producto tiene los campos necesarios
      if (!producto) return false;
      
      // Asegurar que todos los campos se conviertan a string para búsqueda segura
      // Buscar principalmente en nomart y marca, como solicitaste
      const nombreArt = producto.nomart ? producto.nomart.toString().toLowerCase() : '';
      const marca = producto.marca ? producto.marca.toString().toLowerCase() : '';
      
      // Adicionales por si acaso
      const codigo = producto.cd_articulo ? producto.cd_articulo.toString().toLowerCase() : '';
      const codigoBarra = producto.cd_barra ? producto.cd_barra.toString().toLowerCase() : '';
      const rubro = producto.rubro ? producto.rubro.toString().toLowerCase() : '';
      
      // Devolver true si alguno de los campos contiene el término de búsqueda
      return (
        nombreArt.includes(termino) || 
        marca.includes(termino) || 
        codigo.includes(termino) || 
        codigoBarra.includes(termino) || 
        rubro.includes(termino)
      );
    });
    
    console.log('Productos filtrados encontrados:', this.productosFiltrados.length);
    
    // Actualizar contadores de paginación para la UI
    this.totalItems = this.productosFiltrados.length;
    this.totalPaginas = Math.ceil(this.totalItems / 10); // 10 ítems por página
    this.paginaActual = 1;
    
    // Aplicar paginación a los resultados
    this.paginarResultadosLocales();
    
    // Si no hay resultados, mostrar un mensaje amigable
    if (this.productos.length === 0) {
      Swal.fire({
        title: 'Sin resultados',
        text: `No se encontraron productos que coincidan con "${this.terminoBusqueda}"`,
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
    }
  }
  
  // Paginar resultados localmente
  paginarResultadosLocales() {
    const inicio = (this.paginaActual - 1) * 10;
    const fin = inicio + 10;
    
    // Obtener los productos para la página actual
    const productosPagina = this.productosFiltrados.slice(inicio, fin);
    
    // Aplicar multiplicador y actualizar la variable productos
    this.productos = this.aplicarMultiplicadorPrecio(productosPagina);
  }
  
  // Métodos de paginación sobrescritos para búsqueda local
  irAPagina(pagina: number) {
    if (this.terminoBusqueda && this.productosFiltrados.length > 0) {
      // Si estamos en modo búsqueda, paginar localmente
      if (pagina >= 1 && pagina <= this.totalPaginas) {
        this.paginaActual = pagina;
        this.paginarResultadosLocales();
      }
    } else {
      // Si no estamos en modo búsqueda, usar el servicio de paginación
      this.articulosPaginadosService.irAPagina(pagina);
    }
  }
  
  paginaSiguiente() {
    if (this.terminoBusqueda && this.productosFiltrados.length > 0) {
      // Si estamos en modo búsqueda, paginar localmente
      if (this.paginaActual < this.totalPaginas) {
        this.paginaActual++;
        this.paginarResultadosLocales();
      }
    } else {
      // Si no estamos en modo búsqueda, usar el servicio de paginación
      this.articulosPaginadosService.paginaSiguiente();
    }
  }
  
  paginaAnterior() {
    if (this.terminoBusqueda && this.productosFiltrados.length > 0) {
      // Si estamos en modo búsqueda, paginar localmente
      if (this.paginaActual > 1) {
        this.paginaActual--;
        this.paginarResultadosLocales();
      }
    } else {
      // Si no estamos en modo búsqueda, usar el servicio de paginación
      this.articulosPaginadosService.paginaAnterior();
    }
  }
  
  // Limpiar búsqueda
  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.productosFiltrados = [];
    
    // Volver a cargar la primera página desde el servidor
    this.articulosPaginadosService.cargarPagina(1).subscribe();
  }
  
  // Obtener números de página visibles en la paginación
  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    // Mostrar más páginas a la vez (10 en lugar de 5)
    let inicio = Math.max(1, this.paginaActual - 5);
    let fin = Math.min(this.totalPaginas, inicio + 9);
    
    // Ajustar inicio si fin está al límite
    if (fin === this.totalPaginas) {
      inicio = Math.max(1, fin - 9);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  aplicarMultiplicadorPrecio(productos: any[]): any[] {
    if (!this.valoresCambio || this.valoresCambio.length === 0) {
      console.warn('No hay valores de cambio disponibles para aplicar a los precios');
      return productos;
    }

    return productos.map(producto => {
      // Crear una copia del producto para no modificar el original
      const productoCopy = { ...producto };
      
      // Asegurarse de que tipo_moneda sea tratado como número
      const tipoMoneda = productoCopy.tipo_moneda !== undefined ? Number(productoCopy.tipo_moneda) : undefined;
      
      // Verificar si el producto tiene tipo_moneda y es diferente de 1 (asumiendo que 1 es la moneda local)
      if (tipoMoneda !== undefined && tipoMoneda !== 1) {
        // Buscar el valor de cambio correspondiente
        const valorCambio = this.obtenerValorCambio(tipoMoneda);
        
        // Si se encontró un valor de cambio válido y tiene un multiplicador
        if (valorCambio && valorCambio > 0) {
          // Aplicar el multiplicador a los precios
          productoCopy.precon = productoCopy.precon ? productoCopy.precon * valorCambio : productoCopy.precon;
          productoCopy.prefi1 = productoCopy.prefi1 ? productoCopy.prefi1 * valorCambio : productoCopy.prefi1;
          productoCopy.prefi2 = productoCopy.prefi2 ? productoCopy.prefi2 * valorCambio : productoCopy.prefi2;
          productoCopy.prefi3 = productoCopy.prefi3 ? productoCopy.prefi3 * valorCambio : productoCopy.prefi3;
          productoCopy.prefi4 = productoCopy.prefi4 ? productoCopy.prefi4 * valorCambio : productoCopy.prefi4;
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
    
    // Asegurar que codMoneda sea un número
    const codMonedaNum = Number(codMoneda);
    
    // Filtrar todos los valores de cambio para esta moneda, asegurando comparación numérica
    const valoresCambioMoneda = this.valoresCambio.filter(vc => Number(vc.codmone) === codMonedaNum);
    
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
    
    // Asegurar que codMoneda sea un número
    const codMonedaNum = Number(codMoneda);
    
    const moneda = this.tiposMoneda.find(m => Number(m.cod_mone) === codMonedaNum);
    return moneda ? moneda.moneda : `Moneda ${codMonedaNum}`;
  }

  obtenerSimboloMoneda(codMoneda: number): string {
    // Asegurar que codMoneda sea un número
    const codMonedaNum = Number(codMoneda);
    
    if (!codMonedaNum || codMonedaNum === 1) return '$';
    
    const moneda = this.tiposMoneda.find(m => Number(m.cod_mone) === codMonedaNum);
    return moneda && moneda.simbolo ? moneda.simbolo : '$';
  }

  showNotification(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'Aceptar'
    });
  }
} */

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