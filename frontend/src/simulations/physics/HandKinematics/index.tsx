import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createKinematicsScene, type ChallengeStatus, type KinematicsScene } from './scene';
import { CHALLENGES, metersPerPixel, type KinematicPoint } from './physics';
import { useHandCamera } from '../../../components/handInput/useHandCamera';
import { MIDDLE_MCP, mirrorX, palmSpanPx } from '../../../core/handTracking';

const CALIBRATION_SAMPLES = 20;  // ~0,7 s de mão parada
const MOUSE_SPAN_M = 0.6;        // sem câmera, a largura da área = 60 cm

interface Props { theme: 'dark' | 'light'; }

export default function HandKinematicsSimulation({ theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<KinematicsScene | null>(null);
  const camera = useHandCamera(videoRef, 1);

  // Calibração pixels → metros (ver physics.ts) e mouse como alternativa.
  const spans = useRef<number[]>([]);
  const mpp = useRef<number | null>(null);
  const pointer = useRef<{ down: boolean; x: number }>({ down: false, x: 0 });

  const [status, setStatus] = useState<ChallengeStatus>({ phase: 'idle' });
  const [reading, setReading] = useState<KinematicPoint | null>(null);
  const [calibrated, setCalibrated] = useState(false);
  const [handSeen, setHandSeen] = useState(false);

  const dark = theme === 'dark';
  const c = {
    bg: dark ? '#0a0a1a' : '#f0f0f8',
    text: dark ? '#e0e0f0' : '#1a1a2e',
    muted: dark ? '#9a9ac0' : '#555577',
    panelBg: dark ? '#111130' : '#e0e0ef',
    panelBorder: dark ? '#222244' : '#c0c0d8',
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Posição atual em metros: mão (calibrada) > mouse pressionado > nada.
    function readPosition(): number | null {
      const video = videoRef.current;
      const hand = camera.readHands()[0];
      if (hand && video) {
        if (mpp.current === null) {
          spans.current.push(palmSpanPx(hand, video.videoWidth, video.videoHeight));
          if (spans.current.length >= CALIBRATION_SAMPLES) {
            mpp.current = metersPerPixel(spans.current);
            setCalibrated(true);
          }
          setHandSeen(true);
          return null;
        }
        // centro da palma, espelhado (direita do aluno = +x), relativo ao centro da imagem
        return (mirrorX(hand[MIDDLE_MCP].x) - 0.5) * video.videoWidth * mpp.current;
      }
      if (pointer.current.down) return (pointer.current.x - 0.5) * MOUSE_SPAN_M;
      return null;
    }

    const scene = createKinematicsScene(canvas, {
      readPosition,
      colors: {
        bg: c.bg, text: c.muted,
        grid: dark ? '#1c1c3a' : '#d8d8ea',
        axis: dark ? '#44446a' : '#9090b8',
        x: '#9b59b6', v: '#3498db', target: '#f39c12',
      },
    });
    scene.onStatus = setStatus;
    scene.onReading = setReading;
    sceneRef.current = scene;
    return () => { scene.dispose(); sceneRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  function recalibrate() {
    spans.current = [];
    mpp.current = null;
    setCalibrated(false);
    sceneRef.current?.clear();
  }

  function onPointer(e: PointerEvent<HTMLDivElement>, down?: boolean) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (down !== undefined) {
      pointer.current.down = down;
      if (down) e.currentTarget.setPointerCapture(e.pointerId);
    }
    pointer.current.x = (e.clientX - rect.left) / rect.width;
  }

  const noCamera = camera.ready && (camera.cameraError || camera.trackerError);
  const hint = !camera.ready
    ? 'Carregando câmera e modelo de rastreamento de mão…'
    : noCamera
      ? `${camera.cameraError ? 'Câmera indisponível' : 'Rastreamento de mão indisponível'} — clique e arraste na área do gráfico para mover o "móvel" com o mouse.`
      : !handSeen
        ? 'Mostre a mão aberta para a câmera, com a palma virada para ela.'
        : !calibrated
          ? 'Calibrando… mantenha a mão aberta e parada por um instante.'
          : 'Mova a mão para os lados, sempre à mesma distância da câmera.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '16px 20px 0', minHeight: 64 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#9b59b6' }}>Você é o móvel</span>
        <div style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>{hint}</div>
      </div>

      <div
        style={{ flex: 1, position: 'relative', minHeight: 0, touchAction: 'none', cursor: noCamera ? 'ew-resize' : 'default' }}
        onPointerDown={(e) => onPointer(e, true)}
        onPointerMove={(e) => onPointer(e)}
        onPointerUp={(e) => onPointer(e, false)}
        onPointerCancel={(e) => onPointer(e, false)}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            position: 'absolute', right: 16, bottom: 34, width: 'min(28vw, 200px)', aspectRatio: '4 / 3',
            objectFit: 'cover', transform: 'scaleX(-1)', borderRadius: 8,
            border: `1px solid ${c.panelBorder}`, background: '#000', opacity: camera.cameraError ? 0 : 0.9,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{
        padding: '12px 20px 16px', background: c.panelBg, borderTop: `1px solid ${c.panelBorder}`,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <ChallengeBanner status={status} muted={c.muted} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: c.muted, letterSpacing: 1 }}>DESAFIOS</span>
          {CHALLENGES.map((ch) => (
            <button
              key={ch.id}
              onClick={() => sceneRef.current?.startChallenge(ch)}
              disabled={status.phase === 'countdown' || status.phase === 'recording'}
              style={chip(dark)}
            >
              {ch.title}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button onClick={() => sceneRef.current?.clear()} style={chip(dark)}>Limpar</button>
          {!noCamera && <button onClick={recalibrate} style={chip(dark)}>Recalibrar</button>}
        </div>

        <div style={{ display: 'flex', gap: 24, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>x = <strong style={{ color: '#9b59b6' }}>{reading ? `${(reading.x * 100).toFixed(1)} cm` : '—'}</strong></span>
          <span>v = <strong style={{ color: '#3498db' }}>{reading ? `${(reading.v * 100).toFixed(1)} cm/s` : '—'}</strong></span>
        </div>
      </div>
    </div>
  );
}

function ChallengeBanner({ status, muted }: { status: ChallengeStatus; muted: string }) {
  if (status.phase === 'idle') {
    return <div style={{ fontSize: 13, color: muted }}>Escolha um desafio: o alvo aparece tracejado em laranja e você tenta reproduzi-lo com a mão.</div>;
  }
  const ch = status.challenge;
  if (status.phase === 'countdown') {
    return <div style={{ fontSize: 14 }}><strong>{ch.title}:</strong> {ch.goal} Começa em <strong>{Math.ceil(status.remaining)}</strong>…</div>;
  }
  if (status.phase === 'recording') {
    return <div style={{ fontSize: 14 }}><strong style={{ color: '#e74c3c' }}>● Gravando</strong> — {ch.goal}</div>;
  }
  const color = status.score >= 70 ? '#2ecc71' : status.score >= 40 ? '#f39c12' : '#e74c3c';
  return (
    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
      <strong>{ch.title}:</strong> nota <strong style={{ color, fontSize: 16 }}>{status.score}/100</strong>
      <span style={{ color: muted }}> (erro médio de {(status.rms * 100).toFixed(1)} cm)</span>
      <div style={{ color: muted, fontSize: 13 }}>{ch.concept}</div>
    </div>
  );
}

function chip(dark: boolean) {
  return {
    background: dark ? '#1a1a3a' : '#f8f8ff', color: dark ? '#e0e0f0' : '#1a1a2e',
    border: `1px solid ${dark ? '#333366' : '#9999cc'}`, borderRadius: 999,
    padding: '5px 12px', fontSize: 13, cursor: 'pointer',
  } as const;
}
