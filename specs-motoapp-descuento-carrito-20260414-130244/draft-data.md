# Draft Data - Descuento en carrito MotoApp

## Analisis del modelo actual
- `factcab1..5` ya tienen `bonifica`, `bonifica_tipo`, `interes`, `interes_tipo`.
- `recibos1..5` tambien tienen esos campos.
- `psucursal1..5` no tienen descuento por item, solo precio/cantidad/cod_tar y campos operativos.
- `artsucursal.descuento` existe y corresponde al articulo, no al carrito.
- `caja_movi` registra importes finales, no metadatos comerciales del descuento.

## Reutilizacion recomendada
- Reutilizar `bonifica` y `bonifica_tipo` como descuento global de la operacion.
- Mantener `interes`/`interes_tipo` sin cambio.
- Persistir los importes finales ya netos en cabecera, recibos y caja.

## Columnas nuevas
- No agregar columnas a `psucursalX` en fase 1.
- No agregar columnas a `caja_movi` en fase 1.
- Solo considerar extension de `psucursalX` si mas adelante se exige prorrateo auditable por item.

## Impacto en historial y caja
- Historial no puede seguir usando solo suma de items si el descuento vive en cabecera.
- Caja debe reflejar montos netos luego del descuento, prorrateados por medio de pago si corresponde.

## Plan de migracion
- Recomendacion principal: **no migracion estructural**.
- Cambiar logica de escritura y lectura, no el esquema.
- Reservar una migracion futura solo si negocio exige descuento por item.

## Riesgos de auditoria y consistencia
- Doble interpretacion entre descuento global y descuento de articulo.
- Divergencia historial/PDF si se recalcula desde items.
- Divergencia caja/comprobante si no se usan importes netos.
- Ambiguedad si `bonifica_tipo` no se usa siempre junto a `bonifica`.

## Recomendacion final
- Fuente de verdad: `factcabX.bonifica` + `bonifica_tipo`.
- Replica auditable: `recibosX.bonifica` + `bonifica_tipo`.
- `psucursalX` sin cambios en fase 1.
- Reglas de lectura historica basadas en cabecera y no solo en productos.
