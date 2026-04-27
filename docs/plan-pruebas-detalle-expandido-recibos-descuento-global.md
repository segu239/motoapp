# Test Plan: Detalle Expandido Y Recibos Historicos Con Descuento Global

> Automated browser test plan designed for LLM execution via Claude in Chrome.
> Each step is self-contained with exact actions, element identification, data, and wait conditions.

## Metadata

| Field | Value |
|-------|-------|
| **Application** | motoapp |
| **Framework** | Angular 15.2 |
| **Base URL** | `http://localhost:4200` |
| **API URL** | `https://motomatch.segu239.com/APIAND/index.php` |
| **Generated** | `2026-04-26` |
| **Scope** | Validar que detalle expandido, resumen de pagos y recibos historicos/PDF muestren subtotal bruto, descuento global y total neto sin alterar calculos legacy de recibos. |
| **Source Files Analyzed** | `src/Descarga.php.txt`, `src/app/components/historialventas2/historialventas2.component.html`, `src/app/components/historialventas2/historialventas2.component.ts`, `src/app/interfaces/recibo-expanded.ts`, `src/app/services/historial-ventas2-paginados.service.ts`, `package.json`, `src/app/config/ini.ts` |
| **Documentation Reviewed** | `docs/plan-detalle-expandido-recibos-descuento-global.md`, `docs/plan-pruebas-descuento-global-carrito.md`, `docs/informe-ejecucion-pruebas-descuento-global-carrito.md` |

## Prerequisites

### Environment
- [ ] Angular app is running at `http://localhost:4200`.
- [ ] Backend API is available at `https://motomatch.segu239.com/APIAND/index.php`.
- [ ] Backend file `Descarga.php` was uploaded with the fix for `/Descarga/obtenerDatosExpandidos`.
- [ ] Browser automation can inspect generated PDF/docDefinition or download PDF files.

### Test Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Usuario QA | `segu239@hotmail.com` | `luissegu1` | Acceso a Casa Central, historial de ventas, detalle expandido y generacion de recibos/PDF |

### Required Database State
- Sucursal `Casa Central` / cod_sucursal `1` exists and is selectable.
- Cliente `SARATE GERARDO FABIAN` exists and has historical sale `FC 12345`, `id_num=177`, date `2026-04-26`.
- `fact_descuento_global` contains sidecar for `cod_sucursal=1`, `cabecera_id_num=177`:
  - `subtotal_bruto = 5212.20`
  - `descuento_monto = 1000.00`
  - `total_neto = 4212.20`
- Backend endpoint verification already observed:
  - `GET /Descarga/obtenerDatosExpandidos?sucursal=1&id_factura=177`
  - response includes `data.descuento_global.subtotal_bruto = "5212.20"`, `descuento_monto = "1000.00"`, `total_neto = "4212.20"`.
- Legacy/no-discount sale exists for regression:
  - `FC 9999`, `id_num=173`, total `$3518.34`, no row in `fact_descuento_global`.
- Multipago sale exists for regression:
  - `FC 10000`, `id_num=175`, subtotal bruto `$11559.47`, descuento `$750.00`, total neto `$10809.47`.
- Nota de credito exists for regression:
  - `NC 1`, `id_num=176`, subtotal bruto `$1972.53`, descuento `$300.00`, total neto `$1672.53`.

### External Dependencies
- PDF generation uses `pdfmake` in the Angular browser context.
- Telegram/API side effects are not exercised by this plan because it validates historical display only.

---

## Test Groups

> **IMPORTANT: Every TG is self-contained.** Each TG block can be copied independently and executed by an LLM browser agent without reading any other section. Each TG includes its own data, login steps, navigation, and all context needed.

### TG-008-D: Detalle Expandido Y Recibo Historico Con Descuento Global (Priority: P1)

**Objective:** Validar que una venta historica con descuento global muestre el desglose bruto/descuento/neto en el detalle expandido, en el resumen de pagos y en el PDF de recibo, sin volver a descontar el recibo.

**Datos para este bloque:**
- URL: `http://localhost:4200`
- Credenciales: email `segu239@hotmail.com`, password `luissegu1`
- Sucursal: `Casa Central`
- Cliente: `SARATE GERARDO FABIAN`
- Fecha de busqueda: desde `26/04/2026` hasta `26/04/2026`
- Venta objetivo: `FC 12345`
- id_num esperado: `177`
- Recibo esperado: `256`
- Subtotal bruto esperado: `$5.212,20` o `$5212.20`
- Descuento global esperado: `$1.000,00` o `$1000.00`
- Total neto esperado: `$4.212,20` o `$4212.20`

---

#### Test 001: Login, navegacion a historial y carga de venta objetivo

**Validates:**
- Login con credenciales reales.
- Seleccion de sucursal `Casa Central`.
- Historial de ventas abre y permite consultar por cliente/fecha.
- La venta `FC 12345` aparece con importe neto `$4.212,20`.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Navigate | URL bar | `http://localhost:4200/login` | Login page opens | Heading or button text `"Iniciar sesión"` visible |
| 2 | Type | Input `"Email"` | `segu239@hotmail.com` | Email appears in the field | - |
| 3 | Type | Input `"Contraseña"` | `luissegu1` | Password is entered and masked | - |
| 4 | Select | Dropdown `"Seleccione sucursal"` | `Casa Central` | `Casa Central` remains selected | - |
| 5 | Click | Button `"Ingresar"` | - | User enters protected area | `"Punto de Venta"` visible or side menu visible |
| 6 | Navigate | URL bar | `http://localhost:4200/components/historialventas2` | Historial de ventas page opens | Page/table filters visible |
| 7 | Select or search | Cliente selector/input | `SARATE GERARDO FABIAN` | Client is selected for history query | Client name visible in selected field or page context |
| 8 | Type/Set | Fecha desde | `26/04/2026` | Start date is set | - |
| 9 | Type/Set | Fecha hasta | `26/04/2026` | End date is set | - |
| 10 | Click | Button `"Consultar"` | - | Query is sent | Table rows finish loading |
| 11 | Verify | Results table | `FC 12345` | Row for `FC 12345` is visible and shows importe `$4.212,20` / `$4212.20` | Row visible |

**Post-test state:** User is authenticated on historial page with `SARATE GERARDO FABIAN` results loaded for `26/04/2026`.

---

#### Test 002: Detalle expandido muestra bruto, descuento y neto

**Validates:**
- `/Descarga/obtenerDatosExpandidos` data is consumed by Angular.
- Detail card shows `Total neto` instead of ambiguous gross total when discount exists.
- Financial block shows `Subtotal bruto`, `Descuento global`, `Total neto`.
- Product row remains gross and is not incorrectly netted.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Click | Expand/details control for row `FC 12345` | - | Expanded panel opens under the row | Text `"Factura Original"` visible |
| 2 | Verify | Expanded card header | - | Header shows `Factura Original - FC N° 12345` or equivalent `FC 12345` context | Header visible |
| 3 | Verify | Main amount label in expanded card | - | Label shows `"Total neto:"` and amount `$4.212,20` / `$4212.20` | Amount visible |
| 4 | Verify | Financial block in expanded card | - | `"Subtotal bruto"` is visible with `$5.212,20` / `$5212.20` | Label and amount visible |
| 5 | Verify | Financial block in expanded card | - | `"Descuento global"` is visible with `$1.000,00` / `$1000.00` | Label and amount visible |
| 6 | Verify | Financial block in expanded card | - | `"Total neto"` is visible with `$4.212,20` / `$4212.20` | Label and amount visible |
| 7 | Verify | Product table row for article `7323` / `ACEL. RAP. MDA 3010 6470` | - | Product price/subtotal remains `$5.212,20` / `$5212.20` | Product row visible |
| 8 | Verify | Expanded detail area | - | `$5.212,20` is not presented as final total; it appears only as subtotal bruto or product subtotal | Detail panel stable |

**Post-test state:** Row `FC 12345` remains expanded and ready for receipt validation.

---

#### Test 003: Resumen de pagos y PDF de recibo muestran contexto de descuento sin recalcular el recibo

**Validates:**
- Summary below payments shows bruto/descuento/neto.
- Receipt button keeps payment amount as net amount.
- Receipt PDF includes `Resumen de venta con descuento global`.
- Receipt `TOTAL` remains based on receipt amount and does not subtract `$1000.00` again.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Verify | Section `"Pagos Realizados"` | - | Payment section is visible for the expanded sale | `"Pagos Realizados"` visible |
| 2 | Verify | Payment row | Recibo `256` | Payment row shows importe `$4.212,20` / `$4212.20` and saldo `$0,00` / `$0.00` | Payment row visible |
| 3 | Verify | Summary block below payments | - | `"Subtotal bruto"` appears with `$5.212,20` / `$5212.20` | Label and amount visible |
| 4 | Verify | Summary block below payments | - | `"Descuento global"` appears with `$1.000,00` / `$1000.00` | Label and amount visible |
| 5 | Verify | Summary block below payments | - | `"Total neto"` appears with `$4.212,20` / `$4212.20` | Label and amount visible |
| 6 | Verify | Final payment summary card | - | Label `"Importe Original Neto"` is visible with `$4.212,20` / `$4212.20` | Summary card visible |
| 7 | Start PDF capture | Browser/devtools context | Intercept `pdfMake.createPdf` docDefinition if available | Next PDF generation can be inspected as text/docDefinition | Interceptor active |
| 8 | Click | PDF button in payment row, tooltip/context `"PDF del recibo de pago"` | Recibo `256` | Receipt generation starts | SweetAlert `"Generando recibo..."` visible |
| 9 | Wait | Receipt generation | - | SweetAlert closes or success toast appears | `"Recibo generado exitosamente"` visible or PDF/download opened |
| 10 | Verify | Generated PDF/docDefinition text | - | Text `"Resumen de venta con descuento global"` is present | PDF/docDefinition available |
| 11 | Verify | Generated PDF/docDefinition text | - | Text `"Subtotal bruto de venta"` with `$ 5212.20` is present | PDF/docDefinition available |
| 12 | Verify | Generated PDF/docDefinition text | - | Text `"Descuento global aplicado"` with `$ 1000.00` is present | PDF/docDefinition available |
| 13 | Verify | Generated PDF/docDefinition text | - | Text `"Total neto de venta"` with `$ 4212.20` is present | PDF/docDefinition available |
| 14 | Verify | Generated PDF/docDefinition text | - | Main payment detail shows `"Importe Original"` `$ 4212.20` and `"Importe Pagado"` `$ 4212.20` | PDF/docDefinition available |
| 15 | Verify | Generated PDF/docDefinition text | - | Receipt final line shows `TOTAL $4212.20`, not `TOTAL $3212.20` and not `TOTAL $5212.20` | PDF/docDefinition available |

**Post-test state:** No new sale is created. A receipt PDF may have been downloaded/generated locally.

---

**Group Rollback:** No database rollback required. This group only reads historical data and generates a local PDF. If a PDF file was downloaded, it can be ignored or deleted locally. Session may remain authenticated for the next TG.

---

### TG-008-D-R: Regresion Legacy Sin Descuento (Priority: P1)

**Objective:** Confirmar que ventas sin `fact_descuento_global` conservan el comportamiento anterior: no aparece bloque extra de bruto/descuento/neto y los recibos no agregan secciones vacias.

**Datos para este bloque:**
- URL: `http://localhost:4200`
- Credenciales: email `segu239@hotmail.com`, password `luissegu1`
- Sucursal: `Casa Central`
- Venta objetivo legacy: `FC 9999`
- id_num esperado: `173`
- Importe esperado: `$3.518,34` o `$3518.34`
- Descuento global esperado: no existe / `$0.00`

---

#### Test 001: Expandir venta legacy sin descuento

**Validates:**
- Venta sin sidecar no muestra bloque de descuento.
- Label legacy `Importe Total` se mantiene cuando no hay descuento.
- Product/payment display no se rompe por campos `descuento_global` nulos.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Navigate | URL bar | `http://localhost:4200/components/historialventas2` | Historial page opens using current authenticated session, or redirects to login | Historial filters visible or login visible |
| 2 | Login if redirected | Login form | `segu239@hotmail.com` / `luissegu1` / `Casa Central` | User returns to protected area | `"Punto de Venta"` or historial page visible |
| 3 | Select or search | Cliente selector/input | `CONSUMIDOR FINAL` | Client is selected | Client context visible |
| 4 | Set | Fecha desde / hasta | `26/04/2026` to `26/04/2026` | Date range is set | - |
| 5 | Click | Button `"Consultar"` | - | Results load | Table rows finish loading |
| 6 | Locate | Results table | `FC 9999` | Row `FC 9999` appears with importe `$3.518,34` / `$3518.34` | Row visible |
| 7 | Click | Expand/details control for row `FC 9999` | - | Expanded panel opens | `"Factura Original"` visible |
| 8 | Verify | Expanded card main amount | - | Label remains `"Importe Total:"`; amount is `$3.518,34` / `$3518.34` | Amount visible |
| 9 | Verify absence | Expanded card financial block | - | No extra `"Descuento global"` block is shown | Detail panel stable |
| 10 | Verify absence | Expanded/payment summary | - | No `"Subtotal bruto"` / `"Descuento global"` / `"Total neto"` discount block appears for this sale | Detail panel stable |

**Post-test state:** Legacy row remains expanded. No data was modified.

---

**Group Rollback:** No rollback required. This group only reads existing historical data.

---

### TG-008-D-M: Multipago Y NC Historicos Con Descuento (Priority: P1)

**Objective:** Validar que el nuevo desglose tambien aparece en ventas multipago y notas de credito con descuento, sin cambiar el sentido contable ya validado en caja/recibos.

**Datos para este bloque:**
- URL: `http://localhost:4200`
- Credenciales: email `segu239@hotmail.com`, password `luissegu1`
- Sucursal: `Casa Central`
- Fecha de busqueda: `26/04/2026`
- Multipago objetivo: cliente `CONSUMIDOR FINAL` (`idcli=14242`), `FC 10000`, `id_num=175`, subtotal `$11.559,47`, descuento `$750,00`, total `$10.809,47`
- Nota credito objetivo: cliente `SARATE GERARDO FABIAN` (`idcli=564949`), `NC 1`, `id_num=176`, subtotal `$1.972,53`, descuento `$300,00`, total `$1.672,53`
- Nota operativa: `NC 1` no pertenece a `CONSUMIDOR FINAL`; si se busca con `idcli=14242`, no aparece. Para Test 002 se debe cambiar el cliente a `SARATE GERARDO FABIAN`.

---

#### Test 001: Venta multipago historica muestra descuento a nivel cabecera

**Validates:**
- El desglose aparece una sola vez a nivel cabecera/resumen.
- Los pagos/metodos de pago siguen mostrando importes netos.
- No se prorratea visualmente el descuento por producto o recibo.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Navigate | URL bar | `http://localhost:4200/components/historialventas2` | Historial page opens | Historial filters visible |
| 2 | Select or search | Cliente selector/input | `CONSUMIDOR FINAL` | Client is selected | Client context visible |
| 3 | Set | Fecha desde / hasta | `26/04/2026` to `26/04/2026` | Date range is set | - |
| 4 | Click | Button `"Consultar"` | - | Results load | Table rows finish loading |
| 5 | Locate | Results table | `FC 10000` | Row `FC 10000` appears with importe `$10.809,47` / `$10809.47` | Row visible |
| 6 | Click | Expand/details control for row `FC 10000` | - | Expanded panel opens | `"Factura Original"` visible |
| 7 | Verify | Expanded financial block | - | `"Subtotal bruto"` shows `$11.559,47` / `$11559.47` | Label and amount visible |
| 8 | Verify | Expanded financial block | - | `"Descuento global"` shows `$750,00` / `$750.00` | Label and amount visible |
| 9 | Verify | Expanded financial block | - | `"Total neto"` shows `$10.809,47` / `$10809.47` | Label and amount visible |
| 10 | Verify | Product/payment detail | - | Product rows still show gross item subtotals; payment/summary total remains net `$10.809,47` | Detail panel stable |

**Post-test state:** Multipago row remains expanded. No data was modified.

---

#### Test 002: Nota de credito historica muestra descuento con total neto documental

**Validates:**
- `NC` con descuento muestra bruto/descuento/neto.
- UI informa total neto documental positivo como magnitud de la nota.
- El test no revalida caja negativa; eso ya fue cubierto por TG-006.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Keep or navigate | Historial page | Current session | Historial page is available | Table/filter controls visible |
| 2 | Change selected client | Cliente selector/input or return to client list and use `"Historial"` | `SARATE GERARDO FABIAN` | Client context changes to `SARATE GERARDO FABIAN` | Client name visible in page context |
| 3 | Set | Fecha desde / hasta | `26/04/2026` to `26/04/2026` | Date range is set | - |
| 4 | Click | Button `"Consultar"` | - | Results load for `SARATE GERARDO FABIAN` | Table rows finish loading |
| 5 | Locate | Results table | `NC 1` / `id_num 176` | Row `NC 1` appears with importe `$1.672,53` / `$1672.53` | Row visible |
| 6 | Click | Expand/details control for row `NC 1` | - | Expanded panel opens | `"Factura Original"` or original document card visible |
| 7 | Verify | Expanded financial block | - | `"Subtotal bruto"` shows `$1.972,53` / `$1972.53` | Label and amount visible |
| 8 | Verify | Expanded financial block | - | `"Descuento global"` shows `$300,00` / `$300.00` | Label and amount visible |
| 9 | Verify | Expanded financial block | - | `"Total neto"` shows `$1.672,53` / `$1672.53` | Label and amount visible |
| 10 | Verify | Expanded card amount | - | Main amount uses total neto and does not display subtotal bruto as final amount | Detail panel stable |

**Post-test state:** Historical rows may remain expanded. No data was modified.

---

**Group Rollback:** No rollback required. This group only reads historical rows and expands UI details.

---

## Coverage Summary

### Statistics

| Metric | Value |
|--------|-------|
| **Total Test Groups** | 3 |
| **Total Tests** | 6 |
| **Total Steps** | 43 |
| **P0 (Critical)** | 0 tests |
| **P1 (High)** | 6 tests |
| **P2 (Medium)** | 0 tests |

### Features Covered

- [x] Login and protected access for historical validation.
- [x] `/Descarga/obtenerDatosExpandidos` sidecar consumption through Angular.
- [x] Detail expanded card shows `Subtotal bruto`, `Descuento global`, `Total neto`.
- [x] Detail expanded card uses net amount as final amount when discount exists.
- [x] Product rows remain gross and are not incorrectly netted.
- [x] Payments summary displays discount context without changing `bonifica`/`interes` semantics.
- [x] Historical receipt PDF includes discount context.
- [x] Historical receipt PDF keeps receipt `TOTAL` based on payment amount and avoids double-discount.
- [x] Legacy sale without discount hides the extra discount block.
- [x] Multipago sale with discount shows header-level discount.
- [x] NC sale with discount shows net documentary magnitude.

### Not Covered (with reasons)

- [ ] Creating new sales: already covered by TG-002 through TG-008; this plan intentionally validates historical display only.
- [ ] Database writes/rollback: no writes are performed by these tests.
- [ ] Caja negative SQL for NC: already covered by TG-006 and not changed by this UI display fix.
- [ ] PDF visual pixel-perfect layout: this plan validates text/data presence, not visual typography.
- [ ] Browser download folder cleanup: generated PDFs are local artifacts and do not affect application state.
- [ ] Historical list main grid columns for bruto/descuento/neto: outside scope; this fix targets expanded detail and receipt/PDF surfaces.

### Assumptions

- Backend uploaded by QA is the same logic as local `src/Descarga.php.txt`.
- The date format in date inputs may be locale-dependent; if direct typing `26/04/2026` fails, use the date picker to select April 26, 2026.
- Currency formatting may appear as Argentine format (`$5.212,20`) or raw PDF string format (`$ 5212.20`); both are accepted when the numeric value matches.
- `SARATE GERARDO FABIAN`, `CONSUMIDOR FINAL`, `FC 12345`, `FC 9999`, `FC 10000`, and `NC 1` remain in the QA database.
- `NC 1` belongs to `SARATE GERARDO FABIAN` (`idcli=564949`), not to `CONSUMIDOR FINAL` (`idcli=14242`).
- If the row is not visible on the first page, use the table search/filter or pagination to locate the exact document number.

### Test Execution Notes

- **Recommended execution order:** TG-008-D first, then TG-008-D-R, then TG-008-D-M.
- **State dependencies:** All groups depend on historical records created by previous TG execution. No group creates new database rows.
- **Estimated execution time:** 20-30 minutes for full suite, depending on table search speed and PDF capture method.
- **Primary pass criterion:** For discounted historical documents, every target surface shows the same triad: subtotal bruto, descuento global, total neto.
- **Regression pass criterion:** For non-discount historical documents, no empty or zero-valued discount block appears.
