// ========================================
    // CONFIGURACIÓN
    // ========================================
    const CATEGORY_WEBHOOKS = {
        capacitacion: 'https://n8necosystem-amdxgsdnd3dgewaj.centralus-01.azurewebsites.net/webhook/ava-capacitacion',
        consulta: 'https://n8necosystem-amdxgsdnd3dgewaj.centralus-01.azurewebsites.net/webhook/ava-consulta-iso',
        simulador: 'https://n8necosystem-amdxgsdnd3dgewaj.centralus-01.azurewebsites.net/webhook/4c16333e-fdf5-4c86-b6b2-35bf5f0493f0',
        gestion: 'https://TU_N8N_URL/webhook/GESTION_ID'
    };
    const PROCESOS = {
        'Docencia': [
            'Enseñanza, Aprendizaje y Evaluación',
            'Vida Estudiantil'
        ],
        'Investigación': [
            'Investigación Formativa',
            'Transferencia de Conocimiento y Tecnología'
        ],
        'Proyección Social': [
            'Educación Continua'
        ],
        'Gestión Administrativa y Financiera': [
            'Gestión de Ingresos',
            'Aprovisionamiento'
        ],
        'Gestión de Mercadeo y Posicionamiento': [
            'Comercialización y Ventas'
        ]
    };
    const CATEGORY_NAMES = {
        capacitacion: 'Capacitación SGC en UNIMINUTO',
        consulta: 'Consulta Técnica ISO 9001:2015',
        simulador: 'Simulador de Auditorías',
        gestion: 'Gestión de No Conformidades'
    };
    const REQUEST_TIMEOUT_MS = 60000;
    const DELETE_UNDO_TIMEOUT_MS = 5000;
    const UPDATE_CHECK_INTERVAL_MS = 120000;
    const VERSION_MANIFEST_URL = './version.json';
    const CURRENT_BUILD_ID = document.querySelector('meta[name="app-build-id"]')?.getAttribute('content') || 'dev';

    // Estado global
    let chats = [];
    let currentChatId = null;
    let currentState = 'welcome'; // welcome, category_selected, process_selected, chatting
    let isSending = false;
    let pendingDeletedChat = null;
    let pendingDeleteTimerId = null;
    let latestAvailableBuildId = '';
    let updateCheckTimerId = null;

    // ========================================
    // INICIALIZACIÓN
    // ========================================
    function init() {
        const chatTitle = document.getElementById('chatTitle');
        if (chatTitle) {
            chatTitle.textContent = 'AVA';
        }
        document.body.removeAttribute('data-theme');
        loadChatsFromStorage();
        if (chats.length === 0) {
            createNewChat();
        } else {
            loadChat(chats[0].id);
        }

        setupUpdateChecker();

        const input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('input', adjustMessageInputHeight);
            adjustMessageInputHeight();
        }
    }

    async function checkForAppUpdate({ silent = true } = {}) {
        try {
            const response = await fetch(`${VERSION_MANIFEST_URL}?t=${Date.now()}`, {
                cache: 'no-store'
            });

            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            const remoteBuildId = String(payload?.buildId || '').trim();

            if (!remoteBuildId || remoteBuildId === CURRENT_BUILD_ID) {
                hideUpdateBanner();
                return;
            }

            latestAvailableBuildId = remoteBuildId;
            showUpdateBanner(payload?.deployedAt || '');

            if (!silent) {
                console.log(`Nueva versión detectada: ${remoteBuildId}`);
            }
        } catch (error) {
            if (!silent) {
                console.warn('No se pudo verificar actualización.', error);
            }
        }
    }

    function setupUpdateChecker() {
        checkForAppUpdate();

        if (updateCheckTimerId) {
            clearInterval(updateCheckTimerId);
        }

        updateCheckTimerId = setInterval(() => {
            checkForAppUpdate();
        }, UPDATE_CHECK_INTERVAL_MS);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkForAppUpdate();
            }
        });
    }

    function showUpdateBanner(deployedAt = '') {
        const banner = document.getElementById('updateBanner');
        const text = document.getElementById('updateBannerText');

        if (!banner || !text) return;

        const suffix = deployedAt ? ` (${deployedAt})` : '';
        text.textContent = `Hay una nueva versión de AVA disponible${suffix}.`;
        banner.classList.remove('hidden');
    }

    function hideUpdateBanner() {
        const banner = document.getElementById('updateBanner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }

    function applyAppUpdate() {
        const url = new URL(window.location.href);
        url.searchParams.set('build', latestAvailableBuildId || Date.now().toString());
        window.location.href = url.toString();
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
            title: 'AVA',
            messages: [],
            category: null,
            process: null,
            macroproceso: null,
            state: 'welcome',
            createdAt: new Date().toISOString()
        };
    }

    function ensureChatSessionId(chat) {
        if (!chat) return '';
        if (!chat.sessionId) {
            chat.sessionId = generateSessionId();
            console.log('SessionId regenerado para chat:', chat.sessionId);
            saveChatsToStorage();
        }
        return chat.sessionId;
    }

    function createNewChat() {
        const chat = createBaseChat();
        currentChatId = chat.id;
        console.log('Nuevo chat:', currentChatId);

        chats.unshift(chat);
        saveChatsToStorage();
        renderChatsList();
        loadChat(currentChatId);
    }

    function goToMainWindow() {
        const chat = getCurrentChat();
        if (chat && chat.messages.length === 0 && chat.state === 'welcome') {
            loadChat(chat.id);
            return;
        }

        createNewChat();
    }

    function ensureActiveChat() {
        if (!currentChatId || !chats.some(chat => chat.id === currentChatId)) {
            createNewChat();
        }
        return getCurrentChat();
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
        chat.title = CATEGORY_NAMES[category];

        const welcomeContentByCategory = {
            capacitacion: `👋 ¡Hola! Bienvenida a "${CATEGORY_NAMES[category]}".\n\nPara empezar, escribe: "empecemos".`,
            consulta: `👋 ¡Hola! Aquí puedes resolver dudas sobre ISO 9001:2015.\n\nPara empezar, escribe tu consulta. Ejemplo: "¿Qué es una no conformidad?".`,
            default: `👋 Bienvenida al módulo "${CATEGORY_NAMES[category]}". Estoy lista para ayudarte.`
        };

        // Mensaje de bienvenida del bot
        const welcomeMessage = {
            role: 'assistant',
            content: welcomeContentByCategory[category] || welcomeContentByCategory.default,
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
    function selectProcess(subproceso, macroproceso) {
        const chat = getCurrentChat();
        if (!chat) return;

        chat.process = subproceso;
        chat.macroproceso = macroproceso;

        const userMessage = {
            role: 'user',
            content: `${macroproceso} → ${subproceso}`,
            timestamp: new Date().toISOString()
        };
        chat.messages.push(userMessage);
        renderMessages(chat);
        saveChatsToStorage();
        sendToN8N(subproceso, chat);
    }

    async function sendToN8N(message, chat) {
        if (!currentChatId) {
            createNewChat();
            chat = getCurrentChat();
            if (!chat) return;
        }

        const WEBHOOK_URL = getWebhookForCategory(chat.category);
        const sessionId = ensureChatSessionId(chat);

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
            const payload = {
                message: message,
                proceso: message,
                macroproceso: chat.macroproceso || '',
                subproceso: '',
                sessionId: sessionId,
                category: chat.category
            };

            console.log('Payload a n8n (selectProcess):', payload);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify(payload)
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            const botMessage = {
                role: 'assistant',
                content: extractAssistantReply(data),
                timestamp: new Date().toISOString()
            };
            chat.messages.push(botMessage);

        } catch (error) {
            console.error('Error:', error);
            chat.messages.push({
                role: 'assistant',
                content: buildUserFriendlyError(error),
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

        const chat = ensureActiveChat();
        if (!chat) return;
        const sessionId = ensureChatSessionId(chat);

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
        maybeUpdateChatTitleFromMessage(chat, message);
        
        input.value = '';
        adjustMessageInputHeight();
        renderMessages(chat);
        saveChatsToStorage();
        renderChatsList();

        // Mostrar indicador de escritura
        isSending = true;
        updateInputState();
        showTypingIndicator();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const payload = {
                message: message,
                proceso: chat.process || '',
                macroproceso: chat.macroproceso || '',
                subproceso: '',
                sessionId: sessionId,
                category: chat.category,
                esSeleccionProceso: false
            };

            console.log('Payload a n8n (sendMessage):', payload);

            // Enviar al webhook
            const response = await fetch(categoryWebhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal,
                body: JSON.stringify(payload)
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
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            sendMessage();
        }
    }

    function adjustMessageInputHeight() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        input.style.height = 'auto';
        input.style.height = `${input.scrollHeight}px`;
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
        if (message.role === 'user') {
            avatar.textContent = 'TÚ';
        } else {
            avatar.innerHTML = '<img src="./assets/images/icon-ava.png" alt="AVA">';
        }

        const body = document.createElement('div');
        body.className = 'message-body';

        const label = document.createElement('div');
        label.className = 'message-label';
        label.textContent = message.role === 'user' ? 'Usuario' : 'AVA';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = formatMessage(message.content);

        body.appendChild(label);
        body.appendChild(content);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(body);
        container.appendChild(messageDiv);
    }

    function renderProcessSelection() {
        const container = document.getElementById('messagesContainer');
        const existing = document.getElementById('processSelectionDiv');
        if (existing) existing.remove();

        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'process-selection';
        selectionDiv.id = 'processSelectionDiv';
        selectionDiv.innerHTML = `
            <div class="process-selection-title">📋 Selecciona el macroproceso:</div>
            <div class="process-buttons">
                ${Object.keys(PROCESOS).map((macro, i) => `
                    <button class="process-btn" onclick="selectMacroprocesoPorIndex(${i})">
                        ${macro}
                    </button>
                `).join('')}
            </div>
        `;
        container.appendChild(selectionDiv);
    }

    function selectMacroproceso(macro) {
        const selectionDiv = document.getElementById('processSelectionDiv');
        if (!selectionDiv) return;
        const subprocesos = PROCESOS[macro];

        selectionDiv.innerHTML = `
            <div class="process-selection-title">📋 Macroproceso: <strong>${macro}</strong><br>Selecciona el subproceso:</div>
            <div class="process-buttons">
                ${subprocesos.map((sub, i) => `
                    <button class="process-btn" onclick="selectProcessSafe(${i}, ${Object.keys(PROCESOS).indexOf(macro)})">
                        ${sub}
                    </button>
                `).join('')}
                <button class="process-btn process-btn-secondary" onclick="renderProcessSelection()">
                    ← Cambiar macroproceso
                </button>
            </div>
        `;
    }

    function selectProcessSafe(subIndex, macroIndex) {
        const macro = Object.keys(PROCESOS)[macroIndex];
        if (!macro) return;
        const subprocesos = PROCESOS[macro];
        if (!subprocesos || subIndex >= subprocesos.length) return;
        selectProcess(subprocesos[subIndex], macro);
    }

    function selectMacroprocesoPorIndex(index) {
        const macro = Object.keys(PROCESOS)[index];
        if (!macro) return;
        selectMacroproceso(macro);
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

    function showTypingIndicator() {
        const container = document.getElementById('messagesContainer');
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-avatar"><img src="./assets/images/icon-ava.png" alt="AVA"></div>
            <div class="message-body">
                <div class="message-label">AVA</div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
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

    function maybeUpdateChatTitleFromMessage(chat, userText) {
        if (!chat || !userText) return;

        const autogeneratedTitles = new Set(['Nuevo chat', 'AVA', ...Object.values(CATEGORY_NAMES)]);
        if (!autogeneratedTitles.has(chat.title)) return;

        const suggestedTitle = buildChatTitleFromUserText(userText);
        if (!suggestedTitle) return;

        chat.title = suggestedTitle;
    }

    function buildChatTitleFromUserText(userText) {
        const normalizedText = String(userText).replace(/\s+/g, ' ').trim();
        if (!normalizedText) return '';

        const sentences = normalizedText
            .split(/(?<=[.!?])\s+|\n+/)
            .map(sentence => sentence.trim())
            .filter(Boolean);

        const preferredSentence = sentences[1] || sentences[0] || normalizedText;
        const cleanedSentence = preferredSentence
            .replace(/^[¡¿"'\-\s]+/, '')
            .replace(/["'.,;:!?…\s]+$/, '');

        if (!cleanedSentence) return '';

        const words = cleanedSentence.split(' ').filter(Boolean);
        const titleByWords = words.slice(0, 8).join(' ');
        const croppedTitle = titleByWords.length > 52 ? `${titleByWords.slice(0, 52).trim()}…` : titleByWords;

        return croppedTitle || '';
    }

    function formatMessage(text) {
        const rawText = String(text ?? '');
        const codeBlocks = [];

        const textWithoutCodeBlocks = rawText.replace(/```([\s\S]*?)```/g, (_, code) => {
            const token = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
            return token;
        });

        let formatted = escapeHtml(textWithoutCodeBlocks)
            .replace(/^### (.+)$/gm, '<h3 class="msg-h3">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="msg-h2">$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            .replace(/(https?:\/\/[^\s<]+)/g, (url) => {
                const cleanUrl = url.replace(/[),.;]$/, '');
                const trailing = url.slice(cleanUrl.length);
                const isDocument = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(cleanUrl);
                const linkClass = isDocument ? ' class="doc-link"' : '';
                return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer"${linkClass}>${isDocument ? '📄 ' : ''}${cleanUrl}</a>${trailing}`;
            })
            .replace(/\n/g, '<br>');

        codeBlocks.forEach((block, index) => {
            formatted = formatted.replace(`__CODE_BLOCK_${index}__`, block);
        });

        return formatted;
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
        console.log('Respuesta cruda de N8N:', JSON.stringify(data));
        if (typeof data === 'string' && data.trim()) return data;
        if (data?.respuesta) return data.respuesta;
        if (data?.output) return data.output;
        if (data?.text) return data.text;
        if (data?.response) return data.response;
        if (data?.message?.content) return data.message.content;
        if (data?.message && typeof data.message === 'string') return data.message;
        if (Array.isArray(data) && data[0]?.respuesta) return data[0].respuesta;
        if (Array.isArray(data) && data[0]?.output) return data[0].output;
        return 'Lo siento, no pude procesar tu solicitud.';
    }

    function buildUserFriendlyError(error) {
        if (error?.name === 'AbortError') {
            return 'AVA está procesando una consulta compleja. Por favor intenta de nuevo en unos segundos.';
        }
        if (error?.message?.includes('HTTP 5')) {
            return 'El servidor tuvo un problema temporal. Por favor intenta de nuevo.';
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
                    sessionId: chat?.sessionId || generateSessionId(),
                    title: !chat?.title || chat.title === 'Nuevo chat' ? 'AVA' : chat.title,
                    macroproceso: chat?.macroproceso || null,
                    process: chat?.process || null,
                    state: chat?.state || 'welcome'
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

