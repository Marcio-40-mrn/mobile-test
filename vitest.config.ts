import { defineConfig } from 'vitest/config';

/**
 * Os testes unitários cobrem lógica pura (scripts/), sem device.
 *
 * O escopo explícito é necessário: sem ele o Vitest também coleta
 * `test/specs/*.spec.ts`, que são specs do WebdriverIO — dependem dos globais
 * `browser`/`driver` e de credenciais em env, e por isso quebravam
 * `npx vitest run` inteiro na coleta.
 */
export default defineConfig({
  test: {
    include: ['scripts/__tests__/**/*.test.ts', 'test/support/__tests__/**/*.test.ts'],
  },
});
