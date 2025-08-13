# Plan Final - Corrección Error Backend PHP

**Fecha:** 12 de Agosto de 2025  
**Problema:** Error de incompatibilidad de parámetros en función `update_precios_masivo`  
**Solución:** Modificar SOLO el backend PHP - Sin tocar función SQL

## 📋 Resumen Ejecutivo

**Estrategia:** Resolución en **un solo archivo** (Descarga.php) con **mínimo riesgo** y **máximo beneficio**.

### **Ventajas de Esta Solución:**
- ✅ **Sin tocar función SQL** (que ya funciona al 100%)
- ✅ **Solo un archivo a modificar** (menor riesgo)
- ✅ **Mantiene campo id_articulo** (mejora existente)
- ✅ **Mejora auditoría** con descripciones inteligentes
- ✅ **Compatibilidad total** con frontend

## 🚨 Problema Actual

### **Error en Frontend:**
```
ERROR: no existe la función update_precios_masivo(unknown, unknown, unknown, unknown, unknown, integer, integer, unknown, unknown)
```

### **Causa:**
- **Backend envía:** 9 parámetros (incluye `observacion`)
- **Función SQL espera:** 8 parámetros (sin `observacion`)

## 🛠️ Solución Final

### **Modificación Única: Descarga.php**

**Archivo:** `C:\xampp\htdocs\APIAND\application\controllers\Descarga.php`  
**Líneas a modificar:** 4635-4660

#### **ANTES (problemático):**
```php
// Líneas 4642-4643
$observacion = isset($data['observacion']) ? $data['observacion'] : 'Cambio masivo desde aplicación web';
$usuario = isset($data['usuario']) ? $data['usuario'] : 'sistema';

// Líneas 4649-4660
$sql = "SELECT update_precios_masivo(?, ?, ?, ?, ?, ?, ?, ?, ?) as result";
$params = array(
    $marca, 
    $cd_proveedor, 
    $rubro, 
    $cod_iva, 
    $tipo_modificacion,     // Solo 'costo' o 'final' 
    $porcentaje, 
    $sucursal, 
    $observacion,           // ❌ PARÁMETRO EXTRA (causa del error)
    $usuario
);
```

#### **DESPUÉS (corregido):**
```php
// Líneas 4642-4645: Construir descripción inteligente
$observacion = isset($data['observacion']) ? $data['observacion'] : 'Cambio masivo desde aplicación web';
$usuario = isset($data['usuario']) ? $data['usuario'] : 'sistema';

// NUEVA LÓGICA: Construir tipo descriptivo
$tipo_descriptivo = "ACTUALIZACIÓN POR ";

if (!empty($marca)) {
    $tipo_descriptivo .= "MARCA (" . $marca . ") Y ";
} elseif (!empty($rubro)) {
    $tipo_descriptivo .= "RUBRO (" . $rubro . ") Y ";
} elseif (!empty($cd_proveedor)) {
    $tipo_descriptivo .= "PROVEEDOR (" . $cd_proveedor . ") Y ";
} elseif (!empty($cod_iva)) {
    $tipo_descriptivo .= "TIPO IVA (" . $cod_iva . ") Y ";
} else {
    $tipo_descriptivo .= "FILTRO MÚLTIPLE Y ";
}

$tipo_descriptivo .= strtoupper($tipo_modificacion);

// Líneas 4649-4660: Llamada corregida (8 parámetros)
$sql = "SELECT update_precios_masivo(?, ?, ?, ?, ?, ?, ?, ?) as result";
$params = array(
    $marca, 
    $cd_proveedor, 
    $rubro, 
    $cod_iva, 
    $tipo_descriptivo,      // ✅ Descripción inteligente como 'tipo'
    $porcentaje, 
    $sucursal, 
    $usuario                // ✅ Ahora en posición 8 (correcto)
);
```

## 📊 Ejemplos de Descripciones Generadas

| Filtro Frontend | Tipo Precio | Resultado en campo `tipo` de cactualiza |
|-----------------|-------------|------------------------------------------|
| Marca: T-FORCE | costo | `ACTUALIZACIÓN POR MARCA (T-FORCE) Y COSTO` |
| Rubro: MOTOS | final | `ACTUALIZACIÓN POR RUBRO (MOTOS) Y FINAL` |
| Proveedor: 123 | costo | `ACTUALIZACIÓN POR PROVEEDOR (123) Y COSTO` |
| Tipo IVA: 21% | final | `ACTUALIZACIÓN POR TIPO IVA (21) Y FINAL` |

## 🔧 Código Completo de la Modificación

```php
<?php
// =====================================================================
// MODIFICACIÓN COMPLETA EN Descarga.php líneas 4635-4665
// =====================================================================

// Obtener parámetros del request (sin cambios)
$marca = isset($data['marca']) ? $data['marca'] : null;
$cd_proveedor = isset($data['cd_proveedor']) ? intval($data['cd_proveedor']) : null;
$rubro = isset($data['rubro']) ? $data['rubro'] : null;
$cod_iva = isset($data['cod_iva']) ? intval($data['cod_iva']) : null;
$tipo_modificacion = $data['tipo_modificacion']; // 'costo' o 'final'
$porcentaje = floatval($data['porcentaje']);
$sucursal = isset($data['sucursal']) ? intval($data['sucursal']) : 1;
$observacion = isset($data['observacion']) ? $data['observacion'] : 'Cambio masivo desde aplicación web';
$usuario = isset($data['usuario']) ? $data['usuario'] : 'sistema';

// ✅ NUEVA LÓGICA: Construir descripción inteligente
$tipo_descriptivo = "ACTUALIZACIÓN POR ";

if (!empty($marca)) {
    $tipo_descriptivo .= "MARCA (" . trim($marca) . ") Y ";
} elseif (!empty($rubro)) {
    $tipo_descriptivo .= "RUBRO (" . trim($rubro) . ") Y ";
} elseif (!empty($cd_proveedor)) {
    $tipo_descriptivo .= "PROVEEDOR (" . $cd_proveedor . ") Y ";
} elseif (!empty($cod_iva)) {
    $tipo_descriptivo .= "TIPO IVA (" . $cod_iva . ") Y ";
} else {
    $tipo_descriptivo .= "FILTRO MÚLTIPLE Y ";
}

$tipo_descriptivo .= strtoupper($tipo_modificacion);

// Iniciar transacción (sin cambios)
$this->db->trans_begin();

// ✅ LLAMADA CORREGIDA: 8 parámetros (eliminar observacion)
$sql = "SELECT update_precios_masivo(?, ?, ?, ?, ?, ?, ?, ?) as result";
$params = array(
    $marca, 
    $cd_proveedor, 
    $rubro, 
    $cod_iva, 
    $tipo_descriptivo,  // Descripción construida
    $porcentaje, 
    $sucursal, 
    $usuario
);

$query = $this->db->query($sql, $params);

// Resto del código sin cambios...
```

## ⚡ Plan de Implementación

### **Paso 1: Backup (2 minutos)**
```bash
# Respaldar archivo actual
cp C:\xampp\htdocs\APIAND\application\controllers\Descarga.php C:\xampp\htdocs\APIAND\application\controllers\Descarga.php.backup
```

### **Paso 2: Aplicar Modificación (5 minutos)**
1. Abrir `Descarga.php`
2. Localizar líneas 4635-4665
3. Reemplazar código según especificación arriba
4. Guardar archivo

### **Paso 3: Testing (10 minutos)**
1. Acceder al frontend `/cambioprecios`
2. Probar cambio con marca T-FORCE
3. Verificar que no aparece error
4. Confirmar registro en tabla `cactualiza`

### **Paso 4: Validación (5 minutos)**
```sql
-- Verificar último registro en cactualiza
SELECT id_act, tipo, fecha, usuario 
FROM cactualiza 
ORDER BY id_act DESC 
LIMIT 5;

-- Verificar registros en dactualiza con id_articulo
SELECT id_actprecios, id_act, articulo, id_articulo, nombre
FROM dactualiza 
WHERE id_articulo IS NOT NULL
ORDER BY id_actprecios DESC 
LIMIT 5;
```

## 📊 Estimación de Tiempo

| Actividad | Tiempo | Complejidad |
|-----------|--------|-------------|
| Backup archivo | 2 minutos | Muy Baja |
| Modificar código | 5 minutos | Baja |
| Testing frontend | 10 minutos | Baja |
| Validación BD | 5 minutos | Muy Baja |
| **Total** | **22 minutos** | **Baja** |

## 🔒 Riesgos y Mitigaciones

### **Riesgos Identificados:**
- **Muy Bajo:** Error de sintaxis PHP (mitigado con backup)
- **Muy Bajo:** Cambio en lógica existente (solo elimina parámetro)

### **Mitigaciones:**
- ✅ **Backup completo** antes de modificar
- ✅ **Testing inmediato** después de cambio
- ✅ **Rollback fácil** (restaurar backup)

## 🎯 Resultado Esperado

Después de la implementación:

### **Funcionalidad:**
- ✅ Frontend `/cambioprecios` funcionará sin errores
- ✅ Cambios masivos de precios operativos
- ✅ Campo `id_articulo` funcionando en auditoría

### **Auditoría Mejorada:**
- ✅ Campo `tipo` más descriptivo
- ✅ Trazabilidad exacta con información del filtro
- ✅ Identificación clara del tipo de modificación

### **Ejemplo de Auditoría Final:**
```sql
-- Registro en cactualiza
{
  "id_act": 7,
  "tipo": "ACTUALIZACIÓN POR MARCA (T-FORCE) Y COSTO",
  "porcentaje_21": 10.00,
  "fecha": "2025-08-12",
  "usuario": "sistema"
}

-- Registros en dactualiza (con id_articulo)
{
  "id_actprecios": 15,
  "id_act": 7,
  "articulo": 123,
  "id_articulo": 9102,  // ✅ Campo agregado
  "nombre": "CADENA DIST.25x 90",
  "pcosto": 2.44,       // Precio anterior
  "pcoston": 2.68       // Precio nuevo (+10%)
}
```

## ✅ Checklist Final

- [ ] **Verificar líneas exactas** en Descarga.php (4635-4665)
- [ ] **Crear backup** del archivo original
- [ ] **Aplicar modificación** completa
- [ ] **Probar desde frontend** con marca T-FORCE
- [ ] **Validar auditoría** en tablas cactualiza y dactualiza
- [ ] **Confirmar id_articulo** en registros de dactualiza

**Estado:** ✅ **LISTO PARA IMPLEMENTACIÓN INMEDIATA**

---

**Solución Final:** Modificación mínima, máximo beneficio, riesgo mínimo.