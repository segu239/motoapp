# Actualización Sistema de Cambio de Precios - Campo id_articulo

**Fecha de Actualización:** 12 de Agosto de 2025  
**Versión:** 2.1 - Mejora de Trazabilidad  
**Estado:** Listo para Implementación

## 📋 Resumen de la Actualización

### Cambio Implementado
Se agregó el campo `id_articulo` a los registros de auditoría en la tabla `dactualiza` para mejorar la trazabilidad de las modificaciones masivas de precios.

### Impacto
- **Backend**: Función PostgreSQL actualizada
- **Frontend**: Sin cambios requeridos
- **Base de Datos**: Campo ya existente, solo se modifica su uso

## 🔧 Cambios Técnicos Realizados

### 1. Modificación de la Función PostgreSQL

**Archivo:** `funcion_update_precios_masivo_CON_ID_ARTICULO.sql`

**Cambio en INSERT a dactualiza:**

```sql
-- ANTES (versión original):
INSERT INTO dactualiza (
    id_act, articulo, nombre, pcosto, precio, pfinal,
    pcoston, precion, pfinaln, fecha
) VALUES (
    -- valores sin id_articulo
);

-- DESPUÉS (versión actualizada):
INSERT INTO dactualiza (
    id_act, articulo, nombre, pcosto, precio, pfinal,
    pcoston, precion, pfinaln, fecha, id_articulo  -- ✅ NUEVO CAMPO
) VALUES (
    COALESCE(v_id_act, 0),
    COALESCE(rec.cd_articulo::numeric, 0),
    REPLACE(COALESCE(rec.nomart, ''), '"', '\\"'),
    COALESCE(rec.precostosi, 0),
    COALESCE(rec.precon, 0),
    COALESCE(rec.precon, 0),
    COALESCE(ROUND(COALESCE(p_nvo_costo, 0), 2), 0),
    COALESCE(ROUND(COALESCE(p_nvo_final, 0), 2), 0), 
    COALESCE(ROUND(COALESCE(p_nvo_final, 0), 2), 0),
    NOW()::date,
    COALESCE(rec.id_articulo, 0)  -- ✅ VALOR DEL NUEVO CAMPO
);
```

### 2. Fuente de Datos - Obtención del id_articulo

**✅ VALIDACIÓN COMPLETA: Campo `id_articulo` correctamente obtenido de artsucursal**

#### **Origen del Campo:**
```sql
-- LÍNEA 117: El cursor SELECT incluye explícitamente a.id_articulo
FOR rec IN 
    SELECT a.id_articulo,          -- ✅ CLAVE PRIMARIA de artsucursal (integer, NOT NULL)
           a.cd_articulo,          -- Código del artículo  
           a.nomart,               -- Nombre del artículo
           a.marca, a.rubro,       -- Datos de clasificación
           a.precostosi, a.precon, -- Precios actuales
           a.cod_iva,              -- Tipo de IVA
           COALESCE(iva.alicuota1, 21) as alicuota1
    FROM artsucursal a
    LEFT JOIN artiva iva ON a.cod_iva = iva.cod_iva
    WHERE a.cod_deposito = v_dep
      AND (filtros aplicados...)
```

#### **Características del Campo id_articulo:**
- **Tipo:** `integer` (clave primaria autoincremental)
- **Restricciones:** `NOT NULL` (siempre tiene valor válido)
- **Origen:** Sequence `artsucursal_id_articulo_seq`
- **Disponibilidad:** Accesible como `rec.id_articulo` en el loop
- **Valores ejemplo:** 9102, 5420, 8836 (únicos e identificativos)

#### **Uso en el INSERT:**
```sql
-- LÍNEA 174: Campo usado directamente del cursor
COALESCE(rec.id_articulo, 0)  -- ✅ VALOR OBTENIDO DEL SELECT DE artsucursal

-- FLUJO DE DATOS:
-- 1. SELECT a.id_articulo FROM artsucursal a → obtiene clave primaria real
-- 2. rec.id_articulo → disponible en el loop FOR 
-- 3. COALESCE(rec.id_articulo, 0) → inserción segura en dactualiza
-- 4. Resultado: trazabilidad exacta del artículo modificado
```

#### **Validación de Integridad:**
```sql
-- Ejemplos de valores reales confirmados en BD:
-- id_articulo: 9102, cd_articulo: "0", nomart: "CADENA DIST.25x 90..."
-- id_articulo: 5420, cd_articulo: "0", nomart: "ACOPLE FIL AIRE..."  
-- id_articulo: 8836, cd_articulo: "0", nomart: "BOMBA ACEITE HONDA..."

-- Cada rec.id_articulo es único e identifica exactamente el registro modificado
-- Permite JOIN perfecto: dactualiza.id_articulo = artsucursal.id_articulo
```

### 3. Validación Frontend

**Estado:** ✅ **Sin cambios requeridos**

**Razones:**
- El frontend no consulta directamente la tabla `dactualiza`
- Solo maneja `auditoria_id` para mostrar referencia de auditoría
- La tabla `dactualiza` es únicamente para trazabilidad interna
- No hay interfaces que dependan del contenido de `dactualiza`

## 🎯 Beneficios de la Mejora

### Trazabilidad Mejorada
- **Identificación única:** Cada cambio se registra con el `id_articulo` exacto
- **Relación directa:** JOIN directo con `artsucursal` por clave primaria
- **Consultas optimizadas:** No depende de `cd_articulo` que puede repetirse

### Auditoría Robusta
- **Referencia exacta:** Identificación precisa del artículo modificado
- **Integridad de datos:** Relación con clave primaria garantiza consistencia
- **Consultas de seguimiento:** Facilita análisis posteriores de cambios

### Compatibilidad Total
- **Sin ruptura:** Campo agregado al final de la estructura
- **Retrocompatibilidad:** Función existente puede convivir durante transición
- **Sin impacto:** Frontend y otros componentes no se ven afectados

## 📊 Estructura de Auditoría Actualizada

### Tabla dactualiza - Estructura Final

```sql
CREATE TABLE dactualiza (
    id_actprecios INTEGER PRIMARY KEY,  -- ID único del registro
    id_act NUMERIC,                     -- Referencia a cactualiza
    articulo NUMERIC,                   -- Código del artículo (cd_articulo)
    nombre CHARACTER,                   -- Nombre del artículo
    pcosto NUMERIC,                     -- Precio costo ANTERIOR
    precio NUMERIC,                     -- Precio final ANTERIOR
    pfinal NUMERIC,                     -- Precio final ANTERIOR (compatibilidad)
    pcoston NUMERIC,                    -- Precio costo NUEVO
    precion NUMERIC,                    -- Precio final NUEVO
    pfinaln NUMERIC,                    -- Precio final NUEVO (compatibilidad)
    fecha DATE,                         -- Fecha del cambio
    id_articulo NUMERIC                 -- ✅ IDENTIFICADOR ÚNICO (NUEVO)
);
```

### Ejemplo de Registro Completo

```sql
-- Registro de ejemplo con id_articulo
{
  "id_actprecios": 1,
  "id_act": 6,
  "articulo": 123,
  "nombre": "BOMBA ACEITE HONDA CG TITAN 150",
  "pcosto": 6.97,      -- Precio anterior
  "precio": 8.44,      -- Precio anterior
  "pfinal": 8.44,      -- Precio anterior
  "pcoston": 7.67,     -- Precio nuevo (+10%)
  "precion": 9.28,     -- Precio nuevo recalculado
  "pfinaln": 9.28,     -- Precio nuevo recalculado
  "fecha": "2025-08-12",
  "id_articulo": 8836  -- ✅ IDENTIFICADOR ÚNICO AGREGADO
}
```

## 🔍 Consultas de Auditoría Mejoradas

### Consulta por Artículo Específico

```sql
-- ANTES (usando cd_articulo, puede tener duplicados):
SELECT * FROM dactualiza WHERE articulo = 123;

-- DESPUÉS (usando id_articulo, único y preciso):
SELECT d.*, a.nomart, a.marca 
FROM dactualiza d
JOIN artsucursal a ON d.id_articulo = a.id_articulo 
WHERE d.id_articulo = 8836;
```

### Historial Completo de un Artículo

```sql
-- Consulta optimizada con id_articulo
SELECT 
    c.fecha as fecha_actualizacion,
    c.tipo as tipo_modificacion,
    c.porcentaje_21 as porcentaje_aplicado,
    c.usuario,
    d.pcosto as precio_costo_anterior,
    d.pcoston as precio_costo_nuevo,
    d.precio as precio_final_anterior,
    d.precion as precio_final_nuevo,
    a.nomart as nombre_articulo,
    a.marca
FROM dactualiza d
JOIN cactualiza c ON d.id_act = c.id_act
JOIN artsucursal a ON d.id_articulo = a.id_articulo
WHERE d.id_articulo = 8836
ORDER BY c.fecha DESC;
```

## 🔄 Flujo Completo de Obtención y Uso del id_articulo

### **Paso a Paso del Proceso:**

```sql
-- PASO 1: OBTENCIÓN (Línea 117-126)
FOR rec IN 
    SELECT a.id_articulo,           -- 🎯 AQUÍ se obtiene el id_articulo
           a.cd_articulo, a.nomart, -- Datos adicionales del artículo
           a.precostosi, a.precon   -- Precios actuales
    FROM artsucursal a             -- 📋 TABLA ORIGEN: artsucursal
    WHERE a.cod_deposito = v_dep   -- Filtro por depósito/sucursal
      AND (filtros de marca/proveedor/rubro/iva...)

-- PASO 2: DISPONIBILIDAD EN LOOP
LOOP
    -- 📊 rec.id_articulo ahora contiene el valor real de la clave primaria
    -- Ejemplo: rec.id_articulo = 9102 (para "CADENA DIST.25x 90")
    
    -- PASO 3: USO EN AUDITORÍA (Línea 151-174)
    INSERT INTO dactualiza (
        id_act, articulo, nombre, 
        pcosto, precio, pfinal, pcoston, precion, pfinaln, fecha,
        id_articulo                    -- 🎯 AQUÍ se usa el id_articulo
    ) VALUES (
        v_id_act,
        rec.cd_articulo,              -- Código del artículo
        rec.nomart,                   -- Nombre del artículo
        rec.precostosi, rec.precon,   -- Precios anteriores
        p_nvo_costo, p_nvo_final,     -- Precios nuevos
        NOW()::date,
        rec.id_articulo               -- 🎯 VALOR INSERTADO: clave primaria exacta
    );
    
    -- PASO 4: ACTUALIZACIÓN (Línea 181-184)
    UPDATE artsucursal 
    SET precostosi = p_nvo_costo, precon = p_nvo_final
    WHERE id_articulo = rec.id_articulo; -- 🎯 AQUÍ se usa para la actualización
    
END LOOP;
```

### **Verificación de Coherencia:**
```sql
-- RESULTADO: dactualiza.id_articulo = artsucursal.id_articulo
-- Esto garantiza que cada registro de auditoría apunta exactamente 
-- al artículo que fue modificado, usando la clave primaria real
```

## 🚀 Plan de Implementación

### Paso 1: Aplicar Función Actualizada
```sql
-- Ejecutar: funcion_update_precios_masivo_CON_ID_ARTICULO.sql
-- Reemplaza la función existente con la versión mejorada
```

### Paso 2: Testing de Verificación  
```sql
-- PRUEBA 1: Ejecutar función con productos SDG
SELECT update_precios_masivo('SDG', NULL, NULL, NULL, 'costo', 1, 1, 'TEST_ID_ARTICULO');

-- PRUEBA 2: Verificar que se graba id_articulo correctamente
SELECT id_actprecios, articulo, id_articulo, nombre 
FROM dactualiza 
WHERE id_articulo IS NOT NULL;

-- PRUEBA 3: Validar integridad referencial (debe coincidir)
SELECT d.id_articulo as dactualiza_id, 
       a.id_articulo as artsucursal_id,
       d.nombre, a.nomart,
       'COINCIDE' as status
FROM dactualiza d
JOIN artsucursal a ON d.id_articulo = a.id_articulo
WHERE d.id_articulo IS NOT NULL;

-- PRUEBA 4: Confirmar que no hay registros sin id_articulo
SELECT COUNT(*) as registros_sin_id_articulo
FROM dactualiza 
WHERE id_articulo IS NULL OR id_articulo = 0;
```

### Paso 3: Validación Completa
- Confirmar que todos los registros incluyen `id_articulo`
- Verificar integridad referencial con `artsucursal`
- Validar que la funcionalidad existente no se ve afectada

## ⚡ Estimación de Implementación

| Actividad | Tiempo | Complejidad |
|-----------|--------|-------------|
| Aplicar función | 5 minutos | Muy Baja |
| Testing básico | 10 minutos | Baja |
| Validación completa | 15 minutos | Baja |
| **Total** | **30 minutos** | **Muy Baja** |

## 🔒 Riesgos y Mitigaciones

### Riesgos Identificados
- **Bajo:** Compatibilidad con registros existentes (tabla vacía actualmente)
- **Muy Bajo:** Impacto en rendimiento (un campo adicional insignificante)
- **Nulo:** Impacto en frontend (validado que no usa tabla dactualiza)

### Mitigaciones
- **Backup de función:** Mantener `funcion_update_precios_masivo_FINAL.sql` como respaldo
- **Testing gradual:** Probar con pocos registros antes de uso masivo
- **Rollback disponible:** Función anterior puede restaurarse inmediatamente

## ✅ Checklist de Implementación

- [x] **Análisis completado:** Función actual analizada y entendida
- [x] **Función modificada:** Versión con `id_articulo` creada
- [x] **Frontend validado:** Confirmado que no requiere cambios
- [x] **Testing preparado:** Plan de pruebas definido
- [x] **Documentación:** Guía completa creada

### Próximo Paso
**Aplicar función actualizada** y ejecutar testing de validación.

## 📝 Archivos Relacionados

- **Función actualizada:** `funcion_update_precios_masivo_CON_ID_ARTICULO.sql`
- **Función original:** `funcion_update_precios_masivo_FINAL.sql` (respaldo)
- **Documentación:** Este archivo (`ACTUALIZACION_ID_ARTICULO.md`)

## 🏁 Resultado Esperado

Después de la implementación, todos los registros de auditoría en `dactualiza` incluirán:
- ✅ Trazabilidad exacta con `id_articulo` único
- ✅ Capacidad de JOIN directo con `artsucursal`
- ✅ Consultas de auditoría más precisas y eficientes
- ✅ Compatibilidad total con sistema existente

**Estado:** Listo para implementación inmediata