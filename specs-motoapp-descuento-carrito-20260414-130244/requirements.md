# Requirements Document - MotoApp descuento en carrito

## Executive Summary
Se necesita evaluar el impacto real de incorporar un descuento en el carrito, aplicable al total de la operacion o visible en comprobantes, verificando codigo, backend y base real antes de implementar.

## Primary Goal
Determinar una estrategia segura para soportar descuento en `carrito` con persistencia y reflejo consistente en facturas, notas, presupuestos, recibos e historial.

## Users and Roles
- Operador de ventas que arma el carrito y emite comprobantes.
- Administracion que revisa historial y reimprime comprobantes.
- Backend/DB que persiste cabecera, items, caja y recibos por sucursal.

## Core Features
- RF-01: permitir capturar descuento desde el flujo de carrito.
- RF-02: recalcular subtotal, neto, IVA, saldo y total usando el descuento.
- RF-03: persistir el descuento de forma auditable en DB.
- RF-04: reflejar el descuento en comprobantes generados en el carrito.
- RF-05: reflejar el descuento en reimpresion desde historial.
- RF-06: mantener consistencia con caja, recibos automaticos y multiples medios de pago.

## Secondary Features
- RF-07: distinguir descuento porcentual vs importe fijo, o documentar una unica opcion aprobada.
- RF-08: mantener trazabilidad entre descuento global y descuentos de articulo ya existentes.

## Non-Functional Requirements
- RNF-01: no romper ventas actuales sin descuento.
- RNF-02: mantener precision monetaria y redondeo coherente entre frontend, backend y DB.
- RNF-03: evitar divergencia entre PDF emitido, historial y datos persistidos.
- RNF-04: no afectar reglas actuales de tipos de pago y modo consulta.

## Integrations
- Angular carrito y componentes que cargan items al carrito.
- Backend `Descarga.php.txt` para `PedidossucxappCompleto_post` y generacion automatica de recibos.
- Postgres tablas `factcabX`, `psucursalX`, `recibosX`, `caja_movi`, `tarjcredito`, `artsucursal`.
- Firebase solo para secuenciales y sucursales; no parece ser el lugar de persistencia del descuento operativo.

## Constraints
- El modelo actual guarda items en tablas por sucursal (`psucursal1..5`) y cabeceras/recibos tambien por sucursal.
- Los items no tienen campo de descuento persistido en DB.
- Las cabeceras si exponen `bonifica` y `bonifica_tipo` y ya son usadas en otro flujo (`cabeceras.component.ts`).
- El PDF de historial recompone total desde productos y no desde cabecera, lo que puede ignorar descuentos globales.

## Out of Scope
- Implementar el cambio en esta etapa.
- Redisenar por completo el modelo contable o fiscal.
- Cambiar estructura de tablas por sucursal a un modelo unificado.

## Success Criteria
- Se identifica la opcion mas segura para representar descuento.
- Se listan todos los puntos a modificar en frontend, backend y DB.
- Se documentan riesgos, dependencias y pruebas necesarias.
- Se emite una decision auditable de viabilidad con plan de implementacion.

## Open Questions
- El descuento requerido debe ser solo porcentual, solo importe, o ambos.
- Debe distribuirse proporcionalmente por item para subtotales/caja/historial o basta como descuento global en cabecera.
- Debe imprimirse como linea separada o como ajuste del total.
