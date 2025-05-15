# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con código en este repositorio.

# Guía para trabajar con MotoApp

Este documento proporciona la información esencial para trabajar con el proyecto MotoApp, una aplicación desarrollada en Angular con Firebase como backend.

## Información General

- **Nombre del Proyecto**: MotoApp
- **Versión de Angular**: 15.2.6 (Angular CLI: 15.2.6)
- **Base de Datos**: Firebase Realtime Database
- **Autenticación**: Firebase Authentication

## Comandos Principales

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
# o alternativamente
ng serve

# Compilar el proyecto
npm run build
# o alternativamente
ng build

# Ejecutar modo watch para desarrollo
npm run watch
# o alternativamente
ng build --watch --configuration development

# Ejecutar tests
npm test
# o alternativamente
ng test
```

## Arquitectura del Proyecto

MotoApp es una aplicación Angular que implementa un sistema de gestión completo con múltiples módulos. La aplicación sigue una arquitectura modular con los siguientes componentes principales:

### Estructura de Carpetas

- `/src/app/components`: Contiene todos los componentes de la aplicación
- `/src/app/services`: Servicios para lógica de negocio y acceso a datos
- `/src/app/interfaces`: Interfaces TypeScript para tipado fuerte
- `/src/app/guards`: Guards para protección de rutas
- `/src/app/pipes`: Pipes personalizados para transformación de datos
- `/src/app/shared`: Componentes compartidos (header, footer, sidebar)
- `/src/`: Se incorporan Carga.php.txt y Descarga.php.txt, son los archivos del backend. 

### Módulos Principales

La aplicación se estructura en torno a los siguientes módulos y funcionalidades:

1. **Autenticación y Gestión de Usuarios**
   - Sistema de roles: SUPER, ADMIN, USER
   - Protección de rutas según nivel de usuario

2. **Gestión de Productos**
   - Catálogo de artículos
   - Gestión de inventario
   - Marcas, rubros y categorías

3. **Ventas y Punto de Venta**
   - Carrito de compras
   - Procesamiento de transacciones
   - Condiciones de venta

4. **Gestión Financiera**
   - Caja y movimientos
   - Análisis de ventas
   - Tipos de monedas y cambio

5. **Gestión de Stock**
   - Pedidos de stock
   - Envíos entre sucursales
   - Recepción de mercadería

## Integración con Firebase

### Autenticación

La aplicación utiliza Firebase Authentication para el manejo de usuarios y sesiones:

- Inicio de sesión con email/password
- Gestión de roles a través de la Realtime Database
- Sistema de protección de rutas basado en roles

### Base de Datos

La aplicación utiliza Firebase Realtime Database para almacenar:

- Información de usuarios
- Catálogo de productos
- Transacciones de ventas
- Datos de clientes y proveedores
- Configuraciones de la aplicación

La aplicacion utiliza codeigniter para interactuar con la base de datos postgres, una copia de los archivos estan en src/ se llaman Carga.php.txt y Descarga.php.txt

## Convenciones del Proyecto

### Estructura de Componentes

Cada funcionalidad principal sigue una estructura similar con componentes para:
- Lista principal (ejemplo: `articulos.component`)
- Creación (ejemplo: `newarticulo.component`)
- Edición (ejemplo: `editarticulo.component`)

### Patrón de Servicios

- `crud.service.ts`: Proporciona funcionalidades básicas CRUD para interactuar con Firebase
- `auth.service.ts`: Gestiona la autenticación y roles de usuario
- Servicios adicionales para funcionalidades específicas

### Sistema de Roles

La aplicación implementa tres niveles de acceso:
- **SUPER**: Acceso completo a todas las funcionalidades
- **ADMIN**: Acceso a gestión general sin configuraciones críticas
- **USER**: Acceso operativo limitado

### Sistema de Rutas

El enrutamiento está configurado en `app-routing.module.ts` y todas las rutas protegidas están dentro del componente padre `PagesComponent` que implementa el layout principal con:
- Header
- Sidebar
- Footer

## Patrones de Desarrollo

1. **Protección de Rutas**: Uso de guards para verificar autenticación y roles
2. **Servicios Reactivos**: Uso extensivo de Observable para manejar datos en tiempo real
3. **Componentes Modulares**: Cada funcionalidad dividida en componentes independientes
4. **Interfaces Tipadas**: Uso de interfaces TypeScript para asegurar la integridad de datos

## Bibliotecas Externas Principales

- **PrimeNG**: Para componentes de UI (tables, dropdowns, buttons, etc.) - v15.4.1
- **SweetAlert2**: Para alertas y confirmaciones - v11.7.32
- **jsPDF/pdfmake**: Para generación de documentos PDF - v2.5.1/v0.2.9
- **XLSX**: Para exportación a Excel - v0.18.5
- **CryptoJS**: Para encriptación de datos sensibles - v4.1.1

## Consideraciones Importantes

1. **Configuración de Firebase**: El proyecto ya está configurado para usar Firebase; no es necesario modificar `environment.ts` a menos que se cambie el proyecto Firebase.

2. **Sistema de autenticación híbrido**: La aplicación usa Firebase Authentication junto con datos extendidos guardados en Realtime Database.

3. **Sistema de diseño**: La aplicación utiliza PrimeNG para componentes de UI junto con estilos personalizados.

4. **Cache de artículos**: El proyecto implementa un sistema de cache para artículos, documentado en `src/INFORME_CACHE_ARTICULOS.md`.

5. **Responder en español**: Las interacciones con los usuarios deben ser en español, ya que es el idioma principal de la aplicación.

6. **Postgres**: Siempre que diga ingresa a postgres Ingresaras a la base utilizando el MCP postgres.
