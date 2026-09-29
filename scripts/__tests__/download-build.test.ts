import { describe, it, expect } from 'vitest';
import { parseLatestBuildUrl, resolveBuildSelection } from '../download-build';

const APK_URL = 'https://cdn.expo.dev/builds/app.apk';
const IPA_URL = 'https://cdn.expo.dev/builds/app.ipa';

describe('parseLatestBuildUrl', () => {
  it('retorna URL da build FINISHED ANDROID com buildUrl', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds sem status FINISHED', () => {
    const builds = [
      { id: '1', status: 'IN_PROGRESS', platform: 'ANDROID', distribution: 'INTERNAL' },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds FINISHED sem buildUrl', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: {} },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('ignora builds iOS', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'IOS', distribution: 'INTERNAL', artifacts: { buildUrl: IPA_URL } },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('pega a primeira (mais recente) build Android da lista', () => {
    const OLDER_URL = 'https://cdn.expo.dev/builds/app-old.apk';
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: { buildUrl: APK_URL } },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: { buildUrl: OLDER_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });

  it('lança erro quando não há builds FINISHED Android', () => {
    const builds = [
      { id: '1', status: 'IN_PROGRESS', platform: 'ANDROID', distribution: 'INTERNAL' },
      { id: '2', status: 'FINISHED', platform: 'IOS', distribution: 'INTERNAL', artifacts: { buildUrl: IPA_URL } },
    ];
    expect(() => parseLatestBuildUrl(builds)).toThrow(
      "[download-build] Nenhuma build android 'internal' finalizada encontrada (mais recente)"
    );
  });

  it('lança erro quando array está vazio', () => {
    expect(() => parseLatestBuildUrl([])).toThrow(
      "[download-build] Nenhuma build android 'internal' finalizada encontrada (mais recente)"
    );
  });

  it('ignora builds FINISHED Android sem campo artifacts', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL' },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', artifacts: { buildUrl: APK_URL } },
    ];
    expect(parseLatestBuildUrl(builds)).toBe(APK_URL);
  });
});

describe('resolveBuildSelection', () => {
  it('sem env, cai em latest e sem profile', () => {
    const selection = resolveBuildSelection('android', {});
    expect(selection.mode).toBe('latest');
    expect(selection.profile).toBeUndefined();
    expect(selection.label).toBe('mais recente');
  });

  it('resolve profiles distintos por plataforma no mesmo env', () => {
    const env = { BUILD_PROFILE_ANDROID: 'preview', BUILD_PROFILE_IOS: 'production' };
    expect(resolveBuildSelection('android', env).profile).toBe('preview');
    expect(resolveBuildSelection('ios', env).profile).toBe('production');
  });

  it('plataforma sem profile definido não herda a da outra', () => {
    const env = { BUILD_PROFILE_ANDROID: 'preview' };
    expect(resolveBuildSelection('ios', env).profile).toBe('production');
    expect(resolveBuildSelection('android', { BUILD_PROFILE_IOS: 'qa' }).profile).toBeUndefined();
  });

  it('iOS sem BUILD_PROFILE_IOS cai em production (toda build iOS do EAS é store)', () => {
    expect(resolveBuildSelection('ios', {}).profile).toBe('production');
    expect(resolveBuildSelection('ios', { BUILD_PROFILE_IOS: '  ' }).profile).toBe('production');
    expect(resolveBuildSelection('ios', { BUILD_PROFILE_IOS: 'qa' }).profile).toBe('qa');
  });

  it('mode=date com from e to monta o intervalo inclusivo', () => {
    const selection = resolveBuildSelection('android', {
      BUILD_SELECTION: 'date',
      BUILD_FROM: '2026-07-01',
      BUILD_TO: '2026-07-10',
    });
    expect(selection.mode).toBe('date');
    expect(selection.label).toBe('entre 2026-07-01 e 2026-07-10');
    expect(selection.rangeStart).toBe(new Date(2026, 6, 1, 0, 0, 0, 0).getTime());
    expect(selection.rangeEnd).toBe(new Date(2026, 6, 10, 23, 59, 59, 999).getTime());
  });

  it('mode=date só com from deixa a ponta final aberta', () => {
    const selection = resolveBuildSelection('android', {
      BUILD_SELECTION: 'date',
      BUILD_FROM: '2026-07-01',
    });
    expect(selection.rangeEnd).toBe(Infinity);
    expect(selection.label).toBe('a partir de 2026-07-01');
  });

  it('mode=date só com to deixa a ponta inicial aberta', () => {
    const selection = resolveBuildSelection('android', {
      BUILD_SELECTION: 'date',
      BUILD_TO: '2026-07-10',
    });
    expect(selection.rangeStart).toBe(-Infinity);
    expect(selection.label).toBe('até 2026-07-10');
  });

  it('lança erro em BUILD_SELECTION desconhecido', () => {
    expect(() => resolveBuildSelection('android', { BUILD_SELECTION: 'weekly' })).toThrow(
      "[download-build] BUILD_SELECTION inválido: 'weekly'"
    );
  });

  it('lança erro em mode=date sem from nem to', () => {
    expect(() => resolveBuildSelection('android', { BUILD_SELECTION: 'date' })).toThrow(
      "[download-build] BUILD_SELECTION='date' exige BUILD_FROM e/ou BUILD_TO."
    );
  });

  it('lança erro quando to é anterior a from', () => {
    expect(() =>
      resolveBuildSelection('android', {
        BUILD_SELECTION: 'date',
        BUILD_FROM: '2026-07-10',
        BUILD_TO: '2026-07-01',
      })
    ).toThrow('[download-build] Intervalo inválido');
  });

  it('lança erro em data que não existe no calendário', () => {
    expect(() =>
      resolveBuildSelection('android', { BUILD_SELECTION: 'date', BUILD_FROM: '2026-02-31' })
    ).toThrow("[download-build] BUILD_FROM não é uma data válida: '2026-02-31'.");
  });

  it('lança erro em data fora do formato YYYY-MM-DD', () => {
    expect(() =>
      resolveBuildSelection('android', { BUILD_SELECTION: 'date', BUILD_TO: '01/07/2026' })
    ).toThrow("[download-build] BUILD_TO inválido: '01/07/2026'.");
  });
});

describe('parseLatestBuildUrl com profile e intervalo', () => {
  const PREVIEW_URL = 'https://cdn.expo.dev/builds/app-preview.apk';
  const PRODUCTION_URL = 'https://cdn.expo.dev/builds/app-production.apk';

  const androidBuilds = [
    { id: '1', status: 'FINISHED', platform: 'ANDROID', buildProfile: 'production', createdAt: '2026-07-05T12:00:00.000Z', artifacts: { buildUrl: PRODUCTION_URL } },
    { id: '2', status: 'FINISHED', platform: 'ANDROID', buildProfile: 'preview', createdAt: '2026-07-04T12:00:00.000Z', artifacts: { buildUrl: PREVIEW_URL } },
  ];

  it('filtra pelo buildProfile configurado', () => {
    const selection = resolveBuildSelection('android', { BUILD_PROFILE_ANDROID: 'preview' });
    expect(parseLatestBuildUrl(androidBuilds, { platform: 'android', selection })).toBe(PREVIEW_URL);
  });

  it('ignora build mais recente que está fora do intervalo', () => {
    const NEWER_URL = 'https://cdn.expo.dev/builds/app-newer.apk';
    const builds = [
      { id: '0', status: 'FINISHED', platform: 'ANDROID', buildProfile: 'preview', createdAt: '2026-07-20T12:00:00.000Z', artifacts: { buildUrl: NEWER_URL } },
      ...androidBuilds,
    ];
    const selection = resolveBuildSelection('android', {
      BUILD_PROFILE_ANDROID: 'preview',
      BUILD_SELECTION: 'date',
      BUILD_FROM: '2026-07-01',
      BUILD_TO: '2026-07-10',
    });
    expect(parseLatestBuildUrl(builds, { platform: 'android', selection })).toBe(PREVIEW_URL);
  });

  it('escolhe o mais recente dentro do intervalo mesmo fora de ordem na lista', () => {
    const OLDER_URL = 'https://cdn.expo.dev/builds/app-older.apk';
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', buildProfile: 'preview', createdAt: '2026-07-02T12:00:00.000Z', artifacts: { buildUrl: OLDER_URL } },
      { id: '2', status: 'FINISHED', platform: 'ANDROID', buildProfile: 'preview', createdAt: '2026-07-08T12:00:00.000Z', artifacts: { buildUrl: PREVIEW_URL } },
    ];
    const selection = resolveBuildSelection('android', {
      BUILD_PROFILE_ANDROID: 'preview',
      BUILD_SELECTION: 'date',
      BUILD_FROM: '2026-07-01',
      BUILD_TO: '2026-07-10',
    });
    expect(parseLatestBuildUrl(builds, { platform: 'android', selection })).toBe(PREVIEW_URL);
  });

  it('platform ios resolve o .ipa e ignora o .apk', () => {
    const builds = [
      { id: '1', status: 'FINISHED', platform: 'ANDROID', buildProfile: 'production', artifacts: { buildUrl: APK_URL } },
      { id: '2', status: 'FINISHED', platform: 'IOS', buildProfile: 'production', artifacts: { buildUrl: IPA_URL } },
    ];
    const selection = resolveBuildSelection('ios', { BUILD_PROFILE_IOS: 'production' });
    expect(parseLatestBuildUrl(builds, { platform: 'ios', selection })).toBe(IPA_URL);
  });

  it('mensagem de erro cita plataforma, profile e intervalo', () => {
    const selection = resolveBuildSelection('ios', {
      BUILD_PROFILE_IOS: 'production',
      BUILD_SELECTION: 'date',
      BUILD_FROM: '2026-07-01',
      BUILD_TO: '2026-07-10',
    });
    expect(() => parseLatestBuildUrl(androidBuilds, { platform: 'ios', selection })).toThrow(
      "[download-build] Nenhuma build ios 'production' finalizada encontrada (entre 2026-07-01 e 2026-07-10)"
    );
  });
});
