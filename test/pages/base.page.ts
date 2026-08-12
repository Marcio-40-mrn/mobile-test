import { L, byText, PlatformSelector } from '../support/locator';
import { ANDROID_APP_ID } from '../support/platform';

/**
 * Bundle identifier do app iOS, lido da sessão.
 *
 * Nos dois alvos iOS o app é aberto por caminho (`appium:app`) — no Device Farm
 * via `$DEVICEFARM_APP_PATH`, localmente via `REMOTE_PATH_IOS`. O bundle id só é
 * necessário para remover/reinstalar o app, e o XCUITest o reporta de volta nas
 * capabilities negociadas. Não há variável de ambiente para isso.
 */
function resolveIosBundleId(caps: Record<string, unknown>): string | undefined {
  return (caps['appium:bundleId'] ?? caps['bundleId'] ?? caps['CFBundleIdentifier']) as
    | string
    | undefined;
}

export class BasePage {
  // ─── Seletores compartilhados ──────────────────────────────────────────────
  // Vivem aqui porque aparecem em mais de uma página / em fluxos de reset.

  /** Botão do popup de atualização OTA. */
  protected get restartButtonSel(): PlatformSelector {
    return byText('REINICIAR');
  }

  /** Campo de e-mail — usado por `dismissUpdatePopupIfPresent` para aguardar o relaunch. */
  protected get emailFieldSel(): PlatformSelector {
    return {
      // O typo "e-email" é do próprio app; o seletor precisa espelhá-lo.
      android: '//android.widget.EditText[@hint="Digite seu e-email"]',
      ios: '//XCUIElementTypeTextField[@value="Digite seu e-email"]',
    };
  }

  // ─── Utilitários ───────────────────────────────────────────────────────────

  async isDisplayed(selector: string, timeout = 5000): Promise<boolean> {
    try {
      const el = await $(selector);
      await el.waitForDisplayed({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  /** Como `isDisplayed`, mas resolvendo o seletor da plataforma corrente. */
  async isDisplayedOn(sel: PlatformSelector, timeout = 5000): Promise<boolean> {
    return this.isDisplayed(L(sel), timeout);
  }

  async dismissUpdatePopupIfPresent(): Promise<void> {
    const hasUpdate = await this.isDisplayedOn(this.restartButtonSel, 20000);
    if (hasUpdate) {
      await (await $(L(this.restartButtonSel))).click();
      await (await $(L(this.emailFieldSel))).waitForDisplayed({ timeout: 45000 });
    }
  }

  /**
   * Dispensa o modal *do app* que pede permissão de notificação.
   *
   * Não é o diálogo nativo do sistema: no Android o fluxo clica em CANCELAR antes
   * de o `POST_NOTIFICATIONS` aparecer, e no iOS o alerta nativo é absorvido pela
   * capability `appium:autoAcceptAlerts` (ver wdio.conf.ts).
   */
  async handleNotificationPopup(): Promise<void> {
    const hasPopup = await this.isDisplayedOn(byText('Permita notificações'), 4000);
    if (hasPopup) {
      await (await $(L(byText('CANCELAR')))).click();
      await browser.pause(1000); // notification dismiss animation — no element signals completion
    }
  }

  // ─── Gestos ────────────────────────────────────────────────────────────────
  // `mobile: scrollGesture` é exclusivo do UiAutomator2 e exige uma área em
  // pixels; o XCUITest usa `mobile: swipe`, que opera sobre a tela inteira e não
  // aceita `percent`.
  //
  // A área Android continua em coordenadas absolutas: `percent` é multiplicado
  // pela altura da área, então derivá-la do viewport mudaria a distância de cada
  // scroll (num 1440x3120 seriam ~780px em vez de 200px) e os testes de Home/
  // Clientes, que dependem dessa calibragem, poderiam passar do alvo. Trocar isso
  // exige rodar a suíte num device — ver a nota de resolução no README.

  async scrollDown(percent: number): Promise<void> {
    await this.scroll('down', percent);
  }

  async scrollUp(percent: number): Promise<void> {
    await this.scroll('up', percent);
  }

  /**
   * Rola até que o elemento fique visível, tentando `attempts` vezes.
   *
   * Extrai o padrão "se não está visível, rola" que estava duplicado em três
   * lugares de `home.page.ts`. Mantém o comportamento original (duas tentativas
   * de 0.5) em vez de usar `scrollIntoView()`, para não alterar a calibragem de
   * scroll do Android sem poder validá-la num device.
   */
  protected async scrollIntoViewByRetry(
    getEl: () => ReturnType<typeof $>,
    attempts = 2,
    percent = 0.5,
  ): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      if (await (await getEl()).isDisplayed().catch(() => false)) return;
      await this.scrollDown(percent);
    }
  }

  private async scroll(direction: 'up' | 'down', percent: number): Promise<void> {
    if (driver.isIOS) {
      // No iOS o swipe é por gesto discreto: `percent` vira número de repetições.
      // A direção é a do *conteúdo*, invertida em relação ao gesto do dedo.
      const times = Math.max(1, Math.round(percent));
      for (let i = 0; i < times; i++) {
        await driver.execute('mobile: swipe', { direction });
      }
    } else {
      await driver.execute('mobile: scrollGesture', {
        left: 100, top: 300, width: 300, height: 400,
        direction,
        percent,
      });
    }
    await browser.pause(500); // scroll animation — no element signals completion
  }

  // ─── Ciclo de vida do app ──────────────────────────────────────────────────

  /**
   * Reinicia o app com estado limpo.
   *
   * Android: `mobile: clearApp` apaga os dados sem reinstalar. O XCUITest não tem
   * equivalente, então no iOS removemos e reinstalamos o app.
   *
   * O caminho do .ipa vem da capability `appium:app` — no Device Farm ela é
   * injetada via `$DEVICEFARM_APP_PATH`, e na sessão remota local vem de
   * `REMOTE_PATH_IOS`. O bundle id vem da sessão; se ela não reportar um, o
   * reset degrada para relançar o app sem limpar os dados, em vez de falhar.
   */
  async resetApp(): Promise<void> {
    if (driver.isIOS) {
      // O servidor pode devolver a capability negociada com ou sem o prefixo
      // `appium:`, então aceitamos as duas formas.
      const caps = driver.capabilities as Record<string, unknown>;
      const appPath = (caps['appium:app'] ?? caps['app']) as string | undefined;
      const bundleId = resolveIosBundleId(caps);

      if (!bundleId) {
        console.warn('[resetApp] Sessão iOS não reportou bundle id — relançando sem limpar dados.');
        await driver.execute('mobile: launchApp', {});
        return;
      }

      await driver.terminateApp(bundleId);
      if (appPath) {
        await driver.removeApp(bundleId);
        await driver.installApp(appPath);
      }
      await driver.activateApp(bundleId);
    } else {
      await driver.execute('mobile: clearApp', { appId: ANDROID_APP_ID });
      await driver.activateApp(ANDROID_APP_ID);
    }
  }

  // ─── Teclado ───────────────────────────────────────────────────────────────

  /**
   * Fecha o teclado. No iOS `hideKeyboard()` falha quando não há botão de dismiss
   * (teclado sem toolbar), então o erro é absorvido — o teclado não bloquear o
   * próximo toque é o que importa, e o próprio `click()` já rola até o elemento.
   */
  async hideKeyboard(): Promise<void> {
    try {
      await driver.hideKeyboard();
    } catch {
      // Sem botão de dismiss — segue o fluxo.
    }
  }

  /**
   * Confirma uma busca acionando a tecla de submit do teclado.
   * Android: KEYCODE_ENTER (66). iOS: ação do editor via WDA.
   */
  async submitSearch(): Promise<void> {
    if (driver.isIOS) {
      await driver.execute('mobile: performEditorAction', { action: 'search' });
    } else {
      await browser.pressKeyCode(66); // KEYCODE_ENTER
    }
  }

  /** Digita no elemento focado (usado pelo campo de PIN, que não é um input comum). */
  async typeIntoFocused(text: string): Promise<void> {
    if (driver.isIOS) {
      await driver.execute('mobile: keys', { keys: text.split('') });
    } else {
      await driver.execute('mobile: type', { text });
    }
  }
}
