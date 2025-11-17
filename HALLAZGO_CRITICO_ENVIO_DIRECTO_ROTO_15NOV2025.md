# 🚨 HALLAZGO CRÍTICO: Envío Directo Dejó de Funcionar (Post-Corrección)

**Fecha de hallazgo:** 15 de Noviembre de 2025
**Severidad:** 🔴 CRÍTICA - Sistema de envío directo NO funcional
**Estado:** ⚠️ IDENTIFICADO - Pendiente de corrección
**Causado por:** Corrección de movimiento prematuro de stock (15-Nov-2025)

---

## 📋 RESUMEN EJECUTIVO

Al implementar la corrección para eliminar el movimiento prematuro de stock en solicitudes (documento `CORRECCION_MOVIMIENTO_PREMATURO_STOCK_15NOV2025.md`), se identificó un **efecto colateral crítico**: el componente `stockproductoenvio` dejó de funcionar correctamente porque ya NO mueve stock al crear envíos directos.

### Impacto
- 🔴 El flujo de **Envío Directo** está ROTO
- 🔴 Los envíos directos entre sucursales YA NO mueven stock
- ✅ El flujo de **Pedido de Stock** funciona correctamente (solicitud-envío-recepción)

---

## 🔍 ANÁLISIS DEL PROBLEMA

### Qué se corrigió hoy (15-Nov-2025)

Se eliminó el código de movimiento de stock de la función `PedidoItemyCab_post()`:

```php
// ANTES (líneas 1626-1680):
// - Mapeo de sucursales
// - UPDATE stock en destino (+cantidad)
// - UPDATE stock en origen (-cantidad)

// DESPUÉS:
// - TODO EL CÓDIGO ELIMINADO
// - Solo comentarios explicativos
```

**Razón de la corrección:**
- La función se usaba para crear SOLICITUDES (estado "Solicitado")
- Las solicitudes NO deben mover stock
- El stock debe moverse solo cuando el depósito ENVÍA

### El problema que se creó

El componente `stockproductoenvio` **TAMBIÉN usa** la función `PedidoItemyCab_post()`, pero con un propósito diferente:

```typescript
// stockproductoenvio.component.ts:82-122

const pedidoItem: PedidoItem = {
  tipo: "PE",
  cantidad: this.cantidad,
  id_art: this.producto.id_articulo,
  estado: "Enviado",  // ← Crea DIRECTAMENTE como "Enviado"
  sucursald: Number(this.sucursal),      // Sucursal origen (quien envía)
  sucursalh: this.selectedSucursal       // Sucursal destino (quien recibe)
};

// Llama a la misma función backend
this.cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe(...)
```

**Diferencias clave:**

| Aspecto | stockproductopedido | stockproductoenvio |
|---------|---------------------|---------------------|
| **Propósito** | SOLICITAR (pedir a otra sucursal) | ENVIAR directamente |
| **Estado inicial** | "Solicitado" | "Enviado" |
| **¿Debe mover stock?** | NO (solo registra solicitud) | SÍ (es envío confirmado) |
| **Función backend** | PedidoItemyCab_post() | PedidoItemyCab_post() (misma) |
| **¿Mueve stock AHORA?** | NO ✅ (correcto) | NO ❌ (ROTO) |

---

## 🔄 FLUJOS AFECTADOS

### Flujo 1: Pedido de Stock (FUNCIONAL) ✅

```
1. Casa Central SOLICITA desde /pedir-stock
   Componente: stockproductopedido
   Backend: PedidoItemyCab_post()
   Estado: "Solicitado"
   Stock: SIN CAMBIOS ✅ CORRECTO

2. Depósito ENVÍA desde /enviostockpendientes
   Componente: enviostockpendientes
   Backend: PedidoItemyCabIdEnvio_post()
   Estado: "Solicitado-E"
   Stock: SE MUEVE ✅ CORRECTO

3. Casa Central RECIBE desde /stockpedido
   Componente: stockpedido
   Backend: PedidoItemyCabId_post()
   Estado: "Recibido"
   Stock: SIN CAMBIOS ✅ CORRECTO
```

### Flujo 2: Envío Directo (ROTO) ❌

```
1. Sucursal A ENVÍA directamente a Sucursal B desde /stockenvio
   Componente: stockproductoenvio
   Backend: PedidoItemyCab_post()
   Estado: "Enviado"
   Stock: SIN CAMBIOS ❌ INCORRECTO (debería moverse)

RESULTADO:
- El pedido se registra con estado "Enviado" ✅
- Pero el stock NO se mueve ❌
- Las sucursales quedan con inventario incorrecto ❌
```

---

## 📊 CASO DE USO: Envío Directo

### Descripción
El componente `stockproductoenvio` permite que una sucursal envíe stock DIRECTAMENTE a otra sucursal, sin pasar por el flujo de solicitud-aprobación.

### Ejemplo Real
```
Sucursal Valle Viejo tiene exceso de stock del artículo X
Sucursal Casa Central necesita ese artículo urgentemente

Valle Viejo:
1. Va a /stockenvio
2. Selecciona el artículo
3. Especifica cantidad y destino (Casa Central)
4. Hace clic en "Enviar"

ANTES de la corrección:
✅ Stock se movía inmediatamente
✅ Valle Viejo: -cantidad
✅ Casa Central: +cantidad

DESPUÉS de la corrección:
❌ Stock NO se mueve
❌ El pedido se registra pero el inventario queda incorrecto
```

### Uso Legítimo
Este flujo es válido y necesario para:
- Transferencias urgentes entre sucursales
- Rebalanceo de inventario
- Envíos confirmados sin necesidad de aprobación previa

---

## 🎯 CAUSA RAÍZ

### El Problema Original
Una sola función backend (`PedidoItemyCab_post()`) se usaba para **DOS propósitos diferentes**:

1. **Crear SOLICITUDES** (stockproductopedido):
   - Estado: "Solicitado"
   - NO debe mover stock (es solo una solicitud)

2. **Crear ENVÍOS DIRECTOS** (stockproductoenvio):
   - Estado: "Enviado"
   - SÍ debe mover stock (es un envío confirmado)

### La Corrección Implementada
Se eliminó TODO el código de movimiento de stock de `PedidoItemyCab_post()`, asumiendo que solo se usaba para solicitudes.

### El Error
No se identificó que `stockproductoenvio` también usaba esta función para un propósito diferente y legítimo.

---

## 💡 OPCIONES DE SOLUCIÓN

### Opción 1: Flag de Distinción (RÁPIDA) ⚡

**Descripción:**
Agregar un parámetro `es_envio_directo` para distinguir entre solicitud y envío directo.

**Cambios requeridos:**

#### Frontend (stockproductoenvio.component.ts):
```typescript
const pedidoItem: PedidoItem = {
  tipo: "PE",
  cantidad: this.cantidad,
  id_art: this.producto.id_articulo,
  estado: "Enviado",
  es_envio_directo: true,  // ← NUEVO: Flag para backend
  sucursald: Number(this.sucursal),
  sucursalh: this.selectedSucursal
};
```

#### Backend (Descarga.php.txt - PedidoItemyCab_post):
```php
public function PedidoItemyCab_post() {
    $data = $this->post();

    if(isset($data['pedidoItem']) && isset($data['pedidoscb'])) {
        $pedidoItem = $data['pedidoItem'];
        $pedidoscb = $data['pedidoscb'];

        // NUEVO: Detectar si es envío directo
        $es_envio_directo = isset($pedidoItem['es_envio_directo']) &&
                           $pedidoItem['es_envio_directo'] === true;

        $this->db->trans_start();

        // Validaciones...
        // INSERTs...

        // CONDICIONAL: Solo mover stock si es envío directo
        if ($es_envio_directo) {
            // Validar stock disponible antes de enviar
            // Código de movimiento de stock (restaurar líneas 1632-1680)
            // ...
        }
        // Si NO es envío directo (es solicitud), NO mover stock

        $this->db->trans_complete();
        // ...
    }
}
```

**Ventajas:**
- ✅ Cambio mínimo
- ✅ Rápido de implementar
- ✅ No crea nuevas funciones

**Desventajas:**
- ⚠️ Mezcla dos lógicas en una función
- ⚠️ Menos clara la separación de responsabilidades
- ⚠️ Más difícil de mantener a futuro

**Tiempo estimado:** 1-2 horas

---

### Opción 2: Función Separada (RECOMENDADA) 🌟

**Descripción:**
Crear una nueva función específica para envíos directos que mueva stock.

**Cambios requeridos:**

#### Backend - Nueva función (Descarga.php.txt):
```php
public function PedidoItemyCabEnvioDirecto_post() {
    $data = $this->post();

    if(isset($data['pedidoItem']) && isset($data['pedidoscb'])) {
        $pedidoItem = $data['pedidoItem'];
        $pedidoscb = $data['pedidoscb'];

        $this->db->trans_start();

        // ============================================================================
        // VALIDACIÓN DE ID_ART VÁLIDO
        // ============================================================================
        if ($pedidoItem['id_art'] == 0 || $pedidoItem['id_art'] === '0' ||
            empty($pedidoItem['id_art'])) {
            $this->db->trans_rollback();
            $respuesta = array(
                "error" => true,
                "mensaje" => "Error: ID de artículo inválido."
            );
            $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
            return;
        }

        // ============================================================================
        // VALIDACIÓN DE STOCK DISPONIBLE
        // ============================================================================
        $mapeo_sucursal_exi = [
            1 => 'exi2', // Casa Central
            2 => 'exi3', // Valle Viejo
            3 => 'exi4', // Güemes
            4 => 'exi1', // Deposito
            5 => 'exi5'  // Mayorista
        ];

        $sucursal_origen = $pedidoscb['sucursald'];
        $campo_stock_origen = $mapeo_sucursal_exi[$sucursal_origen];

        // Obtener stock actual
        $sql_stock = "SELECT $campo_stock_origen FROM artsucursal
                      WHERE id_articulo = ? FOR UPDATE";
        $query_stock = $this->db->query($sql_stock, [$pedidoItem['id_art']]);
        $stock_actual = $query_stock->row_array()[$campo_stock_origen];

        // OPCIONAL: Validar stock suficiente (o permitir negativo)
        // if ($stock_actual < $pedidoItem['cantidad']) {
        //     error...
        // }

        // ============================================================================
        // INSERTAR REGISTROS
        // ============================================================================
        // Insertar en pedidoitem
        $sql_pedidoitem = "INSERT INTO pedidoitem
                          (tipo, cantidad, id_art, descripcion, precio,
                           fecha_resuelto, usuario_res, observacion, estado)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                          RETURNING id_items";
        $query = $this->db->query($sql_pedidoitem, [
            $pedidoItem['tipo'],
            $pedidoItem['cantidad'],
            $pedidoItem['id_art'],
            $pedidoItem['descripcion'],
            $pedidoItem['precio'],
            $pedidoItem['fecha_resuelto'],
            $pedidoItem['usuario_res'],
            isset($pedidoItem['observacion']) ? $pedidoItem['observacion'] : '',
            'Enviado'  // Estado siempre "Enviado" para envío directo
        ]);
        $result = $query->row_array();
        $id_items = $result['id_items'];

        // Insertar en pedidoscb
        $sql_pedidoscb = "INSERT INTO pedidoscb
                         (tipo, sucursald, sucursalh, fecha, usuario,
                          observacion, estado, id_aso)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                         RETURNING id_num";
        $query = $this->db->query($sql_pedidoscb, [
            $pedidoscb['tipo'],
            $pedidoscb['sucursald'],
            $pedidoscb['sucursalh'],
            $pedidoscb['fecha'],
            $pedidoscb['usuario'],
            isset($pedidoscb['observacion']) ? $pedidoscb['observacion'] : '',
            'Enviado',  // Estado siempre "Enviado"
            $id_items
        ]);
        $result = $query->row_array();
        $id_num = $result['id_num'];

        // Actualizar id_num en pedidoitem
        $this->db->query("UPDATE pedidoitem SET id_num = ? WHERE id_items = ?",
                        [$id_num, $id_items]);

        // ============================================================================
        // MOVER STOCK (envío directo confirmado)
        // ============================================================================
        $sucursal_destino = $pedidoscb['sucursalh'];
        $campo_stock_destino = $mapeo_sucursal_exi[$sucursal_destino];

        error_log("ENVIO DIRECTO - Artículo: {$pedidoItem['id_art']}, " .
                 "Cantidad: {$pedidoItem['cantidad']}, " .
                 "Origen: $sucursal_origen ($campo_stock_origen), " .
                 "Destino: $sucursal_destino ($campo_stock_destino)");

        // SUMA stock en destino
        $sql_update_destino = "UPDATE artsucursal
                              SET $campo_stock_destino = $campo_stock_destino + ?
                              WHERE id_articulo = ?";
        $this->db->query($sql_update_destino, [
            $pedidoItem['cantidad'],
            $pedidoItem['id_art']
        ]);

        // RESTA stock en origen
        $sql_update_origen = "UPDATE artsucursal
                             SET $campo_stock_origen = $campo_stock_origen - ?
                             WHERE id_articulo = ?";
        $this->db->query($sql_update_origen, [
            $pedidoItem['cantidad'],
            $pedidoItem['id_art']
        ]);

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE) {
            $respuesta = array(
                "error" => true,
                "mensaje" => "Error al crear el envío directo."
            );
            $this->response($respuesta, REST_Controller::HTTP_INTERNAL_SERVER_ERROR);
        } else {
            $respuesta = array(
                "error" => false,
                "mensaje" => "Envío directo creado exitosamente. El stock ha sido transferido.",
                "id_items" => $id_items,
                "id_num" => $id_num
            );
            $this->response($respuesta);
        }
    } else {
        $respuesta = array(
            "error" => true,
            "mensaje" => "Faltan datos en el POST"
        );
        $this->response($respuesta, REST_Controller::HTTP_BAD_REQUEST);
    }
}
```

#### Frontend - Servicio (cargardata.service.ts):
```typescript
// NUEVA función en el servicio
crearPedidoStockEnvioDirecto(pedidoItem: any, pedidoscb: any): Observable<any> {
  const data = {
    pedidoItem: pedidoItem,
    pedidoscb: pedidoscb
  };
  return this.http.post(this.UrlPedidoItemyCabEnvioDirecto, data);
}
```

#### Frontend - Componente (stockproductoenvio.component.ts):
```typescript
// Cambiar la llamada en línea 122
// ANTES:
this.cargardata.crearPedidoStock(pedidoItem, pedidoscb).subscribe(...)

// DESPUÉS:
this.cargardata.crearPedidoStockEnvioDirecto(pedidoItem, pedidoscb).subscribe(...)
```

**Ventajas:**
- ✅ Separación clara de responsabilidades
- ✅ Código más mantenible
- ✅ Validación específica para envíos directos
- ✅ Más fácil de entender y documentar
- ✅ Permite agregar lógica específica (ej: validar stock disponible)

**Desventajas:**
- ⚠️ Requiere más cambios (backend + servicio + componente)
- ⚠️ Duplicación de código (INSERTs similares)

**Tiempo estimado:** 3-4 horas

---

### Opción 3: Usar Función Existente (ALTERNATIVA)

**Descripción:**
Cambiar `stockproductoenvio` para usar `PedidoItemyCabIdEnvio_post()` en lugar de `PedidoItemyCab_post()`.

**Problema:**
`PedidoItemyCabIdEnvio_post()` requiere un `id_num` existente porque actualiza un pedido existente. No sirve para crear pedidos nuevos.

**Conclusión:** ❌ No viable

---

## 🎯 RECOMENDACIÓN

**Implementar Opción 2: Función Separada**

### Justificación
1. **Claridad semántica:**
   - `PedidoItemyCab_post()` = Crear SOLICITUD (no mueve stock)
   - `PedidoItemyCabEnvioDirecto_post()` = Crear ENVÍO DIRECTO (mueve stock)

2. **Mantenibilidad:**
   - Cada función tiene una responsabilidad clara
   - Más fácil de entender para futuros desarrolladores
   - Facilita agregar validaciones específicas

3. **Seguridad:**
   - Permite agregar validación de stock disponible
   - Evita envíos con stock negativo
   - Mejor control de permisos por función

4. **Escalabilidad:**
   - Si en el futuro se necesitan más tipos de movimientos, es más fácil agregar funciones separadas

### Orden de Implementación
1. ✅ Crear nueva función backend `PedidoItemyCabEnvioDirecto_post()`
2. ✅ Agregar nueva función en servicio Angular
3. ✅ Modificar componente `stockproductoenvio` para usar nueva función
4. ✅ Probar flujo completo
5. ✅ Documentar cambios

---

## 📊 IMPACTO ACTUAL

### Sistema Afectado
- ❌ Envío Directo entre sucursales NO funciona
- ❌ Stock NO se mueve al crear envíos directos
- ❌ Inventario inconsistente en envíos directos creados después de la corrección

### Funcionalidades que SÍ funcionan
- ✅ Flujo de Pedido de Stock (solicitud-envío-recepción)
- ✅ Visualización de stock
- ✅ Cancelaciones con reversión

### Usuarios Afectados
- Usuarios que utilizan `/stockenvio` para envíos directos
- Sucursales que rebalancean inventario frecuentemente

---

## 🧪 PLAN DE VALIDACIÓN POST-CORRECCIÓN

Una vez implementada la solución, validar:

### 1. Envío Directo Funciona
```
1. Ir a /stockenvio
2. Seleccionar artículo
3. Especificar cantidad y destino
4. Enviar
5. VERIFICAR: Stock se mueve correctamente
```

### 2. Pedido de Stock Sigue Funcionando
```
1. Ir a /pedir-stock
2. Crear solicitud
3. VERIFICAR: Stock NO se mueve
4. Enviar desde depósito
5. VERIFICAR: Stock SÍ se mueve
6. Recibir
7. VERIFICAR: Stock NO se mueve adicionalmente
```

### 3. Validación de Stock
```
1. Intentar envío directo sin stock suficiente
2. VERIFICAR: Sistema valida o permite negativo (según decisión)
```

---

## ✅ CHECKLIST DE CORRECCIÓN

### Análisis
- [x] Problema identificado
- [x] Causa raíz determinada
- [x] Opciones de solución evaluadas
- [x] Recomendación definida

### Implementación (PENDIENTE)
- [ ] Backend: Nueva función creada
- [ ] Frontend: Servicio actualizado
- [ ] Frontend: Componente modificado
- [ ] Validaciones agregadas

### Testing (PENDIENTE)
- [ ] Prueba: Envío directo mueve stock
- [ ] Prueba: Pedido de stock no mueve stock al solicitar
- [ ] Prueba: Flujo completo de pedido
- [ ] Prueba: Cancelaciones funcionan

### Documentación (PENDIENTE)
- [x] Documento de hallazgo creado
- [ ] Documento de solución creado
- [ ] Código comentado

---

## 📞 CONTEXTO Y REFERENCIAS

### Documentos Relacionados
- `CORRECCION_MOVIMIENTO_PREMATURO_STOCK_15NOV2025.md` - Corrección que causó este problema
- `estado_actual_movstock.md` - Estado general del sistema
- `REPARACIONES_STOCK_14NOV2025.md` - Correcciones previas
- `analisis_completo_componentes_stock.md` - Análisis de todos los componentes

### Archivos Afectados
- `src/Descarga.php.txt` - Backend (función PedidoItemyCab_post modificada)
- `src/app/components/stockproductoenvio/stockproductoenvio.component.ts` - Componente roto
- `src/app/services/cargardata.service.ts` - Servicio (requiere nueva función)

### Líneas de Código Clave
- `Descarga.php.txt:1568-1690` - Función PedidoItemyCab_post
- `stockproductoenvio.component.ts:70-152` - Método comprar() que crea envío directo
- `stockproductoenvio.component.ts:92` - Estado "Enviado"
- `stockproductoenvio.component.ts:122` - Llamada a crearPedidoStock()

---

## 🎯 CONCLUSIÓN

Este hallazgo demuestra la importancia de:

1. **Análisis completo de impacto** antes de modificaciones
2. **Identificar todos los usos** de una función
3. **Testing exhaustivo** después de cambios
4. **Separación de responsabilidades** (una función = un propósito)

La corrección implementada hoy fue **correcta para solicitudes** pero **rompió envíos directos** porque ambos usaban la misma función con propósitos diferentes.

**Próximo paso:** Implementar **Opción 2 (Función Separada)** para restaurar la funcionalidad de envíos directos manteniendo la corrección de solicitudes.

---

**Generado por:** Claude Code (Anthropic)
**Fecha:** 15 de Noviembre de 2025
**Versión:** 1.0
**Prioridad:** 🔴 CRÍTICA - Requiere corrección inmediata
