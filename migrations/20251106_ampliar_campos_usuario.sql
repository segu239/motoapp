-- ============================================================================
-- MIGRACIÓN: AMPLIAR CAMPOS DE USUARIO EN PEDIDOITEM Y PEDIDOSCB
-- ============================================================================
-- Fecha: 2025-11-06
-- Autor: Claude Code
-- Descripción: Ampliar campos usuario de 10/30 caracteres a 50 caracteres
--              para soportar emails completos
-- Relacionado: ANALISIS_PROBLEMA_USUARIO_ALTAS.md
-- ============================================================================

-- PROBLEMA ORIGINAL:
-- - pedidoitem.usuario_res: character(10) ← Demasiado corto para emails
-- - pedidoitem.usuario_cancelacion: character(10) ← Demasiado corto
-- - pedidoscb.usuario: character(30) ← Inconsistente
-- - pedidoscb.usuario_cancelacion: character(10) ← Demasiado corto
--
-- Ejemplo de error:
-- Email: 'segu239@hotmail.com' (19 caracteres)
-- Error: "el valor es demasiado largo para el tipo character(10)"

-- ============================================================================
-- TABLA: pedidoitem
-- ============================================================================

-- Ampliar usuario_res de character(10) a character(50)
ALTER TABLE pedidoitem
ALTER COLUMN usuario_res TYPE character(50);

-- Ampliar usuario_cancelacion de character(10) a character(50)
ALTER TABLE pedidoitem
ALTER COLUMN usuario_cancelacion TYPE character(50);

-- ============================================================================
-- TABLA: pedidoscb
-- ============================================================================

-- Ampliar usuario de character(30) a character(50)
ALTER TABLE pedidoscb
ALTER COLUMN usuario TYPE character(50);

-- Ampliar usuario_cancelacion de character(10) a character(50)
ALTER TABLE pedidoscb
ALTER COLUMN usuario_cancelacion TYPE character(50);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que los cambios se aplicaron correctamente
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('pedidoitem', 'pedidoscb')
  AND column_name LIKE '%usuario%'
ORDER BY table_name, column_name;

-- Resultado esperado:
-- table_name  | column_name          | data_type | character_maximum_length
-- ------------+----------------------+-----------+-------------------------
-- pedidoitem  | usuario_cancelacion  | character | 50
-- pedidoitem  | usuario_res          | character | 50
-- pedidoscb   | usuario              | character | 50
-- pedidoscb   | usuario_cancelacion  | character | 50

-- ============================================================================
-- IMPACTO EN DATOS EXISTENTES
-- ============================================================================

-- Los datos existentes NO se pierden:
-- - character(10) con espacios → character(50) con más espacios
-- - Ejemplo: 'luis      ' → 'luis                                              '
-- - El .trim() en el frontend maneja correctamente estos espacios

-- ============================================================================
-- BENEFICIOS
-- ============================================================================

-- ✅ Soporta emails completos (hasta 50 caracteres)
-- ✅ Consistencia entre todas las columnas de usuario
-- ✅ Mejora trazabilidad y auditoría
-- ✅ Evita errores de truncamiento
-- ✅ No destructivo: datos existentes se preservan

-- ============================================================================
-- ROLLBACK (solo si es absolutamente necesario)
-- ============================================================================

-- ⚠️ ADVERTENCIA: Esto puede causar pérdida de datos si hay emails > 10 caracteres
-- Solo ejecutar si la migración falló y no hay datos nuevos

-- ALTER TABLE pedidoitem ALTER COLUMN usuario_res TYPE character(10);
-- ALTER TABLE pedidoitem ALTER COLUMN usuario_cancelacion TYPE character(10);
-- ALTER TABLE pedidoscb ALTER COLUMN usuario TYPE character(30);
-- ALTER TABLE pedidoscb ALTER COLUMN usuario_cancelacion TYPE character(10);

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
