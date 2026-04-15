# Draft Product - Descuento en carrito MotoApp

## Decision de producto
El cambio es viable si se modela como **descuento global de operacion** y no como descuento por item. La base real ya soporta ese concepto en `factcab1..5` y `recibos1..5` con `bonifica` y `bonifica_tipo`, mientras que `psucursal1..5` no tiene campo de descuento por linea.

## Flujos afectados end-to-end
- Alta de productos al carrito: los items ya cargan `precio`, `cantidad`, `cod_tar` y precios alternativos; el descuento nuevo no debe confundirse con `artsucursal.descuento`.
- Edicion del carrito: el componente debe separar subtotal bruto, descuento, neto, IVA y total final.
- Armado de cabecera: `cabecera()` hoy envia `bonifica=0`; debe empezar a enviar el descuento real y recalcular `basico`, `iva1` y `saldo`.
- Persistencia: los items pueden seguir en `psucursalX` sin descuento por linea; la fuente auditable queda en `factcabX` y `recibosX`.
- Caja: `crearCajasMovi()` debe trabajar con importes netos del descuento para que los movimientos cierren con el comprobante.
- PDF emitido desde carrito: debe mostrar linea de descuento y total neto.
- Historial/reimpresion: debe dejar de recomponer el total solo desde items y combinar cabecera + productos.

## Decisiones funcionales obligatorias
- Definir si el descuento sera solo porcentaje, solo importe o ambos.
- Definir si aplica a `FC`, `NC`, `ND`, `PR`, `CS` y/o `NV`.
- Definir la base de calculo: sobre total bruto, neto imponible o total final.
- Definir si el descuento se prorratea por metodo de pago para caja.
- Definir la presentacion visual: linea separada `Subtotal / Descuento / Total`.

## Opcion recomendada
- Reutilizar `bonifica` y `bonifica_tipo` como descuento global de cabecera.
- Mantener `psucursalX` sin cambio estructural en fase 1.
- Tomar cabecera como fuente de verdad monetaria para carrito, recibo, caja e historial.

## Riesgos de UX y operacion
- Confusion entre descuento global y descuento de articulo existente.
- Divergencia entre PDF emitido y PDF de historial.
- Divergencia entre caja y total neto si no se prorratea el descuento.
- Problemas de redondeo en multiples medios de pago.
- Riesgo de aplicar signos incorrectos en `NC`/`NV` si no se define semantica.

## Criterios de aceptacion
- AC-01: el carrito captura descuento global visible al operador. `[RF-01]`
- AC-02: recalcula subtotal, descuento, neto, IVA y total en forma consistente. `[RF-02][RNF-02]`
- AC-03: la cabecera persiste `bonifica` y `bonifica_tipo` reales. `[RF-03]`
- AC-04: el PDF del carrito muestra descuento y total neto. `[RF-04]`
- AC-05: el historial reimprime el mismo descuento y total que el comprobante original. `[RF-05][RNF-03]`
- AC-06: caja y recibos quedan alineados al monto efectivamente cobrado. `[RF-06]`

## Supuestos y preguntas abiertas
- Se prioriza descuento global y no por item.
- `artsucursal.descuento` sigue siendo un descuento del articulo, no del carrito.
- Debe definirse si fase 1 soporta solo porcentaje para bajar complejidad.
