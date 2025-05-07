import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { FormGroup, FormControl } from '@angular/forms';
import { ArticulosPaginadosService } from '../../services/articulos-paginados.service';
import { Subscription, forkJoin } from 'rxjs';

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
  _precioError?: boolean; // Flag para marcar precios con error de conversión
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
  selector: 'app-articulos',
  templateUrl: './articulos.component.html',
  styleUrls: ['./articulos.component.css'],
  providers: [ArticulosPaginadosService]
})
export class ArticulosComponent implements OnInit, OnDestroy {
  
  public articulos: Articulo[] = [];
  public articulosOriginal: Articulo[] = [];
  public valoresCambio: ValorCambio[] = [];
  public tiposMoneda: TipoMoneda[] = [];
  public confLista: any[] = [];
  cols: Column[];
  _selectedColumns: Column[];
  
  // Propiedades para paginación
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  public terminoBusqueda = '';
  
  // Propiedades para carga
  public loading = false;
  public fromCache = false;
  public tienePreciosConError = false;
  
  // Subscriptions for clean up
  private subscriptions: Subscription[] = [];
  
  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService,
    private articulosPaginadosService: ArticulosPaginadosService,
    private cdr: ChangeDetectorRef
  ) {
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
      { field: 'precostosi', header: 'Costo s/IVA' },
      { field: 'margen', header: 'Margen' },
      { field: 'descuento', header: 'Descuento' },
      { field: 'tipo_moneda', header: 'Tipo Moneda' }
    ];
    
    this._selectedColumns = [
      this.cols[0], // cd_articulo
      this.cols[1], // nomart
      this.cols[2], // marca
      this.cols[3], // precon
      this.cols[4], // prefi1 (precio1)
      this.cols[5], // prefi2 (precio2)
      this.cols[6], // prefi3 (precio3)
      this.cols[7], // prefi4 (precio4)
      this.cols[14], // rubro
      this.cols[15]  // estado
    ];
  }

  ngOnInit() {
    console.log('ArticulosComponent initialized');
    
    // Reiniciar el contador de reintentos
    this.resetRetryCount();
    
    // Subscribe to loading state
    this.subscriptions.push(
      this.articulosPaginadosService.cargando$.subscribe(loading => {
        this.loading = loading;
        console.log('Loading state changed:', loading);
      })
    );
    
    // Subscribe to articulos
    this.subscriptions.push(
      this.articulosPaginadosService.articulos$.subscribe(articulos => {
        this.articulos = articulos;
        this.articulosOriginal = articulos;
        console.log('Articulos updated:', articulos.length);
        this.processArticulos();
      })
    );
    
    // Subscribe to pagination data
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
    
    // Load additional data needed (valores cambio, tipos moneda, conf lista)
    this.loadAdditionalData();
    
    // Load initial page of data
    this.articulosPaginadosService.cargarPagina(1).subscribe(
      () => {},
      error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los artículos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }
  
  // Load additional data needed for price conversion
  loadAdditionalData() {
    Swal.fire({
      title: 'Cargando datos',
      text: 'Cargando información adicional...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Load all additional data in parallel
    forkJoin({
      valoresCambio: this.articulosPaginadosService.getValoresCambio(),
      tiposMoneda: this.articulosPaginadosService.getTiposMoneda(),
      confLista: this.articulosPaginadosService.getConfLista()
    }).subscribe(
      results => {
        if (results.valoresCambio && !results.valoresCambio['error']) {
          this.valoresCambio = results.valoresCambio['mensaje'];
        }
        
        if (results.tiposMoneda && !results.tiposMoneda['error']) {
          this.tiposMoneda = results.tiposMoneda['mensaje'];
        }
        
        if (results.confLista && !results.confLista['error']) {
          this.confLista = results.confLista['mensaje'];
        }
        
        Swal.close();
      },
      error => {
        console.error('Error loading additional data:', error);
        Swal.fire({
          title: 'Error',
          text: 'Error al cargar datos adicionales',
          icon: 'warning',
          confirmButtonText: 'Continuar de todos modos'
        });
      }
    );
  }
  
  // Método para reiniciar el contador de reintentos
  private resetRetryCount() {
    this.retryCount = 0;
    console.log('Contador de reintentos reiniciado');
  }
  
  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }
  
  set selectedColumns(val: Column[]) {
    // Restaurar orden original
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }

  // Variables para la búsqueda a nivel de cliente
  productosCompletos: any[] = [];
  productosFiltrados: any[] = [];

  // Buscar artículos
  buscar() {
    if (!this.terminoBusqueda.trim()) {
      this.limpiarBusqueda();
      return;
    }
    
    // Si no tenemos todos los productos cargados, los cargamos primero
    if (this.productosCompletos.length === 0) {
      this.mostrarLoading();
      
      // Cargar todos los productos una sola vez
      this.cargardataService.artsucursal().subscribe({
        next: (response: any) => {
          console.log('Respuesta de artsucursal para articulos:', response);
          
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
          
          console.log('Artículos extraídos para búsqueda:', articulos.length);
          
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
    console.log('Buscando el término en articulos:', termino);
    console.log('En total productos para articulos:', this.productosCompletos.length);
    
    // Inspeccionar los primeros 5 productos para entender la estructura
    console.log('Muestra de productos:', this.productosCompletos.slice(0, 5));
    
    // Filtrar productos localmente
    this.productosFiltrados = this.productosCompletos.filter(producto => {
      // Primero verificamos si el producto tiene los campos necesarios
      if (!producto) return false;
      
      // Asegurar que todos los campos se conviertan a string para búsqueda segura
      // Buscar principalmente en nomart y marca
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
    
    console.log('Productos filtrados encontrados en articulos:', this.productosFiltrados.length);
    
    // Actualizar contadores de paginación para la UI
    this.totalItems = this.productosFiltrados.length;
    this.totalPaginas = Math.ceil(this.totalItems / 50); // 50 ítems por página por defecto
    this.paginaActual = 1;
    
    // Aplicar paginación a los resultados
    this.paginarResultadosLocales();
    
    // Si no hay resultados, mostrar un mensaje amigable
    if (this.articulos.length === 0) {
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
    const inicio = (this.paginaActual - 1) * 50; // 50 ítems por página por defecto
    const fin = inicio + 50;
    
    // Obtener los productos para la página actual
    const productosPagina = this.productosFiltrados.slice(inicio, fin);
    
    // Aplicar multiplicador y actualizar la variable articulos
    this.articulos = this.aplicarMultiplicadorPrecio(productosPagina);
  }
  
  // Limpiar búsqueda
  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.productosFiltrados = [];
    
    // Volver a cargar la primera página desde el servidor
    this.articulosPaginadosService.cargarPagina(1).subscribe();
  }
  
  // Método para mostrar el indicador de carga
  mostrarLoading() {
    Swal.fire({
      title: 'Cargando datos',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
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
  
  // Obtener números de página visibles en la paginación
  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    // Ampliar de 5 a 10 páginas visibles (mostrar 10 páginas a la vez)
    const numerosPaginasVisibles = 10;
    const paginasACadaLado = Math.floor(numerosPaginasVisibles / 2);
    
    let inicio = Math.max(1, this.paginaActual - paginasACadaLado);
    let fin = Math.min(this.totalPaginas, inicio + numerosPaginasVisibles - 1);
    
    // Ajustar inicio si fin está al límite
    if (fin === this.totalPaginas) {
      inicio = Math.max(1, fin - numerosPaginasVisibles + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  // Force refresh all data from API
  forceRefresh() {
    console.log('Force refresh requested');
    
    // Reiniciar el contador de reintentos al forzar recarga
    this.resetRetryCount();
    
    // Show loading indicator
    Swal.fire({
      title: 'Actualizando datos',
      text: 'Obteniendo datos actualizados del servidor...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Reload additional data and current page
    forkJoin({
      valoresCambio: this.articulosPaginadosService.getValoresCambio(),
      tiposMoneda: this.articulosPaginadosService.getTiposMoneda(),
      confLista: this.articulosPaginadosService.getConfLista(),
      articulos: this.articulosPaginadosService.cargarPagina(1)
    }).subscribe(
      results => {
        if (results.valoresCambio && !results.valoresCambio['error']) {
          this.valoresCambio = results.valoresCambio['mensaje'];
        }
        
        if (results.tiposMoneda && !results.tiposMoneda['error']) {
          this.tiposMoneda = results.tiposMoneda['mensaje'];
        }
        
        if (results.confLista && !results.confLista['error']) {
          this.confLista = results.confLista['mensaje'];
        }
        
        Swal.close();
      },
      error => {
        console.error('Error refreshing data:', error);
        Swal.fire({
          title: 'Error',
          text: 'Error al actualizar los datos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  // Process articles with prices
  processArticulos() {
    console.log('Processing articulos, count:', this.articulosOriginal.length);
    
    if (!this.articulosOriginal || this.articulosOriginal.length === 0) {
      console.warn('No original articulos to process');
      this.articulos = [];
      return;
    }
    
    try {
      // Make a copy of the original articles
      let articulosConPrecios = [...this.articulosOriginal];
      
      // Apply exchange rate multiplier to each article
      articulosConPrecios = this.aplicarMultiplicadorPrecio(articulosConPrecios);
      
      // Assign the articles with updated prices
      this.articulos = articulosConPrecios;
      
      // Restablecer indicador de error
      this.tienePreciosConError = false;
      
      console.log('Artículos procesados correctamente:', this.articulos.length);
    } catch (error) {
      console.error('Error processing articulos:', error);
      
      // Intento de solución parcial: procesar solo artículos en moneda local
      try {
        console.log('Intentando procesamiento parcial (solo artículos en moneda local)');
        const articulosMonedaLocal = this.articulosOriginal.filter(a => !a.tipo_moneda || a.tipo_moneda === 1);
        const articulosMonedaExtranjera = this.articulosOriginal.filter(a => a.tipo_moneda && a.tipo_moneda !== 1);
        
        // Usar artículos en moneda local sin cambios
        this.articulos = [
          ...articulosMonedaLocal,
          ...articulosMonedaExtranjera.map(a => ({ ...a, _precioError: true })) // Marcar con error
        ];
        
        // Actualizar indicador de errores de precio
        this.tienePreciosConError = true;
        
        // Notificar al usuario del problema
        this.mostrarNotificacionErrorPrecios();
      } catch (fallbackError) {
        console.error('Error en procesamiento de fallback:', fallbackError);
        // Como último recurso, usar originales
        this.articulos = [...this.articulosOriginal];
        this.tienePreciosConError = true;
        this.mostrarNotificacionErrorPrecios(true);
      }
    }
  }
  
  // Contador de reintentos
  private retryCount = 0;
  private maxRetries = 3; // Número máximo de reintentos

  // Método para reintentar la carga con límite de reintentos
  retryLoading() {
    // Incrementar contador de reintentos
    this.retryCount++;
    
    console.log(`Ejecutando reintento de carga de datos (${this.retryCount}/${this.maxRetries})`);
    
    // Verificar si se alcanzó el límite de reintentos
    if (this.retryCount > this.maxRetries) {
      console.warn(`Se alcanzó el límite máximo de ${this.maxRetries} reintentos`);
      
      // Mostrar mensaje al usuario indicando que se alcanzó el límite
      Swal.fire({
        title: 'Límite de reintentos alcanzado',
        text: 'No fue posible conectar con el servidor después de varios intentos. Por favor, seleccione una opción:',
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Intentar con página diferente',
        denyButtonText: 'Refrescar página',
        cancelButtonText: 'Intentar más tarde',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          // Intentar cargar otra página
          this.articulosPaginadosService.cargarPagina(1).subscribe();
        } else if (result.isDenied) {
          // Refrescar la página
          window.location.reload();
        }
        // Si cancela, simplemente no hace nada (intentar más tarde)
      });
      
      return; // Salir sin intentar cargar de nuevo
    }
    
    // Si no se ha alcanzado el límite, mostrar indicador de carga y reintentar
    Swal.fire({
      title: 'Reintentando',
      text: `Reintentando cargar datos desde el servidor... (Intento ${this.retryCount}/${this.maxRetries})`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Reintento 
    this.articulosPaginadosService.cargarPagina(this.paginaActual).subscribe(
      () => {
        Swal.close();
      },
      error => {
        console.error('Error en reintento:', error);
        // Reintentar de nuevo
        Swal.close();
        setTimeout(() => this.retryLoading(), 1000);
      }
    );
  }

  aplicarMultiplicadorPrecio(articulos: Articulo[]): Articulo[] {
    if (!this.valoresCambio || this.valoresCambio.length === 0) {
      console.warn('No hay valores de cambio disponibles para aplicar a los precios');
      return articulos;
    }

    console.log(`Aplicando multiplicador de precio a ${articulos.length} artículos`);
    
    return articulos.map(articulo => {
      try {
        // Crear una copia del artículo para no modificar el original
        const articuloCopy = { ...articulo };
        
        // Asegurarse de que tipo_moneda sea tratado como número
        const tipoMoneda = articuloCopy.tipo_moneda !== undefined ? Number(articuloCopy.tipo_moneda) : undefined;
        
        // Verificar si el artículo tiene tipo_moneda y es diferente de 1 (asumiendo que 1 es la moneda local)
        if (tipoMoneda !== undefined && tipoMoneda !== 1) {
          // Buscar el valor de cambio correspondiente
          const valorCambio = this.obtenerValorCambio(tipoMoneda);
          
          // Si se encontró un valor de cambio válido y tiene un multiplicador
          if (valorCambio && valorCambio > 0) {
            // Aplicar el multiplicador directamente a TODOS los precios
            // Asegurarse de que los valores no sean nulos antes de multiplicar
            articuloCopy.precon = articuloCopy.precon ? articuloCopy.precon * valorCambio : 0;
            articuloCopy.prebsiva = articuloCopy.prebsiva ? articuloCopy.prebsiva * valorCambio : 0;
            articuloCopy.precostosi = articuloCopy.precostosi ? articuloCopy.precostosi * valorCambio : 0;
            
            // Aplicar el mismo multiplicador a todos los precios prefijados sin excepciones
            articuloCopy.prefi1 = articuloCopy.prefi1 ? articuloCopy.prefi1 * valorCambio : 0;
            articuloCopy.prefi2 = articuloCopy.prefi2 ? articuloCopy.prefi2 * valorCambio : 0;
            articuloCopy.prefi3 = articuloCopy.prefi3 ? articuloCopy.prefi3 * valorCambio : 0;
            articuloCopy.prefi4 = articuloCopy.prefi4 ? articuloCopy.prefi4 * valorCambio : 0;
          }
        }
        
        return articuloCopy;
      } catch (error) {
        console.error('Error al procesar artículo:', error);
        return articulo; // Devolver el artículo original en caso de error
      }
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

  editArticulo(articulo: Articulo) {
    // Buscar el artículo original por ID en la lista de artículos originales
    const articuloOriginal = this.articulosOriginal.find(a => a.id_articulo === articulo.id_articulo);
    
    if (articuloOriginal) {
      // Si se encuentra, usar ese artículo original sin transformación
      this.router.navigate(['components/editarticulo'], {
        queryParams: {
          articulo: JSON.stringify(articuloOriginal)
        }
      });
    } else {
      // Intentar obtener el artículo original de la API
      this.cargardataService.getArticuloById(articulo.id_articulo).subscribe({
        next: (response: any) => {
          if (!response.error && response.mensaje) {
            // Si la API devuelve datos, usar esos datos sin transformación
            this.router.navigate(['components/editarticulo'], {
              queryParams: {
                articulo: JSON.stringify(response.mensaje)
              }
            });
          } else {
            // Como último recurso, usar el artículo con transformación
            this.router.navigate(['components/editarticulo'], {
              queryParams: {
                articulo: JSON.stringify(articulo)
              }
            });
          }
        },
        error: (error) => {
          console.error('Error al obtener artículo por ID:', error);
          // En caso de error, usar el artículo con transformación como último recurso
          this.router.navigate(['components/editarticulo'], {
            queryParams: {
              articulo: JSON.stringify(articulo)
            }
          });
        }
      });
    }
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
    this.loading = true;
    this.subirdataService.eliminarArticulo(articulo.id_articulo).subscribe({
      next: (response: any) => {
        if (!response.error) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'El artículo se eliminó correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          // Reload current page
          this.articulosPaginadosService.cargarPagina(this.paginaActual).subscribe();
        } else {
          this.loading = false;
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
        this.loading = false;
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
  
  /**
   * Muestra una notificación al usuario sobre problemas con el procesamiento de precios
   * @param errorTotal Si es true, indica un error total en el procesamiento de precios
   */
  private mostrarNotificacionErrorPrecios(errorTotal = false) {
    const mensaje = errorTotal 
      ? 'Error grave al procesar precios. Los precios mostrados pueden ser incorrectos.'
      : 'Algunos precios en moneda extranjera podrían no mostrarse correctamente.';
      
    Swal.fire({
      title: 'Advertencia',
      text: mensaje,
      icon: 'warning',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000
    });
  }

  /**
   * Verifica que la configuración de listas de precios tenga todas las entradas necesarias
   * @param confLista Array con la configuración de listas de precios
   * @returns boolean indicando si la configuración es válida
   */
  verificarIntegridadConfLista(confLista: any[]): boolean {
    if (!confLista || confLista.length === 0) {
      console.warn('verificarIntegridadConfLista: No hay datos de configuración');
      return false;
    }

    // Verificar que haya al menos una configuración para cada lista y cada moneda común
    // Típicamente deberíamos tener al menos 4 listas (1-4) para moneda base (1)
    const tiposMonedasDisponibles = this.tiposMoneda.length > 0 ? 
      this.tiposMoneda.map(m => Number(m.cod_mone)) : [1]; // Si no hay monedas, al menos verificar moneda base
    
    // Verificar que existan configuraciones para las listas 1-4 en la moneda principal
    const listasNecesarias = [1, 2, 3, 4]; // Listas críticas que deberían estar configuradas
    let configuracionCompleta = true;
    
    // Verificar cada lista necesaria para la moneda base (tipomone=1)
    listasNecesarias.forEach(lista => {
      const configLista = confLista.find((config: any) => 
        Number(config.listap) === lista && Number(config.tipomone) === 1
      );
      
      if (!configLista) {
        console.warn(`verificarIntegridadConfLista: Falta configuración para lista ${lista} en moneda base`);
        configuracionCompleta = false;
      } else {
        // Verificar que tenga los campos necesarios
        if (typeof configLista.preciof21 === 'undefined' || 
            typeof configLista.preciof105 === 'undefined') {
          console.warn(`verificarIntegridadConfLista: Configuración incompleta para lista ${lista}`);
          configuracionCompleta = false;
        }
      }
    });
    
    return configuracionCompleta;
  }
  
  // Ver detalles de un artículo
  verDetalles(articulo: any) {
    Swal.fire({
      title: articulo.nomart,
      html: `
        <div class="text-left">
          <p><strong>Código:</strong> ${articulo.cd_articulo}</p>
          <p><strong>Marca:</strong> ${articulo.marca}</p>
          <p><strong>Precio:</strong> ${articulo.precon}</p>
          <p><strong>Stock:</strong> ${articulo.exi1}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  }
  
  // Método auxiliar para PrimeNG
  $any(val: any): any {
    return val;
  }
}