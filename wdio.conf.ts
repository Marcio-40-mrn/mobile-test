import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import allureReporter from '@wdio/allure-reporter';
// allure-commandline não publica tipos; import via require tipado como função.
const allureCommandline: (args: string[]) => import('child_process').ChildProcess =
  require('allure-commandline');
import 'dotenv/config';
import { IS_IOS, ANDROID_APP_ID, requireIosBundleId } from './test/support/platform';
import { BUILD_DEST } from './scripts/download-build';

// ─── Detecção de ambiente ────────────────────────────────────────────────────
// O AWS Device Farm injeta variáveis DEVICEFARM_* no host de teste. A presença
// do UDID do device é o sinal mais confiável de que estamos rodando lá.
const isDeviceFarm = Boolean(process.env.DEVICEFARM_DEVICE_UDID);

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
const APK_PATH = BUILD_DEST.android;

// Gera um nome de arquivo seguro (sem caracteres especiais) a partir do teste,
// com timestamp — reutilizado por vídeo e screenshot.
function testFileBaseName(test: { fullName?: string; parent?: string; title?: string }): string {
  const fullName = test.fullName ?? `${test.parent}_${test.title}`;
  const safeName = fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${safeName}_${timestamp}`;
}

// ─── Capabilities ────────────────────────────────────────────────────────────
// No Device Farm, deviceName/app/udid/platformVersion são fornecidos pelo Appium
// via `--default-capabilities` no testspec; aqui só declaramos o que não vem de
// lá. Localmente apontamos o device fixo e o APK baixado do EAS.
//
// iOS roda exclusivamente no Device Farm: XCUITest exige um host macOS, e a
// máquina de desenvolvimento deste projeto é Windows.
const androidCapability = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:appPackage': ANDROID_APP_ID,
  'appium:appActivity': `${ANDROID_APP_ID}.MainActivity`,
  'appium:noReset': true,
};

const localCapability = {
  ...androidCapability,
  'appium:deviceName': 'S25Ultra_API35',
  'appium:app': APK_PATH,
  'appium:enforceAppInstall': true,
};

function buildIosCapability() {
  if (!isDeviceFarm) {
    throw new Error(
      '[wdio] PLATFORM=ios só é suportado no AWS Device Farm (XCUITest exige host macOS). ' +
        'Rode via workflow_dispatch de mobile_test.yml com run_ios=true.',
    );
  }
  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:bundleId': requireIosBundleId(),
    'appium:noReset': true,
    // Absorve os alertas nativos de permissão (notificações, contatos), que no
    // Android não aparecem porque o fluxo cancela o modal do app antes.
    'appium:autoAcceptAlerts': true,
    // O WebDriverAgent precisa ser compilado/assinado no primeiro boot do host.
    'appium:wdaLaunchTimeout': 240000,
    'appium:wdaConnectionTimeout': 240000,
  };
}

const capability = IS_IOS
  ? buildIosCapability()
  : isDeviceFarm
    ? androidCapability
    : localCapability;

// ─── Reporters ───────────────────────────────────────────────────────────────
// html-nice só faz sentido em execução local; no Device Farm publicamos via Allure.
const reporters: WebdriverIO.Config['reporters'] = ['spec'];
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

export const config: WebdriverIO.Config = {
  runner: 'local',
  // `autoCompileOpts` foi removido no WDIO 8 e nenhum pacote da v9 o lê — o
  // runner detecta e registra o TypeScript sozinho a partir do tsconfig.json.

  // DUMP_SOURCE=true troca a suíte inteira pelo spec de coleta de page source,
  // usado para descobrir os seletores reais de uma plataforma ainda não mapeada.
  specs: process.env.DUMP_SOURCE === 'true'
    ? ['./test/specs/zz-dump-source.spec.ts']
    : [
        './test/specs/00-update-check.spec.ts',
        './test/specs/login.spec.ts',
        './test/specs/home.spec.ts',
        './test/specs/clientes.spec.ts',
      ],

  maxInstances: 1,

  capabilities: [capability],

  logLevel: 'warn',
  bail: 0,

  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // No Device Farm o Appium é iniciado externamente; localmente usamos o service.
  services: isDeviceFarm
    ? []
    : [['appium', { command: 'appium', args: { relaxedSecurity: true } }]],

  framework: 'mocha',

  reporters,

  mochaOpts: {
    ui: 'bdd',
    timeout: isDeviceFarm ? 600000 : 120000,
  },

  onPrepare: async function () {
    // No Device Farm o app já é instalado no device pelo próprio serviço.
    if (isDeviceFarm) return;

    fs.rmSync(ALLURE_RESULTS_DIR, { recursive: true, force: true });
    // O download/install local é específico de Android (EAS APK + adb); iOS não
    // tem caminho local — buildIosCapability() já teria falhado antes daqui.
    if (IS_IOS) return;
    if (process.env.SKIP_DOWNLOAD === 'true') return;

    const { downloadLatestBuild } = await import('./scripts/download-build');
    await downloadLatestBuild();
    console.log('[install] Instalando APK no device...');
    execSync(`adb install -r "${APK_PATH}"`, { stdio: 'inherit' });
    console.log('[install] APK instalado.');
  },

  beforeTest: async function () {
    // Inicia a gravação de tela. Envolto em try/catch para que uma falha na
    // gravação nunca derrube o teste em si.
    try {
      if (isDeviceFarm && !IS_IOS) {
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
          maxDurationSec: 600,
          priority: 'high',
        });
      } else {
        // MediaProjection é exclusivo do UiAutomator2. No iOS o XCUITest grava
        // via startRecordingScreen; `videoType`/`videoQuality` mantêm o arquivo
        // em h264 (o default MJPEG do WDA não toca em <video> no navegador).
        await driver.startRecordingScreen(
          IS_IOS
            ? { timeLimit: '600', videoType: 'libx264', videoQuality: 'medium', videoFps: 10 }
            : { timeLimit: '180' },
        );
      }
    } catch (e) {
      console.warn('[video] Falha ao iniciar gravação:', e);
    }
  },

  afterTest: async function (test, _context, { error }) {
    const baseName = testFileBaseName(test);

    // 1. Vídeo — sempre (todos os testes, passando ou falhando).
    try {
      const base64 = (isDeviceFarm && !IS_IOS
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

// No Device Farm o Appium já está no ar (subido pelo testspec.yml na fase pre_test)
// em localhost:4723; apontamos o WDIO para ele. Localmente, o appium service
// gerencia host/porta automaticamente, então nada é setado aqui.
if (isDeviceFarm) {
  config.hostname = 'localhost';
  config.port = 4723;
  config.path = '/';
}
