# Complete Technical Specifications - MotoApp descuento en carrito

## Requirements
Ver `requirements.md`.

## Coverage Matrix Summary
- Cobertura must-have: completa para la ruta recomendada.
- Ruta aprobada: descuento porcentual global de operacion.

## Approved Technical Plan
Ver `plan-tecnico.md`.

## Evaluation Summary
- Resultado aprobado con observaciones operativas.
- La decision de datos recomendada evita migraciones en `psucursalX`.

## Frontend Specification
Ver `spec-frontend.md`.

## Backend Specification
Ver `spec-backend.md`.

## Database Specification
Ver `spec-db.md`.

## QA Specification
Ver `spec-qa.md`.

## Rollout and Operability Specification
Ver `spec-rollout.md`.

## Implementation Checklist
- Agregar UI de descuento global en carrito.
- Separar subtotal bruto, descuento e importe neto en calculos del carrito.
- Poblar `bonifica`/`bonifica_tipo` en cabecera.
- Recalcular en backend antes de persistir.
- Ajustar `generarReciboAutomatico()`.
- Ajustar `crearCajasMovi()` con subtotales netos.
- Mostrar descuento en PDF del carrito.
- Corregir historial para usar cabecera como fuente de verdad monetaria.
- Ejecutar reconciliacion SQL/PDF en piloto.

## Decision Traceability
- La decision clave es usar `bonifica`/`bonifica_tipo` ya existentes.

## Key Risks and Assumptions
- Riesgo principal: divergencia entre caja, cabecera y PDFs si no se recalcula servidor.
- Supuesto aprobado: fase 1 solo porcentaje global.
