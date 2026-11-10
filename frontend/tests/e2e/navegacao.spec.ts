// Navegação geral do site: tela inicial, Galeria, busca, página Sobre e os
// botões voltar e avançar do navegador.

import { abrir, expect, EXPERIMENTOS, test } from './apoio';

test.describe('Navegação do site', () => {
  test('A tela inicial leva à Galeria', async ({ page }) => {
    await abrir(page, '');
    await page.getByRole('button', { name: /Galeria/ }).click();
    await expect(page).toHaveURL(/#\/home$/);
  });

  test('A Galeria mostra um card para cada experimento disponível', async ({ page }) => {
    await abrir(page, 'home');
    for (const experimento of EXPERIMENTOS) {
      await expect(page.getByText(experimento.title, { exact: true }).first()).toBeVisible();
    }
  });

  test('A busca da Galeria filtra os experimentos pelo nome', async ({ page }) => {
    const alvo = EXPERIMENTOS[0];
    const outro = EXPERIMENTOS.find((s) => s.category !== alvo.category)!;
    await abrir(page, 'home');
    await page.getByPlaceholder('Buscar simulações…').fill(alvo.title);
    await expect(page.getByText(alvo.title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(outro.title, { exact: true })).toHaveCount(0);
  });

  test('Os botões voltar e avançar do navegador acompanham a navegação', async ({ page }) => {
    const experimento = EXPERIMENTOS[0];
    await test.step('Vai da Galeria para um experimento', async () => {
      await abrir(page, 'home');
      await page.getByText(experimento.title, { exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`#/${experimento.id}$`));
    });
    await test.step('Voltar do navegador retorna à Galeria', async () => {
      await page.goBack();
      await expect(page.getByPlaceholder('Buscar simulações…')).toBeVisible();
    });
    await test.step('Avançar do navegador reabre o experimento', async () => {
      await page.goForward();
      await expect(page).toHaveURL(new RegExp(`#/${experimento.id}$`));
      await expect(page.getByRole('button', { name: 'Teoria', exact: true })).toBeVisible();
    });
  });

  test('Um link direto para um experimento abre e sobrevive a recarregar a página', async ({ page }) => {
    await abrir(page, EXPERIMENTOS[0].id);
    await expect(page.getByRole('button', { name: 'Teoria', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Teoria', exact: true })).toBeVisible();
  });

  test('A página Sobre abre e explica a sigla do projeto', async ({ page }) => {
    await abrir(page, 'sobre');
    await expect(page.getByText(/Centro de Laboratórios para Aprendizagem/).first()).toBeVisible();
  });
});
