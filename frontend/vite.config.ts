import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// O Tauri define TAURI_ENV_PLATFORM ao rodar `npm run dev`/`build` por ele
// (`npm run tauri dev` / `npm run tauri build`). Sem ela, é o site normal.
const tauri = !!process.env.TAURI_ENV_PLATFORM
// No `tauri android dev`, o celular acessa o Vite pelo IP da rede.
const tauriDevHost = process.env.TAURI_DEV_HOST

export default defineConfig({
  // GitHub Pages publica em /TCC/; o app nativo serve os arquivos na raiz.
  base: tauri ? '/' : '/TCC/',
  // O HTTPS autoassinado só é necessário no navegador (câmera/WebXR exigem
  // contexto seguro). O WebView do Tauri recusaria o certificado, e
  // http://localhost já é contexto seguro.
  plugins: [react(), tailwindcss(), ...(tauri ? [] : [basicSsl()])],
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
