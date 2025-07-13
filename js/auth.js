// Módulo de Autenticación
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.authStateListeners = [];
        
        // Inicializar cuando Supabase esté disponible
        this.init();
    }

    async init() {
        try {
            // Esperar a que Supabase esté disponible
            await this.waitForSupabase();
            
            // Configurar listener de cambios de autenticación
            supabase.auth.onAuthStateChange((event, session) => {
                log(`Auth state changed: ${event}`, 'debug', session);
                this.handleAuthStateChange(event, session);
            });

            // Verificar sesión actual
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                log('Error al obtener sesión:', 'error', error);
            } else if (session) {
                await this.setCurrentUser(session.user);
            }

            this.isInitialized = true;
            log('AuthManager inicializado correctamente', 'info');
        } catch (error) {
            handleError(error, 'AuthManager.init');
        }
    }

    async waitForSupabase() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.supabase) {
            throw new Error('Supabase no está disponible después de esperar');
        }
    }

    // Manejar cambios en el estado de autenticación
    async handleAuthStateChange(event, session) {
        switch (event) {
            case 'SIGNED_IN':
                await this.setCurrentUser(session.user);
                this.notifyAuthStateListeners('signedIn', this.currentUser);
                break;
            case 'SIGNED_OUT':
                this.currentUser = null;
                this.notifyAuthStateListeners('signedOut', null);
                break;
            case 'TOKEN_REFRESHED':
                log('Token refrescado', 'debug');
                break;
        }
    }

    // Establecer usuario actual y obtener datos adicionales
    async setCurrentUser(user) {
        try {
            this.currentUser = user;
            
            // Obtener datos adicionales del usuario desde la tabla users
            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                log('Error al obtener datos del usuario:', 'error', error);
            } else if (userData) {
                this.currentUser.profile = userData;
            }
        } catch (error) {
            handleError(error, 'AuthManager.setCurrentUser');
        }
    }

    // Registrar listener para cambios de estado
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        
        // Si ya hay un usuario, notificar inmediatamente
        if (this.currentUser) {
            callback('signedIn', this.currentUser);
        }
    }

    // Notificar a todos los listeners
    notifyAuthStateListeners(event, user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                log('Error en auth state listener:', 'error', error);
            }
        });
    }

    // Registro con email y contraseña
    async signUp(email, password, fullName) {
        try {
            showLoader(true);
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) {
                throw error;
            }

            log('Usuario registrado exitosamente', 'info', data);
            showMessage('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.', 'success');
            
            return { success: true, data };
        } catch (error) {
            log('Error en registro:', 'error', error);
            
            let message = 'Error al registrar usuario.';
            if (error.message.includes('already registered')) {
                message = 'Este email ya está registrado.';
            } else if (error.message.includes('Password should be')) {
                message = 'La contraseña debe tener al menos 6 caracteres.';
            } else if (error.message.includes('Invalid email')) {
                message = 'El formato del email no es válido.';
            }
            
            showMessage(message, 'error');
            return { success: false, error };
        } finally {
            showLoader(false);
        }
    }

    // Inicio de sesión con email y contraseña
    async signIn(email, password) {
        try {
            showLoader(true);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            log('Inicio de sesión exitoso', 'info', data);
            showMessage('¡Bienvenido de vuelta!', 'success');
            
            // Redirigir al dashboard
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
            return { success: true, data };
        } catch (error) {
            log('Error en inicio de sesión:', 'error', error);
            
            let message = 'Error al iniciar sesión.';
            if (error.message.includes('Invalid login credentials')) {
                message = 'Email o contraseña incorrectos.';
            } else if (error.message.includes('Email not confirmed')) {
                message = 'Por favor, confirma tu email antes de iniciar sesión.';
            }
            
            showMessage(message, 'error');
            return { success: false, error };
        } finally {
            showLoader(false);
        }
    }

    // Inicio de sesión con Google
    async signInWithGoogle() {
        try {
            showLoader(true);
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: APP_CONFIG.auth.redirectTo
                }
            });

            if (error) {
                throw error;
            }

            log('Inicio de sesión con Google iniciado', 'info', data);
            return { success: true, data };
        } catch (error) {
            log('Error en inicio de sesión con Google:', 'error', error);
            showMessage('Error al iniciar sesión con Google.', 'error');
            return { success: false, error };
        } finally {
            showLoader(false);
        }
    }

    // Cerrar sesión
    async signOut() {
        try {
            showLoader(true);
            
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            log('Sesión cerrada exitosamente', 'info');
            showMessage('Sesión cerrada correctamente.', 'success');
            
            // Redirigir al login
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
            
            return { success: true };
        } catch (error) {
            log('Error al cerrar sesión:', 'error', error);
            showMessage('Error al cerrar sesión.', 'error');
            return { success: false, error };
        } finally {
            showLoader(false);
        }
    }

    // Restablecer contraseña
    async resetPassword(email) {
        try {
            showLoader(true);
            
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) {
                throw error;
            }

            log('Email de restablecimiento enviado', 'info', data);
            showMessage('Se ha enviado un email para restablecer tu contraseña.', 'success');
            
            return { success: true, data };
        } catch (error) {
            log('Error al enviar email de restablecimiento:', 'error', error);
            showMessage('Error al enviar email de restablecimiento.', 'error');
            return { success: false, error };
        } finally {
            showLoader(false);
        }
    }

    // Actualizar contraseña
    async updatePassword(newPassword) {
        try {
            showLoader(true);
            
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            log('Contraseña actualizada exitosamente', 'info', data);
            showMessage('Contraseña actualizada correctamente.', 'success');
            
            return { success: true, data };
        } catch (error) {
            log('Error al actualizar contraseña:', 'error', error);
            showMessage('Error al actualizar contraseña.', 'error');
            return { success: false, error };
        } finally {
            showLoader(false);
        }
    }

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Obtener usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Proteger rutas que requieren autenticación
    requireAuth() {
        if (!this.isAuthenticated()) {
            log('Acceso denegado - usuario no autenticado', 'warn');
            showMessage('Debes iniciar sesión para acceder a esta página.', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        return true;
    }

    // Redirigir usuarios autenticados lejos de páginas de auth
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            log('Usuario ya autenticado, redirigiendo al dashboard', 'info');
            window.location.href = 'index.html';
            return true;
        }
        return false;
    }
}

// Utilidades para validación
const AuthValidation = {
    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validar contraseña
    validatePassword(password) {
        const result = {
            isValid: false,
            strength: 'weak',
            errors: []
        };

        if (password.length < 6) {
            result.errors.push('Debe tener al menos 6 caracteres');
        }

        if (password.length < 8) {
            result.strength = 'weak';
        } else if (password.length < 12) {
            result.strength = 'fair';
        } else {
            result.strength = 'good';
        }

        // Verificar complejidad
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        let complexityScore = 0;
        if (hasUpperCase) complexityScore++;
        if (hasLowerCase) complexityScore++;
        if (hasNumbers) complexityScore++;
        if (hasSpecialChar) complexityScore++;

        if (complexityScore >= 3 && password.length >= 12) {
            result.strength = 'strong';
        }

        result.isValid = password.length >= 6;
        return result;
    },

    // Validar que las contraseñas coincidan
    passwordsMatch(password, confirmPassword) {
        return password === confirmPassword;
    }
};

// Crear instancia global del AuthManager
let authManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    
    // Hacer disponible globalmente
    window.authManager = authManager;
    window.AuthValidation = AuthValidation;
});

// Función global para cerrar sesión
window.logout = async function() {
    if (authManager) {
        await authManager.signOut();
    }
};

// Función para verificar autenticación en páginas protegidas
window.requireAuth = function() {
    if (authManager && authManager.isInitialized) {
        return authManager.requireAuth();
    }
    
    // Si aún no está inicializado, esperar un poco
    setTimeout(() => {
        if (authManager) {
            authManager.requireAuth();
        }
    }, 1000);
    
    return false;
};

// Función para redirigir usuarios autenticados
window.redirectIfAuthenticated = function() {
    if (authManager && authManager.isInitialized) {
        return authManager.redirectIfAuthenticated();
    }
    
    // Si aún no está inicializado, esperar un poco
    setTimeout(() => {
        if (authManager) {
            authManager.redirectIfAuthenticated();
        }
    }, 1000);
    
    return false;
};

