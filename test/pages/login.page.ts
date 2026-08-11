import { BasePage } from './base.page';
import { L, byText, byTextContains, byTestId } from '../support/locator';

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

const SEL = {
  emailField: {
    // O typo "e-email" é do próprio app.
    android: '//android.widget.EditText[@hint="Digite seu e-email"]',
    ios: '//XCUIElementTypeTextField[@value="Digite seu e-email"]',
  },
  passwordField: {
    android: '//android.widget.EditText[@hint="Digite sua senha"]',
    ios: '//XCUIElementTypeSecureTextField[@value="Digite sua senha"]',
  },
  submitButton: byTestId('btn-sign-in-submit'),
  loginTitle: byText('Entrar'),
  errorTitle: byText('Campos obrigatórios'),
  errorMessage: byText('Por favor, preencha seu email e senha.'),
  pinContainer: byTestId('otp-input-container'),
  pinScreen: {
    android: '//*[@content-desc="Digite o PIN para continuar"]',
    ios: '//*[@label="Digite o PIN para continuar"]',
  },
  homeGreeting: byTextContains('Olá,'),
};

class LoginPage extends BasePage {
  get emailField() { return $(L(SEL.emailField)); }
  get passwordField() { return $(L(SEL.passwordField)); }
  get submitButton() { return $(L(SEL.submitButton)); }
  get loginTitle() { return $(L(SEL.loginTitle)); }
  get errorTitle() { return $(L(SEL.errorTitle)); }
  get errorMessage() { return $(L(SEL.errorMessage)); }
  get pinContainer() { return $(L(SEL.pinContainer)); }
  get pinScreen() { return $(L(SEL.pinScreen)); }
  get homeGreeting() { return $(L(SEL.homeGreeting)); }

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

    await this.hideKeyboard();
    await (await this.submitButton).click();
  }

  async handlePin(pin: string): Promise<void> {
    const onPin = await this.isDisplayedOn(SEL.pinContainer, 8000);
    if (!onPin) return;

    await (await this.pinScreen).click();
    await browser.pause(500); // keyboard dismiss animation — no element signals completion
    await this.typeIntoFocused(pin);
    await browser.pause(6000); // PIN submission triggers background session init with no UI feedback
  }

  async doLogin(email = EMAIL, senha = SENHA, pin = PIN): Promise<void> {
    await browser.pause(6000); // splash screen — no observable element signals readiness
    await this.dismissUpdatePopupIfPresent();

    const onLogin = await this.isDisplayedOn(SEL.loginTitle, 8000);
    if (onLogin) {
      await this.fillAndSubmit(email, senha);
    }

    await this.handlePin(pin);
    await this.handleNotificationPopup();

    const hasLateUpdate = await this.isDisplayedOn(this.restartButtonSel, 8000);
    if (hasLateUpdate) {
      await (await $(L(this.restartButtonSel))).click();
      await (await this.emailField).waitForDisplayed({ timeout: 45000 });
      await this.fillAndSubmit(email, senha);
      await this.handlePin(pin);
      await this.handleNotificationPopup();
    }

    await (await this.homeGreeting).waitForDisplayed({ timeout: 30000 });
  }

  async ensureLoggedIn(): Promise<void> {
    const isHome = await this.isDisplayedOn(SEL.homeGreeting, 3000);
    if (isHome) return;

    const onPin = await this.isDisplayedOn(SEL.pinContainer, 3000);
    if (onPin) {
      await this.handlePin(PIN);
      await this.handleNotificationPopup();
      await (await this.homeGreeting).waitForDisplayed({ timeout: 15000 });
      return;
    }

    const onLogin = await this.isDisplayedOn(SEL.loginTitle, 3000);
    if (!onLogin) {
      await this.resetApp();
      await browser.pause(5000); // splash screen — no observable element signals readiness
    }

    await this.doLogin();
  }
}

export const loginPage = new LoginPage();
