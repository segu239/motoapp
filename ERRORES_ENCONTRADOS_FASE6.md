# ERRORES ENCONTRADOS - FASE 6
## TESTING Y VALIDACIÓN

---

## 📋 RESUMEN

Durante la Fase 6 de testing se encontró **1 error** que fue corregido inmediatamente.

---

## 🐛 ERROR #1: FileSaver.saveAs is not a function

### **Información del Error**

| Campo | Valor |
|-------|-------|
| **ID** | E-001 |
| **Severidad** | 🔴 **CRÍTICO** |
| **Componente** | `lista-altas.component.ts` |
| **Línea** | 830 |
| **Método** | `exportarExcel()` |
| **Fecha Detección** | 2025-11-05 |
| **Estado** | ✅ **RESUELTO** |

### **Mensaje de Error**

```
ERROR Error: Uncaught (in promise): TypeError: FileSaver.saveAs is not a function
TypeError: FileSaver.saveAs is not a function
    at lista-altas.component.ts:830:19
    at lista-altas.component.ts:830:19
```

### **Descripción**

El botón "Excel" en la lista de altas fallaba al intentar descargar el archivo Excel. El error ocurría porque el dynamic import de `file-saver` no estaba manejando correctamente las diferentes formas en que el módulo puede exportar la función `saveAs`.

### **Pasos para Reproducir**

1. Navegar a `/lista-altas`
2. Asegurarse de que haya datos en la tabla
3. Click en el botón "Excel"
4. **ERROR:** Aparece en consola: `FileSaver.saveAs is not a function`
5. **RESULTADO:** No se descarga el archivo

### **Causa Raíz**

El código original usaba:

```typescript
import('file-saver').then((FileSaver) => {
  FileSaver.saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
});
```

**Problema:** El dynamic import devuelve un módulo que puede tener la función `saveAs` en:
- `module.default` (ES6 default export)
- `module.saveAs` (named export)
- `module` directamente (CommonJS)

El código asumía que `FileSaver.saveAs` existía directamente, pero dependiendo de la configuración de bundling y la versión de `file-saver`, esto podía fallar.

### **Solución Implementada**

**Intento 1 (Fallido):**
```typescript
// ❌ Error de TypeScript: Property 'default' does not exist on type 'typeof FileSaver'
import('file-saver').then((module) => {
  const saveAs = module.default || module.saveAs || module;
  // ...
});
```

**Solución Final (Exitosa):**

Código corregido en `lista-altas.component.ts:829-836`:

```typescript
import('file-saver').then((module: any) => {
  const saveAs = module.default || module.saveAs || module;
  if (typeof saveAs === 'function') {
    saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
  } else if (typeof saveAs.saveAs === 'function') {
    saveAs.saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
  }
});
```

**Cambio clave:** Agregar `: any` al tipo del parámetro `module`

**Lógica de la solución:**
1. **Tipo `any` para module:**
   - TypeScript no conoce la estructura exacta del dynamic import de `file-saver`
   - `: any` permite acceder a propiedades como `default`, `saveAs` sin errores de compilación
   - Necesario porque `file-saver` puede exportarse de diferentes formas según el bundler

2. **Intenta múltiples formas de acceder a `saveAs`:**
   - `module.default` → Export default de ES6
   - `module.saveAs` → Named export
   - `module` → Si es una función directamente

3. **Validación con `typeof`:**
   - Verifica que realmente sea una función antes de llamarla
   - Doble check con `saveAs.saveAs` por seguridad

4. **Compatibilidad:**
   - ✅ Compila sin errores de TypeScript
   - ✅ Funciona en runtime
   - ✅ Compatible con cualquier forma de exportación de `file-saver`
   - ✅ Compatible con diferentes configuraciones de webpack/bundlers

### **Verificación Post-Fix**

**Pasos de Prueba:**
1. ✅ Navegar a `/lista-altas`
2. ✅ Click en botón "Excel"
3. ✅ **RESULTADO:** Se descarga el archivo `altas_existencias_TIMESTAMP.xlsx`
4. ✅ El archivo se puede abrir en Excel/LibreOffice
5. ✅ Contiene todos los datos visibles en la tabla
6. ✅ No hay errores en consola

**Resultado:** ✅ **RESUELTO EXITOSAMENTE**

### **Impacto**

- **Antes del fix:**
  - ❌ Botón Excel no funcionaba
  - ❌ Error crítico en consola
  - ❌ No se podía exportar datos

- **Después del fix:**
  - ✅ Botón Excel funciona perfectamente
  - ✅ Sin errores en consola
  - ✅ Exportación exitosa a .xlsx

### **Lecciones Aprendidas**

1. **Dynamic Imports y ES6/CommonJS:**
   - Los dynamic imports pueden devolver módulos en diferentes formatos
   - Siempre manejar múltiples casos de exportación
   - Usar validación de tipos antes de llamar funciones

2. **Compatibilidad de Librerías:**
   - `file-saver` tiene diferentes formas de exportar dependiendo del bundler
   - No asumir una sola forma de exportación
   - Escribir código defensivo que maneje todas las variantes

3. **Testing de Funcionalidades:**
   - El testing manual es crítico para encontrar este tipo de errores
   - Los errores de runtime no siempre se detectan en compilación
   - Probar TODAS las funcionalidades, incluso las "simples"

### **Código de Referencia**

**Archivo:** `src/app/components/lista-altas/lista-altas.component.ts`

**Método completo `exportarExcel()` (líneas 805-838):**

```typescript
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.altasFiltradas.map(alta => ({
      'ID': alta.id_num,
      'Estado': alta.estado,
      'Fecha': alta.fecha,
      'Producto': alta.descripcion,
      'Cantidad': alta.cantidad,
      'Sucursal': this.getNombreSucursal(alta.sucursald),
      'Usuario': alta.usuario_res || alta.usuario,
      'Observación': alta.observacion,
      'Motivo Cancelación': alta.motivo_cancelacion || '',
      'Fecha Cancelación': alta.fecha_cancelacion || '',
      'Usuario Cancelación': alta.usuario_cancelacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    // ✅ CÓDIGO CORREGIDO (con `: any` para evitar error de TypeScript)
    import('file-saver').then((module: any) => {
      const saveAs = module.default || module.saveAs || module;
      if (typeof saveAs === 'function') {
        saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
      } else if (typeof saveAs.saveAs === 'function') {
        saveAs.saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
      }
    });
  });
}
```

---

## 🐛 ERROR #2: Sucursal muestra "Sucursal 1" en lugar del nombre

### **Información del Error**

| Campo | Valor |
|-------|-------|
| **ID** | P-001 |
| **Severidad** | 🟡 **MEDIO** |
| **Componente** | `lista-altas.component.ts/html` |
| **Ubicación** | Tabla y Modal |
| **Fecha Detección** | 2025-11-06 |
| **Estado** | ✅ **RESUELTO** |

### **Descripción**

La columna Sucursal en la tabla y en el modal mostraban "Sucursal 1" en lugar del nombre real de la sucursal (ej: "Casa Central", "Valle Viejo").

### **Causa Raíz**

1. **Type mismatch:** El backend retorna `sucursald` como STRING `"1"` en JSON, pero el componente esperaba NUMBER `1`
2. **Código duplicado:** El componente `lista-altas` reinventaba la rueda con su propia función `getNombreSucursal()` cuando ya existía un pipe global `SucursalNombrePipe` usado en otros componentes

### **Solución Implementada**

**Opción elegida:** Usar el pipe existente `SucursalNombrePipe`

**Cambios realizados:**

1. **Import del pipe** (`lista-altas.component.ts:7`)
```typescript
import { SucursalNombrePipe } from '../../pipes/sucursal-nombre.pipe';
```

2. **Instancia del pipe** (`lista-altas.component.ts:52`)
```typescript
private sucursalPipe = new SucursalNombrePipe();
```

3. **HTML tabla** (`lista-altas.component.html:395`)
```html
<!-- ANTES -->
{{ getNombreSucursal(alta.sucursald) }}

<!-- DESPUÉS -->
{{ alta.sucursald | sucursalNombre }}
```

4. **Modal** (`lista-altas.component.ts:460`)
```typescript
// ANTES
${this.getNombreSucursal(alta.sucursald)}

// DESPUÉS
${this.sucursalPipe.transform(alta.sucursald)}
```

### **Verificación Post-Fix**

- ✅ Columna Sucursal muestra "Casa Central", "Valle Viejo", etc.
- ✅ Modal muestra nombres correctos
- ✅ Consistente con otros componentes (`stockpedido`)
- ✅ Sin errores de compilación

---

## 🐛 ERROR #3: Campo Usuario muestra vacío

### **Información del Error**

| Campo | Valor |
|-------|-------|
| **ID** | P-002 |
| **Severidad** | 🟡 **MEDIO** |
| **Componente** | `lista-altas.component.ts/html` |
| **Ubicación** | Tabla y Modal |
| **Fecha Detección** | 2025-11-06 |
| **Estado** | ✅ **RESUELTO** |

### **Descripción**

La columna Usuario aparecía vacía (en blanco) tanto en la tabla como en el modal de detalles.

### **Causa Raíz**

1. **Datos vacíos en DB:** Los campos `usuario_res` y `usuario` están genuinamente vacíos en PostgreSQL (solo contienen espacios del tipo CHAR)
2. **Fallback inadecuado:** La expresión `usuario_res || usuario` retorna strings con espacios (truthy) que HTML colapsa visualmente

### **Solución Implementada**

**Opción elegida:** Crear método helper con `.trim()` y valor por defecto

**Cambios realizados:**

1. **Método helper** (`lista-altas.component.ts:431-434`)
```typescript
getUsuario(alta: AltaExistencia): string {
  const usuario = (alta.usuario_res || alta.usuario || '').trim();
  return usuario || 'Sin usuario';
}
```

2. **HTML tabla** (`lista-altas.component.html:400`)
```html
<!-- ANTES -->
<small>{{ alta.usuario_res || alta.usuario }}</small>

<!-- DESPUÉS -->
<small class="text-muted">{{ getUsuario(alta) }}</small>
```

3. **Modal** (`lista-altas.component.ts:473`)
```typescript
// ANTES
${alta.usuario_res || alta.usuario}

// DESPUÉS
${this.getUsuario(alta)}
```

### **Verificación Post-Fix**

- ✅ Campo Usuario muestra "Sin usuario" cuando está vacío
- ✅ Clase `text-muted` aplica estilo gris para valores por defecto
- ✅ `.trim()` maneja correctamente espacios del tipo CHAR
- ✅ Sin errores de compilación

---

## 🐛 ERROR #4: Clave incorrecta en sessionStorage (alta-existencias)

### **Información del Error**

| Campo | Valor |
|-------|-------|
| **ID** | P-003 |
| **Severidad** | 🔴 **CRÍTICO** |
| **Componente** | `alta-existencias.component.ts` |
| **Línea** | 116-117 |
| **Método** | `ngOnInit()` |
| **Fecha Detección** | 2025-11-06 |
| **Estado** | ✅ **RESUELTO** |

### **Descripción**

El componente `alta-existencias` estaba intentando obtener el usuario desde `sessionStorage.user.email`, pero esta clave NO existe en sessionStorage. Esto causaba que `this.usuario` quedara vacío, y por lo tanto las altas se creaban sin usuario.

### **Causa Raíz**

**Código original (INCORRECTO):**
```typescript
const user = JSON.parse(sessionStorage.getItem('user') || '{}');
this.usuario = user.email || '';
```

**Análisis de sessionStorage (screenshot del usuario):**
- ❌ `sessionStorage.user` → NO EXISTE
- ✅ `sessionStorage.emailOp` → "segu239@hotmail.com"
- ✅ `sessionStorage.usernameOp` → "luis"

**Otros componentes usan la clave correcta:**
```typescript
// carrito.component.ts usa:
sessionStorage.getItem('emailOp')
```

### **Solución Implementada**

**Código corregido en `alta-existencias.component.ts:115-123`:**

```typescript
// ANTES (INCORRECTO)
const user = JSON.parse(sessionStorage.getItem('user') || '{}');
this.usuario = user.email || '';

// DESPUÉS (CORRECTO)
this.usuario = sessionStorage.getItem('emailOp') || '';

// Si no hay usuario, mostrar advertencia
if (!this.usuario || this.usuario.trim() === '') {
  console.error('⚠️ ADVERTENCIA: No hay usuario en sessionStorage.emailOp');
} else {
  console.log('✅ Usuario obtenido:', this.usuario);
}
```

### **Verificación Post-Fix**

- ✅ Compilación exitosa
- ✅ Console.log muestra: `✅ Usuario obtenido: segu239@hotmail.com`
- ✅ Nueva alta creada (ID 124) con usuario guardado correctamente
- ✅ BD muestra email completo: "segu239@hotmail.com"

---

## 🐛 ERROR #5: Campos de BD demasiado cortos para emails

### **Información del Error**

| Campo | Valor |
|-------|-------|
| **ID** | DB-001 |
| **Severidad** | 🔴 **CRÍTICO** |
| **Componente** | PostgreSQL - Tablas `pedidoitem` y `pedidoscb` |
| **Ubicación** | Columnas `usuario_res` y `usuario` |
| **Fecha Detección** | 2025-11-06 |
| **Estado** | ✅ **RESUELTO** |

### **Mensaje de Error**

```
A PHP Error was encountered
Severity: Warning
Message: pg_query(): Query failed: ERROR: el valor es demasiado largo para el tipo character(10)

INSERT INTO pedidoitem
    (tipo, cantidad, id_art, descripcion, precio, fecha_resuelto, usuario_res, observacion, estado)
    VALUES ('PE', 10, 5411, 'ACEL. RAP. MDA ECONOMIC...', 0, CURRENT_DATE, 'segu239@hotmail.com', 'otra prueba mas', 'ALTA')
    RETURNING id_items
```

### **Descripción**

Después de corregir la clave de sessionStorage (Error P-003), al intentar crear una nueva alta, PostgreSQL rechazaba el INSERT porque el email `'segu239@hotmail.com'` (19 caracteres) no cabía en el campo `usuario_res` de tipo `character(10)`.

### **Causa Raíz**

**Estructura de BD original:**
- `pedidoitem.usuario_res`: **character(10)** ❌ Solo 10 caracteres
- `pedidoitem.usuario_cancelacion`: **character(10)** ❌ Solo 10 caracteres
- `pedidoscb.usuario`: **character(30)** ⚠️ Inconsistente
- `pedidoscb.usuario_cancelacion`: **character(10)** ❌ Solo 10 caracteres

**Problema:**
- Email `segu239@hotmail.com` tiene **19 caracteres**
- Campo `character(10)` solo acepta **10 caracteres**
- PostgreSQL rechaza el INSERT con error

### **Solución Implementada**

**Migración de Base de Datos:** `migrations/20251106_ampliar_campos_usuario.sql`

```sql
-- Ampliar pedidoitem.usuario_res de character(10) a character(50)
ALTER TABLE pedidoitem
ALTER COLUMN usuario_res TYPE character(50);

-- Ampliar pedidoitem.usuario_cancelacion de character(10) a character(50)
ALTER TABLE pedidoitem
ALTER COLUMN usuario_cancelacion TYPE character(50);

-- Ampliar pedidoscb.usuario de character(30) a character(50)
ALTER TABLE pedidoscb
ALTER COLUMN usuario TYPE character(50);

-- Ampliar pedidoscb.usuario_cancelacion de character(10) a character(50)
ALTER TABLE pedidoscb
ALTER COLUMN usuario_cancelacion TYPE character(50);
```

**Código TypeScript revertido (ya no necesita truncar):**

```typescript
// TEMPORAL (con truncamiento - YA NO SE USA)
usuario_res: this.usuario.substring(0, 10),
usuario: this.usuario.substring(0, 30),

// FINAL (email completo - CÓDIGO ACTUAL)
usuario_res: this.usuario, // Email completo (BD ampliada a 50 caracteres)
usuario: this.usuario, // Email completo (BD ampliada a 50 caracteres)
```

### **Verificación Post-Fix**

**Verificación en BD:**
```sql
SELECT table_name, column_name, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('pedidoitem', 'pedidoscb')
  AND column_name LIKE '%usuario%';
```

**Resultado:**
| Tabla | Columna | Longitud Antes | Longitud Después |
|-------|---------|---------------|------------------|
| pedidoitem | usuario_res | 10 ❌ | 50 ✅ |
| pedidoitem | usuario_cancelacion | 10 ❌ | 50 ✅ |
| pedidoscb | usuario | 30 ⚠️ | 50 ✅ |
| pedidoscb | usuario_cancelacion | 10 ❌ | 50 ✅ |

### **Impacto**

**Antes del fix:**
- ❌ INSERT de altas fallaba con error de PostgreSQL
- ❌ No se podían crear nuevas altas de existencias
- ❌ Emails largos causaban errores críticos

**Después del fix:**
- ✅ Emails completos se guardan correctamente
- ✅ Soporta emails de hasta 50 caracteres
- ✅ Consistencia en todas las columnas de usuario
- ✅ Mejor trazabilidad y auditoría
- ✅ No destructivo: datos existentes preservados

### **Lecciones Aprendidas**

1. **Diseño de BD:**
   - `character(10)` es insuficiente para emails modernos
   - Best practice: usar `character(50)` o `VARCHAR(255)` para emails
   - Mantener consistencia entre columnas relacionadas

2. **Testing multi-capa:**
   - Un fix en frontend puede revelar problemas en BD
   - Siempre probar end-to-end después de cada cambio
   - Los límites de BD deben validarse en desarrollo

3. **Migración no destructiva:**
   - `ALTER COLUMN TYPE` expandiendo el tamaño es seguro
   - Los datos existentes se preservan (solo agrega espacios)
   - Importante documentar el cambio en migrations/

---

## 📊 RESUMEN DE ERRORES FASE 6

| Total Errores | Críticos | Medios | Bajos | Resueltos | Pendientes |
|--------------|----------|--------|-------|-----------|------------|
| **5** | **3** | **2** | 0 | **5** | **0** |

### **Detalle por Error**

| ID | Error | Severidad | Estado |
|----|-------|-----------|--------|
| E-001 | FileSaver.saveAs is not a function | 🔴 Crítico | ✅ Resuelto |
| P-001 | Sucursal muestra "Sucursal 1" | 🟡 Medio | ✅ Resuelto |
| P-002 | Usuario muestra vacío | 🟡 Medio | ✅ Resuelto |
| P-003 | Clave incorrecta sessionStorage | 🔴 Crítico | ✅ Resuelto |
| DB-001 | Campos BD demasiado cortos | 🔴 Crítico | ✅ Resuelto |

### **Tasa de Éxito**
- ✅ **100% de errores resueltos y verificados**
- ✅ **0 errores pendientes**
- ✅ **Funcionalidad Excel totalmente operativa**
- ✅ **Campos Sucursal mostrando correctamente** (Casa Central, Valle Viejo, etc.)
- ✅ **Campos Usuario guardando emails completos** (segu239@hotmail.com)
- ✅ **Migración de BD exitosa** (4 columnas ampliadas a 50 caracteres)
- ✅ **Verificado en BD:** ID 124 tiene email completo guardado

---

## ✅ VALIDACIÓN FINAL

### **Pruebas de Regresión Ejecutadas**

Después del fix, se validaron las siguientes pruebas:

| ID | Prueba | Estado |
|----|--------|--------|
| **F-47** | Botón Excel - Descarga archivo | ✅ PASS |
| **F-48** | Botón Actualizar | ✅ PASS |
| **U-10** | Formato de datos exportados | ✅ PASS |
| **E-09** | Exportar tabla vacía | ✅ PASS |

---

## 🎯 CONCLUSIÓN

Se encontraron y resolvieron **3 errores** durante la Fase 6:

1. **Error E-001 (Crítico):** Export Excel fallaba - Resuelto con dynamic import robusto
2. **Error P-001 (Medio):** Sucursal mostraba "Sucursal 1" - Resuelto usando pipe existente `SucursalNombrePipe`
3. **Error P-002 (Medio):** Usuario mostraba vacío - Resuelto con método helper y `.trim()`

**Características de las soluciones:**

- ✅ **Robustas:** Manejan múltiples casos edge y tipos de datos
- ✅ **Compatibles:** Funcionan con el código existente del proyecto
- ✅ **Consistentes:** Usan patrones ya establecidos en otros componentes
- ✅ **Probadas:** Verificadas en compilación y funcionamiento

**Hallazgo adicional:**
- ✅ Se eliminó código duplicado usando el pipe `SucursalNombrePipe` existente
- ✅ Se mejoró la consistencia con otros componentes del proyecto

**Estado de la Fase 6:** ✅ **COMPLETADA CON ÉXITO**

---

**Siguiente Fase:** [Fase 7: Optimización](plan_alt3_migr_completa_f7.md)
**Fase Anterior:** [Fase 5: Frontend - HTML Template](plan_alt3_migr_completa_f5.md)
**Plan Completo:** [Plan de Migración Completa](plan_alt3_migr_completa.md)
