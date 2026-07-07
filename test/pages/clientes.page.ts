import { BasePage } from './base.page';

export const FILTROS_ORDENACAO = [
  'Nome do cliente A-Z',
  'Nome do cliente Z-A',
  'Nível do cliente',
  'Contato mais recente',
  'Contato mais antigo',
  'Ticket médio mais alto',
  'Ticket médio mais baixo',
];

class ClientesPage extends BasePage {
  get clientesTab() { return $('~Clientes'); }
  get screenTitle() { return $('//*[@text="Meus clientes"]'); }
  get totalClientesLabel() { return $('//*[contains(@text, "Total de clientes")]'); }
  get sortFilterBtn() { return $('//android.view.ViewGroup[@resource-id="filterable-top-tab-bar-sort-button"]'); }
  get hojeLabel() { return $('//*[contains(@text, "Hoje")]'); }
  get contatadosLabel() { return $('//*[contains(@text, "Contatados")]'); }
  get searchField() { return $('//android.widget.EditText[@text="Buscar..."]'); }
  get noResultsMessage() { return $('//*[contains(@text, "Nenhum cliente encontrado!")]'); }

  async navigateToClientes(): Promise<void> {
    await (await this.clientesTab).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForTitle(): Promise<void> {
    await (await this.screenTitle).waitForDisplayed({ timeout: 5000 });
  }

  async navigateToTab(name: string): Promise<void> {
    await (await $(`~${name}`)).click();
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
    await (await $(`//*[@text="${FILTROS_ORDENACAO[0]}"]`)).waitForDisplayed({ timeout: 5000 });
  }

  async selectSortOption(filtro: string): Promise<void> {
    const el = await $(`//*[@text="${filtro}"]`);
    await el.scrollIntoView();
    await el.click();
    await browser.pause(1500);
  }

  async verifyFilterResult(botaoTexto: string, mensagemVazio: string): Promise<void> {
    const found = await (await $(`//*[@text="${botaoTexto}"]`))
      .waitForDisplayed({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!found) {
      await (await $(`//*[@text="${mensagemVazio}"]`)).waitForDisplayed({ timeout: 5000 });
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
    await browser.pressKeyCode(66);
    await browser.pause(2000); // search results animation — no element signals completion
  }

  async waitForNoResults(): Promise<void> {
    await (await this.noResultsMessage).waitForDisplayed({ timeout: 8000 });
  }

  async clearSearch(currentValue: string): Promise<void> {
    const field = await $(`//android.widget.EditText[@text="${currentValue}"]`);
    await field.click();
    await field.clearValue();
    await browser.pressKeyCode(66);
    await browser.pause(1000); // search clear animation — no element signals completion
  }

  async resetSort(): Promise<void> {
    await this.openSortFilter();
    await this.selectSortOption('Nome do cliente A-Z');
  }
}

export const clientesPage = new ClientesPage();
