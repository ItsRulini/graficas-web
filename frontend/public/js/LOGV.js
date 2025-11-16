// LOG.js - Manejo de formularios de Login/Register + Google Auth
class LoginSystem {
	constructor() {
		this.currentForm = 'login';
		this.init();
	}

	init() {
		console.log("🚀 Inicializando sistema de login...");

		// Inicializar Google Auth
		this.googleAuth = new GoogleAuth();

		// Configurar switches entre formularios
		this.setupFormSwitches();

		// Configurar envío de formularios
		this.setupFormSubmissions();

		// Animaciones iniciales
		this.setupAnimations();
	}

	setupFormSwitches() {
		// Los textos que hacen switch entre Login y Register
		const switchTexts = document.querySelectorAll('.switch-form');

		switchTexts.forEach(text => {
			text.addEventListener('click', (e) => {
				e.preventDefault();
				this.toggleForm();
			});
		});
	}

	toggleForm() {
		const loginForm = document.querySelector('.form.login');
		const registerForm = document.querySelector('.form.register');

		if (this.currentForm === 'login') {
			// Cambiar a register
			loginForm.style.transform = 'rotateY(180deg)';
			loginForm.style.opacity = '0';

			setTimeout(() => {
				registerForm.style.transform = 'rotateY(0deg)';
				registerForm.style.opacity = '1';
				this.currentForm = 'register';
			}, 300);
		} else {
			// Cambiar a login
			registerForm.style.transform = 'rotateY(-180deg)';
			registerForm.style.opacity = '0';

			setTimeout(() => {
				loginForm.style.transform = 'rotateY(0deg)';
				loginForm.style.opacity = '1';
				this.currentForm = 'login';
			}, 300);
		}
	}

	setupFormSubmissions() {
		const loginForm = document.querySelector('.form.login');
		const registerForm = document.querySelector('.form.register');

		// Login form
		loginForm.addEventListener('submit', (e) => {
			e.preventDefault();
			this.handleLoginSubmit();
		});

		// Register form  
		registerForm.addEventListener('submit', (e) => {
			e.preventDefault();
			this.handleRegisterSubmit();
		});
	}

	handleLoginSubmit() {
		const email = document.querySelector('.form.login input[type="text"]').value;
		const password = document.querySelector('.form.login input[type="password"]').value;

		console.log("📧 Login attempt:", { email, password });

		// Validación básica
		if (!this.validateEmail(email)) {
			this.showMessage('Por favor ingresa un email válido', 'error');
			return;
		}

		if (password.length < 6) {
			this.showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
			return;
		}

		// Simular login (reemplazar con tu API real)
		this.showMessage('Iniciando sesión...', 'info');

		setTimeout(() => {
			// Guardar datos en localStorage
			localStorage.setItem('userEmail', email);
			localStorage.setItem('isLoggedIn', 'true');
			localStorage.setItem('authProvider', 'email');

			this.showMessage('¡Login exitoso! Redirigiendo...', 'success');

			// Redirigir al menú
			setTimeout(() => {
				window.location.href = 'MENU.html';
			}, 1500);
		}, 1000);
	}

	handleRegisterSubmit() {
		const email = document.querySelector('.form.register input[type="text"]').value;
		const username = document.querySelector('.form.register .frs-up input[type="text"]').value;
		const password = document.querySelector('.form.register .frs-up input[type="password"]').value;

		console.log("📝 Register attempt:", { email, username, password });

		// Validación
		if (!this.validateEmail(email)) {
			this.showMessage('Por favor ingresa un email válido', 'error');
			return;
		}

		if (username.length < 3) {
			this.showMessage('El usuario debe tener al menos 3 caracteres', 'error');
			return;
		}

		if (password.length < 6) {
			this.showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
			return;
		}

		this.showMessage('Creando cuenta...', 'info');

		setTimeout(() => {
			// Guardar datos
			localStorage.setItem('userEmail', email);
			localStorage.setItem('userName', username);
			localStorage.setItem('isLoggedIn', 'true');
			localStorage.setItem('authProvider', 'email');

			this.showMessage('¡Cuenta creada exitosamente!', 'success');

			// Redirigir
			setTimeout(() => {
				window.location.href = 'MENU.html';
			}, 1500);
		}, 1000);
	}

	validateEmail(email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	showMessage(message, type = 'info') {
		// Crear elemento de mensaje si no existe
		let messageEl = document.querySelector('.message-popup');

		if (!messageEl) {
			messageEl = document.createElement('div');
			messageEl.className = 'message-popup';
			document.body.appendChild(messageEl);
		}

		// Estilos según tipo
		const colors = {
			success: '#4CAF50',
			error: '#f44336',
			info: '#2196F3',
			warning: '#ff9800'
		};

		messageEl.textContent = message;
		messageEl.style.backgroundColor = colors[type] || colors.info;
		messageEl.style.opacity = '1';
		messageEl.style.visibility = 'visible';

		// Ocultar después de 3 segundos
		setTimeout(() => {
			messageEl.style.opacity = '0';
			setTimeout(() => {
				messageEl.style.visibility = 'hidden';
			}, 500);
		}, 3000);
	}

	setupAnimations() {
		// Animación de estrellas
		this.animateStars();

		// Animación de inputs
		this.setupInputAnimations();
	}

	animateStars() {
		const stars = document.querySelectorAll('.fa-star');

		stars.forEach((star, index) => {
			star.style.animation = `twinkle ${2 + index * 0.5}s infinite alternate`;
		});
	}

	setupInputAnimations() {
		const inputs = document.querySelectorAll('input');

		inputs.forEach(input => {
			// Efecto focus
			input.addEventListener('focus', () => {
				input.parentElement.style.transform = 'scale(1.05)';
				input.parentElement.style.borderColor = '#ffd900';
			});

			// Efecto blur
			input.addEventListener('blur', () => {
				input.parentElement.style.transform = 'scale(1)';
				input.parentElement.style.borderColor = '';
			});
		});
	}
}

// Google Auth Class
class GoogleAuth {
	constructor() {
		this.init();
	}

	init() {
		console.log("🔧 Inicializando Google Auth...");

		this.googleLoginBtn = document.getElementById('google-login');
		this.googleRegisterBtn = document.getElementById('google-register');

		if (this.googleLoginBtn) {
			this.googleLoginBtn.addEventListener('click', () => this.login());
			console.log("✅ Botón Google Login encontrado");
		} else {
			console.log("❌ Botón Google Login NO encontrado - ID: google-login");
		}

		if (this.googleRegisterBtn) {
			this.googleRegisterBtn.addEventListener('click', () => this.login());
			console.log("✅ Botón Google Register encontrado");
		} else {
			console.log("❌ Botón Google Register NO encontrado - ID: google-register");
		}

		// Verificar callback de Google
		this.checkGoogleCallback();
	}

	login() {
		console.log("🚀 Iniciando login con Google...");
		window.location.href = '/auth/google';
	}

	checkGoogleCallback() {
		const urlParams = new URLSearchParams(window.location.search);

		const success = urlParams.get('success');
		const error = urlParams.get('error');
		const email = urlParams.get('email');
		const userId = urlParams.get('userId');
		const name = urlParams.get('name');

		console.log("📋 Parámetros URL:", { success, error, email, userId, name });

		if (success === 'true' && email) {
			this.handleSuccessfulLogin(email, userId, name);
		} else if (error) {
			this.handleLoginError(error);
		}
	}

	handleSuccessfulLogin(email, userId, name) {
		console.log('✅ Login exitoso con Google:', { email, userId, name });

		// Guardar en localStorage
		localStorage.setItem('userEmail', email);
		localStorage.setItem('userId', userId || 'google_user');
		localStorage.setItem('userName', name || email);
		localStorage.setItem('authProvider', 'google');
		localStorage.setItem('isLoggedIn', 'true');

		// Mostrar mensaje de éxito
		this.showMessage(`¡Bienvenido ${name || email}!`, 'success');

		// Redirigir al menú principal
		setTimeout(() => {
			window.location.href = 'MENU.html';
		}, 1500);
	}

	handleLoginError(error) {
		console.error('❌ Error en login con Google:', error);
		this.showMessage(`Error: ${error}`, 'error');

		// Limpiar URL
		window.history.replaceState({}, document.title, window.location.pathname);
	}

	showMessage(message, type = 'info') {
		// Reutilizar el sistema de mensajes del LoginSystem
		const messageEl = document.createElement('div');
		messageEl.className = 'message-popup';
		messageEl.textContent = message;

		const colors = {
			success: '#4CAF50',
			error: '#f44336',
			info: '#2196F3'
		};

		messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: opacity 0.5s;
        `;

		document.body.appendChild(messageEl);

		setTimeout(() => {
			messageEl.style.opacity = '0';
			setTimeout(() => {
				document.body.removeChild(messageEl);
			}, 500);
		}, 3000);
	}
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
	console.log("🚀 DOM cargado, inicializando sistema de login...");
	window.loginSystem = new LoginSystem();
});

// CSS animations para las estrellas
const style = document.createElement('style');
style.textContent = `
    @keyframes twinkle {
        0% { opacity: 0.3; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1.2); }
    }
    
    .message-popup {
        position: fixed;
        top: 20px;
        right: 20px;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity 0.5s;
    }
    
    .form.login, .form.register {
        transition: all 0.3s ease-in-out;
    }
`;
document.head.appendChild(style);
