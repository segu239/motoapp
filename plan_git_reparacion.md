# Plan de Reparación Git - Unificación de Branches

**Fecha:** 2025-11-03
**Objetivo:** Unificar todos los branches divergentes en `main` sin pérdida de funcionalidad
**Branches afectados:** 3 branches no mergeados

---

## 🔴 SITUACIÓN ACTUAL

### Estado del Repositorio

```
Ancestro común: 8c1f9e1 "Merge branch 'solucionselectseditcliente'"
                │
                ├─── main (HEAD actual del repo)
                │
                ├─── docs/v4.0-implementation (20 commits divergentes)
                │
                ├─── solucionpdftipospagos (20 commits divergentes)
                │
                └─── fix/descuento-stock-envios (12 commits divergentes)
```

### Branches No Mergeados

| Branch | Commits | Descripción Principal | Archivos Críticos |
|--------|---------|----------------------|-------------------|
| **docs/v4.0-implementation** | 20 | Sistema de modo consulta en carrito<br>Restricciones cliente 109<br>Documentación v4.0 | `carrito.component.ts`<br>`calculoproducto.component.ts`<br>`condicionventa.component.ts`<br>`puntoventa.component.ts` |
| **solucionpdftipospagos** | 20 | Sistema de cancelación MOV.STOCK<br>Fix subtotales temporales carrito<br>Mapeo Firebase sucursales | `carrito.component.ts`<br>`enviostockpendientes/*`<br>`stockpedido/*`<br>`Descarga.php.txt` |
| **fix/descuento-stock-envios** | 12 | Descuento automático stock<br>Cancelación pedidos/envíos<br>Pipe sucursales | `enviostockpendientes/*`<br>`stockpedido/*`<br>`Descarga.php.txt`<br>`cargardata.service.ts` |

---

## ⚠️ ANÁLISIS DE CONFLICTOS

### Archivos con ALTA probabilidad de conflicto

#### 1. **`src/app/components/carrito/carrito.component.ts`** 🔴 CRÍTICO

**Modificado en:**
- `docs/v4.0-implementation`: Modo consulta + simulación de precios
- `solucionpdftipospagos`: Fix cálculo subtotales temporales

**Funcionalidad en riesgo:**
- ✅ Sistema de simulación de ventas (variables `sumaTemporalSimulacion`, `subtotalesTemporalesSimulacion`)
- ✅ Modo consulta con selector de tipo de pago
- ✅ Cálculo correcto de subtotales

**Estado actual:** El branch actual NO tiene la funcionalidad de simulación

---

#### 2. **`src/Descarga.php.txt`** (Backend) 🔴 CRÍTICO

**Modificado en:**
- `docs/v4.0-implementation`: Reducción de endpoints (410 líneas eliminadas)
- `solucionpdftipospagos`: Sistema de cancelación de pedidos MOV.STOCK
- `fix/descuento-stock-envios`: Endpoint `CancelarPedidoStock_post()`

**Conflicto:** Las 3 versiones modifican diferentes endpoints

---

#### 3. **Componentes MOV.STOCK** 🟡 MEDIO

**Archivos:**
- `src/app/components/enviostockpendientes/*`
- `src/app/components/stockpedido/*`

**Modificado en:**
- `solucionpdftipospagos`: Botones de cancelación inicial
- `fix/descuento-stock-envios`: Implementación completa de cancelación

**Solución:** Priorizar `fix/descuento-stock-envios` (más reciente y completo)

---

#### 4. **Otros Archivos con Conflictos** 🟡

| Archivo | Branches | Tipo de Conflicto |
|---------|----------|-------------------|
| `calculoproducto.component.ts` | docs/v4.0, solucionpdftipospagos | Lógica de cálculo |
| `condicionventa.component.ts` | docs/v4.0, solucionpdftipospagos | Restricciones cliente 109 |
| `puntoventa.component.ts` | docs/v4.0, solucionpdftipospagos | Protección cliente 109 |
| `ini.ts` | solucionpdftipospagos, fix/descuento | URLs de endpoints |
| `cargardata.service.ts` | solucionpdftipospagos, fix/descuento | Métodos de servicio |

---

## 📋 PLAN DE ACCIÓN

### FASE 0: Preparación y Backup 🛡️

**Objetivo:** Asegurar que podemos revertir cambios en caso de error

```bash
# 1. Crear branch de backup del estado actual
git branch backup-main-pre-merge-$(date +%Y%m%d)

# 2. Verificar que estamos en main
git checkout main
git pull origin main

# 3. Crear backup de archivos críticos
mkdir -p .backups/pre-merge
cp src/app/components/carrito/carrito.component.ts .backups/pre-merge/
cp src/Descarga.php.txt .backups/pre-merge/
cp src/Carga.php.txt .backups/pre-merge/

# 4. Crear un tag del estado actual
git tag -a pre-unificacion-$(date +%Y%m%d) -m "Estado antes de unificación de branches"
```

**Resultado esperado:** ✅ Punto de restauración creado

---

### FASE 1: Merge de `docs/v4.0-implementation` 📚

**Objetivo:** Incorporar sistema de modo consulta y restricciones cliente 109

**Prioridad:** ALTA - Contiene funcionalidad de simulación de ventas

#### Paso 1.1: Análisis Previo

```bash
# Verificar diferencias
git diff main docs/v4.0-implementation -- src/app/components/carrito/carrito.component.ts > diff_carrito_docs.txt

# Revisar commits
git log main..docs/v4.0-implementation --oneline
```

#### Paso 1.2: Merge

```bash
# Cambiar a main
git checkout main

# Intentar merge
git merge docs/v4.0-implementation --no-commit --no-ff
```

**Conflictos esperados:**
- ❌ Ninguno (main no ha cambiado desde el ancestro común)

#### Paso 1.3: Verificación

```bash
# Verificar que la funcionalidad de simulación está presente
grep -n "sumaTemporalSimulacion" src/app/components/carrito/carrito.component.ts

# Compilar
npm run build

# Commit
git commit -m "feat: merge docs/v4.0-implementation - sistema modo consulta y restricciones cliente 109

- Implementar modo consulta con simulación de precios
- Agregar restricciones para cliente especial 109
- Incorporar documentación técnica v4.0
- Fix en calculoproducto para integración con modo consulta

Commits mergeados: 20
Branch: docs/v4.0-implementation"
```

**Resultado esperado:** ✅ Simulación de ventas restaurada

---

### FASE 2: Merge de `solucionpdftipospagos` 📄

**Objetivo:** Incorporar sistema de cancelación MOV.STOCK y fix de subtotales

**Prioridad:** ALTA - Funcionalidad crítica de movimiento de stock

#### Paso 2.1: Análisis Previo

```bash
# Verificar diferencias con main actualizado
git diff main solucionpdftipospagos -- src/app/components/carrito/carrito.component.ts > diff_carrito_solucionpdf.txt
git diff main solucionpdftipospagos -- src/Descarga.php.txt > diff_descarga_solucionpdf.txt
```

#### Paso 2.2: Merge con Estrategia

```bash
# Desde main (ya con docs/v4.0-implementation mergeado)
git merge solucionpdftipospagos --no-commit --no-ff
```

**Conflictos esperados:**

##### 🔴 CONFLICTO 1: `carrito.component.ts`

**Causa:**
- `docs/v4.0-implementation` agregó modo consulta
- `solucionpdftipospagos` tiene fix de subtotales temporales

**Solución:**
```bash
# Opción A: Aceptar cambios de docs/v4.0 (ya en main) y aplicar fix manualmente
git checkout --ours src/app/components/carrito/carrito.component.ts

# Luego aplicar el fix de subtotales de solucionpdftipospagos manualmente
# Buscar el commit específico del fix
git log solucionpdftipospagos --grep="subtotales" --oneline
# Commit: 72f17ae fix(carrito): corregir cálculo de subtotales temporales en modo consulta

# Aplicar solo ese cambio
git show 72f17ae -- src/app/components/carrito/carrito.component.ts | git apply -
```

##### 🟡 CONFLICTO 2: `Descarga.php.txt`

**Causa:**
- `docs/v4.0-implementation` eliminó endpoints antiguos
- `solucionpdftipospagos` agregó `CancelarPedidoStock_post()` inicial

**Solución:**
```bash
# Mantener versión de docs/v4.0 (main) y agregar endpoint de cancelación
git checkout --ours src/Descarga.php.txt

# Extraer solo el método CancelarPedidoStock_post() de solucionpdftipospagos
git show solucionpdftipospagos:src/Descarga.php.txt | \
  sed -n '/function CancelarPedidoStock_post/,/^[[:space:]]*}/p' > temp_cancel.php
```

##### 🟡 CONFLICTO 3: `calculoproducto.component.ts`

**Solución:**
```bash
# Mantener versión de docs/v4.0-implementation (más reciente)
git checkout --ours src/app/components/calculoproducto/calculoproducto.component.ts
```

##### 🟢 Archivos sin conflicto

- Componentes MOV.STOCK (`enviostockpendientes/*`, `stockpedido/*`) - se agregan directamente
- Documentación - se agrega directamente

#### Paso 2.3: Resolución Manual

```bash
# Después de resolver conflictos

# 1. Verificar que carrito tiene AMBAS funcionalidades
grep -n "sumaTemporalSimulacion" src/app/components/carrito/carrito.component.ts
grep -n "calcularSubtotalesTemporales" src/app/components/carrito/carrito.component.ts

# 2. Compilar y verificar
npm run build

# 3. Commit
git add .
git commit -m "feat: merge solucionpdftipospagos - sistema cancelación MOV.STOCK

- Implementar sistema de cancelación de pedidos de stock
- Agregar botones de cancelación en enviostockpendientes
- Agregar botones de cancelación en stockpedido
- Fix cálculo de subtotales temporales en carrito
- Incorporar documentación de análisis de sucursales

Conflictos resueltos:
- carrito.component.ts: mantener modo consulta + aplicar fix subtotales
- Descarga.php.txt: versión docs/v4.0 + endpoint cancelación
- calculoproducto.component.ts: versión docs/v4.0

Commits mergeados: 20
Branch: solucionpdftipospagos"
```

**Resultado esperado:** ✅ Cancelación MOV.STOCK + Simulación funcionando

---

### FASE 3: Merge de `fix/descuento-stock-envios` 🚚

**Objetivo:** Incorporar mejoras finales de MOV.STOCK

**Prioridad:** MEDIA - Mejoras sobre funcionalidad ya incorporada

#### Paso 3.1: Análisis Previo

```bash
# Ver qué está en fix/descuento que no esté ya en main
git log main..fix/descuento-stock-envios --oneline

# Verificar diferencias en archivos críticos
git diff main fix/descuento-stock-envios -- src/Descarga.php.txt
git diff main fix/descuento-stock-envios -- src/app/components/enviostockpendientes/
git diff main fix/descuento-stock-envios -- src/app/components/stockpedido/
```

#### Paso 3.2: Merge

```bash
git merge fix/descuento-stock-envios --no-commit --no-ff
```

**Conflictos esperados:**

##### 🟡 CONFLICTO 1: Componentes MOV.STOCK

**Causa:** `solucionpdftipospagos` ya agregó cancelación, `fix/descuento-stock-envios` la mejora

**Solución:**
```bash
# Mantener versión de fix/descuento-stock-envios (más completa)
git checkout --theirs src/app/components/enviostockpendientes/enviostockpendientes.component.ts
git checkout --theirs src/app/components/enviostockpendientes/enviostockpendientes.component.html
git checkout --theirs src/app/components/stockpedido/stockpedido.component.ts
git checkout --theirs src/app/components/stockpedido/stockpedido.component.html
```

##### 🟡 CONFLICTO 2: `Descarga.php.txt`

**Solución:**
```bash
# Comparar versiones del endpoint CancelarPedidoStock_post()
# Mantener la versión más completa (generalmente fix/descuento-stock-envios)
git checkout --theirs src/Descarga.php.txt
```

##### 🟡 CONFLICTO 3: `cargardata.service.ts`

**Solución:**
```bash
# Mantener versión de fix/descuento-stock-envios
git checkout --theirs src/app/services/cargardata.service.ts
```

##### 🟢 Archivos nuevos sin conflicto

- `src/app/pipes/sucursal-nombre.pipe.ts` - se agrega
- Documentación - se agrega

#### Paso 3.3: Commit

```bash
git add .
git commit -m "feat: merge fix/descuento-stock-envios - mejoras finales MOV.STOCK

- Mejorar implementación de cancelación de pedidos
- Agregar descuento automático de stock en envíos directos
- Crear pipe para mostrar nombres de sucursales
- Agregar mensajes de confirmación en solicitudes
- Incorporar documentación técnica de análisis

Conflictos resueltos:
- Componentes MOV.STOCK: versión fix/descuento (más completa)
- Descarga.php.txt: versión fix/descuento (endpoint mejorado)
- cargardata.service.ts: versión fix/descuento

Commits mergeados: 12
Branch: fix/descuento-stock-envios"
```

**Resultado esperado:** ✅ Todas las funcionalidades unificadas

---

### FASE 4: Limpieza y Verificación 🧹

#### Paso 4.1: Eliminar archivos backup no deseados

```bash
# Identificar archivos .backup que quedaron staged
git status | grep ".backup"

# Unstage y agregar a .gitignore (ya se hizo en los commits)
# Verificar que .gitignore tiene las reglas
cat .gitignore | grep backup
```

#### Paso 4.2: Verificación Integral

```bash
# 1. Compilar proyecto
npm run build

# 2. Verificar funcionalidades críticas

# a) Simulación en carrito
grep -n "sumaTemporalSimulacion" src/app/components/carrito/carrito.component.ts
# Debe retornar líneas con la variable

# b) Cancelación en MOV.STOCK
grep -n "cancelarPedido\|cancelarEnvio" src/app/components/stockpedido/stockpedido.component.ts
# Debe retornar los métodos

# c) Pipe de sucursales
test -f src/app/pipes/sucursal-nombre.pipe.ts && echo "✅ Pipe existe"

# d) Endpoint backend cancelación
grep -n "CancelarPedidoStock_post" src/Descarga.php.txt
# Debe retornar el método

# 3. Ejecutar tests (si existen)
npm test -- --watch=false
```

#### Paso 4.3: Pruebas Manuales

**Checklist de funcionalidades:**

- [ ] **Carrito - Simulación de ventas**
  - Abrir carrito
  - Agregar productos
  - Verificar que aparece "Simulación" con valores temporales
  - Cambiar tipo de pago
  - Verificar actualización de subtotales

- [ ] **MOV.STOCK - Cancelación de pedidos**
  - Ir a Stock Pedido
  - Seleccionar pedido en estado "Solicitado"
  - Click en botón "Cancelar"
  - Ingresar motivo
  - Verificar que se cancela correctamente

- [ ] **MOV.STOCK - Cancelación de envíos**
  - Ir a Envíos Stock Pendientes
  - Seleccionar envío en estado "Solicitado"
  - Click en botón "Cancelar"
  - Ingresar motivo
  - Verificar que se cancela correctamente

- [ ] **Cliente 109 - Restricciones**
  - Intentar editar cliente 109
  - Verificar que está bloqueado
  - Intentar crear CUENTA CORRIENTE para cliente 109
  - Verificar que está bloqueado

#### Paso 4.4: Commit de Limpieza (si es necesario)

```bash
# Solo si quedan ajustes menores
git add .
git commit -m "chore: limpieza post-merge y ajustes menores"
```

---

### FASE 5: Push y Cierre 🚀

#### Paso 5.1: Push a Remoto

```bash
# Push de main con todos los merges
git push origin main

# Push del tag
git push origin pre-unificacion-$(date +%Y%m%d)
```

#### Paso 5.2: Actualizar Branches Remotos (OPCIONAL)

```bash
# Si quieres eliminar branches ya mergeados del remoto
git push origin --delete solucionpdftipospagos
git push origin --delete fix/descuento-stock-envios
# NO eliminar docs/v4.0-implementation si sigue en uso para documentación

# Mantener branches locales por un tiempo como backup
# Eliminar locales solo después de confirmar que todo funciona
```

#### Paso 5.3: Documentar el Merge

Crear archivo `MERGE_UNIFICACION_$(date +%Y%m%d).md`:

```markdown
# Merge de Unificación de Branches

**Fecha:** 2025-11-03
**Branches unificados:** 3
**Commits totales mergeados:** 52

## Branches Mergeados

1. docs/v4.0-implementation (20 commits)
2. solucionpdftipospagos (20 commits)
3. fix/descuento-stock-envios (12 commits)

## Funcionalidades Incorporadas

- ✅ Sistema de modo consulta con simulación de precios
- ✅ Restricciones para cliente especial 109
- ✅ Sistema de cancelación de pedidos MOV.STOCK
- ✅ Descuento automático de stock en envíos
- ✅ Pipe de nombres de sucursales
- ✅ Fix cálculo de subtotales temporales

## Conflictos Resueltos

- carrito.component.ts: Combinación de modo consulta + fix subtotales
- Descarga.php.txt: Versión unificada con todos los endpoints
- Componentes MOV.STOCK: Versión más completa de fix/descuento-stock-envios

## Verificación

- [x] Compilación exitosa
- [x] Simulación de ventas funciona
- [x] Cancelación de pedidos funciona
- [x] Restricciones cliente 109 activas

## Rollback

Si es necesario revertir:
```bash
git reset --hard pre-unificacion-20251103
```
```

---

## 🛡️ PLAN DE ROLLBACK

### Si algo sale mal DURANTE el merge

```bash
# Abortar merge en curso
git merge --abort

# Volver a estado anterior
git reset --hard HEAD
```

### Si algo sale mal DESPUÉS del merge

```bash
# Opción 1: Revert del último merge
git revert -m 1 HEAD

# Opción 2: Reset hard al tag de backup
git reset --hard pre-unificacion-$(date +%Y%m%d)

# Opción 3: Restaurar desde backup branch
git reset --hard backup-main-pre-merge-$(date +%Y%m%d)
```

### Si algo sale mal DESPUÉS del push

```bash
# CUIDADO: Esto reescribe historia remota
git reset --hard pre-unificacion-$(date +%Y%m%d)
git push origin main --force-with-lease

# Opción más segura: Crear un nuevo commit que revierte
git revert -m 1 <hash-del-merge>
git push origin main
```

---

## ⏱️ TIEMPO ESTIMADO

| Fase | Tiempo Estimado | Complejidad |
|------|----------------|-------------|
| Fase 0: Preparación | 10 min | 🟢 Baja |
| Fase 1: Merge docs/v4.0 | 20 min | 🟢 Baja |
| Fase 2: Merge solucionpdf | 45 min | 🔴 Alta |
| Fase 3: Merge fix/descuento | 30 min | 🟡 Media |
| Fase 4: Limpieza | 30 min | 🟡 Media |
| Fase 5: Push | 10 min | 🟢 Baja |
| **TOTAL** | **~2.5 horas** | |

---

## ✅ CHECKLIST GENERAL

### Pre-merge
- [ ] Backup de main creado
- [ ] Tag de pre-unificación creado
- [ ] Archivos críticos respaldados
- [ ] Workspace limpio (git status)

### Durante merge
- [ ] Fase 1: docs/v4.0-implementation completada
- [ ] Compilación exitosa post Fase 1
- [ ] Fase 2: solucionpdftipospagos completada
- [ ] Conflictos carrito.component.ts resueltos
- [ ] Compilación exitosa post Fase 2
- [ ] Fase 3: fix/descuento-stock-envios completada
- [ ] Compilación exitosa post Fase 3

### Post-merge
- [ ] Todas las pruebas manuales pasadas
- [ ] Simulación de ventas funciona
- [ ] Cancelación de pedidos funciona
- [ ] No hay regresiones detectadas
- [ ] Push a origin/main exitoso
- [ ] Documentación del merge creada

---

## 📞 SOPORTE

Si encuentras problemas durante la ejecución:

1. **NO hacer push** si hay dudas
2. **Tomar screenshot** del error
3. **Ejecutar:** `git status > estado_error.txt`
4. **Ejecutar:** `git log --oneline -10 > log_error.txt`
5. **Consultar** antes de continuar

---

## 🎯 RESULTADO ESPERADO

Al finalizar, el branch `main` debe contener:

✅ **Funcionalidad completa de:**
- Sistema de modo consulta con simulación de precios
- Restricciones para cliente especial 109
- Sistema de cancelación de pedidos y envíos de stock
- Descuento automático de stock
- Pipe de nombres de sucursales
- Todas las correcciones de bugs incorporadas

✅ **Código compilable** sin errores
✅ **Todas las pruebas** pasando
✅ **Historial git limpio** con commits semánticos
✅ **Branches unificados** en main

---

**Creado por:** Claude Code
**Última actualización:** 2025-11-03
**Estado:** Pendiente de ejecución
