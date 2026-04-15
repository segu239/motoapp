# Brief - MotoApp descuento en carrito

## Objetivo
Analizar de punta a punta la factibilidad e impacto de agregar un campo de descuento en `src/app/components/carrito` para que modifique correctamente el flujo de venta y los comprobantes.

## Alcance pedido
- Revisar frontend Angular del carrito y su armado de payload.
- Revisar backend PHP/CodeIgniter que persiste cabeceras, items, caja y recibos.
- Verificar la base Postgres real via MCP.
- Considerar comprobantes generados al vender y los PDFs reimpresos desde historial.

## Contexto confirmado por evidencia
- El carrito hoy calcula total desde `itemsEnCarrito` y arma `cabecera` con `bonifica=0` e `interes=0`.
- Los items del carrito persisten en `psucursalX` con `precio`, `cantidad`, `cod_tar` e `id_num`, sin campo de descuento.
- Las cabeceras `factcabX` y `recibosX` si tienen `bonifica`, `bonifica_tipo`, `interes`, `interes_tipo`.
- El PDF del carrito y el PDF del historial muestran total y subtotales por metodo de pago, pero no un descuento de carrito para FC/NC/ND/PR/CS.

## Resultado esperado
Un paquete de especificacion y decision tecnica que indique:
- si el cambio es viable,
- donde tocar codigo y datos,
- riesgos de consistencia,
- plan recomendado para implementar y validar.
