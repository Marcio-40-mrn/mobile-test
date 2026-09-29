import allureReporter from '@wdio/allure-reporter';
import { loginPage } from '../pages/login.page';
import { clientesPage, FILTROS_ORDENACAO } from '../pages/clientes.page';

describe('Clientes', () => {
  // O preparo (app fechado → login → tela) é o PRIMEIRO STEP do `it`, não um
  // `beforeEach`: falha de hook não é falha de teste para o Mocha — o `it` é pulado,
  // `beforeTest`/`afterTest` não rodam e o Allure recebe um resultado sem status,
  // sem device e sem print (run #31 iOS: Home/Clientes roxos, "Unknown"). Como step,
  // a mesma falha sai vermelha, por aparelho, com screenshot.
  afterEach(async () => {
    await loginPage.resetAppState();
  });

  it('deve percorrer as 4 abas com seus filtros de ordenação e a busca sem resultado', async () => {
    await allureReporter.step('preparo: abrir o app, fazer login e chegar a Clientes', async () => {
      await loginPage.launchAndCheckUpdate();
      await loginPage.ensureLoggedIn();
      await clientesPage.navigateToClientes();
    });

    await allureReporter.step('deve exibir o título "Meus clientes"', async () => {
      await clientesPage.waitForTitle();
      expect(await (await clientesPage.screenTitle).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve navegar para aba Favoritos e verificar se abriu', async () => {
      await clientesPage.navigateToTab('Favoritos');
      await clientesPage.waitForTotalClientes();
      expect(await (await clientesPage.totalClientesLabel).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve testar todos os filtros de ordenação na aba Favoritos', async () => {
      for (const filtro of FILTROS_ORDENACAO) {
        // Build 1.6.0: o estado vazio de Favoritos passou a ser "Nenhum cliente favorito".
        await clientesPage.applySortFilter(filtro, 'Contatar', 'Nenhum cliente favorito');
      }
    });

    await allureReporter.step('deve navegar para aba Aniversariantes e verificar se abriu', async () => {
      await clientesPage.navigateToTab('Aniversariantes');
      await clientesPage.waitForHoje();
      expect(await (await clientesPage.hojeLabel).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve testar todos os filtros de ordenação na aba Aniversariantes', async () => {
      for (const filtro of FILTROS_ORDENACAO) {
        await clientesPage.applySortFilter(filtro, 'Parabenizar', 'Nenhum aniversariante hoje');
      }
    });

    await allureReporter.step('deve navegar para aba Cashback e verificar se abriu', async () => {
      await clientesPage.navigateToTab('Cashback Exp.');
      await clientesPage.waitForHoje();
      expect(await (await clientesPage.hojeLabel).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve testar todos os filtros de ordenação na aba Cashback', async () => {
      for (const filtro of FILTROS_ORDENACAO) {
        await clientesPage.applySortFilter(filtro, 'Contatar', 'Nenhum cliente a contatar');
      }
    });

    await allureReporter.step('deve navegar para aba Pós Vendas e verificar se abriu', async () => {
      await clientesPage.navigateToTab('Pós Vendas');
      await clientesPage.waitForContatados();
      expect(await (await clientesPage.contatadosLabel).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve testar todos os filtros de ordenação na aba Pós Vendas', async () => {
      for (const filtro of FILTROS_ORDENACAO) {
        await clientesPage.applySortFilter(filtro, 'Contatar', 'Nenhum cliente a contatar');
      }
    });

    await allureReporter.step('deve buscar cliente inexistente e verificar mensagem de resultado vazio', async () => {
      await clientesPage.searchClient('Nomenaoexistente');
      await clientesPage.waitForNoResults();
      expect(await (await clientesPage.noResultsMessage).isDisplayed()).toBe(true);

      await clientesPage.clearSearch('Nomenaoexistente');
      await clientesPage.resetSort();
    });
  });
});
