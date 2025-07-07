import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { 
  Urlartsucursal,
  UrlValorCambio,
  UrlTipoMoneda,
  UrlConflista
} from '../config/ini';

@Injectable({
  providedIn: 'root'
})
export class StockCacheService {
  private cacheKeys = {
    productos: 'stock_productos_cache',
    valoresCambio: 'stock_valores_cambio_cache',
    tiposMoneda: 'stock_tipos_moneda_cache',
    confLista: 'stock_conf_lista_cache',
    timestamp: 'stock_cache_timestamp'
  };

  private cacheExpirationHours = 24;
  private productosSubject = new BehaviorSubject<any[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private cacheVersionSubject = new BehaviorSubject<string>('1.0');

  // Observables públicos
  public productos$ = this.productosSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public cacheVersion$ = this.cacheVersionSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeCache();
  }

  private initializeCache(): void {
    try {
      const cachedData = this.getCachedData(this.cacheKeys.productos);
      if (cachedData && this.isCacheValid()) {
        console.log('Stock: Cargando productos desde cache');
        this.productosSubject.next(cachedData);
      }
    } catch (error) {
      console.warn('Stock: Error al inicializar cache:', error);
      this.clearCache();
    }
  }

  // Cargar productos por sucursal con cache
  cargarProductosSucursal(forzarRecarga: boolean = false): Observable<any[]> {
    if (!forzarRecarga && this.isCacheValid()) {
      const cachedData = this.getCachedData(this.cacheKeys.productos);
      if (cachedData) {
        console.log('Stock: Usando productos desde cache');
        this.productosSubject.next(cachedData);
        return of(cachedData);
      }
    }

    console.log('Stock: Cargando productos desde servidor');
    this.cargandoSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<any>(Urlartsucursal).pipe(
      map(response => {
        if (response && !response.error && response.mensaje) {
          return this.processProductosData(response.mensaje);
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      }),
      tap(productos => {
        this.setCachedData(this.cacheKeys.productos, productos);
        this.updateCacheTimestamp();
        this.productosSubject.next(productos);
        this.cargandoSubject.next(false);
        console.log(`Stock: ${productos.length} productos cargados y cacheados`);
      }),
      catchError(error => {
        console.error('Stock: Error al cargar productos:', error);
        this.cargandoSubject.next(false);
        this.errorSubject.next('Error al cargar productos');
        
        // Intentar usar cache como fallback
        const cachedData = this.getCachedData(this.cacheKeys.productos);
        if (cachedData) {
          console.log('Stock: Usando cache como fallback después del error');
          this.productosSubject.next(cachedData);
          return of(cachedData);
        }
        
        this.productosSubject.next([]);
        return throwError(error);
      })
    );
  }

  // Procesar y normalizar datos de productos
  private processProductosData(productos: any[]): any[] {
    return productos.map(item => ({
      ...item,
      // Normalizar campos de nombres
      nomart: item.nomart || item.nombre || '',
      cd_articulo: item.cd_articulo || item.codigo || '',
      cd_barra: item.cd_barra || item.codigobarra || '',
      marca: item.marca || '',
      rubro: item.rubro || '',
      
      // Normalizar precios como números
      precon: parseFloat(this.parseFloat(item.precon).toFixed(4)),
      prefi1: parseFloat(this.parseFloat(item.prefi1).toFixed(4)),
      prefi2: parseFloat(this.parseFloat(item.prefi2).toFixed(4)),
      prefi3: parseFloat(this.parseFloat(item.prefi3).toFixed(4)),
      prefi4: parseFloat(this.parseFloat(item.prefi4).toFixed(4)),
      
      // Normalizar existencias como números
      exi1: this.parseFloat(item.exi1),
      exi2: this.parseFloat(item.exi2),
      exi3: this.parseFloat(item.exi3),
      exi4: this.parseFloat(item.exi4),
      exi5: this.parseFloat(item.exi5),
      
      estado: item.estado || '',
      
      // Campos adicionales para stock
      stockTotal: this.calcularStockTotal(item),
      stockDisponible: this.calcularStockDisponible(item),
      
      // Metadatos de cache
      _cached: true,
      _cacheTimestamp: new Date().toISOString()
    }));
  }

  // Calcular stock total
  private calcularStockTotal(item: any): number {
    const exi1 = this.parseFloat(item.exi1);
    const exi2 = this.parseFloat(item.exi2);
    const exi3 = this.parseFloat(item.exi3);
    const exi4 = this.parseFloat(item.exi4);
    const exi5 = this.parseFloat(item.exi5);
    
    return exi1 + exi2 + exi3 + exi4 + exi5;
  }

  // Calcular stock disponible (excluyendo reservado si aplica)
  private calcularStockDisponible(item: any): number {
    return this.calcularStockTotal(item);
  }

  // Cargar valores de cambio con cache
  getValoresCambio(forzarRecarga: boolean = false): Observable<any[]> {
    if (!forzarRecarga) {
      const cachedData = this.getCachedData(this.cacheKeys.valoresCambio);
      if (cachedData && this.isCacheValid()) {
        return of(cachedData);
      }
    }

    return this.http.get<any>(UrlValorCambio).pipe(
      map(response => response && response.mensaje ? response.mensaje : []),
      tap(data => this.setCachedData(this.cacheKeys.valoresCambio, data)),
      catchError(error => {
        console.error('Stock: Error al cargar valores de cambio:', error);
        const cachedData = this.getCachedData(this.cacheKeys.valoresCambio);
        return of(cachedData || []);
      })
    );
  }

  // Cargar tipos de moneda con cache
  getTiposMoneda(forzarRecarga: boolean = false): Observable<any[]> {
    if (!forzarRecarga) {
      const cachedData = this.getCachedData(this.cacheKeys.tiposMoneda);
      if (cachedData && this.isCacheValid()) {
        return of(cachedData);
      }
    }

    return this.http.get<any>(UrlTipoMoneda).pipe(
      map(response => response && response.mensaje ? response.mensaje : []),
      tap(data => this.setCachedData(this.cacheKeys.tiposMoneda, data)),
      catchError(error => {
        console.error('Stock: Error al cargar tipos de moneda:', error);
        const cachedData = this.getCachedData(this.cacheKeys.tiposMoneda);
        return of(cachedData || []);
      })
    );
  }

  // Cargar configuración de lista con cache
  getConfLista(forzarRecarga: boolean = false): Observable<any[]> {
    if (!forzarRecarga) {
      const cachedData = this.getCachedData(this.cacheKeys.confLista);
      if (cachedData && this.isCacheValid()) {
        return of(cachedData);
      }
    }

    return this.http.get<any>(UrlConflista).pipe(
      map(response => response && response.mensaje ? response.mensaje : []),
      tap(data => this.setCachedData(this.cacheKeys.confLista, data)),
      catchError(error => {
        console.error('Stock: Error al cargar configuración de lista:', error);
        const cachedData = this.getCachedData(this.cacheKeys.confLista);
        return of(cachedData || []);
      })
    );
  }

  // Buscar productos en cache local
  buscarProductos(termino: string): any[] {
    const productos = this.productosSubject.value;
    if (!termino || termino.trim() === '') {
      return productos;
    }

    const terminoLower = termino.toLowerCase();
    return productos.filter(producto => 
      (producto.nomart && producto.nomart.toLowerCase().includes(terminoLower)) ||
      (producto.cd_articulo && producto.cd_articulo.toLowerCase().includes(terminoLower)) ||
      (producto.cd_barra && producto.cd_barra.toLowerCase().includes(terminoLower)) ||
      (producto.marca && producto.marca.toLowerCase().includes(terminoLower)) ||
      (producto.rubro && producto.rubro.toLowerCase().includes(terminoLower))
    );
  }

  // Filtrar productos por stock disponible
  filtrarPorStock(productos: any[] = null, conStock: boolean = true): any[] {
    const productosParaFiltrar = productos || this.productosSubject.value;
    
    if (conStock) {
      return productosParaFiltrar.filter(producto => 
        (producto.stockDisponible || 0) > 0
      );
    } else {
      return productosParaFiltrar.filter(producto => 
        (producto.stockDisponible || 0) <= 0
      );
    }
  }

  // Obtener un producto específico por ID
  obtenerProductoPorId(id: string): any | null {
    const productos = this.productosSubject.value;
    return productos.find(producto => 
      producto.cd_articulo === id || 
      producto.id === id ||
      producto.cd_barra === id
    ) || null;
  }

  // Métodos de gestión de cache
  private isCacheValid(): boolean {
    const timestamp = sessionStorage.getItem(this.cacheKeys.timestamp);
    if (!timestamp) return false;

    const cacheTime = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);

    return diffHours < this.cacheExpirationHours;
  }

  private getCachedData(key: string): any | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Stock: Error al leer cache ${key}:`, error);
      return null;
    }
  }

  private setCachedData(key: string, data: any): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Stock: Error al guardar cache ${key}:`, error);
      this.clearCache();
    }
  }

  private updateCacheTimestamp(): void {
    sessionStorage.setItem(this.cacheKeys.timestamp, new Date().toISOString());
  }

  private parseFloat(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  }

  // Métodos públicos de gestión
  public clearCache(): void {
    Object.values(this.cacheKeys).forEach(key => {
      sessionStorage.removeItem(key);
    });
    console.log('Stock: Cache limpiado');
  }

  public refreshCache(): Observable<any[]> {
    console.log('Stock: Refrescando cache');
    return this.cargarProductosSucursal(true);
  }

  public getCacheInfo(): any {
    const timestamp = sessionStorage.getItem(this.cacheKeys.timestamp);
    const productos = this.getCachedData(this.cacheKeys.productos);
    
    return {
      isValid: this.isCacheValid(),
      timestamp: timestamp,
      productosCount: productos ? productos.length : 0,
      expirationHours: this.cacheExpirationHours,
      cacheSize: this.calculateCacheSize()
    };
  }

  private calculateCacheSize(): string {
    let totalSize = 0;
    Object.values(this.cacheKeys).forEach(key => {
      const data = sessionStorage.getItem(key);
      if (data) {
        totalSize += data.length;
      }
    });
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }

  // Getters para compatibilidad
  getProductos(): any[] {
    return this.productosSubject.value;
  }

  estaCargando(): boolean {
    return this.cargandoSubject.value;
  }

  getError(): string | null {
    return this.errorSubject.value;
  }
}