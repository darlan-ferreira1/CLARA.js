// Apoio comum aos testes de ponta a ponta.
//
// A lista de experimentos vem do registro (src/simulations/registry.ts): um
// experimento novo marcado como disponível passa a ser testado sem nenhuma
// alteração aqui.

import { test as base, expect, type Page } from '@playwright/test';
import { simulations } from '../../src/simulations/registry';

export const EXPERIMENTOS = simulations.filter((s) => s.available);

// Falha o teste se a página lançar um erro de JavaScript ou registrar um erro
// no console enquanto ele roda.
export const test = base.extend<{ errosDoNavegador: string[] }>({
  errosDoNavegador: [async ({ page }, use) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`exceção: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(`console: ${m.text()}`); });
    await use(erros);
    expect(erros, 'erros registrados pelo navegador durante o teste').toEqual([]);
  }, { auto: true }],
});

export { expect };

// Abre uma página do site pelo endereço direto (ex.: 'home', 'bohr-model').
export async function abrir(page: Page, rota: string) {
  await page.goto(`./#/${rota}`);
}

// Quantas cores diferentes aparecem no maior <canvas> da página. Uma cena que
// não desenhou nada tem uma cor só (o fundo). A conferência é feita sobre uma
// captura de tela porque o WebGL não deixa ler os pixels depois do desenho.
export async function coresDaCena(page: Page): Promise<number> {
  const canvas = page.locator('canvas:visible');
  const quantidade = await canvas.count();
  if (quantidade === 0) return 0;
  let maior = canvas.first();
  let maiorArea = 0;
  for (let i = 0; i < quantidade; i++) {
    const caixa = await canvas.nth(i).boundingBox();
    const area = caixa ? caixa.width * caixa.height : 0;
    if (area > maiorArea) { maior = canvas.nth(i); maiorArea = area; }
  }
  const png = (await maior.screenshot()).toString('base64');
  return page.evaluate(async (base64) => {
    const imagem = new Image();
    imagem.src = `data:image/png;base64,${base64}`;
    await imagem.decode();
    const c = document.createElement('canvas');
    c.width = imagem.width;
    c.height = imagem.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(imagem, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const cores = new Set<number>();
    for (let i = 0; i < data.length; i += 4 * 7) cores.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return cores.size;
  }, png);
}

// Espera a cena ter desenhado algo além do fundo.
export async function esperarCenaDesenhada(page: Page) {
  await expect.poll(() => coresDaCena(page), {
    message: 'a cena deveria desenhar mais do que a cor de fundo',
    timeout: 30_000,
  }).toBeGreaterThan(5);
}

// ── Controle de videogame simulado ──
// Substitui navigator.getGamepads para o teste apertar botões e mover
// analógicos. Chamar antes de abrir a página.

interface ControleSimulado {
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
}
type JanelaComControle = Window & { __controle: ControleSimulado };

export const BOTAO = { a: 0, b: 1, start: 9, direita: 15 } as const;

export async function instalarControleSimulado(page: Page) {
  await page.addInitScript(() => {
    const controle = {
      id: 'Controle simulado', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.defineProperty(window, '__controle', { value: controle });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [controle] });
  });
}

export async function moverAnalogicoEsquerdo(page: Page, x: number, y: number) {
  await page.evaluate(([ax, ay]) => {
    const { axes } = (window as unknown as JanelaComControle).__controle;
    axes[0] = ax;
    axes[1] = ay;
  }, [x, y]);
}

async function definirBotao(page: Page, botao: number, apertado: boolean) {
  await page.evaluate(([b, a]) => {
    const { buttons } = (window as unknown as JanelaComControle).__controle;
    buttons[b as number].pressed = a as boolean;
    buttons[b as number].value = a ? 1 : 0;
  }, [botao, apertado] as const);
}

// Aperta e solta. O tempo apertado cobre alguns quadros, mesmo sem GPU.
export async function apertar(page: Page, botao: number) {
  await definirBotao(page, botao, true);
  await page.waitForTimeout(500);
  await definirBotao(page, botao, false);
  await page.waitForTimeout(500);
}
