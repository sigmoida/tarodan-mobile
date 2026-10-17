/**
 * app.config.js — varyant override'ları.
 *
 * Bu testin asıl işi iOS ile Android'in AYRIŞTIĞINI sabitlemek: preview
 * build'inde iOS bundle id `.staging` suffix'i alır, Android paketi ALMAZ.
 * Gerekçe: docs/superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md §2
 * (suffix, Firebase/FCM + Google Cloud OAuth client olmak üzere iki kayıt
 * istiyor; ikincisi eksikse build geçer ama Google ile giriş sessizce patlar).
 * "Tutarlılık" adına ikisini eşitlemek isteyen bu testi düşürür ve §2'yi okur.
 */
import eas from '../eas.json';

const withVariant = require('../app.config');
const { expo: baseConfig } = require('../app.json');

const evaluate = (environment: string | undefined) => {
  const previous = process.env.EXPO_PUBLIC_ENVIRONMENT;
  if (environment === undefined) {
    delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  } else {
    process.env.EXPO_PUBLIC_ENVIRONMENT = environment;
  }
  try {
    return withVariant({ config: baseConfig });
  } finally {
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_ENVIRONMENT;
    } else {
      process.env.EXPO_PUBLIC_ENVIRONMENT = previous;
    }
  }
};

describe('app.config — preview (staging) varyantı', () => {
  it('iOS bundle id\'sine .staging suffix\'i ekler', () => {
    const result = evaluate('preview');
    expect(result.ios.bundleIdentifier).toBe(
      `${baseConfig.ios.bundleIdentifier}.staging`,
    );
  });

  it('Android paketine de .staging suffix\'i ekler (iki uygulamalı model, 2026-10-13 kararı)', () => {
    const result = evaluate('preview');
    expect(result.android.package).toBe(`${baseConfig.android.package}.staging`);
  });

  it('Android bloğunda paket, google-services ve intent filter dışındaki alanları olduğu gibi geçirir', () => {
    // permissions, adaptiveIcon vb. hiçbir alan spread sırasında düşmemeli. Staging'e
    // özgü farklar (paket, staging google-services, staging host) ayrıca
    // src/config/__tests__/androidRelease.test.ts'te sınanıyor.
    const result = evaluate('preview');
    const omit = ({ package: _p, googleServicesFile: _g, intentFilters: _i, ...rest }: any) => rest;
    expect(omit(result.android)).toEqual(omit(baseConfig.android));
    expect(result.android.googleServicesFile).toBe('./google-services.staging.json');
  });

  it('ana ekran adı kısa "Staging"', () => {
    const result = evaluate('preview');
    expect(result.name).toBe('Staging');
  });
});

describe('app.config — diğer ortamlar', () => {
  it.each(['production', 'development', undefined])(
    '%s ortamında config\'i olduğu gibi döndürür',
    (environment) => {
      const result = evaluate(environment);
      expect(result).toBe(baseConfig);
    },
  );
});

describe('app.config — Sentry upload guard on EAS builds', () => {
  const { assertSentryBuildReady } = withVariant;
  const builds: Record<string, { env: Record<string, string> }> = eas.build;
  const easBuild = (profile: string, extra: Record<string, string> = {}) => ({
    EAS_BUILD: 'true',
    EAS_BUILD_PROFILE: profile,
    ...builds[profile].env,
    ...extra,
  });
  const secrets = { SENTRY_AUTH_TOKEN: 'test-token', EXPO_PUBLIC_SENTRY_DSN: 'https://key@example.invalid/1' };

  it('stops a production build that has no SENTRY_AUTH_TOKEN', () => {
    const env = easBuild('production', { EXPO_PUBLIC_SENTRY_DSN: secrets.EXPO_PUBLIC_SENTRY_DSN });
    expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/missing SENTRY_AUTH_TOKEN\./);
  });

  it('stops a production build that has no EXPO_PUBLIC_SENTRY_DSN', () => {
    const env = easBuild('production', { SENTRY_AUTH_TOKEN: secrets.SENTRY_AUTH_TOKEN });
    expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/missing EXPO_PUBLIC_SENTRY_DSN\./);
  });

  it('treats a blank token as missing', () => {
    const env = easBuild('production', { ...secrets, SENTRY_AUTH_TOKEN: '  ' });
    expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/SENTRY_AUTH_TOKEN/);
  });

  it('passes a production build that has the token and the DSN, without a warning', () => {
    const warn = jest.fn();
    expect(() => assertSentryBuildReady(easBuild('production', secrets), warn)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it('lets a production build skip the upload on purpose, with a warning', () => {
    const warn = jest.fn();
    const env = easBuild('production', {
      EXPO_PUBLIC_SENTRY_DSN: secrets.EXPO_PUBLIC_SENTRY_DSN,
      SENTRY_DISABLE_AUTO_UPLOAD: 'true',
    });
    expect(() => assertSentryBuildReady(env, warn)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/NOT uploaded/));
  });

  it.each(['preview', 'staging', 'development', 'maestro'])(
    'does not block the %s profile, which has no Sentry token or DSN',
    (profile) => {
      const maestro = profile === 'maestro' ? builds.preview.env : {};
      const env = { ...maestro, ...easBuild(profile) };
      expect(() => assertSentryBuildReady(env, jest.fn())).not.toThrow();
    },
  );

  it.each([undefined, '', 'false', '0'])(
    'does nothing outside an EAS build worker (EAS_BUILD=%s)',
    (flag) => {
      const env: Record<string, string> = { ...builds.production.env };
      if (flag !== undefined) env.EAS_BUILD = flag;
      expect(() => assertSentryBuildReady(env, jest.fn())).not.toThrow();
    },
  );

  it('runs on every config read, so the EAS worker stops before the native build', () => {
    const keys = ['EAS_BUILD', 'SENTRY_AUTH_TOKEN', 'SENTRY_DISABLE_AUTO_UPLOAD', 'EXPO_PUBLIC_SENTRY_DSN'];
    const saved = keys.map((k) => [k, process.env[k]] as const);
    keys.forEach((k) => delete process.env[k]);
    process.env.EAS_BUILD = 'true';
    try {
      expect(() => evaluate('production')).toThrow(/SENTRY_AUTH_TOKEN and EXPO_PUBLIC_SENTRY_DSN/);
    } finally {
      saved.forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
    }
  });

  it('configures the Sentry plugin with org and project but never an auth token', () => {
    const sentry = baseConfig.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === '@sentry/react-native/expo',
    );
    expect(sentry?.[1]).toEqual({ organization: 'tarodan', project: 'tarodan-mobile' });
  });
});
