const STORAGE_KEY = 'ava_tour_done';
const MOBILE_BP   = 768;
const GAP         = 14;
const MARGIN      = 10;

interface TourStep {
  targetId: string;
  title: string;
  text: string;
  avatar: string;
  needsSidebar?: boolean;
  desktop: { side: 'top' | 'bottom' | 'left' | 'right'; align: 'start' | 'center' | 'end' };
  // mobile: fixed position — 'above' | 'below' | 'center' (no fallback)
  mobile: 'center' | 'below' | 'center';
}

const STEPS: TourStep[] = [
  {
    targetId: 'newChatBtn',
    title: '➕ Nuevo Chat',
    text: 'Crea una nueva conversación en cualquier momento. Cada chat es independiente y se guarda automáticamente.',
    avatar: '/ava-mascota.png',
    needsSidebar: true,
    desktop: { side: 'right', align: 'center' },
    mobile: 'center',
  },
  {
    targetId: 'chatsList',
    title: '💬 Tus conversaciones',
    text: 'Aquí aparecera tu historial chats. Haz clic en cualquiera para retomarlo, o usa el ícono 🗑 para eliminarlo.',
    avatar: '/ava-mascota.png',
    needsSidebar: true,
    desktop: { side: 'right', align: 'start' },
    mobile: 'center',
  },
  {
    targetId: 'teamsBtn',
    title: '👩‍💼 Chat En Línea',
    text: 'Si necesitas una asesoría personalizada, este botón te lleva a Microsoft Teams con alguien experto en el tema.',
    avatar: '/ava-mascota.png',
    needsSidebar: true,
    desktop: { side: 'right', align: 'center' },
    mobile: 'center',
  },
  {
    targetId: 'feedbackBtn',
    title: '⭐ Califica tu experiencia',
    text: 'Tu opinión nos ayuda a mejorar. Usa este formulario para reportar fallas, dar sugerencias o calificar tu experiencia con AVA.',
    avatar: '/ava-mascota.png',
    needsSidebar: true,
    desktop: { side: 'right', align: 'center' },
    mobile: 'center',
  },
  {
    targetId: 'themeToggleBtn',
    title: '🌙 Tema oscuro',
    text: 'Cambia entre el modo claro y oscuro según tu preferencia. La selección se guarda para tus próximas visitas.',
    avatar: '/ava-mascota.png',
    needsSidebar: false,
    desktop: { side: 'bottom', align: 'end' },
    mobile: 'center',
  },
  {
    targetId: 'categoriesGrid',
    title: '🧠 Módulos de AVA',
    text: 'Elige un módulo para comenzar: Capacitación SGC, Simulador de Auditorías y más.',
    avatar: '/ava-mascota.png',
    needsSidebar: false,
    desktop: { side: 'top', align: 'center' },
    mobile: 'center',
  },
  {
    targetId: 'tourReplayBtn',
    title: '❓ Repetir tour',
    text: '¡Eso es todo! Si quieres volver a ver este tour en cualquier momento, haz clic en este botón.',
    avatar: '/ava-mascota.png',
    needsSidebar: false,
    desktop: { side: 'bottom', align: 'end' },
    mobile: 'center',
  },
];

let currentStep = 0;
let highlightEl: HTMLElement | null = null;

// ── Public ─────────────────────────────────────────────────────

export function initTour(): void {
  document.getElementById('tourCloseBtn')?.addEventListener('click', endTour);
  document.getElementById('tourNextBtn')?.addEventListener('click', nextStep);
  document.getElementById('tourPrevBtn')?.addEventListener('click', prevStep);
  document.getElementById('tourReplayBtn')?.addEventListener('click', startTour);
  if (!localStorage.getItem(STORAGE_KEY)) setTimeout(startTour, 800);
}

export function startTour(): void {
  currentStep = 0;
  showStep(currentStep);
}

// ── Helpers ────────────────────────────────────────────────────

function isMobile(): boolean { return window.innerWidth <= MOBILE_BP; }

function openSidebar(): void {
  document.getElementById('sidebar')?.classList.add('sidebar-open');
  document.getElementById('sidebarOverlay')?.classList.remove('hidden');
}
function closeSidebar(): void {
  document.getElementById('sidebar')?.classList.remove('sidebar-open');
  document.getElementById('sidebarOverlay')?.classList.add('hidden');
}

// ── Show step ──────────────────────────────────────────────────

function showStep(index: number): void {
  const step = STEPS[index];
  if (!step) { endTour(); return; }

  const mobile = isMobile();
  if (mobile) step.needsSidebar ? openSidebar() : closeSidebar();

  const tooltip  = document.getElementById('tourTooltip')!;
  const target   = document.getElementById(step.targetId);
  const labelEl  = document.getElementById('tourStepLabel');
  const titleEl  = document.getElementById('tourTooltipTitle');
  const textEl   = document.getElementById('tourTooltipText');
  const avatarEl = document.getElementById('tourAvatar') as HTMLImageElement | null;
  const prevBtn  = document.getElementById('tourPrevBtn') as HTMLButtonElement | null;
  const nextBtn  = document.getElementById('tourNextBtn') as HTMLButtonElement | null;

  if (labelEl) labelEl.textContent = `${index + 1} / ${STEPS.length}`;
  if (titleEl) titleEl.textContent = step.title;
  if (textEl)  textEl.textContent  = step.text;
  if (prevBtn) prevBtn.disabled    = index === 0;
  if (nextBtn) nextBtn.textContent = index === STEPS.length - 1 ? 'Finalizar ✓' : 'Siguiente →';

  if (avatarEl) {
    avatarEl.style.opacity = '0';
    avatarEl.src = step.avatar;
    avatarEl.onerror = () => { avatarEl.src = '/icon-ava.png'; avatarEl.style.opacity = '1'; };
    avatarEl.onload  = () => { avatarEl.style.opacity = '1'; };
    if (avatarEl.complete && avatarEl.naturalWidth > 0) avatarEl.style.opacity = '1';
  }

  document.getElementById('tourBackdrop')?.classList.remove('hidden');

  // Off-screen while measuring
  tooltip.style.visibility = 'hidden';
  tooltip.style.transform  = '';
  tooltip.style.top        = '-9999px';
  tooltip.style.left       = '-9999px';
  tooltip.classList.remove('hidden');

  removeHighlight();
  if (target) {
    highlightEl = target;
    target.classList.add('tour-highlight');
  }

  const delay = mobile && step.needsSidebar ? 320 : 0;

  setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!target) { placeCenter(tooltip); tooltip.style.visibility = ''; return; }

        const tW = tooltip.offsetWidth;
        const tH = tooltip.offsetHeight;

        if (mobile) {
          placeMobile(tooltip, target, step.mobile, tW, tH);
        } else {
          placeDesktop(tooltip, target, step.desktop.side, step.desktop.align, tW, tH);
        }

        tooltip.style.visibility = '';

        // Ajuste manual de posición por paso en desktop
        if (!mobile) {
          const currentTop = parseInt(tooltip.style.top, 10);
          if (!isNaN(currentTop)) {
            const offsets: Record<number, number> = {
              0: 50, // Nuevo Chat — 50px más abajo
            };
            const offset = offsets[index];
            if (offset !== undefined) {
              tooltip.style.top = (currentTop + offset) + 'px';
            }
          }
        }
      });
    });
  }, delay);
}

function nextStep(): void {
  if (currentStep < STEPS.length - 1) { currentStep++; showStep(currentStep); }
  else endTour();
}
function prevStep(): void {
  if (currentStep > 0) { currentStep--; showStep(currentStep); }
}
function endTour(): void {
  document.getElementById('tourTooltip')?.classList.add('hidden');
  document.getElementById('tourBackdrop')?.classList.add('hidden');
  removeHighlight();
  if (isMobile()) closeSidebar();
  localStorage.setItem(STORAGE_KEY, '1');
}
function removeHighlight(): void {
  highlightEl?.classList.remove('tour-highlight');
  highlightEl = null;
}

// ── Mobile positioning — NO fallback, position is fixed ───────

function placeMobile(
  tooltip: HTMLElement,
  target: HTMLElement,
  position: 'above' | 'below' | 'center',
  tW: number,
  tH: number,
): void {
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;
  const rect = target.getBoundingClientRect();

  // Horizontal: always centered on screen, clamped to edges
  const left = Math.max(MARGIN, Math.min(vw / 2 - tW / 2, vw - tW - MARGIN));

  let top: number;

  if (position === 'center') {
    // Vertically centered on screen regardless of target
    tooltip.style.position  = 'fixed';
    tooltip.style.top       = '50%';
    tooltip.style.left      = `${Math.round(left)}px`;
    tooltip.style.transform = 'translateY(-50%)';
    return;
  }

  if (position === 'above') {
    top = rect.top - tH - GAP;
  } else {
    // below
    top = rect.bottom + GAP;
  }

  // Only clamp vertically — never switch sides
  top = Math.max(MARGIN, Math.min(top, vh - tH - MARGIN));

  tooltip.style.position  = 'fixed';
  tooltip.style.left      = `${Math.round(left)}px`;
  tooltip.style.top       = `${Math.round(top)}px`;
  tooltip.style.transform = '';
}

// ── Desktop positioning ────────────────────────────────────────

function placeDesktop(
  tooltip: HTMLElement,
  target: HTMLElement,
  side: 'top' | 'bottom' | 'left' | 'right',
  align: 'start' | 'center' | 'end',
  tW: number,
  tH: number,
): void {
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;
  const rect = target.getBoundingClientRect();

  let top = 0;
  let left = 0;

  switch (side) {
    case 'bottom': top  = rect.bottom + GAP; break;
    case 'top':    top  = rect.top - tH - GAP; break;
    case 'right':  left = rect.right + GAP; break;
    case 'left':   left = rect.left - tW - GAP; break;
  }

  if (side === 'top' || side === 'bottom') {
    switch (align) {
      case 'start':  left = rect.left; break;
      case 'center': left = rect.left + rect.width / 2 - tW / 2; break;
      case 'end':    left = rect.right - tW; break;
    }
  } else {
    switch (align) {
      case 'start':  top = rect.top; break;
      case 'center': top = rect.top + rect.height / 2 - tH / 2; break;
      case 'end':    top = rect.bottom - tH; break;
    }
  }

  // Flip if goes off screen
  if (side === 'bottom' && top + tH > vh - MARGIN) top  = rect.top - tH - GAP;
  if (side === 'top'    && top < MARGIN)            top  = rect.bottom + GAP;
  if (side === 'right'  && left + tW > vw - MARGIN) left = rect.left - tW - GAP;
  if (side === 'left'   && left < MARGIN)            left = rect.right + GAP;

  // Hard clamp
  left = Math.max(MARGIN, Math.min(left, vw - tW - MARGIN));
  top  = Math.max(MARGIN, Math.min(top,  vh - tH - MARGIN));

  tooltip.style.position  = 'fixed';
  tooltip.style.left      = `${Math.round(left)}px`;
  tooltip.style.top       = `${Math.round(top)}px`;
  tooltip.style.transform = '';
}

function placeCenter(tooltip: HTMLElement): void {
  tooltip.style.position  = 'fixed';
  tooltip.style.top       = '50%';
  tooltip.style.left      = '50%';
  tooltip.style.transform = 'translate(-50%, -50%)';
}
