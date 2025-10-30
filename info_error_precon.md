# 🚨 INFORME DE ERROR CRÍTICO
## Error al Finalizar Venta: Campos Inexistentes en BD

---

**Fecha:** 2025-10-26
**Severidad:** 🔴 **CRÍTICA** - Bloquea finalización de ventas
**Componente afectado:** `carrito.component.ts`
**Error de BD:** `ERROR: no existe la columna «precon» en la relación «psucursal1»`

---

## 📋 TABLA DE CONTENIDOS

1. [Descripción del Error](#descripción-del-error)
2. [Análisis del Problema](#análisis-del-problema)
3. [Causa Raíz](#causa-raíz)
4. [Solución Detallada](#solución-detallada)
5. [Implementación](#implementación)
6. [Testing](#testing)
7. [Prevención Futura](#prevención-futura)

---

## 🔴 DESCRIPCIÓN DEL ERROR

### Síntoma

Al intentar finalizar una venta (después de simular cambios de precio y revertirlos), la aplicación se queda en estado "Enviando..." y muestra el siguiente error en consola:

```
A Database Error Occurred

Error Number:
ERROR:  no existe la columna «precon» en la relación «psucursal1»
LINE 1: ..."importeimputar", "importecheque", "fechacheque", "precon", ...

INSERT INTO "psucursal1" ("idart", "cantidad", "precio", "idcli", "idven",
"fecha", "hora", "tipoprecio", "cod_tar", "titulartar", "numerotar",
"cod_mov", "suc_destino", "nomart", "nautotar", "dni_tar", "banco",
"ncuenta", "ncheque", "nombre", "plaza", "importeimputar", "importecheque",
"fechacheque", "precon", "prefi1", "prefi2", "prefi3", "prefi4",
"tipo_moneda", "activadatos", "tipoPago", "emailop", "tipodoc",
"puntoventa", "numerocomprobante", "estado", "id_num")
VALUES (8433, 1, 10475.06, 14242, '7', '2025-10-26', '11:14:33', '2', '1',
'luis', 1234123412341234, 0, 0, 'ACOPLE FIL-AIRE C/CARB H.CB 250  9060...',
123, 31126086, '', NULL, NULL, '', '', NULL, NULL, '1900-01-01',
9108.75, 10019.625, 10475.0625, 6376.125, 0, '2', '1', 'ELECTRON',
'segu239@hotmail.com', 'FC', 1, 23, 'NP', 84)
```

### Ubicación del Error

- **Archivo backend:** `C:\xampp\htdocs\APIAND\application\controllers\Descarga.php`
- **Línea:** 984
- **Función:** Inserción en tabla `psucursal1`

---

## 🔍 ANÁLISIS DEL PROBLEMA

### 1. Campos que Intenta Insertar (y que NO existen)

| Campo | Tipo | ¿Existe en BD? | Propósito |
|-------|------|----------------|-----------|
| `precon` | numeric | ❌ **NO** | Precio contado (metadato frontend) |
| `prefi1` | numeric | ❌ **NO** | Precio financiado 1 (metadato frontend) |
| `prefi2` | numeric | ❌ **NO** | Precio financiado 2 (metadato frontend) |
| `prefi3` | numeric | ❌ **NO** | Precio financiado 3 (metadato frontend) |
| `prefi4` | numeric | ❌ **NO** | Precio financiado 4 (metadato frontend) |
| `tipo_moneda` | numeric | ❌ **NO** | 2=USD, 3=ARS (metadato frontend) |
| `activadatos` | numeric | ❌ **NO** | 0/1/2 tipo de datos adicionales (metadato frontend) |
| `tipoPago` | text | ❌ **NO** | Nombre del tipo de pago (metadato frontend) |

### 2. Campos que SÍ Existen en BD `psucursal1`

Según análisis previo de la tabla:

```sql
-- Campos válidos de psucursal1
idart (numeric)
cantidad (numeric)
precio (numeric)
idcli (numeric)
idven (numeric)
fecha (date)
hora (text)
tipoprecio (text)
cod_tar (numeric)
titulartar (text)
numerotar (numeric)
cod_mov (numeric)
suc_destino (numeric)
nomart (text)
nautotar (numeric)
dni_tar (numeric)
banco (text)
ncuenta (numeric)
ncheque (numeric)
nombre (text)
plaza (text)
importeimputar (numeric)
importecheque (numeric)
fechacheque (date)
emailop (text)
tipodoc (text)
puntoventa (numeric)
numerocomprobante (numeric)
estado (text)
id_num (numeric)
```

**Total de campos válidos:** 30
**Campos intentados en el INSERT:** 38
**Campos inválidos:** 8 (precon, prefi1-4, tipo_moneda, activadatos, tipoPago)

---

## 🎯 CAUSA RAÍZ

### Flujo del Problema

```
┌─────────────────────────────────────────────────────────────┐
│ 1. calculoproducto.component.ts                            │
│    Al agregar item, se guardan METADATOS para frontend:   │
│    - precon, prefi1, prefi2, prefi3, prefi4                │
│    - tipo_moneda, activadatos, tipoPago                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. carrito.component.ts - sessionStorage                   │
│    Items se guardan con TODOS los campos (incluidos        │
│    metadatos)                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Usuario simula cambio de precio                         │
│    Se agregan MÁS campos:                                  │
│    - _soloConsulta, _tipoPagoOriginal, _precioOriginal     │
│    - _activadatosOriginal, _nombreTipoPagoOriginal         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Usuario revierte cambio                                 │
│    Campos de consulta se eliminan, pero metadatos          │
│    originales PERMANECEN                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. carrito.component.ts:1141 - Preparar datos para envío  │
│    ⚠️ CÓDIGO PROBLEMÁTICO:                                │
│                                                             │
│    let result = this.itemsEnCarrito.map(obj => {           │
│      const { id_articulo, ...objSinIdArticulo } = obj;     │
│      return {                                               │
│        ...objSinIdArticulo,  // ← INCLUYE TODOS LOS CAMPOS │
│        emailop: emailOp,                                    │
│        tipodoc: this.tipoDoc,                               │
│        // ... más campos                                    │
│      };                                                     │
│    });                                                      │
│                                                             │
│    ❌ El spread operator (...objSinIdArticulo) incluye:   │
│       - precon, prefi1-4, tipo_moneda, activadatos, etc.  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. subirdata.service.ts - Envío al backend                │
│    El servicio envía el array SIN filtrar                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Backend: Descarga.php (línea 1191)                     │
│    CodeIgniter intenta insertar TODOS los campos           │
│    recibidos en la tabla psucursal1                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. PostgreSQL                                              │
│    ❌ ERROR: Columna "precon" no existe                   │
│    ❌ Transacción fallida                                 │
│    ❌ Venta NO se guarda                                  │
└─────────────────────────────────────────────────────────────┘
```

### Código Problemático

**Ubicación:** `carrito.component.ts:1141-1153`

```typescript
// ❌ CÓDIGO ACTUAL (INCORRECTO)
let result = this.itemsEnCarrito.map(obj => {
  const { id_articulo, ...objSinIdArticulo } = obj;
  return {
    ...objSinIdArticulo,  // ← PROBLEMA: Incluye TODOS los campos
    emailop: emailOp,
    tipodoc: this.tipoDoc,
    puntoventa: this.puntoventa,
    numerocomprobante: this.numerocomprobante,
    estado: "NP",
    idven: this.vendedoresV,
    idart: obj.id_articulo || 0
  };
});
```

**¿Por qué falla?**

El spread operator `...objSinIdArticulo` incluye:
- ✅ Campos válidos: `cantidad`, `precio`, `cod_tar`, etc.
- ❌ Metadatos frontend: `precon`, `prefi1-4`, `tipo_moneda`, `activadatos`, `tipoPago`
- ❌ Campos de consulta (si existieran): `_soloConsulta`, `_precioOriginal`, etc.

Estos campos extra se envían al backend, y CodeIgniter intenta insertarlos en la BD, causando el error.

---

## ✅ SOLUCIÓN DETALLADA

### Estrategia: Whitelist de Campos

En lugar de usar el spread operator que incluye TODO, debemos especificar **explícitamente** solo los campos que la tabla `psucursal1` acepta.

### Ventajas de esta solución:

1. ✅ **Seguridad:** Solo se envían campos válidos
2. ✅ **Mantenibilidad:** Claro qué campos se envían
3. ✅ **Escalabilidad:** Fácil agregar/quitar campos en el futuro
4. ✅ **Debuggability:** Fácil detectar qué se envía al backend

---

## 🔧 IMPLEMENTACIÓN

### Paso 1: Modificar `carrito.component.ts`

**Ubicación:** Línea 1141-1153

**ANTES (código actual):**

```typescript
let result = this.itemsEnCarrito.map(obj => {
  const { id_articulo, ...objSinIdArticulo } = obj;
  return {
    ...objSinIdArticulo,  // ❌ Incluye campos inválidos
    emailop: emailOp,
    tipodoc: this.tipoDoc,
    puntoventa: this.puntoventa,
    numerocomprobante: this.numerocomprobante,
    estado: "NP",
    idven: this.vendedoresV,
    idart: obj.id_articulo || 0
  };
});
```

**DESPUÉS (código corregido):**

```typescript
// ✅ FIX v4.0: Filtrar campos explícitamente (whitelist)
// Solo enviar campos que existen en la tabla psucursal1
let result = this.itemsEnCarrito.map(obj => {
  return {
    // ════════════════════════════════════════════════════════
    // Campos de producto (del item original)
    // ════════════════════════════════════════════════════════
    idart: obj.id_articulo || 0,           // ID del artículo
    cantidad: obj.cantidad,                // Cantidad
    precio: obj.precio,                    // Precio calculado final
    nomart: obj.nomart,                    // Nombre del artículo

    // ════════════════════════════════════════════════════════
    // Campos de tipo de pago
    // ════════════════════════════════════════════════════════
    tipoprecio: obj.tipoprecio || '',      // Tipo de precio
    cod_tar: obj.cod_tar,                  // Código del tipo de pago

    // ════════════════════════════════════════════════════════
    // Campos de tarjeta (si aplica)
    // ════════════════════════════════════════════════════════
    titulartar: obj.titulartar || null,    // Titular de tarjeta
    numerotar: obj.numerotar || null,      // Número de tarjeta
    nautotar: obj.nautotar || null,        // Número de autorización
    dni_tar: obj.dni_tar || null,          // DNI del titular

    // ════════════════════════════════════════════════════════
    // Campos de cheque (si aplica)
    // ════════════════════════════════════════════════════════
    banco: obj.banco || null,              // Banco
    ncuenta: obj.ncuenta || null,          // Número de cuenta
    ncheque: obj.ncheque || null,          // Número de cheque
    nombre: obj.nombre || '',              // Nombre en cheque
    plaza: obj.plaza || '',                // Plaza
    importeimputar: obj.importeimputar || null,    // Importe a imputar
    importecheque: obj.importecheque || null,      // Importe del cheque
    fechacheque: obj.fechacheque || null,  // Fecha del cheque

    // ════════════════════════════════════════════════════════
    // Campos de cliente y venta
    // ════════════════════════════════════════════════════════
    idcli: obj.idcli,                      // ID del cliente
    idven: this.vendedoresV,               // ID del vendedor
    fecha: obj.fecha || new Date().toISOString().split('T')[0],  // Fecha
    hora: obj.hora || new Date().toLocaleTimeString('es-ES'),    // Hora

    // ════════════════════════════════════════════════════════
    // Campos de movimiento
    // ════════════════════════════════════════════════════════
    cod_mov: obj.cod_mov || 0,             // Código de movimiento
    suc_destino: obj.suc_destino || 0,     // Sucursal destino

    // ════════════════════════════════════════════════════════
    // Campos de comprobante (agregados en este mapeo)
    // ════════════════════════════════════════════════════════
    emailop: emailOp,                      // Email del operador
    tipodoc: this.tipoDoc,                 // Tipo de documento
    puntoventa: this.puntoventa,           // Punto de venta
    numerocomprobante: this.numerocomprobante,  // Número de comprobante
    estado: "NP",                          // Estado (No Procesado)
    id_num: obj.id_num || null             // ID numérico

    // ════════════════════════════════════════════════════════
    // ⚠️ CAMPOS EXCLUIDOS (metadatos solo para frontend):
    // ════════════════════════════════════════════════════════
    // ❌ precon, prefi1, prefi2, prefi3, prefi4 (precios alternativos)
    // ❌ tipo_moneda (2=USD, 3=ARS)
    // ❌ activadatos (0/1/2)
    // ❌ tipoPago (nombre del tipo de pago)
    // ❌ _soloConsulta, _precioOriginal, etc. (campos de simulación)
    // ════════════════════════════════════════════════════════
  };
});

console.log('✅ Items filtrados para envío al backend:', result);
```

### Paso 2: Verificar Logging

Agregar log antes del envío para debugging:

```typescript
// Justo antes de la línea 1176 (editarStockArtSucxManagedPHP)
console.log('📦 Datos preparados para backend:');
console.log('   - Items totales:', result.length);
console.log('   - Primer item (muestra):', result[0]);
console.log('   - Campos en primer item:', Object.keys(result[0]));
```

---

## 🧪 TESTING

### Test Case 1: Venta Normal (Sin Simulación)

**Pasos:**
1. Agregar item al carrito con EFECTIVO
2. Finalizar venta inmediatamente
3. Verificar que se guarda correctamente

**Resultado esperado:**
- ✅ Venta se guarda en BD
- ✅ No hay errores de PostgreSQL
- ✅ Solo se envían campos válidos

---

### Test Case 2: Venta con Simulación y Reversión

**Pasos:**
1. Agregar item al carrito con EFECTIVO
2. Cambiar a ELECTRON (simular precio)
3. Revertir a EFECTIVO
4. Finalizar venta

**Resultado esperado:**
- ✅ Venta se guarda correctamente
- ✅ Precio final es el de EFECTIVO
- ✅ Metadatos de simulación NO se envían

---

### Test Case 3: Venta con Múltiples Items

**Pasos:**
1. Agregar 3 items con diferentes tipos de pago
2. Simular cambios en 1 item
3. Revertir cambios
4. Finalizar venta

**Resultado esperado:**
- ✅ Todos los items se guardan
- ✅ Cada item tiene su tipo de pago correcto
- ✅ No hay errores de campos inexistentes

---

### Test Case 4: Verificación de Campos Enviados

**Método:** Inspeccionar payload en Network tab de DevTools

**Pasos:**
1. Abrir DevTools → Network
2. Agregar item y finalizar venta
3. Buscar request POST a `PedidossucxappCompleto`
4. Inspeccionar Payload

**Resultado esperado:**

```json
{
  "pedidos": [
    {
      "idart": 8433,
      "cantidad": 1,
      "precio": 10475.06,
      "nomart": "ACOPLE FIL-AIRE...",
      "cod_tar": "1",
      "titulartar": "luis",
      "numerotar": 1234123412341234,
      // ... más campos VÁLIDOS

      // ❌ NO deben aparecer:
      // "precon": 9108.75,
      // "prefi1": 10019.625,
      // "tipo_moneda": 2,
      // "activadatos": 1,
      // "tipoPago": "ELECTRON"
    }
  ],
  "cabecera": { ... },
  "id_vend": "1",
  "caja_movi": [ ... ]
}
```

---

## 🛡️ PREVENCIÓN FUTURA

### 1. Documentar Convención de Nombres

**Regla:** Los campos que empiezan con `_` (underscore) son SOLO para frontend y NUNCA se envían al backend.

**Ejemplos:**
- `_soloConsulta` ✅ Solo frontend
- `_precioOriginal` ✅ Solo frontend
- `precio` ❌ Se envía al backend

### 2. Crear Método de Sanitización

**Ubicación:** `carrito.component.ts`

```typescript
/**
 * Sanitiza un item del carrito para enviar al backend
 * Filtra campos que solo son metadatos del frontend
 * @param item - Item del carrito con todos sus campos
 * @returns Item sanitizado solo con campos válidos para BD
 */
private sanitizarItemParaBackend(item: any): any {
  // Lista blanca de campos permitidos
  const camposPermitidos = [
    'idart', 'cantidad', 'precio', 'nomart', 'tipoprecio', 'cod_tar',
    'titulartar', 'numerotar', 'nautotar', 'dni_tar', 'banco', 'ncuenta',
    'ncheque', 'nombre', 'plaza', 'importeimputar', 'importecheque',
    'fechacheque', 'idcli', 'idven', 'fecha', 'hora', 'cod_mov',
    'suc_destino', 'id_num'
  ];

  // Filtrar solo campos permitidos
  const itemSanitizado = {};
  camposPermitidos.forEach(campo => {
    if (item.hasOwnProperty(campo)) {
      itemSanitizado[campo] = item[campo];
    }
  });

  return itemSanitizado;
}
```

**Uso:**

```typescript
let result = this.itemsEnCarrito.map(obj => {
  const itemSanitizado = this.sanitizarItemParaBackend(obj);
  return {
    ...itemSanitizado,
    emailop: emailOp,
    tipodoc: this.tipoDoc,
    puntoventa: this.puntoventa,
    numerocomprobante: this.numerocomprobante,
    estado: "NP",
    idven: this.vendedoresV,
    idart: obj.id_articulo || 0
  };
});
```

### 3. Agregar Validación en Backend (Opcional)

**Ubicación:** `Descarga.php:1191` (función `Pedidossucxapp_post()`)

```php
// Whitelist de campos permitidos en psucursal
$campos_permitidos = [
    'idart', 'cantidad', 'precio', 'idcli', 'idven', 'fecha', 'hora',
    'tipoprecio', 'cod_tar', 'titulartar', 'numerotar', 'cod_mov',
    'suc_destino', 'nomart', 'nautotar', 'dni_tar', 'banco', 'ncuenta',
    'ncheque', 'nombre', 'plaza', 'importeimputar', 'importecheque',
    'fechacheque', 'emailop', 'tipodoc', 'puntoventa', 'numerocomprobante',
    'estado', 'id_num'
];

foreach ($datos as $valor) {
    // Filtrar solo campos permitidos
    $valor_filtrado = array_intersect_key($valor, array_flip($campos_permitidos));

    $this->db->insert($tabla, $valor_filtrado);

    if ($this->db->affected_rows() > 0) {
        $contador_exitosas += $this->db->affected_rows();
    }
}
```

---

## 📊 RESUMEN EJECUTIVO

### Problema

Los metadatos agregados en v4.0 (`precon`, `prefi1-4`, `tipo_moneda`, `activadatos`, `tipoPago`) se están enviando al backend al finalizar una venta, causando error de PostgreSQL porque esos campos NO existen en la tabla `psucursal1`.

### Causa Raíz

Uso del spread operator (`...objSinIdArticulo`) en `carrito.component.ts:1142` que incluye TODOS los campos del item, incluyendo metadatos solo para frontend.

### Solución

**Reemplazar spread operator por whitelist explícita de campos** en `carrito.component.ts:1141-1153`.

### Impacto

- **Severidad:** 🔴 CRÍTICA
- **Afectados:** Todas las ventas que se intenten finalizar
- **Tiempo de fix:** 15-20 minutos
- **Riesgo de la solución:** 🟢 MUY BAJO

### Estado

- ❌ **Bug activo** - Bloquea ventas
- ✅ **Solución identificada**
- ⏳ **Pendiente de implementación**

---

## 🚀 PLAN DE ACCIÓN INMEDIATO

### 1. Implementar Fix (15 min)

- [ ] Abrir `carrito.component.ts`
- [ ] Navegar a línea 1141
- [ ] Reemplazar código con whitelist explícita
- [ ] Agregar comentarios explicativos
- [ ] Guardar archivo

### 2. Testing (10 min)

- [ ] Compilar aplicación (`ng build`)
- [ ] Ejecutar Test Case 2 (venta con simulación y reversión)
- [ ] Verificar en Network tab que NO se envían metadatos
- [ ] Confirmar que venta se guarda en BD

### 3. Deploy (5 min)

- [ ] Commit cambios
- [ ] Deploy a producción
- [ ] Verificar en producción

### 4. Monitoreo (24h)

- [ ] Observar logs de PostgreSQL
- [ ] Verificar que no hay más errores de "columna no existe"
- [ ] Confirmar con usuarios que ventas se guardan correctamente

---

## 📞 CONTACTO

**Analista:** Claude Code
**Fecha:** 2025-10-26
**Versión:** 1.0

---

**FIN DEL INFORME**
