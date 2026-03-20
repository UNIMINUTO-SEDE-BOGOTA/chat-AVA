// ============================================================
// core/chat/ChatStorage.ts
// Abstracción sobre localStorage. Toda la app accede al
// almacenamiento exclusivamente a través de esta clase.
// ============================================================

import type { Chat } from '../../models/chat';
import { generateChatId, generateSessionId } from './ChatManager';

const STORAGE_KEY     = 'ava_chats';
const ACTIVE_CHAT_KEY = 'ava_active_chat';   // ← NO se persiste entre sesiones

export function saveChats(chats: Chat[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.warn('No se pudo guardar chats en localStorage.', e);
  }
}

export function loadChats(): Chat[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((chat: Partial<Chat>): Chat => ({
      id:           chat.id          ?? generateChatId(),
      sessionId:    chat.sessionId   ?? generateSessionId(),
      title:        !chat.title || chat.title === 'Nuevo chat' ? 'Chat' : chat.title,
      messages:     chat.messages    ?? [],
      serviceId:    chat.serviceId   ?? null,
      category:     chat.category    ?? null,
      macroproceso: chat.macroproceso ?? null,
      process:      chat.process     ?? null,
      // ▼ Siempre arranca en 'welcome' sin importar cómo fue guardado.
      //   Esto hace que al reabrir la app se muestre la pantalla principal
      //   con los módulos, no la última conversación activa.
      state:        'welcome',
      createdAt:    chat.createdAt   ?? new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('No se pudo parsear chats guardados. Se reinicia el almacenamiento.', e);
    return [];
  }
}

export function clearChats(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Chat activo en sesión (NO persiste al cerrar) ─────────────
// Guarda en sessionStorage (no en localStorage) para que al
// reabrir la pestaña / app no haya ningún chat "activo" previo.

export function saveActiveChat(chatId: string): void {
  try {
    sessionStorage.setItem(ACTIVE_CHAT_KEY, chatId);
  } catch { /* silencioso */ }
}

export function loadActiveChat(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_CHAT_KEY);
  } catch {
    return null;
  }
}

export function clearActiveChat(): void {
  try {
    sessionStorage.removeItem(ACTIVE_CHAT_KEY);
  } catch { /* silencioso */ }
}