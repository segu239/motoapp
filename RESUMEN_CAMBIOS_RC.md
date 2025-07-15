# Resumen de Cambios - Filtrado de Registros RC

## Problema Original
Los pagos de saldos pendientes desde el módulo `/cabeceras` generan registros RC (Recibos) que se almacenan en la tabla `factcabx`, pero estos registros no deberían aparecer en consultas de facturación ya que son recibos, no facturas.

## Solución Implementada
Se implementó un **sistema de filtrado a nivel de consulta** que excluye los registros RC de los reportes y consultas de facturación, manteniendo la integridad referencial.

## Cambios Realizados

### 1. Nuevas Funciones Helper en Descarga.php.txt

Se agregaron dos funciones helper para el filtrado consistente:

```php
/**
 * FILTRO PARA EXCLUIR RECIBOS RC DE CONSULTAS DE FACTURAS
 * 
 * Los recibos RC se almacenan en factcab por dependencias técnicas,
 * pero deben filtrarse en reportes y consultas de facturación.
 * 
 * @param string $tabla_alias Alias de la tabla (ej: 'f', 'factcab')
 */
private function aplicarFiltroSinRC($tabla_alias = '') {
    $prefix = $tabla_alias ? $tabla_alias . '.' : '';
    $this->db->where($prefix . 'tipo !=', 'RC');
}

/**
 * FILTRO PARA INCLUIR SOLO RECIBOS RC
 * 
 * Para consultas específicas de recibos RC
 * 
 * @param string $tabla_alias Alias de la tabla (ej: 'f', 'factcab')
 */
private function aplicarFiltroSoloRC($tabla_alias = '') {
    $prefix = $tabla_alias ? $tabla_alias . '.' : '';
    $this->db->where($prefix . 'tipo', 'RC');
}
```

### 2. Funciones Modificadas en Descarga.php.txt

#### 2.1 historialventas2xcli_get()
- **Línea ~3696**: Agregado `$this->aplicarFiltroSinRC('f');`
- **Propósito**: Excluye RC del historial de ventas por cliente

#### 2.2 construirSubConsultaGlobalManual()
- **Línea ~4238**: Agregado `AND tipo != 'RC'` en WHERE clause
- **Propósito**: Excluye RC de la vista global de historial de ventas

### 3. Funciones Modificadas en Carga.php.txt

#### 3.1 cabecerax_post()
- **Línea ~319**: Agregado `$this->aplicarFiltroSinRC();`
- **Propósito**: Excluye RC de la consulta de cabeceras con saldo

#### 3.2 CabecerasucNombreTarj_post()
- **Línea ~358**: Agregado `$this->aplicarFiltroSinRC($tabla);`
- **Propósito**: Excluye RC de consultas de cabeceras con información de tarjeta

#### 3.3 cabecera_post()
- **Línea ~442**: Agregado `$this->aplicarFiltroSinRC();`
- **Propósito**: Excluye RC de consultas generales de cabeceras

## Funciones que NO se Modificaron

### Funciones de Inserción
- `PedidossucxappCompleto_post()`: Sigue insertando RC en factcab (correcto)
- Funciones que insertan datos mantienen su comportamiento original

### Funciones de Consulta Específica
- `obtenerDatosRecibo2()`: Accede a registros específicos por ID
- `obtenerDatosExpandidos()`: Accede a registros específicos por ID

## Impacto en el Sistema

### ✅ Lo que Funciona Correctamente
- **Inserción de RC**: Los recibos RC se siguen insertando en factcab para mantener las referencias
- **Referencias Intactas**: 
  - `recibos.id_fac` → `factcab.id_num`
  - `caja_movi.num_operacion` → `factcab.id_num`
  - `psucursal.id_num` → `factcab.id_num`
- **Consultas de Facturación**: Ya no muestran registros RC
- **Historial de Ventas**: Limpio de registros RC

### ✅ Frontend sin Cambios
- Los servicios Angular llaman a los endpoints del backend que ya tienen el filtro aplicado
- No se requieren cambios en el frontend
- La experiencia del usuario mejora automáticamente

## Verificación de la Implementación

### Script de Prueba
Se creó `test_filtro_rc.sql` para verificar:
1. Que los registros RC no aparecen en consultas de facturación
2. Que los registros RC siguen existiendo para mantener referencias
3. Que la integridad referencial se mantiene

### Resultados Esperados
- **Consultas de Historial**: 0 registros RC
- **Consultas de Cabeceras**: 0 registros RC
- **Tabla factcab**: Registros RC siguen existiendo
- **Referencias**: Todas las referencias siguen funcionando

## Beneficios de esta Solución

1. **Simplicidad**: No requiere cambios estructurales en la base de datos
2. **Seguridad**: Mantiene todas las referencias existentes
3. **Reversibilidad**: Fácil de revertir si es necesario
4. **Consistencia**: Uso de funciones helper para filtrado uniforme
5. **Rendimiento**: Filtrado eficiente a nivel de consulta SQL

## Archivos Modificados

1. `/src/Descarga.php.txt` - Funciones helper y filtros en consultas
2. `/src/Carga.php.txt` - Filtros en consultas de cabeceras
3. `/test_filtro_rc.sql` - Script de verificación (nuevo)
4. `/RESUMEN_CAMBIOS_RC.md` - Esta documentación (nuevo)

## Conclusión

La implementación del filtrado de registros RC es una solución elegante y práctica que resuelve el problema original sin comprometer la integridad del sistema. Los recibos RC ya no aparecen en los reportes de facturación, pero se mantienen todas las dependencias técnicas necesarias para el funcionamiento correcto del sistema.