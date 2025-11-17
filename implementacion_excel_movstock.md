# Plan de Implementación: Exportación a Excel en Componentes de Movimientos de Stock

## Versión: 2.0
## Fecha Actualización: 2025-11-14
## Fecha Original: 2025-01-14
## Autor: Sistema de documentación automática

---

## ⚠️ DOCUMENTO ACTUALIZADO - v2.0

**IMPORTANTE:** Este documento ha sido actualizado para reflejar los cambios implementados en:
- **Totalizadores v2.2** (implementado en noviembre 2025)
- **Conversión de Moneda v2.0** (implementado en noviembre 2025)

Los campos de precios y costos ahora incluyen conversión de moneda automática.
Ver documentos relacionados:
- `PLAN_COMMITS_TOTALIZADORES.md`
- `RESUMEN_CAMBIOS_CONVERSION_MONEDA.md`
- `implementacion_totalizadores_movstock2.md`
- `implementacion_conversionmoneda_movstock.md`

---

---

## 1. RESUMEN EJECUTIVO

### 1.1. Objetivo
Implementar la funcionalidad de exportación a Excel en los cuatro componentes principales de movimientos de stock, utilizando como referencia la implementación existente en el componente `lista-altas`.

### 1.2. Componentes Afectados
1. **stockpedido** - Pedidos de stock pendientes de recepción
2. **stockrecibo** - Recibos de stock (enviados o recibidos)
3. **enviostockpendientes** - Envíos de stock pendientes
4. **enviodestockrealizados** - Envíos de stock realizados

### 1.3. Alcance
- Agregar botón de exportación a Excel en la interfaz de usuario
- Implementar método `exportarExcel()` en cada componente TypeScript
- Exportar todos los datos visibles incluyendo campos de totalizadores
- Aplicar formato adecuado a campos monetarios y fechas

---

## 2. ANÁLISIS DE COMPONENTE DE REFERENCIA

### 2.1. Componente lista-altas (Referencia)

#### 2.1.1. Ubicación
- **TypeScript**: `src/app/components/lista-altas/lista-altas.component.ts`
- **HTML**: `src/app/components/lista-altas/lista-altas.component.html`

#### 2.1.2. Importaciones Requeridas
```typescript
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
```

#### 2.1.3. Método exportarExcel() (líneas 824-869)
```typescript
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.altasFiltradas.map(alta => ({
      // Mapeo de campos...
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((module: any) => {
      const saveAs = module.default || module.saveAs || module;
      if (typeof saveAs === 'function') {
        saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
      } else if (typeof saveAs.saveAs === 'function') {
        saveAs.saveAs(data, 'altas_existencias_' + new Date().getTime() + '.xlsx');
      }
    });
  });
}
```

#### 2.1.4. Botón en HTML (líneas 40-47)
```html
<button
    type="button"
    class="btn btn-success me-2"
    (click)="exportarExcel()"
    [disabled]="loading || altas.length === 0"
    title="Exportar a Excel">
    <i class="fa fa-file-excel mr-1"></i>
    Excel
</button>
```

#### 2.1.5. Características Clave
- **Importación dinámica** de módulos xlsx y file-saver
- **Mapeo de datos** con transformación de valores
- **Formato de campos monetarios**: Retorna números directamente para que Excel los reconozca
- **Nombre de archivo**: Incluye timestamp para evitar sobrescrituras
- **Validación**: Botón deshabilitado cuando no hay datos o está cargando

---

## 3. ANÁLISIS DE COMPONENTES OBJETIVO

### 3.1. Estado Actual de Importaciones

| Componente | file-saver | xlsx | Método exportarExcel() | Botón HTML |
|------------|------------|------|------------------------|------------|
| stockpedido | ✅ (línea 8) | ✅ (línea 9) | ❌ | ❌ |
| stockrecibo | ✅ (línea 8) | ✅ (línea 9) | ❌ | ❌ |
| enviostockpendientes | ✅ (línea 8) | ✅ (línea 9) | ❌ | ❌ |
| enviodestockrealizados | ❌ | ❌ | ❌ | ❌ |

### 3.2. Estructura de Datos Común (ACTUALIZADO v2.0)

Todos los componentes comparten:
- **Array de datos**: `pedidoItem: PedidoItem[]` (tipado con interfaz)
- **Columnas**: `cols: Column[]` con campos estándar

- **Campos de Precios y Costos (CON CONVERSIÓN DE MONEDA v2.0)**:
  - `precio_convertido`: Precio unitario de venta × vcambio
  - `precio_total_convertido`: Cantidad × Precio de venta × vcambio
  - `precostosi_convertido`: Precio de costo unitario × vcambio
  - `costo_total_convertido`: Cantidad × Precio de costo × vcambio
  - `vcambio`: Valor de cambio aplicado (default: 1 para ARS)
  - `tipo_moneda`: Código de moneda (1=ARS, 2=USD, 3=Otra)

- **Campos Legacy (DEPRECATED - mantener para compatibilidad)**:
  - `precio_total`: Ahora apunta a `precio_total_convertido`
  - `costo_total`: Ahora apunta a `costo_total_convertido`
  - `precio`: Precio unitario SIN conversión
  - `precostosi`: Precio de costo unitario SIN conversión

- **Campos comunes**:
  - `tipo`, `cantidad`, `id_art`, `descripcion`
  - `fecha_resuelto`, `usuario_res`, `observacion`
  - `sucursald` (De Sucursal), `sucursalh` (A Sucursal)
  - `estado`, `id_num`, `id_items`

**NOTA IMPORTANTE**: Los totales ya vienen calculados CON CONVERSIÓN desde el backend PHP.
El frontend solo valida y formatea los valores (método `procesarItemsPedido()`).

### 3.3. Diferencias entre Componentes

#### stockpedido
- **Propósito**: Ver pedidos solicitados que están pendientes de recepción
- **Estados mostrados**: 'Solicitado', 'Solicitado-E'
- **Acción principal**: Recibir pedido
- **Filtrado**: Por `sucursald` (quien solicita)

#### stockrecibo
- **Propósito**: Ver pedidos enviados que están pendientes de recepción
- **Estados mostrados**: 'Enviado', 'Recibido'
- **Acción principal**: Visualización (no hay acciones de modificación)
- **Filtrado**: Por `sucursalh` (quien recibe)

#### enviostockpendientes
- **Propósito**: Ver pedidos solicitados por otras sucursales pendientes de envío
- **Estados mostrados**: 'Solicitado'
- **Acción principal**: Enviar pedido
- **Filtrado**: Por `sucursalh` (a quien se debe enviar)

#### enviodestockrealizados
- **Propósito**: Ver envíos realizados por la sucursal actual
- **Estados mostrados**: 'Enviado'
- **Acción principal**: Visualización con selección múltiple
- **Filtrado**: Por `sucursald` (quien envía)

---

## 4. PLAN DE IMPLEMENTACIÓN DETALLADO

### 4.1. Fase 1: Preparación de Dependencias

#### 4.1.1. enviodestockrealizados - Agregar Importaciones
**Archivo**: `enviodestockrealizados.component.ts`

**Acción**: Agregar después de la línea 7 (después de `import { CalendarModule } from 'primeng/calendar';`)

```typescript
import * as FileSaver from 'file-saver';
import xlsx from 'xlsx/xlsx';
```

**Verificación**: Compilar con `ng build` y verificar que no haya errores de importación.

---

### 4.2. Fase 2: Implementación del Método exportarExcel()

#### 4.2.1. stockpedido

**Archivo**: `stockpedido.component.ts`
**Ubicación**: Después del método `cancelarPedido()` (línea 727)

```typescript
/**
 * Exporta los datos de pedidos de stock a un archivo Excel
 * Incluye todos los campos visibles con formato apropiado
 * v2.0: Actualizado para incluir conversión de moneda
 */
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.pedidoItem.map(item => ({
      // Campos básicos
      'ID': item.id_num,
      'Tipo': item.tipo,
      'Estado': item.estado,
      'Fecha': item.fecha_resuelto || 'N/A',

      // Producto
      'ID Artículo': item.id_art,
      'Descripción': item.descripcion,
      'Cantidad': item.cantidad,

      // ====================================================================
      // PRECIOS Y COSTOS CON CONVERSIÓN DE MONEDA (v2.0)
      // ====================================================================
      'Precio Unit. Venta': this.formatearNumero(item.precio_convertido),        // ← MODIFICADO
      'Precio Total': this.formatearNumero(item.precio_total_convertido),        // ← MODIFICADO
      'Precio Costo Unit.': this.formatearNumero(item.precostosi_convertido),    // ← MODIFICADO
      'Total Precio Costo': this.formatearNumero(item.costo_total_convertido),   // ← MODIFICADO

      // ====================================================================
      // INFORMACIÓN DE MONEDA (v2.0) - OPCIONAL
      // ====================================================================
      'Valor Cambio': item.vcambio && item.vcambio !== 1 ? item.vcambio : '-',
      'Tipo Moneda': item.tipo_moneda ? this.getNombreMoneda(item.tipo_moneda) : 'ARS',

      // Sucursales
      'De Sucursal': this.getNombreSucursal(item.sucursald),
      'A Sucursal': this.getNombreSucursal(item.sucursalh),

      // Usuario y observación
      'Usuario': item.usuario_res || item.usuario || 'N/A',
      'Observación': item.observacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((module: any) => {
      const saveAs = module.default || module.saveAs || module;
      if (typeof saveAs === 'function') {
        saveAs(data, 'pedidos_stock_' + new Date().getTime() + '.xlsx');
      } else if (typeof saveAs.saveAs === 'function') {
        saveAs.saveAs(data, 'pedidos_stock_' + new Date().getTime() + '.xlsx');
      }
    });
  });
}

/**
 * Formatea un número para exportación a Excel
 * Retorna el número directamente para que Excel lo reconozca como número
 */
private formatearNumero(valor: number | undefined | null): string | number {
  if (valor === null || valor === undefined) {
    return 'N/A';
  }
  return valor;
}

/**
 * Obtiene el nombre de la sucursal por su ID
 */
private getNombreSucursal(id: number): string {
  const sucursales: { [key: number]: string } = {
    1: 'Casa Central',
    2: 'Valle Viejo',
    3: 'Güemes',
    4: 'Depósito',
    5: 'Mayorista'
  };
  return sucursales[id] || `Sucursal ${id}`;
}

/**
 * Obtiene el nombre de la moneda por su código
 * v2.0: Nuevo método para conversión de moneda
 */
private getNombreMoneda(codigo: number): string {
  const monedas: { [key: number]: string } = {
    1: 'ARS',
    2: 'USD',
    3: 'Otra'
  };
  return monedas[codigo] || 'Desconocida';
}
```

**Consideraciones especiales**:
- Este componente muestra pedidos en estado 'Solicitado' y 'Solicitado-E'
- El nombre del archivo será `pedidos_stock_TIMESTAMP.xlsx`

---

#### 4.2.2. stockrecibo

**Archivo**: `stockrecibo.component.ts`
**Ubicación**: Después del método `get costoTotalItemSeleccionado()` (línea 407)

```typescript
/**
 * Exporta los datos de recibos de stock a un archivo Excel
 * Incluye todos los campos visibles con formato apropiado
 * v2.0: Actualizado para incluir conversión de moneda
 */
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.pedidoItem.map(item => ({
      // Campos básicos
      'ID': item.id_num,
      'Tipo': item.tipo,
      'Estado': item.estado,
      'Fecha': item.fecha_resuelto || 'N/A',

      // Producto
      'ID Artículo': item.id_art,
      'Descripción': item.descripcion,
      'Cantidad': item.cantidad,

      // Precios y costos CON CONVERSIÓN
      'Precio Unit. Venta': this.formatearNumero(item.precio_convertido),        // ← MODIFICADO
      'Precio Total': this.formatearNumero(item.precio_total_convertido),        // ← MODIFICADO
      'Precio Costo Unit.': this.formatearNumero(item.precostosi_convertido),    // ← MODIFICADO
      'Total Precio Costo': this.formatearNumero(item.costo_total_convertido),   // ← MODIFICADO

      // Información de moneda
      'Valor Cambio': item.vcambio && item.vcambio !== 1 ? item.vcambio : '-',
      'Tipo Moneda': item.tipo_moneda ? this.getNombreMoneda(item.tipo_moneda) : 'ARS',

      // Sucursales
      'A Sucursal': this.getNombreSucursal(item.sucursalh),

      // Usuario y observación
      'Usuario': item.usuario_res || item.usuario || 'N/A',
      'Observación': item.observacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((module: any) => {
      const saveAs = module.default || module.saveAs || module;
      if (typeof saveAs === 'function') {
        saveAs(data, 'recibos_stock_' + new Date().getTime() + '.xlsx');
      } else if (typeof saveAs.saveAs === 'function') {
        saveAs.saveAs(data, 'recibos_stock_' + new Date().getTime() + '.xlsx');
      }
    });
  });
}

/**
 * Formatea un número para exportación a Excel
 */
private formatearNumero(valor: number | undefined | null): string | number {
  if (valor === null || valor === undefined) {
    return 'N/A';
  }
  return valor;
}

/**
 * Obtiene el nombre de la sucursal por su ID
 */
private getNombreSucursal(id: number): string {
  const sucursales: { [key: number]: string } = {
    1: 'Casa Central',
    2: 'Valle Viejo',
    3: 'Güemes',
    4: 'Depósito',
    5: 'Mayorista'
  };
  return sucursales[id] || `Sucursal ${id}`;
}

/**
 * Obtiene el nombre de la moneda por su código
 */
private getNombreMoneda(codigo: number): string {
  const monedas: { [key: number]: string } = {
    1: 'ARS',
    2: 'USD',
    3: 'Otra'
  };
  return monedas[codigo] || 'Desconocida';
}
```

**Consideraciones especiales**:
- Este componente muestra pedidos en estado 'Enviado' y 'Recibido'
- Solo muestra sucursal de destino (`sucursalh`)
- El nombre del archivo será `recibos_stock_TIMESTAMP.xlsx`

---

#### 4.2.3. enviostockpendientes

**Archivo**: `enviostockpendientes.component.ts`
**Ubicación**: Después del método `get costoTotalItemSeleccionado()` (línea 677)

```typescript
/**
 * Exporta los datos de envíos pendientes a un archivo Excel
 * Incluye todos los campos visibles con formato apropiado
 * v2.0: Actualizado para incluir conversión de moneda
 */
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.pedidoItem.map(item => ({
      // Campos básicos
      'ID': item.id_num,
      'Tipo': item.tipo,
      'Estado': item.estado,
      'Fecha': item.fecha_resuelto || 'N/A',

      // Producto
      'ID Artículo': item.id_art,
      'Descripción': item.descripcion,
      'Cantidad': item.cantidad,

      // Precios y costos CON CONVERSIÓN
      'Precio Unit. Venta': this.formatearNumero(item.precio_convertido),        // ← MODIFICADO
      'Precio Total': this.formatearNumero(item.precio_total_convertido),        // ← MODIFICADO
      'Precio Costo Unit.': this.formatearNumero(item.precostosi_convertido),    // ← MODIFICADO
      'Total Precio Costo': this.formatearNumero(item.costo_total_convertido),   // ← MODIFICADO

      // Información de moneda
      'Valor Cambio': item.vcambio && item.vcambio !== 1 ? item.vcambio : '-',
      'Tipo Moneda': item.tipo_moneda ? this.getNombreMoneda(item.tipo_moneda) : 'ARS',

      // Sucursales
      'De Sucursal': this.getNombreSucursal(item.sucursald),
      'A Sucursal': this.getNombreSucursal(item.sucursalh),

      // Usuario y observación
      'Usuario': item.usuario_res || item.usuario || 'N/A',
      'Observación': item.observacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((module: any) => {
      const saveAs = module.default || module.saveAs || module;
      if (typeof saveAs === 'function') {
        saveAs(data, 'envios_pendientes_' + new Date().getTime() + '.xlsx');
      } else if (typeof saveAs.saveAs === 'function') {
        saveAs.saveAs(data, 'envios_pendientes_' + new Date().getTime() + '.xlsx');
      }
    });
  });
}

/**
 * Formatea un número para exportación a Excel
 */
private formatearNumero(valor: number | undefined | null): string | number {
  if (valor === null || valor === undefined) {
    return 'N/A';
  }
  return valor;
}

/**
 * Obtiene el nombre de la sucursal por su ID
 */
private getNombreSucursal(id: number): string {
  const sucursales: { [key: number]: string } = {
    1: 'Casa Central',
    2: 'Valle Viejo',
    3: 'Güemes',
    4: 'Depósito',
    5: 'Mayorista'
  };
  return sucursales[id] || `Sucursal ${id}`;
}

/**
 * Obtiene el nombre de la moneda por su código
 */
private getNombreMoneda(codigo: number): string {
  const monedas: { [key: number]: string } = {
    1: 'ARS',
    2: 'USD',
    3: 'Otra'
  };
  return monedas[codigo] || 'Desconocida';
}
```

**Consideraciones especiales**:
- Este componente muestra pedidos en estado 'Solicitado'
- Filtra por `sucursalh` (donde la sucursal actual debe enviar)
- El nombre del archivo será `envios_pendientes_TIMESTAMP.xlsx`

---

#### 4.2.4. enviodestockrealizados

**Archivo**: `enviodestockrealizados.component.ts`
**Ubicación**: Después del método `get costoPromedioSeleccionados()` (línea 311)

```typescript
/**
 * Exporta los datos de envíos realizados a un archivo Excel
 * Incluye todos los campos visibles con formato apropiado
 * v2.0: Actualizado para incluir conversión de moneda
 */
exportarExcel(): void {
  import('xlsx').then((xlsx) => {
    const datosExportar = this.pedidoItem.map(item => ({
      // Campos básicos
      'ID': item.id_num,
      'Tipo': item.tipo,
      'Estado': item.estado,
      'Fecha': item.fecha_resuelto || 'N/A',

      // Producto
      'ID Artículo': item.id_art,
      'Descripción': item.descripcion,
      'Cantidad': item.cantidad,

      // Precios y costos CON CONVERSIÓN
      'Precio Unit. Venta': this.formatearNumero(item.precio_convertido),        // ← MODIFICADO
      'Precio Total': this.formatearNumero(item.precio_total_convertido),        // ← MODIFICADO
      'Precio Costo Unit.': this.formatearNumero(item.precostosi_convertido),    // ← MODIFICADO
      'Total Precio Costo': this.formatearNumero(item.costo_total_convertido),   // ← MODIFICADO

      // Información de moneda
      'Valor Cambio': item.vcambio && item.vcambio !== 1 ? item.vcambio : '-',
      'Tipo Moneda': item.tipo_moneda ? this.getNombreMoneda(item.tipo_moneda) : 'ARS',

      // Sucursales
      'De Sucursal': this.getNombreSucursal(item.sucursald),
      'A Sucursal': this.getNombreSucursal(item.sucursalh),

      // Usuario y observación
      'Usuario': item.usuario_res || item.usuario || 'N/A',
      'Observación': item.observacion || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(datosExportar);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    import('file-saver').then((module: any) => {
      const saveAs = module.default || module.saveAs || module;
      if (typeof saveAs === 'function') {
        saveAs(data, 'envios_realizados_' + new Date().getTime() + '.xlsx');
      } else if (typeof saveAs.saveAs === 'function') {
        saveAs.saveAs(data, 'envios_realizados_' + new Date().getTime() + '.xlsx');
      }
    });
  });
}

/**
 * Formatea un número para exportación a Excel
 */
private formatearNumero(valor: number | undefined | null): string | number {
  if (valor === null || valor === undefined) {
    return 'N/A';
  }
  return valor;
}

/**
 * Obtiene el nombre de la sucursal por su ID
 */
private getNombreSucursal(id: number): string {
  const sucursales: { [key: number]: string } = {
    1: 'Casa Central',
    2: 'Valle Viejo',
    3: 'Güemes',
    4: 'Depósito',
    5: 'Mayorista'
  };
  return sucursales[id] || `Sucursal ${id}`;
}

/**
 * Obtiene el nombre de la moneda por su código
 */
private getNombreMoneda(codigo: number): string {
  const monedas: { [key: number]: string } = {
    1: 'ARS',
    2: 'USD',
    3: 'Otra'
  };
  return monedas[codigo] || 'Desconocida';
}
```

**Consideraciones especiales**:
- Este componente muestra pedidos en estado 'Enviado'
- Usa selección múltiple con checkboxes
- El nombre del archivo será `envios_realizados_TIMESTAMP.xlsx`

---

### 4.3. Fase 3: Implementación de Botones en HTML

#### 4.3.1. Ubicación Común del Botón

El botón debe agregarse en la sección de controles superiores, dentro del caption de la tabla PrimeNG.

**Estructura HTML común** (a adaptar en cada componente):

```html
<ng-template pTemplate="caption">
    <div class="p-d-flex justify-content-between align-items-center">
        <!-- NUEVO: Botón de exportación Excel -->
        <button
            type="button"
            class="btn btn-success btn-sm me-2"
            (click)="exportarExcel()"
            [disabled]="!pedidoItem || pedidoItem.length === 0"
            title="Exportar a Excel">
            <i class="fa fa-file-excel mr-1"></i>
            Excel
        </button>

        <!-- Selector de columnas existente -->
        <p-multiSelect
            [options]="cols"
            [(ngModel)]="selectedColumns"
            optionLabel="header"
            selectedItemsLabel="{0} Columnas Seleccionadas"
            [style]="{'min-width': '200px'}"
            placeholder="Elija Columnas">
        </p-multiSelect>

        <!-- Buscador existente -->
        <span class="p-input-icon-left ml-1">
            <input pInputText type="text"
                (input)="dtable.filterGlobal($any($event.target).value, 'contains')"
                placeholder="Buscar.." />
        </span>
    </div>
</ng-template>
```

#### 4.3.2. stockpedido

**Archivo**: `stockpedido.component.html`
**Ubicación**: Dentro de `<ng-template pTemplate="caption">` (línea 86-97)

**Acción**: Agregar el botón como primer elemento dentro del div con clase `p-d-flex`

```html
<ng-template pTemplate="caption">
    <div class="p-d-flex justify-content-between align-items-center">
        <!-- NUEVO: Botón de exportación Excel -->
        <button
            type="button"
            class="btn btn-success btn-sm me-2"
            (click)="exportarExcel()"
            [disabled]="!pedidoItem || pedidoItem.length === 0"
            title="Exportar a Excel">
            <i class="fa fa-file-excel mr-1"></i>
            Excel
        </button>

        <p-multiSelect [options]="cols" [(ngModel)]="selectedColumns" optionLabel="header"
            selectedItemsLabel="{0} Columnas Seleccionadas" [style]="{'min-width': '200px'}"
            placeholder="Elija Columnas">
        </p-multiSelect>
        <span class="p-input-icon-left ml-1">
            <input pInputText type="text"
                (input)="dtable.filterGlobal($any($event.target).value, 'contains')"
                placeholder="Buscar.." />
        </span>
    </div>
</ng-template>
```

---

#### 4.3.3. stockrecibo

**Archivo**: `stockrecibo.component.html`
**Ubicación**: Dentro de `<ng-template pTemplate="caption">` (línea 13-24)

**Acción**: Agregar el botón como primer elemento dentro del div con clase `p-d-flex`

```html
<ng-template pTemplate="caption">
    <div class="p-d-flex justify-content-between align-items-center">
        <!-- NUEVO: Botón de exportación Excel -->
        <button
            type="button"
            class="btn btn-success btn-sm me-2"
            (click)="exportarExcel()"
            [disabled]="!pedidoItem || pedidoItem.length === 0"
            title="Exportar a Excel">
            <i class="fa fa-file-excel mr-1"></i>
            Excel
        </button>

        <p-multiSelect [options]="cols" [(ngModel)]="selectedColumns" optionLabel="header"
            selectedItemsLabel="{0} Columnas Seleccionadas" [style]="{'min-width': '200px'}"
            placeholder="Elija Columnas">
        </p-multiSelect>
        <span class="p-input-icon-left ml-1">
            <input pInputText type="text"
                (input)="dtable.filterGlobal($any($event.target).value, 'contains')"
                placeholder="Buscar.." />
        </span>
    </div>
</ng-template>
```

---

#### 4.3.4. enviostockpendientes

**Archivo**: `enviostockpendientes.component.html`
**Ubicación**: Dentro de `<ng-template pTemplate="caption">` (línea 13-24)

**Acción**: Agregar el botón como primer elemento dentro del div con clase `p-d-flex`

```html
<ng-template pTemplate="caption">
    <div class="p-d-flex justify-content-between align-items-center">
        <!-- NUEVO: Botón de exportación Excel -->
        <button
            type="button"
            class="btn btn-success btn-sm me-2"
            (click)="exportarExcel()"
            [disabled]="!pedidoItem || pedidoItem.length === 0"
            title="Exportar a Excel">
            <i class="fa fa-file-excel mr-1"></i>
            Excel
        </button>

        <p-multiSelect [options]="cols" [(ngModel)]="selectedColumns" optionLabel="header"
            selectedItemsLabel="{0} Columnas Seleccionadas" [style]="{'min-width': '200px'}"
            placeholder="Elija Columnas">
        </p-multiSelect>
        <span class="p-input-icon-left ml-1">
            <input pInputText type="text"
                (input)="dtable.filterGlobal($any($event.target).value, 'contains')"
                placeholder="Buscar.." />
        </span>
    </div>
</ng-template>
```

---

#### 4.3.5. enviodestockrealizados

**Archivo**: `enviodestockrealizados.component.html`
**Ubicación**: Dentro de `<ng-template pTemplate="caption">` (línea 13-24)

**Acción**: Agregar el botón como primer elemento dentro del div con clase `p-d-flex`

```html
<ng-template pTemplate="caption">
    <div class="p-d-flex justify-content-between align-items-center">
        <!-- NUEVO: Botón de exportación Excel -->
        <button
            type="button"
            class="btn btn-success btn-sm me-2"
            (click)="exportarExcel()"
            [disabled]="!pedidoItem || pedidoItem.length === 0"
            title="Exportar a Excel">
            <i class="fa fa-file-excel mr-1"></i>
            Excel
        </button>

        <p-multiSelect [options]="cols" [(ngModel)]="selectedColumns" optionLabel="header"
            selectedItemsLabel="{0} Columnas Seleccionadas" [style]="{'min-width': '200px'}"
            placeholder="Elija Columnas">
        </p-multiSelect>
        <span class="p-input-icon-left ml-1">
            <input pInputText type="text"
                (input)="dtable.filterGlobal($any($event.target).value, 'contains')"
                placeholder="Buscar.." />
        </span>
    </div>
</ng-template>
```

---

## 5. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### 5.1. Secuencia de Desarrollo

1. **enviodestockrealizados** (Primero)
   - Razón: Requiere agregar las importaciones desde cero
   - Complejidad: Media-Alta
   - Tiempo estimado: 30 minutos

2. **stockrecibo** (Segundo)
   - Razón: Es el más simple, solo visualización
   - Complejidad: Baja
   - Tiempo estimado: 20 minutos

3. **stockpedido** (Tercero)
   - Razón: Similar a stockrecibo pero con más lógica
   - Complejidad: Media
   - Tiempo estimado: 25 minutos

4. **enviostockpendientes** (Cuarto)
   - Razón: Similar a stockpedido
   - Complejidad: Media
   - Tiempo estimado: 25 minutos

**Tiempo total estimado**: 1.5 - 2 horas

---

## 6. CHECKLIST DE VERIFICACIÓN

### 6.1. Por Cada Componente

#### TypeScript (.ts)
- [ ] Importaciones de `file-saver` y `xlsx` agregadas
- [ ] Método `exportarExcel()` implementado
- [ ] Método `formatearNumero()` implementado
- [ ] Método `getNombreSucursal()` implementado
- [ ] Sin errores de compilación TypeScript

#### HTML (.html)
- [ ] Botón de exportación agregado en caption
- [ ] Botón tiene el evento `(click)="exportarExcel()"`
- [ ] Botón tiene la condición `[disabled]="!pedidoItem || pedidoItem.length === 0"`
- [ ] Botón tiene el ícono `fa fa-file-excel`
- [ ] Botón tiene las clases Bootstrap adecuadas

#### Funcionalidad
- [ ] Botón visible en la interfaz
- [ ] Botón se deshabilita cuando no hay datos
- [ ] Clic en botón genera archivo Excel
- [ ] Archivo se descarga con nombre correcto y timestamp
- [ ] Datos exportados coinciden con datos visibles
- [ ] Campos monetarios mantienen formato numérico
- [ ] Nombres de sucursales se traducen correctamente

---

## 7. PRUEBAS Y VALIDACIÓN

### 7.1. Casos de Prueba

#### Prueba 1: Exportación con Datos
**Pasos**:
1. Navegar al componente
2. Verificar que hay datos en la tabla
3. Hacer clic en el botón "Excel"
4. Verificar que se descarga el archivo

**Resultado esperado**:
- Archivo `.xlsx` descargado con nombre `{componente}_TIMESTAMP.xlsx`
- Archivo contiene todos los registros visibles
- Campos monetarios son números (no texto)

#### Prueba 2: Botón Deshabilitado sin Datos
**Pasos**:
1. Navegar al componente
2. Aplicar filtros para que no haya resultados
3. Verificar el estado del botón

**Resultado esperado**:
- Botón "Excel" está deshabilitado (gris, no clickeable)

#### Prueba 3: Integridad de Datos
**Pasos**:
1. Exportar datos con registros específicos visibles
2. Abrir archivo Excel
3. Verificar que todos los campos están presentes
4. Verificar que los totalizadores calculados son correctos

**Resultado esperado**:
- Todos los campos exportados correctamente
- Nombres de sucursales correctos
- Valores numéricos formateados como números
- Fechas formateadas correctamente

#### Prueba 4: Filtros y Exportación
**Pasos**:
1. Aplicar filtros en la tabla (búsqueda, filtros de columna)
2. Exportar a Excel
3. Verificar contenido

**Resultado esperado**:
- Solo se exportan los registros filtrados/visibles

---

## 8. MANTENIMIENTO Y MEJORAS FUTURAS

### 8.1. Mejoras Potenciales

1. **Formato Avanzado de Excel**
   - Agregar estilos (negrita en encabezados, colores)
   - Ajustar ancho de columnas automáticamente
   - Agregar filtros de Excel en la primera fila

2. **Opciones de Exportación**
   - Permitir al usuario elegir qué columnas exportar
   - Agregar opción de exportar con/sin totalizadores
   - Exportar en diferentes formatos (CSV, PDF)

3. **Totalizadores en Excel**
   - Agregar fila de totales al final del archivo
   - Incluir fórmulas de Excel para sumar columnas

4. **Notificaciones**
   - Mostrar mensaje de éxito después de exportar
   - Indicador de progreso para exportaciones grandes

### 8.2. Documentación de Código

Todos los métodos implementados incluyen:
- Comentarios JSDoc con descripción
- Indicación de parámetros y retornos
- Notas sobre consideraciones especiales

---

## 9. GLOSARIO

| Término | Descripción |
|---------|-------------|
| **xlsx** | Librería JavaScript para crear y manipular archivos Excel |
| **file-saver** | Librería para guardar archivos en el navegador |
| **PrimeNG** | Librería de componentes UI para Angular |
| **Timestamp** | Marca de tiempo numérica (milisegundos desde 1970) |
| **Blob** | Binary Large Object, objeto que representa datos binarios |
| **Worksheet** | Hoja de cálculo dentro de un archivo Excel |
| **Workbook** | Libro de trabajo Excel (colección de worksheets) |

---

## 10. CONTACTO Y SOPORTE

Para consultas sobre esta implementación:
- Revisar el código de referencia en `lista-altas.component.ts` (líneas 824-891)
- Consultar la documentación de xlsx: https://github.com/SheetJS/sheetjs
- Consultar la documentación de file-saver: https://github.com/eligrey/FileSaver.js

---

## 11. HISTORIAL DE CAMBIOS

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-01-14 | Documento inicial creado |
| 2.0 | 2025-11-14 | **ACTUALIZACIÓN MAYOR**: Documento rectificado para reflejar implementación de totalizadores v2.2 y conversión de moneda v2.0<br>- Actualizada sección 3.2 con campos con conversión<br>- Actualizados todos los métodos exportarExcel() para usar campos *_convertido<br>- Agregados campos vcambio y tipo_moneda<br>- Agregado método getNombreMoneda()<br>- Agregada nota sobre procesamiento en backend<br>- Actualizada introducción con referencias a documentos relacionados |

---

## 12. NOTAS IMPORTANTES PARA IMPLEMENTACIÓN v2.0

### 12.1. Cambios Críticos vs Versión 1.0

**⚠️ IMPORTANTE**: Si ya implementaste la versión 1.0, debes actualizar:

1. **Cambiar nombres de campos en exportarExcel()**:
   - `item.precio` → `item.precio_convertido`
   - `item.precio_total` → `item.precio_total_convertido`
   - `item.precostosi` → `item.precostosi_convertido`
   - `item.costo_total` → `item.costo_total_convertido`

2. **Agregar nuevos campos de moneda**:
   - `'Valor Cambio': item.vcambio && item.vcambio !== 1 ? item.vcambio : '-'`
   - `'Tipo Moneda': item.tipo_moneda ? this.getNombreMoneda(item.tipo_moneda) : 'ARS'`

3. **Agregar método getNombreMoneda()** en cada componente

### 12.2. Compatibilidad con Totalizadores v2.2

Los métodos exportarExcel() ahora utilizan los mismos campos que:
- El método `procesarItemsPedido()` que reemplazó a `calcularCostosTotales()`
- Los paneles de totalizadores en los templates HTML
- Las columnas mostradas en las tablas PrimeNG

**Esto garantiza consistencia total** entre lo que el usuario ve en pantalla y lo que se exporta a Excel.

### 12.3. Ventajas de la Versión 2.0

✅ **Precios reales en ARS**: Todos los precios ya están convertidos a pesos argentinos
✅ **Transparencia**: Campos vcambio y tipo_moneda muestran cómo se calcularon
✅ **Consistencia**: Los valores exportados coinciden exactamente con la interfaz
✅ **Trazabilidad**: Se puede auditar qué valor de cambio se usó en cada item

### 12.4. Casos de Uso

**Ejemplo 1 - Artículo en Dólares**:
- `precio = 100` (USD)
- `vcambio = 1200`
- `precio_convertido = 120000` (ARS)
- Excel mostrará: "Precio Unit. Venta: 120000", "Tipo Moneda: USD", "Valor Cambio: 1200"

**Ejemplo 2 - Artículo en Pesos**:
- `precio = 5000` (ARS)
- `vcambio = 1`
- `precio_convertido = 5000` (ARS)
- Excel mostrará: "Precio Unit. Venta: 5000", "Tipo Moneda: ARS", "Valor Cambio: -"

---

**FIN DEL DOCUMENTO**
