// ============================================================
// components/UpdateBanner.ts
// Banner de actualización de versión disponible.
// ============================================================

const VERSION_MANIFEST_URL = './version.json';
const CHECK_INTERVAL_MS = 120_000;

const CURRENT_BUILD_ID =
  document.querySelector<HTMLMetaElement>('meta[name="app-build-id"]')
    ?.getAttribute('content') ?? 'dev';

let _latestBuildId = '';
let _intervalId: ReturnType<typeof setInterval> | null = null;

export function setupUpdateChecker(): void {
  checkForUpdate();

  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(checkForUpdate, CHECK_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}

export function applyUpdate(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('build', _latestBuildId || String(Date.now()));
  window.location.href = url.toString();
}

async function checkForUpdate(): Promise<void> {
  try {
    const res = await fetch(`${VERSION_MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;

    const payload = await res.json() as { buildId?: string; deployedAt?: string };
    const remote = String(payload?.buildId ?? '').trim();

    if (!remote || remote === CURRENT_BUILD_ID) {
      hideBanner();
      return;
    }

    _latestBuildId = remote;
    showBanner(payload?.deployedAt ?? '');
  } catch {
    // silently ignore network errors for the update check
  }
}

function showBanner(deployedAt: string): void {
  const banner = document.getElementById('updateBanner');
  const text = document.getElementById('updateBannerText');
  if (!banner || !text) return;

  text.textContent = `Hay una nueva versión disponible${deployedAt ? ` (${deployedAt})` : ''}.`;
  banner.classList.remove('hidden');
}

function hideBanner(): void {
  document.getElementById('updateBanner')?.classList.add('hidden');
}

export function initUpdateBannerListeners(): void {
  document.getElementById('updateBannerBtn')?.addEventListener('click', applyUpdate);
}