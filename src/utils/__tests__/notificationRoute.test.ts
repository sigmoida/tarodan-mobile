/**
 * Derin bağlantı yol eşlemesi. Push bildirimleri ve universal link AYNI
 * fonksiyonu kullanır (DRY) — bu yüzden e-posta/davet/takip yolları da burada.
 */
import { toMobileRoute } from '../notificationRoute';

describe('toMobileRoute — derin bağlantı yolları', () => {
  it('e-posta doğrulama token\'ını korur', () => {
    expect(toMobileRoute('/verify-email?token=abc123')).toBe('/verify-email?token=abc123');
  });

  it('şifre sıfırlama token\'ını korur', () => {
    expect(toMobileRoute('/reset-password?token=xyz')).toBe('/reset-password?token=xyz');
  });

  it('şifremi unuttum ekranına gider', () => {
    expect(toMobileRoute('/forgot-password')).toBe('/forgot-password');
  });

  it('kurumsal daveti aktivasyon ekranına yönlendirir', () => {
    expect(toMobileRoute('/corporate/invite?token=inv-1')).toBe(
      '/corporate-invite?token=inv-1',
    );
  });

  it('token olmayan kurumsal davet bağlantısını da ekrana yönlendirir', () => {
    expect(toMobileRoute('/corporate/invite')).toBe('/corporate-invite');
  });

  it('misafir sipariş takibi parametrelerini korur', () => {
    expect(toMobileRoute('/track-order?orderNumber=ORD-1&email=a%40b.com')).toBe(
      '/order-track?orderNumber=ORD-1&email=a%40b.com',
    );
  });

  it('web profil altındaki sipariş detayını mobil sipariş detayına eşler', () => {
    expect(toMobileRoute('/profile/orders/ord-1')).toBe('/orders/ord-1');
  });

  it('web profil altındaki takas detayını mobil takas detayına eşler', () => {
    expect(toMobileRoute('/profile/trades/tr-1')).toBe('/trade/tr-1');
  });

  it('web profil altındaki iade detayını eşler', () => {
    expect(toMobileRoute('/profile/refund-requests/rr-1')).toBe('/refund-requests/rr-1');
  });

  it('ilan düzenleme bağlantısını mobil ilan düzenlemeye eşler', () => {
    expect(toMobileRoute('/listings/p-1/edit')).toBe('/listing/p-1/edit');
  });

  it('ödeme dönüş URL\'lerini eşlemez (WebView içinde yakalanır)', () => {
    expect(toMobileRoute('/payment/success?paymentId=p1')).toBeNull();
    expect(toMobileRoute('/payment/fail')).toBeNull();
  });
});
