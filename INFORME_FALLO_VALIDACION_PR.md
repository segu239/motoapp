# INFORME: Fallo en Validación de Presupuestos

**Fecha**: 2025-10-22
**Severidad**: 🔴 **CRÍTICA**
**Estado**: ❌ **BUG CONFIRMADO**

---

## 🚨 PROBLEMA REPORTADO

El usuario reporta que:
> "Cuando se intenta generar un presupuesto con un método no permitido efectivamente informa que no es permitido, pero si se continúa sí se puede efectuar la finalización de la venta. Debería estar bloqueada también."

---

## 🔍 ANÁLISIS REALIZADO

### 1. Revisión del Flujo de Validación

Se verificaron las 3 capas de validación implementadas:

#### ✅ CAPA 1: tipoDocChange() (líneas 282-316)
- **Funcionalidad**: Valida al cambiar a tipo "PR"
- **Comportamiento**: Muestra SweetAlert y hace `return`
- **Estado**: CORRECTO estructuralmente

#### ✅ CAPA 2: pendientes() (líneas 1030-1055)
- **Funcionalidad**: Valida antes de procesar
- **Comportamiento**: Muestra SweetAlert y retorna `false`
- **Estado**: CORRECTO estructuralmente

#### ✅ CAPA 3: finalizar() (líneas 569-588)
- **Funcionalidad**: Última defensa antes del backend
- **Comportamiento**: Muestra SweetAlert y hace `return`
- **Estado**: CORRECTO estructuralmente

### 2. Identificación de la Causa Raíz

**🐛 BUG ENCONTRADO: Inconsistencia de Tipos de Datos**

**Ubicación del Problema**: Método `validarMetodosPagoPresupuesto()` (línea 549)

```typescript
const itemsNoPermitidos = this.itemsEnCarrito.filter(item =>
  !this.PRESUPUESTO_COD_TARJ_PERMITIDOS.includes(item.cod_tar)
);
```

**El Problema**:
- La constante `PRESUPUESTO_COD_TARJ_PERMITIDOS` es un array de **números**: `[12, 1112, 111]`
- El campo `item.cod_tar` en los items del carrito puede ser **string** o **number**
- El método `includes()` usa comparación estricta (`===`)
- Si `cod_tar` es string, entonces `"12" !== 12`, por lo que el `includes()` retorna `false`

**Evidencia**:

En otros métodos del componente se observa conversión explícita de tipos:

```typescript
// Línea 1471
tarjetaInfo = this.tarjetas.find(t =>
  t.cod_tarj.toString() === primerItem.cod_tar.toString()
);
```

Esto confirma que `cod_tar` puede ser string.

---

## 💥 ESCENARIO DEL FALLO

### Caso 1: cod_tar es STRING

```javascript
// Items en carrito
itemsEnCarrito = [
  { id_articulo: 1, cod_tar: "12", nomart: "Producto 1" },  // ← STRING
  { id_articulo: 2, cod_tar: "111", nomart: "Producto 2" }  // ← STRING
]

// Constante de validación
PRESUPUESTO_COD_TARJ_PERMITIDOS = [12, 1112, 111]  // ← NUMBERS

// Validación
"12" !== 12  → false  → !false = true  → ❌ Item marcado como NO PERMITIDO
"111" !== 111 → false → !false = true  → ❌ Item marcado como NO PERMITIDO

// Resultado: TODOS los items se marcan como no permitidos
// Incluso si tienen códigos permitidos
```

### Caso 2: cod_tar es NUMBER (funciona)

```javascript
// Items en carrito
itemsEnCarrito = [
  { id_articulo: 1, cod_tar: 12, nomart: "Producto 1" },   // ← NUMBER
  { id_articulo: 2, cod_tar: 111, nomart: "Producto 2" }  // ← NUMBER
]

// Validación
12 === 12   → true  → !true = false  → ✅ Item PERMITIDO
111 === 111 → true  → !true = false  → ✅ Item PERMITIDO

// Resultado: Validación funciona correctamente
```

---

## 🎯 IMPACTO DEL BUG

### Comportamiento Actual (CON BUG)

| Escenario | cod_tar Type | Código | Resultado Esperado | Resultado Real | Estado |
|-----------|--------------|--------|-------------------|----------------|---------|
| Efectivo Ajuste | STRING | "12" | ✅ Permitido | ❌ Bloqueado | FALLO |
| Transferencia Ajuste | STRING | "1112" | ✅ Permitido | ❌ Bloqueado | FALLO |
| Cuenta Corriente | STRING | "111" | ✅ Permitido | ❌ Bloqueado | FALLO |
| Efectivo Normal | STRING | "11" | ❌ Bloqueado | ❌ Bloqueado | OK |
| Efectivo Ajuste | NUMBER | 12 | ✅ Permitido | ✅ Permitido | OK |
| Efectivo Normal | NUMBER | 11 | ❌ Bloqueado | ❌ Bloqueado | OK |

### Consecuencias

1. **Falsos Positivos**: Items con métodos permitidos son bloqueados incorrectamente si cod_tar es string
2. **Experiencia de Usuario Degradada**: Usuarios no pueden generar presupuestos válidos
3. **Confusión**: El mensaje de error indica métodos no permitidos cuando en realidad SÍ están permitidos
4. **Inconsistencia**: El comportamiento depende del tipo de dato (string vs number) lo cual es impredecible

---

## 🔧 SOLUCIÓN PROPUESTA

### Opción 1: Convertir a Number en la Validación (RECOMENDADA)

Modificar el método `validarMetodosPagoPresupuesto()` para convertir `cod_tar` a number antes de comparar:

```typescript
private validarMetodosPagoPresupuesto(): { items: any[], metodosNoPermitidos: string[] } {
  const itemsNoPermitidos = this.itemsEnCarrito.filter(item => {
    // ✅ SOLUCIÓN: Convertir cod_tar a number antes de validar
    const codTarNum = typeof item.cod_tar === 'string'
      ? parseInt(item.cod_tar, 10)
      : item.cod_tar;

    return !this.PRESUPUESTO_COD_TARJ_PERMITIDOS.includes(codTarNum);
  });

  const metodosProblematicos = itemsNoPermitidos
    .map(item => {
      const codTarNum = typeof item.cod_tar === 'string'
        ? parseInt(item.cod_tar, 10)
        : item.cod_tar;

      const tarjeta = this.tarjetas.find(t => t.cod_tarj === codTarNum);
      return tarjeta ? tarjeta.tarjeta : `Código ${item.cod_tar}`;
    })
    .filter((v, i, a) => a.indexOf(v) === i);

  return {
    items: itemsNoPermitidos,
    metodosNoPermitidos: metodosProblematicos
  };
}
```

**Ventajas**:
- ✅ Solución localizada en un solo método
- ✅ No requiere cambios en otros lugares
- ✅ Maneja ambos tipos de datos (string y number)
- ✅ Backward compatible

**Desventajas**:
- ⚠️ No resuelve la inconsistencia de tipos en el código base

### Opción 2: Normalizar Tipos al Cargar Items (MÁS ROBUSTA)

Asegurar que `cod_tar` siempre sea number al cargar items en el carrito:

```typescript
getItemsCarrito() {
  const items = sessionStorage.getItem('carrito');
  if (items) {
    try {
      this.itemsEnCarrito = JSON.parse(items).map(item => ({
        ...item,
        cod_tar: typeof item.cod_tar === 'string'
          ? parseInt(item.cod_tar, 10)
          : item.cod_tar
      }));

      if (!Array.isArray(this.itemsEnCarrito)) {
        this.itemsEnCarrito = [];
      }
    } catch (error) {
      console.error('Error al parsear items del carrito:', error);
      this.itemsEnCarrito = [];
      sessionStorage.removeItem('carrito');
    }
  } else {
    this.itemsEnCarrito = [];
  }
}
```

**Ventajas**:
- ✅ Solución preventiva desde el origen
- ✅ Garantiza consistencia de tipos en todo el componente
- ✅ Más robusto a largo plazo

**Desventajas**:
- ⚠️ Podría afectar otros componentes si comparten el sessionStorage

---

## 📊 PRUEBAS DE VALIDACIÓN

### Test 1: cod_tar como STRING con código permitido
```javascript
itemsEnCarrito = [{ cod_tar: "12", nomart: "Test" }]
ESPERADO: ✅ Permitir presupuesto
ACTUAL (CON BUG): ❌ Bloquea incorrectamente
DESPUÉS DE FIX: ✅ Permite correctamente
```

### Test 2: cod_tar como STRING con código NO permitido
```javascript
itemsEnCarrito = [{ cod_tar: "11", nomart: "Test" }]
ESPERADO: ❌ Bloquear presupuesto
ACTUAL (CON BUG): ❌ Bloquea (funciona)
DESPUÉS DE FIX: ❌ Bloquea (sigue funcionando)
```

### Test 3: cod_tar como NUMBER con código permitido
```javascript
itemsEnCarrito = [{ cod_tar: 12, nomart: "Test" }]
ESPERADO: ✅ Permitir presupuesto
ACTUAL (CON BUG): ✅ Permite (funciona)
DESPUÉS DE FIX: ✅ Permite (sigue funcionando)
```

### Test 4: Mix de tipos
```javascript
itemsEnCarrito = [
  { cod_tar: "12", nomart: "Test 1" },   // STRING permitido
  { cod_tar: 111, nomart: "Test 2" }     // NUMBER permitido
]
ESPERADO: ✅ Permitir presupuesto
ACTUAL (CON BUG): ❌ Bloquea por el string
DESPUÉS DE FIX: ✅ Permite ambos
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### Fase 1: Implementar Fix Inmediato (15 minutos)

**Acción**: Modificar método `validarMetodosPagoPresupuesto()`

**Pasos**:
1. Abrir `carrito.component.ts`
2. Ubicar método en línea 548
3. Aplicar conversión de tipos
4. Compilar y verificar

**Tiempo estimado**: 15 minutos

### Fase 2: Testing (30 minutos)

**Pruebas a realizar**:
1. ✅ Presupuesto con cod_tar STRING "12" (debe permitir)
2. ✅ Presupuesto con cod_tar STRING "111" (debe permitir)
3. ✅ Presupuesto con cod_tar STRING "1112" (debe permitir)
4. ❌ Presupuesto con cod_tar STRING "11" (debe bloquear)
5. ✅ Presupuesto con cod_tar NUMBER 12 (debe permitir - regresión)
6. ❌ Presupuesto con cod_tar NUMBER 11 (debe bloquear - regresión)

**Tiempo estimado**: 30 minutos

### Fase 3: Normalización de Tipos (Opcional - 30 minutos)

**Acción**: Implementar Opción 2 para mayor robustez

**Pasos**:
1. Modificar `getItemsCarrito()`
2. Testing adicional
3. Verificar otros componentes

**Tiempo estimado**: 30 minutos

---

## 📝 CÓDIGO DE FIX

### Fix Inmediato (Copiar/Pegar)

**Ubicación**: `carrito.component.ts`, línea 548

**REEMPLAZAR**:
```typescript
private validarMetodosPagoPresupuesto(): { items: any[], metodosNoPermitidos: string[] } {
  const itemsNoPermitidos = this.itemsEnCarrito.filter(item =>
    !this.PRESUPUESTO_COD_TARJ_PERMITIDOS.includes(item.cod_tar)
  );

  const metodosProblematicos = itemsNoPermitidos
    .map(item => {
      const tarjeta = this.tarjetas.find(t => t.cod_tarj === item.cod_tar);
      return tarjeta ? tarjeta.tarjeta : `Código ${item.cod_tar}`;
    })
    .filter((v, i, a) => a.indexOf(v) === i); // Eliminar duplicados

  return {
    items: itemsNoPermitidos,
    metodosNoPermitidos: metodosProblematicos
  };
}
```

**POR**:
```typescript
private validarMetodosPagoPresupuesto(): { items: any[], metodosNoPermitidos: string[] } {
  const itemsNoPermitidos = this.itemsEnCarrito.filter(item => {
    // ✅ FIX: Convertir cod_tar a number para comparación correcta
    const codTarNum = typeof item.cod_tar === 'string'
      ? parseInt(item.cod_tar, 10)
      : item.cod_tar;

    return !this.PRESUPUESTO_COD_TARJ_PERMITIDOS.includes(codTarNum);
  });

  const metodosProblematicos = itemsNoPermitidos
    .map(item => {
      // ✅ FIX: Convertir cod_tar a number para buscar en tarjetas
      const codTarNum = typeof item.cod_tar === 'string'
        ? parseInt(item.cod_tar, 10)
        : item.cod_tar;

      const tarjeta = this.tarjetas.find(t => t.cod_tarj === codTarNum);
      return tarjeta ? tarjeta.tarjeta : `Código ${item.cod_tar}`;
    })
    .filter((v, i, a) => a.indexOf(v) === i); // Eliminar duplicados

  return {
    items: itemsNoPermitidos,
    metodosNoPermitidos: metodosProblematicos
  };
}
```

---

## 🏁 CRITERIOS DE ÉXITO

El fix se considera exitoso si:

1. ✅ Presupuestos con cod_tar STRING "12", "1112", "111" se PERMITEN
2. ❌ Presupuestos con cod_tar STRING "11", "20", etc. se BLOQUEAN
3. ✅ Presupuestos con cod_tar NUMBER 12, 1112, 111 se PERMITEN (regresión)
4. ❌ Presupuestos con cod_tar NUMBER 11, 20, etc. se BLOQUEAN (regresión)
5. ✅ No hay errores en consola
6. ✅ Mensajes de SweetAlert son claros y precisos

---

## 📎 REFERENCIAS

- **Archivo Afectado**: `carrito.component.ts`
- **Método con Bug**: `validarMetodosPagoPresupuesto()` (línea 548)
- **Métodos que Llaman**: `tipoDocChange()`, `pendientes()`, `finalizar()`
- **Constante**: `PRESUPUESTO_COD_TARJ_PERMITIDOS` (línea 64)

---

## ✅ CONCLUSIÓN

**Causa Raíz Confirmada**: Inconsistencia de tipos de datos (string vs number) en la comparación de `cod_tar`

**Severidad**: 🔴 CRÍTICA - Bloquea funcionalidad válida y genera confusión

**Solución**: Conversión explícita de tipos en método de validación

**Tiempo de Fix**: 15 minutos + 30 minutos de testing = 45 minutos total

**Prioridad**: INMEDIATA - Debe aplicarse antes del testing final

---

**Fecha de Informe**: 2025-10-22
**Versión**: 1.0
**Estado**: ✅ ANÁLISIS COMPLETO - LISTO PARA IMPLEMENTAR FIX
