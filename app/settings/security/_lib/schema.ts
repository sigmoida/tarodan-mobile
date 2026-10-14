// Güvenlik akışlarının zod şemaları (colocated, CLAUDE.md §7). Mesajlar şema kurulurken
// çözüldüğü için hepsi `t` alan fabrika — ekranlar `useMemo(() => …, [t])` ile kurar.
import type { TFunction } from 'i18next';
import { z } from 'zod';
import { strongPasswordSchema } from '@/utils/validation';
import { DEFAULT_COUNTRY_CODE, getPhoneInvalidMessage, parsePhoneForPayload } from '@/utils/phone';

/** Şifre değiştir (web `changePasswordSchema` + API kuralı). */
export const changePasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
      newPassword: strongPasswordSchema(t),
      confirmPassword: z.string().min(1, t('validation.repeatNewPassword')),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t('validation.passwordMatch'),
      path: ['confirmPassword'],
    });

export type ChangePasswordValues = z.input<ReturnType<typeof changePasswordSchema>>;

/** TOTP / SMS kodu: tam 6 rakam (web `enterSixDigits`). */
export const sixDigitCodeSchema = (t: TFunction) =>
  z.object({
    code: z.string().regex(/^\d{6}$/, t('profile.twoFactor.enterSixDigits')),
  });

/** Alan dönüşümü: yalnız rakam, en çok 6 hane (web `replace(/\D/g, '')` + `maxLength`). */
export const toSixDigits = (text: string) => text.replace(/\D/g, '').slice(0, 6);

/**
 * Doğrulanacak telefon. Çıktı E.164 (`+905…`); çözülemeyen numara gönderilmez ve alanın altında
 * paylaşılan geçersiz-numara metni görünür (`PhoneInput` blur uyarısıyla AYNI metin).
 */
export const phoneSchema = () =>
  z.object({
    phone: z.string().transform((v, ctx) => {
      const e164 = parsePhoneForPayload(v, DEFAULT_COUNTRY_CODE);
      if (!e164) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: getPhoneInvalidMessage() });
        return z.NEVER;
      }
      return e164;
    }),
  });
