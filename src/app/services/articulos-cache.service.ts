import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { CargardataService } from './cargardata.service';

// Define interfaces
interface ArticuloCache {
  data: any[];
  timestamp: number;
  version: number;
}

interface ValorCambioCache {
  data: any[];
  timestamp: number;
}

interface TipoMonedaCache {
  data: any[];
  timestamp: number;
}

interface ConfListaCache {
  data: any[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ArticulosCacheService {
  // Cache version - increment this when schema changes
  private CACHE_VERSION = 1;
  
  // Expiration times in milliseconds
  private CACHE_EXPIRATION = 12 * 60 * 60 * 1000; // 12 hours (reduced from 24)
  
  // Cache storage keys
  private ARTICULOS_CACHE_KEY = 'articulos_cache';
  private VALOR_CAMBIO_CACHE_KEY = 'valor_cambio_cache';
  private TIPO_MONEDA_CACHE_KEY = 'tipo_moneda_cache';
  private CONF_LISTA_CACHE_KEY = 'conf_lista_cache';
  private ARTICULOS_SUCURSAL_CACHE_KEY = 'articulos_sucursal_cache';
  
  // BehaviorSubjects to store the current data
  private articulosSubject = new BehaviorSubject<any[]>([]);
  private valoresCambioSubject = new BehaviorSubject<any[]>([]);
  private tiposMonedaSubject = new BehaviorSubject<any[]>([]);
  private confListaSubject = new BehaviorSubject<any[]>([]);
  private articulosSucursalSubject = new BehaviorSubject<any[]>([]);
  
  // Loading states
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  // Flag to prevent multiple simultaneous load requests
  private isLoadingData = false;
  
  constructor(private cargardataService: CargardataService) {
    // Initialize by loading cached data if available
    this.initializeCache();
    console.log('ArticulosCacheService initialized');
  }
  
  // Observables for consumers
  get articulos$(): Observable<any[]> {
    return this.articulosSubject.asObservable();
  }
  
  get valoresCambio$(): Observable<any[]> {
    return this.valoresCambioSubject.asObservable();
  }
  
  get tiposMoneda$(): Observable<any[]> {
    return this.tiposMonedaSubject.asObservable();
  }
  
  get confLista$(): Observable<any[]> {
    return this.confListaSubject.asObservable();
  }
  
  get loading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }
  
  // Initialize cache by loading from sessionStorage
  private initializeCache(): void {
    this.loadArticulosFromCache();
    this.loadValoresCambioFromCache();
    this.loadTiposMonedaFromCache();
    this.loadConfListaFromCache();
    this.loadArticulosSucursalFromCache();
  }
  
  // Clear all caches
  clearAllCaches(): void {
    sessionStorage.removeItem(this.ARTICULOS_CACHE_KEY);
    sessionStorage.removeItem(this.VALOR_CAMBIO_CACHE_KEY);
    sessionStorage.removeItem(this.TIPO_MONEDA_CACHE_KEY);
    sessionStorage.removeItem(this.CONF_LISTA_CACHE_KEY);
    sessionStorage.removeItem(this.ARTICULOS_SUCURSAL_CACHE_KEY);
    
    // Do not clear the subjects as they might be in use by components
    // Instead, we'll refresh the data from the API
    console.log('All caches cleared from sessionStorage');
  }
  
  // Load all data from API (used when refreshing or initializing)
  loadAllData(): Observable<boolean> {
    // If already loading, don't start another load
    if (this.isLoadingData) {
      console.log('Already loading data, skipping duplicate request');
      return of(false);
    }
    
    this.isLoadingData = true;
    this.loadingSubject.next(true);
    console.log('Starting to load all data from API');
    
    // Crear un array para seguir los resultados de carga
    const loadResults = {
      valoresCambio: false,
      tiposMoneda: false,
      confLista: false,
      articulos: false,
      articulosSucursal: false
    };
    
    // Use forkJoin to load all data in parallel, con mejor manejo de errores individuales
    return forkJoin({
      valoresCambio: this.loadValoresCambioFromAPI().pipe(
        tap(() => loadResults.valoresCambio = true),
        catchError(error => {
          console.error('Error loading valoresCambio', error);
          return of([]);  // Continuar con array vacío en caso de error
        })
      ),
      tiposMoneda: this.loadTiposMonedaFromAPI().pipe(
        tap(() => loadResults.tiposMoneda = true),
        catchError(error => {
          console.error('Error loading tiposMoneda', error);
          return of([]);
        })
      ),
      confLista: this.loadConfListaFromAPI().pipe(
        tap(() => loadResults.confLista = true),
        catchError(error => {
          console.error('Error loading confLista', error);
          return of([]);
        })
      ),
      articulos: this.loadArticulosFromAPI().pipe(
        tap(() => loadResults.articulos = true),
        catchError(error => {
          console.error('Error loading articulos', error);
          return of([]);
        })
      ),
      articulosSucursal: this.loadArticulosSucursalFromAPI().pipe(
        tap(() => loadResults.articulosSucursal = true),
        catchError(error => {
          console.error('Error loading articulosSucursal', error);
          return of([]);
        })
      )
    }).pipe(
      map(results => {
        // Verificar qué datos se cargaron correctamente
        console.log('Datos cargados con éxito:', loadResults);
        console.log('Tamaños de datos cargados:', {
          valoresCambio: results.valoresCambio.length,
          tiposMoneda: results.tiposMoneda.length,
          confLista: results.confLista.length,
          articulos: results.articulos.length,
          articulosSucursal: results.articulosSucursal.length
        });
        
        // Considerar exitoso si al menos algunos datos clave se cargaron
        const success = loadResults.valoresCambio && 
                        loadResults.tiposMoneda && 
                        (loadResults.articulos || loadResults.articulosSucursal);
        
        if (!success) {
          console.warn('Carga parcial: algunos datos importantes no pudieron cargarse');
        }
        
        return success;
      }),
      catchError(error => {
        console.error('Error crítico al cargar todos los datos', error);
        return of(false);
      }),
      finalize(() => {
        this.loadingSubject.next(false);
        this.isLoadingData = false;
      })
    );
  }
  
  // Getters for direct data access
  getArticulos(): any[] {
    return this.articulosSubject.value;
  }
  
  getValoresCambio(): any[] {
    return this.valoresCambioSubject.value;
  }
  
  getTiposMoneda(): any[] {
    return this.tiposMonedaSubject.value;
  }
  
  getConfLista(): any[] {
    return this.confListaSubject.value;
  }
  
  getArticulosSucursal(): any[] {
    return this.articulosSucursalSubject.value;
  }
  
  // Load data with caching - return directly from cache if valid
  loadArticulos(): Observable<any[]> {
    const cache = this.loadArticulosFromCache();
    
    if (cache && cache.length > 0) {
      console.log('Returned articulos from cache, length:', cache.length);
      return of(cache);
    }
    
    return this.loadArticulosFromAPI();
  }
  
  loadValoresCambio(): Observable<any[]> {
    const cache = this.loadValoresCambioFromCache();
    
    if (cache && cache.length > 0) {
      console.log('Returned valores cambio from cache, length:', cache.length);
      return of(cache);
    }
    
    return this.loadValoresCambioFromAPI();
  }
  
  loadTiposMoneda(): Observable<any[]> {
    const cache = this.loadTiposMonedaFromCache();
    
    if (cache && cache.length > 0) {
      console.log('Returned tipos moneda from cache, length:', cache.length);
      return of(cache);
    }
    
    return this.loadTiposMonedaFromAPI();
  }
  
  loadConfLista(): Observable<any[]> {
    const cache = this.loadConfListaFromCache();
    
    if (cache && cache.length > 0) {
      console.log('Returned conf lista from cache, length:', cache.length);
      return of(cache);
    }
    
    return this.loadConfListaFromAPI();
  }
  
  loadArticulosSucursal(): Observable<any[]> {
    const cache = this.loadArticulosSucursalFromCache();
    
    if (cache && cache.length > 0) {
      console.log('Returned articulos sucursal from cache, length:', cache.length);
      return of(cache);
    }
    
    return this.loadArticulosSucursalFromAPI();
  }
  
  // API loading methods
  private loadArticulosFromAPI(): Observable<any[]> {
    console.log('Loading articulos from API');
    
    return this.cargardataService.getArticulos().pipe(
      map((response: any) => {
        if (response && !response.error && response.mensaje && response.mensaje.length > 0) {
          const articulos = response.mensaje;
          this.articulosSubject.next(articulos);
          this.saveArticulosToCache(articulos);
          console.log(`Successfully loaded ${articulos.length} articulos from API`);
          return articulos;
        } else {
          console.error('Error or empty articulos response:', response);
          // Keep current data if there was an error but we have cached data
          if (this.articulosSubject.value.length > 0) {
            console.log('Keeping existing articulos data');
            return this.articulosSubject.value;
          }
          return [];
        }
      }),
      catchError(error => {
        console.error('Error loading articulos from API:', error);
        // Keep current data if there was an error but we have cached data
        if (this.articulosSubject.value.length > 0) {
          console.log('Error loading from API, keeping existing articulos data');
          return of(this.articulosSubject.value);
        }
        return of([]);
      })
    );
  }
  
  private loadValoresCambioFromAPI(): Observable<any[]> {
    console.log('Loading valores cambio from API');
    
    return this.cargardataService.getValorCambio().pipe(
      map((response: any) => {
        if (response && !response.error && response.mensaje && response.mensaje.length > 0) {
          const valoresCambio = response.mensaje;
          this.valoresCambioSubject.next(valoresCambio);
          this.saveValoresCambioToCache(valoresCambio);
          console.log(`Successfully loaded ${valoresCambio.length} valores cambio from API`);
          return valoresCambio;
        } else {
          console.error('Error or empty valores cambio response:', response);
          // Keep current data if there was an error but we have cached data
          if (this.valoresCambioSubject.value.length > 0) {
            console.log('Keeping existing valores cambio data');
            return this.valoresCambioSubject.value;
          }
          return [];
        }
      }),
      catchError(error => {
        console.error('Error loading valores cambio from API:', error);
        // Keep current data if there was an error but we have cached data
        if (this.valoresCambioSubject.value.length > 0) {
          console.log('Error loading from API, keeping existing valores cambio data');
          return of(this.valoresCambioSubject.value);
        }
        return of([]);
      })
    );
  }
  
  private loadTiposMonedaFromAPI(): Observable<any[]> {
    console.log('Loading tipos moneda from API');
    
    return this.cargardataService.getTipoMoneda().pipe(
      map((response: any) => {
        if (response && !response.error && response.mensaje && response.mensaje.length > 0) {
          const tiposMoneda = response.mensaje;
          this.tiposMonedaSubject.next(tiposMoneda);
          this.saveTiposMonedaToCache(tiposMoneda);
          console.log(`Successfully loaded ${tiposMoneda.length} tipos moneda from API`);
          return tiposMoneda;
        } else {
          console.error('Error or empty tipos moneda response:', response);
          // Keep current data if there was an error but we have cached data
          if (this.tiposMonedaSubject.value.length > 0) {
            console.log('Keeping existing tipos moneda data');
            return this.tiposMonedaSubject.value;
          }
          return [];
        }
      }),
      catchError(error => {
        console.error('Error loading tipos moneda from API:', error);
        // Keep current data if there was an error but we have cached data
        if (this.tiposMonedaSubject.value.length > 0) {
          console.log('Error loading from API, keeping existing tipos moneda data');
          return of(this.tiposMonedaSubject.value);
        }
        return of([]);
      })
    );
  }
  
  private loadConfListaFromAPI(): Observable<any[]> {
    console.log('Loading conf lista from API');
    
    return this.cargardataService.getConflista().pipe(
      map((response: any) => {
        if (response && !response.error && response.mensaje && response.mensaje.length > 0) {
          const confLista = response.mensaje;
          this.confListaSubject.next(confLista);
          this.saveConfListaToCache(confLista);
          console.log(`Successfully loaded ${confLista.length} conf lista from API`);
          return confLista;
        } else {
          console.error('Error or empty conf lista response:', response);
          // Keep current data if there was an error but we have cached data
          if (this.confListaSubject.value.length > 0) {
            console.log('Keeping existing conf lista data');
            return this.confListaSubject.value;
          }
          return [];
        }
      }),
      catchError(error => {
        console.error('Error loading conf lista from API:', error);
        // Keep current data if there was an error but we have cached data
        if (this.confListaSubject.value.length > 0) {
          console.log('Error loading from API, keeping existing conf lista data');
          return of(this.confListaSubject.value);
        }
        return of([]);
      })
    );
  }
  
  // Cache loading methods
  private loadArticulosFromCache(): any[] {
    try {
      const cacheJson = sessionStorage.getItem(this.ARTICULOS_CACHE_KEY);
      if (!cacheJson) {
        console.log('No articulos cache found in sessionStorage');
        return [];
      }
      
      const cache: ArticuloCache = JSON.parse(cacheJson);
      
      // Check if cache is valid
      if (!this.isArticulosCacheValid(cache)) {
        console.log('Articulos cache invalid or expired, removing from sessionStorage');
        sessionStorage.removeItem(this.ARTICULOS_CACHE_KEY);
        return [];
      }
      
      console.log(`Loaded articulos from cache (${cache.data.length} items)`);
      this.articulosSubject.next(cache.data);
      return cache.data;
    } catch (error) {
      console.error('Error loading articulos from cache', error);
      sessionStorage.removeItem(this.ARTICULOS_CACHE_KEY);
      return [];
    }
  }
  
  private loadValoresCambioFromCache(): any[] {
    try {
      const cacheJson = sessionStorage.getItem(this.VALOR_CAMBIO_CACHE_KEY);
      if (!cacheJson) {
        console.log('No valores cambio cache found in sessionStorage');
        return [];
      }
      
      const cache: ValorCambioCache = JSON.parse(cacheJson);
      
      // Check if cache is valid
      if (!this.isCacheValid(cache)) {
        console.log('Valores cambio cache invalid or expired, removing from sessionStorage');
        sessionStorage.removeItem(this.VALOR_CAMBIO_CACHE_KEY);
        return [];
      }
      
      console.log(`Loaded valores cambio from cache (${cache.data.length} items)`);
      this.valoresCambioSubject.next(cache.data);
      return cache.data;
    } catch (error) {
      console.error('Error loading valores cambio from cache', error);
      sessionStorage.removeItem(this.VALOR_CAMBIO_CACHE_KEY);
      return [];
    }
  }
  
  private loadTiposMonedaFromCache(): any[] {
    try {
      const cacheJson = sessionStorage.getItem(this.TIPO_MONEDA_CACHE_KEY);
      if (!cacheJson) {
        console.log('No tipos moneda cache found in sessionStorage');
        return [];
      }
      
      const cache: TipoMonedaCache = JSON.parse(cacheJson);
      
      // Check if cache is valid
      if (!this.isCacheValid(cache)) {
        console.log('Tipos moneda cache invalid or expired, removing from sessionStorage');
        sessionStorage.removeItem(this.TIPO_MONEDA_CACHE_KEY);
        return [];
      }
      
      console.log(`Loaded tipos moneda from cache (${cache.data.length} items)`);
      this.tiposMonedaSubject.next(cache.data);
      return cache.data;
    } catch (error) {
      console.error('Error loading tipos moneda from cache', error);
      sessionStorage.removeItem(this.TIPO_MONEDA_CACHE_KEY);
      return [];
    }
  }
  
  private loadConfListaFromCache(): any[] {
    try {
      const cacheJson = sessionStorage.getItem(this.CONF_LISTA_CACHE_KEY);
      if (!cacheJson) {
        console.log('No conf lista cache found in sessionStorage');
        return [];
      }
      
      const cache: ConfListaCache = JSON.parse(cacheJson);
      
      // Check if cache is valid
      if (!this.isCacheValid(cache)) {
        console.log('Conf lista cache invalid or expired, removing from sessionStorage');
        sessionStorage.removeItem(this.CONF_LISTA_CACHE_KEY);
        return [];
      }
      
      console.log(`Loaded conf lista from cache (${cache.data.length} items)`);
      this.confListaSubject.next(cache.data);
      return cache.data;
    } catch (error) {
      console.error('Error loading conf lista from cache', error);
      sessionStorage.removeItem(this.CONF_LISTA_CACHE_KEY);
      return [];
    }
  }
  
  // Cache saving methods
  private saveArticulosToCache(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        console.warn('Attempted to save empty articulos data to cache, skipping');
        return;
      }
      
      const cache: ArticuloCache = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      
      sessionStorage.setItem(this.ARTICULOS_CACHE_KEY, JSON.stringify(cache));
      console.log(`Saved articulos to sessionStorage cache (${data.length} items)`);
    } catch (error) {
      console.error('Error saving articulos to cache', error);
      // If storing fails (e.g., due to quota exceeded), clear all caches
      this.clearAllCaches();
    }
  }
  
  private saveValoresCambioToCache(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        console.warn('Attempted to save empty valores cambio data to cache, skipping');
        return;
      }
      
      const cache: ValorCambioCache = {
        data,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(this.VALOR_CAMBIO_CACHE_KEY, JSON.stringify(cache));
      console.log(`Saved valores cambio to sessionStorage cache (${data.length} items)`);
    } catch (error) {
      console.error('Error saving valores cambio to cache', error);
    }
  }
  
  private saveTiposMonedaToCache(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        console.warn('Attempted to save empty tipos moneda data to cache, skipping');
        return;
      }
      
      const cache: TipoMonedaCache = {
        data,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(this.TIPO_MONEDA_CACHE_KEY, JSON.stringify(cache));
      console.log(`Saved tipos moneda to sessionStorage cache (${data.length} items)`);
    } catch (error) {
      console.error('Error saving tipos moneda to cache', error);
    }
  }
  
  private saveConfListaToCache(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        console.warn('Attempted to save empty conf lista data to cache, skipping');
        return;
      }
      
      const cache: ConfListaCache = {
        data,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(this.CONF_LISTA_CACHE_KEY, JSON.stringify(cache));
      console.log(`Saved conf lista to sessionStorage cache (${data.length} items)`);
    } catch (error) {
      console.error('Error saving conf lista to cache', error);
    }
  }
  
  // Cache validation methods
  private isArticulosCacheValid(cache: ArticuloCache): boolean {
    // Check if cache is not expired and version matches
    if (!cache || !cache.timestamp || !cache.data) {
      return false;
    }
    
    const now = Date.now();
    const isExpired = now - cache.timestamp > this.CACHE_EXPIRATION;
    const isVersionValid = cache.version === this.CACHE_VERSION;
    
    return !isExpired && isVersionValid;
  }
  
  private isCacheValid(cache: any): boolean {
    // Check if cache is not expired
    if (!cache || !cache.timestamp || !cache.data) {
      return false;
    }
    
    const now = Date.now();
    const isExpired = now - cache.timestamp > this.CACHE_EXPIRATION;
    
    return !isExpired;
  }
  
  // Nuevos métodos para articulosSucursal
  private loadArticulosSucursalFromCache(): any[] {
    try {
      const cacheJson = sessionStorage.getItem(this.ARTICULOS_SUCURSAL_CACHE_KEY);
      if (!cacheJson) {
        console.log('No articulos sucursal cache found in sessionStorage');
        return [];
      }
      
      const cache = JSON.parse(cacheJson);
      
      // Check if cache is valid
      if (!this.isCacheValid(cache)) {
        console.log('Articulos sucursal cache invalid or expired, removing from sessionStorage');
        sessionStorage.removeItem(this.ARTICULOS_SUCURSAL_CACHE_KEY);
        return [];
      }
      
      console.log(`Loaded articulos sucursal from cache (${cache.data.length} items)`);
      this.articulosSucursalSubject.next(cache.data);
      return cache.data;
    } catch (error) {
      console.error('Error loading articulos sucursal from cache', error);
      sessionStorage.removeItem(this.ARTICULOS_SUCURSAL_CACHE_KEY);
      return [];
    }
  }
  
  private loadArticulosSucursalFromAPI(): Observable<any[]> {
    console.log('Loading articulos sucursal from API');
    
    return this.cargardataService.artsucursal().pipe(
      map((response: any) => {
        if (response && !response.error && response.mensaje && response.mensaje.length > 0) {
          const articulosSucursal = response.mensaje;
          this.articulosSucursalSubject.next(articulosSucursal);
          this.saveArticulosSucursalToCache(articulosSucursal);
          console.log(`Successfully loaded ${articulosSucursal.length} articulos sucursal from API`);
          return articulosSucursal;
        } else {
          console.error('Error or empty articulos sucursal response:', response);
          // Keep current data if there was an error but we have cached data
          if (this.articulosSucursalSubject.value.length > 0) {
            console.log('Keeping existing articulos sucursal data');
            return this.articulosSucursalSubject.value;
          }
          return [];
        }
      }),
      catchError(error => {
        console.error('Error loading articulos sucursal from API:', error);
        // Keep current data if there was an error but we have cached data
        if (this.articulosSucursalSubject.value.length > 0) {
          console.log('Error loading from API, keeping existing articulos sucursal data');
          return of(this.articulosSucursalSubject.value);
        }
        return of([]);
      })
    );
  }
  
  private saveArticulosSucursalToCache(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        console.warn('Attempted to save empty articulos sucursal data to cache, skipping');
        return;
      }
      
      const cache = {
        data,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(this.ARTICULOS_SUCURSAL_CACHE_KEY, JSON.stringify(cache));
      console.log(`Saved articulos sucursal to sessionStorage cache (${data.length} items)`);
    } catch (error) {
      console.error('Error saving articulos sucursal to cache', error);
    }
  }
}


