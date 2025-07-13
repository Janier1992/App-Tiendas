// Lógica para la página de registro
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario ya está autenticado
    setTimeout(() => {
        redirectIfAuthenticated();
    }, 500);

    // Referencias a elementos del DOM
    const registerForm = document.getElementById('register-form');
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const registerBtn = document.getElementById('register-btn');
    const googleRegisterBtn = document.getElementById('google-register-btn');
    const termsCheckbox = document.getElementById('terms-agreement');

    // Manejar envío del formulario de registro
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validar formulario
        if (!validateRegisterForm(fullName, email, password, confirmPassword)) {
            return;
        }

        // Verificar términos y condiciones
        if (!termsCheckbox.checked) {
            showMessage('Debes aceptar los términos y condiciones', 'error');
            return;
        }

        // Deshabilitar botón y mostrar loader
        setRegisterButtonLoading(true);

        try {
            // Intentar registrar usuario
            const result = await authManager.signUp(email, password, fullName);
            
            if (result.success) {
                // Limpiar formulario
                registerForm.reset();
                updatePasswordStrength('');
                
                // Redirigir al login después de un momento
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            }
        } catch (error) {
            handleError(error, 'Register');
        } finally {
            setRegisterButtonLoading(false);
        }
    });

    // Manejar registro con Google
    googleRegisterBtn.addEventListener('click', async function() {
        try {
            setGoogleButtonLoading(true);
            await authManager.signInWithGoogle();
        } catch (error) {
            handleError(error, 'Google Register');
        } finally {
            setGoogleButtonLoading(false);
        }
    });

    // Configurar validación en tiempo real
    setupRealTimeValidation();
    
    // Configurar indicador de fortaleza de contraseña
    setupPasswordStrengthIndicator();
});

// Validar formulario de registro
function validateRegisterForm(fullName, email, password, confirmPassword) {
    let isValid = true;

    // Validar nombre completo
    if (!fullName) {
        showFieldError('full-name', 'El nombre completo es requerido');
        isValid = false;
    } else if (fullName.length < 2) {
        showFieldError('full-name', 'El nombre debe tener al menos 2 caracteres');
        isValid = false;
    } else {
        clearFieldError('full-name');
    }

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
    const passwordValidation = AuthValidation.validatePassword(password);
    if (!password) {
        showFieldError('password', 'La contraseña es requerida');
        isValid = false;
    } else if (!passwordValidation.isValid) {
        showFieldError('password', passwordValidation.errors.join(', '));
        isValid = false;
    } else {
        clearFieldError('password');
    }

    // Validar confirmación de contraseña
    if (!confirmPassword) {
        showFieldError('confirm-password', 'Debes confirmar tu contraseña');
        isValid = false;
    } else if (!AuthValidation.passwordsMatch(password, confirmPassword)) {
        showFieldError('confirm-password', 'Las contraseñas no coinciden');
        isValid = false;
    } else {
        clearFieldError('confirm-password');
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
    inputGroup.classList.add('success');
    
    // Remover mensaje de error
    const errorMessage = formGroup.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
    
    // Remover clase success después de un tiempo
    setTimeout(() => {
        inputGroup.classList.remove('success');
    }, 2000);
}

// Configurar validación en tiempo real
function setupRealTimeValidation() {
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Validación del nombre
    fullNameInput.addEventListener('blur', function() {
        const name = this.value.trim();
        if (name && name.length < 2) {
            showFieldError('full-name', 'El nombre debe tener al menos 2 caracteres');
        } else if (name) {
            clearFieldError('full-name');
        }
    });

    // Validación del email
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !AuthValidation.isValidEmail(email)) {
            showFieldError('email', 'El formato del email no es válido');
        } else if (email) {
            clearFieldError('email');
        }
    });

    // Validación de confirmación de contraseña
    confirmPasswordInput.addEventListener('blur', function() {
        const password = passwordInput.value;
        const confirmPassword = this.value;
        
        if (confirmPassword && !AuthValidation.passwordsMatch(password, confirmPassword)) {
            showFieldError('confirm-password', 'Las contraseñas no coinciden');
        } else if (confirmPassword && password) {
            clearFieldError('confirm-password');
        }
    });

    // Limpiar errores cuando el usuario empiece a escribir
    [fullNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', function() {
            if (this.value.trim()) {
                clearFieldError(this.id);
            }
        });
    });

    // Revalidar confirmación cuando cambie la contraseña principal
    passwordInput.addEventListener('input', function() {
        const confirmPassword = confirmPasswordInput.value;
        if (confirmPassword) {
            if (!AuthValidation.passwordsMatch(this.value, confirmPassword)) {
                showFieldError('confirm-password', 'Las contraseñas no coinciden');
            } else {
                clearFieldError('confirm-password');
            }
        }
    });
}

// Configurar indicador de fortaleza de contraseña
function setupPasswordStrengthIndicator() {
    const passwordInput = document.getElementById('password');
    
    passwordInput.addEventListener('input', function() {
        updatePasswordStrength(this.value);
    });
}

// Actualizar indicador de fortaleza de contraseña
function updatePasswordStrength(password) {
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');
    
    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthText.textContent = 'Ingresa una contraseña';
        strengthText.className = 'strength-text';
        return;
    }
    
    const validation = AuthValidation.validatePassword(password);
    const strength = validation.strength;
    
    // Actualizar barra de progreso
    strengthFill.className = `strength-fill ${strength}`;
    
    // Actualizar texto
    const strengthTexts = {
        weak: 'Débil',
        fair: 'Regular',
        good: 'Buena',
        strong: 'Fuerte'
    };
    
    strengthText.textContent = strengthTexts[strength] || 'Débil';
    strengthText.className = `strength-text ${strength}`;
    
    // Mostrar errores si los hay
    if (validation.errors.length > 0) {
        strengthText.textContent = validation.errors[0];
        strengthText.className = 'strength-text weak';
    }
}

// Establecer estado de carga del botón de registro
function setRegisterButtonLoading(loading) {
    const registerBtn = document.getElementById('register-btn');
    const btnText = registerBtn.querySelector('.btn-text');
    const btnLoader = registerBtn.querySelector('.btn-loader');
    
    if (loading) {
        registerBtn.disabled = true;
        registerBtn.classList.add('loading');
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
    } else {
        registerBtn.disabled = false;
        registerBtn.classList.remove('loading');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Establecer estado de carga del botón de Google
function setGoogleButtonLoading(loading) {
    const googleBtn = document.getElementById('google-register-btn');
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
function togglePassword(fieldId) {
    const passwordInput = document.getElementById(fieldId);
    const toggleIcon = document.getElementById(`${fieldId}-toggle-icon`);
    
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

// Manejar navegación con tecla Tab y Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'full-name') {
            document.getElementById('email').focus();
        } else if (activeElement.id === 'email') {
            document.getElementById('password').focus();
        } else if (activeElement.id === 'password') {
            document.getElementById('confirm-password').focus();
        } else if (activeElement.id === 'confirm-password') {
            document.getElementById('register-form').dispatchEvent(new Event('submit'));
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
    
    // Efecto de escritura en el título
    const title = document.querySelector('.auth-header h1');
    if (title) {
        const text = title.textContent;
        title.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                title.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        setTimeout(typeWriter, 500);
    }
});

// Validación de términos y condiciones
document.addEventListener('DOMContentLoaded', function() {
    const termsCheckbox = document.getElementById('terms-agreement');
    const registerBtn = document.getElementById('register-btn');
    
    // Verificar estado inicial
    updateRegisterButtonState();
    
    // Escuchar cambios en el checkbox
    termsCheckbox.addEventListener('change', updateRegisterButtonState);
    
    function updateRegisterButtonState() {
        if (termsCheckbox.checked) {
            registerBtn.classList.remove('disabled');
        } else {
            registerBtn.classList.add('disabled');
        }
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
    
    .input-group.success input {
        border-color: var(--success-color);
        box-shadow: 0 0 0 3px rgb(16 185 129 / 0.1);
    }
    
    .btn.disabled {
        opacity: 0.6;
        cursor: not-allowed;
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

