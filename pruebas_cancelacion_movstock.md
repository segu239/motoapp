# PRUEBAS AUTOMATIZADAS - Sistema de Cancelación/Rechazo MOV.STOCK
## Validación con MCP Chrome DevTools

**Fecha**: 2025-11-01
**Versión**: 1.0
**Sistema**: MOV.STOCK - Cancelación y Rechazo de Pedidos
**Herramienta**: MCP Chrome DevTools
**URL Base**: `https://motoapp.loclx.io`

---

## ÍNDICE

1. [Objetivo](#objetivo)
2. [Precondiciones](#precondiciones)
3. [Configuración Inicial](#configuración-inicial)
4. [Escenario 1: Rechazo de Solicitud](#escenario-1-rechazo-de-solicitud)
5. [Escenario 2: Cancelación por Solicitante](#escenario-2-cancelación-por-solicitante)
6. [Escenario 3: Permisos por Rol](#escenario-3-permisos-por-rol)
7. [Resumen de Validaciones](#resumen-de-validaciones)

---

## OBJETIVO

Validar automáticamente con MCP Chrome DevTools que:
- ✅ Los pedidos rechazados aparecen en **ROJO** en la sucursal solicitante
- ✅ El motivo del rechazo es visible en la columna "Observacion"
- ✅ La leyenda de colores se muestra correctamente
- ✅ Los botones aparecen según permisos y estados
- ✅ Los estados de cancelación funcionan correctamente

---

## PRECONDICIONES

### Datos de Prueba

**Sucursales:**
- Sucursal Solicitante: Casa Central (ID: 1)
- Sucursal Destinataria: Valle Viejo (ID: 2)

**Usuarios:**
- Usuario con rol ADMIN o SUPER (para rechazar)
- Usuario normal (para solicitar)

**Artículo de Prueba:**
- ID: `7323`
- Descripción: `ACEL. RAP. MDA 3010 6470`

---

## CONFIGURACIÓN INICIAL

### Paso Inicial: Abrir el Sistema

```bash
# En Claude Code, ejecutar:
mcp__chrome-devtools__navigate_page con url: "https://motoapp.loclx.io"
```

---

## ESCENARIO 1: Rechazo de Solicitud

### Objetivo
Validar el flujo completo: Solicitud → Rechazo → Visualización con color rojo

---

### PASO 1.1: Login en Sucursal SOLICITANTE (Manual)

**🔴 ACCIÓN MANUAL REQUERIDA:**

Por favor, realiza login en:
- **Sucursal**: Casa Central
- **Usuario**: [Tu usuario]
- **Presiona ENTER** cuando hayas completado el login

---

### PASO 1.2: Crear Solicitud de Stock (Automatizado)

```javascript
// Navegar a Pedir Stock
await new Promise(r => setTimeout(r, 2000));

// Buscar en el menú lateral
const links = Array.from(document.querySelectorAll('a'));
const pedirStockLink = links.find(a => a.textContent.includes('Pedir Stock'));
if (pedirStockLink) {
    pedirStockLink.click();
    console.log('✅ Navegado a Pedir Stock');
} else {
    console.error('❌ No se encontró el link de Pedir Stock');
}

await new Promise(r => setTimeout(r, 3000));

// Buscar artículo 7323
const searchInput = document.querySelector('input[type="text"][placeholder*="Buscar"]');
if (searchInput) {
    searchInput.value = '7323';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Buscando artículo 7323');
}

await new Promise(r => setTimeout(r, 2000));

// Seleccionar primera fila
const firstRow = document.querySelector('p-table tbody tr');
if (firstRow) {
    firstRow.click();
    console.log('✅ Fila seleccionada');
}

await new Promise(r => setTimeout(r, 1000));

// Llenar cantidad
const cantidadInput = document.querySelector('input#cantidad');
if (cantidadInput) {
    cantidadInput.value = '1';
    cantidadInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Cantidad: 1');
}

// Llenar comentario
const comentarioInput = document.querySelector('input#comentario');
if (comentarioInput) {
    comentarioInput.value = 'PRUEBA AUTOMATIZADA - Para rechazar';
    comentarioInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Comentario ingresado');
}

// Click en Solicitar
const btnSolicitar = document.querySelector('p-button[label*="Solicitar"] button');
if (btnSolicitar) {
    btnSolicitar.click();
    console.log('✅ Click en Solicitar');
}

await new Promise(r => setTimeout(r, 1500));

// Confirmar SweetAlert
const swalConfirm = document.querySelector('.swal2-confirm');
if (swalConfirm) {
    swalConfirm.click();
    console.log('✅ Solicitud confirmada');
}

await new Promise(r => setTimeout(r, 2000));
console.log('✅ PASO 1.2 COMPLETADO');
```

**VALIDACIÓN:**
- ✅ Debe aparecer mensaje "Pedido registrado exitosamente"

---

### PASO 1.3: Verificar Pedido Creado (Automatizado)

```javascript
// Navegar a Pedidos de Stk. Pendientes
const links = Array.from(document.querySelectorAll('a'));
const pedidosPendientesLink = links.find(a => a.textContent.includes('Pedidos de Stk. pendientes'));
if (pedidosPendientesLink) {
    pedidosPendientesLink.click();
    console.log('✅ Navegado a Pedidos Pendientes');
}

await new Promise(r => setTimeout(r, 3000));

// Buscar el pedido recién creado
const rows = document.querySelectorAll('p-table tbody tr');
let pedidoEncontrado = false;
let idNumPedido = null;

for (let row of rows) {
    const text = row.textContent;
    if (text.includes('7323') && text.includes('PRUEBA AUTOMATIZADA')) {
        pedidoEncontrado = true;
        const cells = row.querySelectorAll('td');
        // El id_num suele estar en la penúltima columna
        idNumPedido = cells[cells.length - 2]?.textContent?.trim();
        console.log('✅ Pedido encontrado con ID:', idNumPedido);
        break;
    }
}

if (!pedidoEncontrado) {
    console.error('❌ No se encontró el pedido recién creado');
} else {
    console.log('✅ PASO 1.3 COMPLETADO - ID:', idNumPedido);
}
```

**RESULTADO:** Anotar el ID del pedido: `____________`

---

### PASO 1.4: Logout (Manual)

**🔴 ACCIÓN MANUAL REQUERIDA:**

Por favor:
1. Cierra sesión del sistema
2. **Presiona ENTER** cuando hayas cerrado sesión

---

### PASO 1.5: Login en Sucursal DESTINATARIA (Manual)

**🔴 ACCIÓN MANUAL REQUERIDA:**

Por favor, realiza login en:
- **Sucursal**: Valle Viejo
- **Usuario**: [Usuario ADMIN o SUPER]
- **Presiona ENTER** cuando hayas completado el login

---

### PASO 1.6: Rechazar la Solicitud (Automatizado)

```javascript
// Navegar a Envíos de Stk. Pendientes
await new Promise(r => setTimeout(r, 2000));

const links = Array.from(document.querySelectorAll('a'));
const enviosPendientesLink = links.find(a => a.textContent.includes('Envíos de Stk. pendientes'));
if (enviosPendientesLink) {
    enviosPendientesLink.click();
    console.log('✅ Navegado a Envíos Pendientes');
}

await new Promise(r => setTimeout(r, 3000));

// Buscar el pedido y seleccionarlo
const rows = document.querySelectorAll('p-table tbody tr');
let pedidoEncontrado = false;

for (let row of rows) {
    const text = row.textContent;
    if (text.includes('7323') && text.includes('PRUEBA AUTOMATIZADA')) {
        const checkbox = row.querySelector('p-tablecheckbox input, input[type="checkbox"]');
        if (checkbox) {
            checkbox.click();
            pedidoEncontrado = true;
            console.log('✅ Pedido seleccionado para rechazar');
            break;
        }
    }
}

if (!pedidoEncontrado) {
    console.error('❌ No se encontró el pedido');
}

await new Promise(r => setTimeout(r, 1000));

// Click en botón Rechazar
const btnRechazar = document.querySelector('p-button[label="Rechazar"] button');
if (btnRechazar) {
    console.log('✅ Botón Rechazar encontrado');
    btnRechazar.click();
} else {
    console.error('❌ Botón Rechazar NO encontrado - Verificar permisos');
}

await new Promise(r => setTimeout(r, 1500));

// Ingresar motivo del rechazo
const swalTextarea = document.querySelector('.swal2-textarea');
if (swalTextarea) {
    swalTextarea.value = 'PRUEBA AUTOMATIZADA: Stock insuficiente en Valle Viejo. Rechazado para validación del sistema.';
    swalTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Motivo ingresado');
}

await new Promise(r => setTimeout(r, 500));

// Confirmar rechazo
const swalConfirm = document.querySelector('.swal2-confirm');
if (swalConfirm) {
    swalConfirm.click();
    console.log('✅ Rechazo confirmado');
}

await new Promise(r => setTimeout(r, 2000));

// Cerrar mensaje de éxito
const swalSuccess = document.querySelector('.swal2-confirm');
if (swalSuccess) {
    swalSuccess.click();
}

console.log('✅ PASO 1.6 COMPLETADO - Solicitud rechazada');
```

**VALIDACIÓN:**
- ✅ Debe aparecer "Solicitud rechazada exitosamente"
- ✅ El pedido debe desaparecer de la tabla

---

### PASO 1.7: Logout (Manual)

**🔴 ACCIÓN MANUAL REQUERIDA:**

Por favor:
1. Cierra sesión del sistema
2. **Presiona ENTER** cuando hayas cerrado sesión

---

### PASO 1.8: Login nuevamente en Sucursal SOLICITANTE (Manual)

**🔴 ACCIÓN MANUAL REQUERIDA:**

Por favor, realiza login nuevamente en:
- **Sucursal**: Casa Central
- **Usuario**: [Usuario original]
- **Presiona ENTER** cuando hayas completado el login

---

### PASO 1.9: Verificar Visualización del Rechazo (Automatizado)

**⭐ VALIDACIÓN CRÍTICA - Este es el paso más importante**

```javascript
// Navegar a Pedidos de Stk. Pendientes
await new Promise(r => setTimeout(r, 2000));

const links = Array.from(document.querySelectorAll('a'));
const pedidosPendientesLink = links.find(a => a.textContent.includes('Pedidos de Stk. pendientes'));
if (pedidosPendientesLink) {
    pedidosPendientesLink.click();
    console.log('✅ Navegado a Pedidos Pendientes');
}

await new Promise(r => setTimeout(r, 3000));

// Buscar el pedido rechazado y validar TODO
const rows = document.querySelectorAll('p-table tbody tr');
let resultados = {
    pedidoEncontrado: false,
    tieneColorRojo: false,
    clasesCSS: '',
    estadoCorrecto: false,
    estadoMostrado: '',
    motivoVisible: false,
    motivoTexto: '',
    leyendaVisible: false,
    bordeLateralRojo: false
};

for (let row of rows) {
    const text = row.textContent;
    if (text.includes('7323') && text.includes('PRUEBA AUTOMATIZADA')) {
        resultados.pedidoEncontrado = true;

        // Verificar clases CSS
        resultados.clasesCSS = row.className;
        resultados.tieneColorRojo = row.classList.contains('pedido-rechazado');

        // Verificar estado
        const estadoMatch = text.match(/Cancel-Rech/);
        resultados.estadoCorrecto = !!estadoMatch;
        resultados.estadoMostrado = estadoMatch ? estadoMatch[0] : 'No encontrado';

        // Verificar motivo
        resultados.motivoVisible = text.includes('Stock insuficiente') || text.includes('Rechazado para validación');
        const motivoMatch = text.match(/Stock insuficiente[^|]*/);
        resultados.motivoTexto = motivoMatch ? motivoMatch[0] : 'No visible';

        // Verificar estilo de borde
        const computedStyle = window.getComputedStyle(row);
        resultados.bordeLateralRojo = computedStyle.borderLeftWidth === '4px';

        console.log('📊 FILA ENCONTRADA:');
        console.log('   - Texto:', text.substring(0, 100) + '...');
        console.log('   - Clases:', row.className);
        console.log('   - Color rojo:', resultados.tieneColorRojo);
        console.log('   - Borde lateral:', resultados.bordeLateralRojo);
        break;
    }
}

// Verificar leyenda de colores
const leyendaTexts = Array.from(document.querySelectorAll('div')).filter(div =>
    div.textContent.includes('Rechazado') || div.textContent.includes('Cancelado')
);
resultados.leyendaVisible = leyendaTexts.length > 0;

// REPORTE FINAL
console.log('\n==============================================');
console.log('📋 REPORTE DE VALIDACIÓN - PASO 1.9');
console.log('==============================================\n');

console.log('1️⃣ Pedido encontrado en tabla:', resultados.pedidoEncontrado ? '✅ SÍ' : '❌ NO');
console.log('2️⃣ Tiene clase CSS "pedido-rechazado":', resultados.tieneColorRojo ? '✅ SÍ' : '❌ NO');
console.log('3️⃣ Estado mostrado es "Cancel-Rech":', resultados.estadoCorrecto ? '✅ SÍ' : '❌ NO');
console.log('   Estado detectado:', resultados.estadoMostrado);
console.log('4️⃣ Motivo del rechazo visible:', resultados.motivoVisible ? '✅ SÍ' : '❌ NO');
console.log('   Motivo:', resultados.motivoTexto);
console.log('5️⃣ Leyenda de colores visible:', resultados.leyendaVisible ? '✅ SÍ' : '❌ NO');
console.log('6️⃣ Borde lateral rojo (4px):', resultados.bordeLateralRojo ? '✅ SÍ' : '❌ NO');

// Calcular puntuación
const validaciones = [
    resultados.pedidoEncontrado,
    resultados.tieneColorRojo,
    resultados.estadoCorrecto,
    resultados.motivoVisible,
    resultados.leyendaVisible,
    resultados.bordeLateralRojo
];
const exitosas = validaciones.filter(v => v).length;
const porcentaje = (exitosas / validaciones.length * 100).toFixed(1);

console.log('\n==============================================');
console.log(`📊 RESULTADO: ${exitosas}/6 validaciones exitosas (${porcentaje}%)`);
console.log('==============================================\n');

if (exitosas === 6) {
    console.log('🎉 ¡PRUEBA COMPLETAMENTE EXITOSA!');
} else if (exitosas >= 4) {
    console.log('⚠️  Prueba parcialmente exitosa - revisar detalles');
} else {
    console.log('❌ Prueba FALLIDA - requiere corrección');
}

// Retornar resultados
resultados;
```

**VALIDACIONES ESPERADAS:**
- ✅ `pedidoEncontrado: true`
- ✅ `tieneColorRojo: true` - **CRÍTICO**
- ✅ `estadoCorrecto: true` - Debe ser "Cancel-Rech"
- ✅ `motivoVisible: true` - **CRÍTICO**
- ✅ `leyendaVisible: true`
- ✅ `bordeLateralRojo: true`

---

### PASO 1.10: Captura de Pantalla (Automatizado)

```bash
# Ejecutar en Claude Code:
mcp__chrome-devtools__take_screenshot con fullPage: true, filePath: "C:\\Users\\Telemetria\\T49E2PT\\angular\\motoapp\\evidencia_rechazo.png"
```

---

## ESCENARIO 2: Cancelación por Solicitante

### Objetivo
Validar que un usuario puede cancelar su propia solicitud en estado "Solicitado"

---

### PASO 2.1: Crear Nueva Solicitud (Automatizado)

**Nota:** Ya debes estar logueado en Casa Central

```javascript
// Navegar a Pedir Stock
const links = Array.from(document.querySelectorAll('a'));
const pedirStockLink = links.find(a => a.textContent.includes('Pedir Stock'));
if (pedirStockLink) pedirStockLink.click();

await new Promise(r => setTimeout(r, 3000));

// Buscar artículo
const searchInput = document.querySelector('input[type="text"][placeholder*="Buscar"]');
if (searchInput) {
    searchInput.value = '7323';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
}

await new Promise(r => setTimeout(r, 2000));

// Seleccionar y solicitar
const firstRow = document.querySelector('p-table tbody tr');
if (firstRow) firstRow.click();

await new Promise(r => setTimeout(r, 1000));

const cantidadInput = document.querySelector('input#cantidad');
if (cantidadInput) {
    cantidadInput.value = '2';
    cantidadInput.dispatchEvent(new Event('input', { bubbles: true }));
}

const comentarioInput = document.querySelector('input#comentario');
if (comentarioInput) {
    comentarioInput.value = 'PRUEBA CANCELACIÓN - Para cancelar por solicitante';
    comentarioInput.dispatchEvent(new Event('input', { bubbles: true }));
}

const btnSolicitar = document.querySelector('p-button[label*="Solicitar"] button');
if (btnSolicitar) btnSolicitar.click();

await new Promise(r => setTimeout(r, 1500));

const swalConfirm = document.querySelector('.swal2-confirm');
if (swalConfirm) swalConfirm.click();

await new Promise(r => setTimeout(r, 2000));
console.log('✅ Nueva solicitud creada');
```

---

### PASO 2.2: Cancelar la Solicitud (Automatizado)

```javascript
// Navegar a Pedidos de Stk. Pendientes
const links = Array.from(document.querySelectorAll('a'));
const pedidosPendientesLink = links.find(a => a.textContent.includes('Pedidos de Stk. pendientes'));
if (pedidosPendientesLink) pedidosPendientesLink.click();

await new Promise(r => setTimeout(r, 3000));

// Buscar y seleccionar el pedido
const rows = document.querySelectorAll('p-table tbody tr');
for (let row of rows) {
    const text = row.textContent;
    if (text.includes('PRUEBA CANCELACIÓN') && text.includes('Solicitado')) {
        const checkbox = row.querySelector('p-tablecheckbox input, input[type="checkbox"]');
        if (checkbox) {
            checkbox.click();
            console.log('✅ Pedido seleccionado');
            break;
        }
    }
}

await new Promise(r => setTimeout(r, 1000));

// Verificar que aparece botón Cancelar Solicitud
const btnCancelar = document.querySelector('p-button[label="Cancelar Solicitud"] button');
if (btnCancelar && !btnCancelar.disabled) {
    console.log('✅ Botón Cancelar Solicitud visible y habilitado');
    btnCancelar.click();
} else {
    console.error('❌ Botón Cancelar Solicitud NO visible - FALLO DE PERMISOS');
}

await new Promise(r => setTimeout(r, 1500));

// Ingresar motivo (opcional)
const swalTextarea = document.querySelector('.swal2-textarea');
if (swalTextarea) {
    swalTextarea.value = 'Ya no necesito este artículo';
    swalTextarea.dispatchEvent(new Event('input', { bubbles: true }));
}

await new Promise(r => setTimeout(r, 500));

// Confirmar cancelación
const swalConfirm = document.querySelector('.swal2-confirm');
if (swalConfirm) swalConfirm.click();

await new Promise(r => setTimeout(r, 2000));
console.log('✅ Solicitud cancelada');
```

**VALIDACIÓN:**
- ✅ Debe aparecer mensaje "Solicitud cancelada correctamente"
- ✅ El pedido debe cambiar de estado a "Cancel-Sol"
- ✅ Debe aparecer en color **NARANJA** al recargar

---

### PASO 2.3: Verificar Color Naranja (Automatizado)

```javascript
// Recargar página
location.reload();
await new Promise(r => setTimeout(r, 3000));

// Buscar el pedido cancelado
const rows = document.querySelectorAll('p-table tbody tr');
let tienColorNaranja = false;

for (let row of rows) {
    const text = row.textContent;
    if (text.includes('PRUEBA CANCELACIÓN')) {
        tieneColorNaranja = row.classList.contains('pedido-cancelado');
        console.log('Clases:', row.className);
        console.log('✅ Color naranja:', tieneColorNaranja ? 'SÍ' : 'NO');
        break;
    }
}
```

**VALIDACIÓN:**
- ✅ Debe tener clase `pedido-cancelado`
- ✅ Fondo naranja claro (#fff3e0)

---

## ESCENARIO 3: Permisos por Rol

### Objetivo
Validar que los botones aparecen correctamente según permisos

---

### PASO 3.1: Verificar Permisos ADMIN/SUPER (Automatizado)

**Nota:** Login con usuario ADMIN/SUPER en Valle Viejo

```javascript
// Ir a Envíos de Stk. Pendientes
const links = Array.from(document.querySelectorAll('a'));
const enviosPendientesLink = links.find(a => a.textContent.includes('Envíos de Stk. pendientes'));
if (enviosPendientesLink) enviosPendientesLink.click();

await new Promise(r => setTimeout(r, 3000));

// Verificar botones visibles
const btnEnviar = document.querySelector('p-button[label="Enviar"] button');
const btnRechazar = document.querySelector('p-button[label="Rechazar"] button');

console.log('📊 PERMISOS ADMIN/SUPER:');
console.log('   Botón Enviar:', btnEnviar ? '✅ Visible' : '❌ No visible');
console.log('   Botón Rechazar:', btnRechazar ? '✅ Visible' : '❌ No visible');

if (btnEnviar && btnRechazar) {
    console.log('✅ Permisos correctos para ADMIN/SUPER');
} else {
    console.error('❌ FALLO: Botones no visibles para ADMIN/SUPER');
}
```

**VALIDACIÓN:**
- ✅ Botón "Enviar" debe estar visible
- ✅ Botón "Rechazar" debe estar visible

---

## RESUMEN DE VALIDACIONES

### Checklist Completo

#### Escenario 1: Rechazo
- [ ] Solicitud creada correctamente
- [ ] Pedido rechazado por destinatario
- [ ] Pedido aparece en **ROJO** en solicitante
- [ ] Estado "Cancel-Rech" visible
- [ ] Motivo del rechazo visible
- [ ] Leyenda de colores visible
- [ ] Borde lateral rojo (4px)

#### Escenario 2: Cancelación
- [ ] Solicitud creada correctamente
- [ ] Botón "Cancelar Solicitud" visible
- [ ] Solicitud cancelada exitosamente
- [ ] Pedido aparece en **NARANJA**
- [ ] Estado "Cancel-Sol" visible

#### Escenario 3: Permisos
- [ ] ADMIN/SUPER ve botón "Rechazar"
- [ ] ADMIN/SUPER ve botón "Enviar"
- [ ] USER solo ve botón "Cancelar" en sus propios pedidos

---

## RESULTADO FINAL

### Puntuación

| Escenario | Validaciones | Exitosas | %  |
|-----------|--------------|----------|-----|
| 1: Rechazo | 7 | _____ | ___% |
| 2: Cancelación | 5 | _____ | ___% |
| 3: Permisos | 3 | _____ | ___% |
| **TOTAL** | **15** | **_____** | **____%** |

### Estado General

- [ ] ✅ **TODAS LAS PRUEBAS EXITOSAS** (100%)
- [ ] ⚠️ **PRUEBAS PARCIALMENTE EXITOSAS** (70-99%)
- [ ] ❌ **PRUEBAS FALLIDAS** (<70%)

---

**Ejecutado por:** _______________________
**Fecha:** _______________________
**Hora inicio:** _______________________
**Hora fin:** _______________________

---

## ANEXO: Consultas SQL de Verificación

### Verificar Estados en BD

```sql
-- Ver los pedidos rechazados
SELECT
    id_items,
    tipo,
    cantidad,
    id_art,
    estado,
    observacion,
    motivo_cancelacion,
    fecha_cancelacion,
    usuario_cancelacion
FROM pedidoitem
WHERE TRIM(estado) = 'Cancel-Rech'
ORDER BY id_items DESC
LIMIT 10;
```

### Verificar Motivos

```sql
-- Ver todos los pedidos con motivo de cancelación
SELECT
    TRIM(estado) as estado,
    motivo_cancelacion,
    usuario_cancelacion,
    fecha_cancelacion
FROM pedidoitem
WHERE motivo_cancelacion IS NOT NULL
ORDER BY id_items DESC;
```

---

**FIN DEL DOCUMENTO DE PRUEBAS**
