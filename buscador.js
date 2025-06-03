let radioData = [];
let isLoading = false;

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');
const totalRecords = document.getElementById('totalRecords');

// Cargar datos
async function loadData() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    
    try {
        const response = await fetch('data/listado_radioaficionados.json');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        radioData = await response.json();
        
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
    const results = radioData.filter(radio => 
        radio['Señal Distintiva'] && 
        radio['Señal Distintiva'].toUpperCase() === (searchTerm)
    );

    displayResults(results, searchTerm);
}

// Mostrar resultados (renderizado no bloqueante)
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

    // Para listas grandes, renderizar por lotes
    if (results.length > 50) {
        renderInBatches(results);
    } else {
        // Renderizado directo para listas pequeñas
        const html = results.map(radio => createCardHTML(radio)).join('');
        resultsContainer.innerHTML = html;
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

// Renderizado por lotes para listas grandes
function renderInBatches(results, batchSize = 20) {
    resultsContainer.innerHTML = '';
    let index = 0;

    function renderBatch() {
        const batch = results.slice(index, index + batchSize);
        const html = batch.map(radio => createCardHTML(radio)).join('');
        resultsContainer.insertAdjacentHTML('beforeend', html);
        
        index += batchSize;
        
        if (index < results.length) {
            requestAnimationFrame(renderBatch);
        }
    }

    renderBatch();
}

// Event listeners
let searchFrame;
searchInput.addEventListener('input', (e) => {
    // Cancelar búsqueda anterior si está pendiente
    if (searchFrame) {
        cancelAnimationFrame(searchFrame);
    }
    
    // Programar búsqueda para el siguiente frame
    searchFrame = requestAnimationFrame(() => {
        searchRadio(e.target.value);
        searchFrame = null;
    });
});

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});