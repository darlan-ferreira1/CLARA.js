// Gancho React que liga a webcam e o rastreador de mãos (core/handTracking.ts).
//
// Uso:
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const hands = useHandCamera(videoRef, 2);
//   ... a cada quadro: const lista = hands.readHands();   // Hand[] (pode ser [])
//
// `readHands` só roda a rede neural quando chega um quadro NOVO da câmera
// (compara `video.currentTime`); entre quadros devolve o último resultado.
// A tela costuma desenhar a 60 Hz e a webcam entrega ~30 Hz, então isso corta
// pela metade o custo da inferência.
//
// Se a câmera ou o modelo falharem, `cameraError`/`trackerError` ficam true e
// o experimento deve oferecer o mouse como alternativa (mesma ideia da Dissecação).

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createHandLandmarkTracker, type Hand, type HandLandmarkTracker } from '../../core/handTracking';

export interface HandCamera {
  ready: boolean;        // câmera e modelo terminaram de carregar (com ou sem erro)
  cameraError: boolean;
  trackerError: boolean;
  readHands(): Hand[];
}

export function useHandCamera(videoRef: RefObject<HTMLVideoElement | null>, numHands: number): HandCamera {
  const trackerRef = useRef<HandLandmarkTracker | null>(null);
  const lastFrame = useRef({ time: -1, hands: [] as Hand[] });
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [trackerError, setTrackerError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        const tracker = await createHandLandmarkTracker(numHands);
        if (cancelled) tracker.dispose();
        else trackerRef.current = tracker;
      } catch (err) {
        console.warn('[webcam] rastreador de mãos falhou:', err);
        if (!cancelled) setTrackerError(true);
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch (err) {
        console.warn('[webcam] câmera falhou:', err);
        if (!cancelled) setCameraError(true);
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      trackerRef.current?.dispose();
      trackerRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [videoRef, numHands]);

  const readHands = useCallback((): Hand[] => {
    const video = videoRef.current;
    const tracker = trackerRef.current;
    if (!video || !tracker || video.readyState < 2) return [];
    if (video.currentTime !== lastFrame.current.time) {
      lastFrame.current = { time: video.currentTime, hands: tracker.detect(video, performance.now()) };
    }
    return lastFrame.current.hands;
  }, [videoRef]);

  return { ready, cameraError, trackerError, readHands };
}
