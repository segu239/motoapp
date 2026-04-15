# Informe y plan de mejora - PDF de `components/reporte`

## Objetivo

Corregir la exportacion PDF del modulo `src/app/components/reporte` para que:

1. Todo el texto salga en negro legible.
2. Se exporten todos los registros de todas las tablas, no solo lo visible en pantalla.
3. El PDF pueda paginar en varias hojas A4 sin perder informacion.

## Alcance revisado

- `src/app/components/reporte/reporte.component.ts`
- `src/app/components/reporte/reporte.component.html`
- `src/app/components/reporte/reporte.component.css`
- `package.json`

## Hallazgos actuales

### 1. El PDF actual se genera como captura de pantalla

En `src/app/components/reporte/reporte.component.ts:395` el metodo `exportPDF()` usa `html2canvas` sobre `reportContent` y luego inserta esa imagen en `jsPDF`.

Consecuencias:

- El PDF no contiene texto real, sino una imagen rasterizada.
- La calidad del texto depende de la captura y del CSS renderizado en pantalla.
- Los colores suaves o grises del HTML quedan aun mas lavados en el PDF.
- Si un contenedor tiene scroll interno, `html2canvas` captura solo el area renderizada del contenedor, no toda su data.

### 2. Las tablas tienen scroll interno y altura maxima fija

En `src/app/components/reporte/reporte.component.css:15`:

```css
.table-responsive {
  max-height: 500px;
  overflow-y: auto;
}
```

Consecuencias:

- En pantalla solo se ve una ventana de la tabla.
- `html2canvas` captura esa ventana visible.
- Quedan afuera filas no visibles de:
  - `Detalle de Movimientos`
  - `Totales por Caja`
  - `Totales por Concepto`
  - tablas de estadisticas simples, si estan abiertas

### 3. Hay estilos que favorecen texto gris

En `src/app/components/reporte/reporte.component.html:24-25` se usa `text-muted`, y en `src/app/components/reporte/reporte.component.css:55`:

```css
.text-muted {
  color: #6c757d !important;
}
```

Ademas, al exportarse como imagen, cualquier gris de Bootstrap, sombras, antialiasing y contrastes suaves termina viendose mas claro en el PDF.

### 4. El proyecto ya tiene una mejor herramienta instalada para tablas multipagina

En `package.json:27-28` ya existen:

- `jspdf`
- `jspdf-autotable`

Eso permite generar tablas reales, con texto negro, corte automatico entre paginas, encabezados repetidos y sin depender de la parte visible del DOM.

## Causa raiz

El problema no es solo de color. El origen principal es el enfoque de exportacion:

- hoy se exporta una captura del DOM visible;
- el DOM tiene contenedores con scroll y altura limitada;
- por eso el PDF hereda tanto el color tenue como el recorte de filas.

## Recomendacion principal

Reemplazar la exportacion basada en `html2canvas` por una generacion estructurada del PDF usando `jsPDF` + `jspdf-autotable`.

Esta es la opcion mas estable para este caso porque:

- imprime todos los registros desde `this.movimientos` y desde los arrays calculados, no desde lo visible en pantalla;
- fuerza texto negro real (`[0, 0, 0]`);
- corta automaticamente en varias hojas;
- repite encabezados de tabla;
- evita problemas de scroll, zoom y estilos visuales del navegador.

## Plan tecnico propuesto

### Fase 1 - Normalizar la fuente de datos del PDF

Armar dentro del componente, o idealmente en helpers privados, los datasets que ya existen en memoria:

- resumen general
- detalle completo de `this.movimientos`
- `getTotalesPorCaja()`
- `getTotalesPorConcepto()`
- opcional: tablas de estadisticas visuales si `mostrarGraficos` esta activo

Objetivo:

- que el PDF salga de los datos completos, no del HTML capturado.

### Fase 2 - Reescribir `exportPDF()`

Cambiar `src/app/components/reporte/reporte.component.ts:395` para:

1. Crear un `jsPDF('p', 'mm', 'a4')`.
2. Escribir cabecera del reporte con texto negro.
3. Insertar bloques de resumen.
4. Generar cada tabla con `autoTable`.
5. Usar `startY` enlazado con `lastAutoTable.finalY` para encadenar secciones.
6. Guardar el archivo final.

Lineamientos de estilo del PDF:

- `textColor: [0, 0, 0]`
- `lineColor: [0, 0, 0]` o gris oscuro suave para bordes
- encabezados de tablas con buen contraste
- montos alineados a la derecha
- formato numerico consistente con 2 decimales

### Fase 3 - Multipaginacion completa de tablas

Cada tabla debe renderizarse con `autoTable` usando paginacion automatica.

Tablas a incluir:

1. `Detalle de Movimientos` con todos los registros.
2. `Totales por Caja` con todos los registros.
3. `Totales por Concepto` con todos los registros.
4. Si corresponde, tablas de distribucion/resumen adicionales.

Configuraciones sugeridas:

- `theme: 'grid'`
- `headStyles` oscuros o grises con texto blanco, o fondo blanco con texto negro y borde fuerte
- `styles.fontSize` entre 8 y 10 para el detalle
- `rowPageBreak: 'auto'`
- `showHead: 'everyPage'`

### Fase 4 - Ajuste visual del HTML para impresion nativa

Aunque el PDF recomendado no dependa del DOM, conviene dejar bien la vista de impresion para `window.print()` o futuras necesidades.

Cambios sugeridos en `src/app/components/reporte/reporte.component.css`:

- En `@media print`, forzar texto negro:

```css
@media print {
  body, .card, .table, .table td, .table th, p, h1, h2, h3, h4, h5, h6, span, div {
    color: #000 !important;
  }
}
```

- Expandir tablas en impresion:

```css
@media print {
  .table-responsive {
    max-height: none !important;
    overflow: visible !important;
  }
}
```

- Evitar ocultar datos por contenedores y mejorar saltos de pagina:

```css
@media print {
  .card,
  .table-responsive,
  table,
  tbody,
  tr,
  td,
  th {
    page-break-inside: auto;
  }

  h2, h5 {
    page-break-after: avoid;
  }
}
```

Nota: esto mejora la impresion del navegador, pero no resuelve por si solo el problema del PDF actual si se sigue usando `html2canvas`.

### Fase 5 - Limpieza tecnica

Si se migra completamente a tablas reales en PDF:

- `html2canvas` dejaria de ser necesario en este componente;
- se podria eliminar su uso de `reporte.component.ts`;
- la logica quedaria mas mantenible y predecible.

## Esquema sugerido del nuevo PDF

1. Titulo del reporte.
2. Fecha de generacion.
3. Cantidad total de movimientos.
4. Resumen financiero:
   - Total ingresos
   - Total egresos
   - Balance
5. Tabla `Detalle de Movimientos`.
6. Tabla `Totales por Caja`.
7. Tabla `Totales por Concepto`.
8. Numeracion de pagina en pie opcional.

## Ventajas del cambio propuesto

- Texto nitido y negro real.
- Exportacion de todos los datos aunque la tabla tenga scroll en pantalla.
- Menor dependencia del navegador y del zoom.
- Mejor comportamiento en reportes largos.
- PDF mas profesional y consistente.

## Riesgos y cuidados

### Riesgo 1 - Filas muy anchas

La tabla `Detalle de Movimientos` tiene varias columnas y `descripcion_mov` puede ser larga.

Mitigacion:

- reducir fuente a 8 o 9;
- definir anchos por columna;
- permitir salto de linea en descripcion;
- si hiciera falta, usar orientacion horizontal solo para esa tabla.

### Riesgo 2 - Diferencia entre lo que se ve y lo que se exporta

Al pasar de captura visual a PDF estructurado, el PDF ya no sera una foto exacta de la pantalla.

Mitigacion:

- respetar los mismos titulos, orden de secciones y totalizadores;
- mantener formato de fechas y moneda igual al mostrado en UI.

### Riesgo 3 - Secciones condicionales

Si las estadisticas visuales solo aparecen cuando `mostrarGraficos` esta activo, hay que decidir si el PDF siempre las incluye o solo cuando el usuario las tiene visibles.

Recomendacion:

- incluir siempre las tablas de negocio principales;
- dejar las estadisticas visuales como opcionales.

## Criterios de aceptacion

La mejora debe considerarse correcta cuando se cumpla todo esto:

1. En el PDF el texto general se ve negro, legible y con buen contraste.
2. `Detalle de Movimientos` incluye el 100% de `this.movimientos`.
3. `Totales por Caja` incluye todos los items de `getTotalesPorCaja()`.
4. `Totales por Concepto` incluye todos los items de `getTotalesPorConcepto()`.
5. Si el contenido excede una hoja, el PDF agrega las paginas necesarias automaticamente.
6. Los encabezados de tabla siguen siendo claros en paginas adicionales.
7. El archivo se descarga sin romper la navegacion actual del componente.

## Estrategia de validacion

### Prueba funcional minima

1. Generar un reporte con pocas filas.
2. Exportar a PDF.
3. Verificar color negro y totales correctos.

### Prueba de volumen

1. Generar un reporte con suficientes movimientos para superar una hoja.
2. Confirmar que el PDF crea varias paginas.
3. Contar filas exportadas y compararlas con `summary.cantidadMovimientos`.

### Prueba de tablas auxiliares

1. Verificar que `Totales por Caja` y `Totales por Concepto` no se recorten.
2. Revisar que sus totales coincidan con el balance esperado.

### Prueba visual

1. Revisar contraste de titulos, celdas y montos.
2. Confirmar alineacion derecha en importes.
3. Confirmar que no haya texto gris claro.

## Implementacion sugerida por prioridad

### Prioridad alta

- Reemplazar `html2canvas` en `exportPDF()`.
- Usar `jspdf-autotable` para todas las tablas.
- Forzar texto negro en el PDF.

### Prioridad media

- Mejorar `@media print` para impresion nativa.
- Agregar pie de pagina con numeracion.

### Prioridad baja

- Extraer la logica PDF a un servicio dedicado si el reporte sigue creciendo.

## Conclusion

La correccion pedida no deberia resolverse ajustando solo colores CSS. El verdadero cambio necesario es dejar de exportar una captura visible del DOM y pasar a un PDF estructurado con datos completos. Con `jsPDF` + `jspdf-autotable`, que ya estan disponibles en el proyecto, se puede garantizar texto negro, impresion de todos los registros y paginacion en varias hojas sin depender del scroll visual.
