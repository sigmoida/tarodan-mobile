/**
 * app/+native-intent.ts — derin bağlantı çevirisi expo-router ROTALAMADAN ÖNCE.
 *
 * Bu dosya, silinen src/services/__tests__/deepLinks.test.ts'in davranış
 * durumlarını devralır: https universal link, custom scheme, yolsuz kök URL ve
 * ödeme dönüşünün yönlendirilmemesi. Fark: artık `router.push` gözlenmiyor —
 * kanca saf bir fonksiyon, dönüş değeri expo-router'a verilen yoldur.
 */
import fs from 'fs';
import nodePath from 'path';
import { redirectSystemPath } from '../+native-intent';

const call = (path: string, initial = true) => redirectSystemPath({ path, initial });

describe('redirectSystemPath — web yolu → mobil rota', () => {
  it('https universal link\'i mobil rotaya çevirir', () => {
    expect(call('https://tarodan.com.tr/listings/123')).toBe('/product/123');
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
    expect(call('tarodan://product/p-1')).toBe('/product/p-1');
  });

  it('zaten çıkarılmış, baş slash\'siz yolu da çözer', () => {
    expect(call('listings/123')).toBe('/product/123');
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
    expect(call('https://tarodan.com.tr/sayfa/hakkimizda')).toBe(
      'https://tarodan.com.tr/sayfa/hakkimizda',
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
