// Versão/build/profile do app sob teste, para o widget "Environment" do Allure.
//
// De onde vem cada valor:
//   CI (Device Farm) — o step "Baixa o build do EAS" extrai appVersion, appBuildVersion e
//     buildProfile do `eas build:list --json` e manda ao host como APP_VERSION,
//     APP_BUILD_VERSION e APP_BUILD_PROFILE (Android: environmentVariables; iOS: linha
//     `export` do testspec gerado). Os testspecs gravam as três no .env do host.
//   Local Android — o retorno de downloadLatestBuild() ou, com SKIP_DOWNLOAD, o
//     `adb shell dumpsys package` do APK que está no emulador.
//   iOS Remote Access — não há fonte; fica "n/d" a menos que o .env defina as variáveis.
//
// O Allure só mostra o widget quando existe allure-results/environment.properties.
// Um valor por run (não por device): no Device Farm os N devices rodam o mesmo build e
// a coleta faz cp -n — a primeira cópia vale para todos.
import { execSync } from 'child_process';
import { APP_ID, IS_IOS } from './platform';

export interface BuildInfo {
  appVersion?: string;
  appBuildVersion?: string;
  buildProfile?: string;
}

export interface EnvironmentContext {
  /** "AWS Device Farm", "Remote Access" ou "Local (AVD)". */
  environment: string;
  isIOS: boolean;
}

const UNKNOWN = 'n/d';

export function buildInfoFromEnv(env: NodeJS.ProcessEnv = process.env): BuildInfo {
  return {
    appVersion: env.APP_VERSION || undefined,
    appBuildVersion: env.APP_BUILD_VERSION || undefined,
    buildProfile: env.APP_BUILD_PROFILE || undefined,
  };
}

/** Conteúdo de environment.properties (formato chave=valor, uma por linha). */
export function environmentProperties(info: BuildInfo, ctx: EnvironmentContext): string {
  const lines = [
    `Platform=${ctx.isIOS ? 'iOS' : 'Android'}`,
    `Environment=${ctx.environment}`,
    `App=${APP_ID}`,
    `AppVersion=${info.appVersion ?? UNKNOWN}`,
    `AppBuildVersion=${info.appBuildVersion ?? UNKNOWN}`,
    `BuildProfile=${info.buildProfile ?? UNKNOWN}`,
    `Automation=${ctx.isIOS ? 'XCUITest' : 'UiAutomator2'}`,
    'Framework=WebdriverIO 9 + Appium',
  ];
  return `${lines.join('\n')}\n`;
}

/** versionName/versionCode do APK instalado no device conectado (só Android local). */
export function installedAndroidBuildInfo(): BuildInfo {
  if (IS_IOS) return {};
  try {
    const dump = execSync(`adb shell dumpsys package ${APP_ID}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const versionName = dump.match(/versionName=(\S+)/)?.[1];
    const versionCode = dump.match(/versionCode=(\d+)/)?.[1];
    return { appVersion: versionName, appBuildVersion: versionCode };
  } catch {
    return {};
  }
}
