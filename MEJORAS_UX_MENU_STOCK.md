# Mejoras de UX - Menú MOV.STOCK

**Fecha:** 14 de Noviembre de 2025
**Archivo Modificado:** `src/app/shared/sidebar/sidebar.component.html`
**Tipo:** Mejora de experiencia de usuario (UX)

---

## 📋 Resumen Ejecutivo

Se implementaron mejoras significativas en el menú de navegación MOV.STOCK para:
1. **Clarificar los nombres** de los items del menú
2. **Agregar tooltips explicativos** que aparecen al pasar el mouse
3. **Diferenciar visualmente** los dos flujos de stock (Pedido vs Envío Directo)
4. **Facilitar la comprensión** del sistema para usuarios nuevos y existentes

---

## 🔄 Tabla de Cambios: Antes → Después

| # | ANTES | DESPUÉS | Cambio Principal |
|---|-------|---------|------------------|
| 1 | **Pedir Stock** | **Solicitar Stock** | Más descriptivo + tooltip explicativo |
| 2 | **Enviar Stock** | **Envío Directo** | Distingue del flujo de solicitud |
| 3 | **Pedidos de Stk. pendientes** | **Mis Solicitudes** | Clarifica que son MIS pedidos |
| 4 | **Pedidos de Stk. recibidos** | **Stock Recibido** | Más genérico y claro |
| 5 | **Envios de Stk. pendientes** | **Pedidos para Enviar** | Clarifica que otros ME piden |
| 6 | **Envios de Stk. realizados** | **Mis Envíos** | Más corto y descriptivo |
| 7 | **Alta de Existencias** | **Alta de Existencias** | Sin cambios (mantiene consistencia) |
| 8 | **Lista de Altas** | **Lista de Altas** | Sin cambios (mantiene consistencia) |

---

## 💡 Detalle de Cada Item del Menú

### 1. Solicitar Stock
**Antes:** Pedir Stock

**Tooltip:**
> "Solicitar artículos a otra sucursal. Requiere aprobación y envío por parte de la sucursal destino. El stock se actualiza cuando envían."

**¿Qué hace?**
- Crear una solicitud de stock a otra sucursal
- La otra sucursal debe aprobar y enviar
- El stock NO se actualiza hasta que envíen
- Flujo: Solicitar → Aprobar → Enviar → Recibir

**Casos de uso:**
- "Necesito 10 unidades del artículo X que tiene Sucursal B"
- "Quiero solicitar stock con aprobación previa"

---

### 2. Envío Directo
**Antes:** Enviar Stock

**Tooltip:**
> "Enviar stock directamente a otra sucursal SIN solicitud previa. El inventario se actualiza al INSTANTE en ambas sucursales."

**¿Qué hace?**
- Enviar stock directamente sin solicitud previa
- El stock se actualiza INMEDIATAMENTE
- No requiere aprobación del destinatario
- Flujo: Enviar → Stock actualizado

**Casos de uso:**
- "Tengo exceso de stock y quiero enviarlo a otra sucursal YA"
- "Envío directo sin esperar aprobación"

**⚠️ DIFERENCIA CLAVE:**
- **Solicitar Stock:** Requiere aprobación → Stock se actualiza al ENVIAR
- **Envío Directo:** No requiere aprobación → Stock se actualiza al INSTANTE

---

### 3. Mis Solicitudes
**Antes:** Pedidos de Stk. pendientes

**Tooltip:**
> "Ver estado de MIS solicitudes de stock: Solicitado (pendiente), Solicitado-E (enviado), Recibido (completado). Aquí puedo RECIBIR o CANCELAR pedidos."

**¿Qué hace?**
- Ver solicitudes que YO hice a otras sucursales
- Mostrar estados:
  - **Solicitado:** Pendiente de envío
  - **Solicitado-E:** Ya enviado, esperando recepción
  - **Recibido:** Completado
- Puedo **RECIBIR** pedidos enviados
- Puedo **CANCELAR** pedidos pendientes

**Estados visibles:**
```
Solicitado    → [Botón: Cancelar]
Solicitado-E  → [Botón: Recibir] [Botón: Cancelar]
Recibido      → [Solo lectura]
```

---

### 4. Stock Recibido
**Antes:** Pedidos de Stk. recibidos

**Tooltip:**
> "Ver todo el stock que RECIBÍ (tanto de solicitudes confirmadas como envíos directos). Solo visualización."

**¿Qué hace?**
- Ver historial de stock recibido
- Incluye:
  - Solicitudes que hice y fueron enviadas/recibidas
  - Envíos directos que otras sucursales me hicieron
- **Solo visualización** (no hay acciones disponibles)

**Estados visibles:**
```
Enviado   → Stock en tránsito
Recibido  → Stock confirmado
```

---

### 5. Pedidos para Enviar
**Antes:** Envios de Stk. pendientes

**Tooltip:**
> "Ver solicitudes que OTRAS sucursales me hicieron. Aquí puedo APROBAR y ENVIAR o RECHAZAR pedidos."

**¿Qué hace?**
- Ver solicitudes de OTRAS sucursales hacia MI sucursal
- Puedo **APROBAR y ENVIAR** las solicitudes
- Puedo **RECHAZAR/CANCELAR** las solicitudes
- Al enviar, el stock se actualiza INMEDIATAMENTE

**Estados visibles:**
```
Solicitado → [Botón: Enviar] [Botón: Cancelar]
```

**⚠️ IMPORTANTE:**
Al hacer clic en "Enviar", el stock se modifica al instante (sin esperar recepción).

---

### 6. Mis Envíos
**Antes:** Envios de Stk. realizados

**Tooltip:**
> "Historial de envíos que YO realicé (tanto solicitudes aprobadas como envíos directos). Solo visualización."

**¿Qué hace?**
- Ver historial de envíos realizados
- Incluye:
  - Solicitudes que otras sucursales me hicieron y YO envié
  - Envíos directos que YO hice
- **Solo visualización** (no hay acciones disponibles)

**Estados visibles:**
```
Enviado → Stock ya transferido
```

---

### 7. Alta de Existencias
**Sin cambios de nombre** (mantiene consistencia con el resto del menú)

**Tooltip:**
> "Dar de alta nuevas existencias en el inventario. Aumenta el stock disponible."

**¿Qué hace?**
- Crear nuevas existencias en el inventario
- Aumenta el stock disponible

---

### 8. Lista de Altas
**Sin cambios de nombre** (mantiene consistencia con el resto del menú)

**Tooltip:**
> "Ver historial de altas de existencias realizadas. Solo visualización."

**¿Qué hace?**
- Ver historial de altas de stock
- Solo visualización

---

## 🎨 Características Implementadas

### 1. Tooltips Interactivos
- **Librería:** PrimeNG Tooltip (`pTooltip`)
- **Posición:** A la derecha del item del menú (`tooltipPosition="right"`)
- **Delay:** 500ms antes de aparecer (`[showDelay]="500"`)
- **Contenido:** Descripción detallada de qué hace cada opción

**Ejemplo de uso:**
```html
<a routerLinkActive="active"
   [routerLink]="['pedir-stock']"
   pTooltip="Solicitar artículos a otra sucursal. Requiere aprobación..."
   tooltipPosition="right"
   [showDelay]="500">
    Solicitar Stock
</a>
```

### 2. Nombres Descriptivos y Consistentes
- Eliminada la abreviatura "Stk." → ahora "Stock" completo
- Clarificado "Mis" vs "Otros"
- Verbos más específicos (Solicitar vs Enviar)
- **Sin emojis** para mantener consistencia visual con el resto del menú de la aplicación

---

## 📚 Guía de Uso para Usuarios

### Flujo 1: Solicitar Stock (Con Aprobación)

**Paso a paso:**

1. **Yo solicito** → Ir a **Solicitar Stock**
   - Selecciono artículo
   - Indico cantidad
   - Selecciono sucursal destino
   - Confirmo solicitud
   - Estado: "Solicitado"

2. **Verifico mi solicitud** → Ir a **Mis Solicitudes**
   - Veo estado: "Solicitado" (pendiente)
   - Puedo cancelar si cambio de opinión

3. **Otra sucursal aprueba** → (En su pantalla **Pedidos para Enviar**)
   - Ellos hacen clic en "Enviar"
   - Stock se actualiza al ENVIAR
   - Estado cambia a: "Solicitado-E"

4. **Yo recibo** → Ir a **Mis Solicitudes**
   - Veo estado: "Solicitado-E" (enviado)
   - Hago clic en "Recibir"
   - Estado cambia a: "Recibido"
   - Confirmo recepción física

5. **Verifico recepción** → Ir a **Stock Recibido**
   - Veo el historial de lo recibido

---

### Flujo 2: Envío Directo (Sin Aprobación)

**Paso a paso:**

1. **Yo envío directo** → Ir a **Envío Directo**
   - Selecciono artículo
   - Indico cantidad
   - Selecciono sucursal destino
   - Confirmo envío
   - **Stock se actualiza AL INSTANTE**

2. **Verifico mi envío** → Ir a **Mis Envíos**
   - Veo el envío realizado

3. **Otra sucursal verifica** → (En su pantalla **Stock Recibido**)
   - Ven el stock recibido

---

## 🎯 Ventajas de los Cambios

### Para Usuarios Nuevos:
✅ **Más fácil de entender** qué hace cada opción
✅ **Tooltips guían** el uso correcto
✅ **Nombres descriptivos** ayudan a identificar rápidamente

### Para Usuarios Existentes:
✅ **Menos confusión** entre opciones similares
✅ **Clarifica** la diferencia entre los dos flujos
✅ **Mismo orden** de items (solo nombres mejorados)

### Para Soporte Técnico:
✅ **Menos consultas** sobre "¿dónde veo mis pedidos?"
✅ **Capacitación más fácil** con tooltips
✅ **Documentación visual** en el mismo sistema

---

## 🔍 Comparación Visual

### ANTES (Confuso):
```
MOV.STOCK
├─ Pedir Stock                    ❓ ¿A quién?
├─ Enviar Stock                   ❓ ¿Cuándo?
├─ Pedidos de Stk. pendientes    ❓ ¿Míos o de otros?
├─ Pedidos de Stk. recibidos     ❓ ¿Qué veo?
├─ Envios de Stk. pendientes     ❓ ¿Es lo mismo?
└─ Envios de Stk. realizados     ❓ ¿Diferencia?
```

### DESPUÉS (Claro):
```
MOV.STOCK
├─ Solicitar Stock             ✅ Yo pido (con aprobación)
├─ Envío Directo               ✅ Yo envío (sin aprobación)
├─ Mis Solicitudes             ✅ Ver MIS pedidos
├─ Stock Recibido              ✅ Lo que YO recibí
├─ Pedidos para Enviar         ✅ Otros ME piden
└─ Mis Envíos                  ✅ Lo que YO envié
```

---

## 🧪 Verificación Post-Implementación

### Checklist de Pruebas:

- [ ] Los tooltips aparecen al pasar el mouse (después de 500ms)
- [ ] Los tooltips se posicionan a la derecha del menú
- [ ] Los nombres son claros y descriptivos
- [ ] Los links navegan a las rutas correctas
- [ ] Los nombres son claros para usuarios nuevos
- [ ] Los usuarios existentes encuentran las opciones

### Prueba con Usuario:

**Pregunta:** "¿Dónde solicitas stock a otra sucursal?"
**Respuesta esperada:** "Solicitar Stock"

**Pregunta:** "¿Dónde ves las solicitudes que TE hicieron?"
**Respuesta esperada:** "Pedidos para Enviar"

**Pregunta:** "¿Cuál es la diferencia entre Solicitar y Envío Directo?"
**Respuesta esperada (leyendo tooltips):**
- Solicitar requiere aprobación
- Envío Directo es inmediato

---

## 📖 Capacitación de Usuarios

### Mensaje para Anunciar los Cambios:

```
📢 MEJORAS EN EL MENÚ MOV.STOCK

Hemos mejorado los nombres del menú de Movimientos de Stock para
que sea más fácil de usar:

✨ NOVEDADES:
• Nombres más claros y descriptivos
• Tooltips informativos al pasar el mouse

🔍 PRINCIPALES CAMBIOS:
• "Pedir Stock" → "Solicitar Stock"
• "Enviar Stock" → "Envío Directo"
• "Pedidos pendientes" → "Mis Solicitudes"
• "Envíos pendientes" → "Pedidos para Enviar"

💡 CONSEJO:
Pasa el mouse sobre cada opción para ver una descripción
detallada de qué hace.

Las funcionalidades NO cambiaron, solo los nombres para
que sean más claros.
```

---

## 🛠️ Detalles Técnicos

### Archivo Modificado:
```
src/app/shared/sidebar/sidebar.component.html
Líneas: 45-121
```

### Módulo Requerido:
```typescript
// Ya importado en app.module.ts línea 45
import { TooltipModule } from 'primeng/tooltip';
```

### Configuración de Tooltips:
```typescript
pTooltip="Texto del tooltip"        // Contenido
tooltipPosition="right"               // Posición
[showDelay]="500"                    // Delay en ms
```

---

## 🔄 Reversión (Si es necesario)

Si por alguna razón necesitas volver a los nombres antiguos:

**Paso 1:** Abrir archivo
```bash
nano src/app/shared/sidebar/sidebar.component.html
```

**Paso 2:** Restaurar desde Git
```bash
git checkout HEAD -- src/app/shared/sidebar/sidebar.component.html
```

**Paso 3:** Reiniciar servidor Angular
```bash
ng serve
```

---

## 📞 Contacto y Soporte

**Desarrollador:** Claude Code (Anthropic)
**Fecha de implementación:** 14 de Noviembre de 2025
**Documentación relacionada:**
- `flujo_movstock_reales.md` - Análisis de flujos
- `REPARACIONES_STOCK_14NOV2025.md` - Reparaciones de backend

---

## ✅ Estado de Implementación

- [x] Nombres actualizados
- [x] Tooltips implementados
- [x] Documentación creada
- [ ] Usuarios capacitados
- [ ] Feedback recolectado
- [ ] Ajustes finales aplicados

**Próximos pasos:**
1. Probar tooltips en navegador
2. Recolectar feedback de usuarios
3. Ajustar textos de tooltips si es necesario
4. Considerar agregar badges/indicadores de estado en futuras versiones
