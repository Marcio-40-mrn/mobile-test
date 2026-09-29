import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { downloadFile } from './download-file';
import { convertAabToApk, isAab } from './convert-aab';

const DEST_DIR = 'C:\\dev\\apk_arys';

export type BuildPlatform = 'android' | 'ios';

// Extensões de artefato aceitas por plataforma.
const ARTIFACT_EXTENSIONS: Record<BuildPlatform, string[]> = {
  android: ['.apk', '.aab'],
  ios: ['.ipa'],
};

interface ExpoBuild {
  id: string;
  status: string;
  platform?: string;
  distribution?: string;
  createdAt?: string;
  buildProfile?: string;
  appVersion?: string;
  appBuildVersion?: string;
  artifacts?: { buildUrl?: string };
}

/** O que o Allure mostra no widget Environment — vem do mesmo registro do EAS que dá a URL. */
export interface BuildInfo {
  url: string;
  appVersion?: string;
  appBuildVersion?: string;
  buildProfile?: string;
}

export interface BuildSelection {
  /** Vazio (só Android) => cai no filtro padrão (distribution=internal). */
  profile?: string;
  mode: 'latest' | 'date';
  rangeStart: number;
  rangeEnd: number;
  /** Descrição legível do intervalo, usada em log e mensagem de erro. */
  label: string;
}

export interface SelectBuildOptions {
  platform?: BuildPlatform;
  selection?: BuildSelection;
}

const LATEST_SELECTION: BuildSelection = {
  mode: 'latest',
  rangeStart: -Infinity,
  rangeEnd: Infinity,
  label: 'mais recente',
};

export function buildDestPath(platform: BuildPlatform = 'android'): string {
  return path.join(DEST_DIR, platform === 'ios' ? 'arys-latest.ipa' : 'arys-latest.apk');
}

// Converte 'YYYY-MM-DD' em timestamp local. endOfDay=true -> 23:59:59.999 do mesmo dia.
function parseLocalDate(value: string, varName: string, endOfDay: boolean): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`[download-build] ${varName} inválido: '${value}'. Use o formato 'YYYY-MM-DD'.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
  // Rejeita datas que "transbordam" (ex.: 2026-02-31 viraria 03/03)
  if (Number.isNaN(date.getTime()) || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`[download-build] ${varName} não é uma data válida: '${value}'.`);
  }
  return date.getTime();
}

/**
 * iOS sem BUILD_PROFILE_IOS cai em 'production': no EAS toda build iOS é
 * distribution=store, então o fallback por distribution=internal (que serve ao
 * Android) nunca encontra nada.
 */
const DEFAULT_IOS_PROFILE = 'production';

/**
 * Lê da env qual build baixar. O profile é resolvido pela plataforma — Android e
 * iOS costumam ser buildados em profiles diferentes, então cada um tem a sua
 * variável e um run nunca lê a variável do outro.
 */
export function resolveBuildSelection(
  platform: BuildPlatform = 'android',
  env: NodeJS.ProcessEnv = process.env
): BuildSelection {
  const profile =
    platform === 'ios'
      ? env.BUILD_PROFILE_IOS?.trim() || DEFAULT_IOS_PROFILE
      : env.BUILD_PROFILE_ANDROID?.trim() || undefined;

  const mode = env.BUILD_SELECTION?.trim() || 'latest';
  if (mode !== 'latest' && mode !== 'date') {
    throw new Error(`[download-build] BUILD_SELECTION inválido: '${mode}'. Use 'latest' ou 'date'.`);
  }
  if (mode === 'latest') {
    return { ...LATEST_SELECTION, profile };
  }

  const from = env.BUILD_FROM?.trim() || '';
  const to = env.BUILD_TO?.trim() || '';
  if (!from && !to) {
    throw new Error(`[download-build] BUILD_SELECTION='date' exige BUILD_FROM e/ou BUILD_TO.`);
  }

  const rangeStart = from ? parseLocalDate(from, 'BUILD_FROM', false) : -Infinity;
  const rangeEnd = to ? parseLocalDate(to, 'BUILD_TO', true) : Infinity;
  if (rangeStart > rangeEnd) {
    throw new Error(
      `[download-build] Intervalo inválido: BUILD_TO (${to}) é anterior a BUILD_FROM (${from}).`
    );
  }

  const label = from && to ? `entre ${from} e ${to}` : from ? `a partir de ${from}` : `até ${to}`;
  return { profile, mode, rangeStart, rangeEnd, label };
}

// Builds sem createdAt caem em 0 e mantêm a ordem original (sort é estável).
function createdAtMs(build: ExpoBuild): number {
  const ts = build.createdAt ? new Date(build.createdAt).getTime() : NaN;
  return Number.isNaN(ts) ? 0 : ts;
}

function hasArtifact(build: ExpoBuild, extensions: string[]): boolean {
  const url = build.artifacts?.buildUrl;
  return Boolean(url) && extensions.some(ext => url!.endsWith(ext));
}

// Android sem profile configurado mantém o filtro histórico por distribution=internal.
function matchesProfile(build: ExpoBuild, profile?: string): boolean {
  return profile
    ? build.buildProfile === profile
    : build.distribution?.toLowerCase() === 'internal';
}

export function parseLatestBuildUrl(builds: ExpoBuild[], options: SelectBuildOptions = {}): string {
  return selectLatestBuild(builds, options).url;
}

export function selectLatestBuild(builds: ExpoBuild[], options: SelectBuildOptions = {}): BuildInfo {
  const platform = options.platform ?? 'android';
  const selection = options.selection ?? LATEST_SELECTION;
  const extensions = ARTIFACT_EXTENSIONS[platform];

  const build = [...builds]
    .sort((a, b) => createdAtMs(b) - createdAtMs(a))
    .find(b => {
      const ts = createdAtMs(b);
      return (
        b.status === 'FINISHED' &&
        b.platform?.toLowerCase() === platform &&
        hasArtifact(b, extensions) &&
        matchesProfile(b, selection.profile) &&
        ts >= selection.rangeStart &&
        ts <= selection.rangeEnd
      );
    });

  if (!build?.artifacts?.buildUrl) {
    throw new Error(
      `[download-build] Nenhuma build ${platform} '${selection.profile ?? 'internal'}' finalizada encontrada (${selection.label})`
    );
  }
  return {
    url: build.artifacts.buildUrl,
    appVersion: build.appVersion,
    appBuildVersion: build.appBuildVersion,
    buildProfile: build.buildProfile,
  };
}

export async function downloadLatestBuild(platform: BuildPlatform = 'android'): Promise<BuildInfo> {
  const token = process.env.EXPO_TOKEN;
  if (!token) {
    throw new Error('[download-build] EXPO_TOKEN não encontrado no .env');
  }

  const selection = resolveBuildSelection(platform);
  const dest = buildDestPath(platform);

  console.log(
    `[download-build] Buscando builds ${platform} '${selection.profile ?? 'internal'}' (${selection.label})...`
  );

  // mode=date precisa varrer histórico; latest só olha o topo da lista.
  const args = [
    `--platform ${platform}`,
    selection.profile ? `--build-profile ${selection.profile}` : '--distribution internal',
    `--limit ${selection.mode === 'date' ? 100 : 20}`,
    '--status finished',
    '--json',
    '--non-interactive',
  ].join(' ');

  let output: string;
  try {
    output = execSync(`eas build:list ${args}`, {
      env: { ...process.env, EXPO_TOKEN: token },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? '';
    throw new Error(`[download-build] Falha ao listar builds: ${stderr || err.message}`);
  }

  const builds: ExpoBuild[] = JSON.parse(output);
  const info = selectLatestBuild(builds, { platform, selection });
  const { url } = info;

  console.log(
    `[download-build] Build ${info.appVersion ?? '?'} (${info.appBuildVersion ?? '?'}), profile ${info.buildProfile ?? '?'}. Baixando...`
  );

  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Profile `production` entrega .aab (store); o Appium só instala .apk, então o
  // bundle é convertido em APK universal antes de virar o arys-latest.apk.
  if (isAab(url)) {
    const aabPath = dest.replace(/\.apk$/, '.aab');
    await downloadFile(url, aabPath);
    try {
      await convertAabToApk(aabPath, dest);
    } finally {
      fs.rmSync(aabPath, { force: true });
    }
  } else {
    await downloadFile(url, dest);
  }

  console.log(`[download-build] Concluído: ${dest}`);
  return info;
}

if (require.main === module) {
  const platformIndex = process.argv.indexOf('--platform');
  const platform: BuildPlatform =
    platformIndex !== -1 && process.argv[platformIndex + 1]?.toLowerCase() === 'ios'
      ? 'ios'
      : 'android';
  downloadLatestBuild(platform).catch((e: Error) => { console.error(e.message); process.exit(1); });
}
