/**
 * `orderCancelMessage` — iptal edilmiş siparişin neden cümlesi (Parite A-1.10).
 * Web `getCancelMessage` + `OrderBanners` kapısıyla birebir (inceleme 5).
 */
import i18n from '@/i18n/config';
import type { MessageKey } from '@/i18n/lib';
import { orderCancelMessage } from '../orderCancelMessage';
import { FALLBACK_TIMING_POLICY, parseTimingPolicy, timingMessageValues } from '../timingPolicy';

const t = i18n.getFixedT('tr');
const TIMING = timingMessageValues(FALLBACK_TIMING_POLICY);

describe('orderCancelMessage', () => {
  it('buyer_cancelled: cümle ekranın AÇIKÇA geçtiği okuyucuya göre değişir', () => {
    expect(orderCancelMessage({ status: 'cancelled', cancelCategory: 'buyer_cancelled' }, 'buyer', t, TIMING)).toBe(
      'Bu siparişi iptal ettiniz.',
    );
    expect(orderCancelMessage({ status: 'cancelled', cancelCategory: 'buyer_cancelled' }, 'seller', t, TIMING)).toBe(
      'Alıcı bu siparişi iptal etti.',
    );
  });

  it('yanıttaki isBuyer okunmaz (alan gelmese de alıcıya alıcı cümlesi)', () => {
    const order = { status: 'cancelled', cancelCategory: 'buyer_cancelled', isBuyer: undefined };
    expect(orderCancelMessage(order, 'buyer', t, TIMING)).toBe('Bu siparişi iptal ettiniz.');
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
      { status: 'cancelled', cancelCategory: category, cancelReason: 'ham sunucu metni' },
      'buyer',
      t,
      TIMING,
    );
    expect(message).toBe(t(key, TIMING));
    expect(message).not.toBe('ham sunucu metni');
    expect(message).not.toBe(key);
  });

  it('payment_timeout: saat politikadan gelir (Süreler ve Kurallar, A-3.1)', () => {
    const order = { status: 'cancelled', cancelCategory: 'payment_timeout' };
    expect(orderCancelMessage(order, 'buyer', t, TIMING)).toBe(
      'Ödeme 24 saat içinde tamamlanmadığı için sipariş otomatik iptal edildi.',
    );
    const custom = timingMessageValues(parseTimingPolicy({ orderPaymentWindowHours: { value: 48, unit: 'hours' } }));
    expect(orderCancelMessage(order, 'seller', t, custom)).toBe(
      'Ödeme 48 saat içinde tamamlanmadığı için sipariş otomatik iptal edildi.',
    );
    expect(orderCancelMessage(order, 'buyer', i18n.getFixedT('en'), custom)).toBe(
      "This order was automatically cancelled because payment wasn't completed within 48 hours.",
    );
  });

  it('other: platform iptalinin sunucu metni aynen basılır', () => {
    expect(
      orderCancelMessage(
        {
          status: 'cancelled',
          cancelCategory: 'other',
          cancelReason: '  Yönetici tarafından iptal edildi: Sahte ilan  ',
        },
        'buyer',
        t,
        TIMING,
      ),
    ).toBe('Yönetici tarafından iptal edildi: Sahte ilan');
  });

  it('other: serbest metin satıcıya da aynen basılır (web aynı sayfayı ikisine gösterir)', () => {
    const order = { status: 'cancelled', cancelCategory: 'other', cancelReason: 'Yanlışlıkla iki tane sipariş verdim' };
    expect(orderCancelMessage(order, 'seller', t, TIMING)).toBe('Yanlışlıkla iki tane sipariş verdim');
    expect(orderCancelMessage(order, 'buyer', t, TIMING)).toBe('Yanlışlıkla iki tane sipariş verdim');
    // Kod bile olsa çevrilmez — web ham basıyor.
    expect(orderCancelMessage({ ...order, cancelReason: 'changed_mind' }, 'seller', t, TIMING)).toBe('changed_mind');
  });

  it('bilinmeyen kategori de ham metne düşer', () => {
    expect(
      orderCancelMessage(
        { status: 'cancelled', cancelCategory: 'yeni_kategori', cancelReason: 'Sunucu metni' },
        'buyer',
        t,
        TIMING,
      ),
    ).toBe('Sunucu metni');
  });

  it("status 'cancelled' değilse (ödenmiş kargo öncesi iptal: refunded + iptal) cümle yok — web banner'ı da yok", () => {
    const refunded = { cancelCategory: null, cancelReason: 'Yönetici tarafından iptal edildi: Sahte ilan' };
    expect(orderCancelMessage({ ...refunded, status: 'refunded' }, 'buyer', t, TIMING)).toBeNull();
    expect(orderCancelMessage({ ...refunded, status: 'refunded' }, 'seller', t, TIMING)).toBeNull();
    expect(orderCancelMessage({ status: 'refunded', cancelCategory: 'buyer_cancelled' }, 'buyer', t, TIMING)).toBeNull();
  });

  it('kategori yok (iptal edilmemiş / eski yanıt) ve gerekçe boş → null', () => {
    expect(
      orderCancelMessage({ status: 'cancelled', cancelCategory: null, cancelReason: null }, 'buyer', t, TIMING),
    ).toBeNull();
    expect(
      orderCancelMessage({ status: 'cancelled', cancelCategory: 'other', cancelReason: '   ' }, 'buyer', t, TIMING),
    ).toBeNull();
  });
});
