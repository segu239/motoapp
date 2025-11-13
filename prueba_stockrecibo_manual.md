# Plan de Pruebas Manuales - Página /stockrecibo

**Fecha de creación:** 2025-11-13
**Versión:** 1.0
**Componente bajo prueba:** StockreciboComponent
**Ruta:** `/stockrecibo`
**Rol de ejecución:** ADMIN
**Tipo de ejecución:** Automatizada por LLM con control de navegador

---

## 📋 TABLA DE CONTENIDOS

1. [Información General](#información-general)
2. [Precondiciones](#precondiciones)
3. [Casos de Prueba: Carga Inicial](#casos-de-prueba-carga-inicial)
4. [Casos de Prueba: Totalizadores](#casos-de-prueba-totalizadores)
5. [Casos de Prueba: Selección de Items](#casos-de-prueba-selección-de-items)
6. [Casos de Prueba: Filtros](#casos-de-prueba-filtros)
7. [Casos de Prueba: Paginación](#casos-de-prueba-paginación)
8. [Casos de Prueba: Selección de Columnas](#casos-de-prueba-selección-de-columnas)
9. [Casos de Prueba: Formato de Datos](#casos-de-prueba-formato-de-datos)
10. [Casos de Prueba: Ordenamiento](#casos-de-prueba-ordenamiento)
11. [Casos de Prueba: Edge Cases](#casos-de-prueba-edge-cases)
12. [Casos de Prueba: Responsividad](#casos-de-prueba-responsividad)
13. [Casos de Prueba: Performance](#casos-de-prueba-performance)
14. [Resumen de Ejecución](#resumen-de-ejecución)

---

## 📝 INFORMACIÓN GENERAL

### Descripción del Componente

El componente `/stockrecibo` muestra una lista de pedidos de stock que han sido **enviados** o **recibidos** por la sucursal actual. Incluye:

- Tabla de pedidos con múltiples columnas
- Sistema de totalizadores de costos dinámicos
- Filtros por columna y búsqueda global
- Paginación de resultados
- Selección única de items (radio buttons)
- Selector de columnas visibles

### Funcionalidades Principales

1. **Visualización de pedidos:** Muestra pedidos con estado "Enviado" o "Recibido"
2. **Totalizadores de costos:**
   - Total General: Suma de todos los items filtrados
   - Item Seleccionado: Costo del item actualmente seleccionado
3. **Cálculo automático:** Costo Total = Cantidad × Precio (redondeado a 2 decimales)
4. **Filtros avanzados:** Por columna y búsqueda global
5. **Selección única:** Radio buttons para seleccionar un item a la vez

### Columnas Disponibles

| Campo | Header | Descripción |
|-------|--------|-------------|
| `tipo` | Tipo | Tipo de pedido |
| `cantidad` | Cantidad | Cantidad solicitada |
| `precio` | Precio Unit. | Precio unitario (formato moneda) |
| `costo_total` | Costo Total | Cantidad × Precio (formato moneda) |
| `id_art` | Articulo | ID del artículo |
| `descripcion` | Descripcion | Descripción del artículo |
| `fecha_resuelto` | Fecha | Fecha de resolución (formato fecha) |
| `usuario_res` | Usuario | Usuario que resolvió |
| `observacion` | Observacion | Observaciones |
| `sucursalh` | A Sucursal | Sucursal destino (nombre transformado por pipe) |
| `estado` | Estado | Estado del pedido (Enviado/Recibido) |
| `id_num` | Id num. | ID numérico del pedido |
| `id_items` | Id items | ID de items del pedido |

---

## ⚙️ PRECONDICIONES

### Requisitos del Sistema

- ✅ Navegador web moderno (Chrome/Firefox/Edge)
- ✅ Acceso a la aplicación con rol ADMIN
- ✅ Sesión iniciada con sucursal asignada
- ✅ Base de datos con datos de prueba

### Estado Inicial Requerido

1. **Navegador abierto** en la URL de la aplicación
2. **Sesión activa** con rol ADMIN
3. **Página cargada** en `/stockrecibo`
4. **Sin filtros aplicados** (estado inicial limpio)

### Datos de Prueba Necesarios

La base de datos debe contener:

- **Mínimo 5 pedidos** con estado "Enviado"
- **Mínimo 5 pedidos** con estado "Recibido"
- **Al menos 15 pedidos totales** para probar paginación
- **Pedidos con diferentes valores** de cantidad y precio para validar cálculos
- **Pedidos con valores nulos** en campos opcionales (observacion, fecha_resuelto)

---

## 🧪 CASOS DE PRUEBA: CARGA INICIAL

### CP-001: Verificar Carga Correcta de la Página

**Objetivo:** Validar que la página se carga correctamente y muestra los componentes esperados.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. Navegar a `/stockrecibo`
2. Esperar 3 segundos para que cargue completamente
3. Tomar snapshot de la página
4. Verificar elementos visibles

**Datos de Prueba:**
- URL: `/stockrecibo`
- Tiempo máximo de carga: 5 segundos

**Resultado Esperado:**

- ✅ La página carga sin errores HTTP
- ✅ Se muestra el título "Documentos"
- ✅ Se muestra la tabla PrimeNG
- ✅ Se muestra el panel de totalizadores
- ✅ Se muestran los controles de filtro (búsqueda global y selector de columnas)
- ✅ No hay errores en la consola del navegador

**Criterios de Aceptación:**

```javascript
// Verificar elementos principales
assert(existe_elemento("h4.card-title", texto="Documentos"))
assert(existe_elemento("p-table"))
assert(existe_elemento(".card-header.bg-info", texto="Totalizadores de Costos"))
assert(existe_elemento("input[placeholder='Buscar..']"))
assert(existe_elemento("p-multiSelect"))
assert(consola_sin_errores() == true)
```

---

### CP-002: Verificar Carga de Datos

**Objetivo:** Validar que los datos se cargan desde el backend correctamente.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Verificar que la tabla no esté vacía
3. Contar el número de filas visibles
4. Verificar que solo se muestren pedidos con estado "Enviado" o "Recibido"

**Datos de Prueba:**
- Estados esperados: "Enviado", "Recibido"

**Resultado Esperado:**

- ✅ La tabla muestra al menos 1 fila de datos
- ✅ Los datos corresponden a la sucursal del usuario
- ✅ Todos los registros tienen estado "Enviado" O "Recibido"
- ✅ Los campos obligatorios no están vacíos (tipo, cantidad, precio, id_art, descripcion)

**Criterios de Aceptación:**

```javascript
// Verificar que hay datos
assert(cantidad_filas_tabla() >= 1)

// Verificar que todos los estados son correctos
para cada fila en tabla:
  estado = obtener_valor_columna(fila, "Estado")
  assert(estado == "Enviado" OR estado == "Recibido")

// Verificar campos obligatorios
para cada fila en tabla:
  assert(obtener_valor_columna(fila, "Cantidad") != null)
  assert(obtener_valor_columna(fila, "Precio Unit.") != null)
  assert(obtener_valor_columna(fila, "Costo Total") != null)
```

---

## 💰 CASOS DE PRUEBA: TOTALIZADORES

### CP-003: Verificar Visualización del Panel de Totalizadores

**Objetivo:** Validar que el panel de totalizadores se muestra correctamente con todos sus elementos.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Desplazarse hacia abajo hasta ver el panel de totalizadores
3. Tomar screenshot del panel
4. Verificar elementos del panel

**Datos de Prueba:**
- Elemento esperado: Panel con clase `.card.border-info`

**Resultado Esperado:**

- ✅ El panel de totalizadores es visible debajo de la tabla
- ✅ El header muestra el título "Totalizadores de Costos"
- ✅ Se muestra el badge "Dinámico" en verde
- ✅ Se muestran 2 secciones: "Total General" e "Item Seleccionado"
- ✅ La sección "Total General" muestra:
  - Cantidad de items
  - Costo total en formato moneda ARS
- ✅ La sección "Item Seleccionado" muestra:
  - Texto "Ningún item seleccionado" (estado inicial)

**Criterios de Aceptación:**

```javascript
// Verificar panel principal
assert(existe_elemento(".card.border-info"))
assert(existe_elemento(".card-header.bg-info", texto="Totalizadores de Costos"))
assert(existe_elemento(".badge.badge-success", texto="Dinámico"))

// Verificar sección Total General
assert(existe_elemento("h6", texto="Total General"))
assert(existe_elemento("strong", texto="Items:"))
assert(existe_elemento("strong", texto="Costo Total:"))

// Verificar sección Item Seleccionado
assert(existe_elemento("h6", texto="Item Seleccionado"))
assert(existe_elemento("em", texto="Ningún item seleccionado"))
```

---

### CP-004: Verificar Cálculo del Total General

**Objetivo:** Validar que el Total General se calcula correctamente sumando todos los items filtrados.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Leer el valor mostrado en "Total General" → "Costo Total"
3. Extraer todas las filas visibles de la tabla
4. Para cada fila, calcular: cantidad × precio
5. Sumar todos los valores calculados (redondeando a 2 decimales)
6. Comparar con el valor mostrado en "Total General"

**Datos de Prueba:**
- Leer dinámicamente de la tabla

**Resultado Esperado:**

- ✅ El "Total General" coincide con la suma manual de todos los costos individuales
- ✅ El cálculo tiene precisión de 2 decimales
- ✅ El formato muestra símbolo de moneda ARS ($)

**Criterios de Aceptación:**

```javascript
// Obtener total mostrado en UI
total_ui = obtener_texto(".text-primary", en_contexto="Total General")
total_ui_numero = parsear_moneda_a_numero(total_ui)

// Calcular total manualmente
total_calculado = 0
para cada fila en tabla:
  cantidad = obtener_valor_columna(fila, "Cantidad")
  precio = obtener_valor_columna(fila, "Precio Unit.")
  precio_numero = parsear_moneda_a_numero(precio)
  costo = Math.round((cantidad * precio_numero) * 100) / 100
  total_calculado += costo

total_calculado = Math.round(total_calculado * 100) / 100

// Comparar
assert(total_ui_numero == total_calculado,
       "Total General debe coincidir con la suma manual")
```

---

### CP-005: Verificar Cantidad de Items en Total General

**Objetivo:** Validar que la cantidad de items mostrada coincide con el número de filas en la tabla.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Leer el valor mostrado en "Total General" → "Items:"
3. Contar el número total de filas en la tabla (todas las páginas)
4. Comparar los valores

**Datos de Prueba:**
- Leer dinámicamente de la tabla

**Resultado Esperado:**

- ✅ La cantidad de items mostrada coincide con el número de filas en la tabla
- ✅ Si hay paginación, cuenta todos los items, no solo los de la página actual

**Criterios de Aceptación:**

```javascript
// Obtener cantidad mostrada
items_ui = obtener_texto("strong", texto_contiene="Items:", obtener_siguiente_texto=true)
items_ui_numero = parsear_a_numero(items_ui)

// Contar filas reales
// IMPORTANTE: pedidoItem contiene TODOS los registros (PrimeNG pagina en cliente)
cantidad_filas = cantidad_total_filas_tabla() // No solo página actual

assert(items_ui_numero == cantidad_filas,
       "Cantidad de items debe coincidir con el total de filas")
```

---

### CP-006: Verificar Item Seleccionado (Estado Inicial)

**Objetivo:** Validar que el panel "Item Seleccionado" muestra el mensaje correcto cuando no hay selección.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Verificar que no hay ningún item seleccionado en la tabla (no hay radio button marcado)
3. Leer el contenido de la sección "Item Seleccionado"

**Datos de Prueba:**
- Estado inicial: sin selección

**Resultado Esperado:**

- ✅ No hay radio button seleccionado en la tabla
- ✅ La sección "Item Seleccionado" tiene clase `alert-light` (gris claro)
- ✅ Se muestra el mensaje "Ningún item seleccionado" en cursiva y gris

**Criterios de Aceptación:**

```javascript
// Verificar que no hay selección
assert(no_hay_radio_button_seleccionado())

// Verificar mensaje de estado inicial
seccion_seleccionado = obtener_elemento(".col-md-6:last-child .alert")
assert(seccion_seleccionado.tiene_clase("alert-light"))
assert(existe_elemento("em", texto="Ningún item seleccionado"))
assert(NO existe_elemento("strong", texto="Art:"))
```

---

### CP-007: Verificar Cálculo del Costo del Item Seleccionado

**Objetivo:** Validar que al seleccionar un item, su costo se muestra correctamente.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Seleccionar la primera fila de la tabla (click en el radio button o en la fila)
3. Esperar 1 segundo para que se actualice la UI
4. Leer los datos de la fila seleccionada:
   - Cantidad
   - Precio
   - ID del artículo
   - Descripción
5. Leer el valor mostrado en "Item Seleccionado" → "Costo:"
6. Calcular manualmente: cantidad × precio (redondeado a 2 decimales)
7. Comparar con el valor mostrado

**Datos de Prueba:**
- Fila: Primera fila visible de la tabla

**Resultado Esperado:**

- ✅ El radio button de la primera fila está seleccionado
- ✅ La sección "Item Seleccionado" cambia a clase `alert-warning` (amarillo)
- ✅ Se muestran los detalles del item:
  - Art: [id_art] - [descripcion]
  - Cantidad: [cantidad] × Precio: [precio]
  - Costo: [cantidad × precio]
- ✅ El costo mostrado coincide con el cálculo manual
- ✅ El costo tiene formato de moneda ARS
- ✅ El costo es el mismo que en la columna "Costo Total" de la fila

**Criterios de Aceptación:**

```javascript
// Seleccionar primera fila
seleccionar_fila(1)
esperar(1000)

// Obtener datos de la fila seleccionada
cantidad = obtener_valor_columna(fila=1, "Cantidad")
precio_texto = obtener_valor_columna(fila=1, "Precio Unit.")
precio = parsear_moneda_a_numero(precio_texto)
costo_total_tabla = obtener_valor_columna(fila=1, "Costo Total")
costo_total_tabla_numero = parsear_moneda_a_numero(costo_total_tabla)
id_art = obtener_valor_columna(fila=1, "Articulo")
descripcion = obtener_valor_columna(fila=1, "Descripcion")

// Calcular costo esperado
costo_esperado = Math.round((cantidad * precio) * 100) / 100

// Verificar UI actualizada
assert(existe_radio_button_seleccionado(fila=1))
seccion = obtener_elemento(".col-md-6:last-child .alert")
assert(seccion.tiene_clase("alert-warning"))

// Verificar detalles mostrados
assert(existe_elemento("strong", texto="Art:", valor_siguiente=`${id_art} - ${descripcion}`))
assert(existe_elemento("strong", texto="Cantidad:", valor_contiene=cantidad))
assert(existe_elemento("strong", texto="Precio:", valor_contiene=precio_texto))

// Verificar costo mostrado
costo_ui = obtener_texto(".text-warning", en_contexto="Item Seleccionado")
costo_ui_numero = parsear_moneda_a_numero(costo_ui)

assert(costo_ui_numero == costo_esperado,
       "Costo del item seleccionado debe coincidir con el cálculo manual")
assert(costo_ui_numero == costo_total_tabla_numero,
       "Costo del item seleccionado debe coincidir con el de la tabla")
```

---

## ✅ CASOS DE PRUEBA: SELECCIÓN DE ITEMS

### CP-008: Verificar Selección Única con Radio Buttons

**Objetivo:** Validar que solo se puede seleccionar un item a la vez (selección única).

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Seleccionar la primera fila de la tabla
3. Esperar 1 segundo
4. Verificar que el radio button de la fila 1 está seleccionado
5. Seleccionar la tercera fila de la tabla
6. Esperar 1 segundo
7. Verificar que:
   - El radio button de la fila 3 está seleccionado
   - El radio button de la fila 1 ya NO está seleccionado
8. Verificar que la sección "Item Seleccionado" muestra los datos de la fila 3

**Datos de Prueba:**
- Fila 1: Primera fila de la tabla
- Fila 3: Tercera fila de la tabla

**Resultado Esperado:**

- ✅ Al seleccionar la fila 1, solo su radio button está marcado
- ✅ Al seleccionar la fila 3, el radio button de la fila 1 se desmarca automáticamente
- ✅ Solo hay un radio button seleccionado a la vez
- ✅ La sección "Item Seleccionado" se actualiza para mostrar los datos de la última fila seleccionada

**Criterios de Aceptación:**

```javascript
// Seleccionar fila 1
seleccionar_fila(1)
esperar(1000)

assert(radio_button_seleccionado(fila=1) == true)
assert(cantidad_radio_buttons_seleccionados() == 1)

// Guardar datos de fila 1 para verificar que cambien
datos_fila_1 = obtener_datos_item_seleccionado()

// Seleccionar fila 3
seleccionar_fila(3)
esperar(1000)

assert(radio_button_seleccionado(fila=1) == false, "Fila 1 debe estar deseleccionada")
assert(radio_button_seleccionado(fila=3) == true, "Fila 3 debe estar seleccionada")
assert(cantidad_radio_buttons_seleccionados() == 1, "Solo debe haber 1 radio button seleccionado")

// Verificar que los datos mostrados son de fila 3
datos_fila_3 = obtener_datos_item_seleccionado()
assert(datos_fila_3 != datos_fila_1, "Los datos deben cambiar al cambiar la selección")

// Verificar que coinciden con la fila 3 de la tabla
id_art_tabla = obtener_valor_columna(fila=3, "Articulo")
id_art_seleccionado = datos_fila_3.id_art
assert(id_art_tabla == id_art_seleccionado, "Los datos deben corresponder a la fila 3")
```

---

### CP-009: Verificar Deselección de Item

**Objetivo:** Validar el comportamiento al hacer click en un item ya seleccionado.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Seleccionar la segunda fila de la tabla
3. Esperar 1 segundo
4. Hacer click nuevamente en la misma fila (segunda fila)
5. Esperar 1 segundo
6. Verificar el estado de la selección

**Datos de Prueba:**
- Fila 2: Segunda fila de la tabla

**Resultado Esperado:**

**Nota:** PrimeNG con `selectionMode="single"` puede tener dos comportamientos:
- **Opción A:** Click en item seleccionado NO lo deselecciona (permanece seleccionado)
- **Opción B:** Click en item seleccionado lo deselecciona

Verificar el comportamiento real y documentarlo.

**Criterios de Aceptación:**

```javascript
// Seleccionar fila 2
seleccionar_fila(2)
esperar(1000)
assert(radio_button_seleccionado(fila=2) == true)

// Click nuevamente en fila 2
seleccionar_fila(2)
esperar(1000)

// Verificar comportamiento
// Si PrimeNG permite deselección:
if (radio_button_seleccionado(fila=2) == false) {
  assert(existe_elemento("em", texto="Ningún item seleccionado"),
         "Debe mostrar mensaje de sin selección")
  documentar("Comportamiento: PrimeNG permite deselección con segundo click")
}
// Si PrimeNG NO permite deselección:
else {
  assert(radio_button_seleccionado(fila=2) == true,
         "El item debe permanecer seleccionado")
  documentar("Comportamiento: PrimeNG NO permite deselección con segundo click")
}
```

---

### CP-010: Verificar Actualización de Totalizadores al Cambiar Selección

**Objetivo:** Validar que los totalizadores se actualizan correctamente al cambiar la selección.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Verificar el "Total General" (no debe cambiar con la selección)
3. Seleccionar la primera fila
4. Esperar 1 segundo
5. Leer el "Costo" del "Item Seleccionado"
6. Seleccionar la quinta fila
7. Esperar 1 segundo
8. Leer el nuevo "Costo" del "Item Seleccionado"
9. Verificar que el "Total General" NO cambió
10. Verificar que el "Costo" del "Item Seleccionado" SÍ cambió

**Datos de Prueba:**
- Fila 1: Primera fila
- Fila 5: Quinta fila

**Resultado Esperado:**

- ✅ El "Total General" permanece constante (no cambia con la selección)
- ✅ El "Costo" del "Item Seleccionado" cambia al seleccionar diferentes items
- ✅ El nuevo costo corresponde al de la fila seleccionada

**Criterios de Aceptación:**

```javascript
// Obtener Total General inicial
total_general_inicial = obtener_total_general()

// Seleccionar fila 1
seleccionar_fila(1)
esperar(1000)
costo_item_1 = obtener_costo_item_seleccionado()
costo_tabla_1 = obtener_valor_columna(fila=1, "Costo Total")

// Seleccionar fila 5
seleccionar_fila(5)
esperar(1000)
costo_item_5 = obtener_costo_item_seleccionado()
costo_tabla_5 = obtener_valor_columna(fila=5, "Costo Total")
total_general_final = obtener_total_general()

// Verificar que Total General NO cambió
assert(total_general_inicial == total_general_final,
       "Total General no debe cambiar con la selección")

// Verificar que Costo Item Seleccionado SÍ cambió
assert(costo_item_1 != costo_item_5,
       "Costo del item seleccionado debe cambiar")

// Verificar que los costos coinciden con la tabla
assert(parsear_moneda(costo_item_1) == parsear_moneda(costo_tabla_1))
assert(parsear_moneda(costo_item_5) == parsear_moneda(costo_tabla_5))
```

---

## 🔍 CASOS DE PRUEBA: FILTROS

### CP-011: Verificar Filtro Global (Búsqueda General)

**Objetivo:** Validar que el filtro de búsqueda global funciona correctamente.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Contar el número inicial de filas en la tabla
3. Leer el "Total General" inicial
4. Localizar el input con placeholder "Buscar.."
5. Escribir un término de búsqueda que exista en los datos (ej: un ID de artículo específico)
6. Esperar 2 segundos para que se aplique el filtro
7. Contar el nuevo número de filas en la tabla
8. Leer el nuevo "Total General"
9. Verificar que solo se muestran filas que contienen el término buscado
10. Limpiar el filtro (borrar texto)
11. Esperar 2 segundos
12. Verificar que vuelven a aparecer todas las filas

**Datos de Prueba:**
- Término de búsqueda: Obtener dinámicamente un valor de la columna "Articulo" o "Descripcion"

**Resultado Esperado:**

- ✅ Al escribir en el filtro global, la tabla se filtra automáticamente
- ✅ Solo se muestran filas que contienen el término buscado en cualquier columna
- ✅ El "Total General" se recalcula con los items filtrados
- ✅ La cantidad de "Items" se actualiza correctamente
- ✅ Al limpiar el filtro, vuelven a aparecer todas las filas
- ✅ El "Total General" vuelve al valor inicial

**Criterios de Aceptación:**

```javascript
// Guardar estado inicial
filas_iniciales = cantidad_filas_tabla()
total_inicial = obtener_total_general()
items_iniciales = obtener_cantidad_items()

// Obtener término de búsqueda de la primera fila
termino_busqueda = obtener_valor_columna(fila=1, "Articulo")

// Aplicar filtro global
input_busqueda = obtener_elemento("input[placeholder='Buscar..']")
escribir_en(input_busqueda, termino_busqueda)
esperar(2000)

// Verificar filtrado
filas_filtradas = cantidad_filas_tabla()
assert(filas_filtradas < filas_iniciales, "Debe haber menos filas después del filtro")
assert(filas_filtradas >= 1, "Debe haber al menos 1 fila que coincida")

// Verificar que todas las filas contienen el término
para cada fila en filas_visibles():
  contenido_fila = obtener_todo_el_contenido_de_fila(fila)
  assert(contenido_fila.contiene(termino_busqueda, ignorar_mayusculas=true),
         "Cada fila visible debe contener el término buscado")

// Verificar recalculo de totalizadores
total_filtrado = obtener_total_general()
items_filtrados = obtener_cantidad_items()
assert(total_filtrado <= total_inicial, "Total filtrado debe ser menor o igual al inicial")
assert(items_filtrados == filas_filtradas, "Items debe coincidir con filas filtradas")

// Limpiar filtro
limpiar(input_busqueda)
esperar(2000)

// Verificar que vuelve al estado inicial
filas_finales = cantidad_filas_tabla()
total_final = obtener_total_general()
assert(filas_finales == filas_iniciales, "Debe volver al número inicial de filas")
assert(total_final == total_inicial, "Debe volver al total inicial")
```

---

### CP-012: Verificar Filtro por Columna Específica

**Objetivo:** Validar que los filtros por columna funcionan correctamente.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Hacer click en el ícono de filtro (embudo) de la columna "Estado"
3. Esperar a que se abra el menú de filtro
4. Escribir "Enviado" en el campo de filtro
5. Hacer click en "Aplicar" o presionar Enter
6. Esperar 2 segundos
7. Verificar que solo se muestran filas con estado "Enviado"
8. Leer el "Total General" filtrado
9. Limpiar el filtro
10. Repetir el proceso para estado "Recibido"

**Datos de Prueba:**
- Valores a filtrar: "Enviado", "Recibido"

**Resultado Esperado:**

- ✅ El menú de filtro se abre correctamente
- ✅ Al filtrar por "Enviado", solo se muestran pedidos con ese estado
- ✅ Al filtrar por "Recibido", solo se muestran pedidos con ese estado
- ✅ El "Total General" se recalcula con los items filtrados
- ✅ Se puede limpiar el filtro y volver al estado sin filtrar

**Criterios de Aceptación:**

```javascript
// Obtener estado inicial
filas_iniciales = cantidad_filas_tabla()
total_inicial = obtener_total_general()

// Filtrar por "Enviado"
abrir_filtro_columna("Estado")
esperar(500)
escribir_en_filtro_columna("Estado", "Enviado")
aplicar_filtro_columna("Estado")
esperar(2000)

// Verificar que solo hay filas con estado "Enviado"
filas_enviado = cantidad_filas_tabla()
assert(filas_enviado >= 1, "Debe haber al menos 1 pedido Enviado")
para cada fila en filas_visibles():
  estado = obtener_valor_columna(fila, "Estado")
  assert(estado.trim() == "Enviado", "Solo deben aparecer pedidos Enviados")

// Verificar recalculo de total
total_enviado = obtener_total_general()
items_enviado = obtener_cantidad_items()
assert(items_enviado == filas_enviado)

// Limpiar filtro
limpiar_filtro_columna("Estado")
esperar(2000)
assert(cantidad_filas_tabla() == filas_iniciales, "Debe volver al estado inicial")

// Filtrar por "Recibido"
abrir_filtro_columna("Estado")
esperar(500)
escribir_en_filtro_columna("Estado", "Recibido")
aplicar_filtro_columna("Estado")
esperar(2000)

// Verificar que solo hay filas con estado "Recibido"
filas_recibido = cantidad_filas_tabla()
assert(filas_recibido >= 1, "Debe haber al menos 1 pedido Recibido")
para cada fila en filas_visibles():
  estado = obtener_valor_columna(fila, "Estado")
  assert(estado.trim() == "Recibido", "Solo deben aparecer pedidos Recibidos")

// Limpiar filtro
limpiar_filtro_columna("Estado")
esperar(2000)
```

---

### CP-013: Verificar Filtros Combinados (Global + Columna)

**Objetivo:** Validar que se pueden combinar el filtro global con filtros por columna.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Aplicar filtro por columna "Estado" = "Enviado"
3. Esperar 2 segundos
4. Contar filas y leer Total General
5. Aplicar filtro global con un término que exista en los datos filtrados
6. Esperar 2 segundos
7. Verificar que la tabla se filtra aún más
8. Verificar que los totalizadores se recalculan correctamente

**Datos de Prueba:**
- Filtro columna: Estado = "Enviado"
- Filtro global: Término existente en los datos filtrados

**Resultado Esperado:**

- ✅ Los filtros se aplican de forma acumulativa (AND)
- ✅ Solo se muestran filas que cumplen TODOS los filtros
- ✅ El "Total General" refleja solo los items que pasan todos los filtros
- ✅ Se pueden limpiar los filtros individualmente o todos a la vez

**Criterios de Aceptación:**

```javascript
// Aplicar filtro por columna
abrir_filtro_columna("Estado")
escribir_en_filtro_columna("Estado", "Enviado")
aplicar_filtro_columna("Estado")
esperar(2000)

filas_solo_estado = cantidad_filas_tabla()
total_solo_estado = obtener_total_general()

// Obtener un término de los datos filtrados
termino = obtener_valor_columna(fila=1, "Descripcion", palabras=2) // Primeras 2 palabras

// Aplicar filtro global
input_busqueda = obtener_elemento("input[placeholder='Buscar..']")
escribir_en(input_busqueda, termino)
esperar(2000)

// Verificar que hay menos filas
filas_combinado = cantidad_filas_tabla()
assert(filas_combinado <= filas_solo_estado,
       "Con filtros combinados debe haber igual o menos filas")

// Verificar que todas las filas cumplen ambos filtros
para cada fila en filas_visibles():
  estado = obtener_valor_columna(fila, "Estado")
  contenido = obtener_todo_el_contenido_de_fila(fila)
  assert(estado.trim() == "Enviado", "Debe ser Enviado")
  assert(contenido.contiene(termino, ignorar_mayusculas=true),
         "Debe contener el término buscado")

// Verificar totalizadores
total_combinado = obtener_total_general()
assert(total_combinado <= total_solo_estado,
       "Total con filtros combinados debe ser menor o igual")

// Limpiar filtros
limpiar(input_busqueda)
limpiar_filtro_columna("Estado")
esperar(2000)
```

---

### CP-014: Verificar Recalculo de Totalizadores al Filtrar

**Objetivo:** Validar que los totalizadores se recalculan correctamente cuando se aplican filtros.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Guardar el "Total General" y la cantidad de "Items" iniciales
3. Aplicar un filtro que reduzca los resultados a aproximadamente la mitad
4. Esperar 2 segundos
5. Leer el nuevo "Total General" y cantidad de "Items"
6. Calcular manualmente el total de las filas filtradas
7. Comparar con el valor mostrado
8. Verificar que coinciden

**Datos de Prueba:**
- Filtro: Elegir dinámicamente para reducir resultados

**Resultado Esperado:**

- ✅ El "Total General" se recalcula automáticamente al filtrar
- ✅ La cantidad de "Items" se actualiza correctamente
- ✅ El total mostrado coincide con la suma manual de las filas filtradas
- ✅ Si hay un item seleccionado y desaparece por el filtro, la selección se mantiene o se pierde según el comportamiento de PrimeNG

**Criterios de Aceptación:**

```javascript
// Estado inicial
total_inicial = obtener_total_general()
items_iniciales = obtener_cantidad_items()

// Aplicar filtro
input_busqueda = obtener_elemento("input[placeholder='Buscar..']")
escribir_en(input_busqueda, "PE") // Buscar tipo PE
esperar(2000)

// Obtener nuevo estado
filas_filtradas = cantidad_filas_tabla()
total_filtrado = obtener_total_general()
items_filtrados = obtener_cantidad_items()

// Verificar que cambió
assert(filas_filtradas < items_iniciales, "Debe haber menos filas")
assert(items_filtrados == filas_filtradas, "Items debe coincidir con filas")

// Calcular manualmente
total_calculado = 0
para cada fila en filas_visibles():
  cantidad = obtener_valor_columna(fila, "Cantidad")
  precio = parsear_moneda(obtener_valor_columna(fila, "Precio Unit."))
  costo = Math.round((cantidad * precio) * 100) / 100
  total_calculado += costo

total_calculado = Math.round(total_calculado * 100) / 100
total_filtrado_numero = parsear_moneda(total_filtrado)

assert(total_filtrado_numero == total_calculado,
       "Total filtrado debe coincidir con la suma manual")

// Limpiar
limpiar(input_busqueda)
esperar(2000)
```

---

## 📄 CASOS DE PRUEBA: PAGINACIÓN

### CP-015: Verificar Paginación de Resultados

**Objetivo:** Validar que la paginación funciona correctamente y muestra 10 items por página.

**Prioridad:** 🟡 ALTA

**Precondición:** Debe haber más de 10 pedidos en la base de datos.

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Verificar que se muestra el control de paginación en la parte inferior de la tabla
3. Contar las filas visibles en la página 1
4. Leer el indicador de paginación (ej: "Mostrando 1 a 10 de 25")
5. Hacer click en el botón "Siguiente" o en el número de página "2"
6. Esperar 1 segundo
7. Verificar que se muestran diferentes filas
8. Navegar de vuelta a la página 1
9. Verificar que se muestran las filas originales

**Datos de Prueba:**
- Tamaño de página configurado: 10 items

**Resultado Esperado:**

- ✅ La paginación está visible cuando hay más de 10 items
- ✅ La página 1 muestra los primeros 10 items
- ✅ Al navegar a la página 2, se muestran los siguientes items
- ✅ El indicador de paginación es correcto
- ✅ El "Total General" NO cambia al cambiar de página (suma todos los items, no solo la página actual)
- ✅ Los botones de navegación funcionan correctamente

**Criterios de Aceptación:**

```javascript
// Verificar paginación visible
total_items = obtener_cantidad_items()
if (total_items > 10) {
  assert(existe_elemento(".p-paginator"), "La paginación debe estar visible")

  // Página 1
  filas_pagina_1 = cantidad_filas_visibles_en_pagina()
  assert(filas_pagina_1 <= 10, "No debe haber más de 10 filas por página")

  // Guardar ID del primer item
  primer_item_pagina_1 = obtener_valor_columna(fila=1, "Id items")

  // Guardar Total General (no debe cambiar)
  total_general = obtener_total_general()

  // Navegar a página 2
  click_boton_siguiente_pagina()
  esperar(1000)

  // Verificar que cambió
  primer_item_pagina_2 = obtener_valor_columna(fila=1, "Id items")
  assert(primer_item_pagina_2 != primer_item_pagina_1,
         "Los items deben ser diferentes en página 2")

  // Verificar que Total General NO cambió
  total_general_pagina_2 = obtener_total_general()
  assert(total_general_pagina_2 == total_general,
         "Total General no debe cambiar con la paginación")

  // Volver a página 1
  click_boton_anterior_pagina()
  esperar(1000)

  // Verificar que volvió
  primer_item_vuelta = obtener_valor_columna(fila=1, "Id items")
  assert(primer_item_vuelta == primer_item_pagina_1,
         "Debe volver a mostrar los items originales")
}
else {
  documentar("NOTA: No hay suficientes datos para probar paginación (< 10 items)")
}
```

---

### CP-016: Verificar Total General con Paginación

**Objetivo:** Validar que el "Total General" suma TODOS los items, no solo los de la página actual.

**Prioridad:** 🔴 CRÍTICA

**Precondición:** Debe haber más de 10 pedidos en la base de datos.

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Verificar que hay más de 1 página de resultados
3. Estar en la página 1
4. Leer el "Total General"
5. Calcular manualmente el total SOLO de la página 1
6. Verificar que el "Total General" es MAYOR que el total de la página 1
7. Navegar por todas las páginas y sumar manualmente todos los costos
8. Comparar con el "Total General"

**Datos de Prueba:**
- Se requieren más de 10 pedidos

**Resultado Esperado:**

- ✅ El "Total General" suma TODOS los items filtrados, no solo la página actual
- ✅ El total calculado recorriendo todas las páginas coincide con el "Total General"
- ✅ La cantidad de "Items" refleja el total de items, no solo los de la página actual

**Criterios de Aceptación:**

```javascript
total_items = obtener_cantidad_items()

if (total_items > 10) {
  // Obtener Total General mostrado
  total_general_ui = parsear_moneda(obtener_total_general())

  // Calcular total de página 1 solamente
  total_pagina_1 = 0
  para cada fila en filas_visibles_en_pagina():
    costo = parsear_moneda(obtener_valor_columna(fila, "Costo Total"))
    total_pagina_1 += costo
  total_pagina_1 = Math.round(total_pagina_1 * 100) / 100

  // El Total General debe ser MAYOR que el de solo página 1
  assert(total_general_ui > total_pagina_1,
         "Total General debe incluir más que solo la página actual")

  // Calcular total de TODAS las páginas
  numero_paginas = obtener_numero_total_de_paginas()
  total_todas_paginas = 0

  para pagina de 1 hasta numero_paginas:
    ir_a_pagina(pagina)
    esperar(500)

    para cada fila en filas_visibles_en_pagina():
      costo = parsear_moneda(obtener_valor_columna(fila, "Costo Total"))
      total_todas_paginas += costo

  total_todas_paginas = Math.round(total_todas_paginas * 100) / 100

  // Comparar
  assert(total_general_ui == total_todas_paginas,
         "Total General debe coincidir con la suma de todas las páginas")

  // Volver a página 1
  ir_a_pagina(1)
}
```

---

## 📊 CASOS DE PRUEBA: SELECCIÓN DE COLUMNAS

### CP-017: Verificar Selector de Columnas Visibles

**Objetivo:** Validar que el selector de columnas permite mostrar/ocultar columnas dinámicamente.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Localizar el selector de columnas (`p-multiSelect`) en la parte superior de la tabla
3. Hacer click en el selector para abrirlo
4. Esperar a que se muestre la lista de columnas
5. Desmarcar 3 columnas (ej: "Observacion", "Usuario", "Fecha")
6. Cerrar el selector
7. Esperar 1 segundo
8. Verificar que las columnas desmarcadas ya no se muestran en la tabla
9. Volver a abrir el selector
10. Marcar las columnas de nuevo
11. Verificar que vuelven a aparecer

**Datos de Prueba:**
- Columnas a ocultar: "Observacion", "Usuario", "Fecha"

**Resultado Esperado:**

- ✅ El selector de columnas se abre correctamente
- ✅ Se muestran todas las columnas disponibles con checkboxes
- ✅ Al desmarcar columnas, estas desaparecen de la tabla
- ✅ Al marcar columnas, estas vuelven a aparecer
- ✅ Los datos de las filas siguen mostrándose correctamente con las columnas restantes
- ✅ Los totalizadores siguen funcionando correctamente

**Criterios de Aceptación:**

```javascript
// Contar columnas iniciales
columnas_iniciales = cantidad_columnas_tabla()

// Abrir selector
selector = obtener_elemento("p-multiSelect")
click(selector)
esperar(1000)

// Desmarcar 3 columnas
desmarcar_opcion_multiselect(selector, "Observacion")
desmarcar_opcion_multiselect(selector, "Usuario")
desmarcar_opcion_multiselect(selector, "Fecha")

// Cerrar selector (click fuera o Escape)
presionar_tecla("Escape")
esperar(1000)

// Verificar que se ocultaron
columnas_actuales = cantidad_columnas_tabla()
assert(columnas_actuales == columnas_iniciales - 3,
       "Deben haberse ocultado 3 columnas")

// Verificar que las columnas específicas no están
assert(NOT columna_visible("Observacion"))
assert(NOT columna_visible("Usuario"))
assert(NOT columna_visible("Fecha"))

// Verificar que otras columnas siguen visibles
assert(columna_visible("Cantidad"))
assert(columna_visible("Precio Unit."))
assert(columna_visible("Costo Total"))

// Volver a mostrar las columnas
click(selector)
esperar(500)
marcar_opcion_multiselect(selector, "Observacion")
marcar_opcion_multiselect(selector, "Usuario")
marcar_opcion_multiselect(selector, "Fecha")
presionar_tecla("Escape")
esperar(1000)

// Verificar que volvieron
columnas_finales = cantidad_columnas_tabla()
assert(columnas_finales == columnas_iniciales,
       "Debe volver al número inicial de columnas")
```

---

### CP-018: Verificar Totalizadores con Columnas Ocultas

**Objetivo:** Validar que ocultar la columna "Costo Total" no afecta el cálculo de los totalizadores.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Leer el "Total General" inicial
3. Verificar que la columna "Costo Total" está visible
4. Abrir el selector de columnas
5. Desmarcar la columna "Costo Total"
6. Cerrar el selector
7. Esperar 1 segundo
8. Verificar que la columna "Costo Total" ya no se muestra en la tabla
9. Verificar que el panel de totalizadores sigue visible
10. Leer el "Total General" con la columna oculta
11. Comparar con el valor inicial

**Datos de Prueba:**
- Columna a ocultar: "Costo Total"

**Resultado Esperado:**

- ✅ La columna "Costo Total" se puede ocultar
- ✅ El panel de totalizadores sigue visible y funcional
- ✅ El "Total General" sigue mostrando el mismo valor (los cálculos no dependen de la visibilidad de la columna)
- ✅ Al seleccionar un item, el costo del item seleccionado se sigue mostrando correctamente en el panel

**Criterios de Aceptación:**

```javascript
// Estado inicial
total_inicial = parsear_moneda(obtener_total_general())
assert(columna_visible("Costo Total") == true)

// Ocultar columna Costo Total
selector = obtener_elemento("p-multiSelect")
click(selector)
esperar(500)
desmarcar_opcion_multiselect(selector, "Costo Total")
presionar_tecla("Escape")
esperar(1000)

// Verificar que se ocultó
assert(columna_visible("Costo Total") == false,
       "La columna Costo Total debe estar oculta")

// Verificar que el panel de totalizadores sigue visible
assert(existe_elemento(".card.border-info"),
       "El panel de totalizadores debe seguir visible")

// Verificar que el Total General NO cambió
total_con_columna_oculta = parsear_moneda(obtener_total_general())
assert(total_con_columna_oculta == total_inicial,
       "Total General no debe cambiar al ocultar la columna")

// Seleccionar un item y verificar que el costo sigue mostrándose
seleccionar_fila(1)
esperar(1000)
costo_item = obtener_costo_item_seleccionado()
assert(costo_item > 0, "El costo del item seleccionado debe mostrarse")

// Volver a mostrar la columna
click(selector)
esperar(500)
marcar_opcion_multiselect(selector, "Costo Total")
presionar_tecla("Escape")
esperar(1000)

assert(columna_visible("Costo Total") == true)
```

---

## 📝 CASOS DE PRUEBA: FORMATO DE DATOS

### CP-019: Verificar Formato de Moneda (ARS)

**Objetivo:** Validar que los campos de precio y costo muestran el formato correcto de moneda argentina.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Para las primeras 5 filas de la tabla:
   - Leer el valor de la columna "Precio Unit."
   - Leer el valor de la columna "Costo Total"
   - Verificar el formato de ambos valores
3. Leer los valores del panel de totalizadores:
   - Costo Total del Total General
   - Costo del Item Seleccionado (si hay selección)
4. Verificar el formato de todos los valores monetarios

**Datos de Prueba:**
- Formato esperado: $ (símbolo de peso), separador de miles (punto o coma según configuración regional), 2 decimales

**Resultado Esperado:**

- ✅ Todos los campos de moneda muestran el símbolo $ (ARS)
- ✅ Los valores tienen exactamente 2 decimales
- ✅ Los separadores de miles son correctos (si aplica)
- ✅ No hay valores con más de 2 decimales
- ✅ No hay valores sin el símbolo de moneda

**Criterios de Aceptación:**

```javascript
// Función helper para validar formato de moneda ARS
function validar_formato_moneda_ars(valor_texto) {
  // Formato esperado: $1.234,56 o $1,234.56 dependiendo de la locale
  // Con pipe 'currency':'ARS':'symbol-narrow':'1.2-2'

  // Debe contener $
  assert(valor_texto.contiene("$"), "Debe contener símbolo $")

  // Extraer número
  numero_texto = valor_texto.replace(/[^0-9,.-]/g, '')

  // Contar decimales
  if (numero_texto.contiene(".") || numero_texto.contiene(",")) {
    partes = numero_texto.split(/[,.]/)
    parte_decimal = partes[partes.length - 1]
    assert(parte_decimal.length == 2, "Debe tener exactamente 2 decimales")
  }

  return true
}

// Verificar columnas de la tabla
para i de 1 hasta min(5, cantidad_filas_tabla()):
  precio = obtener_valor_columna(fila=i, "Precio Unit.")
  costo = obtener_valor_columna(fila=i, "Costo Total")

  assert(validar_formato_moneda_ars(precio),
         `Precio de fila ${i} debe tener formato correcto`)
  assert(validar_formato_moneda_ars(costo),
         `Costo de fila ${i} debe tener formato correcto`)

// Verificar totalizadores
total_general = obtener_total_general()
assert(validar_formato_moneda_ars(total_general),
       "Total General debe tener formato correcto")

// Si hay item seleccionado
if (hay_item_seleccionado()) {
  costo_seleccionado = obtener_costo_item_seleccionado()
  precio_seleccionado = obtener_texto("strong", texto="Precio:", obtener_siguiente=true)

  assert(validar_formato_moneda_ars(costo_seleccionado),
         "Costo del item seleccionado debe tener formato correcto")
  assert(validar_formato_moneda_ars(precio_seleccionado),
         "Precio del item seleccionado debe tener formato correcto")
}
```

---

### CP-020: Verificar Formato de Fechas

**Objetivo:** Validar que las fechas se muestran con el formato correcto.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Verificar que la columna "Fecha" está visible (si no, mostrarla con el selector)
3. Para las primeras 5 filas de la tabla:
   - Leer el valor de la columna "Fecha"
   - Verificar el formato
4. Verificar que las fechas son válidas y coherentes

**Datos de Prueba:**
- Formato esperado según el pipe `dateFormat:'yyyy-MM-dd'`: YYYY-MM-DD (ej: 2025-11-13)

**Resultado Esperado:**

- ✅ Todas las fechas tienen el formato YYYY-MM-DD
- ✅ Los valores de fecha son válidos (día entre 1-31, mes entre 1-12, año coherente)
- ✅ Las fechas null o vacías se manejan correctamente (no rompen la UI)

**Criterios de Aceptación:**

```javascript
// Asegurar que la columna Fecha está visible
if (NOT columna_visible("Fecha")) {
  selector = obtener_elemento("p-multiSelect")
  click(selector)
  esperar(500)
  marcar_opcion_multiselect(selector, "Fecha")
  presionar_tecla("Escape")
  esperar(1000)
}

// Función helper para validar formato de fecha
function validar_formato_fecha(valor_texto) {
  if (valor_texto == null || valor_texto == "" || valor_texto == "null") {
    return true // Fechas null son permitidas
  }

  // Formato esperado: YYYY-MM-DD
  regex = /^\d{4}-\d{2}-\d{2}$/
  assert(valor_texto.matches(regex),
         `Fecha debe tener formato YYYY-MM-DD, recibido: ${valor_texto}`)

  // Validar que es una fecha válida
  partes = valor_texto.split("-")
  año = parseInt(partes[0])
  mes = parseInt(partes[1])
  dia = parseInt(partes[2])

  assert(año >= 2000 && año <= 2100, "Año debe ser coherente")
  assert(mes >= 1 && mes <= 12, "Mes debe estar entre 1 y 12")
  assert(dia >= 1 && dia <= 31, "Día debe estar entre 1 y 31")

  return true
}

// Verificar fechas en la tabla
para i de 1 hasta min(5, cantidad_filas_tabla()):
  fecha = obtener_valor_columna(fila=i, "Fecha")
  assert(validar_formato_fecha(fecha),
         `Fecha de fila ${i} debe tener formato correcto`)
```

---

### CP-021: Verificar Transformación de Sucursal con Pipe

**Objetivo:** Validar que la columna "A Sucursal" muestra el nombre de la sucursal, no el número.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Verificar que la columna "A Sucursal" está visible
3. Leer los valores de la columna "A Sucursal" en las primeras 5 filas
4. Verificar que son nombres de texto, no números

**Datos de Prueba:**
- El pipe `sucursalNombre` transforma números en nombres:
  - 1 → "Casa Central" o similar
  - 2 → "Suc. Valle Viejo"
  - 3 → "Suc. Guemes"
  - 4 → "Deposito"

**Resultado Esperado:**

- ✅ La columna "A Sucursal" muestra nombres de texto
- ✅ NO se muestran números (1, 2, 3, 4)
- ✅ Los nombres son coherentes con las sucursales del sistema

**Criterios de Aceptación:**

```javascript
// Verificar que la columna está visible
assert(columna_visible("A Sucursal") == true)

// Verificar valores
para i de 1 hasta min(5, cantidad_filas_tabla()):
  sucursal = obtener_valor_columna(fila=i, "A Sucursal")

  // No debe ser un número
  assert(NOT es_solo_numero(sucursal),
         "Sucursal debe ser un nombre, no un número")

  // Debe contener texto (letras)
  assert(contiene_letras(sucursal),
         "Sucursal debe contener letras")

  // Longitud mínima (ej: "Suc. Valle Viejo" tiene al menos 5 caracteres)
  assert(sucursal.length >= 3,
         "Nombre de sucursal debe tener al menos 3 caracteres")

documentar(`Ejemplos de nombres de sucursal encontrados: ${sucursales_encontradas}`)
```

---

## 🔄 CASOS DE PRUEBA: ORDENAMIENTO

### CP-022: Verificar Ordenamiento por Columna

**Objetivo:** Validar que las columnas se pueden ordenar ascendente y descendentemente.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Hacer click en el header de la columna "Cantidad"
3. Esperar 1 segundo
4. Verificar que las filas están ordenadas por cantidad (ascendente)
5. Hacer click nuevamente en el header de "Cantidad"
6. Esperar 1 segundo
7. Verificar que las filas están ordenadas por cantidad (descendente)
8. Repetir con la columna "Precio Unit."

**Datos de Prueba:**
- Columnas a probar: "Cantidad", "Precio Unit."

**Resultado Esperado:**

- ✅ Al hacer click en el header, la tabla se ordena
- ✅ El ícono de ordenamiento cambia (flecha arriba/abajo)
- ✅ Los datos están correctamente ordenados
- ✅ El "Total General" NO cambia (sigue sumando los mismos items)
- ✅ El ordenamiento persiste al cambiar de página

**Criterios de Aceptación:**

```javascript
// Ordenar por Cantidad ascendente
header_cantidad = obtener_header_columna("Cantidad")
click(header_cantidad)
esperar(1500)

// Verificar orden ascendente
cantidades = []
para cada fila en filas_visibles_en_pagina():
  cantidad = obtener_valor_columna(fila, "Cantidad")
  cantidades.push(cantidad)

for i de 0 hasta cantidades.length - 2:
  assert(cantidades[i] <= cantidades[i+1],
         "Las cantidades deben estar en orden ascendente")

// Ordenar por Cantidad descendente
click(header_cantidad)
esperar(1500)

// Verificar orden descendente
cantidades_desc = []
para cada fila en filas_visibles_en_pagina():
  cantidad = obtener_valor_columna(fila, "Cantidad")
  cantidades_desc.push(cantidad)

for i de 0 hasta cantidades_desc.length - 2:
  assert(cantidades_desc[i] >= cantidades_desc[i+1],
         "Las cantidades deben estar en orden descendente")

// Verificar que Total General no cambió
total_despues_ordenar = obtener_total_general()
assert(total_despues_ordenar == total_inicial,
       "Total General no debe cambiar al ordenar")

// Repetir con Precio Unit.
header_precio = obtener_header_columna("Precio Unit.")
click(header_precio)
esperar(1500)

precios = []
para cada fila en filas_visibles_en_pagina():
  precio = parsear_moneda(obtener_valor_columna(fila, "Precio Unit."))
  precios.push(precio)

for i de 0 hasta precios.length - 2:
  assert(precios[i] <= precios[i+1],
         "Los precios deben estar en orden ascendente")
```

---

## ⚠️ CASOS DE PRUEBA: EDGE CASES

### CP-023: Verificar Manejo de Valores Nulos

**Objetivo:** Validar que los campos opcionales con valores nulos se manejan correctamente.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Buscar filas que tengan valores nulos en campos opcionales (observacion, fecha_resuelto, usuario_res)
3. Verificar que estos campos se muestran correctamente (vacíos o con texto "null")
4. Verificar que los totalizadores siguen funcionando
5. Seleccionar una fila con valores nulos
6. Verificar que el panel "Item Seleccionado" maneja correctamente los valores nulos

**Datos de Prueba:**
- Buscar filas con campos opcionales nulos

**Resultado Esperado:**

- ✅ Los campos nulos no rompen la UI
- ✅ Los campos nulos se muestran vacíos o con un valor por defecto (no "null" ni "undefined")
- ✅ Los totalizadores calculan correctamente incluso con campos nulos
- ✅ No hay errores en la consola

**Criterios de Aceptación:**

```javascript
// Buscar filas con valores potencialmente nulos
encontrado_nulo = false

para cada fila en todas_las_filas():
  observacion = obtener_valor_columna(fila, "Observacion")
  usuario = obtener_valor_columna(fila, "Usuario")

  if (observacion == "" || observacion == null || observacion == "null") {
    encontrado_nulo = true

    // Verificar que no muestra texto "null" o "undefined"
    assert(observacion != "null" && observacion != "undefined",
           "No debe mostrar texto 'null' o 'undefined'")

    // Seleccionar esta fila
    seleccionar_fila(fila.indice)
    esperar(1000)

    // Verificar que el panel Item Seleccionado funciona
    assert(existe_elemento(".alert-warning"),
           "Panel debe actualizarse aunque haya valores nulos")

    // Verificar que el costo se calcula correctamente
    costo = obtener_costo_item_seleccionado()
    assert(costo != null && costo >= 0,
           "El costo debe calcularse correctamente")

    break
  }

if (encontrado_nulo) {
  documentar("Se encontraron y probaron valores nulos correctamente")
}
else {
  documentar("ADVERTENCIA: No se encontraron valores nulos para probar este caso")
}

// Verificar que no hay errores en consola
assert(consola_sin_errores() == true)
```

---

### CP-024: Verificar Comportamiento con Tabla Vacía

**Objetivo:** Validar el comportamiento cuando no hay datos que mostrar.

**Prioridad:** 🟡 ALTA

**Precondición:** Aplicar un filtro que no devuelva resultados.

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Aplicar un filtro global que no coincida con ningún dato (ej: "ZZZZZZZZZZ")
3. Esperar 2 segundos
4. Verificar el estado de la tabla y los totalizadores

**Datos de Prueba:**
- Filtro que no coincide: "ZZZZZZZZZZ" o cualquier cadena que no exista

**Resultado Esperado:**

- ✅ La tabla muestra un mensaje de "No se encontraron resultados" o similar
- ✅ El "Total General" muestra:
  - Items: 0
  - Costo Total: $0,00
- ✅ La sección "Item Seleccionado" muestra "Ningún item seleccionado"
- ✅ No hay errores en la consola
- ✅ Al limpiar el filtro, vuelven a aparecer los datos

**Criterios de Aceptación:**

```javascript
// Aplicar filtro que no coincide
input_busqueda = obtener_elemento("input[placeholder='Buscar..']")
escribir_en(input_busqueda, "ZZZZZZZZZZ")
esperar(2000)

// Verificar tabla vacía
filas = cantidad_filas_tabla()
assert(filas == 0, "No debe haber filas visibles")

// PrimeNG debe mostrar mensaje de tabla vacía
assert(existe_elemento(".p-datatable-emptymessage") ||
       texto_visible_contiene("No se encontraron"),
       "Debe mostrar mensaje de tabla vacía")

// Verificar totalizadores con datos vacíos
items = obtener_cantidad_items()
total = parsear_moneda(obtener_total_general())

assert(items == 0, "Items debe ser 0")
assert(total == 0, "Total debe ser $0,00")

// Verificar Item Seleccionado
assert(existe_elemento("em", texto="Ningún item seleccionado"),
       "Debe mostrar mensaje de sin selección")

// Verificar que no hay errores
assert(consola_sin_errores() == true)

// Limpiar filtro y verificar que vuelven los datos
limpiar(input_busqueda)
esperar(2000)

filas_final = cantidad_filas_tabla()
assert(filas_final > 0, "Deben volver a aparecer las filas")
```

---

### CP-025: Verificar Precisión Decimal en Cálculos

**Objetivo:** Validar que los cálculos mantienen precisión de 2 decimales y no tienen errores de punto flotante.

**Prioridad:** 🔴 CRÍTICA

**Pasos:**

1. En la página `/stockrecibo`, esperar a que carguen los datos
2. Buscar una fila con precio que tenga decimales (ej: $10,99)
3. Verificar que el costo total de esa fila está correctamente redondeado
4. Sumar manualmente varios costos con decimales
5. Verificar que el Total General está correctamente redondeado

**Datos de Prueba:**
- Buscar filas con precios decimales como: $10,99 o $15,75

**Resultado Esperado:**

- ✅ Todos los costos tienen exactamente 2 decimales
- ✅ No hay errores de punto flotante (ej: 10.99 × 3 = 32.97, NO 32.96999999)
- ✅ El redondeo es correcto (estándar: redondear hacia arriba si >= 0.5)

**Criterios de Aceptación:**

```javascript
// Función para verificar precisión decimal
function verificar_precision_decimal(valor_texto) {
  numero = parsear_moneda_a_numero(valor_texto)

  // Convertir a string y contar decimales
  numero_str = numero.toString()
  if (numero_str.contiene(".")) {
    partes = numero_str.split(".")
    decimales = partes[1].length
    assert(decimales <= 2, `No debe tener más de 2 decimales: ${numero_str}`)
  }

  return true
}

// Buscar filas con precios decimales
filas_con_decimales = []

para cada fila en todas_las_filas():
  precio_texto = obtener_valor_columna(fila, "Precio Unit.")
  precio = parsear_moneda_a_numero(precio_texto)

  // Si tiene decimales
  if (precio.toString().contiene(".")) {
    cantidad = obtener_valor_columna(fila, "Cantidad")
    costo_texto = obtener_valor_columna(fila, "Costo Total")
    costo = parsear_moneda_a_numero(costo_texto)

    // Calcular manualmente
    costo_esperado = Math.round((cantidad * precio) * 100) / 100

    // Verificar precisión
    assert(verificar_precision_decimal(costo_texto),
           `Costo debe tener máximo 2 decimales`)

    // Verificar cálculo correcto
    assert(Math.abs(costo - costo_esperado) < 0.01,
           `Costo calculado (${costo}) debe ser igual al esperado (${costo_esperado})`)

    filas_con_decimales.push({
      cantidad: cantidad,
      precio: precio,
      costo_real: costo,
      costo_esperado: costo_esperado
    })

    if (filas_con_decimales.length >= 5) break
  }

// Verificar Total General
total_general = parsear_moneda_a_numero(obtener_total_general())
assert(verificar_precision_decimal(obtener_total_general()),
       "Total General debe tener máximo 2 decimales")

// Documentar casos probados
documentar(`Probados ${filas_con_decimales.length} casos con decimales`)
documentar(`Ejemplos: ${JSON.stringify(filas_con_decimales)}`)
```

---

## 📱 CASOS DE PRUEBA: RESPONSIVIDAD

### CP-026: Verificar Visualización en Mobile (< 768px)

**Objetivo:** Validar que la página es funcional en resoluciones móviles.

**Prioridad:** 🟢 MEDIA

**Pasos:**

1. Redimensionar el navegador a 375x667 (iPhone SE)
2. Navegar a `/stockrecibo`
3. Esperar a que carguen los datos
4. Verificar que todos los elementos son visibles y usables
5. Probar interacciones básicas:
   - Seleccionar un item
   - Aplicar filtro global
   - Ver el panel de totalizadores

**Datos de Prueba:**
- Resolución: 375x667 (iPhone SE)

**Resultado Esperado:**

- ✅ La página es usable en mobile
- ✅ El panel de totalizadores se adapta (las 2 columnas pasan a vertical)
- ✅ La tabla muestra scrolling horizontal si es necesario
- ✅ Los controles son lo suficientemente grandes para tocar
- ✅ No hay elementos cortados o superpuestos

**Criterios de Aceptación:**

```javascript
// Redimensionar a mobile
redimensionar_ventana(ancho=375, alto=667)
esperar(2000)

// Navegar a la página
navegar_a("/stockrecibo")
esperar(3000)

// Verificar carga
assert(existe_elemento(".card-title", texto="Documentos"))
assert(cantidad_filas_tabla() >= 1)

// Verificar que el panel de totalizadores es visible
scrollear_hasta_elemento(".card.border-info")
assert(elemento_visible(".card.border-info"))

// Verificar que las 2 columnas del panel están verticales
// En mobile, .col-md-6 debería ocupar 100% del ancho
ancho_seccion_total = obtener_ancho_elemento(".col-md-6:first-child")
ancho_ventana = 375
assert(ancho_seccion_total >= ancho_ventana * 0.9,
       "En mobile, las secciones deben ocupar casi todo el ancho")

// Probar selección de item
seleccionar_fila(1)
esperar(1000)
assert(existe_radio_button_seleccionado())

// Probar filtro global
scrollear_hacia_arriba()
input_busqueda = obtener_elemento("input[placeholder='Buscar..']")
click(input_busqueda) // Verificar que se puede hacer click
escribir_en(input_busqueda, "PE")
esperar(2000)
assert(cantidad_filas_tabla() >= 1)

// Verificar que no hay elementos cortados
assert(no_hay_elementos_fuera_de_vista())

// Volver a tamaño desktop
redimensionar_ventana(ancho=1920, alto=1080)
esperar(1000)
```

---

## ⚡ CASOS DE PRUEBA: PERFORMANCE

### CP-027: Verificar Tiempo de Carga Inicial

**Objetivo:** Validar que la página carga en un tiempo aceptable.

**Prioridad:** 🟡 ALTA

**Pasos:**

1. Navegar a `/stockrecibo`
2. Medir el tiempo desde la navegación hasta que la tabla muestra datos
3. Verificar que el tiempo es menor a 5 segundos

**Datos de Prueba:**
- Tiempo máximo aceptable: 5 segundos

**Resultado Esperado:**

- ✅ La página carga completamente en menos de 5 segundos
- ✅ Los datos aparecen en menos de 3 segundos después de la carga de la página
- ✅ Los totalizadores se calculan sin delay perceptible

**Criterios de Aceptación:**

```javascript
// Iniciar medición
tiempo_inicio = obtener_timestamp()

// Navegar
navegar_a("/stockrecibo")

// Esperar a que aparezcan los datos
esperar_hasta_que(existe_elemento("p-table tbody tr"), timeout=5000)

tiempo_carga = obtener_timestamp() - tiempo_inicio

// Verificar tiempo
assert(tiempo_carga < 5000,
       `La página debe cargar en menos de 5 segundos. Actual: ${tiempo_carga}ms`)

documentar(`Tiempo de carga: ${tiempo_carga}ms`)

// Verificar que los totalizadores están calculados
assert(existe_elemento(".text-primary", en_contexto="Total General"))
total = obtener_total_general()
assert(total != "$0,00" || cantidad_filas_tabla() == 0,
       "Los totalizadores deben estar calculados")
```

---

### CP-028: Verificar Performance con Muchos Datos

**Objetivo:** Validar que la página funciona correctamente con un gran volumen de datos (100+ registros).

**Prioridad:** 🟢 MEDIA

**Precondición:** La base de datos debe tener al menos 100 pedidos con estados "Enviado" o "Recibido".

**Pasos:**

1. Si no hay suficientes datos en la BD, skip este test
2. Navegar a `/stockrecibo`
3. Esperar a que carguen todos los datos
4. Medir el tiempo de carga
5. Aplicar un filtro y medir el tiempo de respuesta
6. Cambiar de página y medir el tiempo de respuesta
7. Seleccionar un item y medir el tiempo de actualización del panel

**Datos de Prueba:**
- Mínimo 100 pedidos en la BD
- Tiempos máximos aceptables:
  - Carga inicial: 5 segundos
  - Filtrado: 1 segundo
  - Cambio de página: 500ms
  - Selección: 500ms

**Resultado Esperado:**

- ✅ La página carga en menos de 5 segundos incluso con 100+ registros
- ✅ Los filtros responden en menos de 1 segundo
- ✅ La paginación es fluida (< 500ms)
- ✅ La selección actualiza el panel en < 500ms
- ✅ No hay lag perceptible en la UI

**Criterios de Aceptación:**

```javascript
// Verificar cantidad de datos
navegar_a("/stockrecibo")
esperar(5000)

total_items = obtener_cantidad_items()

if (total_items < 100) {
  skip("No hay suficientes datos para probar performance (< 100 items)")
}

documentar(`Probando con ${total_items} items`)

// 1. Medir tiempo de carga inicial
tiempo_carga = medir_tiempo_desde_inicio()
assert(tiempo_carga < 5000, `Carga debe ser < 5s. Actual: ${tiempo_carga}ms`)

// 2. Medir tiempo de filtrado
input_busqueda = obtener_elemento("input[placeholder='Buscar..']")
tiempo_inicio = obtener_timestamp()
escribir_en(input_busqueda, "PE")
esperar_hasta_que_se_actualice_tabla()
tiempo_filtrado = obtener_timestamp() - tiempo_inicio
assert(tiempo_filtrado < 1000, `Filtrado debe ser < 1s. Actual: ${tiempo_filtrado}ms`)

// Limpiar filtro
limpiar(input_busqueda)
esperar(1000)

// 3. Medir tiempo de cambio de página
if (obtener_numero_total_de_paginas() > 1) {
  tiempo_inicio = obtener_timestamp()
  click_boton_siguiente_pagina()
  esperar_hasta_que_se_actualice_tabla()
  tiempo_paginacion = obtener_timestamp() - tiempo_inicio
  assert(tiempo_paginacion < 500, `Paginación debe ser < 500ms. Actual: ${tiempo_paginacion}ms`)
}

// 4. Medir tiempo de selección
tiempo_inicio = obtener_timestamp()
seleccionar_fila(1)
esperar_hasta_que(existe_elemento(".alert-warning"))
tiempo_seleccion = obtener_timestamp() - tiempo_inicio
assert(tiempo_seleccion < 500, `Selección debe ser < 500ms. Actual: ${tiempo_seleccion}ms`)

documentar(`Performance OK con ${total_items} items:
  - Carga: ${tiempo_carga}ms
  - Filtrado: ${tiempo_filtrado}ms
  - Paginación: ${tiempo_paginacion}ms
  - Selección: ${tiempo_seleccion}ms
`)
```

---

## 📊 RESUMEN DE EJECUCIÓN

### Plantilla de Reporte

Al finalizar todas las pruebas, generar un reporte con el siguiente formato:

```markdown
# Reporte de Pruebas - Página /stockrecibo

**Fecha de ejecución:** [FECHA]
**Ejecutado por:** LLM Automated Testing
**Duración total:** [TIEMPO]

## Resumen General

- **Total de casos de prueba:** 28
- **Casos exitosos:** [NÚMERO] ✅
- **Casos fallidos:** [NÚMERO] ❌
- **Casos omitidos:** [NÚMERO] ⏭️
- **Tasa de éxito:** [PORCENTAJE]%

## Resultados por Categoría

### Carga Inicial (CP-001 a CP-002)
- ✅/❌ CP-001: Verificar Carga Correcta de la Página
- ✅/❌ CP-002: Verificar Carga de Datos

### Totalizadores (CP-003 a CP-007)
- ✅/❌ CP-003: Verificar Visualización del Panel de Totalizadores
- ✅/❌ CP-004: Verificar Cálculo del Total General
- ✅/❌ CP-005: Verificar Cantidad de Items en Total General
- ✅/❌ CP-006: Verificar Item Seleccionado (Estado Inicial)
- ✅/❌ CP-007: Verificar Cálculo del Costo del Item Seleccionado

### Selección de Items (CP-008 a CP-010)
- ✅/❌ CP-008: Verificar Selección Única con Radio Buttons
- ✅/❌ CP-009: Verificar Deselección de Item
- ✅/❌ CP-010: Verificar Actualización de Totalizadores al Cambiar Selección

### Filtros (CP-011 a CP-014)
- ✅/❌ CP-011: Verificar Filtro Global (Búsqueda General)
- ✅/❌ CP-012: Verificar Filtro por Columna Específica
- ✅/❌ CP-013: Verificar Filtros Combinados (Global + Columna)
- ✅/❌ CP-014: Verificar Recalculo de Totalizadores al Filtrar

### Paginación (CP-015 a CP-016)
- ✅/❌ CP-015: Verificar Paginación de Resultados
- ✅/❌ CP-016: Verificar Total General con Paginación

### Selección de Columnas (CP-017 a CP-018)
- ✅/❌ CP-017: Verificar Selector de Columnas Visibles
- ✅/❌ CP-018: Verificar Totalizadores con Columnas Ocultas

### Formato de Datos (CP-019 a CP-021)
- ✅/❌ CP-019: Verificar Formato de Moneda (ARS)
- ✅/❌ CP-020: Verificar Formato de Fechas
- ✅/❌ CP-021: Verificar Transformación de Sucursal con Pipe

### Ordenamiento (CP-022)
- ✅/❌ CP-022: Verificar Ordenamiento por Columna

### Edge Cases (CP-023 a CP-025)
- ✅/❌ CP-023: Verificar Manejo de Valores Nulos
- ✅/❌ CP-024: Verificar Comportamiento con Tabla Vacía
- ✅/❌ CP-025: Verificar Precisión Decimal en Cálculos

### Responsividad (CP-026)
- ✅/❌ CP-026: Verificar Visualización en Mobile (< 768px)

### Performance (CP-027 a CP-028)
- ✅/❌ CP-027: Verificar Tiempo de Carga Inicial
- ✅/❌ CP-028: Verificar Performance con Muchos Datos

## Errores Encontrados

[Lista detallada de errores encontrados durante la ejecución]

1. **Error 1:**
   - Caso de prueba: CP-XXX
   - Descripción: [Descripción del error]
   - Resultado esperado: [...]
   - Resultado real: [...]
   - Severidad: 🔴 CRÍTICA / 🟡 ALTA / 🟢 MEDIA / ⚪ BAJA

## Recomendaciones

[Recomendaciones basadas en los resultados de las pruebas]

## Screenshots

[Enlaces o referencias a screenshots capturados durante las pruebas]

## Logs de Consola

[Errores o warnings encontrados en la consola del navegador]
```

---

## 🎯 CRITERIOS DE ACEPTACIÓN GENERALES

Para que la página `/stockrecibo` sea considerada **APTA PARA PRODUCCIÓN**, debe cumplir:

### Criterios Obligatorios (🔴 CRÍTICOS)

- ✅ La página carga sin errores HTTP (CP-001)
- ✅ Los datos se cargan correctamente desde el backend (CP-002)
- ✅ El Total General se calcula correctamente (CP-004)
- ✅ El Costo del Item Seleccionado se calcula correctamente (CP-007)
- ✅ La selección única funciona correctamente (CP-008)
- ✅ Los filtros actualizan los totalizadores correctamente (CP-011, CP-014)
- ✅ El Total General incluye TODOS los items, no solo la página actual (CP-016)
- ✅ Los cálculos tienen precisión decimal correcta (CP-025)

### Criterios Importantes (🟡 ALTOS)

- ✅ El panel de totalizadores se muestra correctamente (CP-003)
- ✅ Los filtros por columna funcionan (CP-012)
- ✅ La paginación funciona correctamente (CP-015)
- ✅ El selector de columnas funciona (CP-017)
- ✅ Los formatos de moneda y fecha son correctos (CP-019, CP-020)

### Criterios Opcionales (🟢 MEDIOS)

- ✅ La responsividad mobile es aceptable (CP-026)
- ✅ La performance con muchos datos es aceptable (CP-028)

---

## 📝 NOTAS PARA EL EJECUTOR (LLM)

### Recomendaciones Generales

1. **Ejecutar en orden:** Los casos están ordenados de forma lógica. Ejecutarlos en secuencia ayuda a identificar problemas temprano.

2. **Tomar screenshots:** Capturar screenshots en los siguientes momentos:
   - Carga inicial de la página (CP-001)
   - Panel de totalizadores visible (CP-003)
   - Item seleccionado con datos (CP-007)
   - Tabla con filtros aplicados (CP-011)
   - Visualización mobile (CP-026)

3. **Documentar comportamientos inesperados:** Si algo no funciona como se describe, documentarlo detalladamente incluyendo:
   - ¿Qué se esperaba?
   - ¿Qué ocurrió realmente?
   - Errores en la consola
   - Estado de la aplicación

4. **Manejo de errores:** Si un caso de prueba crítico falla:
   - Documentar el error
   - Tomar screenshot
   - Capturar logs de consola
   - Continuar con el siguiente caso (no abortar toda la suite)

5. **Tiempos de espera:** Los tiempos especificados (1s, 2s, 3s) son orientativos. Ajustar según la velocidad de la aplicación.

### Herramientas Disponibles (Chrome DevTools MCP)

```javascript
// Navegación
mcp__chrome-devtools__navigate_page({url: "/stockrecibo"})

// Tomar snapshot
mcp__chrome-devtools__take_snapshot()

// Tomar screenshot
mcp__chrome-devtools__take_screenshot()

// Hacer click
mcp__chrome-devtools__click({uid: "[uid]"})

// Escribir texto
mcp__chrome-devtools__fill({uid: "[uid]", value: "texto"})

// Evaluar JavaScript
mcp__chrome-devtools__evaluate_script({
  function: "() => { return document.querySelector('...').textContent }"
})

// Esperar por elemento
mcp__chrome-devtools__wait_for({text: "Documentos", timeout: 5000})

// Ver consola
mcp__chrome-devtools__list_console_messages()
```

### Funciones Helper Sugeridas

```javascript
// Parsear moneda ARS a número
function parsear_moneda_a_numero(texto) {
  // "$1.234,56" → 1234.56
  return parseFloat(texto.replace(/[$\s.]/g, '').replace(',', '.'))
}

// Contar filas visibles
function cantidad_filas_tabla() {
  return document.querySelectorAll('p-table tbody tr').length
}

// Obtener Total General
function obtener_total_general() {
  return document.querySelector('.col-md-6 .alert-secondary .text-primary').textContent.trim()
}

// Verificar consola sin errores
function consola_sin_errores() {
  let logs = [obtener logs de consola]
  return !logs.some(log => log.type === 'error')
}
```

---

## 🏁 CONCLUSIÓN

Este plan de pruebas cubre exhaustivamente la funcionalidad de la página `/stockrecibo`, con énfasis en:

- ✅ **Totalizadores de costos** (característica principal)
- ✅ **Carga y visualización de datos**
- ✅ **Filtros y búsqueda**
- ✅ **Selección de items**
- ✅ **Formato de datos**
- ✅ **Edge cases y robustez**
- ✅ **Performance**

**Total de casos de prueba:** 28
**Tiempo estimado de ejecución:** 2-3 horas (automatizado)

**Estado del documento:** ✅ LISTO PARA EJECUTAR

---

**Fin del Documento**

**Versión:** 1.0
**Última actualización:** 2025-11-13
**Próxima revisión:** Después de la primera ejecución
