/**
 * Sipariş iptal nedenleri — TEK kaynak (üye iptali + misafir iptali ortak).
 *
 * ## Sözleşme (staging'de ölçüldü, 2026-08-26)
 *
 * `POST /orders/guest/cancel` geçersiz bir kodla:
 *
 *   reasonCode must be one of the following values: delivery_delayed,
 *   wrong_product_selected, changed_mind, wrong_card, price_changed_mind,
 *   unavailable_at_address, other
 *
 * Ve `OrderLifecycleService.cancel` sipariş `paid` veya `preparing` iken
 * `reasonCode` YOKSA `server.order.cancelReasonRequired` ile 400 atıyor. Yani
 * neden opsiyonel DEĞİL — tam olarak iptalin anlamlı olduğu durumlarda zorunlu.
 *
 * ## Neden bu dosya var
 *
 * `src/lib/api/orders.ts` → `cancel(id, reason)` yalnız serbest metin `reason`
 * gönderiyordu; `reasonCode` hiç yoktu. Ödenmiş bir siparişi mobilden iptal
 * etmek bu yüzden 400 alıyordu. Aynı liste iki ekranda (üye sipariş detayı +
 * misafir sipariş takibi) gerekiyor; elle kopyalanan neden listeleri ana repoda
 * da sessizce kaymıştı (`BUYER_SELECTABLE_CANCELLATION_REASONS` oradaki
 * karşılığıdır) — burada da tek kaynak.
 *
 * Etiketler katalogdan gelir (`status.orderCancellationReason.*`, ana repoyla
 * BİREBİR aynı anahtar yolu ve aynı metinler), bu yüzden burada sabit Türkçe
 * metin yok.
 */
import type { MessageKey } from '@/i18n/lib';

/** Sunucunun `OrderCancellationReason` enum'u — ölçülen tam liste. */
export const ORDER_CANCELLATION_REASONS = [
  'delivery_delayed',
  'wrong_product_selected',
  'changed_mind',
  'wrong_card',
  'price_changed_mind',
  'unavailable_at_address',
  'other',
] as const;

export type OrderCancellationReason = (typeof ORDER_CANCELLATION_REASONS)[number];

/**
 * Alıcının iptal formunda SEÇEBİLECEĞİ nedenler.
 *
 * `other` bilinçli olarak DIŞARIDA: politika çözümü olmadığı için backend'de
 * manuel incelemeye düşürüyor ve anında iptali bozuyor. (Ana repodaki
 * `BUYER_SELECTABLE_CANCELLATION_REASONS` ile aynı gerekçe ve aynı sonuç.)
 * Gösterim tarafında `other` yine çözülebilir olmalı — sistem/admin kaynaklı
 * iptaller bu kodu taşıyabilir; o yüzden `reasonLabelKey` tam listeyi tanır.
 */
export const BUYER_SELECTABLE_CANCELLATION_REASONS: readonly OrderCancellationReason[] =
  ORDER_CANCELLATION_REASONS.filter((reason) => reason !== 'other');

/** Alıcı formunun varsayılanı — web'in iptal modallarıyla aynı. */
export const DEFAULT_CANCELLATION_REASON: OrderCancellationReason = 'changed_mind';

/**
 * Kodun katalog anahtarı. Tanınmayan bir kod (sunucu enum'a yeni değer eklerse)
 * `null` döner — çağıran ham kodu basar, ekranda boş bir satır kalmaz. Bu, iade
 * nedenlerinde (`refundReasonLabel`) çivilenmiş davranışın aynısı.
 */
export function reasonLabelKey(
  reason: string | null | undefined,
): MessageKey | null {
  if (!reason) return null;
  return (ORDER_CANCELLATION_REASONS as readonly string[]).includes(reason)
    ? (`status.orderCancellationReason.${reason}` as MessageKey)
    : null;
}

/**
 * Neden ZORUNLU mu? Sunucu yalnız `paid`/`preparing` durumlarında istiyor; diğer
 * durumlarda (ör. `pending_payment`) gövdesiz iptal de kabul ediliyor.
 *
 * İstemci yine de her zaman bir kod gönderiyor — form kullanıcıya sunuluyor ve
 * varsayılanı dolu. Bu yardımcı, kuralın nerede yaşadığını belgelemek ve
 * "neden seçilmedi" hatasını sunucuya gitmeden gösterebilmek için var.
 */
export function cancellationReasonRequired(
  orderStatus: string | null | undefined,
): boolean {
  return orderStatus === 'paid' || orderStatus === 'preparing';
}
