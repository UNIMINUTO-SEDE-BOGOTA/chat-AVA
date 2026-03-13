// ============================================================
// core/chat/ChatStorage.ts
// Abstracción sobre localStorage. Toda la app accede al
// almacenamiento exclusivamente a través de esta clase.
// ============================================================

import type { Chat } from '../../models/chat';
import { generateChatId, generateSessionId } from './ChatManager';

const STORAGE_KEY = 'ava_chats';

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
      id: chat.id ?? generateChatId(),
      sessionId: chat.sessionId ?? generateSessionId(),
      title: !chat.title || chat.title === 'Nuevo chat' ? 'Chat' : chat.title,
      messages: chat.messages ?? [],
      serviceId: chat.serviceId ?? null,
      category: chat.category ?? null,
      macroproceso: chat.macroproceso ?? null,
      process: chat.process ?? null,
      state: chat.state ?? 'welcome',
      createdAt: chat.createdAt ?? new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('No se pudo parsear chats guardados. Se reinicia el almacenamiento.', e);
    return [];
  }
}

export function clearChats(): void {
  localStorage.removeItem(STORAGE_KEY);
}