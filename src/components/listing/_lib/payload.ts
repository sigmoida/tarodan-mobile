import type { ListingFormValues } from './schema';

/**
 * Renk ve kutu durumu — web ile aynı sözleşme: katalog renkleri `colors` slug
 * listesi, kutu durumu boolean. Sunucu ikisini de 2026-07-29'dan beri
 * (`0096579da`) zorunlu tutuyor.
 *
 * Seçim yoksa alan HİÇ konmaz: düzenlemede sunucudaki değer korunur; oluşturmada
 * `validate()` zaten boş seçimi göndermeden önce reddeder.
 */
export function buildColorAndBoxPayload(
  v: Pick<ListingFormValues, 'colors' | 'isBoxed'>,
): { colors?: string[]; isBoxed?: boolean } {
  return {
    ...(v.colors.length > 0 ? { colors: v.colors } : {}),
    ...(v.isBoxed ? { isBoxed: v.isBoxed === 'boxed' } : {}),
  };
}

/**
 * Sunucu hata gövdesinden kullanıcıya gösterilecek metin. NestJS doğrulama
 * hataları `message`'ı LİSTE olarak döndürür; eskiden liste gelince yalnız
 * "İşlem başarısız" gösteriliyor ve asıl sebep kayboluyordu.
 */
export function serverErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown; error?: unknown } } })?.response?.data;
  const message = data?.message;
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message)) {
    const first = message.find((m): m is string => typeof m === 'string' && m.length > 0);
    if (first) return first;
    return fallback;
  }
  if (typeof data?.error === 'string' && data.error) return data.error;
  return fallback;
}
