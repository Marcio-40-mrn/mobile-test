/**
 * Camada de seletores por plataforma.
 *
 * Os specs e os métodos das páginas são únicos; só as *strings* de seletor
 * divergem entre UiAutomator2 e XCUITest. `L()` resolve o par no momento da
 * chamada, já com a sessão ativa — por isso usa `driver.isIOS` e não a env var
 * de `./platform`.
 *
 * ```ts
 * get submitButton() {
 *   return $(L({
 *     android: '//*[@resource-id="btn-sign-in-submit"]',
 *     ios: '~btn-sign-in-submit',
 *   }));
 * }
 * ```
 *
 * Regras de tradução Android → iOS aplicadas neste repo:
 *
 * | Android                          | iOS                                              |
 * |----------------------------------|--------------------------------------------------|
 * | `//*[@resource-id="x"]`          | `~x` (testID do RN vira accessibilityIdentifier) |
 * | `@text` / `contains(@text, …)`   | `@label` / `contains(@label, …)`                 |
 * | `@hint` (placeholder)            | `@value` no campo vazio                          |
 * | `android.widget.EditText`        | `XCUIElementTypeTextField`                       |
 * | campo de senha                   | `XCUIElementTypeSecureTextField`                 |
 * | `android.widget.TextView`        | `XCUIElementTypeStaticText`                      |
 * | `android.view.ViewGroup`         | `XCUIElementTypeOther`                           |
 *
 * ATENÇÃO: os seletores iOS deste repositório ainda **não foram validados contra
 * um device real**. Foram derivados das regras acima; a validação depende do page
 * source coletado por `test/specs/zz-ios-dump.spec.ts` no AWS Device Farm.
 */
export interface PlatformSelector {
  android: string;
  ios: string;
}

export function L(map: PlatformSelector): string {
  return driver.isIOS ? map.ios : map.android;
}

// ─── Construtores de seletor compartilhados ──────────────────────────────────
// Usados por mais de uma página (ou com valor interpolado em runtime); ficam
// aqui para não duplicar a regra de tradução em cada page object.

/** Elemento cujo texto visível é exatamente `value`. */
export const byText = (value: string): PlatformSelector => ({
  android: `//*[@text="${value}"]`,
  ios: `//*[@label="${value}"]`,
});

/** Elemento cujo texto visível contém `value`. */
export const byTextContains = (value: string): PlatformSelector => ({
  android: `//*[contains(@text, "${value}")]`,
  ios: `//*[contains(@label, "${value}")]`,
});

/**
 * Elemento identificado por testID do React Native.
 * Android: `testID` → `resource-id`. iOS: `testID` → `accessibilityIdentifier` (`name`),
 * que é o que a estratégia `~` (accessibility id) casa no XCUITest.
 */
export const byTestId = (id: string): PlatformSelector => ({
  android: `//*[@resource-id="${id}"]`,
  ios: `~${id}`,
});

/** Campo de entrada cujo conteúdo atual é `value` (usado para limpar buscas). */
export const byInputValue = (value: string): PlatformSelector => ({
  android: `//android.widget.EditText[@text="${value}"]`,
  ios: `//XCUIElementTypeTextField[@value="${value}"]`,
});

/**
 * Elemento exposto à acessibilidade por rótulo.
 *
 * No Android `~` casa `content-desc` (= `accessibilityLabel` do RN). No iOS `~`
 * casa `name`, que é o `accessibilityIdentifier` quando existe e só cai para o
 * `label` quando não existe — então um componente que tenha `testID` diferente do
 * label **não** é alcançável por este seletor no iOS. Onde isso se confirmar no
 * dump, troque a entrada `ios` por `//*[@label="…"]`.
 */
export const byAccessibilityLabel = (label: string): PlatformSelector => ({
  android: `~${label}`,
  ios: `~${label}`,
});
