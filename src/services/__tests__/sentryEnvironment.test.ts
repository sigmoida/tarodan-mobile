/**
 * Sentry environment tag (tarodan-ops docs/observability.md: set explicitly,
 * `production` or `staging`).
 *
 * Staging builds and OTAs ran with `EXPO_PUBLIC_ENVIRONMENT=preview` and reported
 * `environment=preview`, so the staging filter on the Sentry alerts never matched
 * them. The app variable stays `preview` (it selects the `.staging` app id); only
 * the Sentry tag is mapped.
 */
import * as fs from 'fs';
import * as path from 'path';
import { sentryEnvironment } from '../sentryEnvironment';

type EasJson = { build: Record<string, { extends?: string; env?: Record<string, string> }> };
const eas = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../eas.json'), 'utf8'),
) as EasJson;

/** The profile's EXPO_PUBLIC_ENVIRONMENT, following `extends` like EAS does. */
const appEnvironmentOf = (profile: string): string | undefined => {
  const p = eas.build[profile];
  return p?.env?.EXPO_PUBLIC_ENVIRONMENT ?? (p?.extends ? appEnvironmentOf(p.extends) : undefined);
};

describe('sentryEnvironment', () => {
  it.each([
    ['production', 'production'],
    ['preview', 'staging'],
    ['staging', 'staging'],
    ['development', 'development'],
  ])('maps EXPO_PUBLIC_ENVIRONMENT=%s to %s', (appEnvironment, expected) => {
    expect(sentryEnvironment(appEnvironment)).toBe(expected);
  });

  it.each([[undefined], [''], ['Production'], ['prod'], ['maestro']])(
    'never reports %p as production or staging',
    (appEnvironment) => {
      expect(sentryEnvironment(appEnvironment)).toBe('development');
    },
  );

  it.each([
    ['production', 'production'],
    ['staging', 'staging'],
    ['preview', 'staging'],
    ['maestro', 'staging'],
    ['development', 'development'],
  ])('eas.json profile %s reports as %s', (profile, expected) => {
    expect(sentryEnvironment(appEnvironmentOf(profile))).toBe(expected);
  });

  it('covers every eas.json build profile', () => {
    expect(Object.keys(eas.build).sort()).toEqual(
      ['development', 'maestro', 'preview', 'production', 'staging'],
    );
  });
});

describe('initSentry', () => {
  const saved = {
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
  };
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  afterEach(() => {
    restore('EXPO_PUBLIC_SENTRY_DSN', saved.dsn);
    restore('EXPO_PUBLIC_ENVIRONMENT', saved.environment);
  });

  /** Loads src/services/sentry with a fresh module state and returns the init options. */
  const initOptions = (appEnvironment: string | undefined) => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://key@example.invalid/1';
    restore('EXPO_PUBLIC_ENVIRONMENT', appEnvironment);
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
});
