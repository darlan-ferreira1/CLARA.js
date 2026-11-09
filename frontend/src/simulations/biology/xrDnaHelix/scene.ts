// Cena WebXR da Dupla Hélice de DNA.
//
// A hélice é escalada 2.5× em relação à versão normal:
//   RADIUS = 3.75 m,  RISE = 0.85 m/bp
//
// Posicionamento na cena:
//   - DNA centrado em (0, 0, -6): 6 m à frente do ponto de origem do XR.
//   - Com 14 bp padrão a hélice tem ~11.9 m de altura, centralizada em y=0.
//   - O usuário em pé (y≈1.6) fica na região equatorial da hélice.
//
// Interação XR:
//   Gatilho direito (ctrl 0) → +2 pares de base.
//   Gatilho esquerdo (ctrl 1) → −2 pares de base.
// Com controle de videogame (core/gamepadRig.ts): os analógicos andam e giram
// dentro da RV, RT/LT sobem e descem ao longo da hélice, A → +2, B → −2.

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGamepadRig } from '../../../core/gamepadRig';

const SCALE        = 2.5;
const RADIUS_XR    = 1.5  * SCALE;   // 3.75 m
const RISE_XR      = 0.34 * SCALE;   // 0.85 m por par de base
const BP_PER_TURN  = 10;
const MIN_BP       = 6;
const MAX_BP       = 30;
const DNA_ORIGIN   = new THREE.Vector3(0, 0, -6);

export interface XRDnaScene {
  vrButton: HTMLElement;
  onBasePairsChange: ((n: number) => void) | null;
  setBasePairs(n: number): void;
  dispose(): void;
}

export function createXRDnaScene(container: HTMLDivElement): XRDnaScene {
  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x020d06);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const vrButton = VRButton.createButton(renderer);

  // ── Cena e câmera ──
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.01, 500);
  camera.position.set(0, 1.6, 4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(DNA_ORIGIN);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  renderer.xr.addEventListener('sessionstart', () => { controls.enabled = false; });
  renderer.xr.addEventListener('sessionend',   () => { controls.enabled = true; });

  // Câmera dentro de um rig que o controle de videogame move durante a RV.
  const rig = createGamepadRig(renderer, scene, camera);

  // ── Iluminação ──
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const topLight = new THREE.DirectionalLight(0xffffff, 2.5);
  topLight.position.set(0, 20, 0);
  scene.add(topLight);
  const sideLight = new THREE.PointLight(0x2ecc71, 6, 80);
  sideLight.position.set(6, 0, -6);
  scene.add(sideLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
  fillLight.position.set(-6, 0, 6);
  scene.add(fillLight);

  // ── Partículas de fundo ──
  const bgPositions = new Float32Array(3000);
  for (let i = 0; i < 1000; i++) {
    bgPositions[i * 3]     = (Math.random() - 0.5) * 200;
    bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  scene.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ color: 0x2ecc71, size: 0.08, transparent: true, opacity: 0.4 })));

  // ── Materiais ──
  const mat = {
    strand1: new THREE.MeshPhongMaterial({ color: 0xe74c3c, shininess: 90 }),
    strand2: new THREE.MeshPhongMaterial({ color: 0x3498db, shininess: 90 }),
    rungA:   new THREE.MeshPhongMaterial({ color: 0xf39c12, shininess: 70 }),
    rungB:   new THREE.MeshPhongMaterial({ color: 0x2ecc71, shininess: 70 }),
  };

  const sphereGeo = new THREE.SphereGeometry(0.18 * SCALE, 14, 10);
  let disposables: THREE.BufferGeometry[] = [];

  // ── Grupo do DNA ──
  const dnaGroup = new THREE.Group();
  dnaGroup.position.copy(DNA_ORIGIN);
  scene.add(dnaGroup);

  // ── Painel flutuante (CanvasTexture) ──
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width  = 512;
  labelCanvas.height = 160;
  const labelCtx = labelCanvas.getContext('2d')!;
  const labelTex  = new THREE.CanvasTexture(labelCanvas);
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 1.25),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  // Painel logo acima da hélice (calculado após saber o basePairs) — posição inicial
  labelMesh.position.set(DNA_ORIGIN.x, 0, DNA_ORIGIN.z); // ajustado em drawLabel
  scene.add(labelMesh);

  function drawLabel(bp: number) {
    const h = 14 * RISE_XR / 2; // meia altura para basePairs atual
    labelMesh.position.y = h + 1.5;
    const w = 512, lh = 160;
    labelCtx.clearRect(0, 0, w, lh);
    labelCtx.fillStyle = 'rgba(2,13,6,0.88)';
    labelCtx.fillRect(6, 6, w - 12, lh - 12);
    labelCtx.fillStyle = '#2ecc71';
    labelCtx.font = 'bold 36px sans-serif';
    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'top';
    labelCtx.fillText('DNA — Dupla Hélice', w / 2, 14);
    labelCtx.fillStyle = '#e0e0f0';
    labelCtx.font = '26px sans-serif';
    labelCtx.fillText(`${bp} pares de base`, w / 2, 60);
    labelCtx.fillStyle = '#335533';
    labelCtx.font = '18px sans-serif';
    labelCtx.fillText('◄ Gatilho esq. ou B  Pares  Gatilho dir. ou A ►', w / 2, 120);
    labelTex.needsUpdate = true;
  }

  // ── Geometria da hélice ──
  function computeHelix(basePairs: number) {
    const angStep  = (2 * Math.PI) / BP_PER_TURN;
    const totalH   = basePairs * RISE_XR;
    const yOffset  = -totalH / 2;
    const strand1: THREE.Vector3[] = [];
    const strand2: THREE.Vector3[] = [];
    for (let i = 0; i < basePairs; i++) {
      const angle = i * angStep;
      const y     = yOffset + i * RISE_XR;
      strand1.push(new THREE.Vector3(RADIUS_XR * Math.cos(angle),          y, RADIUS_XR * Math.sin(angle)));
      strand2.push(new THREE.Vector3(RADIUS_XR * Math.cos(angle + Math.PI), y, RADIUS_XR * Math.sin(angle + Math.PI)));
    }
    return { strand1, strand2 };
  }

  function cylinder(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10, 1);
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return mesh;
  }

  function buildGeometry(basePairs: number) {
    while (dnaGroup.children.length) dnaGroup.remove(dnaGroup.children[0]);
    disposables.forEach((g) => g.dispose());
    disposables = [];

    const { strand1, strand2 } = computeHelix(basePairs);

    if (basePairs >= 2) {
      const tubeGeo1 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand1), basePairs * 4, 0.07 * SCALE, 10, false);
      const tubeGeo2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand2), basePairs * 4, 0.07 * SCALE, 10, false);
      disposables.push(tubeGeo1, tubeGeo2);
      dnaGroup.add(new THREE.Mesh(tubeGeo1, mat.strand1));
      dnaGroup.add(new THREE.Mesh(tubeGeo2, mat.strand2));
    }

    for (let i = 0; i < basePairs; i++) {
      const a  = strand1[i];
      const b  = strand2[i];
      const s1 = new THREE.Mesh(sphereGeo, mat.strand1);
      s1.position.copy(a);
      dnaGroup.add(s1);
      const s2 = new THREE.Mesh(sphereGeo, mat.strand2);
      s2.position.copy(b);
      dnaGroup.add(s2);
      dnaGroup.add(cylinder(a, b, 0.05 * SCALE, i % 2 === 0 ? mat.rungA : mat.rungB));
    }
  }

  // ── Controladores XR ──
  const ctrl0 = renderer.xr.getController(0); // direito → +bp
  const ctrl1 = renderer.xr.getController(1); // esquerdo → -bp
  [ctrl0, ctrl1].forEach((ctrl) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);
    ctrl.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x44ff88, opacity: 0.4, transparent: true })));
    rig.group.add(ctrl); // acompanham o rig, como a câmera
  });

  // ── Estado ──
  let currentBP = 14;

  const api: XRDnaScene = {
    vrButton,
    onBasePairsChange: null,
    setBasePairs(n: number) { currentBP = clampBP(n); rebuild(currentBP); },
    dispose,
  };

  function clampBP(n: number) { return Math.max(MIN_BP, Math.min(MAX_BP, n)); }

  function rebuild(bp: number) {
    buildGeometry(bp);
    drawLabel(bp);
    api.onBasePairsChange?.(bp);
  }

  ctrl0.addEventListener('selectstart', () => {
    currentBP = clampBP(currentBP + 2);
    rebuild(currentBP);
  });
  ctrl1.addEventListener('selectstart', () => {
    currentBP = clampBP(currentBP - 2);
    rebuild(currentBP);
  });

  // ── Resize ──
  const ro = new ResizeObserver(() => {
    if (renderer.xr.isPresenting) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  // ── Init ──
  rebuild(currentBP);

  // ── Loop ──
  let last = 0;
  renderer.setAnimationLoop((t: number) => {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    const pad = rig.tick(dt);
    if (pad.justPressed('a')) api.setBasePairs(currentBP + 2);
    if (pad.justPressed('b')) api.setBasePairs(currentBP - 2);
    dnaGroup.rotation.y += 0.15 * dt * Math.PI * 2; // rotação lenta contínua
    controls.update();
    renderer.render(scene, camera);
  });

  function dispose() {
    renderer.setAnimationLoop(null);
    ro.disconnect();
    rig.dispose();
    controls.dispose();
    sphereGeo.dispose();
    bgGeo.dispose();
    disposables.forEach((g) => g.dispose());
    Object.values(mat).forEach((m) => m.dispose());
    labelTex.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return api;
}
