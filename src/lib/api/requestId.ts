/**
 * Sunucu her yanıtta `x-request-id` (UUID) döndürüyor — canlı doğrulandı
 * (staging, 2026-08-03). Destek bir kullanıcı hatasını sunucu log'uyla ancak bu
 * kimlik üzerinden eşleştirebiliyor, bu yüzden hata yollarında Sentry'ye taşınır.
 *
 * ⚠️ Bu modül **PII taşımaz**: istek gövdesi, başlıklar ve sunucu mesaj metni
 * bilerek dışarıda bırakıldı (`src/services/sentry.ts`'te `beforeSend`/scrub
 * yok — payload'ı buradan sızdırırsak Sentry'ye telefon/adres gider).
 */

/** Hata gövdesinin ayırt edici alanları — API'de tek tip alan yok, üçü bir arada. */
export interface ErrorFingerprint {
  requestId?: string;
  status?: number;
  method?: string;
  url?: string;
  /** Servis/guard `HttpException`'larında bulunur. */
  i18nKey?: string;
  /** Yalnız ban guard'ında bulunur. */
  errorCode?: string;
}

type LooseError = {
  response?: { status?: number; headers?: Record<string, unknown>; data?: Record<string, unknown> };
  config?: { method?: string; url?: string };
};

/** `x-request-id` başlığı — axios başlıkları normalde küçük harfli, yine de tolere et. */
export function requestIdOf(error: unknown): string | undefined {
  const headers = (error as LooseError | null)?.response?.headers;
  if (!headers || typeof headers !== 'object') return undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'x-request-id' && typeof value === 'string' && value) {
      return value;
    }
  }
  return undefined;
}

/**
 * Sentry etiketlerine/`__DEV__` log'una konulabilecek, PII içermeyen özet.
 * Alanlar yalnız varsa eklenir ki Sentry'de boş anahtar birikmesin.
 */
export function errorFingerprint(error: unknown): ErrorFingerprint {
  const e = (error ?? {}) as LooseError;
  const data = e.response?.data;
  const fingerprint: ErrorFingerprint = {};

  const requestId = requestIdOf(error);
  if (requestId) fingerprint.requestId = requestId;
  if (typeof e.response?.status === 'number') fingerprint.status = e.response.status;
  if (typeof e.config?.method === 'string') fingerprint.method = e.config.method.toUpperCase();
  if (typeof e.config?.url === 'string') fingerprint.url = e.config.url;
  if (data && typeof data.i18nKey === 'string') fingerprint.i18nKey = data.i18nKey;
  if (data && typeof data.errorCode === 'string') fingerprint.errorCode = data.errorCode;

  return fingerprint;
}
