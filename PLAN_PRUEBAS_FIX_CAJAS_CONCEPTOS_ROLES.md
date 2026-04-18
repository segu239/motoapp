# Plan de pruebas - Fix cajas, conceptos y roles

## Objetivo

Validar que el fix de roles para `caja_lista`, `caja_conceptos` y `caja_movi` funcione correctamente en frontend y backend, y que todas las modificaciones realizadas durante las pruebas puedan revertirse en base.

## Alcance

- Login y contexto de sesion por rol
- Visibilidad por `rol_minimo` en `cajalista`
- Visibilidad por `rol_minimo` en `cajaconcepto`
- Restricciones de ruta para altas y ediciones
- Altas y ediciones de cajas y conceptos con rollback
- Listado paginado de `cajamovi`
- Derivacion automatica de `caja` desde `concepto` en alta y edicion de movimientos
- Verificacion de ausencia de error CORS por `X-User-Role`

## Datos fijos para todos los bloques

- Base URL: `http://localhost:4200`
- Login URL: `http://localhost:4200/login2`
- Usuario `USER`: email `ivanchaile@moto.com`, password `moto123`, sucursal `4`
- Usuario `ADMIN`: email `gaston@moto.com`, password `123456`, sucursal `1`
- Usuario `SUPER`: email `segu239@hotmail.com`, password `luissegu1`, sucursal `1`
- Convencion para datos de prueba nuevos:
  - cajas: `QA Caja ...`
  - conceptos: `QA Concepto ...`
  - movimientos: descripcion que empiece con `QA Mov ...`

## Protocolo obligatorio de rollback y verificacion en base

Antes de cualquier prueba que cree o edite datos:

1. Registrar timestamp de inicio.
2. Registrar el usuario con el que se ejecuta la prueba.
3. Si la prueba edita un registro existente, consultar y guardar el estado original en una nota temporal.
4. Si la prueba crea un registro nuevo, anotar inmediatamente el `id` creado desde UI o desde consulta SQL.
5. Al terminar el bloque, ejecutar el rollback indicado en ese TG y verificar que la base volvio al estado esperado.

Consultas base de apoyo:

```sql
select id_caja, descripcion, fecha_cierre, especial, fija, rol_minimo
from public.caja_lista
order by id_caja desc;

select id_concepto, descripcion, tipo_concepto, fija, ingreso_egreso, id_caja, activo_inactivo, rol_minimo
from public.caja_conceptos
order by id_concepto desc;

select id_movimiento, codigo_mov, caja, sucursal, descripcion_mov, importe_mov, fecha_mov
from public.caja_movi
order by id_movimiento desc;
```

## Estado actual de ejecucion

- `TG-001`: ejecutado y aprobado
- `TG-002`: puede reejecutarse porque ya se informo la carga manual de cajas QA en base
- `TG-003` y `TG-007`: requieren ademas conceptos QA y, para cobertura completa de movimientos, movimientos QA asociados

## Datos semilla de prueba

Para continuar con las pruebas, mantener cargados estos registros hasta terminar `TG-002`, `TG-003` y `TG-007`:

- `Caja User QA` con `rol_minimo = user`
- `Caja Admin QA` con `rol_minimo = admin`
- `Caja Super QA` con `rol_minimo = super`
- `Concepto User QA` ligado a `Caja User QA`
- `Concepto Admin QA` ligado a `Caja Admin QA`
- `Concepto Super QA` ligado a `Caja Super QA`

Verificacion de cajas QA:

```sql
select id_caja, descripcion, rol_minimo
from public.caja_lista
where descripcion in ('Caja User QA', 'Caja Admin QA', 'Caja Super QA')
order by id_caja;
```

Si todavia no existen los conceptos QA, crearlos ahora con los `id_caja` reales obtenidos arriba:

```sql
insert into public.caja_conceptos (descripcion, tipo_concepto, fija, ingreso_egreso, id_caja, activo_inactivo, rol_minimo)
values
  ('Concepto User QA', 'QU', 0, 0, <ID_CAJA_USER_QA>, 0, 'user'),
  ('Concepto Admin QA', 'QA', 0, 0, <ID_CAJA_ADMIN_QA>, 0, 'admin'),
  ('Concepto Super QA', 'QS', 0, 0, <ID_CAJA_SUPER_QA>, 0, 'super');
```

Verificacion de conceptos QA:

```sql
select id_concepto, descripcion, id_caja, rol_minimo
from public.caja_conceptos
where descripcion in ('Concepto User QA', 'Concepto Admin QA', 'Concepto Super QA')
order by id_concepto;
```

No borrar estas cajas ni estos conceptos hasta terminar los bloques de visibilidad y movimientos.

Rollback conjunto de fixtures al final de toda la validacion:

```sql
delete from public.caja_movi
where descripcion_mov like 'QA Mov %'
   or codigo_mov in (
     select id_concepto
     from public.caja_conceptos
     where descripcion in ('Concepto User QA', 'Concepto Admin QA', 'Concepto Super QA')
   );

delete from public.caja_conceptos
where descripcion in ('Concepto User QA', 'Concepto Admin QA', 'Concepto Super QA');

delete from public.caja_lista
where descripcion in ('Caja User QA', 'Caja Admin QA', 'Caja Super QA');
```

---

## TG-001 Login y preparacion de contexto

**Datos para este bloque:**

- URL: `http://localhost:4200/login2`
- Credenciales user: `ivanchaile@moto.com` / `moto123` / sucursal `4`
- Credenciales admin: `gaston@moto.com` / `123456` / sucursal `1`
- Credenciales super: `segu239@hotmail.com` / `luissegu1` / sucursal `1`
- Este bloque no modifica base.

### Caso TG-001-T001 - Login valido por cada rol

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Navigate | URL bar | `http://localhost:4200/login2` | Carga login | Texto `Iniciar sesión` visible |
| 2 | Verify | Formulario | - | Existen `Email`, `Contraseña`, selector de sucursal y boton `Ingresar` | - |
| 3 | Type | Input `Email` | `ivanchaile@moto.com` | Campo completo | - |
| 4 | Type | Input `Contraseña` | `moto123` | Campo completo | - |
| 5 | Select | Selector sucursal | `4` | Sucursal seleccionada | - |
| 6 | Click | Boton `Ingresar` | - | Login exitoso | Ruta `/components/puntoventa` o equivalente visible |
| 7 | Repeat | Flujo completo | `gaston@moto.com` / `123456` / sucursal `1` | Login admin exitoso | Pantalla principal visible |
| 8 | Repeat | Flujo completo | `segu239@hotmail.com` / `luissegu1` / sucursal `1` | Login super exitoso | Pantalla principal visible |

### Caso TG-001-T002 - Validaciones de login

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Navigate | URL bar | `http://localhost:4200/login2` | Carga login | Texto `Iniciar sesión` visible |
| 2 | Click | Boton `Ingresar` | - | No inicia sesion | Mensajes de validacion visibles |
| 3 | Verify | Mensajes | - | Se ven mensajes de email y contraseña obligatorios | - |
| 4 | Type | Input `Email` | `correo-invalido` | Campo completo | - |
| 5 | Type | Input `Contraseña` | `123` | Campo completo | - |
| 6 | Click | Boton `Ingresar` | - | El formulario sigue invalido | Mensajes de validacion visibles |

---

## TG-002 Cajalista - visibilidad y permisos por rol

**Datos para este bloque:**

- URL inicial: `http://localhost:4200/login2`
- Ruta objetivo: `http://localhost:4200/components/cajalista`
- Registros esperados: `Caja User QA`, `Caja Admin QA`, `Caja Super QA`
- Sin cambios en base.

### Caso TG-002-T001 - USER solo ve cajas user

Precondicion: existen `Caja User QA`, `Caja Admin QA` y `Caja Super QA` en base.

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `ivanchaile@moto.com` / `moto123` / sucursal `4` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajalista` | Abre listado | Titulo `Cajas Listas` visible |
| 3 | Verify | Tabla | - | Existe columna `Rol Mínimo` | Header visible |
| 4 | Verify | Filas | - | Se ve `Caja User QA` | Tabla cargada |
| 5 | Verify-Not | Filas | - | No se ve `Caja Admin QA` ni `Caja Super QA` | - |
| 6 | Verify-Not | Boton alta | - | No aparece boton plus | - |
| 7 | Verify | Boton lapiz | - | Esta deshabilitado | Estado disabled visible |
| 8 | Verify | Boton basura | - | Esta deshabilitado | Estado disabled visible |

### Caso TG-002-T002 - ADMIN ve user+admin

Precondicion: existen `Caja User QA`, `Caja Admin QA` y `Caja Super QA` en base.

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajalista` | Abre listado | Titulo visible |
| 3 | Verify | Filas | - | Se ven `Caja User QA` y `Caja Admin QA` | Tabla cargada |
| 4 | Verify-Not | Filas | - | No se ve `Caja Super QA` | - |
| 5 | Verify | Boton alta | - | Aparece visible | - |
| 6 | Verify | Botones editar/eliminar | - | Estan habilitados en filas visibles | - |

### Caso TG-002-T003 - SUPER ve todas las cajas

Precondicion: existen `Caja User QA`, `Caja Admin QA` y `Caja Super QA` en base.

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `segu239@hotmail.com` / `luissegu1` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajalista` | Abre listado | Titulo visible |
| 3 | Verify | Filas | - | Se ven `Caja User QA`, `Caja Admin QA` y `Caja Super QA` | Tabla cargada |
| 4 | Verify | Columna rol | - | Los valores se muestran como `User`, `Admin`, `Super` | - |

---

## TG-003 Cajaconcepto - visibilidad y permisos por rol

**Datos para este bloque:**

- Ruta objetivo: `http://localhost:4200/components/cajaconcepto`
- Registros esperados: `Concepto User QA`, `Concepto Admin QA`, `Concepto Super QA`
- Sin cambios en base.

### Caso TG-003-T001 - USER solo ve conceptos user

Precondicion: existen `Concepto User QA`, `Concepto Admin QA` y `Concepto Super QA` en base.

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `ivanchaile@moto.com` / `moto123` / sucursal `4` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajaconcepto` | Abre listado | Titulo `Conceptos de Caja` visible |
| 3 | Verify | Tabla | - | Existe columna `Rol Mínimo` | Header visible |
| 4 | Verify | Filas | - | Se ve `Concepto User QA` | Tabla cargada |
| 5 | Verify-Not | Filas | - | No se ve `Concepto Admin QA` ni `Concepto Super QA` | - |
| 6 | Verify-Not | Boton alta | - | No aparece visible | - |
| 7 | Verify | Boton editar | - | Esta deshabilitado | Estado disabled visible |

### Caso TG-003-T002 - ADMIN ve user+admin

Precondicion: existen `Concepto User QA`, `Concepto Admin QA` y `Concepto Super QA` en base.

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajaconcepto` | Abre listado | Titulo visible |
| 3 | Verify | Filas | - | Se ven `Concepto User QA` y `Concepto Admin QA` | Tabla cargada |
| 4 | Verify-Not | Filas | - | No se ve `Concepto Super QA` | - |
| 5 | Verify | Boton alta | - | Visible | - |
| 6 | Verify | Boton editar | - | Habilitado | - |

### Caso TG-003-T003 - SUPER ve todos los conceptos

Precondicion: existen `Concepto User QA`, `Concepto Admin QA` y `Concepto Super QA` en base.

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `segu239@hotmail.com` / `luissegu1` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajaconcepto` | Abre listado | Titulo visible |
| 3 | Verify | Filas | - | Se ven `Concepto User QA`, `Concepto Admin QA` y `Concepto Super QA` | Tabla cargada |

---

## TG-004 Alta de caja lista con rollback

**Datos para este bloque:**

- ADMIN: `gaston@moto.com` / `123456` / sucursal `1`
- SUPER: `segu239@hotmail.com` / `luissegu1` / sucursal `1`
- Caja de prueba admin: `QA Caja Alta Admin`
- Caja de prueba super: `QA Caja Alta Super`

### Pre-verificacion DB

```sql
select id_caja, descripcion, rol_minimo
from public.caja_lista
where descripcion in ('QA Caja Alta Admin', 'QA Caja Alta Super');
```

Debe devolver 0 filas antes de empezar.

### Caso TG-004-T001 - ADMIN crea caja con rol admin

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/newcajalista` | Abre formulario | Titulo `Nueva Caja Lista` visible |
| 3 | Verify | Select `Rol Mínimo` | - | Solo muestra `Admin` y `User` | Opciones visibles |
| 4 | Type | Input `Descripción` | `QA Caja Alta Admin` | Campo completo | - |
| 5 | Type | Input `Fecha Cierre` | fecha valida futura | Campo completo | - |
| 6 | Clear+Type | Input `Especial` | `0` | Campo valido | - |
| 7 | Clear+Type | Input `Fija` | `0` | Campo valido | - |
| 8 | Select | Select `Rol Mínimo` | `Admin` | Valor seleccionado | - |
| 9 | Click | Boton `Guardar` | - | Alta exitosa | Navegacion a `cajalista` o mensaje de exito |
| 10 | Verify | Tabla | - | Se ve `QA Caja Alta Admin` | Tabla cargada |

### Verificacion DB posterior

```sql
select id_caja, descripcion, rol_minimo
from public.caja_lista
where descripcion = 'QA Caja Alta Admin';
```

Anotar el `id_caja` devuelto para rollback.

### Rollback TG-004-T001

```sql
delete from public.caja_lista
where descripcion = 'QA Caja Alta Admin';

select id_caja, descripcion
from public.caja_lista
where descripcion = 'QA Caja Alta Admin';
```

### Caso TG-004-T002 - SUPER crea caja con rol super

Repetir el flujo anterior con:

- usuario `segu239@hotmail.com`
- password `luissegu1`
- descripcion `QA Caja Alta Super`
- rol minimo `Super`

### Rollback TG-004-T002

```sql
delete from public.caja_lista
where descripcion = 'QA Caja Alta Super';

select id_caja, descripcion
from public.caja_lista
where descripcion = 'QA Caja Alta Super';
```

---

## TG-005 Edicion de caja lista con rollback

**Datos para este bloque:**

- Usuario admin: `gaston@moto.com` / `123456` / sucursal `1`
- Registro a editar: una caja visible para admin, idealmente `Caja Admin QA`

### Pre-verificacion y captura del estado original

```sql
select id_caja, descripcion, fecha_cierre, especial, fija, rol_minimo
from public.caja_lista
where descripcion = 'Caja Admin QA';
```

Guardar el `rol_minimo` original y cualquier otro dato a restaurar.

### Caso TG-005-T001 - ADMIN cambia rol de una caja visible

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajalista` | Abre listado | Tabla visible |
| 3 | Click | Boton lapiz de `Caja Admin QA` | - | Abre edicion | Titulo `Editar Caja Lista` |
| 4 | Verify | Campo `Fija` | - | Es solo lectura | - |
| 5 | Verify | Select `Rol Mínimo` | - | No aparece opcion `Super` | Opciones visibles |
| 6 | Select | Select `Rol Mínimo` | `User` | Nuevo valor seleccionado | - |
| 7 | Click | Boton `Actualizar` | - | Actualizacion exitosa | Retorno a listado o mensaje |
| 8 | Verify | Fila actualizada | - | `Caja Admin QA` ahora muestra rol `User` | Tabla visible |

### Rollback TG-005-T001

```sql
update public.caja_lista
set rol_minimo = 'admin'
where descripcion = 'Caja Admin QA';

select id_caja, descripcion, rol_minimo
from public.caja_lista
where descripcion = 'Caja Admin QA';
```

---

## TG-006 Alta y edicion de concepto con rollback

**Datos para este bloque:**

- Usuario admin: `gaston@moto.com` / `123456` / sucursal `1`
- Usuario super: `segu239@hotmail.com` / `luissegu1` / sucursal `1`
- Concepto admin: `QA Concepto Alta Admin`
- Concepto super: `QA Concepto Alta Super`

### Pre-verificacion DB

```sql
select id_concepto, descripcion, rol_minimo
from public.caja_conceptos
where descripcion in ('QA Concepto Alta Admin', 'QA Concepto Alta Super');
```

### Caso TG-006-T001 - ADMIN crea concepto con rol admin

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/newcajaconcepto` | Abre formulario | Titulo `Nuevo Concepto de Caja` visible |
| 3 | Verify | Select `Caja` | - | Solo lista cajas visibles para admin | Opciones visibles |
| 4 | Verify | Select `Rol Mínimo` | - | Solo `Admin` y `User` | Opciones visibles |
| 5 | Fill | Formulario | `QA Concepto Alta Admin`, `QA`, `0`, `0`, caja admin visible, `Admin`, `0` | Form valido | - |
| 6 | Click | Boton `Guardar` | - | Alta exitosa | Retorno a listado o mensaje |
| 7 | Verify | Tabla | - | Se ve `QA Concepto Alta Admin` | Tabla visible |

### Verificacion DB posterior

```sql
select id_concepto, descripcion, id_caja, rol_minimo
from public.caja_conceptos
where descripcion = 'QA Concepto Alta Admin';
```

### Caso TG-006-T002 - ADMIN edita rol del concepto creado

Antes de editar, anotar el `id_concepto` y el rol actual.

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Navigate | URL bar | `http://localhost:4200/components/cajaconcepto` | Abre listado | Tabla visible |
| 2 | Click | Boton lapiz de `QA Concepto Alta Admin` | - | Abre edicion | Titulo `Editar Concepto de Caja` |
| 3 | Verify | Campos de identidad | - | `Descripción`, `Tipo Concepto`, `Fijo`, `Ingreso/Egreso` son readonly | - |
| 4 | Select | Select `Rol Mínimo` | `User` | Valor seleccionado | - |
| 5 | Click | Boton `Actualizar Estado` | - | Actualizacion exitosa | Retorno o mensaje |
| 6 | Verify | Tabla | - | `QA Concepto Alta Admin` muestra rol `User` | Tabla visible |

### Rollback TG-006-T001 / T002

Si se quiere borrar el registro creado:

```sql
delete from public.caja_conceptos
where descripcion = 'QA Concepto Alta Admin';

select id_concepto, descripcion
from public.caja_conceptos
where descripcion = 'QA Concepto Alta Admin';
```

### Caso TG-006-T003 - SUPER crea concepto con rol super

Repetir el alta con:

- usuario `segu239@hotmail.com`
- password `luissegu1`
- descripcion `QA Concepto Alta Super`
- rol minimo `Super`

### Rollback TG-006-T003

```sql
delete from public.caja_conceptos
where descripcion = 'QA Concepto Alta Super';

select id_concepto, descripcion
from public.caja_conceptos
where descripcion = 'QA Concepto Alta Super';
```

---

## TG-007 Cajamovi - listado y filtrado por rol

**Datos para este bloque:**

- USER: `ivanchaile@moto.com` / `moto123` / sucursal `4`
- ADMIN: `gaston@moto.com` / `123456` / sucursal `1`
- SUPER: `segu239@hotmail.com` / `luissegu1` / sucursal `1`
- Registros de referencia: movimientos asociados a conceptos/cajas `user`, `admin`, `super`
- Sin cambios en base.

### Caso TG-007-T001 - USER ve solo movimientos permitidos

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `ivanchaile@moto.com` / `moto123` / sucursal `4` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajamovi` | Abre listado | Tabla visible |
| 3 | Verify | Network | - | `CajamoviPaginado` responde `200` | Request finalizada |
| 4 | Verify-Not | Consola/Network | - | No hay error CORS por `X-User-Role` ni `500` | - |
| 5 | Verify | Filas | - | Solo se ven movimientos de conceptos/cajas `user` | Tabla visible |

### Caso TG-007-T002 - ADMIN ve movimientos user+admin

Repetir con `gaston@moto.com` / `123456` / sucursal `1` y verificar que no aparezcan movimientos `super`.

### Caso TG-007-T003 - SUPER ve todos los movimientos

Repetir con `segu239@hotmail.com` / `luissegu1` / sucursal `1` y verificar que aparezcan todos.

---

## TG-008 Alta de movimiento con rollback y caja derivada

**Datos para este bloque:**

- Usuario admin: `gaston@moto.com` / `123456` / sucursal `1`
- Descripcion de prueba: `QA Mov Alta Admin`
- Concepto a elegir: un concepto visible para admin cuya caja asociada sea conocida

### Caso TG-008-T001 - Alta con caja derivada automaticamente

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/newcajamovi` | Abre formulario | Titulo `Nuevo Movimiento de Caja` visible |
| 3 | Select | Select `Código Mov.` | concepto admin visible | Se selecciona concepto | Cambio aplicado |
| 4 | Verify | Campo `Caja` | - | Se completa solo con la caja del concepto | Texto de caja visible |
| 5 | Verify | Campo `Caja` | - | No es editable manualmente | Campo readonly visible |
| 6 | Fill | Campos obligatorios | numero operacion valido, fecha valida, importe `1000`, descripcion `QA Mov Alta Admin`, cliente o proveedor valido | Form valido | - |
| 7 | Click | Boton `Guardar` | - | Alta exitosa | Mensaje `El movimiento se guardó correctamente` |

### Verificacion DB posterior

```sql
select id_movimiento, descripcion_mov, codigo_mov, caja, sucursal
from public.caja_movi
where descripcion_mov = 'QA Mov Alta Admin'
order by id_movimiento desc;
```

Anotar el `id_movimiento` devuelto.

### Rollback TG-008-T001

```sql
delete from public.caja_movi
where descripcion_mov = 'QA Mov Alta Admin';

select id_movimiento, descripcion_mov
from public.caja_movi
where descripcion_mov = 'QA Mov Alta Admin';
```

---

## TG-009 Edicion de movimiento con rollback y recambio de caja

**Datos para este bloque:**

- Usuario admin: `gaston@moto.com` / `123456` / sucursal `1`
- Movimiento editable existente
- Dos conceptos visibles para admin con cajas distintas

### Pre-verificacion DB

```sql
select id_movimiento, descripcion_mov, codigo_mov, caja
from public.caja_movi
where descripcion_mov like 'QA Mov %'
order by id_movimiento desc;
```

Guardar `codigo_mov`, `caja` y `descripcion_mov` originales del movimiento que se vaya a editar.

### Caso TG-009-T001 - Cambiar concepto y verificar recambio de caja

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/cajamovi` | Abre listado | Tabla visible |
| 3 | Click | Boton lapiz de un movimiento editable | - | Abre edicion | Titulo `Editar Movimiento de Caja` visible |
| 4 | Verify | Campo `Caja` | - | Muestra caja actual como readonly | Texto visible |
| 5 | Select | Select `Código Mov.` | otro concepto visible con caja distinta | Se cambia concepto | Cambio aplicado |
| 6 | Verify | Campo `Caja` | - | Se actualiza automaticamente a otra caja | Nuevo texto visible |
| 7 | Click | Boton de actualizar | - | Edicion exitosa | Retorno o mensaje |

### Rollback TG-009-T001

Restaurar los valores guardados al inicio. Ejemplo:

```sql
update public.caja_movi
set codigo_mov = <CODIGO_ORIGINAL>,
    caja = <CAJA_ORIGINAL>,
    descripcion_mov = '<DESCRIPCION_ORIGINAL>'
where id_movimiento = <ID_MOVIMIENTO>;

select id_movimiento, descripcion_mov, codigo_mov, caja
from public.caja_movi
where id_movimiento = <ID_MOVIMIENTO>;
```

---

## TG-010 Validaciones de seguridad funcional

**Datos para este bloque:**

- USER: `ivanchaile@moto.com` / `moto123` / sucursal `4`
- ADMIN: `gaston@moto.com` / `123456` / sucursal `1`
- SUPER: `segu239@hotmail.com` / `luissegu1` / sucursal `1`
- Sin cambios en base si se ejecuta solo navegacion y validacion visual.

### Caso TG-010-T001 - USER no puede administrar catalogos

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `ivanchaile@moto.com` / `moto123` / sucursal `4` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/newcajalista` | Acceso bloqueado | Pantalla `nopermitido` o redireccion |
| 3 | Navigate | URL bar | `http://localhost:4200/components/newcajaconcepto` | Acceso bloqueado | Pantalla `nopermitido` o redireccion |

### Caso TG-010-T002 - ADMIN no puede asignar super

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `gaston@moto.com` / `123456` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/newcajalista` | Abre formulario | Form visible |
| 3 | Verify | Select `Rol Mínimo` | - | No existe opcion `Super` | Opciones visibles |
| 4 | Navigate | URL bar | `http://localhost:4200/components/newcajaconcepto` | Abre formulario | Form visible |
| 5 | Verify | Select `Rol Mínimo` | - | No existe opcion `Super` | Opciones visibles |

### Caso TG-010-T003 - SUPER si puede asignar super

| Step | Action | Element | Data | Expected Result | Wait For |
|---|---|---|---|---|---|
| 1 | Login | Pantalla `login2` | `segu239@hotmail.com` / `luissegu1` / sucursal `1` | Login correcto | Pantalla principal visible |
| 2 | Navigate | URL bar | `http://localhost:4200/components/newcajalista` | Abre formulario | Form visible |
| 3 | Verify | Select `Rol Mínimo` | - | Existe opcion `Super` | Opciones visibles |
| 4 | Navigate | URL bar | `http://localhost:4200/components/newcajaconcepto` | Abre formulario | Form visible |
| 5 | Verify | Select `Rol Mínimo` | - | Existe opcion `Super` | Opciones visibles |

---

## Verificaciones de red obligatorias

En cualquier bloque que cargue `cajalista` o `cajaconcepto` verificar en DevTools > Network:

- el request es `GET`
- viaja `rol_usuario` en query string
- no aparece preflight rechazado por `X-User-Role`

En `cajamovi` verificar:

- `CajamoviPaginado` responde `200`
- el body del `POST` incluye `rol_usuario`
- no hay `500`

## Criterio de aprobacion

El fix queda aprobado si:

- `user` solo ve y usa recursos `user`
- `admin` solo ve y usa recursos `user` + `admin`
- `super` ve y usa todo
- `admin` no puede asignar `super`
- las rutas de alta/edicion de catalogos quedan bloqueadas para `user`
- la `caja` en movimientos se deriva automaticamente desde el `concepto`
- todos los bloques con cambios de datos pueden volver al estado original con las consultas de rollback

## No cubierto

- endurecimiento de seguridad real contra manipulacion maliciosa del rol enviado por cliente
- automatizacion E2E
- pruebas de concurrencia
