# PLAN DE IMPLEMENTACIÓN CORREGIDO - REPARACIONES DACTUALIZA

## 🛠️ PLAN DE IMPLEMENTACIÓN PARA REPARACIONES

### **FASE 1: Corrección del INSERT en `dactualiza`**

**Archivo a modificar:** `FUNCION_update_precios_masivo_atomico_SINTAXIS_CORREGIDA.sql`

**Líneas 144-153** - Reemplazar el INSERT actual por:

```sql
INSERT INTO dactualiza (
    id_act, id_articulo, articulo, nombre, pcosto, descto, margen, precio, pfinal,
    pcoston, descton, margenn, precion, pfinaln, fecha
) VALUES (
    v_id_act, rec.id_articulo, COALESCE(rec.cd_articulo, 0),
    COALESCE(rec.nomart, ''), COALESCE(rec.precostosi, 0),
    NULL, -- descto (descuento original)
    COALESCE(margen_producto, 0), -- margen original
    COALESCE(rec.prebsiva, 0), -- precio sin IVA original
    COALESCE(rec.precon, 0), -- precio final original
    COALESCE(p_nvo_costo, 0), -- nuevo costo
    NULL, -- descton (descuento nuevo - mantener NULL)
    NULL, -- margenn (margen nuevo - mantener NULL)
    COALESCE(p_nvo_prebsiva, 0), -- ✅ CORRECCIÓN: precion = nuevo prebsiva
    COALESCE(p_nvo_final, 0), -- nuevo precio final
    NOW()
);
```

### **FASE 2: Verificación y Pruebas**

**2.1 Comando de Verificación Post-Corrección:**
```sql
-- Verificar estructura de la tabla dactualiza
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dactualiza' 
ORDER BY ordinal_position;

-- Probar la función corregida con artículo 10651
SELECT update_precios_masivo_atomico(
    p_marca := NULL,
    p_cd_proveedor := NULL, 
    p_rubro := NULL,
    p_cod_iva := NULL,
    p_tipo_modificacion := 'final',
    p_porcentaje := 10,
    p_sucursal := 1,
    p_usuario := 'TEST_CORRECTION'
);
```

**2.2 Validación de Resultados:**
```sql
-- Verificar valores en dactualiza después de la corrección
SELECT 
    id_articulo,
    ROUND(precion::numeric, 4) as precion_nuevo,
    ROUND(margen::numeric, 4) as margen_original,
    descto as descto_original
FROM dactualiza 
WHERE id_articulo = 10651 
ORDER BY fecha DESC LIMIT 1;

-- Comparar con artsucursal
SELECT 
    'artsucursal' as tabla,
    ROUND(prebsiva::numeric, 4) as prebsiva_valor,
    ROUND(margen::numeric, 2) as margen_producto
FROM artsucursal 
WHERE id_articulo = 10651
UNION ALL
SELECT 
    'dactualiza' as tabla,
    ROUND(precion::numeric, 4) as prebsiva_valor,
    ROUND(margen::numeric, 2) as margen_producto
FROM dactualiza 
WHERE id_articulo = 10651 
ORDER BY fecha DESC LIMIT 1;
```

### **FASE 3: Crear Función Corregida**

**Archivos a generar:**
1. `FUNCION_update_precios_masivo_atomico_CORRECCION_DACTUALIZA.sql`
2. `test_correccion_dactualiza.sql`

### **FASE 4: Documentación de Cambios**

**4.1 Actualizar documentación técnica**
**4.2 Crear reporte de pruebas corregidas**

## 📋 CRONOGRAMA DE IMPLEMENTACIÓN

| Fase | Tiempo Estimado | Responsabilidad |
|------|----------------|-----------------|
| **Fase 1** | 15 minutos | Corrección de código SQL |
| **Fase 2** | 30 minutos | Pruebas y validación |
| **Fase 3** | 10 minutos | Generación de archivos |
| **Fase 4** | 15 minutos | Documentación |
| **TOTAL** | **70 minutos** | |

## 🔍 PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: Campo `precion` incorrecto en `dactualiza`**

**Estado Actual:**
- `precion` en dactualiza: `3.9125`
- `prebsiva` en artsucursal: `1.5500`
- **Error**: El campo `precion` debería ser igual a `prebsiva` (1.5500), no 3.9125

**Causa Raíz:**
En la función SQL línea 151:
```sql
precion = COALESCE(p_nvo_final, 0),  -- ❌ INCORRECTO: debería ser p_nvo_prebsiva
```

### **PROBLEMA 2: Campos `margen` y `descto` no se graban**

**Estado Actual:**
- `margen` en dactualiza: `NULL`
- `descto` en dactualiza: `NULL`
- **Error**: Deberían contener los valores del margen y descuento originales del artículo

**Causa Raíz:**
En la función SQL líneas 144-153, la inserción en `dactualiza` no incluye los campos `margen` y `descto`:
```sql
INSERT INTO dactualiza (
    id_act, id_articulo, articulo, nombre, pcosto, precio, pfinal,
    pcoston, precion, pfinaln, fecha
    -- ❌ FALTAN: margen, descto
)
```

## 🚨 PUNTOS CRÍTICOS DE VALIDACIÓN

1. ✅ **Verificar que `precion` = `prebsiva` en artsucursal**
2. ✅ **Confirmar que `margen` contiene el margen original del producto**
3. ✅ **Validar que `descto` se maneje correctamente**
4. ✅ **Asegurar que los cálculos de precios siguen siendo correctos**

## 📊 RESUMEN EJECUTIVO

### 🔴 **PROBLEMAS CRÍTICOS ENCONTRADOS:**

1. **Campo `precion` incorrecto**: Valor actual 3.9125, debería ser 1.5500 (igual a `prebsiva`)
2. **Campos `margen` y `descto` no se graban**: Ambos están en NULL cuando deberían contener los valores de margen y descuento

### ✅ **RESULTADOS POSITIVOS:**

- Los precios finales se calculan correctamente en `artsucursal`
- La función ejecuta sin errores de sintaxis
- Los valores de `prefi1-4` se actualizan apropiadamente

### 🛠️ **SOLUCIÓN PROPUESTA:**

La reparación requiere modificar el INSERT en `dactualiza` (líneas 144-153) para:
- Corregir `precion` para que refleje `p_nvo_prebsiva` en lugar de `p_nvo_final`
- Agregar los campos `margen` y `descto` al INSERT
- Incluir el valor del margen del producto en `margen`

**Tiempo de implementación estimado**: 70 minutos
**Impacto**: Corrección sin afectar funcionalidad principal de actualización de precios