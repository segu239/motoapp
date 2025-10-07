# INFORME DE BUG: Eliminación Incorrecta en Carrito

**Fecha**: 2025-10-06
**Componente**: CarritoComponent
**Severidad**: 🔴 CRÍTICA
**Estado**: BUG IDENTIFICADO - Problema pre-existente, NO causado por cambios de subtotales

---

## 1. DESCRIPCIÓN DEL PROBLEMA

### Comportamiento Reportado
El usuario intenta eliminar un ítem específico del carrito (ejemplo: segundo producto de la lista), pero se elimina un ítem diferente (el último producto de la lista).

### Ejemplo Concreto
**Items en carrito:**
1. 4 × ACOPLE FIL-AIRE C/CARB G.SMASH LARG 12815 - EFECTIVO - $6016.96
2. 2 × ACOPLE FIL-AIRE C/CARB M.DAKAR IMP 11136 - EFECTIVO - $8130.22 ← **Usuario quiere eliminar este**
3. 2 × ACOPLE FIL-AIRE C/CARB H WAVE NEW 10340 - TRANSFERENCIA EFECTIVO - $4030.76

**Resultado actual**: Se elimina el ítem #3 en lugar del ítem #2

---

## 2. ANÁLISIS TÉCNICO DE LA CAUSA RAÍZ

### 2.1 Código del Template (HTML)

```html
<tr *ngFor="let item of itemsConTipoPago">
    <!-- ... -->
    <td>
        <button class="btn btn-sm btn-danger" (click)="eliminarItem(item)">
            <i class="fa fa-trash"></i> Eliminar
        </button>
    </td>
</tr>
```

**Problema identificado**:
- El template itera sobre `itemsConTipoPago` (array derivado)
- El botón pasa el objeto `item` de `itemsConTipoPago` a `eliminarItem()`

### 2.2 Código del Método eliminarItem()

```typescript
eliminarItem(item: any) {
  Swal.fire({
    title: 'Seguro que desea eliminar este item?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Si, eliminar!'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire('Eliminado!', 'El item fue eliminado.', 'success')

      // 🔴 LÍNEA PROBLEMÁTICA
      let index = this.itemsEnCarrito.indexOf(item);

      this.itemsEnCarrito.splice(index, 1);
      sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
      this._carrito.actualizarCarrito();
      this.calculoTotal();
      this.actualizarItemsConTipoPago();
    }
  })
}
```

### 2.3 LA CAUSA RAÍZ: indexOf() con Objetos Diferentes

**El problema está en esta línea:**
```typescript
let index = this.itemsEnCarrito.indexOf(item);
```

**¿Por qué falla?**

1. **`item` proviene de `itemsConTipoPago`**, que es un array **DERIVADO** creado así:

```typescript
actualizarItemsConTipoPago() {
    const tarjetaMap = new Map();
    this.tarjetas.forEach(tarjeta => {
        tarjetaMap.set(tarjeta.cod_tarj, tarjeta.tarjeta);
    });

    this.itemsConTipoPago = this.itemsEnCarrito.map(item => {
        const tipoPago = tarjetaMap.get(item.cod_tar.toString());
        return {
            ...item,           // ← Crea NUEVOS objetos
            tipoPago: tipoPago
        };
    });
}
```

2. **El operador spread `{...item}` crea NUEVOS OBJETOS** con referencias de memoria diferentes

3. **`indexOf()` usa comparación por referencia (`===`)**, no por contenido

4. **Resultado**: `indexOf()` NO encuentra el objeto y **devuelve -1**

5. **`splice(-1, 1)` elimina el ÚLTIMO elemento del array** (comportamiento documentado de JavaScript)

---

## 3. PRUEBA DE CONCEPTO

```javascript
// Ejemplo simplificado que reproduce el bug

const original = [{id: 1, nombre: 'A'}, {id: 2, nombre: 'B'}, {id: 3, nombre: 'C'}];
const derivado = original.map(item => ({...item, extra: 'data'}));

console.log(original[1] === derivado[1]);
// false - Son objetos diferentes en memoria

const index = original.indexOf(derivado[1]);
console.log(index);
// -1 - No lo encuentra

original.splice(index, 1);
console.log(original);
// [{id: 1, nombre: 'A'}, {id: 2, nombre: 'B'}]
// ¡Se eliminó el último elemento (C) en lugar del segundo (B)!
```

---

## 4. IMPACTO Y ALCANCE

### 4.1 Relación con Cambios Recientes
**IMPORTANTE**: Este bug **NO fue introducido** por la implementación de subtotales por tipo de pago.

**Evidencia**:
- El método `eliminarItem()` no fue modificado en los cambios recientes
- El patrón `itemsConTipoPago` ya existía antes (línea 56 del código original)
- El método `actualizarItemsConTipoPago()` ya existía antes (líneas 121-144)

### 4.2 ¿Cuándo se Introdujo el Bug?
El bug existe desde que se implementó el sistema de doble array:
- `itemsEnCarrito`: Array fuente de verdad
- `itemsConTipoPago`: Array derivado para mostrar en pantalla

### 4.3 Severidad
- **CRÍTICA**: Pérdida de datos incorrecta
- **Impacto en negocio**: El usuario pierde productos del carrito de forma impredecible
- **Experiencia de usuario**: Confusión total, pérdida de confianza en el sistema

---

## 5. SOLUCIÓN PROPUESTA

### Opción A: Usar `id_articulo` como Identificador Único (RECOMENDADA)

```typescript
eliminarItem(item: any) {
  Swal.fire({
    title: 'Seguro que desea eliminar este item?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Si, eliminar!'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire('Eliminado!', 'El item fue eliminado.', 'success')

      // ✅ SOLUCIÓN: Buscar por id_articulo
      const index = this.itemsEnCarrito.findIndex(i => i.id_articulo === item.id_articulo);

      if (index !== -1) {
        this.itemsEnCarrito.splice(index, 1);
        sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));
        this._carrito.actualizarCarrito();
        this.calculoTotal();
        this.actualizarItemsConTipoPago();
      } else {
        console.error('No se encontró el item a eliminar:', item);
      }
    }
  })
}
```

**Ventajas**:
- Usa campo único que ya existe en el sistema
- Compatible con la lógica existente (ver línea 345: `i.id_articulo === item.id_articulo`)
- Manejo defensivo con validación `index !== -1`

### Opción B: Iterar sobre itemsEnCarrito en el Template

Cambiar el HTML para iterar sobre `itemsEnCarrito` directamente:

```html
<tr *ngFor="let item of itemsEnCarrito">
    <!-- Resolver tipoPago en tiempo real -->
    <td><span class="tipo-pago">{{getTipoPago(item.cod_tar)}}</span></td>
    <!-- ... -->
</tr>
```

**Desventajas**:
- Requiere agregar método auxiliar `getTipoPago()`
- Menos performante (búsqueda en cada render)
- Más cambios en el código

---

## 6. CASO DE PRUEBA PARA VALIDACIÓN

### Escenario de Prueba
1. Agregar 3 productos diferentes al carrito
2. Intentar eliminar el producto del medio (segundo ítem)
3. **Resultado esperado**: Se elimina el segundo producto
4. **Resultado actual (bug)**: Se elimina el tercer producto

### Datos de Prueba
```javascript
Producto 1: id_articulo = 12815, cantidad = 4, precio = 1504.24
Producto 2: id_articulo = 11136, cantidad = 2, precio = 4065.11
Producto 3: id_articulo = 10340, cantidad = 2, precio = 2015.38
```

**Acción**: Click en eliminar del producto 11136
**Esperado**: Quedan productos 12815 y 10340
**Actual**: Quedan productos 12815 y 11136 (se eliminó 10340)

---

## 7. RECOMENDACIONES ADICIONALES

### 7.1 Validación de Datos
Agregar logging para debugging:

```typescript
console.log('Intentando eliminar:', {
  id_articulo: item.id_articulo,
  nomart: item.nomart
});
console.log('Índice encontrado:', index);
console.log('Items antes de eliminar:', this.itemsEnCarrito.length);
```

### 7.2 Mejora Futura: TrackBy en ngFor
Agregar `trackBy` para mejorar performance de Angular:

```typescript
// En el componente
trackByArticulo(index: number, item: any): any {
  return item.id_articulo;
}
```

```html
<!-- En el template -->
<tr *ngFor="let item of itemsConTipoPago; trackBy: trackByArticulo">
```

### 7.3 Prevención de Bugs Similares
- Documentar claramente la diferencia entre `itemsEnCarrito` y `itemsConTipoPago`
- Agregar comentarios en el código sobre la sincronización de arrays
- Considerar refactorizar a un solo array con computed properties

---

## 8. CONCLUSIÓN

### Resumen Ejecutivo
- **Bug identificado**: `indexOf()` con objetos derivados siempre devuelve -1
- **Consecuencia**: `splice(-1, 1)` elimina el último elemento
- **Causa raíz**: Desincronización entre array mostrado (`itemsConTipoPago`) y array almacenado (`itemsEnCarrito`)
- **Solución**: Usar `findIndex()` con comparación por `id_articulo`
- **Urgencia**: Alta - afecta operación crítica del negocio

### Estado del Sistema
✅ **Los cambios de subtotales NO introdujeron este bug**
🔴 **El bug existía previamente en el código**
✅ **Solución simple y segura disponible (Opción A)**
⚠️ **Requiere testing inmediato después de aplicar el fix**

---

## ANEXO A: Ubicaciones de Código

- **Método problemático**: `carrito.component.ts` línea 307
- **Template afectado**: `carrito.component.html` línea 30
- **Método auxiliar**: `actualizarItemsConTipoPago()` línea 128
- **Campo identificador usado en otras partes**: línea 345 (actualizarCantidad)

---

**Generado por**: Claude Code
**Validado contra**: Código fuente actual en /mnt/c/Users/Telemetria/T49E2PT/angular/motoapp
