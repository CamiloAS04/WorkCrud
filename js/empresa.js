// js/empresa.js

import { fetchData, showSection, setupNavbarNavigation, API_BASE_URL } from './utils.js';

let currentUser = null; // Variable global para el usuario actual
let currentEditingOfferId = null; // Para saber si estamos creando o editando una oferta

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    // Redirección si no hay sesión o el rol es incorrecto
    if (!currentUser || currentUser.rol !== 'empresa') {
        alert('Acceso denegado. Por favor, inicia sesión como empresa.');
        window.location.href = 'index.html';
        return;
    }

    // Mostrar nombre de la empresa en la barra de navegación y bienvenida
    document.getElementById('companyName').textContent = currentUser.nombreEmpresa || currentUser.email;
    document.getElementById('welcomeCompany').textContent = currentUser.nombreEmpresa || currentUser.email;

    // Asignar el email al campo de perfil de empresa (deshabilitado para edición)
    const companyEmailInput = document.getElementById('companyEmail');
    if (companyEmailInput) {
        companyEmailInput.value = currentUser.email;
    }

    // Configurar navegación SPA
    setupNavbarNavigation();

    // Event listener para el formulario de ofertas
    const offerForm = document.getElementById('offerForm');
    if (offerForm) {
        offerForm.addEventListener('submit', handleOfferSubmit);
    }

    // Event listener para el formulario de perfil de empresa
    const companyProfileForm = document.getElementById('companyProfileForm');
    if (companyProfileForm) {
        companyProfileForm.addEventListener('submit', handleCompanyProfileUpdate);
    }

    // Cargar la sección de mis ofertas por defecto al iniciar el dashboard
    loadMyJobOffers();
});

// --- Funciones de Renderizado y Lógica de la Empresa ---

/**
 * Carga y muestra las ofertas de empleo publicadas por la empresa actual.
 */
export async function loadMyJobOffers() {
    showSection('myOffersSection'); // Asegurarse de que esta sección esté visible
    const myJobOffersList = document.getElementById('myJobOffersList');
    if (!myJobOffersList) return; // Salir si el elemento no existe

    myJobOffersList.innerHTML = '<div class="col-12 text-center text-muted">Cargando tus ofertas...</div>';

    try {
        const ofertas = await fetchData(`ofertas?idEmpresa=${currentUser.id}`);

        if (ofertas.length === 0) {
            myJobOffersList.innerHTML = '<div class="col-12 text-center text-muted">No has publicado ofertas de empleo aún. ¡Publica la primera!</div>';
            return;
        }

        myJobOffersList.innerHTML = ''; // Limpiar lista antes de añadir
        ofertas.forEach(oferta => {
            const offerCard = `
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${oferta.titulo}</h5>
                            <p class="card-text"><small class="text-muted">Modalidad: ${oferta.modalidad} | Estado: ${oferta.estado}</small></p>
                            <button class="btn btn-info btn-sm me-2" onclick="window.editOffer('${oferta.id}')">Editar</button>
                            ${oferta.estado === 'activa' ?
                                `<button class="btn btn-warning btn-sm me-2" onclick="window.closeOffer('${oferta.id}')">Cerrar</button>` :
                                `<button class="btn btn-success btn-sm me-2" onclick="window.activateOffer('${oferta.id}')">Activar</button>`
                            }
                            <button class="btn btn-danger btn-sm me-2" onclick="window.deleteOffer('${oferta.id}')">Eliminar</button>
                            <button class="btn btn-primary btn-sm" onclick="window.viewApplicants('${oferta.id}', '${oferta.titulo}')">Ver Postulantes</button>
                        </div>
                    </div>
                </div>
            `;
            myJobOffersList.innerHTML += offerCard;
        });
    } catch (error) {
        console.error('Error al cargar mis ofertas:', error);
        myJobOffersList.innerHTML = '<div class="col-12 text-center text-danger">Error al cargar tus ofertas de empleo.</div>';
    }
}

/**
 * Prepara el formulario para publicar una nueva oferta.
 */
export function createNewOffer() {
    showSection('newOfferSection');
    const offerFormTitle = document.getElementById('offerFormTitle');
    const saveOfferBtn = document.getElementById('saveOfferBtn');
    const offerForm = document.getElementById('offerForm');
    const offerMessage = document.getElementById('offerMessage');

    if (offerFormTitle) offerFormTitle.textContent = 'Publicar Nueva Oferta de Empleo';
    if (saveOfferBtn) saveOfferBtn.textContent = 'Publicar Oferta';
    if (offerForm) offerForm.reset(); // Limpiar formulario
    const offerIdInput = document.getElementById('offerId');
    if (offerIdInput) offerIdInput.value = ''; // Borrar ID si existe
    currentEditingOfferId = null; // No estamos editando
    if (offerMessage) offerMessage.textContent = ''; // Limpiar mensaje de feedback
}

/**
 * Carga los datos de una oferta para edición en el formulario.
 * @param {string} offerId - ID de la oferta a editar.
 */
export async function editOffer(offerId) {
    showSection('newOfferSection');
    const offerFormTitle = document.getElementById('offerFormTitle');
    const saveOfferBtn = document.getElementById('saveOfferBtn');
    const offerMessage = document.getElementById('offerMessage');

    if (offerFormTitle) offerFormTitle.textContent = 'Editar Oferta de Empleo';
    if (saveOfferBtn) saveOfferBtn.textContent = 'Guardar Cambios';
    if (offerMessage) offerMessage.textContent = '';
    currentEditingOfferId = offerId; // Establecer el ID de la oferta que se está editando

    try {
        const offer = await fetchData(`ofertas/${offerId}`);
        document.getElementById('offerId').value = offer.id;
        document.getElementById('offerTitle').value = offer.titulo;
        document.getElementById('offerDescription').value = offer.descripcion;
        document.getElementById('offerRequirements').value = Array.isArray(offer.requisitos) ? offer.requisitos.join(', ') : '';
        document.getElementById('offerSalary').value = offer.salario || '';
        document.getElementById('offerModality').value = offer.modalidad;
    } catch (error) {
        console.error('Error al cargar oferta para edición:', error);
        alert('No se pudo cargar la oferta para edición.');
        showSection('myOffersSection'); // Volver a la lista de ofertas si falla
    }
}

/**
 * Maneja el envío del formulario de oferta (crear o editar).
 */
async function handleOfferSubmit(e) {
    e.preventDefault();
    const offerMessage = document.getElementById('offerMessage');
    if (offerMessage) offerMessage.textContent = ''; // Limpiar mensajes

    const offerData = {
        titulo: document.getElementById('offerTitle').value,
        descripcion: document.getElementById('offerDescription').value,
        requisitos: document.getElementById('offerRequirements').value.split(',').map(r => r.trim()).filter(r => r !== ''),
        salario: document.getElementById('offerSalary').value,
        modalidad: document.getElementById('offerModality').value,
        idEmpresa: currentUser.id, // Asignar la oferta a la empresa actual
        estado: 'activa' // Por defecto, una nueva oferta o editada es activa
    };

    try {
        let response;
        if (currentEditingOfferId) {
            // Editar oferta existente
            response = await fetchData(`ofertas/${currentEditingOfferId}`, {
                method: 'PUT', // PUT para reemplazar el recurso completo
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentEditingOfferId, ...offerData }) // json-server PUT requiere el ID en el body para actualizaciones completas
            });
            if (offerMessage) offerMessage.textContent = 'Oferta actualizada exitosamente!';
        } else {
            // Publicar nueva oferta
            response = await fetchData('ofertas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offerData)
            });
            if (offerMessage) {
                offerMessage.textContent = 'Oferta publicada exitosamente!';
                document.getElementById('offerForm')?.reset(); // Limpiar el formulario después de publicar
            }
        }
        if (offerMessage) {
            offerMessage.classList.remove('text-danger');
            offerMessage.classList.add('text-success');
        }

        await loadMyJobOffers(); // Recargar la lista de ofertas para ver los cambios
        // Opcional: showSection('myOffersSection'); si quieres volver a la lista automáticamente
    } catch (error) {
        console.error('Error al guardar oferta:', error);
        if (offerMessage) {
            offerMessage.textContent = 'Error al guardar la oferta. Por favor, inténtalo de nuevo.';
            offerMessage.classList.remove('text-success');
            offerMessage.classList.add('text-danger');
        }
    }
}

/**
 * Cierra una oferta (cambia su estado a 'cerrada').
 * @param {string} offerId - ID de la oferta a cerrar.
 */
export async function closeOffer(offerId) {
    if (!confirm('¿Estás seguro de que quieres cerrar esta oferta? Los postulantes ya no podrán verla como activa.')) return;
    try {
        await fetchData(`ofertas/${offerId}`, {
            method: 'PATCH', // PATCH para actualizar solo una parte del recurso
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'cerrada' })
        });
        alert('Oferta cerrada exitosamente.');
        loadMyJobOffers(); // Recargar la lista para reflejar el cambio de estado
    } catch (error) {
        console.error('Error al cerrar oferta:', error);
        alert('Error al cerrar la oferta.');
    }
}

/**
 * Activa una oferta (cambia su estado a 'activa').
 * @param {string} offerId - ID de la oferta a activar.
 */
export async function activateOffer(offerId) {
    if (!confirm('¿Estás seguro de que quieres activar esta oferta nuevamente? Estará visible para los candidatos.')) return;
    try {
        await fetchData(`ofertas/${offerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'activa' })
        });
        alert('Oferta activada exitosamente.');
        loadMyJobOffers(); // Recargar la lista
    } catch (error) {
        console.error('Error al activar oferta:', error);
        alert('Error al activar la oferta.');
    }
}

/**
 * Elimina una oferta y sus postulaciones relacionadas.
 * @param {string} offerId - ID de la oferta a eliminar.
 */
export async function deleteOffer(offerId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta oferta? Esto también eliminará TODAS las postulaciones asociadas y no se podrá revertir.')) return;
    try {
        // Eliminar postulaciones asociadas primero
        const applicationsToDelete = await fetchData(`postulaciones?idOferta=${offerId}`);
        for (const app of applicationsToDelete) {
            await fetchData(`postulaciones/${app.id}`, { method: 'DELETE' });
        }

        // Luego eliminar la oferta
        await fetchData(`ofertas/${offerId}`, { method: 'DELETE' });

        alert('Oferta y postulaciones asociadas eliminadas exitosamente.');
        loadMyJobOffers(); // Recargar la lista de ofertas
    } catch (error) {
        console.error('Error al eliminar oferta:', error);
        alert('Error al eliminar la oferta.');
    }
}

/**
 * Carga y muestra los postulantes para una oferta específica.
 * @param {string} offerId - ID de la oferta.
 * @param {string} offerTitle - Título de la oferta.
 */
export async function viewApplicants(offerId, offerTitle) {
    showSection('applicantsSection');
    const applicantsTitle = document.getElementById('applicantsTitle');
    const applicantsList = document.getElementById('applicantsList');
    const applicantDetailDiv = document.getElementById('applicantDetail');

    if (applicantsTitle) applicantsTitle.textContent = `Postulantes para: "${offerTitle}"`;
    if (applicantsList) applicantsList.innerHTML = '<div class="text-center text-muted">Cargando postulantes...</div>';
    if (applicantDetailDiv) applicantDetailDiv.classList.add('d-none'); // Ocultar detalle de postulante al cambiar de oferta

    try {
        const applications = await fetchData(`postulaciones?idOferta=${offerId}`);

        if (applications.length === 0) {
            if (applicantsList) applicantsList.innerHTML = '<div class="text-center text-muted">Aún no hay postulantes para esta oferta.</div>';
            return;
        }

        if (applicantsList) applicantsList.innerHTML = ''; // Limpiar lista
        for (const app of applications) {
            const applicant = await fetchData(`usuarios/${app.idCandidato}`);
            const applicantItem = `
                <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                   onclick="window.showApplicantDetail('${applicant.id}', '${offerId}')">
                    ${applicant.nombreCompleto || applicant.email} <span class="badge bg-primary rounded-pill">${app.estado}</span>
                </a>
            `;
            if (applicantsList) applicantsList.innerHTML += applicantItem;
        }
    } catch (error) {
        console.error('Error al cargar postulantes:', error);
        if (applicantsList) applicantsList.innerHTML = '<div class="text-center text-danger">Error al cargar los postulantes.</div>';
    }
}

/**
 * Muestra el detalle de un postulante específico y su aplicación a una oferta.
 * @param {string} applicantId - ID del candidato.
 * @param {string} offerId - ID de la oferta.
 */
export async function showApplicantDetail(applicantId, offerId) {
    const applicantDetailDiv = document.getElementById('applicantDetail');
    const applicantNameDetail = document.getElementById('applicantNameDetail');
    const applicantDetailContent = document.getElementById('applicantDetailContent');

    if (!applicantDetailDiv || !applicantNameDetail || !applicantDetailContent) return;

    applicantDetailDiv.classList.remove('d-none'); // Mostrar la sección de detalle
    applicantDetailContent.innerHTML = '<div class="text-center text-muted">Cargando detalles del postulante...</div>';

    try {
        const applicant = await fetchData(`usuarios/${applicantId}`);
        // Se busca la postulación específica para esa oferta y candidato
        const application = (await fetchData(`postulaciones?idCandidato=${applicantId}&idOferta=${offerId}`))[0];

        if (!applicant || !application) {
            applicantDetailContent.innerHTML = '<div class="text-center text-danger">No se encontraron detalles del postulante o la postulación.</div>';
            return;
        }

        applicantNameDetail.textContent = applicant.nombreCompleto || applicant.email;
        applicantDetailContent.innerHTML = `
            <p><strong>Correo:</strong> ${applicant.email}</p>
            ${applicant.cvUrl ? `<p><strong>CV:</strong> <a href="${applicant.cvUrl}" target="_blank">${applicant.cvUrl}</a></p>` : ''}
            <p><strong>Habilidades:</strong> ${Array.isArray(applicant.habilidades) && applicant.habilidades.length > 0 ? applicant.habilidades.join(', ') : 'No especificadas'}</p>
            <p><strong>Experiencia Laboral:</strong></p>
            <ul>
                ${Array.isArray(applicant.experienciaLaboral) && applicant.experienciaLaboral.length > 0 ?
                    applicant.experienciaLaboral.map(exp => `<li>${exp.puesto} en ${exp.empresa} (${exp.años})</li>`).join('') :
                    '<li>No especificada</li>'
                }
            </ul>
            <p><strong>Estado de Postulación:</strong> <strong>${application.estado}</strong></p>
            <div class="mt-3">
                <button class="btn btn-sm btn-success me-2" onclick="window.updateApplicationStatus('${application.id}', 'Aceptado', '${offerId}', '${applicant.nombreCompleto || applicant.email}')">Marcar como Aceptado</button>
                <button class="btn btn-sm btn-danger me-2" onclick="window.updateApplicationStatus('${application.id}', 'Rechazado', '${offerId}', '${applicant.nombreCompleto || applicant.email}')">Marcar como Rechazado</button>
                <button class="btn btn-sm btn-info" onclick="window.updateApplicationStatus('${application.id}', 'En Revisión', '${offerId}', '${applicant.nombreCompleto || applicant.email}')">Marcar como En Revisión</button>
            </div>
        `;
    } catch (error) {
        console.error('Error al cargar detalle del postulante:', error);
        applicantDetailContent.innerHTML = '<div class="text-center text-danger">Error al cargar los detalles del postulante.</div>';
    }
}

/**
 * Oculta la sección de detalles del postulante.
 */
export function hideApplicantDetail() {
    const applicantDetailDiv = document.getElementById('applicantDetail');
    if (applicantDetailDiv) {
        applicantDetailDiv.classList.add('d-none');
    }
}

/**
 * Actualiza el estado de una postulación.
 * @param {string} applicationId - ID de la postulación.
 * @param {string} newStatus - Nuevo estado ('Aceptado', 'Rechazado', 'En Revisión').
 * @param {string} offerId - ID de la oferta a la que pertenece esta postulación (para recargar vista).
 * @param {string} applicantName - Nombre del postulante (para el mensaje de alerta).
 */
export async function updateApplicationStatus(applicationId, newStatus, offerId, applicantName) {
    try {
        const application = await fetchData(`postulaciones/${applicationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: newStatus })
        });
        alert(`El estado de la postulación de ${applicantName} ha sido actualizado a: ${newStatus}`);
        // Recargar la vista de postulantes para la oferta actual para ver el estado actualizado
        const currentOfferTitleElement = document.getElementById('applicantsTitle');
        const currentOfferTitle = currentOfferTitleElement ? currentOfferTitleElement.textContent.replace('Postulantes para: "', '').slice(0, -1) : '';
        if (currentOfferTitle) {
            window.viewApplicants(offerId, currentOfferTitle);
        }
        // También recargar el detalle del postulante para que muestre el nuevo estado
        window.showApplicantDetail(application.idCandidato, offerId);
    } catch (error) {
        console.error('Error al actualizar estado de la postulación:', error);
        alert('Error al actualizar el estado de la postulación.');
    }
}

/**
 * Carga y muestra el perfil de la empresa para edición.
 */
export async function loadCompanyProfile() {
    showSection('profileSection');
    const companyProfileMessage = document.getElementById('companyProfileMessage');
    if (companyProfileMessage) companyProfileMessage.textContent = '';

    // Cargar datos actuales de la empresa en el formulario
    document.getElementById('companyNameInput').value = currentUser.nombreEmpresa || '';
    document.getElementById('companyLogo').value = currentUser.logoUrl || '';
    document.getElementById('companySector').value = currentUser.sector || '';
    document.getElementById('companyDescription').value = currentUser.descripcion || '';
}

/**
 * Maneja la actualización del perfil de la empresa.
 */
async function handleCompanyProfileUpdate(e) {
    e.preventDefault();
    const companyProfileMessage = document.getElementById('companyProfileMessage');
    if (companyProfileMessage) companyProfileMessage.textContent = ''; // Limpiar mensajes

    const updatedCompany = {
        ...currentUser, // Mantener datos existentes
        nombreEmpresa: document.getElementById('companyNameInput').value,
        logoUrl: document.getElementById('companyLogo').value,
        sector: document.getElementById('companySector').value,
        descripcion: document.getElementById('companyDescription').value,
    };

    try {
        const response = await fetchData(`usuarios/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedCompany)
        });

        sessionStorage.setItem('currentUser', JSON.stringify(response)); // Actualizar sessionStorage
        currentUser = response; // Actualizar la variable global
        document.getElementById('companyName').textContent = currentUser.nombreEmpresa || currentUser.email;
        document.getElementById('welcomeCompany').textContent = currentUser.nombreEmpresa || currentUser.email;

        if (companyProfileMessage) {
            companyProfileMessage.textContent = 'Perfil de empresa actualizado exitosamente!';
            companyProfileMessage.classList.remove('text-danger');
            companyProfileMessage.classList.add('text-success');
        }
    } catch (error) {
        console.error('Error al actualizar perfil de empresa:', error);
        if (companyProfileMessage) {
            companyProfileMessage.textContent = 'Error al actualizar perfil de empresa. Por favor, inténtalo de nuevo.';
            companyProfileMessage.classList.remove('text-success');
            companyProfileMessage.classList.add('text-danger');
        }
    }
}

// Asignar funciones exportadas a `window` para que sean accesibles directamente desde el HTML
// Esto es necesario porque los event handlers en el HTML (ej. onclick) no pueden acceder directamente a funciones importadas de módulos ES6.
window.loadMyJobOffers = loadMyJobOffers;
window.createNewOffer = createNewOffer;
window.editOffer = editOffer;
window.closeOffer = closeOffer;
window.activateOffer = activateOffer;
window.deleteOffer = deleteOffer;
window.viewApplicants = viewApplicants;
window.showApplicantDetail = showApplicantDetail;
window.hideApplicantDetail = hideApplicantDetail;
window.updateApplicationStatus = updateApplicationStatus;
window.loadCompanyProfile = loadCompanyProfile;