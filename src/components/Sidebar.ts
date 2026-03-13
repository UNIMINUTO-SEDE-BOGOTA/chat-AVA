// ============================================================
// components/Sidebar.ts
// Renderiza la lista de chats en el sidebar y expone callbacks
// para que el orquestador (App) reaccione a las acciones.
// ============================================================

import type { Chat } from '../models/chat';

export interface SidebarCallbacks {
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string, event: MouseEvent) => void;
  onLogoClick: () => void;
}

export function renderChatsList(
  chats: Chat[],
  currentChatId: string,
  callbacks: SidebarCallbacks
): void {
  const list = document.getElementById('chatsList');
  if (!list) return;

  list.innerHTML = '';

  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;

    const title = document.createElement('span');
    title.className = 'chat-item-title';
    title.textContent = chat.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'chat-delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Eliminar chat';
    deleteBtn.setAttribute('aria-label', `Eliminar chat ${chat.title}`);
    deleteBtn.textContent = '🗑';
    deleteBtn.onclick = (e) => callbacks.onDeleteChat(chat.id, e as MouseEvent);

    item.append(title, deleteBtn);
    item.onclick = () => callbacks.onSelectChat(chat.id);
    list.appendChild(item);
  });
}

export function initSidebarListeners(callbacks: SidebarCallbacks): void {
  document.getElementById('newChatBtn')?.addEventListener('click', callbacks.onNewChat);
  document.getElementById('logoBtn')?.addEventListener('click', callbacks.onLogoClick);
  document.getElementById('sidebarAvatar')?.addEventListener('click', callbacks.onLogoClick);
}