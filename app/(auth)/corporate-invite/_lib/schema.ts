import { z } from 'zod';
import type { TFunction } from 'i18next';
import { usernameSchema } from '@/utils/validation';

/**
 * Kullanıcı adı kuralı tek kaynaktan gelir: `@/utils/validation` (§5) — küçük
 * harf, boşluksuz, 3-30, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` ve **bir kez
 * belirlenince değiştirilemez**. Şifre kuralı burada kalıyor çünkü kurumsal uç
 * ayrıca 72 karakter üst sınırı dayatıyor (`strongPasswordSchema`'da yok).
 *
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */
export const buildCorporateInviteSchema = (t: TFunction) =>
  z
    .object({
      username: usernameSchema(t),
      password: z
        .string()
        .min(8, t('validation.passwordMin8'))
        .max(72, t('validation.passwordMax72'))
        .regex(/[a-z]/, t('validation.passwordLowercase'))
        .regex(/[A-Z]/, t('validation.passwordUppercase'))
        .regex(/[0-9]/, t('validation.passwordNumber')),
      passwordConfirm: z.string(),
    })
    .refine((v) => v.password === v.passwordConfirm, {
      path: ['passwordConfirm'],
      message: t('validation.passwordMatch'),
    });

export type CorporateInviteForm = z.infer<ReturnType<typeof buildCorporateInviteSchema>>;
