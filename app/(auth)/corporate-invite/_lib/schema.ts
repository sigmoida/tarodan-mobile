import { z } from 'zod';
import { usernameSchema } from '@/utils/validation';

/**
 * Kullanıcı adı kuralı tek kaynaktan gelir: `@/utils/validation` (§5) — küçük
 * harf, boşluksuz, 3-30, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` ve **bir kez
 * belirlenince değiştirilemez**. Şifre kuralı burada kalıyor çünkü kurumsal uç
 * ayrıca 72 karakter üst sınırı dayatıyor (`strongPasswordSchema`'da yok).
 */
export const corporateInviteSchema = z
  .object({
    username: usernameSchema,
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
