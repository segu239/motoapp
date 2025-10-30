# 🧪 Plan de Pruebas Automatizadas con Chrome DevTools MCP

**Fecha de Creación**: 2025-10-28
**Versión**: 1.0
**Sistema**: MotoApp v4.0
**Herramienta**: Chrome DevTools MCP
**Ejecutor**: Claude Code

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Objetivos de las Pruebas](#objetivos-de-las-pruebas)
3. [Pre-requisitos](#pre-requisitos)
4. [Casos de Prueba](#casos-de-prueba)
5. [Scripts de Ejecución MCP](#scripts-de-ejecución-mcp)
6. [Criterios de Éxito](#criterios-de-éxito)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Introducción

Este documento define un conjunto de pruebas **automatizadas y reproducibles** para validar las funcionalidades críticas de MotoApp v4.0 utilizando **Chrome DevTools MCP**. Las pruebas están diseñadas para ser ejecutadas completamente por Claude Code sin intervención manual.

### Alcance

- ✅ Modo Consulta (cambio de tipo de pago con simulación)
- ✅ Totales Temporales vs Totales Reales
- ✅ Items Duplicados (mismo producto, diferentes tipos de pago)
- ✅ Normalización de cod_tar
- ✅ Restricción Cliente 109 (CONSUMIDOR FINAL genérico)
- ✅ Botón Revertir
- ✅ Validación de bloqueo de finalización de venta

### Fuera de Alcance

- ❌ Testing de backend (Carga.php, Descarga.php)
- ❌ Testing de base de datos PostgreSQL
- ❌ Performance bajo carga
- ❌ Testing cross-browser

---

## 🎯 Objetivos de las Pruebas

### Objetivos Primarios

1. **Validar Modo Consulta**: Verificar que el cambio de tipo de pago con diferente activadatos activa correctamente el modo consulta
2. **Validar Totales Temporales**: Confirmar que se muestran totales temporales cuando hay items en consulta
3. **Validar Items Duplicados**: Asegurar que items del mismo producto con diferentes tipos de pago se manejan correctamente
4. **Validar Botón Revertir**: Confirmar que revertir un item restaura valores originales
5. **Validar Restricción Cliente 109**: Verificar que CUENTA CORRIENTE no está disponible para cliente especial

### Objetivos Secundarios

6. **Validar Normalización**: Verificar que cod_tar se maneja consistentemente como string
7. **Validar Logs**: Confirmar que el logging detallado funciona correctamente
8. **Validar Bloqueo de Venta**: Asegurar que no se puede finalizar venta con items en consulta

---

## 📋 Pre-requisitos

### Datos de Prueba Necesarios

```javascript
// Cliente de prueba (NO cliente 109)
const CLIENTE_NORMAL = {
  nombre: "CLIENTE DE PRUEBA",
  cliente: "100", // NO debe ser "109"
  cod_iva: "1"
};

// Cliente especial 109
const CLIENTE_ESPECIAL_109 = {
  nombre: "CONSUMIDOR FINAL",
  cliente: "109",
  cod_iva: "2"
};

// Producto de prueba
const PRODUCTO_PRUEBA = {
  nomart: "ACOPLE FIL-AIRE",
  id_articulo: "12345",
  precon: 100.00,   // Lista 0 (EFECTIVO)
  prefi1: 105.00,   // Lista 1 (CUENTA CORRIENTE)
  prefi2: 110.00,   // Lista 2 (TARJETA)
  prefi3: 115.00,   // Lista 3
  prefi4: 120.00    // Lista 4
};

// Tipos de pago
const TIPO_PAGO_EFECTIVO = {
  cod_tarj: "1",
  tarjeta: "EFECTIVO",
  listaprecio: "0",
  activadatos: 0
};

const TIPO_PAGO_CUENTA_CORRIENTE = {
  cod_tarj: "111",
  tarjeta: "CUENTA CORRIENTE",
  listaprecio: "1",
  activadatos: 0
};

const TIPO_PAGO_TARJETA = {
  cod_tarj: "12",
  tarjeta: "ELECTRON",
  listaprecio: "2",
  activadatos: 1
};
```

### Estado Inicial Requerido

1. ✅ Usuario autenticado en el sistema
2. ✅ Carrito vacío (sessionStorage['carrito'] = '[]')
3. ✅ Navegador en página de Punto de Venta
4. ✅ Base de datos con datos de prueba cargados
5. ✅ Red estable para llamadas a backend

### URLs de Prueba

```
BASE_URL = "http://localhost:4200" (o URL del entorno de pruebas)
PUNTO_VENTA_URL = BASE_URL + "/pages/puntoventa"
CONDICION_VENTA_URL = BASE_URL + "/pages/condicionventa"
CARRITO_URL = BASE_URL + "/pages/carrito"
```

---

## 🧪 Casos de Prueba

### CP-001: Validar Modo Consulta - Cambio EFECTIVO → TARJETA

**Objetivo**: Verificar que cambiar de EFECTIVO a TARJETA activa modo consulta

**Prioridad**: 🔴 Crítica

**Pre-condiciones**:
- Carrito con 1 item agregado con EFECTIVO (lista 0, precio $100)
- Usuario en página de carrito

**Pasos**:
1. Navegar a `/pages/carrito`
2. Tomar snapshot para identificar dropdown de tipo de pago
3. Capturar precio inicial del item ($100)
4. Abrir dropdown de tipo de pago
5. Seleccionar "ELECTRON" (tarjeta, lista 2, activadatos 1)
6. Esperar alerta de SweetAlert2
7. Confirmar alerta
8. Tomar screenshot de badge "SOLO CONSULTA"
9. Capturar precio actualizado ($110)
10. Capturar logs de consola

**Resultados Esperados**:
- ✅ Alerta SweetAlert2 con título "Precio de consulta"
- ✅ Badge "SOLO CONSULTA" visible en el item
- ✅ Precio actualizado de $100 → $110
- ✅ Total temporal diferente del total real
- ✅ Log: "⚠️ Marcando item como SOLO CONSULTA"
- ✅ Log: "💾 Datos originales guardados"
- ✅ `item._soloConsulta = true`
- ✅ `item._tipoPagoOriginal = "1"` (EFECTIVO)
- ✅ `item._precioOriginal = 100`

**Script MCP**: Ver [MCP-001](#mcp-001-modo-consulta-efectivo--tarjeta)

---

### CP-002: Validar Botón Revertir

**Objetivo**: Verificar que el botón "Revertir" restaura valores originales

**Prioridad**: 🔴 Crítica

**Pre-condiciones**:
- Item en modo consulta (CP-001 ejecutado)
- Badge "SOLO CONSULTA" visible
- Botón "Revertir" presente

**Pasos**:
1. Identificar botón "Revertir" en el item
2. Click en botón "Revertir"
3. Esperar confirmación SweetAlert2
4. Confirmar "Sí, revertir"
5. Esperar mensaje "Revertido"
6. Tomar screenshot
7. Verificar que badge desapareció
8. Verificar precio restaurado a $100
9. Verificar tipo de pago vuelve a EFECTIVO
10. Capturar logs de consola

**Resultados Esperados**:
- ✅ SweetAlert2 con pregunta de confirmación
- ✅ Badge "SOLO CONSULTA" desaparece
- ✅ Precio vuelve a $100 (original)
- ✅ Tipo de pago vuelve a "EFECTIVO"
- ✅ Total temporal = total real
- ✅ Log: "🔄 Revirtiendo item a estado original"
- ✅ Log: "📝 Restaurando valores"
- ✅ `item._soloConsulta = undefined` (eliminado)

**Script MCP**: Ver [MCP-002](#mcp-002-botón-revertir)

---

### CP-003: Validar Items Duplicados - Mismo Producto, Diferentes Tipos de Pago

**Objetivo**: Verificar que items del mismo producto con diferentes tipos de pago se manejan correctamente

**Prioridad**: 🟠 Alta

**Pre-condiciones**:
- Carrito vacío
- Usuario en condición de venta

**Pasos**:
1. Agregar "ACOPLE FIL-AIRE" con EFECTIVO (cantidad: 2)
2. Navegar a carrito y verificar item agregado
3. Volver a condición de venta
4. Agregar "ACOPLE FIL-AIRE" con TARJETA (cantidad: 1)
5. Navegar a carrito
6. Tomar screenshot mostrando 2 items del mismo producto
7. Cambiar cantidad del item 1 (EFECTIVO) a 3
8. Verificar que item 2 (TARJETA) NO cambia
9. Cambiar tipo de pago del item 2 a CUENTA CORRIENTE
10. Verificar que item 1 NO es afectado
11. Capturar logs de consola

**Resultados Esperados**:
- ✅ 2 items separados en la tabla del carrito
- ✅ Item 1: EFECTIVO, cantidad 3, precio $100
- ✅ Item 2: TARJETA, cantidad 1, precio $110
- ✅ Cambio de cantidad del item 1 NO afecta item 2
- ✅ Cambio de tipo de pago del item 2 NO afecta item 1
- ✅ Log: "✅ FIX: Usar ÍNDICE para garantizar unicidad"
- ✅ Índices correctos en logs (itemIndex = 0 para item 1, itemIndex = 1 para item 2)

**Script MCP**: Ver [MCP-003](#mcp-003-items-duplicados)

---

### CP-004: Validar Totales Temporales

**Objetivo**: Verificar que los totales temporales se calculan correctamente cuando hay items en consulta

**Prioridad**: 🟠 Alta

**Pre-condiciones**:
- Carrito con 2 items:
  - Item 1: EFECTIVO, precio $100, cantidad 1 (NO en consulta)
  - Item 2: EFECTIVO, precio $100, cantidad 1, cambiado a TARJETA (EN consulta, precio temporal $110)

**Pasos**:
1. Navegar a carrito con items configurados
2. Tomar snapshot para identificar sección de totales
3. Ejecutar script para leer `this.suma` (total real)
4. Ejecutar script para leer `this.sumaTemporalSimulacion` (total temporal)
5. Ejecutar script para leer `this.hayItemsEnConsulta`
6. Verificar visualización en UI
7. Tomar screenshot de totales
8. Capturar logs de consola

**Resultados Esperados**:
- ✅ `hayItemsEnConsulta = true`
- ✅ Total Real: $200 (2 items × $100)
- ✅ Total Temporal: $210 ($100 + $110)
- ✅ Diferencia: $10
- ✅ UI muestra ambos totales claramente diferenciados
- ✅ Log: "calcularTotalesTemporales()" ejecutado
- ✅ Log muestra "sumaTemporalSimulacion: 210"

**Script MCP**: Ver [MCP-004](#mcp-004-totales-temporales)

---

### CP-005: Validar Restricción Cliente 109

**Objetivo**: Verificar que CUENTA CORRIENTE no está disponible para cliente especial 109

**Prioridad**: 🟠 Alta

**Pre-condiciones**:
- Carrito vacío
- Cliente especial 109 seleccionado

**Pasos**:
1. Navegar a punto de venta
2. Seleccionar cliente "CONSUMIDOR FINAL" (código 109)
3. Navegar a condición de venta
4. Tomar snapshot del dropdown de condiciones
5. Verificar lista de opciones disponibles
6. Buscar "CUENTA CORRIENTE" en opciones
7. Capturar logs de consola
8. Tomar screenshot
9. Cambiar a cliente normal (código 100)
10. Verificar que CUENTA CORRIENTE aparece

**Resultados Esperados**:
- ✅ Para cliente 109: "CUENTA CORRIENTE" NO aparece en dropdown
- ✅ Para cliente 100: "CUENTA CORRIENTE" SÍ aparece en dropdown
- ✅ Log: "🚫 CLIENTE ESPECIAL 109 detectado - CUENTA CORRIENTE excluida"
- ✅ Log: "esClienteEspecial109(): true" para cliente 109
- ✅ Log: "esClienteEspecial109(): false" para cliente 100

**Script MCP**: Ver [MCP-005](#mcp-005-restricción-cliente-109)

---

### CP-006: Validar Bloqueo de Finalización de Venta

**Objetivo**: Verificar que no se puede finalizar venta con items en modo consulta

**Prioridad**: 🔴 Crítica

**Pre-condiciones**:
- Carrito con al menos 1 item en modo consulta
- Badge "SOLO CONSULTA" visible

**Pasos**:
1. Navegar a carrito con item en consulta
2. Identificar botón de finalizar venta (puede ser "Generar Factura" o "Generar Presupuesto")
3. Tomar snapshot para verificar estado del botón
4. Ejecutar script para verificar validación `hayItemsSoloConsulta()`
5. Intentar click en botón de finalizar venta
6. Esperar alerta de bloqueo
7. Capturar mensaje de alerta
8. Tomar screenshot
9. Capturar logs de consola

**Resultados Esperados**:
- ✅ SweetAlert2 con mensaje de error/advertencia
- ✅ Mensaje indica que hay items en modo consulta
- ✅ Venta NO se procesa
- ✅ Log: "❌ No se puede finalizar: hay items en modo consulta"
- ✅ Usuario es redirigido o permanece en carrito
- ✅ Items en consulta siguen visibles con badge

**Script MCP**: Ver [MCP-006](#mcp-006-bloqueo-finalización-venta)

---

### CP-007: Validar Cambio EFECTIVO → CUENTA CORRIENTE (Misma activadatos, Diferente lista)

**Objetivo**: Verificar que cambio entre tipos de pago con misma activadatos pero diferente lista activa modo consulta

**Prioridad**: 🟠 Alta

**Pre-condiciones**:
- Carrito con 1 item agregado con EFECTIVO (lista 0, activadatos 0)
- Usuario en página de carrito

**Pasos**:
1. Navegar a carrito
2. Capturar precio inicial ($100)
3. Cambiar tipo de pago a CUENTA CORRIENTE (lista 1, activadatos 0)
4. Esperar alerta de modo consulta
5. Verificar badge "SOLO CONSULTA" aparece
6. Verificar precio cambia a $105
7. Capturar logs de consola
8. Verificar que se detectó "cambio de lista de precios"

**Resultados Esperados**:
- ✅ Badge "SOLO CONSULTA" aparece (FIX crítico verificado)
- ✅ Precio actualizado $100 → $105
- ✅ Alerta SweetAlert2 mostrada
- ✅ Log: "⚠️ Marcando como consulta por primera vez"
- ✅ Log: "Razón: cambio de lista de precios"
- ✅ Log: "Lista precio: 0 → 1"
- ✅ Log: "Activadatos: 0 → 0" (sin cambio, pero lista sí cambió)

**Script MCP**: Ver [MCP-007](#mcp-007-cambio-mismo-activadatos)

---

### CP-008: Validar Normalización cod_tar

**Objetivo**: Verificar que cod_tar se normaliza consistentemente a string

**Prioridad**: 🟡 Media

**Pre-condiciones**:
- Carrito con items cargados

**Pasos**:
1. Navegar a carrito
2. Ejecutar script para inspeccionar `itemsEnCarrito[0].cod_tar`
3. Verificar tipo con `typeof`
4. Ejecutar script para inspeccionar `tarjetas[0].cod_tarj`
5. Verificar tipo con `typeof`
6. Capturar logs de inicialización
7. Verificar dropdown muestra valor correcto (no placeholder)

**Resultados Esperados**:
- ✅ `typeof itemsEnCarrito[0].cod_tar === "string"`
- ✅ `typeof tarjetas[0].cod_tarj === "string"` o número (ambos válidos)
- ✅ Dropdown muestra nombre de tipo de pago, NO placeholder
- ✅ Log: "✅ FIX: Normalizar cod_tar a string"
- ✅ Log: "🔍 cod_tar del item: X, tipo: string"
- ✅ Comparaciones funcionan correctamente sin type coercion

**Script MCP**: Ver [MCP-008](#mcp-008-normalización-cod_tar)

---

### CP-009: Validar Eliminación de Item en Consulta

**Objetivo**: Verificar que se puede eliminar un item que está en modo consulta

**Prioridad**: 🟡 Media

**Pre-condiciones**:
- Carrito con 1 item en modo consulta
- Badge "SOLO CONSULTA" visible

**Pasos**:
1. Navegar a carrito con item en consulta
2. Identificar botón de eliminar del item
3. Click en botón eliminar
4. Confirmar eliminación en SweetAlert2
5. Verificar que item desaparece
6. Verificar que totales se actualizan
7. Capturar logs de consola

**Resultados Esperados**:
- ✅ Item se elimina correctamente
- ✅ Badge desaparece (porque el item ya no existe)
- ✅ Totales se actualizan (temporal y real)
- ✅ Log: "Item eliminado"
- ✅ Log: "calcularTotalesTemporales()" ejecutado
- ✅ `hayItemsEnConsulta` actualizado si era el único item en consulta

**Script MCP**: Ver [MCP-009](#mcp-009-eliminación-item-consulta)

---

### CP-010: Validar Sincronización itemsEnCarrito e itemsConTipoPago

**Objetivo**: Verificar que ambos arrays se mantienen sincronizados

**Prioridad**: 🟡 Media

**Pre-condiciones**:
- Carrito con 3 items
- Al menos 1 item en modo consulta

**Pasos**:
1. Navegar a carrito
2. Ejecutar script para contar `itemsEnCarrito.length`
3. Ejecutar script para contar `itemsConTipoPago.length`
4. Ejecutar script para comparar propiedades clave
5. Cambiar cantidad de item 2
6. Volver a verificar sincronización
7. Cambiar tipo de pago de item 3
8. Volver a verificar sincronización

**Resultados Esperados**:
- ✅ `itemsEnCarrito.length === itemsConTipoPago.length` (siempre)
- ✅ Después de cambio de cantidad: longitudes iguales
- ✅ Después de cambio de tipo de pago: longitudes iguales
- ✅ Propiedades base (id_articulo, cantidad, nomart) coinciden
- ✅ Log: "actualizarItemsConTipoPago()" ejecutado
- ✅ Items en el mismo orden en ambos arrays

**Script MCP**: Ver [MCP-010](#mcp-010-sincronización-arrays)

---

## 📜 Scripts de Ejecución MCP

### MCP-001: Modo Consulta EFECTIVO → TARJETA

```markdown
## Ejecución Paso a Paso

### Paso 1: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`
- Timeout: 5000ms
- Esperar: Carga completa de página

### Paso 2: Tomar Snapshot Inicial
- Tool: `take_snapshot`
- Objetivo: Identificar elementos de la tabla de carrito
- Buscar:
  - Dropdown de tipo de pago (selector: `p-dropdown`)
  - Precio del item
  - Badge "SOLO CONSULTA" (no debe existir aún)

### Paso 3: Capturar Estado Inicial
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  if (!component) return { error: 'Componente no encontrado' };

  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    itemsCount: componentInstance.itemsEnCarrito.length,
    primerItem: {
      nomart: componentInstance.itemsEnCarrito[0].nomart,
      precio: componentInstance.itemsEnCarrito[0].precio,
      cod_tar: componentInstance.itemsEnCarrito[0].cod_tar,
      tipoPago: componentInstance.itemsEnCarrito[0].tipoPago,
      soloConsulta: componentInstance.itemsEnCarrito[0]._soloConsulta
    }
  };
})();
```

### Paso 4: Capturar Logs Previos
- Tool: `list_console_messages`
- Filtros: Todos los tipos
- Guardar: Estado de logs antes del cambio

### Paso 5: Identificar Dropdown
- Tool: `take_snapshot`
- Buscar: UID del dropdown del primer item
- Pattern: `p-dropdown[ng-reflect-name="cod_tar"]` o similar

### Paso 6: Abrir Dropdown
- Tool: `click`
- UID: [UID del dropdown identificado]
- Esperar: Menú desplegable visible

### Paso 7: Seleccionar TARJETA
- Tool: `click`
- UID: [UID de opción "ELECTRON" en dropdown]
- Esperar: Cierre de dropdown

### Paso 8: Esperar Alerta
- Tool: `wait_for`
- Text: "Precio de consulta"
- Timeout: 3000ms

### Paso 9: Tomar Screenshot de Alerta
- Tool: `take_screenshot`
- Guardar: `CP001_alerta_modo_consulta.png`

### Paso 10: Confirmar Alerta
- Tool: `click`
- UID: [UID del botón "Entendido"]
- Esperar: Cierre de alerta

### Paso 11: Tomar Screenshot Final
- Tool: `take_screenshot`
- Guardar: `CP001_badge_solo_consulta.png`
- Verificar visualmente: Badge "SOLO CONSULTA"

### Paso 12: Capturar Estado Final
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    primerItem: {
      precio: componentInstance.itemsEnCarrito[0].precio,
      cod_tar: componentInstance.itemsEnCarrito[0].cod_tar,
      tipoPago: componentInstance.itemsEnCarrito[0].tipoPago,
      soloConsulta: componentInstance.itemsEnCarrito[0]._soloConsulta,
      tipoPagoOriginal: componentInstance.itemsEnCarrito[0]._tipoPagoOriginal,
      precioOriginal: componentInstance.itemsEnCarrito[0]._precioOriginal,
      activadatosOriginal: componentInstance.itemsEnCarrito[0]._activadatosOriginal,
      nombreTipoPagoOriginal: componentInstance.itemsEnCarrito[0]._nombreTipoPagoOriginal
    },
    totales: {
      suma: componentInstance.suma,
      sumaTemporalSimulacion: componentInstance.sumaTemporalSimulacion,
      hayItemsEnConsulta: componentInstance.hayItemsEnConsulta
    }
  };
})();
```

### Paso 13: Capturar Logs Post-Cambio
- Tool: `list_console_messages`
- Filtros: Todos los tipos
- Buscar logs específicos:
  - "⚠️ Marcando item como SOLO CONSULTA"
  - "💾 Datos originales guardados"
  - "🔄 CAMBIO DE TIPO DE PAGO EN CARRITO"

### Paso 14: Validar Resultados
- Comparar estado inicial vs final
- Validar:
  - ✅ `soloConsulta: false → true`
  - ✅ `precio: 100 → 110`
  - ✅ `tipoPagoOriginal === "1"` (EFECTIVO)
  - ✅ `precioOriginal === 100`
  - ✅ `hayItemsEnConsulta === true`
  - ✅ `sumaTemporalSimulacion > suma`

### Paso 15: Generar Reporte
- Crear objeto con resultados
- Incluir screenshots
- Incluir logs relevantes
- Marcar como ✅ PASS o ❌ FAIL
```

---

### MCP-002: Botón Revertir

```markdown
## Ejecución Paso a Paso

### Pre-condición: Ejecutar MCP-001 primero

### Paso 1: Verificar Estado Inicial (item en consulta)
- Tool: `take_snapshot`
- Buscar: Badge "SOLO CONSULTA" visible
- Buscar: Botón "Revertir"

### Paso 2: Capturar Estado Pre-Revertir
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    primerItem: {
      precio: componentInstance.itemsEnCarrito[0].precio,
      cod_tar: componentInstance.itemsEnCarrito[0].cod_tar,
      tipoPago: componentInstance.itemsEnCarrito[0].tipoPago,
      soloConsulta: componentInstance.itemsEnCarrito[0]._soloConsulta
    }
  };
})();
```

### Paso 3: Click en Botón Revertir
- Tool: `click`
- UID: [UID del botón Revertir]
- Esperar: Alerta de confirmación

### Paso 4: Esperar Confirmación
- Tool: `wait_for`
- Text: "Revertir a método original"
- Timeout: 2000ms

### Paso 5: Tomar Screenshot de Confirmación
- Tool: `take_screenshot`
- Guardar: `CP002_confirmacion_revertir.png`

### Paso 6: Confirmar Revertir
- Tool: `click`
- UID: [UID del botón "Sí, revertir"]
- Esperar: Mensaje "Revertido"

### Paso 7: Esperar Mensaje de Éxito
- Tool: `wait_for`
- Text: "Revertido"
- Timeout: 3000ms

### Paso 8: Tomar Screenshot Final
- Tool: `take_screenshot`
- Guardar: `CP002_item_revertido.png`
- Verificar: Badge "SOLO CONSULTA" NO visible

### Paso 9: Capturar Estado Post-Revertir
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    primerItem: {
      precio: componentInstance.itemsEnCarrito[0].precio,
      cod_tar: componentInstance.itemsEnCarrito[0].cod_tar,
      tipoPago: componentInstance.itemsEnCarrito[0].tipoPago,
      soloConsulta: componentInstance.itemsEnCarrito[0]._soloConsulta,
      tipoPagoOriginal: componentInstance.itemsEnCarrito[0]._tipoPagoOriginal
    },
    totales: {
      suma: componentInstance.suma,
      sumaTemporalSimulacion: componentInstance.sumaTemporalSimulacion,
      hayItemsEnConsulta: componentInstance.hayItemsEnConsulta
    }
  };
})();
```

### Paso 10: Capturar Logs
- Tool: `list_console_messages`
- Buscar logs:
  - "🔄 Revirtiendo item a estado original"
  - "📝 Restaurando valores"

### Paso 11: Validar Resultados
- Validar:
  - ✅ `soloConsulta: true → false` (o undefined)
  - ✅ `precio: 110 → 100` (restaurado)
  - ✅ `cod_tar: "12" → "1"` (restaurado a EFECTIVO)
  - ✅ `tipoPago: "ELECTRON" → "EFECTIVO"`
  - ✅ `hayItemsEnConsulta === false`
  - ✅ `suma === sumaTemporalSimulacion` (iguales ahora)
```

---

### MCP-003: Items Duplicados

```markdown
## Ejecución Paso a Paso

### Paso 1: Limpiar Carrito
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  sessionStorage.setItem('carrito', '[]');
  return { mensaje: 'Carrito limpiado' };
})();
```

### Paso 2: Navegar a Condición de Venta
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/condicionventa?cliente={CLIENTE_NORMAL_JSON}`
- Esperar: Carga completa

### Paso 3: Seleccionar EFECTIVO
- Tool: `take_snapshot`
- Buscar: UID de botón/card "EFECTIVO"
- Tool: `click`
- UID: [UID de EFECTIVO]
- Esperar: Tabla de productos

### Paso 4: Agregar Producto (Primera vez)
- Tool: `take_snapshot`
- Buscar: UID del producto "ACOPLE FIL-AIRE"
- Tool: `click`
- UID: [UID del producto]
- Esperar: Modal de cantidad

### Paso 5: Ingresar Cantidad 2
- Tool: `fill`
- UID: [UID del input cantidad]
- Value: "2"

### Paso 6: Confirmar Agregar
- Tool: `click`
- UID: [UID del botón "Comprar"]
- Esperar: Cierre de modal

### Paso 7: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 8: Verificar Item 1 Agregado
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    itemsCount: componentInstance.itemsEnCarrito.length,
    item1: componentInstance.itemsEnCarrito[0]
  };
})();
```

### Paso 9: Volver a Condición de Venta
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/condicionventa?cliente={CLIENTE_NORMAL_JSON}`

### Paso 10: Seleccionar TARJETA
- Tool: `take_snapshot`
- Buscar: UID de "ELECTRON" (tarjeta)
- Tool: `click`
- UID: [UID de ELECTRON]
- Esperar: Formulario de tarjeta

### Paso 11: Completar Datos de Tarjeta
- Tool: `fill` (múltiples campos)
- Campos:
  - Titular: "JUAN PEREZ"
  - DNI: "12345678"
  - Numero: "1234567890123456"
  - Autorizacion: "123"
- Tool: `click`
- UID: [UID de botón "Guardar"]

### Paso 12: Agregar Mismo Producto (Segunda vez)
- Tool: `take_snapshot`
- Buscar: UID del producto "ACOPLE FIL-AIRE"
- Tool: `click`
- UID: [UID del producto]

### Paso 13: Ingresar Cantidad 1
- Tool: `fill`
- UID: [UID del input cantidad]
- Value: "1"

### Paso 14: Confirmar Agregar
- Tool: `click`
- UID: [UID del botón "Comprar"]

### Paso 15: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 16: Tomar Screenshot de Items Duplicados
- Tool: `take_screenshot`
- Guardar: `CP003_items_duplicados.png`

### Paso 17: Verificar Estado Items
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    itemsCount: componentInstance.itemsEnCarrito.length,
    item1: {
      nomart: componentInstance.itemsEnCarrito[0].nomart,
      cantidad: componentInstance.itemsEnCarrito[0].cantidad,
      precio: componentInstance.itemsEnCarrito[0].precio,
      cod_tar: componentInstance.itemsEnCarrito[0].cod_tar,
      tipoPago: componentInstance.itemsEnCarrito[0].tipoPago
    },
    item2: {
      nomart: componentInstance.itemsEnCarrito[1].nomart,
      cantidad: componentInstance.itemsEnCarrito[1].cantidad,
      precio: componentInstance.itemsEnCarrito[1].precio,
      cod_tar: componentInstance.itemsEnCarrito[1].cod_tar,
      tipoPago: componentInstance.itemsEnCarrito[1].tipoPago
    }
  };
})();
```

### Paso 18: Cambiar Cantidad Item 1
- Tool: `take_snapshot`
- Buscar: UID del input cantidad del primer item
- Tool: `fill`
- UID: [UID del input cantidad item 1]
- Value: "3"
- Tool: Trigger event `change`

### Paso 19: Verificar Item 2 NO Cambia
- Tool: `evaluate_script`
- Script: (mismo que Paso 17)
- Validar: item2.cantidad sigue siendo 1

### Paso 20: Capturar Logs
- Tool: `list_console_messages`
- Buscar: "✅ FIX: Usar ÍNDICE para garantizar unicidad"
- Verificar: índices correctos en logs

### Paso 21: Validar Resultados
- Validar:
  - ✅ `itemsCount === 2`
  - ✅ `item1.nomart === item2.nomart` (mismo producto)
  - ✅ `item1.cod_tar !== item2.cod_tar` (diferentes tipos de pago)
  - ✅ `item1.cantidad === 3` (actualizado)
  - ✅ `item2.cantidad === 1` (NO afectado)
```

---

### MCP-004: Totales Temporales

```markdown
## Ejecución Paso a Paso

### Pre-condición: Tener al menos 1 item en consulta

### Paso 1: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 2: Capturar Estado de Totales
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    hayItemsEnConsulta: componentInstance.hayItemsEnConsulta,
    totalReal: componentInstance.suma,
    totalTemporal: componentInstance.sumaTemporalSimulacion,
    diferencia: componentInstance.sumaTemporalSimulacion - componentInstance.suma,
    subtotalesReales: componentInstance.subtotalesPorTipoPago,
    subtotalesTemporales: componentInstance.subtotalesTemporalesSimulacion,
    items: componentInstance.itemsEnCarrito.map((item, index) => ({
      index,
      nomart: item.nomart,
      precio: item.precio,
      cantidad: item.cantidad,
      soloConsulta: item._soloConsulta,
      precioOriginal: item._precioOriginal,
      subtotal: item.precio * item.cantidad
    }))
  };
})();
```

### Paso 3: Tomar Snapshot de UI
- Tool: `take_snapshot`
- Buscar: Sección de totales
- Identificar: Dónde se muestran totales reales vs temporales

### Paso 4: Tomar Screenshot de Totales
- Tool: `take_screenshot`
- Guardar: `CP004_totales_temporales.png`

### Paso 5: Validar Cálculos Manuales
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  // Calcular totales manualmente para validar
  let totalRealCalculado = 0;
  let totalTemporalCalculado = 0;

  componentInstance.itemsEnCarrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;

    if (item._soloConsulta) {
      // Item en consulta: real usa precio original, temporal usa precio actual
      totalRealCalculado += (item._precioOriginal || item.precio) * item.cantidad;
      totalTemporalCalculado += item.precio * item.cantidad;
    } else {
      // Item normal: ambos usan mismo precio
      totalRealCalculado += subtotal;
      totalTemporalCalculado += subtotal;
    }
  });

  return {
    totalRealSistema: componentInstance.suma,
    totalRealCalculado: totalRealCalculado,
    totalTemporalSistema: componentInstance.sumaTemporalSimulacion,
    totalTemporalCalculado: totalTemporalCalculado,
    coincideReal: Math.abs(componentInstance.suma - totalRealCalculado) < 0.01,
    coincideTemporal: Math.abs(componentInstance.sumaTemporalSimulacion - totalTemporalCalculado) < 0.01
  };
})();
```

### Paso 6: Capturar Logs
- Tool: `list_console_messages`
- Buscar: "calcularTotalesTemporales()"

### Paso 7: Validar Resultados
- Validar:
  - ✅ `hayItemsEnConsulta === true`
  - ✅ `totalTemporal > totalReal` (si item en consulta tiene precio mayor)
  - ✅ `diferencia > 0`
  - ✅ `coincideReal === true`
  - ✅ `coincideTemporal === true`
  - ✅ UI muestra ambos totales claramente
```

---

### MCP-005: Restricción Cliente 109

```markdown
## Ejecución Paso a Paso

### Paso 1: Navegar a Punto de Venta
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/puntoventa`

### Paso 2: Buscar Cliente Especial 109
- Tool: `take_snapshot`
- Buscar: Input de búsqueda de cliente
- Tool: `fill`
- UID: [UID del input búsqueda]
- Value: "CONSUMIDOR FINAL"

### Paso 3: Seleccionar Cliente 109
- Tool: `take_snapshot`
- Buscar: UID del cliente con código 109
- Tool: `click`
- UID: [UID del cliente 109]

### Paso 4: Navegar a Condición de Venta
- Tool: `navigate_page`
- URL: Automática o click en botón "Seleccionar Condición de Venta"

### Paso 5: Capturar Logs de Filtrado
- Tool: `list_console_messages`
- Buscar:
  - "🔍 filterByDay() INICIADO"
  - "🚫 CLIENTE ESPECIAL 109 detectado"
  - "CUENTA CORRIENTE excluida"

### Paso 6: Tomar Snapshot de Dropdown
- Tool: `take_snapshot`
- Buscar: Dropdown de condiciones de venta
- Listar: Todas las opciones disponibles

### Paso 7: Verificar Opciones Disponibles
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-condicionventa');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    clienteCodigo: componentInstance.clienteFrompuntoVenta.cliente,
    clienteNombre: componentInstance.clienteFrompuntoVenta.nombre,
    esClienteEspecial: componentInstance.clienteFrompuntoVenta.cliente === '109',
    condicionesDisponibles: componentInstance.filteredTipo.map(c => ({
      cod_tarj: c.cod_tarj,
      tarjeta: c.tarjeta
    })),
    tieneCuentaCorriente: componentInstance.filteredTipo.some(c => c.cod_tarj === '111')
  };
})();
```

### Paso 8: Tomar Screenshot
- Tool: `take_screenshot`
- Guardar: `CP005_cliente109_sin_cc.png`

### Paso 9: Cambiar a Cliente Normal
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/puntoventa`

### Paso 10: Buscar Cliente Normal (código 100)
- Tool: `fill`
- UID: [UID del input búsqueda]
- Value: "CLIENTE DE PRUEBA"

### Paso 11: Seleccionar Cliente 100
- Tool: `click`
- UID: [UID del cliente 100]

### Paso 12: Navegar a Condición de Venta
- Tool: `navigate_page`
- URL: Automática o click

### Paso 13: Verificar Opciones Cliente Normal
- Tool: `evaluate_script`
- Script: (mismo que Paso 7)

### Paso 14: Tomar Screenshot
- Tool: `take_screenshot`
- Guardar: `CP005_cliente100_con_cc.png`

### Paso 15: Validar Resultados
- Comparar resultados Paso 7 vs Paso 13
- Validar:
  - ✅ Cliente 109: `tieneCuentaCorriente === false`
  - ✅ Cliente 100: `tieneCuentaCorriente === true`
  - ✅ Log muestra "esClienteEspecial109(): true" para cliente 109
  - ✅ Log muestra "esClienteEspecial109(): false" para cliente 100
```

---

### MCP-006: Bloqueo Finalización Venta

```markdown
## Ejecución Paso a Paso

### Pre-condición: Tener al menos 1 item en consulta

### Paso 1: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 2: Verificar Item en Consulta
- Tool: `take_snapshot`
- Verificar: Badge "SOLO CONSULTA" visible

### Paso 3: Verificar Función de Validación
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    hayItemsEnConsulta: componentInstance.hayItemsEnConsulta,
    itemsEnConsulta: componentInstance.itemsEnCarrito.filter(i => i._soloConsulta),
    totalItems: componentInstance.itemsEnCarrito.length
  };
})();
```

### Paso 4: Tomar Snapshot de Botones
- Tool: `take_snapshot`
- Buscar: Botones de finalización (Factura, Presupuesto, etc.)

### Paso 5: Intentar Click en Finalizar
- Tool: `click`
- UID: [UID del botón de finalización]
- Esperar: Alerta de bloqueo

### Paso 6: Esperar Alerta de Bloqueo
- Tool: `wait_for`
- Text: "No se puede finalizar" o "items en modo consulta"
- Timeout: 3000ms

### Paso 7: Tomar Screenshot de Alerta
- Tool: `take_screenshot`
- Guardar: `CP006_bloqueo_venta.png`

### Paso 8: Capturar Contenido de Alerta
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const swalContainer = document.querySelector('.swal2-container');
  if (!swalContainer) return { error: 'Alerta no encontrada' };

  const title = swalContainer.querySelector('.swal2-title')?.textContent;
  const content = swalContainer.querySelector('.swal2-html-container')?.textContent;

  return {
    titulo: title,
    contenido: content,
    visible: swalContainer.style.display !== 'none'
  };
})();
```

### Paso 9: Cerrar Alerta
- Tool: `click`
- UID: [UID del botón de cerrar alerta]

### Paso 10: Verificar Usuario en Carrito
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  return {
    url: window.location.href,
    enCarrito: window.location.href.includes('/carrito')
  };
})();
```

### Paso 11: Capturar Logs
- Tool: `list_console_messages`
- Buscar: "❌ No se puede finalizar"

### Paso 12: Validar Resultados
- Validar:
  - ✅ Alerta mostrada con mensaje claro
  - ✅ Usuario permanece en carrito (NO redirigido)
  - ✅ Items en consulta siguen visibles
  - ✅ Log de bloqueo presente
```

---

### MCP-007: Cambio Mismo Activadatos

```markdown
## Ejecución Paso a Paso

### Paso 1: Preparar Item con EFECTIVO
- Ejecutar: Agregar item con EFECTIVO (lista 0, activadatos 0)
- Precio: $100

### Paso 2: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 3: Capturar Estado Inicial
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    item: {
      precio: componentInstance.itemsEnCarrito[0].precio,
      cod_tar: componentInstance.itemsEnCarrito[0].cod_tar,
      tipoPago: componentInstance.itemsEnCarrito[0].tipoPago,
      soloConsulta: componentInstance.itemsEnCarrito[0]._soloConsulta
    },
    tarjetaActual: componentInstance.tarjetas.find(t =>
      t.cod_tarj.toString() === componentInstance.itemsEnCarrito[0].cod_tar.toString()
    )
  };
})();
```

### Paso 4: Cambiar a CUENTA CORRIENTE
- Tool: `take_snapshot`
- Buscar: UID del dropdown
- Tool: `click`
- UID: [UID del dropdown]
- Tool: `click`
- UID: [UID de opción "CUENTA CORRIENTE"]

### Paso 5: Esperar Alerta
- Tool: `wait_for`
- Text: "Precio de consulta"
- Timeout: 3000ms

### Paso 6: Tomar Screenshot de Alerta
- Tool: `take_screenshot`
- Guardar: `CP007_alerta_mismo_activadatos.png`

### Paso 7: Confirmar Alerta
- Tool: `click`
- UID: [UID de botón "Entendido"]

### Paso 8: Verificar Badge
- Tool: `take_snapshot`
- Buscar: Badge "SOLO CONSULTA"
- Tool: `take_screenshot`
- Guardar: `CP007_badge_consulta.png`

### Paso 9: Capturar Estado Final
- Tool: `evaluate_script`
- Script: (mismo que Paso 3)

### Paso 10: Capturar Logs Críticos
- Tool: `list_console_messages`
- Buscar específicamente:
  - "Razón: cambio de lista de precios"
  - "Lista precio: 0 → 1"
  - "Activadatos: 0 → 0"

### Paso 11: Validar Resultados
- Validar:
  - ✅ Badge "SOLO CONSULTA" aparece (FIX crítico)
  - ✅ Precio $100 → $105
  - ✅ Log muestra "cambio de lista de precios"
  - ✅ Log muestra activadatos sin cambio (0 → 0)
  - ✅ Alerta mostrada al usuario
```

---

### MCP-008: Normalización cod_tar

```markdown
## Ejecución Paso a Paso

### Paso 1: Navegar a Carrito con Items
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 2: Inspeccionar Tipos de Datos
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    items: componentInstance.itemsEnCarrito.map((item, index) => ({
      index,
      cod_tar: item.cod_tar,
      cod_tar_tipo: typeof item.cod_tar,
      es_string: typeof item.cod_tar === 'string'
    })),
    tarjetas: componentInstance.tarjetas.slice(0, 3).map(t => ({
      cod_tarj: t.cod_tarj,
      cod_tarj_tipo: typeof t.cod_tarj,
      tarjeta: t.tarjeta
    }))
  };
})();
```

### Paso 3: Capturar Logs de Inicialización
- Tool: `list_console_messages`
- Buscar:
  - "✅ FIX: Normalizar cod_tar a string"
  - "🔍 cod_tar del item"

### Paso 4: Verificar Dropdown Muestra Valor
- Tool: `take_snapshot`
- Verificar: Dropdown NO muestra placeholder
- Verificar: Dropdown muestra nombre de tipo de pago correcto

### Paso 5: Tomar Screenshot
- Tool: `take_screenshot`
- Guardar: `CP008_dropdown_valor_correcto.png`

### Paso 6: Probar Cambio de Tipo de Pago
- Tool: `click`
- UID: [UID del dropdown]
- Tool: `click`
- UID: [UID de otra opción]
- Verificar: Cambio funciona sin errores

### Paso 7: Verificar Comparaciones
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  // Simular comparación que hacía el bug
  const item = componentInstance.itemsEnCarrito[0];
  const tarjeta = componentInstance.tarjetas.find(t =>
    t.cod_tarj.toString() === item.cod_tar.toString()
  );

  return {
    item_cod_tar: item.cod_tar,
    tarjeta_encontrada: tarjeta ? tarjeta.tarjeta : null,
    comparacion_exitosa: !!tarjeta
  };
})();
```

### Paso 8: Validar Resultados
- Validar:
  - ✅ Todos los cod_tar son strings
  - ✅ Dropdown muestra valor correcto (NO placeholder)
  - ✅ Comparaciones funcionan correctamente
  - ✅ Logs muestran normalización
```

---

### MCP-009: Eliminación Item Consulta

```markdown
## Ejecución Paso a Paso

### Pre-condición: Item en modo consulta

### Paso 1: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 2: Capturar Estado Inicial
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  return {
    itemsCount: componentInstance.itemsEnCarrito.length,
    hayItemsEnConsulta: componentInstance.hayItemsEnConsulta,
    totalReal: componentInstance.suma,
    totalTemporal: componentInstance.sumaTemporalSimulacion
  };
})();
```

### Paso 3: Identificar Botón Eliminar
- Tool: `take_snapshot`
- Buscar: UID del botón eliminar del item en consulta

### Paso 4: Click en Eliminar
- Tool: `click`
- UID: [UID del botón eliminar]
- Esperar: Confirmación

### Paso 5: Confirmar Eliminación
- Tool: `wait_for`
- Text: "¿Desea eliminar"
- Tool: `click`
- UID: [UID de botón "Sí, eliminar"]

### Paso 6: Esperar Mensaje de Éxito
- Tool: `wait_for`
- Text: "Eliminado"
- Timeout: 2000ms

### Paso 7: Tomar Screenshot
- Tool: `take_screenshot`
- Guardar: `CP009_item_eliminado.png`

### Paso 8: Capturar Estado Final
- Tool: `evaluate_script`
- Script: (mismo que Paso 2)

### Paso 9: Capturar Logs
- Tool: `list_console_messages`
- Buscar:
  - "Item eliminado"
  - "calcularTotalesTemporales()"

### Paso 10: Validar Resultados
- Validar:
  - ✅ `itemsCount` decrementado en 1
  - ✅ Item ya no visible en tabla
  - ✅ Totales actualizados correctamente
  - ✅ `hayItemsEnConsulta` actualizado si era el único
```

---

### MCP-010: Sincronización Arrays

```markdown
## Ejecución Paso a Paso

### Pre-condición: 3 items en carrito, al menos 1 en consulta

### Paso 1: Navegar a Carrito
- Tool: `navigate_page`
- URL: `http://localhost:4200/pages/carrito`

### Paso 2: Verificar Sincronización Inicial
- Tool: `evaluate_script`
- Script:
```javascript
(() => {
  const component = document.querySelector('app-carrito');
  const angular = (window as any).ng;
  const componentInstance = angular.getComponent(component);

  const enCarrito = componentInstance.itemsEnCarrito;
  const conTipoPago = componentInstance.itemsConTipoPago;

  // Comparar longitudes
  const mismaCantidad = enCarrito.length === conTipoPago.length;

  // Comparar propiedades clave
  const coinciden = enCarrito.every((item, index) => {
    const itemTP = conTipoPago[index];
    return item.id_articulo === itemTP.id_articulo &&
           item.cantidad === itemTP.cantidad &&
           item.nomart === itemTP.nomart;
  });

  return {
    enCarritoLength: enCarrito.length,
    conTipoPagoLength: conTipoPago.length,
    mismaCantidad,
    coinciden,
    items: enCarrito.map((item, index) => ({
      index,
      enCarrito: {
        id_articulo: item.id_articulo,
        cantidad: item.cantidad,
        precio: item.precio
      },
      conTipoPago: {
        id_articulo: conTipoPago[index].id_articulo,
        cantidad: conTipoPago[index].cantidad,
        precio: conTipoPago[index].precio
      }
    }))
  };
})();
```

### Paso 3: Cambiar Cantidad de Item 2
- Tool: `take_snapshot`
- Buscar: Input cantidad del item 2
- Tool: `fill`
- UID: [UID del input]
- Value: "5"
- Tool: Trigger change event

### Paso 4: Verificar Sincronización Post-Cantidad
- Tool: `evaluate_script`
- Script: (mismo que Paso 2)

### Paso 5: Cambiar Tipo de Pago de Item 3
- Tool: `click`
- UID: [UID del dropdown item 3]
- Tool: `click`
- UID: [UID de nueva opción]

### Paso 6: Verificar Sincronización Post-TipoPago
- Tool: `evaluate_script`
- Script: (mismo que Paso 2)

### Paso 7: Capturar Logs
- Tool: `list_console_messages`
- Buscar: "actualizarItemsConTipoPago()"

### Paso 8: Validar Resultados
- Validar:
  - ✅ Siempre `mismaCantidad === true`
  - ✅ Siempre `coinciden === true`
  - ✅ Mismo orden en ambos arrays
  - ✅ Propiedades base coinciden
```

---

## ✅ Criterios de Éxito

### Criterios Globales

Para considerar las pruebas como **EXITOSAS**, se deben cumplir:

1. ✅ **100% de casos críticos pasan** (CP-001, CP-002, CP-006)
2. ✅ **90%+ de casos totales pasan** (9 de 10 como mínimo)
3. ✅ **0 errores JavaScript** en consola que bloqueen funcionalidad
4. ✅ **Logs esperados presentes** en cada caso de prueba
5. ✅ **Screenshots coinciden** con resultados esperados

### Criterios por Caso de Prueba

#### CP-001: Modo Consulta
- ✅ Badge visible
- ✅ Alerta mostrada
- ✅ Precio actualizado
- ✅ Datos originales guardados

#### CP-002: Botón Revertir
- ✅ Confirmación mostrada
- ✅ Valores restaurados
- ✅ Badge desaparece
- ✅ Totales iguales

#### CP-003: Items Duplicados
- ✅ 2 items separados
- ✅ Cambios independientes
- ✅ Índices correctos en logs

#### CP-004: Totales Temporales
- ✅ Totales diferentes cuando hay consulta
- ✅ Cálculos correctos
- ✅ UI muestra ambos

#### CP-005: Restricción 109
- ✅ CUENTA CORRIENTE NO visible para 109
- ✅ CUENTA CORRIENTE SÍ visible para otros
- ✅ Logs correctos

#### CP-006: Bloqueo Venta
- ✅ Alerta de bloqueo
- ✅ Venta NO procesa
- ✅ Usuario permanece en carrito

#### CP-007: Mismo Activadatos
- ✅ Badge aparece (FIX crítico)
- ✅ Detecta cambio de lista
- ✅ Precio actualizado

#### CP-008: Normalización
- ✅ Todos cod_tar son strings
- ✅ Dropdown funciona correctamente
- ✅ Comparaciones exitosas

#### CP-009: Eliminación
- ✅ Item eliminado
- ✅ Totales actualizados
- ✅ Sin errores

#### CP-010: Sincronización
- ✅ Longitudes iguales
- ✅ Propiedades coinciden
- ✅ Orden correcto

---

## 🔧 Troubleshooting

### Problema: No se puede navegar a la página

**Síntomas**:
- Error "net::ERR_CONNECTION_REFUSED"
- Timeout al navegar

**Solución**:
1. Verificar que el servidor Angular está corriendo (`npm start`)
2. Verificar URL correcta (puerto 4200 por defecto)
3. Verificar que no hay otro proceso usando el puerto

---

### Problema: No se encuentra el componente Angular

**Síntomas**:
- `evaluate_script` retorna error
- `angular.getComponent()` es undefined

**Solución**:
1. Verificar que la aplicación está en modo desarrollo (no producción)
2. Verificar que Angular DevTools está habilitado
3. Usar selector correcto del componente
4. Esperar a que la página cargue completamente

---

### Problema: Dropdown no cambia valor

**Síntomas**:
- Click en opción no actualiza el modelo
- No se dispara evento onChange

**Solución**:
1. Usar `click` en el dropdown primero para abrirlo
2. Esperar que el menú esté visible
3. Luego `click` en la opción específica
4. Verificar que PrimeNG esté cargado correctamente

---

### Problema: Alerta no aparece

**Síntomas**:
- `wait_for` timeout
- SweetAlert2 no se muestra

**Solución**:
1. Verificar que SweetAlert2 está instalado
2. Aumentar timeout de espera
3. Verificar logs de consola para errores JavaScript
4. Verificar que la lógica de validación se ejecuta

---

### Problema: Logs no aparecen en consola

**Síntomas**:
- `list_console_messages` retorna vacío
- Logs esperados no están

**Solución**:
1. Verificar que el navegador no filtra logs
2. Usar `list_console_messages` con `includePreservedMessages: true`
3. Capturar logs INMEDIATAMENTE después de la acción
4. Verificar nivel de log (log, warn, error, etc.)

---

### Problema: Estados no coinciden entre arrays

**Síntomas**:
- `itemsEnCarrito.length !== itemsConTipoPago.length`
- Propiedades no coinciden

**Solución**:
1. Verificar que `actualizarItemsConTipoPago()` se llama
2. Revisar logs para ver si hay errores de sincronización
3. Recargar página y repetir prueba
4. Reportar como BUG si persiste

---

## 📊 Formato de Reporte de Resultados

### Estructura del Reporte

```markdown
# Reporte de Ejecución de Pruebas
**Fecha**: [YYYY-MM-DD HH:mm:ss]
**Ejecutor**: Claude Code
**Entorno**: [URL del entorno]

## Resumen Ejecutivo
- Total Casos: 10
- Casos Exitosos: X
- Casos Fallidos: Y
- Casos Omitidos: Z
- Tasa de Éxito: X%

## Resultados por Caso

### CP-001: Modo Consulta EFECTIVO → TARJETA
- **Estado**: ✅ PASS / ❌ FAIL
- **Duración**: Xs
- **Screenshots**: [lista de archivos]
- **Logs Relevantes**: [extractos]
- **Validaciones**:
  - ✅ Badge visible: PASS
  - ✅ Precio actualizado: PASS
  - ✅ Datos originales guardados: PASS
- **Observaciones**: [cualquier nota adicional]

[... repetir para cada caso ...]

## Errores Encontrados

### Error #1: [Descripción]
- **Caso de Prueba**: CP-XXX
- **Paso**: X
- **Gravedad**: 🔴 Crítico / 🟠 Alto / 🟡 Medio / 🟢 Bajo
- **Descripción**: [descripción detallada]
- **Stack Trace**: [si aplica]
- **Screenshot**: [archivo]
- **Recomendación**: [cómo solucionar]

## Conclusión
[Resumen general del estado del sistema]

## Recomendaciones
[Lista de acciones recomendadas]
```

---

## 🎯 Ejecución del Plan

### Comando de Ejecución

Para ejecutar este plan de pruebas, Claude Code debe:

1. **Leer este documento** completamente
2. **Verificar pre-requisitos** (servidor corriendo, datos de prueba)
3. **Ejecutar casos en orden** (CP-001 a CP-010)
4. **Capturar evidencia** (screenshots, logs, evaluaciones)
5. **Generar reporte** siguiendo el formato especificado
6. **Guardar reporte** en `resultados_pruebas_[timestamp].md`

### Orden de Ejecución Sugerido

```
1. CP-008 (Normalización) - Pre-validación
2. CP-001 (Modo Consulta) - Funcionalidad core
3. CP-002 (Revertir) - Depende de CP-001
4. CP-007 (Mismo Activadatos) - Variante de CP-001
5. CP-004 (Totales Temporales) - Validación de cálculos
6. CP-003 (Items Duplicados) - Caso avanzado
7. CP-010 (Sincronización) - Validación de arrays
8. CP-009 (Eliminación) - Operación destructiva
9. CP-005 (Restricción 109) - Cliente especial
10. CP-006 (Bloqueo Venta) - Validación crítica final
```

---

## 📝 Notas Finales

### Importante

- Este documento debe ser **actualizado** si cambia la funcionalidad
- Los scripts MCP son **ejemplos** y deben ajustarse según la estructura real del HTML
- Los **UIDs** deben ser identificados durante la ejecución con `take_snapshot`
- Los **timeouts** pueden ajustarse según la velocidad del sistema

### Contacto

Para problemas con la ejecución de estas pruebas, consultar:
- Documentación de Chrome DevTools MCP
- Archivo `analisis_general.md` para contexto del sistema
- Informes de correcciones (`fix_*.md`, `informe_*.md`)

---

**Documento creado por**: Claude Code
**Versión**: 1.0
**Última actualización**: 2025-10-28
**Estado**: ✅ LISTO PARA EJECUCIÓN
