/**
 * `client.ts` modül yüklenirken API adresi / platform / Expo host'u konsola
 * yazıyordu — release build'de de. Artık `logger.debug` ile yazılır: geliştirmede görünür,
 * release'te logger'ın minLevel'ı (`info`) yüzünden hiç yazılmaz.
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

const dump = (spy: jest.SpyInstance) => JSON.stringify(spy.mock.calls);

describe('api client — başlangıç günlüğü', () => {
  afterEach(() => jest.restoreAllMocks());

  it('release (__DEV__=false): API adresi ve host konsola yazılmaz', () => {
    const logSpy = loadClient(false);
    expect(dump(logSpy)).not.toMatch(/apiUrl|localhost|expoHost|Yapılandırma/);
  });

  it('geliştirme (__DEV__=true): API adresi, platform ve host yazılır', () => {
    const logSpy = loadClient(true);
    // ConsoleSink: console.log(önek, mesaj, bağlam)
    const ctx = logSpy.mock.calls.map((c) => c[2]).find((c) => c && 'apiUrl' in c);
    expect(ctx).toBeDefined();
    expect(Object.keys(ctx)).toEqual(expect.arrayContaining(['apiUrl', 'platform', 'expoHost']));
  });
});
