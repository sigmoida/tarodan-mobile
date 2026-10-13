import {
  DAILY_LIMIT_WARN_THRESHOLD,
  isCachedLimitExhausted,
  parseDailyLimit,
  viewDailyLimit,
} from '../dailyLimit';

describe('parseDailyLimit', () => {
  it('düz gövdeyi ve {data} zarfını okur, negatif kalanı 0a çeker', () => {
    expect(parseDailyLimit({ remaining: 12, limit: 50 })).toEqual({ remaining: 12, limit: 50 });
    expect(parseDailyLimit({ data: { remaining: 3, limit: 30 } })).toEqual({ remaining: 3, limit: 30 });
    expect(parseDailyLimit({ remaining: -2, limit: 50 })).toEqual({ remaining: 0, limit: 50 });
  });
  it('bozuk gövdede null (limit bilinmiyor)', () => {
    for (const bad of [null, undefined, {}, 'x', { remaining: '3', limit: 50 }, { remaining: 3 }, { remaining: NaN, limit: 5 }]) {
      expect(parseDailyLimit(bad)).toBeNull();
    }
  });
});

describe('viewDailyLimit', () => {
  it('bilinmiyorsa engellemez ve uyarı çıkarmaz', () => {
    expect(viewDailyLimit(null)).toEqual({
      limit: undefined,
      remaining: undefined,
      used: undefined,
      canSend: true,
      nearLimit: false,
    });
  });
  it('kullanılan = limit - kalan; eşik ve bitiş', () => {
    expect(viewDailyLimit({ remaining: 45, limit: 50 })).toMatchObject({ used: 5, canSend: true, nearLimit: false });
    expect(viewDailyLimit({ remaining: DAILY_LIMIT_WARN_THRESHOLD, limit: 50 })).toMatchObject({ nearLimit: true, canSend: true });
    expect(viewDailyLimit({ remaining: 0, limit: 50 })).toMatchObject({ used: 50, canSend: false, nearLimit: true });
  });
  it('limit katman tablosundan değil sunucudan: 30 -> 30', () => {
    expect(viewDailyLimit({ remaining: 30, limit: 30 }).limit).toBe(30);
  });
});

describe('viewDailyLimit — UTC gün bayatlığı', () => {
  const NOON = Date.UTC(2026, 9, 13, 12, 0, 0);
  const NEXT_DAY = Date.UTC(2026, 9, 14, 0, 5, 0);
  const exhausted = { remaining: 0, limit: 50 };

  it('bugün alınmış "hak bitti" kaydı kilitler', () => {
    expect(viewDailyLimit(exhausted, NOON, NOON + 60_000)).toMatchObject({ canSend: false, remaining: 0 });
  });
  it('dünden kalan "hak bitti" kaydı kilitlemez ve bilinmiyor sayılır (gece yarısı sıfırlanır)', () => {
    expect(viewDailyLimit(exhausted, NOON, NEXT_DAY)).toEqual({
      limit: undefined,
      remaining: undefined,
      used: undefined,
      canSend: true,
      nearLimit: false,
    });
  });
  it('canSend, gönderim öncesi denetimle (isCachedLimitExhausted) aynı kararı verir', () => {
    for (const now of [NOON + 1000, NEXT_DAY]) {
      expect(viewDailyLimit(exhausted, NOON, now).canSend).toBe(!isCachedLimitExhausted(exhausted, NOON, now));
    }
  });
  it('dataUpdatedAt verilmezse bayatlık uygulanmaz', () => {
    expect(viewDailyLimit(exhausted).canSend).toBe(false);
  });
});

describe('isCachedLimitExhausted', () => {
  const noon = Date.UTC(2026, 9, 13, 12, 0, 0);
  it('bugün alınmış "hak bitti" kaydı engeller', () => {
    expect(isCachedLimitExhausted({ remaining: 0, limit: 50 }, noon - 60_000, noon)).toBe(true);
  });
  it('dünden kalan kayıt engellemez (UTC gün dönümü)', () => {
    expect(isCachedLimitExhausted({ remaining: 0, limit: 50 }, noon - 24 * 3600_000, noon)).toBe(false);
  });
  it('hak varsa ya da kayıt yoksa engellemez', () => {
    expect(isCachedLimitExhausted({ remaining: 1, limit: 50 }, noon, noon)).toBe(false);
    expect(isCachedLimitExhausted(null, noon, noon)).toBe(false);
    expect(isCachedLimitExhausted(undefined, undefined, noon)).toBe(false);
  });
});
