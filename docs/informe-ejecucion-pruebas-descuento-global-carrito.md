# Informe de Ejecucion - Descuento Global En Carrito

Fecha de ejecucion: 26/04/2026
Entorno UI: `http://localhost:4200`
API: `https://motomatch.segu239.com`
Sucursal: Casa Central (`cod_sucursal = 1`)
Usuario QA: `segu239@hotmail.com`
Documento base: `docs/plan-pruebas-descuento-global-carrito.md`

## Estado general

| TG | Escenario | Estado | Observacion |
| --- | --- | --- | --- |
| TG-001 | Setup y acceso a carrito | PASS | Login, seleccion de sucursal y panel de descuento global disponibles. |
| TG-002 | Venta FC sin descuento mantiene flujo legacy | PASS | Venta creada sin sidecar de descuento; recibo y caja por total bruto/neto. |
| TG-003 | FC con descuento simple y un medio de pago | PASS | Flujo UI/backend y SQL directo aprobados. |
| TG-004 | FC multipago sin cuenta corriente | PASS | Dos medios no-CC, descuento aplicado, caja distribuida y cerrada contra total neto. |
| TG-005 | Bloqueos UI/backend para casos no permitidos | PASS | Cuenta Corriente primaria, PR, CS y backend bypass aprobados; no hubo persistencia invalida. |
| TG-006 | NC/NV con descuento y caja negativa | PASS | NC finalizada; SQL directo confirma sidecar, caja negativa y `codigo_mov = idcp_egreso = 71`. |
| TG-007 | Rollback transaccional por error controlado | PASS | Payload inconsistente rechazado con HTTP 400 y sin escrituras residuales confirmadas por MCP Postgres. |
| TG-008 | PDF inmediato e historico con descuento | PASS | PDF inmediato y PDF historico/reimpresion muestran subtotal bruto, descuento global, total neto y total final neto. |
| TG-008-D | Detalle expandido y recibo historico con descuento | PASS | Detalle expandido, resumen de pagos y PDF de recibo historico muestran bruto/descuento/neto sin doble descuento. |
| TG-008-D-R | Regresion legacy sin descuento en detalle expandido | PASS | Venta legacy `FC 9999` conserva label `Importe Total` y no muestra bloques vacios de descuento. |
| TG-008-D-M | Multipago y NC historicos con descuento | PASS | Multipago `FC 10000` y NC `1` aprobados; ambos muestran bruto/descuento/neto en detalle historico. |

## TG-001 - Setup y Acceso a Carrito

Estado: PASS
Prioridad: P0
Resultado: 7/7 pasos aprobados.

### Evidencia registrada

- Login exitoso en `http://localhost:4200/login2` con el usuario QA.
- Sucursal seleccionada: Casa Central.
- Redireccion correcta a `/components/puntoventa`.
- Navegacion protegida a `/components/carrito` correcta.
- Panel de descuento global visible con:
  - Descuento global: `0`
  - Subtotal bruto: `$0.00`
  - Descuento: `$0.00`
  - Total neto: `$0.00`

### Impacto

El setup operativo queda validado. No se crearon ventas ni se modificaron datos de negocio.

## TG-002 - Venta FC Sin Descuento Mantiene Flujo Legacy

Estado: PASS
Resultado: 12/12 checks aprobados.

### Datos de venta

| Campo | Valor |
| --- | --- |
| Cliente | CONSUMIDOR FINAL (`id_cli = 1457`, cliente `109`) |
| Condicion de venta | TRANSFERENCIA EFECTIVO (`cod_tarj = 1111`) |
| Documento | FC, letra B |
| Numero comprobante | `9999` |
| Vendedor | Samuel |
| Descuento global | `$0.00` |
| Producto 1 | ACOPLE FIL-AIRE C/CARB G.SMASH CORT 7142 - `$1,972.53` |
| Producto 2 | ACOPLE FIL-AIRE C/CARB G.SMASH LARG 12815 - `$1,545.81` |
| Subtotal bruto | `$3,518.34` |
| Total neto | `$3,518.34` |
| `factcab1.id_num` | `173` |

### Validaciones aprobadas

- Modal final: "Pedido enviado".
- Carrito vacio post-venta.
- `factcab1`: registro FC creado con `bonifica = 0`, `saldo = 0`, total cabecera `$3,518.34`.
- `fact_descuento_global`: 0 filas, comportamiento esperado para descuento cero.
- `recibos1`: `importe = 3518.34`, `recibo_asoc = 173`, `cod_tar = 1111`.
- `caja_movi`: `importe_mov = 3518.34`, `num_operacion = 173`, tipo `FC`, numero `9999`.

### Conclusion TG-002

El flujo legacy sin descuento no presenta regresion. El payload omite correctamente `descuento_global` cuando el monto es cero.

## TG-003 - FC Con Descuento Simple Y Un Medio De Pago

Estado: PASS
Resultado funcional: 11/11 pasos UI/backend aprobados.
Resultado SQL directo: 2/2 consultas pendientes aprobadas.

### Datos de venta

| Campo | Valor |
| --- | --- |
| Cliente | CONSUMIDOR FINAL (`id_cli = 1457`, `idcli = 14242`) |
| Producto 1 | ACEL. RAP. MDA 3010 6470 (`idart = 7323`) - `$5,212.20` |
| Producto 2 | ACEL. RAP. MDA ECONOMIC 3012 0004 (`idart = 5411`) - `$4,691.46` |
| Condicion de pago | TRANSFERENCIA EFECTIVO (`cod_tar = 1111`, no CC) |
| Documento | FC, letra B |
| Numero comprobante | `9999` |
| Vendedor | Samuel |
| Descuento global | `$1,000.00` |
| Subtotal bruto | `$9,903.66` |
| Total neto | `$8,903.66` |
| `factcab1.id_num` | `174` |
| Recibo | `253` |

### Validaciones UI/backend aprobadas

- Login y contexto Casa Central correctos.
- Carrito preparado con 2 productos.
- Operacion `FACTURA` activa con numero de comprobante habilitado.
- Vendedor Samuel seleccionado.
- Descuento global `1000` aplicado en tiempo real.
- Panel de totales consistente: `9903.66 - 1000.00 = 8903.66`.
- POST a `PedidossucxappCompleto` finalizo con HTTP 200.
- SweetAlert mostro "Pedido enviado".
- PDF generado y enviado por `Telegram/sendDocument` con HTTP 200.
- Carrito reseteado a total `$0.00` y 0 productos.

### Validaciones SQL/API aprobadas

- `factcab1`: `id_num = 174`, `tipo = FC`, `numero_int = 9999`, `saldo = 0`.
- Total cabecera canonico: `exento + basico + iva1 + iva2 + iva3 = 8903.66`.
- `psucursal1`: 2 filas, suma `precio * cantidad = 9903.66`.
- `recibos1`: `recibo_asoc = 174`, `importe = 8903.66`, `bonifica = 0`, `interes = 0`, tipos `P`.
- `fact_descuento_global`: fila creada con `cod_sucursal = 1`, `cabecera_id_num = 174`, `tipo_comprobante = FC`, `numero_int = 9999`, `numero_fac = 9999`, `subtotal_bruto = 9903.66`, `descuento_monto = 1000.00`, `total_neto = 8903.66`, `origen = carrito`.
- `caja_movi`: fila creada con `num_operacion = 174`, `importe_mov = 8903.66`, `codigo_mov = 31`, `tipo_comprobante = FC`, `numero_comprobante = 9999`.

### Consultas SQL de cierre formal

Ejecutadas y aprobadas:

```sql
select cod_sucursal, cabecera_id_num, tipo_comprobante, numero_int, numero_fac,
       subtotal_bruto, descuento_monto, total_neto, origen, usuario
from fact_descuento_global
where cod_sucursal = 1 and cabecera_id_num = 174;
```

Resultado esperado:

- `subtotal_bruto = 9903.66`
- `descuento_monto = 1000.00`
- `total_neto = 8903.66`
- `tipo_comprobante = 'FC'`
- `numero_int = 9999`
- Resultado obtenido: coincide.

```sql
select num_operacion, importe_mov, codigo_mov, tipo_comprobante, numero_comprobante
from caja_movi
where sucursal = 1 and num_operacion = 174;
```

Resultado esperado:

- Suma de `importe_mov = 8903.66`
- `tipo_comprobante = 'FC'`
- `numero_comprobante = 9999`
- Resultado obtenido: coincide.

### Conclusion TG-003

El flujo funcional con descuento simple queda aprobado de punta a punta. El sidecar `fact_descuento_global` fue insertado con los importes esperados y `caja_movi` suma exactamente el total neto.

## TG-004 - Multipago Sin Cuenta Corriente

Estado: PASS
Resultado funcional: 11/11 validaciones UI/backend aprobadas.
Resultado SQL/API: cabecera, caja, suma de caja y `idcp_ingreso` aprobados.

### Datos de venta

| Campo | Valor |
| --- | --- |
| Cliente | CONSUMIDOR FINAL (`id_cli = 1457`) |
| Documento | FC, letra B |
| Numero comprobante | `10000` |
| Vendedor | Samuel |
| Fecha | 26/04/2026 |
| `cod_sucursal` | `1` |
| `factcab1.id_num` | `175` |
| Descuento global | `$750.00` |
| Subtotal bruto | `$11,559.47` |
| Total neto | `$10,809.47` |

### Productos y medios de pago

| Articulo | Descripcion | Precio | Metodo de pago | Cupon |
| --- | --- | --- | --- | --- |
| `7323` | ACEL. RAP. MDA 3010 6470 | `$5,212.20` | TRANSFERENCIA EFECTIVO (`cod_tar = 1111`) | - |
| `5411` | ACEL. RAP. MDA ECONOMIC 3012 0004 | `$6,347.27` | Bancat (`cod_tar = 4`) | `123456` |

### Validaciones UI/backend aprobadas

- Login y contexto Casa Central correctos.
- Carrito con dos productos y dos medios de pago no cuenta corriente.
- Navegacion a `/components/carrito` correcta.
- Operacion `FACTURA` activa.
- Numero comprobante `10000` ingresado correctamente.
- Vendedor Samuel seleccionado.
- Descuento global `750` aplicado; total neto actualizado a `$10,809.47`.
- Subtotales por tipo de pago visibles: TRANSFERENCIA EFECTIVO `$5,212.20` y Bancat `$6,347.27`.
- Finalizacion enviada con modal "Enviando..." y dialogo de cupon Bancat requerido.
- Modal final "Pedido enviado" visible.
- Ningun item uso `cod_tar = 111`; codigos usados: `1111` y `4`.

### Validaciones SQL/API aprobadas

- `factcab1`: `id_num = 175`, `tipo = FC`, `numero_int = 10000`, `saldo = 0`.
- Total cabecera canonico: `exento + basico + iva1 + iva2 + iva3 = 10809.47`.
- Descuento global aplicado: `11559.47 - 750.00 = 10809.47`.
- `caja_movi`: 2 movimientos, coincide con `count(distinct cod_tar) = 2`.
- `caja_movi`: codigo `13`, importe `$5,935.45`, concepto INGRESO TARJETA BANCAT, caja `4`.
- `caja_movi`: codigo `31`, importe `$4,874.02`, concepto INGRESO TRANSFERENCIA DEBITO, caja `5`.
- Suma de caja: `$5,935.45 + $4,874.02 = $10,809.47`.
- `tarjcredito`: Bancat `idcp_ingreso = 13`; TRANSFERENCIA EFECTIVO `idcp_ingreso = 31`.
- Para FC, cada `caja_movi.codigo_mov` corresponde al `idcp_ingreso` del metodo de pago.

### Distribucion proporcional del descuento

| Metodo | Bruto | Porcentaje | Descuento proporcional | Neto esperado | Neto en caja |
| --- | --- | --- | --- | --- | --- |
| TRANSFERENCIA EFECTIVO | `$5,212.20` | `45.09%` | `$338.16` | `$4,874.04` | `$4,874.02` |
| Bancat | `$6,347.27` | `54.91%` | `$411.84` | `$5,935.43` | `$5,935.45` |
| Total | `$11,559.47` | `100%` | `$750.00` | `$10,809.47` | `$10,809.47` |

La diferencia de redondeo de 2 centavos fue absorbida por Bancat y la suma final cierra exactamente contra el total neto.

### Nota de evidencia

La salida pegada confirma cabecera, caja, suma de caja y correspondencia con `idcp_ingreso`. La fila cruda de `fact_descuento_global` no fue pegada como tabla directa; el descuento queda registrado en este informe por consistencia entre UI, subtotal bruto, total cabecera y cierre de caja. Si se requiere auditoria formal, agregar la consulta directa de `fact_descuento_global` para `cod_sucursal = 1` y `cabecera_id_num = 175`.

### Conclusion TG-004

El flujo multipago sin cuenta corriente queda aprobado. El total neto coincide con cabecera y caja, se generaron dos movimientos por dos medios de pago, y los conceptos de caja corresponden a los `idcp_ingreso` esperados.

## TG-005 - Bloqueos De UI Y Backend Para Casos No Permitidos

Estado: PASS
Resultado: 3 PASS completos.
Conclusion funcional: no se persistieron ventas invalidas.

### Resumen ejecutivo

| Test | Descripcion | Estado |
| --- | --- | --- |
| TG-005/001 | Cuenta Corriente bloquea descuento en UI | PASS |
| TG-005/002 | PR y CS bloquean descuento en UI | PASS |
| TG-005/003 | Backend rechaza payloads bypass | PASS |

### TG-005/001 - Cuenta Corriente Bloquea Descuento En UI

Estado: PASS
Motivo: el anexo TG-005-A confirmo Cuenta Corriente como condicion primaria y el bloqueo esperado completo.

Evidencia inicial con CONSUMIDOR FINAL:

- El usuario inicio sesion en Casa Central correctamente.
- Se selecciono cliente CONSUMIDOR FINAL.
- Se agrego el producto "SOLUCION PEGAMENTOS PARA PARCHES 8g" con TRANSFERENCIA EFECTIVO por `$514.29`.
- Al cambiar el tipo de pago a CUENTA CORRIENTE desde el carrito, el sistema puso el item en "SOLO CONSULTA / Simulado".
- Al ingresar descuento global `$500.00`, se mostro el warning inline esperado: "No se permite descuento global cuando interviene cuenta corriente."
- El total neto quedo en `$14.29`.
- Al hacer clic en "Finalizar Venta", el boton estaba deshabilitado por modo consulta con tooltip "No puede finalizar con items en modo consulta".
- No se mostro el Swal "Descuento global invalido" porque el bloqueo por modo consulta ocurre primero.

Evidencia de cierre con TG-005-A:

- Se selecciono el cliente SARATE GERARDO FABIAN, DNI `18176072`, Monotributo, vendedor luis.
- CUENTA CORRIENTE aparecio como condicion de venta primaria en el dropdown.
- Se selecciono CUENTA CORRIENTE y quedo visible el badge "Lista de Precios: CUENTA CORRIENTE".
- `sessionStorage` confirmo `cod_tarj = 111`, `tarjeta = CUENTA CORRIENTE`, `nombreTarjeta = CUENTA CORRIENTE`.
- Se agrego el producto ACOPLE FIL-AIRE C/CARB G.SMASH CORT 7142 por `$2320.50`, con tipo de pago CUENTA CORRIENTE.
- Al ingresar descuento global `$500.00`, aparecio el warning inline esperado: "No se permite descuento global cuando interviene cuenta corriente."
- El total neto quedo en `$1820.50`.
- Al hacer clic en "Finalizar Venta", se mostro Swal con titulo "Descuento global invalido" y texto "No se permite descuento global cuando interviene cuenta corriente."
- No hubo requests HTTP de escritura al backend durante el intento.
- El numero de comprobante estaba vacio y no se proceso venta.

Validacion:

- Warning inline correcto.
- Swal de error correcto para CC primaria.
- Usuario no puede finalizar venta.
- No se persistio ninguna venta.
- La validacion especifica de `cod_tar = 111` se ejecuto antes de cualquier llamada de persistencia.

Hallazgo:

CUENTA CORRIENTE no aparece como condicion de venta inicial para CONSUMIDOR FINAL, pero si aparece para clientes habilitados como SARATE GERARDO FABIAN. Esto cierra la brecha funcional del test. Como mejora UX menor, el boton "Finalizar Venta" queda habilitado visualmente y el bloqueo se muestra al hacer click.

### TG-005/002 - PR Y CS Bloquean Descuento En UI

Estado: PASS

Evidencia:

- Carrito preparado con "SOLUCION PEGAMENTOS PARA PARCHES 8g" y TRANSFERENCIA AJUSTE.
- Al cambiar a PRESUPUESTO e ingresar descuento global `$500.00`, se mostro el warning inline: "El descuento global no esta habilitado para PR ni CS."
- Al finalizar PRESUPUESTO, se mostro Swal "Descuento global invalido" con el mensaje esperado.
- Al cambiar a CONSULTA con descuento activo, el sistema mostro el mismo bloqueo.
- El carrito permanecio disponible para correccion.
- No se creo venta PR/CS con descuento.

Observacion adicional:

Al intentar PRESUPUESTO con un metodo no compatible, el sistema mostro "Restriccion de Presupuestos" con metodos permitidos. Es una proteccion adicional no documentada en el plan inicial.

### TG-005/003 - Backend Rechaza Payloads Bypass

Estado: PASS

Payload enviado:

```json
{
  "id_vend": 1,
  "pedidos": [],
  "descuento_global": {
    "descuento_monto": 500
  }
}
```

Endpoint:

```text
POST https://motomatch.segu239.com/APIAND/index.php/Descarga/Pedidossucxapp
```

Respuesta esperada y obtenida:

- HTTP status: `400`.
- Body `error`: `true`.
- Body `mensaje`: "El endpoint legacy no soporta descuento_global ni stock_movimientos".

Body completo:

```json
{"error":true,"mensaje":"El endpoint legacy no soporta descuento_global ni stock_movimientos"}
```

### Verificacion SQL De No Persistencia

Salida reportada:

```text
NOTICE:  CABECERA: id_num=<NULL>, total=<NULL>, saldo=<NULL>
NOTICE:  DESCUENTO: subtotal=<NULL>, desc=<NULL>, neto=<NULL>
NOTICE:  SUMA CAJA: <NULL>

Query returned successfully with no result in 28 ms.
```

Interpretacion:

- No se encontro cabecera para el intento validado.
- No se encontro fila en `fact_descuento_global`.
- No se encontro suma de movimientos en `caja_movi`.
- El estado de base coincide con el resultado esperado: la operacion invalida no persistio datos.

### Conclusion TG-005

TG-005 queda aprobado completo. Cuenta Corriente primaria, PR, CS y endpoint legacy bloquean correctamente el descuento global no permitido, y no se persistieron datos invalidos. Queda solo una observacion UX menor: en CC primaria el boton de finalizar permanece habilitado visualmente hasta que la validacion muestra el Swal.

## TG-006 - NC/NV Con Descuento Y Caja Negativa

Estado: PASS
Resultado UI/backend: PASS.
Resultado SQL directo: PASS.

### Datos de la operacion

| Campo | Valor |
| --- | --- |
| Documento | `NC` |
| Numero comprobante | `1` |
| `factcab1.id_num` | `176` |
| Sucursal | `1` Casa Central |
| Producto | ACOPLE FIL-AIRE C/CARB G.SMASH CORT 7142 |
| Medio de pago | TRANSFERENCIA EFECTIVO (`cod_tarj = 1111`) |
| Vendedor | Samuel |
| Subtotal bruto | `$1,972.53` |
| Descuento global | `$300.00` |
| Total neto | `$1,672.53` |

### Validaciones UI/backend aprobadas

- Usuario ya autenticado como LUIS en Casa Central.
- Producto agregado al carrito con TRANSFERENCIA EFECTIVO.
- Operacion cambiada a NOTA CREDITO.
- Numero comprobante `1` ingresado.
- Vendedor Samuel seleccionado.
- Descuento global `300` aplicado; total neto actualizado a `$1,672.53`.
- Al finalizar, se mostro modal "Enviando...".
- Resultado exitoso: Swal "Pedido enviado" con mensaje de sucursal 1.
- Backend incremento correctamente el numero secuencial NC.
- Telegram recibio POST exitoso con status `200`.

### Evidencia de logs frontend

```text
Tipo de documento: NC - Es egreso: true
Metodo 1/1: TRANSFERENCIA EFECTIVO - $1672.53 (concepto: 71, egreso: true)
Caja obtenida: ID 5 para TRANSFERENCIA EFECTIVO (concepto: 71)
Movimientos de caja creados: Array(1)
```

Interpretacion:

- La UI/backend trataron `NC` como egreso.
- El movimiento de caja esperado debe ser negativo por `$1,672.53`.
- El concepto esperado es `71`, correspondiente a `tarjcredito.idcp_egreso` para TRANSFERENCIA EFECTIVO.

### SQL de cierre formal

Ejecutado por MCP Postgres en base `motomatchweb`:

```sql
select id_num, tipo, numero_int,
       round((coalesce(exento,0)+coalesce(basico,0)+coalesce(iva1,0)+coalesce(iva2,0)+coalesce(iva3,0))::numeric,2) as total_cabecera,
       saldo
from factcab1
where tipo = 'NC'
  and numero_int = 1
order by id_num desc
limit 1;
```

Con el `id_num` obtenido:

```sql
select cod_sucursal, cabecera_id_num, tipo_comprobante, numero_int,
       subtotal_bruto, descuento_monto, total_neto, origen, usuario
from fact_descuento_global
where cod_sucursal = 1
  and cabecera_id_num = :id_num
  and tipo_comprobante = 'NC';
```

```sql
select num_operacion, importe_mov, codigo_mov, tipo_comprobante, numero_comprobante
from caja_movi
where sucursal = 1
  and num_operacion = :id_num;
```

```sql
select distinct p.cod_tar, tc.tarjeta, tc.idcp_egreso
from psucursal1 p
join tarjcredito tc on tc.cod_tarj = p.cod_tar
where p.id_num = :id_num;
```

Resultado esperado:

- `fact_descuento_global.descuento_monto = 300.00`.
- `fact_descuento_global.total_neto = 1672.53`.
- `caja_movi.importe_mov = -1672.53`.
- `caja_movi.codigo_mov = 71`.
- `tarjcredito.idcp_egreso = 71` para TRANSFERENCIA EFECTIVO.

Resultado obtenido:

| Consulta | Resultado |
| --- | --- |
| `factcab1` | `id_num = 176`, `tipo = NC`, `numero_int = 1`, `total_cabecera = 1672.53`, `saldo = 0.0000` |
| `fact_descuento_global` | `cabecera_id_num = 176`, `tipo_comprobante = NC`, `subtotal_bruto = 1972.53`, `descuento_monto = 300.00`, `total_neto = 1672.53`, `origen = carrito` |
| `caja_movi` | `num_operacion = 176`, `importe_mov = -1672.53`, `codigo_mov = 71`, `tipo_comprobante = NC`, `numero_comprobante = 1` |
| `tarjcredito` | `cod_tar = 1111`, `tarjeta = TRANSFERENCIA EFECTIVO`, `idcp_egreso = 71` |
| cierre caja vs neto | `suma_caja = -1672.53`, `total_neto = 1672.53` |

### Conclusion TG-006

TG-006 queda aprobado completo. La NC guardo sidecar, impacto caja en negativo y uso el concepto de egreso configurado.

## TG-007 - Rollback Transaccional Por Error Controlado

Estado: PASS
Resultado API: PASS.
Resultado SQL directo: PASS.

### Payload de prueba

| Campo | Valor |
| --- | --- |
| Endpoint | `http://100.65.39.89/APIAND/index.php/Descarga/PedidossucxappCompleto` |
| `numero_int` | `999887766` |
| `subtotal_bruto` | `$1,210.00` |
| `descuento_global.descuento_monto` | `$100.00` |
| `descuento_global.total_neto` | `$1,110.00` |
| `cabecera.basico` | `$1,000.00` |
| `cabecera.iva1` | `$210.00` |
| `cabecera.basico + iva1` | `$1,210.00` |
| Diferencia contra total neto | `$100.00` |
| `stock_movimientos` | Incluido para alcanzar la validacion de cabecera |

### Respuesta backend

Resultado obtenido:

```json
{
  "error": true,
  "mensaje": "La cabecera no cierra contra el total neto"
}
```

Validaciones:

- HTTP status `400`.
- Mensaje exacto: `"La cabecera no cierra contra el total neto"`.
- Primer intento sin `stock_movimientos` rechazo antes con `"Faltan movimientos de stock para operar con descuento global"`, confirmando que la validacion estructural precede a la contable.

### SQL directo por MCP Postgres

Ejecutado sobre base `motomatchweb`:

```sql
select
  (select count(*) from factcab1 where numero_int = 999887766) as factcab_rows,
  (select count(*) from fact_descuento_global where cod_sucursal = 1 and numero_int = 999887766) as descuento_rows,
  (select count(*) from caja_movi where sucursal = 1 and numero_comprobante = 999887766) as caja_rows,
  (select count(*) from psucursal1 p join factcab1 f on f.id_num = p.id_num where f.numero_int = 999887766) as detalle_rows,
  (select max(id_num) from factcab1) as max_factcab1_id_num;
```

Resultado:

| Campo | Valor |
| --- | --- |
| `factcab_rows` | `0` |
| `descuento_rows` | `0` |
| `caja_rows` | `0` |
| `detalle_rows` | `0` |
| `max_factcab1_id_num` | `176` |

### Conclusion TG-007

TG-007 queda aprobado completo. El backend rechazo la cabecera inconsistente antes de dejar escrituras persistidas, y MCP Postgres confirmo ausencia de cabecera, detalle, sidecar y caja para el comprobante de prueba. No se requiere rollback manual.

## TG-008 - PDF Inmediato Y Cobertura Historica Pendiente

Estado: PASS
Resultado PDF inmediato: PASS.
Resultado PDF historico/reimpresion: PASS tras TG-008-R.

### Datos de venta usada

| Campo | Valor |
| --- | --- |
| Cliente | SARATE GERARDO FABIAN (`id_cli = 564949`) |
| Documento | FC |
| Numero comprobante | `12345` |
| `factcab1.id_num` | `177` |
| Producto | ACEL. RAP. MDA 3010 6470 (`idart = 7323`) |
| Cantidad | `1` |
| Precio unitario / subtotal bruto | `$5,212.20` |
| Descuento global | `$1,000.00` |
| Total neto | `$4,212.20` |
| Vendedor | Samuel |
| Fecha | 26/04/2026 |

### Validaciones UI/backend aprobadas

- Venta finalizada correctamente con Swal "Pedido enviado".
- `POST /Descarga/PedidossucxappCompleto` respondio HTTP `200`.
- Envio por Telegram `sendDocument` respondio HTTP `200`.
- PDF inmediato generado client-side por `pdfMake`.
- La funcion `imprimir(...)` recibe `descuentoGlobalPayload`.
- La plantilla inmediata renderiza `Subtotal bruto`, `Descuento global` y `Total neto` cuando `descuento_monto > 0`.
- El total final del PDF inmediato usa `this.totalNeto` cuando hay descuento activo.

### SQL directo por MCP Postgres

Ejecutado sobre base `motomatchweb`:

| Consulta | Resultado |
| --- | --- |
| `factcab1` | `id_num = 177`, `tipo = FC`, `numero_int = 12345`, `numero_fac = 12345`, `total_cabecera = 4212.20`, `saldo = 0.0000` |
| `fact_descuento_global` | `cabecera_id_num = 177`, `tipo_comprobante = FC`, `numero_int = 12345`, `subtotal_bruto = 5212.20`, `descuento_monto = 1000.00`, `total_neto = 4212.20`, `origen = carrito` |
| `caja_movi` | `num_operacion = 177`, `importe_mov = 4212.20`, `codigo_mov = 31`, `tipo_comprobante = FC`, `numero_comprobante = 12345` |

### Revalidacion PDF historico

El flujo historico de PDF, disparado desde historial con `generarPDFFactura(venta)`, fue revalidado despues del fix:

| Etiqueta | PDF inmediato | PDF historico |
| --- | --- | --- |
| `Subtotal bruto` | Si | Si, `$5212.20` |
| `Descuento global` | Si | Si, `$1000.00` |
| `Total neto` | Si | Si, `$4212.20` |
| Total final neto | Si | Si, `TOTAL $4212.20` |

La revalidacion TG-008-R confirmo que el PDF historico ya consume `fact_descuento_global` desde `CabeceraCompletaPDF`.

### Conclusion TG-008

TG-008 queda aprobado completo. El PDF inmediato y el PDF historico muestran el desglose y usan el total neto.

## Rollback operativo

TG-001 no requiere rollback.
TG-002, TG-003, TG-004, TG-006 y TG-008 crearon operaciones reales en la base. TG-005, TG-007, TG-008-D y TG-008-D-R no crearon datos invalidos; la evidencia recibida y MCP Postgres confirman no-persistencia o validaciones solo lectura.

Opciones aprobables:

- Restaurar snapshot de la sucursal 1 en `factcab1`, `psucursal1`, `recibos1`, `caja_movi`, `fact_descuento_global` y `artsucursal`.
- O emitir nota de credito por el proceso de negocio aprobado por contabilidad.

## Cierre de suite

Todos los TG definidos fueron ejecutados.

Estado final:

- TG-001 a TG-007: PASS.
- TG-008: PASS para PDF inmediato e historico.
- TG-008-D: PASS para detalle expandido, resumen de pagos y PDF de recibo historico.
- TG-008-D-R: PASS para regresion legacy sin descuento.
- TG-008-D-M: PASS para multipago y NC historicos con descuento.

## Fix Posterior - PDF Historico Con Descuento

Fecha: 26/04/2026
Estado: IMPLEMENTADO Y REVALIDADO.

Cambios aplicados:

- `src/Carga.php.txt`: `CabeceraCompletaPDF_post()` ahora devuelve `id_num` y, si existe, el objeto `descuento_global` asociado desde `fact_descuento_global`.
- `src/app/services/historial-pdf.service.ts`: el PDF historico normaliza `descuento_global`, usa `total_neto` como total del PDF y agrega una tabla con `Subtotal bruto`, `Descuento global` y `Total neto`.
- El total historico ahora se formatea con dos decimales.

Validacion tecnica local:

- TypeScript `tsc -p tsconfig.app.json --noEmit`: PASS.
- Angular `ng build --configuration development`: PASS, con warnings CommonJS existentes.

Revalidacion TG-008-R:

- `CabeceraCompletaPDF` devolvio `descuento_global` para `FC 12345`, `id_num = 177`.
- PDF historico generado como `Casa Central_FACTURA_2026-04-26.pdf`.
- PDF historico contiene `Subtotal bruto $5212.20`, `Descuento global $1000.00`, `Total neto $4212.20`.
- Total final confirmado: `TOTAL $4212.20`.
- Resultado global TG-008-R: 3/3 PASS.

## Fix Posterior - Detalle Expandido Y Recibo Historico Con Descuento

Fecha: 26/04/2026
Estado: IMPLEMENTADO Y REVALIDADO.

Cambios aplicados:

- `src/Descarga.php.txt`: `/Descarga/obtenerDatosExpandidos` ahora adjunta `descuento_global` desde `fact_descuento_global` al payload expandido.
- `src/app/interfaces/recibo-expanded.ts`: se agrego `DescuentoGlobalHistorico` y campos opcionales `descuento_global`.
- `src/app/components/historialventas2/historialventas2.component.ts`: se agregaron helpers de normalizacion y el PDF de recibo historico recibe el contexto bruto/descuento/neto.
- `src/app/components/historialventas2/historialventas2.component.html`: el detalle expandido y el resumen de pagos muestran `Subtotal bruto`, `Descuento global` y `Total neto` cuando existe sidecar.

Validacion tecnica local:

- TypeScript `tsc -p tsconfig.app.json --noEmit`: PASS.
- Angular `ng build --configuration development`: PASS, con warnings CommonJS existentes.
- `php -l src\Descarga.php.txt`: no ejecutado porque `php` no esta disponible en PATH.

Revalidacion TG-008-D:

- Venta base: `FC 12345`, `id_num = 177`, cliente SARATE GERARDO FABIAN.
- Test 001: login/navegacion/historial/carga de venta objetivo PASS, 11/11 pasos.
- Test 002: detalle expandido PASS, 8/8 pasos.
- Test 003: resumen de pagos y PDF de recibo PASS, 15/15 pasos.
- Resultado global TG-008-D: 34/34 pasos PASS.

Revalidacion TG-008-D-R:

- Venta base: `FC 9999`, `numero_fac = 9999`, importe `$3,518.34`.
- Test 001: expandir venta legacy sin descuento PASS, 10/10 pasos.
- El detalle expandido mantuvo el label `Importe Total:` con valor `$3,518.34`.
- No aparecio `Descuento global`.
- No aparecieron bloques `Subtotal bruto`, `Descuento global`, `Total neto`.
- No aparecieron secciones vacias ni campos nulos asociados al descuento global.
- Resultado global TG-008-D-R: 10/10 pasos PASS.

Revalidacion TG-008-D-M:

- Test 001 multipago: PASS.
- Venta base: `FC 10000`, cliente CONSUMIDOR FINAL (`idcli=14242`), `id_num = 175`.
- Valores confirmados en UI: subtotal bruto `$11,559.47`, descuento global `$750.00`, total neto `$10,809.47`.
- Productos mantuvieron subtotales brutos: `$5,212.20` y `$6,347.27`.
- Recibo `254` mostro importe neto `$10,809.47`.
- Test 002 NC: PASS tras re-ejecucion con cliente correcto.
- Venta base: `NC 1`, cliente SARATE GERARDO FABIAN (`idcli=564949`), `id_num = 176`.
- Valores confirmados en UI: subtotal bruto `$1,972.53`, descuento global `$300.00`, total neto `$1,672.53`.
- El header del card mostro `Total neto: $1,672.53`.
- Producto `7644` mantuvo subtotal bruto `$1,972.53`.
- Recibo `255` mostro importe neto `$1,672.53`.
- Saldo restante confirmado: `$0.00`.
- Resultado global TG-008-D-M: 2/2 tests PASS.

Verificacion directa posterior:

- MCP Postgres confirmo que `NC 1`, `id_num = 176`, existe en `factcab1`.
- La NC pertenece al cliente `564949` (`SARATE GERARDO FABIAN`), no a CONSUMIDOR FINAL (`14242`).
- `fact_descuento_global` para `id_num = 176`: subtotal bruto `$1,972.53`, descuento `$300.00`, total neto `$1,672.53`.
- API `GET /Descarga/obtenerDatosExpandidos?sucursal=1&id_factura=176` devuelve `data.descuento_global` correcto para la NC.
- API `historialventas2xcli` con `idcli=564949` y fecha `2026-04-26` devuelve la fila `NC 1`.
- API `historialventas2xcli` con `idcli=14242` devuelve solo las FC `173`, `174`, `175`, por lo que el bloqueo observado en UI es consistente con el cliente seleccionado.

Intento posterior no valido:

- Se recibio una re-ejecucion de TG-008-D-M / Test 002 con cliente `CONSUMIDOR FINAL` (`idcli = 14242`).
- Ese intento no confirma bug del endpoint de listado, porque `NC 1` / `id_num = 176` pertenece a `SARATE GERARDO FABIAN` (`idcli = 564949`).
- Verificacion directa:
  - `historialventas2xcli?sucursal=1&idcli=564949&fecha_desde=2026-04-26&fecha_hasta=2026-04-26` devuelve `FC 12345` y `NC 1`.
  - `historialventas2xcli?sucursal=1&idcli=14242&fecha_desde=2026-04-26&fecha_hasta=2026-04-26` devuelve solo las FC `173`, `174`, `175`.
- Por lo tanto, no se clasifico como defecto de presentacion/backend. La re-ejecucion posterior con `SARATE GERARDO FABIAN` aprobo el Test 002.

Valores confirmados:

| Superficie | Subtotal bruto | Descuento global | Total neto | Estado |
| --- | ---: | ---: | ---: | --- |
| Detalle expandido | `$5,212.20` | `$1,000.00` | `$4,212.20` | PASS |
| Resumen bajo pagos | `$5,212.20` | `$1,000.00` | `$4,212.20` | PASS |
| PDF recibo historico | `$5212.20` | `$1000.00` | `$4212.20` | PASS |
| Total final recibo | - | - | `TOTAL $4212.20` | PASS |

Observaciones no bloqueantes:

- El recibo `256` mostro fecha `25/04/2026` en el PDF, mientras la factura fue emitida el `26/04/2026`; se registro como consistente con la fecha propia del recibo y no como fallo del descuento global.
- En la tarjeta final del historial se observo inicialmente `Total Cobrado Neto: 0,00 $` y saldo pendiente completo aun cuando existia recibo por el total. Este hallazgo fue reparado posteriormente usando los pagos visibles del detalle expandido como fuente del resumen final.

## Fix Posterior - Resumen Final De Pagos En Historial Expandido

Fecha: 26/04/2026
Estado: IMPLEMENTADO, PENDIENTE DE REVALIDACION UI.

Problema:

- La tabla `Pagos Realizados` mostraba recibos directos/automaticos correctamente.
- La tarjeta final usaba `expandedData.totalPagado`, valor calculado desde `historialPagos`.
- Para recibos directos/automaticos, `historialPagos` puede venir vacio aunque `recibos` contenga el pago visible.
- Resultado visual incorrecto: `Total Cobrado Neto: 0,00 $` y `Saldo Pendiente` igual al total de la venta.

Cambios aplicados:

- `src/app/components/historialventas2/historialventas2.component.ts`:
  - Agregado `calcularTotalCobradoNeto(expandedData)`, que suma los importes de `getPagosRealizados(expandedData)`.
  - Agregado `calcularSaldoPendienteResumen(venta, expandedData)`, que resta el total cobrado visible al importe neto de la venta y normaliza diferencias menores a `$0.01`.
- `src/app/components/historialventas2/historialventas2.component.html`:
  - `Total Cobrado Neto` ahora usa `calcularTotalCobradoNeto(expandedData)`.
  - `Saldo Pendiente` ahora usa `calcularSaldoPendienteResumen(venta, expandedData)`.

Validacion tecnica local:

- TypeScript `tsc -p tsconfig.app.json --noEmit`: PASS.
- Angular `ng build --configuration development`: PASS, con warnings CommonJS existentes.

Revalidacion sugerida:

- Expandir `FC 12345`, cliente SARATE GERARDO FABIAN: `Total Cobrado Neto` debe mostrar `$4,212.20` y `Saldo Pendiente` `$0.00`.
- Expandir `FC 9999`, cliente CONSUMIDOR FINAL: `Total Cobrado Neto` debe mostrar `$3,518.34` y `Saldo Pendiente` `$0.00`.
- Expandir `FC 10000`, cliente CONSUMIDOR FINAL: `Total Cobrado Neto` debe mostrar `$10,809.47` y `Saldo Pendiente` `$0.00`.
- Expandir `NC 1`, cliente SARATE GERARDO FABIAN: `Total Cobrado Neto` debe mostrar `$1,672.53` y `Saldo Pendiente` `$0.00`.
