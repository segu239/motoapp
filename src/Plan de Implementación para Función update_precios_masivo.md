Informe: Plan de Implementación para Función update_precios_masivo()

  Basado en el análisis completo de los documentos, genero el siguiente plan para crear la función
  PostgreSQL update_precios_masivo() que completará el sistema al 100%.

  🎯 Estado Actual Validado

  Sistema 95% Funcional con componentes críticos probados:
  - ✅ Preview funcionando perfectamente: 4,137 productos OSAKA procesados
  - ✅ Función base validada: funcion_preview_cambios_precios_CORREGIDA_FINAL.sql
  - ✅ Sintaxis PostgreSQL 9.4 probada: Concatenación manual JSON, escape de comillas
  - ✅ Frontend completamente optimizado: Filtros únicos, tabla expandida, validación de sucursal

  📋 Plan de Implementación Detallado

  Paso 1: Crear Función PostgreSQL update_precios_masivo() 🔥 [URGENTE]

  Características Técnicas Obligatorias:

  1. Basarse en sintaxis probada de funcion_preview_cambios_precios_CORREGIDA_FINAL.sql
  2. Usar técnicas validadas:
    - Concatenación manual JSON (||)
    - Escape de comillas: REPLACE(SQLERRM, '"', '\"')
    - Validaciones NULL con COALESCE
  3. Estructura de la función:

  CREATE OR REPLACE FUNCTION update_precios_masivo(
      p_marca VARCHAR DEFAULT NULL,
      p_proveedor INTEGER DEFAULT NULL,
      p_rubro VARCHAR DEFAULT NULL,
      p_cod_iva INTEGER DEFAULT NULL,
      p_tipo_modificacion VARCHAR DEFAULT 'costo', -- 'costo' o 'final'
      p_porcentaje NUMERIC DEFAULT 0,
      p_sucursal INTEGER DEFAULT 1,
      p_usuario VARCHAR DEFAULT 'SYSTEM'
  ) RETURNS TEXT AS $$

  Componentes Críticos a Implementar:

  A. Validaciones Iniciales (Basadas en preview funcionando):

  -- 1. Validar porcentaje ≠ 0
  IF p_porcentaje = 0 THEN
      RETURN '{"success":false,"message":"Debe especificar un porcentaje diferente de 0"}';
  END IF;

  -- 2. Determinar depósito según sucursal
  v_cod_deposito := CASE WHEN p_sucursal = 5 THEN 2 ELSE 1 END;

  -- 3. Validar al menos un filtro
  IF COALESCE(p_marca, '') = '' AND COALESCE(p_proveedor, 0) = 0
     AND COALESCE(p_rubro, '') = '' AND COALESCE(p_cod_iva, 0) = 0 THEN
      RETURN '{"success":false,"message":"Debe especificar al menos un filtro"}';
  END IF;

  B. Registro de Auditoría en cactualiza (Transacción ACID):

  -- Crear cabecera de actualización
  INSERT INTO cactualiza (
      tipo,
      porcentaje_21,
      precio_costo,
      precio_venta,
      fecha,
      usuario,
      id_marca,
      id_proveedor,
      id_rubro
  ) VALUES (
      p_tipo_modificacion,
      p_porcentaje,
      CASE WHEN p_tipo_modificacion = 'costo' THEN 1 ELSE 0 END,
      CASE WHEN p_tipo_modificacion = 'final' THEN 1 ELSE 0 END,
      NOW(),
      p_usuario,
      p_marca,
      p_proveedor,
      p_rubro
  ) RETURNING id_act INTO v_id_act;

  C. Actualización Masiva de Precios (Con misma lógica del preview):

  -- Loop por cada registro que coincida con filtros
  FOR rec IN (
      SELECT a.id_articulo, a.cd_articulo, a.nomart, a.precostosi, a.precon,
             COALESCE(iva.alicuota1, 21) as alicuota_iva
      FROM artsucursal a
      LEFT JOIN artiva iva ON a.cod_iva = iva.cod_iva
      WHERE a.cod_deposito = v_cod_deposito
        AND (p_marca IS NULL OR UPPER(a.marca) = UPPER(p_marca))
        AND (p_proveedor IS NULL OR a.cd_proveedor = p_proveedor)
        AND (p_rubro IS NULL OR UPPER(a.rubro) = UPPER(p_rubro))
        AND (p_cod_iva IS NULL OR a.cod_iva = p_cod_iva)
  ) LOOP

      -- Calcular precios según tipo de modificación
      IF p_tipo_modificacion = 'costo' THEN
          v_precio_costo_nuevo := COALESCE(rec.precostosi, 0) * (1 + p_porcentaje / 100.0);
          v_precio_final_nuevo := v_precio_costo_nuevo * (1 + rec.alicuota_iva / 100.0);
      ELSE
          v_precio_final_nuevo := COALESCE(rec.precon, 0) * (1 + p_porcentaje / 100.0);
          v_precio_costo_nuevo := v_precio_final_nuevo / (1 + rec.alicuota_iva / 100.0);
      END IF;

      -- Registrar en dactualiza ANTES del cambio
      INSERT INTO dactualiza (
          id_act, articulo, nombre,
          pcosto, precio, pfinal,
          pcoston, precion, pfinaln,
          fecha
      ) VALUES (
          v_id_act, rec.cd_articulo, rec.nomart,
          COALESCE(rec.precostosi, 0), COALESCE(rec.precon, 0), COALESCE(rec.precon, 0),
          v_precio_costo_nuevo, v_precio_final_nuevo, v_precio_final_nuevo,
          NOW()
      );

      -- Actualizar precios en artsucursal
      UPDATE artsucursal
      SET precostosi = v_precio_costo_nuevo,
          precon = v_precio_final_nuevo
      WHERE id_articulo = rec.id_articulo;

      v_count := v_count + 1;

  END LOOP;

  D. Manejo de Errores y Rollback (Crítico):

  EXCEPTION WHEN OTHERS THEN
      -- Rollback automático por PostgreSQL
      RETURN '{"success":false,"message":"Error: ' || REPLACE(SQLERRM, '"', '\"') ||
  '","registros_modificados":0}';
  END;

  Paso 2: Testing Inmediato con Datos Reales

  Probar con caso exitoso del preview:
  -- Probar con marca OSAKA (4,137 productos detectados en preview)
  SELECT update_precios_masivo(
      p_marca := 'OSAKA',
      p_tipo_modificacion := 'costo',
      p_porcentaje := 1.0,  -- Solo 1% para testing seguro
      p_sucursal := 1,
      p_usuario := 'TEST_USER'
  );

  Validaciones del testing:
  1. ✅ Verificar transacciones ACID completas
  2. ✅ Confirmar registros en cactualiza y dactualiza
  3. ✅ Validar rollback automático ante errores
  4. ✅ Probar con diferentes filtros y tipos

  Paso 3: Integración con Frontend Existente

  El endpoint PHP PriceUpdate_post() ya está listo, solo requiere:

  // En Descarga.php - PriceUpdate_post()
  $result = $this->db->query("SELECT update_precios_masivo(?, ?, ?, ?, ?, ?, ?, ?)", [
      $request->marca ?? null,
      $request->cd_proveedor ?? null,
      $request->rubro ?? null,
      $request->cod_iva ?? null,
      $request->tipo_modificacion ?? 'costo',
      $request->porcentaje ?? 0,
      $request->sucursal ?? 1,
      $request->usuario ?? 'SYSTEM'
  ]);

  🚀 Archivos a Crear

  Archivo Principal: funcion_update_precios_masivo_FINAL.sql

  Estructura completa usando sintaxis validada:
  - Declaraciones con escape correcto
  - Concatenación JSON manual
  - Validaciones NULL obligatorias
  - Transacciones implícitas PostgreSQL

  Archivo de Testing: test_update_masivo.sql

  Casos de prueba:
  -- Test 1: Actualización exitosa
  SELECT update_precios_masivo('OSAKA', NULL, NULL, NULL, 'costo', 1.0, 1, 'TEST');

  -- Test 2: Rollback por error
  SELECT update_precios_masivo('MARCA_INEXISTENTE', NULL, NULL, NULL, 'costo', 1.0, 1, 'TEST');

  -- Test 3: Validación porcentaje 0
  SELECT update_precios_masivo('OSAKA', NULL, NULL, NULL, 'costo', 0, 1, 'TEST');

  ⏰ Tiempo Estimado

  Total: 2-4 horas focalizadas

  1. Crear función (1-2 horas): Usar sintaxis probada del preview
  2. Testing inicial (30 min): Validar con datos reales
  3. Ajustes y optimización (30 min): Corregir issues menores
  4. Testing completo (30-60 min): Validar flujo end-to-end

  ✅ Resultado Final Esperado

  Sistema 100% Funcional con:
  - ✅ Preview perfecto (ya funcionando)
  - ✅ Aplicación de cambios masivos (nueva función)
  - ✅ Auditoría completa (cactualiza + dactualiza)
  - ✅ Rollback automático ante errores
  - ✅ Frontend completamente optimizado

  El sistema será completamente operacional para cambios masivos de precios con máxima seguridad y
  rendimiento.

● Update Todos
  ⎿  ☒ Analizar documentos cambioprecios.md y cambioprecios_continuar.md
     ☒ Crear informe con plan de implementación para función update_precios_masivo()
     ☒ Basar la función en sintaxis validada de preview funcionando
     ☒ Incluir validaciones NULL con COALESCE y escape de comillas
     ☒ Integrar registro de auditoría en cactualiza y dactualiza

● El informe está completo. Basándome en el análisis detallado de ambos documentos, la situación es muy
  favorable:

  Sistema actual: 95% funcional y completamente optimizado con preview trabajando perfectamente (4,137
  productos OSAKA procesados exitosamente).

  Única función faltante: update_precios_masivo() que debe seguir exactamente la sintaxis probada de la
  función de preview que ya funciona.

  Plan clave:
  1. Usar sintaxis validada de funcion_preview_cambios_precios_CORREGIDA_FINAL.sql
  2. Mantener técnicas probadas: concatenación JSON manual, escape de comillas con REPLACE(SQLERRM, '"',
  '\"')
  3. Incluir auditoría ACID en cactualiza y dactualiza
  4. Testing inmediato con datos reales OSAKA