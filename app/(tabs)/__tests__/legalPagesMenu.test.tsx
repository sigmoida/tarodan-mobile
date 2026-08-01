import { LEGAL_PAGES } from '../_lib/legalPages';

describe('LEGAL_PAGES kataloğu', () => {
  it('yalnız hukuki üçlüyü içerir — about/faq sabit ekranları çiftlemez', () => {
    expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(['privacy', 'terms', 'cookie-policy']);
  });

  it('her sayfanın etiketi vardır (liste ucu başlık döndürmüyor)', () => {
    LEGAL_PAGES.forEach((p) => expect(p.label.length).toBeGreaterThan(0));
  });
});
