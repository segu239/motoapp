# Test Plan: Modal "Datos de la Tarjeta" — DNI único campo obligatorio

> Plan de pruebas manuales diseñado para ejecución por LLM con control de navegador (Claude in Chrome).
> Cada paso es autocontenido: acción exacta, identificación del elemento, datos concretos y condición de espera.

## Metadata

| Field | Value |
|-------|-------|
| **Application** | MotoApp (Angular 15.2.6) |
| **Framework** | Angular 15 + PrimeNG 15.4.1 + SweetAlert2 11.7.32 |
| **Base URL** | `http://localhost:4200` |
| **API URL** | Firebase Realtime Database (motoapp-1e860) + backend PHP/CodeIgniter (`Carga.php` / `Descarga.php`) |
| **Generated** | 2026-04-16 |
| **Scope** | Validar que en el modal de "Datos de la Tarjeta" disparado cuando `activadatos=1`, solo DNI es obligatorio. Titular, Número de Tarjeta y Código de Autorización son opcionales pero mantienen validaciones de formato si se cargan. Cobertura en los dos entry points: `condicionventa` (venta nueva) y `cabeceras` (cuenta corriente / pagos FC-PR). |
| **Source Files Analyzed** | `src/app/components/condicionventa/condicionventa.component.ts` (abrirFormularioTarj, líneas 1002-1237), `src/app/components/condicionventa/condicionventa.component.html`, `src/app/components/cabeceras/cabeceras.component.ts` (abrirFormularioTarj, líneas 807-1015), `src/app/components/cabeceras/cabeceras.component.html`, `src/app/components/carrito/carrito.component.ts` (líneas 1161-1182), `src/app/components/calculoproducto/calculoproducto.component.ts`, `src/app/interfaces/tarjcredito.ts`, `src/app/app-routing.module.ts`, `src/app/components/auth/login2/login2.component.html` |
| **Documentation Reviewed** | `CLAUDE.md` (convenciones del proyecto), memoria `user_credentials_super.md` |

## Prerequisites

### Environment
- [ ] Aplicación corriendo en `http://localhost:4200` (`npm start` / `ng serve`).
- [ ] Conexión a Firebase Realtime Database del proyecto `motoapp-1e860`.
- [ ] Backend PHP accesible (para `Carga.php` cuando se finalice venta en TG-005).
- [ ] Al menos un registro en tabla `tarjcredito` con `activadatos=1` (tarjeta de crédito). Por convención en la app son todos los tipos tipo "VISA", "MASTERCARD", "AMERICAN EXPRESS", etc. con `activadatos=1`.
- [ ] Al menos un cliente dado de alta distinto del consumidor final genérico (`cod_iva != '2'` y código distinto de `109`) con al menos un artículo disponible para venta.
- [ ] Para TG-003/TG-004: al menos una factura FC pendiente de pago para algún cliente.

### Test Accounts

| Role | Email | Password | Permisos |
|------|-------|----------|----------|
| SUPER | `segu239@gmail.com` | (el usuario lo conoce — LUIS) | Acceso completo |

> La password no se transcribe en este doc. El LLM ejecutor debe pedírsela al humano o leerla de un gestor seguro en el momento de la ejecución.

### Required Database State
- Tabla `tarjcredito`: al menos un registro con `activadatos=1` (ej: VISA CRÉDITO 1 PAGO).
- Tabla `clientes`: al menos un cliente con código distinto de `109` y `cod_iva != 2`.
- Tabla `articulos`: al menos 1 artículo con stock disponible en la sucursal del usuario logueado.
- Para TG-003/TG-004: al menos un comprobante `FC` o `PR` en estado pendiente para el cliente seleccionado.

### External Dependencies
- Firebase Auth operativo para login.
- Firebase Realtime Database accesible para cargar tarjetas, clientes y artículos.

---

## Test Groups

> **IMPORTANTE:** Cada TG es autocontenido. Se puede copiar un bloque TG y ejecutarlo de forma independiente.

---

### TG-001: Flujo Condición de Venta — Validación de campos obligatorios y opcionales (Priority: P0)

**Objective:** Verificar en el modal disparado desde `condicionventa` que DNI es el único campo obligatorio, que las validaciones de formato solo se aplican si el campo opcional se cargó, y que la UI refleja correctamente obligatoriedad (asterisco rojo en DNI, texto "(opcional)" en el resto, nota informativa).

**Datos para este bloque:**
- URL: `http://localhost:4200`
- Credenciales: email `segu239@gmail.com`, password provista por humano al ejecutor.
- Cliente a seleccionar en Punto de Venta: cualquier cliente **distinto** del consumidor final genérico (código `109`). Ejemplo: buscar "CLIENTE PRUEBA" o el primer cliente de la grilla distinto de `CONSUMIDOR FINAL`.
- Condición de venta a elegir: primer ítem del dropdown con `activadatos=1` (ej: "VISA CREDITO 1 PAGO"). Si no estás seguro de cuál es, elegir cualquiera cuyo nombre contenga "CREDITO", "VISA", "MASTER" o "AMERICAN".
- Datos válidos de tarjeta (para tests positivos):
  - Titular: `JUAN PEREZ`
  - DNI: `30123456`
  - Número de tarjeta: `4111111111111111`
  - Autorización: `123`

---

#### Test 001: Setup — Login y navegación hasta abrir el modal de tarjeta

**Validates:**
- Login funciona con credenciales SUPER.
- Ruta `/components/puntoventa` accesible.
- Selección de cliente redirige a `/components/condicionventa`.
- El modal SweetAlert "Datos de la Tarjeta" se abre al elegir condición con `activadatos=1`.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Navigate | Barra de URL | `http://localhost:4200` | Redirige a `/login2`. Se ve el título "Iniciar sesión". | Input `formControlName="email"` (placeholder `Email`) visible |
| 2 | Type | Input placeholder `Email` | `segu239@gmail.com` | Valor aparece en el input | - |
| 3 | Type | Input placeholder `Contraseña` | (password provista) | Password enmascarada (puntos) | - |
| 4 | Click | Botón con texto `Ingresar` (type submit) | - | Redirige hacia selección de sucursal o dashboard. | URL distinta de `/login2` visible |
| 5 | Select | Selector/dropdown de sucursal (si aparece) | Sucursal del usuario (ej: primera disponible) | Queda seleccionada la sucursal | Dashboard/Home visible |
| 6 | Click | Ítem de sidebar con texto `Punto de Venta` | - | URL contiene `/components/puntoventa`. Grilla de clientes visible. | Tabla/grilla de clientes renderizada |
| 7 | Type | Input de búsqueda de clientes | (nombre de cliente no `109`) | La grilla filtra | Fila del cliente visible |
| 8 | Click | Fila del cliente (o botón "Seleccionar") | - | Redirige a `/components/condicionventa` con `queryParams.cliente`. Aparece card con nombre del cliente como título y un dropdown con el texto "Seleccione una condición de venta" debajo. | Alert `alert-info` con texto "Seleccione una condición de venta" visible |
| 9 | Click | Botón dropdown con caret (dropdown-toggle) del btn-group del header (junto al nombre del cliente) | - | Se despliega una lista scroll con input "Buscar..." y ítems con nombres de tipos de pago | Lista `.dropdown-menu.scroll_list` visible |
| 10 | Click | Primer ítem del dropdown cuyo texto sugiera tarjeta de crédito (ej: `VISA CREDITO 1 PAGO`) — debe tener `activadatos=1` | - | Se dispara el modal SweetAlert con título `Datos de la Tarjeta` | Modal `.swal2-popup` con título "Datos de la Tarjeta" visible |
| 11 | Verify | Modal SweetAlert abierto | - | Ver los inputs con labels: "Nombre del Titular (opcional)", "DNI *", "Número de Tarjeta (opcional)", "Código de Autorización (opcional)". Ver nota "Solo el DNI es obligatorio. El resto de los datos son opcionales." en la parte superior del formulario. | Los 4 inputs `#titular`, `#dni`, `#numero`, `#autorizacion` visibles |

**Post-test state:** Modal "Datos de la Tarjeta" abierto, todos los campos vacíos. Listo para los tests siguientes.

---

#### Test 002: DNI vacío debe rechazar con mensaje específico

**Validates:**
- Al enviar sin DNI, aparece el mensaje de validación "El DNI es obligatorio".
- El modal NO se cierra (sigue abierto).

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Verify | Modal abierto, inputs vacíos | - | Los 4 inputs están vacíos | - |
| 2 | Click | Botón `Guardar` (`.swal2-confirm`) | - | Aparece el banner de validación con texto `El DNI es obligatorio` | Elemento `.swal2-validation-message` visible con el texto esperado |
| 3 | Verify | Modal sigue abierto | - | El modal `.swal2-popup` continúa visible, no se cerró | Modal sigue presente en el DOM |

**Post-test state:** Modal abierto, aún sin cerrar. Listo para el test siguiente.

---

#### Test 003: DNI con formato inválido debe rechazar

**Validates:**
- DNI con menos de 8 dígitos → rechaza con mensaje sobre 8 dígitos.
- DNI con más de 8 dígitos → rechaza.
- DNI con exactamente 8 dígitos → acepta (al menos a nivel validación).

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Clear | Input `#dni` | (vacío) | Input vacío | - |
| 2 | Type | Input `#dni` | `12345` (5 dígitos) | Valor en input | - |
| 3 | Click | Botón `Guardar` | - | Aparece `.swal2-validation-message` con texto `El DNI no es válido. Debe contener exactamente 8 dígitos.` | Mensaje de validación visible |
| 4 | Clear | Input `#dni` | - | - | - |
| 5 | Type | Input `#dni` | `123456789` (9 dígitos) | Valor en input | - |
| 6 | Click | Botón `Guardar` | - | Mismo mensaje `El DNI no es válido. Debe contener exactamente 8 dígitos.` | Mensaje de validación visible |
| 7 | Clear | Input `#dni` | - | - | - |
| 8 | Type | Input `#dni` | `30123456` | Valor 30123456 en input | - |
| 9 | Click | Botón `Guardar` | - | **El modal se cierra**. Aparece toast/alert de éxito: título `Datos guardados correctamente` y texto `Los datos de la tarjeta han sido registrados`. Luego se dispara el loading y después se listan los productos en la grilla. | Toast de éxito visible; luego tabla `p-table` con artículos visible |

**Post-test state:** Modal cerrado. Condición de venta aplicada (badge con el nombre de la tarjeta visible). Tabla de productos cargada. Datos guardados: `titular=""`, `dni="30123456"`, `numero=""`, `autorizacion=""`.

**Nota técnica (para el ejecutor):** Si se quisiera inspeccionar el estado interno, se puede abrir DevTools y, en la consola, verificar que `this.tarjeta` del componente `condicionventa` tenga solo `Dni` cargado (si se accede vía Angular DevTools). Este chequeo es opcional.

---

#### Test 004: Re-abrir modal y validar que Titular inválido es rechazado (solo si se completa)

**Validates:**
- Si el usuario llena Titular con formato inválido (números o símbolos), se rechaza con el mensaje de titular.
- Si el usuario deja Titular vacío y DNI válido, se acepta.

> **Dependencia de estado:** para re-disparar el modal, elegir otra condición de venta con `activadatos=1` del dropdown (ej: un segundo item). Si el flujo no permite re-abrirlo sin cerrar el carrito, saltar al siguiente grupo y agregar nota en **Not Covered**.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Click | Dropdown del header (dropdown-toggle) | - | Lista desplegada | Lista visible |
| 2 | Click | Otro ítem con `activadatos=1` (distinto al anterior, si existe) | - | Se abre nuevamente el modal "Datos de la Tarjeta" | Modal visible |
| 3 | Type | Input `#titular` | `JUAN123` | Valor en input | - |
| 4 | Type | Input `#dni` | `30123456` | Valor en input | - |
| 5 | Click | Botón `Guardar` | - | Aparece mensaje `El titular no es válido. Debe contener solo letras y espacios.` | Mensaje de validación visible |
| 6 | Clear | Input `#titular` | (vacío) | - | - |
| 7 | Click | Botón `Guardar` | - | Modal se cierra. Toast de éxito. | Toast visible |

**Post-test state:** Modal cerrado. Datos guardados: `titular=""`, `dni="30123456"`, `numero=""`, `autorizacion=""`.

---

#### Test 005: Re-abrir modal y validar Número de Tarjeta y Autorización con formato inválido

**Validates:**
- Si número de tarjeta se carga con ≠ 16 dígitos → rechaza.
- Si autorización se carga con ≠ 3 dígitos → rechaza.
- Si ambos se cargan correctamente → acepta junto con titular y DNI válidos.

> Re-dispara el modal con otro ítem con `activadatos=1`. Si no hay, saltar este test (agregar a Not Covered por limitación de datos).

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Click | Dropdown del header → ítem con `activadatos=1` | - | Modal abierto | Modal visible |
| 2 | Type | Input `#titular` | `JUAN PEREZ` | - | - |
| 3 | Type | Input `#dni` | `30123456` | - | - |
| 4 | Type | Input `#numero` | `411111111111` (12 dígitos) | - | - |
| 5 | Type | Input `#autorizacion` | `12` | - | - |
| 6 | Click | Botón `Guardar` | - | Mensaje `El número de tarjeta no es válido. Debe contener exactamente 16 dígitos.` | Validation visible |
| 7 | Clear | Input `#numero` | - | - | - |
| 8 | Type | Input `#numero` | `4111111111111111` | - | - |
| 9 | Click | Botón `Guardar` | - | Mensaje `El código de autorización no es válido. Debe contener exactamente 3 dígitos.` | Validation visible |
| 10 | Clear | Input `#autorizacion` | - | - | - |
| 11 | Type | Input `#autorizacion` | `123` | - | - |
| 12 | Click | Botón `Guardar` | - | Modal cierra. Toast de éxito. | Toast visible |

**Post-test state:** Datos guardados: `titular="JUAN PEREZ"`, `dni="30123456"`, `numero="4111111111111111"`, `autorizacion="123"`. Tabla de productos cargada.

---

**Group Rollback:**
1. Navegar a `http://localhost:4200/components/puntoventa` manualmente (vuelve al estado inicial; las condiciones de venta elegidas y el carrito temporal se descartan porque nunca se llegó a finalizar la venta).
2. Verificar que el nombre del cliente de la esquina superior desaparece y aparece de nuevo la grilla de clientes.
3. **No hay mutación persistente en DB** mientras no se complete la venta (TG-005). Este grupo es puramente de validación de UI del modal.

---

### TG-002: Flujo Condición de Venta — Caso feliz con solo DNI (Priority: P0)

**Objective:** Ejecutar el caso feliz más representativo: el operador solo tipea el DNI, el modal acepta, y los productos se listan correctamente. Es el escenario principal del cambio funcional.

**Datos para este bloque:**
- Credenciales y cliente: idem TG-001.
- Condición de venta: primera con `activadatos=1`.
- DNI: `27654321`.

---

#### Test 001: Login, navegar y abrir modal (setup)

**Validates:** Mismo setup que TG-001 T001.

> Si este TG se ejecuta inmediatamente después de TG-001, saltar pasos 1-6. Si se ejecuta de forma independiente, repetir pasos del TG-001 Test 001.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1-10 | (idéntico a TG-001 T001 pasos 1-10) | - | - | Modal "Datos de la Tarjeta" abierto | Modal visible |

**Post-test state:** Modal abierto con inputs vacíos.

---

#### Test 002: Tipear solo DNI y Guardar

**Validates:**
- Con solo DNI válido (8 dígitos) el modal acepta y cierra.
- Aparece el toast de confirmación.
- Se dispara la carga de productos.
- No aparece ningún mensaje de validación de los otros campos.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Verify | Modal abierto con inputs vacíos | - | Todos los inputs vacíos | - |
| 2 | Type | Input `#dni` | `27654321` | Valor en input | - |
| 3 | Click | Botón `Guardar` | - | No se muestra `.swal2-validation-message` en ningún momento. El modal se cierra. | `.swal2-validation-message` NO presente; luego modal cerrado |
| 4 | Verify | Toast post-cierre | - | Aparece toast con título `Datos guardados correctamente` (timer 1500ms) | Toast visible |
| 5 | Verify | Post-toast | - | Spinner/loading aparece mientras carga productos y luego la tabla `p-table` de productos se renderiza. El badge superior muestra el nombre de la condición de venta elegida y "Lista de Precios: …". | Tabla `p-table` con filas de productos visible |

**Post-test state:** Condición de venta aplicada. Productos visibles. `this.tarjeta = { Titular: '', Dni: '27654321', Numero: '', Autorizacion: '' }`.

---

**Group Rollback:** Igual al de TG-001 (navegar a `/puntoventa`; ninguna mutación persistente).

---

### TG-003: Flujo Cabeceras (CC) — Validación del mismo modal en el flujo de pagos (Priority: P0)

**Objective:** Verificar que la misma lógica funciona en el segundo entry point del modal (`cabeceras`). El HTML y la validación son idénticos; la diferencia está solo en el entry point.

**Datos para este bloque:**
- Credenciales: idem TG-001.
- Cliente con al menos una factura `FC` pendiente. Si no hay, usar un cliente con `PR` (presupuesto).
- Tipo de pago a seleccionar: con `activadatos=1`.

---

#### Test 001: Login, navegar a Cabeceras, seleccionar comprobante y disparar modal

**Validates:**
- Ruta `/components/cuentacorriente` → clic en cliente redirige a `/components/cabeceras`.
- Seleccionar comprobante FC → habilita botón "Pagar".
- Elegir tipo de pago con `activadatos=1` desde el dropdown de la derecha abre el modal "Datos de la Tarjeta" con el mismo layout.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1-5 | (idéntico al login TG-001 T001 pasos 1-5) | - | - | Usuario logueado en dashboard | Sidebar visible |
| 6 | Click | Ítem sidebar `Pagos CC` (o similar, ruta `cuentacorriente`) | - | Carga listado de clientes con CC | Grilla visible |
| 7 | Click | Fila de cliente con facturas pendientes | - | Redirige a `/components/cabeceras` con query param `cliente` | Grilla de cabeceras visible |
| 8 | Check | Checkbox de la primera fila tipo `FC` pendiente | - | Queda marcada; botón "Pagar" habilitado arriba | Botón "Pagar" habilitado |
| 9 | Click | Botón "Pagar" | - | Aparece el btn-group con el dropdown de tipos de pago (debe mostrarse solo cuando `selectedCabeceras[0].tipo === 'FC'` o `'PR'`) | Dropdown de tipos visible |
| 10 | Click | Dropdown caret del btn-group | - | Lista de ítems con los tipos de pago | `.dropdown-menu.scroll_list` visible |
| 11 | Click | Primer ítem con `activadatos=1` | - | Se abre modal SweetAlert. El título puede estar vacío en este flujo (diferencia con condicionventa), pero el encabezado interno dice "Información de la Tarjeta" con el ícono `fa-credit-card`. | Inputs `#titular`, `#dni`, `#numero`, `#autorizacion` visibles |
| 12 | Verify | Modal abierto | - | Mismos labels que TG-001 T001 paso 11: "Nombre del Titular (opcional)", "DNI *", "Número de Tarjeta (opcional)", "Código de Autorización (opcional)" + nota "Solo el DNI es obligatorio..." | Nota visible arriba del form |

**Post-test state:** Modal abierto en el flujo de cabeceras.

---

#### Test 002: Validar solo DNI obligatorio en cabeceras

**Validates:** Mismas validaciones del TG-001 Test 002/003 pero en el contexto de `cabeceras`.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Click | Botón `Guardar` (con inputs vacíos) | - | Mensaje `El DNI es obligatorio` | Validation visible |
| 2 | Type | Input `#dni` | `123` | - | - |
| 3 | Click | Botón `Guardar` | - | Mensaje `El DNI no es válido. Debe contener exactamente 8 dígitos.` | Validation visible |
| 4 | Clear + Type | Input `#dni` | `30123456` | - | - |
| 5 | Click | Botón `Guardar` | - | Modal cierra. Toast `Datos guardados` con texto `Los datos de la tarjeta han sido registrados correctamente`. | Toast visible |

**Post-test state:** Datos de tarjeta guardados en el componente `cabeceras` con solo DNI. El flujo continúa con la imputación del pago.

---

**Group Rollback:**
1. Si el flujo continúa y pide confirmación de pago, cancelar/salir sin confirmar.
2. Navegar a `/components/cuentacorriente` para salir del contexto de cabeceras.
3. **Si se confirma el pago accidentalmente:** se genera un recibo/movimiento de caja. Revertir con anulación manual desde el historial de movimientos (operación admin) o aceptar la mutación si el ambiente es de pruebas descartables.

---

### TG-004: Cabeceras — Caso feliz con campos opcionales completos (Priority: P1)

**Objective:** Validar que si el operador sí completa los 4 campos correctamente, todo sigue funcionando como antes (no-regresión).

**Datos para este bloque:**
- Idem TG-003.
- Titular: `MARIA LOPEZ`
- DNI: `28876543`
- Número: `5500000000000004`
- Autorización: `987`

---

#### Test 001: Setup (idéntico a TG-003 T001) y completar todos los campos

**Validates:** No-regresión del caso original (antes del cambio los 4 eran obligatorios; ahora son aceptados si se completan).

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1-12 | (idéntico a TG-003 T001) | - | - | Modal abierto | Modal visible |
| 13 | Type | Input `#titular` | `MARIA LOPEZ` | - | - |
| 14 | Type | Input `#dni` | `28876543` | - | - |
| 15 | Type | Input `#numero` | `5500000000000004` | - | - |
| 16 | Type | Input `#autorizacion` | `987` | - | - |
| 17 | Click | Botón `Guardar` | - | Modal cierra. Toast de éxito. Sin validation messages. | Toast visible |

**Post-test state:** `this.tarjeta` del componente `cabeceras` con los 4 campos cargados. Flujo continúa a imputación.

---

**Group Rollback:** Igual a TG-003.

---

### TG-005: Integración end-to-end — Venta finalizada con solo DNI (Priority: P1)

**Objective:** Confirmar que una venta completa se finaliza correctamente cuando el operador cargó solo DNI, y que los campos opcionales vacíos llegan al backend como `null` o string vacío sin romper el insert. Requiere consulta a BD post-test para verificar.

**Datos para este bloque:**
- Idem TG-001.
- DNI: `25111222`
- Un artículo con stock > 0 para agregar al carrito.
- Cantidad: `1`

**Pre-requisito de acceso a BD:** `db_access = unknown` en el momento de generar este plan. Si el ejecutor no tiene acceso a Postgres/Firebase para verificar, marcar este TG como PARCIALMENTE EJECUTADO y dejar el paso de verificación como pendiente.

---

#### Test 001: Flujo completo hasta confirmar venta

**Validates:**
- Cadena completa: condicionventa → carrito → confirmación.
- Payload enviado al backend contiene `titulartar: null`, `numerotar: null`, `nautotar: null`, `dni_tar: "25111222"` (o equivalente — el carrito usa `obj.titulartar || null`).
- Backend PHP `Carga.php` acepta el insert sin errores.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1-10 | (setup TG-001 T001) | - | - | Modal abierto | Modal visible |
| 11 | Type | Input `#dni` | `25111222` | - | - |
| 12 | Click | Botón `Guardar` | - | Modal cierra; productos listados. | Tabla visible |
| 13 | Click | Fila de un artículo con stock | - | Se abre el flujo de agregar al carrito (componente `calculoproducto`) | Pantalla de cálculo de producto visible |
| 14 | Type | Input de cantidad | `1` | - | - |
| 15 | Click | Botón "Agregar al Carrito" / equivalente | - | Redirige o muestra botón para ir al carrito | Carrito disponible |
| 16 | Navigate | Ir al Carrito (botón "Ver Carrito" o similar) | - | `/components/carrito` con el ítem cargado | Tabla del carrito con el item |
| 17 | Open | DevTools → pestaña Network | - | Filtrar por `Carga.php` o la URL del backend | Panel Network listo |
| 18 | Click | Botón para finalizar venta (según el flujo habitual — "Facturar", "Confirmar Venta" o similar) | - | Se dispara request al backend | Request HTTP visible en Network |
| 19 | Inspect | Request payload en Network | - | Verificar que el array enviado contiene para el ítem: `titulartar: null`, `numerotar: null`, `nautotar: null`, `dni_tar: "25111222"` (o `25111222` como número). `dni_tar` debe estar poblado; los otros 3 deben ser `null` o string vacío. | Payload verificado |
| 20 | Verify | Respuesta backend | - | Status 200 y mensaje de éxito (según la app). No aparece error SweetAlert. Se genera número de comprobante. | Mensaje de éxito visible |
| 21 | (Si `db_access=available`) Query | Postgres/Firebase → tabla de detalle de venta | Filtrar por el comprobante generado | Las columnas `titulartar`, `numerotar`, `nautotar` están `NULL` o vacías; `dni_tar = 25111222`. | Resultado SQL devuelve lo esperado |

**Post-test state:** Venta generada en BD. El comprobante queda persistido. Este es el único TG que deja mutación.

---

**Group Rollback:**
1. La venta queda grabada. Si el ambiente es productivo o pre-productivo, **anular la venta** desde "Historial de Ventas" (menú lateral) con el botón correspondiente, o solicitar al administrador que haga la reversa.
2. Verificar que el stock del artículo vuelve al valor previo.
3. **Si el ambiente es de pruebas descartable**, se puede dejar la venta tal como está.

---

## Coverage Summary

### Statistics

| Metric | Value |
|--------|-------|
| **Total Test Groups** | 5 |
| **Total Tests** | 11 |
| **Total Steps** | ≈ 75 (TG-001: 27 / TG-002: 15 / TG-003: 17 / TG-004: 17 / TG-005: 21) |
| **P0 (Critical)** | 3 grupos (TG-001, TG-002, TG-003) |
| **P1 (High)** | 2 grupos (TG-004, TG-005) |
| **P2 (Medium)** | 0 |

### Features Covered

- [x] DNI obligatorio (mensaje "El DNI es obligatorio" cuando está vacío).
- [x] DNI con formato inválido (≠ 8 dígitos) rechazado con mensaje específico.
- [x] Titular opcional: vacío acepta; con formato inválido rechaza solo si se llenó.
- [x] Número de Tarjeta opcional: vacío acepta; con ≠ 16 dígitos rechaza solo si se llenó.
- [x] Código de Autorización opcional: vacío acepta; con ≠ 3 dígitos rechaza solo si se llenó.
- [x] UI: asterisco rojo en DNI, texto "(opcional)" en los otros 3 labels, nota informativa arriba del formulario.
- [x] Paridad entre los dos entry points (`condicionventa` y `cabeceras`) — TG-001/TG-002 vs TG-003/TG-004.
- [x] No-regresión: caso feliz con los 4 campos completos sigue funcionando (TG-004).
- [x] Integración end-to-end hasta persistencia en backend con campos opcionales vacíos (TG-005).

### Not Covered (con motivos)

- [ ] **Validación de DNI con caracteres no numéricos** (`ABCDEFGH`). El input es `type="number"`, el navegador impide el ingreso de letras, por lo que es irrelevante testear desde UI. La regex `^[0-9]{8}$` del componente lo cubre a nivel código, pero no se puede forzar desde el browser.
- [ ] **Testeo de Titular con longitud > 40** (`{1,40}`). No se cubrió explícitamente para no inflar el plan; la validación es idéntica en patrón a Titular con caracteres inválidos (ambas ramas del mismo `reTitular.test()`). Puede agregarse en una iteración posterior.
- [ ] **Validación de la interfaz `recibo-expanded.ts` / `recibo-detalle.ts`** en consumidores de historial/reportes cuando los campos vienen vacíos/null. Requiere inspección de PDFs generados (`historial-pdf.service.ts`). Fuera del scope del modal.
- [ ] **Cancelar el modal** (botón "Cancelar"): el flujo existe, pero no es parte del cambio funcional. Se asume que sigue funcionando como antes.
- [ ] **Tipos de pago con `activadatos=2`** (cheques) — flujo distinto, no afectado por este cambio.
- [ ] **Tipos de pago con `activadatos=0`** (efectivo/transferencia) — no abren modal, irrelevante para este cambio.
- [ ] **Verificación BD en TG-005 paso 21** si `db_access != available`. Marcar el paso como pendiente y pedir al admin/DBA que valide los campos en la tabla de detalle de la venta.

### Assumptions

- El usuario SUPER (`segu239@gmail.com`) tiene acceso a todas las rutas testeadas (Punto de Venta, Condición de Venta, Cabeceras, Cuenta Corriente).
- Al menos existen 2 registros en `tarjcredito` con `activadatos=1` para poder re-abrir el modal en TG-001 Test 004 y Test 005. Si no existen, los pasos indican saltarlos.
- El backend PHP (`Carga.php`) acepta `NULL` en las columnas `titulartar`, `numerotar`, `nautotar`. Confirmado por inspección: no hay validaciones sobre esos campos en `Carga.php.txt`.
- El carrito (`carrito.component.ts:1169-1172`) ya normaliza los campos vacíos a `null` antes de enviarlos al backend (`obj.titulartar || null`). Por lo tanto, lo que se envía es `null`, no string vacío, cuando el usuario no completó.
- El timer del toast post-guardado es de 1500ms. El ejecutor debe esperar ese tiempo antes de confirmar el siguiente paso.

### Test Execution Notes

- **Orden recomendado:** TG-001 → TG-002 → TG-003 → TG-004 → TG-005. TG-005 al final porque es el único que deja persistencia.
- **Dependencias de estado:** TG-001 Test 004 y Test 005 dependen de que haya más de un tipo de pago con `activadatos=1` disponible para re-abrir el modal. Si no los hay, saltar esos sub-tests.
- **Tiempo estimado de ejecución:** ~20-30 minutos para la suite completa (incluido setup de login en cada TG si se ejecutan aislados; ~15 min si se ejecutan secuencialmente manteniendo la sesión).
- **Ambiente recomendado:** local con `ng serve` contra Firebase de desarrollo, no producción.
- **Evidencia sugerida:** capturas del modal (TG-001 T001 paso 11), capturas de los 3 mensajes de validación posibles (DNI obligatorio, DNI formato, titular formato, numero formato, autorizacion formato), y captura del request en Network (TG-005 paso 19).
- **Reversión global al final:** cerrar sesión desde el avatar del header → "Cerrar Sesión".
