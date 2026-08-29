/**
 * `GET /shipping/package-tiers` returns `label` from the server — Turkish
 * only, and today's content is even misspelled ("Kucuk Paket", "Buyuk Paket",
 * missing ü). `code` is stable and semantic, so `getPackageTierLabel` renders
 * from the catalog by `code` and only falls back to the server's `label` for
 * an unrecognised code (so a future tier still renders something).
 */
import i18n from '@/i18n/config';
import { getPackageTierLabel } from '../constants';

afterEach(() => {
  i18n.changeLanguage('tr');
});

describe('getPackageTierLabel', () => {
  it('renders the known "small" code from the catalog in Turkish, ignoring a misspelled server label', () => {
    i18n.changeLanguage('tr');
    expect(getPackageTierLabel('small', 'Kucuk Paket', i18n.t.bind(i18n))).toBe('Küçük Paket');
  });

  it('renders the known "small" code from the catalog in English', () => {
    i18n.changeLanguage('en');
    expect(getPackageTierLabel('small', 'Kucuk Paket', i18n.t.bind(i18n))).toBe('Small Package');
  });

  it('renders "medium" and "large" from the catalog too', () => {
    i18n.changeLanguage('tr');
    expect(getPackageTierLabel('medium', 'Orta Paket', i18n.t.bind(i18n))).toBe('Orta Paket');
    expect(getPackageTierLabel('large', 'Buyuk Paket', i18n.t.bind(i18n))).toBe('Büyük Paket');
  });

  it('falls back to the server label for an unrecognised code', () => {
    i18n.changeLanguage('tr');
    expect(getPackageTierLabel('xlarge', 'Ekstra Büyük Paket', i18n.t.bind(i18n))).toBe('Ekstra Büyük Paket');
  });
});
