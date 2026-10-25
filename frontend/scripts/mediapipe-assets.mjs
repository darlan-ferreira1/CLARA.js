// Copia para public/mediapipe/ os arquivos que o MediaPipe precisa em tempo de
// execução, para o rastreamento de mãos funcionar SEM INTERNET (site com
// service worker, app de desktop e APK):
//   - wasm/: o motor (WebAssembly), copiado de node_modules, então a versão
//     é sempre a mesma do pacote @mediapipe/tasks-vision instalado;
//   - hand_landmarker.task: o modelo da mão, baixado uma vez do Google e
//     guardado (só baixa de novo se o arquivo sumir).
// Roda sozinho antes de `npm run dev` e `npm run build` (predev/prebuild).
// A pasta public/mediapipe/ é gerada: está no .gitignore.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'mediapipe');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmOut = join(out, 'wasm');

// Só as variantes que o FilesetResolver.forVisionTasks() carrega: com SIMD
// (navegadores atuais) e sem SIMD (antigos). A variante "module" não é usada.
const WASM_FILES = [
  'vision_wasm_internal.js', 'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm',
];
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const modelOut = join(out, 'hand_landmarker.task');

mkdirSync(wasmOut, { recursive: true });
const available = new Set(readdirSync(wasmSrc));
for (const f of WASM_FILES) {
  if (!available.has(f)) throw new Error(`MediaPipe: ${f} não encontrado em ${wasmSrc}`);
  copyFileSync(join(wasmSrc, f), join(wasmOut, f));
}

if (!existsSync(modelOut)) {
  console.log('MediaPipe: baixando o modelo da mão (só na primeira vez)…');
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`MediaPipe: falha ao baixar o modelo (${res.status})`);
  writeFileSync(modelOut, Buffer.from(await res.arrayBuffer()));
}
console.log('MediaPipe: arquivos prontos em public/mediapipe/');
