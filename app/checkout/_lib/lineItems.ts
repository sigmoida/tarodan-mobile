import type { OrderLineItemInput } from '@/lib/api';

/**
 * Quote ve sipariş gövdesinin satırları — İKİSİ DE buradan üretilir.
 *
 * Sunucu fiyat imzasına (`pricingHash`) adedi de katıyor; checkout gövdesi
 * quote'tan FARKLI adet taşırsa imza tutmaz ve uç 409 `pricingChanged` döner.
 * Eskiden quote adetle, checkout adetsiz gidiyordu: sunucu `quantity ?? 1`
 * varsaydığı için adedi 1'den büyük her sepet aynı 409 döngüsüne düşüyordu.
 * Tek üretici, iki gövdenin bir daha ayrışmasını imkânsız kılar.
 */
export const toOrderLineItems = (
  lines: ReadonlyArray<{ productId: string; quantity: number }>,
): OrderLineItemInput[] =>
  lines.map(({ productId, quantity }) => ({ productId, quantity }));
