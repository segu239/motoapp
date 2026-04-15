# Backend Specification

## Requirement IDs
- RF-02, RF-03, RF-06, RNF-01, RNF-02, RNF-03, RNF-04

## Services and Endpoints
- Reutilizar `PedidossucxappCompleto_post`.
- Reutilizar `generarReciboAutomatico()`.
- Reutilizar `CabeceraCompletaPDF_post()` y `ProductosVentaPDF_post()` para reimpresion, ajustando el consumo del total.

## Validation Rules
- `bonifica_tipo` fijo en `'P'` para fase 1.
- `0 <= bonifica <= 100`.
- No aceptar `total_neto < 0`.
- Verificar coherencia entre items, cabecera y suma de `caja_movi`.

## Canonical Recompute
- Recalcular subtotal, descuento, total neto, `basico`, `iva1`, `saldo` y montos de caja en servidor.
- No insertar cabecera ni movimientos usando ciegamente importes del navegador.

## Receipt and Cash
- `generarReciboAutomatico()` debe usar total neto coherente con cabecera.
- `caja_movi` debe persistir subtotales netos ya prorrateados.

## Errors
- Rechazar payload inconsistente con mensaje explicito.

## Unresolved Assumptions
- Ninguna para fase 1 recomendada.
