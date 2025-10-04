# PROBLEMA CRÍTICO: FUNCIÓN update_precios_masivo_atomico - CONFLISTAS NO SE ACTUALIZAN

**Fecha del Hallazgo:** 15 de Agosto de 2025  
**Severidad:** CRÍTICA  
**Impacto:** Sistema de actualización de precios incompleto  
**Estado:** IDENTIFICADO - REQUIERE CORRECCIÓN INMEDIATA

## RESUMEN EJECUTIVO

La función `update_precios_masivo_atomico` presenta un defecto crítico en la lógica de actualización de conflistas (tabla `conf_lista`). Mientras que los precios principales en `artsucursal` se actualizan correctamente, las conflistas NO se procesan debido a criterios de búsqueda incorrectos en el algoritmo.

## EVIDENCIA DEL PROBLEMA

### Caso de Prueba Realizado
- **Artículo:** 8836 (marca SDG, cod_iva=1)
- **Operación:** Cambio masivo de precios por marca "SDG"
- **Resultado:** `"conflistas_actualizadas": 0`
- **Fecha de prueba:** 2025-08-15

### Conflistas Que Debieron Actualizarse
Según los datos verificados en la base de datos, existen conflistas activas con `tipomone=1` que debieron procesarse:

```sql
-- Conflistas activas encontradas:
ID 1: listap=1, tipomone=1, precosto21=100, preciof21=16, activa=true
ID 3: listap=3, tipomone=1, precosto21=0, preciof21=-30, activa=true
```

### Verificación de Actualización
```sql
-- Ninguna conflista fue actualizada en la fecha de la prueba:
SELECT * FROM conf_lista WHERE fecha = '2025-08-15';
-- Resultado: 0 registros
```

## ANÁLISIS TÉCNICO DEL DEFECTO

### Lógica Actual (INCORRECTA)
La función busca conflistas usando este criterio en las líneas 222-228:

```sql
WHERE cl.activa = true
AND (
    (p_marca IS NOT NULL AND TRIM(cl.cod_marca) = TRIM(p_marca))
    OR (p_marca IS NULL AND EXISTS (
        SELECT 1 FROM artsucursal a 
        WHERE TRIM(a.marca) = TRIM(cl.cod_marca)
        AND a.id_articulo = ANY(v_articulos_modificados)
    ))
)
```

**PROBLEMA IDENTIFICADO:** La función busca conflistas por coincidencia de `cod_marca`, pero:

1. **Artículo 8836:** marca = "SDG"
2. **Conflistas existentes:** cod_marca = "1" y "NEA5" (NO "SDG")
3. **Resultado:** No hay coincidencia, por lo tanto 0 conflistas procesadas

### Lógica Esperada (CORRECTA)
Según el análisis del dominio del negocio, las conflistas deben buscarse por:
- **tipomone** (tipo de moneda)
- **cod_iva** (tipo de IVA)

NO por marca específica.

### Estructura de Datos Verificada

**Tabla conf_lista:**
```
- tipomone: Tipo de moneda (1, 2, 3...)
- listap: Lista de precios (1, 2, 3...)
- cod_marca: Campo que almacena códigos, NO marcas de productos
- cod_iva: NO existe en conf_lista (debe inferirse del contexto)
```

**Tabla artsucursal:**
```
- marca: Marca del producto (ej: "SDG")
- cod_iva: Código de IVA (1=21%, etc.)
- tipomone: NO existe en artsucursal
```

## IMPACTO EN EL SISTEMA

### Funcionalidades Afectadas
✅ **CORRECTO:** Precios principales (artsucursal) se actualizan correctamente  
❌ **DEFECTUOSO:** Conflistas (conf_lista) NO se actualizan  
❌ **INCONSISTENCIA:** Sistema queda en estado parcialmente actualizado  

### Consecuencias del Negocio
1. **Precios base actualizados** pero **listas especiales desactualizadas**
2. **Clientes con listas especiales** mantienen precios antiguos
3. **Posible pérdida económica** por precios incorrectos
4. **Inconsistencia de datos** en el sistema de gestión

### Riesgo de Integridad
- Los precios base y las conflistas quedan desincronizados
- Los reportes de precios pueden mostrar información incorrecta
- Las ventas pueden procesarse con precios obsoletos

## CASOS DE USO FALLIDOS

### Escenario Típico
1. Usuario ejecuta cambio masivo de precios por marca "SDG" +10%
2. **Esperado:** Actualizar precios base Y conflistas relacionadas
3. **Actual:** Solo actualiza precios base, conflistas quedan obsoletas

### Distribución de Conflistas por TipoMone
```
tipomone=1: 2 conflistas activas (IDs: 1, 3)
tipomone=2: 3 conflistas activas (IDs: 18, 5, 6)
tipomone=3: 3 conflistas activas (IDs: 22, 23, 25)
```

## ANÁLISIS DE LA SOLUCIÓN REQUERIDA

### Criterio de Búsqueda Correcto
Las conflistas deben seleccionarse basándose en:

```sql
-- LÓGICA PROPUESTA (pendiente de validación con usuario):
WHERE cl.activa = true
AND cl.tipomone = [tipomone_del_contexto]
AND [criterio_iva_correspondiente]
```

### Información Faltante para la Corrección
❓ **REQUIERE CLARIFICACIÓN DEL USUARIO:**
1. ¿Cómo determinar el `tipomone` correcto para las conflistas?
2. ¿Existe relación entre `cod_iva` del artículo y las conflistas?
3. ¿Las conflistas se actualizan por `tipomone` únicamente o hay otros criterios?
4. ¿El campo `cod_marca` en conflistas es realmente una marca o un código interno?

## RECOMENDACIONES TÉCNICAS

### Acciones Inmediatas
1. **SUSPENDER** uso de la función en producción hasta corrección
2. **VALIDAR** con usuario final el criterio correcto de actualización
3. **REVISAR** documentación del sistema sobre lógica de conflistas
4. **CREAR** casos de prueba específicos para validar la corrección

### Plan de Corrección
1. **Fase 1:** Clarificar reglas de negocio con usuario
2. **Fase 2:** Modificar lógica de selección de conflistas
3. **Fase 3:** Probar exhaustivamente con datos reales
4. **Fase 4:** Documentar el comportamiento correcto

### Pruebas Requeridas
- Validar actualización por diferentes `tipomone`
- Verificar que no se actualicen conflistas incorrectas
- Confirmar atomicidad de la transacción completa
- Probar rollback en casos de error

## CÓDIGO PROBLEMÁTICO IDENTIFICADO

**Archivo:** `funcion_update_precios_masivo_atomico.sql`  
**Líneas:** 208-229 y 222-228 específicamente  
**Sección:** Procesamiento masivo de conflistas  

```sql
-- LÓGICA ACTUAL DEFECTUOSA:
FOR rec_conflista IN
    SELECT DISTINCT 
        cl.id_conflista, cl.listap, cl.cod_marca, ...
    FROM conf_lista cl
    WHERE cl.activa = true
    AND (
        (p_marca IS NOT NULL AND TRIM(cl.cod_marca) = TRIM(p_marca))  -- ⚠️ PROBLEMA AQUÍ
        OR (p_marca IS NULL AND EXISTS (
            SELECT 1 FROM artsucursal a 
            WHERE TRIM(a.marca) = TRIM(cl.cod_marca)  -- ⚠️ Y AQUÍ
            AND a.id_articulo = ANY(v_articulos_modificados)
        ))
    )
```

## ESTADO ACTUAL

**RESULTADO DE LA FUNCIÓN:**
```json
{
    "success": true,
    "message": "Actualización atómica completada exitosamente",
    "registros_modificados": [número_correcto],
    "conflistas_actualizadas": 0,  // ⚠️ SIEMPRE 0 - PROBLEMA CRÍTICO
    "atomica": true
}
```

## CONCLUSIÓN

La función `update_precios_masivo_atomico` está **parcialmente funcional** pero **críticamente defectuosa**. Actualiza correctamente los precios principales pero ignora completamente las conflistas debido a una lógica de búsqueda incorrecta basada en marcas en lugar de tipos de moneda e IVA.

**ACCIÓN REQUERIDA:** Corrección inmediata de la lógica de selección de conflistas previo a clarificación de reglas de negocio con el usuario final.

---
**Documento generado:** 15 de Agosto de 2025  
**Versión función analizada:** update_precios_masivo_atomico  
**Próxima acción:** Validación de reglas de negocio con usuario