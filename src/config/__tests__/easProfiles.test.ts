/**
 * eas.json profil sözleşmesi.
 *
 * - `EXPO_PUBLIC_MAESTRO*` (auto-login, maskesiz şifre) YALNIZ `maestro`
 *   profilinde olabilir. İnsan testçilerin kullandığı preview/staging ve
 *   mağaza build'i production hiçbir `EXPO_PUBLIC_MAESTRO*` taşımaz.
 *   (`extends` zinciri EAS'ın çözdüğü gibi birleştirilir.)
 * - `maestro` profili `preview`'dan türer ama kendi güncelleme kanalı vardır;
 *   staging OTA'sı Maestro build'ine, Maestro OTA'sı staging'e karışmaz.
 * - `EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED` Google Cloud Android OAuth istemcisi
 *   hazır olana kadar tüm mağaza/dağıtım profillerinde "false".
 */
import * as fs from 'fs';
import * as path from 'path';

type Profile = {
  extends?: string;
  channel?: string;
  ios?: Record<string, unknown>;
  env?: Record<string, string>;
};
const eas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../eas.json'), 'utf8')) as {
  build: Record<string, Profile>;
};

/** `extends` zinciriyle birleşmiş env (alt profil üstü ezer). */
const resolvedEnv = (name: string, seen: string[] = []): Record<string, string> => {
  const profile = eas.build[name];
  if (!profile || seen.includes(name)) return {};
  const parent = profile.extends ? resolvedEnv(profile.extends, [...seen, name]) : {};
  return { ...parent, ...(profile.env ?? {}) };
};
const resolvedChannel = (name: string): string | undefined => {
  const profile = eas.build[name];
  return profile?.channel ?? (profile?.extends ? resolvedChannel(profile.extends) : undefined);
};
const maestroKeys = (name: string) =>
  Object.keys(resolvedEnv(name)).filter((k) => k.startsWith('EXPO_PUBLIC_MAESTRO'));

describe('eas.json — Maestro kapısı yalnız maestro profilinde', () => {
  it.each(['development', 'preview', 'staging', 'production'])(
    '%s profilinde EXPO_PUBLIC_MAESTRO* yok',
    (name) => {
      expect(eas.build[name]).toBeDefined();
      expect(maestroKeys(name)).toEqual([]);
    },
  );

  it('profil başına doğrudan env de temiz (extends dışında da)', () => {
    for (const [name, profile] of Object.entries(eas.build)) {
      if (name === 'maestro') continue;
      const own = Object.keys(profile.env ?? {}).filter((k) => k.startsWith('EXPO_PUBLIC_MAESTRO'));
      expect({ name, own }).toEqual({ name, own: [] });
    }
  });

  it('maestro profili var ve EXPO_PUBLIC_MAESTRO=1 taşır', () => {
    expect(eas.build.maestro).toBeDefined();
    expect(resolvedEnv('maestro').EXPO_PUBLIC_MAESTRO).toBe('1');
  });

  it('maestro kimlik bilgisi eas.json içinde GÖMÜLÜ DEĞİL (EAS ortamından gelir)', () => {
    expect(Object.keys(resolvedEnv('maestro')).sort()).toEqual(
      Object.keys(resolvedEnv('preview')).concat('EXPO_PUBLIC_MAESTRO').sort(),
    );
  });
});

describe('eas.json — maestro profili preview\'dan türer, ayrı kanalı vardır', () => {
  it('extends preview', () => {
    expect(eas.build.maestro!.extends).toBe('preview');
  });

  it('kendi kanalı var ve hiçbir normal profille paylaşılmaz', () => {
    const channel = resolvedChannel('maestro');
    expect(channel).toBe('maestro');
    for (const name of ['development', 'preview', 'staging', 'production']) {
      expect(resolvedChannel(name)).not.toBe(channel);
    }
  });

  it('staging ortamını (API/Web URL) preview\'dan devralır', () => {
    const maestro = resolvedEnv('maestro');
    const preview = resolvedEnv('preview');
    expect(maestro.EXPO_PUBLIC_ENVIRONMENT).toBe('preview');
    expect(maestro.EXPO_PUBLIC_API_URL).toBe(preview.EXPO_PUBLIC_API_URL);
    expect(maestro.EXPO_PUBLIC_API_URL).toContain('staging.');
  });

  it('iOS Maestro build\'i simülatör (Maestro gerçek iOS cihaza bağlanmaz)', () => {
    expect(eas.build.maestro!.ios).toEqual({ simulator: true });
  });
});

describe('CI workflow\'ları — Maestro kapısını taşımaz', () => {
  // OTA job'ı eas.json'u okumaz, EXPO_PUBLIC_* değerlerini runner env'inden
  // inline eder; oraya MAESTRO sızarsa staging testçilerine OTA ile gider.
  const workflowsDir = path.resolve(__dirname, '../../../.github/workflows');
  it.each(fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f)))(
    '%s EXPO_PUBLIC_MAESTRO* set etmez',
    (file) => {
      const yml = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      // Yorum satırları hariç: yalnız gerçek env anahtarları sayılır.
      const code = yml
        .split('\n')
        .filter((l) => !l.trim().startsWith('#'))
        .join('\n');
      expect(code).not.toMatch(/EXPO_PUBLIC_MAESTRO/);
    },
  );
});

describe('eas.json — Google Android bayrağı', () => {
  it.each(['preview', 'staging', 'production', 'maestro'])('%s: "false"', (name) => {
    expect(resolvedEnv(name).EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED).toBe('false');
  });
});

describe('eas.json — Sentry yükleme bayrağı değişmedi', () => {
  it.each(['preview', 'staging', 'production'])(
    '%s: SENTRY_DISABLE_AUTO_UPLOAD=true (auth token yokken build kırılmasın)',
    (name) => {
      expect(resolvedEnv(name).SENTRY_DISABLE_AUTO_UPLOAD).toBe('true');
    },
  );
});
