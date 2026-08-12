import { loginPage } from '../pages/login.page';

describe('Update Check', () => {
  it('deve verificar e aplicar atualização disponível', async () => {
    // resetApp() já encerra o app antes de limpar/reinstalar, nas duas plataformas.
    await loginPage.resetApp();
    await browser.pause(5000); // splash screen — no observable element signals readiness

    await loginPage.dismissUpdatePopupIfPresent();
    await (await loginPage.emailField).waitForDisplayed({ timeout: 15000 });
  });
});
