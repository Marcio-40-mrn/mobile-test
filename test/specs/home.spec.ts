import allureReporter from '@wdio/allure-reporter';
import { loginPage } from '../pages/login.page';
import { homePage } from '../pages/home.page';

describe('Home', () => {
  // O preparo (app fechado → login → tela) é o PRIMEIRO STEP do `it`, não um
  // `beforeEach`: falha de hook não é falha de teste para o Mocha — o `it` é pulado,
  // `beforeTest`/`afterTest` não rodam e o Allure recebe um resultado sem status,
  // sem device e sem print (run #31 iOS: Home/Clientes roxos, "Unknown"). Como step,
  // a mesma falha sai vermelha, por aparelho, com screenshot.
  afterEach(async () => {
    await loginPage.resetAppState();
  });

  it('deve percorrer a home: saudação, busca, campanhas, meus clientes, atalhos, contatos e tab bar', async () => {
    await allureReporter.step('preparo: abrir o app, fazer login e chegar à home', async () => {
      await loginPage.launchAndCheckUpdate();
      await loginPage.ensureLoggedIn();
      await homePage.navigateToHome();
    });

    await allureReporter.step('deve exibir saudação com nome do usuário', async () => {
      expect(await (await homePage.greeting).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve exibir campo de busca por cliente', async () => {
      expect(await (await homePage.searchField).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve buscar por "Fudaba", entrar no perfil e voltar para home', async () => {
      await homePage.searchClient('Fudaba');
      await homePage.waitForSearchResult('Fudaba');
      await homePage.openFirstSearchResult();

      await homePage.waitForClientProfile();
      expect(await (await homePage.clientProfileTitle).isDisplayed()).toBe(true);

      await homePage.goBack();
      await homePage.goBack();
      await homePage.clearSearchField('Fudaba');
    });

    await allureReporter.step('deve exibir seção de Campanhas e navegar para ver todas', async () => {
      expect(await (await homePage.campaignsSection).isDisplayed()).toBe(true);
      await homePage.openAllCampaigns();
      await homePage.waitForCampaignsScreen();
      expect(await (await homePage.campaignsScreenTitle).isDisplayed()).toBe(true);
      await homePage.goBack();
      await homePage.waitForGreeting();
      expect(await (await homePage.greeting).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve exibir seção Meus clientes, abrir info e navegar', async () => {
      await homePage.scrollDown(0.8);
      await homePage.toggleCustomerSectionInfo();
      await homePage.waitForCustomerInfoText();
      expect(await (await homePage.customerSectionInfoText).isDisplayed()).toBe(true);

      await homePage.toggleCustomerSectionInfo();

      await homePage.openAllCustomers();
      await homePage.waitForMyCustomersScreen();
      expect(await (await homePage.myCustomersScreenTitle).isDisplayed()).toBe(true);

      await homePage.goBack();
      await homePage.scrollUp(3.0);
      await homePage.waitForGreeting();
      expect(await (await homePage.greeting).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve verificar se os botões de atalho de Meus Clientes estão funcionando', async () => {
      await homePage.scrollDown(0.5);

      const botoes = ['Aniversariantes', 'Cashback expirando', 'Pós-venda'];

      for (const botao of botoes) {
        await homePage.clickShortcutButton(botao);
        await homePage.waitForMyCustomersScreen();
        expect(await (await homePage.myCustomersScreenTitle).isDisplayed()).toBe(true);
        await homePage.goBack();
        await homePage.waitForMyCustomersSection();
        expect(await (await homePage.myCustomersSection).isDisplayed()).toBe(true);
      }
    });

    await allureReporter.step('deve exibir seção de Contatos Feitos', async () => {
      await homePage.scrollDown(0.75);
      await homePage.waitForContactsSection();
      expect(await (await homePage.contactsSection).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve exibir navegação inferior com as 4 abas', async () => {
      expect(await (await homePage.homeTab).isDisplayed()).toBe(true);
      expect(await (await homePage.clientsTab).isDisplayed()).toBe(true);
      expect(await (await homePage.campaignsTab).isDisplayed()).toBe(true);
      expect(await (await homePage.menuTab).isDisplayed()).toBe(true);
    });
  });
});
