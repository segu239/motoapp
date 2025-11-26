# Plan de Commits - Implementación de Totalizadores en Movimientos de Stock

**Fecha:** 2025-11-13
**Feature:** Totalizadores en componentes de movimiento de stock v2.2
**Estado actual:** Archivos modificados sin commitear
**Branch actual:** `main`

---

## 📋 RESUMEN EJECUTIVO

Este plan organiza **18 archivos modificados/nuevos** en **7 commits lógicos** siguiendo la estructura de fases de implementación documentada en `implementacion_totalizadores_movstock2_ESTADOACTUAL.md`.

### Archivos a Commitear

**Total:** 18 archivos (excluyendo `agregado_preciocosto_movstock.md`)

- **Modificados (M):** 11 archivos
- **Nuevos (??):** 7 archivos de documentación + 1 servicio

---

## 🌿 ESTRATEGIA DE BRANCHES

### Opción Recomendada: Feature Branch

**Justificación:**
- Feature grande y completa (totalizadores)
- Múltiples commits relacionados
- Permite revisión antes de merge a `main`
- Mantiene historial limpio

**Branch a crear:**
```
feature/totalizadores-movstock-v2.2
```

### Flujo de Trabajo Propuesto

```
main
  │
  └─→ feature/totalizadores-movstock-v2.2
        │
        ├─ Commit 1: Base - Interfaz y Servicio
        ├─ Commit 2: Componente Piloto - StockPedido
        ├─ Commit 3: Componente StockRecibo
        ├─ Commit 4: Componente EnvioStockPendientes
        ├─ Commit 5: Componente EnvioStockRealizados
        ├─ Commit 6: Fix campos JOIN en otros componentes
        └─ Commit 7: Documentación completa
        │
        └─→ merge a main (después de validación)
```

---

## 📦 COMMITS DETALLADOS

### **Commit 1: feat(stock): agregar interfaz PedidoItem y servicio TotalizadoresService**

**Tipo:** `feat` (nueva funcionalidad)
**Scope:** `stock`
**Fase:** Fase 0.1 + Fase 1

#### Descripción del Commit

```
feat(stock): agregar interfaz PedidoItem y servicio TotalizadoresService

Implementa la base para el sistema de totalizadores en componentes
de movimiento de stock:

- Actualiza interfaz PedidoItem con campos sucursald, sucursalh y costo_total
- Agrega documentación inline explicando origen de cada campo
- Crea TotalizadoresService con métodos para:
  * Cálculo de costo individual (cantidad × precio)
  * Cálculo de totales generales
  * Soporte para selección única (radio buttons)
  * Soporte para selección múltiple (checkboxes)
  * Precisión decimal a 2 lugares con Math.round
- Incluye validaciones de tipos y manejo de errores
- Documentación JSDoc completa

Relacionado con: Fase 0.1 y Fase 1 de implementacion_totalizadores_movstock2.md
```

#### Archivos Incluidos

```
src/app/interfaces/pedidoItem.ts
src/app/services/totalizadores.service.ts
```

**Total de archivos:** 2

---

### **Commit 2: feat(stock): implementar totalizadores en StockPedidoComponent (piloto)**

**Tipo:** `feat` (nueva funcionalidad)
**Scope:** `stock`
**Fase:** Fase 2 + Fase 3

#### Descripción del Commit

```
feat(stock): implementar totalizadores en StockPedidoComponent (piloto)

Implementa totalizadores en el componente piloto StockPedido con
cálculo dinámico y fix de conversión PostgreSQL NUMERIC:

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades totalGeneralCosto y mostrarTotalizadores
- Agrega columna 'costo_total' a configuración de tabla
- Implementa calcularCostosTotales() con:
  * Conversión string→number para PostgreSQL NUMERIC
  * Validación de NaN con logs de advertencia
  * Soporte para separadores decimales (comas y puntos)
- Implementa actualizarTotalGeneral() para recalcular totales
- Agrega onFilter() para recalcular en filtros de tabla
- Agrega getter costoItemSeleccionado para selección única
- Integra cálculos en cargarPedidos()

HTML:
- Agrega listener (onFilter) en p-table
- Actualiza template de columnas con formato de moneda para costo_total
- Preserva pipe sucursalNombre existente
- Implementa panel de totalizadores con:
  * Total General (todos los items filtrados)
  * Item Seleccionado (selección única con radio)
  * Información adicional sobre cálculos
  * Badge "Dinámico" indicando actualización automática
- Usa formato currency ARS con 2 decimales

Fix crítico: Convierte strings a números antes de calcular para manejar
campos NUMERIC de PostgreSQL que retornan como string.

Relacionado con: Fase 2-3 (Componente Piloto) de implementacion_totalizadores_movstock2.md
```

#### Archivos Incluidos

```
src/app/components/stockpedido/stockpedido.component.ts
src/app/components/stockpedido/stockpedido.component.html
```

**Total de archivos:** 2

---

### **Commit 3: feat(stock): implementar totalizadores en StockReciboComponent**

**Tipo:** `feat` (nueva funcionalidad)
**Scope:** `stock`
**Fase:** Fase 0.2 + Fase 4B

#### Descripción del Commit

```
feat(stock): implementar totalizadores en StockReciboComponent

Implementa totalizadores en StockRecibo siguiendo patrón del componente
piloto, con corrección de inconsistencia TS/HTML:

Fix de inconsistencia (Fase 0.2):
- Corrige selectedPedidoItem de any[] a any|null para consistencia
  con selectionMode="single" en HTML
- Ajusta calcularTotalSaldosSeleccionados() para selección única

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades de totalizadores
- Agrega columna 'costo_total' a configuración
- Implementa calcularCostosTotales() con conversión string→number
- Implementa actualizarTotalGeneral()
- Agrega onFilter() para recalcular
- Agrega getter costoItemSeleccionado

HTML:
- Agrega listener (onFilter) en p-table
- Actualiza template de columnas con formato de moneda
- Implementa panel de totalizadores completo
- Nota: Este componente NO tiene columna sucursald, solo sucursalh

Relacionado con: Fase 0.2 y Fase 4B de implementacion_totalizadores_movstock2.md
```

#### Archivos Incluidos

```
src/app/components/stockrecibo/stockrecibo.component.ts
src/app/components/stockrecibo/stockrecibo.component.html
```

**Total de archivos:** 2

---

### **Commit 4: feat(stock): implementar totalizadores en EnvioStockPendientesComponent**

**Tipo:** `feat` (nueva funcionalidad)
**Scope:** `stock`
**Fase:** Fase 4A

#### Descripción del Commit

```
feat(stock): implementar totalizadores en EnvioStockPendientesComponent

Replica implementación de totalizadores en EnvioStockPendientes
con selección única (radio buttons):

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades de totalizadores
- Agrega columna 'costo_total' a configuración
- Implementa calcularCostosTotales() con:
  * Conversión string→number para fix PostgreSQL NUMERIC
  * Validación de NaN
  * Manejo de errores por item
- Implementa actualizarTotalGeneral()
- Agrega onFilter() para recalcular en filtros
- Agrega getter costoItemSeleccionado para selección única

HTML:
- Agrega listener (onFilter) en p-table
- Actualiza template de columnas con costo_total
- Formato de moneda ARS con 2 decimales
- Preserva pipe sucursalNombre existente
- Implementa panel de totalizadores con:
  * Total General de items filtrados
  * Item Seleccionado con radio button
  * Información de cálculos

Relacionado con: Fase 4A de implementacion_totalizadores_movstock2.md
```

#### Archivos Incluidos

```
src/app/components/enviostockpendientes/enviostockpendientes.component.ts
src/app/components/enviostockpendientes/enviostockpendientes.component.html
```

**Total de archivos:** 2

---

### **Commit 5: feat(stock): implementar totalizadores en EnvioStockRealizadosComponent con selección múltiple**

**Tipo:** `feat` (nueva funcionalidad)
**Scope:** `stock`
**Fase:** Fase 4C

#### Descripción del Commit

```
feat(stock): implementar totalizadores en EnvioStockRealizadosComponent con selección múltiple

Implementa totalizadores en EnvioStockRealizados con soporte para
selección múltiple (checkboxes), diferenciándose de otros componentes:

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades de totalizadores
- Agrega columna 'costo_total' a configuración
- Implementa calcularCostosTotales() con conversión string→number
- Implementa actualizarTotalGeneral()
- Agrega onFilter() para recalcular
- DIFERENCIA: Getters para selección MÚLTIPLE:
  * costoTotalSeleccionados: Suma de items seleccionados
  * cantidadItemsSeleccionados: Cantidad marcada
  * costoPromedioSeleccionados: Promedio de costos

HTML:
- Agrega listeners (onFilter) y (selectionChange)
- Actualiza template de columnas con costo_total
- Panel de totalizadores específico para selección múltiple:
  * Total General (todos los items)
  * Items Seleccionados (plural) con:
    - Cantidad de items marcados
    - Costo total de la selección
    - Costo promedio
- Usa checkboxes (selectionMode="multiple")

Relacionado con: Fase 4C de implementacion_totalizadores_movstock2.md
```

#### Archivos Incluidos

```
src/app/components/enviodestockrealizados/enviodestockrealizados.component.ts
src/app/components/enviodestockrealizados/enviodestockrealizados.component.html
```

**Total de archivos:** 2

---

### **Commit 6: fix(stock): agregar campos sucursald y sucursalh en componentes de productos**

**Tipo:** `fix` (corrección)
**Scope:** `stock`
**Relación:** Complementario a Fase 0.1

#### Descripción del Commit

```
fix(stock): agregar campos sucursald y sucursalh en componentes de productos

Agrega campos sucursald y sucursalh al objeto pedidoItem en
componentes de productos para consistencia con interfaz PedidoItem
actualizada:

Cambios en StockProductoEnvioComponent:
- Agrega sucursald: Number(this.sucursal) al pedidoItem
- Agrega sucursalh: this.selectedSucursal al pedidoItem

Cambios en StockProductoPedidoComponent:
- Agrega sucursald: Number(this.sucursal) al pedidoItem
- Agrega sucursalh: this.selectedSucursal al pedidoItem

Estos campos ahora son requeridos por la interfaz PedidoItem
actualizada en la Fase 0.1 que agregó sucursald y sucursalh
provenientes del JOIN con pedidoscb.

Relacionado con: Fase 0.1 (interfaz PedidoItem) de implementacion_totalizadores_movstock2.md
```

#### Archivos Incluidos

```
src/app/components/stockproductoenvio/stockproductoenvio.component.ts
src/app/components/stockproductopedido/stockproductopedido.component.ts
```

**Total de archivos:** 2

---

### **Commit 7: docs(stock): agregar documentación completa de implementación de totalizadores v2.2**

**Tipo:** `docs` (documentación)
**Scope:** `stock`
**Fase:** Documentación completa

#### Descripción del Commit

```
docs(stock): agregar documentación completa de implementación de totalizadores v2.2

Agrega documentación exhaustiva de la implementación de totalizadores
en componentes de movimiento de stock, versión 2.2 con fix PostgreSQL:

Documentos principales:
- implementacion_totalizadores_movstock2.md:
  Plan completo de implementación v2.2 (VALIDADO)

- implementacion_totalizadores_movstock2_ESTADOACTUAL.md:
  Estado actual de implementación con métricas, changelog y
  sección crítica del fix PostgreSQL NUMERIC

Documentos de testing:
- prueba_stockpedido_manual.md: Tests manuales de StockPedido
- prueba_stockrecibo_manual.md: Tests manuales de StockRecibo

Informes de errores y validación:
- INFORME_ERROR_TOTALIZADOR_STOCKPEDIDO.md:
  Análisis del error de $0,00 que llevó al descubrimiento del
  bug PostgreSQL NUMERIC→String

- INFORME_VALIDACION_TOTALIZADORES.md:
  Validación de cálculos y funcionamiento

Documento histórico:
- implementacion_totalizadores_movstock.md:
  Primera versión del plan (v1.0, pre-fix PostgreSQL)

Características documentadas:
- 7 fases de implementación completadas
- Fix crítico PostgreSQL NUMERIC aplicado a 4 componentes
- Soporte para selección única y múltiple
- Manejo de errores y validaciones
- Timeline de 19 horas de implementación
- Criterios de aceptación y testing

Estado: Implementación 100% completada con fix crítico aplicado.
Pendiente: Testing manual en navegador.

Relacionado con: Todas las fases de implementacion_totalizadores_movstock2.md
```

#### Archivos Incluidos

```
INFORME_ERROR_TOTALIZADOR_STOCKPEDIDO.md
INFORME_VALIDACION_TOTALIZADORES.md
implementacion_totalizadores_movstock.md
implementacion_totalizadores_movstock2.md
implementacion_totalizadores_movstock2_ESTADOACTUAL.md
prueba_stockpedido_manual.md
prueba_stockrecibo_manual.md
```

**Total de archivos:** 7

---

## 📊 RESUMEN DE COMMITS

| # | Tipo | Archivos | Descripción Corta | Fase |
|---|------|----------|-------------------|------|
| 1 | feat | 2 | Base: Interfaz y Servicio | 0.1 + 1 |
| 2 | feat | 2 | Componente Piloto StockPedido | 2-3 |
| 3 | feat | 2 | Componente StockRecibo | 0.2 + 4B |
| 4 | feat | 2 | Componente EnvioStockPendientes | 4A |
| 5 | feat | 2 | Componente EnvioStockRealizados | 4C |
| 6 | fix | 2 | Fix campos JOIN en componentes productos | 0.1 |
| 7 | docs | 7 | Documentación completa | Todas |
| **TOTAL** | | **19** | | |

**Nota:** El archivo `agregado_preciocosto_movstock.md` NO se incluye (se commiteará después de la próxima implementación).

---

## 🚀 PLAN DE EJECUCIÓN

### Opción A: Con Feature Branch (RECOMENDADO)

```bash
# 1. Crear y cambiar a feature branch desde main
git checkout -b feature/totalizadores-movstock-v2.2

# 2. Commit 1: Base - Interfaz y Servicio
git add src/app/interfaces/pedidoItem.ts
git add src/app/services/totalizadores.service.ts
git commit -F- <<'EOF'
feat(stock): agregar interfaz PedidoItem y servicio TotalizadoresService

Implementa la base para el sistema de totalizadores en componentes
de movimiento de stock:

- Actualiza interfaz PedidoItem con campos sucursald, sucursalh y costo_total
- Agrega documentación inline explicando origen de cada campo
- Crea TotalizadoresService con métodos para:
  * Cálculo de costo individual (cantidad × precio)
  * Cálculo de totales generales
  * Soporte para selección única (radio buttons)
  * Soporte para selección múltiple (checkboxes)
  * Precisión decimal a 2 lugares con Math.round
- Incluye validaciones de tipos y manejo de errores
- Documentación JSDoc completa

Relacionado con: Fase 0.1 y Fase 1 de implementacion_totalizadores_movstock2.md
EOF

# 3. Commit 2: Componente Piloto - StockPedido
git add src/app/components/stockpedido/stockpedido.component.ts
git add src/app/components/stockpedido/stockpedido.component.html
git commit -F- <<'EOF'
feat(stock): implementar totalizadores en StockPedidoComponent (piloto)

Implementa totalizadores en el componente piloto StockPedido con
cálculo dinámico y fix de conversión PostgreSQL NUMERIC:

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades totalGeneralCosto y mostrarTotalizadores
- Agrega columna 'costo_total' a configuración de tabla
- Implementa calcularCostosTotales() con:
  * Conversión string→number para PostgreSQL NUMERIC
  * Validación de NaN con logs de advertencia
  * Soporte para separadores decimales (comas y puntos)
- Implementa actualizarTotalGeneral() para recalcular totales
- Agrega onFilter() para recalcular en filtros de tabla
- Agrega getter costoItemSeleccionado para selección única
- Integra cálculos en cargarPedidos()

HTML:
- Agrega listener (onFilter) en p-table
- Actualiza template de columnas con formato de moneda para costo_total
- Preserva pipe sucursalNombre existente
- Implementa panel de totalizadores con:
  * Total General (todos los items filtrados)
  * Item Seleccionado (selección única con radio)
  * Información adicional sobre cálculos
  * Badge "Dinámico" indicando actualización automática
- Usa formato currency ARS con 2 decimales

Fix crítico: Convierte strings a números antes de calcular para manejar
campos NUMERIC de PostgreSQL que retornan como string.

Relacionado con: Fase 2-3 (Componente Piloto) de implementacion_totalizadores_movstock2.md
EOF

# 4. Commit 3: Componente StockRecibo
git add src/app/components/stockrecibo/stockrecibo.component.ts
git add src/app/components/stockrecibo/stockrecibo.component.html
git commit -F- <<'EOF'
feat(stock): implementar totalizadores en StockReciboComponent

Implementa totalizadores en StockRecibo siguiendo patrón del componente
piloto, con corrección de inconsistencia TS/HTML:

Fix de inconsistencia (Fase 0.2):
- Corrige selectedPedidoItem de any[] a any|null para consistencia
  con selectionMode="single" en HTML
- Ajusta calcularTotalSaldosSeleccionados() para selección única

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades de totalizadores
- Agrega columna 'costo_total' a configuración
- Implementa calcularCostosTotales() con conversión string→number
- Implementa actualizarTotalGeneral()
- Agrega onFilter() para recalcular
- Agrega getter costoItemSeleccionado

HTML:
- Agrega listener (onFilter) en p-table
- Actualiza template de columnas con formato de moneda
- Implementa panel de totalizadores completo
- Nota: Este componente NO tiene columna sucursald, solo sucursalh

Relacionado con: Fase 0.2 y Fase 4B de implementacion_totalizadores_movstock2.md
EOF

# 5. Commit 4: Componente EnvioStockPendientes
git add src/app/components/enviostockpendientes/enviostockpendientes.component.ts
git add src/app/components/enviostockpendientes/enviostockpendientes.component.html
git commit -F- <<'EOF'
feat(stock): implementar totalizadores en EnvioStockPendientesComponent

Replica implementación de totalizadores en EnvioStockPendientes
con selección única (radio buttons):

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades de totalizadores
- Agrega columna 'costo_total' a configuración
- Implementa calcularCostosTotales() con:
  * Conversión string→number para fix PostgreSQL NUMERIC
  * Validación de NaN
  * Manejo de errores por item
- Implementa actualizarTotalGeneral()
- Agrega onFilter() para recalcular en filtros
- Agrega getter costoItemSeleccionado para selección única

HTML:
- Agrega listener (onFilter) en p-table
- Actualiza template de columnas con costo_total
- Formato de moneda ARS con 2 decimales
- Preserva pipe sucursalNombre existente
- Implementa panel de totalizadores con:
  * Total General de items filtrados
  * Item Seleccionado con radio button
  * Información de cálculos

Relacionado con: Fase 4A de implementacion_totalizadores_movstock2.md
EOF

# 6. Commit 5: Componente EnvioStockRealizados (selección múltiple)
git add src/app/components/enviodestockrealizados/enviodestockrealizados.component.ts
git add src/app/components/enviodestockrealizados/enviodestockrealizados.component.html
git commit -F- <<'EOF'
feat(stock): implementar totalizadores en EnvioStockRealizadosComponent con selección múltiple

Implementa totalizadores en EnvioStockRealizados con soporte para
selección múltiple (checkboxes), diferenciándose de otros componentes:

TypeScript:
- Inyecta TotalizadoresService
- Agrega propiedades de totalizadores
- Agrega columna 'costo_total' a configuración
- Implementa calcularCostosTotales() con conversión string→number
- Implementa actualizarTotalGeneral()
- Agrega onFilter() para recalcular
- DIFERENCIA: Getters para selección MÚLTIPLE:
  * costoTotalSeleccionados: Suma de items seleccionados
  * cantidadItemsSeleccionados: Cantidad marcada
  * costoPromedioSeleccionados: Promedio de costos

HTML:
- Agrega listeners (onFilter) y (selectionChange)
- Actualiza template de columnas con costo_total
- Panel de totalizadores específico para selección múltiple:
  * Total General (todos los items)
  * Items Seleccionados (plural) con:
    - Cantidad de items marcados
    - Costo total de la selección
    - Costo promedio
- Usa checkboxes (selectionMode="multiple")

Relacionado con: Fase 4C de implementacion_totalizadores_movstock2.md
EOF

# 7. Commit 6: Fix campos JOIN en componentes de productos
git add src/app/components/stockproductoenvio/stockproductoenvio.component.ts
git add src/app/components/stockproductopedido/stockproductopedido.component.ts
git commit -F- <<'EOF'
fix(stock): agregar campos sucursald y sucursalh en componentes de productos

Agrega campos sucursald y sucursalh al objeto pedidoItem en
componentes de productos para consistencia con interfaz PedidoItem
actualizada:

Cambios en StockProductoEnvioComponent:
- Agrega sucursald: Number(this.sucursal) al pedidoItem
- Agrega sucursalh: this.selectedSucursal al pedidoItem

Cambios en StockProductoPedidoComponent:
- Agrega sucursald: Number(this.sucursal) al pedidoItem
- Agrega sucursalh: this.selectedSucursal al pedidoItem

Estos campos ahora son requeridos por la interfaz PedidoItem
actualizada en la Fase 0.1 que agregó sucursald y sucursalh
provenientes del JOIN con pedidoscb.

Relacionado con: Fase 0.1 (interfaz PedidoItem) de implementacion_totalizadores_movstock2.md
EOF

# 8. Commit 7: Documentación completa
git add INFORME_ERROR_TOTALIZADOR_STOCKPEDIDO.md
git add INFORME_VALIDACION_TOTALIZADORES.md
git add implementacion_totalizadores_movstock.md
git add implementacion_totalizadores_movstock2.md
git add implementacion_totalizadores_movstock2_ESTADOACTUAL.md
git add prueba_stockpedido_manual.md
git add prueba_stockrecibo_manual.md
git commit -F- <<'EOF'
docs(stock): agregar documentación completa de implementación de totalizadores v2.2

Agrega documentación exhaustiva de la implementación de totalizadores
en componentes de movimiento de stock, versión 2.2 con fix PostgreSQL:

Documentos principales:
- implementacion_totalizadores_movstock2.md:
  Plan completo de implementación v2.2 (VALIDADO)

- implementacion_totalizadores_movstock2_ESTADOACTUAL.md:
  Estado actual de implementación con métricas, changelog y
  sección crítica del fix PostgreSQL NUMERIC

Documentos de testing:
- prueba_stockpedido_manual.md: Tests manuales de StockPedido
- prueba_stockrecibo_manual.md: Tests manuales de StockRecibo

Informes de errores y validación:
- INFORME_ERROR_TOTALIZADOR_STOCKPEDIDO.md:
  Análisis del error de $0,00 que llevó al descubrimiento del
  bug PostgreSQL NUMERIC→String

- INFORME_VALIDACION_TOTALIZADORES.md:
  Validación de cálculos y funcionamiento

Documento histórico:
- implementacion_totalizadores_movstock.md:
  Primera versión del plan (v1.0, pre-fix PostgreSQL)

Características documentadas:
- 7 fases de implementación completadas
- Fix crítico PostgreSQL NUMERIC aplicado a 4 componentes
- Soporte para selección única y múltiple
- Manejo de errores y validaciones
- Timeline de 19 horas de implementación
- Criterios de aceptación y testing

Estado: Implementación 100% completada con fix crítico aplicado.
Pendiente: Testing manual en navegador.

Relacionado con: Todas las fases de implementacion_totalizadores_movstock2.md
EOF

# 9. Verificar estado
git log --oneline -7

# 10. Push del feature branch
git push -u origin feature/totalizadores-movstock-v2.2

# 11. (Opcional) Crear Pull Request en GitHub
# Usar interfaz web de GitHub o gh CLI:
# gh pr create --title "feat(stock): implementar totalizadores en movimientos de stock v2.2" \
#              --body "Implementación completa de totalizadores..."

# 12. Después de aprobación: Merge a main
git checkout main
git merge feature/totalizadores-movstock-v2.2
git push origin main

# 13. (Opcional) Eliminar branch después de merge
git branch -d feature/totalizadores-movstock-v2.2
git push origin --delete feature/totalizadores-movstock-v2.2
```

---

### Opción B: Commits Directos en Main (NO RECOMENDADO)

```bash
# Ejecutar commits 1-7 directamente sin crear branch
# (Seguir comandos git add y git commit de la Opción A, omitiendo git checkout)

git push origin main
```

**⚠️ No recomendado porque:**
- No permite revisión previa
- Dificulta rollback si hay problemas
- No mantiene historial organizado para features grandes

---

## 🎯 VALIDACIÓN POST-COMMITS

### Checklist Después de Cada Commit

- [ ] Ejecutar `git status` para verificar staging correcto
- [ ] Ejecutar `git log --oneline -1` para verificar mensaje
- [ ] Ejecutar `git show --stat` para verificar archivos incluidos

### Checklist Final (Después de Todos los Commits)

- [ ] Ejecutar `git log --oneline -7` para ver todos los commits
- [ ] Ejecutar `ng build` para verificar compilación sin errores
- [ ] Ejecutar `git diff main` (si estás en branch) para ver diferencias totales
- [ ] Revisar que `agregado_preciocosto_movstock.md` NO esté commiteado
- [ ] Push del branch/commits a origin

---

## 📈 TIMELINE ESTIMADO

| Actividad | Tiempo Estimado |
|-----------|----------------|
| Crear branch | 1 min |
| Commit 1 | 2 min |
| Commit 2 | 2 min |
| Commit 3 | 2 min |
| Commit 4 | 2 min |
| Commit 5 | 2 min |
| Commit 6 | 2 min |
| Commit 7 | 2 min |
| Validación final | 5 min |
| Push a origin | 2 min |
| **TOTAL** | **~20 min** |

---

## 🔧 COMANDOS ÚTILES

### Ver Diff de Archivos Staged

```bash
git diff --cached
git diff --cached --stat
```

### Deshacer Último Commit (Si Hay Error)

```bash
# Mantiene cambios en working directory
git reset --soft HEAD~1

# Deshace cambios completamente (PELIGROSO)
git reset --hard HEAD~1
```

### Ver Historial de Commits con Archivos

```bash
git log --stat -7
git log --name-status -7
```

### Verificar Branch Actual

```bash
git branch --show-current
git status
```

---

## 📝 NOTAS IMPORTANTES

### Convenciones de Mensajes de Commit

Este plan sigue **Conventional Commits**:

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Solo documentación
- `refactor`: Refactorización sin cambio de funcionalidad
- `test`: Agregar o modificar tests
- `chore`: Cambios en build, configuración, etc.

**Formato:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Scope Utilizado

- `stock`: Componentes y funcionalidades de stock/movimientos

### Por Qué Esta Organización

1. **Commit 1:** Base necesaria para todo lo demás
2. **Commit 2:** Componente piloto que valida el patrón
3. **Commits 3-5:** Réplica del patrón en otros componentes
4. **Commit 6:** Fix de consistencia en componentes relacionados
5. **Commit 7:** Documentación completa de toda la implementación

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Los 7 commits se realizan sin errores
- [ ] Cada commit tiene archivos coherentes con su descripción
- [ ] Los mensajes de commit son claros y descriptivos
- [ ] El proyecto compila sin errores después de todos los commits
- [ ] El historial de Git está limpio y organizado
- [ ] El branch feature está pusheado a origin (si aplica)
- [ ] `agregado_preciocosto_movstock.md` NO está commiteado

---

## 🎉 CONCLUSIÓN

Este plan organiza **18 archivos** en **7 commits lógicos** que siguen la estructura de implementación de totalizadores v2.2. Cada commit es atómico, coherente y tiene un mensaje descriptivo que explica el qué, cómo y por qué de los cambios.

**Estado:** ✅ **PLAN LISTO PARA EJECUCIÓN**

**Recomendación:** Usar **Opción A (Feature Branch)** para mantener el historial limpio y permitir revisión antes de merge a main.

---

**Fin del Plan de Commits**

**Última actualización:** 2025-11-13
**Estado:** APROBADO PARA EJECUCIÓN
