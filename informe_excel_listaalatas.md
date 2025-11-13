# Informe: Exportación Incompleta a Excel en Lista de Altas

**Fecha:** 2025-11-13
**Componente:** `lista-altas.component.ts`
**Ubicación:** `src/app/components/lista-altas/`
**Reportado por:** Usuario del sistema
**Versión:** V3.0 (Con Lazy Loading y Costos)

---

## 1. Resumen Ejecutivo

Se ha identificado un problema en la funcionalidad de exportación a Excel del módulo **Lista de Altas de Existencias**. Específicamente, **los campos de precios/costos no se están exportando** al archivo Excel, a pesar de que estos campos sí se visualizan correctamente en la tabla de la interfaz de usuario.

---

## 2. Descripción del Problema

### 2.1. Síntomas

- Al hacer clic en el botón "Excel" en `lista-altas`, el archivo generado **no incluye los campos de precios/costos**
- Los usuarios esperan ver **todos los campos visibles** en la tabla exportados al Excel
- Faltan campos críticos para análisis financiero y auditoría

### 2.2. Impacto

**Severidad:** Media-Alta
**Categoría:** Funcionalidad incompleta
**Usuarios afectados:** Todos los usuarios que utilizan la exportación a Excel para análisis de costos

**Impactos específicos:**
- Imposibilidad de realizar análisis de costos offline
- Necesidad de consultar la aplicación web para obtener datos de precios
- Dificultad para generar reportes financieros completos
- Pérdida de tiempo al tener que consultar registros individuales

---

## 3. Análisis Técnico

### 3.1. Campos Definidos en la Interfaz

Según la interfaz `AltaExistencia` (líneas 10-35), los campos disponibles son:

```typescript
interface AltaExistencia {
  // Campos básicos
  id_num: number;
  id_items: number;
  id_art: number;
  descripcion: string;
  cantidad: number;
  fecha: string;
  fecha_resuelto: string;
  usuario_res: string;
  observacion: string;
  estado: string;
  sucursald: number;
  sucursalh: number;
  usuario: string;
  tipo: string;

  // Campos de cancelación
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  usuario_cancelacion?: string;

  // ⚠️ Campos de costos (V2.0) - ESTOS SON LOS FALTANTES
  costo_total_1?: number;
  costo_total_2?: number;
  vcambio?: number;
  tipo_calculo?: string; // 'dinamico' o 'fijo'

  // Control de selección
  seleccionado?: boolean;
}
```

### 3.2. Campos Visibles en la Tabla HTML

En el template `lista-altas.component.html`, las columnas configuradas como visibles son:

| Columna | Campo | Líneas HTML | Estado |
|---------|-------|-------------|--------|
| Checkbox | seleccionado | 317-325 | ✅ No aplica |
| ID | id_num | 146-161, 328-330 | ✅ Exportado |
| Estado | estado | 164-180, 333-339 | ✅ Exportado |
| Fecha | fecha_resuelto/fecha | 183-198, 342-344 | ⚠️ Exporta solo "fecha" |
| Producto | descripcion, id_art | 201-217, 347-352 | ⚠️ Exporta solo "descripcion" |
| Cantidad | cantidad | 220-235, 355-357 | ✅ Exportado |
| **Costo Total 1** | **costo_total_1** | 238-245, 360-367 | ❌ **NO EXPORTADO** |
| **Costo Total 2** | **costo_total_2** | 248-255, 370-377 | ❌ **NO EXPORTADO** |
| **Tipo Cálculo** | **tipo_calculo** | 258-265, 380-391 | ❌ **NO EXPORTADO** |
| Sucursal | sucursald | 268-283, 394-396 | ✅ Exportado |
| Usuario | usuario_res | 286-302, 399-401 | ✅ Exportado |
| Acciones | - | 305-424 | ✅ No aplica |

### 3.3. Implementación Actual de exportarExcel()

**Ubicación:** `lista-altas.component.ts`, líneas 820-853

```typescript
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.altasFiltradas.map(alta => ({
      'ID': alta.id_num,
      'Estado': alta.estado,
      'Fecha': alta.fecha,                    // ⚠️ Usa 'fecha' en vez de 'fecha_resuelto'
      'Producto': alta.descripcion,
      'Cantidad': alta.cantidad,
      'Sucursal': this.getNombreSucursal(alta.sucursald),
      'Usuario': alta.usuario_res || alta.usuario,
      'Observación': alta.observacion,
      'Motivo Cancelación': alta.motivo_cancelacion || '',
      'Fecha Cancelación': alta.fecha_cancelacion || '',
      'Usuario Cancelación': alta.usuario_cancelacion || ''
      // ❌ FALTAN: costo_total_1, costo_total_2, vcambio, tipo_calculo
      // ❌ FALTAN: id_art, id_items, fecha_resuelto, sucursalh, tipo
    }));

    // ... resto del código de exportación
  });
}
```

### 3.4. Campos Faltantes Críticos

#### Campos de Costos (Prioridad Alta)
1. **costo_total_1**: Costo total en moneda 1 (pesos argentinos)
2. **costo_total_2**: Costo total en moneda 2 (posiblemente dólares)
3. **vcambio**: Valor de cambio utilizado
4. **tipo_calculo**: Indica si el costo es 'dinámico' o 'fijo'

#### Campos Adicionales (Prioridad Media)
5. **id_art**: ID del artículo (se muestra en la tabla como "ID Art")
6. **fecha_resuelto**: Fecha en que se resolvió el alta (se usa en la tabla)

#### Campos Opcionales (Prioridad Baja)
7. **id_items**: ID interno de items
8. **sucursalh**: Sucursal origen/destino (si aplica)
9. **tipo**: Tipo de alta

---

## 4. Causa Raíz

La causa raíz del problema es que el método `exportarExcel()` fue implementado **antes de la versión V2.0** que introdujo los campos de costos, y **no fue actualizado** para incluir estos nuevos campos.

**Evidencia:**
- La interfaz `AltaExistencia` tiene comentarios que indican "V2.0 - Con costos" (línea 9, 28)
- El componente tiene comentarios "V3.0 - Con Lazy Loading" (línea 55)
- El método `exportarExcel()` no refleja estos cambios de versión

---

## 5. Plan de Implementación

### 5.1. Objetivos

1. **Incluir todos los campos de costos** en la exportación a Excel
2. **Mantener consistencia** entre lo que se muestra en la tabla y lo que se exporta
3. **Mejorar la usabilidad** del archivo Excel exportado
4. **Mantener compatibilidad** con exportaciones existentes

### 5.2. Solución Propuesta

#### Opción 1: Exportación Completa (Recomendada)

Modificar el método `exportarExcel()` para incluir **todos los campos visibles** en la tabla, en el mismo orden.

**Ventajas:**
- Consistencia total con la interfaz visual
- Información completa para análisis
- Menor confusión para usuarios

**Desventajas:**
- Archivo Excel más grande
- Más columnas pueden dificultar la lectura

#### Opción 2: Exportación Configurable

Permitir al usuario seleccionar qué columnas desea exportar mediante un diálogo de configuración.

**Ventajas:**
- Mayor flexibilidad
- Archivos más pequeños si se necesitan menos datos
- Usuarios pueden personalizar según necesidades

**Desventajas:**
- Mayor complejidad de implementación
- Requiere más tiempo de desarrollo
- Necesita UI adicional

### 5.3. Implementación Recomendada (Opción 1)

#### Paso 1: Actualizar el método exportarExcel()

**Archivo:** `src/app/components/lista-altas/lista-altas.component.ts`
**Líneas:** 820-853

**Cambios requeridos:**

```typescript
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.altasFiltradas.map(alta => ({
      // Campos básicos (orden según tabla)
      'ID': alta.id_num,
      'Estado': alta.estado,
      'Fecha': alta.fecha_resuelto || alta.fecha,          // ✅ Priorizar fecha_resuelto
      'ID Artículo': alta.id_art,                          // ✅ NUEVO
      'Producto': alta.descripcion,
      'Cantidad': alta.cantidad,

      // ✅ NUEVOS: Campos de costos
      'Costo Total 1': this.formatearCosto(alta.costo_total_1),
      'Costo Total 2': this.formatearCosto(alta.costo_total_2),
      'Valor Cambio': this.formatearCosto(alta.vcambio),
      'Tipo Cálculo': this.formatearTipoCalculo(alta.tipo_calculo),

      // Campos de ubicación y usuario
      'Sucursal': this.getNombreSucursal(alta.sucursald),
      'Usuario': this.getUsuario(alta),                    // ✅ Usar método existente
      'Observación': alta.observacion || '',

      // Campos de cancelación (si aplica)
      'Motivo Cancelación': alta.motivo_cancelacion || '',
      'Fecha Cancelación': alta.fecha_cancelacion || '',
      'Usuario Cancelación': alta.usuario_cancelacion || ''
    }));

    // ... resto del código sin cambios
  });
}
```

#### Paso 2: Agregar métodos auxiliares de formateo

**Ubicación:** Después del método `exportarExcel()`, línea ~854

```typescript
/**
 * Formatea un valor de costo para exportación a Excel
 * Maneja valores nulos/undefined y formatea números correctamente
 */
private formatearCosto(valor: number | undefined | null): string | number {
  if (valor === null || valor === undefined) {
    return 'N/A';
  }
  // Retornar el número directamente para que Excel lo reconozca como número
  return valor;
}

/**
 * Formatea el tipo de cálculo para exportación
 */
private formatearTipoCalculo(tipo: string | undefined): string {
  if (!tipo) return 'N/A';
  return tipo === 'dinamico' ? 'Dinámico' : 'Fijo';
}
```

### 5.4. Orden de Columnas Propuesto

El orden de columnas en el Excel debe reflejar el orden visual de la tabla:

1. ID
2. Estado
3. Fecha
4. ID Artículo *(nuevo)*
5. Producto
6. Cantidad
7. **Costo Total 1** *(nuevo)*
8. **Costo Total 2** *(nuevo)*
9. **Valor Cambio** *(nuevo)*
10. **Tipo Cálculo** *(nuevo)*
11. Sucursal
12. Usuario
13. Observación
14. Motivo Cancelación
15. Fecha Cancelación
16. Usuario Cancelación

### 5.5. Consideraciones Adicionales

#### Formato de Números en Excel

Los valores numéricos deben exportarse como números nativos (no como strings) para permitir:
- Operaciones matemáticas directas en Excel
- Uso de funciones SUM, AVERAGE, etc.
- Formato automático de moneda en Excel

#### Manejo de Valores Nulos

Los valores `null` o `undefined` deben mostrarse como:
- **"N/A"** para campos de texto/descripción
- **0 o vacío** para campos numéricos (según preferencia de negocio)
- **String vacío** para fechas no disponibles

#### Compatibilidad con Filtros

Asegurarse de que `altasFiltradas` contiene los datos correctos:
- Si hay filtros aplicados, exportar solo los datos filtrados ✅
- Si no hay filtros, exportar todos los datos ✅
- Mantener comportamiento actual ✅

---

## 6. Testing

### 6.1. Casos de Prueba

| ID | Descripción | Resultado Esperado |
|----|-------------|-------------------|
| TC-001 | Exportar con todas las altas activas | Excel contiene todos los campos de costos con valores correctos |
| TC-002 | Exportar con altas canceladas | Excel muestra correctamente costos de altas canceladas |
| TC-003 | Exportar con filtros aplicados | Excel contiene solo registros filtrados con todos los campos |
| TC-004 | Exportar con costos nulos | Excel muestra "N/A" o valor por defecto en campos sin datos |
| TC-005 | Exportar con cálculo dinámico | Tipo Cálculo muestra "Dinámico" correctamente |
| TC-006 | Exportar con cálculo fijo | Tipo Cálculo muestra "Fijo" correctamente |
| TC-007 | Abrir Excel y verificar formato numérico | Los costos se reconocen como números en Excel |
| TC-008 | Sumar costos en Excel | Las funciones SUM funcionan correctamente en columnas de costos |

### 6.2. Validaciones

- ✅ Verificar que todos los campos visibles en tabla están en Excel
- ✅ Verificar formato de números (usar coma decimal para AR)
- ✅ Verificar que el nombre del archivo incluye timestamp
- ✅ Verificar que no hay errores de consola durante exportación
- ✅ Verificar compatibilidad con Excel 2016+
- ✅ Verificar tamaño de archivo con datos grandes (>1000 registros)

---

## 7. Impacto y Riesgos

### 7.1. Impacto de la Implementación

**Positivo:**
- ✅ Usuarios podrán realizar análisis de costos completos
- ✅ Mejora la usabilidad y satisfacción del usuario
- ✅ Reduce consultas de soporte sobre "datos faltantes"
- ✅ Facilita auditorías y reportes financieros

**Consideraciones:**
- ⚠️ Archivos Excel serán ligeramente más grandes
- ⚠️ Más columnas pueden requerir ajuste de ancho en Excel
- ⚠️ Usuarios existentes notarán cambio en estructura del Excel

### 7.2. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Formato de números incorrecto | Baja | Medio | Testing exhaustivo con diferentes locales |
| Valores null causan errores | Baja | Bajo | Validación con métodos auxiliares |
| Rendimiento con muchos registros | Media | Bajo | Usar método actual (lazy loading ya implementado) |
| Usuarios confundidos por cambio | Baja | Bajo | Documentar en release notes |

---

## 8. Cronograma Estimado

| Fase | Duración | Descripción |
|------|----------|-------------|
| Desarrollo | 30-45 min | Modificar método exportarExcel() y agregar métodos auxiliares |
| Testing | 15-20 min | Ejecutar casos de prueba TC-001 a TC-008 |
| Revisión de código | 10 min | Code review de cambios |
| Documentación | 5 min | Actualizar comentarios en código |
| **TOTAL** | **60-80 min** | **~1 hora de trabajo** |

---

## 9. Recomendaciones

1. **Implementar Opción 1** (exportación completa) como solución inmediata
2. **Agregar comentario en código** indicando versión de actualización
3. **Considerar para futuro**: sistema de columnas configurables (Opción 2)
4. **Revisar otros componentes** con exportación a Excel para aplicar mismo patrón
5. **Crear prueba automatizada** para verificar consistencia entre tabla y Excel

---

## 10. Referencias

### Archivos Involucrados

- `src/app/components/lista-altas/lista-altas.component.ts`
- `src/app/components/lista-altas/lista-altas.component.html`

### Métodos Relacionados

- `exportarExcel()` - línea 820
- `getNombreSucursal()` - línea 422
- `getUsuario()` - línea 431

### Dependencias

- **xlsx**: Biblioteca para generación de archivos Excel
- **file-saver**: Biblioteca para descarga de archivos

---

## 11. Conclusión

El problema de exportación incompleta en el módulo Lista de Altas es de **resolución directa y baja complejidad**. La implementación propuesta mantiene compatibilidad con el código existente, mejora significativamente la funcionalidad para los usuarios, y requiere aproximadamente **1 hora de desarrollo y testing**.

Se recomienda proceder con la implementación de la **Opción 1 (Exportación Completa)** como solución inmediata, considerando la **Opción 2 (Exportación Configurable)** como mejora futura en un sprint posterior.

---

**Documento preparado por:** Claude Code
**Versión del informe:** 1.0
**Estado:** Pendiente de aprobación e implementación
