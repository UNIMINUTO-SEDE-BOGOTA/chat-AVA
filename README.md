# AVA Chat Secure Edition

Interfaz de chat para AVA (Agente Virtual de Auditoría) con almacenamiento local por conversación, categorías, simulador de procesos y soporte de tema claro/oscuro.

## Estructura del proyecto

- `index.html` → entrada principal
- `assets/css/main.css` → estilos de la interfaz
- `assets/js/app.js` → lógica del chat y estado local
- `server.js` → servidor Express para local/Azure
- `.github/workflows/azure-webapp.yml` → CI/CD a Azure App Service

## Funcionalidades

- Múltiples chats con persistencia en `localStorage`
- Eliminación de chats con confirmación + opción de deshacer
- Selección de categorías y subprocesos de auditoría
- Tema claro/oscuro persistente
- Integración con webhook configurable

## Configuración rápida

1. Abre `assets/js/app.js`.
2. Configura los 4 webhooks en `CATEGORY_WEBHOOKS` (uno por categoría):
	- `capacitacion`
	- `consulta`
	- `simulador`
	- `gestion`
3. Instala dependencias:
	```bash
	npm install
	```
4. Inicia el servidor local:
	```bash
	npm start
	```
5. Abre `http://localhost:8080`.

## Integración n8n por categoría

Cada chat usa un workflow independiente de n8n según la categoría seleccionada.

### Mapeo frontend → workflow n8n

En `assets/js/app.js`:

```js
const CATEGORY_WEBHOOKS = {
	capacitacion: 'https://TU_N8N_URL/webhook/CAPACITACION_ID',
	consulta: 'https://TU_N8N_URL/webhook/CONSULTA_ID',
	simulador: 'https://TU_N8N_URL/webhook/SIMULADOR_ID',
	gestion: 'https://TU_N8N_URL/webhook/GESTION_ID'
};
```

### Flujo recomendado en cada workflow

1. **Webhook** (POST)
2. **AI Agent / LLM** (el agente específico de esa categoría)
3. **Respond to Webhook** con JSON

### Payload que envía el frontend

```json
{
	"message": "texto del usuario",
	"proceso": "Docencia",
	"subproceso": "",
	"sessionId": "id-del-chat",
	"category": "simulador"
}
```

### Formato de respuesta esperado

El frontend acepta cualquiera de estos:

```json
{ "respuesta": "Texto" }
```

```json
{ "message": { "content": "Texto" } }
```

```json
{ "message": "Texto" }
```

Si no coincide, mostrará un mensaje genérico de fallback.

## Despliegue en GitHub privado + Azure App Service

### 1) Repositorio GitHub privado

1. Crea un repositorio privado en GitHub.
2. Sube este proyecto completo (incluyendo `.github/workflows/azure-webapp.yml`).

### 2) Crear Azure App Service (Linux, Node 20)

1. Crea un `App Service` en Azure.
2. Runtime stack: **Node 20 LTS**.
3. Habilita **Always On** en `Configuration > General settings`.

### 3) Configurar secretos en GitHub

En `GitHub > Settings > Secrets and variables > Actions`, agrega:

- `AZURE_WEBAPP_NAME` → nombre exacto del App Service.
- `AZURE_WEBAPP_PUBLISH_PROFILE` → contenido del Publish Profile descargado desde Azure.

### 4) Deploy automático

Cada push a la rama `main` ejecuta el workflow y publica en Azure automáticamente.

### 5) Variable de entorno recomendada en Azure

En `App Service > Configuration > Application settings`, define:

- `WEBSITE_NODE_DEFAULT_VERSION` = `~20`

## Notas

- El historial se guarda localmente con la clave `ava_chats`.
- El tema se guarda con la clave `ava_theme`.
- Endpoint de salud disponible en `/health`.
