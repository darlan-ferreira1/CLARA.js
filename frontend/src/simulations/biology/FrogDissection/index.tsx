import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createDissectionScene, ORGAN_DEFS, type DissectionScene } from './scene';
import { createHandTracker, type HandTracker, type PinchState } from './gestures';

interface PointerState {
  down: boolean;
  x: number;
  y: number;
}

export default function FrogDissectionSimulation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<DissectionScene | null>(null);
  const pointerRef = useRef<PointerState>({ down: false, x: 0, y: 0 });

  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [trackerError, setTrackerError] = useState(false);
  const [opened, setOpened] = useState(false);
  const [extracted, setExtracted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = createDissectionScene(container);
    sceneRef.current = scene;
    scene.onOpenChange = (open) => setOpened(open);
    scene.onExtract = (id) => setExtracted((prev) => new Set(prev).add(id));

    let raf = 0;
    let tracker: HandTracker | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const pointer = pointerRef.current;

      if (pointer.down) {
        const rect = container.getBoundingClientRect();
        scene.updatePinch({
          tracking: true,
          pinching: true,
          x: (pointer.x / rect.width) * 2 - 1,
          y: -((pointer.y / rect.height) * 2 - 1),
        });
        return;
      }

      const video = videoRef.current;
      let state: PinchState = { tracking: false, pinching: false, x: 0, y: 0 };
      if (tracker && video && video.readyState >= 2) {
        state = tracker.detect(video, performance.now());
      }
      scene.updatePinch(state);
    };

    const init = async () => {
      try {
        tracker = await createHandTracker();
      } catch (err) {
        console.warn('[webcam] rastreador de mãos falhou:', err);
        setTrackerError(true);
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
        setCameraError(true);
      }

      if (!cancelled) setReady(true);
      loop();
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      tracker?.dispose();
      stream?.getTracks().forEach((t) => t.stop());
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  function handleReset() {
    sceneRef.current?.reset();
    setExtracted(new Set());
    setOpened(false);
  }

  function pointerFromEvent(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020d06', color: '#e0e0f0', fontFamily: 'Inter, sans-serif' }}>

      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden', cursor: 'crosshair', touchAction: 'none' }}
        onPointerDown={(e) => { const p = pointerFromEvent(e); pointerRef.current = { down: true, x: p.x, y: p.y }; }}
        onPointerMove={(e) => { if (!pointerRef.current.down) return; const p = pointerFromEvent(e); pointerRef.current = { down: true, x: p.x, y: p.y }; }}
        onPointerUp={() => { pointerRef.current = { ...pointerRef.current, down: false }; }}
        onPointerLeave={() => { pointerRef.current = { ...pointerRef.current, down: false }; }}
      >
        {/* Vídeo da webcam — espelhado, fica atrás do canvas transparente */}
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', transform: 'scaleX(-1)', zIndex: 0,
            background: '#020d06',
          }}
        />

        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71',
          borderRadius: 6, padding: '4px 12px', fontSize: 11,
          letterSpacing: '0.15em', color: '#2ecc71',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          MediaPipe Hands · Dissecação Guiada
        </div>

        <div style={{ position: 'absolute', top: 16, left: 20, pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#2ecc71', lineHeight: 1 }}>Dissecação</span>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>
            Sapo · {extracted.size}/{ORGAN_DEFS.length} órgãos extraídos
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          background: 'rgba(2,13,6,0.75)', border: '1px solid #1a3322',
          borderRadius: 8, padding: '8px 18px', fontSize: 12, color: '#446644',
          backdropFilter: 'blur(4px)', textAlign: 'center', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {!opened
            ? 'Feche a pinça (polegar + indicador) sobre a linha no dorso do sapo para abrir'
            : 'Pinça sobre um órgão e arraste até a bandeja à direita para extrair'}
        </div>

        {(cameraError || trackerError) && (
          <div style={{
            position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
            background: 'rgba(120,40,20,0.85)', border: '1px solid #a04020',
            borderRadius: 8, padding: '6px 16px', fontSize: 12, color: '#ffd8c0',
            textAlign: 'center', maxWidth: 420,
          }}>
            {cameraError && trackerError && 'Câmera e rastreamento de mão indisponíveis — use o mouse: clique e arraste para pinçar.'}
            {cameraError && !trackerError && 'Câmera indisponível — use o mouse: clique e arraste para pinçar.'}
            {!cameraError && trackerError && 'Rastreamento de mão indisponível — use o mouse: clique e arraste para pinçar.'}
          </div>
        )}

        {!ready && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 5, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#446644', fontSize: 13,
            background: '#020d06',
          }}>
            Carregando câmera e modelo de rastreamento de mão…
          </div>
        )}
      </div>

      {/* Painel de controles */}
      <div style={{
        padding: '14px 24px', background: '#040f06',
        borderTop: '1px solid #0d2212',
        display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {ORGAN_DEFS.map((organ) => {
            const done = extracted.has(organ.id);
            return (
              <div key={organ.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: done ? 1 : 0.6 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: `#${organ.color.toString(16).padStart(6, '0')}`,
                }} />
                <span style={{ color: done ? '#e0e0f0' : '#446644' }}>
                  {organ.name}{done ? ' ✓' : ''}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleReset}
          style={{
            marginLeft: 'auto',
            background: 'rgba(46,204,113,0.12)', border: '1px solid #2ecc71',
            borderRadius: 8, color: '#2ecc71', fontSize: 13,
            padding: '6px 16px', cursor: 'pointer',
          }}
        >
          Reiniciar dissecação
        </button>
      </div>
    </div>
  );
}
