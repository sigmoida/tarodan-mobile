import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * Şifre minimum kuralı web ile aynı: 8+ karakter, küçük + büyük harf + rakam.
 * Login için sadece "boş değil" kontrolü yapıyoruz — eski şifreyle de giriş yapılabilsin
 * (zayıf şifre uyarısı oturum açtıktan sonra gösterilir). Web pattern'i.
 */
/**
 * 2FA kodu: 6 haneli TOTP **veya** `XXXX-XXXX` biçiminde tek kullanımlık yedek kod.
 * Alan yalnız sunucu `requires2FA: true` dediğinde gösterilir; o yüzden opsiyonel.
 */
export const TWO_FACTOR_CODE_PATTERN = /^(?:\d{6}|[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4})$/;

/**
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */
export const buildLoginSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t('auth.emailInvalidShort')),
    password: z.string().min(1, t('auth.passwordRequired')),
    twoFactorCode: z
      .string()
      .trim()
      .regex(TWO_FACTOR_CODE_PATTERN, t('auth.twoFactorCodeInvalid'))
      .optional()
      .or(z.literal('')),
  });

export type LoginForm = z.infer<ReturnType<typeof buildLoginSchema>>;
