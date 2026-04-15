# Draft Architecture - Descuento en carrito MotoApp

## Arquitectura actual del flujo
- `carrito.component.ts` calcula `this.suma` como suma de items y arma `cabecera()` usando ese total.
- `cabecera()` envia `bonifica=0`, `bonifica_tipo='P'`, `interes=0`, `interes_tipo='P'`.
- `SubirdataService.subirDatosPedidos()` envia `pedidos`, `cabecera`, `id_vend` y `caja_movi` al backend.
- `Descarga.php.txt` inserta cabecera en `factcabX`, items en `psucursalX`, recibo automatico en `recibosX` y movimientos en `caja_movi`.
- El PDF inmediato del carrito usa items y total calculado en frontend.
- `HistorialPdfService` consulta cabecera y productos, pero recompone `total` desde productos y solo muestra bonificacion/interes en `RC`.

## Puntos exactos de cambio
- Frontend carrito: nuevo estado de descuento global, calculos monetarios y render de resumen.
- `cabecera()`: pasar de `bonifica=0` a descuento real, recalculando `basico`, `iva1`, `saldo` y total canonico.
- `crearCajasMovi()`: repartir el descuento sobre los subtotales por medio de pago antes de generar `importe_mov`.
- Backend `PedidossucxappCompleto_post()`: validar consistencia del descuento recibido y del total neto.
- `generarReciboAutomatico()`: asegurar que el recibo use importes netos coherentes con cabecera.
- PDF de carrito: incluir linea de descuento y total neto.
- `HistorialPdfService`: usar cabecera como fuente de verdad del descuento y dejar de recalcular el total solo desde productos.
- Endpoints de `Carga.php.txt`: `CabeceraCompletaPDF_post()` ya expone `bonifica`/`bonifica_tipo`; `ProductosVentaPDF_post()` no expone descuento por item.

## Riesgos de consistencia y redondeo
- Caja mayor al comprobante si `caja_movi` sigue usando subtotales brutos.
- PDF emitido y reimpreso con totales distintos.
- Cuenta corriente/saldo inflados si no se descuenta antes de persistir.
- Diferencias de centavos por usar formulas distintas entre Angular, PHP y PG.

## Estrategia de backward compatibility
- Mantener defaults `bonifica=0` y `bonifica_tipo='P'` cuando no haya descuento.
- No cambiar la firma del endpoint de ventas.
- No migrar `psucursalX` en fase 1.
- Render condicional en PDF/historial cuando `bonifica` sea cero.

## Recomendacion arquitectonica final
- Descuento global de operacion reutilizando `bonifica`/`bonifica_tipo`.
- Total neto canonico compartido por carrito, cabecera, recibo, caja y PDFs.
- Fase 1 preferentemente solo porcentaje o una sola modalidad cerrada por negocio.

## Trazabilidad
- RF-01/RF-02: UI y calculos del carrito.
- RF-03: persistencia en `factcabX`/`recibosX`.
- RF-04/RF-05: PDF inmediato e historial.
- RF-06: caja y recibos automaticos.
- RNF-01/RNF-03: compatibilidad y consistencia intercapas.
