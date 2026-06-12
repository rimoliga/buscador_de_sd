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

export const showLoading = () => showMessage({
    icon: '🔄',
    title: 'Cargando datos...',
    message: '',
    color: 'blue',
});

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

export function createCardHTML(radio, isPinnedCard) {
    return `
        <div class="bg-white/90 border border-slate-200 rounded-2xl shadow-lg p-6 mb-6 relative transition hover:shadow-2xl">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div class="flex flex-col gap-1">
                    <span class="text-blue-600 text-2xl font-bold font-mono break-words">${radio['Señal Distintiva'] || 'N/A'}</span>
                    <span class="text-gray-800 text-lg font-semibold break-words">${radio['Titular de la Licencia'] || 'N/A'}</span>
                </div>
                <button
                    class="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded-full shadow transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    data-pin="${radio['Señal Distintiva']}"
                    ${isPinnedCard ? 'disabled' : ''}>
                    ${isPinnedCard ? '📌 Fijado' : '📌 Fijar'}
                </button>
            </div>
            ${radio['Señal Distintiva Especial'] ? `
                <div class="mb-2">
                    <span class="text-xs text-gray-400 uppercase">Especial:</span>
                    <span class="font-mono bg-green-400 px-2 py-1 rounded ml-2">${radio['Señal Distintiva Especial']}</span>
                </div>
            ` : ''}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                    <div class="text-xs text-gray-400 uppercase">Categoría</div>
                    <div class="font-medium text-gray-800">${radio['Categoría'] || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 uppercase">Provincia</div>
                    <div class="font-medium text-gray-800">${radio['Provincia'] || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 uppercase">Localidad</div>
                    <div class="font-medium text-gray-800">${radio['Localidad'] || 'N/A'}</div>
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
            ${createCardHTML(radio, isPinned(radio['Señal Distintiva']))}
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
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full bg-blue-100 text-blue-800 px-3 py-2 rounded-lg shadow text-sm">
            <div class="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 w-full">
                <span class="font-mono font-semibold text-center sm:text-left break-words">
                    ${radio['Señal Distintiva']}
                    ${radio['Señal Distintiva Especial'] || ''}
                </span>
                <span class="text-gray-700 font-medium break-words text-center sm:text-left">${radio['Titular de la Licencia'] || 'Sin titular'}</span>
                <span class="text-gray-500 break-words text-center sm:text-left">
                    ${radio['Provincia'] || 'Sin provincia'}${radio['Localidad'] ? ' · ' + radio['Localidad'] : ''}
                </span>
            </div>
            <button
                class="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-400 rounded-full hover:text-red-600 hover:border-red-400 transition sm:ml-auto"
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
