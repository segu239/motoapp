# GENERADOR DE PRUEBAS - CAMBIO MASIVO DE PRECIOS
## Guía para Crear Documentos de Prueba desde /cambioprecios

**Fecha de Creación:** 18 de Agosto de 2025  
**Basado en:** cambioprecios.md, prueba7901.md, prueba10651_precio_final.md  
**Propósito:** Documentar el proceso estándar para generar pruebas de validación del sistema de cambio masivo de precios  

---

## 🎯 OBJETIVO

Esta guía proporciona un proceso sistemático para generar documentos de prueba que validen el funcionamiento correcto del sistema de cambio masivo de precios antes de aplicar modificaciones en producción.

---

## 📋 REQUISITOS PREVIOS

### 1. **Acceso a la Base de Datos**
- Conexión a PostgreSQL via MCP (`/MP`)
- Permisos de lectura en tablas: `artsucursal`, `conf_lista`, `rubros`, `marcas`

### 2. **Documentación de Referencia**
- **Base técnica:** `/cambioprecios.md` - Documentación completa del sistema
- **Ejemplos exitosos:** `prueba7901.md`, `prueba10651_precio_final.md`
- **Función SQL:** `FUNCION_update_precios_masivo_atomico_SINTAXIS_CORREGIDA.sql`

### 3. **Comandos MCP Requeridos**
- `/MP` - Para consultas a PostgreSQL
- `/MD` - Para lectura de archivos del proyecto

---

## 🔧 PROCESO DE GENERACIÓN DE PRUEBAS

### **PASO 1: Selección del Artículo de Prueba**

#### Criterios de Selección:
```sql
-- Buscar artículos con configuración completa
SELECT 
    a.id_articulo,
    a.codigo,
    a.nombrearticulo,
    a.marca,
    a.rubro,
    a.tipomone,
    a.codiva,
    ROUND(a.precostosi::numeric, 4) as precostosi,
    ROUND(a.prebsiva::numeric, 4) as prebsiva,
    ROUND(a.precon::numeric, 4) as precon,
    ROUND(a.prefi1::numeric, 4) as prefi1,
    ROUND(a.prefi2::numeric, 4) as prefi2,
    ROUND(a.prefi3::numeric, 4) as prefi3,
    ROUND(a.prefi4::numeric, 4) as prefi4
FROM artsucursal a
WHERE a.precostosi > 0 
  AND a.prebsiva > 0 
  AND a.precon > 0
  AND a.tipomone = 2  -- Moneda específica
  AND (a.prefi1 > 0 OR a.prefi2 > 0 OR a.prefi3 > 0)  -- Al menos una lista activa
ORDER BY RANDOM()
LIMIT 5;
```

#### **Recomendaciones:**
- ✅ **Artículos con prefi1-3 activos** (valores > 0)
- ✅ **Tipo moneda 2** (para usar configuración preciof21)
- ✅ **Margen conocido** (fácil de calcular y verificar)
- ✅ **Valores claros** (evitar decimales complejos para facilitar cálculos)

---

### **PASO 2: Obtener Configuración de Listas**

```sql
-- Obtener configuración actual de conf_lista
SELECT 
    listap,
    ROUND(preciof21::numeric, 4) as preciof21,
    ROUND(preciof105::numeric, 4) as preciof105,
    tipomone,
    activa,
    fecha
FROM conf_lista 
WHERE tipomone = 2 AND activa = true
ORDER BY listap;
```

#### **Información Requerida:**
- **Lista 1:** Porcentaje (normalmente -16.50%)
- **Lista 2:** Porcentaje (normalmente +5.50%)  
- **Lista 3:** Porcentaje (normalmente -33.00%)
- **Lista 4:** Estado (normalmente inactiva)

---

### **PASO 3: Calcular Estado Actual**

#### **Datos Base del Artículo:**
```sql
-- Consulta completa del artículo seleccionado
SELECT 
    a.id_articulo,
    a.codigo,
    a.nombrearticulo,
    m.descripcion as marca,
    r.descripcion as rubro,
    a.tipomone,
    a.codiva,
    ROUND(a.precostosi::numeric, 4) as precostosi,
    ROUND(a.prebsiva::numeric, 4) as prebsiva,
    ROUND(a.precon::numeric, 4) as precon,
    ROUND(a.prefi1::numeric, 4) as prefi1,
    ROUND(a.prefi2::numeric, 4) as prefi2,
    ROUND(a.prefi3::numeric, 4) as prefi3,
    ROUND(a.prefi4::numeric, 4) as prefi4
FROM artsucursal a
LEFT JOIN marcas m ON a.marca = m.codigo
LEFT JOIN rubros r ON a.rubro = r.codigo
WHERE a.id_articulo = [ID_ARTICULO_SELECCIONADO];
```

#### **Cálculos de Verificación:**
```sql
-- Verificar relaciones actuales
SELECT 
    id_articulo,
    ROUND(((prebsiva / precostosi - 1) * 100), 2) as margen_actual,
    ROUND(((precon / prebsiva - 1) * 100), 2) as iva_actual,
    ROUND((prefi1 / precon), 4) as factor_lista1,
    ROUND((prefi2 / precon), 4) as factor_lista2,
    ROUND((prefi3 / precon), 4) as factor_lista3
FROM artsucursal 
WHERE id_articulo = [ID_ARTICULO_SELECCIONADO];
```

---

### **PASO 4: Definir Tipo de Prueba**

#### **Modalidad A: Incremento por Precio de Costo**
```
Incremento base: +X% sobre precostosi
Propagación: costo → prebsiva → precon → prefi1-4
Objetivo: Control del margen de ganancia
```

#### **Modalidad B: Incremento por Precio Final**
```
Incremento base: +X% sobre precon
Cálculo inverso: precon → prebsiva → precostosi → prefi1-4
Objetivo: Control del precio de venta final
```

#### **Seleccionar Porcentaje de Prueba:**
- **Recomendado:** 10% (fácil de calcular y verificar)
- **Alternativos:** 5%, 15%, 20% según necesidad

---

### **PASO 5: Generar Previsiones**

#### **Para Modalidad COSTO (+X%):**
```
nuevo_precostosi = precostosi_actual × (1 + X/100)
nuevo_prebsiva = nuevo_precostosi × factor_margen
nuevo_precon = nuevo_prebsiva × factor_iva
nuevo_prefi1 = nuevo_precon × factor_lista1
nuevo_prefi2 = nuevo_precon × factor_lista2
nuevo_prefi3 = nuevo_precon × factor_lista3
```

#### **Para Modalidad FINAL (+X%):**
```
nuevo_precon = precon_actual × (1 + X/100)
nuevo_prebsiva = nuevo_precon ÷ factor_iva
nuevo_precostosi = nuevo_prebsiva ÷ factor_margen
nuevo_prefi1 = nuevo_precon × factor_lista1
nuevo_prefi2 = nuevo_precon × factor_lista2
nuevo_prefi3 = nuevo_precon × factor_lista3
```

#### **Cálculo de Factores:**
```sql
-- Factores basados en estado actual
SELECT 
    (prebsiva / precostosi) as factor_margen,
    (precon / prebsiva) as factor_iva,
    (prefi1 / precon) as factor_lista1,
    (prefi2 / precon) as factor_lista2,
    (prefi3 / precon) as factor_lista3
FROM artsucursal 
WHERE id_articulo = [ID_ARTICULO_SELECCIONADO];
```

---

### **PASO 6: Crear Tabla Comparativa**

#### **Estructura Estándar:**
```markdown
| Campo | Valor Actual | Valor Esperado | Incremento | % Incremento |
|-------|-------------|---------------|------------|-------------|
| **precostosi** | $X.XXXX | $X.XXXX | +$X.XXXX | **+XX.XX%** |
| **prebsiva** | $X.XXXX | $X.XXXX | +$X.XXXX | **+XX.XX%** |
| **precon** | $X.XXXX | $X.XXXX | +$X.XXXX | **+XX.XX%** |
| **prefi1** | $X.XXXX | $X.XXXX | +$X.XXXX | **+XX.XX%** |
| **prefi2** | $X.XXXX | $X.XXXX | +$X.XXXX | **+XX.XX%** |
| **prefi3** | $X.XXXX | $X.XXXX | +$X.XXXX | **+XX.XX%** |
| **prefi4** | $X.XXXX | $X.XXXX | +$X.XXXX | **+XX.XX%** |
```

---

### **PASO 7: Definir Comandos de Verificación**

#### **Verificación Post-Operación:**
```sql
-- Estado final del artículo
SELECT 
    id_articulo,
    ROUND(precostosi::numeric, 4) as precostosi,
    ROUND(prebsiva::numeric, 4) as prebsiva,
    ROUND(precon::numeric, 4) as precon,
    ROUND(prefi1::numeric, 4) as prefi1,
    ROUND(prefi2::numeric, 4) as prefi2,
    ROUND(prefi3::numeric, 4) as prefi3,
    ROUND(prefi4::numeric, 4) as prefi4
FROM artsucursal 
WHERE id_articulo = [ID_ARTICULO];
```

#### **Verificación de Relaciones:**
```sql
-- Verificar preservación de márgenes y configuraciones
SELECT 
    id_articulo,
    ROUND(((prebsiva / precostosi - 1) * 100), 2) as margen_verificado,
    ROUND(((precon / prebsiva - 1) * 100), 2) as iva_verificado,
    ROUND(((prefi1 / precon)), 4) as factor_lista1_verificado,
    ROUND(((prefi2 / precon)), 4) as factor_lista2_verificado,
    ROUND(((prefi3 / precon)), 4) as factor_lista3_verificado
FROM artsucursal 
WHERE id_articulo = [ID_ARTICULO];
```

#### **Verificación de conf_lista (NO debe cambiar):**
```sql
-- Confirmar que conf_lista permanece inalterada
SELECT 
    listap,
    ROUND(preciof21::numeric, 4) as preciof21,
    ROUND(preciof105::numeric, 4) as preciof105,
    activa,
    fecha
FROM conf_lista 
WHERE tipomone = 2 AND activa = true
ORDER BY listap;
```

---

## 📝 PLANTILLA DE DOCUMENTO DE PRUEBA

### **Estructura Recomendada:**

```markdown
# ANÁLISIS Y PREVISIONES - ARTÍCULO [ID]
## [Tipo de Aumento] [Porcentaje]% [Modalidad]

**Fecha de Análisis**: [Fecha]  
**Función SQL Utilizada**: FUNCION_update_precios_masivo_atomico_SINTAXIS_CORREGIDA.sql  
**Operación**: [Descripción detallada]  

---

## 📋 INFORMACIÓN DEL ARTÍCULO
[Tabla con datos básicos del artículo]

---

## 🔍 CONFIGURACIÓN APLICABLE (CONF_LISTA)
[Tabla con configuración de listas de precios]

---

## 📊 ESTADO ACTUAL (ANTES DEL AUMENTO)
[Tabla con valores actuales y verificaciones]

---

## 🎯 PREVISIONES DESPUÉS DEL AUMENTO
[Cálculos paso a paso de los valores esperados]

---

## 📈 TABLA COMPARATIVA: ANTES vs DESPUÉS
[Tabla comparativa con incrementos]

---

## ✅ VALIDACIONES ESPERADAS
[Lista de checkpoints críticos]

---

## 🎯 COMANDOS DE VERIFICACIÓN POST-OPERACIÓN
[Scripts SQL para validar resultados]

---

## 🚨 PUNTOS CRÍTICOS DE VALIDACIÓN
[Lista de verificaciones obligatorias]

---

## 📝 CONCLUSIÓN
[Resumen y estado de preparación]
```

---

## 🚨 PUNTOS CRÍTICOS DE VALIDACIÓN

### **Validaciones Obligatorias:**

1. **✅ Incremento Exacto**
   - El campo base (costo o precio final) debe incrementar exactamente el porcentaje especificado

2. **✅ Preservación de Relaciones**
   - Margen de ganancia debe mantenerse (prebsiva/precostosi)
   - Porcentaje de IVA debe mantenerse (precon/prebsiva)

3. **✅ Configuración de Listas Intacta**
   - `conf_lista` NO debe modificarse
   - Factores de lista deben aplicarse correctamente

4. **✅ Cálculo de prefi1-4**
   - Todos los precios de lista deben recalcularse
   - Usar configuración actual de conf_lista

5. **✅ Redondeo Consistente**
   - Todos los valores a 4 decimales según función SQL

---

## 🔄 CASOS DE PRUEBA RECOMENDADOS

### **Artículos Sugeridos para Pruebas:**
- **Con margen simple:** 50%, 80%, 100%
- **Con margen complejo:** 108.06%, 123.45%
- **Con diferentes tipos de moneda:** tipomone = 1, 2
- **Con diferentes configuraciones de IVA:** codiva = 1, 2, 3

### **Porcentajes de Prueba:**
- **Incrementos:** +5%, +10%, +15%, +20%
- **Decrementos:** -5%, -10%, -15%
- **Casos extremos:** +50%, +100%

---

## 📚 REFERENCIAS Y EJEMPLOS

### **Documentos de Referencia:**
- **`cambioprecios.md`**: Documentación técnica completa del sistema
- **`prueba7901.md`**: Ejemplo de prueba por precio de costo
- **`prueba10651_precio_final.md`**: Ejemplo de prueba por precio final

### **Comandos MCP Utilizados:**
- **`/MP`**: Consultas a PostgreSQL
- **`/MD`**: Lectura de archivos del proyecto

### **Archivos SQL Relacionados:**
- **`FUNCION_update_precios_masivo_atomico_SINTAXIS_CORREGIDA.sql`**: Función principal
- **`test_funcion_corregida_prefi.sql`**: Pruebas de validación

---

## ⚡ AUTOMATIZACIÓN SUGERIDA

### **Script de Generación Rápida:**
```sql
-- Comando único para generar datos base de prueba
WITH articulo_seleccionado AS (
    SELECT id_articulo FROM artsucursal 
    WHERE precostosi > 0 AND prebsiva > 0 AND precon > 0 
    AND tipomone = 2 AND prefi1 > 0
    ORDER BY RANDOM() LIMIT 1
),
datos_articulo AS (
    SELECT a.*, m.descripcion as marca_desc, r.descripcion as rubro_desc
    FROM artsucursal a
    JOIN articulo_seleccionado sel ON a.id_articulo = sel.id_articulo
    LEFT JOIN marcas m ON a.marca = m.codigo
    LEFT JOIN rubros r ON a.rubro = r.codigo
),
configuracion_listas AS (
    SELECT * FROM conf_lista 
    WHERE tipomone = 2 AND activa = true
    ORDER BY listap
)
SELECT 
    'DATOS_ARTICULO' as seccion,
    da.id_articulo,
    da.codigo,
    da.nombrearticulo,
    da.marca_desc,
    da.rubro_desc,
    da.tipomone,
    da.codiva,
    ROUND(da.precostosi::numeric, 4) as precostosi,
    ROUND(da.prebsiva::numeric, 4) as prebsiva,
    ROUND(da.precon::numeric, 4) as precon,
    ROUND(da.prefi1::numeric, 4) as prefi1,
    ROUND(da.prefi2::numeric, 4) as prefi2,
    ROUND(da.prefi3::numeric, 4) as prefi3,
    ROUND(da.prefi4::numeric, 4) as prefi4
FROM datos_articulo da
UNION ALL
SELECT 
    'CONFIG_LISTAS' as seccion,
    cl.listap::text,
    null, null, null, null, null, null,
    ROUND(cl.preciof21::numeric, 4),
    null, null, null, null, null, null
FROM configuracion_listas cl;
```

---

## 📞 SOPORTE Y MANTENIMIENTO

### **En caso de Errores:**
1. **Verificar función SQL**: Revisar sintaxis en archivo corregido
2. **Validar configuración**: Confirmar conf_lista activa
3. **Revisar permisos**: Verificar acceso a tablas necesarias

### **Actualizaciones del Proceso:**
- Documentar nuevos casos de prueba exitosos
- Actualizar plantillas según nuevos requerimientos
- Mantener referencias actualizadas

---

**Estado del Documento:** ✅ **LISTO PARA USO**  
**Próxima Revisión:** Según necesidades del proyecto  
**Contacto:** Documentado en /cambioprecios.md