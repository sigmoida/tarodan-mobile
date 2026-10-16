/**
 * İlan fiyat sınırı kuralları: fiyat >= min (<= max), indirimli fiyat >= min,
 * eski kayıt muafiyeti (düzenlemede değiştirilmedikçe hata yok), şema + gönderim kapısı.
 */
import i18n from '@/i18n/config';
import { priceFieldError, priceLimitHint, salePriceFieldError } from '../priceRules';
import { buildListingFormSchema, emptyListingFormValues } from '../schema';
import { firstListingValidationError } from '../validate';

const t = i18n.getFixedT('tr');
const MIN = { minPrice: 250, maxPrice: null };
const BOTH = { minPrice: 250, maxPrice: 5000 };
const NONE = { minPrice: null, maxPrice: null };
const sale = (price: string, salePrice: string) => ({
  price,
  salePrice,
  saleStartDate: '2026-10-14',
  saleEndDate: '2026-10-21',
});

describe('priceFieldError', () => {
  it('min altı → sunucu metniyle aynı hata; min ve üstü geçer', () => {
    expect(priceFieldError(t, '249', MIN)).toBe('Ürün fiyatı minimum 250,00 TL olmalıdır.');
    expect(priceFieldError(t, '250', MIN)).toBeNull();
    expect(priceFieldError(t, '900', MIN)).toBeNull();
  });

  it('max üstü hata', () => {
    expect(priceFieldError(t, '5001', BOTH)).toBe('Ürün fiyatı maksimum 5.000,00 TL olabilir.');
    expect(priceFieldError(t, '5000', BOTH)).toBeNull();
  });

  it('sınır yok → hiç hata yok', () => {
    expect(priceFieldError(t, '1', NONE)).toBeNull();
  });

  it('boş / sayı olmayan değer biçim kuralına bırakılır', () => {
    expect(priceFieldError(t, '', MIN)).toBeNull();
    expect(priceFieldError(t, 'abc', MIN)).toBeNull();
  });

  it('eski kayıt: saklı değerlerden birine eşitse hata yok, değilse var', () => {
    expect(priceFieldError(t, '100', MIN, ['100'])).toBeNull();
    expect(priceFieldError(t, '100.00', MIN, ['100'])).toBeNull();
    expect(priceFieldError(t, '120', MIN, ['100'])).toContain('minimum');
  });

  it('eski kayıt (sunucu ile aynı): fiyat / eski fiyat / indirimli fiyat kümesinin HERHANGİ biri muaf', () => {
    // İndirimli ilan: fiyat 180 (indirimli), eski fiyat 300; taban 250.
    const stored = ['180', '300'];
    // Satıcı indirimi kaldırıp fiyatı 180'e çeker → saklı değere eşit, hata yok.
    expect(priceFieldError(t, '180', MIN, stored)).toBeNull();
    expect(salePriceFieldError(t, sale('300', ''), MIN, stored)).toBeNull();
    expect(priceFieldError(t, '190', MIN, stored)).toContain('minimum');
  });

  it('max: saklı değer muaf, yenisi değil', () => {
    expect(priceFieldError(t, '9000', BOTH, ['9000'])).toBeNull();
    expect(priceFieldError(t, '9001', BOTH, ['9000'])).toContain('maksimum');
  });
});

describe('salePriceFieldError', () => {
  it('uygulanacak indirimli fiyat min altındaysa hata', () => {
    expect(salePriceFieldError(t, sale('500', '200'), MIN)).toBe('İndirimli fiyat en az 250,00 TL olmalıdır.');
    expect(salePriceFieldError(t, sale('500', '250'), MIN)).toBeNull();
  });

  it('indirim uygulanmayacaksa (boş / fiyata eşit ya da üstü) denetlenmez', () => {
    expect(salePriceFieldError(t, sale('500', ''), MIN)).toBeNull();
    expect(salePriceFieldError(t, sale('200', '200'), MIN)).toBeNull();
  });

  it('sınır yok → hata yok', () => {
    expect(salePriceFieldError(t, sale('500', '10'), NONE)).toBeNull();
  });

  it('eski kayıt: saklı indirimli fiyat muaf, değiştirilince hata', () => {
    expect(salePriceFieldError(t, sale('500', '200'), MIN, ['500', '200'])).toBeNull();
    expect(salePriceFieldError(t, sale('500', '220'), MIN, ['500', '200'])).not.toBeNull();
  });

  it('max de denetlenir (sunucu min ve max kontrol eder)', () => {
    // Fiyat saklı (muaf) ama yeni indirimli fiyat tavanı aşıyor.
    expect(salePriceFieldError(t, sale('9000', '8000'), BOTH, ['9000'])).toBe(
      'Ürün fiyatı maksimum 5.000,00 TL olabilir.',
    );
    expect(salePriceFieldError(t, sale('9000', '4000'), BOTH, ['9000'])).toBeNull();
  });
});

describe('priceLimitHint', () => {
  it('yalnız min / yalnız max / ikisi / hiçbiri', () => {
    expect(priceLimitHint(t, MIN)).toBe('En az 250,00 TL');
    expect(priceLimitHint(t, { minPrice: null, maxPrice: 5000 })).toBe('En fazla 5.000,00 TL');
    expect(priceLimitHint(t, BOTH)).toBe('250,00 TL ile 5.000,00 TL arasında');
    expect(priceLimitHint(t, NONE)).toBeUndefined();
  });
});

describe('şema + gönderim kapısı', () => {
  const values = {
    ...emptyListingFormValues,
    title: 'Geçerli bir başlık',
    description: 'Kutusunda, hiç oynanmamış, boyası kusursuz bir model.',
    price: '500',
    categoryId: 'c1',
    brandId: 'b1',
    scale: '1:64',
    material: 'diecast',
    manufacturerId: 'm1',
    colors: ['blue'],
    isBoxed: 'boxed' as const,
    shippingPackageTier: 'small',
  };
  const input = (over: Record<string, unknown> = {}) => ({
    values: { ...values },
    categoryId: 'c1',
    imageCount: 3,
    priceLimits: MIN,
    sale: { salePrice: '', saleStartDate: '2026-10-14', saleEndDate: '2026-10-21' },
    ...over,
  });

  it('şema: min altı fiyatı reddeder, sınırsız şema kabul eder', () => {
    const low = { ...values, price: '100' };
    const limited = buildListingFormSchema(t, { priceLimits: MIN }).safeParse(low);
    expect(limited.success).toBe(false);
    expect(buildListingFormSchema(t).safeParse(low).success).toBe(true);
  });

  it('şema: düzenlemede değişmemiş taban altı fiyat geçer', () => {
    const low = { ...values, price: '100' };
    expect(buildListingFormSchema(t, { isEdit: true, priceLimits: MIN, storedPrices: ['100'] }).safeParse(low).success).toBe(true);
    expect(buildListingFormSchema(t, { isEdit: true, priceLimits: MIN, storedPrices: ['300'] }).safeParse(low).success).toBe(false);
  });

  it('kapı: geçerli form geçer', () => {
    expect(firstListingValidationError(t, input())).toBeNull();
  });

  it('kapı: min altı fiyat', () => {
    expect(firstListingValidationError(t, input({ values: { ...values, price: '100' } }))).toBe(
      'Ürün fiyatı minimum 250,00 TL olmalıdır.',
    );
  });

  it('kapı: min altı indirimli fiyat', () => {
    expect(
      firstListingValidationError(
        t,
        input({ sale: { salePrice: '200', saleStartDate: '2026-10-14', saleEndDate: '2026-10-21' } }),
      ),
    ).toBe('İndirimli fiyat en az 250,00 TL olmalıdır.');
  });

  it('kapı: eski kayıt (fiyat ve indirim değişmedi) kaydedilebilir; indirim değişince engellenir', () => {
    const grand = {
      isEdit: true,
      values: { ...values, price: '240' },
      priceBaseline: ['240', '200'],
      sale: { salePrice: '200', saleStartDate: '2026-10-14', saleEndDate: '2026-10-21' },
    };
    expect(firstListingValidationError(t, input(grand))).toBeNull();
    expect(
      firstListingValidationError(
        t,
        input({ ...grand, sale: { ...grand.sale, salePrice: '210' } }),
      ),
    ).toBe('İndirimli fiyat en az 250,00 TL olmalıdır.');
  });

  it('kapı: sınırlar yüklenemediyse (yok) kural uygulanmaz', () => {
    expect(
      firstListingValidationError(t, input({ priceLimits: NONE, values: { ...values, price: '5' } })),
    ).toBeNull();
  });
});
