# Plan: Descuento Global En Detalle Expandido Y Recibos Historicos

## Objetivo

Extender la cobertura visual del descuento global para que las pantallas de detalle expandido del historial y los modales/PDF de recibo muestren el mismo desglose que el carrito, la venta inmediata y la reimpresion historica:

- Subtotal bruto
- Descuento global
- Total neto

La regla funcional es que el descuento global pertenece a la venta/cabecera, no al recibo. Por lo tanto, debe mostrarse como contexto de la operacion original y no debe mezclarse con `recibos1.bonifica`, `bonifica_tipo`, `interes` ni `interes_tipo`.

## Estado Actual Verificado

### Ya cubierto

- El carrito calcula y muestra bruto/descuento/neto.
- El backend persiste el sidecar en `fact_descuento_global`.
- `factcabX`, `recibosX` y `caja_moviX` operan con el total neto.
- El PDF inmediato ya muestra el desglose.
- El PDF historico/reimpresion ya fue corregido y revalidado por TG-008-R.

### Brecha pendiente

En `historialventas2`, el detalle expandido y los recibos historicos siguen mostrando importes netos legacy sin explicitar el origen bruto/descuento/neto.

Puntos de codigo observados:

- `src/app/components/historialventas2/historialventas2.component.html`
  - El bloque de factura original muestra `facturaOriginal.importe` como `Importe Total`.
  - La tabla de productos muestra subtotales brutos por item.
  - El resumen de pagos muestra `venta.importe`, `expandedData.totalPagado` y saldo, pero no muestra el descuento global.
- `src/app/components/historialventas2/historialventas2.component.ts`
  - `generarReciboPago(pago, venta)` arma `datosRecibo` con `importeOriginal: venta.importe`.
  - `generarPDFReciboPago(datos)` imprime `Importe Original`, `Importe Pagado`, `Saldo Pendiente` y total efectivo, pero no recibe ni muestra `descuento_global`.
- `src/app/services/historial-ventas2-paginados.service.ts`
  - `obtenerDatosExpandidos(idFactura, sucursalFactura)` es la entrada natural para transportar el sidecar al detalle expandido.

## Alcance Del Cambio

### 1. Detalle expandido de factura

Cuando una venta tenga `fact_descuento_global.descuento_monto > 0`, el detalle expandido debe mostrar un bloque financiero debajo de los datos principales de la factura original y antes de la tabla de productos:

| Label | Valor |
|---|---:|
| Subtotal bruto | `fact_descuento_global.subtotal_bruto` |
| Descuento global | `fact_descuento_global.descuento_monto` |
| Total neto | `fact_descuento_global.total_neto` |

El label actual `Importe Total` debe seguir mostrando el importe neto de la venta. Para evitar ambiguedad, se recomienda renombrarlo visualmente a `Total neto` cuando exista descuento global.

### 2. Tabla de productos del detalle expandido

La tabla de productos debe mantenerse como esta:

- `Precio Unitario`: precio bruto del item.
- `Subtotal`: `cantidad * precio`, bruto del item.

No se debe prorratear visualmente el descuento dentro de cada fila de producto en esta etapa. El descuento global se muestra en el bloque financiero de cabecera.

### 3. Resumen de pagos del detalle expandido

En el bloque final de pagos realizados:

- `Importe Original` debe representar el total neto de la venta.
- Si existe descuento global, agregar contexto visible:
  - `Subtotal bruto`
  - `Descuento global`
  - `Total neto`

No reemplazar ni reinterpretar:

- `Total Bonificacion`
- `Total Interes`
- `Total Cobrado Neto`
- `Saldo Pendiente`

Esos campos pertenecen al flujo de recibos/pagos y deben mantenerse separados del descuento global de carrito.

### 4. Modal/PDF de recibo historico

Al generar un recibo desde el historial:

- `Importe Original` debe seguir siendo el total neto de la venta.
- Si la venta original tuvo descuento global, el recibo debe incluir una seccion de contexto:

| Label | Valor |
|---|---:|
| Subtotal bruto de venta | `descuento_global.subtotal_bruto` |
| Descuento global aplicado | `descuento_global.descuento_monto` |
| Total neto de venta | `descuento_global.total_neto` |

El recibo debe conservar sus importes propios:

- `Importe Pagado`
- `Saldo Pendiente`
- `Bonificacion`
- `Interes`
- `TOTAL` del recibo

Regla importante: el descuento global no se suma ni se resta nuevamente en el recibo. Solo se informa como contexto de la venta original.

## Contrato De Datos Propuesto

Agregar el sidecar al objeto expandido devuelto por `obtenerDatosExpandidos` o al objeto de factura original dentro de `expandedData.recibos`.

Forma recomendada:

```ts
export interface DescuentoGlobalHistorico {
  cod_sucursal: number | string;
  cabecera_id_num: number | string;
  tipo_comprobante: string;
  numero_int: number | string;
  numero_fac?: number | string;
  subtotal_bruto: number | string;
  descuento_monto: number | string;
  total_neto: number | string;
  origen?: string;
  usuario?: string;
}
```

Ubicacion preferida en respuesta:

```ts
{
  recibos: [
    {
      c_tipo: "FC",
      c_numero: 12345,
      importe: 4212.20,
      descuento_global: {
        subtotal_bruto: 5212.20,
        descuento_monto: 1000.00,
        total_neto: 4212.20
      }
    }
  ],
  totalPagado: 4212.20
}
```

Alternativa aceptable:

```ts
{
  descuento_global: {
    subtotal_bruto: 5212.20,
    descuento_monto: 1000.00,
    total_neto: 4212.20
  },
  recibos: []
}
```

La implementacion Angular debe soportar ambas formas para ser tolerante a cambios menores del backend.

## Backend

### Paso 1: Localizar endpoint real de detalle expandido

Revisar el metodo backend que responde a:

```text
GET/POST /Descarga/obtenerDatosExpandidos
```

El frontend lo consume desde:

```text
src/app/services/historial-ventas2-paginados.service.ts
```

### Paso 2: Adjuntar `fact_descuento_global`

Para la cabecera original de la factura/nota:

- Usar `cabecera_id_num` cuando este disponible.
- Filtrar por sucursal real de la venta.
- Filtrar por `tipo_comprobante` y `numero_int` como respaldo.

Consulta base:

```sql
select cod_sucursal,
       cabecera_id_num,
       tipo_comprobante,
       numero_int,
       numero_fac,
       subtotal_bruto,
       descuento_monto,
       total_neto,
       origen,
       usuario
from fact_descuento_global
where cod_sucursal = :sucursal
  and cabecera_id_num = :id_num
limit 1;
```

### Paso 3: Compatibilidad legacy

Si no existe fila en `fact_descuento_global`, devolver:

```json
"descuento_global": null
```

o directamente omitir el campo. Angular debe tratar ambos casos como venta sin descuento global.

## Frontend Angular

### Paso 1: Interfaces

Agregar una interfaz compartida para el sidecar historico, idealmente en:

```text
src/app/interfaces/recibo-expanded.ts
```

o en un archivo nuevo:

```text
src/app/interfaces/descuento-global-historico.ts
```

Extender `VentaExpandida` y/o el tipo de factura original para aceptar:

```ts
descuento_global?: DescuentoGlobalHistorico | null;
```

### Paso 2: Helpers en `historialventas2.component.ts`

Agregar helpers de lectura y normalizacion:

```ts
getDescuentoGlobalHistorico(expandedData: VentaExpandida, facturaOriginal?: any): DescuentoGlobalHistorico | null
tieneDescuentoGlobalHistorico(expandedData: VentaExpandida, facturaOriginal?: any): boolean
toMoneyNumber(value: unknown): number
```

Regla:

- Activo solo si `descuento_monto > 0`.
- `total_neto` debe tener prioridad para mostrar total de venta.
- Si falta `total_neto`, usar `facturaOriginal.importe` o `venta.importe` como fallback.

### Paso 3: HTML de detalle expandido

Insertar el bloque financiero dentro de la card `Factura Original`, despues de la fila de datos principales y antes de productos.

Comportamiento:

- Venta con descuento: mostrar bloque bruto/descuento/neto.
- Venta sin descuento: no mostrar bloque extra.
- No duplicar el descuento en filas de productos.

### Paso 4: Recibo historico

En `generarReciboPago(pago, venta)`:

- Obtener `expandedData` ya cargado.
- Obtener `facturaOriginal`.
- Resolver `descuento_global`.
- Pasarlo dentro de `datosRecibo`.

Ejemplo:

```ts
const descuentoGlobal = this.getDescuentoGlobalHistorico(ventaExpandida, facturaOriginal);

const datosRecibo = {
  ...
  importeOriginal: descuentoGlobal?.total_neto ?? venta.importe,
  descuentoGlobal
};
```

En `generarPDFReciboPago(datos)`:

- Si `datos.descuentoGlobal.descuento_monto > 0`, renderizar una tabla de contexto de venta.
- Mantener el `TOTAL` del recibo basado en el pago y ajustes propios del recibo.

## Criterios De Aceptacion

### CA-001: Venta con descuento en detalle expandido

Usar venta ya verificada:

- Sucursal: `1`
- Tipo: `FC`
- Numero: `12345`
- id_num: `177`
- Subtotal bruto: `$5212.20`
- Descuento global: `$1000.00`
- Total neto: `$4212.20`

Esperado:

- Al expandir la fila del historial, se ve `Subtotal bruto $5212.20`.
- Se ve `Descuento global $1000.00`.
- Se ve `Total neto $4212.20`.
- El importe principal de la factura no muestra `$5212.20` como total final.

### CA-002: Recibo historico de venta con descuento

Desde la misma venta:

- Generar PDF/recibo desde el boton de recibo.

Esperado:

- El recibo muestra el contexto bruto/descuento/neto de la venta.
- `Importe Original` queda en `$4212.20`.
- `Importe Pagado` queda segun el recibo.
- `TOTAL` del recibo no vuelve a descontar `$1000.00`.

### CA-003: Venta sin descuento

Usar una venta legacy sin sidecar, por ejemplo TG-002:

- Tipo: `FC`
- Numero: `9999`
- id_num: `173`

Esperado:

- No se muestra bloque bruto/descuento/neto.
- La pantalla conserva el comportamiento anterior.
- El recibo no agrega secciones vacias.

### CA-004: Multipago con descuento

Usar TG-004:

- Tipo: `FC`
- Numero: `10000`
- id_num: `175`
- Subtotal bruto: `$11559.47`
- Descuento global: `$750.00`
- Total neto: `$10809.47`

Esperado:

- El detalle expandido muestra el desglose de cabecera.
- Los pagos/caja se siguen mostrando por importes netos.
- No se prorratea visualmente el descuento en cada recibo salvo que se decida en una etapa futura.

### CA-005: Nota de credito con descuento

Usar TG-006:

- Tipo: `NC`
- Numero: `1`
- id_num: `176`
- Subtotal bruto: `$1972.53`
- Descuento global: `$300.00`
- Total neto: `$1672.53`

Esperado:

- El detalle expandido muestra bruto/descuento/neto.
- El signo negativo de caja no afecta la visualizacion del total neto de la cabecera.

## Orden De Implementacion

1. Confirmar estructura exacta de `obtenerDatosExpandidos` en backend y frontend.
2. Adjuntar `fact_descuento_global` al payload expandido.
3. Extender interfaces Angular.
4. Agregar helpers de normalizacion en `historialventas2.component.ts`.
5. Agregar bloque visual en detalle expandido.
6. Pasar `descuentoGlobal` a `generarReciboPago`.
7. Renderizar el contexto bruto/descuento/neto en `generarPDFReciboPago`.
8. Ejecutar TypeScript build.
9. Ejecutar pruebas manuales CA-001 a CA-005.
10. Actualizar informe de pruebas con un TG anexo, sugerido: `TG-008-D`.

## Prueba Sugerida: TG-008-D

Nombre:

```text
TG-008-D: Detalle Expandido Y Recibos Historicos Con Descuento Global
```

Validaciones minimas:

1. Expandir FC 12345 y confirmar bruto/descuento/neto.
2. Generar recibo de FC 12345 y confirmar bruto/descuento/neto en el PDF/modal.
3. Expandir FC 9999 sin descuento y confirmar que no aparece bloque extra.
4. Expandir FC 10000 multipago y confirmar que el desglose se muestra a nivel cabecera.
5. Expandir NC 1 y confirmar que el total neto se informa positivo como magnitud documental, aunque caja haya sido negativa.

## Riesgos Y Controles

- Riesgo: duplicar el descuento en recibos.
  - Control: el descuento global se muestra solo como contexto, no participa del calculo del recibo.
- Riesgo: confundir `bonifica` legacy con descuento global.
  - Control: mantener secciones separadas y labels distintos.
- Riesgo: hacer consultas extra por cada fila expandida.
  - Control: adjuntar sidecar en el endpoint expandido, no llamar a `CabeceraCompletaPDF` desde la UI por cada recibo.
- Riesgo: ventas sin sidecar rompen el detalle.
  - Control: todos los helpers deben aceptar `null`, `undefined` y strings numericos.

## Fuera De Alcance De Esta Etapa

- Agregar columnas bruto/descuento/neto a la grilla principal del historial.
- Prorratear descuento global por producto en el detalle expandido.
- Prorratear descuento global por recibo parcial.
- Modificar `recibos1.bonifica` para representar descuento global.
- Cambiar calculos contables ya validados en TG-002 a TG-008-R.

## Resultado Esperado

Al finalizar este plan, toda superficie historica relevante queda alineada:

- Carrito: bruto/descuento/neto.
- PDF inmediato: bruto/descuento/neto.
- PDF historico/reimpresion: bruto/descuento/neto.
- Detalle expandido: bruto/descuento/neto.
- Recibos historicos: contexto bruto/descuento/neto sin alterar calculos propios del recibo.
