# Testes do CLARA.js

Todos os testes automatizados ficam nesta pasta.

| Pasta | O que testa | Ferramenta |
|---|---|---|
| `e2e/` | O site em um navegador real: navegação, abertura de cada experimento, Museu Virtual | Playwright |

## Testes de ponta a ponta (`e2e/`)

Rodar dentro de `frontend/`. O site de produção é gerado e servido automaticamente.

```bash
npm run test:e2e                 # roda tudo, sem abrir janelas
npm run test:e2e:ui              # interface do Playwright: escolha e acompanhe cada teste
npx playwright test --headed --workers=1   # abre o Chromium e mostra os testes acontecendo
npx playwright show-report tests/resultados/relatorio   # relatório da última execução
```

Cada teste roda em dois perfis: `computador` (1280×720) e `celular` (Pixel 7, com toque).

| Arquivo | O que verifica |
|---|---|
| `experimentos.spec.ts` | Cada experimento disponível no registro abre pela Galeria, desenha a cena, mostra Teoria e Como foi feito e volta à Galeria |
| `navegacao.spec.ts` | Tela inicial, cards da Galeria, busca, voltar e avançar do navegador, link direto e página Sobre |
| `museu.spec.ts` | Entrar em uma sala do Museu Virtual, ajustar um parâmetro e sair, usando um controle de videogame simulado |
| `apoio.ts` | Funções comuns. Todo teste falha se o navegador registrar um erro |

**Experimento novo:** ao ser marcado como disponível em `src/simulations/registry.ts`, ele passa a ser testado automaticamente.

**O que estes testes não cobrem:** a sessão de RA e de RV, que precisa de um aparelho com WebXR, e o rastreamento real das mãos, porque o navegador usa uma câmera falsa. Sem placa de vídeo, o 3D é desenhado pelo processador, então estes testes não servem para medir desempenho.
