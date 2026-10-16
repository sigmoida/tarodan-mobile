/**
 * Liste önbelleği yardımcıları: detay yer tutucusu (yalnız kart alanları) ve kartı yerinde yamalama
 * (invalidate yerine; değişmeyen dallar aynı referans).
 */
import { QueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { findCachedListProduct, patchCachedListProduct } from '../listCache';

const card = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  title: 'Kart',
  price: 100,
  images: [{ url: 'https://x/a.jpg' }],
  seller: { id: 's1', displayName: 'Ali' },
  likeCount: 3,
  description: 'liste açıklaması',
  internalField: 'x',
  ...over,
});

const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

describe('findCachedListProduct', () => {
  it('anasayfa rayında bulur; yalnız kart alanlarını kopyalar', () => {
    const qc = client();
    qc.setQueryData(qk.products.homeFeatured, [card({ id: 'baska' }), card()]);
    const seed = findCachedListProduct(qc, 'p1');
    expect(seed).toMatchObject({ id: 'p1', title: 'Kart', price: 100, likeCount: 3, seller: { id: 's1' } });
    expect(seed).not.toHaveProperty('description');
    expect(seed).not.toHaveProperty('internalField');
  });

  it('sonsuz arama sayfalarında ve favorilerin iç içe `product` alanında bulur', () => {
    const qc = client();
    qc.setQueryData(qk.products.search('a', {}), { pages: [{ data: [card({ id: 'p2', title: 'Arama' })] }], pageParams: [1] });
    qc.setQueryData(qk.favorites.all, [{ id: 'fav1', productId: 'p3', product: card({ id: 'p3', title: 'Favori' }) }]);
    expect(findCachedListProduct(qc, 'p2')?.title).toBe('Arama');
    expect(findCachedListProduct(qc, 'p3')?.title).toBe('Favori');
  });

  it('görsel dizisi yoksa `imageUrl` galeriye taşınır', () => {
    const qc = client();
    qc.setQueryData(qk.products.listings({}), { data: [card({ images: [], imageUrl: 'https://x/b.jpg' })] });
    expect(findCachedListProduct(qc, 'p1')?.images).toEqual(['https://x/b.jpg']);
  });

  it('başlık/fiyatsız aynı id\'li nesneyi ve ürünün kendi detay önbelleğini saymaz; yoksa undefined', () => {
    const qc = client();
    qc.setQueryData(qk.products.popular, [{ id: 'p1', name: 'koleksiyon' }]);
    qc.setQueryData(qk.products.detail('p1'), null);
    expect(findCachedListProduct(qc, 'p1')).toBeUndefined();
    expect(findCachedListProduct(qc, '')).toBeUndefined();
  });

  it('benzer ürünler listesinde (`product` kökü) bulur', () => {
    const qc = client();
    qc.setQueryData(qk.products.similar('p9', 8), [card()]);
    expect(findCachedListProduct(qc, 'p1')?.title).toBe('Kart');
  });
});

describe('patchCachedListProduct', () => {
  it('listelerdeki kartı yamar; değişmeyen liste ve detay önbelleği dokunulmaz', () => {
    const qc = client();
    const untouched = [card({ id: 'p2' })];
    qc.setQueryData(qk.products.homeTrade, untouched);
    qc.setQueryData(qk.products.popular, [card({ id: 'p2' }), card()]);
    qc.setQueryData(qk.products.search('a', {}), { pages: [{ data: [card()] }], pageParams: [1] });
    qc.setQueryData(qk.products.detail('p1'), card({ likeCount: 10 }));
    const invalidate = jest.spyOn(qc, 'invalidateQueries');

    patchCachedListProduct(qc, 'p1', (p) => ({ ...p, likeCount: (p.likeCount as number) + 1 }));

    type Card = { likeCount: number };
    expect(qc.getQueryData<Card[]>(qk.products.popular)?.[1]?.likeCount).toBe(4);
    expect(qc.getQueryData<{ pages: Array<{ data: Card[] }> }>(qk.products.search('a', {}))?.pages[0]?.data[0]?.likeCount).toBe(4);
    expect(qc.getQueryData(qk.products.homeTrade)).toBe(untouched);
    expect(qc.getQueryData<Card>(qk.products.detail('p1'))?.likeCount).toBe(10);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
