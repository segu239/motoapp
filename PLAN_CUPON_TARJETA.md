# Plan de implementacion - Reemplazo de "Codigo de Autorizacion" por "Nro de Cupon"

**Fecha:** 2026-04-21
**Autor:** segu239 (LUIS)
**Alcance:** Flujo de **venta** (carrito) y flujo de **cobranza** (cabeceras / recibos sobre cuenta corriente).

---

## 1. Objetivo

Reemplazar la captura del **Codigo de Autorizacion** de tarjeta por la captura del **Nro de Cupon**, ingresado **al finalizar la operacion**.

### Decision tecnica para esta version del cambio

La columna de persistencia `nautotar` **se reutiliza**, pero para cumplir el nuevo requisito de cupón de **4 a 6 digitos** primero hay que **ampliar la base de datos**.

### Supuesto explicito de esta version

Este plan asume que el cupon:

- es **solo numerico**,
- debe tener **minimo 4 y maximo 6 digitos**,
- **no necesita preservar ceros a la izquierda** al guardarse.

Por esa razon la migracion propuesta es de `numeric(4,0)` a `numeric(6,0)`.

Si el negocio necesita conservar valores como `0123` o `001234` exactamente como fueron ingresados, entonces no alcanza con `numeric(6,0)` y debe abrirse una variante con `varchar(6)`.

### Reglas de negocio

- **Formato del cupon en esta version:** numerico entero de **4 a 6 digitos**.
- **Regex recomendada en frontend:** `^[1-9][0-9]{3,5}$`.
- **Unico por operacion** (una venta entera comparte el mismo cupon; un recibo de cobranza tiene un unico cupon).
- **Obligatorio** cuando el metodo de pago es una tarjeta de credito (`activadatos == 1`).
- **No aplica** a efectivo, transferencia, cheque ni cuenta corriente.
- **No se tocan** `stockenvio.component.ts` ni `pedir-stock.component.ts` (no son flujos de venta/cobranza de este alcance).

---

## 2. Evidencia del estado actual

### 2.1 Base de datos (verificado via MCP postgres)

La columna `nautotar` existe en 10 tablas: `psucursal1..5` y `psucutmp1..5`.

| Atributo | Valor actual |
|---|---|
| `data_type` | `numeric` |
| `is_nullable` | `YES` |
| `numeric_precision` | `4` |
| `numeric_scale` | `0` |

**Conclusion:** el esquema actual soporta hasta **4 digitos enteros**. Para permitir **4 a 6 digitos** es **obligatoria** una migracion a `numeric(6,0)` antes de habilitar la validacion nueva en frontend.

### 2.2 Frontend - captura actual

| Archivo | Lineas | Rol |
|---|---|---|
| `src/app/components/condicionventa/condicionventa.component.ts` | 53-58, 493, 1002-1239 | Modal al elegir tarjeta en **venta**. Metodo `abrirFormularioTarj()`. |
| `src/app/components/cabeceras/cabeceras.component.ts` | 47-52, 624-678, 808-1015 | Modal al elegir tarjeta en **cobranza** y persistencia en `generacionPagoPsucursal()`. |
| `src/app/components/calculoproducto/calculoproducto.component.ts` | 24-50, 218-225 | Hoy copia `this.tarjeta.Autorizacion -> pedido.nautotar` al crear cada item. |
| `src/app/components/carrito/carrito.component.ts` | 995-1240 | En `finalizar()` arma el payload final de venta y reenvia `nautotar` por item. |

### 2.3 Backend PHP

- `src/Carga.php.txt`: no referencia `nautotar` por nombre.
- `src/Descarga.php.txt:1142-1145`: inserta ventas usando el array de `pedidos` recibido.
- `src/Descarga.php.txt:1628-1630`: en cobranza inserta `pagoCC['psucursal']` directamente en `psucursal<sucursal>`.
- `src/Descarga.php.txt:5478`: selecciona `p.nautotar` para consultas historicas / expandida.

**Conclusion:** no hace falta tocar PHP para este cambio. El ajuste necesario es **DB + frontend**.

---

## 3. Precondicion obligatoria

Antes de implementar o desplegar frontend, ejecutar la migracion SQL que amplie `nautotar` a `numeric(6,0)` en:

- `psucursal1..5`
- `psucutmp1..5`

Archivo propuesto de migracion: `MIGRACION_NAUTOTAR_6_DIGITOS.sql`.

Orden recomendado:

1. Ejecutar migracion en base.
2. Verificar precision real en las 10 tablas.
3. Implementar cambios frontend.
4. Ejecutar pruebas manuales.

---

## 4. Cambios a realizar

### 4.1 Quitar el input "Codigo de Autorizacion" - Modal de datos de tarjeta

**Archivo:** `src/app/components/condicionventa/condicionventa.component.ts`

1. **Eliminar bloque HTML del input `autorizacion`** en `abrirFormularioTarj()`.
2. **Eliminar en `preConfirm`:**
   - lectura de `autorizacion`,
   - regex `^[0-9]{3}$`,
   - validacion del codigo de autorizacion,
   - retorno de `autorizacion`.
3. **Eliminar asignacion en el `.then`:** `this.tarjeta.Autorizacion = result.value.autorizacion;`.
4. **Mantener la propiedad `Autorizacion` en el objeto `tarjeta`** por compatibilidad temporal con otros componentes, pero **ya no poblarla en este modal**.

**Archivo:** `src/app/components/cabeceras/cabeceras.component.ts`

- Aplicar exactamente la misma eliminacion en el modal equivalente de `abrirFormularioTarj()`.

### 4.2 Ajustar el flujo de venta para que `nautotar` nazca solo al finalizar

**Archivos:**
- `src/app/components/calculoproducto/calculoproducto.component.ts`
- `src/app/components/carrito/carrito.component.ts`

#### Paso A - dejar de poblar `nautotar` al crear el item

En `calculoproducto.component.ts`, dentro de `generarPedido()`, eliminar esta asignacion:

```ts
if (this.tarjeta.Autorizacion != undefined) {
  this.pedido.nautotar = parseInt(this.tarjeta.Autorizacion);
}
```

**Nuevo criterio:** mientras el cupon se captura al final de la venta, `nautotar` debe quedar `null` / vacio en el estado del carrito y completarse recien en `carrito.finalizar()`.

#### Paso B - pedir el cupon al finalizar la venta

**Ubicacion:** `src/app/components/carrito/carrito.component.ts`, dentro de `finalizar()`, despues de las validaciones actuales y antes del armado del payload `result`.

1. **Detectar si hay items con tarjeta de credito:**
   - recorrer `this.itemsEnCarrito`,
   - buscar items cuyo `cod_tar` corresponda a una tarjeta con `activadatos == 1` en `this.tarjetas`,
   - si no hay tarjeta de credito, continuar el flujo actual sin pedir cupon.

2. **Agregar helper privado `pedirCupon()`**:

```ts
private async pedirCupon(): Promise<string | null> {
  const result = await Swal.fire({
    title: 'Numero de Cupon',
    html: `
      <p>Ingrese el numero de cupon de la operacion con tarjeta (4 a 6 digitos).</p>
      <input type="number" id="cupon" class="swal2-input"
             placeholder="Nro de cupon" min="1000" max="999999">
    `,
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    allowOutsideClick: false,
    allowEscapeKey: true,
    focusConfirm: false,
    preConfirm: () => {
      const v = (<HTMLInputElement>document.getElementById('cupon')).value;
      if (!/^[1-9][0-9]{3,5}$/.test(v)) {
        Swal.showValidationMessage('El cupon debe tener entre 4 y 6 digitos.');
        return false;
      }
      return v;
    }
  });

  return result.isConfirmed ? result.value : null;
}
```

3. **Uso del helper:**

```ts
const tieneTarjetaCredito = this.itemsEnCarrito.some(item => {
  const t = this.tarjetas.find(x => String(x.cod_tarj) === String(item.cod_tar));
  return t && Number(t.activadatos) === 1;
});

let cupon: string | null = null;
if (tieneTarjetaCredito) {
  cupon = await this.pedirCupon();
  if (!cupon) return; // cancelar venta sin persistir
}
```

4. **Agregar helper `esItemConTarjetaCredito(obj)`** para reutilizar la logica de deteccion por `cod_tar`.

5. **Al armar el payload final**, reemplazar:

```ts
nautotar: obj.nautotar || null,
```

por:

```ts
nautotar: this.esItemConTarjetaCredito(obj) ? Number(cupon) : null,
```

**Decision explicita:** para items que no son tarjeta de credito, `nautotar` debe enviarse siempre como `null`.

### 4.3 Pedir el Nro de Cupon al generar el recibo (cobranza)

**Archivo:** `src/app/components/cabeceras/cabeceras.component.ts`

**Ubicacion:** dentro de `generarSalida()`, despues de:

```ts
await this.getNumeroComprobanteCabecera();
await this.getNumeroComprobanteRecibo();
```

y antes de:

```ts
const psucursal = await this.generacionPagoPsucursal();
```

1. **Detectar si el metodo actual requiere datos de tarjeta:** `this.activaDatos === 1`.
2. **Agregar el mismo helper `pedirCupon()`** con la misma validacion (`^[1-9][0-9]{3,5}$`).
3. **Si el usuario cancela**, abortar la cobranza sin persistir.
4. **Asignar el valor a `this.tarjeta.Autorizacion`** antes de construir `psucursal1`:

```ts
if (this.activaDatos === 1) {
  const cupon = await this.pedirCupon();
  if (!cupon) return;
  this.tarjeta.Autorizacion = cupon;
}
```

De esta forma `generacionPagoPsucursal()` puede seguir usando:

```ts
nautotar: this.tarjeta.Autorizacion,
```

sin tocar el contrato PHP actual.

### 4.4 Limpieza de estado para evitar arrastre de cupon / datos previos

**Archivos:**
- `src/app/components/condicionventa/condicionventa.component.ts`
- `src/app/components/cabeceras/cabeceras.component.ts`

Agregar limpieza explicita del estado de pago:

1. **Cuando el usuario cambia desde tarjeta a un metodo con `activadatos != 1`**, resetear `this.tarjeta`.
2. **Cuando el usuario cambia desde cheque a un metodo con `activadatos != 2`**, resetear `this.cheque`.
3. **Despues de una operacion exitosa** (venta o cobranza), limpiar `tarjeta` y `cheque` antes de permitir una nueva operacion.

Esto evita que una operacion posterior en efectivo / transferencia arrastre `nautotar`, `titulartar`, `numerotar` o `dni_tar` de una operacion previa.

### 4.5 Etiquetas visibles

**Decision para esta PR:** **no incluir** cambios de etiqueta visibles como parte obligatoria.

Motivo:
- Hoy `historialventas2.component.ts` / `historialventas2.component.html` **no muestran** `nautotar` en pantalla.
- `Descarga.php.txt` si expone `p.nautotar`, pero la superficie visible real para mostrarlo no esta implementada hoy.

Si luego se decide exponer el dato al usuario, hacerlo en una segunda tarea explicita, por ejemplo agregando el campo en el detalle expandido de `historialventas2.component.html`.

---

## 5. Archivos NO tocados

| Archivo | Motivo |
|---|---|
| `src/Carga.php.txt` | No referencia `nautotar` por nombre. |
| `src/Descarga.php.txt` | El contrato actual sigue sirviendo tras ampliar `nautotar` a 6 digitos. |
| `src/app/components/stockenvio/stockenvio.component.ts` | Fuera de alcance. |
| `src/app/components/pedir-stock/pedir-stock.component.ts` | Fuera de alcance. |
| `src/app/components/historialventas2/historialventas2.component.ts` | No muestra hoy `nautotar`; no se toca en esta PR. |
| `src/app/components/historialventas2/historialventas2.component.html` | Igual motivo. |

---

## 6. Refactor opcional (fuera de alcance de esta PR)

El modal de datos de tarjeta esta duplicado entre `condicionventa.component.ts` y `cabeceras.component.ts`.

**Decision:** dejar el refactor para una segunda PR.

En esta tarea:
- `pedirCupon()` puede implementarse localmente en `carrito.component.ts` y `cabeceras.component.ts`.
- No se extrae todavia un `tarjeta-dialog.service.ts`.

---

## 7. Plan de pruebas manual

### 7.1 Venta - tarjeta de credito (camino feliz)

1. Iniciar venta, elegir cliente, elegir condicion **tarjeta de credito**.
2. **Verificar:** el modal pide Titular, DNI, Numero de Tarjeta **pero NO pide Autorizacion**.
3. Completar DNI y aceptar.
4. Agregar items al carrito.
5. Hacer clic en **Finalizar Venta**.
6. **Verificar:** aparece el modal "Numero de Cupon".
7. Ingresar `123456` y confirmar.
8. **Verificar en DB (`psucursal<N>` de la sucursal operativa):** los items con tarjeta tienen `nautotar = 123456`.

### 7.2 Venta - validaciones negativas del cupon

1. Repetir el flujo de venta con tarjeta.
2. En el modal de cupon probar:
   - vacio -> error,
   - `123` -> error,
   - `1234567` -> error,
   - letras -> error.
3. Cancelar el modal.
4. **Verificar:** la venta no se persiste.

### 7.3 Venta mixta - tarjeta + efectivo / transferencia

1. Crear una venta con al menos un item con tarjeta de credito y otro con un metodo sin `activadatos == 1`.
2. Finalizar la venta.
3. **Verificar:** el sistema pide un unico cupon una sola vez.
4. **Verificar en DB:**
   - items con tarjeta -> `nautotar = <cupon>`,
   - items sin tarjeta -> `nautotar = NULL`.

### 7.4 Venta - efectivo / transferencia / cuenta corriente

1. Iniciar venta con metodo **EFECTIVO**, **TRANSFERENCIA** o **CUENTA CORRIENTE**.
2. **Verificar:** no se pide modal de cupon al finalizar.
3. **Verificar en DB:** `nautotar = NULL`.

### 7.5 Cobranza - tarjeta de credito

1. En Cabeceras, seleccionar una factura pendiente.
2. Elegir metodo de pago **tarjeta de credito** (`activadatos == 1`).
3. **Verificar:** el modal pide Titular / DNI / Numero, **pero NO pide Autorizacion**.
4. Confirmar el pago.
5. **Verificar:** aparece el modal "Numero de Cupon".
6. Ingresar `456789` y confirmar.
7. **Verificar en DB** (`psucursal<N>`): la fila RC tiene `nautotar = 456789`.

### 7.6 Cobranza multiple - un solo recibo, varias cabeceras

1. Seleccionar 2 o mas cabeceras pendientes.
2. Elegir tarjeta de credito.
3. Confirmar un unico cupon.
4. **Verificar:**
   - un solo registro RC en `psucursal<N>` con `nautotar = <cupon>`,
   - multiples filas coherentes en `recibos<N>`,
   - actualizacion correcta de `factcab<N>` (`id_aso`, `anumero_com`, `atipo`).

### 7.7 Cobranza - efectivo

1. Cobrar con efectivo.
2. **Verificar:** no aparece modal de cupon.
3. **Verificar:** `nautotar = NULL` o `0` solo si el flujo actual ya lo usa asi, pero nunca debe arrastrar el cupon previo de otra operacion.

### 7.8 Regresion de limpieza de estado

1. Hacer una operacion con tarjeta y cupon.
2. Sin recargar la pantalla, iniciar una segunda operacion en efectivo.
3. **Verificar:** no se arrastran `nautotar`, `titulartar`, `numerotar` ni `dni_tar` de la operacion anterior.

### 7.9 Verificacion post-migracion

1. Consultar `information_schema.columns`.
2. **Verificar:** `numeric_precision = 6` para `nautotar` en las 10 tablas.

---

## 8. SQL de verificacion

Reemplazar `<N>` por la sucursal operativa real del usuario que ejecuto la prueba.

```sql
-- Verificar precision de la columna
SELECT table_name, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'nautotar'
ORDER BY table_name;

-- Operaciones recientes con cupon en la sucursal probada
SELECT numerocomprobante, fecha, nautotar, titulartar, dni_tar, cod_tar
FROM psucursal<N>
WHERE nautotar IS NOT NULL
ORDER BY fecha DESC, hora DESC
LIMIT 20;

-- Validar rango real implementado
SELECT COUNT(*) AS cupones_validos
FROM psucursal<N>
WHERE nautotar BETWEEN 1000 AND 999999
  AND fecha >= CURRENT_DATE - INTERVAL '7 days';
```

---

## 9. Rollback

Ahora el rollback tiene dos partes:

1. `git revert` del commit frontend.
2. rollback de DB **solo si todavia no se persistieron cupones mayores a 9999**.

Advertencia:

- si ya existen registros con `nautotar > 9999`, **no se puede volver** a `numeric(4,0)` sin limpiar o migrar esos datos primero.

Los registros historicos previos **siguen significando "autorizacion"** y los nuevos **significan "cupon"** dentro de la misma columna `nautotar`; por eso no debe relabelarse globalmente el historico sin una regla adicional.

---

## 10. Checklist de implementacion

- [ ] Ejecutar `MIGRACION_NAUTOTAR_6_DIGITOS.sql`.
- [ ] Verificar `numeric_precision = 6` en las 10 tablas.
- [ ] Quitar input "Autorizacion" en `condicionventa.component.ts`.
- [ ] Quitar input "Autorizacion" en `cabeceras.component.ts`.
- [ ] Eliminar carga temprana de `pedido.nautotar` en `calculoproducto.component.ts`.
- [ ] Implementar `pedirCupon()` en `carrito.component.ts`.
- [ ] Implementar `pedirCupon()` en `cabeceras.component.ts`.
- [ ] Integrar `pedirCupon()` en `carrito.component.ts -> finalizar()`.
- [ ] Integrar `pedirCupon()` en `cabeceras.component.ts -> generarSalida()`.
- [ ] Agregar helpers de deteccion de tarjeta de credito por `cod_tar` / `activadatos`.
- [ ] Limpiar estado de tarjeta / cheque al cambiar de metodo y al completar operacion.
- [ ] Probar los escenarios 7.1 a 7.9.
- [ ] Verificar con SQL de la seccion 8 usando `psucursal<N>` real.
- [ ] Commit sugerido: `feat(venta): reemplazar autorizacion por cupon de tarjeta`.

---

## 11. Nota de alcance futuro

Si mas adelante se pide:

- conservar ceros a la izquierda,
- mostrar el cupon en historial / reportes / exportaciones,
- separar semanticamente autorizacion historica y cupon nuevo,

abrir una segunda tarea con:

1. evaluacion de `varchar(6)` u otro modelo,
2. estrategia de compatibilidad historica,
3. definicion explicita de la superficie visible a modificar.
