/**
 * eas.json profile contract.
 *
 * - `EXPO_PUBLIC_MAESTRO*` (auto-login, unmasked password) may exist ONLY in the
 *   `maestro` profile. preview/staging, which human testers use, and the store build
 *   production carry no `EXPO_PUBLIC_MAESTRO*`. (The `extends` chain is merged the way
 *   EAS resolves it.)
 * - The `maestro` profile extends `preview` but has its own update channel: a staging
 *   OTA never reaches the Maestro build, and a Maestro OTA never reaches staging.
 * - `EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED` is "true" only where the package's Android
 *   OAuth clients exist and the step is approved: the staging package
 *   (`preview`/`staging`). Production flips after a real-device test of a
 *   Play-installed staging build; Maestro and development stay "false".
 * - Google client ids come from the Google Cloud project `tarodan-app`
 *   (1048836099670): one web client for every profile, and one iOS client per
 *   bundle (production `com.tarodan.app`, staging `com.tarodan.app.staging`).
 */
import * as fs from 'fs';
import * as path from 'path';

type Profile = {
  extends?: string;
  channel?: string;
  environment?: string;
  ios?: Record<string, unknown>;
  android?: Record<string, unknown>;
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
    expect(eas.build.maestro!.ios?.simulator).toBe(true);
  });

  it('sürüm numarası yakmaz: iOS buildNumber ve Android versionCode artmaz', () => {
    // preview autoIncrement açık; extends bunu devralırdı.
    expect(eas.build.preview!.ios?.autoIncrement).toBeTruthy();
    expect(eas.build.preview!.android?.autoIncrement).toBeTruthy();
    expect(eas.build.maestro!.ios?.autoIncrement).toBe(false);
    expect(eas.build.maestro!.android?.autoIncrement).toBe(false);
  });
});

describe('eas.json — maestro profilinin kendi EAS ortamı var', () => {
  // Maestro kimlik bilgileri (EXPO_PUBLIC_MAESTRO_EMAIL/PASSWORD) EAS ortamından
  // gelir. Profil preview ortamını kullanırsa kimlik bilgileri preview'a konmak
  // zorunda kalır ve insan testçilerin build'ine de gömülür.
  it('environment: "maestro"', () => {
    expect(eas.build.maestro!.environment).toBe('maestro');
  });

  it('başka hiçbir profil maestro ortamını kullanmaz', () => {
    for (const [name, profile] of Object.entries(eas.build)) {
      if (name === 'maestro') continue;
      expect({ name, env: profile.environment }).not.toEqual({ name, env: 'maestro' });
    }
  });

  it('maestro ortamı preview ile aynı olamaz (kimlik bilgisi sızar)', () => {
    expect(eas.build.maestro!.environment).not.toBe(eas.build.preview!.environment);
    expect(eas.build.maestro!.environment).not.toBe('preview');
    expect(eas.build.maestro!.environment).not.toBe('production');
  });

  it('README kimlik bilgilerinin yalnız bu ortama konacağını yazar', () => {
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../maestro/README.md'), 'utf8');
    expect(readme).toContain('"environment": "maestro"');
    expect(readme).toMatch(/YALNIZ `maestro` EAS ortamına konur/);
    expect(readme).toContain('eas env:create --environment maestro');
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

// Public OAuth client ids (not secrets) of the Google Cloud project `tarodan-app`
// (1048836099670). The API accepts them as token audiences; the old project
// 243308404313 stays accepted there for app versions already in the stores.
// The iOS URL scheme is derived from the iOS id in app.config.js
// (__tests__/app.config.test.ts pins that per profile).
const GOOGLE_PROJECT = '1048836099670';
const GOOGLE_WEB_CLIENT_ID = '1048836099670-5kdeenimv0bvj4plrrmeq2ue8p2284t8.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = {
  production: '1048836099670-vg49irvqvbiqrti1natihhpjlra2to5o.apps.googleusercontent.com',
  staging: '1048836099670-cv0sohq8pdl7qksaq7fongauhga7705q.apps.googleusercontent.com',
};

describe('eas.json — Google client ids (project tarodan-app)', () => {
  it.each(['development', 'preview', 'staging', 'production', 'maestro'])(
    '%s uses the tarodan-web client as webClientId (the token audience)',
    (name) => {
      expect(resolvedEnv(name).EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).toBe(GOOGLE_WEB_CLIENT_ID);
    },
  );

  // development builds com.tarodan.app too (a dev client), so it carries the
  // production scheme; without an id there, a local .env id would show the button in
  // a binary that has no scheme, and tapping it would crash.
  it.each(['production', 'development'])('%s uses the iOS client of com.tarodan.app', (name) => {
    expect(resolvedEnv(name).EXPO_PUBLIC_ENVIRONMENT).toBe(name);
    expect(resolvedEnv(name).EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).toBe(GOOGLE_IOS_CLIENT_ID.production);
  });

  // These profiles set EXPO_PUBLIC_ENVIRONMENT=preview, so app.config.js builds the
  // com.tarodan.app.staging bundle, which has its own iOS client.
  it.each(['preview', 'staging', 'maestro'])('%s uses the iOS client of com.tarodan.app.staging', (name) => {
    expect(resolvedEnv(name).EXPO_PUBLIC_ENVIRONMENT).toBe('preview');
    expect(resolvedEnv(name).EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).toBe(GOOGLE_IOS_CLIENT_ID.staging);
  });

  it('no profile points at another Google Cloud project', () => {
    for (const name of Object.keys(eas.build)) {
      const env = resolvedEnv(name);
      for (const key of Object.keys(env).filter((k) => k.startsWith('EXPO_PUBLIC_GOOGLE_') && k.endsWith('_CLIENT_ID'))) {
        expect({ name, key, project: env[key]!.split('-')[0] }).toEqual({ name, key, project: GOOGLE_PROJECT });
      }
    }
  });
});

// The Android OAuth clients of com.tarodan.app.staging exist in project tarodan-app
// (2026-10-23), so the staging package shows Google on Android. Production stays off
// until a Play-installed staging build passed sign-in on a real device
// (docs/ANDROID_RELEASE.md section 9). Maestro overrides preview: E2E flows must not
// depend on a Google account on the device. development builds com.tarodan.app.
describe('eas.json — Google Android flag', () => {
  it.each(['preview', 'staging'])('%s: "true" (staging package, clients exist)', (name) => {
    expect(resolvedEnv(name).EXPO_PUBLIC_ENVIRONMENT).toBe('preview');
    expect(resolvedEnv(name).EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED).toBe('true');
  });

  it.each(['production', 'development', 'maestro'])('%s: "false"', (name) => {
    expect(resolvedEnv(name).EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED).toBe('false');
  });
});

// Only the store release uploads source maps and dSYMs (it needs SENTRY_AUTH_TOKEN,
// which app.config.js `assertSentryBuildReady` demands up front). Staging and
// development builds skip the upload so a missing token never blocks them.
describe('eas.json — Sentry upload flag', () => {
  it('production uploads: SENTRY_DISABLE_AUTO_UPLOAD is not set', () => {
    expect(resolvedEnv('production').SENTRY_DISABLE_AUTO_UPLOAD).toBeUndefined();
  });

  it.each(['development', 'preview', 'staging', 'maestro'])(
    '%s skips the upload: SENTRY_DISABLE_AUTO_UPLOAD=true',
    (name) => {
      expect(resolvedEnv(name).SENTRY_DISABLE_AUTO_UPLOAD).toBe('true');
    },
  );
});
