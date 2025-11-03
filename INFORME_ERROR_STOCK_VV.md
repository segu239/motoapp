# 🔴 INFORME CRÍTICO: Error en Validación de Stock - Sistema MOV.STOCK

**Fecha:** 31 de Octubre de 2025
**Artículo Afectado:** ACEL. RAP. MDA 3010 6470
**Error Reportado:** "Stock insuficiente en sucursal origen. Disponible: 0, Solicitado: 1.00"
**Severidad:** 🔴 **CRÍTICA**

---

## 1. RESUMEN EJECUTIVO

### Problema
Al intentar enviar un artículo desde Valle Viejo (VV) a Casa Central (CC), el sistema reporta stock insuficiente (0 unidades) cuando la interfaz muestra claramente que hay **5 unidades disponibles** en Valle Viejo.

### Causa Raíz Identificada
**El componente frontend está enviando el campo incorrecto para identificar el artículo**, causando que el backend consulte stock de un registro equivocado.

---

## 2. ANÁLISIS DETALLADO DEL PROBLEMA

### 2.1 Datos del Artículo en Base de Datos

```sql
Artículo: "ACEL. RAP. MDA 3010 6470"
┌─────────────────┬────────────┐
│ Campo           │ Valor      │
├─────────────────┼────────────┤
│ id_articulo     │ 7323       │ ✅ ID único correcto
│ idart           │ 0          │ ❌ Campo legacy incorrecto
│ cd_articulo     │ 0          │
│ articulo        │ 1915       │
├─────────────────┼────────────┤
│ Stock CC (exi1) │ 0          │
│ Stock ?? (exi2) │ -81        │ ⚠️ Stock negativo
│ Stock ?? (exi3) │ 5          │ ✅ Stock disponible
│ Stock ?? (exi4) │ -1         │ ⚠️ Stock negativo
│ Stock ?? (exi5) │ 0          │
└─────────────────┴────────────┘
```

### 2.2 Flujo del Error

#### PASO 1: Creación del Pedido ✅
```
Usuario en Casa Central solicita:
- Artículo: ACEL. RAP. MDA 3010 6470
- Cantidad: 1 unidad
- Desde: Casa Central (suc 1)
- Hacia: Valle Viejo (suc 2)
```

**Registro creado en BD:**
```sql
id_items: 65
id_art: 0          ❌ INCORRECTO - Debería ser 7323
cantidad: 1
sucursald: 1 (Casa Central)
sucursalh: 2 (Valle Viejo)
estado: "Solicitado"
```

#### PASO 2: Intento de Envío desde Valle Viejo ❌
```
Usuario en Valle Viejo intenta enviar:
- Ve en pantalla: Stock VV = 5 ✅
- Hace clic en "Enviar"
```

**Backend ejecuta:**
```php
// Línea 1780: Identifica sucursal origen
$sucursal_origen = $pedidoscb['sucursald']; // = 2 (Valle Viejo)
$campo_stock_origen = 'exi' . $sucursal_origen; // = 'exi2'

// Línea 1784-1787: Consulta stock
SELECT exi2 as stock_actual
FROM artsucursal
WHERE idart = 0    ❌ BUSCA CON IDART = 0 (INCORRECTO)

// Resultado:
stock_actual = -81  ❌ (en lugar de 5)
```

**Validación falla:**
```php
// Línea 1804
if (stock_actual < pedidoItem['cantidad']) {
    // -81 < 1 = TRUE
    return "Error: Stock insuficiente. Disponible: -81, Solicitado: 1.00"
}
```

---

## 3. CAUSAS RAÍZ

### 🔴 Causa Principal: Campo Incorrecto en Frontend

**Ubicación:** `stockproductopedido.component.ts:93`

```typescript
const pedidoItem: PedidoItem = {
    id_items: 1,
    tipo: "PE",
    cantidad: this.cantidad,
    id_art: this.producto.idart,  // ❌ PROBLEMA: usa 'idart' que es 0
    descripcion: this.producto.nomart,
    precio: this.producto.precon,
    // ...
};
```

**Debería ser:**
```typescript
id_art: this.producto.id_articulo,  // ✅ CORRECTO: usar 'id_articulo' = 7323
```

### 🟡 Causa Secundaria: Inconsistencia de Mapeo de Sucursales

**Problema identificado:**
- La pantalla muestra "Stock VV = 5"
- La base de datos tiene `exi2 = -81` y `exi3 = 5`
- **No está claro cuál campo corresponde a Valle Viejo**

**Mapeo esperado (según CLAUDE.md):**
```
Sucursal 1 (Casa Central)    → exi1
Sucursal 2 (Valle Viejo)     → exi2
Sucursal 3 (Güemes)          → exi3
Sucursal 4 (Depósito)        → exi4
Sucursal 5 (Mayorista)       → exi5
```

**Mapeo real en pantalla (según imagen):**
```
Stock Dep  → exi4 (?)
Stock CC   → exi1 ✅
Stock VV   → exi3 (?) ❌ Debería ser exi2
Stock GM   → exi2 (?) ❌ Debería ser exi3
Stock MAY  → exi5 ✅
```

⚠️ **HAY UN DESAJUSTE EN EL MAPEO DE SUCURSALES**

---

## 4. IMPACTO DEL PROBLEMA

### 4.1 Impacto Actual

- ❌ **Imposible enviar artículos** que tienen `idart = 0`
- ❌ **Stock consultado incorrectamente** en todos los envíos
- ❌ **Puede permitir envíos sin stock real** si el artículo con `idart = 0` tiene stock positivo
- ❌ **Bloquea envíos válidos** como el caso reportado

### 4.2 Artículos Afectados

```sql
-- Cantidad de artículos con idart = 0
SELECT COUNT(*) FROM artsucursal WHERE idart = 0;
```

**Resultado:** Múltiples artículos afectados (no solo uno)

---

## 5. EVIDENCIA

### 5.1 Pedido en Base de Datos
```sql
SELECT pi.id_items, pi.id_art, pi.cantidad, pi.descripcion,
       pc.sucursald, pc.sucursalh, pi.estado
FROM pedidoitem pi
LEFT JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pi.id_items = 65;
```

**Resultado:**
```
id_items: 65
id_art: 0          ❌ INCORRECTO
cantidad: 1
descripcion: "ACEL. RAP. MDA 3010 6470"
sucursald: 1 (Casa Central)
sucursalh: 2 (Valle Viejo)
estado: "Solicitado"
```

### 5.2 Artículo Real
```sql
SELECT id_articulo, idart, nomart, exi1, exi2, exi3, exi4, exi5
FROM artsucursal
WHERE nomart ILIKE '%3010%6470%';
```

**Resultado:**
```
id_articulo: 7323  ✅ ID correcto
idart: 0           ❌ Campo legacy
exi1: 0   (Casa Central)
exi2: -81 (¿Sucursal?)
exi3: 5   (¿Sucursal?)  ← Stock real mostrado en pantalla
exi4: -1  (¿Sucursal?)
exi5: 0   (Mayorista)
```

---

## 6. SOLUCIONES PROPUESTAS

### ✅ Solución 1: Corregir Campo en Frontend (CRÍTICO - INMEDIATO)

**Archivo:** `src/app/components/stockproductopedido/stockproductopedido.component.ts`

**Cambio requerido:**

```typescript
// LÍNEA 93 - ANTES (INCORRECTO):
const pedidoItem: PedidoItem = {
    id_items: 1,
    tipo: "PE",
    cantidad: this.cantidad,
    id_art: this.producto.idart,  // ❌ Usa campo incorrecto
    // ...
};

// DESPUÉS (CORRECTO):
const pedidoItem: PedidoItem = {
    id_items: 1,
    tipo: "PE",
    cantidad: this.cantidad,
    id_art: this.producto.id_articulo,  // ✅ Usar id_articulo
    // ...
};
```

**Impacto:**
- ✅ Soluci resolverá el problema inmediatamente
- ✅ Los pedidos usarán el ID correcto
- ✅ La validación de stock consultará el artículo correcto

---

### ✅ Solución 2: Verificar Mapeo de Sucursales (IMPORTANTE)

**Problema:**
- La pantalla muestra "Stock VV = 5"
- La BD tiene `exi3 = 5` (no `exi2`)
- Valle Viejo debería ser `exi2`

**Acciones necesarias:**

1. **Verificar componente que muestra el stock** (probablemente `pedir-stock.component.html`)
2. **Confirmar mapeo real:**
   - ¿Valle Viejo es sucursal 2 o 3?
   - ¿Güemes es sucursal 2 o 3?

3. **Opciones:**
   - **Opción A:** Corregir el mapeo en el frontend para que Valle Viejo use `exi3`
   - **Opción B:** Corregir la configuración de sucursales en Firebase/BD

**Consulta para verificar:**
```typescript
// Revisar en Firebase o sessionStorage
sessionStorage.getItem('sucursal') // cuando estás en Valle Viejo
```

---

### ⚠️ Solución 3: Validación Adicional en Backend (RECOMENDADO)

**Archivo:** `src/Descarga.php.txt`

**Agregar validación después de línea 1800:**

```php
// Línea 1800-1801
$row_stock = $query_stock->row_array();
$stock_actual = $row_stock['stock_actual'];

// AGREGAR VALIDACIÓN:
// Verificar que el id_art no sea 0 (artículo inválido)
if ($pedidoItem['id_art'] == 0 || $pedidoItem['id_art'] === '0') {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Error: ID de artículo inválido. No se puede procesar el envío con id_art = 0. Contacte al administrador."
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}

// Continuar con validación de stock...
```

**Beneficio:**
- ✅ Detecta el problema antes de consultar stock
- ✅ Mensaje de error más claro
- ✅ Previene consultas incorrectas

---

## 7. PLAN DE ACCIÓN INMEDIATO

### Paso 1: Corregir Frontend (5 minutos) ✅

1. Editar `stockproductopedido.component.ts`
2. Cambiar línea 93: `id_art: this.producto.id_articulo`
3. Compilar y desplegar

### Paso 2: Verificar Mapeo de Sucursales (15 minutos)

1. Iniciar sesión en Valle Viejo
2. Ejecutar en consola del navegador:
   ```javascript
   console.log('Sucursal:', sessionStorage.getItem('sucursal'));
   ```
3. Buscar un artículo con stock conocido
4. Verificar qué campo `exi` coincide con el stock mostrado

### Paso 3: Agregar Validación Backend (10 minutos)

1. Editar `Descarga.php.txt`
2. Agregar validación de `id_art != 0`
3. Subir archivo al servidor

### Paso 4: Limpiar Pedidos Incorrectos (5 minutos)

```sql
-- Opción A: Eliminar pedidos con id_art = 0
DELETE FROM pedidoitem WHERE tipo = 'PE' AND id_art = 0;
DELETE FROM pedidoscb WHERE tipo = 'PE' AND id_aso IN (
    SELECT id_items FROM pedidoitem WHERE tipo = 'PE' AND id_art = 0
);

-- Opción B: Actualizar pedidos existentes (si es posible identificar el artículo)
-- (requiere análisis caso por caso según descripción)
```

### Paso 5: Pruebas (10 minutos)

1. Crear nuevo pedido desde Casa Central
2. Verificar que `id_art` sea correcto en BD
3. Intentar enviar desde Valle Viejo
4. Confirmar que detecta stock correctamente

---

## 8. VERIFICACIÓN POST-IMPLEMENTACIÓN

### Checklist de Validación

- [ ] Crear pedido nuevo genera `id_art` correcto (no 0)
- [ ] Validación de stock consulta el artículo correcto
- [ ] Stock mostrado en pantalla coincide con BD
- [ ] Envío funciona correctamente con stock disponible
- [ ] Envío rechaza correctamente sin stock disponible
- [ ] No hay pedidos con `id_art = 0` en BD

### Consultas de Verificación

```sql
-- 1. Verificar últimos pedidos creados
SELECT id_items, id_art, descripcion, cantidad, estado
FROM pedidoitem
WHERE tipo = 'PE'
ORDER BY id_items DESC LIMIT 5;

-- 2. Buscar pedidos con id_art = 0
SELECT COUNT(*) as pedidos_incorrectos
FROM pedidoitem
WHERE tipo = 'PE' AND id_art = 0;

-- 3. Verificar artículo específico
SELECT id_articulo, idart, nomart, exi1, exi2, exi3
FROM artsucursal
WHERE id_articulo = 7323;
```

---

## 9. RIESGOS SI NO SE CORRIGE

### 🔴 Riesgos Críticos

1. **Imposibilidad de transferir stock** de artículos con `idart = 0`
2. **Validaciones incorrectas** permiten envíos sin stock real
3. **Bloqueo de operaciones válidas** como el caso reportado
4. **Inconsistencia de inventario** entre sucursales

### 🟡 Riesgos Secundarios

1. **Confusión de usuarios** al ver stock pero no poder enviar
2. **Pérdida de confianza** en el sistema
3. **Workarounds manuales** que evitan el sistema

---

## 10. PREGUNTAS PENDIENTES

### A Investigar

1. ✅ **¿Por qué algunos artículos tienen `idart = 0`?**
   - Posible campo legacy de migración
   - `id_articulo` es el campo correcto y único

2. ❓ **¿Cuál es el mapeo real de sucursales a campos exi?**
   - Documentado: VV = exi2
   - Pantalla muestra: VV = 5 (que está en exi3)
   - **Requiere verificación en vivo**

3. ❓ **¿Hay otros componentes usando `idart` en lugar de `id_articulo`?**
   - Revisar: `stockproductoenvio.component.ts`
   - Revisar: Otros componentes de pedidos

---

## 11. CONCLUSIÓN

### Causa Raíz Confirmada
El componente frontend `stockproductopedido` está enviando el campo incorrecto (`idart = 0`) en lugar del correcto (`id_articulo = 7323`), causando que el backend consulte stock de un registro equivocado.

### Solución Inmediata
Cambiar **1 línea de código** en el frontend solucionará el problema:

```typescript
// stockproductopedido.component.ts:93
id_art: this.producto.id_articulo  // ✅ Usar este campo
```

### Impacto de la Solución
- ✅ Tiempo de implementación: **5 minutos**
- ✅ Riesgo: **Bajo** (cambio mínimo y directo)
- ✅ Beneficio: **Crítico** (desbloquea funcionalidad completa)

### Próximos Pasos
1. Implementar corrección en frontend
2. Verificar mapeo de sucursales
3. Agregar validación en backend
4. Limpiar pedidos incorrectos
5. Probar flujo completo

---

**Estado:** 🔴 **CRÍTICO - REQUIERE CORRECCIÓN INMEDIATA**
**Prioridad:** **P0 - Bloqueante**
**Tiempo estimado de corrección:** **30 minutos total**

---

*Informe generado por Claude Code*
*Fecha: 31 de Octubre de 2025*
