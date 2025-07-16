// js/utils.js

export const API_BASE_URL = 'http://localhost:3000'; // Asegúrate de que coincida con el puerto de json-server

/**
 * Función genérica para hacer peticiones fetch a la API.
 * @param {string} endpoint - La parte de la URL después de la base (ej. 'usuarios', 'ofertas/1').
 * @param {object} options - Opciones para la petición fetch (method, headers, body, etc.).
 * @returns {Promise<object>} - La respuesta parseada como JSON.
 */
export async function fetchData(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        if (!response.ok) {
            // Mejora en el manejo de errores para ver el mensaje del servidor
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            if (errorText) {
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage += ` - ${errorJson.message || errorText}`;
                } catch (e) {
                    errorMessage += ` - ${errorText}`;
                }
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error en fetchData para ${endpoint}:`, error);
        throw error; // Re-lanza el error para que quien llame a la función lo maneje
    }
}

/**
 * Función para mostrar una sección específica y ocultar las demás.
 * Usada para la navegación tipo SPA.
 * @param {string} sectionId - El ID de la sección a mostrar.
 */
export function showSection(sectionId) {
    document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active-section');
        section.classList.add('d-none');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active-section');
        targetSection.classList.remove('d-none');
    }
}

/**
 * Configura los event listeners para la navegación del navbar.
 * Asume que los enlaces tienen un `data-section` con el prefijo de la sección (ej. "offers", "profile").
 */
export function setupNavbarNavigation() {
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section + 'Section'; // Convierte 'offers' a 'offersSection'
            showSection(sectionId);

            // Actualizar clase 'active' en el nav-link
            document.querySelectorAll('.navbar-nav .nav-link').forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');

            // Llamar a la función de carga de datos específica si existe
            // Esto es crucial para que el contenido se actualice al hacer clic en el nav-link
            if (window.location.pathname.includes('candidato')) {
                if (sectionId === 'offersSection' && typeof window.loadJobOffers === 'function') {
                    window.loadJobOffers();
                } else if (sectionId === 'myApplicationsSection' && typeof window.loadMyApplications === 'function') {
                    window.loadMyApplications();
                } else if (sectionId === 'profileSection' && typeof window.loadProfile === 'function') {
                    window.loadProfile();
                } else if (sectionId === 'companiesSection' && typeof window.loadCompanies === 'function') {
                    window.loadCompanies();
                }
            } else if (window.location.pathname.includes('empresa')) {
                if (sectionId === 'myOffersSection' && typeof window.loadMyJobOffers === 'function') {
                    window.loadMyJobOffers();
                } else if (sectionId === 'newOfferSection' && typeof window.createNewOffer === 'function') {
                    window.createNewOffer(); // Limpia formulario para nueva oferta
                } else if (sectionId === 'profileSection' && typeof window.loadCompanyProfile === 'function') {
                    window.loadCompanyProfile();
                }
            }
        });
    });
}