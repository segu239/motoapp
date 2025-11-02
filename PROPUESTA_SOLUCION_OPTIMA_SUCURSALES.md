# PROPUESTA DE SOLUCIÓN ÓPTIMA: Problema de Sucursales en MotoApp

**Fecha**: 2025-11-02
**Versión**: 1.0 - Análisis Consolidado
**Autor**: Claude Code - Análisis Técnico Completo
**Criticidad**: 🟡 MEDIA - Solución necesaria para mejorar consistencia del sistema

---

## Resumen Ejecutivo

Después de un análisis exhaustivo de:
- 5 documentos de investigación
- Base de datos PostgreSQL (consultas directas)
- Código fuente backend y frontend
- Datos de Firebase (según documentación)

**Conclusión**: Existe un desalineamiento REAL e HISTÓRICO entre los valores de Firebase (`value`) y los códigos de sucursal en PostgreSQL (`cod_sucursal`). Este desalineamiento fue parcialmente corregido el 31 de octubre de 2025 mediante un mapeo hardcodeado en el backend, pero persiste la inconsistencia estructural.

**Recomendación**: Implementar **ESTRATEGIA DUAL** como solución inmediata de bajo riesgo, con plan de migración futura a solución completa.

---

## 1. DIAGNÓSTICO CONFIRMADO

### 1.1 Mapeo Actual Verificado

#### PostgreSQL (cod_sucursal):
```
cod_sucursal | sucursal
-------------|-------------
1            | DEPOSITO
2            | CASA CENTRAL
3            | VALLE VIEJO
4            | GUEMES
5            | MAYORISTA
```
✅ **VERIFICADO** por consulta directa a la base de datos.

#### Firebase (value según documentación):
```
value | nombre
------|---------------
1     | Casa Central
2     | Valle Viejo (Suc. Valle Viejo)
3     | Guemes (Suc. Guemes)
4     | Deposito
5     | Mayorista
```
✅ **CONFIRMADO** por múltiples documentos y commit 5486c51.

#### Mapeo Hardcodeado en Backend (Descarga.php líneas 1729-1735):
```php
$mapeo_sucursal_exi = [
    1 => 'exi2', // Casa Central
    2 => 'exi3', // Valle Viejo
    3 => 'exi4', // Güemes
    4 => 'exi1', // Deposito
    5 => 'exi5'  // Mayorista
];
```
✅ **VERIFICADO** por lectura directa del código fuente.

### 1.2 Estado de las Tablas Dinámicas

**Tablas verificadas en PostgreSQL**:
- ✅ `factcab1` existe → 94 registros con cod_sucursal=1 (DEPOSITO)
- ✅ `factcab2` existe → 1 registro con cod_sucursal=2 (CASA CENTRAL)
- ✅ `factcab3` existe → 0 registros
- ✅ `factcab4` existe → 0 registros
- ✅ `factcab5` existe → 63 registros con cod_sucursal=5 (MAYORISTA)
- ✅ `psucursal1-5` existen
- ✅ `recibos1-5` existen

**HALLAZGO CRÍTICO CONFIRMADO**: Las tablas `factcabN` están alineadas con `cod_sucursal` de PostgreSQL, NO con Firebase `value`.

### 1.3 Datos en pedidoscb

**Consulta realizada**:
```sql
SELECT sucursald, sucursalh, fecha, estado
FROM pedidoscb
ORDER BY fecha DESC
LIMIT 10;
```

**Resultado**:
- sucursald=1, sucursalh=2 (múltiples registros recientes Nov 2025)
- sucursald=1, sucursalh=3 (múltiples registros recientes Nov 2025)
- sucursald=3, sucursalh=1 (registros recientes Nov 2025)

**Interpretación**:
- Los valores 1, 2, 3 en `pedidoscb` corresponden a **Firebase values** actuales
- sucursald=1 significa "Casa Central" (Firebase value 1)
- sucursald=3 significa "Guemes" (Firebase value 3)

**Problema**: El usuario ve "De Sucursal: 1" pero no es intuitivo sin conocer el mapeo Firebase.

---

## 2. PROBLEMA IDENTIFICADO

### 2.1 El Desalineamiento

| Entidad | Sucursal | Valor Firebase | Valor PostgreSQL | Campo Stock |
|---------|----------|----------------|------------------|-------------|
| DEPOSITO | Depósito | value=4 | cod_sucursal=1 | exi1 |
| CASA CENTRAL | Casa Central | value=1 | cod_sucursal=2 | exi2 |
| VALLE VIEJO | Suc. Valle Viejo | value=2 | cod_sucursal=3 | exi3 |
| GUEMES | Suc. Güemes | value=3 | cod_sucursal=4 | exi4 |
| MAYORISTA | Mayorista | value=5 | cod_sucursal=5 | exi5 |

**Único valor alineado**: MAYORISTA (value=5, cod_sucursal=5)

### 2.2 Impacto en el Sistema

#### Movimientos de Stock ✅ FUNCIONAL (con mapeo)
- Frontend envía Firebase value (1-5)
- Backend traduce con mapeo hardcodeado
- Se actualiza campo exi correcto
- **Estado**: Funciona correctamente desde 31 Oct 2025

#### Visualización en Tablas 🟡 CONFUSO
- Usuario ve números (1, 2, 3, 4, 5)
- No es intuitivo qué sucursal representa cada número
- Requiere conocer el mapeo Firebase
- **Estado**: Confuso pero funcional

#### Facturas/Ventas ⚠️ REQUIERE INVESTIGACIÓN
- Tablas factcab alineadas con cod_sucursal
- sessionStorage tiene Firebase value
- **Pregunta sin responder**: ¿Cómo se determina qué tabla usar?
- **Estado**: Requiere investigación adicional

---

## 3. OPCIONES DE SOLUCIÓN EVALUADAS

### OPCIÓN A: Solución Completa (Solo 'sucursal')

**Descripción**: Cambiar completamente a usar `valorreal` (=cod_sucursal) en lugar de `value`.

**Implementación**:
1. Agregar campo `valorreal` a Firebase (1:1 con cod_sucursal)
2. Modificar login para almacenar `valorreal` en sessionStorage
3. Actualizar 32 archivos (todos los componentes y servicios)
4. Simplificar mapeo hardcodeado en backend

**Ventajas**:
- ✅ Resuelve el problema de raíz
- ✅ Elimina necesidad de mapeo hardcodeado
- ✅ Sistema consistente a largo plazo
- ✅ Un solo "idioma" para sucursales

**Desventajas**:
- ❌ 32 archivos afectados (alto riesgo de regresión)
- ❌ 1-2 semanas de desarrollo + testing exhaustivo
- ❌ Requiere entender inserción de facturas (investigación pendiente)
- ❌ Rollback complejo (2-4 horas)
- ❌ Alto riesgo durante deploy

**Tiempo estimado**: 2 semanas
**Riesgo**: 🟡 MEDIO
**Complejidad**: 🔴 ALTA

---

### OPCIÓN B: Estrategia Dual (sucursal + sucursal_movstock) ⭐ RECOMENDADA

**Descripción**: Mantener `sucursal` actual (value) para ventas/caja/reportes, y crear nuevo campo `sucursal_movstock` (valorreal=cod_sucursal) SOLO para movimientos de stock.

**Implementación**:
1. Agregar campo `valorreal` a Firebase
2. Modificar login para almacenar AMBOS valores:
   - `sessionStorage.sucursal` = Firebase value (legacy)
   - `sessionStorage.sucursal_movstock` = valorreal (nuevo)
3. Actualizar SOLO 6 componentes de movstock
4. Simplificar mapeo en backend (3 funciones)

**Archivos afectados**:
- **Frontend**: 1 componente (login) + 6 componentes de movstock = 7 archivos
- **Backend**: 1 archivo (Descarga.php, 3 funciones)
- **Total**: 8 archivos vs 32 de la opción A

**Ventajas**:
- ✅ Riesgo MUY BAJO (solo 6 componentes de movstock cambian)
- ✅ 26 componentes sin tocar (ventas, caja, reportes funcionan igual)
- ✅ Implementación rápida (2-3 días)
- ✅ Rollback trivial (< 15 minutos)
- ✅ No requiere investigar inserción de facturas
- ✅ Deploy gradual posible
- ✅ Testing aislado (menor superficie de bugs)

**Desventajas**:
- ⚠️ Deuda técnica (dos valores para mismo concepto)
- ⚠️ Confusión potencial para desarrolladores nuevos
- ⚠️ Requiere documentación clara
- ⚠️ Datos históricos tendrán dos formatos

**Tiempo estimado**: 2-3 días
**Riesgo**: 🟢 BAJO
**Complejidad**: 🟢 BAJA

---

### OPCIÓN C: No Hacer Nada (Mantener mapeo hardcodeado)

**Descripción**: Mantener el sistema actual con mapeo hardcodeado.

**Ventajas**:
- ✅ Cero riesgo
- ✅ Cero esfuerzo

**Desventajas**:
- ❌ Problema de visualización persiste
- ❌ Mapeo hardcodeado difícil de mantener
- ❌ Confusión para usuarios
- ❌ Deuda técnica aumenta

**Veredicto**: ❌ NO RECOMENDADO

---

### OPCIÓN D: Solo Mejora Visual (Pipe en Frontend)

**Descripción**: Crear un pipe Angular para mostrar nombres en lugar de números, sin cambiar lógica de backend.

**Implementación**:
```typescript
@Pipe({name: 'sucursalNombre'})
export class SucursalNombrePipe {
  mapeo = {1: 'Casa Central', 2: 'Valle Viejo', ...};
  transform(value: number): string {
    return this.mapeo[value] || `Sucursal ${value}`;
  }
}
```

**Ventajas**:
- ✅ Riesgo cero
- ✅ Implementación rápida (1 día)
- ✅ Mejora UX inmediatamente

**Desventajas**:
- ❌ No resuelve inconsistencia de fondo
- ❌ Mapeo hardcodeado persiste
- ❌ Aumenta complejidad del frontend

**Veredicto**: 🟡 VIABLE como solución temporal mientras se implementa B

---

## 4. PROPUESTA ÓPTIMA: ESTRATEGIA HÍBRIDA

### 4.1 Implementación en Fases

#### FASE 1 (Semana 1): Mejora Visual Inmediata [OPCIONAL]
- Implementar pipe de visualización (Opción D)
- Usuarios ven nombres en lugar de números
- Riesgo cero, mejora inmediata
- Tiempo: 1-2 días

#### FASE 2 (Semana 2-3): Estrategia Dual para MovStock [OBLIGATORIA]
- Implementar Opción B (sucursal + sucursal_movstock)
- Agregar `valorreal` a Firebase
- Actualizar login y 6 componentes de movstock
- Simplificar mapeo en backend
- Tiempo: 2-3 días

#### FASE 3 (Mes 2-3): Monitoreo y Validación
- Verificar funcionamiento correcto
- Recolectar feedback de usuarios
- Identificar posibles mejoras
- Documentar lecciones aprendidas

#### FASE 4 (Mes 6-12): Migración Completa [OPCIONAL]
- Evaluar si migrar a solución completa
- Solo si:
  - Se resolvió pregunta sobre inserción facturas
  - Sistema está estable
  - Hay recursos para testing completo

---

## 5. PLAN DETALLADO RECOMENDADO

### 5.1 Pre-Implementación (1 día)

#### Tarea 1: Agregar valorreal a Firebase
```json
{
  "sucursales": {
    "clave-casa-central": {
      "nombre": "Casa Central",
      "value": 1,
      "valorreal": 2  // ← NUEVO
    },
    "clave-valle-viejo": {
      "nombre": "Suc. Valle Viejo",
      "value": 2,
      "valorreal": 3  // ← NUEVO
    },
    "clave-guemes": {
      "nombre": "Suc. Guemes",
      "value": 3,
      "valorreal": 4  // ← NUEVO
    },
    "clave-deposito": {
      "nombre": "Deposito",
      "value": 4,
      "valorreal": 1  // ← NUEVO
    },
    "clave-mayorista": {
      "nombre": "Mayorista",
      "value": 5,
      "valorreal": 5  // ← NUEVO
    }
  }
}
```

#### Tarea 2: Backup Completo
- Firebase Realtime Database
- PostgreSQL (especialmente: pedidoscb, artsucursal, factcab1-5)
- Código fuente (crear branch `fix/sucursales-movstock`)

#### Tarea 3: Documentación
Crear `GUIA_SUCURSALES.md`:
```markdown
# Guía de Uso de Sucursales

## Para VENTAS, CAJA, REPORTES:
usar: `sessionStorage.getItem('sucursal')`

## Para MOVIMIENTOS DE STOCK:
usar: `sessionStorage.getItem('sucursal_movstock')`

## Mapeo de Referencia:
| Sucursal     | sucursal (legacy) | sucursal_movstock | cod_sucursal |
|--------------|-------------------|-------------------|--------------|
| DEPOSITO     | 4                 | 1                 | 1            |
| CASA CENTRAL | 1                 | 2                 | 2            |
| VALLE VIEJO  | 2                 | 3                 | 3            |
| GUEMES       | 3                 | 4                 | 4            |
| MAYORISTA    | 5                 | 5                 | 5            |
```

### 5.2 Implementación Frontend (4 horas)

#### Cambio 1: login2.component.ts (línea ~50 y ~126)

```typescript
// Actualizar loadSucursales() para cargar valorreal
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
          valorreal: payload.valorreal  // ← NUEVO
        };
      });
    }
  );
}

// Después de línea 126, agregar almacenamiento de sucursal_movstock
sessionStorage.setItem('sucursal', this.sucursal); // Legacy

// NUEVO: Buscar valorreal y almacenar
const sucursalObj = this.sucursales.find(
  s => s.value === parseInt(this.sucursal, 10)
);
if (sucursalObj && sucursalObj.valorreal !== undefined) {
  sessionStorage.setItem('sucursal_movstock', sucursalObj.valorreal.toString());
} else {
  sessionStorage.setItem('sucursal_movstock', this.sucursal); // Fallback
}
```

#### Cambio 2: Componentes de MovStock (6 archivos)

Archivos a modificar:
1. `stockpedido.component.ts` (línea 72)
2. `stockrecibo.component.ts` (línea 69)
3. `stockproductopedido.component.ts` (línea 39)
4. `stockproductoenvio.component.ts` (línea 35)
5. `enviostockpendientes.component.ts` (línea 73)
6. `enviodestockrealizados.component.ts` (línea 51)

**Cambio en cada archivo**:
```typescript
// ANTES
this.sucursal = Number(sessionStorage.getItem('sucursal'));

// DESPUÉS
this.sucursal = Number(
  sessionStorage.getItem('sucursal_movstock')
  || sessionStorage.getItem('sucursal') // Fallback para sesiones activas
);
```

### 5.3 Implementación Backend (2 horas)

#### Archivo: Descarga.php

**Funciones a modificar**:
1. Línea ~1729: `confirmarRecepcionEnvioStock_post()`
2. Línea ~1832: Función de cancelación
3. Línea ~1935: `crearPedidoStockNuevo_post()`

**Cambio en las 3 funciones**:
```php
// ============================================================================
// MAPEO SIMPLIFICADO (2025-11-02)
// Ahora recibimos valorreal (=cod_sucursal) desde sucursal_movstock
// ============================================================================
$mapeo_sucursal_exi = [
    1 => 'exi1', // Deposito      (cod_sucursal 1)
    2 => 'exi2', // Casa Central  (cod_sucursal 2)
    3 => 'exi3', // Valle Viejo   (cod_sucursal 3)
    4 => 'exi4', // Guemes        (cod_sucursal 4)
    5 => 'exi5'  // Mayorista     (cod_sucursal 5)
];
// NOTA: Este mapeo ahora es 1:1 y puede simplificarse en el futuro a:
// $campo_stock = 'exi' . $sucursal;
// ============================================================================
```

### 5.4 Testing (1 día)

#### Test 1: Login
- ✅ Seleccionar "Deposito" → sessionStorage.sucursal='4', sucursal_movstock='1'
- ✅ Seleccionar "Casa Central" → sucursal='1', sucursal_movstock='2'

#### Test 2: Componentes NO modificados (smoke test)
- ✅ Carrito funciona (usa sucursal='4' para DEPOSITO)
- ✅ Punto de venta funciona
- ✅ Reportes funcionan

#### Test 3: Crear Pedido de Stock
- ✅ Usuario DEPOSITO solicita a CASA CENTRAL
- ✅ Backend recibe sucursald=1, sucursalh=2
- ✅ Se inserta en pedidoscb correctamente

#### Test 4: Confirmar Recepción
- ✅ Backend actualiza exi1 (DEPOSITO recibe) ✅
- ✅ Backend actualiza exi2 (CASA CENTRAL envía) ✅
- ✅ Stock se actualiza correctamente

#### Test 5: Rollback
- ✅ Revertir cambios en 6 componentes
- ✅ Sistema funciona en < 15 minutos

### 5.5 Deploy a Producción (2 horas)

#### Paso 1: Comunicación (30 min antes)
Mensaje a usuarios:
> "Realizaremos actualización del sistema de stock en 30 minutos. NO inicien nuevos pedidos de stock durante este tiempo."

#### Paso 2: Actualizar Firebase (5 min)
- Agregar campo `valorreal` a cada sucursal
- Verificar valores correctos

#### Paso 3: Deploy Backend (10 min)
- Subir Descarga.php actualizado

#### Paso 4: Deploy Frontend (15 min)
- `ng build --prod`
- Deploy

#### Paso 5: Smoke Tests (30 min)
- Login con cada sucursal
- Crear 1 pedido de prueba
- Confirmar recepción

#### Paso 6: Monitoreo (24 horas)
- Revisar logs
- Verificar tickets de soporte

---

## 6. CRITERIOS DE ÉXITO

### 6.1 Inmediatos (Post-Deploy)
- ✅ Login funciona para todas las sucursales
- ✅ sessionStorage tiene ambos campos (sucursal y sucursal_movstock)
- ✅ Ventas funcionan normalmente
- ✅ Movimientos de stock funcionan correctamente

### 6.2 Corto Plazo (1 semana)
- ✅ Stock se actualiza en campos correctos (exi1-5)
- ✅ pedidoscb tiene valores correctos (cod_sucursal)
- ✅ No hay tickets de soporte relacionados
- ✅ Usuarios reportan mejora en claridad

### 6.3 Mediano Plazo (1 mes)
- ✅ Datos consistentes en base de datos
- ✅ No hay errores en logs
- ✅ Sistema estable

---

## 7. PLAN DE ROLLBACK

### Trigger de Rollback
Ejecutar SI:
- Errores en movimientos de stock
- Stock actualizado incorrectamente
- Usuarios no pueden hacer login

### Pasos (15 minutos)
1. Revertir 6 componentes de movstock (5 min)
2. Revertir backend (5 min)
3. Deploy y verificar (5 min)

**Nota**: Campo `valorreal` puede permanecer en Firebase sin afectar.

---

## 8. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Sesiones activas sin sucursal_movstock | Alta | Bajo | Fallback a 'sucursal' en componentes |
| Confusión de desarrolladores | Media | Medio | Documentación clara + funciones helper |
| Datos históricos inconsistentes | Alta | Bajo | Agregar campo version en pedidoscb |
| Permisos de usuarios | Baja | Alto | Verificar sucursalesPermitidas antes |

---

## 9. COSTOS Y BENEFICIOS

### Costos
- **Desarrollo**: 2-3 días (16-24 horas)
- **Testing**: 1 día (8 horas)
- **Deploy**: 2 horas
- **Total**: 3-4 días

### Beneficios
- ✅ Sistema más consistente
- ✅ Visualización más clara
- ✅ Mapeo simplificado
- ✅ Base para mejoras futuras
- ✅ Menos confusión operativa

**ROI**: Alto - Beneficio significativo con riesgo muy bajo

---

## 10. DECISIÓN RECOMENDADA

### ✅ APROBAR IMPLEMENTACIÓN DE ESTRATEGIA DUAL

**Justificación Final**:
1. **Riesgo mínimo** (solo 6 componentes vs 32)
2. **Implementación rápida** (3 días vs 2 semanas)
3. **Rollback trivial** (15 min vs 2-4 horas)
4. **No requiere investigación adicional** (independiente de inserción facturas)
5. **Mejora tangible** (claridad para usuarios)
6. **Base sólida** (permite migración futura si se desea)

**Siguiente Paso**: Obtener aprobación del equipo y ejecutar Fase de Pre-Implementación.

---

## 11. CONTACTOS Y RESPONSABLES

**Documento elaborado por**: Claude Code
**Fecha**: 2025-11-02
**Revisión sugerida**: Equipo de desarrollo + Usuario clave de cada sucursal
**Aprobación requerida**: Tech Lead + Product Owner

---

## ANEXO A: Comparación de Opciones

| Criterio | Opción A (Completa) | Opción B (Dual) ⭐ | Opción C (Nada) | Opción D (Visual) |
|----------|---------------------|-------------------|----------------|-------------------|
| Archivos afectados | 32 | 8 | 0 | 2 |
| Tiempo desarrollo | 2 semanas | 3 días | 0 | 1 día |
| Riesgo | 🟡 Medio | 🟢 Bajo | 🟢 Cero | 🟢 Cero |
| Resuelve raíz | ✅ Sí | ⚠️ Parcial | ❌ No | ❌ No |
| Rollback | 🟡 Complejo | 🟢 Trivial | N/A | 🟢 Trivial |
| Deuda técnica | 🟢 Baja | 🟡 Media | 🔴 Alta | 🟡 Media |
| Recomendación | 2da opción | ⭐ 1ra opción | ❌ No | 🟡 Temporal |

---

## ANEXO B: Checklist de Implementación

### Pre-Implementación
- [ ] Agregar `valorreal` a Firebase
- [ ] Verificar mapeo correcto
- [ ] Backup completo
- [ ] Crear branch de desarrollo
- [ ] Documentación creada

### Cambios en Código
- [ ] login2.component.ts actualizado
- [ ] stockpedido.component.ts actualizado
- [ ] stockrecibo.component.ts actualizado
- [ ] stockproductopedido.component.ts actualizado
- [ ] stockproductoenvio.component.ts actualizado
- [ ] enviostockpendientes.component.ts actualizado
- [ ] enviodestockrealizados.component.ts actualizado
- [ ] Descarga.php actualizado (3 funciones)

### Testing
- [ ] Test de login
- [ ] Test de componentes no afectados
- [ ] Test de pedido de stock
- [ ] Test de recepción
- [ ] Test de rollback

### Deploy
- [ ] Comunicar a usuarios
- [ ] Firebase actualizado
- [ ] Backend desplegado
- [ ] Frontend desplegado
- [ ] Smoke tests ejecutados

### Post-Deploy
- [ ] Monitoreo 24h completado
- [ ] Datos verificados en BD
- [ ] Feedback recolectado

---

**FIN DEL DOCUMENTO**

*Esta propuesta consolida el análisis de 5 documentos, verificaciones en base de datos PostgreSQL, y análisis de código fuente para proporcionar una recomendación fundamentada y de bajo riesgo.*
