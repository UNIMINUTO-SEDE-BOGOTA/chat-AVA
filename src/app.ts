// ============================================================
// app.ts
// Orquestador principal. Conecta ChatManager, Sidebar,
// servicios y componentes. Es el único lugar que conoce
// el estado global de la aplicación.
// ============================================================

import type { Chat } from './models/chat';
import { loadChats, saveChats } from './core/chat/ChatStorage';
import {
  createBaseChat,
  maybeUpdateTitle,
  removeChat,
  restoreChat,
  type PendingDelete,
} from './core/chat/ChatManager';
import {
  renderMessages,
  updateInputState,
  adjustInputHeight,
  scrollToBottom,
} from './core/chat/ChatRenderer';
import { renderChatsList, initSidebarListeners } from './components/Sidebar';
import { showUndoToast, initUndoToastListeners } from './components/UndoToast';
import { setupUpdateChecker, initUpdateBannerListeners } from './components/UpdateBanner';
import { SERVICES, SERVICE_ORDER } from './config/services';

// AVA service
import {
  avaSelectCategory,
  avaSendMessage,
  avaSendProcessSelection,
  avaRenderSpecial,
  avaBindProcessSelection,
  renderAvaWelcomeCards,
  bindAvaWelcomeCards,
} from './services/ava/ava';

export class App {
  private chats: Chat[] = [];
  private currentChatId = '';
  private isSending = false;
  private pendingDelete: PendingDelete | null = null;

  // ── Init ────────────────────────────────────────────────────

  init(): void {
    this.chats = loadChats();
    if (this.chats.length === 0) {
      this.createNewChat();
    } else {
      this.loadChat(this.chats[0].id);
    }

    this.initComponents();
    this.initInputListeners();
    this.renderWelcomeCards();
  }

  private initComponents(): void {
    initSidebarListeners({
      onNewChat: () => this.createNewChat(),
      onSelectChat: (id) => this.loadChat(id),
      onDeleteChat: (id, e) => this.deleteChat(id, e),
      onLogoClick: () => this.goToMainWindow(),
    });

    initUndoToastListeners();
    initUpdateBannerListeners();
    setupUpdateChecker();

    // AVA process selection callback
    avaBindProcessSelection((sub, macro) => {
      const chat = this.currentChat;
      if (!chat) return;
      avaSendProcessSelection(chat, sub, macro, () => this.save()).then(() => {
        renderMessages(chat, avaRenderSpecial);
        this.renderSidebar();
        updateInputState(chat.state, this.isSending);
      });
    });
  }

  private initInputListeners(): void {
    const input = document.getElementById('messageInput') as HTMLTextAreaElement | null;
    const sendBtn = document.getElementById('sendBtn');

    input?.addEventListener('input', () => adjustInputHeight());
    input?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    input?.addEventListener('focus', () => {
      setTimeout(() => {
        document.getElementById('inputContainer')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }, 350);
    });

    sendBtn?.addEventListener('click', () => this.sendMessage());

    if (typeof window.visualViewport !== 'undefined') {
    window.visualViewport?.addEventListener('resize', () => scrollToBottom());
    }
  }

  // ── Welcome screen ───────────────────────────────────────────

  private renderWelcomeCards(): void {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    // Build cards for each registered service
    let html = '';
    SERVICE_ORDER.forEach(id => {
      const svc = SERVICES[id];
      if (!svc) return;

      if (svc.id === 'ava') {
        html += renderAvaWelcomeCards();
      } else {
        const disabled = !svc.enabled || svc.comingSoon;
        html += `
          <button class="category-btn${disabled ? ' category-btn-disabled' : ''}"
            ${disabled ? 'disabled aria-disabled="true"' : ''}
            data-service="${svc.id}">
            ${svc.comingSoon ? '<span class="category-status-badge">Próximamente</span>' : ''}
            <span class="icon">${svc.icon}</span>
            ${svc.name}
          </button>`;
      }
    });

    grid.innerHTML = html;

    // Bind AVA category cards
    bindAvaWelcomeCards(grid, (cat) => this.avaOnSelectCategory(cat));

    // Bind other service cards
    grid.querySelectorAll<HTMLButtonElement>('[data-service]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.service;
        if (id) this.onSelectService(id);
      });
    });
  }

  // ── Service routing ──────────────────────────────────────────

  private onSelectService(serviceId: string): void {
    // Extend here when new services are added
    console.log('Service selected:', serviceId);
  }

  private avaOnSelectCategory(category: string): void {
    const chat = this.currentChat;
    if (!chat) return;

    document.getElementById('welcomeScreen')?.classList.add('hidden');
    avaSelectCategory(chat, category, () => this.save());
    renderMessages(chat, avaRenderSpecial);
    this.renderSidebar();
    updateInputState(chat.state, this.isSending);
  }

  // ── Message sending ──────────────────────────────────────────

  async sendMessage(): Promise<void> {
    const input = document.getElementById('messageInput') as HTMLTextAreaElement | null;
    const message = input?.value.trim();
    if (!message || this.isSending) return;

    const chat = this.ensureActiveChat();
    if (!chat) return;

    // Add user message
    chat.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    maybeUpdateTitle(chat, message);
    if (input) { input.value = ''; adjustInputHeight(); }

    this.isSending = true;
    updateInputState(chat.state, true);
    renderMessages(chat, avaRenderSpecial);
    this.save();
    this.renderSidebar();

    // Route to the right service handler
    if (chat.serviceId === 'ava') {
      await avaSendMessage(chat, message, () => this.save());
    }

    this.isSending = false;
    updateInputState(chat.state, false);
    renderMessages(chat, avaRenderSpecial);
    this.save();
  }

  // ── Chat lifecycle ───────────────────────────────────────────

  createNewChat(): void {
    const chat = createBaseChat();
    this.currentChatId = chat.id;
    this.chats.unshift(chat);
    this.save();
    this.renderSidebar();
    this.loadChat(this.currentChatId);
  }

  goToMainWindow(): void {
    const chat = this.currentChat;
    if (chat && chat.messages.length === 0 && chat.state === 'welcome') {
      this.loadChat(chat.id);
    } else {
      this.createNewChat();
    }
  }

  loadChat(chatId: string): void {
    this.currentChatId = chatId;
    const chat = this.currentChat;
    if (!chat) return;

    const welcome = document.getElementById('welcomeScreen');
    if (chat.messages.length === 0) {
      welcome?.classList.remove('hidden');
    } else {
      welcome?.classList.add('hidden');
    }

    renderMessages(chat, avaRenderSpecial);
    updateInputState(chat.state, this.isSending);
    this.renderSidebar();
  }

  deleteChat(chatId: string, event?: MouseEvent): void {
    event?.stopPropagation();

    const toDelete = this.chats.find(c => c.id === chatId);
    if (!toDelete) return;

    if (!window.confirm(`¿Eliminar el chat "${toDelete.title}"?`)) return;

    const result = removeChat(this.chats, chatId, this.currentChatId);
    if (!result) return;

    this.chats = result.chats;
    this.currentChatId = result.newCurrentId;
    this.pendingDelete = result.pending;

    this.save();
    this.renderSidebar();
    this.loadChat(this.currentChatId);

    showUndoToast(
      toDelete.title,
      () => this.undoDelete(),
      () => { this.pendingDelete = null; }
    );
  }

  private undoDelete(): void {
    if (!this.pendingDelete) return;
    const { chats, restoredId } = restoreChat(this.chats, this.pendingDelete);
    this.chats = chats;
    this.currentChatId = restoredId;
    this.pendingDelete = null;
    this.save();
    this.renderSidebar();
    this.loadChat(restoredId);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private get currentChat(): Chat | undefined {
    return this.chats.find(c => c.id === this.currentChatId);
  }

  private ensureActiveChat(): Chat {
    if (!this.currentChatId || !this.chats.some(c => c.id === this.currentChatId)) {
      this.createNewChat();
    }
    return this.currentChat!;
  }

  private save(): void {
    saveChats(this.chats);
  }

  private renderSidebar(): void {
    renderChatsList(this.chats, this.currentChatId, {
      onNewChat: () => this.createNewChat(),
      onSelectChat: (id) => this.loadChat(id),
      onDeleteChat: (id, e) => this.deleteChat(id, e),
      onLogoClick: () => this.goToMainWindow(),
    });
  }
}