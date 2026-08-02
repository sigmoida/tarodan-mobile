/**
 * Saf validasyon kuralları (B katmanı). Form/UI yok — şema doğrudan test edilir.
 * J41: şifre kuralları · J42: 18 yaş kuralı.
 */
import {
  strongPasswordSchema,
  isAdult,
  displayNameSchema,
  emailSchema,
  usernameSchema,
  USERNAME_PATTERN,
  toHandle,
} from '../validation';

describe('J41 · şifre kuralları (strongPasswordSchema)', () => {
  it('8 karakterden kısa reddedilir', () => {
    const r = strongPasswordSchema.safeParse('Ab1');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Şifre en az 8 karakter olmalı');
  });

  it('büyük harfsiz reddedilir', () => {
    const r = strongPasswordSchema.safeParse('demo1234');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('En az 1 büyük harf içermeli');
  });

  it('rakamsız reddedilir', () => {
    const r = strongPasswordSchema.safeParse('Demoabcd');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('En az 1 rakam içermeli');
  });

  it('güçlü şifre kabul edilir', () => {
    expect(strongPasswordSchema.safeParse('Demo1234').success).toBe(true);
  });
});

describe('J42 · 18 yaş kuralı (isAdult)', () => {
  it('18 yaşından küçük doğum tarihi false', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 17);
    expect(isAdult(d.toISOString().slice(0, 10))).toBe(false);
  });

  it('18 yaş ve üstü true', () => {
    expect(isAdult('1990-01-01')).toBe(true);
  });

  it('geçersiz tarih false', () => {
    expect(isAdult('not-a-date')).toBe(false);
  });
});

/**
 * `usernameSchema` — kayıt, kurumsal davet ve kullanıcı adı talebi ekranlarının
 * ORTAK kuralı (§5). Sınır testleri register route'undan buraya taşındı; üç
 * ekranın da davranışı bu tek şemadan türüyor.
 */
describe('usernameSchema (üç ekranın tek kaynağı)', () => {
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

  it('USERNAME_PATTERN tire kabul etmez (Maestro damgaları için kritik)', () => {
    expect(USERNAME_PATTERN.test('maestro-j1-123')).toBe(false);
    expect(USERNAME_PATTERN.test('maestroj1123')).toBe(true);
  });
});

/**
 * `toHandle` — register/corporate-invite/settings-username ekranlarının üçünün
 * de kullandığı ortak alan-dönüşümü (§5, önceden 3 kopya `(t) => t.toLowerCase()`).
 * Bilinçli olarak transliterasyon YAPMAZ — yalnız küçük harfe çevirir.
 */
describe('toHandle (üç ekranın ortak alan dönüşümü)', () => {
  it('küçük harfe çevirir', () => {
    expect(toHandle('Gorkem')).toBe('gorkem');
  });

  it('zaten küçükse değiştirmez', () => {
    expect(toHandle('gorkem')).toBe('gorkem');
  });

  it('transliterasyon yapmaz — Türkçe karakterler JS toLowerCase davranışıyla aynen kalır', () => {
    // 'İ'.toLowerCase() → 'i' + BİRLEŞİK NOKTA (U+0307) — bilinçli olarak
    // "düzeltilmiyor" (bkz. validation.ts docstring).
    expect(toHandle('İpek')).toBe('İpek'.toLowerCase());
    expect(toHandle('İpek')).not.toBe('ipek');
  });
});

describe('yardımcı şemalar', () => {
  it('2 karakterden kısa ad reddedilir', () => {
    expect(displayNameSchema.safeParse('A').success).toBe(false);
  });
  it('geçersiz email reddedilir', () => {
    expect(emailSchema.safeParse('bad').success).toBe(false);
  });
});
