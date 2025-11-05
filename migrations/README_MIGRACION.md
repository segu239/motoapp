# Instrucciones de Migración - Costos Fijos en Altas de Existencias

## ⚠️ IMPORTANTE: Selección de Script Según Versión de PostgreSQL

Esta migración tiene **dos versiones** del script dependiendo de tu versión de PostgreSQL:

| Versión PostgreSQL | Script a Usar | Notas |
|-------------------|---------------|-------|
| **PostgreSQL 9.4** | `20250511_add_costos_fijos_pedidoitem_pg94.sql` | ⬅️ **USA ESTE PARA TU CASO** |
| PostgreSQL 9.6+ | `20250511_add_costos_fijos_pedidoitem.sql` | Usa sintaxis moderna |

**¿Por qué dos versiones?**
- PostgreSQL 9.4 no soporta `IF NOT EXISTS` en `ALTER TABLE ADD COLUMN` ni en `CREATE INDEX`
- La versión `_pg94.sql` usa bloques `DO` anónimos para verificar existencia antes de crear
- Ambos scripts logran el mismo resultado, solo difieren en la sintaxis

## Descripción

Esta migración agrega tres nuevas columnas a la tabla `pedidoitem` para soportar la funcionalidad de fijación de costos al momento de cancelar altas de existencias:

- `costo_total_1_fijo`: Costo total 1 fijado
- `costo_total_2_fijo`: Costo total 2 fijado
- `vcambio_fijo`: Valor de cambio fijado

## Nivel de Riesgo

**BAJO** - Según análisis de impacto documentado en `INFORME_RELEVAMIENTO_IMPACTO.md`:

- ✅ No hay registros existentes con estado 'ALTA' o 'Cancel-Alta'
- ✅ Columnas NULL por defecto (backward compatible)
- ✅ No afecta SELECTs ni INSERTs existentes
- ✅ Se agregan índices para optimizar consultas futuras

## Cómo Ejecutar la Migración

**Para PostgreSQL 9.4** (tu caso):

### Opción 1: Desde psql (línea de comandos)

```bash
psql -U tu_usuario -d nombre_base_datos -f migrations/20250511_add_costos_fijos_pedidoitem_pg94.sql
```

### Opción 2: Desde pgAdmin

1. Abrir pgAdmin
2. Conectarse a la base de datos
3. Abrir Query Tool (Herramienta de consulta)
4. Cargar el archivo `20250511_add_costos_fijos_pedidoitem_pg94.sql`
5. Ejecutar (tecla F5)

### Opción 3: Copiar y pegar

1. Abrir el archivo `20250511_add_costos_fijos_pedidoitem_pg94.sql`
2. Copiar todo el contenido
3. Pegarlo en tu cliente PostgreSQL favorito
4. Ejecutar

## Verificaciones Incluidas

El script incluye verificaciones automáticas:

1. **Verificación previa**: Cuenta registros que serían afectados (debe ser 0)
2. **Verificación posterior**: Confirma que las columnas fueron creadas correctamente
3. **Verificación de índices**: Lista los índices creados

## Reversión (Rollback)

Si necesitas revertir esta migración, el script incluye instrucciones de rollback al final:

```sql
BEGIN;
DROP INDEX IF EXISTS idx_pedidoitem_estado_trim;
DROP INDEX IF EXISTS idx_pedidoitem_estado_sucursal;
ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_1_fijo;
ALTER TABLE pedidoitem DROP COLUMN IF EXISTS costo_total_2_fijo;
ALTER TABLE pedidoitem DROP COLUMN IF EXISTS vcambio_fijo;
COMMIT;
```

## Siguiente Paso

Después de ejecutar esta migración exitosamente, proceder con:

1. ✅ Implementación del endpoint `ObtenerAltasConCostos_get()` (backend)
2. ✅ Actualización del endpoint `CancelarAltaExistencias_post()` (backend)
3. ✅ Actualización de componentes frontend
4. ✅ Pruebas de funcionalidad completa

## Documentación Relacionada

- `INFORME_RELEVAMIENTO_IMPACTO.md`: Análisis completo de impacto
- `mejora_costos_alta_articulos2.md`: Especificación técnica V2.1
- `mejora_costos_alta_articulos.md`: Especificación técnica V1.1

## Notas Importantes

- Esta migración es **idempotente**: puede ejecutarse múltiples veces sin causar errores
  - La versión PG 9.4 usa bloques `DO` que verifican existencia antes de crear
  - La versión PG 9.6+ usa `IF NOT EXISTS` nativamente
- Las columnas se crean con valor NULL por defecto (backward compatible)
- Los índices mejoran el performance de consultas filtradas por estado
- La transacción asegura que todos los cambios se aplican o ninguno (atomicidad)
- El script muestra mensajes informativos (`NOTICE`) durante la ejecución

---

**Fecha de creación**: 2025-05-11
**Versión del sistema**: MotoApp 2.1
**Estado**: ✅ Listo para ejecutar
