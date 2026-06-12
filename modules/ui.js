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
    const el = document.getElementById('lastUpdated');
    if (!el) return;
    if (metadataInfo?.last_updated_human) {
        el.textContent = `Actualizado: ${metadataInfo.last_updated_human}`;
    } else if (metadataInfo?.last_updated) {
        el.textContent = `Actualizado: ${metadataInfo.last_updated}`;
    } else {
        el.textContent = '';
    }
}

export function updateLastQueryLabel(value) {
    const el = document.getElementById('lastQueryLabel');
    if (!el) return;
    el.textContent = value ? value.toUpperCase() : '—';
}

export function renderStats(statsData) {
    const container = document.getElementById('statsContainer');
    if (!container) return;
    if (!statsData) {
        container.innerHTML = '<p class="text-slate-300 text-sm">Sin datos estadísticos disponibles.</p>';
        return;
    }
    const topProvinces = Object.entries(statsData.por_provincia || {})
        .slice(0, 5)
        .map(([provincia, cantidad]) => ({ provincia, cantidad }));
    const categories = Object.entries(statsData.por_categoria || {});

    container.innerHTML = `
        <div class="space-y-4">
            <div>
                <p class="text-xs uppercase tracking-widest text-slate-300">Total de registros</p>
                <p class="text-3xl font-semibold text-white">${statsData.total.toLocaleString('es-AR')}</p>
            </div>
            <div>
                <p class="text-xs uppercase tracking-widest text-slate-300 mb-2">Top provincias</p>
                <ul class="space-y-2">
                    ${topProvinces.map(item => `
                        <li class="flex justify-between text-sm text-slate-100">
                            <span>${item.provincia}</span>
                            <span class="font-semibold">${item.cantidad.toLocaleString('es-AR')}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div>
                <p class="text-xs uppercase tracking-widest text-slate-300 mb-2">Por categoría</p>
                <div class="space-y-2">
                    ${categories.map(([categoria, cantidad]) => `
                        <div class="text-sm text-slate-100 flex justify-between items-center">
                            <span>${categoria}</span>
                            <span class="font-semibold">${cantidad.toLocaleString('es-AR')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
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
    const firstResult = document.getElementById('search-result-0');
    if (firstResult) {
        requestAnimationFrame(() => {
            firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}

export function renderPinned(pinned, { onUnpin }) {
    const container = document.getElementById('pinnedResults');
    if (!container) return;
    if (!pinned.length) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = pinned.map(radio => `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-xl shadow-sm text-sm card-animate">
            <div class="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 w-full min-w-0">
                <span class="font-mono font-bold tracking-wider text-blue-700 shrink-0">${radio['Señal Distintiva']}</span>
                <span class="font-medium text-slate-700 truncate">${radio['Titular de la Licencia'] || 'Sin titular'}</span>
                <span class="text-slate-400 text-xs truncate sm:ml-auto">
                    ${[radio['Provincia'], radio['Localidad']].filter(Boolean).join(' · ')}
                </span>
            </div>
            <button
                class="w-full sm:w-auto shrink-0 inline-flex items-center justify-center px-3 py-1 text-xs font-semibold text-blue-500 border border-blue-300 rounded-full hover:text-red-600 hover:border-red-400 hover:bg-red-50 transition sm:ml-2"
                title="Quitar"
                data-unpin="${radio['Señal Distintiva']}">
                &times;
            </button>
        </div>
    `).join('');
    container.querySelectorAll('[data-unpin]').forEach(btn => {
        btn.addEventListener('click', () => onUnpin(btn.getAttribute('data-unpin')));
    });
}
