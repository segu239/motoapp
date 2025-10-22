-- ============================================================================
-- SCRIPT: Implementación Alternativa C - Granularidad Cajamovi
-- Fecha: 14 de Octubre de 2025
-- Descripción: Crea tabla caja_movi_detalle, trigger de validación y vista
-- Proyecto: MotoApp
-- ============================================================================

-- ============================================================================
-- PASO 0: PREPARAR TABLA tarjcredito (Agregar restricción UNIQUE a cod_tarj)
-- ============================================================================

-- Verificar si hay valores duplicados en cod_tarj
DO $$
DECLARE
    duplicados_count INTEGER;
    r RECORD;  -- ✓ AGREGADO: Variable para el bucle FOR
BEGIN
    SELECT COUNT(*)
    INTO duplicados_count
    FROM (
        SELECT cod_tarj, COUNT(*) as cuenta
        FROM tarjcredito
        GROUP BY cod_tarj
        HAVING COUNT(*) > 1
    ) duplicados;

    IF duplicados_count > 0 THEN
        RAISE WARNING 'ATENCIÓN: Se encontraron % valores duplicados en tarjcredito.cod_tarj. Se recomienda revisar antes de continuar.', duplicados_count;

        -- Mostrar los duplicados
        RAISE NOTICE 'Valores duplicados en cod_tarj:';
        FOR r IN
            SELECT cod_tarj, COUNT(*) as cantidad
            FROM tarjcredito
            GROUP BY cod_tarj
            HAVING COUNT(*) > 1
            ORDER BY cod_tarj
        LOOP
            RAISE NOTICE '  cod_tarj = %, cantidad = %', r.cod_tarj, r.cantidad;
        END LOOP;
    ELSE
        RAISE NOTICE '✓ No se encontraron duplicados en tarjcredito.cod_tarj';
    END IF;
END $$;

-- Agregar restricción UNIQUE a cod_tarj
-- NOTA: Si hay duplicados, este comando fallará y deberás resolver los duplicados primero
DO $$
BEGIN
    -- Verificar si la constraint ya existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_tarjcredito_cod_tarj'
        AND table_name = 'tarjcredito'
    ) THEN
        ALTER TABLE tarjcredito
            ADD CONSTRAINT uq_tarjcredito_cod_tarj UNIQUE (cod_tarj);

        RAISE NOTICE '✓ Restricción UNIQUE agregada a tarjcredito.cod_tarj';
    ELSE
        RAISE NOTICE '⚠ La restricción uq_tarjcredito_cod_tarj ya existe, omitiendo...';
    END IF;
END $$;

COMMENT ON CONSTRAINT uq_tarjcredito_cod_tarj ON tarjcredito IS
    'Garantiza que cod_tarj sea único. Necesario para Foreign Keys desde otras tablas.';

-- ============================================================================
-- PASO 1: CREAR TABLA caja_movi_detalle
-- ============================================================================

CREATE TABLE IF NOT EXISTS caja_movi_detalle (
    -- Identificador único del detalle
    id_detalle SERIAL PRIMARY KEY,

    -- Referencia al movimiento padre en caja_movi
    id_movimiento INTEGER NOT NULL,

    -- Código de tarjeta/método de pago
    cod_tarj INTEGER NOT NULL,

    -- Importe del detalle (debe ser positivo)
    importe_detalle NUMERIC(15,2) NOT NULL,

    -- Porcentaje que representa del total (opcional, calculado)
    porcentaje NUMERIC(5,2) DEFAULT NULL,

    -- Auditoría: fecha de creación del registro
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- ========================================================================
    -- CONSTRAINTS (Restricciones de integridad)
    -- ========================================================================

    -- Foreign Key a caja_movi con CASCADE delete
    -- Si se elimina el movimiento padre, se eliminan los detalles automáticamente
    CONSTRAINT fk_caja_movi
        FOREIGN KEY (id_movimiento)
        REFERENCES caja_movi(id_movimiento)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Foreign Key a tarjcredito
    -- No permite eliminar una tarjeta que tiene movimientos asociados
    CONSTRAINT fk_tarjeta
        FOREIGN KEY (cod_tarj)
        REFERENCES tarjcredito(cod_tarj)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- El importe debe ser positivo
    CONSTRAINT ck_importe_positivo
        CHECK (importe_detalle > 0),

    -- El porcentaje debe estar entre 0 y 100, o ser NULL
    CONSTRAINT ck_porcentaje_valido
        CHECK (porcentaje IS NULL OR (porcentaje >= 0 AND porcentaje <= 100)),

    -- Un movimiento no puede tener dos registros con la misma tarjeta
    -- (evita duplicados accidentales)
    CONSTRAINT uq_movimiento_tarjeta
        UNIQUE (id_movimiento, cod_tarj)
);

-- ============================================================================
-- PASO 2: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índice principal: buscar detalles por movimiento (usado en JOINs)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_detalle_movimiento'
    ) THEN
        CREATE INDEX idx_caja_movi_detalle_movimiento
        ON caja_movi_detalle(id_movimiento);
        RAISE NOTICE '✓ Índice idx_caja_movi_detalle_movimiento creado';
    ELSE
        RAISE NOTICE '⚠ Índice idx_caja_movi_detalle_movimiento ya existe';
    END IF;
END $$;

-- Índice: buscar movimientos por tipo de tarjeta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_detalle_tarjeta'
    ) THEN
        CREATE INDEX idx_caja_movi_detalle_tarjeta
        ON caja_movi_detalle(cod_tarj);
        RAISE NOTICE '✓ Índice idx_caja_movi_detalle_tarjeta creado';
    ELSE
        RAISE NOTICE '⚠ Índice idx_caja_movi_detalle_tarjeta ya existe';
    END IF;
END $$;

-- Índice: buscar por fecha de registro (para reportes históricos)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_detalle_fecha'
    ) THEN
        CREATE INDEX idx_caja_movi_detalle_fecha
        ON caja_movi_detalle(fecha_registro);
        RAISE NOTICE '✓ Índice idx_caja_movi_detalle_fecha creado';
    ELSE
        RAISE NOTICE '⚠ Índice idx_caja_movi_detalle_fecha ya existe';
    END IF;
END $$;

-- Índice compuesto: consultas combinadas movimiento + tarjeta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_caja_movi_detalle_mov_tarj'
    ) THEN
        CREATE INDEX idx_caja_movi_detalle_mov_tarj
        ON caja_movi_detalle(id_movimiento, cod_tarj);
        RAISE NOTICE '✓ Índice idx_caja_movi_detalle_mov_tarj creado';
    ELSE
        RAISE NOTICE '⚠ Índice idx_caja_movi_detalle_mov_tarj ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 3: COMENTARIOS EN LA TABLA (Documentación)
-- ============================================================================

COMMENT ON TABLE caja_movi_detalle IS
    'Desglose de movimientos de caja por método de pago (Alternativa C - Híbrida). Cada registro representa el importe parcial de un movimiento pagado con un método específico.';

COMMENT ON COLUMN caja_movi_detalle.id_detalle IS
    'Identificador único del detalle (autoincremental)';

COMMENT ON COLUMN caja_movi_detalle.id_movimiento IS
    'ID del movimiento padre en caja_movi. Se elimina automáticamente si se elimina el movimiento (CASCADE)';

COMMENT ON COLUMN caja_movi_detalle.cod_tarj IS
    'Código de tarjeta/método de pago (FK a tarjcredito)';

COMMENT ON COLUMN caja_movi_detalle.importe_detalle IS
    'Importe pagado con este método. La suma de todos los detalles de un movimiento debe igualar caja_movi.importe_mov';

COMMENT ON COLUMN caja_movi_detalle.porcentaje IS
    'Porcentaje que representa este importe del total del movimiento (calculado, opcional)';

COMMENT ON COLUMN caja_movi_detalle.fecha_registro IS
    'Fecha y hora de creación del registro (auditoría)';

-- ============================================================================
-- PASO 4: TRIGGER DE VALIDACIÓN DE INTEGRIDAD
-- ============================================================================

-- Función que valida que la suma de detalles = total del movimiento
CREATE OR REPLACE FUNCTION validar_suma_detalles_cajamovi()
RETURNS TRIGGER AS $$
DECLARE
    suma_detalles NUMERIC(15,2);
    total_movimiento NUMERIC(15,2);
    diferencia NUMERIC(15,2);
    tolerancia CONSTANT NUMERIC(15,2) := 0.01; -- Tolerancia de 1 centavo
BEGIN
    -- 1. Calcular suma de todos los detalles del movimiento
    SELECT COALESCE(SUM(importe_detalle), 0)
    INTO suma_detalles
    FROM caja_movi_detalle
    WHERE id_movimiento = NEW.id_movimiento;

    -- 2. Obtener el total del movimiento padre
    SELECT importe_mov
    INTO total_movimiento
    FROM caja_movi
    WHERE id_movimiento = NEW.id_movimiento;

    -- 3. Validar que exista el movimiento padre
    IF total_movimiento IS NULL THEN
        RAISE EXCEPTION
            'Error: No existe el movimiento con id_movimiento = %',
            NEW.id_movimiento;
    END IF;

    -- 4. Calcular diferencia absoluta
    diferencia := ABS(suma_detalles - total_movimiento);

    -- 5. Validar con tolerancia de redondeo
    IF diferencia > tolerancia THEN
        RAISE EXCEPTION
            'ERROR DE INTEGRIDAD: La suma de detalles ($%) no coincide con el total del movimiento ($%). Diferencia: $%. Movimiento ID: %',
            suma_detalles,
            total_movimiento,
            diferencia,
            NEW.id_movimiento
        USING HINT = 'Verifique que los importes de los detalles sumen exactamente el total del movimiento.';
    END IF;

    -- 6. Validación exitosa
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta DESPUÉS de INSERT o UPDATE en caja_movi_detalle
DROP TRIGGER IF EXISTS trg_validar_suma_detalles ON caja_movi_detalle;

CREATE TRIGGER trg_validar_suma_detalles
    AFTER INSERT OR UPDATE ON caja_movi_detalle
    FOR EACH ROW
    EXECUTE PROCEDURE validar_suma_detalles_cajamovi();  -- PROCEDURE en lugar de FUNCTION para compatibilidad con PostgreSQL < 11

-- ============================================================================
-- PASO 5: VISTA OPTIMIZADA PARA CONSULTAS
-- ============================================================================

-- Vista que combina caja_movi con sus detalles y nombres de tarjetas
CREATE OR REPLACE VIEW v_cajamovi_con_desglose AS
SELECT
    -- Campos de caja_movi (movimiento principal)
    cm.id_movimiento,
    cm.sucursal,
    cm.codigo_mov,
    cm.num_operacion,
    cm.fecha_mov,
    cm.importe_mov AS total_movimiento,
    cm.descripcion_mov,
    cm.tipo_movi,
    cm.caja,
    cm.tipo_comprobante,
    cm.numero_comprobante,
    cm.cliente,
    cm.usuario,

    -- Campos de caja_movi_detalle (desglose por método de pago)
    cmd.id_detalle,
    cmd.cod_tarj,
    cmd.importe_detalle,
    cmd.porcentaje,
    cmd.fecha_registro AS fecha_detalle,

    -- Campos de tarjcredito (información del método de pago)
    tc.tarjeta AS nombre_tarjeta,
    tc.id_forma_pago,

    -- Campos de caja_conceptos (descripción del concepto)
    cc.descripcion AS descripcion_concepto,

    -- Campos de caja_lista (descripción de la caja)
    cl.descripcion AS descripcion_caja

FROM caja_movi cm
    -- LEFT JOIN para incluir movimientos sin detalles (compatibilidad hacia atrás)
    LEFT JOIN caja_movi_detalle cmd ON cm.id_movimiento = cmd.id_movimiento
    LEFT JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
    LEFT JOIN caja_conceptos cc ON cm.codigo_mov = cc.id_concepto
    LEFT JOIN caja_lista cl ON cm.caja = cl.id_caja;

-- Comentario en la vista
COMMENT ON VIEW v_cajamovi_con_desglose IS
    'Vista que combina movimientos de caja con sus detalles por método de pago. Incluye nombres de tarjetas, conceptos y cajas. Compatible con movimientos antiguos sin desglose (LEFT JOIN).';

-- ============================================================================
-- PASO 6: FUNCIÓN DE AYUDA PARA REPORTES
-- ============================================================================

-- Función que retorna el desglose de un movimiento en formato JSON
CREATE OR REPLACE FUNCTION obtener_desglose_movimiento(p_id_movimiento INTEGER)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'cod_tarj', cmd.cod_tarj,
            'nombre_tarjeta', tc.tarjeta,
            'importe_detalle', cmd.importe_detalle,
            'porcentaje', cmd.porcentaje
        )
    )
    INTO resultado
    FROM caja_movi_detalle cmd
    LEFT JOIN tarjcredito tc ON cmd.cod_tarj = tc.cod_tarj
    WHERE cmd.id_movimiento = p_id_movimiento;

    -- Si no hay detalles, retornar array vacío
    RETURN COALESCE(resultado, '[]'::json);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_desglose_movimiento(INTEGER) IS
    'Retorna el desglose de métodos de pago de un movimiento en formato JSON. Útil para reportes y exportaciones.';

-- ============================================================================
-- PASO 7: VALIDACIÓN DE LA INSTALACIÓN
-- ============================================================================

-- Verificar que la tabla se creó correctamente
DO $$
DECLARE
    tabla_existe BOOLEAN;
    trigger_existe BOOLEAN;
    vista_existe BOOLEAN;
BEGIN
    -- Verificar tabla
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'caja_movi_detalle'
    ) INTO tabla_existe;

    -- Verificar trigger
    SELECT EXISTS (
        SELECT FROM information_schema.triggers
        WHERE trigger_name = 'trg_validar_suma_detalles'
    ) INTO trigger_existe;

    -- Verificar vista
    SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'v_cajamovi_con_desglose'
    ) INTO vista_existe;

    -- Mostrar resultados
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VALIDACIÓN DE INSTALACIÓN - Alternativa C';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tabla caja_movi_detalle: %', CASE WHEN tabla_existe THEN '✓ CREADA' ELSE '✗ ERROR' END;
    RAISE NOTICE 'Trigger trg_validar_suma_detalles: %', CASE WHEN trigger_existe THEN '✓ CREADO' ELSE '✗ ERROR' END;
    RAISE NOTICE 'Vista v_cajamovi_con_desglose: %', CASE WHEN vista_existe THEN '✓ CREADA' ELSE '✗ ERROR' END;
    RAISE NOTICE '==============================================';

    IF tabla_existe AND trigger_existe AND vista_existe THEN
        RAISE NOTICE 'INSTALACIÓN EXITOSA ✓';
    ELSE
        RAISE WARNING 'INSTALACIÓN INCOMPLETA - Revisar errores';
    END IF;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Resumen de objetos creados:
-- ✓ Tabla: caja_movi_detalle
-- ✓ 4 Índices (movimiento, tarjeta, fecha, compuesto)
-- ✓ 1 Función: validar_suma_detalles_cajamovi()
-- ✓ 1 Trigger: trg_validar_suma_detalles
-- ✓ 1 Vista: v_cajamovi_con_desglose
-- ✓ 1 Función auxiliar: obtener_desglose_movimiento()
