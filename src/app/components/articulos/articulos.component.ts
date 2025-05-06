import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from '../../services/subirdata.service';
import { FormGroup, FormControl } from '@angular/forms';
import { ArticulosCacheService } from '../../services/articulos-cache.service';
import { Subscription } from 'rxjs';

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
export class ArticulosComponent implements OnInit, OnDestroy {
  
  public articulos: Articulo[] = [];
  public articulosOriginal: Articulo[] = [];
  public valoresCambio: ValorCambio[] = [];
  public tiposMoneda: TipoMoneda[] = [];
  public confLista: any[] = [];
  cols: Column[];
  _selectedColumns: Column[];
  
  // New properties for caching
  public loading = false;
  public fromCache = false;
  
  // Subscriptions for clean up
  private subscriptions: Subscription[] = [];
  
  constructor(
    private router: Router,
    private subirdataService: SubirdataService,
    private cargardataService: CargardataService,
    private articulosCacheService: ArticulosCacheService
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
      this.articulosCacheService.loading$.subscribe(loading => {
        this.loading = loading;
        console.log('Loading state changed:', loading);
      })
    );
    
    // Load data from cache or API
    this.loadData();
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
    
    // Clear cache and reload from API
    this.articulosCacheService.clearAllCaches();
    this.loadData(true);
  }
  
  // Load data from cache or API
  loadData(forceRefresh = false) {
    console.log('Loading data, forceRefresh:', forceRefresh);
    this.loading = true;
    this.fromCache = false;
    
    // If not forcing refresh, try to get from cache first
    if (!forceRefresh) {
      console.log('Checking for cached data');
      const cachedValoresCambio = this.articulosCacheService.getValoresCambio();
      const cachedTiposMoneda = this.articulosCacheService.getTiposMoneda();
      const cachedConfLista = this.articulosCacheService.getConfLista();
      const cachedArticulos = this.articulosCacheService.getArticulos();
      
      console.log('Cache check results:', {
        valoresCambio: cachedValoresCambio.length,
        tiposMoneda: cachedTiposMoneda.length,
        confLista: cachedConfLista.length,
        articulos: cachedArticulos.length
      });
      
      // If we have all cached data, use it
      if (cachedValoresCambio.length > 0 && 
          cachedTiposMoneda.length > 0 && 
          cachedConfLista.length > 0 && 
          cachedArticulos.length > 0) {
        
        console.log('Using cached data');
        this.valoresCambio = cachedValoresCambio;
        this.tiposMoneda = cachedTiposMoneda;
        this.confLista = cachedConfLista;
        this.articulosOriginal = cachedArticulos;
        
        // Verificar la integridad de los datos críticos
        const confListaValida = this.verificarIntegridadConfLista(cachedConfLista);
        if (!confListaValida) {
          console.warn('La configuración de listas en caché está incompleta o es inválida');
          // No bloqueamos el uso, pero registramos la advertencia y notificamos al usuario
          const notificacion = 'La configuración de precios puede estar incompleta. Considere actualizar los datos.';
          setTimeout(() => {
            Swal.fire({
              title: 'Advertencia',
              text: notificacion,
              icon: 'warning',
              confirmButtonText: 'Entendido',
              timer: 5000
            });
          }, 1000);
        }
        
        // Process the data
        this.processArticulos();
        
        // Mark as loaded from cache
        this.fromCache = true;
        this.loading = false;
        return;
      } else {
        console.log('Incomplete cached data, loading from API');
        // Log específicamente qué datos faltan para mejor diagnóstico
        if (cachedValoresCambio.length === 0) console.warn('Faltan valores de cambio en caché');
        if (cachedTiposMoneda.length === 0) console.warn('Faltan tipos de moneda en caché');
        if (cachedConfLista.length === 0) console.warn('Falta configuración de listas en caché');
        if (cachedArticulos.length === 0) console.warn('Faltan artículos en caché');
      }
    } else {
      console.log('Force refresh requested, loading from API');
    }
    
    // If we got here, we need to load from API
    console.log('Loading data from API');
    this.subscriptions.push(
      this.articulosCacheService.loadAllData().subscribe({
        next: (success) => {
          console.log('Data loaded from API, success:', success);
          
          // Get data from cache service
          this.valoresCambio = this.articulosCacheService.getValoresCambio();
          this.tiposMoneda = this.articulosCacheService.getTiposMoneda();
          this.confLista = this.articulosCacheService.getConfLista();
          this.articulosOriginal = this.articulosCacheService.getArticulos();
          
          console.log('Retrieved data from cache service:', {
            valoresCambio: this.valoresCambio.length,
            tiposMoneda: this.tiposMoneda.length,
            confLista: this.confLista.length,
            articulos: this.articulosOriginal.length
          });
          
          // Check if we actually got data
          if (this.valoresCambio.length > 0 && 
              this.tiposMoneda.length > 0 && 
              this.articulosOriginal.length > 0) {
            
            // Process the data
            this.processArticulos();
            this.loading = false;
            
            // Close loading if active
            if (Swal.isVisible()) {
              Swal.close();
            }
          } else {
            console.error('Data loading incomplete, some arrays are empty');
            this.handleLoadError('Error al cargar los datos: información incompleta');
          }
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.handleLoadError('Error al cargar los datos desde el servidor');
        }
      })
    );
  }
  
  // Process articles with prices
  processArticulos() {
    console.log('Processing articulos, original count:', this.articulosOriginal.length);
    
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
      
      console.log('Artículos procesados correctamente:', this.articulos.length);
    } catch (error) {
      console.error('Error processing articulos:', error);
      // Use originals as fallback
      this.articulos = [...this.articulosOriginal]; 
      console.log('Using original articles as fallback due to processing error');
    }
  }
  
  handleLoadError(message: string) {
    console.error('Error handler called:', message);
    
    // Close loading if active
    if (Swal.isVisible()) {
      Swal.close();
    }
    
    const cachedArticulos = this.articulosCacheService.getArticulos();
    const cachedConfLista = this.articulosCacheService.getConfLista();
    const cachedValoresCambio = this.articulosCacheService.getValoresCambio();
    const cachedTiposMoneda = this.articulosCacheService.getTiposMoneda();
    
    // Verificar disponibilidad de todos los conjuntos de datos
    const hasCachedArticulos = this.articulosOriginal.length > 0 || cachedArticulos.length > 0;
    const hasCachedConfLista = this.confLista.length > 0 || cachedConfLista.length > 0;
    const hasCachedValoresCambio = this.valoresCambio.length > 0 || cachedValoresCambio.length > 0;
    const hasCachedTiposMoneda = this.tiposMoneda.length > 0 || cachedTiposMoneda.length > 0;
    
    // Consideramos que hay datos en caché si al menos tenemos artículos
    const hasCachedData = hasCachedArticulos;
    
    // Construir mensaje descriptivo
    let messageDetail = message;
    if (hasCachedData) {
      messageDetail += '\n\nDatos disponibles en caché:';
      messageDetail += hasCachedArticulos ? '\n✓ Artículos' : '\n✗ Faltan artículos';
      messageDetail += hasCachedConfLista ? '\n✓ Configuración de listas' : '\n✗ Falta configuración de listas';
      messageDetail += hasCachedValoresCambio ? '\n✓ Valores de cambio' : '\n✗ Faltan valores de cambio';
      messageDetail += hasCachedTiposMoneda ? '\n✓ Tipos de moneda' : '\n✗ Faltan tipos de moneda';
    }
    
    if (hasCachedData) {
      // Si hay datos en caché, ofrecer opciones para mantenerlos o reintentar
      Swal.fire({
        title: 'Error',
        text: messageDetail,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reintentar carga',
        cancelButtonText: 'Usar datos anteriores',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          // Reintentar la carga
          console.log('Reintentando carga de datos desde API');
          this.retryLoading();
        } else {
          // Usar datos anteriores (caché o los actuales ya cargados)
          console.log('Usando datos anteriores como alternativa');
          this.useFallbackData(cachedArticulos);
        }
      });
    } else {
      // Si no hay datos en caché, solo ofrecer la opción de reintentar
      Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonText: 'Reintentar',
        showCancelButton: true,
        cancelButtonText: 'Aceptar'
      }).then((result) => {
        if (result.isConfirmed) {
          // Reintentar la carga
          this.retryLoading();
        }
      });
    }
    
    this.loading = false;
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
        confirmButtonText: 'Usar datos en caché',
        denyButtonText: 'Refrescar página',
        cancelButtonText: 'Intentar más tarde',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          // Usar datos en caché si están disponibles
          const cachedArticulos = this.articulosCacheService.getArticulos();
          this.useFallbackData(cachedArticulos);
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
    
    // Reintento sin limpiar caché (útil cuando el problema fue de conexión temporal)
    this.loadData(true);
  }
  
  // Nuevo método para usar datos de respaldo
  useFallbackData(cachedArticulos: any[]) {
    if (this.articulosOriginal.length > 0) {
      // Si ya tenemos datos cargados, verificar que todos los datos relacionados estén disponibles
      console.log('Usando artículos ya cargados en memoria como alternativa');
      if (this.confLista.length === 0) {
        // Si falta confLista, intentar cargar desde caché
        const cachedConfLista = this.articulosCacheService.getConfLista();
        if (cachedConfLista.length > 0) {
          console.log('Cargando confLista desde caché para completar datos');
          this.confLista = cachedConfLista;
        } else {
          console.warn('No se encontró confLista en caché. Los precios de lista podrían ser incorrectos.');
        }
      }
      this.processArticulos();
    } else if (cachedArticulos.length > 0) {
      // Si hay datos en caché, usarlos
      console.log('Usando artículos en caché como alternativa');
      this.articulosOriginal = cachedArticulos;
      
      // Intentar cargar TODOS los datos relacionados desde caché
      const cachedValoresCambio = this.articulosCacheService.getValoresCambio();
      const cachedTiposMoneda = this.articulosCacheService.getTiposMoneda();
      const cachedConfLista = this.articulosCacheService.getConfLista();
      
      // Verificar y cargar cada conjunto de datos
      if (cachedValoresCambio.length > 0) {
        console.log(`Cargando ${cachedValoresCambio.length} registros de valoresCambio desde caché`);
        this.valoresCambio = cachedValoresCambio;
      } else {
        console.warn('No se encontraron datos de valores de cambio en caché');
      }
      
      if (cachedTiposMoneda.length > 0) {
        console.log(`Cargando ${cachedTiposMoneda.length} registros de tiposMoneda desde caché`);
        this.tiposMoneda = cachedTiposMoneda;
      } else {
        console.warn('No se encontraron datos de tipos de moneda en caché');
      }
      
      if (cachedConfLista.length > 0) {
        console.log(`Cargando ${cachedConfLista.length} registros de confLista desde caché`);
        this.confLista = cachedConfLista;
      } else {
        console.warn('No se encontraron datos de configuración de listas en caché');
      }
      
      // Verificar si tenemos datos críticos antes de procesar
      const datosCompletos = this.valoresCambio.length > 0 && 
                             this.tiposMoneda.length > 0 && 
                             this.confLista.length > 0;
      
      this.processArticulos();
      
      // Informar al usuario con mensaje específico según los datos disponibles
      let mensaje = 'Usando datos almacenados en caché.';
      if (!datosCompletos) {
        mensaje += ' ADVERTENCIA: Algunos datos de configuración están incompletos.';
        if (this.confLista.length === 0) {
          mensaje += ' Falta configuración de listas de precios.';
        }
        if (this.valoresCambio.length === 0) {
          mensaje += ' Faltan valores de cambio.';
        }
        if (this.tiposMoneda.length === 0) {
          mensaje += ' Faltan tipos de moneda.';
        }
      } else {
        mensaje += ' Algunos precios podrían no estar actualizados.';
      }
      
      Swal.fire({
        title: 'Información',
        text: mensaje,
        icon: datosCompletos ? 'info' : 'warning',
        confirmButtonText: 'Entendido'
      });
    }
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
        
        // Verificar si el artículo tiene tipo_moneda y es diferente de 1 (asumiendo que 1 es la moneda local)
        if (articuloCopy.tipo_moneda && articuloCopy.tipo_moneda !== 1) {
          // Buscar el valor de cambio correspondiente directamente usando tipo_moneda como codmone
          const valorCambio = this.obtenerValorCambio(articuloCopy.tipo_moneda);
          
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
          // Clear cache and reload after deletion
          this.articulosCacheService.clearAllCaches();
          this.loadData(true);
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
    
    const moneda = this.tiposMoneda.find(m => m.cod_mone === codMoneda);
    return moneda ? moneda.moneda : `Moneda ${codMoneda}`;
  }

  obtenerSimboloMoneda(codMoneda: number): string {
    if (!codMoneda || codMoneda === 1) return '$';
    
    const moneda = this.tiposMoneda.find(m => m.cod_mone === codMoneda);
    return moneda && moneda.simbolo ? moneda.simbolo : '$';
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
}
