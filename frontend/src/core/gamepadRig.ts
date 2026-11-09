// Locomoção com controle de videogame dentro da realidade virtual (WebXR).
//
// Na sessão imersiva, quem posiciona a câmera é o WebXR (a cabeça do usuário),
// relativo ao PAI da câmera. Por isso a câmera vai para dentro de um grupo, o
// "rig", e o controle move o rig — como andar com uma plataforma sob os pés:
//   - analógico esquerdo: anda na direção para onde a cabeça olha (sem subir);
//   - Y (segurar): corre;
//   - analógico direito: gira o corpo e olha para cima e para baixo, para
//     quem usa o celular sem óculos e não pode só mover a cabeça;
//   - RT sobe e LT desce (os experimentos de RV são altos, como a hélice).
// Fora da sessão o rig volta à origem, e o OrbitControls da página continua
// funcionando como antes.
//
// Não são os controladores de RV (renderer.xr.getController): é um controle
// comum, lido pela Gamepad API, para quem tem só o celular e um gamepad.

import * as THREE from 'three';
import { createGamepadReader, type GamepadFrame } from './gamepad';

const MOVE_SPEED = 2;   // m/s
const RUN_SPEED  = 5;
const LIFT_SPEED = 1.5; // m/s
const TURN_SPEED = 1.5; // rad/s
const MAX_PITCH  = 1.4; // rad, para a visão não dar uma cambalhota

export interface GamepadRig {
  group: THREE.Group; // pai da câmera e dos controladores de RV
  // Chamar a cada quadro, no laço da cena. Devolve o quadro do controle para a
  // cena tratar os botões dela (ex.: A/B trocam o elemento).
  tick(dt: number): GamepadFrame;
  dispose(): void;
}

export function createGamepadRig(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): GamepadRig {
  const group = new THREE.Group();
  group.rotation.order = 'YXZ'; // primeiro os lados, depois para cima e para baixo
  scene.add(group);
  group.add(camera);

  const gamepad = createGamepadReader();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const head = new THREE.Vector3();
  const headInRig = new THREE.Vector3();

  function reset() {
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);
  }
  renderer.xr.addEventListener('sessionend', reset);

  return {
    group,
    tick(dt) {
      const pad = gamepad.poll();
      if (!pad.connected || !renderer.xr.isPresenting) return pad;

      // Gira em torno da cabeça, e não da origem do rig: sem esta compensação,
      // olhar para cima também deslocaria o usuário em arco.
      if (pad.look.x || pad.look.y) {
        renderer.xr.getCamera().getWorldPosition(head);
        group.updateMatrixWorld();
        group.worldToLocal(headInRig.copy(head));
        group.rotation.y -= pad.look.x * TURN_SPEED * dt;
        group.rotation.x = Math.min(Math.max(group.rotation.x + pad.look.y * TURN_SPEED * dt, -MAX_PITCH), MAX_PITCH);
        group.updateMatrixWorld();
        group.position.add(head.sub(group.localToWorld(headInRig)));
      }

      // Direção da cabeça projetada no chão.
      renderer.xr.getCamera().getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 1e-6) {
        forward.normalize();
        right.crossVectors(forward, UP);
        const speed = pad.pressed('y') ? RUN_SPEED : MOVE_SPEED;
        group.position.addScaledVector(forward, pad.move.y * speed * dt);
        group.position.addScaledVector(right, pad.move.x * speed * dt);
      }

      const lift = (pad.pressed('rt') ? 1 : 0) - (pad.pressed('lt') ? 1 : 0);
      group.position.y += lift * LIFT_SPEED * dt;
      return pad;
    },
    dispose() {
      gamepad.dispose();
      renderer.xr.removeEventListener('sessionend', reset);
    },
  };
}
