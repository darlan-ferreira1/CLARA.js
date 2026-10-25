# App Android do CLARA.js (TWA)

Projeto Android gerado pelo [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). É uma **Trusted Web Activity**: um APK que abre o site publicado (`https://darlan-ferreira1.github.io/CLARA.js/`) no **Chrome do aparelho**, em tela cheia. Como o motor é o Chrome de verdade, tudo do site funciona: realidade aumentada (WebXR + ARCore), realidade virtual, webcam e Museu Virtual. Depois do primeiro acesso, o service worker do site (PWA) faz o app funcionar sem internet. Detalhes e justificativa em [`docs/DISTRIBUICAO.md`](../docs/DISTRIBUICAO.md), seção 6.

Não há código do CLARA.js aqui: é só o "lançador". Quem define o app é o `twa-manifest.json`; o restante (`app/`, `build.gradle`, `gradlew`…) é **gerado** a partir dele.

## Arquivos

| Arquivo | O que é |
|---|---|
| `twa-manifest.json` | Configuração do app: pacote, endereço do site, cores, ícone, versão, chave de assinatura |
| `app/`, `*.gradle`, `gradlew*` | Projeto Android gerado pelo `bubblewrap update` (não editar à mão) |
| `assetlinks/.well-known/assetlinks.json` | Prova de que o site e o app são do mesmo autor (ver abaixo) |
| `app-release-signed.apk` | O APK pronto para instalar (gerado; não vai para o Git) |

A **chave de assinatura** fica fora do repositório, em `D:\26\chaves-clarajs\` (com a senha no `LEIA-ME-SENHA.txt`). Sem ela, não é possível lançar atualizações do app. Mantenha uma cópia de segurança.

## Ferramentas

Instaladas no perfil do usuário, numa pasta só do Bubblewrap (ele exige o JDK 17 exato):

- Bubblewrap: `npm install -g @bubblewrap/cli`
- JDK 17: `%USERPROFILE%\.bubblewrap\jdk\jdk-17.0.11+9`
- Android SDK (build-tools 36.1.0): `%USERPROFILE%\.bubblewrap\android_sdk`
- Configuração: `%USERPROFILE%\.bubblewrap\config.json`

## Gerar o APK

No **PowerShell**, dentro desta pasta:

```powershell
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = '<senha do LEIA-ME-SENHA.txt>'
$env:BUBBLEWRAP_KEY_PASSWORD      = '<a mesma senha>'
bubblewrap build --skipPwaValidation
```

O resultado é o `app-release-signed.apk`, de cerca de 1,3 MB: o site não vai dentro dele, porque é baixado e guardado pelo service worker no primeiro uso.

> No terminal do Claude Code, o `bubblewrap build` falha com "'gradlew.bat' não é reconhecido", porque a variável `NoDefaultCurrentDirectoryInExePath` está ligada ali. Num PowerShell comum, isso não acontece.

## Lançar uma versão nova do app

Só é necessário quando muda algo **do app**: nome, ícone, cores, endereço. Mudanças no **site** chegam ao app sozinhas, porque ele sempre abre o site publicado.

1. No `twa-manifest.json`, aumente `appVersionCode` (inteiro: 1 → 2 → 3…) e `appVersion` (`0.1.0` → `0.2.0`).
2. Rode `bubblewrap update`. Isso regenera o projeto e baixa os ícones de `iconUrl` e `maskableIconUrl`.
3. Rode `bubblewrap build` (acima).

O `iconUrl` e o `maskableIconUrl` apontam hoje para `http://localhost:8765`, porque o projeto foi gerado antes de o site com os ícones ser publicado. Para o passo 2, há duas opções:

- **Trocar pelos endereços publicados:** `https://darlan-ferreira1.github.io/CLARA.js/icons/512x512.png` e `.../icons/maskable-512x512.png`;
- **Servir o site local:** `cd frontend/dist` e depois `python -m http.server 8765`.

## Digital Asset Links (esconder a barra de endereço)

Sem verificação, a TWA funciona, mas mostra uma barra com o endereço do site no topo. Para escondê-la, o arquivo `assetlinks/.well-known/assetlinks.json` precisa estar em:

```
https://darlan-ferreira1.github.io/.well-known/assetlinks.json
```

Ou seja, na **raiz** do domínio, e não em `/CLARA.js/`. No GitHub Pages, isso exige um repositório chamado exatamente `darlan-ferreira1.github.io`:

1. Crie o repositório público `darlan-ferreira1.github.io` no GitHub.
2. Envie para ele o **conteúdo** da pasta `assetlinks/`: a pasta `.well-known/` e o `_config.yml`. O `_config.yml` faz o GitHub Pages publicar pastas que começam com ponto.
3. Em Settings → Pages, publique a partir da branch `main`.
4. Confira se `https://darlan-ferreira1.github.io/.well-known/assetlinks.json` abre o arquivo.
5. Desinstale e instale o APK de novo, e abra-o com internet: a barra deve sumir.

A impressão digital (`sha256_cert_fingerprints`) é a da chave em `D:\26\chaves-clarajs\`. Se a chave mudar, o arquivo precisa ser atualizado. Para ver a impressão digital: `keytool -list -v -keystore D:\26\chaves-clarajs\clarajs.keystore -alias clarajs`.
