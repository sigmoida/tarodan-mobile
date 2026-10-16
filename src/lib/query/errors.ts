/**
 * Detay ekranlarında "bulunamadı" ile "yüklenemedi" ayrımı — TEK KAYNAK.
 *
 * Gerçek 404 (silinmiş / hiç olmayan kayıt) → EmptyState "bulunamadı"; diğer her hata (ağ,
 * 5xx, zaman aşımı) → ErrorState + yeniden dene. Önceden ikisi de "bulunamadı" görünüyordu;
 * kullanıcı geçici bir ağ hatasında kaydın silindiğini sanıyordu.
 */
export function isNotFoundError(error: unknown): boolean {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  return status === 404;
}
