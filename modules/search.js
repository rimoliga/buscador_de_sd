import { LAST_QUERY_KEY } from './config.js';
import { displayResults, showNoResults, updateLastQueryLabel } from './ui.js';

export function matchEspecial(especial, searchTerm) {
    return especial
        .toUpperCase()
        .split(',')
        .map(s => s.trim())
        .includes(searchTerm);
}

export function searchRadio(query, radioData, { isPinned, onPin }) {
    if (!query.trim()) {
        showNoResults();
        return;
    }
    const searchTerm = query.toUpperCase().trim();
    updateLastQueryLabel(searchTerm);
    const results = radioData.filter(radio => {
        const matchPrincipal = radio['Señal Distintiva'] &&
            radio['Señal Distintiva'].toUpperCase() === searchTerm;
        const matchEsp = radio['Señal Distintiva Especial'] &&
            matchEspecial(radio['Señal Distintiva Especial'], searchTerm);
        return matchPrincipal || matchEsp;
    });
    displayResults(results, searchTerm, { isPinned, onPin });
}

export function applySavedQueryOrIdle(radioData, searchInput, { isPinned, onPin }) {
    const lastQuery = localStorage.getItem(LAST_QUERY_KEY) || '';
    if (lastQuery) {
        searchInput.value = lastQuery;
        updateLastQueryLabel(lastQuery);
        searchRadio(lastQuery, radioData, { isPinned, onPin });
    } else {
        showNoResults();
    }
}
