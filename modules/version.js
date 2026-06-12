import { APP_VERSION, DATA_VERSION, VERSION_STORAGE_KEY } from './config.js';

export function ensureVersionStored(versionInfo) {
    if (!versionInfo) return;
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify({
        app_version: versionInfo.app_version || APP_VERSION,
        dataset_version: versionInfo.dataset_version || DATA_VERSION,
    }));
}

export function maybeShowVersionNotice(versionInfo) {
    const stored = JSON.parse(localStorage.getItem(VERSION_STORAGE_KEY) || '{}');
    const currentApp = versionInfo?.app_version || APP_VERSION;
    const currentData = versionInfo?.dataset_version || DATA_VERSION;
    const notice = document.getElementById('versionNotice');
    if (!notice) return;

    const hasNewApp = stored.app_version && stored.app_version !== currentApp;
    const hasNewData = stored.dataset_version && stored.dataset_version !== currentData;

    if (hasNewApp || hasNewData) {
        notice.classList.remove('hidden');
        const messageParts = [];
        if (hasNewApp) messageParts.push('Nueva versión de la app disponible');
        if (hasNewData) messageParts.push('Datos actualizados disponibles');
        notice.querySelector('[data-version-message]').textContent = messageParts.join(' · ');
        const reloadBtn = notice.querySelector('[data-reload]');
        if (reloadBtn) {
            reloadBtn.onclick = () => {
                localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify({
                    app_version: currentApp,
                    dataset_version: currentData,
                }));
                window.location.reload();
            };
        }
    } else if (!stored.app_version || !stored.dataset_version) {
        localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify({
            app_version: currentApp,
            dataset_version: currentData,
        }));
    }
}

export function handleVersionMessage(data, versionInfo) {
    if (!versionInfo) return;
    ensureVersionStored(versionInfo);
    const currentVersions = JSON.parse(localStorage.getItem(VERSION_STORAGE_KEY) || '{}');
    const notice = document.getElementById('versionNotice');
    if (!notice) return;
    const messageEl = notice.querySelector('[data-version-message]');
    const reloadBtn = notice.querySelector('[data-reload]');
    const messages = [];
    if (currentVersions.dataset_version && data.version && data.version !== currentVersions.dataset_version) {
        messages.push('Los datos se actualizaron. Recargá para obtener los últimos cambios.');
    }
    if (data.url && data.url.includes('version.json')) {
        messages.push('Nueva versión detectada.');
    }
    if (messages.length) {
        notice.classList.remove('hidden');
        if (messageEl) messageEl.textContent = messages.join(' ');
        if (reloadBtn) {
            reloadBtn.onclick = () => {
                ensureVersionStored(versionInfo);
                window.location.reload();
            };
        }
    }
}
