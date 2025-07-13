// Configuración de Supabase
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto de Supabase
const SUPABASE_CONFIG = {
    url: 'TU_SUPABASE_URL_AQUI', // Ejemplo: 'https://xyzcompany.supabase.co'
    anonKey: 'TU_SUPABASE_ANON_KEY_AQUI' // Tu clave anónima de Supabase
};

// Verificar que la configuración esté completa
if (SUPABASE_CONFIG.url === 'TU_SUPABASE_URL_AQUI' || SUPABASE_CONFIG.anonKey === 'TU_SUPABASE_ANON_KEY_AQUI') {
    console.warn('⚠️ Configuración de Supabase incompleta. Por favor, actualiza los valores en js/config.js');
}

// Inicializar cliente de Supabase
let supabase;

// Función para cargar Supabase desde CDN
function loadSupabase() {
    return new Promise((resolve, reject) => {
        if (window.supabase) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js';
        script.onload = () => {
            if (window.supabase) {
                resolve();
            } else {
                reject(new Error('Error al cargar Supabase'));
            }
        };
        script.onerror = () => reject(new Error('Error al cargar el script de Supabase'));
        document.head.appendChild(script);
    });
}

// Inicializar Supabase cuando se cargue la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadSupabase();
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase inicializado correctamente');
        
        // Verificar conexión
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error al verificar sesión:', error);
        } else {
            console.log('🔐 Sesión verificada');
        }
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        showMessage('Error al conectar con el servidor. Verifica tu configuración.', 'error');
    }
});

// Configuración de la aplicación
const APP_CONFIG = {
    name: 'Gestión de Negocios',
    version: '1.0.0',
    debug: true, // Cambiar a false en producción
    
    // Configuración de autenticación
    auth: {
        redirectTo: window.location.origin + '/index.html',
        autoRefreshToken: true,
        persistSession: true
    },
    
    // Configuración de la UI
    ui: {
        showLoadingSpinner: true,
        autoHideMessages: true,
        messageTimeout: 5000
    },
    
    // Configuración de paginación
    pagination: {
        defaultPageSize: 10,
        maxPageSize: 100
    }
};

// Función para mostrar mensajes
function showMessage(message, type = 'info', duration = APP_CONFIG.ui.messageTimeout) {
    const container = document.getElementById('message-container') || createMessageContainer();
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <span>${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(messageElement);
    
    // Auto-ocultar mensaje si está habilitado
    if (APP_CONFIG.ui.autoHideMessages && duration > 0) {
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, duration);
    }
}

// Crear contenedor de mensajes si no existe
function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}

// Función para mostrar/ocultar loader
function showLoader(show = true) {
    const loader = document.getElementById('app-loader') || createLoader();
    loader.style.display = show ? 'flex' : 'none';
}

// Crear loader si no existe
function createLoader() {
    const loader = document.createElement('div');
    loader.id = 'app-loader';
    loader.className = 'app-loader';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="spinner"></div>
            <p>Cargando...</p>
        </div>
    `;
    document.body.appendChild(loader);
    
    // Agregar estilos del loader
    const style = document.createElement('style');
    style.textContent = `
        .app-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(4px);
        }
        
        .loader-content {
            text-align: center;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f4f6;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    return loader;
}

// Función para logging con niveles
function log(message, level = 'info', data = null) {
    if (!APP_CONFIG.debug && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
        case 'error':
            console.error(prefix, message, data);
            break;
        case 'warn':
            console.warn(prefix, message, data);
            break;
        case 'debug':
            console.debug(prefix, message, data);
            break;
        default:
            console.log(prefix, message, data);
    }
}

// Función para manejar errores globales
function handleError(error, context = 'Aplicación') {
    log(`Error en ${context}:`, 'error', error);
    
    let message = 'Ha ocurrido un error inesperado.';
    
    if (error.message) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    }
    
    showMessage(message, 'error');
}

// Función para validar configuración
function validateConfig() {
    const errors = [];
    
    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'TU_SUPABASE_URL_AQUI') {
        errors.push('URL de Supabase no configurada');
    }
    
    if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'TU_SUPABASE_ANON_KEY_AQUI') {
        errors.push('Clave anónima de Supabase no configurada');
    }
    
    if (errors.length > 0) {
        log('Errores de configuración encontrados:', 'error', errors);
        return false;
    }
    
    return true;
}

// Función para obtener información del entorno
function getEnvironmentInfo() {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        url: window.location.href,
        timestamp: new Date().toISOString()
    };
}

// Exportar funciones globales
window.APP_CONFIG = APP_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.showMessage = showMessage;
window.showLoader = showLoader;
window.log = log;
window.handleError = handleError;
window.validateConfig = validateConfig;
window.getEnvironmentInfo = getEnvironmentInfo;

// Log de inicialización
log('Configuración cargada', 'info', {
    app: APP_CONFIG.name,
    version: APP_CONFIG.version,
    environment: getEnvironmentInfo()
});

