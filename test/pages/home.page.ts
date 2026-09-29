import { BasePage } from './base.page';
import { IS_IOS, byPlatform } from '../utils/platform';

/** No iOS os atalhos expõem o testID indexado; no Android, o rótulo visível. */
const SHORTCUT_IOS_IDS: Record<string, string> = {
  'Aniversariantes': '~btn-customer-tag-1-aniversariantes',
  'Cashback expirando': '~btn-customer-tag-2-cashback-expirando',
  'Pós-venda': '~btn-customer-tag-3-pós-venda',
};

class HomePage extends BasePage {
  get homeTab() {
    return $(byPlatform({ android: '~Inicio', ios: '~tab-home-1' }));
  }

  get clientsTab() {
    return $(byPlatform({ android: '~Clientes', ios: '~tab-customers-2' }));
  }

  get campaignsTab() {
    return $(byPlatform({ android: '~Campanhas', ios: '~tab-campaigns-3' }));
  }

  get menuTab() {
    return $(byPlatform({ android: '~Menu', ios: '~tab-menu-5' }));
  }

  get greeting() {
    return $(byPlatform({
      android: '//*[contains(@text, "Olá,")]',
      ios: '~greeting-header',
    }));
  }

  get searchField() {
    return $(byPlatform({
      android: '//*[@text="Buscar por cliente..."]',
      ios: '~home-search-input-input',
    }));
  }

  /** No iOS a busca abre uma tela dedicada, com um segundo campo. */
  get searchResultsInput() {
    return $(byPlatform({
      android: '//*[@text="Buscar por cliente..."]',
      ios: '~input-customer-search-input',
    }));
  }

  get searchResultCard() {
    return $(byPlatform({
      android: '//*[contains(@resource-id, "customer-card-search")]',
      ios: '-ios predicate string:name BEGINSWITH "customer-card-search"',
    }));
  }

  get clientProfileTitle() {
    return $(byPlatform({
      android: '//*[contains(@text, "Perfil do cliente")]',
      ios: '~Perfil do cliente',
    }));
  }

  get backButton() {
    return $(byPlatform({
      android: '//android.view.ViewGroup[@resource-id="navigation-back-button"]',
      ios: '~navigation-back-button',
    }));
  }

  get campaignsSection() {
    return $(byPlatform({ android: '//*[@text="Campanhas"]', ios: '~Campanhas' }));
  }

  get campaignsSectionViewAllBtn() {
    return $(byPlatform({
      android: '//*[@resource-id="btn-campaign-section-view-all"]',
      ios: '~btn-campaign-section-view-all',
    }));
  }

  get campaignsScreenTitle() {
    return $(byPlatform({
      android: '//*[@text="Campanhas e segmentos"]',
      ios: '~Campanhas e segmentos',
    }));
  }

  get customerSectionInfoBtn() {
    return $(byPlatform({
      android: '//*[@resource-id="btn-customer-section-info"]',
      ios: '~btn-customer-section-info',
    }));
  }

  get customerSectionInfoText() {
    return $(byPlatform({
      android: '//*[contains(@text, "Nesta área, o Arys")]',
      ios: '-ios predicate string:name BEGINSWITH "Nesta área, o Arys"',
    }));
  }

  get customerSectionViewAllBtn() {
    return $(byPlatform({
      android: '//*[@resource-id="btn-customer-section-view-all"]',
      ios: '~btn-customer-section-view-all',
    }));
  }

  get myCustomersScreenTitle() {
    return $(byPlatform({
      android: '//*[contains(@text, "Meus clientes")]',
      ios: '~Meus clientes',
    }));
  }

  get myCustomersSection() {
    return $(byPlatform({ android: '//*[@text="Meus clientes"]', ios: '~Meus clientes' }));
  }

  /** No iOS "Contatos feitos" não é elemento próprio: é o label do card do dashboard. */
  get contactsSection() {
    return $(byPlatform({
      android: '//android.widget.TextView[@text="Contatos feitos"]',
      ios: '-ios predicate string:label BEGINSWITH "Contatos feitos"',
    }));
  }

  async navigateToHome(): Promise<void> {
    await this.beforeAction();
    await (await this.homeTab).click();
    await browser.pause(1000); // navigation animation — no element signals completion
  }

  async waitForGreeting(): Promise<void> {
    await (await this.greeting).waitForDisplayed({ timeout: 8000 });
  }

  /**
   * Busca por cliente a partir da home. Nas duas plataformas o texto entra no
   * campo da própria home e a tela de resultados (`input-customer-search-input`)
   * só existe depois do submit — no iOS pela tecla Search do teclado (capturas
   * 16–18 de 2026-09-16).
   */
  async searchClient(name: string): Promise<void> {
    await (await this.searchField).waitForDisplayed({ timeout: 8000 });
    await this.typeInto(this.searchField, name);
    await this.submitSearch();
    if (IS_IOS) {
      await (await this.searchResultsInput).waitForDisplayed({ timeout: 10000 });
    }
  }

  async waitForSearchResult(name: string): Promise<void> {
    const result = $(byPlatform({
      android: `//*[contains(@text, "${name}")]`,
      ios: `-ios predicate string:label CONTAINS "${name}"`,
    }));
    await (await result).waitForDisplayed({ timeout: 8000 });
  }

  async openFirstSearchResult(): Promise<void> {
    await this.beforeAction();
    await (await this.searchResultCard).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForClientProfile(): Promise<void> {
    await (await this.clientProfileTitle).waitForDisplayed({ timeout: 10000 });
  }

  async goBack(): Promise<void> {
    await this.beforeAction();
    await (await this.backButton).click();
    await browser.pause(1000); // navigation animation — no element signals completion
  }

  /** Depois dos dois `goBack()` o valor buscado continua no campo da home (captura 21). */
  async clearSearchField(currentValue: string): Promise<void> {
    const field = IS_IOS
      ? this.searchField
      : $(`//*[@text="${currentValue}"]`);
    await this.clearField(field);
    await browser.pause(500); // field clear animation — no element signals completion
  }

  async openAllCampaigns(): Promise<void> {
    // iOS: 1º toque perdido medido neste botão (capturas 22→23) — tapUntil repete.
    await this.tapUntil(this.campaignsSectionViewAllBtn, this.campaignsScreenTitle);
  }

  async waitForCampaignsScreen(): Promise<void> {
    await (await this.campaignsScreenTitle).waitForDisplayed({ timeout: 8000 });
  }

  async toggleCustomerSectionInfo(): Promise<void> {
    await this.scrollIntoView(this.customerSectionInfoBtn);
    await (await this.customerSectionInfoBtn).waitForDisplayed({ timeout: 5000 });
    if (!IS_IOS) {
      await this.tapCenter(this.customerSectionInfoBtn);
      await browser.pause(1000); // toggle animation — no element signals completion
      return;
    }
    // iOS: alvo de 20x21 pt (click() não entrega o toque) e 1º toque perdido
    // (captura 25). É um toggle, então o estado esperado depende do atual: abre
    // se estava fechado, fecha se estava aberto — e repete uma vez se não mudou.
    const wasOpen = await this.isDisplayed(this.customerSectionInfoText, 1000);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await this.tapCenter(this.customerSectionInfoBtn);
      const changed = await (await this.customerSectionInfoText)
        .waitForDisplayed({ reverse: wasOpen, timeout: 4000 })
        .then(() => true, () => false);
      if (changed) return;
    }
    throw new Error(`Botão de info de "Meus clientes" não ${wasOpen ? 'fechou' : 'abriu'} o texto após 2 toques.`);
  }

  async waitForCustomerInfoText(): Promise<void> {
    await (await this.customerSectionInfoText).waitForDisplayed({ timeout: 8000 });
  }

  async openAllCustomers(): Promise<void> {
    await this.tapUntil(this.customerSectionViewAllBtn, this.myCustomersScreenTitle);
  }

  async waitForMyCustomersScreen(): Promise<void> {
    await (await this.myCustomersScreenTitle).waitForDisplayed({ timeout: 8000 });
  }

  async clickShortcutButton(name: string): Promise<void> {
    const btn = $(byPlatform({
      android: `~${name}`,
      ios: SHORTCUT_IOS_IDS[name] ?? `~${name}`,
    }));
    await this.scrollIntoView(btn);
    await this.tapUntil(btn, this.myCustomersScreenTitle);
  }

  async waitForMyCustomersSection(): Promise<void> {
    await (await this.myCustomersSection).waitForDisplayed({ timeout: 8000 });
  }

  async waitForContactsSection(): Promise<void> {
    await this.scrollIntoView(this.contactsSection);
    await (await this.contactsSection).waitForDisplayed({ timeout: 5000 });
  }
}

export const homePage = new HomePage();
