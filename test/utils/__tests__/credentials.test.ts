import { describe, it, expect, vi } from 'vitest';
import { pickEmail, splitCsv, emailPrefix } from '../credentials';

// Nenhum caso cita um aparelho real: os modelos são placeholders — a lista
// verdadeira vem do pool do Device Farm a cada run.
const silent = { log: vi.fn(), warn: vi.fn() };

describe('pickEmail', () => {
  it('sem CSV usa TEST_USER_EMAIL (modo de hoje)', () => {
    expect(pickEmail({ email: 'unico@x.com' }, 'MODEL-B', silent)).toBe('unico@x.com');
  });

  it('sem CSV e sem TEST_USER_EMAIL falha nomeando as variáveis', () => {
    expect(() => pickEmail({}, 'MODEL-B', silent)).toThrow(/TEST_USER_EMAIL/);
  });

  it('com CSV escolhe pelo índice do modelo, mesmo com TEST_USER_EMAIL presente', () => {
    const sources = {
      email: 'unico@x.com',
      emailsCsv: 'a@x.com,b@x.com,c@x.com',
      modelsCsv: 'MODEL-A,MODEL-B,MODEL-C',
    };
    expect(pickEmail(sources, 'MODEL-B', silent)).toBe('b@x.com');
    expect(pickEmail(sources, 'MODEL-C', silent)).toBe('c@x.com');
  });

  it('com CSV funciona sem TEST_USER_EMAIL', () => {
    const sources = { emailsCsv: 'a@x.com,b@x.com', modelsCsv: 'MODEL-A,MODEL-B' };
    expect(pickEmail(sources, 'MODEL-A', silent)).toBe('a@x.com');
  });

  it('aceita modelId composto transportado como A|B', () => {
    const sources = { emailsCsv: 'a@x.com,b@x.com', modelsCsv: 'MODEL-A1|MODEL-A2,MODEL-B' };
    expect(pickEmail(sources, 'MODEL-A2', silent)).toBe('a@x.com');
  });

  it('modelo fora da lista avisa e cai na conta[0]', () => {
    const logger = { log: vi.fn(), warn: vi.fn() };
    const sources = { emailsCsv: 'a@x.com,b@x.com', modelsCsv: 'MODEL-A,MODEL-B' };
    expect(pickEmail(sources, 'MODEL-Z', logger)).toBe('a@x.com');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('MODEL-Z'));
  });

  it('sem deviceModel (iOS) com CSV cai na conta[0] com aviso', () => {
    const logger = { log: vi.fn(), warn: vi.fn() };
    const sources = { emailsCsv: 'a@x.com,b@x.com', modelsCsv: 'MODEL-A,MODEL-B' };
    expect(pickEmail(sources, undefined, logger)).toBe('a@x.com');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('listas de tamanhos diferentes são erro', () => {
    const sources = { emailsCsv: 'a@x.com,b@x.com', modelsCsv: 'MODEL-A' };
    expect(() => pickEmail(sources, 'MODEL-A', silent)).toThrow(/mesmo tamanho/);
  });

  it('tolera espaços e vírgulas sobrando no CSV', () => {
    const sources = { emailsCsv: ' a@x.com , b@x.com, ', modelsCsv: 'MODEL-A, MODEL-B,' };
    expect(pickEmail(sources, 'MODEL-B', silent)).toBe('b@x.com');
  });

  it('nunca loga o e-mail inteiro', () => {
    const logger = { log: vi.fn(), warn: vi.fn() };
    pickEmail({ emailsCsv: 'segredo@dominio.com', modelsCsv: 'MODEL-A' }, 'MODEL-A', logger);
    const logged = logger.log.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).not.toContain('dominio.com');
    expect(logged).toContain('segredo@…');
  });
});

describe('splitCsv / emailPrefix', () => {
  it('splitCsv de vazio ou undefined é lista vazia', () => {
    expect(splitCsv(undefined)).toEqual([]);
    expect(splitCsv('')).toEqual([]);
    expect(splitCsv(' , ')).toEqual([]);
  });

  it('emailPrefix esconde o domínio', () => {
    expect(emailPrefix('pessoa@empresa.com.br')).toBe('pessoa@…');
  });
});
