# INFORME DE ANÁLISIS: Granularidad de Cajamovi por Métodos de Pago

**Fecha:** 13 de Octubre de 2025
**Analista:** Claude AI
**Proyecto:** MotoApp
**Versión del Documento:** 1.0

---

## 📋 RESUMEN EJECUTIVO

### Hallazgo Principal
**El sistema actualmente NO granula los movimientos de caja por método de pago.** Cuando un comprobante se paga con múltiples métodos (ejemplo: $10,000 en efectivo + $5,000 en tarjeta), se registra UN SOLO movimiento en `caja_movi` con el total del comprobante ($15,000), sin desglosar por cada método de pago utilizado.

### Impacto
- **Reportes de caja**: No se pueden generar reportes precisos de ingresos por método de pago
- **Auditoría**: Imposible auditar cuánto se recaudó en efectivo vs tarjetas vs otros métodos
- **Conciliación bancaria**: Dificulta la conciliación de ingresos por tarjetas de crédito
- **Análisis financiero**: Limita el análisis de preferencias de pago de clientes

### Estado Actual
- ✅ Los PDFs de comprobantes SÍ muestran el desglose por tipo de pago (implementado según `plan_comprobante_tipopago.md`)
- ❌ La base de datos NO almacena este desglose de forma granular
- ❌ El componente cajamovi NO puede mostrar movimientos desagregados por método de pago

---

## 🔍 ANÁLISIS TÉCNICO DETALLADO

### 1. Arquitectura Actual

#### 1.1 Tablas Involucradas

**Tabla: `caja_movi`**
```sql
- id_movimiento (PK)
- sucursal
- codigo_mov (FK -> caja_conceptos.id_concepto)
- num_operacion (Número de operación/recibo)
- fecha_mov
- importe_mov (💡 ESTE ES EL TOTAL SIN DESGLOSE)
- descripcion_mov
- tipo_movi ('A'=Alta, etc.)
- caja (FK -> caja_lista.id_caja)
- tipo_comprobante ('PR', 'FC', 'NC', etc.)
- numero_comprobante
- cliente
- usuario
-- NO EXISTE: metodo_pago, id_tarjeta, etc.
```

**Tabla: `tarjcredito`**
```sql
- cod_tarj (PK)
- tarjeta (nombre: "EFECTIVO", "Tarjeta Visa", etc.)
- idcp_ingreso (concepto de ingreso para caja_movi)
- idcp_egreso (concepto de egreso para caja_movi)
- id_forma_pago
```

**Tabla: `factcab1-5`** (cabeceras de comprobantes)
```sql
- id_num (PK)
- tipo ('PR', 'FC', 'NC', etc.)
- numero_int, numero_fac
- cliente
- cod_condvta (FK -> tarjcredito.cod_tarj)
-- ⚠️ cod_condvta es la condición PRINCIPAL, no un desglose
```

**Tabla: `recibos1-5`** (detalles de recibos)
```sql
- recibo (número de recibo)
- c_tipo, c_numero (comprobante asociado)
- fecha
- importe (💡 TOTAL del recibo, sin desglose)
- recibo_asoc (id_num de factcab)
```

**Tabla: `psucursal1-5`** (productos de comprobantes)
```sql
- idart (artículo)
- cantidad, precio
- cod_tar (FK -> tarjcredito.cod_tarj)
- tipodoc, numerocomprobante, puntoventa
```

#### 1.2 Flujo Actual de Registro

```
VENTA CON MÚLTIPLES MÉTODOS DE PAGO
┌────────────────────────────────────────┐
│  Cliente compra por $15,000:           │
│  - $10,000 en Efectivo                 │
│  - $5,000 en Tarjeta Visa              │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│  Angular: carrito.component.ts         │
│  --------------------------------      │
│  itemsEnCarrito:                       │
│  - Producto A ($6,000) cod_tar=11      │
│  - Producto B ($4,000) cod_tar=11      │
│  - Producto C ($3,000) cod_tar=1       │
│  - Producto D ($2,000) cod_tar=1       │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│  Cálculo de subtotales (SOLO VISUAL):  │
│  - Efectivo: $10,000                   │
│  - Tarjeta Visa: $5,000                │
│  ↓ Mostrado en PDF ✅                  │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│  PHP: Descarga.php (Backend)           │
│  PedidossucxappCompleto_post()         │
│  --------------------------------      │
│  INSERT INTO factcab1                  │
│  (tipo, cliente, basico, iva1, total)  │
│                                        │
│  INSERT INTO psucursal1                │
│  (4 productos con sus cod_tar)         │
│                                        │
│  INSERT INTO caja_movi                 │
│  importe_mov = $15,000 ❌ SIN DESGLOSE│
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│  RESULTADO EN BASE DE DATOS:           │
│  --------------------------------      │
│  caja_movi:                            │
│  1 registro: $15,000 (TOTAL)           │
│                                        │
│  ❌ NO HAY REGISTROS DE:               │
│  - $10,000 Efectivo                    │
│  - $5,000 Tarjeta Visa                 │
└────────────────────────────────────────┘
```

### 2. Funciones PHP Analizadas

#### 2.1 Función de Inserción Principal

**Archivo:** `Descarga.php.txt`
**Función:** `PedidossucxappCompleto_post()`
**Líneas:** 990-1089

**Lógica actual:**
```php
// Línea 994-1054: Insertar caja_movi
if ($caja_movi) {
    $caja_movi['num_operacion'] = $id_num;
    $caja_movi['descripcion_mov'] = $this->generarDescripcionAutomatica($caja_movi);

    // ❌ PROBLEMA: Se inserta UN SOLO registro con el total
    $this->db->insert('caja_movi', $caja_movi);
}
```

**Análisis:**
- El frontend envía `$caja_movi` con el importe total
- Se inserta directamente sin procesar los métodos de pago
- NO se consulta `psucursal` para obtener el desglose por `cod_tar`
- NO se crean múltiples registros en `caja_movi`

#### 2.2 Funciones de Consulta

**Archivo:** `Carga.php.txt`
**Funciones:** `Cajamovi_get()`, `CajamoviPaginado_post()`
**Líneas:** 1301-1449

**Lógica actual:**
```php
// Línea 1304-1308: Consulta básica
$this->db->select('cm.*, TRIM(cc.descripcion) as descripcion_concepto,
                   TRIM(cl.descripcion) as descripcion_caja');
$this->db->from('caja_movi cm');
$this->db->join('caja_conceptos cc', 'cm.codigo_mov = cc.id_concepto', 'left');
$this->db->join('caja_lista cl', 'cm.caja = cl.id_caja', 'left');
```

**Análisis:**
- Solo trae un registro por movimiento
- NO hay JOIN con tablas de tipos de pago
- NO hay agrupación ni suma por método de pago

### 3. Componente Angular

#### 3.1 Cajamovi Component

**Archivo:** `src/app/components/cajamovi/cajamovi.component.ts`
**Líneas clave:** 26-27, 149-243

**Lógica actual:**
```typescript
// Línea 26-27: Arrays de datos
public cajamovis: Cajamovi[] = [];
public cajamovisFiltrados: Cajamovi[] = [];

// Línea 199-243: Procesamiento
processCajamovis(cajamovis: any[]) {
  this.cajamovis = cajamovis; // Recibe datos de la API sin procesar
  this.cajamovisFiltrados = this.cajamovis;
}
```

**Análisis:**
- Muestra los datos tal como vienen de la API
- NO hay procesamiento para agrupar por método de pago
- NO hay filtros por tipo de pago
- Cada fila es un movimiento completo (no desagregado)

#### 3.2 Vista HTML

**Archivo:** `src/app/components/cajamovi/cajamovi.component.html`
**Líneas:** 7-180

**Columnas mostradas:**
- Sucursal
- Concepto (descripcion_concepto)
- N° Operación
- Fecha
- **Importe** (importe_mov - TOTAL sin desglose)
- Caja
- Descripción
- Tipo Movimiento

**❌ NO hay columna para:** Método de Pago, Tarjeta, Forma de Pago

### 4. Evidencia de Datos Reales

**Consulta realizada:**
```sql
SELECT * FROM caja_movi WHERE tipo_comprobante IS NOT NULL LIMIT 5
```

**Resultados:**
```
id_movimiento | tipo_comprobante | numero_comprobante | importe_mov | descripcion_mov
------------- | ---------------- | ------------------ | ----------- | ---------------
270           | PR               | 144                | 4607.12     | PR 144 Rec. Nº 21
271           | PR               | 145                | 1077.09     | PR 145 Rec. Nº 145
272           | PR               | 146                | 32059.85    | PR 146 Rec. Nº 146
273           | FC               | 10                 | 4616.31     | FC 10 Rec. Nº 22
274           | PR               | 147                | 17124.45    | PR 147 Rec. Nº 23
```

**Análisis:**
- Cada registro es un movimiento total
- NO hay información de métodos de pago
- NO se puede determinar si el comprobante PR 146 ($32,059.85) fue pagado en efectivo, tarjeta, o una combinación

---

## 💡 CONCLUSIONES

### Problemas Identificados

1. **Falta de Granularidad en Base de Datos**
   - `caja_movi` no tiene campos para método de pago
   - No existe una tabla `caja_movi_detalle` o `caja_movi_pagos`
   - Imposible reconstruir el desglose de pagos desde la base de datos

2. **Discrepancia Frontend-Backend**
   - ✅ Frontend CALCULA subtotales por tipo de pago (carrito.component.ts:411)
   - ✅ PDFs MUESTRAN el desglose (implementado en plan_comprobante_tipopago.md)
   - ❌ Backend NO ALMACENA esta información en la base de datos
   - ❌ Cajamovi NO PUEDE MOSTRAR el desglose porque no está en la BD

3. **Limitaciones de Reporting**
   - No se puede generar reporte: "Ventas del día por método de pago"
   - No se puede saber: "¿Cuánto se cobró en efectivo hoy?"
   - No se puede auditar: "¿Coincide el efectivo con los depósitos bancarios?"

4. **Pérdida de Información**
   - Los subtotales calculados en el frontend se pierden después de generar el PDF
   - Solo quedan en el PDF impreso (no estructurados)
   - No hay forma de recuperar esta información programáticamente

### Oportunidades de Mejora

1. **Crear tabla de desglose de pagos**
   - Permitiría almacenar múltiples métodos de pago por comprobante
   - Facilitaría reportes y auditorías
   - Mejoraría la conciliación bancaria

2. **Modificar lógica de inserción en backend**
   - Procesar el array de productos y sus `cod_tar`
   - Generar múltiples registros en `caja_movi` o tabla nueva
   - Mantener la relación con el comprobante original

3. **Actualizar componente cajamovi**
   - Mostrar columna de método de pago
   - Permitir filtrar por tipo de pago
   - Generar reportes agrupados por método de pago

---

## 📊 COMPARATIVA: Estado Actual vs Estado Ideal

| Aspecto | Estado Actual ❌ | Estado Ideal ✅ |
|---------|-----------------|----------------|
| **Registros en caja_movi** | 1 registro por comprobante | N registros (1 por cada método de pago) |
| **Información almacenada** | Solo total | Total + desglose por método |
| **Visibilidad en cajamovi** | Solo total del movimiento | Desglose por método de pago |
| **Reportes disponibles** | Totales generales | Totales por método de pago |
| **Conciliación bancaria** | Manual, compleja | Automática, precisa |
| **Auditoría** | Difícil, requiere PDFs | Fácil, consultas SQL |
| **Integridad de datos** | Pérdida de información | Información completa |

---

## ⚠️ RIESGOS IDENTIFICADOS

### Riesgo 1: Imposibilidad de Auditoría Financiera
**Severidad:** ALTA
**Impacto:** Sin el desglose en la BD, es imposible auditar ingresos por método de pago sin revisar PDFs manualmente.

### Riesgo 2: Conciliación Bancaria Deficiente
**Severidad:** MEDIA-ALTA
**Impacto:** Dificulta la conciliación de ingresos por tarjetas con los extractos bancarios.

### Riesgo 3: Pérdida de Información Histórica
**Severidad:** MEDIA
**Impacto:** Si se implementa granularidad ahora, los datos históricos no tendrán desglose.

### Riesgo 4: Decisiones Empresariales Sin Datos Precisos
**Severidad:** MEDIA
**Impacto:** La gerencia no puede tomar decisiones basadas en preferencias de pago de clientes.

---

## 🎯 RECOMENDACIONES

### Recomendación 1: Implementar Granularidad de Pagos
**Prioridad:** ALTA
**Esfuerzo:** MEDIO (40-60 horas)

Crear un sistema de registro granular de métodos de pago en la base de datos.

### Recomendación 2: Migración de Datos Históricos (Opcional)
**Prioridad:** BAJA
**Esfuerzo:** ALTO (80-100 horas)

Intentar reconstruir desgloses de pagos desde PDFs o tablas de productos (limitado y poco confiable).

### Recomendación 3: Actualizar Componente Cajamovi
**Prioridad:** ALTA
**Esfuerzo:** BAJO (8-12 horas)

Una vez implementada la granularidad en BD, actualizar la vista para mostrar el desglose.

### Recomendación 4: Crear Reportes Financieros
**Prioridad:** MEDIA
**Esfuerzo:** MEDIO (20-30 horas)

Desarrollar reportes de ingresos por método de pago, sucursal, periodo, etc.

---

## 📚 REFERENCIAS

- **Archivos analizados:**
  - `/src/app/components/cajamovi/cajamovi.component.ts`
  - `/src/app/components/cajamovi/cajamovi.component.html`
  - `/src/Carga.php.txt` (líneas 1301-1449)
  - `/src/Descarga.php.txt` (líneas 990-1089)
  - `plan_comprobante_tipopago.md`
  - `pruebas_comprobantes_tipospago.md`

- **Tablas de base de datos:**
  - `caja_movi` (29 registros totales)
  - `caja_conceptos`
  - `caja_lista`
  - `tarjcredito`
  - `factcab1-5`
  - `recibos1-5`
  - `psucursal1-5`

---

## 📅 PRÓXIMOS PASOS

1. ✅ Analizar arquitectura actual (COMPLETADO - Este documento)
2. 🔄 Crear plan de implementación de granularidad (SIGUIENTE)
3. ⏳ Revisar y aprobar plan con stakeholders
4. ⏳ Implementar solución en fases
5. ⏳ Probar y validar funcionamiento
6. ⏳ Desplegar a producción

---

**FIN DEL INFORME DE ANÁLISIS**

*Documento generado el 13 de Octubre de 2025*
*Próxima revisión: Después de implementación del plan de granularidad*
