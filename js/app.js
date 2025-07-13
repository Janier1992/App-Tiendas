// Archivo principal de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Inicializar aplicación
async function initializeApp() {
    try {
        log('Iniciando aplicación...', 'info');
        
        // Verificar configuración
        if (!validateConfig()) {
            showConfigurationError();
            return;
        }
        
        // Esperar a que Supabase esté disponible
        await waitForSupabase();
        
        // Configurar manejo global de errores
        setupGlobalErrorHandling();
        
        // Configurar listeners globales
        setupGlobalListeners();
        
        // Configurar service worker si está disponible
        setupServiceWorker();
        
        log('Aplicación inicializada correctamente', 'info');
        
    } catch (error) {
        handleError(error, 'App initialization');
        showMessage('Error al inicializar la aplicación. Por favor, recarga la página.', 'error');
    }
}

// Esperar a que Supabase esté disponible
async function waitForSupabase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!window.supabase && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.supabase) {
        throw new Error('Supabase no pudo ser cargado');
    }
}

// Mostrar error de configuración
function showConfigurationError() {
    const errorMessage = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        ">
            <div style="text-align: center; max-width: 500px; padding: 2rem;">
                <h2>⚠️ Configuración Requerida</h2>
                <p>Para usar esta aplicación, necesitas configurar tu conexión a Supabase.</p>
                <ol style="text-align: left; margin: 1rem 0;">
                    <li>Abre el archivo <code>js/config.js</code></li>
                    <li>Reemplaza <code>TU_SUPABASE_URL_AQUI</code> con la URL de tu proyecto</li>
                    <li>Reemplaza <code>TU_SUPABASE_ANON_KEY_AQUI</code> con tu clave anónima</li>
                    <li>Recarga esta página</li>
                </ol>
                <p><small>Puedes encontrar estas credenciales en tu panel de Supabase en Settings > API</small></p>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorMessage);
}

// Configurar manejo global de errores
function setupGlobalErrorHandling() {
    // Errores de JavaScript no capturados
    window.addEventListener('error', function(event) {
        log('Error global capturado:', 'error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        // No mostrar errores de scripts externos o de extensiones del navegador
        if (event.filename && !event.filename.includes(window.location.origin)) {
            return;
        }
        
        showMessage('Ha ocurrido un error inesperado. Por favor, recarga la página.', 'error');
    });
    
    // Promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', function(event) {
        log('Promesa rechazada no capturada:', 'error', event.reason);
        
        // Prevenir que el error aparezca en la consola
        event.preventDefault();
        
        showMessage('Error de conexión. Verifica tu conexión a internet.', 'error');
    });
}

// Configurar listeners globales
function setupGlobalListeners() {
    // Listener para cambios de conectividad
    window.addEventListener('online', function() {
        showMessage('Conexión restaurada', 'success');
        log('Conexión a internet restaurada', 'info');
    });
    
    window.addEventListener('offline', function() {
        showMessage('Sin conexión a internet', 'warning');
        log('Conexión a internet perdida', 'warn');
    });
    
    // Listener para cambios de visibilidad de la página
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            log('Página visible de nuevo', 'debug');
            // Verificar sesión cuando la página vuelve a ser visible
            if (window.authManager && window.authManager.isInitialized) {
                checkSessionValidity();
            }
        }
    });
    
    // Listener para teclas de acceso rápido
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + K para búsqueda rápida (si está implementada)
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            openQuickSearch();
        }
        
        // Escape para cerrar modales
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Listener para clics en enlaces externos
    document.addEventListener('click', function(event) {
        const link = event.target.closest('a');
        if (link && link.href && link.target === '_blank') {
            // Agregar rel="noopener noreferrer" por seguridad
            link.rel = 'noopener noreferrer';
        }
    });
}

// Verificar validez de la sesión
async function checkSessionValidity() {
    try {
        if (!window.supabase) return;
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            log('Error al verificar sesión:', 'error', error);
            return;
        }
        
        if (!session && window.authManager && window.authManager.isAuthenticated()) {
            log('Sesión expirada detectada', 'warn');
            showMessage('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
        
    } catch (error) {
        log('Error al verificar validez de sesión:', 'error', error);
    }
}

// Abrir búsqueda rápida (placeholder)
function openQuickSearch() {
    // Implementar búsqueda rápida en el futuro
    log('Búsqueda rápida solicitada', 'debug');
}

// Cerrar todos los modales
function closeAllModals() {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
}

// Configurar service worker
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                    log('Service Worker registrado exitosamente:', 'info', registration.scope);
                })
                .catch(function(error) {
                    log('Error al registrar Service Worker:', 'error', error);
                });
        });
    }
}

// Utilidades globales
window.AppUtils = {
    // Formatear moneda
    formatCurrency(amount, currency = 'COP') {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    },
    
    // Formatear fecha
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat('es-ES', { ...defaultOptions, ...options })
            .format(new Date(date));
    },
    
    // Formatear fecha relativa
    formatRelativeDate(date) {
        const now = new Date();
        const targetDate = new Date(date);
        const diffInSeconds = Math.floor((now - targetDate) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Hace menos de 1 minuto';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `Hace ${days} día${days > 1 ? 's' : ''}`;
        } else {
            return this.formatDate(date);
        }
    },
    
    // Generar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Debounce para optimizar búsquedas
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle para optimizar scroll
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Validar archivo
    validateFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB por defecto
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
        } = options;
        
        const errors = [];
        
        if (file.size > maxSize) {
            errors.push(`El archivo es demasiado grande. Máximo ${maxSize / 1024 / 1024}MB`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            errors.push(`Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`);
        }
        
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            errors.push(`Extensión no permitida. Extensiones permitidas: ${allowedExtensions.join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    // Copiar al portapapeles
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showMessage('Copiado al portapapeles', 'success');
            return true;
        } catch (error) {
            log('Error al copiar al portapapeles:', 'error', error);
            showMessage('Error al copiar al portapapeles', 'error');
            return false;
        }
    },
    
    // Descargar archivo
    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
};

// Configuración de PWA
window.PWA = {
    // Verificar si la app puede ser instalada
    canInstall: false,
    deferredPrompt: null,
    
    init() {
        // Listener para el evento beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.canInstall = true;
            this.showInstallButton();
        });
        
        // Listener para cuando la app es instalada
        window.addEventListener('appinstalled', () => {
            log('PWA instalada exitosamente', 'info');
            showMessage('¡Aplicación instalada correctamente!', 'success');
            this.hideInstallButton();
        });
    },
    
    // Mostrar botón de instalación
    showInstallButton() {
        // Implementar UI para mostrar botón de instalación
        log('PWA puede ser instalada', 'info');
    },
    
    // Ocultar botón de instalación
    hideInstallButton() {
        // Implementar UI para ocultar botón de instalación
        log('Ocultando botón de instalación PWA', 'debug');
    },
    
    // Instalar PWA
    async install() {
        if (!this.deferredPrompt) {
            showMessage('La aplicación no puede ser instalada en este momento', 'warning');
            return;
        }
        
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            log('Usuario aceptó instalar PWA', 'info');
        } else {
            log('Usuario rechazó instalar PWA', 'info');
        }
        
        this.deferredPrompt = null;
        this.canInstall = false;
    }
};

// Inicializar PWA
document.addEventListener('DOMContentLoaded', function() {
    window.PWA.init();
});

// Configuración de analytics (placeholder)
window.Analytics = {
    track(event, properties = {}) {
        if (APP_CONFIG.debug) {
            log(`Analytics: ${event}`, 'debug', properties);
        }
        
        // Implementar tracking real aquí (Google Analytics, etc.)
    },
    
    page(name) {
        this.track('page_view', { page: name });
    },
    
    user(userId, properties = {}) {
        this.track('user_identified', { userId, ...properties });
    }
};

// Tracking automático de páginas
document.addEventListener('DOMContentLoaded', function() {
    const pageName = document.title || window.location.pathname;
    window.Analytics.page(pageName);
});

// Exportar utilidades globalmente
window.initializeApp = initializeApp;

log('app.js cargado correctamente', 'info');

