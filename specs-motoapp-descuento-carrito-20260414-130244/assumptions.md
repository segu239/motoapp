# Assumptions

- A-01: Se analiza primero el descuento como descuento global de operacion, porque la DB ya tiene `bonifica` y `bonifica_tipo` en `factcabX` y `recibosX`.
- A-02: El descuento de articulo existente en `artsucursal.descuento` ya forma parte del precio del item y no equivale al nuevo descuento de carrito.
- A-03: El backend de ventas productivas sigue el flujo `SubirdataService.subirDatosPedidos` -> `PedidossucxappCompleto_post`.
- A-04: El historial PDF actual recompone el total desde productos y por eso requerira ajuste si el descuento vive solo en cabecera.
- A-05: El usuario pidio analisis completo, no implementacion ni migraciones efectivas en esta corrida.
