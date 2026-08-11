import { BasePage } from './base.page';
import {
  L,
  byText,
  byTextContains,
  byInputValue,
  byAccessibilityLabel,
} from '../support/locator';

export const FILTROS_ORDENACAO = [
  'Nome do cliente A-Z',
  'Nome do cliente Z-A',
  'Nível do cliente',
  'Contato mais recente',
  'Contato mais antigo',
  'Ticket médio mais alto',
  'Ticket médio mais baixo',
];

const SEL = {
  clientesTab: byAccessibilityLabel('Clientes'),
  screenTitle: byText('Meus clientes'),
  totalClientesLabel: byTextContains('Total de clientes'),
  // Mantém o acoplamento a android.view.ViewGroup pelo mesmo motivo de
  // home.page.ts:backButton — não ampliar o match sem poder validar em device.
  sortFilterBtn: {
    android: '//android.view.ViewGroup[@resource-id="filterable-top-tab-bar-sort-button"]',
    ios: '~filterable-top-tab-bar-sort-button',
  },
  hojeLabel: byTextContains('Hoje'),
  contatadosLabel: byTextContains('Contatados'),
  searchField: {
    android: '//android.widget.EditText[@text="Buscar..."]',
    ios: '//XCUIElementTypeTextField[@value="Buscar..."]',
  },
  noResultsMessage: byTextContains('Nenhum cliente encontrado!'),
};

class ClientesPage extends BasePage {
  get clientesTab() { return $(L(SEL.clientesTab)); }
  get screenTitle() { return $(L(SEL.screenTitle)); }
  get totalClientesLabel() { return $(L(SEL.totalClientesLabel)); }
  get sortFilterBtn() { return $(L(SEL.sortFilterBtn)); }
  get hojeLabel() { return $(L(SEL.hojeLabel)); }
  get contatadosLabel() { return $(L(SEL.contatadosLabel)); }
  get searchField() { return $(L(SEL.searchField)); }
  get noResultsMessage() { return $(L(SEL.noResultsMessage)); }

  async navigateToClientes(): Promise<void> {
    await (await this.clientesTab).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForTitle(): Promise<void> {
    await (await this.screenTitle).waitForDisplayed({ timeout: 5000 });
  }

  async navigateToTab(name: string): Promise<void> {
    await (await $(L(byAccessibilityLabel(name)))).click();
    await browser.pause(1500); // tab switch animation — no element signals completion
  }

  async waitForTotalClientes(): Promise<void> {
    await (await this.totalClientesLabel).waitForDisplayed({ timeout: 8000 });
  }

  async waitForHoje(): Promise<void> {
    await (await this.hojeLabel).waitForDisplayed({ timeout: 8000 });
  }

  async waitForContatados(): Promise<void> {
    await (await this.contatadosLabel).waitForDisplayed({ timeout: 8000 });
  }

  async openSortFilter(): Promise<void> {
    await (await this.sortFilterBtn).click();
    await (await $(L(byText(FILTROS_ORDENACAO[0])))).waitForDisplayed({ timeout: 5000 });
  }

  async selectSortOption(filtro: string): Promise<void> {
    // scrollIntoView() do WDIO v9 funciona em contexto nativo nas duas plataformas.
    const el = await $(L(byText(filtro)));
    await el.scrollIntoView();
    await el.click();
    await browser.pause(1500); // sort re-render — no element signals completion
  }

  async verifyFilterResult(botaoTexto: string, mensagemVazio: string): Promise<void> {
    const found = await this.isDisplayedOn(byText(botaoTexto), 5000);
    if (!found) {
      await (await $(L(byText(mensagemVazio)))).waitForDisplayed({ timeout: 5000 });
    }
  }

  async applySortFilter(filtro: string, botaoTexto: string, mensagemVazio: string): Promise<void> {
    await this.openSortFilter();
    await this.selectSortOption(filtro);
    await this.verifyFilterResult(botaoTexto, mensagemVazio);
  }

  async searchClient(query: string): Promise<void> {
    const field = await this.searchField;
    await field.click();
    await field.setValue(query);
    await this.submitSearch();
    await browser.pause(2000); // search results animation — no element signals completion
  }

  async waitForNoResults(): Promise<void> {
    await (await this.noResultsMessage).waitForDisplayed({ timeout: 8000 });
  }

  async clearSearch(currentValue: string): Promise<void> {
    const field = await $(L(byInputValue(currentValue)));
    await field.click();
    await field.clearValue();
    await this.submitSearch();
    await browser.pause(1000); // search clear animation — no element signals completion
  }

  async resetSort(): Promise<void> {
    await this.openSortFilter();
    await this.selectSortOption('Nome do cliente A-Z');
  }
}

export const clientesPage = new ClientesPage();
