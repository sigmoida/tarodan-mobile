import { getIconForType } from '../icons';

/** Parite C-1.5: API'nin 9 yeni bildirim tipi varsayılan zile düşmemeli. */
const NEW_TYPES = [
  'offer_extended',
  'trade_response_extended',
  'trade_payment_extended',
  'trade_payment_extended_paid',
  'order_preparing_extended',
  'order_preparing_extended_seller',
  'order_cancelled_by_platform',
  'order_cancelled_by_platform_seller',
  'trade_cancelled_by_platform',
  // Takas iptali (karşı taraf) ve itiraz açıldı / sonuçlandı (API 2026-10-17).
  'trade_cancelled',
  'trade_dispute_opened',
  'trade_dispute_resolved',
];

describe('getIconForType — yeni bildirim tipleri', () => {
  const fallback = getIconForType('__bilinmeyen__');

  it.each(NEW_TYPES)('%s varsayılan ikona düşmez', (type) => {
    const r = getIconForType(type);
    expect(`${r.icon}|${r.color}`).not.toBe(`${fallback.icon}|${fallback.color}`);
  });
});
