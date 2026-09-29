import { Options } from '@wdio/types';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import allureReporter, {
  addArgument,
  addHistoryId,
  addLabel,
  addParentSuite,
  addTestCaseId,
} from '@wdio/allure-reporter';
// allure-commandline não publica tipos; import via require tipado como função.
const allureCommandline: (args: string[]) => import('child_process').ChildProcess =
  require('allure-commandline');
import 'dotenv/config';
import { APP_ID } from './test/utils/platform';
import { deviceLabel } from './test/utils/device-name';
import { emailPrefix, resolveAccount } from './test/utils/credentials';
import {
  BuildInfo,
  buildInfoFromEnv,
  environmentProperties,
  installedAndroidBuildInfo,
} from './test/utils/build-info';

// ─── Detecção de ambiente ────────────────────────────────────────────────────
// O AWS Device Farm injeta variáveis DEVICEFARM_* no host de teste. A presença
// do UDID do device é o sinal mais confiável de que estamos rodando lá.
//
// isRemote é o modo "Remote Access": uma sessão interativa do Device Farm, cujo
// endpoint Appium é acessado por URL pré-assinada. Serve para validar a suíte iOS
// localmente, sem esperar um run completo do CI.
const isDeviceFarm = Boolean(process.env.DEVICEFARM_DEVICE_UDID);
const isIOS = process.env.PLATFORM === 'ios';
const isRemote = isIOS && Boolean(process.env.REMOTE_HOST);

// No Device Farm todos os artefatos precisam ir para $DEVICEFARM_LOG_DIR para
// serem coletados como artifacts; localmente ficam em ./reports e ./test/screenshots.
const LOG_DIR = process.env.DEVICEFARM_LOG_DIR ?? process.cwd();
const ALLURE_RESULTS_DIR = isDeviceFarm
  ? path.join(LOG_DIR, 'allure-results')
  : path.join(process.cwd(), 'reports', 'allure-results');
const ALLURE_REPORT_DIR = isDeviceFarm
  ? path.join(LOG_DIR, 'allure-report')
  : path.join(process.cwd(), 'reports', 'allure-report');
const SCREENSHOTS_DIR = isDeviceFarm
  ? LOG_DIR
  : path.join(process.cwd(), 'test', 'screenshots');
const VIDEOS_DIR = isDeviceFarm
  ? LOG_DIR
  : path.join(process.cwd(), 'test', 'videos');
// APK instalado no AVD local. ARYS_APK_PATH aponta outro build (ex.: o que já está
// no emulador) sem sobrescrever o download padrão — ver CONCERNS.md §8.
const APK_PATH = process.env.ARYS_APK_PATH ?? 'C:\\dev\\apk_arys\\arys-latest.apk';

// Gera um nome de arquivo seguro (sem caracteres especiais) a partir do teste,
// com timestamp — reutilizado por vídeo e screenshot.
function testFileBaseName(test: { fullName?: string; parent?: string; title?: string }): string {
  const fullName = test.fullName ?? `${test.parent}_${test.title}`;
  const safeName = fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${safeName}_${timestamp}`;
}

// environment.properties = widget "Environment" do relatório (versão/build/profile do app).
function writeAllureEnvironment(info: BuildInfo): void {
  const environment = isDeviceFarm ? 'AWS Device Farm' : isRemote ? 'Remote Access' : 'Local (AVD)';
  fs.mkdirSync(ALLURE_RESULTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ALLURE_RESULTS_DIR, 'environment.properties'),
    environmentProperties(info, { environment, isIOS }),
  );
  console.log(
    `[allure] environment.properties: ${environment}, app ${info.appVersion ?? 'n/d'} (${info.appBuildVersion ?? 'n/d'}), profile ${info.buildProfile ?? 'n/d'}`,
  );
}

// Um nó por aparelho no Allure. Os N devices do pool rodam o mesmo teste com o
// mesmo título; sem historyId/testCaseId próprios o Allure os colapsa num teste só
// com "retries". O rótulo vem do host ou do CI (test/utils/device-name.ts) — nada
// de nome de aparelho no código. addArgument não altera o historyId nesta versão,
// por isso os dois ids são setados explicitamente.
async function labelTestWithDevice(test: { parent?: string; title?: string }): Promise<void> {
  try {
    const device = deviceLabel();
    const id = `${test.parent ?? ''} ${test.title ?? ''}::${device}`;
    await addHistoryId(id);
    await addTestCaseId(id);
    await addParentSuite(`${device} — ${emailPrefix(resolveAccount().email)}`);
    await addArgument('Device', device);
    addLabel('host', device);
  } catch (e) {
    console.warn('[allure] Falha ao rotular o teste com o device:', e);
  }
}

// ─── Capabilities ────────────────────────────────────────────────────────────
// No Device Farm, deviceName/app/udid/platformVersion são fornecidos pelo Appium
// via `--default-capabilities` no testspec; aqui só declaramos o que não vem
// de lá. Localmente apontamos o device fixo e o APK baixado do EAS.
const androidCapability = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:appPackage': APP_ID,
  'appium:appActivity': `${APP_ID}.MainActivity`,
  'appium:noReset': true,
};

const androidLocalCapability = {
  ...androidCapability,
  'appium:deviceName': 'S25Ultra_API35',
  'appium:app': APK_PATH,
  'appium:enforceAppInstall': true,
};

const iosCapability = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:bundleId': APP_ID,
  'appium:noReset': true,
};

// Escolhe as capabilities do ambiente corrente — do caso mais específico ao menos.
function buildCapabilities(): Record<string, unknown>[] {
  if (isDeviceFarm && isIOS) {
    // O WDA precisa vir pré-compilado do host mac do Device Farm; sem estas duas
    // capabilities o xcodebuild tenta compilá-lo na hora e falha com "code 70".
    return [{
      ...iosCapability,
      'appium:usePrebuiltWDA': true,
      // O caminho vem do testspec-ios.yml (fase pre_test), que escolhe o WDA pela
      // versão major do driver XCUITest e exporta DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH;
      // os nomes DEVICEFARM_WDA_DERIVED_DATA_PATH* são do host legado (fallback).
      'appium:derivedDataPath':
        process.env.DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH ??
        process.env.DEVICEFARM_WDA_DERIVED_DATA_PATH_V9 ??
        process.env.DEVICEFARM_WDA_DERIVED_DATA_PATH,
      // Log do xcodebuild no appium.log — diagnóstico do WDA (igual à referência MobileWDIO).
      'appium:showXcodeLog': true,
    }];
  }
  if (isDeviceFarm) return [androidCapability];
  if (isIOS) {
    // Remote Access: o app já está instalado na sessão e o endpoint rejeita
    // `usePrebuiltWDA` como capability reservada — passá-la derruba a sessão.
    return [{ ...iosCapability, 'appium:newCommandTimeout': 1200 }];
  }
  return [androidLocalCapability];
}

// No Device Farm o Appium já está no ar (subido pelo testspec na fase pre_test)
// em localhost:4723. Em Remote Access falamos com o endpoint pré-assinado por
// HTTPS. Localmente o appium service gerencia host/porta sozinho.
function buildConnectionSettings(): Partial<Options.Testrunner> {
  if (isRemote) {
    return {
      protocol: 'https',
      hostname: process.env.REMOTE_HOST,
      port: Number(process.env.REMOTE_PORT ?? 443),
      path: process.env.REMOTE_PATH_IOS,
    };
  }
  if (isDeviceFarm) {
    return { hostname: 'localhost', port: 4723, path: '/' };
  }
  return {};
}

// O Appium local só sobe quando o servidor não é externo.
function buildServices(): Options.Testrunner['services'] {
  if (isDeviceFarm || isRemote) return [];
  return [['appium', { command: 'appium', args: { relaxedSecurity: true } }]];
}

// ─── Reporters ───────────────────────────────────────────────────────────────
// html-nice só faz sentido em execução local; no Device Farm publicamos via Allure.
const reporters: Options.Testrunner['reporters'] = ['spec'];
if (!isDeviceFarm) {
  reporters.push([
    'html-nice',
    {
      outputDir: './reports/html',
      filename: 'report.html',
      reportTitle: 'Automation Arys - Test Report',
      showInBrowser: false,
      collapseTests: false,
      useOnAfterCommandForScreenshot: false,
    },
  ]);
}
reporters.push([
  'allure',
  {
    outputDir: ALLURE_RESULTS_DIR,
    disableWebdriverStepsReporting: true,
    disableWebdriverScreenshotsReporting: false,
  },
]);

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true,
    },
  },

  specs: [
    './test/specs/login.spec.ts',
    './test/specs/home.spec.ts',
    './test/specs/clientes.spec.ts',
  ],

  maxInstances: 1,

  capabilities: buildCapabilities(),

  ...buildConnectionSettings(),

  logLevel: 'warn',
  bail: 0,

  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: buildServices(),

  framework: 'mocha',

  reporters,

  mochaOpts: {
    ui: 'bdd',
    // O `it` de clientes (4 abas × 7 filtros) mediu 529 s no AVD com o build 1.6.0 (138)
    // e estourou 600 s duas vezes em 2026-09-18; o Device Farm é mais lento que o AVD.
    timeout: 1200000,
  },

  onPrepare: async function () {
    // No Device Farm o app já é instalado no device pelo próprio serviço, e no
    // iOS não há o que baixar aqui: o .ipa vem do Device Farm (CI) ou já está
    // instalado na sessão de Remote Access. Versão/build/profile chegam pelo
    // ambiente (o CI os extrai do EAS) — ver test/utils/build-info.ts.
    if (isDeviceFarm || isIOS) {
      writeAllureEnvironment(buildInfoFromEnv());
      return;
    }

    fs.rmSync(ALLURE_RESULTS_DIR, { recursive: true, force: true });
    if (process.env.SKIP_DOWNLOAD === 'true') {
      // Sem download, a versão é a do APK que já está no emulador.
      writeAllureEnvironment({ ...buildInfoFromEnv(), ...installedAndroidBuildInfo() });
      return;
    }

    const { downloadLatestBuild } = await import('./scripts/download-build');
    const info = await downloadLatestBuild();
    console.log('[install] Instalando APK no device...');
    execSync(`adb install -r "${APK_PATH}"`, { stdio: 'inherit' });
    console.log('[install] APK instalado.');
    writeAllureEnvironment(info);
  },

  beforeTest: async function (test) {
    await labelTestWithDevice(test);

    // Remote Access não suporta gravação de tela. No Device Farm iOS o XCUITest
    // exige ffmpeg no host e o macos_tahoe não tem (run #30: "'ffmpeg' binary is
    // not found in PATH"); o vídeo vem do artefato VIDEO que o próprio Device Farm
    // grava por job — o step "Coleta artefatos" o anexa aos resultados do aparelho.
    if (isRemote || (isDeviceFarm && isIOS)) return;

    // Inicia a gravação de tela. Envolto em try/catch para que uma falha na
    // gravação nunca derrube o teste em si.
    try {
      if (isDeviceFarm && !isIOS) {
        // No Device Farm Android o screenrecord nativo (startRecordingScreen)
        // trunca o vídeo em ~37s na troca de surface do app. MediaProjection
        // sobrevive a isso e grava a sessão inteira.
        //
        // resolution: '1280x720' (720p) — em resolução nativa o .mp4 passava de
        // 100MB (limite por arquivo do GitHub), era apagado no publish e o vídeo
        // sumia do relatório (404). 720p reduz drasticamente o tamanho sem perder
        // a legibilidade do fluxo. priority é prioridade da thread de captura
        // (não mexe na qualidade/tamanho) — 'high' para não perder frames.
        await driver.execute('mobile: startMediaProjectionRecording', {
          resolution: '1280x720',
          maxDurationSec: 1200, // acompanha o mochaOpts.timeout — vídeo não pode terminar antes do teste
          priority: 'high',
        });
      } else {
        await driver.startRecordingScreen({ timeLimit: '180' });
      }
    } catch (e) {
      console.warn('[video] Falha ao iniciar gravação:', e);
    }
  },

  afterTest: async function (test, _context, { error }) {
    const baseName = testFileBaseName(test);

    // 1. Vídeo — sempre (todos os testes, passando ou falhando), exceto em
    // Remote Access (não suportado) e Device Farm iOS (vídeo do próprio DF, ver beforeTest).
    try {
      if (isRemote) throw new Error('gravação não suportada em Remote Access');
      if (isDeviceFarm && isIOS) throw new Error('Device Farm iOS: vídeo anexado pelo CI a partir do artefato VIDEO');
      const base64 = (isDeviceFarm && !isIOS
        ? await driver.execute('mobile: stopMediaProjectionRecording')
        : await driver.stopRecordingScreen()) as string;
      if (base64) {
        if (!fs.existsSync(VIDEOS_DIR)) {
          fs.mkdirSync(VIDEOS_DIR, { recursive: true });
        }
        const buffer = Buffer.from(base64, 'base64');
        fs.writeFileSync(path.join(VIDEOS_DIR, `${baseName}.mp4`), buffer);
        allureReporter.addAttachment('Vídeo da execução', buffer, 'video/mp4');
      }
    } catch (e) {
      console.warn('[video] Falha ao parar/anexar gravação:', e);
    }

    // 2. Screenshot — apenas em falha.
    if (!error) return;

    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    const filepath = path.join(SCREENSHOTS_DIR, `${baseName}.png`);
    await browser.saveScreenshot(filepath);
    allureReporter.addAttachment(
      'Screenshot da falha',
      fs.readFileSync(filepath),
      'image/png',
    );
  },

  onComplete: function () {
    // Em CI puro (não Device Farm) só os resultados brutos são publicados por
    // outra etapa do pipeline — não geramos o report aqui.
    if (!isDeviceFarm && process.env.CI === 'true') return;
    if (!fs.existsSync(ALLURE_RESULTS_DIR)) return;

    const generation = allureCommandline([
      'generate',
      ALLURE_RESULTS_DIR,
      '--clean',
      '-o',
      ALLURE_REPORT_DIR,
    ]);

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.error('[allure] Timeout ao gerar o report.');
        resolve();
      }, 30000);

      generation.on('exit', (exitCode: number) => {
        clearTimeout(timeout);
        if (exitCode !== 0) {
          console.error('[allure] Falha ao gerar o report (exit ' + exitCode + ').');
          resolve();
          return;
        }
        console.log('[allure] Report gerado em ' + ALLURE_REPORT_DIR + '.');
        // `allure open` sobe um servidor local e abre o browser; só em execução
        // local interativa (encerre com Ctrl+C).
        if (!isDeviceFarm && process.env.CI !== 'true') {
          allureCommandline(['open', ALLURE_REPORT_DIR]);
        }
        resolve();
      });
    });
  },
};
