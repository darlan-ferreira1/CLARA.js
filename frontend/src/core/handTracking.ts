// Rastreamento de mãos com MediaPipe — módulo COMUM a todos os experimentos
// que usam a webcam (antes ficava preso à Dissecação, em gestures.ts).
//
// Devolve os 21 pontos (landmarks) de cada mão em coordenadas NORMALIZADAS DA
// IMAGEM CRUA da câmera: x e y em [0, 1], sem espelhamento. Cada experimento
// decide o que fazer com eles (pinça, posição do punho, distância entre mãos…).
//
// Pontos mais usados (índices do MediaPipe Hands):
//   0 = punho · 4 = ponta do polegar · 8 = ponta do indicador
//   9 = articulação da base do dedo médio (centro aproximado da palma)

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Motor (WASM) e modelo servidos pelo próprio site, não por CDN: assim o
// rastreamento funciona offline (service worker, app de desktop, APK).
// Os arquivos são copiados para public/mediapipe/ por
// scripts/mediapipe-assets.mjs antes do dev/build, então a versão do WASM é
// sempre a do pacote @mediapipe/tasks-vision instalado.
const MEDIAPIPE_BASE = `${import.meta.env.BASE_URL}mediapipe`;
const WASM_BASE = `${MEDIAPIPE_BASE}/wasm`;
const MODEL_URL = `${MEDIAPIPE_BASE}/hand_landmarker.task`;

export interface Landmark { x: number; y: number; z: number; }
export type Hand = Landmark[];

export const WRIST = 0;
export const THUMB_TIP = 4;
export const INDEX_TIP = 8;
export const MIDDLE_MCP = 9;

export interface HandLandmarkTracker {
  detect(video: HTMLVideoElement, timestampMs: number): Hand[];
  dispose(): void;
}

export async function createHandLandmarkTracker(numHands = 1): Promise<HandLandmarkTracker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands,
  });
  return {
    detect(video, timestampMs) {
      return landmarker.detectForVideo(video, timestampMs).landmarks as Hand[];
    },
    dispose() {
      landmarker.close();
    },
  };
}

// ── Utilitários puros ──

// A webcam é exibida como selfie (espelhada); para o gesto bater com o que o
// usuário vê, a coordenada x precisa ser espelhada também.
export function mirrorX(x: number): number {
  return 1 - x;
}

// Tamanho da palma (punho → base do dedo médio) em pixels da imagem. Serve de
// "régua": uma palma adulta mede ~9,5 cm, então dá para converter pixels em metros.
export function palmSpanPx(hand: Hand, videoWidth: number, videoHeight: number): number {
  const a = hand[WRIST], b = hand[MIDDLE_MCP];
  return Math.hypot((a.x - b.x) * videoWidth, (a.y - b.y) * videoHeight);
}

// Mapeamento imagem → tela quando o <video> usa `object-fit: cover` (a imagem
// é ampliada até cobrir a área e as sobras são cortadas). Sem isso, pontos
// desenhados por cima do vídeo ficam desalinhados da mão (débito D16).
// Recebe e devolve x já espelhado ou não — o mapeamento é o mesmo.
export function coverMapping(videoW: number, videoH: number, boxW: number, boxH: number) {
  const scale = Math.max(boxW / videoW, boxH / videoH);
  const drawnW = videoW * scale, drawnH = videoH * scale;
  const offsetX = (boxW - drawnW) / 2, offsetY = (boxH - drawnH) / 2;
  return (nx: number, ny: number) => ({ x: offsetX + nx * drawnW, y: offsetY + ny * drawnH });
}
