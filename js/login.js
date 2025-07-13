// Lógica para la página de login
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario ya está autenticado
    setTimeout(() => {
        redirectIfAuthenticated();
    }, 500);

    // Referencias a elementos del DOM
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const rememberMeCheckbox = document.getElementById('remember-me');

    // Manejar envío del formulario de login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validar campos
        if (!validateLoginForm(email, password)) {
            return;
        }

        // Deshabilitar botón y mostrar loader
        setLoginButtonLoading(true);

        try {
            // Intentar iniciar sesión
            const result = await authManager.signIn(email, password);
            
            if (result.success) {
                // Guardar preferencia de "recordarme" si está marcada
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('lastEmail', email);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('lastEmail');
                }
            }
        } catch (error) {
            handleError(error, 'Login');
        } finally {
            setLoginButtonLoading(false);
        }
    });

    // Manejar login con Google
    googleLoginBtn.addEventListener('click', async function() {
        try {
            setGoogleButtonLoading(true);
            await authManager.signInWithGoogle();
        } catch (error) {
            handleError(error, 'Google Login');
        } finally {
            setGoogleButtonLoading(false);
        }
    });

    // Cargar email guardado si "recordarme" está activo
    loadRememberedEmail();

    // Validación en tiempo real
    setupRealTimeValidation();
});

// Validar formulario de login
function validateLoginForm(email, password) {
    let isValid = true;

    // Validar email
    if (!email) {
        showFieldError('email', 'El email es requerido');
        isValid = false;
    } else if (!AuthValidation.isValidEmail(email)) {
        showFieldError('email', 'El formato del email no es válido');
        isValid = false;
    } else {
        clearFieldError('email');
    }

    // Validar contraseña
    if (!password) {
        showFieldError('password', 'La contraseña es requerida');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
        isValid = false;
    } else {
        clearFieldError('password');
    }

    return isValid;
}

// Mostrar error en campo específico
function showFieldError(fieldName, message) {
    const inputGroup = document.getElementById(fieldName).closest('.input-group');
    const formGroup = inputGroup.closest('.form-group');
    
    // Agregar clase de error
    inputGroup.classList.add('error');
    
    // Remover mensaje de error anterior si existe
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Agregar nuevo mensaje de error
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    formGroup.appendChild(errorElement);
}

// Limpiar error de campo
function clearFieldError(fieldName) {
    const inputGroup = document.getElementById(fieldName).closest('.input-group');
    const formGroup = inputGroup.closest('.form-group');
    
    // Remover clase de error
    inputGroup.classList.remove('error');
    
    // Remover mensaje de error
    const errorMessage = formGroup.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Configurar validación en tiempo real
function setupRealTimeValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Validación del email
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !AuthValidation.isValidEmail(email)) {
            showFieldError('email', 'El formato del email no es válido');
        } else if (email) {
            clearFieldError('email');
        }
    });

    // Limpiar errores cuando el usuario empiece a escribir
    emailInput.addEventListener('input', function() {
        if (this.value.trim()) {
            clearFieldError('email');
        }
    });

    passwordInput.addEventListener('input', function() {
        if (this.value) {
            clearFieldError('password');
        }
    });
}

// Cargar email recordado
function loadRememberedEmail() {
    const rememberMe = localStorage.getItem('rememberMe');
    const lastEmail = localStorage.getItem('lastEmail');
    
    if (rememberMe === 'true' && lastEmail) {
        document.getElementById('email').value = lastEmail;
        document.getElementById('remember-me').checked = true;
    }
}

// Establecer estado de carga del botón de login
function setLoginButtonLoading(loading) {
    const loginBtn = document.getElementById('login-btn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    if (loading) {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
    } else {
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Establecer estado de carga del botón de Google
function setGoogleButtonLoading(loading) {
    const googleBtn = document.getElementById('google-login-btn');
    const icon = googleBtn.querySelector('i');
    const text = googleBtn.querySelector('span');
    
    if (loading) {
        googleBtn.disabled = true;
        icon.className = 'fas fa-spinner fa-spin';
        text.textContent = 'Conectando...';
    } else {
        googleBtn.disabled = false;
        icon.className = 'fab fa-google';
        text.textContent = 'Continuar con Google';
    }
}

// Función para alternar visibilidad de contraseña
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('password-toggle-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// Hacer la función disponible globalmente
window.togglePassword = togglePassword;

// Manejar tecla Enter en campos
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'email') {
            document.getElementById('password').focus();
        } else if (activeElement.id === 'password') {
            document.getElementById('login-form').dispatchEvent(new Event('submit'));
        }
    }
});

// Agregar efectos visuales mejorados
document.addEventListener('DOMContentLoaded', function() {
    // Efecto de focus en inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.closest('.input-group').classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.closest('.input-group').classList.remove('focused');
        });
    });
    
    // Animación de entrada para la tarjeta de auth
    const authCard = document.querySelector('.auth-card');
    if (authCard) {
        authCard.style.opacity = '0';
        authCard.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            authCard.style.transition = 'all 0.6s ease-out';
            authCard.style.opacity = '1';
            authCard.style.transform = 'translateY(0)';
        }, 100);
    }
});

// Agregar estilos adicionales para efectos
const additionalStyles = `
    .input-group.focused {
        transform: translateY(-2px);
    }
    
    .input-group.focused input {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
    }
    
    .auth-card {
        transition: transform 0.3s ease;
    }
    
    .auth-card:hover {
        transform: translateY(-4px);
    }
`;

// Agregar estilos al head
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

