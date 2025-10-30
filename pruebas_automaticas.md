# 🧪 PLAN DE PRUEBAS AUTOMATIZADAS - MotoApp v4.0
## Sistema de Modo Consulta de Precios

**Fecha de creación:** 2025-10-27
**Versión del sistema:** v4.0 - Modo Consulta de Precios
**Herramienta:** MCP Chrome DevTools
**Propósito:** Validación completa para producción

---

## 📋 CREDENCIALES DE ACCESO

**⚠️ IMPORTANTE: Usar estas credenciales para todas las pruebas**

```
Usuario:    segu239@hotmail.com
Contraseña: luissegu1
Sucursal:   Casa Central
```

---

## 🎯 OBJETIVOS DE LAS PRUEBAS

1. ✅ Validar que el selector de tipo de pago funcione correctamente
2. ✅ Verificar que el modo "SOLO CONSULTA" se active/desactive según corresponda
3. ✅ Comprobar que los totales temporales se calculen correctamente
4. ✅ Validar que el sistema bloquee finalización con items en consulta
5. ✅ Verificar que el botón "Revertir" funcione correctamente
6. ✅ Comprobar que las validaciones de activadatos funcionen
7. ✅ Validar que una venta normal (sin consultas) se procese correctamente
8. ✅ Verificar la integridad de datos enviados al backend

---

## 📊 ESTRUCTURA DE FASES

```
FASE 0: Preparación y Login
FASE 1: Flujos Básicos de Carrito
FASE 2: Selector de Tipo de Pago - Cambios Simples
FASE 3: Modo Consulta - Activación y Desactivación
FASE 4: Totales Temporales y Cálculos
FASE 5: Validación de Finalización
FASE 6: Botón Revertir
FASE 7: Múltiples Items y Escenarios Complejos
FASE 8: Venta Exitosa Completa
```

---

## 🚀 FASE 0: PREPARACIÓN Y LOGIN

### Objetivo
Iniciar sesión y navegar al punto de venta

### Pre-requisitos
- Navegador Chrome abierto
- Aplicación MotoApp accesible
- URL base de la aplicación conocida

### Pruebas

#### **P0.1: Navegar a la aplicación**
```javascript
await mcp_chrome.navigate_page({
  url: "http://localhost:4200",  // Ajustar según ambiente
  timeout: 10000
});
```

**Resultado esperado:**
- Página de login visible
- Sin errores en consola

---

#### **P0.2: Iniciar sesión**
```javascript
// 1. Tomar snapshot para verificar elementos
await mcp_chrome.take_snapshot({ verbose: false });

// 2. Completar formulario de login
await mcp_chrome.fill({
  uid: "[campo-email-uid]",  // Reemplazar con UID del snapshot
  value: "segu239@hotmail.com"
});

await mcp_chrome.fill({
  uid: "[campo-password-uid]",
  value: "luissegu1"
});

// 3. Seleccionar sucursal
await mcp_chrome.fill({
  uid: "[campo-sucursal-uid]",
  value: "Casa Central"
});

// 4. Hacer clic en botón Ingresar
await mcp_chrome.click({
  uid: "[boton-ingresar-uid]"
});

// 5. Esperar a que cargue el dashboard
await mcp_chrome.wait_for({
  text: "Punto de Venta",
  timeout: 5000
});
```

**Resultado esperado:**
- Login exitoso
- Dashboard visible
- Menú de navegación presente

---

#### **P0.3: Navegar a Punto de Venta**
```javascript
// Tomar snapshot
await mcp_chrome.take_snapshot({ verbose: false });

// Clic en menú Punto de Venta
await mcp_chrome.click({
  uid: "[menu-punto-venta-uid]"
});

// Esperar a que cargue
await mcp_chrome.wait_for({
  text: "Carrito",
  timeout: 5000
});
```

**Resultado esperado:**
- Vista de Punto de Venta cargada
- Selector de condición de venta visible
- Catálogo de productos visible
- Carrito vacío

---

## 🛒 FASE 1: FLUJOS BÁSICOS DE CARRITO

### Objetivo
Validar operaciones básicas del carrito sin cambios de tipo de pago

---

#### **P1.1: Seleccionar condición de venta inicial**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Abrir dropdown de condición de venta
await mcp_chrome.click({
  uid: "[dropdown-condicion-venta-uid]"
});

// Seleccionar EFECTIVO
await mcp_chrome.click({
  uid: "[opcion-efectivo-uid]"
});

// Esperar confirmación
await mcp_chrome.wait_for({
  text: "EFECTIVO",
  timeout: 3000
});
```

**Resultado esperado:**
- Condición de venta seleccionada: EFECTIVO
- Dropdown cerrado
- Sin errores en consola

---

#### **P1.2: Buscar y agregar producto al carrito**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Buscar producto (ejemplo: buscar por nombre)
await mcp_chrome.fill({
  uid: "[campo-busqueda-producto-uid]",
  value: "ACOPLE"
});

// Esperar resultados
await mcp_chrome.wait_for({
  text: "ACOPLE",
  timeout: 3000
});

// Hacer clic en el producto
await mcp_chrome.click({
  uid: "[producto-resultado-uid]"
});

// MODAL: Completar cantidad (si aplica)
await mcp_chrome.take_snapshot({ verbose: false });

await mcp_chrome.fill({
  uid: "[campo-cantidad-uid]",
  value: "1"
});

// Agregar al carrito
await mcp_chrome.click({
  uid: "[boton-agregar-carrito-uid]"
});

// Esperar confirmación
await mcp_chrome.wait_for({
  text: "agregado",
  timeout: 3000
});
```

**Resultado esperado:**
- Modal de producto cerrado
- Item visible en carrito
- Cantidad: 1
- Tipo de pago: EFECTIVO
- Precio visible
- Total del carrito actualizado

---

#### **P1.3: Verificar datos del item agregado**
```javascript
// Tomar snapshot del carrito
await mcp_chrome.take_snapshot({ verbose: true });

// Verificar en consola usando evaluate_script
const itemData = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    if (itemsCarrito.length === 0) return { error: 'Carrito vacío' };

    const primerItem = itemsCarrito[0];
    return {
      nomart: primerItem.nomart,
      cantidad: primerItem.cantidad,
      precio: primerItem.precio,
      cod_tar: primerItem.cod_tar,
      tiene_precon: !!primerItem.precon,
      tiene_prefi1: !!primerItem.prefi1,
      tiene_prefi2: !!primerItem.prefi2,
      tiene_prefi3: !!primerItem.prefi3,
      tiene_prefi4: !!primerItem.prefi4,
      tiene_tipo_moneda: !!primerItem.tipo_moneda,
      tiene_activadatos: primerItem.activadatos !== undefined
    };
  }`
});

console.log('📦 Datos del item:', itemData);
```

**Resultado esperado (log en consola):**
```javascript
{
  nomart: "ACOPLE FIL-AIRE...",
  cantidad: 1,
  precio: 9108.75,  // Precio de EFECTIVO
  cod_tar: "11",  // Código de EFECTIVO
  tiene_precon: true,
  tiene_prefi1: true,
  tiene_prefi2: true,
  tiene_prefi3: true,
  tiene_prefi4: true,
  tiene_tipo_moneda: true,
  tiene_activadatos: true
}
```

✅ **VALIDACIÓN CRÍTICA**: Todos los precios (precon, prefi1-4) deben estar presentes

---

#### **P1.4: Modificar cantidad del item**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Localizar input de cantidad
await mcp_chrome.fill({
  uid: "[input-cantidad-item-uid]",
  value: "2"
});

// Esperar actualización (puede ser automática o requerir blur)
await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar actualización
const totalActualizado = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    return {
      cantidad_item: itemsCarrito[0]?.cantidad,
      precio_unitario: itemsCarrito[0]?.precio,
      subtotal: itemsCarrito[0]?.cantidad * itemsCarrito[0]?.precio
    };
  }`
});

console.log('🔢 Cantidad actualizada:', totalActualizado);
```

**Resultado esperado:**
- Cantidad del item: 2
- Subtotal: precio × 2
- Total general actualizado

---

#### **P1.5: Eliminar item del carrito**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Hacer clic en botón eliminar
await mcp_chrome.click({
  uid: "[boton-eliminar-item-uid]"
});

// Esperar confirmación (SweetAlert2)
await mcp_chrome.wait_for({
  text: "¿Está seguro",
  timeout: 2000
});

// Confirmar eliminación
await mcp_chrome.click({
  uid: "[boton-confirmar-eliminar-uid]"
});

// Esperar que el item desaparezca
await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar carrito vacío
const carritoVacio = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    return itemsCarrito.length === 0;
  }`
});

console.log('🗑️ Carrito vacío:', carritoVacio);
```

**Resultado esperado:**
- Item eliminado del carrito
- Carrito vacío
- Total: $0.00

---

## 🔄 FASE 2: SELECTOR DE TIPO DE PAGO - CAMBIOS SIMPLES

### Objetivo
Validar cambios de tipo de pago **dentro del mismo activadatos** (sin activar modo consulta)

### Pre-requisito
Agregar item con EFECTIVO (activadatos=0)

---

#### **P2.1: Agregar item con EFECTIVO**
```javascript
// Repetir P1.2 para agregar item
// ... (código de agregar producto)

// Verificar que el item tenga EFECTIVO
const itemInicial = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    return {
      cod_tar: itemsCarrito[0]?.cod_tar,
      precio: itemsCarrito[0]?.precio,
      activadatos: itemsCarrito[0]?.activadatos
    };
  }`
});

console.log('💰 Item inicial:', itemInicial);
```

**Resultado esperado:**
- cod_tar: "11" (EFECTIVO)
- activadatos: 0
- precio: valor de precon

---

#### **P2.2: Cambiar a CUENTA CORRIENTE (mismo activadatos=0)**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Abrir dropdown de tipo de pago del item
await mcp_chrome.click({
  uid: "[dropdown-tipo-pago-item-uid]"
});

// Esperar que se abra
await new Promise(resolve => setTimeout(resolve, 500));

// Seleccionar CUENTA CORRIENTE
await mcp_chrome.click({
  uid: "[opcion-cuenta-corriente-uid]"
});

// Esperar actualización
await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar resultado
const itemActualizado = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const item = itemsCarrito[0];
    return {
      cod_tar: item?.cod_tar,
      precio: item?.precio,
      _soloConsulta: item?._soloConsulta,
      activadatos_anterior: item?.activadatos
    };
  }`
});

console.log('🔄 Cambio dentro mismo activadatos:', itemActualizado);
```

**Resultado esperado:**
- cod_tar: "111" (CUENTA CORRIENTE)
- precio: SIN CAMBIO (mismo precon)
- **_soloConsulta: undefined o false** ← CRÍTICO
- NO debe aparecer badge "SOLO CONSULTA"
- NO debe aparecer alerta de SweetAlert2

---

## ⚠️ FASE 3: MODO CONSULTA - ACTIVACIÓN Y DESACTIVACIÓN

### Objetivo
Validar que el modo "SOLO CONSULTA" se active al cambiar entre activadatos diferentes

### Pre-requisito
Item en carrito con EFECTIVO (activadatos=0)

---

#### **P3.1: Cambiar de EFECTIVO a ELECTRON (activadatos 0→1)**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Capturar datos ANTES del cambio
const antesDelCambio = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const item = itemsCarrito[0];
    return {
      cod_tar_antes: item?.cod_tar,
      precio_antes: item?.precio,
      activadatos_antes: item?.activadatos
    };
  }`
});

console.log('📸 ANTES del cambio:', antesDelCambio);

// Abrir dropdown de tipo de pago
await mcp_chrome.click({
  uid: "[dropdown-tipo-pago-item-uid]"
});

await new Promise(resolve => setTimeout(resolve, 500));

// Seleccionar ELECTRON (activadatos=1)
await mcp_chrome.click({
  uid: "[opcion-electron-uid]"
});

// Esperar alerta de SweetAlert2
await mcp_chrome.wait_for({
  text: "Precio de consulta",
  timeout: 3000
});

// Tomar screenshot del alert
await mcp_chrome.take_screenshot({
  filePath: "C:/temp/alert_modo_consulta.png"
});

// Cerrar alert
await mcp_chrome.click({
  uid: "[boton-entendido-swal-uid]"
});

// Esperar que cierre
await new Promise(resolve => setTimeout(resolve, 1000));

// Capturar datos DESPUÉS del cambio
const despuesDelCambio = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const item = itemsCarrito[0];
    return {
      cod_tar_despues: item?.cod_tar,
      precio_despues: item?.precio,
      _soloConsulta: item?._soloConsulta,
      _tipoPagoOriginal: item?._tipoPagoOriginal,
      _precioOriginal: item?._precioOriginal,
      _activadatosOriginal: item?._activadatosOriginal,
      _nombreTipoPagoOriginal: item?._nombreTipoPagoOriginal
    };
  }`
});

console.log('📸 DESPUÉS del cambio:', despuesDelCambio);
```

**Resultado esperado:**
```javascript
// ANTES
{
  cod_tar_antes: "11",  // EFECTIVO
  precio_antes: 9108.75,
  activadatos_antes: 0
}

// DESPUÉS
{
  cod_tar_despues: "1",  // ELECTRON
  precio_despues: 10019.625,  // Precio con tarjeta (prefi1 o prefi2)
  _soloConsulta: true,  // ← CRÍTICO
  _tipoPagoOriginal: "11",  // Guardado
  _precioOriginal: 9108.75,  // Guardado
  _activadatosOriginal: 0,  // Guardado
  _nombreTipoPagoOriginal: "EFECTIVO"  // Guardado
}
```

**Validaciones visuales:**
- ✅ Badge "SOLO CONSULTA" visible en el item
- ✅ Fila del item con fondo amarillo
- ✅ Botón "Revertir" visible
- ✅ Alert de SweetAlert2 mostrado con información correcta

---

#### **P3.2: Verificar que totales se actualizan**
```javascript
// Verificar totales
const totales = await mcp_chrome.evaluate_script({
  function: `() => {
    return {
      hayItemsEnConsulta: document.querySelector('.badge-warning')?.textContent?.includes('CONSULTA'),
      totalReal: document.querySelector('.total-price')?.textContent,
      totalTemporal: document.querySelector('.total-price-temporal')?.textContent,
      subtotalesTemporales: document.querySelectorAll('.subtotal-temporal').length
    };
  }`
});

console.log('💰 Totales:', totales);
```

**Resultado esperado:**
- hayItemsEnConsulta: true
- totalReal: Precio original (EFECTIVO)
- totalTemporal: Precio con ELECTRON (mayor)
- subtotalesTemporales: > 0

---

#### **P3.3: Cambiar entre tarjetas (mismo activadatos=1)**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Cambiar de ELECTRON a VISA (ambos activadatos=1)
await mcp_chrome.click({
  uid: "[dropdown-tipo-pago-item-uid]"
});

await new Promise(resolve => setTimeout(resolve, 500));

await mcp_chrome.click({
  uid: "[opcion-visa-uid]"
});

await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar que MANTIENE datos originales
const mantieneDatosOriginales = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const item = itemsCarrito[0];
    return {
      cod_tar_actual: item?.cod_tar,
      _soloConsulta: item?._soloConsulta,
      _tipoPagoOriginal: item?._tipoPagoOriginal,  // Debe ser "11" (EFECTIVO)
      _precioOriginal: item?._precioOriginal  // Debe ser precio EFECTIVO
    };
  }`
});

console.log('🔄 Cambio entre tarjetas:', mantieneDatosOriginales);
```

**Resultado esperado:**
- cod_tar_actual: código de VISA
- _soloConsulta: **true** (mantiene)
- _tipoPagoOriginal: **"11"** (EFECTIVO, NO cambió a ELECTRON)
- _precioOriginal: **precio EFECTIVO** (NO cambió)

✅ **VALIDACIÓN CRÍTICA**: Los datos originales deben ser del PRIMER método (EFECTIVO), no del segundo (ELECTRON)

---

#### **P3.4: Volver a activadatos=0 (debe quitar marca)**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Cambiar de VISA a TRANSFERENCIA EFECTIVO (activadatos=0)
await mcp_chrome.click({
  uid: "[dropdown-tipo-pago-item-uid]"
});

await new Promise(resolve => setTimeout(resolve, 500));

await mcp_chrome.click({
  uid: "[opcion-transferencia-efectivo-uid]"
});

await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar que SE QUITA marca de consulta
const marcaQuitada = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const item = itemsCarrito[0];
    return {
      cod_tar: item?.cod_tar,
      _soloConsulta: item?._soloConsulta,
      tiene_tipoPagoOriginal: item?._tipoPagoOriginal !== undefined,
      tiene_precioOriginal: item?._precioOriginal !== undefined
    };
  }`
});

console.log('✅ Marca quitada:', marcaQuitada);
```

**Resultado esperado:**
- cod_tar: código de TRANSFERENCIA EFECTIVO
- _soloConsulta: **undefined o false**
- tiene_tipoPagoOriginal: **false**
- tiene_precioOriginal: **false**
- Badge "SOLO CONSULTA": **NO visible**
- Botón "Revertir": **NO visible**

---

## 📊 FASE 4: TOTALES TEMPORALES Y CÁLCULOS

### Objetivo
Validar que los totales temporales se calculen correctamente

### Pre-requisito
Tener al menos 1 item en modo consulta

---

#### **P4.1: Agregar segundo item (sin consulta)**
```javascript
// Agregar otro producto con EFECTIVO
// ... (repetir flujo P1.2)

await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar que hay 2 items
const cantidadItems = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    return {
      total_items: itemsCarrito.length,
      item1_soloConsulta: itemsCarrito[0]?._soloConsulta,
      item2_soloConsulta: itemsCarrito[1]?._soloConsulta
    };
  }`
});

console.log('📦 Items en carrito:', cantidadItems);
```

**Resultado esperado:**
- total_items: 2
- item1_soloConsulta: true (en consulta)
- item2_soloConsulta: false o undefined (normal)

---

#### **P4.2: Verificar cálculo de totales**
```javascript
// Calcular manualmente los totales esperados
const totalesCalculados = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');

    let totalReal = 0;
    let totalTemporal = 0;

    itemsCarrito.forEach(item => {
      const cantidad = item.cantidad || 1;

      // Total real usa precios originales
      const precioReal = item._soloConsulta ? item._precioOriginal : item.precio;
      totalReal += precioReal * cantidad;

      // Total temporal usa precios actuales
      totalTemporal += item.precio * cantidad;
    });

    return {
      totalRealCalculado: totalReal.toFixed(2),
      totalTemporalCalculado: totalTemporal.toFixed(2),
      diferencia: (totalTemporal - totalReal).toFixed(2)
    };
  }`
});

console.log('💰 Totales calculados:', totalesCalculados);

// Comparar con totales mostrados en pantalla
const totalesPantalla = await mcp_chrome.evaluate_script({
  function: `() => {
    const totalRealText = document.querySelector('.total-price')?.textContent || '';
    const totalTemporalText = document.querySelector('.total-price-temporal')?.textContent || '';

    // Extraer números (eliminar $, comas, etc.)
    const extractNumber = (text) => {
      const match = text.match(/[\d,]+\.?\d*/);
      return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
    };

    return {
      totalRealPantalla: extractNumber(totalRealText).toFixed(2),
      totalTemporalPantalla: extractNumber(totalTemporalText).toFixed(2)
    };
  }`
});

console.log('💰 Totales en pantalla:', totalesPantalla);

// Comparación
const coinciden =
  totalesCalculados.totalRealCalculado === totalesPantalla.totalRealPantalla &&
  totalesCalculados.totalTemporalCalculado === totalesPantalla.totalTemporalPantalla;

console.log('✅ Totales coinciden:', coinciden);
```

**Resultado esperado:**
- coinciden: **true**
- Diferencia entre total real y temporal > 0 (porque hay item en consulta con mayor precio)

---

#### **P4.3: Verificar subtotales por tipo de pago**
```javascript
const subtotales = await mcp_chrome.evaluate_script({
  function: `() => {
    // Subtotales reales
    const subtotalesReales = Array.from(
      document.querySelectorAll('.subtotales-section:not(.subtotales-temporales) .subtotal-item')
    ).map(el => ({
      tipo: el.querySelector('.subtotal-tipo')?.textContent?.trim(),
      monto: el.querySelector('.subtotal-monto')?.textContent?.trim()
    }));

    // Subtotales temporales
    const subtotalesTemporales = Array.from(
      document.querySelectorAll('.subtotales-temporales .subtotal-item')
    ).map(el => ({
      tipo: el.querySelector('.subtotal-tipo')?.textContent?.trim(),
      monto: el.querySelector('.subtotal-monto')?.textContent?.trim(),
      esSimulado: el.querySelector('.badge-warning')?.textContent?.includes('SIMULADO') || false
    }));

    return {
      reales: subtotalesReales,
      temporales: subtotalesTemporales
    };
  }`
});

console.log('📊 Subtotales:', subtotales);
```

**Resultado esperado:**
- Subtotales reales: agrupados por tipo de pago ORIGINAL
- Subtotales temporales: agrupados por tipo de pago ACTUAL
- Al menos un subtotal temporal debe tener badge "SIMULADO"

---

## 🚫 FASE 5: VALIDACIÓN DE FINALIZACIÓN

### Objetivo
Validar que el sistema bloquee correctamente la finalización con items en consulta

---

#### **P5.1: Intentar finalizar con item en consulta**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Verificar que botón Finalizar está deshabilitado
const botonDeshabilitado = await mcp_chrome.evaluate_script({
  function: `() => {
    const botonFinalizar = document.querySelector('button[label*="Finalizar"]') ||
                          document.querySelector('button:has-text("Finalizar")');
    return botonFinalizar?.disabled || false;
  }`
});

console.log('🔒 Botón Finalizar deshabilitado:', botonDeshabilitado);

// Si no está deshabilitado, hacer clic para ver validación
if (!botonDeshabilitado) {
  await mcp_chrome.click({
    uid: "[boton-finalizar-uid]"
  });

  // Esperar alerta de error
  await mcp_chrome.wait_for({
    text: "Items en modo consulta",
    timeout: 3000
  });

  // Tomar screenshot del error
  await mcp_chrome.take_screenshot({
    filePath: "C:/temp/error_finalizar_con_consulta.png"
  });

  // Cerrar alerta
  await mcp_chrome.click({
    uid: "[boton-entendido-swal-uid]"
  });
}
```

**Resultado esperado:**
- Botón Finalizar: deshabilitado O
- Alert de error con mensaje: "No se puede finalizar la venta porque hay X item(s) marcado(s) como SOLO CONSULTA"
- Alert debe listar los items en consulta
- Alert debe indicar acciones disponibles (Revertir o Eliminar)

---

## ↩️ FASE 6: BOTÓN REVERTIR

### Objetivo
Validar que el botón "Revertir" restaure correctamente el item a su estado original

---

#### **P6.1: Revertir item a método original**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Capturar estado ANTES de revertir
const antesRevertir = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const item = itemsCarrito[0];
    return {
      cod_tar_actual: item?.cod_tar,
      precio_actual: item?.precio,
      _soloConsulta: item?._soloConsulta,
      _tipoPagoOriginal: item?._tipoPagoOriginal,
      _precioOriginal: item?._precioOriginal
    };
  }`
});

console.log('📸 ANTES de revertir:', antesRevertir);

// Hacer clic en botón Revertir
await mcp_chrome.click({
  uid: "[boton-revertir-uid]"
});

// Esperar confirmación de SweetAlert2
await mcp_chrome.wait_for({
  text: "¿Revertir a método original?",
  timeout: 3000
});

// Tomar screenshot de confirmación
await mcp_chrome.take_screenshot({
  filePath: "C:/temp/confirmacion_revertir.png"
});

// Confirmar
await mcp_chrome.click({
  uid: "[boton-confirmar-revertir-uid]"
});

// Esperar éxito
await mcp_chrome.wait_for({
  text: "Revertido",
  timeout: 3000
});

// Cerrar alerta de éxito
await mcp_chrome.click({
  uid: "[boton-ok-swal-uid]"
});

await new Promise(resolve => setTimeout(resolve, 1000));

// Capturar estado DESPUÉS de revertir
const despuesRevertir = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const item = itemsCarrito[0];
    return {
      cod_tar_restaurado: item?.cod_tar,
      precio_restaurado: item?.precio,
      _soloConsulta: item?._soloConsulta,
      tiene_tipoPagoOriginal: item?._tipoPagoOriginal !== undefined
    };
  }`
});

console.log('📸 DESPUÉS de revertir:', despuesRevertir);
```

**Resultado esperado:**
```javascript
// ANTES
{
  cod_tar_actual: "1",  // ELECTRON
  precio_actual: 10019.625,
  _soloConsulta: true,
  _tipoPagoOriginal: "11",  // EFECTIVO
  _precioOriginal: 9108.75
}

// DESPUÉS
{
  cod_tar_restaurado: "11",  // ← Restaurado a EFECTIVO
  precio_restaurado: 9108.75,  // ← Restaurado
  _soloConsulta: undefined o false,  // ← Limpiado
  tiene_tipoPagoOriginal: false  // ← Limpiado
}
```

**Validaciones visuales:**
- Badge "SOLO CONSULTA": **NO visible**
- Botón "Revertir": **NO visible**
- Tipo de pago en dropdown: **EFECTIVO**
- Totales temporales: **NO visibles** (o iguales a totales reales)

---

## 🔀 FASE 7: MÚLTIPLES ITEMS Y ESCENARIOS COMPLEJOS

### Objetivo
Validar comportamiento con múltiples items en diferentes estados

---

#### **P7.1: Escenario complejo - 3 items**
```javascript
// Preparación: Tener 3 items
// Item 1: EFECTIVO (normal)
// Item 2: ELECTRON (en consulta)
// Item 3: TRANSFERENCIA (normal)

// Agregar items...
// ... (código de agregar productos)

// Verificar estado
const estadoComplejo = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    return itemsCarrito.map((item, idx) => ({
      indice: idx,
      nomart: item.nomart?.substring(0, 30),
      cod_tar: item.cod_tar,
      precio: item.precio,
      _soloConsulta: item._soloConsulta || false
    }));
  }`
});

console.log('📦 Estado complejo:', estadoComplejo);
```

**Resultado esperado:**
- 3 items en carrito
- Solo 1 con _soloConsulta: true
- Totales temporales visibles
- Botón Finalizar deshabilitado

---

#### **P7.2: Cambiar cantidad de item en consulta**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Identificar el item en consulta (índice 1)
// Cambiar su cantidad de 1 a 3
await mcp_chrome.fill({
  uid: "[input-cantidad-item-consulta-uid]",
  value: "3"
});

await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar que totales se recalculan correctamente
const totalesRecalculados = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const itemConsulta = itemsCarrito.find(i => i._soloConsulta);

    if (!itemConsulta) return { error: 'No hay item en consulta' };

    return {
      cantidad_nueva: itemConsulta.cantidad,
      precio_unitario: itemConsulta.precio,
      subtotal_temporal: itemConsulta.cantidad * itemConsulta.precio,
      precio_original: itemConsulta._precioOriginal,
      subtotal_real: itemConsulta.cantidad * itemConsulta._precioOriginal
    };
  }`
});

console.log('🔢 Totales recalculados:', totalesRecalculados);
```

**Resultado esperado:**
- cantidad_nueva: 3
- subtotal_temporal: precio × 3
- subtotal_real: precio_original × 3
- Totales generales actualizados correctamente

---

#### **P7.3: Eliminar item en consulta**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Eliminar el item que está en consulta
await mcp_chrome.click({
  uid: "[boton-eliminar-item-consulta-uid]"
});

// Confirmar
await mcp_chrome.wait_for({
  text: "¿Está seguro",
  timeout: 2000
});

await mcp_chrome.click({
  uid: "[boton-confirmar-eliminar-uid]"
});

await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar que ya no hay items en consulta
const sinItemsConsulta = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const hayConsulta = itemsCarrito.some(i => i._soloConsulta);
    return {
      total_items: itemsCarrito.length,
      hay_items_en_consulta: hayConsulta
    };
  }`
});

console.log('✅ Sin items en consulta:', sinItemsConsulta);
```

**Resultado esperado:**
- total_items: 2 (quedan los normales)
- hay_items_en_consulta: **false**
- Totales temporales: **NO visibles**
- Botón Finalizar: **HABILITADO**

---

## ✅ FASE 8: VENTA EXITOSA COMPLETA

### Objetivo
Validar que una venta sin items en consulta se procese correctamente

### Pre-requisito
Carrito con items normales (sin consulta)

---

#### **P8.1: Preparar venta**
```javascript
// Asegurar que no hay items en consulta
const carritoLimpio = await mcp_chrome.evaluate_script({
  function: `() => {
    const itemsCarrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    const hayConsulta = itemsCarrito.some(i => i._soloConsulta);
    return {
      total_items: itemsCarrito.length,
      hay_consulta: hayConsulta,
      puede_finalizar: itemsCarrito.length > 0 && !hayConsulta
    };
  }`
});

console.log('🛒 Carrito preparado:', carritoLimpio);
```

**Resultado esperado:**
- total_items: > 0
- hay_consulta: false
- puede_finalizar: true

---

#### **P8.2: Seleccionar cliente**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Abrir selector de cliente
await mcp_chrome.click({
  uid: "[dropdown-cliente-uid]"
});

await new Promise(resolve => setTimeout(resolve, 500));

// Seleccionar cliente de prueba
await mcp_chrome.click({
  uid: "[opcion-cliente-uid]"
});

await new Promise(resolve => setTimeout(resolve, 1000));
```

---

#### **P8.3: Finalizar venta**
```javascript
await mcp_chrome.take_snapshot({ verbose: false });

// Verificar que botón está habilitado
const botonHabilitado = await mcp_chrome.evaluate_script({
  function: `() => {
    const botonFinalizar = document.querySelector('button[label*="Finalizar"]');
    return !botonFinalizar?.disabled;
  }`
});

console.log('✅ Botón habilitado:', botonHabilitado);

// Hacer clic en Finalizar
await mcp_chrome.click({
  uid: "[boton-finalizar-uid]"
});

// Esperar procesamiento (puede tardar varios segundos)
await new Promise(resolve => setTimeout(resolve, 5000));

// Verificar éxito
const ventaExitosa = await mcp_chrome.evaluate_script({
  function: `() => {
    // Buscar indicadores de éxito
    const alertaExito = document.querySelector('.swal2-success') !== null;
    const carritoVacio = JSON.parse(sessionStorage.getItem('carrito') || '[]').length === 0;

    return {
      alerta_exito: alertaExito,
      carrito_vacio: carritoVacio
    };
  }`
});

console.log('💰 Venta exitosa:', ventaExitosa);
```

**Resultado esperado:**
- alerta_exito: true
- carrito_vacio: true
- Mensaje de confirmación visible
- Número de comprobante generado

---

#### **P8.4: Verificar consola del navegador**
```javascript
// Listar mensajes de consola
const mensajesConsola = await mcp_chrome.list_console_messages({
  types: ["error", "warn"],
  pageSize: 50
});

console.log('📋 Mensajes de consola:', mensajesConsola);
```

**Resultado esperado:**
- **0 errores** relacionados con el carrito
- **0 warnings** críticos de type coercion
- Posibles warnings informativos están OK

---

#### **P8.5: Verificar datos enviados al backend (opcional)**
```javascript
// Interceptar última request al backend
const ultimaRequest = await mcp_chrome.list_network_requests({
  resourceTypes: ["xhr", "fetch"],
  pageSize: 10
});

console.log('🌐 Requests recientes:', ultimaRequest);

// Buscar request de finalizar venta
// Verificar que NO contenga campos prohibidos
```

**Resultado esperado:**
- Request exitosa (status 200)
- Payload NO contiene: `precon`, `prefi1-4`, `tipo_moneda`, `activadatos`, `_soloConsulta`
- Payload SÍ contiene: `idart`, `cantidad`, `precio`, `cod_tar`, `nomart`

---

## 📝 CHECKLIST DE VALIDACIÓN FINAL

Marcar cada validación crítica:

### Funcionalidades Básicas
- [ ] Login exitoso con credenciales proporcionadas
- [ ] Navegación a Punto de Venta
- [ ] Selección de condición de venta (EFECTIVO)
- [ ] Búsqueda de productos
- [ ] Agregar producto al carrito
- [ ] Item agregado con todos los precios (precon, prefi1-4)
- [ ] Modificar cantidad
- [ ] Eliminar item

### Selector de Tipo de Pago
- [ ] Dropdown visible en cada item
- [ ] Cambio dentro mismo activadatos NO marca consulta
- [ ] Precio se actualiza según listaprecio correcto

### Modo Consulta
- [ ] Cambio entre activadatos diferentes MARCA como consulta
- [ ] Alert informativo se muestra correctamente
- [ ] Badge "SOLO CONSULTA" visible
- [ ] Botón "Revertir" visible
- [ ] Datos originales guardados correctamente
- [ ] Múltiples cambios mantienen datos del PRIMER método
- [ ] Volver a activadatos original QUITA marca

### Totales Temporales
- [ ] Total Real usa precios originales
- [ ] Total Temporal usa precios actuales
- [ ] Subtotales Reales agrupados por tipo original
- [ ] Subtotales Temporales agrupados por tipo actual
- [ ] Badge "SIMULADO" visible en subtotales diferentes
- [ ] Totales se recalculan al cambiar cantidad

### Validaciones de Finalización
- [ ] Botón Finalizar deshabilitado con items en consulta
- [ ] Alert de error al intentar finalizar
- [ ] Alert lista items en consulta
- [ ] Botón Finalizar habilitado sin items en consulta

### Botón Revertir
- [ ] Confirmación se muestra correctamente
- [ ] Item restaurado a método original
- [ ] Precio restaurado
- [ ] Marca de consulta eliminada
- [ ] Botón "Revertir" desaparece

### Escenarios Complejos
- [ ] Múltiples items normales funcionan
- [ ] Mezcla de items normales y en consulta funciona
- [ ] Cambiar cantidad de item en consulta recalcula
- [ ] Eliminar item en consulta actualiza estado

### Venta Exitosa
- [ ] Venta sin consultas se procesa correctamente
- [ ] Carrito se vacía al finalizar
- [ ] Mensaje de confirmación visible
- [ ] Número de comprobante generado
- [ ] Sin errores en consola
- [ ] Payload enviado es correcto (whitelist)

### Validaciones de Datos
- [ ] Sin errores de "listaprecio desconocido"
- [ ] Sin errores de type coercion
- [ ] Sin errores de "columna no existe"
- [ ] Campos prohibidos NO enviados al backend

---

## 🎯 CRITERIOS DE APROBACIÓN

### ✅ Sistema APROBADO para producción si:

1. **100% de pruebas básicas pasan** (FASE 1)
2. **100% de pruebas de modo consulta pasan** (FASE 3)
3. **100% de validaciones de finalización pasan** (FASE 5)
4. **Botón Revertir funciona correctamente** (FASE 6)
5. **Al menos 1 venta completa exitosa** (FASE 8)
6. **0 errores críticos en consola**
7. **Payload enviado al backend es correcto**

### ⚠️ Requiere correcciones si:

- Alguna prueba de FASE 3 (Modo Consulta) falla
- Alguna prueba de FASE 5 (Validación) falla
- Aparecen errores de type coercion
- Se envían campos prohibidos al backend
- Totales temporales no coinciden con cálculos

### 🔴 NO aprobar para producción si:

- Errores de "columna no existe" en BD
- Venta exitosa no se procesa
- Datos incorrectos se guardan en BD
- Modo consulta no se activa/desactiva correctamente

---

## 📊 TEMPLATE DE REPORTE DE RESULTADOS

```
REPORTE DE PRUEBAS AUTOMATIZADAS
================================

Fecha de ejecución: [FECHA]
Ejecutado por: [NOMBRE]
Versión probada: v4.0
Navegador: Chrome [VERSIÓN]

RESUMEN EJECUTIVO
-----------------
Total de pruebas: X
Pasadas: X
Fallidas: X
Bloqueadas: X
Tasa de éxito: X%

RESULTADOS POR FASE
-------------------
FASE 0: [✅/❌] - [Comentarios]
FASE 1: [✅/❌] - [Comentarios]
FASE 2: [✅/❌] - [Comentarios]
FASE 3: [✅/❌] - [Comentarios]
FASE 4: [✅/❌] - [Comentarios]
FASE 5: [✅/❌] - [Comentarios]
FASE 6: [✅/❌] - [Comentarios]
FASE 7: [✅/❌] - [Comentarios]
FASE 8: [✅/❌] - [Comentarios]

ERRORES ENCONTRADOS
-------------------
1. [Descripción del error]
   - Severidad: [Crítica/Alta/Media/Baja]
   - Pasos para reproducir: [...]
   - Screenshot: [ruta]

2. [...]

VALIDACIONES CRÍTICAS
---------------------
✅ Modo consulta se activa correctamente
✅ Datos originales se preservan
✅ Totales temporales calculan bien
✅ Finalización bloqueada con consultas
✅ Botón Revertir funciona
✅ Venta exitosa se procesa
✅ Sin errores en consola
✅ Payload correcto al backend

RECOMENDACIÓN FINAL
-------------------
[✅ APROBAR / ⚠️ APROBAR CON RESERVAS / ❌ NO APROBAR]

Justificación:
[...]

Firma: ______________
```

---

## 🔧 NOTAS TÉCNICAS PARA EJECUCIÓN

### Variables a ajustar según ambiente

```javascript
// URL base de la aplicación
const BASE_URL = "http://localhost:4200";  // Cambiar según ambiente

// Tiempos de espera (pueden variar según hardware)
const TIMEOUT_CORTO = 1000;    // 1 segundo
const TIMEOUT_MEDIO = 3000;    // 3 segundos
const TIMEOUT_LARGO = 5000;    // 5 segundos
const TIMEOUT_PROCESAMIENTO = 10000;  // 10 segundos (finalizar venta)

// Ruta para screenshots
const SCREENSHOT_PATH = "C:/temp/";  // Ajustar según SO
```

### UIDs dinámicos

**IMPORTANTE**: Los UIDs de elementos (`[campo-email-uid]`, etc.) deben obtenerse mediante `take_snapshot()` al momento de ejecución, ya que pueden variar entre renders.

**Proceso recomendado:**
1. Ejecutar `take_snapshot({ verbose: true })`
2. Localizar el elemento en el output
3. Copiar su UID
4. Usar en el siguiente comando

### Manejo de errores

Envolver bloques críticos en try-catch:

```javascript
try {
  await mcp_chrome.click({ uid: "[elemento-uid]" });
} catch (error) {
  console.error('❌ Error al hacer clic:', error);
  await mcp_chrome.take_screenshot({
    filePath: `${SCREENSHOT_PATH}error_${Date.now()}.png`
  });
  // Decidir si continuar o abortar
}
```

---

## 📚 REFERENCIAS

- **Informe de implementación**: `Informe_implementacion_simul_precios.md`
- **Correcciones aplicadas**: `correcciones_aplicadas_codtar.md`
- **Plan v4.0**: `plan_v4.0.md`, `viabilidad_plan_planselecttipopago_FINAL_CORREGIDO2.md`
- **Documentación MCP Chrome**: [Link a docs]

---

**FIN DEL PLAN DE PRUEBAS AUTOMATIZADAS**

**Estado:** ✅ Listo para ejecución
**Próximo paso:** Ejecutar FASE 0 y validar credenciales de acceso

---
