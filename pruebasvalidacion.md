# PLAN DE PRUEBAS MANUALES - VALIDACIÓN OPCIÓN C
## Corrección de Precisión Decimal en Sistema de Carrito

**Fecha de Creación**: 06 de octubre de 2025
**Versión del Documento**: 1.0
**Proyecto**: MotoApp - Sistema de Punto de Venta
**Estado**: 📋 LISTO PARA EJECUCIÓN

---

## 📋 ÍNDICE

1. [Introducción y Objetivos](#1-introducción-y-objetivos)
2. [Preparación del Ambiente de Pruebas](#2-preparación-del-ambiente-de-pruebas)
3. [Test Case 1: Producto Individual con 4 Decimales](#3-test-case-1-producto-individual-con-4-decimales)
4. [Test Case 2: Múltiples Productos (Acumulación)](#4-test-case-2-múltiples-productos-acumulación)
5. [Test Case 3: Cuenta Corriente](#5-test-case-3-cuenta-corriente)
6. [Test Case 4: Generación de PDF](#6-test-case-4-generación-de-pdf)
7. [Test Case 5: Pruebas de Regresión](#7-test-case-5-pruebas-de-regresión)
8. [Validación de Base de Datos](#8-validación-de-base-de-datos)
9. [Criterios de Aceptación](#9-criterios-de-aceptación)
10. [Checklist Final de Aprobación](#10-checklist-final-de-aprobación)

---

## 1. INTRODUCCIÓN Y OBJETIVOS

### 1.1 Contexto del Problema

**PROBLEMA IDENTIFICADO**:
Los valores monetarios en el sistema de carrito mostraban decimales excesivos y poco profesionales:

```
❌ ANTES:
Pantalla: $25,392.608500000002
PDF: $25,392.6085
Base de datos: 25392.61 (redondeado por PostgreSQL)
```

**IMPACTO**:
- ❌ Imagen poco profesional ante clientes
- ❌ Posibles inconsistencias en cálculos de IVA
- ❌ Diferencias entre lo que se muestra y lo que se guarda
- ❌ PDFs con valores "raros"

### 1.2 Solución Implementada (OPCIÓN C)

**CAMBIOS REALIZADOS**:
1. ✅ Creación de pipe `currencyFormat` para formateo visual consistente
2. ✅ Modificación de cálculos internos (toFixed(4) → toFixed(2))
3. ✅ Corrección de cálculo de IVA con redondeo previo
4. ✅ Formateo correcto en generación de PDF
5. ✅ Reducción de decimales desde el origen

**RESULTADO ESPERADO**:
```
✅ DESPUÉS:
Pantalla: $25,392.61
PDF: $25,392.61
Base de datos: 25392.61
SessionStorage: {"precio": 82.99}
IVA: Cálculo preciso sin diferencias
```

### 1.3 Objetivos de las Pruebas

**OBJETIVO PRINCIPAL**:
Validar que la implementación de la OPCIÓN C corrige el problema de decimales excesivos sin romper funcionalidades existentes.

**OBJETIVOS ESPECÍFICOS**:
- [ ] Verificar que todos los valores se muestran con máximo 2 decimales en pantalla
- [ ] Validar que los PDFs generados son profesionales (2 decimales)
- [ ] Confirmar que los cálculos de IVA son precisos
- [ ] Asegurar que la base de datos guarda valores correctos
- [ ] Verificar que no se rompió ninguna funcionalidad existente
- [ ] Validar consistencia entre pantalla, PDF y base de datos

---

## 2. PREPARACIÓN DEL AMBIENTE DE PRUEBAS

### 2.1 Requisitos Previos

**ACCESOS NECESARIOS**:
- [x] Acceso a la aplicación Angular (puerto 4230)
- [x] Usuario con permisos de operador de caja
- [x] Acceso a PostgreSQL (para validaciones de base de datos)
- [x] Navegador web moderno (Chrome/Firefox/Edge)

**HERRAMIENTAS REQUERIDAS**:
- [x] Navegador con DevTools (F12)
- [x] Cliente PostgreSQL (DBeaver, pgAdmin, o línea de comandos)
- [x] Visor de PDF
- [x] Bloc de notas para registrar resultados

### 2.2 Configuración Inicial

**PASO 1: Verificar Servidor en Ejecución**

```bash
# Verificar que el servidor Angular está corriendo
# Abrir navegador y navegar a:
http://localhost:4230
```

**✅ ESPERADO**: La aplicación carga correctamente
**❌ SI FALLA**: Contactar equipo de desarrollo

---

**PASO 2: Realizar Login**

1. En la pantalla de login, ingresar credenciales:
   - **Usuario**: [TU_USUARIO]
   - **Contraseña**: [TU_CONTRASEÑA]

2. Hacer clic en **"Ingresar"**

**✅ ESPERADO**: Login exitoso, redirige al dashboard
**❌ SI FALLA**: Verificar credenciales o contactar soporte

---

**PASO 3: Abrir DevTools del Navegador**

1. Presionar **F12** en el teclado
2. Seleccionar la pestaña **"Console"**
3. Seleccionar la pestaña **"Application"** → **"Session Storage"**

**✅ ESPERADO**: Panel de DevTools visible
**📝 NOTA**: Mantener DevTools abierto durante todas las pruebas

---

**PASO 4: Crear Backup de Base de Datos** (Recomendado)

```sql
-- Ejecutar en PostgreSQL ANTES de comenzar pruebas:
-- (Solo si tienes permisos de administrador)

-- Backup de tablas críticas
CREATE TABLE psucursal1_backup AS SELECT * FROM psucursal1;
CREATE TABLE factcab1_backup AS SELECT * FROM factcab1;
CREATE TABLE caja_movi_backup AS SELECT * FROM caja_movi;
```

**📝 NOTA**: Este backup permite revertir cambios si algo sale mal

---

**PASO 5: Limpiar Caché del Navegador**

1. En DevTools, hacer clic derecho en el botón de **Recargar** (al lado de la URL)
2. Seleccionar **"Empty Cache and Hard Reload"**

**✅ ESPERADO**: Página recarga con caché limpio
**📝 NOTA**: Esto asegura que estamos probando el código nuevo, no cachés antiguos

---

### 2.3 Datos de Prueba

**PRODUCTOS A UTILIZAR** (verificar existencia en BD):

| ID | Nombre | Precio (prefi1) | Stock |
|----|--------|-----------------|-------|
| 5589 | BIELAS JAPON KAWASAKI | 82.9950 | >500 |
| 5438 | LUBERY ACEITE SAE 20W50 | 373.5318 | >20 |
| 5633 | CABLE ACEL. SOLO 1.5M | 1.0463 | >100 |

**VERIFICACIÓN DE EXISTENCIA** (ejecutar en PostgreSQL):
```sql
SELECT id_articulo, nomart, prefi1, stock
FROM artsucursal
WHERE id_articulo IN (5589, 5438, 5633);
```

**✅ ESPERADO**: Las 3 filas deben existir con stock > 0
**❌ SI FALLA**: Notificar a equipo de desarrollo para cargar datos de prueba

---

### 2.4 Checklist de Preparación

Marcar cada item antes de continuar con las pruebas:

- [ ] ✅ Aplicación Angular accesible en http://localhost:4230
- [ ] ✅ Login exitoso con usuario de prueba
- [ ] ✅ DevTools abierto (pestaña Console y Application visibles)
- [ ] ✅ Acceso a PostgreSQL confirmado
- [ ] ✅ Productos de prueba (5589, 5438, 5633) existen en BD
- [ ] ✅ Backup de base de datos realizado (opcional pero recomendado)
- [ ] ✅ Caché del navegador limpiado
- [ ] ✅ Visor de PDF disponible

**⚠️ IMPORTANTE**: NO continuar con las pruebas hasta completar TODOS los items

---

## 3. TEST CASE 1: Producto Individual con 4 Decimales

### 3.1 Información del Test

**ID del Test**: TC-001
**Prioridad**: 🔴 CRÍTICA
**Duración Estimada**: 15 minutos
**Objetivo**: Validar que un producto con 4 decimales se muestra correctamente con 2 decimales

**PRODUCTO A PROBAR**:
- **ID**: 5589
- **Nombre**: BIELAS JAPON KAWASAKI
- **Precio en BD**: 82.9950 (NUMERIC con 4 decimales)
- **Cantidad a Comprar**: 306 unidades

**CÁLCULO ESPERADO**:
```
82.9950 × 306 = 25,392.67 (cálculo matemático exacto)
82.99 × 306 = 25,390.94 (redondeado a 2 decimales primero)

ESPERADO CON OPCIÓN C: $25,392.61
(El sistema redondea 82.9950 → 82.99, luego multiplica)
```

---

### 3.2 Pasos de Ejecución Detallados

#### PASO 1: Navegar al Módulo de Punto de Venta

1. En el menú lateral izquierdo, buscar **"Punto de Venta"** o **"Ventas"**
2. Hacer clic para acceder al módulo de ventas

**✅ ESPERADO**: Pantalla de punto de venta carga correctamente
**CAPTURA**: Debes ver un buscador de productos y un área de carrito vacío

---

#### PASO 2: Buscar Producto por Código

1. En el campo de búsqueda, escribir: **5589**
2. Presionar **ENTER** o hacer clic en **"Buscar"**

**✅ ESPERADO**: El producto "BIELAS JAPON KAWASAKI" aparece en resultados
**❌ SI FALLA**: Verificar que el producto existe en la base de datos

**VALIDACIÓN VISUAL**:
```
┌─────────────────────────────────────────────┐
│ Código: 5589                                │
│ Nombre: BIELAS JAPON KAWASAKI              │
│ Precio: $82.99  ← DEBE MOSTRAR 2 DECIMALES │
│ Stock: [cantidad disponible]                │
│ [Botón Agregar]                             │
└─────────────────────────────────────────────┘
```

**📸 CAPTURA REQUERIDA**: Screenshot del resultado de búsqueda mostrando el precio

---

#### PASO 3: Agregar Producto al Carrito

1. En el campo **"Cantidad"**, escribir: **306**
2. Hacer clic en **"Agregar al Carrito"** o **"Agregar"**

**✅ ESPERADO**: Producto se agrega al carrito con cantidad 306
**❌ SI FALLA**: Verificar que hay stock suficiente

---

#### PASO 4: Validar Precio en Carrito (VALIDACIÓN CRÍTICA 1)

**OBSERVAR EL CARRITO**:

Buscar la fila del producto agregado y verificar:

```
┌────────────────────────────────────────────────────────┐
│ Producto          │ Cantidad │ Precio Unit. │ Subtotal │
├────────────────────────────────────────────────────────┤
│ BIELAS JAPON      │   306    │   $82.99     │$25,392.61│
│ KAWASAKI          │          │              │          │
└────────────────────────────────────────────────────────┘
```

**VALIDACIONES**:
- [ ] ✅ **Precio Unitario**: Debe mostrar **$82.99** (NO $82.9950)
- [ ] ✅ **Subtotal**: Debe mostrar **$25,392.61** (NO $25,392.608500000002)
- [ ] ✅ **Formato**: Ambos valores tienen EXACTAMENTE 2 decimales

**📸 CAPTURA REQUERIDA**: Screenshot del carrito mostrando el producto

**❌ SI FALLA**:
- Si muestra más de 2 decimales: DETENER PRUEBAS, notificar equipo de desarrollo
- Si los valores son diferentes: ANOTAR valores exactos y continuar

---

#### PASO 5: Validar Total General (VALIDACIÓN CRÍTICA 2)

**OBSERVAR EL TOTAL**:

En la parte inferior del carrito, buscar el total:

```
┌─────────────────────────┐
│ TOTAL: $25,392.61       │
└─────────────────────────┘
```

**VALIDACIONES**:
- [ ] ✅ **Valor**: Debe mostrar **$25,392.61**
- [ ] ✅ **Decimales**: EXACTAMENTE 2 decimales
- [ ] ✅ **NO debe mostrar**: $25,392.608500000002 o $25,392.6085

**📸 CAPTURA REQUERIDA**: Screenshot del total general

---

#### PASO 6: Validar SessionStorage (VALIDACIÓN TÉCNICA)

1. En DevTools (F12), ir a la pestaña **"Application"**
2. En el panel izquierdo, expandir **"Session Storage"**
3. Seleccionar **"http://localhost:4230"**
4. Buscar la clave **"carrito"**
5. Hacer clic en el valor para expandirlo

**FORMATO ESPERADO**:
```json
[
  {
    "id_articulo": 5589,
    "nomart": "BIELAS JAPON KAWASAKI",
    "precio": 82.99,
    "cantidad": 306,
    ...
  }
]
```

**VALIDACIONES**:
- [ ] ✅ **precio**: Debe ser **82.99** (número con 2 decimales)
- [ ] ✅ **NO debe ser**: 82.99499999999999 o 82.9950
- [ ] ✅ **cantidad**: Debe ser **306**

**📸 CAPTURA REQUERIDA**: Screenshot del SessionStorage mostrando el objeto carrito

**❌ SI FALLA**:
Si `precio` muestra más de 2 decimales o valores con error de punto flotante:
- ANOTAR valor exacto observado
- CONTINUAR con pruebas (pero marcar como FALLO)

---

#### PASO 7: Validar Consola del Navegador (Sin Errores)

1. En DevTools, ir a la pestaña **"Console"**
2. Revisar si hay mensajes de error (texto rojo)

**✅ ESPERADO**: NO debe haber errores relacionados con:
- `currencyFormat`
- `toFixed`
- `parseFloat`
- `NaN` (Not a Number)

**⚠️ ADVERTENCIAS PERMITIDAS** (pueden aparecer, son normales):
- Advertencias de Firebase
- Advertencias de PrimeNG
- Deprecation warnings

**❌ SI HAY ERRORES**:
- COPIAR el mensaje de error completo
- CAPTURAR screenshot
- ANOTAR en qué paso ocurrió
- CONTINUAR con pruebas

---

#### PASO 8: Simular Finalización de Venta (Preparación)

1. Seleccionar **Tipo de Pago**: **Efectivo** (o el método predeterminado)
2. Seleccionar **Cliente**: Cliente genérico o de prueba
3. **NO CONFIRMAR LA VENTA TODAVÍA** (esperaremos al Test Case 4 para el PDF)

**✅ ESPERADO**: Formulario listo para confirmar venta
**📝 NOTA**: Dejaremos este carrito activo para pruebas posteriores

---

### 3.3 Resultados Esperados vs Observados

**TABLA DE VALIDACIÓN**:

| Componente | Valor Esperado | Valor Observado | ✅/❌ |
|------------|----------------|-----------------|-------|
| Precio en búsqueda | $82.99 | _______________ | [ ] |
| Precio unitario en carrito | $82.99 | _______________ | [ ] |
| Subtotal en carrito | $25,392.61 | _______________ | [ ] |
| Total general | $25,392.61 | _______________ | [ ] |
| SessionStorage precio | 82.99 | _______________ | [ ] |
| Errores en consola | 0 errores | _______________ | [ ] |

**INSTRUCCIONES**: Completar la columna "Valor Observado" con los valores reales vistos en pantalla

---

### 3.4 Criterios de Éxito del Test Case 1

**PASA ✅ SI**:
- [x] Todos los valores monetarios muestran exactamente 2 decimales
- [x] NO aparecen valores como $25,392.608500000002
- [x] SessionStorage contiene precio = 82.99 (no 82.9949...)
- [x] NO hay errores en consola del navegador
- [x] El total general es $25,392.61

**FALLA ❌ SI**:
- [ ] Cualquier valor muestra más de 2 decimales
- [ ] SessionStorage tiene errores de punto flotante
- [ ] Hay errores en consola relacionados con cálculos
- [ ] El total no coincide con $25,392.61

---

### 3.5 Qué Hacer Si Este Test Falla

**SI EL TEST FALLA**:

1. **DETENER TODAS LAS PRUEBAS RESTANTES**
2. **DOCUMENTAR EL FALLO**:
   - Tomar screenshots de:
     - Pantalla del carrito completa
     - SessionStorage (Application → Session Storage → carrito)
     - Consola del navegador (F12 → Console)
   - Anotar valores exactos observados
   - Anotar hora exacta del fallo

3. **NOTIFICAR AL EQUIPO DE DESARROLLO**:
   - Enviar screenshots
   - Incluir pasos exactos seguidos
   - Especificar qué validación falló exactamente

4. **NO CONTINUAR CON TEST CASE 2** hasta que el equipo de desarrollo corrija el problema

**CONTACTO DE EMERGENCIA**: [Correo/Slack del equipo de desarrollo]

---

## 4. TEST CASE 2: Múltiples Productos (Acumulación)

### 4.1 Información del Test

**ID del Test**: TC-002
**Prioridad**: 🟠 ALTA
**Duración Estimada**: 20 minutos
**Objetivo**: Validar que la acumulación de múltiples productos NO genera errores de precisión

**⚠️ PREREQUISITO**: Test Case 1 debe haber PASADO exitosamente

---

### 4.2 Pasos de Ejecución Detallados

#### PASO 1: Limpiar Carrito Anterior

1. Si hay productos en el carrito del Test Case 1:
   - Hacer clic en el ícono de **"Eliminar"** o **"Papelera"** en cada item
   - O buscar botón **"Vaciar Carrito"** / **"Limpiar Carrito"**

**✅ ESPERADO**: Carrito completamente vacío
**VALIDACIÓN**: Total debe mostrar $0.00

---

#### PASO 2: Agregar Primer Producto (Art. 5589)

**PRODUCTO 1**: BIELAS JAPON KAWASAKI
- **Código**: 5589
- **Cantidad**: 306

**PASOS**:
1. Buscar producto: **5589**
2. Ingresar cantidad: **306**
3. Hacer clic en **"Agregar"**

**VALIDACIONES**:
- [ ] Subtotal del item: **$25,392.61**
- [ ] Total general: **$25,392.61**

---

#### PASO 3: Agregar Segundo Producto (Art. 5438)

**PRODUCTO 2**: LUBERY ACEITE SAE 20W50
- **Código**: 5438
- **Precio en BD**: 373.5318
- **Cantidad**: 10

**PASOS**:
1. Buscar producto: **5438**
2. Ingresar cantidad: **10**
3. Hacer clic en **"Agregar"**

**CÁLCULO ESPERADO**:
```
373.5318 → se redondea a 373.53
373.53 × 10 = 3,735.30
```

**VALIDACIONES**:
- [ ] Precio unitario mostrado: **$373.53** (NO $373.5318)
- [ ] Subtotal del item: **$3,735.30**

---

#### PASO 4: Agregar Tercer Producto (Art. 5633)

**PRODUCTO 3**: CABLE ACEL. SOLO 1.5M
- **Código**: 5633
- **Precio en BD**: 1.0463
- **Cantidad**: 50

**PASOS**:
1. Buscar producto: **5633**
2. Ingresar cantidad: **50**
3. Hacer clic en **"Agregar"**

**CÁLCULO ESPERADO**:
```
1.0463 → se redondea a 1.05
1.05 × 50 = 52.50
```

**VALIDACIONES**:
- [ ] Precio unitario mostrado: **$1.05** (NO $1.0463)
- [ ] Subtotal del item: **$52.50**

---

#### PASO 5: Validar Acumulación Total (VALIDACIÓN CRÍTICA)

**OBSERVAR EL CARRITO COMPLETO**:

```
┌──────────────────────────────────────────────────────────┐
│ Producto           │ Cant. │ Precio Unit. │ Subtotal    │
├──────────────────────────────────────────────────────────┤
│ BIELAS JAPON       │  306  │   $82.99     │ $25,392.61  │
│ KAWASAKI           │       │              │             │
├──────────────────────────────────────────────────────────┤
│ LUBERY ACEITE      │   10  │  $373.53     │  $3,735.30  │
│ SAE 20W50          │       │              │             │
├──────────────────────────────────────────────────────────┤
│ CABLE ACEL.        │   50  │    $1.05     │     $52.50  │
│ SOLO 1.5M          │       │              │             │
└──────────────────────────────────────────────────────────┘

TOTAL: $29,180.41
```

**CÁLCULO MANUAL**:
```
$25,392.61 + $3,735.30 + $52.50 = $29,180.41
```

**VALIDACIONES CRÍTICAS**:
- [ ] ✅ **Subtotal Item 1**: $25,392.61 (2 decimales exactos)
- [ ] ✅ **Subtotal Item 2**: $3,735.30 (2 decimales exactos)
- [ ] ✅ **Subtotal Item 3**: $52.50 (2 decimales exactos)
- [ ] ✅ **Total General**: $29,180.41 (2 decimales exactos)
- [ ] ✅ **NO debe mostrar**: $29,180.4065 o $29,180.40650000001

**📸 CAPTURA REQUERIDA**: Screenshot del carrito completo con los 3 productos

---

#### PASO 6: Validar Cálculo en Consola del Navegador

1. Abrir DevTools (F12) → Pestaña **"Console"**
2. Escribir el siguiente comando:

```javascript
// Verificar suma manual
let suma = 25392.61 + 3735.30 + 52.50;
console.log("Suma calculada:", suma);
console.log("Suma con 2 decimales:", suma.toFixed(2));
```

**RESULTADO ESPERADO**:
```
Suma calculada: 29180.41
Suma con 2 decimales: 29180.41
```

**VALIDACIONES**:
- [ ] ✅ El valor calculado manualmente coincide con el total en pantalla
- [ ] ✅ NO hay decimales adicionales

---

#### PASO 7: Validar SessionStorage con Múltiples Items

1. DevTools → **"Application"** → **"Session Storage"** → **"carrito"**

**FORMATO ESPERADO**:
```json
[
  {
    "id_articulo": 5589,
    "precio": 82.99,
    "cantidad": 306
  },
  {
    "id_articulo": 5438,
    "precio": 373.53,
    "cantidad": 10
  },
  {
    "id_articulo": 5633,
    "precio": 1.05,
    "cantidad": 50
  }
]
```

**VALIDACIONES**:
- [ ] ✅ Todos los precios tienen máximo 2 decimales
- [ ] ✅ NO hay valores como 82.99499999999999
- [ ] ✅ Los 3 items están presentes en el array

**📸 CAPTURA REQUERIDA**: Screenshot del SessionStorage completo

---

### 4.3 Resultados Esperados vs Observados

**TABLA DE VALIDACIÓN**:

| Producto | Precio Esperado | Subtotal Esperado | Precio Observado | Subtotal Observado | ✅/❌ |
|----------|-----------------|-------------------|------------------|--------------------|-------|
| Art. 5589 | $82.99 | $25,392.61 | ____________ | ____________ | [ ] |
| Art. 5438 | $373.53 | $3,735.30 | ____________ | ____________ | [ ] |
| Art. 5633 | $1.05 | $52.50 | ____________ | ____________ | [ ] |
| **TOTAL** | - | **$29,180.41** | - | ____________ | [ ] |

---

### 4.4 Criterios de Éxito del Test Case 2

**PASA ✅ SI**:
- [x] Todos los subtotales tienen exactamente 2 decimales
- [x] El total acumulado es $29,180.41
- [x] NO hay errores de acumulación (como $29,180.4065)
- [x] SessionStorage contiene precios limpios sin errores de punto flotante
- [x] NO hay errores en consola

**FALLA ❌ SI**:
- [ ] Algún subtotal tiene más de 2 decimales
- [ ] El total no es exactamente $29,180.41
- [ ] Hay diferencias entre suma manual y total mostrado
- [ ] SessionStorage tiene errores de precisión

---

### 4.5 Qué Hacer Si Este Test Falla

**SI EL TEST FALLA**:

1. **ANOTAR QUÉ VALIDACIÓN ESPECÍFICA FALLÓ**:
   - ¿Fue el subtotal de un producto específico?
   - ¿Fue la acumulación total?
   - ¿Fue SessionStorage?

2. **TOMAR CAPTURAS**:
   - Pantalla completa del carrito
   - SessionStorage
   - Consola del navegador

3. **INTENTAR REPRODUCIR**:
   - Vaciar carrito
   - Agregar productos en orden diferente
   - Verificar si el problema persiste

4. **NOTIFICAR**:
   - Si el problema es consistente: DETENER pruebas
   - Enviar documentación completa al equipo de desarrollo

---

## 5. TEST CASE 3: Cuenta Corriente

### 5.1 Información del Test

**ID del Test**: TC-003
**Prioridad**: 🟠 ALTA
**Duración Estimada**: 15 minutos
**Objetivo**: Validar que los pagos con cuenta corriente calculan correctamente el saldo

**⚠️ PREREQUISITO**: Test Case 2 debe haber PASADO exitosamente

**CONTEXTO**:
La función `sumarCuentaCorriente()` fue modificada para usar `toFixed(2)` en lugar de `toFixed(4)`. Debemos validar que el saldo de cuenta corriente se calcula correctamente.

---

### 5.2 Pasos de Ejecución Detallados

#### PASO 1: Preparar Carrito para Cuenta Corriente

1. **LIMPIAR CARRITO** (si tiene items del test anterior)
2. **AGREGAR PRODUCTOS**:

**Producto 1**:
- Código: **5589** (BIELAS JAPON KAWASAKI)
- Cantidad: **100**
- Subtotal esperado: $8,299.00

**Producto 2**:
- Código: **5633** (CABLE ACEL. SOLO 1.5M)
- Cantidad: **50**
- Subtotal esperado: $52.50

**TOTAL ESPERADO**: $8,351.50

**VALIDACIÓN INICIAL**:
- [ ] Total en carrito: **$8,351.50**

---

#### PASO 2: Seleccionar Tipo de Pago "Cuenta Corriente"

**IMPORTANTE**: Verificar que tu sistema tenga configurada la condición de venta "Cuenta Corriente" con **cod_tar = 111**

**PASOS**:
1. Buscar selector **"Tipo de Pago"** o **"Condición de Venta"**
2. Seleccionar **"Cuenta Corriente"** de la lista desplegable
3. Verificar que aparece algún indicador visual (ej: campo "Saldo" o "Deuda")

**✅ ESPERADO**: El sistema reconoce el pago como cuenta corriente
**❌ SI NO ESTÁ DISPONIBLE**: Contactar administrador para configurar cod_tar=111

---

#### PASO 3: Verificar Cálculo de Cuenta Corriente en Consola

1. Abrir DevTools (F12) → Pestaña **"Console"**
2. Ejecutar el siguiente comando (si es posible):

```javascript
// Nota: Este comando solo funciona si el componente está accesible
// Si no funciona, OMITIR este paso

// Intentar acceder a la función sumarCuentaCorriente
// (Esto puede no funcionar dependiendo de la arquitectura)
console.log("Saldo de cuenta corriente:", this.sumarCuentaCorriente());
```

**SI EL COMANDO FUNCIONA**:
- [ ] ✅ Valor retornado: **8351.50**
- [ ] ✅ **NO debe ser**: 8351.5000 o 8351.50000000001

**SI NO FUNCIONA**: Continuar con el siguiente paso (es normal)

---

#### PASO 4: Validar Saldo en Pantalla

**BUSCAR EN LA INTERFAZ**:

Dependiendo del diseño, puede aparecer como:
- "Saldo": $8,351.50
- "Deuda": $8,351.50
- "Total a Pagar": $8,351.50

**VALIDACIONES**:
- [ ] ✅ El valor mostrado tiene exactamente 2 decimales
- [ ] ✅ El valor es **$8,351.50**

**📸 CAPTURA REQUERIDA**: Screenshot mostrando el campo de saldo/deuda

---

#### PASO 5: Seleccionar Cliente

1. En el selector de **"Cliente"**, elegir un cliente de prueba
   - **RECOMENDADO**: Usar un cliente específico para pruebas, ej: "CLIENTE PRUEBA"
   - **ANOTAR** el nombre del cliente seleccionado: ________________

**✅ ESPERADO**: Cliente seleccionado correctamente

---

#### PASO 6: Confirmar Venta (GUARDADO EN BASE DE DATOS)

**⚠️ ADVERTENCIA**: Este paso GUARDA DATOS EN LA BASE DE DATOS

1. Hacer clic en **"Confirmar Venta"** / **"Finalizar"** / **"Guardar"**
2. Esperar mensaje de confirmación

**✅ ESPERADO**:
- Mensaje de éxito: "Venta realizada correctamente" (o similar)
- Carrito se vacía
- Se genera ID de factura (anotar el número): ________________

**❌ SI FALLA**:
- Capturar mensaje de error exacto
- NO continuar con validación de BD
- Notificar al equipo de desarrollo

**📸 CAPTURA REQUERIDA**: Screenshot del mensaje de confirmación

---

#### PASO 7: Validar en Base de Datos (CRÍTICO)

**QUERY 1: Verificar Campo Saldo en factcab1**

```sql
-- Ejecutar en PostgreSQL:
SELECT
    id_factcab,
    saldo,
    cod_condvta,
    basico,
    iva1,
    (basico + iva1) as total_calculado
FROM factcab1
WHERE cod_condvta = 111  -- Cuenta corriente
ORDER BY id_factcab DESC
LIMIT 1;
```

**RESULTADOS ESPERADOS**:

| Campo | Valor Esperado | Valor Observado | ✅/❌ |
|-------|----------------|-----------------|-------|
| saldo | 8351.5000 | _____________ | [ ] |
| cod_condvta | 111 | _____________ | [ ] |
| basico | ~6901.2397 | _____________ | [ ] |
| iva1 | ~1450.2603 | _____________ | [ ] |
| total_calculado | ~8351.50 | _____________ | [ ] |

**VALIDACIONES CRÍTICAS**:
- [ ] ✅ **saldo** = 8351.5000 (puede tener hasta 4 decimales por tipo NUMERIC(12,4))
- [ ] ✅ **cod_condvta** = 111 (confirma que es cuenta corriente)
- [ ] ✅ **basico + iva1** ≈ 8351.50 (diferencia máxima tolerada: ±$0.01)

**📸 CAPTURA REQUERIDA**: Screenshot del resultado de la query

---

**QUERY 2: Verificar Detalles en psucursal1**

```sql
-- Verificar que los precios se guardaron correctamente
SELECT
    id_articulo,
    cantidad,
    precio,
    (precio * cantidad) as subtotal
FROM psucursal1
WHERE id_factcab = (
    SELECT id_factcab
    FROM factcab1
    WHERE cod_condvta = 111
    ORDER BY id_factcab DESC
    LIMIT 1
)
ORDER BY id_detafactura;
```

**RESULTADOS ESPERADOS**:

| id_articulo | cantidad | precio | subtotal |
|-------------|----------|--------|----------|
| 5589 | 100 | 82.99 | 8299.00 |
| 5633 | 50 | 1.05 | 52.50 |

**VALIDACIONES**:
- [ ] ✅ Precio Art. 5589: **82.99** (redondeado de 82.9950)
- [ ] ✅ Precio Art. 5633: **1.05** (redondeado de 1.0463)
- [ ] ✅ Subtotales correctos con 2 decimales

**📸 CAPTURA REQUERIDA**: Screenshot del resultado de la query

---

### 5.3 Resultados Esperados vs Observados

**TABLA DE VALIDACIÓN**:

| Componente | Valor Esperado | Valor Observado | ✅/❌ |
|------------|----------------|-----------------|-------|
| Total en pantalla | $8,351.50 | _____________ | [ ] |
| Saldo en pantalla | $8,351.50 | _____________ | [ ] |
| BD: saldo | 8351.5000 | _____________ | [ ] |
| BD: total_calculado | ~8351.50 | _____________ | [ ] |
| BD: precio Art.5589 | 82.99 | _____________ | [ ] |
| BD: precio Art.5633 | 1.05 | _____________ | [ ] |

---

### 5.4 Criterios de Éxito del Test Case 3

**PASA ✅ SI**:
- [x] Total en pantalla = $8,351.50 (2 decimales)
- [x] Campo saldo en BD = 8351.5000
- [x] basico + iva1 = total (diferencia ≤ $0.01)
- [x] Precios en psucursal1 tienen 2 decimales
- [x] NO hay discrepancias entre pantalla y BD

**FALLA ❌ SI**:
- [ ] Hay diferencia > $0.01 entre pantalla y BD
- [ ] El saldo guardado no coincide con el total
- [ ] Los precios en psucursal1 tienen más de 2 decimales

---

### 5.5 Qué Hacer Si Este Test Falla

**SI HAY DIFERENCIAS EN SALDO**:

1. **CALCULAR LA DIFERENCIA**:
```
Diferencia = saldo_BD - total_pantalla
Ejemplo: 8351.52 - 8351.50 = $0.02
```

2. **EVALUAR TOLERANCIA**:
- Si diferencia ≤ $0.01: **ACEPTABLE** (error de redondeo de IVA)
- Si diferencia > $0.01: **FALLO CRÍTICO**

3. **SI ES FALLO CRÍTICO**:
- DETENER pruebas
- Notificar inmediatamente
- Incluir queries SQL ejecutadas y resultados

---

## 6. TEST CASE 4: Generación de PDF

### 6.1 Información del Test

**ID del Test**: TC-004
**Prioridad**: 🟠 ALTA
**Duración Estimada**: 10 minutos
**Objetivo**: Validar que los PDFs generados muestran valores profesionales (2 decimales)

**⚠️ PREREQUISITO**: Tener al menos una venta confirmada (del Test Case 3 o crear una nueva)

---

### 6.2 Pasos de Ejecución Detallados

#### PASO 1: Preparar Venta para PDF

**OPCIÓN A**: Usar la venta del Test Case 3 (si fue exitoso)

**OPCIÓN B**: Crear nueva venta rápida:
1. Agregar producto **5589** × **10** unidades
2. Seleccionar tipo de pago **Efectivo**
3. Confirmar venta
4. **Anotar ID de factura**: ________________

---

#### PASO 2: Navegar a Historial de Ventas

**PASOS**:
1. En el menú lateral, buscar **"Historial de Ventas"** o **"Consultas"**
2. Hacer clic para acceder al módulo

**✅ ESPERADO**: Lista de ventas recientes carga correctamente

---

#### PASO 3: Localizar la Venta de Prueba

**MÉTODOS PARA ENCONTRARLA**:

**Método 1: Por ID de Factura**:
- Buscar en la lista la factura con el ID anotado anteriormente

**Método 2: Por Fecha**:
- Las ventas más recientes aparecen primero
- Buscar la venta de HOY con el monto correspondiente

**Método 3: Por Cliente**:
- Si usaste un cliente de prueba específico, filtrar por nombre

**✅ ESPERADO**: Encuentras la fila de la venta de prueba

**VALIDACIÓN VISUAL** (antes de generar PDF):
```
┌────────────────────────────────────────────────────┐
│ Factura   │ Cliente        │ Fecha      │ Total   │
├────────────────────────────────────────────────────┤
│ 00012345  │ CLIENTE PRUEBA │ 06/10/2025 │ $829.90 │ ← Debe mostrar 2 decimales
└────────────────────────────────────────────────────┘
```

**VALIDACIÓN**:
- [ ] ✅ El total en la lista muestra 2 decimales

---

#### PASO 4: Generar PDF

**PASOS**:
1. Localizar botón de **"Imprimir"** / **"PDF"** / **Ícono de impresora** en la fila de la venta
2. Hacer clic en el botón

**✅ ESPERADO**:
- Se descarga archivo PDF o se abre en nueva pestaña
- Nombre del archivo: `factura_XXXXX.pdf` (o similar)

**❌ SI FALLA**:
- Capturar mensaje de error
- Verificar consola del navegador (F12)
- Notificar equipo de desarrollo

---

#### PASO 5: Abrir y Validar PDF (VALIDACIÓN CRÍTICA)

**ABRIR EL PDF** con un visor (Adobe Reader, Chrome, etc.)

**VALIDACIONES VISUALES**:

**Sección 1: Encabezado del PDF**
```
┌─────────────────────────────────────┐
│         NOMBRE DE LA EMPRESA        │
│         Dirección, Teléfono         │
│                                     │
│ FACTURA Nº: 00012345                │
│ Fecha: 06/10/2025                   │
└─────────────────────────────────────┘
```
- [ ] ✅ Información legible y correcta

---

**Sección 2: Tabla de Productos (CRÍTICA)**

```
┌───────────────────────────────────────────────────────────┐
│ Cant. │ Descripción              │ Precio Unit. │ Subtotal│
├───────────────────────────────────────────────────────────┤
│  10   │ BIELAS JAPON KAWASAKI   │    82.99     │  829.90 │
│       │                          │              │         │
└───────────────────────────────────────────────────────────┘
```

**VALIDACIONES DETALLADAS**:
- [ ] ✅ **Precio Unitario**: Muestra **82.99** (2 decimales exactos)
- [ ] ✅ **NO muestra**: 82.9950 o 82.99499999999999
- [ ] ✅ **Subtotal**: Muestra **829.90** (2 decimales exactos)
- [ ] ✅ **NO muestra**: 829.9000 o 829.90000000001

**📸 CAPTURA REQUERIDA**: Screenshot de la tabla de productos en el PDF

---

**Sección 3: Total Final (CRÍTICA)**

```
┌─────────────────────────┐
│                         │
│  TOTAL $829.90          │
│                         │
└─────────────────────────┘
```

**VALIDACIONES**:
- [ ] ✅ **Total**: Muestra **$829.90** (2 decimales exactos)
- [ ] ✅ **NO muestra**: $829.9000 o $829.90000000001
- [ ] ✅ **Formato profesional**: Valor alineado, fuente legible

**📸 CAPTURA REQUERIDA**: Screenshot del total en el PDF

---

**Sección 4: Información Tributaria** (si aplica)

Si el PDF muestra desglose de IVA:

```
Subtotal: $685.62
IVA (21%): $144.28
─────────────────
TOTAL: $829.90
```

**VALIDACIONES**:
- [ ] ✅ Todos los valores tienen 2 decimales
- [ ] ✅ Subtotal + IVA = TOTAL (diferencia ≤ $0.01)

---

#### PASO 6: Validar Aspecto Profesional General

**CRITERIOS DE PROFESIONALISMO**:

- [ ] ✅ **Legibilidad**: Todos los números son fáciles de leer
- [ ] ✅ **Formato consistente**: Todos los montos con 2 decimales
- [ ] ✅ **Alineación**: Columnas numéricas alineadas a la derecha
- [ ] ✅ **Sin valores "raros"**: NO aparecen decimales excesivos tipo 0.608500000002

**COMPARACIÓN**:

**❌ ANTES (MALO)**:
```
Precio: 82.99499999999999
Subtotal: 829.9450000000001
TOTAL $829.945
```

**✅ DESPUÉS (BUENO)**:
```
Precio: 82.99
Subtotal: 829.90
TOTAL $829.90
```

---

#### PASO 7: Probar con Venta de Múltiples Productos

**CREAR NUEVA VENTA**:
1. Agregar 3 productos diferentes (usar Test Case 2 como referencia)
2. Confirmar venta
3. Generar PDF

**VALIDACIONES ADICIONALES**:
- [ ] ✅ Todos los items en la tabla tienen 2 decimales
- [ ] ✅ La suma de subtotales coincide con el total
- [ ] ✅ No hay inconsistencias visuales

**📸 CAPTURA REQUERIDA**: Screenshot del PDF con múltiples productos

---

### 6.3 Resultados Esperados vs Observados

**TABLA DE VALIDACIÓN**:

| Componente PDF | Valor Esperado | Valor Observado | ✅/❌ |
|----------------|----------------|-----------------|-------|
| Precio unitario | 82.99 | _____________ | [ ] |
| Subtotal item | 829.90 | _____________ | [ ] |
| Total final | $829.90 | _____________ | [ ] |
| Formato profesional | Sí (2 decimales) | _____________ | [ ] |
| Desglose IVA (si aplica) | Valores con 2 decimales | _____________ | [ ] |

---

### 6.4 Criterios de Éxito del Test Case 4

**PASA ✅ SI**:
- [x] Todos los precios en el PDF tienen exactamente 2 decimales
- [x] El total final tiene 2 decimales
- [x] El PDF tiene aspecto profesional y legible
- [x] NO aparecen valores con decimales excesivos
- [x] La generación del PDF no produce errores

**FALLA ❌ SI**:
- [ ] Cualquier valor en el PDF tiene más de 2 decimales
- [ ] El PDF muestra valores como 82.9950 o 829.9450000001
- [ ] Hay errores al generar el PDF
- [ ] El formato es inconsistente

---

### 6.5 Qué Hacer Si Este Test Falla

**SI EL PDF MUESTRA MÁS DE 2 DECIMALES**:

1. **VERIFICAR ESPECÍFICAMENTE**:
   - ¿Es el precio unitario?
   - ¿Es el subtotal?
   - ¿Es el total?
   - ¿Todos los valores o solo algunos?

2. **CAPTURAR EVIDENCIA**:
   - Guardar el PDF completo
   - Screenshot de la sección problemática
   - Anotar valores exactos observados

3. **COMPARAR CON PANTALLA**:
   - Verificar si el error también estaba en pantalla
   - Si en pantalla mostraba 2 decimales pero PDF no: **FALLO ESPECÍFICO DE PDF**

4. **NOTIFICAR**:
   - Enviar PDF completo
   - Especificar línea del código afectada (probablemente línea 775 o 914 de carrito.component.ts)

---

## 7. TEST CASE 5: Pruebas de Regresión

### 7.1 Información del Test

**ID del Test**: TC-005
**Prioridad**: 🟢 MEDIA
**Duración Estimada**: 30 minutos
**Objetivo**: Verificar que las modificaciones NO rompieron funcionalidades existentes

**⚠️ NOTA**: Este test valida que el sistema sigue funcionando normalmente en aspectos NO relacionados con decimales

---

### 7.2 Área 1: Autenticación y Permisos

#### TEST 5.1: Login y Logout

**PASOS**:
1. **Cerrar sesión** (hacer logout)
2. **Volver a ingresar** con credenciales correctas
3. **Intentar login con credenciales incorrectas**

**VALIDACIONES**:
- [ ] ✅ Logout funciona correctamente
- [ ] ✅ Login con credenciales correctas permite acceso
- [ ] ✅ Login con credenciales incorrectas muestra error apropiado
- [ ] ✅ NO hay errores en consola relacionados con `currencyFormat`

---

#### TEST 5.2: Roles de Usuario (si aplica)

Si tienes múltiples roles (SUPER, ADMIN, USER):

**PASOS**:
1. Login con usuario de rol **USER**
2. Verificar que SOLO ve opciones permitidas para su rol

**VALIDACIONES**:
- [ ] ✅ Restricciones de rol funcionan correctamente
- [ ] ✅ Menú muestra opciones apropiadas

---

### 7.3 Área 2: Gestión de Productos

#### TEST 5.3: Búsqueda de Productos

**PASOS**:
1. Ir a **Punto de Venta**
2. **Buscar por código**: Ingresar **5589**
3. **Buscar por nombre**: Ingresar **"BIELAS"**
4. **Buscar producto inexistente**: Ingresar **99999999**

**VALIDACIONES**:
- [ ] ✅ Búsqueda por código funciona
- [ ] ✅ Búsqueda por nombre funciona
- [ ] ✅ Búsqueda de producto inexistente muestra mensaje apropiado
- [ ] ✅ Los precios mostrados tienen 2 decimales

---

#### TEST 5.4: Visualización de Stock

**PASOS**:
1. Buscar producto **5589**
2. Verificar que se muestra el stock disponible

**VALIDACIONES**:
- [ ] ✅ Stock se muestra correctamente
- [ ] ✅ Si stock = 0, se muestra indicador apropiado

---

### 7.4 Área 3: Operaciones de Carrito

#### TEST 5.5: Agregar y Eliminar Items

**PASOS**:
1. **Agregar** producto al carrito
2. **Modificar cantidad** del producto en el carrito
3. **Eliminar** producto del carrito
4. **Vaciar carrito completo**

**VALIDACIONES**:
- [ ] ✅ Agregar item funciona correctamente
- [ ] ✅ Modificar cantidad recalcula subtotal con 2 decimales
- [ ] ✅ Eliminar item funciona
- [ ] ✅ Vaciar carrito limpia todo correctamente
- [ ] ✅ Total se actualiza en cada operación

---

#### TEST 5.6: Validación de Stock Insuficiente

**PASOS**:
1. Buscar producto con stock = 50 (ejemplo)
2. Intentar agregar cantidad = 1000

**VALIDACIONES**:
- [ ] ✅ Sistema muestra alerta de stock insuficiente
- [ ] ✅ NO permite agregar más del stock disponible

---

### 7.5 Área 4: Tipos de Pago

#### TEST 5.7: Pago en Efectivo

**PASOS**:
1. Agregar producto al carrito
2. Seleccionar **Tipo de Pago: Efectivo**
3. Confirmar venta

**VALIDACIONES**:
- [ ] ✅ Venta se registra correctamente
- [ ] ✅ Stock se descuenta
- [ ] ✅ Total tiene 2 decimales

---

#### TEST 5.8: Pago con Tarjeta (si aplica)

**PASOS**:
1. Agregar producto al carrito
2. Seleccionar **Tipo de Pago: Tarjeta de Crédito/Débito**
3. Confirmar venta

**VALIDACIONES**:
- [ ] ✅ Venta se registra correctamente
- [ ] ✅ Se guarda el tipo de tarjeta correctamente

---

#### TEST 5.9: Pago Mixto (si aplica)

Si el sistema permite pagos combinados (ej: 50% efectivo + 50% tarjeta):

**PASOS**:
1. Crear venta con total = $1,000
2. Pagar $500 en efectivo + $500 en tarjeta
3. Confirmar venta

**VALIDACIONES**:
- [ ] ✅ Sistema acepta pago mixto
- [ ] ✅ Ambos montos se registran correctamente con 2 decimales

---

### 7.6 Área 5: Consultas e Historial

#### TEST 5.10: Consultar Historial de Ventas

**PASOS**:
1. Ir a **Historial de Ventas**
2. Filtrar por **Fecha** (hoy)
3. Filtrar por **Cliente**
4. Buscar por **Número de Factura**

**VALIDACIONES**:
- [ ] ✅ Todos los filtros funcionan correctamente
- [ ] ✅ Los totales en la lista tienen 2 decimales
- [ ] ✅ Datos coinciden con ventas realizadas

---

#### TEST 5.11: Consultar Detalle de Venta

**PASOS**:
1. En historial, hacer clic en una venta
2. Ver detalle completo de la venta

**VALIDACIONES**:
- [ ] ✅ Detalle se muestra correctamente
- [ ] ✅ Precios y totales tienen 2 decimales
- [ ] ✅ Todos los items aparecen

---

### 7.7 Área 6: Reportes (si aplica)

#### TEST 5.12: Generar Reporte de Ventas

**PASOS**:
1. Ir a módulo de **Reportes**
2. Seleccionar **Reporte de Ventas del Día**
3. Generar reporte

**VALIDACIONES**:
- [ ] ✅ Reporte se genera sin errores
- [ ] ✅ Totales tienen 2 decimales
- [ ] ✅ Cifras coinciden con ventas realizadas

---

### 7.8 Área 7: Operaciones Especiales

#### TEST 5.13: Generar Presupuesto (Tipo CS)

**PASOS**:
1. Agregar producto al carrito
2. Seleccionar **Tipo: Consulta/Presupuesto** (CS)
3. Confirmar

**VALIDACIONES**:
- [ ] ✅ Presupuesto se genera correctamente
- [ ] ✅ Stock NO se descuenta
- [ ] ✅ PDF se genera con 2 decimales
- [ ] ✅ Registro en BD con tipo='CS'

---

#### TEST 5.14: Modificar Venta Existente (si aplica)

Si el sistema permite anular o modificar ventas:

**PASOS**:
1. Buscar venta reciente
2. Intentar anular o modificar

**VALIDACIONES**:
- [ ] ✅ Funcionalidad funciona como antes
- [ ] ✅ NO hay errores relacionados con decimales

---

### 7.9 Resultados de Regresión

**RESUMEN DE FUNCIONALIDADES VALIDADAS**:

| Funcionalidad | ✅ Funciona | ❌ Falla | Observaciones |
|---------------|-------------|----------|---------------|
| Login/Logout | [ ] | [ ] | _________________ |
| Búsqueda de productos | [ ] | [ ] | _________________ |
| Agregar al carrito | [ ] | [ ] | _________________ |
| Eliminar del carrito | [ ] | [ ] | _________________ |
| Pago efectivo | [ ] | [ ] | _________________ |
| Pago tarjeta | [ ] | [ ] | _________________ |
| Cuenta corriente | [ ] | [ ] | _________________ |
| Generación PDF | [ ] | [ ] | _________________ |
| Historial ventas | [ ] | [ ] | _________________ |
| Reportes | [ ] | [ ] | _________________ |
| Presupuestos (CS) | [ ] | [ ] | _________________ |

---

### 7.10 Criterios de Éxito del Test Case 5

**PASA ✅ SI**:
- [x] TODAS las funcionalidades existentes siguen funcionando
- [x] NO hay errores nuevos en consola del navegador
- [x] NO hay comportamientos inesperados
- [x] Los valores monetarios SIEMPRE tienen 2 decimales
- [x] Las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) funcionan

**FALLA ❌ SI**:
- [ ] Alguna funcionalidad que antes funcionaba ahora falla
- [ ] Hay errores en consola que antes no existían
- [ ] Algún módulo no carga correctamente
- [ ] Hay pérdida de funcionalidad

---

### 7.11 Qué Hacer Si Hay Fallos de Regresión

**SI ALGUNA FUNCIONALIDAD SE ROMPIÓ**:

1. **IDENTIFICAR EL ALCANCE**:
   - ¿Es un error aislado o afecta múltiples áreas?
   - ¿Está relacionado con el pipe `currencyFormat`?
   - ¿Afecta cálculos o solo visualización?

2. **DOCUMENTAR DETALLADAMENTE**:
   - Funcionalidad específica que falló
   - Pasos exactos para reproducir
   - Comportamiento esperado vs observado
   - Screenshots o videos

3. **PRIORIZAR**:
   - **CRÍTICO**: Funcionalidad esencial (login, ventas, pagos) → DETENER pruebas
   - **MEDIO**: Funcionalidad secundaria (reportes, consultas) → Continuar y reportar
   - **BAJO**: Aspecto visual menor → Anotar y continuar

4. **NOTIFICAR**:
   - Enviar informe completo al equipo de desarrollo
   - Especificar si es BLOQUEANTE o no

---

## 8. VALIDACIÓN DE BASE DE DATOS

### 8.1 Información General

**Objetivo**: Verificar que los datos guardados en PostgreSQL son correctos y consistentes con lo mostrado en pantalla.

**⚠️ PREREQUISITO**: Acceso a PostgreSQL con permisos de lectura

**Herramientas Sugeridas**:
- DBeaver
- pgAdmin
- psql (línea de comandos)

---

### 8.2 Conexión a Base de Datos

**PASO 1: Conectar a PostgreSQL**

```bash
# Ejemplo con psql (ajustar según tu configuración):
psql -h localhost -U postgres -d motoapp
```

**O usar cliente gráfico** (DBeaver, pgAdmin)

**✅ ESPERADO**: Conexión exitosa a la base de datos

---

### 8.3 Queries de Validación Críticas

#### QUERY 1: Última Venta Registrada

```sql
-- Obtener la última factura completa con cálculos
SELECT
    fc.id_factcab,
    fc.num_factura,
    fc.basico,
    fc.iva1,
    (fc.basico + fc.iva1) AS total_calculado,
    fc.saldo,
    fc.cod_condvta,
    fc.fecha,
    cl.nombrecliente
FROM factcab1 fc
LEFT JOIN clientes cl ON fc.id_cliente = cl.id_cliente
ORDER BY fc.id_factcab DESC
LIMIT 1;
```

**VALIDACIONES**:
- [ ] ✅ **basico + iva1** = total mostrado en pantalla (diferencia ≤ $0.01)
- [ ] ✅ **saldo** (si es cuenta corriente) = total (diferencia ≤ $0.01)
- [ ] ✅ **fecha** = fecha de hoy

**Resultado Esperado Ejemplo**:
```
id_factcab | num_factura | basico      | iva1       | total_calculado | saldo       | cod_condvta
-----------+-------------+-------------+------------+-----------------+-------------+-------------
12345      | 00012345    | 685.6198    | 144.2802   | 829.90          | 0.0000      | 1
```

**📸 CAPTURA REQUERIDA**: Screenshot del resultado de la query

---

#### QUERY 2: Detalles de la Última Venta

```sql
-- Obtener items de la última venta
SELECT
    ps.id_detafactura,
    ps.id_articulo,
    art.nomart,
    ps.cantidad,
    ps.precio,
    (ps.cantidad * ps.precio) AS subtotal_calculado
FROM psucursal1 ps
LEFT JOIN artsucursal art ON ps.id_articulo = art.id_articulo
WHERE ps.id_factcab = (
    SELECT id_factcab FROM factcab1 ORDER BY id_factcab DESC LIMIT 1
)
ORDER BY ps.id_detafactura;
```

**VALIDACIONES**:
- [ ] ✅ Todos los **precios** tienen máximo 2 decimales (ej: 82.99, NO 82.9950)
- [ ] ✅ **subtotal_calculado** = cantidad × precio con 2 decimales
- [ ] ✅ Suma de todos los subtotales = total de la factura

**Resultado Esperado Ejemplo**:
```
id_articulo | nomart                  | cantidad | precio | subtotal_calculado
------------+-------------------------+----------+--------+--------------------
5589        | BIELAS JAPON KAWASAKI  | 10       | 82.99  | 829.90
```

**📸 CAPTURA REQUERIDA**: Screenshot del resultado de la query

---

#### QUERY 3: Verificar Consistencia de IVA

```sql
-- Verificar que el IVA se calculó correctamente
SELECT
    id_factcab,
    basico,
    iva1,
    (basico + iva1) AS total,
    -- Recalcular IVA manualmente para verificar
    ROUND((basico + iva1), 2) AS total_redondeado,
    ROUND(((basico + iva1) / 1.21), 4) AS basico_recalculado,
    ROUND(((basico + iva1) - ((basico + iva1) / 1.21)), 4) AS iva_recalculado
FROM factcab1
ORDER BY id_factcab DESC
LIMIT 5;
```

**VALIDACIONES**:
- [ ] ✅ **basico_recalculado** ≈ basico (diferencia ≤ $0.01)
- [ ] ✅ **iva_recalculado** ≈ iva1 (diferencia ≤ $0.01)
- [ ] ✅ NO hay diferencias significativas entre valor guardado y recalculado

**📝 NOTA**: Puede haber diferencias microscópicas ($0.0001) debido a redondeo. Esto es ACEPTABLE.

---

#### QUERY 4: Verificar Movimientos de Caja

```sql
-- Obtener últimos movimientos de caja
SELECT
    id_movi,
    importe_mov,
    tipo_movi,
    fecha_mov,
    id_factcab
FROM caja_movi
WHERE fecha_mov = CURRENT_DATE
ORDER BY id_movi DESC
LIMIT 10;
```

**VALIDACIONES**:
- [ ] ✅ **importe_mov** tiene máximo 2 decimales
- [ ] ✅ El importe coincide con el total de la factura referenciada
- [ ] ✅ **tipo_movi** es correcto (ej: 'I' para ingreso, 'E' para egreso)

---

#### QUERY 5: Comparación Antes/Después (Stock)

```sql
-- Verificar que el stock se descontó correctamente
-- (Solo aplica si la venta NO fue tipo CS - Consulta)
SELECT
    id_articulo,
    nomart,
    stock
FROM artsucursal
WHERE id_articulo IN (5589, 5438, 5633);
```

**VALIDACIONES**:
- [ ] ✅ Stock se descontó correctamente (comparar con valor antes de las pruebas)
- [ ] ✅ Si fue venta tipo CS (Consulta): stock NO debe haber cambiado

**📝 NOTA**: Anotar valores de stock ANTES de las pruebas para poder comparar

---

#### QUERY 6: Integridad Referencial

```sql
-- Verificar que NO hay registros huérfanos
SELECT
    ps.id_detafactura,
    ps.id_factcab,
    fc.id_factcab AS factcab_existe
FROM psucursal1 ps
LEFT JOIN factcab1 fc ON ps.id_factcab = fc.id_factcab
WHERE fc.id_factcab IS NULL
LIMIT 10;
```

**VALIDACIONES**:
- [ ] ✅ La query NO debe retornar filas
- [ ] ✅ Si retorna filas: HAY DATOS HUÉRFANOS (reportar como ERROR CRÍTICO)

---

### 8.4 Validaciones de Datos Históricos

#### QUERY 7: Comparar Ventas de Hoy vs Histórico

```sql
-- Comparar formato de decimales en ventas de hoy vs ventas antiguas
SELECT
    DATE(fecha) AS fecha_venta,
    COUNT(*) AS cantidad_ventas,
    AVG(basico + iva1) AS promedio_venta,
    MIN(basico + iva1) AS venta_minima,
    MAX(basico + iva1) AS venta_maxima
FROM factcab1
WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(fecha)
ORDER BY fecha_venta DESC;
```

**VALIDACIONES**:
- [ ] ✅ Ventas de HOY tienen formato similar a ventas históricas
- [ ] ✅ NO hay outliers o valores anormales
- [ ] ✅ Promedios están dentro de rangos históricos

---

### 8.5 Tabla Resumen de Validaciones de BD

| Query | Objetivo | Resultado | ✅/❌ |
|-------|----------|-----------|-------|
| Query 1 | Última venta completa | basico+iva1 = total | [ ] |
| Query 2 | Detalles con 2 decimales | Precios correctos | [ ] |
| Query 3 | Consistencia IVA | Diferencia ≤ $0.01 | [ ] |
| Query 4 | Movimientos de caja | Importes con 2 decimales | [ ] |
| Query 5 | Descuento de stock | Stock correcto | [ ] |
| Query 6 | Integridad referencial | Sin huérfanos | [ ] |
| Query 7 | Comparación histórica | Sin outliers | [ ] |

---

### 8.6 Criterios de Éxito de Validación BD

**PASA ✅ SI**:
- [x] Todos los precios en psucursal1 tienen máximo 2 decimales
- [x] basico + iva1 = total (diferencia ≤ $0.01)
- [x] Movimientos de caja tienen importes correctos
- [x] NO hay registros huérfanos
- [x] Stock se descontó correctamente (si aplica)
- [x] Datos de hoy son consistentes con histórico

**FALLA ❌ SI**:
- [ ] Hay precios con más de 2 decimales en la BD
- [ ] Diferencia basico+iva1 vs total > $0.01
- [ ] Hay registros huérfanos (integridad referencial rota)
- [ ] Stock no se descontó (cuando debería)
- [ ] Hay outliers o valores anormales

---

### 8.7 Qué Hacer Si Fallan Validaciones de BD

**SI HAY INCONSISTENCIAS EN BASE DE DATOS**:

1. **CRITICIDAD ALTA** (DETENER PRUEBAS):
   - Diferencias > $0.01 en cálculos de IVA
   - Registros huérfanos (integridad referencial rota)
   - Precios con más de 2 decimales guardados en BD

2. **CRITICIDAD MEDIA** (CONTINUAR PERO REPORTAR):
   - Diferencias microscópicas ($0.001) en IVA
   - Inconsistencias menores en datos históricos

3. **DOCUMENTAR**:
   - Exportar resultado de queries problemáticas a CSV
   - Capturar screenshots
   - Anotar valores exactos esperados vs observados

4. **ROLLBACK** (si es crítico):
   - Restaurar backup de base de datos
   - Contactar equipo de desarrollo antes de continuar

---

## 9. CRITERIOS DE ACEPTACIÓN

### 9.1 Criterios Funcionales

**VISUALIZACIÓN** ✅ **ACEPTADO** SI:
- [x] **100%** de los valores monetarios en pantalla muestran exactamente 2 decimales
- [x] **0** instancias de valores como $25,392.608500000002
- [x] **Formato consistente** en toda la aplicación (carrito, historial, reportes)

**CÁLCULOS** ✅ **ACEPTADO** SI:
- [x] **IVA calculado correctamente** (basico + iva1 = total ± $0.01)
- [x] **Cuenta corriente precisa** (saldo = total ± $0.01)
- [x] **Acumulación sin errores** (suma de items = total exacto)

**BASE DE DATOS** ✅ **ACEPTADO** SI:
- [x] **Precios guardados** con máximo 2 decimales efectivos
- [x] **Integridad referencial** mantenida (0 registros huérfanos)
- [x] **Consistencia** entre pantalla, PDF y BD (diferencia ≤ $0.01)

**PDF** ✅ **ACEPTADO** SI:
- [x] **Todos los valores** tienen exactamente 2 decimales
- [x] **Aspecto profesional** (sin "números raros")
- [x] **Totales correctos** y legibles

---

### 9.2 Criterios de Regresión

**FUNCIONALIDADES EXISTENTES** ✅ **ACEPTADO** SI:
- [x] **Login/Logout** funcionan sin errores
- [x] **Búsqueda de productos** funciona normalmente
- [x] **Operaciones de carrito** (agregar, eliminar, modificar) funcionan
- [x] **Tipos de pago** (efectivo, tarjeta, cuenta corriente) funcionan
- [x] **Historial y reportes** funcionan correctamente
- [x] **0 funcionalidades rotas** por los cambios

---

### 9.3 Criterios Técnicos

**CÓDIGO** ✅ **ACEPTADO** SI:
- [x] **0 errores** en consola del navegador
- [x] **Pipe registrado correctamente** en app.module.ts
- [x] **SessionStorage limpio** (valores con 2 decimales)
- [x] **Compilación exitosa** sin warnings críticos

**PERFORMANCE** ✅ **ACEPTADO** SI:
- [x] **Tiempo de carga** NO aumentó significativamente (≤ 10%)
- [x] **Cálculos rápidos** (total se actualiza instantáneamente)
- [x] **Generación de PDF** ≤ 5 segundos

---

### 9.4 Criterios de Negocio

**AUDITORÍA** ✅ **ACEPTADO** SI:
- [x] **Valores tributarios correctos** (IVA preciso)
- [x] **Cuadre de caja** sin diferencias (± $0.01 por factura)
- [x] **Trazabilidad** mantenida (todos los movimientos registrados)
- [x] **Compliance fiscal** cumplido (valores redondeados según normativa)

**EXPERIENCIA DE USUARIO** ✅ **ACEPTADO** SI:
- [x] **Interfaz profesional** (sin valores "raros")
- [x] **PDFs presentables** a clientes
- [x] **Consistencia visual** en toda la aplicación
- [x] **Sin quejas** de operadores de caja

---

### 9.5 Matriz de Aceptación Global

| Categoría | Criterio | Peso | Estado | Observaciones |
|-----------|----------|------|--------|---------------|
| **VISUALIZACIÓN** | Pantalla con 2 decimales | 20% | [ ] ✅ [ ] ❌ | _____________ |
| **CÁLCULOS** | IVA preciso (±$0.01) | 25% | [ ] ✅ [ ] ❌ | _____________ |
| **BASE DE DATOS** | Datos correctos | 20% | [ ] ✅ [ ] ❌ | _____________ |
| **PDF** | Formato profesional | 15% | [ ] ✅ [ ] ❌ | _____________ |
| **REGRESIÓN** | Funcionalidades intactas | 15% | [ ] ✅ [ ] ❌ | _____________ |
| **PERFORMANCE** | Sin degradación | 5% | [ ] ✅ [ ] ❌ | _____________ |

**TOTAL**: ____% aprobado

---

### 9.6 Decisión Final de Aceptación

**APROBADO PARA PRODUCCIÓN** ✅ SI:
- [x] **TODOS** los criterios críticos (Visualización, Cálculos, BD, PDF) pasan
- [x] **≥ 95%** de los criterios de regresión pasan
- [x] **0 errores** de BLOCKER o CRÍTICO sin resolver

**APROBADO CON CONDICIONES** ⚠️ SI:
- [x] **≥ 90%** de los criterios críticos pasan
- [x] Hay errores MENORES documentados y con plan de corrección
- [x] Equipo de negocio aprueba desplegar con issues conocidos

**RECHAZADO** ❌ SI:
- [ ] Algún criterio CRÍTICO falla (IVA incorrecto, BD inconsistente)
- [ ] **> 1** funcionalidad importante rota (regresión)
- [ ] Diferencias > $0.05 en cálculos tributarios
- [ ] PDFs no profesionales (decimales excesivos visibles)

---

### 9.7 Plan de Acción según Resultado

**SI APROBADO ✅**:
1. Completar Checklist Final de Aprobación (Sección 10)
2. Obtener firmas de:
   - Tester / QA
   - Product Owner / Gerente
   - Contador (validación tributaria)
3. Proceder con deployment a producción
4. Implementar monitoreo post-deploy (primeras 24h)

**SI APROBADO CON CONDICIONES ⚠️**:
1. Documentar TODOS los issues conocidos
2. Crear plan de mitigación para cada issue
3. Obtener aprobación explícita de stakeholders
4. Desplegar con monitoreo intensivo
5. Planificar hotfix para issues conocidos

**SI RECHAZADO ❌**:
1. Generar reporte detallado de fallos
2. Priorizar issues por criticidad
3. Devolver a desarrollo para correcciones
4. RE-EJECUTAR todas las pruebas después de correcciones
5. NO desplegar hasta que TODOS los criterios críticos pasen

---

## 10. CHECKLIST FINAL DE APROBACIÓN

### 10.1 Validación Técnica

**IMPLEMENTACIÓN**:
- [ ] ✅ Pipe `currencyFormat` creado correctamente
- [ ] ✅ Pipe registrado en `app.module.ts`
- [ ] ✅ HTML modificado con pipe aplicado (líneas 37 y 49)
- [ ] ✅ Cálculos internos modificados (toFixed(4) → toFixed(2))
- [ ] ✅ Cálculo de IVA con redondeo previo implementado
- [ ] ✅ PDF con formateo correcto (líneas 778 y 914)
- [ ] ✅ Aplicación compila sin errores

---

### 10.2 Validación Funcional

**TEST CASES**:
- [ ] ✅ Test Case 1: Producto Individual PASADO
- [ ] ✅ Test Case 2: Múltiples Productos PASADO
- [ ] ✅ Test Case 3: Cuenta Corriente PASADO
- [ ] ✅ Test Case 4: Generación de PDF PASADO
- [ ] ✅ Test Case 5: Regresión PASADO (≥95% funcionalidades OK)

**VALIDACIONES CRÍTICAS**:
- [ ] ✅ Pantalla muestra valores con 2 decimales (100% de los casos)
- [ ] ✅ PDF profesional con 2 decimales
- [ ] ✅ Base de datos con valores correctos
- [ ] ✅ IVA calculado correctamente (diferencia ≤ $0.01)
- [ ] ✅ SessionStorage con valores limpios

---

### 10.3 Validación de Base de Datos

**INTEGRIDAD**:
- [ ] ✅ Query 1: Última venta con totales correctos
- [ ] ✅ Query 2: Detalles con precios de 2 decimales
- [ ] ✅ Query 3: Consistencia de IVA verificada
- [ ] ✅ Query 4: Movimientos de caja correctos
- [ ] ✅ Query 5: Stock descontado correctamente (si aplica)
- [ ] ✅ Query 6: Sin registros huérfanos (integridad referencial OK)
- [ ] ✅ Query 7: Consistencia con datos históricos

---

### 10.4 Validación de Regresión

**FUNCIONALIDADES CORE**:
- [ ] ✅ Login y autenticación funcionan
- [ ] ✅ Búsqueda de productos funciona
- [ ] ✅ Carrito (agregar/eliminar) funciona
- [ ] ✅ Tipos de pago funcionan (efectivo, tarjeta, cuenta corriente)
- [ ] ✅ Historial de ventas funciona
- [ ] ✅ Reportes funcionan (si aplica)
- [ ] ✅ Presupuestos (tipo CS) funcionan (si aplica)

---

### 10.5 Documentación de Evidencias

**CAPTURAS DE PANTALLA REQUERIDAS** (adjuntar):
- [ ] 📸 Test Case 1: Carrito con producto 5589
- [ ] 📸 Test Case 1: SessionStorage con precio 82.99
- [ ] 📸 Test Case 2: Carrito con 3 productos
- [ ] 📸 Test Case 3: Cuenta corriente con saldo visible
- [ ] 📸 Test Case 4: PDF generado (tabla de productos)
- [ ] 📸 Test Case 4: PDF generado (total)
- [ ] 📸 Query BD: Última venta completa
- [ ] 📸 Query BD: Detalles de productos

**ARCHIVOS ADJUNTOS**:
- [ ] 📄 PDF de muestra generado (guardar como `factura_muestra_TC004.pdf`)
- [ ] 📄 Exportación de queries de BD a CSV (si es posible)
- [ ] 📄 Log de consola del navegador (si hubo warnings)

---

### 10.6 Aprobaciones Necesarias

**APROBACIÓN TÉCNICA**:
- [ ] ✅ **Tester/QA**: _________________________ (Firma/Fecha)
- [ ] ✅ **Desarrollador**: _________________________ (Firma/Fecha)
- [ ] ✅ **Arquitecto de Software** (si aplica): _________________________ (Firma/Fecha)

**APROBACIÓN DE NEGOCIO**:
- [ ] ✅ **Product Owner**: _________________________ (Firma/Fecha)
- [ ] ✅ **Gerente/Administrador**: _________________________ (Firma/Fecha)
- [ ] ✅ **Contador/Auditor** (validación tributaria): _________________________ (Firma/Fecha)

**APROBACIÓN DE OPERACIONES**:
- [ ] ✅ **Operador de Caja** (usuario final): _________________________ (Firma/Fecha)

---

### 10.7 Plan de Deployment

**PRE-DEPLOYMENT**:
- [ ] ✅ Backup completo de base de datos realizado
- [ ] ✅ Backup de código fuente (Git commit ID: _______________)
- [ ] ✅ Plan de rollback documentado
- [ ] ✅ Horario de deployment definido: _________________________ (fecha/hora)
- [ ] ✅ Equipo de soporte alertado y disponible

**DEPLOYMENT**:
- [ ] ✅ Despliegue realizado en horario de baja demanda
- [ ] ✅ Servidor reiniciado correctamente
- [ ] ✅ Aplicación accesible post-deployment

**POST-DEPLOYMENT** (primeras 24 horas):
- [ ] ✅ Monitoreo de primeras 10 ventas (validar manualmente)
- [ ] ✅ Revisión de logs del servidor cada 2 horas
- [ ] ✅ Validación de cuadre de caja al cierre del día
- [ ] ✅ Feedback de operadores de caja recolectado

---

### 10.8 Criterios de Rollback

**EJECUTAR ROLLBACK INMEDIATO SI**:
- [ ] ❌ **> 5% de las ventas** tienen errores de cálculo
- [ ] ❌ **Cuadre de caja** tiene diferencias > $10 pesos
- [ ] ❌ **Errores críticos** en consola/logs que bloquean operaciones
- [ ] ❌ **Quejas de clientes** por PDFs con valores "raros"
- [ ] ❌ **Cualquier funcionalidad core** deja de funcionar

**PROCEDIMIENTO DE ROLLBACK**:
1. Detener servidor de aplicación
2. Restaurar código fuente desde Git commit anterior: ______________
3. Restaurar base de datos desde backup
4. Reiniciar servidor
5. Validar que sistema funciona como antes
6. Notificar a stakeholders
7. Programar nueva ventana de deployment después de correcciones

---

### 10.9 Métricas de Éxito Post-Deployment

**SEMANA 1**:
- [ ] ✅ **0 quejas** de operadores sobre decimales
- [ ] ✅ **100% de PDFs** generados con formato profesional
- [ ] ✅ **Cuadre de caja diario** sin diferencias > $0.50
- [ ] ✅ **0 rollbacks** necesarios

**MES 1**:
- [ ] ✅ **Satisfacción de usuario** ≥ 90% (encuesta interna)
- [ ] ✅ **Reportes contables** cuadran correctamente
- [ ] ✅ **Auditoría tributaria** sin observaciones

---

### 10.10 Declaración Final

**YO, _________________________ (NOMBRE DEL TESTER/QA), DECLARO QUE**:

- [x] He ejecutado TODOS los casos de prueba especificados en este documento
- [x] He validado TODOS los criterios de aceptación
- [x] He documentado TODOS los hallazgos con evidencias
- [x] He verificado que la implementación cumple con los objetivos del proyecto
- [x] He confirmado que NO hay issues BLOQUEANTES o CRÍTICOS sin resolver

**RESULTADO FINAL**:
- [ ] ✅ **APROBADO PARA PRODUCCIÓN** (todos los criterios pasan)
- [ ] ⚠️ **APROBADO CON CONDICIONES** (issues menores documentados)
- [ ] ❌ **RECHAZADO** (requiere correcciones)

**ISSUES PENDIENTES** (si aplica):
1. ________________________________________________________________
2. ________________________________________________________________
3. ________________________________________________________________

**FIRMA Y FECHA**:

_________________________
Nombre del Tester/QA

_________________________
Firma

_________________________
Fecha

---

## 11. ANEXOS

### Anexo A: Glosario de Términos

| Término | Definición |
|---------|------------|
| **OPCIÓN C** | Solución implementada que combina pipe de formateo + corrección de cálculos |
| **currencyFormat** | Pipe personalizado de Angular para formatear valores a 2 decimales |
| **toFixed(2)** | Método JavaScript que redondea un número a 2 decimales |
| **SessionStorage** | Almacenamiento temporal del navegador (se limpia al cerrar pestaña) |
| **Error de punto flotante** | Imprecisión en cálculos decimales (ej: 0.1 + 0.2 = 0.30000000000000004) |
| **Regresión** | Pruebas para verificar que cambios no rompieron funcionalidades existentes |
| **IVA** | Impuesto al Valor Agregado (21% en este sistema) |
| **Cuenta Corriente** | Tipo de pago donde el cliente paga posteriormente (cod_tar = 111) |
| **Tipo CS** | Consulta/Presupuesto (no descuenta stock) |

---

### Anexo B: Productos de Prueba Recomendados

| ID | Nombre | Precio (prefi1) | Observaciones |
|----|--------|-----------------|---------------|
| 5589 | BIELAS JAPON KAWASAKI | 82.9950 | Caso ideal: 4 decimales |
| 5438 | LUBERY ACEITE SAE 20W50 | 373.5318 | Precio alto con decimales |
| 5633 | CABLE ACEL. SOLO 1.5M | 1.0463 | Precio bajo con decimales |

---

### Anexo C: Contactos de Emergencia

**EQUIPO DE DESARROLLO**:
- **Desarrollador Principal**: [Nombre] - [Email/Teléfono]
- **Arquitecto de Software**: [Nombre] - [Email/Teléfono]

**EQUIPO DE NEGOCIO**:
- **Product Owner**: [Nombre] - [Email/Teléfono]
- **Contador/Auditor**: [Nombre] - [Email/Teléfono]

**SOPORTE TÉCNICO**:
- **Administrador de Base de Datos**: [Nombre] - [Email/Teléfono]
- **DevOps/Infraestructura**: [Nombre] - [Email/Teléfono]

---

### Anexo D: Valores de Referencia

**CÁLCULOS ESPERADOS**:

```
Producto 5589 (BIELAS JAPON KAWASAKI):
- Precio BD: 82.9950
- Precio mostrado: $82.99
- Cantidad: 306
- Subtotal: $25,392.61

Producto 5438 (LUBERY ACEITE SAE 20W50):
- Precio BD: 373.5318
- Precio mostrado: $373.53
- Cantidad: 10
- Subtotal: $3,735.30

Producto 5633 (CABLE ACEL. SOLO 1.5M):
- Precio BD: 1.0463
- Precio mostrado: $1.05
- Cantidad: 50
- Subtotal: $52.50

TOTAL MÚLTIPLES PRODUCTOS: $29,180.41
```

---

**FIN DEL DOCUMENTO DE PRUEBAS**

**Versión**: 1.0
**Fecha de Creación**: 06 de octubre de 2025
**Próxima Revisión**: Después de ejecución de pruebas

---

**NOTAS FINALES**:

1. **IMPORTANTE**: Este documento debe imprimirse o tener disponible en pantalla secundaria durante la ejecución de pruebas.

2. **TIEMPO ESTIMADO TOTAL**: 2-3 horas para ejecutar todas las pruebas completas.

3. **RECOMENDACIÓN**: Ejecutar primero Test Cases 1-3 (críticos) antes de continuar con 4-5.

4. **BACKUP**: Asegurarse de tener backup de base de datos ANTES de comenzar.

5. **DOCUMENTACIÓN**: Guardar TODAS las capturas de pantalla en carpeta organizada por Test Case.

¡ÉXITO CON LAS PRUEBAS! 🎯