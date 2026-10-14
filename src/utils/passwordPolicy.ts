/**
 * Şifre kuralı — TEK KAYNAK. Sunucu/web ile birebir (`tarodan-app`
 * `packages/types/src/password-policy.ts`): en az 8, EN ÇOK 72 karakter; ≥1 büyük harf \p{Lu},
 * ≥1 küçük harf \p{Ll}, ≥1 rakam \d (`u` bayrağı) — Türkçe harfler (Ş, ğ, İ…) büyük/küçük harf
 * sayılır. Özel karakter şartı yok, diğer karakterler serbest.
 *
 * Kayıt, kurumsal davet, şifre sıfırlama ve şifre değiştirme bunu kullanır; kuralı başka yerde
 * yeniden yazma.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_UPPERCASE_RE = /\p{Lu}/u;
export const PASSWORD_LOWERCASE_RE = /\p{Ll}/u;
export const PASSWORD_NUMBER_RE = /\d/u;

export function passwordChecks(password: string) {
  return {
    hasMinLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: PASSWORD_UPPERCASE_RE.test(password),
    hasLowercase: PASSWORD_LOWERCASE_RE.test(password),
    hasNumber: PASSWORD_NUMBER_RE.test(password),
  };
}

export type PasswordRuleKey = 'min' | 'max' | 'uppercase' | 'lowercase' | 'number';

/** İlk ihlal edilen kural (yoksa null) — sıra: min, max, büyük, küçük, rakam. */
export function firstPasswordViolation(password: string): PasswordRuleKey | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'min';
  if (password.length > PASSWORD_MAX_LENGTH) return 'max';
  if (!PASSWORD_UPPERCASE_RE.test(password)) return 'uppercase';
  if (!PASSWORD_LOWERCASE_RE.test(password)) return 'lowercase';
  if (!PASSWORD_NUMBER_RE.test(password)) return 'number';
  return null;
}
