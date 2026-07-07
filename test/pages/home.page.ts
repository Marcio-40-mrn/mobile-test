import { BasePage } from './base.page';

class HomePage extends BasePage {
  get homeTab() { return $('~Inicio'); }
  get greeting() { return $('//*[contains(@text, "Olá,")]'); }
  get searchField() { return $('//*[@text="Buscar por cliente..."]'); }
  get searchResultCard() { return $('//*[contains(@resource-id, "customer-card-search")]'); }
  get clientProfileTitle() { return $('//*[contains(@text, "Perfil do cliente")]'); }
  get backButton() { return $('//android.view.ViewGroup[@resource-id="navigation-back-button"]'); }
  get campaignsSection() { return $('//*[@text="Campanhas"]'); }
  get campaignsSectionViewAllBtn() { return $('//*[@resource-id="btn-campaign-section-view-all"]'); }
  get campaignsScreenTitle() { return $('//*[@text="Campanhas e segmentos"]'); }
  get customerSectionInfoBtn() { return $('//*[@resource-id="btn-customer-section-info"]'); }
  get customerSectionInfoText() { return $('//*[contains(@text, "Nesta área, o Arys")]'); }
  get customerSectionViewAllBtn() { return $('//*[@resource-id="btn-customer-section-view-all"]'); }
  get myCustomersScreenTitle() { return $('//*[contains(@text, "Meus clientes")]'); }
  get myCustomersSection() { return $('//*[@text="Meus clientes"]'); }
  get contactsSection() { return $('//android.widget.TextView[@text="Contatos feitos"]'); }
  get clientsTab() { return $('~Clientes'); }
  get campaignsTab() { return $('~Campanhas'); }
  get menuTab() { return $('~Menu'); }

  async navigateToHome(): Promise<void> {
    await (await this.homeTab).click();
    await browser.pause(1000); // navigation animation — no element signals completion
  }

  async waitForGreeting(): Promise<void> {
    await (await this.greeting).waitForDisplayed({ timeout: 8000 });
  }

  async searchClient(name: string): Promise<void> {
    const field = await this.searchField;
    await field.click();
    await field.setValue(name);
    await browser.pressKeyCode(66);
  }

  async waitForSearchResult(name: string): Promise<void> {
    await (await $(`//*[contains(@text, "${name}")]`)).waitForDisplayed({ timeout: 8000 });
  }

  async openFirstSearchResult(): Promise<void> {
    await (await this.searchResultCard).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForClientProfile(): Promise<void> {
    await (await this.clientProfileTitle).waitForDisplayed({ timeout: 10000 });
  }

  async goBack(): Promise<void> {
    await (await this.backButton).click();
    await browser.pause(1000); // navigation animation — no element signals completion
  }

  async clearSearchField(currentValue: string): Promise<void> {
    await (await $(`//*[@text="${currentValue}"]`)).clearValue();
    await browser.pause(500); // field clear animation — no element signals completion
  }

  async openAllCampaigns(): Promise<void> {
    await (await this.campaignsSectionViewAllBtn).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForCampaignsScreen(): Promise<void> {
    await (await this.campaignsScreenTitle).waitForDisplayed({ timeout: 8000 });
  }

  async toggleCustomerSectionInfo(): Promise<void> {
    if (!await (await this.customerSectionInfoBtn).isDisplayed().catch(() => false)) {
      await this.scrollDown(0.5);
    }
    if (!await (await this.customerSectionInfoBtn).isDisplayed().catch(() => false)) {
      await this.scrollDown(0.5);
    }
    await (await this.customerSectionInfoBtn).waitForDisplayed({ timeout: 5000 });
    await (await this.customerSectionInfoBtn).click();
    await browser.pause(1000); // toggle animation — no element signals completion
  }

  async waitForCustomerInfoText(): Promise<void> {
    await (await this.customerSectionInfoText).waitForDisplayed({ timeout: 8000 });
  }

  async openAllCustomers(): Promise<void> {
    await (await this.customerSectionViewAllBtn).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForMyCustomersScreen(): Promise<void> {
    await (await this.myCustomersScreenTitle).waitForDisplayed({ timeout: 8000 });
  }

  async clickShortcutButton(name: string): Promise<void> {
    const btn = await $(`~${name}`);
    if (!await btn.isDisplayed().catch(() => false)) {
      await this.scrollDown(0.5);
    }
    if (!await btn.isDisplayed().catch(() => false)) {
      await this.scrollDown(0.5);
    }
    await btn.click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForMyCustomersSection(): Promise<void> {
    await (await this.myCustomersSection).waitForDisplayed({ timeout: 8000 });
  }

  async waitForContactsSection(): Promise<void> {
    if (!await (await this.contactsSection).isDisplayed().catch(() => false)) {
      await this.scrollDown(0.5);
    }
    if (!await (await this.contactsSection).isDisplayed().catch(() => false)) {
      await this.scrollDown(0.5);
    }
    await (await this.contactsSection).waitForDisplayed({ timeout: 5000 });
  }
}

export const homePage = new HomePage();
