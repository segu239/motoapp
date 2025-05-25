import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { ArticulosPaginadosService } from '../../services/articulos-paginados.service';
import { Producto } from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FilterPipe } from 'src/app/pipes/filter.pipe';
import { filter, debounceTime, distinctUntilChanged, switchMap, tap, takeUntil } from 'rxjs/operators';
import { first, take } from 'rxjs/operators';
import { Subscription, forkJoin, Subject, of } from 'rxjs';
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
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
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
    CodigoBanco: '',
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
  
  // Propiedad para bancos
  public bancos: any[] = [];
  
  // Propiedades para paginación
  public paginaActual = 1;
  public totalPaginas = 0;
  public totalItems = 0;
  public terminoBusqueda = '';
  public loading = false;
  public cargandoProductos = false;

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
    this._cargardata.tarjcredito().pipe(takeUntil(this.destroy$)).subscribe((resp: any) => {
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
    
    // Cargar los bancos
    this._cargardata.getBancos().pipe(takeUntil(this.destroy$)).subscribe((resp: any) => {
      if (resp && !resp.error && resp.mensaje) {
        this.bancos = resp.mensaje;
        console.log('Bancos cargados:', this.bancos);
      } else {
        console.error('Error al cargar bancos o formato incorrecto:', resp);
      }
    }, error => {
      console.error('Error al cargar bancos:', error);
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
    
    // Configurar búsqueda con debounce
    this.setupSearchDebounce();
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
    
    // Completar el subject de destrucción
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Configurar búsqueda con debounce
  setupSearchDebounce() {
    this.searchSubject$
      .pipe(
        debounceTime(300), // Esperar 300ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Ignorar si el valor no cambió
        tap(termino => {
          this.terminoBusqueda = termino;
          this.cargandoProductos = true;
        }),
        switchMap(termino => {
          // Si no hay término, cargar página normal
          if (!termino || termino.trim() === '') {
            return this.articulosPaginadosService.cargarPagina(1);
          }
          // Si hay término, buscar en backend
          return this.articulosPaginadosService.buscar(termino, 1);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.cargandoProductos = false;
        },
        error: (error) => {
          console.error('Error en búsqueda:', error);
          this.cargandoProductos = false;
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los productos',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
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
  
  // Método para manejar búsqueda desde el input
  public onSearchInput(value: string): void {
    this.searchSubject$.next(value);
  }

  // Buscar productos (mantener para compatibilidad con botón de búsqueda)
  public buscarProductos(termino: string): void {
    this.searchSubject$.next(termino);
  }

  // Limpiar búsqueda
  public limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    // Limpiar el término de búsqueda en el servicio
    this.articulosPaginadosService.limpiarTerminoBusqueda();
    this.searchSubject$.next(''); // Esto activará la carga de la página normal
    // Forzar recarga de la primera página
    this.articulosPaginadosService.cargarPagina(1)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }
  
  // Métodos de paginación
  irAPagina(pagina: number) {
    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      // Si hay término de búsqueda, usar búsqueda paginada
      this.articulosPaginadosService.buscar(this.terminoBusqueda, pagina)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      // Si no hay búsqueda, usar paginación normal
      this.articulosPaginadosService.irAPagina(pagina);
    }
  }
  
  paginaSiguiente() {
    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      this.articulosPaginadosService.buscar(this.terminoBusqueda, this.paginaActual + 1)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      this.articulosPaginadosService.paginaSiguiente();
    }
  }
  
  paginaAnterior() {
    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      this.articulosPaginadosService.buscar(this.terminoBusqueda, this.paginaActual - 1)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
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
      this.articulosPaginadosService.cargarPagina(1)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
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
    // Estilos CSS para el modal
    const styles = `
      <style>
        /* Container styling */
        .tarjeta-form {
          padding: 0 15px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        /* Card styling */
        .tarjeta-card {
          background-color: #fcfcfc;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        /* Header styling */
        .tarjeta-header {
          background-color: #d1ecf1;
          color: #0c5460;
          padding: 15px;
          font-weight: 600;
          border-bottom: 1px solid #bee5eb;
          display: flex;
          align-items: center;
        }
        
        .tarjeta-header i {
          margin-right: 10px;
        }
        
        /* Form section styling */
        .tarjeta-section {
          padding: 20px;
        }
        
        .form-row {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }
        
        .form-group {
          flex: 1;
          min-width: 250px;
          padding: 0 10px;
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #555;
          font-size: 14px;
        }
        
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        .form-control:focus {
          border-color: #80bdff;
          outline: 0;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        /* Input styling by type */
        input[type="number"].form-control {
          border-left: 3px solid #28a745;
        }
        
        input[type="text"].form-control {
          border-left: 3px solid #007bff;
        }
        
        /* Credit card input styling */
        .card-input {
          border-left: 3px solid #17a2b8 !important;
          font-weight: 600;
        }
        
        /* Subtitle styling */
        .section-title {
          font-size: 16px;
          color: #343a40;
          margin: 15px 0;
          padding-left: 10px;
          border-left: 4px solid #17a2b8;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .form-group {
            flex: 100%;
          }
        }
      </style>
    `;

    Swal.fire({
      title: 'Datos de la Tarjeta',
      width: 800,
      html: styles + `
        <div class="tarjeta-form">
          <div class="tarjeta-card">
            <div class="tarjeta-header">
              <i class="fa fa-credit-card"></i> Información de la Tarjeta
            </div>
            <div class="tarjeta-section">
              <h4 class="section-title">Datos del Titular</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="titular"><i class="fa fa-user"></i> Nombre del Titular</label>
                  <input type="text" id="titular" class="form-control" placeholder="Ingrese el nombre completo">
                </div>
                <div class="form-group">
                  <label for="dni"><i class="fa fa-id-card"></i> DNI</label>
                  <input type="number" id="dni" class="form-control" placeholder="Ingrese el DNI">
                </div>
              </div>
              
              <h4 class="section-title">Datos de la Tarjeta</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="numero"><i class="fa fa-credit-card"></i> Número de Tarjeta</label>
                  <input type="number" id="numero" class="form-control card-input" placeholder="Ingrese los 16 dígitos">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="autorizacion"><i class="fa fa-key"></i> Código de Autorización</label>
                  <input type="number" id="autorizacion" class="form-control card-input" placeholder="Ingrese el código de 3 dígitos">
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#17a2b8',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#dc3545',
      focusConfirm: false,
      preConfirm: () => {
        const titular = (<HTMLInputElement>document.getElementById('titular')).value;
        const dni = (<HTMLInputElement>document.getElementById('dni')).value;
        const numero = (<HTMLInputElement>document.getElementById('numero')).value;
        const autorizacion = (<HTMLInputElement>document.getElementById('autorizacion')).value;
        
        // Validación de campos
        if (!titular || !dni || !numero || !autorizacion) {
          Swal.showValidationMessage(`Por favor complete todos los campos requeridos`);
          return false;
        }
        
        // Validaciones específicas
        let reNumero = new RegExp("^[0-9]{16}$");
        let reDni = new RegExp("^[0-9]{8}$");
        let reTitular = new RegExp("^[a-zA-Z ]{1,40}$");
        let reAutorizacion = new RegExp("^[0-9]{3}$");
        
        if (!reTitular.test(titular)) {
          Swal.showValidationMessage(`El titular no es válido. Debe contener solo letras y espacios.`);
          return false;
        }
        if (!reDni.test(dni)) {
          Swal.showValidationMessage(`El DNI no es válido. Debe contener exactamente 8 dígitos.`);
          return false;
        }
        if (!reNumero.test(numero)) {
          Swal.showValidationMessage(`El número de tarjeta no es válido. Debe contener exactamente 16 dígitos.`);
          return false;
        }
        if (!reAutorizacion.test(autorizacion)) {
          Swal.showValidationMessage(`El código de autorización no es válido. Debe contener exactamente 3 dígitos.`);
          return false;
        }
        
        return { titular, dni, numero, autorizacion };
      }
    }).then((result) => {
      if (result.value) {
        this.tarjeta.Titular = result.value.titular;
        this.tarjeta.Dni = result.value.dni;
        this.tarjeta.Numero = result.value.numero;
        this.tarjeta.Autorizacion = result.value.autorizacion;
        console.log('Tarjeta guardada:', this.tarjeta);
        
        // Confirmación visual
        Swal.fire({
          icon: 'success',
          title: 'Datos guardados correctamente',
          text: 'Los datos de la tarjeta han sido registrados',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Mostrar loading antes de cargar los productos
          this.mostrarLoading();
          
          // Cargar la primera página
          this.articulosPaginadosService.cargarPagina(1)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
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
        });
      }
    });
  }

  abrirFormularioCheque() {
    // Crear opciones de bancos para el select
    let opcionesBancos = '';
    if (this.bancos && this.bancos.length > 0) {
      opcionesBancos = this.bancos.map(banco => 
        `<option value="${banco.codigo_banco}">${banco.descripcion}</option>`
      ).join('');
    } else {
      opcionesBancos = '<option value="">No hay bancos disponibles</option>';
    }

    // Estilos CSS para el modal
    const styles = `
      <style>
        /* Container styling */
        .cheque-form {
          padding: 0 15px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        /* Card styling */
        .cheque-card {
          background-color: #fcfcfc;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        /* Header styling */
        .cheque-header {
          background-color: #cce5ff;
          color: #004085;
          padding: 15px;
          font-weight: 600;
          border-bottom: 1px solid #b8daff;
          display: flex;
          align-items: center;
        }
        
        .cheque-header i {
          margin-right: 10px;
        }
        
        /* Form section styling */
        .cheque-section {
          padding: 20px;
        }
        
        .form-row {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }
        
        .form-group {
          flex: 1;
          min-width: 250px;
          padding: 0 10px;
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #555;
          font-size: 14px;
        }
        
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        .form-control:focus {
          border-color: #80bdff;
          outline: 0;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        /* Select styling */
        select.form-control {
          background-color: white;
          border-left: 3px solid #007bff;
        }
        
        /* Input styling by type */
        input[type="number"].form-control,
        input[type="date"].form-control {
          border-left: 3px solid #28a745;
        }
        
        input[type="text"].form-control {
          border-left: 3px solid #6c757d;
        }
        
        /* Money inputs styling */
        .money-input {
          border-left: 3px solid #dc3545 !important;
          font-weight: 600;
        }
        
        /* Subtitle styling */
        .section-title {
          font-size: 16px;
          color: #343a40;
          margin: 15px 0;
          padding-left: 10px;
          border-left: 4px solid #007bff;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .form-group {
            flex: 100%;
          }
        }
      </style>
    `;

    Swal.fire({
      title: 'Datos del Cheque',
      width: 800,
      html: styles + `
        <div class="cheque-form">
          <div class="cheque-card">
            <div class="cheque-header">
              <i class="fa fa-money-check-alt"></i> Información del Cheque
            </div>
            <div class="cheque-section">
              <h4 class="section-title">Datos del Banco</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="banco"><i class="fa fa-university"></i> Banco</label>
                  <select id="banco" class="form-control">
                    <option value="" selected disabled>Seleccione un banco</option>
                    ${opcionesBancos}
                  </select>
                </div>
                <div class="form-group">
                  <label for="ncuenta"><i class="fa fa-credit-card"></i> Número de Cuenta</label>
                  <input type="number" id="ncuenta" class="form-control" placeholder="Ingrese el número de cuenta">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="ncheque"><i class="fa fa-file-invoice-dollar"></i> Número de Cheque</label>
                  <input type="number" id="ncheque" class="form-control" placeholder="Ingrese el número de cheque">
                </div>
                <div class="form-group">
                  <label for="plaza"><i class="fa fa-map-marker-alt"></i> Plaza</label>
                  <input type="text" id="plaza" class="form-control" placeholder="Ingrese la plaza">
                </div>
              </div>
              
              <h4 class="section-title">Datos del Titular</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="nombre"><i class="fa fa-user"></i> Nombre del Titular</label>
                  <input type="text" id="nombre" class="form-control" placeholder="Ingrese el nombre completo">
                </div>
              </div>
              
              <h4 class="section-title">Datos del Importe</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="importeimputar"><i class="fa fa-dollar-sign"></i> Importe a Imputar</label>
                  <input type="number" id="importeimputar" class="form-control money-input" placeholder="$0.00">
                </div>
                <div class="form-group">
                  <label for="importecheque"><i class="fa fa-dollar-sign"></i> Importe del Cheque</label>
                  <input type="number" id="importecheque" class="form-control money-input" placeholder="$0.00">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="fechacheque"><i class="fa fa-calendar-alt"></i> Fecha del Cheque</label>
                  <input type="date" id="fechacheque" class="form-control">
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      didOpen: () => {
        // Cualquier inicialización adicional puede ir aquí
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#28a745',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#dc3545',
      focusConfirm: false,
      preConfirm: () => {
        const selectBanco = <HTMLSelectElement>document.getElementById('banco');
        const banco = selectBanco.selectedIndex > 0 ? selectBanco.options[selectBanco.selectedIndex].text : '';
        const codigo_banco = selectBanco.value;
        const ncuenta = (<HTMLInputElement>document.getElementById('ncuenta')).value;
        const ncheque = (<HTMLInputElement>document.getElementById('ncheque')).value;
        const nombre = (<HTMLInputElement>document.getElementById('nombre')).value;
        const plaza = (<HTMLInputElement>document.getElementById('plaza')).value;
        const importeimputar = (<HTMLInputElement>document.getElementById('importeimputar')).value;
        const importecheque = (<HTMLInputElement>document.getElementById('importecheque')).value;
        const fechacheque = (<HTMLInputElement>document.getElementById('fechacheque')).value;
        
        // Validación de campos
        if (!codigo_banco || !ncuenta || !ncheque || !nombre || !plaza || !importeimputar || !importecheque || !fechacheque) {
          Swal.showValidationMessage(`Por favor complete todos los campos requeridos`);
          return false;
        }
        
        // Validaciones específicas
        let reNcuenta = new RegExp("^[0-9]{1,40}$");
        let reNcheque = new RegExp("^[0-9]{1,40}$");
        let reNombre = new RegExp("^[a-zA-Z ]{1,40}$");
        let rePlaza = new RegExp("^[a-zA-Z ]{1,40}$");
        let reImporteImputar = new RegExp("^[0-9]{1,40}$");
        let reImporteCheque = new RegExp("^[0-9]{1,40}$");
        
        if (!reNcuenta.test(ncuenta)) {
          Swal.showValidationMessage(`El número de cuenta no es válido. Debe contener solo dígitos.`);
          return false;
        }
        if (!reNcheque.test(ncheque)) {
          Swal.showValidationMessage(`El número de cheque no es válido. Debe contener solo dígitos.`);
          return false;
        }
        if (!reNombre.test(nombre)) {
          Swal.showValidationMessage(`El nombre no es válido. Debe contener solo letras y espacios.`);
          return false;
        }
        if (!rePlaza.test(plaza)) {
          Swal.showValidationMessage(`La plaza no es válida. Debe contener solo letras y espacios.`);
          return false;
        }
        if (!reImporteImputar.test(importeimputar)) {
          Swal.showValidationMessage(`El importe a imputar no es válido. Debe contener solo dígitos.`);
          return false;
        }
        if (!reImporteCheque.test(importecheque)) {
          Swal.showValidationMessage(`El importe del cheque no es válido. Debe contener solo dígitos.`);
          return false;
        }
        
        return { banco, codigo_banco, ncuenta, ncheque, nombre, plaza, importeimputar, importecheque, fechacheque };
      }
    }).then((result) => {
      if (result.value) {
        this.cheque.Banco = result.value.banco;
        this.cheque.CodigoBanco = result.value.codigo_banco;
        this.cheque.Ncuenta = result.value.ncuenta;
        this.cheque.Ncheque = result.value.ncheque;
        this.cheque.Nombre = result.value.nombre;
        this.cheque.Plaza = result.value.plaza;
        this.cheque.ImporteImputar = result.value.importeimputar;
        this.cheque.ImporteCheque = result.value.importecheque;
        this.cheque.FechaCheque = result.value.fechacheque;
        console.log('Cheque guardado:', this.cheque);
        
        // Confirmación visual
        Swal.fire({
          icon: 'success',
          title: 'Datos guardados correctamente',
          text: 'Los datos del cheque han sido registrados',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Mostrar loading antes de cargar los productos
          this.mostrarLoading();
          
          // Cargar la primera página
          this.articulosPaginadosService.cargarPagina(1)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
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
        });
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
    // Prepara los datos de la condición de venta
    const datoscondicionventa: any = {
      producto: producto,
      cliente: this.clienteFrompuntoVenta,
      tarjeta: this.tarjeta,
      cheque: this.cheque,
      tipoVal: this.tipoVal,
      codTarj: this.codTarj,
      listaPrecio: this.listaPrecio,
    };
    
    // Determinar el precio a mostrar según la lista seleccionada
    let precio = 0;
    let tipoPrecioString = '';
    
    switch (this.listaPrecio) {
      case '0':
        precio = producto.precon || 0;
        tipoPrecioString = 'Precio Contado';
        break;
      case '1':
        precio = producto.prefi1 || 0;
        tipoPrecioString = 'Precio Lista';
        break;
      case '2':
        precio = producto.prefi2 || 0;
        tipoPrecioString = 'Precio Tarjeta';
        break;
      case '3':
        precio = producto.prefi3 || 0;
        tipoPrecioString = 'Precio 3';
        break;
      case '4':
        precio = producto.prefi4 || 0;
        tipoPrecioString = 'Precio 4';
        break;
      default:
        precio = producto.precon || 0;
        tipoPrecioString = 'Precio Contado';
    }
    
    // Formatear precio para mostrar
    const precioFormateado = new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 2 
    }).format(precio);

    // Abrimos directamente el componente del modal con la lógica original
    // Esto garantiza que el cálculo y la lógica de agregar al carrito funcionará correctamente
    this.ref = this.dialogService.open(CalculoproductoComponent, {
      header: 'Detalle del Producto',
      width: '80%',
      style: { 
        'max-width': '900px' 
      },
      data: datoscondicionventa,
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