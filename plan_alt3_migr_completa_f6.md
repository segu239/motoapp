# FASE 6: TESTING Y VALIDACIÓN
## MIGRACIÓN COMPLETA DE LISTA-ALTAS A PRIMENG DATATABLE

**Estado:** 🚧 EN PROGRESO
**Fecha Inicio:** 2025-11-05
**Fecha Fin:** -
**Tiempo Estimado:** 2-3 horas
**Tiempo Real:** -

---

## 📋 OBJETIVOS DE LA FASE

Validar exhaustivamente la implementación completa de lazy loading en el componente lista-altas:

1. ✅ **Pruebas Funcionales:** Paginación, filtros, ordenamiento
2. ⏳ **Pruebas de UI/UX:** Interfaz, feedback visual, responsividad
3. ⏳ **Pruebas de Performance:** Tiempos de carga, optimización
4. ⏳ **Pruebas de State Persistence:** sessionStorage, restauración
5. ⏳ **Pruebas de Integración:** Backend ↔ Frontend
6. ⏳ **Pruebas de Edge Cases:** Límites, errores, casos extremos

---

## 🧪 PLAN DE PRUEBAS

### **CATEGORÍA 1: PRUEBAS FUNCIONALES**

#### **1.1. Paginación**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **F-01** | Carga inicial | 1. Navegar a /lista-altas | Muestra primera página (50 registros) con paginador | ⏳ |
| **F-02** | Cambiar a página 2 | 1. Click en "Siguiente" o "2" | Carga registros 51-100 del servidor | ⏳ |
| **F-03** | Cambiar a última página | 1. Click en "Última" | Carga última página con registros restantes | ⏳ |
| **F-04** | Regresar a primera página | 1. Click en "Primera" | Carga registros 1-50 | ⏳ |
| **F-05** | Cambiar registros por página a 10 | 1. Seleccionar "10" en dropdown | Recarga con 10 registros, total_pages actualizado | ⏳ |
| **F-06** | Cambiar registros por página a 100 | 1. Seleccionar "100" en dropdown | Recarga con 100 registros | ⏳ |
| **F-07** | Cambiar registros por página a 200 | 1. Seleccionar "200" en dropdown | Recarga con 200 registros | ⏳ |
| **F-08** | Input directo de página | 1. Escribir "5" en input de página | Navega a página 5 | ⏳ |
| **F-09** | Página inexistente | 1. Escribir "999999" en input | Muestra última página o mensaje | ⏳ |

#### **1.2. Ordenamiento**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **F-10** | Ordenar por ID ascendente | 1. Click en header "ID" | Ordena por id_num ASC, flecha ↑ | ⏳ |
| **F-11** | Ordenar por ID descendente | 1. Segundo click en header "ID" | Ordena por id_num DESC, flecha ↓ | ⏳ |
| **F-12** | Ordenar por Descripción ASC | 1. Click en header "Producto" | Ordena alfabéticamente A-Z | ⏳ |
| **F-13** | Ordenar por Fecha DESC | 1. Click en header "Fecha" | Ordena de más reciente a antigua | ⏳ |
| **F-14** | Ordenar por Cantidad | 1. Click en header "Cantidad" | Ordena numéricamente | ⏳ |
| **F-15** | Ordenar por Estado | 1. Click en header "Estado" | Ordena alfabéticamente (ALTA, Cancel-Alta) | ⏳ |
| **F-16** | Cambiar ordenamiento mientras filtrado | 1. Aplicar filtro<br>2. Cambiar ordenamiento | Mantiene filtro, cambia orden | ⏳ |
| **F-17** | Persistencia de ordenamiento | 1. Ordenar por columna<br>2. Navegar fuera<br>3. Regresar | Mantiene ordenamiento | ⏳ |

#### **1.3. Filtros Dinámicos por Columna**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **F-18** | Filtro ID - Equals | 1. Abrir filtro de ID<br>2. Seleccionar "Equals"<br>3. Ingresar "12345" | Muestra solo registros con id_num = 12345 | ⏳ |
| **F-19** | Filtro ID - Greater Than | 1. Abrir filtro de ID<br>2. Seleccionar "Greater Than"<br>3. Ingresar "10000" | Muestra registros con id_num > 10000 | ⏳ |
| **F-20** | Filtro Estado - Equals "ALTA" | 1. Abrir filtro de Estado<br>2. Ingresar "ALTA" | Muestra solo registros con estado = 'ALTA' | ⏳ |
| **F-21** | Filtro Descripción - Contains "MOTOR" | 1. Abrir filtro de Descripción<br>2. Seleccionar "Contains"<br>3. Ingresar "MOTOR" | Muestra registros que contienen "MOTOR" | ⏳ |
| **F-22** | Filtro Descripción - Starts With "ACEITE" | 1. Abrir filtro de Descripción<br>2. Seleccionar "Starts With"<br>3. Ingresar "ACEITE" | Muestra registros que empiezan con "ACEITE" | ⏳ |
| **F-23** | Filtro Cantidad - Equals 5 | 1. Abrir filtro de Cantidad<br>2. Seleccionar "Equals"<br>3. Ingresar "5" | Muestra registros con cantidad = 5 | ⏳ |
| **F-24** | Filtro Fecha - Is | 1. Abrir filtro de Fecha<br>2. Seleccionar fecha específica | Muestra registros de esa fecha | ⏳ |
| **F-25** | Filtro Fecha - After | 1. Abrir filtro de Fecha<br>2. Seleccionar "After"<br>3. Elegir fecha | Muestra registros después de esa fecha | ⏳ |
| **F-26** | Múltiples filtros simultáneos | 1. Filtrar Descripción = "MOTOR"<br>2. Filtrar Estado = "ALTA"<br>3. Filtrar Cantidad = 5 | Muestra registros que cumplen TODOS los filtros | ⏳ |
| **F-27** | Limpiar filtros | 1. Aplicar varios filtros<br>2. Limpiar cada uno | Restaura todos los datos | ⏳ |

#### **1.4. Búsqueda Global**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **F-28** | Búsqueda global por ID | 1. Ingresar "12345" en búsqueda global | Busca en id_num, descripción, estado, observación | ⏳ |
| **F-29** | Búsqueda global por descripción | 1. Ingresar "MOTOR" en búsqueda global | Encuentra en campo descripción | ⏳ |
| **F-30** | Búsqueda global vacía | 1. Limpiar búsqueda global | Restaura todos los datos | ⏳ |
| **F-31** | Búsqueda sin resultados | 1. Ingresar texto que no existe | Muestra mensaje "No se encontraron..." | ⏳ |

#### **1.5. Filtros Globales (Sucursal y Estado)**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **F-32** | Filtrar por Sucursal 1 | 1. Seleccionar "Sucursal 1" | Muestra solo altas de sucursal 1 | ⏳ |
| **F-33** | Filtrar por Estado "ALTA" | 1. Seleccionar "ALTA" | Muestra solo registros con estado ALTA | ⏳ |
| **F-34** | Filtrar por Estado "Cancel-Alta" | 1. Seleccionar "Cancel-Alta" | Muestra solo registros cancelados | ⏳ |
| **F-35** | Combinar filtros globales | 1. Sucursal 1<br>2. Estado ALTA | Muestra altas de sucursal 1 con estado ALTA | ⏳ |
| **F-36** | Cambiar filtro global durante paginación | 1. Ir a página 3<br>2. Cambiar sucursal | Vuelve a página 1 con nueva sucursal | ⏳ |

#### **1.6. Selección Múltiple y Cancelación**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **F-37** | Seleccionar una alta | 1. Click en checkbox de una alta | Checkbox marcado, contador = 1 | ⏳ |
| **F-38** | Seleccionar múltiples altas | 1. Click en 3 checkboxes | 3 checkboxes marcados, contador = 3 | ⏳ |
| **F-39** | Seleccionar todas (página actual) | 1. Click en checkbox del header | Todas las altas ACTIVAS seleccionadas | ⏳ |
| **F-40** | Deseleccionar todas | 1. Seleccionar todas<br>2. Click en checkbox del header | Todas deseleccionadas, contador = 0 | ⏳ |
| **F-41** | Checkbox deshabilitado para canceladas | 1. Ver alta cancelada | Checkbox no visible o deshabilitado | ⏳ |
| **F-42** | Cancelar altas seleccionadas | 1. Seleccionar 2 altas<br>2. Click "Cancelar Seleccionadas" | Modal de confirmación aparece | ⏳ |
| **F-43** | Confirmar cancelación múltiple | 1. Seleccionar altas<br>2. Cancelar<br>3. Confirmar | Altas cambian a estado "Cancel-Alta" | ⏳ |

#### **1.7. Botones de Acción**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **F-44** | Botón "Ver detalles" | 1. Click en ícono ojo | Modal con detalles completos de la alta | ⏳ |
| **F-45** | Botón "Cancelar" individual | 1. Click en ícono X de una alta | Modal de confirmación individual | ⏳ |
| **F-46** | Confirmar cancelación individual | 1. Cancelar<br>2. Confirmar | Alta cambia a "Cancel-Alta", checkbox desaparece | ⏳ |
| **F-47** | Botón Excel | 1. Click en botón "Excel" | Descarga archivo .xlsx con datos visibles | ⏳ |
| **F-48** | Botón Actualizar | 1. Click en botón "Actualizar" | Recarga datos del servidor, mantiene filtros | ⏳ |
| **F-49** | Botones deshabilitados durante carga | 1. Iniciar carga<br>2. Observar botones | Botones deshabilitados mientras loading = true | ⏳ |

---

### **CATEGORÍA 2: PRUEBAS DE UI/UX**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **U-01** | Loading indicator al cargar | 1. Navegar a lista-altas | Spinner visible, mensaje "Cargando..." | ⏳ |
| **U-02** | Tabla vacía | 1. Filtrar algo que no existe | Mensaje "No se encontraron altas..." | ⏳ |
| **U-03** | Hover sobre fila | 1. Pasar mouse sobre fila | Efecto visual de resaltado | ⏳ |
| **U-04** | Scroll horizontal - Columnas congeladas | 1. Hacer scroll horizontal | Checkbox y Acciones permanecen visibles | ⏳ |
| **U-05** | Badge verde para ALTA | 1. Ver registro con estado ALTA | Badge verde (badge-success) | ⏳ |
| **U-06** | Badge rojo para Cancel-Alta | 1. Ver registro cancelado | Badge rojo (badge-danger) | ⏳ |
| **U-07** | Badge dinámico (tipo cálculo) | 1. Ver registro con tipo_calculo = 'dinamico' | Badge verde con ícono fa-refresh | ⏳ |
| **U-08** | Badge fijo (tipo cálculo) | 1. Ver registro con tipo_calculo = 'fijo' | Badge gris con ícono fa-lock | ⏳ |
| **U-09** | Tooltip en descripción larga | 1. Hover sobre descripción truncada | Tooltip con texto completo | ⏳ |
| **U-10** | Formato de moneda | 1. Ver columnas de costos | Formato "$ 1.234,56" con 2 decimales | ⏳ |
| **U-11** | Indicador de ordenamiento | 1. Ordenar columna | Flecha arriba (ASC) o abajo (DESC) visible | ⏳ |
| **U-12** | Paginador visible | 1. Tener más de 50 registros | Paginador con botones y dropdown visible | ⏳ |
| **U-13** | Reporte de página actual | 1. Observar paginador | Texto "Mostrando 1 a 50 de 1500 registros" | ⏳ |
| **U-14** | Resumen de estadísticas | 1. Scroll al final de la tabla | Alert con estadísticas de página actual | ⏳ |
| **U-15** | Contador de seleccionadas | 1. Seleccionar 3 altas | "Cancelar Seleccionadas (3)" actualizado | ⏳ |

---

### **CATEGORÍA 3: PRUEBAS DE PERFORMANCE**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Tiempo Esperado | Estado |
|----|---------------|-------|-------------------|-----------------|--------|
| **P-01** | Carga inicial (50 registros) | 1. Navegar a /lista-altas | Carga completa con datos | < 500ms | ⏳ |
| **P-02** | Cambio de página | 1. Click en "Siguiente" | Carga nueva página | < 300ms | ⏳ |
| **P-03** | Aplicar filtro simple | 1. Filtrar por ID | Resultados filtrados | < 500ms (con delay) | ⏳ |
| **P-04** | Aplicar múltiples filtros | 1. 3 filtros simultáneos | Resultados filtrados | < 700ms | ⏳ |
| **P-05** | Ordenar columna | 1. Click en header | Datos reordenados | < 300ms | ⏳ |
| **P-06** | Búsqueda global | 1. Escribir en búsqueda | Resultados filtrados | < 500ms (con delay) | ⏳ |
| **P-07** | Cambiar registros por página a 200 | 1. Seleccionar 200 | Carga 200 registros | < 800ms | ⏳ |
| **P-08** | Cancelación individual | 1. Cancelar una alta | Actualización en DB y UI | < 1000ms | ⏳ |
| **P-09** | Exportar a Excel | 1. Click en botón Excel | Generación de archivo | < 2000ms | ⏳ |
| **P-10** | Restaurar estado (primera carga) | 1. Regresar con estado guardado | Restaura filtros, página, orden | < 600ms | ⏳ |

**Baseline de Comparación (Tabla HTML Anterior):**
- Carga inicial con 10,000 registros: ~5000-10000ms
- Filtrado en cliente: ~1000-2000ms
- Sin paginación: N/A

**Mejora Esperada:** 10x-50x más rápido

---

### **CATEGORÍA 4: PRUEBAS DE STATE PERSISTENCE**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **S-01** | Guardar página actual | 1. Ir a página 3<br>2. Navegar fuera<br>3. Regresar | Regresa a página 3 | ⏳ |
| **S-02** | Guardar registros por página | 1. Cambiar a 100 registros<br>2. Navegar fuera<br>3. Regresar | Mantiene 100 registros por página | ⏳ |
| **S-03** | Guardar ordenamiento | 1. Ordenar por Descripción ASC<br>2. Navegar fuera<br>3. Regresar | Mantiene ordenamiento por Descripción ASC | ⏳ |
| **S-04** | Guardar filtros de columna | 1. Filtrar ID > 10000<br>2. Navegar fuera<br>3. Regresar | Mantiene filtro ID > 10000 | ⏳ |
| **S-05** | Guardar filtros globales | 1. Sucursal 1, Estado ALTA<br>2. Navegar fuera<br>3. Regresar | Mantiene sucursal 1 y estado ALTA | ⏳ |
| **S-06** | Guardar visibilidad de columnas | 1. Ocultar columnas<br>2. Navegar fuera<br>3. Regresar | Mantiene columnas ocultas | ⏳ |
| **S-07** | Guardar múltiples estados | 1. Página 2, orden DESC, filtros<br>2. Navegar fuera<br>3. Regresar | Mantiene TODOS los estados | ⏳ |
| **S-08** | Limpiar estado manualmente | 1. Aplicar configuración<br>2. Cerrar sesión<br>3. Login nuevo | Resetea a configuración default | ⏳ |

**Clave en sessionStorage:** `lista-altas-state`

**Datos Guardados:**
```json
{
  "first": 100,
  "rows": 50,
  "currentPage": 3,
  "sortField": "descripcion",
  "sortOrder": 1,
  "filters": {
    "id_num": "12345",
    "estado": "ALTA"
  },
  "matchModes": {
    "id_num": "equals",
    "estado": "equals"
  },
  "sucursalFiltro": 1,
  "estadoFiltro": "ALTA",
  "columnasVisibles": {
    "id_num": true,
    "descripcion": true,
    // ...
  }
}
```

---

### **CATEGORÍA 5: PRUEBAS DE INTEGRACIÓN BACKEND ↔ FRONTEND**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **I-01** | URL generada correctamente | 1. Filtrar y paginar<br>2. Observar Network tab | URL con todos los parámetros correctos | ⏳ |
| **I-02** | Respuesta del backend (estructura) | 1. Hacer request | JSON con {error, data, total, page, limit, total_pages} | ⏳ |
| **I-03** | Total de registros correcto | 1. Aplicar filtros<br>2. Observar total | totalRecords = total de registros filtrados | ⏳ |
| **I-04** | Paginación correcta | 1. Página 2, 50 registros | data.length = 50, registros 51-100 | ⏳ |
| **I-05** | Filtro en backend (SQL) | 1. Filtrar Descripción = "MOTOR"<br>2. Observar SQL logs | WHERE descripcion ILIKE '%MOTOR%' | ⏳ |
| **I-06** | Ordenamiento en backend (SQL) | 1. Ordenar por ID DESC<br>2. Observar SQL logs | ORDER BY id_num DESC | ⏳ |
| **I-07** | Match modes correctos | 1. Contains, Equals, Greater Than<br>2. Observar SQL | SQL correcto: ILIKE, =, > | ⏳ |
| **I-08** | Índices utilizados | 1. Ejecutar EXPLAIN ANALYZE<br>2. Observar plan | Usa índices creados en Fase 2 | ⏳ |
| **I-09** | Manejo de errores del backend | 1. Simular error 500<br>2. Observar UI | SweetAlert con mensaje de error | ⏳ |
| **I-10** | Timeout de request | 1. Request muy largo<br>2. Observar comportamiento | Error manejado correctamente | ⏳ |

**URL Ejemplo Esperado:**
```
http://localhost:8080/api/ObtenerAltasConCostos_get?
sucursal=1&
estado=ALTA&
page=2&
limit=50&
sortField=descripcion&
sortOrder=ASC&
filter_id_num=12345&
matchMode_id_num=equals&
filter_descripcion=MOTOR&
matchMode_descripcion=contains
```

---

### **CATEGORÍA 6: PRUEBAS DE EDGE CASES**

| ID | Caso de Prueba | Pasos | Resultado Esperado | Estado |
|----|---------------|-------|-------------------|--------|
| **E-01** | Sin datos en la base | 1. Base vacía | Mensaje "No se encontraron altas" | ⏳ |
| **E-02** | Solo 1 registro | 1. Base con 1 registro | Tabla con 1 fila, sin paginador o paginador deshabilitado | ⏳ |
| **E-03** | Exactamente 50 registros | 1. Base con 50 registros | 1 página completa, paginador deshabilitado | ⏳ |
| **E-04** | 51 registros | 1. Base con 51 registros | 2 páginas (50 + 1) | ⏳ |
| **E-05** | Filtro que no devuelve resultados | 1. Filtrar ID = 999999999 | Mensaje "No se encontraron altas" | ⏳ |
| **E-06** | Valores null en campos | 1. Registros con costo_total_1 = null | Muestra "N/A" | ⏳ |
| **E-07** | Descripción muy larga (>300 chars) | 1. Registro con descripción larga | Text truncate con tooltip | ⏳ |
| **E-08** | Caracteres especiales en filtro | 1. Filtrar con "MOTOR's" | Manejo correcto de escape en SQL | ⏳ |
| **E-09** | Límite máximo de registros (500) | 1. Solicitar 1000 registros | Backend limita a 500 | ⏳ |
| **E-10** | Página 0 o negativa | 1. Manipular URL con page=0 | Backend usa page=1 | ⏳ |
| **E-11** | Campo inválido en sortField | 1. Manipular URL con sortField=hacker | Backend usa default (id_num) | ⏳ |
| **E-12** | Match mode inválido | 1. Manipular URL con matchMode=invalid | Backend usa default (contains) | ⏳ |
| **E-13** | SQL Injection attempt | 1. Filtrar con "'; DROP TABLE--" | Protección con escape(), no ejecuta SQL | ⏳ |
| **E-14** | Múltiples requests simultáneos | 1. Cambiar filtros rápidamente | Solo último request se procesa | ⏳ |
| **E-15** | Navegación rápida de páginas | 1. Click rápido en paginador | No hay race conditions | ⏳ |

---

## 🛠️ HERRAMIENTAS DE TESTING

### **1. Testing Manual**
- **Chrome DevTools:** Network tab, Console, Performance
- **Browser:** Chrome, Firefox, Edge (compatibilidad)
- **Responsive:** Mobile, Tablet, Desktop

### **2. Testing de Performance**
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:4200/lista-altas
```

### **3. Testing de Carga**
```bash
# Apache Bench (opcional)
ab -n 1000 -c 10 http://localhost:8080/api/ObtenerAltasConCostos_get?page=1&limit=50
```

### **4. SQL Query Analysis**
```sql
-- PostgreSQL EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT pi.id_num, pi.descripcion, pi.cantidad, ...
FROM pedido_items pi
WHERE pi.sucursald = 1
  AND pi.estado = 'ALTA'
  AND pi.descripcion ILIKE '%MOTOR%'
ORDER BY pi.id_num DESC
LIMIT 50 OFFSET 0;
```

### **5. Network Monitoring**
- Abrir Chrome DevTools → Network
- Filtrar por XHR
- Observar:
  - Request URL
  - Request Headers
  - Response Time
  - Response Size
  - Response Data

---

## 📊 MÉTRICAS DE ÉXITO

### **Performance**
- ✅ Carga inicial < 500ms
- ✅ Cambio de página < 300ms
- ✅ Filtrado < 500ms (con delay)
- ✅ Ordenamiento < 300ms
- ✅ 95% más rápido que tabla HTML anterior

### **Funcionalidad**
- ✅ 100% de casos de prueba funcionales pasados
- ✅ Paginación funciona correctamente
- ✅ Filtros dinámicos funcionan
- ✅ Ordenamiento funciona
- ✅ State persistence funciona

### **UI/UX**
- ✅ Loading indicators claros
- ✅ Mensajes de error/vacío apropiados
- ✅ Responsive en mobile/tablet/desktop
- ✅ Accesibilidad (tooltips, labels)

### **Seguridad**
- ✅ Protección contra SQL Injection
- ✅ Validación de parámetros
- ✅ Whitelist de columnas
- ✅ Escape de valores

---

## 📝 CHECKLIST DE EJECUCIÓN

### **Preparación**
- [ ] Servidor backend corriendo (PHP/CodeIgniter)
- [ ] Servidor frontend corriendo (ng serve)
- [ ] Base de datos con datos de prueba
- [ ] Chrome DevTools abierto
- [ ] Postman/Insomnia para tests de API (opcional)

### **Ejecución de Pruebas**
- [ ] Categoría 1: Pruebas Funcionales (1.1 - 1.7)
- [ ] Categoría 2: Pruebas de UI/UX
- [ ] Categoría 3: Pruebas de Performance
- [ ] Categoría 4: Pruebas de State Persistence
- [ ] Categoría 5: Pruebas de Integración
- [ ] Categoría 6: Pruebas de Edge Cases

### **Documentación**
- [ ] Screenshots de pruebas exitosas
- [ ] Screenshots de errores encontrados
- [ ] Tiempos de performance medidos
- [ ] Issues creados para bugs encontrados

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE TESTING

1. **Si todas las pruebas pasan:**
   - Continuar con Fase 7: Optimización

2. **Si hay errores:**
   - Documentar errores encontrados
   - Crear issues en lista de tareas
   - Corregir errores
   - Re-ejecutar pruebas

3. **Optimizaciones identificadas:**
   - Documentar en Fase 7
   - Implementar mejoras

---

**Estado:** 🚧 Listo para iniciar pruebas
**Siguiente Fase:** [Fase 7: Optimización](plan_alt3_migr_completa_f7.md)
**Fase Anterior:** [Fase 5: Frontend - HTML Template](plan_alt3_migr_completa_f5.md)
**Plan Completo:** [Plan de Migración Completa](plan_alt3_migr_completa.md)
