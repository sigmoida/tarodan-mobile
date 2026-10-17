/**
 * Hero / rozet uçları — yol ve parametre sözleşmesi (delta 24):
 * tık TEK istek (`?cta=1|2`), görsele dokunuşta parametresiz; gövde yok.
 */
const mockGet = jest.fn(() => Promise.resolve({ data: [] }));
const mockPost = jest.fn(() => Promise.resolve({ data: undefined }));
jest.mock('../client', () => ({
  guestApi: { get: (...a: unknown[]) => mockGet(...(a as [])), post: (...a: unknown[]) => mockPost(...(a as [])) },
  api: {},
}));

import { heroApi } from '../hero';

beforeEach(() => {
  mockGet.mockClear();
  mockPost.mockClear();
});

describe('heroApi', () => {
  it.each(['home', 'auth_default', 'auth_register'] as const)(
    'slaytlar: placement=%s ile platform=app query parametresi',
    (placement) => {
      heroApi.getSlides(placement);
      expect(mockGet).toHaveBeenCalledWith('/hero-slides', { params: { placement, platform: 'app' } });
    },
  );

  it('gösterim: gövdesiz POST', () => {
    heroApi.recordImpression('abc');
    expect(mockPost).toHaveBeenCalledWith('/hero-slides/abc/impression');
  });

  it('tık: görsele dokunuşta cta yok, butonda cta=1|2 — tek istek', () => {
    heroApi.recordClick('abc');
    expect(mockPost).toHaveBeenLastCalledWith('/hero-slides/abc/click', undefined, { params: undefined });
    heroApi.recordClick('abc', 2);
    expect(mockPost).toHaveBeenLastCalledWith('/hero-slides/abc/click', undefined, { params: { cta: 2 } });
    expect(mockPost).toHaveBeenCalledTimes(2);
  });
});
