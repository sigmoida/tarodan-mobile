/**
 * app.config.js: per-variant overrides and the Sentry build guard.
 *
 * The variant tests pin how the preview (staging) variant diverges from the
 * production config: the iOS bundle id and the Android package both get the
 * `.staging` suffix (two-app model, decided 2026-10-13), the Android block keeps
 * every other field, and the home-screen name is the short "Staging".
 * Background: docs/superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md
 * section 2 (the suffix needs a Firebase/FCM and a Google Cloud OAuth client
 * registration; without the second the build passes but Google sign-in fails).
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

describe('app.config — preview (staging) variant', () => {
  it('adds the .staging suffix to the iOS bundle id', () => {
    const result = evaluate('preview');
    expect(result.ios.bundleIdentifier).toBe(
      `${baseConfig.ios.bundleIdentifier}.staging`,
    );
  });

  it('adds the .staging suffix to the Android package too (two-app model, 2026-10-13)', () => {
    const result = evaluate('preview');
    expect(result.android.package).toBe(`${baseConfig.android.package}.staging`);
  });

  it('passes every Android field except package, google-services and intent filters through unchanged', () => {
    // No field (permissions, adaptiveIcon, ...) may get lost in the spread. The
    // staging-only differences (package, staging google-services, staging host) are
    // covered in src/config/__tests__/androidRelease.test.ts.
    const result = evaluate('preview');
    const omit = ({ package: _p, googleServicesFile: _g, intentFilters: _i, ...rest }: any) => rest;
    expect(omit(result.android)).toEqual(omit(baseConfig.android));
    expect(result.android.googleServicesFile).toBe('./google-services.staging.json');
  });

  it('uses the short home-screen name "Staging"', () => {
    const result = evaluate('preview');
    expect(result.name).toBe('Staging');
  });
});

describe('app.config — other environments', () => {
  it.each(['production', 'development', undefined])(
    'returns the config unchanged for %s',
    (environment) => {
      const result = evaluate(environment);
      expect(result).toBe(baseConfig);
    },
  );
});

describe('app.config — Sentry upload guard on EAS builds', () => {
  const { assertSentryBuildReady } = withVariant;
  const builds: Record<string, { env: Record<string, string> }> = eas.build;
  const easBuild = (profile: string, extra: Record<string, string> = {}): Record<string, string> => ({
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

  // `maestro` extends `preview`; its resolved flag is pinned in easProfiles.test.ts.
  it.each(['preview', 'staging', 'development'])(
    'does not block the %s profile, which has no Sentry token or DSN',
    (profile) => {
      expect(() => assertSentryBuildReady(easBuild(profile), jest.fn())).not.toThrow();
    },
  );

  it('does not treat a padded opt-out as disabled, because the Sentry scripts would still upload', () => {
    const env = easBuild('production', {
      EXPO_PUBLIC_SENTRY_DSN: secrets.EXPO_PUBLIC_SENTRY_DSN,
      SENTRY_DISABLE_AUTO_UPLOAD: 'true ',
    });
    expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/SENTRY_AUTH_TOKEN/);
  });

  it('the opt-out skips only the token: a production build without the DSN still stops', () => {
    const env = easBuild('production', { SENTRY_DISABLE_AUTO_UPLOAD: 'true' });
    expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/missing EXPO_PUBLIC_SENTRY_DSN\./);
  });

  // sentry-cli 2.x exits 0 on a failed upload for exactly these values.
  it.each(['true', '1'])(
    'stops a production build that uploads with SENTRY_ALLOW_FAILURE=%s, which would swallow a failed upload',
    (value) => {
      const env = easBuild('production', { ...secrets, SENTRY_ALLOW_FAILURE: value });
      expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/sets SENTRY_ALLOW_FAILURE=/);
    },
  );

  it('names the profile, the value and the two ways out in the allow-failure error', () => {
    let message = '';
    try {
      assertSentryBuildReady(easBuild('production', { ...secrets, SENTRY_ALLOW_FAILURE: 'true' }), jest.fn());
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('EAS build profile "production" sets SENTRY_ALLOW_FAILURE=true');
    expect(message).toContain('Remove SENTRY_ALLOW_FAILURE');
    expect(message).toContain('SENTRY_DISABLE_AUTO_UPLOAD=true');
    expect(message).toContain('docs/RELEASE.md, "Sentry source maps and debug symbols"');
  });

  it.each(['TRUE', 'True', ' true', 'true ', 'yes', '0', 'false', ''])(
    'passes SENTRY_ALLOW_FAILURE=%j, which sentry-cli ignores (a failed upload still fails the build)',
    (value) => {
      const warn = jest.fn();
      const env = easBuild('production', { ...secrets, SENTRY_ALLOW_FAILURE: value });
      expect(() => assertSentryBuildReady(env, warn)).not.toThrow();
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it('lets the exact opt-out win over SENTRY_ALLOW_FAILURE, with the opt-out warning', () => {
    const warn = jest.fn();
    const env = easBuild('production', {
      EXPO_PUBLIC_SENTRY_DSN: secrets.EXPO_PUBLIC_SENTRY_DSN,
      SENTRY_DISABLE_AUTO_UPLOAD: 'true',
      SENTRY_ALLOW_FAILURE: 'true',
    });
    expect(() => assertSentryBuildReady(env, warn)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/NOT uploaded/));
  });

  it.each(['TRUE', 'true ', '1'])(
    'does not let a non-exact opt-out (%j) cover SENTRY_ALLOW_FAILURE, because the Sentry scripts would still upload',
    (value) => {
      const env = easBuild('production', { ...secrets, SENTRY_DISABLE_AUTO_UPLOAD: value, SENTRY_ALLOW_FAILURE: 'true' });
      expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/sets SENTRY_ALLOW_FAILURE=true/);
    },
  );

  it('leaves SENTRY_ALLOW_FAILURE to a non-production profile that uploads', () => {
    const { SENTRY_DISABLE_AUTO_UPLOAD: _optOut, ...uploading } = easBuild('staging');
    const env = { ...uploading, SENTRY_AUTH_TOKEN: secrets.SENTRY_AUTH_TOKEN, SENTRY_ALLOW_FAILURE: 'true' };
    expect(() => assertSentryBuildReady(env, jest.fn())).not.toThrow();
  });

  it('a non-production profile that uploads needs the token but never the DSN', () => {
    const { SENTRY_DISABLE_AUTO_UPLOAD: _optOut, ...uploading } = easBuild('staging');
    expect(() => assertSentryBuildReady(uploading, jest.fn())).toThrow(/missing SENTRY_AUTH_TOKEN\./);
    expect(() =>
      assertSentryBuildReady({ ...uploading, SENTRY_AUTH_TOKEN: secrets.SENTRY_AUTH_TOKEN }, jest.fn()),
    ).not.toThrow();
  });

  it('names the profile, both missing values and the two ways out in the error', () => {
    let message = '';
    try {
      assertSentryBuildReady(easBuild('production'), jest.fn());
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('EAS build profile "production" is missing SENTRY_AUTH_TOKEN and EXPO_PUBLIC_SENTRY_DSN.');
    expect(message).toContain('SENTRY_DISABLE_AUTO_UPLOAD=true');
    expect(message).toContain('docs/RELEASE.md, "Sentry source maps and debug symbols"');
    const { EAS_BUILD_PROFILE: _p, ...noProfile } = easBuild('production');
    expect(() => assertSentryBuildReady(noProfile, jest.fn())).toThrow(/EAS build profile "unknown"/);
  });

  it.each(['TRUE', 'True', '1', 'yes'])(
    'does not treat SENTRY_DISABLE_AUTO_UPLOAD=%s as an opt-out (the Sentry scripts only skip on "true")',
    (value) => {
      const env = easBuild('production', {
        EXPO_PUBLIC_SENTRY_DSN: secrets.EXPO_PUBLIC_SENTRY_DSN,
        SENTRY_DISABLE_AUTO_UPLOAD: value,
      });
      expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/SENTRY_AUTH_TOKEN/);
    },
  );

  it.each(['preview', 'staging', 'development'])('does not warn on the %s opt-out (only production warns)', (profile) => {
    const warn = jest.fn();
    assertSentryBuildReady(easBuild(profile), warn);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['1', 'TRUE', ' true '])('is on for any truthy EAS_BUILD value (%j)', (flag) => {
    const env = easBuild('production', { EAS_BUILD: flag });
    expect(() => assertSentryBuildReady(env, jest.fn())).toThrow(/SENTRY_AUTH_TOKEN/);
  });

  it.each([undefined, '', 'false', '0'])(
    'does nothing outside an EAS build worker (EAS_BUILD=%s)',
    (flag) => {
      const env: Record<string, string> = { ...builds.production.env };
      if (flag !== undefined) env.EAS_BUILD = flag;
      expect(() => assertSentryBuildReady(env, jest.fn())).not.toThrow();
    },
  );

  it('runs on every config read, so the EAS worker stops before the native build', () => {
    const keys = [
      'EAS_BUILD',
      'SENTRY_AUTH_TOKEN',
      'SENTRY_DISABLE_AUTO_UPLOAD',
      'SENTRY_ALLOW_FAILURE',
      'EXPO_PUBLIC_SENTRY_DSN',
    ];
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
