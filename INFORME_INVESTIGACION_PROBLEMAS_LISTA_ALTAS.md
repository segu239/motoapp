# INFORME DE INVESTIGACIÓN - PROBLEMAS EN LISTA-ALTAS
## Fase 6 - Análisis de Errores de Visualización

---

## 📋 RESUMEN EJECUTIVO

Durante las pruebas de la Fase 6 se detectaron **dos problemas de visualización** en el componente `lista-altas`:

| ID | Problema | Severidad | Ubicación | Estado |
|----|----------|-----------|-----------|--------|
| **P-001** | Campo Sucursal muestra "Sucursal 1" en lugar del nombre | 🟡 MEDIO | Tabla y Modal | 🔍 INVESTIGADO |
| **P-002** | Campo Usuario muestra vacío | 🟡 MEDIO | Tabla y Modal | 🔍 INVESTIGADO |

---

## 🔍 INVESTIGACIÓN COMPLETADA

### **Metodología**

Se realizó investigación exhaustiva en 4 capas:

1. ✅ **Base de Datos PostgreSQL** (via `/MP`)
2. ✅ **Backend PHP** (`Descarga.php.txt`)
3. ✅ **Frontend Angular** (`lista-altas.component.ts/html`)
4. ✅ **Otros Componentes** (Análisis de patrones existentes en el proyecto)

---

## 🐛 PROBLEMA #1: CAMPO SUCURSAL

### **Descripción del Usuario**

> "el campo sucursal muestra usuario 1 y deberia mostrar una sucursal y no un usuario que encima es inexistente. Tambien pasa en el modal del ojo Sucursal: Sucursal: Sucursal 1"

### **Síntomas Observados**

- **En la tabla:** Columna Sucursal muestra "Sucursal 1" en lugar de "Casa Central"
- **En el modal:** Muestra "Sucursal: Sucursal 1" (duplicado de label)
- **Esperado:** Debería mostrar "Casa Central", "Valle Viejo", etc.

---

### **INVESTIGACIÓN CAPA 1: BASE DE DATOS**

**Query ejecutada:**
```sql
SELECT
    pi.id_num,
    pc.sucursald,
    pg_typeof(pc.sucursald) AS tipo_sucursald
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
LIMIT 5;
```

**Resultado:**
```json
{
  "id_num": "120",
  "sucursald": "2",           // ✅ CORRECTO: Valor numérico
  "tipo_sucursald": "numeric"  // ✅ CORRECTO: Tipo de dato
}
```

**Verificación de estructura:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pedidoscb' AND column_name = 'sucursald';
```

**Resultado:**
| column_name | data_type |
|-------------|-----------|
| sucursald | numeric |

✅ **CONCLUSIÓN CAPA 1:** Los datos en la base están correctos (1, 2, 3, etc.)

---

### **INVESTIGACIÓN CAPA 2: BACKEND PHP**

**Archivo:** `Descarga.php.txt:6138-6287`

**Endpoint:** `ObtenerAltasConCostos_get()`

**SQL del Backend (líneas 6164-6241):**
```php
SELECT
    pi.id_num,
    pc.sucursald,  // <-- Retorna directamente sin transformación
    pc.usuario,
    pi.usuario_res,
    // ... otros campos
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
```

✅ **CONCLUSIÓN CAPA 2:** El backend **NO transforma** el campo `sucursald`. Lo retorna tal cual.

**⚠️ HALLAZGO CRÍTICO:** PHP devuelve campos `NUMERIC` de PostgreSQL como **STRING** en JSON por defecto.

**Ejemplo de respuesta JSON esperada:**
```json
{
  "data": [
    {
      "id_num": 120,
      "sucursald": "1",    // ⚠️ STRING, no NUMBER
      "usuario_res": "          ",  // 10 espacios
      "usuario": "                              "  // 30 espacios
    }
  ]
}
```

---

### **INVESTIGACIÓN CAPA 3: FRONTEND ANGULAR**

**Archivo:** `lista-altas.component.ts`

**Interface (líneas 9-34):**
```typescript
interface AltaExistencia {
  sucursald: number;    // ⚠️ Espera NUMBER pero recibe STRING
  usuario_res: string;
  usuario: string;
  // ...
}
```

**Array de Sucursales (líneas 78-85):**
```typescript
public sucursales: Sucursal[] = [
  { id: 0, nombre: 'Todas' },
  { id: 1, nombre: 'Casa Central' },     // ⬅️ id es NUMBER
  { id: 2, nombre: 'Valle Viejo' },
  { id: 3, nombre: 'Güemes' },
  { id: 4, nombre: 'Depósito' },
  { id: 5, nombre: 'Mayorista' }
];
```

**Función de Mapeo (líneas 416-419):**
```typescript
getNombreSucursal(id: number): string {
  const sucursal = this.sucursales.find(s => s.id === id);  // ⚠️ Strict equality ===
  return sucursal ? sucursal.nombre : `Sucursal ${id}`;     // ⬅️ Fallback
}
```

**Uso en HTML (línea 395):**
```html
<td *ngIf="columnasVisibles['sucursald']">
    {{ getNombreSucursal(alta.sucursald) }}
</td>
```

**Uso en Modal (línea 454):**
```typescript
<p><strong>Sucursal:</strong> ${this.getNombreSucursal(alta.sucursald)}</p>
```

---

### **INVESTIGACIÓN CAPA 4: OTROS COMPONENTES DEL PROYECTO**

**¿Cómo resuelven este problema otros componentes?**

Investigación realizada en componentes similares que manejan el campo `sucursald`:

#### **Componente `stockpedido`**

**Archivo:** `src/app/components/stockpedido/stockpedido.component.html:118-120`

```html
<ng-container *ngIf="col.field === 'sucursald' || col.field === 'sucursalh'; else normalField">
    {{pedido[col.field] | sucursalNombre}}
</ng-container>
```

✅ **HALLAZGO CRÍTICO:** El componente `stockpedido` usa un **PIPE** llamado `sucursalNombre` para transformar el ID a nombre.

---

#### **Pipe Existente: `SucursalNombrePipe`**

**Archivo:** `src/app/pipes/sucursal-nombre.pipe.ts`

```typescript
@Pipe({
  name: 'sucursalNombre'
})
export class SucursalNombrePipe implements PipeTransform {

  private mapeoSucursales: { [key: number]: string } = {
    1: 'Casa Central',
    2: 'Valle Viejo',
    3: 'Guemes',
    4: 'Deposito',
    5: 'Mayorista'
  };

  transform(value: number | string | null | undefined): string {
    // Manejar valores nulos o indefinidos
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    // Convertir a número si es string ✅
    const num = typeof value === 'string' ? parseInt(value, 10) : value;

    // Validar que sea un número válido
    if (isNaN(num)) {
      return 'N/A';
    }

    // Retornar el nombre mapeado o un valor por defecto
    return this.mapeoSucursales[num] || `Sucursal ${value}`;
  }
}
```

**Características del Pipe:**
1. ✅ **Acepta `number | string | null | undefined`** - Maneja todos los tipos
2. ✅ **Convierte string a number** automáticamente con `parseInt(value, 10)`
3. ✅ **Tiene el mismo mapeo** que el array de `lista-altas`
4. ✅ **Tiene fallback** `Sucursal ${value}` idéntico al de `lista-altas`
5. ✅ **Ya está registrado** en `app.module.ts:157` (disponible globalmente)

**Verificación de registro:**

**Archivo:** `src/app/app.module.ts:69,157`

```typescript
import { SucursalNombrePipe } from './pipes/sucursal-nombre.pipe';  // línea 69

@NgModule({
  declarations: [
    // ...
    SucursalNombrePipe,  // línea 157 - Registrado globalmente
    // ...
  ]
})
```

---

#### **🎯 CONCLUSIÓN CAPA 4**

**El proyecto YA TIENE una solución implementada y probada:**

- ✅ El pipe `SucursalNombrePipe` resuelve EXACTAMENTE el mismo problema
- ✅ Ya maneja la conversión de STRING a NUMBER
- ✅ Ya está disponible globalmente en toda la aplicación
- ✅ Ya es usado exitosamente por otros componentes (`stockpedido`, `enviostockpendientes`)
- ✅ Sigue el patrón Angular recomendado (pipes para transformaciones de visualización)

**Ventajas de usar el pipe existente vs crear una función:**

| Aspecto | Pipe `sucursalNombre` | Función `getNombreSucursal()` |
|---------|---------------------|------------------------------|
| **Reutilizable** | ✅ Global, se usa en toda la app | ❌ Local al componente |
| **Mantenibilidad** | ✅ Un solo lugar para modificar | ❌ Cada componente tiene su copia |
| **Consistencia** | ✅ Comportamiento uniforme | ❌ Puede variar por componente |
| **Angular Best Practice** | ✅ Patrón recomendado | ⚠️ Funcional pero no ideal |
| **Testing** | ✅ Se testea una vez | ❌ Hay que testear en cada componente |
| **Performance** | ✅ Pure pipe (cache automático) | ⚠️ Se ejecuta en cada change detection |

**⚠️ IMPORTANTE:** `lista-altas` está **reinventando la rueda** con la función `getNombreSucursal()` cuando ya existe una solución mejor.

---

### **🎯 CAUSA RAÍZ IDENTIFICADA**

**PROBLEMA:** Desajuste de tipos (Type Mismatch)

1. **Backend PHP** retorna `sucursald` como **STRING** `"1"` en JSON
2. **Frontend** espera `sucursald` como **NUMBER** `1` en la interface
3. **Búsqueda con `===`** falla porque `"1" !== 1` (STRING vs NUMBER)
4. **Fallback activado:** Retorna `"Sucursal 1"` en lugar de `"Casa Central"`

**Diagrama del Flujo:**

```
Base de Datos     Backend PHP        Frontend Angular        Resultado
─────────────     ───────────        ────────────────        ─────────
sucursald: 1  →   "sucursald": "1"  →  alta.sucursald = "1"  →  ❌
(NUMERIC)         (STRING en JSON)     (recibido como STRING)
                                           ↓
                           this.sucursales.find(s => s.id === "1")
                                           ↓
                                    "1" === 1 ? NO! ❌
                                           ↓
                               return `Sucursal ${"1"}` → "Sucursal 1"
```

---

## 🐛 PROBLEMA #2: CAMPO USUARIO VACÍO

### **Descripción del Usuario**

> "el campo Usuario no muestra nada, el mismo problema se da en el modal del ojo, donde el label usuario esta vacio."

### **Síntomas Observados**

- **En la tabla:** Columna Usuario aparece vacía (en blanco)
- **En el modal:** "Usuario:" seguido de espacio vacío
- **Esperado:** Debería mostrar el nombre del usuario que procesó el alta

---

### **INVESTIGACIÓN CAPA 1: BASE DE DATOS**

**Query ejecutada:**
```sql
SELECT
    pi.id_num,
    pi.usuario_res,
    pc.usuario,
    LENGTH(pi.usuario_res) as len_usuario_res,
    LENGTH(TRIM(pi.usuario_res)) as len_usuario_res_trim,
    LENGTH(pc.usuario) as len_usuario,
    LENGTH(TRIM(pc.usuario)) as len_usuario_trim
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
LIMIT 5;
```

**Resultados:**
```json
{
  "id_num": "120",
  "usuario_res": "          ",           // 10 espacios
  "usuario": "                              ",  // 30 espacios
  "len_usuario_res": 10,                 // ✅ Tamaño correcto para CHAR(10)
  "len_usuario_res_trim": 0,             // ❌ VACÍO después de TRIM
  "len_usuario": 30,                      // ✅ Tamaño correcto para CHAR(30)
  "len_usuario_trim": 0                   // ❌ VACÍO después de TRIM
}
```

**Verificación de estructura:**
```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('pedidoitem', 'pedidoscb')
  AND column_name IN ('usuario_res', 'usuario');
```

**Resultados:**
| tabla | column_name | data_type | max_length |
|-------|-------------|-----------|------------|
| pedidoitem | usuario_res | character | 10 |
| pedidoscb | usuario | character | 30 |

✅ **CONCLUSIÓN CAPA 1:** Ambos campos están **VACÍOS** en la base de datos (solo contienen espacios de padding del tipo CHAR)

---

### **INVESTIGACIÓN CAPA 2: BACKEND PHP**

**SQL del Backend (líneas 6173, 6181):**
```php
SELECT
    pi.usuario_res,  // <-- Retorna espacios vacíos
    pc.usuario,      // <-- Retorna espacios vacíos
    // ...
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
```

✅ **CONCLUSIÓN CAPA 2:** El backend retorna los campos tal cual están en la base (vacíos)

---

### **INVESTIGACIÓN CAPA 3: FRONTEND ANGULAR**

**HTML Tabla (línea 400):**
```html
<td *ngIf="columnasVisibles['usuario_res']">
    <small>{{ alta.usuario_res || alta.usuario }}</small>
</td>
```

**HTML Modal (línea 458):**
```typescript
<p><strong>Usuario:</strong> ${alta.usuario_res || alta.usuario}</p>
```

**Lógica de Fallback:**
```javascript
alta.usuario_res || alta.usuario
```

**⚠️ PROBLEMA CON ESPACIOS EN BLANCO:**

Si `usuario_res = "          "` (10 espacios):
- En JavaScript, un string con espacios es **TRUTHY** ✅
- Entonces `usuario_res || usuario` retorna `"          "`
- Se renderiza como **espacio vacío visual** (HTML colapsa espacios)

**Diagrama del Flujo:**

```
Base de Datos          Backend PHP           Frontend Angular        Resultado
─────────────          ───────────           ────────────────        ─────────
usuario_res: '     '  → "usuario_res": "  "  →  alta.usuario_res = "  "  →  ❌
(CHAR(10) vacío)       (espacios en JSON)      (string truthy)             (vacío visual)
                                                        ↓
                                          usuario_res || usuario
                                                        ↓
                                              "   " (truthy) → retorna espacios
                                                        ↓
                                         HTML: colapsa espacios → ""
```

---

### **🎯 CAUSA RAÍZ IDENTIFICADA**

**PROBLEMA 1:** Datos Ausentes en Base de Datos
- Los campos `usuario_res` y `usuario` están **genuinamente vacíos**
- Nunca se grabaron los nombres de usuario

**PROBLEMA 2:** Lógica de Fallback Inadecuada
- La expresión `usuario_res || usuario` **NO funciona** cuando los campos tienen espacios
- Strings con espacios son **truthy** en JavaScript
- El HTML colapsa los espacios, mostrando vacío visual

---

## 📊 TABLA RESUMEN DE HALLAZGOS

| Problema | Causa Raíz | Capa Afectada | Tipo de Error | Solución |
|----------|------------|---------------|---------------|----------|
| **Sucursal muestra "Sucursal 1"** | (1) Type mismatch: STRING vs NUMBER<br>(2) **Código duplicado:** no usa pipe existente | Backend → Frontend | Type coercion + Duplicación | ✅ Usar pipe `sucursalNombre` (ya existe) |
| **Usuario muestra vacío** | (1) Datos vacíos en DB<br>(2) Fallback no maneja strings con espacios | Base de Datos + Frontend | Data + Logic | ✅ Método helper con `.trim()` |

---

## 💡 SOLUCIONES PROPUESTAS

### **SOLUCIÓN PARA PROBLEMA #1: SUCURSAL**

#### **Opción A: Usar Pipe Existente `sucursalNombre` (RECOMENDADA ⭐⭐⭐)**

**Ventajas:**
- ✅ No requiere cambios en backend
- ✅ Usa código ya existente y probado
- ✅ Mantiene consistencia con otros componentes
- ✅ Sigue Angular best practices
- ✅ Better performance (pure pipe con cache)
- ✅ **ELIMINA código duplicado** (se puede borrar la función `getNombreSucursal()` y el array `sucursales`)

**Desventaja:** Ninguna

**Implementación:**

**Paso 1:** Modificar HTML - Tabla (línea 395)

**Archivo:** `lista-altas.component.html:395-397`

```html
<!-- ANTES (usando función) -->
<td *ngIf="columnasVisibles['sucursald']">
    {{ getNombreSucursal(alta.sucursald) }}
</td>

<!-- DESPUÉS (usando pipe) -->
<td *ngIf="columnasVisibles['sucursald']">
    {{ alta.sucursald | sucursalNombre }}
</td>
```

**Paso 2:** Modificar Modal (línea 454)

**Archivo:** `lista-altas.component.ts:454`

```typescript
// ANTES (usando función en SweetAlert)
<p><strong>Sucursal:</strong> ${this.getNombreSucursal(alta.sucursald)}</p>

// DESPUÉS - OPCIÓN 1: Pipe en template string (NO FUNCIONA en SweetAlert)
// ❌ No se puede usar pipes en template strings de SweetAlert

// DESPUÉS - OPCIÓN 2: Transformar manualmente (FUNCIONA ✅)
import { SucursalNombrePipe } from '../../pipes/sucursal-nombre.pipe';

export class ListaAltasComponent implements OnInit, OnDestroy {

  // Agregar después de línea 48
  private sucursalPipe = new SucursalNombrePipe();

  // ...

  // Modificar método verDetalles (línea 454)
  verDetalles(alta: AltaExistencia): void {
    // ...
    <p><strong>Sucursal:</strong> ${this.sucursalPipe.transform(alta.sucursald)}</p>
    // ...
  }
}
```

**Paso 3 (OPCIONAL - Limpieza de código):** Eliminar código obsoleto

**Archivo:** `lista-altas.component.ts`

```typescript
// ELIMINAR líneas 78-85 (array sucursales - ya no necesario)
// public sucursales: Sucursal[] = [
//   { id: 0, nombre: 'Todas' },
//   { id: 1, nombre: 'Casa Central' },
//   { id: 2, nombre: 'Valle Viejo' },
//   { id: 3, nombre: 'Güemes' },
//   { id: 4, nombre: 'Depósito' },
//   { id: 5, nombre: 'Mayorista' }
// ];

// ELIMINAR líneas 416-419 (función getNombreSucursal - ya no necesario)
// getNombreSucursal(id: number): string {
//   const sucursal = this.sucursales.find(s => s.id === id);
//   return sucursal ? sucursal.nombre : `Sucursal ${id}`;
// }

// ELIMINAR líneas 36-40 (interface Sucursal - ya no necesario)
// interface Sucursal {
//   id: number;
//   nombre: string;
// }
```

**Prueba de funcionamiento:**
```typescript
// En HTML con pipe
{{ 1 | sucursalNombre }}    → "Casa Central" ✅
{{ "1" | sucursalNombre }}  → "Casa Central" ✅
{{ 2 | sucursalNombre }}    → "Valle Viejo"  ✅
{{ "2" | sucursalNombre }}  → "Valle Viejo"  ✅
{{ 99 | sucursalNombre }}   → "Sucursal 99"  ✅ (fallback)
```

**Resultado Final:**
- ✅ Código más limpio (3 menos bloques de código innecesarios)
- ✅ Mejor mantenibilidad (cambios futuros solo en pipe)
- ✅ Consistencia con el resto de la aplicación

---

#### **Opción B: Type Coercion en Función Existente**

**Ventajas:** Mínimo cambio, no requiere modificar HTML
**Desventajas:**
- ❌ Mantiene código duplicado
- ❌ No sigue el patrón del resto de la app
- ❌ Peor performance que pipe

**Implementación:**

**Archivo:** `lista-altas.component.ts:416-419`

```typescript
// ANTES (FALLA)
getNombreSucursal(id: number): string {
  const sucursal = this.sucursales.find(s => s.id === id);  // ❌ Strict ===
  return sucursal ? sucursal.nombre : `Sucursal ${id}`;
}

// DESPUÉS (CORRECTO pero no ideal)
getNombreSucursal(id: number | string): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;  // ✅ Convierte a número
  const sucursal = this.sucursales.find(s => s.id === numId);
  return sucursal ? sucursal.nombre : `Sucursal ${id}`;
}
```

---

#### **Opción C: Parse en Recepción de Datos**

**Ventaja:** Mantiene tipos correctos en toda la aplicación
**Desventaja:** Requiere modificar el procesamiento de respuesta

**Implementación:**

**Archivo:** `lista-altas.component.ts:305-330`

```typescript
.subscribe({
  next: (response) => {
    if (!response.error) {
      // Parsear sucursald a número
      this.altas = (response.data || []).map(alta => ({
        ...alta,
        sucursald: parseInt(alta.sucursald, 10)  // ✅ Convierte STRING → NUMBER
      }));
      this.altasFiltradas = this.altas;
      this.totalRecords = response.total || 0;
      // ...
    }
  }
});
```

---

#### **Opción D: Fix en Backend PHP (NO RECOMENDADA)**

**Ventaja:** Arregla el tipo en la fuente
**Desventaja:** Requiere cambios en backend, más complejo

**Implementación:**

**Archivo:** `Descarga.php.txt:6287` (antes del return)

```php
// Antes de devolver la respuesta
foreach ($data as &$item) {
    $item['sucursald'] = intval($item['sucursald']);  // ✅ Convierte a entero
}

$this->response(array(
    'error' => false,
    'data' => $data,
    // ...
));
```

---

### **SOLUCIÓN PARA PROBLEMA #2: USUARIO VACÍO**

#### **Opción A: Mostrar Valor por Defecto (RECOMENDADA ⭐)**

**Ventaja:** Solución inmediata, sin modificar DB
**Desventaja:** No arregla datos históricos

**Implementación:**

**Archivo:** `lista-altas.component.ts` - Agregar método helper

```typescript
/**
 * Obtiene el usuario que procesó el alta, con fallback
 */
getUsuario(alta: AltaExistencia): string {
  const usuario = (alta.usuario_res || alta.usuario || '').trim();
  return usuario || 'Sin usuario';  // ✅ Fallback descriptivo
}
```

**Archivo:** `lista-altas.component.html:400`

```html
<!-- ANTES -->
<td *ngIf="columnasVisibles['usuario_res']">
    <small>{{ alta.usuario_res || alta.usuario }}</small>
</td>

<!-- DESPUÉS -->
<td *ngIf="columnasVisibles['usuario_res']">
    <small class="text-muted">{{ getUsuario(alta) }}</small>
</td>
```

**Archivo:** `lista-altas.component.ts:458` (Modal)

```typescript
// ANTES
<p><strong>Usuario:</strong> ${alta.usuario_res || alta.usuario}</p>

// DESPUÉS
<p><strong>Usuario:</strong> ${this.getUsuario(alta)}</p>
```

**Resultado Visual:**
- Si hay usuario: Muestra el nombre ✅
- Si está vacío: Muestra "Sin usuario" ✅ (en gris/muted)

---

#### **Opción B: Llenar Datos Históricos con Usuario del Sistema**

**Ventaja:** Arregla datos permanentemente
**Desventaja:** Requiere SQL UPDATE masivo

**SQL Script para Data Migration:**

**Archivo nuevo:** `migrations/20251106_fix_usuarios_vacios.sql`

```sql
-- ============================================================================
-- MIGRACIÓN: Llenar campos usuario_res y usuario vacíos
-- Fecha: 2025-11-06
-- Descripción: Rellena campos vacíos con usuario del sistema
-- ============================================================================

-- PASO 1: Identificar registros afectados
SELECT COUNT(*)
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
  AND (LENGTH(TRIM(pi.usuario_res)) = 0 OR LENGTH(TRIM(pc.usuario)) = 0);

-- PASO 2: UPDATE con usuario por defecto
UPDATE pedidoitem
SET usuario_res = 'SISTEMA'
WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta')
  AND LENGTH(TRIM(usuario_res)) = 0;

-- PASO 3: UPDATE en pedidoscb (si es necesario)
UPDATE pedidoscb pc
SET usuario = 'SISTEMA'
FROM pedidoitem pi
WHERE pc.id_num = pi.id_num
  AND TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
  AND LENGTH(TRIM(pc.usuario)) = 0;

-- PASO 4: Verificar resultados
SELECT
    COUNT(*) as total_corregidos,
    COUNT(CASE WHEN TRIM(pi.usuario_res) = 'SISTEMA' THEN 1 END) as con_usuario_res,
    COUNT(CASE WHEN TRIM(pc.usuario) = 'SISTEMA' THEN 1 END) as con_usuario
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta');
```

**⚠️ ADVERTENCIA:** Ejecutar en horario de bajo tráfico, puede tardar varios segundos.

---

#### **Opción C: Obtener Usuario de Otra Tabla**

**Ventaja:** Usa datos reales de la base
**Desventaja:** Requiere JOIN adicional, puede impactar performance

**Implementación en Backend:**

**Archivo:** `Descarga.php.txt:6164` (modificar SQL)

```php
SELECT
    pi.id_num,
    pi.usuario_res,
    pc.usuario,
    -- Intentar obtener usuario de otra tabla como fallback
    COALESCE(
        NULLIF(TRIM(pi.usuario_res), ''),
        NULLIF(TRIM(pc.usuario), ''),
        u.nombre,           -- Desde tabla usuarios
        'Sin usuario'       -- Fallback final
    ) AS usuario_display,
    // ...
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
LEFT JOIN usuarios u ON u.id = pc.id_usuario  -- Si existe relación
WHERE TRIM(pi.estado) IN ('ALTA', 'Cancel-Alta')
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### **FASE 1: FIXES INMEDIATOS (15 minutos)**

1. ✅ **Fix Sucursal** - Opción A (Usar pipe `sucursalNombre` existente)
   - **Paso 1:** Importar `SucursalNombrePipe` en el componente
   - **Paso 2:** Crear instancia del pipe en el componente
   - **Paso 3:** Modificar HTML tabla (usar pipe en lugar de función)
   - **Paso 4:** Modificar modal (usar `sucursalPipe.transform()`)
   - **Paso 5 (Opcional):** Eliminar código obsoleto (función `getNombreSucursal`, array `sucursales`, interface `Sucursal`)

2. ✅ **Fix Usuario** - Opción A (Valor por defecto)
   - Crear método `getUsuario()` con `.trim()` y fallback
   - Actualizar HTML tabla y modal

---

### **FASE 2: TESTING Y VALIDACIÓN (10 minutos)**

1. ✅ Verificar que Sucursal muestra nombres correctos:
   - Casa Central, Valle Viejo, Güemes, etc.

2. ✅ Verificar que Usuario muestra "Sin usuario" cuando está vacío

3. ✅ Verificar en **tabla** y **modal**

---

### **FASE 3: DATA MIGRATION (OPCIONAL - Solo si se requiere limpiar datos históricos)**

1. ⏸️ Ejecutar SQL script `20251106_fix_usuarios_vacios.sql`
2. ⏸️ Verificar en frontend que ahora muestra "SISTEMA"

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### **Sucursal - Usar Pipe Existente `sucursalNombre`**

- [ ] **Paso 1:** Agregar import en `lista-altas.component.ts:1`
  ```typescript
  import { SucursalNombrePipe } from '../../pipes/sucursal-nombre.pipe';
  ```
- [ ] **Paso 2:** Crear instancia del pipe en `lista-altas.component.ts:48`
  ```typescript
  private sucursalPipe = new SucursalNombrePipe();
  ```
- [ ] **Paso 3:** Modificar HTML tabla `lista-altas.component.html:395`
  ```html
  {{ alta.sucursald | sucursalNombre }}
  ```
- [ ] **Paso 4:** Modificar modal `lista-altas.component.ts:454`
  ```typescript
  ${this.sucursalPipe.transform(alta.sucursald)}
  ```
- [ ] **Paso 5 (OPCIONAL):** Eliminar código obsoleto
  - [ ] Eliminar array `sucursales` (líneas 78-85)
  - [ ] Eliminar función `getNombreSucursal()` (líneas 416-419)
  - [ ] Eliminar interface `Sucursal` (líneas 36-40)
- [ ] **Test:** Abrir `/lista-altas` y verificar columna Sucursal
- [ ] **Test:** Abrir modal (ojo) y verificar campo Sucursal
- [ ] ✅ **Esperado:** "Casa Central", "Valle Viejo", etc.

---

### **Usuario - Fix Valor por Defecto**

- [ ] Agregar método `getUsuario()` en `lista-altas.component.ts` (después de línea 419)
- [ ] Modificar HTML tabla línea 400: `{{ getUsuario(alta) }}`
- [ ] Modificar HTML modal línea 458: `${this.getUsuario(alta)}`
- [ ] Agregar clase CSS `text-muted` para diferenciar valores por defecto
- [ ] **Test:** Abrir `/lista-altas` y verificar columna Usuario
- [ ] **Test:** Abrir modal (ojo) y verificar campo Usuario
- [ ] ✅ **Esperado:** "Sin usuario" (en gris/muted)

---

## 🧪 PLAN DE PRUEBAS POST-FIX

| ID | Prueba | Caso | Resultado Esperado |
|----|--------|------|-------------------|
| **F-01** | Sucursal en Tabla | Alta con sucursald=1 | Muestra "Casa Central" |
| **F-02** | Sucursal en Tabla | Alta con sucursald=2 | Muestra "Valle Viejo" |
| **F-03** | Sucursal en Modal | Abrir detalles con sucursald=1 | Muestra "Sucursal: Casa Central" |
| **F-04** | Sucursal en Modal | Abrir detalles con sucursald=2 | Muestra "Sucursal: Valle Viejo" |
| **U-01** | Usuario en Tabla | Alta con usuario vacío | Muestra "Sin usuario" (gris) |
| **U-02** | Usuario en Modal | Abrir detalles con usuario vacío | Muestra "Usuario: Sin usuario" |
| **E-01** | Edge Case | Alta con sucursald=99 (inexistente) | Muestra "Sucursal 99" (fallback) |
| **E-02** | Edge Case | Alta con usuario = "admin" | Muestra "admin" |

---

## 📊 IMPACTO ESTIMADO

### **Antes del Fix**

| Campo | Problema | Impacto Usuario |
|-------|----------|-----------------|
| Sucursal | Muestra "Sucursal 1" | ❌ Confusión, no sabe qué sucursal es |
| Usuario | Muestra vacío | ❌ No sabe quién procesó el alta |

### **Después del Fix**

| Campo | Solución | Impacto Usuario |
|-------|----------|-----------------|
| Sucursal | Muestra "Casa Central" | ✅ Información clara y útil |
| Usuario | Muestra "Sin usuario" | ✅ Indica explícitamente que no hay dato |

---

## ⏱️ TIEMPO ESTIMADO

| Tarea | Tiempo |
|-------|--------|
| Implementar Fix Sucursal (Opción A - Pipe) | 8 min |
| Implementar Fix Usuario | 5 min |
| Compilar y verificar | 2 min |
| Testing manual | 8 min |
| Limpieza código obsoleto (OPCIONAL) | 3 min |
| **TOTAL (sin limpieza)** | **23 minutos** |
| **TOTAL (con limpieza)** | **26 minutos** |

---

## 🎯 CRITERIO DE APROBACIÓN

Los fixes se consideran **EXITOSOS** si:

1. ✅ Columna Sucursal muestra nombres: "Casa Central", "Valle Viejo", etc.
2. ✅ Columna Usuario muestra "Sin usuario" cuando está vacío
3. ✅ Modal muestra la misma información correctamente
4. ✅ No aparecen errores en consola
5. ✅ Todas las pruebas F-01 a E-02 pasan

---

## 📌 NOTAS TÉCNICAS

### **Sobre Type Coercion JavaScript**

```javascript
// Strict equality (===)
"1" === 1   // false ❌
1 === 1     // true  ✅

// Type coercion
parseInt("1", 10) === 1  // true ✅
Number("1") === 1        // true ✅
+"1" === 1               // true ✅ (unary plus)
```

### **Sobre CHAR vs VARCHAR en PostgreSQL**

```sql
-- CHAR(10) siempre ocupa 10 bytes (rellena con espacios)
usuario_res CHAR(10) = 'admin'
-- Se guarda como: 'admin     ' (con 5 espacios)

-- VARCHAR(10) ocupa solo los bytes necesarios
usuario_res VARCHAR(10) = 'admin'
-- Se guarda como: 'admin' (sin espacios)
```

**Recomendación:** Considerar migrar `usuario_res` y `usuario` de CHAR a VARCHAR en futuras versiones.

---

## 🔗 REFERENCIAS

### **Documentación**
- **Plan de Migración:** [plan_alt3_migr_completa_f6.md](plan_alt3_migr_completa_f6.md)
- **Guía de Testing:** [GUIA_TESTING_MANUAL_FASE6.md](GUIA_TESTING_MANUAL_FASE6.md)
- **Errores Encontrados:** [ERRORES_ENCONTRADOS_FASE6.md](ERRORES_ENCONTRADOS_FASE6.md)

### **Código Afectado**
- **Componente Lista-Altas:** [src/app/components/lista-altas/lista-altas.component.ts](src/app/components/lista-altas/lista-altas.component.ts)
- **Template Lista-Altas:** [src/app/components/lista-altas/lista-altas.component.html](src/app/components/lista-altas/lista-altas.component.html)
- **Backend:** [src/Descarga.php.txt](src/Descarga.php.txt)

### **Código Relacionado (Patrones Existentes)**
- **Pipe SucursalNombre:** [src/app/pipes/sucursal-nombre.pipe.ts](src/app/pipes/sucursal-nombre.pipe.ts) ⭐ SOLUCIÓN
- **Componente StockPedido (Referencia):** [src/app/components/stockpedido/stockpedido.component.html](src/app/components/stockpedido/stockpedido.component.html)
- **App Module (Registro de Pipes):** [src/app/app.module.ts](src/app/app.module.ts)

---

## ✅ PRÓXIMOS PASOS

1. **Revisar este informe** con el equipo
2. **Decidir** qué opciones de solución implementar
3. **Ejecutar** las implementaciones (20 minutos)
4. **Ejecutar** plan de pruebas (10 minutos)
5. **Actualizar** documentación de Fase 6
6. **Continuar** con pruebas restantes de la Fase 6

---

**Fecha del Informe:** 2025-11-06
**Investigador:** Claude Code
**Estado:** ✅ INVESTIGACIÓN COMPLETA - ESPERANDO APROBACIÓN PARA IMPLEMENTAR

---

## 📢 RESUMEN EJECUTIVO PARA DECISIÓN

### **Hallazgo Principal**

El proyecto **YA TIENE** implementada una solución robusta y probada para el problema de Sucursal:

- ✅ **Pipe `SucursalNombrePipe`** en `src/app/pipes/sucursal-nombre.pipe.ts`
- ✅ Ya usado exitosamente en `stockpedido` y `enviostockpendientes`
- ✅ Maneja automáticamente conversión STRING → NUMBER
- ✅ Código más limpio, mejor performance, mejor mantenibilidad

### **Recomendación Técnica**

**OPCIÓN A (RECOMENDADA):** Usar el pipe existente `sucursalNombre`

**Ventajas clave:**
1. **NO reinventar la rueda** - Usa código ya probado
2. **Mantiene consistencia** - Igual que el resto de la aplicación
3. **Elimina duplicación** - Se puede borrar 3 bloques de código obsoleto
4. **Mejor arquitectura** - Sigue Angular best practices

**Tiempo estimado:** 23-26 minutos (dependiendo si se hace limpieza de código)
