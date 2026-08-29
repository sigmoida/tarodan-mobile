import i18n from '@/i18n/config';
import { buildLegalPages } from '../_lib/legalPages';

const LEGAL_PAGES = buildLegalPages(i18n.t);

describe('LEGAL_PAGES kataloğu', () => {
  it('yalnız hukuki üçlüyü içerir — about/faq sabit ekranları çiftlemez', () => {
    expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(['privacy', 'terms', 'cookie-policy']);
  });

  it('her sayfanın etiketi vardır (liste ucu başlık döndürmüyor)', () => {
    LEGAL_PAGES.forEach((p) => expect(p.label.length).toBeGreaterThan(0));
  });
});
