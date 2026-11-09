# Modelo de Bohr — WebXR (Realidade Virtual)

| | |
|---|---|
| **id** (`registry.ts`) | `xr-bohr-model` |
| **Área** | Química — Estrutura atômica |
| **Modalidade** | **VR** (WebXR `immersive-vr`) com fallback desktop |
| **Arquivos** | `scene.ts` (299 linhas) · `index.tsx` (143) — **sem `physics.ts` próprio** |
| **Dependências** | `three`, `VRButton`, `OrbitControls`, `react`, `../BohrModel/physics` |
| **Requer** | Headset compatível com WebXR (ex.: Meta Quest com o navegador Meta), contexto HTTPS |

> Atenção: o nome da pasta tem erro de grafia (`xrBhorModel`, "Bhor"). O import em `App.tsx` usa esse nome.

## 1. Objetivo pedagógico

Colocar o aluno **dentro** do átomo. Com a camada 1 a 2 metros do núcleo e as demais a 8 m, 18 m e 32 m, os elétrons passam ao redor da cabeça do usuário.

## 2. Modelo científico — reutilizado

Este experimento **não tem física própria**. Ele importa do experimento desktop:

```ts
import { computeElectronPositions, shellRadius } from '../BohrModel/physics';
```

É o principal exemplo no projeto de **reuso da camada de domínio entre modalidades**: a mesma função gera as posições; muda só a escala e a velocidade:

| Parâmetro | Desktop | VR (este) |
|---|---|---|
| `baseRadius` | 2,0 (unidades) | 2,0 **metros** |
| `baseOmega` | 2,0 rad/s | 0,7 rad/s (mais lento, evita enjoo) |
| Posição do átomo | origem | `(0; 1,6; −4)` — 4 m à frente, na altura dos olhos |

Ver `BohrModel/README.md` para as equações (r ∝ n², ω ∝ 1/n³).

## 3. Arquitetura do experimento

```
index.tsx                                    scene.ts
─────────                                    ────────
<div ref=containerRef>  ───────────────────▶ createXRBohrScene(container)
                                               cria o próprio <canvas>
<div ref=vrBtnRef> ◀── appendChild ────────── vrButton (VRButton.createButton)
estado: elemIndex   ◀── onElementChange ───── gatilhos dos controles XR
select de elemento ────────────────────────▶ setElement(idx)
desmontagem ───────────────────────────────▶ dispose()
```

Diferenças em relação ao contrato desktop:

- Recebe um **container** em vez de um canvas: a cena cria o `WebGLRenderer` sem canvas e insere `renderer.domElement` no container.
- Expõe `vrButton` (um elemento HTML) para o React reposicionar. O `index.tsx` sobrescreve o CSS absoluto padrão do VRButton (`position: relative`, `left/bottom/right: unset`) e o coloca no painel inferior.
- Comunicação **bidirecional**: React → cena via `setElement`; cena → React via a propriedade `onElementChange` (callback atribuído depois da criação), porque o elemento pode mudar por um gatilho do controle VR, fora do React.

## 4. Construção da cena

| Elemento | Detalhe |
|---|---|
| Renderer | `renderer.xr.enabled = true`; fundo `0x050510` |
| Câmera | `PerspectiveCamera(70°, near 0,01, far 500)` em `(0; 1,6; 4)` — usada só fora da sessão; dentro dela o Three.js usa a pose do headset |
| OrbitControls | alvo no átomo; **desligados no `sessionstart`** e religados no `sessionend` |
| Luzes | ambiente forte (1,8), `PointLight` azulada no núcleo, duas direcionais — mais intensas que no desktop porque em VR o fundo é escuro e a escala é grande |
| Estrelas | 1000 pontos aleatórios num cubo de 300 m |
| Átomo | `atomGroup` posicionado em `ATOM_POS`; filhos: núcleo, elétrons, órbitas (mesma lógica do desktop: núcleo com xorshift + rejeição, órbitas inclinadas, elétron rotacionado pela inclinação) |
| Painel 3D | **`CanvasTexture`**: um `<canvas>` 2D de 512×192 px é desenhado com `fillText` (símbolo, nome, Z, A, camadas, instrução dos gatilhos) e usado como textura de um `PlaneGeometry(2,8 × 1,05)` flutuando 4,2 m acima do núcleo. `needsUpdate = true` reenvia a textura quando o elemento muda |
| Controles | `renderer.xr.getController(0)` e `(1)` com uma linha de 5 m (raio laser visual) |

**Por que `CanvasTexture`?** Dentro do headset o HTML da página não é exibido. Desenhar o texto num canvas 2D e usar como textura é a forma mais simples de ter UI legível dentro do mundo 3D (UI diegética).

## 5. Laço de animação

```ts
renderer.setAnimationLoop(() => {
  simTime += clock.getDelta();
  updateElectrons(XR_ELEMENTS[elemIndex][4], simTime);
  controls.update();
  renderer.render(scene, camera);
});
```

`setAnimationLoop` é **obrigatório** para WebXR: durante a sessão, o Three.js passa a usar o `requestAnimationFrame` da `XRSession`, que dispara na taxa do headset (72/90/120 Hz) e entrega a pose de cada olho.

O `ResizeObserver` ignora mudanças enquanto `renderer.xr.isPresenting` (o tamanho é controlado pelo headset).

## 6. Interação

| Contexto | Entrada | Efeito |
|---|---|---|
| Desktop | Select "Elemento" | `setElement(idx)` |
| Desktop | Mouse | OrbitControls |
| Desktop | Botão "ENTER VR" | Inicia a sessão imersiva |
| VR | Gatilho do controle 0 (`selectstart`) | Próximo elemento (cíclico) |
| VR | Gatilho do controle 1 | Elemento anterior |
| VR | Movimento da cabeça / andar | Explora o átomo (6DoF) |
| VR com controle de videogame | Analógico esquerdo / direito | Anda na direção do olhar / gira o corpo (`core/gamepadRig.ts`) |
| VR com controle de videogame | RT / LT | Sobe / desce |
| VR com controle de videogame | A / B | Próximo elemento / anterior |

## 7. Decisões e simplificações

- Átomo fixo no espaço; o usuário se move fisicamente ou gira a cabeça.
- Sem locomoção artificial (teletransporte), para evitar enjoo.
- O fundo escuro fixo ignora o tema claro/escuro da aplicação.

## 8. Limitações e problemas conhecidos

- **Controle 0 ≠ necessariamente mão direita** (D17): a ordem depende do runtime. O correto é ler `handedness` no evento `connected`.
- Tabela `XR_ELEMENTS` duplicada de `BohrModel/index.tsx` (D3).
- Funções `seededRng` e a construção do átomo duplicadas do desktop.
- `Clock.getDelta()` sem teto.
- Camada 4 (K, Ca) tem 32 m de raio — fica muito longe para ser apreciada.

## 9. Ideias para o TCC2

- Extrair `buildAtom()` para um módulo compartilhado pelas 3 variantes, parametrizado por escala — reduz ~150 linhas duplicadas e vira métrica de reuso.
- *Hand tracking* do WebXR (`XRHand`): pinçar um elétron com a mão real, reaproveitando a ideia do `PinchState` da Dissecação.
- Testar sem headset com a extensão **Immersive Web Emulator** (Chrome) — útil para capturas de tela da monografia.
