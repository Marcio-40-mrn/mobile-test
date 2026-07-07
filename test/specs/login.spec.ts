import { loginPage, EMAIL, SENHA, PIN } from '../pages/login.page';

describe('Login', () => {
  before(async () => {
    await driver.execute('mobile: clearApp', { appId: 'com.aramis.arys' });
    await driver.activateApp('com.aramis.arys');
    await browser.pause(5000); // splash screen — no observable element signals readiness
    await loginPage.dismissUpdatePopupIfPresent();
  });

  it('deve exibir erro ao tentar logar com campos vazios', async () => {
    await loginPage.waitForLoginScreen();
    await (await loginPage.submitButton).click();
    expect(await (await loginPage.errorTitle).isDisplayed()).toBe(true);
    expect(await (await loginPage.errorMessage).isDisplayed()).toBe(true);
  });

  it('deve acessar a home após inserir o PIN correto', async () => {
    await loginPage.waitForLoginScreen();
    await loginPage.fillAndSubmit(EMAIL, SENHA);
    await loginPage.handlePin(PIN);
    await loginPage.handleNotificationPopup();
    expect(await (await loginPage.homeGreeting).isDisplayed()).toBe(true);
  });
});
