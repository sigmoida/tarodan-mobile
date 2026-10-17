/**
 * metro.config.js must start from Sentry's Expo config: its serializer plugin writes a
 * Debug ID into every bundle and source map. The upload scripts (EAS build phases and
 * `sentry-expo-upload-sourcemaps` after an OTA) succeed without those ids, but Sentry
 * then cannot match an event to its map, so a revert to `getDefaultConfig` would ship
 * unreadable stack traces without any failure. Sentry's own module is mocked: this
 * pins the wiring, not Sentry's serializer.
 */
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

type MetroConfig = {
  serializer: { customSerializer?: unknown };
  resolver: { extraNodeModules: Record<string, string>; resolveRequest?: unknown };
  transformer: { minifierConfig?: Record<string, unknown> };
};

const loadWith = (base: Record<string, unknown>) => {
  const getSentryExpoConfig = jest.fn(() => base);
  let config = {} as MetroConfig;
  jest.isolateModules(() => {
    jest.doMock('@sentry/react-native/metro', () => ({ getSentryExpoConfig }));
    config = require('../metro.config');
  });
  return { config, getSentryExpoConfig };
};

describe('metro.config — Sentry debug ids', () => {
  afterEach(() => jest.dontMock('@sentry/react-native/metro'));

  it("is built from Sentry's Expo config for the project root", () => {
    const { getSentryExpoConfig } = loadWith({ resolver: {}, transformer: {}, serializer: {} });
    expect(getSentryExpoConfig).toHaveBeenCalledTimes(1);
    expect(getSentryExpoConfig).toHaveBeenCalledWith(ROOT);
  });

  it("keeps Sentry's serializer (the debug id plugin) and adds only the local resolver and minifier settings", () => {
    const customSerializer = jest.fn();
    const { config } = loadWith({ resolver: {}, transformer: {}, serializer: { customSerializer } });
    expect(config.serializer.customSerializer).toBe(customSerializer);
    expect(config.resolver.extraNodeModules.assert).toBe(path.join(ROOT, 'assert-stub.js'));
    expect(typeof config.resolver.resolveRequest).toBe('function');
    expect(config.transformer.minifierConfig).toMatchObject({ keep_fnames: true });
  });
});
