# ANÁLISIS: Estrategia Dual - Campo sucursal_movstock para Fix Quirúrgico

**Fecha**: 2025-11-02
**Versión**: 1.0
**Tipo**: Análisis de Solución Alternativa
**Criticidad**: 🟡 MEDIA - Solución conservadora con menor riesgo
**Autor**: Análisis Técnico MotoApp

---

## Resumen Ejecutivo

**Propuesta**: En lugar de modificar el campo `sucursal` existente en sessionStorage, agregar el campo `valorreal` en Firebase y crear un NUEVO campo `sucursal_movstock` en sessionStorage que se use EXCLUSIVAMENTE en los componentes de movimiento de stock.

**Filosofía**: "Fix quirúrgico" en lugar de cambio sistémico.

**Veredicto**: ✅ **RECOMENDADO COMO SOLUCIÓN DE MENOR RIESGO** con consideraciones importantes.

---

## 1. Contexto: Problema Actual

### 1.1 Desalineamiento Identificado

Existe un desalineamiento histórico entre Firebase `value` y PostgreSQL `cod_sucursal`:

| Firebase value | Nombre         | PostgreSQL cod_sucursal | Nombre (PostgreSQL) |
|----------------|----------------|-------------------------|---------------------|
| 1              | Casa Central   | 1                       | DEPOSITO            |
| 2              | Valle Viejo    | 2                       | CASA CENTRAL        |
| 3              | Guemes         | 3                       | VALLE VIEJO         |
| 4              | Deposito       | 4                       | GUEMES              |
| 5              | Mayorista      | 5                       | MAYORISTA           |

### 1.2 Problema Específico en Movimientos de Stock

El mapeo hardcodeado en backend (Descarga.php) fue implementado el 31 de octubre de 2025:

```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central (Firebase value 1 → cod_sucursal 2)
    2 => 'exi3', // Valle Viejo  (Firebase value 2 → cod_sucursal 3)
    3 => 'exi4', // Guemes       (Firebase value 3 → cod_sucursal 4)
    4 => 'exi1', // Deposito     (Firebase value 4 → cod_sucursal 1)
    5 => 'exi5'  // Mayorista    (Firebase value 5 → cod_sucursal 5)
];
```

Este mapeo es **necesario** pero **complejo** de mantener.

---

## 2. Propuesta: Estrategia Dual

### 2.1 Concepto

**Coexistencia de dos valores de sucursal**:
1. `sessionStorage.getItem('sucursal')`: Mantener sin cambios (Firebase `value`)
2. `sessionStorage.getItem('sucursal_movstock')`: Nuevo campo (Firebase `valorreal` = cod_sucursal)

### 2.2 Arquitectura Propuesta

#### Firebase (agregar campo `valorreal`):
```json
{
  "sucursales": {
    "[key-casa-central]": {
      "nombre": "Casa Central",
      "value": 1,        // LEGACY - Mantener sin cambios
      "valorreal": 2     // NUEVO - Corresponde a cod_sucursal 2
    },
    "[key-valle-viejo]": {
      "nombre": "Suc. Valle Viejo",
      "value": 2,        // LEGACY
      "valorreal": 3     // NUEVO - Corresponde a cod_sucursal 3
    },
    "[key-guemes]": {
      "nombre": "Suc. Guemes",
      "value": 3,        // LEGACY
      "valorreal": 4     // NUEVO - Corresponde a cod_sucursal 4
    },
    "[key-deposito]": {
      "nombre": "Deposito",
      "value": 4,        // LEGACY
      "valorreal": 1     // NUEVO - Corresponde a cod_sucursal 1
    },
    "[key-mayorista]": {
      "nombre": "Mayorista",
      "value": 5,        // LEGACY
      "valorreal": 5     // NUEVO - Corresponde a cod_sucursal 5
    }
  }
}
```

#### SessionStorage (después del login):
```typescript
// Valores almacenados después de login
sessionStorage.setItem('sucursal', '4');        // Firebase value (LEGACY)
sessionStorage.setItem('sucursal_movstock', '1'); // Firebase valorreal (NUEVO)
```

Para usuario que selecciona "Deposito":
- `sucursal = '4'` → Usado por: facturas, carrito, caja, reportes, etc. (26 componentes)
- `sucursal_movstock = '1'` → Usado por: movimientos de stock (6 componentes)

---

## 3. Alcance del Cambio

### 3.1 Componentes de Movimiento de Stock (✅ Cambiar)

Total: **6 componentes** que usan movimientos de stock:

| Componente | Archivo | Línea | Cambio Requerido |
|------------|---------|-------|------------------|
| stockpedido | stockpedido.component.ts | 72 | `sucursal` → `sucursal_movstock` |
| stockrecibo | stockrecibo.component.ts | 69 | `sucursal` → `sucursal_movstock` |
| stockproductopedido | stockproductopedido.component.ts | 39 | `sucursal` → `sucursal_movstock` |
| stockproductoenvio | stockproductoenvio.component.ts | 35 | `sucursal` → `sucursal_movstock` |
| enviostockpendientes | enviostockpendientes.component.ts | 73 | `sucursal` → `sucursal_movstock` |
| enviodestockrealizados | enviodestockrealizados.component.ts | 51 | `sucursal` → `sucursal_movstock` |

**Cambio típico**:
```typescript
// ANTES
this.sucursal = sessionStorage.getItem('sucursal');

// DESPUÉS
this.sucursal = sessionStorage.getItem('sucursal_movstock');
```

---

### 3.2 Componentes NO Afectados (❌ Sin cambios)

Total: **26 archivos** con 69 usos de `sessionStorage.getItem('sucursal')`:

**Categorías**:
1. **Ventas**: carrito, puntoventa, historialventas, historialventas2
2. **Caja**: cajamovi, analisiscaja, analisiscajaprod, editcajamovi, newcajamovi
3. **Clientes**: cabeceras, cuentacorriente, editcliente, newcliente
4. **Inventario**: grilla, cambioprecios
5. **Configuración**: condicionventa, empresa-config
6. **Servicios**: articulos-paginados, historial-pdf, price-update, stock-paginados, etc.

**Estado**: ✅ **NINGÚN CAMBIO REQUERIDO** - Siguen usando `sucursal` (Firebase value)

---

### 3.3 Backend (✅ Simplificar mapeo)

**Funciones afectadas** (3 funciones en Descarga.php):

| Función | Líneas | Propósito | Cambio |
|---------|--------|-----------|--------|
| PedidoItemyCabId_post | 1653-1795 | Confirmar recepción de stock | Simplificar mapeo |
| PedidoItemyCabIdEnvio_post | 1796-1942 | Envío directo de stock | Simplificar mapeo |
| (Función de cancelación) | ~1832 | Cancelar envío de stock | Simplificar mapeo |

**Cambio en backend**:

```php
// ============================================================================
// ANTES (con Firebase value)
// ============================================================================
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];

$sucursal = $pedidoscb['sucursald']; // Recibe Firebase value (1-5)
$campo_stock = $mapeo_sucursal_exi[$sucursal]; // Traduce a exiN

// ============================================================================
// DESPUÉS (con valorreal desde sucursal_movstock)
// ============================================================================
// MAPEO SIMPLIFICADO - sucursal_movstock ya corresponde a cod_sucursal
$mapeo_sucursal_exi = [
    1 => 'exi1', // Deposito      (cod_sucursal 1)
    2 => 'exi2', // Casa Central  (cod_sucursal 2)
    3 => 'exi3', // Valle Viejo   (cod_sucursal 3)
    4 => 'exi4', // Guemes        (cod_sucursal 4)
    5 => 'exi5'  // Mayorista     (cod_sucursal 5)
];

// O incluso más simple (eliminar mapeo):
$sucursal = $pedidoscb['sucursald']; // Recibe valorreal = cod_sucursal
$campo_stock = 'exi' . $sucursal;    // Construcción directa
```

**Ventaja**: Mapeo se vuelve 1:1 (o elimina la necesidad de mapeo).

---

### 3.4 Login Component (✅ Agregar segundo campo)

**Archivo**: `login2.component.ts`

**Cambio**: Almacenar AMBOS valores después del login:

```typescript
// Método loadSucursales() - línea 45-64
loadSucursales(): void {
  this.crudService.getListSnap('sucursales').pipe(
    takeUntil(this.destroy$)
  ).subscribe(
    data => {
      this.sucursales = data.map(item => {
        const payload = item.payload.val() as any;
        return {
          key: item.key,
          nombre: payload.nombre,
          value: payload.value,              // LEGACY
          valorreal: payload.valorreal        // NUEVO
        };
      });
    }
  );
}

// Método de login - después de línea 126
// ANTES:
sessionStorage.setItem('sucursal', this.sucursal);

// DESPUÉS:
sessionStorage.setItem('sucursal', this.sucursal);  // LEGACY - value

// NUEVO: Buscar valorreal correspondiente al value seleccionado
const sucursalObj = this.sucursales.find(s => s.value === parseInt(this.sucursal, 10));
if (sucursalObj && sucursalObj.valorreal !== undefined) {
  sessionStorage.setItem('sucursal_movstock', sucursalObj.valorreal.toString());
} else {
  // Fallback: si no existe valorreal, usar value
  sessionStorage.setItem('sucursal_movstock', this.sucursal);
}
```

**Efecto**:
- Usuario selecciona "Deposito"
- Firebase retorna: `{value: 4, valorreal: 1}`
- Se almacena:
  - `sucursal = '4'` → Para facturas, carrito, reportes, etc.
  - `sucursal_movstock = '1'` → Para movimientos de stock

---

## 4. Análisis de Riesgos

### 4.1 ✅ Ventajas de la Estrategia Dual

#### Ventaja 1: Riesgo Mínimo
- **Impacto controlado**: Solo 6 componentes de movstock cambian
- **26 componentes sin tocar**: Facturas, ventas, caja, etc. funcionan igual
- **Backend de ventas intacto**: No requiere entender cómo se insertan facturas

**Riesgo**: 🟢 **MUY BAJO** - Cambios aislados

---

#### Ventaja 2: Rollback Trivial
```typescript
// Para hacer rollback, simplemente revertir 6 componentes:
// ROLLBACK
this.sucursal = sessionStorage.getItem('sucursal'); // Volver a usar legacy
```

**Tiempo de rollback**: < 15 minutos

**Riesgo**: 🟢 **MUY BAJO** - Rollback inmediato

---

#### Ventaja 3: Independencia de Investigación
- No requiere resolver la pregunta pendiente: "¿Cómo se insertan facturas?"
- No afecta flujos de facturas, ventas, caja
- Permite implementar sin entender completamente el sistema legacy

**Riesgo**: 🟢 **BAJO** - Desacoplado del sistema principal

---

#### Ventaja 4: Testing Aislado
- Test de movimientos de stock independiente
- Otros módulos no requieren re-testing exhaustivo
- Menor superficie de bugs

**Riesgo**: 🟢 **BAJO** - Superficie de testing pequeña

---

#### Ventaja 5: Deploy Gradual Posible
```
Fase 1: Agregar valorreal a Firebase (sin usar)
Fase 2: Actualizar login para crear sucursal_movstock (sin usar)
Fase 3: Cambiar 1 componente de movstock (pilot)
Fase 4: Cambiar resto de componentes
Fase 5: Actualizar backend (simplificar mapeo)
```

**Riesgo**: 🟢 **MUY BAJO** - Despliegue incremental

---

### 4.2 ⚠️ Desventajas de la Estrategia Dual

#### Desventaja 1: Duplicación de Datos
**Problema**: Dos valores representando la misma sucursal

```typescript
sessionStorage.getItem('sucursal')         // '4' (Firebase value)
sessionStorage.getItem('sucursal_movstock') // '1' (cod_sucursal)
```

**Impacto**:
- Confusión para desarrolladores nuevos
- ¿Cuál usar en nuevos features?
- Documentación adicional requerida

**Mitigación**:
```typescript
// Agregar funciones helper con documentación clara
getSucursalParaVentas(): string {
  return sessionStorage.getItem('sucursal');
}

getSucursalParaMovStock(): string {
  return sessionStorage.getItem('sucursal_movstock');
}
```

**Riesgo**: 🟡 **MEDIO** - Complejidad conceptual

---

#### Desventaja 2: Deuda Técnica
**Problema**: No resuelve el problema de raíz, solo lo parchea

- Firebase values siguen desalineados
- Mapeo hardcodeado persiste (aunque simplificado)
- Sistema tiene dos "idiomas" para sucursales

**Impacto a largo plazo**:
- Dificulta migración futura
- Aumenta complejidad del sistema
- Documentación debe explicar dos enfoques

**Riesgo**: 🟠 **MEDIO-ALTO** - Problema sistémico no resuelto

---

#### Desventaja 3: Riesgo de Confusión en Desarrollo
**Problema**: Desarrollador nuevo puede usar el campo incorrecto

**Escenarios de error**:
```typescript
// ❌ ERROR: Componente de movstock usa 'sucursal' en lugar de 'sucursal_movstock'
this.sucursal = sessionStorage.getItem('sucursal'); // INCORRECTO para movstock

// ❌ ERROR: Componente de ventas usa 'sucursal_movstock' en lugar de 'sucursal'
this.sucursal = sessionStorage.getItem('sucursal_movstock'); // INCORRECTO para ventas
```

**Mitigación**:
1. Documentación clara con ejemplos
2. Comentarios en código
3. Funciones helper con nombres descriptivos
4. Code review estricto

**Riesgo**: 🟡 **MEDIO** - Error humano probable

---

#### Desventaja 4: Inconsistencia en Base de Datos
**Problema**: Datos históricos en `pedidoscb` usan Firebase values

**Ejemplo**:
```sql
SELECT * FROM pedidoscb;
-- Registro antiguo:
sucursald = 4, sucursalh = 2  -- Firebase values (4=Deposito, 2=Valle Viejo)

-- Registro nuevo (con fix):
sucursald = 1, sucursalh = 3  -- cod_sucursal (1=Deposito, 3=Valle Viejo)
```

**Impacto**:
- Reportes históricos requieren lógica especial
- Queries deben manejar dos formatos de datos
- Análisis de datos más complejo

**Mitigación**:
- Agregar campo `created_at` o `version` en pedidoscb
- Función de interpretación basada en fecha

**Riesgo**: 🟠 **MEDIO-ALTO** - Complejidad en reportes

---

#### Desventaja 5: Permisos de Usuario (Potencial)
**Problema**: Campo `sucursalesPermitidas` en Firebase de usuarios puede estar usando `value`

**Verificación necesaria**:
```json
{
  "users": {
    "[user-id]": {
      "nombre": "Juan Pérez",
      "sucursalesPermitidas": [1, 3, 5]  // ¿Son Firebase values o cod_sucursal?
    }
  }
}
```

**Pregunta crítica**: ¿Con qué valor se compara en login?

```typescript
// login2.component.ts línea 118
const sucursalValue = parseInt(this.sucursal, 10); // ¿Usa value o valorreal?
if (!user.sucursalesPermitidas.includes(sucursalValue)) {
  this.showError('No tiene acceso a la sucursal seleccionada');
  return;
}
```

**Mitigación**:
- Verificar implementación actual
- Actualizar validación si es necesario
- Migrar permisos de usuarios a usar valorreal

**Riesgo**: 🔴 **ALTO** - Puede bloquear usuarios

---

### 4.3 🔴 Riesgos Críticos

#### Riesgo Crítico 1: Inconsistencia Temporal

**Durante migración gradual**:
```
Usuario Deposito:
- sessionStorage: sucursal='4', sucursal_movstock='1'
- Componente A (migrado): Usa sucursal_movstock='1' → Correcto
- Componente B (no migrado): Usa sucursal='4' → Incorrecto (usa mapeo viejo)
- Backend: Espera cod_sucursal=1 o Firebase value=4 dependiendo de la función
```

**Mitigación**: Deploy atómico de todos los componentes de movstock juntos.

**Riesgo**: 🔴 **ALTO** durante transición - 🟢 **BAJO** después de completar

---

#### Riesgo Crítico 2: Sesiones Activas Durante Deploy

**Usuarios con sesión activa antes del deploy**:
```
Usuario logueado ANTES del deploy:
- sessionStorage: sucursal='4'
- sessionStorage: sucursal_movstock=undefined ❌

Usuario usa componente de movstock DESPUÉS del deploy:
- Componente busca sucursal_movstock → undefined
- Posible error o comportamiento inesperado
```

**Mitigación**:
```typescript
// Fallback en componentes
this.sucursal = sessionStorage.getItem('sucursal_movstock')
               || sessionStorage.getItem('sucursal'); // Fallback a legacy
```

**Riesgo**: 🟡 **MEDIO** - Mitigable con fallback

---

## 5. Comparación: Estrategia Dual vs Solución Completa

### 5.1 Tabla Comparativa

| Aspecto | Estrategia Dual (sucursal_movstock) | Solución Completa (solo sucursal) |
|---------|-------------------------------------|-----------------------------------|
| **Componentes afectados** | 6 (solo movstock) | 32 (todos) |
| **Riesgo de implementación** | 🟢 Bajo | 🟡 Medio |
| **Tiempo de desarrollo** | 2-3 días | 1-2 semanas |
| **Complejidad de testing** | 🟢 Baja (6 componentes) | 🟡 Alta (32 componentes) |
| **Rollback** | 🟢 Trivial (<15 min) | 🟡 Complejo (2-4 horas) |
| **Riesgo de regresión** | 🟢 Muy bajo | 🟡 Medio |
| **Deuda técnica** | 🔴 Alta (dos sistemas) | 🟢 Baja (un sistema) |
| **Mantenibilidad** | 🔴 Compleja (confusión) | 🟢 Simple (consistente) |
| **Resuelve problema de raíz** | ❌ No (parchea) | ✅ Sí (resuelve) |
| **Requiere investigación adicional** | ❌ No | ✅ Sí (inserción facturas) |
| **Consistencia de datos** | 🔴 Baja (dos formatos) | 🟢 Alta (un formato) |
| **Documentación requerida** | 🔴 Alta | 🟢 Baja |

---

### 5.2 Escenarios de Uso Recomendados

#### Usar Estrategia Dual SI:
1. ✅ Necesitas solución RÁPIDA (< 1 semana)
2. ✅ Riesgo de downtime es CRÍTICO
3. ✅ Sistema en producción con muchos usuarios activos
4. ✅ No tienes tiempo para investigar inserción de facturas
5. ✅ Necesitas solución reversible fácilmente
6. ✅ Equipo pequeño / recursos limitados

#### Usar Solución Completa SI:
1. ✅ Tienes tiempo para investigación exhaustiva (2+ semanas)
2. ✅ Sistema está en fase inicial (pocos datos históricos)
3. ✅ Prioridad es limpieza arquitectónica a largo plazo
4. ✅ Equipo grande / recursos disponibles para testing completo
5. ✅ Puedes tolerar downtime o ventana de mantenimiento
6. ✅ Quieres eliminar deuda técnica

---

## 6. Plan de Implementación (Estrategia Dual)

### 6.1 Fase 0: Preparación (1 día)

#### Tarea 1: Agregar `valorreal` a Firebase
```json
{
  "sucursales": {
    "[key-casa-central]": {
      "nombre": "Casa Central",
      "value": 1,
      "valorreal": 2  // AGREGAR
    },
    // ... resto de sucursales
  }
}
```

**Validación**:
```
✅ Cada sucursal tiene campo valorreal
✅ valorreal corresponde a cod_sucursal de PostgreSQL
✅ value legacy permanece sin cambios
```

---

#### Tarea 2: Backup
- Firebase Realtime Database
- PostgreSQL (tablas: pedidoscb, pedidosdet, artsucursal)
- Código fuente (branch nuevo)

---

#### Tarea 3: Crear documentación
**Archivo**: `GUIA_SUCURSAL_VS_MOVSTOCK.md`

```markdown
# Guía: Cuándo usar sucursal vs sucursal_movstock

## Para VENTAS, CAJA, REPORTES:
usar: sessionStorage.getItem('sucursal')

## Para MOVIMIENTOS DE STOCK:
usar: sessionStorage.getItem('sucursal_movstock')

## Tabla de Referencia:
| Sucursal       | sucursal (legacy) | sucursal_movstock |
|----------------|-------------------|-------------------|
| Deposito       | 4                 | 1                 |
| Casa Central   | 1                 | 2                 |
| Valle Viejo    | 2                 | 3                 |
| Guemes         | 3                 | 4                 |
| Mayorista      | 5                 | 5                 |
```

---

### 6.2 Fase 1: Frontend - Login Component (2 horas)

**Archivo**: `login2.component.ts`

**Cambio 1**: Actualizar interface

```typescript
// Agregar campo en interface de sucursal
interface Sucursal {
  key: string;
  nombre: string;
  value: number;
  valorreal?: number;  // NUEVO - opcional para compatibilidad
}
```

**Cambio 2**: Modificar loadSucursales()

```typescript
loadSucursales(): void {
  this.crudService.getListSnap('sucursales').pipe(
    takeUntil(this.destroy$)
  ).subscribe(
    data => {
      this.sucursales = data.map(item => {
        const payload = item.payload.val() as any;
        return {
          key: item.key,
          nombre: payload.nombre,
          value: payload.value,
          valorreal: payload.valorreal  // NUEVO
        };
      });
    },
    error => {
      console.error('Error al cargar sucursales:', error);
      this.showError('Error al cargar las sucursales');
    }
  );
}
```

**Cambio 3**: Almacenar ambos valores en login

```typescript
// Después de línea 126
// LEGACY: Mantener comportamiento existente
sessionStorage.setItem('sucursal', this.sucursal);

// NUEVO: Agregar sucursal_movstock
const sucursalObj = this.sucursales.find(s => s.value === parseInt(this.sucursal, 10));
if (sucursalObj) {
  if (sucursalObj.valorreal !== undefined) {
    sessionStorage.setItem('sucursal_movstock', sucursalObj.valorreal.toString());
    console.log(`[LOGIN] Sucursal legacy: ${this.sucursal}, Sucursal movstock: ${sucursalObj.valorreal}`);
  } else {
    // Fallback si no existe valorreal (compatibilidad)
    sessionStorage.setItem('sucursal_movstock', this.sucursal);
    console.warn('[LOGIN] valorreal no encontrado, usando value como fallback');
  }
}
```

**Testing**:
```
✅ Usuario selecciona "Deposito"
✅ sessionStorage.sucursal = '4'
✅ sessionStorage.sucursal_movstock = '1'
✅ Otros componentes funcionan normalmente (usan sucursal='4')
```

---

### 6.3 Fase 2: Frontend - Componentes de MovStock (4 horas)

**Cambio en 6 archivos**:

| Archivo | Línea | Cambio |
|---------|-------|--------|
| stockpedido.component.ts | 72 | Cambiar a sucursal_movstock |
| stockrecibo.component.ts | 69 | Cambiar a sucursal_movstock |
| stockproductopedido.component.ts | 39 | Cambiar a sucursal_movstock |
| stockproductoenvio.component.ts | 35 | Cambiar a sucursal_movstock |
| enviostockpendientes.component.ts | 73 | Cambiar a sucursal_movstock |
| enviodestockrealizados.component.ts | 51 | Cambiar a sucursal_movstock |

**Template de cambio**:

```typescript
// ANTES
this.sucursal = Number(sessionStorage.getItem('sucursal'));

// DESPUÉS
// IMPORTANTE: Usar sucursal_movstock para movimientos de stock
// Este valor corresponde directamente a cod_sucursal de PostgreSQL
this.sucursal = Number(
  sessionStorage.getItem('sucursal_movstock')
  || sessionStorage.getItem('sucursal') // Fallback para sesiones activas
);

// Agregar log para debugging
console.log(`[${this.constructor.name}] Usando sucursal_movstock: ${this.sucursal}`);
```

**Ventaja del fallback**: Sesiones activas durante deploy no rompen.

---

### 6.4 Fase 3: Backend - Simplificar Mapeo (2 horas)

**Archivo**: `Descarga.php`

**Funciones a modificar**:
1. `PedidoItemyCabId_post()` (línea ~1729)
2. `PedidoItemyCabIdEnvio_post()` (línea ~1832)
3. Función de cancelación (línea ~1935)

**Cambio en las 3 funciones**:

```php
// ============================================================================
// MAPEO SIMPLIFICADO PARA MOVIMIENTOS DE STOCK
// ============================================================================
// NOTA: Ahora recibimos 'valorreal' desde sucursal_movstock en frontend,
//       que corresponde directamente a cod_sucursal de PostgreSQL.
// FECHA CAMBIO: 2025-11-02
// ANTES: Frontend enviaba Firebase value (desalineado)
// AHORA: Frontend envía cod_sucursal (alineado)
// ============================================================================
$mapeo_sucursal_exi = [
    1 => 'exi1', // Deposito      (cod_sucursal 1)
    2 => 'exi2', // Casa Central  (cod_sucursal 2)
    3 => 'exi3', // Valle Viejo   (cod_sucursal 3)
    4 => 'exi4', // Guemes        (cod_sucursal 4)
    5 => 'exi5'  // Mayorista     (cod_sucursal 5)
];
// ============================================================================
// FUTURO: Este mapeo puede eliminarse y usar construcción directa:
// $campo_stock = 'exi' . $sucursal;
// ============================================================================
```

**Alternativa (eliminar mapeo completamente)**:

```php
// Opción más limpia (si se siente confianza):
$sucursal_destino = $pedidoscb['sucursald']; // Ya es cod_sucursal
$campo_stock_destino = 'exi' . $sucursal_destino; // Construcción directa

// Validación de seguridad
if (!in_array($sucursal_destino, [1, 2, 3, 4, 5])) {
    $this->response([
        'status' => 'error',
        'message' => 'Sucursal inválida: ' . $sucursal_destino
    ], 400);
    return;
}
```

---

### 6.5 Fase 4: Testing (1 día)

#### Test 1: Login
```
Caso: Usuario selecciona "Deposito"
✅ sessionStorage.sucursal = '4'
✅ sessionStorage.sucursal_movstock = '1'
✅ Console muestra log correcto
```

#### Test 2: Componentes NO modificados (smoke test)
```
✅ Carrito funciona normal (usa sucursal='4')
✅ Punto de venta funciona normal
✅ Reportes funcionan normal
✅ Caja funciona normal
```

#### Test 3: Crear Pedido de Stock
```
Caso: Usuario Deposito solicita stock a Casa Central
Frontend envía:
  sucursald: 1 (Deposito - cod_sucursal)
  sucursalh: 2 (Casa Central - cod_sucursal)

Backend recibe:
  ✅ sucursald=1, sucursalh=2

Backend inserta pedidoscb:
  ✅ INSERT INTO pedidoscb (sucursald, sucursalh) VALUES (1, 2)

Verificar en BD:
  ✅ SELECT * FROM pedidoscb ORDER BY id_num DESC LIMIT 1;
  ✅ sucursald=1, sucursalh=2
```

#### Test 4: Confirmar Recepción
```
Caso: Casa Central confirma envío a Deposito
Backend usa mapeo:
  sucursald=1 → campo_stock='exi1' ✅ CORRECTO
  sucursalh=2 → campo_stock='exi2' ✅ CORRECTO

Backend actualiza stock:
  ✅ UPDATE artsucursal SET exi1 = exi1 + cantidad (Deposito recibe)
  ✅ UPDATE artsucursal SET exi2 = exi2 - cantidad (Casa Central envía)

Verificar en BD:
  ✅ Stock en exi1 aumentó
  ✅ Stock en exi2 disminuyó
```

#### Test 5: Sesión Activa Durante Deploy
```
Caso: Usuario logueado ANTES del deploy
Estado: sucursal='4', sucursal_movstock=undefined

Acción: Usuario usa componente de movstock

Resultado esperado:
  ✅ Fallback a sucursal='4' funciona
  ✅ No hay error
  ✅ Componente muestra alerta: "Por favor, cierre sesión y vuelva a iniciar"
```

#### Test 6: Rollback
```
Acción: Revertir cambios en 6 componentes
Resultado:
  ✅ Componentes vuelven a usar sucursal
  ✅ Backend sigue funcionando (mapeo legacy)
  ✅ Sistema operativo en < 15 minutos
```

---

### 6.6 Fase 5: Deploy a Producción (2 horas)

#### Paso 1: Comunicación (30 min antes)
```
Mensaje a usuarios:
"En 30 minutos realizaremos una actualización del sistema de movimientos de stock.
Por favor, NO inicien nuevos pedidos de stock durante los próximos 30 minutos.
Pedidos existentes no se verán afectados."
```

#### Paso 2: Actualizar Firebase (5 min)
```
✅ Agregar campo valorreal a todas las sucursales
✅ Verificar valores correctos
✅ Backup de Firebase completado
```

#### Paso 3: Deploy Backend (10 min)
```
✅ Subir Descarga.php actualizado
✅ Verificar que archivo se subió correctamente
✅ Test de endpoint: /api/PedidoItemyCabId (POST)
```

#### Paso 4: Deploy Frontend (15 min)
```
✅ ng build --prod
✅ Deploy de build
✅ Clear cache de navegadores (si aplica)
✅ Verificar que archivos se actualizaron
```

#### Paso 5: Smoke Tests en Producción (30 min)
```
✅ Login con cada sucursal
✅ Verificar sessionStorage tiene ambos campos
✅ Crear 1 pedido de prueba
✅ Confirmar recepción de prueba
✅ Verificar stock se actualizó correctamente
✅ Verificar que ventas funcionan normal
```

#### Paso 6: Monitoreo (24 horas)
```
✅ Revisar logs de errores
✅ Monitorear queries SQL de movstock
✅ Verificar tickets de soporte
✅ Confirmar con usuarios que todo funciona
```

---

## 7. Plan de Rollback

### Trigger de Rollback
Ejecutar rollback SI:
- Errores en movimientos de stock
- Stock actualizado en columnas incorrectas
- Usuarios reportan problemas
- Datos inconsistentes en pedidoscb

### Pasos de Rollback (15 minutos)

#### Paso 1: Revertir Frontend (10 min)
```typescript
// En los 6 componentes de movstock:
// ROLLBACK
this.sucursal = Number(sessionStorage.getItem('sucursal')); // Volver a legacy
```

Build y deploy:
```bash
ng build --prod
# Deploy
```

#### Paso 2: Revertir Backend (5 min)
```php
// Restaurar mapeo legacy en 3 funciones:
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central (legacy)
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];
```

#### Paso 3: Verificar
```
✅ Login funciona
✅ Movstock usa valores legacy
✅ Sistema operativo normal
```

#### Nota: Firebase valorreal
- Campo valorreal puede permanecer
- No afecta si no se usa
- Útil para próximo intento

---

## 8. Mejoras Futuras (Roadmap)

### 8.1 Corto Plazo (Post-implementación)

#### Mejora 1: Funciones Helper (Semana 1)
```typescript
// Archivo: src/app/services/sucursal.service.ts

@Injectable({ providedIn: 'root' })
export class SucursalService {

  /**
   * Obtener valor de sucursal para operaciones de VENTAS, CAJA, REPORTES
   * @returns Firebase value (desalineado con cod_sucursal)
   */
  getSucursalLegacy(): string {
    return sessionStorage.getItem('sucursal') || '';
  }

  /**
   * Obtener valor de sucursal para operaciones de MOVIMIENTOS DE STOCK
   * @returns cod_sucursal de PostgreSQL (alineado con campos exi)
   */
  getSucursalMovStock(): string {
    return sessionStorage.getItem('sucursal_movstock')
           || sessionStorage.getItem('sucursal') // Fallback
           || '';
  }

  /**
   * Obtener nombre de la sucursal actual
   */
  getNombreSucursal(): string {
    // Implementar lógica
  }
}
```

**Ventaja**: Centraliza lógica, facilita futura migración.

---

#### Mejora 2: Validación en Runtime (Semana 2)
```typescript
// Archivo: src/app/guards/sucursal-validation.guard.ts

@Injectable({ providedIn: 'root' })
export class SucursalValidationGuard implements CanActivate {
  canActivate(): boolean {
    const sucursal = sessionStorage.getItem('sucursal');
    const sucursalMovStock = sessionStorage.getItem('sucursal_movstock');

    if (!sucursal || !sucursalMovStock) {
      console.error('[GUARD] Valores de sucursal faltantes');
      // Redirigir a login
      return false;
    }

    // Validar coherencia
    const mapeo = {
      '4': '1', // Deposito: value=4, valorreal=1
      '1': '2', // Casa Central: value=1, valorreal=2
      // ...
    };

    if (mapeo[sucursal] !== sucursalMovStock) {
      console.error('[GUARD] Valores de sucursal inconsistentes');
      return false;
    }

    return true;
  }
}
```

Aplicar guard a rutas de movstock:
```typescript
{
  path: 'stockpedido',
  component: StockPedidoComponent,
  canActivate: [SucursalValidationGuard]  // NUEVO
}
```

---

### 8.2 Mediano Plazo (1-3 meses)

#### Mejora 3: Migración de Datos Históricos
```sql
-- Script de migración para pedidoscb
-- Traducir Firebase values antiguos a cod_sucursal

-- Agregar columna de versión
ALTER TABLE pedidoscb ADD COLUMN data_version INTEGER DEFAULT 1;

-- Marcar registros antiguos
UPDATE pedidoscb
SET data_version = 1
WHERE fecha < '2025-11-02'; -- Fecha del cambio

-- Registros nuevos tendrán data_version = 2

-- Función para interpretar sucursald según versión:
CREATE OR REPLACE FUNCTION get_sucursal_nombre(
  p_sucursal INTEGER,
  p_version INTEGER
) RETURNS VARCHAR AS $$
BEGIN
  IF p_version = 1 THEN
    -- Firebase value (legacy)
    CASE p_sucursal
      WHEN 1 THEN RETURN 'Casa Central';
      WHEN 2 THEN RETURN 'Valle Viejo';
      WHEN 3 THEN RETURN 'Guemes';
      WHEN 4 THEN RETURN 'Deposito';
      WHEN 5 THEN RETURN 'Mayorista';
    END CASE;
  ELSE
    -- cod_sucursal (nuevo)
    SELECT sucursal INTO result FROM sucursales WHERE cod_sucursal = p_sucursal;
    RETURN result;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

#### Mejora 4: Dashboard de Monitoreo
```typescript
// Componente de monitoreo para administradores
// src/app/components/admin/sucursal-monitor.component.ts

export class SucursalMonitorComponent {
  metrics = {
    pedidosConValueLegacy: 0,
    pedidosConCodSucursal: 0,
    inconsistencias: []
  };

  ngOnInit() {
    // Consultar métricas de uso
    this.analyzeDataConsistency();
  }

  analyzeDataConsistency() {
    // Query para identificar inconsistencias
    // Mostrar gráficos de migración
  }
}
```

---

### 8.3 Largo Plazo (6+ meses)

#### Mejora 5: Eliminación de Deuda Técnica

**Objetivo**: Migrar completamente a un solo valor de sucursal

**Estrategia**:
1. Resolver pregunta sobre inserción de facturas
2. Migrar todos los componentes a usar `valorreal`
3. Eliminar campo `value` de Firebase
4. Eliminar `sessionStorage.sucursal`
5. Renombrar `sessionStorage.sucursal_movstock` → `sessionStorage.sucursal`
6. Actualizar documentación

**Timeline**: 6-12 meses después de implementación dual

---

## 9. Decisión y Recomendación Final

### 9.1 Matriz de Decisión

| Criterio | Peso | Dual | Completa | Ganador |
|----------|------|------|----------|---------|
| **Velocidad de implementación** | 20% | 10 | 4 | ✅ Dual |
| **Riesgo de implementación** | 25% | 9 | 5 | ✅ Dual |
| **Facilidad de rollback** | 15% | 10 | 5 | ✅ Dual |
| **Limpieza arquitectónica** | 15% | 3 | 10 | ❌ Completa |
| **Mantenibilidad a largo plazo** | 15% | 4 | 9 | ❌ Completa |
| **Independencia de investigación** | 10% | 10 | 3 | ✅ Dual |
| **Total ponderado** | 100% | **7.35** | **6.10** | ✅ **Dual** |

---

### 9.2 Recomendación

✅ **IMPLEMENTAR ESTRATEGIA DUAL** como solución inmediata con plan de migración futura.

**Justificación**:
1. **Riesgo mínimo**: Solo 6 componentes afectados vs 32
2. **Implementación rápida**: 2-3 días vs 1-2 semanas
3. **Rollback trivial**: < 15 minutos
4. **Desacoplado del sistema principal**: No requiere entender inserción de facturas
5. **Permite aprendizaje**: Implementar, observar, mejorar

**Con la condición de**:
1. ⚠️ Documentar claramente la dualidad
2. ⚠️ Crear funciones helper para evitar confusión
3. ⚠️ Planear migración futura a solución completa
4. ⚠️ Implementar validaciones en runtime
5. ⚠️ Monitoreo exhaustivo post-implementación

---

### 9.3 Cuando NO usar Estrategia Dual

**NO usar estrategia dual SI**:
1. ❌ El sistema está en fase de diseño inicial (sin código legacy)
2. ❌ Tienes 2+ semanas para investigación completa
3. ❌ La limpieza arquitectónica es prioridad máxima
4. ❌ Hay < 10 facturas en producción (fácil de migrar)
5. ❌ El equipo tiene experiencia completa con el sistema

En estos casos, **usar solución completa**.

---

## 10. Checklist de Implementación

### Pre-Implementación
- [ ] Agregar `valorreal` a Firebase (todas las sucursales)
- [ ] Verificar mapeo: valorreal = cod_sucursal
- [ ] Backup completo (Firebase + PostgreSQL)
- [ ] Crear branch de desarrollo
- [ ] Documentar estado actual
- [ ] Definir criterios de rollback

### Cambios en Código
- [ ] Actualizar login2.component.ts (loadSucursales)
- [ ] Actualizar login2.component.ts (almacenar ambos valores)
- [ ] Actualizar stockpedido.component.ts
- [ ] Actualizar stockrecibo.component.ts
- [ ] Actualizar stockproductopedido.component.ts
- [ ] Actualizar stockproductoenvio.component.ts
- [ ] Actualizar enviostockpendientes.component.ts
- [ ] Actualizar enviodestockrealizados.component.ts
- [ ] Actualizar Descarga.php (3 funciones con mapeo)
- [ ] Agregar comentarios explicativos
- [ ] Crear funciones helper (opcional)

### Testing
- [ ] Test: Login almacena ambos valores
- [ ] Test: Componentes NO modificados funcionan normal
- [ ] Test: Crear pedido de stock (BD correcta)
- [ ] Test: Confirmar recepción (stock actualizado correctamente)
- [ ] Test: Cancelar envío (si aplica)
- [ ] Test: Sesión activa durante deploy (fallback funciona)
- [ ] Test: Rollback funciona
- [ ] Test de regresión: Ventas, caja, reportes

### Deploy
- [ ] Comunicar a usuarios (30 min antes)
- [ ] Actualizar Firebase (valorreal)
- [ ] Deploy Backend (Descarga.php)
- [ ] Deploy Frontend (build de Angular)
- [ ] Smoke tests en producción
- [ ] Verificar logs (sin errores)

### Post-Implementación
- [ ] Monitorear primeras 24 horas
- [ ] Verificar datos en pedidoscb (valores correctos)
- [ ] Verificar stock se actualiza correctamente
- [ ] Recolectar feedback de usuarios
- [ ] Documentar lecciones aprendidas
- [ ] Planear mejoras futuras

---

## 11. Conclusión

La **estrategia dual** (sucursal + sucursal_movstock) es una solución **pragmática y de bajo riesgo** para resolver el problema de inconsistencia en movimientos de stock sin poner en peligro el funcionamiento del sistema principal.

**Ventajas principales**:
- ✅ Riesgo muy bajo (solo 6 componentes)
- ✅ Implementación rápida (2-3 días)
- ✅ Rollback trivial (< 15 minutos)
- ✅ No requiere investigación adicional
- ✅ Permite aprendizaje iterativo

**Desventajas a gestionar**:
- ⚠️ Deuda técnica (dos sistemas)
- ⚠️ Potencial confusión (documentación crítica)
- ⚠️ Datos históricos inconsistentes (requiere versionado)

**Recomendación final**: Implementar estrategia dual AHORA, planear migración a solución completa en 6-12 meses cuando se entienda completamente el sistema y se tenga tiempo para testing exhaustivo.

**Siguiente paso**: Ejecutar Fase 0 (Preparación) y obtener aprobación del equipo para proceder.

---

**Fin del Documento**

*Generado por: Claude Code (Análisis Técnico)*
*Fecha: 2025-11-02*
*Versión: 1.0 - Análisis Pormenorizado Completo*
