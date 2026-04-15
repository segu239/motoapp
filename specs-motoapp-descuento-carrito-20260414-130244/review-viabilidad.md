# Review Viabilidad

## Overall Assessment
**Score**: 8/10
**Verdict**: APPROVED_WITH_OBSERVATIONS

## Strengths
- La DB ya soporta `bonifica`/`bonifica_tipo` en `factcabX` y `recibosX`.
- No requiere migracion de esquema para fase 1.
- El endpoint actual soporta el cambio sin alterar firma.

## Requirement Coverage Audit
- RF-03 queda cubierto con persistencia en cabecera/recibo.
- RF-06 queda cubierto si `caja_movi` usa subtotales netos prorrateados.
- RF-07 queda resuelto al recomendar fase 1 solo porcentaje.

## Blockers
- Ninguno luego de fijar la formula, el prorrateo y el recalculo servidor.

## Risks
- Riesgo operativo si se habilita importe fijo sin una fase posterior controlada.

## Recommendations
- Mantener fase 1 acotada a porcentaje global.
- Validar UAT con multiples medios de pago.

## Evidence
- Postgres: `factcabX`, `recibosX`, `psucursalX`, `caja_movi`, `artsucursal`.
- `src/Descarga.php.txt`
- `src/Carga.php.txt`
- `plan-tecnico.md`

## Rejection Criteria
- Rechazar si se cambia el modelo a descuento por item en esta etapa.
