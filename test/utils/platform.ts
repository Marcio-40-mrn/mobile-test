// Seleção de plataforma da suíte.
//
// A plataforma vem da variável de ambiente PLATFORM, nunca de arquivos de config
// duplicados: `PLATFORM=ios` é setada pelo script `npm run wdio:ios` (local) e pelo
// testspec-ios.yml (Device Farm). Sem ela a suíte roda em Android.

export const IS_IOS = process.env.PLATFORM === 'ios';

/** applicationId no Android, bundleId no iOS — o app usa o mesmo valor nos dois. */
export const APP_ID = 'com.aramis.arys';

interface PlatformPair<T> {
  android: T;
  ios: T;
}

/**
 * Escolhe o valor correspondente à plataforma corrente.
 *
 * Usado sobretudo em locators: o `testID` do React Native vira `resource-id` no
 * Android e `name` (accessibility id) no iOS, então boa parte dos seletores é o
 * mesmo valor com outro prefixo — mas os seletores por texto divergem de verdade.
 */
export function byPlatform<T>(pair: PlatformPair<T>): T {
  return IS_IOS ? pair.ios : pair.android;
}
