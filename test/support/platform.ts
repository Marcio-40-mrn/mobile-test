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

// Não há constante de bundle identifier para o iOS, e isso é intencional: nos
// dois alvos o app é identificado por CAMINHO, não por id. No Device Farm o
// testspec passa `appium:app = $DEVICEFARM_APP_PATH`; na sessão remota usamos
// REMOTE_PATH_IOS. Quando um bundle id é realmente necessário (remover/reinstalar
// o app em BasePage.resetApp), ele é lido das capabilities que a própria sessão
// XCUITest reporta.

// ─── Sessão iOS remota (execução local) ──────────────────────────────────────
// Não há como rodar XCUITest a partir do Windows. Para desenvolver e depurar
// seletores iOS localmente, abre-se uma sessão no AWS Device Farm e aponta-se o
// WDIO para o Appium dela — o mesmo endpoint usado pelo Appium Inspector.
//
// A sessão é EFÊMERA: host, porta e caminho do app mudam a cada vez, então as
// três variáveis precisam ser atualizadas no .env imediatamente antes de rodar.

export const REMOTE_HOST = process.env.REMOTE_HOST ?? '';
export const REMOTE_PORT = process.env.REMOTE_PORT ?? '';
/** Caminho do .ipa dentro da sessão remota — vai para a capability `appium:app`. */
export const REMOTE_PATH_IOS = process.env.REMOTE_PATH_IOS ?? '';

export interface RemoteIosSession {
  host: string;
  port: number;
  app: string;
}

export function requireRemoteIosSession(): RemoteIosSession {
  const faltando = [
    ['REMOTE_HOST', REMOTE_HOST],
    ['REMOTE_PORT', REMOTE_PORT],
    ['REMOTE_PATH_IOS', REMOTE_PATH_IOS],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (faltando.length > 0) {
    throw new Error(
      `[platform] Sessão iOS remota incompleta — faltam: ${faltando.join(', ')}. ` +
        'Abra uma sessão no AWS Device Farm, copie host, porta e o caminho do app ' +
        '(os mesmos valores usados no Appium Inspector) para o .env e rode de novo. ' +
        'A sessão é efêmera: esses valores mudam a cada nova sessão.',
    );
  }

  const port = Number(REMOTE_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`[platform] REMOTE_PORT inválido: "${REMOTE_PORT}" — esperado um número de porta.`);
  }

  return { host: REMOTE_HOST, port, app: REMOTE_PATH_IOS };
}
