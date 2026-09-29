/**
 * İlan gönderim kapısı — kurallar ve SIRALARI.
 *
 * Kullanıcı tek bir hata mesajı görüyor, o yüzden sıra davranışın kendisi.
 * Kargo paket boyutu bu tura eklenen kural: boş geçilirse sunucu `small`
 * VARSAYIYOR ve büyük bir ürün küçük paket bedeliyle gidiyor (canlı tarife
 * small 100 / medium 130 / large 160 → paket başına 60 TL eksik tahsil).
 */
import i18n from '@/i18n/config';
import { firstListingValidationError } from '../_lib/validate';
import { emptyListingFormValues, type ListingFormValues } from '../_lib/schema';

// Testler Türkçe metin üzerinde iddia ediyor; cihaz/test ortamının diline
// bakılmaksızın sabit TR çözümü için `getFixedT` kullanılır.
const t = i18n.getFixedT('tr');

const complete: ListingFormValues = {
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
  isBoxed: 'boxed',
  shippingPackageTier: 'large',
};

const ok = () => ({
  values: { ...complete, colors: [...complete.colors] },
  categoryId: 'c1',
  imageCount: 3,
});

describe('firstListingValidationError', () => {
  it('passes a fully filled form', () => {
    expect(firstListingValidationError(t, ok())).toBeNull();
  });

  it('rejects a listing with no package tier', () => {
    const input = ok();
    input.values.shippingPackageTier = '';

    expect(firstListingValidationError(t, input)).toBe('Lütfen kargo paket boyutunu seçin.');
  });

  it('accepts every tier code the server tariff returns', () => {
    ['small', 'medium', 'large'].forEach((code) => {
      const input = ok();
      input.values.shippingPackageTier = code;
      expect(firstListingValidationError(t, input)).toBeNull();
    });
  });

  it('reports the title before anything else', () => {
    const input = ok();
    input.values.title = 'Abc';
    input.values.shippingPackageTier = '';
    input.categoryId = '';

    // `validation.minLength` reuse (rule #1): generic ICU template, katalogda
    // "Başlık" öneki ve sonda nokta taşımıyor.
    expect(firstListingValidationError(t, input)).toBe('En az 5 karakter olmalıdır');
  });

  it('reports the category before the package tier', () => {
    const input = ok();
    input.categoryId = '';
    input.values.shippingPackageTier = '';

    expect(firstListingValidationError(t, input)).toBe('Lütfen bir kategori seçin.');
  });

  it('reports the photo before the package tier', () => {
    const input = ok();
    input.imageCount = 0;
    input.values.shippingPackageTier = '';

    expect(firstListingValidationError(t, input)).toBe('En az 3 fotoğraf ekleyin.');
  });
});

/**
 * Sunucu 2026-07-29'dan beri (`0096579da`) bu alanları zorunlu tutuyor;
 * mobil kontrol etmediği için sunucu hata LİSTESİ döndürüyor ve kullanıcı
 * yalnız "İşlem başarısız" görüyordu. Kurallar `create-product.dto.ts` ile
 * birebir.
 */
describe('firstListingValidationError — sunucunun zorunlu alanları', () => {
  const expectError = (mutate: (i: ReturnType<typeof ok>) => void, msg: string) => {
    const input = ok();
    mutate(input);
    expect(firstListingValidationError(t, input)).toBe(msg);
  };

  it('başlık en fazla 200 karakter', () =>
    expectError((i) => (i.values.title = 'a'.repeat(201)), 'En fazla 200 karakter olabilir'));

  it('açıklama en az 30 karakter', () =>
    expectError((i) => (i.values.description = 'kısa açıklama'), 'Açıklama 30 ile 330 karakter arasında olmalıdır.'));

  it('açıklama en fazla 330 karakter', () =>
    expectError((i) => (i.values.description = 'a'.repeat(331)), 'Açıklama 30 ile 330 karakter arasında olmalıdır.'));

  it('açıklama fiyattan önce raporlanır (formdaki sıra)', () =>
    expectError((i) => {
      i.values.description = '';
      i.values.price = '0';
    }, 'Açıklama 30 ile 330 karakter arasında olmalıdır.'));

  it('1 ve 2 fotoğraf yetmez', () => {
    [1, 2].forEach((n) => expectError((i) => (i.imageCount = n), 'En az 3 fotoğraf ekleyin.'));
  });

  it('marka zorunlu', () => expectError((i) => (i.values.brandId = ''), 'Lütfen bir marka seçin.'));
  it('ölçek zorunlu', () => expectError((i) => (i.values.scale = ''), 'Lütfen bir ölçek seçin.'));
  it('malzeme zorunlu', () => expectError((i) => (i.values.material = ''), 'Lütfen malzemeyi seçin.'));
  it('üretici zorunlu', () => expectError((i) => (i.values.manufacturerId = ''), 'Lütfen üreticiyi seçin.'));
  it('en az bir renk zorunlu', () => expectError((i) => (i.values.colors = []), 'Lütfen en az bir renk seçin.'));
  it('en fazla 3 renk', () =>
    expectError((i) => (i.values.colors = ['a', 'b', 'c', 'd']), 'En fazla 3 renk seçebilirsiniz.'));
  it('kutu durumu zorunlu', () =>
    expectError((i) => (i.values.isBoxed = ''), 'Lütfen ürünün kutulu olup olmadığını seçin.'));

  it('kutusuz da geçerli bir seçim', () => {
    const input = ok();
    input.values.isBoxed = 'unboxed';
    expect(firstListingValidationError(t, input)).toBeNull();
  });
});

/**
 * Düzenleme akışı — sunucu kademeyi `edit.shippingPackageTier` ile geri
 * döndürüyor (2026-08-10 ölçümü), yani form onu HEP dolu açıyor. Eski
 * istisna (düzenlemede zorunlu değil) o ölçümden ÖNCEKİ duruma aitti;
 * `isEdit` artık `ListingValidationInput`'ta yok ve kural her iki modda da
 * aynı.
 */
describe('firstListingValidationError on edit', () => {
  const editable = () => ({
    values: { ...complete, colors: [...complete.colors], shippingPackageTier: '' },
    categoryId: 'c1',
    imageCount: 3,
  });

  it('still requires the tier on edit — the server always sends it back', () => {
    expect(firstListingValidationError(t, editable())).toBe(
      'Lütfen kargo paket boyutunu seçin.',
    );
  });

  it('still validates everything else on edit', () => {
    const input = editable();
    input.categoryId = '';
    expect(firstListingValidationError(t, input)).toBe('Lütfen bir kategori seçin.');
  });
});

/**
 * Güncelleme DTO'su `PartialType(CreateProductDto)`: alanlar opsiyonel ama
 * GÖNDERİLEN alan yine kurala tabi. 2026-07-29 öncesi ilanların rengi/kutu
 * bilgisi yok — düzenlemede zorunlu tutulursa satıcı fiyatı bile değiştiremez.
 * Fotoğraflar düzenlemede HEP gönderildiği için 3 fotoğraf kuralı geçerli.
 */
describe('firstListingValidationError on edit — eski ilanlar kilitlenmez', () => {
  const legacy = () => ({
    values: {
      ...complete,
      description: '',
      brandId: '',
      material: '',
      manufacturerId: '',
      colors: [] as string[],
      isBoxed: '' as ListingFormValues['isBoxed'],
    },
    categoryId: 'c1',
    imageCount: 3,
    isEdit: true,
  });

  it('renk/kutu/marka/malzeme/üretici ve açıklama boş eski ilan kaydedilebilir', () => {
    expect(firstListingValidationError(t, legacy())).toBeNull();
  });

  it('açıklama doluysa yine 30–330 karakter', () => {
    const input = legacy();
    input.values.description = 'kısa';
    expect(firstListingValidationError(t, input)).toBe('Açıklama 30 ile 330 karakter arasında olmalıdır.');
  });

  it('fotoğraf düzenlemede de en az 3', () => {
    const input = legacy();
    input.imageCount = 2;
    expect(firstListingValidationError(t, input)).toBe('En az 3 fotoğraf ekleyin.');
  });

  it('oluşturmada aynı boş alanlar reddedilir', () => {
    const input = { ...legacy(), isEdit: false };
    expect(firstListingValidationError(t, input)).toBe('Açıklama 30 ile 330 karakter arasında olmalıdır.');
  });
});
