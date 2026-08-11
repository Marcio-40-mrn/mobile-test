import { describe, it, expect } from 'vitest';
import { parseLatestBuildUrl } from '../download-build';

const APK_URL = 'https://cdn.expo.dev/builds/app.apk';
const IPA_URL = 'https://cdn.expo.dev/builds/app.ipa';

/**
 * Toda build usada como "match esperado" precisa de `distribution: 'INTERNAL'`:
 * `parseLatestBuildUrl` filtra por distribuição interna, e fixtures sem esse
 * campo nunca casam.
 */
const build = (over: Record<string, unknown> = {}) => ({
  id: '1',
  status: 'FINISHED',
  platform: 'ANDROID',
  distribution: 'INTERNAL',
  artifacts: { buildUrl: APK_URL },
  ...over,
});

describe('parseLatestBuildUrl', () => {
  it('retorna URL da build FINISHED ANDROID INTERNAL com buildUrl', () => {
    expect(parseLatestBuildUrl([build()])).toBe(APK_URL);
  });

  it('ignora builds sem status FINISHED', () => {
    const builds = [
      build({ id: '1', status: 'IN_PROGRESS', artifacts: undefined }),
      build({ id: '2' }),
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds FINISHED sem buildUrl', () => {
    const builds = [build({ id: '1', artifacts: {} }), build({ id: '2' })];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds cuja distribuição não é INTERNAL', () => {
    const builds = [
      build({ id: '1', distribution: 'STORE', artifacts: { buildUrl: 'https://x/store.apk' } }),
      build({ id: '2' }),
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds iOS quando a plataforma pedida é android', () => {
    const builds = [
      build({ id: '1', platform: 'IOS', artifacts: { buildUrl: IPA_URL } }),
      build({ id: '2' }),
    ];
    expect(parseLatestBuildUrl(builds, 'android')).toBe(APK_URL);
  });

  it('ignora builds Android quando a plataforma pedida é ios', () => {
    const builds = [
      build({ id: '1' }),
      build({ id: '2', platform: 'IOS', artifacts: { buildUrl: IPA_URL } }),
    ];
    expect(parseLatestBuildUrl(builds, 'ios')).toBe(IPA_URL);
  });

  it('pega a primeira (mais recente) build da lista', () => {
    const OLDER_URL = 'https://cdn.expo.dev/builds/app-old.apk';
    const builds = [
      build({ id: '1' }),
      build({ id: '2', artifacts: { buildUrl: OLDER_URL } }),
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('lança erro quando não há builds FINISHED Android', () => {
    const builds = [
      build({ id: '1', status: 'IN_PROGRESS', artifacts: undefined }),
      build({ id: '2', platform: 'IOS', artifacts: { buildUrl: IPA_URL } }),
    ];
    expect(() => parseLatestBuildUrl(builds)).toThrow(
      '[download-build] Nenhuma build Android INTERNAL finalizada encontrada'
    );
  });

  it('lança erro com o nome da plataforma pedida', () => {
    expect(() => parseLatestBuildUrl([build()], 'ios')).toThrow(
      '[download-build] Nenhuma build iOS INTERNAL finalizada encontrada'
    );
  });

  it('lança erro quando array está vazio', () => {
    expect(() => parseLatestBuildUrl([])).toThrow(
      '[download-build] Nenhuma build Android INTERNAL finalizada encontrada'
    );
  });

  it('ignora builds FINISHED Android sem campo artifacts', () => {
    const builds = [build({ id: '1', artifacts: undefined }), build({ id: '2' })];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });
});
