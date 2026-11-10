// Museu Virtual percorrido com um controle de videogame simulado: é a entrada
// que funciona igual no computador e no celular durante o teste, e também
// verifica o próprio suporte a controles.

import {
  abrir, apertar, BOTAO, esperarCenaDesenhada, expect, instalarControleSimulado, moverAnalogicoEsquerdo, test,
} from './apoio';

test.describe('Museu Virtual', () => {
  test('Entra em uma sala, ajusta um parâmetro pelo controle e sai da sala', async ({ page }) => {
    await instalarControleSimulado(page);
    const avisoDaPorta = page.getByRole('button', { name: /Entrar na sala/ });
    const ajustes = page.getByRole('dialog', { name: /Ajustes/ });

    await test.step('Abre o museu, que desenha o salão', async () => {
      await abrir(page, 'museu');
      await esperarCenaDesenhada(page);
    });

    await test.step('Aperta A para começar e a tela de instruções some', async () => {
      await expect(page.getByText(/para explorar/)).toBeVisible();
      await apertar(page, BOTAO.a);
      await expect(page.getByText(/para explorar/)).toBeHidden();
    });

    await test.step('Anda com o analógico até aparecer o aviso de uma porta', async () => {
      await moverAnalogicoEsquerdo(page, 1, -0.5); // chega à parede lateral e desliza até a porta dela
      await expect(avisoDaPorta).toBeVisible({ timeout: 45_000 });
      await moverAnalogicoEsquerdo(page, 0, 0);
    });

    await test.step('Aperta A e entra na sala interativa', async () => {
      await apertar(page, BOTAO.a);
      await expect(page.getByText('Sala', { exact: true })).toBeVisible();
    });

    await test.step('Start abre os ajustes, e o D-pad muda o valor do parâmetro', async () => {
      await apertar(page, BOTAO.start);
      await expect(ajustes).toBeVisible();
      const antes = await ajustes.innerText();
      await apertar(page, BOTAO.direita);
      await expect.poll(() => ajustes.innerText()).not.toBe(antes);
    });

    await test.step('B fecha os ajustes', async () => {
      await apertar(page, BOTAO.b);
      await expect(ajustes).toBeHidden();
    });

    await test.step('Anda de costas até a porta de saída e volta ao salão', async () => {
      await moverAnalogicoEsquerdo(page, 0, 1);
      await expect(page.getByRole('button', { name: /Voltar ao museu/ })).toBeVisible({ timeout: 45_000 });
      await moverAnalogicoEsquerdo(page, 0, 0);
      await apertar(page, BOTAO.a);
      await expect(page.getByText('Sala', { exact: true })).toBeHidden();
    });
  });
});
