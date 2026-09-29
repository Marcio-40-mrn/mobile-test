import https from 'https';
import http from 'http';
import fs from 'fs';

// Download por stream seguindo redirects (o EAS e o GitHub redirecionam para o
// storage). Compartilhado por download-build.ts (artefato do EAS) e
// convert-aab.ts (bundletool.jar).
export function downloadFile(url: string, dest: string, redirectCount = 0): Promise<void> {
  if (redirectCount > 5) {
    return Promise.reject(new Error('[download-file] Muitos redirects'));
  }
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    const file = fs.createWriteStream(dest);

    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (!location) {
          file.close(() => fs.unlink(dest, () => reject(new Error('[download-file] Redirect sem header Location'))));
          return;
        }
        file.close(() => fs.unlink(dest, () => {
          downloadFile(location, dest, redirectCount + 1).then(resolve).catch(reject);
        }));
        return;
      }
      if (res.statusCode !== 200) {
        file.close(() => fs.unlink(dest, () => {}));
        reject(new Error(`[download-file] HTTP ${res.statusCode}`));
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
