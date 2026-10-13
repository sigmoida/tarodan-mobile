/**
 * Sunucu / axios hata gövdesinden kullanıcıya gösterilebilir TEK metin çıkarıcı.
 * (Web'in `apiErrorMessage`'ının mobil karşılığı; `errorText`, `formatApiErrorMessage`,
 * checkout `extractApiMessage` ve orders `joinMsg` bunun ince sarmalayıcılarıdır.)
 *
 * NestJS doğrulama hataları `message` alanını **dizi** olarak döndürür
 * (`["email must be an email", ...]`); diğer hatalar düz string döndürür.
 * Boş / yalnız-boşluk string anlamlı bir mesaj değildir — bir sonraki kaynağa,
 * en sonda fallback'e düşülür.
 */

type ApiErrorShape = {
  response?: { data?: { message?: unknown; error?: unknown; statusCode?: unknown } };
  message?: unknown;
};

function lineOf(m: unknown): string {
  if (typeof m === 'string') return m.trim();
  if (m && typeof m === 'object') {
    // class-validator `ValidationError`: { constraints: { isEmail: '...' } }
    const c = (m as { constraints?: unknown }).constraints;
    if (c && typeof c === 'object') {
      return Object.values(c as Record<string, unknown>)
        .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        .join(', ')
        .trim();
    }
    const msg = (m as { message?: unknown }).message;
    if (typeof msg === 'string') return msg.trim();
  }
  return '';
}

/**
 * Yanıt gövdesindeki mesaj satırları (boşlar atılmış). Hiçbiri yoksa `[]`.
 * Sıra: `message` (string | dizi) → `error` (string). Ağ hatası (`ax.message`)
 * ve `statusCode` BURADA yok — onlar `apiErrorMessage`'a özel.
 */
export function apiErrorLines(e: unknown): string[] {
  const data = (e as ApiErrorShape | null | undefined)?.response?.data;
  if (!data) return [];
  const { message, error } = data;
  const lines = (Array.isArray(message) ? message : [message]).map(lineOf).filter(Boolean);
  if (lines.length) return lines;
  if (typeof error === 'string' && error.trim()) return [error.trim()];
  return [];
}

/**
 * Tek hata metni.
 * - `mode: 'first'` (varsayılan; toast): dizi ise ilk eleman.
 * - `mode: 'all'` (alert / satır içi): satırlar `\n` ile birleşik.
 * Gövde yoksa: axios hatasında (ağ / zaman aşımı / boş gövde — "Network Error" gibi İngilizce
 * teknik metin) `fallback`; axios olmayan `Error`da (kodun kendi fırlattığı mesaj) `e.message`.
 * Gövde var ama mesaj yoksa ve `statusCode` sayıysa `"<fallback> (<kod>)"`; aksi halde `fallback`.
 */
export function apiErrorMessage(
  e: unknown,
  fallback: string,
  mode: 'first' | 'all' = 'first',
): string {
  const lines = apiErrorLines(e);
  if (lines.length) return mode === 'first' ? lines[0] : lines.join('\n');

  const ax = e as ApiErrorShape | null | undefined;
  const data = ax?.response?.data;
  if (!data) {
    const isAxios = !!(ax as { isAxiosError?: unknown } | null | undefined)?.isAxiosError;
    return !isAxios && typeof ax?.message === 'string' && ax.message ? ax.message : fallback;
  }
  if (typeof data.statusCode === 'number') return `${fallback} (${data.statusCode})`;
  return fallback;
}

/**
 * Eski ad (26 çağıran): `apiErrorMessage(e, fallback, 'all')`'ın SADECE gövde kısmı — satırlar `\n`
 * ile birleşir; ağ hatası `e.message`'ı ("Network Error") ve `statusCode` eki GÖSTERİLMEZ, doğrudan
 * `fallback` döner (hesap silme vb. ekranlar bunu kilitliyor: deleteAccountError.test).
 */
export function errorText(e: unknown, fallback: string): string {
  return apiErrorLines(e).join('\n') || fallback;
}
