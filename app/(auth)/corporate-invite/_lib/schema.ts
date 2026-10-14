import { z } from 'zod';
import type { TFunction } from 'i18next';
import { strongPasswordSchema, usernameSchema } from '@/utils/validation';

/**
 * Kullanıcı adı kuralı tek kaynaktan gelir: `@/utils/validation` (§5) — küçük
 * harf, boşluksuz, 3-30, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` ve **bir kez
 * belirlenince değiştirilemez**. Şifre kuralı da tek kaynaktan
 * (`strongPasswordSchema` → `@/utils/passwordPolicy`, 8-72 karakter).
 *
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */
export const buildCorporateInviteSchema = (t: TFunction) =>
  z
    .object({
      username: usernameSchema(t),
      password: strongPasswordSchema(t),
      passwordConfirm: z.string(),
    })
    .refine((v) => v.password === v.passwordConfirm, {
      path: ['passwordConfirm'],
      message: t('validation.passwordMatch'),
    });

export type CorporateInviteForm = z.infer<ReturnType<typeof buildCorporateInviteSchema>>;
