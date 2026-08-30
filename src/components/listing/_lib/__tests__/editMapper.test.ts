/**
 * `toFormValues` — `GET /products/my/:id` → form değerleri, TEK eşleyici.
 *
 * Bugüne kadar prefill 868 satırlık hook'un içinde bir useEffect bloğuydu ve
 * ürünün GÖSTERİM projeksiyonundan okuyordu; sunucu ise kayda geri yazılabilir
 * ham değerleri ayrı bir `edit` bloğunda veriyor (delta 18 §2c). Fark, satıcının
 * dokunmadığı alanların sessizce değişmesine yol açıyordu.
 *
 * Fixture'lar 2026-08-10 staging ölçümünden alınmıştır.
 */
import { toFormValues } from '../editMapper';
import type { MyProductResponse } from '../types';

const EDIT = {
  title: 'Mini GT Volkswagen',
  description: 'Açıklama',
  price: 551.07,
  oldPrice: null,
  salePrice: null,
  saleStartDate: null,
  saleEndDate: null,
  categoryId: 'cat-1',
  brandId: 'brand-1',
  carModelId: 'model-1',
  manufacturerId: 'man-1',
  condition: 'very_good',
  status: 'active',
  modelCode: 'SEED-0057',
  color: null,
  isBoxed: null,
  quantity: 3,
  maxQuantityPerOrder: null,
  shippingPackageTier: 'small',
  isTradeEnabled: false,
  isSet: false,
  bundleSize: null,
  isLimited: false,
  editionNumber: null,
  editionTotal: null,
  releaseDate: null,
  year: 2024,
  images: [
    { cardKey: 'k/a-card.webp', detailKey: 'k/a-detail.webp',
      cardUrl: 'https://s3/a-card.webp', detailUrl: 'https://s3/a-detail.webp', sortOrder: 0 },
    { cardKey: 'k/b-card.webp', detailKey: 'k/b-detail.webp',
      cardUrl: 'https://s3/b-card.webp', detailUrl: 'https://s3/b-detail.webp', sortOrder: 1 },
  ],
  // 2026-08-10 staging ölçümünden AYNEN: `scale`'in slug'ı ile value'su
  // FARKLI ('1-64' vs '1:64'), `material`'ın displayValue'su slug'ından farklı.
  attributes: [
    { groupSlug: 'scale', groupName: 'Ölçek', slug: '1-64',
      value: '1:64', displayValue: '1:64', manufacturerSlug: null },
    { groupSlug: 'material', groupName: 'Malzeme', slug: 'diecast',
      value: 'diecast', displayValue: 'Diecast Metal', manufacturerSlug: null },
    { groupSlug: 'series', groupName: 'Seri', slug: 'premium',
      value: 'Premium', displayValue: 'Premium', manufacturerSlug: 'hot-wheels' },
  ],
  categoryName: 'Araba',
  brandName: 'Mini GT',
  carModelName: 'ID. Buzz',
  manufacturerName: 'TSM',
} as const;

const RESPONSE = {
  isPreorder: false,
  quantity: 3,
  availableQuantity: 1,
  // Üst seviye fiyat bilerek FARKLI: eşleyici buradan okumamalı.
  price: 999,
  oldPrice: 1234,
  isOnSale: true,
  edit: EDIT,
} as unknown as MyProductResponse;

describe('toFormValues — form değerlerinin TAMAMI', () => {
  /**
   * TAM-NESNE assertion'ı: alan alan kontrol, eşleyicinin YANLIŞ doldurduğu
   * (ör. `scale`'e slug yazan) alanları görmeden geçiyordu. Şemadaki 19 alanın
   * hepsi burada kilitli — yeni alan eklendiğinde bu test kırılır ve
   * kaynağının bilinçli seçilmesini zorlar.
   */
  it('19 şema alanının tamamını ölçülmüş gövdeden türetir', () => {
    expect(toFormValues(RESPONSE)!.values).toEqual({
      title: 'Mini GT Volkswagen',
      description: 'Açıklama',
      price: '551.07',
      quantity: '3',
      bundleSize: '',
      categoryId: 'cat-1',
      condition: 'very_good',
      brandId: 'brand-1',
      carModelId: 'model-1',
      scale: '1:64',
      material: 'diecast',
      manufacturerId: 'man-1',
      year: '2024',
      isTradeEnabled: false,
      isSet: false,
      status: 'active',
      isPreorder: false,
      modelCode: 'SEED-0057',
      shippingPackageTier: 'small',
    });
  });
});

describe('toFormValues — kaynak seçimi', () => {
  it('`edit` yoksa null döner', () => {
    expect(toFormValues({} as MyProductResponse)).toBeNull();
  });

  it('fiyatı ÜST SEVİYEDEN değil `edit`ten okur', () => {
    // Üst seviyede 999 var; doğru cevap 551.07.
    expect(toFormValues(RESPONSE)!.values.price).toBe('551.07');
  });

  it('kargo paket kademesini prefill eder', () => {
    // 2026-08-03 varsayımı ("sunucu döndürmüyor") ARTIK YANLIŞ.
    expect(toFormValues(RESPONSE)!.values.shippingPackageTier).toBe('small');
  });

  it('modelCode taşınır', () => {
    expect(toFormValues(RESPONSE)!.values.modelCode).toBe('SEED-0057');
  });

  it('`edit`te olmayan iki alan üst seviyeden gelir', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.isPreorder).toBe(false);
    // quantity 3, availableQuantity 1 → rezerve 2
    expect(m.reservedQty).toBe(2);
  });
});

describe('toFormValues — indirim çifti', () => {
  it('oldPrice > price ise normal fiyat oldPrice, indirimli price olur', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: { ...EDIT, price: 400, oldPrice: 500 },
    } as unknown as MyProductResponse)!;
    expect(m.values.price).toBe('500');
    expect(m.sale.salePrice).toBe('400');
  });

  it('indirimsizken sale alanları boş kalır', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.sale.salePrice).toBe('');
    expect(m.sale.saleStartDate).toBe('');
  });

  it('salePrice dolu ama oldPrice boşsa indirim SAYILMAZ', () => {
    // `edit.salePrice` geriye uyum alanıdır; tek başına otorite DEĞİLDİR.
    const m = toFormValues({
      ...RESPONSE,
      edit: { ...EDIT, price: 400, oldPrice: null, salePrice: 400 },
    } as unknown as MyProductResponse)!;
    expect(m.values.price).toBe('400');
    expect(m.sale.salePrice).toBe('');
  });

  it('sale tarihleri YYYY-MM-DD olarak kırpılır', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT, price: 400, oldPrice: 500,
        saleStartDate: '2026-08-01T00:00:00.000Z',
        saleEndDate: '2026-08-31T23:59:59.000Z',
      },
    } as unknown as MyProductResponse)!;
    expect(m.sale.saleStartDate).toBe('2026-08-01');
    expect(m.sale.saleEndDate).toBe('2026-08-31');
  });
});

describe('toFormValues — ölçek ve malzeme AYRI alanlardan gelir', () => {
  /**
   * Form sözlükleri farklı: ölçek çipleri GÖRÜNEN formatta ('1:64'),
   * malzeme listesi SLUG tabanlı ('diecast'). Tek bir `slug` listesi ikisine
   * birden hizmet edemez.
   */
  it('scale niteliğin `value`sundan gelir — slug DEĞİL', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.values.scale).toBe('1:64');
    expect(m.values.scale).not.toBe('1-64');
  });

  it('material niteliğin `slug`ından gelir — displayValue DEĞİL', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.values.material).toBe('diecast');
    expect(m.values.material).not.toBe('Diecast Metal');
  });

  it('ölçek niteliği yoksa alan BOŞ kalır — payload onu hiç göndermez', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: { ...EDIT, attributes: [] },
    } as unknown as MyProductResponse)!;
    expect(m.values.scale).toBe('');
    expect(m.values.material).toBe('');
  });

  it('`value` boşsa slug`a DÜŞMEZ — tanınmayan değer geri yazılmaz', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT,
        attributes: [
          { groupSlug: 'scale', groupName: 'Ölçek', slug: '1-64',
            value: null, displayValue: '1:64', manufacturerSlug: null },
        ],
      },
    } as unknown as MyProductResponse)!;
    expect(m.values.scale).toBe('');
  });
});

describe('toFormValues — nitelikler', () => {
  it('üretici-BAĞIMSIZ nitelikleri de alır', () => {
    // Eski kod `manufacturerSlug` dolu olanları filtreliyordu; `scale` düşüyordu.
    expect(toFormValues(RESPONSE)!.attrs).toEqual({
      scale: ['1-64'],
      material: ['diecast'],
      series: ['premium'],
    });
  });

  it('`manufacturerAttrs` YALNIZ üretici-kapsamlı grupları içerir', () => {
    // `attributes[]` payload'ını besleyen kaynak budur; `scale`/`material`
    // buraya girerse satıcının çiple yaptığı değişikliği geri yazarlar.
    expect(toFormValues(RESPONSE)!.manufacturerAttrs).toEqual({ series: ['premium'] });
  });

  it('bir grupta hem kapsamlı hem bağımsız nitelik varsa yalnız kapsamlı geçer', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT,
        attributes: [
          { groupSlug: 'series', groupName: 'Seri', slug: 'global', value: 'G', displayValue: 'G', manufacturerSlug: null },
          { groupSlug: 'series', groupName: 'Seri', slug: 'premium', value: 'P', displayValue: 'P', manufacturerSlug: 'hot-wheels' },
        ],
      },
    } as unknown as MyProductResponse)!;
    expect(m.attrs).toEqual({ series: ['global', 'premium'] });
    expect(m.manufacturerAttrs).toEqual({ series: ['premium'] });
  });

  it('aynı gruptaki birden çok niteliği toplar', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT,
        attributes: [
          { groupSlug: 'color', groupName: 'Renk', slug: 'red', value: 'Kırmızı', displayValue: 'Kırmızı', manufacturerSlug: null },
          { groupSlug: 'color', groupName: 'Renk', slug: 'blue', value: 'Mavi', displayValue: 'Mavi', manufacturerSlug: null },
        ],
      },
    } as unknown as MyProductResponse)!;
    expect(m.attrs).toEqual({ color: ['red', 'blue'] });
  });
});

describe('toFormValues — görseller', () => {
  it('key ve URL çiftlerini sunucudan aynen alır', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.images.keys).toEqual([
      { cardKey: 'k/a-card.webp', detailKey: 'k/a-detail.webp' },
      { cardKey: 'k/b-card.webp', detailKey: 'k/b-detail.webp' },
    ]);
    expect(m.images.uris).toEqual(['https://s3/a-card.webp', 'https://s3/b-card.webp']);
  });

  it('key eksik bir görseli ATLAR — URL`den key UYDURMAZ', () => {
    // Eski kod `cardKey ?? i.url` yapıyordu; delta 18 §2d bunu yasaklıyor.
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT,
        images: [
          { cardUrl: 'https://s3/x.webp', detailUrl: 'https://s3/x.webp', sortOrder: 0 },
          EDIT.images[0],
        ],
      },
    } as unknown as MyProductResponse)!;
    expect(m.images.keys).toHaveLength(1);
    expect(m.images.keys[0].cardKey).toBe('k/a-card.webp');
  });

  it('sortOrder`a göre sıralar — dizi sırası kanoniktir', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: { ...EDIT, images: [EDIT.images[1], EDIT.images[0]] },
    } as unknown as MyProductResponse)!;
    expect(m.images.keys[0].cardKey).toBe('k/a-card.webp');
  });
});

describe('toFormValues — etiketler', () => {
  it('marka/model/kategori/üretici adlarını taşır', () => {
    expect(toFormValues(RESPONSE)!.labels).toEqual({
      brandName: 'Mini GT',
      carModelName: 'ID. Buzz',
      categoryName: 'Araba',
      manufacturerName: 'TSM',
    });
  });
});
