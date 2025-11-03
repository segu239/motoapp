# GUÍA DE TESTING: Fix Validación Presupuestos

**Objetivo**: Verificar que el fix de conversión de tipos funciona correctamente
**Tiempo Estimado**: 30 minutos
**Fecha**: 2025-10-22

---

## 📋 CHECKLIST DE TESTING

Marca cada test a medida que lo completes:

- [ ] **Test 1**: Presupuesto con EFECTIVO AJUSTE (debe PERMITIR ✅)
- [ ] **Test 2**: Presupuesto con CUENTA CORRIENTE (debe PERMITIR ✅)
- [ ] **Test 3**: Presupuesto con TRANSFERENCIA AJUSTE (debe PERMITIR ✅)
- [ ] **Test 4**: Presupuesto con EFECTIVO NORMAL (debe BLOQUEAR ❌)
- [ ] **Test 5**: Regresión - Verificar que tipos NUMBER funcionan ✅
- [ ] **Test 6**: Regresión - Verificar que bloqueos NUMBER funcionan ❌
- [ ] **Test 7**: Mix de tipos STRING y NUMBER (debe PERMITIR ✅)

---

## 🧪 TESTS DETALLADOS

### ✅ Test 1: EFECTIVO AJUSTE (cod_tar STRING "12")

**Pasos**:
1. Iniciar aplicación: `ng serve` o `npm start`
2. Navegar a `/articulos`
3. Seleccionar un cliente
4. Agregar 1 artículo al carrito
5. Seleccionar método de pago: **"EFECTIVO AJUSTE"**
6. Ir al carrito
7. En "Operación", seleccionar **"PRESUPUESTO"**
8. Completar vendedor
9. Click en **"Finalizar Venta"**

**Resultado Esperado**:
- ✅ NO debe mostrar alerta de error
- ✅ Debe aparecer loading "Enviando..."
- ✅ Presupuesto se genera correctamente
- ✅ PDF se descarga
- ✅ En consola del navegador (F12): `✅ VALIDACIÓN PR: Todos los items tienen métodos de pago permitidos`

**Si Falla**:
- Verificar en consola el valor de `cod_tar`
- Verificar el tipo con: `console.log(typeof item.cod_tar)`
- Reportar el error

---

### ✅ Test 2: CUENTA CORRIENTE (cod_tar STRING "111")

**Pasos**:
1. Limpiar carrito si tiene items previos
2. Agregar 1 artículo
3. Seleccionar método de pago: **"CUENTA CORRIENTE"**
4. Ir al carrito
5. Seleccionar operación: **"PRESUPUESTO"**
6. Completar vendedor
7. Finalizar

**Resultado Esperado**:
- ✅ Presupuesto se genera correctamente
- ✅ Sin errores

---

### ✅ Test 3: TRANSFERENCIA AJUSTE (cod_tar STRING "1112")

**Pasos**:
1. Limpiar carrito
2. Agregar 1 artículo
3. Seleccionar método de pago: **"TRANSFERENCIA AJUSTE"**
4. Ir al carrito
5. Seleccionar operación: **"PRESUPUESTO"**
6. Completar vendedor
7. Finalizar

**Resultado Esperado**:
- ✅ Presupuesto se genera correctamente
- ✅ Sin errores

---

### ❌ Test 4: EFECTIVO NORMAL (cod_tar STRING "11") - DEBE BLOQUEAR

**Pasos**:
1. Limpiar carrito
2. Agregar 1 artículo
3. Seleccionar método de pago: **"EFECTIVO"** (normal, no ajuste)
4. Ir al carrito
5. Intentar cambiar operación a **"PRESUPUESTO"**

**Resultado Esperado - CAPA 1 (tipoDocChange)**:
- ❌ SweetAlert aparece inmediatamente con:
  - Icono: Warning (⚠️)
  - Título: "Restricción de Presupuestos"
  - Mensaje: "Los presupuestos SOLO pueden generarse con los siguientes métodos de pago:"
  - Lista: EFECTIVO AJUSTE, TRANSFERENCIA AJUSTE, CUENTA CORRIENTE
  - Indica: "1 artículo(s) con otros métodos de pago: Efectivo"
- ❌ El tipo de documento revierte automáticamente a "FACTURA"
- ❌ NO permite cambiar a PR

**Si logra cambiar a PR (no debería), probar CAPA 3**:
6. Si el select queda en "PR", completar vendedor
7. Intentar finalizar

**Resultado Esperado - CAPA 3 (finalizar)**:
- ❌ SweetAlert con error:
  - Título: "No se puede generar el presupuesto"
  - Texto: "Los presupuestos solo pueden tener artículos con EFECTIVO AJUSTE, TRANSFERENCIA AJUSTE o CUENTA CORRIENTE"
- ❌ En consola: `❌ VALIDACIÓN FINAL FALLIDA: Items con métodos no permitidos en PR:`
- ❌ NO aparece loading "Enviando..."
- ❌ NO se genera presupuesto

---

### ✅ Test 5: REGRESIÓN - cod_tar NUMBER (debe seguir funcionando)

**Propósito**: Verificar que el fix no rompe funcionalidad existente

**Pasos**:
1. Abrir consola del navegador (F12)
2. En la consola, ejecutar:
   ```javascript
   // Simular item con cod_tar como NUMBER
   console.log('Test de regresión con NUMBER');
   ```
3. Agregar artículo con método permitido
4. Si el sistema guarda cod_tar como NUMBER, verificar que funciona

**Resultado Esperado**:
- ✅ Todo funciona igual que antes del fix
- ✅ No hay regresión

**Nota**: Este test es principalmente para verificar que no rompimos nada.

---

### ❌ Test 6: REGRESIÓN - Bloqueos con NUMBER (debe seguir bloqueando)

**Pasos**:
1. Si el sistema permite agregar con cod_tar NUMBER 11 (efectivo normal)
2. Intentar generar presupuesto

**Resultado Esperado**:
- ❌ Debe bloquearse igual que antes del fix
- ❌ Sin regresión en bloqueos

---

### ✅ Test 7: MIX DE TIPOS - STRING + NUMBER

**Pasos**:
1. Limpiar carrito
2. Agregar artículo con **"EFECTIVO AJUSTE"** (cod_tar string "12")
3. Agregar artículo con **"CUENTA CORRIENTE"** (cod_tar que puede ser string o number)
4. Si es posible, agregar artículo con **"TRANSFERENCIA AJUSTE"**
5. Ir al carrito
6. Seleccionar operación: **"PRESUPUESTO"**
7. Completar vendedor
8. Finalizar

**Resultado Esperado**:
- ✅ TODOS los items son reconocidos como permitidos
- ✅ Presupuesto se genera correctamente
- ✅ Subtotales por tipo de pago se muestran correctamente en el PDF

---

## 🔍 DEBUGGING EN CONSOLA

Si algún test falla, usar la consola del navegador (F12) para verificar:

### Verificar tipo de cod_tar

Abrir consola y ejecutar:
```javascript
// Ver items del carrito con sus tipos
let carrito = JSON.parse(sessionStorage.getItem('carrito'));
carrito.forEach(item => {
  console.log(`Item: ${item.nomart}, cod_tar: ${item.cod_tar}, tipo: ${typeof item.cod_tar}`);
});
```

### Verificar constante de validación

```javascript
// Esto mostrará [12, 1112, 111]
console.log('Códigos permitidos:', [12, 1112, 111]);
```

---

## 📊 TABLA DE RESULTADOS

Completa esta tabla durante el testing:

| Test | Descripción | Resultado Real | Estado | Notas |
|------|-------------|----------------|--------|-------|
| 1 | Efectivo Ajuste STRING | | ☐ | |
| 2 | Cuenta Corriente STRING | | ☐ | |
| 3 | Transferencia Ajuste STRING | | ☐ | |
| 4 | Efectivo Normal STRING (bloquear) | | ☐ | |
| 5 | Regresión NUMBER permitido | | ☐ | |
| 6 | Regresión NUMBER bloqueado | | ☐ | |
| 7 | Mix STRING + NUMBER | | ☐ | |

**Leyenda**: ✅ = Pasó | ❌ = Falló | ⚠️ = Parcial

---

## ✅ CRITERIOS DE ÉXITO

El fix se considera **EXITOSO** si:

1. ✅ Tests 1, 2, 3 PERMITEN generar presupuestos
2. ❌ Test 4 BLOQUEA correctamente
3. ✅ Tests 5, 6 no muestran regresión
4. ✅ Test 7 funciona con mix de tipos
5. ✅ No hay errores en consola
6. ✅ Mensajes son claros y precisos

---

## 🚨 QUÉ HACER SI FALLA UN TEST

### Si Test 1, 2 o 3 falla (debería PERMITIR pero BLOQUEA):

**Posible Causa**: cod_tar tiene un formato inesperado

**Acción**:
1. Abrir consola (F12)
2. Ver el valor exacto de cod_tar:
   ```javascript
   let carrito = JSON.parse(sessionStorage.getItem('carrito'));
   console.log('Items:', carrito);
   ```
3. Reportar el tipo y valor exacto
4. Revisar si hay espacios o caracteres especiales: `cod_tar = "12 "` (con espacio)

### Si Test 4 falla (debería BLOQUEAR pero PERMITE):

**Posible Causa**: El código "11" no está siendo detectado correctamente

**Acción**:
1. Verificar que el método de pago sea "EFECTIVO" (normal) y no "EFECTIVO AJUSTE"
2. Confirmar cod_tar = 11 o "11"
3. Revisar consola para ver logs de validación

### Si hay errores en consola:

**Acción**:
1. Capturar screenshot del error
2. Copiar mensaje de error completo
3. Verificar que el fix se aplicó correctamente
4. Reportar el error con detalles

---

## 📝 REPORTE DE RESULTADOS

Al finalizar todos los tests, completar:

**Tests Exitosos**: ___ / 7

**Tests Fallidos**: Lista aquí cuáles fallaron y por qué

**Errores Encontrados**: Describe cualquier error inesperado

**Observaciones**: Cualquier comportamiento extraño o nota adicional

**Conclusión**: ☐ FIX EXITOSO | ☐ REQUIERE AJUSTES

---

## 🎯 SIGUIENTES PASOS DESPUÉS DEL TESTING

### Si TODOS los tests pasan ✅:
- ✅ Fix confirmado como exitoso
- ✅ Documentar en commit
- ✅ Considerar deploy a producción

### Si ALGUNOS tests fallan ⚠️:
- Analizar logs y errores
- Ajustar fix según hallazgos
- Re-testing de casos fallidos

### Si TODOS los tests fallan ❌:
- Revisar que el fix se aplicó correctamente
- Verificar líneas 549-576 del archivo
- Consultar INFORME_FALLO_VALIDACION_PR.md

---

**Última Actualización**: 2025-10-22
**Versión**: 1.0
**Estado**: ✅ LISTO PARA TESTING
