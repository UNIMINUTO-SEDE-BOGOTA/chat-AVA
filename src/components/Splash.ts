// ============================================================
// components/Splash.ts
// Pantalla de bienvenida animada. Se muestra una sola vez
// por sesión (no por primer ingreso — siempre al cargar).
// ============================================================

const AVATARS = [
  '/assets/images/ava_frente.png',
  '/assets/images/ava_lado.png',
  '/assets/images/ava_derecha.png',
];

const AVATAR_INTERVAL_MS = 900;
const SPLASH_DURATION_MS = 3800;

export function initSplash(onDone: () => void): void {
  const splash = document.getElementById('splashScreen');
  if (!splash) { onDone(); return; }

  // Preload avatars
  AVATARS.forEach(src => { const i = new Image(); i.src = src; });

  // Cycle avatars
  let avatarIndex = 0;
  const avatarEl = document.getElementById('splashAvatar') as HTMLImageElement | null;

  if (avatarEl) {
    avatarEl.src = AVATARS[0];
    const cycleTimer = setInterval(() => {
      if (!avatarEl) return;
      avatarEl.style.opacity = '0';
      setTimeout(() => {
        avatarIndex = (avatarIndex + 1) % AVATARS.length;
        avatarEl.src = AVATARS[avatarIndex];
        avatarEl.style.opacity = '1';
      }, 300);
    }, AVATAR_INTERVAL_MS);

    // Auto-dismiss after duration
    setTimeout(() => {
      clearInterval(cycleTimer);
      dismissSplash(splash, onDone);
    }, SPLASH_DURATION_MS);
  }

  // Skip on click / tap
  splash.addEventListener('click', () => {
    dismissSplash(splash, onDone);
  }, { once: true });
}

function dismissSplash(splash: HTMLElement, onDone: () => void): void {
  splash.classList.add('splash-exit');
  splash.addEventListener('animationend', () => {
    splash.remove();
    onDone();
  }, { once: true });
}