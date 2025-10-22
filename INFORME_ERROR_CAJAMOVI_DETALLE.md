# INFORME: Error de Integridad en caja_movi_detalle

**Fecha:** 20/10/2025
**Componente Afectado:** Carrito de Compras → Finalizar Venta
**Severidad:** 🔴 CRÍTICO - Bloquea el cierre de ventas

---

## 📋 RESUMEN EJECUTIVO

Al intentar cerrar una venta con múltiples métodos de pago, el sistema falla con un error de integridad en la base de datos. El trigger de PostgreSQL detecta que la suma de detalles insertados en `caja_movi_detalle` NO coincide con el total del movimiento principal.

**Caso específico detectado:**
- **Total movimiento:** $8,453.10
- **Suma de detalles insertados:** $1,855.74
- **Diferencia:** $6,597.36 ❌

---

## 🔍 ANÁLISIS DEL PROBLEMA

### 1. Estado de la Venta

El usuario tiene un carrito con 2 productos y 2 métodos de pago diferentes:

| Producto | Método de Pago | Importe |
|----------|----------------|---------|
| ACRIL. GIRO HONDA WAVE DEL IZQ VC 11780 (2 unid.) | EFECTIVO | $1,855.74 |
| ACRILICO TABLERO G.SMASH VC 7432 (2 unid.) | TRANSFERENCIA EFECTIVO | $6,597.36 |
| **TOTAL** | | **$8,453.10** |

**✅ Los subtotales se calculan correctamente en el frontend** (confirmado visualmente)

### 2. Flujo de Procesamiento

```
┌─────────────────┐
│   FRONTEND      │
│  (carrito.ts)   │
└────────┬────────┘
         │
         │ 1. Calcula subtotales por tipo de pago
         │    ✅ EFECTIVO: $1,855.74
         │    ✅ TRANSFERENCIA EFECTIVO: $6,597.36
         │
         │ 2. Formatea para backend
         │    formatearSubtotalesParaBackend()
         │
         │ 3. Envía al backend
         v
┌─────────────────┐
│   BACKEND       │
│ (Descarga.php)  │
└────────┬────────┘
         │
         │ 4. Recibe subtotales
         │    ⚠️ AQUÍ ESTÁ EL PROBLEMA
         │
         │ 5. Inserta en caja_movi (OK)
         │    ID generado: 288
         │
         │ 6. Inserta detalles en caja_movi_detalle
         │    ❌ Solo inserta 1 registro: $1,855.74
         │    ❌ Falta: $6,597.36
         │
         │ 7. TRIGGER VALIDACIÓN
         v
┌─────────────────┐
│   POSTGRES      │
│   (Trigger)     │
└────────┬────────┘
         │
         │ 8. Valida integridad
         │    Suma detalles: $1,855.74
         │    Total movimiento: $8,453.10
         │
         v
    ❌ ERROR DE INTEGRIDAD
```

### 3. Código Relevante

#### Frontend (carrito.component.ts:814-818)

```typescript
// ✅ Formatear subtotales para enviar al backend
const subtotalesParaBackend = this.formatearSubtotalesParaBackend(subtotalesActualizados);
console.log('📊 Subtotales formateados para backend:', subtotalesParaBackend);

// Envía pedido con subtotales
this._subirdata.subirDatosPedidos(pedido, cabecera, sucursal, caja_movi, subtotalesParaBackend)
```

#### Función formatearSubtotalesParaBackend (líneas 412-441)

```typescript
private formatearSubtotalesParaBackend(
  subtotales: Array<{tipoPago: string, subtotal: number}>
): Array<{cod_tarj: number, importe_detalle: number}> {

  // Crear mapa: nombre tarjeta → cod_tarj
  const nombreATarjetaMap = new Map<string, number>();
  this.tarjetas.forEach((t: TarjCredito) => {
    nombreATarjetaMap.set(t.tarjeta, t.cod_tarj);
  });

  const subtotalesBackend = [];
  for (const subtotal of subtotales) {
    const cod_tarj = nombreATarjetaMap.get(subtotal.tipoPago);

    if (cod_tarj !== undefined) {
      subtotalesBackend.push({
        cod_tarj: cod_tarj,
        importe_detalle: parseFloat(subtotal.subtotal.toFixed(2))
      });
    } else {
      console.warn(`⚠️ No se encontró cod_tarj para tipo de pago: ${subtotal.tipoPago}`);
    }
  }

  return subtotalesBackend;
}
```

#### Backend (Descarga.php.txt:5146-5173)

```php
private function insertarDetallesMetodosPago($id_movimiento, $subtotales, $total_movimiento) {
    if (empty($subtotales)) {
        log_message('warning', "Array de subtotales vacío para movimiento {$id_movimiento}");
        return;
    }

    foreach ($subtotales as $cod_tarj => $importe_detalle) {
        // Calcular porcentaje
        $porcentaje = ($total_movimiento > 0)
            ? round(($importe_detalle / $total_movimiento) * 100, 2)
            : 0;

        $detalle = array(
            'id_movimiento' => $id_movimiento,
            'cod_tarj' => $cod_tarj,
            'importe_detalle' => round($importe_detalle, 2),
            'porcentaje' => $porcentaje
        );

        $this->db->insert('caja_movi_detalle', $detalle);

        if ($this->db->affected_rows() === 0) {
            throw new Exception("Error al insertar detalle");
        }
    }
}
```

---

## 🎯 CAUSA RAÍZ

### Hipótesis Principal: Discrepancia en nombres de tarjetas

La función `formatearSubtotalesParaBackend()` hace un **mapeo exacto** de nombres:

```typescript
nombreATarjetaMap.get(subtotal.tipoPago);  // ⚠️ CASE SENSITIVE
```

**Si el nombre de la tarjeta no coincide EXACTAMENTE**, el cod_tarj retorna `undefined` y ese subtotal **NO se incluye** en el array enviado al backend.

### Posibles causas de discrepancia:

1. **Espacios extra o trailing spaces:**
   - Frontend: `"TRANSFERENCIA EFECTIVO"` (con espacio final)
   - BD: `"TRANSFERENCIA EFECTIVO"` (sin espacio final)
   - Resultado: `undefined` → No se encuentra

2. **Capitalización diferente:**
   - Frontend: `"TRANSFERENCIA EFECTIVO"`
   - BD: `"Transferencia Efectivo"`
   - Resultado: `undefined` → No se encuentra

3. **Caracteres especiales ocultos:**
   - Caracteres unicode invisibles
   - Saltos de línea (`\n`, `\r`)

4. **Orden de carga de tarjetas:**
   - Si `this.tarjetas` no se carga antes de llamar a `formatearSubtotalesParaBackend()`
   - Resultado: array vacío → No se encuentra ningún cod_tarj

---

## 🔬 EVIDENCIA DEL PROBLEMA

### Logs esperados vs reales:

**ESPERADO (2 detalles):**
```
📊 Subtotales formateados para backend: [
  { cod_tarj: 11, importe_detalle: 1855.74 },
  { cod_tarj: XX, importe_detalle: 6597.36 }
]
```

**REAL (1 solo detalle - hipótesis):**
```
📊 Subtotales formateados para backend: [
  { cod_tarj: 11, importe_detalle: 1855.74 }
]

⚠️ No se encontró cod_tarj para tipo de pago: TRANSFERENCIA EFECTIVO
```

El backend recibe solo 1 elemento en el array, por eso solo inserta 1 registro en `caja_movi_detalle`.

---

## ✅ VALIDACIONES RECOMENDADAS

### 1. Inspección inmediata en consola del navegador

Agregar temporalmente estos logs en `carrito.component.ts` (línea 813):

```typescript
console.log('🔍 DEPURACIÓN SUBTOTALES:');
console.log('1. Subtotales calculados:', JSON.stringify(subtotalesActualizados, null, 2));
console.log('2. Tarjetas cargadas:', JSON.stringify(this.tarjetas, null, 2));
console.log('3. Mapa de nombres:',
  this.tarjetas.map(t => ({ nombre: t.tarjeta, cod: t.cod_tarj }))
);

const subtotalesParaBackend = this.formatearSubtotalesParaBackend(subtotalesActualizados);

console.log('4. Subtotales enviados al backend:', JSON.stringify(subtotalesParaBackend, null, 2));
console.log('5. ¿Coincide la cantidad?',
  subtotalesActualizados.length === subtotalesParaBackend.length ? '✅' : '❌'
);
```

### 2. Verificación en base de datos

```sql
-- Ver nombres exactos de tarjetas
SELECT cod_tarj, tarjeta, LENGTH(tarjeta) as longitud
FROM tarj_credito
WHERE tarjeta LIKE '%EFECTIVO%';

-- Ver qué tipo de codificación tiene
SELECT cod_tarj, tarjeta, encode(tarjeta::bytea, 'hex') as hex_encoding
FROM tarj_credito
WHERE tarjeta LIKE '%EFECTIVO%';
```

---

## 🛠️ SOLUCIONES PROPUESTAS

### Solución 1: Normalización Case-Insensitive (RECOMENDADA)

**Ubicación:** `carrito.component.ts:418-422`

```typescript
// ANTES (case sensitive)
nombreATarjetaMap.set(t.tarjeta, t.cod_tarj);

// DESPUÉS (case insensitive + trim)
nombreATarjetaMap.set(t.tarjeta.trim().toUpperCase(), t.cod_tarj);
```

Y en el mapeo (línea 428):

```typescript
// ANTES
const cod_tarj = nombreATarjetaMap.get(subtotal.tipoPago);

// DESPUÉS
const cod_tarj = nombreATarjetaMap.get(subtotal.tipoPago.trim().toUpperCase());
```

**Ventajas:**
- ✅ Resuelve problemas de espacios
- ✅ Resuelve problemas de mayúsculas/minúsculas
- ✅ Robusto contra errores humanos
- ✅ No requiere cambios en BD

### Solución 2: Validación Pre-Envío (COMPLEMENTARIA)

**Ubicación:** `carrito.component.ts:814` (antes de enviar)

```typescript
const subtotalesParaBackend = this.formatearSubtotalesParaBackend(subtotalesActualizados);

// ✅ VALIDACIÓN CRÍTICA
if (subtotalesParaBackend.length !== subtotalesActualizados.length) {
  console.error('❌ ERROR CRÍTICO: No se mapearon todos los tipos de pago');
  console.error('Calculados:', subtotalesActualizados.length);
  console.error('Mapeados:', subtotalesParaBackend.length);

  Swal.fire({
    icon: 'error',
    title: 'Error de configuración',
    text: 'No se pudieron procesar todos los métodos de pago. Contacte al administrador.',
    footer: 'Algunos métodos de pago no tienen código asociado'
  });
  return; // Detener el proceso
}

// Calcular suma para validación adicional
const sumaMapeada = subtotalesParaBackend.reduce((acc, sub) => acc + sub.importe_detalle, 0);
if (Math.abs(sumaMapeada - this.suma) > 0.01) {
  console.error('❌ ERROR: La suma mapeada no coincide con el total');
  Swal.fire({
    icon: 'error',
    title: 'Error de cálculo',
    text: `Diferencia detectada: ${Math.abs(sumaMapeada - this.suma).toFixed(2)}`
  });
  return;
}

console.log('✅ Validación exitosa: Todos los subtotales fueron mapeados');
this._subirdata.subirDatosPedidos(pedido, cabecera, sucursal, caja_movi, subtotalesParaBackend)
```

### Solución 3: Logging Mejorado

**Ubicación:** `carrito.component.ts:436` (dentro de formatearSubtotalesParaBackend)

```typescript
} else {
  // ⚠️ LOG DETALLADO para debugging
  console.error('❌ MAPEO FALLIDO:', {
    tipoPago: subtotal.tipoPago,
    tipoPagoLength: subtotal.tipoPago.length,
    tipoPagoBytes: Array.from(subtotal.tipoPago).map(c => c.charCodeAt(0)),
    tarjetasDisponibles: Array.from(nombreATarjetaMap.keys()),
    subtotal: subtotal.subtotal
  });
}
```

---

## 📊 PLAN DE ACCIÓN

### Fase 1: Diagnóstico Inmediato (5 minutos)

1. ✅ Agregar logs de depuración en `carrito.component.ts:813`
2. ✅ Reproducir error en entorno de desarrollo
3. ✅ Capturar logs de consola del navegador
4. ✅ Verificar nombres exactos en tabla `tarj_credito`

### Fase 2: Corrección (15 minutos)

1. ✅ Implementar **Solución 1** (normalización case-insensitive)
2. ✅ Implementar **Solución 2** (validación pre-envío)
3. ✅ Implementar **Solución 3** (logging mejorado)
4. ✅ Recompilar aplicación

### Fase 3: Validación (10 minutos)

1. ✅ Probar con venta de 2 productos + 2 métodos de pago
2. ✅ Verificar que se inserten ambos detalles en `caja_movi_detalle`
3. ✅ Confirmar que no hay error de trigger
4. ✅ Revisar logs del backend

### Fase 4: Rollout (opcional)

Si se requiere deploy inmediato:
- Build de producción
- Deploy a servidor
- Monitoreo de errores

---

## 🔄 PREVENCIÓN FUTURA

### 1. Constraint en BD para nombres de tarjetas

```sql
-- Agregar constraint para evitar espacios al final
ALTER TABLE tarj_credito
ADD CONSTRAINT chk_tarjeta_sin_espacios
CHECK (tarjeta = TRIM(tarjeta));

-- Actualizar registros existentes
UPDATE tarj_credito
SET tarjeta = TRIM(tarjeta)
WHERE tarjeta != TRIM(tarjeta);
```

### 2. Test Unitario

Crear test que valide el mapeo de tarjetas:

```typescript
describe('formatearSubtotalesParaBackend', () => {
  it('debería mapear todos los tipos de pago sin importar espacios o capitalización', () => {
    const subtotales = [
      { tipoPago: 'EFECTIVO  ', subtotal: 100 },  // con espacios
      { tipoPago: 'transferencia efectivo', subtotal: 200 }  // minúsculas
    ];

    const resultado = component.formatearSubtotalesParaBackend(subtotales);

    expect(resultado.length).toBe(2); // ✅ No debe perder ningún subtotal
  });
});
```

### 3. Alerta Proactiva

Configurar alerta en backend cuando se detecte discrepancia:

```php
if (empty($subtotales_finales)) {
    // Enviar email al administrador
    $this->enviarAlertaAdmin("CRÍTICO: No se recibieron subtotales para movimiento {$id_movimiento}");
}
```

---

## 📝 REFERENCIAS

### Archivos Involucrados

- **Frontend:** `/src/app/components/carrito/carrito.component.ts`
  - Línea 412-441: `formatearSubtotalesParaBackend()`
  - Línea 447-496: `calcularSubtotalesPorTipoPago()`
  - Línea 814-818: Llamada a backend

- **Backend:** `/src/Descarga.php.txt`
  - Línea 5146-5173: `insertarDetallesMetodosPago()`
  - Línea 4918-4977: `procesarSubtotalesHibrido()`
  - Línea 4994-5038: `calcularSubtotalesPorMetodoPago()`

### Tablas de BD

- `caja_movi` - Movimiento principal
- `caja_movi_detalle` - Detalles por método de pago (trigger de validación)
- `tarj_credito` - Catálogo de métodos de pago

---

## ⚠️ IMPACTO

**Severidad:** 🔴 CRÍTICO

- ❌ **Bloquea completamente** el cierre de ventas con múltiples métodos de pago
- ❌ **Pérdida de ventas** si no se resuelve rápidamente
- ❌ **Frustración del usuario** al no poder completar operaciones
- ⚠️ No afecta ventas con un solo método de pago

**Workaround temporal:**
- Dividir la venta en 2 transacciones separadas (una por método de pago)
- NO RECOMENDADO: requiere doble comprobante y confunde inventario

---

**Generado:** 20/10/2025
**Autor:** Sistema de Análisis Automático
**Prioridad:** P0 - Resolver inmediatamente
