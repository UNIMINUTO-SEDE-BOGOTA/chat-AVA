// ============================================================
// models/chat.ts
// Tipos compartidos por toda la aplicación.
// ============================================================

export type ChatRole = 'user' | 'assistant';
export type ChatState = 'welcome' | 'category_selected' | 'process_selected' | 'chatting';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  /** Id del servicio al que pertenece este chat */
  serviceId: string | null;
  /** Categoría interna del servicio (ej: 'capacitacion', 'simulador') */
  category: string | null;
  process: string | null;
  macroproceso: string | null;
  state: ChatState;
  createdAt: string;
  isAutoFallback?: boolean;
}