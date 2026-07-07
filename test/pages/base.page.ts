export class BasePage {
  async isDisplayed(selector: string, timeout = 5000): Promise<boolean> {
    try {
      const el = await $(selector);
      await el.waitForDisplayed({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  async dismissUpdatePopupIfPresent(): Promise<void> {
    const hasUpdate = await this.isDisplayed('//*[@text="REINICIAR"]', 20000);
    if (hasUpdate) {
      await $('//*[@text="REINICIAR"]').click();
      await $('//android.widget.EditText[@hint="Digite seu e-email"]').waitForDisplayed({ timeout: 45000 });
    }
  }

  async handleNotificationPopup(): Promise<void> {
    const hasPopup = await this.isDisplayed('//*[@text="Permita notificações"]', 4000);
    if (hasPopup) {
      await $('//*[@text="CANCELAR"]').click();
      await browser.pause(1000); // notification dismiss animation — no element signals completion
    }
  }

  async scrollDown(percent: number): Promise<void> {
    await driver.execute('mobile: scrollGesture', {
      left: 100, top: 300, width: 300, height: 400,
      direction: 'down',
      percent,
    });
    await browser.pause(500); // scroll animation — no element signals completion
  }

  async scrollUp(percent: number): Promise<void> {
    await driver.execute('mobile: scrollGesture', {
      left: 100, top: 300, width: 300, height: 400,
      direction: 'up',
      percent,
    });
    await browser.pause(500); // scroll animation — no element signals completion
  }
}
