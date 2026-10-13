// Sipariş mutasyonlarının hata mesajı biçimleri — tek kaynak.

type ApiError = { response?: { data?: { message?: unknown } } } | null | undefined;
const messageOf = (err: unknown): unknown => (err as ApiError)?.response?.data?.message;

/** Ödeme akışının (initiate) hata formu: array ise join'le, sonra string değilse fallback. */
export const joinMsg = (err: unknown, fallback: string): string => {
  const raw = messageOf(err);
  const msg = Array.isArray(raw) ? raw.join(', ') : raw || fallback;
  return typeof msg === 'string' ? msg : fallback;
};

/**
 * refund/cancelRefund/cancelOrder'ın ORİJİNAL hata formu: string mesajı göster,
 * array/eksik mesajda genel fallback göster (parite — array'i join'leME).
 */
export const strMsg = (err: unknown, fallback: string): string => {
  const msg = messageOf(err) || fallback;
  return typeof msg === 'string' ? msg : fallback;
};
