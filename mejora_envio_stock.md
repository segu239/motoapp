# Plan de Mejora: Unificación y Optimización del Sistema de Transferencias de Stock

**Fecha de análisis:** 15 de Noviembre de 2025
**Tipo de cambio:** MEJORA ESTRUCTURAL - Opción B (Mejorada)
**Severidad:** MEDIA - Mejora de flujo y UX
**Estado:** PLANIFICACIÓN COMPLETA

---

## 📋 TABLA DE CONTENIDOS

1. [Análisis del Sistema Actual](#análisis-del-sistema-actual)
2. [Problemas Identificados](#problemas-identificados)
3. [Propuesta de Mejora](#propuesta-de-mejora)
4. [Análisis de Impacto y Riesgos](#análisis-de-impacto-y-riesgos)
5. [Plan de Implementación](#plan-de-implementación)
6. [Scripts de Migración](#scripts-de-migración)
7. [Plan de Testing](#plan-de-testing)
8. [Plan de Rollback](#plan-de-rollback)
9. [Checklist de Implementación](#checklist-de-implementación)

---

## 1. ANÁLISIS DEL SISTEMA ACTUAL

### 1.1 Estructura de Base de Datos

#### Tabla `pedidoitem`
```sql
Columnas principales (17 total):
- id_items (PK, serial): Identificador único
- id_num: Referencia a pedidoscb
- tipo (char 2): Tipo de movimiento ('PE' = Pedido de Stock)
- cantidad (numeric): Cantidad del artículo
- id_art (numeric): ID del artículo
- descripcion (char 80): Nombre del artículo
- precio (numeric): Precio unitario
- fecha_resuelto (date): Fecha de la operación
- usuario_res (char 50): Usuario que realiza la operación
- observacion (text): Observaciones
- estado (char 25): Estado del pedido
- motivo_cancelacion (text): Motivo si está cancelado
- fecha_cancelacion (date): Fecha de cancelación
- usuario_cancelacion (char 50): Usuario que canceló
- costo_total_1_fijo, costo_total_2_fijo, vcambio_fijo: Costos fijos
```

#### Tabla `pedidoscb`
```sql
Columnas principales (13 total):
- id_num (PK, serial): Identificador único del pedido
- numero (serial): Número autoincremental
- tipo (char 2): Tipo ('PE')
- sucursald (numeric): Sucursal origen/destino (según flujo)
- sucursalh (numeric): Sucursal destino/origen (según flujo)
- fecha (date): Fecha del pedido
- usuario (char 30): Usuario que crea
- observacion (text): Observaciones
- estado (char 25): Estado del pedido
- id_aso (numeric): ID asociado
- motivo_cancelacion, fecha_cancelacion, usuario_cancelacion
```

#### Tabla `artsucursal`
```sql
Campos de stock (5):
- exi1 (numeric): Stock Depósito (sucursal 4)
- exi2 (numeric): Stock Casa Central (sucursal 1)
- exi3 (numeric): Stock Valle Viejo (sucursal 2)
- exi4 (numeric): Stock Güemes (sucursal 3)
- exi5 (numeric): Stock Mayorista (sucursal 5)
```

**Mapeo Sucursal → Campo Stock:**
```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Depósito
    5 => 'exi5'  // Mayorista
];
```

### 1.2 Estados Actuales en Uso

**Análisis de estados en producción (últimos 30 días):**

| Estado | Cantidad | Uso | Descripción Actual |
|--------|----------|-----|-------------------|
| `ALTA` | 578 | 97.5% | Altas de existencias (NO es stock entre sucursales) |
| `Solicitado-E` | 1 | 0.2% | Solicitud enviada (pendiente recepción) |
| `Enviado` | 4 | 0.7% | Envío directo completado |
| `Recibido` | 4 | 0.7% | Recepción confirmada |
| `Cancelado` | 3 | 0.5% | Pedidos cancelados |
| `Cancel-Alta` | 6 | 1.0% | Cancelación de altas |

**⚠️ HALLAZGO IMPORTANTE:**
- El estado "Solicitado" NO aparece en la base de datos actual
- Esto confirma que el flujo de solicitud está roto o no se usa
- La mayoría de movimientos son "ALTA" (diferentes a transferencias entre sucursales)

### 1.3 Funciones Backend (PHP)

#### Archivo: `Descarga.php.txt`

| Función | Líneas | Propósito | Estado Actual |
|---------|--------|-----------|---------------|
| `PedidoItemyCab_post()` | 1568-1690 | Crear solicitud/envío | ✅ CORREGIDO (15-Nov) - Ya NO mueve stock |
| `PedidoItemyCabId_post()` | 1691-1888 | Confirmar recepción | ✅ CORREGIDO (14-Nov) - No duplica stock |
| `PedidoItemyCabIdEnvio_post()` | 1889-2166 | Enviar pedido | ✅ FUNCIONAL - Mueve stock correctamente |
| `CancelarPedidoStock_post()` | 2167-2350 | Cancelar pedido | ✅ CORREGIDO (14-Nov) - Revierte stock |

#### Archivo: `Carga.php.txt`

| Función | Líneas | Propósito |
|---------|--------|-----------|
| `PedidoItemsPorSucursal_post()` | 920-1056 | Obtener pedidos donde sucursal es ORIGEN (sucursald) |
| `PedidoItemsPorSucursalh_post()` | 1058-1194 | Obtener pedidos donde sucursal es DESTINO (sucursalh) |

### 1.4 Componentes Angular

#### Componentes Actuales

| Componente | Ruta | Propósito | Usa Backend |
|-----------|------|-----------|-------------|
| `pedir-stock` | `/pedir-stock` | Listar productos para solicitar | - |
| `stockproductopedido` | Modal | Crear SOLICITUD de stock | `PedidoItemyCab_post()` |
| `stockenvio` | `/stockenvio` | Listar productos para enviar | - |
| `stockproductoenvio` | Modal | Crear ENVÍO DIRECTO | `PedidoItemyCab_post()` ❌ ROTO |
| `stockpedido` | `/stockpedido` | Ver y recibir solicitudes propias | `PedidoItemsPorSucursal_post()` |
| `enviostockpendientes` | `/enviostockpendientes` | Ver y procesar solicitudes recibidas | `PedidoItemsPorSucursalh_post()` |
| `enviodestockrealizados` | `/enviodestockrealizados` | Historial de envíos realizados | `PedidoItemsPorSucursal_post()` |
| `stockrecibo` | `/stockrecibo` | Historial de recepciones | `PedidoItemsPorSucursalh_post()` |

#### Servicio Angular

**Archivo:** `src/app/services/cargardata.service.ts`

```typescript
// Funciones relacionadas con stock
crearPedidoStock(pedidoItem, pedidoscb)           // → PedidoItemyCab_post
crearPedidoStockId(id_num, pedidoItem, pedidoscb) // → PedidoItemyCabId_post
crearPedidoStockIdEnvio(id_num, pedidoItem, pedidoscb) // → PedidoItemyCabIdEnvio_post
cancelarPedidoStock(id_num, usuario, motivo, fecha) // → CancelarPedidoStock_post
obtenerPedidoItemPorSucursal(sucursal)           // → PedidoItemsPorSucursal_post
obtenerPedidoItemPorSucursalh(sucursal)          // → PedidoItemsPorSucursalh_post
```

---

## 2. PROBLEMAS IDENTIFICADOS

### 2.1 Problema Crítico: Envío Directo Roto

**Estado:** ❌ NO FUNCIONAL (desde 15-Nov-2025)

**Descripción:**
- El componente `stockproductoenvio` crea envíos con estado "Enviado"
- Usa `PedidoItemyCab_post()` que ya NO mueve stock (corregido hoy)
- Resultado: Pedidos registrados pero stock NO se mueve

**Impacto:**
- Flujo de envío directo completamente roto
- Inventario inconsistente si se usa

### 2.2 Problema de Diseño: Falta de Confirmación Bidireccional

**Estado:** ⚠️ DISEÑO SUBÓPTIMO

**Descripción:**
- El flujo de "envío directo" mueve stock sin confirmación del destinatario
- No hay posibilidad de rechazar un envío no solicitado
- Falta control sobre qué se recibe

**Problemas:**
1. Sucursal A envía → Stock se mueve inmediatamente
2. Sucursal B no tiene opción de aceptar/rechazar
3. Si fue un error, difícil de revertir
4. No hay auditoría de aceptaciones

### 2.3 Problema de Usabilidad: Componentes Duplicados

**Estado:** ⚠️ COMPLEJIDAD INNECESARIA

**Componentes duplicados:**
- `pedir-stock` + `stockenvio` (ambos listan productos)
- `stockpedido` + `enviostockpendientes` (ambos gestionan solicitudes)
- `enviodestockrealizados` + `stockrecibo` (ambos muestran historial)

**Impacto:**
- Usuarios confundidos sobre qué componente usar
- Más código para mantener
- Lógica duplicada

### 2.4 Problema de Semántica: sucursald vs sucursalh Confuso

**Estado:** ⚠️ INCONSISTENCIA SEMÁNTICA

**En Pedido de Stock:**
- `sucursald` = quien SOLICITA (destino del stock)
- `sucursalh` = quien debe ENVIAR (origen del stock)

**En Envío Directo:**
- `sucursald` = quien ENVÍA (origen del stock)
- `sucursalh` = quien RECIBE (destino del stock)

**Impacto:**
- Confusión en el código
- Errores al interpretar datos
- Dificulta mantenimiento

---

## 3. PROPUESTA DE MEJORA (Opción B - Mejorada)

### 3.1 Filosofía del Diseño

**Principios:**
1. ✅ **Confirmación Bidireccional:** Todas las transferencias requieren aceptación
2. ✅ **Claridad Semántica:** Diferenciar "Solicitar" (PULL) de "Ofrecer" (PUSH)
3. ✅ **Unificación de UI:** Componentes compartidos para operaciones similares
4. ✅ **Seguridad:** Stock solo se mueve con aceptación explícita
5. ✅ **Trazabilidad:** Auditoría completa de todas las acciones

### 3.2 Nuevos Estados Propuestos

| Estado | Descripción | ¿Mueve Stock? | Usado en |
|--------|-------------|---------------|----------|
| `Solicitado` | Solicitud de stock (PULL) | NO | Pedido de Stock |
| `Ofrecido` | Oferta de stock (PUSH) | NO | **NUEVO** - Envío de Stock |
| `Aceptado` | Destino aceptó | SÍ | **NUEVO** - Ambos flujos |
| `Rechazado` | Destino rechazó | NO | **NUEVO** - Ambos flujos |
| `Solicitado-E` | Solicitud enviada | - | Pedido de Stock (se renombra a "Aceptado") |
| `Enviado` | Envío completado | - | Se renombra a "Aceptado" |
| `Recibido` | Recepción confirmada | NO | Ambos flujos |
| `Cancelado` | Cancelado antes de aceptar | Revierte si necesario | Ambos flujos |

**Simplificación propuesta:**
- Eliminar "Solicitado-E" y "Enviado" → usar solo "Aceptado"
- Esto reduce confusión y mantiene semántica clara

### 3.3 Flujos Propuestos

#### FLUJO 1: Solicitar Stock (PULL - Casa Central necesita)

```
PASO 1: SOLICITAR
Componente: /solicitar-stock (renombrar pedir-stock)
Usuario: Casa Central
Acción: Selecciona artículo → Solicita a Depósito

Backend: PedidoItemyCab_post()
Datos:
  estado: "Solicitado"
  tipo_transferencia: "PULL" (nuevo campo)
  sucursald: 1 (Casa Central - quien solicita)
  sucursalh: 4 (Depósito - a quien se solicita)
Stock: SIN CAMBIOS ✅
Mensaje: "Solicitud creada. Pendiente de aprobación del Depósito."

---------------------------------------

PASO 2: VER SOLICITUD (Depósito)
Componente: /transferencias-pendientes (NUEVO - unificado)
Usuario: Depósito
Visualiza: "Solicitud de Casa Central por 100 unidades de Art X"
Opciones: [Aceptar y Enviar] [Rechazar]

---------------------------------------

PASO 3A: ACEPTAR Y ENVIAR
Componente: /transferencias-pendientes
Usuario: Depósito → Click en "Aceptar y Enviar"

Backend: AceptarTransferencia_post() (NUEVA función)
Operaciones:
  1. Validar stock disponible
  2. Actualizar estado a "Aceptado"
  3. MOVER STOCK:
     - Depósito (exi1): -100
     - Casa Central (exi2): +100
  4. Registrar usuario y fecha de aceptación

Datos actualizados:
  estado: "Solicitado" → "Aceptado"
  fecha_aceptacion: hoy
  usuario_aceptacion: usuario_deposito

Stock: SE MUEVE ✅
Mensaje Depósito: "Solicitud aceptada y stock enviado."
Notificación Casa Central: "Tu solicitud fue aceptada y enviada."

---------------------------------------

PASO 3B: RECHAZAR
Componente: /transferencias-pendientes
Usuario: Depósito → Click en "Rechazar"

Backend: RechazarTransferencia_post() (NUEVA función)
Operaciones:
  1. Actualizar estado a "Rechazado"
  2. Registrar motivo de rechazo
  3. NO mover stock

Datos actualizados:
  estado: "Solicitado" → "Rechazado"
  fecha_rechazo: hoy
  usuario_rechazo: usuario_deposito
  motivo_rechazo: "Stock insuficiente"

Stock: SIN CAMBIOS ✅
Mensaje Depósito: "Solicitud rechazada."
Notificación Casa Central: "Tu solicitud fue rechazada: Stock insuficiente"

---------------------------------------

PASO 4: CONFIRMAR RECEPCIÓN (Casa Central)
Componente: /mis-transferencias (NUEVO - unificado)
Usuario: Casa Central
Visualiza: "Aceptado y enviado por Depósito (pendiente confirmación)"
Opción: [Confirmar Recepción]

Backend: ConfirmarRecepcion_post() (NUEVA función)
Operaciones:
  1. Actualizar estado a "Recibido"
  2. Registrar fecha y usuario de recepción
  3. NO mover stock (ya se movió al aceptar)

Datos actualizados:
  estado: "Aceptado" → "Recibido"
  fecha_recepcion: hoy
  usuario_recepcion: usuario_casa_central

Stock: SIN CAMBIOS ✅ (ya se movió en Paso 3A)
Mensaje: "Recepción confirmada. Transferencia completada."
```

#### FLUJO 2: Ofrecer Stock (PUSH - Valle Viejo tiene exceso)

```
PASO 1: OFRECER
Componente: /ofrecer-stock (renombrar stockenvio)
Usuario: Valle Viejo
Acción: Selecciona artículo → Ofrece a Casa Central

Backend: PedidoItemyCab_post()
Datos:
  estado: "Ofrecido"
  tipo_transferencia: "PUSH" (nuevo campo)
  sucursald: 2 (Valle Viejo - quien ofrece)
  sucursalh: 1 (Casa Central - a quien se ofrece)
Stock: SIN CAMBIOS ✅
Mensaje: "Oferta creada. Pendiente de aceptación de Casa Central."

---------------------------------------

PASO 2: VER OFERTA (Casa Central)
Componente: /transferencias-pendientes (mismo componente unificado)
Usuario: Casa Central
Visualiza: "Oferta de Valle Viejo: 50 unidades de Art Y"
Opciones: [Aceptar] [Rechazar]

---------------------------------------

PASO 3A: ACEPTAR OFERTA
Componente: /transferencias-pendientes
Usuario: Casa Central → Click en "Aceptar"

Backend: AceptarTransferencia_post() (misma función que Flujo 1)
Operaciones:
  1. Validar stock disponible en Valle Viejo
  2. Actualizar estado a "Aceptado"
  3. MOVER STOCK:
     - Valle Viejo (exi3): -50
     - Casa Central (exi2): +50
  4. Registrar usuario y fecha de aceptación

Datos actualizados:
  estado: "Ofrecido" → "Aceptado"
  fecha_aceptacion: hoy
  usuario_aceptacion: usuario_casa_central

Stock: SE MUEVE ✅
Mensaje Casa Central: "Oferta aceptada. Stock transferido."
Notificación Valle Viejo: "Tu oferta fue aceptada."

---------------------------------------

PASO 3B: RECHAZAR OFERTA
Componente: /transferencias-pendientes
Usuario: Casa Central → Click en "Rechazar"

Backend: RechazarTransferencia_post() (misma función)
Operaciones:
  1. Actualizar estado a "Rechazado"
  2. Registrar motivo de rechazo
  3. NO mover stock

Datos actualizados:
  estado: "Ofrecido" → "Rechazado"
  fecha_rechazo: hoy
  usuario_rechazo: usuario_casa_central
  motivo_rechazo: "No necesitamos ese producto"

Stock: SIN CAMBIOS ✅
Mensaje Casa Central: "Oferta rechazada."
Notificación Valle Viejo: "Tu oferta fue rechazada: No necesitamos ese producto"

---------------------------------------

PASO 4: CONFIRMAR ENVÍO (Valle Viejo)
Componente: /mis-transferencias
Usuario: Valle Viejo
Visualiza: "Aceptado por Casa Central (pendiente confirmación de envío)"
Opción: [Confirmar Envío]

Backend: ConfirmarEnvio_post() (NUEVA función)
Operaciones:
  1. Actualizar estado a "Recibido"
  2. Registrar fecha y usuario de confirmación
  3. NO mover stock (ya se movió al aceptar)

Datos actualizados:
  estado: "Aceptado" → "Recibido"
  fecha_confirmacion_envio: hoy
  usuario_confirmacion: usuario_valle_viejo

Stock: SIN CAMBIOS ✅ (ya se movió en Paso 3A)
Mensaje: "Envío confirmado. Transferencia completada."
```

### 3.4 Componentes Propuestos

#### Componentes NUEVOS

**1. `/transferencias-pendientes` (NUEVO - unificado)**
```
Propósito: Ver y procesar transferencias pendientes de MI SUCURSAL

Visualiza:
- Solicitudes recibidas (donde mi sucursal es sucursalh)
  Estado: "Solicitado"
  Acciones: [Aceptar y Enviar] [Rechazar]

- Ofertas recibidas (donde mi sucursal es sucursalh)
  Estado: "Ofrecido"
  Acciones: [Aceptar] [Rechazar]

Filtros:
- Por tipo: Solicitudes / Ofertas / Todas
- Por estado: Pendientes / Aceptadas / Rechazadas
- Por fecha
- Por artículo

Backend:
- obtenerPedidoItemPorSucursalh(sucursal)
- Filtra: estado IN ('Solicitado', 'Ofrecido')

Funciones:
- aceptarTransferencia(id_num)
- rechazarTransferencia(id_num, motivo)
```

**2. `/mis-transferencias` (NUEVO - unificado)**
```
Propósito: Ver y confirmar transferencias INICIADAS por MI SUCURSAL

Visualiza:
- Mis solicitudes (donde mi sucursal es sucursald)
  Estados: "Solicitado", "Aceptado", "Rechazado", "Recibido"
  Acciones según estado:
    - "Solicitado": [Cancelar]
    - "Aceptado": [Confirmar Recepción]
    - "Rechazado": Ver motivo
    - "Recibido": Ver detalles

- Mis ofertas (donde mi sucursal es sucursald)
  Estados: "Ofrecido", "Aceptado", "Rechazado", "Recibido"
  Acciones según estado:
    - "Ofrecido": [Cancelar]
    - "Aceptado": [Confirmar Envío]
    - "Rechazado": Ver motivo
    - "Recibido": Ver detalles

Filtros:
- Por tipo: Solicitudes / Ofertas / Todas
- Por estado
- Por fecha
- Por artículo

Backend:
- obtenerPedidoItemPorSucursal(sucursal)

Funciones:
- confirmarRecepcion(id_num) // Para solicitudes aceptadas
- confirmarEnvio(id_num) // Para ofertas aceptadas
- cancelarTransferencia(id_num, motivo)
```

#### Componentes RENOMBRADOS

| Actual | Nuevo | Cambios |
|--------|-------|---------|
| `pedir-stock` | `solicitar-stock` | Renombrar componente y ruta |
| `stockproductopedido` | `modal-solicitar-stock` | Renombrar + actualizar lógica |
| `stockenvio` | `ofrecer-stock` | Renombrar componente y ruta |
| `stockproductoenvio` | `modal-ofrecer-stock` | Renombrar + actualizar lógica |

#### Componentes ELIMINADOS

| Componente | Motivo | Reemplazado por |
|-----------|--------|-----------------|
| `enviostockpendientes` | Duplicado | `/transferencias-pendientes` |
| `stockpedido` | Duplicado | `/mis-transferencias` |
| `enviodestockrealizados` | Duplicado | `/historial-transferencias` (opcional) |
| `stockrecibo` | Duplicado | `/historial-transferencias` (opcional) |

#### Componente OPCIONAL

**3. `/historial-transferencias`**
```
Propósito: Ver historial completo de transferencias

Visualiza:
- Todas las transferencias completadas (estado "Recibido")
- Filtros avanzados
- Exportación a Excel
- Gráficos de movimientos

Backend:
- obtenerPedidoItemPorSucursal(sucursal)
- obtenerPedidoItemPorSucursalh(sucursal)
- Filtra: estado = 'Recibido'
```

### 3.5 Estructura del Menú Propuesta

```
MENÚ: Stock
├── 📥 Solicitar Stock (renombrado de pedir-stock)
│   └─> Componente: solicitar-stock
│       Modal: modal-solicitar-stock
│       "Necesito stock de otra sucursal"
│
├── 📤 Ofrecer Stock (renombrado de stockenvio)
│   └─> Componente: ofrecer-stock
│       Modal: modal-ofrecer-stock
│       "Tengo exceso de stock para ofrecer"
│
├── 📬 Transferencias Pendientes (NUEVO)
│   └─> Componente: transferencias-pendientes
│       Muestra:
│       - Solicitudes recibidas (para aceptar/rechazar y enviar)
│       - Ofertas recibidas (para aceptar/rechazar)
│       "Procesar solicitudes y ofertas recibidas"
│
├── ✅ Mis Transferencias (NUEVO)
│   └─> Componente: mis-transferencias
│       Muestra:
│       - Mis solicitudes (para confirmar recepción)
│       - Mis ofertas (para confirmar envío)
│       "Seguimiento de mis transferencias"
│
└── 📊 Historial (OPCIONAL - mantener o unificar)
    ├─> Componente: historial-transferencias (NUEVO - opcional)
    └─> "Ver historial completo de transferencias"
```

---

## 4. ANÁLISIS DE IMPACTO Y RIESGOS

### 4.1 Cambios en Base de Datos

#### Nuevo Campo en `pedidoitem` y `pedidoscb`

```sql
ALTER TABLE pedidoitem
ADD COLUMN tipo_transferencia VARCHAR(10);

ALTER TABLE pedidoscb
ADD COLUMN tipo_transferencia VARCHAR(10);

COMMENT ON COLUMN pedidoitem.tipo_transferencia IS
'Tipo de transferencia: PULL (solicitud), PUSH (oferta)';
```

**Valores:**
- `'PULL'`: Solicitud de stock (destino pide a origen)
- `'PUSH'`: Oferta de stock (origen ofrece a destino)
- `NULL`: Transferencias anteriores (compatibilidad)

#### Nuevos Campos para Auditoría

```sql
ALTER TABLE pedidoitem
ADD COLUMN fecha_aceptacion DATE,
ADD COLUMN usuario_aceptacion VARCHAR(50),
ADD COLUMN fecha_rechazo DATE,
ADD COLUMN usuario_rechazo VARCHAR(50),
ADD COLUMN motivo_rechazo TEXT,
ADD COLUMN fecha_confirmacion DATE,
ADD COLUMN usuario_confirmacion VARCHAR(50);

ALTER TABLE pedidoscb
ADD COLUMN fecha_aceptacion DATE,
ADD COLUMN usuario_aceptacion VARCHAR(50),
ADD COLUMN fecha_rechazo DATE,
ADD COLUMN usuario_rechazo VARCHAR(50),
ADD COLUMN motivo_rechazo TEXT,
ADD COLUMN fecha_confirmacion DATE,
ADD COLUMN usuario_confirmacion VARCHAR(50);
```

### 4.2 Compatibilidad con Datos Existentes

**Estados actuales en producción:**
- `ALTA` (578): No afectado (es otro tipo de operación)
- `Enviado` (4): Se mapean a "Aceptado"
- `Recibido` (4): Mantener
- `Cancelado` (3): Mantener
- `Solicitado-E` (1): Se mapea a "Aceptado"

**Script de migración:**
```sql
-- Marcar transferencias antiguas
UPDATE pedidoitem
SET tipo_transferencia = 'LEGACY'
WHERE tipo = 'PE'
  AND estado NOT IN ('ALTA', 'Cancel-Alta')
  AND tipo_transferencia IS NULL;

-- Normalizar estados
UPDATE pedidoitem
SET estado = 'Aceptado'
WHERE tipo = 'PE'
  AND estado IN ('Enviado', 'Solicitado-E');

UPDATE pedidoscb
SET estado = 'Aceptado'
WHERE tipo = 'PE'
  AND estado IN ('Enviado', 'Solicitado-E');
```

### 4.3 Impacto en Funciones Backend

#### Funciones que PERMANECEN (compatibilidad)

- `PedidoItemyCab_post()`: Crear solicitud/oferta
- `PedidoItemsPorSucursal_post()`: Consultar (sucursald)
- `PedidoItemsPorSucursalh_post()`: Consultar (sucursalh)

#### Funciones NUEVAS (a crear)

- `AceptarTransferencia_post()`: Aceptar solicitud/oferta y mover stock
- `RechazarTransferencia_post()`: Rechazar solicitud/oferta
- `ConfirmarRecepcion_post()`: Confirmar recepción (Flujo PULL)
- `ConfirmarEnvio_post()`: Confirmar envío (Flujo PUSH)

#### Funciones MODIFICADAS

- `PedidoItemyCab_post()`: Agregar campo `tipo_transferencia`
- `CancelarPedidoStock_post()`: Validar estado permitido para cancelar

#### Funciones que SE ELIMINAN

- Ninguna (mantener compatibilidad)

### 4.4 Impacto en Componentes Angular

#### Componentes NUEVOS (a crear)

- `transferencias-pendientes.component.ts`
- `mis-transferencias.component.ts`
- `historial-transferencias.component.ts` (opcional)

#### Componentes RENOMBRADOS

- `pedir-stock` → `solicitar-stock`
- `stockproductopedido` → `modal-solicitar-stock`
- `stockenvio` → `ofrecer-stock`
- `stockproductoenvio` → `modal-ofrecer-stock`

#### Componentes DEPRECADOS (no eliminar, ocultar del menú)

- `enviostockpendientes` (puede mantenerse hidden para emergencias)
- `stockpedido` (puede mantenerse hidden)
- `enviodestockrealizados` (puede mantenerse hidden)
- `stockrecibo` (puede mantenerse hidden)

**Estrategia:**
- NO eliminar componentes antiguos inmediatamente
- Ocultarlos del menú
- Mantenerlos accesibles por URL directa
- Después de 30 días sin uso, eliminar

### 4.5 Riesgos Identificados

| Riesgo | Severidad | Probabilidad | Mitigación |
|--------|-----------|--------------|------------|
| Usuarios confundidos por cambios en menú | Media | Alta | Capacitación + documentación |
| Datos históricos mal interpretados | Baja | Media | Script de migración + comentarios en DB |
| Componentes antiguos usados por error | Media | Baja | Ocultar pero mantener + notificación |
| Problemas en producción al desplegar | Alta | Baja | Despliegue gradual + rollback preparado |
| Stock inconsistente durante migración | Alta | Media | Modo mantenimiento durante migración |
| Nuevos bugs en lógica de aceptación | Media | Media | Testing exhaustivo + QA |

### 4.6 Análisis de Reversibilidad

**¿Se puede revertir fácilmente?**
- ✅ Backend: SÍ (mantener funciones antiguas)
- ✅ Base de Datos: SÍ (nuevos campos nullable, estados compatibles)
- ✅ Frontend: SÍ (componentes antiguos ocultos pero funcionales)
- ⚠️ Datos creados con nuevo flujo: Requiere script de reversión

**Plan de Rollback:**
1. Restaurar menú antiguo
2. Ocultar componentes nuevos
3. Reactivar componentes antiguos
4. Datos: Mantener (compatibles con ambos sistemas)

---

## 5. PLAN DE IMPLEMENTACIÓN

### 5.1 Fases de Implementación

#### FASE 1: Preparación de Base de Datos (2 horas)

**Objetivos:**
- Agregar nuevos campos
- Migrar estados existentes
- Validar integridad de datos

**Tareas:**
1. ✅ Backup completo de base de datos
2. ✅ Ejecutar script de alteración de tablas
3. ✅ Ejecutar script de migración de estados
4. ✅ Validar datos migrados
5. ✅ Crear índices si es necesario

**Entregables:**
- Script SQL de alteración
- Script SQL de migración
- Script SQL de validación
- Reporte de datos migrados

---

#### FASE 2: Backend - Nuevas Funciones (8-10 horas)

**Objetivos:**
- Crear funciones nuevas
- Modificar funciones existentes
- Testing de funciones

**Tareas:**

**2.1. Crear `AceptarTransferencia_post()` (3 horas)**
```php
Operaciones:
1. Validar parámetros (id_num, usuario)
2. Obtener datos del pedido con FOR UPDATE
3. Validar estado actual (debe ser "Solicitado" o "Ofrecido")
4. Validar stock disponible en origen
5. Mover stock (origen -cantidad, destino +cantidad)
6. Actualizar estado a "Aceptado"
7. Registrar fecha_aceptacion y usuario_aceptacion
8. Commit transacción
9. Retornar respuesta con detalles

Validaciones:
- id_num existe
- Estado permitido
- Stock suficiente
- Sucursales válidas
- No duplicados (409 Conflict)

Logs:
- Registrar aceptación en logs
- Auditoría de movimiento de stock
```

**2.2. Crear `RechazarTransferencia_post()` (2 horas)**
```php
Operaciones:
1. Validar parámetros (id_num, usuario, motivo_rechazo)
2. Obtener datos del pedido con FOR UPDATE
3. Validar estado actual (debe ser "Solicitado" o "Ofrecido")
4. Actualizar estado a "Rechazado"
5. Registrar fecha_rechazo, usuario_rechazo, motivo_rechazo
6. NO mover stock
7. Commit transacción
8. Retornar respuesta

Validaciones:
- id_num existe
- Estado permitido
- Motivo no vacío
- No duplicados
```

**2.3. Crear `ConfirmarRecepcion_post()` (2 horas)**
```php
Operaciones:
1. Validar parámetros (id_num, usuario)
2. Obtener datos del pedido
3. Validar estado actual (debe ser "Aceptado")
4. Validar que es flujo PULL (tipo_transferencia = 'PULL')
5. Actualizar estado a "Recibido"
6. Registrar fecha_confirmacion y usuario_confirmacion
7. NO mover stock (ya se movió al aceptar)
8. Retornar respuesta

Validaciones:
- Estado = "Aceptado"
- tipo_transferencia = 'PULL'
- Solo puede confirmar el solicitante (sucursald)
```

**2.4. Crear `ConfirmarEnvio_post()` (2 horas)**
```php
Operaciones:
1. Validar parámetros (id_num, usuario)
2. Obtener datos del pedido
3. Validar estado actual (debe ser "Aceptado")
4. Validar que es flujo PUSH (tipo_transferencia = 'PUSH')
5. Actualizar estado a "Recibido"
6. Registrar fecha_confirmacion y usuario_confirmacion
7. NO mover stock (ya se movió al aceptar)
8. Retornar respuesta

Validaciones:
- Estado = "Aceptado"
- tipo_transferencia = 'PUSH'
- Solo puede confirmar el ofertante (sucursald)
```

**2.5. Modificar `PedidoItemyCab_post()` (1 hora)**
```php
Cambios:
1. Agregar parámetro opcional: tipo_transferencia
2. Validar tipo_transferencia ('PULL' o 'PUSH')
3. Almacenar tipo_transferencia en ambas tablas
4. Actualizar mensaje de respuesta según tipo

Estados permitidos:
- PULL → estado: "Solicitado"
- PUSH → estado: "Ofrecido"
```

**2.6. Modificar `CancelarPedidoStock_post()` (1 hora)**
```php
Cambios:
1. Validar estados permitidos para cancelar:
   - "Solicitado" ✅
   - "Ofrecido" ✅
   - "Aceptado" ❌ (ya se movió stock, usar RechazarTransferencia)
   - "Recibido" ❌ (completado)
   - "Rechazado" ❌ (ya está cerrado)

2. Mantener lógica de reversión de stock existente
```

**Entregables:**
- 4 funciones nuevas en Descarga.php.txt
- 2 funciones modificadas
- Tests unitarios de cada función
- Documentación de API

---

#### FASE 3: Backend - Actualizar Servicio Angular (2 horas)

**Objetivo:**
- Agregar nuevas funciones en el servicio
- Mantener funciones existentes

**Archivo:** `src/app/services/cargardata.service.ts`

**Nuevas funciones:**
```typescript
// Aceptar transferencia (solicitud u oferta)
aceptarTransferencia(id_num: number, usuario: string): Observable<any> {
  return this.http.post(UrlAceptarTransferencia, {
    id_num: id_num,
    usuario: usuario
  });
}

// Rechazar transferencia
rechazarTransferencia(
  id_num: number,
  usuario: string,
  motivo_rechazo: string
): Observable<any> {
  return this.http.post(UrlRechazarTransferencia, {
    id_num: id_num,
    usuario: usuario,
    motivo_rechazo: motivo_rechazo
  });
}

// Confirmar recepción (flujo PULL)
confirmarRecepcion(id_num: number, usuario: string): Observable<any> {
  return this.http.post(UrlConfirmarRecepcion, {
    id_num: id_num,
    usuario: usuario
  });
}

// Confirmar envío (flujo PUSH)
confirmarEnvio(id_num: number, usuario: string): Observable<any> {
  return this.http.post(UrlConfirmarEnvio, {
    id_num: id_num,
    usuario: usuario
  });
}
```

**Modificar función existente:**
```typescript
// Agregar parámetro tipo_transferencia
crearPedidoStock(
  pedidoItem: any,
  pedidoscb: any,
  tipo_transferencia: 'PULL' | 'PUSH'
): Observable<any> {
  return this.http.post(UrlPedidoItemyCab, {
    pedidoItem: { ...pedidoItem, tipo_transferencia },
    pedidoscb: { ...pedidoscb, tipo_transferencia }
  });
}
```

**Actualizar archivo de URLs:**
```typescript
// src/app/config/ini.ts
export const UrlAceptarTransferencia = urlBase + 'AceptarTransferencia_post';
export const UrlRechazarTransferencia = urlBase + 'RechazarTransferencia_post';
export const UrlConfirmarRecepcion = urlBase + 'ConfirmarRecepcion_post';
export const UrlConfirmarEnvio = urlBase + 'ConfirmarEnvio_post';
```

**Entregables:**
- Servicio actualizado
- URLs configuradas
- Tipado TypeScript actualizado

---

#### FASE 4: Frontend - Componentes Nuevos (12-16 horas)

**4.1. Crear `transferencias-pendientes.component.ts` (6-8 horas)**

**Estructura:**
```typescript
export class TransferenciasPendientesComponent implements OnInit {
  sucursal: number;
  usuario: string;
  transferencias: any[] = [];
  filtroTipo: 'todas' | 'solicitudes' | 'ofertas' = 'todas';
  filtroEstado: 'pendientes' | 'procesadas' | 'todas' = 'pendientes';

  // Totalizadores
  totalizadores = {
    cantidad_total: 0,
    precio_total: 0,
    items_seleccionados: 0
  };

  ngOnInit() {
    this.cargarTransferenciasPendientes();
  }

  cargarTransferenciasPendientes() {
    this._cargardata.obtenerPedidoItemPorSucursalh(this.sucursal)
      .subscribe(data => {
        this.transferencias = data.mensaje.filter(item =>
          item.estado === 'Solicitado' || item.estado === 'Ofrecido'
        );
        this.aplicarFiltros();
      });
  }

  aceptarTransferencia(item: any) {
    // Validaciones
    // Confirmación con SweetAlert2
    // Llamar a servicio
    this._cargardata.aceptarTransferencia(item.id_num, this.usuario)
      .subscribe({
        next: (response) => {
          Swal.fire('Éxito', 'Transferencia aceptada y stock movido', 'success');
          this.cargarTransferenciasPendientes();
        },
        error: (err) => {
          Swal.fire('Error', err.error?.mensaje, 'error');
        }
      });
  }

  rechazarTransferencia(item: any) {
    // Modal para ingresar motivo
    Swal.fire({
      title: 'Rechazar Transferencia',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Ingrese el motivo...',
      showCancelButton: true
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this._cargardata.rechazarTransferencia(
          item.id_num,
          this.usuario,
          result.value
        ).subscribe({
          next: (response) => {
            Swal.fire('Rechazado', 'Transferencia rechazada', 'success');
            this.cargarTransferenciasPendientes();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.mensaje, 'error');
          }
        });
      }
    });
  }

  aplicarFiltros() {
    let resultado = this.transferencias;

    // Filtro por tipo
    if (this.filtroTipo === 'solicitudes') {
      resultado = resultado.filter(item => item.estado === 'Solicitado');
    } else if (this.filtroTipo === 'ofertas') {
      resultado = resultado.filter(item => item.estado === 'Ofrecido');
    }

    // Filtro por estado
    // ... aplicar otros filtros

    // Actualizar lista filtrada
    // Actualizar totalizadores
  }

  // Protección contra doble procesamiento
  private procesando = false;
  private readonly TIEMPO_MINIMO_ENTRE_OPERACIONES = 2000;
}
```

**HTML:**
```html
<p-table [value]="transferencias" [paginator]="true" [rows]="10">
  <ng-template pTemplate="header">
    <tr>
      <th>Tipo</th>
      <th>Artículo</th>
      <th>Cantidad</th>
      <th>Sucursal</th>
      <th>Usuario</th>
      <th>Fecha</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr>
  </ng-template>
  <ng-template pTemplate="body" let-item>
    <tr>
      <td>
        <span class="badge" [ngClass]="item.estado === 'Solicitado' ? 'bg-blue' : 'bg-green'">
          {{ item.estado === 'Solicitado' ? 'Solicitud' : 'Oferta' }}
        </span>
      </td>
      <td>{{ item.descripcion }}</td>
      <td>{{ item.cantidad }}</td>
      <td>{{ getSucursalNombre(item.sucursald) }}</td>
      <td>{{ item.usuario_res }}</td>
      <td>{{ item.fecha_resuelto | date }}</td>
      <td>{{ item.estado }}</td>
      <td>
        <button pButton label="Aceptar" class="p-button-success"
                (click)="aceptarTransferencia(item)"></button>
        <button pButton label="Rechazar" class="p-button-danger"
                (click)="rechazarTransferencia(item)"></button>
      </td>
    </tr>
  </ng-template>
</p-table>

<!-- Panel de totalizadores -->
<app-totalizadores-panel
  [totalizadores]="totalizadores"
  [mostrarConversion]="true">
</app-totalizadores-panel>
```

**4.2. Crear `mis-transferencias.component.ts` (6-8 horas)**

Estructura similar a transferencias-pendientes pero:
- Filtra por sucursald (mis transferencias iniciadas)
- Muestra todos los estados
- Acciones: Confirmar Recepción/Envío, Cancelar, Ver detalles

---

#### FASE 5: Frontend - Renombrar y Actualizar Componentes (4-6 horas)

**5.1. Renombrar componentes (2 horas)**

```bash
# Renombrar directorios
mv src/app/components/pedir-stock src/app/components/solicitar-stock
mv src/app/components/stockproductopedido src/app/components/modal-solicitar-stock
mv src/app/components/stockenvio src/app/components/ofrecer-stock
mv src/app/components/stockproductoenvio src/app/components/modal-ofrecer-stock

# Actualizar nombres de clases en archivos .ts
# Actualizar selectores en archivos .ts
# Actualizar imports en app-routing.module.ts
```

**5.2. Actualizar modales (2-3 horas)**

**modal-solicitar-stock.component.ts:**
```typescript
comprar(event: Event) {
  const pedidoItem: PedidoItem = {
    // ... campos existentes ...
    estado: "Solicitado",
    sucursald: Number(this.sucursal),  // Quien solicita
    sucursalh: this.selectedSucursal   // A quien solicita
  };

  const pedidoscb: any = {
    // ... campos existentes ...
    estado: "Solicitado"
  };

  // CAMBIO: Agregar tipo_transferencia
  this.cargardata.crearPedidoStock(pedidoItem, pedidoscb, 'PULL')
    .subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Solicitud creada',
          text: `Se solicitaron ${this.cantidad} unidades. Pendiente de aprobación.`
        });
        this.ref.close({ success: true });
      },
      error: (err) => {
        Swal.fire('Error', err.error?.mensaje, 'error');
      }
    });
}
```

**modal-ofrecer-stock.component.ts:**
```typescript
comprar(event: Event) {
  // Validar stock disponible ANTES de ofrecer
  const stockActual = this.producto[`exi${this.sucursal}`];
  if (stockActual < this.cantidad) {
    Swal.fire({
      icon: 'error',
      title: 'Stock insuficiente',
      text: `Solo tienes ${stockActual} unidades disponibles`
    });
    return;
  }

  const pedidoItem: PedidoItem = {
    // ... campos existentes ...
    estado: "Ofrecido",
    sucursald: Number(this.sucursal),  // Quien ofrece
    sucursalh: this.selectedSucursal   // A quien ofrece
  };

  const pedidoscb: any = {
    // ... campos existentes ...
    estado: "Ofrecido"
  };

  // CAMBIO: Agregar tipo_transferencia
  this.cargardata.crearPedidoStock(pedidoItem, pedidoscb, 'PUSH')
    .subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Oferta creada',
          text: `Se ofrecieron ${this.cantidad} unidades. Pendiente de aceptación.`
        });
        this.ref.close({ success: true });
      },
      error: (err) => {
        Swal.fire('Error', err.error?.mensaje, 'error');
      }
    });
}
```

---

#### FASE 6: Frontend - Actualizar Menú y Rutas (2 horas)

**6.1. Actualizar app-routing.module.ts**

```typescript
const routes: Routes = [
  // ... otras rutas ...
  {
    path: 'pages',
    component: PagesComponent,
    children: [
      // NUEVAS RUTAS
      { path: 'solicitar-stock', component: SolicitarStockComponent },
      { path: 'ofrecer-stock', component: OfrecerStockComponent },
      { path: 'transferencias-pendientes', component: TransferenciasPendientesComponent },
      { path: 'mis-transferencias', component: MisTransferenciasComponent },

      // RUTAS DEPRECADAS (mantener temporalmente, ocultas del menú)
      { path: 'pedir-stock', component: SolicitarStockComponent }, // redirect
      { path: 'stockenvio', component: OfrecerStockComponent }, // redirect
      { path: 'enviostockpendientes', component: EnviostockpendientesComponent }, // hidden
      { path: 'stockpedido', component: StockpedidoComponent }, // hidden

      // ... otras rutas ...
    ]
  }
];
```

**6.2. Actualizar sidebar.component.ts y sidebar.component.html**

```typescript
menuItems = [
  {
    label: 'Stock',
    icon: 'pi pi-box',
    items: [
      {
        label: 'Solicitar Stock',
        icon: 'pi pi-download',
        routerLink: '/pages/solicitar-stock',
        badge: 'PULL'
      },
      {
        label: 'Ofrecer Stock',
        icon: 'pi pi-upload',
        routerLink: '/pages/ofrecer-stock',
        badge: 'PUSH'
      },
      {
        label: 'Transferencias Pendientes',
        icon: 'pi pi-inbox',
        routerLink: '/pages/transferencias-pendientes',
        badge: () => this.contarPendientes() // contador dinámico
      },
      {
        label: 'Mis Transferencias',
        icon: 'pi pi-list',
        routerLink: '/pages/mis-transferencias'
      },
      { separator: true },
      {
        label: 'Historial',
        icon: 'pi pi-history',
        routerLink: '/pages/historial-transferencias'
      }
    ]
  }
];

contarPendientes(): number {
  // Lógica para contar transferencias pendientes
  // Puede usar un servicio compartido que se actualice periódicamente
  return this.transferenciasService.getPendientesCount();
}
```

---

#### FASE 7: Testing Completo (8-12 horas)

**7.1. Testing Backend (4-6 horas)**

**Tests unitarios:**
```php
// Test 1: Aceptar solicitud mueve stock correctamente
function test_aceptar_solicitud_pull() {
  // Crear solicitud
  // Obtener stock inicial
  // Aceptar solicitud
  // Verificar stock final
  // Verificar estado = "Aceptado"
}

// Test 2: Rechazar solicitud NO mueve stock
function test_rechazar_solicitud_no_mueve_stock() {
  // Crear solicitud
  // Obtener stock inicial
  // Rechazar solicitud
  // Verificar stock sin cambios
  // Verificar estado = "Rechazado"
}

// Test 3: Confirmar recepción NO mueve stock
function test_confirmar_recepcion_no_mueve_stock() {
  // Crear y aceptar solicitud
  // Obtener stock después de aceptar
  // Confirmar recepción
  // Verificar stock sin cambios
  // Verificar estado = "Recibido"
}

// Test 4: Flujo PUSH completo
function test_flujo_push_completo() {
  // Crear oferta
  // Verificar stock sin cambios
  // Aceptar oferta
  // Verificar stock movido
  // Confirmar envío
  // Verificar stock sin cambios adicionales
  // Verificar estado = "Recibido"
}

// Test 5: No se puede aceptar dos veces
function test_no_duplicar_aceptacion() {
  // Crear solicitud
  // Aceptar
  // Intentar aceptar nuevamente
  // Verificar error 409 Conflict
  // Verificar stock no se movió dos veces
}

// Test 6: Validación de stock insuficiente
function test_validar_stock_insuficiente() {
  // Crear solicitud de 1000 unidades
  // Stock disponible: 500 unidades
  // Intentar aceptar
  // Verificar error 400 Bad Request
  // Verificar stock sin cambios
}
```

**7.2. Testing Frontend (4-6 horas)**

**Tests E2E:**
```typescript
// Test 1: Flujo completo de solicitud
describe('Flujo PULL - Solicitar Stock', () => {
  it('debería crear solicitud, aceptar y confirmar recepción', () => {
    // 1. Login como Casa Central
    // 2. Ir a /solicitar-stock
    // 3. Seleccionar artículo
    // 4. Ingresar cantidad y destino (Depósito)
    // 5. Crear solicitud
    // 6. Verificar mensaje de éxito
    // 7. Logout y login como Depósito
    // 8. Ir a /transferencias-pendientes
    // 9. Verificar solicitud visible
    // 10. Aceptar solicitud
    // 11. Verificar mensaje de éxito
    // 12. Logout y login como Casa Central
    // 13. Ir a /mis-transferencias
    // 14. Confirmar recepción
    // 15. Verificar estado = "Recibido"
  });
});

// Test 2: Flujo completo de oferta
describe('Flujo PUSH - Ofrecer Stock', () => {
  it('debería crear oferta, aceptar y confirmar envío', () => {
    // Similar al Test 1 pero con flujo PUSH
  });
});

// Test 3: Rechazo de solicitud
describe('Rechazar solicitud', () => {
  it('debería rechazar solicitud con motivo', () => {
    // Crear solicitud
    // Rechazar desde /transferencias-pendientes
    // Verificar estado = "Rechazado"
    // Verificar motivo guardado
  });
});

// Test 4: Validación de stock
describe('Validación de stock', () => {
  it('no debería permitir ofrecer más stock del disponible', () => {
    // Ir a /ofrecer-stock
    // Ingresar cantidad mayor al stock
    // Intentar crear oferta
    // Verificar mensaje de error
  });
});
```

---

#### FASE 8: Documentación (4 horas)

**8.1. Documentación de Usuario (2 horas)**

Crear documento: `MANUAL_TRANSFERENCIAS_STOCK.md`

Contenido:
- Introducción al nuevo sistema
- Diferencia entre "Solicitar" y "Ofrecer"
- Flujo paso a paso con capturas de pantalla
- Preguntas frecuentes (FAQ)
- Solución de problemas comunes

**8.2. Documentación Técnica (2 horas)**

Actualizar:
- `estado_actual_movstock.md`
- Comentarios en código PHP
- Comentarios en componentes Angular
- API documentation

---

#### FASE 9: Despliegue Gradual (variable)

**9.1. Ambiente de Desarrollo (1 hora)**
- Desplegar todos los cambios
- Testing manual
- Ajustes necesarios

**9.2. Ambiente de Staging (2 horas)**
- Migración de base de datos
- Despliegue de backend
- Despliegue de frontend
- Testing con usuarios beta

**9.3. Producción (4 horas + monitoreo)**
- Modo mantenimiento (30 min)
- Backup completo
- Migración de base de datos
- Despliegue de backend
- Despliegue de frontend
- Verificación de funcionalidad
- Monitoreo continuo (24-48 horas)

---

## 6. SCRIPTS DE MIGRACIÓN

### 6.1 Script de Alteración de Tablas

```sql
-- ============================================================================
-- SCRIPT DE ALTERACIÓN DE TABLAS PARA MEJORA DE TRANSFERENCIAS
-- Fecha: 15-NOV-2025
-- Descripción: Agrega campos necesarios para nuevo flujo de transferencias
-- ============================================================================

-- PASO 1: Backup de tablas
CREATE TABLE pedidoitem_backup_20251115 AS SELECT * FROM pedidoitem;
CREATE TABLE pedidoscb_backup_20251115 AS SELECT * FROM pedidoscb;

-- PASO 2: Agregar campo tipo_transferencia
ALTER TABLE pedidoitem
ADD COLUMN IF NOT EXISTS tipo_transferencia VARCHAR(10);

ALTER TABLE pedidoscb
ADD COLUMN IF NOT EXISTS tipo_transferencia VARCHAR(10);

-- PASO 3: Agregar campos de auditoría
ALTER TABLE pedidoitem
ADD COLUMN IF NOT EXISTS fecha_aceptacion DATE,
ADD COLUMN IF NOT EXISTS usuario_aceptacion VARCHAR(50),
ADD COLUMN IF NOT EXISTS fecha_rechazo DATE,
ADD COLUMN IF NOT EXISTS usuario_rechazo VARCHAR(50),
ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
ADD COLUMN IF NOT EXISTS fecha_confirmacion DATE,
ADD COLUMN IF NOT EXISTS usuario_confirmacion VARCHAR(50);

ALTER TABLE pedidoscb
ADD COLUMN IF NOT EXISTS fecha_aceptacion DATE,
ADD COLUMN IF NOT EXISTS usuario_aceptacion VARCHAR(50),
ADD COLUMN IF NOT EXISTS fecha_rechazo DATE,
ADD COLUMN IF NOT EXISTS usuario_rechazo VARCHAR(50),
ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
ADD COLUMN IF NOT EXISTS fecha_confirmacion DATE,
ADD COLUMN IF NOT EXISTS usuario_confirmacion VARCHAR(50);

-- PASO 4: Agregar comentarios
COMMENT ON COLUMN pedidoitem.tipo_transferencia IS
'Tipo de transferencia: PULL (solicitud), PUSH (oferta), LEGACY (anterior a mejora)';

COMMENT ON COLUMN pedidoitem.fecha_aceptacion IS
'Fecha en que se aceptó la transferencia';

COMMENT ON COLUMN pedidoitem.usuario_aceptacion IS
'Usuario que aceptó la transferencia';

COMMENT ON COLUMN pedidoitem.fecha_rechazo IS
'Fecha en que se rechazó la transferencia';

COMMENT ON COLUMN pedidoitem.motivo_rechazo IS
'Motivo del rechazo de la transferencia';

-- PASO 5: Crear índices (opcional, para mejorar rendimiento)
CREATE INDEX IF NOT EXISTS idx_pedidoitem_tipo_transferencia
ON pedidoitem(tipo_transferencia);

CREATE INDEX IF NOT EXISTS idx_pedidoitem_estado_tipo
ON pedidoitem(estado, tipo_transferencia);

-- PASO 6: Verificar cambios
SELECT
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pedidoitem'
  AND column_name LIKE '%transferencia%'
     OR column_name LIKE '%aceptacion%'
     OR column_name LIKE '%rechazo%'
     OR column_name LIKE '%confirmacion%';
```

### 6.2 Script de Migración de Estados

```sql
-- ============================================================================
-- SCRIPT DE MIGRACIÓN DE ESTADOS
-- Fecha: 15-NOV-2025
-- Descripción: Normaliza estados existentes y marca transferencias legacy
-- ============================================================================

BEGIN;

-- PASO 1: Marcar transferencias anteriores como LEGACY
UPDATE pedidoitem
SET tipo_transferencia = 'LEGACY'
WHERE tipo = 'PE'
  AND estado NOT IN ('ALTA', 'Cancel-Alta')
  AND tipo_transferencia IS NULL;

UPDATE pedidoscb
SET tipo_transferencia = 'LEGACY'
WHERE tipo = 'PE'
  AND estado NOT IN ('ALTA', 'Cancel-Alta')
  AND tipo_transferencia IS NULL;

-- PASO 2: Normalizar estados "Enviado" y "Solicitado-E" a "Aceptado"
UPDATE pedidoitem
SET estado = 'Aceptado'
WHERE tipo = 'PE'
  AND TRIM(estado) IN ('Enviado', 'Solicitado-E')
  AND tipo_transferencia = 'LEGACY';

UPDATE pedidoscb
SET estado = 'Aceptado'
WHERE tipo = 'PE'
  AND TRIM(estado) IN ('Enviado', 'Solicitado-E')
  AND tipo_transferencia = 'LEGACY';

-- PASO 3: Verificar migración
SELECT
    tipo_transferencia,
    TRIM(estado) as estado,
    COUNT(*) as cantidad
FROM pedidoitem
WHERE tipo = 'PE'
GROUP BY tipo_transferencia, TRIM(estado)
ORDER BY tipo_transferencia, estado;

-- PASO 4: Commit si todo está correcto
-- COMMIT;

-- Si algo salió mal:
-- ROLLBACK;
```

### 6.3 Script de Validación Post-Migración

```sql
-- ============================================================================
-- SCRIPT DE VALIDACIÓN POST-MIGRACIÓN
-- Fecha: 15-NOV-2025
-- Descripción: Valida integridad de datos después de la migración
-- ============================================================================

-- TEST 1: Verificar que todas las transferencias tienen tipo_transferencia
SELECT
    COUNT(*) as total_sin_tipo,
    'ERROR: Transferencias sin tipo_transferencia' as mensaje
FROM pedidoitem
WHERE tipo = 'PE'
  AND estado NOT IN ('ALTA', 'Cancel-Alta')
  AND tipo_transferencia IS NULL;
-- Resultado esperado: 0

-- TEST 2: Verificar que no existen estados "Enviado" o "Solicitado-E"
SELECT
    COUNT(*) as total_estados_viejos,
    'ERROR: Estados antiguos sin migrar' as mensaje
FROM pedidoitem
WHERE tipo = 'PE'
  AND TRIM(estado) IN ('Enviado', 'Solicitado-E');
-- Resultado esperado: 0

-- TEST 3: Verificar integridad pedidoitem <-> pedidoscb
SELECT
    COUNT(*) as total_inconsistentes,
    'ERROR: Inconsistencias entre pedidoitem y pedidoscb' as mensaje
FROM pedidoitem pi
LEFT JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pi.tipo = 'PE'
  AND (pi.tipo_transferencia != pc.tipo_transferencia
       OR pi.tipo_transferencia IS NULL AND pc.tipo_transferencia IS NOT NULL
       OR pi.tipo_transferencia IS NOT NULL AND pc.tipo_transferencia IS NULL);
-- Resultado esperado: 0

-- TEST 4: Contar transferencias migradas
SELECT
    tipo_transferencia,
    TRIM(estado) as estado,
    COUNT(*) as cantidad
FROM pedidoitem
WHERE tipo = 'PE'
GROUP BY tipo_transferencia, TRIM(estado)
ORDER BY tipo_transferencia, estado;

-- TEST 5: Verificar que backups existen
SELECT
    table_name,
    'Backup OK' as status
FROM information_schema.tables
WHERE table_name IN ('pedidoitem_backup_20251115', 'pedidoscb_backup_20251115');
-- Resultado esperado: 2 filas

-- TEST 6: Verificar índices creados
SELECT
    indexname,
    tablename,
    'Índice OK' as status
FROM pg_indexes
WHERE indexname LIKE 'idx_pedidoitem_%transferencia%';
```

### 6.4 Script de Rollback (Emergencia)

```sql
-- ============================================================================
-- SCRIPT DE ROLLBACK DE EMERGENCIA
-- Fecha: 15-NOV-2025
-- Descripción: Revierte cambios de migración en caso de problemas críticos
-- ⚠️  SOLO USAR EN CASO DE EMERGENCIA
-- ============================================================================

BEGIN;

-- PASO 1: Verificar que backups existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedidoitem_backup_20251115') THEN
        RAISE EXCEPTION 'Backup de pedidoitem no existe. Abortando rollback.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedidoscb_backup_20251115') THEN
        RAISE EXCEPTION 'Backup de pedidoscb no existe. Abortando rollback.';
    END IF;
END $$;

-- PASO 2: Eliminar índices nuevos
DROP INDEX IF EXISTS idx_pedidoitem_tipo_transferencia;
DROP INDEX IF EXISTS idx_pedidoitem_estado_tipo;

-- PASO 3: Eliminar columnas nuevas
ALTER TABLE pedidoitem
DROP COLUMN IF EXISTS tipo_transferencia,
DROP COLUMN IF EXISTS fecha_aceptacion,
DROP COLUMN IF EXISTS usuario_aceptacion,
DROP COLUMN IF EXISTS fecha_rechazo,
DROP COLUMN IF EXISTS usuario_rechazo,
DROP COLUMN IF EXISTS motivo_rechazo,
DROP COLUMN IF EXISTS fecha_confirmacion,
DROP COLUMN IF EXISTS usuario_confirmacion;

ALTER TABLE pedidoscb
DROP COLUMN IF EXISTS tipo_transferencia,
DROP COLUMN IF EXISTS fecha_aceptacion,
DROP COLUMN IF EXISTS usuario_aceptacion,
DROP COLUMN IF EXISTS fecha_rechazo,
DROP COLUMN IF EXISTS usuario_rechazo,
DROP COLUMN IF EXISTS motivo_rechazo,
DROP COLUMN IF EXISTS fecha_confirmacion,
DROP COLUMN IF EXISTS usuario_confirmacion;

-- PASO 4: Restaurar estados originales desde backup
-- (Solo si se normalizaron estados)
UPDATE pedidoitem pi
SET estado = pb.estado
FROM pedidoitem_backup_20251115 pb
WHERE pi.id_items = pb.id_items
  AND pi.estado != pb.estado;

UPDATE pedidoscb pc
SET estado = pb.estado
FROM pedidoscb_backup_20251115 pb
WHERE pc.id_num = pb.id_num
  AND pc.estado != pb.estado;

-- PASO 5: Verificar rollback
SELECT
    'pedidoitem' as tabla,
    COUNT(*) as total_columnas_nuevas
FROM information_schema.columns
WHERE table_name = 'pedidoitem'
  AND (column_name LIKE '%transferencia%'
       OR column_name LIKE '%aceptacion%'
       OR column_name LIKE '%rechazo%'
       OR column_name LIKE '%confirmacion%');
-- Resultado esperado: 0

-- PASO 6: Commit si verificación es correcta
-- COMMIT;

-- Si hay problemas:
-- ROLLBACK;

-- PASO 7: Después de verificar que todo funciona, eliminar backups
-- DROP TABLE pedidoitem_backup_20251115;
-- DROP TABLE pedidoscb_backup_20251115;
```

---

## 7. PLAN DE TESTING

### 7.1 Checklist de Testing Backend

```
FUNCIONES NUEVAS
□ AceptarTransferencia_post()
  □ Acepta solicitud (PULL) y mueve stock correctamente
  □ Acepta oferta (PUSH) y mueve stock correctamente
  □ Valida stock disponible antes de aceptar
  □ Rechaza si stock insuficiente
  □ Rechaza si estado no es "Solicitado" u "Ofrecido"
  □ Previene duplicados (409 Conflict)
  □ Registra fecha y usuario de aceptación
  □ Logs de auditoría correctos

□ RechazarTransferencia_post()
  □ Rechaza solicitud sin mover stock
  □ Rechaza oferta sin mover stock
  □ Requiere motivo de rechazo
  □ Registra fecha, usuario y motivo
  □ Rechaza si estado no es "Solicitado" u "Ofrecido"
  □ Previene duplicados

□ ConfirmarRecepcion_post()
  □ Confirma recepción de solicitud aceptada
  □ NO mueve stock
  □ Valida tipo_transferencia = 'PULL'
  □ Valida estado = "Aceptado"
  □ Registra fecha y usuario de confirmación
  □ Solo permite confirmar al solicitante (sucursald)

□ ConfirmarEnvio_post()
  □ Confirma envío de oferta aceptada
  □ NO mueve stock
  □ Valida tipo_transferencia = 'PUSH'
  □ Valida estado = "Aceptado"
  □ Registra fecha y usuario de confirmación
  □ Solo permite confirmar al ofertante (sucursald)

FUNCIONES MODIFICADAS
□ PedidoItemyCab_post()
  □ Acepta parámetro tipo_transferencia
  □ Valida tipo_transferencia ('PULL' o 'PUSH')
  □ Crea con estado "Solicitado" para PULL
  □ Crea con estado "Ofrecido" para PUSH
  □ NO mueve stock (ya corregido)

□ CancelarPedidoStock_post()
  □ Permite cancelar "Solicitado"
  □ Permite cancelar "Ofrecido"
  □ NO permite cancelar "Aceptado"
  □ Revierte stock si es necesario (ya corregido)

FUNCIONES EXISTENTES (regresión)
□ PedidoItemyCabIdEnvio_post()
  □ Sigue funcionando correctamente
  □ No afectado por cambios

□ PedidoItemsPorSucursal_post()
  □ Devuelve transferencias correctamente
  □ Incluye nuevos campos

□ PedidoItemsPorSucursalh_post()
  □ Devuelve transferencias correctamente
  □ Incluye nuevos campos
```

### 7.2 Checklist de Testing Frontend

```
COMPONENTES NUEVOS
□ transferencias-pendientes
  □ Carga transferencias pendientes correctamente
  □ Muestra solicitudes (Solicitado)
  □ Muestra ofertas (Ofrecido)
  □ Filtros funcionan correctamente
  □ Botón "Aceptar" funciona
  □ Botón "Rechazar" funciona
  □ Modal de motivo de rechazo funciona
  □ Totalizadores se calculan correctamente
  □ Protección contra doble clic funciona
  □ Manejo de errores correcto

□ mis-transferencias
  □ Carga mis transferencias correctamente
  □ Muestra solicitudes enviadas
  □ Muestra ofertas enviadas
  □ Botón "Confirmar Recepción" funciona
  □ Botón "Confirmar Envío" funciona
  □ Botón "Cancelar" funciona
  □ Estados se muestran correctamente
  □ Filtros funcionan

COMPONENTES RENOMBRADOS
□ solicitar-stock (antes pedir-stock)
  □ Listado de productos funciona
  □ Modal se abre correctamente
  □ Creación de solicitud funciona
  □ Mensaje de éxito correcto

□ modal-solicitar-stock (antes stockproductopedido)
  □ Validaciones funcionan
  □ Crea con estado "Solicitado"
  □ Envía tipo_transferencia = 'PULL'
  □ Mensaje de éxito mejorado

□ ofrecer-stock (antes stockenvio)
  □ Listado de productos funciona
  □ Modal se abre correctamente
  □ Validación de stock disponible
  □ Creación de oferta funciona

□ modal-ofrecer-stock (antes stockproductoenvio)
  □ Validaciones funcionan
  □ Valida stock disponible
  □ Crea con estado "Ofrecido"
  □ Envía tipo_transferencia = 'PUSH'
  □ Mensaje de éxito mejorado

MENÚ Y NAVEGACIÓN
□ Menú actualizado con nuevas opciones
□ Rutas funcionan correctamente
□ Breadcrumbs correctos
□ Contador de pendientes funciona
□ Componentes deprecados ocultos del menú
□ URLs antiguas redirigen correctamente

SERVICIO
□ Nuevas funciones agregadas
□ URLs configuradas correctamente
□ Tipado TypeScript correcto
□ Funciones existentes sin afectar
```

### 7.3 Casos de Prueba Completos

#### TEST 1: Flujo PULL Completo Exitoso

```
Precondiciones:
- Usuario Casa Central logueado
- Artículo X con stock disponible en Depósito
- Stock Casa Central: 50
- Stock Depósito: 100

Pasos:
1. Casa Central va a /solicitar-stock
2. Busca artículo X
3. Click en "Solicitar"
4. Modal se abre
5. Ingresa cantidad: 30
6. Selecciona destino: Depósito
7. Click en "Solicitar"

Verificar:
✓ Mensaje: "Solicitud creada. Pendiente de aprobación del Depósito."
✓ Stock Casa Central: 50 (sin cambios)
✓ Stock Depósito: 100 (sin cambios)
✓ Estado en DB: "Solicitado"
✓ tipo_transferencia: "PULL"

8. Logout Casa Central
9. Login Depósito
10. Va a /transferencias-pendientes
11. Ve solicitud de Casa Central (30 unidades de X)
12. Click en "Aceptar y Enviar"
13. Confirma en SweetAlert2

Verificar:
✓ Mensaje: "Solicitud aceptada y stock enviado"
✓ Stock Casa Central: 80 (+30)
✓ Stock Depósito: 70 (-30)
✓ Estado en DB: "Aceptado"
✓ fecha_aceptacion: hoy
✓ usuario_aceptacion: usuario_deposito

14. Logout Depósito
15. Login Casa Central
16. Va a /mis-transferencias
17. Ve transferencia "Aceptado" del Depósito
18. Click en "Confirmar Recepción"

Verificar:
✓ Mensaje: "Recepción confirmada. Transferencia completada."
✓ Stock Casa Central: 80 (sin cambios)
✓ Stock Depósito: 70 (sin cambios)
✓ Estado en DB: "Recibido"
✓ fecha_confirmacion: hoy
✓ usuario_confirmacion: usuario_casa_central
```

#### TEST 2: Flujo PUSH Completo Exitoso

```
Precondiciones:
- Usuario Valle Viejo logueado
- Artículo Y con stock disponible en Valle Viejo
- Stock Valle Viejo: 200
- Stock Casa Central: 50

Pasos:
1. Valle Viejo va a /ofrecer-stock
2. Busca artículo Y
3. Click en "Ofrecer"
4. Modal se abre
5. Ingresa cantidad: 100
6. Selecciona destino: Casa Central
7. Click en "Ofrecer"

Verificar:
✓ Mensaje: "Oferta creada. Pendiente de aceptación de Casa Central."
✓ Stock Valle Viejo: 200 (sin cambios)
✓ Stock Casa Central: 50 (sin cambios)
✓ Estado en DB: "Ofrecido"
✓ tipo_transferencia: "PUSH"

8. Logout Valle Viejo
9. Login Casa Central
10. Va a /transferencias-pendientes
11. Ve oferta de Valle Viejo (100 unidades de Y)
12. Click en "Aceptar"
13. Confirma en SweetAlert2

Verificar:
✓ Mensaje: "Oferta aceptada. Stock transferido."
✓ Stock Valle Viejo: 100 (-100)
✓ Stock Casa Central: 150 (+100)
✓ Estado en DB: "Aceptado"
✓ fecha_aceptacion: hoy
✓ usuario_aceptacion: usuario_casa_central

14. Logout Casa Central
15. Login Valle Viejo
16. Va a /mis-transferencias
17. Ve transferencia "Aceptado" por Casa Central
18. Click en "Confirmar Envío"

Verificar:
✓ Mensaje: "Envío confirmado. Transferencia completada."
✓ Stock Valle Viejo: 100 (sin cambios)
✓ Stock Casa Central: 150 (sin cambios)
✓ Estado en DB: "Recibido"
✓ fecha_confirmacion: hoy
✓ usuario_confirmacion: usuario_valle_viejo
```

#### TEST 3: Rechazo de Solicitud

```
Precondiciones:
- Solicitud existente en estado "Solicitado"
- Stock inicial conocido

Pasos:
1. Login Depósito
2. Va a /transferencias-pendientes
3. Ve solicitud de Casa Central
4. Click en "Rechazar"
5. Modal de motivo se abre
6. Ingresa motivo: "Stock insuficiente"
7. Confirma

Verificar:
✓ Mensaje: "Transferencia rechazada"
✓ Stock sin cambios
✓ Estado en DB: "Rechazado"
✓ motivo_rechazo: "Stock insuficiente"
✓ fecha_rechazo: hoy
✓ usuario_rechazo: usuario_deposito

8. Logout Depósito
9. Login Casa Central
10. Va a /mis-transferencias
11. Ve transferencia "Rechazado"
12. Click en "Ver detalles"

Verificar:
✓ Muestra motivo de rechazo
✓ Muestra fecha y usuario que rechazó
```

#### TEST 4: Validación de Stock Insuficiente

```
Precondiciones:
- Stock Valle Viejo artículo Z: 50

Pasos:
1. Login Valle Viejo
2. Va a /ofrecer-stock
3. Busca artículo Z
4. Click en "Ofrecer"
5. Ingresa cantidad: 100 (más de lo disponible)
6. Selecciona destino: Casa Central
7. Click en "Ofrecer"

Verificar:
✓ Mensaje de error: "Solo tienes 50 unidades disponibles"
✓ No se crea la oferta
✓ Stock sin cambios
```

#### TEST 5: Prevención de Duplicados

```
Precondiciones:
- Solicitud en estado "Solicitado"
- Usuario Depósito logueado en DOS navegadores

Pasos:
1. Navegador A: Va a /transferencias-pendientes
2. Navegador B: Va a /transferencias-pendientes
3. Navegador A: Click en "Aceptar y Enviar" en solicitud X
4. Navegador A: Confirma
5. Navegador A: Recibe mensaje de éxito
6. Navegador B: Click en "Aceptar y Enviar" en la MISMA solicitud X
7. Navegador B: Confirma

Verificar:
✓ Navegador A: Éxito
✓ Navegador B: Error 409 Conflict
✓ Navegador B: Mensaje: "Esta transferencia ya fue procesada"
✓ Stock movido SOLO UNA VEZ
```

---

## 8. PLAN DE ROLLBACK

### 8.1 Condiciones para Activar Rollback

Activar rollback si:
- ❌ Errores críticos en producción que afectan operación normal
- ❌ Stock inconsistente confirmado
- ❌ Pérdida de datos
- ❌ Funcionalidad crítica rota
- ❌ Más del 30% de usuarios reportan problemas

NO activar rollback si:
- ⚠️ Errores menores de UI
- ⚠️ Quejas de usuarios sobre cambios (normal en cambios grandes)
- ⚠️ Bugs aislados que pueden corregirse rápidamente

### 8.2 Procedimiento de Rollback

#### Rollback de Backend (30-60 minutos)

```bash
# 1. Modo mantenimiento
echo "Sistema en mantenimiento" > /var/www/html/maintenance.html

# 2. Restaurar código PHP anterior
cd /var/www/api
git revert <commit_hash> --no-commit
git commit -m "Rollback: Revertir mejora de transferencias de stock"
git push origin main

# 3. Reiniciar servidor
sudo systemctl restart apache2

# 4. Verificar funcionalidad básica
curl http://api.ejemplo.com/PedidoItemyCab_post -X POST -d '...'
```

#### Rollback de Base de Datos (60-90 minutos)

```sql
-- Ver script en sección 6.4
-- Ejecutar Script de Rollback de Emergencia
```

#### Rollback de Frontend (30-60 minutos)

```bash
# 1. Revertir cambios en repositorio
cd /var/www/angular/motoapp
git revert <commit_hash> --no-commit
git commit -m "Rollback: Revertir mejora de transferencias de stock"

# 2. Rebuild
npm run build

# 3. Desplegar
cp -r dist/* /var/www/html/

# 4. Limpiar caché
# Instrucciones para usuarios: Ctrl+Shift+R
```

#### Rollback de Menú (10 minutos)

```typescript
// Restaurar sidebar.component.ts con menú anterior
// Ocultar nuevos componentes
// Mostrar componentes antiguos
```

### 8.3 Comunicación de Rollback

**Notificación a usuarios:**
```
Asunto: Mantenimiento del Sistema - Reversión Temporal

Estimados usuarios,

Debido a problemas técnicos detectados en la actualización del sistema de
transferencias de stock, hemos decidido revertir temporalmente los cambios
para garantizar la estabilidad del sistema.

Los cambios fueron:
- [Descripción breve]

El sistema volverá a funcionar como antes de la actualización mientras
solucionamos los problemas detectados.

Estimamos que el sistema estará disponible en [TIEMPO].

Disculpen las molestias.

Equipo de TI
```

### 8.4 Post-Rollback

Después del rollback:
1. ✅ Reunión post-mortem (identificar causa raíz)
2. ✅ Análisis de logs y errores
3. ✅ Corrección de problemas identificados
4. ✅ Testing adicional en staging
5. ✅ Plan de re-despliegue mejorado
6. ✅ Comunicación a usuarios sobre próxima fecha

---

## 9. CHECKLIST DE IMPLEMENTACIÓN

### 9.1 Pre-Implementación

```
PREPARACIÓN
□ Backup completo de base de datos realizado
□ Backup de código backend realizado
□ Backup de código frontend realizado
□ Documentación de usuario creada
□ Documentación técnica actualizada
□ Equipo de soporte notificado
□ Usuarios clave notificados (beta testers)
□ Ventana de mantenimiento coordinada
□ Plan de rollback revisado y aprobado
□ Scripts de migración probados en staging

AMBIENTE DE STAGING
□ Base de datos migrada exitosamente
□ Backend desplegado y funcional
□ Frontend desplegado y funcional
□ Tests manuales completos
□ Tests automatizados pasando
□ Beta testers validaron funcionalidad
□ Sin errores críticos reportados
```

### 9.2 Implementación

```
BASE DE DATOS
□ Modo mantenimiento activado
□ Backup pre-migración creado
□ Script de alteración ejecutado
□ Script de migración ejecutado
□ Script de validación ejecutado
□ Resultados de validación OK
□ Índices creados
□ Performance de queries verificada

BACKEND
□ Código desplegado
□ Archivos PHP correctos
□ Nuevas funciones disponibles
□ URLs configuradas
□ Logs configurados
□ Servidor reiniciado
□ Health check OK
□ Funciones existentes funcionando (regresión)

FRONTEND
□ Build exitoso
□ Código desplegado
□ Nuevos componentes disponibles
□ Componentes renombrados funcionando
□ Menú actualizado
□ Rutas configuradas
□ Servicios actualizados
□ Caché limpiado

VALIDACIÓN
□ Flujo PULL completo funciona
□ Flujo PUSH completo funciona
□ Rechazo funciona
□ Cancelación funciona
□ Stock se mueve correctamente
□ Sin duplicación de stock
□ Logs de auditoría funcionan
□ Componentes antiguos ocultos pero accesibles
□ Performance aceptable
```

### 9.3 Post-Implementación

```
MONITOREO (Primeras 24 horas)
□ Monitoreo de logs activo
□ Alertas configuradas
□ Equipo de soporte disponible
□ Usuarios usando sistema sin problemas críticos
□ Performance estable
□ Stock consistente verificado
□ Sin errores 500 en logs
□ Sin quejas críticas de usuarios

COMUNICACIÓN
□ Usuarios notificados de cambios
□ Manual de usuario distribuido
□ Sesiones de capacitación realizadas
□ Canal de soporte disponible
□ FAQ publicado

VALIDACIÓN (Primera semana)
□ Usuarios usando nuevos flujos
□ Componentes antiguos sin uso
□ Stock auditado y consistente
□ Sin rollbacks necesarios
□ Performance aceptable
□ Feedback de usuarios recopilado
□ Bugs menores documentados para fix

LIMPIEZA (Después de 30 días)
□ Componentes antiguos eliminados (si no hubo problemas)
□ Backups de migración archivados
□ Documentación finalizada
□ Métricas de uso analizadas
□ Post-mortem completado
□ Lecciones aprendidas documentadas
```

---

## 10. MÉTRICAS DE ÉXITO

### 10.1 Métricas Técnicas

| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| Tiempo de respuesta de APIs | < 500ms | Logs del servidor |
| Errores 500 | 0 | Monitoreo de logs |
| Errores 409 (duplicados) | < 1% de transacciones | Logs del servidor |
| Stock consistente | 100% | Auditoría diaria |
| Uptime del sistema | > 99.9% | Monitoreo de disponibilidad |
| Performance de queries | < 100ms | PostgreSQL logs |

### 10.2 Métricas de Usuario

| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| Adopción de nuevos flujos | > 80% en 2 semanas | Analytics |
| Satisfacción de usuarios | > 4/5 | Encuesta |
| Tiempo para completar transferencia | < 2 minutos | Analytics |
| Errores reportados por usuarios | < 5 por semana | Tickets de soporte |
| Uso de componentes antiguos | < 10% después de 1 mes | Analytics |

### 10.3 Métricas de Negocio

| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| Transferencias completadas | Incremento del 20% | Base de datos |
| Transferencias rechazadas | < 15% | Base de datos |
| Tiempo promedio de aceptación | < 4 horas | Base de datos |
| Errores de inventario | Reducción del 50% | Auditorías |

---

## 11. CONCLUSIÓN

Este plan proporciona una ruta completa y segura para implementar la mejora del sistema de transferencias de stock, siguiendo la **Opción B (Mejorada)** que mantiene la distinción semántica entre "Solicitar" (PULL) y "Ofrecer" (PUSH), pero unifica la experiencia de usuario y agrega confirmación bidireccional en ambos flujos.

### Beneficios Esperados

1. **Mayor Control:** Todas las transferencias requieren aceptación explícita
2. **Menos Errores:** Validaciones y confirmaciones previenen movimientos incorrectos
3. **Mejor UX:** Componentes unificados, flujos más claros
4. **Trazabilidad:** Auditoría completa de todas las acciones
5. **Seguridad:** Stock solo se mueve con confirmación

### Próximos Pasos Recomendados

1. ✅ Revisión y aprobación de este plan por equipo técnico y negocio
2. ✅ Decisión de fecha de implementación
3. ✅ Asignación de recursos y responsables
4. ✅ Inicio de FASE 1 (Preparación de Base de Datos)

---

**Generado por:** Claude Code (Anthropic)
**Fecha:** 15 de Noviembre de 2025
**Versión:** 1.0
**Estado:** LISTO PARA REVISIÓN Y APROBACIÓN
