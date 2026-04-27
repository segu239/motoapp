# Test Plan: Descuento Global En Carrito

> Automated browser test plan designed for LLM execution via Claude in Chrome.
> Each step is self-contained with exact actions, element identification, data, and wait conditions.

## Metadata

| Field | Value |
|-------|-------|
| **Application** | motoapp |
| **Framework** | Angular 15.2 |
| **Base URL** | `http://localhost:4200` for local test, or deployed MotoApp URL |
| **API URL** | `https://motomatch.segu239.com/APIAND/index.php` or active environment from `src/app/config/ini.ts` |
| **Generated** | 2026-04-26 |
| **Scope** | Descuento global en carrito: UI, validaciones Angular, payload, persistencia backend, stock atomico, recibo, caja, sidecar SQL y PDF inmediato |
| **Source Files Analyzed** | `src/app/app-routing.module.ts`, `src/app/components/auth/login2/login2.component.html`, `src/app/components/auth/login2/login2.component.ts`, `src/app/guards/auth.guard.ts`, `src/app/components/carrito/carrito.component.ts`, `src/app/components/carrito/carrito.component.html`, `src/app/components/carrito/carrito.component.css`, `src/app/services/subirdata.service.ts`, `src/Descarga.php.txt`, `migrations/2026_descuento_global_carrito.sql` |
| **Documentation Reviewed** | `docs/plan-descuento-global-carrito.md`, `docs/registro-implementacion-descuento-global-carrito.md`, `docs/flujo-venta-comprobante-descuento-global.md` |

## Execution Progress

| TG | Current Status | How To Continue |
| --- | --- | --- |
| TG-001 | PASS | No further action required. |
| TG-002 | PASS | No further action required unless rollback is needed. |
| TG-003 | PASS | SQL directo confirmado para `fact_descuento_global` y `caja_movi` usando `cod_sucursal = 1` y `id_num = 174`. |
| TG-004 | PASS | Multipago no-CC aprobado con `cod_sucursal = 1`, `numero_int = 10000`, `id_num = 175`, descuento `750.00` y caja total `10809.47`. |
| TG-005 | PASS | Anexo CC primaria aprobado con cliente SARATE GERARDO FABIAN; PR, CS y backend bypass tambien aprobados. No hubo persistencia invalida. |
| TG-006 | PASS | NC `numero_int = 1`, `id_num = 176`; sidecar correcto, caja `-1672.53`, `codigo_mov = idcp_egreso = 71`. |
| TG-007 | PASS | Payload inconsistente rechazado con HTTP 400; MCP Postgres confirma 0 filas en cabecera, detalle, sidecar y caja para `numero_int = 999887766`. |
| TG-008 | PASS / HISTORICAL FIX VERIFIED | PDF inmediato y PDF historico aprobados con `FC 12345`, `id_num = 177`; reimpresion muestra bruto, descuento y neto. |
| TG-008-D | PASS / DETAIL + RECEIPT FIX VERIFIED | Detalle expandido, resumen de pagos y PDF de recibo historico aprobados con `FC 12345`, `id_num = 177`. |
| TG-008-D-R | PASS / LEGACY REGRESSION VERIFIED | Venta legacy `FC 9999` sin descuento no muestra bloques nuevos ni secciones vacias. |
| TG-008-D-M | PASS / MULTIPAY + NC VERIFIED | Multipago `FC 10000` y NC `1` aprobados seleccionando los clientes correctos. |

## Prerequisites

### Environment
- [ ] Application is running at `http://localhost:4200` or the deployed MotoApp URL.
- [ ] Backend API is available at the active `UrlpedidossucxappCompleto`.
- [ ] The updated `Descarga.php.txt` was deployed to the backend.
- [ ] Migration `migrations/2026_descuento_global_carrito.sql` was executed successfully.
- [ ] Feature flag is enabled:

```sql
select flag_name, enabled
from public.app_feature_flags
where flag_name = 'descuento_global_activo';
```

Expected result: one row with `enabled = true`.

### Test Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| QA authenticated user | `segu239@hotmail.com` | `luissegu1` | Must access `/components/puntoventa`, `/components/articulo`, `/components/carrito`, and create sales |

Security note: these are real credentials provided for QA execution. Do not publish this document outside the private test workspace.

### Required Database State
- At least one active client selectable from Punto de Venta.
- At least three sellable products with positive stock in the selected branch.
- `tarjcredito` contains at least:
  - one non-account-current payment method with valid `idcp_ingreso`;
  - one second non-account-current payment method for multipago;
  - `cod_tarj = 111` for Cuenta Corriente;
  - valid `idcp_egreso` for `NC` and `NV` tests.
- `caja_movi`, `factcab1..5`, `psucursal1..5`, `recibos1..5`, `artsucursal`, and `fact_descuento_global` are writable in the target database.

### External Dependencies
- PDF download must be allowed by the browser.
- Telegram send through `MotomatchBotService` may run as part of immediate PDF generation; do not use production customer data in QA runs.

---

## Test Groups

> **IMPORTANT: Every TG is self-contained.** Each TG block can be copied independently and executed by an LLM browser agent without reading any other section. Each TG includes its own data, login steps, navigation, and all context needed.

### TG-001: Setup Y Acceso A Carrito (Priority: P0)

**Objective:** Validate that an authenticated user can reach the sales flow, load the cart, and see the new descuento global controls.

**Datos para este bloque:**
- URL: `http://localhost:4200/login2`
- Credenciales: email `segu239@hotmail.com`, password `luissegu1`.
- Sucursal: choose one branch where test products have stock.
- Ruta destino: `/components/carrito`

---

#### Test 001: Login, seleccion de sucursal y entrada al carrito

**Validates:**
- Auth is required and login works.
- Branch selection is stored before accessing protected routes.
- Carrito page renders the new discount panel.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Navigate | URL bar | `http://localhost:4200/login2` | Login page opens | Heading `"Iniciar sesiÃ³n"` visible |
| 2 | Type | Input with placeholder `"Email"` | `segu239@hotmail.com` | Email appears in field | - |
| 3 | Type | Input with placeholder `"ContraseÃ±a"` | `luissegu1` | Password is entered masked | - |
| 4 | Select | Dropdown with option `"Seleccione sucursal"` | Branch with known stock | Branch option remains selected | - |
| 5 | Click | Button `"Ingresar"` | - | App navigates to protected area | Route or page containing `"Punto de Venta"` becomes visible |
| 6 | Navigate | URL bar | `http://localhost:4200/components/carrito` | Carrito page opens | Text `"Carrito de Compras"` visible |
| 7 | Verify | Carrito page | - | Panel contains `"Descuento global"`, `"Subtotal bruto"`, `"Descuento"`, and `"Total neto"` | All four labels visible |

**Post-test state:** Authenticated user is on the carrito page. No sale has been created.

---

**Group Rollback:** No database rollback needed. If desired, click logout/navigation controls used by the app or close the browser session.

---

### TG-002: Venta FC Sin Descuento Mantiene Flujo Legacy (Priority: P0)

**Objective:** Validate that the implementation did not regress the existing sale path when `descuentoGlobal = 0`.

**Datos para este bloque:**
- Documento: `FC`.
- Descuento global: `0`.
- Productos: two visible products with stock.
- Medio de pago: one non-CC payment method, not `cod_tar = 111`.
- Expected DB: no row in `fact_descuento_global`.

---

#### Test 001: Crear factura sin descuento

**Validates:**
- Legacy stock-before-sale flow still works for no-discount sales.
- `subirDatosPedidos(...)` does not send `descuento_global` when amount is zero.
- PDF immediate generation still works.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Login if needed | Login page | Email `segu239@hotmail.com`, password `luissegu1`, branch with stock | User reaches protected area | `"Punto de Venta"` visible |
| 2 | Navigate | URL bar | `/components/puntoventa` | Punto de Venta page opens | Page title or client search area visible |
| 3 | Select | Client selector/search | First valid QA client visible | Client is selected | Product flow/navigation available |
| 4 | Navigate | UI navigation or URL bar | `/components/articulo` | Articulos page opens | Text `"ArtÃ­culos"` visible and table loaded |
| 5 | Add product | First product row action that adds to cart | Quantity `1`, non-CC payment method | Product is added to cart | Cart count/header changes or success feedback appears |
| 6 | Add product | Second product row action that adds to cart | Quantity `1`, same non-CC payment method | Product is added to cart | Cart count/header changes or success feedback appears |
| 7 | Navigate | URL bar | `/components/carrito` | Cart opens with products | `"Carrito de Compras"` and both products visible |
| 8 | Select | `"OperaciÃ³n"` dropdown | `"FACTURA"` | Document remains `FC` | `"NÂ° Comprobante"` input enabled |
| 9 | Type | `"NÂ° Comprobante"` input | Next QA invoice number | Number appears in field | - |
| 10 | Select | `"Vendedor"` dropdown | Any valid seller | Seller remains selected | - |
| 11 | Type | `"Descuento global"` input | `0` | `"Total neto"` equals `"Subtotal bruto"` | Total values visible and equal |
| 12 | Click | Button `"Finalizar Venta"` | - | Sale is sent and success modal appears | Swal title `"Pedido enviado"` visible |
| 13 | Confirm | Success modal | - | Modal closes | Cart is empty or total resets |

**Post-test state:** One FC sale exists without a sidecar row. A PDF may be downloaded.

---

#### Test 002: SQL verification for no-discount sale

**Validates:**
- No sidecar was inserted.
- Cabecera, recibo and caja still close.

Run these SQL checks using the sucursal and comprobante used in Test 001:

```sql
-- Replace X with selected sucursal number and :numero with the invoice number.
select id_num, tipo, numero_int, numero_fac,
       round((coalesce(exento,0)+coalesce(basico,0)+coalesce(iva1,0)+coalesce(iva2,0)+coalesce(iva3,0))::numeric,2) as total_cabecera,
       saldo
from factcabX
where tipo = 'FC'
  and numero_int = :numero
order by id_num desc
limit 1;

select *
from fact_descuento_global
where cod_sucursal = X
  and tipo_comprobante = 'FC'
  and numero_int = :numero;

select recibo_asoc, importe, bonifica, bonifica_tipo, interes, interes_tipo
from recibosX
where recibo_asoc = :id_num;

select num_operacion, importe_mov, tipo_comprobante, numero_comprobante
from caja_movi
where sucursal = X
  and num_operacion = :id_num;
```

Expected result:
- `fact_descuento_global` returns zero rows.
- `recibosX.importe` equals `total_cabecera` within `0.01`.
- `caja_movi.importe_mov` equals `total_cabecera` within `0.01`.

**Post-test state:** Sale remains in DB. Use a QA numbering range or restore from snapshot if the database must be clean.

---

**Group Rollback:** Prefer QA-only database. If rollback is required, restore the pre-test snapshot for `factcabX`, `psucursalX`, `recibosX`, `caja_movi`, and `artsucursal`.

---

### TG-003: FC Con Descuento Simple Y Un Medio De Pago (Priority: P0)

**Objective:** Validate the main feature: a global discount reduces accounting totals, preserves item gross prices, writes `fact_descuento_global`, moves stock atomically, and shows the PDF summary.

**Datos para este bloque:**
- Documento: `FC`.
- Products: two products with known gross subtotal.
- Descuento global: `1000.00`.
- Payment method: one non-CC method.
- Example expected math: if subtotal is `10000.00`, total neto must be `9000.00`.
- Recorded execution reference from 26/04/2026:
  - `cod_sucursal = 1`
  - `numero_int = 9999`
  - `factcab1.id_num = 174`
  - `subtotal_bruto = 9903.66`
  - `descuento_monto = 1000.00`
  - `total_neto = 8903.66`
  - Product ids: `7323`, `5411`
  - Payment method: TRANSFERENCIA EFECTIVO (`cod_tar = 1111`)
- Because `numero_int = 9999` was also used by TG-002, validate the recorded TG-003 run by `id_num = 174` / `cabecera_id_num = 174`, not only by comprobante number.

---

#### Test 001: Finalizar FC con descuento global

**Validates:**
- UI computes subtotal bruto, descuento and total neto.
- Backend accepts payload with `descuento_global` and `stock_movimientos`.
- Success state is visible only after backend confirmation.
- Immediate PDF includes discount breakdown.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Login if needed | Login page | Email `segu239@hotmail.com`, password `luissegu1`, branch with stock | User reaches protected area | `"Punto de Venta"` visible |
| 2 | Prepare cart | Product/client flow | Same branch, one QA client, two products, same non-CC method | Cart has two products | `"Carrito de Compras"` visible with two rows |
| 3 | Select | `"OperaciÃ³n"` dropdown | `"FACTURA"` | Operation is FC | `"NÂ° Comprobante"` input enabled |
| 4 | Type | `"NÂ° Comprobante"` input | Next QA invoice number | Number appears | - |
| 5 | Select | `"Vendedor"` dropdown | Any valid seller | Seller remains selected | - |
| 6 | Type | `"Descuento global"` input | `1000` | Discount field shows `1000` | `"Total neto"` updates |
| 7 | Verify | Discount panel | - | `"Subtotal bruto"` is greater than `"Total neto"` by exactly `1000.00` | All three totals visible |
| 8 | Click | Button `"Finalizar Venta"` | - | Backend request starts | Loading modal `"Enviando..."` visible |
| 9 | Wait | Browser | - | Sale succeeds | Swal title `"Pedido enviado"` visible |
| 10 | Verify | Download/PDF behavior | - | PDF download is triggered and includes subtotal/descuento/neto rows | Browser download event or PDF file visible |
| 11 | Confirm | Success modal | - | Modal closes and cart clears | Cart total resets to zero or product rows disappear |

**Post-test state:** One discounted FC sale exists. Keep invoice number, branch and resulting `id_num` for SQL verification. If validating the recorded run, use `cod_sucursal = 1` and `id_num = 174`.

---

#### Test 002: SQL verification for discounted FC

**Validates:**
- `factcabX` stores net total.
- `psucursalX` stores gross unit prices.
- `fact_descuento_global` stores subtotal, discount and net.
- `recibosX` and `caja_movi` close against net.
- Stock was updated in `artsucursal`.

Run after Test 001. For a new run, first resolve `:id_num` from the generated sale. For the recorded TG-003 execution, use `X = 1`, `:id_num = 174`, and `:numero = 9999`.

```sql
-- Replace X with selected sucursal. Prefer :id_num once known.
select id_num, tipo, numero_int, numero_fac, puntoventa,
       round((coalesce(exento,0)+coalesce(basico,0)+coalesce(iva1,0)+coalesce(iva2,0)+coalesce(iva3,0))::numeric,2) as total_cabecera,
       saldo
from factcabX
where tipo = 'FC'
  and numero_int = :numero
order by id_num desc
limit 1;

select cod_sucursal, cabecera_id_num, tipo_comprobante, numero_int, numero_fac,
       subtotal_bruto, descuento_monto, total_neto, origen, usuario
from fact_descuento_global
where cod_sucursal = X
  and cabecera_id_num = :id_num;

select id_num, idart, cantidad, precio, cod_tar, tipodoc
from psucursalX
where id_num = :id_num;

select recibo_asoc, importe, bonifica, bonifica_tipo, interes, interes_tipo
from recibosX
where recibo_asoc = :id_num;

select num_operacion, importe_mov, codigo_mov, tipo_comprobante, numero_comprobante
from caja_movi
where sucursal = X
  and num_operacion = :id_num;
```

Expected result:
- Recorded run: `fact_descuento_global.cabecera_id_num = 174`.
- Recorded run: `fact_descuento_global.descuento_monto = 1000.00`.
- Recorded run: `fact_descuento_global.subtotal_bruto = 9903.66`.
- Recorded run: `fact_descuento_global.total_neto = 8903.66`.
- New run: `fact_descuento_global.descuento_monto = 1000.00`.
- `fact_descuento_global.total_neto = factcab total`.
- `sum(psucursalX.precio * psucursalX.cantidad) = fact_descuento_global.subtotal_bruto`.
- `recibosX.importe = fact_descuento_global.total_neto`.
- `sum(caja_movi.importe_mov) = fact_descuento_global.total_neto`.
- `recibosX.bonifica = 0`, `bonifica_tipo = 'P'`, `interes = 0`, `interes_tipo = 'P'`.

**Post-test state:** Sale remains in DB. Use QA numbering or restore snapshot.

---

**Group Rollback:** Restore pre-test database snapshot for the affected branch tables and `artsucursal`, or issue a controlled cancellation using the business process approved by accounting.

---

### TG-004: Multipago Sin Cuenta Corriente (Priority: P0)

**Objective:** Validate proportional discount distribution across multiple non-CC payment methods and per-method caja metadata.

**Datos para este bloque:**
- Documento: `FC`.
- Products: at least two products.
- Payment method A: non-CC cash/card/transfer with valid `idcp_ingreso`.
- Payment method B: second non-CC method with valid `idcp_ingreso`.
- Descuento global: `750.00`.
- Recommended comprobante for the next execution: `10000`, or the next unused QA number greater than `10000`.
- Do not reuse `9999`; it was already used by TG-002 and TG-003. Capture the resulting `id_num` immediately after success.
- Recorded execution reference from 26/04/2026:
  - `cod_sucursal = 1`
  - `numero_int = 10000`
  - `factcab1.id_num = 175`
  - `subtotal_bruto = 11559.47`
  - `descuento_monto = 750.00`
  - `total_neto = 10809.47`
  - Product ids: `7323`, `5411`
  - Payment methods: TRANSFERENCIA EFECTIVO (`cod_tar = 1111`, `idcp_ingreso = 31`) and Bancat (`cod_tar = 4`, `idcp_ingreso = 13`)
  - `caja_movi` rows: codigo `13` importe `5935.45`; codigo `31` importe `4874.02`
  - `sum(caja_movi.importe_mov) = 10809.47`

---

#### Test 001: Finalizar FC multipago con descuento

**Validates:**
- Angular accepts multipago when no item uses `cod_tar = 111`.
- Caja movement count matches payment method count.
- Sum of net caja movements closes against total neto.
- Last payment method absorbs cent rounding if needed.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Login if needed | Login page | Email `segu239@hotmail.com`, password `luissegu1`, branch with stock | User reaches protected area | `"Punto de Venta"` visible |
| 2 | Prepare cart | Product/client flow | Two products with different non-CC payment methods | Cart has at least two product rows | `"Subtotales por Tipo de Pago"` visible |
| 3 | Navigate | URL bar | `/components/carrito` | Cart opens | Product rows visible |
| 4 | Select | `"OperaciÃ³n"` dropdown | `"FACTURA"` | Operation is FC | `"NÂ° Comprobante"` input enabled |
| 5 | Type | `"NÂ° Comprobante"` input | Next QA invoice number | Number appears | - |
| 6 | Select | `"Vendedor"` dropdown | Any valid seller | Seller remains selected | - |
| 7 | Type | `"Descuento global"` input | `750` | `"Total neto"` updates | Discount panel visible |
| 8 | Verify | `"Subtotales por Tipo de Pago"` section | - | At least two payment methods are listed | Subtotal rows visible |
| 9 | Click | Button `"Finalizar Venta"` | - | Request is sent | Loading modal `"Enviando..."` visible |
| 10 | Wait | Success modal | - | Sale succeeds | Swal title `"Pedido enviado"` visible |

**Post-test state:** One discounted multipago FC sale exists. Record `cod_sucursal`, `numero_int` and resulting `id_num`; SQL checks must use `cabecera_id_num` / `num_operacion`.

---

#### Test 002: SQL verification for multipago

**Validates:**
- Multiple `caja_movi` rows were created.
- Caja sum equals total neto.
- Each `codigo_mov` belongs to the payment method direction.

```sql
-- First resolve :id_num for the TG-004 sale if it was not captured from the UI/API.
select id_num, tipo, numero_int,
       round((coalesce(exento,0)+coalesce(basico,0)+coalesce(iva1,0)+coalesce(iva2,0)+coalesce(iva3,0))::numeric,2) as total_cabecera,
       saldo
from factcabX
where tipo = 'FC'
  and numero_int = :numero
order by id_num desc
limit 1;

select fdg.cabecera_id_num, fdg.subtotal_bruto, fdg.descuento_monto, fdg.total_neto
from fact_descuento_global fdg
where fdg.cod_sucursal = X
  and fdg.cabecera_id_num = :id_num;

select cm.num_operacion, cm.codigo_mov, cm.importe_mov, cm.banco, cm.num_cheque, cm.cuenta_mov, cm.caja
from caja_movi cm
where cm.sucursal = X
  and cm.num_operacion = :id_num
order by cm.id_movimiento;

select round(sum(importe_mov)::numeric,2) as suma_caja
from caja_movi
where sucursal = X
  and num_operacion = :id_num;

select distinct p.cod_tar, tc.tarjeta, tc.idcp_ingreso, tc.idcp_egreso
from psucursalX p
join tarjcredito tc on tc.cod_tarj = p.cod_tar
where p.id_num = :id_num;
```

Expected result:
- `fact_descuento_global.descuento_monto = 750.00`.
- Recorded run: `fact_descuento_global.total_neto = 10809.47`.
- Recorded run: `sum(caja_movi.importe_mov) = 10809.47`.
- `count(caja_movi)` equals the number of distinct `psucursalX.cod_tar`.
- `suma_caja = fact_descuento_global.total_neto`.
- For `FC`, every `caja_movi.codigo_mov` is one of the corresponding `tarjcredito.idcp_ingreso` values.

**Post-test state:** Sale remains in DB.

---

**Group Rollback:** Restore snapshots or use QA data only.

---

### TG-005: Bloqueos De UI Y Backend Para Casos No Permitidos (Priority: P1)

**Objective:** Validate that invalid discount scenarios are blocked before persistence and rejected by backend if UI is bypassed.

**Datos para este bloque:**
- Descuento global: `500.00`.
- Invalid payment: Cuenta Corriente `cod_tar = 111`.
- Invalid documents: `PR` and `CS`.

---

#### Test 001: Cuenta corriente bloquea descuento en UI

**Validates:**
- UI detects Cuenta Corriente in cart.
- User cannot finalize with discount > 0.
- No sale is persisted.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Login if needed | Login page | Email `segu239@hotmail.com`, password `luissegu1`, branch with stock | User reaches protected area | `"Punto de Venta"` visible |
| 2 | Prepare cart | Product/client flow | One product with payment method Cuenta Corriente | Cart has one product row | `"Carrito de Compras"` visible |
| 3 | Type | `"Descuento global"` input | `500` | Warning appears | Text `"No se permite descuento global cuando interviene cuenta corriente."` visible |
| 4 | Click | Button `"Finalizar Venta"` | - | Error modal appears | Swal title `"Descuento global invalido"` visible |
| 5 | Verify | Error modal | - | Modal text says `"No se permite descuento global cuando interviene cuenta corriente."` | Error text visible |
| 6 | Confirm | Error modal | - | Modal closes | Cart remains unchanged |

**Post-test state:** No sale should be created.

---

#### Test 002: PR y CS bloquean descuento en UI

**Validates:**
- `PR` rejects discount > 0.
- `CS` rejects discount > 0.
- Cart remains available for correction.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Use existing cart or create one | Cart | One non-CC product | Cart has one row | `"Carrito de Compras"` visible |
| 2 | Select | `"OperaciÃ³n"` dropdown | `"PRESUPUESTO"` | Warning appears after discount is entered | - |
| 3 | Type | `"Descuento global"` input | `500` | Warning text appears | `"El descuento global no esta habilitado para PR ni CS."` visible |
| 4 | Click | Button `"Finalizar Venta"` | - | Error modal appears | Swal title `"Descuento global invalido"` visible |
| 5 | Select | `"OperaciÃ³n"` dropdown | `"CONSULTA"` | Operation changes to CS | - |
| 6 | Click | Button `"Finalizar Venta"` | - | Error modal appears | Swal title `"Descuento global invalido"` visible |

**Post-test state:** No PR/CS sale with discount should be created.

---

#### Test 003: Backend rejects bypass payloads

**Validates:**
- Backend enforces feature rules independent of UI.
- Legacy endpoint rejects new payload nodes.

Run with an API client against the same backend:

```bash
curl -i -X POST "https://motomatch.segu239.com/APIAND/index.php/Descarga/Pedidossucxapp" \
  -H "Content-Type: application/json" \
  -d "{\"id_vend\":1,\"pedidos\":[],\"descuento_global\":{\"descuento_monto\":500}}"
```

Expected result:
- HTTP `400`.
- Response contains `"El endpoint legacy no soporta descuento_global ni stock_movimientos"`.

**Post-test state:** No DB writes.

---

**Group Rollback:** No rollback expected. If any invalid operation was created, treat it as a defect and restore from snapshot.

---

### TG-006: NC/NV Con Descuento Y Caja Negativa (Priority: P1)

**Objective:** Validate that credit/devolution documents reduce operation magnitude and store negative net caja movement.

**Datos para este bloque:**
- Document: `NC` first, optionally repeat for `NV`.
- Descuento global: `300.00`.
- Payment method: non-CC with valid `idcp_egreso`.
- Recorded execution reference from 26/04/2026:
  - `cod_sucursal = 1`
  - `tipo = NC`
  - `numero_int = 1`
  - `factcab1.id_num = 176`
  - Producto: ACOPLE FIL-AIRE C/CARB G.SMASH CORT 7142
  - Payment method: TRANSFERENCIA EFECTIVO (`cod_tarj = 1111`)
  - `subtotal_bruto = 1972.53`
  - `descuento_monto = 300.00`
  - `total_neto = 1672.53`
  - Frontend logs: `es egreso = true`, `codigo_mov/concepto = 71`, caja ID `5`
  - SQL direct confirmed: `caja_movi.importe_mov = -1672.53`, `codigo_mov = 71`, `tarjcredito.idcp_egreso = 71`.

---

#### Test 001: Finalizar NC con descuento

**Validates:**
- UI accepts discount for `NC`.
- Backend stores sidecar.
- `caja_movi.importe_mov` is negative and equals `-total_neto`.
- `codigo_mov` uses `tarjcredito.idcp_egreso`.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Login if needed | Login page | Email `segu239@hotmail.com`, password `luissegu1`, branch with stock | User reaches protected area | `"Punto de Venta"` visible |
| 2 | Prepare cart | Product/client flow | One product with non-CC payment method | Cart has product row | `"Carrito de Compras"` visible |
| 3 | Select | `"OperaciÃ³n"` dropdown | `"NOTA CREDITO"` | Operation becomes NC | `"NÂ° Comprobante"` input enabled |
| 4 | Type | `"NÂ° Comprobante"` input | Next QA NC number | Number appears | - |
| 5 | Select | `"Vendedor"` dropdown | Any valid seller | Seller selected | - |
| 6 | Type | `"Descuento global"` input | `300` | `"Total neto"` updates | Discount panel visible |
| 7 | Click | Button `"Finalizar Venta"` | - | Request is sent | Loading modal `"Enviando..."` visible |
| 8 | Wait | Success modal | - | Sale succeeds | Swal title `"Pedido enviado"` visible |

**Post-test state:** One NC operation exists with discount sidecar.

---

#### Test 002: SQL verification for NC/NV

```sql
select fdg.cabecera_id_num, fdg.tipo_comprobante, fdg.subtotal_bruto, fdg.descuento_monto, fdg.total_neto
from fact_descuento_global fdg
where fdg.cod_sucursal = X
  and fdg.numero_int = :numero
  and fdg.tipo_comprobante in ('NC','NV');

select cm.importe_mov, cm.codigo_mov
from caja_movi cm
where cm.sucursal = X
  and cm.num_operacion = :id_num;

select distinct p.cod_tar, tc.idcp_egreso
from psucursalX p
join tarjcredito tc on tc.cod_tarj = p.cod_tar
where p.id_num = :id_num;
```

Expected result:
- `caja_movi.importe_mov = -fact_descuento_global.total_neto`.
- `caja_movi.codigo_mov = tarjcredito.idcp_egreso` for the selected payment method.
- Recorded run expected: `fact_descuento_global.descuento_monto = 300.00`.
- Recorded run expected: `fact_descuento_global.total_neto = 1672.53`.
- Recorded run expected: `caja_movi.importe_mov = -1672.53`.
- Recorded run expected: `caja_movi.codigo_mov = 71`.

**Post-test state:** NC/NV remains in DB.

---

**Group Rollback:** Restore snapshots or isolate the test in QA numbering.

---

### TG-007: Rollback Transaccional Por Error Controlado (Priority: P1)

**Objective:** Validate that backend rejects inconsistent payloads without leaving cabecera, detalle, stock, recibo, caja or sidecar partial data.

**Datos para este bloque:**
- Use API client, not browser, to create intentionally inconsistent payload.
- Descuento: `100.00`.
- Payload error: make `cabecera.basico + iva1` differ from `total_neto` by more than `0.01`.
- Recorded execution reference from 26/04/2026:
  - Endpoint: `http://100.65.39.89/APIAND/index.php/Descarga/PedidossucxappCompleto`
  - `numero_int = 999887766`
  - `subtotal_bruto = 1210.00`
  - `descuento_monto = 100.00`
  - `total_neto = 1110.00`
  - Invalid cabecera: `basico = 1000.00`, `iva1 = 210.00`, total cabecera `1210.00`
  - Expected mismatch: `1210.00 - 1110.00 = 100.00`
  - Response: HTTP `400`, message `"La cabecera no cierra contra el total neto"`
  - MCP Postgres confirmed zero residual rows for cabecera, detail, sidecar and caja.

---

#### Test 001: Backend rejects cabecera mismatch

**Validates:**
- Backend recalculates subtotal and total neto.
- Backend validates cabecera total.
- Transaction rolls back completely.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Send API request | API client | Payload with `descuento_global.descuento_monto = 100` and cabecera total intentionally wrong | Backend returns error | HTTP response received |
| 2 | Verify response | API client output | - | Response contains `"La cabecera no cierra contra el total neto"` | Error text visible |
| 3 | Run SQL | Database console | Search by test `numero_int` | No `factcabX` row exists | SQL returns zero rows |
| 4 | Run SQL | Database console | Search `fact_descuento_global` by same `numero_int` | No sidecar row exists | SQL returns zero rows |

Recorded SQL result:
- `factcab1`: `0` rows for `numero_int = 999887766`.
- `fact_descuento_global`: `0` rows for `numero_int = 999887766`.
- `caja_movi`: `0` rows for `numero_comprobante = 999887766`.
- `psucursal1` joined through `factcab1`: `0` rows.
- `max(factcab1.id_num) = 176`, unchanged after the rejected payload.

**Post-test state:** No DB writes should remain.

---

**Group Rollback:** No rollback expected. If rows exist after rejection, restore snapshot and file a P0 defect.

---

### TG-008: PDF Inmediato Y Cobertura Historica Pendiente (Priority: P2)

**Objective:** Validate what is covered by the current implementation and explicitly identify historical PDF gaps.

**Datos para este bloque:**
- Use a sale created in TG-003.
- Browser downloads enabled.
- Recorded execution reference from 26/04/2026:
  - Cliente: SARATE GERARDO FABIAN (`id_cli = 564949`)
  - Documento: `FC`, numero_int `12345`
  - `factcab1.id_num = 177`
  - Producto: ACEL. RAP. MDA 3010 6470 (`idart = 7323`)
  - `subtotal_bruto = 5212.20`
  - `descuento_monto = 1000.00`
  - `total_neto = 4212.20`
  - `caja_movi.importe_mov = 4212.20`
  - PDF inmediato enviado por Telegram con HTTP `200`
  - Historical PDF fix verified: generated historical document includes `Subtotal bruto`, `Descuento global`, `Total neto`, and final total neto.

---

#### Test 001: PDF inmediato shows discount breakdown

**Validates:**
- Immediate PDF uses `descuentoGlobalPayload`.
- PDF shows `Subtotal bruto`, `Descuento global`, and `Total neto`.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Execute | TG-003 Test 001 | Discount `1000` | Sale succeeds | Swal title `"Pedido enviado"` visible |
| 2 | Open | Downloaded PDF | Latest generated PDF | PDF opens | PDF content visible |
| 3 | Verify | PDF text | - | Text contains `"Subtotal bruto"`, `"Descuento global"`, and `"Total neto"` | All labels visible |
| 4 | Verify | PDF totals | - | Final `"TOTAL"` equals total neto, not gross subtotal | PDF total visible |

Recorded result:
- Immediate PDF path uses `descuentoGlobalPayload`.
- Immediate PDF renders `Subtotal bruto`, `Descuento global`, and `Total neto` when `descuento_monto > 0`.
- Immediate PDF total uses `totalNeto`, confirmed by DB: `factcab1.total_cabecera = 4212.20` and `fact_descuento_global.total_neto = 4212.20`.
- Historical PDF generation via `generarPDFFactura(venta)` now consumes `descuento_global` from `CabeceraCompletaPDF` and renders the discount breakdown.

**Post-test state:** PDF file exists locally.

---

**Group Rollback:** Delete downloaded test PDFs if needed. DB rollback follows TG-003 guidance.

---

## Coverage Summary

### Statistics

| Metric | Value |
|--------|-------|
| **Total Test Groups** | 8 |
| **Total Tests** | 14 |
| **Total Steps** | 79 |
| **P0 (Critical)** | 5 tests |
| **P1 (High)** | 7 tests |
| **P2 (Medium)** | 2 tests |

### Features Covered

- [x] Authenticated access to protected carrito flow.
- [x] New Angular UI fields for descuento global.
- [x] Legacy no-discount sale path.
- [x] FC with global discount and one non-CC payment method.
- [x] Multipago non-CC with proportional net caja distribution.
- [x] UI blocking for Cuenta Corriente.
- [x] UI blocking for `PR` and `CS`.
- [x] Backend blocking for legacy endpoint bypass.
- [x] `NC/NV` net negative caja behavior.
- [x] Sidecar insertion in `fact_descuento_global`.
- [x] Net totals in `factcab*`, `recibos*`, and `caja_movi`.
- [x] Gross prices preserved in `psucursal*`.
- [x] Immediate PDF discount breakdown.
- [x] Historical PDF discount breakdown after TG-008-R fix validation.
- [x] Historial expanded detail discount breakdown after TG-008-D fix validation.
- [x] Historical receipt PDF discount context after TG-008-D fix validation.
- [x] Legacy no-discount expanded detail remains unchanged after TG-008-D-R validation.
- [x] Multipay discounted expanded detail after TG-008-D-M Test 001 validation.
- [x] NC discounted expanded detail after TG-008-D-M Test 002 validation.
- [x] Transaction rollback for inconsistent payloads.

### Not Covered (with reasons)

- [ ] Browser-level inspection of raw POST payload: Angular code was analyzed, but this plan does not require DevTools network assertions.
- [ ] Automated DB reset: no reset fixture or test database seed script exists in the repository.
- [ ] Exact seed product/client names: not present in repository and must be selected from visible QA data during execution.

### Assumptions

- Backend deployment uses the same code as `src/Descarga.php.txt`.
- The active Angular environment points to the backend where migration and flag were applied.
- The selected branch has valid products, stock and payment method configuration.
- QA can run SQL against the same PostgreSQL database used by the backend.
- PDF download is permitted by browser settings.
- Tests run in a QA/staging environment or with an approved production test numbering range.

### Test Execution Notes

- **Recommended execution order:** TG-001, TG-002, TG-003, TG-004, TG-005, TG-006, TG-007, TG-008, TG-008-D, TG-008-D-R, TG-008-D-M.
- **State dependencies:** TG-003 or TG-008 sales can be used to validate immediate PDF discount output. SQL checks depend on capturing `sucursal`, `numero_int`, and resulting `id_num`.
- **Estimated execution time:** 60-90 minutes for full browser + SQL suite.
- **Skill completion state:** `EXECUTED` for the full suite TG-001 through TG-008, plus TG-008-R revalidation of historical PDF discount rendering, TG-008-D revalidation of expanded detail/receipt rendering, and TG-008-D-R legacy regression validation.
- **Critical stop condition:** If any discounted operation inserts `factcab*` without `fact_descuento_global`, stop testing and restore DB snapshot.
- **TG-008-D-M note:** NC `1` / `id_num = 176` belongs to cliente `SARATE GERARDO FABIAN`, not to `CONSUMIDOR FINAL`; the corrected re-run passed.
