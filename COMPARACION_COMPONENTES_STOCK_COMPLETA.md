# Comparación Completa: Componentes de Sistema de Stock

**Fecha**: 16 de Noviembre de 2025
**Análisis**: Sistema LEGACY vs Sistema v2.2

---

## 📊 Resumen Ejecutivo

El sistema MotoApp tiene **DOS sistemas paralelos** para gestionar transferencias de stock entre sucursales:

1. **Sistema LEGACY** (antiguo, con problema de movimiento de stock prematuro)
2. **Sistema v2.2** (nuevo, con aprobación bidireccional y flujo correcto)

---

## 🗂️ SISTEMA LEGACY (Flujo con Stock Prematuro)

### Componentes Operativos (MUEVEN STOCK)

#### 1. `enviostockpendientes` - ENVÍO ⚠️ PROBLEMA AQUÍ

**Ruta**: `/enviostockpendientes`
**Función**: Enviar stock solicitado por otra sucursal
**Filtro**:
- Endpoint: `obtenerPedidoItemPorSucursalh` (MI sucursal es DESTINO)
- Estados: `"Solicitado"`

**Acción**:
- Botón "Enviar" → Llama a `crearPedidoStockIdEnvio()`
- Endpoint: `PedidoItemyCabIdEnvio_post` (Descarga.php:1911-2177)
- **⚠️ MUEVE STOCK AQUÍ** (líneas 2124-2147):
  ```php
  // SUMA stock en DESTINO
  UPDATE artsucursal SET exi_destino = exi_destino + cantidad
  // RESTA stock en ORIGEN
  UPDATE artsucursal SET exi_origen = exi_origen - cantidad
  ```
- Estado cambia: `"Solicitado"` → `"Solicitado-E"` / `"Enviado"`

**Problema**: Stock se mueve ANTES de que el destinatario confirme la recepción física

---

#### 2. `stockpedido` - RECEPCIÓN ✅

**Ruta**: `/stockpedido`
**Función**: Recibir stock que fue enviado
**Filtro**:
- Endpoint: `obtenerPedidoItemPorSucursalh` (MI sucursal es DESTINO)
- Estados: `"Solicitado-E"`

**Acción**:
- Botón "Recibir" → Llama a `crearPedidoStockId()`
- Endpoint: `PedidoItemyCabId_post` (Descarga.php:1713-1909)
- **✅ NO MUEVE STOCK** (líneas 1859-1880):
  ```php
  // ⚠️ IMPORTANTE: NO SE ACTUALIZA EL STOCK AQUÍ
  // RAZÓN: El stock YA fue actualizado en PedidoItemyCabIdEnvio_post
  ```
- Estado cambia: `"Solicitado-E"` → `"Recibido"`

**Correcto**: Solo confirma recepción física, no duplica el movimiento de stock

---

### Componentes de Visualización/Historial (NO MUEVEN STOCK)

#### 3. `stockrecibo` - HISTORIAL DE RECEPCIONES ✅

**Ruta**: `/stockrecibo`
**Función**: **VER HISTORIAL** de stock que MI sucursal ha recibido
**Filtro**:
- Endpoint: `obtenerPedidoItemPorSucursalh` (MI sucursal es DESTINO)
- Estados: `"Enviado"` O `"Recibido"`

**Acción**:
- **SOLO VISUALIZACIÓN**
- NO tiene botones de acción
- Muestra transferencias ya completadas

**Tipo**: ✅ **COMPONENTE LEGACY DE HISTORIAL**

---

#### 4. `enviodestockrealizados` - HISTORIAL DE ENVÍOS ✅

**Ruta**: `/enviodestockrealizados`
**Función**: **VER HISTORIAL** de stock que MI sucursal ha enviado
**Filtro**:
- Endpoint: `obtenerPedidoItemPorSucursal` (MI sucursal es ORIGEN)
- Estados: `"Enviado"`

**Acción**:
- **SOLO VISUALIZACIÓN**
- NO tiene botones de acción
- Muestra transferencias ya enviadas

**Tipo**: ✅ **COMPONENTE LEGACY DE HISTORIAL**

---

## 🚀 SISTEMA v2.2 (Flujo Correcto con Aprobación Bidireccional)

### Componentes Operativos (MUEVEN STOCK CORRECTAMENTE)

#### 5. `pedir-stock` - SOLICITAR STOCK (PULL) ✅

**Ruta**: `/pedir-stock`
**Función**: Solicitar stock a otra sucursal
**Modificado para v2.2**: SÍ (15-Nov-2025)

**Acción**:
- Crear solicitud con `tipo_transferencia: 'PULL'`
- Endpoint: `PedidoItemyCab_post` (Descarga.php:1591-1710)
- **✅ NO MUEVE STOCK**
- Estado inicial: `"Solicitado"`

---

#### 6. `transferencias-pendientes` - ACEPTAR/RECHAZAR ✅

**Ruta**: `/transferencias-pendientes`
**Función**: Ver y gestionar transferencias donde **MI sucursal es DESTINO**
**Nuevo en v2.2**: SÍ (15-Nov-2025)

**Filtro**:
- Endpoint: `obtenerPedidoItemPorSucursalh` (MI sucursal es DESTINO)
- Estados: `"Solicitado"` O `"Ofrecido"`
- tipo_transferencia: `"PULL"` O `"PUSH"`

**Acciones**:

1. **Aceptar** → Llama a `aceptarTransferencia()`
   - Endpoint: `AceptarTransferencia_post` (Descarga.php:6966-7185)
   - **✅ MUEVE STOCK AQUÍ** (líneas 7150-7158):
     ```php
     UPDATE artsucursal
     SET exi_origen = exi_origen - cantidad,
         exi_destino = exi_destino + cantidad
     ```
   - Estado cambia: `"Solicitado"/"Ofrecido"` → `"Aceptado"`

2. **Rechazar** → Llama a `rechazarTransferencia()`
   - Endpoint: `RechazarTransferencia_post` (Descarga.php:7199-7325)
   - **✅ NO MUEVE STOCK**
   - Estado cambia: `"Solicitado"/"Ofrecido"` → `"Rechazado"`

**Tipo**: ✅ **COMPONENTE v2.2 NUEVO**

---

#### 7. `mis-transferencias` - CONFIRMAR RECEPCIÓN/ENVÍO ✅

**Ruta**: `/mis-transferencias`
**Función**: Ver y gestionar transferencias donde **MI sucursal es ORIGEN**
**Nuevo en v2.2**: SÍ (15-Nov-2025)

**Filtro**:
- Endpoint: `obtenerPedidoItemPorSucursal` (MI sucursal es ORIGEN)
- Estados: TODOS (Solicitado, Ofrecido, Aceptado, Recibido, etc.)
- tipo_transferencia: `"PULL"` O `"PUSH"`

**Acciones**:

1. **Cancelar** (solo si estado = Solicitado/Ofrecido)
   - Endpoint: `cancelarPedidoStock()`
   - **✅ NO MUEVE STOCK**
   - Estado cambia: `"Solicitado"/"Ofrecido"` → `"Cancelado"`

2. **Confirmar Recepción** (PULL, solo si estado = Aceptado)
   - Endpoint: `ConfirmarRecepcion_post` (Descarga.php:7338-7457)
   - **✅ NO MUEVE STOCK** (solo confirma llegada física)
   - Estado cambia: `"Aceptado"` → `"Recibido"`

3. **Confirmar Envío** (PUSH, solo si estado = Aceptado)
   - Endpoint: `ConfirmarEnvio_post` (Descarga.php:7470-7589)
   - **✅ NO MUEVE STOCK** (solo confirma salida física)
   - Estado cambia: `"Aceptado"` → `"Recibido"`

**Tipo**: ✅ **COMPONENTE v2.2 NUEVO**

---

#### 8. `ofrecer-stock` - OFRECER STOCK (PUSH) ✅

**Ruta**: `/ofrecer-stock`
**Función**: Ofrecer stock a otra sucursal
**Nuevo en v2.2**: SÍ (15-Nov-2025)

**Acción**:
- Crear oferta con `tipo_transferencia: 'PUSH'`
- Modal: `stockproductooferta`
- Endpoint: `PedidoItemyCab_post` (Descarga.php:1591-1710)
- **✅ NO MUEVE STOCK**
- Estado inicial: `"Ofrecido"`

**Tipo**: ✅ **COMPONENTE v2.2 NUEVO**

---

## 📊 Tabla Comparativa Completa

| Componente | Tipo | Sistema | Mueve Stock | Momento Correcto | Observaciones |
|-----------|------|---------|-------------|------------------|---------------|
| **enviostockpendientes** | Operativo | LEGACY | ✅ SÍ | ❌ NO (prematuro) | Mueve stock en ENVÍO |
| **stockpedido** | Operativo | LEGACY | ❌ NO | ✅ SÍ | Solo confirma recepción |
| **stockrecibo** | Historial | LEGACY | ❌ NO | N/A | Solo visualización |
| **enviodestockrealizados** | Historial | LEGACY | ❌ NO | N/A | Solo visualización |
| **pedir-stock** | Operativo | v2.2 | ❌ NO | ✅ SÍ | Crea solicitud PULL |
| **ofrecer-stock** | Operativo | v2.2 | ❌ NO | ✅ SÍ | Crea oferta PUSH |
| **transferencias-pendientes** | Operativo | v2.2 | ✅ SÍ | ✅ SÍ | Mueve stock en ACEPTACIÓN |
| **mis-transferencias** | Operativo | v2.2 | ❌ NO | ✅ SÍ | Solo confirma físico |

---

## 🎯 Respuesta a la Pregunta

### ¿Son `stockrecibo` y `enviodestockrealizados` componentes LEGACY?

**SÍ**, ambos son componentes del **Sistema LEGACY**, pero son componentes de **HISTORIAL/VISUALIZACIÓN**, no operativos.

**Características**:
- ✅ Son componentes LEGACY
- ✅ NO mueven stock (solo muestran)
- ✅ Filtran estados ya completados ("Enviado", "Recibido")
- ✅ NO tienen el problema de movimiento de stock prematuro (porque no mueven stock)

### Diferencia con Componentes Operativos LEGACY

| Aspecto | `enviostockpendientes` / `stockpedido` | `stockrecibo` / `enviodestockrealizados` |
|---------|--------------------------------------|----------------------------------------|
| **Función** | Operativos (MUEVEN stock) | Historial (VISUALIZAN) |
| **Problema** | SÍ (stock prematuro) | NO (solo muestran) |
| **Estados** | Pendientes/En proceso | Completados |
| **Acciones** | Enviar, Recibir | Ninguna |

---

## 🔄 Flujos Completos

### Flujo LEGACY (Actual con Problema)

```
1. Solicitud
   /pedir-stock → "Solicitado" (no mueve stock) ✅

2. Envío ⚠️ PROBLEMA AQUÍ
   /enviostockpendientes → "Enviado" (MUEVE STOCK) ❌

3. Recepción
   /stockpedido → "Recibido" (no mueve stock) ✅

4. Historial
   /stockrecibo (ver recepciones) ✅
   /enviodestockrealizados (ver envíos) ✅
```

**Problema**: Stock se mueve en paso 2 (ENVÍO), debería moverse en paso 3 (RECEPCIÓN)

---

### Flujo v2.2 (Nuevo Correcto)

```
1. Solicitud PULL
   /pedir-stock → "Solicitado" (no mueve stock) ✅

   O Oferta PUSH
   /ofrecer-stock → "Ofrecido" (no mueve stock) ✅

2. Aceptación ✅ STOCK SE MUEVE AQUÍ
   /transferencias-pendientes → "Aceptado" (MUEVE STOCK) ✅

3. Confirmación
   /mis-transferencias → "Recibido" (confirma físico, no mueve stock) ✅
```

**Correcto**: Stock se mueve en paso 2 (ACEPTACIÓN), cuando ambas partes están de acuerdo

---

## 📋 Recomendaciones

### Para Componentes LEGACY de Historial

✅ **stockrecibo** y **enviodestockrealizados** pueden **seguir usándose** sin problema porque:
- Solo visualizan datos
- No mueven stock
- No tienen el problema de movimiento prematuro
- Son útiles para auditoría e historial

### Para Componentes LEGACY Operativos

⚠️ **enviostockpendientes** y **stockpedido** deberían **migrarse gradualmente** al sistema v2.2 porque:
- Tienen el problema de movimiento de stock prematuro
- No tienen aprobación bidireccional
- Menos trazabilidad
- Mayor riesgo de errores

---

## ✅ Conclusión

**SÍ**, `stockrecibo` y `enviodestockrealizados` son componentes **LEGACY**, pero son componentes de **HISTORIAL/VISUALIZACIÓN** que:

- ✅ **NO tienen problemas** de flujo de stock
- ✅ **Pueden seguir usándose** sin modificaciones
- ✅ Son **complementarios** al sistema v2.2
- ✅ Proporcionan **valor** para auditoría e historial

El verdadero problema está en los componentes **OPERATIVOS LEGACY** (`enviostockpendientes` y `stockpedido`), que mueven stock prematuramente.

---

**Análisis realizado por**: Claude Code
**Fecha**: 16 de Noviembre de 2025
**Componentes analizados**: 8
**Sistemas identificados**: 2 (LEGACY y v2.2)
