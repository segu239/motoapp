# Registro de implementacion: descuento global en carrito

Fecha de inicio: 2026-04-26

## Objetivo del cambio

Agregar un descuento global a nivel carrito sin modificar los precios unitarios guardados en `psucursal*`.

El criterio contable definido es:

- `psucursal*` conserva precio bruto por item.
- `factcab*`, `recibos*` y `caja_movi` guardan importes netos.
- `fact_descuento_global` guarda la auditoria de subtotal bruto, descuento y total neto.
- El flujo queda protegido por feature flag `descuento_global_activo`.

## Archivos modificados o creados

### Documentacion

- `docs/plan-descuento-global-carrito.md`
  - Se agrego una puesta a punto previa a implementacion.
  - Se documento disponibilidad real del codigo.
  - Se cerro el orden de implementacion recomendado.

- `docs/registro-implementacion-descuento-global-carrito.md`
  - Documento actual de seguimiento del cambio.

### Base de datos

- `migrations/2026_descuento_global_carrito.sql`
  - Crea `public.fact_descuento_global`.
  - Crea `public.app_feature_flags`.
  - Inserta `descuento_global_activo = false`.

### Backend PHP

- `src/Descarga.php.txt`
  - `PedidossucxappCompleto_post()` ahora reconoce `descuento_global` y `stock_movimientos`.
  - Si llega descuento o stock atomico, deriva a una rama transaccional nueva.
  - `Pedidossucxapp_post()` rechaza `descuento_global` y `stock_movimientos` para evitar saltarse cabecera, recibo, caja y sidecar.
  - `generarReciboAutomatico()` acepta modo estricto para operaciones con descuento.
  - Se agregaron helpers para:
    - leer feature flag;
    - calcular subtotal bruto desde productos;
    - calcular total canonico de cabecera;
    - bloquear cuenta corriente;
    - validar cierre de caja;
    - validar `codigo_mov` contra `tarjcredito.idcp_ingreso/idcp_egreso`;
    - aplicar stock dentro de la transaccion;
    - insertar `fact_descuento_global`;
    - insertar movimientos de caja en modo atomico.

### Frontend Angular

- `src/app/services/subirdata.service.ts`
  - `subirDatosPedidos(...)` ahora puede enviar `descuento_global` y `stock_movimientos`.

- `src/app/components/carrito/carrito.component.ts`
  - Se agregaron estados:
    - `descuentoGlobal`;
    - `subtotalBruto`;
    - `totalNeto`;
    - `subtotalesPorTipoPagoNetos`.
  - Se agregaron calculos y validaciones:
    - resumen bruto/descuento/neto;
    - bloqueo por cuenta corriente;
    - bloqueo para `PR` y `CS`;
    - bloqueo con items en modo solo consulta;
    - distribucion proporcional del descuento por medio de pago.
  - Si hay descuento, el stock se envia como `stock_movimientos` junto con la venta.
  - Si no hay descuento, el flujo legacy de stock previo se mantiene.
  - La cabecera usa total neto cuando hay descuento.
  - La caja usa subtotales netos por metodo de pago.
  - El PDF inmediato muestra subtotal bruto, descuento global y total neto.
  - En multipago, los datos bancarios/cheque se toman del item correspondiente al metodo de pago.

- `src/app/components/carrito/carrito.component.html`
  - Se agrego UI de descuento global en el resumen del carrito.
  - Se muestran subtotal bruto, descuento y total neto.
  - Se muestran avisos si existe cuenta corriente o si el documento es `PR/CS`.

- `src/app/components/carrito/carrito.component.css`
  - Se agregaron estilos para el panel de descuento global.

## Verificaciones realizadas

- `node_modules\\.bin\\tsc.cmd -p tsconfig.app.json --noEmit`
  - Resultado: correcto.

- `node_modules\\.bin\\ng.cmd build --configuration development`
  - Resultado: correcto.
  - Observaciones: solo warnings existentes de dependencias CommonJS.

## Verificaciones pendientes

- Sintaxis PHP con `php -l`.
  - No se pudo ejecutar porque `php` no esta disponible en PATH en el entorno actual.

- Revision `kluster_code_review_auto`.
  - No se pudo ejecutar porque la herramienta kluster no aparece disponible mediante `tool_search` en esta sesion.

- Prueba manual contra backend real:
  - venta sin descuento;
  - venta con descuento simple;
  - multipago sin cuenta corriente;
  - bloqueo con cuenta corriente;
  - bloqueo de `PR/CS`;
  - `NC/NV` con caja negativa;
  - rollback si falla sidecar, recibo, caja o stock.

## Estado operativo actual

La feature queda apagada por defecto.

Para preparar base de datos:

```sql
-- Ejecutar el archivo:
-- migrations/2026_descuento_global_carrito.sql
```

Para activar despues de desplegar y probar flujo legacy:

```sql
update public.app_feature_flags
set enabled = true,
    updated_at = now()
where flag_name = 'descuento_global_activo';
```

## Punto de restauracion recomendado

Si, conviene crear tablas alternativas con copia previa antes de ejecutar el plan o, como minimo, antes de activar el flag.

Motivo:

- El cambio toca tablas contables y operativas sensibles.
- Aunque el flujo esta gated por flag, una vez activado puede insertar cabeceras netas, recibos netos, caja neta, stock actualizado y sidecar.
- Un rollback operativo apagando el flag evita nuevas operaciones con descuento, pero no revierte operaciones ya emitidas.
- Tener snapshots SQL permite auditar y restaurar manualmente si una prueba controlada deja datos inconsistentes.

### Tablas recomendadas para snapshot

Como fase 1 modifica o consulta datos por sucursal, se recomienda copiar:

- `factcab1` a `factcab5`
- `psucursal1` a `psucursal5`
- `recibos1` a `recibos5`
- `caja_movi`
- `artsucursal`
- `tarjcredito`
- `app_feature_flags`, si ya existe
- `fact_descuento_global`, si ya existe

### Estrategia recomendada

Crear snapshots con sufijo de fecha/hora antes de activar:

```sql
create table backup_20260426_factcab1 as table factcab1;
create table backup_20260426_factcab2 as table factcab2;
create table backup_20260426_factcab3 as table factcab3;
create table backup_20260426_factcab4 as table factcab4;
create table backup_20260426_factcab5 as table factcab5;

create table backup_20260426_psucursal1 as table psucursal1;
create table backup_20260426_psucursal2 as table psucursal2;
create table backup_20260426_psucursal3 as table psucursal3;
create table backup_20260426_psucursal4 as table psucursal4;
create table backup_20260426_psucursal5 as table psucursal5;

create table backup_20260426_recibos1 as table recibos1;
create table backup_20260426_recibos2 as table recibos2;
create table backup_20260426_recibos3 as table recibos3;
create table backup_20260426_recibos4 as table recibos4;
create table backup_20260426_recibos5 as table recibos5;

create table backup_20260426_caja_movi as table caja_movi;
create table backup_20260426_artsucursal as table artsucursal;
create table backup_20260426_tarjcredito as table tarjcredito;
```

Para tablas nuevas, usar condicional manual segun existan en la base:

```sql
create table backup_20260426_app_feature_flags as table app_feature_flags;
create table backup_20260426_fact_descuento_global as table fact_descuento_global;
```

### Limitaciones de `create table as`

`create table ... as table ...` copia datos, pero no copia constraints, indices, triggers ni permisos.

Para restauracion completa de produccion es mejor un dump de PostgreSQL antes del despliegue:

```bash
pg_dump -Fc -d motomatchweb -f motomatchweb_pre_descuento_global_20260426.dump
```

Mi recomendacion practica:

1. Hacer `pg_dump` completo antes de tocar produccion.
2. Crear snapshots SQL de las tablas criticas para consultas rapidas.
3. Ejecutar migracion de `fact_descuento_global` y feature flag.
4. Desplegar backend/frontend.
5. Probar venta sin descuento con flag apagado.
6. Activar flag en una ventana controlada.
7. Probar casos de aceptacion con pocos comprobantes.

## Pendiente para siguientes iteraciones

- Crear un SQL versionado de snapshots si se decide incluirlo en repo.
- Ejecutar revision kluster cuando la herramienta este disponible.
