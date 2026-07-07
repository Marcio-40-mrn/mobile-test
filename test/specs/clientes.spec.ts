import { loginPage } from '../pages/login.page';
import { clientesPage, FILTROS_ORDENACAO } from '../pages/clientes.page';

describe('Clientes', () => {
  before(async () => {
    await loginPage.ensureLoggedIn();
    await clientesPage.navigateToClientes();
  });

  it('deve exibir o título "Meus clientes"', async () => {
    await clientesPage.waitForTitle();
    expect(await (await clientesPage.screenTitle).isDisplayed()).toBe(true);
  });

  it('deve navegar para aba Favoritos e verificar se abriu', async () => {
    await clientesPage.navigateToTab('Favoritos');
    await clientesPage.waitForTotalClientes();
    expect(await (await clientesPage.totalClientesLabel).isDisplayed()).toBe(true);
  });

  it('deve testar todos os filtros de ordenação na aba Favoritos', async () => {
    for (const filtro of FILTROS_ORDENACAO) {
      await clientesPage.applySortFilter(filtro, 'Contatar', 'Nenhum cliente encontrado!');
    }
  });

  it('deve navegar para aba Aniversariantes e verificar se abriu', async () => {
    await clientesPage.navigateToTab('Aniversariantes');
    await clientesPage.waitForHoje();
    expect(await (await clientesPage.hojeLabel).isDisplayed()).toBe(true);
  });

  it('deve testar todos os filtros de ordenação na aba Aniversariantes', async () => {
    for (const filtro of FILTROS_ORDENACAO) {
      await clientesPage.applySortFilter(filtro, 'Parabenizar', 'Nenhum aniversariante hoje');
    }
  });

  it('deve navegar para aba Cashback e verificar se abriu', async () => {
    await clientesPage.navigateToTab('Cashback Exp.');
    await clientesPage.waitForHoje();
    expect(await (await clientesPage.hojeLabel).isDisplayed()).toBe(true);
  });

  it('deve testar todos os filtros de ordenação na aba Cashback', async () => {
    for (const filtro of FILTROS_ORDENACAO) {
      await clientesPage.applySortFilter(filtro, 'Contatar', 'Nenhum cliente a contatar');
    }
  });

  it('deve navegar para aba Pós Vendas e verificar se abriu', async () => {
    await clientesPage.navigateToTab('Pós Vendas');
    await clientesPage.waitForContatados();
    expect(await (await clientesPage.contatadosLabel).isDisplayed()).toBe(true);
  });

  it('deve testar todos os filtros de ordenação na aba Pós Vendas', async () => {
    for (const filtro of FILTROS_ORDENACAO) {
      await clientesPage.applySortFilter(filtro, 'Contatar', 'Nenhum cliente a contatar');
    }
  });

  it('deve buscar cliente inexistente e verificar mensagem de resultado vazio', async () => {
    await clientesPage.searchClient('Nomenaoexistente');
    await clientesPage.waitForNoResults();
    expect(await (await clientesPage.noResultsMessage).isDisplayed()).toBe(true);

    await clientesPage.clearSearch('Nomenaoexistente');
    await clientesPage.resetSort();
  });
});
