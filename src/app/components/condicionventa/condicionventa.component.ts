import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { ArticulosPaginadosService } from '../../services/articulos-paginados.service';
import { Producto } from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FilterPipe } from 'src/app/pipes/filter.pipe';
import { filter } from 'rxjs/operators';
import { first, take } from 'rxjs/operators';
import { Subscription, forkJoin } from 'rxjs';
//importar componente calculoproducto
import { CalculoproductoComponent } from '../calculoproducto/calculoproducto.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

// Método auxiliar para PrimeNG
function $any(val: any): any {
  return val;
}

// Definir la interfaz Column para la selección de columnas
interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-condicionventa',
  templateUrl: './condicionventa.component.html',
  styleUrls: ['./condicionventa.component.css'],
  providers: [DialogService]
})
export class CondicionventaComponent implements OnInit, OnDestroy {
  public tipoVal: string = 'Condicion de Venta';
  private subscriptions: Subscription[] = [];
  public codTarj: string = '';
  public listaPrecio: string = '';
  public activaDatos: number;
  public tipo: any[] = [];
  searchText: string;
  ref: DynamicDialogRef | undefined;
  public prefi0: boolean = false;
  public prefi1: boolean = false;
  public prefi2: boolean = false;
  public prefi3: boolean = false;
  public prefi4: boolean = false;
  public tarjeta = {
    Titular: '',
    Dni: '',
    Numero: '',
    Autorizacion: ''
  };
  public cheque = {
    Banco: '',
    Ncuenta: '',
    Ncheque: '',
    Nombre: '',
    Plaza: '',
    ImporteImputar: '',
    ImporteCheque: '',
    FechaCheque: ''
  };
  public productos: Producto[];
  public productoElejido: Producto;
  public clienteFrompuntoVenta: any;
  public tarjetaFlag: boolean = false;
  public chequeFlag: boolean = false;
  public previousUrl: string = "";
  filteredTipo: any[] = [];
  
  // Propiedades para valores de cambio
  public valoresCambio: any[] = [];
  public tiposMoneda: any[] = [];
  
  // Propiedades para paginación
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  public terminoBusqueda = '';
  public loading = false;

  // Añadir nuevas propiedades para la selección de columnas
  cols: Column[];
  _selectedColumns: Column[];

  constructor(
    public dialogService: DialogService, 
    private cdr: ChangeDetectorRef, 
    private router: Router, 
    private activatedRoute: ActivatedRoute, 
    private _cargardata: CargardataService,
    private articulosPaginadosService: ArticulosPaginadosService
  ) {
    this.clienteFrompuntoVenta = this.activatedRoute.snapshot.queryParamMap.get('cliente');
    this.clienteFrompuntoVenta = JSON.parse(this.clienteFrompuntoVenta);
    this._cargardata.tarjcredito().pipe(take(1)).subscribe((resp: any) => {
      this.tipo = resp.mensaje;//.tarjeta;
      console.log(this.tipo);
      this.filterByDay();
      // Cerrar loading
      Swal.close();
    }, error => {
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos de tarjetas'
      });
    });
    
    // Definir todas las columnas disponibles
    this.cols = [
      { field: 'nomart', header: 'Nombre' },
      { field: 'marca', header: 'Marca' },
      { field: 'precon', header: 'Precio 0' },
      { field: 'prefi1', header: 'Precio 1' },
      { field: 'prefi2', header: 'Precio 2' },
      { field: 'prefi3', header: 'Precio 3' },
      { field: 'prefi4', header: 'Precio 4' },
      { field: 'exi1', header: 'Stock Dep' },
      { field: 'exi2', header: 'Stock CC' },
      { field: 'exi3', header: 'Stock VV' },
      { field: 'exi4', header: 'Stock GM' },
      { field: 'exi5', header: 'Stock 5' },
      { field: 'cd_articulo', header: 'Código' },
      { field: 'cd_barra', header: 'Código Barra' },
      { field: 'rubro', header: 'Rubro' },
      { field: 'estado', header: 'Estado' },
    ];
    
    // Definir las columnas seleccionadas por defecto
    this._selectedColumns = [
      this.cols[0], // nomart
      this.cols[1], // marca
      this.cols[2], // precon
      this.cols[7], // exi1
      this.cols[8], // exi2
      this.cols[9], // exi3
      this.cols[10], // exi4
    ];
    
    // Suscribirse a los observables del servicio de paginación
    this.subscriptions.push(
      this.articulosPaginadosService.cargando$.subscribe(loading => {
        this.loading = loading;
      })
    );
    
    this.subscriptions.push(
      this.articulosPaginadosService.articulos$.subscribe(articulos => {
        // Aplicar el procesamiento necesario
        this.productos = this.procesarProductosConMoneda(articulos);
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
    
    // Cargar datos adicionales (valores de cambio, tipos de moneda)
    this.loadAdditionalData();
  }

  // Cargar datos adicionales
  loadAdditionalData() {
    forkJoin({
      valoresCambio: this.articulosPaginadosService.getValoresCambio(),
      tiposMoneda: this.articulosPaginadosService.getTiposMoneda()
    }).subscribe(
      results => {
        if (results.valoresCambio && !results.valoresCambio['error']) {
          this.valoresCambio = results.valoresCambio['mensaje'];
        }
        
        if (results.tiposMoneda && !results.tiposMoneda['error']) {
          this.tiposMoneda = results.tiposMoneda['mensaje'];
        }
        
        // Verificar integridad de datos de cambio
        const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
        if (!datosCambioValidos) {
          console.warn('Los datos de cambio no son completamente válidos');
          // Notificación no bloqueante para el usuario
          Swal.fire({
            title: 'Advertencia',
            text: 'Los datos de tipos de cambio pueden estar incompletos. Los precios de productos en moneda extranjera podrían no ser precisos.',
            icon: 'warning',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000
          });
        }
      },
      error => {
        console.error('Error al cargar datos adicionales:', error);
      }
    );
  }

  // Getters y setters para las columnas seleccionadas
  get selectedColumns(): Column[] {
    return this._selectedColumns;
  }
  
  set selectedColumns(val: Column[]) {
    // Restaurar orden original
    this._selectedColumns = this.cols.filter((col) => val.includes(col));
  }

  filterByDay() {
    const dayOfWeek = new Date().getDay(); // Domingo - 0, Lunes - 1, ..., Sábado - 6
    const dayFieldMap = {
      0: 'd1', // Domingo
      1: 'd2', // Lunes
      2: 'd3', // Martes
      3: 'd4', // Miércoles
      4: 'd5', // Jueves
      5: 'd6', // Viernes
      6: 'd7'  // Sábado
    };
    const dayField = dayFieldMap[dayOfWeek];
    this.filteredTipo = this.tipo.filter(item => item[dayField] === '1');
  }

  ngOnInit() {
    console.log('CondicionVentaComponent inicializado');
    
    // Recuperar la condición de venta seleccionada de sessionStorage
    const condicionGuardada = sessionStorage.getItem('condicionVentaSeleccionada');
    if (condicionGuardada) {
      const condicion = JSON.parse(condicionGuardada);
      this.tipoVal = condicion.tarjeta;
      this.codTarj = condicion.cod_tarj;
      this.listaPrecio = condicion.listaprecio;
    }
  }
  
  ngOnDestroy() {
    // Limpiar el ref de diálogo si existe
    if (this.ref) {
      this.ref.close();
    }
    
    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
  
  // Variables para la búsqueda a nivel de cliente
  productosCompletos: any[] = [];
  productosFiltrados: any[] = [];

  // Buscar artículos - implementado como en el componente articulos
  buscar() {
    if (!this.terminoBusqueda.trim()) {
      this.limpiarBusqueda();
      return;
    }
    
    // Mostrar indicador de carga
    this.loading = true;
    
    // Intentar primero buscar en el servidor si estuviera implementado
    // Nota: Si el API soporta la búsqueda, se debería usar en el servicio como en articulos
    
    // Si no tenemos todos los productos cargados, los cargamos primero
    if (this.productosCompletos.length === 0) {
      this.mostrarLoading();
      
      // Cargar todos los productos una sola vez
      this._cargardata.artsucursal().subscribe({
        next: (response: any) => {
          console.log('Respuesta de artsucursal para condicionventa:', response);
          
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
          
          console.log('Artículos extraídos para condicionventa:', articulos.length);
          
          if (articulos && articulos.length > 0) {
            // Guardar la lista completa
            this.productosCompletos = [...articulos];
            
            // Realizar la búsqueda local
            this.buscarLocal();
            
            Swal.close();
          } else {
            Swal.close();
            this.loading = false;
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
          this.loading = false;
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
  
  // Realizar búsqueda local (implementado como en articulos)
  buscarLocal() {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    console.log('Buscando el término en condicionventa:', termino);
    console.log('En total productos para condicionventa:', this.productosCompletos.length);
    
    // Usar setTimeout para permitir que se muestre el indicador de carga
    setTimeout(() => {
      try {
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
        
        console.log('Productos filtrados encontrados en condicionventa:', this.productosFiltrados.length);
        
        // Actualizar contadores de paginación para la UI
        this.totalItems = this.productosFiltrados.length;
        this.totalPaginas = Math.ceil(this.totalItems / 10); // 10 ítems por página
        this.paginaActual = 1;
        
        // Aplicar paginación a los resultados
        this.paginarResultadosLocales();
        
        // Quitar indicador de carga
        this.loading = false;
        
        // Si no hay resultados, mostrar un mensaje amigable
        if (this.productos.length === 0) {
          Swal.fire({
            title: 'Sin resultados',
            text: `No se encontraron productos que coincidan con "${this.terminoBusqueda}"`,
            icon: 'info',
            confirmButtonText: 'Aceptar'
          });
        }
      } catch (error) {
        console.error('Error en la búsqueda local:', error);
        this.loading = false;
        Swal.fire({
          title: 'Error',
          text: 'Error al procesar la búsqueda',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    }, 100); // Pequeño retraso para permitir que se muestre el indicador de carga
  }
  
  // Paginar resultados localmente
  paginarResultadosLocales() {
    const inicio = (this.paginaActual - 1) * 10;
    const fin = inicio + 10;
    
    // Obtener los productos para la página actual
    const productosPagina = this.productosFiltrados.slice(inicio, fin);
    
    // Aplicar multiplicador y actualizar la variable productos
    this.productos = this.procesarProductosConMoneda(productosPagina);
  }
  
  // Limpiar búsqueda (similar a articulos)
  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.productosFiltrados = [];
    
    // Mostrar indicador de carga
    this.loading = true;
    
    // Volver a cargar la primera página desde el servidor
    this.articulosPaginadosService.cargarPagina(1).subscribe(
      () => {
        this.loading = false;
      },
      error => {
        this.loading = false;
        Swal.fire({
          title: 'Error',
          text: 'Error al cargar productos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
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
  
  // Obtener números de página visibles en la paginación (igual que en articulos)
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
  
  /**
   * Verifica la integridad de los datos críticos para los cambios de moneda
   * @param valoresCambio Lista de valores de cambio
   * @param tiposMoneda Lista de tipos de moneda
   * @returns boolean indicando si los datos son válidos
   */
  verificarIntegridadDatosCambio(valoresCambio: any[], tiposMoneda: any[]): boolean {
    if (!valoresCambio || valoresCambio.length === 0) {
      console.warn('verificarIntegridadDatosCambio: No hay datos de valores de cambio');
      return false;
    }

    if (!tiposMoneda || tiposMoneda.length === 0) {
      console.warn('verificarIntegridadDatosCambio: No hay datos de tipos de moneda');
      return false;
    }

    // Verificar que exista al menos la moneda base (cod_mone = 1)
    // En los productos el campo es tipo_moneda, pero en tiposMoneda el campo es cod_mone
    const tieneMonedasBase = tiposMoneda.some(m => Number(m.cod_mone) === 1);
    
    // Si no encontramos moneda base, registramos pero continuamos
    if (!tieneMonedasBase) {
      console.warn('verificarIntegridadDatosCambio: No se encontró la moneda base (cod_mone=1)');
      console.log('Monedas disponibles:', tiposMoneda.map(m => ({
        moneda: m.moneda,
        cod_mone: m.cod_mone,
        tipo: typeof m.cod_mone
      })));
    }

    // Obtener tipos de moneda extranjera (diferentes a la moneda base)
    const monedasExtranjeras = tiposMoneda.filter(m => Number(m.cod_mone) !== 1);
    
    // Verificar que todas las monedas extranjeras tengan al menos un valor de cambio
    let todasMonedasTienenCambio = true;
    monedasExtranjeras.forEach(moneda => {
      // Aseguramos comparar números, no strings
      const codMonedaNum = Number(moneda.cod_mone);
      const tieneValorCambio = valoresCambio.some(vc => Number(vc.codmone) === codMonedaNum);
      
      if (!tieneValorCambio) {
        console.warn(`verificarIntegridadDatosCambio: La moneda ${moneda.moneda} (cod=${moneda.cod_mone}) no tiene valor de cambio configurado`);
        todasMonedasTienenCambio = false;
      }
    });

    // Verificar que los valores de cambio tengan el campo vcambio definido y mayor a cero
    let todosValoresCambioValidos = true;
    valoresCambio.forEach(vc => {
      if (!vc.vcambio || parseFloat(vc.vcambio) <= 0) {
        console.warn(`verificarIntegridadDatosCambio: Valor de cambio para moneda cod=${vc.codmone} inválido: ${vc.vcambio}`);
        todosValoresCambioValidos = false;
      }
    });

    // Incluso si no hay moneda base, permitimos continuar con una advertencia
    // No bloqueamos completamente la funcionalidad si faltan datos
    if (!tieneMonedasBase) {
      console.warn('ADVERTENCIA: Funcionando sin moneda base definida. Los cálculos de precios pueden ser imprecisos.');
      // Retornamos verdadero si al menos el resto de validaciones son correctas
      return todasMonedasTienenCambio && todosValoresCambioValidos;
    }

    return todasMonedasTienenCambio && todosValoresCambioValidos;
  }

  /**
   * Método para procesar productos con su moneda
   * Aplica el multiplicador de cambio correspondiente a los productos con moneda extranjera
   * @param productos Lista de productos a procesar
   * @returns Lista de productos con precios procesados
   */
  procesarProductosConMoneda(productos: any[]) {
    if (!productos || productos.length === 0) {
      return [];
    }
    
    // Verificar si tenemos datos válidos para conversión
    const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
    
    // Crear copia para no modificar originales
    const productosConversiones = [...productos];
    
    // Contador para productos con problemas de conversión
    let productosConProblemas = 0;
    
    // Procesar cada producto
    productosConversiones.forEach(producto => {
      try {
        // Asegurarse de que tipo_moneda sea tratado como número
        const tipoMoneda = producto.tipo_moneda !== undefined ? Number(producto.tipo_moneda) : undefined;
        
        // Verificar si el producto tiene un tipo de moneda extranjera (diferente de 1 o moneda base)
        if (tipoMoneda !== undefined && tipoMoneda !== 1) {
          // Si los datos de cambio no son válidos, marcar el producto pero continuar intentando
          if (!datosCambioValidos) {
            producto._precioConversionSospechosa = true;
            // No incrementamos contador aquí para evitar doble conteo
          }
          
          // Filtrar los valores de cambio para este tipo de moneda (siempre comparamos números)
          const valoresCambioMoneda = this.valoresCambio.filter(vc => Number(vc.codmone) === tipoMoneda);
          
          // Si hay valores de cambio para este tipo de moneda
          if (valoresCambioMoneda && valoresCambioMoneda.length > 0) {
            let valorCambioSeleccionado;
            
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
            valorCambioSeleccionado = valoresCambioMoneda[0];
            
            if (valorCambioSeleccionado && valorCambioSeleccionado.vcambio) {
              const multiplicador = parseFloat(valorCambioSeleccionado.vcambio);
              
              // Verificar multiplicador válido
              if (multiplicador <= 0) {
                console.warn(`Multiplicador inválido (${multiplicador}) para moneda ${tipoMoneda}`);
                producto._precioConversionSospechosa = true;
                productosConProblemas++;
              } else {
                // Guardar copia de precios originales
                producto._preconOriginal = producto.precon;
                producto._prefi1Original = producto.prefi1;
                producto._prefi2Original = producto.prefi2;
                producto._prefi3Original = producto.prefi3;
                producto._prefi4Original = producto.prefi4;
                
                // Aplicar el multiplicador a todos los precios
                producto.precon = producto.precon ? producto.precon * multiplicador : producto.precon;
                producto.prefi1 = producto.prefi1 ? producto.prefi1 * multiplicador : producto.prefi1;
                producto.prefi2 = producto.prefi2 ? producto.prefi2 * multiplicador : producto.prefi2;
                producto.prefi3 = producto.prefi3 ? producto.prefi3 * multiplicador : producto.prefi3;
                producto.prefi4 = producto.prefi4 ? producto.prefi4 * multiplicador : producto.prefi4;
              }
            } else {
              console.warn(`Valor de cambio no encontrado o inválido para moneda ${tipoMoneda}`);
              producto._precioConversionSospechosa = true;
              productosConProblemas++;
            }
          } else {
            console.warn(`No hay valores de cambio para moneda ${tipoMoneda}`);
            producto._precioConversionSospechosa = true;
            productosConProblemas++;
          }
        }
      } catch (error) {
        console.error('Error al procesar producto con moneda:', error, producto);
        producto._precioConversionSospechosa = true;
        productosConProblemas++;
      }
    });
    
    // Registrar estadísticas de conversión
    if (productosConProblemas > 0) {
      console.warn(`Se encontraron ${productosConProblemas} productos con problemas de conversión de moneda`);
      // Agregar notificación no bloqueante si hay problemas
      setTimeout(() => {
        Swal.fire({
          title: 'Información',
          text: `Algunos productos (${productosConProblemas}) podrían mostrar precios incorrectos debido a problemas con los tipos de cambio.`,
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000
        });
      }, 1000);
    }
    
    return productosConversiones;
  }

  selectTipo(item: any) {
    console.log(item);
    //esto son datos de la tabla tarjcredito
    this.tipoVal = item.tarjeta; // Almacena el centro seleccionado
    this.codTarj = item.cod_tarj;
    this.listaPrecio = item.listaprecio;
    this.activaDatos = item.activadatos;
    
    // Guardar la condición de venta seleccionada en sessionStorage
    sessionStorage.setItem('condicionVentaSeleccionada', JSON.stringify({
      tarjeta: this.tipoVal,
      cod_tarj: this.codTarj,
      listaprecio: this.listaPrecio
    }));
    
    this.listaPrecioF(); // aca se llama a la funcion que muestra los prefijos
    if (this.activaDatos == 1) {
      this.abrirFormularioTarj();
      // aca se llama a la funcion que muestra los prefijos
    }
    else if (this.activaDatos == 2) {
      this.abrirFormularioCheque();
      // aca se llama a la funcion que muestra los prefijos
    }
    else {
      // Mostrar loading antes de cargar los productos
      this.mostrarLoading();
      
      // Cargar la primera página de productos paginados
      this.articulosPaginadosService.cargarPagina(1).subscribe(
        () => {
          Swal.close();
        },
        error => {
          console.error('Error al cargar productos:', error);
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
  }
  
  abrirFormularioTarj() {
    Swal.fire({
      title: 'Ingrese los datos de la tarjeta',
      html: `<input type="text" id="titular" class="swal2-input" placeholder="Titular">
           <input type="number" id="dni" class="swal2-input" placeholder="DNI">
           <input type="number" id="numero" class="swal2-input" placeholder="Número Tarjeta">
           <input type="number" id="autorizacion" class="swal2-input" placeholder="Autorización">`,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const titular = (<HTMLInputElement>document.getElementById('titular')).value;
        const dni = (<HTMLInputElement>document.getElementById('dni')).value;
        const numero = (<HTMLInputElement>document.getElementById('numero')).value;
        const autorizacion = (<HTMLInputElement>document.getElementById('autorizacion')).value;
        if (!titular || !dni || !numero || !autorizacion) {
          Swal.showValidationMessage(`Por favor rellene todos los campos`);
          //return;
        }
        let reNumero = new RegExp("^[0-9]{16}$");
        let reDni = new RegExp("^[0-9]{8}$");
        let reTitular = new RegExp("^[a-zA-Z ]{1,40}$");
        let reAutorizacion = new RegExp("^[0-9]{3}$");
        if (!reNumero.test(numero)) {
          Swal.showValidationMessage(`El número de la tarjeta no es válido`);
          //return;
        }
        if (!reDni.test(dni)) {
          Swal.showValidationMessage(`El DNI no es válido`);
          //return;
        }
        if (!reTitular.test(titular)) {
          Swal.showValidationMessage(`El titular no es válido`);
          //return;
        }
        if (!reAutorizacion.test(autorizacion)) {
          Swal.showValidationMessage(`La autorización no es válida`);
          //return;
        }
        return { titular, dni, numero, autorizacion }
      }
    }).then((result) => {
      if (result.value) {
        this.tarjeta.Titular = result.value.titular;
        this.tarjeta.Dni = result.value.dni;
        this.tarjeta.Numero = result.value.numero;
        this.tarjeta.Autorizacion = result.value.autorizacion;
        console.log('Tarjeta guardada:', this.tarjeta);
        
        // Mostrar loading antes de cargar los productos
        this.mostrarLoading();
        
        // Cargar la primera página
        this.articulosPaginadosService.cargarPagina(1).subscribe(
          () => {
            Swal.close();
          },
          error => {
            console.error('Error al cargar productos:', error);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudieron cargar los productos'
            });
          }
        );
      }
    });
  }

  abrirFormularioCheque() {
    Swal.fire({
      title: 'Ingrese los datos del Cheque',
      html:
        `<input type="text" id="banco" class="swal2-input" placeholder="Banco">
       <input type="number" id="ncuenta" class="swal2-input" placeholder="N° Cuenta">
       <input type="number" id="ncheque" class="swal2-input" placeholder="N° Cheque">
       <input type="text" id="nombre" class="swal2-input" placeholder="Nombre">
       <input type="text" id="plaza" class="swal2-input" placeholder="Plaza">
       <input type="number" id="importeimputar" class="swal2-input" placeholder="Importe a Imputar">
       <input type="number" id="importecheque" class="swal2-input" placeholder="Importe del Cheque">
       <input type="text" id="fechacheque" class="swal2-input" placeholder="Fecha del Cheque">`,
      didOpen: () => {
        // Cambiar el tipo de input a 'date' para activar el datepicker nativo
        document.getElementById('fechacheque').setAttribute('type', 'date');
      },
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const banco = (<HTMLInputElement>document.getElementById('banco')).value;
        const ncuenta = (<HTMLInputElement>document.getElementById('ncuenta')).value;
        const ncheque = (<HTMLInputElement>document.getElementById('ncheque')).value;
        const nombre = (<HTMLInputElement>document.getElementById('nombre')).value;
        const plaza = (<HTMLInputElement>document.getElementById('plaza')).value;
        const importeimputar = (<HTMLInputElement>document.getElementById('importeimputar')).value;
        const importecheque = (<HTMLInputElement>document.getElementById('importecheque')).value;
        const fechacheque = (<HTMLInputElement>document.getElementById('fechacheque')).value;
        if (!banco || !ncuenta || !ncheque || !nombre || !plaza || !importeimputar || !importecheque || !fechacheque) {
          Swal.showValidationMessage(`Por favor rellene todos los campos`);
          //return;
        }
        let reBanco = new RegExp("^[a-zA-Z ]{1,40}$");
        let reNcuenta = new RegExp("^[0-9]{1,40}$");
        let reNcheque = new RegExp("^[0-9]{1,40}$");
        let reNombre = new RegExp("^[a-zA-Z ]{1,40}$");
        let rePlaza = new RegExp("^[a-zA-Z ]{1,40}$");
        let reImporteImputar = new RegExp("^[0-9]{1,40}$");
        let reImporteCheque = new RegExp("^[0-9]{1,40}$");
        let reFechaCheque = new RegExp("^\\d{2}/\\d{2}/\\d{4}$");//("^[0-9]{1,40}$");

        if (!reBanco.test(banco)) {
          Swal.showValidationMessage(`El nombre del banco no es válido`);
          //return;
        }
        if (!reNcuenta.test(ncuenta)) {
          Swal.showValidationMessage(`El numero de cuenta no es válido`);
          //return;
        }
        if (!reNcheque.test(ncheque)) {
          Swal.showValidationMessage(`El numero de cheque no es válido`);
          //return;
        }
        if (!reNombre.test(nombre)) {
          Swal.showValidationMessage(`El nombre no es válido`);
          //return;
        }
        if (!rePlaza.test(plaza)) {
          Swal.showValidationMessage(`La plaza no es válida`);
          //return;
        }
        if (!reImporteImputar.test(importeimputar)) {
          Swal.showValidationMessage(`El importe a imputar no es válido`);
          //return;
        }
        if (!reImporteCheque.test(importecheque)) {
          Swal.showValidationMessage(`El importe del cheque no es válido`);
          //return;
        }
        return { banco, ncuenta, ncheque, nombre, plaza, importeimputar, importecheque, fechacheque }
      }
    }).then((result) => {
      if (result.value) {
        this.cheque.Banco = result.value.banco;
        this.cheque.Ncuenta = result.value.ncuenta;
        this.cheque.Ncheque = result.value.ncheque;
        this.cheque.Nombre = result.value.nombre;
        this.cheque.Plaza = result.value.plaza;
        this.cheque.ImporteImputar = result.value.importeimputar;
        this.cheque.ImporteCheque = result.value.importecheque;
        this.cheque.FechaCheque = result.value.fechacheque;
        console.log('Cheque guardado:', this.cheque);
        
        // Mostrar loading antes de cargar los productos
        this.mostrarLoading();
        
        // Cargar la primera página
        this.articulosPaginadosService.cargarPagina(1).subscribe(
          () => {
            Swal.close();
          },
          error => {
            console.error('Error al cargar productos:', error);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudieron cargar los productos'
            });
          }
        );
      }
    });
  }

  listaPrecioF() {
    // Se eliminan los seteos individuales de prefijos
    // y se trabaja ahora con la selección de columnas directamente
    console.log(this.listaPrecio);

    // Actualizar el arreglo de columnas seleccionadas según la lista de precios
    if (this.listaPrecio === '0') {
      // Precio 0 (precon)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'precon' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '1') {
      // Precio 1 (prefi1)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi1' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '2') {
      // Precio 2 (prefi2)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi2' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '3') {
      // Precio 3 (prefi3)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi3' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    else if (this.listaPrecio === '4') {
      // Precio 4 (prefi4)
      this._selectedColumns = this.cols.filter(col => 
        col.field === 'nomart' || 
        col.field === 'marca' || 
        col.field === 'prefi4' || 
        col.field === 'exi1' || 
        col.field === 'exi2' || 
        col.field === 'exi3' || 
        col.field === 'exi4'
      );
    }
    
    // Mantener los flags para compatibilidad con código existente
    this.prefi0 = this.listaPrecio === '0';
    this.prefi1 = this.listaPrecio === '1';
    this.prefi2 = this.listaPrecio === '2';
    this.prefi3 = this.listaPrecio === '3';
    this.prefi4 = this.listaPrecio === '4';
  }
  
  selectProducto(producto) {
    let datoscondicionventa: any =
    {
      producto: producto,
      cliente: this.clienteFrompuntoVenta,
      tarjeta: this.tarjeta,
      cheque: this.cheque,
      tipoVal: this.tipoVal,
      codTarj: this.codTarj,
      listaPrecio: this.listaPrecio,
    };
    this.ref = this.dialogService.open(CalculoproductoComponent, {
      header: 'Detalle del Producto',
      width: '80%',
      style: { 
        'max-width': '900px' 
      },
      data:
      {
        producto: producto,
        cliente: this.clienteFrompuntoVenta,
        tarjeta: this.tarjeta,
        cheque: this.cheque,
        tipoVal: this.tipoVal,
        codTarj: this.codTarj,
        listaPrecio: this.listaPrecio,
      },
      contentStyle: { 
        overflow: 'auto',
        padding: '0',
        borderRadius: '8px'
      },
      baseZIndex: 10000,
      maximizable: true,
      closeOnEscape: true,
      dismissableMask: true
    });
  }
  
  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.productos);
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