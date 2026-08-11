/**
 * J33 · sepet stok/adet kuralları, J1 · sepet özeti (ara toplam/adet),
 * J58/J59 · sepete ekle/çıkar, J60/J61 · sepet temizleme/güncelleme.
 * cartStore SAF zustand birim testi (getState).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useCartStore } from '../cartStore';

const baseItem = {
  productId: 'p1',
  title: 'Hot Wheels Mustang',
  price: 100,
  imageUrl: 'http://x/img.png',
  seller: { id: 's1', displayName: 'Satıcı' },
};

const reset = () => useCartStore.setState({ items: [], lastUpdated: Date.now(), isLoading: false });

describe('J58 · sepete ekle (addItem)', () => {
  beforeEach(reset);

  it('yeni ürün quantity=1 ile eklenir ve isInCart true döner', () => {
    useCartStore.getState().addItem(baseItem);
    const s = useCartStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.items[0]!.quantity).toBe(1);
    expect(s.isInCart('p1')).toBe(true);
    expect(s.isInCart('yok')).toBe(false);
  });

  it('aynı ürün tekrar eklenince yeni satır değil quantity artar', () => {
    const add = useCartStore.getState().addItem;
    add(baseItem);
    add(baseItem);
    const s = useCartStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.items[0]!.quantity).toBe(2);
  });
});

describe('J1 · sepet adedi (getItemCount)', () => {
  beforeEach(reset);

  it('adet = quantity toplamı', () => {
    const st = useCartStore.getState();
    st.addItem(baseItem); // p1 x1 @100
    st.addItem({ ...baseItem, productId: 'p2', price: 50 }); // p2 x1 @50
    st.addItem(baseItem); // p1 -> x2
    expect(useCartStore.getState().getItemCount()).toBe(3);
  });

  it('boş sepette adet 0', () => {
    expect(useCartStore.getState().getItemCount()).toBe(0);
  });

  /**
   * Store para HESAPLAMAZ. `getSubtotal()` yerel `price × quantity` toplamı
   * döndürüyordu; sepetteki fiyat ekleme anında donduğu (24 saat) ve kampanya
   * penceresi kapanabildiği için bu tutar hiçbir sunucu alanına karşılık
   * gelmiyor, bir zamanlar da "Toplam" diye basılıyordu. Yüzeyden kaldırıldı —
   * geri gelirse bu test kırılır.
   */
  it('para hesaplayan bir yüzey (getSubtotal) YOK', () => {
    useCartStore.getState().addItem(baseItem);
    expect((useCartStore.getState() as unknown as Record<string, unknown>).getSubtotal).toBeUndefined();
  });
});

describe('J33 · adet güncelleme (updateQuantity)', () => {
  beforeEach(reset);

  it('quantity geçerli değere set edilir', () => {
    useCartStore.getState().addItem(baseItem);
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().updateQuantity(id, 5);
    expect(useCartStore.getState().items[0]!.quantity).toBe(5);
  });

  it('quantity<1 olunca ürün sepetten çıkarılır', () => {
    useCartStore.getState().addItem(baseItem);
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().updateQuantity(id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('J33b · stok / sipariş-limiti tavanı', () => {
  beforeEach(reset);

  it('updateQuantity stok adedini aşamaz (stok=3 → 5 istenirse 3)', () => {
    useCartStore.getState().addItem({ ...baseItem, stock: 3 });
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().updateQuantity(id, 5);
    expect(useCartStore.getState().items[0]!.quantity).toBe(3);
  });

  it('updateQuantity maxQuantityPerOrder sınırını aşamaz', () => {
    useCartStore.getState().addItem({ ...baseItem, stock: 50, maxQuantityPerOrder: 2 });
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().updateQuantity(id, 9);
    expect(useCartStore.getState().items[0]!.quantity).toBe(2);
  });

  it('stok bilgisi yoksa API tavanı 99 uygulanır', () => {
    useCartStore.getState().addItem(baseItem); // stok yok
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().updateQuantity(id, 250);
    expect(useCartStore.getState().items[0]!.quantity).toBe(99);
  });

  it('addItem tekrar ekleme stok tavanında durur (stok=2)', () => {
    const add = useCartStore.getState().addItem;
    add({ ...baseItem, stock: 2 });
    add({ ...baseItem, stock: 2 });
    add({ ...baseItem, stock: 2 }); // 3. kez — 2 de kalmalı
    expect(useCartStore.getState().items[0]!.quantity).toBe(2);
  });
});

describe('J59 · sepetten çıkar (removeItem / removeByProductId)', () => {
  beforeEach(reset);

  it('removeItem id ile siler', () => {
    useCartStore.getState().addItem(baseItem);
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().removeItem(id);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removeByProductId productId ile siler', () => {
    useCartStore.getState().addItem(baseItem);
    useCartStore.getState().addItem({ ...baseItem, productId: 'p2' });
    useCartStore.getState().removeByProductId('p1');
    const s = useCartStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.items[0]!.productId).toBe('p2');
  });
});

describe('J60 · sepet temizleme (clearCart / onPurchaseComplete)', () => {
  beforeEach(reset);

  it('clearCart tüm ürünleri siler', () => {
    useCartStore.getState().addItem(baseItem);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('onPurchaseComplete satın alınan productId leri çıkarır', () => {
    useCartStore.getState().addItem(baseItem);
    useCartStore.getState().addItem({ ...baseItem, productId: 'p2' });
    useCartStore.getState().onPurchaseComplete(['p1']);
    const s = useCartStore.getState();
    expect(s.items.map(i => i.productId)).toEqual(['p2']);
  });
});

describe('J61 · süresi dolan ürünler (cleanExpiredItems)', () => {
  beforeEach(reset);

  it('24 saatten eski ürün temizlenir, yeni ürün kalır', () => {
    const old = 25 * 60 * 60 * 1000;
    useCartStore.setState({
      items: [
        { ...baseItem, id: 'a', quantity: 1, addedAt: Date.now() - old },
        { ...baseItem, productId: 'p2', id: 'b', quantity: 1, addedAt: Date.now() },
      ],
    });
    useCartStore.getState().cleanExpiredItems();
    const s = useCartStore.getState();
    expect(s.items.map(i => i.id)).toEqual(['b']);
  });
});

/**
 * P2 #10 — sepette satır seçerek ödeme. API işi yok: `POST /orders/quote` ve
 * `/orders/checkout` zaten yalnız gönderilen `items`'ı fiyatlıyor ve yalnız
 * onları sepetten düşüyor.
 *
 * Seçim OPT-OUT tutulur (`deselectedIds`): varsayılan "hepsi seçili" ve sonradan
 * eklenen satır kendiliğinden seçili gelir. Opt-in bir liste olsaydı her ekleme
 * yolunun (addItem/addToCart/sunucudan senkron) listeyi güncellemesi gerekirdi.
 */
describe('P2 #10 · sepette satır seçimi', () => {
  const seed = () => {
    useCartStore.setState({ items: [], deselectedIds: [] });
    useCartStore.getState().addItem({ productId: 'p1', title: 'A', price: 10 } as any);
    useCartStore.getState().addItem({ productId: 'p2', title: 'B', price: 20 } as any);
  };

  it('varsayılan olarak tüm satırlar seçilidir', () => {
    seed();
    const s = useCartStore.getState();
    expect(s.selectedItems().map((i) => i.productId)).toEqual(['p1', 'p2']);
    expect(s.isSelected(s.items[0]!.id)).toBe(true);
  });

  it('satır seçimi kaldırılınca seçili listeden çıkar, tekrar seçilince döner', () => {
    seed();
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().toggleSelected(id);
    expect(useCartStore.getState().selectedItems().map((i) => i.productId)).toEqual(['p2']);
    expect(useCartStore.getState().isSelected(id)).toBe(false);

    useCartStore.getState().toggleSelected(id);
    expect(useCartStore.getState().selectedItems().map((i) => i.productId)).toEqual(['p1', 'p2']);
  });

  it('seçim kaldırıldıktan SONRA eklenen satır seçili gelir', () => {
    seed();
    useCartStore.getState().toggleSelected(useCartStore.getState().items[0]!.id);
    useCartStore.getState().addItem({ productId: 'p3', title: 'C', price: 30 } as any);
    expect(useCartStore.getState().selectedItems().map((i) => i.productId)).toEqual(['p2', 'p3']);
  });

  it('tümünü seç / tümünü bırak', () => {
    seed();
    useCartStore.getState().setAllSelected(false);
    expect(useCartStore.getState().selectedItems()).toHaveLength(0);
    useCartStore.getState().setAllSelected(true);
    expect(useCartStore.getState().selectedItems()).toHaveLength(2);
  });

  it('satın alınan satırlar düşerken seçim kaydı da temizlenir', () => {
    seed();
    const p2Id = useCartStore.getState().items[1]!.id;
    useCartStore.getState().toggleSelected(p2Id);
    useCartStore.getState().onPurchaseComplete(['p1']);

    const s = useCartStore.getState();
    expect(s.items.map((i) => i.productId)).toEqual(['p2']);
    // p2 hâlâ seçili DEĞİL — kullanıcının kararı korunur.
    expect(s.isSelected(p2Id)).toBe(false);
  });

  it('sepetten silinen satırın seçim kaydı artık taşınmaz', () => {
    seed();
    const id = useCartStore.getState().items[0]!.id;
    useCartStore.getState().toggleSelected(id);
    useCartStore.getState().removeItem(id);
    expect(useCartStore.getState().deselectedIds).not.toContain(id);
  });
});
