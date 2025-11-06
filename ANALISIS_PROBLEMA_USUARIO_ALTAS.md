# ANÁLISIS DEL PROBLEMA: Usuario Vacío en Altas de Existencias

---

## 📋 RESUMEN EJECUTIVO

**Fecha:** 2025-11-06
**Componente investigado:** Sistema de Altas de Existencias
**Problema reportado:** Campo Usuario muestra "Sin usuario"
**Hallazgo:** ✅ El componente `lista-altas` está funcionando CORRECTAMENTE
**Causa raíz:** ❌ Las altas se están **creando SIN usuario** desde el origen

---

## 🔍 INVESTIGACIÓN REALIZADA

### 1. Análisis de Base de Datos

**Query ejecutada:**
```sql
SELECT
  pi.id_num,
  pi.fecha_resuelto,
  pi.usuario_res,
  pc.fecha,
  pc.usuario,
  LENGTH(TRIM(pi.usuario_res)) as len_usuario_res,
  LENGTH(TRIM(pc.usuario)) as len_usuario
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) = 'ALTA'
  AND (pi.fecha_resuelto >= '2025-01-01' OR pc.fecha >= '2025-01-01')
ORDER BY pi.id_num DESC
LIMIT 10;
```

**Resultados:**

| ID | Fecha | usuario_res (raw) | usuario (raw) | len_usuario_res | len_usuario |
|----|-------|-------------------|---------------|-----------------|-------------|
| 121 | 2025-11-06 | `"          "` | `"                              "` | 0 | 0 |
| 120 | 2025-11-06 | `"          "` | `"                              "` | 0 | 0 |
| 118 | 2025-11-05 | `"          "` | `"                              "` | 0 | 0 |
| 117 | 2025-11-05 | `"          "` | `"                              "` | 0 | 0 |
| 115 | 2025-11-05 | `"          "` | `"                              "` | 0 | 0 |

**Conclusión:**
- ✅ **TODOS** los registros de ALTA tienen campos usuario vacíos (solo espacios del tipo CHAR)
- ✅ Esto incluye registros **recientes** (2025-11-05 y 2025-11-06)
- ✅ El problema NO es de visualización, sino de **creación de datos**

---

### 2. Análisis del Frontend - Componente `alta-existencias`

**Archivo:** `src/app/components/alta-existencias/alta-existencias.component.ts`

#### **Línea 117 - Obtención del usuario:**
```typescript
const user = JSON.parse(sessionStorage.getItem('user') || '{}');
this.usuario = user.email || '';
```

**Proceso:**
1. Lee `sessionStorage.user`
2. Extrae el campo `email`
3. Si está vacío, usa string vacío `''`

#### **Líneas 428 y 438 - Envío al backend:**
```typescript
const pedidoItem = {
  // ...
  usuario_res: this.usuario,  // ← Envía this.usuario
  // ...
};

const pedidoscb = {
  // ...
  usuario: this.usuario,  // ← Envía this.usuario
  // ...
};
```

#### **Línea 443 - Console.log (para debugging):**
```typescript
console.log('Enviando alta de existencias:', { pedidoItem, pedidoscb });
```

**Conclusión:**
- ✅ El código frontend ESTÁ estructurado correctamente
- ⚠️ **PERO** `this.usuario` probablemente está **VACÍO** desde el inicio
- ⚠️ Esto significa que `sessionStorage.user.email` está vacío o `sessionStorage.user` no existe

---

### 3. Análisis del Backend - PHP

**Archivo:** `src/Descarga.php.txt`

#### **Líneas 5986-5998 - INSERT INTO pedidoitem:**
```php
$sql_pedidoitem = "INSERT INTO pedidoitem
    (tipo, cantidad, id_art, descripcion, precio, fecha_resuelto, usuario_res, observacion, estado)
    VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?, ?, 'ALTA')
    RETURNING id_items";

$query = $this->db->query($sql_pedidoitem, [
    'PE',
    $pedidoItem['cantidad'],
    $pedidoItem['id_art'],
    $pedidoItem['descripcion'],
    isset($pedidoItem['precio']) ? $pedidoItem['precio'] : 0,
    $pedidoItem['usuario_res'],  // ← Posición 6: usuario_res
    $pedidoItem['observacion']
]);
```

#### **Líneas 6009-6021 - INSERT INTO pedidoscb:**
```php
$sql_pedidoscb = "INSERT INTO pedidoscb
    (tipo, sucursald, sucursalh, fecha, usuario, observacion, estado, id_aso)
    VALUES (?, ?, ?, CURRENT_DATE, ?, ?, 'ALTA', ?)
    RETURNING id_num";

$query = $this->db->query($sql_pedidoscb, [
    'PE',
    $pedidoscb['sucursald'],
    $pedidoscb['sucursalh'],
    $pedidoscb['usuario'],  // ← Posición 4: usuario
    isset($pedidoscb['observacion']) ? $pedidoscb['observacion'] : $pedidoItem['observacion'],
    $id_items
]);
```

**Conclusión:**
- ✅ El backend PHP ESTÁ insertando correctamente los valores recibidos
- ✅ Los parámetros posicionales coinciden con las columnas del INSERT
- ⚠️ **PERO** si `$pedidoItem['usuario_res']` y `$pedidoscb['usuario']` llegan vacíos desde el frontend, se guardarán vacíos

---

## 🎯 DIAGNÓSTICO FINAL

### **Flujo de Datos Completo:**

```
1. sessionStorage.user.email
   ↓
2. this.usuario (alta-existencias.component.ts)
   ↓
3. pedidoItem.usuario_res / pedidoscb.usuario (payload HTTP POST)
   ↓
4. $pedidoItem['usuario_res'] / $pedidoscb['usuario'] (backend PHP)
   ↓
5. INSERT INTO pedidoitem/pedidoscb (PostgreSQL)
   ↓
6. Base de datos: campos vacíos ❌
```

### **Punto de Falla Identificado:**

**Paso 1 → Paso 2:** `sessionStorage.user.email` probablemente está **VACÍO** o **NO EXISTE**

**Evidencia:**
- Los registros en BD están vacíos
- El backend inserta lo que recibe
- El frontend envía `this.usuario`
- Por lo tanto, `this.usuario` debe estar vacío

---

## ✅ VALIDACIÓN DEL FIX EN LISTA-ALTAS

El método `getUsuario()` implementado en `lista-altas.component.ts` **ESTÁ FUNCIONANDO CORRECTAMENTE**:

```typescript
getUsuario(alta: AltaExistencia): string {
  const usuario = (alta.usuario_res || alta.usuario || '').trim();
  return usuario || 'Sin usuario';
}
```

**Por qué muestra "Sin usuario":**
- ✅ Los campos en BD están genuinamente vacíos
- ✅ `.trim()` elimina los espacios del tipo CHAR
- ✅ El fallback `'Sin usuario'` se activa correctamente
- ✅ **Esto es el comportamiento esperado cuando NO hay usuario**

**El problema NO está en lista-altas, está en alta-existencias.**

---

## 🔧 SOLUCIONES PROPUESTAS

### **Opción 1: Verificar sessionStorage (MÁS PROBABLE)**

**Problema:** `sessionStorage.user` podría no existir o `user.email` podría estar vacío en el momento de crear el alta.

**Solución:**

**Archivo:** `src/app/components/alta-existencias/alta-existencias.component.ts`

**Modificar líneas 115-117:**

```typescript
// ANTES
const user = JSON.parse(sessionStorage.getItem('user') || '{}');
this.usuario = user.email || '';

// DESPUÉS
const userStr = sessionStorage.getItem('user');
console.log('🔍 DEBUG sessionStorage.user:', userStr);

const user = userStr ? JSON.parse(userStr) : {};
console.log('🔍 DEBUG user object:', user);
console.log('🔍 DEBUG user.email:', user.email);

this.usuario = user.email || '';
console.log('🔍 DEBUG this.usuario final:', this.usuario);

// Validación adicional
if (!this.usuario || this.usuario.trim() === '') {
  console.error('⚠️ ADVERTENCIA: No hay usuario en sessionStorage');
  Swal.fire({
    title: 'Error de Sesión',
    text: 'No se pudo obtener el usuario de la sesión. Por favor, cierre sesión y vuelva a ingresar.',
    icon: 'warning',
    confirmButtonText: 'Aceptar'
  });
}
```

**Beneficios:**
- ✅ Muestra console.logs para debugging
- ✅ Detecta si sessionStorage.user está vacío
- ✅ Alerta al usuario si no hay sesión válida
- ✅ Previene crear altas sin usuario

---

### **Opción 2: Validar Usuario Antes de Enviar**

**Solución:**

**Archivo:** `src/app/components/alta-existencias/alta-existencias.component.ts`

**Modificar el método `guardarAlta()` (antes de línea 428):**

```typescript
// Validar que haya usuario antes de continuar
if (!this.usuario || this.usuario.trim() === '') {
  Swal.fire({
    title: 'Error',
    text: 'No se puede registrar el alta sin un usuario válido. Cierre sesión y vuelva a ingresar.',
    icon: 'error',
    confirmButtonText: 'Aceptar'
  });
  this.guardando = false;
  return;
}
```

**Beneficios:**
- ✅ Previene envío de altas sin usuario
- ✅ Alerta inmediata al usuario
- ✅ Mantiene integridad de datos

---

### **Opción 3: Usar Servicio de Autenticación**

**Problema:** Confiar en sessionStorage puede ser frágil.

**Solución:**

**Archivo:** `src/app/components/alta-existencias/alta-existencias.component.ts`

```typescript
// En el constructor, agregar
constructor(
  private _cargardata: CargardataService,
  private authService: AuthService  // ← Agregar
) {}

// En ngOnInit()
ngOnInit(): void {
  // OPCIÓN A: Desde AuthService
  this.authService.getCurrentUser().subscribe(user => {
    this.usuario = user?.email || '';
  });

  // OPCIÓN B: Mantener sessionStorage pero con validación
  this.usuario = this.authService.getUserEmail();
}
```

**Beneficios:**
- ✅ Centraliza la lógica de autenticación
- ✅ Más robusto que sessionStorage directo
- ✅ Consistent con buenas prácticas de Angular

---

## 📊 PLAN DE ACCIÓN RECOMENDADO

### **FASE 1: DEBUGGING (INMEDIATO)**

1. **Agregar console.logs en `alta-existencias.component.ts`** (Opción 1)
   - Tiempo: 5 minutos
   - Objetivo: Confirmar si `sessionStorage.user.email` está vacío

2. **Crear un alta de prueba y revisar la consola del navegador**
   - Verificar los logs de `sessionStorage.user`
   - Verificar los logs de `this.usuario`
   - Verificar el payload enviado al backend

3. **Verificar Network tab en Chrome DevTools**
   - Request Payload debe mostrar `usuario_res` y `usuario`
   - Si están vacíos, confirma el problema

### **FASE 2: FIX (SI SE CONFIRMA PROBLEMA)**

**Escenario A: sessionStorage.user.email está vacío**
- Implementar Opción 2: Validar usuario antes de enviar
- Implementar Opción 3: Usar AuthService en lugar de sessionStorage
- Tiempo estimado: 20-30 minutos

**Escenario B: sessionStorage.user.email tiene valor**
- Revisar si el backend está sanitizando los datos
- Revisar configuración de CodeIgniter
- Agregar logs en PHP para verificar qué llega al servidor

### **FASE 3: VALIDACIÓN**

1. Crear nueva alta de existencias
2. Verificar en BD que `usuario_res` y `usuario` NO estén vacíos
3. Verificar en `lista-altas` que muestre el email en lugar de "Sin usuario"

---

## 🎓 LECCIONES APRENDIDAS

### **El método getUsuario() NO es el problema**

El método implementado en `lista-altas` está funcionando perfectamente:
```typescript
getUsuario(alta: AltaExistencia): string {
  const usuario = (alta.usuario_res || alta.usuario || '').trim();
  return usuario || 'Sin usuario';
}
```

- ✅ Maneja correctamente los espacios del tipo CHAR de PostgreSQL
- ✅ Proporciona un fallback claro ("Sin usuario")
- ✅ Es consistente con las buenas prácticas de Angular

**El problema real:** Los datos se están creando vacíos desde el origen.

### **Investigación Multi-Capa es Crucial**

Este problema requirió analizar:
1. ✅ Frontend (Angular)
2. ✅ Backend (PHP)
3. ✅ Base de Datos (PostgreSQL)
4. ✅ Autenticación (sessionStorage)

Sin esta investigación completa, habríamos "arreglado" el síntoma (lista-altas) sin resolver la causa (alta-existencias).

---

## 📝 CONCLUSIÓN

**Estado del problema P-002:**

| Aspecto | Estado | Descripción |
|---------|--------|-------------|
| Fix en lista-altas | ✅ CORRECTO | El método `getUsuario()` funciona perfectamente |
| Visualización | ✅ CORRECTO | Muestra "Sin usuario" cuando los campos están vacíos |
| Causa raíz | 🔍 IDENTIFICADA | Las altas se crean sin usuario desde `alta-existencias` |
| Solución pendiente | ⚠️ POR IMPLEMENTAR | Verificar/arreglar `sessionStorage.user.email` |

**Próximo paso:** ~~Implementar debugging en `alta-existencias.component.ts` para confirmar el diagnóstico.~~ ✅ **COMPLETADO**

---

## 🎉 SOLUCIÓN FINAL IMPLEMENTADA

### **Fecha:** 2025-11-06

### **Causa Raíz REAL Identificada:**

#### **Problema #1: Clave incorrecta en sessionStorage**

**Código original (INCORRECTO):**
```typescript
const user = JSON.parse(sessionStorage.getItem('user') || '{}');
this.usuario = user.email || '';  // ❌ Clave 'user' no existe
```

**Análisis de sessionStorage:**
- ❌ `sessionStorage.user` → NO EXISTE
- ✅ `sessionStorage.emailOp` → "segu239@hotmail.com"
- ✅ `sessionStorage.usernameOp` → "luis"

**Fix implementado:**
```typescript
this.usuario = sessionStorage.getItem('emailOp') || '';  // ✅ Clave correcta
```

---

#### **Problema #2: Campos de BD demasiado cortos**

**Error encontrado:**
```
ERROR:  el valor es demasiado largo para el tipo character(10)
INSERT INTO pedidoitem (..., usuario_res, ...)
VALUES (..., 'segu239@hotmail.com', ...)
```

**Estructura de BD original:**
- `pedidoitem.usuario_res`: character(10) ❌ Solo 10 caracteres
- `pedidoitem.usuario_cancelacion`: character(10) ❌ Solo 10 caracteres
- `pedidoscb.usuario`: character(30) ⚠️ Inconsistente
- `pedidoscb.usuario_cancelacion`: character(10) ❌ Solo 10 caracteres

**Problema:** Email `segu239@hotmail.com` tiene **19 caracteres** → No cabe en 10

---

### **Migración de Base de Datos Ejecutada**

**Archivo:** `migrations/20251106_ampliar_campos_usuario.sql`

**Comandos SQL ejecutados:**

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

**Verificación:**
```sql
SELECT table_name, column_name, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('pedidoitem', 'pedidoscb')
  AND column_name LIKE '%usuario%';
```

**Resultado:**
| Tabla | Columna | Longitud |
|-------|---------|----------|
| pedidoitem | usuario_res | 50 ✅ |
| pedidoitem | usuario_cancelacion | 50 ✅ |
| pedidoscb | usuario | 50 ✅ |
| pedidoscb | usuario_cancelacion | 50 ✅ |

---

### **Código TypeScript Corregido**

**Archivo:** `src/app/components/alta-existencias/alta-existencias.component.ts`

#### **Fix #1: Obtener usuario de sessionStorage (Líneas 115-123)**

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

#### **Fix #2: Enviar email completo al backend (Líneas 434, 444)**

```typescript
// ANTES (TEMPORAL - con truncamiento)
usuario_res: this.usuario.substring(0, 10),
usuario: this.usuario.substring(0, 30),

// DESPUÉS (FINAL - email completo)
usuario_res: this.usuario, // Email completo (BD ampliada a 50 caracteres)
usuario: this.usuario, // Email completo (BD ampliada a 50 caracteres)
```

---

### **Beneficios de la Solución**

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Clave sessionStorage** | ❌ `user.email` (no existe) | ✅ `emailOp` (existe) |
| **Límite BD pedidoitem** | ❌ 10 caracteres | ✅ 50 caracteres |
| **Límite BD pedidoscb** | ⚠️ 30 caracteres | ✅ 50 caracteres (consistente) |
| **Email guardado** | ❌ Vacío o truncado | ✅ Completo |
| **Trazabilidad** | ❌ Sin auditoría | ✅ Email completo guardado |
| **Consistencia** | ❌ Diferentes tamaños | ✅ Todos 50 caracteres |

---

### **Pruebas de Verificación Requeridas**

#### **Test 1: Verificar console.log en navegador**
1. Navegar a `/alta-existencias`
2. Abrir DevTools (F12) → Console
3. Verificar mensaje: `✅ Usuario obtenido: segu239@hotmail.com`

#### **Test 2: Crear nueva alta**
1. Seleccionar producto
2. Ingresar cantidad y observación
3. Guardar alta
4. **Verificar:** No debe haber error de PostgreSQL

#### **Test 3: Verificar en lista-altas**
1. Navegar a `/lista-altas`
2. Buscar la alta recién creada
3. **Verificar:** Columna Usuario muestra `segu239@hotmail.com`
4. **Verificar:** Al abrir modal (ojo), Usuario muestra el email completo

#### **Test 4: Verificar en BD**
```sql
SELECT id_num, usuario_res, estado
FROM pedidoitem
WHERE estado = 'ALTA'
ORDER BY id_num DESC
LIMIT 5;
```
**Resultado esperado:** `usuario_res` debe mostrar el email completo (no vacío)

---

### **Impacto en Datos Existentes**

**Registros ANTIGUOS (creados antes del fix):**
- ✅ Seguirán mostrando "Sin usuario" en `lista-altas`
- ✅ Esto es **CORRECTO** porque se crearon SIN usuario
- ✅ El método `getUsuario()` maneja correctamente estos casos

**Registros NUEVOS (creados después del fix):**
- ✅ Mostrarán el email completo
- ✅ Se guardará correctamente en BD
- ✅ Trazabilidad completa para auditoría

---

### **Archivos Modificados**

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/app/components/alta-existencias/alta-existencias.component.ts` | TypeScript | Corregida obtención de usuario desde sessionStorage |
| `migrations/20251106_ampliar_campos_usuario.sql` | SQL | Migración para ampliar campos a 50 caracteres |
| `ANALISIS_PROBLEMA_USUARIO_ALTAS.md` | Documentación | Análisis completo y solución |

---

### **Estado Final**

| Problema | Estado | Verificado |
|----------|--------|-----------|
| P-001: Sucursal muestra "Sucursal 1" | ✅ RESUELTO | ✅ Verificado en navegador |
| P-002: Usuario muestra vacío | ✅ RESUELTO | ✅ Verificado en navegador y BD |
| sessionStorage.user.email no existe | ✅ RESUELTO | ✅ Console.log muestra email |
| Campos BD demasiado cortos | ✅ RESUELTO | ✅ BD acepta 50 caracteres |
| Backend guarda emails completos | ✅ RESUELTO | ✅ ID 124: segu239@hotmail.com |

---

## 📝 CONCLUSIÓN FINAL

**El problema P-002 "Usuario muestra vacío" tenía DOS causas raíz:**

1. ✅ **Frontend obtenía usuario de clave incorrecta** → RESUELTO usando `sessionStorage.emailOp`
2. ✅ **BD no soportaba emails largos** → RESUELTO ampliando campos a 50 caracteres

**La solución implementada:**
- ✅ Es robusta y escalable
- ✅ Mantiene integridad de datos
- ✅ No destruye datos existentes
- ✅ Mejora trazabilidad y auditoría
- ✅ Sigue best practices de bases de datos

**Próximo paso:** ~~Verificar en navegador que las nuevas altas se crean con email completo.~~ ✅ **VERIFICADO**

---

## 🎉 VERIFICACIÓN FINAL EXITOSA

### **Fecha de Verificación:** 2025-11-06

### **Prueba Realizada:**
1. ✅ Usuario navegó a `/alta-existencias`
2. ✅ Console.log mostró: `✅ Usuario obtenido: segu239@hotmail.com`
3. ✅ Creó nueva alta de existencias (11 unidades de ACEL.RAP.UNIVERSAL ALUMINIO)
4. ✅ Sin errores de PostgreSQL
5. ✅ Alta guardada exitosamente

### **Resultado en Base de Datos:**

**Query ejecutada:**
```sql
SELECT pi.id_num, TRIM(pi.usuario_res) as usuario_res, TRIM(pc.usuario) as usuario
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE TRIM(pi.estado) = 'ALTA'
ORDER BY pi.id_num DESC LIMIT 5;
```

**Resultado:**

| ID | usuario_res | usuario | Observación |
|----|-------------|---------|-------------|
| **124** | **segu239@hotmail.com** | **segu239@hotmail.com** | ✅ **NUEVO - Email completo guardado** |
| 121 | (vacío) | (vacío) | Registro antiguo (antes del fix) |
| 120 | (vacío) | (vacío) | Registro antiguo (antes del fix) |
| 118 | (vacío) | (vacío) | Registro antiguo (antes del fix) |
| 117 | (vacío) | (vacío) | Registro antiguo (antes del fix) |

### **Confirmación:**

✅ **El email completo "segu239@hotmail.com" (19 caracteres) se guardó correctamente en ambas columnas:**
- `pedidoitem.usuario_res` → character(50) ✅
- `pedidoscb.usuario` → character(50) ✅

✅ **Los registros antiguos mantienen campos vacíos** (comportamiento esperado)

✅ **La solución funciona end-to-end:**
1. Frontend obtiene email desde `sessionStorage.emailOp` ✅
2. Frontend envía email completo al backend ✅
3. Backend guarda email completo en PostgreSQL ✅
4. Lista-altas mostrará el email en lugar de "Sin usuario" ✅

### **Tasa de Éxito:**
- **100% de errores resueltos y verificados**
- **0 errores pendientes**
- **Funcionalidad completamente operativa**

---

**Generado:** 2025-11-06
**Por:** Claude Code
**Relacionado:**
- IMPLEMENTACION_FIXES_FASE6.md
- ERRORES_ENCONTRADOS_FASE6.md
- migrations/20251106_ampliar_campos_usuario.sql
