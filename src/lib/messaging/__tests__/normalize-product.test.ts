/**
 * Konuşmanın ürün bağlamı normalize edilirken kaybolmuyor.
 *
 * Sunucu ürün bilgisini DÜZ alanlarda gönderiyor (`productId`, `productTitle`,
 * `productImage`) — ölçüldü. `ThreadRow` ise iç içe `thread.product` arıyor ve
 * bulamayınca "Genel mesaj" yazıyordu. Yani bir ürün üzerinden başlamış her
 * konuşma listede bağlamsız görünüyordu.
 *
 * `normalizeThread` iki şekli de kabul eder: sunucu iç içe göndermeye geçerse
 * o da çalışır.
 */
import { normalizeThread } from '../normalize';

describe('normalizeThread — ürün bağlamı', () => {
  it('düz alanları iç içe `product` şekline taşır', () => {
    const t = normalizeThread({
      id: 't1',
      productId: 'p1',
      productTitle: 'Maisto 1963 Corvette',
      productImage: 'https://x/y.webp',
    });
    expect(t.product).toEqual({
      id: 'p1',
      title: 'Maisto 1963 Corvette',
      imageUrl: 'https://x/y.webp',
    });
  });

  it('sunucu zaten iç içe gönderirse onu KORUR', () => {
    const nested = { id: 'p9', title: 'Hazır', imageUrl: 'u' };
    expect(normalizeThread({ id: 't', product: nested }).product).toEqual(nested);
  });

  it('ürün bağlamı olmayan konuşmada `product` üretmez', () => {
    // Genel mesajlar gerçekten var; boş bir `product` nesnesi üretmek
    // `ThreadRow`'un kapısını yanlış tarafa açardı.
    expect(normalizeThread({ id: 't' }).product).toBeUndefined();
  });

  it('yalnız başlık gelip görsel gelmediğinde de bağlamı kurar', () => {
    const t = normalizeThread({ id: 't', productId: 'p', productTitle: 'X' });
    expect(t.product?.title).toBe('X');
    expect(t.product?.imageUrl).toBeUndefined();
  });
});
