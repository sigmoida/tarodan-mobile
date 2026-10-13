/**
 * Parite A-3.1 · `GET /timing-rules` okuma kuralı (ana repo
 * `packages/types/src/timing-policy.ts` aynası).
 */
import { PUBLIC_TIMING_RULE_IDS } from '@/lib/api/timingRules';
import {
  FALLBACK_TIMING_POLICY,
  addCalendarDays,
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
