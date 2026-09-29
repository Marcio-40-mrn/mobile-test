import { BasePage } from './base.page';
import { IS_IOS, byPlatform } from '../utils/platform';
import { resolveAccount } from '../utils/credentials';

// O popup OTA reinicia o app e devolve o fluxo à tela de login: a tentativa
// seguinte parte do zero. Duas bastam — a segunda já roda com a atualização
// aplicada, então um terceiro popup significaria outro problema.
const MAX_TENTATIVAS_LOGIN = 2;
const TIMEOUT_TELA_LOGIN_MS = 15000;

class LoginPage extends BasePage {
  get emailField() {
    return $(byPlatform({
      android: '//android.widget.EditText[@hint="Digite seu e-email"]',
      ios: '~input-sign-in-email-input',
    }));
  }

  get passwordField() {
    return $(byPlatform({
      android: '//android.widget.EditText[@hint="Digite sua senha"]',
      ios: '~input-sign-in-password-input',
    }));
  }

  get submitButton() {
    return $(byPlatform({
      android: '//*[@resource-id="btn-sign-in-submit"]',
      ios: '~btn-sign-in-submit',
    }));
  }

  /**
   * Âncora da tela de login. No iOS o texto "Entrar" aparece também no botão, e o
   * container `screen-sign-in` fica `visible="false"` enquanto o teclado está
   * fechado (captura 02 de 2026-09-16); o ScrollView `scroll-sign-in` é o nó
   * visível estável.
   */
  get loginTitle() {
    return $(byPlatform({
      android: '//*[@text="Entrar"]',
      ios: '~scroll-sign-in',
    }));
  }

  /** Banner de credencial recusada — só existe depois do submit (captura 05). */
  get credentialsErrorTitle() {
    return $(byPlatform({
      android: '//*[@text="Erro ao fazer login!"]',
      ios: '-ios predicate string:name == "Erro ao fazer login!"',
    }));
  }

  get errorTitle() {
    return $(byPlatform({
      android: '//*[@text="Campos obrigatórios"]',
      ios: '~Campos obrigatórios',
    }));
  }

  get errorMessage() {
    return $(byPlatform({
      android: '//*[@text="Por favor, preencha seu email e senha."]',
      ios: '~Por favor, preencha seu email e senha.',
    }));
  }

  get pinContainer() {
    return $(byPlatform({
      android: '//*[@resource-id="otp-input-container"]',
      ios: '~otp-input-container',
    }));
  }

  get homeGreeting() {
    return $(byPlatform({
      android: '//*[contains(@text, "Olá,")]',
      ios: '~greeting-header',
    }));
  }

  async waitForLoginScreen(): Promise<void> {
    await (await this.loginTitle).waitForDisplayed({ timeout: 10000 });
  }

  /**
   * Confere o popup OTA sem esperar por ele — uma consulta só, para caber entre
   * os passos do login sem custar timeout (UPD-03). Quando retorna `true` o
   * REINICIAR já foi aplicado e o app **já está de volta na tela de login**, com
   * os campos vazios (`waitForRestartToFinish()`): quem chamou refaz o que perdeu.
   *
   * O popup não chega só no boot: no run de 2026-09-18 ele subiu no meio do
   * `fillAndSubmit()`, depois de `launchAndCheckUpdate()` já ter validado o campo
   * de e-mail. Como é um alerta nativo, ele engole os toques seguintes e a falha
   * só aparecia 30 s adiante, na espera pela saudação da home.
   */
  private async otaReiniciouOApp(): Promise<boolean> {
    return this.dismissUpdatePopupIfPresent(0);
  }

  async fillAndSubmit(
    email = resolveAccount().email,
    senha = resolveAccount().password,
  ): Promise<void> {
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_LOGIN; tentativa += 1) {
      await this.clearField(this.emailField);
      await this.typeInto(this.emailField, email);
      if (await this.otaReiniciouOApp()) continue;

      await this.clearField(this.passwordField);
      await this.typeInto(this.passwordField, senha);
      if (await this.otaReiniciouOApp()) continue;

      if (IS_IOS) {
        // `hideKeyboard` reporta sucesso sem agir no iOS; o botão continua alcançável
        // com o teclado aberto (captura 04). Valida pelo estado seguinte: PIN ou o
        // banner de erro — assim a credencial recusada falha aqui, com nome, e não
        // 30 s depois na espera pela home.
        await this.beforeAction();
        await (await this.submitButton).click();
        const onPin = await this.isDisplayed(this.pinContainer, 15000);
        if (onPin) return;
        if (await this.otaReiniciouOApp()) continue;
        if (await this.isDisplayed(this.credentialsErrorTitle, 1000)) {
          throw new Error('Login recusado: "Erro ao fazer login! O e-mail e/ou senha estão inválidos." — confira TEST_USER_PASSWORD_IOS.');
        }
        return;
      }

      await driver.hideKeyboard();
      await this.beforeAction();
      await (await this.submitButton).click();
      if (await this.otaReiniciouOApp()) continue;
      return;
    }

    throw new Error(`Login não concluído: o popup OTA reiniciou o app em ${MAX_TENTATIVAS_LOGIN} tentativas seguidas de preenchimento.`);
  }

  /**
   * Digita o PIN.
   *
   * No iOS `mobile: type` não existe ("Method is not implemented") e o
   * `driver.keys()` é rejeitado pelo WDA ("Key Down action must have a closing
   * Key Up successor"); clicar as teclas é o único caminho. O teclado numérico
   * já abre sozinho ao chegar na tela — no Android é preciso focar o campo antes.
   */
  async handlePin(pin = resolveAccount().pin, jaRefezLogin = false): Promise<void> {
    const onPin = await this.isDisplayed(this.pinContainer, 8000);
    if (!onPin) {
      // O PIN não aparecer é caminho legítimo (o `ensureLoggedIn` chama daqui de
      // várias telas) — ou é a OTA por cima dele. Só no segundo caso há o que
      // refazer: o app voltou para o login e o formulário precisa ser reenviado.
      if (!jaRefezLogin && await this.otaReiniciouOApp()) {
        await this.fillAndSubmit();
        await this.handlePin(pin, true);
      }
      return;
    }

    if (IS_IOS) {
      await this.beforeAction();
      for (const digit of pin) {
        await $(`~${digit}`).click();
      }
      // Depois do PIN a home renderiza atrás do sheet de onboarding e do alerta
      // ATT (capturas 11–14): o handle do sheet ou a saudação sinalizam o fim.
      await $('-ios predicate string:name == "Bottom sheet handle" OR name == "greeting-header"')
        .waitForExist({ timeout: 20000 });
      return;
    }

    // Foca o campo e prova o foco pelo teclado antes de digitar: sem isso o
    // `mobile: type` cai no vazio (1 de 3 rodadas da captura de 2026-09-18).
    await this.beforeAction();
    await (await this.pinContainer).click();
    await browser.waitUntil(() => driver.isKeyboardShown(), {
      timeout: 10000, // medido 0,7–1,2 s no AVD; folga para o Device Farm
      timeoutMsg: 'PIN: teclado não abriu após focar otp-input-container.',
    });
    await this.beforeAction();
    await driver.execute('mobile: type', { text: pin });
    // O PIN aceito tira a tela de PIN — medido 5,5 s a 12 s no AVD com o build 1.6.0
    // (138); o popup de notificações chega ~0,4 s depois. Folga para o Device Farm.
    await (await this.pinContainer).waitForDisplayed({
      reverse: true,
      timeout: 45000,
      timeoutMsg: 'PIN não aceito: otp-input-container continua na tela após 45 s.',
    });
  }

  /**
   * Faz o login inteiro. A OTA pode subir no meio de uma espera longa (o PIN
   * sumir, a saudação aparecer) e derrubar o fluxo por timeout; nesse caso o
   * popup ainda está na tela, e a tentativa seguinte parte do login limpo.
   * Qualquer outra falha sobe intacta, com a mensagem original — credencial
   * recusada e PIN não aceito continuam vermelhos na hora (UPD-03).
   */
  async doLogin(): Promise<void> {
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_LOGIN; tentativa += 1) {
      try {
        await this.executarLogin();
        return;
      } catch (erro) {
        if (tentativa === MAX_TENTATIVAS_LOGIN || !await this.otaReiniciouOApp()) throw erro;
      }
    }
  }

  private async executarLogin(): Promise<void> {
    await browser.pause(6000); // splash screen — no observable element signals readiness
    await this.dismissTrackingPromptIfPresent();
    await this.dismissUpdatePopupIfPresent();

    const onLogin = await this.isDisplayed(this.loginTitle, 8000);
    if (onLogin) {
      await this.fillAndSubmit();
    }

    await this.handlePin();
    await this.dismissTrackingPromptIfPresent();
    await this.handleNotificationPopup();
    await this.dismissOnboardingSheetIfPresent();

    const hasLateUpdate = await this.dismissUpdatePopupIfPresent(8000);
    if (hasLateUpdate) {
      await this.fillAndSubmit();
      await this.handlePin();
      await this.handleNotificationPopup();
      await this.dismissOnboardingSheetIfPresent();
    }

    await (await this.homeGreeting).waitForDisplayed({ timeout: 30000 });
  }

  async ensureLoggedIn(): Promise<void> {
    const isHome = await this.isDisplayed(this.homeGreeting, 3000);
    if (isHome) return;

    const onPin = await this.isDisplayed(this.pinContainer, 3000);
    if (onPin) {
      await this.handlePin();
      await this.handleNotificationPopup();
      await this.dismissOnboardingSheetIfPresent();
      await (await this.homeGreeting).waitForDisplayed({ timeout: 15000 });
      return;
    }

    const onLogin = await this.isDisplayed(this.loginTitle, 3000);
    if (!onLogin) {
      await this.relaunchApp();
    }

    await this.doLogin();
  }

  /**
   * Ponto de partida de toda suíte: app limpo, OTA aplicada (se houver) e tela
   * de login visível. Substitui o antigo `00-update-check.spec.ts`.
   */
  async launchAndCheckUpdate(): Promise<void> {
    await this.relaunchApp();
    await this.dismissUpdatePopupIfPresent();
    try {
      await (await this.emailField).waitForDisplayed({ timeout: TIMEOUT_TELA_LOGIN_MS });
    } catch (erro) {
      // A OTA pode chegar depois dos 20 s do check acima e cobrir a tela de login.
      if (!await this.otaReiniciouOApp()) throw erro;
      await (await this.emailField).waitForDisplayed({ timeout: TIMEOUT_TELA_LOGIN_MS });
    }
  }
}

export const loginPage = new LoginPage();
