# GUÍA DE TESTING MANUAL - FASE 6
## LISTA-ALTAS CON PRIMENG LAZY LOADING

---

## 🎯 OBJETIVO

Esta guía te permitirá validar manualmente que la migración a PrimeNG DataTable funciona correctamente.

---

## ✅ PRUEBAS CRÍTICAS (MÍNIMO REQUERIDO)

### **PASO 1: Verificar que la Aplicación Carga**

1. Asegúrate de que el servidor backend esté corriendo
2. Asegúrate de que el servidor frontend esté corriendo (`ng serve`)
3. Navega a: `http://localhost:4200/lista-altas`

**✅ Resultado Esperado:**
- La página carga sin errores de consola
- Se muestra una tabla con PrimeNG
- Aparece el paginador en la parte inferior
- Se cargan datos de la base de datos

**❌ Si falla:**
- Verifica la consola de Chrome DevTools (F12)
- Verifica la pestaña Network para ver errores de API
- Verifica que el backend esté respondiendo

---

### **PASO 2: Verificar Paginación**

1. **Verifica que se carguen 50 registros inicialmente**
   - Cuenta las filas visibles (debe ser máximo 50)
   - Observa el texto del paginador: "Mostrando 1 a 50 de XXX registros"

2. **Navega a la página 2:**
   - Click en el botón "Siguiente" o en el número "2"

   **✅ Resultado Esperado:**
   - Se cargan los siguientes 50 registros
   - El texto cambia a "Mostrando 51 a 100 de XXX registros"
   - La URL en Network tab incluye `page=2`

3. **Cambia el número de registros por página:**
   - En el dropdown del paginador, selecciona "100"

   **✅ Resultado Esperado:**
   - Se recargan los datos mostrando 100 registros
   - El paginador se actualiza
   - La URL en Network tab incluye `limit=100`

**📊 Observa en Chrome DevTools → Network:**
- URL debe ser: `ObtenerAltasConCostos_get?page=X&limit=Y`
- Response debe tener: `{error: false, data: [...], total: XXX, page: X, limit: Y}`

---

### **PASO 3: Verificar Ordenamiento**

1. **Ordena por ID:**
   - Click en el header de la columna "ID"
   - La flecha debe cambiar a ↑ (ascendente)

   **✅ Resultado Esperado:**
   - Los datos se reordenan de menor a mayor ID
   - Se ve la flecha ↑ en el header

2. **Segundo click en ID:**
   - Click de nuevo en el header "ID"
   - La flecha debe cambiar a ↓ (descendente)

   **✅ Resultado Esperado:**
   - Los datos se reordenan de mayor a menor ID
   - Se ve la flecha ↓ en el header

3. **Ordena por Descripción:**
   - Click en el header "Producto"

   **✅ Resultado Esperado:**
   - Los datos se ordenan alfabéticamente A-Z
   - La flecha de ID desaparece
   - Aparece flecha en Producto

**📊 Observa en Chrome DevTools → Network:**
- URL debe incluir: `sortField=descripcion&sortOrder=ASC`

---

### **PASO 4: Verificar Filtros**

1. **Filtro de ID (numérico):**
   - Click en el ícono de filtro (embudo) en la columna ID
   - En el menú, selecciona "Equals"
   - Ingresa un ID que exista (por ejemplo: si ves un ID 12345, úsalo)
   - Click en "Apply" o presiona Enter

   **✅ Resultado Esperado:**
   - Solo se muestra el registro con ese ID
   - El total de registros cambia
   - El ícono de filtro se ve "activo" (resaltado)

2. **Filtro de Descripción (texto):**
   - Click en el ícono de filtro en la columna "Producto"
   - Ingresa una palabra que sepas que existe (ej: "MOTOR")
   - Asegúrate que el match mode sea "Contains"
   - Click en "Apply"

   **✅ Resultado Esperado:**
   - Solo se muestran productos que contengan "MOTOR"
   - El total de registros se reduce

3. **Limpiar filtros:**
   - Click en el ícono de filtro activo
   - Click en "Clear" o borra el texto

   **✅ Resultado Esperado:**
   - Todos los datos vuelven a aparecer
   - El total de registros vuelve al original

**📊 Observa en Chrome DevTools → Network:**
- URL debe incluir: `filter_id_num=12345&matchMode_id_num=equals`
- URL debe incluir: `filter_descripcion=MOTOR&matchMode_descripcion=contains`

---

### **PASO 5: Verificar Filtros Globales**

1. **Filtro por Sucursal:**
   - En la parte superior, cambia el dropdown de Sucursal
   - Selecciona una sucursal específica

   **✅ Resultado Esperado:**
   - Los datos se filtran por esa sucursal
   - La tabla se recarga

2. **Filtro por Estado:**
   - En el dropdown de Estado, selecciona "ALTA"

   **✅ Resultado Esperado:**
   - Solo se muestran registros con estado ALTA
   - Los badges verdes son los únicos visibles

**📊 Observa en Chrome DevTools → Network:**
- URL debe incluir: `sucursal=1&estado=ALTA`

---

### **PASO 6: Verificar Búsqueda Global**

1. En el campo de búsqueda en el caption de la tabla, escribe un ID o una palabra

   **✅ Resultado Esperado:**
   - La tabla filtra en tiempo real (con un pequeño delay de 500ms)
   - Busca en múltiples campos (ID, Descripción, Estado, Observación)

---

### **PASO 7: Verificar State Persistence**

1. **Aplica configuración:**
   - Ve a la página 3
   - Ordena por Descripción
   - Aplica un filtro

2. **Navega fuera:**
   - Click en otro enlace del menú (ej: Dashboard)

3. **Regresa:**
   - Click de nuevo en "Lista de Altas"

   **✅ Resultado Esperado:**
   - Regresa a la página 3
   - Mantiene el ordenamiento por Descripción
   - Mantiene los filtros aplicados

**📊 Verifica en Chrome DevTools → Application → Session Storage:**
- Debe existir clave: `lista-altas-state`
- Debe contener JSON con la configuración

---

### **PASO 8: Verificar UI/UX**

1. **Loading indicator:**
   - Observa cuando cambias de página
   - Debe aparecer un spinner y mensaje "Cargando..."

2. **Tabla vacía:**
   - Aplica un filtro que no devuelva resultados (ej: ID = 999999999)

   **✅ Resultado Esperado:**
   - Mensaje: "No se encontraron altas de existencias con los filtros seleccionados"

3. **Badges de estado:**
   - Verde (badge-success) para estado ALTA
   - Rojo (badge-danger) para estado Cancel-Alta

4. **Columnas congeladas:**
   - Haz scroll horizontal (si es necesario, reduce el ancho de la ventana)

   **✅ Resultado Esperado:**
   - La columna de checkbox (izquierda) permanece visible
   - La columna de Acciones (derecha) permanece visible

5. **Tooltips:**
   - Pasa el mouse sobre una descripción larga que esté truncada

   **✅ Resultado Esperado:**
   - Aparece tooltip con el texto completo

---

### **PASO 9: Verificar Acciones**

1. **Botón Ver Detalles:**
   - Click en el ícono del ojo

   **✅ Resultado Esperado:**
   - Se abre un modal con los detalles de la alta

2. **Selección múltiple:**
   - Marca 3 checkboxes de altas con estado ALTA

   **✅ Resultado Esperado:**
   - El contador muestra "Cancelar Seleccionadas (3)"

3. **Botón Actualizar:**
   - Click en el botón "Actualizar"

   **✅ Resultado Esperado:**
   - Los datos se recargan del servidor
   - Mantiene los filtros y la página actual

4. **Botón Excel:**
   - Click en el botón "Excel"

   **✅ Resultado Esperado:**
   - Se descarga un archivo .xlsx

---

### **PASO 10: Verificar Performance**

**Usa Chrome DevTools → Network:**

1. Refresca la página (Ctrl+R)
2. Observa el tiempo de carga del request `ObtenerAltasConCostos_get`

**✅ Resultado Esperado:**
- **Carga inicial:** < 500ms
- **Cambio de página:** < 300ms
- **Aplicar filtro:** < 500ms

**Comparación con tabla HTML anterior:**
- Antes: ~5000-10000ms (cargaba 10,000+ registros)
- Ahora: ~200-500ms (carga 50 registros)
- **Mejora:** 10x-50x más rápido ✅

---

## 📋 CHECKLIST RÁPIDO

Marca ✅ cuando completes cada prueba:

### Funcionalidad Básica
- [ ] La página carga sin errores
- [ ] Se muestran datos de la base de datos
- [ ] El paginador está visible
- [ ] Puedo navegar entre páginas

### Paginación
- [ ] Carga 50 registros por defecto
- [ ] Puedo cambiar a página 2, 3, etc.
- [ ] Puedo cambiar registros por página (10, 25, 50, 100, 200)
- [ ] El texto "Mostrando X a Y de Z" es correcto

### Ordenamiento
- [ ] Puedo ordenar por ID (ASC y DESC)
- [ ] Puedo ordenar por Descripción
- [ ] Puedo ordenar por Fecha
- [ ] La flecha de ordenamiento es visible

### Filtros por Columna
- [ ] Filtro de ID funciona (numérico)
- [ ] Filtro de Descripción funciona (texto)
- [ ] Filtro de Estado funciona
- [ ] Puedo limpiar filtros

### Filtros Globales
- [ ] Filtro por Sucursal funciona
- [ ] Filtro por Estado funciona

### Búsqueda Global
- [ ] La búsqueda filtra en múltiples campos
- [ ] Tiene delay de 500ms

### State Persistence
- [ ] Guarda la página actual
- [ ] Guarda el ordenamiento
- [ ] Guarda los filtros
- [ ] Restaura todo al volver

### UI/UX
- [ ] Loading indicator aparece durante carga
- [ ] Mensaje de tabla vacía cuando no hay datos
- [ ] Badges de estado tienen colores correctos
- [ ] Columnas congeladas funcionan
- [ ] Tooltips funcionan

### Acciones
- [x] Botón "Ver Detalles" abre modal ✅ **VERIFICADO**
- [ ] Checkboxes de selección funcionan
- [ ] Botón "Cancelar Seleccionadas" funciona
- [ ] Botón "Actualizar" recarga datos
- [x] Botón "Excel" descarga archivo ✅ **VERIFICADO**

### Performance
- [ ] Carga inicial < 500ms
- [ ] Cambio de página < 300ms
- [ ] Aplicar filtro < 500ms
- [ ] Mucho más rápido que antes (10x-50x)

---

## 🐛 SI ENCUENTRAS ERRORES

Anota lo siguiente:

1. **Descripción del error:**
   - ¿Qué esperabas que pasara?
   - ¿Qué pasó en realidad?

2. **Pasos para reproducir:**
   - Lista exacta de pasos

3. **Información técnica:**
   - Mensaje de error en consola (si hay)
   - Request/Response en Network tab
   - Screenshots si es posible

4. **Impacto:**
   - ¿Crítico, Medio, Bajo?
   - ¿Bloquea el uso?

---

## ✅ CRITERIO DE APROBACIÓN

La Fase 6 se considera **EXITOSA** si:

- ✅ **90%+ de las pruebas pasan** (mínimo 58 de 65 casos)
- ✅ **Todas las pruebas críticas pasan** (Pasos 1-5)
- ✅ **Performance es 10x más rápida** que antes
- ✅ **No hay errores críticos** en consola

---

## 📊 RESULTADOS ESPERADOS

Al terminar las pruebas, deberías poder confirmar:

1. ✅ **La paginación funciona perfectamente**
2. ✅ **Los filtros funcionan perfectamente**
3. ✅ **El ordenamiento funciona perfectamente**
4. ✅ **State persistence funciona**
5. ✅ **Performance mejoró drásticamente**
6. ✅ **UI/UX es profesional**
7. ✅ **No hay errores en consola**

---

## 🎯 PRÓXIMO PASO

Cuando completes las pruebas:

1. **Si TODO pasa:** Continúa con Fase 7 (Optimización)
2. **Si hay errores menores:** Documéntalos para Fase 7
3. **Si hay errores críticos:** Corrígelos antes de continuar

---

**Tiempo Estimado de Testing:** 30-45 minutos

**Buena suerte! 🚀**
