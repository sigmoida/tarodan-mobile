/**
 * `toMobileRoute`'un eşlemediği ama mobilde aynı yolla var olan ekranlar
 * WebView'e düşmemeli (regresyon); bilinmeyen rotaya push yok kuralı sürer.
 */
import fs from 'fs';
import path from 'path';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { NATIVE_SAME_PATH_HEADS, resolveAdLink } from '../openAdLink';

const APP_DIR = path.join(__dirname, '..', '..', '..', '..', 'app');

describe('resolveAdLink — mobilde aynı adla var olan rotalar native açılır', () => {
  it.each([
    ['/brands/hot-wheels', '/brands/hot-wheels'],
    ['/category/cars', '/category/cars'],
    ['/sayfa/hakkimizda', '/sayfa/hakkimizda'],
    ['/models', '/models'],
    ['/models/camaro', '/models/camaro'],
    ['/returns-exchanges', '/returns-exchanges'],
    ['/following', '/following'],
    ['https://tarodan.com.tr/en/brands/bmw?x=1', '/brands/bmw?x=1'],
  ])('%s → %s', (input, route) => {
    expect(resolveAdLink(input)).toEqual({ kind: 'route', route });
  });

  it('listedeki her ad gerçekten app/ ağacında var (bilinmeyen rotaya push yok)', () => {
    const entries = fs.readdirSync(APP_DIR).map((n) => n.replace(/\.tsx$/, ''));
    for (const head of NATIVE_SAME_PATH_HEADS) {
      expect(entries).toContain(head);
    }
  });

  it('listede olmayan bilinmeyen yol hâlâ WebView ister, rota üretmez', () => {
    expect(resolveAdLink('/totally-unknown/page').kind).toBe('web');
  });
});
