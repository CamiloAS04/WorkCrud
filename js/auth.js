// ✅ auth.js corregido (registro de empresa y función de logout)

const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => { const loginForm = document.getElementById('loginForm'); const registerForm = document.getElementById('registerForm'); const loginMessage = document.getElementById('loginMessage'); const registerMessage = document.getElementById('registerMessage'); const logoutBtn = document.getElementById('logoutBtn');

// Redireccionar si ya hay sesión activa
if (sessionStorage.getItem('currentUser')) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser.rol === 'candidato') {
        window.location.href = 'dashboard-candidato.html';
    } else if (currentUser.rol === 'empresa') {
        window.location.href = 'dashboard-empresa.html';
    }
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        loginMessage.textContent = '';

        try {
            const response = await fetch(`${API_URL}/usuarios?email=${email}&password=${password}`);
            const users = await response.json();

            if (users.length > 0) {
                const user = users[0];
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                alert('Inicio de sesión exitoso!');
                if (user.rol === 'candidato') {
                    window.location.href = 'dashboard-candidato.html';
                } else if (user.rol === 'empresa') {
                    window.location.href = 'dashboard-empresa.html';
                }
            } else {
                loginMessage.textContent = 'Credenciales incorrectas. Intenta de nuevo.';
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            loginMessage.textContent = 'Hubo un error al intentar iniciar sesión.';
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const rol = document.getElementById('registerRole').value;

        registerMessage.textContent = '';

        if (rol === '') {
            registerMessage.textContent = 'Por favor, selecciona un rol.';
            return;
        }

        try {
            const checkResponse = await fetch(`${API_URL}/usuarios?email=${email}`);
            const existingUsers = await checkResponse.json();

            if (existingUsers.length > 0) {
                registerMessage.textContent = 'Este correo electrónico ya está registrado.';
                return;
            }

            const newUser = { email, password, rol };

            if (rol === 'candidato') {
                newUser.nombreCompleto = '';
                newUser.cvUrl = '';
                newUser.habilidades = [];
                newUser.experiencia = '';
                newUser.postulaciones = [];
            } else if (rol === 'empresa') {
                newUser.nombreEmpresa = '';
                newUser.logoUrl = '';
                newUser.descripcion = '';
                newUser.sector = '';
                newUser.ofertas = [];
            }

            const response = await fetch(`${API_URL}/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if (response.ok) {
                alert('Registro exitoso. Ahora puedes iniciar sesión.');
                registerForm.reset();
            } else {
                registerMessage.textContent = 'Hubo un error al registrar. Intenta de nuevo.';
            }
        } catch (error) {
            console.error('Error al registrar:', error);
            registerMessage.textContent = 'Hubo un error al registrar el usuario.';
        }
    });
}

});

