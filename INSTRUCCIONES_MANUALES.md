# INSTRUCCIONES MANUALES - ELIMINACIÓN CAJA_MOVI_DETALLE

**Fecha:** 21 de Octubre de 2025
**Estado:** En Progreso

---

## 📋 ÍNDICE DE ACCIONES MANUALES

Las siguientes acciones DEBEN ser ejecutadas manualmente por el usuario:

1. [FASE 1 - Ejecutar Script SQL de Vista de Compatibilidad](#fase-1-acción-manual-1)
2. [FASE 2 - Crear Backup de Base de Datos](#fase-2-acción-manual-1)
3. [FASE 2 - Ejecutar Script SQL para Desactivar Trigger](#fase-2-acción-manual-2)
4. [FASE 2 - Probar Ventas Manualmente](#fase-2-acción-manual-3)
5. [FASE 3 - Compilar y Desplegar Frontend](#fase-3-acción-manual-1)
6. [FASE 3 - Probar Ventas en Interfaz](#fase-3-acción-manual-2)
7. [FASE 4 - Ejecutar Script SQL de Limpieza](#fase-4-acción-manual-1)
8. [FASE 4 - Verificación Final](#fase-4-acción-manual-2)

---

## FASE 1: PREPARACIÓN (Sin Impacto)

### ✅ Completado Automáticamente

- [x] Auditoría de dependencias
  - Backend: 5 usos en Descarga.php.txt
  - Vistas DB: 2 vistas (`v_cajamovi_con_desglose`, `v_cajamovi_agrupados`)
- [x] Creación de archivo SQL: `fase1_crear_vista_compatibilidad.sql`

---

### 📌 FASE 1 - ACCIÓN MANUAL #1

**Archivo:** `fase1_crear_vista_compatibilidad.sql`

**Descripción:** Ejecutar script SQL que crea la vista de compatibilidad

**Comando:**

```bash
# Opción A: Usando psql
psql -U postgres -d motoapp -f fase1_crear_vista_compatibilidad.sql

# Opción B: Usando pgAdmin
# 1. Abrir pgAdmin
# 2. Conectar a la base de datos motoapp
# 3. Ir a Tools → Query Tool
# 4. Abrir archivo fase1_crear_vista_compatibilidad.sql
# 5. Ejecutar (F5)
```

**Verificación:**

```sql
-- Debe retornar 2 filas (NUEVO, HISTORICO)
SELECT
    origen,
    COUNT(*) AS cantidad
FROM v_caja_movi_detalle_legacy
GROUP BY origen;
```

**Resultado Esperado:**

| origen | cantidad |
|--------|----------|
| NUEVO | 3 |
| HISTORICO | 2 |

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

**Notas:**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

## FASE 2: MIGRACIÓN BACKEND (Con Impacto Controlado)

### ✅ Completado Automáticamente

- [x] Creación de backup de código: `src/Descarga.php.txt.backup_fase2`
- [x] Modificación de código backend (comentar inserts)
- [x] Creación de script SQL: `fase2_desactivar_trigger.sql`

---

### 📌 FASE 2 - ACCIÓN MANUAL #1

**Descripción:** Crear backup de base de datos ANTES de cualquier cambio

**Comando:**

```bash
# Backup completo de la base de datos
pg_dump -U postgres -d motoapp > backup_antes_fase2_$(date +%Y%m%d_%H%M%S).sql

# Verificar que el backup se creó correctamente
ls -lh backup_antes_fase2_*.sql
```

**Verificación:**

```bash
# El archivo debe tener tamaño mayor a 0 bytes
du -h backup_antes_fase2_*.sql
```

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

**Ruta del backup:**
```
_______________________________________________________________________
```

---

### 📌 FASE 2 - ACCIÓN MANUAL #2

**Archivo:** `fase2_desactivar_trigger.sql`

**Descripción:** Desactivar trigger de validación (sin eliminar)

**Comando:**

```bash
psql -U postgres -d motoapp -f fase2_desactivar_trigger.sql
```

**Verificación:**

```sql
-- Debe mostrar: tgenabled = 'D' (Disabled)
SELECT
    tgname,
    tgenabled,
    CASE tgenabled
        WHEN 'O' THEN 'Enabled'
        WHEN 'D' THEN 'Disabled'
        ELSE 'Unknown'
    END AS estado
FROM pg_trigger
WHERE tgname = 'trg_validar_suma_detalles_deferred';
```

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

---

### 📌 FASE 2 - ACCIÓN MANUAL #3

**Descripción:** Probar ventas manualmente para verificar que funcionan sin insertar en caja_movi_detalle

**Pasos:**

1. **Realizar venta con 1 método de pago:**
   - Producto: Cualquiera
   - Método: EFECTIVO
   - Total: ~$5,000

2. **Verificar que NO se insertó en caja_movi_detalle:**
   ```sql
   -- Debe retornar 0 filas
   SELECT * FROM caja_movi_detalle
   WHERE fecha_registro > NOW() - INTERVAL '5 minutes'
   ORDER BY fecha_registro DESC;
   ```

3. **Verificar que SÍ se insertó en caja_movi:**
   ```sql
   -- Debe retornar 1 fila
   SELECT * FROM caja_movi
   WHERE fecha_mov = CURRENT_DATE
   ORDER BY id_movimiento DESC
   LIMIT 1;
   ```

4. **Verificar vista legacy simula el detalle:**
   ```sql
   -- Debe retornar 1 fila con porcentaje = 100
   SELECT * FROM v_caja_movi_detalle_legacy
   WHERE id_movimiento = (SELECT MAX(id_movimiento) FROM caja_movi);
   ```

5. **Realizar venta con 2 métodos de pago:**
   - Producto 1: $3,000 → EFECTIVO
   - Producto 2: $7,000 → TRANSFERENCIA
   - Total: $10,000

6. **Verificar que se crearon 2 movimientos:**
   ```sql
   SELECT * FROM caja_movi
   WHERE fecha_mov = CURRENT_DATE
   ORDER BY id_movimiento DESC
   LIMIT 2;
   ```

7. **Verificar que NO se insertó en caja_movi_detalle:**
   ```sql
   SELECT COUNT(*) FROM caja_movi_detalle
   WHERE fecha_registro > NOW() - INTERVAL '5 minutes';
   -- Debe retornar: 0
   ```

**Criterios de Éxito:**

- [ ] Venta con 1 método se registra correctamente
- [ ] Venta con 2 métodos crea 2 movimientos separados
- [ ] NO se insertan registros en caja_movi_detalle
- [ ] Vista legacy simula detalles correctamente
- [ ] Sin errores en logs del servidor

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

**Notas de Pruebas:**
```
Venta 1 método:
ID Movimiento: __________
Verificado: [ ] Sí [ ] No

Venta 2 métodos:
ID Movimiento 1: __________
ID Movimiento 2: __________
Verificado: [ ] Sí [ ] No
```

---

## FASE 3: MIGRACIÓN FRONTEND (Con Impacto Mínimo)

### ✅ Completado Automáticamente

- [x] Creación de backup: `src/app/components/carrito/carrito.component.ts.backup_fase3`
- [x] Modificación de código frontend
- [x] Actualización de servicio subirdata.service.ts

---

### 📌 FASE 3 - ACCIÓN MANUAL #1

**Descripción:** Compilar aplicación Angular y desplegar

**Comandos:**

```bash
# 1. Navegar al directorio del proyecto
cd /mnt/c/Users/Telemetria/T49E2PT/angular/motoapp

# 2. Instalar dependencias (si es necesario)
npm install

# 3. Compilar en modo producción
npx ng build --configuration production

# 4. Verificar que la compilación fue exitosa
# Debe mostrar: "Build at: ..." sin errores
```

**Verificación de Compilación:**

```bash
# Verificar que el directorio dist se creó
ls -la dist/

# Verificar tamaño de los archivos compilados
du -sh dist/
```

**Desplegar (según tu servidor):**

```bash
# Ejemplo: Copiar a directorio del servidor
# cp -r dist/* /var/www/motoapp/

# O si usas otro método de despliegue, documentarlo aquí:
```

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

**Errores encontrados:**
```
_______________________________________________________________________
_______________________________________________________________________
```

---

### 📌 FASE 3 - ACCIÓN MANUAL #2

**Descripción:** Probar ventas completas en la interfaz web

**Pasos:**

1. **Abrir aplicación en navegador**
   - URL: http://localhost:4230 (o tu URL)

2. **Abrir DevTools del navegador**
   - Chrome: F12
   - Firefox: F12
   - Ver consola para errores

3. **Realizar venta con 1 método:**
   - Agregar productos al carrito
   - Seleccionar método: EFECTIVO
   - Completar venta
   - **Verificar:** Sin errores en consola

4. **Realizar venta con 2 métodos:**
   - Agregar productos al carrito
   - Producto 1: EFECTIVO
   - Producto 2: TRANSFERENCIA
   - Completar venta
   - **Verificar:** Se crearon 2 movimientos en DB

5. **Consultar reportes de caja:**
   - Ir a módulo de reportes
   - Generar reporte de movimientos de hoy
   - **Verificar:** Datos se muestran correctamente

6. **Verificar que NO se envía `subtotales_metodos_pago`:**
   - En DevTools, ir a Network
   - Realizar venta
   - Ver request a `PedidossucxappCompleto`
   - **Verificar:** El payload NO contiene `subtotales_metodos_pago`

**Criterios de Éxito:**

- [ ] Aplicación carga sin errores
- [ ] Venta con 1 método funciona
- [ ] Venta con 2 métodos funciona
- [ ] Reportes muestran datos correctos
- [ ] Sin errores en consola del navegador
- [ ] Request NO envía `subtotales_metodos_pago`

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

**Capturas de pantalla:**
```
(Opcional: Agregar capturas aquí)
```

---

## FASE 4: LIMPIEZA Y DEPRECIACIÓN (Sin Impacto)

### ✅ Completado Automáticamente

- [x] Creación de script SQL: `fase4_limpieza_base_datos.sql`
- [x] Limpieza de código backend (funciones eliminadas)
- [x] Limpieza de código frontend (funciones eliminadas)

---

### 📌 FASE 4 - ACCIÓN MANUAL #1

**Archivo:** `fase4_limpieza_base_datos.sql`

**Descripción:** Ejecutar limpieza final de base de datos

**ADVERTENCIA:** ⚠️ Este script es IRREVERSIBLE. Asegúrate de tener backup.

**Comando:**

```bash
psql -U postgres -d motoapp -f fase4_limpieza_base_datos.sql
```

**Verificación:**

```sql
-- 1. Verificar que trigger fue eliminado
SELECT COUNT(*) FROM pg_trigger
WHERE tgname = 'trg_validar_suma_detalles_deferred';
-- Debe retornar: 0

-- 2. Verificar que funciones fueron eliminadas
SELECT COUNT(*) FROM pg_proc
WHERE proname IN ('validar_suma_detalles_cajamovi', 'obtener_desglose_movimiento');
-- Debe retornar: 0

-- 3. Verificar que tabla fue renombrada
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'caja_movi_detalle%'
ORDER BY tablename;
-- Debe mostrar: caja_movi_detalle_deprecated

-- 4. Verificar comentario en tabla
SELECT obj_description('caja_movi_detalle_deprecated'::regclass);
-- Debe contener: "DEPRECATED"
```

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

---

### 📌 FASE 4 - ACCIÓN MANUAL #2

**Descripción:** Verificación final completa del sistema

**Checklist de Verificación:**

**Base de Datos:**
- [ ] Vista `v_caja_movi_detalle_legacy` existe y funciona
- [ ] Tabla renombrada a `caja_movi_detalle_deprecated`
- [ ] Trigger eliminado
- [ ] Funciones SQL eliminadas
- [ ] Índice nuevo creado en `tarjcredito(idcp_ingreso)`

**Backend:**
- [ ] Funciones eliminadas del código
- [ ] Sin referencias a `caja_movi_detalle` en nuevos inserts
- [ ] Logs muestran "Nueva implementación activa"

**Frontend:**
- [ ] Aplicación compila sin errores
- [ ] Función `calcularSubtotalesPorTipoPago` eliminada
- [ ] Sin referencias a `subtotales_metodos_pago`

**Funcionalidad:**
- [ ] Ventas con 1 método funcionan
- [ ] Ventas con 2 métodos funcionan
- [ ] Ventas con 3+ métodos funcionan
- [ ] Reportes muestran datos correctos
- [ ] Sin errores en logs (24 horas)

**Performance:**
- [ ] Consultas más rápidas (medido)
- [ ] Sin degradación de performance

**Consultas de Verificación Final:**

```sql
-- 1. Verificar ventas últimas 24 horas
SELECT
    COUNT(*) AS ventas_totales,
    SUM(CASE WHEN cantidad_movimientos > 1 THEN 1 ELSE 0 END) AS ventas_multiples_metodos
FROM v_cajamovi_agrupados
WHERE fecha_mov >= CURRENT_DATE;

-- 2. Verificar que NO se insertaron nuevos detalles
SELECT
    MAX(fecha_registro) AS ultima_insercion,
    COUNT(*) AS total_detalles
FROM caja_movi_detalle_deprecated;
-- ultima_insercion debe ser < 2025-10-21

-- 3. Verificar integridad de datos
SELECT
    cm.id_movimiento,
    cm.importe_mov,
    tc.tarjeta,
    CASE
        WHEN tc.cod_tarj IS NOT NULL THEN '✅ OK'
        ELSE '❌ Sin método pago'
    END AS estado
FROM caja_movi cm
LEFT JOIN tarjcredito tc ON cm.codigo_mov = tc.idcp_ingreso
WHERE cm.fecha_mov >= CURRENT_DATE
ORDER BY cm.id_movimiento DESC
LIMIT 10;
```

**Estado:** ⏳ PENDIENTE

**Completado:** [ ] Sí [ ] No

**Problemas Encontrados:**
```
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
```

---

## 📊 RESUMEN DE PROGRESO

**Fase 1: Preparación**
- Auditoría: ✅ Completado
- Vista compatibilidad: ⏳ Pendiente (Requiere ejecución manual)
- Pruebas: ⏳ Pendiente

**Fase 2: Backend**
- Backup DB: ⏳ Pendiente (Requiere ejecución manual)
- Modificación código: ✅ Completado
- Desactivar trigger: ⏳ Pendiente (Requiere ejecución manual)
- Pruebas: ⏳ Pendiente (Requiere pruebas manuales)

**Fase 3: Frontend**
- Modificación código: ✅ Completado
- Compilación: ⏳ Pendiente (Requiere compilación manual)
- Pruebas: ⏳ Pendiente (Requiere pruebas manuales)

**Fase 4: Limpieza**
- Scripts preparados: ✅ Completado
- Ejecución DB: ⏳ Pendiente (Requiere ejecución manual)
- Verificación final: ⏳ Pendiente

---

## 🔄 PLAN DE ROLLBACK

Si algo sale mal en cualquier fase:

### Rollback Fase 2 (Backend)

```bash
# 1. Restaurar código
cp src/Descarga.php.txt.backup_fase2 src/Descarga.php.txt

# 2. Reactivar trigger
psql -U postgres -d motoapp -c "
ALTER TABLE caja_movi_detalle
ENABLE TRIGGER trg_validar_suma_detalles_deferred;
"

# 3. Reiniciar servicio PHP (si aplica)
```

### Rollback Fase 3 (Frontend)

```bash
# 1. Restaurar código
cp src/app/components/carrito/carrito.component.ts.backup_fase3 \
   src/app/components/carrito/carrito.component.ts

# 2. Recompilar
npx ng build --configuration production

# 3. Redesplegar
```

### Rollback Fase 4 (Limpieza)

```bash
# 1. Restaurar nombre de tabla
psql -U postgres -d motoapp -c "
ALTER TABLE caja_movi_detalle_deprecated
RENAME TO caja_movi_detalle;
"

# 2. Recrear trigger (usar script de respaldo)
```

---

## 📞 SOPORTE

**Logs a Monitorear:**

```bash
# Backend (PHP)
tail -f /var/log/php/application.log | grep -E "FASE|cajamovi"

# Frontend (Navegador)
# Abrir DevTools → Console
# Buscar mensajes con: "FASE", "cajamovi", "subtotales"
```

**Consultas de Diagnóstico:**

```sql
-- Ver últimos movimientos
SELECT * FROM caja_movi
ORDER BY id_movimiento DESC
LIMIT 10;

-- Ver vista legacy
SELECT * FROM v_caja_movi_detalle_legacy
ORDER BY id_movimiento DESC
LIMIT 10;

-- Verificar integridad
SELECT
    'caja_movi' AS tabla,
    COUNT(*) AS registros
FROM caja_movi
WHERE fecha_mov >= CURRENT_DATE

UNION ALL

SELECT
    'caja_movi_detalle_deprecated' AS tabla,
    COUNT(*) AS registros
FROM caja_movi_detalle_deprecated
WHERE fecha_registro >= CURRENT_DATE;
```

---

**Documento actualizado:** En progreso
**Última modificación:** 21 de Octubre de 2025
