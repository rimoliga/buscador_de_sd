let radioData = [];
let isLoading = false;

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');
const totalRecords = document.getElementById('totalRecords');

// Cargar datos
import { decompressSync, strFromU8 } from "https://cdn.skypack.dev/fflate";

async function loadData() {
    if (isLoading) return;

    isLoading = true;
    showLoading();

    try {
        const response = await fetch('data/listado_radioaficionados_unificado.json.gz');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const compressedBuffer = await response.arrayBuffer();
        const decompressed = decompressSync(new Uint8Array(compressedBuffer));
        const jsonString = strFromU8(decompressed);
        radioData = JSON.parse(jsonString);

        totalRecords.textContent = `Total: ${radioData.length} registros`;
        showNoResults();

    } catch (error) {
        showError('Error al cargar los datos: ' + error.message);
    } finally {
        isLoading = false;
    }
}


// Mostrar estado de carga
function showLoading() {
    resultsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-blue-600">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-300 border-t-blue-600 mb-4"></div>
            <p class="text-lg font-medium">Cargando datos...</p>
        </div>
    `;
}

// Mostrar error
function showError(message) {
    resultsContainer.innerHTML = `
        <div class="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4 text-center">
            <strong class="font-bold">Error:</strong> <span class="block sm:inline">${message}</span>
        </div>
    `;
}

// Mostrar mensaje sin resultados
function showNoResults() {
    resultsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-gray-500">
            <div class="text-6xl mb-4 opacity-40">📡</div>
            <h3 class="text-xl font-semibold mb-2">Ingresa una señal distintiva para buscar</h3>
            <p class="text-base">Ejemplo: <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU1AAA</span>, <span class="font-mono bg-gray-100 px-2 py-1 rounded">LU0CD</span></p>
        </div>
    `;
    resultsCount.textContent = '';
}

// Buscar radioaficionados
function searchRadio(query) {
    if (!query.trim()) {
        showNoResults();
        return;
    }

    const searchTerm = query.toUpperCase().trim();
    const results = radioData.filter(radio => {
        // Buscar coincidencia exacta en Señal Distintiva
        const matchPrincipal = radio['Señal Distintiva'] &&
            radio['Señal Distintiva'].toUpperCase() === searchTerm;

        // Buscar coincidencia exacta en alguna de las señales especiales (puede ser string separada por comas)
        let matchEspecial = false;
        if (radio['Señal Distintiva Especial']) {
            matchEspecial = radio['Señal Distintiva Especial']
                .toUpperCase()
                .split(',')
                .map(s => s.trim())
                .includes(searchTerm);
        }

        return matchPrincipal || matchEspecial;
    });

    displayResults(results, searchTerm);
}

// Mostrar resultados
function displayResults(results, searchTerm) {
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-gray-500">
                <div class="text-6xl mb-4 opacity-40">🔍</div>
                <h3 class="text-xl font-semibold mb-2">No se encontraron resultados</h3>
                <p class="text-base">No hay radioaficionados con la señal distintiva "<span class="font-mono bg-gray-100 px-2 py-1 rounded">${searchTerm}</span>"</p>
            </div>
        `;
        resultsCount.textContent = 'Sin resultados';
        return;
    }

    resultsCount.textContent = `${results.length} resultado${results.length > 1 ? 's' : ''}`;

    // Renderizado directo
    const html = results.map((radio, idx) => 
        `<div id="search-result-${idx}" class="search-result">${createCardHTML(radio)}</div>`
    ).join('');
    resultsContainer.innerHTML = html;

    // Centrar dinámicamente el primer resultado en pantalla
    const firstResult = document.getElementById('search-result-0');
    if (firstResult) {
        setTimeout(() => {
            firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// Crear HTML de tarjeta (función auxiliar)
function createCardHTML(radio) {
    return `
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-4 transition hover:shadow-lg">
            <div class="flex items-center mb-2">
                <span class="text-blue-600 text-2xl font-bold font-mono mr-4">${radio['Señal Distintiva'] || 'N/A'}</span>
                <span class="text-gray-700 text-lg font-semibold">${radio['Titular de la Licencia'] || 'N/A'}</span>
            </div>
            ${
                radio['Señal Distintiva Especial']
                    ? `<div class="mb-2">
                        <span class="text-xs text-gray-400 uppercase">Señal Distintiva Especial:</span>
                        <span class="font-mono bg-yellow-100 px-2 py-1 rounded ml-2">${radio['Señal Distintiva Especial']}</span>
                    </div>`
                    : ''
            }
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

// Debounce para optimizar búsquedas
let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        searchRadio(e.target.value);
    }, 250);
});

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});