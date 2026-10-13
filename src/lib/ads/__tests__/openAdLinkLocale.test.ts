/**
 * Locale önekli reklam linkleri: rota locale'den arındırılmış yol + sorgu ile
 * kurulur (`/en/listings` diye bir mobil rota yok).
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { resolveAdLink } from '../openAdLink';

describe('resolveAdLink — locale öneki', () => {
  it('/en/listings?… → /listings?… (filtre korunur)', () => {
    expect(resolveAdLink('/en/listings?manufacturer=Hot+Wheels')).toEqual({
      kind: 'route',
      route: '/listings?manufacturer=Hot+Wheels',
    });
    expect(resolveAdLink('https://tarodan.com.tr/en/listings?manufacturer=Hot+Wheels&sort=new')).toEqual({
      kind: 'route',
      route: '/listings?manufacturer=Hot+Wheels&sort=new',
    });
  });

  it('sorgusuz /en/listings ve sondaki slash', () => {
    expect(resolveAdLink('/en/listings')).toEqual({ kind: 'route', route: '/listings' });
    expect(resolveAdLink('/en/listings/')).toEqual({ kind: 'route', route: '/listings' });
  });

  it('locale önekli diğer yollar da mobil rotaya çıkar', () => {
    expect(resolveAdLink('/en/listings/p-1')).toEqual({ kind: 'route', route: '/product/p-1' });
    expect(resolveAdLink('/en/manufacturers/hot-wheels')).toEqual({
      kind: 'route',
      route: '/ureticiler/hot-wheels',
    });
  });
});
