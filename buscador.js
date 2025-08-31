// Datos y estado
let radioData = [];
let isLoading = false;
let pinned = [];

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');
const totalRecords = document.getElementById('totalRecords');
const pinnedResultsContainer = document.getElementById('pinnedResults');

// Cargar datos comprimidos
import { decompressSync, strFromU8 } from "https://cdn.skypack.dev/pin/fflate@v0.8.2-5l9B8rfElbxSDZ5tcGZe/mode=imports/optimized/fflate.js";

async function loadData() {
    if (isLoading) return;
    isLoading = true;
    showLoading();
    try {
        const response = await fetch('data/listado_radioaficionados_unificado.json.gz');
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const compressedBuffer = await response.arrayBuffer();
        const decompressed = decompressSync(new Uint8Array(compressedBuffer));
        const jsonString = strFromU8(decompressed);
        radioData = JSON.parse(jsonString);
        totalRecords.textContent = `Total: ${radioData.length} registros`;
        showNoResults();
    } catch (error) {
        showError('Error al cargar los datos: ' + error.message);
    } finally {
        isLoading = false;
    }
}

// Función auxiliar para mostrar mensajes genéricos
function showMessage({ icon, title, message, color = 'gray', countText = 'Resultados' }) {
    resultsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-${color}-500">
            <div class="text-6xl mb-4 opacity-40">${icon}</div>
            <h3 class="text-xl font-semibold mb-2">${title}</h3>
            <p class="text-base">${message}</p>
        </div>
    `;
    resultsCount.textContent = countText;
}

// Mensajes de estado
const showLoading = () => showMessage({
    icon: '🔄',
    title: 'Cargando datos...',
    message: '',
    color: 'blue'
});
const showError = (message) => showMessage({
    icon: '❌',
    title: 'Error',
    message,
    color: 'red'
});
const showNoResults = () => showMessage({
    icon: '📡',
    title: 'Ingresa una señal distintiva para buscar',
    message: 'Ejemplo: <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU1AAA</span>, <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU0CD</span>',
    color: 'gray'
});

// Función auxiliar para coincidencia de señales especiales
function matchEspecial(especial, searchTerm) {
    return especial
        .toUpperCase()
        .split(',')
        .map(s => s.trim())
        .includes(searchTerm);
}

// Buscar radioaficionados
function searchRadio(query) {
    if (!query.trim()) {
        showNoResults();
        return;
    }
    const searchTerm = query.toUpperCase().trim();
    const results = radioData.filter(radio => {
        const matchPrincipal = radio['Señal Distintiva'] &&
            radio['Señal Distintiva'].toUpperCase() === searchTerm;
        const matchEsp = radio['Señal Distintiva Especial'] &&
            matchEspecial(radio['Señal Distintiva Especial'], searchTerm);
        return matchPrincipal || matchEsp;
    });
    displayResults(results, searchTerm);
}

// Renderizar sección de fijados
function renderPinned() {
    if (!pinned.length) {
        pinnedResultsContainer.innerHTML = '';
        return;
    }
    pinnedResultsContainer.innerHTML = pinned.map(radio => `
        <span class="flex items-center bg-blue-100 text-blue-800 px-3 py-2 rounded-full shadow gap-3 text-sm">
            <span class="font-mono font-semibold">${radio['Señal Distintiva']}</span>
            <span class="font-mono font-semibold">${radio['Señal Distintiva Especial'] || ''}</span>
            <span class="text-gray-700 font-medium">${radio['Titular de la Licencia'] || 'Sin titular'}</span>
            <span class="text-gray-500">${radio['Provincia'] || 'Sin provincia'}${radio['Localidad'] ? ' · ' + radio['Localidad'] : ''}</span>
            <button class="ml-2 text-blue-500 hover:text-red-500 transition" title="Quitar" data-unpin="${radio['Señal Distintiva']}">&times;</button>
        </span>
    `).join('');
    pinnedResultsContainer.querySelectorAll('[data-unpin]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sd = btn.getAttribute('data-unpin');
            pinned = pinned.filter(r => r['Señal Distintiva'] !== sd);
            renderPinned();
        });
    });
}

// Mostrar resultados
function displayResults(results, searchTerm) {
    if (results.length === 0) {
        showMessage({
            icon: '🔍',
            title: 'No se encontraron resultados',
            message: `No hay radioaficionados con la señal distintiva "<span class="font-mono bg-gray-100 px-2 py-1 rounded">${searchTerm}</span>"`,
            color: 'gray',
            countText: 'Sin resultados'
        });
        return;
    }
    resultsCount.textContent = `${results.length} resultado${results.length > 1 ? 's' : ''}`;
    const html = results.map((radio, idx) =>
        `<div id="search-result-${idx}" class="search-result relative group">
            ${createCardHTML(radio)}
            <button class="absolute top-4 right-4 px-3 py-1 text-xs bg-blue-500 text-white rounded-full shadow hover:bg-blue-700 transition
                ${pinned.some(r => r['Señal Distintiva'] === radio['Señal Distintiva']) ? 'opacity-50 cursor-not-allowed' : ''}
            " data-pin="${radio['Señal Distintiva']}" ${pinned.some(r => r['Señal Distintiva'] === radio['Señal Distintiva']) ? 'disabled' : ''}>
                📌 Fijar
            </button>
        </div>`
    ).join('');
    resultsContainer.innerHTML = html;
    resultsContainer.querySelectorAll('[data-pin]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sd = btn.getAttribute('data-pin');
            const radio = results.find(r => r['Señal Distintiva'] === sd);
            if (radio && !pinned.some(r => r['Señal Distintiva'] === sd)) {
                pinned.push(radio);
                renderPinned();
                displayResults(results, searchTerm);
            }
        });
    });
    const firstResult = document.getElementById('search-result-0');
    if (firstResult) {
        requestAnimationFrame(() => {
            firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}

// Crear HTML de tarjeta (función auxiliar)
function createCardHTML(radio) {
    return `
        <div class="bg-white/90 border border-slate-200 rounded-2xl shadow-lg p-6 mb-6 relative transition hover:shadow-2xl">
            <div class="flex items-center mb-3 gap-4">
                <span class="text-blue-600 text-2xl font-bold font-mono">${radio['Señal Distintiva'] || 'N/A'}</span>
                <span class="text-gray-800 text-lg font-semibold">${radio['Titular de la Licencia'] || 'N/A'}</span>
            </div>
            ${radio['Señal Distintiva Especial'] ? `
                <div class="mb-2">
                    <span class="text-xs text-gray-400 uppercase">Especial:</span>
                    <span class="font-mono bg-yellow-100 px-2 py-1 rounded ml-2">${radio['Señal Distintiva Especial']}</span>
                </div>
            ` : ''}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                    <div class="text-xs text-gray-400 uppercase">Categoría</div>
                    <div class="font-medium text-gray-800">${radio['Categoría'] || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 uppercase">Provincia</div>
                    <div class="font-medium text-gray-800">${radio['Provincia'] || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 uppercase">Localidad</div>
                    <div class="font-medium text-gray-800">${radio['Localidad'] || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;
}

// Debounce para optimizar búsquedas
let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        searchRadio(e.target.value);
    }, 250);
});

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderPinned();
});

let deferredPrompt;
const installBtn = document.getElementById('installPwaBtn');
const installPwaSection = document.getElementById('installPwaSection');

if (installPwaSection) {
    installPwaSection.style.display = 'none';
}

// Muestra la sección solo si se puede instalar
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installPwaSection) installPwaSection.style.display = 'block';
});

// Maneja el click en el botón de instalar
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted' && installPwaSection) {
                installPwaSection.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });
}

// Oculta la sección si la app ya está instalada
window.addEventListener('appinstalled', () => {
    if (installPwaSection) installPwaSection.style.display = 'none';
});

const hideInstallBtn = document.getElementById('hideInstallPwaSection');
if (hideInstallBtn && installPwaSection) {
    hideInstallBtn.addEventListener('click', () => {
        installPwaSection.style.display = 'none';
    });
}

