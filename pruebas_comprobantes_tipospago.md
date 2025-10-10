# PLAN DE PRUEBAS: Desglose por Tipo de Pago en Comprobantes PDF

**Fecha:** 10 de Octubre de 2025
**Versión:** 1.0
**Implementación:** plan_final_master.md v2.0
**Estado:** PENDIENTE DE EJECUCIÓN

---

## 📋 RESUMEN

Este documento contiene el plan de pruebas completo para validar la implementación del desglose por tipo de pago en los comprobantes PDF del sistema MotoApp.

**Archivos modificados:**
- `src/app/components/carrito/carrito.component.ts`
- `src/app/services/historial-pdf.service.ts`
- `src/app/services/pdf-generator.service.ts`

**Funcionalidad agregada:**
- Tabla "DETALLE POR MÉTODO DE PAGO" en PDFs
- Agrupación de productos por tipo de pago
- Cálculo y visualización de subtotales por método de pago

---

## 🔴 PRUEBAS CRÍTICAS OBLIGATORIAS

### Caso 1: Carrito con múltiples tipos de pago

**Objetivo:** Validar que el PDF muestra correctamente el desglose cuando hay productos con diferentes métodos de pago.

**Pasos:**
1. Iniciar sesión en la aplicación
2. Agregar al carrito 3 productos con diferentes tarjetas/métodos de pago:
   - Producto A con "Efectivo"
   - Producto B con "Tarjeta Visa"
   - Producto C con "Tarjeta MasterCard"
3. Finalizar la compra
4. Descargar el PDF generado

**Criterios de aceptación:**
- [ ] PDF contiene sección "DETALLE POR MÉTODO DE PAGO"
- [ ] Los subtotales están ordenados alfabéticamente
- [ ] "Indefinido" aparece al final (si existe)
- [ ] Suma de subtotales = Total general (tolerancia: ±$0.01)
- [ ] Formato correcto: "Método de Pago" | "Subtotal"
- [ ] Los valores tienen 2 decimales

**Resultado:** ✅ PASS / ❌ FAIL

**Observaciones:**
```
[Espacio para notas del tester]
```

---

### Caso 2: Carrito con un solo tipo de pago

**Objetivo:** Validar el comportamiento cuando todos los productos usan el mismo método de pago.

**Pasos:**
1. Iniciar sesión en la aplicación
2. Agregar varios productos (mínimo 3) todos con "Efectivo"
3. Finalizar la compra
4. Descargar el PDF generado

**Criterios de aceptación:**
- [ ] PDF contiene sección "DETALLE POR MÉTODO DE PAGO"
- [ ] Tabla muestra exactamente 1 línea de desglose
- [ ] Subtotal = Total general
- [ ] No hay errores en consola

**Resultado:** ✅ PASS / ❌ FAIL

**Observaciones:**
```
[Espacio para notas del tester]
```

---

### Caso 3: Race Condition (tarjetas no cargadas)

**Objetivo:** Verificar el manejo defensivo cuando las tarjetas no están cargadas completamente.

**Pasos:**
1. Abrir DevTools → Network → Bloquear temporalmente el endpoint de tarjetas (opcional)
2. Recargar la página completamente (F5)
3. INMEDIATAMENTE agregar productos al carrito
4. Finalizar compra RÁPIDAMENTE antes de que carguen las tarjetas
5. Descargar el PDF

**Criterios de aceptación:**
- [ ] PDF se genera SIN errores
- [ ] PDF puede o no tener desglose (ambos casos son válidos)
- [ ] En consola del navegador aparece: "⚠️ ADVERTENCIA: No se pudieron calcular subtotales por tipo de pago. PDF sin desglose."
- [ ] La aplicación NO se crashea
- [ ] El total del PDF es correcto

**Resultado:** ✅ PASS / ❌ FAIL

**Observaciones:**
```
[Espacio para notas del tester]
```

---

### Caso 4: Producto sin cod_tar (manejo de undefined)

**Objetivo:** Validar el manejo defensivo de productos sin tipo de pago definido.

**Pasos:**
1. Agregar productos al carrito
2. Abrir DevTools → Application → Session Storage
3. Buscar el array de items del carrito
4. Eliminar manualmente la propiedad `cod_tar` de un item
5. Finalizar compra
6. Descargar el PDF

**Criterios de aceptación:**
- [ ] PDF se genera correctamente
- [ ] El producto sin cod_tar aparece como "Indefinido" en el desglose
- [ ] NO hay error en consola: "Cannot read property 'toString' of undefined"
- [ ] Los demás productos se agrupan correctamente
- [ ] "Indefinido" aparece al final de la lista

**Resultado:** ✅ PASS / ❌ FAIL

**Observaciones:**
```
[Espacio para notas del tester]
```

---

### Caso 5: Compatibilidad hacia atrás

**Objetivo:** Asegurar que la funcionalidad existente no se ha roto.

**Pasos:**
1. Generar un Presupuesto (PR)
2. Generar una Consulta (CS)
3. Generar una Factura (FC)
4. Generar una Nota de Crédito (NC)
5. Verificar cada PDF generado

**Criterios de aceptación:**
- [ ] Presupuestos se generan sin errores
- [ ] Consultas se generan sin errores
- [ ] Facturas se generan sin errores
- [ ] Notas de Crédito se generan sin errores
- [ ] Todos los PDFs mantienen el formato original
- [ ] No hay regresiones en el diseño

**Resultado:** ✅ PASS / ❌ FAIL

**Observaciones:**
```
[Espacio para notas del tester]
```

---

### Caso 6: Historial de ventas

**Objetivo:** Validar que los PDFs generados desde el historial también incluyen el desglose.

**Pasos:**
1. Ir al componente "Historial de Ventas" (historial-ventas2)
2. Seleccionar una venta existente
3. Imprimir el PDF
4. Revisar el PDF generado

**Criterios de aceptación:**
- [ ] PDF se genera correctamente
- [ ] Si la venta tiene productos con tipos de pago, muestra el desglose
- [ ] Si no hay datos de tipos de pago, PDF sin desglose (sin errores)
- [ ] Los subtotales coinciden con los productos de la venta
- [ ] Log en consola: "📊 Historial PDF - Desglose por tipo de pago: true/false"

**Resultado:** ✅ PASS / ❌ FAIL

**Observaciones:**
```
[Espacio para notas del tester]
```

---

## 📊 VALIDACIONES MATEMÁTICAS

### Verificación de Cálculos

**Objetivo:** Asegurar la precisión de los cálculos de subtotales.

**Procedimiento:**
1. Tomar un PDF generado del Caso 1
2. Calcular MANUALMENTE la suma de todos los subtotales mostrados en "DETALLE POR MÉTODO DE PAGO"
3. Comparar con el valor de "TOTAL" en el PDF
4. Registrar la diferencia (si existe)

**Tolerancia aceptable:** ±$0.01 (un centavo) por redondeo

**Ejemplo de cálculo:**
```
Efectivo:        $150.50
Tarjeta Visa:    $320.75
Tarjeta Master:  $89.25
----------------------------
Suma manual:     $560.50
Total en PDF:    $560.50
Diferencia:      $0.00  ✅
```

**Resultado:** ✅ PASS / ❌ FAIL

**Observaciones:**
```
Suma manual:     $_______
Total en PDF:    $_______
Diferencia:      $_______
```

---

## 🔍 VERIFICACIÓN DE LOGS EN CONSOLA

Durante la ejecución de las pruebas, verificar que aparezcan los siguientes logs en la consola del navegador:

### Logs esperados en el Carrito

**Cuando hay subtotales:**
```
🎯 Desglose por tipo de pago: SÍ [{tipoPago: "Efectivo", subtotal: 150.50}, ...]
```

**Cuando NO hay subtotales:**
```
🎯 Desglose por tipo de pago: NO undefined
```

### Logs esperados en Historial PDF

```
📊 Historial PDF - Desglose por tipo de pago: true
📊 Subtotales calculados desde historial: [{tipoPago: "...", subtotal: ...}]
```

### Logs esperados en PDF Generator

```
📄 PDF Generator - Desglose por tipo de pago: true
```

**Checklist de logs:**
- [ ] Logs de carrito presentes
- [ ] Logs de historial presentes (si aplica)
- [ ] Logs de pdf-generator presentes (si aplica)
- [ ] NO hay errores en consola

---

## 🌐 PRUEBAS MULTI-NAVEGADOR

### Chrome

**Versión:** _________

**Pasos:**
1. Ejecutar Caso 1 en Chrome
2. Descargar y abrir el PDF
3. Verificar visualización correcta

**Criterios de aceptación:**
- [ ] PDF se descarga correctamente
- [ ] Tabla de desglose se visualiza correctamente
- [ ] Formato y alineación correctos
- [ ] No hay caracteres rotos o mal codificados

**Resultado:** ✅ PASS / ❌ FAIL

---

### Firefox

**Versión:** _________

**Pasos:**
1. Ejecutar Caso 1 en Firefox
2. Descargar y abrir el PDF
3. Verificar visualización correcta

**Criterios de aceptación:**
- [ ] PDF se descarga correctamente
- [ ] Tabla de desglose se visualiza correctamente
- [ ] Formato y alineación correctos
- [ ] No hay caracteres rotos o mal codificados

**Resultado:** ✅ PASS / ❌ FAIL

---

### Edge

**Versión:** _________

**Pasos:**
1. Ejecutar Caso 1 en Edge
2. Descargar y abrir el PDF
3. Verificar visualización correcta

**Criterios de aceptación:**
- [ ] PDF se descarga correctamente
- [ ] Tabla de desglose se visualiza correctamente
- [ ] Formato y alineación correctos
- [ ] No hay caracteres rotos o mal codificados

**Resultado:** ✅ PASS / ❌ FAIL

---

## ⚠️ ERRORES QUE NO DEBEN OCURRIR

Registrar como **CRITICAL BUG** si ocurre alguno de estos errores:

- ❌ Crash de la aplicación al finalizar compra
- ❌ Error "Cannot read property 'toString' of undefined"
- ❌ Error "Cannot read property 'map' of undefined"
- ❌ PDF que no se descarga
- ❌ Total incorrecto en el PDF (diferencia > $0.01)
- ❌ Duplicación de productos en el desglose
- ❌ Pérdida de datos en comprobantes
- ❌ Carrito se vacía sin generar comprobante

---

## 📝 CHECKLIST RÁPIDO DE VALIDACIÓN

```
Funcionalidad Principal:
□ Carrito múltiples tipos pago → PDF con desglose
□ Carrito un solo tipo pago → PDF con 1 línea
□ Race condition → PDF sin errores
□ cod_tar undefined → "Indefinido" en PDF

Compatibilidad:
□ Presupuestos (PR) → PDF correcto
□ Consultas (CS) → PDF correcto
□ Facturas (FC) → PDF correcto
□ Notas Crédito (NC) → PDF correcto

Historial:
□ PDF desde historial con desglose

Validaciones:
□ Suma subtotales = Total (±$0.01)
□ Ordenamiento alfabético correcto
□ "Indefinido" al final

Navegadores:
□ Chrome → PDF visualiza correctamente
□ Firefox → PDF visualiza correctamente
□ Edge → PDF visualiza correctamente

Logs:
□ Logs esperados presentes en consola
□ Sin errores en consola
```

---

## 🎯 CRITERIOS DE ÉXITO GENERAL

La implementación se considera **EXITOSA** si:

1. ✅ **6/6 casos críticos PASS** sin errores
2. ✅ Validación matemática correcta (diferencia ≤ $0.01)
3. ✅ PDFs se visualizan correctamente en 3 navegadores
4. ✅ 0 errores críticos en consola durante generación de PDFs
5. ✅ Funcionalidad existente no afectada (compatibilidad hacia atrás)
6. ✅ Performance aceptable (generación PDF < 3 segundos)

**Nivel mínimo aceptable:** 5/6 casos PASS + 0 errores críticos

---

## 📊 REGISTRO DE EJECUCIÓN

**Tester:** ___________________________
**Fecha de ejecución:** ___/___/_____
**Ambiente:** □ Desarrollo □ Staging □ Producción
**Build version:** _______________

### Resumen de Resultados

| Caso de Prueba | Resultado | Observaciones |
|----------------|-----------|---------------|
| Caso 1: Múltiples tipos pago | ☐ PASS ☐ FAIL | |
| Caso 2: Un solo tipo pago | ☐ PASS ☐ FAIL | |
| Caso 3: Race condition | ☐ PASS ☐ FAIL | |
| Caso 4: cod_tar undefined | ☐ PASS ☐ FAIL | |
| Caso 5: Compatibilidad | ☐ PASS ☐ FAIL | |
| Caso 6: Historial | ☐ PASS ☐ FAIL | |
| Validación matemática | ☐ PASS ☐ FAIL | |
| Chrome | ☐ PASS ☐ FAIL | |
| Firefox | ☐ PASS ☐ FAIL | |
| Edge | ☐ PASS ☐ FAIL | |

**Total PASS:** ___/10
**Total FAIL:** ___/10

---

## 🐛 REGISTRO DE BUGS ENCONTRADOS

### Bug #1
- **Severidad:** ☐ Critical ☐ High ☐ Medium ☐ Low
- **Descripción:**
- **Pasos para reproducir:**
- **Resultado esperado:**
- **Resultado actual:**
- **Navegador/Ambiente:**

### Bug #2
- **Severidad:** ☐ Critical ☐ High ☐ Medium ☐ Low
- **Descripción:**
- **Pasos para reproducir:**
- **Resultado esperado:**
- **Resultado actual:**
- **Navegador/Ambiente:**

---

## 📌 RECOMENDACIONES POST-PRUEBAS

**Si todas las pruebas pasan:**
- Proceder con deployment a producción
- Documentar en CHANGELOG
- Notificar a usuarios sobre nueva funcionalidad

**Si hay bugs críticos:**
- Ejecutar rollback inmediato
- Revisar logs detallados
- Analizar código en las secciones fallidas
- Re-ejecutar pruebas después de correcciones

**Si hay bugs menores:**
- Crear tickets para corrección
- Evaluar si son bloqueantes para producción
- Planificar hotfix si es necesario

---

## 🔗 REFERENCIAS

- **Plan de implementación:** `plan_final_master.md`
- **Archivos modificados:**
  - `src/app/components/carrito/carrito.component.ts:429,848,897,1027,766`
  - `src/app/services/historial-pdf.service.ts:25-43,327,463,283`
  - `src/app/services/pdf-generator.service.ts:25-35,47`

---

**FIN DEL PLAN DE PRUEBAS**

*Documento generado: 10 de Octubre de 2025*
*Próxima revisión: Después de ejecución de pruebas*
