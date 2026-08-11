/**
 * Fonte única de verdade sobre a plataforma alvo e a identidade do app.
 *
 * `PLATFORM` vem do ambiente: `testspec-ios.yml` exporta `PLATFORM=ios` antes de
 * `npm run wdio`, e o testspec Android não exporta nada (daí o default).
 *
 * Use `IS_IOS` apenas onde ainda não existe sessão Appium — essencialmente o
 * `wdio.conf.ts`, que monta as capabilities. Dentro de testes/páginas prefira
 * `driver.isIOS`, que reflete a sessão realmente negociada.
 */
export const PLATFORM = (process.env.PLATFORM ?? 'android').toLowerCase() as 'android' | 'ios';

export const IS_IOS = PLATFORM === 'ios';

/** Package Android — declarado também como `appium:appPackage` no wdio.conf.ts. */
export const ANDROID_APP_ID = 'com.aramis.arys';

/**
 * Bundle identifier do app iOS.
 *
 * Não existe fonte de verdade para esse valor neste repositório: `app.config.js`
 * não declara `ios.bundleIdentifier`, e o `eas.json` local é um stub sem perfis
 * de build. Até que o time do app o confirme, ele vem do ambiente — o job iOS
 * falha cedo e com mensagem clara se não vier (ver `requireIosBundleId`).
 */
export const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? '';

export function requireIosBundleId(): string {
  if (!IOS_BUNDLE_ID) {
    throw new Error(
      '[platform] IOS_BUNDLE_ID não definido. O bundle identifier do app iOS não é ' +
        'derivável deste repositório (app.config.js não declara ios.bundleIdentifier). ' +
        'Defina-o no .env local ou como environment variable do run no Device Farm.',
    );
  }
  return IOS_BUNDLE_ID;
}

/** Identificador do app na plataforma corrente — usado por clearApp/activateApp/terminateApp. */
export const APP_ID = IS_IOS ? IOS_BUNDLE_ID : ANDROID_APP_ID;
