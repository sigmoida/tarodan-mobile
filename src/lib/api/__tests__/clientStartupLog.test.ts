/**
 * `client.ts` modül yüklenirken API adresi / platform / Expo host'u konsola
 * yazıyordu — release build'de de. Artık yalnız `__DEV__`'de yazılır.
 */
const g = globalThis as unknown as { __DEV__: boolean };

function loadClient(dev: boolean): jest.SpyInstance {
  const saved = g.__DEV__;
  g.__DEV__ = dev;
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    jest.isolateModules(() => {
      require('../client');
    });
  } finally {
    g.__DEV__ = saved;
  }
  return logSpy;
}

describe('api client — başlangıç günlüğü', () => {
  afterEach(() => jest.restoreAllMocks());

  it('release (__DEV__=false): API adresi ve host konsola yazılmaz', () => {
    const logSpy = loadClient(false);
    const startup = logSpy.mock.calls.filter((c) => /API URL|Platform|Expo Host/.test(String(c[0])));
    expect(startup).toEqual([]);
  });

  it('geliştirme (__DEV__=true): üç satır yazılır', () => {
    const logSpy = loadClient(true);
    const startup = logSpy.mock.calls.filter((c) => /API URL|Platform|Expo Host/.test(String(c[0])));
    expect(startup).toHaveLength(3);
  });
});
