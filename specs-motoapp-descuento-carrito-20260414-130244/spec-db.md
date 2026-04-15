# Database Specification

## Requirement IDs
- RF-03, RF-06, RF-08, RNF-01, RNF-03

## Existing Tables Used
- `factcab1..5`
- `psucursal1..5`
- `recibos1..5`
- `caja_movi`
- `artsucursal`

## Data Strategy
- Reutilizar `factcabX.bonifica` y `factcabX.bonifica_tipo`.
- Reutilizar `recibosX.bonifica` y `recibosX.bonifica_tipo`.
- No modificar `psucursalX` en fase 1.
- No modificar `caja_movi` en fase 1.

## Persistence Rules
- `factcabX`: guardar porcentaje de descuento y totales netos.
- `recibosX`: copiar descuento/tipo y total neto coherente.
- `psucursalX`: conservar precio por item sin distribuir el descuento global.

## Migration Approach
- Sin migraciones DDL para fase 1.

## Audit Notes
- La fuente de verdad del descuento es la cabecera, no el item.
- `artsucursal.descuento` no debe reinterpretarse como descuento global.
