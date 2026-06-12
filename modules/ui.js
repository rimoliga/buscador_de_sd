const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');

export function showMessage({ icon, title, message, color = 'gray', countText = 'Resultados' }) {
    resultsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-${color}-500">
            <div class="text-6xl mb-4 opacity-40">${icon}</div>
            <h3 class="text-xl font-semibold mb-2">${title}</h3>
            <p class="text-base">${message}</p>
        </div>
    `;
    resultsCount.textContent = countText;
}

function skeletonCard() {
    return `
        <div class="bg-white/90 border border-slate-200 rounded-2xl shadow p-6 mb-6 animate-pulse">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div class="flex flex-col gap-2">
                    <div class="h-7 bg-slate-200 rounded w-28"></div>
                    <div class="h-5 bg-slate-200 rounded w-48"></div>
                </div>
                <div class="h-7 bg-slate-200 rounded-full w-20 self-start"></div>
            </div>
            <div class="grid grid-cols-3 gap-4 mt-2">
                <div class="h-4 bg-slate-200 rounded"></div>
                <div class="h-4 bg-slate-200 rounded"></div>
                <div class="h-4 bg-slate-200 rounded"></div>
            </div>
        </div>`;
}

export function showLoading() {
    resultsContainer.innerHTML = skeletonCard() + skeletonCard() + skeletonCard();
    resultsCount.textContent = 'Cargando…';
}

export const showError = (message) => showMessage({
    icon: '❌',
    title: 'Error',
    message,
    color: 'red',
});

export const showNoResults = () => showMessage({
    icon: '📡',
    title: 'Ingresa una señal distintiva para buscar',
    message: 'Ejemplo: <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU2EUE</span>, <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU2DT</span>',
    color: 'gray',
});

export function updateLastUpdatedLabel(metadataInfo) {
    const text = metadataInfo?.last_updated_human
        ? `Actualizado: ${metadataInfo.last_updated_human}`
        : metadataInfo?.last_updated
            ? `Actualizado: ${metadataInfo.last_updated}`
            : '—';
    ['lastUpdated', 'lastUpdatedMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });
}

export function updateLastQueryLabel(value) {
    const el = document.getElementById('lastQueryLabel');
    if (!el) return;
    el.textContent = value ? value.toUpperCase() : '—';
}

const CATEGORY_BADGE = {
    'A': 'bg-blue-100 text-blue-700 border-blue-200',
    'B': 'bg-green-100 text-green-700 border-green-200',
    'C': 'bg-amber-100 text-amber-700 border-amber-200',
    'D': 'bg-orange-100 text-orange-700 border-orange-200',
};

function categoryBadge(cat) {
    const cls = CATEGORY_BADGE[cat?.toUpperCase()] ?? 'bg-slate-100 text-slate-600 border-slate-200';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls} tracking-wider">${cat || 'N/A'}</span>`;
}

export function createCardHTML(radio, isPinnedCard, animationDelay = 0) {
    const especiales = (radio['Señal Distintiva Especial'] || '').split(',').map(s => s.trim()).filter(Boolean);
    return `
        <div class="card-animate bg-white/90 border border-slate-200 rounded-2xl shadow-lg p-6 mb-6 relative transition hover:shadow-2xl hover:-translate-y-0.5"
             style="animation-delay:${animationDelay}ms">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div class="flex flex-col gap-1">
                    <span class="text-blue-600 text-2xl font-bold font-mono tracking-wider break-words">${radio['Señal Distintiva'] || 'N/A'}</span>
                    <span class="text-gray-800 text-base font-semibold break-words">${radio['Titular de la Licencia'] || 'N/A'}</span>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <a href="https://www.qrz.com/db/${encodeURIComponent(radio['Señal Distintiva'])}"
                       target="_blank" rel="noopener noreferrer"
                       class="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1 text-xs font-medium border border-slate-300 text-slate-500 rounded-full transition hover:border-blue-400 hover:text-blue-600">
                        QRZ ↗
                    </a>
                    <button
                        class="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1 text-xs font-medium border border-slate-300 text-slate-500 rounded-full transition hover:border-blue-400 hover:text-blue-600"
                        data-share="${radio['Señal Distintiva']}">
                        ⬆ Compartir
                    </button>
                    <button
                        class="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded-full shadow transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        data-pin="${radio['Señal Distintiva']}"
                        ${isPinnedCard ? 'disabled' : ''}>
                        ${isPinnedCard ? '📌 Fijado' : '📌 Fijar'}
                    </button>
                </div>
            </div>
            ${especiales.length ? `
                <div class="mb-3 flex flex-wrap gap-1.5">
                    <span class="text-xs text-gray-400 uppercase self-center">Especial:</span>
                    ${especiales.map(e => `<span class="font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full tracking-wider">${e}</span>`).join('')}
                </div>
            ` : ''}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                    <div class="text-xs text-gray-400 uppercase mb-1">Categoría</div>
                    ${categoryBadge(radio['Categoría'])}
                </div>
                <div>
                    <div class="text-xs text-gray-400 uppercase mb-1">Provincia</div>
                    <div class="font-medium text-gray-800 text-sm">${radio['Provincia'] || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 uppercase mb-1">Localidad</div>
                    <div class="font-medium text-gray-800 text-sm">${radio['Localidad'] || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;
}

export function displayResults(results, searchTerm, { isPinned, onPin }) {
    if (results.length === 0) {
        showMessage({
            icon: '🔍',
            title: 'No se encontraron resultados',
            message: `No hay radioaficionados con la señal distintiva "<span class="font-mono bg-gray-100 px-2 py-1 rounded">${searchTerm}</span>"`,
            color: 'gray',
            countText: 'Sin resultados',
        });
        return;
    }
    resultsCount.textContent = `${results.length} resultado${results.length > 1 ? 's' : ''}`;
    resultsContainer.innerHTML = results.map((radio, idx) =>
        `<div id="search-result-${idx}" class="search-result relative group">
            ${createCardHTML(radio, isPinned(radio['Señal Distintiva']), idx * 50)}
        </div>`
    ).join('');
    resultsContainer.querySelectorAll('[data-pin]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sd = btn.getAttribute('data-pin');
            const radio = results.find(r => r['Señal Distintiva'] === sd);
            onPin(radio, results, searchTerm);
        });
    });
    resultsContainer.querySelectorAll('[data-share]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const sd = btn.getAttribute('data-share');
            const url = `${location.origin}${location.pathname}?q=${encodeURIComponent(sd)}`;
            if (navigator.share) {
                await navigator.share({ title: sd, url });
            } else {
                await navigator.clipboard.writeText(url);
                const orig = btn.textContent;
                btn.textContent = '✓ Copiado';
                setTimeout(() => { btn.textContent = orig; }, 1500);
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

export function initBandSelector(bands, defaultBand = '40m') {
    const sel = document.getElementById('bandSelector');
    if (!sel) return;
    sel.innerHTML = bands.map(b =>
        `<option value="${b}"${b === defaultBand ? ' selected' : ''}>${b}</option>`
    ).join('');
}

export function updateUtcClock() {
    const el = document.getElementById('utcClock');
    if (!el) return;
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss} UTC`;
}

export function updateContactTimers(elapsedFn) {
    document.querySelectorAll('[data-timer-callsign]').forEach(el => {
        const cs = el.getAttribute('data-timer-callsign');
        const secs = elapsedFn(cs);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        el.textContent = `${mm}:${ss}`;
    });
}

function _fmtUtcDisplay(isoString) {
    return isoString.slice(11, 19) + ' UTC';
}

function _renderPinnedInto(container, pinned, callbacks) {
    const { onUnpin, onStartContact, onCancelContact, onLogContact, isContactActive, getActiveContact } = callbacks;
    if (!pinned.length) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = pinned.map(radio => {
        const cs = radio['Señal Distintiva'];
        const active = isContactActive(cs);
        const contact = active ? getActiveContact(cs) : null;
        const location = [radio['Provincia'], radio['Localidad']].filter(Boolean).join(' · ');
        return `
        <div class="flex flex-col gap-2 w-full bg-blue-50 border ${active ? 'border-blue-400' : 'border-blue-200'} text-blue-900 px-4 py-2.5 rounded-xl shadow-sm text-sm card-animate">
            <div class="flex flex-row items-center gap-x-3 gap-y-0.5 w-full min-w-0">
                <span class="font-mono font-bold tracking-wider text-blue-700 shrink-0">${cs}</span>
                <span class="font-medium text-slate-700 truncate">${radio['Titular de la Licencia'] || 'Sin titular'}</span>
                <span class="text-slate-400 text-xs truncate ml-auto hidden sm:block">${location}</span>
                ${!active ? `
                <button data-start-contact="${cs}"
                    class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-green-600 border border-green-300 rounded-full hover:bg-green-50 transition">
                    ▶ QSO
                </button>` : ''}
                <button data-unpin="${cs}"
                    class="shrink-0 inline-flex items-center justify-center w-6 h-6 text-slate-400 border border-slate-200 rounded-full hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition text-base leading-none"
                    title="Quitar">&times;</button>
            </div>
            ${active ? `
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs pt-2 border-t border-blue-200">
                <span class="text-red-500 font-mono font-bold">● <span data-timer-callsign="${cs}">00:00</span></span>
                <span class="text-slate-400 font-mono">${_fmtUtcDisplay(contact.startUtc)}</span>
                <div class="flex items-center gap-1.5 sm:ml-2">
                    <label class="text-slate-500">Env:</label>
                    <input data-rst-sent="${cs}" value="59" maxlength="3"
                        class="w-10 text-center border border-slate-200 rounded-lg px-1 py-0.5 text-slate-700 font-mono bg-white focus:border-blue-400 outline-none" />
                    <button data-set-rst="sent:${cs}" class="text-blue-400 hover:text-blue-600 font-medium">5/9</button>
                </div>
                <div class="flex items-center gap-1.5">
                    <label class="text-slate-500">Rcb:</label>
                    <input data-rst-recv="${cs}" value="59" maxlength="3"
                        class="w-10 text-center border border-slate-200 rounded-lg px-1 py-0.5 text-slate-700 font-mono bg-white focus:border-blue-400 outline-none" />
                    <button data-set-rst="recv:${cs}" class="text-blue-400 hover:text-blue-600 font-medium">5/9</button>
                </div>
                <div class="flex gap-2 ml-auto">
                    <button data-log-contact="${cs}"
                        class="px-3 py-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition font-semibold text-xs">
                        ✓ Log
                    </button>
                    <button data-cancel-contact="${cs}"
                        class="px-2 py-1 text-slate-400 border border-slate-200 rounded-full hover:text-red-500 hover:border-red-300 transition text-xs">
                        ✗
                    </button>
                </div>
            </div>` : ''}
        </div>`;
    }).join('');

    container.querySelectorAll('[data-unpin]').forEach(btn =>
        btn.addEventListener('click', () => onUnpin(btn.getAttribute('data-unpin')))
    );
    container.querySelectorAll('[data-start-contact]').forEach(btn =>
        btn.addEventListener('click', () => onStartContact(btn.getAttribute('data-start-contact')))
    );
    container.querySelectorAll('[data-cancel-contact]').forEach(btn =>
        btn.addEventListener('click', () => onCancelContact(btn.getAttribute('data-cancel-contact')))
    );
    container.querySelectorAll('[data-log-contact]').forEach(btn =>
        btn.addEventListener('click', () => onLogContact(btn.getAttribute('data-log-contact')))
    );
    container.querySelectorAll('[data-set-rst]').forEach(btn => {
        btn.addEventListener('click', () => {
            const [field, cs] = btn.getAttribute('data-set-rst').split(':');
            const input = container.querySelector(`[data-rst-${field}="${cs}"]`);
            if (input) input.value = '59';
        });
    });
}

export function renderPinned(pinned, callbacks) {
    ['pinnedResults', 'pinnedResultsMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) _renderPinnedInto(el, pinned, callbacks);
    });
}

export function renderLogbook(qsos, { onDelete, onExport, onClear }) {
    const container = document.getElementById('logContainer');
    if (!container) return;

    document.querySelectorAll('.log-count-badge').forEach(b => {
        b.textContent = qsos.length;
        b.classList.toggle('hidden', qsos.length === 0);
    });

    if (!qsos.length) {
        container.innerHTML = `
            <div class="flex flex-col items-center py-12 text-slate-400">
                <div class="text-5xl mb-4 opacity-30">📋</div>
                <p class="text-sm">No hay QSOs registrados todavía.</p>
                <p class="text-xs mt-1">Fijá una señal en Búsqueda para iniciar un contacto.</p>
            </div>`;
        return;
    }

    const dateDisplay = (qsoDate) =>
        `${qsoDate.slice(6,8)}/${qsoDate.slice(4,6)}/${qsoDate.slice(0,4)}`;
    const timeDisplay = (t) =>
        `${t.slice(0,2)}:${t.slice(2,4)}`;

    container.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <p class="text-sm font-semibold text-slate-200">${qsos.length} QSO${qsos.length > 1 ? 's' : ''}</p>
            <div class="flex gap-2">
                <button id="exportAdifBtn"
                    class="px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition font-medium">
                    ↓ ADIF
                </button>
                <button id="clearLogBtn"
                    class="px-3 py-1 text-xs border border-white/20 text-white/60 rounded-full hover:text-red-400 hover:border-red-400 transition">
                    Limpiar
                </button>
            </div>
        </div>
        <div class="space-y-2">
            ${qsos.map(q => `
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100">
                <span class="font-mono font-bold tracking-wider text-blue-300 w-20 shrink-0">${q.callsign}</span>
                <span class="font-mono text-slate-400 text-xs shrink-0">
                    ${dateDisplay(q.qsoDate)} ${timeDisplay(q.timeOn)}-${timeDisplay(q.timeOff)} UTC
                </span>
                <span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs shrink-0">${q.band}</span>
                <span class="text-slate-400 text-xs shrink-0 font-mono">${q.rstSent}/${q.rstRecv}</span>
                <span class="text-slate-500 text-xs truncate hidden sm:block">${q.name}</span>
                <button data-delete-qso="${q.id}"
                    class="ml-auto shrink-0 text-slate-500 hover:text-red-400 transition text-lg leading-none">&times;</button>
            </div>`).join('')}
        </div>`;

    document.getElementById('exportAdifBtn')?.addEventListener('click', onExport);
    document.getElementById('clearLogBtn')?.addEventListener('click', onClear);
    container.querySelectorAll('[data-delete-qso]').forEach(btn =>
        btn.addEventListener('click', () => onDelete(Number(btn.getAttribute('data-delete-qso'))))
    );
}

export function renderMiniLog(qsos, { onExport }) {
    const container = document.getElementById('miniLogContainer');
    if (!container) return;
    const timeDisplay = (t) => `${t.slice(0, 2)}:${t.slice(2, 4)}`;
    if (!qsos.length) {
        container.innerHTML = `
            <p class="text-[11px] uppercase tracking-widest text-slate-400 font-medium mb-2">Log de contactos</p>
            <p class="text-xs text-slate-500">Sin QSOs registrados.</p>`;
        return;
    }
    const recent = qsos.slice(-5).reverse();
    container.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <p class="text-[11px] uppercase tracking-widest text-slate-400 font-medium">Log · ${qsos.length} QSO${qsos.length > 1 ? 's' : ''}</p>
            <button id="miniLogExportBtn" class="text-[11px] text-blue-400 hover:text-blue-300 transition">↓ ADIF</button>
        </div>
        <div class="space-y-1.5">
            ${recent.map(q => `
            <div class="flex items-center gap-2 text-xs text-slate-300">
                <span class="font-mono font-bold text-blue-400 w-16 shrink-0">${q.callsign}</span>
                <span class="bg-slate-700/60 px-1.5 py-0.5 rounded text-slate-400 shrink-0">${q.band}</span>
                <span class="font-mono text-slate-500">${timeDisplay(q.timeOn)}</span>
                <span class="text-slate-500 font-mono shrink-0">${q.rstSent}/${q.rstRecv}</span>
            </div>`).join('')}
        </div>`;
    document.getElementById('miniLogExportBtn')?.addEventListener('click', onExport);
}
