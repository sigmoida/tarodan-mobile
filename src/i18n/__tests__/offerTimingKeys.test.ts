/**
 * A-3 ek iş · Teklif kabul metinleri web'deki (`packages/i18n`) ICU parametreli
 * sürümleriyle eklendi: ödeme süresi sabit "24 saat" değil, politikadan
 * (`t(key, useTimingValues())`). Çağrı yeri (kabul onay diyaloğu, "ilk ödeyen
 * alır" notu) `app/offers` (INT-4) — bkz. handoff-int.
 */
import i18n from '@/i18n/config';
import { FALLBACK_TIMING_POLICY, timingMessageValues } from '@/lib/shared/timingPolicy';

const values = { ...timingMessageValues(FALLBACK_TIMING_POLICY), orderPaymentWindowHours: 72 };

afterAll(() => i18n.changeLanguage('tr'));

it.each(['offer.acceptConfirmDescSeller', 'offer.acceptConfirmDescBuyer', 'offer.firstToPayWinsSeller'] as const)(
  '%s ödeme süresini parametreden basar (tr + en)',
  async (key) => {
    await i18n.changeLanguage('tr');
    expect(i18n.t(key, values)).toContain('72 saat');
    await i18n.changeLanguage('en');
    expect(i18n.t(key, values)).toMatch(/72[- ]hours?/);
  },
);

// Onay diyaloğu başlığı ve alıcı notu (web ile aynı metin): kabul akışı `app/offers/_lib/accept.ts`.
it.each(['offer.acceptConfirmTitle', 'offer.firstToPayWinsBuyer'] as const)('%s tr + en tanımlı', async (key) => {
  await i18n.changeLanguage('tr');
  const tr = i18n.t(key);
  await i18n.changeLanguage('en');
  const en = i18n.t(key);
  expect(tr).not.toBe(key);
  expect(en).not.toBe(key);
  expect(tr).not.toBe(en);
});
