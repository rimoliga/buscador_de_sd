import { initMap, getMap, invalidateSize, setUserMarker } from './map.js';

let repeaterData = [];
let currentFiltered = [];
let userLocation = null;
let sortBy = null; // null | 'dist-asc' | 'dist-desc'
let repLayerVisible = true;
let _repMarkers = [];

export async function loadRepeaterData() {
    const res = await fetch('data/repetidoras.json');
    repeaterData = await res.json();
    return repeaterData;
}

export function setUserLocation(lat, lng) {
    userLocation = { lat, lng };
    setUserMarker(lat, lng);
    refreshView();
}

export function setRepeatersLayerVisible(visible) {
    repLayerVisible = visible;
    const map = getMap();
    if (!map) return;
    if (visible) {
        _repMarkers.forEach(m => m.addTo(map));
    } else {
        _repMarkers.forEach(m => map.removeLayer(m));
    }
}

export function initRepeatersSection() {
    const provinces = [...new Set(repeaterData.map(r => r.province).filter(Boolean))].sort();
    const sel = document.getElementById('repProvinceFilter');
    if (sel) {
        sel.innerHTML = '<option value="all">Todas las provincias</option>' +
            provinces.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    ['repSearchInput', 'repBandFilter', 'repProvinceFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', refreshView);
    });
    document.getElementById('repViewList')?.addEventListener('click', () => switchView('list'));
    document.getElementById('repViewMap')?.addEventListener('click', () => switchView('map'));
    switchView('map');
}

function getFilters() {
    return {
        band: document.getElementById('repBandFilter')?.value || 'all',
        province: document.getElementById('repProvinceFilter')?.value || 'all',
        query: (document.getElementById('repSearchInput')?.value || '').trim().toUpperCase(),
    };
}

function applyFilters({ band, province, query }) {
    return repeaterData.filter(r => {
        if (band !== 'all' && r.band !== band) return false;
        if (province !== 'all' && r.province !== province) return false;
        if (query && !r.callsign.toUpperCase().includes(query)) return false;
        return true;
    });
}

function withDistances(data) {
    if (!userLocation) return data;
    return data.map(r => {
        if (!r.coords) return { ...r, dist: null };
        return { ...r, dist: haversineKm(userLocation.lat, userLocation.lng, r.coords[0], r.coords[1]) };
    });
}

function applySortBy(data) {
    if (!sortBy || !userLocation) return data;
    return [...data].sort((a, b) => {
        const da = a.dist ?? Infinity;
        const db = b.dist ?? Infinity;
        return sortBy === 'dist-asc' ? da - db : db - da;
    });
}

function refreshView() {
    let data = applyFilters(getFilters());
    data = withDistances(data);
    data = applySortBy(data);
    currentFiltered = data;
    const count = document.getElementById('repCount');
    if (count) count.textContent = `${currentFiltered.length} repetidora${currentFiltered.length !== 1 ? 's' : ''}`;
    const mapContainer = document.getElementById('repMapContainer');
    const isMapView = mapContainer && !mapContainer.classList.contains('hidden');
    if (isMapView) updateMapMarkers(currentFiltered);
    else renderList(currentFiltered);
}

function switchView(view) {
    const listEl = document.getElementById('repListContainer');
    const mapEl = document.getElementById('repMapContainer');
    const layerToggles = document.getElementById('mapLayerToggles');
    const btnList = document.getElementById('repViewList');
    const btnMap = document.getElementById('repViewMap');
    const isMap = view === 'map';

    listEl?.classList.toggle('hidden', isMap);
    mapEl?.classList.toggle('hidden', !isMap);
    layerToggles?.classList.toggle('hidden', !isMap);

    const on = ['bg-blue-500/20', 'border-blue-400/40', 'text-blue-100'];
    const off = ['border-white/10', 'text-white/60'];
    if (isMap) {
        btnMap?.classList.add(...on); btnMap?.classList.remove(...off);
        btnList?.classList.remove(...on); btnList?.classList.add(...off);
    } else {
        btnList?.classList.add(...on); btnList?.classList.remove(...off);
        btnMap?.classList.remove(...on); btnMap?.classList.add(...off);
    }

    if (isMap && !getMap()) initMap('repMap');
    else if (isMap) invalidateSize();

    refreshView();

    if (isMap && userLocation) setUserMarker(userLocation.lat, userLocation.lng);
}

function renderList(data) {
    const container = document.getElementById('repListContainer');
    if (!container) return;
    if (!data.length) {
        container.innerHTML = `<div class="flex flex-col items-center py-12 text-slate-400">
            <div class="text-5xl mb-4 opacity-30">📡</div>
            <p class="text-sm">Sin resultados con los filtros actuales.</p></div>`;
        return;
    }
    const hasLoc = !!userLocation;
    const sortIcon = sortBy === 'dist-asc' ? '↑' : sortBy === 'dist-desc' ? '↓' : '↕';
    container.innerHTML = `
        ${hasLoc ? `
        <div class="flex items-center px-1 pb-2 text-xs text-white/30 border-b border-white/5 mb-2">
            <span class="w-20 shrink-0">Señal</span>
            <span class="flex-1">Localidad</span>
            <button id="distSortBtn" class="ml-auto shrink-0 hover:text-white/60 transition flex items-center gap-1">
                Distancia <span>${sortIcon}</span>
            </button>
        </div>` : ''}
        <div class="space-y-2">
            ${data.map(r => `
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100">
                <span class="font-mono font-bold tracking-wider text-blue-300 w-20 shrink-0">${r.callsign}</span>
                <span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs shrink-0">${r.band}</span>
                <span class="font-mono text-slate-200 shrink-0">${r.ftx} MHz</span>
                ${r.tone ? `<span class="text-slate-400 text-xs shrink-0">T: ${r.tone} Hz</span>` : ''}
                <span class="text-slate-400 text-xs truncate">${r.locality}${r.locality && r.province ? ', ' : ''}${r.province}</span>
                ${hasLoc ? `<span class="ml-auto text-xs font-mono shrink-0 ${r.dist != null ? 'text-blue-300' : 'text-white/20'}">
                    ${r.dist != null ? (r.dist < 100 ? r.dist.toFixed(0) : Math.round(r.dist)) + ' km' : '—'}
                </span>` : ''}
            </div>`).join('')}
        </div>`;
    container.querySelector('#distSortBtn')?.addEventListener('click', () => {
        sortBy = sortBy === 'dist-asc' ? 'dist-desc' : 'dist-asc';
        refreshView();
    });
}

function updateMapMarkers(data) {
    const map = getMap();
    if (!map) return;
    _repMarkers.forEach(m => map.removeLayer(m));
    _repMarkers = [];
    if (!repLayerVisible) return;
    data.filter(r => r.coords).forEach(r => {
        const popup = `<b>${r.callsign}</b><br>${r.ftx} MHz ${r.band}${r.tone ? `<br>Subtono: ${r.tone} Hz` : ''}<br>${r.locality}, ${r.province}<br><small>${r.owner}</small>`;
        const m = L.marker(r.coords).addTo(map).bindPopup(popup);
        _repMarkers.push(m);
    });
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
