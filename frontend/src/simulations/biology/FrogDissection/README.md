# Dissecação Guiada por Gestos

| | |
|---|---|
| **id** (`registry.ts`) | `frog-dissection` |
| **Área** | Biologia — Anatomia comparada / Zoologia |
| **Modalidade** | **Interação natural por gestos** (visão computacional na webcam) com fallback de mouse/toque |
| **Arquivos** | `gestures.ts` (77 linhas) · `scene.ts` (315) · `index.tsx` (236) — sem `physics.ts` |
| **Dependências** | `three`, `@mediapipe/tasks-vision@1.0.1`, `react` |
| **Requer** | Webcam + HTTPS (para `getUserMedia`); internet na primeira carga (WASM e modelo vêm de CDN) |
| **Status** | "Etapa 1" (último commit do repositório) |

## 1. Objetivo pedagógico

Simular uma dissecação de sapo **sem animal real e sem mouse**: o aluno faz o gesto de pinça (polegar + indicador) na frente da webcam para abrir a pele e retirar 5 órgãos (coração, pulmões, fígado, estômago, intestino), arrastando-os para uma bandeja. Une uma alternativa ética à dissecação real com interação natural.

## 2. Visão geral da arquitetura

Este é o experimento com a arquitetura mais rica do projeto, porque tem uma **camada de entrada** separada:

```
          ┌─────────────────────── index.tsx (React) ────────────────────────┐
          │                                                                   │
 webcam ──┼─▶ <video> (espelhado)                                             │
          │        │                                                          │
          │        ▼  loop rAF (input)                                        │
          │   pointer.down? ──sim──▶ PinchState do mouse ─┐                   │
          │        │ não                                  │                   │
          │        ▼                                      ▼                   │
          │   tracker.detect(video, now) ──▶ PinchState ──▶ scene.updatePinch │
          │   (gestures.ts / MediaPipe)                        │              │
          │                                                    │ onOpenChange │
          │   estado React: opened, extracted ◀────────────────┘ onExtract    │
          └───────────────────────────────────────────────────────────────────┘
                                   scene.ts: setAnimationLoop (render + animação da pele)
```

### O contrato de entrada `PinchState`

```ts
interface PinchState {
  tracking: boolean;  // há uma mão (ou o mouse) controlando agora
  pinching: boolean;  // pinça fechada
  x: number;          // posição em NDC [-1, 1] (coordenadas normalizadas de tela)
  y: number;
}
```

A cena **não sabe** de onde vem a entrada. Mouse e rede neural produzem o mesmo objeto. Isso é o padrão *Adapter*/*Strategy* aplicado à entrada e é o que permite a **degradação graciosa**: sem câmera ou sem modelo, o experimento continua funcional com mouse ou toque.

## 3. `gestures.ts` — detecção da pinça com MediaPipe

### Inicialização

```ts
const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);           // runtime WASM (jsDelivr)
const landmarker = await HandLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },              // modelo .task (Google Storage)
  runningMode: 'VIDEO',                                                     // otimizado p/ quadros sequenciais
  numHands: 1,
});
```

No app de Linux (WebKitGTK), o `OffscreenCanvas` padrão do MediaPipe não tem WebGL. Por isso `core/handTracking.ts` entrega um `<canvas>` comum nesse caso.

O **Hand Landmarker** do MediaPipe é um pipeline de duas redes neurais (detector de palma + regressor de pontos) que devolve **21 *landmarks*** 3D por mão, normalizados em [0, 1] relativos ao quadro do vídeo.

### Pontos usados

| Índice | Ponto anatômico | Uso |
|---|---|---|
| 0 | Punho | escala da mão |
| 4 | Ponta do polegar | pinça |
| 8 | Ponta do indicador | pinça |
| 9 | Articulação MCP do dedo médio | escala da mão |

### Algoritmo

1. **Distância da pinça normalizada** (invariante à distância da câmera):
   ```
   ratio = |p4 − p8| / |p0 − p9|
   ```
   Se a mão se afasta da câmera, as duas distâncias diminuem juntas e a razão se mantém.
2. **Histerese** (*Schmitt trigger*):
   ```
   se estava pinçando:  pinching = ratio < 0,45   (PINCH_EXIT)
   senão:               pinching = ratio < 0,35   (PINCH_ENTER)
   ```
   Dois limiares evitam que o ruído do detector faça a pinça "piscar" quando a razão está perto do limite.
3. **Ponto da pinça** = ponto médio entre polegar e indicador.
4. **Conversão para NDC espelhado**:
   ```
   x = (1 − midX)·2 − 1     ← espelha porque o vídeo é exibido como selfie (scaleX(-1))
   y = −(midY·2 − 1)        ← Y de imagem cresce para baixo; Y de NDC cresce para cima
   ```

## 4. `scene.ts` — o sapo e a máquina de estados

### Modelagem 3D (procedural, sem arquivos de modelo)

O sapo é montado só com primitivas do Three.js:

| Parte | Geometria |
|---|---|
| Bandeja | `BoxGeometry(4,4 × 0,06 × 2,4)` |
| Corpo | esfera achatada (`scale 1,15 × 0,55 × 1,65`) |
| Cabeça, olhos | esferas escaladas |
| Patas | 4 `CapsuleGeometry` inclinadas |
| Pele dorsal ("portas") | 2 **meias-calotas** de esfera (`SphereGeometry` com `phiStart/phiLength/thetaLength` parciais) dentro de grupos-pivô `pivotLeft/pivotRight` |
| Alvo da incisão | `BoxGeometry` **invisível** (opacidade 0) sobre a linha média do dorso — existe só para o raycaster |
| Órgãos | coração e pulmões (esferas), fígado (`IcosahedronGeometry`, aspecto facetado), estômago (`CapsuleGeometry`), intestino (`TubeGeometry` sobre uma curva Catmull-Rom sinuosa) |
| Cursor | `TorusGeometry`: verde = aberto, amarelo = pinçando |

O renderer é criado com `alpha: true` e fundo transparente; o canvas fica **por cima do `<video>`** — é uma "realidade aumentada" 2D simples (o sapo aparece sobre a imagem da webcam).

Todos os recursos passam por `track()`, que os coloca numa lista liberada no `dispose()`.

### Máquina de estados

```
                  pinça (borda de subida) sobre incisionTarget
   ┌─────────┐ ─────────────────────────────────────────────▶ ┌────────┐
   │ Fechado │                                                │ Aberto │◀──────────────┐
   └─────────┘ ◀───────────────── reset() ─────────────────── └───┬────┘               │
                                                                  │ pinça sobre órgão  │
                                                                  ▼                    │
                                                           ┌────────────┐  solta:      │
                                                           │ Arrastando │──x ≤ 1,05 → volta pra casa
                                                           └────────────┘──x > 1,05 → extraído (bandeja)
```

Detalhes da implementação (`updatePinch`):

- **Detecção de borda**: ações só disparam na transição `!wasPinching → pinching` (o "clique" da pinça), não enquanto a pinça está fechada.
- **Raycasting**: `raycaster.setFromCamera(ndc, camera)` transforma o ponto 2D da pinça num raio 3D; `intersectObject(incisionTarget)` e `intersectObjects(órgãos)` testam o que está "embaixo do dedo".
- **Arrasto em plano**: enquanto arrasta, o raio é intersectado com um **plano de profundidade constante** (`Plane` com normal (0,0,1) na profundidade do órgão). O ponto de interseção, convertido para o espaço local do sapo (`frogGroup.worldToLocal`), vira a nova posição do órgão. Isso transforma um gesto 2D em movimento 3D previsível.
- **Extração**: ao soltar, se o X mundial do órgão > `EXTRACT_X − 0,5` (= 1,05), ele é marcado `extracted`, encaixa na sua posição da bandeja (`trayPos`, um slot por órgão) e dispara `onExtract(id)`; senão volta para `home`.
- **Perda de rastreamento**: se `tracking` vira false durante o arrasto, o órgão é solto (`releaseDrag`).

### Animação da pele

No `setAnimationLoop`, um **amortecimento exponencial** leva `flapProgress` de 0 a 1:

```ts
flapProgress += (alvo − flapProgress) · min(dt·4, 1);
pivotRight.rotation.z = −1,9 · flapProgress;   // ~109°
pivotLeft.rotation.z  = +1,9 · flapProgress;
if (flapProgress > 0,35) órgãos ficam visíveis;
```

É uma interpolação "ease-out" independente de FPS (aproximadamente).

## 5. `index.tsx` — orquestração

- Cria a cena e liga os callbacks `onOpenChange` → `setOpened` e `onExtract` → `setExtracted` (um `Set` de ids).
- `init()` assíncrono: tenta criar o `HandTracker`; tenta abrir a câmera (`facingMode: 'user'`). Cada falha liga uma *flag* de erro independente (`trackerError`, `cameraError`) e mostra uma faixa explicando que o mouse pode ser usado.
- Loop de **entrada** separado do loop de **render**: `requestAnimationFrame(loop)` lê o mouse (prioridade enquanto o botão está pressionado) ou chama `tracker.detect(video, performance.now())` se o vídeo tem dados (`readyState >= 2`).
- Eventos `onPointerDown/Move/Up/Leave` no container guardam a posição num `useRef` (sem re-render) — `touchAction: 'none'` evita rolagem em telas de toque.
- *Cleanup*: `cancelled = true` (se o componente desmontar antes da câmera abrir, a stream é parada assim que chega), cancela o rAF, fecha o landmarker, para as trilhas da câmera e faz `dispose()` da cena.
- Painel inferior: checklist dos 5 órgãos e botão "Reiniciar dissecação" (`scene.reset()`).

## 6. Interação

| Ação | Gesto | Mouse/toque |
|---|---|---|
| Mover o cursor | mão aberta na frente da câmera | (só com botão pressionado) |
| Abrir a pele | pinçar sobre a linha do dorso | clicar sobre a linha |
| Pegar órgão | pinçar sobre o órgão | clicar sobre o órgão |
| Extrair | arrastar para a direita e abrir os dedos | arrastar e soltar |
| Reiniciar | — | botão "Reiniciar dissecação" |

## 7. Decisões e simplificações

- Anatomia muito estilizada (formas primitivas, posições aproximadas).
- Câmera 3D fixa (sem OrbitControls, para não conflitar com o gesto).
- Só uma mão é rastreada.
- A incisão é instantânea (um "clique"), não um corte traçado.

## 8. Limitações e problemas conhecidos

- **Desalinhamento cursor × mão** (D16): o `<video>` usa `object-fit: cover`, que corta as bordas quando a proporção da câmera é diferente da área; as coordenadas do MediaPipe são do quadro inteiro.
- Comentário do topo diz "x > EXTRACT_X", o código usa `EXTRACT_X − 0,5` (D15).
- `detectForVideo` é chamado a cada frame de tela mesmo sem frame novo de vídeo (desperdício; `requestVideoFrameCallback` resolveria).
- WASM e modelo dependem de CDNs externas; sem internet só funciona o mouse.
- Bug sutil no `reset()`: ele põe `visible = false` nos órgãos, mas a pele fecha animada e, enquanto `flapProgress > 0,35`, o loop volta a pôr `visible = true` — e nada nunca desliga de novo. Depois do reset os órgãos ficam "visíveis" dentro do corpo, escondidos só por estarem dentro da esfera do corpo. Correção: `o.mesh.visible = flapProgress > 0.35` (atribuir nos dois sentidos).
- O mouse só move o cursor com o botão pressionado — não há "hover".

## 9. Ideias para o TCC2

- Etapa 2: incisão traçada (o aluno "desenha" a linha de corte e o sistema mede a precisão).
- Identificação: perguntar "qual é o fígado?" antes de deixar extrair (avaliação formativa).
- Modelo 3D real (glTF) do sapo e dos órgãos.
- Generalizar `PinchState` em uma interface `InputSource` usada também pelo *hand tracking* do WebXR — a mesma cena funcionaria com mãos reais num headset.
- Medir latência de ponta a ponta (quadro da câmera → cursor na tela) e FPS de inferência em diferentes máquinas: dado quantitativo forte para a monografia.
- Auto-hospedar o WASM e o `.task` em `public/` para funcionar offline.

## 10. Rastreamento de mão compartilhado (06/10/2026)

O carregamento do MediaPipe e a detecção dos 21 pontos da mão saíram deste `gestures.ts` e foram para o módulo comum `core/handTracking.ts`, usado também por "Você é o Móvel" e "Lei de Boyle com as Mãos". Aqui ficou só a regra **específica** da dissecação: transformar os pontos da mão num `PinchState` (razão polegar–indicador / palma, histerese, espelhamento).

O `index.tsx` e o `scene.ts` desta pasta **não mudaram**: o `createHandTracker()` manteve a mesma assinatura, só que agora por dentro usa o rastreador comum. Os experimentos novos já usam `coverMapping` para alinhar desenho e vídeo; a dissecação ainda não (débito D16 continua aqui).
