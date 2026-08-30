/**
 * Web `apps/web/src/app/register/page.tsx` paritesinde Zod helper'ları.
 * Şifre kuralı: 8+ karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam.
 *
 * Mobile'daki bütün form ekranları (register, register-business, reset-password,
 * settings/security'deki şifre değiştirme) bu yardımcıları kullanır ki kurallar
 * tek noktadan değişebilsin ve web ile birebir aynı kalsın.
 */

import { z } from 'zod';
import type { TFunction } from 'i18next';
import { parseE164TrPhone } from './phone';

/**
 * ## Neden şemalar FABRİKA
 *
 * Zod mesajları şema KURULURKEN çözülür. Modül seviyesinde bir `z.string()
 * .email('Geçerli bir e-posta girin')` ilk import anında donuyor: i18next daha
 * hazır olmayabiliyor ve hazır olsa bile kullanıcı dili değiştirdiğinde mesaj
 * ilk dilde kalıyordu. Bu yüzden her şema çevirmeni argüman alan bir fonksiyon;
 * çağıran taraf `useMemo(() => …, [t])` ile dil değişiminde yeniden kuruyor.
 *
 * Mesajlar `validation.*` kataloğundan gelir — üç kayıt ekranı, kurumsal davet
 * ve kullanıcı adı talebi aynı metinleri paylaşır (§5).
 */

/** Tek noktada güçlü şifre Zod schema'sı. */
export const strongPasswordSchema = (t: TFunction) =>
  z
    .string()
    .min(8, t('validation.passwordMin8'))
    .regex(/[A-Z]/, t('validation.passwordUppercase'))
    .regex(/[a-z]/, t('validation.passwordLowercase'))
    .regex(/\d/, t('validation.passwordNumber'));

/**
 * TR cep telefonu — **zorunlu**. Çıktı E.164 (`+905XXXXXXXXX`), çözülemeyen
 * girdi Türkçe hatayla reddedilir (KIRPMA YOK — bkz. `@/utils/phone`).
 *
 * TEK KAYNAK: ayrıştırma `parseE164TrPhone`'da, alan formatlayıcısı
 * (`formatTrPhoneField`) da aynı ön-ek soyma kuralını kullanır; ikisi ayrışamaz.
 */
export const requiredTrPhoneSchema = (t: TFunction) =>
  z
  .string()
  .trim()
  .min(1, t('validation.phoneRequired'))
  .transform((v, ctx) => {
    const e164 = parseE164TrPhone(v);
    if (!e164) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.invalidPhone') });
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
export const optionalTrPhoneSchema = (t: TFunction) =>
  z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const e164 = parseE164TrPhone(v);
    if (!e164) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.invalidPhone') });
      return z.NEVER;
    }
    return e164;
  });

/** Vergi numarası (10) veya T.C. Kimlik (11) — yalnızca rakam. */
export const taxIdSchema = (t: TFunction) =>
  z.string().trim().regex(/^\d{10,11}$/, t('validation.taxId'));

/** Email: hem .email() hem trim — basit. */
export const emailSchema = (t: TFunction) =>
  z.string().trim().email(t('validation.invalidEmail'));

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
export const usernameSchema = (t: TFunction) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .min(3, t('validation.minLength', { min: 3 }))
    .max(30, t('validation.maxLength', { max: 30 }))
    .regex(USERNAME_PATTERN, t('validation.usernamePattern'));

/** Display name (web ile aynı: 2-30 char). */
export const displayNameSchema = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(2, t('validation.displayNameMin'))
    .max(30, t('validation.displayNameMax'));

/** Şartları kabul (zorunlu boolean). */
export const acceptTermsSchema = (t: TFunction) =>
  z.boolean().refine((val) => val === true, t('validation.acceptTerms'));

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
