/**
 * Derin bağlantı yol eşlemesi. Push bildirimleri ve universal link AYNI
 * fonksiyonu kullanır (DRY) — bu yüzden e-posta/davet/takip yolları da burada.
 */
import { notificationRoute, toMobileRoute } from '../notificationRoute';

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

describe('toMobileRoute — locale oneki', () => {
  it('en onekli urun linkini cozer', () => {
    expect(toMobileRoute('/en/listings/123')).toBe('/product/123');
  });

  it('tr onekli urun linkini cozer', () => {
    expect(toMobileRoute('/tr/listings/123')).toBe('/product/123');
  });

  it('onekli sorgu parametresini korur', () => {
    expect(toMobileRoute('/en/verify-email?token=abc')).toBe('/verify-email?token=abc');
  });

  it('onekli dislanan yolu yine cozmez', () => {
    expect(toMobileRoute('/en/payment/success')).toBeNull();
  });

  it('locale olmayan ilk segmenti soymaz', () => {
    // /offers bir rota; yanlislikla "locale" sanilip soyulursa /offers kaybolur
    expect(toMobileRoute('/offers')).toBe('/offers');
  });

  it('cipiak locale kokunu profil sekmesine dusurmez', () => {
    // /en tek basina bir icerik yolu degil → eslesme yok
    expect(toMobileRoute('/en')).toBeNull();
  });
});

/**
 * Bildirim çözümleyicisi — TEK katman.
 *
 * 2026-08-11 ölçümü (`docs/superpowers/reports/2026-08-11-bildirim-sozlesmesi-olcum.md`,
 * 36 kayıt) iki çözümleyicinin farklı yerlere gittiğini gösterdi. Vakalar
 * uydurulmadı; ölçülen gövdelerden alındı.
 */
describe('notificationRoute — ölçülen vakalar', () => {
  it('grup ödemesinde link listeye düşerken data grubu açar', () => {
    // link '/profile/orders' — LİSTE. data ise grubu tanımlıyor.
    expect(
      notificationRoute({
        type: 'payment_confirmed',
        link: '/profile/orders',
        data: { checkoutGroupId: '35481072-5428-41e8-8115-e7bff8c64717', groupNumber: 'GRP-AT979R67NS' },
      }),
    ).toBe('/orders/group/35481072-5428-41e8-8115-e7bff8c64717');
  });

  it('trade_auto_cancelled: link takas listesine düşse de ilgili takası açar', () => {
    expect(
      notificationRoute({
        type: 'trade_auto_cancelled',
        link: '/profile/trades',
        data: { tradeId: '12012f5e-4d1b-43c8-87fe-c644ea5dde24', link: '/trades/12012f5e-4d1b-43c8-87fe-c644ea5dde24' },
      }),
    ).toBe('/trade/12012f5e-4d1b-43c8-87fe-c644ea5dde24');
  });

  it('audience=seller siparişi SATIŞ ekranına götürür', () => {
    expect(
      notificationRoute({
        type: 'refund_request_received_seller',
        link: '/profile/orders/o1',
        data: { orderId: 'o1', audience: 'seller' },
      }),
    ).toBe('/sales/o1');
  });

  it('audience yoksa/buyer ise alıcı ekranına götürür', () => {
    expect(
      notificationRoute({ type: 'payment_refunded', link: '/profile/orders/o1', data: { orderId: 'o1', audience: 'buyer' } }),
    ).toBe('/orders/o1');
    expect(notificationRoute({ type: 'order_cancelled', link: '/profile/orders/o1', data: { orderId: 'o1' } })).toBe('/orders/o1');
  });

  it('kimlik yoksa link yol eşlemesinden geçer', () => {
    expect(notificationRoute({ type: 'x', link: '/profile/trades/t9', data: {} })).toBe('/trade/t9');
  });

  it('hedef yoksa null döner — sessizce başka ekrana atmaz', () => {
    expect(notificationRoute({ type: 'refund_review_required_admin', link: null, data: {} })).toBeNull();
    expect(notificationRoute({ type: 'admin_broadcast', link: '/admin/panel', data: {} })).toBeNull();
  });

  it('güvensiz hedefleri açmaz', () => {
    expect(notificationRoute({ type: 'x', link: 'javascript:alert(1)', data: {} })).toBeNull();
    expect(notificationRoute({ type: 'x', link: 'tarodanx://orders/o1', data: {} })).toBeNull();
    expect(notificationRoute({ type: 'x', link: 'https://evil.example.com/orders/o1', data: {} })).toBeNull();
  });

  it('tanıdık host üzerinden gelen tam URL yolu çözülür', () => {
    expect(notificationRoute({ type: 'x', link: 'https://tarodan.com.tr/profile/orders/o1', data: {} })).toBe('/orders/o1');
  });
});

/**
 * Tip istisnası: karşı teklif bildiriminin ortak (web) link'i /listings/:id'ye
 * gidiyor — yanlış ekran. Karşı teklif alıcının başlattığı pazarlıktadır, hedef
 * "Gönderilen" sekmesi. Kural ekranda değil çözümleyicide durmalı; aksi halde
 * push tap ile liste tap'i yine ayrışır.
 */
it('offer_counter gönderilen teklifler sekmesine gider', () => {
  expect(
    notificationRoute({ type: 'offer_counter', link: '/listings/p1', data: { offerId: 'of1', productId: 'p1' } }),
  ).toBe('/offers?tab=sent');
});

it('stok bitmiş ürün bildirimi "artık satışta değil" ekranına gider', () => {
  // Ürün detayı yerine bu ekran doğru hedef; bilgi YALNIZ tipte var.
  for (const type of ['order_cancelled_out_of_stock', 'offer_cancelled_out_of_stock', 'back_in_stock']) {
    expect(notificationRoute({ type, link: '/listings/p1', data: { productId: 'p1' } })).toBe(
      '/products/unavailable/p1',
    );
  }
});

/**
 * Sunucu tek siparişi bildiğinde HEM `orderId` HEM spesifik link veriyor;
 * yalnız grubu bildiğinde link listeye (`/profile/orders`) düşüyor. Yani
 * `orderId` varken grup daha az spesifik hedeftir.
 */
it('hem sipariş hem grup kimliği varsa siparişi açar', () => {
  expect(
    notificationRoute({
      type: 'payment_confirmed',
      link: '/profile/orders/0cd43fd3-376a-4ef5-b42e-6f74f15b5eec',
      data: {
        orderId: '0cd43fd3-376a-4ef5-b42e-6f74f15b5eec',
        checkoutGroupId: '7d5a24c0-3b03-4362-a5ed-28d1dd277b16',
      },
    }),
  ).toBe('/orders/0cd43fd3-376a-4ef5-b42e-6f74f15b5eec');
});
