# 🔍 ANÁLISIS COMPLETO: ¿De Dónde Vienen los IDs de Sucursales?

**Proyecto**: MotoApp
**Fecha**: 15 de Noviembre de 2025
**Analista**: Claude Code
**Estado**: ✅ ANÁLISIS COMPLETADO

---

## 📋 RESUMEN EJECUTIVO

**Pregunta Clave**: ¿De dónde salen los IDs de las sucursales que se usan en las transferencias?

**Respuesta Corta**:
El sistema tiene **DOS FUENTES DE DATOS SEPARADAS** para sucursales:

1. **PostgreSQL** (tabla `sucursales`) - Usada SOLO para PDFs
2. **Firebase Realtime Database** (colección `/sucursales`) - Usada para TODO lo demás

**El Problema**: Los valores en Firebase **NO COINCIDEN** con los valores hardcodeados en el login HTML.

---

## 🎯 HALLAZGOS PRINCIPALES

### 1. ✅ PostgreSQL SÍ tiene una tabla de sucursales

**Tabla**: `sucursales`

**Estructura**:
```sql
cod_sucursal  NUMERIC  (Primary Key)
sucursal      TEXT     (Nombre de la sucursal)
mail          TEXT
contrasena    TEXT
```

**Datos Actuales en PostgreSQL** (✅ CORRECTOS):
```
cod_sucursal | sucursal
-------------|---------------
      1      | DEPOSITO
      2      | CASA CENTRAL
      3      | VALLE VIEJO
      4      | GUEMES
      5      | MAYORISTA
```

**¿Se usa para transferencias?**: ❌ **NO**

Esta tabla solo se usa en el backend en el endpoint `SucursalInfoPDF_post()` (línea 2323 de Carga.php.txt) para generar PDFs.

---

### 2. ✅ Firebase tiene una colección `/sucursales`

**Colección**: `/sucursales` en Firebase Realtime Database

**Estructura** (según interfaces TypeScript):
```typescript
{
  nombre: string,   // Nombre de la sucursal
  value: number     // ID de la sucursal
}
```

**Ejemplo de Documento en Firebase**:
```json
{
  "sucursales": {
    "-deposito_key_auto": {
      "nombre": "Deposito",
      "value": 1
    },
    "-casa_central_key_auto": {
      "nombre": "Casa Central",
      "value": 2
    }
    // ... etc
  }
}
```

**¿Se usa para transferencias?**: ✅ **SÍ** - Esta es la fuente principal para los componentes de stock.

---

## 🔄 FLUJO COMPLETO DE DATOS: De Dónde Vienen los IDs

### ESCENARIO 1: Componente de Login (login.component.html)

**Archivo**: `src/app/components/login/login.component.html`
**Líneas**: 26-30

```html
<select [(ngModel)]="sucursal" class="form-control">
    <option value=2>Suc. Valle Viejo</option>
    <option value=3>Suc. Guemes</option>
    <option value=4>Deposito</option>
</select>
```

**Origen de los IDs**: ❌ **VALORES HARDCODEADOS EN EL HTML**

**Flujo**:
```
Usuario selecciona "Deposito"
    ↓
HTML envía value=4
    ↓
login.component.ts línea 67:
sessionStorage.setItem('sucursal', '4')  ← AQUÍ SE GUARDA EL ID INCORRECTO
    ↓
Todos los componentes usan:
Number(sessionStorage.getItem('sucursal'))  ← OBTIENEN EL ID INCORRECTO
```

**Problema**: Los valores hardcodeados (2, 3, 4) **NO COINCIDEN** con la realidad:
- `value=2` dice "Valle Viejo" pero **debería ser "Casa Central"**
- `value=3` dice "Guemes" pero **debería ser "Valle Viejo"**
- `value=4` dice "Deposito" pero **debería ser "Guemes"**
- **FALTA** "Casa Central" (ID: 2)
- **FALTA** "Mayorista" (ID: 5)

---

### ESCENARIO 2: Componente de Login Alternativo (login2.component.ts)

**Archivo**: `src/app/components/auth/login2/login2.component.ts`
**Líneas**: 45-64

```typescript
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
          value: payload.value  // ← VIENE DE FIREBASE
        };
      });
    }
  );
}
```

**Origen de los IDs**: ✅ **FIREBASE** (colección `/sucursales`)

**Flujo**:
```
login2.component.ts carga datos
    ↓
CrudService.getListSnap('sucursales')
    ↓
Firebase Realtime Database: /sucursales
    ↓
Retorna: { nombre: "...", value: X }  ← X es el ID de Firebase
    ↓
Usuario selecciona una sucursal
    ↓
sessionStorage.setItem('sucursal', value)
    ↓
Componentes usan ese value para transferencias
```

**Estado**: ✅ **ESTE LOGIN FUNCIONA CORRECTAMENTE** (si Firebase tiene datos correctos)

---

### ESCENARIO 3: Componentes de Stock (Solicitar/Ofrecer)

**Archivos**:
- `src/app/components/stockproductopedido/stockproductopedido.component.ts`
- `src/app/components/stockproductooferta/stockproductooferta.component.ts`

**Líneas**: 44-68 (similar en ambos)

```typescript
cargarSucursales() {
  this._crud.getListSnap('sucursales').pipe(
    takeUntil(this.destroy$)
  ).subscribe(
    data => {
      this.sucursales = data.map(item => {
        const payload = item.payload.val() as any;
        return {
          label: payload.nombre,
          value: parseInt(payload.value)  // ← VIENE DE FIREBASE
        };
      });
    },
    error => {
      console.error('Error al cargar sucursales:', error);
      // VALORES POR DEFECTO HARDCODEADOS (INCORRECTOS)
      this.sucursales = [
        { label: 'Suc. Valle Viejo', value: 2 },  // ❌ INCORRECTO
        { label: 'Suc. Guemes', value: 3 },       // ❌ INCORRECTO
        { label: 'Deposito', value: 4 }           // ❌ INCORRECTO
      ];
    }
  );
}
```

**Origen de los IDs**:
- ✅ **PRIMARIO**: Firebase `/sucursales` (campo `value`)
- ❌ **FALLBACK**: Valores hardcodeados INCORRECTOS

**Flujo para crear transferencia**:
```
Usuario ya hizo login
    ↓
sessionStorage.getItem('sucursal')  ← ID de la sucursal actual (puede ser incorrecto si vino de login.html)
    ↓
Usuario abre modal "Solicitar Stock" o "Ofrecer Stock"
    ↓
Modal carga dropdown de sucursales desde Firebase
    ↓
Usuario selecciona "Deposito" → selectedSucursal = value de Firebase
    ↓
Al enviar:
  sucursald = sessionStorage.getItem('sucursal')  ← ID del login (puede ser incorrecto)
  sucursalh = selectedSucursal                    ← ID del dropdown (de Firebase, puede ser correcto)
    ↓
Backend guarda en PostgreSQL tabla pedidoscb
```

---

## 🔥 EL PROBLEMA CRÍTICO IDENTIFICADO

### Situación Actual

Existen **TRES FUENTES DIFERENTES** de IDs de sucursales:

| Fuente                         | Ubicación                               | IDs                      | Usado Para            | Estado      |
|--------------------------------|-----------------------------------------|--------------------------|-----------------------|-------------|
| **PostgreSQL tabla sucursales**| Base de datos producción                | 1,2,3,4,5 (CORRECTOS)    | Solo PDFs             | ✅ CORRECTO |
| **Firebase /sucursales**       | Firebase Realtime Database              | ??? (DESCONOCIDOS)       | Componentes de stock  | ⚠️ INCIERTO |
| **login.component.html**       | Hardcodeado en HTML                     | 2,3,4 (INCORRECTOS)      | Login inicial         | ❌ INCORRECTO |
| **Valores por defecto**        | Hardcodeado en componentes TypeScript   | 2,3,4 (INCORRECTOS)      | Fallback de Firebase  | ❌ INCORRECTO |

### El Bug Explicado

**CASO CP-001 (PULL)**:

1. Usuario hace login en `login.component.html`
2. Selecciona visualmente "Deposito"
3. HTML tiene `<option value=4>Deposito</option>` ← ❌ INCORRECTO (Deposito es 1, no 4)
4. Se guarda: `sessionStorage.setItem('sucursal', '4')`
5. Usuario va a "Solicitar Stock"
6. Componente lee: `this.sucursal = sessionStorage.getItem('sucursal')` → '4'
7. Usuario selecciona destino "Suc. Guemes" del dropdown (que viene de Firebase)
8. Si Firebase tiene value=4 para "Suc. Guemes" (correcto), entonces `selectedSucursal = 4`
9. Se envía al backend:
   ```typescript
   sucursald: Number('4'),  // 4 (usuario pensó que era Deposito, pero es Guemes)
   sucursalh: 4             // 4 (usuario seleccionó Guemes correctamente)
   ```
10. **PROBLEMA**: ¡sucursald y sucursalh son iguales! → transferencia a sí mismo

**PERO** en la BD se guardó:
```
sucursald: 1
sucursalh: 4
```

Esto indica que **el ejecutor de pruebas seleccionó valores diferentes** a los reportados, O que hay **otra manipulación** de datos que no hemos identificado.

---

## 🎯 CONFIRMACIÓN: ¿Qué Hay REALMENTE en Firebase?

**NO PUEDO ACCEDER DIRECTAMENTE A FIREBASE**, pero puedo deducir el estado basado en el código:

### Escenario A: Firebase tiene datos CORRECTOS

Si Firebase tiene:
```json
{
  "sucursales": {
    "-dep": { "nombre": "Deposito", "value": 1 },
    "-cc": { "nombre": "Casa Central", "value": 2 },
    "-vv": { "nombre": "Valle Viejo", "value": 3 },
    "-gue": { "nombre": "Guemes", "value": 4 },
    "-may": { "nombre": "Mayorista", "value": 5 }
  }
}
```

**Entonces**:
- ✅ El login2 (que usa Firebase) funciona correctamente
- ✅ Los dropdowns de stock funcionan correctamente
- ❌ Pero el login.component.html (hardcodeado) sigue roto

### Escenario B: Firebase tiene datos INCORRECTOS

Si Firebase tiene:
```json
{
  "sucursales": {
    "-vv": { "nombre": "Valle Viejo", "value": 2 },
    "-gue": { "nombre": "Guemes", "value": 3 },
    "-dep": { "nombre": "Deposito", "value": 4 }
  }
}
```

**Entonces**:
- ❌ TODO está roto
- ❌ Ni siquiera login2 funciona correctamente
- ❌ Los dropdowns de stock tienen IDs incorrectos

---

## 🔍 CÓMO VERIFICAR QUÉ HAY EN FIREBASE

### Opción 1: Usar el Componente de Gestión de Sucursales

Existe un componente `src/app/components/sucursales/sucursales.component.ts` que permite ver, crear, editar y eliminar sucursales en Firebase.

**Pasos**:
1. Navegar a la ruta `/sucursales` en la aplicación (si está configurada en el routing)
2. Ese componente mostrará la lista completa de sucursales con sus IDs
3. Verificar si los `value` coinciden con el mapeo correcto

### Opción 2: Usar Firebase Console

1. Ir a Firebase Console (https://console.firebase.google.com/)
2. Seleccionar el proyecto de MotoApp
3. Ir a Realtime Database
4. Buscar la colección `/sucursales`
5. Ver los documentos y sus campos `nombre` y `value`

### Opción 3: Agregar Logging en el Código

Modificar temporalmente `login2.component.ts`:

```typescript
loadSucursales(): void {
  this.crudService.getListSnap('sucursales').subscribe(
    data => {
      this.sucursales = data.map(item => {
        const payload = item.payload.val() as any;
        console.log('FIREBASE SUCURSAL:', payload.nombre, '-> ID:', payload.value);  // ← AGREGAR ESTO
        return {
          key: item.key,
          nombre: payload.nombre,
          value: payload.value
        };
      });
    }
  );
}
```

Luego hacer login y ver en la consola del navegador qué IDs tiene cada sucursal.

---

## 📊 MAPEO CORRECTO vs ACTUAL

### Mapeo CORRECTO (PostgreSQL - Fuente de Verdad)

| ID | Nombre Sucursal | Campo Stock | Código |
|----|-----------------|-------------|--------|
| 1  | DEPOSITO        | exi1        | DEP    |
| 2  | CASA CENTRAL    | exi2        | CC     |
| 3  | VALLE VIEJO     | exi3        | VV     |
| 4  | GUEMES          | exi4        | GUE    |
| 5  | MAYORISTA       | exi5        | MAY    |

### Mapeo INCORRECTO (login.component.html - Hardcodeado)

| value | Texto Mostrado  | Debería Ser     | Error          |
|-------|-----------------|-----------------|----------------|
| 2     | Suc. Valle Viejo| Casa Central    | ❌ Nombre MALO |
| 3     | Suc. Guemes     | Valle Viejo     | ❌ Nombre MALO |
| 4     | Deposito        | Guemes          | ❌ Nombre MALO |
| -     | -               | Casa Central (2)| ❌ FALTA       |
| -     | -               | Deposito (1)    | ❌ FALTA       |
| -     | -               | Mayorista (5)   | ❌ FALTA       |

### Mapeo INCORRECTO (Valores por defecto en componentes)

**stockproductopedido.component.ts** (líneas 62-66):
```typescript
{ label: 'Suc. Valle Viejo', value: 2 },  // Debería ser: 'Casa Central', value: 2
{ label: 'Suc. Guemes', value: 3 },       // Debería ser: 'Valle Viejo', value: 3
{ label: 'Deposito', value: 4 }           // Debería ser: 'Guemes', value: 4
```

**stockproductooferta.component.ts** (líneas 59-65):
```typescript
{ label: 'Suc. Casa Central', value: 1 },  // Debería ser: 'Deposito', value: 1
{ label: 'Suc. Valle Viejo', value: 2 },   // Correcto nombre, pero...
{ label: 'Suc. Guemes', value: 3 },        // Debería ser: 'Valle Viejo', value: 3
{ label: 'Deposito', value: 4 },           // Debería ser: 'Guemes', value: 4
{ label: 'Mayorista', value: 5 }           // ✅ CORRECTO
```

---

## 🛠️ PLAN DE ACCIÓN DETALLADO

### PASO 1: Verificar Firebase ⚠️ CRÍTICO

**Objetivo**: Determinar si Firebase tiene datos correctos o incorrectos.

**Método Recomendado**: Agregar logging temporal

1. Editar `src/app/components/auth/login2/login2.component.ts`
2. Agregar `console.log` en el método `loadSucursales()` (línea ~50)
3. Compilar y ejecutar la aplicación
4. Abrir DevTools → Console
5. Ver qué IDs se están cargando desde Firebase
6. **Documentar los valores reales**

**Resultado Esperado**:
```
FIREBASE SUCURSAL: Deposito -> ID: 1
FIREBASE SUCURSAL: Casa Central -> ID: 2
FIREBASE SUCURSAL: Valle Viejo -> ID: 3
FIREBASE SUCURSAL: Guemes -> ID: 4
FIREBASE SUCURSAL: Mayorista -> ID: 5
```

**Si los IDs NO coinciden**: Corregir Firebase antes de continuar.

---

### PASO 2: Corregir Firebase (SI ES NECESARIO)

Si Firebase tiene IDs incorrectos, corregirlos usando el componente de gestión:

1. Navegar a `/sucursales` en la aplicación
2. Editar cada sucursal para asignar el `value` correcto:
   - Deposito → value: 1
   - Casa Central → value: 2
   - Valle Viejo → value: 3
   - Guemes → value: 4
   - Mayorista → value: 5

**O usar Firebase Console** para editar directamente.

---

### PASO 3: Corregir login.component.html

**Archivo**: `src/app/components/login/login.component.html`
**Líneas**: 26-30

**ANTES** (INCORRECTO):
```html
<select [(ngModel)]="sucursal" class="form-control" (change)="onSelectionChange($event)">
    <option value=2>Suc. Valle Viejo</option>
    <option value=3>Suc. Guemes</option>
    <option value=4>Deposito</option>
</select>
```

**DESPUÉS** (CORRECTO):
```html
<select [(ngModel)]="sucursal" class="form-control" (change)="onSelectionChange($event)">
    <option value="1">Deposito</option>
    <option value="2">Casa Central</option>
    <option value="3">Valle Viejo</option>
    <option value="4">Suc. Guemes</option>
    <option value="5">Mayorista</option>
</select>
```

**MEJOR AÚN**: Usar Firebase (como login2)

**Archivo**: `src/app/components/login/login.component.ts`

```typescript
// AGREGAR al inicio
import { CrudService } from '../../services/crud.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

export class LoginComponent implements OnInit {
  // AGREGAR propiedades
  sucursales: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    // ... otros servicios ...
    private _crud: CrudService  // AGREGAR
  ) {}

  ngOnInit() {
    // ... código existente ...
    this.cargarSucursales();  // AGREGAR
  }

  // AGREGAR método
  cargarSucursales() {
    this._crud.getListSnap('sucursales').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      data => {
        this.sucursales = data.map(item => {
          const payload = item.payload.val() as any;
          return {
            label: payload.nombre,
            value: parseInt(payload.value)
          };
        });
      },
      error => {
        console.error('Error al cargar sucursales:', error);
        // Fallback con valores CORRECTOS
        this.sucursales = [
          { label: 'Deposito', value: 1 },
          { label: 'Casa Central', value: 2 },
          { label: 'Valle Viejo', value: 3 },
          { label: 'Suc. Guemes', value: 4 },
          { label: 'Mayorista', value: 5 }
        ];
      }
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Archivo**: `src/app/components/login/login.component.html`

```html
<select [(ngModel)]="sucursal" class="form-control" (change)="onSelectionChange($event)">
    <option value="" disabled selected>Seleccione una sucursal</option>
    <option *ngFor="let suc of sucursales" [value]="suc.value">
        {{ suc.label }}
    </option>
</select>
```

---

### PASO 4: Corregir Valores por Defecto en Componentes

**Archivos a modificar**:
1. `src/app/components/stockproductopedido/stockproductopedido.component.ts`
2. `src/app/components/stockproductooferta/stockproductooferta.component.ts`

**Cambio en ambos archivos**:

```typescript
error => {
  console.error('Error al cargar sucursales:', error);
  // Valores CORRECTOS por defecto
  this.sucursales = [
    { label: 'Deposito', value: 1 },
    { label: 'Casa Central', value: 2 },
    { label: 'Valle Viejo', value: 3 },
    { label: 'Suc. Guemes', value: 4 },
    { label: 'Mayorista', value: 5 }
  ];
}
```

---

### PASO 5: Validar con Tests

Después de las correcciones, ejecutar:

1. **Test de Login**:
   - Login con cada sucursal
   - Verificar `console.log(sessionStorage.getItem('sucursal'))`
   - Confirmar que el ID guardado es correcto

2. **Test CP-001** (PULL):
   - Login como Casa Central (2)
   - Solicitar a Deposito (1)
   - Verificar BD: `sucursald=2, sucursalh=1`

3. **Test CP-003** (PUSH):
   - Login como Guemes (4)
   - Ofrecer a Mayorista (5)
   - Verificar BD: `sucursald=4, sucursalh=5`

---

## 📝 CONCLUSIONES

### Respuesta a la Pregunta Original

**"¿De dónde salen realmente los IDs de las sucursales?"**

**Respuesta**:

1. **Fuente de Verdad**: PostgreSQL tabla `sucursales` (IDs correctos: 1-5)
2. **Fuente Usada para Login**:
   - `login.component.html` → Valores hardcodeados INCORRECTOS
   - `login2.component.ts` → Firebase `/sucursales` (estado INCIERTO)
3. **Fuente Usada para Dropdowns de Stock**: Firebase `/sucursales` con fallback a valores hardcodeados INCORRECTOS
4. **Problema**: Múltiples fuentes inconsistentes causan que los IDs guardados en `sessionStorage` sean incorrectos

### El Bug en Resumen

```
Login hardcodeado (INCORRECTO)
    ↓
sessionStorage.sucursal = valor INCORRECTO
    ↓
Componente de stock usa ese valor para sucursald
    ↓
Transferencia se crea con sucursal origen INCORRECTA
    ↓
🔴 BUG CRÍTICO
```

### Solución

1. ✅ Verificar y corregir Firebase `/sucursales`
2. ✅ Eliminar valores hardcodeados y usar solo Firebase
3. ✅ Corregir valores por defecto como fallback
4. ✅ Centralizar configuración (crear `sucursales.config.ts`)
5. ✅ Validar con tests completos

---

**FIN DEL ANÁLISIS**

**Elaborado por**: Claude Code
**Fecha**: 15 de Noviembre de 2025
**Estado**: ✅ COMPLETADO
