// Cena WebXR do Modelo de Bohr.
//
// O átomo é posicionado 4 m à frente do ponto de origem do XR (0, 1.6, -4),
// de modo que a câmera do headset (cabeça do usuário) esteja próxima ao núcleo.
// Shell 1 = 2 m de raio → elétrons passam ao redor do usuário em VR.
//
// No modo desktop (não-XR): OrbitControls normais funcionam.
// No modo XR: OrbitControls são desativados; o usuário gira a cabeça para observar.
//   Gatilho direito (ctrl 0) → próximo elemento.
//   Gatilho esquerdo (ctrl 1) → elemento anterior.
// Com controle de videogame (core/gamepadRig.ts): os analógicos andam e giram
// dentro da RV, RT/LT sobem e descem, A → próximo elemento, B → anterior.

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGamepadRig } from '../../../core/gamepadRig';
import { computeElectronPositions, shellRadius } from '../BohrModel/physics';
import { ELEMENTS } from '../BohrModel/elements';

// Tabela compartilhada com as outras variantes do Bohr.
export const XR_ELEMENTS = ELEMENTS;

const BASE_RADIUS = 2.0;
const BASE_OMEGA  = 0.7;
const ATOM_POS    = new THREE.Vector3(0, 1.6, -4);

export interface XRBohrScene {
  vrButton: HTMLElement;
  onElementChange: ((index: number) => void) | null;
  setElement(index: number): void;
  dispose(): void;
}

export function createXRBohrScene(container: HTMLDivElement): XRBohrScene {
  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x050510);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const vrButton = VRButton.createButton(renderer);

  // ── Cena e câmera ──
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.01, 500);
  camera.position.set(0, 1.6, 4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(ATOM_POS);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  renderer.xr.addEventListener('sessionstart', () => { controls.enabled = false; });
  renderer.xr.addEventListener('sessionend',   () => { controls.enabled = true; });

  // Câmera dentro de um rig que o controle de videogame move durante a RV.
  const rig = createGamepadRig(renderer, scene, camera);

  // ── Iluminação ──
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const nucleusLight = new THREE.PointLight(0x6688ff, 10, 120);
  nucleusLight.position.copy(ATOM_POS);
  scene.add(nucleusLight);
  const rimLight = new THREE.DirectionalLight(0xaaaaff, 2.5);
  rimLight.position.set(-5, 10, 5);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
  fillLight.position.set(5, -8, -5);
  scene.add(fillLight);

  // ── Estrelas ──
  const starPositions = new Float32Array(3000);
  for (let i = 0; i < 1000; i++) {
    starPositions[i * 3]     = (Math.random() - 0.5) * 300;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 300;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true })));

  // ── Materiais ──
  const protonMat   = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3, metalness: 0.4 });
  const neutronMat  = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.5, metalness: 0.2 });
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0x3498db, emissive: 0x1a4488, emissiveIntensity: 0.9,
    roughness: 0.2, metalness: 0.5,
  });
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x2a3a55, transparent: true, opacity: 0.5 });

  // ── Grupos do átomo ──
  const atomGroup     = new THREE.Group();
  atomGroup.position.copy(ATOM_POS);
  scene.add(atomGroup);
  const nucleusGroup   = new THREE.Group();
  const electronsGroup = new THREE.Group();
  const orbitsGroup    = new THREE.Group();
  atomGroup.add(nucleusGroup, electronsGroup, orbitsGroup);

  // Geometrias de nêutrons/prótons e elétrons (compartilhadas entre rebuilds)
  const nucleonGeo  = new THREE.SphereGeometry(0.2,  16, 12);
  const electronGeo = new THREE.SphereGeometry(0.16, 16, 12);

  // Geometrias de órbita geradas a cada rebuild
  let orbitDisposables: THREE.BufferGeometry[] = [];

  // ── Painel flutuante (CanvasTexture) ──
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width  = 512;
  labelCanvas.height = 192;
  const labelCtx = labelCanvas.getContext('2d')!;
  const labelTex  = new THREE.CanvasTexture(labelCanvas);
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.05),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  labelMesh.position.set(ATOM_POS.x, ATOM_POS.y + 4.2, ATOM_POS.z);
  scene.add(labelMesh);

  function drawLabel(symbol: string, name: string, Z: number, A: number, shells: number[]) {
    const w = 512, h = 192;
    labelCtx.clearRect(0, 0, w, h);
    labelCtx.fillStyle = 'rgba(5,5,20,0.88)';
    labelCtx.fillRect(6, 6, w - 12, h - 12);
    labelCtx.fillStyle = '#3498db';
    labelCtx.font = 'bold 76px sans-serif';
    labelCtx.textAlign = 'left';
    labelCtx.textBaseline = 'top';
    labelCtx.fillText(symbol, 20, 8);
    labelCtx.fillStyle = '#e0e0f0';
    labelCtx.font = 'bold 28px sans-serif';
    labelCtx.fillText(name, 132, 12);
    labelCtx.fillStyle = '#7788aa';
    labelCtx.font = '22px sans-serif';
    labelCtx.fillText(`Z=${Z}  A=${A}  [ ${shells.join(', ')} ]`, 132, 52);
    labelCtx.fillStyle = '#334455';
    labelCtx.font = '18px sans-serif';
    labelCtx.textAlign = 'center';
    labelCtx.fillText('◄ Gatilho esq. ou B   Elemento   Gatilho dir. ou A ►', w / 2, 152);
    labelTex.needsUpdate = true;
  }

  // ── Controladores XR ──
  const ctrl0 = renderer.xr.getController(0); // direito → próximo
  const ctrl1 = renderer.xr.getController(1); // esquerdo → anterior
  [ctrl0, ctrl1].forEach((ctrl) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);
    ctrl.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x88aaff, opacity: 0.4, transparent: true })));
    rig.group.add(ctrl); // acompanham o rig, como a câmera
  });

  // ── Estado ──
  let elemIndex = 5; // Carbono por padrão
  let simTime   = 0;

  const api: XRBohrScene = {
    vrButton,
    onElementChange: null,
    setElement(idx: number) { elemIndex = idx; applyElement(idx); },
    dispose,
  };

  ctrl0.addEventListener('selectstart', () => {
    elemIndex = (elemIndex + 1) % XR_ELEMENTS.length;
    applyElement(elemIndex);
  });
  ctrl1.addEventListener('selectstart', () => {
    elemIndex = (elemIndex - 1 + XR_ELEMENTS.length) % XR_ELEMENTS.length;
    applyElement(elemIndex);
  });

  // ── Construção do átomo ──
  function seededRng(seed: number) {
    let s = seed === 0 ? 1 : seed;
    return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
  }

  function buildAtom(protons: number, neutrons: number, shells: number[]) {
    nucleusGroup.clear();
    electronsGroup.clear();
    orbitsGroup.clear();
    orbitDisposables.forEach((g) => g.dispose());
    orbitDisposables = [];

    // Núcleo
    const total    = protons + neutrons;
    const clusterR = Math.max(0.2, 0.28 * Math.cbrt(total));
    const rng      = seededRng(protons * 100 + neutrons);
    for (let i = 0; i < total; i++) {
      let px = 0, py = 0, pz = 0;
      do {
        px = (rng() * 2 - 1) * clusterR;
        py = (rng() * 2 - 1) * clusterR;
        pz = (rng() * 2 - 1) * clusterR;
      } while (px * px + py * py + pz * pz > clusterR * clusterR);
      const m = new THREE.Mesh(nucleonGeo, i < protons ? protonMat : neutronMat);
      m.position.set(px, py, pz);
      nucleusGroup.add(m);
    }

    // Órbitas + elétrons
    const tiltAngles = [0, 15, 30, 45, 60, 75, 90].map((d) => (d * Math.PI) / 180);
    shells.forEach((count, si) => {
      if (count === 0) return;
      const r    = shellRadius(si, BASE_RADIUS);
      const tilt = tiltAngles[si % tiltAngles.length];
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (2 * Math.PI * i) / 128;
        pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)));
      }
      const geo  = new THREE.BufferGeometry().setFromPoints(pts);
      orbitDisposables.push(geo);
      const ring = new THREE.LineLoop(geo, orbitMat);
      ring.rotation.x = tilt;
      orbitsGroup.add(ring);
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(electronGeo, electronMat);
        m.userData = { shellIndex: si, tilt };
        electronsGroup.add(m);
      }
    });
  }

  function updateElectrons(shells: number[], t: number) {
    const states  = computeElectronPositions({ shells, baseRadius: BASE_RADIUS, baseOmega: BASE_OMEGA }, t);
    const meshes  = electronsGroup.children as THREE.Mesh[];
    states.forEach((s, i) => {
      if (!meshes[i]) return;
      const { tilt } = meshes[i].userData as { tilt: number };
      meshes[i].position.set(s.x, -s.z * Math.sin(tilt), s.z * Math.cos(tilt));
    });
  }

  function applyElement(idx: number) {
    const [sym, name, p, n, shells] = XR_ELEMENTS[idx];
    buildAtom(p, n, shells);
    drawLabel(sym, name, p, p + n, shells);
    api.onElementChange?.(idx);
  }

  // ── Resize ──
  const ro = new ResizeObserver(() => {
    if (renderer.xr.isPresenting) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  // ── Init ──
  applyElement(elemIndex);

  // ── Loop de animação (setAnimationLoop é obrigatório para XR) ──
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    simTime += dt;
    const pad = rig.tick(Math.min(dt, 0.05));
    if (pad.justPressed('a')) api.setElement((elemIndex + 1) % XR_ELEMENTS.length);
    if (pad.justPressed('b')) api.setElement((elemIndex - 1 + XR_ELEMENTS.length) % XR_ELEMENTS.length);
    updateElectrons(XR_ELEMENTS[elemIndex][4], simTime);
    controls.update();
    renderer.render(scene, camera);
  });

  function dispose() {
    renderer.setAnimationLoop(null);
    ro.disconnect();
    rig.dispose();
    controls.dispose();
    protonMat.dispose();
    neutronMat.dispose();
    electronMat.dispose();
    orbitMat.dispose();
    nucleonGeo.dispose();
    electronGeo.dispose();
    starGeo.dispose();
    orbitDisposables.forEach((g) => g.dispose());
    labelTex.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return api;
}
