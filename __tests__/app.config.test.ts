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

  it('Android paketini DEĞİŞTİRMEZ', () => {
    const result = evaluate('preview');
    expect(result.android.package).toBe(baseConfig.android.package);
    expect(result.android.package).not.toMatch(/\.staging$/);
  });

  it('Android bloğunun tamamını olduğu gibi geçirir', () => {
    // googleServicesFile, permissions, intentFilters dahil hiçbir alan
    // kaybolmamalı — spread sırasında düşen bir alan build'de fark edilmez.
    const result = evaluate('preview');
    expect(result.android).toEqual(baseConfig.android);
  });

  it('uygulama adına (Staging) etiketi ekler', () => {
    const result = evaluate('preview');
    expect(result.name).toBe(`${baseConfig.name} (Staging)`);
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
