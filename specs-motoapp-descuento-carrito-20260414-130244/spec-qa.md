# QA Specification

## Requirement IDs
- RF-01, RF-02, RF-04, RF-05, RF-06, RNF-01, RNF-02, RNF-03, RNF-04

## Acceptance Criteria
- UI, DB y PDFs muestran el mismo descuento y total neto.
- Sin descuento, el sistema se comporta igual que hoy.

## Test Layers
- UI manual del carrito.
- Integracion Angular -> PHP.
- Verificacion SQL en Postgres.
- Reimpresion desde historial.

## Smoke Plan
- Venta sin descuento.
- Venta con 10% de descuento.
- Venta con multiples medios de pago.
- Reimpresion del mismo comprobante.

## Regression Matrix
- `FC`, `NC`, `ND`, `PR`, `CS`, `NV`.
- Modo consulta.
- Cuenta corriente.

## Non-Functional Tests
- Redondeo con decimales.
- Reconciliacion entre `factcabX`, `recibosX`, `caja_movi` y PDF.
