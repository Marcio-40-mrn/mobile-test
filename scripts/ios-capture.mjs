// Captura de telas iOS numa sessão Remote Access do Device Farm (Fase 6).
// Uso: cd <raiz do repo> && node --input-type=module - <comando> < scripts/ios-capture.mjs
//
//   node --input-type=module - start [nome]  < ios-capture.mjs   abre a sessão (uma por lote) e captura
//   node --input-type=module - shot  <nome>  < ios-capture.mjs   captura a tela atual (árvore + print)
//   node --input-type=module - end           < ios-capture.mjs   encerra a sessão
//
// Roda com cwd = raiz do repositório (resolve webdriverio/dotenv de lá). Por tela:
// UM getPageSource() + UM takeScreenshot() — nada de laços de getLocation/getSize,
// que deixam a sessão obsoleta. Sessão reaproveitada por `attach` entre comandos.
import { remote, attach } from 'webdriverio';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const [cmd, nameArg] = process.argv.slice(2);
const OUT = path.join('.planning', 'drafts', 'ios', 'captures');
const SESSION_FILE = path.join(OUT, '.session.json');
const APP_ID = 'com.aramis.arys';

const connection = {
  protocol: 'https',
  hostname: process.env.REMOTE_HOST,
  port: Number(process.env.REMOTE_PORT ?? 443),
  path: process.env.REMOTE_PATH_IOS,
  logLevel: 'warn',
  connectionRetryCount: 0,
  connectionRetryTimeout: 180000,
};
const capabilities = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:bundleId': APP_ID,
  'appium:noReset': true,
  'appium:newCommandTimeout': 1200,
};

function requireRemote() {
  for (const key of ['REMOTE_HOST', 'REMOTE_PORT', 'REMOTE_PATH_IOS']) {
    if (!process.env[key]) throw new Error(`${key} vazio no .env`);
  }
}

async function openSession() {
  requireRemote();
  const browser = await remote({ ...connection, capabilities });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ sessionId: browser.sessionId, startedAt: new Date().toISOString() }));
  console.log(`sessão aberta: ${browser.sessionId}`);
  return browser;
}

async function attachSession() {
  requireRemote();
  if (!fs.existsSync(SESSION_FILE)) throw new Error('sem sessão aberta — rode `start`');
  const { sessionId } = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  return attach({
    ...connection,
    sessionId,
    capabilities,
    isW3C: true,
    isMobile: true,
    isIOS: true,
    isAndroid: false,
    isChromium: false,
    isSauce: false,
    isSeleniumStandalone: false,
    isBidi: false,
  });
}

// Resumo legível da árvore sem despejar os 150 k+ caracteres do XML.
function summarize(xml) {
  const nodes = [...xml.matchAll(/<(XCUIElementType\w+)([^>]*)>/g)];
  const attr = (s, k) => (s.match(new RegExp(` ${k}="([^"]*)"`)) ?? [])[1];
  const visible = nodes.filter((m) => attr(m[2], 'visible') === 'true');
  const byType = {};
  for (const m of visible) byType[m[1]] = (byType[m[1]] ?? 0) + 1;
  const named = visible
    .map((m) => ({ type: m[1].replace('XCUIElementType', ''), name: attr(m[2], 'name'), label: attr(m[2], 'label'), value: attr(m[2], 'value'), x: attr(m[2], 'x'), y: attr(m[2], 'y'), w: attr(m[2], 'width'), h: attr(m[2], 'height') }))
    .filter((n) => n.name || n.label);
  const seen = new Set();
  const lines = [];
  for (const n of named) {
    const key = `${n.type}|${n.name}|${n.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const text = [n.name && `name="${n.name}"`, n.label && n.label !== n.name && `label="${n.label}"`, n.value && `value="${n.value}"`].filter(Boolean).join(' ');
    lines.push(`  ${n.type.padEnd(14)} ${text.slice(0, 110)}  [${n.x},${n.y} ${n.w}x${n.h}]`);
  }
  return { total: nodes.length, visible: visible.length, byType, lines };
}

async function capture(browser, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const base = path.join(OUT, name);
  const t0 = Date.now();
  const xml = await browser.getPageSource();
  fs.writeFileSync(`${base}.xml`, xml);
  const png = await browser.takeScreenshot();
  fs.writeFileSync(`${base}.png`, Buffer.from(png, 'base64'));
  const rect = await browser.getWindowRect().catch(() => null);
  const s = summarize(xml);
  console.log(`\n== ${name} == (${Date.now() - t0} ms; janela ${rect ? `${rect.width}x${rect.height}` : '?'}; ${xml.length} chars; ${s.total} nós, ${s.visible} visíveis)`);
  console.log('  tipos visíveis:', Object.entries(s.byType).map(([k, v]) => `${k.replace('XCUIElementType', '')}=${v}`).join(' '));
  console.log(`  elementos visíveis com name/label (${s.lines.length}, únicos):`);
  for (const line of s.lines.slice(0, 80)) console.log(line);
  if (s.lines.length > 80) console.log(`  … +${s.lines.length - 80}`);
  console.log(`  arquivos: ${base}.xml / ${base}.png`);
}

// Ações de navegação — uma por processo, sempre seguida de um `shot` separado.
//   do alert <buttonLabel>            mobile: alert accept (alertas nativos: OTA, ATT, notificações)
//   do click <seletor>                $(seletor).click()  — "~id" ou "-ios predicate string:…"
//   do type <seletor> <texto|$ENV>    clica, espera teclado e digita devagar (maxTypingFrequency 20)
//   do key <seletor>                  clica (ex.: tecla Search/Buscar do teclado)
//   do tap <x> <y>                    mobile: tap por coordenada (só para diagnóstico)
//   do swipe up|down|left|right       mobile: swipe
//   do sleep <ms>
async function act(browser, [action, ...args]) {
  const t0 = Date.now();
  switch (action) {
    case 'alert':
      await browser.execute('mobile: alert', { action: 'accept', buttonLabel: args.join(' ') });
      break;
    case 'click':
      await browser.$(args.join(' ')).click();
      break;
    case 'key':
      await browser.$(args.join(' ')).click();
      break;
    case 'type': {
      const [selector, raw] = [args[0], args.slice(1).join(' ')];
      const text = raw.startsWith('$') ? process.env[raw.slice(1)] : raw;
      if (!text) throw new Error(`texto vazio para type (${raw})`);
      const el = browser.$(selector);
      await el.click();
      await browser.waitUntil(() => browser.isKeyboardShown(), { timeout: 5000, timeoutMsg: 'teclado não abriu' }).catch((e) => console.log('  aviso:', e.message));
      await browser.pause(1000);
      await browser.updateSettings({ maxTypingFrequency: 20 });
      try { await el.addValue(text); } finally { await browser.updateSettings({ maxTypingFrequency: 60 }); }
      console.log(`  digitados ${text.length} caracteres em ${selector}`);
      break;
    }
    case 'clear': {
      const el = browser.$(args.join(' '));
      for (let i = 0; i < 3; i++) {
        await el.clearValue();
        const v = await el.getText().catch(() => '');
        if (!v || /^Digite/.test(v)) break;
      }
      console.log(`  campo após clear: "${await el.getText().catch(() => '?')}"`);
      break;
    }
    case 'pin': {
      // Igual ao LoginPage.handlePin() iOS: um clique por dígito nas teclas ~0..~9.
      const pin = process.env.TEST_USER_PIN;
      if (!pin) throw new Error('TEST_USER_PIN vazio');
      const t = Date.now();
      for (const d of pin) await browser.$(`~${d}`).click();
      console.log(`  ${pin.length} dígitos tocados em ${Date.now() - t} ms`);
      break;
    }
    case 'drag': {
      // drag <y> <fromRatio> <toRatio> — igual ao BasePage.dragHorizontally() iOS
      const rect = await browser.getWindowRect();
      const [y, from, to] = args.map(Number);
      await browser.execute('mobile: dragFromToForDuration', {
        duration: 0.5, fromX: rect.width * from, fromY: y, toX: rect.width * to, toY: y,
      });
      break;
    }
    case 'tap':
      await browser.execute('mobile: tap', { x: Number(args[0]), y: Number(args[1]) });
      break;
    case 'swipe':
      await browser.execute('mobile: swipe', { direction: args[0] });
      break;
    case 'sleep':
      await browser.pause(Number(args[0]));
      break;
    default:
      throw new Error(`ação desconhecida: ${action}`);
  }
  console.log(`ação ${action} ${args.join(' ').replace(/\$\w+/g, '<env>')} ok (${Date.now() - t0} ms)`);
}

try {
  if (cmd === 'do') {
    const browser = await attachSession();
    await act(browser, process.argv.slice(3));
  } else if (cmd === 'start') {
    const browser = await openSession();
    await capture(browser, nameArg ?? '00-inicial');
  } else if (cmd === 'shot') {
    if (!nameArg) throw new Error('uso: shot <nome-da-tela>');
    const browser = await attachSession();
    await capture(browser, nameArg);
  } else if (cmd === 'end') {
    const browser = await attachSession();
    await browser.deleteSession();
    fs.rmSync(SESSION_FILE, { force: true });
    console.log('sessão encerrada');
  } else {
    throw new Error('comando: start [nome] | shot <nome> | end');
  }
} catch (e) {
  console.error('ERRO:', e?.message ?? e);
  process.exit(1);
}
