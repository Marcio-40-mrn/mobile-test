import allureReporter from '@wdio/allure-reporter';
import { loginPage } from '../pages/login.page';

describe('Login', () => {
  // O preparo (app fechado → login → tela) é o PRIMEIRO STEP do `it`, não um
  // `beforeEach`: falha de hook não é falha de teste para o Mocha — o `it` é pulado,
  // `beforeTest`/`afterTest` não rodam e o Allure recebe um resultado sem status,
  // sem device e sem print (run #31 iOS: Home/Clientes roxos, "Unknown"). Como step,
  // a mesma falha sai vermelha, por aparelho, com screenshot.
  afterEach(async () => {
    await loginPage.resetAppState();
  });

  it('deve exibir erro com campos vazios e acessar a home após o PIN correto', async () => {
    await allureReporter.step('preparo: abrir o app e chegar à tela de login', async () => {
      await loginPage.launchAndCheckUpdate();
    });

    await allureReporter.step('deve exibir erro ao tentar logar com campos vazios', async () => {
      await loginPage.waitForLoginScreen();
      await (await loginPage.submitButton).click();
      expect(await (await loginPage.errorTitle).isDisplayed()).toBe(true);
      expect(await (await loginPage.errorMessage).isDisplayed()).toBe(true);
    });

    await allureReporter.step('deve acessar a home após inserir o PIN correto', async () => {
      // `doLogin()` em vez da sequência preenche → PIN → popups: é ele que trata a
      // OTA tardia (a que chega já na home) e refaz o login quando o popup reinicia
      // o app no meio do caminho (UPD-03).
      await loginPage.waitForLoginScreen();
      await loginPage.doLogin();
      expect(await (await loginPage.homeGreeting).isDisplayed()).toBe(true);
    });
  });
});
