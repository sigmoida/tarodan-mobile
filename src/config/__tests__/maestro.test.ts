/**
 * Maestro kapısı (`src/config/maestro.ts`) — tek kaynak, `__DEV__`'e bağlı değil.
 *
 * Maestro staging (preview) RELEASE build'ine karşı koşacağı için kapı artık
 * `__DEV__` ile kapanmıyor; koruma derleme anındaki env'dir. Bu yüzden
 * production EAS profilinin hiçbir `EXPO_PUBLIC_MAESTRO*` değişkeni taşımadığı
 * burada `eas.json` okunarak çivileniyor.
 */
import * as fs from 'fs';
import * as path from 'path';

type MaestroModule = typeof import('../maestro');

const ENV_KEYS = [
  'EXPO_PUBLIC_MAESTRO',
  'EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN',
  'EXPO_PUBLIC_MAESTRO_EMAIL',
  'EXPO_PUBLIC_MAESTRO_PASSWORD',
] as const;
const savedEnv: Record<string, string | undefined> = {};
const g = globalThis as unknown as { __DEV__: boolean };
let savedDev: boolean;
let warnSpy: jest.SpyInstance;

/** Modülü verilen env ile SIFIRDAN yükler (sabitler yükleme anında okunur). */
function loadWith(env: Partial<Record<(typeof ENV_KEYS)[number], string>>): MaestroModule {
  ENV_KEYS.forEach((k) => {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  });
  let mod!: MaestroModule;
  jest.isolateModules(() => {
    mod = require('../maestro');
  });
  return mod;
}

beforeEach(() => {
  ENV_KEYS.forEach((k) => {
    savedEnv[k] = process.env[k];
  });
  savedDev = g.__DEV__;
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
  g.__DEV__ = savedDev;
  warnSpy.mockRestore();
});

describe('IS_MAESTRO / IS_MAESTRO_NO_AUTOLOGIN', () => {
  it('env yoksa kapı kapalı', () => {
    const m = loadWith({});
    expect(m.IS_MAESTRO).toBe(false);
    expect(m.IS_MAESTRO_NO_AUTOLOGIN).toBe(false);
  });

  it('EXPO_PUBLIC_MAESTRO=1 → açık; yalnız "1" sayılır', () => {
    expect(loadWith({ EXPO_PUBLIC_MAESTRO: '1' }).IS_MAESTRO).toBe(true);
    expect(loadWith({ EXPO_PUBLIC_MAESTRO: 'true' }).IS_MAESTRO).toBe(false);
  });

  it('release (__DEV__=false) build\'inde de açık — staging Maestro koşusu', () => {
    g.__DEV__ = false;
    expect(loadWith({ EXPO_PUBLIC_MAESTRO: '1' }).IS_MAESTRO).toBe(true);
  });

  it('NO_AUTOLOGIN tek başına etkisiz; MAESTRO=1 ile birlikte açık', () => {
    expect(loadWith({ EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN: '1' }).IS_MAESTRO_NO_AUTOLOGIN).toBe(false);
    expect(
      loadWith({ EXPO_PUBLIC_MAESTRO: '1', EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN: '1' })
        .IS_MAESTRO_NO_AUTOLOGIN,
    ).toBe(true);
  });
});

describe('getMaestroAutoLoginCredentials', () => {
  const creds = { EXPO_PUBLIC_MAESTRO_EMAIL: 'qa@example.com', EXPO_PUBLIC_MAESTRO_PASSWORD: 'pw' };

  it('kapı kapalıyken env tam olsa bile null, uyarı yok', () => {
    expect(loadWith(creds).getMaestroAutoLoginCredentials()).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('MAESTRO=1 + iki env → env değerleri (release\'te de)', () => {
    g.__DEV__ = false;
    const m = loadWith({ EXPO_PUBLIC_MAESTRO: '1', ...creds });
    expect(m.getMaestroAutoLoginCredentials()).toEqual({ email: 'qa@example.com', password: 'pw' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('MAESTRO=1 ama kimlik eksik → null + açık console.warn (gömülü varsayılan YOK)', () => {
    expect(loadWith({ EXPO_PUBLIC_MAESTRO: '1' }).getMaestroAutoLoginCredentials()).toBeNull();
    expect(
      loadWith({ EXPO_PUBLIC_MAESTRO: '1', EXPO_PUBLIC_MAESTRO_EMAIL: 'qa@example.com' })
        .getMaestroAutoLoginCredentials(),
    ).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0]![0]).toContain('EXPO_PUBLIC_MAESTRO_PASSWORD');
  });

  it('NO_AUTOLOGIN=1 → null; kimlik gerekmediği için uyarı da yok', () => {
    const m = loadWith({ EXPO_PUBLIC_MAESTRO: '1', EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN: '1' });
    expect(m.getMaestroAutoLoginCredentials()).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('eas.json — production profili Maestro kapısını taşımaz', () => {
  const eas = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../eas.json'), 'utf8'),
  ) as { build: Record<string, { extends?: string; env?: Record<string, string> }> };

  /** `extends` zinciriyle birleşmiş env (EAS'ın çözdüğü gibi: alt profil üstü ezer). */
  const resolvedEnv = (name: string, seen: string[] = []): Record<string, string> => {
    const profile = eas.build[name];
    if (!profile || seen.includes(name)) return {};
    const parent = profile.extends ? resolvedEnv(profile.extends, [...seen, name]) : {};
    return { ...parent, ...(profile.env ?? {}) };
  };

  it('production profili var', () => {
    expect(eas.build.production).toBeDefined();
  });

  it('production env\'inde EXPO_PUBLIC_MAESTRO* yok', () => {
    const keys = Object.keys(resolvedEnv('production'));
    expect(keys.filter((k) => k.startsWith('EXPO_PUBLIC_MAESTRO'))).toEqual([]);
  });
});
