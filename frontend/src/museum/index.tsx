import { useEffect, useRef, useState } from 'react';
import { createMuseumScene, type MuseumScene, type RoomInfo } from './scene';
import { EXIT_DOOR_ID, type DoorEntry, type DoorPlacement } from './layout';
import type { InteractiveRoom } from './interactiveRoom';
import type { ControlValue } from '../core/controls';
import { simulations } from '../simulations/registry';
import TouchControls from './TouchControls';
import ControlsHud from '../components/ControlsHud/ControlsHud';

// As portas são geradas a partir do registro: todo experimento disponível ganha
// uma porta, sem nenhuma configuração extra.
const CATEGORY_COLOR: Record<string, number> = {
  Física:   0x9b59b6,
  Química:  0x3498db,
  Biologia: 0x2ecc71,
};

// Salas interativas: qualquer pasta de experimento com um `sala.ts` ganha uma
// sala interativa. Basta o arquivo existir — nenhuma lista para manter.
const SALAS = import.meta.glob<InteractiveRoom>('../simulations/**/sala.ts', { eager: true, import: 'sala' });

const ROOMS: Record<string, InteractiveRoom> = {};
for (const s of simulations) {
  const sala = s.folder ? SALAS[`../simulations/${s.folder}/sala.ts`] : undefined;
  if (sala) ROOMS[s.id] = sala;
}

// Só experimentos com sala interativa ganham porta: o museu é o lugar das
// salas interativas. Os demais continuam acessíveis pela Galeria.
const DOOR_ENTRIES: DoorEntry[] = simulations
  .filter((s) => s.available && s.id in ROOMS)
  .map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    color: CATEGORY_COLOR[s.category] ?? 0x888888,
  }));

// Guarda por qual porta o aluno saiu, para ele reaparecer na frente dela ao
// voltar do experimento (o componente é desmontado durante o experimento,
// então isso fica fora do estado do React).
let lastDoorId: string | undefined;

// Dispositivo principal de toque (celular/tablet) → joystick em vez de WASD.
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const KEYBOARD_HELP = [
  ['W A S D', 'andar'],
  ['Mouse', 'olhar ao redor'],
  ['Shift', 'correr'],
  ['E', 'entrar na porta / segurar objeto'],
  ['Tab', 'ajustes (dentro de uma sala)'],
  ['Esc', 'pausar'],
];

const TOUCH_HELP = [
  ['Joystick', 'andar (canto inferior esquerdo)'],
  ['Arrastar', 'olhar ao redor'],
  ['Tocar no aviso', 'entrar na porta / segurar objeto'],
  ['⚙', 'ajustes (dentro de uma sala)'],
  ['❚❚', 'pausar'],
];

const GAMEPAD_HELP = 'Controle: analógico esquerdo anda, direito olha, A entra ou segura, Start abre os ajustes, Select pausa. Aperte A para começar.';

const kbdStyle = {
  border: '1px solid #666', borderRadius: 4, padding: '1px 7px',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
} as const;

const roundButton = {
  width: 40, height: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(10,10,26,0.6)', color: '#e0e0f0', fontSize: 16, cursor: 'pointer',
} as const;

function doorPrompt(door: DoorPlacement): string {
  if (door.id === EXIT_DOOR_ID) return 'Voltar ao museu';
  return `Entrar na sala ${door.title}`;
}

interface Props {
  theme: 'dark' | 'light';
  onEnter: (experimentId: string) => void;
  onBack: () => void;
}

export default function VirtualMuseum({ theme, onEnter, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<MuseumScene | null>(null);
  const [locked, setLocked]     = useState(false);
  // No celular não existe Pointer Lock: "jogando" = o aluno tocou em Começar.
  // Ao voltar de um experimento, já recomeça direto (sem a tela de instruções).
  const [touchPlaying, setTouchPlaying] = useState(IS_TOUCH && lastDoorId !== undefined);
  // Com controle de videogame: "jogando" = o aluno apertou A ou Start.
  const [padPlaying, setPadPlaying] = useState(false);
  const [nearDoor, setNearDoor] = useState<DoorPlacement | null>(null);
  const [interaction, setInteraction] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [hudOpen, setHudOpen] = useState(false);
  const playing = locked || touchPlaying || padPlaying;

  function pauseTouch() {
    sceneRef.current?.setTouchMove(0, 0);
    setTouchPlaying(false);
  }

  function changeControl(id: string, value: ControlValue) {
    setRoom((r) => (r ? { ...r, values: { ...r.values, [id]: value } } : r));
    sceneRef.current?.setControl(id, value);
  }

  // Fecha o HUD. No desktop, volta a travar o mouse (precisa ser dentro do clique).
  function closeHud() {
    setHudOpen(false);
    if (!IS_TOUCH) sceneRef.current?.lock();
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const s = createMuseumScene(container, {
      entries: DOOR_ENTRIES,
      rooms: ROOMS,
      spawnDoorId: lastDoorId,
      background: theme === 'dark' ? 0x0a0a1a : 0xcfd6e6,
    });
    s.onLockChange = setLocked;
    s.onGamepadAction = (action) => {
      if (action === 'resume') {
        setHudOpen(false);
        setPadPlaying(true);
      } else if (action === 'menu') {
        setHudOpen(true);
        s.unlock(); // no desktop, solta o mouse para usar o HUD
      } else {
        setPadPlaying(false);
        setTouchPlaying(false);
        s.setTouchMove(0, 0);
        s.unlock();
      }
    };
    s.onNearDoorChange = setNearDoor;
    s.onInteractionChange = setInteraction;
    s.onRoomChange = (r) => {
      setRoom(r);
      setHudOpen(false);
      if (r) lastDoorId = r.id;
    };
    s.onEnter = (id) => {
      lastDoorId = id;
      onEnter(id);
    };
    sceneRef.current = s;
    return () => { s.dispose(); sceneRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // O controle só move a cena enquanto se está jogando com ele e sem HUD aberto.
  useEffect(() => {
    sceneRef.current?.setGamepadEnabled(padPlaying && !hudOpen);
  }, [padPlaying, hudOpen, theme]);

  // Desktop: Tab abre o HUD de ajustes dentro de uma sala (solta o mouse);
  // Esc com o HUD aberto volta para a tela de pausa.
  useEffect(() => {
    if (IS_TOUCH) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab' && room && locked) {
        e.preventDefault();
        setHudOpen(true);
        sceneRef.current?.unlock();
      } else if (e.code === 'Escape' && hudOpen) {
        setHudOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [room, locked, hudOpen]);

  const showHud = room && hudOpen;
  const showGameUi = playing && !showHud;

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: 'var(--bg)', fontFamily: 'Inter, sans-serif' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Controles de toque (celular) */}
      {touchPlaying && !showHud && (
        <>
          <TouchControls
            onMove={(x, y) => sceneRef.current?.setTouchMove(x, y)}
            onLook={(dx, dy) => sceneRef.current?.touchLook(dx, dy)}
          />
          <div style={{
            position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 12,
            display: 'flex', gap: 8,
          }}>
            {room && (
              <button onClick={() => { sceneRef.current?.setTouchMove(0, 0); setHudOpen(true); }} aria-label="Ajustes" style={roundButton}>
                ⚙
              </button>
            )}
            <button onClick={pauseTouch} aria-label="Pausar" style={roundButton}>❚❚</button>
          </div>
        </>
      )}

      {/* Nome da sala + dica do HUD */}
      {showGameUi && room && (
        <div style={{
          position: 'absolute', top: 'calc(14px + env(safe-area-inset-top, 0px))', left: 16,
          color: '#e0e0f0', textShadow: '0 1px 4px rgba(0,0,0,0.8)', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', opacity: 0.7, textTransform: 'uppercase' }}>Sala</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{room.title}</div>
          {(!IS_TOUCH || padPlaying) && (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              <kbd style={{ ...kbdStyle, fontSize: 11 }}>{padPlaying ? 'Start' : 'Tab'}</kbd> ajustes
            </div>
          )}
        </div>
      )}

      {/* Mira no centro da tela */}
      {showGameUi && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 6, height: 6,
          margin: '-3px 0 0 -3px', borderRadius: '50%',
          background: interaction ? '#f1c40f' : 'rgba(255,255,255,0.85)',
          boxShadow: '0 0 4px rgba(0,0,0,0.6)', pointerEvents: 'none',
        }} />
      )}

      {/* Aviso de ação: interação na mira tem prioridade sobre a porta.
          No desktop é só um aviso (tecla E); no celular é um botão. */}
      {showGameUi && (interaction || nearDoor) && (
        <button
          {...(interaction
            ? {
                // segurar: aperta e mantém (pegar a massa do pêndulo, por ex.)
                onPointerDown: () => sceneRef.current?.interactPress(),
                onPointerUp: () => sceneRef.current?.interactRelease(),
                onPointerCancel: () => sceneRef.current?.interactRelease(),
                onPointerLeave: () => sceneRef.current?.interactRelease(),
              }
            : { onClick: () => sceneRef.current?.enterNearest() })}
          disabled={!touchPlaying}
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            bottom: touchPlaying ? 'calc(180px + env(safe-area-inset-bottom, 0px))' : 48,
            background: 'rgba(10,10,26,0.85)',
            border: `1px solid ${interaction ? '#f1c40f' : `#${nearDoor!.color.toString(16).padStart(6, '0')}`}`,
            borderRadius: 10, padding: touchPlaying ? '12px 20px' : '10px 18px', color: '#e0e0f0', fontSize: 15,
            display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 32px)', overflow: 'hidden', textOverflow: 'ellipsis',
            pointerEvents: touchPlaying ? 'auto' : 'none', cursor: 'pointer', fontFamily: 'inherit',
            touchAction: 'none', userSelect: 'none',
          }}
        >
          {!touchPlaying && <kbd style={kbdStyle}>{padPlaying ? 'A' : 'E'}</kbd>}
          <span>
            {interaction
              ? (touchPlaying ? `Segure aqui para ${interaction}` : `Segure para ${interaction}`)
              : (touchPlaying ? 'Toque: ' : '') + doorPrompt(nearDoor!)}
          </span>
        </button>
      )}

      {/* HUD de ajustes da sala (camada A) */}
      {showHud && (
        <ControlsHud
          title={room.title}
          controls={room.controls}
          values={room.values}
          compact={IS_TOUCH}
          onChange={changeControl}
          onClose={closeHud}
          closeLabel="Voltar à sala"
        />
      )}

      {/* Tela de instruções (aparece enquanto não está "jogando") */}
      {!playing && !showHud && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,5,15,0.55)', padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '28px 32px', maxWidth: 440, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-fisica)' }}>
              Museu CLARA<span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>.js</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '10px 0 20px', lineHeight: 1.6 }}>
              Cada porta leva à sala interativa de um experimento. As paredes são organizadas por área do conhecimento.
            </p>

            <table style={{ margin: '0 auto 22px', fontSize: 14, borderSpacing: '12px 6px', textAlign: 'left' }}>
              <tbody>
                {(IS_TOUCH ? TOUCH_HELP : KEYBOARD_HELP).map(([key, action]) => (
                  <tr key={key}>
                    <td><kbd style={{
                      border: '1px solid var(--border-hover)', borderRadius: 4, padding: '1px 7px',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 12, whiteSpace: 'nowrap',
                    }}>{key}</kbd></td>
                    <td style={{ color: 'var(--text-muted)' }}>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '-10px 0 20px', lineHeight: 1.5 }}>
              {GAMEPAD_HELP}
            </p>
            <button
              // Pointer Lock só pode ser pedido dentro de um clique — por isso o
              // lock() é chamado aqui, no próprio handler.
              onClick={() => (IS_TOUCH ? setTouchPlaying(true) : sceneRef.current?.lock())}
              style={{
                background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none',
                borderRadius: 8, padding: '10px 26px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {IS_TOUCH ? 'Toque para explorar' : 'Clique para explorar'}
            </button>

            <div>
              <button
                onClick={onBack}
                style={{
                  marginTop: 16, background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                ← Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
