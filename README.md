# Sistema de Gestión para Negocios Pequeños

Una aplicación web completa para administrar negocios y tiendas pequeñas, desarrollada con HTML, CSS, JavaScript Vanilla y Supabase como backend.

## 🚀 Características Principales

### 🔐 Sistema de Autenticación
- Registro e inicio de sesión con email/contraseña
- Autenticación con Google OAuth
- Gestión segura de sesiones
- Protección de rutas

### 📦 Gestión de Productos
- CRUD completo de productos
- Upload de imágenes a Supabase Storage
- Categorización y filtros
- Búsqueda en tiempo real
- Paginación dinámica

### 📊 Control de Inventario
- Seguimiento de stock en tiempo real
- Ajustes de inventario con historial
- Alertas de stock bajo
- Métricas y reportes
- Exportación de datos

### 💰 Sistema de Ventas
- Registro de ventas con múltiples productos
- Dashboard con métricas
- Reportes de ventas
- Múltiples métodos de pago

### 🛒 Gestión de Pedidos
- Sistema de pedidos online
- Estados de pedidos (Pendiente, En Proceso, Listo, Entregado)
- Información de cliente y entrega
- Cálculo de costos de envío

### 🚚 Control de Entregas
- Gestión de domicilios
- Seguimiento de entregas
- Asignación de repartidores
- Notificaciones de estado

### 👥 Base de Datos de Clientes
- Gestión completa de clientes
- Historial de compras
- Segmentación de clientes
- Métricas de fidelización

### ✅ Tareas Personales
- Sistema de gestión de tareas
- Prioridades y categorías
- Fechas límite
- Métricas de productividad

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Autenticación**: Supabase Auth con OAuth
- **Base de Datos**: PostgreSQL con Row Level Security (RLS)
- **Storage**: Supabase Storage para imágenes
- **Diseño**: CSS Grid, Flexbox, Responsive Design

## 📋 Requisitos Previos

- Cuenta en [Supabase](https://supabase.com/)
- Navegador web moderno
- Servidor web (para desarrollo local)

## 🚀 Instalación y Configuración

### 1. Configurar Supabase

1. Crea un nuevo proyecto en [Supabase](https://app.supabase.com/)
2. Ve al Editor SQL y ejecuta el contenido de `supabase_schema.sql`
3. Ejecuta las reglas de seguridad de `security-rules.sql`
4. Configura la autenticación:
   - Habilita Email/Password
   - Configura Google OAuth (opcional)

### 2. Configurar Storage

1. Ve a Storage en tu dashboard de Supabase
2. Crea un bucket llamado `product-images`
3. Configúralo como público para lectura

### 3. Configurar la Aplicación

1. Clona o descarga el proyecto
2. Abre `js/config.js`
3. Reemplaza las credenciales de Supabase:

```javascript
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY_AQUI';
```

### 4. Ejecutar la Aplicación

1. Sirve los archivos desde un servidor web
2. Abre `index.html` en tu navegador
3. Regístrate o inicia sesión

## 📁 Estructura del Proyecto

```
small-business-app/
├── index.html              # Dashboard principal
├── login.html              # Página de inicio de sesión
├── register.html           # Página de registro
├── products.html           # Gestión de productos
├── inventory.html          # Control de inventario
├── sales.html              # Sistema de ventas
├── orders.html             # Gestión de pedidos
├── deliveries.html         # Control de entregas
├── clients.html            # Base de datos de clientes
├── tasks.html              # Tareas personales
├── css/
│   ├── styles.css          # Estilos base
│   ├── auth.css           # Estilos de autenticación
│   ├── dashboard.css      # Estilos del dashboard
│   ├── products.css       # Estilos de productos
│   ├── inventory.css      # Estilos de inventario
│   ├── sales.css          # Estilos de ventas
│   ├── orders.css         # Estilos de pedidos
│   ├── deliveries.css     # Estilos de entregas
│   ├── clients.css        # Estilos de clientes
│   └── tasks.css          # Estilos de tareas
├── js/
│   ├── config.js          # Configuración de Supabase
│   ├── auth.js            # Gestión de autenticación
│   ├── app.js             # Utilidades globales
│   ├── dashboard.js       # Lógica del dashboard
│   ├── login.js           # Lógica de login
│   ├── register.js        # Lógica de registro
│   ├── products.js        # Gestión de productos
│   ├── inventory.js       # Control de inventario
│   ├── sales.js           # Sistema de ventas
│   ├── orders.js          # Gestión de pedidos
│   ├── deliveries.js      # Control de entregas
│   ├── clients.js         # Gestión de clientes
│   └── tasks.js           # Tareas personales
├── assets/
│   └── images/            # Imágenes de la aplicación
├── supabase_schema.sql    # Esquema de base de datos
├── security-rules.sql     # Reglas de seguridad
├── SECURITY.md           # Guía de seguridad
└── README.md             # Este archivo
```

## 🔒 Seguridad

La aplicación implementa múltiples capas de seguridad:

- **Row Level Security (RLS)** en todas las tablas
- **Políticas de acceso** granulares
- **Validación de datos** en frontend y backend
- **Autenticación segura** con JWT
- **Storage protegido** con políticas específicas

Ver `SECURITY.md` para detalles completos de configuración de seguridad.

## 📊 Base de Datos

### Tablas Principales

- `users` - Perfiles de usuario
- `stores` - Información de tiendas
- `products` - Catálogo de productos
- `inventory` - Control de stock
- `sales` - Registro de ventas
- `sale_items` - Items de ventas
- `orders` - Pedidos online
- `order_items` - Items de pedidos
- `deliveries` - Información de entregas
- `clients` - Base de datos de clientes
- `personal_tasks` - Tareas personales

### Relaciones

- Un usuario puede tener múltiples tiendas
- Una tienda puede tener múltiples productos
- Cada producto tiene un registro de inventario
- Las ventas se relacionan con productos y clientes
- Los pedidos incluyen información de entrega

## 🎨 Diseño y UX

### Características de Diseño

- **Responsive Design**: Optimizado para móviles y tablets
- **Dark/Light Mode**: Soporte para temas (configurable)
- **Animaciones Suaves**: Transiciones CSS optimizadas
- **Iconografía Consistente**: Font Awesome icons
- **Tipografía Moderna**: Inter font family

### Componentes Reutilizables

- Sistema de modales
- Formularios con validación
- Tablas con paginación
- Cards de métricas
- Botones de acción
- Mensajes de notificación

## 📱 Funcionalidades Móviles

- **PWA Ready**: Configurado como Progressive Web App
- **Touch Friendly**: Botones y controles optimizados para touch
- **Navegación Móvil**: Sidebar colapsible
- **Gestos**: Soporte para swipe y tap
- **Offline Support**: Funcionalidad básica offline (configurable)

## 🔧 Personalización

### Temas y Colores

Modifica las variables CSS en `css/styles.css`:

```css
:root {
    --primary-color: #3b82f6;
    --secondary-color: #6b7280;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
}
```

### Configuración de Negocio

Ajusta la configuración en `js/config.js`:

```javascript
const APP_CONFIG = {
    businessName: 'Tu Negocio',
    currency: 'COP',
    taxRate: 0.19,
    defaultShippingCost: 5000
};
```

## 📈 Métricas y Analytics

### Métricas Incluidas

- Ventas totales y tendencias
- Productos más vendidos
- Clientes más activos
- Inventario bajo stock
- Productividad de tareas
- Entregas completadas

### Integración con Analytics

La aplicación está preparada para integrar con:
- Google Analytics
- Facebook Pixel
- Hotjar
- Mixpanel

## 🚀 Despliegue

### Opciones de Hosting

1. **Netlify** (Recomendado)
   - Deploy automático desde Git
   - HTTPS gratuito
   - CDN global

2. **Vercel**
   - Optimizado para aplicaciones web
   - Deploy instantáneo
   - Analytics integrado

3. **GitHub Pages**
   - Gratuito para repositorios públicos
   - Integración con GitHub

### Variables de Entorno para Producción

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anonima
GA_TRACKING_ID=tu-google-analytics-id
```

## 🧪 Testing

### Testing Manual

1. Registro e inicio de sesión
2. Creación de productos
3. Gestión de inventario
4. Registro de ventas
5. Creación de pedidos
6. Gestión de clientes
7. Tareas personales

### Testing de Seguridad

1. Verificar RLS en todas las tablas
2. Probar acceso no autorizado
3. Validar upload de archivos
4. Verificar sanitización de inputs

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

### Problemas Comunes

1. **Error de conexión a Supabase**
   - Verificar URL y clave anónima
   - Comprobar configuración de CORS

2. **Problemas de autenticación**
   - Verificar configuración de OAuth
   - Comprobar políticas RLS

3. **Errores de upload de imágenes**
   - Verificar configuración del bucket
   - Comprobar políticas de Storage

### Contacto

- **Email**: soporte@tu-dominio.com
- **Documentación**: [Wiki del proyecto]
- **Issues**: [GitHub Issues]

## 🎯 Roadmap

### Próximas Funcionalidades

- [ ] Notificaciones push
- [ ] Integración con WhatsApp
- [ ] Reportes avanzados
- [ ] Multi-tienda
- [ ] API pública
- [ ] App móvil nativa

### Mejoras Planificadas

- [ ] Optimización de rendimiento
- [ ] Más opciones de personalización
- [ ] Integración con sistemas de pago
- [ ] Sincronización offline
- [ ] Backup automático

---

## 🙏 Agradecimientos

- [Supabase](https://supabase.com/) por el backend
- [Font Awesome](https://fontawesome.com/) por los iconos
- [Inter](https://rsms.me/inter/) por la tipografía
- Comunidad de desarrolladores por feedback y contribuciones

---

**¡Gracias por usar nuestro sistema de gestión para negocios pequeños!** 🚀

