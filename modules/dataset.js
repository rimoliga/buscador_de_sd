import { decompressSync, strFromU8 } from "https://cdn.skypack.dev/pin/fflate@v0.8.2-5l9B8rfElbxSDZ5tcGZe/mode=imports/optimized/fflate.js";
import { VERSION_URL, DATA_URL, METADATA_URL, STATS_URL, VERSION_STORAGE_KEY } from './config.js';

export async function fetchVersion(cacheMode) {
    try {
        const response = await fetch(VERSION_URL, { cache: cacheMode });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('No se pudo obtener información de versiones', error);
        return JSON.parse(localStorage.getItem(VERSION_STORAGE_KEY) || '{}');
    }
}

export async function fetchDataset(cacheMode) {
    const response = await fetch(DATA_URL, { cache: cacheMode });
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const compressedBuffer = await response.arrayBuffer();
    const decompressed = decompressSync(new Uint8Array(compressedBuffer));
    return JSON.parse(strFromU8(decompressed));
}

export async function fetchMetadata(cacheMode) {
    try {
        const response = await fetch(METADATA_URL, { cache: cacheMode });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('No se pudo obtener metadata de actualización', error);
        return null;
    }
}

export async function fetchStats(cacheMode) {
    try {
        const response = await fetch(STATS_URL, { cache: cacheMode });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('No se pudo obtener estadísticas', error);
        return null;
    }
}

export async function loadAllData(cacheMode = 'default') {
    const [versionData, dataset, metadata, stats] = await Promise.all([
        fetchVersion(cacheMode),
        fetchDataset(cacheMode),
        fetchMetadata(cacheMode),
        fetchStats(cacheMode),
    ]);
    return { versionData, dataset, metadata, stats };
}
