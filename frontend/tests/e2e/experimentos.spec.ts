// Percorre TODOS os experimentos disponíveis no registro. Nenhum teste aqui cita
// um experimento pelo nome: um experimento novo entra sozinho nesta lista.

import { abrir, esperarCenaDesenhada, expect, EXPERIMENTOS, test } from './apoio';

test.describe('Todo experimento do registro', () => {
  for (const experimento of EXPERIMENTOS) {
    test(`${experimento.title}: abre pela Galeria, desenha a cena, mostra os textos e volta`, async ({ page }) => {
      await test.step('Abre a Galeria e clica no card do experimento', async () => {
        await abrir(page, 'home');
        await page.getByText(experimento.title, { exact: true }).first().click();
        await expect(page).toHaveURL(new RegExp(`#/${experimento.id}$`));
      });

      await test.step('Confere que a cena desenhou algo além do fundo', async () => {
        await esperarCenaDesenhada(page);
      });

      for (const aba of ['Teoria', 'Como foi feito']) {
        await test.step(`Abre o painel "${aba}" e confere que há texto`, async () => {
          await page.getByRole('button', { name: aba, exact: true }).click();
          const painel = page.getByRole('dialog', { name: aba });
          await expect(painel.locator('.shell-md')).toBeVisible();
          await expect(painel.locator('.shell-md')).not.toBeEmpty();
          await painel.getByRole('button', { name: 'Fechar' }).click();
          await expect(painel).toBeHidden();
        });
      }

      await test.step('Usa o botão Voltar e retorna à Galeria', async () => {
        await page.getByRole('button', { name: 'Voltar', exact: true }).click();
        await expect(page).toHaveURL(/#\/home$/);
        await expect(page.getByPlaceholder('Buscar simulações…')).toBeVisible();
      });
    });
  }
});
