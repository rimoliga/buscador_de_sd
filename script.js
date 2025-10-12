let radioData = [];
let isLoading = false;
let pinned = [];

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');
const totalRecords = document.getElementById('totalRecords');
const pinnedResultsContainer = document.getElementById('pinnedResults');

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
    message: 'Ejemplo: <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU2EUE</span>, <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU2DT</span>',
    color: 'gray'
});
function matchEspecial(especial, searchTerm) {
    return especial
        .toUpperCase()
        .split(',')
        .map(s => s.trim())
        .includes(searchTerm);
}
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
function renderPinned() {
    if (!pinned.length) {
        pinnedResultsContainer.innerHTML = '';
        return;
    }
    pinnedResultsContainer.innerHTML = pinned.map(radio => `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full max-w-full sm:max-w-2xl bg-blue-100 text-blue-800 px-3 py-2 rounded-lg shadow text-sm">
            <div class="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 w-full">
                <span class="font-mono font-semibold text-center sm:text-left break-words">
                    ${radio['Señal Distintiva']}
                    ${radio['Señal Distintiva Especial'] || ''}
                </span>
                <span class="text-gray-700 font-medium break-words text-center sm:text-left">${radio['Titular de la Licencia'] || 'Sin titular'}</span>
                <span class="text-gray-500 break-words text-center sm:text-left">
                    ${radio['Provincia'] || 'Sin provincia'}${radio['Localidad'] ? ' · ' + radio['Localidad'] : ''}
                </span>
            </div>
            <button
                class="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-400 rounded-full hover:text-red-600 hover:border-red-400 transition sm:ml-auto"
                title="Quitar"
                data-unpin="${radio['Señal Distintiva']}">
                &times;
            </button>
        </div>
    `).join('');
    pinnedResultsContainer.querySelectorAll('[data-unpin]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sd = btn.getAttribute('data-unpin');
            pinned = pinned.filter(r => r['Señal Distintiva'] !== sd);
            renderPinned();
        });
    });
}
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
            ${createCardHTML(radio, pinned.some(r => r['Señal Distintiva'] === radio['Señal Distintiva']))}
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
function createCardHTML(radio, isPinned) {
    return `
        <div class="bg-white/90 border border-slate-200 rounded-2xl shadow-lg p-6 mb-6 relative transition hover:shadow-2xl">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div class="flex flex-col gap-1">
                    <span class="text-blue-600 text-2xl font-bold font-mono break-words">${radio['Señal Distintiva'] || 'N/A'}</span>
                    <span class="text-gray-800 text-lg font-semibold break-words">${radio['Titular de la Licencia'] || 'N/A'}</span>
                </div>
                <button
                    class="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded-full shadow transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    data-pin="${radio['Señal Distintiva']}"
                    ${isPinned ? 'disabled' : ''}>
                    ${isPinned ? '📌 Fijado' : '📌 Fijar'}
                </button>
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
let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        searchRadio(e.target.value);
    }, 250);
});
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
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installPwaSection) installPwaSection.style.display = 'block';
});
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
window.addEventListener('appinstalled', () => {
    if (installPwaSection) installPwaSection.style.display = 'none';
});

const hideInstallBtn = document.getElementById('hideInstallPwaSection');
if (hideInstallBtn && installPwaSection) {
    hideInstallBtn.addEventListener('click', () => {
        installPwaSection.style.display = 'none';
    });
}

