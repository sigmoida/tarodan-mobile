/**
 * Ham ICU metni ekranda görünmesin. Hermes'te Intl.PluralRules yok → intl-messageformat
 * `{n, plural,…}` çözemeyip HAM metni döndürüyordu (arama sonuç sayısı). Kök neden
 * ./pluralRules polyfill'iyle kapanır; bu test o ortamı taklit eder (PluralRules silinir).
 *
 * Not: i18next-icu `addLookupKeys`'i devre dışı bırakır → `key_one/_other` i18next
 * çoğulları BU kurulumda çalışmaz; katalog ICU (web'le aynı) kalır.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');
const catalogs = {
  tr: JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/tr.json`, 'utf8')),
  en: JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/en.json`, 'utf8')),
};

const ICU_RE = /\{\s*\w+\s*,\s*(plural|select|selectordinal)\s*,/;

function leaves(obj: Record<string, unknown>, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' ? leaves(v as Record<string, unknown>, path) : [[path, String(v)] as [string, string]];
  });
}

describe('Intl.PluralRules olmayan ortam (Hermes)', () => {
  const originalPluralRules = (Intl as { PluralRules?: unknown }).PluralRules;
  let i18n: typeof import('@/i18n/config').default;

  beforeAll(() => {
    (Intl as { PluralRules?: unknown }).PluralRules = undefined;
    jest.isolateModules(() => {
      i18n = require('@/i18n/config').default;
    });
  });

  afterAll(async () => {
    await i18n.changeLanguage('tr');
    (Intl as { PluralRules?: unknown }).PluralRules = originalPluralRules;
  });

  it('search.resultsFound sayıyı ve doğru çoğulu basar', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('search.resultsFound', { count: 1 })).toBe('1 result found');
    expect(i18n.t('search.resultsFound', { count: 61 })).toBe('61 results found');
    await i18n.changeLanguage('tr');
    expect(i18n.t('search.resultsFound', { count: 61 })).toBe('61 sonuç bulundu');
  });

  it('time.relative.days çoğul', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('time.relative.days', { count: 1 })).toBe('1 day ago');
    expect(i18n.t('time.relative.days', { count: 3 })).toBe('3 days ago');
  });

  it('adlı parametreli ICU metinleri ham kalmaz (tr + en)', async () => {
    const params = {
      returnWindowDays: 1,
      count: 5,
      payoutGraceDays: 3,
      orderPaymentWindowHours: 24,
      preparingDeadlineDays: 2,
    };
    for (const lng of ['tr', 'en'] as const) {
      await i18n.changeLanguage(lng);
      const icuKeys = leaves(catalogs[lng]).filter(([, v]) => ICU_RE.test(v));
      for (const [key] of icuKeys) {
        const out = String(i18n.t(key as never, params as never));
        expect(out).not.toMatch(/plural|select|\{|\}/);
      }
    }
    await i18n.changeLanguage('en');
    expect(i18n.t('order.refundEligibleIntro' as never, { returnWindowDays: 1 } as never)).toContain('within 1 day of');
    expect(i18n.t('order.refundEligibleIntro' as never, { returnWindowDays: 14 } as never)).toContain('within 14 days of');
  });
});
