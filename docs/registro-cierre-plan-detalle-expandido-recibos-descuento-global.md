# Registro De Cierre: Detalle Expandido Y Recibos Historicos Con Descuento Global

Fecha de cierre: 26/04/2026
Plan base: `docs/plan-detalle-expandido-recibos-descuento-global.md`
Estado: IMPLEMENTADO Y VALIDADO; fix complementario de resumen final pendiente de revalidacion visual
Modulo principal: `historialventas2`

## Objetivo Del Plan

El plan definia completar la cobertura historica del descuento global para que las superficies posteriores a la venta muestren el mismo desglose ya disponible en carrito, PDF inmediato y PDF historico:

- Subtotal bruto
- Descuento global
- Total neto

La regla funcional central se mantuvo: el descuento global pertenece a la venta/cabecera y no al recibo. Por eso se muestra como contexto informativo de la operacion original, sin mezclarse con `bonifica`, `interes`, `bonifica_tipo` ni `interes_tipo`.

## Alcance Implementado

### Backend

Archivo:

- `src/Descarga.php.txt`

Endpoint actualizado:

```text
GET /Descarga/obtenerDatosExpandidos?sucursal=:sucursal&id_factura=:id_num
```

Cambios aplicados:

- Se extendio la consulta inicial de cabecera para obtener `id_num`, `tipo`, `numero_int`, `numero_fac`, `puntoventa` y `cliente`.
- Se agrego lectura de `fact_descuento_global` usando:
  - `cod_sucursal`
  - `cabecera_id_num`
- La respuesta expandida ahora incluye:

```json
{
  "data": {
    "recibos": [],
    "historialPagos": [],
    "totalPagado": 0,
    "descuento_global": {
      "cod_sucursal": "1",
      "cabecera_id_num": "177",
      "tipo_comprobante": "FC",
      "numero_int": "12345",
      "subtotal_bruto": "5212.20",
      "descuento_monto": "1000.00",
      "total_neto": "4212.20"
    }
  }
}
```

- Tambien se agrega `descuento_global` a cada recibo cuando corresponde al documento original.
- Para ventas sin descuento, se devuelve `descuento_global = null`, manteniendo compatibilidad legacy.

Nota operativa: los cambios PHP fueron subidos manualmente al servidor real por operacion.

### Frontend Angular

Archivos:

- `src/app/interfaces/recibo-expanded.ts`
- `src/app/components/historialventas2/historialventas2.component.ts`
- `src/app/components/historialventas2/historialventas2.component.html`

Cambios aplicados:

- Se agrego la interfaz `DescuentoGlobalHistorico`.
- `VentaExpandida` y `ReciboExpanded` aceptan `descuento_global?: DescuentoGlobalHistorico | null`.
- `loadExpandedData(...)` conserva `response.data.descuento_global`.
- Se agregaron helpers:
  - `toMoneyNumber(value)`
  - `getDescuentoGlobalHistorico(expandedData, facturaOriginal)`
  - `getSubtotalBrutoHistorico(expandedData, facturaOriginal)`
  - `getDescuentoMontoHistorico(expandedData, facturaOriginal)`
  - `getTotalNetoHistorico(expandedData, facturaOriginal)`
- El detalle expandido muestra un bloque financiero cuando existe descuento:
  - `Subtotal bruto`
  - `Descuento global`
  - `Total neto`
- La etiqueta principal cambia de `Importe Total` a `Total neto` cuando hay descuento global.
- La tabla de productos mantiene precio unitario y subtotal bruto por item.
- El resumen bajo pagos repite el contexto bruto/descuento/neto cuando corresponde.
- `generarReciboPago(...)` pasa `descuentoGlobal` al PDF de recibo.
- `generarPDFReciboPago(...)` renderiza:
  - `Resumen de venta con descuento global`
  - `Subtotal bruto de venta`
  - `Descuento global aplicado`
  - `Total neto de venta`

Regla preservada:

- El recibo no vuelve a descontar el importe global.
- `TOTAL` del recibo sigue basado en el importe del recibo y sus ajustes propios.

## Fix Complementario: Resumen Final De Pagos

Durante la validacion se detecto que la tarjeta final del historial expandido podia mostrar:

- `Total Cobrado Neto: 0,00 $`
- `Saldo Pendiente` igual al total de la venta

Esto ocurria aunque la tabla `Pagos Realizados` mostrara un recibo por el total.

Causa:

- La tarjeta final usaba `expandedData.totalPagado`, calculado desde `historialPagos`.
- Para recibos directos/automaticos, `historialPagos` puede venir vacio aunque `recibos` contenga el pago visible.

Correccion:

- Se agrego `calcularTotalCobradoNeto(expandedData)`, que suma los importes de `getPagosRealizados(expandedData)`.
- Se agrego `calcularSaldoPendienteResumen(venta, expandedData)`, que calcula saldo contra el total cobrado visible.
- El HTML ahora usa esos helpers en las tarjetas:
  - `Total Cobrado Neto`
  - `Saldo Pendiente`

Estado de este fix:

- Implementado.
- Build local aprobado.
- Pendiente solo de revalidacion visual final en navegador.

## Datos De Prueba Usados

| Caso | Cliente | Documento | id_num | Subtotal bruto | Descuento | Total neto | Estado |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| FC simple | SARATE GERARDO FABIAN | FC 12345 | 177 | 5212.20 | 1000.00 | 4212.20 | PASS |
| Legacy sin descuento | CONSUMIDOR FINAL | FC 9999 | 173 | 3518.34 | 0.00 | 3518.34 | PASS |
| Multipago | CONSUMIDOR FINAL | FC 10000 | 175 | 11559.47 | 750.00 | 10809.47 | PASS |
| Nota de credito | SARATE GERARDO FABIAN | NC 1 | 176 | 1972.53 | 300.00 | 1672.53 | PASS |

Nota importante sobre NC:

- `NC 1` / `id_num = 176` pertenece a `SARATE GERARDO FABIAN` (`idcli = 564949`).
- No pertenece a `CONSUMIDOR FINAL` (`idcli = 14242`).
- La busqueda con cliente incorrecto fue descartada como intento no valido, no como bug.

## Validaciones Tecnicas

Ejecutadas localmente:

```powershell
node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit
```

Resultado: PASS.

```powershell
node_modules\.bin\ng.cmd build --configuration development
```

Resultado: PASS, con warnings CommonJS existentes.

No ejecutado:

```powershell
php -l src\Descarga.php.txt
```

Motivo: `php` no esta disponible en PATH en esta maquina.

Kluster:

- Se intento localizar `kluster_code_review_auto` despues de cambios.
- La herramienta no esta expuesta en esta sesion.
- Queda pendiente ejecutar Kluster cuando este disponible.

## Validaciones De Backend/API

Endpoint expandido con descuento simple:

```text
GET /Descarga/obtenerDatosExpandidos?sucursal=1&id_factura=177
```

Resultado confirmado:

- `data.descuento_global.subtotal_bruto = "5212.20"`
- `data.descuento_global.descuento_monto = "1000.00"`
- `data.descuento_global.total_neto = "4212.20"`

Endpoint expandido con NC:

```text
GET /Descarga/obtenerDatosExpandidos?sucursal=1&id_factura=176
```

Resultado confirmado:

- `tipo_comprobante = "NC"`
- `numero_int = "1"`
- `subtotal_bruto = "1972.53"`
- `descuento_monto = "300.00"`
- `total_neto = "1672.53"`

Listado historico por cliente correcto:

```text
GET /Descarga/historialventas2xcli?sucursal=1&idcli=564949&fecha_desde=2026-04-26&fecha_hasta=2026-04-26
```

Resultado confirmado:

- Devuelve `FC 12345`
- Devuelve `NC 1`

Listado historico de CONSUMIDOR FINAL:

```text
GET /Descarga/historialventas2xcli?sucursal=1&idcli=14242&fecha_desde=2026-04-26&fecha_hasta=2026-04-26
```

Resultado confirmado:

- Devuelve `FC 9999`
- Devuelve `FC 9999`
- Devuelve `FC 10000`
- No devuelve `NC 1` porque la NC pertenece a otro cliente.

## Validaciones Manuales Ejecutadas

### TG-008-D: Detalle Expandido Y Recibo Historico Con Descuento

Venta base:

- Cliente: SARATE GERARDO FABIAN
- Documento: FC 12345
- id_num: 177

Resultado:

- Test 001 login/navegacion/carga: PASS, 11/11.
- Test 002 detalle expandido: PASS, 8/8.
- Test 003 resumen de pagos y PDF de recibo: PASS, 15/15.
- Resultado global: 34/34 pasos PASS.

Valores confirmados:

- Subtotal bruto: `$5,212.20`
- Descuento global: `$1,000.00`
- Total neto: `$4,212.20`
- PDF recibo historico contiene el resumen de venta con descuento global.
- `TOTAL` del recibo: `$4212.20`.

### TG-008-D-R: Regresion Legacy Sin Descuento

Venta base:

- Cliente: CONSUMIDOR FINAL
- Documento: FC 9999
- id_num: 173

Resultado:

- PASS, 10/10 pasos.
- Se conserva label `Importe Total:`.
- No aparece `Descuento global`.
- No aparecen bloques `Subtotal bruto`, `Descuento global`, `Total neto`.
- No aparecen secciones vacias ni campos nulos asociados al descuento.

### TG-008-D-M: Multipago Y NC Historicos Con Descuento

Multipago:

- Cliente: CONSUMIDOR FINAL
- Documento: FC 10000
- id_num: 175

Resultado:

- PASS.
- Subtotal bruto: `$11,559.47`
- Descuento global: `$750.00`
- Total neto: `$10,809.47`
- Productos mantienen subtotales brutos.
- Recibo 254 muestra importe neto.

Nota de credito:

- Cliente: SARATE GERARDO FABIAN
- Documento: NC 1
- id_num: 176

Resultado:

- PASS.
- Subtotal bruto: `$1,972.53`
- Descuento global: `$300.00`
- Total neto: `$1,672.53`
- Producto 7644 mantiene subtotal bruto.
- Recibo 255 muestra importe neto.
- Saldo restante: `$0.00`.

## Criterios De Aceptacion Del Plan

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| CA-001 FC con descuento en detalle expandido | PASS | TG-008-D Test 002 |
| CA-002 Recibo historico con descuento | PASS | TG-008-D Test 003 |
| CA-003 Venta sin descuento legacy | PASS | TG-008-D-R |
| CA-004 Multipago con descuento | PASS | TG-008-D-M Test 001 |
| CA-005 NC con descuento | PASS | TG-008-D-M Test 002 |

## Riesgos Controlados

### Doble descuento en recibos

Control aplicado:

- El descuento global se muestra solo como contexto.
- `TOTAL` del recibo sigue usando el importe del recibo.

Estado: controlado.

### Confusion con `bonifica`

Control aplicado:

- `Descuento global` se muestra en seccion separada.
- `bonifica` e `interes` mantienen su comportamiento propio.

Estado: controlado.

### Ventas sin sidecar

Control aplicado:

- `descuento_global` puede ser `null`.
- Los helpers solo activan UI de descuento si `descuento_monto > 0`.

Estado: controlado.

### Consulta extra por fila

Control aplicado:

- El sidecar viaja en `obtenerDatosExpandidos`.
- No se llama a `CabeceraCompletaPDF` desde la UI del detalle expandido.

Estado: controlado.

## Fuera De Alcance Conservado

No se implemento:

- Columnas bruto/descuento/neto en la grilla principal del historial.
- Prorrateo visual del descuento por producto.
- Prorrateo visual del descuento por recibo parcial.
- Uso de `recibos1.bonifica` para representar descuento global.
- Cambios contables sobre `factcab*`, `recibos*`, `caja_movi` o `psucursal*`.

## Estado Final

El plan `docs/plan-detalle-expandido-recibos-descuento-global.md` queda completado.

Superficies alineadas:

- Carrito: bruto/descuento/neto.
- PDF inmediato: bruto/descuento/neto.
- PDF historico/reimpresion: bruto/descuento/neto.
- Detalle expandido: bruto/descuento/neto.
- Resumen bajo pagos: bruto/descuento/neto.
- PDF de recibo historico: contexto bruto/descuento/neto sin doble descuento.
- Resumen final de pagos: cobrado y saldo calculados desde pagos visibles.

Estado de pruebas:

- TG-008-D: PASS.
- TG-008-D-R: PASS.
- TG-008-D-M: PASS.

Pendientes:

- Revalidar visualmente el fix complementario de `Total Cobrado Neto` / `Saldo Pendiente` en navegador.
- Ejecutar Kluster cuando la herramienta este disponible.
