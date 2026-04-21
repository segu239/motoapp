# Informe de revision de documento

**Fecha**: 2026-04-21
**Documento revisado**: `PLAN_CUPON_TARJETA.md`
**Tipo**: plan de implementacion
**Foco pedido**: exactitud tecnica contra Angular, PHP y base de datos

---

## Resumen ejecutivo

| Dimension | Score | Estado |
|---|---:|---|
| Factual | 65/100 | Aceptable |
| Consistencia | 75/100 | Aceptable |
| Completitud | 45/100 | Necesita correcciones |
| Viabilidad | 75/100 | Aceptable |
| Claridad | 50/100 | Necesita correcciones |

**Veredicto**: el plan **no esta listo para ejecutar tal como esta**. La observacion bloqueante es que `nautotar` **no soporta 4 a 6 digitos** en la base real: hoy es `numeric(4,0)` en `psucursal1..5` y `psucutmp1..5`. Ademas, el plan omite un impacto real en `src/app/components/calculoproducto/calculoproducto.component.ts`, y apunta a `src/app/components/historialventas2/historialventas2.component.ts` como si ya mostrara el campo cuando hoy no lo hace.

### Distribucion de hallazgos consolidados

- Criticos: 1
- Altos: 2
- Medios: 5
- Bajos: 2

---

## Hallazgos criticos

### FACT-001: `nautotar` no soporta 5-6 digitos hoy

**Severidad**: Critico | **Confianza**: 98% | **Esfuerzo**: mediano  
**Tipo**: error_factual / inviabilidad  
**Seccion**: `PLAN_CUPON_TARJETA.md:27`, `PLAN_CUPON_TARJETA.md:37`, `PLAN_CUPON_TARJETA.md:210`, `PLAN_CUPON_TARJETA.md:255`  
**Correlaciones**: `CONS-001`, `COV-001`, `VIAB-001`, `CLAR-001`

#### Fragmento del documento

> Soporta sin problema 4-6 digitos. No requiere migracion.

**Descripcion**: el plan afirma que `nautotar` soporta cupones de 4 a 6 digitos sin cambios de esquema, pero la base real muestra `numeric(4,0)`. Eso admite hasta 4 digitos enteros. Los ejemplos del plan con `123456` contradicen la estructura actual.

**Evidencia del proyecto**:
- **Fuente**: consulta real a `information_schema.columns`
- **Contenido real**: `psucursal1..5` y `psucutmp1..5` tienen `column_name = nautotar`, `data_type = numeric`, `numeric_precision = 4`, `numeric_scale = 0`, `is_nullable = YES`
- **Discrepancia**: el documento promete 4-6 digitos sin migracion, pero la base actual solo admite hasta 4 digitos

**Impacto**: si se implementa como esta escrito, un cupon de 5 o 6 digitos puede fallar al persistirse en venta o cobranza.

#### Texto corregido sugerido

> La columna `nautotar` hoy es `numeric(4,0)`, por lo que sin migracion solo admite hasta 4 digitos. Si el requerimiento definitivo es 4 a 6 digitos, esta tarea deja de ser solo frontend y requiere migracion de base de datos y validacion end-to-end antes de implementarse.

---

## Hallazgos altos

### VIAB-002: falta ajustar `calculoproducto.component.ts`

**Severidad**: Alto | **Confianza**: 94% | **Esfuerzo**: pequeno  
**Tipo**: omision / flujo_ambiguo  
**Seccion**: `PLAN_CUPON_TARJETA.md:86`  
**Correlaciones**: `CLAR-002`

#### Fragmento del documento

> Pedir el Nro de Cupon al finalizar la venta.

**Descripcion**: el plan mueve la captura al final de la venta, pero no incluye el cambio necesario en `src/app/components/calculoproducto/calculoproducto.component.ts`, donde hoy cada item hace `this.pedido.nautotar = parseInt(this.tarjeta.Autorizacion)`.

**Evidencia del proyecto**:
- **Fuente**: `src/app/components/calculoproducto/calculoproducto.component.ts:224`
- **Contenido real**: `this.pedido.nautotar = parseInt(this.tarjeta.Autorizacion);`
- **Discrepancia**: el plan centraliza el cupon en `carrito.finalizar()`, pero deja intacta la carga previa por item

**Impacto**: deja el flujo de venta con dos puntos de verdad para `nautotar` y puede arrastrar valores intermedios incorrectos en el carrito.

#### Texto corregido sugerido

> Agregar una tarea explicita en `src/app/components/calculoproducto/calculoproducto.component.ts`: dejar de asignar `pedido.nautotar` desde `this.tarjeta.Autorizacion` al agregar el item. En venta, `nautotar` debe completarse recien en `src/app/components/carrito/carrito.component.ts` dentro de `finalizar()`.

### COV-003: falta limpieza de estado de tarjeta/cupon

**Severidad**: Alto | **Confianza**: 92% | **Esfuerzo**: mediano  
**Tipo**: omision  
**Seccion**: `PLAN_CUPON_TARJETA.md:150`, `PLAN_CUPON_TARJETA.md:233`, `PLAN_CUPON_TARJETA.md:264`  
**Correlaciones**: `COV-002`, `COV-004`

#### Fragmento del documento

> Si `this.activaDatos === 1`, pedir cupon...

**Descripcion**: el plan asume que en efectivo o transferencia no quedaran datos de tarjeta/cupon, pero no agrega limpieza de `this.tarjeta` / `this.cheque` al cambiar de metodo ni al terminar una operacion.

**Evidencia del proyecto**:
- **Fuente**: `src/app/components/cabeceras/cabeceras.component.ts:793`, `src/app/components/cabeceras/cabeceras.component.ts:644`, `src/app/components/cabeceras/cabeceras.component.ts:493`
- **Contenido real**: `generacionPagoPsucursal()` siempre copia `titulartar`, `numerotar`, `nautotar`, `dni_tar` desde `this.tarjeta`; despues del cobro se limpia importe/seleccion pero no tarjeta/cheque
- **Discrepancia**: el plan no contempla el arrastre de estado entre operaciones o cambios de metodo

**Impacto**: una operacion posterior en efectivo puede persistir datos viejos de tarjeta o cupon.

#### Texto corregido sugerido

> Agregar limpieza obligatoria de estado: al cambiar desde tarjeta a un metodo con `activadatos != 1`, resetear `this.tarjeta`; al cambiar desde cheque, resetear `this.cheque`; y tras venta/cobranza exitosa, limpiar ambos objetos antes de permitir una nueva operacion.

---

## Hallazgos medios

| ID | Tipo | Descripcion | Seccion | Esfuerzo |
|---|---|---|---|---|
| FACT-002 | error_factual | `historialventas2` no muestra hoy `nautotar` ni una etiqueta de Autorizacion/Cupon para renombrar | `PLAN_CUPON_TARJETA.md:162` | bajo |
| CONS-003 | contradiccion | el plan reutiliza `nautotar` pero mezcla historicos de autorizacion con cupon nuevo en la misma columna | `PLAN_CUPON_TARJETA.md:13` | medio |
| CLAR-003 | ambiguedad | `pedirCupon()` se define sin cancelacion, pero luego el plan contempla `if (!cupon) return` | `PLAN_CUPON_TARJETA.md:95` | bajo |
| COV-002 | omision | falta un caso de venta mixta con items tarjeta y no tarjeta dentro del mismo carrito | `PLAN_CUPON_TARJETA.md:195` | bajo |
| COV-004 | omision | falta probar cobranza de multiples cabeceras en un solo recibo | `PLAN_CUPON_TARJETA.md:223` | bajo |

### FACT-002 - texto sugerido

> No se verifico una visualizacion actual de `nautotar` en `src/app/components/historialventas2/historialventas2.component.ts` ni en `src/app/components/historialventas2/historialventas2.component.html`. Antes de renombrar labels, identificar la vista o reporte que realmente muestra ese campo.

### CONS-003 - texto sugerido

> La reutilizacion de `nautotar` introduce convivencia de dos significados historicos: `codigo de autorizacion` para registros viejos y `numero de cupon` para registros nuevos. En vistas y reportes mixtos no debe renombrarse automaticamente a `Cupon` sin una regla de discriminacion.

### CLAR-003 - texto sugerido

> Definir una sola politica para `pedirCupon()`: o permite cancelar (`showCancelButton: true`) y el flujo aborta sin persistir, o no permite cancelar y el helper deja de devolver `null`.

### COV-002 - texto sugerido

> Agregar un caso de prueba de venta mixta: un item con tarjeta de credito y otro con efectivo/transferencia. Verificar que el modal pida un solo cupon y que solo los items con tarjeta persistan `nautotar`.

### COV-004 - texto sugerido

> Agregar un caso de cobranza multiple con 2 o mas cabeceras. Verificar un solo cupon para toda la operacion, una sola fila RC en `psucursalN` y multiples filas coherentes en `recibosN` y `factcabN`.

---

## Hallazgos bajos

- **CLAR-005** (ambiguedad): la SQL de verificacion fija `psucursal1` pero el resto del plan habla de `psucursalN` segun sucursal del usuario.
- **CLAR-006** (alcance): el refactor del modal duplicado queda como decision abierta dentro del mismo plan y no como alcance cerrado.

---

## Correlaciones notables

### Cross-domain

| Hallazgo Precision | Hallazgo Solidez | Relacion |
|---|---|---|
| `FACT-001` | `VIAB-001` | La restriccion real de `nautotar` vuelve incorrecta y no viable la regla de 4-6 digitos sin migracion |
| `FACT-002` | `COV-005` | La referencia a `historialventas2` como vista visible no esta soportada por el codigo actual |
| `CONS-003` | `VIAB-003` | La reutilizacion de `nautotar` crea mezcla semantica entre historicos y nuevos registros |

### Intra-domain

| Hallazgos | Relacion |
|---|---|
| `VIAB-002` ↔ `CLAR-002` | El flujo de venta queda ambiguo porque `calculoproducto` sigue cargando `nautotar` antes del paso final |
| `COV-002` ↔ `COV-003` | El caso mixto y la limpieza de estado son necesarios para evitar arrastre de datos entre metodos |

---

## Mapa de precision

```text
MAPA DE PRECISION
=================
[2.1 Base de datos]
- FACT-001 / CONS-001
- Riesgo: alto
- Precision: muy baja

[3.2 Venta - carrito / cupón]
- VIAB-002
- Riesgo: medio
- Precision: parcial

[3.4 Etiquetas visibles]
- FACT-002 / CONS-002
- Riesgo: medio
- Precision: baja

[6.1 / 6.4 / 7 Pruebas y SQL]
- afectados por FACT-001 y CLAR-005
- Riesgo: alto
- Precision: baja
```

**Precision general del documento**: 58%  
**Seccion mas problematica**: `2.1 Base de datos`

---

## Mapa de cobertura

```text
MAPA DE COBERTURA
=================
Cubierto por el plan:
- modal de tarjeta en venta
- modal de tarjeta en cobranza
- insercion final en carrito
- persistencia generica PHP
- rollback frontend basico

Faltante u omitido:
- compatibilidad real de `nautotar` con 4-6 digitos
- impacto en `calculoproducto.component.ts`
- limpieza de estado de tarjeta/cupon
- caso de venta mixta
- cobranza multiple en un solo recibo
- superficie real donde se mostrara el cupón
```

**Cobertura general**: 50%  
**Mayor brecha**: precondiciones tecnicas reales de persistencia y flujo de venta

---

## Roadmap de correcciones

### Antes de actuar (bloqueante)

- [ ] **FACT-001**: definir si el negocio queda en 4 digitos o si se hace migracion para 4-6 digitos

### Correcciones prioritarias

- [ ] **VIAB-002**: agregar el cambio en `src/app/components/calculoproducto/calculoproducto.component.ts`
- [ ] **COV-003**: agregar limpieza de estado de tarjeta/cheque/cupon

### Mejoras recomendadas

- [ ] **FACT-002**: ubicar la vista real donde se mostraria `nautotar`
- [ ] **CONS-003**: documentar la convivencia historica autorizacion/cupon en `nautotar`
- [ ] **CLAR-003**: cerrar politica de cancelacion del modal de cupon
- [ ] **COV-002**: sumar caso de venta mixta
- [ ] **COV-004**: sumar caso de cobranza multiple

### Nice-to-have

- [ ] **CLAR-005**: parametrizar SQL con `psucursal<N>` real
- [ ] **CLAR-006**: cerrar el alcance del refactor del modal duplicado

---

## Evidencia principal usada

- Base: consulta real a `information_schema.columns` sobre `nautotar`
- Frontend venta: `src/app/components/condicionventa/condicionventa.component.ts`, `src/app/components/calculoproducto/calculoproducto.component.ts`, `src/app/components/carrito/carrito.component.ts`
- Frontend cobranza: `src/app/components/cabeceras/cabeceras.component.ts`
- Historial: `src/app/components/historialventas2/historialventas2.component.ts`, `src/app/components/historialventas2/historialventas2.component.html`
- PHP backend: `src/Descarga.php.txt`, `src/Carga.php.txt`
