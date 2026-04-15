# Informe y plan - campo de descuento en `/componentes/carrito`

Fecha: 2026-04-13

## Objetivo

Analizar de forma completa la factibilidad de agregar un campo de descuento en el carrito, verificar impacto en frontend, backend y base PostgreSQL, y proponer un plan de implementación que contemple tambien comprobantes e historiales.

## Conclusion ejecutiva

Si, **es viable** agregar descuento en el carrito, pero hoy el flujo **no esta preparado de punta a punta** para soportarlo de forma consistente sin cambios adicionales.

La conclusion principal es esta:

1. **La base ya tiene soporte parcial para descuento a nivel cabecera** mediante `bonifica` y `bonifica_tipo` en `factcab1..5` y `recibos1..5`.
2. **El carrito hoy no usa ese soporte**: al generar la cabecera envia `bonifica: 0` e `interes: 0` de forma fija en `src/app/components/carrito/carrito.component.ts:1332`.
3. **El detalle de items (`psucursal1..5`) no guarda descuento**; solo persiste `cantidad`, `precio`, `cod_tar`, etc. Esto impide trazabilidad fina del descuento por item o del descuento global repartido.
4. **Los comprobantes PDF del carrito y del historial tampoco muestran descuento para ventas**; hoy solo muestran total y, en recibos, bonificacion/interes en flujos especificos.
5. Existe un **descuento de articulo** en `artsucursal.descuento`, pero el item que se agrega al carrito no lo persiste explicitamente desde `src/app/components/calculoproducto/calculoproducto.component.ts:168`, por lo que hay una inconsistencia latente cuando se recalcula precio por cambio de tipo de pago en `src/app/components/carrito/carrito.component.ts:2382`.

Mi recomendacion es implementar esto en **dos niveles**:

- **Nivel minimo viable**: usar `bonifica/bonifica_tipo` como descuento global del carrito y adaptar calculos + PDFs + historiales.
- **Nivel robusto recomendado**: ademas guardar snapshot del descuento en `psucursal1..5` para auditoria, reimpresion consistente y analitica futura.

## Alcance revisado

Se reviso:

- Frontend de carrito y generacion de comprobantes.
- Flujo de alta de items al carrito.
- Backend PHP/CodeIgniter que persiste pedido, cabecera, recibo y caja.
- Estructura real de PostgreSQL via MCP.

## Evidencia de codigo

### 1. El carrito totaliza solo por `precio * cantidad`

En `src/app/components/carrito/carrito.component.ts:602` el total general `suma` se calcula sumando `precio * cantidad` por item. No hay ningun descuento global aplicado encima del subtotal.

Tambien los subtotales por tipo de pago se calculan del mismo modo en `src/app/components/carrito/carrito.component.ts:700` y `src/app/components/carrito/carrito.component.ts:789`.

### 2. La cabecera tiene soporte para descuento, pero carrito no lo usa

Al construir la cabecera, el carrito envia:

- `bonifica: 0`
- `bonifica_tipo: 'P'`
- `interes: 0`
- `interes_tipo: 'P'`

Esto esta en `src/app/components/carrito/carrito.component.ts:1315` y especificamente en `src/app/components/carrito/carrito.component.ts:1332`.

Es decir: **la estructura funcional existe, pero esta desaprovechada**.

### 3. El detalle persistido del pedido no contempla descuento

Al armar el array `result` que se guarda en `psucursalX`, el carrito persiste campos como `precio`, `cantidad`, `cod_tar`, `tipodoc`, `puntoventa`, `numerocomprobante`, etc., pero **no guarda descuento**. Esto ocurre en `src/app/components/carrito/carrito.component.ts:1161`.

### 4. Los PDFs del carrito no muestran descuento

El PDF emitido desde carrito arma:

- tabla de items
- opcionalmente desglose por metodo de pago
- total final

pero **no muestra subtotal, descuento, neto ni tipo de descuento**. Ver `src/app/components/carrito/carrito.component.ts:1678` y `src/app/components/carrito/carrito.component.ts:1893`.

### 5. El historial PDF recompone el total desde items y no desde cabecera neta

En `src/app/services/historial-pdf.service.ts:330` el total del PDF historico se vuelve a calcular como suma de `cantidad * precio` de productos. Si se implementa un descuento global solo en cabecera, el PDF historico de ventas quedaria inconsistente salvo que se ajuste esta logica.

### 6. El backend inserta cabecera, detalle, recibo y caja, pero no agrega logica de descuento

El endpoint `PedidossucxappCompleto_post` inserta:

- cabecera en `factcabX`
- items en `psucursalX`
- recibo automatico en `recibosX`
- movimientos en `caja_movi`

Esto se ve en `src/Descarga.php.txt:920`.

El recibo automatico copia `bonifica` e `interes` desde cabecera si existen (`src/Descarga.php.txt:1263`), lo cual es una muy buena base para reutilizar.

### 7. Ya existe un flujo parecido en cobros de cabeceras

El componente de cobros/cabeceras ya trabaja con `bonificacion`, `bonificacionType`, `interes` e `interesType`, y calcula importes ajustados para `caja_movi` en `src/app/components/cabeceras/cabeceras.component.ts:1374`.

Esto sugiere que para carrito conviene **alinearse con ese modelo** en vez de inventar otro.

### 8. Existe descuento por articulo, pero no viaja limpio al carrito

La base `artsucursal` tiene columna `descuento`, y la UI de articulos la usa en alta/edicion. Ademas, cuando cambia el tipo de pago dentro del carrito se intenta aplicar `item.descuento` en `src/app/components/carrito/carrito.component.ts:2382`.

Pero el alta del item al carrito desde `src/app/components/calculoproducto/calculoproducto.component.ts:141` agrega varios metadatos (`precon`, `prefi1..4`, `tipo_moneda`, etc.) y **no persiste explicitamente `descuento`**.

Esto deja un bug funcional potencial: el recalculo por cambio de tipo de pago puede no respetar el descuento propio del articulo.

## Verificacion en PostgreSQL (MCP)

### Tablas relevantes detectadas

Se verifico la existencia real de:

- `artsucursal`
- `caja_movi`
- `factcab1..5`
- `psucursal1..5`
- `tarjcredito`
- `recibos1..5`

### Columnas relevantes encontradas

#### `artsucursal`

Existe soporte de articulo para:

- `precon`, `prefi1`, `prefi2`, `prefi3`, `prefi4`
- `prebsiva`
- `margen`
- `descuento`
- `tipo_moneda`

#### `factcab1..5`

Existe soporte de cabecera para:

- `basico`
- `iva1`, `iva2`, `iva3`
- `bonifica`
- `bonifica_tipo`
- `interes`
- `interes_tipo`
- `saldo`

#### `psucursal1..5`

Solo existen campos de detalle basicos, entre ellos:

- `cantidad`
- `precio`
- `tipoprecio`
- `cod_tar`

**No existen columnas de descuento** en las tablas `psucursalX`.

#### `recibos1..5`

Existe soporte para:

- `importe`
- `recibo_saldo`
- `bonifica`
- `bonifica_tipo`
- `interes`
- `interes_tipo`

### Evidencia de uso real en datos

La base no solo tiene esas columnas: tambien **ya se usan**.

Conteo observado:

- `factcab1`: 120 registros, 20 con `bonifica`, 2 con `interes`
- `factcab5`: 73 registros, 9 con `bonifica`, 30 con `interes`
- `recibos1`: 124 registros, 23 con `bonifica`, 2 con `interes`
- `recibos5`: 73 registros, 9 con `bonifica`, 30 con `interes`

Esto confirma que `bonifica/bonifica_tipo` **ya forman parte del modelo operativo** y son la mejor base para un descuento global del carrito.

## Diagnostico funcional

## Estado actual real del flujo

1. Se agrega un item al carrito con precio segun lista/metodo de pago.
2. El carrito suma `precio * cantidad`.
3. Al finalizar:
   - descuenta stock
   - inserta `factcabX`
   - inserta `psucursalX`
   - genera `recibosX`
   - inserta `caja_movi`
4. El PDF del carrito usa la misma suma del frontend.
5. El PDF historico recompone desde `psucursalX`.

## Lo que faltaria para soportar descuento correctamente

Para que el descuento exista “en todo el flujo incluyendo comprobantes”, hay que resolver **las 5 capas**:

1. **Captura UI**: campo de descuento en carrito.
2. **Calculo**: subtotal, descuento, total neto, IVA y saldo.
3. **Persistencia**: cabecera y eventualmente detalle.
4. **Comprobantes**: PDF emitido al vender y PDF historico.
5. **Analitica/historial**: listados, reimpresion, recibos y consistencia contable.

## Opciones de implementacion

## Opcion A - Minima (sin cambio de esquema en `psucursalX`)

### Idea

Agregar descuento global en carrito y guardarlo en:

- `factcabX.bonifica`
- `factcabX.bonifica_tipo`
- `recibosX.bonifica`
- `recibosX.bonifica_tipo`

Sin tocar `psucursalX`.

### Ventajas

- Aprovecha columnas ya existentes.
- Menor impacto en base.
- Menor tiempo de implementacion.
- Alinea carrito con el modelo ya usado en `cabeceras.component`.

### Desventajas

- El detalle de items no guarda el descuento.
- La reimpresion/historial debe mirar cabecera, no solo sumar items.
- No queda trazabilidad por item.
- Si en el futuro hay promociones mixtas (item + carrito), el modelo queda corto.

### Conclusion sobre opcion A

Sirve para un **MVP funcional**, pero no es la opcion ideal si quieren auditoria fina o reportes de margen/bonificacion por producto.

## Opcion B - Robusta recomendada

### Idea

Usar `bonifica/bonifica_tipo` en cabecera **y ademas** agregar snapshot de descuento en `psucursal1..5`.

### Columnas sugeridas en `psucursal1..5`

Minimo recomendado:

- `porc_descuento_item numeric`
- `importe_descuento_item numeric`
- `porc_descuento_carrito numeric`
- `importe_descuento_carrito numeric`
- `precio_original numeric`
- `precio_final numeric`

Alternativa reducida:

- `descuento_pct numeric`
- `descuento_importe numeric`
- `precio_original numeric`

### Ventajas

- Traza exacta de como se llego al precio final.
- Los historiales y reimpresiones pueden ser exactos aunque cambie la logica futura.
- Permite distinguir descuento del articulo vs descuento del carrito.
- Facilita auditoria, reclamos y reportes.

### Desventajas

- Requiere migracion sobre `psucursal1..5`.
- Requiere tocar backend y queries de historico.

### Conclusion sobre opcion B

Es la **recomendacion principal** si el descuento va a quedar como funcionalidad estable del negocio.

## Recomendacion tecnica final

Implementar un modelo **hibrido**:

- **Cabecera**: usar `bonifica` + `bonifica_tipo` para el descuento global operativo/contable.
- **Detalle**: guardar snapshot del descuento en `psucursal1..5` para trazabilidad.

Con ese esquema:

- el total neto queda claro en cabecera;
- el comprobante puede mostrar subtotal/descuento/total;
- el historial puede reimprimir correctamente;
- y el detalle conserva evidencia de como se calculo cada item.

## Impacto puntual por capa

## 1. Frontend carrito

Cambios requeridos en `src/app/components/carrito/carrito.component.html` y `src/app/components/carrito/carrito.component.ts`:

- agregar campo `descuento`
- agregar selector de tipo: porcentaje / importe
- mostrar `subtotal bruto`
- mostrar `descuento aplicado`
- mostrar `total neto`
- recalcular `suma`, `saldo`, `basico`, `iva1`
- validar que el descuento no supere subtotal
- decidir comportamiento con items en `solo consulta`

### Recomendacion funcional

El descuento debe aplicarse sobre el **subtotal real de venta** y no sobre el total temporal de simulacion. Si hay items en `solo consulta`, seguir bloqueando finalizacion como hoy.

## 2. Construccion de cabecera

En `src/app/components/carrito/carrito.component.ts:1252` hay que reemplazar la construccion fija por una basada en:

- `subtotal_bruto`
- `bonifica`
- `bonifica_tipo`
- `total_neto`

Y recalcular:

- `basico`
- `iva1`
- `saldo`

### Regla sugerida

- si el descuento es porcentual, calcular importe de bonificacion en frontend
- persistir en cabecera tanto el valor ingresado como el tipo
- usar como base imponible el total neto

## 3. Persistencia de items

En `src/app/components/carrito/carrito.component.ts:1161` hay que ampliar el payload de `result` para incluir snapshot de descuento si se adopta la opcion robusta.

Tambien conviene incorporar explicitamente `descuento` al item cuando se agrega desde `src/app/components/calculoproducto/calculoproducto.component.ts:141`.

## 4. Backend `PedidossucxappCompleto_post`

En `src/Descarga.php.txt:920` el backend ya acepta `cabecera`, `pedidos` y `caja_movi`, por lo que:

- con opcion minima, probablemente no necesite cambio estructural para cabecera;
- con opcion robusta, hay que permitir los nuevos campos del detalle.

Adicionalmente conviene validar:

- que `bonifica` no sea negativa;
- que no supere el subtotal;
- que `bonifica_tipo` sea `P` o `I`.

## 5. Recibo automatico

En `src/Descarga.php.txt:1234` el recibo automatico ya copia `bonifica`/`interes` desde la cabecera.

Si el carrito empieza a cargar `bonifica`, el recibo deberia quedar alineado, **siempre que** el importe neto de cabecera (`basico + iva1`) ya venga descontado.

## 6. Caja y subtotales por metodo de pago

Hoy `caja_movi` se construye por subtotales de metodo de pago desde `src/app/components/carrito/carrito.component.ts:1963`.

Si hay descuento global, hay que definir una regla:

- **prorratear el descuento entre metodos de pago** segun su participacion en el total.

Si no se hace esto:

- el total del comprobante puede quedar neto,
- pero la suma de `caja_movi` quedaria bruta.

### Recomendacion

Aplicar prorrateo proporcional por subtotal de metodo, redondeando a 2 decimales y ajustando el remanente en el ultimo metodo.

## 7. PDF emitido desde carrito

En `src/app/components/carrito/carrito.component.ts:1678` hay que agregar al comprobante:

- Subtotal
- Descuento (`x%` o `$x`)
- Total neto

Si se quiere mayor claridad comercial, tambien conviene mostrar:

- `Total por items`
- `Bonificacion del carrito`
- `Total final`

## 8. PDF historico

En `src/app/services/historial-pdf.service.ts:330` no se debe seguir usando solo la suma de items como total final cuando exista descuento de carrito.

Hay que cambiar la fuente del total para que quede alineada con cabecera:

- total bruto desde items
- bonificacion desde cabecera
- total neto mostrado = bruto - bonificacion + interes

Si se adopta la opcion robusta, tambien puede reimprimirse usando directamente los snapshots del detalle.

## 9. Generador PDF reutilizable

`src/app/services/pdf-generator.service.ts:48` tambien deberia ampliarse para recibir:

- subtotal
- descuento
- descuento_tipo
- total_neto

Hoy solo maneja items, subtotales por pago y total final.

## 10. Historiales y listados

Como `HistorialVentas2` hoy ya lee `bonifica` e `interes` desde `factcabX` en `src/app/services/historial-ventas2-paginados.service.ts:555`, hay una buena base para exponer el descuento en pantallas de historial.

Faltaria:

- mostrarlo en la UI;
- usarlo al reimprimir;
- contemplarlo en exportaciones si existen.

## Riesgos identificados

1. **Inconsistencia entre total de cabecera y suma de items** si se usa solo `bonifica` sin ajustar historiales/PDFs.
2. **Descuadre de caja** si el descuento no se prorratea entre `caja_movi` por metodo.
3. **Falta de trazabilidad** si no se agrega snapshot al detalle `psucursalX`.
4. **Bug latente con descuento de articulo** porque el item del carrito no transporta explicitamente `descuento` desde alta.
5. **Redondeos** al repartir descuento entre multiples metodos de pago.

## Plan de implementacion recomendado

## Fase 0 - Correccion base antes de agregar descuento global

1. Asegurar que el item agregado al carrito incluya `descuento` de articulo.
2. Verificar que el recalculo por cambio de tipo de pago conserve ese descuento.

## Fase 1 - Descuento global del carrito (MVP)

1. Agregar UI en carrito:
   - valor descuento
   - tipo (`P` porcentaje / `I` importe)
2. Calcular:
   - subtotal bruto
   - importe descuento
   - total neto
3. Persistir en cabecera:
   - `bonifica`
   - `bonifica_tipo`
4. Recalcular `basico`, `iva1`, `saldo` sobre total neto.
5. Mostrar descuento en PDF del carrito.
6. Ajustar historial PDF para leer descuento desde cabecera.
7. Prorratear descuento a subtotales por metodo para `caja_movi`.

## Fase 2 - Robustez de persistencia

1. Agregar columnas de snapshot en `psucursal1..5`.
2. Persistir descuento por item / carrito en el detalle.
3. Ajustar endpoints que leen productos para historico.
4. Usar snapshots en reimpresion e informes.

## Fase 3 - QA funcional

Casos minimos a probar:

1. factura con un solo item y descuento porcentual
2. factura con descuento por importe fijo
3. venta con multiples items y multiples metodos de pago
4. presupuesto con descuento
5. nota de credito/debito con descuento
6. reimpresion desde historial
7. recibo automatico asociado
8. validacion de descuento mayor al subtotal
9. redondeo cuando el descuento prorrateado no da exacto

## Criterio de decision

## Si quieren salir rapido

Implementar **Fase 1** usando `bonifica/bonifica_tipo`.

## Si quieren que quede bien para siempre

Implementar **Fase 1 + Fase 2**.

Esa es la opcion que recomiendo.

## Respuesta concreta a la consulta

Agregar un campo de descuento en `/componentes/carrito` **si es posible**, pero para que modifique correctamente **todo el flujo incluyendo comprobantes** no alcanza con tocar la vista del carrito.

Hay que intervenir como minimo:

- `src/app/components/carrito/carrito.component.html`
- `src/app/components/carrito/carrito.component.ts`
- `src/app/components/calculoproducto/calculoproducto.component.ts`
- `src/app/services/historial-pdf.service.ts`
- `src/app/services/pdf-generator.service.ts`
- `src/Descarga.php.txt`

Y, si se busca una solucion robusta, tambien la estructura de `psucursal1..5` en PostgreSQL.

## Recomendacion final

**Avanzar con implementacion hibrida**:

- reutilizar `bonifica/bonifica_tipo` para cabecera y recibos;
- agregar snapshot de descuento al detalle `psucursalX`;
- actualizar PDFs e historiales para mostrar subtotal, descuento y total neto;
- corregir primero el transporte de `descuento` del articulo al carrito.

Con eso el descuento quedaria consistente en operacion, persistencia, caja, historial y comprobantes.
