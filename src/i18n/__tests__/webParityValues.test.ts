/**
 * Web ile ortak anahtarlarda web değeri (D-mantık, i18n eşitleme).
 *
 * Tam eşitliği kilitlemek web reposuna bağımlı olurdu; burada eşitlenen
 * temsilci anahtarlar ve bilinçli sapmalar (mağaza nötrleştirmesi) sabit
 * beklentiyle korunur.
 */
import tr from '../lib/catalog/tr.json';
import en from '../lib/catalog/en.json';

function get(catalog: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((cur, part) => (cur as Record<string, unknown> | undefined)?.[part], catalog);
}

describe('web ile eşitlenen ortak metinler', () => {
  it.each([
    ['common.loading', 'Yükleniyor', 'Loading'],
    ['common.sending', 'Gönderiliyor', 'Sending'],
    ['common.loadMore', 'Daha fazla göster', 'Show more'],
    ['checkout.emptyCart', 'Sepetiniz boş', 'Your cart is empty'],
    ['product.productCode', 'İlan No', 'Listing No'],
    ['information.contactInfo.addressValue', 'İzmir/Türkiye', 'Izmir, Turkey'],
    ['checkout.platformServiceFeeWithRate', 'Platform Hizmet Bedeli (%{rate})', 'Platform Service Fee ({rate}%)'],
    ['status.order.paid', 'Ödendi', 'Paid'],
    ['status.order.refund_requested', 'İade Talep Edildi', 'Refund Requested'],
    ['status.offer.countered', 'Karşı Teklif', 'Countered'],
  ])('%s', (key, trValue, enValue) => {
    expect(get(tr, key)).toBe(trValue);
    expect(get(en, key)).toBe(enValue);
  });

  it('mağaza için nötrleştirilmiş metinlere dokunulmadı (üyelik/boost/yükseltme)', () => {
    expect(get(tr, 'product.upgradeArrow')).toBe("Premium''a Geç →");
    expect(get(en, 'product.upgradeArrow')).toBe('Upgrade →');
  });

  it('fiyat parametreli metinlerde ₺ yok (tutar formatPrice ile gelir)', () => {
    for (const key of ['product.shareText', 'offer.minimumOfferErrorTl', 'listing.platformFeeLine', 'listing.netEarningLine', 'listing.priceFieldLabel', 'offer.amountPlaceholderTl', 'offer.newAmountPlaceholderTl', 'trade.amountLabelSymbol']) {
      expect(String(get(tr, key))).not.toContain('₺');
      expect(String(get(en, key))).not.toContain('₺');
    }
  });
});
