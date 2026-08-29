/**
 * Saf validasyon kuralları (B katmanı). Form/UI yok — şema doğrudan test edilir.
 * J41: şifre kuralları · J42: 18 yaş kuralı.
 */
import {
  
  strongPasswordSchema as _strongPasswordSchema,
  isAdult,
  displayNameSchema as _displayNameSchema,
  emailSchema as _emailSchema,
  usernameSchema as _usernameSchema,
  USERNAME_PATTERN,
  toHandle,
  requiredTrPhoneSchema as _requiredTrPhoneSchema,
  optionalTrPhoneSchema as _optionalTrPhoneSchema,
} from '../validation';
import { schemaT } from '@/test-utils';

// Şemalar artık `t`'yi argüman alan FABRİKALAR (gerekçe: `../validation` başı).
// Testler kuralları sınıyor, çeviriyi değil — bu yüzden hepsi gerçek katalogla
// bir kez kuruluyor ve gövdeler olduğu gibi kalıyor.
const strongPasswordSchema = _strongPasswordSchema(schemaT);
const requiredTrPhoneSchema = _requiredTrPhoneSchema(schemaT);
const optionalTrPhoneSchema = _optionalTrPhoneSchema(schemaT);
const emailSchema = _emailSchema(schemaT);
const usernameSchema = _usernameSchema(schemaT);
const displayNameSchema = _displayNameSchema(schemaT);
// PHONE_INVALID_MESSAGE kaldırıldı (React-dışı sabit → i18n çağrı-anı okuması);
// mesaj artık şemanın kendi `t('validation.invalidPhone')` çağrısından gelir.
const PHONE_INVALID_MESSAGE = schemaT('validation.invalidPhone');

describe('J41 · şifre kuralları (strongPasswordSchema)', () => {
  it('8 karakterden kısa reddedilir', () => {
    const r = strongPasswordSchema.safeParse('Ab1');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Şifre en az 8 karakter olmalıdır');
  });

  it('büyük harfsiz reddedilir', () => {
    const r = strongPasswordSchema.safeParse('demo1234');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('Büyük harf gerekli');
  });

  it('rakamsız reddedilir', () => {
    const r = strongPasswordSchema.safeParse('Demoabcd');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('Rakam gerekli');
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

/**
 * İkisi de `parseE164TrPhone` üzerine kurulu — kırpma YOK, çözülemeyen girdi
 * Türkçe mesajla reddedilir. Adları bilerek nitelikli: eskiden niteliksiz
 * `trPhoneSchema` **opsiyonel** olandı ve tek tüketicisi onu import ederken
 * yeniden adlandırmak zorunda kalıyordu.
 */
describe('TR telefon şemaları', () => {
  const VALID = ['0532 123 45 67', '+90 532 123 45 67', '532 123 45 67', '(0532) 123-45-67'];
  // Hepsi eskiden sessizce kırpılıp geçerli görünen bir E.164'e dönüştürülüyordu.
  const INVALID = ['00905321234567', '+1 415 555 0100', '05321234567890', '0432 123 45 67', '532 123 45 6'];

  it.each(VALID)('zorunlu şema %s girdisini E.164 yapar', (input) => {
    const r = requiredTrPhoneSchema.safeParse(input);
    expect(r.success && r.data).toBe('+905321234567');
  });

  it.each(INVALID)('zorunlu şema %s girdisini REDDEDER (kırpmaz)', (input) => {
    const r = requiredTrPhoneSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(PHONE_INVALID_MESSAGE);
  });

  it('zorunlu şema boş girdiyi Türkçe mesajla reddeder', () => {
    const r = requiredTrPhoneSchema.safeParse('');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Telefon numarası gerekli');
  });

  it('opsiyonel şema boş/atlanmış girdiyi undefined yapar', () => {
    expect(optionalTrPhoneSchema.safeParse('')).toMatchObject({ success: true, data: undefined });
    expect(optionalTrPhoneSchema.safeParse(undefined)).toMatchObject({ success: true, data: undefined });
  });

  it('opsiyonel şema DOLU ama çözülemeyen girdiyi sessizce düşürmez', () => {
    const r = optionalTrPhoneSchema.safeParse('00905321234567');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(PHONE_INVALID_MESSAGE);
  });

  it('opsiyonel şema geçerli girdiyi de E.164 yapar', () => {
    expect(optionalTrPhoneSchema.safeParse('0532 123 45 67')).toMatchObject({ data: '+905321234567' });
  });
});
