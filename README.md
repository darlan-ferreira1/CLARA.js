# CLARA.js

**Centro de Laboratórios para Aprendizagem e Representação Analítica** — uma plataforma web de laboratórios virtuais de Física, Química e Biologia, desenvolvida como Trabalho de Conclusão de Curso (TCC) em Ciência da Computação.

Os experimentos rodam inteiramente no navegador, sem instalação e sem servidor: no computador, no celular, em realidade aumentada, em realidade virtual e com interação por gestos pela webcam.

Site publicado: https://darlan-ferreira1.github.io/CLARA.js/

## A proposta

A contribuição do trabalho para a Ciência da Computação é a **arquitetura de software** da plataforma: uma forma de organizar experimentos científicos para que **o mesmo modelo** funcione em diferentes formas de apresentação e de interação. O site é a prova de conceito dessa arquitetura.

## Como explorar

| Modo | O que é |
|---|---|
| **Galeria** | Todos os experimentos em cards, com busca e filtro por área. Cada experimento tem controles de parâmetros e dois botões: **Teoria** (o conteúdo para o aluno) e **Como foi feito** (a documentação técnica). |
| **Museu Virtual** | O **Museu CLARA.js**: um ambiente 3D em primeira pessoa (WASD + mouse no computador, joystick na tela do celular). Cada porta leva à **sala interativa** de um experimento, onde ele aparece em tamanho real e pode ser ajustado (Tab / ⚙). |

## Experimentos

| Área | Experimento | Modalidades |
|---|---|---|
| Física | Pêndulo Simples | Página · Sala interativa |
| Física | Lançamento de Projétil | Página |
| Física | Sistema Solar | Página |
| Física | Ondas Mecânicas | Página |
| Física | **Você é o Móvel** (cinemática com a mão) | Webcam (MediaPipe) |
| Química | Modelo de Bohr | Página · Sala interativa · VR · AR |
| Química | Geometria Molecular (VSEPR) | Página · Sala interativa · AR |
| Química | **Lei de Boyle com as Mãos** | Webcam (MediaPipe) |
| Biologia | Dupla Hélice de DNA | Página · Sala interativa · VR · AR |
| Biologia | Dissecação Guiada por Gestos | Webcam (MediaPipe) |

- **Realidade aumentada:** aponte o celular para o chão ou uma mesa, toque para posicionar o objeto e ajuste com os dedos (arrastar, pinça, girar). Requer Android com Chrome e ARCore.
- **Realidade virtual:** requer um headset compatível com WebXR.
- **Webcam:** sem câmera, o mouse funciona como alternativa.

Cada pasta de experimento tem um `README.md` explicando em detalhe como ele foi feito e um `teoria.md` com o conteúdo para o aluno. Os dois aparecem dentro do próprio site.

Os requisitos funcionais e não funcionais da plataforma estão em [`docs/REQUISITOS.md`](docs/REQUISITOS.md). A versão instalável (Windows, Linux e Android) e o funcionamento offline estão descritos em [`docs/DISTRIBUICAO.md`](docs/DISTRIBUICAO.md).

## Stack

- **React 19** + **TypeScript**: interface e composição das páginas
- **Vite 8**: servidor de desenvolvimento e build
- **Three.js**: renderização 3D (WebGL)
- **WebXR**: realidade virtual e aumentada (`immersive-vr`, `immersive-ar` com hit-test e dom-overlay)
- **MediaPipe Tasks Vision**: rastreamento das mãos pela webcam, direto no dispositivo
- **marked**: renderiza os textos em Markdown (Teoria / Como foi feito)
- **@vitejs/plugin-basic-ssl**: HTTPS no servidor de desenvolvimento (câmera e WebXR exigem contexto seguro)
- Deploy automático no **GitHub Pages** via GitHub Actions

## Arquitetura

### Experimentos em três camadas

Cada experimento fica numa pasta própria em `src/simulations/<área>/<Nome>/`:

| Arquivo | Responsabilidade |
|---|---|
| `physics.ts` | **Domínio**: equações, integradores e tabelas. TypeScript puro, sem Three.js nem React, testável isoladamente. |
| `scene.ts` | **Apresentação**: monta o experimento em 3D (Three.js) ou 2D (canvas). Não conhece React. |
| `index.tsx` | **Página**: componente React com os controles; cria a cena, repassa os parâmetros e a libera ao sair. |
| `teoria.md` / `README.md` | Conteúdo para o aluno e documentação técnica. |

### Contrato montável e hospedeiros

Os experimentos mais recentes seguem um **contrato montável** (`src/core/mountable.ts`): o experimento só sabe montar seus objetos num grupo (`mount`), avançar no tempo (`tick`), reagir a parâmetros (`update`) e se liberar (`dispose`). Renderer, câmera, luzes e laço de animação são fornecidos por quem o **hospeda**:

```
                    ┌─► hostInPage        página do experimento (Galeria)
experimento ────────┼─► sala interativa   Museu Virtual        (sala.ts)
(mount/tick/...)    └─► hostInAR          realidade aumentada  (ar.ts)
```

Assim, o mesmo Modelo de Bohr aparece na página, no Museu Virtual e em AR sem duplicar código. Dar AR ou uma sala a um experimento montável custa um arquivo de definição curto (`ar.ts` ou `sala.ts`).

### Estrutura de pastas

```
src/
├── App.tsx                 # roteamento por hash (#/simple-pendulum) + tema
├── main.tsx                # ponto de entrada
├── index.css               # variáveis de tema (escuro/claro)
├── pages/
│   ├── ModeSelect.tsx      # tela inicial: Galeria × Museu Virtual
│   ├── Home.tsx            # Galeria (busca, filtro por área)
│   └── About.tsx           # página Sobre
├── core/
│   ├── mountable.ts        # contrato montável
│   ├── hostInPage.ts       # hospedeiro "página"
│   ├── controls.ts         # controles declarativos (ControlDef)
│   └── handTracking.ts     # rastreamento de mãos (MediaPipe), comum aos experimentos de webcam
├── components/
│   ├── ExperimentShell/    # moldura de todo experimento: Teoria / Como foi feito / Voltar
│   ├── ControlsHud/        # painel de ajustes gerado a partir de ControlDef
│   └── handInput/          # gancho React que abre a webcam e o rastreador
├── museum/                 # Museu Virtual (planta, salas, controles de toque)
├── ar/                     # hospedeiro de realidade aumentada (hit-test, gestos)
└── simulations/
    ├── registry.ts         # fonte única dos metadados dos experimentos
    ├── physics/            # Pendulum, Projectile, SolarSystem, Waves, HandKinematics
    ├── chemistry/          # BohrModel, MolecularGeometry, BoyleHands
    │                       #   + xrBhorModel (VR), arBohrModel, arMolecularGeometry (AR)
    └── biology/            # DnaHelix, FrogDissection
                            #   + xrDnaHelix (VR), arDnaHelix (AR)
```

### Registro e navegação

- `src/simulations/registry.ts` é a fonte única dos experimentos: título, área, disponibilidade e pasta. A Galeria, as portas do Museu Virtual e os textos de Teoria / Como foi feito são gerados a partir dele.
- A navegação usa **hash + History API** (`#/bohr-model`): o botão voltar do navegador funciona, e cada experimento tem link direto. Usa-se hash porque o GitHub Pages não redireciona rotas desconhecidas para o `index.html`.
- As salas interativas (`sala.ts`) são descobertas automaticamente: basta o arquivo existir na pasta do experimento.

### Adicionar um experimento

1. Criar `src/simulations/<área>/<Nome>/` com `physics.ts`, `scene.ts`, `index.tsx`, `teoria.md` e `README.md`.
2. Adicionar a entrada em `registry.ts` (com `folder`).
3. Importar em `App.tsx` e adicionar o id a `PAGES` e à tabela `EXPERIMENTS`.
4. Opcional, se o experimento for montável: `sala.ts` (sala no Museu Virtual) e/ou uma variante com `ar.ts` (realidade aumentada).

## Rodando localmente

Dentro de `frontend/`:

```bash
npm install
npm run dev              # https://localhost:5173/CLARA.js/ (certificado autoassinado)
npm run dev -- --host    # idem, acessível por outros aparelhos da rede (ex.: celular)
npm run build            # tsc -b && vite build → dist/
npm run preview          # serve o build de produção localmente
npm run lint
```

O endereço tem `/CLARA.js/` no final porque o `vite.config.ts` define `base: '/CLARA.js/'` (o site é publicado como *project page* do GitHub Pages). Ao abrir no celular, aceite o aviso de certificado. Para testar AR, prefira o site publicado, que tem HTTPS válido.

## Deploy (GitHub Pages)

O workflow `.github/workflows/deploy.yml` roda a cada push na `main`: instala as dependências, executa `npm run build` em `frontend/` e publica `frontend/dist` no GitHub Pages. Nenhum comando manual é necessário.

Se o repositório for renomeado, o `base` do `vite.config.ts` precisa mudar junto.

## Limitações conhecidas

- **Realidade aumentada:** só no Android com Chrome e ARCore (o Safari do iPhone não implementa WebXR AR).
- **Experimentos de webcam:** o modelo do MediaPipe é baixado de CDN na primeira vez; sem internet, o mouse funciona como alternativa.
- **Bundle:** o pacote de produção passa de 500 kB por concentrar Three.js e todos os experimentos num único arquivo; carregar cada experimento sob demanda (`React.lazy`) resolveria.
- **Código não utilizado:** `src/components/ui/ExperimentCard.tsx` e `ExperimentDetails.tsx` não são usados pelo fluxo atual.
