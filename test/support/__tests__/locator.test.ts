import { describe, it, expect, afterEach } from 'vitest';
import {
  L,
  byText,
  byTextContains,
  byTestId,
  byInputValue,
  byAccessibilityLabel,
} from '../locator';

/**
 * `L()` lê o global `driver` fornecido pelo WebdriverIO em runtime. Aqui ele é
 * substituído por um stub, o que permite testar as regras de tradução sem device.
 */
function comPlataforma(isIOS: boolean) {
  (globalThis as Record<string, unknown>).driver = { isIOS };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).driver;
});

describe('L', () => {
  it('resolve o seletor Android quando a sessão não é iOS', () => {
    comPlataforma(false);
    expect(L({ android: 'A', ios: 'I' })).toBe('A');
  });

  it('resolve o seletor iOS quando a sessão é iOS', () => {
    comPlataforma(true);
    expect(L({ android: 'A', ios: 'I' })).toBe('I');
  });
});

describe('construtores de seletor', () => {
  it('byTestId: resource-id no Android, accessibility id no iOS', () => {
    const sel = byTestId('btn-sign-in-submit');
    expect(sel.android).toBe('//*[@resource-id="btn-sign-in-submit"]');
    expect(sel.ios).toBe('~btn-sign-in-submit');
  });

  it('byText: @text vira @label', () => {
    const sel = byText('Entrar');
    expect(sel.android).toBe('//*[@text="Entrar"]');
    expect(sel.ios).toBe('//*[@label="Entrar"]');
  });

  it('byTextContains: contains(@text) vira contains(@label)', () => {
    const sel = byTextContains('Olá,');
    expect(sel.android).toBe('//*[contains(@text, "Olá,")]');
    expect(sel.ios).toBe('//*[contains(@label, "Olá,")]');
  });

  it('byInputValue: EditText vira XCUIElementTypeTextField com @value', () => {
    const sel = byInputValue('Nomenaoexistente');
    expect(sel.android).toBe('//android.widget.EditText[@text="Nomenaoexistente"]');
    expect(sel.ios).toBe('//XCUIElementTypeTextField[@value="Nomenaoexistente"]');
  });

  it('byAccessibilityLabel: mesma estratégia ~ nas duas plataformas', () => {
    const sel = byAccessibilityLabel('Clientes');
    expect(sel.android).toBe('~Clientes');
    expect(sel.ios).toBe('~Clientes');
  });

  it('preserva acentuação e pontuação usadas na UI em português', () => {
    expect(byText('Nenhum cliente encontrado!').ios).toBe(
      '//*[@label="Nenhum cliente encontrado!"]',
    );
    expect(byText('Ticket médio mais alto').android).toBe(
      '//*[@text="Ticket médio mais alto"]',
    );
  });
});
