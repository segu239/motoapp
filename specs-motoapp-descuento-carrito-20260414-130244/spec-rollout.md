# Rollout and Operability Specification

## Requirement IDs
- RF-06, RNF-01, RNF-03

## Environments
- Probar primero en entorno controlado con DB representativa.

## Rollout Steps
1. Desplegar backend con recalculo servidor.
2. Desplegar frontend de carrito.
3. Validar piloto por sucursal o grupo reducido.
4. Ejecutar reconciliacion diaria.
5. Expandir gradualmente.

## Observability
- Log por comprobante con subtotal, descuento, total neto y suma de caja.
- Reporte de reconciliacion diaria por sucursal.

## Rollback Strategy
- Deshabilitar descuento para nuevas operaciones si se detecta descuadre.
- No alterar comprobantes ya emitidos; investigarlos con evidencia SQL/PDF.
