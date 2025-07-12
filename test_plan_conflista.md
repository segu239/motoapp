# Plan de Testing - UpdateConflista

## Casos de Prueba Exitosos

### TC01: Actualización Normal
**Descripción**: Actualizar conflista con precios válidos y verificar que los productos se actualizan correctamente.
- **Entrada**: Conflista válida con preciof21=15, preciof105=10
- **Esperado**: Todos los productos se actualizan correctamente
- **Validación**: Verificar que affected_rows > 0 y que los precios se calculan correctamente

### TC02: Solo IVA 21%
**Descripción**: Actualizar solo productos con IVA 21% modificando únicamente preciof21.
- **Entrada**: recalcular_21=true, recalcular_105=false
- **Esperado**: Solo productos IVA 21% se actualizan
- **Validación**: productos_actualizados_105 = 0, productos_actualizados_21 > 0

### TC03: Solo IVA 10.5%
**Descripción**: Actualizar solo productos con IVA 10.5% modificando únicamente preciof105.
- **Entrada**: recalcular_21=false, recalcular_105=true
- **Esperado**: Solo productos IVA 10.5% se actualizan
- **Validación**: productos_actualizados_21 = 0, productos_actualizados_105 > 0

### TC04: Actualización sin Cambios de Precios
**Descripción**: Actualizar conflista sin modificar precios.
- **Entrada**: Mismos valores de preciof21 y preciof105
- **Esperado**: Solo se actualiza conf_lista, sin recálculos
- **Validación**: productos_actualizados_21 = 0, productos_actualizados_105 = 0

## Casos de Prueba de Error

### TC05: Lista de Precios Inválida
**Descripción**: Enviar lista de precios fuera del rango válido.
- **Entrada**: listap='5'
- **Esperado**: Error de validación, rollback ejecutado
- **Validación**: Verificar que conf_lista no se modificó, response.error = true

### TC06: ID Conflista Inexistente
**Descripción**: Intentar actualizar conflista con ID que no existe.
- **Entrada**: id_conflista=99999
- **Esperado**: Warning, rollback ejecutado
- **Validación**: affected_rows = 0 para conf_lista, warning en debug

### TC07: Precio Extremo
**Descripción**: Enviar precio fuera del rango típico pero válido.
- **Entrada**: preciof21=999999
- **Esperado**: Warning sobre precio extremo, pero procesamiento exitoso
- **Validación**: Verificar que el cálculo no cause overflow, warning en debug

### TC08: Tipo Moneda Inexistente
**Descripción**: Usar tipo de moneda que no existe en la base de datos.
- **Entrada**: tipomone=999
- **Esperado**: Warning sobre productos no encontrados
- **Validación**: productos_actualizados_21 = 0, productos_actualizados_105 = 0

### TC09: Datos Faltantes
**Descripción**: Enviar datos con campos obligatorios faltantes.
- **Entrada**: Sin id_conflista, listap, o tipomone
- **Esperado**: Error de validación inmediato
- **Validación**: response.error = true, mensaje de validación específico

### TC10: Precios No Numéricos
**Descripción**: Enviar valores no numéricos en campos de precio.
- **Entrada**: preciof21='abc', preciof105='xyz'
- **Esperado**: Error de validación
- **Validación**: response.error = true, mensaje sobre campos numéricos

## Casos de Prueba de Concurrencia

### TC11: Actualización Simultánea
**Descripción**: Dos usuarios actualizan la misma conflista simultáneamente.
- **Entrada**: Dos requests concurrentes para el mismo id_conflista
- **Esperado**: Una transacción exitosa, posible conflicto en la segunda
- **Validación**: Verificar integridad de datos, no hay estado intermedio

### TC12: Modificación Durante Procesamiento
**Descripción**: Modificar artsucursal mientras se ejecuta UPDATE.
- **Entrada**: Modificar productos mientras se procesa recálculo
- **Esperado**: Transacción se completa o falla atómicamente
- **Validación**: No hay estado intermedio inconsistente

## Casos de Prueba de Performance

### TC13: Actualización Masiva
**Descripción**: Actualizar conflista que afecta gran cantidad de productos.
- **Entrada**: Conflista con muchos productos (>10000)
- **Esperado**: Procesamiento exitoso dentro del tiempo límite
- **Validación**: Tiempo de respuesta < 30 segundos, todos los productos actualizados

### TC14: Múltiples Transacciones
**Descripción**: Ejecutar múltiples actualizaciones de conflista seguidas.
- **Entrada**: 5 actualizaciones consecutivas de diferentes conflistas
- **Esperado**: Todas se procesan exitosamente
- **Validación**: Sin bloqueos, todas las transacciones completas

## Casos de Prueba de Integridad

### TC15: Verificación de Rollback
**Descripción**: Forzar error durante procesamiento para verificar rollback.
- **Entrada**: Datos que causen error en segunda operación
- **Esperado**: Rollback completo, estado original restaurado
- **Validación**: Verificar que conf_lista y artsucursal están sin cambios

### TC16: Consistencia de Precios
**Descripción**: Verificar que los precios calculados son correctos.
- **Entrada**: Datos con precios conocidos
- **Esperado**: Precios calculados matemáticamente correctos
- **Validación**: Verificar fórmula: nuevo_precio = precon * (1 + (porcentaje / 100))

## Casos de Prueba del Sistema de Debug

### TC17: Información de Debug Completa
**Descripción**: Verificar que el sistema de debug proporciona información completa.
- **Entrada**: Cualquier actualización válida
- **Esperado**: response.debug con toda la información necesaria
- **Validación**: Verificar presencia de timestamps, operaciones, validaciones

### TC18: Debug en Caso de Error
**Descripción**: Verificar información de debug cuando hay errores.
- **Entrada**: Datos inválidos
- **Esperado**: response.debug con errores detallados
- **Validación**: Verificar errores específicos, trace de error, rollback_ejecutado

## Casos de Prueba Frontend

### TC19: Validación Frontend
**Descripción**: Verificar que las validaciones frontend funcionan correctamente.
- **Entrada**: Datos inválidos en formulario
- **Esperado**: Error mostrado sin envío al backend
- **Validación**: Verificar que no se hace llamada HTTP

### TC20: Manejo de Respuestas de Error
**Descripción**: Verificar que el frontend maneja correctamente errores del backend.
- **Entrada**: Respuesta de error del backend
- **Esperado**: Mensaje de error detallado mostrado al usuario
- **Validación**: Verificar que se muestra información de rollback si aplica

### TC21: Manejo de Respuestas Exitosas
**Descripción**: Verificar que el frontend maneja correctamente respuestas exitosas.
- **Entrada**: Respuesta exitosa del backend
- **Esperado**: Mensaje de éxito con detalles de productos actualizados
- **Validación**: Verificar navegación a lista de conflistas

## Preparación del Ambiente de Testing

### Datos de Prueba Requeridos

1. **Conflista de Prueba**: 
   - ID: 1
   - listap: '1'
   - tipomone: '1'
   - preciof21: 15.0
   - preciof105: 10.0

2. **Productos de Prueba**:
   - Al menos 10 productos con IVA 21%
   - Al menos 10 productos con IVA 10.5%
   - Productos con precio de costo > 0
   - Productos con idart = 0

3. **Configuración Base de Datos**:
   - Tabla artiva con registros para alícuotas 21.00 y 10.50
   - Tabla artsucursal con productos de prueba
   - Tabla conf_lista con conflista de prueba

### Scripts de Verificación

#### Verificar Productos Actualizados IVA 21%
```sql
SELECT 
    a.cd_articulo,
    a.nomart,
    a.precon,
    a.prefi1 as precio_actual,
    ROUND(a.precon * 1.15, 4) as precio_esperado,
    CASE 
        WHEN ABS(a.prefi1 - ROUND(a.precon * 1.15, 4)) < 0.01 THEN 'OK'
        ELSE 'ERROR'
    END as estado
FROM artsucursal a
JOIN artiva ai ON a.cod_iva = ai.cod_iva
WHERE ai.alicuota1 = 21.00
  AND a.tipo_moneda = 1
  AND a.idart = 0
  AND a.precon > 0
ORDER BY a.cd_articulo
LIMIT 10;
```

#### Verificar Productos Actualizados IVA 10.5%
```sql
SELECT 
    a.cd_articulo,
    a.nomart,
    a.precon,
    a.prefi1 as precio_actual,
    ROUND(a.precon * 1.10, 4) as precio_esperado,
    CASE 
        WHEN ABS(a.prefi1 - ROUND(a.precon * 1.10, 4)) < 0.01 THEN 'OK'
        ELSE 'ERROR'
    END as estado
FROM artsucursal a
JOIN artiva ai ON a.cod_iva = ai.cod_iva
WHERE ai.alicuota1 = 10.50
  AND a.tipo_moneda = 1
  AND a.idart = 0
  AND a.precon > 0
ORDER BY a.cd_articulo
LIMIT 10;
```

#### Verificar Estado de Conflista
```sql
SELECT 
    id_conflista,
    listap,
    preciof21,
    preciof105,
    tipomone,
    fecha,
    activa
FROM conf_lista 
WHERE id_conflista = 1;
```

## Criterios de Aceptación

### Funcionalidad
- ✅ Todas las actualizaciones exitosas deben completarse sin errores
- ✅ Todos los casos de error deben manejarse correctamente con rollback
- ✅ El sistema de debug debe proporcionar información completa
- ✅ Las validaciones frontend deben prevenir envíos inválidos

### Performance
- ✅ Actualizaciones deben completarse en menos de 30 segundos
- ✅ No debe haber bloqueos de base de datos
- ✅ Memoria del servidor no debe aumentar significativamente

### Integridad
- ✅ Todos los rollbacks deben restaurar el estado original
- ✅ Los cálculos de precios deben ser matemáticamente correctos
- ✅ No debe haber estados intermedios inconsistentes

### Usabilidad
- ✅ Los mensajes de error deben ser claros y específicos
- ✅ Los mensajes de éxito deben mostrar información útil
- ✅ El sistema de debug debe ser fácil de interpretar

## Checklist de Ejecución

### Pre-Testing
- [ ] Backup de base de datos realizado
- [ ] Ambiente de testing configurado
- [ ] Datos de prueba creados
- [ ] Scripts de verificación preparados

### Ejecución de Casos de Prueba
- [ ] TC01-TC04: Casos exitosos ejecutados
- [ ] TC05-TC10: Casos de error ejecutados
- [ ] TC11-TC12: Casos de concurrencia ejecutados
- [ ] TC13-TC14: Casos de performance ejecutados
- [ ] TC15-TC16: Casos de integridad ejecutados
- [ ] TC17-TC18: Casos de debug ejecutados
- [ ] TC19-TC21: Casos de frontend ejecutados

### Post-Testing
- [ ] Todos los casos de prueba documentados
- [ ] Errores encontrados reportados
- [ ] Base de datos restaurada
- [ ] Reporte de testing completado

## Reporte de Resultados

### Formato del Reporte
```
# Reporte de Testing - UpdateConflista
Fecha: [FECHA]
Ejecutado por: [NOMBRE]
Ambiente: [DESARROLLO/STAGING/PRODUCCIÓN]

## Resumen
- Total casos ejecutados: [NÚMERO]
- Casos exitosos: [NÚMERO]
- Casos fallidos: [NÚMERO]
- Casos bloqueados: [NÚMERO]

## Casos Fallidos
[Lista de casos que fallaron con descripción del problema]

## Recomendaciones
[Recomendaciones para resolver problemas encontrados]
```

---

**Nota**: Este plan de testing debe ejecutarse completamente antes de desplegar en producción. Cualquier caso fallido debe ser resuelto y re-testeado antes de continuar con el despliegue.