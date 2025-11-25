# Changelog: Corrección de Decimales en NewArticulo

**Fecha:** 2025-11-25
**Versión:** 2.2.1
**Tipo:** Bugfix
**Componente:** `newarticulo.component.html`

---

## Descripción del Cambio

Se corrigió un error de validación HTML5 que impedía guardar artículos cuando los campos de precios contenían valores con más de 2 decimales.

---

## Problema Resuelto

### Síntoma
Al intentar guardar un nuevo artículo, el navegador mostraba el error:
> "Ingresa un valor válido. Los dos valores válidos más aproximados son 29489.27 y 29489.28."

### Causa Raíz
El atributo `step="0.01"` en los campos de tipo `number` restringía la entrada a 2 decimales, mientras que:
- El código TypeScript calculaba valores con 4 decimales (`toFixed(4)`)
- La base de datos PostgreSQL acepta 4 decimales (`numeric(12,4)`)

---

## Cambios Realizados

### Archivo Modificado
`src/app/components/newarticulo/newarticulo.component.html`

### Detalle de Cambios

| Línea | Campo | Atributo Anterior | Atributo Nuevo |
|-------|-------|-------------------|----------------|
| 180 | `precostosi` (Precio Costo sin IVA) | `step="0.01"` | `step="0.0001"` |
| 189 | `descuento` (Descuento %) | `step="0.01"` | `step="0.0001"` |
| 201 | `prebsiva` (Precio Base s/IVA) | `step="0.01"` | `step="0.0001"` |
| 250 | `precon` (Precio Final) | `step="0.01"` | `step="0.0001"` |

### Mensajes de Ayuda Actualizados

| Línea | Mensaje Anterior | Mensaje Nuevo |
|-------|------------------|---------------|
| 181 | "Valor numérico con hasta 2 decimales" | "Valor numérico con hasta 4 decimales" |
| 202 | "Valor numérico con hasta 2 decimales" | "Valor numérico con hasta 4 decimales" |
| 251 | "Valor numérico con hasta 2 decimales" | "Valor numérico con hasta 4 decimales" |

### Campo No Modificado

| Campo | Atributo | Razón |
|-------|----------|-------|
| `margen` (Margen %) | `step="0.01"` | La columna en BD es `numeric(7,2)` - solo permite 2 decimales |

---

## Diff de Cambios

```diff
--- a/src/app/components/newarticulo/newarticulo.component.html
+++ b/src/app/components/newarticulo/newarticulo.component.html
@@ -177,8 +177,8 @@
                                         <div class="form-group row">
                                             <label class="control-label text-right col-md-3">Precio Costo sin IVA</label>
                                             <div class="col-md-9">
-                                                <input type="number" step="0.01" class="form-control" formControlName="precostosi" placeholder="" (change)="calcularDesdePrecoSinIva()">
-                                                <small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
+                                                <input type="number" step="0.0001" class="form-control" formControlName="precostosi" placeholder="" (change)="calcularDesdePrecoSinIva()">
+                                                <small class="form-control-feedback">Valor numérico con hasta 4 decimales</small>
                                             </div>
                                         </div>
                                     </div>
@@ -186,7 +186,7 @@
                                         <div class="form-group row">
                                             <label class="control-label text-right col-md-3">Descuento (%)</label>
                                             <div class="col-md-9">
-                                                <input type="number" step="0.01" class="form-control" formControlName="descuento" placeholder="" (change)="calcularPrecioBase()">
+                                                <input type="number" step="0.0001" class="form-control" formControlName="descuento" placeholder="" (change)="calcularPrecioBase()">
                                                 <small class="form-control-feedback">Porcentaje de descuento</small>
                                             </div>
                                         </div>
@@ -198,8 +198,8 @@
                                         <div class="form-group row">
                                             <label class="control-label text-right col-md-3">Precio Base s/IVA</label>
                                             <div class="col-md-9">
-                                                <input type="number" step="0.01" class="form-control" formControlName="prebsiva" placeholder="" (change)="calcularMargen()">
-                                                <small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
+                                                <input type="number" step="0.0001" class="form-control" formControlName="prebsiva" placeholder="" (change)="calcularMargen()">
+                                                <small class="form-control-feedback">Valor numérico con hasta 4 decimales</small>
                                             </div>
                                         </div>
                                     </div>
@@ -247,8 +247,8 @@
                                         <div class="form-group row">
                                             <label class="control-label text-right col-md-3">Precio Final *</label>
                                             <div class="col-md-9">
-                                                <input type="number" step="0.01" class="form-control" formControlName="precon" placeholder="" (change)="calcularPreciosSinIva()">
-                                                <small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
+                                                <input type="number" step="0.0001" class="form-control" formControlName="precon" placeholder="" (change)="calcularPreciosSinIva()">
+                                                <small class="form-control-feedback">Valor numérico con hasta 4 decimales</small>
                                             </div>
                                         </div>
                                     </div>
```

---

## Verificación de Compatibilidad

### Base de Datos (PostgreSQL)
| Campo | Tipo en BD | Decimales Permitidos | Estado |
|-------|------------|---------------------|--------|
| `precon` | `numeric(12,4)` | 4 | ✅ Compatible |
| `prebsiva` | `numeric(12,4)` | 4 | ✅ Compatible |
| `precostosi` | `numeric(12,4)` | 4 | ✅ Compatible |
| `descuento` | `numeric(12,4)` | 4 | ✅ Compatible |
| `prefi1-4` | `numeric(12,4)` | 4 | ✅ Compatible |
| `margen` | `numeric(7,2)` | 2 | ✅ Sin cambios |

### Backend (PHP)
- **Archivo:** `Descarga.php.txt`
- **Función:** `SubirDatosArticulo_post()`
- **Estado:** ✅ Sin cambios necesarios - el backend ya acepta valores decimales sin restricción

### Frontend (TypeScript)
- **Archivo:** `newarticulo.component.ts`
- **Estado:** ✅ Sin cambios necesarios - ya usa `toFixed(4)` en los cálculos

---

## Pruebas Recomendadas

### Caso 1: Creación básica con decimales
1. Ir a `/components/newarticulo`
2. Completar campos obligatorios
3. Ingresar Precio Final: `29489.2730`
4. **Resultado esperado:** Formulario válido, guardado exitoso

### Caso 2: Cálculo automático
1. Ingresar Precio Costo sin IVA: `24371.3000`
2. Ingresar Margen: `90`
3. Seleccionar IVA 21%
4. **Resultado esperado:** Precio Final calculado automáticamente con 4 decimales

### Caso 3: Verificación en BD
```sql
SELECT id_articulo, nomart, precon, prebsiva, precostosi
FROM artsucursal
ORDER BY id_articulo DESC
LIMIT 1;
```
**Resultado esperado:** Valores guardados con 4 decimales

---

## Impacto

- **Riesgo:** Bajo
- **Usuarios afectados:** Todos los que crean artículos nuevos
- **Funcionalidad restaurada:** Creación de artículos con precios calculados automáticamente

---

## Documentación Relacionada

- `src/REPORTE_PROBLEMA_DECIMALES_NEWARTICULO.md` - Análisis completo del problema

---

## Autor

Corrección realizada por Claude Code
Fecha: 2025-11-25
