import { describe, it, expect } from 'vitest';
import { parseLatestBuildUrl } from '../download-build';

const APK_URL = 'https://cdn.expo.dev/builds/app.apk';

describe('parseLatestBuildUrl', () => {
  it('retorna URL da build FINISHED ANDROID com buildUrl', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds sem status FINISHED', () => {
    const builds = [
      { id: '1', status: 'IN_PROGRESS', platform: 'ANDROID' },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds FINISHED sem buildUrl', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', artifacts: {} },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds iOS', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'IOS', artifacts: { buildUrl: 'https://cdn.expo.dev/builds/app.ipa' } },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('pega a primeira (mais recente) build Android da lista', () => {
    const OLDER_URL = 'https://cdn.expo.dev/builds/app-old.apk';
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', artifacts: { buildUrl: APK_URL } },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', artifacts: { buildUrl: OLDER_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('lança erro quando não há builds FINISHED Android', () => {
    const builds = [
      { id: '1', status: 'IN_PROGRESS', platform: 'ANDROID' },
      { id: '2', status: 'FINISHED', platform: 'IOS', artifacts: { buildUrl: 'https://cdn.expo.dev/builds/app.ipa' } },
    ];
    expect(() => parseLatestBuildUrl(builds)).toThrow(
      '[download-build] Nenhuma build Android INTERNAL finalizada encontrada'
    );
  });

  it('lança erro quando array está vazio', () => {
    expect(() => parseLatestBuildUrl([])).toThrow(
      '[download-build] Nenhuma build Android INTERNAL finalizada encontrada'
    );
  });

  it('ignora builds FINISHED Android sem campo artifacts', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID' },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });
});
