import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

export type BuildPlatform = 'android' | 'ios';

/** Destino local do artefato por plataforma. Reexportado para o wdio.conf.ts. */
export const BUILD_DEST: Record<BuildPlatform, string> = {
  android: 'C:\\dev\\apk_arys\\arys-latest.apk',
  ios: 'C:\\dev\\apk_arys\\arys-latest.ipa',
};

interface ExpoBuild {
  id: string;
  status: string;
  platform?: string;
  distribution?: string;
  artifacts?: { buildUrl?: string };
}

export function parseLatestBuildUrl(
  builds: ExpoBuild[],
  platform: BuildPlatform = 'android',
): string {
  const build = builds.find(
    b =>
      b.status === 'FINISHED' &&
      b.platform?.toLowerCase() === platform &&
      b.distribution?.toLowerCase() === 'internal' &&
      b.artifacts?.buildUrl
  );
  if (!build?.artifacts?.buildUrl) {
    throw new Error(
      `[download-build] Nenhuma build ${platform === 'ios' ? 'iOS' : 'Android'} INTERNAL finalizada encontrada`,
    );
  }
  return build.artifacts.buildUrl;
}

export async function downloadLatestBuild(platform: BuildPlatform = 'android'): Promise<void> {
  const token = process.env.EXPO_TOKEN;
  if (!token) {
    throw new Error('[download-build] EXPO_TOKEN não encontrado no .env');
  }

  console.log(`[download-build] Buscando builds ${platform}...`);

  let output: string;
  try {
    output = execSync(
      `eas build:list --platform ${platform} --limit 5 --json --non-interactive`,
      { env: { ...process.env, EXPO_TOKEN: token }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? '';
    throw new Error(`[download-build] Falha ao listar builds: ${stderr || err.message}`);
  }

  const builds: ExpoBuild[] = JSON.parse(output);
  const url = parseLatestBuildUrl(builds, platform);

  console.log('[download-build] Baixando build...');

  const dest = BUILD_DEST[platform];
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await downloadFile(url, dest);

  console.log('[download-build] Concluído.');
}

if (require.main === module) {
  const platform = (process.argv[2] ?? 'android') as BuildPlatform;
  downloadLatestBuild(platform).catch((e: Error) => { console.error(e.message); process.exit(1); });
}

function downloadFile(url: string, dest: string, redirectCount = 0): Promise<void> {
  if (redirectCount > 5) {
    return Promise.reject(new Error('[download-build] Muitos redirects'));
  }
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    const file = fs.createWriteStream(dest);

    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (!location) {
          file.close(() => fs.unlink(dest, () => reject(new Error('[download-build] Redirect sem header Location'))));
          return;
        }
        file.close(() => fs.unlink(dest, () => {
          downloadFile(location, dest, redirectCount + 1).then(resolve).catch(reject);
        }));
        return;
      }
      if (res.statusCode !== 200) {
        file.close(() => fs.unlink(dest, () => {}));
        reject(new Error(`[download-build] HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      file.close(() => fs.unlink(dest, () => {}));
      reject(err);
    });
  });
}
