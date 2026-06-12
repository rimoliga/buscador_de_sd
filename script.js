import { LAST_QUERY_KEY, BANDS } from './modules/config.js';
import { loadAllData } from './modules/dataset.js';
import {
    showLoading, showError,
    updateLastUpdatedLabel, updateLastQueryLabel,
    renderStats, renderPinned, displayResults,
    initBandSelector, updateUtcClock, updateContactTimers, renderLogbook,
} from './modules/ui.js';
import { ensureVersionStored, maybeShowVersionNotice, handleVersionMessage } from './modules/version.js';
import { isPinned as checkPinned, persistPinnedSignals, rehydratePinned } from './modules/pins.js';
import { searchRadio, applySavedQueryOrIdle } from './modules/search.js';
import { initializeSectionTabs } from './modules/tabs.js';
import { setupPWAInstall, setupServiceWorker, setupOfflineDetection } from './modules/pwa.js';
import {
    initLogbook, startContact, cancelContact, logContact,
    isContactActive, getActiveContact, elapsedSeconds,
    getLoggedQSOs, deleteQSO, clearLogbook, buildADIF,
} from './modules/logbook.js';

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

function getCurrentBand() {
    return document.getElementById('bandSelector')?.value || '40m';
}

function pinnedCallbacks() {
    return {
        onUnpin,
        onStartContact,
        onCancelContact,
        onLogContact,
        isContactActive,
        getActiveContact,
    };
}

function logCallbacks() {
    return {
        onDelete: (id) => { deleteQSO(id); renderLogbook(getLoggedQSOs(), logCallbacks()); },
        onExport: () => {
            const adif = buildADIF(getLoggedQSOs());
            const blob = new Blob([adif], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `log_${new Date().toISOString().slice(0, 10)}.adi`;
            a.click();
            URL.revokeObjectURL(url);
        },
        onClear: () => {
            if (!confirm('¿Limpiar todos los QSOs del log?')) return;
            clearLogbook();
            renderLogbook(getLoggedQSOs(), logCallbacks());
        },
    };
}

function onUnpin(sd) {
    cancelContact(sd);
    pinned = pinned.filter(r => r['Señal Distintiva'] !== sd);
    persistPinnedSignals(pinned);
    renderPinned(pinned, pinnedCallbacks());
    if (searchInput.value.trim()) {
        searchRadio(searchInput.value, radioData, { isPinned, onPin });
    }
}

function onPin(radio, results, searchTerm) {
    if (!radio || isPinned(radio['Señal Distintiva'])) return;
    pinned = [...pinned, radio];
    persistPinnedSignals(pinned);
    startContact(radio, getCurrentBand());
    renderPinned(pinned, pinnedCallbacks());
    displayResults(results, searchTerm, { isPinned, onPin });
}

function onStartContact(callsign) {
    const radio = pinned.find(r => r['Señal Distintiva'] === callsign);
    if (radio) startContact(radio, getCurrentBand());
    renderPinned(pinned, pinnedCallbacks());
}

function onCancelContact(callsign) {
    cancelContact(callsign);
    renderPinned(pinned, pinnedCallbacks());
}

function onLogContact(callsign) {
    const sentEl = document.querySelector(`[data-rst-sent="${callsign}"]`);
    const recvEl = document.querySelector(`[data-rst-recv="${callsign}"]`);
    logContact(callsign, {
        rstSent: sentEl?.value || '59',
        rstRecv: recvEl?.value || '59',
        band: getCurrentBand(),
    });
    renderPinned(pinned, pinnedCallbacks());
    renderLogbook(getLoggedQSOs(), logCallbacks());
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
        renderPinned(pinned, pinnedCallbacks());
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
            const normalized = value.trim().toUpperCase();
            localStorage.setItem(LAST_QUERY_KEY, normalized);
            updateLastQueryLabel(normalized);
            history.replaceState(null, '', `?q=${encodeURIComponent(normalized)}`);
        } else {
            localStorage.removeItem(LAST_QUERY_KEY);
            history.replaceState(null, '', location.pathname);
        }
        searchRadio(value, radioData, { isPinned, onPin });
    }, 250);
});

document.addEventListener('DOMContentLoaded', () => {
    const urlQuery = new URLSearchParams(location.search).get('q');
    const initialQuery = urlQuery ? urlQuery.toUpperCase() : (localStorage.getItem(LAST_QUERY_KEY) || '');
    if (urlQuery) localStorage.setItem(LAST_QUERY_KEY, initialQuery);
    if (initialQuery) {
        searchInput.value = initialQuery;
        updateLastQueryLabel(initialQuery);
    } else {
        updateLastQueryLabel('');
    }
    initLogbook(() => {
        updateContactTimers(elapsedSeconds);
        updateUtcClock();
    });
    initBandSelector(BANDS);
    updateUtcClock();
    loadData()
        .then(() => maybeShowVersionNotice(versionInfo))
        .catch((error) => console.error('Error al cargar datos', error));
    renderPinned(pinned, pinnedCallbacks());
    renderLogbook(getLoggedQSOs(), logCallbacks());
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
