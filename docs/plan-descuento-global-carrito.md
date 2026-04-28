# Plan tecnico: descuento global en carrito

## Objetivo

Agregar al flujo de carrito la posibilidad de aplicar un descuento o bonificacion general sobre el total de la operacion, sin mezclar este cambio con el flujo de cuenta corriente.

El descuento se aplica a nivel global del carrito, no por item. Los items se conservan con su precio bruto en el detalle de venta, y la diferencia se registra como un dato auditable separado.

## Estado del plan

Este documento queda como plan v2 de implementacion. Antes de codear, las decisiones funcionales y tecnicas de alcance quedan cerradas asi:

- El descuento global solo nace desde carrito.
- `factcab*` guarda el total neto en sus campos contables existentes.
- `psucursal*` conserva precios brutos unitarios.
- `fact_descuento_global` es la fuente de verdad para subtotal bruto, descuento y total neto.
- No se agregan columnas a `factcab*` en fase 1.
- No se reutilizan `bonifica`, `bonifica_tipo`, `interes` ni `interes_tipo`.
- La fase 1 queda gated por feature flag para poder desactivar el flujo sin revertir datos.
- La correccion de `v_caja_movi_detalle_legacy` queda fuera de este plan; es un bug preexistente y debe tratarse en un plan separado.

## Estado de cobertura del plan

Este plan debe cubrir el flujo principal de venta y tambien los flujos secundarios que quedan afectados por cambiar el total contable de una operacion sin modificar los precios unitarios.

Flujos obligatorios incluidos:

- Alta de venta desde carrito.
- Descuento previo de stock y rollback/atomicidad.
- Cabecera `factcab*`.
- Detalle `psucursal*`.
- Recibo automatico `recibos*`.
- Movimientos de caja `caja_movi`.
- Multipago y reportes/vistas de caja.
- Cuenta corriente y bloqueo de descuento.
- PDF inmediato.
- PDF historico.
- Historial expandido y modales de recibos.
- Listados historicos/globales.
- Auditoria del descuento en tabla auxiliar.

## Puesta a punto previa a implementacion

Revision local: 2026-04-26.

Disponibilidad confirmada en codigo:

- Angular usa `SubirdataService.subirDatosPedidos(...)` contra `UrlpedidossucxappCompleto`.
- `subirDatosPedidos(...)` ya acepta `caja_movi` como cuarto parametro; falta extenderlo con `descuento_global` y `stock_movimientos`.
- `carrito.component.ts` ya centraliza `finalizar()`, `cabecera()`, `sumarCuentaCorriente()`, `crearCajasMovi()`, `crearCajaMoviLegacy()` e `imprimir()`.
- `PedidossucxappCompleto_post()` existe y hoy inserta cabecera, detalle, recibo automatico y `caja_movi`.
- `Pedidossucxapp_post()` existe como endpoint legacy de solo detalle; debe recibir una guarda explicita antes de habilitar descuento.
- Los endpoints historicos criticos existen: `CabeceraCompletaPDF_post()`, `obtenerDatosExpandidos_get()`, `obtenerDatosRecibo_get()`, `obtenerDatosRecibo2_get()`, `historialventasxsucxcli_get()`, `historialventas2xcli_get()` e `historialventas2global_get()`.
- `tarjcredito` ya expone `idcp_ingreso` e `idcp_egreso` hacia Angular.

Brechas confirmadas antes de empezar:

- No existe aun `fact_descuento_global`.
- No hay migraciones previas en el repo; se crea `migrations/2026_descuento_global_carrito.sql` como primer artefacto versionado.
- No se encontro una configuracion backend existente para feature flags; la migracion agrega una tabla simple `app_feature_flags`.
- El flujo actual descuenta stock desde frontend antes de confirmar la venta; esto debe corregirse antes de exponer la UI de descuento.
- `crearCajasMovi()` toma datos bancarios/cheque del primer item; para multipago debe resolverlos por metodo real de pago.
- `generarReciboAutomatico()` usa solo `basico + iva1`; debe cambiar a la formula canonica para la rama nueva.
- El backend no valida todavia cierre de cabecera, cierre de caja, cuenta corriente, tipo de comprobante ni consistencia de `codigo_mov`.

## Orden de implementacion cerrado

El orden correcto para fase 1 es:

1. Base de datos: crear `fact_descuento_global` y feature flag apagado por defecto.
2. Backend guard rails: agregar lectura de flag, guarda en `Pedidossucxapp_post()` y validaciones tempranas en `PedidossucxappCompleto_post()`.
3. Backend transaccional: abrir rama atomica nueva con `trans_begin()`, validacion de montos, insert de cabecera, detalle, stock, sidecar, recibo y caja; conservar rama legacy sin descuento.
4. Backend auxiliares: helper de stock por sucursal, helper de total canonico, helper de sidecar y validacion de `codigo_mov` contra `tarjcredito`.
5. Frontend contrato: extender `subirDatosPedidos(...)`, agregar estado/calculos de descuento y construir `descuento_global`/`stock_movimientos`.
6. Frontend flujo: bloquear cuenta corriente, `PR` y `CS`; mover el descuento de stock al payload atomico cuando haya descuento; mantener comportamiento legacy sin descuento.
7. Frontend caja/PDF inmediato: distribuir neto por medio, corregir datos bancarios por metodo y mostrar subtotal/descuento/neto.
8. Historicos/PDFs: exponer sidecar en endpoints criticos y usarlo en expansiones, recibos y PDFs.
9. Aceptacion: probar manualmente los casos sin descuento, con descuento simple, multipago, cuenta corriente bloqueada, `PR/CS` bloqueados, `NC/NV`, error transaccional y PDF historico.

No se debe activar `descuento_global_activo` hasta completar como minimo los pasos 1 a 7.

## Fuentes revisadas

Este plan se basa en el codigo Angular, los PHP espejo y consultas MCP a PostgreSQL. No depende de documentos previos de propuesta.

Archivos relevantes:

- `src/app/components/puntoventa/puntoventa.component.ts`
- `src/app/components/condicionventa/condicionventa.component.ts`
- `src/app/components/calculoproducto/calculoproducto.component.ts`
- `src/app/components/carrito/carrito.component.ts`
- `src/app/components/historialventas/historialventas.component.ts`
- `src/app/components/historialventas2/historialventas2.component.ts`
- `src/app/components/cabeceras/cabeceras.component.ts`
- `src/app/services/carrito.service.ts`
- `src/app/services/subirdata.service.ts`
- `src/app/services/historial-pdf.service.ts`
- `src/app/services/historial-ventas-paginados.service.ts`
- `src/app/services/historial-ventas2-paginados.service.ts`
- `src/app/services/totalizadores.service.ts`
- `src/Descarga.php.txt`
- `src/Carga.php.txt`

## Hallazgos de base

Base consultada: `motomatchweb`.

- PostgreSQL: `9.4.4`.
- No existe una tabla separada para descuento global.
- Existen tablas por sucursal: `factcab1..5`, `psucursal1..5`, `recibos1..5`.
- `factcab*.id_num` se usa como identificador de operacion, pero no tiene PK/unique declarado.
- Hay duplicados reales de `id_num`: `factcab1` tiene 9 valores duplicados, `factcab3` tiene 3 y `factcab5` tiene 20.
- `caja_movi.id_movimiento` si tiene primary key.
- `tarjcredito.cod_tarj` es unico.
- `cod_tarj = 111` corresponde a `CUENTA CORRIENTE`.
- Hay 25 operaciones reales multipago en `psucursal*`.
- Hay 10 operaciones reales multipago que mezclan cuenta corriente con otros medios, pero para este requerimiento no se debe permitir descuento cuando interviene cuenta corriente.
- `bonifica` e `interes` estan usados por comprobantes `RC`; no conviene reutilizarlos para descuento global de carrito.
- Existe la vista `v_caja_movi_detalle_legacy`, que reconstruye metodos de pago desde `caja_movi.codigo_mov = tarjcredito.idcp_ingreso`. Su correccion para egresos `NC/NV` queda fuera de fase 1 de descuento global.
- Solo se detecto un trigger relevante sobre estas tablas: backup antes de delete en `caja_movi`.
- En `factcab*` y `psucursal*` la columna de punto de venta se llama `puntoventa`; en `caja_movi` se llama `punto_venta`.

## Alcance funcional

El descuento global pertenece al flujo de carrito y aplica sobre el total bruto de la operacion, siempre que el carrito no incluya cuenta corriente.

Permitido:

- Carritos con un solo medio de pago distinto de `111`.
- Carritos con multipago, siempre que ningun item use `cod_tar = 111`.
- Fase 1: `FC`, `ND`, `NC` y `NV`, respetando el signo operativo actual.

Fuera de fase 1:

- `PR` y `CS` quedan fuera de fase 1; UI y backend rechazan descuento global para esos tipos.

No permitido:

- Cualquier carrito que tenga al menos un item con `cod_tar = 111`.
- `PR` y `CS` en fase 1.
- Items en modo solo consulta.
- Descuento menor a cero.
- Descuento mayor al subtotal bruto.

## Reglas de calculo

Calculo canonico:

```text
subtotal_bruto = sum(item.precio * item.cantidad)
descuento_monto = monto ingresado por operador
total_neto = subtotal_bruto - descuento_monto
```

Redondeo:

- Subtotales por item a 2 decimales, como hoy hace el carrito.
- Totales finales a 2 decimales.
- Para multipago, el frontend distribuye el descuento proporcionalmente por subtotal bruto de cada medio de pago.
- El frontend ajusta diferencias de centavos en el ultimo medio de pago para que la suma de subtotales netos cierre exactamente contra `total_neto`.
- Tolerancia de validacion backend: `abs(cabecera_total - total_neto) <= 0.01` y `abs(suma_caja - total_neto) <= 0.01`.
- El backend no valida la proporcionalidad por medio; valida solo que cabecera y suma de caja cierren contra `total_neto`. Esto evita duplicar algoritmos de redondeo TS/PHP.

Formula canonica de cabecera:

```text
cabecera_total = exento + basico + iva1 + iva2 + iva3
```

Para operaciones con descuento, recibo automatico, validacion de cabecera y validacion de caja deben usar esta misma formula.

Signo:

- Para `NC` y `NV`, `caja_movi.importe_mov` conserva la logica actual de egreso negativo.
- El descuento reduce la magnitud de la operacion. Ejemplo: bruto 10000, descuento 1000, caja para `NC` o `NV` = `-9000`.

## Modelo de datos propuesto

Crear una tabla auxiliar global:

```sql
create table public.fact_descuento_global (
  id serial primary key,
  cod_sucursal numeric(6,0) not null,
  cabecera_id_num integer not null,
  tipo_comprobante char(2) not null,
  numero_int numeric(10,0) not null,
  numero_fac numeric(8,0),
  puntoventa numeric(4,0) not null,
  subtotal_bruto numeric(12,2) not null,
  descuento_monto numeric(12,2) not null,
  total_neto numeric(12,2) not null,
  usuario char(12),
  origen varchar(20) not null default 'carrito',
  created_at timestamp without time zone not null default now(),
  constraint chk_fact_descuento_global_montos
    check (
      subtotal_bruto >= 0
      and descuento_monto >= 0
      and total_neto >= 0
      and descuento_monto <= subtotal_bruto
      and (
        tipo_comprobante <> 'FC'
        or (numero_fac is not null and numero_fac > 0)
      )
    ),
  constraint uq_fact_descuento_global_operacion
    unique (cod_sucursal, tipo_comprobante, puntoventa, numero_int, cabecera_id_num)
);
```

No se propone foreign key a `factcab*` porque el modelo esta particionado por sucursal y `id_num` no tiene constraint unique/PK en esas tablas.

La clave unica no debe depender solo de `cod_sucursal + cabecera_id_num` porque hay duplicados reales de `id_num` en algunas `factcab*`. Para operaciones nuevas, el sidecar debe guardar todos los identificadores disponibles para poder resolver ambiguedades historicas: sucursal, tipo, punto de venta, numero interno, numero factura y `id_num`.

El sidecar usa `puntoventa` para ser consistente con `factcab*`, `psucursal*`, `CabeceraCompletaPDF_post()` y el payload actual del carrito. Cuando se cruce contra `caja_movi`, el mapeo es `fact_descuento_global.puntoventa = caja_movi.punto_venta`.

La tabla sidecar se inserta solo cuando `descuento_monto > 0`. Para operaciones sin descuento no debe generarse fila.

La constraint unique propuesta esta pensada para operaciones nuevas generadas por el flujo de carrito. `puntoventa` y `numero_int` quedan `not null` porque PostgreSQL permite multiples `NULL` en columnas unique; si en el futuro se hace backfill historico, se debe validar primero que la tupla compuesta no tenga colisiones en los datos migrados.

Para `tipo_comprobante = 'FC'`, `numero_fac` debe venir informado y ser mayor a cero. Para `CS` y otros tipos fuera del alcance habilitado no se inserta sidecar.

Tipos contables:

- Usar `numeric(6,0)` para `cod_sucursal`, alineado con `factcab*.cod_sucursal`.
- Mantener `numeric(12,2)` en importes del sidecar para cerrar importes auditables con dos decimales.

## Contrato contable

Decision de persistencia:

- `factcab*.exento`, `basico`, `iva1`, `iva2`, `iva3` guardan valores netos.
- `factcab*.saldo` guarda saldo neto.
- `factcab*.bonifica`, `bonifica_tipo`, `interes`, `interes_tipo` no se usan para descuento global y deben conservar su semantica actual de recibos/cuenta corriente.
- `recibos*.importe` guarda importe neto.
- `recibos*.bonifica`, `bonifica_tipo`, `interes`, `interes_tipo` quedan en cero/default para operaciones nacidas desde descuento global de carrito.
- `caja_movi.importe_mov` guarda importe neto por medio de pago.

Consecuencia:

- Los listados que solo necesitan importe principal pueden usar `factcab` y mostrar neto.
- Cualquier pantalla, PDF o reporte que necesite explicar bruto/descuento/neto debe hacer `LEFT JOIN` o fetch explicito contra `fact_descuento_global`.
- Si una operacion historica no tiene sidecar, se interpreta como operacion sin descuento global. Una operacion nueva con `descuento_monto > 0` no puede confirmarse sin sidecar por la regla transaccional.

## Cambios frontend

### `carrito.component.ts`

Agregar estado:

- `descuentoGlobal: number`
- `subtotalBruto: number`
- `totalNeto: number`
- `subtotalesPorTipoPagoNetos`

Agregar funciones:

- `calcularResumenDescuentoGlobal()`
- `validarDescuentoGlobal()`
- `tieneCuentaCorrienteEnCarrito()`
- `calcularSubtotalesNetosPorTipoPago()`
- `buildDescuentoGlobalPayload()`
- `buildStockMovimientosPayload()`

Actualizar:

- `calculoTotal()` debe seguir calculando el bruto.
- `finalizar()` debe validar descuento antes de pedir cupon y antes de enviar el pedido.
- `finalizar()` no debe llamar `editarStockArtSucxManagedPHP(...)` antes de `agregarPedido()` cuando exista descuento global; debe construir `stock_movimientos` y enviarlo junto con la venta para que el backend lo procese atomico.
- `cabecera()` debe calcular `basico` e `iva1` usando `total_neto`.
- `sumarCuentaCorriente()` no debe participar cuando hay descuento, porque el descuento se bloquea si existe `cod_tar = 111`.
- `crearCajasMovi()` debe usar subtotales netos por medio.
- `crearCajaMoviLegacy()` debe usar `total_neto`.
- `imprimir()` debe mostrar subtotal bruto, descuento global y total neto.
- `pendientes()` debe bloquear descuento cuando el tipo de documento quede fuera del alcance permitido.
- El valor de descuento debe persistirse solo en memoria del componente y payload final; no debe modificar `itemsEnCarrito.precio`.

### `carrito.component.html`

Agregar UI junto al resumen:

- Campo numerico de descuento global.
- Linea de subtotal bruto.
- Linea de descuento.
- Linea de total neto.
- Mensaje/bloqueo cuando exista cuenta corriente en el carrito.

### `subirdata.service.ts`

Extender `subirDatosPedidos(...)` para enviar:

```ts
descuento_global: {
  subtotal_bruto: number;
  descuento_monto: number;
  total_neto: number;
  tipo_comprobante: 'FC' | 'ND' | 'NC' | 'NV' | 'PR';
  puntoventa: number;
  numero_int: number;
  numero_fac?: number;
  origen: 'carrito';
  usuario: string;
}
```

Si no hay descuento, no enviar el nodo o enviarlo con `descuento_monto = 0`.

Firma final:

```ts
subirDatosPedidos(data, cabecera, id, caja_movi?, descuento_global?, stock_movimientos?)
```

El payload final queda:

```ts
{
  pedidos: PedidoCarrito[];
  cabecera: FactCabPayload;
  id_vend: number;
  caja_movi?: CajaMoviPayload | CajaMoviPayload[];
  descuento_global?: DescuentoGlobalPayload;
  stock_movimientos?: StockMovimientoPayload[];
}
```

El payload final debe enviar `descuento_global` y `stock_movimientos` solamente despues de recalcularlos desde el estado actual del carrito.

## Cambios backend PHP

### `Descarga.php.txt`

En `PedidossucxappCompleto_post()`:

1. Leer feature flag `descuento_global_activo`.
2. Leer `descuento_global`.
3. Leer `stock_movimientos`.
4. Si `descuento_monto > 0` y `descuento_global_activo = false`, rechazar la operacion.
5. Si `descuento_monto > 0` o `stock_movimientos` viene informado, activar rama nueva atomica. Si no, preservar flujo legacy sin descuento para reducir blast radius.
6. Recalcular `subtotal_bruto` desde `pedidos`.
7. Rechazar si algun pedido tiene `cod_tar = 111` y `descuento_monto > 0`.
8. Validar `0 <= descuento_monto <= subtotal_bruto`.
9. Recalcular `total_neto`.
10. Rechazar descuento para tipos de documento fuera de alcance: si `descuento_monto > 0`, `cabecera.tipo` debe estar en `('FC','ND','NC','NV')`.
11. Validar que `cabecera_total = exento + basico + iva1 + iva2 + iva3` cierre contra `total_neto`.
12. Validar que la suma de `caja_movi.importe_mov` cierre contra `total_neto`, respetando signo en `NC/NV`.
13. Insertar `factcabX`.
14. Validar que `$this->db->insert_id()` devuelva un `id_num` numerico mayor que cero. Si devuelve `0`, `false` o `null`, hacer rollback.
15. Insertar `psucursalX`.
16. Aplicar `stock_movimientos` dentro de la misma transaccion.
17. Insertar `fact_descuento_global` dentro de la misma transaccion, solo si `descuento_monto > 0`.
18. Generar recibo automatico con importe neto.
19. Insertar `caja_movi`.
20. Si falla cualquier validacion o insert/update de stock, descuento, recibo o caja, abortar la transaccion completa.

El backend no debe confiar en los montos enviados por el frontend. Debe recalcular:

- `subtotal_bruto` desde `pedidos`.
- `total_neto`.
- `cabecera_total = exento + basico + iva1 + iva2 + iva3`.
- cierre de cabecera con tolerancia maxima de `0.01`.
- cierre de caja con tolerancia maxima de `0.01`.
- bloqueo por cuenta corriente.

### Atomicidad con stock

El flujo actual descuenta stock antes de llamar a `PedidossucxappCompleto_post()`. Esto deja riesgo de stock descontado si despues falla la validacion del descuento, la cabecera, el recibo, la caja o el sidecar.

Decision para fase 1:

- Extender `PedidossucxappCompleto_post()` para recibir `stock_movimientos` junto con pedidos, cabecera, caja y descuento.
- Dejar de llamar `editarStockArtSucxManagedPHP(...)` antes de `agregarPedido()` cuando se use descuento global.
- Mover la logica de actualizacion de stock dentro del mismo `trans_begin()` de venta.
- Unificar stock + venta + recibo + caja + sidecar en una unica transaccion backend.

Contrato minimo de `stock_movimientos`:

```ts
stock_movimientos: Array<{
  id_articulo: number;
  cantidad: number;
  sucursal: number;
}>
```

El backend deriva el campo `exi` desde la sucursal; el cliente no lo envia.

Mapeo backend obligatorio:

```php
$sucursal_exi = [
  1 => 'exi2',
  2 => 'exi3',
  3 => 'exi4',
  4 => 'exi1',
  5 => 'exi5',
];
```

La actualizacion debe hacerse inline o mediante helper privado dentro de `PedidossucxappCompleto_post()`, no mediante otro HTTP:

```sql
update artsucursal
set <campo_exi> = <campo_exi> + :delta
where id_articulo = :id_articulo;
```

Regla de signo de stock:

- `FC` y `ND`: `delta = -cantidad`.
- `NC` y `NV`: `delta = +cantidad`.
- No validar stock suficiente si el sistema actual permite stock negativo.
- Si el articulo no existe o el `update artsucursal` afecta `0` filas, abortar la transaccion completa.

El rollback compensatorio desde frontend queda descartado para la fase 1 salvo aprobacion explicita, porque mantiene una ventana donde el stock puede quedar inconsistente si falla la compensacion.

### Patron transaccional obligatorio

`PedidossucxappCompleto_post()` hoy usa `trans_start()` / `trans_complete()` y contiene `try/catch` internos que loguean errores sin abortar necesariamente la operacion. Para este cambio no alcanza con revisar `trans_status()` al final si los errores ya fueron absorbidos.

Implementar el flujo con control explicito:

- `trans_begin()` al inicio.
- Validar y recalcular antes de insertar.
- Verificar `affected_rows()` o estado de cada insert critico.
- Ante cualquier error de cabecera, productos, stock, sidecar, recibo o caja: `trans_rollback()` y respuesta de error.
- Solo hacer `trans_commit()` despues de confirmar que todos los cierres pasaron.
- No dejar `catch` internos que solo hagan `log_message()` en operaciones con descuento global.

### Fallos transaccionales obligatorios

Actualmente algunos fallos quedan solo logueados. Para este cambio, deben convertirse en errores transaccionales:

- Error al insertar recibo automatico.
- Error al insertar cualquier movimiento de `caja_movi`.
- Error al insertar sidecar `fact_descuento_global`.
- Diferencia mayor a `0.01` entre total neto, cabecera y caja.
- Diferencia entre descuento enviado y descuento recalculado.

No debe quedar una operacion con cabecera neta sin sidecar, ni una operacion con sidecar sin recibo/caja consistentes.

### Datos bancarios por medio de pago

Para multipago, cada movimiento de caja debe tomar los datos bancarios/tarjeta/cheque del item o grupo de items correspondiente al medio de pago. No debe copiar siempre los datos del primer item cuando el movimiento pertenece a otro metodo.

Validar especialmente:

- Tarjeta con cupon.
- Cheque.
- Transferencia.
- Efectivo.
- Multipago con combinaciones de los anteriores.

### `generarReciboAutomatico()`

El recibo hoy usa `basico + iva1`. Para operaciones con descuento, debe usar la misma formula canonica que la validacion:

```text
cabecera_total = exento + basico + iva1 + iva2 + iva3
```

No poblar `recibos*.bonifica`, `bonifica_tipo`, `interes` ni `interes_tipo` con el descuento global. Esos campos conservan la semantica actual de recibos/cuenta corriente. La huella del descuento sale exclusivamente de `fact_descuento_global`.

Para operaciones con descuento global, setear explicitamente:

```php
'bonifica' => 0,
'bonifica_tipo' => 'P',
'interes' => 0,
'interes_tipo' => 'P',
```

No copiar esos campos desde `$cabecera` en la rama con descuento global.

El `try/catch` de esta funcion no debe ocultar errores para operaciones con descuento. Si no se puede generar el recibo, debe fallar toda la transaccion.

### `PagoCabecera_post()`

El flujo de cuenta corriente no debe aplicar descuento global de carrito. No se agrega sidecar ni calculo de descuento aca.

Sin embargo, los listados y PDFs que combinan facturas con recibos deben poder mostrar correctamente una factura que ya nacio con descuento global desde carrito.

### `Pedidossucxapp_post()`

Existe como endpoint legacy que inserta solo en `psucursal*`. No se detecto uso desde Angular; el servicio actual usa `UrlpedidossucxappCompleto`.

Antes de implementar, confirmar con `rg` y logs de API si sigue recibiendo trafico. Si no se usa, documentarlo como deprecated. Si aun se usa, debe rechazar cualquier payload con `descuento_global` para evitar saltarse cabecera, sidecar, recibo y caja.

Guarda minima obligatoria: si `Pedidossucxapp_post()` recibe `descuento_global` o `stock_movimientos`, responder error y no insertar en `psucursal*`.

### `condicionventa.component.ts` y `cabeceras.component.ts`

- `condicionventa.component.ts` queda como flujo previo de seleccion; no debe calcular ni persistir descuento global.
- `cabeceras.component.ts` pertenece al flujo de cuenta corriente/pago de cabeceras; no aplica descuento global de carrito.
- Los cambios recientes de datos de tarjeta en cabeceras no modifican este plan, salvo que los listados/PDFs que consume cabeceras deben mostrar correctamente facturas que ya nacieron con sidecar desde carrito.

## Cambios historiales y comprobantes

### `Carga.php.txt`

Actualizar `CabeceraCompletaPDF_post()` para devolver:

- `id_num`
- datos de `fact_descuento_global` si existen para la cabecera.
- la busqueda del sidecar debe usar todos los identificadores disponibles (`tipo`, `puntoventa`, `numero_int`, `numero_fac`, `id_num`) y no solo `cod_sucursal + id_num`, porque hay `id_num` repetidos en `factcab`.

### `Descarga.php.txt` historico y expandido

Actualizar endpoints de historiales y recibos que hoy reconstruyen importes desde `factcab`, `psucursal` o recibos:

Fase 1 critica:

- `obtenerDatosExpandidos_get()`
- `obtenerDatosRecibo_get()`
- `CabeceraCompletaPDF_post()`

Fase 1.5:

- `historialventasxsucxcli_get()`
- `historialventas2xcli_get()`
- `historialventas2global_get()`
- `obtenerDatosRecibo2_get()`

Objetivos:

- Devolver metadata de `fact_descuento_global` cuando exista para la cabecera.
- Mantener el importe principal del listado como total neto de `factcab`.
- En expansiones y modales, exponer subtotal bruto, descuento global y total neto.
- Evitar que pantallas o PDFs historicos reconstruyan el total neto sumando `psucursal`, porque `psucursal` conserva precios unitarios brutos por producto.

### `historial-pdf.service.ts`

Actualmente el PDF historico recalcula total desde productos, lo que mostraria bruto si hay descuento global.

Actualizar para:

- Mostrar subtotal bruto desde productos o sidecar.
- Mostrar descuento desde sidecar.
- Mostrar total neto desde sidecar.
- Si no existe sidecar, mantener comportamiento actual.
- Si la operacion es posterior a la activacion de la feature y el endpoint indica que debia tener descuento pero el sidecar no aparece, mostrar error de integridad y no generar PDF con bruto como neto.

### `historialventas2.component.ts`

Las expansiones usan `obtenerDatosExpandidos_get()` y pueden recalcular subtotales desde productos. Deben usar el sidecar para mostrar subtotal bruto, descuento global y total neto.

Los PDFs generados desde datos expandidos deben usar el mismo criterio que el PDF inmediato y no reconstruir el total neto desde productos.

### `historialventas.component.ts`

Los modales y comprobantes historicos deben mostrar el descuento global cuando el endpoint lo devuelva.

Si el endpoint no devuelve sidecar, conservar el comportamiento actual para comprobantes historicos sin descuento global.

Fallback:

- Operacion sin sidecar y sin indicio de descuento: comportamiento legacy.
- Operacion con `descuento_global` esperado pero sidecar ausente: error visible de integridad, sin reconstruir el neto desde productos.
- El backend debe devolver siempre `id_num` para poder forzar fetch del sidecar si el primer endpoint no lo trajo.

### Listados historicos

Los listados que usan `importe = exento + basico + iva1 + iva2 + iva3` van a mostrar neto si la cabecera se guarda neta. No requieren recalculo especial para el total principal, pero pueden mostrar columnas adicionales de descuento en una fase posterior.

Los totalizadores deben seguir agregando importes netos. Si se agregan totales de descuento, deben salir del sidecar y no de diferencias entre productos y cabecera.

## Cambios reportes y caja

### `caja_movi`

- Los movimientos deben cerrar contra el total neto cobrado.
- En multipago, distribuir el descuento antes de generar cada movimiento para que la suma de caja coincida exactamente con la cabecera.
- Para `NC/NV`, los egresos deben quedar negativos y netos del descuento.
- Para `NC/NV`, `codigo_mov` debe tomar `tarjcredito.idcp_egreso`; para ingresos debe tomar `tarjcredito.idcp_ingreso`.
- El backend debe validar que el `codigo_mov` recibido corresponde al sentido del comprobante y al medio de pago, porque el front actual ya hace esta distincion pero el cierre contable no debe depender solo del cliente.
- Los metadatos de banco, tarjeta, cheque, transferencia y cupon deben pertenecer al medio real de cada movimiento, no al primer item de pago.

La correccion de `v_caja_movi_detalle_legacy` queda fuera de este plan. El descuento global no debe depender de cambiar esa vista en fase 1.

## Validaciones de aceptacion

Caso sin descuento:

- Comportamiento igual al actual.
- No se inserta fila en `fact_descuento_global`.
- No se modifican ni pisan campos `factcab*.bonifica`, `bonifica_tipo`, `interes` ni `interes_tipo`.

Caso con descuento y un medio no-CC:

- `factcab.exento + basico + iva1 + iva2 + iva3 = total_neto`.
- `recibos.importe = total_neto`.
- `caja_movi.importe_mov = total_neto` o negativo para `NC/NV`.
- `psucursal.precio` conserva precio bruto unitario.
- `fact_descuento_global` guarda subtotal bruto, descuento y neto.
- PDF inmediato e historico muestran subtotal, descuento y total neto.

Caso con descuento y multipago no-CC:

- La suma de movimientos de caja netos cierra contra `total_neto`.
- El descuento se distribuye proporcionalmente por medio de pago.
- La diferencia de centavos queda absorbida en el ultimo medio.
- Los datos bancarios, tarjeta, cheque, transferencia y cupon de cada movimiento corresponden al medio real de pago.

Caso con cuenta corriente:

- Si cualquier item tiene `cod_tar = 111` y el descuento es mayor que cero, la UI bloquea la operacion.
- El backend tambien rechaza el payload aunque la UI sea omitida.

Caso `PR` / `CS` en fase 1:

- La UI no permite aplicar descuento global.
- El backend rechaza cualquier payload con descuento global mayor que cero para estos tipos.

Caso con error despues de descontar stock:

- Si el stock se descuenta antes de confirmar la venta, cualquier error posterior debe restaurarlo.
- Si stock y venta se unifican en backend, el rollback debe cubrir stock, cabecera, productos, sidecar, recibo y caja.

Caso historico y expandido:

- El listado principal muestra importe neto.
- La expansion muestra subtotal bruto, descuento global y total neto.
- El PDF historico muestra el mismo total que la venta original.
- El modal de recibo no reconstruye el bruto como neto.

Caso caja y reportes:

- `caja_movi` cierra contra el total neto.
- Reportes por medio identifican correctamente ingresos y egresos.
- `NC/NV` quedan como egresos netos negativos.
- `NC/NV` usan `tarjcredito.idcp_egreso` como `codigo_mov`; ingresos usan `idcp_ingreso`.

Caso redondeo:

- Diferencias de `0.01` o menos entre cabecera, caja y total neto son toleradas y absorbidas en el ultimo medio.
- Diferencias mayores a `0.01` rechazan la operacion.

Caso transaccional:

- Un error en sidecar, recibo, caja o stock hace rollback completo.
- No queda cabecera insertada sin sidecar cuando habia descuento.
- No queda stock descontado si la venta no confirma.
- Si `$this->db->insert_id()` devuelve `0`, `false` o `null` despues de insertar `factcab*`, la transaccion hace rollback.

## Migracion y rollback

### Migracion

- Crear archivo SQL versionado para la tabla `fact_descuento_global`, por ejemplo `migrations/2026_descuento_global_carrito.sql`.
- Incluir indices y constraints en el mismo archivo.
- No hacer backfill historico en fase 1: no existia descuento global separado antes de este cambio y no hay forma confiable de reconstruirlo desde `factcab*`/`psucursal*`.

### Feature flag

- Agregar flag `descuento_global_activo`.
- Fuente recomendada: tabla/configuracion backend existente si la hay; si no existe, crear configuracion simple server-side por sucursal o global antes de exponer la UI.
- El backend es la autoridad del flag. La UI puede ocultar el campo, pero el PHP debe rechazar `descuento_monto > 0` si el flag esta apagado.
- Si el flag esta desactivado, la UI no muestra el campo de descuento y el backend rechaza `descuento_monto > 0`.
- La rama legacy sin descuento debe seguir operando mientras el flag este apagado.

### Rollback operativo

- Para desactivar la feature, apagar `descuento_global_activo`.
- No borrar `fact_descuento_global`; los comprobantes ya emitidos con descuento necesitan el sidecar para historicos y PDFs.

### Release notes

- Documentar que, desde la activacion de la feature, las operaciones con descuento global guardan importes netos en `factcab*.exento`, `basico`, `iva1`, `iva2`, `iva3` y `saldo`.
- Reportes externos que sumen esos campos seguiran viendo el total neto, pero la comparacion pre/post feature debe considerar que el bruto solo queda disponible en `fact_descuento_global`.
- Confirmar antes de release que ningun flujo de fase 1 dependa de corregir `v_caja_movi_detalle_legacy`.

## Consultas utilizadas

```sql
select current_database(), current_schema(), version();

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and (
    table_name ~ '^(factcab|psucursal|recibos)[0-9]+$'
    or table_name in ('caja_movi','tarjcredito','clisuc','sucursales')
    or table_name ilike '%descuento%'
    or table_name ilike '%bonifica%'
  )
order by table_name;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('factcab1','psucursal1','caja_movi')
  and column_name in ('puntoventa','punto_venta','numero_int','numero_fac','id_num','codigo_mov')
order by table_name, ordinal_position;

select cod_tarj, trim(tarjeta) as tarjeta, listaprecio, activadatos, idcp_ingreso, idcp_egreso
from tarjcredito
order by cod_tarj;

select tipo, count(*) as cantidad,
       round(sum(coalesce(exento,0)+coalesce(basico,0)+coalesce(iva1,0)+coalesce(iva2,0)+coalesce(iva3,0))::numeric,2) as importe_total,
       round(sum(coalesce(saldo,0))::numeric,2) as saldo_total
from factcab1
group by tipo
order by tipo;

select tabla, count(*) as id_num_duplicados
from (
  select 'factcab1' as tabla, id_num from factcab1 group by id_num having count(*) > 1
  union all select 'factcab2', id_num from factcab2 group by id_num having count(*) > 1
  union all select 'factcab3', id_num from factcab3 group by id_num having count(*) > 1
  union all select 'factcab4', id_num from factcab4 group by id_num having count(*) > 1
  union all select 'factcab5', id_num from factcab5 group by id_num having count(*) > 1
) d
group by tabla
order by tabla;

select cod_sucursal, id_num, count(distinct cod_tar) as medios
from (
  select 1 as cod_sucursal, id_num, cod_tar from psucursal1
  union all select 2, id_num, cod_tar from psucursal2
  union all select 3, id_num, cod_tar from psucursal3
  union all select 4, id_num, cod_tar from psucursal4
  union all select 5, id_num, cod_tar from psucursal5
) p
group by cod_sucursal, id_num
having count(distinct cod_tar) > 1;

select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'caja_movi',
    'factcab1','factcab2','factcab3','factcab4','factcab5',
    'psucursal1','psucursal2','psucursal3','psucursal4','psucursal5'
  )
order by event_object_table, trigger_name;
```
