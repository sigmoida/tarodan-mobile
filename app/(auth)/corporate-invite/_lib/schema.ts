import { z } from 'zod';
import type { TFunction } from 'i18next';
import { usernameSchema } from '@/utils/validation';
import { passwordSchema, refinePasswordMatch } from '@/utils/passwordPolicy';

/**
 * Kullanıcı adı kuralı tek kaynaktan gelir: `@/utils/validation` (§5) — küçük
 * harf, boşluksuz, 3-30, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` ve **bir kez
 * belirlenince değiştirilemez**. Şifre kuralı da tek kaynaktan (`passwordSchema`, 8-72).
 *
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */
export const buildCorporateInviteSchema = (t: TFunction) =>
  z
    .object({
      username: usernameSchema(t),
      password: passwordSchema(t),
      passwordConfirm: z.string(),
    })
    .superRefine(refinePasswordMatch(t, 'password', 'passwordConfirm'));

export type CorporateInviteForm = z.infer<ReturnType<typeof buildCorporateInviteSchema>>;
