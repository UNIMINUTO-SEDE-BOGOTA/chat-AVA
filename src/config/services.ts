// ============================================================
// config/services.ts
// Registro central de servicios. Para agregar un nuevo chat,
// solo añade una entrada aquí.
// ============================================================

export interface ServiceWebhooks {
  [key: string]: string;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  webhooks: ServiceWebhooks;
  defaultWebhookKey: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export const SERVICES: Record<string, ServiceDefinition> = {
  ava: {
    id: 'ava',
    name: 'AVA - Agente Virtual de Auditoría',
    shortName: 'AVA',
    icon: '🧠',
    description: 'Capacitación SGC, consultas ISO 9001 y simulador de auditorías',
    webhooks: {
      capacitacion: import.meta.env.VITE_WEBHOOK_AVA_CAPACITACION ?? '',
      consulta:     import.meta.env.VITE_WEBHOOK_AVA_CONSULTA     ?? '',
      simulador:    import.meta.env.VITE_WEBHOOK_AVA_SIMULADOR    ?? '',
      gestion:      import.meta.env.VITE_WEBHOOK_AVA_GESTION      ?? '',
    },
    defaultWebhookKey: 'capacitacion',
    enabled: true,
  },

  // ── Plantilla para el próximo servicio ──────────────────────
  // nuevoServicio: {
  //   id: 'nuevoServicio',
  //   name: 'Nombre completo del servicio',
  //   shortName: 'Corto',
  //   icon: '💬',
  //   description: 'Descripción breve que aparece en la card',
  //   webhooks: {
  //     default: 'https://TU_URL/webhook/ID',
  //   },
  //   defaultWebhookKey: 'default',
  //   enabled: false,
  //   comingSoon: true,
  // },
};

// Orden en que se muestran las cards en el welcome screen
export const SERVICE_ORDER: string[] = ['ava'];