# Reporte: Problema de Decimales en Componente NewArticulo

**Fecha del Análisis:** 2025-11-25
**Componente Afectado:** `newarticulo.component.ts`
**Severidad:** Alta (Impide guardar artículos correctamente)

---

## 1. RESUMEN EJECUTIVO

El problema identificado es un **desajuste entre la validación HTML5 del navegador y la precisión decimal definida en la base de datos**. El campo `Precio Final` (precon) muestra un error de validación del navegador indicando que el valor ingresado no coincide con los valores válidos permitidos por el atributo `step="0.01"`.

### Evidencia del Error (según la captura)
```
Campo: Precio Final
Valor ingresado: 29489,2730
Error mostrado: "Ingresa un valor válido. Los dos valores válidos más aproximados son 29489.27 y 29489.28."
```

---

## 2. ANÁLISIS DE LA CAUSA RAÍZ

### 2.1 Estructura de la Base de Datos (PostgreSQL)

La tabla `artsucursal` define los siguientes tipos de datos para campos de precios:

| Campo | Tipo | Precisión | Escala | Observación |
|-------|------|-----------|--------|-------------|
| `precon` | numeric | 12 | **4** | Permite 4 decimales |
| `prefi1` | numeric | 12 | **4** | Permite 4 decimales |
| `prefi2` | numeric | 12 | **4** | Permite 4 decimales |
| `prefi3` | numeric | 12 | **4** | Permite 4 decimales |
| `prefi4` | numeric | 12 | **4** | Permite 4 decimales |
| `prebsiva` | numeric | 12 | **4** | Permite 4 decimales |
| `precostosi` | numeric | 12 | **4** | Permite 4 decimales |
| `descuento` | numeric | 12 | **4** | Permite 4 decimales |
| `margen` | numeric | 7 | **2** | Solo permite 2 decimales |

### 2.2 Problema en el HTML del Formulario

**Archivo:** `newarticulo.component.html` (líneas 249-251)

```html
<input type="number" step="0.01" class="form-control" formControlName="precon"
       placeholder="" (change)="calcularPreciosSinIva()">
<small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
```

**El atributo `step="0.01"` limita el input a 2 decimales**, pero:
1. La base de datos acepta **4 decimales** (`numeric(12,4)`)
2. El código TypeScript calcula y asigna valores con **4 decimales** usando `toFixed(4)`

### 2.3 Inconsistencia en el Código TypeScript

**Archivo:** `newarticulo.component.ts`

Los métodos de cálculo asignan valores con 4 decimales:

```typescript
// Línea 472
this.nuevoarticuloForm.get('prebsiva')?.setValue(precioBase.toFixed(4));

// Línea 544
this.nuevoarticuloForm.get('precon')?.setValue(precioFinal.toFixed(4));

// Línea 805
this.nuevoarticuloForm.get('prefi1')?.setValue(valorPrefi1.toFixed(4));
```

Pero el HTML tiene `step="0.01"` que solo permite incrementos de 2 decimales.

---

## 3. CADENA DE EVENTOS DEL ERROR

```
1. Usuario ingresa precio base s/IVA: 24371.3000
2. Con margen 90% e IVA 21%, el sistema calcula:
   → Precio Base sin IVA: 24371.3000
   → Precio Final: 29489.2730 (4 decimales)
3. El formulario asigna: precon = "29489.2730"
4. El navegador valida contra step="0.01":
   → 29489.2730 NO es múltiplo de 0.01
   → Error: "Los valores válidos más aproximados son 29489.27 y 29489.28"
5. El formulario queda inválido y no permite guardar
```

---

## 4. COMPARACIÓN CON editarticulo.component

### 4.1 Diferencias Clave

**editarticulo.component.html** (líneas 159-161):
```html
<input type="number" class="form-control" id="precostosi"
       formControlName="precostosi" required>
```

**Observación:** En `editarticulo`, los campos **NO tienen el atributo `step`**, lo que permite cualquier cantidad de decimales.

**editarticulo.component.ts** usa `{emitEvent: false}` al asignar valores:
```typescript
this.articuloForm.get('precon')?.setValue(precioFinal, {emitEvent: false});
```

Mientras que `newarticulo.component.ts` NO usa esta opción:
```typescript
this.nuevoarticuloForm.get('precon')?.setValue(precioFinal.toFixed(4));
```

---

## 5. FLUJO DE DATOS COMPLETO

### 5.1 Frontend → Backend → Base de Datos

```
┌──────────────────────────────────────────────────────────────────┐
│ FRONTEND (Angular)                                                │
│ newarticulo.component.ts                                         │
│   └─> Calcula precon con toFixed(4) → "29489.2730"               │
│   └─> HTML step="0.01" rechaza el valor                          │
│   └─> Formulario inválido ❌                                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓ (si pasara la validación)
┌──────────────────────────────────────────────────────────────────┐
│ SERVICIO (subirdata.service.ts)                                  │
│   └─> subirDatosArticulo(articulo: any)                          │
│   └─> POST a UrlSubirDatosArticulo                               │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ BACKEND (Descarga.php.txt - líneas 2449-2533)                    │
│ SubirDatosArticulo_post()                                        │
│   └─> $this->db->insert('artsucursal', [...])                    │
│   └─> Inserta precon directamente sin conversión                 │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ BASE DE DATOS (PostgreSQL)                                       │
│ Tabla: artsucursal                                               │
│   └─> precon numeric(12,4) ✓ Acepta 4 decimales                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. CAMPOS AFECTADOS EN newarticulo.component.html

| Campo | Línea | step actual | step requerido | Estado |
|-------|-------|-------------|----------------|--------|
| precostosi | 180 | 0.01 | 0.0001 | ❌ Incorrecto |
| descuento | 189 | 0.01 | 0.0001 | ❌ Incorrecto |
| prebsiva | 201 | 0.01 | 0.0001 | ❌ Incorrecto |
| margen | 210 | 0.01 | 0.01 | ✓ Correcto (BD solo tiene 2 decimales) |
| precon | 250 | 0.01 | 0.0001 | ❌ Incorrecto |

---

## 7. PLAN DE SOLUCIÓN

### Opción A: Ajustar step en HTML (RECOMENDADA)

**Cambios mínimos con máximo impacto.**

#### 7.1.1 Modificar newarticulo.component.html

**Cambiar:**
```html
<!-- Precio Costo sin IVA (línea 180) -->
<input type="number" step="0.01" class="form-control" formControlName="precostosi" ...>
```
**Por:**
```html
<input type="number" step="0.0001" class="form-control" formControlName="precostosi" ...>
```

**Cambiar:**
```html
<!-- Descuento (línea 189) -->
<input type="number" step="0.01" class="form-control" formControlName="descuento" ...>
```
**Por:**
```html
<input type="number" step="0.0001" class="form-control" formControlName="descuento" ...>
```

**Cambiar:**
```html
<!-- Precio Base s/IVA (línea 201) -->
<input type="number" step="0.01" class="form-control" formControlName="prebsiva" ...>
```
**Por:**
```html
<input type="number" step="0.0001" class="form-control" formControlName="prebsiva" ...>
```

**Cambiar:**
```html
<!-- Precio Final (línea 250) -->
<input type="number" step="0.01" class="form-control" formControlName="precon" ...>
```
**Por:**
```html
<input type="number" step="0.0001" class="form-control" formControlName="precon" ...>
```

#### 7.1.2 Actualizar mensajes de ayuda

**Cambiar:**
```html
<small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
```
**Por:**
```html
<small class="form-control-feedback">Valor numérico con hasta 4 decimales</small>
```

#### 7.1.3 Nota sobre el campo margen

El campo `margen` **DEBE mantener `step="0.01"`** porque la base de datos solo permite 2 decimales (`numeric(7,2)`).

---

### Opción B: Usar step="any" (Alternativa)

Si se desea máxima flexibilidad:

```html
<input type="number" step="any" class="form-control" formControlName="precon" ...>
```

**Pros:**
- Acepta cualquier valor decimal
- No requiere sincronizar con la BD

**Contras:**
- Menos validación del lado del cliente
- Puede permitir más decimales de los soportados

---

### Opción C: Redondear valores calculados a 2 decimales

Modificar el TypeScript para usar `toFixed(2)` en lugar de `toFixed(4)`.

**NO RECOMENDADA** porque:
1. Se pierde precisión en cálculos intermedios
2. Los precios de lista calculados serían menos precisos
3. No aprovecha la capacidad de la base de datos

---

## 8. ARCHIVOS A MODIFICAR

| Archivo | Cambios |
|---------|---------|
| `src/app/components/newarticulo/newarticulo.component.html` | Cambiar `step="0.01"` a `step="0.0001"` en 4 campos |

**Ningún cambio requerido en:**
- newarticulo.component.ts (los cálculos con toFixed(4) son correctos)
- Descarga.php.txt (el backend ya acepta los valores)
- subirdata.service.ts (no procesa los datos, solo los envía)
- Base de datos (ya soporta 4 decimales)

---

## 9. VERIFICACIÓN POST-IMPLEMENTACIÓN

### 9.1 Casos de Prueba

1. **Caso básico:**
   - Ingresar precio final: 29489.2730
   - Resultado esperado: Formulario válido, guardado exitoso

2. **Caso con cálculos:**
   - Ingresar precio costo: 24371.3000
   - Margen: 90%
   - IVA: 21%
   - Resultado esperado: Precio final calculado y aceptado

3. **Caso límite:**
   - Ingresar precio con 4 decimales: 12345.6789
   - Resultado esperado: Aceptado sin error de validación

### 9.2 Validación en Base de Datos

```sql
-- Verificar que los datos se guardan correctamente
SELECT id_articulo, nomart, precon, prebsiva, precostosi
FROM artsucursal
ORDER BY id_articulo DESC
LIMIT 5;
```

---

## 10. RESUMEN DE CAMBIOS

```diff
--- a/src/app/components/newarticulo/newarticulo.component.html
+++ b/src/app/components/newarticulo/newarticulo.component.html
@@ -178,14 +178,14 @@
                                         <label class="control-label text-right col-md-3">Precio Costo sin IVA</label>
                                         <div class="col-md-9">
-                                            <input type="number" step="0.01" class="form-control" formControlName="precostosi" placeholder="" (change)="calcularDesdePrecoSinIva()">
-                                            <small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
+                                            <input type="number" step="0.0001" class="form-control" formControlName="precostosi" placeholder="" (change)="calcularDesdePrecoSinIva()">
+                                            <small class="form-control-feedback">Valor numérico con hasta 4 decimales</small>
                                         </div>
@@ -187,8 +187,8 @@
                                         <label class="control-label text-right col-md-3">Descuento (%)</label>
                                         <div class="col-md-9">
-                                            <input type="number" step="0.01" class="form-control" formControlName="descuento" placeholder="" (change)="calcularPrecioBase()">
+                                            <input type="number" step="0.0001" class="form-control" formControlName="descuento" placeholder="" (change)="calcularPrecioBase()">
                                             <small class="form-control-feedback">Porcentaje de descuento</small>
@@ -199,8 +199,8 @@
                                         <label class="control-label text-right col-md-3">Precio Base s/IVA</label>
                                         <div class="col-md-9">
-                                            <input type="number" step="0.01" class="form-control" formControlName="prebsiva" placeholder="" (change)="calcularMargen()">
-                                            <small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
+                                            <input type="number" step="0.0001" class="form-control" formControlName="prebsiva" placeholder="" (change)="calcularMargen()">
+                                            <small class="form-control-feedback">Valor numérico con hasta 4 decimales</small>
@@ -248,8 +248,8 @@
                                         <label class="control-label text-right col-md-3">Precio Final *</label>
                                         <div class="col-md-9">
-                                            <input type="number" step="0.01" class="form-control" formControlName="precon" placeholder="" (change)="calcularPreciosSinIva()">
-                                            <small class="form-control-feedback">Valor numérico con hasta 2 decimales</small>
+                                            <input type="number" step="0.0001" class="form-control" formControlName="precon" placeholder="" (change)="calcularPreciosSinIva()">
+                                            <small class="form-control-feedback">Valor numérico con hasta 4 decimales</small>
```

---

## 11. CONCLUSIÓN

El problema es **puramente de validación HTML5** causado por un desajuste entre:
- El atributo `step="0.01"` en el HTML (2 decimales)
- Los cálculos en TypeScript con `toFixed(4)` (4 decimales)
- La base de datos `numeric(12,4)` (4 decimales)

**La solución es simple y segura:** cambiar `step="0.01"` a `step="0.0001"` en los campos de precios, manteniendo `step="0.01"` solo para el campo `margen` que tiene restricción de 2 decimales en la base de datos.

**Tiempo estimado de implementación:** 5-10 minutos
**Riesgo:** Bajo (cambio solo en validación del cliente, sin afectar lógica de negocio)
