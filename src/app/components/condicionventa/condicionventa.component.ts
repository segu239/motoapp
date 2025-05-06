import { Component, OnInit, OnDestroy } from '@angular/core';
import { CargardataService } from '../../services/cargardata.service';
import { ArticulosCacheService } from '../../services/articulos-cache.service';
import { Producto } from '../../interfaces/producto';
import Swal from 'sweetalert2';
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FilterPipe } from 'src/app/pipes/filter.pipe';
import { filter } from 'rxjs/operators';
import { first, take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
//importar componente calculoproducto
import { CalculoproductoComponent } from '../calculoproducto/calculoproducto.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChangeDetectorRef } from '@angular/core';

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
  
  // Nuevas propiedades para manejar los valores de cambio
  public valoresCambio: any[] = [];
  public tiposMoneda: any[] = [];

  // Añadir nuevas propiedades para la selección de columnas
  cols: Column[];
  _selectedColumns: Column[];

  constructor(
    public dialogService: DialogService, 
    private cdr: ChangeDetectorRef, 
    private router: Router, 
    private activatedRoute: ActivatedRoute, 
    private _cargardata: CargardataService,
    private articulosCacheService: ArticulosCacheService
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
    
    // Intentar obtener datos desde cache primero
    const cachedValoresCambio = this.articulosCacheService.getValoresCambio();
    const cachedTiposMoneda = this.articulosCacheService.getTiposMoneda();
    
    if (cachedValoresCambio.length > 0) {
      console.log('Usando valores de cambio desde caché en CondicionVenta');
      this.valoresCambio = cachedValoresCambio;
    } else {
      // Obtener los valores de cambio
      const subscription = this._cargardata.getValorCambio().pipe(take(1)).subscribe((resp: any) => {
        if (resp && !resp.error) {
          this.valoresCambio = resp.mensaje;
          console.log('Valores de cambio cargados desde API en CondicionVenta:', this.valoresCambio.length);
        } else {
          console.error('Error al cargar valores de cambio en CondicionVenta');
        }
      });
      this.subscriptions.push(subscription);
    }
    
    if (cachedTiposMoneda.length > 0) {
      console.log('Usando tipos de moneda desde caché en CondicionVenta');
      this.tiposMoneda = cachedTiposMoneda;
    } else {
      // Obtener los tipos de moneda
      const subscription = this._cargardata.getTipoMoneda().pipe(take(1)).subscribe((resp: any) => {
        if (resp && !resp.error) {
          this.tiposMoneda = resp.mensaje;
          console.log('Tipos de moneda cargados desde API en CondicionVenta:', this.tiposMoneda.length);
        } else {
          console.error('Error al cargar tipos de moneda en CondicionVenta');
        }
      });
      this.subscriptions.push(subscription);
    }
    
    // Si tenemos ambos datos de moneda en caché, verificar su integridad
    if (cachedValoresCambio.length > 0 && cachedTiposMoneda.length > 0) {
      setTimeout(() => {
        // Usamos setTimeout para asegurar que ambos arrays ya estén cargados
        const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
        if (!datosCambioValidos) {
          console.warn('Los datos de cambio en caché no son completamente válidos');
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
      }, 500);
    }

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
  
  // Método estandarizado para manejar errores con opciones
  handleLoadError(message: string, retry: () => void, maxRetries: number = 3) {
    console.error('Error de carga:', message);
    
    // Cerrar el loading si está visible
    if (Swal.isVisible()) {
      Swal.close();
    }
    
    // Verificar si hay datos en caché
    const cachedArticulosSucursal = this.articulosCacheService.getArticulosSucursal();
    const hasCachedData = cachedArticulosSucursal && cachedArticulosSucursal.length > 0;
    
    // Variable para controlar los reintentos
    let retryAttempt = 0;
    
    // Función estandarizada para reintentar
    const standardRetry = () => {
      // Incrementar el contador de intentos
      retryAttempt++;
      
      // Mostrar indicador de carga
      this.mostrarLoading();
      
      // Limpiar caché antes de reintentar si ya hemos intentado más de una vez
      if (retryAttempt > 1) {
        console.log(`Limpiando caché en intento #${retryAttempt}`);
        this.articulosCacheService.clearAllCaches();
      }
      
      console.log(`Reintento #${retryAttempt} de ${maxRetries}`);
      
      // Ejecutar la función de reintento proporcionada
      retry();
    };
    
    if (hasCachedData) {
      // Ofrecer opciones si hay datos en caché
      Swal.fire({
        title: 'Error',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reintentar carga',
        cancelButtonText: 'Usar datos anteriores',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          // Reintentar la carga
          console.log('Reintentando carga de datos');
          standardRetry();
        } else {
          // Usar datos de caché
          console.log(`Usando ${cachedArticulosSucursal.length} productos de caché como respaldo`);
          this.useCachedData(cachedArticulosSucursal);
        }
      });
    } else {
      // Si no hay datos en caché, solo mostrar error con opción de reintentar
      Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonText: 'Reintentar',
        showCancelButton: true,
        cancelButtonText: 'Aceptar'
      }).then((result) => {
        if (result.isConfirmed) {
          standardRetry();
        }
      });
    }
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

    // Verificar que exista al menos la moneda base (generalmente cod_mone = 1)
    const tieneMonedasBase = tiposMoneda.some(m => m.cod_mone === 1);
    if (!tieneMonedasBase) {
      console.warn('verificarIntegridadDatosCambio: No se encontró la moneda base (cod_mone=1)');
      return false;
    }

    // Obtener tipos de moneda extranjera (diferentes a la moneda base)
    const monedasExtranjeras = tiposMoneda.filter(m => m.cod_mone !== 1);
    
    // Verificar que todas las monedas extranjeras tengan al menos un valor de cambio
    let todasMonedasTienenCambio = true;
    monedasExtranjeras.forEach(moneda => {
      const tieneValorCambio = valoresCambio.some(vc => vc.codmone === moneda.cod_mone);
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

    return todasMonedasTienenCambio && todosValoresCambioValidos;
  }

  // Método para usar datos de caché
  useCachedData(cachedData: any[]) {
    // Verificar la integridad de los datos críticos de moneda
    const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
    
    // Hacer una copia de los productos originales desde la caché
    let productos = [...cachedData];
    
    // Procesar cada producto para ajustar el precio según su tipo de moneda
    this.productos = this.procesarProductosConMoneda(productos);
    
    // Actualizar la interfaz
    this.cdr.detectChanges();
    
    // Determinar el mensaje según la validación de datos
    let mensaje = 'Usando datos almacenados en caché.';
    let icono = 'info';
    
    if (!datosCambioValidos) {
      mensaje += ' ADVERTENCIA: Los datos de tipos de cambio pueden estar incompletos o ser incorrectos. Los precios de productos en moneda extranjera podrían no ser precisos.';
      icono = 'warning';
    } else {
      mensaje += ' Algunos precios podrían no estar actualizados.';
    }
    
    // Informar al usuario
    Swal.fire({
      title: datosCambioValidos ? 'Información' : 'Advertencia',
      text: mensaje,
      icon: icono as any,
      confirmButtonText: 'Entendido'
    });
  }
  
  /**
   * Método para procesar productos con su moneda
   * Aplica el multiplicador de cambio correspondiente a los productos con moneda extranjera
   * @param productos Lista de productos a procesar
   * @returns Lista de productos con precios procesados
   */
  procesarProductosConMoneda(productos: any[]) {
    // Verificar si tenemos datos válidos para conversión
    const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
    
    // Crear copia para no modificar originales
    const productosConversiones = [...productos];
    
    // Contador para productos con problemas de conversión
    let productosConProblemas = 0;
    
    // Procesar cada producto
    productosConversiones.forEach(producto => {
      try {
        // Verificar si el producto tiene un tipo de moneda extranjera
        if (producto.tipo_moneda && producto.tipo_moneda !== 1) {
          // Si los datos de cambio no son válidos, marcar el producto
          if (!datosCambioValidos) {
            producto._precioConversionSospechosa = true;
            productosConProblemas++;
          }
          
          // Filtrar los valores de cambio para este tipo de moneda
          const valoresCambioMoneda = this.valoresCambio.filter(vc => vc.codmone === producto.tipo_moneda);
          
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
                console.warn(`Multiplicador inválido (${multiplicador}) para moneda ${producto.tipo_moneda}`);
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
              console.warn(`Valor de cambio no encontrado o inválido para moneda ${producto.tipo_moneda}`);
              producto._precioConversionSospechosa = true;
              productosConProblemas++;
            }
          } else {
            console.warn(`No hay valores de cambio para moneda ${producto.tipo_moneda}`);
            producto._precioConversionSospechosa = true;
            productosConProblemas++;
          }
        }
      } catch (error) {
        console.error('Error al procesar producto con moneda:', error);
        producto._precioConversionSospechosa = true;
        productosConProblemas++;
      }
    });
    
    // Registrar estadísticas de conversión
    if (productosConProblemas > 0) {
      console.warn(`Se encontraron ${productosConProblemas} productos con problemas de conversión de moneda`);
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
      
      // Verificar si tenemos artículos en caché primero
      const cachedArticulosSucursal = this.articulosCacheService.getArticulosSucursal();
      
      if (cachedArticulosSucursal.length > 0) {
        console.log(`Usando ${cachedArticulosSucursal.length} productos de la caché para CondicionVenta`);
        
        // Verificar integridad de datos de cambio antes de procesar
        const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
        
        // Hacer una copia de los productos originales desde la caché
        let productos = [...cachedArticulosSucursal];
        
        // Utilizar el método centralizado para procesar productos con moneda
        this.productos = this.procesarProductosConMoneda(productos);
        
        // Forzar la detección de cambios
        this.cdr.detectChanges();
        
        // Cerrar loading
        Swal.close();
        
        // Si hay problemas con los datos de cambio, mostrar una notificación no bloqueante
        if (!datosCambioValidos) {
          setTimeout(() => {
            Swal.fire({
              title: 'Advertencia',
              text: 'Los datos de tipos de cambio pueden estar incompletos. Los precios mostrados podrían no ser precisos.',
              icon: 'warning',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 5000
            });
          }, 500);
        }
      } else {
        console.log('No hay productos en caché, cargando desde API');
        
        // Si no hay datos en caché, cargar desde el servicio de caché que hará la llamada API
        const subscription = this.articulosCacheService.loadArticulosSucursal().subscribe({
          next: (articulosSucursal: any[]) => {
            if (articulosSucursal && articulosSucursal.length > 0) {
              console.log(`Productos cargados para CondicionVenta desde servicio: ${articulosSucursal.length}`);
              
              // Hacer una copia de los productos originales
              let productos = [...articulosSucursal];
              
              // Utilizar el método centralizado para procesar productos con moneda
              this.productos = this.procesarProductosConMoneda(productos);
              // Forzar la detección de cambios
              this.cdr.detectChanges();
            } else {
              console.error('Error o respuesta vacía al cargar productos');
              this.handleLoadError('No se pudieron cargar los productos', () => {
                // Función de reintento estandarizada
                this.articulosCacheService.loadArticulosSucursal().subscribe({
                  next: (articulosSucursal: any[]) => {
                    if (articulosSucursal && articulosSucursal.length > 0) {
                      let productos = [...articulosSucursal];
                      this.productos = this.procesarProductosConMoneda(productos);
                      Swal.close();
                    } else {
                      // Usar el mismo método handleLoadError con la misma función de reintento
                      this.handleLoadError('No se pudieron cargar los productos en el reintento', 
                        () => this.articulosCacheService.loadArticulosSucursal().subscribe({
                          next: (data) => {
                            if (data && data.length > 0) {
                              this.productos = this.procesarProductosConMoneda([...data]);
                              Swal.close();
                            }
                          },
                          error: (err) => Swal.close()
                        })
                      );
                    }
                  },
                  error: (error) => {
                    console.error('Error en reintento de carga:', error);
                    this.handleLoadError('Error en el reintento de carga', 
                      () => this.articulosCacheService.loadArticulosSucursal().subscribe({
                        next: (data) => {
                          if (data && data.length > 0) {
                            this.productos = this.procesarProductosConMoneda([...data]);
                            Swal.close();
                          }
                        },
                        error: (err) => Swal.close()
                      })
                    );
                  }
                });
              });
            }
            // Cerrar loading
            Swal.close();
          },
          error: (error) => {
            console.error('Error al cargar productos:', error);
            this.handleLoadError('No se pudieron cargar los productos', () => {
              // Función de reintento estandarizada
              this.articulosCacheService.loadArticulosSucursal().subscribe({
                next: (articulosSucursal: any[]) => {
                  if (articulosSucursal && articulosSucursal.length > 0) {
                    let productos = [...articulosSucursal];
                    this.productos = this.procesarProductosConMoneda(productos);
                    Swal.close();
                  } else {
                    // Usar el mismo método handleLoadError con la misma función de reintento
                    this.handleLoadError('No se pudieron cargar los productos en el reintento', 
                      () => this.articulosCacheService.loadArticulosSucursal().subscribe({
                        next: (data) => {
                          if (data && data.length > 0) {
                            this.productos = this.procesarProductosConMoneda([...data]);
                            Swal.close();
                          }
                        },
                        error: (err) => Swal.close()
                      })
                    );
                  }
                },
                error: (error) => {
                  console.error('Error en reintento de carga:', error);
                  this.handleLoadError('Error en el reintento de carga', 
                    () => this.articulosCacheService.loadArticulosSucursal().subscribe({
                      next: (data) => {
                        if (data && data.length > 0) {
                          this.productos = this.procesarProductosConMoneda([...data]);
                          Swal.close();
                        }
                      },
                      error: (err) => Swal.close()
                    })
                  );
                }
              });
            });
          }
        });
        
        this.subscriptions.push(subscription);
      }
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
        
        // Verificar si tenemos artículos en caché primero
        const cachedArticulosSucursal = this.articulosCacheService.getArticulosSucursal();
        
        if (cachedArticulosSucursal.length > 0) {
          console.log(`Usando ${cachedArticulosSucursal.length} productos de la caché para abrirFormularioTarj`);
          
          // Verificar integridad de datos de cambio antes de procesar
          const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
          
          // Hacer una copia de los productos originales desde la caché y procesarlos
          let productos = [...cachedArticulosSucursal];
          this.productos = this.procesarProductosConMoneda(productos);
          // Forzar la detección de cambios
          this.cdr.detectChanges();
          
          // Cerrar loading
          Swal.close();
          
          // Si hay problemas con los datos de cambio, mostrar una notificación no bloqueante
          if (!datosCambioValidos) {
            setTimeout(() => {
              Swal.fire({
                title: 'Advertencia',
                text: 'Los datos de tipos de cambio pueden estar incompletos. Los precios mostrados podrían no ser precisos.',
                icon: 'warning',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000
              });
            }, 500);
          }
        } else {
          // Cargar datos desde el servicio de caché que hará la llamada API si es necesario
          this.articulosCacheService.loadArticulosSucursal().pipe(take(1)).subscribe({
            next: (articulos: any[]) => {
              this.productos = [...articulos];
              // Forzar la detección de cambios
              this.cdr.detectChanges();
              
              // Cerrar loading
              Swal.close();
            },
            error: (error) => {
              console.error('Error al cargar productos:', error);
              Swal.close();
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los productos'
              });
            }
          });
        }
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
        
        // Verificar si tenemos artículos en caché primero
        const cachedArticulosSucursal = this.articulosCacheService.getArticulosSucursal();
        
        if (cachedArticulosSucursal.length > 0) {
          console.log(`Usando ${cachedArticulosSucursal.length} productos de la caché para abrirFormularioCheque`);
          
          // Verificar integridad de datos de cambio antes de procesar
          const datosCambioValidos = this.verificarIntegridadDatosCambio(this.valoresCambio, this.tiposMoneda);
          
          // Hacer una copia de los productos originales desde la caché y procesarlos
          let productos = [...cachedArticulosSucursal];
          this.productos = this.procesarProductosConMoneda(productos);
          // Forzar la detección de cambios
          this.cdr.detectChanges();
          
          // Cerrar loading
          Swal.close();
          
          // Si hay problemas con los datos de cambio, mostrar una notificación no bloqueante
          if (!datosCambioValidos) {
            setTimeout(() => {
              Swal.fire({
                title: 'Advertencia',
                text: 'Los datos de tipos de cambio pueden estar incompletos. Los precios mostrados podrían no ser precisos.',
                icon: 'warning',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000
              });
            }, 500);
          }
        } else {
          // Cargar datos desde el servicio de caché que hará la llamada API si es necesario
          this.articulosCacheService.loadArticulosSucursal().pipe(take(1)).subscribe({
            next: (articulos: any[]) => {
              this.productos = [...articulos];
              // Forzar la detección de cambios
              this.cdr.detectChanges();
              
              // Cerrar loading
              Swal.close();
            },
            error: (error) => {
              console.error('Error al cargar productos:', error);
              Swal.close();
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los productos'
              });
            }
          });
        }
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
      header: 'Producto',
      width: '70%',
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
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true
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
