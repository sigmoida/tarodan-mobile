import { z } from 'zod';
import type { TFunction } from 'i18next';
import {
  displayNameSchema,
  emailSchema,
  isAdult,
  strongPasswordSchema,
  usernameSchema,
} from '@/utils/validation';

/** En geç seçilebilir doğum tarihi (bugün - 18 yıl) — 18+'ı seçici seviyesinde kısıtlar. */
export function maxBirthDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

// `usernameSchema` / `USERNAME_PATTERN` tek kaynaktan gelir: `@/utils/validation`
// (§5). Bir kez belirlenince DEĞİŞTİRİLEMEZ — bkz. RegisterForm'daki uyarı.

/**
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */
export const buildRegisterSchema = (t: TFunction) =>
  z
    .object({
      username: usernameSchema(t),
      displayName: displayNameSchema(t),
      email: emailSchema(t),
      birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.birthDateRequired'))
        .refine(isAdult, t('validation.minAge18')),
      password: strongPasswordSchema(t),
      confirmPassword: z.string(),
      acceptTerms: z.boolean().refine((val) => val, t('validation.acceptTerms')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMatch'),
      path: ['confirmPassword'],
    });

export type RegisterForm = z.infer<ReturnType<typeof buildRegisterSchema>>;
