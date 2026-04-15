# Technical Development Plan - MotoApp descuento en carrito

## Plan Summary
Agregar un descuento en `src/app/components/carrito` es **viable** si se implementa como **descuento global de operacion** reutilizando `bonifica` y `bonifica_tipo` en `factcabX` y `recibosX`. La opcion no recomendada para una primera etapa es descuento por item, porque `psucursalX` no tiene estructura para persistirlo y eso abriria mas deuda tecnica y riesgo de inconsistencia.

## System Vision
El carrito debe manejar un total canonico compartido por toda la cadena: UI, cabecera persistida, movimientos de caja, recibo automatico, PDF emitido y PDF reimpreso desde historial. Hoy esa cadena no esta alineada porque el descuento global existe en el modelo de cabecera, pero el flujo de carrito no lo usa y el historial recompone totales desde items.

## Architecture Overview
- Entrada: `calculoproducto.component.ts` carga items al carrito con precios, cantidades, `cod_tar`, precios alternativos y metadatos.
- Orquestacion: `carrito.component.ts` calcula totales, arma cabecera, genera movimientos de caja y dispara persistencia.
- Integracion: `subirdata.service.ts` envia `pedidos`, `cabecera` y `caja_movi` a `PedidossucxappCompleto_post`.
- Persistencia: `Descarga.php.txt` inserta cabecera en `factcabX`, detalle en `psucursalX`, recibo automatico en `recibosX` y movimientos en `caja_movi`.
- Reimpresion: `historial-pdf.service.ts` consulta `CabeceraCompletaPDF_post` y `ProductosVentaPDF_post`.

## Main Components
- `src/app/components/carrito/carrito.component.ts`
- `src/app/components/carrito/carrito.component.html`
- `src/app/components/calculoproducto/calculoproducto.component.ts`
- `src/app/services/subirdata.service.ts`
- `src/app/services/historial-pdf.service.ts`
- `src/Descarga.php.txt`
- `src/Carga.php.txt`

## Technology Stack
- Frontend Angular 15 con PrimeNG y pdfMake.
- Backend CodeIgniter/PHP expuesto a Angular.
- Postgres con tablas particionadas por sucursal (`factcab1..5`, `psucursal1..5`, `recibos1..5`).
- Firebase para secuenciales/sucursales, no para persistencia principal del descuento.

## Domain Modules
- Carrito y calculo de venta.
- Persistencia de cabecera y detalle.
- Caja y medios de pago.
- Generacion de comprobantes.
- Historial y reimpresion.

## Data Model Strategy
### Evidencia real de DB
- `factcab1..5`: tienen `basico`, `iva1`, `bonifica`, `bonifica_tipo`, `interes`, `interes_tipo`, `saldo`, `id_num`.
- `recibos1..5`: tienen `importe`, `bonifica`, `bonifica_tipo`, `interes`, `interes_tipo`.
- `psucursal1..5`: tienen `idart`, `cantidad`, `precio`, `cod_tar`, `id_num`, sin descuento.
- `artsucursal`: tiene `descuento` a nivel articulo.

### Decision de datos
- Reutilizar `bonifica` y `bonifica_tipo` para el descuento global del carrito.
- No agregar columnas a `psucursalX` en fase 1.
- Mantener `artsucursal.descuento` como concepto separado.
- Tomar cabecera/recibo como fuente de verdad del descuento y total neto.

### Decision funcional rectificada
- **Fase 1 recomendada:** descuento **porcentual global** solamente.
- Persistencia: `bonifica = porcentaje`, `bonifica_tipo = 'P'`.
- Si negocio mas adelante requiere importe fijo, se habilita en fase 2 usando el mismo modelo, pero queda fuera de la primera implementacion segura.

### Formula canonica obligatoria
1. `subtotal_bruto = sum(item.precio * item.cantidad)`.
2. `descuento_pct = bonifica` si `bonifica_tipo = 'P'`, en rango `0..100`.
3. `importe_descuento = round(subtotal_bruto * descuento_pct / 100, 2)`.
4. `total_neto = round(subtotal_bruto - importe_descuento, 2)`.
5. `basico = round(total_neto / 1.21, 4)`.
6. `iva1 = round(total_neto - basico, 4)`.
7. `saldo_cc = round(total_neto * proporcion_cuenta_corriente, 2)` cuando corresponda.
8. `sum(caja_movi.importe_mov) = total_neto` con residuo asignado al medio de pago de mayor importe.

### Invariantes obligatorias
- `total_neto >= 0`.
- `importe_descuento <= subtotal_bruto`.
- `round(basico + iva1, 2) = total_neto`.
- `sum(movimientos_caja) = total_neto`.
- PDF inmediato e historial deben mostrar el mismo `subtotal_bruto`, `importe_descuento` y `total_neto`.

## API and Integration Strategy
- Mantener el endpoint `PedidossucxappCompleto_post` sin cambiar firma.
- Ajustar el contenido de `cabecera` para enviar el descuento real.
- El backend no debe confiar en los importes enviados por el navegador: debe **recalcular** descuento, neto, IVA, saldo y movimientos de caja antes de persistir.
- Validaciones backend minimas:
  - `bonifica_tipo = 'P'` en fase 1.
  - `0 <= bonifica <= 100`.
  - no permitir `total_neto < 0`.
  - verificar coherencia entre items, cabecera y `caja_movi`.
- Aprovechar que `CabeceraCompletaPDF_post` ya devuelve `bonifica`, `bonifica_tipo`, `interes` e `interes_tipo`.

## Security and Compliance Strategy
- Validar rango de descuento en frontend y backend.
- Evitar totales negativos, descuentos mayores al subtotal o combinaciones inconsistentes con notas/devoluciones.
- Mantener intactas las validaciones actuales de tipos de pago y modo consulta.
- No tomar `sessionStorage` como fuente confiable de importes finales; el backend debe recomputar desde datos validados.
- Registrar en logs por comprobante: subtotal bruto, descuento, total neto, cantidad de medios de pago y suma final de caja.

## Delivery Phases
### Fase 1 - Decision funcional y formula canonica
- Cerrar que fase 1 usa descuento porcentual global.
- Aplicarlo sobre `subtotal_bruto` del carrito.
- Definir regla unica de prorrateo por medio de pago y de redondeo.

### Fase 2 - Backend y persistencia
- Cambiar `cabecera()` para poblar `bonifica`/`bonifica_tipo`.
- Ajustar `basico`, `iva1`, `saldo` y recibo automatico al total neto.
- Alinear `caja_movi` con subtotales netos.
- Recalcular importes en backend antes de insertar `factcabX`, `recibosX` y `caja_movi`.

### Fase 3 - Frontend y comprobantes
- Incorporar UI de descuento y resumen monetario en carrito.
- Mostrar descuento en PDF del carrito.
- Corregir historial para reimprimir con el mismo criterio.
- Integrar el descuento con modo consulta sin permitir finalizar ventas inconsistentes.

### Fase 4 - Pruebas y rollout
- Validacion funcional, SQL y documental.
- UAT con casos reales controlados.

## Test and Quality Strategy
- Casos sin descuento y con descuento.
- Casos con un solo medio y multiples medios de pago.
- Comparacion entre total UI, `factcabX`, `recibosX`, `caja_movi` y PDFs.
- Regresion sobre `FC`, `NC`, `ND`, `PR`, `CS` y reimpresiones historicas.
- Casos borde: descuento `0`, descuento `100`, intento de porcentaje invalido, multiples medios con residuo de centavos, cuenta corriente, items en modo consulta.
- Reconciliacion SQL post-deploy por comprobante piloto.

## Operability and Rollout Strategy
- Rollout controlado luego de validar que no hay divergencia entre comprobantes y DB.
- Monitoreo inicial de ventas nuevas con descuento.
- Contingencia: volver temporalmente al valor por defecto `bonifica=0` si aparece inconsistencia.
- Piloto por sucursal o grupo reducido de operadores.
- Muestreo 100% de comprobantes con descuento en la ventana inicial.
- Reporte de reconciliacion diaria entre `factcabX`, `recibosX`, `caja_movi` y PDFs.

## Technical Risks and Mitigations
- Riesgo: historial sigue sumando items y desconoce descuento.
  Mitigacion: usar cabecera como total canonico y mostrar descuento de forma explicita.
- Riesgo: caja no cierra con comprobante.
  Mitigacion: prorratear descuento sobre subtotales de medios de pago.
- Riesgo: confusion con `artsucursal.descuento`.
  Mitigacion: naming y UI explicitos para “descuento global de operacion”.
- Riesgo: diferencias de centavos.
  Mitigacion: una sola formula y regla de residuo/redondeo.

## Effort and Team Assumptions
- Cambio transversal de complejidad media-alta.
- Requiere coordinacion entre frontend, backend y validacion funcional.
- No requiere migracion de esquema en la opcion recomendada.

## Recommended Decision
Implementar fase 1 como **descuento porcentual global de operacion** usando `bonifica`/`bonifica_tipo`, con ajuste obligatorio de:
- calculos del carrito,
- armando de cabecera,
- recibo automatico,
- movimientos de caja,
- PDF inmediato,
- historial/reimpresion.

No aprobar una implementacion que solo agregue el campo visual en carrito sin recalculo servidor y sin alinear historial/caja.
