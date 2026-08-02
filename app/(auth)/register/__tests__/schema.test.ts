/**
 * `username` alanı — API 2026-07-30'dan beri `RegisterDto`de zorunlu.
 * Kural: 3-30 karakter, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$`, girişte küçük harfe
 * çevrilir. Regex anlamı: baş/son karakter harf/rakam olmalı — ortada nokta/alt
 * çizgi serbest (bkz. task brief + `_lib/schema.ts`).
 */
import { registerSchema, usernameSchema } from '../_lib/schema';

const validRest = {
  displayName: 'Test Kullanıcı',
  email: 'test@demo.com',
  birthDate: '1990-01-01',
  password: 'Demo1234',
  confirmPassword: 'Demo1234',
  acceptTerms: true as const,
};

describe('usernameSchema', () => {
  it('2 karakter (3 sınırının altı) reddedilir', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false);
  });

  it('3 karakter (alt sınır) kabul edilir', () => {
    expect(usernameSchema.safeParse('abc').success).toBe(true);
  });

  it('30 karakter (üst sınır) kabul edilir', () => {
    expect(usernameSchema.safeParse('a'.repeat(30)).success).toBe(true);
  });

  it('31 karakter (üst sınırın üstü) reddedilir', () => {
    expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });

  it('baştaki nokta reddedilir (.abc)', () => {
    expect(usernameSchema.safeParse('.abc').success).toBe(false);
  });

  it('sondaki nokta reddedilir (abc.)', () => {
    expect(usernameSchema.safeParse('abc.').success).toBe(false);
  });

  it('baştaki alt çizgi reddedilir (_abc)', () => {
    expect(usernameSchema.safeParse('_abc').success).toBe(false);
  });

  it('sondaki alt çizgi reddedilir (abc_)', () => {
    expect(usernameSchema.safeParse('abc_').success).toBe(false);
  });

  it('ortada nokta VE alt çizgi kabul edilir (a.b_c)', () => {
    expect(usernameSchema.safeParse('a.b_c').success).toBe(true);
  });

  it('büyük harfli giriş küçük harfe çevrilerek kabul edilir (Gorkem → gorkem)', () => {
    const result = usernameSchema.safeParse('Gorkem');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('gorkem');
  });

  it('karışık büyük/küçük + ayraçlı giriş normalize edilir (Gorkem.Test → gorkem.test)', () => {
    const result = usernameSchema.safeParse('Gorkem.Test');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('gorkem.test');
  });

  it('geçersiz karakter (boşluk/@) reddedilir', () => {
    expect(usernameSchema.safeParse('gorkem test').success).toBe(false);
    expect(usernameSchema.safeParse('gorkem@test').success).toBe(false);
  });
});

describe('registerSchema — username entegrasyonu', () => {
  it('geçerli username ile birlikte tüm form geçerli olur', () => {
    const result = registerSchema.safeParse({ ...validRest, username: 'Gorkem.Test' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.username).toBe('gorkem.test');
  });

  it('geçersiz username tüm formu reddettirir', () => {
    const result = registerSchema.safeParse({ ...validRest, username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('username eksikse form reddedilir (API 400 parite — alan zorunlu)', () => {
    const { username: _drop, ...rest } = { ...validRest, username: 'gorkem' };
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
