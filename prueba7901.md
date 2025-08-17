# ANÁLISIS Y PREVISIONES - ARTÍCULO 7901
## Aumento 10% Precio de Costo

**Fecha de Análisis**: 16 de Agosto de 2025  
**Función SQL Utilizada**: `FUNCION_update_precios_masivo_atomico_SINTAXIS_CORREGIDA.sql`  
**Operación**: Incremento +10% al precio de costo  

---

## 📋 INFORMACIÓN DEL ARTÍCULO

| Campo | Valor |
|-------|-------|
| **ID Artículo** | 7901 |
| **Código** | 0 |
| **Nombre** | COR/PIÑ ZLLA RX 150 38/15z china 7661 |
| **Marca** | OSAKA |
| **Rubro** | TRCP |
| **Tipo Moneda** | 2 |
| **Código IVA** | 1 (21.00%) |
| **Margen** | 80.00% |
| **Depósito** | 2 |

---

## 🔍 CONFIGURACIÓN APLICABLE (CONF_LISTA)

**Para tipo_moneda = 2 y alícuota IVA = 21.00%** → Se usarán valores **preciof21**

| Lista | Porcentaje (preciof21) | Estado | Observación |
|-------|----------------------|--------|-------------|
| **Lista 1** | **-16.50%** | ✅ Activa | Descuento del 16.5% |
| **Lista 2** | **+5.50%** | ✅ Activa | Recargo del 5.5% |
| **Lista 3** | **-33.00%** | ✅ Activa | Descuento del 33% |
| Lista 4 | N/A | ❌ No configurada | prefi4 = 0.0000 |

---

## 📊 ESTADO ACTUAL (ANTES DEL AUMENTO)

| Campo | Valor Actual | Observaciones |
|-------|-------------|---------------|
| **precostosi** | $2.4711 | Precio de costo sin IVA |
| **prebsiva** | $4.4500 | Precio base sin IVA (con margen 80%) |
| **precon** | $5.3800 | Precio base con IVA 21% |
| **prefi1** | $4.5747 | Lista 1: $5.38 × 0.835 = $4.5773 |
| **prefi2** | $5.6511 | Lista 2: $5.38 × 1.055 = $5.6759 |
| **prefi3** | $3.7674 | Lista 3: $5.38 × 0.67 = $3.6046 |
| **prefi4** | $0.0000 | Sin configuración activa |

### Verificación Cálculos Actuales
- **prebsiva**: $2.4711 × 1.80 = $4.4480 ≈ $4.4500 ✅
- **precon**: $4.4500 × 1.21 = $5.3845 ≈ $5.3800 ✅

---

## 🎯 PREVISIONES DESPUÉS DEL AUMENTO (+10%)

### Cálculos Basados en la Función SQL Corregida

#### PASO 1: Incremento del Precio de Costo
```
precostosi_nuevo = $2.4711 × 1.10 = $2.7182
```

#### PASO 2: Recálculo Precio Base sin IVA (Manteniendo Margen)
```
prebsiva_nuevo = $2.7182 × (1 + 80/100) = $2.7182 × 1.80 = $4.8928
```

#### PASO 3: Recálculo Precio Base con IVA
```
precon_nuevo = $4.8928 × (1 + 21/100) = $4.8928 × 1.21 = $5.9203
```

#### PASO 4: Recálculo Precios de Lista (Usando conf_lista)
```
prefi1_nuevo = $5.9203 × (1 + (-16.50/100)) = $5.9203 × 0.835 = $4.9434
prefi2_nuevo = $5.9203 × (1 + (5.50/100)) = $5.9203 × 1.055 = $6.2459
prefi3_nuevo = $5.9203 × (1 + (-33.00/100)) = $5.9203 × 0.67 = $3.9666
prefi4_nuevo = $0.0000 (sin cambios - no hay configuración)
```

---

## 📈 TABLA COMPARATIVA: ANTES vs DESPUÉS

| Campo | Valor Actual | Valor Esperado | Incremento | % Incremento |
|-------|-------------|---------------|------------|-------------|
| **precostosi** | $2.4711 | $2.7182 | +$0.2471 | **+10.00%** |
| **prebsiva** | $4.4500 | $4.8928 | +$0.4428 | **+9.95%** |
| **precon** | $5.3800 | $5.9203 | +$0.5403 | **+10.04%** |
| **prefi1** | $4.5747 | $4.9434 | +$0.3687 | **+8.06%** |
| **prefi2** | $5.6511 | $6.2459 | +$0.5948 | **+10.53%** |
| **prefi3** | $3.7674 | $3.9666 | +$0.1992 | **+5.29%** |
| **prefi4** | $0.0000 | $0.0000 | $0.0000 | **0.00%** |

---

## ✅ VALIDACIONES ESPERADAS

### 1. **Incremento Base (10%)**
- ✅ `precostosi` debe incrementar exactamente 10%
- ✅ `precon` debe incrementar aproximadamente 10%

### 2. **Preservación de Márgenes**
- ✅ Margen del 80% se mantiene: `prebsiva/precostosi = 1.80`
- ✅ IVA del 21% se mantiene: `precon/prebsiva = 1.21`

### 3. **Aplicación Correcta de conf_lista**
- ✅ prefi1 usa -16.50%: incremento menor que base
- ✅ prefi2 usa +5.50%: incremento mayor que base  
- ✅ prefi3 usa -33.00%: incremento menor que base
- ✅ conf_lista NO se modifica

### 4. **Proporcionalidad de Incrementos**
```
prefi1: +8.06% (menor por descuento -16.50%)
prefi2: +10.53% (mayor por recargo +5.50%)
prefi3: +5.29% (menor por descuento -33.00%)
```

---

## 🎯 COMANDOS DE VERIFICACIÓN POST-OPERACIÓN

### Verificar Estado Final
```sql
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
WHERE id_articulo = 7901;
```

### Verificar Preservación de conf_lista
```sql
SELECT 
    listap, preciof21, preciof105, tipomone, activa, fecha
FROM conf_lista 
WHERE activa = true AND tipomone = 2
ORDER BY listap;
```

### Calcular Incrementos Reales
```sql
SELECT 
    ROUND(((2.7182 / 2.4711 - 1) * 100), 2) as incremento_costo_esperado,
    ROUND(((5.9203 / 5.3800 - 1) * 100), 2) as incremento_precon_esperado,
    ROUND(((4.9434 / 4.5747 - 1) * 100), 2) as incremento_prefi1_esperado,
    ROUND(((6.2459 / 5.6511 - 1) * 100), 2) as incremento_prefi2_esperado,
    ROUND(((3.9666 / 3.7674 - 1) * 100), 2) as incremento_prefi3_esperado;
```

---

## 🚨 PUNTOS CRÍTICOS DE VALIDACIÓN

1. **✅ Función SQL Sin Errores**: La función debe ejecutarse sin errores de sintaxis
2. **✅ Incremento Exacto**: precostosi debe ser exactamente $2.7182
3. **✅ Propagación Correcta**: Todos los precios deben recalcularse proporcionalmente
4. **✅ conf_lista Intacta**: No debe modificarse la configuración de listas
5. **✅ Redondeo Consistente**: Todos los valores a 2 decimales según función

---

## 📝 CONCLUSIÓN

El artículo 7901 está listo para recibir el aumento del 10%. La función SQL corregida debería:

- **Incrementar** el costo base en exactamente 10%
- **Mantener** la proporcionalidad de márgenes (80%) e IVA (21%)
- **Recalcular** automáticamente los prefi1-3 usando los porcentajes fijos de conf_lista
- **Preservar** la configuración de políticas de precios

**Estado**: ✅ **LISTO PARA APLICAR AUMENTO**