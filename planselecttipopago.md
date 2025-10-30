# 📊 INFORME DE ANÁLISIS DE VIABILIDAD - SELECTOR DE TIPO DE PAGO EN CARRITO

## 1. RESUMEN EJECUTIVO

**✅ CONCLUSIÓN: SÍ ES VIABLE IMPLEMENTAR EL SELECTOR DE TIPO DE PAGO EN EL CARRITO**

La infraestructura actual del sistema **ya soporta completamente** esta funcionalidad. La base de datos, el backend y el frontend tienen toda la arquitectura necesaria. La implementación requiere modificaciones menores enfocadas principalmente en el componente del carrito.

---

## 2. ARQUITECTURA ACTUAL DEL SISTEMA DE PRECIOS

### 2.1 Base de Datos PostgreSQL

**Tabla `tarjcredito` (Formas de Pago)**
```
- cod_tarj: Código único de la forma de pago
- tarjeta: Nombre descriptivo (EFECTIVO, ELECTRON, VISA, etc.)
- listaprecio: Define qué lista usar (0, 1, 2, 3)
  • 0 = Precio de Contado (precon)
  • 1 = Precio Lista 1 (prefi1)
  • 2 = Precio Lista 2 (prefi2) - Tarjetas
  • 3 = Precio Lista 3 (prefi3) - Mayorista
- activadatos: Flag para requerir datos adicionales (tarjeta/cheque)
```

**Tabla `artsucursal` (Artículos con múltiples precios)**
```
- precon: Precio de contado base
- prefi1: Precio lista 1
- prefi2: Precio lista 2 (tarjetas)
- prefi3: Precio lista 3 (mayorista)
- prefi4: Precio lista 4
```

**Tabla `conf_lista` (Configuración de Márgenes por Lista)**
```
- listap: Número de lista (1, 2, 3)
- margen: Margen de ganancia aplicado
- preciof21/preciof105: Ajustes de precio por IVA
- activa: Estado activo/inactivo
- cod_marca: Marca específica
```

### 2.2 Backend (Carga.php.txt y Descarga.php.txt)

El backend realiza **JOIN automático** con `tarjcredito` en múltiples consultas:

```php
// Ejemplo en Carga.php.txt líneas 354-360
$this->db->select($tabla . '.*, tarjcredito.tarjeta, tarjcredito.listaprecio,
                   tarjcredito.activadatos, tarjcredito.d1, ... tarjcredito.d7')
         ->join('tarjcredito', $tabla . '.cod_condvta = tarjcredito.cod_tarj', 'left');
```

### 2.3 Frontend Angular

**Flujo Actual en `condicionventa.component.ts`:**
1. Usuario selecciona condición de venta (tarjeta)
2. Se extrae `listaprecio` de la tarjeta seleccionada
3. Método `listaPrecioF()` (línea 1383) activa columnas de precios correspondientes
4. Al seleccionar producto, abre modal `calculoproducto.component.ts`

**Lógica de Precios en `calculoproducto.component.ts` (líneas 80-101):**
```typescript
switch (this.listaPrecio) {
  case "0": this.precio = this.producto.precon; break;
  case "1": this.precio = this.producto.prefi1; break;
  case "2": this.precio = this.producto.prefi2; break;
  case "3": this.precio = this.producto.prefi3; break;
  case "4": this.precio = this.producto.prefi4; break;
}
```

**Estructura del Item en Carrito:**
```typescript
pedido = {
  'id_articulo': number,
  'cantidad': number,
  'precio': number,     // ← Precio fijo al momento de agregar
  'cod_tar': number,    // ← Código de forma de pago
  'nomart': string,     // Nombre del artículo
  // ... otros campos
}
```

---

## 3. ESTADO ACTUAL DEL CARRITO

### 3.1 Funcionalidades Existentes

**✅ Implementado:**
- Muestra tipo de pago por item (columna "Tipo Pago")
- Calcula subtotales agrupados por tipo de pago
- Array `itemsConTipoPago` mapea `cod_tar` a nombre de tarjeta
- Método `calcularSubtotalesPorTipoPago()` (línea 411)

**❌ NO Implementado:**
- Selector dropdown para cambiar tipo de pago de un item
- Recálculo de precios al cambiar tipo de pago
- Actualización de subtotales al cambiar precios

### 3.2 Vista Actual del Carrito (`carrito.component.html`)

```html
<tr *ngFor="let item of itemsConTipoPago">
  <td><input [(ngModel)]="item.cantidad" /></td>
  <td><span>{{item.nomart}}</span></td>
  <td><span>{{item.tipoPago}}</span></td>  <!-- ← SOLO MUESTRA, NO EDITA -->
  <td><span>${{(item.precio * item.cantidad)}}</span></td>
</tr>
```

---

## 4. PLAN DE IMPLEMENTACIÓN

### FASE 1: Modificaciones en el Carrito (CRÍTICO)

#### 4.1 Interfaz de Usuario (`carrito.component.html`)

**ANTES:**
```html
<td><span>{{item.tipoPago}}</span></td>
```

**DESPUÉS:**
```html
<td>
  <p-dropdown
    [options]="tarjetas"
    [(ngModel)]="item.cod_tar"
    optionLabel="tarjeta"
    optionValue="cod_tarj"
    (onChange)="onTipoPagoChange(item, $event)"
    placeholder="Seleccionar forma de pago">
  </p-dropdown>
</td>
```

#### 4.2 Lógica de Negocio (`carrito.component.ts`)

**NUEVO MÉTODO - Cambiar Tipo de Pago:**
```typescript
onTipoPagoChange(item: any, event: any) {
  const nuevoCodTar = event.value;

  // 1. Buscar la tarjeta seleccionada
  const tarjetaSeleccionada = this.tarjetas.find(t =>
    t.cod_tarj.toString() === nuevoCodTar.toString()
  );

  if (!tarjetaSeleccionada) {
    console.error('Tarjeta no encontrada');
    return;
  }

  // 2. Obtener la lista de precio asociada
  const listaPrecio = tarjetaSeleccionada.listaprecio;

  // 3. Buscar el artículo completo en la BD para obtener TODOS los precios
  this._cargardata.getArticuloById(item.id_articulo).subscribe(
    (articulo: any) => {
      // 4. Seleccionar el precio correcto según listaPrecio
      let nuevoPrecio = 0;
      switch(listaPrecio.toString()) {
        case "0": nuevoPrecio = articulo.precon; break;
        case "1": nuevoPrecio = articulo.prefi1; break;
        case "2": nuevoPrecio = articulo.prefi2; break;
        case "3": nuevoPrecio = articulo.prefi3; break;
        case "4": nuevoPrecio = articulo.prefi4; break;
        default: nuevoPrecio = item.precio; // Mantener precio actual si hay error
      }

      // 5. Actualizar el item en el carrito
      item.cod_tar = nuevoCodTar;
      item.precio = nuevoPrecio;
      item.tipoPago = tarjetaSeleccionada.tarjeta;

      // 6. Sincronizar con sessionStorage
      this.actualizarCarritoEnStorage();

      // 7. Recalcular totales
      this.calculoTotal();
      this.subtotalesPorTipoPago = this.calcularSubtotalesPorTipoPago();
      this.actualizarItemsConTipoPago();

      // 8. Notificación al usuario
      Swal.fire({
        icon: 'success',
        title: 'Precio actualizado',
        text: `Nuevo precio: $${nuevoPrecio.toFixed(2)}`,
        timer: 2000,
        showConfirmButton: false
      });
    },
    error => {
      console.error('Error al obtener artículo:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el precio'
      });
    }
  );
}
```

**NUEVO MÉTODO - Actualizar Storage:**
```typescript
actualizarCarritoEnStorage() {
  // Actualizar itemsEnCarrito original
  this.itemsEnCarrito = this.itemsConTipoPago.map(item => {
    const { tipoPago, ...itemSinTipoPago } = item;
    return itemSinTipoPago;
  });

  // Guardar en sessionStorage
  sessionStorage.setItem('carrito', JSON.stringify(this.itemsEnCarrito));

  // Notificar al servicio
  this._carrito.actualizarCarrito();
}
```

### FASE 2: Mejoras en el Backend (OPCIONAL)

#### 2.1 Crear Endpoint Específico en `Carga.php.txt`

```php
// NUEVO: Obtener artículo con todos sus precios
public function getArticuloConPrecios($id_articulo) {
    $this->db->select('id_articulo, nomart, marca, precon, prefi1, prefi2, prefi3, prefi4,
                       cod_iva, tipo_moneda')
             ->from('artsucursal')
             ->where('id_articulo', $id_articulo);

    $query = $this->db->get();

    if ($query->num_rows() > 0) {
        $result = $query->row_array();
        return [
            'error' => false,
            'mensaje' => $result
        ];
    } else {
        return [
            'error' => true,
            'mensaje' => 'Artículo no encontrado'
        ];
    }
}
```

#### 2.2 Servicio Angular (`cargardata.service.ts`)

```typescript
getArticuloById(idArticulo: number): Observable<any> {
  return this.http.get(
    `${this.urlAPI}getArticuloConPrecios/${idArticulo}`
  );
}
```

### FASE 3: Validaciones y Casos Especiales

#### 3.1 Validación de Datos de Tarjeta

```typescript
onTipoPagoChange(item: any, event: any) {
  const tarjetaSeleccionada = this.tarjetas.find(t =>
    t.cod_tarj.toString() === event.value.toString()
  );

  // VALIDAR: Si requiere datos adicionales (activadatos = 1 o 2)
  if (tarjetaSeleccionada.activadatos === 1) {
    // Abrir modal para ingresar datos de tarjeta
    this.solicitarDatosTarjeta(item, tarjetaSeleccionada);
  } else if (tarjetaSeleccionada.activadatos === 2) {
    // Abrir modal para ingresar datos de cheque
    this.solicitarDatosCheque(item, tarjetaSeleccionada);
  } else {
    // Proceder con el cambio normal
    this.aplicarCambioPrecio(item, tarjetaSeleccionada);
  }
}
```

#### 3.2 Manejo de Conversión de Moneda

Si el artículo tiene `tipo_moneda` diferente, aplicar conversión:

```typescript
aplicarConversionMoneda(precio: number, tipoMoneda: number): number {
  // Obtener valor de cambio de this.valoresCambio
  const valorCambio = this.valoresCambio.find(
    vc => vc.tipo_moneda === tipoMoneda
  );

  if (valorCambio && valorCambio.valor > 0) {
    return precio * valorCambio.valor;
  }

  return precio;
}
```

---

## 5. CONSIDERACIONES TÉCNICAS

### 5.1 Ventajas de la Arquitectura Actual

✅ **Separación de Responsabilidades:** Cada tipo de pago tiene su propia lista de precio
✅ **Flexibilidad:** Soporta hasta 5 tipos de precio diferentes por artículo
✅ **Configuración Dinámica:** `conf_lista` permite ajustar márgenes sin cambiar código
✅ **Auditabilidad:** El `cod_tar` queda registrado en cada transacción

### 5.2 Desafíos Potenciales

⚠️ **Rendimiento:** Cada cambio de tipo de pago requiere consulta a BD
- **Solución:** Cachear datos de artículos en memoria durante la sesión

⚠️ **Consistencia de Datos:** Precios pueden cambiar mientras el usuario navega
- **Solución:** Timestamp de última actualización + re-validación al finalizar compra

⚠️ **Conversión de Moneda:** Artículos en USD/EUR requieren conversión
- **Solución:** Ya implementado en `condicionventa.component.ts` (líneas 736-749)

### 5.3 Impacto en la UX

✅ **Positivo:**
- Mayor flexibilidad para el usuario
- Corrección inmediata de errores en tipo de pago
- Transparencia en cambios de precio

⚠️ **Requiere Atención:**
- Notificación clara del cambio de precio
- Confirmación antes de aplicar cambios masivos
- Ayuda visual para entender diferencias de precio

---

## 6. ESTIMACIÓN DE ESFUERZO

### 6.1 Desglose por Componente

| Componente | Cambios Requeridos | Complejidad | Tiempo Estimado |
|------------|-------------------|-------------|-----------------|
| `carrito.component.html` | Agregar dropdown | Baja | 1 hora |
| `carrito.component.ts` | Método `onTipoPagoChange` | Media | 3 horas |
| `carrito.component.css` | Estilos dropdown | Baja | 1 hora |
| `cargardata.service.ts` | Endpoint `getArticuloById` | Baja | 1 hora |
| `Carga.php.txt` (Backend) | OPCIONAL: Endpoint específico | Media | 2 horas |
| Testing & QA | Pruebas unitarias e integración | Media | 4 horas |
| **TOTAL** | | | **12 horas** |

### 6.2 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Inconsistencia de precios | Media | Alto | Validación en backend antes de guardar factura |
| Pérdida de datos en cambio | Baja | Medio | Confirmación del usuario antes de aplicar |
| Performance en BD | Media | Medio | Cache local de artículos durante sesión |
| Bugs en cálculos decimales | Alta | Alto | Usar `toFixed(4)` consistentemente |

---

## 7. RECOMENDACIONES FINALES

### 7.1 Implementación Recomendada

**OPCIÓN A: Implementación Inmediata (Recomendada)**
1. Modificar solo `carrito.component.ts/.html`
2. Reutilizar endpoints existentes (`getArticulo`)
3. Testing básico manual
4. **Ventaja:** Implementación rápida (1 día)
5. **Desventaja:** Menos optimizada

**OPCIÓN B: Implementación Completa**
1. Crear endpoint específico en backend
2. Agregar validaciones exhaustivas
3. Implementar cache de artículos
4. Testing automatizado completo
5. **Ventaja:** Solución robusta y escalable
6. **Desventaja:** Requiere más tiempo (3-4 días)

### 7.2 Pasos Siguientes Inmediatos

1. **Confirmar con stakeholders:** ¿Qué tan crítica es esta feature?
2. **Definir casos de uso:** ¿Se permitirá cambiar tipo de pago de múltiples items a la vez?
3. **Validar reglas de negocio:** ¿Hay restricciones por cliente o sucursal?
4. **Preparar datos de prueba:** Artículos con precios diferenciados por lista

---

## 8. CONCLUSIÓN TÉCNICA

**La implementación del selector de tipo de pago en el carrito es completamente viable** con la arquitectura actual. El sistema ya tiene toda la infraestructura necesaria:

✅ Base de datos con múltiples precios por artículo
✅ Tabla de tarjetas vinculada a listas de precio
✅ Backend con endpoints funcionales
✅ Frontend con lógica de selección de precios

**El trabajo requerido es principalmente de integración frontend**, conectando componentes existentes. No requiere cambios estructurales ni migraciones de base de datos.

**Recomendación:** Proceder con **OPCIÓN A** para validación rápida, y considerar **OPCIÓN B** si la feature tiene adopción alta por los usuarios.

---

**Documento generado:** 2025-10-06
**Análisis realizado sobre:** Base de datos PostgreSQL, Backend PHP (Carga.php.txt, Descarga.php.txt), Frontend Angular 15
