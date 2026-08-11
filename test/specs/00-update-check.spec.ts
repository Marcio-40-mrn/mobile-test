import { loginPage } from '../pages/login.page';
import { APP_ID } from '../support/platform';

describe('Update Check', () => {
  it('deve verificar e aplicar atualização disponível', async () => {
    await driver.terminateApp(APP_ID);
    await loginPage.resetApp();
    await browser.pause(5000); // splash screen — no observable element signals readiness

    await loginPage.dismissUpdatePopupIfPresent();
    await (await loginPage.emailField).waitForDisplayed({ timeout: 15000 });
  });
});
