const sectionButtons = document.querySelectorAll('[data-section-target]');
const sections = {
    search: document.getElementById('searchSection'),
    stats: document.getElementById('statsSection'),
    log: document.getElementById('logSection'),
    help: document.getElementById('helpSection'),
};
let activeSection = 'search';

export function initializeSectionTabs() {
    sectionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-section-target');
            if (target && sections[target]) setActiveSection(target);
        });
    });
    setActiveSection(activeSection);
}

export function setActiveSection(sectionKey) {
    if (!sections[sectionKey]) return;
    activeSection = sectionKey;
    Object.entries(sections).forEach(([key, el]) => {
        el?.classList.toggle('hidden', key !== sectionKey);
    });
    sectionButtons.forEach(button => {
        const isActive = button.getAttribute('data-section-target') === sectionKey;
        toggleTabClasses(button, isActive);
    });
}

function toggleTabClasses(button, isActive) {
    if ('bottomNav' in button.dataset) {
        button.classList.toggle('text-blue-400', isActive);
        button.classList.toggle('text-white/50', !isActive);
    } else {
        const on  = ['bg-blue-500/20', 'border-blue-400/40', 'text-blue-100'];
        const off = ['border-white/10', 'text-white/60'];
        if (isActive) { button.classList.add(...on);  button.classList.remove(...off); }
        else          { button.classList.remove(...on); button.classList.add(...off);  }
    }
}
