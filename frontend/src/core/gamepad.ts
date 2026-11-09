// Leitura de controles de videogame (Gamepad API), comum ao Museu Virtual e
// às variantes de realidade virtual.
//
// A Gamepad API não usa eventos para os botões e os analógicos: o estado é
// lido a cada quadro, com navigator.getGamepads(), dentro do laço que a cena
// já tem. Este módulo só converte esse estado bruto num "quadro" de entrada:
//   - move: analógico esquerdo (x = lado, y = frente), em [-1, 1];
//   - look: analógico direito (x = girar para a direita, y = olhar para cima);
//   - botões apertados, recém-apertados e recém-soltos.
// Quem decide o que cada coisa faz é a cena — o mesmo padrão do PinchState da
// Dissecação e do vetor de movimento do museu (abstração de entrada).
//
// Os índices seguem o "mapeamento padrão" da Gamepad API (layout de controle
// de Xbox), usado pelo Machenike G5 Pro no modo XInput e pela maioria dos
// controles. Um controle com outro mapeamento ganha um GamepadLayout próprio,
// sem mexer na lógica de movimento.
//
// Não importa three nem react.

export const DEFAULT_DEADZONE = 0.15;

export type GamepadButton =
  | 'a' | 'b' | 'x' | 'y'
  | 'lb' | 'rb' | 'lt' | 'rt'
  | 'select' | 'start' | 'leftStick' | 'rightStick';

export interface GamepadLayout {
  moveX: number; // índice do eixo (navigator.getGamepads()[i].axes)
  moveY: number;
  lookX: number;
  lookY: number;
  buttons: Record<GamepadButton, number>; // índice em gamepad.buttons
}

export const STANDARD_LAYOUT: GamepadLayout = {
  moveX: 0, moveY: 1, lookX: 2, lookY: 3,
  buttons: {
    a: 0, b: 1, x: 2, y: 3,
    lb: 4, rb: 5, lt: 6, rt: 7,
    select: 8, start: 9, leftStick: 10, rightStick: 11,
  },
};

export interface GamepadFrame {
  connected: boolean;
  move: { x: number; y: number };
  look: { x: number; y: number };
  pressed(button: GamepadButton): boolean;
  justPressed(button: GamepadButton): boolean;
  justReleased(button: GamepadButton): boolean;
}

// Zona morta radial: abaixo de `deadzone` o analógico vale 0 (os analógicos
// nunca voltam exatamente ao centro); acima, a escala recomeça do 0, para o
// movimento não dar um salto ao sair da zona morta. O resultado tem
// comprimento no máximo 1, então a diagonal não fica mais rápida.
export function applyDeadzone(x: number, y: number, deadzone: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len <= deadzone) return { x: 0, y: 0 };
  const scaled = Math.min((len - deadzone) / (1 - deadzone), 1);
  return { x: (x / len) * scaled, y: (y / len) * scaled };
}

// Subconjunto do Gamepad do navegador que a leitura usa (facilita testar sem
// navegador).
export interface GamepadLike {
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

// Converte o estado bruto de um controle num GamepadFrame. `previous` é o
// conjunto de botões apertados no quadro anterior, para detectar as bordas.
export function readFrame(
  pad: GamepadLike | null,
  previous: ReadonlySet<GamepadButton>,
  layout: GamepadLayout = STANDARD_LAYOUT,
  deadzone = DEFAULT_DEADZONE,
): { frame: GamepadFrame; pressed: Set<GamepadButton> } {
  const pressed = new Set<GamepadButton>();
  if (pad) {
    for (const [name, index] of Object.entries(layout.buttons) as [GamepadButton, number][]) {
      const b = pad.buttons[index];
      if (b && (b.pressed || b.value > 0.5)) pressed.add(name);
    }
  }
  const axis = (i: number) => pad?.axes[i] ?? 0;
  // Nos controles, o eixo vertical é negativo para cima; aqui "para cima" = +1.
  const move = applyDeadzone(axis(layout.moveX), -axis(layout.moveY), deadzone);
  const look = applyDeadzone(axis(layout.lookX), -axis(layout.lookY), deadzone);
  const frame: GamepadFrame = {
    connected: pad !== null,
    move,
    look,
    pressed: (b) => pressed.has(b),
    justPressed: (b) => pressed.has(b) && !previous.has(b),
    justReleased: (b) => !pressed.has(b) && previous.has(b),
  };
  return { frame, pressed };
}

export interface GamepadReader {
  poll(): GamepadFrame; // chamar uma vez por quadro, no laço da cena
  dispose(): void;
}

// Lê o primeiro controle conectado. Em desenvolvimento, registra no console
// o nome, o mapeamento e a quantidade de botões e eixos de cada controle que
// conecta, para ajustar um GamepadLayout se o mapeamento não for o padrão.
export function createGamepadReader(layout: GamepadLayout = STANDARD_LAYOUT, deadzone = DEFAULT_DEADZONE): GamepadReader {
  let previous = new Set<GamepadButton>();
  const supported = typeof navigator !== 'undefined' && 'getGamepads' in navigator;

  function onConnect(e: GamepadEvent) {
    if (!import.meta.env.DEV) return;
    const g = e.gamepad;
    console.info(`[gamepad] conectado #${g.index}: "${g.id}" · mapeamento "${g.mapping || 'nenhum'}" · ${g.buttons.length} botões · ${g.axes.length} eixos`);
    if (g.mapping !== 'standard') console.warn('[gamepad] mapeamento fora do padrão: os botões podem estar trocados (ajuste um GamepadLayout).');
  }
  function onDisconnect(e: GamepadEvent) {
    if (import.meta.env.DEV) console.info(`[gamepad] desconectado #${e.gamepad.index}: "${e.gamepad.id}"`);
  }
  if (supported) {
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
  }

  return {
    poll() {
      const pad = supported ? navigator.getGamepads().find((g) => g?.connected) ?? null : null;
      const { frame, pressed } = readFrame(pad, previous, layout, deadzone);
      previous = pressed;
      return frame;
    },
    dispose() {
      if (!supported) return;
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    },
  };
}
