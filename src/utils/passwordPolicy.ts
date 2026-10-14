/**
 * Şifre kuralı — TEK KAYNAK. Sunucu/web ile birebir (`tarodan-app`
 * `packages/types/src/password-policy.ts`): en az 8, EN ÇOK 72 karakter; ≥1 büyük harf \p{Lu},
 * ≥1 küçük harf \p{Ll}, ≥1 rakam \d (`u` bayrağı) — Türkçe harfler (Ş, ğ, İ…) büyük/küçük harf
 * sayılır. Özel karakter şartı yok, diğer karakterler serbest.
 *
 * Kayıt, kurumsal davet, şifre sıfırlama ve şifre değiştirme bunu kullanır; kuralı başka yerde
 * yeniden yazma.
 *
 * Ayrı "gereksinimler" kartı yok: alanın altında yazarken ANLIK yalnız eksik kurallar
 * (`passwordHint` → Input `helperText`); gönderimde aynı metin zod hatası olur (`passwordSchema`).
 */
import type { TFunction } from 'i18next';
import { z } from 'zod';

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
  return missingPasswordRules(password)[0]?.id ?? null;
}

export interface PasswordRule {
  id: PasswordRuleKey;
  /** Eksikken alanın altında gösterilen metin ("En az 1 rakam ekleyin"). */
  label: (t: TFunction) => string;
  test: (password: string) => boolean;
}

/** Kural listesi (sıra = gösterim sırası): id + i18n etiket + test. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'min',
    label: (t) => t('auth.pwHintMinLength', { min: PASSWORD_MIN_LENGTH }),
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'max',
    label: (t) => t('validation.maxLength', { max: PASSWORD_MAX_LENGTH }),
    test: (pw) => pw.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'uppercase', label: (t) => t('auth.pwHintUppercase'), test: (pw) => PASSWORD_UPPERCASE_RE.test(pw) },
  { id: 'lowercase', label: (t) => t('auth.pwHintLowercase'), test: (pw) => PASSWORD_LOWERCASE_RE.test(pw) },
  { id: 'number', label: (t) => t('auth.pwHintNumber'), test: (pw) => PASSWORD_NUMBER_RE.test(pw) },
];

/** Sağlanmayan kurallar (liste sırasıyla). */
export const missingPasswordRules = (password: string): PasswordRule[] =>
  PASSWORD_RULES.filter((rule) => !rule.test(password));

/** Eksik kuralların metni, her biri ayrı satırda; hepsi sağlanınca `undefined`. */
export function missingPasswordMessage(password: string, t: TFunction): string | undefined {
  const missing = missingPasswordRules(password);
  return missing.length ? missing.map((rule) => rule.label(t)).join('\n') : undefined;
}

/**
 * Yazarken alanın altındaki anlık ipucu (Input `helperText`). Alan boşken sessiz
 * (kullanıcı yazmaya başlamadan uyarı yok); yazdıkça yalnız eksik kurallar.
 */
export const passwordHint = (password: string | undefined, t: TFunction): string | undefined =>
  password ? missingPasswordMessage(password, t) : undefined;

/**
 * Zod şeması: boş → "Şifre gerekli"; aksi halde eksik kuralların TEK mesajı (alanın altında
 * yazarkenki ipucuyla aynı metin).
 */
export const passwordSchema = (t: TFunction) =>
  z.string().superRefine((password, ctx) => {
    if (!password) {
      ctx.addIssue({ code: 'custom', message: t('validation.passwordRequired') });
      return;
    }
    const missing = missingPasswordMessage(password, t);
    if (missing) ctx.addIssue({ code: 'custom', message: missing });
  });

/** Şifre tekrarı (obje `superRefine`): eşleşmeyince tekrar alanına `validation.passwordMatch`. */
export const refinePasswordMatch =
  (t: TFunction, password: string, confirm: string) =>
  (values: Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (values[confirm] !== values[password]) {
      ctx.addIssue({ code: 'custom', path: [confirm], message: t('validation.passwordMatch') });
    }
  };
