import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { isAab, javaTool, resolveBundletoolJar } from '../convert-aab';

describe('isAab', () => {
  it('reconhece artefato .aab por caminho e por URL', () => {
    expect(isAab('C:\dev\apk_arys\arys-latest.aab')).toBe(true);
    expect(isAab('https://expo.dev/artifacts/eas/abc.aab')).toBe(true);
  });

  it('ignora a query string de URLs assinadas', () => {
    expect(isAab('https://s3.amazonaws.com/x/app.aab?X-Amz-Signature=1&ext=.apk')).toBe(true);
    expect(isAab('https://s3.amazonaws.com/x/app.apk?name=app.aab')).toBe(false);
  });

  it('não confunde .apk nem .ipa com bundle', () => {
    expect(isAab('https://expo.dev/artifacts/eas/abc.apk')).toBe(false);
    expect(isAab('https://expo.dev/artifacts/eas/abc.ipa')).toBe(false);
  });

  it('é case-insensitive na extensão', () => {
    expect(isAab('app.AAB')).toBe(true);
  });
});

describe('resolveBundletoolJar', () => {
  it('usa BUNDLETOOL_JAR quando definido', () => {
    expect(resolveBundletoolJar({ BUNDLETOOL_JAR: 'D:\tools\bt.jar' })).toBe('D:\tools\bt.jar');
  });

  it('sem override, cai no cache do usuário com a versão fixada', () => {
    const jar = resolveBundletoolJar({});
    expect(jar.startsWith(path.join(os.homedir(), '.cache', 'bundletool'))).toBe(true);
    expect(jar).toMatch(/bundletool-all-\d+\.\d+\.\d+\.jar$/);
  });

  it('BUNDLETOOL_JAR em branco conta como ausente', () => {
    expect(resolveBundletoolJar({ BUNDLETOOL_JAR: '  ' })).toBe(resolveBundletoolJar({}));
  });
});

describe('javaTool', () => {
  it('resolve pelo JAVA_HOME quando definido', () => {
    expect(javaTool('keytool', { JAVA_HOME: 'C:\jdk' })).toBe(path.join('C:\jdk', 'bin', 'keytool'));
  });

  it('sem JAVA_HOME confia no PATH', () => {
    expect(javaTool('jar', {})).toBe('jar');
  });
});
