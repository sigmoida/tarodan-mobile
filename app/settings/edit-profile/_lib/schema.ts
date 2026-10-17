import { z } from 'zod';
import type { TFunction } from 'i18next';

import { getPhoneInvalidMessage } from '@/utils/phone';
import { usernameSchema } from '@/utils/validation';

export const MAX_BIO_LENGTH = 500; // Backend DTO (UpdateProfileDto) bio'yu 500 ile sınırlar — web ile aynı.

// 18+ kontrolü (web ile parite): doğum tarihi en geç bugünden 18 yıl önce olmalı.
export const minBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

/**
 * Zod mesajları şema KURULURKEN çözülür — bu yüzden fabrika `t` argümanı alır
 * (bkz. `@/utils/validation` başı). Çağıran taraf `useMemo(() => …, [t, …])`
 * ile dil değişiminde yeniden kurar.
 */
export const buildProfileSchema = (t: TFunction, isBusinessTier: boolean) =>
  z.object({
    displayName: z.string().min(2, t('validation.displayNameMin')).max(50),
    bio: z
      .string()
      .max(MAX_BIO_LENGTH, t('validation.bioMaxLength', { max: MAX_BIO_LENGTH }))
      .optional()
      .or(z.literal('')),
    // Sınır Türkçe mesaja bağlı: formatlayıcı fazla haneyi KIRPMAYI bıraktığı için
    // (bkz. `@/utils/phone`) ham metin artık alanda kalabiliyor ve bu `max` gerçekten
    // ulaşılabilir hâle geldi. Çıplak `max(20)` zod'un İngilizce iç mesajını
    // ("String must contain at most 20 character(s)") kullanıcıya gösteriyordu —
    // üstelik zod resolver'ı `onSubmit`'teki Türkçe kapıdan önce koştuğu için o kapı
    // hiç çalışmıyordu.
    //
    // Sınır hiçbir geçerli girdiyi reddedemez: alan ülke kodunu ayrı bir `Select`'te
    // tuttuğu için formatlanmış TR değeri 13 karakter (`532 123 45 67`), TR dışında
    // yalnız rakam. Yani `max` burada bir emniyet kemeri; asıl reddi `parseE164TrPhone`
    // ve `onSubmit` kapısı veriyor.
    phone: z.string().max(20, getPhoneInvalidMessage()).optional().or(z.literal('')),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.birthDateInvalid'))
      .refine((val) => new Date(val) <= minBirthDate(), t('validation.mustBeAdult'))
      .optional()
      .or(z.literal('')),
    // Kurumsal (business tier) — web ile parite. Business ise firma adı zorunlu.
    companyName: isBusinessTier
      ? z.string().min(2, t('validation.companyNameRequired')).max(120)
      : z.string().max(120).optional().or(z.literal('')),
    taxId: z.string().max(20).optional().or(z.literal('')),
    taxOffice: z.string().max(120).optional().or(z.literal('')),
  });

export type ProfileForm = {
  displayName: string;
  bio?: string;
  phone?: string;
  birthDate?: string;
  companyName?: string;
  taxId?: string;
  taxOffice?: string;
};

// ── Kullanıcı adı belirleme (bölüm içi form) ────────────────────────────────
// Kural tek kaynaktan gelir: `@/utils/validation` (CLAUDE.md › Principles). Bu dosya yalnız formun
// alan şeklini (`{ username }`) tanımlar.
export const buildClaimUsernameSchema = (t: TFunction) =>
  z.object({ username: usernameSchema(t) });

// ── E-posta değiştirme (bölüm içi iki adım) ─────────────────────────────────
export const buildEmailChangeSchema = (t: TFunction) =>
  z.object({
    newEmail: z
      .string()
      .trim()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.invalidEmail')),
  });

export const buildEmailCodeSchema = (t: TFunction) =>
  z.object({
    code: z.string().trim().regex(/^\d{6}$/, t('validation.sixDigitCode')),
  });
