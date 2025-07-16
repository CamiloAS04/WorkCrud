// js/candidato.js

import { fetchData, showSection, setupNavbarNavigation, API_BASE_URL } from './utils.js';

let currentUser = null; // Variable global para el usuario actual

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    // Redirección si no hay sesión o el rol es incorrecto
    if (!currentUser || currentUser.rol !== 'candidato') {
        alert('Acceso denegado. Por favor, inicia sesión como candidato.');
        window.location.href = 'index.html';
        return;
    }

    // Mostrar nombre del usuario en la barra de navegación y bienvenida
    document.getElementById('userName').textContent = currentUser.nombreCompleto || currentUser.email;
    document.getElementById('welcomeName').textContent = currentUser.nombreCompleto || currentUser.email;

    // Asignar el email al campo de perfil (deshabilitado para edición)
    const profileEmailInput = document.getElementById('profileEmail');
    if (profileEmailInput) {
        profileEmailInput.value = currentUser.email;
    }

    // Configurar navegación SPA (viene de utils.js)
    setupNavbarNavigation();

    // Event listeners para el perfil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Event listener para el botón de búsqueda de ofertas
    const applySearchButton = document.getElementById('applySearch');
    if (applySearchButton) {
        applySearchButton.addEventListener('click', loadJobOffers);
    }

    // Cargar la sección de ofertas por defecto al iniciar el dashboard
    loadJobOffers();
});

// --- Funciones de Renderizado y Lógica del Candidato ---

/**
 * Carga y muestra las ofertas de empleo disponibles.
 * Permite filtrar por título y nombre de empresa.
 */
export async function loadJobOffers() {
    showSection('offersSection'); // Asegurarse de que esta sección esté visible
    const jobOffersList = document.getElementById('jobOffersList');
    if (!jobOffersList) return; // Salir si el elemento no existe

    jobOffersList.innerHTML = '<div class="col-12 text-center text-muted">Cargando ofertas...</div>';

    const searchTitle = document.getElementById('searchTitle')?.value.toLowerCase() || '';
    const searchCompany = document.getElementById('searchCompany')?.value.toLowerCase() || '';

    try {
        const ofertas = await fetchData(`ofertas?estado=activa`); // Solo ofertas activas
        const empresas = await fetchData(`usuarios?rol=empresa`);

        const filteredOffers = ofertas.filter(oferta => {
            const company = empresas.find(emp => emp.id === oferta.idEmpresa);
            const companyName = company ? company.nombreEmpresa.toLowerCase() : '';

            const matchesTitle = searchTitle ? oferta.titulo.toLowerCase().includes(searchTitle) : true;
            const matchesCompany = searchCompany ? companyName.includes(searchCompany) : true;

            return matchesTitle && matchesCompany;
        });

        if (filteredOffers.length === 0) {
            jobOffersList.innerHTML = '<div class="col-12 text-center text-muted">No se encontraron ofertas con los criterios de búsqueda.</div>';
            return;
        }

        jobOffersList.innerHTML = ''; // Limpiar lista antes de añadir

        for (const oferta of filteredOffers) {
            const empresa = empresas.find(e => e.id === oferta.idEmpresa);
            const offerCard = `
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${oferta.titulo}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${empresa ? empresa.nombreEmpresa : 'Empresa Desconocida'}</h6>
                            <p class="card-text">${oferta.descripcion.substring(0, 100)}...</p>
                            <p class="card-text"><small class="text-muted">Modalidad: ${oferta.modalidad}</small></p>
                            <button class="btn btn-primary btn-sm" onclick="window.viewOfferDetails('${oferta.id}')">Ver Detalles</button>
                            <button class="btn btn-success btn-sm" onclick="window.applyToOffer('${oferta.id}')">Postularme</button>
                        </div>
                    </div>
                </div>
            `;
            jobOffersList.innerHTML += offerCard;
        }
    } catch (error) {
        console.error('Error al cargar ofertas:', error);
        jobOffersList.innerHTML = '<div class="col-12 text-center text-danger">Error al cargar las ofertas de empleo.</div>';
    }
}

/**
 * Muestra los detalles de una oferta específica.
 * @param {string} offerId - ID de la oferta.
 */
export async function viewOfferDetails(offerId) {
    showSection('offerDetailsSection');
    const offerDetailContent = document.getElementById('offerDetailContent');
    if (!offerDetailContent) return; // Salir si el elemento no existe

    offerDetailContent.innerHTML = '<div class="text-center text-muted">Cargando detalles...</div>';

    try {
        const oferta = await fetchData(`ofertas/${offerId}`);
        const empresa = await fetchData(`usuarios/${oferta.idEmpresa}`);

        offerDetailContent.innerHTML = `
            <h4>${oferta.titulo}</h4>
            <h5>Empresa: ${empresa ? empresa.nombreEmpresa : 'Desconocida'}</h5>
            <p><strong>Descripción:</strong> ${oferta.descripcion}</p>
            <p><strong>Requisitos:</strong> ${Array.isArray(oferta.requisitos) ? oferta.requisitos.join(', ') : oferta.requisitos || 'No especificados'}</p>
            <p><strong>Salario:</strong> ${oferta.salario || 'No especificado'}</p>
            <p><strong>Modalidad:</strong> ${oferta.modalidad}</p>
            <button class="btn btn-success mt-3" onclick="window.applyToOffer('${oferta.id}')">Postularme a esta oferta</button>
        `;
    } catch (error) {
        console.error('Error al cargar detalles de la oferta:', error);
        offerDetailContent.innerHTML = '<div class="text-center text-danger">Error al cargar los detalles de la oferta.</div>';
    }
}

/**
 * Permite al candidato postularse a una oferta.
 * @param {string} offerId - ID de la oferta a la que postularse.
 */
export async function applyToOffer(offerId) {
    if (!currentUser) {
        alert('Debes iniciar sesión para postularte.');
        window.location.href = 'index.html';
        return;
    }

    try {
        const existingApplication = await fetchData(`postulaciones?idOferta=${offerId}&idCandidato=${currentUser.id}`);
        if (existingApplication.length > 0) {
            alert('Ya te has postulado a esta oferta.');
            return;
        }

        const newApplication = {
            idOferta: offerId,
            idCandidato: currentUser.id,
            fechaPostulacion: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
            estado: 'Pendiente' // Pendiente, En Revisión, Aceptado, Rechazado
        };

        await fetchData('postulaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newApplication)
        });

        alert('¡Postulación exitosa!');
        loadMyApplications(); // Recargar mis postulaciones
        showSection('myApplicationsSection'); // Ir a mis postulaciones
    } catch (error) {
        console.error('Error al postularse:', error);
        alert('Hubo un error al procesar tu postulación. Por favor, intenta de nuevo.');
    }
}

/**
 * Carga y muestra el historial de postulaciones del candidato.
 */
export async function loadMyApplications() {
    showSection('myApplicationsSection');
    const myApplicationsList = document.getElementById('myApplicationsList');
    if (!myApplicationsList) return; // Salir si el elemento no existe

    myApplicationsList.innerHTML = '<div class="col-12 text-center text-muted">Cargando postulaciones...</div>';

    try {
        const applications = await fetchData(`postulaciones?idCandidato=${currentUser.id}`);
        if (applications.length === 0) {
            myApplicationsList.innerHTML = '<div class="col-12 text-center text-muted">Aún no te has postulado a ninguna oferta.</div>';
            return;
        }

        myApplicationsList.innerHTML = '';
        for (const app of applications) {
            const offer = await fetchData(`ofertas/${app.idOferta}`); // Obtener datos de la oferta
            const empresa = await fetchData(`usuarios/${offer.idEmpresa}`); // Obtener datos de la empresa
            const applicationCard = `
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${offer.titulo}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${empresa ? empresa.nombreEmpresa : 'Empresa Desconocida'}</h6>
                            <p class="card-text">Fecha de Postulación: ${app.fechaPostulacion}</p>
                            <p class="card-text">Estado: <strong>${app.estado}</strong></p>
                            <button class="btn btn-info btn-sm" onclick="window.viewOfferDetails('${offer.id}')">Ver Detalles de Oferta</button>
                        </div>
                    </div>
                </div>
            `;
            myApplicationsList.innerHTML += applicationCard;
        }
    } catch (error) {
        console.error('Error al cargar postulaciones:', error);
        myApplicationsList.innerHTML = '<div class="col-12 text-center text-danger">Error al cargar tus postulaciones.</div>';
    }
}

/**
 * Carga y muestra el perfil del candidato para edición.
 */
export async function loadProfile() {
    showSection('profileSection');
    const profileForm = document.getElementById('profileForm');
    const profileMessage = document.getElementById('profileMessage');
    if (profileMessage) profileMessage.textContent = ''; // Limpiar mensajes

    // Cargar datos actuales del usuario en el formulario
    document.getElementById('profileName').value = currentUser.nombreCompleto || '';
    document.getElementById('profileCV').value = currentUser.cvUrl || '';
    document.getElementById('profileSkills').value = Array.isArray(currentUser.habilidades) ? currentUser.habilidades.join(', ') : '';
    // Unir la experiencia en un formato de texto para el textarea
    const experienceText = Array.isArray(currentUser.experienciaLaboral)
        ? currentUser.experienciaLaboral.map(exp => `${exp.puesto},${exp.empresa},${exp.años}`).join('; ')
        : '';
    document.getElementById('profileExperience').value = experienceText;
}

/**
 * Maneja la actualización del perfil del candidato.
 */
async function handleProfileUpdate(e) {
    e.preventDefault();
    const profileMessage = document.getElementById('profileMessage');
    if (profileMessage) profileMessage.textContent = ''; // Limpiar mensajes

    const updatedUser = {
        ...currentUser, // Mantener datos existentes
        nombreCompleto: document.getElementById('profileName').value,
        cvUrl: document.getElementById('profileCV').value,
        habilidades: document.getElementById('profileSkills').value.split(',').map(s => s.trim()).filter(s => s !== ''),
    };

    // Parsear la experiencia laboral del textarea
    const experienceText = document.getElementById('profileExperience').value;
    updatedUser.experienciaLaboral = experienceText.split(';').map(item => {
        const parts = item.split(',').map(p => p.trim());
        if (parts.length === 3) {
            return { puesto: parts[0], empresa: parts[1], años: parts[2] };
        }
        return null; // Ignorar líneas mal formadas
    }).filter(item => item !== null);


    try {
        const response = await fetchData(`usuarios/${currentUser.id}`, {
            method: 'PUT', // PUT para reemplazar el recurso completo
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
        });

        sessionStorage.setItem('currentUser', JSON.stringify(response)); // Actualizar sessionStorage
        currentUser = response; // Actualizar la variable global
        document.getElementById('userName').textContent = currentUser.nombreCompleto || currentUser.email;
        document.getElementById('welcomeName').textContent = currentUser.nombreCompleto || currentUser.email;

        if (profileMessage) {
            profileMessage.textContent = 'Perfil actualizado exitosamente!';
            profileMessage.classList.remove('text-danger');
            profileMessage.classList.add('text-success');
        }
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        if (profileMessage) {
            profileMessage.textContent = 'Error al actualizar perfil. Por favor, inténtalo de nuevo.';
            profileMessage.classList.remove('text-success');
            profileMessage.classList.add('text-danger');
        }
    }
}

/**
 * Carga y muestra una lista de todas las empresas registradas.
 */
export async function loadCompanies() {
    showSection('companiesSection');
    const companiesList = document.getElementById('companiesList');
    if (!companiesList) return; // Salir si el elemento no existe

    companiesList.innerHTML = '<div class="col-12 text-center text-muted">Cargando empresas...</div>';

    try {
        const empresas = await fetchData(`usuarios?rol=empresa`);

        if (empresas.length === 0) {
            companiesList.innerHTML = '<div class="col-12 text-center text-muted">No hay empresas registradas en este momento.</div>';
            return;
        }

        companiesList.innerHTML = '';
        for (const empresa of empresas) {
            const companyCard = `
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${empresa.nombreEmpresa}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${empresa.sector || 'Sin Sector'}</h6>
                            <p class="card-text">${empresa.descripcion ? empresa.descripcion.substring(0, 100) + '...' : 'Sin descripción'}</p>
                            <button class="btn btn-info btn-sm" onclick="window.viewCompanyOffers('${empresa.id}', '${empresa.nombreEmpresa}')">Ver Ofertas</button>
                        </div>
                    </div>
                </div>
            `;
            companiesList.innerHTML += companyCard;
        }
    } catch (error) {
        console.error('Error al cargar empresas:', error);
        companiesList.innerHTML = '<div class="col-12 text-center text-danger">Error al cargar las empresas.</div>';
    }
}

/**
 * Muestra las ofertas de una empresa específica.
 * @param {string} companyId - ID de la empresa.
 * @param {string} companyName - Nombre de la empresa.
 */
export async function viewCompanyOffers(companyId, companyName) {
    showSection('companyOffersSection');
    const companyOffersTitle = document.getElementById('companyOffersTitle');
    const companyOffersList = document.getElementById('companyOffersList');
    if (!companyOffersTitle || !companyOffersList) return; // Salir si el elemento no existe

    companyOffersTitle.textContent = `Ofertas de ${companyName}`;
    companyOffersList.innerHTML = '<div class="col-12 text-center text-muted">Cargando ofertas...</div>';

    try {
        const offers = await fetchData(`ofertas?idEmpresa=${companyId}&estado=activa`);

        if (offers.length === 0) {
            companyOffersList.innerHTML = '<div class="col-12 text-center text-muted">Esta empresa no tiene ofertas activas en este momento.</div>';
            return;
        }

        companyOffersList.innerHTML = '';
        for (const offer of offers) {
            const offerCard = `
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${offer.titulo}</h5>
                            <p class="card-text">${offer.descripcion.substring(0, 100)}...</p>
                            <p class="card-text"><small class="text-muted">Modalidad: ${offer.modalidad}</small></p>
                            <button class="btn btn-primary btn-sm" onclick="window.viewOfferDetails('${offer.id}')">Ver Detalles</button>
                            <button class="btn btn-success btn-sm" onclick="window.applyToOffer('${offer.id}')">Postularme</button>
                        </div>
                    </div>
                </div>
            `;
            companyOffersList.innerHTML += offerCard;
        }
    } catch (error) {
        console.error('Error al cargar ofertas de la empresa:', error);
        companyOffersList.innerHTML = '<div class="col-12 text-center text-danger">Error al cargar las ofertas de esta empresa.</div>';
    }
}

// Asignar funciones exportadas a `window` para que sean accesibles directamente desde el HTML
// Esto es necesario porque los event handlers en el HTML (ej. onclick) no pueden acceder directamente a funciones importadas de módulos ES6.
window.loadJobOffers = loadJobOffers;
window.viewOfferDetails = viewOfferDetails;
window.applyToOffer = applyToOffer;
window.loadMyApplications = loadMyApplications;
window.loadProfile = loadProfile;
window.loadCompanies = loadCompanies;
window.viewCompanyOffers = viewCompanyOffers;
// `showSection` ya está en `window` si se le pasa desde `utils.js` para ser accedido por `setupNavbarNavigation`
// Si necesitas `showSection` directamente en `onclick` de un elemento, también tendrías que agregarlo aquí,
// pero `setupNavbarNavigation` lo maneja para los nav-links.