# Frontend Specification

## Requirement IDs
- RF-01, RF-02, RF-04, RF-08, RNF-01, RNF-02, RNF-03, RNF-04

## Routes and Screens
- Mantener `src/app/components/carrito/carrito.component.html` como punto de captura del descuento global.

## UI Behavior
- Agregar bloque en resumen con:
  - `Subtotal bruto`
  - `Descuento global (%)`
  - `Importe descuento`
  - `Total neto`
- Etiqueta explicita: “Descuento global de operacion”.
- Resetear descuento al limpiar carrito o completar venta.

## State Boundaries
- Nuevo estado local en `carrito.component.ts` para porcentaje e importe descuento calculado.
- `this.suma` debe dejar de ser el unico total visible; mantener subtotal y total neto separados.

## UX Flows
- Sin descuento: comportamiento actual.
- Con descuento: recalculo inmediato del resumen.
- Con items `_soloConsulta`: no permitir finalizar si ya hoy el flujo bloquea la venta; el descuento no debe saltear esa regla.

## Integration Pattern
- El payload de `cabecera` debe enviar `bonifica` y `bonifica_tipo='P'`.
- El frontend no es autoridad monetaria; el backend valida y recalcula.

## Accessibility and Responsive
- El resumen debe verse en desktop y mobile sin ocultar subtotal/descuento/total.

## Unresolved Assumptions
- Ninguna para fase 1 recomendada.
