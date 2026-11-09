# Dupla Hélice de DNA — WebXR (Realidade Virtual)

| | |
|---|---|
| **id** (`registry.ts`) | `xr-dna-helix` |
| **Área** | Biologia — Biologia molecular |
| **Modalidade** | **VR** (WebXR `immersive-vr`) com fallback desktop |
| **Arquivos** | `scene.ts` (259 linhas) · `index.tsx` (135) — sem `physics.ts` |
| **Dependências** | `three`, `VRButton`, `OrbitControls`, `react` |
| **Requer** | Headset compatível com WebXR, HTTPS |

## 1. Objetivo pedagógico

Experiência de escala: o aluno fica diante de uma molécula de DNA com cerca de **12 metros de altura** e quase 8 m de diâmetro, e pode olhar para cima e ao redor.

## 2. Modelo científico

O mesmo da versão desktop (hélice B-DNA paramétrica, 10 pb/volta, fitas defasadas 180° — ver `DnaHelix/README.md`), mas **reimplementado** dentro de `scene.ts` (função `computeHelix`) com fator de escala:

| Constante | Desktop | VR (este) |
|---|---|---|
| `SCALE` | — | 2,5 |
| Raio | 1,5 | 3,75 m |
| Subida por pb | 0,34 | 0,85 m |
| Pares padrão | 20 | 14 (~11,9 m de altura) |
| Faixa | 4–40 | 6–30, passo 2 |
| Posição | origem | `(0, 0, −6)` — 6 m à frente |
| Rotação | 0–0,5 volta/s (slider) | 0,15 volta/s fixa |

Com a hélice centralizada em y = 0 e o *reference space* `local-floor` (y = 0 é o chão), metade da hélice fica "abaixo do piso" e o usuário em pé (olhos a ~1,6 m) vê a região central.

## 3. Arquitetura

Mesmo padrão das demais cenas XR:

```
index.tsx                                   scene.ts
─────────                                   ────────
<div ref=containerRef> ───────────────────▶ createXRDnaScene(container)
<div ref=vrBtnRef> ◀── appendChild ──────── vrButton
estado: basePairs ◀── onBasePairsChange ─── gatilhos XR (+2 / −2)
slider (6–30, passo 2) ───────────────────▶ setBasePairs(n)  (com clamp)
```

## 4. Construção da cena

| Elemento | Detalhe |
|---|---|
| Renderer | `xr.enabled`, fundo verde muito escuro `0x020d06` |
| Luzes | ambiente forte (2,0), direcional de cima, `PointLight` verde lateral, direcional de preenchimento |
| Partículas | 1000 pontos verdes semitransparentes num cubo de 200 m (sensação de meio líquido/celular) |
| Hélice | mesma construção do desktop (Catmull-Rom + `TubeGeometry`, esferas compartilhadas, cilindros orientados por quaternion), todas as espessuras multiplicadas por `SCALE` |
| Painel 3D | `CanvasTexture` 512×160 px num plano de 4 × 1,25 m acima da hélice: título, nº de pares, instrução dos gatilhos |
| Controles | dois controladores com raio laser de 5 m |

## 5. Laço

`renderer.setAnimationLoop` com `dt` limitado a 50 ms; `dnaGroup.rotation.y += 0.15 · dt · 2π`.

## 6. Interação

| Contexto | Entrada | Efeito |
|---|---|---|
| Desktop | Slider pares de base | `setBasePairs` |
| Desktop | Mouse | OrbitControls |
| VR | Gatilho do controle 0 | +2 pares (máx. 30) |
| VR | Gatilho do controle 1 | −2 pares (mín. 6) |
| VR com controle de videogame | Analógico esquerdo / direito | Anda na direção do olhar / gira o corpo (`core/gamepadRig.ts`) |
| VR com controle de videogame | RT / LT | Sobe / desce ao longo da hélice |
| VR com controle de videogame | A / B | +2 / −2 pares |

## 7. Limitações e problemas conhecidos

- **Painel na altura errada** (D5): `drawLabel` calcula `h = 14 · RISE_XR / 2` com **14 fixo** em vez de `bp`. Com 30 pares (hélice de 25,5 m) o painel fica a ~7,5 m, dentro da hélice. Correção: `const h = bp * RISE_XR / 2;`.
- Matemática da hélice duplicada de `DnaHelix/physics.ts` (D3).
- Controle 0/1 não garantidamente direita/esquerda (D17).
- Hélice centralizada no y = 0 do chão: metade dela fica abaixo do piso virtual. Talvez fosse melhor `DNA_ORIGIN.y = altura/2`.

## 8. Ideias para o TCC2

- Reusar `computeDnaHelix` parametrizado (ver `DnaHelix/README.md §8`).
- "Elevador": o usuário sobe/desce ao longo da hélice com o *thumbstick*.
- Pegar e girar a hélice com a mão (`XRHand` + pinça).
