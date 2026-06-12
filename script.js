import { LAST_QUERY_KEY, BANDS, MODES, BAND_RANGES } from './modules/config.js';
import { loadRepeaterData, initRepeatersSection, setUserLocation, setRepeatersLayerVisible } from './modules/repeaters.js';
import { renderStationsPanel, updateStationsLayer, initMyGridInput, setStationsLayerVisible, saveMyGrid } from './modules/stations.js';
import { latLngToGrid } from './modules/map.js';
import { loadAllData } from './modules/dataset.js';
import {
    showLoading, showError,
    updateLastUpdatedLabel, updateLastQueryLabel,
    renderPinned, displayResults,
    initBandSelector, initModeSelector, updateUtcClock, updateContactTimers, renderLogbook, renderMiniLog,
} from './modules/ui.js';
import { ensureVersionStored, maybeShowVersionNotice, handleVersionMessage } from './modules/version.js';
import { isPinned as checkPinned, persistPinnedSignals, rehydratePinned } from './modules/pins.js';
import { searchRadio, applySavedQueryOrIdle } from './modules/search.js';
import { initializeSectionTabs } from './modules/tabs.js';
import { setupPWAInstall, setupServiceWorker, setupOfflineDetection } from './modules/pwa.js';
import {
    initLogbook, startContact, cancelContact, logContact,
    isContactActive, getActiveContact, elapsedSeconds,
    getLoggedQSOs, deleteQSO, clearLogbook, buildADIF, updateQSONotes,
} from './modules/logbook.js';

const searchInput = document.getElementById('searchInput');
const totalRecords = document.getElementById('totalRecords');

let radioData = [];
let pinned = [];
let isLoading = false;
let metadataInfo = null;
let versionInfo = null;
let updateBadgeTimeout;

const isPinned = (sd) => checkPinned(pinned, sd);

function getCurrentBand() {
    return document.getElementById('bandSelector')?.value || '40m';
}

function getCurrentMode() {
    return document.getElementById('modeSelector')?.value || 'SSB';
}

function getCurrentFreq() {
    const val = document.getElementById('freqInput')?.value;
    return val ? val.trim() : '';
}

function freqToBand(freqMhz) {
    const freq = parseFloat(freqMhz);
    if (isNaN(freq) || freq <= 0) return null;
    let closest = null, minDist = Infinity;
    for (const { band, low, high } of BAND_RANGES) {
        const dist = freq < low ? low - freq : freq > high ? freq - high : 0;
        if (dist < minDist) { minDist = dist; closest = band; }
    }
    return closest;
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

function exportADIF() {
    const adif = buildADIF(getLoggedQSOs());
    const blob = new Blob([adif], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log_${new Date().toISOString().slice(0, 10)}.adi`;
    a.click();
    URL.revokeObjectURL(url);
}

function refreshLog() {
    const qsos = getLoggedQSOs();
    renderLogbook(qsos, {
        onDelete: (id) => { deleteQSO(id); refreshLog(); },
        onExport: exportADIF,
        onClear: () => { if (!confirm('¿Limpiar todos los QSOs del log?')) return; clearLogbook(); refreshLog(); },
        onUpdateNotes: (id, notes) => updateQSONotes(id, notes),
    });
    renderMiniLog(qsos, { onExport: exportADIF });
}

function getPinnedCallsigns() {
    return pinned.map(r => r['Señal Distintiva']);
}

function syncStations() {
    renderStationsPanel(getPinnedCallsigns(), radioData);
    updateStationsLayer(getPinnedCallsigns(), radioData);
}

function onUnpin(sd) {
    cancelContact(sd);
    pinned = pinned.filter(r => r['Señal Distintiva'] !== sd);
    persistPinnedSignals(pinned);
    renderPinned(pinned, pinnedCallbacks());
    syncStations();
    if (searchInput.value.trim()) {
        searchRadio(searchInput.value, radioData, { isPinned, onPin });
    }
}

function onPin(radio, results, searchTerm) {
    if (!radio || isPinned(radio['Señal Distintiva'])) return;
    pinned = [...pinned, radio];
    persistPinnedSignals(pinned);
    if (document.getElementById('autoStartContact')?.checked) {
        startContact(radio, getCurrentBand());
    }
    renderPinned(pinned, pinnedCallbacks());
    syncStations();
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
        mode: getCurrentMode(),
        freq: getCurrentFreq(),
    });
    renderPinned(pinned, pinnedCallbacks());
    refreshLog();
}

async function loadData(options = {}) {
    const { preserveResults = false, notifyUpdate = false } = options;
    if (isLoading) return;
    isLoading = true;
    if (!preserveResults) showLoading();
    try {
        const cacheMode = preserveResults ? 'reload' : 'default';
        const { versionData, dataset, metadata } = await loadAllData(cacheMode);
        versionInfo = versionData;
        radioData = dataset;
        metadataInfo = metadata;
        ensureVersionStored(versionInfo);
        totalRecords.textContent = `Total: ${radioData.length} registros`;
        if (notifyUpdate) {
            clearTimeout(updateBadgeTimeout);
            updateBadgeTimeout = setTimeout(() => {
                totalRecords.textContent = `Total: ${radioData.length} registros`;
            }, 4000);
        }
        updateLastUpdatedLabel(metadataInfo);
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
    initModeSelector(MODES);
    document.getElementById('freqInput')?.addEventListener('input', (e) => {
        const band = freqToBand(e.target.value);
        if (band) document.getElementById('bandSelector').value = band;
    });
    updateUtcClock();
    loadData()
        .then(() => maybeShowVersionNotice(versionInfo))
        .catch((error) => console.error('Error al cargar datos', error));
    renderPinned(pinned, pinnedCallbacks());
    refreshLog();
    initializeSectionTabs();
    initMyGridInput(getPinnedCallsigns(), radioData);
    renderStationsPanel(getPinnedCallsigns(), radioData);

    let mapReady = false;
    document.querySelectorAll('[data-section-target="map"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (mapReady) return;
            mapReady = true;
            await loadRepeaterData();
            initRepeatersSection();
            syncStations();
        });
    });

    document.getElementById('locateBtn')?.addEventListener('click', () => {
        const btn = document.getElementById('locateBtn');
        if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
        if (btn) btn.textContent = '⏳ Localizando…';
        navigator.geolocation.getCurrentPosition(({ coords }) => {
            const { latitude: lat, longitude: lng } = coords;
            const grid = latLngToGrid(lat, lng);
            const input = document.getElementById('myGridInput');
            if (input) input.value = grid;
            saveMyGrid(grid);
            setUserLocation(lat, lng);
            syncStations();
            if (btn) btn.textContent = '📍 Mi posición';
        }, () => {
            alert('No se pudo obtener la ubicación.');
            if (btn) btn.textContent = '📍 Mi posición';
        });
    });

    function toggleLayerBtn(btn, isOn, activeClasses, inactiveClasses) {
        btn.dataset.on = isOn ? 'true' : 'false';
        if (isOn) { btn.classList.add(...activeClasses); btn.classList.remove(...inactiveClasses); }
        else { btn.classList.remove(...activeClasses); btn.classList.add(...inactiveClasses); }
    }

    document.getElementById('toggleRepLayer')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const nowOn = btn.dataset.on !== 'true';
        toggleLayerBtn(btn, nowOn,
            ['bg-blue-500/20', 'border-blue-400/40', 'text-blue-200'],
            ['border-white/10', 'text-white/30']);
        setRepeatersLayerVisible(nowOn);
    });

    document.getElementById('toggleStationsLayer')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const nowOn = btn.dataset.on !== 'true';
        toggleLayerBtn(btn, nowOn,
            ['bg-amber-500/20', 'border-amber-400/40', 'text-amber-200'],
            ['border-white/10', 'text-white/30']);
        setStationsLayerVisible(nowOn);
    });
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
