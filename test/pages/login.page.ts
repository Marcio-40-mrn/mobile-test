import { BasePage } from './base.page';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Copie .env.example para .env e preencha as credenciais de teste.`,
    );
  }
  return value;
}

export const EMAIL = requireEnv('TEST_USER_EMAIL');
export const SENHA = requireEnv('TEST_USER_PASSWORD');
export const PIN = requireEnv('TEST_USER_PIN');

class LoginPage extends BasePage {
  get emailField() { return $('//android.widget.EditText[@hint="Digite seu e-email"]'); }
  get passwordField() { return $('//android.widget.EditText[@hint="Digite sua senha"]'); }
  get submitButton() { return $('//*[@resource-id="btn-sign-in-submit"]'); }
  get loginTitle() { return $('//*[@text="Entrar"]'); }
  get errorTitle() { return $('//*[@text="Campos obrigatórios"]'); }
  get errorMessage() { return $('//*[@text="Por favor, preencha seu email e senha."]'); }
  get pinContainer() { return $('//*[@resource-id="otp-input-container"]'); }
  get pinScreen() { return $('//*[@content-desc="Digite o PIN para continuar"]'); }
  get homeGreeting() { return $('//*[contains(@text, "Olá,")]'); }

  async waitForLoginScreen(): Promise<void> {
    await (await this.loginTitle).waitForDisplayed({ timeout: 10000 });
  }

  async fillAndSubmit(email: string, senha: string): Promise<void> {
    const emailEl = await this.emailField;
    await emailEl.clearValue();
    await emailEl.setValue(email);

    const senhaEl = await this.passwordField;
    await senhaEl.clearValue();
    await senhaEl.setValue(senha);

    await driver.hideKeyboard();
    await (await this.submitButton).click();
  }

  async handlePin(pin: string): Promise<void> {
    const onPin = await this.isDisplayed('//*[@resource-id="otp-input-container"]', 8000);
    if (!onPin) return;

    await (await this.pinScreen).click();
    await browser.pause(500); // keyboard dismiss animation — no element signals completion
    await driver.execute('mobile: type', { text: pin });
    await browser.pause(6000); // PIN submission triggers background session init with no UI feedback
  }

  async doLogin(email = EMAIL, senha = SENHA, pin = PIN): Promise<void> {
    await browser.pause(6000); // splash screen — no observable element signals readiness
    await this.dismissUpdatePopupIfPresent();

    const onLogin = await this.isDisplayed('//*[@text="Entrar"]', 8000);
    if (onLogin) {
      await this.fillAndSubmit(email, senha);
    }

    await this.handlePin(pin);
    await this.handleNotificationPopup();

    const hasLateUpdate = await this.isDisplayed('//*[@text="REINICIAR"]', 8000);
    if (hasLateUpdate) {
      await $('//*[@text="REINICIAR"]').click();
      await $('//android.widget.EditText[@hint="Digite seu e-email"]').waitForDisplayed({ timeout: 45000 });
      await this.fillAndSubmit(email, senha);
      await this.handlePin(pin);
      await this.handleNotificationPopup();
    }

    await (await this.homeGreeting).waitForDisplayed({ timeout: 30000 });
  }

  async ensureLoggedIn(): Promise<void> {
    const isHome = await this.isDisplayed('//*[contains(@text, "Olá,")]', 3000);
    if (isHome) return;

    const onPin = await this.isDisplayed('//*[@resource-id="otp-input-container"]', 3000);
    if (onPin) {
      await this.handlePin(PIN);
      await this.handleNotificationPopup();
      await (await this.homeGreeting).waitForDisplayed({ timeout: 15000 });
      return;
    }

    const onLogin = await this.isDisplayed('//*[@text="Entrar"]', 3000);
    if (!onLogin) {
      await driver.execute('mobile: clearApp', { appId: 'com.aramis.arys' });
      await driver.activateApp('com.aramis.arys');
      await browser.pause(5000); // splash screen — no observable element signals readiness
    }

    await this.doLogin();
  }
}

export const loginPage = new LoginPage();
