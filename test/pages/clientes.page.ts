import { BasePage } from './base.page';
import { IS_IOS, byPlatform } from '../utils/platform';

// Rótulo de cada opção de "Ordenar por" → testID capturado no Android
// (drafts/android/captures/1.6.0-138/18-ordenar-por.xml).
const SORT_OPTION_IDS: Record<string, string> = {
  'Nome do cliente A-Z': 'sort-option-name-asc',
  'Nome do cliente Z-A': 'sort-option-name-desc',
  'Nível do cliente': 'sort-option-customer-level',
  'Contato mais recente': 'sort-option-last-contact-desc',
  'Contato mais antigo': 'sort-option-last-contact-asc',
  'Ticket médio mais alto': 'sort-option-avg-ticket-desc',
  'Ticket médio mais baixo': 'sort-option-avg-ticket-asc',
};

export const FILTROS_ORDENACAO = Object.keys(SORT_OPTION_IDS);

class ClientesPage extends BasePage {
  // As abas do topo têm o mesmo accessibility id nas duas plataformas.
  get clientesTab() {
    return $(byPlatform({ android: '~Clientes', ios: '~tab-customers-2' }));
  }

  get screenTitle() {
    return $(byPlatform({ android: '//*[@text="Meus clientes"]', ios: '~Meus clientes' }));
  }

  get totalClientesLabel() {
    return $(byPlatform({
      android: '//*[contains(@text, "Total de clientes")]',
      ios: '-ios predicate string:name BEGINSWITH "Total de clientes"',
    }));
  }

  get sortFilterBtn() {
    return $(byPlatform({
      android: '//android.view.ViewGroup[@resource-id="filterable-top-tab-bar-sort-button"]',
      ios: '~filterable-top-tab-bar-sort-button',
    }));
  }

  get hojeLabel() {
    return $(byPlatform({
      android: '//*[contains(@text, "Hoje")]',
      ios: '-ios predicate string:name BEGINSWITH "segmented-control-tab-hoje"',
    }));
  }

  get contatadosLabel() {
    return $(byPlatform({
      android: '//*[contains(@text, "Contatados")]',
      ios: '-ios predicate string:name BEGINSWITH "segmented-control-tab-contatados"',
    }));
  }

  get searchField() {
    return $(byPlatform({
      android: '//android.widget.EditText[@text="Buscar..."]',
      ios: '~filterable-top-tab-bar-search-input-input',
    }));
  }

  get noResultsMessage() {
    return $(byPlatform({
      android: '//*[contains(@text, "Nenhum cliente encontrado!")]',
      ios: '-ios predicate string:name CONTAINS "Nenhum cliente encontrado!"',
    }));
  }

  get sortModalTitle() {
    return $(byPlatform({
      android: '//*[@text="Ordenar por"]',
      ios: '-ios predicate string:name == "Ordenar por"',
    }));
  }

  /**
   * Opção do modal de ordenação.
   *
   * Android: testID por opção (`sort-option-*`). iOS: o bottom sheet não expõe
   * os filhos na árvore XCUITest, então o predicate deriva do literal visível.
   * Enquanto o app não corrigir a acessibilidade do sheet, o `waitForDisplayed`
   * falha por timeout nomeando exatamente a opção ausente.
   */
  private sortOption(label: string) {
    return $(byPlatform({
      android: `//*[@resource-id="${SORT_OPTION_IDS[label]}"]`,
      ios: `-ios predicate string:name == "${label}"`,
    }));
  }

  private tabByName(name: string) {
    return $(`~${name}`);
  }

  async navigateToClientes(): Promise<void> {
    await this.beforeAction();
    await (await this.clientesTab).click();
    await browser.pause(2000); // navigation animation — no element signals completion
  }

  async waitForTitle(): Promise<void> {
    await (await this.screenTitle).waitForDisplayed({ timeout: 5000 });
  }

  async navigateToTab(name: string): Promise<void> {
    let tab = this.tabByName(name);
    if (!await this.isTabOnScreen(tab)) {
      await this.scrollTabBarRight();
      tab = this.tabByName(name);
    }
    if (!IS_IOS) {
      await this.beforeAction();
      await (await tab).click();
      await browser.pause(1500); // tab switch animation — no element signals completion
      return;
    }
    // iOS: o 1º toque na aba pode não selecionar (capturas 35→37) — confirma pelo
    // segmento que a aba exibe e repete uma vez.
    await this.tapUntil(tab, this.segmentShownBy(name));
  }

  /**
   * No iOS uma aba pode existir com `visible="true"` e `x` negativo ("Cashback Exp."
   * em x = −109, captura 26) ou nem existir até o arrasto ("Pós Vendas"); só a
   * posição diz se ela está mesmo na tela.
   */
  private async isTabOnScreen(tab: ReturnType<typeof $>): Promise<boolean> {
    if (!await (await tab).isDisplayed().catch(() => false)) return false;
    if (!IS_IOS) return true;
    const { x } = await (await tab).getLocation();
    const { width } = await (await tab).getSize();
    const { width: screenWidth } = await driver.getWindowSize();
    return x >= 0 && x + width <= screenWidth;
  }

  /** Segmento superior que identifica cada aba (capturas 29, 31, 37, 38). */
  private segmentShownBy(tabName: string) {
    if (tabName === 'Favoritos') return this.totalClientesLabel;
    if (tabName === 'Pós Vendas') return this.contatadosLabel;
    return this.hojeLabel;
  }

  /** Arrasta a barra de abas para revelar as que nascem fora da tela. */
  private async scrollTabBarRight(): Promise<void> {
    const anchor = await this.tabByName('Favoritos');
    const { y } = await anchor.getLocation();
    const { height } = await anchor.getSize();
    await this.dragHorizontally(y, height, 0.15, 0.85);
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

  /**
   * iOS — bloqueado pelo app: o bottom sheet "Ordenar por" não expõe as 7 opções
   * à árvore XCUITest (captura 30 de 2026-09-16, `drafts/ios/09-ordenar-por.md`);
   * o passo falha aqui até o app corrigir a acessibilidade do sheet. Não mascarar
   * com coordenadas (regra 6 do REQUIREMENTS).
   */
  async openSortFilter(): Promise<void> {
    await this.beforeAction();
    await (await this.sortFilterBtn).click();
    await (await this.sortOption(FILTROS_ORDENACAO[0])).waitForDisplayed({ timeout: 5000 });
  }

  async selectSortOption(filtro: string): Promise<void> {
    const el = this.sortOption(filtro);
    await this.scrollSortModalIntoView(el);
    await (await el).waitForDisplayed({ timeout: 5000 });
    await this.beforeAction();
    await (await el).click();
    if (IS_IOS) {
      await browser.pause(1500); // sort apply animation — no element signals completion
      return;
    }
    // Selecionar fecha o sheet (< 1 s no AVD; cada consulta XPath custa ~0,7 s) — só então
    // a lista reordenada vale. Folga para o Device Farm.
    await (await this.sortModalTitle).waitForDisplayed({ reverse: true, timeout: 20000 });
  }

  private async scrollSortModalIntoView(element: ReturnType<typeof $>): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (await (await element).isDisplayed().catch(() => false)) return;
      await this.scrollSortModalDown();
    }
  }

  private async scrollSortModalDown(): Promise<void> {
    await this.beforeAction();
    if (IS_IOS) {
      // No iOS as 7 opções cabem sem rolagem; o swipe genérico basta como rede.
      await this.scrollDown(1);
      return;
    }
    const title = await this.sortModalTitle;
    const { y } = await title.getLocation();
    const { height: titleHeight } = await title.getSize();
    const { width, height: screenHeight } = await driver.getWindowSize();
    const top = y + titleHeight;
    const bottomMargin = screenHeight * 0.2; // evita a barra de gestos do sistema na borda inferior
    await driver.execute('mobile: scrollGesture', {
      left: 0, top, width, height: screenHeight - top - bottomMargin,
      direction: 'down',
      percent: 0.75,
    });
    await browser.pause(500); // sort modal scroll animation — no element signals completion
  }

  async verifyFilterResult(botaoTexto: string, mensagemVazio: string): Promise<void> {
    if (!IS_IOS) {
      // Uma consulta só para os dois desfechos: cada XPath custa 0,5–0,8 s neste
      // build, e esperar 5 s pelo botão numa aba vazia (3 das 4) somava ~2 min no `it`.
      await $(`//*[@text="${botaoTexto}" or @text="${mensagemVazio}"]`).waitForDisplayed({ timeout: 20000 });
      return;
    }

    // No iOS o rótulo do botão do card fica no label do testID indexado.
    const actionButton = $('-ios predicate string:name BEGINSWITH "btn-customer-card-action-"');
    const found = await (await actionButton)
      .waitForDisplayed({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (found) return;

    const emptyMessage = $(`-ios predicate string:name CONTAINS "${mensagemVazio}"`);
    await (await emptyMessage).waitForDisplayed({ timeout: 5000 });
  }

  async applySortFilter(filtro: string, botaoTexto: string, mensagemVazio: string): Promise<void> {
    await this.openSortFilter();
    await this.selectSortOption(filtro);
    await this.verifyFilterResult(botaoTexto, mensagemVazio);
  }

  async searchClient(query: string): Promise<void> {
    await this.beforeAction();
    await (await this.searchField).click();
    await this.typeInto(this.searchField, query);
    await this.submitSearch();
    await browser.pause(2000); // search results animation — no element signals completion
  }

  /**
   * iOS — bloqueado pelo app: o card "Nenhum cliente encontrado!" renderiza mas não
   * existe na árvore (capturas 32–33, `drafts/ios/10-busca-clientes-sem-resultado.md`).
   */
  async waitForNoResults(): Promise<void> {
    await (await this.noResultsMessage).waitForDisplayed({ timeout: 8000 });
  }

  async clearSearch(currentValue: string): Promise<void> {
    const field = IS_IOS
      ? this.searchField
      : $(`//android.widget.EditText[@text="${currentValue}"]`);
    await this.beforeAction();
    await (await field).click();
    await this.clearField(field);
    await this.submitSearch();
    await browser.pause(1000); // search clear animation — no element signals completion
  }

  async resetSort(): Promise<void> {
    await this.openSortFilter();
    await this.selectSortOption('Nome do cliente A-Z');
  }
}

export const clientesPage = new ClientesPage();
