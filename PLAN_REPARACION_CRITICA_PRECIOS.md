# PLAN DE REPARACIÓN CRÍTICA - SISTEMA DE CAMBIO DE PRECIOS

**Fecha de Análisis:** 15 de Agosto de 2025  
**Estado:** 🚨 **PROBLEMA CRÍTICO IDENTIFICADO**  
**Prioridad:** **URGENTE** - Función de aplicación produce resultados incorrectos  
**Artículo de Prueba:** 9152 - ZAPATA FRENO YAMAHA FZ  

---

## 📋 **RESUMEN EJECUTIVO**

### **Problema Identificado:**
La función `update_precios_masivo_atomico()` (usada por el frontend) **NO respeta el margen** individual de cada producto, causando cálculos incorrectos de precios finales.

### **Impacto Crítico:**
- ❌ Precios finales incorrectos en producción
- ❌ Inconsistencia entre preview (correcto) y aplicación (incorrecto)
- ❌ Pérdidas económicas por precios mal calculados
- ❌ Sistema no confiable para operaciones comerciales

---

## 🔍 **ANÁLISIS TÉCNICO DETALLADO**

### **Funciones Analizadas:**

1. ✅ **`preview_cambios_precios()`** - **FUNCIONA CORRECTAMENTE**
   - Incluye campo `margen` en SELECT
   - Calcula: Costo → Prebsiva (con margen) → Final (con IVA)
   - Respeta margen negativo (-10%)

2. ❌ **`update_precios_masivo_atomico()`** - **FUNCIÓN DEFECTUOSA**
   - **NO incluye** campo `margen` en SELECT
   - Calcula: Costo → Final (IVA directo, ignora margen)
   - **NO actualiza** campo `prebsiva`

### **Evidencia del Problema - Artículo 9152:**

| Campo | Preview (Correcto) | Apply (Incorrecto) | Diferencia |
|-------|-------------------|-------------------|------------|
| **Costo Nuevo** | $1,459.09 | $1,459.09 | ✅ Igual |
| **Prebsiva** | $1,313.19 | $1,193.81 | ❌ NO actualizado |
| **Final Nuevo** | $1,588.95 | $1,765.50 | ❌ $176.55 diferencia |

**Cálculo Incorrecto Aplicado:**
```sql
-- FUNCIÓN DEFECTUOSA (update_precios_masivo_atomico):
p_nvo_final := p_nvo_costo * (1 + aliq_iva / 100.0);
-- Resultado: $1,459.09 × 1.21 = $1,765.50
```

**Cálculo Correcto Esperado:**
```sql
-- FUNCIÓN CORRECTA (preview_cambios_precios):
p_prebsiva_nuevo := p_costo_nuevo * (1 + margen_producto / 100.0);
p_final_nuevo := p_prebsiva_nuevo * (1 + aliq_iva / 100.0);
-- Resultado: $1,459.09 × 0.90 × 1.21 = $1,588.95
```

---

## 🎯 **DIFERENCIAS CRÍTICAS IDENTIFICADAS**

### **1. Campo Margen Ausente:**
```sql
-- ❌ FUNCIÓN DEFECTUOSA (línea SELECT):
SELECT id_articulo, cd_articulo, nomart, marca, precostosi, precon, cod_iva
-- FALTA: margen

-- ✅ FUNCIÓN CORRECTA:
SELECT a.cd_articulo, a.nomart, a.marca, a.rubro,
       a.precostosi, a.precon, a.cod_iva, a.margen  -- ✅ INCLUYE margen
```

### **2. Lógica de Cálculo Incorrecta:**
```sql
-- ❌ FUNCIÓN DEFECTUOSA:
IF v_tipo_real = 'costo' THEN
    p_nvo_costo := p_act * (1 + p_porcentaje / 100.0);
    p_nvo_final := p_nvo_costo * (1 + aliq_iva / 100.0);  -- ❌ SIN MARGEN
END IF;

-- ✅ FUNCIÓN CORRECTA:
IF p_tipo_modificacion = 'costo' THEN
    p_costo_nuevo := p_costo_actual * (1 + p_porcentaje / 100.0);
    p_prebsiva_nuevo := p_costo_nuevo * (1 + margen_producto / 100.0);  -- ✅ CON MARGEN
    p_final_nuevo := p_prebsiva_nuevo * (1 + aliq_iva / 100.0);        -- ✅ IVA SOBRE PREBSIVA
END IF;
```

### **3. Campo Prebsiva NO Actualizado:**
```sql
-- ❌ FUNCIÓN DEFECTUOSA:
UPDATE artsucursal SET 
    precostosi = ROUND(p_nvo_costo, 2),
    precon = ROUND(p_nvo_final, 2)
    -- FALTA: prebsiva

-- ✅ FUNCIÓN CORRECTA:
UPDATE artsucursal SET 
    precostosi = ROUND(p_costo_nuevo, 2),
    precon = ROUND(p_final_nuevo, 2),
    prebsiva = ROUND(p_prebsiva_nuevo, 2)  -- ✅ ACTUALIZAR PREBSIVA
```

---

## 🔧 **PLAN DE REPARACIÓN COMPLETO**

### **FASE 1: PREPARACIÓN (INMEDIATA)**

#### **1.1 Backup de Seguridad:**
```sql
-- Crear tabla de respaldo
CREATE TABLE backup_artsucursal_20250815 AS 
SELECT * FROM artsucursal WHERE fecha > '2025-08-15';

-- Verificar backup
SELECT COUNT(*) FROM backup_artsucursal_20250815;
```

#### **1.2 Crear Función Corregida:**
- Generar `update_precios_masivo_atomico_CORREGIDO()`
- Mantener firma idéntica para compatibilidad
- Incluir lógica completa con margen y prebsiva

### **FASE 2: IMPLEMENTACIÓN (CRÍTICA)**

#### **2.1 Despliegue de Función Corregida:**
```sql
-- Renombrar función actual (respaldo)
ALTER FUNCTION update_precios_masivo_atomico 
RENAME TO update_precios_masivo_atomico_DEFECTUOSA;

-- Desplegar función corregida
CREATE OR REPLACE FUNCTION update_precios_masivo_atomico(...)
-- [Función completa corregida]
```

#### **2.2 Pruebas de Validación:**
- Probar artículo 9152 nuevamente
- Verificar consistencia preview vs apply
- Comprobar todos los campos (costo, prebsiva, final)

### **FASE 3: CORRECCIÓN RETROSPECTIVA (URGENTE)**

#### **3.1 Identificar Registros Afectados:**
```sql
-- Buscar todos los cambios aplicados hoy con la función defectuosa
SELECT * FROM dactualiza 
WHERE fecha >= '2025-08-15' 
AND pfinaln != (pcoston * (1 + margen/100) * 1.21);
```

#### **3.2 Script de Corrección Masiva:**
- Recalcular precios usando margen correcto
- Actualizar artsucursal con valores correctos
- Registrar correcciones en auditoría

### **FASE 4: VERIFICACIÓN Y MONITOREO**

#### **4.1 Pruebas Exhaustivas:**
- Artículos con margen positivo
- Artículos con margen negativo  
- Artículos sin margen definido
- Diferentes códigos de IVA

#### **4.2 Auditoría Post-Implementación:**
- Verificar consistencia en 100 artículos aleatorios
- Comprobar integridad de conflistas
- Validar trazabilidad completa

---

## ⏱️ **CRONOGRAMA DE EJECUCIÓN**

| Fase | Tiempo Estimado | Prioridad | Estado |
|------|----------------|-----------|---------|
| **Backup y Preparación** | 15 minutos | CRÍTICA | ⏳ Pendiente |
| **Función Corregida** | 30 minutos | CRÍTICA | ⏳ Pendiente |
| **Despliegue** | 15 minutos | CRÍTICA | ⏳ Pendiente |
| **Corrección Retroactiva** | 60 minutos | URGENTE | ⏳ Pendiente |
| **Pruebas y Validación** | 45 minutos | ALTA | ⏳ Pendiente |
| **Documentación** | 30 minutos | MEDIA | ⏳ Pendiente |

**⏰ TIEMPO TOTAL ESTIMADO:** 3.25 horas

---

## 🚨 **RIESGOS Y MITIGACIONES**

### **Riesgos Identificados:**
1. **Datos Inconsistentes**: Función defectuosa ya aplicada en producción
2. **Pérdidas Comerciales**: Precios incorrectos afectan márgenes
3. **Falta de Confianza**: Sistema no confiable para operaciones críticas

### **Mitigaciones:**
1. **Backup Completo** antes de cualquier cambio
2. **Rollback Preparado** en caso de fallas
3. **Corrección Retroactiva** para datos ya afectados
4. **Pruebas Exhaustivas** antes de producción

---

## 📊 **MÉTRICAS DE ÉXITO**

### **Criterios de Aceptación:**
- ✅ Preview y Apply producen resultados idénticos
- ✅ Margen respetado en todos los cálculos
- ✅ Prebsiva actualizada correctamente
- ✅ IVA aplicado sobre prebsiva, no sobre costo directo
- ✅ Auditoría completa y trazable

### **Validaciones Técnicas:**
```sql
-- Test de consistencia
SELECT 
    id_articulo,
    precostosi as costo,
    prebsiva,
    precon as final,
    margen,
    -- Validar: prebsiva = costo * (1 + margen/100)
    ROUND(precostosi * (1 + margen/100.0), 2) as prebsiva_esperada,
    -- Validar: final = prebsiva * (1 + iva/100)  
    ROUND(prebsiva * 1.21, 2) as final_esperado
FROM artsucursal 
WHERE id_articulo = 9152;
```

---

## 🎯 **CONCLUSIONES Y RECOMENDACIONES**

### **Conclusión Crítica:**
El sistema tiene un **BUG CRÍTICO** en la función de aplicación que causa cálculos incorrectos sistemáticamente. La reparación es **URGENTE** y debe implementarse antes de cualquier operación comercial adicional.

### **Recomendaciones:**
1. **Implementar INMEDIATAMENTE** la función corregida
2. **Suspender** uso del sistema hasta corrección
3. **Revisar TODOS** los cambios aplicados desde el 15/08/2025
4. **Establecer** pruebas automáticas para evitar regresiones futuras

---

*Este plan debe ejecutarse con la máxima prioridad para restaurar la integridad del sistema de precios.*