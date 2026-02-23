// ========================================
    // CONFIGURACIÓN
    // ========================================
    const CATEGORY_WEBHOOKS = {
        capacitacion: 'https://TU_N8N_URL/webhook/CAPACITACION_ID',
        consulta: 'https://TU_N8N_URL/webhook/CONSULTA_ID',
        simulador: 'https://n8necosystem-amdxgsdnd3dgewaj.centralus-01.azurewebsites.net/webhook/4c16333e-fdf5-4c86-b6b2-35bf5f0493f0',
        gestion: 'https://TU_N8N_URL/webhook/GESTION_ID'
    };
    const REQUEST_TIMEOUT_MS = 15000;
    const THEME_STORAGE_KEY = 'ava_theme';
    const DELETE_UNDO_TIMEOUT_MS = 5000;

    // Estado global
    let chats = [];
    let currentChatId = null;
    let currentState = 'welcome'; // welcome, category_selected, process_selected, chatting
    let isSending = false;
    let pendingDeletedChat = null;
    let pendingDeleteTimerId = null;

    // ========================================
    // INICIALIZACIÓN
    // ========================================
    function init() {
        initTheme();
        loadChatsFromStorage();
        if (chats.length === 0) {
            createNewChat();
        } else {
            loadChat(chats[0].id);
        }
    }

    // ========================================
    // GESTIÓN DE CHATS
    // ========================================
    function generateChatId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function generateSessionId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function createBaseChat() {
        return {
            id: generateChatId(),
            sessionId: generateSessionId(),
            title: 'Nuevo chat',
            messages: [],
            category: null,
            process: null,
            state: 'welcome',
            createdAt: new Date().toISOString()
        };
    }

    function createNewChat() {
        const chat = createBaseChat();
        console.log('Nuevo chat creado:', chat.sessionId);

        chats.unshift(chat);
        saveChatsToStorage();
        renderChatsList();
        loadChat(chat.id);
    }

    function deleteChat(chatId, event) {
        if (event) {
            event.stopPropagation();
        }

        const deleteIndex = chats.findIndex(chat => chat.id === chatId);
        if (deleteIndex === -1) return;

        const chatToDelete = chats[deleteIndex];
        const shouldDelete = window.confirm(`¿Eliminar el chat "${chatToDelete.title}"?`);
        if (!shouldDelete) {
            return;
        }

        const wasCurrentChat = currentChatId === chatId;
        const wasOnlyChat = chats.length === 1;

        chats.splice(deleteIndex, 1);

        pendingDeletedChat = {
            chat: { ...chatToDelete },
            index: deleteIndex,
            wasCurrentChat,
            wasOnlyChat
        };

        if (wasOnlyChat) {
            const fallbackChat = createBaseChat();
            fallbackChat.isAutoFallback = true;
            chats.push(fallbackChat);
            currentChatId = fallbackChat.id;
        } else if (wasCurrentChat || !chats.some(chat => chat.id === currentChatId)) {
            currentChatId = chats[0].id;
        }

        saveChatsToStorage();
        renderChatsList();
        loadChat(currentChatId);
        showDeleteToast(chatToDelete.title);
    }

    function showDeleteToast(chatTitle) {
        const toast = document.getElementById('undoToast');
        const toastText = document.getElementById('undoToastText');

        if (!toast || !toastText) return;

        toastText.textContent = `Chat eliminado: ${chatTitle}`;
        toast.classList.remove('hidden');

        if (pendingDeleteTimerId) {
            clearTimeout(pendingDeleteTimerId);
        }

        pendingDeleteTimerId = setTimeout(() => {
            clearPendingDeletedChat();
        }, DELETE_UNDO_TIMEOUT_MS);
    }

    function hideDeleteToast() {
        const toast = document.getElementById('undoToast');
        if (toast) {
            toast.classList.add('hidden');
        }
    }

    function clearPendingDeletedChat() {
        pendingDeletedChat = null;

        if (pendingDeleteTimerId) {
            clearTimeout(pendingDeleteTimerId);
            pendingDeleteTimerId = null;
        }

        hideDeleteToast();
    }

    function undoDeleteChat() {
        if (!pendingDeletedChat || !pendingDeletedChat.chat) {
            hideDeleteToast();
            return;
        }

        if (pendingDeletedChat.wasOnlyChat) {
            chats = chats.filter(chat => !chat.isAutoFallback);
        }

        if (chats.some(chat => chat.id === pendingDeletedChat.chat.id)) {
            clearPendingDeletedChat();
            return;
        }

        const insertIndex = Math.min(pendingDeletedChat.index, chats.length);
        delete pendingDeletedChat.chat.isAutoFallback;
        chats.splice(insertIndex, 0, pendingDeletedChat.chat);

        currentChatId = pendingDeletedChat.chat.id;
        saveChatsToStorage();
        renderChatsList();
        loadChat(currentChatId);
        clearPendingDeletedChat();
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        const chat = chats.find(c => c.id === chatId);
        
        if (!chat) return;

        currentState = chat.state;
        
        // Actualizar UI
        document.getElementById('chatTitle').textContent = chat.title;
        renderMessages(chat);
        updateInputState();
        renderChatsList();

        // Mostrar/ocultar welcome screen
        if (chat.messages.length === 0) {
            document.getElementById('welcomeScreen').classList.remove('hidden');
        } else {
            document.getElementById('welcomeScreen').classList.add('hidden');
        }
    }

    function getCurrentChat() {
        return chats.find(c => c.id === currentChatId);
    }

    function updateChatState(newState) {
        const chat = getCurrentChat();
        if (chat) {
            chat.state = newState;
            currentState = newState;
            saveChatsToStorage();
            updateInputState();
        }
    }

    // ========================================
    // SELECCIÓN DE CATEGORÍA
    // ========================================
    function selectCategory(category) {
        const chat = getCurrentChat();
        if (!chat) return;

        chat.category = category;
        
        // Ocultar welcome screen
        document.getElementById('welcomeScreen').classList.add('hidden');

        // Mapeo de categorías
        const categoryNames = {
            'capacitacion': 'Capacitación SGC en UNIMINUTO',
            'consulta': 'Consulta Técnica ISO 9001:2015',
            'simulador': 'Simulador de Auditorías',
            'gestion': 'Gestión de No Conformidades'
        };

        chat.title = categoryNames[category];
        document.getElementById('chatTitle').textContent = chat.title;

        // Mensaje de bienvenida del bot
        const welcomeMessage = {
            role: 'assistant',
            content: `👋 Bienvenido al módulo "${categoryNames[category]}". Estoy listo para ayudarte.`,
            timestamp: new Date().toISOString()
        };

        chat.messages.push(welcomeMessage);

        // Si es Simulador, mostrar selección de proceso
        if (category === 'simulador') {
            const processSelectionMessage = {
                role: 'assistant',
                content: 'process_selection', // Indicador especial
                timestamp: new Date().toISOString()
            };
            chat.messages.push(processSelectionMessage);
            updateChatState('category_selected');
        } else {
            // Para otras categorías, permitir chat libre
            updateChatState('chatting');
        }

        saveChatsToStorage();
        renderMessages(chat);
        renderChatsList();
    }

    // ========================================
    // SELECCIÓN DE PROCESO
    // ========================================
    function selectProcess(process) {
        const chat = getCurrentChat();
        if (!chat) return;

        chat.process = process;

        // Mensaje del usuario
        const userMessage = {
            role: 'user',
            content: process,
            timestamp: new Date().toISOString()
        };
        chat.messages.push(userMessage);
        renderMessages(chat);
        saveChatsToStorage();

        // ========================================
        // ENVIAR A N8N (NUEVO)
        // ========================================
        sendToN8N(process, chat);
    }

    async function sendToN8N(message, chat) {
        const WEBHOOK_URL = getWebhookForCategory(chat.category);

        if (!WEBHOOK_URL) {
            chat.messages.push({
                role: 'assistant',
                content: '⚠️ Esta categoría no tiene webhook configurado. Actualiza CATEGORY_WEBHOOKS en app.js.',
                timestamp: new Date().toISOString()
            });
            renderMessages(chat);
            saveChatsToStorage();
            return;
        }

        showTypingIndicator();
        
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    proceso: '',
                    subproceso: '',
                    sessionId: chat.sessionId,
                    category: chat.category
                })
            });

            const data = await response.json();

            const botMessage = {
                role: 'assistant',
                content: data.respuesta || data.message?.content || 'Error',
                timestamp: new Date().toISOString()
            };
            chat.messages.push(botMessage);

        } catch (error) {
            console.error('Error:', error);
            chat.messages.push({
                role: 'assistant',
                content: 'Error al conectar con el servidor',
                timestamp: new Date().toISOString()
            });
        } finally {
            hideTypingIndicator();
            updateChatState('chatting');
            renderMessages(chat);
            saveChatsToStorage();
        }
    }

    // ========================================
    // ENVÍO DE MENSAJES
    // ========================================
    async function sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (!message || isSending) return;

        const chat = getCurrentChat();
        if (!chat) return;

        const categoryWebhook = getWebhookForCategory(chat.category);

        if (!categoryWebhook) {
            const notConfiguredMessage = {
                role: 'assistant',
                content: '⚠️ Esta categoría no tiene webhook configurado. Actualiza CATEGORY_WEBHOOKS en app.js.',
                timestamp: new Date().toISOString()
            };
            chat.messages.push(notConfiguredMessage);
            renderMessages(chat);
            saveChatsToStorage();
            return;
        }

        // Agregar mensaje del usuario
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        chat.messages.push(userMessage);
        
        input.value = '';
        renderMessages(chat);
        saveChatsToStorage();

        // Mostrar indicador de escritura
        isSending = true;
        updateInputState();
        showTypingIndicator();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            // Enviar al webhook
            const response = await fetch(categoryWebhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal,
                body: JSON.stringify({
                    message: message,
                    proceso: chat.process || '',
                    subproceso: '',
                    sessionId: chat.sessionId,
                    category: chat.category
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await parseResponsePayload(response);

            // Agregar respuesta del bot
            const botMessage = {
                role: 'assistant',
                content: extractAssistantReply(data),
                timestamp: new Date().toISOString()
            };
            chat.messages.push(botMessage);

        } catch (error) {
            console.error('Error:', error);
            const errorMessage = {
                role: 'assistant',
                content: buildUserFriendlyError(error),
                timestamp: new Date().toISOString()
            };
            chat.messages.push(errorMessage);
        } finally {
            hideTypingIndicator();
            isSending = false;
            updateInputState();
            renderMessages(chat);
            saveChatsToStorage();
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    // ========================================
    // RENDERIZADO
    // ========================================
    function renderMessages(chat) {
        const container = document.getElementById('messagesContainer');
        const welcomeScreen = document.getElementById('welcomeScreen');

        // Limpiar mensajes anteriores (excepto welcome screen)
        const existingMessages = container.querySelectorAll('.message, .process-selection');
        existingMessages.forEach(el => el.remove());

        if (chat.messages.length === 0) {
            welcomeScreen.classList.remove('hidden');
            return;
        }

        welcomeScreen.classList.add('hidden');

        chat.messages.forEach(msg => {
            if (msg.content === 'process_selection') {
                renderProcessSelection();
            } else {
                renderMessage(msg);
            }
        });

        scrollToBottom();
    }

    function renderMessage(message) {
        const container = document.getElementById('messagesContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = message.role === 'user' ? '👤' : '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = formatMessage(message.content);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        container.appendChild(messageDiv);
    }

    function renderProcessSelection() {
        const container = document.getElementById('messagesContainer');
        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'process-selection';
        selectionDiv.innerHTML = `
            <div class="process-selection-title">📋 Selecciona el proceso a auditar:</div>
            <div class="process-buttons">
                <button class="process-btn" onclick="selectProcess('Investigación')">
                    🔬 Investigación
                </button>
                <button class="process-btn" onclick="selectProcess('Docencia')">
                    📚 Docencia
                </button>
                <button class="process-btn" onclick="selectProcess('Proyección Social')">
                    🌍 Proyección Social
                </button>
            </div>
        `;
        container.appendChild(selectionDiv);
    }

    function renderChatsList() {
        const list = document.getElementById('chatsList');
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
            deleteBtn.onclick = (event) => deleteChat(chat.id, event);

            item.appendChild(title);
            item.appendChild(deleteBtn);
            item.onclick = () => loadChat(chat.id);
            list.appendChild(item);
        });
    }

    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const preferredTheme =
            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';

        const theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : preferredTheme;
        applyTheme(theme);
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        const toggleBtn = document.getElementById('themeToggleBtn');
        if (toggleBtn) {
            const isDark = theme === 'dark';
            toggleBtn.textContent = isDark ? '☀️' : '🌙';
            toggleBtn.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
        }
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }

    function showTypingIndicator() {
        const container = document.getElementById('messagesContainer');
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        container.appendChild(indicator);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    function updateInputState() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const wrapper = document.getElementById('inputWrapper');
        const inputContainer = document.getElementById('inputContainer');

        if (inputContainer) {
            if (currentState === 'welcome') {
                inputContainer.classList.add('hidden');
            } else {
                inputContainer.classList.remove('hidden');
            }
        }

        if (currentState === 'chatting' && !isSending) {
            input.disabled = false;
            sendBtn.disabled = false;
            wrapper.classList.remove('disabled');
        } else {
            input.disabled = true;
            sendBtn.disabled = true;
            wrapper.classList.add('disabled');
        }
    }

    function scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    function formatMessage(text) {
        const escapedText = escapeHtml(String(text ?? ''));

        // Formato básico de markdown seguro
        return escapedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isWebhookConfigured() {
        return Object.values(CATEGORY_WEBHOOKS).some(isValidWebhookUrl);
    }

    function getWebhookForCategory(category) {
        if (!category) return '';
        const webhook = CATEGORY_WEBHOOKS[category];
        return isValidWebhookUrl(webhook) ? webhook : '';
    }

    function isValidWebhookUrl(webhookUrl) {
        return Boolean(
            webhookUrl &&
            webhookUrl.startsWith('http') &&
            !webhookUrl.includes('TU_N8N_URL') &&
            !webhookUrl.includes('_ID')
        );
    }

    async function parseResponsePayload(response) {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return await response.json();
        }

        const textPayload = await response.text();
        return { message: { content: textPayload } };
    }

    function extractAssistantReply(data) {
        if (typeof data === 'string' && data.trim()) return data;
        if (data?.respuesta) return data.respuesta;
        if (data?.message?.content) return data.message.content;
        if (data?.message && typeof data.message === 'string') return data.message;
        return 'Lo siento, no pude procesar tu solicitud.';
    }

    function buildUserFriendlyError(error) {
        if (error?.name === 'AbortError') {
            return 'La solicitud tardó demasiado y se canceló. Intenta de nuevo.';
        }
        return 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.';
    }

    // ========================================
    // ALMACENAMIENTO LOCAL
    // ========================================
    function saveChatsToStorage() {
        localStorage.setItem('ava_chats', JSON.stringify(chats));
    }

    function loadChatsFromStorage() {
        const stored = localStorage.getItem('ava_chats');
        if (!stored) {
            chats = [];
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            chats = Array.isArray(parsed)
                ? parsed.map(chat => ({
                    ...chat,
                    id: chat?.id || generateChatId(),
                    sessionId: chat?.sessionId || generateSessionId()
                }))
                : [];
        } catch (error) {
            console.warn('No se pudo parsear ava_chats. Se reinicia el almacenamiento.', error);
            chats = [];
        }
    }

    // ========================================
    // INICIO
    // ========================================
    init();

