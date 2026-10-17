/**
 * Kategoriler ekranının grupları ve hedefleri (web `nav/config.ts` + `navHref` ile aynı kaynak):
 * Keşfet adresleri, kategori ağacı (boş alt ağaç gizli), üreticiler (ilan sayısına göre, limitli),
 * ölçekler; boş grup gizlenir.
 */
import i18n from '@/i18n/config';
import {
  CATEGORIES_MANUFACTURER_LIMIT,
  buildCategoryTiles,
  buildExploreTiles,
  buildGroups,
  buildManufacturerTiles,
  buildScaleTiles,
  catalogHref,
  type CategoryNode,
  type ManufacturerNode,
} from '../groups';

const t = i18n.t.bind(i18n);

describe('Keşfet grubu', () => {
  it('web kategori çubuğunun sabit öğeleri ve adresleri', () => {
    const tiles = buildExploreTiles(t);
    expect(tiles.map((x) => [x.label, x.href])).toEqual([
      ['Tüm İlanlar', '/search'],
      ['Yeni Gelenler', '/search?sortBy=created_desc'],
      ['Çok Satanlar', '/search?sortBy=view_count_desc'],
      ['İndirimler', '/search?discountOnly=true'],
      ['Koleksiyonlar', '/collections'],
    ]);
    expect(tiles.every((x) => x.visual === 'plain')).toBe(true);
  });
});

describe('Kategoriler grubu', () => {
  const tree: CategoryNode[] = [
    { id: 'c1', name: 'Otomobil', productCount: 3, children: [] },
    {
      id: 'c2',
      name: 'Ticari',
      productCount: 0,
      children: [
        { id: 'c2a', name: 'Kamyon', productCount: 2, children: [] },
        { id: 'c2b', name: 'Otobüs', productCount: 0, children: [] },
      ],
    },
    { id: 'c3', name: 'Boş & Kategori', productCount: 0, children: [] },
  ];

  it('yaprak kutu /search?categoryId=&category= açar (ad kodlanır)', () => {
    const tiles = buildCategoryTiles([{ id: 'x 1', name: 'Boş & Kategori', productCount: 1 }]);
    expect(tiles[0]!.href).toBe('/search?categoryId=x%201&category=Bo%C5%9F%20%26%20Kategori');
    expect(catalogHref.category({ id: 'c1', name: 'Otomobil' })).toBe('/search?categoryId=c1&category=Otomobil');
  });

  it('web gibi HEPSİ gösterilir (0 ilanlı kategori de); alt kategorili kutu alt düzeye iner (href yok, allHref üst kategorinin KENDİ categoryId listesi)', () => {
    const tiles = buildCategoryTiles(tree);
    expect(tiles.map((x) => x.label)).toEqual(['Otomobil', 'Ticari', 'Boş & Kategori']);
    const ticari = tiles[1]!;
    expect(ticari.href).toBeUndefined();
    expect(ticari.allHref).toBe('/search?categoryId=c2&category=Ticari');
    expect(ticari.children!.map((x) => [x.label, x.href])).toEqual([
      ['Kamyon', '/search?categoryId=c2a&category=Kamyon'],
      ['Otobüs', '/search?categoryId=c2b&category=Otob%C3%BCs'],
    ]);
  });
});

describe('Üreticiler grubu', () => {
  const m = (id: string, name: string, products: number | undefined, logo?: string): ManufacturerNode => ({
    id,
    name,
    logo,
    _count: products == null ? undefined : { products },
  });

  it('ilanı olmayan çıkar; ilan sayısına göre azalan, eşitlikte ada göre; id + ad ile adres', () => {
    const tiles = buildManufacturerTiles([
      m('1', 'Bburago', 5),
      m('2', 'Hot Wheels', 12, 'https://cdn/hw.png'),
      m('3', 'Maisto', 0),
      m('4', 'Autoart', 5),
    ]);
    expect(tiles.map((x) => [x.label, x.count])).toEqual([
      ['Hot Wheels', 12],
      ['Autoart', 5],
      ['Bburago', 5],
    ]);
    expect(tiles[0]!.href).toBe('/search?manufacturer=Hot%20Wheels&manufacturerId=2');
    expect(tiles[0]!.logo).toBe('https://cdn/hw.png');
    expect(tiles[1]!.logo).toBeNull();
  });

  it('en çok web limiti (40) kadar', () => {
    const many = Array.from({ length: 55 }, (_, i) => m(String(i), `M${String(i).padStart(2, '0')}`, 100 - i));
    expect(buildManufacturerTiles(many)).toHaveLength(CATEGORIES_MANUFACTURER_LIMIT);
  });
});

describe('Ölçek grubu', () => {
  it('her ölçek /search?scale= açar; boş değerler atılır', () => {
    const tiles = buildScaleTiles(['1:64', ' ', '1:18']);
    expect(tiles.map((x) => [x.label, x.href])).toEqual([
      ['1:64', '/search?scale=1%3A64'],
      ['1:18', '/search?scale=1%3A18'],
    ]);
  });
});

describe('buildGroups', () => {
  const empty = { categories: [], manufacturers: [], scales: [] };

  it('verisi olmayan HAZIR grup gizlenir; Keşfet (sabit) her zaman ilk', () => {
    const groups = buildGroups(t, empty);
    expect(groups.map((g) => g.key)).toEqual(['explore']);
  });

  it('yüklenen / hata veren grup veri yokken de rayda kalır (sessizce kaybolmaz); veri varsa durum hazır', () => {
    const groups = buildGroups(t, {
      categories: [{ id: 'c1', name: 'Otomobil' }],
      manufacturers: [],
      scales: [],
      status: { categories: 'error', manufacturers: 'error', scales: 'loading' },
    });
    expect(groups.map((g) => [g.key, g.status])).toEqual([
      ['explore', 'ready'],
      ['categories', 'ready'],
      ['manufacturers', 'error'],
      ['scales', 'loading'],
    ]);
  });

  it('tüm gruplar sırayla: Keşfet, Kategoriler, Üreticiler (altta "Tüm üreticiler" → /ureticiler), Ölçek', () => {
    const groups = buildGroups(t, {
      categories: [{ id: 'c1', name: 'Otomobil', productCount: 1 }],
      manufacturers: [{ id: 'm1', name: 'Hot Wheels', _count: { products: 3 } }],
      scales: ['1:64'],
    });
    expect(groups.map((g) => g.title)).toEqual(['Keşfet', 'Kategoriler', 'Üreticiler', 'Ölçek']);
    const mf = groups.find((g) => g.key === 'manufacturers')!;
    expect(mf.footer).toEqual({ label: 'Tüm Üreticiler', href: '/ureticiler' });
    expect(groups.find((g) => g.key === 'categories')!.footer).toBeUndefined();
  });
});
