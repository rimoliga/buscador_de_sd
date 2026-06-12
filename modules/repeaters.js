import { initMap, getMap, invalidateSize, setUserMarker } from './map.js';

let repeaterData = [];
let currentFiltered = [];
let userLocation = null;

export async function loadRepeaterData() {
    const res = await fetch('data/repetidoras.json');
    repeaterData = await res.json();
    return repeaterData;
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
    document.getElementById('repNearbyBtn')?.addEventListener('click', findNearby);
    refreshView();
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

function refreshView() {
    currentFiltered = applyFilters(getFilters());
    const count = document.getElementById('repCount');
    if (count) count.textContent = `${currentFiltered.length} repetidora${currentFiltered.length !== 1 ? 's' : ''}`;
    const listVisible = !document.getElementById('repListContainer')?.classList.contains('hidden');
    if (listVisible) renderList(currentFiltered);
    else updateMapMarkers(currentFiltered);
}

function switchView(view) {
    const listEl = document.getElementById('repListContainer');
    const mapEl = document.getElementById('repMapContainer');
    const btnList = document.getElementById('repViewList');
    const btnMap = document.getElementById('repViewMap');
    const isMap = view === 'map';
    listEl?.classList.toggle('hidden', isMap);
    mapEl?.classList.toggle('hidden', !isMap);
    btnList?.classList.toggle('bg-blue-500/20', !isMap);
    btnList?.classList.toggle('text-blue-100', !isMap);
    btnList?.classList.toggle('border-blue-400/40', !isMap);
    btnList?.classList.toggle('border-white/10', isMap);
    btnList?.classList.toggle('text-white/60', isMap);
    btnMap?.classList.toggle('bg-blue-500/20', isMap);
    btnMap?.classList.toggle('text-blue-100', isMap);
    btnMap?.classList.toggle('border-blue-400/40', isMap);
    btnMap?.classList.toggle('border-white/10', !isMap);
    btnMap?.classList.toggle('text-white/60', !isMap);
    if (isMap) {
        if (!getMap()) {
            initMap('repMap');
            updateMapMarkers(currentFiltered);
            if (userLocation) setUserMarker(userLocation.lat, userLocation.lng);
        } else {
            invalidateSize();
            updateMapMarkers(currentFiltered);
        }
    }
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
    container.innerHTML = `<div class="space-y-2">
        ${data.map(r => `
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100">
            <span class="font-mono font-bold tracking-wider text-blue-300 w-20 shrink-0">${r.callsign}</span>
            <span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs shrink-0">${r.band}</span>
            <span class="font-mono text-slate-200 shrink-0">${r.ftx} MHz</span>
            ${r.tone ? `<span class="text-slate-400 text-xs shrink-0">T: ${r.tone} Hz</span>` : ''}
            <span class="text-slate-400 text-xs truncate">${r.locality}${r.locality && r.province ? ', ' : ''}${r.province}</span>
            ${r.dist != null ? `<span class="ml-auto text-xs text-blue-300 shrink-0">${r.dist < 100 ? r.dist.toFixed(0) : Math.round(r.dist)} km</span>` : ''}
        </div>`).join('')}
    </div>`;
}

function updateMapMarkers(data) {
    const map = getMap();
    if (!map) return;
    map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
    data.filter(r => r.coords).forEach(r => {
        const popup = `<b>${r.callsign}</b><br>${r.ftx} MHz ${r.band}<br>${r.tone ? `Subtono: ${r.tone} Hz<br>` : ''}${r.locality}, ${r.province}<br><small>${r.owner}</small>`;
        L.marker(r.coords).addTo(map).bindPopup(popup);
    });
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearby() {
    const btn = document.getElementById('repNearbyBtn');
    if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
    if (btn) btn.textContent = '⏳ Localizando…';
    navigator.geolocation.getCurrentPosition(({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        userLocation = { lat, lng };
        currentFiltered = repeaterData
            .filter(r => r.coords)
            .map(r => ({ ...r, dist: haversineKm(lat, lng, r.coords[0], r.coords[1]) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 30);
        if (document.getElementById('repBandFilter')) document.getElementById('repBandFilter').value = 'all';
        if (document.getElementById('repProvinceFilter')) document.getElementById('repProvinceFilter').value = 'all';
        if (document.getElementById('repSearchInput')) document.getElementById('repSearchInput').value = '';
        const count = document.getElementById('repCount');
        if (count) count.textContent = `30 más cercanas`;
        renderList(currentFiltered);
        updateMapMarkers(currentFiltered);
        const points = [[lat, lng], ...currentFiltered.filter(r => r.coords).map(r => r.coords)];
        setUserMarker(lat, lng, points);
        if (btn) btn.textContent = '📍 Cercanas';
    }, () => {
        alert('No se pudo obtener la ubicación.');
        if (btn) btn.textContent = '📍 Cercanas';
    });
}
