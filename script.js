import { LAST_QUERY_KEY } from './modules/config.js';
import { loadAllData } from './modules/dataset.js';
import {
    showLoading, showError,
    updateLastUpdatedLabel, updateLastQueryLabel,
    renderStats, renderPinned, displayResults,
} from './modules/ui.js';
import { ensureVersionStored, maybeShowVersionNotice, handleVersionMessage } from './modules/version.js';
import { isPinned as checkPinned, persistPinnedSignals, rehydratePinned } from './modules/pins.js';
import { searchRadio, applySavedQueryOrIdle } from './modules/search.js';
import { initializeSectionTabs } from './modules/tabs.js';
import { setupPWAInstall, setupServiceWorker, setupOfflineDetection } from './modules/pwa.js';

const searchInput = document.getElementById('searchInput');
const totalRecords = document.getElementById('totalRecords');

let radioData = [];
let pinned = [];
let isLoading = false;
let metadataInfo = null;
let statsData = null;
let versionInfo = null;
let updateBadgeTimeout;

const isPinned = (sd) => checkPinned(pinned, sd);

function onUnpin(sd) {
    pinned = pinned.filter(r => r['Señal Distintiva'] !== sd);
    persistPinnedSignals(pinned);
    renderPinned(pinned, { onUnpin });
    if (searchInput.value.trim()) {
        searchRadio(searchInput.value, radioData, { isPinned, onPin });
    }
}

function onPin(radio, results, searchTerm) {
    if (!radio || isPinned(radio['Señal Distintiva'])) return;
    pinned = [...pinned, radio];
    persistPinnedSignals(pinned);
    renderPinned(pinned, { onUnpin });
    displayResults(results, searchTerm, { isPinned, onPin });
}

async function loadData(options = {}) {
    const { preserveResults = false, notifyUpdate = false } = options;
    if (isLoading) return;
    isLoading = true;
    if (!preserveResults) showLoading();
    try {
        const cacheMode = preserveResults ? 'reload' : 'default';
        const { versionData, dataset, metadata, stats } = await loadAllData(cacheMode);
        versionInfo = versionData;
        radioData = dataset;
        metadataInfo = metadata;
        statsData = stats;
        ensureVersionStored(versionInfo);
        totalRecords.textContent = `Total: ${radioData.length} registros${notifyUpdate ? ' · actualizado' : ''}`;
        if (notifyUpdate) {
            clearTimeout(updateBadgeTimeout);
            updateBadgeTimeout = setTimeout(() => {
                totalRecords.textContent = `Total: ${radioData.length} registros`;
            }, 4000);
        }
        updateLastUpdatedLabel(metadataInfo);
        renderStats(statsData);
        pinned = rehydratePinned(radioData);
        persistPinnedSignals(pinned);
        renderPinned(pinned, { onUnpin });
        if (preserveResults && searchInput.value.trim()) {
            searchRadio(searchInput.value, radioData, { isPinned, onPin });
        } else {
            applySavedQueryOrIdle(radioData, searchInput, { isPinned, onPin });
        }
    } catch (error) {
        showError('Error al cargar los datos: ' + error.message);
    } finally {
        isLoading = false;
    }
}

let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    const { value } = e.target;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        if (value.trim()) {
            localStorage.setItem(LAST_QUERY_KEY, value);
            updateLastQueryLabel(value);
        } else {
            localStorage.removeItem(LAST_QUERY_KEY);
        }
        searchRadio(value, radioData, { isPinned, onPin });
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
    loadData()
        .then(() => maybeShowVersionNotice(versionInfo))
        .catch((error) => console.error('Error al cargar datos', error));
    renderPinned(pinned, { onUnpin });
    initializeSectionTabs();
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
            handleVersionMessage(event.data, versionInfo);
        }
    });
});

setupPWAInstall();
setupOfflineDetection();
setupServiceWorker({
    onDataUpdated: (data) => {
        handleVersionMessage(data, versionInfo);
        loadData({ preserveResults: true, notifyUpdate: true });
    },
});
