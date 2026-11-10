# Contexto para consertar a webcam no app Linux

Este arquivo foi escrito em uma sessão do Claude Code no Windows, para ser lido por uma sessão no Linux. Os arquivos de contexto habituais do projeto (`CLAUDE.md`, `ARQUITETURA.md`) não são versionados e não existem nesta máquina, então tudo o que é preciso está aqui.

**Tarefa:** fazer os 3 experimentos com webcam funcionarem no app Linux. A causa abaixo é uma hipótese, porque o bug nunca foi depurado em Linux. Confirme antes de corrigir.

## Regras do autor

- **Nunca** faça `git commit`, `git push` nem crie PR. O autor versiona sozinho.
- Responda em português (pt-BR), de forma curta e didática. O autor fez o projeto com muita ajuda de IA e não conhece todo o código.
- Comentários, documentação e textos de interface em português.
- Corrija só este bug. O atraso da webcam no Windows é outro problema e fica fora desta tarefa.
- Este repositório é público. Não escreva nele senhas, chaves ou dados pessoais.

## O projeto

CLARA.js é o TCC de Ciência da Computação do autor: uma SPA com experimentos 3D de Física, Química e Biologia para o ensino médio (React, TypeScript, Vite, Three.js, WebXR e MediaPipe). O código fica em `frontend/`.

O app de desktop usa **Tauri 2** (`frontend/src-tauri/`). O Rust é só uma casca: abre o WebView do sistema e carrega o mesmo `dist/` do site. Nenhuma lógica de experimento fica em Rust.

| Plataforma | WebView | Origem da página |
|---|---|---|
| Windows | WebView2 (Chromium) | app empacotado |
| Linux | **WebKitGTK** (motor do Safari, não Chromium) | `tauri://localhost` no build; `http://localhost:5173` no `tauri dev` |

Por isso, algo que funciona no Windows e no site pode falhar só no Linux. RA e RV (WebXR) não existem no WebView, e a Galeria do app as marca como "SÓ NO SITE". Isso é esperado.

## Preparar o ambiente

Os pré-requisitos estão na seção "Compilando os apps instaláveis → Linux" do `README.md` da raiz. Em resumo, dentro de `frontend/`:

```bash
npm install
npm run tauri dev                                # desenvolvimento, com inspetor
npm run tauri build -- --debug --no-bundle       # igual ao app final, COM inspetor
./src-tauri/target/debug/clarajs                 # executa o build acima
```

O inspetor abre com o botão direito → Inspecionar. O `prebuild` baixa o modelo do MediaPipe para `public/mediapipe/`, então a primeira execução precisa de internet.

**Reproduza com o build, não só com o `tauri dev`.** Eles têm origens diferentes, e uma das hipóteses abaixo depende disso.

## O bug

Máquina: notebook Dell Inspiron 3511 com Zorin OS 18.1. O app testado foi o `.AppImage` gerado pelo workflow `.github/workflows/instaladores.yml`. Descubra a placa de vídeo com `lspci | grep -iE 'vga|3d'`.

Relato do autor:

> "Falhou na webcam apenas. A Dissecção liga a webcam mas não detecta gestos, e os outros dois nem abrem a webcam. Tanto offline quanto online."

No mesmo notebook, os experimentos 3D, o Museu Virtual e o modo offline funcionam no Linux. No Windows e no Android, os 3 experimentos com webcam funcionam.

| Experimento | Pasta | Como usa a câmera |
|---|---|---|
| Dissecção do sapo | `src/simulations/biology/FrogDissection/` | `gestures.ts` + `index.tsx`, código próprio |
| Você é o móvel | `src/simulations/physics/HandKinematics/` | gancho `useHandCamera` |
| Lei de Boyle com as Mãos | `src/simulations/chemistry/BoyleHands/` | gancho `useHandCamera` |

Os três usam `src/core/handTracking.ts` (MediaPipe).

## O que já foi verificado no código

1. **A permissão e o `getUserMedia` funcionam.** A Dissecção liga a câmera. O `lib.rs` já chama `set_enable_media_stream(true)` e libera o pedido de câmera.
2. **Os três fazem a mesma coisa, na mesma ordem:** criam o rastreador, depois abrem a câmera. Se o rastreador falhar, o `catch` só marca `trackerError`, e a câmera abre mesmo assim.
3. **"Os outros dois nem abrem a webcam" pode ser só aparência.** Em `HandKinematics/index.tsx` e `BoyleHands/index.tsx`:
   ```ts
   const noCamera = camera.ready && (camera.cameraError || camera.trackerError);
   // <video style={{ opacity: noCamera ? 0 : ... }}>
   ```
   Se só o **rastreador** falhar, o vídeo fica invisível e o texto diz "Câmera indisponível", com a câmera ligada. A Dissecção não esconde o `<video>`, então nela a imagem continua aparecendo.
4. **Os erros são descartados.** Os `catch {}` de `useHandCamera.ts` e de `FrogDissection/index.tsx` não registram a mensagem. A causa real nunca foi vista.

## O que acho que é

Uma única falha explica os dois sintomas: **`HandLandmarker.createFromOptions` falha no WebKitGTK**, e cada experimento mostra isso de um jeito. Hipóteses, da mais provável para a menos:

- **A. Delegate GPU.** `handTracking.ts:39` usa `delegate: 'GPU'`, sem alternativa. O WebGL do WebKitGTK ou o driver podem não atender ao que o MediaPipe exige.
- **B. Conflito entre WebKitGTK e driver gráfico.** A [documentação do Tauri](https://v2.tauri.app/develop/debug/linux-graphics/) indica `WEBKIT_DISABLE_DMABUF_RENDERER=1` para esse tipo de problema, principalmente em placas NVIDIA.
- **C. Carregamento dos arquivos pelo protocolo `tauri://`.** O `.wasm` ou o `.task` em `/mediapipe/` podem falhar por causa do protocolo ou do tipo MIME. Se for isso, o bug aparece no build e não no `tauri dev`.

Se o texto ficar preso em "Carregando câmera e modelo…", a criação do rastreador está travando, não falhando. Nesse caso a câmera nunca chega a ser aberta.

Não encontrei relato público dessa combinação (MediaPipe + WebKitGTK + Tauri), então nada acima está confirmado.

## Como proceder

1. **Olhe o texto e a imagem.** Na Dissecção, confira se aparece o aviso "Rastreamento de mão indisponível". Se aparecer, a hipótese geral se confirma.
2. **Teste a variável, sem mudar código:** `WEBKIT_DISABLE_DMABUF_RENDERER=1 ./CLARA_*.AppImage`. Se resolver, defina-a no início de `run()` no `lib.rs`, só no Linux (`#[cfg(target_os = "linux")]`), antes de criar o WebView.
3. **Veja o erro real.** Registre a mensagem nos `catch` com `console.warn` e abra o inspetor no build `--debug`. Use `warn`, não `error`: os testes Playwright falham quando o navegador registra um `console.error`.
4. **Corrija conforme o erro.** Para as hipóteses A ou B, a correção provável é esta, em `handTracking.ts`:
   ```ts
   // tentar na ordem e ficar com o primeiro que funcionar
   const delegates = isLinuxApp ? ['CPU'] : ['GPU', 'CPU'];
   ```
   `isLinuxApp` é `isNativeApp && /Linux/.test(navigator.userAgent)`, com `isNativeApp` vindo de `core/platform.ts`. O teste de `isNativeApp` é necessário porque o user agent do Android também contém "Linux". O `try/catch` em volta de `createFromOptions` só pega erro de criação. Por isso a sugestão é forçar a CPU no Linux em vez de confiar só no fallback. Windows e Android devem continuar tentando a GPU primeiro.
5. **Corrija a mensagem enganosa, seja qual for a causa.** Em `HandKinematics` e `BoyleHands`, esconda o vídeo só com `cameraError` e use um texto próprio para `trackerError`. Assim, uma falha do rastreador não parece falha da câmera.

Se o rastreador rodar na CPU, confira se o gesto continua utilizável. Mão detectada com muito atraso também conta como problema, e deve ser relatada ao autor.

## Como saber que terminou

- Nos 3 experimentos, a câmera aparece e as mãos são detectadas, com internet e sem internet.
- Em `frontend/`, `npm run build` passa, e `npm run lint` não acrescenta erros aos 5 que já existem.
- `npm run test:e2e` continua passando. Esses testes usam Chromium e câmera falsa, então **não** provam que o Linux foi corrigido.
- **Teste final no AppImage gerado pelo workflow** (aba Actions → Instaladores, que o autor dispara). O AppImage é compilado no Ubuntu 22.04 e carrega bibliotecas de lá, então pode se comportar diferente de um build local no Zorin.
- Atualize o comentário sobre o delegate e os `README.md` dos experimentos alterados, se a mudança os afetar. Eles aparecem publicamente na aba "Como foi feito" do site.
- Explique ao autor o que causava o bug e o que mudou, sem fazer commit.
