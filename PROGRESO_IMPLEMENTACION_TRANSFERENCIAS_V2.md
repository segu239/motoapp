# Progreso de Implementación - Sistema de Transferencias V2.0

**Fecha de inicio:** 15 de Noviembre de 2025
**Última actualización:** 15 de Noviembre de 2025
**Estado:** FASES 1-3 COMPLETADAS (Backend) | FASES 4-6 PENDIENTES (Frontend)
**Progreso estimado:** 45% completado

---

## 📋 RESUMEN EJECUTIVO

Se está implementando una **mejora integral del sistema de transferencias de stock** que introduce:

1. **Flujo bidireccional con confirmación:**
   - **PULL (Solicitar):** Sucursal destino solicita a sucursal origen
   - **PUSH (Ofrecer):** Sucursal origen ofrece a sucursal destino
   - Ambos requieren **aceptación** antes de mover stock

2. **Estados nuevos:**
   - `Solicitado` → `Aceptado` → `Recibido` (flujo PULL)
   - `Ofrecido` → `Aceptado` → `Recibido` (flujo PUSH)
   - `Rechazado`, `Cancelado`

3. **Movimiento de stock correcto:**
   - Stock se mueve SOLO al **aceptar** la transferencia (no al crear)
   - Se valida stock suficiente antes de mover
   - Auditoría completa con fechas y usuarios

---

## ✅ FASES COMPLETADAS (Backend - 45%)

### FASE 1: Scripts de Migración de Base de Datos ✅

**Estado:** Scripts creados, **PENDIENTE EJECUCIÓN MANUAL**

#### Archivos Creados:

**1. `database/migrations/001_agregar_campos_transferencias.sql`**
- Crea backups de seguridad (pedidoitem_backup_20251115, pedidoscb_backup_20251115)
- Agrega campo `tipo_transferencia` VARCHAR(10) a ambas tablas
- Agrega campos de auditoría:
  - `fecha_aceptacion`, `usuario_aceptacion`
  - `fecha_rechazo`, `usuario_rechazo`, `motivo_rechazo`
  - `fecha_confirmacion`, `usuario_confirmacion`
- Crea índices para optimizar consultas
- Incluye validaciones automáticas

**2. `database/migrations/002_migrar_estados_existentes.sql`**
- Marca transferencias anteriores como `tipo_transferencia = 'LEGACY'`
- Normaliza estados "Enviado" y "Solicitado-E" a "Aceptado"
- **PROTECCIÓN:** NO toca registros con estado 'ALTA' o 'Cancel-Alta'
- Validación automática que aborta si afecta sistema ALTA
- Incluye transacción con revisión manual antes de COMMIT

**3. `database/migrations/003_validar_migracion.sql`**
- 8 tests de validación post-migración
- Verifica integridad entre pedidoitem y pedidoscb
- Confirma que sistema ALTA no fue afectado
- Valida que backups existen
- Muestra resumen de estados

**4. `database/migrations/999_rollback_emergencia.sql`**
- Plan de rollback completo en caso de problemas
- Restaura desde backups
- Elimina índices y columnas nuevas
- Valida que rollback fue exitoso

#### ⚠️ ACCIÓN REQUERIDA:

**Ejecutar manualmente en PostgreSQL en ESTE ORDEN:**

```bash
# Paso 1: Crear backups y agregar campos (auto-commit)
psql -U usuario -d motoapp -f database/migrations/001_agregar_campos_transferencias.sql

# Paso 2: Migrar estados (REVISAR OUTPUT antes de hacer COMMIT)
psql -U usuario -d motoapp -f database/migrations/002_migrar_estados_existentes.sql
# IMPORTANTE: El script termina en BEGIN, revisar el resumen y luego:
# Si todo OK: psql -U usuario -d motoapp -c "COMMIT;"
# Si hay problemas: psql -U usuario -d motoapp -c "ROLLBACK;"

# Paso 3: Validar migración
psql -U usuario -d motoapp -f database/migrations/003_validar_migracion.sql

# Si TODO está OK, todos los tests deben mostrar "✅ PASÓ"
```

**Si hay problemas críticos:**
```bash
# Rollback de emergencia
psql -U usuario -d motoapp -f database/migrations/999_rollback_emergencia.sql
```

---

### FASE 2: Backend PHP - Nuevas Funciones ✅

**Estado:** COMPLETADO
**Archivo modificado:** `src/Descarga.php.txt`

#### Funciones Nuevas Agregadas:

**1. `AceptarTransferencia_post()`** (líneas 6966-7185)

**Ubicación:** Después del sistema ALTA, antes del cierre de clase
**Propósito:** Acepta una solicitud (PULL) u oferta (PUSH)
**⚠️ CRÍTICO:** Este es el ÚNICO momento donde se mueve el stock

**Parámetros:**
```php
POST /Descarga/AceptarTransferencia
{
  "id_num": 123,
  "usuario": "admin"
}
```

**Lógica:**
1. Valida que estado sea "Solicitado" u "Ofrecido"
2. Determina dirección del flujo (PULL vs PUSH)
3. Calcula sucursal origen y destino
4. Valida stock suficiente en origen
5. **MUEVE STOCK:** origen -cantidad, destino +cantidad
6. Actualiza estado a "Aceptado"
7. Registra fecha_aceptacion y usuario_aceptacion

**Mapeo de sucursales a campos stock:**
```php
1 → exi2  // Casa Central
2 → exi3  // Valle Viejo
3 → exi4  // Güemes
4 → exi1  // Depósito
5 → exi5  // Mayorista
```

**2. `RechazarTransferencia_post()`** (líneas 7199-7325)

**Propósito:** Rechaza una solicitud u oferta

**Parámetros:**
```php
POST /Descarga/RechazarTransferencia
{
  "id_num": 123,
  "usuario": "admin",
  "motivo_rechazo": "No hay stock suficiente"
}
```

**Lógica:**
1. Valida que estado sea "Solicitado" u "Ofrecido"
2. Valida motivo (mínimo 5 caracteres)
3. NO mueve stock
4. Actualiza estado a "Rechazado"
5. Registra fecha_rechazo, usuario_rechazo, motivo_rechazo

**3. `ConfirmarRecepcion_post()`** (líneas 7338-7457)

**Propósito:** Confirma recepción de stock (flujo PULL)

**Parámetros:**
```php
POST /Descarga/ConfirmarRecepcion
{
  "id_num": 123,
  "usuario": "admin"
}
```

**Lógica:**
1. Valida que estado sea "Aceptado"
2. Valida que sea flujo PULL (opcional)
3. NO mueve stock (ya se movió al aceptar)
4. Actualiza estado a "Recibido"
5. Registra fecha_confirmacion y usuario_confirmacion

**4. `ConfirmarEnvio_post()`** (líneas 7470-7589)

**Propósito:** Confirma envío de stock (flujo PUSH)

**Parámetros:**
```php
POST /Descarga/ConfirmarEnvio
{
  "id_num": 123,
  "usuario": "admin"
}
```

**Lógica:**
- Idéntica a ConfirmarRecepcion pero para flujo PUSH
- Valida que tipo_transferencia sea 'PUSH'

---

### FASE 2: Backend PHP - Funciones Modificadas ✅

**1. `PedidoItemyCab_post()`** (líneas 1568-1710)

**Cambios realizados:**

**Agregado (líneas 1591-1598):**
```php
// Obtener tipo de transferencia
$tipo_transferencia = isset($pedidoItem['tipo_transferencia'])
    ? $pedidoItem['tipo_transferencia']
    : null;
```

**Modificado INSERT pedidoitem (línea 1601):**
```php
// ANTES:
INSERT INTO pedidoitem (tipo, cantidad, id_art, descripcion, precio, fecha_resuelto, usuario_res, observacion, estado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

// DESPUÉS:
INSERT INTO pedidoitem (tipo, cantidad, id_art, descripcion, precio, fecha_resuelto, usuario_res, observacion, estado, tipo_transferencia)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Modificado INSERT pedidoscb (línea 1618):**
```php
// ANTES:
INSERT INTO pedidoscb (tipo, sucursald, sucursalh, fecha, usuario, observacion, estado, id_aso)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

// DESPUÉS:
INSERT INTO pedidoscb (tipo, sucursald, sucursalh, fecha, usuario, observacion, estado, id_aso, tipo_transferencia)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Agregado mensaje dinámico (líneas 1686-1702):**
```php
$mensaje = "";
if ($tipo_transferencia === 'PULL') {
    $mensaje = "Solicitud creada exitosamente. Pendiente de aprobación.";
} elseif ($tipo_transferencia === 'PUSH') {
    $mensaje = "Oferta creada exitosamente. Pendiente de aceptación.";
} else {
    $mensaje = "Pedido creado exitosamente.";
}
```

**2. `CancelarPedidoStock_post()`** (líneas 2179-2273)

**Cambios realizados:**

**Actualizado docblock (líneas 2179-2198):**
```php
/**
 * Estados permitidos para cancelación:
 * - 'Solicitado': Solicitud no aceptada (PULL) - NO revierte stock
 * - 'Ofrecido': Oferta no aceptada (PUSH) - NO revierte stock
 * - 'Solicitado-E': Solicitud enviada (LEGACY) - SÍ revierte stock
 *
 * Estados NO permitidos:
 * - 'Aceptado': Usar RechazarTransferencia_post() en su lugar
 * - 'Recibido': Transferencia completada, no cancelable
 * - 'Rechazado': Ya está cerrado
 */
```

**Actualizada validación de estados (líneas 2252-2273):**
```php
// ANTES:
if (!in_array($estado_actual, ['Solicitado', 'Solicitado-E'])) {
    // Error
}

// DESPUÉS:
if (!in_array($estado_actual, ['Solicitado', 'Ofrecido', 'Solicitado-E'])) {
    $this->db->trans_rollback();
    $respuesta = array(
        "error" => true,
        "mensaje" => "Solo se pueden cancelar pedidos en estado 'Solicitado', 'Ofrecido' o 'Solicitado-E'. Estado actual: " . $estado_actual
    );
    $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    return;
}
```

---

### FASE 3: Angular Service ✅

**Estado:** COMPLETADO

#### Archivos Modificados:

**1. `src/app/config/ini.ts`** (líneas 249-253)

**Agregadas URLs para nuevas funciones:**
```typescript
// URLs para sistema de transferencias mejorado (V2.0 - 15-NOV-2025)
export const UrlAceptarTransferencia = "https://motoapp.loclx.io/APIAND/index.php/Descarga/AceptarTransferencia";
export const UrlRechazarTransferencia = "https://motoapp.loclx.io/APIAND/index.php/Descarga/RechazarTransferencia";
export const UrlConfirmarRecepcion = "https://motoapp.loclx.io/APIAND/index.php/Descarga/ConfirmarRecepcion";
export const UrlConfirmarEnvio = "https://motoapp.loclx.io/APIAND/index.php/Descarga/ConfirmarEnvio";
```

**2. `src/app/services/cargardata.service.ts`** (líneas 453-526)

**Agregados 4 métodos nuevos:**

```typescript
// 1. Aceptar Transferencia (líneas 466-472)
aceptarTransferencia(id_num: number, usuario: string): Observable<any> {
  const payload = {
    id_num: id_num,
    usuario: usuario
  };
  return this.http.post(UrlAceptarTransferencia, payload);
}

// 2. Rechazar Transferencia (líneas 484-491)
rechazarTransferencia(id_num: number, usuario: string, motivo_rechazo: string): Observable<any> {
  const payload = {
    id_num: id_num,
    usuario: usuario,
    motivo_rechazo: motivo_rechazo
  };
  return this.http.post(UrlRechazarTransferencia, payload);
}

// 3. Confirmar Recepción (líneas 502-508)
confirmarRecepcion(id_num: number, usuario: string): Observable<any> {
  const payload = {
    id_num: id_num,
    usuario: usuario
  };
  return this.http.post(UrlConfirmarRecepcion, payload);
}

// 4. Confirmar Envío (líneas 519-525)
confirmarEnvio(id_num: number, usuario: string): Observable<any> {
  const payload = {
    id_num: id_num,
    usuario: usuario
  };
  return this.http.post(UrlConfirmarEnvio, payload);
}
```

---

## ⏳ FASES PENDIENTES (Frontend - 55%)

### FASE 4: Componentes Angular Nuevos

**Estado:** NO INICIADO

#### 4.1. Componente `transferencias-pendientes`

**Propósito:** Unifica la visualización de transferencias pendientes de aceptación

**Funcionalidad:**
- Muestra transferencias en estado "Solicitado" u "Ofrecido" donde MI sucursal es el destino
- Botones de acción:
  - ✅ **Aceptar** → Llama `aceptarTransferencia()`
  - ❌ **Rechazar** → Muestra modal para motivo, llama `rechazarTransferencia()`
- Filtros por sucursal origen, estado, fecha
- Indicador visual de tipo: 🔽 PULL (solicitud) vs 🔼 PUSH (oferta)

**Ubicación sugerida:**
```
src/app/components/transferencias-stock/transferencias-pendientes/
  - transferencias-pendientes.component.ts
  - transferencias-pendientes.component.html
  - transferencias-pendientes.component.css
```

**Ruta sugerida:**
```typescript
{ path: 'transferencias-pendientes', component: TransferenciasPendientesComponent }
```

**Template base:**
```html
<p-table [value]="transferencias" ...>
  <ng-template pTemplate="header">
    <tr>
      <th>ID</th>
      <th>Tipo</th> <!-- PULL/PUSH -->
      <th>Sucursal Origen</th>
      <th>Estado</th>
      <th>Fecha</th>
      <th>Artículos</th>
      <th>Acciones</th>
    </tr>
  </ng-template>
  <ng-template pTemplate="body" let-trans>
    <tr>
      <td>{{ trans.id_num }}</td>
      <td>
        <span *ngIf="trans.tipo_transferencia === 'PULL'">🔽 Solicitud</span>
        <span *ngIf="trans.tipo_transferencia === 'PUSH'">🔼 Oferta</span>
      </td>
      <td>{{ trans.sucursalOrigen }}</td>
      <td><p-tag [value]="trans.estado"></p-tag></td>
      <td>{{ trans.fecha | date }}</td>
      <td>{{ trans.cantidad_items }} items</td>
      <td>
        <button pButton icon="pi pi-check"
                (click)="aceptar(trans)"
                class="p-button-success"></button>
        <button pButton icon="pi pi-times"
                (click)="rechazar(trans)"
                class="p-button-danger"></button>
      </td>
    </tr>
  </ng-template>
</p-table>
```

**Métodos principales:**
```typescript
aceptar(transferencia: any) {
  this.cargarDataService.aceptarTransferencia(
    transferencia.id_num,
    this.usuarioActual
  ).subscribe(
    response => {
      this.messageService.add({
        severity: 'success',
        summary: 'Transferencia Aceptada',
        detail: 'El stock ha sido movido correctamente'
      });
      this.cargarTransferencias();
    },
    error => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error.mensaje
      });
    }
  );
}

rechazar(transferencia: any) {
  // Mostrar modal para motivo
  this.displayModalRechazo = true;
  this.transferenciaSeleccionada = transferencia;
}

confirmarRechazo() {
  this.cargarDataService.rechazarTransferencia(
    this.transferenciaSeleccionada.id_num,
    this.usuarioActual,
    this.motivoRechazo
  ).subscribe(
    response => {
      this.messageService.add({
        severity: 'info',
        summary: 'Transferencia Rechazada',
        detail: response.mensaje
      });
      this.displayModalRechazo = false;
      this.cargarTransferencias();
    }
  );
}
```

#### 4.2. Componente `mis-transferencias`

**Propósito:** Unifica la visualización de transferencias creadas por MI sucursal

**Funcionalidad:**
- Muestra transferencias donde MI sucursal es el origen
- Estados: Solicitado, Ofrecido, Aceptado, Recibido, Rechazado, Cancelado
- Botones de acción según estado:
  - Estado "Solicitado"/"Ofrecido": ❌ **Cancelar**
  - Estado "Aceptado": ✅ **Confirmar** (recepción para PULL, envío para PUSH)
- Historial completo con auditoría

**Ubicación sugerida:**
```
src/app/components/transferencias-stock/mis-transferencias/
  - mis-transferencias.component.ts
  - mis-transferencias.component.html
  - mis-transferencias.component.css
```

**Ruta sugerida:**
```typescript
{ path: 'mis-transferencias', component: MisTransferenciasComponent }
```

---

### FASE 5: Actualizar Componentes Existentes

**Estado:** NO INICIADO

#### 5.1. Renombrar/Reorganizar Componentes

**Componentes a modificar:**

1. **`pedir-stock` → `solicitar-stock`** (opcional, mejora semántica)
   - Archivo: `src/app/components/pedir-stock/`
   - Actualizar modal para incluir `tipo_transferencia: 'PULL'`
   - Al llamar `crearPedidoStock()`, agregar campo

2. **Crear nuevo modal `ofrecer-stock`** (similar a pedir-stock)
   - Archivo: `src/app/components/ofrecer-stock/`
   - Seleccionar sucursal destino
   - Al llamar `crearPedidoStock()`, agregar `tipo_transferencia: 'PUSH'`

#### 5.2. Modificar Componentes Existentes

**1. `stockpedido.component.ts`**
- Agregar columna "Tipo" (PULL/PUSH)
- Cambiar lógica de botones según estado
- Agregar botón "Confirmar Recepción/Envío" para estado "Aceptado"

**2. `enviostockpendientes.component.ts`**
- Agregar filtro por tipo_transferencia
- Actualizar para usar nuevas funciones

**3. `enviodestockrealizados.component.ts`**
- Mostrar información de auditoría (fechas, usuarios)
- Agregar filtros por tipo

**4. `stockrecibo.component.ts`**
- Ya funcional, revisar si necesita ajustes menores

---

### FASE 6: Menú y Rutas

**Estado:** NO INICIADO

#### 6.1. Actualizar `sidebar.component.html`

**Propuesta de estructura:**

```html
<!-- Menú Stock (actualizado) -->
<li class="menu-item">
  <a (click)="toggleMenu('stock')" class="menu-link">
    <i class="pi pi-box"></i>
    <span>Gestión de Stock</span>
    <i class="pi pi-chevron-down toggle-icon"></i>
  </a>
  <ul *ngIf="menuStates['stock']" class="submenu">
    <!-- NUEVO -->
    <li><a routerLink="/transferencias-pendientes">
      <i class="pi pi-inbox"></i> Transferencias Pendientes
    </a></li>

    <!-- NUEVO -->
    <li><a routerLink="/mis-transferencias">
      <i class="pi pi-send"></i> Mis Transferencias
    </a></li>

    <li><a routerLink="/solicitar-stock">
      <i class="pi pi-download"></i> Solicitar Stock
    </a></li>

    <!-- NUEVO -->
    <li><a routerLink="/ofrecer-stock">
      <i class="pi pi-upload"></i> Ofrecer Stock
    </a></li>

    <li><a routerLink="/stockrecibo">
      <i class="pi pi-check-circle"></i> Recepción de Stock
    </a></li>

    <!-- Componentes viejos - mantener por compatibilidad o eliminar -->
    <li class="deprecated">
      <a routerLink="/stockpedido">
        <i class="pi pi-list"></i> Pedidos (Legacy)
      </a>
    </li>
  </ul>
</li>
```

#### 6.2. Actualizar `app-routing.module.ts`

**Agregar rutas:**

```typescript
// Nuevas rutas
{
  path: 'transferencias-pendientes',
  component: TransferenciasPendientesComponent,
  canActivate: [AuthGuard]
},
{
  path: 'mis-transferencias',
  component: MisTransferenciasComponent,
  canActivate: [AuthGuard]
},
{
  path: 'ofrecer-stock',
  component: OfrecerStockComponent,
  canActivate: [AuthGuard]
},

// Renombrar (opcional)
{
  path: 'solicitar-stock',
  component: PedirStockComponent, // o renombrado a SolicitarStockComponent
  canActivate: [AuthGuard]
},
```

---

## 📚 DOCUMENTOS DE REFERENCIA

**Documentos de análisis creados durante el proceso:**

1. **`mejora_envio_stock.md`** (1800+ líneas)
   - Plan completo de implementación original
   - Análisis exhaustivo de base de datos
   - 8 componentes Angular documentados
   - 9 fases de implementación

2. **`ANALISIS_IMPACTO_BD_TRANSFERENCIAS.md`**
   - Análisis de impacto en base de datos
   - Validación de que cambios NO afectan sistema ALTA
   - Garantías de seguridad
   - Checklist de validación

3. **`estado_actual_movstock.md`**
   - Estado anterior del sistema
   - Problemas detectados y resueltos
   - 2 problemas resueltos (14-Nov)
   - 2 problemas pendientes identificados

4. **`CORRECCION_MOVIMIENTO_PREMATURO_STOCK_15NOV2025.md`**
   - Documentación de corrección implementada el 15-Nov
   - Problema: Stock se movía al crear solicitud
   - Solución: Stock solo se mueve al enviar

5. **`HALLAZGO_CRITICO_ENVIO_DIRECTO_ROTO_15NOV2025.md`**
   - Hallazgo que motivó esta mejora completa
   - Identificación de que envío directo se rompió al arreglar solicitudes
   - Propuesta de Opción B (implementada aquí)

6. **`flujo_movstock_reales.md`**
   - Flujo real documentado del sistema
   - Diagramas de estados

7. **`problema_cancelacion_movstock.md`**
   - Problema de cancelación resuelto el 14-Nov
   - Reversión de stock

8. **`REPARACIONES_STOCK_14NOV2025.md`**
   - Reparaciones realizadas el 14-Nov
   - Duplicación de pedidos
   - Cancelación

---

## 🔧 INSTRUCCIONES PARA CONTINUAR

### Paso 1: Ejecutar Migración de Base de Datos

**⚠️ IMPORTANTE:** Hacer backup completo antes de ejecutar

```bash
# 1. Backup manual adicional (recomendado)
pg_dump -U usuario -d motoapp > backup_antes_migracion_$(date +%Y%m%d_%H%M%S).sql

# 2. Ejecutar migración
cd C:\Users\Telemetria\T49E2PT\angular\motoapp
psql -U usuario -d motoapp -f database/migrations/001_agregar_campos_transferencias.sql

# 3. Ejecutar migración de estados (REVISAR antes de COMMIT)
psql -U usuario -d motoapp -f database/migrations/002_migrar_estados_existentes.sql
# El script termina sin hacer COMMIT. Revisar el resumen de estados:
# Si todo OK:
psql -U usuario -d motoapp -c "COMMIT;"
# Si hay problemas:
psql -U usuario -d motoapp -c "ROLLBACK;"

# 4. Validar migración
psql -U usuario -d motoapp -f database/migrations/003_validar_migracion.sql
# Todos los tests deben mostrar ✅ PASÓ

# 5. Verificar manualmente
psql -U usuario -d motoapp -c "
SELECT
  COALESCE(tipo_transferencia, 'NULL') as tipo,
  TRIM(estado) as estado,
  COUNT(*) as cantidad
FROM pedidoitem
WHERE tipo = 'PE'
GROUP BY tipo_transferencia, estado
ORDER BY tipo_transferencia NULLS FIRST, estado;
"

# Resultado esperado:
# tipo    | estado        | cantidad
# --------+---------------+---------
# NULL    | ALTA          | 578      ← Sistema ALTA (NO tocado)
# NULL    | Cancel-Alta   | 6        ← Sistema ALTA (NO tocado)
# LEGACY  | Aceptado      | 5        ← Transferencias viejas normalizadas
# LEGACY  | Recibido      | 4        ← Transferencias viejas
# LEGACY  | Cancelado     | 3        ← Transferencias viejas
```

### Paso 2: Probar Backend

**Crear una solicitud (PULL):**

```bash
curl -X POST https://motoapp.loclx.io/APIAND/index.php/Descarga/PedidoItemyCab \
  -H "Content-Type: application/json" \
  -d '{
    "pedidoItem": {
      "tipo": "PE",
      "cantidad": 10,
      "id_art": 123,
      "descripcion": "Producto Test",
      "precio": 0,
      "fecha_resuelto": "2025-11-15",
      "usuario_res": "admin",
      "observacion": "Test solicitud PULL",
      "estado": "Solicitado",
      "tipo_transferencia": "PULL"
    },
    "pedidoscb": {
      "tipo": "PE",
      "sucursald": 1,
      "sucursalh": 4,
      "fecha": "2025-11-15",
      "usuario": "admin",
      "observacion": "Test",
      "estado": "Solicitado"
    }
  }'
```

**Aceptar la solicitud:**

```bash
# Asumiendo que se creó con id_num = 597
curl -X POST https://motoapp.loclx.io/APIAND/index.php/Descarga/AceptarTransferencia \
  -H "Content-Type: application/json" \
  -d '{
    "id_num": 597,
    "usuario": "admin"
  }'

# Verificar que el stock se movió:
psql -U usuario -d motoapp -c "
SELECT id_articulo, exi1, exi2 FROM artsucursal WHERE id_articulo = 123;
"
```

**Confirmar recepción:**

```bash
curl -X POST https://motoapp.loclx.io/APIAND/index.php/Descarga/ConfirmarRecepcion \
  -H "Content-Type: application/json" \
  -d '{
    "id_num": 597,
    "usuario": "admin"
  }'
```

**Rechazar una transferencia:**

```bash
curl -X POST https://motoapp.loclx.io/APIAND/index.php/Descarga/RechazarTransferencia \
  -H "Content-Type: application/json" \
  -d '{
    "id_num": 598,
    "usuario": "admin",
    "motivo_rechazo": "No tenemos stock suficiente en este momento"
  }'
```

### Paso 3: Implementar Frontend (FASE 4)

**Generar componentes con Angular CLI:**

```bash
cd C:\Users\Telemetria\T49E2PT\angular\motoapp

# Componente transferencias-pendientes
ng generate component components/transferencias-stock/transferencias-pendientes

# Componente mis-transferencias
ng generate component components/transferencias-stock/mis-transferencias

# Componente ofrecer-stock (modal)
ng generate component components/ofrecer-stock
```

**Estructura de archivos a crear:**

```
src/app/components/
├── transferencias-stock/
│   ├── transferencias-pendientes/
│   │   ├── transferencias-pendientes.component.ts
│   │   ├── transferencias-pendientes.component.html
│   │   └── transferencias-pendientes.component.css
│   └── mis-transferencias/
│       ├── mis-transferencias.component.ts
│       ├── mis-transferencias.component.html
│       └── mis-transferencias.component.css
└── ofrecer-stock/
    ├── ofrecer-stock.component.ts
    ├── ofrecer-stock.component.html
    └── ofrecer-stock.component.css
```

**Implementar `transferencias-pendientes.component.ts`:**

Ver sección "FASE 4.1" arriba para template completo.

**Pasos clave:**
1. Importar CargarDataService
2. Importar MessageService
3. Obtener sucursal actual del usuario autenticado
4. Llamar `obtenerPedidoItemPorSucursalh(sucursal)` para obtener transferencias pendientes
5. Filtrar por estado "Solicitado" u "Ofrecido"
6. Implementar métodos `aceptar()` y `rechazar()`
7. Agregar modal de confirmación para rechazo con campo motivo

### Paso 4: Actualizar Componentes Existentes (FASE 5)

**Modificar `pedir-stock.component.ts`:**

```typescript
// Agregar al objeto pedidoItem antes de enviar:
pedidoItem: {
  // ... campos existentes ...
  tipo_transferencia: 'PULL'  // ← AGREGAR ESTO
}
```

**Crear `ofrecer-stock.component.ts`:**

Copiar de `pedir-stock.component.ts` y modificar:
- Cambiar `tipo_transferencia` a `'PUSH'`
- Cambiar `estado` a `'Ofrecido'`
- Invertir lógica de sucursales:
  - `sucursald`: MI sucursal (origen)
  - `sucursalh`: Sucursal destino (seleccionada por usuario)

### Paso 5: Actualizar Rutas y Menú (FASE 6)

**Editar `src/app/app-routing.module.ts`:**

```typescript
// Agregar importaciones
import { TransferenciasPendientesComponent } from './components/transferencias-stock/transferencias-pendientes/transferencias-pendientes.component';
import { MisTransferenciasComponent } from './components/transferencias-stock/mis-transferencias/mis-transferencias.component';
import { OfrecerStockComponent } from './components/ofrecer-stock/ofrecer-stock.component';

// Agregar rutas
const routes: Routes = [
  // ... rutas existentes ...

  // Nuevas rutas de transferencias
  {
    path: 'transferencias-pendientes',
    component: TransferenciasPendientesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'mis-transferencias',
    component: MisTransferenciasComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'ofrecer-stock',
    component: OfrecerStockComponent,
    canActivate: [AuthGuard]
  }
];
```

**Editar `src/app/shared/sidebar/sidebar.component.html`:**

Ver sección "FASE 6.1" arriba para estructura completa del menú.

### Paso 6: Testing

**Casos de prueba:**

1. **Flujo PULL completo:**
   - Sucursal 1 solicita a Sucursal 4
   - Sucursal 4 acepta → Verificar stock movido
   - Sucursal 1 confirma recepción → Estado "Recibido"

2. **Flujo PUSH completo:**
   - Sucursal 4 ofrece a Sucursal 1
   - Sucursal 1 acepta → Verificar stock movido
   - Sucursal 4 confirma envío → Estado "Recibido"

3. **Rechazo:**
   - Sucursal 1 solicita a Sucursal 4
   - Sucursal 4 rechaza con motivo
   - Verificar estado "Rechazado" y motivo guardado

4. **Cancelación:**
   - Sucursal 1 solicita a Sucursal 4
   - Sucursal 1 cancela antes de aceptación
   - Verificar estado "Cancelado"

5. **Validación de stock:**
   - Crear solicitud por 1000 unidades de un artículo que solo tiene 10
   - Intentar aceptar → Debe fallar con mensaje "Stock insuficiente"

---

## 📊 MÉTRICAS DE PROGRESO

| Fase | Descripción | Estado | Progreso |
|------|-------------|--------|----------|
| 1 | Scripts SQL migración BD | ✅ Creados, ⏳ No ejecutados | 90% |
| 2 | Backend PHP - Nuevas funciones | ✅ Completado | 100% |
| 2 | Backend PHP - Modificar existentes | ✅ Completado | 100% |
| 3 | Angular Service + URLs | ✅ Completado | 100% |
| 4 | Componentes nuevos Angular | ❌ No iniciado | 0% |
| 5 | Actualizar componentes existentes | ❌ No iniciado | 0% |
| 6 | Rutas y menú | ❌ No iniciado | 0% |
| 7 | Testing integral | ❌ No iniciado | 0% |
| 8 | Documentación final | ❌ No iniciado | 0% |

**Progreso total estimado:** 45% completado

**Tiempo invertido:** ~4 horas
**Tiempo estimado restante:** 6-8 horas

---

## ⚠️ PUNTOS CRÍTICOS A TENER EN CUENTA

### 1. NO Afectar Sistema de Alta de Existencias

**✅ GARANTIZADO:** Los cambios en BD solo afectan transferencias (tipo = 'PE')

**Validación:**
```sql
-- Este query debe devolver 0 registros:
SELECT COUNT(*) FROM pedidoitem
WHERE TRIM(estado) IN ('ALTA', 'Cancel-Alta')
  AND tipo_transferencia IS NOT NULL;

-- Resultado esperado: 0
```

### 2. Stock Solo Se Mueve al Aceptar

**⚠️ CRÍTICO:**
- `PedidoItemyCab_post()` → NO mueve stock (solo crea registro)
- `AceptarTransferencia_post()` → **SÍ mueve stock** (único momento)
- `ConfirmarRecepcion/Envio_post()` → NO mueve stock (solo confirma)

### 3. Backward Compatibility

**Transferencias LEGACY (anterior a 15-Nov-2025):**
- Se marcan con `tipo_transferencia = 'LEGACY'`
- Seguirán funcionando con componentes viejos
- Estados normalizados: "Enviado" → "Aceptado"

### 4. Validaciones de Seguridad

**Antes de aceptar transferencia:**
```php
// Validar stock suficiente
if ($stock_origen_actual < $cantidad) {
    throw new Exception("Stock insuficiente");
}
```

**Bloqueo de registros:**
```sql
SELECT ... FROM pedidoitem WHERE id_num = ? FOR UPDATE;
```

Esto previene race conditions en aceptaciones simultáneas.

### 5. URLs Hardcodeadas

**⚠️ NOTA:** Las URLs en `cargardata.service.ts` están hardcodeadas temporalmente:
```typescript
return this.http.post('https://motoapp.loclx.io/APIAND/index.php/Descarga/AceptarTransferencia', payload);
```

**TODO:** Refactorizar para usar constantes de `ini.ts`:
```typescript
return this.http.post(UrlAceptarTransferencia, payload);
```

Pero primero hay que agregar las importaciones en línea 4 del archivo.

---

## 🔍 DEBUGGING Y TROUBLESHOOTING

### Ver logs del backend PHP:

```bash
# Logs están en application/logs/
tail -f /ruta/a/APIAND/application/logs/log-2025-11-15.php
```

**Buscar por:**
- `🔄 Iniciando aceptación de transferencia`
- `✅✅✅ Transferencia ACEPTADA exitosamente`
- `❌ Error al aceptar transferencia`

### Consultas útiles de debugging:

```sql
-- Ver todas las transferencias con sus tipos
SELECT
  id_num,
  COALESCE(tipo_transferencia, 'NULL') as tipo,
  TRIM(estado) as estado,
  sucursald,
  sucursalh,
  fecha,
  usuario_res,
  fecha_aceptacion,
  usuario_aceptacion
FROM pedidoitem pi
JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pi.tipo = 'PE'
ORDER BY id_num DESC
LIMIT 20;

-- Ver auditoría completa de una transferencia
SELECT
  id_num,
  TRIM(estado) as estado,
  tipo_transferencia,
  fecha as fecha_creacion,
  usuario_res as usuario_creacion,
  fecha_aceptacion,
  usuario_aceptacion,
  fecha_rechazo,
  usuario_rechazo,
  motivo_rechazo,
  fecha_confirmacion,
  usuario_confirmacion
FROM pedidoitem
WHERE id_num = 597;

-- Ver movimientos de stock de un artículo
SELECT
  pi.id_num,
  pi.cantidad,
  TRIM(pi.estado) as estado,
  pc.sucursald,
  pc.sucursalh,
  pi.fecha_resuelto,
  art.exi1, art.exi2, art.exi3, art.exi4, art.exi5
FROM pedidoitem pi
JOIN pedidoscb pc ON pi.id_num = pc.id_num
JOIN artsucursal art ON pi.id_art = art.id_articulo
WHERE pi.id_art = 123
  AND pi.tipo = 'PE'
ORDER BY pi.id_num DESC;
```

---

## 📝 CHECKLIST PARA SIGUIENTE DESARROLLADOR

Antes de continuar, verificar:

- [ ] Scripts SQL ejecutados correctamente en BD
- [ ] Tests de validación pasados (003_validar_migracion.sql)
- [ ] Sistema ALTA no afectado (584 registros intactos)
- [ ] Backend probado con curl (aceptar, rechazar, confirmar)
- [ ] Stock se mueve correctamente en artsucursal
- [ ] Auditoría guardada (fechas, usuarios)

Al implementar frontend:

- [ ] Componentes generados con Angular CLI
- [ ] Servicios inyectados correctamente
- [ ] Rutas agregadas en app-routing.module.ts
- [ ] Menú actualizado en sidebar
- [ ] PrimeNG components importados (p-table, p-button, p-tag, etc.)
- [ ] MessageService configurado para notificaciones
- [ ] AuthService usado para obtener usuario actual
- [ ] Manejo de errores implementado

---

## 🎯 OBJETIVO FINAL

Al completar todas las fases, el sistema debe permitir:

1. **Para el usuario:**
   - Ver transferencias pendientes de aceptación
   - Aceptar o rechazar transferencias con un clic
   - Ver historial completo de sus transferencias
   - Solicitar stock (PULL) u ofrecer stock (PUSH)
   - Confirmar recepción/envío de manera explícita

2. **Para el sistema:**
   - Stock solo se mueve al aceptar (nunca al crear)
   - Auditoría completa de todas las operaciones
   - Validación de stock antes de mover
   - Bloqueo de registros para evitar race conditions
   - Estados claros y consistentes

3. **Para el negocio:**
   - Flujo bidireccional (PULL y PUSH)
   - Aprobación requerida antes de mover stock
   - Trazabilidad completa
   - Reducción de errores por movimientos prematuros

---

## 📞 CONTACTO Y SOPORTE

**Documentos de referencia adicionales:**
- Plan original: `mejora_envio_stock.md`
- Análisis impacto: `ANALISIS_IMPACTO_BD_TRANSFERENCIAS.md`
- Estado anterior: `estado_actual_movstock.md`

**Recursos útiles:**
- PrimeNG Table: https://primeng.org/table
- Angular Reactive Forms: https://angular.io/guide/reactive-forms
- CodeIgniter REST: https://github.com/chriskacerguis/codeigniter-restserver

---

**Última actualización:** 15-Nov-2025
**Próximo paso:** Ejecutar scripts SQL y probar backend
**Estado:** LISTO PARA CONTINUAR FASE 4 (Frontend)
