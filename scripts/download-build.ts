import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const APK_DEST = 'C:\\dev\\apk_arys\\arys-latest.apk';

interface ExpoBuild {
  id: string;
  status: string;
  platform?: string;
  distribution?: string;
  artifacts?: { buildUrl?: string };
}

export function parseLatestBuildUrl(builds: ExpoBuild[]): string {
  const build = builds.find(
    b =>
      b.status === 'FINISHED' &&
      b.platform?.toLowerCase() === 'android' &&
      b.distribution?.toLowerCase() === 'internal' &&
      b.artifacts?.buildUrl
  );
  if (!build?.artifacts?.buildUrl) {
    throw new Error('[download-build] Nenhuma build Android INTERNAL finalizada encontrada');
  }
  return build.artifacts.buildUrl;
}

export async function downloadLatestBuild(): Promise<void> {
  const token = process.env.EXPO_TOKEN;
  if (!token) {
    throw new Error('[download-build] EXPO_TOKEN não encontrado no .env');
  }

  console.log('[download-build] Buscando builds Android...');

  let output: string;
  try {
    output = execSync(
      'eas build:list --platform android --limit 5 --json --non-interactive',
      { env: { ...process.env, EXPO_TOKEN: token }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? '';
    throw new Error(`[download-build] Falha ao listar builds: ${stderr || err.message}`);
  }

  const builds: ExpoBuild[] = JSON.parse(output);
  const url = parseLatestBuildUrl(builds);

  console.log('[download-build] Baixando build...');

  const dir = path.dirname(APK_DEST);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await downloadFile(url, APK_DEST);

  console.log('[download-build] Concluído.');
}

if (require.main === module) {
  downloadLatestBuild().catch((e: Error) => { console.error(e.message); process.exit(1); });
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
