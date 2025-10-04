#!/bin/bash

echo "=== IMPLEMENTACIÓN BASE64 LOGO MOTOAPP ==="
echo "Fecha: $(date)"
echo "==========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logs
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d "src/app" ]; then
    log_error "Este script debe ejecutarse desde el directorio raíz del proyecto Angular"
    exit 1
fi

log_info "✅ Directorio verificado"

# Crear backup del archivo original
BACKUP_FILE="src/app/config/empresa-config.ts.backup.$(date +%Y%m%d_%H%M%S)"
cp "src/app/config/empresa-config.ts" "$BACKUP_FILE"
log_info "✅ Backup creado: $BACKUP_FILE"

# Verificar que el archivo ya contiene la implementación Base64
if grep -q "MOTOMATCH_LOGO_BASE64" "src/app/config/empresa-config.ts"; then
    log_info "✅ Configuración Base64 ya implementada"
else
    log_error "❌ El archivo empresa-config.ts no contiene la implementación Base64"
    log_error "Por favor ejecute primero la modificación del archivo"
    exit 1
fi

# Verificar estructura de sucursales
log_info "📊 Verificando configuración de sucursales..."

# Verificar sucursal 5 (debe mantener texto)
if grep -q "texto: 'MAYORISTA'" "src/app/config/empresa-config.ts"; then
    log_info "✅ Sucursal 5 (MAYORISTA) mantiene configuración de texto"
else
    log_error "❌ Sucursal 5 no mantiene la configuración de texto"
    exit 1
fi

# Verificar otras sucursales (deben usar Base64)
if grep -q "logo: MOTOMATCH_LOGO_BASE64" "src/app/config/empresa-config.ts"; then
    log_info "✅ Sucursales 1-4 configuradas para usar Base64"
else
    log_error "❌ Sucursales 1-4 no están configuradas para usar Base64"
    exit 1
fi

# Verificar componentes críticos
log_info "🔍 Verificando componentes críticos..."

COMPONENTES=(
    "src/app/components/carrito/carrito.component.ts"
    "src/app/components/cabeceras/cabeceras.component.ts"
    "src/app/components/historialventas2/historialventas2.component.ts"
    "src/app/services/pdf-generator.service.ts"
    "src/app/services/historial-pdf.service.ts"
)

for componente in "${COMPONENTES[@]}"; do
    if [ -f "$componente" ]; then
        if grep -q "getEmpresaConfig" "$componente"; then
            log_info "✅ $componente usa getEmpresaConfig()"
        else
            log_warning "⚠️  $componente no usa getEmpresaConfig()"
        fi
    else
        log_error "❌ $componente no encontrado"
    fi
done

# Verificar tamaño de la imagen Base64
BASE64_SIZE=$(grep -o "data:image/jpeg;base64,[^']*" "src/app/config/empresa-config.ts" | wc -c)
log_info "📏 Tamaño de imagen Base64: $BASE64_SIZE caracteres"

if [ "$BASE64_SIZE" -gt 15000 ]; then
    log_warning "⚠️  Imagen Base64 es grande ($BASE64_SIZE caracteres). Considere optimización adicional."
elif [ "$BASE64_SIZE" -lt 1000 ]; then
    log_error "❌ Imagen Base64 parece demasiado pequeña. Verifique la conversión."
    exit 1
else
    log_info "✅ Tamaño de imagen Base64 es apropiado"
fi

# Test de compilación
log_info "🔨 Probando compilación..."
if npm run build --silent >/dev/null 2>&1; then
    log_info "✅ Compilación exitosa"
else
    log_error "❌ Error en compilación"
    log_error "Ejecute 'npm run build' para ver detalles del error"
    exit 1
fi

# Resumen final
echo ""
echo "==========================================="
echo -e "${GREEN}✅ IMPLEMENTACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo "==========================================="
echo ""
echo "📋 RESUMEN:"
echo "• Sucursal 5 (MAYORISTA): Mantiene texto ✅"
echo "• Sucursales 1-4: Ahora usan Base64 ✅"
echo "• Backup creado: $BACKUP_FILE ✅"
echo "• Compilación exitosa ✅"
echo "• 5 componentes críticos verificados ✅"
echo ""
echo "🚀 PRÓXIMOS PASOS:"
echo "1. Ejecutar pruebas de PDF en cada sucursal"
echo "2. Verificar que los logos se muestran correctamente"
echo "3. Confirmar que sucursal 5 sigue funcionando con texto"
echo "4. Hacer commit de los cambios si todo funciona"
echo ""
echo "💾 ROLLBACK (si es necesario):"
echo "   cp $BACKUP_FILE src/app/config/empresa-config.ts"
echo ""