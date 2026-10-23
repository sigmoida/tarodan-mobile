/**
 * app/+native-intent.ts — derin bağlantı çevirisi expo-router ROTALAMADAN ÖNCE.
 *
 * Bu dosya, silinen src/services/__tests__/deepLinks.test.ts'in davranış
 * durumlarını devralır: https universal link, custom scheme, yolsuz kök URL ve
 * ödeme dönüşünün yönlendirilmemesi. Fark: artık `router.push` gözlenmiyor —
 * kanca saf bir fonksiyon, dönüş değeri expo-router'a verilen yoldur.
 */
const mockDismissTo = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
    push: (...a: unknown[]) => mockPush(...a),
  },
}));

import fs from 'fs';
import nodePath from 'path';
import { redirectSystemPath } from '../+native-intent';

const call = (path: string, initial = true) => redirectSystemPath({ path, initial });

const LISTING_ID = '0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c';

describe('redirectSystemPath: listing URL segments (ADR 0017)', () => {
  const SLUG = 'ferrari-f40-kirmizi';

  it.each([
    ['https universal link, slug-uuid', `https://tarodan.com.tr/listings/${SLUG}-${LISTING_ID}`],
    ['https universal link, English locale', `https://tarodan.com.tr/en/listings/${SLUG}-${LISTING_ID}`],
    ['https universal link, bare uuid', `https://tarodan.com.tr/listings/${LISTING_ID}`],
    ['https universal link, upper-case uuid', `https://tarodan.com.tr/listings/${LISTING_ID.toUpperCase()}`],
    ['https universal link, stale slug', `https://tarodan.com.tr/listings/old-title-${LISTING_ID}`],
    ['custom scheme', `tarodan://listings/${SLUG}-${LISTING_ID}`],
    ['path without the leading slash', `listings/${SLUG}-${LISTING_ID}`],
    ['the product route with a segment', `tarodan://product/${SLUG}-${LISTING_ID}`],
  ])('%s opens the product screen with the bare uuid', (_label, url) => {
    expect(call(url)).toBe(`/product/${LISTING_ID}`);
    expect(call(url, false)).toBe(`/product/${LISTING_ID}`);
  });

  it('the edit link opens the edit screen with the bare uuid', () => {
    expect(call(`https://tarodan.com.tr/listings/${SLUG}-${LISTING_ID}/edit`)).toBe(`/listing/${LISTING_ID}/edit`);
  });

  it('a segment with no uuid is handed to expo-router as is (its not-found screen)', () => {
    expect(call('https://tarodan.com.tr/listings/garbage')).toBe('https://tarodan.com.tr/listings/garbage');
    expect(call('https://tarodan.com.tr/listings/42')).toBe('https://tarodan.com.tr/listings/42');
  });
});

describe('redirectSystemPath — web yolu → mobil rota', () => {
  it('https universal link\'i mobil rotaya çevirir', () => {
    expect(call(`https://tarodan.com.tr/listings/${LISTING_ID}`)).toBe(`/product/${LISTING_ID}`);
  });

  it('ilan listesi (takas vitrini, popüler…) ön filtreli aramaya gider, sorgu korunur', () => {
    expect(call('https://tarodan.com.tr/listings?tradeOnly=true')).toBe('/search?tradeOnly=true');
    expect(call('tarodan://listings?sortBy=view_count_desc')).toBe('/search?sortBy=view_count_desc');
    expect(call('https://tarodan.com.tr/en/listings')).toBe('/search');
  });

  it('sorgu taşıyan yolu sorgusuyla birlikte çevirir', () => {
    expect(call('https://tarodan.com.tr/verify-email?token=abc')).toBe(
      '/verify-email?token=abc',
    );
  });

  it('web çoğul /trades/:id yolunu mobil tekil rotaya çevirir', () => {
    expect(call('https://tarodan.com.tr/trades/5')).toBe('/trade/5');
  });

  it('custom scheme bağlantısını çözer (baş slash olmadan gelen host segmenti)', () => {
    expect(call(`tarodan://product/${LISTING_ID}`)).toBe(`/product/${LISTING_ID}`);
  });

  it('zaten çıkarılmış, baş slash\'siz yolu da çözer', () => {
    expect(call(`listings/${LISTING_ID}`)).toBe(`/product/${LISTING_ID}`);
  });

  it('locale önekli web yolunu çözer', () => {
    expect(call('https://tarodan.com.tr/en/track-order?orderNumber=ORD-1')).toBe(
      '/order-track?orderNumber=ORD-1',
    );
  });

  it('uygulama açıkken gelen bağlantıyı da aynı şekilde çevirir', () => {
    expect(call('https://tarodan.com.tr/profile/orders/12', false)).toBe('/orders/12');
  });
});

describe('redirectSystemPath — e-posta doğrulama bağlantısı (token korunur)', () => {
  // Soğuk açılış (initial: true) VE uygulama açıkken (initial: false) aynı sonuç; `token`
  // sorgusu düşmez, `/en/` locale öneki soyulur, custom scheme de çalışır.
  it.each([
    ['https://tarodan.com.tr/verify-email?token=abc123', '/verify-email?token=abc123'],
    ['https://tarodan.com.tr/en/verify-email?token=abc123', '/verify-email?token=abc123'],
    ['https://tarodan.com.tr/tr/verify-email?token=abc123', '/verify-email?token=abc123'],
    ['https://www.tarodan.com.tr/verify-email?token=abc123', '/verify-email?token=abc123'],
    ['tarodan://verify-email?token=abc123', '/verify-email?token=abc123'],
  ])('%s → %s', (url, expected) => {
    expect(call(url, true)).toBe(expected);
    expect(call(url, false)).toBe(expected);
  });

  it('uygulama açıkken sekme gezinmesi tetiklemez (doğrulama ekranı yığına itilir)', () => {
    mockDismissTo.mockClear();
    call('https://tarodan.com.tr/verify-email?token=abc123', false);
    expect(mockDismissTo).not.toHaveBeenCalled();
  });
});

describe('redirectSystemPath — dokunulmayanlar', () => {
  it('yolsuz kök URL\'i olduğu gibi bırakır (bağlantısız açılış)', () => {
    expect(call('tarodan:///')).toBe('tarodan:///');
    expect(call('https://tarodan.com.tr')).toBe('https://tarodan.com.tr');
    expect(call('')).toBe('');
  });

  it('eşlemesi olmayan girdiyi DEĞİŞTİRMEDEN döndürür', () => {
    // Kritik: kendi türettiğimiz `normalized` değil, GİRDİNİN AYNISI. İkisi
    // farklı şeyler — `normalized` expo-router'ın URL çıkarımıyla örtüşmek
    // zorunda değil, ve onu döndürmek eşlemediğimiz her bağlantı için o
    // çıkarımı sessizce eziyor. Girdiyi döndürmek "kanca yokmuş gibi davran"
    // demek; expo-router kendi ağacında arar ve `tarodan://cart` yine çalışır.
    expect(call('tarodan://cart')).toBe('tarodan://cart');
    expect(call('https://tarodan.com.tr/kampanya/yaz')).toBe(
      'https://tarodan.com.tr/kampanya/yaz',
    );
  });

  // CİHAZDA BULUNDU (2026-08-03, iOS 26 simulator): fallback `normalized`
  // döndürdüğü sürece dev client'ın açılış URL'i yeniden yazılıyor, expo-router
  // olmayan bir rotaya gitmeye çalışıyor ve uygulama SPLASH'TE KİLİTLENİYORDU.
  // Hiçbir birim testi yakalamamıştı; uygulamayı gerçekten açmak yakaladı.
  it('expo dev client açılış URL\'ine dokunmaz', () => {
    const devClientUrl =
      'tarodan://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081';
    expect(call(devClientUrl)).toBe(devClientUrl);
  });
});

describe('redirectSystemPath — ödeme dönüşü GEZİNME YAPMAZ', () => {
  // Regresyon kilidi: `toMobileRoute(path) ?? path` yazılsaydı bu yollar
  // olduğu gibi geçer ve app/payment/success.tsx GERÇEKTEN açılırdı — PayTR
  // 3DS turu ödeme WebView'inin dışına çıkar, akış kopar.
  it.each([
    'https://tarodan.com.tr/payment/success?paymentId=p1',
    'https://tarodan.com.tr/payment/fail',
    'https://tarodan.com.tr/payment/failure',
    'https://tarodan.com.tr/tr/payment/success',
    'tarodan://payment/success',
  ])('%s boş string döner (expo-router gezinmez)', (url) => {
    expect(call(url)).toBe('');
  });

  it('app/payment/success rotası GERÇEKTEN var — bu yüzden engelleme şart', () => {
    expect(fs.existsSync(nodePath.join(__dirname, '../payment/success.tsx'))).toBe(true);
  });

  it('ödeme dışı yollar engellenmez (engel fazla genişlemiş olmasın)', () => {
    expect(call('https://tarodan.com.tr/offers')).toBe('/offers');
    expect(call('https://tarodan.com.tr/collections/9')).toBe('/collections/9');
  });
});

describe('checkout: AASA dışında ama custom scheme ile AÇILIR', () => {
  // `include: false` "bu WEB yolunu AASA'da talep etme" demek — tarayıcıdan
  // gelen bir checkout linki uygulamaya çekilmesin diye. Kullanıcı
  // `tarodan://checkout` ile uygulamayı AÇIKÇA çağırdığında engellemek için
  // bir sebep yok. İki anlamı bir liste sanmak checkout ekranını sessizce
  // öldürmüştü (cihazda doğrulandı, 2026-08-03).
  it('tarodan://checkout gezinmeyi engellemez', () => {
    expect(call('tarodan://checkout')).not.toBe('');
  });

  it('checkout ekranı GERÇEKTEN var — engellenirse ölür', () => {
    expect(fs.existsSync(nodePath.join(__dirname, '../checkout/index.tsx'))).toBe(true);
  });
});

describe('redirectSystemPath — uygulama açıkken sekme hedefi', () => {
  beforeEach(() => {
    mockDismissTo.mockClear();
    mockPush.mockClear();
  });

  it('tarodan://cart (açık uygulama): ikinci (tabs) itilmez — dismissTo + gezinme yok', () => {
    expect(call('tarodan://cart', false)).toBe('');
    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/cart');
  });

  it('https://…/favorites (açık uygulama): dismissTo favoriler sekmesi', () => {
    expect(call('https://tarodan.com.tr/favorites', false)).toBe('');
    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/favorites');
  });

  it('soğuk başlatmada sekme hedefi expo-router\'a olduğu gibi verilir', () => {
    expect(call('tarodan://cart', true)).toBe('tarodan://cart');
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('yığın hedefi açık uygulamada da yol olarak döner (dismissTo yok)', () => {
    expect(call(`https://tarodan.com.tr/listings/${LISTING_ID}`, false)).toBe(`/product/${LISTING_ID}`);
    expect(mockDismissTo).not.toHaveBeenCalled();
  });
});
