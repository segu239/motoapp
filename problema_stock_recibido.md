# Informe de Diagnóstico: Problema de Visualización en Pedidos de Stock Recibidos

**Fecha:** 1 de Noviembre de 2025
**Analista:** Claude Code
**Prioridad:** 🔴 ALTA - Problema funcional crítico

---

## ⚠️ NOTA IMPORTANTE - DOCUMENTO ACTUALIZADO

**Este documento fue validado contra `movstock.md` y se descubrió que:**

1. ✅ El diagnóstico es **CORRECTO** - el problema existe y está confirmado
2. ✅ La infraestructura necesaria **YA EXISTE** en el sistema
3. ✅ La solución es **MUCHO MÁS SIMPLE** de lo originalmente propuesto
4. ✅ **Tiempo real:** 15-25 minutos (vs 5-9 horas inicialmente estimadas)

**Ver sección 8 para la solución simplificada actualizada.**

**Documentos relacionados:**
- `validacion_diagnostico.md` - Informe detallado de validación

---

## 1. RESUMEN EJECUTIVO

Se identificó un problema crítico en el módulo MOV.STOCK que impide visualizar correctamente los pedidos enviados en la sección "Pedidos de Stk. recibidos". Cuando una sucursal recibe un envío de otra sucursal, el pedido no aparece en su vista de recibidos, generando confusión operativa y falta de visibilidad sobre inventario en tránsito.

### Caso Reportado
- **Sucursal Origen:** Casa Central (cod_sucursal 1, stock en exi2)
- **Sucursal Destino:** Güemes (cod_sucursal 3, stock en exi4)
- **Acción:** Casa Central solicita 20 unidades → Güemes envía 20 unidades
- **Problema:** Casa Central NO ve el envío en "Pedidos de Stk. recibidos"

### Resultado del Diagnóstico
- ✅ **Problema confirmado:** Casa Central debería ver 4 pedidos en estado "Enviado" pero actualmente ve 0
- ✅ **Causa raíz identificada:** Filtro incorrecto en componente frontend
- ✅ **Infraestructura disponible:** Función backend y servicio frontend ya existen
- ✅ **Solución:** Cambiar 1 línea en componente para usar función correcta (15-25 minutos)

---

## 2. MAPEO CORRECTO DE SUCURSALES Y STOCK

### 2.1 Correspondencia Sucursales → Campos de Stock

```
cod_sucursal | Nombre Sucursal      | Campo Stock | Descripción
-------------|----------------------|-------------|---------------------------
1            | MOTO MATCH I         | exi2        | Casa Central
2            | MOTOMATCH II         | exi3        | Valle Viejo
3            | MOTO MATCH III       | exi4        | Güemes
4            | MOTO MATCH IV        | exi1        | Depósito
5            | MOTO MATCH DEPOSITO  | exi5        | Mayorista
```

### 2.2 Verificación del Backend

El backend **YA TIENE** el mapeo correcto implementado en `Descarga.php.txt:1729-1735`:

```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central ✅
    2 => 'exi3', // Valle Viejo ✅
    3 => 'exi4', // Güemes ✅
    4 => 'exi1', // Deposito ✅
    5 => 'exi5'  // Mayorista ✅
];
```

**Conclusión:** La actualización automática de stock funciona correctamente. El problema está únicamente en la visualización de pedidos recibidos.

---

## 3. ANÁLISIS DE LA BASE DE DATOS

### 3.1 Datos del Pedido de Prueba

```sql
-- Pedido ORIGINAL (Casa Central solicita a Güemes)
id_items: 80
estado: "Solicitado-E"
cantidad: 20.00
descripcion: "ACEL. RAP. MDA 3010 6470"
sucursald: 1  (Casa Central - quien solicita)
sucursalh: 3  (Güemes - a quien se solicita)
fecha: 2025-11-01
id_num: 68

-- Registro de ENVÍO (Güemes envía a Casa Central)
id_items: 81
estado: "Enviado"
cantidad: 20.00
descripcion: "ACEL. RAP. MDA 3010 6470"
sucursald: 3  (Güemes - quien envía) ← SE INVIERTE
sucursalh: 1  (Casa Central - quien recibe) ← SE INVIERTE
fecha: 2025-11-01
id_num: 69
usuario: "luis"
```

### 3.2 Comparación de Filtros (Prueba SQL)

#### Query 1: Filtro CORRECTO (lo que Casa Central DEBERÍA ver)
```sql
SELECT * FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pc.sucursalh = 1  -- Casa Central es DESTINO
  AND TRIM(pi.estado) IN ('Enviado', 'Recibido')
  AND pi.tipo = 'PE';
```

**Resultado:** ✅ **4 registros encontrados**
```
id_items | estado  | cantidad | origen | destino | descripción
---------|---------|----------|--------|---------|-------------
81       | Enviado | 20.00    | 3      | 1       | ACEL. RAP. MDA ← ESTE ES EL DE LA PRUEBA
71       | Enviado | 1.00     | 2      | 1       | ACEL. RAP. MDA
69       | Enviado | 1.00     | 2      | 1       | ACEL. RAP. MDA
67       | Enviado | 1.00     | 2      | 1       | ACEL. RAP. MDA
```

#### Query 2: Filtro INCORRECTO (lo que Casa Central VE actualmente)
```sql
SELECT * FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pc.sucursald = 1  -- Casa Central es ORIGEN
  AND TRIM(pi.estado) = 'Recibido'
  AND pi.tipo = 'PE';
```

**Resultado:** ❌ **0 registros** (array vacío)

---

## 4. ANÁLISIS DEL FLUJO DE ESTADOS

### 4.1 Flujo Completo del Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│ PASO 1: Casa Central (1) solicita a Güemes (3)                  │
├──────────────────────────────────────────────────────────────────┤
│ Componente: pedir-stock                                          │
│ Registro creado en BD:                                           │
│   id_items: 80                                                   │
│   tipo: "PE"                                                     │
│   estado: "Solicitado"                                           │
│   sucursald: 1 (Casa Central - quien solicita)                  │
│   sucursalh: 3 (Güemes - a quien se solicita)                   │
│   cantidad: 20                                                   │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ PASO 2: Güemes (3) ve el pedido pendiente                       │
├──────────────────────────────────────────────────────────────────┤
│ Componente: enviostockpendientes                                 │
│ Filtro: sucursalh = 3 AND estado = 'Solicitado'                 │
│ ✅ Encuentra: id_items 80                                        │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ PASO 3: Güemes (3) confirma envío                               │
├──────────────────────────────────────────────────────────────────┤
│ Componente: enviostockpendientes.enviar()                        │
│ Función backend: PedidoItemyCabIdEnvio_post()                    │
│                                                                  │
│ Actualiza registro ORIGINAL:                                     │
│   id_items: 80                                                   │
│   estado: "Solicitado" → "Solicitado-E"                         │
│                                                                  │
│ Crea NUEVO registro con roles INVERTIDOS:                        │
│   id_items: 81                                                   │
│   estado: "Enviado"                                              │
│   sucursald: 3 (Güemes - quien envía) ← INVERTIDO               │
│   sucursalh: 1 (Casa Central - quien recibe) ← INVERTIDO        │
│                                                                  │
│ ⚠️ Stock NO se actualiza aquí (se actualiza en recepción)       │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ PASO 4: Casa Central (1) busca en "Pedidos Stk. pendientes"     │
├──────────────────────────────────────────────────────────────────┤
│ Componente: stockpedido                                          │
│ Servicio: obtenerPedidoItemPorSucursal(1)                        │
│ Filtro backend: sucursald = 1                                    │
│ Filtro frontend: estado IN ['Solicitado', 'Solicitado-E', ...]  │
│                                                                  │
│ ✅ Encuentra: id_items 80 con estado "Solicitado-E"             │
│ ✅ FUNCIONA CORRECTAMENTE                                        │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ PASO 5: Casa Central (1) busca en "Pedidos Stk. recibidos"      │
├──────────────────────────────────────────────────────────────────┤
│ Componente: stockrecibo                                          │
│ Servicio: obtenerPedidoItemPorSucursal(1) ← ❌ INCORRECTO       │
│ Filtro backend: sucursald = 1 ← ❌ BUSCA EN LA COLUMNA INCORRECTA│
│ Filtro frontend: estado = 'Recibido'                             │
│                                                                  │
│ ❌ NO encuentra: id_items 81 porque tiene sucursald = 3         │
│ ❌ PROBLEMA CRÍTICO: Envíos no se visualizan                     │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Diagrama de Inversión de Roles

```
SOLICITUD                    ENVÍO                       RECEPCIÓN
(inicial)                    (Güemes envía)              (Casa Central recibe)

┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  id_items 80 │            │  id_items 80 │            │  id_items 82 │
│  estado:     │            │  estado:     │            │  estado:     │
│  "Solicitado"│  ──────►   │ "Solicitado-E│            │  "Recibido"  │
│              │            │              │            │              │
│ sucursald: 1 │            │ sucursald: 1 │            │ sucursald: 1 │
│ sucursalh: 3 │            │ sucursalh: 3 │            │ sucursalh: 3 │
└──────────────┘            └──────────────┘            └──────────────┘
                                    +                           +
                            ┌──────────────┐            ┌──────────────┐
                            │  id_items 81 │            │  id_items 81 │
                            │  estado:     │            │  estado:     │
                            │  "Enviado"   │            │  "Recibido"  │
                            │              │            │              │
                            │ sucursald: 3 │◄──INVERTIDO│ sucursald: 3 │
                            │ sucursalh: 1 │◄──INVERTIDO│ sucursalh: 1 │
                            └──────────────┘            └──────────────┘
```

---

## 5. ANÁLISIS DEL CÓDIGO

### 5.1 Componente: Pedidos de Stk. Pendientes ✅ (FUNCIONA CORRECTAMENTE)
**Archivo:** `stockpedido.component.ts:115-123`

```typescript
cargarPedidos() {
  this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
    const estadosVisibles = ['Solicitado', 'Solicitado-E', 'Cancel-Sol', 'Cancel-Rech', 'En-Revision'];
    this.pedidoItem = data.mensaje.filter((item: any) => estadosVisibles.includes(item.estado.trim()));
  });
}
```

**Análisis:**
- ✅ Usa `obtenerPedidoItemPorSucursal` → filtra por `sucursald`
- ✅ Muestra pedidos donde la sucursal es el SOLICITANTE (quien originó el pedido)
- ✅ **Funciona correctamente** para mostrar pedidos pendientes de recibir con estado "Solicitado-E"

---

### 5.2 Componente: Pedidos de Stk. Recibidos ❌ (PROBLEMA CRÍTICO)
**Archivo:** `stockrecibo.component.ts:111-117`

```typescript
cargarPedidos() {
  this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
    console.log(data);
    this.pedidoItem = data.mensaje.filter((item: any) => item.estado.trim() === 'Recibido');
    console.log(this.pedidoItem);
  });
}
```

**Análisis:**
- ❌ **PROBLEMA:** Usa `obtenerPedidoItemPorSucursal` que filtra por `sucursald`
- ❌ Busca registros donde `sucursald` = sucursal actual Y estado = "Recibido"
- ❌ **Pero:** Los registros con estado "Enviado" tienen `sucursald` = sucursal que ENVÍA (no la que recibe)
- ❌ **Resultado:** NO muestra envíos pendientes de confirmar recepción

---

### 5.3 Backend: Función PedidoItemsPorSucursal (Usada incorrectamente)
**Archivo:** `Carga.php.txt:920-950`

```php
public function PedidoItemsPorSucursal_post() {
    $data = $this->post();
    $sucursal = isset($data["sucursal"]) ? $data["sucursal"] : null;

    try {
        $this->db->select('pi.*, pc.sucursalh, pc.sucursald');
        $this->db->from('pedidoitem AS pi');
        $this->db->join('pedidoscb AS pc', 'pi.id_num = pc.id_num', 'inner');
        $this->db->where('pc.sucursald', $sucursal); // ← Filtra por SUCURSAL ORIGEN

        $query = $this->db->get();
        $resp = $query->result_array();
        // ...
    }
}
```

**Análisis:**
- Filtra por `pc.sucursald = $sucursal`
- Esto significa: "pedidos que ORIGINAN de esta sucursal"
- ✅ Correcto para "Pedidos Pendientes" (donde la sucursal es quien solicita)
- ❌ **Incorrecto** para "Pedidos Recibidos" (donde la sucursal debería ser quien recibe → `sucursalh`)

---

### 5.4 Backend: Lógica de Inversión en Envío
**Archivo:** `enviostockpendientes.component.ts:280-281`

```typescript
// Cuando se envía, se invierten los roles
nuevoPedidoscb.sucursald = this.sucursal; // Quien ENVÍA (Güemes = 3)
nuevoPedidoscb.sucursalh = selectedPedido.sucursald; // Quien RECIBE (Casa Central = 1)
```

**Archivo:** `Descarga.php.txt:1800-1850` (PedidoItemyCabIdEnvio_post)

```php
// Crea nuevo registro con roles invertidos
INSERT INTO pedidoscb (tipo, sucursald, sucursalh, ...) VALUES (...)
// sucursald = quien envía
// sucursalh = quien recibe
```

---

## 6. CAUSA RAÍZ DEL PROBLEMA

### 6.1 Confusión Semántica de Columnas

El sistema tiene una **inconsistencia semántica** en el uso de `sucursald` y `sucursalh`:

| Etapa del Flujo | sucursald | sucursalh |
|----------------|-----------|-----------|
| **Solicitud inicial** | Quien SOLICITA (origen de la solicitud) | A quien se solicita |
| **Envío** | Quien ENVÍA (origen del producto) | Quien RECIBE (destino del producto) |
| **Recepción** | Quien RECIBE (confirma) | Quien ENVIÓ |

### 6.2 Problema de Filtrado

**El componente `stockrecibo` debería:**
- Mostrar pedidos donde la sucursal actual es el **DESTINO** (quien recibe)
- Filtrar por `sucursalh` cuando el estado es "Enviado"
- Mostrar ambos: "Enviado" (pendiente de confirmar) y "Recibido" (confirmado)

**Pero actualmente:**
- Filtra por `sucursald` (sucursal origen)
- Solo muestra estado "Recibido"
- Ignora completamente el estado "Enviado" que está listo para recibir

---

## 7. IMPACTO DEL PROBLEMA

### 7.1 Impacto Operativo
- 🔴 **Crítico:** Casa Central tiene actualmente 4 envíos pendientes que NO PUEDE VER
- 🔴 **Crítico:** No hay forma de confirmar recepción desde la vista de "recibidos"
- 🟡 **Medio:** Genera confusión y requerimientos de verificación manual
- 🟡 **Medio:** Pedidos quedan atascados en estado "Enviado" sin posibilidad de confirmación

### 7.2 Pedidos Afectados Actualmente en Casa Central (1)

```
id_items | Origen Sucursal | Cantidad | Estado  | Fecha
---------|-----------------|----------|---------|------------
81       | Güemes (3)      | 20.00    | Enviado | 2025-11-01  ← PRUEBA REPORTADA
71       | Valle Viejo (2) | 1.00     | Enviado | 2025-10-31
69       | Valle Viejo (2) | 1.00     | Enviado | 2025-10-31
67       | Valle Viejo (2) | 1.00     | Enviado | 2025-10-31
```

**Total:** 4 envíos invisibles, 23 unidades en tránsito sin visibilidad

---

## 8. SOLUCIÓN RECOMENDADA

### 8.1 ✅ Solución Simple: Usar Infraestructura Existente (RECOMENDADO)

**¡IMPORTANTE!** La infraestructura necesaria **YA EXISTE** en el sistema. No es necesario crear nuevas funciones.

#### Descubrimiento Durante Validación

**Backend - Función Existente:** `Carga.php.txt:965-995`
```php
// ✅ ESTA FUNCIÓN YA EXISTE
public function PedidoItemsPorSucursalh_post() {
    $data = $this->post();
    $sucursal = isset($data["sucursal"]) ? $data["sucursal"] : null;

    try {
        $this->db->select('pi.*, pc.sucursalh, pc.sucursald');
        $this->db->from('pedidoitem AS pi');
        $this->db->join('pedidoscb AS pc', 'pi.id_num = pc.id_num', 'inner');
        $this->db->where('pc.sucursalh', $sucursal); // ← Filtra por sucursalh ✅

        $query = $this->db->get();
        $resp = $query->result_array();
        // ... retorna resultados
    }
}
```

**Frontend - Servicio Existente:** `cargardata.service.ts:220-223`
```typescript
// ✅ ESTE SERVICIO YA EXISTE
obtenerPedidoItemPorSucursalh(sucursal: string) {
  return this.http.post(UrlPedidoItemPorSucursalh, {
    "sucursal": sucursal
  });
}
```

**URL ya configurada:** `ini.ts:822`
```typescript
// ✅ ESTA URL YA ESTÁ CONFIGURADA
export const UrlPedidoItemPorSucursalh = 'http://api.motoapp.com/Carga/PedidoItemsPorSucursalh';
```

#### Solución: Un Solo Cambio

**Archivo:** `src/app/components/stockrecibo/stockrecibo.component.ts:111-117`

**❌ CÓDIGO ACTUAL (INCORRECTO):**
```typescript
cargarPedidos() {
  this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {
    console.log(data);
    this.pedidoItem = data.mensaje.filter((item: any) => item.estado.trim() === 'Recibido');
    console.log(this.pedidoItem);
  });
}
```

**✅ CÓDIGO CORREGIDO (CORRECTO):**
```typescript
cargarPedidos() {
  // CAMBIO: Usar obtenerPedidoItemPorSucursalh en lugar de obtenerPedidoItemPorSucursal
  this._cargardata.obtenerPedidoItemPorSucursalh(this.sucursal).subscribe((data: any) => {
    console.log(data);
    // CAMBIO: Filtrar por múltiples estados y validar que data.mensaje es array
    if (Array.isArray(data.mensaje)) {
      this.pedidoItem = data.mensaje.filter((item: any) => {
        const estado = item.estado.trim();
        return estado === 'Enviado' || estado === 'Recibido';
      });
    } else {
      this.pedidoItem = [];
    }
    console.log(this.pedidoItem);
  });
}
```

#### Resumen de Cambios

| Aspecto | Cantidad |
|---------|----------|
| **Archivos a modificar** | 1 archivo |
| **Líneas modificadas** | 1 línea (cambio de función) + ajuste de filtro (5 líneas) |
| **Backend nuevo** | ❌ No necesario |
| **Servicios nuevos** | ❌ No necesario |
| **URLs nuevas** | ❌ No necesario |

---

## 9. PLAN DE IMPLEMENTACIÓN SIMPLIFICADO

### Fase 1: Corrección Básica ⚙️ (5-10 minutos)

**Paso 1:** Editar `stockrecibo.component.ts`
```bash
# Abrir archivo
C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\stockrecibo\stockrecibo.component.ts
```

**Paso 2:** Cambiar línea 112
```typescript
// Buscar línea 112 (aproximadamente)
// CAMBIAR:
this._cargardata.obtenerPedidoItemPorSucursal(this.sucursal).subscribe((data: any) => {

// POR:
this._cargardata.obtenerPedidoItemPorSucursalh(this.sucursal).subscribe((data: any) => {
```

**Paso 3:** Actualizar filtro de estados (líneas 114-116)
```typescript
// CAMBIAR:
this.pedidoItem = data.mensaje.filter((item: any) => item.estado.trim() === 'Recibido');

// POR:
if (Array.isArray(data.mensaje)) {
  this.pedidoItem = data.mensaje.filter((item: any) => {
    const estado = item.estado.trim();
    return estado === 'Enviado' || estado === 'Recibido';
  });
} else {
  this.pedidoItem = [];
}
```

**Paso 4:** Guardar archivo

### Fase 2: Pruebas Rápidas 🧪 (10-15 minutos)

1. ✅ Compilar aplicación: `ng serve` o `npm start`
2. ✅ Login como Casa Central (sucursal 1)
3. ✅ Ir a "Pedidos de Stk. recibidos"
4. ✅ Verificar que aparecen 4 pedidos:
   - id_items 81: 20 unidades de Güemes (estado "Enviado")
   - id_items 71: 1 unidad de Valle Viejo (estado "Enviado")
   - id_items 69: 1 unidad de Valle Viejo (estado "Enviado")
   - id_items 67: 1 unidad de Valle Viejo (estado "Enviado")

### Fase 3: Mejoras Opcionales ⚡ (1-2 horas)

1. ⚠️ Agregar columna "Origen" en la tabla para mostrar qué sucursal envió
2. ⚠️ Diferenciar visualmente estado "Enviado" (pendiente) vs "Recibido" (confirmado)
3. ⚠️ Agregar badge de color:
   - Verde para "Recibido"
   - Naranja para "Enviado" (pendiente de confirmar)
4. ⚠️ Agregar filtro para ver solo pendientes o solo confirmados
5. ⚠️ Agregar botón "Confirmar Recepción" si corresponde (requiere más análisis)

**Tiempo total estimado:**
- **Básico:** 15-25 minutos
- **Con mejoras opcionales:** 1.5-2.5 horas

---

## 10. CÓDIGO SQL PARA VERIFICACIÓN

### 10.1 Ver Pedidos Recibidos para Casa Central (Correcto)

```sql
-- Lo que Casa Central DEBERÍA ver en "Pedidos recibidos"
SELECT
    pi.id_items,
    TRIM(pi.estado) as estado,
    pi.cantidad,
    TRIM(pi.descripcion) as descripcion,
    pc.sucursald as origen,
    pc.sucursalh as destino,
    s1.sucursal as nombre_origen,
    pc.fecha,
    TRIM(pc.usuario) as usuario
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
LEFT JOIN sucursales s1 ON pc.sucursald = s1.cod_sucursal::numeric
WHERE pc.sucursalh = 1  -- Casa Central es DESTINO
  AND TRIM(pi.estado) IN ('Enviado', 'Recibido')
  AND pi.tipo = 'PE'
ORDER BY pi.id_items DESC;
```

### 10.2 Comparar con Filtro Actual (Incorrecto)

```sql
-- Lo que Casa Central VE actualmente (INCORRECTO)
SELECT
    pi.id_items,
    TRIM(pi.estado) as estado,
    pi.cantidad,
    TRIM(pi.descripcion) as descripcion,
    pc.sucursald as origen,
    pc.sucursalh as destino,
    pc.fecha
FROM pedidoitem pi
INNER JOIN pedidoscb pc ON pi.id_num = pc.id_num
WHERE pc.sucursald = 1  -- Casa Central es ORIGEN (incorrecto para recibidos)
  AND TRIM(pi.estado) = 'Recibido'
  AND pi.tipo = 'PE'
ORDER BY pi.id_items DESC;
-- Resultado: 0 registros (vacío)
```

---

## 11. PRUEBAS DE ACEPTACIÓN

### Test Case 1: Verificar Visualización de Envíos Pendientes ✅

**Pre-condición:** Güemes ya envió 20 unidades a Casa Central (id_items 81)

**Pasos:**
1. Login como Casa Central (sucursal 1)
2. Ir a "Pedidos de Stk. recibidos"
3. Verificar que aparece el pedido id_items 81

**Resultado Esperado:**
- ✅ Se visualizan 4 registros
- ✅ Uno de ellos es: 20 unidades, origen Güemes, estado "Enviado"

---

### Test Case 2: Diferenciar Estados "Enviado" vs "Recibido" ✅

**Pasos:**
1. En "Pedidos de Stk. recibidos"
2. Ver columna de estado
3. Identificar registros con estado "Enviado" (pendientes de confirmar)

**Resultado Esperado:**
- ✅ Los registros con estado "Enviado" se distinguen de "Recibido"
- ✅ Idealmente con badge de color diferente (mejora opcional)

---

### Test Case 3: Flujo Completo de Solicitud → Envío → Visualización ✅

**Pasos:**
1. Login como Valle Viejo (2)
2. Pedir 5 unidades a Deposito (4)
3. Login como Deposito (4)
4. Enviar 5 unidades desde "Envios pendientes"
5. Login como Valle Viejo (2)
6. Ir a "Pedidos de Stk. recibidos"

**Resultado Esperado:**
- ✅ Valle Viejo ve el pedido con estado "Enviado"
- ✅ Origen: Deposito, cantidad: 5

---

## 12. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Romper funcionalidad de "Pedidos Pendientes" | Muy Baja | Alto | Solo se modifica stockrecibo, no afecta a otros componentes |
| Confundir usuarios con estados "Enviado" y "Recibido" | Media | Medio | Agregar columna "Origen" y badges de color (mejora opcional) |
| Performance con muchos registros | Baja | Medio | La función ya existe y es usada por otros componentes |
| Errores de compilación | Muy Baja | Bajo | La función `obtenerPedidoItemPorSucursalh` ya existe y está probada |

---

## 13. CONCLUSIONES

### 13.1 Problema Confirmado
- ✅ Casa Central tiene 4 pedidos invisibles (23 unidades en tránsito)
- ✅ Causa raíz: filtro por `sucursald` en lugar de `sucursalh`
- ✅ Backend con mapeo de stock correcto (no afectado)
- ✅ Infraestructura necesaria YA EXISTE en el sistema

### 13.2 Solución Simplificada
- ✅ Usar función existente `PedidoItemsPorSucursalh_post()` (ya implementada)
- ✅ Usar servicio existente `obtenerPedidoItemPorSucursalh()` (ya disponible)
- ✅ Cambiar 1 línea en componente `stockrecibo`
- ✅ Ajustar filtro de estados para incluir "Enviado" y "Recibido"

### 13.3 Impacto de la Solución (ACTUALIZADO)
- **Tiempo:** 15-25 minutos (básico) o 1.5-2.5 horas (con mejoras opcionales)
- **Complejidad:** Muy baja (cambio de 1 función)
- **Prioridad:** Alta (resuelve problema crítico)
- **Riesgo:** Muy bajo (usa infraestructura ya probada)
- **Archivos afectados:** 1 archivo
- **Líneas de código:** ~6 líneas modificadas

---

## 14. PRÓXIMOS PASOS

### Paso 1: Implementación Inmediata ⏱️ (15-25 minutos)
1. ✅ Editar `stockrecibo.component.ts`
2. ✅ Cambiar función de `obtenerPedidoItemPorSucursal` a `obtenerPedidoItemPorSucursalh`
3. ✅ Ajustar filtro de estados
4. ✅ Guardar y compilar

### Paso 2: Pruebas ⏱️ (10-15 minutos)
1. ✅ Verificar que Casa Central ve los 4 pedidos
2. ✅ Confirmar que el pedido de 20 unidades de Güemes aparece
3. ✅ Probar navegación y filtros

### Paso 3: Mejoras Opcionales ⏱️ (1-2 horas)
1. ⚠️ Agregar columna "Origen" (opcional)
2. ⚠️ Badges de color por estado (opcional)
3. ⚠️ Filtros adicionales (opcional)

### Paso 4: Documentación ⏱️ (5 minutos)
1. ⏳ Actualizar `movstock.md` agregando este problema (P9)
2. ⏳ Documentar diferencia entre `PedidoItemsPorSucursal` y `PedidoItemsPorSucursalh`

---

**Documento generado por:** Claude Code
**Fecha de Diagnóstico:** 1 de Noviembre de 2025
**Fecha de Validación:** 1 de Noviembre de 2025
**Última Actualización:** 1 de Noviembre de 2025 (Solución simplificada)
**Estado:** ✅ Diagnóstico validado | ✅ Solución simplificada | ⏳ Pendiente de implementación
**Documentos Relacionados:**
- `validacion_diagnostico.md` - Informe de validación completo
- `movstock.md` - Análisis completo del sistema MOV.STOCK v1.1
