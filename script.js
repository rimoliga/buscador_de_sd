const DATA_URL = 'data/listado_radioaficionados_unificado.json.gz';
const METADATA_URL = 'data/dataset_metadata.json';
const PINNED_STORAGE_KEY = 'buscador_sd_pinned';
const LAST_QUERY_KEY = 'buscador_sd_last_query';

let radioData = [];
let isLoading = false;
let pinned = [];
let updateBadgeTimeout;
let metadataInfo = null;

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');
const totalRecords = document.getElementById('totalRecords');
const pinnedResultsContainer = document.getElementById('pinnedResults');
const lastUpdatedLabel = document.getElementById('lastUpdated');
const lastQueryLabel = document.getElementById('lastQueryLabel');

import { decompressSync, strFromU8 } from "https://cdn.skypack.dev/pin/fflate@v0.8.2-5l9B8rfElbxSDZ5tcGZe/mode=imports/optimized/fflate.js";

async function loadData(options = {}) {
    const { preserveResults = false, notifyUpdate = false } = options;
    const cacheMode = preserveResults ? 'reload' : 'default';
    if (isLoading) return;
    isLoading = true;
    if (!preserveResults) {
        showLoading();
    }
    try {
        const [dataset, metadata] = await Promise.all([
            fetchDataset(cacheMode),
            fetchMetadata(cacheMode)
        ]);
        radioData = dataset;
        metadataInfo = metadata;
        totalRecords.textContent = `Total: ${radioData.length} registros${notifyUpdate ? ' · actualizado' : ''}`;
        if (notifyUpdate) {
            scheduleTotalRecordsReset();
        }
        updateLastUpdatedLabel();
        rehydratePinnedFromStorage();
        if (preserveResults && searchInput.value.trim()) {
            searchRadio(searchInput.value);
        } else {
            applySavedQueryOrIdle();
        }
    } catch (error) {
        showError('Error al cargar los datos: ' + error.message);
    } finally {
        isLoading = false;
    }
}

function scheduleTotalRecordsReset() {
    clearTimeout(updateBadgeTimeout);
    updateBadgeTimeout = setTimeout(() => {
        totalRecords.textContent = `Total: ${radioData.length} registros`;
    }, 4000);
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

async function fetchDataset(cacheMode) {
    const response = await fetch(DATA_URL, { cache: cacheMode });
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const compressedBuffer = await response.arrayBuffer();
    const decompressed = decompressSync(new Uint8Array(compressedBuffer));
    const jsonString = strFromU8(decompressed);
    return JSON.parse(jsonString);
}

async function fetchMetadata(cacheMode) {
    try {
        const response = await fetch(METADATA_URL, { cache: cacheMode });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('No se pudo obtener metadata de actualización', error);
        return null;
    }
}

function updateLastUpdatedLabel() {
    if (!lastUpdatedLabel) return;
    if (metadataInfo?.last_updated_human) {
        lastUpdatedLabel.textContent = `Actualizado: ${metadataInfo.last_updated_human}`;
    } else if (metadataInfo?.last_updated) {
        lastUpdatedLabel.textContent = `Actualizado: ${metadataInfo.last_updated}`;
    } else {
        lastUpdatedLabel.textContent = '';
    }
}

function updateLastQueryLabel(value) {
    if (!lastQueryLabel) return;
    lastQueryLabel.textContent = value ? value.toUpperCase() : '—';
}

function matchEspecial(especial, searchTerm) {
    return especial
        .toUpperCase()
        .split(',')
        .map(s => s.trim())
        .includes(searchTerm);
}

function searchRadio(query) {
    if (!query.trim()) {
        updateLastQueryLabel('');
        showNoResults();
        return;
    }
    const searchTerm = query.toUpperCase().trim();
    updateLastQueryLabel(searchTerm);
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
            handleUnpin(btn.getAttribute('data-unpin'));
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
            ${createCardHTML(radio, isPinned(radio['Señal Distintiva']))}
        </div>`
    ).join('');
    resultsContainer.innerHTML = html;
    resultsContainer.querySelectorAll('[data-pin]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sd = btn.getAttribute('data-pin');
            const radio = results.find(r => r['Señal Distintiva'] === sd);
            handlePin(radio, results, searchTerm);
        });
    });
    const firstResult = document.getElementById('search-result-0');
    if (firstResult) {
        requestAnimationFrame(() => {
            firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}

function createCardHTML(radio, isPinnedCard) {
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
                    ${isPinnedCard ? 'disabled' : ''}>
                    ${isPinnedCard ? '📌 Fijado' : '📌 Fijar'}
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

function handlePin(radio, results, searchTerm) {
    if (!radio || isPinned(radio['Señal Distintiva'])) return;
    pinned.push(radio);
    persistPinnedSignals();
    renderPinned();
    displayResults(results, searchTerm);
}

function handleUnpin(sd) {
    pinned = pinned.filter(r => r['Señal Distintiva'] !== sd);
    persistPinnedSignals();
    renderPinned();
    if (searchInput.value.trim()) {
        searchRadio(searchInput.value);
    }
}

function isPinned(sd) {
    return pinned.some(r => r['Señal Distintiva'] === sd);
}

function persistPinnedSignals() {
    const signals = pinned.map(r => r['Señal Distintiva']);
    try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(signals));
    } catch (error) {
        console.warn('No se pudo guardar la lista de fijados', error);
    }
}

function loadPinnedSignals() {
    try {
        const stored = JSON.parse(localStorage.getItem(PINNED_STORAGE_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

function rehydratePinnedFromStorage() {
    const storedSignals = loadPinnedSignals();
    if (!storedSignals.length || !radioData.length) {
        pinned = [];
        renderPinned();
        return;
    }
    pinned = storedSignals
        .map(sd => radioData.find(r => r['Señal Distintiva'] === sd))
        .filter(Boolean);
    persistPinnedSignals(); // limpia señales inexistentes
    renderPinned();
}

function applySavedQueryOrIdle() {
    const lastQuery = localStorage.getItem(LAST_QUERY_KEY) || '';
    if (lastQuery) {
        searchInput.value = lastQuery;
        updateLastQueryLabel(lastQuery);
        searchRadio(lastQuery);
    } else {
        updateLastQueryLabel('');
        showNoResults();
    }
}

let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    const { value } = e.target;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        if (value.trim()) {
            localStorage.setItem(LAST_QUERY_KEY, value);
        } else {
            localStorage.removeItem(LAST_QUERY_KEY);
        }
        searchRadio(value);
    }, 250);
});

document.addEventListener('DOMContentLoaded', () => {
    const savedQuery = localStorage.getItem(LAST_QUERY_KEY);
    if (savedQuery) {
        searchInput.value = savedQuery;
        updateLastQueryLabel(savedQuery);
    } else {
        updateLastQueryLabel('');
    }
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
            console.error('No se pudo registrar el Service Worker', err);
        });
    });
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
            loadData({ preserveResults: true, notifyUpdate: true });
        }
    });
}
