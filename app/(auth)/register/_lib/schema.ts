import { z } from 'zod';
import { displayNameSchema, emailSchema, strongPasswordSchema, isAdult } from '@/utils/validation';

/** En geç seçilebilir doğum tarihi (bugün - 18 yıl) — 18+'ı seçici seviyesinde kısıtlar. */
export function maxBirthDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

/**
 * API `RegisterDto.username` ile birebir: küçük harf, rakam, nokta, alt çizgi;
 * baş/son karakter harf/rakam olmalı (baştaki/sondaki `.`/`_` geçersiz).
 * Bir kez belirlenince DEĞİŞTİRİLEMEZ — bkz. RegisterForm'daki uyarı.
 */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

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
