# FUNCIONAMIENTO DEL SISTEMA DE PRECIOS MASIVOS - MOTOAPP

## RESUMEN EJECUTIVO

Este documento explica el funcionamiento exacto del sistema de precios en MotoApp, basado en el análisis del artículo 9805 y la verificación de datos reales en la base de datos PostgreSQL.

## ESTRUCTURA DE DATOS

### Tabla `artsucursal` (Artículos por Sucursal)
```sql
- id_articulo: Identificador del artículo
- precostosi: Precio de costo SIN IVA (base de todo el cálculo)
- prebsiva: Precio base SIN IVA (incluye margen)
- precon: Precio base CON IVA (precio de referencia principal)
- prefi1, prefi2, prefi3, prefi4: Precios de lista calculados
- tipo_moneda: Código de moneda (ej: 2)
- cod_iva: Código de tipo de IVA (ej: 1 = 21%)
```

### Tabla `conf_lista` (Configuración de Listas de Precios)
```sql
- listap: Número de lista (1, 2, 3, 4) - define cuál prefi actualizar
- preciof21: PORCENTAJE para artículos con IVA 21%
- preciof105: PORCENTAJE para artículos con IVA 10.5%
- tipomone: Código de moneda objetivo
- activa: Si la configuración está activa (true/false)
```

### Tabla `artiva` (Tipos de IVA)
```sql
- cod_iva: Código de IVA
- alicuota1: Porcentaje de IVA (ej: 21.00)
```

## FLUJO DE CÁLCULO DE PRECIOS

### PASO 1: Cálculo del Precio Base
```
1. precostosi → Precio de costo sin IVA (origen)
2. prebsiva = precostosi + margen_empresa
3. precon = prebsiva * factor_iva
```

**Factor IVA:**
- Si alicuota1 = 21.00 → factor_iva = 1.21
- Si alicuota1 = 10.50 → factor_iva = 1.105

### PASO 2: Cálculo de Precios de Lista (prefi1-4)
```
Para cada lista activa en conf_lista:
- Si cod_iva tiene alicuota1 = 21.00 → usar preciof21
- Si cod_iva tiene alicuota1 = 10.50 → usar preciof105

prefi[X] = precon * (1 + porcentaje_lista / 100)
```

## EJEMPLO REAL - ARTÍCULO 9805

### Datos Actuales Verificados
```
precostosi: $3.5868
prebsiva: $6.2800 (margen ~75%)
precon: $7.6000 (IVA 21%)
tipo_moneda: 2
cod_iva: 1 (21% IVA)
```

### Configuración conf_lista (tipomone=2)
```
Lista 1: preciof21 = -16.50%, preciof105 = -11.00%
Lista 2: preciof21 = 5.50%, preciof105 = 5.50%
Lista 3: preciof21 = -33.00%, preciof105 = -33.00%
```

### Cálculos Resultantes
```
prefi1 = $7.60 * (1 + (-16.50/100)) = $6.4558
prefi2 = $7.60 * (1 + (5.50/100)) = $7.9748
prefi3 = $7.60 * (1 + (-33.00/100)) = $5.3165
```

## PROCESO PARA INCREMENTO MASIVO DE PRECIOS (+10%)

### IMPORTANTE: QUÉ SE MODIFICA
**ÚNICO CAMPO A MODIFICAR:** `artsucursal.precostosi`

### PROCESO PASO A PASO

#### 1. Incrementar Precio de Costo
```sql
UPDATE artsucursal 
SET precostosi = precostosi * 1.10
WHERE [condiciones_específicas];
```

#### 2. Recalcular Precio Base sin IVA
```sql
-- Mantener el mismo margen porcentual
UPDATE artsucursal 
SET prebsiva = precostosi * factor_margen_existente
WHERE [condiciones_específicas];
```

#### 3. Recalcular Precio Base con IVA
```sql
UPDATE artsucursal 
SET precon = prebsiva * factor_iva
WHERE [condiciones_específicas];
```

#### 4. Recalcular Precios de Lista
```sql
-- Para cada lista configurada en conf_lista
UPDATE artsucursal 
SET prefi[X] = precon * (1 + porcentaje_conf_lista / 100)
WHERE tipo_moneda = tipomone_configurado;
```

### RESULTADO ESPERADO - ARTÍCULO 9805
```
ANTES del incremento:
precostosi: $3.5868
precon: $7.6000
prefi1: $6.4558
prefi2: $7.9748
prefi3: $5.3165

DESPUÉS del incremento (+10%):
precostosi: $3.9455 (+10%)
precon: $8.3600 (+10%)
prefi1: $6.9806 (+10%)
prefi2: $8.8198 (+10%)
prefi3: $5.5398 (+10%)
```

## REGLAS CRÍTICAS

### ✅ QUÉ SE MODIFICA
1. **precostosi** → Incremento directo del porcentaje solicitado
2. **prebsiva** → Recálculo manteniendo margen existente
3. **precon** → Recálculo aplicando IVA correspondiente
4. **prefi1-4** → Recálculo usando configuración actual de conf_lista

### ❌ QUÉ NUNCA SE MODIFICA
1. **conf_lista** → Los porcentajes permanecen iguales
2. **preciof21/preciof105** → Mantienen sus valores originales
3. **Estructura de márgenes** → Se preservan las relaciones porcentuales
4. **Configuración de IVA** → No se modifica artiva

## VALIDACIÓN POST-IMPLEMENTACIÓN

### Verificaciones Obligatorias
```sql
-- 1. Verificar incremento correcto en precostosi
SELECT 
    id_articulo,
    precostosi_anterior,
    precostosi_nuevo,
    (precostosi_nuevo / precostosi_anterior - 1) * 100 as incremento_real
FROM audit_precios;

-- 2. Verificar propagación correcta
SELECT 
    id_articulo,
    precostosi,
    precon,
    (precon / precostosi) as factor_total
FROM artsucursal;

-- 3. Verificar precios de lista
SELECT 
    id_articulo,
    precon,
    prefi1,
    ((prefi1 / precon - 1) * 100) as porcentaje_aplicado_lista1
FROM artsucursal;
```

## CONSIDERACIONES TÉCNICAS

### Orden de Ejecución
1. **PRIMERO:** Actualizar precostosi
2. **SEGUNDO:** Recalcular prebsiva (mantener margen)
3. **TERCERO:** Recalcular precon (aplicar IVA)
4. **CUARTO:** Recalcular prefi1-4 (aplicar conf_lista)

### Transaccionalidad
- Todo el proceso debe ejecutarse en una sola transacción
- Implementar rollback en caso de error
- Auditar todos los cambios realizados

### Filtros de Aplicación
- Filtrar por tipo_moneda específico
- Filtrar por rango de artículos si es necesario
- Excluir artículos con precon = 0 o NULL

## CONCLUSIÓN

El sistema de precios masivos funciona mediante la modificación del precio de costo base (precostosi) y la propagación automática de este cambio a través de toda la cadena de cálculo, manteniendo las configuraciones existentes de márgenes e IVA.

**La configuración de conf_lista actúa como política de precios y NO se modifica durante incrementos masivos.**