import fs from 'fs';
import path from 'path';
import { loginPage, EMAIL, SENHA, PIN } from '../pages/login.page';
import { homePage } from '../pages/home.page';
import { clientesPage } from '../pages/clientes.page';
import { PLATFORM } from '../support/platform';

/**
 * Coleta de page source — ferramenta de descoberta, não teste de regressão.
 *
 * Rodado com `DUMP_SOURCE=true`, este spec substitui a suíte inteira (ver
 * `specs` no wdio.conf.ts) e grava a árvore de UI de cada tela como artifact.
 * Existe porque os seletores iOS deste repositório foram *derivados* das regras
 * de tradução em `test/support/locator.ts`, sem nunca terem sido validados
 * contra um device real — e não há Mac disponível para inspecionar localmente.
 *
 * Uso:
 *   1. workflow_dispatch de mobile_test.yml com run_ios=true e DUMP_SOURCE=true
 *   2. baixar o artifact do $DEVICEFARM_LOG_DIR
 *   3. abrir os pagesource-*.xml e corrigir as entradas `ios:` dos page objects
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
