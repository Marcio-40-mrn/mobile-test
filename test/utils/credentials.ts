// Conta de teste usada pela suíte — uma por execução, resolvida em runtime.
//
// Hoje o projeto usa uma única conta (TEST_USER_EMAIL) em todos os aparelhos. A
// estrutura já aceita uma conta por device, ativada só por secrets do CI:
//
//   Android — o run é um só para o pool inteiro e o host recebe as
//     environmentVariables do schedule-run. O CI lê o pool, ordena os devices
//     pelo nome (LC_ALL=C sort) e manda duas listas na MESMA ordem:
//       TEST_USER_EMAILS        = e-mail por device (CSV)
//       TEST_USER_DEVICE_MODELS = modelId por device (CSV) — o mesmo valor que
//                                 o UiAutomator2 devolve em capabilities.deviceModel
//     O aparelho descobre o próprio índice com indexOf(deviceModel). Nenhum
//     modelo de aparelho fica no repositório: a lista vem do pool a cada run.
//     Por que deviceModel e não DEVICEFARM_DEVICE_NAME: no Android essa variável
//     é o número de série, muda por run e não dá para mapear.
//
//   iOS — o host NÃO recebe environmentVariables (medido no projeto de referência,
//     MobileWDIO, "CI iOS Run #6"). O CI agenda um run por iPhone e injeta
//     TEST_USER_EMAIL já escolhido no testspec daquele run. Aqui só se lê a variável.
//
// Sem nenhum CSV, o comportamento é o de sempre: TEST_USER_EMAIL.
//
// Senha por ambiente (medido em 2026-09-16): TEST_USER_PASSWORD só vale no Android
// de development; no iOS (todos os ambientes) e no Android de production a senha da
// mesma conta é TEST_USER_PASSWORD_IOS. Ela é usada no iOS sempre e no Android quando
// o build é o de production (BUILD_PROFILE_ANDROID=production — a mesma variável que
// escolhe o build no EAS), com fallback para TEST_USER_PASSWORD.
import { IS_IOS } from './platform';

export interface TestAccount {
  email: string;
  password: string;
  pin: string;
}

interface EmailSources {
  email?: string;
  emailsCsv?: string;
  modelsCsv?: string;
}

interface Logger {
  log(message: string): void;
  warn(message: string): void;
}

const CI_HINT =
  'No CI, Android recebe TEST_USER_EMAIL/TEST_USER_EMAILS pelas environmentVariables do ' +
  'step "Agenda o run (Android)" de mobile_test.yml; iOS recebe TEST_USER_EMAIL pela linha ' +
  '__CREDENCIAIS_DO_RUN__ que o step "Agenda os runs (iOS)" substitui em testspec-ios.yml.';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Localmente, preencha o .env; ${CI_HINT}`,
    );
  }
  return value;
}

export function splitCsv(csv?: string): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** Só a parte local do e-mail — o bastante para conferir a distribuição no log. */
export function emailPrefix(email: string): string {
  return `${email.split('@')[0]}@…`;
}

/**
 * Escolhe o e-mail desta execução. Lógica pura para ser testada sem device.
 */
export function pickEmail(
  sources: EmailSources,
  deviceModel?: string,
  logger: Logger = console,
): string {
  const emails = splitCsv(sources.emailsCsv);
  const models = splitCsv(sources.modelsCsv);

  if (emails.length === 0) {
    if (!sources.email) {
      throw new Error(`Nenhuma conta de teste: defina TEST_USER_EMAIL (ou TEST_USER_EMAILS). ${CI_HINT}`);
    }
    return sources.email;
  }

  if (models.length !== emails.length) {
    throw new Error(
      `TEST_USER_EMAILS tem ${emails.length} e-mail(s) e TEST_USER_DEVICE_MODELS tem ` +
        `${models.length} modelo(s) — as duas listas vêm do mesmo step do workflow e precisam ` +
        'ter o mesmo tamanho e a mesma ordem.',
    );
  }

  const index = deviceModel ? models.findIndex((entry) => modelMatches(entry, deviceModel)) : -1;
  if (index === -1) {
    logger.warn(
      `⚠ Device model "${deviceModel ?? '?'}" não está em TEST_USER_DEVICE_MODELS — ` +
        `usando conta[0] = ${emailPrefix(emails[0])}`,
    );
    return emails[0];
  }

  logger.log(`🔑 Device model "${deviceModel}" -> conta[${index}] = ${emailPrefix(emails[index])}`);
  return emails[index];
}

/**
 * Alguns devices do Device Farm têm modelId composto ("{SM-A515F,SM-A515U1}"); o CI
 * o transporta como "SM-A515F|SM-A515U1" para a vírgula não quebrar o CSV.
 */
function modelMatches(entry: string, deviceModel: string): boolean {
  return entry.split('|').includes(deviceModel);
}

let cached: TestAccount | undefined;

/**
 * Conta desta execução. Só pode ser chamada com a sessão aberta (lê
 * `browser.capabilities` no Android), por isso é lazy — nunca em import-time.
 */
export function resolveAccount(): TestAccount {
  if (cached) return cached;

  const password = resolvePassword();
  const pin = requireEnv('TEST_USER_PIN');
  const email = pickEmail(
    {
      email: process.env.TEST_USER_EMAIL,
      emailsCsv: process.env.TEST_USER_EMAILS,
      modelsCsv: process.env.TEST_USER_DEVICE_MODELS,
    },
    currentDeviceModel(),
  );

  cached = { email, password, pin };
  return cached;
}

export function isProductionTrack(env: NodeJS.ProcessEnv = process.env): boolean {
  return IS_IOS || (env.BUILD_PROFILE_ANDROID ?? '').toLowerCase() === 'production';
}

function resolvePassword(): string {
  if (isProductionTrack() && process.env.TEST_USER_PASSWORD_IOS) return process.env.TEST_USER_PASSWORD_IOS;
  return requireEnv('TEST_USER_PASSWORD');
}

/** `deviceModel` que o UiAutomator2 devolve na sessão (ex.: SM-S938U1). iOS não expõe. */
export function currentDeviceModel(): string | undefined {
  if (IS_IOS) return undefined;
  const capabilities = browser.capabilities as Record<string, unknown>;
  const model = capabilities['deviceModel'];
  return typeof model === 'string' ? model : undefined;
}
