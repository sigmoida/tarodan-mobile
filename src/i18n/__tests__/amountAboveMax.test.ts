/**
 * `validation.amountAboveMax` carries the API's ceiling of an agreed amount as an ICU number
 * (`{max, number}`), so it reads in each language's grouping, the same text web shows.
 */
import i18n, { ensureLocaleLoaded } from '@/i18n/config';
import { TL_NEGOTIATED_AMOUNT_MAX } from '@/types';

afterAll(() => i18n.changeLanguage('tr'));

it('tr: the ceiling with Turkish grouping', async () => {
  await i18n.changeLanguage('tr');
  expect(i18n.t('validation.amountAboveMax', { max: TL_NEGOTIATED_AMOUNT_MAX })).toBe(
    "Tutar 9.999.999 TL'yi aşamaz.",
  );
});

it('en: the ceiling with English grouping', async () => {
  ensureLocaleLoaded('en');
  await i18n.changeLanguage('en');
  expect(i18n.t('validation.amountAboveMax', { max: TL_NEGOTIATED_AMOUNT_MAX })).toBe(
    'The amount cannot exceed 9,999,999 TL.',
  );
});
