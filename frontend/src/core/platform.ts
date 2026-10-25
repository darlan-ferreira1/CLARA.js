// Onde o CLARA.js está rodando. O código dos experimentos não depende disso:
// só a interface usa, para não oferecer o que a plataforma não tem.

// App de desktop (Tauri): o Tauri injeta este objeto em toda página que abre.
// No WebView do app não existe WebXR, então RA e RV imersiva ficam só no site.
export const isNativeApp = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Endereço da página de downloads (GitHub Releases), usado pelo site.
export const DOWNLOADS_URL = 'https://github.com/darlan-ferreira1/CLARA.js/releases/latest';
