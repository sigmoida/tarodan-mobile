/**
 * Parite A-3.1 · `GET /timing-rules` okuma kuralı (ana repo
 * `packages/types/src/timing-policy.ts` aynası).
 */
import { PUBLIC_TIMING_RULE_IDS } from '@/lib/api/timingRules';
import i18n from '@/i18n/config';
import {
  FALLBACK_TIMING_POLICY,
  addCalendarDays,
  formatPolicyDate,
  parseTimingPolicy,
  timingMessageValues,
} from '../timingPolicy';

describe('FALLBACK_TIMING_POLICY', () => {
  it('her herkese açık kimlik için kayıt varsayılanını taşır', () => {
    expect(Object.keys(FALLBACK_TIMING_POLICY).sort()).toEqual([...PUBLIC_TIMING_RULE_IDS].sort());
    expect(FALLBACK_TIMING_POLICY.returnWindowDays).toEqual({ value: 14, unit: 'days' });
    expect(FALLBACK_TIMING_POLICY.payoutGraceDays).toEqual({ value: 1, unit: 'days' });
    expect(FALLBACK_TIMING_POLICY.orderPaymentWindowHours).toEqual({ value: 24, unit: 'hours' });
    expect(FALLBACK_TIMING_POLICY.preparingDeadlineDays).toEqual({ value: 3, unit: 'days' });
  });
});

describe('parseTimingPolicy', () => {
  it('sunucu değerlerini alır, birimi kayıttan okur', () => {
    const policy = parseTimingPolicy({
      returnWindowDays: { value: 30, unit: 'hours' },
      orderPaymentWindowHours: { value: 48, unit: 'hours' },
    });
    expect(policy.returnWindowDays).toEqual({ value: 30, unit: 'days' });
    expect(policy.orderPaymentWindowHours).toEqual({ value: 48, unit: 'hours' });
  });

  it('bozuk/eksik kayıt yalnız KENDİ kimliği için geri düşer', () => {
    const policy = parseTimingPolicy({
      returnWindowDays: { value: 0 },
      payoutGraceDays: { value: 'iki' },
      preparingDeadlineDays: { value: 5.7 },
      orderPaymentWindowHours: null,
    });
    expect(policy.returnWindowDays.value).toBe(14);
    expect(policy.payoutGraceDays.value).toBe(1);
    expect(policy.orderPaymentWindowHours.value).toBe(24);
    expect(policy.preparingDeadlineDays.value).toBe(5);
  });

  it('nesne olmayan gövde tamamen geri düşüş', () => {
    expect(parseTimingPolicy(null)).toEqual(FALLBACK_TIMING_POLICY);
    expect(parseTimingPolicy('oops')).toEqual(FALLBACK_TIMING_POLICY);
  });
});

describe('timingMessageValues', () => {
  it('kimlik = ICU parametre adı', () => {
    const values = timingMessageValues(parseTimingPolicy({ returnWindowDays: { value: 30 } }));
    expect(values.returnWindowDays).toBe(30);
    expect(values.orderPaymentWindowHours).toBe(24);
    expect(Object.keys(values).sort()).toEqual([...PUBLIC_TIMING_RULE_IDS].sort());
  });
});

describe('addCalendarDays', () => {
  it('takvim günü ekler; bozuk tarihte null', () => {
    expect(addCalendarDays('2026-01-01T10:00:00.000Z', 14)?.toISOString()).toBe('2026-01-15T10:00:00.000Z');
    expect(addCalendarDays('garbage', 14)).toBeNull();
  });
});

describe('A-3 inceleme #8 · saat dilimi', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
    return i18n.changeLanguage('tr');
  });

  it('yedek tarih hesabı cihazın yaz saatinden etkilenmez (sunucu: UTC süreç, TR sabit +03)', () => {
    process.env.TZ = 'Europe/Berlin'; // 25 Ekim 2026'da yaz saati biter
    expect(addCalendarDays('2026-10-20T10:00:00.000Z', 14)?.toISOString()).toBe('2026-11-03T10:00:00.000Z');
    process.env.TZ = 'America/New_York';
    expect(addCalendarDays('2026-10-20T10:00:00.000Z', 14)?.toISOString()).toBe('2026-11-03T10:00:00.000Z');
  });

  it('süre tarihi İstanbul saatiyle ve uygulamanın dilinde biçimlenir', async () => {
    process.env.TZ = 'America/New_York';
    const date = new Date('2026-10-13T21:30:00.000Z'); // İstanbul: 14 Ekim 00:30
    expect(formatPolicyDate(date)).toBe('14 Ekim 2026 00:30');
    await i18n.changeLanguage('en');
    expect(formatPolicyDate(date)).toMatch(/^October 14, 2026.*12:30\sAM$/);
  });
});
