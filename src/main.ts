// ============================================================
// main.ts
// ============================================================

import './styles/base.css';
import './styles/layout.css';
import './styles/messages.css';
import './styles/components.css';
import './styles/features.css';
import './styles/splash.css';

import { App } from './app';
import { initThemeToggle } from './components/ThemeToggle';
import { initMobileSidebar } from './components/MobileSidebar';
import { initTour } from './components/Tour';
import { initSplash } from './components/Splash';

const app = new App();
app.init();

initThemeToggle();
initMobileSidebar();

// Tour y splash se coordinan: el tour arranca cuando el splash termina
initSplash(() => {
  initTour();
});

(window as unknown as Record<string, unknown>).app = app;