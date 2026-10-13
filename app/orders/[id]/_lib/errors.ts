// Sipariş mutasyonlarının hata mesajı biçimleri — tek kaynak.
import { apiErrorLines } from '@/lib/api/errorText';

type ApiError = { response?: { data?: { message?: unknown } } } | null | undefined;
const messageOf = (err: unknown): unknown => (err as ApiError)?.response?.data?.message;

/** Ödeme akışının (initiate) hata formu: dizi ', ' ile birleşir; mesaj yoksa fallback. Tek kaynak: `apiErrorLines`. */
export const joinMsg = (err: unknown, fallback: string): string =>
  apiErrorLines(err).join(', ') || fallback;

/**
 * refund/cancelRefund/cancelOrder'ın ORİJİNAL hata formu: string mesajı göster,
 * array/eksik mesajda genel fallback göster (parite — array'i join'leME).
 */
export const strMsg = (err: unknown, fallback: string): string => {
  const msg = messageOf(err) || fallback;
  return typeof msg === 'string' ? msg : fallback;
};
