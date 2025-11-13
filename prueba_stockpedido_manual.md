# Plan de Pruebas Manual - StockPedido Component

**Fecha de creación:** 2025-11-13
**Versión:** 1.0
**Componente bajo prueba:** `/stockpedido`
**Rol de acceso:** ADMIN
**Tipo de ejecución:** Pruebas manuales ejecutadas por LLM con control de navegador

---

## 📋 INFORMACIÓN GENERAL

### Descripción del Componente

**StockPedidoComponent** es una página que permite la recepción de pedidos de stock solicitados por la sucursal actual. Filtra pedidos en estado "Solicitado" o "Solicitado-E" y muestra:

- Información del pedido (tipo, cantidad, precio, artículo, descripción)
- Sucursales de origen y destino
- Totalizadores de costos dinámicos
- Selección única de items (radio buttons)

### Funcionalidades Principales a Probar

1. **Visualización de datos:** Tabla con pedidos filtrados por estado
2. **Totalizadores dinámicos:**
   - Total General (todos los registros filtrados)
   - Costo del Item Seleccionado (selección única)
3. **Selección de items:** Radio buttons para selección única
4. **Filtrado:** Filtros por columna que recalculan totales
5. **Formato de datos:** Moneda (ARS), nombres de sucursales, fechas
6. **Columna calculada:** Costo Total = Cantidad × Precio

### Precondiciones Generales

- ✅ Acceso directo a la URL: `[BASE_URL]/stockpedido`
- ✅ Sesión iniciada con rol ADMIN
- ✅ Navegador web compatible (Chrome 90+, Firefox 88+, Edge 90+)
- ✅ Base de datos con datos de prueba disponibles

---

## 🎯 CASOS DE PRUEBA

---

## **CP-001: Verificar Carga Inicial de la Página**

### Objetivo
Verificar que la página `/stockpedido` carga correctamente y muestra todos los elementos de la interfaz.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- Navegador en la URL base de la aplicación
- Sesión activa con rol ADMIN

### Pasos de Ejecución

1. Navegar a la URL `/stockpedido`
2. Esperar a que la página cargue completamente
3. Verificar la presencia de los siguientes elementos:
   - Título de la página
   - Tabla principal con columnas
   - Selector de columnas (p-multiSelect)
   - Barra de búsqueda global
   - Panel de totalizadores (si hay datos)

### Datos de Prueba
```
URL: [BASE_URL]/stockpedido
```

### Resultados Esperados

| Elemento | Estado Esperado |
|----------|----------------|
| Página carga sin errores | ✅ Carga completa |
| Título visible | ✅ Presente |
| Tabla presente | ✅ Visible con estructura |
| Selector de columnas | ✅ Funcional |
| Sin errores en consola | ✅ 0 errores críticos |

### Criterios de Aceptación
- ✅ La página carga en menos de 5 segundos
- ✅ No hay errores visibles en la UI
- ✅ No hay errores en la consola del navegador (nivel ERROR)
- ✅ Todos los elementos principales están visibles

### Post-condiciones
- Página lista para interactuar

---

## **CP-002: Verificar Estructura de la Tabla**

### Objetivo
Validar que la tabla muestre todas las columnas configuradas correctamente.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- CP-001 completado exitosamente
- Datos de pedidos disponibles en la base de datos

### Pasos de Ejecución

1. Ubicar la tabla principal en la página
2. Verificar la presencia de las siguientes columnas (pueden no estar todas visibles por defecto):
   - ☑️ Tipo
   - ☑️ Cantidad
   - ☑️ Precio Unit.
   - ☑️ **Costo Total** (nueva columna)
   - ☑️ Articulo
   - ☑️ Descripcion
   - ☑️ Fecha
   - ☑️ Usuario
   - ☑️ Observacion
   - ☑️ De Sucursal (sucursald)
   - ☑️ A Sucursal (sucursalh)
   - ☑️ Estado
   - ☑️ Id num.
   - ☑️ Id items
3. Verificar que hay una columna adicional para radio buttons (selección)
4. Verificar encabezados de columna

### Datos de Prueba
```
Columnas esperadas: 14 columnas de datos + 1 columna de selección
```

### Resultados Esperados

| Columna | Visible | Formato Esperado |
|---------|---------|------------------|
| Radio Button | Sí | ☐ (círculo) |
| Tipo | Depende selector | Texto |
| Cantidad | Depende selector | Número entero |
| Precio Unit. | Depende selector | $XX,XX (ARS) |
| **Costo Total** | Depende selector | **$XX,XX (ARS)** |
| Articulo | Depende selector | Número ID |
| Descripcion | Depende selector | Texto |
| De Sucursal | Depende selector | Nombre (ej: "Casa Central") |
| A Sucursal | Depende selector | Nombre (ej: "Sucursal 2") |
| Estado | Depende selector | "Solicitado" o "Solicitado-E" |

### Criterios de Aceptación
- ✅ Todas las columnas configuradas están disponibles en el selector
- ✅ La columna "Costo Total" está presente
- ✅ Las columnas visibles muestran datos correctamente
- ✅ Los encabezados son legibles y descriptivos

### Post-condiciones
- Estructura de tabla validada

---

## **CP-003: Verificar Datos en la Tabla**

### Objetivo
Validar que la tabla muestra datos reales y que están filtrados correctamente.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- CP-002 completado exitosamente
- Base de datos con pedidos en estado "Solicitado" o "Solicitado-E"

### Pasos de Ejecución

1. Contar el número de filas visibles en la tabla
2. Verificar que hay al menos 1 fila de datos
3. Seleccionar una fila al azar (tomar nota de su `id_items`)
4. Verificar que todos los campos de esa fila tienen datos válidos:
   - Tipo: No vacío
   - Cantidad: Número > 0
   - Precio: Número > 0
   - Costo Total: Debe ser = Cantidad × Precio
   - Descripcion: No vacía
   - Estado: "Solicitado" o "Solicitado-E"
5. Verificar que NO hay pedidos con otros estados (ej: "Enviado", "Recibido", "Cancelado")

### Datos de Prueba
```
Estados válidos: "Solicitado", "Solicitado-E"
Estados NO válidos: "Enviado", "Recibido", "Cancelado", etc.
```

### Resultados Esperados

| Verificación | Resultado Esperado |
|--------------|-------------------|
| Número de filas | > 0 (al menos 1) |
| Todos los campos completos | ✅ Sí |
| Cantidad | Número positivo |
| Precio | Número positivo |
| Costo Total | = Cantidad × Precio (±0.01) |
| Estado | Solo "Solicitado" o "Solicitado-E" |

### Criterios de Aceptación
- ✅ La tabla muestra al menos 1 pedido
- ✅ Todos los pedidos tienen estado "Solicitado" o "Solicitado-E"
- ✅ No hay campos críticos vacíos (cantidad, precio, descripción)
- ✅ Los datos tienen sentido en el contexto del negocio

### Post-condiciones
- Datos validados y listos para pruebas de cálculo

---

## **CP-004: Verificar Formato de Moneda en Precio Unitario**

### Objetivo
Validar que la columna "Precio Unit." muestra el formato de moneda argentina (ARS) correctamente.

### Prioridad
🟡 ALTA

### Precondiciones
- CP-003 completado exitosamente
- Al menos 1 fila de datos visible

### Pasos de Ejecución

1. Ubicar la columna "Precio Unit." en la tabla
2. Seleccionar 3 filas diferentes
3. Para cada fila, verificar el formato del precio:
   - Símbolo de moneda: `$` (símbolo narrow de ARS)
   - Separador de miles: `.` (punto)
   - Separador de decimales: `,` (coma)
   - Decimales: Exactamente 2 dígitos
4. Ejemplos esperados:
   - `$150,00`
   - `$1.250,50`
   - `$10.999,99`

### Datos de Prueba
```
Formato esperado: currency:'ARS':'symbol-narrow':'1.2-2'
Patrón: $X.XXX,XX (miles con punto, decimales con coma, 2 decimales)
```

### Resultados Esperados

| Precio en BD | Formato Mostrado | Válido |
|--------------|------------------|--------|
| 150 | $150,00 | ✅ |
| 1250.5 | $1.250,50 | ✅ |
| 10999.99 | $10.999,99 | ✅ |
| 0.5 | $0,50 | ✅ |

### Criterios de Aceptación
- ✅ Todos los precios tienen el símbolo `$`
- ✅ Los números >= 1000 tienen separador de miles (punto)
- ✅ Todos los precios tienen exactamente 2 decimales
- ✅ El separador decimal es coma (`,`)

### Post-condiciones
- Formato de moneda validado

---

## **CP-005: Verificar Cálculo de Costo Total por Item**

### Objetivo
Validar que la columna "Costo Total" calcula correctamente el producto de Cantidad × Precio con precisión de 2 decimales.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- CP-003 completado exitosamente
- Al menos 3 filas de datos visibles

### Pasos de Ejecución

1. Seleccionar 3 filas diferentes de la tabla
2. Para cada fila:
   - Leer el valor de "Cantidad"
   - Leer el valor de "Precio Unit." (extraer número sin formato)
   - Leer el valor de "Costo Total" (extraer número sin formato)
   - Calcular manualmente: `Cantidad × Precio`
   - Comparar el resultado manual con el "Costo Total" mostrado
   - Verificar que la diferencia es <= 0.01 (tolerancia por redondeo)

### Datos de Prueba

```javascript
// Ejemplo de casos de prueba
Caso 1:
  Cantidad: 5
  Precio: 100.00
  Costo Total Esperado: 500.00

Caso 2:
  Cantidad: 3
  Precio: 10.99
  Costo Total Esperado: 32.97

Caso 3:
  Cantidad: 10
  Precio: 1.55
  Costo Total Esperado: 15.50
```

### Resultados Esperados

| Cantidad | Precio Unit. | Costo Total Calculado | Costo Total Mostrado | Diferencia | Válido |
|----------|--------------|----------------------|----------------------|------------|--------|
| 5 | $100,00 | $500,00 | $500,00 | 0.00 | ✅ |
| 3 | $10,99 | $32,97 | $32,97 | 0.00 | ✅ |
| 10 | $1,55 | $15,50 | $15,50 | 0.00 | ✅ |

### Criterios de Aceptación
- ✅ Todas las filas calculan el costo total correctamente
- ✅ La diferencia entre el cálculo manual y el mostrado es <= 0.01
- ✅ El costo total tiene formato de moneda (ARS)
- ✅ No hay valores NULL o "N/A" cuando cantidad y precio son válidos

### Post-condiciones
- Cálculo de costo total por item validado

---

## **CP-006: Verificar Pipe de Sucursales**

### Objetivo
Validar que las columnas "De Sucursal" y "A Sucursal" muestran nombres legibles en lugar de números ID.

### Prioridad
🟡 ALTA

### Precondiciones
- CP-003 completado exitosamente
- Sistema con múltiples sucursales configuradas

### Pasos de Ejecución

1. Ubicar las columnas "De Sucursal" (sucursald) y "A Sucursal" (sucursalh)
2. Seleccionar 3 filas diferentes
3. Para cada fila:
   - Leer el valor de "De Sucursal"
   - Leer el valor de "A Sucursal"
   - Verificar que son NOMBRES de sucursales, no números
   - Ejemplos válidos: "Casa Central", "Sucursal 2", "Depósito Principal"
   - Ejemplos NO válidos: "1", "2", "3"

### Datos de Prueba
```
Formato esperado: Texto descriptivo (nombre de sucursal)
Formato NO válido: Número (ID de sucursal)

Pipe aplicado: {{ sucursald | sucursalNombre }}
```

### Resultados Esperados

| Campo | Valor NO válido | Valor VÁLIDO |
|-------|----------------|--------------|
| De Sucursal | 1 | Casa Central |
| De Sucursal | 2 | Sucursal 2 |
| A Sucursal | 1 | Casa Central |
| A Sucursal | 3 | Depósito |

### Criterios de Aceptación
- ✅ Todas las sucursales muestran NOMBRES, no números
- ✅ Los nombres son descriptivos y legibles
- ✅ No hay sucursales mostradas como "undefined" o "null"
- ✅ El pipe `sucursalNombre` funciona correctamente

### Post-condiciones
- Pipe de sucursales validado

---

## **CP-007: Verificar Panel de Totalizadores - Visualización**

### Objetivo
Validar que el panel de totalizadores se muestra correctamente cuando hay datos.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- CP-003 completado exitosamente
- Al menos 1 pedido visible en la tabla

### Pasos de Ejecución

1. Desplazarse hacia abajo hasta ubicar el panel de totalizadores (debajo de la tabla)
2. Verificar que el panel existe y está visible
3. Verificar que el panel tiene:
   - **Header:** "Totalizadores de Costos" con badge "Dinámico"
   - **Sección izquierda:** "Total General"
   - **Sección derecha:** "Item Seleccionado"
4. Verificar los elementos del "Total General":
   - Título: "Total General"
   - Subtítulo: "Todos los registros filtrados"
   - Etiqueta: "Items: [número]"
   - Etiqueta: "Costo Total: $[monto]"
5. Verificar los elementos del "Item Seleccionado":
   - Título: "Item Seleccionado"
   - Subtítulo: "Selección única con radio button"
   - Mensaje inicial: "Ningún item seleccionado" (si no hay selección)

### Datos de Prueba
```
Estructura esperada:
┌─────────────────────────────────────────┐
│ 🧮 Totalizadores de Costos [Dinámico]  │
├─────────────────┬───────────────────────┤
│ Total General   │ Item Seleccionado     │
│ Items: X        │ Ningún item           │
│ Costo: $XX,XX   │ seleccionado          │
└─────────────────┴───────────────────────┘
```

### Resultados Esperados

| Elemento | Estado Esperado |
|----------|----------------|
| Panel visible | ✅ Sí |
| Header con título | ✅ "Totalizadores de Costos" |
| Badge "Dinámico" | ✅ Verde, visible |
| Sección "Total General" | ✅ Visible con datos |
| Sección "Item Seleccionado" | ✅ Visible |
| Formato de moneda | ✅ $XX,XX (ARS) |
| Colores de sección | ✅ Gris (general), Gris claro (selección) |

### Criterios de Aceptación
- ✅ El panel de totalizadores está visible
- ✅ Tiene diseño de card con borde azul (border-info)
- ✅ Header es azul con texto blanco
- ✅ Badge "Dinámico" es verde
- ✅ Las dos secciones están presentes
- ✅ El mensaje inicial es "Ningún item seleccionado"

### Post-condiciones
- Panel de totalizadores visible y estructurado

---

## **CP-008: Verificar Cálculo de Total General**

### Objetivo
Validar que el "Total General" suma correctamente TODOS los costos totales de los items filtrados.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- CP-007 completado exitosamente
- Al menos 3 pedidos visibles en la tabla

### Pasos de Ejecución

1. Ubicar el panel de totalizadores
2. Leer el valor de "Items" en la sección "Total General"
3. Verificar que coincide con el número de filas en la tabla
4. Leer el valor de "Costo Total" en la sección "Total General" (extraer número sin formato)
5. **Cálculo manual:**
   - Para cada fila visible en la tabla:
     - Extraer el valor de "Costo Total"
     - Sumar todos los valores
   - Comparar la suma manual con el "Costo Total" del panel
6. Verificar que la diferencia es <= 0.01 (tolerancia por redondeo)

### Datos de Prueba

```javascript
// Ejemplo con 3 items
Item 1: Cantidad=5,  Precio=$100.00 → Costo=$500.00
Item 2: Cantidad=3,  Precio=$10.99  → Costo=$32.97
Item 3: Cantidad=10, Precio=$1.55   → Costo=$15.50

Total General Esperado:
Items: 3
Costo Total: $548.47
```

### Resultados Esperados

| Métrica | Valor Esperado | Valor Mostrado | Válido |
|---------|---------------|----------------|--------|
| Items | 3 | 3 | ✅ |
| Suma manual | $548.47 | $548.47 | ✅ |
| Diferencia | <= 0.01 | 0.00 | ✅ |
| Formato | $XXX,XX | $548,47 | ✅ |

### Criterios de Aceptación
- ✅ El conteo de items coincide con las filas de la tabla
- ✅ El total general es la suma exacta de todos los costos totales
- ✅ La diferencia entre cálculo manual y mostrado es <= 0.01
- ✅ El formato de moneda es correcto (ARS)
- ✅ El total se actualiza si cambian los datos

### Post-condiciones
- Cálculo de total general validado

---

## **CP-009: Verificar Selección Única de Item**

### Objetivo
Validar que el usuario puede seleccionar UN SOLO item usando radio buttons y que la selección se refleja en el panel de totalizadores.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- CP-007 completado exitosamente
- Al menos 2 pedidos visibles en la tabla

### Pasos de Ejecución

1. Ubicar la primera fila de la tabla
2. Hacer clic en el radio button (◯) de esa fila
3. Verificar que:
   - El radio button cambia a seleccionado (◉)
   - Solo hay UN radio button seleccionado en toda la tabla
   - La fila seleccionada tiene algún resaltado visual (opcional)
4. Leer los datos del item seleccionado:
   - ID Artículo
   - Descripción
   - Cantidad
   - Precio
   - Costo Total
5. Ubicar la sección "Item Seleccionado" del panel de totalizadores
6. Verificar que muestra:
   - "Art: [ID] - [Descripción]"
   - "Cantidad: [X] × Precio: $[XX,XX]"
   - "Costo: $[XX,XX]"
7. Verificar que el costo mostrado coincide con el costo total del item seleccionado

### Datos de Prueba

```javascript
// Item de ejemplo
ID Art: 12345
Descripción: "ACEITE MOBIL 10W40"
Cantidad: 5
Precio: $100.00
Costo Total: $500.00

Panel debe mostrar:
Art: 12345 - ACEITE MOBIL 10W40
Cantidad: 5 × Precio: $100,00
Costo: $500,00
```

### Resultados Esperados

| Verificación | Resultado Esperado |
|--------------|-------------------|
| Radio button seleccionado | ✅ Visible (◉) |
| Solo 1 item seleccionado | ✅ Sí |
| Sección cambia de color | ✅ Gris claro → Amarillo |
| Muestra datos del item | ✅ Completos |
| Costo coincide | ✅ Igual al item |
| Formato de moneda | ✅ Correcto |

### Criterios de Aceptación
- ✅ Solo se puede seleccionar UN item a la vez
- ✅ La sección "Item Seleccionado" cambia de gris (alert-light) a amarillo (alert-warning)
- ✅ Los datos mostrados coinciden con el item seleccionado
- ✅ El costo individual coincide exactamente con el costo total del item
- ✅ No hay errores en consola al seleccionar

### Post-condiciones
- Selección única funcionando correctamente

---

## **CP-010: Verificar Cambio de Selección**

### Objetivo
Validar que al cambiar la selección de un item a otro, el panel de totalizadores se actualiza correctamente.

### Prioridad
🟡 ALTA

### Precondiciones
- CP-009 completado exitosamente
- Al menos 3 pedidos visibles en la tabla
- 1 item ya seleccionado (del CP-009)

### Pasos de Ejecución

1. Verificar el estado actual:
   - Item X está seleccionado
   - Panel muestra datos del item X
   - Tomar nota del costo del item X
2. Hacer clic en el radio button de un item diferente (item Y)
3. Verificar que:
   - El item X se deselecciona (◯)
   - El item Y se selecciona (◉)
   - Solo hay UN radio button seleccionado
4. Verificar que el panel "Item Seleccionado" actualiza:
   - Descripción cambia a la del item Y
   - Cantidad y precio cambian a los del item Y
   - Costo cambia al costo del item Y
5. Verificar que el "Total General" NO cambia (debe ser el mismo)

### Datos de Prueba

```javascript
Item X (inicial):
  ID: 111, Desc: "FILTRO AIRE", Cant: 2, Precio: $50, Costo: $100

Item Y (nuevo):
  ID: 222, Desc: "FILTRO ACEITE", Cant: 5, Precio: $30, Costo: $150

Comportamiento esperado:
- Panel cambia de Item X → Item Y
- Total General NO cambia (suma de todos)
```

### Resultados Esperados

| Verificación | Antes | Después | Válido |
|--------------|-------|---------|--------|
| Item X seleccionado | ◉ | ◯ | ✅ |
| Item Y seleccionado | ◯ | ◉ | ✅ |
| Descripción panel | Item X | Item Y | ✅ |
| Costo panel | $100.00 | $150.00 | ✅ |
| Total General | $X,XXX.XX | $X,XXX.XX (sin cambio) | ✅ |

### Criterios de Aceptación
- ✅ Solo un item puede estar seleccionado a la vez
- ✅ El panel "Item Seleccionado" actualiza inmediatamente
- ✅ Los datos mostrados coinciden con el nuevo item seleccionado
- ✅ El "Total General" NO cambia al cambiar la selección
- ✅ No hay retrasos ni parpadeos en la actualización

### Post-condiciones
- Cambio de selección funciona correctamente

---

## **CP-011: Verificar Deselección de Item**

### Objetivo
Validar que al hacer clic en el radio button de un item ya seleccionado (o en ningún item), el panel vuelve al estado "Ningún item seleccionado".

### Prioridad
🟡 MEDIA

### Precondiciones
- CP-009 completado exitosamente
- 1 item seleccionado actualmente

### Pasos de Ejecución

1. Verificar estado actual: Item está seleccionado
2. **Nota:** PrimeNG radio buttons NO permiten deselección directa, pero verificar el comportamiento
3. Si la tabla tiene opción de limpiar selección:
   - Buscar botón "Limpiar" o "Deseleccionar"
   - Hacer clic en ese botón
4. Verificar que:
   - Ningún radio button está seleccionado
   - La sección "Item Seleccionado" vuelve a mostrar "Ningún item seleccionado"
   - La sección vuelve al color gris claro (alert-light)
   - No muestra datos de artículo, cantidad, precio

### Datos de Prueba

```javascript
Estado inicial:
  Item seleccionado: Sí
  Panel: Muestra datos

Estado final esperado:
  Item seleccionado: No
  Panel: "Ningún item seleccionado"
```

### Resultados Esperados

| Verificación | Resultado Esperado |
|--------------|-------------------|
| Radio button seleccionado | ◯ (ninguno) |
| Mensaje en panel | "Ningún item seleccionado" |
| Color de sección | Gris claro (alert-light) |
| Datos de item | No visibles |
| Costo en panel | No mostrado o $0.00 |

### Criterios de Aceptación
- ✅ La deselección funciona (si está implementada)
- ✅ El panel vuelve al estado inicial
- ✅ No hay datos residuales visibles
- ✅ El "Total General" NO cambia

### Post-condiciones
- Comportamiento de deselección validado

**Nota:** Si PrimeNG no permite deselección, este caso puede marcarse como "No Aplicable" pero debe documentarse el comportamiento.

---

## **CP-012: Verificar Filtrado por Búsqueda Global**

### Objetivo
Validar que el filtro de búsqueda global funciona correctamente y que los totalizadores se recalculan con los datos filtrados.

### Prioridad
🟡 ALTA

### Precondiciones
- CP-008 completado exitosamente
- Al menos 5 pedidos visibles en la tabla
- Pedidos con descripciones diferentes

### Pasos de Ejecución

1. Ubicar el campo de búsqueda global (generalmente arriba de la tabla)
2. Tomar nota del "Total General" inicial:
   - Items: X
   - Costo Total: $A,AAA.AA
3. Escribir una palabra clave en el campo de búsqueda (ej: "FILTRO")
4. Esperar a que la tabla filtre
5. Verificar que:
   - La tabla muestra solo items que contienen "FILTRO" en algún campo
   - El número de filas visibles es menor que antes
6. Leer el nuevo "Total General":
   - Items: Y (donde Y < X)
   - Costo Total: $B,BBB.BB (donde B < A)
7. Calcular manualmente la suma de los costos totales de las filas visibles
8. Verificar que el "Total General" coincide con la suma manual (±0.01)
9. Borrar el filtro y verificar que vuelven todos los items

### Datos de Prueba

```javascript
Estado inicial:
  Items: 10
  Costo Total: $1,500.00

Filtro aplicado: "FILTRO"
  Items esperados: 3 (solo items con "FILTRO" en descripción)
  Costo Total esperado: $450.00 (suma de esos 3 items)

Filtro borrado:
  Items: 10 (vuelve a todos)
  Costo Total: $1,500.00 (vuelve al total original)
```

### Resultados Esperados

| Estado | Items | Costo Total | Válido |
|--------|-------|-------------|--------|
| Inicial | 10 | $1.500,00 | ✅ |
| Filtrado | 3 | $450,00 | ✅ |
| Suma manual | 3 | $450,00 | ✅ |
| Filtro borrado | 10 | $1.500,00 | ✅ |

### Criterios de Aceptación
- ✅ El filtro funciona y reduce las filas visibles
- ✅ El "Total General" se recalcula automáticamente
- ✅ El total filtrado es correcto (suma de filas visibles)
- ✅ Al borrar el filtro, vuelve al estado inicial
- ✅ El listener `onFilter()` se ejecuta correctamente

### Post-condiciones
- Filtrado global funcional y totalizadores reactivos

---

## **CP-013: Verificar Filtrado por Columna**

### Objetivo
Validar que los filtros individuales por columna funcionan y que los totalizadores se recalculan correctamente.

### Prioridad
🟡 ALTA

### Precondiciones
- CP-008 completado exitosamente
- Al menos 5 pedidos con diferentes sucursales o estados

### Pasos de Ejecución

1. Ubicar una columna con filtro (ej: "Estado")
2. Tomar nota del "Total General" inicial
3. Aplicar un filtro en la columna:
   - Si es filtro de texto: escribir "Solicitado"
   - Si es dropdown: seleccionar "Solicitado"
4. Esperar a que la tabla filtre
5. Verificar que:
   - Solo se muestran items con ese valor en la columna
   - El "Total General" se actualiza
6. Calcular manualmente la suma de los items filtrados
7. Verificar que coincide con el total mostrado (±0.01)
8. Borrar el filtro y verificar que vuelve al estado inicial

### Datos de Prueba

```javascript
Columna a filtrar: "Estado"
Filtro: "Solicitado"

Estado inicial:
  Items: 15 (10 "Solicitado" + 5 "Solicitado-E")
  Costo Total: $2,000.00

Estado filtrado:
  Items esperados: 10 (solo "Solicitado")
  Costo Total esperado: $1,300.00 (suma de esos 10)
```

### Resultados Esperados

| Estado | Items | Costo Total | Válido |
|--------|-------|-------------|--------|
| Inicial | 15 | $2.000,00 | ✅ |
| Filtrado | 10 | $1.300,00 | ✅ |
| Suma manual | 10 | $1.300,00 | ✅ |
| Filtro borrado | 15 | $2.000,00 | ✅ |

### Criterios de Aceptación
- ✅ El filtro por columna funciona correctamente
- ✅ El "Total General" se recalcula automáticamente
- ✅ El total coincide con la suma de filas filtradas
- ✅ Al borrar el filtro, todo vuelve al estado inicial
- ✅ Se puede combinar con filtro global

### Post-condiciones
- Filtros por columna funcionales

---

## **CP-014: Verificar Paginación**

### Objetivo
Validar que la paginación funciona correctamente y que el "Total General" incluye TODOS los items, no solo los de la página actual.

### Prioridad
🟡 ALTA

### Precondiciones
- Más de 10 pedidos en la base de datos (para tener múltiples páginas)
- Paginación configurada (ej: 10 items por página)

### Pasos de Ejecución

1. Verificar que hay controles de paginación (botones o selector de página)
2. Verificar el número total de items (debería decir "Mostrando 1 a 10 de X")
3. Tomar nota del "Total General":
   - Items: X (debe ser el total, no 10)
   - Costo Total: $A,AAA.AA (debe ser la suma de TODOS)
4. Navegar a la página 2
5. Verificar que:
   - La tabla muestra diferentes items (11-20)
   - El "Total General" NO cambia (sigue siendo X items y $A,AAA.AA)
6. Navegar de vuelta a la página 1
7. Verificar que los datos vuelven a los items 1-10
8. Verificar que el "Total General" sigue siendo el mismo

### Datos de Prueba

```javascript
Total de items en BD: 25
Items por página: 10

Página 1:
  Items visibles: 1-10
  Total General: 25 items, $3,500.00

Página 2:
  Items visibles: 11-20
  Total General: 25 items, $3,500.00 (sin cambio)

Página 3:
  Items visibles: 21-25
  Total General: 25 items, $3,500.00 (sin cambio)
```

### Resultados Esperados

| Página | Items Visibles | Total General Items | Total General Costo | Válido |
|--------|---------------|---------------------|---------------------|--------|
| 1 | 1-10 | 25 | $3.500,00 | ✅ |
| 2 | 11-20 | 25 | $3.500,00 | ✅ |
| 3 | 21-25 | 25 | $3.500,00 | ✅ |

### Criterios de Aceptación
- ✅ La paginación funciona correctamente
- ✅ El "Total General" incluye TODOS los items (no solo la página actual)
- ✅ El conteo de items es correcto
- ✅ El costo total es la suma de TODOS los items
- ✅ Navegar entre páginas no altera el total

### Post-condiciones
- Paginación validada

**Nota Importante:** PrimeNG pagina en el cliente (todos los datos están cargados), por lo que el "Total General" debe incluir todos los items filtrados, no solo los de la página visible.

---

## **CP-015: Verificar Ordenamiento de Columnas**

### Objetivo
Validar que las columnas se pueden ordenar (ascendente/descendente) y que el "Total General" no cambia al ordenar.

### Prioridad
🟢 MEDIA

### Precondiciones
- CP-008 completado exitosamente
- Al menos 5 pedidos con diferentes valores de cantidad o precio

### Pasos de Ejecución

1. Tomar nota del "Total General" inicial
2. Hacer clic en el encabezado de la columna "Cantidad"
3. Verificar que:
   - Los items se ordenan por cantidad (ascendente o descendente)
   - El icono de ordenamiento cambia (↑ o ↓)
4. Hacer clic nuevamente en el mismo encabezado
5. Verificar que:
   - El orden se invierte
   - El icono cambia
6. Verificar que el "Total General" NO cambia (mismo número de items y costo)
7. Repetir con la columna "Precio" o "Costo Total"

### Datos de Prueba

```javascript
Total inicial: 10 items, $1,500.00

Orden por Cantidad (asc):
  Items: 10 (sin cambio)
  Costo: $1,500.00 (sin cambio)
  Primer item: Cantidad = 1
  Último item: Cantidad = 50

Orden por Cantidad (desc):
  Items: 10 (sin cambio)
  Costo: $1,500.00 (sin cambio)
  Primer item: Cantidad = 50
  Último item: Cantidad = 1
```

### Resultados Esperados

| Acción | Items | Costo Total | Orden Correcto | Válido |
|--------|-------|-------------|----------------|--------|
| Inicial | 10 | $1.500,00 | N/A | ✅ |
| Ordenar Cantidad ↑ | 10 | $1.500,00 | 1→50 | ✅ |
| Ordenar Cantidad ↓ | 10 | $1.500,00 | 50→1 | ✅ |

### Criterios de Aceptación
- ✅ Las columnas se pueden ordenar
- ✅ El orden funciona correctamente (asc/desc)
- ✅ El "Total General" NO cambia al ordenar
- ✅ Los iconos de ordenamiento son visibles y correctos

### Post-condiciones
- Ordenamiento funcional

---

## **CP-016: Verificar Selector de Columnas Visibles**

### Objetivo
Validar que el selector de columnas (p-multiSelect) permite mostrar/ocultar columnas dinámicamente.

### Prioridad
🟢 MEDIA

### Precondiciones
- CP-002 completado exitosamente

### Pasos de Ejecución

1. Ubicar el selector de columnas (generalmente un dropdown múltiple)
2. Abrir el selector
3. Verificar que muestra todas las columnas disponibles
4. Deseleccionar una columna (ej: "Observacion")
5. Cerrar el selector
6. Verificar que:
   - La columna "Observacion" ya no está visible en la tabla
   - Las demás columnas siguen visibles
   - El "Total General" NO cambia
7. Volver a abrir el selector
8. Seleccionar la columna nuevamente
9. Verificar que la columna vuelve a aparecer

### Datos de Prueba

```javascript
Columnas totales: 14
Columna a ocultar: "Observacion"

Estado inicial:
  Columnas visibles: 14
  "Observacion" visible: Sí

Estado modificado:
  Columnas visibles: 13
  "Observacion" visible: No

Estado restaurado:
  Columnas visibles: 14
  "Observacion" visible: Sí
```

### Resultados Esperados

| Acción | Columnas Visibles | "Observacion" Visible | Válido |
|--------|-------------------|----------------------|--------|
| Inicial | 14 | ✅ | ✅ |
| Ocultar | 13 | ❌ | ✅ |
| Restaurar | 14 | ✅ | ✅ |

### Criterios de Aceptación
- ✅ El selector de columnas funciona correctamente
- ✅ Las columnas se ocultan/muestran dinámicamente
- ✅ El "Total General" no se ve afectado
- ✅ Los datos en las columnas visibles siguen correctos

### Post-condiciones
- Selector de columnas funcional

---

## **CP-017: Verificar Formato de Fecha**

### Objetivo
Validar que la columna "Fecha" (fecha_resuelto) muestra el formato correcto de fecha.

### Prioridad
🟢 BAJA

### Precondiciones
- CP-003 completado exitosamente
- Al menos 1 item con fecha_resuelto no nula

### Pasos de Ejecución

1. Ubicar la columna "Fecha" en la tabla
2. Seleccionar una fila que tenga fecha (no nula)
3. Leer el valor de la fecha
4. Verificar el formato:
   - Patrón esperado: `yyyy-MM-dd`
   - Ejemplo válido: `2025-11-13`
   - Ejemplo NO válido: `13/11/2025`, `Nov 13, 2025`
5. Verificar que fechas nulas muestran algún indicador (ej: "-", "N/A", o vacío)

### Datos de Prueba

```javascript
Formato esperado: dateFormat:'yyyy-MM-dd'
Ejemplos válidos:
  - 2025-11-13
  - 2025-01-05
  - 2024-12-31
```

### Resultados Esperados

| Fecha en BD | Formato Mostrado | Válido |
|-------------|------------------|--------|
| 2025-11-13T10:30:00 | 2025-11-13 | ✅ |
| 2024-12-31T23:59:59 | 2024-12-31 | ✅ |
| null | - o N/A o vacío | ✅ |

### Criterios de Aceptación
- ✅ Las fechas tienen el formato `yyyy-MM-dd`
- ✅ Las fechas nulas no causan errores
- ✅ El pipe `dateFormat` funciona correctamente

### Post-condiciones
- Formato de fecha validado

---

## **CP-018: Verificar Responsive - Vista Mobile**

### Objetivo
Validar que la página funciona correctamente en dispositivos móviles (viewport < 768px).

### Prioridad
🟢 MEDIA

### Precondiciones
- CP-001 completado exitosamente
- Herramientas de desarrollador del navegador disponibles

### Pasos de Ejecución

1. Abrir las herramientas de desarrollador (F12)
2. Activar modo responsive (Ctrl+Shift+M)
3. Configurar viewport a 375x667 (iPhone SE)
4. Recargar la página
5. Verificar que:
   - La tabla es scrolleable horizontalmente (si es necesario)
   - El panel de totalizadores se adapta:
     - Las dos secciones se apilan verticalmente (en lugar de horizontal)
     - Los textos siguen legibles
   - Los botones y controles son clicables
   - No hay elementos que se salgan del viewport
6. Probar la funcionalidad básica:
   - Seleccionar un item
   - Ver que el panel se actualiza
   - Aplicar un filtro

### Datos de Prueba

```javascript
Viewports a probar:
  - Mobile: 375x667 (iPhone SE)
  - Tablet: 768x1024 (iPad)
  - Desktop: 1920x1080 (Full HD)

Breakpoint: 768px (según CSS)
```

### Resultados Esperados

| Viewport | Tabla Visible | Panel Adaptado | Funcionalidad OK | Válido |
|----------|---------------|----------------|------------------|--------|
| 375px | ✅ (scroll) | ✅ (vertical) | ✅ | ✅ |
| 768px | ✅ | ✅ | ✅ | ✅ |
| 1920px | ✅ | ✅ (horizontal) | ✅ | ✅ |

### Criterios de Aceptación
- ✅ La página es usable en mobile (< 768px)
- ✅ El panel de totalizadores se adapta correctamente
- ✅ Los textos son legibles
- ✅ La funcionalidad básica funciona

### Post-condiciones
- Responsive validado

---

## **CP-019: Verificar Consola del Navegador - Sin Errores**

### Objetivo
Validar que no hay errores críticos en la consola del navegador durante el uso normal.

### Prioridad
🔴 CRÍTICA

### Precondiciones
- CP-001 completado exitosamente

### Pasos de Ejecución

1. Abrir las herramientas de desarrollador (F12)
2. Ir a la pestaña "Console"
3. Limpiar la consola
4. Recargar la página
5. Esperar a que cargue completamente
6. Verificar que no hay errores (⛔) en la consola
7. Realizar las siguientes acciones y verificar la consola después de cada una:
   - Seleccionar un item
   - Cambiar la selección
   - Aplicar un filtro
   - Cambiar de página (si hay paginación)
   - Ordenar una columna
8. Anotar cualquier error, warning o log sospechoso

### Datos de Prueba

```javascript
Niveles de log a verificar:
  ⛔ Error: NO debe haber (CRÍTICO)
  ⚠️ Warning: Aceptable < 5 (revisar si son relevantes)
  ℹ️ Info: Aceptable (logs de debug)

Errores comunes a buscar:
  - TypeError
  - ReferenceError
  - HTTP 404/500
  - Angular errors
```

### Resultados Esperados

| Acción | Errores (⛔) | Warnings (⚠️) | Válido |
|--------|-------------|--------------|--------|
| Carga inicial | 0 | < 5 | ✅ |
| Seleccionar item | 0 | 0 | ✅ |
| Filtrar | 0 | 0 | ✅ |
| Paginar | 0 | 0 | ✅ |
| Ordenar | 0 | 0 | ✅ |

### Criterios de Aceptación
- ✅ No hay errores (⛔) en la consola
- ✅ Los warnings (⚠️) son menores y no críticos
- ✅ Los logs de info/debug no indican problemas

### Post-condiciones
- Consola sin errores críticos

---

## **CP-020: Verificar Performance - Tiempo de Carga**

### Objetivo
Validar que la página carga en un tiempo razonable y que las operaciones son rápidas.

### Prioridad
🟢 BAJA

### Precondiciones
- CP-001 completado exitosamente

### Pasos de Ejecución

1. Abrir las herramientas de desarrollador (F12)
2. Ir a la pestaña "Network"
3. Habilitar "Disable cache"
4. Recargar la página y medir:
   - Tiempo hasta "DOMContentLoaded"
   - Tiempo hasta "Load"
5. Ir a la pestaña "Performance"
6. Iniciar grabación
7. Realizar las siguientes acciones:
   - Seleccionar un item (medir tiempo de respuesta)
   - Aplicar un filtro (medir tiempo de respuesta)
8. Detener grabación
9. Analizar los tiempos

### Datos de Prueba

```javascript
Tiempos objetivo:
  - Carga inicial: < 5 segundos
  - Selección de item: < 100ms
  - Filtrado: < 500ms
  - Cálculo de totales: < 100ms

Items en tabla: 100 (caso normal)
```

### Resultados Esperados

| Métrica | Objetivo | Medido | Válido |
|---------|----------|--------|--------|
| Carga inicial | < 5s | ~3s | ✅ |
| Selección item | < 100ms | ~50ms | ✅ |
| Filtrado | < 500ms | ~200ms | ✅ |
| Recálculo totales | < 100ms | ~30ms | ✅ |

### Criterios de Aceptación
- ✅ La carga inicial es menor a 5 segundos
- ✅ Las interacciones son rápidas (< 500ms)
- ✅ No hay lag perceptible con 100 items
- ✅ Los totalizadores se recalculan instantáneamente

### Post-condiciones
- Performance validada

**Nota:** Si hay > 1000 items, considerar implementar lazy loading o paginación server-side.

---

## **CP-021: Verificar Precisión Decimal en Casos Límite**

### Objetivo
Validar que el cálculo de costos maneja correctamente casos con decimales complejos (problema de punto flotante de JavaScript).

### Prioridad
🟡 ALTA

### Precondiciones
- CP-005 completado exitosamente
- Capacidad de crear/modificar datos de prueba

### Pasos de Ejecución

1. Si es posible, crear o buscar items con los siguientes casos límite:
   - Caso 1: Cantidad=3, Precio=10.99 → Esperado: 32.97
   - Caso 2: Cantidad=10, Precio=0.1 → Esperado: 1.00
   - Caso 3: Cantidad=7, Precio=0.2 → Esperado: 1.40
   - Caso 4: Cantidad=100, Precio=0.01 → Esperado: 1.00
2. Para cada caso:
   - Ubicar el item en la tabla
   - Leer el valor de "Costo Total"
   - Verificar que es exactamente el esperado (sin errores de redondeo)
3. Seleccionar uno de estos items
4. Verificar que el panel "Item Seleccionado" muestra el costo correcto

### Datos de Prueba

```javascript
// Casos que pueden causar errores de punto flotante
Caso 1: 3 × 10.99 = 32.97 (JavaScript puede dar 32.97000000000001)
Caso 2: 10 × 0.1 = 1.00 (JavaScript puede dar 1.0000000000000001)
Caso 3: 7 × 0.2 = 1.40 (JavaScript puede dar 1.4000000000000001)

Solución implementada: Math.round((cantidad * precio) * 100) / 100
```

### Resultados Esperados

| Cantidad | Precio | Costo Esperado | Costo Mostrado | Diferencia | Válido |
|----------|--------|---------------|----------------|------------|--------|
| 3 | $10,99 | $32,97 | $32,97 | 0.00 | ✅ |
| 10 | $0,10 | $1,00 | $1,00 | 0.00 | ✅ |
| 7 | $0,20 | $1,40 | $1,40 | 0.00 | ✅ |
| 100 | $0,01 | $1,00 | $1,00 | 0.00 | ✅ |

### Criterios de Aceptación
- ✅ Todos los cálculos tienen precisión de 2 decimales exactos
- ✅ No hay errores de punto flotante visibles (ej: 32.97000000000001)
- ✅ El redondeo está implementado correctamente
- ✅ Los totales generales también son precisos

### Post-condiciones
- Precisión decimal validada

---

## **CP-022: Verificar Comportamiento con Tabla Vacía**

### Objetivo
Validar el comportamiento de la página cuando no hay pedidos que cumplan el filtro de estado.

### Prioridad
🟢 MEDIA

### Precondiciones
- Capacidad de acceder a la base de datos o modificar estados de pedidos
- Todos los pedidos tienen estados diferentes a "Solicitado" o "Solicitado-E"

### Pasos de Ejecución

1. Navegar a `/stockpedido`
2. Esperar a que cargue
3. Verificar que:
   - La tabla está vacía (sin filas de datos)
   - Hay un mensaje indicando "No hay datos" o "Sin resultados"
   - El panel de totalizadores NO está visible (por el `*ngIf`)
   - No hay errores en la consola

### Datos de Prueba

```javascript
Escenario: 0 pedidos con estado "Solicitado" o "Solicitado-E"

Estado esperado:
  - Tabla: vacía con mensaje
  - Panel totalizadores: oculto
  - Errores: 0
```

### Resultados Esperados

| Verificación | Resultado Esperado |
|--------------|-------------------|
| Tabla vacía | ✅ Sí |
| Mensaje "Sin datos" | ✅ Visible |
| Panel totalizadores | ❌ No visible |
| Errores en consola | 0 |

### Criterios de Aceptación
- ✅ La tabla muestra un mensaje apropiado cuando está vacía
- ✅ El panel de totalizadores NO se muestra (condición: `pedidoItem.length > 0`)
- ✅ No hay errores en la consola
- ✅ La página no se rompe

### Post-condiciones
- Comportamiento con datos vacíos validado

---

## **CP-023: Verificar Información Adicional del Panel**

### Objetivo
Validar que el panel de totalizadores muestra correctamente la información adicional (fórmula de cálculo).

### Prioridad
🟢 BAJA

### Precondiciones
- CP-007 completado exitosamente

### Pasos de Ejecución

1. Ubicar el panel de totalizadores
2. Desplazarse hasta la parte inferior del panel
3. Verificar que hay una sección de "Información Adicional"
4. Leer el texto
5. Verificar que contiene:
   - Icono de información (ℹ️ o fa-info-circle)
   - Texto: "Los costos se calculan automáticamente como:"
   - Fórmula en negrita: "Costo Total = Cantidad × Precio"
   - Aclaración: "(redondeado a 2 decimales)"

### Datos de Prueba

```javascript
Texto esperado:
"ℹ️ Los costos se calculan automáticamente como:
**Costo Total = Cantidad × Precio** (redondeado a 2 decimales)"
```

### Resultados Esperados

| Elemento | Presente | Formato Correcto |
|----------|----------|------------------|
| Icono info | ✅ | ✅ |
| Texto explicativo | ✅ | ✅ |
| Fórmula en negrita | ✅ | ✅ |
| Aclaración | ✅ | ✅ |

### Criterios de Aceptación
- ✅ La información adicional está visible
- ✅ El texto es claro y descriptivo
- ✅ La fórmula está en negrita
- ✅ El formato es legible

### Post-condiciones
- Información adicional validada

---

## 📊 RESUMEN DE CASOS DE PRUEBA

### Por Prioridad

| Prioridad | Cantidad | Casos |
|-----------|----------|-------|
| 🔴 CRÍTICA | 9 | CP-001, CP-002, CP-003, CP-005, CP-007, CP-008, CP-009, CP-019, CP-021 |
| 🟡 ALTA | 6 | CP-004, CP-006, CP-010, CP-012, CP-013, CP-014 |
| 🟢 MEDIA | 5 | CP-011, CP-015, CP-016, CP-018, CP-022 |
| 🟢 BAJA | 3 | CP-017, CP-020, CP-023 |

### Por Funcionalidad

| Funcionalidad | Casos | Total |
|---------------|-------|-------|
| **Carga y Estructura** | CP-001, CP-002, CP-003 | 3 |
| **Formato de Datos** | CP-004, CP-006, CP-017 | 3 |
| **Cálculo de Costos** | CP-005, CP-021 | 2 |
| **Panel de Totalizadores** | CP-007, CP-008, CP-023 | 3 |
| **Selección de Items** | CP-009, CP-010, CP-011 | 3 |
| **Filtrado y Búsqueda** | CP-012, CP-013 | 2 |
| **Paginación y Ordenamiento** | CP-014, CP-015 | 2 |
| **UI/UX** | CP-016, CP-018, CP-022 | 3 |
| **Calidad y Performance** | CP-019, CP-020 | 2 |

### Tiempo Estimado de Ejecución

| Tipo de Caso | Tiempo Promedio | Cantidad | Total |
|--------------|----------------|----------|-------|
| Críticos | 8 min | 9 | 72 min |
| Altos | 6 min | 6 | 36 min |
| Medios | 4 min | 5 | 20 min |
| Bajos | 3 min | 3 | 9 min |
| **TOTAL** | | **23** | **~137 min (2.3h)** |

---

## 🔧 INSTRUCCIONES PARA LLM EJECUTOR

### Configuración Inicial

```javascript
// URL base de la aplicación
const BASE_URL = "[DEFINIR_URL_BASE]"; // ej: http://localhost:4200

// Navegador y configuración
const BROWSER = "Chrome"; // Chrome, Firefox, Edge
const VIEWPORT_DEFAULT = { width: 1920, height: 1080 };
const TIMEOUT_DEFAULT = 10000; // 10 segundos

// Rol de acceso
const ROL = "ADMIN";
```

### Flujo de Ejecución Recomendado

1. **Preparación:**
   - Configurar navegador
   - Navegar a la URL base
   - Verificar sesión activa (ya debe estar logueado)

2. **Ejecución de Casos:**
   - Ejecutar en orden de prioridad: CRÍTICA → ALTA → MEDIA → BAJA
   - Si un caso CRÍTICO falla, detener y reportar
   - Si un caso ALTA/MEDIA/BAJA falla, marcar y continuar

3. **Reporte:**
   - Generar reporte con resultados de cada caso
   - Incluir screenshots de casos fallidos
   - Listar errores de consola detectados

### Comandos de Navegador Útiles

```javascript
// Tomar screenshot
await page.screenshot({ path: 'screenshot.png' });

// Esperar elemento
await page.waitForSelector('.p-table');

// Obtener texto
const text = await page.textContent('.alert-primary');

// Hacer clic
await page.click('p-tableRadioButton input[type="radio"]');

// Extraer número de string con formato de moneda
const extractNumber = (str) => {
  return parseFloat(str.replace(/[$.]/g, '').replace(',', '.'));
};

// Verificar consola
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', error => console.log('PAGE ERROR:', error));
```

### Criterios de Éxito Global

El componente `/stockpedido` se considera **APROBADO** si:

- ✅ Todos los casos CRÍTICOS pasan (9/9)
- ✅ Al menos 5/6 casos ALTOS pasan
- ✅ No hay errores críticos en consola
- ✅ Los totalizadores calculan correctamente
- ✅ La selección única funciona
- ✅ Los filtros recalculan los totales

El componente se considera **RECHAZADO** si:

- ❌ Cualquier caso CRÍTICO falla
- ❌ Los totalizadores no calculan correctamente
- ❌ Hay errores en consola que rompen funcionalidad
- ❌ La selección no funciona

---

## 📝 TEMPLATE DE REPORTE

```markdown
# Reporte de Pruebas - StockPedido Component

**Fecha:** [YYYY-MM-DD]
**Ejecutor:** [LLM/Humano]
**Versión del componente:** [Fase 2-3 completada]
**Navegador:** [Chrome/Firefox/Edge]
**URL base:** [URL]

## Resumen Ejecutivo

- **Total de casos ejecutados:** X/23
- **Casos exitosos:** X
- **Casos fallidos:** X
- **Casos no ejecutados:** X
- **Estado general:** [APROBADO/RECHAZADO/PARCIAL]

## Resultados por Caso

### CP-001: Verificar Carga Inicial de la Página
- **Estado:** [✅ PASS | ❌ FAIL | ⏭️ SKIP]
- **Tiempo de ejecución:** X min
- **Observaciones:** [descripción]
- **Screenshot:** [si aplica]

[Repetir para cada caso]

## Errores Detectados

| ID Error | Caso | Severidad | Descripción | Screenshot |
|----------|------|-----------|-------------|------------|
| E001 | CP-005 | CRÍTICA | Cálculo de costo total incorrecto | link |

## Recomendaciones

1. [Recomendación 1]
2. [Recomendación 2]

## Conclusión

[Descripción del estado general del componente]

**Firma:** [Ejecutor]
**Fecha:** [YYYY-MM-DD HH:MM]
```

---

## 📚 GLOSARIO

| Término | Definición |
|---------|------------|
| **StockPedido** | Componente de Angular para recepción de pedidos de stock |
| **Totalizadores** | Panel que muestra sumas y totales de costos |
| **Costo Total** | Cantidad × Precio (redondeado a 2 decimales) |
| **Total General** | Suma de todos los costos totales de items filtrados |
| **Item Seleccionado** | Item único seleccionado con radio button |
| **Selección única** | Solo se puede seleccionar un item a la vez |
| **PrimeNG** | Librería de componentes UI para Angular |
| **p-table** | Componente de tabla de PrimeNG |
| **Radio button** | Control de selección única (◯/◉) |
| **Pipe** | Transformador de datos en Angular (ej: currency, dateFormat) |
| **sucursalNombre** | Pipe que convierte ID de sucursal a nombre |

---

## 🔗 REFERENCIAS

- **Documento de implementación:** `implementacion_totalizadores_movstock2.md`
- **Estado actual:** `implementacion_totalizadores_movstock2_ESTADOACTUAL.md`
- **Interfaz PedidoItem:** `src/app/interfaces/pedidoItem.ts`
- **TotalizadoresService:** `src/app/services/totalizadores.service.ts`
- **Componente TypeScript:** `src/app/components/stockpedido/stockpedido.component.ts`
- **Componente HTML:** `src/app/components/stockpedido/stockpedido.component.html`

---

## 📋 CHECKLIST PRE-EJECUCIÓN

Antes de iniciar las pruebas, verificar:

- [ ] Navegador compatible instalado (Chrome 90+, Firefox 88+, Edge 90+)
- [ ] Acceso a la URL base de la aplicación
- [ ] Sesión iniciada con rol ADMIN
- [ ] Base de datos con datos de prueba disponibles
- [ ] Al menos 5 pedidos con estado "Solicitado" o "Solicitado-E"
- [ ] Herramientas de desarrollador disponibles (F12)
- [ ] Capacidad de tomar screenshots
- [ ] Tiempo disponible: ~2.5 horas

---

**Fin del Plan de Pruebas Manual**

**Versión:** 1.0
**Fecha de creación:** 2025-11-13
**Autor:** Claude Code
**Estado:** ✅ LISTO PARA EJECUCIÓN
