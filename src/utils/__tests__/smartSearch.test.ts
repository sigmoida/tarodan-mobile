import { buildSmartSearchUrl, resolveSmartSearch } from '../smartSearch';

const LIST = [{ id: 'm-hw', name: 'Hot Wheels', slug: 'hot-wheels' }];

describe('smartSearch — üretici kimliği', () => {
  it('üretici listede varsa manufacturer + manufacturerId gönderir', () => {
    const r = resolveSmartSearch('hot wheels', LIST);
    expect(r).toMatchObject({
      category: 'manufacturer',
      value: 'Hot Wheels',
      manufacturerId: 'm-hw',
    });
    expect(r.query).toBe('manufacturer=Hot%20Wheels&manufacturerId=m-hw');
    expect(buildSmartSearchUrl('hot wheels', LIST)).toBe(
      '/listings?manufacturer=Hot%20Wheels&manufacturerId=m-hw',
    );
  });

  it('liste verilmediyse ya da ad bulunamazsa yalnız ad ile devam eder', () => {
    expect(resolveSmartSearch('Hot Wheels').query).toBe('manufacturer=Hot%20Wheels');
    expect(buildSmartSearchUrl('matchbox', LIST)).toBe('/listings?manufacturer=Matchbox');
  });

  it('marka / ölçek / genel arama değişmez', () => {
    expect(buildSmartSearchUrl('porsche', LIST)).toBe('/listings?brand=Porsche');
    expect(buildSmartSearchUrl('1:18', LIST)).toBe('/listings?scale=1%3A18');
    expect(buildSmartSearchUrl('kırmızı araba', LIST)).toBe(
      `/listings?search=${encodeURIComponent('kırmızı araba')}`,
    );
  });
});
