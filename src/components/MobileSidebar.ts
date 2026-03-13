// ============================================================
// components/MobileSidebar.ts
// Controla el sidebar deslizable en mobile.
// En desktop no hace nada (el sidebar siempre es visible).
// ============================================================

const MOBILE_BREAKPOINT = 768;

function isMobile(): boolean {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

export function initMobileSidebar(): void {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const menuBtn  = document.getElementById('mobileMenuBtn');

  if (!sidebar || !overlay || !menuBtn) return;

  function openSidebar(): void {
    sidebar!.classList.add('sidebar-open');
    overlay!.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar(): void {
    sidebar!.classList.remove('sidebar-open');
    overlay!.classList.add('hidden');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', () => {
    if (sidebar.classList.contains('sidebar-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  // Cierra el sidebar al seleccionar un chat en mobile
  document.getElementById('chatsList')?.addEventListener('click', () => {
    if (isMobile()) closeSidebar();
  });

  // Cierra al rotar / redimensionar a desktop
  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });
}