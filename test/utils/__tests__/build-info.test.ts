import { describe, it, expect } from 'vitest';
import { buildInfoFromEnv, environmentProperties } from '../build-info';
import { selectLatestBuild } from '../../../scripts/download-build';

describe('environmentProperties', () => {
  it('escreve as chaves do widget Environment com os valores do build', () => {
    const text = environmentProperties(
      { appVersion: '1.6.0', appBuildVersion: '138', buildProfile: 'production' },
      { environment: 'AWS Device Farm', isIOS: false },
    );
    expect(text.split('\n').filter(Boolean)).toEqual([
      'Platform=Android',
      'Environment=AWS Device Farm',
      'App=com.aramis.arys',
      'AppVersion=1.6.0',
      'AppBuildVersion=138',
      'BuildProfile=production',
      'Automation=UiAutomator2',
      'Framework=WebdriverIO 9 + Appium',
    ]);
  });

  it('marca n/d quando a versão não é conhecida e usa XCUITest no iOS', () => {
    const text = environmentProperties({}, { environment: 'Remote Access', isIOS: true });
    expect(text).toContain('Platform=iOS');
    expect(text).toContain('AppVersion=n/d');
    expect(text).toContain('BuildProfile=n/d');
    expect(text).toContain('Automation=XCUITest');
  });
});

describe('buildInfoFromEnv', () => {
  it('lê APP_VERSION / APP_BUILD_VERSION / APP_BUILD_PROFILE e ignora vazios', () => {
    expect(buildInfoFromEnv({ APP_VERSION: '1.6.0', APP_BUILD_VERSION: '', APP_BUILD_PROFILE: 'production' }))
      .toEqual({ appVersion: '1.6.0', appBuildVersion: undefined, buildProfile: 'production' });
  });
});

describe('selectLatestBuild', () => {
  it('devolve versão, build e profile junto com a URL', () => {
    const builds = [
      {
        id: '1', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL',
        buildProfile: 'preview', appVersion: '1.6.0', appBuildVersion: '138',
        artifacts: { buildUrl: 'https://cdn.expo.dev/builds/app.apk' },
      },
    ];
    expect(selectLatestBuild(builds)).toEqual({
      url: 'https://cdn.expo.dev/builds/app.apk',
      appVersion: '1.6.0',
      appBuildVersion: '138',
      buildProfile: 'preview',
    });
  });
});
