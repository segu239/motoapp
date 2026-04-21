# Prueba rapida - Cupon tarjeta

## Alcance

Validacion rapida y manual de los dos flujos modificados:

- venta con tarjeta desde `condicionventa` + `carrito`
- cobranza con tarjeta desde `cabeceras`

Objetivo:

- confirmar que ya no se pide `Codigo de Autorizacion`
- confirmar que ahora se pide `Numero de Cupon`
- confirmar validacion de 4 a 6 digitos
- confirmar persistencia en `nautotar`

## Datos para este bloque

- App Angular levantada y accesible
- Usuario con acceso a venta y cabeceras
- Sucursal de prueba conocida: `<N>`
- Un cliente valido para venta
- Un cliente con al menos una factura pendiente para cobranza
- Cupon valido corto: `1234`
- Cupon valido largo: `123456`
- Cupon invalido corto: `123`
- Cupon invalido largo: `1234567`

## TG-001 Venta con tarjeta

**Datos para este bloque:**
- Modulo: venta
- Pantalla objetivo: `condicionventa` y luego `carrito`
- Metodo de pago: una tarjeta con `activadatos == 1`
- Cupones a usar: `123`, `1234`, `1234567`, `123456`

### Test 1 - Venta feliz con cupon de 6 digitos

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Navigate | Flujo de login y menu de venta | - | Quedas dentro del flujo de venta con cliente seleccionado | Pantalla de `condicionventa` visible |
| 2 | Click | Metodo de pago de tarjeta de credito | - | Se abre modal de datos de tarjeta | Modal con titulo `Datos de la Tarjeta` visible |
| 3 | Verify | Modal de tarjeta | - | Se ven campos `Nombre del Titular`, `DNI` y `Numero de Tarjeta` | - |
| 4 | Verify-Not | Modal de tarjeta | - | No aparece el campo `Codigo de Autorizacion` | - |
| 5 | Type | Campo `DNI` | `12345678` | El valor queda cargado | - |
| 6 | Type | Campo `Nombre del Titular` | `Carlos Prueba` | El valor queda cargado | - |
| 7 | Type | Campo `Numero de Tarjeta` | `4507990000000010` | El valor queda cargado | - |
| 8 | Click | Boton `Guardar` | - | Se confirma guardado de tarjeta | Mensaje `Datos guardados correctamente` o `Datos guardados` visible |
| 9 | Wait | Carga de productos | - | Se muestran productos para agregar | Tabla/lista de productos visible |
| 10 | Click | Un producto disponible | - | Se abre dialogo de agregar al carrito | Dialogo de producto visible |
| 11 | Type | Campo de cantidad | `1` | Cantidad valida cargada | - |
| 12 | Click | Boton para agregar al carrito | - | El item se agrega al carrito | Confirmacion de agregado o contador de carrito actualizado |
| 13 | Navigate | Pantalla `carrito` | - | Se ve el item agregado | Tabla/lista del carrito visible |
| 14 | Click | Boton `Finalizar` o `Finalizar Venta` | - | Se abre modal de cupón | Modal con titulo `Numero de Cupon` visible |
| 15 | Type | Campo `Nro de cupon` | `123456` | El valor queda cargado | - |
| 16 | Click | Boton `Confirmar` | - | La venta se procesa | Mensaje de exito visible |
| 17 | Verify | Resultado final | - | La venta termina sin errores de validacion | Confirmacion de venta/pedido enviado visible |

### Test 2 - Validaciones del cupon en venta

Continua desde una nueva venta con tarjeta y al menos un item en carrito.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Click | Boton `Finalizar` o `Finalizar Venta` | - | Se abre modal `Numero de Cupon` | Modal visible |
| 2 | Type | Campo `Nro de cupon` | `123` | El valor queda cargado | - |
| 3 | Click | Boton `Confirmar` | - | Aparece error de validacion | Mensaje `El cupon debe tener entre 4 y 6 digitos.` visible |
| 4 | Clear+Type | Campo `Nro de cupon` | `1234567` | El valor queda cargado | - |
| 5 | Click | Boton `Confirmar` | - | Aparece el mismo error | Mensaje de validacion visible |
| 6 | Clear+Type | Campo `Nro de cupon` | `1234` | El valor queda cargado | - |
| 7 | Click | Boton `Confirmar` | - | La venta continua normalmente | Mensaje de exito visible |

### Verificacion rapida en base para venta

Ejecutar sobre la sucursal real usada en la prueba:

```sql
SELECT numerocomprobante, fecha, nautotar, cod_tar, titulartar, dni_tar
FROM psucursal<N>
WHERE nautotar IS NOT NULL
ORDER BY fecha DESC, hora DESC
LIMIT 10;
```

Esperado:

- aparece la operacion reciente
- `nautotar` queda en `123456` o `1234` segun el test ejecutado
- `cod_tar` corresponde a una tarjeta con `activadatos = 1`

## TG-002 Cobranza con tarjeta

**Datos para este bloque:**
- Modulo: `cabeceras`
- Cliente con al menos una factura pendiente
- Metodo de pago: tarjeta con `activadatos == 1`
- Cupones a usar: `123`, `456789`

### Test 1 - Cobranza feliz con cupon de 6 digitos

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Navigate | Flujo de login y menu de cabeceras/cuenta corriente | - | Pantalla de `cabeceras` abierta para un cliente con deuda | Tabla de cabeceras visible |
| 2 | Click | Checkbox o fila de una factura pendiente | - | Queda seleccionada para cobrar | Seleccion visible |
| 3 | Click | Metodo de pago con tarjeta | - | Se abre modal de tarjeta | Modal visible |
| 4 | Verify | Modal de tarjeta | - | Se ven `Nombre del Titular`, `DNI` y `Numero de Tarjeta` | - |
| 5 | Verify-Not | Modal de tarjeta | - | No aparece `Codigo de Autorizacion` | - |
| 6 | Type | Campo `DNI` | `12345678` | Valor cargado | - |
| 7 | Type | Campo `Nombre del Titular` | `Maria Prueba` | Valor cargado | - |
| 8 | Type | Campo `Numero de Tarjeta` | `4507990000000010` | Valor cargado | - |
| 9 | Click | Boton `Guardar` | - | Se guardan datos de tarjeta | Mensaje de confirmacion visible |
| 10 | Type | Campo de importe de pago | Un importe valido | Queda listo para cobrar | - |
| 11 | Click | Boton para procesar pago | - | Se muestra confirmacion de pago | Dialogo `Confirmar Pago` visible |
| 12 | Click | Boton `Si, procesar pago` | - | Se abre modal de cupón | Modal `Numero de Cupon` visible |
| 13 | Type | Campo `Nro de cupon` | `456789` | Valor cargado | - |
| 14 | Click | Boton `Confirmar` | - | La cobranza se procesa | Mensaje `Pago realizado` visible |
| 15 | Verify | Resultado final | - | No hay errores y la operacion termina | Confirmacion visible |

### Test 2 - Validacion de cupón en cobranza

Continua desde una nueva cobranza con tarjeta lista para confirmar.

| Step | Action | Element | Data | Expected Result | Wait For |
|------|--------|---------|------|-----------------|----------|
| 1 | Click | Boton para procesar pago | - | Se muestra confirmacion | Dialogo visible |
| 2 | Click | Boton `Si, procesar pago` | - | Se abre modal `Numero de Cupon` | Modal visible |
| 3 | Type | Campo `Nro de cupon` | `123` | Valor cargado | - |
| 4 | Click | Boton `Confirmar` | - | Aparece validacion | Mensaje `El cupon debe tener entre 4 y 6 digitos.` visible |
| 5 | Clear+Type | Campo `Nro de cupon` | `456789` | Valor cargado | - |
| 6 | Click | Boton `Confirmar` | - | La cobranza continua | Mensaje `Pago realizado` visible |

### Verificacion rapida en base para cobranza

```sql
SELECT numerocomprobante, fecha, nautotar, cod_tar, nomart, titulartar, dni_tar
FROM psucursal<N>
WHERE nomart = 'RECIBO DE PAGO'
  AND nautotar IS NOT NULL
ORDER BY fecha DESC, hora DESC
LIMIT 10;
```

Esperado:

- aparece una fila reciente con `nomart = 'RECIBO DE PAGO'`
- `nautotar = 456789` en el test feliz

## No cubierto en esta version rapida

- pruebas con multiples cabeceras en un mismo recibo
- pruebas de venta mixta con items tarjeta y no tarjeta
- visualizacion del cupon en historial
- casos de rollback manual de datos

## Resultado esperado de la prueba rapida

La prueba se considera aprobada si se cumplen estas 5 condiciones:

1. no aparece mas el campo `Codigo de Autorizacion`
2. aparece el modal `Numero de Cupon` solo al finalizar
3. el cupon valida 4 a 6 digitos
4. una venta con `123456` persiste `nautotar = 123456`
5. una cobranza con `456789` persiste `nautotar = 456789`
