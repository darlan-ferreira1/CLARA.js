import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// O Tauri define TAURI_ENV_PLATFORM ao rodar `npm run dev`/`build` por ele
// (`npm run tauri dev` / `npm run tauri build`). Sem ela, é o site normal.
const tauri = !!process.env.TAURI_ENV_PLATFORM
// No `tauri android dev`, o celular acessa o Vite pelo IP da rede.
const tauriDevHost = process.env.TAURI_DEV_HOST

export default defineConfig({
  // GitHub Pages publica em /CLARA.js/; o app nativo serve os arquivos na raiz.
  base: tauri ? '/' : '/CLARA.js/',
  plugins: [
    react(),
    tailwindcss(),
    // O HTTPS autoassinado só é necessário no navegador (câmera/WebXR exigem
    // contexto seguro). O WebView do Tauri recusaria o certificado, e
    // http://localhost já é contexto seguro.
    ...(tauri ? [] : [basicSsl()]),
    // PWA: manifesto (site instalável) + service worker que guarda TODO o
    // build no aparelho no primeiro acesso, inclusive o MediaPipe (~31 MB),
    // para o site e o APK (TWA) funcionarem offline. No app de desktop não
    // precisa: os arquivos já vêm dentro do executável.
    VitePWA({
      disable: tauri,
      registerType: 'autoUpdate',
      // O registro é feito por src/core/offline.ts.
      injectRegister: false,
      manifest: {
        name: 'CLARA.js — Laboratórios virtuais de Ciências',
        short_name: 'CLARA.js',
        description:
          'Experimentos interativos de Física, Química e Biologia para o ensino médio, com 3D, realidade aumentada, realidade virtual e gestos pela webcam.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0a0a1a',
        theme_color: '#0a0a1a',
        categories: ['education'],
        icons: [
          { src: 'icons/192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tudo o que o site usa: código, estilos, fontes, ícones, WASM e o
        // modelo da mão (.task).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,task}'],
        // O padrão do Workbox é 2 MB por arquivo; o WASM do MediaPipe tem ~12 MB.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        // Roteamento por hash: toda navegação cai no index.html guardado.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // Não limpar o terminal, para os erros do Rust continuarem visíveis.
  clearScreen: !tauri,
  server: {
    // O Tauri espera a porta exata do devUrl (tauri.conf.json).
    strictPort: tauri,
    host: tauriDevHost || undefined,
    hmr: tauriDevHost ? { protocol: 'ws', host: tauriDevHost, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
