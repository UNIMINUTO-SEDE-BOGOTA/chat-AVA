
# 🤖 AVA - AI Assistant
AVA es una interfaz de chat inteligente, moderna y de alto rendimiento, diseñada para ofrecer una experiencia de usuario fluida y reactiva. Construida sobre el ecosistema de Vite y con la seguridad tipada de TypeScript, AVA permite una interacción natural con modelos de Inteligencia Artificial.

## ✨ Características Principales
⚡ Arquitectura Ultra-rápida: Desarrollado con Vite para un tiempo de carga y un HMR (Hot Module Replacement) casi instantáneos.

### 🔷 TypeScript Nativo:
Código robusto, mantenible y con tipado estricto para reducir errores en tiempo de ejecución.

### 📱 Diseño Responsivo:
Interfaz optimizada para escritorio, tablets y dispositivos móviles.

### 🎨 UI Moderna:
Estética minimalista centrada en la legibilidad y la experiencia de usuario.

### 🚀 Escalable:
Estructura de carpetas modular lista para integrar múltiples proveedores de IA.

### 🛠️ Stack Tecnológico
Frontend: React.js (o el framework que estés usando, ej. Vue/Svelte).

Herramienta de Construcción: Vite.

### Lenguaje:
TypeScript.

Estilos: [Tailwind CSS / Styled Components] (ajustar según tu elección).

Iconografía: Lucide React / FontAwesome.

## 📦 Instalación y Configuración
Sigue estos pasos para ejecutar el proyecto localmente:

1. Clonar el repositorio

Bash

git clone

cd ava-ai-chat

2. Instalar dependencias

Bash

npm install

# o

yarn install

3. Variables de entorno
   
Crea un archivo .env en la raíz del proyecto para tus claves de API:

Fragmento de código

VITE_AI_API_KEY=clave de supabase

VITE_API_URL=https://api.de.supabase.com

4. Ejecutar en modo desarrollo
   
Bash

npm run dev

## 🏗️ Estructura del Proyecto

Plaintext

src/

├── assets/       # Imágenes y recursos estáticos

├── components/   # Componentes reutilizables (Chat, Message, Input)

├── hooks/        # Lógica de estados y llamadas a la API

├── services/     # Configuración de clientes de IA (OpenAI, Anthropic, etc.)

├── types/        # Definiciones de interfaces TypeScript

└── App.tsx       # Punto de entrada principal

## 🚀 Scripts Disponibles

npm run dev: 
Inicia el servidor de desarrollo.

npm run build: 
Compila la aplicación para producción en la carpeta dist/.

npm run preview: 
Permite previsualizar la versión de producción localmente.

npm run lint: 
Ejecuta el linter para asegurar la calidad del código.

## 🛡️ Seguridad y Buenas Prácticas

AVA está diseñado siguiendo los estándares de:

Sanitización de entradas: Prevención de ataques XSS en los mensajes del chat.

Variables de entorno: Uso estricto de VITE_ para proteger datos sensibles en el cliente.

Manejo de errores: Feedback visual al usuario ante fallos de conexión o cuotas de API agotadas.
