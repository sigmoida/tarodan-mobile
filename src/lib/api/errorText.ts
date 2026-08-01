/**
 * Sunucu hata mesajını kullanıcıya gösterilebilir tek bir string'e çevirir.
 * NestJS doğrulama hataları `message` alanını **dizi** olarak döndürür
 * (`["email must be an email", ...]`), diğer hatalar düz string döndürür.
 * Boş string de anlamlı bir mesaj değildir — fallback'e düşer.
 */
export function errorText(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  if (Array.isArray(m)) {
    const joined = m.filter(Boolean).join('\n');
    return joined || fallback;
  }
  return m || fallback;
}
