# Investigación: Origen y Flujo del Valor "sucursal" en sessionStorage

**Fecha**: 2025-11-02
**Versión**: 1.0
**Componente Analizado**: Login2Component (Sistema de Autenticación Actual)

---

## Resumen Ejecutivo

Este documento detalla el análisis completo del flujo de datos relacionado con el almacenamiento de la sucursal del usuario en `sessionStorage`. Se ha investigado exclusivamente el sistema de login actual (`login2.component`), obviando la implementación legacy.

**Conclusión Principal**: El valor almacenado en `sessionStorage` con la key `'sucursal'` es un identificador numérico que representa el código de la sucursal seleccionada por el usuario durante el proceso de login. Este valor se obtiene desde Firebase Realtime Database y corresponde al campo `cod_sucursal` de la tabla PostgreSQL.

---

## 1. Punto de Entrada: Componente Login2

### 1.1 Ubicación
- **Archivo**: `src/app/components/auth/login2/login2.component.ts`
- **Línea crítica**: Línea 126
- **HTML**: `src/app/components/auth/login2/login2.component.html`

### 1.2 Código Relevante

```typescript
// Línea 126 en login2.component.ts
sessionStorage.setItem('sucursal', this.sucursal);
```

Este es el único lugar en el flujo de login actual donde se establece el valor de sucursal en sessionStorage.

---

## 2. Origen de los Datos de Sucursales

### 2.1 Fuente de Datos: Firebase Realtime Database

Las sucursales se cargan desde Firebase mediante el siguiente método:

```typescript
// login2.component.ts - Líneas 45-64
loadSucursales(): void {
  this.crudService.getListSnap('sucursales').pipe(
    takeUntil(this.destroy$)
  ).subscribe(
    data => {
      this.sucursales = data.map(item => {
        const payload = item.payload.val() as any;
        return {
          key: item.key,
          nombre: payload.nombre,
          value: payload.value
        };
      });
    },
    error => {
      console.error('Error al cargar sucursales:', error);
      this.showError('Error al cargar las sucursales');
    }
  );
}
```

**Servicio Utilizado**: `CrudService.getListSnap()`
- **Ubicación**: `src/app/services/crud.service.ts`
- **Método**: `getListSnap(item: string)` - Línea 17
- **Implementación**: `return this.db.list(item).snapshotChanges();`

### 2.2 Estructura de Datos en Firebase

Cada sucursal en Firebase Realtime Database (nodo `sucursales`) tiene la siguiente estructura:

```json
{
  "sucursales": {
    "[key-firebase]": {
      "nombre": "NOMBRE_SUCURSAL",
      "value": 1  // Código numérico de la sucursal
    }
  }
}
```

**Campos mapeados**:
- `key`: ID autogenerado por Firebase
- `nombre`: Nombre descriptivo de la sucursal
- `value`: Código numérico que corresponde a `cod_sucursal` en PostgreSQL

---

## 3. Estructura en PostgreSQL

### 3.1 Tabla de Sucursales

La base de datos PostgreSQL contiene la tabla `sucursales` con la siguiente estructura:

```sql
SELECT * FROM sucursales ORDER BY cod_sucursal;
```

**Resultado**:
| cod_sucursal | sucursal      | mail                        | contrasena |
|--------------|---------------|-----------------------------|------------|
| 1            | DEPOSITO      | g_sarate@hotmail.com        | 1234       |
| 2            | CASA CENTRAL  | g_sarate@hotmail.com        | 1234       |
| 3            | VALLE VIEJO   | g_sarate@hotmail.com        | 1234       |
| 4            | GUEMES        | g_sarate@hotmail.com        | 1234       |
| 5            | MAYORISTA     | g_sarate@hotmail.com        | 1234       |

### 3.2 Relación Firebase ↔ PostgreSQL

El campo `value` almacenado en Firebase corresponde exactamente al campo `cod_sucursal` de PostgreSQL:

```
Firebase: sucursales → value (1, 2, 3, 4, 5)
    ↓
PostgreSQL: sucursales → cod_sucursal (1, 2, 3, 4, 5)
```

### 3.3 Tablas Relacionadas en PostgreSQL

El sistema utiliza el código de sucursal en múltiples tablas:
- `artsucursal`: Stock y precios por sucursal (columnas: exi1-5, prefi1-4, stkmin1-5, etc.)
- `psucursal1` a `psucursal5`: Tablas de pedidos por sucursal
- Otros procesos que filtran datos por sucursal

---

## 4. Flujo Completo del Proceso de Login

### 4.1 Diagrama de Flujo

```
[Inicio de Sesión]
        ↓
[ngOnInit() - login2.component.ts]
        ↓
[loadSucursales()]
        ↓
[CrudService.getListSnap('sucursales')]
        ↓
[Firebase Realtime Database]
        ↓ (retorna array de sucursales)
[Mapeo: {key, nombre, value}]
        ↓
[HTML: Dropdown de selección]
        ↓
[Usuario selecciona sucursal]
        ↓
[onSucursalChange(event)]
        ↓ (actualiza this.sucursal)
[Usuario hace submit del formulario]
        ↓
[Validación: ¿Sucursal seleccionada?]
        ↓ (SI)
[AuthService.signIn(email, password)]
        ↓ (retorna usuario con sucursalesPermitidas)
[Validación: ¿Usuario tiene acceso a la sucursal?]
        ↓ (SI)
[sessionStorage.setItem('sucursal', this.sucursal)]
        ↓
[Redirección a /components/puntoventa]
```

### 4.2 Paso a Paso Detallado

#### Paso 1: Inicialización del Componente
```typescript
ngOnInit(): void {
  this.checkRememberMe();
  this.loadSavedCredentials();
  this.loadSucursales();  // <- Carga las sucursales desde Firebase
}
```

#### Paso 2: Carga de Sucursales desde Firebase
```typescript
loadSucursales(): void {
  this.crudService.getListSnap('sucursales')
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.sucursales = data.map(item => ({
        key: item.key,           // ID de Firebase
        nombre: payload.nombre,   // "DEPOSITO", "CASA CENTRAL", etc.
        value: payload.value      // 1, 2, 3, 4, 5
      }));
    });
}
```

#### Paso 3: Presentación en HTML
```html
<select class="form-control" (change)="onSucursalChange($event)">
  <option value="" disabled selected>Seleccione sucursal</option>
  <option *ngFor="let suc of sucursales" [value]="suc.value">
    {{suc.nombre}}
  </option>
</select>
```

#### Paso 4: Selección del Usuario
```typescript
onSucursalChange(event: any): void {
  this.sucursal = event.target.value;  // Asigna el value (1, 2, 3, 4, o 5)
}
```

#### Paso 5: Submit del Formulario
```typescript
onSubmit(): void {
  // Validación 1: Formulario válido
  if (this.loginForm.invalid) return;

  // Validación 2: Sucursal seleccionada
  if (!this.sucursal) {
    this.showError('Debe seleccionar una sucursal');
    return;
  }

  const { email, password } = this.loginForm.value;

  // Autenticación con Firebase
  this.authService.signIn(email, password).then((user) => {
    // Validación 3: Usuario tiene acceso a la sucursal
    if (user.sucursalesPermitidas && user.sucursalesPermitidas.length > 0) {
      const sucursalValue = parseInt(this.sucursal, 10);
      if (!user.sucursalesPermitidas.includes(sucursalValue)) {
        this.showError('No tiene acceso a la sucursal seleccionada');
        return;
      }
    }

    // ✅ PUNTO CRÍTICO: Almacenamiento en sessionStorage
    sessionStorage.setItem('sucursal', this.sucursal);

    // Almacenar otros datos del usuario
    sessionStorage.setItem('usernameOp', user.nombre);
    sessionStorage.setItem('emailOp', user.email);
    // ... más datos

    // Redirección
    this.router.navigate(['/components/puntoventa']);
  });
}
```

---

## 5. Sistema de Permisos de Sucursales

### 5.1 Estructura de Usuario en Firebase

```json
{
  "usuarios": {
    "cliente": {
      "[uid-firebase]": {
        "email": "usuario@example.com",
        "nombre": "Juan",
        "apellido": "Pérez",
        "nivel": "admin",
        "sucursalesPermitidas": [1, 3, 5]  // <- Array de códigos de sucursales
      }
    }
  }
}
```

### 5.2 Validación de Acceso

```typescript
// login2.component.ts - Líneas 117-123
if (user.sucursalesPermitidas && user.sucursalesPermitidas.length > 0) {
  const sucursalValue = parseInt(this.sucursal, 10);
  if (!user.sucursalesPermitidas.includes(sucursalValue)) {
    this.showError('No tiene acceso a la sucursal seleccionada');
    return;
  }
}
```

**Lógica de Validación**:
1. Si el usuario tiene el campo `sucursalesPermitidas` definido
2. Y el array no está vacío
3. Entonces se valida que la sucursal seleccionada esté en el array
4. Si no está, se muestra error y se detiene el login

### 5.3 AuthService: Obtención de Permisos

```typescript
// auth.service.ts - Líneas 66-78
const userData = actions[0].payload.val();
return {
  uid: key,
  email: userData.email,
  nombre: userData.nombre || '',
  // ... otros campos
  sucursalesPermitidas: userData.sucursalesPermitidas || []  // <- Carga los permisos
} as User;
```

---

## 6. Uso del Valor de Sucursal en la Aplicación

### 6.1 Estadísticas de Uso

Se encontraron **65 referencias** al valor de sucursal en sessionStorage distribuidas en:

**Servicios** (5 archivos):
- `stock-paginados.service.ts`: 3 referencias
- `price-update.service.ts`: 1 referencia
- `historial-ventas2-paginados.service.ts`: 6 referencias
- `historial-ventas-paginados.service.ts`: 3 referencias
- `articulos-paginados.service.ts`: 3 referencias
- `historial-pdf.service.ts`: 1 referencia

**Componentes** (16 archivos):
- `carrito.component.ts`: 11 referencias
- `cambioprecios.component.ts`: 3 referencias
- `cajamovi.component.ts`: 1 referencia
- `newcliente.component.ts`: 1 referencia
- `editcliente.component.ts`: 1 referencia
- `cabeceras.component.ts`: 4 referencias
- `editcajamovi.component.ts`: 3 referencias
- `newcajamovi.component.ts`: 3 referencias
- Y más...

**Configuración**:
- `empresa-config.ts`: 1 referencia

**Shared**:
- `header.component.ts`: 1 referencia

### 6.2 Patrones de Uso Comunes

#### Patrón 1: Obtención del Valor
```typescript
const sucursal = sessionStorage.getItem('sucursal');
```

#### Patrón 2: Conversión a Número
```typescript
const sucursalId = parseInt(sessionStorage.getItem('sucursal') || '0');
this.sucursal = Number(sessionStorage.getItem('sucursal'));
```

#### Patrón 3: Uso con Fallback
```typescript
const sucursal = sessionStorage.getItem('sucursal');
if (!sucursal) {
  console.error('No se encontró la sucursal en sessionStorage');
  return;
}
```

#### Patrón 4: Uso Directo en Operaciones
```typescript
// En carrito.component.ts
this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
```

### 6.3 Casos de Uso Principales

1. **Filtrado de Stock**: Los servicios de stock filtran artículos por sucursal
2. **Punto de Venta**: El carrito usa la sucursal para determinar el punto de venta
3. **Generación de Reportes**: Los PDFs usan la sucursal para personalizar documentos
4. **Consultas a PostgreSQL**: Las operaciones de backend filtran por código de sucursal
5. **Gestión de Inventario**: Movimientos de stock se asocian a sucursales específicas

---

## 7. Integración con Backend (PostgreSQL)

### 7.1 Archivo de Descarga (Backend)

El backend utiliza el valor de sucursal para filtrar consultas SQL. Ejemplo del flujo:

```
Frontend (Angular)
    ↓ [sessionStorage.getItem('sucursal')] = "1"
    ↓ [HTTP Request con sucursal en parámetros]
Backend (PHP/CodeIgniter)
    ↓ [Recibe parámetro sucursal]
    ↓ [Construye Query SQL]
PostgreSQL
    ↓ [WHERE cod_sucursal = $sucursal]
    ↓ [Retorna datos filtrados]
```

### 7.2 Consultas Típicas en PostgreSQL

```sql
-- Ejemplo: Obtener stock de artículos por sucursal
SELECT * FROM artsucursal
WHERE CASE
  WHEN $sucursal = 1 THEN exi1
  WHEN $sucursal = 2 THEN exi2
  WHEN $sucursal = 3 THEN exi3
  WHEN $sucursal = 4 THEN exi4
  WHEN $sucursal = 5 THEN exi5
END > 0;

-- Ejemplo: Pedidos de una sucursal específica
SELECT * FROM psucursal1 WHERE fecha >= $fecha_inicio;
-- (La tabla misma ya representa la sucursal 1)
```

---

## 8. Consideraciones de Seguridad

### 8.1 Fortalezas del Sistema Actual

1. **Validación en Login**: Se valida que el usuario tenga permisos para la sucursal seleccionada
2. **Array de Sucursales Permitidas**: Control granular de accesos por usuario
3. **Validación Obligatoria**: No se permite login sin seleccionar sucursal

### 8.2 Posibles Vulnerabilidades

1. **Manipulación de sessionStorage**: Un usuario técnico podría modificar el valor en sessionStorage después del login
2. **Sin Revalidación**: No se revalida el permiso de sucursal en cada operación
3. **Falta de Token de Sucursal**: No hay un token encriptado que vincule la sucursal con la sesión

### 8.3 Recomendaciones de Seguridad

1. **Validación en Backend**: Cada endpoint debe validar que el usuario tenga acceso a la sucursal solicitada
2. **Token de Sesión**: Incluir la sucursal en el token JWT junto con el usuario
3. **Revalidación Periódica**: Verificar permisos de sucursal en operaciones críticas
4. **Logs de Auditoría**: Registrar cambios de sucursal o intentos de acceso no autorizado

---

## 9. Ciclo de Vida del Valor de Sucursal

### 9.1 Creación
- **Momento**: Al hacer submit exitoso del formulario de login
- **Ubicación**: `login2.component.ts:126`
- **Valor**: Código numérico (1-5) convertido a string

### 9.2 Persistencia
- **Almacenamiento**: `sessionStorage` (temporal, por sesión del navegador)
- **Duración**: Hasta que el usuario cierre la pestaña/ventana del navegador o haga logout
- **Alcance**: Misma ventana/pestaña del navegador

### 9.3 Lectura
- **Frecuencia**: Multiple veces por sesión
- **Ubicaciones**: 65+ ubicaciones en toda la aplicación
- **Formato**: String que se convierte a número según necesidad

### 9.4 Eliminación
- **Momento**: Al hacer logout
- **Método**: `sessionStorage.clear()` en `AuthService.signOut()` (línea 143)
- **Ubicación**: `auth.service.ts:143`

```typescript
async signOut(): Promise<void> {
  await this.afAuth.signOut();
  sessionStorage.clear();  // <- Limpia TODO el sessionStorage
  this.router.navigate(['/login2']);
}
```

---

## 10. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE PRESENTACIÓN                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Login2Component (HTML + TypeScript)        │    │
│  │                                                     │    │
│  │  1. Usuario selecciona sucursal del dropdown       │    │
│  │  2. Valor asignado a this.sucursal (string)       │    │
│  └─────────────┬───────────────────────────────────────┘    │
│                │                                             │
└────────────────┼─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE SERVICIOS                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                 AuthService                         │    │
│  │                                                     │    │
│  │  1. signIn(email, password)                        │    │
│  │  2. Obtiene datos del usuario desde Firebase      │    │
│  │  3. Retorna: { sucursalesPermitidas: [1,3,5] }    │    │
│  └─────────────┬───────────────────────────────────────┘    │
│                │                                             │
│  ┌────────────▼────────────────────────────────────┐        │
│  │              CrudService                         │        │
│  │                                                  │        │
│  │  1. getListSnap('sucursales')                   │        │
│  │  2. Retorna snapshot de Firebase               │        │
│  └─────────────┬────────────────────────────────────┘        │
│                │                                             │
└────────────────┼─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                CAPA DE DATOS - FIREBASE                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Firebase Realtime Database                  │    │
│  │                                                     │    │
│  │  sucursales/                                       │    │
│  │    ├─ {key1}: { nombre: "DEPOSITO", value: 1 }    │    │
│  │    ├─ {key2}: { nombre: "CASA CENTRAL", value: 2 } │    │
│  │    └─ ...                                          │    │
│  │                                                     │    │
│  │  usuarios/cliente/                                 │    │
│  │    └─ {uid}: { sucursalesPermitidas: [1,3,5] }    │    │
│  └─────────────┬───────────────────────────────────────┘    │
│                │                                             │
└────────────────┼─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  VALIDACIÓN Y ALMACENAMIENTO                 │
│                                                              │
│  Login2Component.onSubmit():                                │
│  1. Valida sucursal seleccionada ✓                         │
│  2. Valida permisos del usuario ✓                          │
│  3. parseInt(this.sucursal, 10) → 1                        │
│  4. user.sucursalesPermitidas.includes(1) → true           │
│  5. sessionStorage.setItem('sucursal', '1') ✅             │
│                                                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      sessionStorage                          │
│                                                              │
│  Key: 'sucursal'                                            │
│  Value: '1' (string)                                        │
│  Scope: Current tab/window                                  │
│  Duration: Until tab close or logout                        │
│                                                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ (Usado en 65+ ubicaciones)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│               COMPONENTES Y SERVICIOS DE LA APP              │
│                                                              │
│  • CarritoComponent → Punto de venta                        │
│  • StockService → Filtrado de inventario                    │
│  • HistorialVentasService → Reportes por sucursal          │
│  • CajaMovi → Movimientos de caja                          │
│  • etc.                                                      │
│                                                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (PHP/CodeIgniter)                    │
│                                                              │
│  Carga.php / Descarga.php                                   │
│  Reciben parámetro 'sucursal' en requests                   │
│                                                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS POSTGRESQL                   │
│                                                              │
│  Tabla: sucursales                                          │
│  ├─ cod_sucursal (1, 2, 3, 4, 5)                          │
│  └─ sucursal (nombre)                                       │
│                                                              │
│  Tablas relacionadas:                                       │
│  ├─ artsucursal (exi1-5, prefi1-4)                        │
│  └─ psucursal1-5 (pedidos por sucursal)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Conclusiones y Hallazgos Clave

### 11.1 Hallazgos Principales

1. **Origen Único**: El valor de sucursal se establece exclusivamente durante el login (login2.component.ts:126)

2. **Fuente de Datos**: Las sucursales provienen de Firebase Realtime Database (nodo `sucursales`)

3. **Correspondencia con PostgreSQL**: El campo `value` en Firebase corresponde exactamente a `cod_sucursal` en PostgreSQL

4. **Sistema de Permisos**: Existe un control de acceso robusto basado en el array `sucursalesPermitidas` del usuario

5. **Uso Extensivo**: El valor se utiliza en 65+ ubicaciones a lo largo de la aplicación

6. **Persistencia**: El valor persiste en `sessionStorage` durante toda la sesión hasta logout o cierre del navegador

### 11.2 Valor Almacenado

```
Key: 'sucursal'
Value: String numérico ('1', '2', '3', '4', '5')
Representa: Código de sucursal (cod_sucursal en PostgreSQL)
```

### 11.3 Sucursales Disponibles

| Código | Nombre        |
|--------|---------------|
| 1      | DEPOSITO      |
| 2      | CASA CENTRAL  |
| 3      | VALLE VIEJO   |
| 4      | GUEMES        |
| 5      | MAYORISTA     |

### 11.4 Flujo Simplificado

```
Firebase (sucursales/value) → Login2Component → Validación de Permisos → sessionStorage → Aplicación → Backend → PostgreSQL
```

---

## 12. Recomendaciones Técnicas

### 12.1 Mejoras Sugeridas

1. **Encriptación del Valor**: Considerar encriptar el valor de sucursal en sessionStorage usando CryptoService (ya disponible en el proyecto)

2. **Validación en Backend**: Implementar validación de permisos de sucursal en cada endpoint del backend

3. **Centralización de Acceso**: Crear un servicio dedicado `SucursalService` que maneje toda la lógica de obtención y validación de sucursal

4. **Type Safety**: Crear un enum para los códigos de sucursal:
   ```typescript
   enum CodigoSucursal {
     DEPOSITO = 1,
     CASA_CENTRAL = 2,
     VALLE_VIEJO = 3,
     GUEMES = 4,
     MAYORISTA = 5
   }
   ```

5. **Observables**: Convertir el acceso a sucursal en un Observable para reactividad:
   ```typescript
   sucursal$: BehaviorSubject<string | null> = new BehaviorSubject(null);
   ```

### 12.2 Documentación de Interfaces

```typescript
// Interfaz recomendada para Sucursal
interface Sucursal {
  key: string;          // ID de Firebase
  nombre: string;       // Nombre descriptivo
  value: number;        // Código numérico (1-5)
  cod_sucursal: number; // Mismo que value (para claridad)
}

// Interfaz de Usuario (actualizada)
interface User {
  uid: string;
  email: string;
  nombre: string;
  apellido: string;
  nivel: UserRole;
  sucursalesPermitidas: number[];  // Array de códigos [1,2,3,4,5]
}
```

---

## 13. Referencias

### 13.1 Archivos Analizados

**Componentes**:
- `src/app/components/auth/login2/login2.component.ts`
- `src/app/components/auth/login2/login2.component.html`

**Servicios**:
- `src/app/services/auth.service.ts`
- `src/app/services/crud.service.ts`

**Base de Datos**:
- PostgreSQL: Tabla `sucursales`
- Firebase: Nodo `sucursales` y `usuarios/cliente`

### 13.2 Líneas de Código Clave

- Login2Component: Línea 126 (`sessionStorage.setItem`)
- Login2Component: Líneas 45-64 (`loadSucursales()`)
- Login2Component: Líneas 117-123 (validación de permisos)
- AuthService: Líneas 40, 78 (carga de `sucursalesPermitidas`)
- AuthService: Línea 143 (`sessionStorage.clear()`)

---

## 14. Glosario

- **cod_sucursal**: Código numérico de sucursal en PostgreSQL (1-5)
- **value**: Campo en Firebase que contiene el código de sucursal
- **sucursalesPermitidas**: Array de códigos de sucursales a las que un usuario tiene acceso
- **sessionStorage**: Almacenamiento temporal del navegador que persiste durante la sesión
- **Firebase Realtime Database**: Base de datos NoSQL usada para autenticación y configuración
- **PostgreSQL**: Base de datos relacional usada para datos transaccionales y de negocio

---

**Fin del Informe**

*Generado por: Claude Code*
*Proyecto: MotoApp*
*Versión Angular: 15.2.6*
