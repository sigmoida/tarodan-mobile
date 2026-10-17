/**
 * Sentry environment tag (tarodan-ops docs/observability.md: set explicitly,
 * `production` or `staging`).
 *
 * Staging builds and OTAs ran with `EXPO_PUBLIC_ENVIRONMENT=preview` and reported
 * `environment=preview`, so the staging filter on the Sentry alerts never matched
 * them. The app variable stays `preview` (it selects the `.staging` app id); only
 * the Sentry tag is mapped. Maestro E2E builds (which extend `preview`) stay out
 * of the staging alerts.
 */
import * as fs from 'fs';
import * as path from 'path';
import { sentryEnvironment } from '../sentryEnvironment';

type EasJson = { build: Record<string, { extends?: string; env?: Record<string, string> }> };
const eas = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../eas.json'), 'utf8'),
) as EasJson;

/** A profile's env value, following `extends` like EAS does. */
const profileEnv = (profile: string, key: string): string | undefined => {
  const p = eas.build[profile];
  return p?.env?.[key] ?? (p?.extends ? profileEnv(p.extends, key) : undefined);
};

/** A store / staging release bundle: not `__DEV__`, not a Maestro E2E build. */
const RELEASE = { isDev: false, isE2E: false };

describe('sentryEnvironment', () => {
  it.each([
    ['production', 'production'],
    ['preview', 'staging'],
    ['development', 'development'],
  ])('maps EXPO_PUBLIC_ENVIRONMENT=%s to %s', (appEnvironment, expected) => {
    expect(sentryEnvironment(appEnvironment, RELEASE)).toBe(expected);
  });

  // `staging` too: app.config.js gives such a build the production app id.
  it.each([[undefined], [''], ['staging'], ['Production'], ['prod'], ['maestro']])(
    'never reports %p as production or staging',
    (appEnvironment) => {
      expect(sentryEnvironment(appEnvironment, RELEASE)).toBe('development');
    },
  );

  it.each([['preview'], ['production']])(
    'reports a Maestro E2E build as development (EXPO_PUBLIC_ENVIRONMENT=%s)',
    (appEnvironment) => {
      expect(sentryEnvironment(appEnvironment, { isDev: false, isE2E: true })).toBe('development');
    },
  );

  it.each([['preview'], ['production']])(
    'reports a __DEV__ bundle as development (EXPO_PUBLIC_ENVIRONMENT=%s)',
    (appEnvironment) => {
      expect(sentryEnvironment(appEnvironment, { isDev: true, isE2E: false })).toBe('development');
    },
  );

  it.each([
    ['production', 'production'],
    ['staging', 'staging'],
    ['preview', 'staging'],
    ['maestro', 'development'],
    ['development', 'development'],
  ])('eas.json profile %s reports as %s', (profile, expected) => {
    const isE2E = profileEnv(profile, 'EXPO_PUBLIC_MAESTRO') === '1';
    expect(
      sentryEnvironment(profileEnv(profile, 'EXPO_PUBLIC_ENVIRONMENT'), { isDev: false, isE2E }),
    ).toBe(expected);
  });

  it('covers every eas.json build profile', () => {
    expect(Object.keys(eas.build).sort()).toEqual(
      ['development', 'maestro', 'preview', 'production', 'staging'],
    );
  });
});

describe('initSentry', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const saved = {
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
    maestro: process.env.EXPO_PUBLIC_MAESTRO,
    dev: g.__DEV__,
  };
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  afterEach(() => {
    restore('EXPO_PUBLIC_SENTRY_DSN', saved.dsn);
    restore('EXPO_PUBLIC_ENVIRONMENT', saved.environment);
    restore('EXPO_PUBLIC_MAESTRO', saved.maestro);
    g.__DEV__ = saved.dev;
  });

  /** Loads src/services/sentry with a fresh module state and returns the init options. */
  const initOptions = (appEnvironment: string | undefined, maestro?: string, dev = false) => {
    g.__DEV__ = dev;
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://key@example.invalid/1';
    restore('EXPO_PUBLIC_ENVIRONMENT', appEnvironment);
    restore('EXPO_PUBLIC_MAESTRO', maestro);
    const init = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: { executionEnvironment: 'standalone' },
      }));
      jest.doMock('@sentry/react-native', () => ({ init }));
      // requireActual: a plain `require` trips no-var-requires; the module's own
      // imports still get the mocks above.
      jest.requireActual<typeof import('../sentry')>('../sentry').initSentry();
    });
    expect(init).toHaveBeenCalledTimes(1);
    return init.mock.calls[0][0] as { environment: string };
  };

  it.each([
    ['production', 'production'],
    ['preview', 'staging'],
    [undefined, 'development'],
  ])('EXPO_PUBLIC_ENVIRONMENT=%p initialises Sentry with environment %s', (appEnvironment, expected) => {
    expect(initOptions(appEnvironment).environment).toBe(expected);
  });

  it('a Maestro E2E build (EXPO_PUBLIC_MAESTRO=1) initialises Sentry with environment development', () => {
    expect(initOptions('preview', '1').environment).toBe('development');
  });

  it('a __DEV__ bundle initialises Sentry with environment development', () => {
    expect(initOptions('preview', undefined, true).environment).toBe('development');
  });
});
