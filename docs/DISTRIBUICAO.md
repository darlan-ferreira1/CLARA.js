# CLARA.js instalável e offline

Este documento descreve como o CLARA.js é distribuído **além do site**: como aplicativo instalável no computador (Windows e Linux) e no celular (Android), e com funcionamento **sem conexão com a internet**. Ele registra as decisões técnicas, o que já está implementado, o que está planejado e os números medidos, para servir de base ao texto da monografia.

> **Status em 23/10/2026**
> - ✅ App de desktop com Tauri: implementado; instaladores do Windows gerados e testados (abre, Museu Virtual funciona).
> - ✅ Funcionamento offline: MediaPipe e fontes servidos pelo próprio site + PWA com service worker. Implementado; teste offline pendente.
> - ✅ App Android (TWA): APK assinado gerado. Teste no aparelho e publicação do `assetlinks.json` pendentes.
> - 🔧 Instaladores do Linux: workflow pronto; ainda não executado (o código Linux do `lib.rs` só compila lá).

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
| Navegador (site) | PWA | nenhum, ou "Instalar app" no Chrome/Edge | ✅ Android | ✅ com headset | ✅ | ✅ | ✅ após o 1º acesso |
| Windows | Tauri | `.exe` (NSIS) e `.msi` | — ¹ | — ² | ✅ testado | ✅ liberada, a testar | ✅ ³ |
| Linux | Tauri | `.deb`, `.rpm`, `.AppImage` | — ¹ | — ² | 🔧 a testar ⁴ | 🔧 configurada, a testar ⁵ | ✅ ³ |
| Android | TWA + PWA | `.apk` | ✅ | ✅ | ✅ | ✅ | ✅ após o 1º acesso |

Legenda: ✅ funciona/implementado · 🔧 em andamento · — não se aplica. O teste de cada célula num aparelho está no roteiro da seção 12.

1. Não existe RA por WebXR em computadores nem no site: falta o ARCore, e o computador não tem câmera traseira rastreada.
2. A RV imersiva no computador exige um headset. O WebView não a suporta. Para esse caso, o caminho é abrir o site no Chrome.
3. O site inteiro vai dentro do instalador, inclusive o MediaPipe e as fontes: funciona offline desde a instalação (seção 5).
4. Falta confirmar o travamento do mouse (Pointer Lock) no WebKitGTK.
5. O WebKitGTK vem com a câmera desativada por padrão. O `lib.rs` a ativa (`enable-media-stream`) e libera o pedido de permissão. Esse trecho só compila em Linux e ainda não foi testado num aparelho.

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

O site é publicado em `https://darlan-ferreira1.github.io/CLARA.js/`, por isso o Vite gera os caminhos com o prefixo `/CLARA.js/`. No app, os arquivos são servidos na raiz. O Tauri define a variável de ambiente `TAURI_ENV_PLATFORM` quando executa o build, e o `vite.config.ts` a usa para escolher a configuração:

```ts
const tauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  base: tauri ? '/' : '/CLARA.js/',
  plugins: [react(), tailwindcss(), ...(tauri ? [] : [basicSsl()])],
  // ...
})
```

| | Site (`npm run build`) | App (`npm run tauri build`) |
|---|---|---|
| Caminho base | `/CLARA.js/` | `/` |
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

### 4.5 Medições (Windows 11)

| Medida | Antes do offline (21/10/2026) | Com MediaPipe embutido (23/10/2026) |
|---|---|---|
| Instalador NSIS (`CLARA_0.1.0_x64-setup.exe`) | ≈ 1,4 MB | ≈ 12,8 MB |
| Instalador MSI (`CLARA_0.1.0_x64_pt-BR.msi`) | ≈ 1,9 MB | ≈ 13,1 MB |
| Executável (`clarajs.exe`, com o site embutido) | ≈ 3,3 MB | ≈ 15,2 MB |
| Site compilado (`dist/`) | ≈ 1,3 MB | ≈ 32 MB (30 MB são o MediaPipe) |

O Tauri comprime os arquivos embutidos, por isso os ~31 MB do site viram ~15 MB no executável. Os instaladores estão em português (WiX `pt-BR`, NSIS `PortugueseBR`).

| Medida | Valor |
|---|---|
| Versões | Tauri 2.12.5, wry 0.57.0, Rust 1.99.1, WebView2 155.0.4283.62 |
| Primeira compilação *release* (com dependências) | 2 min 53 s |
| Memória do processo principal, 6 s após abrir | 29 MB ⁶ |
| Código específico da plataforma | 43 linhas de Rust (`main.rs` + `lib.rs`; 31 sem comentários e linhas em branco), 42 de `tauri.conf.json`, 30 de `Cargo.toml` |
| Arquivos alterados em `frontend/src/` para criar o app | **0** (as mudanças posteriores, da seção 5, são de infraestrutura comum: nenhum arquivo de experimento foi alterado) |

6. Só o processo `clarajs.exe`. O WebView2 roda em processos separados, que não foram somados. Para comparar com o navegador, medir a soma no Gerenciador de Tarefas.

### 4.6 Uso

```bash
cd frontend
npm run tauri dev      # app em desenvolvimento (recarrega ao salvar)
npm run tauri build    # instaladores do sistema atual
```

Pré-requisitos no Windows: Rust (rustup), Visual Studio Build Tools com "Desenvolvimento para desktop com C++" e WebView2, que já vem no Windows 11. No Linux: `libwebkit2gtk-4.1-dev`, `librsvg2-dev` e `patchelf`.

## 5. Funcionamento offline (implementado em 23/10/2026)

### 5.1 O que dependia da internet

| Recurso | Origem | Tamanho | Usado por |
|---|---|---|---|
| Site (HTML, JS, CSS, textos) | GitHub Pages / embutido no app | ≈ 1,3 MB | tudo |
| Motor do MediaPipe (WASM) | `cdn.jsdelivr.net` | ≈ 11,8 MB (+ 0,3 MB de JS) por variante ⁷ | experimentos de webcam |
| Modelo da mão (`hand_landmarker.task`) | `storage.googleapis.com` | 7 819 105 bytes (≈ 7,8 MB) | experimentos de webcam |
| Fontes (Inter, Playfair Display, JetBrains Mono) | `fonts.googleapis.com` | 8 arquivos `.woff2`, ≈ 192 kB | toda a interface |

7. O pacote traz três variantes: com SIMD, módulo e sem SIMD (≈ 11,0 MB). O navegador carrega só uma delas.

Hoje, **nenhum recurso vem de fora do site**: um `grep` por `https://` em `src/` e `index.html` só encontra links clicáveis (repositório e downloads).

### 5.2 O que foi feito

1. **MediaPipe servido pelo próprio site.** O script `frontend/scripts/mediapipe-assets.mjs` roda sozinho antes do `npm run dev` e do `npm run build` (*hooks* `predev`/`prebuild` do npm). Ele:
   - copia de `node_modules/@mediapipe/tasks-vision/wasm` só as duas variantes que o `FilesetResolver` carrega (com e sem SIMD);
   - baixa o modelo da mão **uma vez** para `frontend/public/mediapipe/`, que é uma pasta gerada e fica fora do Git.

   Em `src/core/handTracking.ts`, as URLs de CDN viraram `import.meta.env.BASE_URL + 'mediapipe/…'`. Como o WASM é copiado do pacote instalado, a versão dele **sempre coincide** com a da biblioteca. Isso eliminou a armadilha antiga de atualizar as duas à mão.
2. **Fontes servidas pelo próprio site:** pacotes `@fontsource/*`, importados em `src/main.tsx`, só com o subconjunto latino. O `@import` do Google Fonts foi removido do `index.css`.
3. **PWA:**
   - o `vite-plugin-pwa` (Workbox), configurado no `vite.config.ts`, gera o `manifest.webmanifest` (nome, ícones 192/512 e *maskable*, `display: standalone`, `lang: pt-BR`) e o `sw.js`;
   - o service worker faz *precache* de **51 arquivos (≈ 31,2 MB)**, o build inteiro inclusive o MediaPipe. Foi preciso elevar o limite do Workbox de 2 MB para 20 MB por arquivo, porque o WASM tem 11,8 MB;
   - o registro fica em `src/core/offline.ts`, só em produção;
   - a estratégia é **precache + `autoUpdate`**: quando sai um build novo, o service worker baixa a versão nova em segundo plano e substitui a antiga;
   - no app de desktop, o plugin é desligado (`disable: tauri`), porque os arquivos já estão no executável.
4. **Ícones:** o ícone provisório do app (`src-tauri/app-icon.svg`) virou também o favicon do site e os ícones do manifesto.

**Custo:** o primeiro acesso ao site passa a baixar cerca de 31 MB em segundo plano. Foi uma decisão consciente: a avaliação pediu funcionamento offline, e o público-alvo (escolas) tende a ter Wi-Fi no primeiro acesso e rede instável depois. Uma alternativa mais leve, que não foi adotada, seria guardar o MediaPipe só quando um experimento de webcam é aberto (*runtime caching*). Com ela, porém, a webcam não funcionaria offline para quem nunca abriu esses experimentos com internet.

### 5.3 Interface por plataforma

O módulo `src/core/platform.ts` detecta o app de desktop pela presença do objeto `__TAURI_INTERNALS__`, que o Tauri injeta em toda página. Ele é usado em dois lugares:

- **Galeria:** no app, os experimentos de RA e de RV imersiva aparecem desativados, com a etiqueta "SÓ NO SITE" e uma frase dizendo onde usá-los. Isso vem do campo `xr: 'vr' | 'ar'` do `registry.ts`;
- **Página Sobre:** no site, há a seção "Instalar o CLARA.js", com os links de download. No app, ela não aparece.

## 6. Android com TWA (implementado em 23/10/2026)

O projeto fica na pasta `android/`, com o passo a passo completo em `android/README.md`.

1. **Configuração:** o `android/twa-manifest.json` define o pacote `io.github.darlanferreira1.clarajs`, o endereço `https://darlan-ferreira1.github.io/CLARA.js/`, as cores, a orientação livre e a versão 0.1.0 (código 1). O `bubblewrap update` gera dele o projeto Gradle.
2. **Chave de assinatura:** RSA 2048, válida por 10 000 dias, guardada **fora do repositório**.
3. **Build:** `bubblewrap build` gera o `app-release-signed.apk` (**1 353 435 bytes, ≈ 1,3 MB**) e o `app-release-bundle.aab` (formato da Play Store). O APK é pequeno porque o site não vai dentro dele: ele abre o site publicado, e o service worker (seção 5) guarda tudo no primeiro uso.
4. **Digital Asset Links:** o arquivo está pronto em `android/assetlinks/.well-known/assetlinks.json`, com a impressão digital SHA-256 da chave. Falta publicá-lo na raiz do domínio, o que exige um repositório `darlan-ferreira1.github.io`.

Problemas encontrados (material para a discussão):

- **JDK exigido:** o Bubblewrap exige o JDK **17** exato, e foi preciso instalar um à parte do JDK 21 já existente;
- **versão mínima do Android:** a biblioteca `androidbrowserhelper` 2.7.4 exige `minSdkVersion` 24 (Android 7.0), e o valor 21 quebrou o *manifest merger*;
- **o manifesto ainda não existia no endereço publicado:** o projeto foi gerado antes de o site com o manifesto e os ícones ser publicado, então os ícones foram servidos de um servidor local durante a geração.

Requisito do aparelho: Chrome instalado e, para a RA, ARCore. São os mesmos requisitos da RA no site.

Alternativa já preparada: o Tauri também gera APK (os alvos Android do Rust estão instalados), mas nele a RA e a RV imersivas não funcionam (seção 2.2). Fica como plano B.

## 7. Seção de downloads (GitHub Releases)

A seção de downloads é a página **Releases** do repositório. Cada versão (`v0.1.0`, `v0.2.0`…) tem os instaladores anexados. Para lançar uma versão:

1. atualizar `"version"` em `frontend/src-tauri/tauri.conf.json`;
2. fazer o commit;
3. criar e enviar a *tag*: `git tag v0.1.0` e `git push origin v0.1.0`;
4. o workflow **Instaladores** gera os arquivos de Windows e Linux e cria uma Release em **rascunho**;
5. revisar o rascunho em *Releases* e clicar em **Publish release**. O APK (seção 6) pode ser anexado manualmente na mesma Release.

Link permanente para a versão mais recente: `https://github.com/darlan-ferreira1/CLARA.js/releases/latest`.

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
  - todo o processamento já era local (sem servidor), o que tornou o modo offline uma questão de **empacotar arquivos**, não de reescrever lógica;
  - o rastreamento de mãos estava centralizado num único módulo (`core/handTracking.ts`, entrada A9 do diário). Por isso, tornar os **três** experimentos de webcam offline exigiu trocar **duas constantes** (as URLs do motor e do modelo) num só arquivo.

Números da etapa offline + interface por plataforma:

- **0 arquivos de experimento alterados** (`src/simulations/<área>/<Nome>/`);
- 6 arquivos de infraestrutura comum alterados, com 74 linhas incluídas e 7 removidas;
- 2 arquivos novos em `src/core/`: `offline.ts` e `platform.ts`.

Atributo de qualidade (ISO/IEC 25010): **Portabilidade**, nas subcaracterísticas adaptabilidade e instalabilidade.

## 9. Limitações

- RA e RV imersivas não existem no app de desktop, porque a plataforma não oferece WebXR. No computador, a RV imersiva com headset continua disponível pelo site no Chrome.
- A TWA depende do Chrome instalado no aparelho.
- O primeiro acesso à PWA e à TWA precisa de internet, para baixar e guardar os arquivos. O app de desktop funciona offline desde a instalação.
- O primeiro acesso ao site baixa cerca de 31 MB em segundo plano (seção 5.2).
- A TWA mostra a barra de endereço enquanto o `assetlinks.json` não estiver publicado na raiz do domínio.
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

## 11. Guia de estudo para a monografia

O que estudar para escrever sobre a distribuição no TCC e para responder à banca. Para cada tema há o que é preciso entender, onde ele entra no texto, perguntas que a banca pode fazer e por onde estudar. A ordem sugerida é a da tabela: cada tema usa o anterior.

| # | Tema | Prioridade | Onde entra no TCC |
|---|---|---|---|
| 1 | Aplicação web × nativa × híbrida | Essencial | Fundamentação |
| 2 | Motor de navegador e WebView | Essencial | Fundamentação |
| 3 | Contexto seguro (HTTPS) | Importante | Fundamentação (perto do WebXR) |
| 4 | Service worker e cache | Essencial | Fundamentação |
| 5 | PWA (*Progressive Web App*) | Essencial | Fundamentação + Resultados |
| 6 | TWA (*Trusted Web Activity*) | Essencial | Fundamentação + Resultados |
| 7 | Tauri (e comparação com o Electron) | Essencial | Resultados (e Metodologia, nas ferramentas) |
| 8 | Por que o WebXR não é "empacotável" | Essencial | Fundamentação (seção do WebXR) + Discussão |
| 9 | Integração e entrega contínuas (CI/CD) e versionamento | Importante | Metodologia ou Resultados |
| 10 | Portabilidade na ISO/IEC 25010 | Importante | Fundamentação (arquitetura) + Discussão |

### 11.1 Aplicação web, nativa e híbrida

- **Entender:**
  - **nativa**: escrita para um sistema, com as APIs dele, como Kotlin no Android;
  - **web**: roda no navegador a partir de uma URL;
  - **híbrida**: um programa nativo pequeno que exibe uma aplicação web num WebView;
  - as vantagens e desvantagens de cada uma: desempenho, acesso ao hardware, custo de manter uma versão por sistema e distribuição.
- **No TCC:** justifica por que o CLARA.js é web e por que os instaladores são híbridos, e não uma reescrita nativa (seção 3.1).
- **A banca pode perguntar:** "Por que não fazer um app nativo?" Resposta: seria uma base de código por plataforma; a arquitetura proposta mantém uma só.

### 11.2 Motor de navegador e WebView

- **Entender:**
  - os motores Blink, WebKit e Gecko;
  - o que é um WebView e quais existem em cada sistema (tabela da seção 2.1);
  - por que um WebView **não** tem todos os recursos do navegador completo: o navegador é um produto, enquanto o WebView é um componente com menos recursos ativados.
- **A banca pode perguntar:** "Qual a diferença entre o app e abrir o site no Chrome?"

### 11.3 Contexto seguro

- **Entender:** o que é um contexto seguro (HTTPS, `localhost`); que câmera, WebXR e service worker **só** funcionam nele; por que o servidor de desenvolvimento usa um certificado autoassinado; como o Tauri resolve isso com o protocolo interno (seção 2.3).
- **Fonte:** W3C *Secure Contexts*; MDN "Secure contexts".

### 11.4 Service worker e cache

- **Entender:**
  - o ciclo de vida: registro, instalação, ativação;
  - a interceptação de requisições (evento `fetch`);
  - as estratégias de cache: *cache first*, *network first* e *stale-while-revalidate*;
  - o *precache*: guardar todos os arquivos do build na instalação;
  - como uma versão nova do site substitui a antiga.
- **No TCC:** é o mecanismo técnico do "funciona offline".
- **A banca pode perguntar:**
  - "E quando você atualizar o site, o aluno fica com a versão velha?" (resposta: o service worker detecta o build novo e troca o cache);
  - "Qual estratégia de cache você usou e por quê?"
- **Fonte:** W3C *Service Workers*; web.dev "Service workers"; documentação do Workbox e do `vite-plugin-pwa`.

### 11.5 PWA (*Progressive Web App*)

- **Entender:**
  - os três pilares: HTTPS, **manifesto** e **service worker**;
  - os campos do manifesto: `name`, `icons`, `start_url`, `scope`, `display: standalone`;
  - os critérios para o navegador oferecer "Instalar app";
  - as limitações no iOS.
- **No TCC:** é o que torna o site instalável e offline sem loja de apps, e é a base da TWA.
- **A banca pode perguntar:** "Uma PWA é um app de verdade?" Resposta: ela é instalável e funciona offline, mas roda no motor do navegador, e foi justamente isso que permitiu manter o WebXR.
- **Fonte:** W3C *Web Application Manifest*; web.dev "Learn PWA" (curso gratuito e curto, o melhor ponto de partida).

### 11.6 TWA (*Trusted Web Activity*)

- **Entender:**
  - que a TWA é um APK que abre a PWA **no Chrome do aparelho**, em tela cheia;
  - a diferença para um WebView: a TWA usa o motor completo, por isso tem WebXR;
  - o **Digital Asset Links**: a prova, por um arquivo no site, de que o app e o site são do mesmo autor;
  - a assinatura do APK (*keystore*);
  - a ferramenta Bubblewrap.
- **No TCC:** é a decisão central do Android (seção 6) e a resposta ao problema do WebXR.
- **A banca pode perguntar:**
  - "Por que não usar o Tauri também no Android?" (resposta: o WebView do Android não implementa WebXR, seção 2.2);
  - "E se o aparelho não tiver Chrome?"
- **Fonte:** Chrome for Developers, "Trusted Web Activity" e "Bubblewrap"; Google, "Digital Asset Links".

### 11.7 Tauri e Electron

- **Entender:**
  - a arquitetura do Tauri: um processo principal em Rust e a interface no WebView do sistema;
  - a comunicação entre os dois (IPC, comandos), mesmo que o CLARA.js não a use;
  - o modelo de permissões (*capabilities*);
  - como o build embute os arquivos do site;
  - os formatos de instalador: MSI, NSIS, `.deb`, `.rpm` e AppImage;
  - **por que o instalador é pequeno**: o Tauri não embute navegador; o Electron, sim (seção 3.1).
- **No TCC:** são os resultados do desktop (seção 4) e a tabela de medições (seção 4.5).
- **A banca pode perguntar:**
  - "Por que Rust?" (resposta: o Rust não foi uma escolha; é a linguagem do Tauri, e só 43 linhas dele foram escritas, para abrir a janela e liberar a câmera);
  - "Por que não Electron?"
- **Fonte:** documentação do Tauri 2 (páginas "What is Tauri?" e "Architecture"); documentação do Electron, para comparar.

### 11.8 Por que o WebXR não é "empacotável"

- **Entender:** a diferença entre a **API** (a interface que o JavaScript chama, `navigator.xr`) e a **implementação** (o código do navegador que conversa com o ARCore ou o OpenXR). Os WebViews oferecem a primeira parte de muitas APIs, mas não a do WebXR. Entender também o que são o ARCore e o OpenXR.
- **No TCC:** é o argumento que justifica a estratégia mista (seção 2.2). É um bom parágrafo de discussão, porque mostra que a limitação é da **plataforma**, não da arquitetura.
- **A banca pode perguntar:** "Então não daria para colocar a RA dentro do app?" Resposta: só reimplementando a RA em código nativo por plataforma, o que contraria a proposta.
- **Fonte:** especificação WebXR do W3C; documentação do ARCore (Google) e do OpenXR (Khronos).

### 11.9 CI/CD e versionamento

- **Entender:**
  - **integração contínua** e **entrega contínua**;
  - o GitHub Actions: *workflow*, *job*, matriz de sistemas e *runner*;
  - por que o Linux é compilado num *runner* Linux;
  - o versionamento semântico (`MAIOR.MENOR.CORREÇÃO`);
  - as *tags* do git e as Releases.
- **No TCC:** é o processo de publicação (seções 4.4 e 7). Ele já existe para o site (`deploy.yml`) e agora também para os instaladores.
- **Fonte:** documentação do GitHub Actions; semver.org.

### 11.10 Portabilidade (ISO/IEC 25010)

- **Entender:** as subcaracterísticas da portabilidade (adaptabilidade, instalabilidade e substituibilidade) e como cada uma é evidenciada:
  - **adaptabilidade:** o mesmo código roda em cinco ambientes;
  - **instalabilidade:** os instaladores e a PWA;
  - **substituibilidade:** o app substitui o site sem perda de funções, com as exceções da seção 3.
- **No TCC:** liga a distribuição à tese de que a arquitetura é a contribuição (seção 8).
- **Fonte:** ISO/IEC 25010:2011. Na versão de 2023, a portabilidade foi renomeada para *flexibility*; vale citar a versão que você usar.

### 11.11 Roteiro de estudo sugerido

1. **web.dev "Learn PWA"** (algumas horas): cobre os temas 3, 4 e 5 de uma vez.
2. **Documentação do Tauri, "What is Tauri?"** (30 min): tema 7.
3. **Chrome for Developers, "Trusted Web Activity overview"** (30 min): tema 6.
4. **Seção 2 deste documento**: temas 1, 2 e 8, com as fontes primárias para citar.
5. **GitHub Actions, "Understanding GitHub Actions"** (30 min): tema 9.

Depois de implementar a PWA e a TWA, a prática responde às perguntas acima melhor que a leitura. Vale anotar o que deu errado durante a implementação: isso vira material para a seção de discussão.

## 12. Roteiro de testes da distribuição

Testes manuais para validar cada célula da tabela da seção 3. Preencha a coluna **Resultado** (✅ / ❌ + observação) e anote **aparelho, sistema e versão do navegador**: esses dados vão para o texto.

**Antes de testar:**

1. Faça o commit e o push da `main`, para o site publicado ganhar o service worker, o manifesto e o MediaPipe local.
2. Espere o deploy terminar (aba Actions).
3. Rode o workflow **Instaladores**, ou crie uma tag, para gerar os arquivos de Linux.

### 12.1 Site e PWA (navegador)

| ID | Teste | Como | Esperado | Resultado |
|---|---|---|---|---|
| T-01 | Service worker instalado | Chrome → abrir o site → F12 → aba *Application* → *Service workers* | `sw.js` "activated and is running"; em *Cache storage*, ≈ 51 arquivos | |
| T-02 | Site offline | Com o site já aberto uma vez: F12 → *Network* → "Offline" (ou desligar o Wi-Fi) → recarregar | O site abre; Galeria, um experimento 3D e o Museu Virtual funcionam | |
| T-03 | Webcam offline | Offline, abrir "Você é o Móvel" | A câmera liga e a mão é rastreada (o MediaPipe vem do cache) | |
| T-04 | Fontes offline | Offline, abrir a página Sobre | Títulos em Playfair Display e o texto em Inter, iguais ao modo online | |
| T-05 | Instalar como app | Chrome/Edge → ícone "Instalar" na barra de endereço | Abre em janela própria, com o ícone do átomo | |
| T-06 | Atualização | Fazer uma mudança visível, push, esperar o deploy e abrir o site (online) | Na 1ª ou 2ª abertura aparece a versão nova | |
| T-07 | Sem dependência externa | Online: F12 → *Network* → recarregar → filtrar por domínios que não sejam `darlan-ferreira1.github.io` | Nenhuma requisição a `jsdelivr`, `googleapis` ou `gstatic` | |

### 12.2 App de desktop (Windows)

Instale o `CLARA_0.1.0_x64-setup.exe` (em `frontend/src-tauri/target/release/bundle/nsis/` ou na Release).

| ID | Teste | Como | Esperado | Resultado |
|---|---|---|---|---|
| T-10 | Instalação | Executar o instalador (SmartScreen: *Mais informações → Executar assim mesmo*) | Instalador em português; atalho "CLARA" no menu Iniciar | |
| T-11 | Offline desde a instalação | Desligar o Wi-Fi **antes** de abrir o app pela 1ª vez | Tudo abre | |
| T-12 | Experimentos 3D | Abrir os experimentos de Física, Química e Biologia | Funcionam como no site | |
| T-13 | Museu Virtual | Entrar no museu, WASD + mouse, entrar numa sala, Tab | Mouse travado, movimento e ajustes funcionando | |
| T-14 | Webcam (3 experimentos) | Com webcam: "Você é o Móvel", "Lei de Boyle com as Mãos", "Dissecação" | A câmera liga **sem** perguntar permissão; as mãos são rastreadas | |
| T-15 | RA/RV no app | Galeria | Variantes RA/VR com "SÓ NO SITE", desativadas, com a explicação | |
| T-16 | Página Sobre no app | Abrir Sobre | **Não** aparece a seção "Instalar o CLARA.js" | |
| T-17 | Desinstalação | Configurações → Aplicativos → CLARA → Desinstalar | Remove sem erro | |

### 12.3 App de desktop (Linux, no notebook)

Baixe o `.AppImage` ou o `.deb` da Release em rascunho.

| ID | Teste | Como | Esperado | Resultado |
|---|---|---|---|---|
| T-20 | Workflow | Aba Actions → Instaladores | Jobs Windows e Linux verdes (o Linux é o 1º a compilar o trecho de câmera do `lib.rs`) | |
| T-21 | Abrir | `chmod +x CLARA_*.AppImage && ./CLARA_*.AppImage` (ou `sudo apt install ./CLARA_*.deb`) | Janela "CLARA.js" | |
| T-22 | WebGL | Abrir um experimento 3D | Renderiza; anotar a fluidez | |
| T-23 | Pointer Lock | Museu Virtual | O mouse trava e a câmera gira | |
| T-24 | Webcam | Os 3 experimentos de webcam | A câmera liga (ativada pelo `enable-media-stream`) | |
| T-25 | Offline | Wi-Fi desligado | Tudo abre | |

### 12.4 App Android (TWA)

Instale o `android/app-release-signed.apk`, por cabo (`adb install android/app-release-signed.apk`) ou copiando o arquivo para o celular.

| ID | Teste | Como | Esperado | Resultado |
|---|---|---|---|---|
| T-30 | Instalação | Instalar o APK (permitir fontes desconhecidas) | Ícone "CLARA.js" na tela inicial | |
| T-31 | Abertura | Abrir com internet | Abre o site em tela cheia. Barra de endereço no topo **enquanto** o `assetlinks.json` não estiver publicado | |
| T-32 | RA | Modelo de Bohr — AR → apontar para o chão → tocar | O átomo é posicionado; arrastar, pinça e girar funcionam | |
| T-33 | Webcam | "Você é o Móvel" | Chrome pede a câmera; a mão é rastreada | |
| T-34 | Museu (toque) | Museu Virtual | Joystick e arrastar para olhar | |
| T-35 | Offline | Depois de T-31: modo avião → abrir o app | Tudo abre, inclusive a webcam | |
| T-36 | Asset Links | Depois de publicar o `assetlinks.json`: desinstalar, instalar e abrir com internet | A barra de endereço some | |

### 12.5 Medidas para a monografia

Durante os testes, anote também:

- **o tempo do 1º carregamento do site**, em F12 → *Network* → linha "Load", online e com o cache vazio;
- **a memória total do app de desktop**: no Gerenciador de Tarefas, expanda o "CLARA" e some os processos do WebView2;
- **o desempenho de um experimento 3D em cada plataforma**: o FPS, se houver contador, ou uma impressão qualitativa.
