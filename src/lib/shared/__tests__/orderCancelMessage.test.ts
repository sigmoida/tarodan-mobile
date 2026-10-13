/**
 * `orderCancelMessage` — iptal edilmiş siparişin neden cümlesi (Parite A-1.10).
 * Eşleme web `getCancelMessage` ile aynı; tek sapma alıcı iptal KODUNUN
 * (`changed_mind`) ham basılmayıp etiketlenmesi.
 */
import i18n from '@/i18n/config';
import type { MessageKey } from '@/i18n/lib';
import { orderCancelMessage } from '../orderCancelMessage';

const t = i18n.getFixedT('tr');

describe('orderCancelMessage', () => {
  it('buyer_cancelled: cümle ekranın AÇIKÇA geçtiği okuyucuya göre değişir', () => {
    expect(orderCancelMessage({ cancelCategory: 'buyer_cancelled' }, 'buyer', t)).toBe('Bu siparişi iptal ettiniz.');
    expect(orderCancelMessage({ cancelCategory: 'buyer_cancelled' }, 'seller', t)).toBe(
      'Alıcı bu siparişi iptal etti.',
    );
  });

  it('yanıttaki isBuyer okunmaz (alan gelmese de alıcıya alıcı cümlesi)', () => {
    const order = { cancelCategory: 'buyer_cancelled', isBuyer: undefined };
    expect(orderCancelMessage(order, 'buyer', t)).toBe('Bu siparişi iptal ettiniz.');
  });

  it.each<[string, MessageKey]>([
    ['payment_timeout', 'order.cancelMsgPaymentTimeout'],
    ['seller_no_ship', 'order.cancelMsgSellerNoShip'],
    ['stockout', 'order.cancelMsgStockout'],
    ['trade_reserved', 'order.cancelMsgTradeReserved'],
    ['bulk_replaced', 'order.cancelMsgBulkReplaced'],
    ['admin_buyer_favor', 'order.cancelMsgAdminBuyerFavor'],
    ['admin', 'order.cancelMsgAdmin'],
  ])('%s → katalog cümlesi (ham gerekçe değil)', (category, key) => {
    const message = orderCancelMessage(
      { cancelCategory: category, cancelReason: 'ham sunucu metni' },
      'buyer',
      t,
    );
    expect(message).toBe(t(key));
    expect(message).not.toBe('ham sunucu metni');
    expect(message).not.toBe(key);
  });

  it('other: platform iptalinin sunucu metni aynen basılır', () => {
    expect(
      orderCancelMessage(
        { cancelCategory: 'other', cancelReason: '  Yönetici tarafından iptal edildi: Sahte ilan  ' },
        'buyer',
        t,
      ),
    ).toBe('Yönetici tarafından iptal edildi: Sahte ilan');
  });

  it('other: gerekçe bir iptal KODUYSA ham değil etiketiyle basılır', () => {
    const message = orderCancelMessage({ cancelCategory: 'other', cancelReason: 'changed_mind' }, 'seller', t);
    expect(message).toBe(t('status.orderCancellationReason.changed_mind'));
    expect(message).not.toBe('changed_mind');
  });

  it('kategori yok (iptal edilmemiş / eski yanıt) ve gerekçe boş → null', () => {
    expect(orderCancelMessage({ cancelCategory: null, cancelReason: null }, 'buyer', t)).toBeNull();
    expect(orderCancelMessage({ cancelCategory: 'other', cancelReason: '   ' }, 'buyer', t)).toBeNull();
  });
});
