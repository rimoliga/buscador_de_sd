export function setupPWAInstall() {
    const sections = [
        {
            section: document.getElementById('installPwaSection'),
            btn: document.getElementById('installPwaBtn'),
            hide: document.getElementById('hideInstallPwaSection'),
        },
        {
            section: document.getElementById('installPwaSectionMobile'),
            btn: document.getElementById('installPwaBtnMobile'),
            hide: document.getElementById('hideInstallPwaSectionMobile'),
        },
    ].filter(s => s.section);

    sections.forEach(({ section }) => { section.style.display = 'none'; });

    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        sections.forEach(({ section }) => { section.style.display = 'block'; });
    });

    sections.forEach(({ btn, section }) => {
        btn?.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                sections.forEach(s => { s.section.style.display = 'none'; });
            }
            deferredPrompt = null;
        });
    });

    window.addEventListener('appinstalled', () => {
        sections.forEach(({ section }) => { section.style.display = 'none'; });
    });

    sections.forEach(({ hide, section }) => {
        hide?.addEventListener('click', () => { section.style.display = 'none'; });
    });
}

export function setupOfflineDetection() {
    const notice = document.getElementById('offlineNotice');
    if (!notice) return;
    const update = () => notice.classList.toggle('hidden', navigator.onLine);
    update();
    window.addEventListener('offline', update);
    window.addEventListener('online', update);
}

export function setupServiceWorker({ onDataUpdated }) {
    if (!('serviceWorker' in navigator)) return;

    const prevController = navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!prevController) return;
        const notice = document.getElementById('swUpdateNotice');
        notice?.classList.remove('hidden');
        document.getElementById('swUpdateReloadBtn')?.addEventListener('click', () => {
            window.location.reload();
        });
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
            console.error('No se pudo registrar el Service Worker', err);
        });
    });
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
            onDataUpdated(event.data);
        }
    });
}
