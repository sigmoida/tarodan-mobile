import { z } from 'zod';

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

export const loginSchema = z.object({
  email: z.string().email('Geçerli e-posta girin'),
  password: z.string().min(1, 'Şifre boş olamaz'),
  twoFactorCode: z
    .string()
    .trim()
    .regex(TWO_FACTOR_CODE_PATTERN, '6 haneli kod veya XXXX-XXXX yedek kod girin')
    .optional()
    .or(z.literal('')),
});

export type LoginForm = z.infer<typeof loginSchema>;
