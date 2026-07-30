import { z } from 'zod';

/**
 * Kullanıcı adı web ile birebir: küçük harf, boşluksuz, 3-30,
 * `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` ve **bir kez belirlenince değiştirilemez**.
 * Şifre kuralı her yerde aynı: min 8 + küçük + büyük + rakam (backend max 72).
 */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

export const corporateInviteSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'En az 3 karakter')
      .max(30, 'En fazla 30 karakter')
      .regex(USERNAME_PATTERN, 'Yalnız küçük harf, rakam, nokta ve alt çizgi kullanın'),
    password: z
      .string()
      .min(8, 'En az 8 karakter')
      .max(72, 'En fazla 72 karakter')
      .regex(/[a-z]/, 'En az bir küçük harf içermeli')
      .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
      .regex(/[0-9]/, 'En az bir rakam içermeli'),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Şifreler eşleşmiyor',
  });

export type CorporateInviteForm = z.infer<typeof corporateInviteSchema>;
