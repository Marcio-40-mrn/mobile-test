import { APP_ID, IS_IOS, byPlatform } from '../utils/platform';

type Element = ReturnType<typeof $>;

// Pausa fixa antes de cada ação na tela (pedido do usuário em 2026-09-18): o build
// 1.6.0 (138) fica ocupado entre telas e ações disparadas cedo demais se perdem
// (PIN não digitado, toque no X do sheet, busca não aplicada). ACTION_DELAY_MS
// calibra sem mexer em código; 0 desliga.
const ACTION_DELAY_MS = Number(process.env.ACTION_DELAY_MS ?? 4000);

export class BasePage {
  /** Chamado na linha anterior a cada clique, digitação, scroll ou gesto. */
  protected async beforeAction(): Promise<void> {
    if (ACTION_DELAY_MS <= 0) return;
    await browser.pause(ACTION_DELAY_MS); // o app não expõe sinal de "pronto para receber input"
  }

  // O seletor de um mesmo elemento muda por plataforma, então a checagem recebe
  // o elemento já resolvido pelo getter da página — nunca uma string.
  async isDisplayed(element: Element, timeout = 5000): Promise<boolean> {
    try {
      await (await element).waitForDisplayed({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Popups ────────────────────────────────────────────────────────────────

  /**
   * Botão que aplica a OTA no popup "Atualização disponível" — capturado em
   * 2026-09-16 no build 1.6.0 nas duas plataformas (drafts/{android,ios}/captures/01-ota).
   *
   * Android: AlertDialog nativo — título `com.aramis.arys:id/alert_title`, botões
   *   `android:id/button2` "AGORA NÃO" e `android:id/button1` "REINICIAR".
   * iOS: XCUIElementTypeAlert `name == "Atualização disponível"`, botões "Agora não" e
   *   "Reiniciar" (não "REINICIAR" — o texto não vem em maiúsculas no iOS).
   */
  get updateRestartButton() {
    return $(byPlatform({
      android: '//android.widget.Button[@resource-id="android:id/button1" and @text="REINICIAR"]',
      ios: '-ios predicate string:type == "XCUIElementTypeButton" AND name == "Reiniciar"',
    }));
  }

  get notificationPopupTitle() {
    return $(byPlatform({
      android: '//*[@text="Permita notificações"]',
      ios: '-ios predicate string:name == "Permita notificações"',
    }));
  }

  /**
   * @param timeout espera máxima pelo popup; `0` consulta a árvore uma vez só e
   *   segue — não dá para passar `0` ao `waitForDisplayed`, que nesse caso cai no
   *   `waitforTimeout: 10000` do `wdio.conf.ts`.
   * @returns true se o popup apareceu e o app foi reiniciado.
   */
  async dismissUpdatePopupIfPresent(timeout = 20000): Promise<boolean> {
    const presente = timeout > 0
      ? await this.isDisplayed(this.updateRestartButton, timeout)
      : await (await this.updateRestartButton).isExisting();
    if (!presente) return false;
    if (IS_IOS) {
      // Alerta nativo: `mobile: alert` é o caminho que funcionou na captura; o clique
      // por seletor em alertas do iOS pode acertar a cópia invisível.
      await this.beforeAction();
      await this.acceptSystemAlert('Reiniciar');
    } else {
      await this.beforeAction();
      await (await this.updateRestartButton).click();
    }
    await this.waitForRestartToFinish();
    return true;
  }

  /** Após o REINICIAR o app recarrega e volta para a tela de login. */
  async waitForRestartToFinish(): Promise<void> {
    const emailField = $(byPlatform({
      android: '//android.widget.EditText[@hint="Digite seu e-email"]',
      ios: '~input-sign-in-email-input',
    }));
    await (await emailField).waitForDisplayed({ timeout: 45000 });
  }

  async handleNotificationPopup(): Promise<void> {
    if (IS_IOS) {
      // No iOS os popups pós-PIN chegam juntos (capturas 11–14 de 2026-09-16): o
      // alerta ATT do sistema na frente, o de notificações (XCUIElementTypeAlert
      // `Permita notificações`, botões "Abrir configurações"/"Cancelar") logo
      // atrás, e o sheet de onboarding cobrindo a home. Tratar só o de
      // notificações deixaria a saudação invisível — por isso a sequência
      // inteira mora aqui; cada passo é no-op quando o popup não aparece.
      await this.dismissTrackingPromptIfPresent();
      await this.beforeAction();
      await this.acceptSystemAlert('Cancelar');
      await (await this.notificationPopupTitle)
        .waitForDisplayed({ reverse: true, timeout: 5000 })
        .catch(() => { throw new Error('Alerta "Permita notificações" continua na tela após o Cancelar.'); });
      await this.dismissOnboardingSheetIfPresent();
      return;
    }
    // No Android o primeiro CANCELAR não fecha o popup — só o segundo (medido no
    // build 1.5.0/133 em 2026-09-15, via Appium: clique #1 → ainda visível após
    // 4 s; clique #2 → some em 1 s e não volta). Por isso cada clique confere se
    // o popup sumiu antes de seguir, em vez de assumir que fechou.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!await this.isDisplayed(this.notificationPopupTitle, attempt === 0 ? 4000 : 1000)) return;
      await this.beforeAction();
      await $('//*[@text="CANCELAR"]').click();
      const dismissed = await (await this.notificationPopupTitle)
        .waitForDisplayed({ reverse: true, timeout: 3000 })
        .then(() => true, () => false);
      if (dismissed) return;
    }
    throw new Error('Popup "Permita notificações" continua na tela após 3 cliques em CANCELAR.');
  }

  /** Alerta de rastreamento (ATT) — existe só no iOS; no Android é no-op. */
  async dismissTrackingPromptIfPresent(): Promise<void> {
    if (!IS_IOS) return;
    await this.acceptSystemAlert('Ask App Not to Track');
  }

  /**
   * Fecha o bottom sheet de onboarding do primeiro login ("Veja como usar o
   * Arys no seu dia a dia"). Enquanto está aberto, o backdrop cobre a tela
   * inteira e engole qualquer toque na home.
   *
   * Android (build 1.5.0/133, dump de 2026-09-15): o sheet e o botão de fechar
   * estão na árvore (`onboarding-welcome-sheet`, `btn-onboarding-welcome-close`).
   *
   * iOS: o conteúdo NÃO existe na árvore de acessibilidade — nem o botão de
   * fechar —, então não há elemento para clicar. O toque usa frações da tela em
   * vez de pixels para sobreviver a devices de resolução diferente. Remover
   * quando o app expuser o sheet na árvore.
   */
  async dismissOnboardingSheetIfPresent(): Promise<void> {
    if (IS_IOS) {
      const sheetHandle = $('~Bottom sheet handle');
      if (!await this.isDisplayed(sheetHandle, 3000)) return;

      const { width, height } = await driver.getWindowSize();
      await this.beforeAction();
      await driver.execute('mobile: tap', { x: width * 0.88, y: height * 0.335 });
      await (await sheetHandle).waitForDisplayed({ reverse: true, timeout: 8000 });
      return;
    }

    const sheet = $('//*[@resource-id="onboarding-welcome-sheet"]');
    if (!await this.isDisplayed(sheet, 3000)) return;
    await this.beforeAction();
    await $('//*[@resource-id="btn-onboarding-welcome-close"]').click();
    // O sheet passou de 8 s para fechar no AVD com o 1.6.0 (138) (run 2026-09-18 19:00);
    // folga para o Device Farm, que é mais lento.
    await (await sheet).waitForDisplayed({ reverse: true, timeout: 20000 });
  }

  private async acceptSystemAlert(buttonLabel: string): Promise<void> {
    try {
      await driver.execute('mobile: alert', { action: 'accept', buttonLabel });
    } catch {
      // Alerta ausente nesta execução — é um caminho normal, não um erro.
    }
  }

  // ─── Entrada de texto ──────────────────────────────────────────────────────

  /**
   * Dispara a busca depois do setValue.
   *
   * No iOS o setValue escreve o texto mas não emite o evento que o React Native
   * escuta: sem acionar a tecla de submit do teclado a lista não filtra.
   */
  async submitSearch(): Promise<void> {
    if (!IS_IOS) {
      await this.beforeAction();
      await browser.pressKeyCode(66);
      return;
    }
    // O rótulo da tecla acompanha o idioma do device.
    await this.beforeAction();
    await $('-ios predicate string:type == "XCUIElementTypeButton" AND (name == "Search" OR name == "Buscar" OR name == "Pesquisar")').click();
  }

  /**
   * Preenche um campo de texto.
   *
   * Android: `setValue` (o UiAutomator2 injeta o texto sem passar pelo teclado).
   * iOS: o WDA digita pelo teclado, e o TextInput controlado do React Native perde
   * caracteres quando as teclas chegam mais rápido do que o teclado sobe. Medido
   * em 2026-09-16 (capturas 04/17/32): clicar o campo, esperar o teclado, 1 s de
   * reflow e `maxTypingFrequency: 20` só durante o `addValue` — 31/12/6/16
   * caracteres sem perda. O ajuste é restaurado ao padrão (60) em seguida.
   */
  async typeInto(element: Element, text: string): Promise<void> {
    // O clique dá foco ao campo: sem ele, no Android o Enter (`pressKeyCode 66`)
    // que dispara a busca não chega ao campo (medido no AVD, build 1.6.0).
    await this.beforeAction();
    await (await element).click();
    if (!IS_IOS) {
      await (await element).setValue(text);
      return;
    }
    await browser
      .waitUntil(() => driver.isKeyboardShown(), { timeout: 5000 })
      .catch(() => { /* alguns campos abrem o teclado sem reportar; segue e valida pelo valor */ });
    await browser.pause(1000); // keyboard slide-in reflow — no element signals it finished
    await driver.updateSettings({ maxTypingFrequency: 20 });
    try {
      await (await element).addValue(text);
    } finally {
      await driver.updateSettings({ maxTypingFrequency: 60 });
    }
  }

  /** No iOS o clearValue costuma deixar resíduo no campo; repete até esvaziar. */
  async clearField(element: Element, attempts = 3): Promise<void> {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await this.beforeAction();
      await (await element).clearValue();
      if (!await (await element).getText()) return;
    }
  }

  // ─── Gestos ────────────────────────────────────────────────────────────────

  /**
   * Toca no centro do elemento.
   *
   * O click() do WDA não entrega o toque em alvos pequenos (o botão de info da
   * home tem 20x21 pt e não reage); o tap por coordenada resolve.
   */
  async tapCenter(element: Element): Promise<void> {
    await this.beforeAction();
    if (!IS_IOS) {
      await (await element).click();
      return;
    }
    const { x, y } = await (await element).getLocation();
    const { width, height } = await (await element).getSize();
    await driver.execute('mobile: tap', { x: x + width / 2, y: y + height / 2 });
  }

  /**
   * Toca num alvo e confirma pelo estado seguinte.
   *
   * Android: um `click()` e a espera pelo elemento esperado.
   * iOS: o primeiro toque em certos alvos não registra (medido em 2026-09-16 em
   * `btn-campaign-section-view-all`, `btn-customer-section-info` e `~Pós Vendas` —
   * o segundo toque idêntico funcionou). Repete uma vez se o estado esperado não
   * aparecer; falha nomeando o alvo se ainda assim não mudar.
   */
  async tapUntil(
    target: Element,
    expected: Element,
    attempts = IS_IOS ? 2 : 1,
    timeout = IS_IOS ? 4000 : 30000, // Android: "Campanhas e segmentos" leva 4,5–9 s no AVD (1.6.0/138); folga para o Device Farm
  ): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      await this.tapCenter(target);
      if (await this.isDisplayed(expected, timeout)) return;
      if (attempt < attempts) console.warn(`[tap] toque ${attempt}/${attempts} não mudou a tela — repetindo`);
    }
    throw new Error(`Toque em ${(await target).selector} não levou ao estado esperado (${(await expected).selector}) após ${attempts} tentativa(s).`);
  }

  private async scrollableArea(): Promise<{ left: number; top: number; width: number; height: number }> {
    const { width, height } = await driver.getWindowSize();
    const areaWidth = width * 0.6;
    const areaHeight = height * 0.3;
    return {
      left: (width - areaWidth) / 2,
      top: height * 0.4, // um pouco abaixo do meio, longe da barra de gestos do sistema
      width: areaWidth,
      height: areaHeight,
    };
  }

  /**
   * `mobile: scrollGesture` é exclusivo do UiAutomator2. No XCUITest usamos
   * `mobile: swipe`, cuja direção é invertida: o dedo sobe ('up') para revelar
   * o conteúdo de baixo. Como o swipe não tem noção de percentual, aproximamos
   * por repetição.
   */
  private async scroll(direction: 'up' | 'down', percent: number): Promise<void> {
    await this.beforeAction();
    if (IS_IOS) {
      const swipes = Math.max(1, Math.round(percent));
      const iosDirection = direction === 'down' ? 'up' : 'down';
      for (let i = 0; i < swipes; i += 1) {
        await driver.execute('mobile: swipe', { direction: iosDirection });
      }
    } else {
      await driver.execute('mobile: scrollGesture', {
        ...(await this.scrollableArea()),
        direction,
        percent,
      });
    }
    await browser.pause(500); // scroll animation — no element signals completion
  }

  async scrollDown(percent: number): Promise<void> {
    await this.scroll('down', percent);
  }

  async scrollUp(percent: number): Promise<void> {
    await this.scroll('up', percent);
  }

  /**
   * Rola até o elemento aparecer. Substitui o padrão de "tenta, rola meio passo,
   * tenta de novo" que estava repetido em vários métodos.
   */
  async scrollIntoView(element: Element, percent = 0.5, attempts = 2): Promise<void> {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (await (await element).isDisplayed().catch(() => false)) return;
      await this.scrollDown(percent);
    }
  }

  /** Arrasta uma faixa horizontal — usado na barra de abas de clientes. */
  async dragHorizontally(top: number, height: number, fromRatio: number, toRatio: number): Promise<void> {
    await this.beforeAction();
    const { width } = await driver.getWindowSize();
    if (IS_IOS) {
      const y = top + height / 2;
      await driver.execute('mobile: dragFromToForDuration', {
        duration: 0.8,
        fromX: width * fromRatio,
        fromY: y,
        toX: width * toRatio,
        toY: y,
      });
    } else {
      await driver.execute('mobile: scrollGesture', {
        left: 0, top, width, height,
        direction: toRatio > fromRatio ? 'right' : 'left',
        percent: 0.75,
      });
    }
    await browser.pause(500); // tab bar scroll animation — no element signals completion
  }

  // ─── Ciclo de vida do app ──────────────────────────────────────────────────

  /**
   * Limpa os dados do app. A chave do payload muda de plataforma — `bundleId` no
   * iOS, `appId` no Android — e o endpoint interativo do Device Farm (Remote
   * Access) recusa o comando por completo, restando só reiniciar o app.
   */
  async resetAppState(): Promise<void> {
    try {
      await driver.execute('mobile: clearApp', byPlatform({
        android: { appId: APP_ID },
        ios: { bundleId: APP_ID },
      }));
    } catch (error) {
      // Remote Access responde "This command is not supported by AWS Device
      // Farm: clearApp". Sem limpeza o app reabre logado — `relaunchApp()` cobre
      // isso no iOS deslogando pelo próprio app.
      console.warn('[app] clearApp indisponível neste ambiente:', error);
    }
  }

  /** Sequência canônica de reinício usada pelos specs. */
  async relaunchApp(): Promise<void> {
    await driver.terminateApp(APP_ID);
    await this.resetAppState();
    await driver.activateApp(APP_ID);
    await browser.pause(5000); // splash screen — no observable element signals readiness
    await this.dismissTrackingPromptIfPresent();
    if (IS_IOS) await this.signOutIfLoggedInIOS();
  }

  /**
   * iOS sem `clearApp` (Remote Access): o app reabre na home ou na tela de PIN.
   * Desloga pelo app para o spec partir da tela de login como no Android
   * (`pm clear`). Locators da captura de 2026-09-16: menu `btn-menu-sign-out`
   * (captura 39) e, na tela de PIN, `btn-pin-back` "Voltar e sair da conta"
   * (captura 10). Se já estiver no login (ou no popup OTA), não faz nada.
   */
  private async signOutIfLoggedInIOS(): Promise<void> {
    const loginScreen = $('~scroll-sign-in');
    if (await this.isDisplayed(loginScreen, 3000)) return;
    if (await this.isDisplayed(this.updateRestartButton, 1000)) return;

    const pinBack = $('~btn-pin-back');
    if (await this.isDisplayed(pinBack, 1000)) {
      await this.tapUntil(pinBack, loginScreen);
      return;
    }

    // Home: pode haver o alerta de notificações e o sheet de onboarding na frente.
    await this.beforeAction();
    await this.acceptSystemAlert('Cancelar');
    await this.dismissOnboardingSheetIfPresent();
    const menuTab = $('~tab-menu-5');
    if (!await this.isDisplayed(menuTab, 5000)) return; // tela desconhecida — o fluxo de login decide
    await this.tapUntil(menuTab, $('~btn-menu-sign-out'));
    await this.tapUntil($('~btn-menu-sign-out'), loginScreen);
  }
}
