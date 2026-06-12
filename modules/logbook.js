import { LOGBOOK_KEY } from './config.js';

let _active = {};
let _logged = [];
let _tickCb = null;
let _tickInterval = null;

export function initLogbook(tickCallback) {
    _tickCb = tickCallback;
    _logged = JSON.parse(localStorage.getItem(LOGBOOK_KEY) || '[]');
}

export function startContact(radio, band) {
    const cs = radio['Señal Distintiva'];
    if (_active[cs]) return;
    _active[cs] = { radio, startUtc: new Date().toISOString(), band };
    _ensureTick();
}

export function cancelContact(callsign) {
    delete _active[callsign];
    if (!Object.keys(_active).length) _stopTick();
}

export function isContactActive(callsign) {
    return !!_active[callsign];
}

export function getActiveContact(callsign) {
    return _active[callsign] || null;
}

export function elapsedSeconds(callsign) {
    const c = _active[callsign];
    if (!c) return 0;
    return Math.floor((Date.now() - new Date(c.startUtc).getTime()) / 1000);
}

export function logContact(callsign, { rstSent = '59', rstRecv = '59', band, mode = 'SSB' } = {}) {
    const c = _active[callsign];
    if (!c) return null;
    const now = new Date();
    const start = new Date(c.startUtc);
    const qso = {
        id: Date.now(),
        callsign,
        name: c.radio['Titular de la Licencia'] || '',
        province: c.radio['Provincia'] || '',
        qsoDate: _fmtDate(start),
        timeOn: _fmtTime(start),
        timeOff: _fmtTime(now),
        band: band || c.band,
        mode,
        rstSent,
        rstRecv,
    };
    _logged = [qso, ..._logged];
    localStorage.setItem(LOGBOOK_KEY, JSON.stringify(_logged));
    cancelContact(callsign);
    return qso;
}

export function getLoggedQSOs() {
    return [..._logged];
}

export function deleteQSO(id) {
    _logged = _logged.filter(q => q.id !== id);
    localStorage.setItem(LOGBOOK_KEY, JSON.stringify(_logged));
}

export function clearLogbook() {
    _logged = [];
    localStorage.removeItem(LOGBOOK_KEY);
}

export function buildADIF(qsos) {
    const lines = [
        '<ADIF_VER:5>3.1.0',
        '<PROGRAMID:11>BuscadorSD',
        '<EOH>',
        '',
    ];
    for (const q of qsos) {
        lines.push([
            _f('CALL',     q.callsign),
            _f('QSO_DATE', q.qsoDate),
            _f('TIME_ON',  q.timeOn),
            _f('TIME_OFF', q.timeOff),
            _f('BAND',     q.band),
            _f('MODE',     q.mode || 'SSB'),
            _f('RST_SENT', q.rstSent),
            _f('RST_RCVD', q.rstRecv),
            '<EOR>',
        ].join(' '));
    }
    return lines.join('\n');
}

function _ensureTick() {
    if (_tickInterval) return;
    _tickInterval = setInterval(() => _tickCb?.(), 1000);
}

function _stopTick() {
    if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
}

function _fmtDate(d) {
    return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function _fmtTime(d) {
    return d.toISOString().slice(11, 19).replace(/:/g, '');
}

function _f(tag, val) {
    return `<${tag}:${val.length}>${val}`;
}
