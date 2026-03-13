// ============================================================
// components/ThemeToggle.ts
// Maneja el toggle de tema oscuro/claro.
// Persiste la preferencia en localStorage y respeta
// prefers-color-scheme del sistema.
// ============================================================

const STORAGE_KEY = 'ava_theme';
const DARK = 'dark';
const LIGHT = 'light';

type Theme = typeof DARK | typeof LIGHT;

function getSystemPreference(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
}

function getSavedTheme(): Theme | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === DARK || saved === LIGHT ? saved : null;
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === DARK ? '☀️' : '🌙';
}

export function initThemeToggle(): void {
  // Aplica tema guardado o preferencia del sistema
  const theme = getSavedTheme() ?? getSystemPreference();
  applyTheme(theme);

  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') as Theme;
    const next: Theme = current === DARK ? LIGHT : DARK;
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  // Escucha cambios en la preferencia del sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Solo cambia si el usuario no eligió manualmente
    if (!getSavedTheme()) {
      applyTheme(e.matches ? DARK : LIGHT);
    }
  });
}