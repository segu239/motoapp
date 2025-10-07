# GUÍA RÁPIDA DE EJECUCIÓN - Commits Carrito

**⏱️ Tiempo estimado**: 1-2 horas (sin esperas de code review)
**📋 Documento completo**: Ver PLAN_ESTRATEGIA_COMMITS_CARRITO.md

---

## 🎯 OBJETIVO

Crear 3 commits atómicos y bien organizados para los cambios de carrito:
1. 🔴 **COMMIT #1**: Fix crítico de eliminación
2. 🟢 **COMMIT #2**: Feature de subtotales
3. 📘 **COMMIT #3**: Documentación

---

## ⚡ EJECUCIÓN RÁPIDA (5 PASOS)

### PASO 1: Preparación (5 min)

```bash
# Verificar estado
git status

# Backup por seguridad
git branch backup-carrito-$(date +%Y%m%d-%H%M%S)

# Compilar para asegurar que todo funciona
npx ng build
```

**✅ Checkpoint**: Build debe ser SUCCESSFUL

---

### PASO 2: Commit #1 - Fix Crítico (10 min)

```bash
# Reset para control total
git reset HEAD src/app/components/carrito/

# Stagear archivos del fix
git add src/app/components/carrito/carrito.component.ts
git add INFORME_BUG_ELIMINACION_CARRITO.md
git add VALIDACION_ARQUITECTONICA_FIX_CARRITO.md

# Verificar staging
git status --short

# Crear commit
git commit -m "$(cat <<'EOF'
fix(carrito): corregir eliminación incorrecta de items

Corrige bug crítico donde al eliminar un item del carrito se eliminaba
un item diferente (generalmente el último).

Causa Raíz:
- El template itera sobre itemsConTipoPago (array derivado)
- eliminarItem() usaba indexOf() sobre itemsEnCarrito
- indexOf() con objetos diferentes siempre retorna -1
- splice(-1, 1) elimina el último elemento

Solución:
- Usar findIndex() con identificador compuesto (id_articulo + cod_tar)
- Validaciones defensivas de datos inválidos
- Manejo de errores de sessionStorage
- Try-catch para errores inesperados
- Mensajes claros al usuario

Severidad: CRÍTICA (bug pre-existente)
Líneas modificadas: 75 líneas
Nivel de confianza: 95%

Validado por: Arquitecto Maestro de Sistemas

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**✅ Checkpoint**: Verificar commit con `git log -1 --stat`

---

### PASO 3: Commit #2 - Feature Subtotales (10 min)

```bash
# Stagear archivos de feature
git add src/app/components/carrito/carrito.component.ts
git add src/app/components/carrito/carrito.component.html
git add src/app/components/carrito/carrito.component.css
git add AUDITORIA_CALIDAD_SUBTOTALES.md
git add REVISION_ARQUITECTONICA_SUBTOTALES.md
git add VALIDACION_AUDITORIA_SUBTOTALES.md
git add informeplansubtotales.md

# Crear commit
git commit -m "$(cat <<'EOF'
feat(carrito): agregar subtotales por tipo de pago

Implementa visualización de subtotales agrupados por tipo de pago.

Características:
- Cálculo automático con performance O(m+n)
- Visualización responsive debajo del total
- Ordenamiento alfabético
- Estilo especial para items "Indefinido"
- 53 líneas de código validado

Cambios:
- carrito.component.ts: 135 líneas
- carrito.component.html: 15 líneas
- carrito.component.css: 92 líneas

Validado por: Arquitecto Maestro + Auditor de Calidad

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**✅ Checkpoint**: Compilar con `npx ng build`

---

### PASO 4: Commit #3 - Documentación (5 min)

```bash
# Stagear documentación
git add RESUMEN_IMPLEMENTACION_CARRITO.md
git add implementacionfinal.md
git add planimplementacionfinal.md

# Crear commit
git commit -m "$(cat <<'EOF'
docs(carrito): documentación completa de implementación

Documenta cambios implementados en carrito: fix crítico de
eliminación y feature de subtotales por tipo de pago.

Incluye:
- Resumen ejecutivo con checklist de 7 tests
- Plan de implementación final
- Estrategia de implementación
- Guía de rollback

Estado: ✅ COMPILADO Y VALIDADO

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### PASO 5: Push y Pull Request (10 min)

```bash
# Ver historial final
git log -3 --oneline

# Push a remote
git push origin solucionactualizaciontotal

# Crear Pull Request (GitHub CLI)
gh pr create --title "feat(carrito): mejoras críticas - fix eliminación + subtotales" \
  --body "Ver RESUMEN_IMPLEMENTACION_CARRITO.md para detalles completos" \
  --base main \
  --head solucionactualizaciontotal
```

**✅ Checkpoint**: Verificar PR en GitHub

---

## 🚨 TROUBLESHOOTING

### Problema: "MM" en archivos (Modified + Modified)

**Solución**: Los archivos tienen cambios en staging Y en working directory

```bash
# Ver qué está staged
git diff --cached src/app/components/carrito/carrito.component.ts

# Ver qué NO está staged
git diff src/app/components/carrito/carrito.component.ts

# Si los cambios no staged son basura:
git checkout -- src/app/components/carrito/carrito.component.ts

# Si los cambios no staged son importantes:
git stash  # Guardar para después
```

---

### Problema: Commit se hizo con archivos equivocados

**Solución**: Deshacer último commit (mantener cambios)

```bash
# Deshacer commit pero mantener cambios en staging
git reset --soft HEAD~1

# Re-hacer staging correcto
git reset HEAD
git add <archivos correctos>
git commit -m "mensaje correcto"
```

---

### Problema: Quiero cambiar el mensaje del último commit

**Solución**: Amend

```bash
git commit --amend
# Editar mensaje en editor
```

---

## 📊 VISUALIZACIÓN DE HISTORIAL

Después de los 3 commits, el historial debe verse así:

```
* abc1234 (HEAD -> solucionactualizaciontotal) docs(carrito): documentación completa
* def5678 feat(carrito): agregar subtotales por tipo de pago
* ghi9012 fix(carrito): corregir eliminación incorrecta de items
* 06176b8 solucion decimales carrito  <-- commit anterior
```

---

## 🔄 ROLLBACK RÁPIDO

Si algo sale mal:

```bash
# Volver al estado anterior (CUIDADO: destruye cambios)
git reset --hard 06176b8

# O revertir commits uno por uno
git revert HEAD~2..HEAD
```

---

## ✅ CHECKLIST FINAL

Antes de considerar completado:

- [ ] 3 commits creados correctamente
- [ ] `git log -3` muestra mensajes correctos
- [ ] `npx ng build` compila sin errores
- [ ] Push exitoso a remote
- [ ] Pull Request creado (o merge directo hecho)
- [ ] Equipo notificado

---

## 📞 AYUDA ADICIONAL

**Documento completo**: PLAN_ESTRATEGIA_COMMITS_CARRITO.md
- Sección 3: Plan detallado de commits
- Sección 4: Orden de ejecución paso a paso
- Sección 7: Estrategias de rollback
- Anexo A: Mensajes de commit completos para copy-paste

---

**Generado por**: Especialista Senior en Control de Versiones
**Fecha**: 2025-10-06
**Versión**: 1.0
