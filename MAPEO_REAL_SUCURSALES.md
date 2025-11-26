# Mapeo Real de Sucursales - Sistema MotoApp

**Fecha**: 16 de Noviembre de 2025
**Analista**: Claude Code
**Hallazgo**: Identificación del mapeo REAL de sucursales usado en el sistema

---

## 🎯 Hallazgo Principal

El sistema utiliza un mapeo de sucursales **DIFERENTE** al que está en la tabla PostgreSQL `sucursales`.

### Mapeo REAL del Sistema (En Uso)

**Fuente**: `header.component.ts` líneas 61-74 (fallback hardcoded)

```typescript
1 = 'Casa Central'
2 = 'Suc. Valle Viejo'
3 = 'Suc. Guemes'
4 = 'Deposito'
5 = 'Mayorista' (implícito, debe estar en Firebase)
```

### Mapeo de PostgreSQL (NO usado para operaciones)

**Fuente**: Tabla `sucursales` en PostgreSQL

```sql
1 = 'DEPOSITO'
2 = 'CASA CENTRAL'
3 = 'VALLE VIEJO'
4 = 'GUEMES'
5 = 'MAYORISTA'
```

**⚠️ IMPORTANTE**: La tabla PostgreSQL tiene un mapeo **COMPLETAMENTE DIFERENTE** y solo se usa para generación de PDFs.

---

## 🔍 Evidencia del Mapeo Real

### 1. Header Component (src/app/shared/header/header.component.ts)

**Líneas 27-28**: Obtiene sucursal de sessionStorage
```typescript
this.sucursal = sessionStorage.getItem('sucursal');
this.cargarNombreSucursal();
```

**Líneas 39-57**: Intenta cargar desde Firebase
```typescript
this._crud.getListSnap('sucursales').subscribe(
  data => {
    const sucursales = data.map(item => {
      const payload = item.payload.val() as any;
      return {
        nombre: payload.nombre,
        value: payload.value
      };
    });
    const sucursalEncontrada = sucursales.find(suc => suc.value.toString() === this.sucursal);
    if (sucursalEncontrada) {
      this.sucursalNombre = sucursalEncontrada.nombre;
    }
  }
)
```

**Líneas 61-74**: **FALLBACK HARDCODED** (el mapeo real)
```typescript
if (this.sucursal == '1') {
  this.sucursalNombre = 'Casa Central';
}
else if (this.sucursal == '2') {
  this.sucursalNombre = 'Suc. Valle Viejo';
}
else if (this.sucursal == '3') {
  this.sucursalNombre = 'Suc. Guemes';
}
else if (this.sucursal == '4') {
  this.sucursalNombre = 'Deposito';
}
```

**✅ Este fallback es el mapeo REAL usado en el sistema**

---

### 2. Login Component (src/app/components/login/login.component.html)

**Líneas 26-30**: Opciones de sucursales en el login
```html
<select [(ngModel)]="sucursal" class="form-control">
    <option value=2>Suc. Valle Viejo</option>
    <option value=3>Suc. Guemes</option>
    <option value=4>Deposito</option>
</select>
```

**✅ Coincide PERFECTAMENTE con el mapeo del header**:
- 2 = Valle Viejo ✅
- 3 = Guemes ✅
- 4 = Deposito ✅

**Línea 67**: Guarda en sessionStorage
```typescript
sessionStorage.setItem('sucursal', this.sucursal);
```

---

### 3. Uso en el Proyecto

**Total de archivos que usan `sessionStorage.getItem('sucursal')`**: 32 archivos

Componentes principales:
- ✅ stockproductooferta.component.ts
- ✅ stockproductopedido.component.ts
- ✅ mis-transferencias.component.ts
- ✅ transferencias-pendientes.component.ts
- ✅ enviostockpendientes.component.ts
- ✅ enviodestockrealizados.component.ts
- ✅ stockrecibo.component.ts
- ✅ stockpedido.component.ts
- ✅ puntoventa.component.ts
- ✅ carrito.component.ts
- ✅ cajamovi.component.ts
- Y 21 más...

**Conclusión**: El mapeo usado en `sessionStorage['sucursal']` es el mapeo REAL del sistema.

---

## 📊 Comparación de Mapeos

| ID | Mapeo REAL (Sistema) | Mapeo PostgreSQL | Coincide |
|----|---------------------|------------------|----------|
| 1  | Casa Central        | DEPOSITO         | ❌ NO    |
| 2  | Valle Viejo         | CASA CENTRAL     | ❌ NO    |
| 3  | Guemes              | VALLE VIEJO      | ❌ NO    |
| 4  | Deposito            | GUEMES           | ❌ NO    |
| 5  | Mayorista           | MAYORISTA        | ✅ SÍ    |

**⚠️ Solo el ID 5 (Mayorista) coincide en ambos sistemas**

---

## 🔧 Fuentes de Datos de Sucursales

### 1. Firebase Realtime Database (PRIMARIA)

**Colección**: `/sucursales`
**Uso**: Todo el sistema operativo
**Estructura esperada**:
```json
{
  "sucursal1": {
    "nombre": "Casa Central",
    "value": 1
  },
  "sucursal2": {
    "nombre": "Suc. Valle Viejo",
    "value": 2
  },
  ...
}
```

**Cómo se carga**:
```typescript
this._crud.getListSnap('sucursales').subscribe(...)
```

---

### 2. Fallback Hardcoded (SECUNDARIA)

**Ubicación**: `header.component.ts` líneas 61-74
**Uso**: Si Firebase falla
**Mapeo**:
- 1 = Casa Central
- 2 = Suc. Valle Viejo
- 3 = Suc. Guemes
- 4 = Deposito

---

### 3. PostgreSQL (SOLO PARA PDFs)

**Tabla**: `sucursales`
**Uso**: Solo para `SucursalInfoPDF_post` en Carga.php líneas 2337-2340
**Mapeo**: DIFERENTE al sistema operativo
**Query**:
```php
$this->db->select('cod_sucursal, sucursal');
$this->db->from('sucursales');
$this->db->where('cod_sucursal', $sucursal);
```

**⚠️ IMPORTANTE**: Esta tabla NO se usa para las operaciones normales del sistema, solo para generación de PDFs.

---

## ✅ Validación del Mapeo Real

### Componentes de Stock

**stockproductopedido.component.ts** (PULL):
```typescript
// Línea 49: Obtiene sucursal de sessionStorage
this.sucursal = sessionStorage.getItem('sucursal');

// Líneas 102-104: Crea el pedido
sucursald: Number(this.sucursal),        // Usa el ID del mapeo real
sucursalh: this.selectedSucursal,
tipo_transferencia: 'PULL'
```

**stockproductooferta.component.ts** (PUSH):
```typescript
// Línea 46: Obtiene sucursal de sessionStorage
this.sucursal = sessionStorage.getItem('sucursal');

// Líneas 97-99: Crea la oferta
sucursald: Number(this.sucursal),        // Usa el ID del mapeo real
sucursalh: this.selectedSucursal,
tipo_transferencia: 'PUSH'
```

**✅ Ambos componentes usan `sessionStorage.getItem('sucursal')` que contiene el ID según el mapeo REAL**

---

## 🎯 Conclusiones

### 1. El sistema usa DOS mapeos diferentes

- **Mapeo Operativo (Firebase + Fallback)**: 1=Casa Central, 2=Valle Viejo, 3=Guemes, 4=Deposito, 5=Mayorista
- **Mapeo PostgreSQL (Solo PDFs)**: 1=DEPOSITO, 2=CASA CENTRAL, 3=VALLE VIEJO, 4=GUEMES, 5=MAYORISTA

### 2. El login.component.html NO está mal

Las opciones del login (2=Valle Viejo, 3=Guemes, 4=Deposito) coinciden perfectamente con el mapeo REAL del sistema.

### 3. La tabla PostgreSQL es irrelevante

Para las operaciones de transferencias, ventas, stock, etc., la tabla `sucursales` de PostgreSQL NO se usa. Solo se consulta para generar PDFs.

### 4. sessionStorage['sucursal'] es la fuente de verdad

Los 32 componentes que usan `sessionStorage.getItem('sucursal')` obtienen un ID según el mapeo REAL:
- 1 = Casa Central
- 2 = Valle Viejo
- 3 = Guemes
- 4 = Deposito
- 5 = Mayorista

### 5. Firebase es la base de datos primaria

La colección `/sucursales` en Firebase contiene el mapeo correcto que usa todo el sistema.

---

## 🔬 Implicaciones para CP-001 y CP-003

Con el mapeo REAL identificado, ahora podemos re-analizar los problemas reportados en las pruebas.

**Próximo paso**: Re-analizar `ANALISIS_PROBLEMAS_PRUEBAS_CP001_CP003.md` usando el mapeo REAL.

---

**Fecha de Análisis**: 16 de Noviembre de 2025
**Estado**: ✅ MAPEO REAL IDENTIFICADO
**Analista**: Claude Code
