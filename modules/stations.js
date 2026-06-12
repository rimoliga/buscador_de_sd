import { getMap } from './map.js';

const GRIDSQUARES_KEY = 'buscador_sd_gridsquares';
const MY_GRID_KEY = 'buscador_sd_my_grid';

let _stationMarkers = [];

export function saveMyGrid(gs) {
    localStorage.setItem(MY_GRID_KEY, gs.toUpperCase());
}
export function getMyGrid() {
    return localStorage.getItem(MY_GRID_KEY) || '';
}
export function saveGridSquare(callsign, gs) {
    const all = getGridSquares();
    if (gs) all[callsign] = gs.toUpperCase();
    else delete all[callsign];
    localStorage.setItem(GRIDSQUARES_KEY, JSON.stringify(all));
}
export function getGridSquares() {
    return JSON.parse(localStorage.getItem(GRIDSQUARES_KEY) || '{}');
}

export function gridToLatLng(gs) {
    if (!gs || gs.length < 4) return null;
    const s = gs.toUpperCase();
    let lng = (s.charCodeAt(0) - 65) * 20 - 180;
    let lat = (s.charCodeAt(1) - 65) * 10 - 90;
    lng += parseInt(s[2]) * 2;
    lat += parseInt(s[3]) * 1;
    if (gs.length >= 6) {
        const sub = gs.toLowerCase();
        lng += (sub.charCodeAt(4) - 97) * (2 / 24);
        lat += (sub.charCodeAt(5) - 97) * (1 / 24);
        lng += 1 / 24;
        lat += 1 / 48;
    } else {
        lng += 1;
        lat += 0.5;
    }
    return [lat, lng];
}

export function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function azimuth(lat1, lng1, lat2, lng2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const dλ = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

export function updateStationsLayer(pinnedCallsigns, radioData) {
    const map = getMap();
    if (!map) return;
    _stationMarkers.forEach(m => map.removeLayer(m));
    _stationMarkers = [];
    const grids = getGridSquares();
    const myGrid = getMyGrid();
    const myCoords = myGrid ? gridToLatLng(myGrid) : null;
    pinnedCallsigns.forEach(cs => {
        const gs = grids[cs];
        if (!gs) return;
        const coords = gridToLatLng(gs);
        if (!coords) return;
        const radio = radioData.find(r => r['Señal Distintiva'] === cs);
        const name = radio?.['Titular de la Licencia'] || cs;
        let popup = `<b>${cs}</b><br>${name}<br>Grid: ${gs}`;
        if (myCoords) {
            const dist = haversineKm(myCoords[0], myCoords[1], coords[0], coords[1]);
            const az = azimuth(myCoords[0], myCoords[1], coords[0], coords[1]);
            popup += `<br><b>${dist.toFixed(0)} km · ${az.toFixed(0)}°</b>`;
        }
        const marker = L.circleMarker(coords, {
            radius: 9, fillColor: '#f59e0b', color: '#fff', weight: 2, fillOpacity: 0.9,
        }).addTo(map).bindPopup(popup);
        _stationMarkers.push(marker);
    });
}

export function renderStationsPanel(pinnedCallsigns, radioData) {
    const panel = document.getElementById('stationsPanel');
    if (!panel) return;
    if (!pinnedCallsigns.length) {
        panel.innerHTML = `<p class="text-xs text-white/30 py-2">Fijá señales en Búsqueda para verlas aquí.</p>`;
        return;
    }
    const grids = getGridSquares();
    const myGrid = getMyGrid();
    const myCoords = myGrid ? gridToLatLng(myGrid) : null;
    panel.innerHTML = `
        <div class="space-y-2">
            ${pinnedCallsigns.map(cs => {
                const radio = radioData.find(r => r['Señal Distintiva'] === cs);
                const gs = grids[cs] || '';
                const coords = gs ? gridToLatLng(gs) : null;
                let distAz = '';
                if (myCoords && coords) {
                    const dist = haversineKm(myCoords[0], myCoords[1], coords[0], coords[1]);
                    const az = azimuth(myCoords[0], myCoords[1], coords[0], coords[1]);
                    distAz = `<span class="text-blue-300 font-mono text-xs shrink-0">${dist.toFixed(0)} km · ${az.toFixed(0)}°</span>`;
                } else if (gs && !myGrid) {
                    distAz = `<span class="text-white/30 text-xs shrink-0">Ingresá tu grid</span>`;
                }
                return `
                <div class="flex items-center gap-3">
                    <span class="font-mono font-bold text-blue-300 text-sm w-20 shrink-0">${cs}</span>
                    <input type="text"
                        data-station-grid="${cs}"
                        value="${gs}"
                        maxlength="6"
                        placeholder="Grid…"
                        class="flex-1 min-w-0 py-1 px-2 text-xs rounded-lg border border-white/15 bg-white/10 text-white placeholder-white/20 focus:border-blue-400 outline-none font-mono uppercase">
                    ${distAz}
                </div>`;
            }).join('')}
        </div>`;
    panel.querySelectorAll('[data-station-grid]').forEach(input => {
        input.addEventListener('blur', () => {
            const cs = input.getAttribute('data-station-grid');
            saveGridSquare(cs, input.value.trim());
            renderStationsPanel(pinnedCallsigns, radioData);
            updateStationsLayer(pinnedCallsigns, radioData);
        });
        input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    });
}

export function initMyGridInput(pinnedCallsigns, radioData) {
    const input = document.getElementById('myGridInput');
    if (!input) return;
    input.value = getMyGrid();
    input.addEventListener('blur', () => {
        saveMyGrid(input.value.trim());
        renderStationsPanel(pinnedCallsigns, radioData);
        updateStationsLayer(pinnedCallsigns, radioData);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
}
