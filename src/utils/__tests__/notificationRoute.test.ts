/**
 * Derin bağlantı yol eşlemesi. Push bildirimleri ve universal link AYNI
 * fonksiyonu kullanır (DRY) — bu yüzden e-posta/davet/takip yolları da burada.
 */
import { notificationRoute, toMobileRoute } from '../notificationRoute';

/**
 * Yol enjeksiyonu (HIGH) — çözülmüş kimlik expo-router parametresi olarak API yoluna
 * giriyordu (`x/../../offers/<id>/accept`). Biçim dışı kimlik rotaya hiç girmez.
 */
describe('kimlik biçimi doğrulaması', () => {
  it('?thread= kodlanmış yol içerirse sohbet listesine düşer', () => {
    expect(toMobileRoute('/messages?thread=x%2F..%2F..%2Foffers%2Fo1%2Faccept')).toBe('/messages');
    expect(toMobileRoute('/messages?thread=%E0%A4%A')).toBe('/messages');
    expect(toMobileRoute('/messages?thread=3f2c1a9e-0b7d-4c1e-9a55-2d1f0e6b7c8a')).toBe(
      '/messages/3f2c1a9e-0b7d-4c1e-9a55-2d1f0e6b7c8a',
    );
  });

  it('yol segmentinde kodlanmış ayraç / nokta varsa link eşlenmez', () => {
    expect(toMobileRoute('/trades/x%2F..%2Foffers')).toBeNull();
    expect(toMobileRoute('/orders/a%3Fb')).toBeNull();
    expect(toMobileRoute('/listings/..')).toBeNull();
    expect(toMobileRoute('/trades/t-1')).toBe('/trade/t-1');
  });

  it('slug segmentleri (nokta, @, :, yüzde kodlu Türkçe harf) düşmez', () => {
    expect(toMobileRoute('/listings/vintage-araba.v2')).toBe('/product/vintage-araba.v2');
    expect(toMobileRoute('/listings/ak%C4%B1ll%C4%B1-%C3%A7ocuk-oyuncağ%C4%B1')).toBe(
      '/product/ak%C4%B1ll%C4%B1-%C3%A7ocuk-oyuncağ%C4%B1',
    );
    expect(toMobileRoute('/collections/ali@koleksiyon')).toBe('/collections/ali@koleksiyon');
    expect(toMobileRoute('/seller/magaza:tr')).toBe('/seller/magaza:tr');
    expect(toMobileRoute('/favorites')).toBe('/favorites');
    expect(toMobileRoute('/pricing')).toBe('/pricing');
  });

  it('kimlik bekleyen rotalar (sipariş / takas / iade / satış / düzenleme) kimlik biçimini şart koşar', () => {
    expect(toMobileRoute('/orders/ak%C4%B1ll%C4%B1')).toBeNull();
    expect(toMobileRoute('/orders/o.1')).toBeNull();
    expect(toMobileRoute('/trades/t@1')).toBeNull();
    expect(toMobileRoute('/refund-requests/r:1')).toBeNull();
    expect(toMobileRoute('/seller/orders/o.1')).toBeNull();
    expect(toMobileRoute('/profile/orders/o.1')).toBeNull();
    expect(toMobileRoute('/listings/p.1/edit')).toBeNull();
    expect(toMobileRoute('/orders/3f2c1a9e-0b7d-4c1e-9a55-2d1f0e6b7c8a')).toBe(
      '/orders/3f2c1a9e-0b7d-4c1e-9a55-2d1f0e6b7c8a',
    );
    expect(toMobileRoute('/seller/orders/o_1')).toBe('/sales/o_1');
  });

  it('yol kaçışı / aşırı uzun / kontrol karakterli / boşluklu segment eşlenmez', () => {
    for (const bad of [
      '/listings/.',
      '/listings/..',
      '/listings/%2e%2e',
      '/listings/a%5Cb',
      '/listings/a%2Fb',
      '/listings/a%00b',
      '/listings/a%0Ab',
      '/listings/a%20b',
      '/listings/a%3Fb',
      '/listings/a%23b',
      '/listings/a%E0%A4%A',
      `/listings/${'a'.repeat(129)}`,
    ]) {
      expect(toMobileRoute(bad)).toBeNull();
    }
    expect(toMobileRoute(`/listings/${'a'.repeat(128)}`)).toBe(`/product/${'a'.repeat(128)}`);
  });

  it('bildirim linki: slug\'lı ürün yolu çözülür', () => {
    expect(notificationRoute({ type: 'x', link: '/listings/vintage-araba.v2', data: {} })).toBe(
      '/product/vintage-araba.v2',
    );
  });

  it('data kimlikleri biçim dışıysa yok sayılır (sayı kabul)', () => {
    expect(notificationRoute({ data: { tradeId: '../offers/o1/accept' } })).toBeNull();
    expect(notificationRoute({ data: { threadId: 't/../x', orderId: 'o 1' } })).toBeNull();
    expect(notificationRoute({ data: { orderId: 42 } })).toBe('/orders/42');
  });
});

describe('toMobileRoute — derin bağlantı yolları', () => {
  it('web ilan listesi filtre/sıralama sorgusuyla mobil ilan listesine gider', () => {
    expect(toMobileRoute('/listings')).toBe('/search');
    expect(toMobileRoute('/tr/listings?discountOnly=true&sortBy=price_asc')).toBe(
      '/search?discountOnly=true&sortBy=price_asc',
    );
    expect(toMobileRoute('/listings/42')).toBe('/product/42');
  });

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

/** Parite C-1.5: üyelik bildirimleri ve audience taşımayan satıcı tipleri. */
describe('notificationRoute — C-1.5', () => {
  it('/membership linki mobil üyelik ekranına gider', () => {
    for (const type of ['membership_renewal_card_required', 'membership_expiring', 'membership_expired']) {
      expect(notificationRoute({ type, link: '/membership', data: {} })).toBe('/membership');
    }
    expect(toMobileRoute('/membership')).toBe('/membership');
    expect(toMobileRoute('/en/membership')).toBe('/membership');
  });

  it('audience taşımayan satıcı bildirimi, link /seller/orders/… ise SATIŞ ekranına gider', () => {
    // API satıcı linkini /seller/orders/{{orderId}} olarak üretir (tip listesi yok).
    for (const type of [
      'order_cancelled_seller',
      'order_cancelled_by_platform_seller',
      'order_preparing_extended_seller',
      'product_sold',
      'refund_request_received_seller',
      'refund_return_shipped_seller',
      'refund_return_delivered_seller',
      'refund_completed_seller',
      'refund_auto_accepted_seller',
    ]) {
      expect(notificationRoute({ type, link: '/seller/orders/o1', data: { orderId: 'o1' } })).toBe(
        '/sales/o1',
      );
    }
    // locale önekli ve data.link üzerinden gelen biçimler
    expect(
      notificationRoute({ type: 'x', link: '/en/seller/orders/o1', data: { orderId: 'o1' } }),
    ).toBe('/sales/o1');
    expect(
      notificationRoute({ type: 'x', link: null, data: { orderId: 'o1', link: '/seller/orders/o1' } }),
    ).toBe('/sales/o1');
  });

  it('sıra: audience, link deseni, son çare tip adı', () => {
    expect(
      notificationRoute({ type: 'order_paid', link: '/profile/orders/o1', data: { orderId: 'o1', audience: 'seller' } }),
    ).toBe('/sales/o1');
    // audience=buyer tip yedeğinden önce gelir
    expect(
      notificationRoute({ type: 'order_cancelled_seller', link: null, data: { orderId: 'o1', audience: 'buyer' } }),
    ).toBe('/orders/o1');
    // başka bir (alıcı) link varsa tip yedeğine düşülmez
    expect(
      notificationRoute({ type: 'order_cancelled_seller', link: '/profile/orders/o1', data: { orderId: 'o1' } }),
    ).toBe('/orders/o1');
  });

  it("push dokunuşu: link ve audience yokken tip yedeği satıcıyı /sales'e götürür", () => {
    // Push payload'ı `{ ...dto.data, type }` — push.ts: notificationRoute({ type: data.type, link: data.link, data }).
    for (const type of [
      'order_cancelled_seller',
      'order_cancelled_by_platform_seller',
      'order_preparing_extended_seller',
      'product_sold',
      'cargo_movement_missing',
      'refund_request_received_seller',
      'refund_return_shipped_seller',
      'refund_return_delivered_seller',
      'refund_completed_seller',
      'refund_auto_accepted_seller',
    ]) {
      expect(notificationRoute({ type, link: undefined, data: { orderId: 'o1', type } })).toBe('/sales/o1');
    }
    // type yalnız data içinde gelse de çalışır
    expect(notificationRoute({ data: { orderId: 'o1', type: 'order_cancelled_seller' } })).toBe('/sales/o1');
  });

  it('push dokunuşu: alıcı tipleri (link/audience yok) alıcı ekranında kalır', () => {
    for (const type of ['order_cancelled', 'order_cancelled_by_platform', 'order_shipped', 'refund_approved']) {
      expect(notificationRoute({ type, data: { orderId: 'o1', type } })).toBe('/orders/o1');
    }
    expect(notificationRoute({ data: { orderId: 'o1', type: 'order_cancelled' } })).toBe('/orders/o1');
  });

  it('toMobileRoute: /seller/orders/:id -> /sales/:id, satıcı profili aynı kalır', () => {
    expect(toMobileRoute('/seller/orders/o1')).toBe('/sales/o1');
    expect(toMobileRoute('/en/seller/orders/o1')).toBe('/sales/o1');
    expect(toMobileRoute('/seller/orders')).toBe('/sales');
    expect(toMobileRoute('/seller/u1')).toBe('/seller/u1');
  });

  it('alıcı tipleri (order_cancelled, *_by_platform) alıcı ekranında kalır', () => {
    for (const type of ['order_cancelled', 'order_cancelled_by_platform', 'order_preparing_extended']) {
      expect(notificationRoute({ type, link: '/profile/orders/o1', data: { orderId: 'o1' } })).toBe(
        '/orders/o1',
      );
    }
  });
});
