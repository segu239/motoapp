# INFORME: Problema de Desglose y Afectación de Cajas

**Fecha:** 21 de Octubre de 2025
**Sistema:** MotoApp - Módulo Cajamovi
**Problema Reportado:** El desglose de métodos de pago no está afectando las cajas correspondientes
**Analista:** Claude Code
**Severidad:** 🟡 MEDIA - Funcional pero con limitación de diseño

---

## 📋 RESUMEN EJECUTIVO

### Problema Reportado

El usuario reporta que aunque el sistema muestra correctamente el desglose de métodos de pago en la tabla `caja_movi_detalle`, **solo está afectando una caja** (Caja Efectivo) en lugar de afectar las cajas correspondientes a cada método de pago.

**Ejemplo del problema:**
- Movimiento ID 47: Total $33.855,40
  - TRANSFERENCIA EFECTIVO: $27.309,24 (80,66%)
  - EFECTIVO: $6.546,16 (19,34%)
- **Caja afectada:** Solo "Caja Efectivo"
- **Esperado:** Debería afectar también la caja correspondiente a "TRANSFERENCIA EFECTIVO"

### Causa Raíz

✅ **ESTO NO ES UN BUG - ES UNA LIMITACIÓN DEL DISEÑO ACTUAL**

La **Alternativa C** (Enfoque Híbrido) fue diseñada para:
- ✅ Registrar el **desglose** de métodos de pago en `caja_movi_detalle` (INFORMATIVO)
- ✅ Mantener compatibilidad con la estructura existente de `caja_movi`

**NO fue diseñada para:**
- ❌ Crear movimientos separados por cada caja
- ❌ Afectar múltiples cajas con un solo movimiento

### Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────┐
│                   ARQUITECTURA ACTUAL                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Venta con 2 métodos de pago:                              │
│    - EFECTIVO: $6,546.16                                   │
│    - TRANSFERENCIA: $27,309.24                             │
│    Total: $33,855.40                                       │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │  caja_movi (1 registro)              │                  │
│  ├──────────────────────────────────────┤                  │
│  │  id_movimiento: 47                   │                  │
│  │  importe_mov: $33,855.40            │                  │
│  │  caja: 1 (Caja Efectivo) ← SOLO UNA│                  │
│  │  ...                                 │                  │
│  └──────────────────────────────────────┘                  │
│                ↓                                            │
│  ┌──────────────────────────────────────┐                  │
│  │  caja_movi_detalle (2 registros)     │                  │
│  ├──────────────────────────────────────┤                  │
│  │  id_detalle: 1                       │                  │
│  │  id_movimiento: 47                   │                  │
│  │  cod_tarj: 11 (EFECTIVO)            │                  │
│  │  importe_detalle: $6,546.16         │                  │
│  ├──────────────────────────────────────┤                  │
│  │  id_detalle: 2                       │                  │
│  │  id_movimiento: 47                   │                  │
│  │  cod_tarj: 1111 (TRANSFERENCIA)     │                  │
│  │  importe_detalle: $27,309.24        │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
│  Resultado:                                                 │
│  ✅ Desglose registrado correctamente                      │
│  ❌ Solo afecta Caja Efectivo (campo caja en caja_movi)   │
│  ❌ No afecta caja de Transferencia                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 ANÁLISIS TÉCNICO DETALLADO

### 1. Estructura de Tabla `caja_movi`

**Campo relevante:**
```typescript
export interface Cajamovi {
  // ... otros campos
  caja: number;  // ← Solo acepta UN id_caja
  // ...
}
```

**Constraint en base de datos:**
```sql
ALTER TABLE caja_movi
  ADD CONSTRAINT fk_caja
  FOREIGN KEY (caja) REFERENCES caja_lista(id_caja);
```

**Limitación:** El campo `caja` es de tipo `INTEGER`, solo puede referenciar UNA caja por movimiento.

---

### 2. Relación entre Métodos de Pago y Cajas

**Tabla `tarjcredito`:**
```typescript
export interface TarjCredito {
  cod_tarj: number;          // Código de método de pago
  tarjeta: string;           // Nombre (ej: "EFECTIVO", "TRANSFERENCIA")
  idcp_ingreso: number;      // ← ID del concepto de ingreso (relaciona con caja)
  idcp_egreso: number;       // ID del concepto de egreso
  id_forma_pago: number;     // ID de la forma de pago
  // ...
}
```

**Relación:**
```
tarjcredito.cod_tarj
    ↓
tarjcredito.idcp_ingreso  →  caja_conceptos.id_concepto
    ↓
caja_conceptos.id_caja  →  caja_lista.id_caja
```

**Cada método de pago tiene su propia caja asociada:**
- EFECTIVO (cod_tarj=11) → idcp_ingreso=X → Caja Efectivo
- TRANSFERENCIA (cod_tarj=1111) → idcp_ingreso=Y → Caja Transferencias

---

### 3. Código Frontend: Asignación de Caja

**Archivo:** `carrito.component.ts`
**Función:** `crearCajaMovi()` (líneas 1227-1317)

```typescript
crearCajaMovi(pedido: any, cabecera: any, fecha: Date): any {
  // ...

  // 🔴 PROBLEMA: Toma solo el PRIMER item del pedido
  const primerItem = pedido[0];

  // Busca la tarjeta del primer item
  let tarjetaInfo: any = null;
  if (primerItem.cod_tar) {
    tarjetaInfo = this.tarjetas.find(
      t => t.cod_tarj.toString() === primerItem.cod_tar.toString()
    );
  }

  // 🔴 PROBLEMA: Obtiene id_caja solo del primer método de pago
  const obtenerIdCaja = new Promise<number | null>((resolve) => {
    if (tarjetaInfo && tarjetaInfo.idcp_ingreso) {
      this._cargardata.getIdCajaFromConcepto(tarjetaInfo.idcp_ingreso)
        .pipe(take(1))
        .subscribe((response: any) => {
          if (response && response.mensaje && response.mensaje.length > 0) {
            idCaja = response.mensaje[0].id_caja;
            resolve(idCaja);
          }
        });
    }
  });

  return obtenerIdCaja.then(idCajaObtenido => {
    const cajaMovi = {
      // ...
      caja: idCajaObtenido,  // 🔴 Solo asigna UNA caja
      // ...
    };
    return cajaMovi;
  });
}
```

**Flujo actual:**
1. El carrito tiene 2 productos con diferentes métodos de pago
2. El código toma el `cod_tar` del **primer producto** (ej: EFECTIVO)
3. Obtiene el `idcp_ingreso` de EFECTIVO
4. Busca el `id_caja` correspondiente (ej: Caja Efectivo)
5. Asigna ese `id_caja` al campo `caja` de `caja_movi`

**Resultado:**
- El movimiento completo ($33.855,40) se registra en "Caja Efectivo"
- El desglose en `caja_movi_detalle` es correcto, pero INFORMATIVO
- La caja de "TRANSFERENCIA" nunca se afecta

---

### 4. Backend: Inserción de Movimientos

**Archivo:** `Descarga.php.txt`
**Función:** `PedidossucxappCompleto_post()` (líneas 995-1090)

```php
// 1. Insertar caja_movi (UN solo registro)
$this->db->insert('caja_movi', $caja_movi);
$id_movimiento = $this->db->insert_id();

// 2. Insertar detalles en caja_movi_detalle
foreach ($subtotales as $cod_tarj => $importe_detalle) {
    $detalle = array(
        'id_movimiento' => $id_movimiento,
        'cod_tarj' => $cod_tarj,
        'importe_detalle' => $importe_detalle,
        'porcentaje' => $porcentaje
    );
    $this->db->insert('caja_movi_detalle', $detalle);
}
```

**Observación:**
- El backend NO crea movimientos separados por caja
- Solo inserta UN movimiento en `caja_movi` con la caja recibida del frontend
- Los detalles en `caja_movi_detalle` son solo informativos

---

## 📊 COMPARACIÓN: ACTUAL vs ESPERADO

### Comportamiento Actual

```
Venta:
  - Producto 1: $6,546.16 → EFECTIVO
  - Producto 2: $27,309.24 → TRANSFERENCIA

Resultado en Base de Datos:

┌──────────────────────────────────────┐
│ caja_movi (1 registro)               │
├──────────────────────────────────────┤
│ id_movimiento: 47                    │
│ importe_mov: $33,855.40             │
│ caja: 1 (Caja Efectivo)             │  ← Solo afecta esta caja
│ ...                                  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ caja_movi_detalle (2 registros)      │
├──────────────────────────────────────┤
│ Detalle 1: EFECTIVO $6,546.16       │  ← Informativo
│ Detalle 2: TRANSFERENCIA $27,309.24 │  ← Informativo
└──────────────────────────────────────┘

Cajas afectadas:
✅ Caja Efectivo: +$33,855.40
❌ Caja Transferencia: $0 (no afectada)
```

### Comportamiento Esperado (por el usuario)

```
Venta:
  - Producto 1: $6,546.16 → EFECTIVO
  - Producto 2: $27,309.24 → TRANSFERENCIA

Resultado Esperado en Base de Datos:

Opción A: MÚLTIPLES MOVIMIENTOS
┌──────────────────────────────────────┐
│ caja_movi (2 registros)              │
├──────────────────────────────────────┤
│ Movimiento 1:                        │
│   importe_mov: $6,546.16            │
│   caja: 1 (Caja Efectivo)           │
├──────────────────────────────────────┤
│ Movimiento 2:                        │
│   importe_mov: $27,309.24           │
│   caja: 5 (Caja Transferencia)      │
└──────────────────────────────────────┘

Cajas afectadas:
✅ Caja Efectivo: +$6,546.16
✅ Caja Transferencia: +$27,309.24
```

---

## 🎯 SOLUCIONES PROPUESTAS

### SOLUCIÓN 1: Crear Múltiples Movimientos de Caja (Recomendada)

**Descripción:**
En lugar de crear UN movimiento con desglose, crear UN MOVIMIENTO POR CADA MÉTODO DE PAGO.

**Ventajas:**
- ✅ Cada caja se afecta correctamente
- ✅ Reportes de caja precisos por método de pago
- ✅ Arquitectura más clara y auditabl
e
- ✅ Compatible con sistema actual de cajas

**Desventajas:**
- ⚠️ Requiere cambios en frontend y backend
- ⚠️ Múltiples registros en `caja_movi` (aumenta volumen)
- ⚠️ Más complejo de consultar (necesita agrupar)

**Impacto:**
- 🟡 MEDIO - Requiere modificar lógica de creación de movimientos
- 🟡 Requiere modificar consultas de reportes
- 🟡 Requiere actualizar vistas y componentes

**Implementación:**

#### Frontend (carrito.component.ts)

```typescript
// CAMBIO: Crear un objeto caja_movi por cada método de pago
crearCajasMovi(pedido: any, cabecera: any, fecha: Date, subtotales: any[]): Promise<any[]> {
  const promesas: Promise<any>[] = [];

  // Por cada método de pago, crear un movimiento separado
  for (const subtotal of subtotales) {
    const tarjetaInfo = this.tarjetas.find(
      t => t.tarjeta === subtotal.tipoPago
    );

    if (!tarjetaInfo) continue;

    // Obtener id_caja para este método de pago
    const promesa = this._cargardata
      .getIdCajaFromConcepto(tarjetaInfo.idcp_ingreso)
      .pipe(take(1))
      .toPromise()
      .then(response => {
        const idCaja = response.mensaje[0].id_caja;

        // Crear movimiento con el importe de este método
        return {
          // ... campos comunes
          importe_mov: subtotal.subtotal,  // Solo el importe de este método
          caja: idCaja,                     // Caja correspondiente
          codigo_mov: tarjetaInfo.idcp_ingreso,
          // ...
        };
      });

    promesas.push(promesa);
  }

  return Promise.all(promesas);
}

// CAMBIO: Enviar múltiples movimientos al backend
agregarPedido(pedido: any, sucursal: any) {
  // ...
  const subtotales = this.calcularSubtotalesPorTipoPago();

  this.crearCajasMovi(pedido, cabecera, fecha, subtotales)
    .then(movimientos_caja => {
      // Enviar array de movimientos
      this._subirdata.subirDatosPedidos(
        pedido,
        cabecera,
        sucursal,
        movimientos_caja,  // ← Array en lugar de un solo objeto
        subtotalesParaBackend
      ).subscribe(/* ... */);
    });
}
```

#### Backend (Descarga.php.txt)

```php
public function PedidossucxappCompleto_post() {
    // ...

    // CAMBIO: Recibir array de movimientos
    $movimientos_caja = $this->post('caja_movi');  // Ahora es array

    if (!is_array($movimientos_caja)) {
        // Compatibilidad: convertir objeto único a array
        $movimientos_caja = [$movimientos_caja];
    }

    $this->db->trans_start();

    try {
        // CAMBIO: Insertar múltiples movimientos
        $ids_movimientos = [];
        foreach ($movimientos_caja as $caja_movi) {
            $this->db->insert('caja_movi', $caja_movi);
            $ids_movimientos[] = $this->db->insert_id();
        }

        // Insertar detalles vinculados a cada movimiento
        $index = 0;
        foreach ($subtotales_finales as $cod_tarj => $importe_detalle) {
            $id_mov = $ids_movimientos[$index];

            $detalle = array(
                'id_movimiento' => $id_mov,
                'cod_tarj' => $cod_tarj,
                'importe_detalle' => $importe_detalle,
                'porcentaje' => 100  // Cada movimiento es 100% de ese método
            );

            $this->db->insert('caja_movi_detalle', $detalle);
            $index++;
        }

        $this->db->trans_complete();

        // ...
    } catch (Exception $e) {
        $this->db->trans_rollback();
        // ...
    }
}
```

#### Migración de Datos Existentes

```sql
-- Vista para reportes que agrupan movimientos relacionados
CREATE VIEW v_cajamovi_agrupados AS
SELECT
    cm1.fecha_mov,
    cm1.descripcion_mov,
    cm1.tipo_comprobante,
    cm1.numero_comprobante,
    SUM(cm1.importe_mov) AS importe_total,
    STRING_AGG(
        cl.descripcion || ': $' || cm1.importe_mov::TEXT,
        ', '
        ORDER BY cm1.id_movimiento
    ) AS desglose_cajas
FROM caja_movi cm1
LEFT JOIN caja_lista cl ON cm1.caja = cl.id_caja
WHERE cm1.tipo_comprobante IS NOT NULL
  AND cm1.numero_comprobante IS NOT NULL
GROUP BY
    cm1.fecha_mov,
    cm1.descripcion_mov,
    cm1.tipo_comprobante,
    cm1.numero_comprobante;

COMMENT ON VIEW v_cajamovi_agrupados IS
'Agrupa movimientos de caja que pertenecen a la misma venta (mismo comprobante) mostrando el total y el desglose por caja.';
```

---

### SOLUCIÓN 2: Mantener Diseño Actual + Mejorar Visualización (Solución Temporal)

**Descripción:**
Aceptar que el desglose es solo INFORMATIVO y mejorar la UI para que quede claro qué caja se afecta.

**Ventajas:**
- ✅ CERO cambios en base de datos
- ✅ Cambios mínimos en código
- ✅ Rápido de implementar
- ✅ Sin riesgo de regresión

**Desventajas:**
- ❌ NO resuelve el problema de fondo
- ❌ Las cajas no se afectan correctamente
- ❌ Reportes de caja inconsistentes

**Impacto:**
- 🟢 BAJO - Solo cambios cosméticos en UI

**Implementación:**

#### Frontend (cajamovi.component.html)

```html
<!-- CAMBIO: Mostrar claramente qué caja se afecta -->
<div class="movimiento-header">
  <p-panel>
    <ng-template pTemplate="header">
      <div class="header-content">
        <span class="tipo">{{ movimiento.descripcion_concepto }}</span>
        <span class="importe">${{ movimiento.importe_mov | number:'1.2-2' }}</span>
        <span class="caja-afectada">
          🏦 Caja Afectada: <strong>{{ movimiento.descripcion_caja }}</strong>
        </span>
      </div>
    </ng-template>

    <!-- Desglose de Métodos de Pago (solo informativo) -->
    <div *ngIf="movimiento.desglose_metodos_pago?.length > 1" class="desglose-info">
      <p-message
        severity="info"
        text="ℹ️ Este movimiento incluye múltiples métodos de pago, pero solo afecta la caja principal mostrada arriba."
      ></p-message>

      <table>
        <thead>
          <tr>
            <th>Método de Pago</th>
            <th>Importe</th>
            <th>%</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let detalle of movimiento.desglose_metodos_pago; let i = index">
            <td>{{ detalle.nombre_tarjeta }}</td>
            <td>${{ detalle.importe_detalle | number:'1.2-2' }}</td>
            <td>{{ detalle.porcentaje }}%</td>
            <td>
              <span *ngIf="i === 0" class="tag-afectado">Caja Afectada ✓</span>
              <span *ngIf="i !== 0" class="tag-info">Informativo</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </p-panel>
</div>
```

#### Documentación

```markdown
# NOTA: Desglose de Métodos de Pago (Informativo)

El sistema registra el desglose de métodos de pago en la tabla
`caja_movi_detalle`, pero SOLO AFECTA UNA CAJA por movimiento.

**Caja afectada:** La caja del PRIMER método de pago del pedido.

**Ejemplo:**
- Venta: $1000
  - EFECTIVO: $400
  - TRANSFERENCIA: $600

**Registros:**
- caja_movi: 1 registro con importe $1000 en "Caja Efectivo"
- caja_movi_detalle: 2 registros (EFECTIVO $400, TRANSFERENCIA $600)

**Resultado:**
- ✅ Caja Efectivo se afecta por $1000
- ❌ Caja Transferencia NO se afecta
- ℹ️ El desglose es solo informativo para reportes

**Solución futura:** Implementar múltiples movimientos de caja (uno por método).
```

---

### SOLUCIÓN 3: Agregar Campo `id_caja` a `caja_movi_detalle` (Alternativa Compleja)

**Descripción:**
Modificar `caja_movi_detalle` para que CADA DETALLE pueda afectar su propia caja, y crear triggers/funciones que actualicen los saldos de cada caja.

**Ventajas:**
- ✅ Mantiene un solo movimiento en `caja_movi`
- ✅ Cada método de pago afecta su caja
- ✅ Desglose más granular

**Desventajas:**
- ❌ Muy complejo de implementar
- ❌ Requiere triggers adicionales
- ❌ Cambia paradigma de movimientos de caja
- ❌ Posibles problemas de concurrencia

**NO RECOMENDADA** - Demasiado compleja para el beneficio obtenido.

---

## 📈 COMPARACIÓN DE SOLUCIONES

| Aspecto | Solución 1 (Múltiples Movimientos) | Solución 2 (Informativo) | Solución 3 (id_caja en detalle) |
|---------|-----------------------------------|-------------------------|-------------------------------|
| **Complejidad** | 🟡 Media | 🟢 Baja | 🔴 Alta |
| **Tiempo de implementación** | 2-3 días | 2-4 horas | 5-7 días |
| **Riesgo de regresión** | 🟡 Medio | 🟢 Bajo | 🔴 Alto |
| **Resuelve el problema** | ✅ Sí, completamente | ❌ No, solo documenta | ✅ Sí, pero complejo |
| **Afecta cajas correctamente** | ✅ Sí | ❌ No | ✅ Sí |
| **Reportes de caja precisos** | ✅ Sí (requiere agrupación) | ❌ No | ✅ Sí |
| **Compatibilidad hacia atrás** | 🟡 Requiere migración de datos | ✅ 100% compatible | 🟡 Requiere migración |
| **Mantenibilidad** | ✅ Alta | ✅ Alta | 🔴 Baja |

---

## ✅ RECOMENDACIÓN FINAL

### Solución Recomendada: **SOLUCIÓN 1 (Múltiples Movimientos)**

**Justificación:**

1. **Corrección funcional:** Es la única solución que realmente afecta las cajas correctamente
2. **Arquitectura clara:** Cada movimiento representa un ingreso/egreso real a una caja específica
3. **Reportes precisos:** Los reportes de caja reflejan la realidad de cada método de pago
4. **Escalabilidad:** Funciona para N métodos de pago sin limitaciones
5. **Auditoría:** Cada movimiento es independiente y trazable

### Plan de Implementación

#### Fase 1: Análisis y Diseño (1 día)
- [ ] Revisar todos los componentes que consultan `caja_movi`
- [ ] Diseñar estructura de agrupación de movimientos
- [ ] Crear script de migración para datos existentes

#### Fase 2: Backend (1 día)
- [ ] Modificar `PedidossucxappCompleto_post()` para recibir array de movimientos
- [ ] Modificar `insertarDetallesMetodosPago()` para vincular correctamente
- [ ] Agregar campo `id_movimiento_padre` para agrupar (opcional)
- [ ] Crear vista `v_cajamovi_agrupados`

#### Fase 3: Frontend (1 día)
- [ ] Modificar `crearCajaMovi()` para generar múltiples movimientos
- [ ] Actualizar `subirDatosPedidos()` para enviar array
- [ ] Modificar `cajamovi.component.ts` para agrupar visualización
- [ ] Actualizar reportes de caja

#### Fase 4: Pruebas (0.5 días)
- [ ] Prueba: Venta con 1 método de pago
- [ ] Prueba: Venta con 2 métodos de pago
- [ ] Prueba: Venta con 3+ métodos de pago
- [ ] Prueba: Reportes de caja por método
- [ ] Prueba: Edición de movimientos (verificar política)

#### Fase 5: Migración de Datos (0.5 días)
- [ ] Backup de base de datos
- [ ] Ejecutar script de migración
- [ ] Validar datos migrados

---

## 🔧 SOLUCIÓN RÁPIDA (Temporal)

Si se necesita una solución inmediata mientras se implementa la Solución 1:

### Implementar Solución 2 (Informativo)

**Tiempo:** 2-4 horas
**Riesgo:** Nulo

**Pasos:**

1. Modificar `cajamovi.component.html` para mostrar advertencia (15 min)
2. Actualizar documentación de usuario (30 min)
3. Agregar tooltip explicativo en UI (15 min)
4. Comunicar limitación al equipo (15 min)

**Resultado:**
- Los usuarios entienden que el desglose es informativo
- Se evita confusión sobre qué caja se afecta
- Funcionalidad actual se mantiene intacta

---

## 📚 DOCUMENTOS DE REFERENCIA

### Documentos Revisados

| Documento | Relevancia | Hallazgo |
|-----------|-----------|----------|
| `001_crear_caja_movi_detalle_alternativa_c.sql` | ⭐⭐⭐ PRINCIPAL | Define estructura de `caja_movi_detalle` sin campo `id_caja` |
| `estadoSolucionC.md` | ⭐⭐⭐ PRINCIPAL | Confirma que Alternativa C es para desglose informativo |
| `carrito.component.ts` | ⭐⭐⭐ CÓDIGO | Líneas 1227-1317: Asigna solo una caja (del primer item) |
| `cajamovi.ts` (interface) | ⭐⭐ REFERENCIA | Campo `caja: number` - solo acepta un ID |
| `tarjcredito.ts` (interface) | ⭐⭐ REFERENCIA | Campo `idcp_ingreso` relaciona método con caja |
| `Descarga.php.txt` | ⭐⭐ CÓDIGO | Líneas 995-1090: Inserta un solo movimiento |

### Código Fuente Clave

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `carrito.component.ts` | 1234-1239 | Toma `primerItem` del pedido |
| `carrito.component.ts` | 1255-1280 | Obtiene `id_caja` del primer método |
| `carrito.component.ts` | 1305 | Asigna `caja: idCajaObtenido` |
| `Descarga.php.txt` | 1045 | `$this->db->insert('caja_movi', $caja_movi)` - un solo insert |
| `Descarga.php.txt` | 5218 | `$this->db->insert('caja_movi_detalle', $detalle)` - inserts de detalles |

---

## 🎯 CONCLUSIONES

### Hallazgos Principales

1. ✅ **El desglose funciona correctamente** - `caja_movi_detalle` registra todos los métodos de pago
2. ✅ **El trigger DEFERRABLE está funcionando** - Los inserts múltiples se completan sin error
3. ❌ **Solo se afecta UNA caja** - Limitación de diseño, no un bug
4. 🔧 **Solución necesaria** - Crear múltiples movimientos o documentar limitación

### Recomendaciones

**Inmediato (Hoy):**
- Implementar Solución 2 (Informativo) para evitar confusión
- Documentar el comportamiento actual
- Comunicar al equipo la limitación

**Corto Plazo (1 semana):**
- Implementar Solución 1 (Múltiples Movimientos)
- Crear vista de agrupación
- Migrar datos existentes

**Largo Plazo:**
- Revisar reportes de caja para usar agrupación
- Considerar campo `id_venta` para vincular movimientos relacionados
- Optimizar consultas de reportes

---

**Fin del Informe**

**Fecha:** 21 de Octubre de 2025
**Estado:** Análisis Completo - Soluciones Propuestas
**Próximo Paso:** Decisión sobre qué solución implementar
