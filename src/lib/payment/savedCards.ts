import type { SavedCard } from '@/lib/api';

/**
 * `GET /membership/cards` gövdesi: dizi ya da `{ data: [...] }` sarmalı (eski
 * yanıt şekli). Saf yardımcı — ödeme formu ve Kayıtlı Kartlarım ortak kullanır.
 */
export function unwrapSavedCards(data: unknown): SavedCard[] {
  if (Array.isArray(data)) return data as SavedCard[];
  const inner = (data as { data?: unknown } | null | undefined)?.data;
  return Array.isArray(inner) ? (inner as SavedCard[]) : [];
}
