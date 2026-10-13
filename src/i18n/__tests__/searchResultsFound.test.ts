/**
 * `search.resultsFound` — web değeri sayısız ("sonuç bulundu"); mobil sayıyı
 * mesajda taşır (ICU plural), çağrı yeri `count` geçer. İngilizce tekil/çoğul
 * doğru olmalı ("1 result found").
 */
import i18n from '@/i18n/config';

afterAll(() => i18n.changeLanguage('tr'));

it('tr: sayı mesajın içinde', async () => {
  await i18n.changeLanguage('tr');
  expect(i18n.t('search.resultsFound', { count: 12 })).toBe('12 sonuç bulundu');
});

it('en: tekil/çoğul doğru', async () => {
  await i18n.changeLanguage('en');
  expect(i18n.t('search.resultsFound', { count: 1 })).toBe('1 result found');
  expect(i18n.t('search.resultsFound', { count: 2 })).toBe('2 results found');
});
