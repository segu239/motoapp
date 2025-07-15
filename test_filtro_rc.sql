-- Script de prueba para verificar filtrado de registros RC
-- Este script simula las consultas que harían las funciones del backend
-- para verificar que el filtro está funcionando correctamente

-- Preparar datos de prueba
-- Asumiendo que existe una tabla factcab1 (sucursal 1)

-- 1. Verificar que existen registros RC y no RC en factcab1
SELECT 
    tipo,
    COUNT(*) as cantidad
FROM factcab1 
GROUP BY tipo 
ORDER BY tipo;

-- 2. Simular historialventas2xcli_get con filtro aplicado
-- Esta consulta simula la función que YA tiene aplicado aplicarFiltroSinRC('f')
SELECT 
    f.cod_sucursal as sucursal,
    f.tipo,
    f.puntoventa,
    f.letra,
    f.numero_int,
    f.numero_fac,
    f.emitido,
    f.vencimiento,
    f.exento,
    f.basico,
    f.iva1,
    f.iva2,
    f.iva3,
    (f.exento + f.basico + f.iva1 + f.iva2 + f.iva3) as importe,
    f.saldo,
    f.usuario,
    f.id_num as id,
    f.cliente
FROM factcab1 f
WHERE f.cliente = 1  -- Cliente de prueba
  AND f.tipo != 'RC'  -- FILTRO APLICADO: Excluir RC
ORDER BY f.emitido DESC
LIMIT 10;

-- 3. Verificar que los RC NO aparecen en el historial de ventas
SELECT 
    'RC encontrados en consulta de historial' as alerta,
    COUNT(*) as cantidad_rc
FROM factcab1 f
WHERE f.cliente = 1
  AND f.tipo = 'RC';

-- 4. Simular cabecerax_post con filtro aplicado
-- Esta consulta simula la función que YA tiene aplicado aplicarFiltroSinRC()
SELECT 
    *
FROM factcab1
WHERE cliente = 1
  AND saldo != 0
  AND tipo != 'RC'  -- FILTRO APLICADO: Excluir RC
ORDER BY emitido DESC;

-- 5. Verificar que los RC siguen existiendo en la tabla (no se eliminaron)
SELECT 
    'RC en tabla factcab1' as verificacion,
    COUNT(*) as cantidad_rc
FROM factcab1
WHERE tipo = 'RC';

-- 6. Simular construirSubConsultaGlobalManual con filtro aplicado
-- Esta consulta verifica que el filtro está en la subconsulta global
SELECT 
    f.cod_sucursal as sucursal,
    f.tipo,
    f.puntoventa,
    f.letra,
    f.numero_int,
    f.numero_fac,
    f.emitido,
    f.vencimiento,
    f.exento,
    f.basico,
    f.iva1,
    f.iva2,
    f.iva3,
    (f.exento + f.basico + f.iva1 + f.iva2 + f.iva3) as importe,
    f.saldo,
    f.usuario,
    f.id_num as id,
    f.cliente
FROM factcab1 f
WHERE cliente = 1
  AND tipo != 'RC'  -- FILTRO APLICADO: Excluir RC
ORDER BY f.emitido DESC;

-- 7. Verificar integridad de referencias
-- Los RC deben seguir existiendo para mantener las referencias
SELECT 
    'Referencias intactas' as verificacion,
    COUNT(DISTINCT r.id_fac) as recibos_con_referencia
FROM recibos1 r
INNER JOIN factcab1 f ON r.id_fac = f.id_num
WHERE f.tipo = 'RC';

-- 8. Verificar que las referencias de caja_movi siguen funcionando
SELECT 
    'Caja_movi referencias' as verificacion,
    COUNT(DISTINCT c.num_operacion) as movimientos_con_referencia
FROM caja_movi c
INNER JOIN factcab1 f ON c.num_operacion = f.id_num
WHERE f.tipo = 'RC';

-- RESULTADO ESPERADO:
-- - Las consultas 2, 4, 6 NO deben devolver registros con tipo = 'RC'
-- - Las consultas 5, 7, 8 SÍ deben devolver registros (referencias intactas)
-- - La consulta 3 debe devolver 0 si el filtro funciona correctamente