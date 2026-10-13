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
