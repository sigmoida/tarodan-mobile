/**
 * Release'te `logger.debug` düşer (hassas veri buraya yazılır), `logger.info` geçer.
 */
const g = globalThis as unknown as { __DEV__: boolean };
let saved: boolean;
let log: jest.SpyInstance;

beforeEach(() => {
  saved = g.__DEV__;
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  g.__DEV__ = saved;
  log.mockRestore();
});

function load(dev: boolean) {
  g.__DEV__ = dev;
  let mod!: typeof import('../logger');
  jest.isolateModules(() => {
    mod = require('../logger');
  });
  return mod.logger;
}

describe('services/logger seviyeleri', () => {
  it('release: debug düşer, info yazılır', () => {
    const logger = load(false);
    logger.debug('gizli', { token: 'abc' });
    expect(log).not.toHaveBeenCalled();
    logger.info('genel');
    expect(JSON.stringify(log.mock.calls)).toContain('genel');
  });

  it('geliştirme: debug yazılır', () => {
    load(true).debug('ayrıntı', { x: 1 });
    expect(JSON.stringify(log.mock.calls)).toContain('ayrıntı');
  });
});
