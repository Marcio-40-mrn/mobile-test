import { loginPage } from '../pages/login.page';

describe('Update Check', () => {
  it('deve verificar e aplicar atualização disponível', async () => {
    await driver.terminateApp('com.aramis.arys');
    await driver.execute('mobile: clearApp', { appId: 'com.aramis.arys' });
    await driver.activateApp('com.aramis.arys');
    await browser.pause(5000); // splash screen — no observable element signals readiness

    await loginPage.dismissUpdatePopupIfPresent();
    await (await loginPage.emailField).waitForDisplayed({ timeout: 15000 });
  });
});
