/**
 * Locale önekli reklam linkleri: rota locale'den arındırılmış yol + sorgu ile
 * kurulur (`/en/listings` diye bir mobil rota yok).
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { resolveAdLink } from '../openAdLink';
const LISTING_ID = '0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c';

describe('resolveAdLink — locale öneki', () => {
  it('/en/listings?… → /search?… (filtre korunur)', () => {
    expect(resolveAdLink('/en/listings?manufacturer=Hot+Wheels')).toEqual({
      kind: 'route',
      route: '/search?manufacturer=Hot+Wheels',
    });
    expect(resolveAdLink('https://tarodan.com.tr/en/listings?manufacturer=Hot+Wheels&sort=new')).toEqual({
      kind: 'route',
      route: '/search?manufacturer=Hot+Wheels&sort=new',
    });
  });

  it('sorgusuz /en/listings ve sondaki slash', () => {
    expect(resolveAdLink('/en/listings')).toEqual({ kind: 'route', route: '/search' });
    expect(resolveAdLink('/en/listings/')).toEqual({ kind: 'route', route: '/search' });
  });

  it('locale önekli diğer yollar da mobil rotaya çıkar', () => {
    expect(resolveAdLink(`/en/listings/${LISTING_ID}`)).toEqual({ kind: 'route', route: `/product/${LISTING_ID}` });
    expect(resolveAdLink('/en/manufacturers/hot-wheels')).toEqual({
      kind: 'route',
      route: '/ureticiler/hot-wheels',
    });
  });
});
