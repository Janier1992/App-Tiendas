# Guía de Seguridad para Producción

## Configuración de Seguridad en Supabase

### 1. Aplicar Reglas de Seguridad

Ejecuta el archivo `security-rules.sql` en el Editor SQL de Supabase:

1. Ve a tu proyecto en [Supabase](https://app.supabase.com/)
2. Navega a **SQL Editor**
3. Crea una nueva consulta
4. Copia y pega todo el contenido de `security-rules.sql`
5. Ejecuta la consulta

### 2. Configuración de Autenticación

#### Configuración de Email
- **Confirmar Email**: Habilitado (recomendado para producción)
- **Doble Opt-in**: Habilitado
- **Plantillas de Email**: Personalizar con tu marca

#### Configuración de OAuth (Google)
- **Client ID**: Configurar desde Google Cloud Console
- **Client Secret**: Mantener seguro, no exponer en frontend
- **Redirect URLs**: Solo dominios autorizados

### 3. Variables de Entorno

Nunca expongas estas credenciales en el código frontend:

```javascript
// ❌ INCORRECTO - No hardcodear credenciales
const supabaseUrl = 'https://tu-proyecto.supabase.co'
const supabaseKey = 'tu-clave-secreta'

// ✅ CORRECTO - Usar variables de entorno
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
```

### 4. Configuración de CORS

En Supabase Dashboard > Settings > API:
- **CORS Origins**: Solo dominios autorizados
- Ejemplo: `https://tu-dominio.com, https://www.tu-dominio.com`

### 5. Configuración de Storage

#### Bucket de Imágenes de Productos
- **Nombre**: `product-images`
- **Público**: Sí (para mostrar imágenes)
- **Límite de tamaño**: 5MB por archivo
- **Tipos permitidos**: `image/jpeg, image/png, image/webp`

#### Políticas de Storage
Las políticas están configuradas en `security-rules.sql`:
- Solo usuarios autenticados pueden subir
- Solo propietarios pueden modificar/eliminar
- Lectura pública para mostrar imágenes

### 6. Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas que garantizan:

#### Principio de Menor Privilegio
- Los usuarios solo acceden a sus propios datos
- Propietarios de tiendas solo ven datos de sus tiendas
- Aislamiento completo entre usuarios

#### Políticas Implementadas
- **users**: Solo perfil propio
- **stores**: Solo tiendas propias
- **products**: Solo productos de tiendas propias
- **inventory**: Solo inventario de productos propios
- **sales**: Solo ventas de tiendas propias
- **orders**: Solo pedidos de tiendas propias
- **clients**: Solo clientes de tiendas propias
- **personal_tasks**: Solo tareas propias

### 7. Validación de Datos

#### Frontend
- Validación de formularios en tiempo real
- Sanitización de inputs
- Límites de tamaño de archivos

#### Backend (Supabase)
- Constraints de base de datos
- Triggers para validación
- Políticas RLS para autorización

### 8. Configuración de Rate Limiting

En Supabase Dashboard > Settings > API:
- **Rate Limiting**: Habilitado
- **Requests por minuto**: 100 (ajustar según necesidades)
- **Burst**: 200

### 9. Monitoreo y Logs

#### Logs de Autenticación
- Monitorear intentos de login fallidos
- Alertas por actividad sospechosa

#### Logs de API
- Revisar patrones de uso inusuales
- Monitorear errores 4xx y 5xx

### 10. Backup y Recuperación

#### Backup Automático
- Supabase Pro: Backups diarios automáticos
- Retención: 7 días (configurable)

#### Backup Manual
```sql
-- Exportar datos críticos
COPY (SELECT * FROM public.products) TO '/tmp/products_backup.csv' CSV HEADER;
COPY (SELECT * FROM public.sales) TO '/tmp/sales_backup.csv' CSV HEADER;
```

### 11. Configuración de Producción

#### Variables de Entorno Requeridas
```env
# Supabase
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu-clave-anonima

# Opcional - Analytics
REACT_APP_GA_TRACKING_ID=tu-google-analytics-id
```

#### Headers de Seguridad
```html
<!-- En el HTML principal -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
```

### 12. Checklist de Seguridad Pre-Producción

- [ ] RLS habilitado en todas las tablas
- [ ] Políticas de seguridad aplicadas
- [ ] Storage configurado correctamente
- [ ] CORS configurado para dominios específicos
- [ ] Rate limiting habilitado
- [ ] Variables de entorno configuradas
- [ ] Headers de seguridad implementados
- [ ] Backup automático configurado
- [ ] Monitoreo de logs habilitado
- [ ] Confirmación de email habilitada
- [ ] OAuth configurado correctamente

### 13. Mejores Prácticas

#### Gestión de Sesiones
- Tokens JWT con expiración corta
- Refresh tokens seguros
- Logout en todas las pestañas

#### Validación de Inputs
```javascript
// Ejemplo de validación segura
function sanitizeInput(input) {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remover caracteres peligrosos
        .substring(0, 255); // Limitar longitud
}
```

#### Manejo de Errores
```javascript
// No exponer información sensible en errores
try {
    await supabase.from('products').insert(data);
} catch (error) {
    // Log completo para debugging (solo servidor)
    console.error('Database error:', error);
    
    // Mensaje genérico para usuario
    showMessage('Error al guardar producto', 'error');
}
```

### 14. Configuración de SSL/TLS

- **Certificado SSL**: Obligatorio para producción
- **HSTS**: Habilitado
- **Redirect HTTP a HTTPS**: Automático

### 15. Auditoría de Seguridad

#### Revisión Mensual
- Revisar logs de acceso
- Verificar políticas RLS
- Actualizar dependencias
- Revisar permisos de usuarios

#### Herramientas Recomendadas
- **Supabase Dashboard**: Monitoreo integrado
- **Google Analytics**: Análisis de tráfico
- **Sentry**: Monitoreo de errores (opcional)

### 16. Contacto de Emergencia

En caso de incidente de seguridad:
1. Cambiar inmediatamente las claves de API
2. Revisar logs de acceso
3. Notificar a usuarios si es necesario
4. Documentar el incidente

---

## Notas Importantes

⚠️ **Nunca commits credenciales en el código**
⚠️ **Siempre usar HTTPS en producción**
⚠️ **Revisar regularmente los logs de seguridad**
⚠️ **Mantener Supabase y dependencias actualizadas**

Esta configuración proporciona una base sólida de seguridad para una aplicación de producción. Ajusta según las necesidades específicas de tu negocio.

