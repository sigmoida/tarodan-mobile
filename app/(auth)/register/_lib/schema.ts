import { z } from 'zod';
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

export const registerSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    email: emailSchema,
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Lütfen doğum tarihinizi seçin')
      .refine(isAdult, 'Kayıt için en az 18 yaşında olmalısınız'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val, 'Kullanım koşullarını kabul etmelisiniz'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export type RegisterForm = z.infer<typeof registerSchema>;
