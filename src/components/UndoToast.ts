// ============================================================
// components/UndoToast.ts
// Toast de "deshacer eliminación" de chat.
// ============================================================

const UNDO_TIMEOUT_MS = 5_000;

let _timerId: ReturnType<typeof setTimeout> | null = null;
let _onUndo: (() => void) | null = null;
let _onExpire: (() => void) | null = null;

export function showUndoToast(
  chatTitle: string,
  onUndo: () => void,
  onExpire: () => void
): void {
  const toast = document.getElementById('undoToast');
  const text = document.getElementById('undoToastText');
  if (!toast || !text) return;

  _onUndo = onUndo;
  _onExpire = onExpire;

  text.textContent = `Chat eliminado: ${chatTitle}`;
  toast.classList.remove('hidden');

  if (_timerId) clearTimeout(_timerId);
  _timerId = setTimeout(() => {
    hideUndoToast();
    _onExpire?.();
  }, UNDO_TIMEOUT_MS);
}

export function hideUndoToast(): void {
  document.getElementById('undoToast')?.classList.add('hidden');
  if (_timerId) {
    clearTimeout(_timerId);
    _timerId = null;
  }
}

export function initUndoToastListeners(): void {
  document.getElementById('undoToastBtn')?.addEventListener('click', () => {
    hideUndoToast();
    _onUndo?.();
  });
}