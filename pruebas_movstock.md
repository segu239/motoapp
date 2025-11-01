# Plan de Pruebas Manuales - Sistema MOV.STOCK

**Fecha de Creación:** 31 de Octubre de 2025
**Versión:** 1.0
**Estado:** Listo para Ejecución

---

## Índice
1. [Información General](#información-general)
2. [Precondiciones](#precondiciones)
3. [Datos de Prueba](#datos-de-prueba)
4. [Pruebas Funcionales](#pruebas-funcionales)
5. [Pruebas de Validación](#pruebas-de-validación)
6. [Pruebas de Estados](#pruebas-de-estados)
7. [Pruebas de Stock](#pruebas-de-stock)
8. [Pruebas de Errores](#pruebas-de-errores)
9. [Checklist Final](#checklist-final)
10. [Registro de Resultados](#registro-de-resultados)

---

## Información General

### Objetivo
Validar que el sistema MOV.STOCK funciona correctamente después de implementar:
- ✅ Corrección de estados ("Solicitado-R" → "Recibido")
- ✅ Actualización automática de stock en recepción (P2)
- ✅ Validación de stock antes de enviar (P3)

### Alcance
- Flujo completo: Solicitar → Enviar → Recibir
- Actualización automática de inventario
- Validaciones de stock
- Estados correctos en cada paso
- Visualización en todos los componentes

### Duración Estimada
- **Tiempo total:** 45-60 minutos
- **Pruebas básicas:** 20 minutos
- **Pruebas de validación:** 15 minutos
- **Pruebas de errores:** 15 minutos
- **Verificación final:** 10 minutos

---

## Precondiciones

### 1. Acceso al Sistema ✅
- [ ] Usuario con permisos de SUPER o ADMIN
- [ ] Acceso a al menos 2 sucursales diferentes
- [ ] Usuario: `_____________`
- [ ] Sucursales disponibles: `_____________`

### 2. Base de Datos ✅
- [ ] Acceso a PostgreSQL (para verificar stock directamente)
- [ ] Backup de base de datos realizado (RECOMENDADO)

### 3. Backend Actualizado ✅
- [ ] Archivo `Descarga.php.txt` con cambios implementados subido al servidor
- [ ] Cache de servidor limpiado (si aplica)

### 4. Artículos de Prueba ✅
Seleccionar un artículo que cumpla:
- [ ] Existe en la tabla `artsucursal`
- [ ] Tiene stock disponible en al menos una sucursal
- [ ] **Artículo seleccionado:** `_____________`
- **ID Artículo (idart):** `_____________`
- **Descripción:** `_____________`

---

## Datos de Prueba

### Configuración Inicial

Completar antes de comenzar las pruebas:

| Campo | Valor |
|-------|-------|
| **Sucursal A (Origen)** | _________________ |
| **Sucursal B (Destino)** | _________________ |
| **Artículo de Prueba (idart)** | _________________ |
| **Descripción Artículo** | _________________ |
| **Stock Inicial Sucursal A** | _________________ |
| **Stock Inicial Sucursal B** | _________________ |
| **Cantidad a Transferir** | _________________ |

### Consulta SQL para Verificar Stock Inicial

```sql
-- Ejecutar ANTES de las pruebas
SELECT
    idart,
    nomart,
    exi1 as stock_suc1,
    exi2 as stock_suc2,
    exi3 as stock_suc3,
    exi4 as stock_suc4,
    exi5 as stock_suc5
FROM artsucursal
WHERE idart = [ID_ARTICULO_PRUEBA];
```

**Resultado Inicial:**
```
Stock Sucursal 1: _____
Stock Sucursal 2: _____
Stock Sucursal 3: _____
Stock Sucursal 4: _____
Stock Sucursal 5: _____
```

---

## Pruebas Funcionales

---

### 🧪 PRUEBA 1: Flujo Completo Exitoso (Caso Feliz)

**Objetivo:** Validar que el flujo completo funciona correctamente de principio a fin.

**Precondición:**
- Sucursal A tiene stock suficiente (ej: 50 unidades)
- Sucursal B necesita artículos (cualquier stock o 0)

#### PASO 1.1: Crear Solicitud de Stock

1. **Iniciar sesión** como usuario de **Sucursal B**
2. Navegar a: **MOV.STOCK → Pedir Stock**
3. Buscar artículo de prueba
4. Hacer clic en el artículo
5. En el modal, ingresar:
   - Cantidad: **10 unidades**
   - Sucursal destino: **Sucursal A**
   - Observación: "Prueba MOV.STOCK - Flujo completo"
6. Hacer clic en **"Confirmar"** o **"Guardar"**

**Resultado Esperado:**
- [ ] ✅ Mensaje de éxito: "Pedido registrado exitosamente"
- [ ] ✅ Modal se cierra
- [ ] ✅ No hay errores en consola del navegador

**Verificación en Base de Datos:**
```sql
SELECT tipo, cantidad, id_art, descripcion, estado, sucursald, sucursalh, id_num
FROM pedidoitem
WHERE id_art = [ID_ARTICULO]
ORDER BY id_items DESC LIMIT 1;
```

**Resultado esperado:**
```
tipo: PE
cantidad: 10
estado: "Solicitado       " (con espacios)
sucursald: [Sucursal B]
sucursalh: [Sucursal A]
```

- [ ] ✅ Verificado en BD

---

#### PASO 1.2: Visualizar Pedido Pendiente de Envío

1. **Cerrar sesión** de Sucursal B
2. **Iniciar sesión** como usuario de **Sucursal A**
3. Navegar a: **MOV.STOCK → Envios de Stk. pendientes**

**Resultado Esperado:**
- [ ] ✅ Tabla muestra el pedido creado
- [ ] ✅ Estado: "Solicitado"
- [ ] ✅ Cantidad: 10
- [ ] ✅ De Sucursal: Sucursal B
- [ ] ✅ A Sucursal: Sucursal A

---

#### PASO 1.3: Confirmar Envío

1. **Seleccionar** el pedido (checkbox)
2. Ingresar comentario (opcional): "Enviado - Prueba"
3. Hacer clic en **"Enviar"**
4. Confirmar en el diálogo (si aparece)

**Resultado Esperado:**
- [ ] ✅ Mensaje de éxito: "Envio registrado exitosamente"
- [ ] ✅ El pedido desaparece de la lista de pendientes
- [ ] ✅ No hay errores

**Verificación en Base de Datos:**
```sql
-- Verificar que el estado cambió a "Solicitado-E"
SELECT estado FROM pedidoitem
WHERE id_art = [ID_ARTICULO]
ORDER BY id_items DESC LIMIT 2;
```

**Resultado esperado:**
```
Fila 1: estado = "Enviado        " (registro nuevo)
Fila 2: estado = "Solicitado-E   " (registro original actualizado)
```

- [ ] ✅ Verificado en BD

---

#### PASO 1.4: Verificar en Envíos Realizados

1. Navegar a: **MOV.STOCK → Envios de Stk. realizados**

**Resultado Esperado:**
- [ ] ✅ Tabla muestra el envío
- [ ] ✅ Estado: "Enviado"
- [ ] ✅ Cantidad: 10
- [ ] ✅ Usuario que envió: [nombre usuario Sucursal A]

---

#### PASO 1.5: Visualizar Pedido Pendiente de Recepción

1. **Cerrar sesión** de Sucursal A
2. **Iniciar sesión** como usuario de **Sucursal B**
3. Navegar a: **MOV.STOCK → Pedidos de Stk. pendientes**

**Resultado Esperado:**
- [ ] ✅ Tabla muestra el pedido
- [ ] ✅ Estado: "Solicitado-E"
- [ ] ✅ Cantidad: 10
- [ ] ✅ De Sucursal: Sucursal B
- [ ] ✅ A Sucursal: Sucursal A

---

#### PASO 1.6: Confirmar Recepción

1. **Seleccionar** el pedido (checkbox)
2. Ingresar comentario: "Recibido conforme - Prueba"
3. Hacer clic en **"Recibir"**
4. Confirmar en el diálogo (si aparece)

**Resultado Esperado:**
- [ ] ✅ Mensaje de éxito: "Pedido registrado exitosamente"
- [ ] ✅ El pedido desaparece de la lista de pendientes
- [ ] ✅ No hay errores

**⚠️ CRÍTICO - Verificación de Estados:**
```sql
-- Verificar estados finales
SELECT id_items, estado, cantidad, id_num
FROM pedidoitem
WHERE id_art = [ID_ARTICULO]
ORDER BY id_items DESC LIMIT 3;
```

**Resultado esperado:**
```
Fila 1: estado = "Recibido       " (registro nuevo)
Fila 2: estado = "Enviado        " (registro de envío)
Fila 3: estado = "Recibido       " (registro original - ¡NO "Solicitado-R"!)
```

- [ ] ✅ **CRÍTICO:** Registro original tiene estado "Recibido" (NO "Solicitado-R")
- [ ] ✅ Verificado en BD

---

#### PASO 1.7: Verificar en Pedidos Recibidos

1. Navegar a: **MOV.STOCK → Pedidos de Stk. recibidos**

**Resultado Esperado:**
- [ ] ✅ Tabla muestra el pedido recibido
- [ ] ✅ Estado: "Recibido"
- [ ] ✅ Cantidad: 10
- [ ] ✅ Visible en la tabla (componente funciona correctamente)

---

#### PASO 1.8: Verificar Actualización de Stock

**⚠️ CRÍTICO - Verificación de Stock:**

```sql
-- Verificar que el stock se actualizó correctamente
SELECT
    idart,
    nomart,
    exi1, exi2, exi3, exi4, exi5
FROM artsucursal
WHERE idart = [ID_ARTICULO];
```

**Cálculo Esperado:**

| Sucursal | Stock Inicial | Operación | Stock Final |
|----------|---------------|-----------|-------------|
| Sucursal A (Origen) | _____ | -10 | **_____ - 10 = _____** |
| Sucursal B (Destino) | _____ | +10 | **_____ + 10 = _____** |

**Resultado en BD:**
```
Sucursal A (exi[X]): _____ (debe ser stock inicial - 10)
Sucursal B (exi[Y]): _____ (debe ser stock inicial + 10)
```

- [ ] ✅ **CRÍTICO:** Stock Sucursal A disminuyó en 10
- [ ] ✅ **CRÍTICO:** Stock Sucursal B aumentó en 10
- [ ] ✅ Stocks verificados manualmente en BD

---

### ✅ RESULTADO PRUEBA 1

- [ ] ✅ **PRUEBA 1 COMPLETADA EXITOSAMENTE**
- [ ] ❌ **PRUEBA 1 FALLÓ** - Detalles: `_______________________`

**Tiempo de ejecución:** _______ minutos

---

## Pruebas de Validación

---

### 🧪 PRUEBA 2: Validación de Stock Insuficiente en Envío (P3)

**Objetivo:** Validar que el sistema NO permite enviar si no hay stock suficiente.

**Precondición:**
- Sucursal A tiene stock limitado (ej: 5 unidades)
- Sucursal B solicita más de lo disponible (ej: 20 unidades)

#### PASO 2.1: Crear Solicitud con Cantidad Mayor al Stock

1. **Iniciar sesión** como usuario de **Sucursal B**
2. Navegar a: **MOV.STOCK → Pedir Stock**
3. Crear solicitud:
   - Cantidad: **20 unidades** (mayor al stock de Sucursal A)
   - Sucursal destino: **Sucursal A**
   - Observación: "Prueba validación stock insuficiente"
4. Confirmar

**Resultado Esperado:**
- [ ] ✅ Pedido creado correctamente (aún no se valida stock)

---

#### PASO 2.2: Intentar Confirmar Envío Sin Stock Suficiente

1. **Cerrar sesión** de Sucursal B
2. **Iniciar sesión** como usuario de **Sucursal A**
3. Navegar a: **MOV.STOCK → Envios de Stk. pendientes**
4. Seleccionar el pedido de 20 unidades
5. Hacer clic en **"Enviar"**

**Resultado Esperado:**
- [ ] ✅ **Mensaje de error:** "Error: Stock insuficiente en sucursal origen. Disponible: 5, Solicitado: 20"
- [ ] ✅ El envío NO se registra
- [ ] ✅ El pedido permanece en estado "Solicitado"

**Verificación en Base de Datos:**
```sql
SELECT estado FROM pedidoitem
WHERE id_art = [ID_ARTICULO]
ORDER BY id_items DESC LIMIT 1;
```

**Resultado esperado:**
```
estado: "Solicitado       " (sin cambios)
```

- [ ] ✅ Estado sigue siendo "Solicitado"
- [ ] ✅ NO se creó registro con estado "Enviado"

**Verificación de Stock:**
```sql
SELECT exi[X] FROM artsucursal WHERE idart = [ID_ARTICULO];
```

- [ ] ✅ **CRÍTICO:** Stock NO cambió (permanece en 5)

---

### ✅ RESULTADO PRUEBA 2

- [ ] ✅ **PRUEBA 2 COMPLETADA EXITOSAMENTE** - Validación funciona correctamente
- [ ] ❌ **PRUEBA 2 FALLÓ** - Detalles: `_______________________`

**Tiempo de ejecución:** _______ minutos

---

### 🧪 PRUEBA 3: Validación de Stock Insuficiente en Recepción (P2)

**Objetivo:** Validar que el sistema NO permite recibir si la sucursal origen no tiene stock.

**Precondición:**
- Crear un pedido y enviarlo normalmente
- Reducir manualmente el stock de la sucursal origen en la BD

#### PASO 3.1: Crear y Enviar Pedido Normal

1. Crear pedido de 10 unidades (Sucursal B → Sucursal A)
2. Confirmar envío desde Sucursal A
3. Verificar que estado es "Solicitado-E"

**Resultado Esperado:**
- [ ] ✅ Pedido en estado "Solicitado-E"

---

#### PASO 3.2: Reducir Stock Manualmente en BD

**⚠️ Esta prueba requiere acceso directo a la BD:**

```sql
-- Reducir el stock de Sucursal A a 0 (o menos de 10)
UPDATE artsucursal
SET exi[X] = 0
WHERE idart = [ID_ARTICULO];
```

- [ ] ✅ Stock de Sucursal A reducido a 0

---

#### PASO 3.3: Intentar Recibir el Pedido

1. **Iniciar sesión** como usuario de **Sucursal B**
2. Navegar a: **MOV.STOCK → Pedidos de Stk. pendientes**
3. Seleccionar el pedido
4. Hacer clic en **"Recibir"**

**Resultado Esperado:**
- [ ] ✅ **Mensaje de error:** "Error: Stock insuficiente en sucursal origen para completar la recepción"
- [ ] ✅ La recepción NO se registra
- [ ] ✅ Estado permanece en "Solicitado-E"

**Verificación en Base de Datos:**
```sql
SELECT estado, cantidad FROM pedidoitem
WHERE id_art = [ID_ARTICULO]
ORDER BY id_items DESC LIMIT 1;
```

**Resultado esperado:**
```
estado: "Solicitado-E    " (sin cambios)
```

- [ ] ✅ Estado sigue siendo "Solicitado-E"
- [ ] ✅ NO se creó registro con estado "Recibido"

**Verificación de Stock:**
```sql
SELECT exi[X], exi[Y] FROM artsucursal WHERE idart = [ID_ARTICULO];
```

- [ ] ✅ **CRÍTICO:** Stock de ambas sucursales NO cambió

---

#### PASO 3.4: Restaurar Stock y Completar Recepción

**Restaurar stock en BD:**
```sql
UPDATE artsucursal
SET exi[X] = 50  -- Valor original o suficiente
WHERE idart = [ID_ARTICULO];
```

**Intentar recibir nuevamente:**
1. Hacer clic en **"Recibir"** nuevamente

**Resultado Esperado:**
- [ ] ✅ Mensaje de éxito
- [ ] ✅ Stock se actualiza correctamente
- [ ] ✅ Estado: "Recibido"

---

### ✅ RESULTADO PRUEBA 3

- [ ] ✅ **PRUEBA 3 COMPLETADA EXITOSAMENTE** - Validación funciona correctamente
- [ ] ❌ **PRUEBA 3 FALLÓ** - Detalles: `_______________________`

**Tiempo de ejecución:** _______ minutos

---

## Pruebas de Estados

---

### 🧪 PRUEBA 4: Transiciones de Estados

**Objetivo:** Verificar que los estados cambian correctamente en cada paso.

#### PASO 4.1: Verificar Estado "Solicitado"

1. Crear un nuevo pedido
2. Verificar en BD:

```sql
SELECT estado FROM pedidoitem
WHERE id_num = (SELECT MAX(id_num) FROM pedidoitem WHERE tipo = 'PE');
```

**Resultado esperado:**
```
estado: "Solicitado       "
```

- [ ] ✅ Estado inicial correcto

---

#### PASO 4.2: Verificar Estado "Solicitado-E"

1. Confirmar envío del pedido
2. Verificar en BD:

```sql
SELECT id_items, estado FROM pedidoitem
WHERE id_num = [ID_NUM_DEL_PEDIDO]
ORDER BY id_items DESC LIMIT 2;
```

**Resultado esperado:**
```
Fila 1: estado = "Enviado        " (nuevo)
Fila 2: estado = "Solicitado-E   " (original)
```

- [ ] ✅ Registro original cambió a "Solicitado-E"
- [ ] ✅ Se creó nuevo registro con "Enviado"

---

#### PASO 4.3: Verificar Estado "Recibido"

1. Confirmar recepción del pedido
2. Verificar en BD:

```sql
SELECT id_items, estado FROM pedidoitem
WHERE id_num = [ID_NUM_DEL_PEDIDO]
ORDER BY id_items DESC LIMIT 3;
```

**Resultado esperado:**
```
Fila 1: estado = "Recibido       " (nuevo)
Fila 2: estado = "Enviado        " (envío)
Fila 3: estado = "Recibido       " (original - ¡NO "Solicitado-R"!)
```

- [ ] ✅ **CRÍTICO:** Registro original tiene "Recibido", NO "Solicitado-R"

---

#### PASO 4.4: Verificar Estados en pedidoscb

```sql
SELECT id_num, estado FROM pedidoscb
WHERE id_num = [ID_NUM_DEL_PEDIDO]
ORDER BY id_num DESC LIMIT 3;
```

**Resultado esperado:**
```
Mismos estados que pedidoitem
```

- [ ] ✅ Estados consistentes entre pedidoitem y pedidoscb

---

### ✅ RESULTADO PRUEBA 4

- [ ] ✅ **PRUEBA 4 COMPLETADA EXITOSAMENTE** - Todos los estados correctos
- [ ] ❌ **PRUEBA 4 FALLÓ** - Detalles: `_______________________`

**Tiempo de ejecución:** _______ minutos

---

## Pruebas de Stock

---

### 🧪 PRUEBA 5: Actualización Correcta de Stock

**Objetivo:** Validar cálculos de stock en diferentes escenarios.

#### Escenario 5.1: Transferencia Simple

**Datos iniciales:**
- Sucursal A: 100 unidades
- Sucursal B: 20 unidades
- Transferir: 15 unidades (A → B)

**Operación:**
1. Crear, enviar y recibir pedido de 15 unidades

**Resultado esperado:**
```
Sucursal A: 100 - 15 = 85 unidades
Sucursal B: 20 + 15 = 35 unidades
```

- [ ] ✅ Stock Sucursal A = 85
- [ ] ✅ Stock Sucursal B = 35

---

#### Escenario 5.2: Transferencia a Sucursal Sin Stock

**Datos iniciales:**
- Sucursal A: 50 unidades
- Sucursal C: 0 unidades
- Transferir: 10 unidades (A → C)

**Operación:**
1. Crear, enviar y recibir pedido de 10 unidades

**Resultado esperado:**
```
Sucursal A: 50 - 10 = 40 unidades
Sucursal C: 0 + 10 = 10 unidades
```

- [ ] ✅ Stock Sucursal A = 40
- [ ] ✅ Stock Sucursal C = 10

---

#### Escenario 5.3: Múltiples Transferencias Consecutivas

**Datos iniciales:**
- Sucursal A: 80 unidades

**Operación 1:** Enviar 20 unidades a Sucursal B
**Operación 2:** Enviar 15 unidades a Sucursal C
**Operación 3:** Enviar 10 unidades a Sucursal D

**Resultado esperado:**
```
Sucursal A: 80 - 20 - 15 - 10 = 35 unidades
Sucursal B: inicial + 20
Sucursal C: inicial + 15
Sucursal D: inicial + 10
```

- [ ] ✅ Stock Sucursal A = 35
- [ ] ✅ Todos los stocks correctos

---

### ✅ RESULTADO PRUEBA 5

- [ ] ✅ **PRUEBA 5 COMPLETADA EXITOSAMENTE** - Stock se calcula correctamente
- [ ] ❌ **PRUEBA 5 FALLÓ** - Detalles: `_______________________`

**Tiempo de ejecución:** _______ minutos

---

## Pruebas de Errores

---

### 🧪 PRUEBA 6: Validación de Estado Incorrecto

**Objetivo:** Verificar que solo se pueden recibir pedidos en estado "Solicitado-E".

#### PASO 6.1: Intentar Recibir Pedido en Estado "Solicitado"

1. Crear un pedido (estado "Solicitado")
2. SIN confirmar envío, intentar ir a "Pedidos de Stk. pendientes"
3. Intentar hacer clic en "Recibir"

**Resultado Esperado:**
- [ ] ✅ El pedido NO aparece en la lista (filtro correcto)
- [ ] ✅ O mensaje: "El pedido debe estar en estado 'Solicitado-E' para poder recibirlo"

---

### 🧪 PRUEBA 7: Validación de Artículo No Existente

**Objetivo:** Verificar que el sistema maneja artículos inexistentes.

#### PASO 7.1: Intentar Enviar Artículo Inexistente

**Nota:** Esta prueba requiere manipulación de BD o creación de pedido con idart inválido.

```sql
-- Crear pedido con idart que no existe en artsucursal
INSERT INTO pedidoitem (tipo, cantidad, id_art, descripcion, precio, fecha_resuelto, usuario_res, observacion, estado)
VALUES ('PE', 10, 999999, 'Artículo Inexistente', 100, NOW(), 'test', 'Prueba', 'Solicitado')
RETURNING id_items;
```

**Resultado Esperado al intentar enviar:**
- [ ] ✅ Mensaje de error: "Error: El artículo no existe en el catálogo"
- [ ] ✅ No se crea el envío

---

### 🧪 PRUEBA 8: Rollback de Transacción

**Objetivo:** Verificar que si hay error, no se guardan cambios parciales.

#### PASO 8.1: Simular Error Durante Recepción

Esta prueba es difícil de hacer manualmente, pero se puede verificar revisando:
1. Si ocurre un error durante la recepción
2. Verificar que:
   - [ ] ✅ NO se actualizó el stock
   - [ ] ✅ NO cambió el estado
   - [ ] ✅ NO se creó registro nuevo

---

### ✅ RESULTADO PRUEBAS DE ERRORES

- [ ] ✅ **PRUEBAS 6-8 COMPLETADAS EXITOSAMENTE**
- [ ] ❌ **ALGUNA PRUEBA FALLÓ** - Detalles: `_______________________`

**Tiempo de ejecución:** _______ minutos

---

## Pruebas de Componentes

---

### 🧪 PRUEBA 9: Visualización en Todos los Componentes

**Objetivo:** Verificar que todos los componentes muestran los datos correctamente.

#### Componente: Pedir Stock
- [ ] ✅ Muestra artículos con lazy loading
- [ ] ✅ Permite buscar y filtrar
- [ ] ✅ Modal de solicitud funciona
- [ ] ✅ Crea pedidos correctamente

#### Componente: Enviar Stock
- [ ] ✅ Similar a Pedir Stock
- [ ] ✅ Modal de envío funciona

#### Componente: Pedidos de Stk. pendientes
- [ ] ✅ Muestra solo pedidos en estado "Solicitado-E"
- [ ] ✅ Permite recibir pedidos
- [ ] ✅ Validación de estado funciona

#### Componente: Pedidos de Stk. recibidos
- [ ] ✅ **CRÍTICO:** Muestra pedidos con estado "Recibido"
- [ ] ✅ Componente NO está vacío
- [ ] ✅ Muestra todos los pedidos recibidos

#### Componente: Envios de Stk. pendientes
- [ ] ✅ Muestra pedidos en estado "Solicitado"
- [ ] ✅ Permite enviar
- [ ] ✅ Validación de stock funciona

#### Componente: Envios de Stk. realizados
- [ ] ✅ Muestra envíos con estado "Enviado"
- [ ] ✅ Solo lectura

---

### ✅ RESULTADO PRUEBA 9

- [ ] ✅ **PRUEBA 9 COMPLETADA EXITOSAMENTE** - Todos los componentes funcionan
- [ ] ❌ **PRUEBA 9 FALLÓ** - Detalles: `_______________________`

**Tiempo de ejecución:** _______ minutos

---

## Checklist Final

### ✅ Funcionalidad Core
- [ ] ✅ Crear pedido funciona
- [ ] ✅ Enviar pedido funciona
- [ ] ✅ Recibir pedido funciona
- [ ] ✅ Flujo completo funciona de principio a fin

### ✅ Actualización de Stock (P2)
- [ ] ✅ Stock se suma en sucursal destino
- [ ] ✅ Stock se resta en sucursal origen
- [ ] ✅ Cálculos son correctos
- [ ] ✅ No se permite recibir sin stock suficiente en origen

### ✅ Validación de Stock (P3)
- [ ] ✅ No se permite enviar sin stock suficiente
- [ ] ✅ Mensaje de error es claro
- [ ] ✅ Validación ocurre en el backend

### ✅ Estados
- [ ] ✅ **CRÍTICO:** Estado final es "Recibido" (NO "Solicitado-R")
- [ ] ✅ Transiciones de estados correctas
- [ ] ✅ Componente stockrecibo muestra pedidos

### ✅ Componentes
- [ ] ✅ Todos los componentes cargan
- [ ] ✅ Filtros funcionan correctamente
- [ ] ✅ Modales funcionan
- [ ] ✅ No hay errores en consola

### ✅ Seguridad y Errores
- [ ] ✅ Transacciones hacen rollback en caso de error
- [ ] ✅ Validaciones de estado funcionan
- [ ] ✅ Mensajes de error son descriptivos

---

## Registro de Resultados

### Resumen de Ejecución

| Prueba | Estado | Tiempo | Observaciones |
|--------|--------|--------|---------------|
| Prueba 1: Flujo Completo | ⬜ | ___ min | |
| Prueba 2: Stock Insuficiente Envío | ⬜ | ___ min | |
| Prueba 3: Stock Insuficiente Recepción | ⬜ | ___ min | |
| Prueba 4: Transiciones de Estados | ⬜ | ___ min | |
| Prueba 5: Actualización de Stock | ⬜ | ___ min | |
| Prueba 6: Validación Estado | ⬜ | ___ min | |
| Prueba 7: Artículo Inexistente | ⬜ | ___ min | |
| Prueba 8: Rollback | ⬜ | ___ min | |
| Prueba 9: Componentes | ⬜ | ___ min | |

**Leyenda:**
- ⬜ No ejecutado
- ✅ Exitoso
- ❌ Fallido
- ⚠️ Exitoso con observaciones

---

### Resultado Final

**Fecha de Ejecución:** _______________________
**Ejecutado por:** _______________________
**Tiempo total:** _______ minutos

#### Estado General
- [ ] ✅ **TODAS LAS PRUEBAS EXITOSAS - SISTEMA LISTO PARA PRODUCCIÓN**
- [ ] ⚠️ **PRUEBAS EXITOSAS CON OBSERVACIONES MENORES**
- [ ] ❌ **HAY ERRORES CRÍTICOS - REQUIERE CORRECCIÓN**

---

### Problemas Encontrados

**Si se encontraron problemas, documentar aquí:**

#### Problema 1
- **Descripción:** _______________________
- **Prueba:** _______________________
- **Severidad:** [ ] Crítico [ ] Alto [ ] Medio [ ] Bajo
- **Pasos para reproducir:** _______________________

#### Problema 2
- **Descripción:** _______________________
- **Prueba:** _______________________
- **Severidad:** [ ] Crítico [ ] Alto [ ] Medio [ ] Bajo
- **Pasos para reproducir:** _______________________

#### Problema 3
- **Descripción:** _______________________
- **Prueba:** _______________________
- **Severidad:** [ ] Crítico [ ] Alto [ ] Medio [ ] Bajo
- **Pasos para reproducir:** _______________________

---

### Notas Adicionales

_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________

---

## Anexo: Consultas SQL Útiles

### Verificar Estado Actual del Sistema

```sql
-- Ver todos los pedidos de tipo PE
SELECT
    pi.id_items,
    pi.tipo,
    pi.cantidad,
    pi.id_art,
    pi.estado,
    pi.fecha_resuelto,
    pc.sucursald,
    pc.sucursalh,
    pi.id_num
FROM pedidoitem pi
LEFT JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pi.tipo = 'PE'
ORDER BY pi.id_items DESC
LIMIT 20;
```

### Verificar Stock de Artículo

```sql
-- Ver stock de todas las sucursales para un artículo
SELECT
    idart,
    nomart,
    exi1 as "Suc 1",
    exi2 as "Suc 2",
    exi3 as "Suc 3",
    exi4 as "Suc 4",
    exi5 as "Suc 5"
FROM artsucursal
WHERE idart = [ID_ARTICULO];
```

### Contar Pedidos por Estado

```sql
-- Ver cantidad de pedidos en cada estado
SELECT
    TRIM(estado) as estado,
    COUNT(*) as cantidad
FROM pedidoitem
WHERE tipo = 'PE'
GROUP BY TRIM(estado)
ORDER BY cantidad DESC;
```

### Verificar Integridad de Datos

```sql
-- Buscar pedidos con estado "Solicitado-R" (NO debería existir ninguno)
SELECT COUNT(*) as count_solicitado_r
FROM pedidoitem
WHERE estado = 'Solicitado-R';

-- Resultado esperado: 0
```

```sql
-- Verificar que todos los pedidos "Recibido" tienen sus registros completos
SELECT
    pi.id_num,
    COUNT(DISTINCT pi.estado) as estados_diferentes,
    STRING_AGG(DISTINCT TRIM(pi.estado), ', ') as estados
FROM pedidoitem pi
WHERE pi.tipo = 'PE'
  AND pi.id_num IN (
      SELECT id_num FROM pedidoitem WHERE TRIM(estado) = 'Recibido'
  )
GROUP BY pi.id_num
ORDER BY pi.id_num DESC;

-- Cada id_num con estado "Recibido" debería tener 3 estados:
-- "Solicitado", "Solicitado-E" (o "Enviado"), "Recibido"
```

---

## Recomendaciones Post-Pruebas

### Si TODO funciona correctamente ✅

1. **Documentar** este resultado
2. **Comunicar** al equipo que el sistema está listo
3. **Capacitar** a usuarios finales
4. **Monitorear** primeras transacciones reales
5. **Considerar** implementar mejoras de prioridad media (P4, P5, P6)

### Si hay problemas ❌

1. **Documentar** el error con capturas de pantalla
2. **Verificar** que el archivo `Descarga.php.txt` se subió correctamente al servidor
3. **Revisar** logs del servidor
4. **Verificar** consola del navegador
5. **Contactar** con el equipo de desarrollo

---

**Fin del Plan de Pruebas**

---

**Notas:**
- Este documento debe ser ejecutado por al menos 2 personas diferentes
- Se recomienda hacer backup de la BD antes de ejecutar
- Documentar cualquier comportamiento inesperado
- Las pruebas deben ejecutarse en un entorno de testing antes de producción (si está disponible)
