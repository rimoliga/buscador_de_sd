const sectionButtons = document.querySelectorAll('[data-section-target]');
const sections = {
    search: document.getElementById('searchSection'),
    stats: document.getElementById('statsSection'),
    favorites: document.getElementById('favoritesSection'),
};
let activeSection = 'search';

export function initializeSectionTabs() {
    sectionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-section-target');
            if (!target || (button.disabled && target !== 'search')) return;
            if (sections[target]) setActiveSection(target);
        });
    });
    setActiveSection(activeSection);
}

export function setActiveSection(sectionKey) {
    if (!sections[sectionKey]) return;
    activeSection = sectionKey;
    Object.entries(sections).forEach(([key, element]) => {
        if (!element) return;
        element.classList.toggle('hidden', key !== sectionKey);
    });
    sectionButtons.forEach(button => {
        toggleTabClasses(button, button.getAttribute('data-section-target') === sectionKey);
    });
}

function toggleTabClasses(button, isActive) {
    if (!button) return;
    const activeClasses = ['bg-blue-500/20', 'border-blue-400/40', 'text-blue-100'];
    const inactiveClasses = ['border-white/10', 'text-white/60'];
    if (isActive) {
        button.classList.add(...activeClasses);
        button.classList.remove(...inactiveClasses);
    } else {
        button.classList.remove(...activeClasses);
        button.classList.add(...inactiveClasses);
    }
}
