import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { downloadFile } from './download-file';

// Converte um Android App Bundle (.aab) em APK universal via bundletool.
// O profile `production` do EAS gera .aab (store); o Appium local e o Device Farm
// (upload ANDROID_APP) só instalam .apk — um .aab renomeado quebra nos dois com
// "Missing AndroidManifest.xml" no apksigner.
//
// Uso direto: npx ts-node scripts/convert-aab.ts --input app.aab --output app.apk

const BUNDLETOOL_VERSION = '1.18.1';
const BUNDLETOOL_JAR_NAME = `bundletool-all-${BUNDLETOOL_VERSION}.jar`;
const BUNDLETOOL_URL = `https://github.com/google/bundletool/releases/download/${BUNDLETOOL_VERSION}/${BUNDLETOOL_JAR_NAME}`;

// Mesma chave de debug que o Android Studio usa; o APK é só para testes.
const DEBUG_KEYSTORE = {
  path: path.join(os.homedir(), '.android', 'debug.keystore'),
  storePass: 'android',
  alias: 'androiddebugkey',
  keyPass: 'android',
} as const;

// Extensão do artefato, ignorando query string (URLs assinadas do EAS/S3).
export function isAab(fileOrUrl: string): boolean {
  const withoutQuery = fileOrUrl.split(/[?#]/)[0];
  return path.extname(withoutQuery).toLowerCase() === '.aab';
}

// BUNDLETOOL_JAR aponta para um jar já existente; sem ele, o jar é baixado uma vez
// para o cache do usuário e reaproveitado nas execuções seguintes.
export function resolveBundletoolJar(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.BUNDLETOOL_JAR?.trim();
  return override || path.join(os.homedir(), '.cache', 'bundletool', BUNDLETOOL_JAR_NAME);
}

// java/jar/keytool do JAVA_HOME quando definido (no Windows o javapath da Oracle
// expõe só o java); sem JAVA_HOME confia no PATH.
export function javaTool(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const home = env.JAVA_HOME?.trim();
  return home ? path.join(home, 'bin', name) : name;
}

function run(tool: string, args: string[], cwd?: string): void {
  execFileSync(javaTool(tool), args, { stdio: 'inherit', cwd });
}

function ensureJava(): void {
  try {
    execFileSync(javaTool('java'), ['-version'], { stdio: 'ignore' });
  } catch {
    throw new Error(
      '[convert-aab] Java (JDK) não encontrado. O bundletool precisa de java, jar e keytool — ' +
        'instale um JDK 17+ ou defina JAVA_HOME.'
    );
  }
}

async function ensureBundletool(): Promise<string> {
  const jar = resolveBundletoolJar();
  if (fs.existsSync(jar)) return jar;
  console.log(`[convert-aab] Baixando bundletool ${BUNDLETOOL_VERSION} para ${jar}...`);
  fs.mkdirSync(path.dirname(jar), { recursive: true });
  await downloadFile(BUNDLETOOL_URL, jar);
  return jar;
}

function ensureDebugKeystore(): void {
  if (fs.existsSync(DEBUG_KEYSTORE.path)) return;
  console.log(`[convert-aab] Gerando debug keystore em ${DEBUG_KEYSTORE.path}...`);
  fs.mkdirSync(path.dirname(DEBUG_KEYSTORE.path), { recursive: true });
  run('keytool', [
    '-genkeypair',
    '-keystore', DEBUG_KEYSTORE.path,
    '-storepass', DEBUG_KEYSTORE.storePass,
    '-alias', DEBUG_KEYSTORE.alias,
    '-keypass', DEBUG_KEYSTORE.keyPass,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    '-dname', 'CN=Android Debug,O=Android,C=US',
  ]);
}

function buildUniversalApks(jar: string, aabPath: string, apksPath: string): void {
  run('java', [
    '-jar', jar,
    'build-apks',
    `--bundle=${aabPath}`,
    `--output=${apksPath}`,
    '--mode=universal',
    `--ks=${DEBUG_KEYSTORE.path}`,
    `--ks-pass=pass:${DEBUG_KEYSTORE.storePass}`,
    `--ks-key-alias=${DEBUG_KEYSTORE.alias}`,
    `--key-pass=pass:${DEBUG_KEYSTORE.keyPass}`,
    '--overwrite',
  ]);
}

// O .apks é um ZIP com um único universal.apk; `jar xf` (JDK) extrai sem depender
// de biblioteca de zip nem de ferramenta do SO que recuse a extensão .apks.
function extractUniversalApk(apksPath: string, apkPath: string): void {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arys-apks-'));
  try {
    run('jar', ['xf', apksPath, 'universal.apk'], workDir);
    const extracted = path.join(workDir, 'universal.apk');
    if (!fs.existsSync(extracted)) {
      throw new Error('[convert-aab] universal.apk não encontrado dentro do .apks');
    }
    fs.mkdirSync(path.dirname(apkPath), { recursive: true });
    fs.copyFileSync(extracted, apkPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export async function convertAabToApk(aabPath: string, apkPath: string): Promise<void> {
  if (!fs.existsSync(aabPath)) {
    throw new Error(`[convert-aab] Arquivo não encontrado: ${aabPath}`);
  }
  ensureJava();
  const jar = await ensureBundletool();
  ensureDebugKeystore();

  const apksPath = aabPath.replace(/\.aab$/i, '') + '.apks';
  console.log(`[convert-aab] Gerando APK universal de ${aabPath}...`);
  try {
    buildUniversalApks(jar, aabPath, apksPath);
    extractUniversalApk(apksPath, apkPath);
  } finally {
    fs.rmSync(apksPath, { force: true });
  }
  console.log(`[convert-aab] Concluído: ${apkPath}`);
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

if (require.main === module) {
  const input = argValue('--input');
  const output = argValue('--output');
  if (!input || !output) {
    console.error('Uso: ts-node scripts/convert-aab.ts --input <app.aab> --output <app.apk>');
    process.exit(1);
  }
  convertAabToApk(path.resolve(input), path.resolve(output)).catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
  });
}
