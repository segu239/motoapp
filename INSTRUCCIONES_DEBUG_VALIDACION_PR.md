# INSTRUCCIONES DE DEBUGGING: Validación Presupuestos

**Fecha**: 2025-10-22
**Objetivo**: Identificar por qué la validación no está bloqueando presupuestos con métodos no permitidos

---

## 🎯 SITUACIÓN ACTUAL

**Problema Reportado**: A pesar de tener validaciones implementadas y binding corregido, el usuario puede crear presupuestos con "EFECTIVO" (cod_tar: 11), lo cual NO debería estar permitido.

**Códigos Permitidos**: Solo 12 (EFECTIVO AJUSTE), 1112 (TRANSFERENCIA AJUSTE), 111 (CUENTA CORRIENTE)

---

## 🔧 LOGS DE DEBUGGING AGREGADOS

He agregado logs extensivos en el método `validarMetodosPagoPresupuesto()` que mostrarán:

1. ✅ Total de items en el carrito
2. ✅ Lista de códigos permitidos
3. ✅ **Para cada item**:
   - Nombre del artículo
   - Valor original de `cod_tar`
   - Tipo de dato de `cod_tar` (string o number)
   - Valor convertido a number
4. ✅ **Para cada validación**:
   - Código original y convertido
   - Si está permitido o no
5. ✅ **Resultado final**:
   - Cantidad de items no permitidos
   - Nombres de los items problemáticos

---

## 📋 INSTRUCCIONES PARA EL USUARIO

### PASO 1: Compilar el Proyecto

```bash
ng build --configuration development
```

**Verificar**: Que compile sin errores

---

### PASO 2: Iniciar la Aplicación

```bash
ng serve
# o
npm start
```

---

### PASO 3: Abrir Consola del Navegador

1. Abrir la aplicación en el navegador
2. Presionar **F12** para abrir DevTools
3. Ir a la pestaña **Console**
4. **IMPORTANTE**: Mantener esta consola abierta durante todo el test

---

### PASO 4: Reproducir el Problema

**Test a Realizar**:

1. Navegar a la sección de artículos/productos
2. **Seleccionar un producto**
3. **Seleccionar método de pago: "EFECTIVO"** (el normal, NO "EFECTIVO AJUSTE")
   - IMPORTANTE: Verificar que dice solo "EFECTIVO" y NO "EFECTIVO AJUSTE"
4. Agregar el producto al carrito
5. Ir al carrito
6. **Intentar cambiar el tipo de documento a "PRESUPUESTO"**

---

### PASO 5: Capturar Logs de la Consola

**Cuando intentes cambiar a "PRESUPUESTO", deberías ver en consola**:

```
═══════════════════════════════════════════════════════
🔍 VALIDACIÓN PRESUPUESTO - INICIO
═══════════════════════════════════════════════════════
📋 Total items en carrito: 1
✅ Códigos PERMITIDOS: [12, 1112, 111]

📦 Item 1: {
  nombre: "...",
  cod_tar_original: ...,
  tipo_cod_tar: "...",
  cod_tar_convertido: ...
}

🔎 Validando item "...": {
  cod_tar: ...,
  codTarNum: ...,
  estaPermitido: ...
}

═══════════════════════════════════════════════════════
📊 RESULTADO DE VALIDACIÓN:
❌ Items NO permitidos: ...
...
═══════════════════════════════════════════════════════
```

---

### PASO 6: Reportar Resultados

**Por favor, copia y pega TODO el log de la consola** que aparece cuando:

1. **Primer momento**: Cuando intentas cambiar a "PRESUPUESTO"
2. **Segundo momento**: Si logras finalizar la venta, cuando haces click en "Finalizar Venta"

---

## 🔍 INFORMACIÓN CRÍTICA A REPORTAR

### Pregunta 1: ¿Apareció el SweetAlert de error?
- [ ] SÍ - Mostró mensaje de error sobre métodos no permitidos
- [ ] NO - No mostró ningún error

### Pregunta 2: ¿Qué pasó con el select de "Operación"?
- [ ] Se quedó en "PRESUPUESTO"
- [ ] Volvió a "FACTURA" automáticamente
- [ ] Otro: _________________

### Pregunta 3: ¿Qué valor tiene cod_tar según los logs?
**Copiar de la consola**:
- cod_tar_original: _________________
- tipo_cod_tar: _________________
- cod_tar_convertido: _________________
- estaPermitido: _________________

### Pregunta 4: ¿Cuántos items NO permitidos reportó?
- Items NO permitidos: _________________

### Pregunta 5: Si pudiste finalizar la venta, ¿qué logs aparecieron?
**Buscar en consola**: `🔍 DEBUG finalizar() - tipoDoc:`

**Copiar el valor**: tipoDoc = _________________

---

## 🎯 ESCENARIOS POSIBLES

### Escenario A: La validación NO se ejecuta
**Síntoma**: No aparecen los logs de validación en consola

**Causa Posible**: El evento `(change)` no se está disparando

**Solución**: Revisar el binding del select

---

### Escenario B: La validación se ejecuta pero cod_tar tiene valor inesperado
**Síntoma**: Los logs muestran cod_tar con un valor diferente a 11

**Causa Posible**: El método de pago no se está guardando correctamente en el carrito

**Solución**: Revisar cómo se agregan items al carrito

---

### Escenario C: La validación se ejecuta y detecta el error, pero el flujo continúa
**Síntoma**:
- Los logs muestran `❌ Items NO permitidos: 1`
- Se muestra SweetAlert
- Pero el select NO se revierte

**Causa Posible**: El binding `[value]="tipoDoc"` no está funcionando

**Solución**: Cambiar a `[(ngModel)]`

---

### Escenario D: cod_tar es null/undefined
**Síntoma**: Los logs muestran `cod_tar_original: undefined` o `null`

**Causa Posible**: Los items del carrito no tienen el campo cod_tar

**Solución**: Verificar cómo se crea el objeto al agregar al carrito

---

### Escenario E: La validación se ejecuta correctamente pero CAPA 3 falla
**Síntoma**:
- CAPA 1 muestra error y revierte
- Pero en `finalizar()`, tipoDoc = "PR" (cuando debería ser "FC")

**Causa Posible**: El tipoDoc se está cambiando de nuevo después de la CAPA 1

**Solución**: Revisar si hay otro lugar donde se modifica tipoDoc

---

## 💡 INFORMACIÓN ADICIONAL ÚTIL

### Ver contenido del carrito en sessionStorage

Abrir consola y ejecutar:

```javascript
// Ver items del carrito
let carrito = JSON.parse(sessionStorage.getItem('carrito'));
console.table(carrito);

// Ver cod_tar de cada item
carrito.forEach(item => {
  console.log(`${item.nomart}: cod_tar = ${item.cod_tar} (${typeof item.cod_tar})`);
});
```

### Verificar lista de tarjetas/métodos de pago

```javascript
// Esto te mostrará todos los métodos de pago disponibles con sus códigos
// (Desde el componente carrito, si está disponible globalmente)
```

---

## 🚨 CASOS DE PRUEBA ADICIONALES (OPCIONAL)

Si tienes tiempo, también puedes probar:

### Test 2: Con método permitido (debe FUNCIONAR)
1. Agregar producto con "EFECTIVO AJUSTE" (cod_tar: 12)
2. Cambiar a "PRESUPUESTO"
3. **Resultado Esperado**: NO debe mostrar error, debe permitir

### Test 3: Con CUENTA CORRIENTE (debe FUNCIONAR)
1. Agregar producto con "CUENTA CORRIENTE" (cod_tar: 111)
2. Cambiar a "PRESUPUESTO"
3. **Resultado Esperado**: NO debe mostrar error, debe permitir

### Test 4: Mix de métodos
1. Agregar 1 producto con "EFECTIVO AJUSTE"
2. Agregar 1 producto con "EFECTIVO" (normal)
3. Cambiar a "PRESUPUESTO"
4. **Resultado Esperado**: Debe bloquear por el item con EFECTIVO normal

---

## 📎 ARCHIVOS MODIFICADOS

**C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\carrito\carrito.component.ts**
- Método `validarMetodosPagoPresupuesto()` (líneas 556-619)
- Agregados logs extensivos de debugging

**C:\Users\Telemetria\T49E2PT\angular\motoapp\src\app\components\carrito\carrito.component.html**
- Select de "Operación" (línea 88)
- Agregado: `[value]="tipoDoc"`

---

## ✅ PRÓXIMOS PASOS DESPUÉS DEL REPORTE

Una vez que tengas los logs de la consola:

1. Copia TODO el output de la consola
2. Responde las 5 preguntas de la sección "INFORMACIÓN CRÍTICA A REPORTAR"
3. Envíamelo todo

Con esa información podré:
- Identificar exactamente dónde está el problema
- Determinar si es un issue con el binding, la validación, o el almacenamiento
- Implementar la solución correcta

---

**Última Actualización**: 2025-10-22
**Estado**: ⏳ **ESPERANDO LOGS DEL USUARIO**
