# Plan de Pruebas Manuales - Alternativa C
## Sistema de Granularidad de Métodos de Pago en Cajamovi

**Fecha:** 15 de Octubre de 2025
**Sistema:** MotoApp - Módulo de Caja
**Objetivo:** Validar funcionamiento completo del desglose de métodos de pago

---

## 📋 TABLA DE CONTENIDOS

1. [Pre-requisitos](#pre-requisitos)
2. [Fase 1: Verificación de Base de Datos](#fase-1-verificación-de-base-de-datos)
3. [Fase 2: Pruebas de Creación de Movimientos](#fase-2-pruebas-de-creación-de-movimientos)
4. [Fase 3: Pruebas de Visualización](#fase-3-pruebas-de-visualización)
5. [Fase 4: Pruebas de Edición](#fase-4-pruebas-de-edición)
6. [Fase 5: Pruebas de Validación Backend](#fase-5-pruebas-de-validación-backend)
7. [Fase 6: Pruebas de Retrocompatibilidad](#fase-6-pruebas-de-retrocompatibilidad)
8. [Fase 7: Pruebas de Performance](#fase-7-pruebas-de-performance)
9. [Checklist Final](#checklist-final)

---

## PRE-REQUISITOS

### Accesos Necesarios
- [ ] Usuario con rol ADMIN o SUPER en MotoApp
- [ ] Acceso a PostgreSQL (para verificaciones de base de datos)
- [ ] Navegador con DevTools (Chrome/Firefox)
- [ ] Acceso a logs del backend PHP

### Datos de Prueba
- [ ] Al menos 3 productos con diferentes `cod_tar` (métodos de pago)
- [ ] Cliente de prueba activo
- [ ] Sucursal activa con caja configurada

### Estado del Sistema
- [ ] Frontend compilado sin errores (`ng serve` en puerto 4200)
- [ ] Backend PHP funcionando correctamente
- [ ] Base de datos PostgreSQL accesible

---

## FASE 1: VERIFICACIÓN DE BASE DE DATOS

### ✅ Test 1.1: Verificar Tabla `caja_movi_detalle`

**Objetivo:** Confirmar que la tabla existe con la estructura correcta

**Pasos:**
1. Conectar a PostgreSQL con el usuario de la aplicación
2. Ejecutar:
   ```sql
   SELECT column_name, data_type, character_maximum_length
   FROM information_schema.columns
   WHERE table_name = 'caja_movi_detalle'
   ORDER BY ordinal_position;
   ```

**Resultado Esperado:**
```
column_name       | data_type | character_maximum_length
------------------+-----------+-------------------------
id_detalle        | integer   | NULL
id_movimiento     | integer   | NULL
cod_tarj          | integer   | NULL
importe_detalle   | numeric   | NULL
porcentaje        | numeric   | NULL
fecha_registro    | timestamp | NULL
```

**✓ Criterio de Éxito:** 6 columnas retornadas con los tipos de datos correctos

---

### ✅ Test 1.2: Verificar Trigger de Validación

**Objetivo:** Confirmar que el trigger está activo

**Pasos:**
1. Ejecutar:
   ```sql
   SELECT tgname, tgtype, tgenabled
   FROM pg_trigger
   WHERE tgrelid = 'caja_movi_detalle'::regclass
   AND tgname = 'trg_validar_suma_detalles';
   ```

**Resultado Esperado:**
```
tgname                      | tgtype | tgenabled
----------------------------+--------+-----------
trg_validar_suma_detalles   | 7      | O
```

**✓ Criterio de Éxito:** Trigger existe y está habilitado (`tgenabled = 'O'`)

---

### ✅ Test 1.3: Verificar Función PostgreSQL

**Objetivo:** Confirmar que la función de desglose existe

**Pasos:**
1. Ejecutar:
   ```sql
   SELECT proname, prorettype::regtype
   FROM pg_proc
   WHERE proname = 'obtener_desglose_movimiento';
   ```

**Resultado Esperado:**
```
proname                       | prorettype
------------------------------+-----------
obtener_desglose_movimiento   | json
```

**✓ Criterio de Éxito:** Función existe y retorna tipo JSON

---

### ✅ Test 1.4: Probar Función de Desglose

**Objetivo:** Verificar que la función retorna datos correctos

**Pasos:**
1. Primero, obtener un ID de movimiento existente:
   ```sql
   SELECT id_movimiento FROM caja_movi ORDER BY id_movimiento DESC LIMIT 1;
   ```
2. Ejecutar la función:
   ```sql
   SELECT obtener_desglose_movimiento(ID_OBTENIDO);
   ```

**Resultado Esperado:**
- Si el movimiento NO tiene desglose: `null` o `[]`
- Si el movimiento SÍ tiene desglose: `[{...}]` con formato JSON válido

**✓ Criterio de Éxito:** Función ejecuta sin errores y retorna JSON válido

---

## FASE 2: PRUEBAS DE CREACIÓN DE MOVIMIENTOS

### ✅ Test 2.1: Crear Venta con Múltiples Métodos de Pago

**Objetivo:** Verificar el flujo completo de creación con desglose

**Pasos:**
1. Navegar a **Punto de Venta** (`/components/puntoventa`)
2. Seleccionar un cliente de prueba
3. Agregar 3 productos al carrito:
   - **Producto A:** $500 - Método: Efectivo (cod_tar = 1)
   - **Producto B:** $300 - Método: Tarjeta Débito (cod_tar = 2)
   - **Producto C:** $200 - Método: Efectivo (cod_tar = 1)
4. Verificar en el carrito que muestra el desglose de subtotales:
   - Efectivo: $700.00 (70%)
   - Tarjeta Débito: $300.00 (30%)
   - **TOTAL:** $1,000.00
5. Abrir **DevTools → Console** (F12)
6. Click en **"Finalizar"**
7. Confirmar el pedido

**Resultado Esperado en Console:**
```
📊 Enviando subtotales por método de pago: [
  {cod_tarj: 1, importe_detalle: 700},
  {cod_tarj: 2, importe_detalle: 300}
]
```

**Resultado Esperado en Backend:**
- HTTP 200
- `{"error": false, "mensaje": 5}` (o número de registros insertados)

**✓ Criterio de Éxito:**
- Venta creada exitosamente
- Console muestra el log de subtotales
- No hay errores en DevTools

---

### ✅ Test 2.2: Verificar Inserción en Base de Datos

**Objetivo:** Confirmar que los detalles se guardaron correctamente

**Pasos:**
1. Obtener el ID del último movimiento creado:
   ```sql
   SELECT id_movimiento, importe_mov, descripcion_mov, fecha_mov
   FROM caja_movi
   ORDER BY id_movimiento DESC
   LIMIT 1;
   ```
   **Anotar el `id_movimiento`:** ___________

2. Consultar los detalles del movimiento:
   ```sql
   SELECT
     cmd.id_detalle,
     cmd.cod_tarj,
     tc.tarjeta AS nombre_tarjeta,
     cmd.importe_detalle,
     cmd.porcentaje
   FROM caja_movi_detalle cmd
   LEFT JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
   WHERE cmd.id_movimiento = [ID_OBTENIDO]
   ORDER BY cmd.id_detalle;
   ```

**Resultado Esperado:**
```
id_detalle | cod_tarj | nombre_tarjeta  | importe_detalle | porcentaje
-----------+----------+-----------------+-----------------+------------
1001       | 1        | Efectivo        | 700.00          | 70.00
1002       | 2        | Tarjeta Débito  | 300.00          | 30.00
```

**✓ Criterio de Éxito:**
- 2 registros insertados
- Suma de `importe_detalle` = 1000.00 (total del movimiento)
- Suma de `porcentaje` = 100.00%

---

### ✅ Test 2.3: Verificar Logs del Backend

**Objetivo:** Confirmar que el backend registró el origen de los subtotales

**Pasos:**
1. Acceder a los logs de CodeIgniter (ubicación típica: `/application/logs/`)
2. Buscar el log más reciente: `log-2025-10-15.php`
3. Buscar líneas relacionadas con el movimiento:
   ```bash
   grep "Movimiento [ID]" log-2025-10-15.php
   ```

**Resultado Esperado:**
```
INFO - Movimiento 12345: Subtotales frontend validados ✓
INFO - Movimiento 12345: Detalles insertados correctamente
```

**✓ Criterio de Éxito:** Logs indican "Subtotales frontend validados" (sin discrepancia)

---

### ✅ Test 2.4: Crear Venta con Un Solo Método de Pago

**Objetivo:** Verificar que funciona con un solo método

**Pasos:**
1. Crear una nueva venta con 2 productos del mismo método de pago:
   - **Producto A:** $400 - Efectivo
   - **Producto B:** $600 - Efectivo
   - **TOTAL:** $1,000.00
2. Finalizar la venta

**Verificación en Base de Datos:**
```sql
SELECT COUNT(*) as cantidad_detalles, SUM(importe_detalle) as suma_detalles
FROM caja_movi_detalle
WHERE id_movimiento = [NUEVO_ID];
```

**Resultado Esperado:**
```
cantidad_detalles | suma_detalles
------------------+--------------
1                 | 1000.00
```

**✓ Criterio de Éxito:**
- 1 solo registro en `caja_movi_detalle`
- `porcentaje` = 100.00

---

## FASE 3: PRUEBAS DE VISUALIZACIÓN

### ✅ Test 3.1: Visualizar Movimiento con Desglose

**Objetivo:** Verificar que el frontend muestra correctamente el desglose

**Pasos:**
1. Navegar a **Cajamovi** (`/components/cajamovi`)
2. Buscar el movimiento creado en Test 2.1 (ID: _______)
3. Verificar que la columna de expansión muestra:
   - **Icono:** Chevron derecho (▶) si no está expandido
   - **Tooltip:** "Ver desglose de métodos de pago"

4. Click en el botón de expansión

**Resultado Esperado:**
- Fila se expande mostrando tabla anidada
- Tabla muestra 2 filas de detalles:
  ```
  Código | Método de Pago  | Importe  | Porcentaje
  -------+-----------------+----------+------------
  1      | Efectivo        | $700.00  | 70.00%
  2      | Tarjeta Débito  | $300.00  | 30.00%
  ```
- Fila de TOTAL muestra: `$1,000.00` y `100.00%`
- Panel lateral muestra:
  - Métodos utilizados: 2
  - Importe total: $1,000.00
  - Fecha del movimiento

**✓ Criterio de Éxito:**
- Tabla anidada se visualiza correctamente
- Progress bars muestran porcentajes visuales
- No hay errores en console

---

### ✅ Test 3.2: Visualizar Movimiento Sin Desglose

**Objetivo:** Verificar retrocompatibilidad con movimientos antiguos

**Pasos:**
1. En la lista de Cajamovi, buscar un movimiento antiguo (creado antes de la implementación)
2. Verificar la columna de expansión

**Resultado Esperado:**
- **Icono:** Guion/minus (`-`) en lugar de chevron
- **Tooltip:** "Sin desglose"
- **Botón:** No clickeable (gris/disabled)

**✓ Criterio de Éxito:** Movimientos sin desglose se distinguen visualmente y no son expandibles

---

### ✅ Test 3.3: Colapsar y Expandir Múltiples Movimientos

**Objetivo:** Verificar que el estado de expansión se mantiene correctamente

**Pasos:**
1. Expandir 3 movimientos diferentes con desglose
2. Verificar que los 3 están expandidos simultáneamente
3. Colapsar el primero
4. Verificar que los otros 2 permanecen expandidos
5. Expandir nuevamente el primero

**✓ Criterio de Éxito:** El estado de cada fila se mantiene independientemente

---

## FASE 4: PRUEBAS DE EDICIÓN

### ✅ Test 4.1: Intentar Editar Movimiento CON Desglose

**Objetivo:** Verificar que la política de no-edición funciona

**Pasos:**
1. En la lista de Cajamovi, localizar el movimiento creado en Test 2.1
2. Click en el botón **"Editar"** (ícono lápiz)

**Resultado Esperado:**
- Se muestra un **modal/alerta de SweetAlert2**
- **Título:** "Movimiento No Editable"
- **Icono:** Advertencia (⚠)
- **Mensaje:** Indica que el movimiento tiene desglose de métodos de pago y no puede ser editado
- **Sugerencia:** Indica que se puede eliminar y crear uno nuevo si es necesario
- **Botón:** "Entendido" (azul)

**Verificación en Console:**
- No debe mostrar errores 500 o similares
- Debe mostrar HTTP 403 si se inspecciona el network tab

**✓ Criterio de Éxito:**
- Modal informativo se muestra correctamente
- Usuario no puede acceder a la página de edición
- Mensaje es claro y ofrece alternativa

---

### ✅ Test 4.2: Verificar Error en Backend

**Objetivo:** Confirmar que el backend rechaza la edición

**Pasos:**
1. Abrir **DevTools → Network Tab**
2. Repetir Test 4.1 (intentar editar movimiento con desglose)
3. Buscar la petición PUT a `/Descarga/UpdateCajamovi`

**Resultado Esperado:**
- **Status:** 403 Forbidden
- **Response Body:**
  ```json
  {
    "error": true,
    "mensaje": "No se puede editar este movimiento porque tiene desglose de métodos de pago registrado...",
    "codigo": "MOVIMIENTO_CON_DESGLOSE_NO_EDITABLE"
  }
  ```

**✓ Criterio de Éxito:** Backend retorna HTTP 403 con código de error específico

---

### ✅ Test 4.3: Editar Movimiento SIN Desglose (Control)

**Objetivo:** Verificar que movimientos sin desglose SÍ se pueden editar

**Pasos:**
1. Crear un movimiento manualmente SIN usar el punto de venta (o usar un movimiento antiguo)
2. Verificar que NO tiene registros en `caja_movi_detalle`:
   ```sql
   SELECT COUNT(*) FROM caja_movi_detalle WHERE id_movimiento = [ID];
   -- Debe retornar 0
   ```
3. Intentar editar el movimiento desde Cajamovi
4. Modificar la descripción: "TEST EDICIÓN"
5. Guardar cambios

**Resultado Esperado:**
- Edición exitosa
- Modal de éxito: "Movimiento actualizado correctamente"
- Cambio reflejado en la lista

**✓ Criterio de Éxito:** Movimientos sin desglose se pueden editar normalmente

---

## FASE 5: PRUEBAS DE VALIDACIÓN BACKEND

### ✅ Test 5.1: Probar Validación del Trigger (Suma Incorrecta)

**Objetivo:** Verificar que el trigger rechaza datos inconsistentes

**Pasos:**
1. Ejecutar en PostgreSQL (esto DEBE fallar):
   ```sql
   -- Crear movimiento de prueba
   INSERT INTO caja_movi (sucursal, importe_mov, fecha_mov, descripcion_mov, tipo_movi)
   VALUES (1, 1000.00, CURRENT_DATE, 'TEST TRIGGER', 'A')
   RETURNING id_movimiento;
   -- Anotar el ID: _______

   -- Intentar insertar detalles que NO suman el total
   BEGIN;
   INSERT INTO caja_movi_detalle (id_movimiento, cod_tarj, importe_detalle, porcentaje)
   VALUES
     ([ID], 1, 600.00, 60.00),
     ([ID], 2, 200.00, 20.00);  -- Suma = 800 ≠ 1000
   COMMIT;
   ```

**Resultado Esperado:**
- **ERROR:** SQLSTATE 23514
- **Mensaje:** "ERROR DE INTEGRIDAD: La suma de detalles ($800.00) no coincide con el total ($1000.00). Diferencia: $200.00"
- **ROLLBACK:** Ningún detalle se inserta

**✓ Criterio de Éxito:** Trigger impide la inserción y hace rollback

---

### ✅ Test 5.2: Probar Tolerancia de Redondeo

**Objetivo:** Verificar que el trigger acepta diferencias menores a $0.01

**Pasos:**
1. Crear movimiento con importe que cause redondeo:
   ```sql
   INSERT INTO caja_movi (sucursal, importe_mov, fecha_mov, descripcion_mov, tipo_movi)
   VALUES (1, 100.00, CURRENT_DATE, 'TEST REDONDEO', 'A')
   RETURNING id_movimiento;
   -- Anotar el ID: _______

   -- Insertar detalles con mínima diferencia por redondeo
   INSERT INTO caja_movi_detalle (id_movimiento, cod_tarj, importe_detalle, porcentaje)
   VALUES
     ([ID], 1, 33.33, 33.33),
     ([ID], 2, 33.33, 33.33),
     ([ID], 3, 33.34, 33.34);
   -- Suma = 100.00 (exacto, pero con redondeos intermedios)
   ```

**Resultado Esperado:**
- **Éxito:** INSERT completado sin errores
- Detalles insertados correctamente

**✓ Criterio de Éxito:** Trigger acepta diferencias insignificantes por redondeo

---

### ✅ Test 5.3: Simular Discrepancia Frontend vs Backend

**Objetivo:** Verificar que el backend detecta y corrige discrepancias

**Pasos:**
1. **Método A - Modificar temporalmente el frontend:**
   - Editar `carrito.component.ts` temporalmente
   - En el método `formatearSubtotalesParaBackend()`, modificar un importe:
     ```typescript
     subtotalesBackend.push({
       cod_tarj: cod_tarj,
       importe_detalle: parseFloat(subtotal.subtotal.toFixed(2)) + 50 // ← Agregar diferencia
     });
     ```
   - Crear una venta
   - **Revertir el cambio inmediatamente**

2. **Método B - Verificar logs sin modificar código:**
   - Monitorear los logs del backend durante las ventas
   - Buscar líneas con "DISCREPANCIA"

**Resultado Esperado en Logs:**
```
WARNING - Movimiento 12346: DISCREPANCIA detectada
WARNING - Diferencias encontradas:
WARNING -   cod_tarj 1: Frontend $750.00 vs Backend $700.00 (Dif: $50.00)
INFO - Movimiento 12346: Usando subtotales recalculados por el backend
```

**Verificación en Base de Datos:**
```sql
SELECT * FROM caja_movi_detalle WHERE id_movimiento = 12346;
-- Los importes deben ser los CORRECTOS (recalculados), no los incorrectos del frontend
```

**✓ Criterio de Éxito:**
- Backend detecta la discrepancia
- Logs muestran detalles del error
- Datos guardados son correctos (recalculados)

---

## FASE 6: PRUEBAS DE RETROCOMPATIBILIDAD

### ✅ Test 6.1: Frontend Antiguo (Sin Enviar Subtotales)

**Objetivo:** Verificar que el sistema funciona sin el parámetro `subtotales_metodos_pago`

**Pasos:**
1. Inspeccionar una venta en **Network → Payload**
2. Confirmar que actualmente SÍ envía `subtotales_metodos_pago`
3. **Simulación:** El backend debe manejar correctamente si este campo no viene
   - Revisar logs de movimientos antiguos (antes de la implementación)
   - No deben mostrar errores relacionados con subtotales

**Resultado Esperado:**
- Movimiento se crea normalmente
- NO se insertan detalles en `caja_movi_detalle`
- Backend loguea: "No se recibieron subtotales del frontend"

**✓ Criterio de Éxito:** Sistema funciona sin el parámetro opcional

---

### ✅ Test 6.2: Consultar Movimientos Antiguos

**Objetivo:** Verificar que endpoints GET funcionan con movimientos sin desglose

**Pasos:**
1. Ejecutar:
   ```sql
   SELECT obtener_desglose_movimiento([ID_MOVIMIENTO_ANTIGUO]);
   ```

**Resultado Esperado:**
- Retorna `null` o `[]`
- No genera errores

**Verificación en Frontend:**
2. Navegar a Cajamovi
3. Localizar movimientos antiguos
4. Verificar que muestran icono "-" (sin desglose)
5. Verificar que NO se puede expandir

**✓ Criterio de Éxito:** Movimientos antiguos se visualizan correctamente sin desglose

---

## FASE 7: PRUEBAS DE PERFORMANCE

### ✅ Test 7.1: Venta con Muchos Métodos de Pago

**Objetivo:** Verificar que el sistema maneja múltiples métodos correctamente

**Pasos:**
1. Crear una venta con 5 productos, cada uno con método de pago diferente:
   - Producto 1: $200 - Efectivo
   - Producto 2: $150 - Tarjeta Débito
   - Producto 3: $100 - Tarjeta Crédito
   - Producto 4: $300 - Cuenta Corriente
   - Producto 5: $250 - Cheque
   - **TOTAL:** $1,000.00

2. Finalizar la venta
3. Medir el tiempo de respuesta en Network Tab

**Resultado Esperado:**
- Tiempo de respuesta < 500ms
- 5 registros en `caja_movi_detalle`
- Suma de porcentajes = 100%

**✓ Criterio de Éxito:** Performance aceptable con múltiples métodos

---

### ✅ Test 7.2: Consulta con Muchos Movimientos

**Objetivo:** Verificar que la visualización no se degrada

**Pasos:**
1. Navegar a Cajamovi con filtro de fecha amplio (ej: último mes)
2. Verificar que la página carga correctamente
3. Expandir 10 movimientos diferentes con desglose
4. Verificar que la UI sigue siendo responsive

**✓ Criterio de Éxito:** No hay lag significativo al expandir múltiples filas

---

## FASE 8: PRUEBAS DE CASOS EXTREMOS

### ✅ Test 8.1: Venta con Importe Decimal Complejo

**Objetivo:** Verificar manejo de decimales

**Pasos:**
1. Crear venta con importes que generen decimales:
   - Producto A: $333.33 - Efectivo
   - Producto B: $333.33 - Tarjeta
   - Producto C: $333.34 - Cuenta Corriente
   - **TOTAL:** $1,000.00

2. Verificar en base de datos que los porcentajes se calculan correctamente

**✓ Criterio de Éxito:** No hay errores de redondeo, suma = 100%

---

### ✅ Test 8.2: Eliminación de Movimiento con Desglose

**Objetivo:** Verificar cascada de eliminación

**Pasos:**
1. Seleccionar un movimiento con desglose
2. Click en **"Eliminar"** (ícono papelera)
3. Confirmar eliminación

**Verificación en Base de Datos:**
```sql
-- Verificar que el movimiento fue eliminado
SELECT * FROM caja_movi WHERE id_movimiento = [ID];
-- Debe retornar 0 filas

-- Verificar que los detalles TAMBIÉN fueron eliminados (CASCADE)
SELECT * FROM caja_movi_detalle WHERE id_movimiento = [ID];
-- Debe retornar 0 filas
```

**✓ Criterio de Éxito:**
- Movimiento eliminado exitosamente
- Detalles eliminados automáticamente (CASCADE)

---

## CHECKLIST FINAL

### ✅ Base de Datos
- [ ] Tabla `caja_movi_detalle` existe con 6 columnas
- [ ] Trigger `trg_validar_suma_detalles` está activo
- [ ] Función `obtener_desglose_movimiento()` retorna JSON
- [ ] Constraints de integridad funcionan correctamente

### ✅ Backend PHP
- [ ] Funciones híbridas implementadas y funcionando
- [ ] Endpoint POST inserta detalles correctamente
- [ ] Endpoints GET retornan desglose cuando existe
- [ ] Política de edición rechaza modificaciones (HTTP 403)
- [ ] Logs registran origen de subtotales (frontend vs backend)

### ✅ Frontend Angular
- [ ] Carrito calcula subtotales por método de pago
- [ ] Envío de `subtotales_metodos_pago` funciona
- [ ] Visualización expandible en Cajamovi funciona
- [ ] Movimientos sin desglose muestran "-"
- [ ] Modal de error de edición se muestra correctamente

### ✅ Validaciones
- [ ] Trigger rechaza suma incorrecta (diferencia > $0.01)
- [ ] Trigger acepta diferencias por redondeo (≤ $0.01)
- [ ] Backend detecta discrepancias frontend vs recalculado
- [ ] Datos guardados son siempre correctos

### ✅ Retrocompatibilidad
- [ ] Movimientos antiguos sin desglose se visualizan correctamente
- [ ] Sistema funciona sin parámetro `subtotales_metodos_pago`
- [ ] Movimientos sin desglose SÍ se pueden editar

### ✅ Performance
- [ ] Tiempo de inserción < 500ms con múltiples métodos
- [ ] Visualización de lista con muchos movimientos es fluida
- [ ] Expansión de múltiples filas no causa lag

### ✅ UX/UI
- [ ] Iconos y tooltips son claros
- [ ] Progress bars de porcentajes se visualizan bien
- [ ] Panel informativo muestra datos correctos
- [ ] Modales tienen mensajes claros y accionables

---

## 📊 REGISTRO DE RESULTADOS

### Resumen de Pruebas
```
Total de Tests: 31
Tests Pasados: ____
Tests Fallidos: ____
Tests Pendientes: ____
```

### Problemas Encontrados
1. **[Número]** - [Descripción del problema]
   - **Severidad:** [Crítica/Alta/Media/Baja]
   - **Pasos para Reproducir:** ...
   - **Resultado Esperado:** ...
   - **Resultado Actual:** ...

2. ...

### Observaciones Generales
-
-
-

---

## 🎯 CRITERIOS DE ACEPTACIÓN FINAL

Para considerar la implementación **LISTA PARA PRODUCCIÓN**, se deben cumplir:

1. ✅ **Todos los tests de Fase 1-4 pasados** (Core functionality)
2. ✅ **Al menos 90% de tests de Fase 5-7 pasados** (Validaciones y performance)
3. ✅ **Sin errores críticos** en logs del backend
4. ✅ **Sin errores en Console** del navegador durante operaciones normales
5. ✅ **Tiempo de respuesta promedio < 500ms** para creación de movimientos

---

**Fecha de Ejecución:** _______________
**Ejecutado por:** _______________
**Versión Probada:** 2.0
**Estado Final:** [ ] APROBADO / [ ] RECHAZADO / [ ] PENDIENTE

---

**FIN DEL PLAN DE PRUEBAS**
