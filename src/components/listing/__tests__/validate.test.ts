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
import { emptyListingFormValues } from '../_lib/schema';

// Testler Türkçe metin üzerinde iddia ediyor; cihaz/test ortamının diline
// bakılmaksızın sabit TR çözümü için `getFixedT` kullanılır.
const t = i18n.getFixedT('tr');

const complete = {
  ...emptyListingFormValues,
  title: 'Geçerli bir başlık',
  price: '500',
  categoryId: 'c1',
  shippingPackageTier: 'large',
};

const ok = () => ({ values: { ...complete }, categoryId: 'c1', imageCount: 1 });

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

    expect(firstListingValidationError(t, input)).toBe('Başlık en az 5 karakter olmalıdır.');
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

    // `product.addPhoto` reuse (rule #1): katalogdaki metin sonda nokta taşımıyor.
    expect(firstListingValidationError(t, input)).toBe('En az bir fotoğraf ekleyin');
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
    values: { ...complete, shippingPackageTier: '' },
    categoryId: 'c1',
    imageCount: 1,
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
