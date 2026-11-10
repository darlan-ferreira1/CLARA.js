import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createBoyleScene, type BoyleReading, type BoyleScene } from './scene';
import { useHandCamera } from '../../../components/handInput/useHandCamera';
import { coverMapping, MIDDLE_MCP, mirrorX } from '../../../core/handTracking';

const PARTICLES = 140;
const DEFAULT_T = 4;

interface Props { theme: 'dark' | 'light'; }

export default function BoyleHandsSimulation({ theme }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<BoyleScene | null>(null);
  const camera = useHandCamera(videoRef, 2);
  const pointer = useRef<{ down: boolean; x: number }>({ down: false, x: 0 });

  const [reading, setReading] = useState<BoyleReading | null>(null);
  const [temperature, setTemperature] = useState(DEFAULT_T);
  const [handsSeen, setHandsSeen] = useState(0);

  const dark = theme === 'dark';
  const c = {
    text: dark ? '#e0e0f0' : '#1a1a2e',
    muted: dark ? '#9a9ac0' : '#555577',
    panelBg: dark ? '#111130' : '#e0e0ef',
    panelBorder: dark ? '#222244' : '#c0c0d8',
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Paredes do recipiente em pixels da tela: as duas mãos (centro da palma),
    // ou, sem câmera, o mouse arrastando (largura = 2 × distância ao centro).
    function readWalls(): { left: number; right: number } | null {
      const video = videoRef.current;
      const area = areaRef.current;
      if (!area) return null;
      const w = area.clientWidth, h = area.clientHeight;
      const hands = camera.readHands();
      setHandsSeen(hands.length);
      if (hands.length === 2 && video?.videoWidth) {
        const toScreen = coverMapping(video.videoWidth, video.videoHeight, w, h);
        const [a, b] = hands.map((hand) => toScreen(mirrorX(hand[MIDDLE_MCP].x), hand[MIDDLE_MCP].y).x);
        return { left: Math.min(a, b), right: Math.max(a, b) };
      }
      if (pointer.current.down) {
        const half = Math.abs(pointer.current.x - w / 2);
        return { left: w / 2 - half, right: w / 2 + half };
      }
      return null; // mantém a última posição
    }

    const scene = createBoyleScene(canvas, { readWalls, particles: PARTICLES, temperature: DEFAULT_T });
    scene.onReading = setReading;
    sceneRef.current = scene;
    return () => { scene.dispose(); sceneRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointer(e: PointerEvent<HTMLDivElement>, down?: boolean) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (down !== undefined) {
      pointer.current.down = down;
      if (down) e.currentTarget.setPointerCapture(e.pointerId);
    }
    pointer.current.x = e.clientX - rect.left;
  }

  function changeTemperature(t: number) {
    setTemperature(t);
    sceneRef.current?.setTemperature(t);
  }

  const noCamera = camera.ready && (camera.cameraError || camera.trackerError);
  const hint = !camera.ready
    ? 'Carregando câmera e modelo de rastreamento de mãos…'
    : noCamera
      ? `${camera.cameraError ? 'Câmera indisponível' : 'Rastreamento de mãos indisponível'} — clique e arraste para os lados para abrir ou fechar o recipiente.`
      : handsSeen < 2
        ? `Mostre as DUAS mãos para a câmera, palmas abertas (${handsSeen}/2 detectadas).`
        : 'Aproxime as mãos para comprimir o gás; afaste para expandir.';

  const fmt = (v: number | undefined, d = 1) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020408', color: c.text, fontFamily: 'Inter, sans-serif' }}>
      <div
        ref={areaRef}
        style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden', touchAction: 'none', cursor: noCamera ? 'ew-resize' : 'default' }}
        onPointerDown={(e) => onPointer(e, true)}
        onPointerMove={(e) => onPointer(e)}
        onPointerUp={(e) => onPointer(e, false)}
        onPointerCancel={(e) => onPointer(e, false)}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: 'scaleX(-1)', opacity: camera.cameraError ? 0 : 0.55, pointerEvents: 'none',
          }}
        />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

        <div style={{ position: 'absolute', top: 16, left: 20, pointerEvents: 'none', textShadow: '0 1px 4px rgba(0,0,0,0.8)', color: '#e0e0f0' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#3498db' }}>Lei de Boyle</span>
          <div style={{ fontSize: 13, marginTop: 2, maxWidth: 'min(70vw, 520px)' }}>{hint}</div>
        </div>
      </div>

      <div style={{
        padding: '12px 20px 16px', background: c.panelBg, borderTop: `1px solid ${c.panelBorder}`,
        display: 'flex', flexWrap: 'wrap', gap: '10px 28px', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: c.muted, letterSpacing: 1 }}>
            TEMPERATURA T: {temperature.toFixed(1)} u.a. (constante)
          </label>
          <input
            type="range" min={1} max={10} step={0.5} value={temperature}
            onChange={(e) => changeTemperature(Number(e.target.value))}
            style={{ width: 160 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '4px 20px', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", flex: 1, minWidth: 260 }}>
          <span>V = <strong>{fmt(reading?.volume, 2)}</strong></span>
          <span>P = <strong style={{ color: '#5dade2' }}>{fmt(reading?.pressure, 0)}</strong></span>
          <span>P·V = <strong style={{ color: '#2ecc71' }}>{fmt(reading?.product, 0)}</strong></span>
          <span style={{ color: c.muted }}>N·T = {fmt(PARTICLES * temperature, 0)}</span>
        </div>

        <button
          onClick={() => sceneRef.current?.clearGraph()}
          style={{
            background: dark ? '#1a1a3a' : '#f8f8ff', color: c.text, border: `1px solid ${dark ? '#333366' : '#9999cc'}`,
            borderRadius: 999, padding: '5px 12px', fontSize: 13, cursor: 'pointer',
          }}
        >
          Limpar gráfico
        </button>
        <div style={{ width: '100%', fontSize: 12, color: c.muted }}>
          Com a temperatura constante, <strong>P·V</strong> fica (quase) igual a <strong>N·T</strong> não importa o volume — é a Lei de Boyle.
          Os pontos azuis do gráfico seguem a curva tracejada (isoterma). Unidades arbitrárias (u.a.).
        </div>
      </div>
    </div>
  );
}
