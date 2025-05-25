import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { CajamoviComponent } from './cajamovi.component';
import { CajamoviPaginadosService } from '../../services/cajamovi-paginados.service';
import { CajamoviHelperService } from '../../services/cajamovi-helper.service';
import { ReporteDataService } from '../../services/reporte-data.service';
import { AuthService } from '../../services/auth.service';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { PrimeNGConfig } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { BehaviorSubject, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

// Mock de datos de prueba
const mockCajamovis = [
  {
    id_movimiento: 1,
    sucursal: 1,
    codigo_mov: 101,
    num_operacion: 1001,
    fecha_mov: '2024-01-15',
    importe_mov: 1500.50,
    descripcion_mov: 'Venta de producto',
    descripcion_concepto: 'Ingreso por ventas',
    descripcion_caja: 'Caja Principal',
    tipo_movi: 'M'
  },
  {
    id_movimiento: 2,
    sucursal: 1,
    codigo_mov: 102,
    num_operacion: 1002,
    fecha_mov: '2024-01-16',
    importe_mov: -750.00,
    descripcion_mov: 'Pago a proveedor',
    descripcion_concepto: 'Egreso por compras',
    descripcion_caja: 'Caja Principal',
    tipo_movi: 'M'
  }
];

describe('CajamoviComponent - Pruebas Exhaustivas', () => {
  let component: CajamoviComponent;
  let fixture: ComponentFixture<CajamoviComponent>;
  let cajamoviPaginadosService: jasmine.SpyObj<CajamoviPaginadosService>;
  let authService: jasmine.SpyObj<AuthService>;
  let subirdataService: jasmine.SpyObj<SubirdataService>;
  let reporteDataService: jasmine.SpyObj<ReporteDataService>;

  beforeEach(async () => {
    // Crear mocks de los servicios
    const cajamoviPaginadosServiceSpy = jasmine.createSpyObj('CajamoviPaginadosService', [
      'setTamañoPagina', 'cargarPagina', 'irAPagina', 'paginaSiguiente', 'paginaAnterior'
    ]);
    
    // Configurar observables para el servicio paginado
    cajamoviPaginadosServiceSpy.cargando$ = new BehaviorSubject(false);
    cajamoviPaginadosServiceSpy.cajamovis$ = new BehaviorSubject(mockCajamovis);
    cajamoviPaginadosServiceSpy.paginaActual$ = new BehaviorSubject(1);
    cajamoviPaginadosServiceSpy.totalPaginas$ = new BehaviorSubject(5);
    cajamoviPaginadosServiceSpy.totalItems$ = new BehaviorSubject(100);
    cajamoviPaginadosServiceSpy.cargarPagina.and.returnValue(of({ mensaje: mockCajamovis }));

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.user$ = new BehaviorSubject({ nivel: 'admin', id: 1 });

    const subirdataServiceSpy = jasmine.createSpyObj('SubirdataService', ['eliminarCajamovi']);
    const reporteDataServiceSpy = jasmine.createSpyObj('ReporteDataService', ['setReporteData', 'clearReporteData']);

    await TestBed.configureTestingModule({
      declarations: [ CajamoviComponent ],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        FormsModule,
        TableModule,
        CalendarModule,
        ButtonModule,
        DropdownModule
      ],
      providers: [
        { provide: CajamoviPaginadosService, useValue: cajamoviPaginadosServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SubirdataService, useValue: subirdataServiceSpy },
        { provide: ReporteDataService, useValue: reporteDataServiceSpy },
        CajamoviHelperService,
        CargardataService,
        PrimeNGConfig
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CajamoviComponent);
    component = fixture.componentInstance;
    cajamoviPaginadosService = TestBed.inject(CajamoviPaginadosService) as jasmine.SpyObj<CajamoviPaginadosService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    subirdataService = TestBed.inject(SubirdataService) as jasmine.SpyObj<SubirdataService>;
    reporteDataService = TestBed.inject(ReporteDataService) as jasmine.SpyObj<ReporteDataService>;
  });

  afterEach(() => {
    // Limpiar mocks de Swal
    if (Swal.isVisible()) {
      Swal.close();
    }
  });

  describe('1. Inicialización y Configuración', () => {
    it('debe crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debe inicializar con valores por defecto correctos', () => {
      expect(component.cajamovis).toEqual([]);
      expect(component.cajamovisFiltrados).toEqual([]);
      expect(component.loading).toBe(false);
      expect(component.selectedCajamovis).toEqual([]);
      expect(component.seleccionCompleta.size).toBe(0);
      expect(component.registrosPorPagina).toBe(100);
    });

    it('debe configurar el servicio de paginación en ngOnInit', () => {
      component.ngOnInit();
      expect(cajamoviPaginadosService.setTamañoPagina).toHaveBeenCalledWith(100);
    });
  });

  describe('2. Gestión de Selección y Paginación', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('debe mantener la selección al cambiar de página', fakeAsync(() => {
      // Simular selección de items
      component.cajamovisFiltrados = mockCajamovis;
      component.selectedCajamovis = [mockCajamovis[0]];
      component.seleccionCompleta.add(1);
      
      // Simular cambio de página con nuevos datos
      const nuevosDatos = [
        { ...mockCajamovis[0], id_movimiento: 3 },
        { ...mockCajamovis[1], id_movimiento: 4 }
      ];
      
      (cajamoviPaginadosService.cajamovis$ as BehaviorSubject<any>).next(nuevosDatos);
      tick();
      
      // Verificar que la selección global se mantiene
      expect(component.seleccionCompleta.has(1)).toBe(true);
      expect(component.seleccionCompleta.size).toBe(1);
    }));

    it('debe sincronizar correctamente la selección entre páginas', () => {
      // Configurar datos y selección
      component.seleccionCompleta.add(1);
      component.seleccionCompleta.add(5); // Item de otra página
      component.cajamovisFiltrados = mockCajamovis;
      
      // Ejecutar sincronización
      component['sincronizarSeleccion']();
      
      // Solo el item 1 debe estar en selectedCajamovis (está en la página actual)
      expect(component.selectedCajamovis.length).toBe(1);
      expect(component.selectedCajamovis[0].id_movimiento).toBe(1);
    });

    it('debe manejar correctamente onSelectionChange', () => {
      component.cajamovisFiltrados = mockCajamovis;
      component['actualizarItemsVisibles']();
      
      const event = { value: [mockCajamovis[0], mockCajamovis[1]] };
      component.onSelectionChange(event);
      
      expect(component.seleccionCompleta.size).toBe(2);
      expect(component.seleccionCompleta.has(1)).toBe(true);
      expect(component.seleccionCompleta.has(2)).toBe(true);
    });

    it('debe limpiar toda la selección correctamente', () => {
      // Configurar selección
      component.seleccionCompleta.add(1);
      component.seleccionCompleta.add(2);
      component.selectedCajamovis = mockCajamovis;
      
      // Limpiar selección
      component.limpiarSeleccion();
      
      expect(component.seleccionCompleta.size).toBe(0);
      expect(component.selectedCajamovis.length).toBe(0);
    });
  });

  describe('3. Manejo de Datos Masivos', () => {
    it('debe procesar datos sin duplicar arrays', () => {
      const datosGrandes = Array(1000).fill(null).map((_, i) => ({
        ...mockCajamovis[0],
        id_movimiento: i + 1
      }));
      
      component.processCajamovis(datosGrandes);
      
      // Verificar que no se duplican arrays
      expect(component.cajamovis).toBe(component.cajamovisFiltrados);
      expect(component.cajamovis.length).toBe(1000);
    });

    it('debe aplicar conversión lazy de fechas', () => {
      const datos = [{
        ...mockCajamovis[0],
        fecha_emibco: '2024-01-20',
        fecha_cobro_bco: '2024-01-25',
        _fechasConvertidas: false
      }];
      
      component.processCajamovis(datos);
      
      // Solo fecha_mov debe estar convertida inicialmente
      expect(datos[0].fecha_mov instanceof Date).toBe(true);
      expect(typeof datos[0].fecha_emibco).toBe('string');
      
      // Convertir fechas lazy
      component['convertirFechasLazy'](datos[0]);
      
      expect(datos[0].fecha_emibco instanceof Date).toBe(true);
      expect(datos[0]._fechasConvertidas).toBe(true);
    });

    it('debe manejar eficientemente la sincronización con grandes cantidades', () => {
      // Crear 2000 items
      const datosGrandes = Array(2000).fill(null).map((_, i) => ({
        ...mockCajamovis[0],
        id_movimiento: i + 1
      }));
      
      component.cajamovisFiltrados = datosGrandes;
      
      // Seleccionar algunos items
      for (let i = 1; i <= 500; i++) {
        component.seleccionCompleta.add(i);
      }
      
      const startTime = performance.now();
      component['sincronizarSeleccion']();
      const endTime = performance.now();
      
      // Debe completarse rápidamente (menos de 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(component.selectedCajamovis.length).toBe(500);
    });
  });

  describe('4. Prevención de Fugas de Memoria', () => {
    it('debe limpiar todas las suscripciones en ngOnDestroy', () => {
      component.ngOnInit();
      fixture.detectChanges();
      
      // Configurar algunos datos y timeouts
      component.cajamovis = mockCajamovis;
      component.selectedCajamovis = [mockCajamovis[0]];
      component.seleccionCompleta.add(1);
      component['filterTimeout'] = setTimeout(() => {}, 1000);
      
      // Espiar el subject
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      // Destruir componente
      component.ngOnDestroy();
      
      // Verificar limpieza
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
      expect(component.cajamovis.length).toBe(0);
      expect(component.selectedCajamovis.length).toBe(0);
      expect(component.seleccionCompleta.size).toBe(0);
      expect(component['filterTimeout']).toBeNull();
    });

    it('debe manejar correctamente el flag isNavigatingAway', () => {
      component['isNavigatingAway'] = true;
      
      // Mock sessionStorage
      spyOn(sessionStorage, 'removeItem');
      
      component.ngOnDestroy();
      
      // No debe limpiar sessionStorage si está navegando
      expect(sessionStorage.removeItem).not.toHaveBeenCalled();
      expect(component['isNavigatingAway']).toBe(false);
    });
  });

  describe('5. Filtros y Búsquedas', () => {
    it('debe aplicar filtros de fecha correctamente', fakeAsync(() => {
      component.fechaDesde = new Date('2024-01-01');
      component.fechaHasta = new Date('2024-01-31');
      
      component.aplicarFiltroFecha();
      tick();
      
      expect(cajamoviPaginadosService.cargarPagina).toHaveBeenCalledWith(
        1, null, component.fechaDesde, component.fechaHasta
      );
    }));

    it('debe validar que fechaDesde no sea mayor que fechaHasta', () => {
      spyOn(component as any, 'showErrorMessage');
      
      component.fechaDesde = new Date('2024-01-31');
      component.fechaHasta = new Date('2024-01-01');
      
      component.aplicarFiltroFecha();
      
      expect((component as any).showErrorMessage).toHaveBeenCalledWith(
        'La fecha desde no puede ser mayor que la fecha hasta'
      );
    });

    it('debe manejar el timeout de filtros correctamente', fakeAsync(() => {
      component.onTableFilter({});
      
      expect(component['filterTimeout']).toBeDefined();
      
      // Simular otro filtro antes de que termine el timeout
      component.onTableFilter({});
      tick(10);
      
      // Debe haber cancelado el timeout anterior
      expect(component['filterTimeout']).toBeNull();
    }));
  });

  describe('6. Exportación y Reportes', () => {
    it('debe preparar datos para exportación correctamente', () => {
      const datos = component['prepararDatosParaExportacion'](mockCajamovis);
      
      expect(datos.length).toBe(2);
      expect(datos[0]['Sucursal']).toBe(1);
      expect(datos[0]['Importe']).toBe(1500.50);
      expect(datos[1]['Importe']).toBe(-750.00);
    });

    it('debe mostrar indicador de carga para exportaciones grandes', fakeAsync(() => {
      // Crear 1500 items
      const datosGrandes = Array(1500).fill(null).map((_, i) => ({
        ...mockCajamovis[0],
        id_movimiento: i + 1
      }));
      
      component.cajamovisFiltrados = datosGrandes;
      spyOn(Swal, 'fire');
      
      component.exportExcel();
      tick(100);
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        title: 'Exportando datos...',
        text: 'Procesando 1500 registros'
      }));
    }));

    it('debe manejar la generación de reportes con selección múltiple', fakeAsync(() => {
      // Configurar selección
      component.seleccionCompleta.add(1);
      component.seleccionCompleta.add(2);
      component.cajamovisFiltrados = mockCajamovis;
      
      spyOn(component['router'], 'navigate').and.returnValue(Promise.resolve(true));
      
      component.generarReporte();
      tick();
      
      expect(reporteDataService.setReporteData).toHaveBeenCalled();
      expect(component['router'].navigate).toHaveBeenCalledWith(['/components/reporte']);
    }));
  });

  describe('7. Permisos y Seguridad', () => {
    it('debe permitir edición/eliminación a admin para cualquier fecha', () => {
      authService.user$ = new BehaviorSubject({ nivel: 'admin', id: 1 });
      component.ngOnInit();
      
      const cajamoviAntiguo = { ...mockCajamovis[0], fecha_mov: '2020-01-01' };
      
      expect(component.canEditOrDelete(cajamoviAntiguo)).toBe(true);
    });

    it('debe restringir edición/eliminación para usuarios normales en fechas pasadas', () => {
      authService.user$ = new BehaviorSubject({ nivel: 'user', id: 2 });
      component['currentUser'] = { nivel: 'user', id: 2 } as any;
      
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const cajamoviAntiguo = { ...mockCajamovis[0], fecha_mov: ayer.toISOString() };
      
      expect(component.canEditOrDelete(cajamoviAntiguo)).toBe(false);
    });
  });

  describe('8. Cambio de Tamaño de Página', () => {
    it('debe cambiar el tamaño de página y recargar datos', fakeAsync(() => {
      const event = { value: 200 };
      
      component.onRegistrosPorPaginaChange(event);
      tick();
      
      expect(component.registrosPorPagina).toBe(200);
      expect(cajamoviPaginadosService.setTamañoPagina).toHaveBeenCalledWith(200);
      expect(cajamoviPaginadosService.cargarPagina).toHaveBeenCalledWith(
        1, null, null, null
      );
    }));

    it('debe mantener la selección al cambiar tamaño de página', fakeAsync(() => {
      // Configurar selección
      component.seleccionCompleta.add(1);
      component.seleccionCompleta.add(2);
      const tamañoInicial = component.seleccionCompleta.size;
      
      component.onRegistrosPorPaginaChange({ value: 50 });
      tick();
      
      // La selección debe mantenerse
      expect(component.seleccionCompleta.size).toBe(tamañoInicial);
    }));
  });
});