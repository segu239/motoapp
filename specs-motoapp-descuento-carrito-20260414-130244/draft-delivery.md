# Draft Delivery - Descuento en carrito MotoApp

## Fases recomendadas
- Fase 0: cerrar decision funcional sobre tipo de descuento y alcance documental.
- Fase 1: definir formula canonica, payload y fuente de verdad en datos.
- Fase 2: ajustar backend/persistencia y validaciones.
- Fase 3: implementar UI y calculos en carrito.
- Fase 4: alinear PDF del carrito y PDF de historial.
- Fase 5: regresion integral y rollout controlado.

## Riesgos y mitigaciones
- Divergencia carrito/historial: corregir ambos PDFs en la misma entrega.
- Persistencia parcial: no liberar UI sin backend validado.
- Redondeos distintos: definir una regla unica y probar con decimales.
- Caja inconsistente: validar cierre entre comprobante y suma de `caja_movi`.

## Estrategia de rollout
- Probar primero en entorno controlado.
- Ejecutar UAT con comprobantes reales de prueba.
- Habilitar de forma acotada si operativamente es posible.
- Monitorear ventas, recibos y reimpresiones al inicio.

## Estrategia de pruebas
- Venta sin descuento.
- Venta con descuento.
- Multiples items.
- Multiples medios de pago.
- Reimpresion desde historial.
- Verificacion SQL de `factcabX`, `recibosX` y `caja_movi`.

## Criterios de salida
- No hay divergencia entre UI, DB, PDF emitido y PDF reimpreso.
- Backward compatibility sin descuento validada.
- Pruebas de caja, recibos y comprobantes aprobadas.
