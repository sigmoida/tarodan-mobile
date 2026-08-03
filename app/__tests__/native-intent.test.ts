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

  it('eşlemesi olmayan yolu olduğu gibi geçirir (expo-router kendi eşleşmesini denesin)', () => {
    // `tarodan://cart` mobil rotayla birebir örtüşür; toMobileRoute null döner
    // ama expo-router'ın kendi ağacı bunu zaten çözer.
    expect(call('tarodan://cart')).toBe('/cart');
    expect(call('https://tarodan.com.tr/sayfa/hakkimizda')).toBe('/sayfa/hakkimizda');
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
    'https://tarodan.com.tr/checkout',
    'https://tarodan.com.tr/checkout/address',
  ])('%s boş string döner (expo-router gezinmez)', (url) => {
    expect(call(url)).toBe('');
  });

  it('app/payment/success rotası GERÇEKTEN var — bu yüzden dışlama şart', () => {
    expect(fs.existsSync(nodePath.join(__dirname, '../payment/success.tsx'))).toBe(true);
  });

  it('ödeme dışı yollar dışlanmaz (dışlama fazla genişlemiş olmasın)', () => {
    expect(call('https://tarodan.com.tr/offers')).toBe('/offers');
    expect(call('https://tarodan.com.tr/collections/9')).toBe('/collections/9');
  });
});
