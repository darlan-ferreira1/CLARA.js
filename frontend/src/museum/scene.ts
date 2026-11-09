// Cena Three.js do Museu Virtual — museu em primeira pessoa.
//
// O mundo tem "fases" (levels.ts): o salão principal e as salas interativas.
// Toda a planta de cada fase vem de layout.ts; aqui ficam o jogador, a entrada,
// a troca de fase e o laço.
//
// Controles (desktop):
//   - Clique na tela → PointerLockControls trava o mouse (o mouse gira a visão).
//   - WASD / setas → anda; Shift → corre.
//   - E (ou clique) → interage com o objeto na mira (ex.: segurar a massa do
//     pêndulo) ou, se não houver, entra na porta próxima.
//   - Esc → o navegador destrava o mouse (comportamento padrão do Pointer Lock).
//   - Tab (dentro de uma sala) → tratado no index.tsx: abre o HUD de ajustes.
//
// Controles (celular): TouchControls.tsx chama setTouchMove (joystick) e
// touchLook (arrastar); os botões do index.tsx chamam enterNearest e
// interactPress/interactRelease. Teclado e joystick viram o mesmo vetor
// (frente, lado) no loop — a cena não se importa com a origem da entrada.
//
// Controles (controle de videogame, core/gamepad.ts): analógico esquerdo anda,
// direito olha, A = E, RT ou clicar o analógico esquerdo = correr, Start = HUD
// de ajustes (dentro de uma sala), Select = pausa. O controle é mais uma fonte
// do mesmo vetor de movimento e do mesmo giro de câmera do toque. Enquanto o
// React não libera o controle (setGamepadEnabled), A ou Start só pedem para
// começar (onGamepadAction('resume')).
//
// Portas:
//   - porta com sala interativa (sala.ts) → transição (tela escurece) e troca de
//     fase dentro da MESMA cena e do MESMO renderer;
//   - porta sem sala → onEnter(id): o React abre a página do experimento.
//
// O loop usa renderer.setAnimationLoop (e não requestAnimationFrame) para que a
// mesma cena possa ganhar uma sessão WebXR nas próximas etapas sem mudar o loop.

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { ControlDef, ControlValue, ControlValues } from '../core/controls';
import { defaultValues } from '../core/controls';
import { createGamepadReader } from '../core/gamepad';
import type { InteractiveRoom, RoomInteraction } from './interactiveRoom';
import { buildHall, buildRoom, type Level } from './levels';
import {
  spawnPoint, constrainPosition, nearestDoor, EXIT_DOOR_ID, EYE_HEIGHT,
  type DoorEntry, type DoorPlacement,
} from './layout';

export interface MuseumSceneConfig {
  entries: DoorEntry[];
  rooms: Record<string, InteractiveRoom>; // id do experimento → sala interativa
  spawnDoorId?: string;            // porta na frente da qual o jogador aparece
  background: number;
}

export interface RoomInfo {
  id: string;
  title: string;
  controls: ControlDef[];
  values: ControlValues;
}

export interface MuseumScene {
  // Precisa ser chamado dentro de um evento de clique (exigência do Pointer Lock).
  lock(): void;
  unlock(): void;
  // Entrada por toque (celular): vetor do joystick em [-1, 1] (x = lado,
  // y = frente) e arrasto para olhar (em pixels).
  setTouchMove(x: number, y: number): void;
  touchLook(dx: number, dy: number): void;
  // Botões de toque: entrar na porta próxima / segurar e soltar o objeto na mira.
  enterNearest(): void;
  interactPress(): void;
  interactRelease(): void;
  // HUD de ajustes da sala atual (camada A da sala interativa).
  setControl(id: string, value: ControlValue): void;
  // Controle de videogame: só move a cena quando o React libera (jogando e
  // sem HUD aberto). Desligado, A ou Start disparam onGamepadAction('resume').
  setGamepadEnabled(enabled: boolean): void;

  onLockChange: ((locked: boolean) => void) | null;
  // resume = começar/voltar a jogar; menu = abrir o HUD (só numa sala);
  // pause = pausar (Select ou controle desconectado).
  onGamepadAction: ((action: 'resume' | 'menu' | 'pause') => void) | null;
  onNearDoorChange: ((door: DoorPlacement | null) => void) | null;
  onEnter: ((doorId: string) => void) | null;          // abrir a PÁGINA do experimento
  onRoomChange: ((room: RoomInfo | null) => void) | null; // entrou/saiu de uma sala
  onInteractionChange: ((prompt: string | null) => void) | null;
  dispose(): void;
}

const WALK_SPEED = 4;   // m/s
const RUN_SPEED  = 7;
const FADE_TIME  = 0.35; // s para escurecer (e o mesmo para clarear)

const KEY_FORWARD = ['KeyW', 'ArrowUp'];
const KEY_BACK    = ['KeyS', 'ArrowDown'];
const KEY_LEFT    = ['KeyA', 'ArrowLeft'];
const KEY_RIGHT   = ['KeyD', 'ArrowRight'];
const KEY_RUN     = ['ShiftLeft', 'ShiftRight'];

const PAD_LOOK_SPEED = 2.5; // rad/s com o analógico direito no máximo

export function createMuseumScene(container: HTMLDivElement, config: MuseumSceneConfig): MuseumScene {
  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.background);
  scene.fog = new THREE.Fog(config.background, 18, 45);

  const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.05, 100);
  scene.add(camera); // necessário para o véu de transição (filho da câmera) ser desenhado

  const controls = new PointerLockControls(camera, renderer.domElement);

  // ── Luzes (valem para o salão e para todas as salas) ──
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(4, 10, 6);
  scene.add(sun);

  // ── Véu de transição: plano preto colado na frente da câmera ──
  const veilGeo = new THREE.PlaneGeometry(4, 4);
  const veilMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  const veil = new THREE.Mesh(veilGeo, veilMat);
  veil.position.z = -0.2;
  veil.renderOrder = 999;
  veil.visible = false;
  camera.add(veil);

  // ── Fases ──
  const hall = buildHall(config.entries);
  scene.add(hall.group);
  let level: Level = hall;
  let room: { level: Level; door: DoorPlacement; def: InteractiveRoom; values: ControlValues } | null = null;

  function placePlayer(doorId?: string) {
    const spawn = spawnPoint(level.layout, doorId);
    camera.position.set(spawn.x, EYE_HEIGHT, spawn.z);
    camera.lookAt(spawn.lookX, EYE_HEIGHT, spawn.lookZ);
  }
  placePlayer(config.spawnDoorId);

  // ── Estado de entrada ──
  const pressed = new Set<string>();
  const anyPressed = (codes: string[]) => codes.some((c) => pressed.has(c));
  const touchMove = { x: 0, y: 0 };
  let currentDoor: DoorPlacement | null = null;
  let hovered: RoomInteraction | null = null;
  let active: RoomInteraction | null = null; // interação sendo segurada
  let shownPrompt: string | null = null;
  let fade: { phase: 'out' | 'in'; t: number; action?: () => void } | null = null;

  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);
  function aimRay(): THREE.Ray {
    raycaster.setFromCamera(screenCenter, camera);
    return raycaster.ray;
  }

  // Olhar por toque: mesma convenção do PointerLockControls (Euler 'YXZ':
  // primeiro gira em Y = olhar para os lados, depois em X = olhar para cima/baixo).
  const look = new THREE.Euler(0, 0, 0, 'YXZ');
  const TOUCH_LOOK_SPEED = 0.005; // rad por pixel arrastado
  const MAX_PITCH = Math.PI / 2 - 0.05;

  // Gira a visão: yaw > 0 vira para a esquerda, pitch > 0 olha para cima.
  // Usado pelo toque e pelo analógico direito.
  function rotateLook(yaw: number, pitch: number) {
    look.setFromQuaternion(camera.quaternion);
    look.y += yaw;
    look.x = Math.min(Math.max(look.x + pitch, -MAX_PITCH), MAX_PITCH);
    camera.quaternion.setFromEuler(look);
  }

  const gamepad = createGamepadReader();
  let gamepadEnabled = false;
  let gamepadWasConnected = false;

  const api: MuseumScene = {
    lock() { controls.lock(); },
    unlock() { controls.unlock(); },
    setTouchMove(x, y) {
      touchMove.x = x;
      touchMove.y = y;
    },
    touchLook(dx, dy) {
      rotateLook(-dx * TOUCH_LOOK_SPEED, -dy * TOUCH_LOOK_SPEED);
    },
    setGamepadEnabled(enabled) {
      gamepadEnabled = enabled;
      if (!enabled) interactRelease();
    },
    enterNearest() {
      if (currentDoor) goThroughDoor(currentDoor);
    },
    interactPress,
    interactRelease,
    setControl(id, value) {
      if (!room) return;
      room.values = { ...room.values, [id]: value };
      room.level.setControls(room.values);
    },
    onLockChange: null,
    onGamepadAction: null,
    onNearDoorChange: null,
    onEnter: null,
    onRoomChange: null,
    onInteractionChange: null,
    dispose,
  };

  // ── Portas e troca de fase ──

  function setCurrentDoor(door: DoorPlacement | null) {
    if (door === currentDoor) return;
    const oldMat = currentDoor && level.doorMaterials.get(currentDoor.id);
    if (oldMat) oldMat.emissiveIntensity = 0;
    const newMat = door && level.doorMaterials.get(door.id);
    if (newMat) newMat.emissiveIntensity = 0.45;
    currentDoor = door;
    api.onNearDoorChange?.(door);
  }

  function transition(action: () => void) {
    if (fade) return;
    interactRelease();
    fade = { phase: 'out', t: 0, action };
    veil.visible = true;
  }

  function goThroughDoor(door: DoorPlacement) {
    if (fade) return;
    if (room && door.id === EXIT_DOOR_ID) {
      transition(closeRoom);
    } else if (!room && config.rooms[door.id]) {
      transition(() => openRoom(door));
    } else if (!room) {
      // Sem sala interativa: abre a página do experimento.
      pressed.clear();
      touchMove.x = touchMove.y = 0;
      controls.unlock();
      api.onEnter?.(door.id);
    }
  }

  function switchLevel(next: Level) {
    setCurrentDoor(null);
    hovered = null;
    level.group.visible = false;
    level = next;
    level.group.visible = true;
  }

  function openRoom(door: DoorPlacement) {
    const def = config.rooms[door.id];
    const values = defaultValues(def.controls);
    const roomLevel = buildRoom(def, door.title, door.color, values);
    scene.add(roomLevel.group);
    room = { level: roomLevel, door, def, values };
    switchLevel(roomLevel);
    placePlayer();
    api.onRoomChange?.({ id: door.id, title: door.title, controls: def.controls, values });
  }

  function closeRoom() {
    if (!room) return;
    const { level: roomLevel, door } = room;
    room = null;
    switchLevel(hall);
    scene.remove(roomLevel.group);
    roomLevel.dispose();
    placePlayer(door.id); // reaparece na frente da porta da sala
    api.onRoomChange?.(null);
  }

  // ── Interações diretas (camada B) ──

  function interactPress() {
    if (fade || active || !hovered) return;
    active = hovered;
    active.press(aimRay());
  }

  function interactRelease() {
    if (!active) return;
    active.release();
    active = null;
  }

  // Ação principal (E ou clique): interação na mira tem prioridade sobre a porta.
  function primaryDown() {
    if (hovered) interactPress();
    else if (currentDoor) goThroughDoor(currentDoor);
  }

  function onKeyDown(e: KeyboardEvent) {
    pressed.add(e.code);
    if (e.code === 'KeyE' && !e.repeat && controls.isLocked) primaryDown();
  }
  function onKeyUp(e: KeyboardEvent) {
    pressed.delete(e.code);
    if (e.code === 'KeyE') interactRelease();
  }
  function onMouseDown() { if (controls.isLocked) primaryDown(); }
  function onMouseUp() { interactRelease(); }
  function onLock()   { api.onLockChange?.(true); }
  function onUnlock() {
    pressed.clear();
    interactRelease();
    api.onLockChange?.(false);
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  controls.addEventListener('lock', onLock);
  controls.addEventListener('unlock', onUnlock);

  // ── Resize ──
  const ro = new ResizeObserver(() => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  // ── Loop ──
  let last = 0;
  renderer.setAnimationLoop((t: number) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;

    // Transição entre fases: escurece → troca → clareia.
    if (fade) {
      fade.t += dt;
      const k = Math.min(fade.t / FADE_TIME, 1);
      veilMat.opacity = fade.phase === 'out' ? k : 1 - k;
      if (k >= 1) {
        if (fade.phase === 'out') {
          fade.action?.();
          fade = { phase: 'in', t: 0 };
        } else {
          fade = null;
          veil.visible = false;
        }
      }
    }

    // Três fontes de entrada para o mesmo movimento: teclado (com o mouse
    // travado), joystick de toque e controle de videogame. Todas viram um
    // vetor (frente, lado).
    let forward: number;
    let strafe: number;
    let speed = WALK_SPEED;
    if (controls.isLocked) {
      forward = (anyPressed(KEY_FORWARD) ? 1 : 0) - (anyPressed(KEY_BACK) ? 1 : 0);
      strafe  = (anyPressed(KEY_RIGHT) ? 1 : 0) - (anyPressed(KEY_LEFT) ? 1 : 0);
      if (anyPressed(KEY_RUN)) speed = RUN_SPEED;
    } else {
      forward = touchMove.y;
      strafe  = touchMove.x;
    }

    const pad = gamepad.poll();
    if (gamepadWasConnected && !pad.connected && gamepadEnabled) api.onGamepadAction?.('pause');
    gamepadWasConnected = pad.connected;
    if (pad.connected && gamepadEnabled) {
      forward += pad.move.y;
      strafe  += pad.move.x;
      if (pad.pressed('rt') || pad.pressed('leftStick')) speed = RUN_SPEED;
      if ((pad.look.x || pad.look.y) && !fade) {
        rotateLook(-pad.look.x * PAD_LOOK_SPEED * dt, pad.look.y * PAD_LOOK_SPEED * dt);
      }
      if (pad.justPressed('a')) primaryDown();
      if (pad.justReleased('a')) interactRelease();
      if (pad.justPressed('start') && room) api.onGamepadAction?.('menu');
      if (pad.justPressed('select')) api.onGamepadAction?.('pause');
    } else if (pad.justPressed('a') || pad.justPressed('start')) {
      api.onGamepadAction?.('resume');
    }
    if ((forward || strafe) && !fade) {
      // Limita o vetor a comprimento 1: andar na diagonal não fica mais rápido,
      // e o joystick continua analógico (empurrar pouco = andar devagar).
      const len = Math.max(1, Math.hypot(forward, strafe));
      const step = speed * dt / len;
      controls.moveForward(forward * step);
      controls.moveRight(strafe * step);
      const p = constrainPosition({ x: camera.position.x, z: camera.position.z }, level.layout);
      camera.position.x = p.x;
      camera.position.z = p.z;
    }

    level.tick(dt);

    // Interações: segurando → arrasta; senão, descobre o que está na mira.
    if (!fade) {
      const ray = aimRay();
      if (active) active.drag(ray);
      else hovered = level.interactions.find((i) => i.isTarget(ray)) ?? null;
    }
    const prompt = (active ?? hovered)?.prompt ?? null;
    if (prompt !== shownPrompt) {
      shownPrompt = prompt;
      api.onInteractionChange?.(prompt);
    }

    setCurrentDoor(fade ? null : nearestDoor({ x: camera.position.x, z: camera.position.z }, level.layout));

    renderer.render(scene, camera);
  });

  function dispose() {
    renderer.setAnimationLoop(null);
    ro.disconnect();
    gamepad.dispose();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
    controls.removeEventListener('lock', onLock);
    controls.removeEventListener('unlock', onUnlock);
    controls.unlock();
    controls.dispose();
    if (room) room.level.dispose();
    hall.dispose();
    veilGeo.dispose();
    veilMat.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return api;
}
