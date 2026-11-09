// Locomoção com controle de videogame dentro da realidade virtual (WebXR).
//
// Na sessão imersiva, quem posiciona a câmera é o WebXR (a cabeça do usuário),
// relativo ao PAI da câmera. Por isso a câmera vai para dentro de um grupo, o
// "rig", e o controle move o rig — como andar com uma plataforma sob os pés:
//   - analógico esquerdo: anda na direção para onde a cabeça olha (sem subir);
//   - analógico direito (horizontal): gira o corpo; o vertical fica para a
//     cabeça, porque inclinar a visão sem mexer a cabeça causa enjoo;
//   - RT sobe e LT desce (os experimentos de RV são altos, como a hélice).
// Fora da sessão o rig volta à origem, e o OrbitControls da página continua
// funcionando como antes.
//
// Não são os controladores de RV (renderer.xr.getController): é um controle
// comum, lido pela Gamepad API, para quem tem só o celular e um gamepad.

import * as THREE from 'three';
import { createGamepadReader, type GamepadFrame } from './gamepad';

const MOVE_SPEED = 2;   // m/s
const LIFT_SPEED = 1.5; // m/s
const TURN_SPEED = 1.5; // rad/s

export interface GamepadRig {
  group: THREE.Group; // pai da câmera e dos controladores de RV
  // Chamar a cada quadro, no laço da cena. Devolve o quadro do controle para a
  // cena tratar os botões dela (ex.: A/B trocam o elemento).
  tick(dt: number): GamepadFrame;
  dispose(): void;
}

export function createGamepadRig(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): GamepadRig {
  const group = new THREE.Group();
  scene.add(group);
  group.add(camera);

  const gamepad = createGamepadReader();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

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

      // Direção da cabeça projetada no chão.
      renderer.xr.getCamera().getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 1e-6) {
        forward.normalize();
        right.crossVectors(forward, UP);
        group.position.addScaledVector(forward, pad.move.y * MOVE_SPEED * dt);
        group.position.addScaledVector(right, pad.move.x * MOVE_SPEED * dt);
      }
      group.rotation.y -= pad.look.x * TURN_SPEED * dt;

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
