import { defineConfig, devices } from '@playwright/test';

// Testes de ponta a ponta (tests/e2e): abrem o site de produção em um Chromium
// de verdade. Como rodar está em tests/README.md.
const BASE_URL = 'https://localhost:4173/CLARA.js/';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/resultados/artefatos',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  // Sem placa de vídeo o 3D é desenhado pelo processador; poucos em paralelo.
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './tests/resultados/relatorio', open: 'never' }],
    ['json', { outputFile: './tests/resultados/resultado.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true, // o certificado local é autoassinado
    serviceWorkers: 'block', // cada teste começa sem nada guardado no aparelho
    permissions: ['camera'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: [
        '--enable-unsafe-swiftshader', // WebGL por software, sem GPU
        '--ignore-gpu-blocklist',
        '--use-fake-ui-for-media-stream',     // aceita a câmera sem perguntar
        '--use-fake-device-for-media-stream', // câmera falsa do Chromium
      ],
    },
  },
  projects: [
    { name: 'computador', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: BASE_URL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
