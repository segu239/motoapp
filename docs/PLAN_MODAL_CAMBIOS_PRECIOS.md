# Plan de Implementación: Modal de Cambios de Precios en EditArticulo

## Resumen Ejecutivo

Este documento describe el plan para implementar un modal que muestre los cambios realizados en los precios de un artículo antes de navegar de regreso a la lista de artículos. Actualmente, al actualizar un artículo, el usuario es redirigido inmediatamente sin poder visualizar los cambios aplicados a los precios de lista.

---

## 1. Análisis de Seguridad y Riesgos

### 1.1 Evaluación de Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Modificación del flujo de navegación | Bajo | Solo se agrega un paso intermedio (modal) antes de `router.navigate()` |
| Pérdida de datos | Nulo | Los datos ya están guardados en BD antes de mostrar el modal |
| Conflicto con SweetAlert2 existente | Bajo | El proyecto ya usa SweetAlert2 con HTML personalizado (ver `cambioprecios.component.ts`) |
| Impacto en rendimiento | Nulo | El modal es una operación UI local sin llamadas adicionales a API |
| Regresiones en cálculo de precios | Nulo | No se modifican las funciones de cálculo existentes |

### 1.2 Puntos de Integración Seguros

- **SweetAlert2**: Ya importado y usado extensivamente en el componente (`import Swal from 'sweetalert2'`)
- **currentArticulo**: Objeto que contiene los valores ORIGINALES del artículo (antes de editar)
- **articuloForm**: FormGroup que contiene los valores NUEVOS (después de editar)
- **Flujo onSubmit()**: Solo se modifica el callback de éxito, no la lógica de guardado

### 1.3 Dependencias Verificadas

```typescript
// Ya existentes en el componente - NO requieren importación adicional
import Swal from 'sweetalert2';  // ✅ Ya importado (línea 7)
```

---

## 2. Arquitectura de la Solución

### 2.1 Flujo Actual (Antes)

```
Usuario presiona "Actualizar"
    ↓
onSubmit() valida formulario
    ↓
subirdata.updateArticulo() → Backend actualiza BD
    ↓
Swal "Actualizando..." (300ms)
    ↓
Swal "¡Éxito!"
    ↓
router.navigate(['components/articulo'])  ← Usuario NO ve los cambios
```

### 2.2 Flujo Propuesto (Después)

```
Usuario presiona "Actualizar"
    ↓
onSubmit() valida formulario
    ↓
subirdata.updateArticulo() → Backend actualiza BD
    ↓
Swal "Actualizando..." (300ms)
    ↓
mostrarModalCambios()  ← NUEVO: Modal comparativo
    ↓
Usuario revisa cambios y presiona "Aceptar"
    ↓
router.navigate(['components/articulo'])
```

### 2.3 Campos a Comparar

| Campo | Nombre Display | Formato |
|-------|---------------|---------|
| `precostosi` | Precio Costo s/IVA | Moneda (2 decimales) |
| `prebsiva` | Precio Base s/IVA | Moneda (2 decimales) |
| `precon` | Precio Final | Moneda (2 decimales) |
| `prefi1` | Lista 1 | Moneda (2 decimales) |
| `prefi2` | Lista 2 | Moneda (2 decimales) |
| `prefi3` | Lista 3 | Moneda (2 decimales) |
| `prefi4` | Lista 4 | Moneda (2 decimales) |

---

## 3. Implementación Detallada

### 3.1 Nuevo Método: `mostrarModalCambios()`

**Ubicación**: `editarticulo.component.ts` (después de línea 491)

```typescript
/**
 * Muestra un modal comparativo con los cambios de precios realizados
 * Solo muestra campos que realmente cambiaron
 */
private mostrarModalCambios(): void {
  const cambios = this.calcularCambios();

  // Si no hay cambios en precios, mostrar mensaje simple
  if (cambios.length === 0) {
    Swal.fire({
      title: '¡Éxito!',
      text: 'El artículo se actualizó correctamente. No hubo cambios en precios.',
      icon: 'success',
      confirmButtonText: 'Aceptar'
    }).then(() => {
      this.router.navigate(['components/articulo']);
    });
    return;
  }

  // Construir HTML de la tabla comparativa
  const htmlTabla = this.construirTablaComparativa(cambios);

  Swal.fire({
    title: '¡Artículo Actualizado!',
    html: htmlTabla,
    icon: 'success',
    confirmButtonText: 'Aceptar',
    width: '600px',
    customClass: {
      htmlContainer: 'text-left'
    }
  }).then(() => {
    this.router.navigate(['components/articulo']);
  });
}
```

### 3.2 Nuevo Método: `calcularCambios()`

**Ubicación**: `editarticulo.component.ts` (después de `mostrarModalCambios`)

```typescript
/**
 * Calcula las diferencias entre valores originales y nuevos
 * @returns Array de objetos con los cambios detectados
 */
private calcularCambios(): Array<{
  campo: string;
  label: string;
  valorOriginal: number;
  valorNuevo: number;
  diferencia: number;
  porcentaje: number;
}> {
  const camposPrecios = [
    { campo: 'precostosi', label: 'Precio Costo s/IVA' },
    { campo: 'prebsiva', label: 'Precio Base s/IVA' },
    { campo: 'precon', label: 'Precio Final' },
    { campo: 'prefi1', label: 'Lista 1' },
    { campo: 'prefi2', label: 'Lista 2' },
    { campo: 'prefi3', label: 'Lista 3' },
    { campo: 'prefi4', label: 'Lista 4' }
  ];

  const cambios: Array<{
    campo: string;
    label: string;
    valorOriginal: number;
    valorNuevo: number;
    diferencia: number;
    porcentaje: number;
  }> = [];

  camposPrecios.forEach(({ campo, label }) => {
    const valorOriginal = parseFloat(this.currentArticulo[campo]) || 0;
    const valorNuevo = parseFloat(this.articuloForm.get(campo)?.value) || 0;

    // Solo incluir si hay diferencia significativa (más de 0.01)
    if (Math.abs(valorNuevo - valorOriginal) > 0.01) {
      const diferencia = valorNuevo - valorOriginal;
      const porcentaje = valorOriginal !== 0
        ? ((diferencia / valorOriginal) * 100)
        : 0;

      cambios.push({
        campo,
        label,
        valorOriginal,
        valorNuevo,
        diferencia,
        porcentaje
      });
    }
  });

  return cambios;
}
```

### 3.3 Nuevo Método: `construirTablaComparativa()`

**Ubicación**: `editarticulo.component.ts` (después de `calcularCambios`)

```typescript
/**
 * Construye el HTML de la tabla comparativa para el modal
 * @param cambios Array de cambios calculados
 * @returns String HTML
 */
private construirTablaComparativa(cambios: Array<{
  campo: string;
  label: string;
  valorOriginal: number;
  valorNuevo: number;
  diferencia: number;
  porcentaje: number;
}>): string {
  const formatearPrecio = (valor: number): string => {
    return valor.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatearDiferencia = (diferencia: number, porcentaje: number): string => {
    const signo = diferencia >= 0 ? '+' : '';
    const color = diferencia >= 0 ? '#28a745' : '#dc3545';
    const flecha = diferencia >= 0 ? '↑' : '↓';

    return `<span style="color: ${color}; font-weight: bold;">
      ${flecha} ${signo}${formatearPrecio(diferencia)} (${signo}${porcentaje.toFixed(2)}%)
    </span>`;
  };

  let html = `
    <div class="table-responsive">
      <table class="table table-sm table-bordered" style="font-size: 0.9rem;">
        <thead class="thead-light">
          <tr>
            <th>Campo</th>
            <th class="text-right">Anterior</th>
            <th class="text-right">Nuevo</th>
            <th class="text-center">Cambio</th>
          </tr>
        </thead>
        <tbody>
  `;

  cambios.forEach(cambio => {
    html += `
      <tr>
        <td><strong>${cambio.label}</strong></td>
        <td class="text-right">${formatearPrecio(cambio.valorOriginal)}</td>
        <td class="text-right">${formatearPrecio(cambio.valorNuevo)}</td>
        <td class="text-center">${formatearDiferencia(cambio.diferencia, cambio.porcentaje)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
    <p class="text-muted mt-2" style="font-size: 0.8rem;">
      <i class="fa fa-info-circle"></i>
      Se muestran solo los campos que fueron modificados.
    </p>
  `;

  return html;
}
```

### 3.4 Modificación del Método `onSubmit()`

**Ubicación**: `editarticulo.component.ts` líneas 438-455

**Código Actual (a reemplazar):**
```typescript
this.subirdata.updateArticulo(articuloData).subscribe({
  next: (response: any) => {
    Swal.fire({
      title: 'Actualizando...',
      timer: 300,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
        Swal.fire({
          title: '¡Éxito!',
          text: 'El artículo se actualizó correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
        this.router.navigate(['components/articulo']);
      }
    });
  },
  // ... error handling
});
```

**Código Nuevo (reemplazo):**
```typescript
this.subirdata.updateArticulo(articuloData).subscribe({
  next: (response: any) => {
    Swal.fire({
      title: 'Actualizando...',
      timer: 300,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
        // MODIFICADO: Mostrar modal con cambios antes de navegar
        this.mostrarModalCambios();
      }
    });
  },
  // ... error handling (sin cambios)
});
```

---

## 4. Ejemplo Visual del Modal

```
┌────────────────────────────────────────────────────────┐
│                  ¡Artículo Actualizado!                │
│                         ✓                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┬──────────┬──────────┬─────────────┐ │
│  │ Campo        │ Anterior │ Nuevo    │ Cambio      │ │
│  ├──────────────┼──────────┼──────────┼─────────────┤ │
│  │ Precio Costo │ $100,00  │ $120,00  │ ↑+$20 (+20%)│ │
│  │ Precio Base  │ $130,00  │ $156,00  │ ↑+$26 (+20%)│ │
│  │ Precio Final │ $157,30  │ $188,76  │ ↑+$31 (+20%)│ │
│  │ Lista 1      │ $165,17  │ $198,20  │ ↑+$33 (+20%)│ │
│  │ Lista 2      │ $173,03  │ $207,64  │ ↑+$34 (+20%)│ │
│  └──────────────┴──────────┴──────────┴─────────────┘ │
│                                                        │
│  ⓘ Se muestran solo los campos que fueron modificados │
│                                                        │
│                    [ Aceptar ]                         │
└────────────────────────────────────────────────────────┘
```

---

## 5. Verificación de Seguridad

### 5.1 Checklist Pre-Implementación

- [x] SweetAlert2 ya está importado y funcionando
- [x] No se modifican funciones de cálculo de precios
- [x] No se modifican llamadas al backend
- [x] Los datos se guardan ANTES de mostrar el modal
- [x] El flujo de error permanece sin cambios
- [x] No hay conflictos con otros componentes
- [x] Los valores originales están disponibles en `currentArticulo`
- [x] Los valores nuevos están disponibles en `articuloForm`

### 5.2 Checklist Post-Implementación

- [ ] Verificar que el modal se muestra correctamente
- [ ] Verificar que la navegación funciona después de cerrar el modal
- [ ] Verificar que los cálculos de diferencia son correctos
- [ ] Verificar formato de moneda (locale es-AR)
- [ ] Probar con cambios positivos y negativos
- [ ] Probar cuando no hay cambios en precios
- [ ] Verificar en diferentes navegadores

---

## 6. Testing

### 6.1 Casos de Prueba

| # | Caso | Entrada | Resultado Esperado |
|---|------|---------|-------------------|
| 1 | Aumento de precio costo | +20% en precostosi | Modal muestra todos los precios con incremento |
| 2 | Disminución de precio | -10% en precon | Modal muestra cambios negativos en rojo |
| 3 | Sin cambios en precios | Solo modificar nombre | Modal con mensaje "No hubo cambios en precios" |
| 4 | Cambio parcial | Solo modificar prefi1 manualmente | Modal muestra solo Lista 1 |
| 5 | Precio desde 0 | Artículo con precio 0 → 100 | Porcentaje muestra 0% (evita división por 0) |

### 6.2 Comandos de Prueba

```bash
# Compilar el proyecto
ng build

# Iniciar servidor de desarrollo
ng serve

# Ejecutar tests (si aplica)
ng test
```

---

## 7. Rollback

En caso de problemas, el rollback es simple:

1. Revertir el método `onSubmit()` al código original
2. Eliminar los tres métodos nuevos:
   - `mostrarModalCambios()`
   - `calcularCambios()`
   - `construirTablaComparativa()`

**No se modifican:**
- Base de datos
- Backend (PHP)
- Servicios Angular
- Otros componentes

---

## 8. Cronograma de Implementación

| Paso | Tarea | Tiempo Estimado |
|------|-------|-----------------|
| 1 | Agregar método `calcularCambios()` | 5 min |
| 2 | Agregar método `construirTablaComparativa()` | 5 min |
| 3 | Agregar método `mostrarModalCambios()` | 5 min |
| 4 | Modificar `onSubmit()` | 2 min |
| 5 | Compilar y probar | 10 min |
| 6 | Testing completo | 15 min |
| **Total** | | **~45 min** |

---

## 9. Conclusión

La implementación propuesta es **SEGURA** porque:

1. **No modifica la lógica de negocio**: Los cálculos de precios permanecen intactos
2. **No afecta el backend**: Solo es un cambio de UI/UX
3. **Es reversible**: Se puede hacer rollback fácilmente
4. **Usa tecnologías existentes**: SweetAlert2 ya está integrado
5. **No tiene dependencias nuevas**: No requiere instalar paquetes adicionales
6. **Aislado**: Solo afecta a `editarticulo.component.ts`

---

*Documento generado: 2025-11-27*
*Versión: 1.0*
