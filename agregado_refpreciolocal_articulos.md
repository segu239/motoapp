# Plan: Referencia de Precio en Moneda Local (PESOS) para Artículos en Moneda Extranjera

## Problema

Cuando un artículo tiene sus precios expresados en moneda extranjera (ej: USD), el usuario ve únicamente los valores en esa moneda. Esto dificulta hacer cálculos mentales y tener noción del valor real en pesos argentinos mientras se editan o cargan los precios.

## Objetivo

Mostrar una **referencia visual informativa en tiempo real** del equivalente en PESOS de cada precio existente cuando la moneda seleccionada NO es moneda local (cod_mone !== 1). Solo visualización, sin modificar valores, sin agregar campos ni funcionalidades extras.

## Datos Reales de la Base de Datos (Postgres - motomatch)

### Tabla `tipomone` (tipos de moneda)

| cod_mone | moneda | simbolo |
|---|---|---|
| 1 | PESOS | $ |
| 2 | DOLAR IMPORTADO | U$S |
| 3 | DOLAR NACIONAL | U$S |

### Tabla `valorcambio` - Estructura

Columnas: `id_valor` (integer PK), `codmone` (numeric), `vcambio` (numeric), `fecdesde` (date), `fechasta` (date), `desvalor` (character).

**Nota:** La tabla NO tiene columna `estado`. La vigencia se determina comparando `fecdesde`/`fechasta` con la fecha actual.

### Datos completos al 20/02/2026

| codmone | vcambio | fecdesde | fechasta | desvalor | Vigente al 20/02/2026? |
|---|---|---|---|---|---|
| 1 | 1.00 | 2000-01-01 | 9999-12-31 | VALIDACION HASTA 01/05/2025 | **SI** |
| 2 | 2100.00 | 2025-11-07 | 2025-12-31 | valor 07/11/2025 al 31/12/9999 | NO |
| 2 | 1735.00 | 2025-07-04 | 2025-12-31 | VALOR DOLAR AL FECHA DE HOY | NO |
| 2 | 1575.00 | 2025-05-01 | 2025-12-31 | valor 01/05/2025 | NO |
| 2 | 10.00 | 2025-04-05 | 2025-04-30 | VALIDO AL 06/04/2025 | NO |
| 2 | 1575.00 | 2025-04-04 | 2025-12-31 | dolar valor nuevo al 08/04/24 | NO |
| 2 | 2000.00 | 2025-04-01 | 2025-12-31 | VALOR AL 01/04/2025 | NO |
| 2 | 1089.00 | 2025-03-17 | 9999-12-31 | DOLARES 01/01/2025 | **SI** (único vigente) |
| 3 | 18.25 | 2025-11-07 | 2025-12-31 | valor 07/11/2025 al 31/12/2025 | NO |
| 3 | 15.30 | 2025-07-04 | 2025-12-31 | VALOR DOLAR A FECHA DE HOY | NO |
| 3 | 14.50 | 2025-04-11 | 2025-12-31 | VALOR DESDE 11 / 04 / 2025 | NO |

**Situación de cotizaciones al 20/02/2026 (snapshot, datos dinámicos):**
- **codmone=1 (PESOS)**: 1 registro vigente (vcambio=1.00, fechasta=9999-12-31). Siempre neutro.
- **codmone=2 (DOLAR IMPORTADO)**: 8 registros. Solo 1 vigente (vcambio=1089.00, fechasta=9999-12-31). Los demás 7 tienen fechasta expirado.
- **codmone=3 (DOLAR NACIONAL)**: 3 registros. Al 20/02/2026 todos tienen fechasta=2025-12-31 (expirados). No hay cotización vigente a esta fecha.

**Nota importante:** Los datos de `valorcambio` son **dinámicos**. El sistema tiene CRUD completo (INSERT en Descarga.php:2601, UPDATE en Descarga.php:3540, DELETE en Descarga.php:595) que permite agregar, modificar o eliminar cotizaciones en cualquier momento. En cualquier momento puede cargarse un nuevo registro con codmone=3 y fechas vigentes, y los badges aparecerían automáticamente. El comportamiento de los badges depende del estado de los datos al momento de la consulta, no de valores fijos.

### Distribución de artículos por moneda (tabla `artsucursal` en Postgres)

| tipo_moneda | total artículos |
|---|---|
| 1 (PESOS) | 12 |
| 2 (DOLAR IMPORTADO) | 4,217 |
| 3 (DOLAR NACIONAL) | 1,264 |

El **99.8%** de los artículos están en moneda extranjera (5,481 de 5,493). Confirma la necesidad de esta feature.

## Enfoque: Reutilizar la lógica existente

### Decisión clave

En lugar de crear métodos separados con lógica diferente al backend, **reutilizamos la lógica de `actualizarTasaCambio()` que ya funciona en newarticulo** (filtro por vigencia de fechas: `fecdesde <= hoy && fechasta >= hoy`, luego `ORDER BY fecdesde DESC`).

### Justificación

1. **Cero riesgo de romper lo existente**: Solo se expone como propiedad de clase lo que ya se calcula internamente como variable local.
2. **Una sola lógica de cotización en todo el frontend**: newarticulo y editarticulo usan el mismo criterio.
3. **Se elimina el riesgo más alto del plan anterior**: No se crea un método paralelo con lógica diferente (`actualizarTasaCambioParaBadges` ya no es necesario).
4. **El badge siempre está presente** cuando hay moneda extranjera y cotización vigente, usando la misma tasa que ya muestra `infoTasaCambio`.

### Inconsistencia backend vs frontend (preexistente, NO introducida por esta feature)

| Componente | Lógica de selección | Resultado para codmone=2 |
|---|---|---|
| **Backend** (Carga.php:946-950) | `ORDER BY fecdesde DESC LIMIT 1` (sin filtro de vigencia) | **2100.00** (más reciente por fecdesde) |
| **Frontend** (newarticulo.ts:875-879) | `fecdesde <= hoy && fechasta >= hoy` + sort desc | **1089.00** (único vigente por fecha) |

Esta inconsistencia **ya existe** independientemente de esta feature. La referencia en pesos usará la misma tasa que el frontend ya muestra, manteniendo consistencia interna del frontend.

### APIs existentes (no se crean nuevas)

- `GET Carga/ValorCambio` → devuelve todos los registros de `valorcambio` (Carga.php:1347-1352).
- `GET Carga/TipoMoneda` → devuelve todos los registros de `tipomone` (Carga.php:1327-1345).

## Componentes Afectados

| Componente | Archivo HTML | Archivo TS | Archivo CSS |
|---|---|---|---|
| **editarticulo** | `editarticulo.component.html` | `editarticulo.component.ts` | `editarticulo.component.css` |
| **newarticulo** | `newarticulo.component.html` | `newarticulo.component.ts` | `newarticulo.component.css` |

(Todos dentro de `src/app/components/`)

## Estado Actual de los Componentes

### newarticulo (ya tiene casi todo)
- Ya carga `valoresCambio` desde la API via `cargarValoresCambio()` (líneas 155-171).
- Ya tiene `actualizarTasaCambio()` (líneas 853-902) que:
  - Filtra por vigencia de fechas (`fecdesde <= hoy && fechasta >= hoy`)
  - Ordena por `fecdesde DESC`
  - Calcula la tasa como variable local `tasaCambioInfo` (línea 891)
  - Arma el string `infoTasaCambio` (línea 896)
- Ya se llama al cambiar moneda (línea 377) y al cargar valores (línea 162).
- **NO tiene** `tasaCambioActual` como propiedad de clase (solo variable local).
- **NO tiene** `esMonedaExtranjera`.

### editarticulo (no tiene nada de cotizaciones)
- **NO** carga valores de cambio.
- Ya usa `cargardata` service (inyectado), por lo que `getValorCambio()` está disponible.
- Ya carga `tiposMoneda` via `cargarTiposMoneda()` (líneas 280-293).

## Propuesta de UI

### Badge de referencia debajo de cada input de precio

Cuando `tipo_moneda !== 1` (no es PESOS) y hay cotización vigente, se muestra debajo de cada campo de precio **ya existente** un **badge informativo** con el equivalente en pesos:

```
┌─────────────────────────────────────────────────────┐
│  Precio Costo s/IVA                                 │
│  ┌───────────────────────────────┐                  │
│  │  150.00                       │  (input en U$S)  │
│  └───────────────────────────────┘                  │
│  ┌─────────────────────────────────────┐            │
│  │ Ref. $: 163,350.00 ARS             │  (badge)    │
│  └─────────────────────────────────────┘            │
│                                                     │
│  Precio Base s/IVA                                  │
│  ┌───────────────────────────────┐                  │
│  │  120.00                       │  (input en U$S)  │
│  └───────────────────────────────┘                  │
│  ┌─────────────────────────────────────┐            │
│  │ Ref. $: 130,680.00 ARS             │  (badge)    │
│  └─────────────────────────────────────┘            │
│                                                     │
│  Precio Final                                       │
│  ┌───────────────────────────────┐                  │
│  │  145.20                       │  (input en U$S)  │
│  └───────────────────────────────┘                  │
│  ┌─────────────────────────────────────┐            │
│  │ Ref. $: 158,122.80 ARS             │  (badge)    │
│  └─────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

(Valores de ejemplo con vcambio=1089.00 para DOLAR IMPORTADO vigente)

**En editarticulo**, los precios de lista (`prefi1`-`prefi4`) también llevarán su badge.

### Banner informativo de cotización

Al inicio de la sección de precios, un banner con la cotización activa:

```
┌──────────────────────────────────────────────────────────────┐
│  i Cotización: 1 DOLAR IMPORTADO = 1,089.00 ARS             │
└──────────────────────────────────────────────────────────────┘
```

Estilo: `alert alert-info` con padding reducido, visible solo si moneda extranjera y hay tasa vigente disponible.

### Estilos del badge

```css
.ref-pesos {
    display: block;
    margin-top: 2px;
    padding: 2px 8px;
    font-size: 0.8rem;
    color: #155724;
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    font-weight: 500;
}
```

## Plan de Implementación

### Paso 1: newarticulo.component.ts — Exponer la tasa como propiedad de clase

**Principio: NO modificar la lógica de `actualizarTasaCambio()`, solo exponer lo que ya calcula.**

1. Agregar propiedades de clase:
   ```typescript
   tasaCambioActual: number = 0;
   esMonedaExtranjera: boolean = false;
   nombreMonedaSeleccionada: string = '';
   refPesosPrecostosi: number = 0;
   refPesosPrebsiva: number = 0;
   refPesosPrecon: number = 0;
   ```

2. Dentro de `actualizarTasaCambio()` existente, agregar asignaciones para persistir lo que ya se calcula:
   - Antes del `if (codMone === 1)`: setear `this.esMonedaExtranjera = (codMone !== 1);`
   - Dentro del `if (codMone === 1)` (línea 864): agregar `this.tasaCambioActual = 0;`
   - Donde se calcula `tasaCambioInfo` (línea 891): agregar `this.tasaCambioActual = tasaCambioInfo;`
   - Donde se arma `nombreMoneda` (línea 894): agregar `this.nombreMonedaSeleccionada = nombreMoneda.trim();`
   - En el else (línea 898-901, sin cotización vigente): setear `this.tasaCambioActual = 0;`
   - Al final del método, llamar `this.actualizarRefPesos();`

3. Crear método `actualizarRefPesos()`:
   ```typescript
   actualizarRefPesos() {
       if (!this.esMonedaExtranjera || !this.tasaCambioActual) {
           this.refPesosPrecostosi = 0;
           this.refPesosPrebsiva = 0;
           this.refPesosPrecon = 0;
           return;
       }
       const tasa = this.tasaCambioActual;
       this.refPesosPrecostosi = (parseFloat(this.nuevoarticuloForm.get('precostosi')?.value) || 0) * tasa;
       this.refPesosPrebsiva = (parseFloat(this.nuevoarticuloForm.get('prebsiva')?.value) || 0) * tasa;
       this.refPesosPrecon = (parseFloat(this.nuevoarticuloForm.get('precon')?.value) || 0) * tasa;
   }
   ```

4. Suscribirse a `valueChanges` de los campos de precio para llamar `actualizarRefPesos()` cuando cambian.

### Paso 2: newarticulo.component.html — Agregar badges y banner

- Banner de cotización al inicio de la sección de precios.
- Badge `<small class="ref-pesos">` debajo de cada input: `precostosi`, `prebsiva`, `precon`.
- Usar propiedades reactivas (`refPesosPrecostosi`, etc.), NO funciones en template.

### Paso 3: newarticulo.component.css — Agregar estilo `.ref-pesos`

### Paso 4: editarticulo.component.ts — Agregar carga de cotizaciones y misma lógica

1. Agregar propiedades de clase:
   ```typescript
   valoresCambio: any[] = [];
   tasaCambioActual: number = 0;
   esMonedaExtranjera: boolean = false;
   nombreMonedaSeleccionada: string = '';
   infoTasaCambio: string = '';
   refPesosPrecostosi: number = 0;
   refPesosPrebsiva: number = 0;
   refPesosPrecon: number = 0;
   refPesosPrefi1: number = 0;
   refPesosPrefi2: number = 0;
   refPesosPrefi3: number = 0;
   refPesosPrefi4: number = 0;
   ```

2. Cargar valores de cambio via `cargardata.getValorCambio()` en la carga inicial.

3. Crear `actualizarTasaCambio()` con **la misma lógica que newarticulo** (filtro por vigencia de fechas), no la del backend. Que setee `tasaCambioActual`, `esMonedaExtranjera`, `nombreMonedaSeleccionada`, `infoTasaCambio` y llame `actualizarRefPesos()`.

4. Crear `actualizarRefPesos()` con los 7 campos de precio (precostosi, prebsiva, precon, prefi1-prefi4).

5. Suscribirse a cambios de `tipo_moneda` y de los campos de precio.

6. Llamar `actualizarTasaCambio()` al cargar el artículo.

### Paso 5: editarticulo.component.html — Agregar badges y banner

- Banner de cotización al inicio de la sección de precios.
- Badge debajo de cada input: `precostosi`, `prebsiva`, `precon`, `prefi1`-`prefi4`.

### Paso 6: editarticulo.component.css — Agregar estilo `.ref-pesos`

## Campos de precio que llevarán referencia

| Campo | Label | Componentes |
|---|---|---|
| `precostosi` | Precio Costo s/IVA | editarticulo, newarticulo |
| `prebsiva` | Precio Base s/IVA | editarticulo, newarticulo |
| `precon` | Precio Final | editarticulo, newarticulo |
| `prefi1` | Precio Lista 1 | editarticulo |
| `prefi2` | Precio Lista 2 | editarticulo |
| `prefi3` | Precio Lista 3 | editarticulo |
| `prefi4` | Precio Lista 4 | editarticulo |

## Comportamiento Esperado

1. **Moneda = PESOS (cod_mone = 1)**: No se muestra ninguna referencia ni banner. UI idéntica a la actual.
2. **Moneda extranjera con cotización vigente** (ej: codmone=2 con vcambio=1089.00 al 20/02/2026):
   - Banner de cotización visible en la sección de precios.
   - Badge verde debajo de cada input de precio con equivalente en ARS.
   - Badges se actualizan en tiempo real al modificar precios.
3. **Moneda extranjera sin cotización vigente** (ej: codmone=3 al 20/02/2026, o cualquier moneda cuyas cotizaciones estén todas expiradas):
   - No se muestran badges ni banner de cotización.
   - Se muestra el mensaje existente de `infoTasaCambio`: "No hay una tasa de cambio referencial vigente para esta moneda".
   - Si posteriormente se carga una cotización vigente para esa moneda, los badges aparecerán automáticamente.
4. **Valores vacíos/cero**: No aparecen badges con "0.00 ARS".

## Análisis de Riesgos Completo

### Riesgos Directos de la Implementación (lo que vamos a hacer)

| # | Riesgo | Severidad | Probabilidad | Detalle | Mitigación |
|---|--------|-----------|-------------|---------|------------|
| R1 | Modificar `actualizarTasaCambio()` en newarticulo | **BAJA** | Muy baja | Agregar ~5 líneas de asignación a propiedades nuevas (`tasaCambioActual`, `esMonedaExtranjera`, `nombreMonedaSeleccionada`) dentro del método existente. | Las asignaciones son a propiedades **nuevas** que no existen hoy. No se toca ninguna variable existente (`infoTasaCambio`, `monedaSeleccionada`, `tasaCambioInfo`). El flujo y las condiciones del método quedan intactos. |
| R2 | Nuevas `valueChanges` suscripciones para campos de precio | **MEDIA** | Baja | `precostosi`, `prebsiva`, `precon` ya tienen `valueChanges` que disparan cálculos en cadena (`calcularDesdePrecoSinIva()`, `calcularPrecioFinal()`, `calcularPreciosSinIva()`). Agregar otra suscripción suma al problema preexistente de suscripciones sin cleanup. | La nueva suscripción es de **solo lectura** (lee valor, multiplica por tasa, asigna a propiedad de display). NO modifica valores del form. NO dispara otros cálculos. NO interactúa con el flag `calculando`. |
| R3 | Crear `actualizarTasaCambio()` en editarticulo desde cero | **MEDIA** | Baja | El componente editarticulo tiene un sistema complejo de cálculos en cadena con flag `calculando` como circuit breaker. Agregar suscripción a `tipo_moneda.valueChanges` podría interactuar con la existente (línea 197-204) que llama `calcularPreciosLista()`. | El nuevo `actualizarTasaCambio()` NO modifica valores del form, solo lee `tipo_moneda` y calcula propiedades de display. NO necesita el flag `calculando`. Múltiples suscriptores al mismo observable es patrón válido en RxJS. |
| R4 | Timing de carga de `valoresCambio` en editarticulo | **MEDIA** | Media | El artículo puede cargarse **antes** de que `valoresCambio` esté disponible, resultando en badges que no aparecen hasta que se recarga. Editarticulo ya tiene este problema con `tiposMoneda` y `tiposIva` (resuelto con `setTimeout` de 300-500ms). | Llamar `actualizarTasaCambio()` tanto al completar la carga de `valoresCambio` como al cargar el artículo. Quien llegue segundo tendrá ambos datos disponibles. |
| R5 | Performance de badges en template | **BAJA** | Muy baja | Si se usaran funciones en el template, Angular las ejecutaría en cada ciclo de change detection. | Eliminado por diseño: se usan propiedades precalculadas, NO funciones. El pipe `number` es puro (se cachea). |

### Riesgos Preexistentes (NO introducidos por esta feature, pero heredados)

| # | Riesgo | Severidad | Probabilidad | Detalle | Impacto en nuestra feature |
|---|--------|-----------|-------------|---------|---------------------------|
| R6 | Memory leak por suscripciones sin cleanup | **CRÍTICA** | Alta | **newarticulo**: 7+ suscripciones sin `unsubscribe()`, no implementa `OnDestroy`. **editarticulo**: 12+ suscripciones sin `unsubscribe()`, no implementa `OnDestroy`. | Cada suscripción nueva (3-4 por componente) hereda este problema. Pero NO lo empeora significativamente (pasar de 12 a 15 suscripciones con leak no cambia la gravedad). **Acción**: Documentar como deuda técnica para refactor posterior. |
| R7 | Race conditions en carga de datos | **ALTA** | Media | **editarticulo**: Doble suscripción a `queryParams` (líneas 53 y 312). `setupFormListeners()` se ejecuta antes de que los datos se carguen. `forzarCalculosCompletos()` se puede llamar 2 veces con `setTimeout` de 300ms y 500ms. | Si `actualizarTasaCambio()` se llama antes de que `valoresCambio` esté cargado, simplemente no encuentra cotización y no muestra badge. Esto es el **comportamiento correcto** — la condición `if (!this.valoresCambio || this.valoresCambio.length === 0)` sale temprano sin efectos secundarios. |
| R8 | Flag `calculando` como circuit breaker frágil | **ALTA** | Media | Ambos componentes usan un booleano `calculando` para evitar loops infinitos en los cálculos en cadena de precios. En editarticulo hay un patrón peligroso (líneas 139-163) que fuerza `calculando = false` para override. | **Nulo**. `actualizarRefPesos()` NO modifica valores del form, por lo tanto NO dispara la cadena de cálculos y NO necesita interactuar con el flag `calculando`. |
| R9 | Inconsistencia backend vs frontend en cotización | **MEDIA** | Cierta | Backend usa `ORDER BY fecdesde DESC LIMIT 1` sin filtro de vigencia (devuelve 2100.00 para codmone=2). Frontend filtra por vigencia (devuelve 1089.00 para codmone=2). | Los badges mostrarán referencia con tasa 1089.00, pero pedidos/stock del backend calculan con 2100.00. Esta inconsistencia **ya existe** con `infoTasaCambio`. Nuestra feature es consistente con lo que el frontend ya muestra. |

### Riesgos de UX/UI

| # | Riesgo | Severidad | Probabilidad | Detalle | Mitigación |
|---|--------|-----------|-------------|---------|------------|
| R10 | Moneda sin cotización vigente | **BAJA** | Variable | Cualquier moneda puede no tener cotización vigente en un momento dado (ej: codmone=3 al 20/02/2026). Los artículos en esa moneda no verán badge. | Comportamiento correcto y dinámico. Cuando se cargue una cotización vigente via el CRUD de `valorcambio` (Descarga.php:2601), los badges aparecen automáticamente al recargar el componente. |
| R11 | Saturación visual de badges | **BAJA** | Baja | El badge verde debajo de cada input podría saturar visualmente la sección de precios, especialmente en editarticulo con 7 campos. | Estilo compacto (0.8rem, padding 2px 8px). Solo aparece con moneda extranjera y cotización vigente. El usuario puede ignorarlo. |

### Matriz de Riesgos Consolidada

| # | Riesgo | Severidad | Probabilidad | Tipo | Acción |
|---|--------|-----------|-------------|------|--------|
| R1 | Modificar `actualizarTasaCambio()` existente | Baja | Muy baja | Directo | Aceptar — cambio mínimo |
| R2 | Nuevas `valueChanges` suscripciones | Media | Baja | Directo | Aceptar — solo lectura, no interfiere |
| R3 | Crear `actualizarTasaCambio()` en editarticulo | Media | Baja | Directo | Aceptar — independiente de cálculos |
| R4 | Timing carga `valoresCambio` en editarticulo | Media | Media | Directo | Mitigar — llamar en ambos callbacks |
| R5 | Performance badges en template | Baja | Muy baja | Directo | Eliminado por diseño — propiedades reactivas |
| R6 | Memory leak suscripciones | Crítica | Alta | Heredado | Documentar — deuda técnica existente |
| R7 | Race conditions carga datos | Alta | Media | Heredado | Documentar — no empeora |
| R8 | Flag `calculando` frágil | Alta | Media | Heredado | No aplica — feature no interactúa |
| R9 | Inconsistencia backend/frontend cotización | Media | Cierta | Heredado | Aceptar — preexistente |
| R10 | Moneda sin cotización vigente | Baja | Variable | UX | Aceptar — comportamiento correcto |
| R11 | Saturación visual badges | Baja | Baja | UX | Aceptar — estilo compacto |

### Conclusión del Análisis de Riesgos

**Riesgo general de la implementación: BAJO.**

Los riesgos directos (R1-R5) son todos bajos o medios con mitigaciones claras. La feature es de **solo lectura** — no modifica valores, no interfiere con cálculos existentes, no agrega campos al formulario.

Los riesgos altos y críticos (R6-R8) son **preexistentes** en ambos componentes y no son introducidos ni empeorados significativamente por esta implementación. Deberían abordarse en un refactor independiente.

## Resumen de Archivos a Modificar

1. `src/app/components/newarticulo/newarticulo.component.ts` — Agregar propiedades `tasaCambioActual`, `esMonedaExtranjera`, `nombreMonedaSeleccionada` + 3 `refPesos*`. Exponer tasa dentro de `actualizarTasaCambio()` existente (sin cambiar lógica). Crear `actualizarRefPesos()`. Suscribir `valueChanges`.
2. `src/app/components/newarticulo/newarticulo.component.html` — Banner de cotización + badges debajo de inputs de precio.
3. `src/app/components/newarticulo/newarticulo.component.css` — Estilo `.ref-pesos`.
4. `src/app/components/editarticulo/editarticulo.component.ts` — Cargar cotizaciones, crear `actualizarTasaCambio()` (misma lógica que newarticulo), crear `actualizarRefPesos()`, propiedades (tasa + 7 `refPesos*`).
5. `src/app/components/editarticulo/editarticulo.component.html` — Banner de cotización + badges debajo de inputs de precio.
6. `src/app/components/editarticulo/editarticulo.component.css` — Estilo `.ref-pesos`.

## Verificación / Testing Manual

1. **Editar artículo en PESOS (cod_mone=1)**: No debe aparecer ningún badge ni banner.
2. **Editar artículo en moneda extranjera con cotización vigente**: Badge verde con conversión, banner con cotización.
3. **Editar artículo en moneda extranjera sin cotización vigente**: Sin badge ni banner. Mensaje de `infoTasaCambio` indicando que no hay tasa vigente.
4. **Crear artículo nuevo**: Cambiar moneda en dropdown, verificar que badges aparecen/desaparecen según disponibilidad de cotización vigente.
5. **Modificar precio**: Cambiar valor de precostosi, verificar que badge se actualiza en tiempo real.
6. **newarticulo - infoTasaCambio**: Verificar que el texto debajo del dropdown de moneda sigue funcionando exactamente igual que antes.
7. **Valores vacíos/cero**: No deben aparecer badges con "0.00 ARS".
8. **Agregar cotización vigente para moneda sin vigente**: Cargar un nuevo registro en `valorcambio` con fechas vigentes, recargar el componente y verificar que los badges aparecen.
