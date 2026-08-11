import { BasePage } from './base.page';
import {
  L,
  byText,
  byTextContains,
  byTestId,
  byAccessibilityLabel,
} from '../support/locator';

const SEL = {
  homeTab: byAccessibilityLabel('Inicio'),
  clientsTab: byAccessibilityLabel('Clientes'),
  campaignsTab: byAccessibilityLabel('Campanhas'),
  menuTab: byAccessibilityLabel('Menu'),
  greeting: byTextContains('Olá,'),
  searchField: byText('Buscar por cliente...'),
  searchResultCard: {
    android: '//*[contains(@resource-id, "customer-card-search")]',
    ios: '//*[contains(@name, "customer-card-search")]',
  },
  clientProfileTitle: byTextContains('Perfil do cliente'),
  // O acoplamento a android.view.ViewGroup é mantido: soltá-lo (`//*[@resource-id=…]`)
  // ampliaria o match para qualquer nó com o mesmo id, e isso não é verificável
  // sem device. No iOS o `~` já resolve pelo accessibilityIdentifier.
  backButton: {
    android: '//android.view.ViewGroup[@resource-id="navigation-back-button"]',
    ios: '~navigation-back-button',
  },
  campaignsSection: byText('Campanhas'),
  campaignsSectionViewAllBtn: byTestId('btn-campaign-section-view-all'),
  campaignsScreenTitle: byText('Campanhas e segmentos'),
  customerSectionInfoBtn: byTestId('btn-customer-section-info'),
  customerSectionInfoText: byTextContains('Nesta área, o Arys'),
  customerSectionViewAllBtn: byTestId('btn-customer-section-view-all'),
  myCustomersScreenTitle: byTextContains('Meus clientes'),
  myCustomersSection: byText('Meus clientes'),
  contactsSection: {
    android: '//android.widget.TextView[@text="Contatos feitos"]',
    ios: '//XCUIElementTypeStaticText[@label="Contatos feitos"]',
  },
};

class HomePage extends BasePage {
  get homeTab() { return $(L(SEL.homeTab)); }
  get greeting() { return $(L(SEL.greeting)); }
  get searchField() { return $(L(SEL.searchField)); }
  get searchResultCard() { return $(L(SEL.searchResultCard)); }
  get clientProfileTitle() { return $(L(SEL.clientProfileTitle)); }
  get backButton() { return $(L(SEL.backButton)); }
  get campaignsSection() { return $(L(SEL.campaignsSection)); }
  get campaignsSectionViewAllBtn() { return $(L(SEL.campaignsSectionViewAllBtn)); }
  get campaignsScreenTitle() { return $(L(SEL.campaignsScreenTitle)); }
  get customerSectionInfoBtn() { return $(L(SEL.customerSectionInfoBtn)); }
  get customerSectionInfoText() { return $(L(SEL.customerSectionInfoText)); }
  get customerSectionViewAllBtn() { return $(L(SEL.customerSectionViewAllBtn)); }
  get myCustomersScreenTitle() { return $(L(SEL.myCustomersScreenTitle)); }
  get myCustomersSection() { return $(L(SEL.myCustomersSection)); }
  get contactsSection() { return $(L(SEL.contactsSection)); }
  get clientsTab() { return $(L(SEL.clientsTab)); }
  get campaignsTab() { return $(L(SEL.campaignsTab)); }
  get menuTab() { return $(L(SEL.menuTab)); }

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
    await this.submitSearch();
  }

  async waitForSearchResult(name: string): Promise<void> {
    await (await $(L(byTextContains(name)))).waitForDisplayed({ timeout: 8000 });
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
    await (await $(L(byText(currentValue)))).clearValue();
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
    await this.scrollIntoViewByRetry(() => this.customerSectionInfoBtn);
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
    await this.scrollIntoViewByRetry(() => $(L(byAccessibilityLabel(name))));
    await (await $(L(byAccessibilityLabel(name)))).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForMyCustomersSection(): Promise<void> {
    await (await this.myCustomersSection).waitForDisplayed({ timeout: 8000 });
  }

  async waitForContactsSection(): Promise<void> {
    await this.scrollIntoViewByRetry(() => this.contactsSection);
    await (await this.contactsSection).waitForDisplayed({ timeout: 5000 });
  }
}

export const homePage = new HomePage();
