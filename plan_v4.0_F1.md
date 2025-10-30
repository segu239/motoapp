# 📋 FASE 1 COMPLETADA - PLAN v4.0
## Sistema de Selector de Tipo de Pago en Carrito con Items "Solo Consulta"

**Fecha de implementación:** 2025-10-25
**Versión:** 4.0 - FASE 1
**Estado:** ✅ COMPLETADA
**Tiempo estimado:** 2 horas
**Tiempo real:** ~1.5 horas

---

## ✅ RESUMEN DE LA FASE 1

La Fase 1 se enfocó en **preparar la estructura de datos** para que cada item del carrito contenga TODOS los metadatos necesarios para implementar el selector de tipo de pago y el modo consulta.

### Objetivo cumplido:
Asegurar que cada item agregado al carrito incluya:
- ✅ Todos los precios disponibles (precon, prefi1, prefi2, prefi3, prefi4)
- ✅ Tipo de moneda del producto
- ✅ Activadatos del tipo de pago seleccionado
- ✅ Nombre del tipo de pago para referencia

---

## 📝 CAMBIOS IMPLEMENTADOS

### 1. Modificaciones en `calculoproducto.component.ts`

**Archivo:** `C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\calculoproducto\calculoproducto.component.ts`

#### 1.1. Modificación del método `generarPedido()` (líneas 161-194)

**Ubicación:** Después de la línea 159 donde se asigna `this.pedido.precio`

**Código agregado:**
```typescript
// ════════════════════════════════════════════════════════════
// ✅ NUEVO v4.0: Guardar TODOS los precios y metadatos
// ════════════════════════════════════════════════════════════
this.pedido.precon = this.producto.precon || 0;
this.pedido.prefi1 = this.producto.prefi1 || 0;
this.pedido.prefi2 = this.producto.prefi2 || 0;
this.pedido.prefi3 = this.producto.prefi3 || 0;
this.pedido.prefi4 = this.producto.prefi4 || 0;
this.pedido.tipo_moneda = this.producto.tipo_moneda || 3; // Default ARS

// Buscar activadatos de la tarjeta seleccionada
const activadatos = this.obtenerActivadatosDeCondicionVenta();
this.pedido.activadatos = activadatos;

// Guardar nombre del tipo de pago para referencia
this.pedido.tipoPago = this.obtenerNombreTipoPago();

console.log('✅ Item agregado con metadatos completos:', {
  id_articulo: this.pedido.id_articulo,
  precio_seleccionado: this.pedido.precio,
  precios_disponibles: {
    precon: this.pedido.precon,
    prefi1: this.pedido.prefi1,
    prefi2: this.pedido.prefi2,
    prefi3: this.pedido.prefi3,
    prefi4: this.pedido.prefi4
  },
  tipo_moneda: this.pedido.tipo_moneda,
  activadatos: this.pedido.activadatos,
  cod_tar: this.pedido.cod_tar,
  tipoPago: this.pedido.tipoPago
});
// ════════════════════════════════════════════════════════════
```

**Propósito:**
- Guardar todos los precios alternativos del producto para permitir recálculo dinámico
- Guardar tipo de moneda para conversiones futuras
- Obtener y guardar activadatos del tipo de pago
- Guardar nombre del tipo de pago para mostrar en UI

#### 1.2. Métodos auxiliares agregados (líneas 256-313)

**Ubicación:** Al final de la clase, antes del cierre `}`

**Métodos agregados:**

##### a) `obtenerActivadatosDeCondicionVenta()` (líneas 264-289)
```typescript
/**
 * Obtiene el activadatos del tipo de pago seleccionado
 * Intentamos obtenerlo de sessionStorage donde se guarda la condición de venta
 */
private obtenerActivadatosDeCondicionVenta(): number {
  try {
    const condicionVentaStr = sessionStorage.getItem('condicionVentaSeleccionada');
    if (condicionVentaStr) {
      const condicionVenta = JSON.parse(condicionVentaStr);
      if (condicionVenta.activadatos !== undefined && condicionVenta.activadatos !== null) {
        return condicionVenta.activadatos;
      }
    }
  } catch (error) {
    console.warn('No se pudo leer activadatos de sessionStorage:', error);
  }

  // Fallback: intentar inferir de los datos disponibles
  if (this.tarjeta && this.tarjeta.Titular) {
    return 1;
  }
  if (this.cheque && this.cheque.Banco) {
    return 2;
  }
  return 0;
}
```

**Propósito:**
- Lee el activadatos desde sessionStorage
- Implementa lógica de fallback para inferir activadatos si no está disponible
- Retorna 0, 1 o 2 según el tipo de datos requeridos

##### b) `obtenerNombreTipoPago()` (líneas 294-309)
```typescript
/**
 * Obtiene el nombre del tipo de pago actual
 */
private obtenerNombreTipoPago(): string {
  try {
    const condicionVentaStr = sessionStorage.getItem('condicionVentaSeleccionada');
    if (condicionVentaStr) {
      const condicionVenta = JSON.parse(condicionVentaStr);
      if (condicionVenta.nombreTarjeta) {
        return condicionVenta.nombreTarjeta;
      }
    }
  } catch (error) {
    console.warn('No se pudo leer nombre de tipo de pago:', error);
  }

  return 'Sin especificar';
}
```

**Propósito:**
- Obtiene el nombre legible del tipo de pago (ej: "EFECTIVO", "ELECTRON")
- Usado para mostrar en la UI del carrito

---

### 2. Modificaciones en `condicionventa.component.ts`

**Archivo:** `C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\condicionventa\condicionventa.component.ts`

#### 2.1. Modificación del método `selectTipo()` (líneas 953-961)

**Cambio realizado:**

**ANTES:**
```typescript
sessionStorage.setItem('condicionVentaSeleccionada', JSON.stringify({
  tarjeta: this.tipoVal,
  cod_tarj: this.codTarj,
  listaprecio: this.listaPrecio,
  esMayorista: this.esMayorista
}));
```

**DESPUÉS:**
```typescript
// Guardar la condición de venta seleccionada en sessionStorage
// ✅ NUEVO v4.0: Se agregan activadatos y nombreTarjeta para el selector de tipo de pago en carrito
sessionStorage.setItem('condicionVentaSeleccionada', JSON.stringify({
  tarjeta: this.tipoVal,
  cod_tarj: this.codTarj,
  listaprecio: this.listaPrecio,
  esMayorista: this.esMayorista,
  activadatos: this.activaDatos,      // ← NUEVO v4.0
  nombreTarjeta: this.tipoVal         // ← NUEVO v4.0
}));
```

**Propósito:**
- Guardar activadatos en sessionStorage para que esté disponible en calculoproducto
- Guardar nombreTarjeta para mostrar en UI

---

## 🔍 ESTRUCTURA DE DATOS RESULTANTE

Después de la Fase 1, cada item en el carrito (sessionStorage['carrito']) tendrá la siguiente estructura:

```typescript
{
  // Campos existentes
  idart: number,
  id_articulo: number,
  cantidad: number,
  precio: number,              // Precio calculado según lista seleccionada
  idcli: number,
  idven: number,
  cod_tar: number,
  tipoprecio: string,
  nomart: string,

  // ✅ NUEVOS CAMPOS v4.0
  precon: number,              // Precio contado (lista 0)
  prefi1: number,              // Precio lista 1
  prefi2: number,              // Precio lista 2 (tarjetas)
  prefi3: number,              // Precio lista 3
  prefi4: number,              // Precio lista 4
  tipo_moneda: number,         // 1=?, 2=USD, 3=ARS
  activadatos: number,         // 0=sin datos, 1=tarjeta, 2=cheque
  tipoPago: string,            // Nombre del tipo de pago (ej: "EFECTIVO")

  // Campos de tarjeta (si activadatos=1)
  titulartar?: string,
  numerotar?: number,
  nautotar?: number,
  dni_tar?: number,

  // Campos de cheque (si activadatos=2)
  banco?: string,
  ncuenta?: number,
  ncheque?: number,
  // ... otros campos de cheque
}
```

---

## 📊 EJEMPLO DE DATOS

### Item agregado con EFECTIVO (activadatos=0):
```json
{
  "id_articulo": 123,
  "nomart": "Cable USB Tipo C",
  "cantidad": 2,
  "precio": 1500.00,
  "cod_tar": 11,
  "tipoPago": "EFECTIVO",
  "precon": 1500.00,
  "prefi1": 1650.00,
  "prefi2": 1800.00,
  "prefi3": 1900.00,
  "prefi4": 2000.00,
  "tipo_moneda": 3,
  "activadatos": 0
}
```

### Item agregado con ELECTRON (activadatos=1):
```json
{
  "id_articulo": 124,
  "nomart": "Mouse Inalámbrico",
  "cantidad": 1,
  "precio": 3500.00,
  "cod_tar": 1,
  "tipoPago": "ELECTRON",
  "precon": 3000.00,
  "prefi1": 3200.00,
  "prefi2": 3500.00,
  "prefi3": 3700.00,
  "prefi4": 4000.00,
  "tipo_moneda": 3,
  "activadatos": 1,
  "titulartar": "Juan Pérez",
  "numerotar": 1234567890123456,
  "nautotar": 456,
  "dni_tar": 12345678
}
```

---

## 🧪 TESTING REALIZADO

### ✅ Compilación
- Proyecto compila sin errores TypeScript
- No hay warnings relacionados con los cambios

### 📝 Verificaciones pendientes (para testing manual):
- [ ] Agregar un item con EFECTIVO y verificar en sessionStorage que tenga todos los campos
- [ ] Agregar un item con ELECTRON y verificar datos de tarjeta + metadatos
- [ ] Agregar un item con CHEQUE y verificar datos de cheque + metadatos
- [ ] Verificar que precon, prefi1-4 contengan valores correctos
- [ ] Verificar que tipo_moneda esté presente
- [ ] Verificar que activadatos sea 0, 1 o 2 según corresponda
- [ ] Verificar que tipoPago tenga el nombre correcto

---

## 📁 ARCHIVOS MODIFICADOS

| Archivo | Líneas modificadas | Tipo de cambio |
|---------|-------------------|----------------|
| `calculoproducto.component.ts` | 161-194 | Agregado (método generarPedido) |
| `calculoproducto.component.ts` | 256-313 | Agregado (métodos auxiliares) |
| `condicionventa.component.ts` | 953-961 | Modificado (sessionStorage) |

**Total de líneas agregadas:** ~70 líneas
**Total de archivos modificados:** 2

---

## 🎯 PRÓXIMOS PASOS - FASE 2

La Fase 2 implementará la **interfaz de usuario** del selector de tipo de pago en el carrito:

### Tareas de Fase 2:
1. **Modificar `carrito.component.html`:**
   - Reemplazar texto fijo de tipo de pago por dropdown de PrimeNG
   - Agregar badge "SOLO CONSULTA" cuando corresponda
   - Agregar botón "Revertir" para items en consulta
   - Agregar warning global si hay items en consulta
   - Modificar botón "Finalizar" para deshabilitar con items en consulta

2. **Agregar estilos en `carrito.component.css`:**
   - Estilos para items en modo consulta (fondo amarillo)
   - Estilos para badge de advertencia
   - Estilos para alert global

3. **Implementar métodos en `carrito.component.ts`:**
   - `onTipoPagoChange()` - Maneja cambio de tipo de pago
   - `marcarComoSoloConsulta()` - Marca item como consulta
   - `quitarMarcaSoloConsulta()` - Quita marca de consulta
   - `revertirItemAOriginal()` - Revierte item a estado original
   - `hayItemsSoloConsulta()` - Verifica si hay items en consulta
   - `contarItemsSoloConsulta()` - Cuenta items en consulta
   - `validarItemsSoloConsulta()` - Valida antes de finalizar
   - Métodos auxiliares para conversión de moneda

4. **Modificar método `finalizar()`:**
   - Agregar validación para bloquear si hay items en consulta

**Tiempo estimado Fase 2:** 3 horas

---

## ⚠️ NOTAS IMPORTANTES

### 1. Compatibilidad hacia atrás
Los cambios son **100% compatibles** con items existentes en sessionStorage. Si un item no tiene los nuevos campos, los métodos usan valores por defecto:
- `precon, prefi1-4`: 0
- `tipo_moneda`: 3 (ARS)
- `activadatos`: Se infiere o usa 0

### 2. Logs para debugging
Se agregaron console.log detallados en el método `generarPedido()` para facilitar debugging durante el desarrollo de la Fase 2.

### 3. Fallbacks robustos
Los métodos auxiliares implementan múltiples niveles de fallback para asegurar que siempre retornen un valor válido, incluso si sessionStorage está vacío o corrupto.

### 4. Seguridad
Los métodos usan try-catch para manejar errores de parsing de JSON y evitar crashes de la aplicación.

---

## 🔗 REFERENCIAS

- **Plan original:** `plan_v4.0.md`
- **Issue/Ticket:** Sistema de Selector de Tipo de Pago en Carrito
- **Documentación BD:** PostgreSQL - Tablas `tarjcredito` y `artsucursal`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN FASE 1

- [x] Modificar `calculoproducto.component.ts` - Método `generarPedido()`
- [x] Agregar métodos auxiliares en `calculoproducto.component.ts`
- [x] Modificar `condicionventa.component.ts` - sessionStorage
- [x] Verificar compilación sin errores
- [x] Generar documentación de Fase 1
- [ ] Testing manual (pendiente para usuario)

---

**Implementado por:** Claude Code
**Fecha:** 2025-10-25
**Próximo paso:** Implementar Fase 2 - Interfaz de Usuario
