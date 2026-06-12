let _map = null;
let _userMarker = null;

export function initMap(containerId) {
    if (_map) return _map;
    if (window.L) L.Icon.Default.imagePath = 'libs/images/';
    _map = L.map(containerId).setView([-38, -63], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
    }).addTo(_map);
    return _map;
}

export function getMap() { return _map; }

export function invalidateSize() { _map?.invalidateSize(); }

export function latLngToGrid(lat, lng) {
    const adjLng = lng + 180;
    const adjLat = lat + 90;
    const fl = Math.floor(adjLng / 20);
    const fla = Math.floor(adjLat / 10);
    const sl = Math.floor((adjLng % 20) / 2);
    const sla = Math.floor(adjLat % 10);
    const ul = Math.floor(((adjLng % 20) % 2) * 12);
    const ula = Math.floor((adjLat % 1) * 24);
    return String.fromCharCode(65 + fl) + String.fromCharCode(65 + fla) +
        sl + sla +
        String.fromCharCode(97 + ul) + String.fromCharCode(97 + ula);
}

export function setUserMarker(lat, lng, fitBoundsPoints = null) {
    if (!_map) return;
    if (_userMarker) _map.removeLayer(_userMarker);
    _userMarker = L.circleMarker([lat, lng], {
        radius: 10, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 0.9,
    }).addTo(_map).bindPopup('Tu ubicación');
    if (fitBoundsPoints?.length > 1) {
        _map.fitBounds(L.latLngBounds(fitBoundsPoints), { padding: [40, 40] });
    } else {
        _map.setView([lat, lng], 10);
    }
}
