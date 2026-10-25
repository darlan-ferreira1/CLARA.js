// Funcionamento offline: registra o service worker gerado pelo vite-plugin-pwa
// (configuração em vite.config.ts). No primeiro acesso ele guarda o site
// inteiro no aparelho — inclusive o motor e o modelo do MediaPipe — e, nos
// acessos seguintes, serve tudo dali, com ou sem internet. Quando sai uma
// versão nova do site, ele baixa a nova em segundo plano e troca o cache.
//
// No app de desktop (Tauri) o plugin fica desligado: os arquivos já estão
// dentro do executável, e o módulo virtual abaixo vira uma função vazia.
import { registerSW } from 'virtual:pwa-register';

export function registerOffline(): void {
  // Em desenvolvimento (npm run dev) não há service worker, para não servir
  // arquivos velhos do cache enquanto o código muda.
  if (!import.meta.env.PROD) return;
  registerSW({ immediate: true });
}
