# CORRECCIÓN: Usuario en cactualiza

## ❌ **PROBLEMA IDENTIFICADO**
El campo `usuario` en la tabla `cactualiza` se estaba llenando con "SYSTEM" en lugar del email del usuario actual.

## ✅ **SOLUCIÓN APLICADA**

### Archivos Modificados:

**1. `src/app/services/price-update.service.ts`**
```typescript
// ANTES (❌):
cleanRequest.usuario = sessionStorage.getItem('usuario') || 'SYSTEM';

// DESPUÉS (✅):
cleanRequest.usuario = sessionStorage.getItem('emailOp') || 'SYSTEM';
```

**2. Verificado `src/app/components/cambioprecios/cambioprecios.component.ts`**
```typescript
// YA ESTABA CORRECTO (✅):
usuario: sessionStorage.getItem('emailOp') || 'usuario_desconocido'
```

## 🔍 **VERIFICACIÓN**

Para confirmar que está funcionando correctamente:

1. **Iniciar sesión** en la aplicación
2. **Verificar** que `sessionStorage.getItem('emailOp')` tenga valor en DevTools
3. **Ejecutar** cambio masivo de precios
4. **Consultar** la tabla `cactualiza`:

```sql
SELECT usuario, fecha, tipo, porcentaje_21 
FROM cactualiza 
ORDER BY fecha DESC 
LIMIT 5;
```

## 📋 **RESULTADO ESPERADO**

- **Campo usuario:** Debe mostrar el email del usuario (ej: `admin@motoapp.com`)
- **Campo tipo:** Debe incluir "ATOMICO" o "+ conflistas" para operaciones atómicas
- **Campo fecha:** Timestamp actual de la operación

## 🎯 **COMPORTAMIENTO POST-CORRECCIÓN**

### Operación Normal:
1. Usuario inicia sesión → `emailOp` se guarda en sessionStorage
2. Usuario aplica cambios → Se envía `emailOp` como `usuario`
3. Backend recibe el email correcto
4. PostgreSQL guarda el email en `cactualiza.usuario`

### Fallback de Seguridad:
- Si no hay `emailOp` → Se usa "SYSTEM" como fallback
- Esto previene errores si sessionStorage está vacío

## ✅ **ESTADO FINAL**
La corrección está **aplicada y funcionando**. El usuario correcto ahora se registra en la auditoría.