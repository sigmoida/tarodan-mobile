/**
 * Web `apps/web/src/app/register/page.tsx` paritesinde Zod helper'ları.
 * Şifre kuralı: 8+ karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam.
 *
 * Mobile'daki bütün form ekranları (register, register-business, reset-password,
 * settings/security'deki şifre değiştirme) bu yardımcıları kullanır ki kurallar
 * tek noktadan değişebilsin ve web ile birebir aynı kalsın.
 */

import { z } from 'zod';
import { PHONE_INVALID_MESSAGE, parseE164TrPhone } from './phone';

/** Tek noktada güçlü şifre Zod schema'sı. */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı')
  .regex(/[A-Z]/, 'En az 1 büyük harf içermeli')
  .regex(/[a-z]/, 'En az 1 küçük harf içermeli')
  .regex(/\d/, 'En az 1 rakam içermeli');

/**
 * TR cep telefonu — **zorunlu**. Çıktı E.164 (`+905XXXXXXXXX`), çözülemeyen
 * girdi Türkçe hatayla reddedilir (KIRPMA YOK — bkz. `@/utils/phone`).
 *
 * TEK KAYNAK: ayrıştırma `parseE164TrPhone`'da, alan formatlayıcısı
 * (`formatTrPhoneField`) da aynı ön-ek soyma kuralını kullanır; ikisi ayrışamaz.
 */
export const requiredTrPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Telefon numarası gerekli')
  .transform((v, ctx) => {
    const e164 = parseE164TrPhone(v);
    if (!e164) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_INVALID_MESSAGE });
      return z.NEVER;
    }
    return e164;
  });

/**
 * TR cep telefonu — **opsiyonel**. Boş/atlanmış → `undefined`; dolu ama
 * çözülemiyorsa hata (sessizce düşürülmez).
 *
 * ⚠️ Eski hâli ölü bir export'tu ve regex'i `0532 123 45 67`'yi bile reddediyordu;
 * paylaşılan ayrıştırıcıyla değiştirildi ve gerçek tüketicilere (kurumsal kayıt
 * şeması) bağlandı.
 */
export const optionalTrPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const e164 = parseE164TrPhone(v);
    if (!e164) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_INVALID_MESSAGE });
      return z.NEVER;
    }
    return e164;
  });

/** Vergi numarası (10) veya T.C. Kimlik (11) — yalnızca rakam. */
export const taxIdSchema = z
  .string()
  .trim()
  .regex(/^\d{10,11}$/, 'Vergi / T.C. kimlik 10 veya 11 hane olmalı');

/** Email: hem .email() hem trim — basit. */
export const emailSchema = z.string().trim().email('Geçerli bir e-posta girin');

/**
 * API `RegisterDto.username` ile birebir: küçük harf, rakam, nokta, alt çizgi;
 * baş/son karakter harf/rakam olmalı (baştaki/sondaki `.`/`_` geçersiz).
 *
 * TEK KAYNAK — kayıt (`app/(auth)/register`), kurumsal davet
 * (`app/(auth)/corporate-invite`) ve kullanıcı adı talebi
 * (`app/settings/username`) ekranlarının üçü de buradan alır. Daha önce üç ayrı
 * kopya vardı ve davranışları sessizce ayrışmıştı (biri `Gorkem`'i kabul edip
 * dönüştürüyor, biri reddediyordu).
 */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

/**
 * Kullanıcı adı alanının görüntü dönüşümü — bugün yalnız küçük harfe çevirir.
 * TEK KAYNAK: register (`RegisterForm.tsx`), kurumsal davet
 * (`corporate-invite/index.tsx`) ve kullanıcı adı talebi
 * (`settings/username/index.tsx`) ekranlarının üçü de buradan alır (önceden
 * üç ayrı `(t) => t.toLowerCase()` kopyası vardı, §5).
 *
 * ⚠️ Bilinçli olarak transliterasyon YAPMAZ (`ı→i`, `ş→s`, `ğ→g` gibi bir eşleme
 * yok) — kullanıcının adını sessizce başka bir kalıcı handle'a çevirmek ürün
 * kararı gerektirir. İleride böyle bir karar verilirse tek yerden uygulanır.
 */
export const toHandle = (t: string) => t.toLowerCase();

/**
 * Kullanıcı adı — 3-30, `USERNAME_PATTERN`.
 *
 * ⚠️ `.toLowerCase()` regex'ten ÖNCE koşar (Zod check'leri bildirim sırasıyla
 * çalışır), yani `Gorkem` şema seviyesinde sessizce `gorkem`'e döner. Bu bilinçli
 * bir EMNİYET KEMERİ: üç ekran da girdiyi zaten alanda küçük harfe çeviriyor
 * (kullanıcı kaydolacağı handle'ı görür ve uygunluk kontrolünden geçirir), şema
 * yalnız kaçakları yakalar. Kullanıcı adı bir kez belirlenince DEĞİŞTİRİLEMEZ,
 * bu yüzden sessiz dönüşüm alan seviyesinde önlenir.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'En az 3 karakter olmalı')
  .max(30, 'En fazla 30 karakter olabilir')
  .regex(
    USERNAME_PATTERN,
    'Yalnız küçük harf, rakam, nokta ve alt çizgi kullanın; başta/sonda nokta veya alt çizgi olamaz',
  );

/** Display name (web ile aynı: 2-30 char). */
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Ad en az 2 karakter olmalı')
  .max(30, 'Ad en fazla 30 karakter olabilir');

/** Şartları kabul (zorunlu boolean). */
export const acceptTermsSchema = z
  .boolean()
  .refine((val) => val === true, 'Sözleşmeleri kabul etmelisiniz');

/** "YYYY-MM-DD" doğum tarihi 18 yaş ve üstü mü? Geçersiz tarih → false. */
export function isAdult(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 18;
}
