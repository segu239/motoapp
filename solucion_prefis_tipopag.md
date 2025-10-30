# 🔍 INFORME DE DIAGNÓSTICO Y SOLUCIÓN
## Problema: Precios no cambian al modificar Tipo de Pago en Carrito

**Fecha:** 2025-10-25
**Componente afectado:** `carrito.component.ts`
**Severidad:** 🔴 ALTA - Funcionalidad principal no trabaja
**Issue:** Los precios permanecen iguales al cambiar tipo de pago

---

## 📊 ANÁLISIS DE LOGS

### Logs capturados de la consola:

```
📝 CAMBIO DE TIPO DE PAGO EN CARRITO
🔄 ════════════════════════════════════════════════════
Item: ACOPLE FIL-AIRE C/CARB H.CB 250  9060
cod_tar anterior: 12
cod_tar nuevo: 12
🔍 Activadatos: 0 → 1
⚠️ Cambio detectado entre activadatos diferentes → Modo Consulta
⚠️ Marcando item como SOLO CONSULTA
💾 Datos originales guardados
⚠️ listaprecio desconocido: 2, usando precio actual    ⬅️ ⚠️ PROBLEMA AQUÍ
💰 Precio base seleccionado (lista 2): $9108.75
✅ Item actualizado
💾 SessionStorage actualizado
🔄 ════════════════════════════════════════════════════
```

### 🚨 Problema Identificado #1: Type Coercion en Switch

**Línea problemática:** `carrito.component.ts:2005`

```
⚠️ listaprecio desconocido: 2, usando precio actual
```

**¿Por qué ocurre?**

El código tiene un `switch` para seleccionar el precio según `listaprecio`:

```typescript
const listaPrecioNueva = tarjetaSeleccionada.listaprecio || 0;

switch (listaPrecioNueva) {
  case 0: precioNuevo = item.precon || 0; break;
  case 1: precioNuevo = item.prefi1 || 0; break;
  case 2: precioNuevo = item.prefi2 || 0; break;  // ⬅️ Debería entrar aquí
  case 3: precioNuevo = item.prefi3 || 0; break;
  case 4: precioNuevo = item.prefi4 || 0; break;
  default:
    console.warn(`⚠️ listaprecio desconocido: ${listaPrecioNueva}, usando precio actual`);
    precioNuevo = item.precio;  // ⬅️ Está entrando aquí
}
```

**Causa raíz:**

El campo `listaprecio` viene de la base de datos PostgreSQL como un tipo `numeric`, pero cuando llega al frontend como JSON, **puede ser un string `"2"` en lugar de un número `2`**.

En JavaScript/TypeScript:
- El operador `switch` usa **comparación estricta (===)**
- `"2" === 2` es **false**
- Por lo tanto, `case 2` no coincide con el valor `"2"`
- Entra al `default` y usa el precio actual sin cambiar

### 🚨 Problema Identificado #2: Precios prefi no están disponibles

**Síntoma:** Incluso si el switch funcionara, `item.prefi2` probablemente es `0` o `undefined`.

**¿Por qué?**

Hay dos posibles causas:

#### Causa A: Los precios no se guardan al agregar el item

En `calculoproducto.component.ts` (líneas 164-168):

```typescript
this.pedido.precon = this.producto.precon || 0;
this.pedido.prefi1 = this.producto.prefi1 || 0;
this.pedido.prefi2 = this.producto.prefi2 || 0;
this.pedido.prefi3 = this.producto.prefi3 || 0;
this.pedido.prefi4 = this.producto.prefi4 || 0;
```

**Pregunta crítica:** ¿`this.producto` tiene esos campos cargados?

Si el producto se carga desde el backend, necesitamos verificar que incluya **todos** los campos de precio:
- `precon`
- `prefi1`
- `prefi2`
- `prefi3`
- `prefi4`

#### Causa B: Los precios vienen como string desde la BD

Al igual que `listaprecio`, los campos `precon`, `prefi1`, etc. pueden venir como strings:
- `"9108.75"` en lugar de `9108.75`
- Esto no causa error inmediato, pero puede causar problemas en cálculos posteriores

### 🚨 Problema Identificado #3: cod_tar no cambia

**Observación en logs:**

```
cod_tar anterior: 12
cod_tar nuevo: 12
```

Ambos valores son `12`, pero el usuario reporta que cambió de tipo de pago. Esto sugiere dos posibilidades:

#### Opción A: El dropdown no está bound correctamente

El `[(ngModel)]` puede tener un problema de binding.

#### Opción B: cod_tar del item no se actualiza antes de llamar al evento

El método `onTipoPagoChange` recibe el evento, pero puede que esté leyendo el valor viejo de `item.cod_tar`.

---

## 🔧 PLAN DE SOLUCIÓN

### Solución 1: Convertir listaprecio a número (CRÍTICO)

**Archivo:** `carrito.component.ts`
**Método:** `onTipoPagoChange()`
**Línea:** ~1993

**ANTES:**
```typescript
const listaPrecioNueva = tarjetaSeleccionada.listaprecio || 0;
```

**DESPUÉS:**
```typescript
const listaPrecioNueva = parseInt(tarjetaSeleccionada.listaprecio) || 0;
```

**Explicación:** Convierte el valor a número entero antes de usarlo en el switch.

---

### Solución 2: Convertir precios a número al guardar (CRÍTICO)

**Archivo:** `calculoproducto.component.ts`
**Método:** `generarPedido()`
**Líneas:** ~164-168

**ANTES:**
```typescript
this.pedido.precon = this.producto.precon || 0;
this.pedido.prefi1 = this.producto.prefi1 || 0;
this.pedido.prefi2 = this.producto.prefi2 || 0;
this.pedido.prefi3 = this.producto.prefi3 || 0;
this.pedido.prefi4 = this.producto.prefi4 || 0;
```

**DESPUÉS:**
```typescript
this.pedido.precon = parseFloat(this.producto.precon) || 0;
this.pedido.prefi1 = parseFloat(this.producto.prefi1) || 0;
this.pedido.prefi2 = parseFloat(this.producto.prefi2) || 0;
this.pedido.prefi3 = parseFloat(this.producto.prefi3) || 0;
this.pedido.prefi4 = parseFloat(this.producto.prefi4) || 0;
```

**Explicación:** Asegura que los precios se guarden como números, no como strings.

---

### Solución 3: Agregar logs de diagnóstico (TEMPORAL - para testing)

**Archivo:** `carrito.component.ts`
**Método:** `onTipoPagoChange()`
**Ubicación:** Antes del switch

**AGREGAR:**
```typescript
// 🔍 DEBUG: Mostrar TODOS los datos relevantes
console.log('🔍 DEBUG - Item completo:', {
  nomart: item.nomart,
  precios: {
    precon: item.precon,
    prefi1: item.prefi1,
    prefi2: item.prefi2,
    prefi3: item.prefi3,
    prefi4: item.prefi4
  },
  tipos: {
    tipo_precon: typeof item.precon,
    tipo_prefi2: typeof item.prefi2
  }
});

console.log('🔍 DEBUG - Tarjeta seleccionada:', {
  tarjeta: tarjetaSeleccionada.tarjeta,
  listaprecio: tarjetaSeleccionada.listaprecio,
  tipo_listaprecio: typeof tarjetaSeleccionada.listaprecio,
  activadatos: tarjetaSeleccionada.activadatos
});
```

**Explicación:** Permite ver exactamente qué valores y tipos de datos hay en el item.

---

### Solución 4: Normalizar activadatos a número

**Archivo:** `carrito.component.ts`
**Método:** `onTipoPagoChange()`
**Líneas:** ~1974-1975

**ANTES:**
```typescript
const activadatosActual = this.obtenerActivadatosDelItem(item);
const activadatosNuevo = tarjetaSeleccionada.activadatos || 0;
```

**DESPUÉS:**
```typescript
const activadatosActual = parseInt(this.obtenerActivadatosDelItem(item)) || 0;
const activadatosNuevo = parseInt(tarjetaSeleccionada.activadatos) || 0;
```

**Explicación:** Asegura que ambos valores son números para comparación correcta.

---

### Solución 5: Normalizar cod_tarj en tarjetas al cargar

**Archivo:** `carrito.component.ts`
**Método:** `cargarTarjetas()`
**Línea:** ~122

**ANTES:**
```typescript
cargarTarjetas() {
  const tarjetasSubscription = this._cargardata.tarjcredito().subscribe((data: any) => {
    this.tarjetas = data.mensaje;
    console.log('Tarjetas obtenidas:', this.tarjetas);
    this.actualizarItemsConTipoPago();
    // ...
  });
}
```

**DESPUÉS:**
```typescript
cargarTarjetas() {
  const tarjetasSubscription = this._cargardata.tarjcredito().subscribe((data: any) => {
    // Normalizar tipos de datos de las tarjetas
    this.tarjetas = data.mensaje.map((tarjeta: any) => ({
      ...tarjeta,
      cod_tarj: parseInt(tarjeta.cod_tarj) || 0,
      listaprecio: parseInt(tarjeta.listaprecio) || 0,
      activadatos: parseInt(tarjeta.activadatos) || 0
    }));

    console.log('Tarjetas obtenidas y normalizadas:', this.tarjetas);
    this.actualizarItemsConTipoPago();
    // ...
  });
}
```

**Explicación:** Convierte todos los campos numéricos a número al cargar las tarjetas desde el backend, evitando problemas posteriores.

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Paso 1: Implementar Solución 1 (CRÍTICO)
- [ ] Modificar `carrito.component.ts` línea ~1993
- [ ] Agregar `parseInt()` a `listaPrecioNueva`
- [ ] Compilar y verificar sin errores

### Paso 2: Implementar Solución 2 (CRÍTICO)
- [ ] Modificar `calculoproducto.component.ts` líneas ~164-168
- [ ] Agregar `parseFloat()` a todos los precios
- [ ] Compilar y verificar sin errores

### Paso 3: Implementar Solución 5 (RECOMENDADO)
- [ ] Modificar `carrito.component.ts` método `cargarTarjetas()`
- [ ] Normalizar campos numéricos al cargar
- [ ] Compilar y verificar sin errores

### Paso 4: Implementar Solución 3 (TEMPORAL - para testing)
- [ ] Agregar logs de diagnóstico
- [ ] Guardar y refrescar aplicación
- [ ] Realizar prueba de cambio de tipo de pago
- [ ] Capturar logs de consola

### Paso 5: Testing
- [ ] Agregar item con EFECTIVO
- [ ] Cambiar a ELECTRON (o NARANJA ZETA como en el ejemplo)
- [ ] Verificar que el precio cambie en pantalla
- [ ] Verificar logs en consola:
  - Ya no debe aparecer "listaprecio desconocido"
  - Debe mostrar el precio correcto según prefi2
- [ ] Verificar SweetAlert muestre precios diferentes

### Paso 6: Testing Adicional
- [ ] Probar cambio EFECTIVO → CUENTA CORRIENTE (mismo activadatos)
- [ ] Probar cambio ELECTRON → NARANJA (mismo activadatos)
- [ ] Probar con producto en USD
- [ ] Verificar que totales se recalculen correctamente

### Paso 7: Limpieza (Opcional)
- [ ] Remover logs de diagnóstico si ya no son necesarios
- [ ] Documentar cambios realizados

---

## 🧪 ESCENARIO DE PRUEBA DETALLADO

### Test Case: Cambiar EFECTIVO → NARANJA ZETA

**Pre-requisitos:**
- Item agregado con EFECTIVO (cod_tar = 12, listaprecio = 0, activadatos = 0)
- Producto: "ACOPLE FIL-AIRE C/CARB H.CB 250 9060"
- Precio con EFECTIVO: $9108.75 (precon)

**Datos de NARANJA ZETA (según logs):**
- cod_tarj: 12 (según logs, aunque esto parece incorrecto)
- listaprecio: 2 (debe usar prefi2)
- activadatos: 1 (requiere datos de tarjeta)

**Acción:**
1. Ir al carrito
2. Hacer clic en dropdown de tipo de pago
3. Seleccionar "NARANJA ZETA"

**Resultado Esperado DESPUÉS de la corrección:**

**Logs en consola:**
```
🔄 ════════════════════════════════════════════════════
📝 CAMBIO DE TIPO DE PAGO EN CARRITO
Item: ACOPLE FIL-AIRE C/CARB H.CB 250  9060
cod_tar anterior: 12
cod_tar nuevo: [cod de NARANJA ZETA]
🔍 Activadatos: 0 → 1
⚠️ Cambio detectado entre activadatos diferentes → Modo Consulta

🔍 DEBUG - Item completo:
{
  nomart: "ACOPLE FIL-AIRE...",
  precios: {
    precon: 9108.75,      // ⬅️ Debe ser número, no string
    prefi1: 9400.00,
    prefi2: 9700.00,      // ⬅️ Este debería usarse
    prefi3: 10000.00,
    prefi4: 10500.00
  },
  tipos: {
    tipo_precon: "number",    // ⬅️ Debe ser "number"
    tipo_prefi2: "number"     // ⬅️ Debe ser "number"
  }
}

🔍 DEBUG - Tarjeta seleccionada:
{
  tarjeta: "NARANJA ZETA",
  listaprecio: 2,              // ⬅️ Debe ser número 2, no string "2"
  tipo_listaprecio: "number",  // ⬅️ Debe ser "number"
  activadatos: 1
}

💰 Precio base seleccionado (lista 2): $9700.00  // ⬅️ Ahora usa prefi2
✅ Item actualizado
```

**UI esperada:**
- Fila se pone amarilla (modo consulta)
- Badge "SOLO CONSULTA" aparece
- Precio actualizado en pantalla: **$9700.00** (o el valor que tenga prefi2)
- Info muestra: "Original: EFECTIVO - $9108.75"
- Botón "Revertir" visible

**SweetAlert esperado:**
```
Precio de consulta
──────────────────────────────────────
Artículo: ACOPLE FIL-AIRE C/CARB H.CB 250 9060
Método original: EFECTIVO - $9108.75
Método de consulta: NARANJA ZETA - $9700.00    ⬅️ Precio debe ser diferente
──────────────────────────────────────
⚠️ Importante:
- Este precio es solo para mostrar al cliente
- NO podrá finalizar la venta con este item en consulta
```

---

## ⚠️ PROBLEMAS ADICIONALES DETECTADOS

### Problema A: cod_tar duplicado

En los logs vemos:
```
cod_tar anterior: 12
cod_tar nuevo: 12
```

Esto sugiere que hay dos tarjetas diferentes con el mismo código `12`:
- EFECTIVO (cod_tarj = 12, activadatos = 0)
- NARANJA ZETA (cod_tarj = 12, activadatos = 1)

**Esto es un problema de datos en la BD PostgreSQL.**

**Solución:**
- Verificar en la tabla `tarjcredito` que los `cod_tarj` sean únicos
- Si hay duplicados, corregirlos en la BD
- Cada tarjeta debe tener un código único

**Consulta SQL para verificar:**
```sql
SELECT cod_tarj, tarjeta, COUNT(*)
FROM tarjcredito
GROUP BY cod_tarj, tarjeta
HAVING COUNT(*) > 1;
```

Si hay resultados, hay duplicados que deben corregirse.

---

### Problema B: Producto puede no tener prefi cargados

**Verificación necesaria:**

1. Abrir DevTools → Console
2. Cuando se agrega un item, verificar el log:
   ```
   ✅ Item agregado con metadatos completos
   ```
3. Revisar el objeto `precios_disponibles`
4. Si todos son `0`, el problema está en el backend

**Consulta SQL para verificar precios en BD:**
```sql
SELECT id_articulo, nomart, precon, prefi1, prefi2, prefi3, prefi4, tipo_moneda
FROM artsucursal
WHERE id_articulo = [ID del producto de prueba]
LIMIT 1;
```

**Si los precios son `0` o `NULL` en la BD:**
- Actualizar la BD con precios reales
- Verificar que el proceso de carga de precios funcione correctamente

**Si los precios existen en BD pero llegan como `0` al frontend:**
- Revisar el método del backend que retorna el producto
- Asegurar que incluye todos los campos: `precon`, `prefi1`, `prefi2`, `prefi3`, `prefi4`

---

## 📊 RESUMEN EJECUTIVO

### Causa Raíz Principal:

**Type Coercion en Switch Statement**

El campo `listaprecio` viene de la BD PostgreSQL como string (ej: `"2"`), pero el switch espera un número (`2`). Como el switch usa comparación estricta (`===`), no coincide y entra al `default`, usando el precio actual sin cambiar.

### Impacto:

🔴 **CRÍTICO** - La funcionalidad principal del feature no trabaja. Los precios no cambian al modificar tipo de pago, haciendo inútil la consulta de precios.

### Solución Principal:

✅ Convertir `listaprecio` a número usando `parseInt()` antes del switch.

✅ Normalizar todos los campos numéricos al cargar las tarjetas.

✅ Convertir precios a números al guardar el item.

### Tiempo Estimado de Implementación:

- **Soluciones 1, 2, 5:** 15 minutos
- **Testing completo:** 20 minutos
- **Total:** 35 minutos

### Prioridad:

🔴 **URGENTE** - Bloquea el uso del feature completo

---

## 📞 PRÓXIMOS PASOS

1. **Implementar correcciones** (Soluciones 1, 2, 5)
2. **Agregar logs temporales** (Solución 3)
3. **Ejecutar pruebas** según checklist
4. **Capturar logs** y verificar que muestran tipos correctos
5. **Si funciona:** Remover logs temporales
6. **Si no funciona:** Enviar logs completos para análisis adicional
7. **Verificar BD** para problemas de datos (cod_tarj duplicados, precios faltantes)

---

**Documento generado:** 2025-10-25
**Implementado por:** Claude Code
**Status:** ⏳ PENDIENTE DE IMPLEMENTACIÓN
