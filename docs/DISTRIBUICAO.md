# CLARA.js instalável e offline

Este documento descreve como o CLARA.js é distribuído **além do site**: como aplicativo instalável no computador (Windows e Linux) e no celular (Android), e com funcionamento **sem conexão com a internet**. Ele registra as decisões técnicas, o que já está implementado, o que está planejado e os números medidos, para servir de base ao texto da monografia.

> **Status em 21/10/2026**
> - ✅ App de desktop com Tauri: implementado; instaladores do Windows gerados e testados.
> - 🔧 Instaladores do Linux: o workflow está pronto, mas ainda não foi executado.
> - 📋 Funcionamento offline (PWA) e app Android (TWA): planejados.

---

## 1. Motivação

O site publicado no GitHub Pages já roda sem instalação. Na avaliação do TCC 1, porém, foi pedido que a plataforma também pudesse ser **instalada** e usada **offline**. Isso faz sentido para o público-alvo: escolas de ensino médio frequentemente têm internet instável ou laboratórios de informática sem acesso livre à rede.

O requisito adotado é: **tudo o que funciona no site deve funcionar nas versões instaláveis**, ainda que isso aumente o tamanho do aplicativo (por exemplo, embutindo modelos que hoje vêm de CDN).

## 2. Conceitos necessários

### 2.1 Navegador, motor e WebView

Um site depende de um **motor de navegador**: Blink, no Chrome e no Edge; WebKit, no Safari e no GNOME Web; Gecko, no Firefox. Os sistemas operacionais oferecem esse motor como componente para outros programas, o **WebView**:

| Sistema | WebView do sistema | Motor |
|---|---|---|
| Windows | Microsoft Edge WebView2 | Blink (Chromium) |
| Linux | WebKitGTK | WebKit |
| Android | Android System WebView | Blink (Chromium) |

Um aplicativo "híbrido" é um programa nativo pequeno que abre uma janela com um WebView e carrega dentro dela páginas HTML, CSS e JavaScript empacotadas no instalador.

### 2.2 Por que RA e RV não podem ser "empacotadas"

A realidade aumentada e a realidade virtual imersiva do CLARA.js usam a **WebXR Device API** (`navigator.xr`). O código que usa essa API, o Three.js e os experimentos, já vai dentro de qualquer versão empacotada. O que falta nos WebViews é a **implementação** da API: a parte do navegador, escrita em C++, que conversa com o ARCore (Android) ou com o OpenXR (headsets).

Essa implementação faz parte do próprio motor e não é uma biblioteca que se possa baixar e embutir. Na prática:

- o Chrome do Android implementa `immersive-ar` (com ARCore) e `immersive-vr`;
- o Android System WebView **não** implementa WebXR;
- o WebView2 e o WebKitGTK **não** implementam WebXR;
- o Electron, que embute um Chromium completo, não roda no Android e não tem suporte oficial a WebXR no desktop.

Consequência: num aplicativo híbrido baseado em WebView, a RA e a RV imersivas **não funcionam**. Isso orientou a escolha de uma estratégia diferente para cada plataforma (seção 3).

> Isso não afeta o **Museu Virtual**. Ele é **realidade virtual não imersiva** (*desktop VR*): usa só WebGL (Three.js) e a Pointer Lock API para a navegação WASD, sem WebXR. Por isso funciona normalmente nos WebViews (testado no app de Windows).

### 2.3 Contexto seguro

Câmera (`getUserMedia`) e WebXR só funcionam em **contexto seguro** (HTTPS ou `localhost`). Por isso o servidor de desenvolvimento usa um certificado autoassinado. No Tauri, os arquivos do app são servidos por um protocolo interno do próprio Tauri (`http://tauri.localhost` no Windows e `tauri://localhost` nos demais sistemas), que o WebView trata como contexto seguro. Assim a câmera funciona sem certificado.

### 2.4 Service worker e PWA

Um **service worker** é um script que o navegador mantém registrado para um site e que intercepta as requisições de rede dele. Com ele, o site pode guardar seus arquivos num cache local no primeiro acesso e servi-los a partir dali nos acessos seguintes, mesmo sem internet.

Um site com service worker e um **manifesto** (`manifest.webmanifest`: nome, ícones, cor, modo de exibição) é uma **PWA** (*Progressive Web App*). O Chrome e o Edge permitem instalá-la como aplicativo, com ícone e janela própria.

### 2.5 TWA (Trusted Web Activity)

Uma **TWA** é um aplicativo Android (APK) que, em vez de usar o WebView, abre um site dentro do **Chrome instalado no aparelho**, em tela cheia e sem barra de endereço. Como o motor é o do Chrome, todas as APIs do navegador, inclusive o WebXR, estão disponíveis.

Para ocultar a barra de endereço, o site precisa provar que pertence ao mesmo autor do app. Isso é feito com o arquivo **Digital Asset Links** (`/.well-known/assetlinks.json`) na raiz do domínio.

## 3. Estratégia por plataforma

```
                         mesmo build (frontend/dist)
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
   Navegador / PWA            Desktop (Tauri)            Android (TWA)
   motor do navegador         WebView do sistema         motor do Chrome
   GitHub Pages + SW          arquivos dentro do .exe    GitHub Pages + SW
   tudo funciona              sem WebXR (RA/RV imersiva  tudo funciona
                              não existem em PC)
```

| Plataforma | Tecnologia | Formato de instalação | RA | RV imersiva | Museu Virtual | Webcam | Offline |
|---|---|---|---|---|---|---|---|
| Navegador (site) | PWA | nenhum, ou "Instalar app" no Chrome/Edge | ✅ Android | ✅ com headset | ✅ | ✅ | 📋 com service worker |
| Windows | Tauri | `.exe` (NSIS) e `.msi` | — ¹ | — ² | ✅ testado | ✅ | ✅ ³ |
| Linux | Tauri | `.deb`, `.rpm`, `.AppImage` | — ¹ | — ² | 🔧 a testar ⁴ | 🔧 a configurar ⁵ | ✅ ³ |
| Android | TWA + PWA | `.apk` | ✅ | ✅ | ✅ | ✅ | 📋 com service worker |

Legenda: ✅ funciona · 🔧 em andamento · 📋 planejado · — não se aplica

1. Não existe RA por WebXR em computadores nem no site: falta o ARCore, e o computador não tem câmera traseira rastreada.
2. A RV imersiva no computador exige um headset. O WebView não a suporta. Para esse caso, o caminho é abrir o site no Chrome.
3. O site em si já vai dentro do instalador. Só os experimentos de webcam ainda baixam o MediaPipe de CDN (seção 5).
4. Falta confirmar o travamento do mouse (Pointer Lock) no WebKitGTK.
5. O WebKitGTK vem com a câmera desativada por padrão. É preciso ativar `enable-media-stream` no código Rust e tratar o pedido de permissão.

### 3.1 Por que não usar uma única tecnologia

| Alternativa | Por que não sozinha |
|---|---|
| **Tauri em todas as plataformas** | No Android, o WebView não tem WebXR, e a RA é justamente o principal recurso no celular. |
| **Electron** | Não gera app Android. No desktop, embute um Chromium completo, o que deixa o instalador dezenas de vezes maior que o do Tauri, sem resolver o WebXR. |
| **Reescrever em Rust ou em um motor nativo** | Descartaria a arquitetura (que é a contribuição do trabalho) e duplicaria todos os experimentos por plataforma. |
| **Só PWA** | Resolve offline e instalação pelo navegador, mas não gera um arquivo instalável (`.exe`, `.apk`) para distribuir na seção de downloads. |

A combinação **Tauri (desktop) + TWA (Android) + PWA (offline)** usa, em cada plataforma, o motor que oferece mais recursos, sempre com o **mesmo código** da aplicação.

## 4. Desktop com Tauri (implementado)

### 4.1 O que é o Tauri

O **Tauri 2** é um framework para aplicativos de desktop e mobile em que o processo nativo é escrito em **Rust** e a interface é uma aplicação web exibida pelo WebView do sistema. Diferentemente do Electron, ele **não embute um navegador**. Por isso, os instaladores são pequenos.

No CLARA.js, o código Rust só abre a janela e serve os arquivos do site. Nenhuma lógica dos experimentos foi escrita em Rust nem duplicada.

### 4.2 Arquivos

```
frontend/
├── vite.config.ts            # detecta o Tauri (base '/' e sem HTTPS)
├── package.json              # script "tauri" e devDependency @tauri-apps/cli
└── src-tauri/
    ├── Cargo.toml            # pacote Rust (dependência: tauri 2)
    ├── build.rs              # gera o contexto do app em tempo de compilação
    ├── tauri.conf.json       # nome, janela, ícones, instaladores
    ├── capabilities/
    │   └── default.json      # permissões nativas da janela (só o básico)
    ├── icons/                # ícones gerados a partir de app-icon.svg
    ├── app-icon.svg          # ícone provisório
    └── src/
        ├── main.rs           # ponto de entrada no desktop
        └── lib.rs            # cria a janela (também é o ponto de entrada no mobile)
.github/workflows/
└── instaladores.yml          # gera os instaladores de Windows e Linux
```

O programa Rust completo (`lib.rs`):

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o CLARA.js");
}
```

### 4.3 Como o mesmo build atende o site e o app

O site é publicado em `https://darlan-ferreira1.github.io/TCC/`, por isso o Vite gera os caminhos com o prefixo `/TCC/`. No app, os arquivos são servidos na raiz. O Tauri define a variável de ambiente `TAURI_ENV_PLATFORM` quando executa o build, e o `vite.config.ts` a usa para escolher a configuração:

```ts
const tauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  base: tauri ? '/' : '/TCC/',
  plugins: [react(), tailwindcss(), ...(tauri ? [] : [basicSsl()])],
  // ...
})
```

| | Site (`npm run build`) | App (`npm run tauri build`) |
|---|---|---|
| Caminho base | `/TCC/` | `/` |
| HTTPS autoassinado no dev | sim (câmera/WebXR exigem) | não (o WebView recusaria o certificado; `localhost` já é seguro) |
| Código-fonte (`src/`) | o mesmo | o mesmo |

O roteamento por *hash* (`#/simple-pendulum`), adotado por causa do GitHub Pages, também dispensa qualquer configuração de rotas no app.

### 4.4 Processo de build

`npm run tauri build`, dentro de `frontend/`, faz cinco coisas:

1. executa `npm run build` (TypeScript + Vite), gerando `frontend/dist/`;
2. compila o programa Rust em modo *release*, com otimização para tamanho (`opt-level = "s"`, LTO, `strip`);
3. embute os arquivos de `dist/` no executável;
4. gera os instaladores com o WiX (`.msi`) e o NSIS (`-setup.exe`);
5. grava tudo em `frontend/src-tauri/target/release/bundle/`.

O Linux não pode ser compilado a partir do Windows. Por isso, o workflow `instaladores.yml` compila no GitHub Actions, numa matriz `windows-latest` × `ubuntu-22.04`, usando a action oficial `tauri-apps/tauri-action`. Ele roda manualmente ou ao enviar uma *tag* de versão (`v*`), e não a cada push. O deploy do site continua no `deploy.yml`.

### 4.5 Medições (Windows 11, 21/10/2026)

| Medida | Valor |
|---|---|
| Versões | Tauri 2.12.5, wry 0.57.0, Rust 1.99.1, WebView2 155.0.4283.62 |
| Instalador NSIS (`CLARA_0.1.0_x64-setup.exe`) | 1 457 844 bytes (≈ 1,4 MB) |
| Instalador MSI (`CLARA_0.1.0_x64_en-US.msi`) | 1 957 888 bytes (≈ 1,9 MB) |
| Executável (`clarajs.exe`, com o site embutido) | 3 427 328 bytes (≈ 3,3 MB) |
| Site compilado (`dist/`) | ≈ 1,3 MB (JS principal: 1,12 MB) |
| Primeira compilação *release* (com dependências) | 2 min 53 s |
| Memória do processo principal, 6 s após abrir | 29 MB ⁶ |
| Código específico da plataforma | 16 linhas de Rust (`main.rs` + `lib.rs`), 42 de `tauri.conf.json`, 25 de `Cargo.toml` |
| Arquivos alterados em `frontend/src/` | **0** |

6. Só o processo `clarajs.exe`. O WebView2 roda em processos separados, que não foram somados. Para comparar com o navegador, medir a soma no Gerenciador de Tarefas.

### 4.6 Uso

```bash
cd frontend
npm run tauri dev      # app em desenvolvimento (recarrega ao salvar)
npm run tauri build    # instaladores do sistema atual
```

Pré-requisitos no Windows: Rust (rustup), Visual Studio Build Tools com "Desenvolvimento para desktop com C++" e WebView2, que já vem no Windows 11. No Linux: `libwebkit2gtk-4.1-dev`, `librsvg2-dev` e `patchelf`.

## 5. Funcionamento offline (planejado)

### 5.1 O que depende da internet hoje

| Recurso | Origem | Tamanho | Usado por |
|---|---|---|---|
| Site (HTML, JS, CSS, textos) | GitHub Pages / embutido no app | ≈ 1,3 MB | tudo |
| Motor do MediaPipe (WASM) | `cdn.jsdelivr.net` | ≈ 11,8 MB (+ 0,3 MB de JS) por variante ⁷ | experimentos de webcam |
| Modelo da mão (`hand_landmarker.task`) | `storage.googleapis.com` | a medir | experimentos de webcam |

7. O pacote traz três variantes: com SIMD, módulo e sem SIMD (≈ 11,0 MB). O navegador carrega só uma delas.

No app Tauri, o site já está embutido. Só os experimentos de webcam ainda precisam de internet no primeiro uso.

### 5.2 Plano

1. **Embutir o MediaPipe:** copiar os arquivos WASM de `node_modules/@mediapipe/tasks-vision/wasm` e o `hand_landmarker.task` para `frontend/public/mediapipe/`, com um script automático no build para a versão não ficar dessincronizada. Em `src/core/handTracking.ts`, trocar as URLs de CDN por `import.meta.env.BASE_URL + 'mediapipe/...'`. Com isso, **o site e o app deixam de depender de CDN**, e o app fica cerca de 12 MB maior por variante incluída.
2. **Service worker (PWA):** gerar com o `vite-plugin-pwa` (Workbox) um service worker que coloca em *precache* todo o build, inclusive o MediaPipe, e um manifesto com nome, ícones e `display: standalone`. Depois do primeiro acesso, o site funciona sem rede e pode ser instalado pelo navegador.
3. **Verificação:** desligar a rede e abrir cada experimento, no navegador (PWA instalada), no app de desktop e no APK.

## 6. Android com TWA (planejado)

1. Com a PWA pronta (seção 5), gerar o projeto Android com o **Bubblewrap** (CLI do Google) ou o **PWABuilder**, apontando para `https://darlan-ferreira1.github.io/TCC/`.
2. Criar a chave de assinatura (*keystore*) do app. Ela é necessária para todas as atualizações futuras e precisa ser guardada em lugar seguro, fora do repositório.
3. Publicar o `assetlinks.json` com a impressão digital da chave. Ele precisa ficar na **raiz** do domínio (`darlan-ferreira1.github.io/.well-known/assetlinks.json`), e o site está em `/TCC/`. A solução é criar o repositório `darlan-ferreira1.github.io` só para esse arquivo. Sem ele, a TWA funciona, mas mostra a barra de endereço.
4. Gerar o `.apk` e testar no aparelho: RA, câmera, Museu Virtual (joystick) e modo avião.

Requisito do aparelho: Chrome instalado e, para a RA, ARCore. São os mesmos requisitos da RA no site.

Alternativa já preparada: o Tauri também gera APK (os alvos Android do Rust estão instalados), mas nele a RA e a RV imersivas não funcionam (seção 2.2). Fica como plano B.

## 7. Seção de downloads (GitHub Releases)

A seção de downloads é a página **Releases** do repositório. Cada versão (`v0.1.0`, `v0.2.0`…) tem os instaladores anexados. Para lançar uma versão:

1. atualizar `"version"` em `frontend/src-tauri/tauri.conf.json`;
2. fazer o commit;
3. criar e enviar a *tag*: `git tag v0.1.0` e `git push origin v0.1.0`;
4. o workflow **Instaladores** gera os arquivos de Windows e Linux e cria uma Release em **rascunho**;
5. revisar o rascunho em *Releases* e clicar em **Publish release**. O APK (seção 6) pode ser anexado manualmente na mesma Release.

Link permanente para a versão mais recente: `https://github.com/darlan-ferreira1/TCC/releases/latest`.

| Sistema | Arquivo recomendado |
|---|---|
| Windows | `CLARA_<versão>_x64-setup.exe` |
| Linux | `.AppImage` (qualquer distribuição) ou `.deb` (Debian/Ubuntu) |
| Android | `.apk` |

Os instaladores não têm assinatura de código. O Windows mostra o aviso do SmartScreen ("Editor desconhecido"), e o Android pede para permitir a instalação de fontes desconhecidas. Isso é esperado num projeto acadêmico e deve ser explicado na página de downloads.

## 8. Relação com a arquitetura

A distribuição em várias plataformas é mais uma evidência da tese do trabalho. O site, a PWA, o app de desktop e o APK usam **o mesmo build**, gerado do mesmo código-fonte. Foi possível porque:

- **nenhum experimento conhece a plataforma:** as camadas de modelo (`physics.ts`) e de apresentação (`scene.ts`) dependem só de APIs web padrão. O app de desktop foi criado sem alterar nenhum arquivo de `frontend/src/` (seção 4.5);
- **a única diferença entre site e app é de configuração:** o caminho base e o HTTPS de desenvolvimento, isolados no `vite.config.ts`;
- **as limitações são de plataforma, não de código:** a falta de WebXR nos WebViews é tratada escolhendo o motor adequado em cada plataforma, sem bifurcar o código;
- **decisões anteriores pagaram dividendos:**
  - o roteamento por *hash* dispensou configuração de rotas no app;
  - todo o processamento já era local (sem servidor), o que tornou o modo offline uma questão de **empacotar arquivos**, não de reescrever lógica.

Atributo de qualidade (ISO/IEC 25010): **Portabilidade**, nas subcaracterísticas adaptabilidade e instalabilidade.

## 9. Limitações

- RA e RV imersivas não existem no app de desktop, porque a plataforma não oferece WebXR. No computador, a RV imersiva com headset continua disponível pelo site no Chrome.
- A TWA depende do Chrome instalado no aparelho.
- O primeiro acesso à PWA e à TWA precisa de internet, para baixar e guardar os arquivos. O app de desktop funciona offline desde a instalação (depois do item 5.2.1).
- O desempenho no Linux depende do WebKitGTK, que costuma ter WebGL mais lento que o Chromium.
- Os instaladores não têm assinatura de código (seção 7).

## 10. Referências sugeridas para a monografia

- TAURI CONTRIBUTORS. *Tauri 2 Documentation*. https://v2.tauri.app/ (arquitetura, processo de build, empacotamento).
- W3C. *WebXR Device API*. https://www.w3.org/TR/webxr/
- W3C. *Service Workers*. https://www.w3.org/TR/service-workers/
- W3C. *Web Application Manifest*. https://www.w3.org/TR/appmanifest/
- W3C. *Secure Contexts*. https://www.w3.org/TR/secure-contexts/
- GOOGLE. *Trusted Web Activities overview*. https://developer.chrome.com/docs/android/trusted-web-activity
- GOOGLE. *Digital Asset Links*. https://developers.google.com/digital-asset-links
- MICROSOFT. *Microsoft Edge WebView2*. https://learn.microsoft.com/microsoft-edge/webview2/
- ISO/IEC 25010:2011 — *Systems and software quality models* (Portabilidade).

Para citar uma página web pela ABNT, registre a data de acesso.
