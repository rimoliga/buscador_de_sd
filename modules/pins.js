import { PINNED_STORAGE_KEY } from './config.js';

export function isPinned(pinned, sd) {
    return pinned.some(r => r['Señal Distintiva'] === sd);
}

export function persistPinnedSignals(pinned) {
    try {
        localStorage.setItem(
            PINNED_STORAGE_KEY,
            JSON.stringify(pinned.map(r => r['Señal Distintiva']))
        );
    } catch (error) {
        console.warn('No se pudo guardar la lista de fijados', error);
    }
}

export function loadPinnedSignals() {
    try {
        const stored = JSON.parse(localStorage.getItem(PINNED_STORAGE_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

export function rehydratePinned(radioData) {
    const storedSignals = loadPinnedSignals();
    if (!storedSignals.length || !radioData.length) return [];
    return storedSignals
        .map(sd => radioData.find(r => r['Señal Distintiva'] === sd))
        .filter(Boolean);
}
