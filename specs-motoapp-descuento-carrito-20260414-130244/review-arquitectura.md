# Review Arquitectura

## Overall Assessment
**Score**: 8/10
**Verdict**: APPROVED_WITH_OBSERVATIONS

## Strengths
- Reutiliza `bonifica`/`bonifica_tipo` existentes en cabecera y recibos.
- Evita migraciones en `psucursalX` para la primera etapa.
- Identifica correctamente los puntos de divergencia entre carrito, caja, backend e historial.

## Requirement Coverage Audit
- RF-01/RF-02/RF-03: cubiertos con la decision de descuento global y formula canonica.
- RF-04/RF-05/RF-06: cubiertos tras exigir alineacion de PDF inmediato, historial y `caja_movi`.
- RNF-02/RNF-03: cubiertos al definir invariantes y una sola fuente de verdad monetaria.

## Blockers
- Ningun blocker pendiente tras rectificar el plan con formula canonica, recalculo servidor y politica de prorrateo.

## Risks
- Riesgo de diferencias de centavos en prorrateo por medios de pago.
- Riesgo de confusion con `artsucursal.descuento` si la UI no es explicita.

## Recommendations
- Implementar backend como autoridad monetaria.
- No liberar sin reconciliacion entre cabecera, recibo, caja y PDFs.

## Evidence
- `src/app/components/carrito/carrito.component.ts`
- `src/app/services/historial-pdf.service.ts`
- `src/Descarga.php.txt`
- `src/Carga.php.txt`
- `plan-tecnico.md`

## Rejection Criteria
- Rechazar si se intenta implementar solo UI sin recalculo servidor.
