# PLAN DE IMPLEMENTACIÓN SEGURO
## Restricción de Tipos de Pago en Presupuestos

**Objetivo**: Implementar validación para que los presupuestos (PR) solo acepten EFECTIVO AJUSTE (cod 12) y TRANSFERENCIA AJUSTE (cod 1112)

**Archivo a Modificar**: `src/app/components/carrito/carrito.component.ts`

**Tiempo Total Estimado**: 5 horas

---

## 🎯 RESUMEN DE CAMBIOS

### Códigos Permitidos
- ✅ EFECTIVO AJUSTE: `cod_tarj = 12`
- ✅ TRANSFERENCIA AJUSTE: `cod_tarj = 1112`

### Arquitectura de Validación
```
USUARIO INTENTA GENERAR PRESUPUESTO
         ↓
    CAPA 1: tipoDocChange() → Previene cambio a PR si hay items no permitidos
         ↓
    CAPA 2: pendientes() → Valida antes de enviar
         ↓
    CAPA 3: finalizar() → Última defensa antes de backend
         ↓
    BACKEND (sin cambios)
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### FASE 0: Preparación
- [ ] Leer informe completo: `INFORME_RESTRICCION_PRESUPUESTOS_TIPOS_PAGO.md`
- [ ] Hacer backup del archivo: `carrito.component.ts.backup_restriccion_pr`
- [ ] Verificar que la aplicación compile correctamente
- [ ] Crear rama de git (opcional): `feature/restriccion-presupuestos-tipos-pago`

### FASE 1: Agregar Constantes
- [ ] Implementar constantes en línea 59 (después de `subtotalesPorTipoPago`)
- [ ] Agregar método auxiliar de validación
- [ ] Compilar y verificar que no hay errores

### FASE 2: Implementar CAPA 1
- [ ] Modificar método `tipoDocChange` (línea 275)
- [ ] Agregar validación al caso `else if (this.tipoDoc == "PR")`
- [ ] Compilar y probar escenario 4 (cambio a PR con items no permitidos)

### FASE 3: Implementar CAPA 2
- [ ] Modificar método `pendientes` (línea 945)
- [ ] Agregar validación específica para PR
- [ ] Compilar y probar escenario 7

### FASE 4: Implementar CAPA 3
- [ ] Modificar método `finalizar` (línea 509)
- [ ] Agregar validación final
- [ ] Compilar y verificar sintaxis

### FASE 5: Testing Completo
- [ ] Ejecutar Prueba 1: PR solo con efectivo ajuste (válido)
- [ ] Ejecutar Prueba 2: PR solo con transferencia ajuste (válido)
- [ ] Ejecutar Prueba 3: PR con ambos métodos (válido)
- [ ] Ejecutar Prueba 4: Intento con efectivo normal (inválido)
- [ ] Ejecutar Prueba 5: Intento con tarjeta crédito (inválido)
- [ ] Ejecutar Prueba 6: Métodos mixtos con uno no permitido (inválido)
- [ ] Ejecutar Prueba 7: Validación en pendientes()
- [ ] Ejecutar Prueba 8: Validación final

### FASE 6: Testing de Regresión
- [ ] Verificar que Facturas (FC) funcionan correctamente
- [ ] Verificar Notas de Crédito (NC)
- [ ] Verificar Notas de Débito (ND)
- [ ] Verificar Consultas (CS)

### FASE 7: Deploy
- [ ] Commit de cambios con mensaje descriptivo
- [ ] Deploy a ambiente de testing (si existe)
- [ ] Comunicar a usuarios el cambio
- [ ] Deploy a producción
- [ ] Monitorear logs por 24 horas

---

## 📝 IMPLEMENTACIÓN PASO A PASO

### PASO 1: Backup y Preparación (5 minutos)

```bash
# Desde la carpeta del proyecto
cd C:/Users/Telemetria/T49E2PT/angular/motoapp

# Backup del archivo
cp src/app/components/carrito/carrito.component.ts src/app/components/carrito/carrito.component.ts.backup_restriccion_pr

# Verificar que compile
npm run build
```

### PASO 2: Agregar Constantes (10 minutos)

**Ubicación**: Después de línea 58 (después de `public subtotalesPorTipoPago`)

```typescript
// ====================================================================
// RESTRICCIÓN DE PRESUPUESTOS: Solo EFECTIVO AJUSTE y TRANSFERENCIA AJUSTE
// Fecha: 2025-10-22
// Ver: INFORME_RESTRICCION_PRESUPUESTOS_TIPOS_PAGO.md
// ====================================================================
private readonly PRESUPUESTO_COD_TARJ_PERMITIDOS: number[] = [12, 1112];
```

**Compilar y verificar**:
```bash
ng build --configuration development
```

### PASO 3: Agregar Método Auxiliar (15 minutos)

**Ubicación**: Antes del método `finalizar()` (alrededor de línea 500)

```typescript
/**
 * Valida que todos los items del carrito tengan métodos de pago permitidos para presupuestos
 * @returns Objeto con items no permitidos y nombres de métodos problemáticos
 */
private validarMetodosPagoPresupuesto(): { items: any[], metodosNoPermitidos: string[] } {
  const itemsNoPermitidos = this.itemsEnCarrito.filter(item =>
    !this.PRESUPUESTO_COD_TARJ_PERMITIDOS.includes(item.cod_tar)
  );

  const metodosProblematicos = itemsNoPermitidos
    .map(item => {
      const tarjeta = this.tarjetas.find(t => t.cod_tarj === item.cod_tar);
      return tarjeta ? tarjeta.tarjeta : `Código ${item.cod_tar}`;
    })
    .filter((v, i, a) => a.indexOf(v) === i); // Eliminar duplicados

  return {
    items: itemsNoPermitidos,
    metodosNoPermitidos: metodosProblematicos
  };
}
```

**Compilar**:
```bash
ng build --configuration development
```

### PASO 4: Implementar CAPA 1 - tipoDocChange (30 minutos)

**Ubicación**: Línea 275 (método `tipoDocChange`)

**REEMPLAZAR**:
```typescript
else if (this.tipoDoc == "PR") {
  this.inputOPFlag = false;
  this.puntoVenta_flag = false;
  // Para presupuestos, también usar el punto de venta de la sucursal
  this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
  this.letras_flag = false;
}
```

**POR**:
```typescript
else if (this.tipoDoc == "PR") {
  // ✅ VALIDACIÓN CAPA 1: Verificar métodos de pago permitidos para presupuestos
  const validacion = this.validarMetodosPagoPresupuesto();

  if (validacion.items.length > 0) {
    const metodosTexto = validacion.metodosNoPermitidos.join(', ');

    Swal.fire({
      icon: 'warning',
      title: 'Restricción de Presupuestos',
      html: `
        <p>Los presupuestos <strong>SOLO</strong> pueden generarse con los siguientes métodos de pago:</p>
        <ul style="text-align: left; margin: 10px 0;">
          <li><strong>EFECTIVO AJUSTE</strong></li>
          <li><strong>TRANSFERENCIA AJUSTE</strong></li>
        </ul>
        <p style="margin-top: 10px;">Actualmente hay <strong>${validacion.items.length} artículo(s)</strong> con otros métodos de pago:</p>
        <p style="color: #dc3545;"><em>${metodosTexto}</em></p>
      `,
      footer: 'Por favor, modifique los artículos del carrito para usar solo los métodos permitidos.',
      confirmButtonText: 'Entendido'
    });

    // Revertir el cambio de tipo de documento
    this.tipoDoc = "FC";
    return; // Detener ejecución
  }

  // Si la validación pasa, configurar presupuesto normalmente
  this.inputOPFlag = false;
  this.puntoVenta_flag = false;
  this.puntoventa = parseInt(this.sucursal) || parseInt(sessionStorage.getItem('sucursal') || '0');
  this.letras_flag = false;
}
```

**Compilar y probar**:
```bash
ng build --configuration development
ng serve
```

**Prueba manual**:
1. Agregar items con cod_tar = 11 (efectivo normal)
2. Intentar cambiar a tipo "PR"
3. Debe aparecer alerta y no permitir el cambio

### PASO 5: Implementar CAPA 2 - pendientes (20 minutos)

**Ubicación**: Línea 945 (método `pendientes`)

**BUSCAR**:
```typescript
else if (this.tipoDoc == "PR" || this.tipoDoc == "CS") {
  if (!this.vendedoresV) {
    missingFields.push('Vendedor');
  }
}
```

**REEMPLAZAR POR**:
```typescript
else if (this.tipoDoc == "PR" || this.tipoDoc == "CS") {
  if (!this.vendedoresV) {
    missingFields.push('Vendedor');
  }

  // ✅ VALIDACIÓN CAPA 2: Verificar métodos de pago para presupuestos
  if (this.tipoDoc == "PR") {
    const validacion = this.validarMetodosPagoPresupuesto();

    if (validacion.items.length > 0) {
      const listaArticulos = validacion.items
        .map(item => `"${item.nomart}"`)
        .join(', ');

      Swal.fire({
        icon: 'error',
        title: 'Error de Validación - Presupuestos',
        html: `
          <p>Los presupuestos <strong>SOLO</strong> pueden tener artículos con los siguientes métodos de pago:</p>
          <ul style="text-align: left; margin: 10px 0;">
            <li>EFECTIVO AJUSTE</li>
            <li>TRANSFERENCIA AJUSTE</li>
          </ul>
          <p style="margin-top: 10px;">Artículos con métodos no permitidos:</p>
          <p style="color: #dc3545; font-size: 12px;"><em>${listaArticulos}</em></p>
        `,
        footer: `Total de artículos afectados: ${validacion.items.length}`
      });
      return false;
    }
  }
}
```

**Compilar**:
```bash
ng build --configuration development
```

### PASO 6: Implementar CAPA 3 - finalizar (20 minutos)

**Ubicación**: Línea 509 (inicio del método `finalizar()`)

**BUSCAR**:
```typescript
async finalizar() {
  if (this.itemsEnCarrito.length > 0) {//hacer si
    console.log(this.puntoventa);
    if (this.pendientes()) {
```

**REEMPLAZAR POR**:
```typescript
async finalizar() {
  if (this.itemsEnCarrito.length > 0) {//hacer si

    // ✅ VALIDACIÓN CAPA 3 (FINAL): Presupuestos solo con métodos permitidos
    if (this.tipoDoc === "PR") {
      const validacion = this.validarMetodosPagoPresupuesto();

      if (validacion.items.length > 0) {
        console.error('❌ VALIDACIÓN FINAL FALLIDA: Items con métodos no permitidos en PR:', validacion.items);

        Swal.fire({
          icon: 'error',
          title: 'No se puede generar el presupuesto',
          text: 'Los presupuestos solo pueden tener artículos con EFECTIVO AJUSTE o TRANSFERENCIA AJUSTE como método de pago.',
          footer: `${validacion.items.length} artículo(s) tienen métodos de pago no permitidos.`,
          confirmButtonText: 'Aceptar'
        });
        return; // Detener procesamiento
      }

      // Log de validación exitosa
      console.log('✅ VALIDACIÓN PR: Todos los items tienen métodos de pago permitidos (cod_tar: 12 o 1112)');
    }

    console.log(this.puntoventa);
    if (this.pendientes()) {
```

**Compilar**:
```bash
ng build --configuration development
```

---

## 🧪 GUÍA DE TESTING

### Pruebas de Validación Exitosa (Casos Válidos)

#### Prueba 1: Solo Efectivo Ajuste ✅
```
PREPARACIÓN:
1. Iniciar la aplicación: ng serve
2. Navegar a /articulos
3. Seleccionar cliente

PASOS:
1. Agregar 3 artículos al carrito
2. Para cada artículo, seleccionar "EFECTIVO AJUSTE" como método de pago
3. Ir a carrito
4. Seleccionar tipo documento = "PR"
5. Completar vendedor y otros campos
6. Hacer clic en Finalizar

RESULTADO ESPERADO:
✅ No debe aparecer ningún error
✅ Presupuesto se genera correctamente
✅ PDF se descarga con título "PRESUPUESTO"

VERIFICAR EN CONSOLA:
✅ Mensaje: "VALIDACIÓN PR: Todos los items tienen métodos de pago permitidos"
```

#### Prueba 2: Solo Transferencia Ajuste ✅
```
PASOS:
1. Agregar 2 artículos al carrito
2. Seleccionar "TRANSFERENCIA AJUSTE" para ambos
3. Cambiar a tipo "PR"
4. Finalizar

RESULTADO ESPERADO:
✅ Presupuesto se genera sin errores
```

#### Prueba 3: Combinación de Ambos Métodos Permitidos ✅
```
PASOS:
1. Agregar 2 artículos con "EFECTIVO AJUSTE"
2. Agregar 2 artículos con "TRANSFERENCIA AJUSTE"
3. Cambiar a tipo "PR"
4. Finalizar

RESULTADO ESPERADO:
✅ Sistema acepta la combinación
✅ Subtotales por tipo de pago se muestran correctamente en PDF
✅ Total suma correctamente
```

### Pruebas de Validación Fallida (Casos Inválidos)

#### Prueba 4: Intento con Efectivo Normal ❌
```
PASOS:
1. Agregar 3 artículos con "EFECTIVO" (normal, no ajuste)
2. Intentar cambiar tipo documento a "PR"

RESULTADO ESPERADO:
❌ SweetAlert aparece con título "Restricción de Presupuestos"
❌ Mensaje indica que solo EFECTIVO AJUSTE y TRANSFERENCIA AJUSTE están permitidos
❌ Indica cantidad de artículos con problema: "3 artículo(s)"
❌ Tipo documento permanece en "FC"
❌ No permite cambiar a "PR"

VERIFICAR:
- SweetAlert tiene icono de warning (⚠️)
- Botón dice "Entendido"
- Después de cerrar alerta, tipoDoc sigue siendo "FC"
```

#### Prueba 5: Intento con Tarjeta de Crédito ❌
```
PASOS:
1. Agregar artículos con método "TARJETA DE CREDITO"
2. Intentar cambiar a "PR"

RESULTADO ESPERADO:
❌ Error inmediato
❌ Mensaje indica "Tarjeta de Credito" en la lista de métodos problemáticos
```

#### Prueba 6: Métodos Mixtos con Uno No Permitido ❌
```
PASOS:
1. Agregar 2 artículos con "EFECTIVO AJUSTE" ✓
2. Agregar 1 artículo con "CUENTA CORRIENTE" ✗
3. Agregar 1 artículo con "TRANSFERENCIA AJUSTE" ✓
4. Intentar cambiar a "PR"

RESULTADO ESPERADO:
❌ Sistema detecta el item con "CUENTA CORRIENTE"
❌ Mensaje indica "1 artículo(s)" con problema
❌ Lista específica: "Cuenta Corriente"
❌ No permite cambiar a "PR"

CRÍTICO:
- Debe detectar items individuales problemáticos
- No debe importar que otros items sean válidos
```

#### Prueba 7: Bypass de CAPA 1 (Testing CAPA 2) ❌
```
PREPARACIÓN:
Temporalmente comentar validación en tipoDocChange para probar CAPA 2

PASOS:
1. Forzar this.tipoDoc = "PR" manualmente
2. Tener items con cod_tar no permitido
3. Intentar finalizar

RESULTADO ESPERADO:
❌ Método pendientes() detecta el problema
❌ Muestra error con lista de artículos problemáticos
❌ No continúa al backend
```

#### Prueba 8: Bypass de CAPAS 1 y 2 (Testing CAPA 3) ❌
```
PREPARACIÓN:
Temporalmente comentar validaciones en tipoDocChange y pendientes

PASOS:
1. Forzar this.tipoDoc = "PR"
2. Items con cod_tar no permitidos
3. Ejecutar finalizar()

RESULTADO ESPERADO:
❌ Validación final detecta problema
❌ Console.error registra: "VALIDACIÓN FINAL FALLIDA"
❌ SweetAlert con título "No se puede generar el presupuesto"
❌ No llega al backend

VERIFICAR EN CONSOLA:
console.error debe mostrar array de items problemáticos
```

### Pruebas de Regresión

#### Regresión 1: Facturas Normales (FC)
```
PASOS:
1. Agregar artículos con cualquier método de pago (efectivo, tarjeta, etc.)
2. Mantener tipo documento = "FC"
3. Finalizar

RESULTADO ESPERADO:
✅ Factura se genera normalmente
✅ No debe aparecer ninguna validación de métodos
✅ Funcionalidad original intacta
```

#### Regresión 2: Notas de Crédito (NC)
```
PASOS:
1. Generar nota de crédito con cualquier método
2. Verificar que funciona

RESULTADO ESPERADO:
✅ Sin cambios en comportamiento
```

#### Regresión 3: Consultas (CS)
```
PASOS:
1. Generar consulta
2. Verificar funcionamiento

RESULTADO ESPERADO:
✅ Funcionalidad normal
```

---

## 📊 CHECKLIST DE VALIDACIÓN POST-DEPLOY

### Día 1 (Primeras 24 horas)
- [ ] Monitorear logs de errores
- [ ] Verificar que no hayan caído presupuestos válidos
- [ ] Recopilar feedback inicial de usuarios
- [ ] Verificar métricas: presupuestos generados vs rechazados

### Semana 1
- [ ] Ejecutar consulta SQL para verificar que no haya presupuestos con métodos no permitidos
- [ ] Revisar tickets de soporte relacionados
- [ ] Documentar casos edge que aparezcan

### Consulta SQL de Verificación
```sql
-- Presupuestos generados después de la implementación con métodos no permitidos
SELECT
  p.numerocomprobante,
  p.tipodoc,
  p.cod_tar,
  t.tarjeta,
  p.nomart,
  p.fechacheque as fecha_creacion
FROM psucursal1 p
LEFT JOIN tarjcredito t ON p.cod_tar = t.cod_tarj
WHERE p.tipodoc = 'PR'
  AND p.fechacheque >= '2025-10-22'  -- Fecha de implementación
  AND p.cod_tar NOT IN (12, 1112)
ORDER BY p.fechacheque DESC;
```

**Resultado esperado**: 0 filas

---

## ⚠️ ROLLBACK PLAN

Si algo sale mal después del deploy:

### Rollback Rápido (5 minutos)
```bash
# Restaurar backup
cp src/app/components/carrito/carrito.component.ts.backup_restriccion_pr src/app/components/carrito/carrito.component.ts

# Recompilar
ng build --configuration development

# Reiniciar servidor (si es necesario)
```

### Verificar Rollback
```bash
# Compilar
ng build

# Verificar que no hay errores de compilación
# Probar que presupuestos se generan sin validación
```

---

## 📞 CONTACTOS Y RECURSOS

### Documentación
- **Informe Completo**: `INFORME_RESTRICCION_PRESUPUESTOS_TIPOS_PAGO.md`
- **CLAUDE.md**: Instrucciones generales del proyecto

### Archivos Clave
- **Componente**: `src/app/components/carrito/carrito.component.ts`
- **Backup**: `src/app/components/carrito/carrito.component.ts.backup_restriccion_pr`
- **Referencia**: `src/app/components/cabeceras/cabeceras.component.ts`

### Códigos Importantes
- EFECTIVO AJUSTE: `12`
- TRANSFERENCIA AJUSTE: `1112`

---

## ✅ CRITERIOS DE ÉXITO

La implementación se considera exitosa si:

1. ✅ Presupuestos con cod_tar 12 y/o 1112 se generan correctamente
2. ✅ Presupuestos con otros cod_tar son rechazados en TODAS las capas
3. ✅ Mensajes de error son claros y específicos
4. ✅ Facturas, NC, ND, CS siguen funcionando normalmente
5. ✅ No hay errores de compilación
6. ✅ No hay errores en consola del navegador
7. ✅ Testing manual de las 8 pruebas pasa exitosamente
8. ✅ Consulta SQL post-deploy retorna 0 presupuestos con métodos no permitidos

---

**Última Actualización**: 2025-10-22
**Versión del Plan**: 1.0
**Estado**: ✅ LISTO PARA IMPLEMENTAR
