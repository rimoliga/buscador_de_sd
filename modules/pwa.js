export function setupPWAInstall() {
    const installBtn = document.getElementById('installPwaBtn');
    const installSection = document.getElementById('installPwaSection');
    const hideBtn = document.getElementById('hideInstallPwaSection');

    if (installSection) installSection.style.display = 'none';

    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installSection) installSection.style.display = 'block';
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted' && installSection) {
                installSection.style.display = 'none';
            }
            deferredPrompt = null;
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installSection) installSection.style.display = 'none';
    });

    if (hideBtn && installSection) {
        hideBtn.addEventListener('click', () => {
            installSection.style.display = 'none';
        });
    }
}

export function setupServiceWorker({ onDataUpdated }) {
    if (!('serviceWorker' in navigator)) return;
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
