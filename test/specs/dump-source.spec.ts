import fs from 'fs';
import path from 'path';
import { loginPage, EMAIL, SENHA, PIN } from '../pages/login.page';
import { homePage } from '../pages/home.page';
import { clientesPage } from '../pages/clientes.page';
import { PLATFORM } from '../support/platform';

/**
 * Coleta de page source — ferramenta de descoberta, não teste de regressão.
 *
 * NÃO faz parte da suíte e NÃO roda no CI. É acionado sob demanda:
 *
 *   npm run dump:ios       — contra a sessão aberta no Device Farm (REMOTE_*)
 *   npm run dump:android   — contra o AVD local
 *
 * Grava a árvore de UI de cada tela em `reports/pagesource/` (ou no
 * $DEVICEFARM_LOG_DIR, se por algum motivo rodar lá). Serve para conferir os
 * seletores de uma plataforma contra a realidade — os do iOS, em particular,
 * foram *derivados* das regras de tradução em `test/support/locator.ts` e
 * precisam ser confirmados contra um device.
 *
 * Depois de rodar: abra os `pagesource-*.xml` e corrija as entradas `ios:` dos
 * page objects. Para inspeção interativa, a mesma sessão remota serve ao Appium
 * Inspector — este spec é o caminho automatizado equivalente.
 *
 * Cada etapa é isolada em try/catch: se o login falhar por seletor errado, o
 * dump da tela de login — que é justamente o que se precisa para corrigi-lo —
 * já foi gravado.
 */

const OUT_DIR = process.env.DEVICEFARM_LOG_DIR ?? path.join(process.cwd(), 'reports', 'pagesource');

async function dump(nome: string): Promise<void> {
  try {
    const source = await driver.getPageSource();
    if (!fs.existsSync(OUT_DIR)) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
    }
    const file = path.join(OUT_DIR, `pagesource-${PLATFORM}-${nome}.xml`);
    fs.writeFileSync(file, source, 'utf8');
    console.log(`[dump] ${nome}: ${source.length} bytes → ${file}`);
  } catch (e) {
    console.warn(`[dump] falha ao capturar "${nome}":`, e);
  }
}

/** Executa uma etapa de navegação sem deixar que a falha aborte a coleta. */
async function etapa(nome: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.warn(`[dump] etapa "${nome}" falhou (seguindo mesmo assim):`, e);
  }
}

describe('Dump de page source', () => {
  it('percorre o fluxo principal capturando a árvore de UI', async () => {
    await browser.pause(6000); // splash screen — no observable element signals readiness
    await dump('01-splash');

    await etapa('dismiss update popup', () => loginPage.dismissUpdatePopupIfPresent());
    await dump('02-login');

    await etapa('preencher login', () => loginPage.fillAndSubmit(EMAIL, SENHA));
    await dump('03-pos-login');

    await etapa('pin', () => loginPage.handlePin(PIN));
    await dump('04-pos-pin');

    await etapa('notification popup', () => loginPage.handleNotificationPopup());
    await dump('05-home');

    await etapa('scroll home', () => homePage.scrollDown(0.8));
    await dump('06-home-scrolled');

    await etapa('aba clientes', () => clientesPage.navigateToClientes());
    await dump('07-clientes');

    await etapa('filtro de ordenação', () => clientesPage.openSortFilter());
    await dump('08-clientes-sort');
  });
});
